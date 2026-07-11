import React from "react";
import { MapPin, User, Phone, Clock, CheckCircle2, ChevronRight, Inbox } from "lucide-react";
import { catInfo, urgInfo, ticketNo, formatElapsed } from "../lib/format";
import { photoFullSrc, photoKey, photoThumbSrc } from "../lib/photos";

export function TicketsTab({ filter, setFilter, open, resolved, loading, error, now, onResolve, whatsappLink }) {
  const list = filter === "open" ? open : resolved;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["open", `Open (${open.length})`], ["resolved", `Resolved (${resolved.length})`]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            flex: 1, padding: "8px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600,
            border: filter === k ? "1px solid var(--ink)" : "1px solid var(--hairline)",
            background: filter === k ? "var(--ink)" : "var(--card)", color: filter === k ? "#F4F2E9" : "var(--ink-soft)",
          }}>{label}</button>
        ))}
      </div>

      {loading && list.length === 0 && (
        <div style={{ textAlign: "center", padding: "18px 12px", color: "var(--ink-soft)", fontSize: 13 }}>
          Loading tickets...
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 10, color: "var(--rust)", fontSize: 13 }}>
          Could not refresh tickets: {error}
        </div>
      )}

      {list.length === 0 && (
        <div style={{ textAlign: "center", padding: "36px 12px", color: "var(--ink-soft)" }}>
          <Inbox size={26} style={{ marginBottom: 8, opacity: 0.6 }} />
          <div style={{ fontSize: 14 }}>
            {filter === "open" ? "No open tickets. The colony is quiet." : "Nothing resolved yet."}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((issue) => (
          <TicketCard key={issue.id} issue={issue} now={now} onResolve={onResolve} whatsappLink={whatsappLink} />
        ))}
      </div>
    </div>
  );
}

function TicketCard({ issue, now, onResolve, whatsappLink }) {
  const { Icon, label: catLabel } = catInfo(issue.category);
  const urg = urgInfo(issue.urgency);
  const isOpen = issue.status !== "resolved";
  const createdAt = new Date(issue.created_at).getTime();
  const resolvedAt = issue.resolved_at ? new Date(issue.resolved_at).getTime() : null;
  const elapsedMs = (isOpen ? now : resolvedAt) - createdAt;

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 10,
      padding: "12px 14px", borderLeft: `4px solid ${urg.color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--brass)" }}>{ticketNo(issue.id)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-soft)" }}>
            <Icon size={13} /> {catLabel}
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: urg.color, background: urg.bg, padding: "2px 8px", borderRadius: 999 }}>
          {urg.label}
        </span>
      </div>

      <p style={{ fontSize: 14, margin: "0 0 8px", lineHeight: 1.4 }}>{issue.description}</p>

      {issue.issue_photo_urls?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
          {issue.issue_photo_urls.map((photo, index) => (
            <a
              key={`${issue.id}-${photoKey(photo, index)}`}
              href={photoFullSrc(photo)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", borderRadius: 8, overflow: "hidden", border: "1px solid var(--hairline)" }}
            >
              <img src={photoThumbSrc(photo)} alt={`Issue ${issue.id} upload ${index + 1}`} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }} />
            </a>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {issue.location}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={12} /> {issue.reporter_name}</span>
        {issue.reporter_phone && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {issue.reporter_phone}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--f-mono)", fontSize: 13, color: isOpen ? "var(--rust)" : "var(--moss)" }}>
          <Clock size={13} /> {formatElapsed(elapsedMs)} {isOpen ? "open" : "to close"}
        </span>
        {isOpen ? (
          <button onClick={() => onResolve(issue)} style={{
            display: "flex", alignItems: "center", gap: 5, background: "var(--moss)", color: "#fff",
            border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600,
          }}>
            <CheckCircle2 size={14} /> Mark resolved
          </button>
        ) : (
          issue.reporter_phone && (
            <a href={whatsappLink(issue, `Hi ${issue.reporter_name}, your ${catLabel.toLowerCase()} issue (${ticketNo(issue.id)}) has been resolved. Thanks for your patience!`)}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: "var(--slate)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              Notify on WhatsApp <ChevronRight size={12} />
            </a>
          )
        )}
      </div>

      {!isOpen && issue.resolution_notes && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--hairline)", fontSize: 12, color: "var(--ink-soft)" }}>
          {issue.resolution_notes}{issue.resolved_by ? ` — ${issue.resolved_by}` : ""}
        </div>
      )}
    </div>
  );
}
