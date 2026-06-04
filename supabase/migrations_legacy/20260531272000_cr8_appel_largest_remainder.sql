-- Revue de code #8 [mineur] : Σ des appels = budget voté (au centime près)
--
-- Problème : la ventilation arrondissait chaque (lot × clé) indépendamment, et
--   chaque échéance prenait une fraction fixe 1/N. Résultat : la somme des
--   appels pouvait différer du budget voté de quelques centimes (ex. 10 000 / 3
--   = 3 333,33 ×3 = 9 999,99). L'écart existe même sur un appel annuel unique.
--
-- Fix : "arrondi cumulatif" (méthode du plus grand reste par télescopage) à
--   deux niveaux, qui garantit l'exactitude :
--   • entre échéances : montant_i = round(B·i/N) − round(B·(i−1)/N)
--       -> Σ_i = round(B) = B exactement (le dernier absorbe le reliquat).
--   • entre lots d'une clé : part_lot = round(T·cw/W) − round(T·(cw−w)/W)
--       (cw = poids cumulé) -> Σ_lots = T exactement.
--   Donc Σ(tous les appels, tous les lots) = budget voté, au centime près.
--
-- post_budget_call_for_funds gagne 2 paramètres optionnels (index/nombre
--   d'échéances). Sans eux -> ancien comportement par fraction (rétro-compatible ;
--   seul generate_calls_from_ag_payload l'appelle, et il les fournit désormais).
--
-- Basé sur les définitions en base au 2026-05-31. Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.post_budget_call_for_funds(
  p_copro_id uuid, p_period_id uuid, p_budget_id uuid, p_label text,
  p_trimester integer, p_issue_date date, p_due_date date,
  p_fraction numeric DEFAULT 1.0,
  p_installment_index integer DEFAULT NULL,
  p_installment_count integer DEFAULT NULL
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
  v_use_inst    boolean := (p_installment_index IS NOT NULL AND p_installment_count IS NOT NULL);
BEGIN
  IF v_use_inst THEN
    IF p_installment_count <= 0 OR p_installment_index < 1 OR p_installment_index > p_installment_count THEN
      RAISE EXCEPTION 'post_budget_call_for_funds: échéance %/% invalide', p_installment_index, p_installment_count;
    END IF;
  ELSIF p_fraction IS NULL OR p_fraction <= 0 THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: fraction doit être > 0 (reçu %)', p_fraction;
  END IF;
  IF p_budget_id IS NULL THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: budget_id requis';
  END IF;

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

  FOR v_key IN
    SELECT DISTINCT bl.repartition_key_id AS key_id
    FROM budget_lines bl
    WHERE bl.budget_id = p_budget_id AND bl.repartition_key_id IS NOT NULL
  LOOP
    IF NOT repartition_key_is_complete(v_key.key_id) THEN
      RAISE EXCEPTION 'post_budget_call_for_funds: clé de répartition % incomplète — émission bloquée', v_key.key_id;
    END IF;
  END LOOP;

  -- Total à appeler = Σ des montants-cible par clé (Σ lots = cible exactement).
  WITH budget_by_key AS (
    SELECT bl.repartition_key_id AS key_id, sum(bl.amount) AS amount
    FROM budget_lines bl
    WHERE bl.budget_id = p_budget_id AND bl.repartition_key_id IS NOT NULL
    GROUP BY bl.repartition_key_id
  ),
  key_totals AS (
    SELECT key_id, sum(weight) AS total_weight FROM repartition_key_lines GROUP BY key_id
  )
  SELECT coalesce(sum(
    CASE WHEN v_use_inst
      THEN round(bbk.amount * p_installment_index::numeric / p_installment_count, 2)
         - round(bbk.amount * (p_installment_index - 1)::numeric / p_installment_count, 2)
      ELSE round(p_fraction * bbk.amount, 2)
    END
  ), 0)
  INTO v_total
  FROM budget_by_key bbk
  JOIN key_totals kt ON kt.key_id = bbk.key_id AND kt.total_weight > 0;

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'post_budget_call_for_funds: budget % sans montant à appeler (lignes/clés manquantes ?)', p_budget_id;
  END IF;

  INSERT INTO call_for_funds (
    copro_id, period_id, budget_id, repartition_key_id, label, trimester,
    issue_date, due_date, total_amount, status, issued_at
  ) VALUES (
    p_copro_id, p_period_id, p_budget_id, NULL, p_label, p_trimester,
    p_issue_date, p_due_date, v_total, 'issued', now()
  )
  RETURNING id INTO v_call_id;

  -- Lignes par (lot × clé) en arrondi cumulatif : Σ lots = cible par clé.
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
      SELECT key_id, sum(weight) AS total_weight FROM repartition_key_lines GROUP BY key_id
    ),
    target AS (
      SELECT bbk.key_id, bbk.amount,
        CASE WHEN v_use_inst
          THEN round(bbk.amount * p_installment_index::numeric / p_installment_count, 2)
             - round(bbk.amount * (p_installment_index - 1)::numeric / p_installment_count, 2)
          ELSE round(p_fraction * bbk.amount, 2)
        END AS target_amount
      FROM budget_by_key bbk
    ),
    lot_cw AS (
      SELECT rkl.key_id, rkl.lot_id, rkl.weight,
        sum(rkl.weight) OVER (PARTITION BY rkl.key_id ORDER BY rkl.lot_id ROWS UNBOUNDED PRECEDING) AS cw
      FROM repartition_key_lines rkl
    )
    SELECT lc.lot_id, t.key_id, lc.weight,
      round(t.target_amount * lc.cw / kt.total_weight, 2)
      - round(t.target_amount * (lc.cw - lc.weight) / kt.total_weight, 2) AS amount
    FROM target t
    JOIN key_totals kt ON kt.key_id = t.key_id AND kt.total_weight > 0
    JOIN lot_cw lc      ON lc.key_id = t.key_id
  ) x
  WHERE x.amount > 0;

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


-- generate_calls_from_ag_payload : transmet l'index/nombre d'échéances pour
-- l'arrondi cumulatif (sinon l'exactitude inter-échéances ne s'applique pas).
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
      v_label_prefix || v_i || ' ' || v_year, v_i, v_issue_date, v_due_date,
      (1.0 / v_nb_appels)::numeric, v_i, v_nb_appels
    );
    IF NOT (v_res->>'success')::boolean THEN
      RAISE EXCEPTION 'generate_calls_from_ag_payload: échec appel T% : %', v_i, v_res->>'error';
    END IF;
  END LOOP;
END;
$function$;
