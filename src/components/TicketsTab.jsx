import React from "react";
import { MapPin, User, Clock, CheckCircle2, Inbox, BellRing, UserCheck } from "lucide-react";
import { catInfo, urgInfo, ticketNo, formatElapsed } from "../lib/format";
import { photoFullSrc, photoKey, photoThumbSrc } from "../lib/photos";

const ISSUE_CARD_THEME = {
  plumbing: {
    background: "#FFF1DF",
    border: "#E1A85A",
    accent: "#B86A10",
  },
  electrical: {
    background: "#EAF4FF",
    border: "#6EA7E0",
    accent: "#2F6FB3",
  },
  pest: {
    background: "#EEF9E8",
    border: "#7FBB63",
    accent: "#4D8B2F",
  },
  general: {
    background: "#F2F0FF",
    border: "#8E84D8",
    accent: "#5F56B3",
  },
};

export function TicketsTab({
  filter,
  setFilter,
  open,
  resolved,
  loading,
  error,
  now,
  onResolve,
  onAssign,
  onFollowUp,
  canResolveIssue,
  canAssignIssue,
  canFollowUpIssue,
  highlightedIssueId,
}) {
  const list = filter === "open" ? open : resolved;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[["open", `Open (${open.length})`], ["resolved", `Resolved (${resolved.length})`]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              border: filter === key ? "1px solid var(--ink)" : "1px solid var(--hairline)",
              background: filter === key ? "var(--ink)" : "var(--card)",
              color: filter === key ? "#F4F2E9" : "var(--ink-soft)",
            }}
          >
            {label}
          </button>
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
          <TicketCard
            key={issue.id}
            issue={issue}
            now={now}
            onResolve={onResolve}
            onAssign={onAssign}
            onFollowUp={onFollowUp}
            canResolve={canResolveIssue(issue)}
            canAssign={canAssignIssue(issue)}
            canFollowUp={canFollowUpIssue(issue)}
            highlighted={issue.id === highlightedIssueId}
          />
        ))}
      </div>
    </div>
  );
}

function TicketCard({ issue, now, onResolve, onAssign, onFollowUp, canResolve, canAssign, canFollowUp, highlighted }) {
  const { Icon, label: catLabel } = catInfo(issue.category);
  const urg = urgInfo(issue.urgency);
  const isOpen = issue.status !== "resolved";
  const createdAt = new Date(issue.created_at).getTime();
  const resolvedAt = issue.resolved_at ? new Date(issue.resolved_at).getTime() : null;
  const elapsedMs = (isOpen ? now : resolvedAt) - createdAt;
  const issueTheme = ISSUE_CARD_THEME[issue.category] || ISSUE_CARD_THEME.general;

  return (
    <div
      id={`ticket-${issue.id}`}
      style={{
        scrollMarginTop: 88,
        background: issueTheme.background,
        border: `1px solid ${issueTheme.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        borderLeft: `6px solid ${issueTheme.accent}`,
        boxShadow: highlighted ? "0 0 0 2px rgba(181, 141, 55, 0.22)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--brass)" }}>{ticketNo(issue.id)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: issueTheme.accent }}>
            <Icon size={13} /> {catLabel}
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: urg.color, background: urg.bg, padding: "2px 8px", borderRadius: 999 }}>
          {urg.label}
        </span>
      </div>

      <p style={{ fontSize: 14, margin: "0 0 8px", lineHeight: 1.4 }}>{issue.description}</p>

      {issue.display_photos?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
          {issue.display_photos
            .filter((photo) => photoThumbSrc(photo) || photoFullSrc(photo))
            .map((photo, index) => (
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
        {issue.assigned_service_contact_name && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><UserCheck size={12} /> {issue.assigned_service_contact_name}</span>
        )}
        {issue.follow_up_count > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BellRing size={12} /> {issue.follow_up_count} follow-up{issue.follow_up_count === 1 ? "" : "s"}</span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "var(--f-mono)", fontSize: 13, color: isOpen ? "var(--rust)" : "var(--moss)" }}>
          <Clock size={13} /> {formatElapsed(elapsedMs)} {isOpen ? "open" : "to close"}
        </span>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {isOpen && canFollowUp && (
            <button
              onClick={() => onFollowUp(issue)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "var(--card)",
                color: "var(--ink)",
                border: "1px solid var(--hairline)",
                borderRadius: 6,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <BellRing size={14} /> Follow up
            </button>
          )}

          {isOpen && canAssign && (
            <button
              onClick={() => onAssign(issue)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "var(--card)",
                color: "var(--ink)",
                border: "1px solid var(--hairline)",
                borderRadius: 6,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <UserCheck size={14} /> {issue.assigned_service_contact_name ? "Reassign" : "Assign fixer"}
            </button>
          )}

          {isOpen && canResolve && (
            <button
              onClick={() => onResolve(issue)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "var(--moss)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={14} /> Mark resolved
            </button>
          )}
        </div>
      </div>

      {!isOpen && issue.resolution_notes && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--hairline)", fontSize: 12, color: "var(--ink-soft)" }}>
          {issue.resolution_notes}{issue.resolved_by ? ` - ${issue.resolved_by}` : ""}
        </div>
      )}
    </div>
  );
}
