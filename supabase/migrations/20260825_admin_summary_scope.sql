-- Konsistensi metrik ringkasan pelanggan (hasil audit):
-- Semua metrik kini mengecualikan akun admin, konsisten dengan
-- activeCustomers yang memang sudah exclude admin. Sebelumnya
-- totalBalance ikut menghitung wallet admin dan activePackages bisa
-- menghitung order milik admin.

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
      select count(distinct po.user_id)
      from public.package_orders po
      join public.profiles p on p.id = po.user_id
      where po.status = 'active'
        and (po.end_at is null or po.end_at > now())
        and p.role <> 'admin'
    ),
    'totalBalance', (
      select coalesce(sum(w.balance), 0)
      from public.wallets w
      join public.profiles p on p.id = w.user_id
      where p.role <> 'admin'
    )
  );
end;
$$;

revoke all on function public.admin_customers_summary() from public, anon;
grant execute on function public.admin_customers_summary() to authenticated;
