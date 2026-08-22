"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();

  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const email = username.includes("@")
      ? username
      : `${username}@warung28.local`;

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setLoading(false);

      setError(
        "Username atau password tidak benar."
      );

      return;
    }

    if (!data.user) {
      setLoading(false);

      setError(
        "Akun tidak ditemukan."
      );

      return;
    }

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", data.user.id)
        .single();

    setLoading(false);

    if (!profile) {
      setError(
        "Profil akun belum tersedia."
      );

      return;
    }

    if (profile.status !== "active") {
      await supabase.auth.signOut();

      setError(
        "Akun Anda sedang dinonaktifkan."
      );

      return;
    }

    if (profile.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/dashboard");
    }

    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#080808] px-4">

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div
          className="
            absolute
            left-1/2
            top-[-180px]
            h-[420px]
            w-[420px]
            -translate-x-1/2
            rounded-full
            bg-[#b89b5e]/8
            blur-[120px]
          "
        />

      </div>

      <div
        className="
          relative
          mx-auto
          flex
          min-h-screen
          w-full
          max-w-md
          flex-col
          justify-center
          py-10
        "
      >

        {/* LOGO */}

        <div className="mb-8 text-center">

          <div
            className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              border
              border-[#b89b5e]/30
              bg-[#b89b5e]/5
              text-2xl
            "
          >
            ⚡
          </div>

          <h1
            className="
              mt-5
              text-2xl
              font-black
              tracking-tight
              text-[#f2f0ea]
            "
          >
            WARUNG28
          </h1>

          <p
            className="
              mt-1
              text-[10px]
              font-bold
              tracking-[0.35em]
              text-[#b89b5e]
            "
          >
            HOTSPOT
          </p>

        </div>


        {/* CARD */}

        <section
          className="
            rounded-3xl
            border
            border-white/6
            bg-[#11110f]
            p-6
            shadow-2xl
            sm:p-8
          "
        >

          <div className="mb-7">

            <div
              className="
                text-[10px]
                font-bold
                tracking-[0.2em]
                text-[#b89b5e]
              "
            >
              MEMBER ACCESS
            </div>

            <h2
              className="
                mt-2
                text-2xl
                font-bold
                text-[#f2f0ea]
              "
            >
              LOGIN
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-[#a7a39a]
              "
            >
              Untuk pelanggan WARUNG28 silahkan akses disini. </br>
              Bagi yang belum mempunyai akses bisa membeli
              <button 
                className="
              mt-2
              text-xs
              font-bold
              text-[#b89b5e]
            " >
              <a href="/#pakages">disini</a> 
              </button>
            
            </p>

          </div>


          {/* ERROR */}

          {error && (
            <div
              className="
                mb-5
                rounded-xl
                border
                border-red-500/20
                bg-red-500/5
                px-4
                py-3
                text-xs
                leading-5
                text-red-300
              "
            >
              {error}
            </div>
          )}


          {/* FORM */}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            <div>

              <label
                htmlFor="username"
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-[#d6d2c8]
                "
              >
                Username / Email
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                placeholder="Masukkan username"
                autoComplete="username"
                required
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-black/30
                  px-4
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-white/25
                  focus:border-[#b89b5e]/60
                "
              />

            </div>


            <div>

              <label
                htmlFor="password"
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-[#d6d2c8]
                "
              >
                Password
              </label>

              <div className="relative">

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-black/30
                    px-4
                    pr-12
                    text-sm
                    text-white
                    outline-none
                    placeholder:text-white/25
                    focus:border-[#b89b5e]/60
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  className="
                    absolute
                    right-0
                    top-0
                    h-12
                    w-12
                    text-sm
                    text-white/40
                  "
                >
                  {showPassword
                    ? "🙈"
                    : "👁"}
                </button>

              </div>

            </div>


            <button
              type="submit"
              disabled={loading}
              className="
                flex
                h-12
                w-full
                items-center
                justify-center
                rounded-xl
                bg-[#b89b5e]
                text-sm
                font-bold
                text-[#17130c]
                transition
                hover:bg-[#c8ad72]
                disabled:opacity-50
              "
            >
              {loading
                ? "Memproses..."
                : "LOGIN MEMBER"}
            </button>

          </form>


          <div className="my-7 flex items-center gap-3">

            <div className="h-px flex-1 bg-white/6" />

            <span className="text-[10px] text-white/30">
              ATAU
            </span>

            <div className="h-px flex-1 bg-white/6" />

          </div>


          <a
            href="/"
            className="
              flex
              h-12
              w-full
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              bg-white/2
              text-sm
              font-semibold
              text-[#f2f0ea]
              transition
              hover:border-[#b89b5e]/40
            "
          >
            ← Kembali ke Beranda
          </a>

        </section>


        <div className="mt-6 text-center">

          <p className="text-xs text-[#a7a39a]">
            Tidak bisa terhubung ke internet?
          </p>

          <button
            className="
              mt-2
              text-xs
              font-bold
              text-[#b89b5e]
            "
          >
            💬 Hubungi Admin WARUNG28
          </button>

        </div>

      </div>

    </main>
  );
}
