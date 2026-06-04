-- ============================================================================
-- WP3 — Clés de répartition & ventilation par sous-compte
-- ============================================================================
-- 3.1 catégorie (general|special|alur) ; 3.3 versioning valid_from/valid_to ;
-- 3.4 contrôle de complétude (bloquer un appel sur une clé all_lots incomplète) ;
-- 3.6 traçabilité sur les lignes d'appel (repartition_key_id + weight_snapshot).
-- 3.2 (routage budget_type->450-x) est déjà assuré par post_call_for_funds (WP1).
-- ============================================================================

-- ---- 3.1 Catégorie -----------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repartition_category') THEN
    CREATE TYPE repartition_category AS ENUM ('general', 'special', 'alur');
  END IF;
END $$;

ALTER TABLE public.repartition_keys
  ADD COLUMN IF NOT EXISTS category repartition_category;

UPDATE public.repartition_keys SET category = CASE
  WHEN name ILIKE '%alur%' OR name ILIKE '%fonds%trav%' THEN 'alur'::repartition_category
  WHEN name ILIKE '%général%' OR name ILIKE '%general%' THEN 'general'::repartition_category
  ELSE 'special'::repartition_category
END
WHERE category IS NULL;

-- ---- 3.3 Versioning (schéma prêt ; résolution temporelle fine = différée) -----
ALTER TABLE public.repartition_keys ADD COLUMN IF NOT EXISTS valid_from date;
ALTER TABLE public.repartition_keys ADD COLUMN IF NOT EXISTS valid_to   date;
UPDATE public.repartition_keys SET valid_from = created_at::date WHERE valid_from IS NULL;
ALTER TABLE public.repartition_keys ALTER COLUMN valid_from SET DEFAULT CURRENT_DATE;

-- ---- 3.6 Traçabilité sur les lignes d'appel ----------------------------------
ALTER TABLE public.call_for_funds_lines
  ADD COLUMN IF NOT EXISTS repartition_key_id uuid REFERENCES public.repartition_keys(id),
  ADD COLUMN IF NOT EXISTS weight_snapshot numeric;

-- ---- 3.4 Complétude d'une clé ------------------------------------------------
-- all_lots : chaque lot de la copro doit avoir une ligne de poids > 0.
-- subset   : intentionnellement partielle -> complète dès qu'au moins une ligne.
CREATE OR REPLACE FUNCTION public.repartition_key_is_complete(p_key_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key RECORD;
  v_missing integer;
BEGIN
  SELECT * INTO v_key FROM repartition_keys WHERE id = p_key_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_key.coverage_mode = 'subset' THEN
    RETURN EXISTS (SELECT 1 FROM repartition_key_lines WHERE key_id = p_key_id AND weight > 0);
  END IF;

  SELECT count(*) INTO v_missing
  FROM lots l
  WHERE l.copro_id = v_key.copro_id
    AND NOT EXISTS (
      SELECT 1 FROM repartition_key_lines rkl
      WHERE rkl.key_id = p_key_id AND rkl.lot_id = l.id AND rkl.weight > 0
    );

  RETURN v_missing = 0;
END;
$function$;

-- ---- post_call_for_funds : + contrôle de complétude + snapshot clé/poids -----
CREATE OR REPLACE FUNCTION public.post_call_for_funds(
  p_copro_id uuid, p_period_id uuid, p_budget_id uuid, p_repartition_key_id uuid,
  p_label text, p_trimester integer, p_issue_date date, p_due_date date,
  p_total_amount numeric, p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_nature text;
  v_debit_acct uuid;
  v_credit_code text;
  v_credit_acct uuid;
  v_total_weight numeric;
  v_actual_total numeric;
  v_call_id uuid;
  v_entries jsonb;
  v_ltx jsonb;
  v_tx_id uuid;
  v_nb integer;
BEGIN
  IF p_total_amount IS NULL OR p_total_amount <= 0 THEN
    RAISE EXCEPTION 'post_call_for_funds: total_amount doit être positif (reçu %)', p_total_amount;
  END IF;

  -- WP3.4 : refuser une clé all_lots incomplète
  IF NOT repartition_key_is_complete(p_repartition_key_id) THEN
    RAISE EXCEPTION 'post_call_for_funds: clé de répartition % incomplète (tous les lots ne sont pas couverts) — émission bloquée', p_repartition_key_id;
  END IF;

  IF p_budget_id IS NOT NULL THEN
    SELECT budget_type::text INTO v_nature FROM budgets WHERE id = p_budget_id;
  END IF;
  v_nature := COALESCE(v_nature, 'current');

  v_debit_acct := resolve_lot_tiers_account(p_copro_id, v_nature);

  v_credit_code := CASE v_nature
    WHEN 'current' THEN '701'
    WHEN 'works'   THEN '702'
    WHEN 'alur'    THEN '105'
    ELSE '701'
  END;
  SELECT id INTO v_credit_acct FROM accounts WHERE copro_id = p_copro_id AND code = v_credit_code;
  IF v_credit_acct IS NULL THEN
    RAISE EXCEPTION 'post_call_for_funds: compte de contrepartie % introuvable pour la copro %', v_credit_code, p_copro_id;
  END IF;

  SELECT sum(weight) INTO v_total_weight FROM repartition_key_lines WHERE key_id = p_repartition_key_id;
  IF v_total_weight IS NULL OR v_total_weight <= 0 THEN
    RAISE EXCEPTION 'post_call_for_funds: clé de répartition % vide ou sans poids', p_repartition_key_id;
  END IF;

  SELECT sum(round(p_total_amount * weight / v_total_weight, 2)) INTO v_actual_total
  FROM repartition_key_lines WHERE key_id = p_repartition_key_id;

  INSERT INTO call_for_funds (
    copro_id, period_id, budget_id, repartition_key_id, label, trimester,
    issue_date, due_date, total_amount, status, issued_at, description
  ) VALUES (
    p_copro_id, p_period_id, p_budget_id, p_repartition_key_id, p_label, p_trimester,
    p_issue_date, p_due_date, v_actual_total, 'issued', now(), p_description
  )
  RETURNING id INTO v_call_id;

  -- WP3.6 : snapshot clé + poids sur chaque ligne d'appel
  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due, repartition_key_id, weight_snapshot)
  SELECT p_copro_id, v_call_id, lot_id, round(p_total_amount * weight / v_total_weight, 2),
         p_repartition_key_id, weight
  FROM repartition_key_lines WHERE key_id = p_repartition_key_id;

  SELECT jsonb_agg(jsonb_build_object(
    'account_id', v_debit_acct, 'lot_id', lot_id, 'direction', 'debit',
    'amount', round(p_total_amount * weight / v_total_weight, 2), 'entry_label', 'Appel : ' || p_label
  )) INTO v_entries
  FROM repartition_key_lines WHERE key_id = p_repartition_key_id;

  v_entries := v_entries || jsonb_build_array(jsonb_build_object(
    'account_id', v_credit_acct, 'direction', 'credit', 'amount', v_actual_total, 'entry_label', 'Appel : ' || p_label
  ));

  v_ltx := create_ledger_transaction(
    p_copro_id, p_period_id, p_issue_date, 'Appel de fonds : ' || p_label, 'call_for_funds', v_call_id, v_entries, true
  );
  IF NOT (v_ltx->>'success')::boolean THEN
    RAISE EXCEPTION 'post_call_for_funds: échec écriture grand livre : %', v_ltx->>'error';
  END IF;
  v_tx_id := (v_ltx->>'tx_id')::uuid;
  UPDATE call_for_funds SET ledger_tx_id = v_tx_id WHERE id = v_call_id;

  SELECT count(*) INTO v_nb FROM call_for_funds_lines WHERE call_id = v_call_id;

  RETURN jsonb_build_object(
    'success', true, 'call_id', v_call_id, 'ledger_tx_id', v_tx_id,
    'total_amount', v_actual_total, 'nb_lines', v_nb, 'nature', v_nature
  );
END;
$function$;
