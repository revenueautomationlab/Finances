import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  api, getToken, setToken, clearToken, isTokenValid, tokenExpiry, setUnauthorizedHandler,
} from "../services/supabaseService";

const AuthContext = createContext(null);

// DEV-ONLY auth bypass for local UI/layout testing. Active ONLY when running under `bun dev`
// (import.meta.env.DEV) AND VITE_AUTH_BYPASS=true is set in .env.development. The production
// `vite build` compiles import.meta.env.DEV to false, so this is dead-code-eliminated and can
// NEVER be reachable in the deployed app. Pairs with mock data in supabaseService.fetchState.
export const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === "true";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const NONCE_KEY = "ral_finance_oauth_nonce";
const DENIED = "Access denied. Ask the admin to add your Google account.";

function randomNonce() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Google sign-in: full-page Google OAuth with response_type=id_token, back to /auth/callback,
 * where AuthCallbackPage hands the ID token to completeSignIn. Needs the callback URL listed as
 * an authorized redirect URI on the OAuth client.
 */
export function redirectToGoogle() {
  const nonce = randomNonce();
  try { sessionStorage.setItem(NONCE_KEY, nonce); } catch { /* storage blocked */ }
  const p = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: "id_token",
    scope: "openid email profile",
    prompt: "select_account",
    nonce,
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${p}`);
}

/** Reads #id_token from the callback URL (checks the nonce we sent). Returns null if absent. */
export function readCallbackIdToken() {
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const idToken = hash.get("id_token");
  if (!idToken) return null;
  let expected = null;
  try { expected = sessionStorage.getItem(NONCE_KEY); sessionStorage.removeItem(NONCE_KEY); } catch { /* ignore */ }
  try {
    const claims = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!expected || claims.nonce !== expected) return null;
  } catch { return null; }
  return idToken;
}

export function AuthProvider({ children }) {
  // Dev bypass: start as a fake admin and skip all auth. Hooks stay unconditional
  // (order never changes) so React Fast Refresh doesn't choke during local dev.
  const [user, setUser] = useState(DEV_AUTH_BYPASS ? { email: "dev-local@bypass" } : null);
  const [role, setRole] = useState(DEV_AUTH_BYPASS ? "admin" : null);
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);
  const [error, setError] = useState(null);
  const expiryTimer = useRef(null);

  const clearSession = useCallback((message = null) => {
    clearToken();
    if (expiryTimer.current) { clearTimeout(expiryTimer.current); expiryTimer.current = null; }
    try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* not loaded */ }
    setUser(null);
    setRole(null);
    setError(message);
  }, []);

  // Sign the user out a moment before the API JWT expires (it is not refreshable).
  const scheduleExpiry = useCallback((token) => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    const ms = tokenExpiry(token) * 1000 - Date.now() - 30000;
    expiryTimer.current = setTimeout(() => clearSession("Your session expired. Please sign in again."), Math.max(ms, 0));
  }, [clearSession]);

  // Any 401 from the API (or an expired token at request time) signs out.
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return undefined;
    setUnauthorizedHandler(() => clearSession("Your session expired. Please sign in again."));
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Restore a stored session: confirm the token and current role with GET /auth/me.
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return undefined;
    let cancelled = false;
    const token = getToken();
    if (!isTokenValid(token)) {
      clearToken();
      setLoading(false);
      return undefined;
    }
    api("/auth/me")
      .then((me) => {
        if (cancelled) return;
        setUser({ email: me.email });
        setRole(me.role);
        setError(null);
        scheduleExpiry(token);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 403) clearSession(DENIED);
        else if (err.status) clearSession(err.message);
        else setError("Cannot reach the finance server. Check your connection and reload.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clearSession, scheduleExpiry]);

  useEffect(() => () => { if (expiryTimer.current) clearTimeout(expiryTimer.current); }, []);

  /** Exchange a Google ID token for an API JWT (POST /auth/google). */
  const completeSignIn = useCallback(async (credential) => {
    setLoading(true);
    try {
      const res = await api("/auth/google", { method: "POST", body: { credential }, auth: false });
      setToken(res.token);
      setUser({ email: res.email });
      setRole(res.role);
      setError(null);
      scheduleExpiry(res.token);
      return true;
    } catch (err) {
      console.error("Login error:", err);
      clearSession(err.status === 403 ? DENIED : err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [clearSession, scheduleExpiry]);

  const signInWithGoogle = async () => {
    setError(null);
    clearSession();
    if (!GOOGLE_CLIENT_ID) {
      setError("Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID missing).");
      return;
    }
    // ponytail: always redirect. The One Tap/FedCM prompt silently did nothing when the
    // browser was in cooldown or not signed in to Google, and hid the reason from us.
    redirectToGoogle();
  };

  const signOut = async () => {
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{ user, role, isAdmin: role === "admin", canWrite: role === "full" || role === "admin", loading, error, signInWithGoogle, signOut, completeSignIn }}
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
