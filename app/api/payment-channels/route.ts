import { NextResponse } from "next/server";
import { getTripayPaymentChannels } from "@/lib/tripay";

export async function GET() {
  try {
    const channels = await getTripayPaymentChannels();

    const active = channels.filter((ch) => ch.active);

    return NextResponse.json({ channels: active });
  } catch (error) {
    console.error("PAYMENT CHANNELS ERROR:", error);

    return NextResponse.json(
      { error: "Gagal memuat metode pembayaran." },
      { status: 500 },
    );
  }
}
