-- Perbaikan dua bug yang membuat deposito/pembelian online tidak pernah
-- tercatat "lunas" dan saldo tidak bertambah:
--
-- 1. CHECK constraint lama pada transactions.status menolak nilai 'paid'
--    (hanya mengizinkan pending/failed/success, dst). Semua update ke
--    'paid'/'expired' gagal diam-diam sehingga webhook/sync tidak
--    berpengaruh. Constraint status diganti dengan himpunan aplikasi:
--    pending, paid, failed, expired, refunded.
--
-- 2. transactions.id di database live bertipe integer, sedangkan fungsi
--    apply_online_deposit(uuid) mengharapkan uuid -> RPC selalu gagal
--    "invalid input syntax for type uuid". Fungsi diganti menerima bigint.

/* ---------- 1. perbaiki check constraint status ---------- */

do $$
declare
  c record;
begin
  -- hapus SEMUA check constraint pada kolom status (apa pun namanya)
  for c in
    select conname
      from pg_constraint
      join pg_class on pg_class.oid = pg_constraint.conrelid
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
     where pg_namespace.nspname = 'public'
       and pg_class.relname = 'transactions'
       and pg_constraint.contype = 'c'
       and exists (
         select 1
           from unnest(pg_constraint.conkey) k
           join pg_attribute a
             on a.attrelid = pg_constraint.conrelid
            and a.attnum = k
          where a.attname = 'status'
       )
  loop
    execute format('alter table public.transactions drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions add constraint transactions_status_check
  check (status in ('pending', 'paid', 'failed', 'expired', 'refunded'));

/* ---------- 2. perbaiki RPC deposit (id integer) ---------- */

drop function if exists public.apply_online_deposit(uuid);
drop function if exists public.apply_online_deposit(bigint);

create or replace function public.apply_online_deposit(
  p_transaction_id bigint
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

revoke all on function public.apply_online_deposit(bigint) from public, anon, authenticated;
grant execute on function public.apply_online_deposit(bigint) to service_role;