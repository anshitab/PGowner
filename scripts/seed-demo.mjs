/**
 * Creates demo owner + tenant accounts and sample PG data in Supabase.
 *
 * Usage (from project root, with .env.local configured):
 *   npm run seed:demo
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const DEMO_OWNER = {
  email: "demo.owner@promanage.demo",
  password: "DemoOwner123!",
  name: "Demo Owner",
};

const DEMO_TENANT = {
  email: "demo.tenant@promanage.demo",
  password: "DemoTenant123!",
  name: "Demo Tenant",
  phone: "9876543210",
};

const DEMO_PROPERTY_NAME = "Sunrise Demo PG";

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  let page = 1;
  const target = email.toLowerCase();
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function upsertAuthUser({ email, password, name, role }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { name, role, email_verified: true },
    });
    if (error) throw error;
    console.log(`Updated auth user: ${email}`);
    return data.user.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role, email_verified: true },
  });
  if (error) throw error;
  console.log(`Created auth user: ${email}`);
  return data.user.id;
}

async function ensureDemoProperty(ownerId) {
  const { data: existing } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name", DEMO_PROPERTY_NAME)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("properties")
      .update({
        address: "12 MG Road, Koramangala, Bengaluru",
        type: "Co-ed PG",
        total_floors: 2,
        total_rooms: 3,
        verification_status: "verified",
        rules: ["No smoking indoors", "Visitors until 9 PM", "Rent by the 5th"],
      })
      .eq("id", existing.id);
    console.log("Using existing demo property");
    return existing.id;
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_id: ownerId,
      name: DEMO_PROPERTY_NAME,
      address: "12 MG Road, Koramangala, Bengaluru",
      type: "Co-ed PG",
      total_floors: 2,
      total_rooms: 3,
      verification_status: "verified",
      rules: ["No smoking indoors", "Visitors until 9 PM", "Rent by the 5th"],
    })
    .select("id")
    .single();

  if (error) throw error;
  console.log("Created demo property");
  return data.id;
}

const DEMO_WEEKLY_MENU = {
  monday: { breakfast: "Poha, tea", lunch: "Dal, rice, roti, seasonal sabzi", dinner: "Rajma, rice, salad" },
  tuesday: { breakfast: "Upma, coffee", lunch: "Chole, bhatura, onion salad", dinner: "Mix veg, roti, curd" },
  wednesday: { breakfast: "Paratha, curd", lunch: "Kadhi, rice, papad", dinner: "Paneer butter masala, roti" },
  thursday: { breakfast: "Idli, sambar", lunch: "Sambar rice, poriyal, pickle", dinner: "Egg curry / paneer curry, roti" },
  friday: { breakfast: "Bread, jam, tea", lunch: "Veg biryani, raita", dinner: "Dal fry, jeera rice, salad" },
  saturday: { breakfast: "Aloo paratha, pickle", lunch: "Rajma chawal, salad", dinner: "Special thali" },
  sunday: { breakfast: "Poori, aloo sabzi", lunch: "Chicken / paneer curry, rice, roti", dinner: "Khichdi, papad, pickle" },
};

async function ensureSettings(propertyId) {
  const { data: existing } = await supabase
    .from("settings")
    .select("id")
    .eq("property_id", propertyId)
    .maybeSingle();

  const foodPatch = {
    upi_id: "demo@upi",
    rent_due_day: 5,
    food_included: true,
    weekly_menu: DEMO_WEEKLY_MENU,
  };

  if (existing?.id) {
    await supabase.from("settings").update(foodPatch).eq("id", existing.id);
    return;
  }

  const { error } = await supabase.from("settings").insert({
    property_id: propertyId,
    ...foodPatch,
  });
  if (error) throw error;
}

async function ensureRoomsAndBeds(propertyId) {
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, number")
    .eq("property_id", propertyId);

  if (rooms?.length) {
    return rooms;
  }

  const specs = [
    { number: "101", floor: 1, type: "Single", rent: 12000, beds: ["A"] },
    { number: "102", floor: 1, type: "Double", rent: 9000, beds: ["A", "B"] },
    { number: "201", floor: 2, type: "Single", rent: 13000, beds: ["A"] },
  ];

  const created = [];
  for (const spec of specs) {
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        property_id: propertyId,
        number: spec.number,
        floor: spec.floor,
        type: spec.type,
        rent: spec.rent,
        status: spec.number === "101" ? "Occupied" : "Vacant",
        amenities: ["Wi‑Fi", "AC", "Meals"],
      })
      .select("id, number")
      .single();
    if (error) throw error;

    for (const label of spec.beds) {
      const { error: bedErr } = await supabase.from("beds").insert({
        room_id: room.id,
        property_id: propertyId,
        label,
        status: spec.number === "101" && label === "A" ? "occupied" : "available",
      });
      if (bedErr) throw bedErr;
    }
    created.push(room);
  }
  console.log("Created demo rooms and beds");
  return created;
}

async function ensureDemoTenant(propertyId, tenantUserId, roomId) {
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("property_id", propertyId)
    .eq("email", DEMO_TENANT.email)
    .maybeSingle();

  const joinDate = new Date();
  joinDate.setMonth(joinDate.getMonth() - 2);
  const joinStr = joinDate.toISOString().split("T")[0];

  const payload = {
    user_id: tenantUserId,
    property_id: propertyId,
    name: DEMO_TENANT.name,
    phone: DEMO_TENANT.phone,
    email: DEMO_TENANT.email,
    room_id: roomId,
    rent: 12000,
    deposit: 24000,
    occupation: "Software Engineer",
    company: "Demo Corp",
    join_date: joinStr,
    status: "Active",
  };

  let tenantId;
  if (existing?.id) {
    const { error } = await supabase.from("tenants").update(payload).eq("id", existing.id);
    if (error) throw error;
    tenantId = existing.id;
  } else {
    const { data, error } = await supabase.from("tenants").insert(payload).select("id").single();
    if (error) throw error;
    tenantId = data.id;
  }

  const { data: bed } = await supabase
    .from("beds")
    .select("id")
    .eq("room_id", roomId)
    .eq("label", "A")
    .maybeSingle();

  if (bed?.id) {
    await supabase
      .from("beds")
      .update({
        tenant_id: tenantUserId,
        tenant_name: DEMO_TENANT.name,
        status: "occupied",
        assigned_date: joinStr,
      })
      .eq("id", bed.id);
  }

  return tenantId;
}

async function ensureServiceVendors(propertyId) {
  const { count } = await supabase
    .from("service_vendors")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (count) return;

  const { error } = await supabase.from("service_vendors").insert([
    {
      property_id: propertyId,
      trade: "plumbing",
      name: "Ramesh (Demo Plumber)",
      phone: "9876500001",
      email: "",
    },
    {
      property_id: propertyId,
      trade: "electrical",
      name: "Sunil (Demo Electrician)",
      phone: "9876500002",
      email: "",
    },
    {
      property_id: propertyId,
      trade: "general",
      name: "General Maintenance",
      phone: "9876500003",
      email: "",
    },
  ]);
  if (error) throw error;
  console.log("Created demo service contacts");
}

async function ensureSampleData(propertyId, tenantId) {
  const { count: paymentCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("tenant_id", tenantId);

  if (!paymentCount) {
    const paidDate = new Date();
    paidDate.setDate(1);
    await supabase.from("payments").insert({
      property_id: propertyId,
      tenant_id: tenantId,
      amount: 12000,
      method: "UPI",
      verified: true,
      date: paidDate.toISOString().split("T")[0],
    });
  }

  const { count: complaintCount } = await supabase
    .from("complaints")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (!complaintCount) {
    await supabase.from("complaints").insert({
      property_id: propertyId,
      tenant_id: tenantId,
      title: "Bathroom tap leaking",
      description: "Water dripping constantly from the tap in room 101 bathroom.",
      priority: "Medium",
      status: "Open",
      category: "plumbing",
      approval_status: "pending",
    });
  }

  const { count: announcementCount } = await supabase
    .from("announcements")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (!announcementCount) {
    await supabase.from("announcements").insert({
      property_id: propertyId,
      title: "Welcome to the demo PG",
      message: "This is sample data for exploring ProManage.",
      priority: "normal",
    });
  }
}

async function main() {
  console.log("Seeding ProManage demo accounts…\n");

  try {
    const { spawnSync } = await import("node:child_process");
    spawnSync(process.execPath, ["scripts/apply-migrations.mjs"], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch {
    /* optional */
  }

  const ownerId = await upsertAuthUser({
    email: DEMO_OWNER.email,
    password: DEMO_OWNER.password,
    name: DEMO_OWNER.name,
    role: "owner",
  });

  const tenantUserId = await upsertAuthUser({
    email: DEMO_TENANT.email,
    password: DEMO_TENANT.password,
    name: DEMO_TENANT.name,
    role: "tenant",
  });

  const propertyId = await ensureDemoProperty(ownerId);
  await ensureSettings(propertyId);
  const rooms = await ensureRoomsAndBeds(propertyId);
  const room101 = rooms.find((r) => r.number === "101");
  if (!room101) throw new Error("Demo room 101 missing");

  const tenantId = await ensureDemoTenant(propertyId, tenantUserId, room101.id);
  await ensureServiceVendors(propertyId);
  await ensureSampleData(propertyId, tenantId);

  console.log("\nDemo accounts ready:\n");
  console.log("  Owner login");
  console.log(`    Email:    ${DEMO_OWNER.email}`);
  console.log(`    Password: ${DEMO_OWNER.password}`);
  console.log("\n  Tenant login");
  console.log(`    Email:    ${DEMO_TENANT.email}`);
  console.log(`    Password: ${DEMO_TENANT.password}`);
  console.log("\nSet NEXT_PUBLIC_DEMO_ACCOUNTS=true in .env.local to show one-click login on /login");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
