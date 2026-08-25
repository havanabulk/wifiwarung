-- Transaksi pembelian paket via Tripay payment gateway.
--
-- Flow: user pilih paket -> buat transaksi -> Tripay redirect/bayar
-- -> webhook callback -> update status -> aktivasi paket

create table if not exists public.transactions (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete set null,
  package_id    bigint references public.packages(id) on delete set null,

  -- guest info (untuk user yang belum login)
  guest_name    text,
  guest_email   text,
  guest_phone   text,

  -- tripay data
  tripay_ref          text unique,
  merchant_ref        text unique not null,
  payment_method      text,
  payment_method_code text,
  pay_code            text,
  checkout_url        text,

  -- amounts
  amount          integer not null,
  fee_merchant    integer default 0,
  fee_customer    integer default 0,
  amount_received integer default 0,

  -- status: pending -> paid / failed / expired / refunded
  status        text default 'pending' check (status in ('pending','paid','failed','expired','refunded')),
  paid_at       timestamptz,
  expired_at    timestamptz,

  -- activated package order
  package_order_id uuid,

  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- index untuk lookup cepat
create index if not exists idx_transactions_merchant_ref
  on public.transactions (merchant_ref);

create index if not exists idx_transactions_user_id
  on public.transactions (user_id) where user_id is not null;

create index if not exists idx_transactions_guest_email
  on public.transactions (guest_email) where guest_email is not null;

create index if not exists idx_transactions_status
  on public.transactions (status);

-- RLS: user bisa baca transaksi sendiri
alter table public.transactions enable row level security;

drop policy if exists transactions_select_self on public.transactions;
create policy transactions_select_self
  on public.transactions
  for select
  using (
    auth.uid() = user_id
    or guest_email = (select email from auth.users where id = auth.uid())
  );

-- service role handles all writes via API routes
