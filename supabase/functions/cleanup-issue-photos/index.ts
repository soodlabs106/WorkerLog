import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PHOTO_CLEANUP_SECRET = Deno.env.get("PHOTO_CLEANUP_SECRET") ?? "";
const ISSUE_PHOTO_BUCKET = "issue-photos";
const FULL_RETENTION_DAYS = 5;
const THUMB_RETENTION_DAYS = 30;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function removeStoragePaths(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  for (const batch of chunk(uniquePaths, 1000)) {
    const { error } = await adminClient.storage.from(ISSUE_PHOTO_BUCKET).remove(batch);
    if (error) throw error;
  }
}

async function cleanupFullImages() {
  const { data, error } = await adminClient
    .from("issue_photos")
    .select("id, full_path, issues!inner(resolved_at, status)")
    .is("full_deleted_at", null)
    .not("full_path", "is", null)
    .eq("issues.status", "resolved")
    .lte("issues.resolved_at", isoDaysAgo(FULL_RETENTION_DAYS));

  if (error) throw error;
  if (!data?.length) return 0;

  await removeStoragePaths(data.map((row) => row.full_path));

  const { error: updateError } = await adminClient
    .from("issue_photos")
    .update({ full_deleted_at: new Date().toISOString() })
    .in("id", data.map((row) => row.id));

  if (updateError) throw updateError;
  return data.length;
}

async function cleanupThumbnails() {
  const { data, error } = await adminClient
    .from("issue_photos")
    .select("id, thumb_path, issues!inner(resolved_at, status)")
    .is("thumb_deleted_at", null)
    .not("thumb_path", "is", null)
    .eq("issues.status", "resolved")
    .lte("issues.resolved_at", isoDaysAgo(THUMB_RETENTION_DAYS));

  if (error) throw error;
  if (!data?.length) return 0;

  await removeStoragePaths(data.map((row) => row.thumb_path));

  const { error: updateError } = await adminClient
    .from("issue_photos")
    .update({ thumb_deleted_at: new Date().toISOString() })
    .in("id", data.map((row) => row.id));

  if (updateError) throw updateError;
  return data.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!PHOTO_CLEANUP_SECRET) {
    return json({ error: "PHOTO_CLEANUP_SECRET is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${PHOTO_CLEANUP_SECRET}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const [fullDeleted, thumbsDeleted] = await Promise.all([
      cleanupFullImages(),
      cleanupThumbnails(),
    ]);

    return json({
      ok: true,
      fullDeleted,
      thumbsDeleted,
      fullRetentionDays: FULL_RETENTION_DAYS,
      thumbRetentionDays: THUMB_RETENTION_DAYS,
    });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
