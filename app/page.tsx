import PackageCarousel from "@/components/PackageCarousel";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080808]">

      {/* =========================
          HEADER
      ========================= */}

      <header
        className="
          sticky
          top-0
          z-50
          border-b
          border-white/[0.06]
          bg-[#080808]/85
          backdrop-blur-xl
        "
      >
        <div
          className="
            mx-auto
            flex
            min-h-[72px]
            w-[calc(100%-28px)]
            max-w-6xl
            items-center
            justify-between
          "
        >

          {/* LOGO */}

          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-[#b89b5e]/30
                bg-[#b89b5e]/5
                text-xl
              "
            >
              ⚡
            </div>

            <div>

              <div
                className="
                  text-base
                  font-extrabold
                  tracking-[0.08em]
                  text-[#f2f0ea]
                "
              >
                WARUNG28
              </div>

              <div
                className="
                  mt-1
                  text-[9px]
                  tracking-[0.3em]
                  text-[#b89b5e]
                "
              >
                HOTSPOT
              </div>

            </div>

          </div>


          {/* NETWORK */}

          <div
            className="
              hidden
              items-center
              gap-2
              text-xs
              text-[#a7a39a]
              sm:flex
            "
          >

            <span
              className="
                h-2
                w-2
                rounded-full
                bg-[#6faf82]
                shadow-[0_0_0_4px_rgba(111,175,130,0.08)]
              "
            />

            Network Online

          </div>

        </div>
      </header>


      {/* =========================
          HERO
      ========================= */}

      <section
        className="
          relative
          overflow-hidden
          px-4
          pb-16
          pt-20
          text-center
          sm:pt-28
        "
      >

        {/* Background glow */}

        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-0
            h-80
            w-80
            -translate-x-1/2
            rounded-full
            bg-[#b89b5e]/10
            blur-[120px]
          "
        />

        <div
          className="
            relative
            mx-auto
            max-w-4xl
          "
        >

          {/* Badge */}

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
              tracking-[0.08em]
              text-[#c8ad72]
            "
          >

            <span
              className="
                h-2
                w-2
                rounded-full
                bg-[#6faf82]
              "
            />

            WARUNG28 NETWORK ACTIVE

          </div>


          {/* Heading */}

          <h1
            className="
              mt-7
              text-5xl
              font-black
              leading-[0.98]
              tracking-[-0.05em]
              text-[#f2f0ea]
              sm:text-7xl
            "
          >

            Voucher WiFi

            <br />

            <span className="text-[#b89b5e]">
              Langsung Aktif.
            </span>

          </h1>


          <p className=" mx-auto mt-6 max-w-xl text-sm leading-7 text-[#a7a39a] sm:text-base " >
            Beli voucher WiFi MikroTik secara online. 
            Pembayaran mudah, aktivasi otomatis, dan langsung bisa digunakan.
          </p>


          {/* ACTION */}

          <div
            className="
              mt-8
              flex
              flex-col
              justify-center
              gap-3
              sm:flex-row
            "
          >

            <a href="#packages" className=" inline-flex min-h-12 items-center justify-center rounded-xl bg-[#b89b5e] px-7 text-sm font-bold text-[#17130c] shadow-[0_12px_35px_rgba(184,155,94,0.12)] transition hover:bg-[#c8ad72] hover:-translate-y-0.5 " >

              ⚡ Beli Voucher
            </a>


            <a href="/login" className=" inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-7 text-sm font-semibold text-[#f2f0ea] transition hover:border-[#8f7747] hover:bg-[#b89b5e]/5 " > 🔐 Login Hotspot </a>

          </div>

        </div>

      </section>


      {/* =========================
          STATUS
      ========================= */}

      <section className="px-4 pb-12">

        <div
          className="
            mx-auto
            grid
            max-w-4xl
            grid-cols-1
            gap-3
            rounded-3xl
            border
            border-white/[0.06]
            bg-white/[0.02]
            p-4
            sm:grid-cols-3
          "
        >

          <Status label="Harga Mulai" value="Rp 2.000" /> <Status label="Voucher" value="Otomatis" /> <Status label="Layanan" value="24 Jam" />

        </div>

      </section>


      {/* =========================
          PACKAGES
      ========================= */}

      <section
        id="packages"
        className="px-4 py-12 sm:py-20"
      >

        <div className="mx-auto max-w-6xl">

          <div
            className="
              mb-7
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >

            <div>

              <div
                className="
                  text-[11px]
                  font-bold
                  tracking-[0.2em]
                  text-[#b89b5e]
                "
              >
                INTERNET PLANS
              </div>

              <h2
                className="
                  mt-2
                  text-3xl
                  font-black
                  tracking-tight
                  text-[#f2f0ea]
                  sm:text-4xl
                "
              >
                Pilih Paket Anda
              </h2>

            </div>


            <p
              className="
                max-w-md
                text-sm
                leading-6
                text-[#a7a39a]
              "
            >
              Paket internet fleksibel mulai dari
              hitungan jam sampai bulanan.
              Paket kuota dapat diatur oleh admin.
            </p>

          </div>


          <PackageCarousel />

        </div>

      </section>


      {/* =========================
          SUPPORT
      ========================= */}

      <section className="px-4 py-12 sm:py-20">

        <div
          className="
            mx-auto
            grid
            max-w-6xl
            grid-cols-1
            gap-4
            lg:grid-cols-[1.4fr_.6fr]
          "
        >

          {/* AI */}

          <div
            className="
              rounded-3xl
              border
              border-[#b89b5e]/15
              bg-gradient-to-br
              from-[#b89b5e]/[0.07]
              to-white/[0.02]
              p-7
              sm:p-9
            "
          >

            <div
              className="
                text-[11px]
                font-bold
                tracking-[0.2em]
                text-[#b89b5e]
              "
            >
              CUSTOMER SUPPORT
            </div>


            <h3
              className="
                mt-3
                text-2xl
                font-bold
                text-[#f2f0ea]
              "
            >
              Butuh bantuan?
            </h3>


            <p
              className="
                mt-3
                max-w-xl
                text-sm
                leading-7
                text-[#a7a39a]
              "
            >
              Belum punya paket, kuota habis,
              paket expired, atau mengalami
              kendala koneksi? WARUNG28 siap
              membantu.
            </p>


            <div
              className="
                mt-6
                flex
                flex-col
                gap-3
                sm:flex-row
              "
            >

              <a href="https://wa.me/6281328398343" target="_blank" rel="noopener noreferrer" className=" inline-flex min-h-11 items-center justify-center rounded-xl bg-[#b89b5e] px-5 text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72] " > 💬 WhatsApp Support </a>


              <button
                className="
                  min-h-11
                  rounded-xl
                  border
                  border-white/10
                  px-5
                  text-sm
                  font-semibold
                  text-[#f2f0ea]
                  transition
                  hover:border-[#8f7747]
                "
              >
                💬 Chat Admin
              </button>

            </div>

          </div>


          {/* LOGIN */}

          <div
            className="
              rounded-3xl
              border
              border-white/[0.06]
              bg-[#11110f]
              p-7
              sm:p-9
            "
          >

            <div
              className="
                text-[11px]
                font-bold
                tracking-[0.2em]
                text-[#b89b5e]
              "
            >
              MEMBER
            </div>


            <h3
              className="
                mt-3
                text-2xl
                font-bold
                text-[#f2f0ea]
              "
            >
              Sudah punya akun?
            </h3>


            <p
              className="
                mt-3
                text-sm
                leading-7
                text-[#a7a39a]
              "
            >
              Masuk melalui satu pintu untuk
              mengakses layanan WARUNG28.
            </p>


            <a
              href="/login"
              className="
                mt-6
                inline-flex
                min-h-11
                w-full
                items-center
                justify-center
                rounded-xl
                border
                border-[#b89b5e]/25
                bg-[#b89b5e]/5
                text-sm
                font-bold
                text-[#c8ad72]
                transition
                hover:bg-[#b89b5e]
                hover:text-[#17130c]
              "
            >
              🔐 Login Portal
            </a>

          </div>

        </div>

      </section>


      {/* =========================
          FOOTER
      ========================= */}

      <footer
        className="
          border-t
          border-white/[0.06]
          px-4
          py-10
          pb-28
          text-center
        "
      >

        <div
          className="
            text-sm
            font-bold
            tracking-[0.08em]
            text-[#b89b5e]
          "
        >
          ⚡ WARUNG28 HOTSPOT
        </div>


        <p
          className="
            mt-3
            text-xs
            text-[#a7a39a]
          "
        >
          Internet cepat & fleksibel untuk kebutuhan Anda.
        </p>


        <p
          className="
            mt-4
            text-[10px]
            text-white/30
          "
        >
          © 2026 WARUNG28 HOTSPOT
        </p>

      </footer>


      {/* =========================
          FLOATING AI
      ========================= */}

      <button
        className="
          fixed
          bottom-5
          right-4
          z-50
          flex
          min-h-12
          items-center
          gap-2
          rounded-full
          border
          border-[#b89b5e]/35
          bg-[#11110f]/95
          px-5
          text-sm
          shadow-2xl
          backdrop-blur-xl
          transition
          hover:border-[#b89b5e]
        "
      >

        💬

        <span className="text-[#f2f0ea]">
          <strong className="text-[#c8ad72]">
            WARUNG28
          </strong>{" "}
          AI
        </span>

      </button>

    </main>
  );
}


/* =========================
   STATUS COMPONENT
========================= */

function Status({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div
      className="
        rounded-2xl
        bg-black/20
        p-4
      "
    >

      <div
        className="
          text-[10px]
          uppercase
          tracking-[0.15em]
          text-[#a7a39a]
        "
      >
        {label}
      </div>


      <div
        className={`
          mt-2
          text-sm
          font-bold
          ${
            success
              ? "text-[#6faf82]"
              : "text-[#f2f0ea]"
          }
        `}
      >
        {success && "● "}
        {value}
      </div>

    </div>
  );
}
