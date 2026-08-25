"use client";

import { useEffect, useRef, useState } from "react";

export type CatalogPackage = {
  id: number;
  name: string;
  icon: string;
  price: string;
  description: string;
  category: string;
};

const itemsPerPageDesktop = 3;
const itemsPerPageMobile = 1;

type Props = {
  packages?: CatalogPackage[];
};

export default function PackageCarousel({ packages = [] }: Props) {
  const [page, setPage] = useState(0);
  const [mobile, setMobile] = useState(false);

  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  useEffect(() => {
    const checkScreen = () => {
      setMobile(window.innerWidth < 768);
    };

    checkScreen();

    window.addEventListener("resize", checkScreen);

    return () => {
      window.removeEventListener("resize", checkScreen);
    };
  }, []);

  const itemsPerPage = mobile ? itemsPerPageMobile : itemsPerPageDesktop;

  const totalPages = Math.ceil(packages.length / itemsPerPage);

  const visiblePackages = mobile
    ? packages.slice(0, 4)
    : packages.slice(
        page * itemsPerPageDesktop,
        page * itemsPerPageDesktop + itemsPerPageDesktop,
      );

  function nextPage() {
    setPage((current) => (current >= totalPages - 1 ? 0 : current + 1));
  }

  function previousPage() {
    setPage((current) => (current <= 0 ? totalPages - 1 : current - 1));
  }

  function swipeStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStart.current = event.changedTouches[0].screenX;
  }

  function swipeEnd(event: React.TouchEvent<HTMLDivElement>) {
    touchEnd.current = event.changedTouches[0].screenX;

    if (touchStart.current === null || touchEnd.current === null) {
      return;
    }

    const distance = touchStart.current - touchEnd.current;

    if (Math.abs(distance) < 50) {
      return;
    }

    if (distance > 0) {
      nextPage();
    } else {
      previousPage();
    }

    touchStart.current = null;
    touchEnd.current = null;
  }

  if (packages.length === 0) {
    return (
      <div className="w-full">
        <div
          className="
            rounded-3xl
            border
            border-dashed
            border-[#b89b5e]/25
            bg-[#11110f]
            p-12
            text-center
          "
        >
          <div className="text-3xl text-[#b89b5e]/50">📶</div>

          <h3 className="mt-4 font-bold text-[#f2f0ea]">
            Daftar paket segera hadir
          </h3>

          <p className="mt-1 text-sm text-[#a7a39a]">
            Silakan hubungi admin WARUNG28 untuk info paket terbaru.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* CARDS */}

      <div
        className="overflow-hidden rounded-3xl"
        onTouchStart={swipeStart}
        onTouchEnd={swipeEnd}
      >
        {/* MOBILE: 2x2 compact grid like top-up pulsa */}
        <div
          key={`m-${page}`}
          className="
            grid
            grid-cols-2
            gap-3
            animate-fade-up
            md:hidden
          "
        >
          {visiblePackages.map((item) => (
            <button
              key={item.id}
              onClick={() => alert(`Anda memilih Paket ${item.name}`)}
              className="
                group
                relative
                aspect-square
                overflow-hidden
                rounded-2xl
                border
                border-[#b89b5e]/15
                bg-[#11110f]
                p-4
                text-left
                transition-all
                duration-300
                active:scale-95
                active:border-[#b89b5e]/50
              "
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#b89b5e]/5 blur-xl" />

              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#b89b5e]/20 bg-[#b89b5e]/5 text-lg">
                {item.icon}
              </div>

              <div className="relative mt-3 text-sm font-bold text-[#f2f0ea] leading-tight">
                {item.name}
              </div>

              <div className="relative mt-1 text-[10px] text-[#a7a39a] leading-tight line-clamp-2">
                {item.description}
              </div>

              <div className="relative mt-auto pt-2 text-base font-extrabold text-[#c8ad72]">
                {item.price}
              </div>
            </button>
          ))}
        </div>

        {/* DESKTOP: 3-column carousel */}
        <div
          key={`d-${page}`}
          className="
            hidden
            grid-cols-3
            gap-4
            animate-fade-up
            md:grid
          "
        >
          {visiblePackages.map((item) => (
            <article
              key={item.id}
              className="
                group
                relative
                min-h-[285px]
                overflow-hidden
                rounded-3xl
                border
                border-[#b89b5e]/15
                bg-[#11110f]
                p-6
                transition-all
                duration-300
                hover:-translate-y-1
                hover:border-[#b89b5e]/45
              "
            >
              {/* decorative glow */}

              <div
                className="
                  absolute
                  -right-16
                  -top-16
                  h-40
                  w-40
                  rounded-full
                  bg-[#b89b5e]/5
                  blur-2xl
                "
              />

              {/* category */}

              <div className="relative flex items-center justify-between">
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-[#b89b5e]/20
                    bg-[#b89b5e]/5
                    text-xl
                  "
                >
                  {item.icon}
                </div>

                <span
                  className="
                    rounded-full
                    border
                    border-[#b89b5e]/15
                    px-3
                    py-1
                    text-[10px]
                    tracking-[0.18em]
                    text-[#b89b5e]
                  "
                >
                  {item.category}
                </span>
              </div>

              {/* name */}

              <h3
                className="
                  relative
                  mt-6
                  text-xl
                  font-bold
                  tracking-tight
                  text-[#f2f0ea]
                "
              >
                Paket {item.name}
              </h3>

              {/* description */}

              <p
                className="
                  relative
                  mt-2
                  min-h-[42px]
                  text-sm
                  leading-6
                  text-[#a7a39a]
                "
              >
                {item.description}
              </p>

              {/* price */}

              <div
                className="
                  relative
                  mt-5
                  text-2xl
                  font-extrabold
                  tracking-tight
                  text-[#c8ad72]
                "
              >
                {item.price}
              </div>

              {/* button */}

              <button
                onClick={() => {
                  alert(`Anda memilih Paket ${item.name}`);
                }}
                className="
                  relative
                  mt-5
                  w-full
                  rounded-xl
                  border
                  border-[#b89b5e]/20
                  bg-[#b89b5e]/5
                  px-4
                  py-3
                  text-sm
                  font-bold
                  text-[#f2f0ea]
                  transition-all
                  duration-300
                  hover:border-[#b89b5e]
                  hover:bg-[#b89b5e]
                  hover:text-[#17130c]
                "
              >
                Pilih Paket
              </button>
            </article>
          ))}
        </div>
      </div>

      {/* CONTROLS - desktop only */}

      <div
        className="
          mt-7
          hidden
          items-center
          justify-center
          gap-4
          md:flex
        "
      >
        <button
          onClick={previousPage}
          aria-label="Paket sebelumnya"
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-white/10
            bg-white/[0.02]
            text-white
            transition
            hover:border-[#8f7747]
            hover:text-[#c8ad72]
          "
        >
          ←
        </button>

        <div className="flex items-center gap-2">
          {Array.from({
            length: totalPages,
          }).map((_, index) => (
            <button
              key={index}
              onClick={() => setPage(index)}
              aria-label={`Halaman ${index + 1}`}
              className={`
                h-2
                rounded-full
                transition-all
                duration-300
                ${page === index ? "w-7 bg-[#b89b5e]" : "w-2 bg-white/20"}
              `}
            />
          ))}
        </div>

        <button
          onClick={nextPage}
          aria-label="Paket berikutnya"
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            border
            border-white/10
            bg-white/[0.02]
            text-white
            transition
            hover:border-[#8f7747]
            hover:text-[#c8ad72]
          "
        >
          →
        </button>
      </div>
    </div>
  );
}
