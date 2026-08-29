import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Aktivasi transaksi yang sudah lunas (paid): buat akun guest bila perlu,
// catat package_order, dan auto-assign kredensial hotspot.
//
// Dipakai bersama oleh webhook Midtrans, sinkronisasi status, dan
// konfirmasi tunai (confirm-cash). Idempoten:
// - package_order dicek lewat ref_key (unique index ada di migrasi purchase_package)
// - hotspot_users dicek lewat package_order_id

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
      console.error(
        "FULFILL: gagal membuat akun guest:",
        createAuthError,
      );
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

  if (!orderId) {
    const startDate = new Date();
    let endDate: Date;

    if (pkg.duration_minutes && pkg.duration_minutes > 0) {
      endDate = new Date(startDate.getTime() + pkg.duration_minutes * 60 * 1000);
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

  /* ---------- auto-assign hotspot credentials ---------- */

  const { data: existingHotspot } = await service
    .from("hotspot_users")
    .select("id")
    .eq("package_order_id", orderId)
    .maybeSingle();

  if (existingHotspot) {
    return { hotspot: null };
  }

  try {
    const pin = String(Math.floor(100 + Math.random() * 900));

    let username: string | null = null;

    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000));

      const { data: existing } = await service
        .from("hotspot_users")
        .select("username")
        .eq("username", candidate)
        .maybeSingle();

      if (!existing) {
        username = candidate;
        break;
      }
    }

    if (username) {
      const { error: hotspotError } = await service
        .from("hotspot_users")
        .insert({
          username,
          pin,
          user_id: userId,
          package_order_id: orderId,
        });

      if (hotspotError) {
        console.error("FULFILL: gagal membuat hotspot credentials:", hotspotError);

        return { hotspot: null };
      }

      return { hotspot: { username, pin } };
    }
  } catch (hotspotErr) {
    console.error(
      "FULFILL: error assigning hotspot credentials:",
      hotspotErr,
    );
  }

  return { hotspot: null };
}