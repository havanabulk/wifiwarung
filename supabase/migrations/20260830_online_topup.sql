-- Top up saldo online (Midtrans Snap).
--
-- Deposit ditandai di tabel transactions dengan package_id NULL dan
-- merchant_ref berprefix W28T-. Saat transaksi lunas, webhook/sync status
-- memanggil apply_online_deposit: menaikkan saldo wallet + mencatat
-- wallet_transactions bertipe 'deposit' secara idempoten via ref_key
-- (= merchant_ref, memakai index unik yang sudah ada).

create or replace function public.apply_online_deposit(
  p_transaction_id uuid
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.transactions;
  v_wallet public.wallets;
begin
  if p_transaction_id is null then
    raise exception 'TRANSACTION_REQUIRED' using errcode = '22023';
  end if;

  select * into v_tx
    from public.transactions
    where id = p_transaction_id and status = 'paid'
    limit 1;

  if not found then
    raise exception 'TRANSACTION_NOT_PAID' using errcode = 'P0002';
  end if;

  -- hanya top up saldo (bukan pembelian paket)
  if v_tx.package_id is not null then
    raise exception 'NOT_DEPOSIT' using errcode = '22023';
  end if;

  if v_tx.user_id is null then
    raise exception 'USER_REQUIRED' using errcode = '22023';
  end if;

  -- Fast path: credential deposit sudah pernah dipakai -> jangan kredit ulang.
  if exists (
    select 1 from public.wallet_transactions
    where ref_key = v_tx.merchant_ref
  ) then
    select * into v_wallet
      from public.wallets
      where user_id = v_tx.user_id;

    return v_wallet;
  end if;

  begin
    insert into public.wallets (user_id, balance)
    values (v_tx.user_id, v_tx.amount_received)
    on conflict (user_id) do update
      set balance = public.wallets.balance + excluded.balance,
          updated_at = now()
    returning * into v_wallet;

    insert into public.wallet_transactions (user_id, type, amount, note, ref_key)
    values (
      v_tx.user_id,
      'deposit',
      v_tx.amount_received,
      'Top up saldo online (Midtrans) ' || v_tx.merchant_ref,
      v_tx.merchant_ref
    );

  exception
    when unique_violation then
      select * into v_wallet
        from public.wallets
        where user_id = v_tx.user_id;

      return v_wallet;
  end;

  return v_wallet;
end;
$$;

revoke all on function public.apply_online_deposit(uuid) from public, anon, authenticated;
grant execute on function public.apply_online_deposit(uuid) to service_role;