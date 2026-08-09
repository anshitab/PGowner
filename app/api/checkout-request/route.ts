import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendEmail, transactionalEmail } from "@/lib/email";

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

  if (property && isEmailConfigured()) {
    const { data: owner } = await supabaseAdmin.auth.admin.getUserById(property.owner_id);
    const ownerEmail = owner?.user?.email;
    const roomNumber = (tenant.rooms as unknown as { number: string } | null)?.number || "N/A";

    if (ownerEmail) {
      try {
        await sendEmail({
          to: ownerEmail,
          toName: "PG Owner",
          subject: `Checkout notice: ${tenant.name}, Room ${roomNumber}`,
          html: transactionalEmail({
            preheader: `${tenant.name} requested checkout from ${property.name} on ${checkoutDate}.`,
            title: "Tenant checkout notice",
            bodyHtml: `
              <p style="margin:0 0 12px 0;">A tenant submitted a checkout request for <strong>${property.name}</strong>.</p>
              <p style="margin:0 0 6px 0;"><strong>Tenant:</strong> ${tenant.name}</p>
              <p style="margin:0 0 6px 0;"><strong>Room:</strong> ${roomNumber}</p>
              <p style="margin:0 0 6px 0;"><strong>Checkout date:</strong> ${checkoutDate}</p>
              <p style="margin:0 0 16px 0;"><strong>Deposit on record:</strong> Rs. ${(tenant.deposit || 0).toLocaleString("en-IN")}</p>
              <p style="margin:0;color:#475569;font-size:14px;">Open ProManage to review and complete settlement.</p>
            `,
            reason: `Sent because you are the owner of ${property.name}.`,
          }),
          category: "checkout",
          fromName: "ProManage Alerts",
        });
      } catch {
        // Checkout is already saved; don't fail the request on email errors
      }
    }
  }

  return NextResponse.json({ success: true });
}
