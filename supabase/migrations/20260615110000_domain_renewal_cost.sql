-- Domains get a renewal cost so they count toward the Payments tab's outgoing totals
-- (still tracking-only — does not touch bank/profit/margin math).
ALTER TABLE domains ADD COLUMN IF NOT EXISTS renewal_cost NUMERIC NOT NULL DEFAULT 0;
