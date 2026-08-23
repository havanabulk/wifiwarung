```tsx
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return (
      <main className="min-h-screen bg-[#080808] p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <h1 className="text-xl font-bold text-red-400">
              Gagal Memuat Data
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error.message}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] p-8 text-white">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#b89b5e]">
              WARUNG28 ADMIN
            </p>

            <h1 className="text-3xl font-black text-[#f2f0ea]">
              Support Center
            </h1>
          </div>

          <div className="rounded-xl border border-[#b89b5e]/20 bg-[#11110f] px-4 py-2 text-sm text-[#b89b5e]">
            Total Ticket: {data?.length ?? 0}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#11110f]">
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr className="border-b border-white/10 bg-black/20">

                  <th className="p-4 text-left text-xs uppercase tracking-wider text-[#b89b5e]">
                    Nama
                  </th>

                  <th className="p-4 text-left text-xs uppercase tracking-wider text-[#b89b5e]">
                    WhatsApp
                  </th>

                  <th className="p-4 text-left text-xs uppercase tracking-wider text-[#b89b5e]">
                    Pesan
                  </th>

                  <th className="p-4 text-left text-xs uppercase tracking-wider text-[#b89b5e]">
                    Status
                  </th>

                  <th className="p-4 text-left text-xs uppercase tracking-wider text-[#b89b5e]">
                    Tanggal
                  </th>

                </tr>
              </thead>

              <tbody>

                {data?.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-gray-400"
                    >
                      Belum ada tiket support.
                    </td>
                  </tr>
                )}

                {data?.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="p-4 font-medium">
                      {item.name}
                    </td>

                    <td className="p-4 text-gray-300">
                      {item.phone}
                    </td>

                    <td className="max-w-md p-4 text-gray-300">
                      {item.message}
                    </td>

                    <td className="p-4">
                      <span className="rounded-lg border border-[#b89b5e]/20 bg-[#b89b5e]/10 px-3 py-1 text-xs text-[#c8ad72]">
                        {item.status}
                      </span>
                    </td>

                    <td className="p-4 text-sm text-gray-400">
                      {new Date(
                        item.created_at
                      ).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        </div>

      </div>
    </main>
  );
}
```
