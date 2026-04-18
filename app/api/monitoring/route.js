
// /app/api/monitoring/route.js

export async function GET() {
  return Response.json({
    status: "OK",
    message: "API monitoring aktif 🚀",
    time: new Date().toISOString(),
  });
}
