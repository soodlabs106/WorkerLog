import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ISSUE_PHOTO_BUCKET = "issue-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_PATHS = 100;
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://em2-resolve.netlify.app,http://localhost:4318,http://127.0.0.1:4318,http://localhost:4319,http://127.0.0.1:4319")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function corsHeaders(origin: string | null) {
  return {
    ...baseCorsHeaders,
    ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
  };
}

function isAllowedOrigin(origin: string | null) {
  return !origin || ALLOWED_ORIGINS.includes(origin);
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function sanitizePaths(rawPaths: unknown) {
  if (!Array.isArray(rawPaths)) return [];
  return [...new Set(
    rawPaths
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .slice(0, MAX_PATHS)
  )];
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (!isAllowedOrigin(origin)) {
    return json({ error: "Origin not allowed" }, 403);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401, origin);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Could not verify caller" }, 401, origin);
    }

    const { paths: rawPaths } = await req.json();
    const requestedPaths = sanitizePaths(rawPaths);
    if (!requestedPaths.length) {
      return json({ urls: {} }, 200, origin);
    }

    const [fullRowsResult, thumbRowsResult] = await Promise.all([
      userClient
        .from("issue_photos")
        .select("full_path")
        .is("full_deleted_at", null)
        .in("full_path", requestedPaths),
      userClient
        .from("issue_photos")
        .select("thumb_path")
        .is("thumb_deleted_at", null)
        .in("thumb_path", requestedPaths),
    ]);

    if (fullRowsResult.error) {
      return json({ error: fullRowsResult.error.message }, 500, origin);
    }

    if (thumbRowsResult.error) {
      return json({ error: thumbRowsResult.error.message }, 500, origin);
    }

    const allowedPaths = [
      ...(fullRowsResult.data || []).map((row) => row.full_path),
      ...(thumbRowsResult.data || []).map((row) => row.thumb_path),
    ].filter(Boolean);

    const uniqueAllowedPaths = [...new Set(allowedPaths)];
    if (!uniqueAllowedPaths.length) {
      return json({ urls: {} }, 200, origin);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signedRows, error: signedError } = await adminClient
      .storage
      .from(ISSUE_PHOTO_BUCKET)
      .createSignedUrls(uniqueAllowedPaths, SIGNED_URL_TTL_SECONDS);

    if (signedError) {
      return json({ error: signedError.message }, 500, origin);
    }

    const urls = Object.fromEntries(
      (signedRows || [])
        .filter((row) => row.signedUrl && row.path)
        .map((row) => [row.path, row.signedUrl])
    );

    return json({ urls, expiresIn: SIGNED_URL_TTL_SECONDS }, 200, origin);
  } catch (error) {
    return json({ error: String(error) }, 500, origin);
  }
});
