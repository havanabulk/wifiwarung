"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Halaman arahan balik dari Midtrans saat pembayaran error / dibatalkan /
// tidak selesai (Error & Unfinish redirect URL).
//
// Midtrans menambahkan query params ke return URL: order_id, status_code,
// transaction_status, fraud_status. order_id = merchant_ref kita.

function PaymentErrorContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const ref = searchParams.get("ref") ?? orderId;
  const transactionStatus = searchParams.get("transaction_status");

  let message = "Pembayaran belum selesai. Silakan coba lagi atau hubungi admin.";

  if (transactionStatus === "cancel") {
    message = "Pembayaran dibatalkan. Silakan coba lagi jika masih ingin membeli paket.";
  } else if (transactionStatus === "expire") {
    message = "Waktu pembayaran sudah habis. Buat transaksi baru jika ingin melanjutkan.";
  } else if (transactionStatus === "deny") {
    message = "Pembayaran ditolak. Silakan coba metode lain atau hubungi admin.";
  }

  const statusHref = ref
    ? `/payment/success?ref=${encodeURIComponent(ref)}`
    : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11110f] p-8 text-center">
        <div className="text-4xl">⚠️</div>

        <h1 className="mt-4 text-lg font-bold text-[#f2f0ea]">
          Pembayaran Belum Selesai
        </h1>

        <p className="mt-2 text-sm text-[#a7a39a]">{message}</p>

        {ref && (
          <div className="mt-4 rounded-xl border border-white/10 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[#a7a39a]">Ref</span>

              <span className="font-mono text-xs text-[#f2f0ea]">{ref}</span>
            </div>
          </div>
        )}

        <Link
          href={statusHref}
          className="mt-5 block w-full rounded-xl bg-[#b89b5e] py-3 text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72]"
        >
          Cek Status Pembayaran
        </Link>

        <Link
          href="/"
          className="mt-3 block w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-[#f2f0ea] transition hover:border-[#8f7747]"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}

export default function PaymentErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#080808]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89b5e] border-t-transparent" />
        </main>
      }
    >
      <PaymentErrorContent />
    </Suspense>
  );
}