import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendEmail, transactionalEmail } from "@/lib/email";

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

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email not configured (Mailjet)" }, { status: 500 });
  }

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
      const amountLabel = `Rs. ${Number(tenant.rent).toLocaleString("en-IN")}`;
      await sendEmail({
        to: tenant.email,
        toName: tenant.name,
        subject: `Upcoming rent for ${pgName}`,
        html: transactionalEmail({
          preheader: `Your rent of ${amountLabel} for ${pgName} is due on ${dueDate}.`,
          title: "Upcoming rent due date",
          bodyHtml: `
            <p style="margin:0 0 12px 0;">Hi ${tenant.name},</p>
            <p style="margin:0 0 12px 0;">
              Your monthly rent of <strong>${amountLabel}</strong> for <strong>${pgName}</strong>
              is due on <strong>${dueDate}</strong>.
            </p>
            <p style="margin:0;color:#475569;font-size:14px;">
              Please complete payment on or before the due date. If you have already paid, no further action is needed.
            </p>
          `,
          reason: `Sent because you are listed as an active tenant at ${pgName}.`,
        }),
        category: "rent",
        fromName: "ProManage Billing",
      });

      sent++;
      results.push({ tenant: tenant.name, status: "sent" });
    } catch {
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
