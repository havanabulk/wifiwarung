alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.packages enable row level security;
alter table public.package_orders enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "wallets_select_self_or_admin" on public.wallets;
create policy "wallets_select_self_or_admin"
  on public.wallets
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "wallets_write_admin_only" on public.wallets;
create policy "wallets_insert_admin_only"
  on public.wallets
  for insert to authenticated
  with check (public.is_admin());

create policy "wallets_update_admin_only"
  on public.wallets
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "wallets_delete_admin_only"
  on public.wallets
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "wallet_transactions_select_self_or_admin" on public.wallet_transactions;
create policy "wallet_transactions_select_self_or_admin"
  on public.wallet_transactions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "packages_select_public" on public.packages;
create policy "packages_select_public"
  on public.packages
  for select to public
  using (true);

drop policy if exists "packages_insert_admin" on public.packages;
create policy "packages_insert_admin"
  on public.packages
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "packages_update_admin" on public.packages;
create policy "packages_update_admin"
  on public.packages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "packages_delete_admin" on public.packages;
create policy "packages_delete_admin"
  on public.packages
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "package_orders_select_self_or_admin" on public.package_orders;
create policy "package_orders_select_self_or_admin"
  on public.package_orders
  for select to authenticated
  using (
    user_id = auth.uid() or public.is_admin()
  );

drop policy if exists "support_messages_insert_public" on public.support_messages;
create policy "support_messages_insert_public"
  on public.support_messages
  for insert to anon, authenticated
  with check (true);

drop policy if exists "support_messages_select_admin" on public.support_messages;
create policy "support_messages_select_admin"
  on public.support_messages
  for select to authenticated
  using (public.is_admin());

drop policy if exists "support_messages_update_admin" on public.support_messages;
create policy "support_messages_update_admin"
  on public.support_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
