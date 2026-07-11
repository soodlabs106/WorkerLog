import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, ClipboardList, BarChart3, LogOut, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { urgencyRank, monthLabel, CATEGORIES } from "../lib/format";
import { villaLabel } from "../lib/villas";
import { NavButton } from "./Shared";
import NewIssueForm from "./NewIssueForm";
import { TicketsTab } from "./TicketsTab";
import ResolveModal from "./ResolveModal";
import Dashboard from "./Dashboard";

const STAFF_PIN = import.meta.env.VITE_STAFF_PIN || "";

function emptyForm(profile, residents) {
  const firstResident = residents[0];
  return {
    category: "plumbing",
    urgency: "medium",
    description: "",
    location: profile.villa_number,
    reporterChoice: firstResident ? String(firstResident.id) : "__guest__",
    reporterName: firstResident ? firstResident.name : "",
    reporterPhone: firstResident ? firstResident.phone || "" : "",
  };
}

export default function MainApp({ profile, residents }) {
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("new");
  const [ticketFilter, setTicketFilter] = useState("open");
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveWorker, setResolveWorker] = useState("");
  const [resolvePin, setResolvePin] = useState("");
  const [resolveError, setResolveError] = useState("");

  const [form, setForm] = useState(() => emptyForm(profile, residents));
  const [formError, setFormError] = useState("");

  const fetchIssues = useCallback(async () => {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      setLoadError(error.message);
    } else {
      setIssues(data || []);
      setLoadError("");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    fetchIssues();
    const channel = supabase
      .channel("issues-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => fetchIssues())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchIssues]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const openIssues = useMemo(
    () => issues
      .filter((i) => i.status !== "resolved")
      .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || new Date(a.created_at) - new Date(b.created_at)),
    [issues]
  );
  const resolvedIssues = useMemo(
    () => issues.filter((i) => i.status === "resolved").sort((a, b) => new Date(b.resolved_at) - new Date(a.resolved_at)),
    [issues]
  );

  async function submitIssue(e) {
    e.preventDefault();
    if (!form.description.trim()) { setFormError("Describe the issue before submitting."); return; }
    if (!form.reporterName.trim()) { setFormError("Add the reporter's name."); return; }
    setFormError("");
    setSubmitting(true);

    const { data, error } = await supabase.from("issues").insert({
      category: form.category,
      urgency: form.urgency,
      description: form.description.trim(),
      location: form.location,
      reported_by_villa: profile.villa_number,
      reporter_name: form.reporterName.trim(),
      reporter_phone: form.reporterPhone.trim() || null,
      status: "open",
    }).select().single();

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setForm(emptyForm(profile, residents));
    setToast(`Ticket #${String(data.id).padStart(4, "0")} raised`);
    setTab("tickets");
    setTicketFilter("open");
    fetchIssues();
  }

  function openResolveModal(issue) {
    setResolveTarget(issue);
    setResolveNotes("");
    setResolveWorker("");
    setResolvePin("");
    setResolveError("");
  }

  async function confirmResolve() {
    if (!resolveTarget) return;
    if (STAFF_PIN && resolvePin !== STAFF_PIN) {
      setResolveError("That PIN doesn't match. Ask whoever manages the register.");
      return;
    }
    const { error } = await supabase
      .from("issues")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_notes: resolveNotes.trim() || null,
        resolved_by: resolveWorker.trim() || null,
      })
      .eq("id", resolveTarget.id);

    if (error) {
      setResolveError(error.message);
      return;
    }
    setToast(`Ticket #${String(resolveTarget.id).padStart(4, "0")} closed`);
    setResolveTarget(null);
    fetchIssues();
  }

  const whatsappLink = (issue, message) => {
    const phone = (issue.reporter_phone || "").replace(/[^0-9]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const monthly = useMemo(() => {
    const map = new Map();
    const monthsBack = 6;
    const nowD = new Date();
    for (let k = monthsBack - 1; k >= 0; k--) {
      const d = new Date(nowD.getFullYear(), nowD.getMonth() - k, 1);
      map.set(monthLabel(d.getTime()), 0);
    }
    issues.forEach((i) => {
      const label = monthLabel(new Date(i.created_at).getTime());
      if (map.has(label)) map.set(label, map.get(label) + 1);
    });
    return Array.from(map, ([month, count]) => ({ month, count }));
  }, [issues]);

  const avgFixByType = useMemo(() => {
    const sums = {};
    CATEGORIES.forEach((c) => (sums[c.key] = { total: 0, n: 0 }));
    resolvedIssues.forEach((i) => {
      const hrs = (new Date(i.resolved_at) - new Date(i.created_at)) / 3600000;
      if (!sums[i.category]) sums[i.category] = { total: 0, n: 0 };
      sums[i.category].total += hrs;
      sums[i.category].n += 1;
    });
    return CATEGORIES.map((c) => ({
      name: c.label,
      key: c.key,
      hours: sums[c.key].n ? Math.round((sums[c.key].total / sums[c.key].n) * 10) / 10 : 0,
      n: sums[c.key].n,
    })).filter((d) => d.n > 0);
  }, [resolvedIssues]);

  const overallAvgHours = useMemo(() => {
    if (!resolvedIssues.length) return null;
    const total = resolvedIssues.reduce((s, i) => s + (new Date(i.resolved_at) - new Date(i.created_at)), 0);
    return Math.round((total / resolvedIssues.length / 3600000) * 10) / 10;
  }, [resolvedIssues]);

  if (!ready) {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-soft)" }}>
          <Loader2 size={18} className="spin" />
          Loading register…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: "center", color: "var(--rust)" }}>
          <p style={{ fontWeight: 600 }}>Couldn't load the register.</p>
          <p style={{ fontSize: 13 }}>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 76 }}>
      <header style={{ padding: "20px 18px 14px", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: "0.12em", color: "var(--brass)", textTransform: "uppercase" }}>
            Community maintenance
          </div>
          <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 24, margin: "2px 0 0" }}>The Colony Register</h1>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "4px 0 0" }}>
            Signed in as {villaLabel(profile.villa_number)}
          </p>
        </div>
        <button onClick={() => supabase.auth.signOut()} title="Sign out" style={{
          background: "none", border: "1px solid var(--hairline)", borderRadius: 8, padding: 8, color: "var(--ink-soft)",
        }}>
          <LogOut size={16} />
        </button>
      </header>

      <main style={{ padding: "16px 16px 8px" }}>
        {tab === "new" && (
          <NewIssueForm form={form} setForm={setForm} onSubmit={submitIssue} error={formError} submitting={submitting} residents={residents} />
        )}
        {tab === "tickets" && (
          <TicketsTab
            filter={ticketFilter} setFilter={setTicketFilter}
            open={openIssues} resolved={resolvedIssues}
            now={now} onResolve={openResolveModal}
            whatsappLink={whatsappLink}
          />
        )}
        {tab === "dashboard" && (
          <Dashboard
            total={issues.length}
            openCount={openIssues.length}
            overallAvgHours={overallAvgHours}
            monthly={monthly}
            avgFixByType={avgFixByType}
          />
        )}
      </main>

      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: "var(--card)", borderTop: "1px solid var(--hairline)",
        display: "flex", padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
      }}>
        <NavButton icon={Plus} label="New issue" active={tab === "new"} onClick={() => setTab("new")} />
        <NavButton icon={ClipboardList} label="Tickets" badge={openIssues.length} active={tab === "tickets"} onClick={() => setTab("tickets")} />
        <NavButton icon={BarChart3} label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
      </nav>

      {toast && (
        <div style={{
          position: "fixed", bottom: 84, left: "50%", transform: "translateX(-50%)",
          background: "var(--ink)", color: "#F4F2E9", fontSize: 13, padding: "9px 16px",
          borderRadius: 8, maxWidth: 440, textAlign: "center", zIndex: 30,
        }}>
          {toast}
        </div>
      )}

      {resolveTarget && (
        <ResolveModal
          issue={resolveTarget}
          notes={resolveNotes} setNotes={setResolveNotes}
          worker={resolveWorker} setWorker={setResolveWorker}
          pin={resolvePin} setPin={setResolvePin}
          requirePin={!!STAFF_PIN}
          error={resolveError}
          onCancel={() => setResolveTarget(null)}
          onConfirm={confirmResolve}
        />
      )}
    </div>
  );
}
