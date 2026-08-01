import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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
    const { tenantName, tenantEmail, pgName, roomNumber } = await request.json();

    if (!tenantEmail || !tenantName) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    const password = generatePassword();

    // Create auth user with tenant role
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

    // Link tenant record to the new auth user
    if (userId) {
      await supabaseAdmin
        .from("tenants")
        .update({ user_id: userId })
        .eq("email", tenantEmail)
        .is("user_id", null);
    }

    // Send credentials email
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailAppPassword) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailAppPassword },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background: #ede9fe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <span style="font-size: 24px;">🏠</span>
            </div>
            <h2 style="color: #1e293b; margin: 0;">Welcome to ${pgName || "Your PG"}!</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Your tenant account has been created</p>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #475569; font-size: 14px; margin: 0 0 12px 0;">Hi <strong>${tenantName}</strong>,</p>
            <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0;">
              Your PG owner has added you to <strong>${pgName || "the PG"}</strong>${roomNumber ? ` (Room ${roomNumber})` : ""}. Use the credentials below to log in to your tenant portal.
            </p>

            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 6px 0;">Email</td>
                  <td style="color: #1e293b; font-size: 13px; font-weight: 600; text-align: right;">${tenantEmail}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-size: 13px; padding: 6px 0;">Password</td>
                  <td style="color: #1e293b; font-size: 14px; font-weight: 700; font-family: monospace; text-align: right; letter-spacing: 0.5px;">${password}</td>
                </tr>
              </table>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${appUrl}/login?role=tenant" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              Login to Your Portal
            </a>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
              Please change your password after first login. · Sent via ProManage
            </p>
          </div>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: `ProManage <${gmailUser}>`,
          to: tenantEmail,
          subject: `Your Tenant Login — ${pgName || "ProManage"}`,
          html,
        });
        return NextResponse.json({ userId, alreadyExists: false, emailSent: true });
      } catch (err: unknown) {
        const emailErr = err instanceof Error ? err.message : "Unknown email error";
        console.error("Failed to send tenant credentials email:", emailErr);
        return NextResponse.json({ userId, alreadyExists: false, emailSent: false, emailError: emailErr });
      }
    } else {
      console.error("Gmail credentials not configured:", { hasUser: !!gmailUser, hasPass: !!gmailAppPassword });
      return NextResponse.json({ userId, alreadyExists: false, emailSent: false, emailError: "Gmail credentials not configured" });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
