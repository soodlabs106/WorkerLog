import React from "react";
import { AlertTriangle, ChevronRight, Copy, ImagePlus, Phone, RotateCcw, X } from "lucide-react";
import { CATEGORIES, URGENCY } from "../lib/format";
import { photoKey, photoThumbSrc } from "../lib/photos";
import { VILLAS, villaLabel } from "../lib/villas";
import { Field, inputStyle } from "./Shared";

function ContactCard({ contact }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 10,
      padding: "10px 12px", display: "flex", gap: 10, alignItems: "center", minHeight: 92,
    }}>
      {contact.photo_url ? (
        <img
          src={contact.photo_url}
          alt={contact.name}
          style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", border: "1px solid var(--hairline)" }}
        />
      ) : (
        <div style={{
          width: 42, height: 42, borderRadius: 10, background: "var(--slate-bg)", color: "var(--slate)",
          display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, border: "1px solid var(--hairline)",
        }}>
          {(contact.name || "?").slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{contact.role}</div>
        <div style={{ fontSize: 13 }}>{contact.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-soft)" }}>
          <Phone size={12} /> {contact.phone_number}
        </div>
      </div>
    </div>
  );
}

export default function NewIssueForm({
  form,
  setForm,
  onSubmit,
  error,
  submitting,
  residents,
  serviceContacts,
  matchedServiceName,
  onCopyMessage,
  copyingMessage,
  onResetForm,
  onPhotoChange,
  onPhotoRemove,
  canUseResidentList,
}) {
  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));
  const usingGuest = form.reporterChoice === "__guest__";

  function handleResidentChange(e) {
    const value = e.target.value;
    if (value === "__guest__") {
      setForm((current) => ({ ...current, reporterChoice: value, reporterName: "", reporterPhone: "" }));
      return;
    }

    const resident = residents.find((row) => row.id === Number(value));
    setForm((current) => ({
      ...current,
      reporterChoice: value,
      reporterName: resident?.name || "",
      reporterPhone: resident?.phone || "",
    }));
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="Type of issue">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
          {CATEGORIES.map(({ key, label, Icon }) => {
            const active = form.category === key;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setForm((current) => ({ ...current, category: key }))}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, minHeight: 58,
                  padding: "6px 4px", borderRadius: 8, border: active ? "1.5px solid var(--brass)" : "1px solid var(--hairline)",
                  background: active ? "#F3EBD6" : "var(--card)", color: "var(--ink)",
                }}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span style={{ fontSize: 11, textAlign: "center", lineHeight: 1.15 }}>{label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      {matchedServiceName && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Suggested contacts: {matchedServiceName}</div>
          {serviceContacts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {serviceContacts.map((contact) => <ContactCard key={contact.id} contact={contact} />)}
            </div>
          ) : (
            <div style={{
              background: "var(--card)", border: "1px dashed var(--hairline)", borderRadius: 10,
              padding: "12px", fontSize: 12, color: "var(--ink-soft)",
            }}>
              No contacts have been added for this service yet.
            </div>
          )}
        </div>
      )}

      <Field label="Urgency">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
          {URGENCY.map((urgency) => {
            const active = form.urgency === urgency.key;
            return (
              <button
                type="button"
                key={urgency.key}
                onClick={() => setForm((current) => ({ ...current, urgency: urgency.key }))}
                style={{
                  display: "flex", flexDirection: "column", gap: 2, padding: "8px 6px", minHeight: 62, borderRadius: 8,
                  border: active ? `1.5px solid ${urgency.color}` : "1px solid var(--hairline)",
                  background: active ? urgency.bg : "var(--card)", textAlign: "left",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 12, color: active ? urgency.color : "var(--ink)" }}>{urgency.label}</span>
                <span style={{ fontSize: 10, color: "var(--ink-soft)", lineHeight: 1.2 }}>{urgency.hint}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Describe the issue">
        <textarea
          rows={3}
          placeholder="Kitchen tap will not shut off, leaking onto the floor"
          value={form.description}
          onChange={set("description")}
          style={{ ...inputStyle, resize: "vertical", minHeight: 92 }}
        />
      </Field>

      <Field label="Photos" hint="You can add multiple photos. Each photo must be 3 MB or smaller.">
        <label style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px dashed var(--hairline)",
          borderRadius: 8, padding: "12px", background: "#FCFBF7", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer",
        }}>
          <ImagePlus size={15} /> Add photos
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              onPhotoChange(e.target.files);
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />
        </label>

        {form.issuePhotos?.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
            {form.issuePhotos.map((photo, index) => (
              <div key={photoKey(photo, index)} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--hairline)", background: "var(--card)" }}>
                <img src={photoThumbSrc(photo)} alt={`Issue upload ${index + 1}`} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => onPhotoRemove(index)}
                  style={{
                    position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 999,
                    border: "none", background: "rgba(32,42,34,0.82)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Villa" hint="Change this for a common area issue">
          <select value={form.location} onChange={set("location")} style={inputStyle}>
            {VILLAS.map((villa) => (
              <option key={villa} value={villa}>{villaLabel(villa)}</option>
            ))}
            <option value="common-area">Common area</option>
          </select>
        </Field>

        <Field label="Reporter">
          {canUseResidentList ? (
            <select value={form.reporterChoice} onChange={handleResidentChange} style={inputStyle}>
              {residents.map((resident) => (
                <option key={resident.id} value={resident.id}>{resident.name}</option>
              ))}
              <option value="__guest__">Someone else</option>
            </select>
          ) : (
            <input value={form.reporterName} onChange={set("reporterName")} placeholder="Reporter name" style={inputStyle} />
          )}
        </Field>
      </div>

      {usingGuest && canUseResidentList && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Guest name">
            <input placeholder="Guest name" value={form.reporterName} onChange={set("reporterName")} style={inputStyle} />
          </Field>
          <Field label="WhatsApp number">
            <input placeholder="9876543210" value={form.reporterPhone} onChange={set("reporterPhone")} style={inputStyle} />
          </Field>
        </div>
      )}

      {!canUseResidentList && (
        <Field label="Contact phone">
          <input placeholder="9845000000" value={form.reporterPhone} onChange={set("reporterPhone")} style={inputStyle} />
        </Field>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={onCopyMessage}
          disabled={copyingMessage}
          style={{
            padding: "11px 12px", background: "var(--card)", color: "var(--ink)", border: "1px solid var(--hairline)",
            borderRadius: 8, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Copy size={15} /> {copyingMessage ? "Copying..." : "Create message"}
        </button>
        <button
          type="button"
          onClick={onResetForm}
          style={{
            padding: "11px 12px", background: "var(--card)", color: "var(--ink-soft)", border: "1px solid var(--hairline)",
            borderRadius: 8, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <RotateCcw size={15} /> Reset form
        </button>
      </div>

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "var(--rust-bg)", color: "var(--rust)", padding: "9px 12px", borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting} style={{
        width: "100%", padding: "12px", background: "var(--ink)", color: "#F4F2E9",
        border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        opacity: submitting ? 0.6 : 1,
      }}>
        {submitting ? "Raising ticket..." : "Raise ticket"} <ChevronRight size={16} />
      </button>
    </form>
  );
}
