import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        full_name,
        phone,
        role,
        status,
        created_at,
        wallets (
          id,
          balance,
          updated_at
        ),
        package_orders (
          id,
          package_id,
          price,
          status,
          start_at,
          end_at,
          created_at,
          packages (
            id,
            name,
            type
          )
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "CUSTOMERS GET ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      customers: data ?? [],
    });
  } catch (error) {
    console.error(
      "CUSTOMERS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan server.",
      },
      {
        status: 500,
      }
    );
  }
}