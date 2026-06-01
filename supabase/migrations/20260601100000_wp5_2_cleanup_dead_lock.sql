-- ============================================================================
-- WP5.2 — Nettoyage du verrou mort + réconciliation de la dérive base <-> git
-- ============================================================================
-- Décision validée (2026-06-01) : on ABANDONNE le mécanisme ledger_locks /
-- lock_period / statut 'locked'. Constats vérifiés en base :
--   * Le gel des opérations courantes après clôture est DÉJÀ assuré par la garde
--     `status != 'open'` de post_ledger_transaction (closed/locked/approved sont
--     toutes bloquées). Le contrôle ledger_locks est du code mort : la table n'a
--     jamais été alimentée (0 ligne, aucun INSERT nulle part).
--   * lock_period existait EN PROD mais dans AUCUNE migration (dérive base<->git).
--     Quasi-redondante avec close_period au regard de la garde de posting.
--
-- Actions :
--   1) post_ledger_transaction : retirer le contrôle ledger_locks (étape 4).
--      Corps repris verbatim de la définition live, seule l'étape 4 est supprimée.
--   2) DROP TABLE ledger_locks (vide ; aucune FK entrante, aucune vue, aucun autre
--      appelant ; seuls les types TS générés la référencent -> à régénérer).
--   3) DROP FUNCTION lock_period (orpheline) -> réconcilie git<->base.
--
-- Le label 'locked' de l'enum de statut des périodes reste (inerte) : retirer une
-- valeur d'enum Postgres est coûteux et sans intérêt ici.
-- ============================================================================

-- 1) post_ledger_transaction sans le contrôle ledger_locks --------------------
CREATE OR REPLACE FUNCTION public.post_ledger_transaction(p_tx_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx RECORD;
  v_period RECORD;
  v_total_debit NUMERIC(15,2);
  v_total_credit NUMERIC(15,2);
  v_entry_count INT;
BEGIN
  -- 1. Vérifier que la transaction existe
  SELECT * INTO v_tx
  FROM ledger_transactions
  WHERE id = p_tx_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found',
      'tx_id', p_tx_id
    );
  END IF;

  -- 2. Vérifier que la transaction est en draft
  IF v_tx.status = 'posted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction already posted',
      'tx_id', p_tx_id,
      'posted_at', v_tx.posted_at
    );
  END IF;

  -- 3. Vérifier que la période comptable est ouverte
  --    (= gel effectif des périodes closed/locked/approved)
  SELECT * INTO v_period
  FROM accounting_periods
  WHERE id = v_tx.period_id;

  IF v_period.status != 'open' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Period is not open (status=%s)', v_period.status),
      'tx_id', p_tx_id,
      'period_id', v_tx.period_id,
      'period_status', v_period.status
    );
  END IF;

  -- 4. Calculer les totaux et vérifier l'équilibre
  SELECT
    COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_debit, v_total_credit, v_entry_count
  FROM ledger_entries
  WHERE tx_id = p_tx_id;

  IF v_entry_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction has no entries',
      'tx_id', p_tx_id
    );
  END IF;

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction is not balanced',
      'tx_id', p_tx_id,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit,
      'difference', v_total_debit - v_total_credit
    );
  END IF;

  -- 5. Passer la transaction en posted
  UPDATE ledger_transactions
  SET
    status = 'posted',
    posted_at = NOW(),
    posted_by = auth.uid()
  WHERE id = p_tx_id;

  -- 6. Retourner le succès
  RETURN jsonb_build_object(
    'success', true,
    'tx_id', p_tx_id,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'entry_count', v_entry_count,
    'posted_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'tx_id', p_tx_id
    );
END;
$function$;

-- 2) Supprimer la table morte (vide, aucune dépendance) -----------------------
DROP TABLE IF EXISTS public.ledger_locks;

-- 3) Supprimer la fonction orpheline (réconcilie git <-> base) -----------------
DROP FUNCTION IF EXISTS public.lock_period(uuid);
