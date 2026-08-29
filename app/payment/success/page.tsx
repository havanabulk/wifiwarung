"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Transaction = {
  id: string;
  merchant_ref: string;
  status: string;
  amount: number;
  payment_method: string;
  pay_code: string | null;
  guest_name: string | null;
  guest_email: string | null;
  package_id: number | null;
};

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref) {
      return;
    }

    let cancelled = false;

    async function poll() {
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        try {
          const res = await fetch(`/api/transactions/${ref}`);

          const data = await res.json();

          if (data.transaction && !cancelled) {
            setTx(data.transaction);

            if (data.transaction.status === "paid") {
              setLoading(false);

              return;
            }
          }
        } catch {
          // retry
        }

        attempts++;
        await new Promise((r) => setTimeout(r, 3000));
      }

      if (!cancelled) {
        setError(
          "Pembayaran belum terverifikasi dalam 90 detik. Silakan cek email Anda atau hubungi admin.",
        );
        setLoading(false);
      }
    }

    poll();

    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (!ref) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4">
        <div className="text-center text-sm text-[#a7a39a]">
          Referensi transaksi tidak ditemukan.
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11110f] p-8 text-center">
        {loading && (
          <>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#b89b5e] border-t-transparent" />

            <h1 className="mt-5 text-lg font-bold text-[#f2f0ea]">
              Memverifikasi Pembayaran...
            </h1>

            <p className="mt-2 text-sm text-[#a7a39a]">
              Kami sedang menunggu konfirmasi dari Midtrans. Halaman ini akan
              diperbarui otomatis.
            </p>
          </>
        )}

        {!loading && tx?.status === "paid" && (
          <>
            <div className="text-4xl">✅</div>

            <h1 className="mt-4 text-lg font-bold text-emerald-300">
              Pembayaran Berhasil!
            </h1>

            <p className="mt-2 text-sm text-[#a7a39a]">
              Paket Anda telah aktif. Silakan login dengan email{" "}
              <span className="font-semibold text-[#f2f0ea]">
                {tx.guest_email}
              </span>{" "}
              untuk mengakses layanan.
            </p>

            <div className="mt-4 rounded-xl border border-white/10 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#a7a39a]">Status</span>
                <span className="font-bold text-emerald-300">Aktif</span>
              </div>

              <div className="mt-2 flex justify-between">
                <span className="text-[#a7a39a]">Ref</span>
                <span className="font-mono text-xs text-[#f2f0ea]">
                  {tx.merchant_ref}
                </span>
              </div>
            </div>

            <Link
              href="/login"
              className="mt-5 block w-full rounded-xl bg-[#b89b5e] py-3 text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72]"
            >
              Login Sekarang
            </Link>
          </>
        )}

        {!loading && error && (
          <>
            <div className="text-4xl">⏳</div>

            <h1 className="mt-4 text-lg font-bold text-[#f2f0ea]">
              Menunggu Pembayaran
            </h1>

            <p className="mt-2 text-sm text-[#a7a39a]">{error}</p>

            <Link
              href="/"
              className="mt-5 block w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-[#f2f0ea] transition hover:border-[#8f7747]"
            >
              Kembali ke Beranda
            </Link>
          </>
        )}

        {!loading && !error && tx?.status !== "paid" && (
          <>
            <div className="text-4xl">❓</div>

            <h1 className="mt-4 text-lg font-bold text-[#f2f0ea]">
              Status Tidak Diketahui
            </h1>

            <p className="mt-2 text-sm text-[#a7a39a]">
              Silakan hubungi admin dengan referensi:{" "}
              <span className="font-mono text-[#f2f0ea]">{ref}</span>
            </p>

            <Link
              href="/"
              className="mt-5 block w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-[#f2f0ea] transition hover:border-[#8f7747]"
            >
              Kembali ke Beranda
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#080808]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89b5e] border-t-transparent" />
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
