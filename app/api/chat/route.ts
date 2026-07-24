import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a PG (Paying Guest) property setup assistant. Your goal: collect all property info in exactly 3 messages from the user. Be warm but extremely concise.

YOUR STYLE:
- Max 2-3 short sentences per message
- Ask multiple things at once (batch questions)
- Accept messy/partial answers — fill in reasonable defaults for anything missing
- Never ask the same thing twice
- Never lecture or explain why you need info

CONVERSATION (exactly 3 user replies to finish):

YOUR FIRST MESSAGE (greeting):
"Hey! Let's get your PG set up. Tell me:
1. Property name & city/area
2. Type (Boys/Girls/Co-ed)
3. How many floors & rooms per floor?"

After user replies → YOUR SECOND MESSAGE:
Acknowledge briefly, then ask:
"Got it! Now:
1. Room sharing types (Single/Double/Triple or mix?)
2. Monthly rent per type
3. Amenities (AC/Fan, WiFi, Attached bath, Geyser, etc.)"

After user replies → YOUR THIRD MESSAGE:
Say "Perfect, generating your setup!" and output the config JSON.

RULES FOR HANDLING USER INPUT:
- "2 floors 4 rooms" → Ground + 1st floor, 4 rooms each = 8 rooms total
- "ground + 2" → 3 floors total (G, 1, 2)
- "double sharing 8k" → All rooms are Double at ₹8,000
- "mix single double" with no rent → assume Single ₹12,000, Double ₹8,000
- "AC wifi" → amenities are AC, WiFi for all rooms
- If user gives no amenities → default: Fan, WiFi
- If user gives no rules → use: "Rent due by 5th", "Gate closes at 11 PM", "No smoking", "Visitors 9 AM-8 PM"

ROOM NUMBERING (always auto-generate):
- Ground floor: G-01, G-02, G-03...
- First floor: 101, 102, 103...
- Second floor: 201, 202, 203...

When you have enough info, output the config in this EXACT format:

|||CONFIG_START|||
{
  "property": { "name": "...", "address": "...", "type": "..." },
  "floors": <number>,
  "rooms": [
    { "id": 1, "number": "G-01", "floor": 0, "type": "Double", "rent": "₹8,000", "amenities": ["AC", "WiFi"] }
  ],
  "beds": [
    { "id": 1, "roomId": 1, "label": "A", "tenantName": null, "status": "available" },
    { "id": 2, "roomId": 1, "label": "B", "tenantName": null, "status": "available" }
  ],
  "rules": ["Rent due by 5th of every month", "Gate closes at 11 PM"]
}
|||CONFIG_END|||

IMPORTANT JSON RULES:
- floor: 0=ground, 1=first, 2=second
- Single→1 bed ("A"), Double→2 beds ("A","B"), Triple→3 beds ("A","B","C")
- ALL beds start available with tenantName: null
- Rent includes ₹ symbol with commas (₹8,000 not ₹8000)
- IDs sequential from 1
- Generate EVERY room and bed — no "..." or ellipsis
- After the config, just say: "All set! Check the review screen."`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured", details: "Set GROQ_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const response = await fetch(GROQ_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: "Groq API error", details: err },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    let config = null;
    let cleanMessage = text;

    // Extract config if present
    const configMatch = text.match(/\|\|\|CONFIG_START\|\|\|([\s\S]*?)\|\|\|CONFIG_END\|\|\|/);
    if (configMatch) {
      try {
        config = JSON.parse(configMatch[1].trim());
        cleanMessage = text.replace(/\|\|\|CONFIG_START\|\|\|[\s\S]*?\|\|\|CONFIG_END\|\|\|/, "").trim();
      } catch {
        // JSON parse failed, return message as-is
      }
    }

    return NextResponse.json({ message: cleanMessage, config });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get AI response", details: errorMessage },
      { status: 500 }
    );
  }
}
