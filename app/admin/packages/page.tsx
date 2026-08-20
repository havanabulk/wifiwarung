import { createClient } from "@/lib/supabase/server";
import PackagesManager from "@/components/admin/PackagesManager";

export default async function PackagesPage() {
  const supabase = await createClient();

  const { data: packages, error } = await supabase
    .from("packages")
    .select("*")
    .order("type", { ascending: true })
    .order("price", { ascending: true });

  if (error) {
    console.error(error);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/6 bg-[#080808] px-5 py-7 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-[10px] font-bold tracking-[0.25em] text-[#b89b5e]">
            PACKAGE MANAGEMENT
          </div>

          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Paket Internet
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Kelola paket waktu dan kuota pelanggan WARUNG28 HOTSPOT.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
        <PackagesManager initialPackages={packages ?? []} />
      </div>
    </div>
  );
}