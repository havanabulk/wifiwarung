export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-yellow-500 mb-8">
          Kebijakan Privasi
        </h1>

        <p className="mb-4">
          WARUNG28 HOTSPOT menghargai privasi seluruh pengguna layanan.
        </p>

        <ul className="list-disc ml-6 space-y-2">
          <li>Nama pengguna</li>
          <li>Email</li>
          <li>Nomor WhatsApp</li>
          <li>Riwayat transaksi</li>
        </ul>

        <p className="mt-6">
          Data digunakan untuk verifikasi transaksi, layanan pelanggan,
          dan peningkatan kualitas layanan.
        </p>
      </div>
    </main>
  );
}