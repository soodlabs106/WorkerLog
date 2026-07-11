import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { isVillaProfile, profileLabel } from "./lib/profiles";
import Login from "./components/Login";
import ChangePasswordGate from "./components/ChangePasswordGate";
import AddResidentsGate from "./components/AddResidentsGate";
import MainApp from "./components/MainApp";

function Centered({ children }) {
  return (
    <div style={{ background: "var(--paper)", minHeight: "100dvh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflowX: "clip" }}>
      {children}
    </div>
  );
}

export default function App() {
  const [loadingSession, setLoadingSession] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [residents, setResidents] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState("");
  const activeLoadRef = useRef(0);
  const lastLoadedUserRef = useRef("");

  const withTimeout = useCallback((promise, message, ms = 12000) => (
    Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
      }),
    ])
  ), []);

  const loadProfileAndResidents = useCallback(async (userId) => {
    const loadId = activeLoadRef.current + 1;
    activeLoadRef.current = loadId;
    setLoadingProfile(true);
    setError("");

    try {
      const { data: profileData, error: profileError } = await withTimeout(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single(),
        "Timed out while loading your account profile. Please retry in a moment."
      );

      if (loadId !== activeLoadRef.current) return;

      if (profileError || !profileData) {
        setError("Could not find a profile for this account. Run the updated schema and seed script first.");
        setLoadingProfile(false);
        return;
      }

      if (!isVillaProfile(profileData) || !profileData.villa_number) {
        lastLoadedUserRef.current = userId;
        setProfile(profileData);
        setResidents([]);
        setLoadingProfile(false);
        return;
      }

      const { data: residentsData, error: residentsError } = await withTimeout(
        supabase
          .from("residents")
          .select("*")
          .eq("villa_number", profileData.villa_number)
          .order("id", { ascending: true }),
        "Timed out while loading residents for this account. Please retry in a moment."
      );

      if (loadId !== activeLoadRef.current) return;

      if (residentsError) {
        setError(residentsError.message);
        setLoadingProfile(false);
        return;
      }

      lastLoadedUserRef.current = userId;
      setProfile(profileData);
      setResidents(residentsData || []);
      setLoadingProfile(false);
    } catch (loadError) {
      if (loadId !== activeLoadRef.current) return;
      setError(loadError.message || "Could not load your account.");
      setLoadingProfile(false);
    }
  }, [withTimeout]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setLoadingSession(false);
      if (nextSession) loadProfileAndResidents(nextSession.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === "SIGNED_OUT" || !nextSession) {
        activeLoadRef.current += 1;
        lastLoadedUserRef.current = "";
        setProfile(null);
        setResidents([]);
        setLoadingProfile(false);
        return;
      }

      const shouldReloadProfile =
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        lastLoadedUserRef.current !== nextSession.user.id;

      if (shouldReloadProfile) {
        loadProfileAndResidents(nextSession.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfileAndResidents]);

  if (loadingSession) {
    return (
      <Centered>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-soft)" }}>
          <Loader2 size={18} className="spin" /> Loading...
        </div>
      </Centered>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (loadingProfile || (!profile && !error)) {
    return (
      <Centered>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-soft)" }}>
          <Loader2 size={18} className="spin" /> Loading your account...
        </div>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <div style={{ maxWidth: 380, textAlign: "center", padding: 24 }}>
          <p style={{ color: "var(--rust)", fontWeight: 600, marginBottom: 6 }}>Something is not set up yet.</p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>{error}</p>
          <button onClick={() => supabase.auth.signOut()} style={{
            marginTop: 16, background: "none", border: "1px solid var(--hairline)", borderRadius: 8,
            padding: "8px 14px", fontSize: 13, color: "var(--ink-soft)",
          }}>
            Sign out
          </button>
        </div>
      </Centered>
    );
  }

  if (profile.must_change_password) {
    return (
      <ChangePasswordGate
        villaLabel={profileLabel(profile)}
        onDone={async () => {
          await supabase.from("profiles").update({ must_change_password: false }).eq("id", profile.id);
          await loadProfileAndResidents(profile.id);
        }}
      />
    );
  }

  if (isVillaProfile(profile) && residents.length === 0) {
    return (
      <AddResidentsGate
        villaId={profile.villa_number}
        villaLabel={profileLabel(profile)}
        onDone={() => loadProfileAndResidents(profile.id)}
      />
    );
  }

  return <MainApp profile={profile} residents={residents} />;
}
