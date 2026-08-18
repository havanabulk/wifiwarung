"use client";

import { useState } from "react";

type PackageItem = {
  id: number;
  name: string;
  type:
    | "hourly"
    | "night"
    | "daily"
    | "weekly"
    | "monthly"
    | "quota";
  duration_minutes: number | null;
  quota_mb: number | null;
  speed_down_mbps: number | null;
  speed_up_mbps: number | null;
  price: number;
  active: boolean;
};

const typeLabels: Record<PackageItem["type"], string> = {
  hourly: "Per Jam",
  night: "Paket Malam",
  daily: "Per Hari",
  weekly: "Per Minggu",
  monthly: "Per Bulan",
  quota: "Kuota",
};

export default function PackagesManager({
  initialPackages,
}: {
  initialPackages: PackageItem[];
}) {
  const [packages, setPackages] =
    useState<PackageItem[]>(initialPackages);

  const [showForm, setShowForm] = useState(false);

  const [editing, setEditing] =
    useState<PackageItem | null>(null);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(item: PackageItem) {
    setEditing(item);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function updatePackage(updated: PackageItem) {
    setPackages((current) =>
      current.map((item) =>
        item.id === updated.id ? updated : item
      )
    );
  }

  function addPackage(newPackage: PackageItem) {
    setPackages((current) => [
      ...current,
      newPackage,
    ]);
  }

  return (
    <div>
      {/* TOP BAR */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold">
            Daftar Paket
          </h2>

          <p className="mt-1 text-xs text-white/30">
            {packages.length} paket tersedia
          </p>
        </div>

        <button
          onClick={openCreate}
          className="
            rounded-xl
            bg-[#b89b5e]
            px-5
            py-3
            text-sm
            font-bold
            text-[#17130c]
            transition
            hover:bg-[#c8ad72]
          "
        >
          + Tambah Paket
        </button>
      </div>

      {/* FILTER */}

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        <FilterButton label="Semua" active />

        <FilterButton label="Per Jam" />

        <FilterButton label="Malam" />

        <FilterButton label="Harian" />

        <FilterButton label="Mingguan" />

        <FilterButton label="Bulanan" />

        <FilterButton label="Kuota" />
      </div>

      {/* PACKAGE GRID */}

      {packages.length === 0 ? (
        <div
          className="
            mt-5
            flex
            min-h-64
            items-center
            justify-center
            rounded-2xl
            border
            border-dashed
            border-white/6
            bg-[#11110f]
          "
        >
          <div className="text-center">
            <div className="text-3xl text-white/20">
              ◈
            </div>

            <p className="mt-3 text-sm text-white/40">
              Belum ada paket.
            </p>

            <button
              onClick={openCreate}
              className="mt-3 text-xs font-bold text-[#b89b5e]"
            >
              Tambahkan paket pertama
            </button>
          </div>
        </div>
      ) : (
        <div
          className="
            mt-5
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-3
          "
        >
          {packages.map((item) => (
            <PackageCard
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
            />
          ))}
        </div>
      )}

      {/* MODAL */}

      {showForm && (
        <PackageModal
          packageItem={editing}
          onClose={closeForm}
          onCreated={addPackage}
          onUpdated={updatePackage}
        />
      )}
    </div>
  );
}


/* FILTER */

function FilterButton({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`
        whitespace-nowrap
        rounded-xl
        border
        px-4
        py-2.5
        text-xs
        font-semibold
        transition
        ${
          active
            ? "border-[#b89b5e]/20 bg-[#b89b5e]/8 text-[#c8ad72]"
            : "border-white/6 bg-[#11110f] text-white/40 hover:text-white"
        }
      `}
    >
      {label}
    </button>
  );
}


/* CARD */

function PackageCard({
  item,
  onEdit,
}: {
  item: PackageItem;
  onEdit: () => void;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/6
        bg-[#11110f]
        p-5
        transition
        hover:border-[#b89b5e]/20
      "
    >
      <div className="flex items-start justify-between">

        <div>
          <span
            className="
              rounded-full
              border
              border-[#b89b5e]/15
              bg-[#b89b5e]/5
              px-2.5
              py-1
              text-[9px]
              font-bold
              uppercase
              tracking-wider
              text-[#c8ad72]
            "
          >
            {typeLabels[item.type]}
          </span>

          <h3 className="mt-4 text-lg font-bold">
            {item.name}
          </h3>
        </div>

        <span
          className={`
            h-2.5
            w-2.5
            rounded-full
            ${
              item.active
                ? "bg-emerald-400"
                : "bg-white/20"
            }
          `}
        />
      </div>

      <div className="mt-5">
        <span className="text-2xl font-black text-[#c8ad72]">
          Rp {Number(item.price).toLocaleString("id-ID")}
        </span>
      </div>

      <div className="mt-5 space-y-2 border-t border-white/6 pt-4">

        {item.duration_minutes && (
          <Detail
            label="Durasi"
            value={formatDuration(item.duration_minutes)}
          />
        )}

        {item.quota_mb && (
          <Detail
            label="Kuota"
            value={formatQuota(item.quota_mb)}
          />
        )}

        {item.speed_down_mbps && (
          <Detail
            label="Download"
            value={`${item.speed_down_mbps} Mbps`}
          />
        )}

        {item.speed_up_mbps && (
          <Detail
            label="Upload"
            value={`${item.speed_up_mbps} Mbps`}
          />
        )}

      </div>

      <button
        onClick={onEdit}
        className="
          mt-5
          w-full
          rounded-xl
          border
          border-white/6
          bg-white/2
          py-3
          text-xs
          font-bold
          text-white/60
          transition
          hover:border-[#b89b5e]/20
          hover:text-[#c8ad72]
        "
      >
        Edit Paket
      </button>
    </div>
  );
}


function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-white/30">
        {label}
      </span>

      <span className="font-semibold text-white/70">
        {value}
      </span>
    </div>
  );
}


function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} menit`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;

    if (hours < 24) {
      return `${hours} jam`;
    }

    return `${Math.floor(hours / 24)} hari`;
  }

  return `${minutes} menit`;
}


function formatQuota(mb: number) {
  if (mb >= 1024) {
    return `${mb / 1024} GB`;
  }

  return `${mb} MB`;
}


/* MODAL */

function PackageModal({
  packageItem,
  onClose,
  onCreated,
  onUpdated,
}: {
  packageItem: PackageItem | null;
  onClose: () => void;
  onCreated: (item: PackageItem) => void;
  onUpdated: (item: PackageItem) => void;
}) {
  const isEdit = !!packageItem;

  const [name, setName] =
    useState(packageItem?.name ?? "");

  const [type, setType] =
    useState<PackageItem["type"]>(
      packageItem?.type ?? "hourly"
    );

  const [duration, setDuration] =
    useState(
      packageItem?.duration_minutes
        ? String(packageItem.duration_minutes)
        : ""
    );

  const [quota, setQuota] =
    useState(
      packageItem?.quota_mb
        ? String(packageItem.quota_mb)
        : ""
    );

  const [download, setDownload] =
    useState(
      packageItem?.speed_down_mbps
        ? String(packageItem.speed_down_mbps)
        : ""
    );

  const [upload, setUpload] =
    useState(
      packageItem?.speed_up_mbps
        ? String(packageItem.speed_up_mbps)
        : ""
    );

  const [price, setPrice] =
    useState(
      packageItem
        ? String(packageItem.price)
        : ""
    );

  const [active, setActive] =
    useState(packageItem?.active ?? true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Nama paket wajib diisi.");
      return;
    }

    if (!price || Number(price) < 0) {
      setError("Harga paket tidak valid.");
      return;
    }

    if (type === "hourly" && !duration) {
      setError("Durasi paket wajib diisi.");
      return;
    }

    if (type === "quota" && !quota) {
      setError("Kuota wajib diisi.");
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      type,
      duration_minutes:
        type === "quota"
          ? null
          : Number(duration) || null,
      quota_mb:
        type === "quota"
          ? Number(quota) || null
          : null,
      speed_down_mbps:
        download
          ? Number(download)
          : null,
      speed_up_mbps:
        upload
          ? Number(upload)
          : null,
      price: Number(price),
      active,
    };

    try {
      const response = await fetch(
        isEdit
          ? `/api/admin/packages/${packageItem.id}`
          : "/api/admin/packages",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Gagal menyimpan paket."
        );
      }

      if (isEdit) {
        onUpdated(result.package);
      } else {
        onCreated(result.package);
      }

      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-black/70
        p-4
        backdrop-blur-sm
      "
    >
      <div
        className="
          max-h-[90vh]
          w-full
          max-w-xl
          overflow-y-auto
          rounded-3xl
          border
          border-white/10
          bg-[#11110f]
          p-6
          shadow-2xl
          sm:p-8
        "
      >

        <div className="flex items-start justify-between">

          <div>
            <p
              className="
                text-[9px]
                font-bold
                tracking-[0.2em]
                text-[#b89b5e]
              "
            >
              PACKAGE MANAGEMENT
            </p>

            <h2 className="mt-2 text-xl font-bold">
              {isEdit
                ? "Edit Paket"
                : "Tambah Paket"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="
              text-xl
              text-white/30
              hover:text-white
            "
          >
            ×
          </button>

        </div>

        {error && (
          <div
            className="
              mt-5
              rounded-xl
              border
              border-red-500/15
              bg-red-500/5
              px-4
              py-3
              text-xs
              text-red-300
            "
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >

          <Input
            label="Nama Paket"
            value={name}
            onChange={setName}
            placeholder="Contoh: 5 Jam"
          />

          <div>

            <label className="mb-2 block text-xs font-semibold text-white/60">
              Jenis Paket
            </label>

            <select
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as PackageItem["type"]
                )
              }
              className="
                h-12
                w-full
                rounded-xl
                border
                border-white/10
                bg-black/30
                px-4
                text-sm
                text-white
                outline-none
              "
            >
              <option value="hourly">
                Per Jam
              </option>

              <option value="night">
                Paket Malam
              </option>

              <option value="daily">
                Per Hari
              </option>

              <option value="weekly">
                Per Minggu
              </option>

              <option value="monthly">
                Per Bulan
              </option>

              <option value="quota">
                Kuota
              </option>
            </select>

          </div>

          {type !== "quota" && (
            <Input
              label="Durasi (menit)"
              value={duration}
              onChange={setDuration}
              placeholder="Contoh: 180"
              type="number"
            />
          )}

          {type === "quota" && (
            <Input
              label="Kuota (MB)"
              value={quota}
              onChange={setQuota}
              placeholder="Contoh: 10240"
              type="number"
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">

            <Input
              label="Download Mbps"
              value={download}
              onChange={setDownload}
              placeholder="Contoh: 10"
              type="number"
            />

            <Input
              label="Upload Mbps"
              value={upload}
              onChange={setUpload}
              placeholder="Contoh: 5"
              type="number"
            />

          </div>

          <Input
            label="Harga (Rp)"
            value={price}
            onChange={setPrice}
            placeholder="Contoh: 25000"
            type="number"
          />

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/6 bg-white/2 p-4">

            <div>
              <p className="text-xs font-semibold">
                Status Paket
              </p>

              <p className="mt-1 text-[10px] text-white/30">
                Paket bisa dibeli pelanggan
              </p>
            </div>

            <input
              type="checkbox"
              checked={active}
              onChange={(e) =>
                setActive(e.target.checked)
              }
              className="h-5 w-5 accent-[#b89b5e]"
            />

          </label>

          <button
            disabled={loading}
            type="submit"
            className="
              h-12
              w-full
              rounded-xl
              bg-[#b89b5e]
              text-sm
              font-bold
              text-[#17130c]
              transition
              hover:bg-[#c8ad72]
              disabled:opacity-50
            "
          >
            {loading
              ? "Menyimpan..."
              : isEdit
                ? "Simpan Perubahan"
                : "Tambah Paket"}
          </button>

        </form>

      </div>
    </div>
  );
}


function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>

      <label className="mb-2 block text-xs font-semibold text-white/60">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        className="
          h-12
          w-full
          rounded-xl
          border
          border-white/10
          bg-black/30
          px-4
          text-sm
          text-white
          outline-none
          placeholder:text-white/20
          focus:border-[#b89b5e]/50
        "
      />

    </div>
  );
}