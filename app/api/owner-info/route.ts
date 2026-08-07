import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("property_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tenant?.property_id) {
    return NextResponse.json({ owner: null });
  }

  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("owner_id")
    .eq("id", tenant.property_id)
    .single();

  if (!property?.owner_id) {
    return NextResponse.json({ owner: null });
  }

  const [authRes, settingsRes] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(property.owner_id),
    supabaseAdmin
      .from("settings")
      .select("phone")
      .eq("property_id", tenant.property_id)
      .maybeSingle(),
  ]);

  const user = authRes.data?.user;
  if (!user) {
    return NextResponse.json({ owner: null });
  }

  const phone = settingsRes.data?.phone || user.user_metadata?.phone || user.phone || "";

  return NextResponse.json({
    owner: {
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Owner",
      email: user.email || "",
      phone,
    },
  });
}
