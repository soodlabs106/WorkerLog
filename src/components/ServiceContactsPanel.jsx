import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Phone, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { assertAllowedImageFile, buildOptimizedImageDataUrl } from "../lib/photos";
import { safeImageSrc } from "../lib/security";
import { Field, inputStyle } from "./Shared";

const ROLE_OPTIONS = ["Primary", "Secondary", "Other"];
const CUSTOM_SERVICE_SENTINEL = "__custom_service__";

function ContactAvatar({ name, photoUrl }) {
  const safePhotoUrl = safeImageSrc(photoUrl);

  if (safePhotoUrl) {
    return (
      <img
        src={safePhotoUrl}
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
      width: 46,
      height: 46,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--slate-bg)",
      color: "var(--slate)",
      fontWeight: 700,
      border: "1px solid var(--hairline)",
    }}>
      {initials}
    </div>
  );
}

function blankContact() {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    seed_key: "",
    service: "",
    role: "Primary",
    name: "",
    phone_number: "",
    photo_url: "",
    isNew: true,
  };
}

function overlayStyle() {
  return {
    position: "fixed",
    inset: 0,
    background: "rgba(24, 26, 22, 0.38)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 40,
  };
}

function modalCardStyle() {
  return {
    width: "100%",
    maxWidth: 420,
    maxHeight: "calc(100vh - 32px)",
    overflowY: "auto",
    background: "var(--card)",
    border: "1px solid var(--hairline)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 24px 48px rgba(24, 26, 22, 0.16)",
  };
}

function ContactModal({
  title,
  draftContact,
  setDraftContact,
  onClose,
  onConfirm,
  serviceOptions,
  localError,
  setLocalError,
}) {
  const [serviceChoice, setServiceChoice] = useState(() => (
    serviceOptions.includes(draftContact.service) ? draftContact.service : CUSTOM_SERVICE_SENTINEL
  ));

  useEffect(() => {
    setServiceChoice(serviceOptions.includes(draftContact.service) ? draftContact.service : CUSTOM_SERVICE_SENTINEL);
  }, [draftContact.service, serviceOptions]);

  async function handlePhotoUpload(file) {
    if (!file) return;

    try {
      assertAllowedImageFile(file, 2 * 1024 * 1024, "Service contact photo");
      const photoUrl = await buildOptimizedImageDataUrl(file, { maxDimension: 512, quality: 0.76 });
      setDraftContact((current) => ({ ...current, photo_url: photoUrl }));
      setLocalError("");
    } catch (error) {
      console.error("Could not process service contact photo", error);
      setLocalError(error.message || "Could not process that image.");
    }
  }

  return (
    <div style={overlayStyle()} onClick={onClose}>
      <div style={modalCardStyle()} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: "var(--f-display)", fontSize: 18 }}>{title}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
              Add or update the service type, role, phone number, and contact photo here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "1px solid var(--hairline)", background: "var(--paper)", color: "var(--ink-soft)", borderRadius: 8, padding: 8 }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Service type">
              <select
                value={serviceChoice}
                onChange={(e) => {
                  const next = e.target.value;
                  setServiceChoice(next);
                  if (next !== CUSTOM_SERVICE_SENTINEL) {
                    setDraftContact((current) => ({ ...current, service: next }));
                  }
                }}
                style={inputStyle}
              >
                {serviceOptions.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
                <option value={CUSTOM_SERVICE_SENTINEL}>Add new service type...</option>
              </select>
            </Field>
            <Field label="Role">
              <select
                value={draftContact.role}
                onChange={(e) => setDraftContact((current) => ({ ...current, role: e.target.value }))}
                style={inputStyle}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </Field>
          </div>

          {serviceChoice === CUSTOM_SERVICE_SENTINEL && (
            <Field label="New service type">
              <input
                value={draftContact.service}
                onChange={(e) => setDraftContact((current) => ({ ...current, service: e.target.value }))}
                placeholder="Security, Gardener, Housekeeping..."
                style={inputStyle}
              />
            </Field>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Name">
              <input
                value={draftContact.name}
                onChange={(e) => setDraftContact((current) => ({ ...current, name: e.target.value }))}
                placeholder="Shashi"
                style={inputStyle}
              />
            </Field>
            <Field label="Phone number">
              <input
                value={draftContact.phone_number}
                onChange={(e) => setDraftContact((current) => ({ ...current, phone_number: e.target.value }))}
                placeholder="9845183436"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Photo upload" hint="Upload a JPG, PNG, or WebP image up to 2 MB. SVG is blocked for safety.">
            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              border: "1px dashed var(--hairline)",
              borderRadius: 8,
              padding: "10px 12px",
              background: "#FCFBF7",
              color: "var(--ink-soft)",
              fontSize: 13,
              cursor: "pointer",
            }}>
              <Upload size={14} /> {draftContact.photo_url ? "Replace image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                style={{ display: "none" }}
              />
            </label>
          </Field>

          {draftContact.photo_url && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FCFBF7", border: "1px solid var(--hairline)", borderRadius: 10, padding: 10 }}>
              <ContactAvatar name={draftContact.name || draftContact.service || "?"} photoUrl={draftContact.photo_url} />
              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Photo preview</div>
            </div>
          )}
        </div>

        {localError && (
          <div style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            background: "var(--rust-bg)",
            color: "var(--rust)",
            padding: "9px 12px",
            borderRadius: 8,
            fontSize: 13,
            marginTop: 12,
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {localError}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "1px solid var(--hairline)", background: "var(--paper)", color: "var(--ink)", borderRadius: 8, padding: "10px 12px", fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ border: "none", background: "var(--ink)", color: "#F4F2E9", borderRadius: 8, padding: "10px 12px", fontWeight: 600 }}
          >
            Save contact
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServiceContactsPanel({ contacts, canEdit, onSave, saving, saveError, saveSuccess, serviceOptions }) {
  const [draft, setDraft] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [localError, setLocalError] = useState("");
  const [editingContact, setEditingContact] = useState(null);
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    setDraft(contacts.map((contact) => ({ ...contact, isNew: false })));
    setRemovedIds([]);
  }, [contacts]);

  const visibleContacts = useMemo(() => (
    draft.filter((contact) => serviceFilter === "all" || contact.service === serviceFilter)
  ), [draft, serviceFilter]);

  async function persistChanges(nextDraft, nextRemovedIds) {
    setLocalError("");
    await onSave({ contacts: nextDraft, removedIds: nextRemovedIds });
  }

  function openAddModal() {
    setEditingContact(blankContact());
    setLocalError("");
  }

  function openEditModal(contact) {
    setEditingContact({ ...contact });
    setLocalError("");
  }

  function closeModal() {
    setEditingContact(null);
  }

  async function confirmModal() {
    const normalized = {
      ...editingContact,
      service: editingContact.service.trim(),
      role: editingContact.role.trim(),
      name: editingContact.name.trim(),
      phone_number: editingContact.phone_number.trim(),
      photo_url: editingContact.photo_url?.trim() || "",
    };

    if (!normalized.service || !normalized.role || !normalized.name || !normalized.phone_number) {
      setLocalError("Add service type, role, name, and phone number before saving the contact.");
      return;
    }

    const nextDraft = draft.some((contact) => contact.id === normalized.id)
      ? draft.map((contact) => (contact.id === normalized.id ? normalized : contact))
      : [...draft, normalized];

    setDraft(nextDraft);
    setEditingContact(null);
    setLocalError("");
    await persistChanges(nextDraft, removedIds);
  }

  async function deleteContact(contact) {
    const nextDraft = draft.filter((entry) => entry.id !== contact.id);
    const nextRemovedIds = !contact.isNew && !String(contact.id).startsWith("new-")
      ? [...new Set([...removedIds, contact.id])]
      : removedIds;

    setDraft(nextDraft);
    setRemovedIds(nextRemovedIds);
    await persistChanges(nextDraft, nextRemovedIds);
  }

  async function handleSave() {
    setLocalError("");
    await onSave({ contacts: draft, removedIds });
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
        <div>
          <h3 style={{ fontFamily: "var(--f-display)", fontSize: 16, margin: 0 }}>Service contacts</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
            {canEdit ? "Admins can filter, add, edit, delete, and upload photos for service contacts here." : "Current service contacts for this community."}
          </p>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={openAddModal} type="button" style={{
              display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--hairline)", borderRadius: 8, padding: "10px 12px",
              background: "var(--card)", color: "var(--ink)", fontWeight: 600, fontSize: 13,
            }}>
              <Plus size={14} /> Add service
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

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>
        {["all", ...serviceOptions].map((service) => {
          const active = serviceFilter === service;
          return (
            <button
              key={service}
              type="button"
              onClick={() => setServiceFilter(service)}
              style={{
                border: active ? "1px solid var(--ink)" : "1px solid var(--hairline)",
                background: active ? "var(--ink)" : "var(--card)",
                color: active ? "#F4F2E9" : "var(--ink)",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {service === "all" ? "All services" : service}
            </button>
          );
        })}
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
        {visibleContacts.map((contact) => (
          <div key={contact.id} style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <ContactAvatar name={contact.name || contact.service || "?"} photoUrl={contact.photo_url} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{contact.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{contact.service} · {contact.role}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
                    <Phone size={13} /> {contact.phone_number}
                  </div>
                </div>
              </div>

              {canEdit && (
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <button
                    type="button"
                    onClick={() => openEditModal(contact)}
                    style={{ border: "1px solid var(--hairline)", background: "var(--paper)", color: "var(--ink)", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteContact(contact)}
                    style={{ border: "1px solid #E3C8C2", background: "#FFF7F5", color: "var(--rust)", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {visibleContacts.length === 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, padding: 16, textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>
          No contacts found for this service filter yet.
        </div>
      )}

      {editingContact && (
        <ContactModal
          title={editingContact.isNew ? "Add service contact" : "Edit service contact"}
          draftContact={editingContact}
          setDraftContact={setEditingContact}
          onClose={closeModal}
          onConfirm={confirmModal}
          serviceOptions={serviceOptions}
          localError={localError}
          setLocalError={setLocalError}
        />
      )}
    </section>
  );
}
