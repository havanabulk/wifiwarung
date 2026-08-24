import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { parsePackageInput } from "@/lib/validation/package";

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Mengambil seluruh paket internet
*/

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const supabase =
      await createClient();

    const {
      data,
      error,
    } = await supabase
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
            error.message,
          details:
            error.details,
          hint: error.hint,
          code: error.code,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      packages: data ?? [],
    });

  } catch (error) {
    console.error(
      "PACKAGE GET API ERROR:",
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

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Membuat paket internet baru
*/

export async function POST(
  request: Request
) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    const body =
      await request.json();

    console.log(
      "PACKAGE POST BODY:",
      body
    );

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

    const packageData =
      parsed.data;

    /*
    |--------------------------------------------------------------------------
    | SUPABASE
    |--------------------------------------------------------------------------
    */

    const supabase =
      await createClient();

    const {
      data,
      error,
    } = await supabase
      .from("packages")
      .insert(
        packageData
      )
      .select()
      .single();

    /*
    |--------------------------------------------------------------------------
    | DATABASE ERROR
    |--------------------------------------------------------------------------
    */

    if (error) {
      console.error(
        "SUPABASE PACKAGE INSERT ERROR:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
          details:
            error.details,
          hint:
            error.hint,
          code:
            error.code,
        },
        {
          status: 500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    console.log(
      "PACKAGE CREATED:",
      data
    );

    return NextResponse.json(
      {
        package: data,
      },
      {
        status: 201,
      }
    );

  } catch (error) {
    console.error(
      "PACKAGE POST API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Data paket tidak valid.",
      },
      {
        status: 400,
      }
    );
  }
}
