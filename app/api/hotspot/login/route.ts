import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    const { username, pin } = body as { username?: string; pin?: string };

    if (!username || !pin) {
      return NextResponse.json(
        { error: "Username dan pin diperlukan." },
        { status: 400 },
      );
    }

    const service = createServiceClient();

    const { data, error } = await service.rpc("validate_hotspot_login", {
      p_username: username,
      p_pin: pin,
    });

    if (error) {
      console.error("HOTSPOT LOGIN ERROR:", error);

      const message = String(error.message ?? "");

      if (message.includes("INVALID_CREDENTIALS")) {
        return NextResponse.json(
          { error: "Username atau pin salah." },
          { status: 401 },
        );
      }

      if (message.includes("ACCOUNT_LOCKED")) {
        return NextResponse.json(
          { error: "Akun hotspot dikunci." },
          { status: 403 },
        );
      }

      if (message.includes("ACCOUNT_INACTIVE")) {
        return NextResponse.json(
          { error: "Akun hotspot tidak aktif." },
          { status: 403 },
        );
      }

      if (message.includes("PACKAGE_EXPIRED")) {
        return NextResponse.json(
          { error: "Paket telah habis masa aktif." },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Gagal memvalidasi login hotspot." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (error) {
    console.error("HOTSPOT LOGIN API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
