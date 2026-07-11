import React from "react";

export function NavButton({ icon: Icon, label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, background: "none", border: "none",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "6px 4px", color: active ? "var(--ink)" : "var(--ink-soft)", position: "relative",
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
      <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{label}</span>
      {badge > 0 && (
        <span style={{
          position: "absolute", top: 0, right: "28%", background: "var(--rust)", color: "#fff",
          fontSize: 10, fontFamily: "var(--f-mono)", borderRadius: 999, minWidth: 16, height: 16,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
        }}>{badge}</span>
      )}
    </button>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--ink)" }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>{hint}</div>}
    </label>
  );
}

export const inputStyle = {
  width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 6,
  border: "1px solid var(--hairline)", background: "#FCFBF7", color: "var(--ink)",
};

export function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 22 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
