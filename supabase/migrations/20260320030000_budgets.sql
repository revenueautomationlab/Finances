CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  allocated_amount DECIMAL(15, 3) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_spending (
  id TEXT PRIMARY KEY,
  budget_id TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_spending_budget_id ON budget_spending(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_spending_date ON budget_spending(date);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_spending ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Authenticated users can read budgets" ON budgets FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can insert budgets" ON budgets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can update budgets" ON budgets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete budgets" ON budgets FOR DELETE TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can read budget_spending" ON budget_spending FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can insert budget_spending" ON budget_spending FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Authenticated users can delete budget_spending" ON budget_spending FOR DELETE TO authenticated USING (true);
