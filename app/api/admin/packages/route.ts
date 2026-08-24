import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { parsePackageInput } from "@/lib/validation/package";

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error(
        "SUPABASE PACKAGE GET ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Gagal mengambil data paket.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      packages: data ?? [],
    });
  } catch (error) {
    console.error("PACKAGE GET API ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan server.",
      },
      { status: 500 }
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

    const parsed = parsePackageInput(body);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          error: parsed.error,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("packages")
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      console.error(
        "SUPABASE PACKAGE INSERT ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: "Gagal menyimpan paket.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        package: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PACKAGE POST API ERROR:", error);

    return NextResponse.json(
      {
        error: "Data paket tidak valid.",
      },
      { status: 400 }
    );
  }
}
