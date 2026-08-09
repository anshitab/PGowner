import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: authData, error: authError } = await anon.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = authData.user;
    const role = user.user_metadata?.role || "owner";
    if (role !== "owner" && role !== "super_admin") {
      return NextResponse.json({ error: "Only property owners can add tenants" }, { status: 403 });
    }

    const body = await request.json();
    const {
      propertyId,
      name,
      phone,
      email,
      aadhaar,
      emergencyContact,
      homeAddress,
      roomId,
      rent,
      deposit,
      occupation,
      joinDate,
    } = body;

    if (!propertyId || !name?.trim() || !phone?.trim() || !roomId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: property, error: propError } = await supabaseAdmin
      .from("properties")
      .select("id, owner_id, name, verification_status")
      .eq("id", propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (role === "owner" && property.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (property.verification_status !== "verified") {
      return NextResponse.json(
        {
          error:
            property.verification_status === "rejected"
              ? "Property was rejected by admin. You cannot add tenants until it is approved."
              : "Property is pending admin verification. You cannot add tenants until it is approved.",
          code: "PROPERTY_NOT_VERIFIED",
          verification_status: property.verification_status,
        },
        { status: 403 }
      );
    }

    const { data: tenantData, error } = await supabaseAdmin
      .from("tenants")
      .insert({
        property_id: propertyId,
        name: name.trim(),
        phone: phone.trim(),
        email: (email || "").trim(),
        gov_ids: { aadhaar: String(aadhaar || "").replace(/\s/g, "") },
        emergency_contact: { phone: String(emergencyContact || "").trim() },
        address: String(homeAddress || "").trim(),
        room_id: roomId,
        rent: Number(rent) || 0,
        deposit: Number(deposit) || 0,
        occupation: String(occupation || "").trim(),
        join_date: joinDate || new Date().toISOString().split("T")[0],
        status: "Active",
      })
      .select()
      .single();

    if (error || !tenantData) {
      return NextResponse.json({ error: error?.message || "Failed to create tenant" }, { status: 500 });
    }

    // Assign to first available bed
    const { data: availableBed } = await supabaseAdmin
      .from("beds")
      .select("id")
      .eq("room_id", roomId)
      .eq("status", "available")
      .limit(1)
      .maybeSingle();

    if (availableBed) {
      await supabaseAdmin
        .from("beds")
        .update({
          tenant_id: tenantData.user_id || null,
          tenant_name: name.trim(),
          status: "occupied",
          assigned_date: joinDate || new Date().toISOString().split("T")[0],
        })
        .eq("id", availableBed.id);

      await supabaseAdmin.from("rooms").update({ status: "Occupied" }).eq("id", roomId);
    }

    const rentAmount = Number(rent) || 0;
    if (rentAmount > 0) {
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), 1);
      if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);

      await supabaseAdmin.from("rent_collection").insert({
        property_id: propertyId,
        tenant_id: tenantData.id,
        amount: rentAmount,
        due_date: dueDate.toISOString().split("T")[0],
        status: "Pending",
      });
    }

    return NextResponse.json({
      tenant: tenantData,
      propertyName: property.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create tenant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
