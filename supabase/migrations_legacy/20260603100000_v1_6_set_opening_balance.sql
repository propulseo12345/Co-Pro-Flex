-- V1.6 — Moteur de reprise de soldes d'onboarding (balance d'entrée / reprise de mandat).
-- Idempotente PAR REMPLACEMENT, en UNE transaction équilibrée. Cf. spec §3.1.
--   I3  : pré-garde statut période 'open' (FOR UPDATE) AVANT tout DELETE, message métier.
--   I2  : annule-et-repasse (DELETE de la reprise opening_onboarding existante).
--   I4  : le reste (471/472) = complément EXACT de la somme signée -> 0 centime résiduel.
--   I14 : create_ledger_transaction avale le RAISE (success:false sans rollback)
--         -> on teste (v_res->>'success') et on RAISE si false, sinon le DELETE se
--            committerait sans remplacement (perte de données).
-- Dépend du Plan A : source_type 'opening_onboarding' autorisé + index + is_ledger_regen_exempt étendu.

CREATE OR REPLACE FUNCTION public.set_opening_balance(
  p_copro_id uuid,
  p_period_id uuid,
  p_as_of_date date,
  p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status    text;
  v_line      jsonb;
  v_code      text;
  v_nature    text;
  v_lot_id    uuid;
  v_amount    numeric;
  v_acc_id    uuid;
  v_entries   jsonb := '[]'::jsonb;
  v_signed    numeric := 0;   -- Σ des montants signés (débit +, crédit -)
  v_residual  numeric;
  v_acc471    uuid;
  v_acc472    uuid;
  v_lines_cnt int := 0;
  v_res       jsonb;
BEGIN
  -- 1) PRÉ-GARDE statut (FOR UPDATE) AVANT tout DELETE (I3)
  SELECT status::text INTO v_status
  FROM accounting_periods
  WHERE id = p_period_id AND copro_id = p_copro_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Période comptable introuvable pour cette copropriété.');
  END IF;
  IF v_status <> 'open' THEN
    RETURN jsonb_build_object('success', false,
      'error', format('Période non modifiable (statut=%s). Rouvrez la période avant de modifier la reprise.', v_status));
  END IF;

  -- Comptes d'attente (résolus une fois)
  SELECT id INTO v_acc471 FROM accounts WHERE copro_id = p_copro_id AND code = '471';
  SELECT id INTO v_acc472 FROM accounts WHERE copro_id = p_copro_id AND code = '472';
  IF v_acc471 IS NULL OR v_acc472 IS NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Comptes d''attente 471/472 absents (plan comptable non provisionné ?).');
  END IF;

  -- 2) ANNULE la reprise d'onboarding existante de la période (cascade ledger_entries) (I2)
  DELETE FROM ledger_transactions
  WHERE copro_id = p_copro_id
    AND period_id = p_period_id
    AND source_type = 'opening_onboarding';

  -- 3) CONSTRUIT les écritures depuis p_lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_code   := v_line->>'account_code';
    v_nature := lower(coalesce(v_line->>'nature', ''));
    v_lot_id := NULLIF(v_line->>'lot_id','')::uuid;
    v_amount := coalesce((v_line->>'amount')::numeric, 0);

    IF v_amount = 0 OR v_code IS NULL THEN
      CONTINUE;  -- on ignore les lignes vides
    END IF;

    -- Résolution du compte :
    --   * code '450' nu + nature -> sous-compte 450-x via le helper canonique
    --   * code '450-x' explicite -> nature dérivée du suffixe
    --   * BANQUE : 512%/502% résolus par account_id (asset), jamais le code nu
    --   * tout autre code (103, 105, 401, 110, 120, 6xx, 7xx, 461, 462, ...) -> par code exact
    IF v_code = '450' THEN
      IF v_nature NOT IN ('current','works','advance','loan','alur') THEN
        RAISE EXCEPTION 'set_opening_balance: ligne 450 sans nature valide (reçu "%")', v_line->>'nature';
      END IF;
      v_acc_id := resolve_lot_tiers_account(p_copro_id, v_nature);
    ELSIF v_code LIKE '450-%' THEN
      v_acc_id := resolve_lot_tiers_account(p_copro_id,
        CASE v_code WHEN '450-1' THEN 'current' WHEN '450-2' THEN 'works'
                    WHEN '450-3' THEN 'advance' WHEN '450-4' THEN 'loan'
                    WHEN '450-5' THEN 'alur' END);
    ELSE
      SELECT id INTO v_acc_id
      FROM accounts
      WHERE copro_id = p_copro_id AND code = v_code AND is_postable = true;
      IF v_acc_id IS NULL THEN
        RAISE EXCEPTION 'set_opening_balance: compte % introuvable ou non imputable pour la copro %', v_code, p_copro_id;
      END IF;
    END IF;

    -- Les comptes de classe 6/7 (résultat de l'exercice repris) sont GLOBAUX : on neutralise
    -- tout lot_id éventuel (la ventilation par clé reste l'affaire du budget). (I9)
    IF v_code LIKE '6%' OR v_code LIKE '7%' THEN
      v_lot_id := NULL;
    END IF;

    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account_id', v_acc_id,
      'lot_id',     v_lot_id,
      'direction',  CASE WHEN v_amount > 0 THEN 'debit' ELSE 'credit' END,
      'amount',     abs(v_amount),
      'entry_label','Reprise d''ouverture'
    ));
    v_signed    := v_signed + v_amount;
    v_lines_cnt := v_lines_cnt + 1;
  END LOOP;

  -- 4) RÉSIDU = complément EXACT -> équilibre garanti, 0 centime résiduel (I4)
  --    residual signé = -(Σ amount). residual > 0 => le grand livre a un excès de crédit
  --    qu'il faut compenser au DÉBIT du 471 ; residual < 0 => excès de débit -> CRÉDIT 472.
  v_residual := round(-v_signed, 2);
  IF abs(v_residual) >= 0.01 THEN
    IF v_residual > 0 THEN
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account_id', v_acc471, 'direction', 'debit', 'amount', v_residual,
        'entry_label', 'Reprise — reste à imputer (débiteur)'));
    ELSE
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account_id', v_acc472, 'direction', 'credit', 'amount', abs(v_residual),
        'entry_label', 'Reprise — reste à imputer (créditeur)'));
    END IF;
  END IF;

  IF jsonb_array_length(v_entries) = 0 THEN
    -- aucune ligne non nulle : on a juste effacé l'ancienne reprise (remise à zéro assumée)
    RETURN jsonb_build_object('success', true, 'residual', 0, 'lines_count', 0, 'as_of_date', p_as_of_date);
  END IF;

  -- 5) POSTE une SEULE écriture équilibrée via la route canonique
  v_res := create_ledger_transaction(
    p_copro_id, p_period_id, p_as_of_date, 'Reprise des soldes d''ouverture',
    'opening_onboarding', p_period_id, v_entries, true
  );

  -- 6) VÉRIFIE le retour (I14) : sinon le DELETE de l'étape 2 se committe sans remplacement
  IF NOT coalesce((v_res->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'set_opening_balance: échec écriture grand livre : %', coalesce(v_res->>'error','inconnu');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'residual', v_residual,
    'lines_count', v_lines_cnt,
    'as_of_date', p_as_of_date
  );

EXCEPTION
  WHEN OTHERS THEN
    -- L'exception rollback le DELETE (atomicité) -> pas de perte de données.
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

COMMENT ON FUNCTION public.set_opening_balance(uuid, uuid, date, jsonb) IS
  'Moteur de reprise de soldes d''onboarding : remplace intégralement la reprise (source_type=opening_onboarding) de la période, en UNE écriture équilibrée. Le reste va sur 471/472. Non bloquant.';
