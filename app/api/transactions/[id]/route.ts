import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getTripayTransactionDetail } from "@/lib/tripay";

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
      .select("*")
      .eq("merchant_ref", merchantRef.trim())
      .single();

    if (txError || !tx) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 },
      );
    }

    /* ---------- sinkronkan status dari Tripay jika masih pending ---------- */

    if (tx.status === "pending" && tx.tripay_ref) {
      try {
        const detail = await getTripayTransactionDetail(tx.tripay_ref);

        if (detail.success && detail.data) {
          const latestStatus = detail.data.status;

          let newStatus: string | null = null;

          if (latestStatus === "PAID") {
            newStatus = "paid";
          } else if (latestStatus === "FAILED") {
            newStatus = "failed";
          } else if (latestStatus === "EXPIRED") {
            newStatus = "expired";
          } else if (latestStatus === "REFUND") {
            newStatus = "refunded";
          }

          if (newStatus && newStatus !== tx.status) {
            const updatePayload: Record<string, unknown> = {
              status: newStatus,
            };

            if (newStatus === "paid" && detail.data.paid_at) {
              updatePayload.paid_at = new Date(
                detail.data.paid_at * 1000,
              ).toISOString();
              updatePayload.amount_received = detail.data.amount_received;
              updatePayload.fee_merchant = detail.data.fee_merchant;
              updatePayload.fee_customer = detail.data.fee_customer;
            }

            await service
              .from("transactions")
              .update(updatePayload)
              .eq("id", tx.id);

            tx.status = newStatus;
          }
        }
      } catch (tripayErr) {
        console.error("TRIPAY DETAIL FETCH ERROR:", tripayErr);
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
