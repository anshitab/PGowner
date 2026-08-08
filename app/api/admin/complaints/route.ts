import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("complaints")
    .select("id, title, description, priority, status, assigned_to, created_at, property_id, tenant_id, properties(name), tenants(name)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    complaints: (data || []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      priority: c.priority,
      status: c.status,
      assignedTo: c.assigned_to,
      createdAt: c.created_at,
      propertyName: (c.properties as unknown as { name?: string } | null)?.name || "—",
      tenantName: (c.tenants as unknown as { name?: string } | null)?.name || "—",
    })),
  });
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status } = await request.json();
  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("complaints")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ complaint: data });
}
