import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const globalForSupabase = globalThis as unknown as {
  __pgowner_supabase?: SupabaseClient;
};

function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "pgowner-auth",
    },
  });
}

export const supabase =
  globalForSupabase.__pgowner_supabase ?? createBrowserClient();

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.__pgowner_supabase = supabase;
}
