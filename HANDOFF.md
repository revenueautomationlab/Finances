# HANDOFF: Finance to VPS (2026-11-17, after Phase 2 code)

## Phase 1 (done, see git history for detail)
VPS `/opt/ral-finance/`: ral-finance-db (postgres 16) + ral-finance-api (server/server.js) behind Traefik, Host finance-api.raltech.dev. 23/23 tables row parity, backup.sh 03:45 cron with restore check. Deploy: `python server/deploy/deploy.py deploy`. Creds: `.vps-creds` (gitignored).

## Phase 2 (code done, not deployed, not pushed)
- `src/services/supabaseService.js`: no supabase-js. fetch to `VITE_API_URL` (default https://finance-api.raltech.dev). Same exports and return shapes; App.jsx unchanged. JWT in localStorage `ral_finance_api_token`; 401 or expired token clears it and signs out.
- `src/contexts/AuthContext.jsx`: Google Identity Services prompt (`VITE_GOOGLE_CLIENT_ID`), ID token to POST /auth/google, role from GET /auth/me on reload, auto sign-out at JWT expiry (12 h). Same context shape plus `completeSignIn`. If the GIS prompt cannot show, falls back to a full-page Google redirect (response_type=id_token) to `/auth/callback`, which `AuthCallbackPage.jsx` now handles (nonce checked).
- `@supabase/supabase-js` still in package.json (rollback) but nothing imports it; it is out of the bundle.
- `npm run build` passes. Dev login page renders, no console errors. Live API not tested: finance-api.raltech.dev does not resolve yet.

## Daily-brief Worker (prepared, NOT deployed)
- Reads GET /state when `FINANCE_API_URL` var + `FINANCE_API_TOKEN` secret are set, else Supabase as before. Admin actions verify the caller via API GET /auth/me when `FINANCE_API_URL` is set.
- Needs: `FINANCE_API_URL` (uncomment in wrangler.toml) and `wrangler secret put FINANCE_API_TOKEN` = HS256 JWT signed with the API `JWT_SECRET`, payload `{"email":"revenueautomationlab@gmail.com","iat":now,"exp":now+1y}` (owner email is always admin). Existing RESEND_API_KEY, TRIGGER_TOKEN stay.
- Still on Supabase: snapshot, OTP, restore (db_snapshots/admin_otp/rpc restore_snapshot) and email_quota. Port before or at cutover, or snapshots will capture stale Supabase data.

## Open / next
1. DNS A `finance-api` -> 72.62.16.1 (proxy off) in raltech.dev; check /healthz + cert.
2. GOOGLE_CLIENT_ID on the API (`/opt/ral-finance/.env`, restart api) and `VITE_GOOGLE_CLIENT_ID` in `.env.local` + Cloudflare Pages env, plus `VITE_API_URL` if not default.
3. Google Cloud OAuth client: authorized JS origins https://finance.raltech.dev and http://localhost:5173; redirect URIs `<origin>/auth/callback` for the fallback.
4. Important: the Pages deploy and the Worker deploy must go together. Once the SPA sends API JWTs, the current Worker (Supabase auth) rejects admin actions.
5. Phase 3: E2E (login, every page, CRUD, totals parity bank BHD 2,730.905, audit revert, brief), final freeze + re-import + cutover.
