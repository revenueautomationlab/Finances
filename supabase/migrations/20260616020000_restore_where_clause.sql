-- Supabase's safe-update guard rejects DELETE without a WHERE clause (SQLSTATE 21000).
-- Add `WHERE true` so the full-table clear is allowed. (FK-safe order + single transaction as before.)
CREATE OR REPLACE FUNCTION public.restore_snapshot(p_snapshot_id BIGINT) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  snap JSONB;
  t TEXT;
  i INT;
  tables TEXT[] := ARRAY[
    'payment_schedule_payments','recurring_revenue_payments','recurring_expense_payments',
    'budget_spending','payments','expenses','domains',
    'payment_schedule','recurring_revenue','recurring_expenses',
    'bank_spending','secret_investment_spending','partner_withdrawals','partner_dividends',
    'budgets','projects'
  ];
BEGIN
  SELECT data INTO snap FROM db_snapshots WHERE id = p_snapshot_id;
  IF snap IS NULL THEN RAISE EXCEPTION 'snapshot % not found', p_snapshot_id; END IF;

  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DELETE FROM public.%I WHERE true', t);
  END LOOP;

  FOR i IN REVERSE array_length(tables, 1)..1 LOOP
    t := tables[i];
    EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1->%L)', t, t, t) USING snap;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.restore_snapshot(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_snapshot(BIGINT) TO service_role;
