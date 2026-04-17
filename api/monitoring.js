// /pages/api/handler.js  (Next.js)
// atau /api/handler.js (Vercel serverless)

export default async function handler(req, res) {
  // ⛳ hanya allow method tertentu (optional tapi best practice)
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Method Not Allowed",
    });
  }

  try {
    console.log("🚀 Function triggered");

    // ambil data request (aman dari undefined)
    const body = req.body || {};
    const query = req.query || {};

    console.log("📥 Body:", body);
    console.log("🔎 Query:", query);

    // contoh validasi sederhana
    if (req.method === "POST" && !body) {
      return res.status(400).json({
        status: "error",
        message: "Body is required",
      });
    }

    // ⛳ contoh logic utama kamu
    const result = {
      success: true,
      message: "Serverless function berjalan dengan normal 🚀",
      data: {
        method: req.method,
        timestamp: new Date().toISOString(),
      },
    };

    // ⛳ WAJIB return response
    return res.status(200).json(result);

  } catch (error) {
    // ❗ logging detail (penting untuk Vercel logs)
    console.error("❌ ERROR:", error);

    return res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      detail: error.message || "Unknown error",
    });
  }
}
