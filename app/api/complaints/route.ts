import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("property_id");

  if (!propertyId) {
    return NextResponse.json({ error: "property_id required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("complaints")
    .select("*, tenants(name, rooms(number))")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, title, description, priority } = body;

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
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
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

  const { data, error } = await supabase
    .from("complaints")
    .insert({
      property_id: tenant.property_id,
      tenant_id: tenant.id,
      title,
      description: description || "",
      priority: priority || "Medium",
      status: "Open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    tenant: tenant.name,
    room: (tenant.rooms as unknown as { number: string } | null)?.number || "",
  });
}
