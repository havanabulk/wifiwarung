const MIN_DEPOSIT = 1000;
const MAX_DEPOSIT = 10_000_000;

export { MIN_DEPOSIT, MAX_DEPOSIT };

const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DepositInputData = {
  userId: string;
  amount: number;
  note: string | null;
  idempotencyKey: string | null;
};

export type ParseDepositResult =
  { ok: true; data: DepositInputData } | { ok: false; error: string };

export function parseDepositInput(body: unknown): ParseDepositResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    console.error("PARSE_DEPOSIT: body is not an object", {
      type: typeof body,
      isArray: Array.isArray(body),
    });

    return {
      ok: false,
      error: `Data deposit tidak valid (tipe: ${typeof body}).`,
    };
  }

  const b = body as Record<string, unknown>;

  const { user_id, amount, note, idempotencyKey } = b;

  let idempotencyKeyParam: string | null = null;

  if (idempotencyKey !== null && idempotencyKey !== undefined) {
    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim().length > 64
    ) {
      return {
        ok: false,
        error: "Idempotency key tidak valid.",
      };
    }

    idempotencyKeyParam =
      idempotencyKey.trim() === "" ? null : idempotencyKey.trim();
  }

  if (
    !user_id ||
    typeof user_id !== "string" ||
    !USER_ID_PATTERN.test(user_id)
  ) {
    return {
      ok: false,
      error: "User ID tidak valid.",
    };
  }

  const depositAmount = Number(amount);

  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    return {
      ok: false,
      error: "Jumlah deposit tidak valid.",
    };
  }

  if (!Number.isInteger(depositAmount)) {
    return {
      ok: false,
      error: "Nominal deposit harus bilangan bulat rupiah.",
    };
  }

  if (depositAmount < MIN_DEPOSIT) {
    return {
      ok: false,
      error: `Minimal deposit Rp ${MIN_DEPOSIT.toLocaleString("id-ID")}.`,
    };
  }

  if (depositAmount > MAX_DEPOSIT) {
    return {
      ok: false,
      error: `Maksimal deposit Rp ${MAX_DEPOSIT.toLocaleString("id-ID")} per transaksi.`,
    };
  }

  return {
    ok: true,
    data: {
      userId: user_id,
      amount: depositAmount,
      note: typeof note === "string" && note.trim() !== "" ? note.trim() : null,
      idempotencyKey: idempotencyKeyParam,
    },
  };
}
