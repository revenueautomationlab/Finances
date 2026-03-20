-- Rename charity_spending table to secret_investment_spending
-- Uses DO block to handle case where table was already renamed
DO $$ BEGIN
  ALTER TABLE charity_spending RENAME TO secret_investment_spending;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX charity_spending_pkey RENAME TO secret_investment_spending_pkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
