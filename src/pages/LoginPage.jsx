import React from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { signInWithGoogle, error, loading } = useAuth();

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">R</div>
          <h1>RAL Finance</h1>
          <p>Project Tracking System</p>
        </div>

        <div className="login-content">
          <h2>Sign In</h2>
          <p className="login-subtitle">
            Sign in with your Google account to get started
          </p>

          {error && (
            <div className="login-error">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="login-button"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="1" />
              <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24" />
              <path d="M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
            </svg>
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>
        </div>

        <div className="login-footer">
          <p>© 2026 RAL Finance. All rights reserved.</p>
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .login-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }

        .login-logo {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
          margin: 0 auto 20px;
        }

        .login-header h1 {
          margin: 0 0 5px 0;
          font-size: 28px;
          font-weight: 700;
        }

        .login-header p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .login-content {
          padding: 40px 30px;
        }

        .login-content h2 {
          margin: 0 0 10px 0;
          font-size: 24px;
          color: #1a202c;
        }

        .login-subtitle {
          margin: 0 0 30px 0;
          color: #718096;
          font-size: 14px;
        }

        .login-error {
          background: #fed7d7;
          color: #c53030;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .login-error svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .login-button {
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          margin-bottom: 20px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-footer {
          background: #f7fafc;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }

        .login-footer p {
          margin: 0;
          font-size: 12px;
          color: #718096;
        }
      `}</style>
    </div>
  );
}
