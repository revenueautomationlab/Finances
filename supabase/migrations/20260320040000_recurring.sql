CREATE TABLE IF NOT EXISTS recurring_revenue (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  amount DECIMAL(15, 3) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  next_due DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  amount DECIMAL(15, 3) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  next_due DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recurring_revenue_project ON recurring_revenue(project_id);
CREATE INDEX IF NOT EXISTS idx_recurring_revenue_next_due ON recurring_revenue(next_due);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_project ON recurring_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON recurring_expenses(next_due);

ALTER TABLE recurring_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_revenue
CREATE POLICY "Auth read recurring_revenue" ON recurring_revenue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert recurring_revenue" ON recurring_revenue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update recurring_revenue" ON recurring_revenue FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete recurring_revenue" ON recurring_revenue FOR DELETE TO authenticated USING (true);

-- RLS policies for recurring_expenses
CREATE POLICY "Auth read recurring_expenses" ON recurring_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert recurring_expenses" ON recurring_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update recurring_expenses" ON recurring_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete recurring_expenses" ON recurring_expenses FOR DELETE TO authenticated USING (true);
