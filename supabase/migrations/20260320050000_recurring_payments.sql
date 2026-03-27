-- Track paid periods for project-linked recurring revenue installments
CREATE TABLE IF NOT EXISTS recurring_revenue_payments (
  id TEXT PRIMARY KEY,
  recurring_revenue_id TEXT NOT NULL REFERENCES recurring_revenue(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  amount DECIMAL(15, 3) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recurring_revenue_id, period_date)
);

-- Track paid periods for project-linked recurring expense installments
CREATE TABLE IF NOT EXISTS recurring_expense_payments (
  id TEXT PRIMARY KEY,
  recurring_expense_id TEXT NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  amount DECIMAL(15, 3) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recurring_expense_id, period_date)
);

CREATE INDEX IF NOT EXISTS idx_rrp_recurring_id ON recurring_revenue_payments(recurring_revenue_id);
CREATE INDEX IF NOT EXISTS idx_rrp_project_id ON recurring_revenue_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_rep_recurring_id ON recurring_expense_payments(recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_rep_project_id ON recurring_expense_payments(project_id);

ALTER TABLE recurring_revenue_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expense_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Auth manage recurring_revenue_payments" ON recurring_revenue_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Auth manage recurring_expense_payments" ON recurring_expense_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
