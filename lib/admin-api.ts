import { supabase } from "./supabase";

export async function adminFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<{ data?: T; error?: string; status: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { error: "Not authenticated", status: 401 };
  }

  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: body.error || "Request failed", status: res.status };
  }
  return { data: body as T, status: res.status };
}
