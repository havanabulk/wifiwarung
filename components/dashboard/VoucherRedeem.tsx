"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VoucherRedeem() {
  const router = useRouter();

  const [code, setCode] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (submitting || code.trim() === "") {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Voucher gagal ditebus.",
        );

        return;
      }

      setSuccess(result.message ?? "Voucher berhasil ditebus.");

      setCode("");

      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="
        mt-5
        rounded-2xl
        border
        border-white/6
        bg-[#11110f]
        p-6
      "
    >
      <h3
        className="
          text-sm
          font-bold
          text-[#f2f0ea]
        "
      >
        Tebus Voucher
      </h3>

      <p
        className="
          mt-1
          text-xs
          text-[#a7a39a]
        "
      >
        Masukkan kode voucher untuk menambah saldo atau memperpanjang paket
        aktif.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="text"
          required
          maxLength={40}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="W28-XXXX-XXXX"
          className="
            flex-1
            rounded-xl
            border
            border-white/10
            bg-white/2
            px-4
            py-2.5
            font-mono
            text-sm
            tracking-wider
            text-[#f2f0ea]
            outline-none
            focus:border-[#c8ad72]/50
          "
        />

        <button
          type="submit"
          disabled={submitting}
          className="
            rounded-xl
            bg-[#c8ad72]
            px-5
            py-2.5
            text-sm
            font-bold
            text-[#17130c]
            transition
            hover:bg-[#d9c48d]
            disabled:opacity-50
          "
        >
          {submitting ? "Memproses..." : "Tebus"}
        </button>
      </form>

      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

      {success && <p className="mt-3 text-xs text-emerald-300">{success}</p>}
    </div>
  );
}
