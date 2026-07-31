import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VERIFICATION_PROMPT = `You are a document verification AI for a PG (Paying Guest) property management platform in India.
Analyze the uploaded document image and determine if it is a legitimate property ownership or tenancy proof.

Valid documents include: electricity bill, property tax receipt, rental agreement, society NOC, water bill, gas connection bill, maintenance bill, or any official document showing a residential address.

Check:
1. Is this a real document (not blank, not a random photo, not an unrelated image)?
2. Does it contain an address or owner/tenant name?
3. Is the document legible enough to confirm it's genuine?

Be lenient — if the document looks like a real utility bill or property paper, approve it. Only reject clearly fake, blank, or completely unrelated images.

Respond ONLY with valid JSON (no markdown, no backticks):
{"verified": true or false, "reason": "brief one-line explanation", "extractedName": "name if visible or empty string", "extractedAddress": "address if visible or empty string"}`;

export async function POST(request: Request) {
  try {
    const { propertyId, imageBase64, fileName, docType } = await request.json();

    if (!propertyId || !imageBase64) {
      return NextResponse.json(
        { error: "Missing propertyId or imageBase64" },
        { status: 400 }
      );
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Upload to Supabase Storage
    const fileExt = fileName?.split(".").pop() || "jpg";
    const storagePath = `${propertyId}/doc.${fileExt}`;
    const buffer = Buffer.from(imageBase64, "base64");

    const { error: uploadError } = await supabaseAdmin.storage
      .from("verification-docs")
      .upload(storagePath, buffer, {
        contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
        upsert: true,
      });

    if (uploadError) {
      // Storage bucket might not exist — continue with verification anyway
      console.error("Storage upload error:", uploadError.message);
    }

    // Get public URL for the doc
    const { data: urlData } = supabaseAdmin.storage
      .from("verification-docs")
      .getPublicUrl(storagePath);

    // Call Groq vision model
    const groqResponse = await fetch(GROQ_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: VERIFICATION_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please verify this ${docType || "property document"}. Is it a legitimate document?`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/${fileExt === "png" ? "png" : "jpeg"};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.1,
      }),
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      return NextResponse.json(
        { error: "AI verification failed", details: err },
        { status: 500 }
      );
    }

    const groqData = await groqResponse.json();
    const aiText = groqData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let verdict = { verified: false, reason: "Could not parse AI response", extractedName: "", extractedAddress: "" };
    try {
      const cleaned = aiText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      verdict = JSON.parse(cleaned);
    } catch {
      verdict.reason = aiText.slice(0, 200);
    }

    // Update property verification status
    const newStatus = verdict.verified ? "verified" : "rejected";
    await supabaseAdmin
      .from("properties")
      .update({
        verification_status: newStatus,
        verification_doc_url: urlData?.publicUrl || null,
      })
      .eq("id", propertyId);

    return NextResponse.json({
      status: newStatus,
      reason: verdict.reason,
      extractedName: verdict.extractedName || "",
      extractedAddress: verdict.extractedAddress || "",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Verification failed", details: msg }, { status: 500 });
  }
}
