-- Fix restore_snapshot: Supabase's role can't SET session_replication_role (42501 permission denied).
-- Instead we delete children→parents and insert parents→children so foreign keys stay valid the
-- whole time — no need to disable FK/triggers. The function runs in one transaction, so any error
-- rolls the entire restore back (no partial/destroyed data). Audit triggers fire normally, so the
-- restore itself is recorded in the audit log.
CREATE OR REPLACE FUNCTION public.restore_snapshot(p_snapshot_id BIGINT) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  snap JSONB;
  t TEXT;
  i INT;
  -- child → parent order (safe to DELETE in this order)
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

  -- clear everything, children first
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DELETE FROM public.%I', t);
  END LOOP;

  -- reinsert, parents first (reverse order)
  FOR i IN REVERSE array_length(tables, 1)..1 LOOP
    t := tables[i];
    EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1->%L)', t, t, t) USING snap;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.restore_snapshot(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_snapshot(BIGINT) TO service_role;
