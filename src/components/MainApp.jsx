import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, ClipboardList, BarChart3, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { sortServiceContacts, urgencyRank, serviceForCategory } from "../lib/format";
import { buildIssuePhotoPayload, collectIssuePhotoPaths, dataUrlToBlob, fetchSignedIssuePhotoUrls, ISSUE_PHOTO_BUCKET, issuePhotoStoragePath, mergeIssuePhotoSources } from "../lib/photos";
import { canManageContacts, canResolveIssue, isSuperAdminProfile, profileLabel } from "../lib/profiles";
import { toUserErrorMessage } from "../lib/security";
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
    issuePhotos: [],
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
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState("");
  const [issuesLoadedOnce, setIssuesLoadedOnce] = useState(false);
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
    () => sortServiceContacts(contacts.filter((contact) => matchedServiceName && contact.service === matchedServiceName)),
    [contacts, matchedServiceName]
  );
  const resolveWorkerOptions = useMemo(() => {
    if (!resolveTarget) return [];
    const serviceName = serviceForCategory(resolveTarget.category);
    if (!serviceName) return [];
    return sortServiceContacts(contacts.filter((contact) => contact.service === serviceName));
  }, [contacts, resolveTarget]);
  const resetPasswordEndpoint = "/api/admin-reset-password";
  const serviceTypeOptions = useMemo(() => {
    const base = ["Electrician", "Plumber", "Snake Catcher"];
    const set = new Set(base);
    contacts.forEach((contact) => {
      if (contact.service) set.add(contact.service);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  const fetchIssues = useCallback(async () => {
    setIssuesLoading(true);
    const photoSelect = `
      id,
      category,
      urgency,
      description,
      location,
      reported_by_villa,
      reporter_name,
      status,
      created_at,
      resolved_at,
      resolution_notes,
      resolved_by,
      issue_photos(id, issue_id, full_path, thumb_path, full_deleted_at, thumb_deleted_at, created_at)
    `;
    const baseSelect = `
      id,
      category,
      urgency,
      description,
      location,
      reported_by_villa,
      reporter_name,
      status,
      created_at,
      resolved_at,
      resolution_notes,
      resolved_by
    `;

    let { data, error } = await supabase
      .from("issues")
      .select(photoSelect)
      .order("created_at", { ascending: true });

    if (error?.message?.includes("Could not find a relationship between 'issues' and 'issue_photos'")) {
      const fallback = await supabase
        .from("issues")
        .select(baseSelect)
        .order("created_at", { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("Could not load issues", error);
      setIssuesError("Could not refresh tickets right now. Please try again.");
    } else {
      let signedUrls = {};
      let nextIssuesError = "";

      try {
        signedUrls = await fetchSignedIssuePhotoUrls(collectIssuePhotoPaths(data || []));
      } catch (photoError) {
        console.error("Could not load secure ticket photos", photoError);
        nextIssuesError = "Ticket photos could not be loaded right now.";
      }

      setIssues((data || []).map((issue) => mergeIssuePhotoSources(issue, signedUrls)));
      setIssuesError(nextIssuesError);
      setIssuesLoadedOnce(true);
    }
    setIssuesLoading(false);
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

  const loadCoreData = useCallback(async () => {
    try {
      await Promise.all([fetchContacts(), fetchDirectory()]);
      setReady(true);
    } catch (error) {
      console.error("Could not load app data", error);
      setLoadError("Could not load the register right now. Please try again.");
      setReady(true);
    }
  }, [fetchContacts, fetchDirectory]);

  useEffect(() => {
    loadCoreData();
    const channel = supabase
      .channel("issues-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, () => fetchIssues())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchIssues, loadCoreData]);

  useEffect(() => {
    if (!ready || issuesLoading || issuesLoadedOnce) return undefined;
    const timer = setTimeout(() => {
      fetchIssues();
    }, 120);
    return () => clearTimeout(timer);
  }, [fetchIssues, issuesLoadedOnce, issuesLoading, ready]);

  useEffect(() => {
    if (tab === "new" || issuesLoadedOnce || issuesLoading) return;
    fetchIssues();
  }, [fetchIssues, issuesLoadedOnce, issuesLoading, tab]);

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
      console.error("Could not raise issue", error);
      setFormError("Could not raise the ticket right now. Please try again.");
      return;
    }

    let photoWarning = "";
    if (form.issuePhotos?.length) {
      try {
        await uploadIssuePhotosForIssue(data.id, form.issuePhotos);
      } catch (uploadError) {
        photoWarning = uploadError.message || "Photo upload failed";
      }
    }

    setForm(emptyForm(profile, residents));
    setToast(
      photoWarning
        ? `Ticket #${String(data.id).padStart(4, "0")} raised, but some photos could not be saved`
        : `Ticket #${String(data.id).padStart(4, "0")} raised`
    );
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
      `Details: ${form.description.trim()}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setToast("Issue message copied to clipboard");
    } catch (error) {
      console.error("Could not copy issue message", error);
      setFormError("Could not copy the message to your clipboard.");
    } finally {
      setCopyingMessage(false);
    }
  }

  function resetIssueForm() {
    setForm(emptyForm(profile, residents));
    setFormError("");
  }

  async function removeStoredIssuePhotoPaths(paths) {
    const normalizedPaths = [...new Set((paths || []).filter(Boolean))];
    if (!normalizedPaths.length) return;
    await supabase.storage.from(ISSUE_PHOTO_BUCKET).remove(normalizedPaths);
  }

  async function uploadIssuePhotosForIssue(issueId, photos) {
    const uploadedPaths = [];
    const photoRows = [];

    try {
      for (const [index, photo] of photos.entries()) {
        const fullPath = issuePhotoStoragePath(issueId, index, "full");
        const thumbPath = issuePhotoStoragePath(issueId, index, "thumb");

        const [fullUpload, thumbUpload] = await Promise.all([
          supabase.storage.from(ISSUE_PHOTO_BUCKET).upload(fullPath, dataUrlToBlob(photo.full), {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          }),
          supabase.storage.from(ISSUE_PHOTO_BUCKET).upload(thumbPath, dataUrlToBlob(photo.thumb), {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          }),
        ]);

        if (fullUpload.error) throw fullUpload.error;
        if (thumbUpload.error) throw thumbUpload.error;

        uploadedPaths.push(fullPath, thumbPath);
        photoRows.push({
          issue_id: issueId,
          full_path: fullPath,
          thumb_path: thumbPath,
        });
      }

      if (!photoRows.length) return;

      const { error } = await supabase.from("issue_photos").insert(photoRows);
      if (error) {
        await removeStoredIssuePhotoPaths(uploadedPaths);
        throw error;
      }
    } catch (error) {
      await removeStoredIssuePhotoPaths(uploadedPaths);
      throw error;
    }
  }

  async function handleIssuePhotoChange(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const oversize = files.find((file) => file.size > 3 * 1024 * 1024);
    if (oversize) {
      setFormError(`${oversize.name} is larger than 3 MB. Please choose a smaller photo.`);
      return;
    }

    try {
      const nextPhotos = await Promise.all(
        files.map((file) => buildIssuePhotoPayload(file))
      );

      setForm((current) => ({ ...current, issuePhotos: [...(current.issuePhotos || []), ...nextPhotos] }));
      setFormError("");
    } catch (error) {
      console.error("Could not process issue photo", error);
      setFormError(toUserErrorMessage(error, "Issue photos must be JPG, PNG, or WebP files under 3 MB."));
    }
  }

  function removeIssuePhoto(index) {
    setForm((current) => ({
      ...current,
      issuePhotos: (current.issuePhotos || []).filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function openResolveModal(issue) {
    if (!canResolveIssue(profile, issue)) {
      setToast("You can resolve tickets raised from your own villa only.");
      return;
    }
    setResolveTarget(issue);
    setResolveNotes("");
    setResolveWorker("");
    setResolvePin("");
    setResolveError("");
  }

  async function confirmResolve() {
    if (!resolveTarget) return;
    if (!canResolveIssue(profile, resolveTarget)) {
      setResolveError("You can resolve tickets raised from your own villa only.");
      return;
    }
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
      console.error("Could not resolve issue", error);
      setResolveError("Could not close the ticket right now. Please try again.");
      return;
    }

    setToast(`Ticket #${String(resolveTarget.id).padStart(4, "0")} closed`);
    setResolveTarget(null);
    fetchIssues();
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function saveContacts({ contacts: nextContacts, removedIds }) {
    setSavingContacts(true);
    setContactSaveError("");
    const operations = await Promise.all(
      nextContacts.map((contact, index) => {
        const payload = {
          seed_key: contact.seed_key?.trim() || `${slugify(contact.service)}-${slugify(contact.role)}-${slugify(contact.name)}-${index + 1}`,
          service: contact.service.trim(),
          role: contact.role.trim(),
          name: contact.name.trim(),
          phone_number: contact.phone_number.trim(),
          photo_url: contact.photo_url?.trim() || null,
          sort_order: index + 1,
        };

        if (!payload.service || !payload.role || !payload.name || !payload.phone_number) {
          return { error: { message: "Every contact must have service, role, name, and phone number." } };
        }

        if (contact.isNew || String(contact.id).startsWith("new-")) {
          return supabase.from("service_contacts").insert(payload);
        }

        return supabase.from("service_contacts").update(payload).eq("id", contact.id);
      })
    );

    const deleteResult = removedIds.length
      ? await supabase.from("service_contacts").delete().in("id", removedIds)
      : { error: null };

    const failed = operations.find((result) => result.error);
    setSavingContacts(false);

    if (failed?.error || deleteResult.error) {
      console.error("Could not save service contacts", failed?.error || deleteResult.error);
      setContactSaveError("Could not save service contacts right now. Please try again.");
      return;
    }

    setContactSaveSuccess("Contacts saved");
    fetchContacts();
  }

  async function resetPassword(username) {
    setResettingUsername(username);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again and retry.");
      }

      const response = await fetch(resetPasswordEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || `Password reset failed (${response.status})`);
      }

      setToast(`Password reset for ${username}`);
      fetchDirectory();
    } catch (error) {
      console.error("Password reset failed", error);
      setToast(toUserErrorMessage(error, "Password reset failed. Please try again."));
    } finally {
      setResettingUsername("");
    }
  }

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
    <div style={{ background: "var(--paper)", minHeight: "100dvh", width: "100%", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 74, overflowX: "clip" }}>
      <header style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ marginBottom: 6 }}>
            <img
              src="/brand/em2-resolve-community-maintenance-lockup.png"
              alt="EM2 Resolve"
              style={{ width: 164, height: "auto" }}
            />
          </div>
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
            onPhotoChange={handleIssuePhotoChange}
            onPhotoRemove={removeIssuePhoto}
            canUseResidentList={profile.role === "villa"}
          />
        )}

        {tab === "tickets" && (
          <TicketsTab
            filter={ticketFilter}
            setFilter={setTicketFilter}
            open={openIssues}
            resolved={resolvedIssues}
            loading={issuesLoading}
            error={issuesError}
            now={now}
            onResolve={openResolveModal}
            canResolveIssue={(issue) => canResolveIssue(profile, issue)}
          />
        )}

        {tab === "dashboard" && (
          <Dashboard issues={issues} loading={issuesLoading} error={issuesError} />
        )}

        {tab === "admin" && canManageContacts(profile) && (
          <AdminTab
            profile={profile}
            contacts={contacts}
            serviceOptions={serviceTypeOptions}
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
        width: "min(100%, 480px)", background: "var(--card)", borderTop: "1px solid var(--hairline)",
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
          borderRadius: 8, width: "calc(100vw - 24px)", maxWidth: 440, textAlign: "center", zIndex: 30,
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
          workerOptions={resolveWorkerOptions}
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
