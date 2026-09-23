export const DEMO_OWNER = {
  email: "demo.owner@promanage.demo",
  password: "DemoOwner123!",
  name: "Demo Owner",
} as const;

export const DEMO_TENANT = {
  email: "demo.tenant@promanage.demo",
  password: "DemoTenant123!",
  name: "Demo Tenant",
} as const;

export const DEMO_PROPERTY_NAME = "Sunrise Demo PG";

export function isDemoUserEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return normalized === DEMO_OWNER.email || normalized === DEMO_TENANT.email;
}

export function getDemoCredentials(role: "owner" | "tenant") {
  return role === "owner" ? DEMO_OWNER : DEMO_TENANT;
}

/** Show demo login shortcuts (dev by default; set NEXT_PUBLIC_DEMO_ACCOUNTS=false to hide). */
export function isDemoAccountsEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEMO_ACCOUNTS;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "development";
}
