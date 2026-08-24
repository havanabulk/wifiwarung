import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { parsePackageInput } from "@/lib/validation/package";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(
  request: Request,
  context: Context
) {
  try {
    const { id } =
      await context.params;

    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const body =
      await request.json();

    const parsed =
      parsePackageInput(body);

    if (!parsed.ok) {
      return NextResponse.json(
        {
          error:
            parsed.error,
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      await createClient();

    const { data, error } =
      await supabase
        .from("packages")
        .update({
          ...parsed.data,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
      console.error(
        "UPDATE PACKAGE ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      package: data,
    });

  } catch (error) {
    console.error(
      "PACKAGE UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui paket.",
      },
      { status: 500 }
    );
  }
}
