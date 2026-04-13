const axios = require('axios');

module.exports = async (req, res) => {
  // ==============================================
  // KONFIGURASI
  // ==============================================
  const TOKEN_FONNTE = "ATNj8R4x7cZ4URHzcwWz";
  const TOKEN_TELEGRAM = "8261918164:AAG_SblTlyCb4_uAIncrQKifprYKatU5QmY";
  const CHAT_ID = 8788191179;
  
  const IP_MODEM = "192.168.101.1";
  // const IP_MIKROTIK = "http://103.151.36.238:8080"; // Tidak terpakai di logika saat ini
  // const USER_MIKROTIK = "admin"; // Tidak terpakai di logika saat ini
  // const PASS_MIKROTIK = "1"; // Tidak terpakai di logika saat ini
  
  const NOMOR_ISP = "6281808885550";
  const NOMOR_PELANGGAN_INFO = "628132839834"; // Nomor baru untuk info kembali online
  // ==============================================

  try {
    // LOGIKA CEK KONEKSI (PING KE MODEM)
    // Kita coba ping ke modem dulu
    // Menggunakan try-catch di dalam axios.get untuk menangani error ping secara spesifik
    let pingSuccess = false;
    let pingResponseData = null;
    try {
      const pingModem = await axios.get(`https://ping.pe/${IP_MODEM}`);
      pingResponseData = pingModem.data;
      if(pingResponseData && pingResponseData.includes("Reply from")) {
        pingSuccess = true;
      }
    } catch (pingError) {
      // Jika axios.get gagal (misal: timeout, DNS error, atau ping.pe error), anggap ping gagal
      console.log(`Ping to ${IP_MODEM} via ping.pe failed: ${pingError.message}`);
      pingSuccess = false;
    }

    // Logika status saat ini (apakah sedang offline atau online)
    // Kita perlu menyimpan status sebelumnya untuk mendeteksi perubahan
    // Namun, karena ini adalah fungsi stateless (tiap request jalan sendiri),
    // kita tidak bisa menyimpan status antar pemanggilan cron job dengan mudah.
    // Solusi paling sederhana: Asumsikan setiap pemanggilan adalah pengecekan baru.
    // Jika ping berhasil, kita anggap sudah kembali online. Jika gagal, anggap offline.

    if (!pingSuccess) {
      // === KONEKSI OFFLINE ===
      console.log(`Status: OFFLINE - ${IP_MODEM}`);

      // === KIRIM KE ISP ===
      const pesanISP = `32248 - I Wayan Sukarma
Jl. Uluwatu Gg. Seruni No. 28 , Kelan - Tuban
sedang mengalami offline mohon di cek`;

      await axios.post('https://api.fonnte.com/send', {
        target: NOMOR_ISP,
        message: pesanISP
      }, { headers: { Authorization: TOKEN_FONNTE } });
      console.log(`Report sent to ISP (${NOMOR_ISP})`);

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
      console.log(`Telegram alert sent to ${CHAT_ID}`);

    } else {
      // === KONEKSI ONLINE KEMBALI ===
      console.log(`Status: ONLINE - ${IP_MODEM}`);
      
      // === KIRIM PESAN KE PELANGGAN INFO ===
      const pesanPelanggan = `Layanan Sudah Kembali Online`;

      await axios.post('https://api.fonnte.com/send', {
        target: NOMOR_PELANGGAN_INFO,
        message: pesanPelanggan
      }, { headers: { Authorization: TOKEN_FONNTE } });
      console.log(`Online notification sent to customer info (${NOMOR_PELANGGAN_INFO})`);

      // Anda bisa tambahkan notifikasi Telegram jika ingin tahu saat online kembali
      // await axios.get(`https://api.telegram.org/bot${TOKEN_TELEGRAM}/sendMessage`, {
      //   params: {
      //     chat_id: CHAT_ID,
      //     text: `✅ *INFO - LAYANAN KEMBALI ONLINE*
            
      // 📍 Lokasi: Kelan - Tuban
      // ℹ️ Status: Koneksi ke modem (${IP_MODEM}) sudah pulih.`
      //   }
      // });
      // console.log(`Telegram online notification sent to ${CHAT_ID}`);
    }

    res.send("Monitoring Selesai");

  } catch (err) {
    console.error("Error in monitoring script:", err.message); // Log error lebih detail
    // Jika terjadi error saat mengirim pesan ke Fonnte/Telegram, error akan tertangkap di sini
    // Kita tetap kirim "Monitoring Selesai" agar cron job terlihat berhasil, tapi log error akan tercatat
    res.send("Monitoring Selesai (dengan potensi error)"); 
  }
}
