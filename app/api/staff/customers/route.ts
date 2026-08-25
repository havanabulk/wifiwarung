import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireStaff } from "@/lib/auth/staff";
import { parseCustomerInput } from "@/lib/validation/customer";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const CREATE_RATE_LIMIT = 30;
const CREATE_RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

function sanitizeSearchTerm(term: string) {
  return term.replace(/[,()"*]/g, " ").trim();
}

export async function GET(request: Request) {
  try {
    const auth = await requireStaff();

    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);

    const rawPage = Number(searchParams.get("page"));
    const rawPageSize = Number(searchParams.get("pageSize"));

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

    const pageSize =
      Number.isInteger(rawPageSize) && rawPageSize > 0
        ? Math.min(rawPageSize, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    const search = sanitizeSearchTerm(searchParams.get("q") ?? "");

    const supabase = await createClient();

    const rangeFrom = (page - 1) * pageSize;
    const rangeTo = rangeFrom + pageSize - 1;

    let query = supabase
      .from("profiles")
      .select(
        `
        id,
        username,
        full_name,
        phone,
        status,
        created_at,
        wallets (
          balance
        )
      `,
        {
          count: "exact",
        },
      )
      .not("role", "in", '("admin","kasir")')
      .order("created_at", {
        ascending: false,
      })
      .range(rangeFrom, rangeTo);

    if (search !== "") {
      query = query.or(
        `username.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("STAFF CUSTOMERS GET ERROR:", error);

      return NextResponse.json(
        { error: "Gagal mengambil data pelanggan." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      customers: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
      },
    });
  } catch (error) {
    console.error("STAFF CUSTOMERS API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaff();

    if (!auth.ok) {
      return auth.response;
    }

    const client = await createClient();

    // Rate limit pembuatan akun per staf (bertahan antar restart DB).
    const { data: retryAfter, error: rateLimitError } = await client.rpc(
      "consume_rate_limit",
      {
        p_bucket: `cust-create:${auth.context.userId}`.slice(0, 128),
        p_limit: CREATE_RATE_LIMIT,
        p_window_seconds: CREATE_RATE_LIMIT_WINDOW_SECONDS,
      },
    );

    if (rateLimitError) {
      console.error("CUSTOMER CREATE RATE LIMIT ERROR:", rateLimitError);
    }

    if (Number(retryAfter ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `Terlalu banyak pembuatan akun. Coba lagi dalam ${retryAfter} detik.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }

    const parsed = parseCustomerInput(body);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const service = createServiceClient();

    // Cek cepat username/email ganda untuk pesan yang ramah kasir.
    const { data: existing } = await client
      .from("profiles")
      .select("id")
      .eq("username", parsed.data.username)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Username sudah terdaftar." },
        { status: 409 },
      );
    }

    const { data: authData, error: createAuthError } =
      await service.auth.admin.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        email_confirm: true,
      });

    if (createAuthError || !authData?.user) {
      console.error("CUSTOMER AUTH CREATE ERROR:", createAuthError);

      const message = String(createAuthError?.message ?? "");

      if (
        message.includes("already been registered") ||
        message.includes("already exists")
      ) {
        return NextResponse.json(
          { error: "Username sudah terdaftar." },
          { status: 409 },
        );
      }

      if (message.toLowerCase().includes("password")) {
        return NextResponse.json(
          { error: "Password tidak memenuhi syarat keamanan." },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "Gagal membuat akun pelanggan." },
        { status: 500 },
      );
    }

    const newUserId = authData.user.id;

    const { error: profileError } = await service.from("profiles").insert({
      id: newUserId,
      username: parsed.data.username,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      role: "customer",
      status: "active",
    });

    if (profileError) {
      console.error("CUSTOMER PROFILE INSERT ERROR:", profileError);

      // Rollback manual: jangan tinggalkan auth user yatim.
      await service.auth.admin.deleteUser(newUserId);

      return NextResponse.json(
        { error: "Gagal membuat profil pelanggan." },
        { status: 500 },
      );
    }

    const { error: walletError } = await service
      .from("wallets")
      .upsert({ user_id: newUserId, balance: 0 }, { onConflict: "user_id" });

    if (walletError) {
      console.error("CUSTOMER WALLET UPSERT ERROR:", walletError);
    }

    return NextResponse.json(
      {
        success: true,
        customer: {
          id: newUserId,
          username: parsed.data.username,
          email: parsed.data.email,
          fullName: parsed.data.fullName,
          phone: parsed.data.phone,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CUSTOMER CREATE API ERROR:", error);

    const message = error instanceof Error ? error.message : "";

    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "Konfigurasi server belum lengkap." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Gagal membuat pelanggan baru." },
      { status: 500 },
    );
  }
}
