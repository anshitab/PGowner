import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    properties,
    tenants,
    payments,
    complaints,
    rentPending,
    recentActivity,
  ] = await Promise.all([
    supabaseAdmin.from("properties").select("id, verification_status", { count: "exact" }),
    supabaseAdmin.from("tenants").select("id, status", { count: "exact" }),
    supabaseAdmin.from("payments").select("id, amount, verified", { count: "exact" }),
    supabaseAdmin.from("complaints").select("id, status", { count: "exact" }),
    supabaseAdmin.from("rent_collection").select("id, amount, status").eq("status", "Pending"),
    supabaseAdmin
      .from("activity_log")
      .select("id, type, title, description, actor, created_at, property_id")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const propertyRows = properties.data || [];
  const tenantRows = tenants.data || [];
  const paymentRows = payments.data || [];
  const complaintRows = complaints.data || [];
  const pendingRent = rentPending.data || [];

  const totalRevenue = paymentRows.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingRentAmount = pendingRent.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Owners count from auth users
  let ownersCount = 0;
  let page = 1;
  while (page <= 5) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users || [];
    ownersCount += users.filter((u) => (u.user_metadata?.role || "owner") === "owner").length;
    if (users.length < 200) break;
    page += 1;
  }

  return NextResponse.json({
    stats: {
      properties: properties.count || propertyRows.length,
      verifiedProperties: propertyRows.filter((p) => p.verification_status === "verified").length,
      pendingProperties: propertyRows.filter((p) => p.verification_status === "pending").length,
      owners: ownersCount,
      tenants: tenants.count || tenantRows.length,
      activeTenants: tenantRows.filter((t) => t.status === "Active").length,
      payments: payments.count || paymentRows.length,
      totalRevenue,
      pendingRentAmount,
      openComplaints: complaintRows.filter((c) => c.status === "Open" || c.status === "In Progress").length,
      complaints: complaints.count || complaintRows.length,
    },
    recentActivity: recentActivity.data || [],
  });
}
