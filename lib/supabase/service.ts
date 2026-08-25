import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client service-role untuk operasi istimewa di server saja
// (mis. membuat auth user pelanggan baru). KUNCI INI TIDAK BOLEH
// pernah terekspos ke browser — jangan pakai prefix NEXT_PUBLIC.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
