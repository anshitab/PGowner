import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getUserFromBearer } from "@/lib/api-auth";
import { isServiceTrade } from "@/lib/complaint-routing";
import { SERVICE_TRADES } from "@/lib/service-trades";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("property_id");

  if (!propertyId) {
    return NextResponse.json({ error: "property_id required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("service_vendors")
    .select("*")
    .eq("property_id", propertyId)
    .order("trade", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { user, error: authError } = await getUserFromBearer(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can manage service contacts" }, { status: 403 });
  }

  const body = await request.json();
  const { propertyId, trade, name, phone, email, isActive } = body;

  if (!propertyId || !trade || !name?.trim()) {
    return NextResponse.json({ error: "propertyId, trade, and name required" }, { status: 400 });
  }

  if (!isServiceTrade(trade)) {
    return NextResponse.json(
      { error: `trade must be one of: ${SERVICE_TRADES.join(", ")}` },
      { status: 400 }
    );
  }

  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("owner_id")
    .eq("id", propertyId)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("service_vendors")
    .insert({
      property_id: propertyId,
      trade,
      name: name.trim(),
      phone: String(phone || "").trim(),
      email: String(email || "").trim(),
      is_active: isActive !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const { user, error: authError } = await getUserFromBearer(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const body = await request.json();
  const { id, propertyId, trade, name, phone, email, isActive } = body;

  if (!id || !propertyId) {
    return NextResponse.json({ error: "id and propertyId required" }, { status: 400 });
  }

  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("owner_id")
    .eq("id", propertyId)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (trade !== undefined) {
    if (!isServiceTrade(trade)) {
      return NextResponse.json({ error: "Invalid trade" }, { status: 400 });
    }
    patch.trade = trade;
  }
  if (name !== undefined) patch.name = String(name).trim();
  if (phone !== undefined) patch.phone = String(phone).trim();
  if (email !== undefined) patch.email = String(email).trim();
  if (isActive !== undefined) patch.is_active = !!isActive;

  const { data, error } = await supabaseAdmin
    .from("service_vendors")
    .update(patch)
    .eq("id", id)
    .eq("property_id", propertyId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await getUserFromBearer(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const propertyId = searchParams.get("property_id");

  if (!id || !propertyId) {
    return NextResponse.json({ error: "id and property_id required" }, { status: 400 });
  }

  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("owner_id")
    .eq("id", propertyId)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("service_vendors")
    .delete()
    .eq("id", id)
    .eq("property_id", propertyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
