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
const LAST = 106;
const EMAIL_DOMAIN = "colonyregister.app";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SERVICE_CONTACTS = [
  { seed_key: "electrician-primary", service: "Electrician", role: "Primary", name: "Shashi", phone_number: "9845183436", sort_order: 1 },
  { seed_key: "electrician-secondary", service: "Electrician", role: "Secondary", name: "Balu", phone_number: "8050205715", sort_order: 2 },
  { seed_key: "plumber-primary", service: "Plumber", role: "Primary", name: "Prakash", phone_number: "9036042892", sort_order: 1 },
  { seed_key: "plumber-secondary", service: "Plumber", role: "Secondary", name: "Gholek", phone_number: "8553319522", sort_order: 2 },
  { seed_key: "snake-catcher-1", service: "Snake Catcher", role: "Primary", name: "Purushotham", phone_number: "9739527836", sort_order: 1 },
  { seed_key: "snake-catcher-2", service: "Snake Catcher", role: "Primary", name: "Vivek", phone_number: "9026995552", sort_order: 2 },
  { seed_key: "snake-catcher-3", service: "Snake Catcher", role: "Primary", name: "Sunny", phone_number: "9742084335", sort_order: 3 },
  { seed_key: "snake-catcher-4", service: "Snake Catcher", role: "Primary", name: "Devaraj", phone_number: "9980855720", sort_order: 4 },
  { seed_key: "snake-catcher-5", service: "Snake Catcher", role: "Primary", name: "Arun", phone_number: "9008719568", sort_order: 5 },
  { seed_key: "snake-catcher-6", service: "Snake Catcher", role: "Primary", name: "Shivakumar", phone_number: "9980855720", sort_order: 6 },
  { seed_key: "snake-catcher-7", service: "Snake Catcher", role: "Primary", name: "Rajesh", phone_number: "7411188241", sort_order: 7 },
];

function accountEmail(username) {
  return `${username}@${EMAIL_DOMAIN}`;
}

function villaId(n) {
  return `villa-${String(n).padStart(3, "0")}`;
}

function villaLabel(villaNumber) {
  return villaNumber.replace("villa-", "Villa ");
}

async function listExistingUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
    page += 1;
  }

  return new Map(users.map((user) => [user.email?.toLowerCase(), user]));
}

async function upsertProfile(profile) {
  const { error } = await supabase.from("profiles").upsert(profile, { onConflict: "id" });
  if (error) throw error;
}

async function ensureAccount(existingUsersByEmail, { username, password, displayName, role, villaNumber = null, mustChangePassword = false }) {
  const normalizedUsername = username.toLowerCase();
  const email = accountEmail(normalizedUsername);
  let authUser = existingUsersByEmail.get(email);

  if (!authUser) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: normalizedUsername, villa_number: villaNumber, role },
    });

    if (createError) throw createError;
    authUser = created.user;
    existingUsersByEmail.set(email, authUser);
    console.log(`✓ ${normalizedUsername}: created auth user`);
  } else {
    console.log(`- ${normalizedUsername}: auth user already exists`);
  }

  await upsertProfile({
    id: authUser.id,
    username: normalizedUsername,
    display_name: displayName,
    role,
    villa_number: villaNumber,
    must_change_password: mustChangePassword,
  });

  console.log(`✓ ${normalizedUsername}: profile upserted`);
}

async function seedVillas(existingUsersByEmail) {
  for (let n = FIRST; n <= LAST; n++) {
    const id = villaId(n);
    const email = accountEmail(id);
    const existing = existingUsersByEmail.get(email);

    if (existing) {
      console.log(`- ${id}: account already exists, skipping auth create`);
      const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", existing.id).maybeSingle();
      if (!existingProfile) {
        await upsertProfile({
          id: existing.id,
          username: id,
          display_name: villaLabel(id),
          role: "villa",
          villa_number: id,
          must_change_password: true,
        });
        console.log(`✓ ${id}: profile restored`);
      }
      continue;
    }

    await ensureAccount(existingUsersByEmail, {
      username: id,
      password: id,
      displayName: villaLabel(id),
      role: "villa",
      villaNumber: id,
      mustChangePassword: true,
    });
  }
}

async function seedServiceContacts() {
  const { data: existingContacts, error: existingError } = await supabase
    .from("service_contacts")
    .select("seed_key");

  if (existingError) throw existingError;

  const existingKeys = new Set((existingContacts || []).map((contact) => contact.seed_key));
  const missingContacts = SERVICE_CONTACTS.filter((contact) => !existingKeys.has(contact.seed_key));

  if (missingContacts.length === 0) {
    console.log("✓ service contacts: already present, no inserts needed");
    return;
  }

  const { error } = await supabase.from("service_contacts").insert(missingContacts);
  if (error) throw error;
  console.log(`✓ service contacts: inserted ${missingContacts.length} missing rows`);
}

try {
  const existingUsersByEmail = await listExistingUsers();

  await seedVillas(existingUsersByEmail);

  await ensureAccount(existingUsersByEmail, {
    username: "facilitymanager",
    password: "facilitymanager",
    displayName: "Facility Manager",
    role: "admin",
    mustChangePassword: false,
  });

  await ensureAccount(existingUsersByEmail, {
    username: "superadmin",
    password: "Em2@jakkur560064",
    displayName: "Super Admin",
    role: "superadmin",
    mustChangePassword: false,
  });

  await seedServiceContacts();

  console.log("\nDone.");
  console.log("Villa default password = villa id, e.g. villa-106.");
  console.log("Facility manager login = FacilityManager / facilitymanager.");
  console.log("Super admin login = superadmin / Em2@jakkur560064.");
} catch (error) {
  console.error("Seeding failed:", error.message || error);
  process.exit(1);
}
