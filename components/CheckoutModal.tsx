"use client";

import { useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type PackageInfo = {
  id: number;
  name: string;
  price: number;
  description?: string;
};

type PaymentChannel = {
  code: string;
  name: string;
  group: string;
  type: "direct" | "redirect";
  fee_customer: { flat: number; percent: number };
  minimum_amount: number;
  maximum_amount: number;
  icon_url: string;
};

type Props = {
  pkg: PackageInfo;
  onClose: () => void;
};

/* ------------------------------------------------------------------ */
/*  Payment method groups                                               */
/* ------------------------------------------------------------------ */

const GROUP_ORDER = [
  "Virtual Account",
  "E-Wallet",
  "QRIS",
  "Convenience Store",
  "Bank Transfer",
];

const GROUP_ICONS: Record<string, string> = {
  "Virtual Account": "🏦",
  "E-Wallet": "📱",
  QRIS: "📸",
  "Convenience Store": "🏪",
  "Bank Transfer": "🏧",
};

function groupChannels(channels: PaymentChannel[]) {
  const map = new Map<string, PaymentChannel[]>();

  for (const ch of channels) {
    const group = ch.group ?? "Lainnya";

    if (!map.has(group)) {
      map.set(group, []);
    }

    map.get(group)!.push(ch);
  }

  return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
    group: g,
    channels: map.get(g)!,
  }));
}

function formatFee(ch: PaymentChannel): string {
  const flat = ch.fee_customer.flat;
  const percent = Number(ch.fee_customer.percent);

  if (flat === 0 && percent === 0) {
    return "Gratis";
  }

  if (percent > 0 && flat > 0) {
    return `Rp${flat.toLocaleString("id-ID")} + ${percent}%`;
  }

  if (percent > 0) {
    return `${percent}%`;
  }

  return `Rp${flat.toLocaleString("id-ID")}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function CheckoutModal({ pkg, onClose }: Props) {
  const [channels, setChannels] = useState<PaymentChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const [step, setStep] = useState<"form" | "payment" | "processing">("form");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [payCode, setPayCode] = useState<string | null>(null);
  const [paymentName, setPaymentName] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<"tripay" | "cash">("tripay");
  const [merchantRef, setMerchantRef] = useState<string>("");
  const [instructions, setInstructions] = useState<
    Array<{ title: string; steps: string[] }>
  >([]);

  /* fetch payment channels */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/payment-channels");

        const data = await res.json();

        if (data.channels) {
          setChannels(data.channels);
        }
      } catch {
        // fallback channels
      } finally {
        setLoadingChannels(false);
      }
    }

    load();
  }, []);

  /* submit checkout */
  async function handleSubmit() {
    if (!selectedMethod) {
      setError("Pilih metode pembayaran terlebih dahulu.");

      return;
    }

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
          methodName: selectedMethod,
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

      setPayCode(data.pay_code ?? null);
      setPaymentName(data.payment_name);
      setCheckoutUrl(data.checkout_url ?? null);
      setPaymentType(data.payment_type === "cash" ? "cash" : "tripay");
      setMerchantRef(data.merchant_ref ?? "");
      setInstructions(data.instructions ?? []);
      setStep("payment");
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
                METODE PEMBAYARAN
              </label>

              {/* cash option */}
              <button
                type="button"
                onClick={() => setSelectedMethod("CASH")}
                className={`mb-3 flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                  selectedMethod === "CASH"
                    ? "border-[#b89b5e]/60 bg-[#b89b5e]/10 text-[#f2f0ea]"
                    : "border-white/10 bg-white/[0.02] text-[#a7a39a] hover:border-white/20"
                }`}
              >
                <span className="text-xl">💵</span>

                <div>
                  <div className="text-sm font-semibold">Tunai di Tempat</div>

                  <div className="mt-0.5 text-[10px] text-white/40">
                    Bayar langsung ke kasir saat datang
                  </div>
                </div>
              </button>

              <div className="mb-2 text-[10px] uppercase tracking-widest text-white/30">
                atau bayar online
              </div>

              {loadingChannels ? (
                <div className="py-8 text-center text-sm text-white/30">
                  Memuat metode pembayaran...
                </div>
              ) : channels.length === 0 ? (
                <div className="py-8 text-center text-sm text-white/30">
                  Tidak ada metode pembayaran tersedia.
                </div>
              ) : (
                <div className="space-y-4">
                  {groupChannels(channels).map(({ group, channels: chs }) => (
                    <div key={group}>
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#a7a39a]">
                        <span>{GROUP_ICONS[group] ?? "💰"}</span>
                        {group}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {chs.map((ch) => {
                          const isSelected = selectedMethod === ch.code;
                          const feeLabel = formatFee(ch);

                          return (
                            <button
                              key={ch.code}
                              type="button"
                              onClick={() => setSelectedMethod(ch.code)}
                              className={`flex flex-col items-start rounded-xl border p-3 text-left text-xs transition ${
                                isSelected
                                  ? "border-[#b89b5e]/60 bg-[#b89b5e]/10 text-[#f2f0ea]"
                                  : "border-white/10 bg-white/[0.02] text-[#a7a39a] hover:border-white/20"
                              }`}
                            >
                              <span className="font-semibold leading-tight">
                                {ch.name}
                              </span>

                              <span
                                className={`mt-1 text-[10px] ${
                                  feeLabel === "Gratis"
                                    ? "text-emerald-400"
                                    : "text-white/40"
                                }`}
                              >
                                {feeLabel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedMethod || loadingChannels}
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
              Membuat transaksi pembayaran...
            </p>
          </div>
        )}

        {/* -------- STEP: PAYMENT -------- */}

        {step === "payment" && paymentType === "cash" && (
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
                onClick={() => navigator.clipboard.writeText(merchantRef)}
                className="mt-3 rounded-lg border border-white/10 px-4 py-1.5 text-xs text-[#a7a39a] transition hover:border-[#b89b5e]/40 hover:text-[#c8ad72]"
              >
                Salin Kode
              </button>
            </div>

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

        {step === "payment" && paymentType === "tripay" && (
          <>
            <div className="mb-5">
              <div className="text-[11px] font-bold tracking-[0.2em] text-emerald-400">
                MENUNGGU PEMBAYARAN
              </div>

              <h3 className="mt-1 text-lg font-bold text-[#f2f0ea]">
                {paymentName}
              </h3>
            </div>

            {payCode && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <div className="text-[10px] uppercase tracking-widest text-[#a7a39a]">
                  Kode Bayar
                </div>

                <div className="mt-2 text-2xl font-black tracking-wider text-[#f2f0ea]">
                  {payCode}
                </div>

                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(payCode)}
                  className="mt-3 rounded-lg border border-white/10 px-4 py-1.5 text-xs text-[#a7a39a] transition hover:border-[#b89b5e]/40 hover:text-[#c8ad72]"
                >
                  Salin Kode
                </button>
              </div>
            )}

            {checkoutUrl && (
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full rounded-xl bg-[#b89b5e] py-3.5 text-center text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72]"
              >
                Bayar via Tripay →
              </a>
            )}

            {instructions.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="text-xs font-bold text-[#a7a39a]">
                  INSTRUKSI PEMBAYARAN
                </div>

                {instructions.map((inst) => (
                  <div
                    key={inst.title}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <div className="mb-2 text-xs font-bold text-[#f2f0ea]">
                      {inst.title}
                    </div>

                    <ol className="space-y-1 text-[11px] leading-5 text-[#a7a39a]">
                      {inst.steps.map((step, i) => (
                        <li key={i}>
                          <span className="mr-1 text-[#b89b5e]">{i + 1}.</span>
                          <span dangerouslySetInnerHTML={{ __html: step }} />
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-5 text-center text-[11px] text-white/30">
              Pembayaran akan terverifikasi otomatis.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm text-[#a7a39a] transition hover:border-white/20 hover:text-[#f2f0ea]"
            >
              Tutup
            </button>
          </>
        )}
      </div>
    </div>
  );
}
