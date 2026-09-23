import { createClient } from "@supabase/supabase-js";
import { resolveComplaintCategory } from "@/lib/complaint-routing";
import type { ServiceTrade } from "@/lib/service-trades";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function admin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const COMPLAINT_SELECT_FULL =
  "*, tenants(name, rooms(number)), service_vendors(name, phone, trade, email)";

const COMPLAINT_SELECT_BASIC = "*, tenants(name, rooms(number))";

export async function fetchComplaintsForProperty(propertyId: string) {
  const supabase = admin();

  const full = await supabase
    .from("complaints")
    .select(COMPLAINT_SELECT_FULL)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (!full.error) {
    return (full.data || []).map((row) => enrichComplaintRecord(row as Record<string, unknown>));
  }

  const basic = await supabase
    .from("complaints")
    .select(COMPLAINT_SELECT_BASIC)
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (basic.error) throw basic.error;
  return (basic.data || []).map((row) => enrichComplaintRecord(row as Record<string, unknown>));
}

export function enrichComplaintRecord(
  c: Record<string, unknown>
): Record<string, unknown> & { category: ServiceTrade } {
  const title = String(c.title || "");
  const description = String(c.description || "");
  const category = resolveComplaintCategory(
    c.category as string | null | undefined,
    title,
    description
  );
  return { ...c, category };
}

export function mapComplaintRow(c: Record<string, unknown>) {
  const enriched = enrichComplaintRecord(c);
  const vendor = c.service_vendors as {
    name: string;
    phone: string;
    trade: string;
  } | null;

  return {
    id: c.id,
    type: "complaint" as const,
    title: c.title,
    description: c.description || "",
    tenant: (c.tenants as { name: string } | null)?.name || "",
    room:
      (c.tenants as { name: string; rooms?: { number: string } | null } | null)?.rooms?.number ||
      "",
    status: enriched.status as string,
    priority: enriched.priority as string,
    category: enriched.category,
    approval_status: (enriched.approval_status as string | undefined) || "pending",
    assigned_to: enriched.assigned_to as string | null | undefined,
    vendor: vendor || null,
    created_at: enriched.created_at as string,
  };
}
