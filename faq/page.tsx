export default function FAQPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-yellow-500 mb-8">
          FAQ
        </h1>

        <div className="space-y-6">
          <div>
            <h2 className="font-bold">
              Bagaimana cara membeli voucher?
            </h2>
            <p>Pilih paket dan lakukan pembayaran.</p>
          </div>

          <div>
            <h2 className="font-bold">
              Kapan voucher diterima?
            </h2>
            <p>Setelah pembayaran berhasil dikonfirmasi.</p>
          </div>

          <div>
            <h2 className="font-bold">
              Apakah tersedia 24 jam?
            </h2>
            <p>Ya, sistem berjalan 24 jam.</p>
          </div>
        </div>
      </div>
    </main>
  );
}