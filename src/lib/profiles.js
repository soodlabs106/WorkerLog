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

export function canResolveIssue(profile, issue) {
  if (!profile || !issue) return false;
  if (isAdminProfile(profile) || isSuperAdminProfile(profile)) return true;
  const actorVilla = profile.villa_number || profile.username;
  return Boolean(actorVilla && issue.reported_by_villa === actorVilla);
}

export function canAssignIssue(profile) {
  return isAdminProfile(profile) || isSuperAdminProfile(profile);
}

export function canFollowUpIssue(profile, issue) {
  if (!profile || !issue || issue.status === "resolved") return false;
  if (isAdminProfile(profile) || isSuperAdminProfile(profile)) return true;
  const actorVilla = profile.villa_number || profile.username;
  return Boolean(actorVilla && issue.reported_by_villa === actorVilla);
}

export function profileLabel(profile) {
  if (!profile) return "";
  return profile.display_name || profile.villa_number || profile.username || "Account";
}
