// scripts/seed-users.mjs
//
// One-time admin script: creates a Supabase Auth account for each villa
// (073 through 106) with default username = password = the villa id,
// e.g. villa-106 / villa-106. Residents are forced to change this on first
// login (see src/components/ChangePasswordGate.jsx).
//
// Run this ONCE after applying supabase/schema.sql, from your own machine -
// never from the browser or a committed file. It needs your Supabase
// SERVICE ROLE key, which must never be shipped to the frontend.
//
// Usage:
//   SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
//   node scripts/seed-users.mjs
//
// Safe to re-run: it skips any villa that already has an account.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables before running this script."
  );
  process.exit(1);
}

const FIRST = 73;
const LAST = 106; // 34 villas: villa-073 .. villa-106

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function villaId(n) {
  return `villa-${String(n).padStart(3, "0")}`;
}

async function seedVilla(n) {
  const id = villaId(n);
  const email = `${id}@colonyregister.app`;
  const password = id; // default password = villa id, e.g. "villa-106"

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { villa_number: id },
  });

  if (createError) {
    if (createError.message?.toLowerCase().includes("already been registered")) {
      console.log(`- ${id}: account already exists, skipping`);
      return;
    }
    console.error(`x ${id}: failed to create auth user -`, createError.message);
    return;
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    villa_number: id,
    must_change_password: true,
  });

  if (profileError) {
    console.error(`x ${id}: created auth user but failed to insert profile -`, profileError.message);
    return;
  }

  console.log(`✓ ${id}: created (login = ${id} / ${password})`);
}

for (let n = FIRST; n <= LAST; n++) {
  await seedVilla(n);
}

console.log("\nDone. Default password for every villa is its own id, e.g. villa-106.");
console.log("Each resident is forced to change this on first login.");
