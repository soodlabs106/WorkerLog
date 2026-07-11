export function isVillaProfile(profile) {
  return profile?.role === "villa";
}

export function isAdminProfile(profile) {
  return profile?.role === "admin";
}

export function isSuperAdminProfile(profile) {
  return profile?.role === "superadmin";
}

export function canManageContacts(profile) {
  return isAdminProfile(profile) || isSuperAdminProfile(profile);
}

export function canResetPasswords(profile) {
  return isSuperAdminProfile(profile);
}

export function profileLabel(profile) {
  if (!profile) return "";
  return profile.display_name || profile.villa_number || profile.username || "Account";
}
