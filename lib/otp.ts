import { createHmac, randomInt, timingSafeEqual } from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface OtpChallenge {
  email: string;
  name: string;
  otpHash: string;
  exp: number;
}

function getSecret(): string {
  const secret =
    process.env.OTP_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!secret) {
    throw new Error("OTP signing secret not configured");
  }
  return secret;
}

export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export function hashOtp(otp: string, email: string): string {
  return createHmac("sha256", getSecret())
    .update(`${email.trim().toLowerCase()}:${otp}`)
    .digest("hex");
}

export function createChallengeToken(email: string, name: string, otp: string): string {
  const payload: OtpChallenge = {
    email: email.trim().toLowerCase(),
    name: name.trim(),
    otpHash: hashOtp(otp, email),
    exp: Date.now() + OTP_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseChallengeToken(token: string): OtpChallenge | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;

    const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OtpChallenge;
    if (!payload?.email || !payload?.otpHash || !payload?.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyOtpCode(challenge: OtpChallenge, otp: string): boolean {
  const incoming = hashOtp(otp.trim(), challenge.email);
  const a = Buffer.from(incoming);
  const b = Buffer.from(challenge.otpHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function otpEmailHtml(name: string, otp: string): string {
  // Imported lazily-style via string template in email.ts consumers — keep self-contained HTML
  // to avoid circular imports with transactionalEmail.
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#ffffff;color:#1e293b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your ProManage sign-up code is ${otp}. It expires in 10 minutes.
  </div>
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:28px 20px;line-height:1.55;font-size:15px;">
    <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">ProManage</p>
    <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:600;color:#0f172a;">Confirm your email address</h1>
    <p style="margin:0 0 12px 0;">Hi ${name || "there"},</p>
    <p style="margin:0 0 16px 0;">Here is your one-time code to finish creating your PG owner account:</p>
    <p style="margin:20px 0;font-size:28px;font-weight:700;letter-spacing:6px;font-family:Consolas,Monaco,monospace;">${otp}</p>
    <p style="margin:0 0 12px 0;color:#475569;">This code expires in 10 minutes. Do not share it with anyone.</p>
    <p style="margin:0;color:#64748b;font-size:13px;">If you did not create a ProManage account, you can ignore this message.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      You received this because someone used this email during ProManage owner signup.<br />
      This is a transactional message related to your account.
    </p>
  </div>
</body>
</html>`;
}
