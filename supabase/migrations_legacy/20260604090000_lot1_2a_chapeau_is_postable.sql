-- Lot 1 Phase 2a : CHECK source_type étendue, provision copros plates,
-- reclassement chapeau 450 de la boucle d'or, is_postable=false (chapeaux soldés) + enforcement.
-- Appliquée via MCP apply_migration le 2026-06-03 (acceptation 2a PASS).

-- (1) Étendre la CHECK source_type (reclassification + result_allocation)
ALTER TABLE public.ledger_transactions DROP CONSTRAINT IF EXISTS ledger_transactions_source_type_check;
ALTER TABLE public.ledger_transactions ADD CONSTRAINT ledger_transactions_source_type_check
  CHECK (source_type IS NULL OR source_type = ANY (ARRAY[
    'budget','budget_expense','call_for_funds','payment','supplier_invoice','supplier_payment',
    'bank_movement','transfer','od','opening','closing','manual','opening_balance','opening_onboarding',
    'reclassification','result_allocation']));

-- (2) Provisionner le plan tiers 450-x sur les copros qui n'ont qu'un chapeau 450 nu (idempotent)
DO $prov$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.id FROM copros c
    WHERE EXISTS (SELECT 1 FROM accounts a WHERE a.copro_id=c.id AND a.code='450')
      AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.copro_id=c.id AND a.code='450-1')
  LOOP PERFORM provision_copro_chart(r.id); END LOOP;
END $prov$;

-- (3) Reclasser le solde du chapeau 450 -> 450-1 (boucle d'or uniquement, lignes lot_id non nul)
DO $recl$
DECLARE
  v_copro uuid := '22222222-aaaa-bbbb-cccc-222222222222';
  v_period uuid; v_entries jsonb := '[]'::jsonb; v_acct_450 uuid; v_acct_4501 uuid; r record;
BEGIN
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_acct_450  FROM accounts WHERE copro_id=v_copro AND code='450';
  SELECT id INTO v_acct_4501 FROM accounts WHERE copro_id=v_copro AND code='450-1';
  IF v_acct_450 IS NULL OR v_acct_4501 IS NULL THEN RAISE EXCEPTION 'Comptes 450/450-1 absents'; END IF;
  FOR r IN
    SELECT e.lot_id, round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) AS net
    FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
    JOIN accounts a ON a.id=e.account_id
    WHERE a.copro_id=v_copro AND a.code='450' AND e.lot_id IS NOT NULL
    GROUP BY e.lot_id
    HAVING round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) <> 0
  LOOP
    v_entries := v_entries
      || jsonb_build_object('account_id',v_acct_450,'lot_id',r.lot_id,'direction',CASE WHEN r.net>0 THEN 'credit' ELSE 'debit' END,'amount',abs(r.net),'entry_label','Neutralisation chapeau 450')
      || jsonb_build_object('account_id',v_acct_4501,'lot_id',r.lot_id,'direction',CASE WHEN r.net>0 THEN 'debit' ELSE 'credit' END,'amount',abs(r.net),'entry_label','Reclassement 450 -> 450-1');
  END LOOP;
  IF jsonb_array_length(v_entries) > 0 THEN
    PERFORM create_ledger_transaction(v_copro, v_period, CURRENT_DATE, 'Reclassement soldes chapeau 450 -> 450-1', 'reclassification', NULL, v_entries, true);
  END IF;
END $recl$;

-- (4) is_postable=false sur les chapeaux 450 SOLDÉS (auto-protège témoin + copros non reclassées)
UPDATE accounts SET is_postable=false
 WHERE code='450'
   AND EXISTS (SELECT 1 FROM accounts a2 WHERE a2.copro_id=accounts.copro_id AND a2.code LIKE '450-%')
   AND NOT EXISTS (
     SELECT 1 FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
     WHERE e.account_id=accounts.id
     GROUP BY e.account_id
     HAVING round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),2) <> 0
   );

-- (5) Trigger d'enforcement is_postable
CREATE OR REPLACE FUNCTION public.trg_enforce_is_postable() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE v_ok boolean; v_code text;
BEGIN
  SELECT is_postable, code INTO v_ok, v_code FROM accounts WHERE id = NEW.account_id;
  IF v_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Compte non imputable (is_postable=false) : %', v_code;
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS enforce_is_postable ON public.ledger_entries;
CREATE CONSTRAINT TRIGGER enforce_is_postable
  AFTER INSERT OR UPDATE ON public.ledger_entries
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_is_postable();
