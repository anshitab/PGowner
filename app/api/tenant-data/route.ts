import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Try by user_id first
  let { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("*, rooms(number, rent, type), properties(name, address)")
    .eq("user_id", userId)
    .maybeSingle();

  // Fallback: match by email and auto-link
  if (!tenant && email) {
    const { data: emailMatch } = await supabaseAdmin
      .from("tenants")
      .select("*, rooms(number, rent, type), properties(name, address)")
      .eq("email", email)
      .is("user_id", null)
      .maybeSingle();

    if (emailMatch) {
      await supabaseAdmin
        .from("tenants")
        .update({ user_id: userId })
        .eq("id", emailMatch.id);
      tenant = emailMatch;
    }
  }

  if (!tenant) {
    return NextResponse.json({ tenant: null, payments: [], upiId: "" });
  }

  // Fetch property settings for UPI ID
  const { data: settingsData } = await supabaseAdmin
    .from("settings")
    .select("upi_id")
    .eq("property_id", tenant.property_id)
    .maybeSingle();

  // Fetch recent payments
  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("id, amount, method, verified, created_at, date")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch rent collection status
  const { data: rentRecords } = await supabaseAdmin
    .from("rent_collection")
    .select("id, amount, due_date, paid_date, status, method")
    .eq("tenant_id", tenant.id)
    .order("due_date", { ascending: false })
    .limit(3);

  return NextResponse.json({
    upiId: settingsData?.upi_id || "",
    tenant: {
      id: tenant.id,
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      room: (tenant.rooms as { number: string; rent: number; type: string } | null)?.number || "",
      roomType: (tenant.rooms as { number: string; rent: number; type: string } | null)?.type || "",
      rent: tenant.rent || (tenant.rooms as { rent: number } | null)?.rent || 0,
      joinDate: tenant.join_date,
      property: (tenant.properties as { name: string; address: string } | null)?.name || "",
      propertyAddress: (tenant.properties as { name: string; address: string } | null)?.address || "",
      deposit: tenant.deposit || 0,
      occupation: tenant.occupation || "",
      status: tenant.status,
    },
    payments: (payments || []).map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method || "UPI",
      verified: p.verified ?? false,
      date: p.created_at || p.date,
    })),
    rentRecords: (rentRecords || []).map((r) => ({
      id: r.id,
      amount: r.amount,
      dueDate: r.due_date,
      paidDate: r.paid_date,
      status: r.status,
      method: r.method,
    })),
  });
}
