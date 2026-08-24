import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();

    const { user_id, amount, note } = body;

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        {
          error: "User ID wajib diisi.",
        },
        { status: 400 }
      );
    }

    const depositAmount = Number(amount);

    if (
      !Number.isFinite(depositAmount) ||
      depositAmount <= 0
    ) {
      return NextResponse.json(
        {
          error: "Jumlah deposit tidak valid.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(depositAmount)) {
      return NextResponse.json(
        {
          error:
            "Nominal deposit harus bilangan bulat rupiah.",
        },
        { status: 400 }
      );
    }

    if (depositAmount < 1000) {
      return NextResponse.json(
        {
          error: "Minimal deposit Rp 1.000.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: wallet, error: rpcError } =
      await supabase.rpc("admin_deposit", {
        p_user_id: user_id,
        p_amount: depositAmount,
        p_note:
          typeof note === "string" && note.trim() !== ""
            ? note.trim()
            : null,
      });

    if (rpcError) {
      console.error("DEPOSIT RPC ERROR:", rpcError);

      if (rpcError.code === "P0002") {
        return NextResponse.json(
          {
            error: "Pelanggan tidak ditemukan.",
          },
          { status: 404 }
        );
      }

      if (rpcError.code === "22P02" || rpcError.code === "22023") {
        return NextResponse.json(
          {
            error: "Data deposit tidak valid.",
          },
          { status: 400 }
        );
      }

      if (rpcError.code === "42501") {
        return NextResponse.json(
          {
            error: "Akses ditolak.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: "Deposit gagal diproses.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Deposit berhasil.",
        wallet,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DEPOSIT API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan server.",
      },
      { status: 500 }
    );
  }
}
