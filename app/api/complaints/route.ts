import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  classifyComplaintCategory,
  isServiceTrade,
} from "@/lib/complaint-routing";
import type { ServiceTrade } from "@/lib/service-trades";
import { fetchComplaintsForProperty } from "@/lib/complaints-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("property_id");

  if (!propertyId) {
    return NextResponse.json({ error: "property_id required" }, { status: 400 });
  }

  try {
    const data = await fetchComplaintsForProperty(propertyId);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load complaints";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, title, description, priority, category: rawCategory } = body;

  if (!userId || !title) {
    return NextResponse.json({ error: "userId and title required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  let { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, property_id, rooms(number)")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tenant) {
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(userId);
    if (user?.email) {
      const { data: emailMatch } = await supabase
        .from("tenants")
        .select("id, name, property_id, rooms(number)")
        .eq("email", user.email)
        .maybeSingle();

      if (emailMatch) {
        await supabase.from("tenants").update({ user_id: userId }).eq("id", emailMatch.id);
        tenant = emailMatch;
      }
    }
  }

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const category: ServiceTrade =
    rawCategory && isServiceTrade(rawCategory)
      ? rawCategory
      : classifyComplaintCategory(title, description || "");

  const insertPayload: Record<string, unknown> = {
    property_id: tenant.property_id,
    tenant_id: tenant.id,
    title,
    description: description || "",
    priority: priority || "Medium",
    status: "Open",
    category,
  };

  // Newer columns — omit if migration not applied yet
  insertPayload.approval_status = "pending";

  let { data, error } = await supabase.from("complaints").insert(insertPayload).select().single();

  if (error?.message?.includes("approval_status")) {
    delete insertPayload.approval_status;
    ({ data, error } = await supabase.from("complaints").insert(insertPayload).select().single());
  }
  if (error?.message?.includes("category")) {
    delete insertPayload.category;
    ({ data, error } = await supabase.from("complaints").insert(insertPayload).select().single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data!.id,
    tenant: tenant.name,
    room: (tenant.rooms as unknown as { number: string } | null)?.number || "",
    category,
  });
}
