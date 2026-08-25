import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();

    if (!auth.ok) {
      return auth.response;
    }

    const rateLimit = checkRateLimit(
      `redeem:${auth.context.userId}`,
      10,
      60_000,
    );

    if (!rateLimit.ok) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan. Coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json();

    const { code } = body;

    if (
      typeof code !== "string" ||
      code.trim().length < 4 ||
      code.trim().length > 40
    ) {
      return NextResponse.json(
        {
          error: "Format kode voucher tidak valid.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error: rpcError } = await supabase.rpc("redeem_voucher", {
      p_code: code.trim(),
    });

    if (rpcError) {
      console.error("REDEEM RPC ERROR:", rpcError);

      const message = String(rpcError.message ?? "");

      if (message.includes("VOUCHER_NOT_FOUND")) {
        return NextResponse.json(
          {
            error: "Kode voucher tidak ditemukan.",
          },
          { status: 404 },
        );
      }

      if (message.includes("VOUCHER_ALREADY_REDEEMED")) {
        return NextResponse.json(
          {
            error: "Voucher sudah pernah ditebus.",
          },
          { status: 400 },
        );
      }

      if (message.includes("VOUCHER_EXPIRED")) {
        return NextResponse.json(
          {
            error: "Voucher sudah kedaluwarsa.",
          },
          { status: 400 },
        );
      }

      if (message.includes("VOUCHER_INACTIVE")) {
        return NextResponse.json(
          {
            error: "Voucher tidak aktif.",
          },
          { status: 400 },
        );
      }

      if (message.includes("NO_ACTIVE_ORDER")) {
        return NextResponse.json(
          {
            error:
              "Anda belum punya paket aktif untuk diperpanjang. Beli paket terlebih dahulu.",
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
          error: "Voucher gagal ditebus. Coba lagi.",
        },
        { status: 500 },
      );
    }

    const resultType =
      typeof data === "object" && data !== null
        ? ((data as Record<string, unknown>).type as string)
        : null;

    return NextResponse.json({
      success: true,
      type: resultType,
      message:
        resultType === "balance"
          ? "Saldo berhasil ditambahkan."
          : "Durasi paket berhasil diperpanjang.",
    });
  } catch (error) {
    console.error("REDEEM API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Terjadi kesalahan server.",
      },
      { status: 500 },
    );
  }
}
