import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { requireStaff } from "@/lib/auth/staff";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    const { count, label } = body as { count?: number; label?: string };

    if (!count || !Number.isInteger(count) || count < 1 || count > 100) {
      return NextResponse.json(
        { error: "Jumlah harus antara 1 dan 100." },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    const { data, error } = await service.rpc("admin_generate_hotspot_batch", {
      p_count: count,
      p_label: label ?? null,
    });

    if (error) {
      console.error("ADMIN HOTSPOT BATCH ERROR:", error);

      return NextResponse.json(
        { error: "Gagal membuat batch hotspot." },
        { status: 500 },
      );
    }

    return NextResponse.json({ batch: data });
  } catch (error) {
    console.error("ADMIN HOTSPOT BATCH API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireStaff();

    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const rawPage = Number(searchParams.get("page"));
    const rawPerPage = Number(searchParams.get("per_page"));

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const perPage =
      Number.isInteger(rawPerPage) && rawPerPage > 0
        ? Math.min(rawPerPage, 100)
        : 50;

    const service = createServiceClient();

    const rangeFrom = (page - 1) * perPage;
    const rangeTo = rangeFrom + perPage - 1;

    const { data, error, count } = await service
      .from("hotspot_users")
      .select(
        `
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          phone
        ),
        package_orders:package_order_id (
          id,
          status,
          start_at,
          end_at,
          packages (
            name,
            price
          )
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (error) {
      console.error("ADMIN HOTSPOT LIST ERROR:", error);

      return NextResponse.json(
        { error: "Gagal mengambil data hotspot." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      users: data ?? [],
      pagination: {
        page,
        perPage,
        total: count ?? 0,
      },
    });
  } catch (error) {
    console.error("ADMIN HOTSPOT LIST API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
