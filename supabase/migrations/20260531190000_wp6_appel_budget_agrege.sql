-- ============================================================================
-- WP6 — Appel de fonds AGRÉGÉ multi-clés (Phase 1 : couche données)
-- ----------------------------------------------------------------------------
-- PROBLÈME corrigé :
--   Jusqu'ici un appel de fonds portait UNE seule clé de répartition. Le chemin
--   AG (`generate_calls_from_ag_payload`) collait donc TOUT le budget sur la clé
--   générale → les charges eau/ascenseur étaient diluées sur les tantièmes
--   généraux (faux). Et l'ancien seed faisait l'inverse : un appel séparé par clé.
--
-- BON MODÈLE (copro française, provisions art. 14-1) :
--   UN seul appel de fonds par échéance. Montant dû par lot =
--     Σ sur chaque poste budgétaire [ montant_poste × (quote-part du lot dans la
--     clé du poste) ] × fraction (1/4 en trimestriel).
--   Comptablement : la clé ne change PAS les comptes (elle ne change que la
--   ventilation du débit entre lots) :
--     D 450-1 (copropriétaire, nature courante) PAR LOT, montant agrégé toutes clés
--     C 701 / 702 / 105 (selon la nature) au TOTAL.
--
-- Ce que fait cette migration :
--   1. `call_for_funds.repartition_key_id` devient NULLABLE (un appel agrégé n'a
--      pas de clé unique ; la clé vit désormais sur chaque LIGNE).
--   2. Nouvelle RPC `post_budget_call_for_funds` : 1 appel, 1 ligne par (lot×clé),
--      écriture agrégée par lot au grand livre.
--   3. `generate_calls_from_ag_payload` rebranché sur la nouvelle RPC.
--   4. Vues `v_call_lines_detailed` (clé PAR LIGNE + nom) et `v_calls_overview`
--      (liste des clés + comptes par LOT) adaptées au modèle multi-lignes/lot.
--
-- `post_call_for_funds` (mono-clé) est CONSERVÉE comme primitive pour les appels
-- exceptionnels ciblés sur une clé unique (ex. ravalement sur clé travaux).
-- ============================================================================

-- 1) La clé de répartition de l'appel n'est plus obligatoire (appel agrégé)
ALTER TABLE call_for_funds ALTER COLUMN repartition_key_id DROP NOT NULL;

-- 1b) Unicité d'une ligne par (appel, lot, CLÉ) — le modèle (b) crée une ligne
--     par (lot × clé), donc plusieurs lignes par lot dans un même appel.
ALTER TABLE call_for_funds_lines DROP CONSTRAINT IF EXISTS uq_call_line_lot;
ALTER TABLE call_for_funds_lines ADD CONSTRAINT uq_call_line_lot_key
  UNIQUE (call_id, lot_id, repartition_key_id);


-- 2) RPC : appel de fonds agrégé multi-clés à partir d'un budget
CREATE OR REPLACE FUNCTION public.post_budget_call_for_funds(
  p_copro_id   uuid,
  p_period_id  uuid,
  p_budget_id  uuid,
  p_label      text,
  p_trimester  integer,
  p_issue_date date,
  p_due_date   date,
  p_fraction   numeric DEFAULT 1.0
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nature      text;
  v_debit_acct  uuid;
  v_credit_code text;
  v_credit_acct uuid;
  v_call_id     uuid;
  v_key         RECORD;
  v_total       numeric := 0;
  v_entries     jsonb;
  v_ltx         jsonb;
  v_tx_id       uuid;
  v_nb_lines    integer;
BEGIN
  IF p_fraction IS NULL OR p_fraction <= 0 THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: fraction doit être > 0 (reçu %)', p_fraction;
  END IF;
  IF p_budget_id IS NULL THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: budget_id requis';
  END IF;

  -- Nature du budget → compte tiers débiteur (450-x) + contrepartie
  SELECT budget_type::text INTO v_nature FROM budgets WHERE id = p_budget_id AND copro_id = p_copro_id;
  IF v_nature IS NULL THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: budget % introuvable pour la copro %', p_budget_id, p_copro_id;
  END IF;

  v_debit_acct := resolve_lot_tiers_account(p_copro_id, v_nature);

  v_credit_code := CASE v_nature
    WHEN 'current' THEN '701'
    WHEN 'works'   THEN '702'
    WHEN 'alur'    THEN '105'
    ELSE '701'
  END;
  SELECT id INTO v_credit_acct FROM accounts WHERE copro_id = p_copro_id AND code = v_credit_code;
  IF v_credit_acct IS NULL THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: compte de contrepartie % introuvable pour la copro %', v_credit_code, p_copro_id;
  END IF;

  -- Garde-fou : chaque clé utilisée par le budget doit être complète
  FOR v_key IN
    SELECT DISTINCT bl.repartition_key_id AS key_id
    FROM budget_lines bl
    WHERE bl.budget_id = p_budget_id AND bl.repartition_key_id IS NOT NULL
  LOOP
    IF NOT repartition_key_is_complete(v_key.key_id) THEN
      RAISE EXCEPTION 'post_budget_call_for_funds: clé de répartition % incomplète — émission bloquée', v_key.key_id;
    END IF;
  END LOOP;

  -- Total à appeler, calculé AVANT l'insert (contrainte call_for_funds_total_amount_check : total > 0)
  WITH budget_by_key AS (
    SELECT bl.repartition_key_id AS key_id, sum(bl.amount) AS amount
    FROM budget_lines bl
    WHERE bl.budget_id = p_budget_id AND bl.repartition_key_id IS NOT NULL
    GROUP BY bl.repartition_key_id
  ),
  key_totals AS (
    SELECT key_id, sum(weight) AS total_weight FROM repartition_key_lines GROUP BY key_id
  )
  SELECT coalesce(sum(round(p_fraction * bbk.amount * rkl.weight / kt.total_weight, 2)), 0)
  INTO v_total
  FROM budget_by_key bbk
  JOIN key_totals kt             ON kt.key_id = bbk.key_id AND kt.total_weight > 0
  JOIN repartition_key_lines rkl ON rkl.key_id = bbk.key_id
  WHERE round(p_fraction * bbk.amount * rkl.weight / kt.total_weight, 2) > 0;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: budget % sans montant à appeler (lignes/clés manquantes ?)', p_budget_id;
  END IF;

  -- L'appel (clé NULL = agrégé)
  INSERT INTO call_for_funds (
    copro_id, period_id, budget_id, repartition_key_id, label, trimester,
    issue_date, due_date, total_amount, status, issued_at
  ) VALUES (
    p_copro_id, p_period_id, p_budget_id, NULL, p_label, p_trimester,
    p_issue_date, p_due_date, v_total, 'issued', now()
  )
  RETURNING id INTO v_call_id;

  -- 1 ligne par (lot × clé) : montant = fraction × budget_de_la_clé × poids_lot / poids_total_clé
  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due, repartition_key_id, weight_snapshot)
  SELECT p_copro_id, v_call_id, x.lot_id, x.amount, x.key_id, x.weight
  FROM (
    WITH budget_by_key AS (
      SELECT bl.repartition_key_id AS key_id, sum(bl.amount) AS amount
      FROM budget_lines bl
      WHERE bl.budget_id = p_budget_id AND bl.repartition_key_id IS NOT NULL
      GROUP BY bl.repartition_key_id
    ),
    key_totals AS (
      SELECT key_id, sum(weight) AS total_weight
      FROM repartition_key_lines
      GROUP BY key_id
    )
    SELECT rkl.lot_id,
           rkl.key_id,
           rkl.weight,
           round(p_fraction * bbk.amount * rkl.weight / kt.total_weight, 2) AS amount
    FROM budget_by_key bbk
    JOIN key_totals kt        ON kt.key_id = bbk.key_id AND kt.total_weight > 0
    JOIN repartition_key_lines rkl ON rkl.key_id = bbk.key_id
  ) x
  WHERE x.amount > 0;

  -- Écriture : D 450-x par LOT (agrégé toutes clés) / C 701·702·105 au total
  SELECT jsonb_agg(jsonb_build_object(
    'account_id', v_debit_acct, 'lot_id', s.lot_id, 'direction', 'debit',
    'amount', s.lot_amount, 'entry_label', 'Appel : ' || p_label
  )) INTO v_entries
  FROM (
    SELECT lot_id, sum(amount_due) AS lot_amount
    FROM call_for_funds_lines WHERE call_id = v_call_id
    GROUP BY lot_id
  ) s;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_credit_acct, 'direction', 'credit', 'amount', v_total, 'entry_label', 'Appel : ' || p_label
  ));

  v_ltx := create_ledger_transaction(
    p_copro_id, p_period_id, p_issue_date, 'Appel de fonds : ' || p_label,
    'call_for_funds', v_call_id, v_entries, true
  );
  IF NOT (v_ltx->>'success')::boolean THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: échec écriture grand livre : %', v_ltx->>'error';
  END IF;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  UPDATE call_for_funds SET ledger_tx_id = v_tx_id WHERE id = v_call_id;

  SELECT count(*) INTO v_nb_lines FROM call_for_funds_lines WHERE call_id = v_call_id;

  RETURN jsonb_build_object(
    'success', true, 'call_id', v_call_id, 'ledger_tx_id', v_tx_id,
    'total_amount', v_total, 'nb_lines', v_nb_lines, 'nature', v_nature
  );
END;
$function$;


-- 3) L'AG génère désormais des appels AGRÉGÉS (un par échéance, multi-clés)
CREATE OR REPLACE FUNCTION public.generate_calls_from_ag_payload(p_copro_id uuid, p_ag_id uuid, p_resolution_id uuid, p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_modalite     TEXT;
  v_budget_type  TEXT;
  v_budget_id    UUID;
  v_period_id    UUID;
  v_total        NUMERIC;
  v_nb_appels    INT;
  v_i            INT;
  v_issue_date   DATE;
  v_due_date     DATE;
  v_year         INT;
  v_label_prefix TEXT;
  v_res          JSONB;
BEGIN
  v_modalite    := COALESCE(p_payload->>'modalites_paiement_budget', p_payload->>'modalites_paiement', 'trimestriel');
  v_budget_type := COALESCE(p_payload->>'budget_type', 'current');

  SELECT b.id, COALESCE(SUM(bl.amount), 0), b.period_id
  INTO v_budget_id, v_total, v_period_id
  FROM budgets b
  LEFT JOIN budget_lines bl ON bl.budget_id = b.id
  WHERE b.source_ag_id = p_ag_id AND b.copro_id = p_copro_id
    AND b.budget_type = v_budget_type::budget_type
    AND b.status IN ('draft_from_ag', 'validated')
  GROUP BY b.id, b.period_id
  ORDER BY b.created_at DESC
  LIMIT 1;

  IF v_budget_id IS NULL OR v_period_id IS NULL OR v_total IS NULL OR v_total <= 0 THEN
    RETURN;
  END IF;

  -- Idempotence : ne pas régénérer si des appels existent déjà pour ce budget
  IF EXISTS (SELECT 1 FROM call_for_funds WHERE budget_id = v_budget_id AND status <> 'cancelled') THEN
    RETURN;
  END IF;

  CASE LOWER(v_modalite)
    WHEN 'unique', 'annuel' THEN v_nb_appels := 1;
    WHEN 'semestriel'       THEN v_nb_appels := 2;
    WHEN 'trimestriel'      THEN v_nb_appels := 4;
    ELSE v_nb_appels := 4;
  END CASE;

  SELECT EXTRACT(YEAR FROM start_date)::INT INTO v_year FROM accounting_periods WHERE id = v_period_id;

  v_label_prefix := CASE v_budget_type WHEN 'alur' THEN 'Appel ALUR T' WHEN 'works' THEN 'Appel Travaux T' ELSE 'Appel T' END;

  FOR v_i IN 1..v_nb_appels LOOP
    CASE v_nb_appels
      WHEN 1 THEN v_issue_date := make_date(v_year, 1, 1);                 v_due_date := make_date(v_year, 1, 31);
      WHEN 2 THEN v_issue_date := make_date(v_year, (v_i - 1) * 6 + 1, 1); v_due_date := (v_issue_date + INTERVAL '30 days')::date;
      WHEN 4 THEN v_issue_date := make_date(v_year, (v_i - 1) * 3 + 1, 1); v_due_date := (v_issue_date + INTERVAL '30 days')::date;
    END CASE;

    v_res := post_budget_call_for_funds(
      p_copro_id, v_period_id, v_budget_id,
      v_label_prefix || v_i || ' ' || v_year, v_i, v_issue_date, v_due_date, (1.0 / v_nb_appels)::numeric
    );
    IF NOT (v_res->>'success')::boolean THEN
      RAISE EXCEPTION 'generate_calls_from_ag_payload: échec appel T% : %', v_i, v_res->>'error';
    END IF;
  END LOOP;
END;
$function$;


-- 4a) Vue lignes détaillées : la clé est désormais celle de la LIGNE (+ son nom)
CREATE OR REPLACE VIEW public.v_call_lines_detailed AS
 SELECT cfl.id,
    cfl.copro_id,
    cfl.call_id,
    cf.label AS call_label,
    cf.issue_date,
    cf.due_date,
    cf.status AS call_status,
    cfl.repartition_key_id,
    cfl.lot_id,
    l.ref AS lot_ref,
    l.type AS lot_type,
    cfl.amount_due,
    cfl.amount_paid,
    cfl.amount_due - cfl.amount_paid AS amount_remaining,
    cfl.status,
    COALESCE(cfl.weight_snapshot, rkl.weight, 0::numeric) AS lot_weight,
    COALESCE(rk_total.total_weight, 0::numeric) AS key_total_weight,
    ( SELECT (cp.first_name || ' '::text) || cp.last_name
           FROM lot_owners lo
             JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
          WHERE lo.lot_id = cfl.lot_id AND lo.is_primary = true AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
         LIMIT 1) AS owner_name,
    rk.name AS repartition_key_name
   FROM call_for_funds_lines cfl
     JOIN call_for_funds cf ON cf.id = cfl.call_id
     JOIN lots l ON l.id = cfl.lot_id
     LEFT JOIN repartition_keys rk ON rk.id = cfl.repartition_key_id
     LEFT JOIN repartition_key_lines rkl ON rkl.key_id = cfl.repartition_key_id AND rkl.lot_id = cfl.lot_id
     LEFT JOIN ( SELECT repartition_key_lines.key_id,
            sum(repartition_key_lines.weight) AS total_weight
           FROM repartition_key_lines
          GROUP BY repartition_key_lines.key_id) rk_total ON rk_total.key_id = cfl.repartition_key_id;


-- 4b) Vue d'ensemble : nom = liste des clés de l'appel ; comptages par LOT (pas par ligne)
CREATE OR REPLACE VIEW public.v_calls_overview AS
 SELECT cf.id,
    cf.copro_id,
    cf.period_id,
    cf.budget_id,
    cf.repartition_key_id,
    ( SELECT string_agg(DISTINCT rk2.name, ', ' ORDER BY rk2.name)
           FROM call_for_funds_lines cfl2
             JOIN repartition_keys rk2 ON rk2.id = cfl2.repartition_key_id
          WHERE cfl2.call_id = cf.id) AS repartition_key_name,
    cf.label,
    cf.trimester,
    cf.issue_date,
    cf.due_date,
    cf.total_amount,
    cf.status,
    cf.ledger_tx_id,
    cf.created_at,
    cf.issued_at,
    COALESCE(sum(cfl.amount_paid), 0::numeric) AS total_paid,
    cf.total_amount - COALESCE(sum(cfl.amount_paid), 0::numeric) AS total_unpaid,
    count(DISTINCT cfl.lot_id) AS lines_count,
    count(DISTINCT cfl.lot_id) - count(DISTINCT cfl.lot_id) FILTER (WHERE cfl.status <> 'paid'::call_line_status) AS lines_paid_count,
    count(DISTINCT cfl.lot_id) FILTER (WHERE cfl.status <> 'paid'::call_line_status) AS lines_unpaid_count
   FROM call_for_funds cf
     LEFT JOIN call_for_funds_lines cfl ON cfl.call_id = cf.id
  GROUP BY cf.id;
