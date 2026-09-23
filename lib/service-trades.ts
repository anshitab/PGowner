export const SERVICE_TRADES = [
  "plumbing",
  "electrical",
  "carpentry",
  "cleaning",
  "appliance",
  "general",
] as const;

export type ServiceTrade = (typeof SERVICE_TRADES)[number];

export const TRADE_LABELS: Record<ServiceTrade, string> = {
  plumbing: "Plumber",
  electrical: "Electrician",
  carpentry: "Carpenter",
  cleaning: "Cleaning / housekeeping",
  appliance: "Appliance repair",
  general: "General maintenance",
};
