-- Follow-up hardening hasil audit:
-- 1. is_admin() juga mewajibkan status = 'active'
-- 2. Paket nonaktif tidak lagi terbaca publik (hanya admin)
-- 3. Deposit diberi batas atas per transaksi

-- ------------------------------------------------------------------
-- 1. is_admin(): role admin DAN akun aktif
--    (policy yang sudah ada otomatis ikut definisi terbaru)
-- ------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

-- ------------------------------------------------------------------
-- 2. Katalog publik hanya boleh membaca paket aktif.
--    Admin tetap melihat semua baris lewat policy yang sama.
-- ------------------------------------------------------------------

drop policy if exists "packages_select_public" on public.packages;
create policy "packages_select_public"
  on public.packages
  for select to public
  using (
    active = true
    or public.is_admin()
  );

-- ------------------------------------------------------------------
-- 3. Batas atas deposit per transaksi: Rp 10.000.000
-- ------------------------------------------------------------------

create or replace function public.admin_deposit(
  p_user_id uuid,
  p_amount numeric,
  p_note text default null
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
begin
  if not public.is_admin() then
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

  insert into public.wallets (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
    set balance = public.wallets.balance + excluded.balance,
        updated_at = now()
  returning * into v_wallet;

  insert into public.wallet_transactions (user_id, type, amount, note)
  values (
    p_user_id,
    'deposit',
    p_amount,
    coalesce(nullif(trim(p_note), ''), 'Deposit oleh admin')
  );

  return v_wallet;
end;
$$;
