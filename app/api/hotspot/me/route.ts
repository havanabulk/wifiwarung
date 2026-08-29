import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 },
      );
    }

    const service = createServiceClient();

    const { data: hotspot, error } = await service
      .from("mikrotik_vouchers")
      .select(
        `
        id,
        username,
        password,
        status,
        created_at,
        package_orders:package_order_id (
          id,
          status,
          end_at,
          packages (
            name
          )
        )
      `,
      )
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("HOTSPOT ME ERROR:", error);

      return NextResponse.json(
        { error: "Gagal mengambil data hotspot." },
        { status: 500 },
      );
    }

    if (!hotspot) {
      // Belum ada voucher — laporkan jika user punya paket aktif yang sedang
      // menunggu sinkronisasi MikroTik eksternal.
      const { data: activeOrder } = await service
        .from("package_orders")
        .select("id")
        .eq("user_id", authData.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (activeOrder) {
        return NextResponse.json({ hotspot: null, pendingSync: true });
      }

      return NextResponse.json(
        { error: "Belum ada kredensial hotspot. Beli paket terlebih dahulu." },
        { status: 404 },
      );
    }

    return NextResponse.json({ hotspot, pendingSync: false });
  } catch (error) {
    console.error("HOTSPOT ME API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
