import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";

export async function POST(request: Request) {
  try {
    const auth = await requireUser();

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();

    const { packageId, idempotencyKey } = body;

    const parsedPackageId = Number(packageId);

    if (!Number.isInteger(parsedPackageId) || parsedPackageId <= 0) {
      return NextResponse.json(
        {
          error: "Paket tidak valid.",
        },
        { status: 400 },
      );
    }

    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.trim() === "" ||
      idempotencyKey.trim().length > 64
    ) {
      return NextResponse.json(
        {
          error: "Idempotency key tidak valid.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error: rpcError } = await supabase.rpc("purchase_package", {
      p_package_id: parsedPackageId,
      p_idempotency_key: idempotencyKey.trim(),
    });

    if (rpcError) {
      console.error("PURCHASE RPC ERROR:", rpcError);

      if (rpcError.code === "P0002") {
        return NextResponse.json(
          {
            error: "Paket tidak tersedia.",
          },
          { status: 404 },
        );
      }

      if (rpcError.code === "P0001") {
        return NextResponse.json(
          {
            error: "Saldo tidak cukup untuk membeli paket ini.",
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

      if (rpcError.code === "22023" || rpcError.code === "22P02") {
        return NextResponse.json(
          {
            error: "Data pembelian tidak valid.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: "Pembelian gagal diproses.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PURCHASE API ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan server.",
      },
      { status: 500 },
    );
  }
}
