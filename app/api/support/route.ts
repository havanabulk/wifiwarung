import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

const GLOBAL_RATE_LIMIT = 200;
const GLOBAL_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;

const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 2000;

const PHONE_PATTERN = /^[0-9+\-()\s]*$/;

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    // Bucket per-IP: halaman publik memakai header IP, yang bisa diubah
    // klien. Bucket global di bawah dipakai sebagai backstop agar
    // serangan spam (rotasi header IP) tetap terbatasi di tingkat
    // aplikasi secara keseluruhan.
    const { data: retryAfter, error: rateLimitError } = await supabase.rpc(
      "consume_rate_limit",
      {
        p_bucket: `support:${getClientIp(req)}`.slice(0, 128),
        p_limit: RATE_LIMIT,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      },
    );

    if (rateLimitError) {
      console.error("SUPPORT RATE LIMIT RPC ERROR:", rateLimitError);
    }

    if (Number(retryAfter ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    const { data: globalRetryAfter, error: globalRateLimitError } =
      await supabase.rpc("consume_rate_limit", {
        p_bucket: "support:global",
        p_limit: GLOBAL_RATE_LIMIT,
        p_window_seconds: GLOBAL_RATE_LIMIT_WINDOW_SECONDS,
      });

    if (globalRateLimitError) {
      console.error(
        "SUPPORT GLOBAL RATE LIMIT RPC ERROR:",
        globalRateLimitError,
      );
    }

    if (Number(globalRetryAfter ?? 0) > 0) {
      return NextResponse.json(
        {
          error: "Terlalu banyak pesan masuk. Silakan coba lagi nanti.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(globalRetryAfter),
          },
        },
      );
    }

    const body = await req.json();

    const { name, phone, message } = body;

    if (
      typeof name !== "string" ||
      name.trim() === "" ||
      name.trim().length > MAX_NAME_LENGTH
    ) {
      return NextResponse.json(
        {
          error: `Nama wajib diisi (maksimal ${MAX_NAME_LENGTH} karakter).`,
        },
        { status: 400 },
      );
    }

    if (phone !== null && phone !== undefined && phone !== "") {
      if (
        typeof phone !== "string" ||
        phone.trim().length > MAX_PHONE_LENGTH ||
        !PHONE_PATTERN.test(phone)
      ) {
        return NextResponse.json(
          {
            error: "Nomor WhatsApp tidak valid.",
          },
          { status: 400 },
        );
      }
    }

    if (
      typeof message !== "string" ||
      message.trim() === "" ||
      message.trim().length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        {
          error: `Pesan wajib diisi (maksimal ${MAX_MESSAGE_LENGTH} karakter).`,
        },
        { status: 400 },
      );
    }

    const trimmedPhone =
      typeof phone === "string" && phone.trim() !== "" ? phone.trim() : null;

    const { data, error } = await supabase
      .from("support_messages")
      .insert([
        {
          name: name.trim(),
          phone: trimmedPhone,
          message: message.trim(),
          status: "new",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("SUPPORT INSERT ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal mengirim pesan.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("SUPPORT API ERROR:", error);

    return NextResponse.json(
      {
        error: "Gagal mengirim pesan.",
      },
      { status: 500 },
    );
  }
}
