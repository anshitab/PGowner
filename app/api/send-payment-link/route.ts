import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const { tenantName, tenantEmail, amount, dueDate, upiId, pgName } = await request.json();

  if (!tenantEmail || !amount || !upiId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    return NextResponse.json({ error: "Email service not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(pgName || "PG Rent")}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Rent payment for ${pgName || "PG"}`)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0;">Rent Payment Reminder</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">${pgName || "Your PG"}</p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #475569; font-size: 14px; margin: 0 0 4px 0;">Hi ${tenantName || "Tenant"},</p>
        <p style="color: #475569; font-size: 14px; margin: 0;">Your rent of <strong style="color: #1e293b;">₹${Number(amount).toLocaleString("en-IN")}</strong> is due${dueDate ? ` by <strong>${new Date(dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>` : ""}.</p>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${upiLink}" style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px;">
          Pay ₹${Number(amount).toLocaleString("en-IN")} via UPI
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Opens your UPI app (GPay, PhonePe, Paytm, etc.)</p>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Sent via ProManage · This is an automated payment reminder
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `ProManage <${gmailUser}>`,
      to: tenantEmail,
      subject: `Rent Payment Reminder — ₹${Number(amount).toLocaleString("en-IN")} Due`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Email send error:", err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
