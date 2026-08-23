import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const body = await req.json();

    const { name, phone, message } = body;

    if (!name || !message) {
      return NextResponse.json(
        {
          error: "Nama dan pesan wajib diisi",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await supabase
      .from("support_messages")
      .insert([
        {
          name,
          phone,
          message,
          status: "new",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Gagal mengirim pesan",
      },
      {
        status: 500,
      }
    );
  }
}
