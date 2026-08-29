import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TopUpForm from "@/components/dashboard/TopUpForm";

export default async function TopUpPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const balance = Number(wallet?.balance ?? 0);

  if (profile.status !== "active") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#11110f] p-8 text-center">
          <h1 className="text-xl font-black text-[#f2f0ea]">
            Akun Dinonaktifkan
          </h1>

          <p className="mt-3 text-sm text-[#a7a39a]">
            Akun Anda sedang dinonaktifkan. Silakan hubungi admin WARUNG28 untuk
            mengaktifkan kembali akun Anda.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-8">
      <div className="mx-auto max-w-md">
        <header className="flex items-center justify-between border-b border-white/6 pb-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#b89b5e]">
              WARUNG28 HOTSPOT
            </p>

            <h1 className="mt-2 text-2xl font-black text-[#f2f0ea]">
              Top Up Saldo
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-white/2 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="mt-6">
          <TopUpForm balance={balance} />
        </div>
      </div>
    </main>
  );
}
