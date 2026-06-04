-- WP5.2 — Helper d'écriture (DRY entre post et reverse) + RPC de cut-off

-- Renvoie la paire d'écritures (débit/crédit) d'un item. p_reverse=false => écriture en N ;
-- p_reverse=true => extourne (inverse). Sens en N : CAP/PCA -> débit = compte de résultat (account) ;
-- CCA/PAR -> débit = contrepartie.
CREATE OR REPLACE FUNCTION public.cutoff_entry_pair(
  p_kind text, p_account_id uuid, p_counterpart_id uuid,
  p_amount numeric, p_label text, p_reverse boolean
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_debit uuid; v_credit uuid; v_account_debit boolean;
BEGIN
  v_account_debit := (p_kind IN ('CAP','PCA'));
  IF p_reverse THEN v_account_debit := NOT v_account_debit; END IF;
  IF v_account_debit THEN v_debit := p_account_id; v_credit := p_counterpart_id;
  ELSE                    v_debit := p_counterpart_id; v_credit := p_account_id;
  END IF;
  RETURN jsonb_build_array(
    jsonb_build_object('account_id', v_debit,  'lot_id', NULL, 'direction','debit',  'amount', p_amount, 'entry_label', p_label),
    jsonb_build_object('account_id', v_credit, 'lot_id', NULL, 'direction','credit', 'amount', p_amount, 'entry_label', p_label)
  );
END; $$;

-- Poste le cut-off de l'exercice N. p_items = jsonb array d'objets :
--   { kind, account_id, counterpart_code, amount, label, supplier_id?, auto_reverse? }
CREATE OR REPLACE FUNCTION public.post_period_cutoff(
  p_copro_id uuid, p_period_id uuid, p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_period accounting_periods%ROWTYPE;
  v_item jsonb;
  v_kind text; v_account_id uuid; v_cp_code text; v_cp_id uuid;
  v_amount numeric; v_label text; v_supplier uuid; v_auto boolean;
  v_cp_name text; v_cp_type text;
  v_entries jsonb := '[]'::jsonb;
  v_existing uuid; v_tx_res jsonb; v_count int := 0;
BEGIN
  SELECT * INTO v_period FROM accounting_periods WHERE id = p_period_id AND copro_id = p_copro_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Période introuvable', 'period_id', p_period_id);
  END IF;
  IF v_period.status <> 'open' THEN
    RETURN jsonb_build_object('success', false,
      'error', format('Période non ouverte (statut=%s) : réouvrir (reopen_period) avant le cut-off', v_period.status),
      'period_id', p_period_id);
  END IF;

  -- Idempotence : supprimer l'ancienne écriture cut-off de N + ses items (exemption: N open).
  SELECT id INTO v_existing FROM ledger_transactions
   WHERE copro_id = p_copro_id AND source_type = 'closing'
     AND source_id = p_period_id AND period_id = p_period_id;
  IF v_existing IS NOT NULL THEN DELETE FROM ledger_transactions WHERE id = v_existing; END IF;
  DELETE FROM period_cutoff_items WHERE copro_id = p_copro_id AND period_id = p_period_id;

  FOR v_item IN SELECT jsonb_array_elements(p_items) LOOP
    v_kind       := v_item->>'kind';
    v_account_id := (v_item->>'account_id')::uuid;
    v_cp_code    := v_item->>'counterpart_code';
    v_amount     := (v_item->>'amount')::numeric;
    v_label      := v_item->>'label';
    v_supplier   := NULLIF(v_item->>'supplier_id','')::uuid;
    v_auto       := COALESCE((v_item->>'auto_reverse')::boolean, true);

    IF v_amount IS NULL OR v_amount <= 0 THEN CONTINUE; END IF;
    IF v_kind NOT IN ('CAP','CCA','PCA','PAR') THEN
      RAISE EXCEPTION 'Nature de cut-off invalide : %', v_kind;
    END IF;

    -- Upsert du compte de contrepartie par code (pas de table de plan de référence).
    SELECT m.name, m.account_type INTO v_cp_name, v_cp_type FROM (VALUES
      ('408','Fournisseurs - Factures non parvenues','liability'),
      ('421','Personnel - Rémunérations dues','liability'),
      ('431','Sécurité sociale','liability'),
      ('432','Autres organismes sociaux','liability'),
      ('486','Charges constatées d''avance','asset'),
      ('487','Produits encaissés d''avance','liability'),
      ('4618','Produits à recevoir','asset')
    ) AS m(code,name,account_type) WHERE m.code = v_cp_code;
    IF v_cp_name IS NULL THEN
      RAISE EXCEPTION 'Compte de contrepartie non géré : %', v_cp_code;
    END IF;
    INSERT INTO accounts (copro_id, code, name, account_type, is_system)
    VALUES (p_copro_id, v_cp_code, v_cp_name, v_cp_type::account_type, true)
    ON CONFLICT (copro_id, code) DO NOTHING;
    SELECT id INTO v_cp_id FROM accounts WHERE copro_id = p_copro_id AND code = v_cp_code;

    INSERT INTO period_cutoff_items
      (copro_id, period_id, kind, account_id, counterpart_account_id, amount, label, supplier_id, auto_reverse)
    VALUES
      (p_copro_id, p_period_id, v_kind, v_account_id, v_cp_id, v_amount, v_label, v_supplier, v_auto);

    v_entries := v_entries || public.cutoff_entry_pair(v_kind, v_account_id, v_cp_id, v_amount, v_label, false);
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', true, 'items', 0, 'note', 'aucun item à poster');
  END IF;

  v_tx_res := create_ledger_transaction(
    p_copro_id, p_period_id, v_period.end_date,
    'Cut-off — rattachement ' || v_period.name, 'closing', p_period_id, v_entries, true);
  IF NOT COALESCE((v_tx_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Échec écriture cut-off : %', v_tx_res;
  END IF;

  UPDATE period_cutoff_items SET posting_tx_id = (v_tx_res->>'tx_id')::uuid
   WHERE copro_id = p_copro_id AND period_id = p_period_id;

  RETURN jsonb_build_object('success', true, 'items', v_count, 'tx_id', v_tx_res->>'tx_id');
END; $$;
