import { SERVICE_TRADES, type ServiceTrade } from "./service-trades";

const PLUMBING_PATTERNS = [
  /\bno\s+water\b/i,
  /\bwater\s+not\b/i,
  /\bwithout\s+water\b/i,
  /\bwater\s+supply\b/i,
  /\blow\s+pressure\b/i,
  /\bhot\s+water\b/i,
  /\bcold\s+water\b/i,
];

const ELECTRICAL_PATTERNS = [
  /\bno\s+power\b/i,
  /\bpower\s+cut\b/i,
  /\bpower\s+out/i,
  /\blights?\s+not\b/i,
  /\bfan\s+not\b/i,
];

const RULES: { trade: ServiceTrade; keywords: string[] }[] = [
  {
    trade: "plumbing",
    keywords: [
      "plumb",
      "pipe",
      "leak",
      "leaking",
      "tap",
      "faucet",
      "toilet",
      "drain",
      "geyser",
      "water heater",
      "bathroom",
      "flush",
      "sink",
      "blockage",
      "choked",
      "water",
      "sewage",
      "clog",
      "overflow",
      "dripping",
      "drainage",
      "नल",
      "पाइप",
      "पानी",
      "गीजर",
    ],
  },
  {
    trade: "electrical",
    keywords: [
      "electric",
      "electrical",
      "wiring",
      "wire",
      "switch",
      "power",
      "light",
      "fan",
      "mcb",
      "socket",
      "short",
      "bulb",
      "tripping",
      "current",
      "बिजली",
      "पंखा",
      "बल्ब",
    ],
  },
  {
    trade: "carpentry",
    keywords: ["carpent", "door", "lock", "hinge", "wardrobe", "furniture", "wood", "drawer", "दरवाजा", "ताला"],
  },
  {
    trade: "cleaning",
    keywords: ["clean", "pest", "cockroach", "mosquito", "hygiene", "garbage", "dust", "सफाई"],
  },
  {
    trade: "appliance",
    keywords: ["ac", "air condition", "fridge", "refrigerator", "washing", "microwave", "appliance", "cooling"],
  },
];

export function classifyComplaintCategory(title: string, description: string): ServiceTrade {
  const text = `${title} ${description}`.toLowerCase();

  if (PLUMBING_PATTERNS.some((p) => p.test(text))) return "plumbing";
  if (ELECTRICAL_PATTERNS.some((p) => p.test(text))) return "electrical";

  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) {
      return rule.trade;
    }
  }

  return "general";
}

/** Use stored DB category when valid; otherwise detect from title + description. */
export function resolveComplaintCategory(
  stored: string | null | undefined,
  title: string,
  description: string
): ServiceTrade {
  if (stored && isServiceTrade(stored)) return stored;
  return classifyComplaintCategory(title, description || "");
}

export function isServiceTrade(value: string): value is ServiceTrade {
  return (SERVICE_TRADES as readonly string[]).includes(value);
}

export function pickVendorTrade(preferred: ServiceTrade): ServiceTrade[] {
  if (preferred === "general") return ["general"];
  return [preferred, "general"];
}
