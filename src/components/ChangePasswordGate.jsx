import React, { useState } from "react";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { toUserErrorMessage } from "../lib/security";
import { Field, inputStyle } from "./Shared";

export default function ChangePasswordGate({ villaLabel, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      console.error("Could not update password", updateError);
      setError(toUserErrorMessage(updateError, "Could not update your password right now. Please try again."));
      return;
    }
    await onDone();
    setSubmitting(false);
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <ShieldCheck size={28} color="var(--brass)" />
        </div>
        <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 20, margin: "0 0 4px", textAlign: "center" }}>
          Set your password
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", textAlign: "center", margin: "0 0 20px" }}>
          {villaLabel} — first login. Choose a password only your household knows.
        </p>

        <form onSubmit={handleSubmit} style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, padding: "20px 18px" }}>
          <Field label="New password">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" style={inputStyle} />
          </Field>
          <Field label="Confirm password">
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Retype it" style={inputStyle} />
          </Field>

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
            {submitting ? "Saving…" : "Save password and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
