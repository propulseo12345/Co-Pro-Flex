-- WP5.2 — open_next_period : hook d'extourne cut-off (atomique) + nettoyage message lock_period
-- Corps inchangé vs def live (097000) ; ajouts : declaration v_rev, appel reverse_period_cutoff
-- avec RAISE si echec (atomicite report+extourne), cutoff_reversal dans le retour.
CREATE OR REPLACE FUNCTION public.open_next_period(
  p_copro_id uuid, p_closing_period_id uuid,
  p_new_name text DEFAULT NULL::text, p_new_start date DEFAULT NULL::date, p_new_end date DEFAULT NULL::date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_n            accounting_periods%ROWTYPE;
  v_next_id      uuid;
  v_next_start   date;
  v_next_end     date;
  v_next_name    text;
  v_existing_tx  uuid;
  v_acct_120     uuid;
  v_carry        jsonb;
  v_net67        numeric;
  v_result_entry jsonb;
  v_entries      jsonb;
  v_tx_res       jsonb;
  v_rev          jsonb;   -- WP5.2
BEGIN
  SELECT * INTO v_n FROM accounting_periods
   WHERE id = p_closing_period_id AND copro_id = p_copro_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Exercice de clôture introuvable', 'period_id', p_closing_period_id);
  END IF;
  IF v_n.status = 'open' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Clôturez d''abord l''exercice N (close_period)',
      'period_id', p_closing_period_id, 'status', v_n.status);
  END IF;

  SELECT id INTO v_acct_120 FROM accounts WHERE copro_id = p_copro_id AND code = '120';
  IF v_acct_120 IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Compte 120 absent pour cette copropriété', 'copro_id', p_copro_id);
  END IF;

  SELECT id INTO v_existing_tx FROM ledger_transactions
   WHERE copro_id = p_copro_id AND source_type = 'opening_balance' AND source_id = p_closing_period_id;
  IF v_existing_tx IS NOT NULL AND v_n.status = 'approved' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Reprise figée : exercice source approuvé', 'period_id', p_closing_period_id, 'tx_id', v_existing_tx);
  END IF;
  IF v_existing_tx IS NOT NULL THEN
    DELETE FROM ledger_transactions WHERE id = v_existing_tx;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
           'account_id', x.account_id, 'lot_id', x.lot_id,
           'direction', CASE WHEN x.net > 0 THEN 'debit' ELSE 'credit' END,
           'amount', abs(x.net), 'entry_label', 'Report à-nouveau'))
    INTO v_carry
  FROM (
    SELECT e.account_id, e.lot_id,
           round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 2) AS net
    FROM ledger_entries e
    JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
    JOIN accounts a ON a.id = e.account_id
    WHERE e.copro_id = p_copro_id AND e.period_id = p_closing_period_id
      AND substr(a.code, 1, 1) IN ('1','4','5')
    GROUP BY e.account_id, e.lot_id
    HAVING round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 2) <> 0
  ) x;

  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0), 2)
    INTO v_net67
  FROM ledger_entries e
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  JOIN accounts a ON a.id = e.account_id
  WHERE e.copro_id = p_copro_id AND e.period_id = p_closing_period_id
    AND substr(a.code, 1, 1) IN ('6','7');

  IF v_net67 <> 0 THEN
    v_result_entry := jsonb_build_array(jsonb_build_object(
      'account_id', v_acct_120, 'lot_id', NULL,
      'direction', CASE WHEN v_net67 < 0 THEN 'credit' ELSE 'debit' END,
      'amount', abs(v_net67), 'entry_label', 'Résultat de l''exercice ' || v_n.name));
  ELSE
    v_result_entry := '[]'::jsonb;
  END IF;

  v_entries := coalesce(v_carry, '[]'::jsonb) || v_result_entry;
  IF jsonb_array_length(v_entries) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucun solde à reporter pour cet exercice', 'period_id', p_closing_period_id);
  END IF;

  v_next_start := COALESCE(p_new_start, (v_n.start_date + INTERVAL '1 year')::date);
  v_next_end   := COALESCE(p_new_end,   (v_n.end_date   + INTERVAL '1 year')::date);
  v_next_name  := COALESCE(p_new_name,  'Exercice ' || EXTRACT(YEAR FROM v_next_start)::int);

  SELECT id INTO v_next_id FROM accounting_periods
   WHERE copro_id = p_copro_id AND start_date = v_next_start AND end_date = v_next_end;
  IF v_next_id IS NULL THEN
    INSERT INTO accounting_periods (copro_id, name, start_date, end_date, status)
    VALUES (p_copro_id, v_next_name, v_next_start, v_next_end, 'open') RETURNING id INTO v_next_id;
  ELSE
    UPDATE accounting_periods SET status = 'open' WHERE id = v_next_id AND status <> 'open';
  END IF;

  v_tx_res := create_ledger_transaction(
    p_copro_id, v_next_id, v_next_start,
    'À-nouveau — reprise des soldes ' || v_n.name || ' → ' || v_next_name,
    'opening_balance', p_closing_period_id, v_entries, true);

  IF NOT coalesce((v_tx_res->>'success')::boolean, false) THEN
    DELETE FROM ledger_transactions
     WHERE copro_id = p_copro_id AND source_type = 'opening_balance'
       AND source_id = p_closing_period_id AND status = 'draft';
    RETURN jsonb_build_object('success', false, 'error', 'Échec de la création de la reprise',
      'detail', v_tx_res, 'next_period_id', v_next_id);
  END IF;

  -- WP5.2 : extourne automatique du cut-off de N dans N+1 (atomique : RAISE si échec).
  v_rev := public.reverse_period_cutoff(p_copro_id, p_closing_period_id);
  IF NOT coalesce((v_rev->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Extourne cut-off échouée (période %): %', p_closing_period_id, v_rev->>'error';
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'next_period_id', v_next_id, 'next_period_name', v_next_name,
    'opening_tx_id', v_tx_res->>'tx_id', 'carry_lines', coalesce(jsonb_array_length(v_carry), 0),
    'result_net67', v_net67, 'result_to_120', abs(v_net67),
    'cutoff_reversal', v_rev);
END;
$function$;
