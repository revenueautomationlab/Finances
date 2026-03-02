-- Create tables for RAL Finance Application
-- This migration creates the schema for managing projects, payments, expenses, and spending

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  total_value DECIMAL(15, 3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bank_spending table
CREATE TABLE IF NOT EXISTS bank_spending (
  id TEXT PRIMARY KEY,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create charity_spending table
CREATE TABLE IF NOT EXISTS charity_spending (
  id TEXT PRIMARY KEY,
  amount DECIMAL(15, 3) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_bank_spending_date ON bank_spending(date);
CREATE INDEX idx_charity_spending_date ON charity_spending(date);
