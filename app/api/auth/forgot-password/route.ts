import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendEmail, isEmailConfigured, transactionalEmail } from "@/lib/email";

function resetEmailHtml(resetUrl: string): string {
  return transactionalEmail({
    preheader: "Reset your ProManage password",
    title: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 16px 0;">We received a request to reset your ProManage password.</p>
      <p style="margin:0 0 20px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#1f6f61;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;">
          Set new password
        </a>
      </p>
      <p style="margin:0 0 12px 0;font-size:13px;color:#64748b;word-break:break-all;">
        Or copy this link:<br />${resetUrl}
      </p>
      <p style="margin:0;font-size:13px;color:#64748b;">This link expires soon. If you did not request a reset, you can ignore this email.</p>
    `,
    reason: "You received this because a password reset was requested for your account.",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({ error: "Email service is not configured" }, { status: 500 });
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";

    const redirectTo = `${origin}/auth/callback?next=/reset-password`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Always return success to avoid email enumeration. Only send when link exists.
    if (!error && data?.properties?.action_link) {
      await sendEmail({
        to: email,
        toName: data.user?.user_metadata?.name || email.split("@")[0] || "User",
        subject: "Reset your ProManage password",
        html: resetEmailHtml(data.properties.action_link),
        text: `Reset your ProManage password:\n\n${data.properties.action_link}\n\nIf you did not request this, ignore this email.\n\n— ProManage`,
        category: "password-reset",
        fromName: "ProManage Accounts",
      });
    } else if (error) {
      console.warn("forgot-password generateLink:", error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send reset email";
    console.error("forgot-password error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
