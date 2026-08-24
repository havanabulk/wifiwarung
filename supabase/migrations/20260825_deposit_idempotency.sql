-- Idempotency deposit:
-- 1. Kolom ref_key pada wallet_transactions (kunci idempotensi, unik jika diisi)
-- 2. admin_deposit menerima p_idempotency_key: replay dengan key yang sama
--    tidak mengkreditkan saldo dua kali, cukup mengembalikan wallet terkini.

alter table public.wallet_transactions
  add column if not exists ref_key text;

create unique index if not exists wallet_transactions_ref_key_unique
  on public.wallet_transactions (ref_key)
  where ref_key is not null;

-- Signature berubah (param baru), fungsi lama harus di-drop.
drop function if exists public.admin_deposit(uuid, numeric, text);

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
      coalesce(nullif(trim(p_note), ''), 'Deposit oleh admin'),
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
