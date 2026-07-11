import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ISSUE_PHOTO_BUCKET = "issue-photos";
const FULL_RETENTION_DAYS = 5;
const THUMB_RETENTION_DAYS = 30;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function removeStoragePaths(paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  for (const batch of chunk(uniquePaths, 1000)) {
    const { error } = await supabase.storage.from(ISSUE_PHOTO_BUCKET).remove(batch);
    if (error) throw error;
  }
}

async function cleanupFullImages() {
  const cutoff = isoDaysAgo(FULL_RETENTION_DAYS);
  const { data, error } = await supabase
    .from("issue_photos")
    .select("id, full_path, issues!inner(resolved_at, status)")
    .is("full_deleted_at", null)
    .not("full_path", "is", null)
    .eq("issues.status", "resolved")
    .lte("issues.resolved_at", cutoff);

  if (error) throw error;
  if (!data?.length) return 0;

  await removeStoragePaths(data.map((row) => row.full_path));

  const ids = data.map((row) => row.id);
  const { error: updateError } = await supabase
    .from("issue_photos")
    .update({ full_deleted_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) throw updateError;
  return ids.length;
}

async function cleanupThumbnails() {
  const cutoff = isoDaysAgo(THUMB_RETENTION_DAYS);
  const { data, error } = await supabase
    .from("issue_photos")
    .select("id, thumb_path, issues!inner(resolved_at, status)")
    .is("thumb_deleted_at", null)
    .not("thumb_path", "is", null)
    .eq("issues.status", "resolved")
    .lte("issues.resolved_at", cutoff);

  if (error) throw error;
  if (!data?.length) return 0;

  await removeStoragePaths(data.map((row) => row.thumb_path));

  const ids = data.map((row) => row.id);
  const { error: updateError } = await supabase
    .from("issue_photos")
    .update({ thumb_deleted_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) throw updateError;
  return ids.length;
}

try {
  const [fullDeleted, thumbsDeleted] = await Promise.all([
    cleanupFullImages(),
    cleanupThumbnails(),
  ]);

  console.log(`Deleted ${fullDeleted} full issue images and ${thumbsDeleted} thumbnails.`);
} catch (error) {
  console.error("Issue photo cleanup failed:", error.message || error);
  process.exit(1);
}
