-- Role kasir:
--
-- - profiles.role: 'customer' | 'kasir' | 'admin'.
-- - staff = admin ATAU kasir yang aktif (helper is_staff()).
-- - Kasir boleh MEMBACA profil pelanggan & saldo mereka (RLS
--   diperluas), membuat pelanggan baru lewat API khusus server
--   (service role, bukan lewat RLS), dan melakukan deposit via
--   admin_deposit.
-- - Target deposit dipbatasi ke pelanggan biasa (bukan sesama staff).

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'kasir')
      and status = 'active'
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- ------------------------------------------------------------------
-- Profiles: staff boleh membaca baris PELANGGAN (bukan sesama staff,
-- hanya admin yang melihat staff lain).
-- ------------------------------------------------------------------

drop policy if exists profiles_select_self_or_admin
  on public.profiles;

create policy profiles_select_self_or_admin
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (
      public.is_staff()
      and role not in ('admin', 'kasir')
    )
  );

-- ------------------------------------------------------------------
-- Wallets: staff boleh membaca saldo milik pelanggan.
-- ------------------------------------------------------------------

drop policy if exists wallets_select_self_or_admin
  on public.wallets;

create policy wallets_select_self_or_admin
  on public.wallets
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      public.is_staff()
      and exists (
        select 1 from public.profiles p
        where p.id = wallets.user_id
          and p.role not in ('admin', 'kasir')
      )
    )
  );

-- ------------------------------------------------------------------
-- Deposit dibuka untuk staff (admin/kasir). Isi fungsi sama dengan
-- versi idempotensi terbaru; perubahan:
--   1. Guard permission: is_admin() -> is_staff()
--   2. Target harus pelanggan biasa (role tidak admin/kasir)
--   3. Fallback catatan default jadi 'Deposit oleh staf'
-- ------------------------------------------------------------------

create or replace function public.admin_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_note text default null,
  p_idempotency_key text default null
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
  v_ref_key text;
begin
  if not public.is_staff() then
    raise insufficient_privilege;
  end if;

  if p_user_id is null then
    raise exception 'USER_ID_REQUIRED' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'AMOUNT_INVALID' using errcode = '22023';
  end if;

  if p_amount <> trunc(p_amount) then
    raise exception 'AMOUNT_NOT_INTEGER' using errcode = '22023';
  end if;

  if p_amount < 1000 then
    raise exception 'AMOUNT_BELOW_MINIMUM' using errcode = '22023';
  end if;

  if p_amount > 10000000 then
    raise exception 'AMOUNT_ABOVE_MAXIMUM' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles where id = p_user_id
  ) then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.profiles
    where id = p_user_id
      and role in ('admin', 'kasir')
  ) then
    raise exception 'TARGET_NOT_CUSTOMER' using errcode = '22023';
  end if;

  v_ref_key := nullif(trim(coalesce(p_idempotency_key, '')), '');

  if length(v_ref_key) > 64 then
    raise exception 'IDEMPOTENCY_KEY_INVALID' using errcode = '22023';
  end if;

  -- Fast path: key sudah pernah dipakai -> jangan kredit ulang.
  if v_ref_key is not null and exists (
    select 1 from public.wallet_transactions where ref_key = v_ref_key
  ) then
    select * into v_wallet
      from public.wallets
      where user_id = p_user_id;

    return v_wallet;
  end if;

  begin
    insert into public.wallets (user_id, balance)
    values (p_user_id, p_amount)
    on conflict (user_id) do update
      set balance = public.wallets.balance + excluded.balance,
          updated_at = now()
    returning * into v_wallet;

    insert into public.wallet_transactions (user_id, type, amount, note, ref_key)
    values (
      p_user_id,
      'deposit',
      p_amount,
      coalesce(nullif(trim(p_note), ''), 'Deposit oleh staf'),
      v_ref_key
    );

  exception
    -- Balapan dua request dengan key sama: subtransaction di-rollback
    -- (termasuk kenaikan saldo), lalu kembalikan kondisi wallet saat ini.
    when unique_violation then
      select * into v_wallet
        from public.wallets
        where user_id = p_user_id;

      return v_wallet;
  end;

  return v_wallet;
end;
$$;

revoke all on function public.admin_deposit(uuid, numeric, text, text) from public, anon;
grant execute on function public.admin_deposit(uuid, numeric, text, text) to authenticated;
