import React, { useState } from "react";
import { LogIn, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { villaToEmail, normalizeVillaInput } from "../lib/auth";
import { Field, inputStyle } from "./Shared";

export default function Login() {
  const [villaInput, setVillaInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const villaId = normalizeVillaInput(villaInput);
    if (!villaId) {
      setError("Enter your villa number, e.g. 106.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: villaToEmail(villaId),
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError("Villa number or password doesn't match. Check with whoever manages the register if you're not sure.");
    }
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: "0.12em", color: "var(--brass)", textTransform: "uppercase", textAlign: "center" }}>
          Community maintenance
        </div>
        <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 26, margin: "4px 0 20px", textAlign: "center" }}>
          The Colony Register
        </h1>

        <form onSubmit={handleSubmit} style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, padding: "20px 18px" }}>
          <Field label="Villa number" hint="e.g. 106, or villa-106">
            <input
              value={villaInput}
              onChange={(e) => setVillaInput(e.target.value)}
              placeholder="106"
              autoCapitalize="none"
              style={inputStyle}
            />
          </Field>
          <Field label="Password" hint="Default is your villa id, e.g. villa-106">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </Field>

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
            {submitting ? "Signing in…" : "Sign in"} <LogIn size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
