import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

const CODES_PAGE_SIZE = 100;

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const batchId = Number(searchParams.get("batchId"));

    if (!Number.isInteger(batchId) || batchId <= 0) {
      return NextResponse.json(
        {
          error: "Batch ID tidak valid.",
        },
        { status: 400 },
      );
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const supabase = await createClient();

    const rangeFrom = (page - 1) * CODES_PAGE_SIZE;

    const {
      data: vouchers,
      count,
      error,
    } = await supabase
      .from("vouchers")
      .select(
        `
        id,
        code,
        type,
        value,
        active,
        redeemed_by,
        redeemed_at,
        expires_at
      `,
        { count: "exact" },
      )
      .eq("batch_id", batchId)
      .order("id", { ascending: true })
      .range(rangeFrom, rangeFrom + CODES_PAGE_SIZE - 1);

    if (error) {
      console.error("VOUCHER CODES LIST ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal memuat kode voucher.",
        },
        { status: 500 },
      );
    }

    const redeemedIds = Array.from(
      new Set(
        (vouchers ?? [])
          .map((voucher) => voucher.redeemed_by)
          .filter((id): id is string => id !== null),
      ),
    );

    const usernameMap: Record<string, string | null> = {};

    if (redeemedIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", redeemedIds);

      for (const profile of profiles ?? []) {
        usernameMap[profile.id] = profile.username;
      }
    }

    const totalPages =
      Math.max(1, Math.ceil((count ?? 0) / CODES_PAGE_SIZE)) || 1;

    return NextResponse.json({
      vouchers: (vouchers ?? []).map((voucher) => ({
        ...voucher,
        redeemedByUsername: voucher.redeemed_by
          ? (usernameMap[voucher.redeemed_by] ?? null)
          : null,
      })),
      page,
      totalPages,
      totalCodes: count ?? 0,
    });
  } catch (error) {
    console.error("VOUCHER CODES API ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan server.",
      },
      { status: 500 },
    );
  }
}
