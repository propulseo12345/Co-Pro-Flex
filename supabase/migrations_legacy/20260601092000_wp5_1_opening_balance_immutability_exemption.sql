-- ============================================================================
-- WP5.1 — Exemption d'immutabilité ciblée pour la reprise 'opening_balance'
-- ============================================================================
-- Lève l'immutabilité UNIQUEMENT pour un tx source_type='opening_balance' dont
-- la période source (source_id) n'est PAS 'approved'. Gel automatique dès que N
-- passe 'approved'. Le retour posted->draft reste interdit (non requis par la
-- régénération DELETE-then-recreate). Idempotent (CREATE OR REPLACE).
--
-- IMPORTANT : on conserve SET search_path TO 'public' (hardening Supabase posé
-- par 20260531250000_wp_code_review_search_path.sql) sur les 4 fonctions.
--
-- Sources de données du prédicat selon le trigger :
--   tx UPDATE/DELETE      -> OLD.source_type / OLD.source_id
--   entry UPDATE/DELETE   -> tx parent via OLD.tx_id
--   entry INSERT          -> tx parent via NEW.tx_id
-- ============================================================================

-- A) UPDATE sur transaction postée
CREATE OR REPLACE FUNCTION public.trg_ledger_tx_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'posted'
     AND NOT (
       OLD.source_type = 'opening_balance'
       AND EXISTS (SELECT 1 FROM accounting_periods ap
                   WHERE ap.id = OLD.source_id AND ap.status <> 'approved')
     ) THEN
    RAISE EXCEPTION 'Cannot modify posted transaction (id=%)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- Retour posted -> draft : TOUJOURS interdit (même pour la reprise).
  IF NEW.status = 'draft' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Cannot revert posted transaction to draft (id=%)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- B) DELETE sur transaction postée
CREATE OR REPLACE FUNCTION public.trg_ledger_tx_no_delete_posted()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'posted'
     AND NOT (
       OLD.source_type = 'opening_balance'
       AND EXISTS (SELECT 1 FROM accounting_periods ap
                   WHERE ap.id = OLD.source_id AND ap.status <> 'approved')
     ) THEN
    RAISE EXCEPTION 'Cannot delete posted transaction (id=%)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN OLD;
END;
$$;

-- C) UPDATE / DELETE sur une entry dont le tx parent est posté
CREATE OR REPLACE FUNCTION public.trg_ledger_entry_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_tx_status      TEXT;
  v_tx_source_type TEXT;
  v_tx_source_id   UUID;
BEGIN
  SELECT status, source_type, source_id
    INTO v_tx_status, v_tx_source_type, v_tx_source_id
  FROM ledger_transactions
  WHERE id = OLD.tx_id;

  IF v_tx_status = 'posted'
     AND NOT (
       v_tx_source_type = 'opening_balance'
       AND EXISTS (SELECT 1 FROM accounting_periods ap
                   WHERE ap.id = v_tx_source_id AND ap.status <> 'approved')
     ) THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Cannot modify entry on posted transaction (entry_id=%, tx_id=%)', OLD.id, OLD.tx_id
        USING ERRCODE = 'restrict_violation';
    ELSIF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete entry from posted transaction (entry_id=%, tx_id=%)', OLD.id, OLD.tx_id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- D) INSERT d'une entry sur un tx posté (source = NEW.tx_id)
CREATE OR REPLACE FUNCTION public.trg_ledger_entry_no_insert_posted()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_tx_status      TEXT;
  v_tx_source_type TEXT;
  v_tx_source_id   UUID;
BEGIN
  SELECT status, source_type, source_id
    INTO v_tx_status, v_tx_source_type, v_tx_source_id
  FROM ledger_transactions
  WHERE id = NEW.tx_id;

  IF v_tx_status = 'posted'
     AND NOT (
       v_tx_source_type = 'opening_balance'
       AND EXISTS (SELECT 1 FROM accounting_periods ap
                   WHERE ap.id = v_tx_source_id AND ap.status <> 'approved')
     ) THEN
    RAISE EXCEPTION 'Cannot add entry to posted transaction (tx_id=%)', NEW.tx_id
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN NEW;
END;
$$;
