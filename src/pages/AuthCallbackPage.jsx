import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseService";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading, error } = useAuth();

  // On mount, explicitly exchange the URL hash/code for a session
  // This ensures the auth tokens from the redirect are properly processed
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if there are auth params in the URL (hash or query)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        if (hashParams.get("access_token") || queryParams.get("code")) {
          // Let Supabase process the callback — it auto-detects hash/code
          // getSession() triggers the exchange if needed
          await supabase.auth.getSession();
        }
      } catch (err) {
        console.error("Callback auth exchange failed:", err);
      }
    };
    handleCallback();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (error) {
        // If there's an error, redirect to login to show the error message
        navigate("/login", { replace: true });
      } else if (user) {
        // If user is authenticated, go to home
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, error, navigate]);

  // Timeout fallback — if loading never resolves, redirect to login
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        navigate("/login", { replace: true });
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [loading, navigate]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: "white",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "3px solid rgba(255,255,255,0.3)",
            borderTop: "3px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px",
          }}
        ></div>
        <h2 style={{ fontSize: "20px", margin: 0 }}>Signing you in...</h2>
        <p style={{ fontSize: "14px", opacity: 0.8, marginTop: "10px" }}>
          Please wait while we complete your sign in.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
