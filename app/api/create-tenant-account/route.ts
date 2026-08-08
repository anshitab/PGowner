import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, transactionalEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: Request) {
  try {
    const { tenantName, tenantEmail, pgName, roomNumber, propertyId } = await request.json();

    if (!tenantEmail || !tenantName) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    if (propertyId) {
      const { data: property } = await supabaseAdmin
        .from("properties")
        .select("verification_status")
        .eq("id", propertyId)
        .maybeSingle();

      if (!property || property.verification_status !== "verified") {
        return NextResponse.json(
          {
            error:
              property?.verification_status === "rejected"
                ? "Property was rejected by admin. Tenant accounts cannot be created."
                : "Property is pending admin verification. Tenant accounts cannot be created yet.",
            code: "PROPERTY_NOT_VERIFIED",
          },
          { status: 403 }
        );
      }
    }

    const password = generatePassword();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: tenantEmail,
      password,
      email_confirm: true,
      user_metadata: { name: tenantName, role: "tenant" },
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json({ userId: null, alreadyExists: true });
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authData.user?.id;

    if (userId) {
      await supabaseAdmin
        .from("tenants")
        .update({ user_id: userId })
        .eq("email", tenantEmail)
        .is("user_id", null);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const propertyLabel = pgName || "your PG";
    const loginUrl = `${appUrl}/login?role=tenant`;
    const html = transactionalEmail({
      preheader: `Your tenant portal login for ${propertyLabel} is ready.`,
      title: "Your tenant portal access",
      bodyHtml: `
        <p style="margin:0 0 12px 0;">Hi ${tenantName},</p>
        <p style="margin:0 0 12px 0;">
          Your PG owner has created a tenant account for you at <strong>${propertyLabel}</strong>${roomNumber ? ` (Room ${roomNumber})` : ""}.
        </p>
        <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${tenantEmail}</p>
        <p style="margin:0 0 16px 0;"><strong>Temporary password:</strong> <span style="font-family:Consolas,Monaco,monospace;">${password}</span></p>
        <p style="margin:0 0 12px 0;">
          Sign in here: <a href="${loginUrl}" style="color:#1d4ed8;">${loginUrl}</a>
        </p>
        <p style="margin:0;color:#64748b;font-size:13px;">Please change your password after your first login.</p>
      `,
      reason: `Sent because a PG owner added this email as a tenant at ${propertyLabel}.`,
    });

    try {
      await sendEmail({
        to: tenantEmail,
        toName: tenantName,
        subject: `Tenant portal access for ${propertyLabel}`,
        html,
        category: "account",
        fromName: "ProManage Accounts",
      });
      return NextResponse.json({ userId, alreadyExists: false, emailSent: true });
    } catch (err: unknown) {
      const emailErr = err instanceof Error ? err.message : "Unknown email error";
      console.error("Failed to send tenant credentials email:", emailErr);
      return NextResponse.json({ userId, alreadyExists: false, emailSent: false, emailError: emailErr });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
