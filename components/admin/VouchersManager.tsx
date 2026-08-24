"use client";

import { useEffect, useState } from "react";
import {
  MAX_VOUCHERS_PER_BATCH,
  formatVoucherValue,
} from "@/lib/voucher";

type BatchRow = {
  id: number;
  label: string;
  type: string;
  value: number | string;
  count: number;
  created_by: string | null;
  created_at: string;
  redeemedCount?: number;
};

type VoucherCodeRow = {
  id: number;
  code: string;
  type: string;
  value: number | string;
  active: boolean;
  redeemed_at: string | null;
  expires_at: string | null;
  redeemedByUsername: string | null;
};

function formatDateTimeWIB(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default function VouchersManager() {
  const [batches, setBatches] = useState<
    BatchRow[]
  >([]);

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [form, setForm] = useState({
    label: "",
    type: "balance",
    value: "",
    count: "10",
    expiresInDays: "",
  });

  const [creating, setCreating] =
    useState(false);

  const [formError, setFormError] = useState<
    string | null
  >(null);

  const [generatedCodes, setGeneratedCodes] =
    useState<string[] | null>(null);

  const [codesModal, setCodesModal] = useState<{
    batch: BatchRow;
    vouchers: VoucherCodeRow[];
    page: number;
    totalPages: number;
    loading: boolean;
  } | null>(null);

  async function loadBatches(
    targetPage: number
  ) {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/vouchers?page=${targetPage}`
      );

      const result = await response.json();

      if (response.ok) {
        setBatches(result.batches ?? []);
        setPage(result.page ?? 1);
        setTotalPages(result.totalPages ?? 1);
      }
    } catch {
      // Biarkan data lama tampil saat gagal.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          "/api/admin/vouchers?page=1"
        );

        const result =
          await response.json();

        if (!cancelled && response.ok) {
          setBatches(
            result.batches ?? []
          );

          setPage(result.page ?? 1);

          setTotalPages(
            result.totalPages ?? 1
          );
        }
      } catch {
        // Tampilan kosong + loading selesai.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitBatch(event: React.FormEvent) {
    event.preventDefault();

    if (creating) return;

    setCreating(true);
    setFormError(null);
    setGeneratedCodes(null);

    try {
      const response = await fetch(
        "/api/admin/vouchers",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            label: form.label,
            type: form.type,
            value: Number(form.value),
            count: Number(form.count),
            expiresInDays:
              form.expiresInDays === ""
                ? null
                : Number(form.expiresInDays),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setFormError(
          typeof result.error === "string"
            ? result.error
            : "Batch gagal dibuat."
        );

        return;
      }

      setGeneratedCodes(result.codes ?? []);
      setForm({
        label: "",
        type: form.type,
        value: "",
        count: form.count,
        expiresInDays: "",
      });

      await loadBatches(1);
    } catch {
      setFormError(
        "Terjadi kesalahan jaringan."
      );
    } finally {
      setCreating(false);
    }
  }

  async function openCodesModal(batch: BatchRow) {
    setCodesModal({
      batch,
      vouchers: [],
      page: 1,
      totalPages: 1,
      loading: true,
    });

    await loadCodes(batch, 1);
  }

  async function loadCodes(
    batch: BatchRow,
    targetPage: number
  ) {
    try {
      const response = await fetch(
        `/api/admin/vouchers/codes?batchId=${batch.id}&page=${targetPage}`
      );

      const result = await response.json();

      if (!response.ok) {
        return;
      }

      setCodesModal((prev) =>
        prev && prev.batch.id === batch.id
          ? {
              ...prev,
              vouchers: result.vouchers ?? [],
              page: result.page ?? 1,
              totalPages:
                result.totalPages ?? 1,
              loading: false,
            }
          : prev
      );
    } catch {
      setCodesModal((prev) =>
        prev ? { ...prev, loading: false } : prev
      );
    }
  }

  function copyAllCodes(codes: string[]) {
    void navigator.clipboard.writeText(
      codes.join("\n")
    );
  }

  return (
    <div className="space-y-10">

      {/* FORM GENERATE */}

      <section className="rounded-2xl border border-white/6 bg-[#11110f] p-6">
        <h2 className="text-lg font-bold text-[#f2f0ea]">
          Buat Batch Voucher
        </h2>

        <form
          onSubmit={submitBatch}
          className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-xs text-[#a7a39a]">
              Label batch
            </label>

            <input
              type="text"
              required
              maxLength={120}
              value={form.label}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  label: event.target.value,
                }))
              }
              placeholder="Voucher promo Agustus"
              className="w-full rounded-xl border border-white/10 bg-white/2 px-3.5 py-2.5 text-sm text-[#f2f0ea] outline-none focus:border-[#c8ad72]/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#a7a39a]">
              Tipe
            </label>

            <select
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-white/2 px-3 py-2.5 text-sm text-[#f2f0ea] outline-none focus:border-[#c8ad72]/50"
            >
              <option value="balance">
                Saldo
              </option>
              <option value="duration">
                Durasi Paket
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#a7a39a]">
              {form.type === "balance"
                ? "Nilai (Rp)"
                : "Durasi (menit)"}
            </label>

            <input
              type="number"
              required
              min={1}
              value={form.value}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  value: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-white/2 px-3.5 py-2.5 text-sm text-[#f2f0ea] outline-none focus:border-[#c8ad72]/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#a7a39a]">
              Jumlah kode
            </label>

            <input
              type="number"
              required
              min={1}
              max={MAX_VOUCHERS_PER_BATCH}
              value={form.count}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  count: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-white/2 px-3.5 py-2.5 text-sm text-[#f2f0ea] outline-none focus:border-[#c8ad72]/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#a7a39a]">
              Berlaku (hari, opsional)
            </label>

            <input
              type="number"
              min={1}
              max={365}
              value={form.expiresInDays}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  expiresInDays:
                    event.target.value,
                }))
              }
              className="w-full rounded-xl border border-white/10 bg-white/2 px-3.5 py-2.5 text-sm text-[#f2f0ea] outline-none focus:border-[#c8ad72]/50"
            />
          </div>

          <div className="flex items-end lg:col-span-4">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-[#c8ad72] px-5 py-2.5 text-sm font-bold text-[#17130c] transition hover:bg-[#d9c48d] disabled:opacity-50"
            >
              {creating
                ? "Membuat..."
                : "Generate"}
            </button>
          </div>
        </form>

        {formError && (
          <p className="mt-3 text-sm text-red-300">
            {formError}
          </p>
        )}

        {generatedCodes && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-emerald-300">
                {generatedCodes.length}{" "}
                kode berhasil dibuat.
              </p>

              <button
                type="button"
                onClick={() =>
                  copyAllCodes(generatedCodes)
                }
                className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10"
              >
                Salin semua
              </button>
            </div>

            <div className="mt-3 grid max-h-40 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-4">
              {generatedCodes.map((code) => (
                <span
                  key={code}
                  className="rounded-md bg-black/30 px-2 py-1 font-mono text-xs text-[#f2f0ea]"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>


      {/* DAFTAR BATCH */}

      <section>
        <h2 className="text-lg font-bold text-[#f2f0ea]">
          Daftar Batch
        </h2>

        {loading ? (

          <p className="mt-4 text-sm text-[#a7a39a]">
            Memuat...
          </p>

        ) : batches.length === 0 ? (

          <p className="mt-4 text-sm text-[#a7a39a]">
            Belum ada batch voucher.
          </p>

        ) : (

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/6">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/2 text-xs uppercase tracking-wide text-[#a7a39a]">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Label
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    Nilai
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    Terpakai
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    Dibuat
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-[#f2f0ea]">
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-5 py-3.5">
                      {batch.label}
                    </td>

                    <td className="px-5 py-3.5">
                      {formatVoucherValue(
                        batch.type,
                        Number(batch.value)
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {batch.redeemedCount ?? 0}
                      {" / "}
                      {batch.count}
                    </td>

                    <td className="px-5 py-3.5 text-[#a7a39a]">
                      {formatDateTimeWIB(
                        batch.created_at
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          openCodesModal(batch)
                        }
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/5"
                      >
                        Lihat Kode
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && !loading && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-[#a7a39a]">
              Halaman {page} dari{" "}
              {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  void loadBatches(page - 1)
                }
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5 disabled:text-white/20"
              >
                ← Sebelumnya
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  void loadBatches(page + 1)
                }
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5 disabled:text-white/20"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </section>


      {/* MODAL KODE */}

      {codesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#11110f] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#f2f0ea]">
                  {codesModal.batch.label}
                </h3>

                <p className="mt-1 text-xs text-[#a7a39a]">
                  {formatVoucherValue(
                    codesModal.batch.type,
                    Number(codesModal.batch.value)
                  )}{" "}
                  •{" "}
                  {codesModal.batch.redeemedCount ?? 0}
                  /
                  {codesModal.batch.count}{" "}
                  terpakai
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCodesModal(null)
                }
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5"
              >
                Tutup
              </button>
            </div>

            {codesModal.loading ? (

              <p className="mt-6 text-sm text-[#a7a39a]">
                Memuat kode...
              </p>

            ) : codesModal.vouchers.length ===
              0 ? (

              <p className="mt-6 text-sm text-[#a7a39a]">
                Tidak ada kode.
              </p>

            ) : (
              <>
                <ul className="mt-5 divide-y divide-white/5 rounded-xl border border-white/6">
                  {codesModal.vouchers.map(
                    (voucher) => (
                      <li
                        key={voucher.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <span className="font-mono text-sm text-[#f2f0ea]">
                          {voucher.code}
                        </span>

                        {voucher.redeemed_at ? (
                          <span className="text-right text-xs text-emerald-300">
                            Ditebus{" "}
                            {voucher.redeemedByUsername
                              ? `oleh ${voucher.redeemedByUsername}`
                              : ""}
                            {" "}
                            {formatDateTimeWIB(
                              voucher.redeemed_at
                            )}
                          </span>
                        ) : voucher.active ? (
                          <span className="text-xs text-[#a7a39a]">
                            Belum ditebus
                          </span>
                        ) : (
                          <span className="text-xs text-red-300">
                            Nonaktif
                          </span>
                        )}
                      </li>
                    )
                  )}
                </ul>

                {codesModal.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-xs text-[#a7a39a]">
                    <span>
                      Halaman {codesModal.page}{" "}
                      dari {codesModal.totalPages}
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={
                          codesModal.page <= 1
                        }
                        onClick={() =>
                          void loadCodes(
                            codesModal.batch,
                            codesModal.page - 1
                          )
                        }
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-white/60 transition hover:bg-white/5 disabled:text-white/20"
                      >
                        ←
                      </button>

                      <button
                        type="button"
                        disabled={
                          codesModal.page >=
                          codesModal.totalPages
                        }
                        onClick={() =>
                          void loadCodes(
                            codesModal.batch,
                            codesModal.page + 1
                          )
                        }
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-white/60 transition hover:bg-white/5 disabled:text-white/20"
                      >
                        →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
