const axios = require('axios');

module.exports = async (req, res) => {
  // ==============================================
  // KONFIGURASI
  // ==============================================
  const TOKEN_FONNTE = "gmPdJaM9UV9QDteqLhFT";
  const NOMOR_ADMIN = "628132839834";
  // ==============================================

  try {
    // Ambil data dari request
    const { username, paket, harga, nomor } = req.body;

    // === KIRIM NOTIF KE WA ADMIN ===
    await axios.post('https://api.fonnte.com/send', {
      target: NOMOR_ADMIN,
      message: `🛒 *ORDER BARU MASUK*
👤 User: ${username}
📦 Paket: ${paket}
💵 Harga: Rp ${harga}
📱 Nomor: ${nomor}`
    }, { headers: { Authorization: TOKEN_FONNTE } });

    res.send("Notif Terkirim");

  } catch (err) {
    console.log(err);
    res.send("Error");
  }
}
