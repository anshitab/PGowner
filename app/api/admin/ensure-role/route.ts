import { NextResponse } from "next/server";
import { getSuperAdminEmails, isSuperAdminUser } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = data.user.email?.toLowerCase() || "";
  const allowlisted = getSuperAdminEmails().includes(email);
  const alreadyAdmin = data.user.user_metadata?.role === "super_admin";

  if (!allowlisted && !alreadyAdmin) {
    return NextResponse.json({ isSuperAdmin: false });
  }

  if (allowlisted && !alreadyAdmin) {
    await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      user_metadata: {
        ...data.user.user_metadata,
        role: "super_admin",
        name: data.user.user_metadata?.name || email.split("@")[0] || "Super Admin",
      },
    });
  }

  return NextResponse.json({
    isSuperAdmin: true,
    email,
    elevated: allowlisted && !alreadyAdmin,
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ isSuperAdmin: false }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ isSuperAdmin: false }, { status: 401 });
  }
  return NextResponse.json({ isSuperAdmin: isSuperAdminUser(data.user) });
}
