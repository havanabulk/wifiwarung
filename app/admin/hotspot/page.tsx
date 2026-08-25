"use client";

import { useEffect, useState } from "react";

type HotspotUser = {
  id: string;
  username: string;
  pin: string;
  active: boolean;
  locked: boolean;
  user_id: string | null;
  label: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
  } | null;
  package_orders?: {
    id: number;
    end_at: string | null;
    packages?: {
      name: string;
    } | null;
  }[];
};

type HotspotSummary = {
  total: number;
  active: number;
  used: number;
  available: number;
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  total: number;
};

const PAGE_SIZE = 50;

export default function HotspotPage() {
  const [hotspotUsers, setHotspotUsers] = useState<HotspotUser[]>([]);
  const [summary, setSummary] = useState<HotspotSummary>({
    total: 0,
    active: 0,
    used: 0,
    available: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "used" | "available">(
    "all",
  );
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  const [generateCount, setGenerateCount] = useState(10);
  const [generateLabel, setGenerateLabel] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function fetchHotspotUsers(page: number): Promise<{
    hotspot_users: HotspotUser[];
    summary: HotspotSummary;
    pagination: PaginationInfo;
  }> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(PAGE_SIZE),
    });

    const response = await fetch(`/api/admin/hotspot?${params.toString()}`, {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Gagal mengambil data hotspot.");
    }

    return {
      hotspot_users: result.hotspot_users ?? [],
      summary: result.summary ?? {
        total: 0,
        active: 0,
        used: 0,
        available: 0,
      },
      pagination: result.pagination ?? {
        page,
        pageSize: PAGE_SIZE,
        total: 0,
      },
    };
  }

  async function loadHotspotUsers(page?: number) {
    try {
      setLoading(true);
      setError("");

      const data = await fetchHotspotUsers(page ?? pagination.page);

      setHotspotUsers(data.hotspot_users);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (err) {
      console.error("LOAD HOTSPOT ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengambil data hotspot.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchHotspotUsers(1);

        if (!cancelled) {
          setHotspotUsers(data.hotspot_users);
          setSummary(data.summary);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error("LOAD HOTSPOT ERROR:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat mengambil data hotspot.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  function togglePinVisibility(username: string) {
    setVisiblePins((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  }

  async function handleGenerate() {
    const count = Number(generateCount);

    if (!Number.isFinite(count) || count < 1 || count > 100) {
      setGenerateMessage({
        type: "error",
        text: "Jumlah harus antara 1 sampai 100.",
      });
      return;
    }

    try {
      setGenerateLoading(true);
      setGenerateMessage(null);

      const response = await fetch("/api/admin/hotspot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count,
          label: generateLabel.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal generate hotspot.");
      }

      setGenerateMessage({
        type: "success",
        text: `Berhasil generate ${count} akun hotspot.`,
      });

      setGenerateCount(10);
      setGenerateLabel("");

      await loadHotspotUsers(1);
    } catch (err) {
      console.error("GENERATE HOTSPOT ERROR:", err);

      setGenerateMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal generate hotspot.",
      });
    } finally {
      setGenerateLoading(false);
    }
  }

  async function handleToggleLock(hotspot: HotspotUser) {
    try {
      const response = await fetch(`/api/admin/hotspot/${hotspot.id}/lock`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locked: !hotspot.locked }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengubah status lock.");
      }

      await loadHotspotUsers();
    } catch (err) {
      console.error("TOGGLE LOCK ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengubah status lock.",
      );
    }
  }

  function getActiveOrder(hotspot: HotspotUser) {
    if (!hotspot.package_orders || hotspot.package_orders.length === 0) {
      return null;
    }

    const now = new Date();

    return (
      hotspot.package_orders.find((order) => {
        if (!order.end_at) {
          return true;
        }

        return new Date(order.end_at) > now;
      }) ?? null
    );
  }

  const filteredUsers = hotspotUsers.filter((hotspot) => {
    if (search) {
      const query = search.toLowerCase();
      if (!hotspot.username.toLowerCase().includes(query)) {
        return false;
      }
    }

    if (filter === "active") {
      return hotspot.active;
    }

    if (filter === "used") {
      return hotspot.user_id !== null;
    }

    if (filter === "available") {
      return hotspot.active && hotspot.user_id === null;
    }

    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.total / pagination.pageSize),
  );

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
                Hotspot Login
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-white/50">
                Kelola credential login hotspot (4 digit username + 3 digit
                pin).
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadHotspotUsers()}
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
              Total Akun
            </p>

            <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Aktif
            </p>

            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {summary.active}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Terpakai
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#d8bd82]">
              {summary.used}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Tersedia
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#d8bd82]">
              {summary.available}
            </p>
          </div>
        </div>

        {/* GENERATE BATCH */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Generate Batch</h2>

          <p className="mt-1 text-sm text-white/40">
            Buat akun hotspot baru secara massal.
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="sm:w-40">
              <label
                htmlFor="generate-count"
                className="mb-2 block text-sm text-white/60"
              >
                Jumlah (1–100)
              </label>

              <input
                id="generate-count"
                type="number"
                min={1}
                max={100}
                value={generateCount}
                onChange={(event) =>
                  setGenerateCount(Number(event.target.value))
                }
                disabled={generateLoading}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/20 focus:border-[#c8a96b]/50 disabled:opacity-50"
              />
            </div>

            <div className="flex-1">
              <label
                htmlFor="generate-label"
                className="mb-2 block text-sm text-white/60"
              >
                Label (opsional)
              </label>

              <input
                id="generate-label"
                type="text"
                value={generateLabel}
                onChange={(event) => setGenerateLabel(event.target.value)}
                placeholder="Contoh: Batch 1, Gym, dll."
                disabled={generateLoading}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/20 focus:border-[#c8a96b]/50 disabled:opacity-50"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateLoading}
              className="rounded-xl bg-[#c8a96b] px-6 py-3 text-sm font-semibold text-[#090909] transition hover:bg-[#d8bd82] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {generateLoading ? "Generating..." : "Generate Batch"}
            </button>
          </div>

          {generateMessage && (
            <div
              className={`mt-4 rounded-xl border p-3 text-sm ${
                generateMessage.type === "success"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              {generateMessage.text}
            </div>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <p className="font-medium">Gagal memuat data hotspot</p>

            <p className="mt-1 text-red-300/80">{error}</p>
          </div>
        )}

        {/* SEARCH & FILTER */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari username..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#c8a96b]/50"
            />
          </div>

          <div className="flex gap-2">
            {(
              [
                { value: "all", label: "Semua" },
                { value: "active", label: "Aktif" },
                { value: "used", label: "Terpakai" },
                { value: "available", label: "Tersedia" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-lg border px-3 py-2 text-xs transition ${
                  filter === option.value
                    ? "border-[#c8a96b]/30 bg-[#c8a96b]/10 text-[#d8bd82]"
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#c8a96b]" />

            <p className="mt-4 text-sm text-white/50">Memuat data hotspot...</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                    <th className="px-5 py-4">Username</th>

                    <th className="px-5 py-4">PIN</th>

                    <th className="px-5 py-4">Status</th>

                    <th className="px-5 py-4">Locked</th>

                    <th className="px-5 py-4">Pelanggan</th>

                    <th className="px-5 py-4">Paket</th>

                    <th className="px-5 py-4">Expired</th>

                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((hotspot) => {
                    const activeOrder = getActiveOrder(hotspot);

                    return (
                      <tr
                        key={hotspot.id}
                        className="border-b border-white/5 transition hover:bg-white/5"
                      >
                        {/* USERNAME */}
                        <td className="px-5 py-5">
                          <div className="font-mono text-lg font-bold tracking-wider">
                            {hotspot.username}
                          </div>

                          {hotspot.label && (
                            <div className="mt-1 text-xs text-white/40">
                              {hotspot.label}
                            </div>
                          )}
                        </td>

                        {/* PIN */}
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base tracking-widest">
                              {visiblePins[hotspot.username]
                                ? hotspot.pin
                                : "•••"}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                togglePinVisibility(hotspot.username)
                              }
                              className="text-xs text-white/30 transition hover:text-white/60"
                            >
                              {visiblePins[hotspot.username] ? "Hide" : "Show"}
                            </button>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                              hotspot.active
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : "border-red-500/20 bg-red-500/10 text-red-300"
                            }`}
                          >
                            {hotspot.active ? "Aktif" : "Tidak Aktif"}
                          </span>
                        </td>

                        {/* LOCKED */}
                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                              hotspot.locked
                                ? "border-red-500/20 bg-red-500/10 text-red-300"
                                : "border-white/10 bg-white/5 text-white/50"
                            }`}
                          >
                            {hotspot.locked ? "Ya" : "Tidak"}
                          </span>
                        </td>

                        {/* PELANGGAN */}
                        <td className="px-5 py-5">
                          <div className="text-sm text-white/70">
                            {hotspot.user?.full_name || "-"}
                          </div>
                        </td>

                        {/* PAKET */}
                        <td className="px-5 py-5">
                          {activeOrder ? (
                            <div className="text-sm">
                              {activeOrder.packages?.name || "Paket"}
                            </div>
                          ) : (
                            <span className="text-sm text-white/30">-</span>
                          )}
                        </td>

                        {/* EXPIRED */}
                        <td className="px-5 py-5">
                          <span className="text-sm text-white/60">
                            {formatDate(activeOrder?.end_at ?? null)}
                          </span>
                        </td>

                        {/* ACTION */}
                        <td className="px-5 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleLock(hotspot)}
                            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                              hotspot.locked
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                : "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                            }`}
                          >
                            {hotspot.locked ? "Unlock" : "Lock"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* EMPTY */}
            {filteredUsers.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-3xl">📡</div>

                <h3 className="mt-4 font-medium">Belum ada akun hotspot</h3>

                <p className="mt-1 text-sm text-white/40">
                  {search || filter !== "all"
                    ? "Tidak ada akun yang cocok dengan filter."
                    : "Buat akun hotspot baru menggunakan form di atas."}
                </p>
              </div>
            )}

            {/* PAGINATION */}
            {pagination.total > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:flex-row">
                <p className="text-xs text-white/40">
                  Menampilkan {(pagination.page - 1) * pagination.pageSize + 1}–
                  {(pagination.page - 1) * pagination.pageSize +
                    filteredUsers.length}{" "}
                  dari {pagination.total} akun
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => loadHotspotUsers(pagination.page - 1)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ← Sebelumnya
                  </button>

                  <span className="px-2 text-xs text-white/50">
                    Halaman {pagination.page} dari {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={pagination.page >= totalPages || loading}
                    onClick={() => loadHotspotUsers(pagination.page + 1)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
