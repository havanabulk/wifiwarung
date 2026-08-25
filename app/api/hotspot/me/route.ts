import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { data: hotspot, error } = await supabase
      .from("hotspot_users")
      .select(
        `
        id,
        username,
        pin,
        active,
        locked,
        last_login_at,
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
      return NextResponse.json(
        { error: "Belum ada kredensial hotspot. Beli paket terlebih dahulu." },
        { status: 404 },
      );
    }

    return NextResponse.json({ hotspot });
  } catch (error) {
    console.error("HOTSPOT ME API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
