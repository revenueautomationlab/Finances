# RAL Finance - Project Guide

## Overview
Project finance tracker for Revenue Automation Lab (RAL). Tracks client projects, payments, expenses, and splits profit 4 ways (Bank Savings 55%, Suhaib 10%, Mohammed 10%, Secret Investment 25%). Includes budgets, recurring items, partner withdrawals, and comprehensive reports.

## Tech Stack
- **Frontend**: React 18 + Vite 4 (vanilla JSX, no TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Google OAuth via Supabase Auth (restricted to `revenueautomationlab@gmail.com`)
- **Routing**: react-router-dom v6
- **Hosting**: Netlify (`ralfinance.netlify.app`)
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
    └── 20260320040000_recurring.sql ........ Recurring revenue + expenses tables

netlify/
└── functions/
    └── keep-alive.mjs ............. Pings Supabase every 3 days to prevent free-tier pausing

.github/
└── workflows/
    └── migrate.yml ................ Auto-deploys migrations on push to main (+ manual workflow_dispatch)
```

## Database Schema
Tables:
- `projects` — client projects with name, total_value
- `payments` — project payments (FK to projects, CASCADE delete)
- `expenses` — project expenses (FK to projects, CASCADE delete)
- `bank_spending` — spending from bank savings share
- `secret_investment_spending` — spending from secret investment share (renamed from charity_spending)
- `partner_withdrawals` — partner withdrawals with CHECK constraint on partner_name ('suhaib'/'mohammed')
- `budgets` — budget categories with name, allocated_amount, description
- `budget_spending` — spending against budgets (FK to budgets, CASCADE delete)
- `recurring_revenue` — recurring revenue items (nullable project_id, frequency: monthly/yearly, active boolean)
- `recurring_expenses` — recurring expense items (nullable project_id, frequency: monthly/yearly, active boolean)
- `recurring_revenue_payments` — paid period records for project-linked recurring revenue (FK to recurring_revenue + projects, UNIQUE on recurring_revenue_id+period_date)
- `recurring_expense_payments` — paid period records for project-linked recurring expenses (FK to recurring_expenses + projects, UNIQUE on recurring_expense_id+period_date)

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

### Profit Calculation
- **contractPayments** = sum of payment records for the project
- **totalPaid** = contractPayments + sum of paid recurring revenue installments (from recurring_revenue_payments)
- **totalRevenue** = totalPaid (cash received — contract payments + paid recurring installments)
- **totalPotential** = totalValue + projRecurringRevTotal (full potential if all periods paid; used for progress bars)
- **totalExpenses** = project expenses + all generated recurring expense periods (all periods always count as costs)
- **Profit** = totalRevenue - totalExpenses (cash-basis: received revenue minus all costs)
- **Profit Split**: If profit > 0: Bank Savings 55%, Suhaib 10%, Mohammed 10%, Secret Investment 25%
- **unpaid** = contractUnpaid + recurringPending (combined outstanding from contract + pending recurring installments)

### Recurring Items Integration
- **Project-linked recurring**: Uses period tracking. `generateRecurringPeriods(startDate, frequency)` generates all periods from start_date to current month/year. Revenue periods can be marked paid/unpaid in the project detail view. Expense periods track payment status but ALL periods always count toward totalExpenses.
- **Paid period storage**: A record in `recurring_revenue_payments` or `recurring_expense_payments` = paid. No record = unpaid. Marking paid = INSERT; marking unpaid = DELETE.
- **General recurring** (no project): Uses single-amount logic (not period-tracked). Creates its own profit split via `generalRecurring*Share` variables.
- `generalRecurringRev` = sum of active recurring revenue without project_id
- `generalRecurringExp` = sum of active recurring expenses without project_id
- `generalRecurringProfit` = generalRecurringRev - generalRecurringExp
- `generalRecurringShare` = generalRecurringProfit > 0 ? generalRecurringProfit * 0.25 : 0
- Global totals include both project-linked and general recurring

### Bank & Budget Logic
- **totalPhysicalBank** = globalRevenue - globalExpenses - suhaibWithdrawn - mohammedWithdrawn - secretInvestmentSpent - bankSpent - budgetSpent
- **bankSpendable** = bank's 25% share income - bank spending - budget spending (budgets come from the bank share)
- **Bank & Secret Investment** income includes `generalRecurringShare`
- **Partner Withdrawals**: Suhaib and Mohammed can withdraw from their 25% share
- **Available Balance** = accumulated share - withdrawn/spent

### Key Computed Values (all via useMemo)
- `projectStats` — per-project stats including recurring items, profit, and 4-way split
- `globalBank` — bank share income (includes generalRecurringShare), spent, balance
- `globalSecretInvestment` — secret investment share income (includes generalRecurringShare), spent, balance
- `bankSpendable` — bank share minus bank spending minus budget spending
- `totalPhysicalBank` — actual money in the bank after all deductions
- `budgetStats` — per-budget allocated vs spent

## App Views
1. **Dashboard** — Summary cards (revenue, expenses, profit, bank total), profit distribution, partner balances with withdrawals, budget & recurring quick overview, projects table
2. **Projects** — List of all projects with value, paid, unpaid, expenses, profit, status
3. **Project Detail** — Individual project: payments table, expenses table, profit split per project
4. **Bank Savings** — Total in bank, bank share, bank spent, bank available (bankSpendable), money allocation breakdown, spending history, project contributions, recurring impact card
5. **Budgets** — Budget cards with progress bars, spending tracking per budget, CRUD for budgets and spending
6. **Recurring** — Recurring revenue and expenses tables with active/pause toggle, frequency, project association
7. **Reports** — Monthly P&L, Partner Summary, Budget Utilization, Recurring Obligations, Cash Flow Summary, Project Performance
8. **Secret Investment** — Secret investment share, spending, balance, spending history

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
- OAuth redirect uses `window.location.origin` automatically — resolves to `localhost:5175` locally and `ralfinance.netlify.app` in prod
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
- **Keep Supabase free tier alive** via the Netlify scheduled function
- Supabase project ref: `mssxrafomjlzoypjvjdu`
