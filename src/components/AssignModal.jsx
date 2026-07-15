import React from "react";
import { X } from "lucide-react";
import { ticketNo } from "../lib/format";
import { Field, inputStyle } from "./Shared";

export default function AssignModal({
  issue,
  contacts,
  selectedContactId,
  setSelectedContactId,
  error,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(32,42,34,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 40,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--card)",
          width: "100%",
          maxWidth: 480,
          borderRadius: "16px 16px 0 0",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: "var(--f-display)", fontSize: 16, margin: 0 }}>
            Assign {ticketNo(issue.id)}
          </h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--ink-soft)" }}>
            <X size={18} />
          </button>
        </div>

        <Field label="Fixer">
          <select value={selectedContactId} onChange={(event) => setSelectedContactId(event.target.value)} style={inputStyle}>
            <option value="">{contacts.length ? "Select contact" : "No contacts available"}</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={String(contact.id)}>
                {contact.role} - {contact.name} ({contact.phone_number})
              </option>
            ))}
          </select>
        </Field>

        {!contacts.length && (
          <div style={{ color: "var(--ink-soft)", fontSize: 12, marginBottom: 12 }}>
            No matching service contacts were found for this issue type yet.
          </div>
        )}

        {error && (
          <div style={{ color: "var(--rust)", fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button
          onClick={onConfirm}
          style={{
            width: "100%",
            padding: 12,
            background: "var(--ink)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Save assignment
        </button>
      </div>
    </div>
  );
}
