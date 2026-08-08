import { NextResponse } from "next/server";
import { sendEmail, transactionalEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { tenantName, tenantEmail, amount, dueDate, upiId, pgName } = await request.json();

  if (!tenantEmail || !amount || !upiId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const amountLabel = `Rs. ${Number(amount).toLocaleString("en-IN")}`;
  const dueLabel = dueDate
    ? new Date(dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const propertyLabel = pgName || "your PG";
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(pgName || "PG Rent")}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Rent for ${pgName || "PG"}`)}`;

  const html = transactionalEmail({
    preheader: `Rent of ${amountLabel} for ${propertyLabel}${dueLabel ? ` is due by ${dueLabel}` : ""}.`,
    title: "Monthly rent notice",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Hi ${tenantName || "there"},</p>
      <p style="margin:0 0 12px 0;">
        This is a notice from <strong>${propertyLabel}</strong> regarding your monthly rent of
        <strong>${amountLabel}</strong>${dueLabel ? ` due by <strong>${dueLabel}</strong>` : ""}.
      </p>
      <p style="margin:0 0 8px 0;">You can pay using UPI ID: <strong>${upiId}</strong></p>
      <p style="margin:0 0 16px 0;font-size:13px;color:#475569;">
        On a mobile device you may also open this payment link:<br />
        <a href="${upiLink}" style="color:#1d4ed8;word-break:break-all;">${upiLink}</a>
      </p>
      <p style="margin:0;color:#64748b;font-size:13px;">If you have already paid, please ignore this message.</p>
    `,
    reason: `Sent because you are a tenant at ${propertyLabel}.`,
  });

  try {
    await sendEmail({
      to: tenantEmail,
      toName: tenantName || "Tenant",
      subject: `Rent notice for ${propertyLabel}`,
      html,
      category: "rent",
      fromName: "ProManage Billing",
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Email send error:", err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
