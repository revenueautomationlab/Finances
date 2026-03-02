import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            // User logged in but not authorized - sign them out
            await supabase.auth.signOut();
            setError(
              "Access denied. Only revenueautomationlab@gmail.com can access this app.",
            );
            setUser(null);
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
          await supabase.auth.signOut();
          setError(
            "Access denied. Only revenueautomationlab@gmail.com can access this app.",
          );
          setUser(null);
        }
      } else {
        setUser(null);
        setError(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message);
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
