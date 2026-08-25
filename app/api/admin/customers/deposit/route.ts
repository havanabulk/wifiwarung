import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { parseDepositInput, MAX_DEPOSIT } from "@/lib/validation/deposit";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch (parseError) {
      console.error("DEPOSIT JSON PARSE ERROR:", parseError);

      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    console.error("DEPOSIT BODY DEBUG:", {
      type: typeof body,
      isNull: body === null,
      isArray: Array.isArray(body),
      keys:
        typeof body === "object" && body !== null && !Array.isArray(body)
          ? Object.keys(body)
          : null,
    });

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
        p_note: parsed.data.note,
        p_idempotency_key: parsed.data.idempotencyKey,
      },
    );

    if (rpcError) {
      console.error("DEPOSIT RPC ERROR:", rpcError);

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

        return NextResponse.json(
          {
            error: aboveMaximum
              ? `Maksimal deposit Rp ${MAX_DEPOSIT.toLocaleString("id-ID")} per transaksi.`
              : "Data deposit tidak valid.",
          },
          { status: 400 },
        );
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
    console.error("DEPOSIT API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
