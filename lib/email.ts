import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  /** Short category for analytics, e.g. "otp", "rent", "account" */
  category?: string;
}

export type EmailProvider = "mailjet" | "gmail";

function isMailjetConfigured(): boolean {
  return Boolean(
    process.env.MAILJET_API_KEY &&
      process.env.MAILJET_SECRET_KEY &&
      process.env.MAILJET_SENDER_EMAIL
  );
}

function isGmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/** True if Mailjet and/or Gmail SMTP can send mail. */
export function isEmailConfigured(): boolean {
  return isMailjetConfigured() || isGmailConfigured();
}

/** Strip HTML into a readable plain-text alternative (helps inbox placement). */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8377;|&rupee;/g, "Rs.")
    .replace(/₹/g, "Rs.")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Simple transactional layout: text-heavy, no images/emojis, clear reason footer.
 * Gmail tends to keep these in Primary vs promo-style templates.
 */
export function transactionalEmail(options: {
  preheader: string;
  title: string;
  bodyHtml: string;
  reason: string;
}): string {
  const { preheader, title, bodyHtml, reason } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;color:#1e293b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${preheader}
  </div>
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:28px 20px;line-height:1.55;font-size:15px;">
    <p style="margin:0 0 4px 0;font-size:13px;color:#64748b;">ProManage</p>
    <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:600;color:#0f172a;">${title}</h1>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
      ${reason}<br />
      This is a transactional message from ProManage related to your account or property.
    </p>
  </div>
</body>
</html>`;
}

async function sendViaMailjet(options: {
  to: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
  category: string;
}): Promise<unknown> {
  const apiKey = process.env.MAILJET_API_KEY!;
  const secretKey = process.env.MAILJET_SECRET_KEY!;
  const senderEmail = process.env.MAILJET_SENDER_EMAIL!;

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${apiKey}:${secretKey}`).toString("base64"),
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: senderEmail, Name: options.fromName },
          To: [{ Email: options.to, Name: options.toName }],
          ReplyTo: { Email: senderEmail, Name: options.fromName },
          Subject: options.subject,
          TextPart: options.text,
          HTMLPart: options.html,
          TrackOpens: "disabled",
          TrackClicks: "disabled",
          CustomCampaign: `promanage-${options.category}`,
          CustomID: `promanage-${options.category}-${Date.now()}`,
          Headers: {
            "X-Entity-Ref-ID": `promanage-${options.category}-${Date.now()}`,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Mailjet error (${response.status}): ${errorData}`);
  }

  return response.json();
}

async function sendViaGmail(options: {
  to: string;
  toName: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
}): Promise<unknown> {
  const gmailUser = process.env.GMAIL_USER!;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD!;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  const info = await transporter.sendMail({
    from: `"${options.fromName}" <${gmailUser}>`,
    to: `"${options.toName}" <${options.to}>`,
    replyTo: gmailUser,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  return { provider: "gmail", messageId: info.messageId };
}

/**
 * Central email sender: tries Mailjet first, falls back to Gmail SMTP.
 */
export async function sendEmail({
  to,
  toName = "Recipient",
  subject,
  html,
  text,
  fromName = "ProManage",
  category = "transactional",
}: SendEmailOptions): Promise<unknown> {
  const textPart = text || htmlToText(html);
  const mailjetReady = isMailjetConfigured();
  const gmailReady = isGmailConfigured();

  if (!mailjetReady && !gmailReady) {
    throw new Error(
      "No email provider configured. Set Mailjet (MAILJET_*) and/or Gmail (GMAIL_USER, GMAIL_APP_PASSWORD)."
    );
  }

  let mailjetError: unknown = null;

  if (mailjetReady) {
    try {
      const result = await sendViaMailjet({
        to,
        toName,
        subject,
        html,
        text: textPart,
        fromName,
        category,
      });
      return { provider: "mailjet" as EmailProvider, result };
    } catch (err) {
      mailjetError = err;
      console.warn(
        "Mailjet send failed, trying Gmail SMTP fallback:",
        err instanceof Error ? err.message : err
      );
    }
  }

  if (gmailReady) {
    try {
      return await sendViaGmail({
        to,
        toName,
        subject,
        html,
        text: textPart,
        fromName,
      });
    } catch (gmailErr) {
      const mailjetMsg = mailjetError instanceof Error ? mailjetError.message : "";
      const gmailMsg = gmailErr instanceof Error ? gmailErr.message : "Gmail SMTP failed";
      throw new Error(
        mailjetMsg
          ? `Mailjet failed (${mailjetMsg}); Gmail fallback failed (${gmailMsg})`
          : gmailMsg
      );
    }
  }

  throw mailjetError instanceof Error
    ? mailjetError
    : new Error("Mailjet failed and Gmail SMTP is not configured");
}
