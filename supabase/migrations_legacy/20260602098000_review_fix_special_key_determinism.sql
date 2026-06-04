-- ============================================================
-- REVIEW FIX (harnais) — déterminisme des 2 clés spéciales
-- ============================================================
-- La review a montré que la résolution des 2 clés spéciales (eau 605 /
-- ascenseur 614) dans seed_golden_loop reposait sur ORDER BY created_at sans
-- tie-breaker. Dans une copro clonée par create_test_copro, toutes les clés
-- partagent le même created_at (un seul INSERT...SELECT) → ordre non
-- déterministe → ventilation eau/ascenseur potentiellement inversée (flaky).
-- Double correctif :
--  1) seed_golden_loop : tie-breaker secondaire « , id » (ordre déterministe).
--  2) create_test_copro : cloner created_at depuis la source (préserve l'ordre
--     d'origine de la boucle d'or dans les copros jetables).

-- 1) seed_golden_loop : tie-breaker , id sur les clés spéciales
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
  SELECT * INTO v_period FROM accounting_periods WHERE id = p_period_id AND copro_id = p_copro_id;
  IF v_period IS NULL THEN
    RAISE EXCEPTION 'seed_golden_loop: période % introuvable pour la copro %', p_period_id, p_copro_id;
  END IF;
  IF v_period.status <> 'open' THEN
    RAISE EXCEPTION 'seed_golden_loop: la période % n''est pas ouverte (statut %)', v_period.name, v_period.status;
  END IF;
  v_year := EXTRACT(YEAR FROM v_period.start_date)::int;
  v_pay_date := LEAST(CURRENT_DATE, v_period.end_date);

  IF EXISTS (SELECT 1 FROM call_for_funds WHERE copro_id = p_copro_id AND period_id = p_period_id AND status <> 'cancelled')
     OR EXISTS (SELECT 1 FROM budgets WHERE copro_id = p_copro_id AND period_id = p_period_id AND budget_type = 'current') THEN
    RETURN jsonb_build_object('success', true, 'skipped', 'déjà seedé (budget/appels existants sur la période)');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM lot_owners WHERE copro_id = p_copro_id AND is_primary = true) THEN
    RAISE EXCEPTION 'seed_golden_loop: aucun propriétaire primaire (lot_owners.is_primary) pour la copro % — votes d''AG impossibles', p_copro_id;
  END IF;

  SELECT id INTO v_key_gen FROM repartition_keys
   WHERE copro_id = p_copro_id AND category = 'general' AND is_active = true
   ORDER BY created_at, id LIMIT 1;
  IF v_key_gen IS NULL THEN
    RAISE EXCEPTION 'seed_golden_loop: aucune clé de répartition générale active pour la copro %', p_copro_id;
  END IF;

  -- 2 clés spéciales : ordre DÉTERMINISTE (created_at puis id en tie-breaker)
  SELECT id INTO v_key_eau FROM repartition_keys
   WHERE copro_id = p_copro_id AND category = 'special' AND is_active = true
   ORDER BY created_at, id LIMIT 1;
  SELECT id INTO v_key_asc FROM repartition_keys
   WHERE copro_id = p_copro_id AND category = 'special' AND is_active = true
   ORDER BY created_at, id OFFSET 1 LIMIT 1;

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

  IF v_key_eau IS NOT NULL THEN v_eau := round(p_budget_total * 0.16, 2); END IF;
  IF v_key_asc IS NOT NULL THEN v_asc := round(p_budget_total * 0.14, 2); END IF;
  v_gen := p_budget_total - v_eau - v_asc;
  v_a_assur  := round(v_gen * 0.35, 2);
  v_a_syndic := round(v_gen * 0.30, 2);
  v_a_menage := round(v_gen * 0.25, 2);
  v_a_divers := v_gen - v_a_assur - v_a_syndic - v_a_menage;

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

  v_fin := finalize_and_activate_ag(v_ag_id, true);
  IF NOT (v_fin->>'success')::boolean THEN
    RAISE EXCEPTION 'seed_golden_loop: échec finalize_and_activate_ag : %', v_fin;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM call_for_funds WHERE copro_id = p_copro_id AND period_id = p_period_id AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'seed_golden_loop: l''AG n''a généré aucun appel (budget non approuvé ? quorum ? clé incomplète ?) — finalize = %', v_fin;
  END IF;

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
      PERFORM post_owner_payment(p_copro_id, p_period_id, v_lot.id, v_due, v_pay_date, 'bank_transfer', 'Règlement (seed)', v_line_ids, gen_random_uuid());
      v_nb_pay := v_nb_pay + 1;
    END IF;
  END LOOP;

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
    PERFORM post_supplier_payment(p_copro_id, p_period_id, v_invoice_id, v_inv_amount, v_period.start_date + 35, 'bank_transfer', 'Virement (seed)', gen_random_uuid());
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

-- 2) create_test_copro : cloner created_at des clés (préserve l'ordre source)
CREATE OR REPLACE FUNCTION public.create_test_copro(p_tag text DEFAULT 'default')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src    uuid := '22222222-aaaa-bbbb-cccc-222222222222';
  v_new    uuid := gen_random_uuid();
  v_period uuid := gen_random_uuid();
  v_year   int  := EXTRACT(YEAR FROM CURRENT_DATE)::int;
BEGIN
  INSERT INTO copros (id, name, address, city, postal_code, siret, num_immatriculation,
                      date_reglement, buildings_count, lots_count, total_tantiemes,
                      annee_construction, exercice_debut, cabinet_id, onboarding_step, onboarding_max_step)
  SELECT v_new, 'HARNESS '||substr(v_new::text,1,8)||' ('||p_tag||')', address, city, postal_code, siret, NULL,
         date_reglement, buildings_count, lots_count, total_tantiemes,
         annee_construction, exercice_debut, cabinet_id, onboarding_step, onboarding_max_step
  FROM copros WHERE id = v_src;

  CREATE TEMP TABLE _map_acc (old_id uuid, new_id uuid) ON COMMIT DROP;
  INSERT INTO _map_acc SELECT id, gen_random_uuid() FROM accounts WHERE copro_id = v_src;
  INSERT INTO accounts (id, copro_id, code, name, account_type, is_active, parent_id,
                        is_system, description, banque, iban, bic, initial_balance)
  SELECT m.new_id, v_new, a.code, a.name, a.account_type, a.is_active, NULL,
         a.is_system, a.description, a.banque, a.iban, a.bic, a.initial_balance
  FROM accounts a JOIN _map_acc m ON m.old_id = a.id WHERE a.copro_id = v_src;
  UPDATE accounts t SET parent_id = mp.new_id
  FROM accounts a JOIN _map_acc mc ON mc.old_id = a.id
                  JOIN _map_acc mp ON mp.old_id = a.parent_id
  WHERE a.copro_id = v_src AND a.parent_id IS NOT NULL AND t.id = mc.new_id;

  CREATE TEMP TABLE _map_co (old_id uuid, new_id uuid) ON COMMIT DROP;
  INSERT INTO _map_co SELECT id, gen_random_uuid() FROM coproprietaires WHERE copro_id = v_src;
  INSERT INTO coproprietaires (id, copro_id, user_id, is_company, company_name, civility,
                               first_name, last_name, email, phone, mobile, address_line1, address_line2,
                               city, postal_code, country, prefers_email, prefers_paper, notes, is_resident)
  SELECT m.new_id, v_new, NULL, c.is_company, c.company_name, c.civility,
         c.first_name, c.last_name, c.email, c.phone, c.mobile, c.address_line1, c.address_line2,
         c.city, c.postal_code, c.country, c.prefers_email, c.prefers_paper, c.notes, c.is_resident
  FROM coproprietaires c JOIN _map_co m ON m.old_id = c.id WHERE c.copro_id = v_src;

  CREATE TEMP TABLE _map_lot (old_id uuid, new_id uuid) ON COMMIT DROP;
  INSERT INTO _map_lot SELECT id, gen_random_uuid() FROM lots WHERE copro_id = v_src;
  INSERT INTO lots (id, copro_id, building_id, ref, type, floor, surface, tantiemes_generaux,
                    tantiemes_escalier, tantiemes_ascenseur, tantiemes_chauffage, description)
  SELECT m.new_id, v_new, NULL, l.ref, l.type, l.floor, l.surface, l.tantiemes_generaux,
         l.tantiemes_escalier, l.tantiemes_ascenseur, l.tantiemes_chauffage, l.description
  FROM lots l JOIN _map_lot m ON m.old_id = l.id WHERE l.copro_id = v_src;

  INSERT INTO lot_owners (id, lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date, end_date)
  SELECT gen_random_uuid(), ml.new_id, mc.new_id, v_new, lo.share_percent, lo.is_primary, lo.start_date, lo.end_date
  FROM lot_owners lo
  JOIN _map_lot ml ON ml.old_id = lo.lot_id
  JOIN _map_co  mc ON mc.old_id = lo.coproprietaire_id
  WHERE lo.copro_id = v_src;

  CREATE TEMP TABLE _map_key (old_id uuid, new_id uuid) ON COMMIT DROP;
  INSERT INTO _map_key SELECT id, gen_random_uuid() FROM repartition_keys WHERE copro_id = v_src;
  -- created_at cloné depuis la source -> préserve l'ordre des clés (eau/ascenseur) dans la copro jetable
  INSERT INTO repartition_keys (id, copro_id, name, basis, description, is_active, coverage_mode, category, valid_from, valid_to, created_at)
  SELECT m.new_id, v_new, rk.name, rk.basis, rk.description, rk.is_active, rk.coverage_mode, rk.category, rk.valid_from, rk.valid_to, rk.created_at
  FROM repartition_keys rk JOIN _map_key m ON m.old_id = rk.id WHERE rk.copro_id = v_src;

  INSERT INTO repartition_key_lines (id, key_id, copro_id, lot_id, weight)
  SELECT gen_random_uuid(), mk.new_id, v_new, ml.new_id, rkl.weight
  FROM repartition_key_lines rkl
  JOIN _map_key mk ON mk.old_id = rkl.key_id
  JOIN _map_lot ml ON ml.old_id = rkl.lot_id
  WHERE rkl.copro_id = v_src;

  INSERT INTO suppliers (id, copro_id, name, siret, contact, is_active)
  SELECT gen_random_uuid(), v_new, s.name, s.siret, s.contact, s.is_active
  FROM suppliers s WHERE s.copro_id = v_src;

  INSERT INTO accounting_periods (id, copro_id, name, start_date, end_date, status)
  VALUES (v_period, v_new, 'Exercice '||v_year, make_date(v_year,1,1), make_date(v_year,12,31), 'open');

  RAISE NOTICE 'HARNESS copro % (period %) prete.', v_new, v_period;
  RETURN v_new;
END;
$function$;
