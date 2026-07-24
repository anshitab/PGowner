import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const tables = [
    "properties", "rooms", "beds", "tenants", "payments",
    "rent_collection", "complaints", "visitors", "expenses",
    "announcements", "activity_log", "settings", "checkout_records",
    "bed_transfers", "transactions",
  ];

  const results: Record<string, boolean> = {};

  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1);
    results[table] = !error;
  }

  const allExist = Object.values(results).every(Boolean);

  return NextResponse.json({
    ready: allExist,
    tables: results,
    instructions: allExist
      ? "Database is ready!"
      : "Some tables are missing. Please run supabase/schema.sql in your Supabase Dashboard > SQL Editor.",
  });
}
