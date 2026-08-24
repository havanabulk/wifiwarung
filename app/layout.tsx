import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://warung28.my.id"),

  title: "Warung28 Hotspot WiFi",

  description:
    "Pembelian voucher WiFi MikroTik online. Paket 1 Jam, 2 Jam, 3 Jam, Harian, Mingguan dan Bulanan.",

  keywords: [
    "wifi",
    "voucher wifi",
    "hotspot",
    "mikrotik",
    "warung28",
    "wifi bali",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
