import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EMAIL_DOMAIN = "colonyregister.app";
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
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Could not verify caller" }, 401, origin);
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfileError || callerProfile?.role !== "superadmin") {
      return json({ error: "Only superadmin can reset passwords" }, 403, origin);
    }

    const { username } = await req.json();
    const normalizedUsername = String(username ?? "").trim().toLowerCase().replace(/\s+/g, "");
    if (!normalizedUsername) {
      return json({ error: "Username is required" }, 400, origin);
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id, username, role")
      .eq("username", normalizedUsername)
      .single();

    if (targetProfileError || !targetProfile) {
      return json({ error: "User not found" }, 404, origin);
    }

    if (targetProfile.role === "superadmin") {
      return json({ error: "Superadmin password cannot be reset here" }, 400, origin);
    }

    const defaultPassword = targetProfile.username;
    const email = `${targetProfile.username}@${EMAIL_DOMAIN}`;

    const { data: listedUsers, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listError) {
      return json({ error: listError.message }, 500, origin);
    }

    const authUser = listedUsers.users.find((entry) => entry.email?.toLowerCase() === email);
    if (!authUser) {
      return json({ error: "Auth user not found" }, 404, origin);
    }

    const { error: resetError } = await adminClient.auth.admin.updateUserById(authUser.id, {
      password: defaultPassword,
    });

    if (resetError) {
      return json({ error: resetError.message }, 500, origin);
    }

    if (targetProfile.role === "villa") {
      const { error: deleteResidentsError } = await adminClient
        .from("residents")
        .delete()
        .eq("villa_number", targetProfile.username);

      if (deleteResidentsError) {
        return json({ error: deleteResidentsError.message }, 500, origin);
      }
    }

    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", targetProfile.id);

    if (profileUpdateError) {
      return json({ error: profileUpdateError.message }, 500, origin);
    }

    return json({
      ok: true,
      username: targetProfile.username,
      defaultPassword,
      resetMode: targetProfile.role === "villa" ? "first-login-full" : "password-change-required",
    }, 200, origin);
  } catch (error) {
    return json({ error: String(error) }, 500, origin);
  }
});
