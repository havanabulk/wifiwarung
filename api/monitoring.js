import { createClient } from "@supabase/supabase-js";

// 🔒 pastikan pakai NODE runtime (bukan edge)
export const config = {
  runtime: "nodejs",
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const DELAY = 3 * 60 * 1000;

// ✅ SAFE CHECK CONNECTION
async function checkConnection() {
  try {
    const res = await fetch("https://www.google.com", { method: "HEAD" });
    return res.ok;
  } catch (err) {
    console.error("checkConnection error:", err.message);
    return false;
  }
}

// ✅ SAFE RESTART (tidak bikin crash)
async function restartModem() {
  try {
    if (!process.env.MODEM_RESTART_URL) {
      console.log("⚠️ MODEM_RESTART_URL kosong, skip restart");
      return;
    }

    console.log("🔁 Restart modem...");

    await fetch(process.env.MODEM_RESTART_URL, {
      method: "POST",
    });

  } catch (err) {
    console.error("Restart modem error:", err.message);
  }
}

// ✅ SAFE WA
async function sendWhatsApp(location) {
  try {
    if (!process.env.FONNTE_TOKEN) {
      console.log("⚠️ FONNTE_TOKEN kosong, skip WA");
      return;
    }

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

// ✅ SAFE TELEGRAM
async function sendTelegram(location) {
  try {
    if (!process.env.TELEGRAM_TOKEN) {
      console.log("⚠️ TELEGRAM_TOKEN kosong, skip Telegram");
      return;
    }

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

// 🚀 MAIN
export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    console.log("🚀 START:", requestId);

    // 🔍 cek ENV dulu
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      throw new Error("Supabase ENV belum di set");
    }

    const isUp = await checkConnection();

    const { data: rows, error } = await supabase
      .from("monitoring_status")
      .select("*");

    if (error) throw error;

    if (!rows) {
      return res.status(200).json({
        status: "ok",
        message: "No data",
      });
    }

    let notifSent = 0;

    for (const row of rows) {
      const now = Date.now();

      if (!isUp) {
        if (!row.last_offline_timestamp) {
          console.log("DOWN → restart");

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
          console.log("Kirim notif");

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
        if (row.last_offline_timestamp) {
          console.log("RECOVERED");

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
      requestId,
      isp: isUp ? "UP" : "DOWN",
      notifSent,
    });

  } catch (err) {
    console.error("❌ ERROR:", err);

    return res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
}
