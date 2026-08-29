import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getMidtransTransactionStatus,
  mapMidtransStatus,
  midtransTimeToIso,
  cancelMidtransTransaction,
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

              if (tx.package_id) {
                await fulfillPaidTransaction(service, tx, {
                  merchantRef: tx.merchant_ref,
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
                    "TRANSACTION STATUS: gagal kredit deposit:",
                    depositError,
                  );
                }
              }
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

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: "sudah dibayar",
    failed: "gagal",
    expired: "kadaluarsa",
    refunded: "referensi refund",
  };

  return labels[status] ?? status;
}

// Batalkan pesanan yang masih pending (belum dibayar).
// DELETE /api/transactions/:merchantRef
export async function DELETE(_request: Request, context: Context) {
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

    if (tx.status !== "pending") {
      return NextResponse.json(
        {
          error: `Transaksi sudah ${statusLabel(tx.status)}, tidak dapat dibatalkan.`,
        },
        { status: 400 },
      );
    }

    /* ---------- batalkan di gateway Midtrans (jika transaksi online) ---------- */

    let gatewayOk = true;

    if (tx.midtrans_order_id) {
      try {
        const cancelResult = await cancelMidtransTransaction(
          tx.midtrans_order_id,
        );

        gatewayOk = cancelResult.ok;

        if (!gatewayOk) {
          // gagal dibatalkan — bisa jadi sudah lunas/settled. Cek status aktual.
          const detail = await getMidtransTransactionStatus(
            tx.midtrans_order_id,
          );

          const actual = detail ? mapMidtransStatus(detail) : null;

          if (actual === "paid") {
            return NextResponse.json(
              { error: "Pembayaran sudah selesai, tidak dapat dibatalkan." },
              { status: 400 },
            );
          }
        }
      } catch (gatewayErr) {
        console.error("MIDTRANS CANCEL API ERROR:", gatewayErr);
      }
    }

    /* ---------- tandai gagal di database ---------- */

    await service
      .from("transactions")
      .update({ status: "failed" })
      .eq("id", tx.id);

    return NextResponse.json({ success: true, status: "failed" });
  } catch (error) {
    console.error("TRANSACTION CANCEL API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
