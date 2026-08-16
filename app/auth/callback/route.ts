import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/login";
  const safeNext = next.startsWith("/") ? next : "/login";

  // Password recovery: pass the auth code to the client page so the
  // browser Supabase client can establish a localStorage session.
  if (code && safeNext.includes("reset-password")) {
    const url = new URL("/reset-password", requestUrl.origin);
    url.searchParams.set("code", code);
    return NextResponse.redirect(url);
  }

  // Other auth codes: exchange is best-effort on the server; browser client
  // keeps its own session via localStorage.
  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
