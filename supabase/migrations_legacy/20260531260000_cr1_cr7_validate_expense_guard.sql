-- Revue de code #1 + #7 : fiabilisation de validate_budget_expense
--
-- #1 [moyen-haut] : on bloque la validation d'une dépense quand la période
--   comptable n'est pas 'open'. Avant, la dépense passait quand même à
--   'validated' (donc comptée dans le "consommé") sans aucune écriture au
--   grand livre (le "réalisé") -> divergence silencieuse consommé≠réalisé.
--   Une dépense sur exercice fermé doit passer par le cut-off de clôture
--   (408/486, WP5), pas par un statut "validé" fantôme.
--
-- #7 [mineur] : la validation efface un éventuel motif de rejet, sinon une
--   dépense rejetée puis re-validée garde son ancien commentaire de rejet.
--
-- Idempotent (CREATE OR REPLACE). Basé sur la définition en base au 2026-05-31.

CREATE OR REPLACE FUNCTION public.validate_budget_expense(p_expense_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exp RECORD;
  v_acct_charge uuid;
  v_acct_401 uuid;
  v_period RECORD;
  v_ltx jsonb;
  v_tx_id uuid := NULL;
BEGIN
  SELECT * INTO v_exp FROM budget_expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Dépense introuvable');
  END IF;

  -- Charger la période AVANT toute mutation (garde-fou #1).
  SELECT ap.* INTO v_period
  FROM budgets b JOIN accounting_periods ap ON ap.id = b.period_id
  WHERE b.id = v_exp.budget_id;

  IF v_period.status IS DISTINCT FROM 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Période comptable non ouverte (' || COALESCE(v_period.status, 'inconnue')
               || ') : impossible de valider/comptabiliser la dépense. '
               || 'Régularisez via le cut-off de clôture (charges à payer).'
    );
  END IF;

  -- #7 : la validation efface un éventuel motif de rejet précédent.
  UPDATE budget_expenses SET status = 'validated', validated_at = now(), rejection_comment = NULL
  WHERE id = p_expense_id AND status <> 'validated';

  IF v_exp.ledger_tx_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'ledger_tx_id', v_exp.ledger_tx_id, 'note', 'déjà comptabilisée');
  END IF;

  SELECT bl.account_id INTO v_acct_charge FROM budget_lines bl WHERE bl.id = v_exp.budget_line_id;

  -- Période garantie 'open' par le garde-fou ci-dessus.
  IF v_acct_charge IS NOT NULL AND COALESCE(v_exp.amount, 0) > 0 THEN
    SELECT id INTO v_acct_401 FROM accounts WHERE copro_id = v_exp.copro_id AND code = '401';
    IF v_acct_401 IS NULL THEN
      RAISE EXCEPTION 'validate_budget_expense: compte 401 introuvable pour la copro %', v_exp.copro_id;
    END IF;

    v_ltx := create_ledger_transaction(
      v_exp.copro_id, v_period.id, v_exp.tx_date,
      'Dépense : ' || v_exp.label, 'budget_expense', v_exp.id,
      jsonb_build_array(
        jsonb_build_object('account_id', v_acct_charge, 'direction', 'debit',  'amount', v_exp.amount, 'entry_label', v_exp.label),
        jsonb_build_object('account_id', v_acct_401,    'direction', 'credit', 'amount', v_exp.amount, 'entry_label', 'Dette fournisseur : ' || COALESCE(v_exp.fournisseur, v_exp.label))
      ),
      true
    );
    IF NOT (v_ltx->>'success')::boolean THEN
      RAISE EXCEPTION 'validate_budget_expense: échec écriture grand livre : %', v_ltx->>'error';
    END IF;
    v_tx_id := (v_ltx->>'tx_id')::uuid;
    UPDATE budget_expenses SET ledger_tx_id = v_tx_id WHERE id = p_expense_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ledger_tx_id', v_tx_id,
    'posted', v_tx_id IS NOT NULL,
    'period_status', v_period.status
  );
END;
$function$;
