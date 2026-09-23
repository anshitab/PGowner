import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchComplaintsForProperty, mapComplaintRow } from "@/lib/complaints-server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("property_id");

  if (!propertyId) {
    return NextResponse.json({ error: "property_id required" }, { status: 400 });
  }

  const [complaintsRes, checkoutsRes] = await Promise.all([
    fetchComplaintsForProperty(propertyId).catch(() => []),
    supabaseAdmin
      .from("checkout_records")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),
  ]);

  const complaints = (complaintsRes as Record<string, unknown>[]).map((c) => mapComplaintRow(c));

  const checkouts = (checkoutsRes.data || []).map((r) => ({
    id: r.id,
    type: "checkout" as const,
    title: `Checkout request from ${r.tenant_name}`,
    description: r.last_date
      ? `Requested move-out by ${new Date(r.last_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
      : "Checkout requested",
    tenant: r.tenant_name,
    room: r.room_number,
    status: r.status,
    priority: undefined,
    created_at: r.created_at,
  }));

  const combined = [...complaints, ...checkouts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json(combined);
}
