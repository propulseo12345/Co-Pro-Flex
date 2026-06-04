-- ============================================================================
-- WP1.1 — Helper resolve_lot_tiers_account(copro_id, nature) -> sous-compte 450-x
-- ============================================================================
-- (Rapatriée : appliquée en direct le 2026-05-31, reconstruite à l'identique
--  depuis l'état déployé pour garder dépôt et base synchronisés.)
CREATE OR REPLACE FUNCTION public.resolve_lot_tiers_account(p_copro_id uuid, p_nature text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_account_id uuid;
BEGIN
  v_code := CASE lower(p_nature)
    WHEN 'current' THEN '450-1'   -- budget prévisionnel courant
    WHEN 'works'   THEN '450-2'   -- travaux art. 14-2
    WHEN 'advance' THEN '450-3'   -- avances
    WHEN 'loan'    THEN '450-4'   -- emprunts
    WHEN 'alur'    THEN '450-5'   -- fonds de travaux ALUR
    ELSE NULL
  END;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'resolve_lot_tiers_account: nature inconnue "%" (attendu: current|works|advance|loan|alur)', p_nature;
  END IF;

  SELECT id INTO v_account_id
  FROM accounts
  WHERE copro_id = p_copro_id AND code = v_code;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'resolve_lot_tiers_account: sous-compte % introuvable pour la copro % (à provisionner avant tout appel/paiement)', v_code, p_copro_id;
  END IF;

  RETURN v_account_id;
END;
$function$;
