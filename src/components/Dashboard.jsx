import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { StatCard } from "./Shared";
import { CATEGORIES } from "../lib/format";

function monthValue(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function monthLabelFromValue(value) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function Dashboard({ issues }) {
  const monthOptions = useMemo(() => {
    const values = Array.from(new Set(issues.map((issue) => monthValue(issue.created_at))));
    return values.sort((a, b) => b.localeCompare(a));
  }, [issues]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (monthOptions.length && !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[0]);
    }
  }, [monthOptions, selectedMonth]);

  const filteredIssues = useMemo(() => (
    issues.filter((issue) => {
      const monthMatch = selectedMonth ? monthValue(issue.created_at) === selectedMonth : true;
      const categoryMatch = selectedCategory === "all" ? true : issue.category === selectedCategory;
      return monthMatch && categoryMatch;
    })
  ), [issues, selectedCategory, selectedMonth]);

  const total = filteredIssues.length;
  const openCount = filteredIssues.filter((issue) => issue.status !== "resolved").length;
  const resolvedIssues = filteredIssues.filter((issue) => issue.status === "resolved");
  const overallAvgHours = resolvedIssues.length
    ? Math.round((resolvedIssues.reduce((sum, issue) => sum + (new Date(issue.resolved_at) - new Date(issue.created_at)), 0) / resolvedIssues.length / 3600000) * 10) / 10
    : null;

  const dailyStatus = useMemo(() => {
    if (!selectedMonth) return [];

    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map();

    for (let day = 1; day <= daysInMonth; day += 1) {
      map.set(day, { day: String(day).padStart(2, "0"), open: 0, resolved: 0 });
    }

    filteredIssues.forEach((issue) => {
      const bucket = map.get(new Date(issue.created_at).getDate());
      if (!bucket) return;
      if (issue.status === "resolved") {
        bucket.resolved += 1;
      } else {
        bucket.open += 1;
      }
    });

    return Array.from(map.values());
  }, [filteredIssues, selectedMonth]);

  const avgFixByType = useMemo(() => {
    const sums = {};
    CATEGORIES.forEach((category) => {
      sums[category.key] = { total: 0, count: 0 };
    });

    resolvedIssues.forEach((issue) => {
      const hours = (new Date(issue.resolved_at) - new Date(issue.created_at)) / 3600000;
      if (!sums[issue.category]) sums[issue.category] = { total: 0, count: 0 };
      sums[issue.category].total += hours;
      sums[issue.category].count += 1;
    });

    return CATEGORIES.map((category) => ({
      name: category.label,
      key: category.key,
      hours: sums[category.key].count ? Math.round((sums[category.key].total / sums[category.key].count) * 10) / 10 : 0,
      n: sums[category.key].count,
    })).filter((entry) => entry.n > 0);
  }, [resolvedIssues]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <label style={{ display: "block" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>Month</div>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: "100%", padding: "9px 11px", fontSize: 14, borderRadius: 6, border: "1px solid var(--hairline)", background: "#FCFBF7", color: "var(--ink)" }}>
            {monthOptions.map((value) => (
              <option key={value} value={value}>{monthLabelFromValue(value)}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "block" }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>Service type</div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ width: "100%", padding: "9px 11px", fontSize: 14, borderRadius: 6, border: "1px solid var(--hairline)", background: "#FCFBF7", color: "var(--ink)" }}>
            <option value="all">All services</option>
            {CATEGORIES.map((category) => (
              <option key={category.key} value={category.key}>{category.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
        <StatCard label="Total tickets" value={total} />
        <StatCard label="Open now" value={openCount} />
        <StatCard label="Avg fix time" value={overallAvgHours !== null ? `${overallAvgHours}h` : "-"} sub={overallAvgHours === null ? "no closures yet" : undefined} />
      </div>

      <h3 style={{ fontFamily: "var(--f-display)", fontSize: 14, margin: "0 0 8px" }}>Tickets raised by day</h3>
      <div style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "12px 8px 4px", marginBottom: 20 }}>
        {dailyStatus.every((entry) => entry.open === 0 && entry.resolved === 0) ? (
          <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 13, color: "var(--ink-soft)" }}>
            No tickets found for this filter.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyStatus} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={{ stroke: "var(--hairline)" }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--hairline)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="open" name="Open" stackId="tickets" fill="#B45B4E" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="resolved" name="Resolved" stackId="tickets" fill="#567A5E" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <h3 style={{ fontFamily: "var(--f-display)", fontSize: 14, margin: "0 0 8px" }}>Average fix time by issue type</h3>
      <div style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "12px 8px 4px" }}>
        {avgFixByType.length === 0 ? (
          <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 13, color: "var(--ink-soft)" }}>
            Resolve a few tickets in this filter to see the breakdown.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(140, avgFixByType.length * 42)}>
            <BarChart data={avgFixByType} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={{ stroke: "var(--hairline)" }} tickLine={false} unit="h" />
              <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 11, fill: "var(--ink)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n, p) => [`${v}h avg (${p.payload.n} closed)`, "Fix time"]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--hairline)" }} />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {avgFixByType.map((entry) => <Cell key={entry.key} fill={entry.key === selectedCategory ? "#8A6A24" : "#3E5A82"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
