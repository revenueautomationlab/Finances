# HANDOFF: Finance to VPS (2026-11-17, after Phase 2 code)

## Phase 1 (done, see git history for detail)
VPS `/opt/ral-finance/`: ral-finance-db (postgres 16) + ral-finance-api (server/server.js) behind Traefik, Host finance-api.raltech.dev. 23/23 tables row parity, backup.sh 03:45 cron with restore check. Deploy: `python server/deploy/deploy.py deploy`. Creds: `.vps-creds` (gitignored).

## Phase 2 (code done, not deployed, not pushed)
- `src/services/supabaseService.js`: no supabase-js. fetch to `VITE_API_URL` (default https://finance-api.raltech.dev). Same exports and return shapes; App.jsx unchanged. JWT in localStorage `ral_finance_api_token`; 401 or expired token clears it and signs out.
- `src/contexts/AuthContext.jsx`: Google Identity Services prompt (`VITE_GOOGLE_CLIENT_ID`), ID token to POST /auth/google, role from GET /auth/me on reload, auto sign-out at JWT expiry (12 h). Same context shape plus `completeSignIn`. If the GIS prompt cannot show, falls back to a full-page Google redirect (response_type=id_token) to `/auth/callback`, which `AuthCallbackPage.jsx` now handles (nonce checked).
- `@supabase/supabase-js` still in package.json (rollback) but nothing imports it; it is out of the bundle.
- `npm run build` passes. Dev login page renders, no console errors. Live API not tested: finance-api.raltech.dev does not resolve yet.

## Daily-brief Worker (Supabase-free, NOT deployed)
- All data via the API: GET /state, POST /admin/snapshots (cron, by="cron"), POST /admin/otp (stores code hash), PUT /admin/email-quota. Admin check = API GET /auth/me. Snapshot/restore actions forward the caller JWT to the API.
- wrangler.toml now sets FINANCE_API_URL; SUPABASE_* vars removed. Needs `wrangler secret put FINANCE_API_TOKEN` = HS256 JWT (API JWT_SECRET), payload `{"email":"revenueautomationlab@gmail.com","svc":true,"iat":now,"exp":now+1y}`. svc=true is REQUIRED for /admin/otp and /admin/email-quota.
- `cloudflare/keep-alive` still pings Supabase on purpose (keeps the rollback project awake); retire after cutover.

## Done 2026-11-17 (round 3, snapshot/OTP/restore port)
- API (deployed, only ral-finance-api restarted): snapshot create from live VPS data (last 30), restore = OTP burn + pre-restore safety snapshot + restore_snapshot() in ONE tx. SPA calls the API directly for snapshot and restore. Backup first: /opt/ral-finance/backups/pre-snapshot-port-202611170735.dump.
- 15/15 tests pass in-container (scratch t.js, minted JWTs): create admin/svc, list, get (16 tables), OTP svc-only, wrong code 403, bad id 404 keeps code valid, restore undoes a PATCH, code single-use, safety snapshot, quota svc-only, /state. Real OTP email not sent (Worker not deployed). load.sh re-run after tests: 23/23 tables identical to server/db/out/counts.tsv, api healthy.
- `npm run build` and `wrangler deploy --dry-run` pass.

## Done 2026-11-17 (round 2)
- GOOGLE_CLIENT_ID = 707921897300-8fcvnq...apps.googleusercontent.com (public; read from the Supabase /auth/v1/authorize redirect). Set in VPS `.env`, `.vps-creds`, and `.env.local` as VITE_GOOGLE_CLIENT_ID (note: `.env.local` is TRACKED in git despite the .gitignore line). api restarted: POST /auth/google junk -> 401.
- Write test (domains table, HS256 JWT minted in the api container, run via `docker exec -i ral-finance-api node - < script`): create/patch 200, audit rows carry actor suhaibrajabo@gmail.com, revert 200 (name restored), delete 200, reader JWT write 403 / read 200. load.sh re-run: 23/23 tables identical to counts.tsv.

## Open / next
1. DNS (BLOCKED): Playwright MCP profile is locked by another session's MCP (node PID 17968, since 11 Nov). The storageState backup's Cloudflare session is expired and Google asks for the RAL password. Wrangler OAuth has no DNS scope; no CF API token on disk. Need: Suhaib adds A `finance-api` -> 72.62.16.1 (grey cloud), or frees the profile / gives a DNS-edit token. Then check https://finance-api.raltech.dev/healthz + LE cert.
2. Google JS origins (BLOCKED, same login issue): GIS test (Playwright route on each origin) shows https://finance.raltech.dev AND http://localhost:5173 are NOT allowed for that client ("origin is not allowed", /gsi/button 403). Add both under Google Cloud > Credentials > that client > Authorized JavaScript origins. Server-side verify does not need them.
3. Phase 2: frontend API client. Endpoints: GET /healthz, POST /auth/google {credential}, GET /auth/me, GET /state, GET|POST /tables/:t (?on_conflict=col for upsert), PATCH|DELETE /tables/:t/:id, admin: GET|POST /admin/users, PATCH|DELETE /admin/users/:email, GET /admin/audit?limit&table&since, POST /admin/audit/:id/revert, GET /admin/snapshots[/:id]. Snapshots: GET|POST /admin/snapshots, GET /admin/snapshots/:id, POST /admin/snapshots/:id/restore {code}; svc only: POST /admin/otp, PUT /admin/email-quota.
