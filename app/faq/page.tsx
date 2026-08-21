export default function FAQPage() {
  return (
    <main className="min-h-screen bg-[#080808] text-[#f2f0ea]">
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">

          <h1 className="text-5xl font-black text-[#b89b5e]">
            FAQ
          </h1>

          <div className="mt-10 space-y-6">

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="font-bold">
                Bagaimana cara membeli voucher?
              </h3>
              <p className="mt-3 text-[#a7a39a]">
                Pilih paket yang tersedia kemudian lakukan pembayaran sesuai instruksi.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="font-bold">
                Kapan voucher aktif?
              </h3>
              <p className="mt-3 text-[#a7a39a]">
                Voucher akan aktif setelah pembayaran berhasil diverifikasi.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-6">
              <h3 className="font-bold">
                Apakah tersedia bantuan pelanggan?
              </h3>
              <p className="mt-3 text-[#a7a39a]">
                Ya, pelanggan dapat menghubungi admin melalui WhatsApp.
              </p>
            </div>

          </div>

        </div>
      </section>
    </main>
  );
}
