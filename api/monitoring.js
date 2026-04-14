const axios = require('axios');
const { createClient } = require('@supabase/supabase-js'); // Import Supabase client

// --- KONFIGURASI UMUM ---
const TOKEN_FONNTE = "gmPdJaM9UV9QDteqLhFT";
const TOKEN_TELEGRAM = "8261918164:AAG_SblTlyCb4_uAIncrQKifprYKatU5QmY";
const CHAT_ID = 8788191179;
const IP_MODEM = "192.168.1.1";
const NOMOR_ISP = "6281808885550";
const NOMOR_PELANGGAN_INFO = "628132839834"; // Nomor untuk notifikasi kembali online

// --- KONFIGURASI SUPABASE ---
// GANTI DENGAN DETAIL SUPABASE ANDA
const supabaseUrl = 'https://dvnryjdxlnnaejeylktz.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnJ5amR4bG5uYWVqZXlsa3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzk3MzAsImV4cCI6MjA5MTY1NTczMH0.4OYMrEMIgKL81GzBDSmwmaN-FOeXsCv823l04SVtRl4'; // <-- GANTI DENGAN ANON KEY ANDA
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- KONFIGURASI LOGIKA MONITORING ---
const LOCATION_KEY = "Kelan - Tuban"; // Harus SAMA dengan data di tabel Supabase
const OFFLINE_THRESHOLD_MINUTES = 15; // Jeda waktu sebelum notifikasi ISP
const OFFLINE_THRESHOLD_MS = OFFLINE_THRESHOLD_MINUTES * 60 * 1000; // Jeda dalam milidetik

// --- FUNGSI UTAMA MODUL ---
module.exports = async (req, res) => {
  try {
    let isCurrentlyOffline = false;
    let pingResponseData = null;

    // === LANGKAH 1: CEK KONEKSI SAAT INI ===
    try {
      // Menggunakan ping.pe untuk mengecek koneksi ke IP Modem
      const pingModem = await axios.get(`https://ping.pe/${IP_MODEM}`);
      pingResponseData = pingModem.data;
      
      // Cek apakah respons ping.pe mengandung indikasi sukses
      if (pingResponseData && pingResponseData.includes("Reply from")) {
        isCurrentlyOffline = false; // Koneksi OK
        console.log(`[${LOCATION_KEY}] Status: ONLINE - ${IP_MODEM}`);
      } else {
        isCurrentlyOffline = true; // Koneksi GAGAL (tidak ada "Reply from")
        console.log(`[${LOCATION_KEY}] Status: OFFLINE - ${IP_MODEM} (via ping.pe check)`);
      }
    } catch (pingError) {
      isCurrentlyOffline = true; // Koneksi GAGAL jika ada error saat request ke ping.pe
      console.log(`[${LOCATION_KEY}] Ping to ${IP_MODEM} via ping.pe FAILED: ${pingError.message}`);
    }

    // === LANGKAH 2: LOGIKA KEPUTUSAN NOTIFIKASI BERDASARKAN STATUS & SUPABASE ===
    if (isCurrentlyOffline) {
      // Koneksi sedang OFFLINE saat ini.
      const currentTime = Date.now();

      // Ambil data status monitoring dari Supabase untuk lokasi ini
      const { data: monitoringStatus, error: supabaseError } = await supabase
        .from('monitoring_status')
        .select('*')
        .eq('location', LOCATION_KEY)
        .maybeSingle(); // Ambil satu data, atau null jika tidak ada

      if (supabaseError) {
        console.error(`[Supabase Error] Failed to fetch status for ${LOCATION_KEY}:`, supabaseError.message);
        // Lanjutkan eksekusi, tapi mungkin tanpa jeda waktu yang andal
      }

      if (!monitoringStatus) {
        // Belum ada catatan offline di Supabase, atau sudah dihapus.
        // Ini adalah deteksi offline PERTAMA.
        console.log(`[${LOCATION_KEY}] First offline detection. Recording timestamp in Supabase.`);
        
        // Masukkan data baru ke Supabase
        const { error: insertError } = await supabase
          .from('monitoring_status')
          .insert([
            {
              location: LOCATION_KEY,
              last_offline_timestamp: currentTime,
              notification_sent: false, // Belum dikirim ke ISP
            },
          ]);
        
        if (insertError) {
          console.error(`[Supabase Error] Failed to insert offline status for ${LOCATION_KEY}:`, insertError.message);
        } else {
          console.log(`[${LOCATION_KEY}] Offline timestamp recorded.`);
        }
        
        // JANGAN KIRIM NOTIFIKASI KE ISP DULU. Tunggu pengecekan berikutnya.

      } else {
        // Sudah ada catatan offline sebelumnya di Supabase.
        const lastOfflineTimestamp = parseInt(monitoringStatus.last_offline_timestamp);
        const timeSinceLastOffline = currentTime - lastOfflineTimestamp;

        if (monitoringStatus.notification_sent) {
          // Notifikasi ke ISP sudah pernah dikirim sebelumnya, dan koneksi masih offline.
          // Ini bisa terjadi jika koneksi pulih sebentar lalu offline lagi.
          // Kita tidak perlu melakukan apa-apa lagi sampai koneksi pulih.
          console.log(`[${LOCATION_KEY}] Offline detected, but notification to ISP was already sent previously. Waiting for recovery.`);
        
        } else if (timeSinceLastOffline >= OFFLINE_THRESHOLD_MS) {
          // Kondisi: Masih offline, belum pernah dikirim notif ke ISP, DAN sudah lebih dari 15 menit.
          console.log(`[${LOCATION_KEY}] Offline for more than ${OFFLINE_THRESHOLD_MINUTES} minutes. Sending report to ISP.`);

          // === KIRIM LAPORAN KE ISP VIA WA ===
          const pesanISP = `32248 - I Wayan Sukarma
Jl. Uluwatu Gg. Seruni No. 28 , Kelan - Tuban
sedang mengalami offline mohon di cek`;
          await axios.post('https://api.fonnte.com/send', { target: NOMOR_ISP, message: pesanISP }, { headers: { Authorization: TOKEN_FONNTE } });
          console.log(`[${LOCATION_KEY}] Report sent to ISP (${NOMOR_ISP}) via WA.`);

          // === KIRIM NOTIFIKASI KE TELEGRAM ===
          await axios.get(`https://api.telegram.org/bot${TOKEN_TELEGRAM}/sendMessage`, {
            params: {
              chat_id: CHAT_ID,
              text: `⚠️ *ALERT SISTEM - OFFLINE DETECTED (After ${OFFLINE_THRESHOLD_MINUTES}min wait)*\n\n📍 Lokasi: ${LOCATION_KEY}\n✅ Status: Laporan sudah terkirim ke ISP via WA.`
            }
          });
          console.log(`[${LOCATION_KEY}] Telegram alert sent to ${CHAT_ID}.`);

          // Tandai bahwa notifikasi ke ISP sudah dikirim di Supabase
          const { error: updateError } = await supabase
            .from('monitoring_status')
            .update({ notification_sent: true })
            .eq('id', monitoringStatus.id);
          
          if (updateError) {
            console.error(`[Supabase Error] Failed to update notification status for ${LOCATION_KEY}:`, updateError.message);
          } else {
            console.log(`[${LOCATION_KEY}] Notification status updated to 'sent' in Supabase.`);
          }

        } else {
          // Masih offline tapi belum mencapai jeda 15 menit
          const remainingWaitMinutes = Math.round((OFFLINE_THRESHOLD_MS - timeSinceLastOffline) / 1000 / 60);
          console.log(`[${LOCATION_KEY}] Offline detected, but waiting for ${remainingWaitMinutes} more minutes before notifying ISP.`);
        }
      }

    } else {
      // === KONEKSI KEMBALI ONLINE ===
      console.log(`[${LOCATION_KEY}] Status: ONLINE - ${IP_MODEM}`);
      
      // Hapus catatan offline dari Supabase jika ada, karena koneksi sudah pulih
      const { error: deleteError } = await supabase
        .from('monitoring_status')
        .delete()
        .eq('location', LOCATION_KEY);
      
      if (deleteError) {
        console.error(`[Supabase Error] Failed to delete offline status for ${LOCATION_KEY}:`, deleteError.message);
      } else {
        console.log(`[${LOCATION_KEY}] Offline status cleared from Supabase.`);
      }

      // === KIRIM NOTIFIKASI KE PELANGGAN INFO BAHWA LAYANAN SUDAH KEMBALI ONLINE ===
      const pesanPelanggan = `Layanan Sudah Kembali Online`;
      await axios.post('https://api.fonnte.com/send', { target: NOMOR_PELANGGAN_INFO, message: pesanPelanggan }, { headers: { Authorization: TOKEN_FONNTE } });
      console.log(`[${LOCATION_KEY}] Online notification sent to customer info (${NOMOR_PELANGGAN_INFO}) via WA.`);
    }

    // Kirim respons sukses ke cron job/pemanggil API
    res.send("Monitoring Selesai");

  } catch (err) {
    // Tangani error umum yang mungkin terjadi di luar pengecekan ping atau Supabase
    console.error(`[ERROR] Uncaught error in monitoring script for ${LOCATION_KEY}:`, err.message);
    res.status(500).send("Monitoring Selesai (dengan potensi error)"); // Gunakan status 500 untuk error server
  }
};
