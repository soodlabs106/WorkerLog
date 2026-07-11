import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { StatCard } from "./Shared";

export default function Dashboard({ total, openCount, overallAvgHours, monthly, avgFixByType }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
        <StatCard label="Total tickets" value={total} />
        <StatCard label="Open now" value={openCount} />
        <StatCard label="Avg fix time" value={overallAvgHours !== null ? `${overallAvgHours}h` : "—"} sub={overallAvgHours === null ? "no closures yet" : undefined} />
      </div>

      <h3 style={{ fontFamily: "var(--f-display)", fontSize: 14, margin: "0 0 8px" }}>Tickets raised by month</h3>
      <div style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "12px 8px 4px", marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={{ stroke: "var(--hairline)" }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--hairline)" }} />
            <Bar dataKey="count" fill="#8A6A24" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 style={{ fontFamily: "var(--f-display)", fontSize: 14, margin: "0 0 8px" }}>Average fix time by issue type</h3>
      <div style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "12px 8px 4px" }}>
        {avgFixByType.length === 0 ? (
          <div style={{ padding: "24px 12px", textAlign: "center", fontSize: 13, color: "var(--ink-soft)" }}>
            Resolve a few tickets to see this breakdown.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(140, avgFixByType.length * 42)}>
            <BarChart data={avgFixByType} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={{ stroke: "var(--hairline)" }} tickLine={false} unit="h" />
              <YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 11, fill: "var(--ink)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n, p) => [`${v}h avg (${p.payload.n} closed)`, "Fix time"]} contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--hairline)" }} />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {avgFixByType.map((d) => <Cell key={d.key} fill="#3E5A82" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
