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
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create unique index if not exists wallets_user_id_unique
  on public.wallets (user_id);

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

revoke all on function public.admin_deposit(uuid, numeric, text) from public, anon;
grant execute on function public.admin_deposit(uuid, numeric, text) to authenticated;
