-- V1.6 — Relecture de la reprise d'onboarding pour pré-remplir l'écran (ré-édition).
-- Source de vérité unique = le grand livre (transaction source_type='opening_onboarding').
-- On remappe chaque ligne en {account_code, lot_id, amount signé, nature}, on EXCLUT les
-- comptes d'attente 471/472 (résidu calculé), et on renvoie residual + as_of_date.

CREATE OR REPLACE FUNCTION public.get_opening_balance(
  p_copro_id uuid,
  p_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id    uuid;
  v_as_of    date;
  v_lines    jsonb;
  v_residual numeric := 0;
BEGIN
  SELECT id, tx_date INTO v_tx_id, v_as_of
  FROM ledger_transactions
  WHERE copro_id = p_copro_id
    AND period_id = p_period_id
    AND source_type = 'opening_onboarding'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_tx_id IS NULL THEN
    RETURN jsonb_build_object('lines', '[]'::jsonb, 'residual', 0, 'as_of_date', NULL);
  END IF;

  -- Lignes de saisie = tout sauf 471/472 ; amount signé (debit +, credit -).
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'account_code', a.code,
           'lot_id', e.lot_id,
           'amount', CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END,
           'nature', CASE a.code
                       WHEN '450-1' THEN 'current' WHEN '450-2' THEN 'works'
                       WHEN '450-3' THEN 'advance' WHEN '450-4' THEN 'loan'
                       WHEN '450-5' THEN 'alur' ELSE NULL END
         ) ORDER BY a.code, e.lot_id), '[]'::jsonb)
    INTO v_lines
  FROM ledger_entries e
  JOIN accounts a ON a.id = e.account_id
  WHERE e.tx_id = v_tx_id
    AND a.code NOT IN ('471','472');

  -- Résidu = net 471/472 de la même transaction (debit +, credit -).
  SELECT coalesce(sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0)
    INTO v_residual
  FROM ledger_entries e
  JOIN accounts a ON a.id = e.account_id
  WHERE e.tx_id = v_tx_id AND a.code IN ('471','472');

  RETURN jsonb_build_object('lines', v_lines, 'residual', v_residual, 'as_of_date', v_as_of);
END;
$function$;

COMMENT ON FUNCTION public.get_opening_balance(uuid, uuid) IS
  'Relit la reprise d''onboarding courante (grand livre) et la remappe en lignes de formulaire signées + residual + as_of_date. Exclut 471/472 (résidu calculé).';
