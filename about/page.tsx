export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-yellow-500 mb-8">
          Tentang WARUNG28 HOTSPOT
        </h1>

        <p className="mb-6 text-gray-300">
          WARUNG28 HOTSPOT adalah layanan penyedia voucher internet berbasis
          MikroTik yang dirancang untuk memberikan akses internet cepat,
          stabil, dan mudah digunakan.
        </p>

        <p className="mb-6 text-gray-300">
          Pelanggan dapat membeli voucher internet secara online dan menerima
          akses secara otomatis sesuai paket yang dipilih.
        </p>

        <h2 className="text-2xl font-semibold text-yellow-500 mb-4">
          Layanan Kami
        </h2>

        <ul className="list-disc ml-6 text-gray-300 space-y-2">
          <li>Voucher Internet MikroTik</li>
          <li>Aktivasi Otomatis</li>
          <li>Pembelian Online 24 Jam</li>
          <li>Dukungan Pelanggan</li>
        </ul>
      </div>
    </main>
  );
}