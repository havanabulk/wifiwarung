import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AdminContext = {
  userId: string;
  role: string;
};

export type RequireAdminResult =
  | { ok: true; context: AdminContext }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Akses ditolak." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    context: {
      userId: authData.user.id,
      role: profile.role,
    },
  };
}
