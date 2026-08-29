-- Rekonsiliasi schema tabel transactions dengan kebutuhan aplikasi.
--
-- Latar belakang: tabel transactions sudah ADA di database dengan skema lama
--   (id, user_id, package_id, type, amount, status, description, created_at,
--    midtrans_order_id, snap_token).
-- Migrasi 20260825_transactions_table.sql memakai `create table if not exists`
-- sehingga tidak menambahkan kolom ke tabel yang sudah ada. Akibatnya kolom
-- yang dibutuhkan aplikasi (merchant_ref, guest_*, payment_*, fee_*,
-- amount_received, paid_at, expired_at, checkout_url, package_order_id)
-- tidak pernah ada -> insert transaksi gagal.
--
-- File ini menambahkan kolom yang kurang secara idempoten (aman dijalankan
-- ulang / beberapa kali).

alter table public.transactions add column if not exists guest_name text;
alter table public.transactions add column if not exists guest_email text;
alter table public.transactions add column if not exists guest_phone text;

alter table public.transactions add column if not exists merchant_ref text;

alter table public.transactions add column if not exists payment_method text;
alter table public.transactions add column if not exists payment_method_code text;
alter table public.transactions add column if not exists pay_code text;
alter table public.transactions add column if not exists checkout_url text;

alter table public.transactions add column if not exists fee_merchant integer default 0;
alter table public.transactions add column if not exists fee_customer integer default 0;
alter table public.transactions add column if not exists amount_received integer default 0;

alter table public.transactions add column if not exists paid_at timestamptz;
alter table public.transactions add column if not exists expired_at timestamptz;
alter table public.transactions add column if not exists package_order_id uuid;
alter table public.transactions add column if not exists updated_at timestamptz default now();

-- Aplikasi tidak mengisi kolom `type` (NOT NULL tanpa default) -> beri default.
alter table public.transactions alter column type set default 'purchase';

-- merchant_ref dipakai untuk lookup webhook/sync (unik, wajib diisi kode).
alter table public.transactions alter column merchant_ref set not null;
create unique index if not exists idx_transactions_merchant_ref
  on public.transactions (merchant_ref);

-- idempotensi webhook: satu order_id hanya satu transaksi.
create unique index if not exists idx_transactions_midtrans_order_id
  on public.transactions (midtrans_order_id)
  where midtrans_order_id is not null;

create index if not exists idx_transactions_user_id
  on public.transactions (user_id)
  where user_id is not null;

create index if not exists idx_transactions_status
  on public.transactions (status);

-- RLS: pengguna hanya dapat melihat transaksi miliknya (atau via email-nya).
alter table public.transactions enable row level security;

drop policy if exists transactions_select_self on public.transactions;
create policy transactions_select_self
  on public.transactions
  for select
  using (
    auth.uid() = user_id
    or guest_email = (select email from auth.users where id = auth.uid())
  );