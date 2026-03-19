# RAL Finance - Project Guide

## Overview
Project finance tracker for Revenue Automation Lab (RAL). Tracks client projects, payments, expenses, and splits profit 4 ways (25% each: Bank Savings, Suhaib, Mohammed, Secret Investment). Includes budgets, recurring items, partner withdrawals, and comprehensive reports.

## Tech Stack
- **Frontend**: React 18 + Vite 4 (vanilla JSX, no TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Google OAuth via Supabase Auth (restricted to `revenueautomationlab@gmail.com`)
- **Routing**: react-router-dom v6
- **Hosting**: Netlify (`ralfinance.netlify.app`)
- **Currency**: BHD (Bahraini Dinar, 3 decimal places)
- **Migrations**: Supabase CLI + GitHub Actions auto-deploy

## File Structure
```
src/
├── App.jsx ........................ Main app — all views, CRUD, modals, sidebar, dashboard (~3000 lines)
├── main.jsx ....................... Entry point — routing, ProtectedRoute, AuthProvider
├── style.css ...................... Full design system — custom CSS, responsive
├── services/
│   └── supabaseService.js ......... All Supabase DB operations (fetchState, all CRUD functions)
├── contexts/
│   └── AuthContext.jsx ............ Auth context — Google OAuth, email validation, force sign-out
└── pages/
    ├── LoginPage.jsx .............. Login page with Google sign-in
    └── AuthCallbackPage.jsx ....... OAuth callback handler (15s timeout fallback)

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
    └── migrate.yml ................ Auto-deploys migrations when supabase/migrations/ changes
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

All tables have:
- RLS enabled (authenticated users only)
- Indexes on `project_id` and `date` columns where applicable

## Database Migrations (IMPORTANT)
- **All DB changes go through migration files** in `supabase/migrations/`
- Migration files use timestamp format: `YYYYMMDDHHMMSS_description.sql`
- On push to `main`, GitHub Action auto-deploys new migrations via `supabase db push`
- GitHub secrets required: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`
- When making DB changes: create a new migration file, update frontend code to match
- Use `IF NOT EXISTS` / `IF EXISTS` for safety in migrations

## Business Logic
- **Profit** = Total Paid - Total Expenses (per project)
- **Profit Split**: If profit > 0, 25% each to: Bank Savings, Suhaib, Mohammed, Secret Investment
- **Bank & Secret Investment** have independent spending tracking
- **Partner Withdrawals**: Suhaib and Mohammed can withdraw from their 25% share
- **Available Balance** = accumulated share - withdrawn/spent
- **totalPhysicalBank** = globalRevenue - globalExpenses - suhaibWithdrawn - mohammedWithdrawn - secretInvestmentSpent - bankSpent - budgetSpent
- **Budgets**: Independent categories with allocated amounts and tracked spending (spending deducted from totalPhysicalBank)
- **Recurring Items**: Revenue and expense templates with monthly/yearly frequency, active/paused toggle, optional project association

## App Views
1. **Dashboard** — Summary cards (revenue, expenses, profit, bank total), profit distribution, partner balances with withdrawals, budget & recurring quick overview, projects table
2. **Projects** — List of all projects with value, paid, unpaid, expenses, profit, status
3. **Project Detail** — Individual project: payments table, expenses table, profit split per project
4. **Bank Savings** — Total in bank, bank share, bank spent, bank available, money allocation breakdown, spending history, project contributions
5. **Budgets** — Budget cards with progress bars, spending tracking per budget, CRUD for budgets and spending
6. **Recurring** — Recurring revenue and expenses tables with active/pause toggle, frequency, project association
7. **Reports** — Monthly P&L, Partner Summary, Budget Utilization, Recurring Obligations, Cash Flow Summary, Project Performance
8. **Secret Investment** — Secret investment share, spending, balance, spending history

## Key Patterns
- Single-file App.jsx with nested function components
- All state via `useState` — no external state library
- Computed values via `useMemo` (projectStats, globalBank, globalSecretInvestment, budgetStats, totalPhysicalBank)
- Every CRUD op: async call to Supabase → refresh all data → show toast (success + error)
- Confirmation dialogs for all delete operations
- ModalForm supports text, number, date, and select field types
- Mobile-responsive with hamburger menu sidebar
- Auth: `clearSupabaseStorage()` purges all sb-* keys; `forceFullSignOut()` handles denied access; `isForceSigningOut` ref prevents race conditions

## Working Rules
- **Always update this CLAUDE.md** when making architectural changes, adding features, or changing patterns
- **Always update memory files** in the memory directory when learning new project context
- **DB changes** always go through migration files — never modify the DB directly
- **Keep Supabase free tier alive** via the Netlify scheduled function
- Supabase project ref: `mssxrafomjlzoypjvjdu`
