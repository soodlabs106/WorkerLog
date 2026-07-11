import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIRM = process.env.CONFIRM_CLEAR_ISSUES;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

if (CONFIRM !== "YES_DELETE_ALL_ISSUES") {
  console.error("Refusing to run. Set CONFIRM_CLEAR_ISSUES=YES_DELETE_ALL_ISSUES to confirm.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  const { error } = await supabase.rpc("admin_clear_issues");
  if (error) throw error;
  console.log("All issues deleted and ticket numbering reset.");
} catch (error) {
  console.error("Clear issues failed:", error.message || error);
  process.exit(1);
}
