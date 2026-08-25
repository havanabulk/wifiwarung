import Link from "next/link";
import { requireStaffPage } from "@/lib/auth/staff";
import LogoutButton from "@/components/auth/LogoutButton";
import KasirConsole from "@/components/kasir/KasirConsole";

export default async function KasirPage() {
  const { profile } = await requireStaffPage();

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-white/6 pb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#b89b5e]">
              WARUNG28 HOTSPOT
            </p>

            <h1 className="mt-2 text-2xl font-black text-[#f2f0ea]">
              Konsol Kasir
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {profile.role === "admin" && (
              <Link
                href="/admin"
                className="rounded-xl border border-white/10 bg-white/2 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Panel Admin
              </Link>
            )}

            <LogoutButton className="rounded-xl border border-white/10 bg-white/2 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50" />
          </div>
        </header>

        <div className="mt-8">
          <KasirConsole />
        </div>
      </div>
    </main>
  );
}
