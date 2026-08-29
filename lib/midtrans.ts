import crypto from "crypto";

/* ------------------------------------------------------------------ */
/*  Environment variables                                              */
/* ------------------------------------------------------------------ */

function env(name: string): string {
  const val = process.env[name];

  if (!val) {
    throw new Error(`${name} belum dikonfigurasi di .env.local`);
  }

  return val;
}

export function midtransServerKey(): string {
  return env("MIDTRANS_SERVER_KEY");
}

export function midtransClientKey(): string {
  return env("MIDTRANS_CLIENT_KEY");
}

export function isMidtransProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

/* ------------------------------------------------------------------ */
/*  Base URL                                                            */
/* ------------------------------------------------------------------ */

function snapBaseUrl(): string {
  return isMidtransProduction()
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

function apiBaseUrl(): string {
  return isMidtransProduction()
    ? "https://api.midtrans.com"
    : "https://api.sandbox.veritrans.co.id";
}

function basicAuth(): string {
  const key = midtransServerKey();

  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type MidtransSnapPayload = {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemName: string;
  finishUrl: string;
};

export type MidtransSnapResponse = {
  token?: string;
  redirect_url?: string;
  status_code?: string;
  status_message?: string;
  error_messages?: string[];
};

export type MidtransNotification = {
  order_id: string;
  status_code: string;
  status_message?: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type: string;
  transaction_time?: string;
  settlement_time?: string;
  gross_amount: string;
  signature_key?: string;
};

export type MidtransStatusDetail = {
  order_id: string;
  status_code: string;
  status_message?: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type: string;
  transaction_time?: string;
  settlement_time?: string;
  gross_amount: string;
};

export type PaymentStatus =
  "pending" | "paid" | "failed" | "expired" | "refunded";

/* ------------------------------------------------------------------ */
/*  Signature verification                                              */
/* ------------------------------------------------------------------ */

function sha512(input: string): string {
  return crypto.createHash("sha512").update(input).digest("hex");
}

function normalizeGrossAmount(value: string): string {
  const num = Number(value);

  if (Number.isFinite(num) && Number.isInteger(num)) {
    return String(num);
  }

  return value;
}

// Midtrans menghitung signature_key sebagai SHA512 gabungan
// order_id + status_code + gross_amount + ServerKey (Snap) atau
// ServerKey + order_id + status_code + gross_amount (Core API).
// Dicek beberapa varian agar aman terhadap perbedaan konvensi & format.
export function verifyMidtransSignature(
  payload: MidtransNotification,
): boolean {
  if (!payload.signature_key) {
    return false;
  }

  const serverKey = midtransServerKey();
  const rawParts = [
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
  ];
  const normalizedParts = [
    payload.order_id,
    payload.status_code,
    normalizeGrossAmount(payload.gross_amount),
  ];

  const candidates = [
    sha512(rawParts.join("") + serverKey),
    sha512(serverKey + rawParts.join("")),
    sha512(normalizedParts.join("") + serverKey),
    sha512(serverKey + normalizedParts.join("")),
  ];

  return candidates.includes(payload.signature_key);
}

/* ------------------------------------------------------------------ */
/*  Status mapping                                                      */
/* ------------------------------------------------------------------ */

export function mapMidtransStatus(
  detail: Pick<MidtransNotification, "transaction_status" | "fraud_status">,
): PaymentStatus | null {
  const s = detail.transaction_status;

  if (s === "capture") {
    if (detail.fraud_status === "accept") {
      return "paid";
    }

    if (detail.fraud_status === "deny") {
      return "failed";
    }

    return "pending"; // challenge
  }

  if (s === "settlement") {
    return "paid";
  }

  if (s === "pending") {
    return "pending";
  }

  if (s === "deny" || s === "cancel" || s === "failure") {
    return "failed";
  }

  if (s === "expire") {
    return "expired";
  }

  if (s === "refund" || s === "partial_refund") {
    return "refunded";
  }

  return null;
}

// Waktu dari Midtrans berformat "YYYY-MM-DD HH:mm:ss" tanpa zona
// (waktu GMT+7). Dikonversi ke ISO 8601 +07:00 agar tersimpan benar
// di kolom timestamptz.
export function midtransTimeToIso(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(" ", "T");

  return `${normalized}+07:00`;
}

/* ------------------------------------------------------------------ */
/*  API calls                                                           */
/* ------------------------------------------------------------------ */

export async function createSnapTransaction(
  payload: MidtransSnapPayload,
): Promise<MidtransSnapResponse> {
  const url = `${snapBaseUrl()}/snap/v1/transactions`;

  const now = new Date();
  const startTime = now.toISOString().slice(0, 19).replace("T", " ") + " +0000";

  const body = {
    transaction_details: {
      order_id: payload.orderId,
      gross_amount: payload.grossAmount,
    },
    item_details: [
      {
        id: "PACKAGE",
        price: payload.grossAmount,
        quantity: 1,
        name: payload.itemName,
      },
    ],
    customer_details: {
      first_name: payload.customerName,
      email: payload.customerEmail,
      ...(payload.customerPhone ? { phone: payload.customerPhone } : {}),
    },
    callbacks: {
      finish: payload.finishUrl,
    },
    expiry: {
      start_time: startTime,
      unit: "minutes",
      duration: 60,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as MidtransSnapResponse;

  if (!response.ok && !data.token) {
    throw new Error(
      `MIDTRANS SNAP ${response.status}: ${
        data.status_message ??
        data.error_messages?.join(", ") ??
        response.statusText
      }`,
    );
  }

  return data;
}

export async function getMidtransTransactionStatus(
  orderId: string,
): Promise<MidtransStatusDetail | null> {
  const url = `${apiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: basicAuth(),
      Accept: "application/json",
    },
  });

  const data = (await response.json()) as MidtransStatusDetail;

  // order_id tidak dikenal (status_code "404") -> bukan transaksi Midtrans kita
  if (data.status_code === "404") {
    return null;
  }

  if (!response.ok) {
    console.error(
      "MIDTRANS STATUS FETCH ERROR:",
      response.status,
      data.status_message,
    );

    return null;
  }

  return data;
}

export type MidtransCancelResponse = {
  status_code: string;
  status_message: string;
};

export type MidtransCancelResult = {
  ok: boolean;
  response: MidtransCancelResponse | null;
};

// Membatalkan transaksi di Midtrans yang masih pending.
// Sukses: status_code "200"/"201". Order tidak dikenal di gateway
// (status_code "404") dianggap berhasil karena tidak ada yang perlu dibatalkan.
export async function cancelMidtransTransaction(
  orderId: string,
): Promise<MidtransCancelResult> {
  const url = `${apiBaseUrl()}/v2/${encodeURIComponent(orderId)}/cancel`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = (await response
    .json()
    .catch(() => null)) as MidtransCancelResponse | null;

  const ok =
    response.ok ||
    data?.status_code === "200" ||
    data?.status_code === "201" ||
    data?.status_code === "404";

  if (!ok) {
    console.error(
      "MIDTRANS CANCEL ERROR:",
      response.status,
      data?.status_message,
    );
  }

  return { ok, response: data };
}
