import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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