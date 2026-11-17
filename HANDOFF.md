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

## Done 2026-11-17 (round 2)
- GOOGLE_CLIENT_ID = 707921897300-8fcvnq...apps.googleusercontent.com (public; read from the Supabase /auth/v1/authorize redirect). Set in VPS `.env`, `.vps-creds`, and `.env.local` as VITE_GOOGLE_CLIENT_ID (note: `.env.local` is TRACKED in git despite the .gitignore line). api restarted: POST /auth/google junk -> 401.
- Write test (domains table, HS256 JWT minted in the api container, run via `docker exec -i ral-finance-api node - < script`): create/patch 200, audit rows carry actor suhaibrajabo@gmail.com, revert 200 (name restored), delete 200, reader JWT write 403 / read 200. load.sh re-run: 23/23 tables identical to counts.tsv.

## Open / next
1. DNS (BLOCKED): Playwright MCP profile is locked by another session's MCP (node PID 17968, since 11 Nov). The storageState backup's Cloudflare session is expired and Google asks for the RAL password. Wrangler OAuth has no DNS scope; no CF API token on disk. Need: Suhaib adds A `finance-api` -> 72.62.16.1 (grey cloud), or frees the profile / gives a DNS-edit token. Then check https://finance-api.raltech.dev/healthz + LE cert.
2. Google JS origins (BLOCKED, same login issue): GIS test (Playwright route on each origin) shows https://finance.raltech.dev AND http://localhost:5173 are NOT allowed for that client ("origin is not allowed", /gsi/button 403). Add both under Google Cloud > Credentials > that client > Authorized JavaScript origins. Server-side verify does not need them.
3. Phase 2: frontend API client. Endpoints: GET /healthz, POST /auth/google {credential}, GET /auth/me, GET /state, GET|POST /tables/:t (?on_conflict=col for upsert), PATCH|DELETE /tables/:t/:id, admin: GET|POST /admin/users, PATCH|DELETE /admin/users/:email, GET /admin/audit?limit&table&since, POST /admin/audit/:id/revert, GET /admin/snapshots[/:id]. Snapshot create/restore and OTP still live in the daily-brief Worker (Supabase).
