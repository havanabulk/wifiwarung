-- Merapikan policy RLS hasil audit:
--
-- 1. Policy SELECT profiles eksplisit "to authenticated". Versi
--    sebelumnya tidak menyebut TO sehingga berlaku untuk PUBLIC.
--    Secara efektif aman (anon tidak punya auth.uid()), tapi
--    eksplisit lebih tahan terhadap salah konfigurasi ke depan.
--
-- 2. Hapus policy SELECT redundan package_orders_select_self (dibuat
--    migrasi purchase_package). package_orders_select_self_or_admin
--    sudah mencakup kasus yang sama (pemilik ATAU admin), jadi cukup
--    satu permissive policy.

drop policy if exists profiles_select_self_or_admin
  on public.profiles;

create policy profiles_select_self_or_admin
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or public.is_admin()
  );

drop policy if exists package_orders_select_self
  on public.package_orders;
