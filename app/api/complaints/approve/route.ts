import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getUserFromBearer } from "@/lib/api-auth";
import { resolveComplaintCategory, pickVendorTrade } from "@/lib/complaint-routing";
import { TRADE_LABELS, type ServiceTrade } from "@/lib/service-trades";
import { sendEmail, transactionalEmail, isEmailConfigured } from "@/lib/email";

interface ComplaintComment {
  id: string;
  author: string;
  message: string;
  timestamp: string;
}

async function findVendor(propertyId: string, trade: ServiceTrade) {
  for (const candidate of pickVendorTrade(trade)) {
    const { data } = await supabaseAdmin
      .from("service_vendors")
      .select("*")
      .eq("property_id", propertyId)
      .eq("trade", candidate)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function POST(request: Request) {
  const { user, error: authError } = await getUserFromBearer(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: 401 });
  }

  if (user.user_metadata?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can approve complaints" }, { status: 403 });
  }

  const { complaintId } = await request.json();
  if (!complaintId) {
    return NextResponse.json({ error: "complaintId required" }, { status: 400 });
  }

  const { data: complaint, error: fetchError } = await supabaseAdmin
    .from("complaints")
    .select("*, tenants(name, rooms(number))")
    .eq("id", complaintId)
    .single();

  if (fetchError || !complaint) {
    return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
  }

  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("id, owner_id, name")
    .eq("id", complaint.property_id)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (complaint.approval_status === "approved") {
    return NextResponse.json({ error: "Complaint already approved and assigned" }, { status: 409 });
  }

  const category = resolveComplaintCategory(
    complaint.category,
    complaint.title,
    complaint.description || ""
  );

  const vendor = await findVendor(complaint.property_id, category);
  if (!vendor) {
    return NextResponse.json(
      {
        error: `No active ${TRADE_LABELS[category]} contact for this property. Add one in Settings → Service contacts.`,
        code: "NO_VENDOR",
        category,
      },
      { status: 422 }
    );
  }

  const tenant = complaint.tenants as {
    name: string;
    rooms?: { number: string } | null;
  } | null;
  const roomNumber = tenant?.rooms?.number || "N/A";
  const tenantName = tenant?.name || "Tenant";

  const systemComment: ComplaintComment = {
    id: crypto.randomUUID(),
    author: "System",
    message: `Approved by owner. Assigned ${TRADE_LABELS[category as ServiceTrade]}: ${vendor.name} (${vendor.phone || "no phone"}).`,
    timestamp: new Date().toISOString(),
  };

  const existingComments = Array.isArray(complaint.comments) ? complaint.comments : [];
  const updatedComments = [...existingComments, systemComment];

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("complaints")
    .update({
      category,
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      vendor_id: vendor.id,
      assigned_to: vendor.name,
      status: "In Progress",
      comments: updatedComments,
    })
    .eq("id", complaintId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let emailSent = false;
  if (vendor.email && isEmailConfigured()) {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    try {
      await sendEmail({
        to: vendor.email,
        toName: vendor.name,
        subject: `Work request: ${complaint.title} — ${property.name}`,
        category: "maintenance",
        html: transactionalEmail({
          preheader: `New ${TRADE_LABELS[category]} job at ${property.name}, Room ${roomNumber}.`,
          title: "Maintenance work assigned to you",
          bodyHtml: `
            <p style="margin:0 0 12px 0;">Hi ${vendor.name},</p>
            <p style="margin:0 0 12px 0;">
              The PG owner approved a tenant complaint and assigned it to you as the <strong>${TRADE_LABELS[category]}</strong>.
            </p>
            <p style="margin:0 0 6px 0;"><strong>Property:</strong> ${property.name}</p>
            <p style="margin:0 0 6px 0;"><strong>Tenant:</strong> ${tenantName}</p>
            <p style="margin:0 0 6px 0;"><strong>Room:</strong> ${roomNumber}</p>
            <p style="margin:0 0 6px 0;"><strong>Issue:</strong> ${complaint.title}</p>
            <p style="margin:0 0 16px 0;"><strong>Details:</strong> ${complaint.description || "—"}</p>
            <p style="margin:0 0 12px 0;">Priority: <strong>${complaint.priority}</strong></p>
            <p style="margin:0;color:#64748b;font-size:13px;">Contact the PG owner if you need access or timing details.</p>
          `,
          reason: `Sent because you are listed as a service contact for ${property.name}.`,
        }),
      });
      emailSent = true;
    } catch (err) {
      console.error("Vendor notify email failed:", err);
    }
  }

  return NextResponse.json({
    success: true,
    complaint: updated,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      trade: vendor.trade,
    },
    category,
    emailSent,
  });
}
