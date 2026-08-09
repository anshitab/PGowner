import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const owners: Array<{
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastSignIn: string | null;
    propertyCount: number;
  }> = [];

  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const users = data?.users || [];
    for (const u of users) {
      const role = u.user_metadata?.role || "owner";
      if (role !== "owner") continue;
      const { count } = await supabaseAdmin
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", u.id);
      owners.push({
        id: u.id,
        email: u.email || "",
        name: u.user_metadata?.name || u.email?.split("@")[0] || "Owner",
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at || null,
        propertyCount: count || 0,
      });
    }
    if (users.length < 200) break;
    page += 1;
  }

  owners.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return NextResponse.json({ owners });
}
