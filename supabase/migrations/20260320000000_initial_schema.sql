-- Initial schema for RAL Finance Application
-- Tables: projects, payments, expenses, bank_spending, charity_spending

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  total_value DECIMAL(15, 3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_spending (
  id TEXT PRIMARY KEY,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS charity_spending (
  id TEXT PRIMARY KEY,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_bank_spending_date ON bank_spending(date);
CREATE INDEX IF NOT EXISTS idx_charity_spending_date ON charity_spending(date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_spending ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_spending ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read projects" ON projects FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert projects" ON projects FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can update projects" ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete projects" ON projects FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read payments" ON payments FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete payments" ON payments FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read expenses" ON expenses FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete expenses" ON expenses FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read bank_spending" ON bank_spending FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert bank_spending" ON bank_spending FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete bank_spending" ON bank_spending FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read charity_spending" ON charity_spending FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert charity_spending" ON charity_spending FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete charity_spending" ON charity_spending FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
