import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { generateVoucherCode, validateBatchInput } from "@/lib/voucher";

const BATCHES_PAGE_SIZE = 10;

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const supabase = await createClient();

    const rangeFrom = (page - 1) * BATCHES_PAGE_SIZE;

    const {
      data: batches,
      count,
      error,
    } = await supabase
      .from("voucher_batches")
      .select("*", {
        count: "exact",
      })
      .order("created_at", {
        ascending: false,
      })
      .range(rangeFrom, rangeFrom + BATCHES_PAGE_SIZE - 1);

    if (error) {
      console.error("VOUCHER BATCH LIST ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal memuat daftar voucher.",
        },
        { status: 500 },
      );
    }

    const batchIds = (batches ?? []).map((batch) => batch.id);

    const redeemedMap: Record<number, number> = {};

    if (batchIds.length > 0) {
      const { data: redeemedRows } = await supabase
        .from("vouchers")
        .select("batch_id")
        .in("batch_id", batchIds)
        .not("redeemed_at", "is", null);

      for (const row of redeemedRows ?? []) {
        redeemedMap[row.batch_id] = (redeemedMap[row.batch_id] ?? 0) + 1;
      }
    }

    const totalPages =
      Math.max(1, Math.ceil((count ?? 0) / BATCHES_PAGE_SIZE)) || 1;

    return NextResponse.json({
      batches: (batches ?? []).map((batch) => ({
        ...batch,
        redeemedCount: redeemedMap[batch.id] ?? 0,
      })),
      page,
      totalPages,
      totalBatches: count ?? 0,
    });
  } catch (error) {
    console.error("VOUCHERS API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Terjadi kesalahan server.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();

    const validated = validateBatchInput(body);

    if (!validated.ok) {
      return NextResponse.json(
        {
          error: validated.error,
        },
        { status: 400 },
      );
    }

    const { label, type, value, count, expiresInDays } = validated.data;

    const codes = new Set<string>();

    while (codes.size < count) {
      codes.add(generateVoucherCode());
    }

    const codeList = Array.from(codes);

    const expiresAt =
      expiresInDays !== null
        ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
        : null;

    const supabase = await createClient();

    let batchId: number | null = null;
    let rpcError: unknown = null;

    // Kode dijamin unik oleh DB; bila tabrakan (sangat kecil
    // kemungkinannya), ulangi pembuatan dengan kode baru.
    for (let attempt = 0; attempt < 3 && batchId === null; attempt++) {
      const { data, error } = await supabase.rpc("admin_create_voucher_batch", {
        p_label: label,
        p_type: type,
        p_value: value,
        p_count: count,
        p_expires_at: expiresAt,
        p_codes: codeList,
      });

      if (!error) {
        batchId = data as number;

        break;
      }

      rpcError = error;

      if (error.code !== "23505") {
        break;
      }

      codeList.length = 0;

      const freshCodes = new Set<string>();

      while (freshCodes.size < count) {
        freshCodes.add(generateVoucherCode());
      }

      codeList.push(...freshCodes);
    }

    if (batchId === null) {
      console.error("VOUCHER BATCH CREATE ERROR:", rpcError);

      const err = rpcError as {
        code?: string;
        message?: string;
      };

      if (err?.code === "42501") {
        return NextResponse.json(
          {
            error: "Akses ditolak.",
          },
          { status: 403 },
        );
      }

      if (err?.code === "22023" || err?.code === "22P02") {
        return NextResponse.json(
          {
            error: "Data batch tidak valid.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: "Batch voucher gagal dibuat.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      batchId,
      codes: codeList,
    });
  } catch (error) {
    console.error("VOUCHER CREATE API ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Terjadi kesalahan server.",
      },
      { status: 500 },
    );
  }
}
