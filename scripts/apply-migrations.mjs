/**
 * Applies SQL migrations when DATABASE_URL is set (Supabase → Settings → Database → URI).
 * Usage: npm run db:migrate
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

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

const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function main() {
  if (!url) {
    console.log("DATABASE_URL not set — skipping automatic migrations.");
    console.log("Apply supabase/apply-all.sql once in the Supabase SQL Editor, then run npm run seed:demo");
    return;
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Install pg: npm install pg --save-dev");
    process.exit(1);
  }

  const client = new pg.default.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const migrationsDir = resolve(process.cwd(), "supabase", "migrations");
  const applyAll = resolve(process.cwd(), "supabase", "apply-all.sql");

  const files = [];
  if (existsSync(applyAll)) files.push(applyAll);
  if (existsSync(migrationsDir)) {
    for (const name of readdirSync(migrationsDir).sort()) {
      if (name.endsWith(".sql")) files.push(join(migrationsDir, name));
    }
  }

  const seen = new Set();
  for (const file of files) {
    if (seen.has(file)) continue;
    seen.add(file);
    const sql = readFileSync(file, "utf8");
    console.log(`Applying ${file}…`);
    await client.query(sql);
  }

  await client.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
