import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

//
// Callback dari n8n (VPS) setelah n8n selesai membuat voucher di MikroTik.
// n8n -> web: simpan kredensial yang dibuat supaya terlihat di dashboard user.
//
// Kontrak payload yang dikirim n8n (POST /api/webhooks/n8n):
// {
//   package_order_id: string,
//   status: "created" | "failed",
//   username?: string,          // wajib saat status = created
//   password?: string,          // wajib saat status = created
//   mikrotik_profile?: string | null,
//   limit_uptime?: string | null,
//   error?: string | null       // alasan saat status = failed
// }
//
// Otentikasi: header "x-n8n-token" harus sama dengan N8N_CALLBACK_TOKEN.

export async function POST(request: Request) {
  const secret = process.env.N8N_CALLBACK_TOKEN;

  if (!secret || secret.trim() === "") {
    return NextResponse.json(
      { ok: false, error: "N8N_CALLBACK_TOKEN belum dikonfigurasi." },
      { status: 500 },
    );
  }

  const incoming = request.headers.get("x-n8n-token");

  if (!incoming || incoming !== secret.trim()) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: {
    package_order_id?: string;
    status?: string;
    username?: string;
    password?: string;
    mikrotik_profile?: string | null;
    limit_uptime?: string | null;
    error?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body bukan JSON." },
      { status: 400 },
    );
  }

  const orderId = String(body.package_order_id ?? "").trim();

  if (!orderId) {
    return NextResponse.json(
      { ok: false, error: "package_order_id wajib." },
      { status: 400 },
    );
  }

  const status = body.status === "failed" ? "failed" : "created";
  const service = createServiceClient();

  if (status === "created") {
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "status created butuh username & password." },
        { status: 400 },
      );
    }

    const { data: order, error: orderError } = await service
      .from("package_orders")
      .select("id, user_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { ok: false, error: `package_order ${orderId} tidak ditemukan.` },
        { status: 404 },
      );
    }

    const { data: existing } = await service
      .from("mikrotik_vouchers")
      .select("id")
      .eq("package_order_id", orderId)
      .maybeSingle();

    const voucher = {
      package_order_id: orderId,
      user_id: order.user_id,
      username,
      password,
      mikrotik_profile: body.mikrotik_profile ?? null,
      limit_uptime: body.limit_uptime ?? null,
      status: "active",
    };

    if (existing?.id) {
      await service
        .from("mikrotik_vouchers")
        .update(voucher)
        .eq("id", existing.id);
    } else {
      await service.from("mikrotik_vouchers").insert(voucher);
    }

    await service
      .from("package_orders")
      .update({ mikrotik_status: "synced" })
      .eq("id", orderId);
  } else {
    await service
      .from("package_orders")
      .update({ mikrotik_status: "failed" })
      .eq("id", orderId);

    console.error(
      `N8N: gagal membuat voucher untuk order ${orderId}:`,
      body.error,
    );
  }

  return NextResponse.json({ ok: true });
}
