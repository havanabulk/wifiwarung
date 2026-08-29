// Notifikasi ke n8n (VPS) saat order lunas.
//
// Alur produksi:
//   web (order lunas) -> n8n -> MikroTik (buat voucher)
//                        n8n -> WhatsApp/Telegram pelanggan
//                        n8n -> web (callback) catat kredensial di dashboard
//
// Fungsi ini hanya MENGIRIMKAN event. n8n yang berwenang membuat voucher di
// MikroTik dan menulis balik hasilnya lewat POST /api/webhooks/n8n.

export type OrderFulfilledPayload = {
  event: "order.fulfilled";
  merchant_ref: string;
  package_order_id: string | number | null;
  user_id: string | null;
  package: {
    id: number;
    name: string;
    price: number;
  } | null;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  transaction: {
    amount_received: number;
    paid_at: string | null;
    payment_type: string;
  };
  source: "midtrans_webhook" | "status_sync" | "cash" | "wallet";
};

export async function notifyOrderFulfilled(
  payload: OrderFulfilledPayload,
): Promise<void> {
  const url = process.env.N8N_ORDER_FULFILLED_URL;
  const token = process.env.N8N_WEBHOOK_TOKEN;

  if (!url || url.trim() === "") {
    console.warn(
      "N8N: N8N_ORDER_FULFILLED_URL belum diset — skip notifikasi ke n8n",
    );

    return;
  }

  try {
    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url.trim(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && token.trim() !== ""
          ? { Authorization: `Bearer ${token.trim()}` }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();

      console.error(
        `N8N: response tidak OK (${res.status}) untuk ${payload.merchant_ref}:`,
        text.slice(0, 300),
      );
    }
  } catch (err) {
    console.error(
      `N8N: gagal kirim order.fulfilled untuk ${payload.merchant_ref}:`,
      err,
    );
  }
}
