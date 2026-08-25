"use client";

import { useEffect, useRef, useState } from "react";
import CheckoutModal from "./CheckoutModal";

export type CatalogPackage = {
  id: number;
  name: string;
  icon: string;
  price: string;
  numericPrice: number;
  description: string;
  category: string;
};

const DESKTOP_PER_PAGE = 3;
const MOBILE_PER_PAGE = 4;

type Props = {
  packages?: CatalogPackage[];
};

export default function PackageCarousel({ packages = [] }: Props) {
  const [page, setPage] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<CatalogPackage | null>(null);

  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  useEffect(() => {
    const checkScreen = () => setMobile(window.innerWidth < 768);

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const perPage = mobile ? MOBILE_PER_PAGE : DESKTOP_PER_PAGE;
  const totalPages = Math.ceil(packages.length / perPage);

  function nextPage() {
    setPage((c) => (c >= totalPages - 1 ? 0 : c + 1));
  }

  function prevPage() {
    setPage((c) => (c <= 0 ? totalPages - 1 : c - 1));
  }

  function swipeStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStart.current = e.changedTouches[0].screenX;
  }

  function swipeEnd(e: React.TouchEvent<HTMLDivElement>) {
    touchEnd.current = e.changedTouches[0].screenX;

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
      prevPage();
    }

    touchStart.current = null;
    touchEnd.current = null;
  }

  if (packages.length === 0) {
    return (
      <div className="w-full">
        <div className="rounded-3xl border border-dashed border-[#b89b5e]/25 bg-[#11110f] p-12 text-center">
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
      <div
        className="overflow-hidden rounded-3xl"
        onTouchStart={swipeStart}
        onTouchEnd={swipeEnd}
      >
        {/* MOBILE: horizontal slide 2x2 pages */}
        <div className="md:hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: totalPages }).map((_, pageIndex) => {
              const slice = packages.slice(
                pageIndex * MOBILE_PER_PAGE,
                pageIndex * MOBILE_PER_PAGE + MOBILE_PER_PAGE,
              );

              return (
                <div
                  key={pageIndex}
                  className="w-full shrink-0 grid grid-cols-2 gap-3"
                >
                  {slice.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedPkg(item)}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-[#b89b5e]/15 bg-[#11110f] p-4 text-left transition-all duration-300 active:scale-95 active:border-[#b89b5e]/50"
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
              );
            })}
          </div>
        </div>

        {/* DESKTOP: horizontal slide 3-col pages */}
        <div className="hidden md:block">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: totalPages }).map((_, pageIndex) => {
              const slice = packages.slice(
                pageIndex * DESKTOP_PER_PAGE,
                pageIndex * DESKTOP_PER_PAGE + DESKTOP_PER_PAGE,
              );

              return (
                <div
                  key={pageIndex}
                  className="w-full shrink-0 grid grid-cols-3 gap-4"
                >
                  {slice.map((item) => (
                    <article
                      key={item.id}
                      className="group relative min-h-[285px] overflow-hidden rounded-3xl border border-[#b89b5e]/15 bg-[#11110f] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#b89b5e]/45"
                    >
                      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#b89b5e]/5 blur-2xl" />

                      <div className="relative flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#b89b5e]/20 bg-[#b89b5e]/5 text-xl">
                          {item.icon}
                        </div>

                        <span className="rounded-full border border-[#b89b5e]/15 px-3 py-1 text-[10px] tracking-[0.18em] text-[#b89b5e]">
                          {item.category}
                        </span>
                      </div>

                      <h3 className="relative mt-6 text-xl font-bold tracking-tight text-[#f2f0ea]">
                        Paket {item.name}
                      </h3>

                      <p className="relative mt-2 min-h-[42px] text-sm leading-6 text-[#a7a39a]">
                        {item.description}
                      </p>

                      <div className="relative mt-5 text-2xl font-extrabold tracking-tight text-[#c8ad72]">
                        {item.price}
                      </div>

                      <button
                        onClick={() => setSelectedPkg(item)}
                        className="relative mt-5 w-full rounded-xl border border-[#b89b5e]/20 bg-[#b89b5e]/5 px-4 py-3 text-sm font-bold text-[#f2f0ea] transition-all duration-300 hover:border-[#b89b5e] hover:bg-[#b89b5e] hover:text-[#17130c]"
                      >
                        Pilih Paket
                      </button>
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="mt-7 flex items-center justify-center gap-4">
        <button
          onClick={prevPage}
          aria-label="Paket sebelumnya"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white transition hover:border-[#8f7747] hover:text-[#c8ad72]"
        >
          ←
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }).map((_, index) => (
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white transition hover:border-[#8f7747] hover:text-[#c8ad72]"
        >
          →
        </button>
      </div>

      {selectedPkg && (
        <CheckoutModal
          pkg={{
            id: selectedPkg.id,
            name: selectedPkg.name,
            price: selectedPkg.numericPrice,
          }}
          onClose={() => setSelectedPkg(null)}
        />
      )}
    </div>
  );
}
