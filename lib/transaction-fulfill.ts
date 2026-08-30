import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyOrderFulfilled } from "@/lib/n8n";

// Aktivasi transaksi yang sudah lunas (paid): buat akun guest bila perlu dan
// catat package_order. Kredensial WiFi (W28-...) lalu diterbitkan oleh
// sinkronisasi MikroTik eksternal — kode ini tidak membuat voucher sendiri.
//
// Dipakai bersama oleh webhook Midtrans dan sinkronisasi status. Idempoten:
// - package_order dicek lewat ref_key (unique index ada di migrasi purchase_package)
// - kredensial WiFi (W28-...) diterbitkan oleh sinkronisasi MikroTik eksternal
//   dari package_orders yang mikrotik_status = 'pending'

export type TransactionForFulfill = {
  id: string | number;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  merchant_ref: string;
  packages: {
    id: number;
    name: string;
    price: number;
    duration_minutes: number | null;
  } | null;
};

export type FulfillOptions = {
  merchantRef: string;
  amountReceived: number;
  paidAt: string;
  paymentType: "midtrans" | "cash";
};

export type FulfillResult = {
  hotspot: { username: string; pin: string } | null;
};

export async function fulfillPaidTransaction(
  service: SupabaseClient,
  tx: TransactionForFulfill,
  options: FulfillOptions,
): Promise<FulfillResult> {
  /* ---------- buat akun untuk guest (tanpa user_id) ---------- */

  let userId = tx.user_id;

  if (!userId && tx.guest_email) {
    const randomPassword = crypto.randomBytes(16).toString("hex");

    const { data: authData, error: createAuthError } =
      await service.auth.admin.createUser({
        email: tx.guest_email,
        email_confirm: true,
        password: randomPassword,
      });

    if (createAuthError || !authData?.user) {
      console.error("FULFILL: gagal membuat akun guest:", createAuthError);
    } else {
      userId = authData.user.id;

      await service.from("profiles").insert({
        id: userId,
        username: tx.guest_email.split("@")[0],
        full_name: tx.guest_name ?? tx.guest_email,
        phone: tx.guest_phone ?? null,
        role: "customer",
        status: "active",
      });

      await service
        .from("wallets")
        .upsert({ user_id: userId, balance: 0 }, { onConflict: "user_id" });
    }
  }

  const pkg = tx.packages;

  if (!userId || !pkg) {
    return { hotspot: null };
  }

  /* ---------- buat package_order (idempoten via ref_key) ---------- */

  const { data: existingOrder } = await service
    .from("package_orders")
    .select("id")
    .eq("ref_key", options.merchantRef)
    .maybeSingle();

  let orderId: string | null = existingOrder?.id ?? null;

  const created = !orderId;

  if (!orderId) {
    const startDate = new Date();
    let endDate: Date;

    if (pkg.duration_minutes && pkg.duration_minutes > 0) {
      endDate = new Date(
        startDate.getTime() + pkg.duration_minutes * 60 * 1000,
      );
    } else {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
    }

    const { data: orderData, error: orderError } = await service
      .from("package_orders")
      .insert({
        user_id: userId,
        package_id: pkg.id,
        price: options.amountReceived,
        status: "active",
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        payment_type: options.paymentType,
        ref_key: options.merchantRef,
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("FULFILL: gagal membuat package_order:", orderError);

      return { hotspot: null };
    }

    orderId = orderData.id;
  }

  /* ---------- kaitkan order ke transaksi ---------- */

  await service
    .from("transactions")
    .update({
      package_order_id: orderId,
      user_id: userId,
    })
    .eq("id", tx.id);

  /* ---------- beri tahu n8n untuk buat voucher di MikroTik ---------- */

  if (created) {
    const { data: customerProfile } = await service
      .from("profiles")
      .select("device_mac")
      .eq("id", userId)
      .maybeSingle();

    await notifyOrderFulfilled({
      event: "order.fulfilled",
      merchant_ref: options.merchantRef,
      package_order_id: orderId,
      user_id: userId,
      package: {
        id: pkg.id,
        name: pkg.name,
        price: options.amountReceived,
      },
      customer: {
        name: tx.guest_name,
        email: tx.guest_email,
        phone: tx.guest_phone,
        device_mac: customerProfile?.device_mac ?? null,
      },
      transaction: {
        amount_received: options.amountReceived,
        paid_at: options.paidAt,
        payment_type: options.paymentType,
      },
      source: options.paymentType === "cash" ? "cash" : "midtrans_webhook",
    });
  }

  return { hotspot: null };
}
