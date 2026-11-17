# HANDOFF: Finance on the VPS (cutover done 2026-11-17)

## State
- LIVE: https://finance.raltech.dev (Cloudflare Pages, git-connected) -> https://finance-api.raltech.dev (VPS /opt/ral-finance). LE cert valid to 2027-02-15.
- Final sync 2026-11-17: 23/23 tables match, 543 rows. Pre-sync dumps in /opt/ral-finance/backups/.
- Daily brief REMOVED 2026-11-17: Worker deleted, folder gone, `svc` token path dropped from the API.
- The API now sends the restore code (POST /admin/otp), invite emails (POST /admin/invite), serves Resend usage (GET /admin/email-usage) and takes the daily `cron` snapshot at 05:00 UTC in-process. Env RESEND_API_KEY in /opt/ral-finance/.env and .vps-creds.
- Supabase project + keep-alive Worker untouched (cold rollback). Reminder email scheduled for 2026-11-24 09:00 Bahrain to retire them.

## Stored items (no values here)
| Item | Where |
|---|---|
| VPS SSH | `.vps-creds` (VPS_*), GH secrets VPS_HOST/VPS_USER/VPS_PASS, `custompc/.kvm-creds` |
| DB passwords, JWT_SECRET, GOOGLE_CLIENT_ID, RESEND_API_KEY | VPS `/opt/ral-finance/.env` + `.vps-creds` |
| Google client ID (SPA) | Pages env `VITE_GOOGLE_CLIENT_ID` |
| Deploy steps | CLAUDE.md "VPS" section (`server/deploy/deploy.py deploy`) |
| Backups | cron 03:45 `/opt/ral-finance/backup.sh` -> /opt/ral-finance/backups (restore check, 14 days); copy /root/backups/finance-db |

## Open
1. Real Google sign-in by a human on finance.raltech.dev.
2. Test "Send code" (restore OTP) and an invite from the Admin page once signed in.
3. 2026-11-24: retire keep-alive Worker, Supabase project, SUPABASE_* GH secrets, backup.yml/migrate.yml, supabase-js dep.
