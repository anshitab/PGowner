import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase-server";

export function getSuperAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.user_metadata?.role === "super_admin") return true;
  const email = user.email?.toLowerCase() || "";
  return Boolean(email && getSuperAdminEmails().includes(email));
}

/** Verify Bearer token and ensure the user is a super admin. */
export async function requireSuperAdmin(request: Request): Promise<User | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  if (!isSuperAdminUser(data.user)) return null;
  return data.user;
}
