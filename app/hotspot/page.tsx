"use client";

import { useEffect, useState } from "react";

type HotspotUser = {
  id: number;
  username: string;
  pin: string;
  active: boolean;
  locked: boolean;
  last_login_at: string | null;
  created_at: string;
  package_orders?: {
    id: number;
    status: string;
    end_at: string | null;
    packages?: {
      name: string;
    } | null;
  } | null;
};

export default function HotspotCredentialsPage() {
  const [hotspot, setHotspot] = useState<HotspotUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/hotspot/me");

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Gagal memuat data hotspot.");

          return;
        }

        const data = await res.json();

        setHotspot(data.hotspot);
      } catch {
        setError("Terjadi kesalahan jaringan.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#b89b5e] border-t-transparent" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11110f] p-8 text-center">
          <div className="text-4xl">📡</div>

          <h1 className="mt-4 text-lg font-bold text-[#f2f0ea]">
            Belum Ada Kredensial
          </h1>

          <p className="mt-2 text-sm text-[#a7a39a]">{error}</p>
        </div>
      </main>
    );
  }

  if (!hotspot) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11110f] p-8 text-center">
          <div className="text-4xl">📡</div>

          <h1 className="mt-4 text-lg font-bold text-[#f2f0ea]">
            Belum Ada Kredensial
          </h1>

          <p className="mt-2 text-sm text-[#a7a39a]">
            Beli paket internet untuk mendapatkan username dan pin login
            hotspot.
          </p>
        </div>
      </main>
    );
  }

  const isExpired =
    hotspot.package_orders?.end_at &&
    new Date(hotspot.package_orders.end_at) < new Date();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-[#11110f] p-6 text-center">
          {/* header */}
          <div className="text-[11px] font-bold tracking-[0.2em] text-[#b89b5e]">
            HOTSPOT LOGIN
          </div>

          <h1 className="mt-2 text-lg font-bold text-[#f2f0ea]">
            Kredensial WiFi Anda
          </h1>

          {/* status badges */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                hotspot.active && !hotspot.locked && !isExpired
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              {hotspot.active && !hotspot.locked && !isExpired
                ? "Aktif"
                : isExpired
                  ? "Paket Habis"
                  : hotspot.locked
                    ? "Dikunci"
                    : "Tidak Aktif"}
            </span>
          </div>

          {/* credentials */}
          <div className="mt-6 space-y-3">
            {/* username */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#a7a39a]">
                Username
              </div>

              <div className="mt-1 text-3xl font-black tracking-[0.3em] text-[#f2f0ea]">
                {hotspot.username}
              </div>
            </div>

            {/* pin */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#a7a39a]">
                PIN
              </div>

              <div className="mt-1 flex items-center justify-center gap-3">
                <div className="text-3xl font-black tracking-[0.3em] text-[#f2f0ea]">
                  {showPin ? hotspot.pin : "•••"}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs text-[#a7a39a] transition hover:border-[#b89b5e]/40 hover:text-[#c8ad72]"
                >
                  {showPin ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>
          </div>

          {/* copy button */}
          <button
            type="button"
            onClick={() =>
              navigator.clipboard
                ?.writeText(`Username: ${hotspot.username}\nPIN: ${hotspot.pin}`)
                .catch(() => {})
            }
            className="mt-4 w-full rounded-xl border border-white/10 py-3 text-sm text-[#a7a39a] transition hover:border-[#b89b5e]/40 hover:text-[#c8ad72]"
          >
            Salin Kredensial
          </button>

          {/* package info */}
          {hotspot.package_orders && (
            <div className="mt-5 rounded-xl border border-white/10 p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-[#a7a39a]">Paket</span>
                <span className="font-semibold text-[#f2f0ea]">
                  {hotspot.package_orders.packages?.name ?? "-"}
                </span>
              </div>

              <div className="mt-2 flex justify-between">
                <span className="text-[#a7a39a]">Berlaku hingga</span>
                <span className="text-[#f2f0ea]">
                  {hotspot.package_orders.end_at
                    ? new Date(
                        hotspot.package_orders.end_at,
                      ).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Unlimited"}
                </span>
              </div>
            </div>
          )}

          {/* instructions */}
          <div className="mt-5 space-y-2 text-left text-xs text-[#a7a39a]">
            <div className="font-bold text-[#f2f0ea]">Cara Login:</div>

            <div className="flex gap-2">
              <span>1.</span>
              <span>Hubungkan perangkat ke WiFi &quot;WARUNG28&quot;</span>
            </div>

            <div className="flex gap-2">
              <span>2.</span>
              <span>
                Masukkan username{" "}
                <strong className="text-[#f2f0ea]">{hotspot.username}</strong>{" "}
                dan pin yang sesuai
              </span>
            </div>

            <div className="flex gap-2">
              <span>3.</span>
              <span>Klik &quot;Login&quot; dan internet langsung aktif</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
