-- Perbaikan purchase_package hasil audit:
-- Cek replay (ref_key sudah pernah dipakai) dipindah ke SETELAH lock
-- wallet (FOR UPDATE). Sebelumnya cek dilakukan sebelum lock, sehingga
-- dua request duplikat serentak bisa membuat request kedua gagal
-- INSUFFICIENT_BALANCE padahal request pertamanya sukses.
--
-- Dengan lock lebih dulu, request kedua menunggu request pertama
-- commit, lalu melihat transaksinya dan kembali sebagai replay --
-- bukan salah dilaporkan gagal karena saldo berkurang.
-- Handler unique_violation tetap ada sebagai pengaman tambahan.

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

  -- Kunci baris wallet agar pembelian serentak terserialisasi.
  select balance into v_balance
    from public.wallets
    where user_id = v_user
    for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Cek replay SETELAH lock (lihat komentar atas).
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
