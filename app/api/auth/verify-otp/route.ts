import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseChallengeToken, verifyOtpCode } from "@/lib/otp";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, otp, challengeToken } = await request.json();

    if (!email || !password || !otp || !challengeToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email" }, { status: 400 });
    }

    const challenge = parseChallengeToken(challengeToken);
    if (!challenge) {
      return NextResponse.json(
        { error: "Verification code expired or invalid. Please request a new code." },
        { status: 400 }
      );
    }

    if (challenge.email !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Email does not match verification challenge" }, { status: 400 });
    }

    if (!verifyOtpCode(challenge, otp)) {
      return NextResponse.json({ error: "Incorrect verification code" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: challenge.email,
      password,
      email_confirm: true,
      user_metadata: {
        name: challenge.name,
        role: "owner",
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      userId: data.user?.id,
      email: challenge.email,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    console.error("verify-otp error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
