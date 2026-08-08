import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { createChallengeToken, generateOtp, otpEmailHtml } from "@/lib/otp";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function emailAlreadyRegistered(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return false;
    if (data.users.some((u) => u.email?.toLowerCase() === normalized)) return true;
    if (data.users.length < perPage) return false;
    page += 1;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!isEmailConfigured()) {
      return NextResponse.json({ error: "Email service is not configured" }, { status: 500 });
    }

    if (await emailAlreadyRegistered(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const otp = generateOtp();
    const challengeToken = createChallengeToken(email, name, otp);

    await sendEmail({
      to: email.trim().toLowerCase(),
      toName: name.trim(),
      subject: "Your ProManage sign-up code",
      html: otpEmailHtml(name.trim(), otp),
      text: `Hi ${name.trim()},\n\nYour ProManage sign-up code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.\n\n— ProManage`,
      category: "otp",
      fromName: "ProManage Accounts",
    });

    return NextResponse.json({
      success: true,
      challengeToken,
      expiresInSeconds: 600,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send OTP";
    console.error("send-otp error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
