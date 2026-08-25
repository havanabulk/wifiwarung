import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/staff";
import { parseDepositInput } from "@/lib/validation/deposit";

export async function POST(request: Request) {
  try {
    const auth = await requireStaff();

    if (!auth.ok) {
      return auth.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    const parsed = parseDepositInput(body);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: wallet, error: rpcError } = await supabase.rpc(
      "admin_deposit",
      {
        p_user_id: parsed.data.userId,
        p_amount: parsed.data.amount,
        p_note:
          parsed.data.note ??
          (auth.context.role === "kasir" ? "Deposit oleh kasir" : null),
        p_idempotency_key: parsed.data.idempotencyKey,
      },
    );

    if (rpcError) {
      console.error("STAFF DEPOSIT RPC ERROR:", rpcError);

      const message = String(rpcError.message ?? "");

      if (rpcError.code === "P0002") {
        return NextResponse.json(
          { error: "Pelanggan tidak ditemukan." },
          { status: 404 },
        );
      }

      if (rpcError.code === "22P02" || rpcError.code === "22023") {
        if (message.includes("TARGET_NOT_CUSTOMER")) {
          return NextResponse.json(
            { error: "Hanya pelanggan yang bisa menerima deposit." },
            { status: 400 },
          );
        }

        const aboveMaximum = message.includes("AMOUNT_ABOVE_MAXIMUM");

        const belowMinimum = message.includes("AMOUNT_BELOW_MINIMUM");

        const notInteger = message.includes("AMOUNT_NOT_INTEGER");

        const amountInvalid = message.includes("AMOUNT_INVALID");

        const userRequired = message.includes("USER_ID_REQUIRED");

        let detail = "Data deposit tidak valid.";

        if (aboveMaximum) {
          detail = `Maksimal deposit Rp ${Number(10_000_000).toLocaleString("id-ID")} per transaksi.`;
        } else if (belowMinimum) {
          detail = "Minimal deposit Rp 1.000.";
        } else if (notInteger) {
          detail = "Nominal deposit harus bilangan bulat.";
        } else if (amountInvalid) {
          detail = "Jumlah deposit tidak valid.";
        } else if (userRequired) {
          detail = "Pelanggan tidak ditemukan.";
        } else {
          detail = `Data deposit tidak valid (rpc: ${message}).`;
        }

        return NextResponse.json({ error: detail }, { status: 400 });
      }

      if (rpcError.code === "42501") {
        return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
      }

      return NextResponse.json(
        { error: "Deposit gagal diproses." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Deposit berhasil.",
      wallet,
    });
  } catch (error) {
    console.error("STAFF DEPOSIT API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
