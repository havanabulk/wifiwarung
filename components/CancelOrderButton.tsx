"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  orderRef: string;
};

export default function CancelOrderButton({ orderRef }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleCancel() {
    if (!window.confirm("Batalkan pesanan ini? Pembayaran yang belum selesai akan dibatalkan.")) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions/${encodeURIComponent(orderRef)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Gagal membatalkan pesanan.");
        setBusy(false);

        return;
      }

      setDone(true);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <p className="mt-5 text-sm font-bold text-emerald-300">
          Transaksi berhasil dibatalkan ✓
        </p>

        <Link
          href="/"
          className="mt-3 block w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-[#f2f0ea] transition hover:border-[#8f7747]"
        >
          Kembali ke Beranda
        </Link>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleCancel}
        disabled={busy}
        className="mt-3 block w-full rounded-xl border border-red-500/30 py-3 text-sm font-semibold text-red-300 transition hover:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Membatalkan..." : "Batalkan Pesanan"}
      </button>

      {error && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-300">
          {error}
        </p>
      )}
    </>
  );
}