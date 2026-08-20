import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const body =
      await request.json();

    const supabase =
      await createClient();

    const {
      name,
      type,
      duration_minutes,
      quota_mb,
      speed_down_mbps,
      speed_up_mbps,
      price,
      start_time,
      end_time,
      active,
    } = body;

    const { data, error } =
      await supabase
        .from("packages")
        .update({
          name,
          type,
          duration_minutes:
            duration_minutes ?? null,
          quota_mb:
            quota_mb ?? null,
          speed_down_mbps:
            speed_down_mbps ?? null,
          speed_up_mbps:
            speed_up_mbps ?? null,
          price: Number(price),
          start_time:
            start_time ?? null,
          end_time:
            end_time ?? null,
          active:
            active !== false,
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