import React, { useEffect, useState } from "react";
import { AlertTriangle, Phone, Save } from "lucide-react";
import { Field, inputStyle } from "./Shared";

function ContactAvatar({ name, photoUrl }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", border: "1px solid var(--hairline)" }}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div style={{
      width: 46, height: 46, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--slate-bg)", color: "var(--slate)", fontWeight: 700, border: "1px solid var(--hairline)",
    }}>
      {initials}
    </div>
  );
}

export default function ServiceContactsPanel({ contacts, canEdit, onSave, saving, saveError, saveSuccess }) {
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    setDraft(contacts);
  }, [contacts]);

  function updateContact(id, key, value) {
    setDraft((current) => current.map((contact) => (contact.id === id ? { ...contact, [key]: value } : contact)));
  }

  async function handleSave() {
    await onSave(draft);
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <h3 style={{ fontFamily: "var(--f-display)", fontSize: 16, margin: 0 }}>Service contacts</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
            {canEdit ? "Admins can update names, phone numbers, and photo URLs here." : "Current service contacts for this community."}
          </p>
        </div>
        {canEdit && (
          <button onClick={handleSave} disabled={saving} style={{
            display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, padding: "10px 12px",
            background: "var(--ink)", color: "#F4F2E9", fontWeight: 600, fontSize: 13, opacity: saving ? 0.65 : 1,
          }}>
            <Save size={14} /> {saving ? "Saving..." : "Save contacts"}
          </button>
        )}
      </div>

      {saveError && (
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-start", background: "var(--rust-bg)", color: "var(--rust)",
          padding: "9px 12px", borderRadius: 8, fontSize: 13, marginBottom: 10,
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div style={{
          background: "var(--moss-bg)", color: "var(--moss)", padding: "9px 12px",
          borderRadius: 8, fontSize: 13, marginBottom: 10,
        }}>
          {saveSuccess}
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {draft.map((contact) => (
          <div key={contact.id} style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <ContactAvatar name={contact.name} photoUrl={contact.photo_url} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{contact.service}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{contact.role}</div>
              </div>
            </div>

            {canEdit ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Name">
                    <input value={contact.name} onChange={(e) => updateContact(contact.id, "name", e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Phone">
                    <input value={contact.phone_number} onChange={(e) => updateContact(contact.id, "phone_number", e.target.value)} style={inputStyle} />
                  </Field>
                </div>
                <Field label="Photo URL">
                  <input
                    value={contact.photo_url || ""}
                    onChange={(e) => updateContact(contact.id, "photo_url", e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </Field>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 13, color: "var(--ink-soft)" }}>
                <span>{contact.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={13} /> {contact.phone_number}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
