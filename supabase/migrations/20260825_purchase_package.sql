-- Pembelian paket via saldo (F4/M2 tahap 2).
--
-- Catatan desain:
-- - Tabel dasar dibuat manual di luar repo (tidak ada migrasi baseline),
--   jadi kolom baru ditambahkan dengan ADD COLUMN IF NOT EXISTS.
-- - Status langganan tetap pada package_orders (PRD §8); kolom tambahan
--   menyimpan metadata pembayaran + antrean aktivasi MikroTik.
-- - Semua mutasi uang atomic dalam satu fungsi: cek saldo -> potong ->
--   catat transaksi -> buat order. Idempoten via ref_key (pola sama
--   dengan admin_deposit).

alter table public.package_orders
  add column if not exists payment_type text,
  add column if not exists mikrotik_status text default 'pending',
  add column if not exists ref_key text;

create unique index if not exists package_orders_ref_key_unique
  on public.package_orders (ref_key)
  where ref_key is not null;

-- Pelanggan boleh membaca langganan miliknya sendiri (dipakai
-- kartu/section "Paket Aktif" di dashboard).
drop policy if exists package_orders_select_self
  on public.package_orders;

create policy package_orders_select_self
  on public.package_orders
  for select
  using (auth.uid() = user_id);

create or replace function public.purchase_package(
  p_package_id bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_package public.packages;
  v_balance numeric;
  v_wallet public.wallets;
  v_order public.package_orders;
  v_ref_key text;
  v_end_at timestamptz;
begin
  v_user := auth.uid();

  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user and status = 'active'
  ) then
    raise exception 'ACCOUNT_INACTIVE' using errcode = '42501';
  end if;

  v_ref_key := nullif(trim(coalesce(p_idempotency_key, '')), '');

  if v_ref_key is null or length(v_ref_key) > 64 then
    raise exception 'IDEMPOTENCY_KEY_INVALID' using errcode = '22023';
  end if;

  select * into v_package
    from public.packages
    where id = p_package_id
      and active = true;

  if not found then
    raise exception 'PACKAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_package.price is null or v_package.price <= 0 then
    raise exception 'PRICE_INVALID' using errcode = '22023';
  end if;

  -- Fast path: replay permintaan yang sama tidak memotong ulang saldo.
  if exists (
    select 1 from public.wallet_transactions
    where ref_key = v_ref_key and user_id = v_user
  ) then
    select * into v_wallet
      from public.wallets
      where user_id = v_user;

    select * into v_order
      from public.package_orders
      where ref_key = v_ref_key and user_id = v_user
      limit 1;

    return jsonb_build_object(
      'replay', true,
      'wallet', to_jsonb(v_wallet),
      'order', to_jsonb(v_order)
    );
  end if;

  -- Kunci baris wallet agar pembelian serentak terserialisasi.
  select balance into v_balance
    from public.wallets
    where user_id = v_user
    for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_balance < v_package.price then
    raise exception 'INSUFFICIENT_BALANCE' using errcode = 'P0001';
  end if;

  if v_package.duration_minutes is not null then
    v_end_at := now()
      + make_interval(mins => v_package.duration_minutes);
  end if;

  begin
    update public.wallets
      set balance = balance - v_package.price,
          updated_at = now()
      where user_id = v_user
      returning * into v_wallet;

    insert into public.wallet_transactions
      (user_id, type, amount, note, ref_key)
    values (
      v_user,
      'purchase',
      v_package.price,
      'Pembelian paket ' || v_package.name,
      v_ref_key
    );

    insert into public.package_orders
      (user_id, package_id, price, status, start_at, end_at,
       payment_type, ref_key, mikrotik_status)
    values (
      v_user,
      v_package.id,
      v_package.price,
      'active',
      now(),
      v_end_at,
      'wallet',
      v_ref_key,
      'pending'
    )
    returning * into v_order;

  exception
    -- Balapan dua request dengan key sama: seluruh blok ini
    -- (potong saldo + transaksi + order) di-rollback otomatis,
    -- lalu kembalikan kondisi hasil request pertama.
    when unique_violation then
      select * into v_wallet
        from public.wallets
        where user_id = v_user;

      select * into v_order
        from public.package_orders
        where ref_key = v_ref_key and user_id = v_user
        limit 1;

      return jsonb_build_object(
        'replay', true,
        'wallet', to_jsonb(v_wallet),
        'order', to_jsonb(v_order)
      );
  end;

  return jsonb_build_object(
    'replay', false,
    'wallet', to_jsonb(v_wallet),
    'order', to_jsonb(v_order)
  );
end;
$$;

revoke all on function public.purchase_package(bigint, text) from public, anon;
grant execute on function public.purchase_package(bigint, text) to authenticated;
