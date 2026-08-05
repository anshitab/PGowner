import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const senderEmail = process.env.MAILJET_SENDER_EMAIL || "anshitabathla33@gmail.com";

  if (!apiKey || !secretKey) {
    return NextResponse.json({ error: "MAILJET_API_KEY or MAILJET_SECRET_KEY not set" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${apiKey}:${secretKey}`).toString("base64"),
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: senderEmail, Name: "ProManage Test" },
            To: [{ Email: senderEmail, Name: "Test" }],
            Subject: "ProManage Email Test",
            HTMLPart: "<h3>Email is working!</h3><p>If you see this, Mailjet is configured correctly.</p>",
          },
        ],
      }),
    });

    const data = await response.json();
    return NextResponse.json({ status: response.status, response: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
