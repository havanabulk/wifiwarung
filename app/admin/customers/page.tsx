"use client";

import { useEffect, useState } from "react";

type PackageOrder = {
  id: number;
  package_id: number;
  price: number;
  status: string;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  packages?: {
    id: number;
    name: string;
    type: string;
  } | null;
};

type Wallet = {
  id: number;
  balance: number;
  updated_at: string;
};

type Customer = {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  status: string | null;
  created_at: string;
  wallets?: Wallet[];
  package_orders?: PackageOrder[];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Deposit
  const [depositCustomer, setDepositCustomer] =
    useState<Customer | null>(null);

  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/customers", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Gagal mengambil data pelanggan."
        );
      }

      setCustomers(result.customers ?? []);
    } catch (error) {
      console.error("LOAD CUSTOMERS ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil data pelanggan."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function formatRupiah(value: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(value: string | null) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
    }).format(date);
  }

  function getCustomerBalance(customer: Customer) {
    return Number(customer.wallets?.[0]?.balance ?? 0);
  }

  function getActiveOrder(customer: Customer) {
    if (!customer.package_orders) {
      return null;
    }

    const now = new Date();

    return (
      customer.package_orders.find((order) => {
        if (order.status !== "active") {
          return false;
        }

        if (!order.end_at) {
          return true;
        }

        return new Date(order.end_at) > now;
      }) ?? null
    );
  }

  function getStatusLabel(customer: Customer) {
    const status = customer.status?.toLowerCase();

    if (status === "inactive") {
      return {
        label: "Nonaktif",
        className:
          "border-red-500/20 bg-red-500/10 text-red-300",
      };
    }

    if (status === "pending") {
      return {
        label: "Pending",
        className:
          "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
      };
    }

    return {
      label: "Aktif",
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    };
  }

  async function handleDeposit() {
    if (!depositCustomer) {
      return;
    }

    const amount = Number(depositAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositError("Jumlah deposit harus lebih dari Rp0.");
      return;
    }

    if (amount < 1000) {
      setDepositError("Minimal deposit adalah Rp1.000.");
      return;
    }

    try {
      setDepositLoading(true);
      setDepositError("");

      const response = await fetch(
        "/api/admin/customers/deposit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: depositCustomer.id,
            amount,
            note: depositNote.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Deposit gagal.");
      }

      setDepositCustomer(null);
      setDepositAmount("");
      setDepositNote("");
      setDepositError("");

      await loadCustomers();
    } catch (error) {
      console.error("DEPOSIT ERROR:", error);

      setDepositError(
        error instanceof Error
          ? error.message
          : "Deposit gagal."
      );
    } finally {
      setDepositLoading(false);
    }
  }

  function closeDepositModal() {
    if (depositLoading) {
      return;
    }

    setDepositCustomer(null);
    setDepositAmount("");
    setDepositNote("");
    setDepositError("");
  }

  return (
    <main className="min-h-screen bg-[#090909] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c8a96b]">
            WARUNG28 HOTSPOT
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Pelanggan
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-white/50">
                Kelola pelanggan, saldo, paket aktif,
                dan status akun WARUNG28.
              </p>
            </div>

            <button
              type="button"
              onClick={loadCustomers}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Total Pelanggan
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {customers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Pelanggan Aktif
            </p>

            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {
                customers.filter(
                  (customer) =>
                    customer.status?.toLowerCase() !==
                    "inactive"
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Paket Aktif
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#d8bd82]">
              {
                customers.filter(
                  (customer) =>
                    getActiveOrder(customer) !== null
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Total Saldo
            </p>

            <p className="mt-2 text-xl font-semibold text-[#d8bd82]">
              {formatRupiah(
                customers.reduce(
                  (total, customer) =>
                    total + getCustomerBalance(customer),
                  0
                )
              )}
            </p>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <p className="font-medium">
              Gagal memuat pelanggan
            </p>

            <p className="mt-1 text-red-300/80">
              {error}
            </p>
          </div>
        )}

        {/* TABLE */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#c8a96b]" />

            <p className="mt-4 text-sm text-white/50">
              Memuat data pelanggan...
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                    <th className="px-5 py-4">
                      Pelanggan
                    </th>

                    <th className="px-5 py-4">
                      Kontak
                    </th>

                    <th className="px-5 py-4">
                      Saldo
                    </th>

                    <th className="px-5 py-4">
                      Paket Aktif
                    </th>

                    <th className="px-5 py-4">
                      Expired
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => {
                    const activeOrder =
                      getActiveOrder(customer);

                    const status =
                      getStatusLabel(customer);

                    const balance =
                      getCustomerBalance(customer);

                    return (
                      <tr
                        key={customer.id}
                        className="border-b border-white/5 transition hover:bg-white/5"
                      >
                        {/* CUSTOMER */}
                        <td className="px-5 py-5">
                          <div className="font-medium">
                            {customer.full_name ||
                              customer.username ||
                              "Tanpa nama"}
                          </div>

                          <div className="mt-1 text-xs text-white/40">
                            @{customer.username || "-"}
                          </div>
                        </td>

                        {/* CONTACT */}
                        <td className="px-5 py-5">
                          <div className="text-sm text-white/70">
                            {customer.phone || "-"}
                          </div>

                          <div className="mt-1 text-xs text-white/30">
                            {customer.role || "customer"}
                          </div>
                        </td>

                        {/* BALANCE */}
                        <td className="px-5 py-5">
                          <div className="font-semibold text-[#d8bd82]">
                            {formatRupiah(balance)}
                          </div>
                        </td>

                        {/* PACKAGE */}
                        <td className="px-5 py-5">
                          {activeOrder ? (
                            <div>
                              <div className="font-medium">
                                {activeOrder.packages?.name ||
                                  "Paket"}
                              </div>

                              <div className="mt-1 text-xs capitalize text-white/40">
                                {activeOrder.packages?.type ||
                                  "-"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-white/30">
                              Belum ada paket
                            </span>
                          )}
                        </td>

                        {/* EXPIRED */}
                        <td className="px-5 py-5">
                          <span className="text-sm text-white/60">
                            {formatDate(
                              activeOrder?.end_at ?? null
                            )}
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        {/* ACTION */}
                        <td className="px-5 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setDepositCustomer(customer);
                              setDepositAmount("");
                              setDepositNote("");
                              setDepositError("");
                            }}
                            className="rounded-xl border border-[#c8a96b]/30 bg-[#c8a96b]/10 px-4 py-2 text-sm font-medium text-[#d8bd82] transition hover:bg-[#c8a96b]/20"
                          >
                            Deposit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* EMPTY */}
            {customers.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-3xl">👤</div>

                <h3 className="mt-4 font-medium">
                  Belum ada pelanggan
                </h3>

                <p className="mt-1 text-sm text-white/40">
                  Pelanggan yang terdaftar akan
                  muncul di sini.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DEPOSIT MODAL */}
      {depositCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !depositLoading
            ) {
              closeDepositModal();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-2xl">
            {/* MODAL HEADER */}
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c8a96b]">
                WARUNG28 HOTSPOT
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Tambah Saldo
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Isi saldo pelanggan secara manual.
              </p>
            </div>

            <div className="p-6">
              {/* CUSTOMER INFO */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {depositCustomer.full_name ||
                        depositCustomer.username ||
                        "Tanpa nama"}
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      {depositCustomer.phone || "-"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-white/40">
                      Saldo saat ini
                    </p>

                    <p className="mt-1 font-semibold text-[#d8bd82]">
                      {formatRupiah(
                        getCustomerBalance(
                          depositCustomer
                        )
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* FORM */}
              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="deposit-amount"
                    className="mb-2 block text-sm text-white/60"
                  >
                    Jumlah Deposit
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/30">
                      Rp
                    </span>

                    <input
                      id="deposit-amount"
                      type="number"
                      min="1000"
                      step="1000"
                      value={depositAmount}
                      onChange={(event) =>
                        setDepositAmount(
                          event.target.value
                        )
                      }
                      placeholder="50000"
                      disabled={depositLoading}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-white/20 focus:border-[#c8a96b]/50 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="deposit-note"
                    className="mb-2 block text-sm text-white/60"
                  >
                    Catatan
                  </label>

                  <input
                    id="deposit-note"
                    type="text"
                    value={depositNote}
                    onChange={(event) =>
                      setDepositNote(
                        event.target.value
                      )
                    }
                    placeholder="Contoh: Deposit tunai"
                    disabled={depositLoading}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/20 focus:border-[#c8a96b]/50 disabled:opacity-50"
                  />
                </div>

                {/* PREVIEW */}
                {Number(depositAmount) > 0 && (
                  <div className="rounded-2xl border border-[#c8a96b]/20 bg-[#c8a96b]/5 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40">
                        Saldo sekarang
                      </span>

                      <span className="text-white/70">
                        {formatRupiah(
                          getCustomerBalance(
                            depositCustomer
                          )
                        )}
                      </span>
                    </div>

                    <div className="my-3 h-px bg-white/10" />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40">
                        Deposit
                      </span>

                      <span className="text-[#d8bd82]">
                        +{" "}
                        {formatRupiah(
                          Number(depositAmount)
                        )}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-medium">
                        Saldo setelah deposit
                      </span>

                      <span className="text-lg font-semibold text-[#d8bd82]">
                        {formatRupiah(
                          getCustomerBalance(
                            depositCustomer
                          ) +
                            Number(depositAmount)
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* ERROR */}
                {depositError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                    {depositError}
                  </div>
                )}
              </div>

              {/* BUTTONS */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeDepositModal}
                  disabled={depositLoading}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={
                    depositLoading ||
                    Number(depositAmount) <= 0
                  }
                  className="flex-1 rounded-xl bg-[#c8a96b] px-4 py-3 text-sm font-semibold text-[#090909] transition hover:bg-[#d8bd82] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {depositLoading
                    ? "Memproses..."
                    : "Tambah Saldo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}