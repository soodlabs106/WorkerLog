import React from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { CATEGORIES, URGENCY } from "../lib/format";
import { VILLAS, villaLabel } from "../lib/villas";
import { Field, inputStyle } from "./Shared";

export default function NewIssueForm({ form, setForm, onSubmit, error, submitting, residents }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const usingGuest = form.reporterChoice === "__guest__";

  function handleResidentChange(e) {
    const value = e.target.value;
    if (value === "__guest__") {
      setForm((f) => ({ ...f, reporterChoice: value, reporterName: "", reporterPhone: "" }));
      return;
    }
    const resident = residents.find((r) => r.id === Number(value));
    setForm((f) => ({
      ...f,
      reporterChoice: value,
      reporterName: resident?.name || "",
      reporterPhone: resident?.phone || "",
    }));
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="Type of issue">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {CATEGORIES.map(({ key, label, Icon }) => {
            const active = form.category === key;
            return (
              <button type="button" key={key} onClick={() => setForm((f) => ({ ...f, category: key }))}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  padding: "10px 4px", borderRadius: 8,
                  border: active ? "1.5px solid var(--brass)" : "1px solid var(--hairline)",
                  background: active ? "#F3EBD6" : "var(--card)", color: "var(--ink)",
                }}>
                <Icon size={18} strokeWidth={1.8} />
                <span style={{ fontSize: 11, textAlign: "center" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Urgency">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {URGENCY.map((u) => {
            const active = form.urgency === u.key;
            return (
              <button type="button" key={u.key} onClick={() => setForm((f) => ({ ...f, urgency: u.key }))}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px", borderRadius: 6, textAlign: "left",
                  border: active ? `1.5px solid ${u.color}` : "1px solid var(--hairline)",
                  background: active ? u.bg : "var(--card)",
                }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: active ? u.color : "var(--ink)" }}>{u.label}</span>
                <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{u.hint}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Describe the issue">
        <textarea rows={3} placeholder="Kitchen tap won't shut off, leaking onto the floor"
          value={form.description} onChange={set("description")} style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      <Field label="Villa" hint="Defaults to your villa - change it if you're reporting for a common area or another villa">
        <select value={form.location} onChange={set("location")} style={inputStyle}>
          {VILLAS.map((v) => (
            <option key={v} value={v}>{villaLabel(v)}</option>
          ))}
          <option value="common-area">Common area</option>
        </select>
      </Field>

      <Field label="Reporter">
        <select value={form.reporterChoice} onChange={handleResidentChange} style={inputStyle}>
          {residents.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
          <option value="__guest__">Someone else / guest</option>
        </select>
      </Field>

      {usingGuest && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Name">
            <input placeholder="Guest name" value={form.reporterName} onChange={set("reporterName")} style={inputStyle} />
          </Field>
          <Field label="WhatsApp number">
            <input placeholder="9876543210" value={form.reporterPhone} onChange={set("reporterPhone")} style={inputStyle} />
          </Field>
        </div>
      )}

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "var(--rust-bg)", color: "var(--rust)", padding: "9px 12px", borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} style={{
        width: "100%", padding: "13px", background: "var(--ink)", color: "#F4F2E9",
        border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        opacity: submitting ? 0.6 : 1,
      }}>
        {submitting ? "Raising ticket…" : "Raise ticket"} <ChevronRight size={16} />
      </button>
    </form>
  );
}
