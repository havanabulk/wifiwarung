import { requireAdminPage } from "@/lib/auth/admin";
import VouchersManager from "@/components/admin/VouchersManager";

export default async function AdminVouchersPage() {
  await requireAdminPage();

  return (
    <div className="min-h-screen bg-[#080808] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-[#f2f0ea]">Voucher</h1>

          <p className="mt-1 text-sm text-[#a7a39a]">
            Buat batch voucher dan pantau pemakaiannya.
          </p>
        </header>

        <VouchersManager />
      </div>
    </div>
  );
}
