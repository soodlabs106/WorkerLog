import React from "react";
import { X } from "lucide-react";
import { ticketNo } from "../lib/format";
import { Field, inputStyle } from "./Shared";

export default function ResolveModal({ issue, notes, setNotes, worker, setWorker, pin, setPin, requirePin, onCancel, onConfirm, error }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(32,42,34,0.45)", display: "flex",
      alignItems: "flex-end", justifyContent: "center", zIndex: 40,
    }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--card)", width: "100%", maxWidth: 480, borderRadius: "16px 16px 0 0",
        padding: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: "var(--f-display)", fontSize: 16, margin: 0 }}>
            Close {ticketNo(issue.id)}
          </h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--ink-soft)" }}>
            <X size={18} />
          </button>
        </div>

        <Field label="Worker / vendor (optional)">
          <input value={worker} onChange={(e) => setWorker(e.target.value)} placeholder="Ramesh (plumber)" style={inputStyle} />
        </Field>
        <Field label="Resolution note (optional)">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Replaced washer, checked for leaks" style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        {requirePin && (
          <Field label="Staff PIN" hint="Set in your .env as VITE_STAFF_PIN — a soft deterrent, not real security">
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" style={inputStyle} />
          </Field>
        )}

        {error && (
          <div style={{ color: "var(--rust)", fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button onClick={onConfirm} style={{
          width: "100%", padding: 12, background: "var(--moss)", color: "#fff", border: "none",
          borderRadius: 8, fontWeight: 600, fontSize: 14,
        }}>
          Confirm resolved
        </button>
      </div>
    </div>
  );
}
