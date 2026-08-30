-- # device_mac pada profiles (auto-unlock walled-garden)
--
-- Menyimpan MAC perangkat yang terakhir terbuka lewat redirect portal MikroTik
-- (?mac=...). Dipakai n8n untuk membuka akses internet perangkat itu saat
-- order lunas, tanpa user harus input username/password WiFi.

alter table public.profiles
  add column if not exists device_mac text;

create index if not exists profiles_device_mac_ix
  on public.profiles (device_mac)
  where device_mac is not null;