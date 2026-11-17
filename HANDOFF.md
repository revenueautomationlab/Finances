# HANDOFF: post-cutover verification (2026-11-17, round 2)

Scratchpad tools: crawl2.py (admin+reader crawl, console capture, audit revert), crud.py (API CRUD on 13 tables),
sql.sh <file.sql> (psql on VPS db `finance` via custompc/scripts/kvm.py), tok2.txt (JWTs, valid to ~17:40 AST).

## Round 1 (done): data parity Supabase vs VPS passed (22/23 identical, audit_log +3 expected test rows).

## Round 2 results
1. Recurring 79.169: NOT a bug. Page opens on Revenue tab; Expenses tab row "KVM2 VPS Hosting (Hostinger)" shows
   BHD 79.169, yearly, paid badge 1. DB: amount 79.169, one payment 79.169 for period 2026-11-01. Expense cost card
   shows BHD 127.434 paid out = SQL sum of recurring_expense_payments.
2. Admin: Users & Roles, Audit Log, Backups & Restore tabs render, no NaN/undefined. UI Revert of an UPDATE on test
   domain zztest-rev worked (toast "Change reverted", DB notes back to original, revert itself audited).
3. Reader crawl: all 10 reader pages render, 0 console errors, 0 HTTP >= 400. Admin nav hidden for reader (expected).
4. Totals vs SQL all match: revenue 4,968.408 (payments 4,733.408 + recurring 235), outgoing 1,703.317
   (expenses 848.754 + bank 717.129 + budget 10 + recurring 127.434), net 3,265.091, withdrawals 267.093 each,
   bank 2,730.905, budgets 10/10, Payments page in 235 / out 243.357 (schedule 227.320 + domains 16.037),
   projects unpaid 3,250 (one project overpaid by 0.408). Secret Investment and dividends tables empty (0).
5. Writes: API create+update+delete with ZZTEST ids on all 13 listed tables: all 200, every change in audit_log
   (INSERT, UPDATE, DELETE). 0 ZZTEST rows left. Round 1 did UI creates (projects, bank, budgets, schedule).
6. Console: 0 errors on every page for admin and reader (daily-brief CORS error is gone).

## Left
- UI-driven edit/delete clicks (pencil / trash icons) not exercised per table; the UI calls the same /tables
  endpoints tested above. Trash buttons have no title attribute, so a future crawl needs icon selectors.
- No code changes in round 2, so no build or deploy was needed.
