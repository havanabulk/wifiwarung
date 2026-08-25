"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import CreateCustomerForm from "@/components/kasir/CreateCustomerForm";
import { formatRupiah } from "@/lib/format";

type CustomerRow = {
  id: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  wallets: { balance: number | string }[] | null;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
};

const PAGE_SIZE = 20;

export default function KasirConsole() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");

  const [activeSearch, setActiveSearch] = useState("");

  const [loadingList, setLoadingList] = useState(true);

  const [listError, setListError] = useState("");

  const [selected, setSelected] = useState<CustomerRow | null>(null);

  const [amount, setAmount] = useState("");

  const [depositLoading, setDepositLoading] = useState(false);

  const [depositMessage, setDepositMessage] = useState("");

  const [depositError, setDepositError] = useState("");

  const fetchCustomersPage = useCallback(async (page: number, q: string) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    if (q !== "") {
      params.set("q", q);
    }

    const response = await fetch(`/api/staff/customers?${params}`);
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        typeof result?.error === "string"
          ? result.error
          : "Gagal memuat daftar pelanggan.",
      );
    }

    return {
      customers: (result.customers ?? []) as CustomerRow[],
      pagination: (result.pagination ?? {
        page: 1,
        pageSize: PAGE_SIZE,
        total: 0,
      }) as PaginationInfo,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchCustomersPage(1, "");

        if (!cancelled) {
          setCustomers(data.customers);
          setPagination(data.pagination);
        }
      } catch (error) {
        if (!cancelled) {
          setListError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat daftar pelanggan.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchCustomersPage]);

  async function loadCustomers(page: number, q: string) {
    setLoadingList(true);
    setListError("");

    try {
      const data = await fetchCustomersPage(page, q);

      setCustomers(data.customers);
      setPagination(data.pagination);
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat memuat daftar pelanggan.",
      );
    } finally {
      setLoadingList(false);
    }
  }

  function refresh() {
    loadCustomers(pagination.page, activeSearch);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveSearch(searchTerm.trim());
    loadCustomers(1, searchTerm.trim());
  }

  function pickForTopUp(row: CustomerRow) {
    setSelected(row);
    setAmount("");
    setDepositMessage("");
    setDepositError("");
  }

  async function handleDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected || depositLoading) {
      return;
    }

    setDepositLoading(true);
    setDepositMessage("");
    setDepositError("");

    try {
      const response = await fetch("/api/staff/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selected.id,
          amount: Number(amount),
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setDepositError(
          typeof result?.error === "string"
            ? result.error
            : "Deposit gagal diproses.",
        );

        return;
      }

      const newBalance = Number(result.wallet?.balance ?? 0);

      setDepositMessage(
        `Deposit untuk ${selected.username} berhasil. Saldo sekarang ${formatRupiah(newBalance)}.`,
      );

      setSelected(null);
      setAmount("");
      refresh();
    } catch {
      setDepositError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setDepositLoading(false);
    }
  }

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / pagination.pageSize),
  );

  return (
    <div className="space-y-6">
      <CreateCustomerForm onCreated={() => refresh()} />

      <section className="rounded-2xl border border-white/6 bg-[#11110f] p-6">
        <h2 className="text-lg font-bold text-[#f2f0ea]">Daftar Pelanggan</h2>

        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari username / nama / no. WA"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#b89b5e]/60"
          />

          <button
            type="submit"
            className="h-11 rounded-xl border border-[#b89b5e]/40 px-5 text-sm font-semibold text-[#c8ad72] transition hover:bg-[#b89b5e]/10"
          >
            Cari
          </button>
        </form>

        {listError && <p className="mt-4 text-xs text-red-300">{listError}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 text-xs uppercase tracking-wider text-white/30">
                <th className="px-3 py-3 font-semibold">Username</th>
                <th className="px-3 py-3 font-semibold">Nama</th>
                <th className="px-3 py-3 font-semibold">Saldo</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loadingList ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-[#a7a39a]"
                  >
                    Memuat...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-[#a7a39a]"
                  >
                    Belum ada pelanggan.
                  </td>
                </tr>
              ) : (
                customers.map((row) => (
                  <tr key={row.id} className="text-[#f2f0ea]">
                    <td className="px-3 py-3 font-mono text-xs">
                      {row.username}
                    </td>

                    <td className="max-w-[180px] truncate px-3 py-3 text-xs text-[#a7a39a]">
                      {row.full_name ?? "-"}
                    </td>

                    <td className="px-3 py-3 font-semibold text-[#c8ad72]">
                      {formatRupiah(Number(row.wallets?.[0]?.balance ?? 0))}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          row.status === "active"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-red-500/10 text-red-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => pickForTopUp(row)}
                        className="rounded-lg border border-[#b89b5e]/40 px-3 py-1.5 text-xs font-semibold text-[#c8ad72] transition hover:bg-[#b89b5e]/10"
                      >
                        Top Up
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-xs text-[#a7a39a]">
            <span>
              Halaman {pagination.page} dari {totalPages} • {pagination.total}{" "}
              pelanggan
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loadingList}
                onClick={() => loadCustomers(pagination.page - 1, activeSearch)}
                className="rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/5 disabled:opacity-40"
              >
                ← Sebelumnya
              </button>

              <button
                type="button"
                disabled={pagination.page >= totalPages || loadingList}
                onClick={() => loadCustomers(pagination.page + 1, activeSearch)}
                className="rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/5 disabled:opacity-40"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </section>

      {selected && (
        <section className="rounded-2xl border border-[#b89b5e]/25 bg-[#11110f] p-6">
          <h2 className="text-lg font-bold text-[#f2f0ea]">
            Top Up Saldo —{" "}
            <span className="font-mono text-sm text-[#c8ad72]">
              {selected.username}
            </span>
          </h2>

          <p className="mt-1 text-sm text-[#a7a39a]">
            Saldo saat ini:{" "}
            {formatRupiah(Number(selected.wallets?.[0]?.balance ?? 0))}
          </p>

          {depositMessage && (
            <p className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200">
              {depositMessage}
            </p>
          )}

          {depositError && (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">
              {depositError}
            </p>
          )}

          <form onSubmit={handleDeposit} className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#d6d2c8]">
                Nominal Deposit *
              </span>

              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="10000"
                required
                min={1000}
                step={1}
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#b89b5e]/60 sm:max-w-xs"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={depositLoading}
                className="flex h-11 items-center justify-center rounded-xl bg-[#b89b5e] px-8 text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72] disabled:opacity-50"
              >
                {depositLoading ? "Memproses..." : "Setor"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setDepositError("");
                  setDepositMessage("");
                }}
                className="h-11 rounded-xl border border-white/10 px-5 text-sm text-white/60 transition hover:bg-white/5"
              >
                Batal
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
