import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

const MIN_DEPOSIT = 1000;
const MAX_DEPOSIT = 10_000_000;

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();

    const { user_id, amount, note, idempotencyKey } = body;

    let idempotencyKeyParam: string | null = null;

    if (idempotencyKey !== null && idempotencyKey !== undefined) {
      if (
        typeof idempotencyKey !== "string" ||
        idempotencyKey.trim().length > 64
      ) {
        return NextResponse.json(
          {
            error: "Idempotency key tidak valid.",
          },
          { status: 400 },
        );
      }

      idempotencyKeyParam =
        idempotencyKey.trim() === "" ? null : idempotencyKey.trim();
    }

    if (
      !user_id ||
      typeof user_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user_id,
      )
    ) {
      return NextResponse.json(
        {
          error: "User ID tidak valid.",
        },
        { status: 400 },
      );
    }

    const depositAmount = Number(amount);

    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        {
          error: "Jumlah deposit tidak valid.",
        },
        { status: 400 },
      );
    }

    if (!Number.isInteger(depositAmount)) {
      return NextResponse.json(
        {
          error: "Nominal deposit harus bilangan bulat rupiah.",
        },
        { status: 400 },
      );
    }

    if (depositAmount < MIN_DEPOSIT) {
      return NextResponse.json(
        {
          error: `Minimal deposit Rp ${MIN_DEPOSIT.toLocaleString("id-ID")}.`,
        },
        { status: 400 },
      );
    }

    if (depositAmount > MAX_DEPOSIT) {
      return NextResponse.json(
        {
          error: `Maksimal deposit Rp ${MAX_DEPOSIT.toLocaleString("id-ID")} per transaksi.`,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: wallet, error: rpcError } = await supabase.rpc(
      "admin_deposit",
      {
        p_user_id: user_id,
        p_amount: depositAmount,
        p_note:
          typeof note === "string" && note.trim() !== "" ? note.trim() : null,
        p_idempotency_key: idempotencyKeyParam,
      },
    );

    if (rpcError) {
      console.error("DEPOSIT RPC ERROR:", rpcError);

      if (rpcError.code === "P0002") {
        return NextResponse.json(
          {
            error: "Pelanggan tidak ditemukan.",
          },
          { status: 404 },
        );
      }

      if (rpcError.code === "22P02" || rpcError.code === "22023") {
        const aboveMaximum = String(rpcError.message).includes(
          "AMOUNT_ABOVE_MAXIMUM",
        );

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
        return NextResponse.json(
          {
            error: "Akses ditolak.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        {
          error: "Deposit gagal diproses.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Deposit berhasil.",
        wallet,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("DEPOSIT API ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan server.",
      },
      { status: 500 },
    );
  }
}
