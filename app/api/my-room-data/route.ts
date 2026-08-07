import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, room_id, property_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tenant || !tenant.room_id) {
    return NextResponse.json({ room: null, beds: [] });
  }

  const [roomRes, bedsRes] = await Promise.all([
    supabaseAdmin
      .from("rooms")
      .select("id, number, floor, type, rent, amenities")
      .eq("id", tenant.room_id)
      .single(),
    supabaseAdmin
      .from("beds")
      .select("id, label, tenant_name, status")
      .eq("room_id", tenant.room_id),
  ]);

  return NextResponse.json({
    room: roomRes.data || null,
    beds: (bedsRes.data || []).map((b) => ({
      id: b.id,
      label: b.label,
      tenantName: b.tenant_name,
      status: b.status,
    })),
  });
}
