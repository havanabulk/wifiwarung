"use client";

import { useState } from "react";
import { MIN_DEPOSIT, MAX_DEPOSIT } from "@/lib/validation/deposit";

const PRESETS = [10000, 20000, 50000, 100000];

type Props = {
  balance: number;
};

export default function TopUpForm({ balance }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(amount);

  async function handleSubmit() {
    if (
      !Number.isFinite(parsed) ||
      !Number.isInteger(parsed) ||
      parsed < MIN_DEPOSIT ||
      parsed > MAX_DEPOSIT
    ) {
      setError(
        `Nominal harus Rp ${MIN_DEPOSIT.toLocaleString(
          "id-ID",
        )} – Rp ${MAX_DEPOSIT.toLocaleString("id-ID")} (bilangan bulat).`,
      );

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Gagal membuat transaksi.");
        setSubmitting(false);

        return;
      }

      if (data.redirect_url) {
        window.location.assign(data.redirect_url);

        return;
      }

      setError("Gagal membuat transaksi pembayaran.");
      setSubmitting(false);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* saldo */}
      <div className="rounded-2xl border border-[#b89b5e]/15 bg-[#11110f] p-6">
        <p className="text-xs text-[#a7a39a]">Saldo Anda</p>

        <p className="mt-1 text-3xl font-black text-[#c8ad72]">
          Rp {balance.toLocaleString("id-ID")}
        </p>
      </div>

      {/* preset */}
      <div className="mt-5">
        <div className="mb-2 text-xs font-bold text-[#a7a39a]">
          PILIH NOMINAL
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const selected = parsed === preset;

            return (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  selected
                    ? "border-[#b89b5e]/60 bg-[#b89b5e]/10 text-[#f2f0ea]"
                    : "border-white/10 bg-white/[0.02] text-[#a7a39a] hover:border-white/20"
                }`}
              >
                Rp {preset.toLocaleString("id-ID")}
              </button>
            );
          })}
        </div>
      </div>

      {/* custom */}
      <label className="mt-4 block text-xs text-[#a7a39a]">
        Nominal Lainnya
      </label>

      <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] focus-within:border-[#b89b5e]/50">
        <span className="pl-4 text-sm text-[#a7a39a]">Rp</span>

        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value.replace(/[^\d]/g, ""))
          }
          placeholder="Masukkan nominal"
          className="w-full bg-transparent px-3 py-3 text-sm text-[#f2f0ea] outline-none placeholder:text-white/30"
        />
      </div>

      {/* info */}
      <div className="mt-4 rounded-xl border border-white/6 bg-[#11110f] p-4 text-[11px] leading-5 text-[#a7a39a]">
        <p>
          Pembayaran diproses via <strong className="text-[#f2f0ea]">Midtrans</strong>{" "}
          (QRIS / Virtual Account / E-Wallet). Saldo masuk otomatis setelah
          pembayaran terverifikasi.
        </p>

        <p className="mt-1 text-white/30">
          Minimal Rp {MIN_DEPOSIT.toLocaleString("id-ID")} • Maksimal Rp{" "}
          {MAX_DEPOSIT.toLocaleString("id-ID")} per transaksi.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-5 w-full rounded-xl bg-[#b89b5e] py-3.5 text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Memproses..." : "Bayar Sekarang"}
      </button>
    </div>
  );
}