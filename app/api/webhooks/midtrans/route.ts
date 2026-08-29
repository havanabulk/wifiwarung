import { NextResponse, NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  verifyMidtransSignature,
  mapMidtransStatus,
  midtransTimeToIso,
  type MidtransNotification,
} from "@/lib/midtrans";
import { fulfillPaidTransaction } from "@/lib/transaction-fulfill";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    let payload: MidtransNotification;

    try {
      payload = JSON.parse(rawBody) as MidtransNotification;
    } catch {
      return NextResponse.json(
        { error: "Payload tidak valid." },
        { status: 400 },
      );
    }

    /* ---------- verifikasi signature ---------- */

    if (!verifyMidtransSignature(payload)) {
      console.error("MIDTRANS NOTIFICATION: signature tidak valid");

      return NextResponse.json(
        { error: "Signature tidak valid." },
        { status: 400 },
      );
    }

    const merchantRef = payload.order_id;

    if (!merchantRef) {
      return NextResponse.json(
        { error: "order_id tidak ditemukan." },
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
      console.error(
        "MIDTRANS NOTIFICATION: transaksi tidak ditemukan:",
        merchantRef,
      );

      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 400 },
      );
    }

    /* ---------- proses berdasarkan status ---------- */

    const status = mapMidtransStatus(payload);

    if (status === "paid") {
      const paidAt =
        midtransTimeToIso(payload.settlement_time) ?? new Date().toISOString();
      const amountReceived =
        Number(payload.gross_amount) > 0
          ? Math.round(Number(payload.gross_amount))
          : tx.amount;

      await service
        .from("transactions")
        .update({
          status: "paid",
          paid_at: paidAt,
          payment_method_code: payload.payment_type,
          amount_received: amountReceived,
        })
        .eq("id", tx.id);

      if (tx.package_id) {
        await fulfillPaidTransaction(service, tx, {
          merchantRef,
          amountReceived,
          paidAt,
          paymentType: "midtrans",
        });
      } else {
        const { error: depositError } = await service.rpc(
          "apply_online_deposit",
          { p_transaction_id: tx.id },
        );

        if (depositError) {
          console.error(
            "MIDTRANS NOTIFICATION: gagal kredit deposit:",
            depositError,
          );
        }
      }
    } else if (
      status === "failed" ||
      status === "expired" ||
      status === "refunded"
    ) {
      await service.from("transactions").update({ status }).eq("id", tx.id);
    }

    return NextResponse.json({ status_code: 200, message: "OK" });
  } catch (error) {
    console.error("MIDTRANS NOTIFICATION API ERROR:", error);

    // tetap return 200 agar Midtrans tidak mengirim ulang berlebihan
    return NextResponse.json({ status_code: 200, message: "OK" });
  }
}
