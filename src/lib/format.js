import React from "react";
import { Wrench, Zap, HelpCircle } from "lucide-react";

export function SnakeIcon({ size = 16, strokeWidth = 1.8, ...props }) {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      width: size,
      height: size,
      stroke: "currentColor",
      strokeWidth,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      ...props,
    },
    React.createElement("path", { d: "M6 6c0-1.7 1.3-3 3-3s3 1.3 3 3v5c0 1.7 1.3 3 3 3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3" }),
    React.createElement("path", { d: "M9 7h3" }),
    React.createElement("path", { d: "M15.5 18h.01" }),
    React.createElement("path", { d: "M18 18h.01" })
  );
}

export const CATEGORIES = [
  { key: "plumbing", label: "Plumbing", Icon: Wrench },
  { key: "electrical", label: "Electrical", Icon: Zap },
  { key: "pest", label: "Snake", Icon: SnakeIcon },
  { key: "general", label: "General", Icon: HelpCircle },
];

export const URGENCY = [
  { key: "emergency", label: "Emergency", color: "var(--rust)", bg: "var(--rust-bg)", hint: "Active danger - attend now" },
  { key: "high", label: "High", color: "var(--amber)", bg: "var(--amber-bg)", hint: "Fix within a few hours" },
  { key: "medium", label: "Medium", color: "var(--slate)", bg: "var(--slate-bg)", hint: "Fix today or tomorrow" },
  { key: "low", label: "Low", color: "var(--moss)", bg: "var(--moss-bg)", hint: "No rush, whenever convenient" },
];

export const SERVICE_BY_CATEGORY = {
  plumbing: "Plumber",
  electrical: "Electrician",
  pest: "Snake Catcher",
  general: null,
};

export const urgencyRank = { emergency: 0, high: 1, medium: 2, low: 3 };

export function catInfo(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

export function urgInfo(key) {
  return URGENCY.find((u) => u.key === key) || URGENCY[2];
}

export function serviceForCategory(key) {
  return SERVICE_BY_CATEGORY[key] || null;
}

export function serviceRoleRank(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "primary") return 0;
  if (normalized === "secondary") return 1;
  return 2;
}

export function sortServiceContacts(contacts) {
  return [...contacts].sort((a, b) => {
    const roleDiff = serviceRoleRank(a.role) - serviceRoleRank(b.role);
    if (roleDiff !== 0) return roleDiff;

    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;

    return `${a.name || ""}`.localeCompare(`${b.name || ""}`);
  });
}

export function ticketNo(id) {
  return "#" + String(id).padStart(4, "0");
}

export function formatElapsed(ms) {
  if (ms < 0) ms = 0;
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function monthLabel(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}
