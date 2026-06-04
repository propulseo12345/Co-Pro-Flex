-- WP5.2 — Exemption d'immutabilité étendue au cut-off ('closing') + double test (source ET accueil)
-- Helper réutilisé par les 4 triggers d'immutabilité.
CREATE OR REPLACE FUNCTION public.is_ledger_regen_exempt(
  p_source_type text, p_source_id uuid, p_posting_period_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT p_source_type IN ('opening_balance','closing')
     AND p_source_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM accounting_periods ap
                 WHERE ap.id = p_source_id AND ap.status <> 'approved')
     AND EXISTS (SELECT 1 FROM accounting_periods ap
                 WHERE ap.id = p_posting_period_id AND ap.status <> 'approved');
$$;

CREATE OR REPLACE FUNCTION public.trg_ledger_tx_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'posted'
     AND NOT public.is_ledger_regen_exempt(OLD.source_type, OLD.source_id, OLD.period_id) THEN
    RAISE EXCEPTION 'Cannot modify posted transaction (id=%)', OLD.id USING ERRCODE='restrict_violation';
  END IF;
  IF NEW.status = 'draft' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Cannot revert posted transaction to draft (id=%)', OLD.id USING ERRCODE='restrict_violation';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_ledger_tx_no_delete_posted()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'posted'
     AND NOT public.is_ledger_regen_exempt(OLD.source_type, OLD.source_id, OLD.period_id) THEN
    RAISE EXCEPTION 'Cannot delete posted transaction (id=%)', OLD.id USING ERRCODE='restrict_violation';
  END IF;
  RETURN OLD;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_ledger_entry_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_tx_status text; v_tx_source_type text; v_tx_source_id uuid;
BEGIN
  SELECT status, source_type, source_id INTO v_tx_status, v_tx_source_type, v_tx_source_id
  FROM ledger_transactions WHERE id = OLD.tx_id;
  IF v_tx_status = 'posted'
     AND NOT public.is_ledger_regen_exempt(v_tx_source_type, v_tx_source_id, OLD.period_id) THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'Cannot modify entry on posted transaction (entry_id=%, tx_id=%)', OLD.id, OLD.tx_id USING ERRCODE='restrict_violation';
    ELSIF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete entry from posted transaction (entry_id=%, tx_id=%)', OLD.id, OLD.tx_id USING ERRCODE='restrict_violation';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_ledger_entry_no_insert_posted()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_tx_status text; v_tx_source_type text; v_tx_source_id uuid;
BEGIN
  SELECT status, source_type, source_id INTO v_tx_status, v_tx_source_type, v_tx_source_id
  FROM ledger_transactions WHERE id = NEW.tx_id;
  IF v_tx_status = 'posted'
     AND NOT public.is_ledger_regen_exempt(v_tx_source_type, v_tx_source_id, NEW.period_id) THEN
    RAISE EXCEPTION 'Cannot add entry to posted transaction (tx_id=%)', NEW.tx_id USING ERRCODE='restrict_violation';
  END IF;
  RETURN NEW;
END; $$;
