# Finance: Supabase to VPS migration (started 2026-11-17)

Goal: move the RAL Finance DB off hosted Supabase (`mssxrafomjlzoypjvjdu`) to the RAL VPS, same pattern
as the other apps (own `postgres:16-alpine` container, API container behind Traefik, cron backups).
Keep every row. Supabase stays untouched as the rollback until parity is proven.

## Target
| Item | Value |
|---|---|
| Server folder | `/opt/ral-finance/` (incoming/, app/, backups/, `.env` chmod 600, docker-compose.yml) |
| DB | own `postgres:16-alpine` container `ral-finance-db`, `shared_buffers=64MB` (RAM is tight) |
| API | small Node API container `ral-finance-api`, Traefik labels, host `finance-api.raltech.dev` (grey-cloud A record to 72.62.16.1) |
| SPA | stays on Cloudflare Pages (finance.raltech.dev), env points to the API |
| Auth | Google sign-in kept: Google ID token verified by the API, `app_users` allowlist + roles (admin/full/read) enforced server-side, API issues its own JWT |
| Backups | letterlock `deploy/backup.sh` pattern: 03:45 cron, `pg_dump -Fc`, restore check into scratch DB, 14 days |
| Creds | gitignored `.vps-creds` / server `.env`; GitHub secrets VPS_HOST, VPS_USER, VPS_PASS. Never in git |

## Phases
| # | Phase | Status |
|---|---|---|
| 1 | Infra + schema + data import + backups on VPS (staging, no cutover) | done 2026-11-17 except DNS: ral-finance-db + ral-finance-api up in /opt/ral-finance, 23/23 tables row-count parity with the 2026-11-17 dump, backup.sh 03:45 cron + restore check ok, GH secrets VPS_*. Open: finance-api DNS record, GOOGLE_CLIENT_ID (see HANDOFF.md) |
| 2 | Frontend: replace supabaseService/AuthContext with API client; daily-brief Worker repointed | code done 2026-11-17, build passes; not deployed. Blocked on DNS + Google client ID for live test (see HANDOFF.md) |
| 3 | E2E: login, every page, CRUD, totals parity (bank BHD 2,730.905), audit log + revert, brief; final freeze + re-import + cutover | todo |

## Safety
- Local backup: `C:\Users\Suhaib\Desktop\RAL\backups\finance-db\2026-11-17\`; VPS copy `/root/backups/finance-db/`.
- Final dump from Supabase right before cutover; row counts per table must match.
- Do not touch other apps' containers on the VPS. Never kill node/chrome by name.
