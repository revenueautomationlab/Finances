# RAL Finance — Daily Brief worker

Sends one mobile-friendly email every day at **08:00 Asia/Bahrain** (`cron 0 5 * * *`) to
`revenueautomationlab@gmail.com`, cc `saeedalsaeedbusiness@gmail.com` + `suhaibrajabo@gmail.com`.

The email contains:
1. **Payments due tomorrow** (the reminder) + overdue / rest-of-week — from the Payments tracker (`payment_schedule`) and domain renewals.
2. **Yesterday's transactions** — payments, expenses, bank/budget/secret spending, withdrawals, dividends, recurring payments.
3. **KPI snapshot** — true cash in bank, bank spendable, revenue, operating net, partner balances (mirrors the app's business logic).

Reads Supabase server-side with the **service_role** key (bypasses RLS). Sends via **Resend**.

## One-time setup

### 1. Verify the sender domain in Resend
The brief sends from `reminders@raltech.dev`. To email all three recipients, `raltech.dev` must be a **verified domain** in Resend:
1. Resend dashboard → **Domains** → **Add Domain** → `raltech.dev`.
2. Add the shown DNS records (MX/TXT for SPF + DKIM, and a DMARC TXT) in **Cloudflare DNS** for `raltech.dev`.
3. Wait for **Verified**. (Free plan: 3,000 emails/mo, 100/day — far more than one daily brief.)

> No domain yet? Temporarily set `MAIL_FROM = "RAL Finance <onboarding@resend.dev>"` and `MAIL_TO`/`MAIL_CC` to your **own** Resend account email — `onboarding@resend.dev` only delivers to yourself. Switch to `reminders@raltech.dev` once verified.

### 2. Set secrets (never committed)
From this directory:
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # Supabase → Project Settings → API → service_role
npx wrangler secret put RESEND_API_KEY              # Resend → API Keys
npx wrangler secret put TRIGGER_TOKEN               # any random string; guards the manual test URL
```

### 3. Deploy
```bash
npx wrangler deploy
```

## Manual test (no waiting for 8am)
- **Preview** the rendered email (no send):
  `https://ral-finance-daily-brief.<account>.workers.dev/?token=YOUR_TRIGGER_TOKEN`
- **Send it now**:
  `https://ral-finance-daily-brief.<account>.workers.dev/?token=YOUR_TRIGGER_TOKEN&send=1`

The endpoint returns 403 without the correct `token` (keeps financial data private).

## Keeping the KPI math correct
`computeSnapshot()` in `src/index.js` is a faithful port of the computed values in `src/App.jsx`
(profit split 55/10/10/25, bank pool, spendable, true cash). If those formulas change in the app,
update this worker to match.
