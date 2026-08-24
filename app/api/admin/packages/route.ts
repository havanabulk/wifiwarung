import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

const VALID_TYPES = [
  "hourly",
  "night",
  "daily",
  "weekly",
  "monthly",
  "quota",
] as const;

type PackageType = (typeof VALID_TYPES)[number];

function nullableNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

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

    /*
    |--------------------------------------------------------------------------
    | VALIDASI NAMA
    |--------------------------------------------------------------------------
    */

    if (
      typeof name !== "string" ||
      name.trim() === ""
    ) {
      return NextResponse.json(
        {
          error:
            "Nama paket wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI TYPE
    |--------------------------------------------------------------------------
    */

    if (
      typeof type !== "string" ||
      !VALID_TYPES.includes(
        type as PackageType
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Jenis paket tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI HARGA
    |--------------------------------------------------------------------------
    */

    const packagePrice =
      Number(price);

    if (
      !Number.isFinite(
        packagePrice
      ) ||
      packagePrice < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Harga paket tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | KONVERSI NILAI
    |--------------------------------------------------------------------------
    */

    const durationMinutes =
      nullableNumber(
        duration_minutes
      );

    const quotaMb =
      nullableNumber(
        quota_mb
      );

    const speedDown =
      nullableNumber(
        speed_down_mbps
      );

    const speedUp =
      nullableNumber(
        speed_up_mbps
      );

    /*
    |--------------------------------------------------------------------------
    | VALIDASI DURASI
    |--------------------------------------------------------------------------
    */

    if (
      durationMinutes !== null &&
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Durasi harus lebih besar dari 0.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI KUOTA
    |--------------------------------------------------------------------------
    */

    if (
      quotaMb !== null &&
      quotaMb <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Kuota harus lebih besar dari 0.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI SPEED
    |--------------------------------------------------------------------------
    */

    if (
      speedDown !== null &&
      speedDown < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Kecepatan download tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      speedUp !== null &&
      speedUp < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Kecepatan upload tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDASI KHUSUS PAKET MALAM
    |--------------------------------------------------------------------------
    */

    let startTime:
      | string
      | null = null;

    let endTime:
      | string
      | null = null;

    if (type === "night") {
      startTime =
        typeof start_time ===
        "string"
          ? start_time
          : null;

      endTime =
        typeof end_time ===
        "string"
          ? end_time
          : null;

      if (
        !startTime ||
        !endTime
      ) {
        return NextResponse.json(
          {
            error:
              "Jam mulai dan jam selesai paket malam wajib diisi.",
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | DATA INSERT
    |--------------------------------------------------------------------------
    */

    const packageData = {
      name: name.trim(),

      type,

      duration_minutes:
        durationMinutes,

      quota_mb:
        quotaMb,

      speed_down_mbps:
        speedDown,

      speed_up_mbps:
        speedUp,

      price:
        packagePrice,

      start_time:
        startTime,

      end_time:
        endTime,

      active:
        active !== false,
    };

    console.log(
      "PACKAGE INSERT DATA:",
      packageData
    );

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