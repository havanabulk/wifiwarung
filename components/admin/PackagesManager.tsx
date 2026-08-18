"use client";

import { useEffect, useMemo, useState } from "react";

type PackageType =
  | "hourly"
  | "night"
  | "daily"
  | "weekly"
  | "monthly"
  | "quota";

type PackageItem = {
  id: number;
  name: string;
  type: PackageType;
  duration_minutes: number | null;
  quota_mb: number | null;
  speed_down_mbps: number | null;
  speed_up_mbps: number | null;
  price: number;
  start_time: string | null;
  end_time: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  initialPackages?: PackageItem[];
};

const PACKAGE_TYPES: {
  value: PackageType;
  label: string;
  description: string;
}[] = [
  {
    value: "hourly",
    label: "Per Jam",
    description: "Akses berdasarkan jumlah jam.",
  },
  {
    value: "night",
    label: "Paket Malam",
    description: "Akses khusus pada jam malam.",
  },
  {
    value: "daily",
    label: "Harian",
    description: "Akses selama 24 jam.",
  },
  {
    value: "weekly",
    label: "Mingguan",
    description: "Akses selama 7 hari.",
  },
  {
    value: "monthly",
    label: "Bulanan",
    description: "Akses selama 30 hari.",
  },
  {
    value: "quota",
    label: "Kuota",
    description: "Akses berdasarkan jumlah kuota.",
  },
];

const defaultForm = {
  name: "",
  type: "hourly" as PackageType,
  hours: 1,
  quota: 1,
  quotaUnit: "GB" as "MB" | "GB",
  speedDown: 10,
  speedUp: 5,
  price: 0,
  startTime: "22:00",
  endTime: "06:00",
  active: true,
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "-";

  if (minutes % 60 === 0) {
    const hours = minutes / 60;

    return `${hours} ${hours === 1 ? "Jam" : "Jam"}`;
  }

  return `${minutes} Menit`;
}

function formatQuota(mb: number | null) {
  if (!mb) return "-";

  if (mb >= 1024 && mb % 1024 === 0) {
    return `${mb / 1024} GB`;
  }

  return `${mb} MB`;
}

function getTypeLabel(type: PackageType) {
  return (
    PACKAGE_TYPES.find((item) => item.value === type)?.label ??
    type
  );
}

function getTypeIcon(type: PackageType) {
  switch (type) {
    case "hourly":
      return "◷";

    case "night":
      return "☾";

    case "daily":
      return "◉";

    case "weekly":
      return "◫";

    case "monthly":
      return "◇";

    case "quota":
      return "◈";

    default:
      return "•";
  }
}

export default function PackagesManager({
  initialPackages = [],
}: Props) {
  const [packages, setPackages] =
    useState<PackageItem[]>(initialPackages);

  const [loading, setLoading] = useState(
    initialPackages.length === 0
  );

  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [form, setForm] =
    useState(defaultForm);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  const itemsPerPage = 4;

  /*
   * ============================
   * LOAD PACKAGES
   * ============================
   */

  async function loadPackages() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/packages",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal mengambil data paket."
        );
      }

      setPackages(result.packages ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data paket."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialPackages.length === 0) {
      loadPackages();
    }
  }, []);

  /*
   * ============================
   * PAGINATION
   * ============================
   */

  const totalPages = Math.max(
    1,
    Math.ceil(
      packages.length / itemsPerPage
    )
  );

  const visiblePackages = useMemo(() => {
    const start =
      (currentPage - 1) *
      itemsPerPage;

    return packages.slice(
      start,
      start + itemsPerPage
    );
  }, [packages, currentPage]);

  useEffect(() => {
    if (
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /*
   * ============================
   * FORM
   * ============================
   */

  function resetForm() {
    setForm(defaultForm);
    setEditingId(null);
  }

  function openCreateForm() {
    resetForm();
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function openEditForm(item: PackageItem) {
    setEditingId(item.id);

    let hours = 1;

    if (
      item.duration_minutes
    ) {
      hours =
        item.duration_minutes / 60;
    }

    let quota = 1;
    let quotaUnit: "MB" | "GB" =
      "GB";

    if (item.quota_mb) {
      if (
        item.quota_mb >= 1024 &&
        item.quota_mb % 1024 === 0
      ) {
        quota =
          item.quota_mb / 1024;
        quotaUnit = "GB";
      } else {
        quota =
          item.quota_mb;
        quotaUnit = "MB";
      }
    }

    setForm({
      name: item.name,
      type: item.type,
      hours,
      quota,
      quotaUnit,
      speedDown:
        item.speed_down_mbps ?? 10,
      speedUp:
        item.speed_up_mbps ?? 5,
      price: item.price,
      startTime:
        item.start_time?.slice(
          0,
          5
        ) ?? "22:00",
      endTime:
        item.end_time?.slice(
          0,
          5
        ) ?? "06:00",
      active: item.active,
    });

    setMessage("");
    setError("");
    setShowForm(true);
  }

  function handleTypeChange(
    type: PackageType
  ) {
    let name = form.name;

    if (type === "daily") {
      name = "Paket Harian";
    }

    if (type === "weekly") {
      name = "Paket Mingguan";
    }

    if (type === "monthly") {
      name = "Paket Bulanan";
    }

    if (type === "night") {
      name = "Paket Malam";
    }

    if (type === "hourly") {
      name =
        form.hours === 1
          ? "1 Jam"
          : `${form.hours} Jam`;
    }

    if (type === "quota") {
      name = `${form.quota} ${form.quotaUnit}`;
    }

    setForm((previous) => ({
      ...previous,
      type,
      name,
    }));
  }

  function handleHoursChange(
    hours: number
  ) {
    setForm((previous) => ({
      ...previous,
      hours,
      name: `${hours} Jam`,
    }));
  }

  function handleQuotaChange(
    quota: number
  ) {
    setForm((previous) => ({
      ...previous,
      quota,
      name: `${quota} ${previous.quotaUnit}`,
    }));
  }

  function handleQuotaUnitChange(
    unit: "MB" | "GB"
  ) {
    setForm((previous) => ({
      ...previous,
      quotaUnit: unit,
      name: `${previous.quota} ${unit}`,
    }));
  }

  /*
   * ============================
   * SAVE
   * ============================
   */

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      let durationMinutes:
        | number
        | null = null;

      let quotaMb:
        | number
        | null = null;

      let startTime:
        | string
        | null = null;

      let endTime:
        | string
        | null = null;

      /*
       * PER JAM
       */

      if (form.type === "hourly") {
        durationMinutes =
          Number(form.hours) * 60;
      }

      /*
       * HARIAN
       */

      if (form.type === "daily") {
        durationMinutes =
          24 * 60;
      }

      /*
       * MINGGUAN
       */

      if (form.type === "weekly") {
        durationMinutes =
          7 * 24 * 60;
      }

      /*
       * BULANAN
       */

      if (form.type === "monthly") {
        durationMinutes =
          30 * 24 * 60;
      }

      /*
       * PAKET MALAM
       */

      if (form.type === "night") {
        startTime =
          form.startTime;

        endTime =
          form.endTime;
      }

      /*
       * KUOTA
       */

      if (form.type === "quota") {
        quotaMb =
          form.quotaUnit === "GB"
            ? Number(form.quota) *
              1024
            : Number(form.quota);
      }

      const payload = {
        name:
          form.name.trim() ||
          "Paket Internet",

        type: form.type,

        duration_minutes:
          durationMinutes,

        quota_mb:
          quotaMb,

        speed_down_mbps:
          Number(
            form.speedDown
          ),

        speed_up_mbps:
          Number(
            form.speedUp
          ),

        price:
          Number(form.price),

        start_time:
          startTime,

        end_time:
          endTime,

        active:
          form.active,
      };

      const url = editingId
        ? `/api/admin/packages/${editingId}`
        : "/api/admin/packages";

      const method = editingId
        ? "PUT"
        : "POST";

      const response =
        await fetch(url, {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        });

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal menyimpan paket."
        );
      }

      setMessage(
        editingId
          ? "Paket berhasil diperbarui."
          : "Paket berhasil ditambahkan."
      );

      setShowForm(false);

      resetForm();

      await loadPackages();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan paket."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================
   * TOGGLE ACTIVE
   * ============================
   */

  async function toggleActive(
    item: PackageItem
  ) {
    try {
      setError("");
      setMessage("");

      const response =
        await fetch(
          `/api/admin/packages/${item.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              ...item,
              active:
                !item.active,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal mengubah status paket."
        );
      }

      setMessage(
        !item.active
          ? "Paket diaktifkan."
          : "Paket dinonaktifkan."
      );

      await loadPackages();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengubah status paket."
      );
    }
  }

  /*
   * ============================
   * RENDER
   * ============================
   */

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-amber-300/70">
            WARUNG28 HOTSPOT
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Manajemen Paket
          </h1>

          <p className="mt-1 text-sm text-white/45">
            Atur paket internet,
            harga, kuota dan
            kecepatan pelanggan.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/15"
        >
          + Tambah Paket
        </button>
      </div>

      {/* ALERT */}

      {message && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* PACKAGE CARDS */}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-2xl border border-white/6 bg-white/2"
              />
            )
          )}
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 p-12 text-center">
          <div className="text-4xl text-amber-200/50">
            ◈
          </div>

          <h3 className="mt-4 font-medium text-white">
            Belum ada paket
          </h3>

          <p className="mt-1 text-sm text-white/40">
            Tambahkan paket internet
            pertama WARUNG28.
          </p>
        </div>
      ) : (
        <>
          <div
            key={currentPage}
            className="grid animate-[fadeIn_350ms_ease-out] gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            {visiblePackages.map(
              (item) => (
                <PackageCard
                  key={item.id}
                  item={item}
                  onEdit={() =>
                    openEditForm(item)
                  }
                  onToggle={() =>
                    toggleActive(item)
                  }
                />
              )
            )}
          </div>

          {/* PAGINATION */}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">

              <button
                type="button"
                disabled={
                  currentPage === 1
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.max(
                        1,
                        page - 1
                      )
                  )
                }
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ←
              </button>

              {Array.from(
                {
                  length: totalPages,
                },
                (_, index) =>
                  index + 1
              ).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      page
                    )
                  }
                  className={`h-9 min-w-9 rounded-lg px-3 text-sm transition ${
                    currentPage ===
                    page
                      ? "bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/25"
                      : "text-white/50 hover:bg-white/5"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={
                  currentPage ===
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.min(
                        totalPages,
                        page + 1
                      )
                  )
                }
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
              >
                →
              </button>

            </div>
          )}
        </>
      )}

      {/* MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#10100f] shadow-2xl">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/6 bg-[#10100f]/95 px-6 py-5 backdrop-blur">

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-300/60">
                  WARUNG28
                </p>

                <h2 className="mt-1 text-xl font-semibold text-white">
                  {editingId
                    ? "Edit Paket"
                    : "Tambah Paket"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="rounded-lg px-3 py-2 text-white/50 hover:bg-white/5 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >

              {/* TYPE */}

              <div>
                <label className="mb-2 block text-sm text-white/65">
                  Jenis Paket
                </label>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">

                  {PACKAGE_TYPES.map(
                    (item) => (
                      <button
                        key={
                          item.value
                        }
                        type="button"
                        onClick={() =>
                          handleTypeChange(
                            item.value
                          )
                        }
                        className={`rounded-xl border p-3 text-left transition ${
                          form.type ===
                          item.value
                            ? "border-amber-300/30 bg-amber-300/10"
                            : "border-white/8 bg-white/2 hover:bg-white/5"
                        }`}
                      >
                        <div className="text-lg text-amber-200">
                          {getTypeIcon(
                            item.value
                          )}
                        </div>

                        <div className="mt-1 text-sm font-medium text-white">
                          {item.label}
                        </div>

                        <div className="mt-1 text-[11px] leading-4 text-white/35">
                          {
                            item.description
                          }
                        </div>
                      </button>
                    )
                  )}

                </div>
              </div>

              {/* NAME */}

              <div>
                <label className="mb-2 block text-sm text-white/65">
                  Nama Paket
                </label>

                <input
                  value={
                    form.name
                  }
                  onChange={(event) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        name:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-300/30"
                  placeholder="Contoh: 3 Jam"
                />
              </div>

              {/* HOURLY */}

              {form.type ===
                "hourly" && (
                <div>
                  <label className="mb-2 block text-sm text-white/65">
                    Durasi
                  </label>

                  <div className="flex items-center gap-3">

                    <input
                      type="number"
                      min={1}
                      value={
                        form.hours
                      }
                      onChange={(
                        event
                      ) =>
                        handleHoursChange(
                          Number(
                            event
                              .target
                              .value
                          )
                        )
                      }
                      className="w-28 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-300/30"
                    />

                    <span className="text-sm text-white/50">
                      Jam
                    </span>

                  </div>
                </div>
              )}

              {/* NIGHT */}

              {form.type ===
                "night" && (
                <div className="grid gap-4 sm:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm text-white/65">
                      Mulai
                    </label>

                    <input
                      type="time"
                      value={
                        form.startTime
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            startTime:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-300/30"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/65">
                      Selesai
                    </label>

                    <input
                      type="time"
                      value={
                        form.endTime
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            endTime:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-300/30"
                    />
                  </div>

                </div>
              )}

              {/* QUOTA */}

              {form.type ===
                "quota" && (
                <div>
                  <label className="mb-2 block text-sm text-white/65">
                    Kuota
                  </label>

                  <div className="flex gap-3">

                    <input
                      type="number"
                      min={1}
                      value={
                        form.quota
                      }
                      onChange={(
                        event
                      ) =>
                        handleQuotaChange(
                          Number(
                            event
                              .target
                              .value
                          )
                        )
                      }
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-300/30"
                    />

                    <select
                      value={
                        form.quotaUnit
                      }
                      onChange={(
                        event
                      ) =>
                        handleQuotaUnitChange(
                          event
                            .target
                            .value as
                            | "MB"
                            | "GB"
                        )
                      }
                      className="rounded-xl border border-white/10 bg-[#181816] px-4 py-3 text-white outline-none focus:border-amber-300/30"
                    >
                      <option value="GB">
                        GB
                      </option>

                      <option value="MB">
                        MB
                      </option>
                    </select>

                  </div>
                </div>
              )}

              {/* SPEED */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm text-white/65">
                    Download
                    Mbps
                  </label>

                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={
                      form.speedDown
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          speedDown:
                            Number(
                              event
                                .target
                                .value
                            ),
                        })
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-300/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/65">
                    Upload Mbps
                  </label>

                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={
                      form.speedUp
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          speedUp:
                            Number(
                              event
                                .target
                                .value
                            ),
                        })
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-300/30"
                  />
                </div>

              </div>

              {/* PRICE */}

              <div>
                <label className="mb-2 block text-sm text-white/65">
                  Harga
                </label>

                <div className="flex items-center rounded-xl border border-white/10 bg-white/5">

                  <span className="px-4 text-sm text-white/35">
                    Rp
                  </span>

                  <input
                    type="number"
                    min={0}
                    value={
                      form.price
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          price:
                            Number(
                              event
                                .target
                                .value
                            ),
                        })
                      )
                    }
                    className="w-full bg-transparent px-2 py-3 text-white outline-none"
                  />

                </div>

                <p className="mt-2 text-xs text-white/30">
                  {formatRupiah(
                    Number(
                      form.price
                    )
                  )}
                </p>
              </div>

              {/* STATUS */}

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/8 bg-white/2 p-4">

                <div>
                  <div className="text-sm font-medium text-white">
                    Paket Aktif
                  </div>

                  <div className="mt-1 text-xs text-white/35">
                    Paket dapat ditampilkan
                    kepada pelanggan.
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={
                    form.active
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        active:
                          event
                            .target
                            .checked,
                      })
                    )
                  }
                  className="h-5 w-5 accent-amber-300"
                />

              </label>

              {/* BUTTON */}

              <div className="flex gap-3 border-t border-white/6 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(
                      false
                    )
                  }
                  className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 transition hover:bg-white/5"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/25 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingId
                      ? "Simpan Perubahan"
                      : "Tambah Paket"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

/*
 * ==========================================
 * PACKAGE CARD
 * ==========================================
 */

function PackageCard({
  item,
  onEdit,
  onToggle,
}: {
  item: PackageItem;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 ${
        item.active
          ? "border-white/8 bg-white/2 hover:border-amber-300/20"
          : "border-white/5 bg-white/[0.015] opacity-60"
      }`}
    >

      {/* GOLD LINE */}

      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent opacity-0 transition group-hover:opacity-100" />

      {/* HEADER */}

      <div className="flex items-start justify-between">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/5 text-xl text-amber-200">
          {getTypeIcon(
            item.type
          )}
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
            item.active
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-white/5 text-white/35"
          }`}
        >
          {item.active
            ? "AKTIF"
            : "NONAKTIF"}
        </span>

      </div>

      {/* NAME */}

      <div className="mt-5">

        <p className="text-xs uppercase tracking-[0.16em] text-white/30">
          {getTypeLabel(
            item.type
          )}
        </p>

        <h3 className="mt-1 truncate text-lg font-semibold text-white">
          {item.name}
        </h3>

      </div>

      {/* PRICE */}

      <div className="mt-5">

        <p className="text-2xl font-semibold tracking-tight text-amber-200">
          {formatRupiah(
            item.price
          )}
        </p>

      </div>

      {/* DETAILS */}

      <div className="mt-5 space-y-2 border-t border-white/6 pt-4">

        {item.type ===
          "hourly" && (
          <InfoRow
            label="Durasi"
            value={formatDuration(
              item.duration_minutes
            )}
          />
        )}

        {item.type ===
          "night" && (
          <InfoRow
            label="Jam"
            value={`${item.start_time?.slice(0, 5) ?? "-"} — ${item.end_time?.slice(0, 5) ?? "-"}`}
          />
        )}

        {(item.type ===
          "daily" ||
          item.type ===
            "weekly" ||
          item.type ===
            "monthly") && (
          <InfoRow
            label="Masa Aktif"
            value={formatDuration(
              item.duration_minutes
            )}
          />
        )}

        {item.type ===
          "quota" && (
          <InfoRow
            label="Kuota"
            value={formatQuota(
              item.quota_mb
            )}
          />
        )}

        {item.speed_down_mbps !==
          null && (
          <InfoRow
            label="Download"
            value={`${item.speed_down_mbps} Mbps`}
          />
        )}

        {item.speed_up_mbps !==
          null && (
          <InfoRow
            label="Upload"
            value={`${item.speed_up_mbps} Mbps`}
          />
        )}

      </div>

      {/* ACTIONS */}

      <div className="mt-5 grid grid-cols-2 gap-2">

        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-white/8 px-3 py-2 text-xs font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onToggle}
          className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
            item.active
              ? "border-red-400/15 text-red-300/70 hover:bg-red-400/10"
              : "border-emerald-400/15 text-emerald-300/70 hover:bg-emerald-400/10"
          }`}
        >
          {item.active
            ? "Nonaktifkan"
            : "Aktifkan"}
        </button>

      </div>

    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">

      <span className="text-white/35">
        {label}
      </span>

      <span className="font-medium text-white/65">
        {value}
      </span>

    </div>
  );
}