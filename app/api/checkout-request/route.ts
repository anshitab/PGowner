import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { userId, checkoutDate } = await request.json();

  if (!userId || !checkoutDate) {
    return NextResponse.json({ error: "userId and checkoutDate required" }, { status: 400 });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, property_id, room_id, rent, deposit, join_date, rooms(number)")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from("checkout_records").insert({
    property_id: tenant.property_id,
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    room_number: (tenant.rooms as unknown as { number: string } | null)?.number || "",
    status: "settlement_pending",
    check_in_date: tenant.join_date,
    deposit_amount: tenant.deposit || 0,
    last_date: checkoutDate,
    notice_date: new Date().toISOString().split("T")[0],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email notification to PG owner
  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("name, owner_id")
    .eq("id", tenant.property_id)
    .single();

  if (property) {
    const { data: owner } = await supabaseAdmin.auth.admin.getUserById(property.owner_id);
    const ownerEmail = owner?.user?.email;

    if (ownerEmail) {
      const apiKey = process.env.MAILJET_API_KEY;
      const secretKey = process.env.MAILJET_SECRET_KEY;
      const senderEmail = process.env.MAILJET_SENDER_EMAIL || "anshitabathla33@gmail.com";
      const roomNumber = (tenant.rooms as unknown as { number: string } | null)?.number || "N/A";

      if (apiKey && secretKey) {
        await fetch("https://api.mailjet.com/v3.1/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Basic " + Buffer.from(`${apiKey}:${secretKey}`).toString("base64"),
          },
          body: JSON.stringify({
            Messages: [
              {
                From: { Email: senderEmail, Name: "ProManage" },
                To: [{ Email: ownerEmail, Name: "PG Owner" }],
                Subject: `Checkout Request from ${tenant.name} — Room ${roomNumber}`,
                HTMLPart: `
                  <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #1e293b;">Checkout Request</h2>
                    <p style="color: #475569;">A tenant has submitted a checkout request for your property <strong>${property.name}</strong>.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                      <tr><td style="padding: 8px 0; color: #64748b;">Tenant</td><td style="padding: 8px 0; font-weight: 600;">${tenant.name}</td></tr>
                      <tr><td style="padding: 8px 0; color: #64748b;">Room</td><td style="padding: 8px 0; font-weight: 600;">${roomNumber}</td></tr>
                      <tr><td style="padding: 8px 0; color: #64748b;">Checkout Date</td><td style="padding: 8px 0; font-weight: 600;">${checkoutDate}</td></tr>
                      <tr><td style="padding: 8px 0; color: #64748b;">Deposit</td><td style="padding: 8px 0; font-weight: 600;">₹${(tenant.deposit || 0).toLocaleString("en-IN")}</td></tr>
                    </table>
                    <p style="color: #475569; font-size: 14px;">Please log in to ProManage to process this request.</p>
                  </div>
                `,
              },
            ],
          }),
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ success: true });
}
