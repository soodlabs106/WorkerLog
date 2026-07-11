// Supabase Auth needs an email address. Residents log in with just their
// villa id and password, so we map villa-106 <-> villa-106@colonyregister.app
// behind the scenes. This domain doesn't need to exist or receive mail -
// it's never used to send anything.
const EMAIL_DOMAIN = "colonyregister.app";

export function villaToEmail(villaId) {
  return `${villaId}@${EMAIL_DOMAIN}`;
}

export function emailToVilla(email) {
  return email.split("@")[0];
}

export function normalizeVillaInput(raw) {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.startsWith("villa-")) return trimmed;
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return trimmed;
  return `villa-${digits.padStart(3, "0")}`;
}
