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

export function tripayApiKey(): string {
  return env("TRIPAY_API_KEY");
}

function tripayPrivateKey(): string {
  return env("TRIPAY_PRIVATE_KEY");
}

function tripayMerchantCode(): string {
  return env("TRIPAY_MERCHANT_CODE");
}

function isSandbox(): boolean {
  return process.env.TRIPAY_SANDBOX === "true";
}

/* ------------------------------------------------------------------ */
/*  Base URL                                                            */
/* ------------------------------------------------------------------ */

function baseUrl(): string {
  return isSandbox()
    ? "https://tripay.co.id/api-sandbox"
    : "https://tripay.co.id/api";
}

/* ------------------------------------------------------------------ */
/*  Signature: HMAC-SHA256(privateKey, merchantCode + merchantRef + amount) */
/* ------------------------------------------------------------------ */

export function createSignature(merchantRef: string, amount: number): string {
  const privateKey = tripayPrivateKey();
  const merchantCode = tripayMerchantCode();

  return crypto
    .createHmac("sha256", privateKey)
    .update(merchantCode + merchantRef + amount)
    .digest("hex");
}

/* ------------------------------------------------------------------ */
/*  Verify callback signature                                           */
/* ------------------------------------------------------------------ */

export function verifyCallbackSignature(
  rawBody: string,
  signature: string,
): boolean {
  const privateKey = tripayPrivateKey();

  const expected = crypto
    .createHmac("sha256", privateKey)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type TripayOrderItem = {
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  product_url?: string;
  image_url?: string;
};

export type TripayCreatePayload = {
  method: string;
  merchant_ref: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  order_items: TripayOrderItem[];
  callback_url?: string;
  return_url?: string;
  expired_time?: number;
  signature: string;
};

export type TripayCreateResponse = {
  success: boolean;
  message: string;
  data?: {
    reference: string;
    merchant_ref: string;
    payment_method: string;
    payment_name: string;
    customer_name: string;
    customer_email: string;
    pay_code: string | null;
    checkout_url: string | null;
    pay_url: string | null;
    amount: number;
    fee_merchant: number;
    fee_customer: number;
    total_fee: number;
    amount_received: number;
    status: string;
    expired_time: number;
    qr_string: string | null;
    qr_url: string | null;
    instructions: Array<{
      title: string;
      steps: string[];
    }>;
    order_items: Array<{
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }>;
  };
};

export type TripayDetailResponse = {
  success: boolean;
  message: string;
  data?: {
    reference: string;
    merchant_ref: string;
    payment_method: string;
    payment_name: string;
    amount: number;
    fee_merchant: number;
    fee_customer: number;
    amount_received: number;
    pay_code: string | null;
    status: string;
    paid_at: number | null;
    expired_time: number;
    checkout_url: string | null;
    qr_string: string | null;
    qr_url: string | null;
    instructions: Array<{
      title: string;
      steps: string[];
    }>;
    order_items: Array<{
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
    }>;
  };
};

export type TripayCallbackData = {
  reference: string;
  merchant_ref: string | null;
  payment_method: string;
  payment_method_code: string;
  total_amount: number;
  fee_merchant: number;
  fee_customer: number;
  total_fee: number;
  amount_received: number;
  is_closed_payment: number;
  status: "PAID" | "FAILED" | "EXPIRED" | "REFUND";
  paid_at: number | null;
  note: string | null;
};

export type TripayPaymentChannel = {
  group: string;
  code: string;
  name: string;
  type: "direct" | "redirect";
  fee_merchant: { flat: number; percent: number };
  fee_customer: { flat: number; percent: number };
  total_fee: { flat: number; percent: string };
  minimum_amount: number;
  maximum_amount: number;
  icon_url: string;
  active: boolean;
};

/* ------------------------------------------------------------------ */
/*  API calls                                                           */
/* ------------------------------------------------------------------ */

export async function createTripayTransaction(
  payload: TripayCreatePayload,
): Promise<TripayCreateResponse> {
  const url = `${baseUrl()}/transaction/create`;

  const params = new URLSearchParams();

  params.append("method", payload.method);
  params.append("merchant_ref", payload.merchant_ref);
  params.append("amount", payload.amount.toString());
  params.append("customer_name", payload.customer_name);
  params.append("customer_email", payload.customer_email);

  if (payload.customer_phone) {
    params.append("customer_phone", payload.customer_phone);
  }

  if (payload.callback_url) {
    params.append("callback_url", payload.callback_url);
  }

  if (payload.return_url) {
    params.append("return_url", payload.return_url);
  }

  if (payload.expired_time) {
    params.append("expired_time", payload.expired_time.toString());
  }

  params.append("signature", payload.signature);

  payload.order_items.forEach((item, i) => {
    params.append(`order_items[${i}][name]`, item.name);
    params.append(`order_items[${i}][price]`, item.price.toString());
    params.append(`order_items[${i}][quantity]`, item.quantity.toString());

    if (item.sku) {
      params.append(`order_items[${i}][sku]`, item.sku);
    }

    if (item.product_url) {
      params.append(`order_items[${i}][product_url]`, item.product_url);
    }

    if (item.image_url) {
      params.append(`order_items[${i}][image_url]`, item.image_url);
    }
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tripayApiKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  return response.json() as Promise<TripayCreateResponse>;
}

export async function getTripayTransactionDetail(
  reference: string,
): Promise<TripayDetailResponse> {
  const url = `${baseUrl()}/transaction/detail?reference=${reference}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tripayApiKey()}`,
    },
  });

  return response.json() as Promise<TripayDetailResponse>;
}

export async function getTripayPaymentChannels(): Promise<
  TripayPaymentChannel[]
> {
  const url = `${baseUrl()}/merchant/payment-channel`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tripayApiKey()}`,
    },
  });

  const data = (await response.json()) as {
    success: boolean;
    data?: TripayPaymentChannel[];
  };

  return data.data ?? [];
}
