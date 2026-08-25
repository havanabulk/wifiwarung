import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCallbackSignature } from "@/lib/tripay";
import type { TripayCallbackData } from "@/lib/tripay";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    /* ---------- baca body mentah untuk verifikasi signature ---------- */

    const rawBody = await request.text();

    const signature = request.headers.get("X-Callback-Signature") ?? "";
    const event = request.headers.get("X-Callback-Event") ?? "";

    /* ---------- verifikasi signature ---------- */

    if (!verifyCallbackSignature(rawBody, signature)) {
      console.error("TRIPAY CALLBACK: signature tidak valid");

      return NextResponse.json(
        { error: "Signature tidak valid." },
        { status: 400 },
      );
    }

    /* ---------- abaikan event selain payment_status ---------- */

    if (event !== "payment_status") {
      return NextResponse.json({ success: true });
    }

    /* ---------- parse body ---------- */

    let payload: TripayCallbackData;

    try {
      payload = JSON.parse(rawBody) as TripayCallbackData;
    } catch {
      return NextResponse.json(
        { error: "Payload tidak valid." },
        { status: 400 },
      );
    }

    const merchantRef = payload.merchant_ref;

    if (!merchantRef) {
      return NextResponse.json(
        { error: "merchant_ref tidak ditemukan." },
        { status: 400 },
      );
    }

    /* ---------- cari transaksi ---------- */

    const service = createServiceClient();

    const { data: tx, error: txError } = await service
      .from("transactions")
      .select("*, packages(id, name, price, duration_minutes)")
      .eq("merchant_ref", merchantRef)
      .single();

    if (txError || !tx) {
      console.error("TRIPAY CALLBACK: transaksi tidak ditemukan:", merchantRef);

      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 400 },
      );
    }

    /* ---------- proses berdasarkan status ---------- */

    if (payload.status === "PAID") {
      const paidAt = payload.paid_at
        ? new Date(payload.paid_at * 1000).toISOString()
        : new Date().toISOString();

      // update transaksi
      await service
        .from("transactions")
        .update({
          status: "paid",
          paid_at: paidAt,
          amount_received: payload.amount_received,
          fee_merchant: payload.fee_merchant,
          fee_customer: payload.fee_customer,
        })
        .eq("id", tx.id);

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
            "TRIPAY CALLBACK: gagal membuat akun guest:",
            createAuthError,
          );
        } else {
          userId = authData.user.id;

          // buat profil
          await service.from("profiles").insert({
            id: userId,
            username: tx.guest_email.split("@")[0],
            full_name: tx.guest_name ?? tx.guest_email,
            phone: tx.guest_phone ?? null,
            role: "customer",
            status: "active",
          });

          // buat wallet
          await service
            .from("wallets")
            .upsert({ user_id: userId, balance: 0 }, { onConflict: "user_id" });
        }
      }

      /* ---------- buat package_order ---------- */

      const pkg = tx.packages as {
        id: number;
        name: string;
        price: number;
        duration_minutes: number | null;
      } | null;

      if (userId && pkg) {
        const now = new Date();
        let endDate: Date;

        if (pkg.duration_minutes && pkg.duration_minutes > 0) {
          endDate = new Date(now.getTime() + pkg.duration_minutes * 60 * 1000);
        } else {
          endDate = new Date(now);
          endDate.setDate(endDate.getDate() + 30);
        }

        const { data: orderData, error: orderError } = await service
          .from("package_orders")
          .insert({
            user_id: userId,
            package_id: pkg.id,
            price: payload.amount_received,
            status: "active",
            start_at: now.toISOString(),
            end_at: endDate.toISOString(),
            payment_type: "tripay",
            ref_key: merchantRef,
          })
          .select("id")
          .single();

        if (orderError) {
          console.error(
            "TRIPAY CALLBACK: gagal membuat package_order:",
            orderError,
          );
        } else if (orderData) {
          // update transaksi dengan package_order_id dan user_id
          await service
            .from("transactions")
            .update({
              package_order_id: orderData.id,
              user_id: userId,
            })
            .eq("id", tx.id);

          // auto-assign hotspot credentials
          try {
            const pin = String(Math.floor(100 + Math.random() * 900));

            // generate unique 4-digit username
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
                  package_order_id: orderData.id,
                });

              if (hotspotError) {
                console.error(
                  "TRIPAY CALLBACK: gagal membuat hotspot credentials:",
                  hotspotError,
                );
              }
            }
          } catch (hotspotErr) {
            console.error(
              "TRIPAY CALLBACK: error assigning hotspot credentials:",
              hotspotErr,
            );
          }
        }
      }
    } else if (
      payload.status === "FAILED" ||
      payload.status === "EXPIRED" ||
      payload.status === "REFUND"
    ) {
      const statusMap: Record<string, string> = {
        FAILED: "failed",
        EXPIRED: "expired",
        REFUND: "refunded",
      };

      await service
        .from("transactions")
        .update({ status: statusMap[payload.status] })
        .eq("id", tx.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TRIPAY CALLBACK API ERROR:", error);

    // tetap return success agar Tripay tidak retry
    return NextResponse.json({ success: true });
  }
}
