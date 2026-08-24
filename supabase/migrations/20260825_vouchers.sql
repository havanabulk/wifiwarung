-- Sistem voucher (F5/M2 tahap 3).
--
-- Tipe yang aktif di fase ini:
--   balance  : menambah saldo wallet.
--   duration : memperpanjang end_at paket aktif (butuh order aktif).
-- Tipe 'quota' ditunda sampai fase MikroTik karena akuntansi kuota
-- belum ada; constraint tetap mengizinkan nilainya di DB agar migrasi
-- berikutnya tidak perlu alter, namun API/UI belum menyediakannya.
--
-- Redeem hanya lewat RPC SECURITY DEFINER (atomic, sekali pakai,
-- kedaluwarsa dicek saat tebus). Tidak ada policy insert/update untuk
-- user biasa — pola sama dengan wallets/wallet_transactions.

create table if not exists public.voucher_batches (
  id bigint generated always as identity primary key,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  type text not null check (type in ('duration', 'quota', 'balance')),
  value numeric not null check (value > 0),
  count integer not null check (count between 1 and 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.vouchers (
  id bigint generated always as identity primary key,
  code text not null unique,
  type text not null check (type in ('duration', 'quota', 'balance')),
  value numeric not null check (value > 0),
  batch_id bigint references public.voucher_batches(id) on delete set null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists vouchers_batch_id_idx
  on public.vouchers (batch_id);

create index if not exists vouchers_redeemed_by_idx
  on public.vouchers (redeemed_by);

alter table public.voucher_batches enable row level security;
alter table public.vouchers enable row level security;

drop policy if exists voucher_batches_admin_all
  on public.voucher_batches;
create policy voucher_batches_admin_all
  on public.voucher_batches
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists vouchers_admin_all
  on public.vouchers;
create policy vouchers_admin_all
  on public.vouchers
  for all
  using (public.is_admin())
  with check (public.is_admin());


-- Membuat batch + semua kode dalam satu transaksi atomic.
create or replace function public.admin_create_voucher_batch(
  p_label text,
  p_type text,
  p_value numeric,
  p_count integer,
  p_expires_at timestamptz,
  p_codes text[]
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_batch_id bigint;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_type not in ('duration', 'quota', 'balance') then
    raise exception 'TYPE_INVALID' using errcode = '22023';
  end if;

  if p_value is null or p_value <= 0 then
    raise exception 'VALUE_INVALID' using errcode = '22023';
  end if;

  if p_count is null or p_count < 1 or p_count > 500 then
    raise exception 'COUNT_INVALID' using errcode = '22023';
  end if;

  if p_codes is null or array_length(p_codes, 1) is null
     or array_length(p_codes, 1) <> p_count then
    raise exception 'CODES_MISMATCH' using errcode = '22023';
  end if;

  insert into public.voucher_batches
    (label, type, value, count, created_by)
  values (
    btrim(p_label),
    p_type,
    p_value,
    p_count,
    v_admin
  )
  returning id into v_batch_id;

  insert into public.vouchers
    (code, type, value, batch_id, expires_at)
  select
    c.code,
    p_type,
    p_value,
    v_batch_id,
    p_expires_at
  from unnest(p_codes) as c(code);

  return v_batch_id;
end;
$$;

revoke all on function public.admin_create_voucher_batch(text, text, numeric, integer, timestamptz, text[])
  from public, anon;
grant execute on function public.admin_create_voucher_batch(text, text, numeric, integer, timestamptz, text[])
  to authenticated;


-- Tebus voucher: balance -> kredit wallet; duration -> perpanjang
-- paket aktif. Sekali pakai via row lock + pengecekan status.
create or replace function public.redeem_voucher(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_voucher public.vouchers;
  v_wallet public.wallets;
  v_order public.package_orders;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user and status = 'active'
  ) then
    raise exception 'ACCOUNT_INACTIVE' using errcode = '42501';
  end if;

  if p_code is null or btrim(p_code) = '' then
    raise exception 'CODE_REQUIRED' using errcode = '22023';
  end if;

  select * into v_voucher
    from public.vouchers
    where upper(code) = upper(btrim(p_code))
    for update;

  if not found then
    raise exception 'VOUCHER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not v_voucher.active then
    raise exception 'VOUCHER_INACTIVE' using errcode = '22023';
  end if;

  if v_voucher.redeemed_at is not null then
    raise exception 'VOUCHER_ALREADY_REDEEMED' using errcode = '22023';
  end if;

  if v_voucher.expires_at is not null and v_voucher.expires_at <= now() then
    raise exception 'VOUCHER_EXPIRED' using errcode = '22023';
  end if;

  -- Voucher durasi butuh paket aktif sebagai target; cek & kunci
  -- sebelum menandai voucher terpakai.
  if v_voucher.type = 'duration' then
    select * into v_order
      from public.package_orders
      where user_id = v_user
        and status = 'active'
        and (end_at is null or end_at > now())
      order by start_at desc
      limit 1
      for update;

    if not found then
      raise exception 'NO_ACTIVE_ORDER' using errcode = 'P0002';
    end if;
  end if;

  update public.vouchers
    set redeemed_by = v_user,
        redeemed_at = now()
    where id = v_voucher.id;

  if v_voucher.type = 'balance' then

    insert into public.wallets (user_id, balance)
    values (v_user, 0)
    on conflict (user_id) do nothing;

    update public.wallets
      set balance = balance + v_voucher.value,
          updated_at = now()
      where user_id = v_user
      returning * into v_wallet;

    insert into public.wallet_transactions
      (user_id, type, amount, note)
    values (
      v_user,
      'voucher',
      v_voucher.value,
      'Tebus voucher ' || v_voucher.code
    );

    return jsonb_build_object(
      'type', 'balance',
      'value', v_voucher.value,
      'wallet', to_jsonb(v_wallet)
    );

  elsif v_voucher.type = 'duration' then

    update public.package_orders
      set end_at = coalesce(end_at, now())
            + make_interval(mins => v_voucher.value::int)
      where id = v_order.id
      returning * into v_order;

    return jsonb_build_object(
      'type', 'duration',
      'value', v_voucher.value,
      'order', to_jsonb(v_order)
    );

  else
    raise exception 'TYPE_UNSUPPORTED' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.redeem_voucher(text) from public, anon;
grant execute on function public.redeem_voucher(text) to authenticated;
