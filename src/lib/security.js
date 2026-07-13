export function normalizeErrorText(error) {
  return String(error?.message || error || "").trim();
}

export function toUserErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const message = normalizeErrorText(error).toLowerCase();

  if (!message) return fallback;
  if (message.includes("timed out")) return "That took too long. Please try again.";
  if (message.includes("networkerror") || message.includes("failed to fetch") || message.includes("network request failed")) {
    return "Network issue. Please check your connection and try again.";
  }
  if (message.includes("session expired") || message.includes("jwt") || message.includes("authorization")) {
    return "Your session expired. Please sign in again and retry.";
  }

  return fallback;
}

export function isIssueOwner(profile, issue) {
  if (!profile || !issue) return false;
  const actorVilla = profile.villa_number || profile.username;
  return Boolean(actorVilla && actorVilla === issue.reported_by_villa);
}

export function canViewIssuePhone(profile, issue) {
  if (!profile || !issue) return false;
  return profile.role === "admin" || profile.role === "superadmin" || isIssueOwner(profile, issue);
}

export function maskPhoneNumber(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function safeImageSrc(value) {
  const src = String(value || "").trim();
  if (!src) return "";

  const normalized = src.toLowerCase();
  if (
    normalized.startsWith("data:image/jpeg;base64,")
    || normalized.startsWith("data:image/png;base64,")
    || normalized.startsWith("data:image/webp;base64,")
    || normalized.startsWith("https://")
    || normalized.startsWith("http://")
    || normalized.startsWith("blob:")
    || normalized.startsWith("/")
  ) {
    return src;
  }

  return "";
}
