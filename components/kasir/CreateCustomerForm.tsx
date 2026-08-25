"use client";

import { FormEvent, useState } from "react";

export type CreatedCustomer = {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  phone: string | null;
};

export default function CreateCustomerForm({
  onCreated,
}: {
  onCreated: (customer: CreatedCustomer) => void;
}) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [created, setCreated] = useState<CreatedCustomer | null>(null);
  const [createdPassword, setCreatedPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setCreated(null);

    try {
      const response = await fetch("/api/staff/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          fullName,
          phone,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setError(
          typeof result?.error === "string"
            ? result.error
            : "Gagal membuat pelanggan baru.",
        );

        return;
      }

      const customer = result.customer as CreatedCustomer;

      setCreated(customer);
      setCreatedPassword(password);

      setUsername("");
      setFullName("");
      setPhone("");
      setPassword("");

      onCreated(customer);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/6 bg-[#11110f] p-6">
      <h2 className="text-lg font-bold text-[#f2f0ea]">Buat Pelanggan Baru</h2>

      <p className="mt-1 text-sm text-[#a7a39a]">
        Daftarkan pelanggan walk-in. Username otomatis menjadi email login{" "}
        <span className="text-[#c8ad72]">username@warung28.my.id</span>.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs leading-5 text-red-300">
          {error}
        </div>
      )}

      {created && (
        <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-xs leading-5 text-emerald-200">
          <p className="font-bold">Pelanggan berhasil dibuat.</p>

          <p className="mt-2 text-emerald-300/90">
            Berikan kredensial berikut ke pelanggan:
          </p>

          <p className="mt-1 font-mono">
            Login: {created.username} • Password: {createdPassword}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#d6d2c8]">
              Username *
            </span>

            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="cth: budi01"
              autoComplete="off"
              required
              className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#b89b5e]/60"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#d6d2c8]">
              Password Awal *
            </span>

            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimal 6 karakter"
              autoComplete="off"
              required
              minLength={6}
              maxLength={72}
              className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#b89b5e]/60"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#d6d2c8]">
              Nama Lengkap
            </span>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Opsional"
              maxLength={100}
              className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#b89b5e]/60"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[#d6d2c8]">
              No. WhatsApp
            </span>

            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Opsional"
              maxLength={20}
              className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#b89b5e]/60"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[#b89b5e] text-sm font-bold text-[#17130c] transition hover:bg-[#c8ad72] disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {loading ? "Memproses..." : "+ Daftarkan Pelanggan"}
        </button>
      </form>
    </section>
  );
}
