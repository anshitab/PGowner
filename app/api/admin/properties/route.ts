import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("properties")
    .select("id, name, address, type, total_floors, total_rooms, verification_status, owner_id, created_at")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("verification_status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const properties = data || [];
  const ownerIds = [...new Set(properties.map((p) => p.owner_id).filter(Boolean))];

  const ownerMap: Record<string, { email?: string; name?: string }> = {};
  await Promise.all(
    ownerIds.map(async (id) => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(id);
      if (userData?.user) {
        ownerMap[id] = {
          email: userData.user.email,
          name: userData.user.user_metadata?.name,
        };
      }
    })
  );

  const withCounts = await Promise.all(
    properties.map(async (p) => {
      const [{ count: tenantCount }, { count: roomCount }] = await Promise.all([
        supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }).eq("property_id", p.id),
        supabaseAdmin.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", p.id),
      ]);
      return {
        ...p,
        owner: ownerMap[p.owner_id] || null,
        tenantCount: tenantCount || 0,
        roomCount: roomCount || 0,
      };
    })
  );

  return NextResponse.json({ properties: withCounts });
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, verification_status } = await request.json();
  if (!id || !["pending", "verified", "rejected"].includes(verification_status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("properties")
    .update({ verification_status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("activity_log").insert({
    property_id: id,
    type: "admin",
    action: "verification_updated",
    title: "Verification updated",
    description: `Property marked as ${verification_status} by super admin`,
    actor: admin.email || "Super Admin",
  });

  return NextResponse.json({ property: data });
}

export async function DELETE(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Property id required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("properties").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
