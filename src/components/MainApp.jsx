import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, ClipboardList, BarChart3, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { urgencyRank, monthLabel, CATEGORIES, serviceForCategory } from "../lib/format";
import { canManageContacts, isSuperAdminProfile, profileLabel } from "../lib/profiles";
import { NavButton } from "./Shared";
import NewIssueForm from "./NewIssueForm";
import { TicketsTab } from "./TicketsTab";
import ResolveModal from "./ResolveModal";
import Dashboard from "./Dashboard";
import AdminTab from "./AdminTab";

const STAFF_PIN = import.meta.env.VITE_STAFF_PIN || "";

function emptyForm(profile, residents) {
  const firstResident = residents[0];
  return {
    category: "plumbing",
    urgency: "medium",
    description: "",
    location: profile.villa_number || "common-area",
    reporterChoice: firstResident ? String(firstResident.id) : "__guest__",
    reporterName: firstResident ? firstResident.name : "",
    reporterPhone: firstResident ? firstResident.phone || "" : "",
  };
}

function buildDirectoryRows(profiles, residents) {
  const residentMap = new Map();
  residents.forEach((resident) => {
    const list = residentMap.get(resident.villa_number) || [];
    list.push(resident);
    residentMap.set(resident.villa_number, list);
  });

  return [...profiles]
    .sort((a, b) => {
      if (a.role !== b.role) {
        const order = { superadmin: 2, admin: 1, villa: 0 };
        return order[a.role] - order[b.role];
      }
      return (a.villa_number || a.username).localeCompare(b.villa_number || b.username);
    })
    .map((profile) => {
      const villaResidents = residentMap.get(profile.villa_number) || [];
      return {
        username: profile.username,
        role: profile.role,
        label: profile.display_name || profile.villa_number || profile.username,
        residentNames: villaResidents.map((resident) => resident.name).join(", "),
        residentPhones: villaResidents.map((resident) => resident.phone).filter(Boolean).join(", "),
      };
    });
}

export default function MainApp({ profile, residents }) {
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [directoryRows, setDirectoryRows] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("new");
  const [ticketFilter, setTicketFilter] = useState("open");
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copyingMessage, setCopyingMessage] = useState(false);

  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveWorker, setResolveWorker] = useState("");
  const [resolvePin, setResolvePin] = useState("");
  const [resolveError, setResolveError] = useState("");

  const [form, setForm] = useState(() => emptyForm(profile, residents));
  const [formError, setFormError] = useState("");
  const [contactSaveError, setContactSaveError] = useState("");
  const [contactSaveSuccess, setContactSaveSuccess] = useState("");
  const [savingContacts, setSavingContacts] = useState(false);
  const [resettingUsername, setResettingUsername] = useState("");

  const matchedServiceName = serviceForCategory(form.category);
  const matchedContacts = useMemo(
    () => contacts.filter((contact) => matchedServiceName && contact.service === matchedServiceName),
    [contacts, matchedServiceName]
  );

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
  }, []);

  const fetchContacts = useCallback(async () => {
    const { data, error } = await supabase
      .from("service_contacts")
      .select("*")
      .order("service", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    setContacts(data || []);
  }, []);

  const fetchDirectory = useCallback(async () => {
    if (!isSuperAdminProfile(profile)) {
      setDirectoryRows([]);
      return;
    }

    const [{ data: profilesData, error: profilesError }, { data: residentsData, error: residentsError }] = await Promise.all([
      supabase.from("profiles").select("username, role, villa_number, display_name"),
      supabase.from("residents").select("villa_number, name, phone"),
    ]);

    if (profilesError) throw profilesError;
    if (residentsError) throw residentsError;

    setDirectoryRows(buildDirectoryRows(profilesData || [], residentsData || []));
  }, [profile]);

  const loadAll = useCallback(async () => {
    try {
      await Promise.all([fetchIssues(), fetchContacts(), fetchDirectory()]);
      setReady(true);
    } catch (error) {
      setLoadError(error.message || String(error));
      setReady(true);
    }
  }, [fetchContacts, fetchDirectory, fetchIssues]);

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("issues-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => fetchIssues())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchIssues, loadAll]);

  useEffect(() => {
    setForm(emptyForm(profile, residents));
  }, [profile, residents]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!contactSaveSuccess) return undefined;
    const timer = setTimeout(() => setContactSaveSuccess(""), 2400);
    return () => clearTimeout(timer);
  }, [contactSaveSuccess]);

  const openIssues = useMemo(
    () => issues
      .filter((issue) => issue.status !== "resolved")
      .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || new Date(a.created_at) - new Date(b.created_at)),
    [issues]
  );

  const resolvedIssues = useMemo(
    () => issues
      .filter((issue) => issue.status === "resolved")
      .sort((a, b) => new Date(b.resolved_at) - new Date(a.resolved_at)),
    [issues]
  );

  async function submitIssue(e) {
    e.preventDefault();
    if (!form.description.trim()) {
      setFormError("Describe the issue before submitting.");
      return;
    }
    if (!form.reporterName.trim()) {
      setFormError("Add the reporter name.");
      return;
    }

    setFormError("");
    setSubmitting(true);

    const { data, error } = await supabase.from("issues").insert({
      category: form.category,
      urgency: form.urgency,
      description: form.description.trim(),
      location: form.location,
      reported_by_villa: profile.villa_number || profile.username,
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

  async function copyIssueMessage() {
    if (!form.description.trim()) {
      setFormError("Add the issue description before creating the message.");
      return;
    }

    setCopyingMessage(true);
    setFormError("");

    const lines = [
      `Issue type: ${form.category}`,
      `Urgency: ${form.urgency}`,
      `Location: ${form.location}`,
      `Reporter: ${form.reporterName || "Guest"}`,
      `Phone: ${form.reporterPhone || "Not shared"}`,
      `Details: ${form.description.trim()}`,
    ];

    if (matchedContacts.length) {
      lines.push("");
      lines.push("Suggested contacts:");
      matchedContacts.forEach((contact) => {
        lines.push(`${contact.role}: ${contact.name} - ${contact.phone_number}`);
      });
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setToast("Issue message copied to clipboard");
    } catch (error) {
      setFormError(`Could not copy to clipboard: ${error.message || error}`);
    } finally {
      setCopyingMessage(false);
    }
  }

  function resetIssueForm() {
    setForm(emptyForm(profile, residents));
    setFormError("");
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
    if (STAFF_PIN && profile.role === "villa" && resolvePin !== STAFF_PIN) {
      setResolveError("That PIN does not match. Ask whoever manages the register.");
      return;
    }

    const { error } = await supabase
      .from("issues")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_notes: resolveNotes.trim() || null,
        resolved_by: resolveWorker.trim() || profileLabel(profile),
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

  async function saveContacts(nextContacts) {
    setSavingContacts(true);
    setContactSaveError("");

    const updates = await Promise.all(
      nextContacts.map((contact) =>
        supabase
          .from("service_contacts")
          .update({
            name: contact.name.trim(),
            phone_number: contact.phone_number.trim(),
            photo_url: contact.photo_url?.trim() || null,
          })
          .eq("id", contact.id)
      )
    );

    const failed = updates.find((result) => result.error);
    setSavingContacts(false);

    if (failed?.error) {
      setContactSaveError(failed.error.message);
      return;
    }

    setContactSaveSuccess("Contacts saved");
    fetchContacts();
  }

  async function resetPassword(username) {
    setResettingUsername(username);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", {
      body: { username },
    });
    setResettingUsername("");

    if (error) {
      setToast(error.message || "Password reset failed");
      return;
    }
    if (data?.error) {
      setToast(data.error);
      return;
    }

    setToast(`Password reset for ${username}`);
    fetchDirectory();
  }

  const whatsappLink = (issue, message) => {
    const phone = (issue.reporter_phone || "").replace(/[^0-9]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const monthly = useMemo(() => {
    const map = new Map();
    const monthsBack = 6;
    const nowDate = new Date();
    for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
      const date = new Date(nowDate.getFullYear(), nowDate.getMonth() - offset, 1);
      map.set(monthLabel(date.getTime()), 0);
    }
    issues.forEach((issue) => {
      const label = monthLabel(new Date(issue.created_at).getTime());
      if (map.has(label)) map.set(label, map.get(label) + 1);
    });
    return Array.from(map, ([month, count]) => ({ month, count }));
  }, [issues]);

  const avgFixByType = useMemo(() => {
    const sums = {};
    CATEGORIES.forEach((category) => {
      sums[category.key] = { total: 0, count: 0 };
    });
    resolvedIssues.forEach((issue) => {
      const hours = (new Date(issue.resolved_at) - new Date(issue.created_at)) / 3600000;
      if (!sums[issue.category]) sums[issue.category] = { total: 0, count: 0 };
      sums[issue.category].total += hours;
      sums[issue.category].count += 1;
    });
    return CATEGORIES.map((category) => ({
      name: category.label,
      key: category.key,
      hours: sums[category.key].count ? Math.round((sums[category.key].total / sums[category.key].count) * 10) / 10 : 0,
      n: sums[category.key].count,
    })).filter((entry) => entry.n > 0);
  }, [resolvedIssues]);

  const overallAvgHours = useMemo(() => {
    if (!resolvedIssues.length) return null;
    const total = resolvedIssues.reduce((sum, issue) => sum + (new Date(issue.resolved_at) - new Date(issue.created_at)), 0);
    return Math.round((total / resolvedIssues.length / 3600000) * 10) / 10;
  }, [resolvedIssues]);

  if (!ready) {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-soft)" }}>
          <Loader2 size={18} className="spin" />
          Loading register...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: "center", color: "var(--rust)" }}>
          <p style={{ fontWeight: 600 }}>Could not load the register.</p>
          <p style={{ fontSize: 13 }}>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 74 }}>
      <header style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--brass)", textTransform: "uppercase" }}>
            Community maintenance
          </div>
          <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: 22, margin: "2px 0 0" }}>The Colony Register</h1>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "4px 0 0" }}>
            Signed in as {profileLabel(profile)}
          </p>
        </div>
        <button onClick={() => supabase.auth.signOut()} title="Sign out" style={{
          background: "none", border: "1px solid var(--hairline)", borderRadius: 8, padding: 8, color: "var(--ink-soft)",
        }}>
          <LogOut size={16} />
        </button>
      </header>

      <main style={{ padding: "12px 12px 8px" }}>
        {tab === "new" && (
          <NewIssueForm
            form={form}
            setForm={setForm}
            onSubmit={submitIssue}
            error={formError}
            submitting={submitting}
            residents={residents}
            serviceContacts={matchedContacts}
            matchedServiceName={matchedServiceName}
            onCopyMessage={copyIssueMessage}
            copyingMessage={copyingMessage}
            onResetForm={resetIssueForm}
            canUseResidentList={profile.role === "villa"}
          />
        )}

        {tab === "tickets" && (
          <TicketsTab
            filter={ticketFilter}
            setFilter={setTicketFilter}
            open={openIssues}
            resolved={resolvedIssues}
            now={now}
            onResolve={openResolveModal}
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

        {tab === "admin" && canManageContacts(profile) && (
          <AdminTab
            profile={profile}
            contacts={contacts}
            onSaveContacts={saveContacts}
            savingContacts={savingContacts}
            contactSaveError={contactSaveError}
            contactSaveSuccess={contactSaveSuccess}
            rows={directoryRows}
            onResetPassword={resetPassword}
            resettingUsername={resettingUsername}
          />
        )}
      </main>

      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: "var(--card)", borderTop: "1px solid var(--hairline)",
        display: "flex", padding: "6px 6px calc(6px + env(safe-area-inset-bottom))",
      }}>
        <NavButton icon={Plus} label="New issue" active={tab === "new"} onClick={() => setTab("new")} />
        <NavButton icon={ClipboardList} label="Tickets" badge={openIssues.length} active={tab === "tickets"} onClick={() => setTab("tickets")} />
        <NavButton icon={BarChart3} label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
        {canManageContacts(profile) && (
          <NavButton
            icon={ShieldCheck}
            label={isSuperAdminProfile(profile) ? "Super admin" : "Admin"}
            active={tab === "admin"}
            onClick={() => setTab("admin")}
          />
        )}
      </nav>

      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "var(--ink)", color: "#F4F2E9", fontSize: 13, padding: "9px 16px",
          borderRadius: 8, maxWidth: 440, textAlign: "center", zIndex: 30,
        }}>
          {toast}
        </div>
      )}

      {resolveTarget && (
        <ResolveModal
          issue={resolveTarget}
          notes={resolveNotes}
          setNotes={setResolveNotes}
          worker={resolveWorker}
          setWorker={setResolveWorker}
          pin={resolvePin}
          setPin={setResolvePin}
          requirePin={!!STAFF_PIN && profile.role === "villa"}
          error={resolveError}
          onCancel={() => setResolveTarget(null)}
          onConfirm={confirmResolve}
        />
      )}
    </div>
  );
}
