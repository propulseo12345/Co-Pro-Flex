-- ============================================================================
-- WP1.7 — Garde-fou : toute écriture sur un compte 45x exige un lot_id
-- ============================================================================
-- La créance/dette d'un copropriétaire (450x/459x) est toujours rattachée à un
-- lot. Les comptes de produit (70x), banque (5xx), charges (6xx) ne sont pas
-- concernés.
-- (Rapatriée : appliquée en direct le 2026-05-31, reconstruite à l'identique.)
CREATE OR REPLACE FUNCTION public.enforce_lot_id_on_45x()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
BEGIN
  SELECT code INTO v_code FROM accounts WHERE id = NEW.account_id;

  IF v_code LIKE '450%' OR v_code LIKE '459%' THEN
    IF NEW.lot_id IS NULL THEN
      RAISE EXCEPTION 'Écriture sur compte % (copropriétaire individualisé) sans lot_id : interdit. La créance/dette d''un copropriétaire est toujours rattachée à un lot.', v_code;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_lot_id_on_45x ON public.ledger_entries;
CREATE TRIGGER trg_enforce_lot_id_on_45x
  BEFORE INSERT OR UPDATE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION enforce_lot_id_on_45x();
