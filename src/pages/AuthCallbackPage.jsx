import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, readCallbackIdToken } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading, error, completeSignIn } = useAuth();

  // On mount, hand the Google ID token from the redirect fallback (#id_token=...) to the API.
  useEffect(() => {
    const idToken = readCallbackIdToken();
    window.history.replaceState(null, "", window.location.pathname);
    if (idToken) completeSignIn(idToken);
    else navigate("/login", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
