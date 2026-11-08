# RAL Finance - Project Guide

## Overview
Project finance tracker for Revenue Automation Lab (RAL). Tracks client projects (free or paid). **The bank holds ALL our money** — a single cash-basis balance = every dinar actually received minus everything actually spent, paid to partners, and moved to secret investment. There is **no profit-split pot** and **no "bank spendable"** figure. The **10% founder shares** (Suhaib/Mohammed) are still displayed, derived from project profit, but they're informational (money only leaves the bank when a withdrawal/dividend is recorded). **Secret Investment is a year-end event**: 25% of each year's net profit is set aside — at year-end we physically move it out, "mark as moved" (recorded in `secret_investment_transfers`), and it reduces the bank; you can browse previous/future years. **Everything is cash-basis**: a figure counts only once money is received/paid via dated records (recurring revenue/expenses count only when a period is marked received/paid, tagged or general). Domain expiries and recurring end-dates trigger countdown alerts.

## Tech Stack
- **Frontend**: React 18 + Vite 4 (vanilla JSX, no TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Google OAuth via Supabase Auth (restricted to `revenueautomationlab@gmail.com`)
- **Routing**: react-router-dom v6
- **Hosting**: Cloudflare Pages (`finance.raltech.dev`, also reachable at `ral-finance.pages.dev`)
- **Currency**: BHD (Bahraini Dinar, 3 decimal places)
- **Migrations**: Supabase CLI + GitHub Actions auto-deploy
- **MCP Tools**: Playwright (browser automation/testing), shadcn (UI components)

## File Structure
```
src/
├── App.jsx ........................ Main app — all views, CRUD, modals, sidebar, dashboard (~3000+ lines)
├── main.jsx ....................... Entry point — routing, ProtectedRoute, AuthProvider
├── style.css ...................... Full design system — custom CSS, responsive
├── services/
│   └── supabaseService.js ......... All Supabase DB operations (fetchState, all CRUD functions)
├── contexts/
│   └── AuthContext.jsx ............ Auth context — Google OAuth, email validation, force sign-out
└── pages/
    ├── LoginPage.jsx .............. Login page with Google sign-in
    └── AuthCallbackPage.jsx ....... OAuth callback handler (explicit session exchange, 15s timeout fallback)

supabase/
├── config.toml .................... Supabase CLI config
└── migrations/ .................... Database migrations (auto-deployed on push)
    ├── 20260320000000_initial_schema.sql ... Baseline: projects, payments, expenses, bank_spending, charity_spending
    ├── 20260320010000_rename_shares.sql .... Rename charity_spending → secret_investment_spending
    ├── 20260320020000_partner_withdrawals.sql .. Partner withdrawals table
    ├── 20260320030000_budgets.sql .......... Budgets + budget_spending tables
    ├── 20260320040000_recurring.sql ........ Recurring revenue + expenses tables
    ├── 20260320050000_recurring_payments.sql .. Period-paid tracking tables
    ├── 20260320060000_recurring_nullable_dates.sql .. Make start_date / next_due nullable
    ├── 20260510000000_dividends_domains_expiries.sql .. partner_dividends, domains, end_date columns
    ├── 20260615000000_payment_schedule.sql .. payment_schedule + payment_schedule_payments (tracking layer) + sample seed
    └── 20260701000000_secret_investment_yearly.sql .. secret_investment_transfers (yearly 25% set-aside) + RBAC/audit; recurring_*_payments.project_id nullable (general recurring markable); payment_schedule_payments.amount (frozen per-occurrence)
    └── 20260721000000_partners_vesting.sql .. partners table (vesting_start per partner, seeded suhaib/mohammed/hisham) + RBAC/audit; widens partner_name CHECKs to include 'hisham'

cloudflare/
├── keep-alive/
│   ├── wrangler.toml .............. Worker config — cron `0 8 * * *` (daily 08:00 UTC), [vars] hold public Supabase URL + anon key
│   └── src/
│       └── index.js ............... Worker that pings Supabase `/rest/v1/projects` daily (real DB query — counts as activity), falls back to `/auth/v1/health`, to prevent free-tier pausing
└── daily-brief/
    ├── wrangler.toml .............. Worker config — cron `0 5 * * *` (08:00 Asia/Bahrain), [vars] hold Supabase URL + MAIL_FROM/TO/CC
    ├── README.md ................. Setup: Resend domain verification + `wrangler secret put` steps + manual test URL
    └── src/
        └── index.js ............... Daily brief email: reads DB via service_role, sends ONE mobile-responsive email via Resend — payments due tomorrow + this week, yesterday's transactions, KPI snapshot

.github/
└── workflows/
    └── migrate.yml ................ Auto-deploys migrations on push to main (+ manual workflow_dispatch)
```

## Database Schema
Tables:
- `projects` — client projects (`total_value` may be 0 for "free + recurring upsell" projects)
- `payments` — project payments (FK to projects, CASCADE delete)
- `expenses` — project expenses (FK to projects, CASCADE delete)
- `bank_spending` — general spending from the bank
- `secret_investment_spending` — **DEPRECATED** (old pot model). No longer used by the UI; kept for audit history.
- `secret_investment_transfers` — yearly secret-investment set-aside: `year` (UNIQUE), `amount`, `moved_date`, `note`. One "moved" row per year; reduces the bank.
- `partners` — the 3 fixed partners (suhaib/mohammed/hisham) with nullable `vesting_start` DATE. Seeded rows with ids `partner_<name>`. Drives the Vesting/Net Worth pages and Hisham's activation as a 10% profit partner.
- `partner_withdrawals` — share-based withdrawals (drawn against the partner's accumulated 10% share); CHECK on partner_name ('suhaib'/'mohammed'/'hisham')
- `partner_dividends` — bank-funded dividend payouts (the salary mechanism); CHECK on partner_name (same 3)
- `budgets` — budget categories with name, allocated_amount, description
- `budget_spending` — spending against budgets (FK to budgets, CASCADE delete)
- `recurring_revenue` — recurring revenue items (nullable project_id, frequency: monthly/yearly, active, optional `end_date` for expiry alerts)
- `recurring_expenses` — recurring expense items (nullable project_id, frequency: monthly/yearly, active, optional `end_date`)
- `recurring_revenue_payments` — received-period records for recurring revenue (UNIQUE on recurring_revenue_id+period_date). `project_id` is **nullable** — general (untagged) recurring is markable too, credited to the bank.
- `recurring_expense_payments` — paid-period records for recurring expenses (UNIQUE on recurring_expense_id+period_date). `project_id` **nullable** (general recurring expenses).
- `domains` — owned domains with `expiry_date`, optional `project_id` and `recurring_revenue_id` links, `registrar`, `auto_renew`, `notes`
- `payment_schedule` — **tracking-only** payment todos (NOT money). `direction` ('incoming'/'outgoing'), `category` (domain/cr/vps/hosting/apple/android/amc/other), `name`, `amount`, `frequency` (monthly/yearly/one_time), `start_date`, optional `end_date`, nullable `project_id`, `active` (false = closed/ended), `notes`
- `payment_schedule_payments` — one row per due occurrence marked paid (the "todo done" record); UNIQUE on (payment_schedule_id, period_date), CASCADE delete. Has a nullable `amount` — captured at mark-paid so each occurrence/year is frozen independently (editing an item's future amount never rewrites a paid year).

All tables have:
- RLS enabled (authenticated users only)
- Indexes on `project_id` and `date` columns where applicable

## Database Migrations (IMPORTANT)
- **All DB changes go through migration files** in `supabase/migrations/`
- Migration files use timestamp format: `YYYYMMDDHHMMSS_description.sql`
- On push to `main`, GitHub Action auto-deploys new migrations via `supabase db push --include-all --yes`
- GitHub secrets required: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`
- When making DB changes: create a new migration file, update frontend code to match
- **PostgreSQL does NOT support `CREATE POLICY IF NOT EXISTS`** — use `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` blocks instead
- Use `IF NOT EXISTS` / `IF EXISTS` for tables and indexes (but NOT for policies)

### Data API exposure (Supabase change effective Oct 30, 2026)
Starting Oct 30, 2026, Supabase removes the default grant of `public` schema tables to the `authenticated` / `anon` roles. New tables created after that date won't be reachable via PostgREST / supabase-js unless you add an explicit `GRANT`.

**Existing tables in this project (created before Oct 30, 2026) keep their implicit grants permanently — no fix needed.** This applies only to future tables.

When creating a new table in a migration after this date, include the grant. This app only uses the `authenticated` role (no anon access — auth is enforced by AuthContext):

```sql
CREATE TABLE IF NOT EXISTS my_table (
  id TEXT PRIMARY KEY,
  ...
);

-- Explicit grant — required for tables created on/after Oct 30, 2026
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_table TO authenticated;

ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Auth manage my_table" ON my_table FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

Note: this app uses TEXT primary keys (not SERIAL/IDENTITY), so no sequence grants are needed. Don't grant to `anon` — the SPA never uses the anon role for data access.

## Business Logic

### Project Profit (cash-basis; drives the 10% founder display)
Per-project profit uses only cash actually received/paid.
- **contractPayments** = sum of `payments` records for the project
- **projRecurringPaid** = sum of `recurring_revenue_payments` for this project (`rp.project_id === p.id`)
- **projRecurringExpPaid** = sum of `recurring_expense_payments` for this project (cash-basis, NOT accrual)
- **totalRevenue** = contractPayments + projRecurringPaid
- **totalExpenses** = project `expenses` + projRecurringExpPaid
- **profit** = totalRevenue − totalExpenses
- **Per-project founder shares** (only when profit > 0): `suhaibShare` = `mohammedShare` = profit × 0.10. **Informational per-project display ONLY** — actual withdrawable balances do NOT use these (see Partner Compensation).
- **unpaid** = max(0, totalValue − contractPayments). Free projects (`totalValue = 0`) show "Free". Status badge tracks contract only.
- **isPaid** = unpaid <= 0

### Recurring Revenue/Expense Flow (cash-basis)
- ALL recurring (tagged AND general) is credited only when a period is marked received/paid via `recurring_*_payments`. The Recurring view has an expandable per-period mark-paid table for every item; project-linked items also appear in Project Detail. General items use `project_id = null` on the payment record.
- Received recurring revenue and paid recurring expenses flow into the cash-basis bank like any other dated income/expense. No flat `active × amount` projection is used in money math (that only appears as informational "Year Potential").

### Partner Compensation
1. **10% Share** — earned = `max(0, incomeReceived − expensesPaid) × 0.10` on COMPANY-WIDE cash (so bank spending + budget spending reduce shares — fixed 2026-07-21; 250 in + 250 bank-spent = 0 share). Drawn down via `partner_withdrawals`; Available = earned − withdrawn. **Hisham** earns 10% too, but only on income/spending dated ≥ his `partners.vesting_start` and only once that date is set and ≤ today (`hishamActive`).
2. **Bank Dividends** — payouts recorded in `partner_dividends`, drawn from the bank (capped by `bankBalance`). The salary mechanism.
Both reduce the bank when recorded. All partner-facing UI maps over `partnerFin` (built from `PARTNER_META`; Hisham appears once active).

### Vesting & Net Worth (pages, display-only — no money math)
- **Vesting**: 1/3 equity each, 4-year (48 mo) monthly vesting, 1-year cliff = 25% at once, then 1/48/month. Pure functions `monthsSince`/`vestingStatus(startStr)` in App.jsx compute from today's date each render (auto-updates daily). Start date set/changed/cleared per partner on the Vesting page → `partners.vesting_start` (`setPartnerVestingStart`). Setting Hisham's start also activates his 10% profit share.
- **Net Worth**: company valuation = revenue of last 365 days, annualized if history < 1 year (`rev × 365/daysOfData`, e.g. 3 months → ×4), × 10. Per partner: max = valuation/3, current = max × vestedFraction.

### Secret Investment (yearly, 25% — after payouts)
- **netProfitForYear(Y)** = incomeReceived(in Y) − expensesPaid(in Y) — net profit BEFORE paying ourselves (drives the Dashboard Net Profit + margin).
- **finalNetForYear(Y)** = netProfitForYear(Y) − distributions(in Y) (withdrawals + dividends) — the final amount after we pay ourselves.
- **secretDueForYear(Y)** = `max(0, finalNetForYear(Y)) × 0.25`. The Secret Investment view shows the full Revenue → −Expenses → Net (before) → −Payouts → Final (after) → ×25% breakdown.
- At year-end, "Mark as moved" writes a `secret_investment_transfers` row (`year`, `amount` default = due, `moved_date`), which **reduces the bank**. Undo = delete the row. The Secret Investment view is a **year browser** (prev/current/future).

### Bank & Cash Position (the only bank figure)
- **incomeReceived(pred)** = contract `payments` + `recurring_revenue_payments`, filtered by date predicate.
- **expensesPaid(pred)** = project `expenses` + `recurring_expense_payments` + `bank_spending` + budget `spending`.
- **distributions** = `partner_withdrawals` + `partner_dividends`.
- **secretMovedTotal** = sum of `secret_investment_transfers.amount`.
- **bankBalance** = `incomeReceived() − expensesPaid() − distributions() − secretMovedTotal` (cumulative, all-time = all our real money). Replaces the old `globalBank`/`bankSpendable`/`totalPhysicalBank`.
- **globalRevenue** = `incomeReceived()` (all cash received).

### Operating vs Distributions
- **operatingOutflow** = `expensesPaid()` (project + recurring paid + bank + budget spending). Does NOT include partner payouts or secret transfers.
- **operatingNet** = globalRevenue − operatingOutflow (cash the business made before paying owners).
- **globalMargin** = operatingNet ÷ globalRevenue × 100 (operating margin).
- **totalDistributions** = partner withdrawals + dividends. **secretMovedTotal** = secret transfers. Both, plus operatingOutflow, subtract from `bankBalance`.

### Expiry Alerts
- `daysUntil(date)` and `reminderThresholdDays(frequency)` (90 days for yearly, 7 for monthly).
- The `expiryAlerts` memo aggregates:
  - Domains with `expiry_date ≤ 90 days` away (suppressed if another row with the same `name` has a later expiry — i.e. a renewal entry exists)
  - Active recurring revenue with `end_date ≤ threshold` (suppressed if a successor active recurring revenue exists with the same project_id (or matching description for general items) and `start_date > end_date`)
- Severity levels: `overdue` (negative days), `urgent` (≤ 30d for domains, ≤ ⅓ threshold for recurring), `soon` otherwise.
- Rendered as `<ExpiryAlertsBanner>` at the top of the Dashboard.

### Payment Tracking (tracking-only — NEVER affects money)
A todo/reminder layer for incoming & outgoing obligations (domains, CR, VPS, Apple/Android, AMC, etc.). **Deliberately isolated from all bank/profit/margin math** — `paymentSchedule`/`paymentSchedulePayments` appear only in their own memos + `PaymentsView`, never in `globalBank`, `projectStats`, `operatingOutflow`, `bankSpendable`, or `totalPhysicalBank`.
- **Occurrences**: `generatePaymentOccurrences(startDate, frequency, endDate)` generates actual due dates (monthly/yearly preserving day-of-month, clamped to month end; `one_time` = single date) from `start_date` up to a horizon, bounded by `end_date`.
- **`paymentItemStatus(item, paidPeriods)`**: "next due" anchors on the CURRENT cycle (latest occurrence ≤ today) + future cycles — older unpaid cycles stay in the history panel but don't nag. Returns `{ occurrences, nextDue, overdueCount, paidCount, settled }`.
- **Mark paid**: a `payment_schedule_payments` row for (item, period_date). Marking the current due paid advances `nextDue` to the next cycle — recurs until `end_date` or until `active` is set false ("Close / End"). `one_time` becomes settled once paid.
- **Expanded history panel** (per item): shows start date + frequency, an **Upcoming** section (next few, pre-payable) and a full **History** section (all past/current occurrences, newest-first, **uncapped** — overdue-unpaid shown red, paid green). Bulk actions: **Catch up to today** (`markPaidThrough` marks every occurrence ≤ today paid) and **Clear all** (`clearPayments`). **Unmatched paid records**: paid rows whose `period_date` isn't in the current occurrence grid (after a start-date/frequency edit) are surfaced as amber chips to remove — this is why editing an item's start can leave "ghost" paid counts.
- **Domains** are folded into the Payments tab as a category, read from the `domains` table (renewal due = `expiry_date`); "Renew" bumps `expiry_date` +1 year. Domain expiry still drives `expiryAlerts` independently.
- **Memos**: `paidPeriodsByScheduleItem` (Set per item), `paymentTimeline` (next unpaid occurrence per active item + domain renewals, sorted by date), `paymentsBadgeCount` (entries due ≤14 days — the sidebar badge).

### Daily Brief Email (cloudflare/daily-brief)
Cloudflare Worker, cron `0 5 * * *` (08:00 Asia/Bahrain). Reads the DB with the **service_role** key (bypasses RLS) and sends ONE mobile-responsive HTML email via **Resend** to `revenueautomationlab@gmail.com`, cc `saeedalsaeedbusiness@gmail.com` + `suhaibrajabo@gmail.com`. Contents: payments **due tomorrow** (the reminder) + overdue + rest-of-week, **yesterday's transactions**, and a **KPI snapshot** (`computeSnapshot()` is a faithful port of App.jsx profit/bank/margin math — keep in sync). Secrets via `wrangler secret put`: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TRIGGER_TOKEN` (guards the `/?token=…[&send=1]` manual preview/send endpoint). Sender `reminders@mail.raltech.dev` (domain `mail.raltech.dev` verified in the Resend account revenueautomationlab@gmail.com; see worker README).

### Roles, Audit & Admin (multi-user)
- **Roles**: `app_users` (email → `reader`|`full`, status). `revenueautomationlab@gmail.com` is hard-coded to `admin` in `app_user_role()` (never lockable-out). Helpers `app_can_read()` / `app_can_write()` / `app_is_admin()`. **Role-aware RLS + audit on all data tables** (now 17, incl. `secret_investment_transfers`; reader = SELECT only; full = read/write/delete; admin = all). `service_role` (workers) bypasses RLS.
- **TODO (backup/restore gap):** `db_snapshots` + `restore_snapshot()` still cover the original 16 business tables — `secret_investment_transfers` and `partners` are not yet backed up/restored (they survive a restore untouched). Add them to the snapshot list + `restore_snapshot` RPC when convenient.
- **Auth**: `AuthContext.resolveAccess()` allows the admin + any active onboarded Gmail; exposes `role`/`isAdmin`/`canWrite`. Non-onboarded accounts are force-signed-out. UI write guard `guardWrite()` (RLS is the real enforcement).
- **Audit log**: `audit_log` + AFTER row triggers (`audit_trigger`, SECURITY DEFINER) on every data table → old/new JSONB + actor email + timestamp. Admin-only SELECT; admin UPDATE only sets `reverted_at`. Per-change revert via `applyAuditRevert()` (INSERT→delete, DELETE→re-insert, UPDATE→restore old; the revert is itself audited).
- **Admin page** (`AdminView`, admin-only nav): Users & Roles (onboard sends an invite email), Audit Log (filter + per-change Revert), Backups (list snapshots, Back up now, Export JSON, OTP-gated Restore).
- **Backups/restore (Phase 2)**: `db_snapshots` (daily cron + on-demand, keeps last 30), `admin_otp`, and `restore_snapshot(id)` RPC (swaps only the 16 business tables via `session_replication_role=replica`; service_role-only execute). The daily-brief worker gained admin-gated actions (`?action=invite|snapshot|otp|restore`) that verify the caller's Supabase JWT is an admin and use the service_role key; restore takes a safety snapshot first and requires an OTP emailed to the owner. SPA calls the worker at `…workers.dev/?action=…` with the user's access token.
- **Domain renewal cost**: `domains.renewal_cost` flows into the Payments tab outgoing totals/timeline/email (still tracking-only — not in bank/profit math).

### Key Computed Values (all via useMemo or top-level memos)
- `projectStats` — per-project: `{ contractPayments, projRecurringPaid, projRecurringExpPaid, totalRevenue, totalExpenses, profit, suhaibShare, mohammedShare, unpaid, isPaid, ... }` (no bankShare/secretInvestmentShare)
- `incomeReceived(pred)` / `expensesPaid(pred)` / `distributions(pred)` — cash-basis primitives (date predicate)
- `bankBalance` — all our money (cumulative). **The** bank figure.
- `netProfitForYear(y)` / `secretDueForYear(y)` / `secretMovedForYear(y)` — yearly secret-investment math
- `recurringRevenueIncome` — `{ projectLinkedPaid, generalPaid, total }` (all from payment records)
- `globalContractRevenue` — sum(p.contractPayments); `globalRevenue` — incomeReceived()
- `globalExpenses` — project + recurring-expense-paid (the "expenses" card); `operatingOutflow` — expensesPaid()
- `operatingNet` / `globalMargin` — pre-distribution net & margin
- `totalDistributions` — withdrawals + dividends; `secretMovedTotal` — secret transfers
- `budgetStats`, `expiryAlerts` — unchanged

## App Views
1. **Dashboard** — Clean period-selectable KPI header: a year stepper (◀ 2026 ▶) + **All time** toggle (`dashPeriod` state) drives 4 cards for that period — **Total Revenue** (contract + recurring), **Outgoing** (incl. recurring), **Net Profit** (before we pay ourselves), **Margin**. Then expiry alerts, Founder Shares (10%/10%), Partner Balances (share-withdraw + bank-dividend), quick overview, projects table. (Removed the old Total-Expenses/Operating-Outflow/Total-in-Bank/Secret/Recurring/Project-Profit/Year-Potential cards — Total in Bank + Year Potential now live in the sidebar footer.)
2. **Projects** — Summary stats (paid/unpaid/expenses/project profit/all-in margin/in-bank), project cards with payment progress (free projects show "Free" badge)
3. **Project Detail** — Contract value (or "Free + Recurring" badge), payments and expenses tables, profit split (contract-only), recurring revenue periods (mark paid/unpaid), recurring expenses periods
4. **Bank** — Total in bank (`bankBalance` = all our money), money received / spent / paid-out cards, "Where the money went" composition (received − expenses − payouts − secret moved = balance), partner dividends payout & history, spending history, per-project profit contributions
5. **Budgets** — Budget cards with progress bars, spending tracking, CRUD
6. **Recurring** — Revenue + expenses tables with frequency, project, end-date column (yellow when within reminder threshold), active/pause, full CRUD. Add-revenue modal supports optional inline domain creation.
7. **Payments** — Tracking-only payment todos (does not affect money). Header note states this. Stat cards (Due This Week / Overdue / Outgoing ≤30d / Incoming ≤30d). Sub-tabs: **Upcoming** (timeline grouped Overdue / This week / Next 30 days / Later — next unpaid occurrence per active item + domain renewals, with Mark-paid / Renew), **Outgoing** + **Incoming** (management lists: next due, status, ✓N paid, edit/close-reopen/delete, expandable per-occurrence history toggle), **Domains** (the folded-in `<DomainsView embedded />` — full domain CRUD). Sidebar nav shows a badge of items due ≤14 days.
8. **Reports** — Monthly P&L (contract + recurring revenue), Partner Summary (earned/withdrawn/dividends, all partners), Budget Utilization, Recurring Obligations, Cash Flow Summary (with dividends + recurring lines), Project Performance
9. **Vesting** — per-partner vesting cards (set/change/clear start date, cliff/vesting/done status, progress bar, done vs in-progress equity, cliff/next/full dates) + schedule explainer
10. **Net Worth** — valuation cards (last-365d revenue, annualized, 10x valuation) + per-partner current (vested) vs maximum net worth + calculation explainer
11. **Secret Investment** — Yearly browser (prev/current/future year selector). Per year: net profit, 25% due, Moved/Pending status, "Mark as moved" (writes a `secret_investment_transfers` row → reduces bank), and a transfer-history table across years.

## Key Patterns
- Single-file App.jsx with nested function components
- All state via `useState` — no external state library
- Computed values via `useMemo` (projectStats, globalBank, globalSecretInvestment, budgetStats, bankSpendable, totalPhysicalBank)
- Every CRUD op: async call to Supabase → refresh all data → show toast (success + error)
- All numeric form values use `parseFloat()` before sending to DB (form inputs return strings)
- ModalForm `handleSubmit` does NOT call `onClose()` — modal stays open on error, CRUD success calls `setModal(null)`
- Confirmation dialogs for all delete operations
- ModalForm supports text, number, date, and select field types
- Red border validation on required fields (`input:required:invalid:not(:focus):not(:placeholder-shown)`)
- Mobile-responsive with hamburger menu sidebar (conditional rendering, no CSS display toggle)
- Auth: `clearSupabaseStorage()` purges all sb-* keys; `forceFullSignOut()` with `scope: "global"` handles denied access; `isForceSigningOut` ref prevents race conditions; `prompt: "select_account"` forces Google account picker on every sign-in

## Local Development
- Run `bun dev` to start the local dev server at `http://localhost:5175` (port forced via `strictPort: true` in vite.config.js)
- OAuth redirect uses `window.location.origin` automatically — resolves to `localhost:5175` locally and `finance.raltech.dev` in prod
- **Supabase dashboard requirement**: `http://localhost:5175/auth/callback` must be listed in Authentication → URL Configuration → Redirect URLs
- `.env.development` contains Supabase credentials (gitignored) — same Supabase project for local and production
- AuthCallbackPage explicitly exchanges session on mount (checks URL hash/code params)
- **DEV auth bypass (local testing only):** set `VITE_AUTH_BYPASS=true` in `.env.development` to skip Google OAuth and load a fake admin + mock data (`AuthContext.DEV_AUTH_BYPASS`, `supabaseService.mockState()`). Gated on `import.meta.env.DEV`, so the production `vite build` strips it entirely — it can never ship live. Writes won't persist (no real session); it's for UI/layout verification (e.g. Playwright at mobile widths).

## MCP Tools Setup
- **Playwright MCP**: Browser automation and testing — installed globally via `@anthropic-ai/claude-code` with `@anthropic-ai/mcp-server-playwright` package
- **shadcn MCP**: UI component library — connected by user for component access

## Working Rules
- **Always update this CLAUDE.md** when making architectural changes, adding features, or changing patterns
- **Always update memory files** in the memory directory when learning new project context
- **DB changes** always go through migration files — never modify the DB directly
- **Keep Supabase free tier alive** via the Cloudflare Worker at `cloudflare/keep-alive/` (deploy with `npx wrangler deploy` from that dir)
- **Daily brief email** worker at `cloudflare/daily-brief/` — deploy with `npx wrangler deploy`; needs secrets `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TRIGGER_TOKEN` set via `wrangler secret put` (never commit them). If App.jsx profit/bank formulas change, update the worker's `computeSnapshot()` to match.
- Supabase project ref: `mssxrafomjlzoypjvjdu`
