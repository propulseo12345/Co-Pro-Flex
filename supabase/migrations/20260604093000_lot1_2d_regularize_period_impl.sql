-- Lot 1 Phase 2d : regularize_period affecte le solde du 120 -> 450-1 par quote-part (clé générale),
-- daté à l'AG (CURRENT_DATE), posté en N+1. Idempotent. Remplace le stub no-op (WP5.3).
-- + extension de l'exemption d'immutabilité à 'result_allocation' (signature live conservée).
-- Appliquée via MCP apply_migration le 2026-06-03 (boucle fermée prouvée : 120 soldé, 450-1 réparti par tantièmes).
CREATE OR REPLACE FUNCTION public.regularize_period(p_copro_id uuid, p_period_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_next uuid; v_next_start date; v_ag_date date := CURRENT_DATE;
  v_key uuid; v_total_w numeric; v_solde_120 numeric; v_entries jsonb := '[]'::jsonb;
  v_acct_120 uuid; v_acct_4501 uuid; v_running numeric := 0; v_alloc numeric;
  r record; v_lines int := 0; v_cnt int;
BEGIN
  SELECT id, start_date INTO v_next, v_next_start FROM accounting_periods
   WHERE copro_id=p_copro_id
     AND start_date > (SELECT end_date FROM accounting_periods WHERE id=p_period_id)
   ORDER BY start_date LIMIT 1;
  IF v_next IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','N+1 introuvable pour affectation');
  END IF;

  IF (SELECT status FROM accounting_periods WHERE id=v_next) <> 'approved' THEN
    DELETE FROM ledger_transactions
     WHERE copro_id=p_copro_id AND source_type='result_allocation' AND source_id=p_period_id;
  END IF;

  SELECT id INTO v_acct_120 FROM accounts WHERE copro_id=p_copro_id AND code='120';
  SELECT id INTO v_acct_4501 FROM accounts WHERE copro_id=p_copro_id AND code='450-1';
  IF v_acct_4501 IS NULL THEN RAISE EXCEPTION 'Compte 450-1 absent (copro %)', p_copro_id; END IF;

  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2)
    INTO v_solde_120
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  JOIN accounts a ON a.id=e.account_id
  WHERE e.copro_id=p_copro_id AND e.period_id=v_next AND a.code='120';

  IF v_solde_120 = 0 THEN
    RETURN jsonb_build_object('success',true,'skipped','solde 120 nul','next_period_id',v_next);
  END IF;

  SELECT id INTO v_key FROM repartition_keys
   WHERE copro_id=p_copro_id AND category='general' AND is_active=true LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Cle de repartition generale active introuvable (copro %)', p_copro_id;
  END IF;
  SELECT sum(weight) INTO v_total_w FROM repartition_key_lines WHERE key_id=v_key;
  IF coalesce(v_total_w,0) <= 0 THEN
    RAISE EXCEPTION 'Somme des poids de la cle generale nulle (copro %)', p_copro_id;
  END IF;

  v_entries := v_entries || jsonb_build_object(
    'account_id', v_acct_120, 'lot_id', NULL,
    'direction', CASE WHEN v_solde_120 > 0 THEN 'credit' ELSE 'debit' END,
    'amount', abs(v_solde_120), 'entry_label', 'Affectation du resultat courant');

  SELECT count(*) INTO v_cnt FROM repartition_key_lines WHERE key_id=v_key;
  FOR r IN SELECT lot_id, weight FROM repartition_key_lines WHERE key_id=v_key ORDER BY lot_id LOOP
    v_lines := v_lines + 1;
    IF v_lines = v_cnt THEN
      v_alloc := round(abs(v_solde_120),2) - v_running;
    ELSE
      v_alloc := round(abs(v_solde_120) * r.weight / v_total_w, 2);
      v_running := v_running + v_alloc;
    END IF;
    IF v_alloc <> 0 THEN
      v_entries := v_entries || jsonb_build_object(
        'account_id', v_acct_4501, 'lot_id', r.lot_id,
        'direction', CASE WHEN v_solde_120 > 0 THEN 'debit' ELSE 'credit' END,
        'amount', v_alloc, 'entry_label', 'Affectation resultat au lot');
    END IF;
  END LOOP;

  PERFORM create_ledger_transaction(p_copro_id, v_next, v_ag_date,
    'Affectation du resultat courant '||p_period_id, 'result_allocation', p_period_id, v_entries, true);

  RETURN jsonb_build_object('success',true,'allocated',abs(v_solde_120),
    'next_period_id',v_next,'lines',v_lines);
END $fn$;

CREATE OR REPLACE FUNCTION public.is_ledger_regen_exempt(p_source_type text, p_source_id uuid, p_posting_period_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $f$
  SELECT p_source_type IN ('opening_balance','closing','opening_onboarding','result_allocation')
     AND p_source_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM accounting_periods ap WHERE ap.id = p_source_id AND ap.status <> 'approved')
     AND EXISTS (SELECT 1 FROM accounting_periods ap WHERE ap.id = p_posting_period_id AND ap.status <> 'approved');
$f$;
