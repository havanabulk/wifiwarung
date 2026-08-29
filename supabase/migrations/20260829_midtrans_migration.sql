-- Migrasi Tripay -> Midtrans Snap.
--
-- Pembayaran online kini melalui Snap Midtrans (order_id = merchant_ref,
-- jadi tidak perlu kolom referensi terpisah untuk lookup). Tripay dihentikan;
-- data lama (tripay_ref) dibiarkan untuk histori.

alter table public.transactions
  add column if not exists midtrans_order_id text unique,
  add column if not exists snap_token text;

create index if not exists idx_transactions_midtrans_order_id
  on public.transactions (midtrans_order_id)
  where midtrans_order_id is not null;