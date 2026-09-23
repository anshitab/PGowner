import { createClient } from "@supabase/supabase-js";

export async function getUserFromBearer(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Unauthorized" as const };
  }

  const token = authHeader.slice(7);
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: "Unauthorized" as const };
  }
  return { user: data.user, error: null };
}
