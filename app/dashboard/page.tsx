import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/LogoutButton";

const TRANSACTIONS_PAGE_SIZE = 10;

type TransactionRow = {
  id: number | string;
  type: string;
  amount: number | string;
  note: string | null;
  created_at: string;
};

function formatDateTimeWIB(value: string) {
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

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTransactionLabel(type: string) {
  const normalized = type.toLowerCase();

  if (normalized === "deposit") {
    return "Deposit";
  }

  return (
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1)
  );
}

type SearchParams = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: SearchParams) {
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

  if (!profile) {
    redirect("/login");
  }

  const { data: wallet } =
    await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

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

  const resolvedSearchParams =
    await searchParams;

  const rawPage = Number(
    resolvedSearchParams.page
  );

  const page =
    Number.isInteger(rawPage) && rawPage > 0
      ? rawPage
      : 1;

  const rangeFrom =
    (page - 1) * TRANSACTIONS_PAGE_SIZE;

  const rangeTo =
    rangeFrom + TRANSACTIONS_PAGE_SIZE - 1;

  const { data: transactions, count } =
    await supabase
      .from("wallet_transactions")
      .select(
        `
        id,
        type,
        amount,
        note,
        created_at
      `,
        {
          count: "exact",
        }
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .range(rangeFrom, rangeTo);

  const totalTransactions = count ?? 0;

  const transactionRows =
    (transactions ??
      []) as TransactionRow[];

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalTransactions /
        TRANSACTIONS_PAGE_SIZE
    )
  );

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
              wallet?.balance ?? 0
            ).toLocaleString("id-ID")}
          </h2>

          <Link
            href="/contact"
            className="
              mt-6
              inline-block
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
          </Link>

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


        {/* TRANSACTIONS */}

        <section className="mt-10">

          <h2
            className="
              text-xl
              font-bold
              text-[#f2f0ea]
            "
          >
            Riwayat Transaksi
          </h2>

          <p
            className="
              mt-2
              text-sm
              text-[#a7a39a]
            "
          >
            Semua deposit dan pembelian paket
            pada akun Anda.
          </p>

          <div
            className="
              mt-5
              overflow-hidden
              rounded-2xl
              border
              border-white/6
              bg-[#11110f]
            "
          >

            {transactionRows.length === 0 ? (

              <div className="p-8 text-center">
                <p className="text-sm text-[#a7a39a]">
                  Belum ada transaksi.
                </p>
              </div>

            ) : (

              <ul className="divide-y divide-white/5">

                {transactionRows.map(
                  (tx) => {

                    const isCredit =
                      tx.type.toLowerCase() ===
                      "deposit";

                    return (

                      <li
                        key={String(tx.id)}
                        className="
                          flex
                          items-center
                          justify-between
                          gap-4
                          px-6
                          py-4
                        "
                      >
                        <div className="min-w-0">

                          <p
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-[#f2f0ea]
                            "
                          >
                            {getTransactionLabel(
                              tx.type
                            )}
                          </p>

                          <p
                            className="
                              mt-0.5
                              truncate
                              text-xs
                              text-[#a7a39a]
                            "
                          >
                            {tx.note ??
                              "-"}{" "}
                            •{" "}
                            {formatDateTimeWIB(
                              tx.created_at
                            )}
                          </p>

                        </div>

                        <span
                          className={`
                            shrink-0
                            text-sm
                            font-black
                            ${
                              isCredit
                                ? "text-emerald-300"
                                : "text-red-300"
                            }
                          `}
                        >
                          {isCredit ? "+" : "−"}
                          {formatRupiah(
                            Number(tx.amount)
                          )}
                        </span>

                      </li>

                    );

                  }
                )}

              </ul>

            )}

            {totalPages > 1 && (

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  border-t
                  border-white/6
                  px-6
                  py-4
                "
              >
                <p
                  className="
                    text-xs
                    text-[#a7a39a]
                  "
                >
                  Halaman {page} dari{" "}
                  {totalPages} •{" "}
                  {totalTransactions}{" "}
                  transaksi
                </p>

                <div className="flex items-center gap-2">
                  {page > 1 ? (

                    <Link
                      href={`/dashboard?page=${page - 1}`}
                      className="
                        rounded-lg
                        border
                        border-white/10
                        px-3
                        py-2
                        text-xs
                        text-white/60
                        transition
                        hover:bg-white/5
                      "
                    >
                      ← Sebelumnya
                    </Link>

                  ) : (

                    <span
                      className="
                        rounded-lg
                        border
                        border-white/10
                        px-3
                        py-2
                        text-xs
                        text-white/20
                      "
                    >
                      ← Sebelumnya
                    </span>

                  )}

                  {page < totalPages ? (

                    <Link
                      href={`/dashboard?page=${page + 1}`}
                      className="
                        rounded-lg
                        border
                        border-white/10
                        px-3
                        py-2
                        text-xs
                        text-white/60
                        transition
                        hover:bg-white/5
                      "
                    >
                      Berikutnya →
                    </Link>

                  ) : (

                    <span
                      className="
                        rounded-lg
                        border
                        border-white/10
                        px-3
                        py-2
                        text-xs
                        text-white/20
                      "
                    >
                      Berikutnya →
                    </span>

                  )}

                </div>

              </div>

            )}

          </div>

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