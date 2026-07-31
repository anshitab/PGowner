import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { userId, checkoutDate } = await request.json();

  if (!userId || !checkoutDate) {
    return NextResponse.json({ error: "userId and checkoutDate required" }, { status: 400 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, property_id, room_id, rent, deposit, join_date, rooms(number)")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("checkout_records").insert({
    property_id: tenant.property_id,
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    room_number: (tenant.rooms as unknown as { number: string } | null)?.number || "",
    status: "settlement_pending",
    check_in_date: tenant.join_date,
    deposit_amount: tenant.deposit || 0,
    last_date: checkoutDate,
    notice_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
