const axios = require('axios');

module.exports = async (req, res) => {
  // ==============================================
  // KONFIGURASI
  // ==============================================
  const TOKEN_FONNTE = "ATNj8R4x7cZ4URHzcwWz";
  const TOKEN_TELEGRAM = "8261918164:AAG_SblTlyCb4_uAIncrQKifprYKatU5QmY";
  const CHAT_ID = 8788191179;
  
  const IP_MODEM = "192.168.101.1";
  const IP_MIKROTIK = "http://103.151.36.238:8080";
  const USER_MIKROTIK = "admin";
  const PASS_MIKROTIK = "1";
  
  const NOMOR_ADMIN = "6281339165625";
  const NOMOR_ISP = "6281808885550";
  // ==============================================

  try {
    // LOGIKA CEK KONEKSI (PING KE MODEM)
    // Kita coba ping ke modem dulu
    const pingModem = await axios.get(`https://ping.pe/${IP_MODEM}`).catch(() => null);
    
    let isOffline = true;
    if(pingModem && pingModem.data && pingModem.data.includes("Reply from")) {
      isOffline = false;
    }

    if(isOffline) {
      // === KIRIM KE ISP ===
      const pesanISP = `32248 - I Wayan Sukarma
Jl. Uluwatu Gg. Seruni No. 28 , Kelan - Tuban
sedang mengalami offline mohon di cek`;

      await axios.post('https://api.fonnte.com/send', {
        target: NOMOR_ISP,
        message: pesanISP
      }, { headers: { Authorization: TOKEN_FONNTE } });

      // === NOTIF KE TELEGRAM ===
      await axios.get(`https://api.telegram.org/bot${TOKEN_TELEGRAM}/sendMessage`, {
        params: {
          chat_id: CHAT_ID,
          text: `⚠️ *ALERT SISTEM - OFFLINE DETECTED*
          
📍 Lokasi: Kelan - Tuban
✅ Status: Laporan sudah terkirim ke ISP via WA.
📝 Catatan: Tidak perlu balas chat dari ISP.`
        }
      });

    } else {
      // Kalau normal, diam saja
    }

    res.send("Monitoring Selesai");

  } catch (err) {
    console.log(err);
    res.send("Error");
  }
}
