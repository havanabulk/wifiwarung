"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, formatDuration, formatQuota } from "@/lib/format";

export type PurchasePackageItem = {
  id: number;
  name: string;
  price: number;
  durationMinutes: number | null;
  quotaMb: number | null;
  speedDownMbps: number | null;
  speedUpMbps: number | null;
  startTime: string | null;
  endTime: string | null;
};

function formatClock(time: string) {
  return time.slice(0, 5);
}

function newRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function PurchasePackages({
  packages,
  balance,
}: {
  packages: PurchasePackageItem[];
  balance: number;
}) {
  const router = useRouter();

  const [selected, setSelected] = useState<PurchasePackageItem | null>(null);

  const [purchaseKey, setPurchaseKey] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  function openPurchaseModal(item: PurchasePackageItem) {
    setSelected(item);
    setPurchaseKey(newRequestId());
    setError(null);
    setSubmitting(false);
  }

  function closeModal() {
    setSelected(null);
    setPurchaseKey("");
    setError(null);
    setSubmitting(false);
  }

  async function confirmPurchase() {
    if (!selected || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: selected.id,
          idempotencyKey: purchaseKey,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Pembelian gagal diproses.",
        );

        setSubmitting(false);

        return;
      }

      setSuccess(`Pembelian paket "${selected.name}" berhasil.`);

      router.refresh();

      closeModal();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");

      setSubmitting(false);
    }
  }

  if (packages.length === 0) {
    return (
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
        Belum ada paket yang tersedia.
      </div>
    );
  }

  return (
    <>
      {success && (
        <div
          className="
            mt-5
            rounded-2xl
            border
            border-emerald-500/20
            bg-emerald-500/5
            px-5
            py-3
            text-sm
            text-emerald-300
          "
        >
          {success}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        {packages.map((item) => {
          const affordable = balance >= item.price;

          const metaLines: string[] = [];

          if (
            item.durationMinutes !== null &&
            item.durationMinutes !== undefined
          ) {
            metaLines.push(formatDuration(item.durationMinutes));
          }

          if (item.quotaMb !== null) {
            metaLines.push(`${formatQuota(item.quotaMb)} kuota`);
          }

          if (item.speedDownMbps !== null) {
            metaLines.push(`↓ ${item.speedDownMbps} Mbps`);
          }

          if (item.speedUpMbps !== null) {
            metaLines.push(`↑ ${item.speedUpMbps} Mbps`);
          }

          if (item.startTime && item.endTime) {
            metaLines.push(
              `${formatClock(item.startTime)} – ${formatClock(item.endTime)}`,
            );
          }

          return (
            <div
              key={item.id}
              className="
                flex
                aspect-square
                flex-col
                justify-between
                overflow-hidden
                rounded-2xl
                border
                border-white/6
                bg-[#11110f]
                p-4
                transition-all
                active:scale-[0.97]
                lg:p-5
              "
            >
              <div>
                <p
                  className="
                    text-sm
                    font-bold
                    text-[#f2f0ea]
                    leading-tight
                  "
                >
                  {item.name}
                </p>

                <p
                  className="
                    mt-1
                    text-base
                    font-black
                    text-emerald-300
                    lg:text-lg
                  "
                >
                  {formatRupiah(item.price)}
                </p>

                {metaLines.length > 0 && (
                  <ul
                    className="
                      mt-2
                      space-y-0.5
                      text-[10px]
                      text-[#a7a39a]
                      lg:text-xs
                    "
                  >
                    {metaLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={() => openPurchaseModal(item)}
                disabled={!affordable}
                className="
                  mt-3
                  w-full
                  rounded-xl
                  border
                  border-emerald-500/30
                  bg-emerald-500/10
                  py-2
                  text-xs
                  font-semibold
                  text-emerald-300
                  transition
                  hover:bg-emerald-500/20
                  disabled:cursor-not-allowed
                  disabled:border-white/10
                  disabled:bg-transparent
                  disabled:text-white/30
                  lg:text-sm
                "
              >
                {affordable ? "Beli" : "Saldo kurang"}
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/70
            p-4
          "
        >
          <div
            className="
              w-full
              max-w-sm
              rounded-2xl
              border
              border-white/10
              bg-[#11110f]
              p-6
            "
          >
            <h3
              className="
                text-lg
                font-bold
                text-[#f2f0ea]
              "
            >
              Konfirmasi Pembelian
            </h3>

            <p
              className="
                mt-2
                text-sm
                text-[#a7a39a]
              "
            >
              Anda akan membeli paket{" "}
              <span className="font-semibold text-[#f2f0ea]">
                {selected.name}
              </span>{" "}
              seharga{" "}
              <span className="font-semibold text-emerald-300">
                {formatRupiah(selected.price)}
              </span>
              .
            </p>

            <dl
              className="
                mt-4
                space-y-2
                rounded-xl
                border
                border-white/6
                p-4
                text-sm
              "
            >
              <div className="flex justify-between">
                <dt className="text-[#a7a39a]">Saldo saat ini</dt>
                <dd className="text-[#f2f0ea]">{formatRupiah(balance)}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-[#a7a39a]">Saldo setelah beli</dt>
                <dd className="text-[#f2f0ea]">
                  {formatRupiah(balance - selected.price)}
                </dd>
              </div>
            </dl>

            {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="
                  flex-1
                  rounded-xl
                  border
                  border-white/10
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-white/60
                  transition
                  hover:bg-white/5
                  disabled:opacity-50
                "
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmPurchase}
                disabled={submitting}
                className="
                  flex-1
                  rounded-xl
                  border
                  border-emerald-500/30
                  bg-emerald-500/15
                  px-4
                  py-2.5
                  text-sm
                  font-semibold
                  text-emerald-300
                  transition
                  hover:bg-emerald-500/25
                  disabled:opacity-50
                "
              >
                {submitting ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
