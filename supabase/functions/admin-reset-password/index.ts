import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EMAIL_DOMAIN = "colonyregister.app";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
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
      return json({ error: "Could not verify caller" }, 401);
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfileError || callerProfile?.role !== "superadmin") {
      return json({ error: "Only superadmin can reset passwords" }, 403);
    }

    const { username } = await req.json();
    const normalizedUsername = String(username ?? "").trim().toLowerCase().replace(/\s+/g, "");
    if (!normalizedUsername) {
      return json({ error: "Username is required" }, 400);
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id, username, role")
      .eq("username", normalizedUsername)
      .single();

    if (targetProfileError || !targetProfile) {
      return json({ error: "User not found" }, 404);
    }

    if (targetProfile.role === "superadmin") {
      return json({ error: "Superadmin password cannot be reset here" }, 400);
    }

    const defaultPassword = targetProfile.username;
    const email = `${targetProfile.username}@${EMAIL_DOMAIN}`;

    const { data: listedUsers, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listError) {
      return json({ error: listError.message }, 500);
    }

    const authUser = listedUsers.users.find((entry) => entry.email?.toLowerCase() === email);
    if (!authUser) {
      return json({ error: "Auth user not found" }, 404);
    }

    const { error: resetError } = await adminClient.auth.admin.updateUserById(authUser.id, {
      password: defaultPassword,
    });

    if (resetError) {
      return json({ error: resetError.message }, 500);
    }

    await adminClient
      .from("profiles")
      .update({ must_change_password: targetProfile.role === "villa" })
      .eq("id", targetProfile.id);

    return json({ ok: true, username: targetProfile.username, defaultPassword });
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
