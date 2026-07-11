import React, { useState } from "react";
import { LogIn, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { accountToEmail, normalizeLoginInput } from "../lib/auth";
import { Field, inputStyle } from "./Shared";

export default function Login() {
  const [accountInput, setAccountInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const username = normalizeLoginInput(accountInput);
    if (!username) {
      setError("Enter your villa number or account name.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: accountToEmail(username),
      password,
    });
    setSubmitting(false);

    if (signInError) {
      setError("Account name or password does not match. Check with whoever manages the register if you are not sure.");
    }
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <img
            src="/brand/em2-resolve-logo-corrected.png"
            alt="EM2 Resolve"
            style={{ width: 126, height: "auto" }}
          />
        </div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: "0.12em", color: "var(--brass)", textTransform: "uppercase", textAlign: "center" }}>
          Community maintenance
        </div>
        <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 26, margin: "4px 0 20px", textAlign: "center" }}>
          EM2 Resolve
        </h1>

        <form onSubmit={handleSubmit} style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, padding: "20px 18px" }}>
          <Field label="Account" hint="Use 106, villa-106, FacilityManager, or superadmin">
            <input
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
              placeholder="106 or FacilityManager"
              autoCapitalize="none"
              style={inputStyle}
            />
          </Field>

          <Field label="Password" hint="Villa defaults to the villa id, e.g. villa-106">
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
            {submitting ? "Signing in..." : "Sign in"} <LogIn size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
