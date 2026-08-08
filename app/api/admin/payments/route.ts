import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ data: payments, error: payErr }, { data: rentRows, error: rentErr }] = await Promise.all([
    supabaseAdmin
      .from("payments")
      .select("id, amount, method, verified, date, created_at, property_id, tenant_id, properties(name), tenants(name)")
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("rent_collection")
      .select("id, amount, due_date, paid_date, status, method, property_id, tenant_id, properties(name), tenants(name)")
      .order("due_date", { ascending: false })
      .limit(300),
  ]);

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });
  if (rentErr) return NextResponse.json({ error: rentErr.message }, { status: 500 });

  return NextResponse.json({
    payments: (payments || []).map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      verified: p.verified,
      date: p.date,
      createdAt: p.created_at,
      propertyName: (p.properties as unknown as { name?: string } | null)?.name || "—",
      tenantName: (p.tenants as unknown as { name?: string } | null)?.name || "—",
    })),
    rentCollection: (rentRows || []).map((r) => ({
      id: r.id,
      amount: r.amount,
      dueDate: r.due_date,
      paidDate: r.paid_date,
      status: r.status,
      method: r.method,
      propertyName: (r.properties as unknown as { name?: string } | null)?.name || "—",
      tenantName: (r.tenants as unknown as { name?: string } | null)?.name || "—",
    })),
  });
}
