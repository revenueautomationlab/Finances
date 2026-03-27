-- Make start_date and next_due nullable (items can be "potential" before they start)
ALTER TABLE recurring_revenue ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE recurring_revenue ALTER COLUMN next_due DROP NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN next_due DROP NOT NULL;
