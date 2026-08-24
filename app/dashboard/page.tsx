import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(
        "username, full_name, balance, role, status"
      )
      .eq("id", user.id)
      .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.status !== "active") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#11110f] p-8 text-center">
          <h1 className="text-xl font-black text-[#f2f0ea]">
            Akun Dinonaktifkan
          </h1>

          <p className="mt-3 text-sm text-[#a7a39a]">
            Akun Anda sedang dinonaktifkan. Silakan hubungi admin WARUNG28
            untuk mengaktifkan kembali akun Anda.
          </p>

          <LogoutButton
            className="
              mt-6
              w-full
              rounded-xl
              border
              border-red-500/20
              bg-red-500/5
              px-4
              py-3
              text-sm
              font-semibold
              text-red-300
              transition
              hover:bg-red-500/10
              disabled:opacity-50
            "
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-8">

      <div className="mx-auto max-w-5xl">

        <header
          className="
            flex
            items-center
            justify-between
            border-b
            border-white/6
            pb-6
          "
        >

          <div>

            <p
              className="
                text-[10px]
                font-bold
                tracking-[0.2em]
                text-[#b89b5e]
              "
            >
              WARUNG28 HOTSPOT
            </p>

            <h1
              className="
                mt-2
                text-2xl
                font-black
                text-[#f2f0ea]
              "
            >
              Dashboard
            </h1>

          </div>

          <div className="flex items-center gap-3">
            <div
              className="
                rounded-full
                border
                border-[#b89b5e]/20
                px-4
                py-2
                text-xs
                text-[#c8ad72]
              "
            >
              ● Online
            </div>

            <LogoutButton
              className="
                rounded-xl
                border
                border-white/10
                bg-white/2
                px-4
                py-2
                text-xs
                font-semibold
                text-white/60
                transition
                hover:bg-white/5
                hover:text-white
                disabled:opacity-50
              "
            />
          </div>

        </header>


        {/* SALDO */}

        <section
          className="
            mt-6
            rounded-3xl
            border
            border-[#b89b5e]/15
            bg-[#11110f]
            p-7
          "
        >

          <p
            className="
              text-xs
              text-[#a7a39a]
            "
          >
            Saldo Anda
          </p>

          <h2
            className="
              mt-2
              text-4xl
              font-black
              text-[#c8ad72]
            "
          >
            Rp{" "}
            {Number(
              profile.balance
            ).toLocaleString("id-ID")}
          </h2>

          <button
            className="
              mt-6
              rounded-xl
              bg-[#b89b5e]
              px-5
              py-3
              text-sm
              font-bold
              text-[#17130c]
            "
          >
            + Top Up Saldo
          </button>

        </section>


        {/* USER */}

        <section
          className="
            mt-5
            grid
            gap-4
            sm:grid-cols-3
          "
        >

          <Info
            label="Username"
            value={
              profile.username ??
              user.email ??
              "-"
            }
          />

          <Info
            label="Status"
            value={profile.status}
          />

          <Info
            label="Role"
            value={profile.role}
          />

        </section>


        {/* PACKAGES */}

        <section className="mt-10">

          <h2
            className="
              text-xl
              font-bold
              text-[#f2f0ea]
            "
          >
            Beli Paket Internet
          </h2>

          <p
            className="
              mt-2
              text-sm
              text-[#a7a39a]
            "
          >
            Pilih paket yang sesuai
            kebutuhan Anda.
          </p>

          <div
            className="
              mt-5
              rounded-2xl
              border
              border-white/6
              bg-[#11110f]
              p-6
              text-sm
              text-[#a7a39a]
            "
          >
            Daftar paket akan kita hubungkan
            langsung ke database WARUNG28
            pada tahap berikutnya.
          </div>

        </section>

      </div>

    </main>
  );
}


function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/6
        bg-[#11110f]
        p-5
      "
    >

      <p
        className="
          text-[10px]
          uppercase
          tracking-[0.15em]
          text-[#a7a39a]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-2
          truncate
          text-sm
          font-bold
          text-[#f2f0ea]
        "
      >
        {value}
      </p>

    </div>
  );
}