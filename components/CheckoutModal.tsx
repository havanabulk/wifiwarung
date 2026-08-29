"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type PackageInfo = {
  id: number;
  name: string;
  price: number;
  description?: string;
};

type Props = {
  pkg: PackageInfo;
  onClose: () => void;
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function CheckoutModal({ pkg, onClose }: Props) {
  const [step, setStep] = useState<"form" | "payment" | "processing">("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [payMethod, setPayMethod] = useState<"midtrans" | "cash">("midtrans");

  const [error, setError] = useState<string | null>(null);
  const [merchantRef, setMerchantRef] = useState<string>("");

  /* submit checkout */
  async function handleSubmit() {
    if (!name.trim()) {
      setError("Nama wajib diisi.");

      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email tidak valid.");

      return;
    }

    setStep("processing");
    setError(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          methodName: payMethod === "cash" ? "CASH" : undefined,
          customerName: name.trim(),
          customerEmail: email.trim().toLowerCase(),
          customerPhone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Gagal membuat transaksi.");
        setStep("form");

        return;
      }

      if (data.payment_type === "cash") {
        setMerchantRef(data.merchant_ref ?? "");
        setStep("payment");

        return;
      }

      if (data.redirect_url) {
        window.location.assign(data.redirect_url);

        return;
      }

      setError("Gagal membuat transaksi pembayaran.");
      setStep("form");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setStep("form");
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#11110f] p-6">
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/40 transition hover:text-white"
        >
          ✕
        </button>

        {/* -------- STEP: FORM -------- */}

        {step === "form" && (
          <>
            {/* header */}
            <div className="mb-5">
              <div className="text-[11px] font-bold tracking-[0.2em] text-[#b89b5e]">
                CHECKOUT
              </div>

              <h3 className="mt-1 text-lg font-bold text-[#f2f0ea]">
                {pkg.name}
              </h3>

              <p className="mt-1 text-sm font-bold text-emerald-300">
                Rp{pkg.price.toLocaleString("id-ID")}
              </p>
            </div>

            {/* customer info */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-[#a7a39a]">
                  Nama Lengkap *
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#f2f0ea] outline-none transition placeholder:text-white/30 focus:border-[#b89b5e]/50"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#a7a39a]">
                  Email *
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#f2f0ea] outline-none transition placeholder:text-white/30 focus:border-[#b89b5e]/50"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#a7a39a]">
                  Nomor HP <span className="text-white/30">(opsional)</span>
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[#f2f0ea] outline-none transition placeholder:text-white/30 focus:border-[#b89b5e]/50"
                />
              </div>
            </div>

            {/* payment methods */}
            <div className="mt-5">
              <label className="mb-3 block text-xs font-bold text-[#a7a39a]">
                PILIH METODE PEMBAYARAN
              </label>

              <div className="space-y-3">
                {/* online (midtrans) */}
                <button
                  type="button"
                  onClick={() => setPayMethod("midtrans")}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                    payMethod === "midtrans"
                      ? "border-[#b89b5e]/60 bg-[#b89b5e]/10 text-[#f2f0ea]"
                      : "border-white/10 bg-white/[0.02] text-[#a7a39a] hover:border-white/20"
                  }`}
                >
                  <span className="text-xl">🌐</span>

                  <div>
                    <div className="text-sm font-semibold">
                      Bayar Online via Midtrans
                    </div>

                    <div className="mt-0.5 text-[10px] text-white/40">
                      QRIS, Virtual Account, E-Wallet — dipilih saat bayar
                    </div>
                  </div>
                </button>

                {/* cash */}
                <button
                  type="button"
                  onClick={() => setPayMethod("cash")}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                    payMethod === "cash"
                      ? "border-[#b89b5e]/60 bg-[#b89b5e]/10 text-[#f2f0ea]"
                      : "border-white/10 bg-white/[0.02] text-[#a7a39a] hover:border-white/20"
                  }`}
                >
                  <span className="text-xl">💵</span>

                  <div>
                    <div className="text-sm font-semibold">
                      Tunai di Tempat
                    </div>

                    <div className="mt-0.5 text-[10px] text-white/40">
                      Bayar langsung ke kasir saat datang
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || !email.trim()}
              className="mt-5 w-full rounded-xl bg-[#b89b5e] py-3.5 text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Bayar Sekarang
            </button>
          </>
        )}

        {/* -------- STEP: PROCESSING -------- */}

        {step === "processing" && (
          <div className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#b89b5e] border-t-transparent" />

            <p className="mt-4 text-sm text-[#a7a39a]">
              {payMethod === "midtrans"
                ? "Mengarahkan ke halaman pembayaran Midtrans..."
                : "Membuat transaksi pembayaran..."}
            </p>
          </div>
        )}

        {/* -------- STEP: PAYMENT (cash) -------- */}

        {step === "payment" && (
          <>
            <div className="mb-5">
              <div className="text-[11px] font-bold tracking-[0.2em] text-[#b89b5e]">
                TUNAI DI TEMPAT
              </div>

              <h3 className="mt-1 text-lg font-bold text-[#f2f0ea]">
                Tunjukkan kode ini ke kasir
              </h3>
            </div>

            <div className="rounded-xl border border-[#b89b5e]/20 bg-[#b89b5e]/5 p-6 text-center">
              <div className="text-[10px] uppercase tracking-widest text-[#a7a39a]">
                Kode Transaksi
              </div>

              <div className="mt-2 text-xl font-black tracking-wider text-[#f2f0ea]">
                {merchantRef}
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(merchantRef)
                    .catch(() => {});
                }}
                className="mt-3 rounded-lg border border-white/10 px-4 py-1.5 text-xs text-[#a7a39a] transition hover:border-[#b89b5e]/40 hover:text-[#c8ad72]"
              >
                Salin Kode
              </button>

              <div className="mt-4 space-y-3 text-sm text-[#a7a39a]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">1️⃣</span>

                  <span>
                    Datang ke lokasi{" "}
                    <strong className="text-[#f2f0ea]">WARUNG28</strong>
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">2️⃣</span>

                  <span>Tunjukkan kode transaksi di atas ke kasir</span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg">3️⃣</span>

                  <span>
                    Bayar{" "}
                    <strong className="text-emerald-300">
                      Rp{pkg.price.toLocaleString("id-ID")}
                    </strong>{" "}
                    dan paket langsung aktif
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] text-white/30">
              Kode ini berlaku selama 24 jam. Hubungi admin jika ada kendala.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-[#b89b5e] py-3.5 text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72]"
            >
              Mengerti
            </button>
          </>
        )}
      </div>
    </div>
  );
}