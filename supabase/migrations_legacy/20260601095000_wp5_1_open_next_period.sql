-- ============================================================================
-- WP5.1 — open_next_period : ouverture de N+1 + reprise des soldes (à-nouveau)
-- ============================================================================
-- Idempotente (DELETE-then-recreate de la reprise opening_balance(source_id=N)).
-- Provisoire tant que N != approved ; figée dès que N = 'approved'.
-- Report : comptes de bilan classes 1/4/5 (HORS 110/120/119/129) à l'identique,
-- en conservant lot_id ; résultat (classes 6/7) viré en 120.
-- Équilibre garanti par construction (la balance de N est équilibrée).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.open_next_period(
  p_copro_id          uuid,
  p_closing_period_id uuid,
  p_new_name          text DEFAULT NULL,
  p_new_start         date DEFAULT NULL,
  p_new_end           date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
BEGIN
  -- 1) Charger N et refuser s'il est encore 'open'.
  SELECT * INTO v_n FROM accounting_periods
   WHERE id = p_closing_period_id AND copro_id = p_copro_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Exercice de clôture introuvable', 'period_id', p_closing_period_id);
  END IF;
  IF v_n.status = 'open' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Verrouillez ou clôturez d''abord l''exercice N (lock_period/close_period)',
      'period_id', p_closing_period_id, 'status', v_n.status);
  END IF;

  -- 2) Compte 120 (résultat opérations courantes)
  SELECT id INTO v_acct_120 FROM accounts
   WHERE copro_id = p_copro_id AND code = '120';
  IF v_acct_120 IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Compte 120 absent pour cette copropriété (voir normalisation des comptes de report)',
      'copro_id', p_copro_id);
  END IF;

  -- 3) Dates / nom de N+1
  v_next_start := COALESCE(p_new_start, (v_n.start_date + INTERVAL '1 year')::date);
  v_next_end   := COALESCE(p_new_end,   (v_n.end_date   + INTERVAL '1 year')::date);
  v_next_name  := COALESCE(p_new_name,  'Exercice ' || EXTRACT(YEAR FROM v_next_start)::int);

  -- 4) Récupérer/créer N+1, garantir status='open'
  SELECT id INTO v_next_id FROM accounting_periods
   WHERE copro_id = p_copro_id AND start_date = v_next_start AND end_date = v_next_end;
  IF v_next_id IS NULL THEN
    INSERT INTO accounting_periods (copro_id, name, start_date, end_date, status)
    VALUES (p_copro_id, v_next_name, v_next_start, v_next_end, 'open')
    RETURNING id INTO v_next_id;
  ELSE
    UPDATE accounting_periods SET status = 'open'
     WHERE id = v_next_id AND status <> 'open';
  END IF;

  -- 5) Reprise existante pour ce N ?
  SELECT id INTO v_existing_tx FROM ledger_transactions
   WHERE copro_id = p_copro_id
     AND source_type = 'opening_balance'
     AND source_id = p_closing_period_id;

  -- 5a) Gel : si N approuvé, refuser PROPREMENT (avant DELETE).
  IF v_existing_tx IS NOT NULL AND v_n.status = 'approved' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Reprise figée : exercice source approuvé',
      'period_id', p_closing_period_id, 'tx_id', v_existing_tx);
  END IF;

  -- 5b) Supprimer l'ancienne reprise (autorisé par l'exemption tant que N != approved).
  IF v_existing_tx IS NOT NULL THEN
    DELETE FROM ledger_transactions WHERE id = v_existing_tx;
  END IF;

  -- 6) Report des comptes de bilan (classes 1/4/5), HORS comptes de report.
  SELECT jsonb_agg(jsonb_build_object(
           'account_id',  x.account_id,
           'lot_id',      x.lot_id,
           'direction',   CASE WHEN x.net > 0 THEN 'debit' ELSE 'credit' END,
           'amount',      abs(x.net),
           'entry_label', 'Report à-nouveau ' || v_next_name
         ))
    INTO v_carry
  FROM (
    SELECT e.account_id, e.lot_id,
           round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 2) AS net
    FROM ledger_entries e
    JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
    JOIN accounts a ON a.id = e.account_id
    WHERE e.copro_id = p_copro_id
      AND e.period_id = p_closing_period_id
      AND substr(a.code, 1, 1) IN ('1','4','5')
      AND a.code NOT IN ('110','120','119','129')
    GROUP BY e.account_id, e.lot_id
    HAVING round(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 2) <> 0
  ) x;

  -- 7) Résultat de l'exercice (classes 6/7) -> 120.
  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0), 2)
    INTO v_net67
  FROM ledger_entries e
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  JOIN accounts a ON a.id = e.account_id
  WHERE e.copro_id = p_copro_id
    AND e.period_id = p_closing_period_id
    AND substr(a.code, 1, 1) IN ('6','7');

  IF v_net67 <> 0 THEN
    v_result_entry := jsonb_build_array(jsonb_build_object(
      'account_id',  v_acct_120,
      'lot_id',      NULL,
      'direction',   CASE WHEN v_net67 < 0 THEN 'credit' ELSE 'debit' END,
      'amount',      abs(v_net67),
      'entry_label', 'Résultat de l''exercice ' || v_n.name
    ));
  ELSE
    v_result_entry := '[]'::jsonb;
  END IF;

  v_entries := coalesce(v_carry, '[]'::jsonb) || v_result_entry;

  IF jsonb_array_length(v_entries) = 0 THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Aucun solde à reporter pour cet exercice',
      'period_id', p_closing_period_id);
  END IF;

  -- 8) Poster la reprise dans N+1 (open) via la route canonique (auto_post + garde CR3).
  v_tx_res := create_ledger_transaction(
    p_copro_id,
    v_next_id,
    v_next_start,
    'À-nouveau — reprise des soldes ' || v_n.name || ' → ' || v_next_name,
    'opening_balance',
    p_closing_period_id,
    v_entries,
    true
  );

  IF NOT coalesce((v_tx_res->>'success')::boolean, false) THEN
    DELETE FROM ledger_transactions
     WHERE copro_id = p_copro_id AND source_type = 'opening_balance'
       AND source_id = p_closing_period_id AND status = 'draft';
    RETURN jsonb_build_object('success', false,
      'error', 'Échec de la création de la reprise',
      'detail', v_tx_res, 'next_period_id', v_next_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'next_period_id', v_next_id,
    'next_period_name', v_next_name,
    'opening_tx_id', v_tx_res->>'tx_id',
    'carry_lines', coalesce(jsonb_array_length(v_carry), 0),
    'result_net67', v_net67,
    'result_to_120', abs(v_net67)
  );
END;
$$;
