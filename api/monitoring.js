import { createClient } from "@supabase/supabase-js";

// 🔗 koneksi Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ⏱️ delay sebelum kirim notif (ms)
const DELAY = 3 * 60 * 1000; // 3 menit

// 🌐 cek koneksi internet
async function checkConnection() {
  try {
    const res = await fetch("https://www.google.com", { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// 🔌 restart modem
async function restartModem() {
  try {
    console.log("🔁 Restart modem...");

    await fetch(process.env.MODEM_RESTART_URL, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.MODEM_USER}:${process.env.MODEM_PASS}`
          ).toString("base64"),
      },
    });

  } catch (err) {
    console.error("❌ Restart gagal:", err.message);
  }
}

// 📲 WhatsApp (Fonnte)
async function sendWhatsApp(location) {
  await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: process.env.FONNTE_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: process.env.ISP_PHONE,
      message: `🚨 ISP DOWN

Lokasi: ${location}
Sudah dicoba restart modem
Masih tidak ada koneksi

Mohon segera ditindak.`,
    }),
  });
}

// 📩 Telegram
async function sendTelegram(location) {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `🚨 ISP DOWN\nLokasi: ${location}\nTidak pulih setelah restart modem.`,
      }),
    }
  );
}

// 🧠 update database
async function updateDB(id, data) {
  await supabase
    .from("monitoring_status")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

// 🚀 MAIN HANDLER
export default async function handler(req, res) {
  const requestId = Date.now();

  try {
    console.log("🚀 Monitoring start:", requestId);

    const isUp = await checkConnection();

    const { data: rows, error } = await supabase
      .from("monitoring_status")
      .select("*");

    if (error) throw error;

    let notifSent = 0;

    for (const row of rows) {
      const now = Date.now();

      if (!isUp) {
        // ❌ ISP DOWN

        if (!row.last_offline_timestamp) {
          console.log(`⚠️ ${row.location} DOWN → restart modem`);

          await updateDB(row.id, {
            last_offline_timestamp: now,
            notification_sent: false,
          });

          await restartModem();
          continue;
        }

        const diff = now - row.last_offline_timestamp;

        if (diff >= DELAY && !row.notification_sent) {
          console.log(`🚨 ${row.location} masih DOWN → kirim notif`);

          await sendTelegram(row.location);
          await sendWhatsApp(row.location);

          await updateDB(row.id, {
            notification_sent: true,
          });

          notifSent++;
        }

      } else {
        // ✅ ISP UP

        if (row.last_offline_timestamp) {
          console.log(`✅ ${row.location} RECOVERED`);

          await updateDB(row.id, {
            last_offline_timestamp: null,
            notification_sent: false,
          });
        }
      }
    }

    return res.status(200).json({
      status: "success",
      requestId,
      isp_status: isUp ? "UP" : "DOWN",
      notifications_sent: notifSent,
    });

  } catch (err) {
    console.error("❌ ERROR:", requestId, err);

    return res.status(500).json({
      status: "error",
      requestId,
      message: err.message,
    });
  }
}
