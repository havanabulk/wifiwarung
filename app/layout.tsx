import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WARUNG28 HOTSPOT",
  description:
    "WARUNG28 HOTSPOT - Internet cepat, stabil dan fleksibel.",
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