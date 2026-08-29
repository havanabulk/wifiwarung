import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getMidtransTransactionStatus,
  mapMidtransStatus,
  midtransTimeToIso,
} from "@/lib/midtrans";
import { fulfillPaidTransaction } from "@/lib/transaction-fulfill";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { id: merchantRef } = await context.params;

    if (typeof merchantRef !== "string" || merchantRef.trim() === "") {
      return NextResponse.json(
        { error: "Referensi transaksi tidak valid." },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    const { data: tx, error: txError } = await service
      .from("transactions")
      .select("*, packages(id, name, price, duration_minutes)")
      .eq("merchant_ref", merchantRef.trim())
      .single();

    if (txError || !tx) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 },
      );
    }

    /* ---------- sinkronkan status dari Midtrans jika masih pending ---------- */

    if (tx.status === "pending" && tx.midtrans_order_id) {
      try {
        const detail = await getMidtransTransactionStatus(tx.midtrans_order_id);

        if (detail) {
          const newStatus = mapMidtransStatus(detail);

          if (newStatus && newStatus !== tx.status) {
            if (newStatus === "paid") {
              const paidAt =
                midtransTimeToIso(detail.settlement_time) ??
                new Date().toISOString();
              const amountReceived =
                Number(detail.gross_amount) > 0
                  ? Math.round(Number(detail.gross_amount))
                  : tx.amount;

              const updatePayload: Record<string, unknown> = {
                status: "paid",
                paid_at: paidAt,
                payment_method_code: detail.payment_type,
                amount_received: amountReceived,
              };

              await service
                .from("transactions")
                .update(updatePayload)
                .eq("id", tx.id);

              tx.status = newStatus;

              await fulfillPaidTransaction(service, tx, {
                merchantRef: tx.merchant_ref,
                amountReceived,
                paidAt,
                paymentType: "midtrans",
              });
            } else {
              await service
                .from("transactions")
                .update({ status: newStatus })
                .eq("id", tx.id);

              tx.status = newStatus;
            }
          }
        }
      } catch (midtransErr) {
        console.error("MIDTRANS STATUS FETCH ERROR:", midtransErr);
      }
    }

    return NextResponse.json({ transaction: tx });
  } catch (error) {
    console.error("TRANSACTION STATUS API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
