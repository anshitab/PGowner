import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, email, phone, rent, status, join_date, property_id, room_id, created_at, properties(name), rooms(number)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let tenants = (data || []).map((t) => {
    const props = t.properties as unknown as { name?: string } | null;
    const rooms = t.rooms as unknown as { number?: string } | null;
    return {
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      rent: t.rent,
      status: t.status,
      joinDate: t.join_date,
      propertyId: t.property_id,
      propertyName: props?.name || "—",
      roomNumber: rooms?.number || "—",
      createdAt: t.created_at,
    };
  });

  if (q) {
    tenants = tenants.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q) ||
        t.propertyName?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ tenants });
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
    .from("tenants")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tenant: data });
}
