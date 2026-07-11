import { Wrench, Zap, Bug, Hammer, HelpCircle } from "lucide-react";

export const CATEGORIES = [
  { key: "plumbing", label: "Plumbing", Icon: Wrench },
  { key: "electrical", label: "Electrical", Icon: Zap },
  { key: "pest", label: "Snake / pest", Icon: Bug },
  { key: "carpentry", label: "Carpentry", Icon: Hammer },
  { key: "general", label: "General", Icon: HelpCircle },
];

export const URGENCY = [
  { key: "emergency", label: "Emergency", color: "var(--rust)", bg: "var(--rust-bg)", hint: "Active danger — attend now" },
  { key: "high", label: "High", color: "var(--amber)", bg: "var(--amber-bg)", hint: "Fix within a few hours" },
  { key: "medium", label: "Medium", color: "var(--slate)", bg: "var(--slate-bg)", hint: "Fix today or tomorrow" },
  { key: "low", label: "Low", color: "var(--moss)", bg: "var(--moss-bg)", hint: "No rush, whenever convenient" },
];

export const urgencyRank = { emergency: 0, high: 1, medium: 2, low: 3 };

export function catInfo(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[4];
}

export function urgInfo(key) {
  return URGENCY.find((u) => u.key === key) || URGENCY[2];
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
