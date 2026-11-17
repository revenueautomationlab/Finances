# HANDOFF: post-cutover verification (2026-11-17, round 1)

## Parity (DONE)
- Fresh Supabase dump (Backup Database run 44048953738) vs VPS `pg_dump --data-only -n public` (PGTZ=UTC), full rows keyed by id, every column compared as text (numeric scale, dates, timestamptz, null vs '', bool, jsonb all exact).
- 22/23 tables identical. audit_log: VPS has 3 extra rows (ids 402-404) = the post-cutover API CRUD test on domains. Expected, not drift.
- Sequences: admin_otp 2, db_snapshots 163 match; audit_log_id_seq 404 on VPS = max(id). No collision risk.
- Tools: scratchpad cmpdb.py, crawl.py, tok2.txt (6h admin + reader JWTs). Pre-test dump: /opt/ral-finance/backups/pre-uitest-202611170844.dump.

## Live UI crawl (crawl.py, headless, admin + reader)
- Admin: all 11 pages render, no NaN/undefined/Invalid Date, no failed API calls. Bank 2,730.905 shown on Dashboard and Bank Savings.
- Modals opened OK: New Project, project detail Add Payment/Add Expense/Add x2, Record Spending, New Budget, Add Spending, Recurring Add + Edit, Payments Add Payment.
- UI creates OK (POST 200, row visible): projects, bank_spending, budgets, payment_schedule. Then deleted via API (200) and audited (INSERT + DELETE rows). No ZZTEST rows remain.
- Only console error: CORS on daily-brief worker `?action=resend-usage` (daily-brief is being removed by another agent; ignore).
- Reader: API POST -> 403 on domains/payments/bank_spending, GET 200. UI shows read-only banner and `guard()` toasts on write (App.jsx:416), but Add/Edit buttons stay visible and modals open (by design, not changed).

## Left (next round)
1. Recurring page: "79.169" not found in body text. Recurring Expenses is a card (App.jsx:3217), not a tab. Check how the VPS expense row renders (maybe year-potential formatting) and whether it is a bug.
2. Admin sub-tabs are `role=tab` (TabsTrigger, App.jsx:1802); crawl used role=button. Re-run with role=tab for Users / Audit Log / Backups, and test Audit Log revert of the ZZTEST INSERT/DELETE rows (app supports revert).
3. Reader crawl: nav timed out from Payments onward (likely a modal left open in ProjectDetail). Close modals before nav and re-run.
4. UI create/edit/delete still to do on: payments, expenses, recurring_* (+ period marks), budget_spending, partners/withdrawals (Vesting), Net Worth, Secret Investment, domains, app_users. Edit + delete through the UI (row buttons title=Edit/Delete) not yet done for any table.
5. Cross-check Reports, Vesting, Net Worth figures against SQL.
6. No code changes made yet, so no build/deploy this round.
