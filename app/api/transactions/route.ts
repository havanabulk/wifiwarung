import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { createSnapTransaction } from "@/lib/midtrans";

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

    /* ---------- CASH: langsung simpan tanpa gateway online ---------- */

    const isCash =
      typeof methodName === "string" &&
      methodName.trim().toUpperCase() === "CASH";

    if (isCash) {
      const { error: insertError } = await service.from("transactions").insert({
        user_id: userId,
        package_id: parsedPackageId,
        guest_name: customerName.trim(),
        guest_email: customerEmail.trim().toLowerCase(),
        guest_phone: customerPhone ? String(customerPhone).trim() : null,
        merchant_ref: merchantRef,
        payment_method: "Tunai di Tempat",
        payment_method_code: "CASH",
        amount: Math.round(pkg.price),
        status: "pending",
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      if (insertError) {
        console.error("CASH TRANSACTION INSERT ERROR:", insertError);

        return NextResponse.json(
          { error: "Gagal menyimpan data transaksi." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        payment_type: "cash",
        merchant_ref: merchantRef,
        payment_name: "Tunai di Tempat",
        amount: Math.round(pkg.price),
      });
    }

    /* ---------- MIDTRANS SNAP: buat transaksi online ---------- */

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const amount = Math.round(pkg.price);
    const normalizedEmail = customerEmail.trim().toLowerCase();

    const snapRes = await createSnapTransaction({
      orderId: merchantRef,
      grossAmount: amount,
      customerName: customerName.trim(),
      customerEmail: normalizedEmail,
      customerPhone: customerPhone ? String(customerPhone).trim() : undefined,
      itemName: pkg.name,
      finishUrl: appUrl
        ? `${appUrl}/payment/success?ref=${merchantRef}`
        : "",
    });

    if (!snapRes.token || !snapRes.redirect_url) {
      console.error(
        "MIDTRANS SNAP CREATE ERROR:",
        snapRes.status_message ?? snapRes.error_messages,
      );

      return NextResponse.json(
        { error: "Gagal membuat transaksi pembayaran. Silakan coba lagi." },
        { status: 502 },
      );
    }

    /* ---------- simpan transaksi ke database ---------- */

    const { error: insertError } = await service.from("transactions").insert({
      user_id: userId,
      package_id: parsedPackageId,
      guest_name: customerName.trim(),
      guest_email: normalizedEmail,
      guest_phone: customerPhone ? String(customerPhone).trim() : null,
      midtrans_order_id: merchantRef,
      snap_token: snapRes.token,
      merchant_ref: merchantRef,
      payment_method: "Midtrans",
      payment_method_code: "MIDTRANS",
      pay_code: null,
      checkout_url: snapRes.redirect_url,
      amount,
      fee_merchant: 0,
      fee_customer: 0,
      amount_received: amount,
      status: "pending",
      expired_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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
      payment_type: "midtrans",
      merchant_ref: merchantRef,
      redirect_url: snapRes.redirect_url,
    });
  } catch (error) {
    console.error("TRANSACTION API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
