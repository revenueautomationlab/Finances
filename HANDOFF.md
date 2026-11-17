# HANDOFF: Finance to VPS, Phase 1 (2026-11-17)

## Done
- VPS `/opt/ral-finance/`: docker-compose.yml (project `ral-finance`), `.env` (chmod 600), `ral-finance-db` (postgres:16-alpine, shared_buffers=64MB, internal network only, volume `ral-finance-pgdata`), `ral-finance-api` (node:22-alpine, pg only, Traefik router `ralfinance-api`, Host finance-api.raltech.dev, certresolver mytlschallenge).
- Schema: `server/db/build_sql.py` turns the Supabase dump into plain SQL (`server/db/schema.sql` committed; data stays out of git in `server/db/out/`). No auth schema, RLS policies or anon/authenticated grants. `auth.jwt()->>'email'` replaced by `current_setting('app.user_email', true)` in `app_user_role()` and `audit_trigger()`.
- Data: all public COPY blocks loaded with session_replication_role=replica (no audit rows created on import). API logs in as role `finance_app` (DML only).
- Backups: `/opt/ral-finance/backup.sh`, root cron `45 3 * * *`, pg_dump -Fc + full restore check + 14 days, log `backups/backup.log`.
- Secrets: `Finances/.vps-creds` (gitignored). GitHub secrets VPS_HOST/VPS_USER/VPS_PASS set on revenueautomationlab/Finances.
- Deploy: `python server/deploy/deploy.py deploy` (also `run "<cmd>"`, `put`). Reload DB from fresh SQL: `/opt/ral-finance/load.sh` (drops VPS copy only).

## Verified
- Row counts: 23/23 tables match the dump exactly (543 rows; audit_log 391, projects 15, payments 22, expenses 17).
- backup.sh: "restore check ok (23 tables, projects 15)". /healthz 200 inside container and via Traefik (curl --resolve). /state without token: 401.
- RAM: db ~67 MiB, api ~13 MiB.

## Open / next
1. DNS: no Cloudflare token with DNS edit found locally (letterlock's CLOUDFLARE_API_TOKEN is only a GitHub secret; wrangler OAuth is zone:read). Add A `finance-api` -> 72.62.16.1, proxy OFF, in zone raltech.dev (dashboard via the saved Playwright profile, or a DNS-edit API token). Then confirm https://finance-api.raltech.dev/healthz is 200 with a valid Let's Encrypt cert (Traefik issues on first hit).
2. GOOGLE_CLIENT_ID: not in the repo (Supabase holds it under Auth > Providers > Google, or Google Cloud console). Put it in `/opt/ral-finance/.env` and `.vps-creds`, then `docker compose up -d api`. Until set, POST /auth/google returns 503.
3. Write-path smoke test (mint JWT, insert + revert, check audit actor) then re-run load.sh to restore parity.
4. Phase 2: frontend API client. Endpoints: GET /healthz, POST /auth/google {credential}, GET /auth/me, GET /state, GET|POST /tables/:t (?on_conflict=col for upsert), PATCH|DELETE /tables/:t/:id, admin: GET|POST /admin/users, PATCH|DELETE /admin/users/:email, GET /admin/audit?limit&table&since, POST /admin/audit/:id/revert, GET /admin/snapshots[/:id]. Snapshot create/restore and OTP still live in the daily-brief Worker (Supabase).
