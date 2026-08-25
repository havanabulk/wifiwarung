-- Ringkasan halaman pelanggan admin dihitung di database (hasil audit).
-- Menggantikan fetch semua baris wallets + package_orders per request:
-- dengan agregasi SQL, biaya tetap konstan saat data tumbuh.
-- Definisi metrik sama persis dengan implementasi lama di API.

create or replace function public.admin_customers_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise insufficient_privilege;
  end if;

  return jsonb_build_object(
    'activeCustomers', (
      select count(*)
      from public.profiles
      where role <> 'admin'
        and status = 'active'
    ),
    'activePackages', (
      select count(distinct user_id)
      from public.package_orders
      where status = 'active'
        and (end_at is null or end_at > now())
    ),
    'totalBalance', (
      select coalesce(sum(balance), 0)
      from public.wallets
    )
  );
end;
$$;

revoke all on function public.admin_customers_summary() from public, anon;
grant execute on function public.admin_customers_summary() to authenticated;
