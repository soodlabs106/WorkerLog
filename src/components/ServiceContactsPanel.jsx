import React, { useEffect, useState } from "react";
import { AlertTriangle, Phone, Plus, Save, Upload } from "lucide-react";
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

function blankContact() {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    service: "",
    role: "Primary",
    name: "",
    phone_number: "",
    photo_url: "",
    isNew: true,
  };
}

export default function ServiceContactsPanel({ contacts, canEdit, onSave, saving, saveError, saveSuccess }) {
  const [draft, setDraft] = useState([]);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setDraft(contacts.map((contact) => ({ ...contact, isNew: false })));
  }, [contacts]);

  function updateContact(id, key, value) {
    setDraft((current) => current.map((contact) => (contact.id === id ? { ...contact, [key]: value } : contact)));
  }

  function addContact() {
    setDraft((current) => [...current, blankContact()]);
  }

  async function handlePhotoUpload(id, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateContact(id, "photo_url", String(reader.result || ""));
      setLocalError("");
    };
    reader.onerror = () => {
      setLocalError("Could not read that image file.");
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setLocalError("");
    await onSave(draft);
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
        <div>
          <h3 style={{ fontFamily: "var(--f-display)", fontSize: 16, margin: 0 }}>Service contacts</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
            {canEdit ? "Admins can add contacts, update names, phone numbers, and upload contact photos here." : "Current service contacts for this community."}
          </p>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addContact} type="button" style={{
              display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--hairline)", borderRadius: 8, padding: "10px 12px",
              background: "var(--card)", color: "var(--ink)", fontWeight: 600, fontSize: 13,
            }}>
              <Plus size={14} /> Add contact
            </button>
            <button onClick={handleSave} disabled={saving} type="button" style={{
              display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, padding: "10px 12px",
              background: "var(--ink)", color: "#F4F2E9", fontWeight: 600, fontSize: 13, opacity: saving ? 0.65 : 1,
            }}>
              <Save size={14} /> {saving ? "Saving..." : "Save contacts"}
            </button>
          </div>
        )}
      </div>

      {(saveError || localError) && (
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-start", background: "var(--rust-bg)", color: "var(--rust)",
          padding: "9px 12px", borderRadius: 8, fontSize: 13, marginBottom: 10,
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {saveError || localError}
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
              <ContactAvatar name={contact.name || contact.service || "?"} photoUrl={contact.photo_url} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{contact.service || "New contact"}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{contact.role || "Role"}</div>
              </div>
            </div>

            {canEdit ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Service">
                    <input value={contact.service} onChange={(e) => updateContact(contact.id, "service", e.target.value)} placeholder="Electrician" style={inputStyle} />
                  </Field>
                  <Field label="Role">
                    <input value={contact.role} onChange={(e) => updateContact(contact.id, "role", e.target.value)} placeholder="Primary" style={inputStyle} />
                  </Field>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Name">
                    <input value={contact.name} onChange={(e) => updateContact(contact.id, "name", e.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Phone">
                    <input value={contact.phone_number} onChange={(e) => updateContact(contact.id, "phone_number", e.target.value)} style={inputStyle} />
                  </Field>
                </div>

                <Field label="Photo upload">
                  <label style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px dashed var(--hairline)",
                    borderRadius: 8, padding: "10px 12px", background: "#FCFBF7", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer",
                  }}>
                    <Upload size={14} /> {contact.photo_url ? "Replace image" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(contact.id, e.target.files?.[0])}
                      style={{ display: "none" }}
                    />
                  </label>
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
