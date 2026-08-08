import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendEmail, transactionalEmail } from "@/lib/email";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VERIFICATION_PROMPT = `You are a payment verification AI. Analyze this UPI payment screenshot and determine if it shows a successful payment.

Check:
1. Is this a real UPI payment confirmation screen (from Google Pay, PhonePe, Paytm, BHIM, or any UPI app)?
2. Does it show a SUCCESSFUL/COMPLETED payment (not failed or pending)?
3. What is the amount paid?
4. What is the UTR/Transaction ID if visible?
5. What is the date of payment?
6. Who is the recipient/payee?

Only approve if it clearly shows a successful UPI payment. Reject screenshots that are blurry, heavily edited, show failed payments, or are not payment receipts.

Respond ONLY with valid JSON (no markdown, no backticks):
{"verified": true or false, "reason": "brief explanation", "amount": number or null, "utr": "transaction id or empty string", "date": "date if visible or empty string", "recipient": "payee name or empty string"}`;

export async function POST(request: Request) {
  try {
    const { tenantId, propertyId, rentCollectionId, imageBase64, amount } = await request.json();

    if (!tenantId || !propertyId || !imageBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    // Call Groq vision model to verify screenshot
    const groqResponse = await fetch(GROQ_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: VERIFICATION_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Verify this payment screenshot. Expected amount: ₹${amount || "unknown"}.` },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.1,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      return NextResponse.json({ error: "AI verification failed", details: err }, { status: 500 });
    }

    const groqData = await groqResponse.json();
    const aiText = groqData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let verdict = { verified: false, reason: "Could not parse AI response", amount: null as number | null, utr: "", date: "", recipient: "" };
    try {
      const cleaned = aiText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      verdict = JSON.parse(cleaned);
    } catch {
      verdict.reason = aiText.slice(0, 200);
    }

    if (!verdict.verified) {
      return NextResponse.json({
        status: "rejected",
        reason: verdict.reason,
      });
    }

    // Payment verified — update database
    const today = new Date().toISOString().split("T")[0];

    // Update rent_collection if provided
    if (rentCollectionId) {
      await supabaseAdmin
        .from("rent_collection")
        .update({ status: "Paid", paid_date: today, method: "UPI" })
        .eq("id", rentCollectionId);
    }

    // Insert into payments table
    await supabaseAdmin.from("payments").insert({
      property_id: propertyId,
      tenant_id: tenantId,
      amount: verdict.amount || amount || 0,
      method: "UPI",
      verified: true,
      date: today,
    });

    // Log activity
    await supabaseAdmin.from("activity_log").insert({
      property_id: propertyId,
      type: "payment",
      action: "payment_received",
      title: "Payment Received",
      description: `₹${(verdict.amount || amount || 0).toLocaleString("en-IN")} via UPI${verdict.utr ? ` (UTR: ${verdict.utr})` : ""}`,
      entity_id: tenantId,
      entity_type: "tenant",
      actor: "Tenant",
    });

    // Send email notification to owner
    await notifyOwner(propertyId, tenantId, verdict.amount || amount || 0, verdict.utr);

    return NextResponse.json({
      status: "verified",
      reason: verdict.reason,
      amount: verdict.amount,
      utr: verdict.utr,
      date: verdict.date,
      recipient: verdict.recipient,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Verification failed", details: msg }, { status: 500 });
  }
}

async function notifyOwner(propertyId: string, tenantId: string, amount: number, utr: string) {
  if (!isEmailConfigured()) return;

  // Get owner email
  const { data: property } = await supabaseAdmin
    .from("properties")
    .select("owner_id, name")
    .eq("id", propertyId)
    .single();

  if (!property) return;

  const { data: ownerAuth } = await supabaseAdmin.auth.admin.getUserById(property.owner_id);
  const ownerEmail = ownerAuth?.user?.email;
  if (!ownerEmail) return;

  // Get tenant name
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, room_id")
    .eq("id", tenantId)
    .single();

  const tenantName = tenant?.name || "A tenant";

  // Get room number
  let roomNumber = "";
  if (tenant?.room_id) {
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("number")
      .eq("id", tenant.room_id)
      .single();
    roomNumber = room?.number || "";
  }

  const amountLabel = `Rs. ${Number(amount).toLocaleString("en-IN")}`;
  const dateLabel = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const html = transactionalEmail({
    preheader: `${tenantName} paid ${amountLabel} for ${property.name}.`,
    title: "Tenant payment recorded",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">A tenant payment was recorded for <strong>${property.name}</strong>.</p>
      <p style="margin:0 0 6px 0;"><strong>Tenant:</strong> ${tenantName}${roomNumber ? ` (Room ${roomNumber})` : ""}</p>
      <p style="margin:0 0 6px 0;"><strong>Amount:</strong> ${amountLabel}</p>
      <p style="margin:0 0 6px 0;"><strong>Method:</strong> UPI</p>
      ${utr ? `<p style="margin:0 0 6px 0;"><strong>Reference:</strong> ${utr}</p>` : ""}
      <p style="margin:0 0 6px 0;"><strong>Date:</strong> ${dateLabel}</p>
      <p style="margin:12px 0 0 0;color:#64748b;font-size:13px;">Verified from the tenant payment screenshot in ProManage.</p>
    `,
    reason: `Sent because you are the owner of ${property.name}.`,
  });

  try {
    await sendEmail({
      to: ownerEmail,
      toName: "PG Owner",
      subject: `Payment from ${tenantName} at ${property.name}`,
      html,
      category: "payment",
      fromName: "ProManage Billing",
    });
  } catch (err) {
    console.error("Failed to send owner notification:", err);
  }
}
