-- WP5.2 — Extourne (contre-passation) du cut-off de N dans N+1. INTERNE : appelée par open_next_period.
CREATE OR REPLACE FUNCTION public.reverse_period_cutoff(
  p_copro_id uuid, p_period_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_n accounting_periods%ROWTYPE;
  v_next accounting_periods%ROWTYPE;
  v_item record;
  v_entries jsonb := '[]'::jsonb;
  v_existing uuid; v_tx_res jsonb; v_count int := 0;
BEGIN
  SELECT * INTO v_n FROM accounting_periods WHERE id = p_period_id AND copro_id = p_copro_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Période N introuvable'); END IF;

  SELECT * INTO v_next FROM accounting_periods
   WHERE copro_id = p_copro_id AND start_date > v_n.end_date
   ORDER BY start_date ASC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Période N+1 introuvable'); END IF;
  IF v_next.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', format('Période N+1 non ouverte (statut=%s)', v_next.status));
  END IF;
  IF v_n.status = 'approved' OR v_next.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Extourne figée : exercice approuvé');
  END IF;

  -- Idempotence : supprimer l'extourne précédente (period_id = N+1).
  SELECT id INTO v_existing FROM ledger_transactions
   WHERE copro_id = p_copro_id AND source_type = 'closing'
     AND source_id = p_period_id AND period_id = v_next.id;
  IF v_existing IS NOT NULL THEN DELETE FROM ledger_transactions WHERE id = v_existing; END IF;

  -- Seuls les items auto_reverse=true sont extournés (les dettes certaines se soldent au paiement).
  FOR v_item IN
    SELECT * FROM period_cutoff_items
    WHERE copro_id = p_copro_id AND period_id = p_period_id AND auto_reverse = true
  LOOP
    v_entries := v_entries || public.cutoff_entry_pair(
      v_item.kind, v_item.account_id, v_item.counterpart_account_id, v_item.amount,
      'Extourne cut-off ' || v_n.name, true);
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', true, 'reversed', 0, 'note', 'aucun item à extourner');
  END IF;

  v_tx_res := create_ledger_transaction(
    p_copro_id, v_next.id, v_next.start_date,
    'Extourne cut-off ' || v_n.name || ' → ' || v_next.name, 'closing', p_period_id, v_entries, true);
  IF NOT COALESCE((v_tx_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Échec extourne cut-off : %', v_tx_res;
  END IF;

  UPDATE period_cutoff_items SET reversal_tx_id = (v_tx_res->>'tx_id')::uuid
   WHERE copro_id = p_copro_id AND period_id = p_period_id AND auto_reverse = true;

  RETURN jsonb_build_object('success', true, 'reversed', v_count,
    'tx_id', v_tx_res->>'tx_id', 'next_period_id', v_next.id);
END; $$;
