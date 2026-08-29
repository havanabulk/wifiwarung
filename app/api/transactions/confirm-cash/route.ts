import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireUser } from "@/lib/auth/user";
import { notifyOrderFulfilled } from "@/lib/n8n";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();

    const { merchantRef } = body as { merchantRef?: unknown };

    if (typeof merchantRef !== "string" || merchantRef.trim() === "") {
      return NextResponse.json(
        { error: "Kode transaksi wajib diisi." },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    /* ---------- cari transaksi ---------- */

    const { data: tx, error: txError } = await service
      .from("transactions")
      .select("*, packages(id, name, price, duration_minutes)")
      .eq("merchant_ref", merchantRef.trim())
      .eq("payment_method_code", "CASH")
      .single();

    if (txError || !tx) {
      return NextResponse.json(
        { error: "Transaksi tunai tidak ditemukan." },
        { status: 404 },
      );
    }

    if (tx.status === "paid") {
      return NextResponse.json(
        { error: "Transaksi sudah dikonfirmasi sebelumnya." },
        { status: 400 },
      );
    }

    if (tx.status === "expired" || tx.status === "failed") {
      return NextResponse.json(
        { error: "Transaksi sudah tidak berlaku." },
        { status: 400 },
      );
    }

    /* ---------- update status → paid ---------- */

    const now = new Date().toISOString();

    await service
      .from("transactions")
      .update({
        status: "paid",
        paid_at: now,
        amount_received: tx.amount,
      })
      .eq("id", tx.id);

    /* ---------- buat akun untuk guest ---------- */

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
          "CASH CONFIRM: gagal membuat akun guest:",
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

    /* ---------- buat package_order ---------- */

    const pkg = tx.packages as {
      id: number;
      name: string;
      price: number;
      duration_minutes: number | null;
    } | null;

    if (userId && pkg) {
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
          price: pkg.price,
          status: "active",
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          payment_type: "cash",
          ref_key: tx.merchant_ref,
        })
        .select("id")
        .single();

      if (orderError) {
        console.error("CASH CONFIRM: gagal membuat package_order:", orderError);
      } else if (orderData) {
        await service
          .from("transactions")
          .update({
            package_order_id: orderData.id,
            user_id: userId,
          })
          .eq("id", tx.id);

        await notifyOrderFulfilled({
          event: "order.fulfilled",
          merchant_ref: tx.merchant_ref,
          package_order_id: orderData.id,
          user_id: userId,
          package: {
            id: pkg.id,
            name: pkg.name,
            price: pkg.price,
          },
          customer: {
            name: tx.guest_name,
            email: tx.guest_email,
            phone: tx.guest_phone,
          },
          transaction: {
            amount_received: tx.amount,
            paid_at: now,
            payment_type: "cash",
          },
          source: "cash",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pembayaran tunai berhasil dikonfirmasi.",
    });
  } catch (error) {
    console.error("CASH CONFIRM API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
