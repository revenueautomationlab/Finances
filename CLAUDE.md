# RAL Finance - Project Guide

## Overview
Project finance tracker for Revenue Automation Lab (RAL). Tracks client projects (which can be free or paid), and splits **contract-only** profit 4 ways (Bank Savings 55%, Suhaib 10%, Mohammed 10%, Secret Investment 25%). **Recurring revenue is decoupled from project profit** — paid recurring installments and active general recurring revenue flow directly into the bank spendable pool, which funds operations and partner dividend payouts. Domain expiries and recurring revenue end-dates trigger countdown alerts on the dashboard.

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
    └── 20260510000000_dividends_domains_expiries.sql .. partner_dividends, domains, end_date columns

cloudflare/
└── keep-alive/
    ├── wrangler.toml .............. Worker config — cron `0 8 */3 * *`, [vars] hold public Supabase URL + anon key
    └── src/
        └── index.js ............... Worker that pings Supabase `/auth/v1/health` every 3 days to prevent free-tier pausing

.github/
└── workflows/
    └── migrate.yml ................ Auto-deploys migrations on push to main (+ manual workflow_dispatch)
```

## Database Schema
Tables:
- `projects` — client projects (`total_value` may be 0 for "free + recurring upsell" projects)
- `payments` — project payments (FK to projects, CASCADE delete)
- `expenses` — project expenses (FK to projects, CASCADE delete)
- `bank_spending` — spending from bank savings share
- `secret_investment_spending` — spending from secret investment share (renamed from charity_spending)
- `partner_withdrawals` — share-based withdrawals (drawn against the partner's accumulated 10% share); CHECK on partner_name ('suhaib'/'mohammed')
- `partner_dividends` — bank-funded dividend payouts (the salary mechanism); CHECK on partner_name
- `budgets` — budget categories with name, allocated_amount, description
- `budget_spending` — spending against budgets (FK to budgets, CASCADE delete)
- `recurring_revenue` — recurring revenue items (nullable project_id, frequency: monthly/yearly, active, optional `end_date` for expiry alerts)
- `recurring_expenses` — recurring expense items (nullable project_id, frequency: monthly/yearly, active, optional `end_date`)
- `recurring_revenue_payments` — paid period records for project-linked recurring revenue (UNIQUE on recurring_revenue_id+period_date)
- `recurring_expense_payments` — paid period records for project-linked recurring expenses (UNIQUE on recurring_expense_id+period_date)
- `domains` — owned domains with `expiry_date`, optional `project_id` and `recurring_revenue_id` links, `registrar`, `auto_renew`, `notes`

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

## Business Logic

### Project Profit (Contract + Tagged Recurring)
A project gets credited for recurring revenue tagged to it, so projects earning recurring aren't shown as money-losers. The 4-way profit split (55/10/10/25) applies to this combined profit, so paid project-linked recurring still ends up flowing to the bank pool through the bank's 55% share — no double counting.
- **contractPayments** = sum of `payments` records for the project
- **projRecurringPaid** = sum of `recurring_revenue_payments` amounts for streams tagged to this project
- **totalPaid** = contractPayments + projRecurringPaid (recurring credited to the project)
- **totalRevenue** = totalPaid
- **totalPotential** = totalValue (contract amount; "paid" status is contract-based — recurring is ongoing/extra)
- **totalExpenses** = project `expenses` + all generated recurring-expense periods linked to this project (accrual basis)
- **profit** = totalRevenue − totalExpenses
- **Profit Split** (only when profit > 0): Bank 55%, Suhaib 10%, Mohammed 10%, Secret Investment 25%
- **unpaid** = max(0, totalValue − contractPayments). Free projects (`totalValue = 0`) are immediately marked Paid (badge: "Free"). Status badge = "Paid" / "Partial" / "Unpaid" tracks contract only.
- **isPaid** = unpaid <= 0

### Recurring Revenue Flow
- Project-linked recurring revenue uses period tracking (`generateRecurringPeriods` from start_date through the current period). A record in `recurring_revenue_payments` for a (recurring_revenue_id, period_date) pair = paid; missing = unpaid.
- **Paid project-linked recurring is credited to the project** and split 4 ways via the project's profit. Bank gets 55% of it (not 100%).
- **General (untagged) recurring revenue flows 100% directly to the bank pool** (active items × amount, since general items don't have payment tracking).
- Recurring expenses behave by tag:
  - Project-linked recurring expenses stay on the project (counted in project totalExpenses, accrual basis — all periods count regardless of paid status).
  - General recurring expenses (no project_id) come out of the bank pool (`generalRecurringExp`).

### Partner Compensation (Two Pots)
1. **10% Share** (project profit only) — accumulates per project, drawn down via `partner_withdrawals`. Available = earned − withdrawn.
2. **Bank Dividends** — flat payouts from `bankSpendable`, recorded in `partner_dividends`. This is the salary mechanism funded by recurring revenue. Capped only by bank spendable.

### Bank & Cash Position
- **globalBank.income** = `projectShare` (55% of all project profit, which already includes tagged paid recurring) + `recurringRevenueIncome.generalActive` (untagged recurring flows 100% direct to bank)
  - **NOT** added separately: tagged paid recurring (avoids double counting — it's already in projectShare via the 55% split)
- **globalBank.spent** = `bank_spending` records only
- **bankSpendable** = `globalBank.income − globalBank.spent − totalBudgetSpent − totalDividendsPaid − generalRecurringExp`
  (Budgets, dividends, and general recurring expenses all draw from the bank pool.)
- **globalRevenue** = `globalProjectRevenue` (contract + tagged recurring paid) + `recurringRevenueIncome.generalActive` (no double counting)

### Operating vs Distributions
Distinction between business costs and money paid to ourselves matters for margin calculations.
- **operatingOutflow** = project expenses (incl. project-linked recurring) + general recurring expenses + bank spending + budget spending + secret investment spending
  - Does NOT include partner withdrawals or dividends
- **operatingNet** = globalRevenue − operatingOutflow (what the business made before paying owners)
- **globalMargin** = operatingNet ÷ globalRevenue × 100 (operating margin, shown on Dashboard and Projects view)
- **totalDistributions** = partner withdrawals + dividends paid (money out to Suhaib/Mohammed)
- **totalPhysicalBank** = operatingNet − totalDistributions (true cash position — what's actually in the bank)

### Expiry Alerts
- `daysUntil(date)` and `reminderThresholdDays(frequency)` (90 days for yearly, 7 for monthly).
- The `expiryAlerts` memo aggregates:
  - Domains with `expiry_date ≤ 90 days` away (suppressed if another row with the same `name` has a later expiry — i.e. a renewal entry exists)
  - Active recurring revenue with `end_date ≤ threshold` (suppressed if a successor active recurring revenue exists with the same project_id (or matching description for general items) and `start_date > end_date`)
- Severity levels: `overdue` (negative days), `urgent` (≤ 30d for domains, ≤ ⅓ threshold for recurring), `soon` otherwise.
- Rendered as `<ExpiryAlertsBanner>` at the top of the Dashboard.

### Key Computed Values (all via useMemo or top-level memos)
- `projectStats` — per-project stats: `{ contractPayments, projRecurringPaid, projRecurringExpTotal, totalPaid, totalRevenue, totalExpenses, profit, bankShare, suhaibShare, mohammedShare, secretInvestmentShare, unpaid, isPaid, ... }`
- `recurringRevenueIncome` — `{ projectLinkedPaid, generalActive, total }`
- `globalBank` — `{ projectShare, income, spent, balance }`
- `globalSecretInvestment` — `{ income, spent, balance }` (project profit's 25% only — no recurring)
- `globalProjectRevenue` — sum(p.totalRevenue) including tagged recurring
- `globalContractRevenue` — sum(p.contractPayments) (contract only)
- `globalRevenue` — globalProjectRevenue + generalActive
- `globalExpenses` — project expenses (incl. project-linked recurring) + generalRecurringExp
- `operatingOutflow` — globalExpenses + bank/budget/secret spending (excludes partner payouts)
- `operatingNet` / `globalMargin` — pre-distribution net & margin
- `totalDistributions` — withdrawals + dividends
- `bankSpendable` / `totalPhysicalBank` — bank pool minus its outflows; true cash position
- `budgetStats` — per-budget allocated vs spent
- `expiryAlerts` — sorted list of upcoming domain/recurring expiries

## App Views
1. **Dashboard** — Expiry alerts banner (when applicable), comprehensive revenue/outflow/margin/bank stat cards, project profit distribution, partner balances with both share-withdraw and bank-dividend buttons, recent activity table (mixed withdrawals + dividends), budget & recurring quick overview, projects table
2. **Projects** — Summary stats (paid/unpaid/expenses/project profit/all-in margin/in-bank), project cards with payment progress (free projects show "Free" badge)
3. **Project Detail** — Contract value (or "Free + Recurring" badge), payments and expenses tables, profit split (contract-only), recurring revenue periods (mark paid/unpaid), recurring expenses periods
4. **Bank Savings** — Total in bank, bank inflow/outflow/spendable, bank pool composition (inflow & outflow lines), partner dividends payout & history, spending history, project contributions, recurring impact
5. **Budgets** — Budget cards with progress bars, spending tracking, CRUD
6. **Recurring** — Revenue + expenses tables with frequency, project, end-date column (yellow when within reminder threshold), active/pause, full CRUD. Add-revenue modal supports optional inline domain creation.
7. **Domains** — Full CRUD list of owned domains with expiry countdown badges, optional links to projects + recurring revenue, registrar, auto-renew, notes
8. **Reports** — Monthly P&L (contract + recurring revenue), Partner Summary (earned/withdrawn/dividends), Budget Utilization, Recurring Obligations, Cash Flow Summary (with dividends + recurring lines), Project Performance
9. **Secret Investment** — Secret investment share (project profit 25%), spending, balance, spending history

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

## MCP Tools Setup
- **Playwright MCP**: Browser automation and testing — installed globally via `@anthropic-ai/claude-code` with `@anthropic-ai/mcp-server-playwright` package
- **shadcn MCP**: UI component library — connected by user for component access

## Working Rules
- **Always update this CLAUDE.md** when making architectural changes, adding features, or changing patterns
- **Always update memory files** in the memory directory when learning new project context
- **DB changes** always go through migration files — never modify the DB directly
- **Keep Supabase free tier alive** via the Cloudflare Worker at `cloudflare/keep-alive/` (deploy with `npx wrangler deploy` from that dir)
- Supabase project ref: `mssxrafomjlzoypjvjdu`
