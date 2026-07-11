import React, { useState } from "react";
import { Users, Plus, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { Field, inputStyle } from "./Shared";

export default function AddResidentsGate({ villaId, villaLabel, onDone }) {
  const [rows, setRows] = useState([{ name: "", phone: "" }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateRow(i, key, value) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { name: "", phone: "" }]);
  }
  function removeRow(i) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const cleaned = rows
      .map((r) => ({ name: r.name.trim(), phone: r.phone.trim() }))
      .filter((r) => r.name);

    if (cleaned.length === 0) {
      setError("Add at least one resident's name.");
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from("residents").insert(
      cleaned.map((r) => ({ villa_number: villaId, name: r.name, phone: r.phone || null }))
    );
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    await onDone();
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <Users size={28} color="var(--brass)" />
        </div>
        <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 20, margin: "0 0 4px", textAlign: "center" }}>
          Who lives at {villaLabel}?
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", textAlign: "center", margin: "0 0 20px" }}>
          Add household members once — this fills in the reporter details automatically next time you raise an issue.
        </p>

        <form onSubmit={handleSubmit} style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, padding: "20px 18px" }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label={i === 0 ? "Name" : ""}>
                  <input value={row.name} onChange={(e) => updateRow(i, "name", e.target.value)} placeholder="Asha Menon" style={inputStyle} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label={i === 0 ? "WhatsApp number" : ""}>
                  <input value={row.phone} onChange={(e) => updateRow(i, "phone", e.target.value)} placeholder="9876543210" style={inputStyle} />
                </Field>
              </div>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} style={{
                  background: "none", border: "none", color: "var(--rust)", padding: "10px 0 22px",
                }} aria-label="Remove resident">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={addRow} style={{
            display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px dashed var(--hairline)",
            borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "var(--ink-soft)", width: "100%",
            justifyContent: "center", marginBottom: 16,
          }}>
            <Plus size={14} /> Add another resident
          </button>

          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "var(--rust-bg)", color: "var(--rust)", padding: "9px 12px", borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            width: "100%", padding: "13px", background: "var(--ink)", color: "#F4F2E9",
            border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, opacity: submitting ? 0.6 : 1,
          }}>
            {submitting ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
