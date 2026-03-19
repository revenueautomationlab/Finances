-- Rename charity_spending table to secret_investment_spending
ALTER TABLE IF EXISTS charity_spending RENAME TO secret_investment_spending;

-- Update any indexes that reference the old table name
ALTER INDEX IF EXISTS charity_spending_pkey RENAME TO secret_investment_spending_pkey;
