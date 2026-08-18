import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080808] text-[#f2f0ea]">
      <AdminSidebar />

      <main className="lg:pl-72">
        {children}
      </main>
    </div>
  );
}