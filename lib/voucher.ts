export const VOUCHER_TYPES = ["balance", "duration"] as const;

export type VoucherType = (typeof VOUCHER_TYPES)[number];

export const MIN_VOUCHER_BALANCE = 1000;
export const MAX_VOUCHER_BALANCE = 10_000_000;

export const MIN_VOUCHER_DURATION_MINUTES = 5;
export const MAX_VOUCHER_DURATION_MINUTES = 43_200;

export const MAX_VOUCHERS_PER_BATCH = 500;

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateVoucherCode() {
  const bytes = new Uint8Array(8);

  crypto.getRandomValues(bytes);

  let code = "";

  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }

  return `W28-${code.slice(0, 4)}-${code.slice(4)}`;
}

export type BatchInput = {
  label?: unknown;
  type?: unknown;
  value?: unknown;
  count?: unknown;
  expiresInDays?: unknown;
};

export type ValidatedBatch = {
  label: string;
  type: VoucherType;
  value: number;
  count: number;
  expiresInDays: number | null;
};

export function validateBatchInput(
  input: BatchInput,
): { ok: true; data: ValidatedBatch } | { ok: false; error: string } {
  if (
    typeof input.label !== "string" ||
    input.label.trim().length < 1 ||
    input.label.trim().length > 120
  ) {
    return {
      ok: false,
      error: "Label batch wajib diisi (maksimal 120 karakter).",
    };
  }

  if (
    typeof input.type !== "string" ||
    !VOUCHER_TYPES.includes(input.type as VoucherType)
  ) {
    return {
      ok: false,
      error: "Tipe voucher harus balance atau duration.",
    };
  }

  const value = Number(input.value);

  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    return {
      ok: false,
      error: "Nilai voucher harus bilangan bulat positif.",
    };
  }

  if (input.type === "balance") {
    if (value < MIN_VOUCHER_BALANCE) {
      return {
        ok: false,
        error: `Minimal saldo voucher Rp ${MIN_VOUCHER_BALANCE.toLocaleString("id-ID")}.`,
      };
    }

    if (value > MAX_VOUCHER_BALANCE) {
      return {
        ok: false,
        error: `Maksimal saldo voucher Rp ${MAX_VOUCHER_BALANCE.toLocaleString("id-ID")}.`,
      };
    }
  } else {
    if (value < MIN_VOUCHER_DURATION_MINUTES) {
      return {
        ok: false,
        error: `Minimal durasi ${MIN_VOUCHER_DURATION_MINUTES} menit.`,
      };
    }

    if (value > MAX_VOUCHER_DURATION_MINUTES) {
      return {
        ok: false,
        error: `Maksimal durasi ${MAX_VOUCHER_DURATION_MINUTES.toLocaleString("id-ID")} menit.`,
      };
    }
  }

  const count = Number(input.count);

  if (!Number.isInteger(count) || count < 1 || count > MAX_VOUCHERS_PER_BATCH) {
    return {
      ok: false,
      error: `Jumlah voucher harus antara 1 dan ${MAX_VOUCHERS_PER_BATCH}.`,
    };
  }

  let expiresInDays: number | null = null;

  if (
    input.expiresInDays !== null &&
    input.expiresInDays !== undefined &&
    input.expiresInDays !== ""
  ) {
    const days = Number(input.expiresInDays);

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      return {
        ok: false,
        error: "Masa berlaku harus 1 sampai 365 hari.",
      };
    }

    expiresInDays = days;
  }

  return {
    ok: true,
    data: {
      label: input.label.trim(),
      type: input.type as VoucherType,
      value,
      count,
      expiresInDays,
    },
  };
}

export function formatVoucherValue(type: string, value: number) {
  if (type === "balance") {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (value % 1440 === 0) {
    const days = value / 1440;

    return `${days} hari`;
  }

  if (value % 60 === 0) {
    return `${value / 60} jam`;
  }

  return `${value} menit`;
}
