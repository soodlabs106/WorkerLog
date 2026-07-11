import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { isVillaProfile, profileLabel } from "./lib/profiles";
import Login from "./components/Login";
import ChangePasswordGate from "./components/ChangePasswordGate";
import AddResidentsGate from "./components/AddResidentsGate";
import MainApp from "./components/MainApp";

function Centered({ children }) {
  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

  const loadProfileAndResidents = useCallback(async (userId) => {
    setLoadingProfile(true);
    setError("");

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profileData) {
      setError("Could not find a profile for this account. Run the updated schema and seed script first.");
      setLoadingProfile(false);
      return;
    }

    if (!isVillaProfile(profileData) || !profileData.villa_number) {
      setProfile(profileData);
      setResidents([]);
      setLoadingProfile(false);
      return;
    }

    const { data: residentsData, error: residentsError } = await supabase
      .from("residents")
      .select("*")
      .eq("villa_number", profileData.villa_number)
      .order("id", { ascending: true });

    if (residentsError) {
      setError(residentsError.message);
      setLoadingProfile(false);
      return;
    }

    setProfile(profileData);
    setResidents(residentsData || []);
    setLoadingProfile(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      setLoadingSession(false);
      if (nextSession) loadProfileAndResidents(nextSession.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        loadProfileAndResidents(nextSession.user.id);
      } else {
        setProfile(null);
        setResidents([]);
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
