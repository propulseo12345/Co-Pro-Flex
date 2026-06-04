-- ============================================================================
-- SEED « BOUCLE D'OR » — recette reproductible et générique
-- ----------------------------------------------------------------------------
-- Construit la boucle financière de bout en bout sur N'IMPORTE QUELLE copro
-- disposant déjà de ses FONDATIONS (lots + propriétaires, clés de répartition,
-- plan comptable, exercice ouvert) :
--   budget prévisionnel voté en AG → appels trimestriels agrégés multi-clés au
--   grand livre → paiements (tous les lots sauf N) → 1 facture fournisseur payée
--   + 1 dépense validée.
--
-- 100 % paramétré : aucun id de copro/lot/clé/compte codé en dur (tout est
-- résolu dynamiquement). Idempotent : ne fait rien si la période a déjà des
-- appels. Usage :  SELECT seed_golden_loop('<copro>', '<periode_ouverte>');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_golden_loop(
  p_copro_id     uuid,
  p_period_id    uuid,
  p_budget_total numeric DEFAULT 15000,
  p_unpaid_count integer DEFAULT 2
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period      RECORD;
  v_year        int;
  v_pay_date    date;
  v_key_gen     uuid;
  v_key_eau     uuid;
  v_key_asc     uuid;
  v_acc_fallback uuid;
  v_acc_assur   uuid; v_acc_syndic uuid; v_acc_menage uuid; v_acc_divers uuid;
  v_acc_eau     uuid; v_acc_asc uuid;
  v_gen         numeric;
  v_eau         numeric := 0;
  v_asc         numeric := 0;
  v_a_assur numeric; v_a_syndic numeric; v_a_menage numeric; v_a_divers numeric;
  v_budget_id   uuid;
  v_ag_id       uuid := gen_random_uuid();
  v_res_budget  uuid;
  v_res_sched   uuid;
  v_fin         jsonb;
  v_unpaid      uuid[];
  v_lot         RECORD;
  v_line_ids    uuid[];
  v_due         numeric;
  v_nb_pay      int := 0;
  v_supplier    uuid;
  v_inv         jsonb; v_invoice_id uuid;
  v_exp_line    uuid; v_exp uuid;
  v_inv_amount  numeric := round(p_budget_total * 0.166, 2);
  v_exp_amount  numeric := round(p_budget_total * 0.032, 2);
BEGIN
  -- 0. Validations -----------------------------------------------------------
  SELECT * INTO v_period FROM accounting_periods WHERE id = p_period_id AND copro_id = p_copro_id;
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'seed_golden_loop: période % introuvable pour la copro %', p_period_id, p_copro_id;
  END IF;
  IF v_period.status <> 'open' THEN
    RAISE EXCEPTION 'seed_golden_loop: la période % n''est pas ouverte (statut %)', v_period.name, v_period.status;
  END IF;
  v_year := EXTRACT(YEAR FROM v_period.start_date)::int;
  v_pay_date := LEAST(CURRENT_DATE, v_period.end_date);

  -- Idempotence : appels OU budget courant déjà présents pour la période
  IF EXISTS (SELECT 1 FROM call_for_funds WHERE copro_id = p_copro_id AND period_id = p_period_id AND status <> 'cancelled')
     OR EXISTS (SELECT 1 FROM budgets WHERE copro_id = p_copro_id AND period_id = p_period_id AND budget_type = 'current') THEN
    RETURN jsonb_build_object('success', true, 'skipped', 'déjà seedé (budget/appels existants sur la période)');
  END IF;

  -- Fondation requise : au moins un propriétaire primaire (sinon votes vides → AG rejetée)
  IF NOT EXISTS (SELECT 1 FROM lot_owners WHERE copro_id = p_copro_id AND is_primary = true) THEN
    RAISE EXCEPTION 'seed_golden_loop: aucun propriétaire primaire (lot_owners.is_primary) pour la copro % — votes d''AG impossibles', p_copro_id;
  END IF;

  -- 1. Clés de répartition (générale obligatoire + jusqu'à 2 spéciales) -------
  SELECT id INTO v_key_gen FROM repartition_keys
   WHERE copro_id = p_copro_id AND category = 'general' AND is_active = true
   ORDER BY created_at LIMIT 1;
  IF v_key_gen IS NULL THEN
    RAISE EXCEPTION 'seed_golden_loop: aucune clé de répartition générale active pour la copro %', p_copro_id;
  END IF;

  WITH sp AS (
    SELECT id, row_number() OVER (ORDER BY created_at) rn
    FROM repartition_keys WHERE copro_id = p_copro_id AND category = 'special' AND is_active = true
  )
  SELECT max(id) FILTER (WHERE rn = 1), max(id) FILTER (WHERE rn = 2) INTO v_key_eau, v_key_asc FROM sp;

  -- 2. Comptes de charge (par code, fallback sur n'importe quel 6x) -----------
  SELECT id INTO v_acc_fallback FROM accounts WHERE copro_id = p_copro_id AND code LIKE '6%' ORDER BY code LIMIT 1;
  IF v_acc_fallback IS NULL THEN
    RAISE EXCEPTION 'seed_golden_loop: aucun compte de charge (classe 6) pour la copro %', p_copro_id;
  END IF;
  v_acc_assur  := COALESCE((SELECT id FROM accounts WHERE copro_id = p_copro_id AND code = '616'), v_acc_fallback);
  v_acc_syndic := COALESCE((SELECT id FROM accounts WHERE copro_id = p_copro_id AND code = '621'), v_acc_fallback);
  v_acc_menage := COALESCE((SELECT id FROM accounts WHERE copro_id = p_copro_id AND code = '611'), v_acc_fallback);
  v_acc_divers := COALESCE((SELECT id FROM accounts WHERE copro_id = p_copro_id AND code = '628'), v_acc_fallback);
  v_acc_eau    := COALESCE((SELECT id FROM accounts WHERE copro_id = p_copro_id AND code = '605'), v_acc_fallback);
  v_acc_asc    := COALESCE((SELECT id FROM accounts WHERE copro_id = p_copro_id AND code = '614'), v_acc_fallback);

  -- 3. Répartition du budget : spéciales si elles existent, le reste en général
  IF v_key_eau IS NOT NULL THEN v_eau := round(p_budget_total * 0.16, 2); END IF;
  IF v_key_asc IS NOT NULL THEN v_asc := round(p_budget_total * 0.14, 2); END IF;
  v_gen := p_budget_total - v_eau - v_asc;
  v_a_assur  := round(v_gen * 0.35, 2);
  v_a_syndic := round(v_gen * 0.30, 2);
  v_a_menage := round(v_gen * 0.25, 2);
  v_a_divers := v_gen - v_a_assur - v_a_syndic - v_a_menage;  -- reliquat exact

  -- 4. Budget prévisionnel (draft) + lignes ----------------------------------
  INSERT INTO budgets (copro_id, period_id, budget_type, status, version, name)
  VALUES (p_copro_id, p_period_id, 'current', 'draft', 1, 'Budget prévisionnel ' || v_year)
  RETURNING id INTO v_budget_id;

  INSERT INTO budget_lines (budget_id, copro_id, account_id, repartition_key_id, label, amount, code, sort_order) VALUES
    (v_budget_id, p_copro_id, v_acc_assur,  v_key_gen, 'Assurance immeuble',          v_a_assur,  '616', 1),
    (v_budget_id, p_copro_id, v_acc_syndic, v_key_gen, 'Honoraires syndic',           v_a_syndic, '621', 2),
    (v_budget_id, p_copro_id, v_acc_menage, v_key_gen, 'Ménage parties communes',     v_a_menage, '611', 3),
    (v_budget_id, p_copro_id, v_acc_divers, v_key_gen, 'Charges diverses & AG',       v_a_divers, '628', 4);
  IF v_eau > 0 THEN
    INSERT INTO budget_lines (budget_id, copro_id, account_id, repartition_key_id, label, amount, code, sort_order)
    VALUES (v_budget_id, p_copro_id, v_acc_eau, v_key_eau, 'Eau froide collective', v_eau, '605', 5);
  END IF;
  IF v_asc > 0 THEN
    INSERT INTO budget_lines (budget_id, copro_id, account_id, repartition_key_id, label, amount, code, sort_order)
    VALUES (v_budget_id, p_copro_id, v_acc_asc, v_key_asc, 'Maintenance ascenseur', v_asc, '614', 6);
  END IF;

  -- 5. AG ordinaire qui vote le budget ---------------------------------------
  INSERT INTO ag_meetings (id, copro_id, title, meeting_type, meeting_date, status)
  VALUES (v_ag_id, p_copro_id, 'AG ordinaire ' || v_year || ' — budget prévisionnel', 'ordinary',
          (v_period.start_date - INTERVAL '15 days'), 'session_active');

  INSERT INTO ag_attendance (ag_id, copro_id, coproprietaire_id, tantiemes, presence_type, signed)
  SELECT v_ag_id, p_copro_id, o.cid, o.tant, 'present'::attendance_type, true
  FROM (
    SELECT lo.coproprietaire_id cid, sum(l.tantiemes_generaux) tant
    FROM lot_owners lo JOIN lots l ON l.id = lo.lot_id
    WHERE lo.copro_id = p_copro_id AND lo.is_primary = true AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    GROUP BY lo.coproprietaire_id
  ) o;

  INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, resolution_type, majority_type, status, action_type, variables)
  VALUES (v_ag_id, p_copro_id, 1, 'Vote du budget prévisionnel ' || v_year, 'budget'::resolution_type, 'art24'::majority_type, 'voting'::resolution_status,
          'CREATE_BUDGET', jsonb_build_object('montant', p_budget_total::text, 'date_debut', v_period.start_date::text, 'date_fin', v_period.end_date::text, 'modalites_paiement_budget', 'trimestriel'))
  RETURNING id INTO v_res_budget;

  INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, resolution_type, majority_type, status, action_type, variables)
  VALUES (v_ag_id, p_copro_id, 2, 'Échéancier des appels de fonds ' || v_year, 'budget'::resolution_type, 'art24'::majority_type, 'voting'::resolution_status,
          'SCHEDULE_BUDGET_PAYMENTS', jsonb_build_object('montant', p_budget_total::text, 'modalites_paiement_budget', 'trimestriel'))
  RETURNING id INTO v_res_sched;

  INSERT INTO ag_votes (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
  SELECT r.rid, p_copro_id, o.cid, 'for'::vote_direction, o.tant, 'live'::vote_source
  FROM (VALUES (v_res_budget), (v_res_sched)) r(rid)
  CROSS JOIN (
    SELECT lo.coproprietaire_id cid, sum(l.tantiemes_generaux) tant
    FROM lot_owners lo JOIN lots l ON l.id = lo.lot_id
    WHERE lo.copro_id = p_copro_id AND lo.is_primary = true AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    GROUP BY lo.coproprietaire_id
  ) o;

  -- 6. Finaliser l'AG → budget validé + appels trimestriels agrégés générés ---
  v_fin := finalize_and_activate_ag(v_ag_id, true);
  IF NOT (v_fin->>'success')::boolean THEN
    RAISE EXCEPTION 'seed_golden_loop: échec finalize_and_activate_ag : %', v_fin;
  END IF;

  -- Garde-fou : l'AG doit avoir produit le budget validé + les appels (sinon vote rejeté / quorum / clé incomplète)
  IF NOT EXISTS (SELECT 1 FROM call_for_funds WHERE copro_id = p_copro_id AND period_id = p_period_id AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'seed_golden_loop: l''AG n''a généré aucun appel (budget non approuvé ? quorum ? clé incomplète ?) — finalize = %', v_fin;
  END IF;

  -- 7. Paiements : tous les lots SAUF p_unpaid_count règlent leurs appels échus
  SELECT array_agg(id) INTO v_unpaid FROM (
    SELECT id FROM lots WHERE copro_id = p_copro_id ORDER BY ref DESC LIMIT GREATEST(p_unpaid_count, 0)
  ) s;
  v_unpaid := COALESCE(v_unpaid, ARRAY[]::uuid[]);

  FOR v_lot IN SELECT id FROM lots WHERE copro_id = p_copro_id AND NOT (id = ANY (v_unpaid)) LOOP
    SELECT array_agg(cl.id), sum(cl.amount_due) INTO v_line_ids, v_due
    FROM call_for_funds_lines cl
    JOIN call_for_funds c ON c.id = cl.call_id
    WHERE c.copro_id = p_copro_id AND c.period_id = p_period_id
      AND c.due_date < CURRENT_DATE AND cl.lot_id = v_lot.id;
    IF v_due IS NOT NULL AND v_due > 0 THEN
      PERFORM post_owner_payment(p_copro_id, p_period_id, v_lot.id, v_due, v_pay_date, 'bank_transfer', 'Règlement (seed)', v_line_ids);
      v_nb_pay := v_nb_pay + 1;
    END IF;
  END LOOP;

  -- 8. Côté charges réelles : 1 facture fournisseur payée + 1 dépense validée -
  SELECT id INTO v_supplier FROM suppliers WHERE copro_id = p_copro_id ORDER BY created_at LIMIT 1;
  IF v_supplier IS NULL THEN
    INSERT INTO suppliers (copro_id, name, contact, is_active)
    VALUES (p_copro_id, 'Prestataire Démo', '{}'::jsonb, true) RETURNING id INTO v_supplier;
  END IF;

  v_inv := post_supplier_invoice(
    p_copro_id, p_period_id, v_supplier, 'SEED-' || v_year || '-001',
    v_period.start_date + 30, v_period.start_date + 60, 'Prime assurance (seed)',
    jsonb_build_array(jsonb_build_object('account_id', v_acc_assur, 'label', 'Prime assurance', 'amount', v_inv_amount)),
    NULL, NULL, true, NULL, NULL, NULL
  );
  IF (v_inv->>'success')::boolean THEN
    v_invoice_id := (v_inv->>'invoice_id')::uuid;
    PERFORM post_supplier_payment(p_copro_id, p_period_id, v_invoice_id, v_inv_amount, v_period.start_date + 35, 'bank_transfer', 'Virement (seed)');
  END IF;

  SELECT id INTO v_exp_line FROM budget_lines WHERE budget_id = v_budget_id AND repartition_key_id = v_key_gen ORDER BY sort_order LIMIT 1;
  IF v_exp_line IS NOT NULL THEN
    INSERT INTO budget_expenses (copro_id, budget_id, budget_line_id, label, amount, tx_date, status)
    VALUES (p_copro_id, v_budget_id, v_exp_line, 'Petite réparation (seed)', v_exp_amount, v_period.start_date + 40, 'draft')
    RETURNING id INTO v_exp;
    PERFORM validate_budget_expense(v_exp);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'copro_id', p_copro_id,
    'period', v_period.name,
    'budget_id', v_budget_id,
    'ag_id', v_ag_id,
    'budget_total', p_budget_total,
    'lots_payes', v_nb_pay,
    'lots_impayes', COALESCE(array_length(v_unpaid, 1), 0),
    'facture', v_invoice_id,
    'message', 'Boucle d''or générée'
  );
END;
$function$;
