import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/admin/StatCard";

export default async function AdminPage() {
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
        "username, full_name, role, status"
      )
      .eq("id", user.id)
      .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">

      {/* Header */}

      <header
        className="
          border-b
          border-white/6
          bg-[#080808]
          px-5
          py-7
          sm:px-8
          lg:px-10
        "
      >

        <div className="mx-auto max-w-7xl">

          <div
            className="
              flex
              flex-col
              justify-between
              gap-5
              sm:flex-row
              sm:items-center
            "
          >

            <div>

              <div
                className="
                  text-[10px]
                  font-bold
                  tracking-[0.25em]
                  text-[#b89b5e]
                "
              >
                CONTROL CENTER
              </div>

              <h1
                className="
                  mt-2
                  text-2xl
                  font-black
                  tracking-tight
                  sm:text-3xl
                "
              >
                Dashboard Overview
              </h1>

              <p className="mt-2 text-sm text-white/40">
                Pantau aktivitas WARUNG28
                HOTSPOT secara realtime.
              </p>

            </div>

            <div
              className="
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-white/6
                bg-white/2
                px-4
                py-3
              "
            >

              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              <div>

                <p className="text-xs font-semibold">
                  Sistem Online
                </p>

                <p className="text-[10px] text-white/30">
                  MikroTik terhubung
                </p>

              </div>

            </div>

          </div>

        </div>

      </header>


      {/* Content */}

      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">

        {/* Stats */}

        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >

          <StatCard
            label="Total Pelanggan"
            value="0"
            description="Pelanggan terdaftar"
            icon="♙"
          />

          <StatCard
            label="Sedang Online"
            value="0"
            description="Aktif di MikroTik"
            icon="⌁"
            accent="green"
          />

          <StatCard
            label="Transaksi Hari Ini"
            value="0"
            description="Transaksi berhasil"
            icon="▤"
            accent="blue"
          />

          <StatCard
            label="Pendapatan Hari Ini"
            value="Rp 0"
            description="Total transaksi"
            icon="Rp"
            accent="gold"
          />

        </div>


        {/* Main Grid */}

        <div
          className="
            mt-6
            grid
            gap-6
            xl:grid-cols-[1.5fr_1fr]
          "
        >

          {/* Online Users */}

          <section
            className="
              overflow-hidden
              rounded-2xl
              border
              border-white/6
              bg-[#11110f]
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-white/6
                px-5
                py-5
              "
            >

              <div>

                <h2 className="font-bold">
                  Pelanggan Online
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Perangkat yang sedang terhubung
                </p>

              </div>

              <span
                className="
                  rounded-full
                  border
                  border-emerald-500/10
                  bg-emerald-500/5
                  px-3
                  py-1.5
                  text-[10px]
                  font-bold
                  text-emerald-300
                "
              >
                LIVE
              </span>

            </div>


            <div className="p-5">

              <div
                className="
                  flex
                  min-h-48
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-dashed
                  border-white/6
                  bg-white/2
                "
              >

                <div className="text-center">

                  <div className="text-2xl text-white/20">
                    ⌁
                  </div>

                  <p className="mt-3 text-sm text-white/40">
                    Belum ada pelanggan online
                  </p>

                  <p className="mt-1 text-[10px] text-white/20">
                    Data akan berasal dari MikroTik
                  </p>

                </div>

              </div>

            </div>

          </section>


          {/* MikroTik */}

          <section
            className="
              rounded-2xl
              border
              border-white/6
              bg-[#11110f]
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <h2 className="font-bold">
                  MikroTik
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Status perangkat
                </p>

              </div>

              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

            </div>


            <div className="mt-6 space-y-4">

              <StatusRow
                label="Connection"
                value="Connected"
              />

              <StatusRow
                label="Active Users"
                value="0"
              />

              <StatusRow
                label="CPU Load"
                value="0%"
              />

              <StatusRow
                label="Memory"
                value="0 MB"
              />

              <StatusRow
                label="Uptime"
                value="-"
              />

            </div>

          </section>

        </div>


        {/* Recent Transactions */}

        <section
          className="
            mt-6
            rounded-2xl
            border
            border-white/6
            bg-[#11110f]
          "
        >

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-white/6
              px-5
              py-5
            "
          >

            <div>

              <h2 className="font-bold">
                Transaksi Terbaru
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Aktivitas pembayaran pelanggan
              </p>

            </div>

            <button
              className="
                text-xs
                font-semibold
                text-[#b89b5e]
              "
            >
              Lihat Semua →
            </button>

          </div>


          <div className="p-5">

            <div
              className="
                flex
                min-h-32
                items-center
                justify-center
                rounded-xl
                bg-white/2
              "
            >

              <p className="text-xs text-white/30">
                Belum ada transaksi.
              </p>

            </div>

          </div>

        </section>


        {/* Quick Actions */}

        <section className="mt-6">

          <h2 className="text-sm font-bold">
            Quick Actions
          </h2>

          <div
            className="
              mt-4
              grid
              gap-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >

            <QuickAction
              title="Tambah Paket"
              description="Buat paket internet"
              href="/admin/packages"
              icon="+"
            />

            <QuickAction
              title="Tambah Pelanggan"
              description="Registrasikan pelanggan"
              href="/admin/customers"
              icon="♙"
            />

            <QuickAction
              title="Top Up"
              description="Kelola deposit"
              href="/admin/topup"
              icon="Rp"
            />

            <QuickAction
              title="MikroTik"
              description="Kelola jaringan"
              href="/admin/mikrotik"
              icon="⌁"
            />

          </div>

        </section>

      </div>

    </div>
  );
}


function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/6 pb-3">

      <span className="text-xs text-white/40">
        {label}
      </span>

      <span className="text-xs font-semibold text-[#f2f0ea]">
        {value}
      </span>

    </div>
  );
}


function QuickAction({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      className="
        group
        rounded-2xl
        border
        border-white/6
        bg-[#11110f]
        p-4
        transition
        hover:border-[#b89b5e]/20
        hover:bg-[#151511]
      "
    >

      <div className="flex items-center gap-3">

        <div
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            border
            border-[#b89b5e]/15
            bg-[#b89b5e]/5
            font-bold
            text-[#c8ad72]
          "
        >
          {icon}
        </div>

        <div>

          <p className="text-xs font-bold">
            {title}
          </p>

          <p className="mt-1 text-[10px] text-white/30">
            {description}
          </p>

        </div>

      </div>

    </a>
  );
}