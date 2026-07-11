const EMAIL_DOMAIN = "colonyregister.app";

export function accountToEmail(username) {
  return `${username}@${EMAIL_DOMAIN}`;
}

export function emailToAccount(email) {
  return email.split("@")[0];
}

export function normalizeLoginInput(raw) {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.startsWith("villa-")) return trimmed;
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return trimmed.replace(/\s+/g, "");
  return `villa-${digits.padStart(3, "0")}`;
}
