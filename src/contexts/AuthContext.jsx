import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabaseService";

const AuthContext = createContext(null);

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
    // Use "global" scope to also revoke the session on Supabase's server,
    // not just clear the local token. This prevents stale sessions from
    // being re-established on the next OAuth callback.
    await supabase.auth.signOut({ scope: "global" });
  } catch (err) {
    // Ignore errors — the session may already be invalid
    console.warn("signOut threw (safe to ignore):", err);
  }
  clearSupabaseStorage();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isForceSigningOut = useRef(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Check if user email is authorized
          if (session.user.email === "revenueautomationlab@gmail.com") {
            setUser(session.user);
          } else {
            // User logged in but not authorized — full purge
            isForceSigningOut.current = true;
            await forceFullSignOut();
            setError("Access denied. Only the authorized account may sign in.");
            setUser(null);
            isForceSigningOut.current = false;
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Auth check failed:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Verify email on every auth change
        if (session.user.email === "revenueautomationlab@gmail.com") {
          setUser(session.user);
          setError(null);
        } else {
          isForceSigningOut.current = true;
          await forceFullSignOut();
          setError("Access denied. Only the authorized account may sign in.");
          setUser(null);
          isForceSigningOut.current = false;
        }
      } else {
        setUser(null);
        // Don't clear the error if we're in the middle of a force sign-out
        // (e.g. "Access denied" was just set and signOut triggered this event)
        if (!isForceSigningOut.current) {
          setError(null);
        }
      }
    });

    return () => {
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
    } catch (err) {
      // Even if signOut fails, clear everything and reset state
      clearSupabaseStorage();
      setUser(null);
      console.warn("Logout error (session cleared anyway):", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signInWithGoogle, signOut }}
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
