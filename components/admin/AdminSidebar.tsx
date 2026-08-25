"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";

const menus = [
  {
    label: "Overview",
    href: "/admin",
    icon: "⌂",
  },
  {
    label: "Pelanggan",
    href: "/admin/customers",
    icon: "♙",
  },
  {
    label: "Kasir",
    href: "/kasir",
    icon: "₪",
  },
  {
    label: "Paket Internet",
    href: "/admin/packages",
    icon: "◈",
  },
  {
    label: "Voucher",
    href: "/admin/vouchers",
    icon: "▤",
  },
  {
    label: "Hotspot Login",
    href: "/admin/hotspot",
    icon: "📶",
  },
  {
    label: "Customer Service",
    href: "/admin/support",
    icon: "◌",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}

      <div
        className="
          sticky
          top-0
          z-40
          flex
          h-16
          items-center
          justify-between
          border-b
          border-white/6
          bg-[#080808]/95
          px-5
          backdrop-blur
          lg:hidden
        "
      >
        <div>
          <div className="text-sm font-black">WARUNG28</div>

          <div
            className="
              text-[8px]
              font-bold
              tracking-[0.25em]
              text-[#b89b5e]
            "
          >
            HOTSPOT ADMIN
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#b89b5e]/20 bg-[#b89b5e]/5 text-[#c8ad72] text-lg"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          w-72
          border-r
          border-white/6
          bg-[#0c0c0b]
          transition-transform
          duration-200
          lg:block
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}

          <div className="border-b border-white/6 px-7 py-7">
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
                  font-black
                  text-[#c8ad72]
                "
              >
                W
              </div>

              <div>
                <div className="font-black tracking-tight">WARUNG28</div>

                <div
                  className="
                    mt-1
                    text-[8px]
                    font-bold
                    tracking-[0.3em]
                    text-[#b89b5e]
                  "
                >
                  HOTSPOT ADMIN
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p
              className="
                mb-3
                px-3
                text-[9px]
                font-bold
                tracking-[0.2em]
                text-white/25
              "
            >
              MANAGEMENT
            </p>

            <div className="space-y-1">
              {menus.map((menu) => {
                const active =
                  menu.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(menu.href);

                return (
                  <Link
                    key={menu.href}
                    href={menu.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-3
                      text-sm
                      transition
                      ${
                        active
                          ? "border border-[#b89b5e]/15 bg-[#b89b5e]/8 text-[#c8ad72]"
                          : "text-white/50 hover:bg-white/2 hover:text-white"
                      }
                    `}
                  >
                    <span
                      className={`
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        text-sm
                        ${
                          active
                            ? "bg-[#b89b5e]/10 text-[#c8ad72]"
                            : "bg-white/2 text-white/40"
                        }
                      `}
                    >
                      {menu.icon}
                    </span>

                    <span className="font-medium">{menu.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Actions */}

          <div className="border-t border-white/6 p-5">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="
                block
                rounded-xl
                px-3
                py-3
                text-center
                text-xs
                text-white/40
                transition
                hover:bg-white/2
                hover:text-white
              "
            >
              ← Kembali ke Portal
            </Link>

            <LogoutButton
              className="
                mt-2
                w-full
                rounded-xl
                border
                border-red-500/20
                bg-red-500/5
                px-3
                py-3
                text-center
                text-xs
                font-semibold
                text-red-300
                transition
                hover:bg-red-500/10
                disabled:opacity-50
              "
            />
          </div>
        </div>
      </aside>
    </>
  );
}
