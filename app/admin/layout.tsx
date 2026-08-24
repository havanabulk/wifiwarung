import AdminSidebar from "@/components/admin/AdminSidebar";
import { requireAdminPage } from "@/lib/auth/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <div className="min-h-screen bg-[#080808] text-[#f2f0ea]">
      <AdminSidebar />

      <main className="lg:pl-72">
        {children}
      </main>
    </div>
  );
}
