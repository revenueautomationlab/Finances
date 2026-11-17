# HANDOFF: Finance on the VPS (cutover done 2026-11-17)

## State
- LIVE: https://finance.raltech.dev (Pages build ccacbdb+) -> https://finance-api.raltech.dev (VPS /opt/ral-finance). LE cert valid to 2027-02-15.
- Final sync 2026-11-17 08:21 UTC: Backup Database run 44045734331 -> build_sql.py -> load.sh. 23/23 tables match, 543 rows. Pre-sync VPS dump in /opt/ral-finance/backups/pre-final-sync-*.dump.
- Daily-brief Worker deployed (FINANCE_API_URL var, FINANCE_API_TOKEN svc JWT, 1 year). Preview shows bank BHD 2,730.905. Fixed preheader bug (used missing totalPhysicalBank, showed BHD 0.000).
- Supabase project + keep-alive Worker untouched (cold rollback).

## TLS fix
Labels were fine. LE had rate-limited finance-api (5 failed authz before DNS existed). After the window passed, `docker restart ral-finance-api` re-triggered issuance. acme.json backup: /root/backups/acme/acme-202611170818.json.

## E2E (headless Playwright, scratchpad e2e.py)
- Login page renders, Google button, 0 console errors.
- Admin JWT injected: all 11 pages render, bank BHD 2,730.905 present, 0 console errors.
- API CRUD round trip on domains (create/patch/delete 200), audit rows INSERT/UPDATE/DELETE with actor.
- Brief: preview only. `send=1` was NOT used because MAIL_CC adds a second recipient.

## Open
1. Real Google sign-in by a human on finance.raltech.dev (GIS origins were just added; not testable headless).
2. Optional: send a test brief to suhaibrajabo@gmail.com only (needs a to-override param or a temp MAIL_CC change).
3. After a few weeks stable: retire keep-alive Worker, Supabase project, supabase-js dep and legacy migrate.yml.
4. Re-mint FINANCE_API_TOKEN before 2027-11-17.
