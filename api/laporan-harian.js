const axios = require('axios');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {

  // ==============================================
  // DATA LAPORAN (AMBIL DARI MIKROTIK)
  // ==============================================
  const totalUser = 150; // Nanti ambil data asli
  const penjualanHariIni = "Rp 750.000";
  const userAktif = 120;
  const userExpired = 30;

  // ==============================================
  // TEMPLATE HTML EMAIL YANG KEREN
  // ==============================================
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Laporan Harian WiFi</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
      .container { max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(45deg, #007bff, #0056b3); color: white; padding: 15px; text-align: center; border-radius: 8px; }
      .data { margin: 20px 0; }
      .item { padding: 10px; border-bottom: 1px solid #eee; }
      .total { font-size: 18px; font-weight: bold; color: #28a745; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📊 LAPORAN HARIAN</h1>
        <p>Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
      </div>
      
      <div class="data">
        <div class="item">👥 Total User Terdaftar: <strong>${totalUser}</strong></div>
        <div class="item">🟢 User Aktif Hari Ini: <strong>${userAktif}</strong></div>
        <div class="item">🔴 User Expired: <strong>${userExpired}</strong></div>
        <div class="item total">💰 Total Penjualan: ${penjualanHariIni}</div>
      </div>

      <p style="text-align:center; color:#777; margin-top:30px;">
        --- Laporan Otomatis Sistem WiFi ---
      </p>
    </div>
  </body>
  </html>
  `;

  // ==============================================
  // KIRIM EMAIL
  // ==============================================
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'emailkamu@gmail.com',
      pass: 'passwordemail'
    }
  });

  let mailOptions = {
    from: '"Laporan WiFi" <noreply@wifi.com>',
    to: 'karmawayan@gmail.com',
    subject: `📊 LAPORAN HARIAN - ${new Date().toLocaleDateString('id-ID')}`,
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);

  // KIRIM NOTIF KE WA ADMIN
  await axios.post('https://api.fonnte.com/send', {
    target: "6281339165625",
    message: `📧 *LAPORAN HARIAN TERKIRIM*
✅ Email sudah dikirim ke karmawayan@gmail.com
📊 Total Penjualan: ${penjualanHariIni}
👥 Total User: ${totalUser}`
  }, { headers: { Authorization: "ATNj8R4x7cZ4URHzcwWz" } });

  res.send("Laporan Terkirim!");
}
