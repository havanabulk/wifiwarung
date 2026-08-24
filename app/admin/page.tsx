import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/admin/StatCard";

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function startOfJakartaDayISO(): string {
  const shifted = new Date(Date.now() + JAKARTA_OFFSET_MS);

  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - JAKARTA_OFFSET_MS,
  ).toISOString();
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

type RecentTransaction = {
  id: number;
  type: string;
  amount: number | string;
  note: string | null;
  created_at: string;
  profiles?:
    | {
        username: string | null;
        full_name: string | null;
      }[]
    | null;
};

export default async function AdminPage() {
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

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const startOfDayISO = startOfJakartaDayISO();

  const [customersCount, transactionsToday, depositsToday, recentTransactions] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .neq("role", "admin"),

      supabase
        .from("wallet_transactions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .gte("created_at", startOfDayISO),

      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("type", "deposit")
        .gte("created_at", startOfDayISO),

      supabase
        .from("wallet_transactions")
        .select(
          `
        id,
        type,
        amount,
        note,
        created_at,
        profiles (
          username,
          full_name
        )
      `,
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(5),
    ]);

  const totalCustomers = customersCount.count ?? 0;

  const transactionsTodayCount = transactionsToday.count ?? 0;

  const revenueToday = (depositsToday.data ?? []).reduce(
    (total, row) => total + Number(row.amount ?? 0),
    0,
  );

  const recent = (recentTransactions.data ?? []) as RecentTransaction[];

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
                Pantau aktivitas WARUNG28 HOTSPOT.
              </p>
            </div>

            <div
              className="
                rounded-xl
                border
                border-white/6
                bg-white/2
                px-4
                py-3
              "
            >
              <p className="text-xs font-semibold">
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "full",
                  timeZone: "Asia/Jakarta",
                }).format(new Date())}
              </p>

              <p className="text-[10px] text-white/30">Waktu Indonesia Barat</p>
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
            value={String(totalCustomers)}
            description="Pelanggan terdaftar"
            icon="♙"
          />

          <StatCard
            label="Sedang Online"
            value="-"
            description="Menunggu integrasi MikroTik"
            icon="⌁"
            accent="blue"
          />

          <StatCard
            label="Transaksi Hari Ini"
            value={String(transactionsTodayCount)}
            description="Sejak 00:00 WIB"
            icon="▤"
            accent="green"
          />

          <StatCard
            label="Pendapatan Hari Ini"
            value={formatRupiah(revenueToday)}
            description="Total deposit masuk"
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
          {/* Recent Transactions */}

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
                <h2 className="font-bold">Transaksi Terbaru</h2>

                <p className="mt-1 text-xs text-white/30">
                  Aktivitas deposit pelanggan
                </p>
              </div>

              <Link
                href="/admin/customers"
                className="
                  text-xs
                  font-semibold
                  text-[#b89b5e]
                "
              >
                Lihat Semua →
              </Link>
            </div>

            <div className="p-5">
              {recent.length === 0 ? (
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
                  <p className="text-xs text-white/30">Belum ada transaksi.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {recent.map((tx) => {
                    const customerName =
                      tx.profiles?.[0]?.full_name ||
                      tx.profiles?.[0]?.username ||
                      "Tanpa nama";

                    return (
                      <li
                        key={tx.id}
                        className="
                          flex
                          items-center
                          justify-between
                          gap-4
                          py-3
                          first:pt-0
                          last:pb-0
                        "
                      >
                        <div
                          className="
                            min-w-0
                          "
                        >
                          <p
                            className="
                              truncate
                              text-sm
                              font-semibold
                            "
                          >
                            {customerName}
                          </p>

                          <p
                            className="
                              mt-0.5
                              truncate
                              text-[11px]
                              text-white/30
                            "
                          >
                            {tx.note || "Deposit"} •{" "}
                            {formatDateTime(tx.created_at)}
                          </p>
                        </div>

                        <span
                          className="
                            shrink-0
                            text-sm
                            font-bold
                            text-emerald-300
                          "
                        >
                          +{formatRupiah(Number(tx.amount))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Router */}

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
                <h2 className="font-bold">Router MikroTik</h2>

                <p className="mt-1 text-xs text-white/30">Status perangkat</p>
              </div>

              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>

            <div className="mt-6 space-y-4">
              <StatusRow label="Connection" value="Belum terhubung" />

              <StatusRow label="Active Users" value="-" />

              <StatusRow label="CPU Load" value="-" />

              <StatusRow label="Memory" value="-" />

              <StatusRow label="Uptime" value="-" />
            </div>

            <p
              className="
                mt-5
                rounded-xl
                border
                border-dashed
                border-white/10
                bg-white/2
                p-3
                text-[11px]
                leading-5
                text-white/30
              "
            >
              Integrasi MikroTik direncanakan pada milestone M2 (lihat
              docs/PRD.md).
            </p>
          </section>
        </div>

        {/* Quick Actions */}

        <section className="mt-6">
          <h2 className="text-sm font-bold">Quick Actions</h2>

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
              title="Deposit Pelanggan"
              description="Kelola saldo pelanggan"
              href="/admin/customers"
              icon="Rp"
            />

            <QuickAction
              title="Customer Service"
              description="Balas pertanyaan pelanggan"
              href="/admin/support"
              icon="◌"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/6 pb-3">
      <span className="text-xs text-white/40">{label}</span>

      <span className="text-xs font-semibold text-[#f2f0ea]">{value}</span>
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
    <Link
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
          <p className="text-xs font-bold">{title}</p>

          <p className="mt-1 text-[10px] text-white/30">{description}</p>
        </div>
      </div>
    </Link>
  );
}
