"""Read-only pull of real finance data into dev-snapshot.json for local UAT (VITE_AUTH_BYPASS).
Uses the service key from cloudflare/daily-brief/.dev.vars. Output is gitignored."""
import json, re, urllib.request, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
k = re.search(r'SUPABASE_SERVICE_ROLE_KEY=\s*"?([^"\s]+)', (root / "cloudflare/daily-brief/.dev.vars").read_text()).group(1)
U = "https://mssxrafomjlzoypjvjdu.supabase.co/rest/v1/"
Q = {"projects": "*,payments(*),expenses(*)", "budgets": "*,budget_spending(*)"}
T = ["projects", "bank_spending", "secret_investment_spending", "partner_withdrawals", "partner_dividends", "budgets",
     "recurring_revenue", "recurring_expenses", "recurring_revenue_payments", "recurring_expense_payments", "domains",
     "payment_schedule", "payment_schedule_payments", "secret_investment_transfers", "partners"]
out = {}
for t in T:
    r = urllib.request.Request(f"{U}{t}?select={Q.get(t, '*')}", headers={"apikey": k, "Authorization": "Bearer " + k})
    out[t] = json.load(urllib.request.urlopen(r))
(root / "dev-snapshot.json").write_text(json.dumps(out))
print({t: len(v) for t, v in out.items()})
