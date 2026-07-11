import React from "react";
import ServiceContactsPanel from "./ServiceContactsPanel";
import { canResetPasswords } from "../lib/profiles";

function roleLabel(role) {
  if (role === "superadmin") return "Super admin";
  if (role === "admin") return "Admin";
  return "Villa";
}

function UserDirectory({ rows, onResetPassword, resettingUsername }) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ fontFamily: "var(--f-display)", fontSize: 16, margin: 0 }}>Accounts and residents</h3>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
          Reset sends the selected account back to its default password, which matches the username.
        </p>
      </div>

      <div style={{ overflowX: "auto", background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#F7F5EE" }}>
              <th style={{ padding: 10, borderBottom: "1px solid var(--hairline)" }}>Account</th>
              <th style={{ padding: 10, borderBottom: "1px solid var(--hairline)" }}>Role</th>
              <th style={{ padding: 10, borderBottom: "1px solid var(--hairline)" }}>Residents</th>
              <th style={{ padding: 10, borderBottom: "1px solid var(--hairline)" }}>Phones</th>
              <th style={{ padding: 10, borderBottom: "1px solid var(--hairline)" }}>Reset</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.username}>
                <td style={{ padding: 10, borderBottom: "1px solid var(--hairline)", minWidth: 150 }}>
                  <div style={{ fontWeight: 600 }}>{row.label}</div>
                  <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>{row.username}</div>
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid var(--hairline)" }}>{roleLabel(row.role)}</td>
                <td style={{ padding: 10, borderBottom: "1px solid var(--hairline)", minWidth: 180 }}>{row.residentNames || "-"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid var(--hairline)", minWidth: 180 }}>{row.residentPhones || "-"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid var(--hairline)" }}>
                  {row.role === "superadmin" ? (
                    <span style={{ color: "var(--ink-soft)" }}>Locked</span>
                  ) : (
                    <button
                      onClick={() => onResetPassword(row.username)}
                      disabled={resettingUsername === row.username}
                      style={{
                        border: "1px solid var(--hairline)", borderRadius: 8, padding: "8px 10px",
                        background: "var(--paper)", color: "var(--ink)", fontWeight: 600, fontSize: 12,
                      }}
                    >
                      {resettingUsername === row.username ? "Resetting..." : "Reset password"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminTab({
  profile,
  contacts,
  serviceOptions,
  onSaveContacts,
  savingContacts,
  contactSaveError,
  contactSaveSuccess,
  rows,
  onResetPassword,
  resettingUsername,
}) {
  return (
    <div>
      <ServiceContactsPanel
        contacts={contacts}
        canEdit
        serviceOptions={serviceOptions}
        onSave={onSaveContacts}
        saving={savingContacts}
        saveError={contactSaveError}
        saveSuccess={contactSaveSuccess}
      />

      {canResetPasswords(profile) && (
        <UserDirectory rows={rows} onResetPassword={onResetPassword} resettingUsername={resettingUsername} />
      )}
    </div>
  );
}
