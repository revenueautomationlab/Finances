import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseService";

const AuthContext = createContext(null);

// DEV-ONLY auth bypass for local UI/layout testing. Active ONLY when running under `bun dev`
// (import.meta.env.DEV) AND VITE_AUTH_BYPASS=true is set in .env.development. The production
// `vite build` compiles import.meta.env.DEV to false, so this is dead-code-eliminated and can
// NEVER be reachable in the deployed app. Pairs with mock data in supabaseService.fetchState.
export const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === "true";

const ADMIN_EMAIL = "revenueautomationlab@gmail.com";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Decide whether a signed-in session may use the app, and at what role.
 * - The admin email is always allowed (role "admin") — never lockable-out.
 * - Anyone else must have an active row in app_users (reader/full/admin).
 *
 * IMPORTANT: queries app_users with the SESSION'S OWN access token (direct REST), not the supabase
 * client. Right after the OAuth callback the client may not have attached the new session yet, so a
 * client query would run unauthenticated, the RLS "read own row" policy returns nothing, and the
 * user gets wrongly force-signed-out (logs in for a second, then bounced to /login). Using the
 * token explicitly removes that race entirely.
 */
async function resolveAccess(session) {
  const email = session?.user?.email;
  if (!email) return { allowed: false, role: null };
  if (email === ADMIN_EMAIL) return { allowed: true, role: "admin" };
  const token = session?.access_token;
  if (!token) return { allowed: false, role: null };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/app_users?select=role,status&email=eq.${encodeURIComponent(email)}`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows.length && rows[0].status === "active") return { allowed: true, role: rows[0].role };
        if (rows.length) return { allowed: false, role: null }; // disabled → definitive
        // empty with a valid token = genuinely not onboarded; brief retry guards against replica lag
      }
    } catch (err) {
      console.error(`Role lookup failed (attempt ${attempt}):`, err);
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
  }
  return { allowed: false, role: null };
}

/**
 * Fully clear all Supabase auth state from browser storage.
 * supabase.auth.signOut() doesn't always remove localStorage keys
 * (e.g. when the token is already expired or revoked), so we
 * manually purge everything Supabase-related.
 */
function clearSupabaseStorage() {
  try {
    // Clear all Supabase keys from localStorage
    const localKeys = Object.keys(localStorage).filter(
      (key) => key.startsWith("sb-") || key.includes("supabase"),
    );
    localKeys.forEach((key) => localStorage.removeItem(key));

    // Clear all Supabase keys from sessionStorage
    const sessionKeys = Object.keys(sessionStorage).filter(
      (key) => key.startsWith("sb-") || key.includes("supabase"),
    );
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));
  } catch (err) {
    console.error("Failed to clear Supabase storage:", err);
  }
}

/**
 * Sign out and nuke every trace of the session so the user
 * lands on a completely clean login page.
 */
async function forceFullSignOut() {
  try {
    // "local" scope: sign out ONLY this device/browser. Using "global" (the default) would
    // revoke the user's sessions on every device — which logged people out when switching
    // accounts and broke multi-device use. Local + the storage purge below is enough to
    // cleanly swap accounts here.
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    // Ignore errors — the session may already be invalid
    console.warn("signOut threw (safe to ignore):", err);
  }
  clearSupabaseStorage();
}

export function AuthProvider({ children }) {
  // Dev bypass: start as a fake admin and skip all Supabase auth. Hooks stay unconditional
  // (order never changes) so React Fast Refresh doesn't choke during local dev.
  const [user, setUser] = useState(DEV_AUTH_BYPASS ? { email: "dev-local@bypass" } : null);
  const [role, setRole] = useState(DEV_AUTH_BYPASS ? "admin" : null);
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);
  const [error, setError] = useState(null);
  const isForceSigningOut = useRef(false);

  useEffect(() => {
    if (DEV_AUTH_BYPASS) return undefined; // no Supabase session in bypass mode
    let cancelled = false;

    // Resolve a session to user+role and update state. NEVER call this synchronously inside
    // onAuthStateChange — awaiting a DB query there deadlocks Supabase's auth lock (the
    // "loads forever" bug). We always defer it.
    const apply = async (session) => {
      try {
        if (session?.user) {
          const { allowed, role: r } = await resolveAccess(session);
          if (cancelled) return;
          if (allowed) {
            setUser(session.user);
            setRole(r);
            setError(null);
          } else {
            // Logged in but not onboarded / disabled — purge and kick to login.
            isForceSigningOut.current = true;
            await forceFullSignOut();
            if (!cancelled) {
              setError("Access denied. Ask the admin to add your Google account.");
              setUser(null);
              setRole(null);
            }
            isForceSigningOut.current = false;
          }
        } else {
          if (cancelled) return;
          setUser(null);
          setRole(null);
          if (!isForceSigningOut.current) setError(null);
        }
      } catch (err) {
        console.error("Auth resolve failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Initial check (safe to await here — not inside the auth callback).
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => apply(session))
      .catch((err) => { console.error("getSession failed:", err); if (!cancelled) setLoading(false); });

    // Auth changes: defer the (DB-touching) work out of the callback to avoid the lock deadlock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => { if (!cancelled) apply(session); }, 0);
    });

    // Safety net: never leave the user stuck on the loading screen.
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(safety);
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      // Always purge any leftover session before starting a new sign-in
      // This ensures a wrong-account denial doesn't stick around
      await forceFullSignOut();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await forceFullSignOut();
      setUser(null);
      setRole(null);
    } catch (err) {
      // Even if signOut fails, clear everything and reset state
      clearSupabaseStorage();
      setUser(null);
      setRole(null);
      console.warn("Logout error (session cleared anyway):", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, role, isAdmin: role === "admin", canWrite: role === "full" || role === "admin", loading, error, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
