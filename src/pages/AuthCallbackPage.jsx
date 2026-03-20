import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseService";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading, error } = useAuth();

  // On mount, explicitly exchange the URL hash/code for a session
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        if (hashParams.get("access_token") || queryParams.get("code")) {
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
        navigate("/login", { replace: true });
      } else if (user) {
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/80 to-primary/40">
      <div className="text-center text-primary-foreground">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-5 text-white" />
        <h2 className="text-xl font-semibold text-white">Signing you in...</h2>
        <p className="text-sm text-white/80 mt-2">
          Please wait while we complete your sign in.
        </p>
      </div>
    </div>
  );
}
