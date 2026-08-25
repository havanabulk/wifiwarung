import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { createSignature, createTripayTransaction } from "@/lib/tripay";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      packageId,
      methodName,
      customerName,
      customerEmail,
      customerPhone,
    } = body as {
      packageId?: unknown;
      methodName?: unknown;
      customerName?: unknown;
      customerEmail?: unknown;
      customerPhone?: unknown;
    };

    /* ---------- validasi input ---------- */

    const parsedPackageId = Number(packageId);

    if (!Number.isInteger(parsedPackageId) || parsedPackageId <= 0) {
      return NextResponse.json(
        { error: "ID paket tidak valid." },
        { status: 400 },
      );
    }

    if (typeof methodName !== "string" || methodName.trim() === "") {
      return NextResponse.json(
        { error: "Metode pembayaran wajib diisi." },
        { status: 400 },
      );
    }

    if (typeof customerName !== "string" || customerName.trim() === "") {
      return NextResponse.json(
        { error: "Nama pelanggan wajib diisi." },
        { status: 400 },
      );
    }

    if (
      typeof customerEmail !== "string" ||
      !EMAIL_RE.test(customerEmail.trim())
    ) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 },
      );
    }

    if (
      customerPhone !== undefined &&
      customerPhone !== null &&
      customerPhone !== "" &&
      typeof customerPhone !== "string"
    ) {
      return NextResponse.json(
        { error: "Nomor telepon tidak valid." },
        { status: 400 },
      );
    }

    /* ---------- ambil user saat ini (opsional – guest checkout) ---------- */

    let userId: string | null = null;

    try {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();

      if (authData?.user) {
        userId = authData.user.id;
      }
    } catch {
      // abaikan – guest checkout tetap diizinkan
    }

    /* ---------- lookup paket ---------- */

    const service = createServiceClient();

    const { data: pkg, error: pkgError } = await service
      .from("packages")
      .select("id, name, price, duration_minutes, active")
      .eq("id", parsedPackageId)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json(
        { error: "Paket tidak ditemukan." },
        { status: 404 },
      );
    }

    if (!pkg.active) {
      return NextResponse.json(
        { error: "Paket tidak aktif." },
        { status: 400 },
      );
    }

    if (typeof pkg.price !== "number" || pkg.price <= 0) {
      return NextResponse.json(
        { error: "Paket belum memiliki harga." },
        { status: 400 },
      );
    }

    /* ---------- generate merchant_ref ---------- */

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    const merchantRef = `W28-${timestamp}-${random}`;

    /* ---------- buat transaksi Tripay ---------- */

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const expiredTime = Math.floor(Date.now() / 1000) + 3600;

    const tripayPayload = {
      method: methodName.trim(),
      merchant_ref: merchantRef,
      amount: Math.round(pkg.price),
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim().toLowerCase(),
      customer_phone: customerPhone ? String(customerPhone).trim() : undefined,
      order_items: [
        {
          name: pkg.name,
          price: Math.round(pkg.price),
          quantity: 1,
        },
      ],
      callback_url: appUrl ? `${appUrl}/api/webhooks/tripay` : undefined,
      return_url: appUrl
        ? `${appUrl}/payment/success?ref=${merchantRef}`
        : undefined,
      expired_time: expiredTime,
      signature: createSignature(merchantRef, Math.round(pkg.price)),
    };

    const tripayRes = await createTripayTransaction(tripayPayload);

    if (!tripayRes.success || !tripayRes.data) {
      console.error("TRIPAY CREATE ERROR:", tripayRes.message);

      return NextResponse.json(
        { error: "Gagal membuat transaksi pembayaran. Silakan coba lagi." },
        { status: 502 },
      );
    }

    const td = tripayRes.data;

    /* ---------- simpan transaksi ke database ---------- */

    const { error: insertError } = await service.from("transactions").insert({
      user_id: userId,
      package_id: parsedPackageId,
      guest_name: customerName.trim(),
      guest_email: customerEmail.trim().toLowerCase(),
      guest_phone: customerPhone ? String(customerPhone).trim() : null,
      tripay_ref: td.reference,
      merchant_ref: merchantRef,
      payment_method: td.payment_name,
      payment_method_code: td.payment_method,
      pay_code: td.pay_code,
      checkout_url: td.checkout_url,
      amount: td.amount,
      fee_merchant: td.fee_merchant,
      fee_customer: td.fee_customer,
      amount_received: td.amount_received,
      status: "pending",
      expired_at: new Date(td.expired_time * 1000).toISOString(),
    });

    if (insertError) {
      console.error("TRANSACTION INSERT ERROR:", insertError);

      return NextResponse.json(
        { error: "Gagal menyimpan data transaksi." },
        { status: 500 },
      );
    }

    /* ---------- response ---------- */

    return NextResponse.json({
      success: true,
      checkout_url: td.checkout_url,
      pay_code: td.pay_code,
      reference: td.reference,
      merchant_ref: merchantRef,
      payment_name: td.payment_name,
      instructions: td.instructions,
    });
  } catch (error) {
    console.error("TRANSACTION API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
