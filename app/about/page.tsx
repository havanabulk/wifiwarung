export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#080808] text-[#f2f0ea]">
      {/* HERO */}
      <section className="relative overflow-hidden py-24 px-6">
        <div
          className="
            absolute
            left-1/2
            top-0
            h-72
            w-72
            -translate-x-1/2
            rounded-full
            bg-[#b89b5e]/10
            blur-[120px]
          "
        />

        <div className="relative mx-auto max-w-5xl text-center">
          <div
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[#b89b5e]/20
              bg-[#b89b5e]/5
              px-4
              py-2
              text-[11px]
              font-semibold
              tracking-[0.15em]
              text-[#c8ad72]
            "
          >
            ⚡ WARUNG28 HOTSPOT
          </div>

          <h1
            className="
              mt-8
              text-5xl
              font-black
              tracking-tight
              sm:text-6xl
            "
          >
            Tentang
            <span className="block text-[#b89b5e]">WARUNG28</span>
          </h1>

          <p
            className="
              mx-auto
              mt-6
              max-w-2xl
              text-base
              leading-8
              text-[#a7a39a]
            "
          >
            Penyedia layanan voucher internet berbasis MikroTik dengan pembelian
            online, aktivasi otomatis, dan dukungan pelanggan yang responsif.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div
            className="
              rounded-3xl
              border
              border-white/[0.06]
              bg-white/[0.02]
              p-8
              sm:p-12
            "
          >
            <h2
              className="
                text-2xl
                font-bold
                text-[#b89b5e]
              "
            >
              Siapa Kami?
            </h2>

            <p
              className="
                mt-5
                leading-8
                text-[#a7a39a]
              "
            >
              WARUNG28 HOTSPOT adalah layanan penjualan voucher internet yang
              dirancang untuk memberikan pengalaman pembelian yang cepat, mudah,
              dan transparan bagi pelanggan.
            </p>

            <p
              className="
                mt-5
                leading-8
                text-[#a7a39a]
              "
            >
              Kami memanfaatkan sistem hotspot MikroTik untuk menyediakan akses
              internet yang stabil dengan berbagai pilihan paket mulai dari
              harian, mingguan hingga bulanan.
            </p>
          </div>

          {/* FEATURE CARDS */}

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <div
              className="
                rounded-2xl
                border
                border-white/[0.06]
                bg-white/[0.02]
                p-6
              "
            >
              <div className="text-3xl mb-3">⚡</div>

              <h3 className="font-bold">Aktivasi Otomatis</h3>

              <p className="mt-2 text-sm text-[#a7a39a]">
                Voucher langsung aktif setelah pembayaran.
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-white/[0.06]
                bg-white/[0.02]
                p-6
              "
            >
              <div className="text-3xl mb-3">🛒</div>

              <h3 className="font-bold">Pembelian Online</h3>

              <p className="mt-2 text-sm text-[#a7a39a]">
                Beli voucher kapan saja secara online.
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-white/[0.06]
                bg-white/[0.02]
                p-6
              "
            >
              <div className="text-3xl mb-3">🌐</div>

              <h3 className="font-bold">Jaringan Stabil</h3>

              <p className="mt-2 text-sm text-[#a7a39a]">
                Infrastruktur hotspot berbasis MikroTik.
              </p>
            </div>

            <div
              className="
                rounded-2xl
                border
                border-white/[0.06]
                bg-white/[0.02]
                p-6
              "
            >
              <div className="text-3xl mb-3">💬</div>

              <h3 className="font-bold">Support</h3>

              <p className="mt-2 text-sm text-[#a7a39a]">
                Bantuan cepat melalui WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
