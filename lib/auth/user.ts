import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type UserContext = {
  userId: string;
};

export type RequireUserResult =
  { ok: true; context: UserContext } | { ok: false; response: NextResponse };

export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();

  if (!authData?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile || profile.status !== "active") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Akun tidak aktif." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    context: {
      userId: authData.user.id,
    },
  };
}
