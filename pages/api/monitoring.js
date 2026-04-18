import { createClient } from "@supabase/supabase-js";

// 🔒 init supabase (safe)
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

// ⏱️ delay 3 menit
const DELAY = 3 * 60 * 1000;

// 🌐 cek koneksi ISP
async function checkConnection() {
  try {
    const res = await fetch("https://www.google.com", { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// 🔌 restart modem (optional)
async function restartModem() {
  try {
    if (!process.env.MODEM_RESTART_URL) return;

    await fetch(process.env.MODEM_RESTART_URL, {
      method: "POST",
    });
  } catch (err) {
    console.error("Restart error:", err.message);
  }
}

// 📲 WhatsApp
async function sendWhatsApp(location) {
  try {
    if (!process.env.FONNTE_TOKEN) return;

    await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: process.env.FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: process.env.ISP_PHONE,
        message: `🚨 ISP DOWN\nLokasi: ${location}`,
      }),
    });
  } catch (err) {
    console.error("WA error:", err.message);
  }
}

// 📩 Telegram
async function sendTelegram(location) {
  try {
    if (!process.env.TELEGRAM_TOKEN) return;

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `🚨 ISP DOWN\nLokasi: ${location}`,
      }),
    });
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
}

// 🚀 MAIN API
export default async function handler(req, res) {
  try {
    // 🔍 cek supabase
    if (!supabase) {
      return res.status(200).json({
        status: "error",
        message: "ENV Supabase belum di set",
      });
    }

    const isUp = await checkConnection();

    const { data: rows, error } = await supabase
      .from("monitoring_status")
      .select("*");

    if (error) {
      return res.status(200).json({
        status: "error",
        message: error.message,
      });
    }

    let notifSent = 0;
    const now = Date.now();

    for (const row of rows || []) {
      if (!isUp) {
        // ❌ ISP DOWN

        if (!row.last_offline_timestamp) {
          // pertama kali down
          await supabase
            .from("monitoring_status")
            .update({
              last_offline_timestamp: now,
              notification_sent: false,
            })
            .eq("id", row.id);

          await restartModem();
          continue;
        }

        const diff = now - row.last_offline_timestamp;

        if (diff >= DELAY && !row.notification_sent) {
          await sendTelegram(row.location);
          await sendWhatsApp(row.location);

          await supabase
            .from("monitoring_status")
            .update({
              notification_sent: true,
            })
            .eq("id", row.id);

          notifSent++;
        }

      } else {
        // ✅ ISP UP

        if (row.last_offline_timestamp) {
          await supabase
            .from("monitoring_status")
            .update({
              last_offline_timestamp: null,
              notification_sent: false,
            })
            .eq("id", row.id);
        }
      }
    }

    return res.status(200).json({
      status: "success",
      isp: isUp ? "UP" : "DOWN",
      notifications_sent: notifSent,
      total_locations: rows?.length || 0,
    });

  } catch (err) {
    console.error("FATAL:", err);

    return res.status(200).json({
      status: "error",
      message: err.message,
    });
  }
}
