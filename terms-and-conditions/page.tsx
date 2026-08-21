export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-yellow-500 mb-8">
          Syarat & Ketentuan
        </h1>

        <ul className="list-disc ml-6 space-y-3">
          <li>Voucher digunakan sesuai masa aktif paket.</li>
          <li>Voucher tidak dapat dipindahtangankan setelah digunakan.</li>
          <li>Pembayaran dianggap sah setelah dikonfirmasi sistem.</li>
          <li>Pengguna wajib mematuhi hukum yang berlaku.</li>
        </ul>
      </div>
    </main>
  );
}