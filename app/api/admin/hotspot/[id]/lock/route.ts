import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { createServiceClient } from "@/lib/supabase/service";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PUT(_request: Request, context: Context) {
  try {
    const auth = await requireStaff();

    if (!auth.ok) {
      return auth.response;
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: hotspot, error: fetchError } = await service
      .from("hotspot_users")
      .select("id, locked")
      .eq("id", id)
      .single();

    if (fetchError || !hotspot) {
      return NextResponse.json(
        { error: "Akun hotspot tidak ditemukan." },
        { status: 404 },
      );
    }

    const newLocked = !hotspot.locked;

    const { error: updateError } = await service
      .from("hotspot_users")
      .update({ locked: newLocked, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("HOTSPOT LOCK ERROR:", updateError);

      return NextResponse.json(
        { error: "Gagal mengubah status lock." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      locked: newLocked,
      message: newLocked ? "Akun hotspot dikunci." : "Akun hotspot dibuka.",
    });
  } catch (error) {
    console.error("HOTSPOT LOCK API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
