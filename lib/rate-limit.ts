// Catatan: header IP hanya bisa dipercaya bila aplikasi berjalan di
// balik reverse proxy tepercaya (Vercel/Cloudflare/Nginx) yang
// menimpa atau menambahkan nilainya. Entri TERAKHIR pada
// x-forwarded-for adalah yang ditambahkan proxy terdekat; entri awal
// bisa dibuat-buat oleh client.

export function getClientIp(request: Request): string {
  const cloudflare = request.headers.get("cf-connecting-ip");

  if (cloudflare?.trim()) {
    return cloudflare.trim();
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp?.trim()) {
    return realIp.trim();
  }

  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (entries.length > 0) {
      return entries[entries.length - 1];
    }
  }

  return "unknown";
}
