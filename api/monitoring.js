import { createClient } from "@supabase/supabase-js";

// 🔒 PASTIKAN NODE (bukan edge)
export const config = {
  runtime: "nodejs",
};

// ✅ SAFE ENV
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// jangan langsung create kalau env kosong
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

const DELAY = 3 * 60 * 1000;

// ✅ SAFE CHECK
async function checkConnection() {
  try {
    const res = await fetch("https://www.google.com", { method: "HEAD" });
    return res.ok;
  } catch (e) {
    console.error("checkConnection:", e.message);
    return false;
  }
}

// 🚀 MAIN
export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    console.log("🚀 START:", requestId);

    // 🔍 DEBUG ENV (penting)
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(200).json({
        status: "debug",
        error: "ENV Supabase belum di set",
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_KEY: !!SUPABASE_KEY,
      });
    }

    if (!supabase) {
      throw new Error("Supabase init gagal");
    }

    const isUp = await checkConnection();

    // 🔍 TEST QUERY DULU
    const { data, error } = await supabase
      .from("monitoring_status")
      .select("*")
      .limit(1);

    if (error) {
      return res.status(200).json({
        status: "debug",
        step: "query_error",
        error: error.message,
      });
    }

    return res.status(200).json({
      status: "success",
      requestId,
      isp: isUp ? "UP" : "DOWN",
      sample_data: data,
    });

  } catch (err) {
    console.error("❌ FATAL:", err);

    // ❗ JANGAN langsung 500 dulu
    return res.status(200).json({
      status: "crash",
      message: err.message,
      stack: err.stack,
    });
  }
}
