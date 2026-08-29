import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createSnapTransaction } from "@/lib/midtrans";
import { MIN_DEPOSIT, MAX_DEPOSIT } from "@/lib/validation/deposit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    const user = authData.user;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Data tidak valid." },
        { status: 400 },
      );
    }

    const { amount } = (body ?? {}) as { amount?: unknown };

    const parsedAmount = Number(amount);

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      !Number.isInteger(parsedAmount)
    ) {
      return NextResponse.json(
        { error: "Nominal top up tidak valid." },
        { status: 400 },
      );
    }

    if (parsedAmount < MIN_DEPOSIT) {
      return NextResponse.json(
        {
          error: `Minimal top up Rp ${MIN_DEPOSIT.toLocaleString("id-ID")}.`,
        },
        { status: 400 },
      );
    }

    if (parsedAmount > MAX_DEPOSIT) {
      return NextResponse.json(
        {
          error: `Maksimal top up Rp ${MAX_DEPOSIT.toLocaleString("id-ID")} per transaksi.`,
        },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", user.id)
      .maybeSingle();

    /* ---------- buat transaksi Midtrans Snap ---------- */

    const merchantRef = `W28T-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    const snapRes = await createSnapTransaction({
      orderId: merchantRef,
      grossAmount: parsedAmount,
      customerName:
        profile?.full_name ?? profile?.username ?? user.email ?? "Pelanggan",
      customerEmail: user.email ?? "",
      itemName: "Top Up Saldo",
      finishUrl: appUrl ? `${appUrl}/payment/success?ref=${merchantRef}` : "",
    });

    if (!snapRes.token || !snapRes.redirect_url) {
      console.error(
        "MIDTRANS TOPUP SNAP CREATE ERROR:",
        snapRes.status_message ?? snapRes.error_messages,
      );

      return NextResponse.json(
        { error: "Gagal membuat transaksi pembayaran. Silakan coba lagi." },
        { status: 502 },
      );
    }

    /* ---------- simpan transaksi (deposit, package_id null) ---------- */

    const service = createServiceClient();

    const { error: insertError } = await service.from("transactions").insert({
      user_id: user.id,
      package_id: null,
      guest_name: profile?.full_name ?? null,
      guest_email: user.email ?? null,
      guest_phone: null,
      midtrans_order_id: merchantRef,
      snap_token: snapRes.token,
      merchant_ref: merchantRef,
      payment_method: "Top Up Saldo",
      payment_method_code: "MIDTRANS",
      pay_code: null,
      checkout_url: snapRes.redirect_url,
      amount: parsedAmount,
      fee_merchant: 0,
      fee_customer: 0,
      amount_received: parsedAmount,
      status: "pending",
      expired_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error("TOPUP INSERT ERROR:", insertError);

      return NextResponse.json(
        { error: "Gagal menyimpan data transaksi." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      payment_type: "deposit",
      merchant_ref: merchantRef,
      redirect_url: snapRes.redirect_url,
    });
  } catch (error) {
    console.error("TOPUP API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}