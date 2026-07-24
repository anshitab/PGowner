import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  // Get all active tenants with their property info
  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, email, rent, join_date, property_id, properties(name)")
    .eq("status", "Active")
    .not("email", "eq", "")
    .gt("rent", 0);

  if (error || !tenants) {
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }

  const today = new Date();
  let sent = 0;
  const results: { tenant: string; status: string }[] = [];

  for (const tenant of tenants) {
    if (!tenant.email || !tenant.join_date) continue;

    // Calculate days since join date in the current cycle
    const joinDate = new Date(tenant.join_date);
    const joinDay = joinDate.getDate();

    // The rent is due on the same day as join_date each month
    // Send reminder 2 days before (i.e., on day 28 of their cycle)
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), joinDay);
    const reminderDate = new Date(currentMonth);
    reminderDate.setDate(reminderDate.getDate() - 2);

    // Check if today is the reminder day
    if (
      today.getDate() !== reminderDate.getDate() ||
      today.getMonth() !== reminderDate.getMonth()
    ) {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pgName = (tenant.properties as any)?.name || "Your PG";
    const dueDate = currentMonth.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    try {
      await transporter.sendMail({
        from: `ProManage <${gmailUser}>`,
        to: tenant.email,
        subject: `Rent Reminder — ₹${Number(tenant.rent).toLocaleString("en-IN")} due on ${dueDate}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #1e293b; margin: 0;">Rent Reminder</h2>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">${pgName}</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <p style="color: #475569; font-size: 14px; margin: 0 0 8px 0;">Hi ${tenant.name},</p>
              <p style="color: #475569; font-size: 14px; margin: 0;">This is a friendly reminder that your monthly rent of <strong style="color: #1e293b;">₹${Number(tenant.rent).toLocaleString("en-IN")}</strong> is due on <strong>${dueDate}</strong>.</p>
            </div>

            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #1e40af; font-size: 13px; margin: 0; text-align: center;">
                Please make the payment on or before the due date to avoid any late fees.
              </p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
              <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
                Sent via ProManage · Automated rent reminder
              </p>
            </div>
          </div>
        `,
      });

      sent++;
      results.push({ tenant: tenant.name, status: "sent" });
    } catch (err) {
      results.push({ tenant: tenant.name, status: "failed" });
    }
  }

  return NextResponse.json({
    success: true,
    date: today.toISOString().split("T")[0],
    totalTenants: tenants.length,
    remindersSent: sent,
    results,
  });
}
