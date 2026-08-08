import { NextResponse } from "next/server";
import { isEmailConfigured, sendEmail, transactionalEmail } from "@/lib/email";

export async function GET() {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "No email provider configured. Set Mailjet (MAILJET_*) and/or Gmail (GMAIL_USER, GMAIL_APP_PASSWORD).",
      },
      { status: 500 }
    );
  }

  const to =
    process.env.MAILJET_SENDER_EMAIL ||
    process.env.GMAIL_USER;

  if (!to) {
    return NextResponse.json({ error: "No sender/test recipient email configured" }, { status: 500 });
  }

  try {
    const data = await sendEmail({
      to,
      toName: "ProManage",
      subject: "ProManage mail configuration check",
      html: transactionalEmail({
        preheader: "Your ProManage email setup is working.",
        title: "Mail configuration check",
        bodyHtml: `
          <p style="margin:0 0 12px 0;">This is a test message from ProManage.</p>
          <p style="margin:0;">Mailjet is tried first; Gmail SMTP is used automatically if Mailjet fails.</p>
        `,
        reason: "Sent because someone requested a mail configuration test.",
      }),
      category: "test",
      fromName: "ProManage Accounts",
    });
    return NextResponse.json({ status: 200, response: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
