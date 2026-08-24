-- Login pelanggan/admin membaca baris profiles milik sendiri lewat
-- browser client (dilindungi RLS). Tabel dibuat manual di luar repo,
-- jadi policy ini dipastikan selalu ada di sini.

drop policy if exists profiles_select_self_or_admin
  on public.profiles;

create policy profiles_select_self_or_admin
  on public.profiles
  for select
  using (
    auth.uid() = id
    or public.is_admin()
  );
