-- Revue de code #3 [moyen, défensif] : create_ledger_transaction
--
-- Problème : avec p_auto_post = true, si les écritures sont déséquilibrées
--   (somme des débits ≠ somme des crédits au-delà de 0,01 €), la condition
--   d'auto-post était simplement sautée et la fonction renvoyait quand même
--   success:true avec status='draft'. Les 6 RPC appelantes ne testent que
--   'success' -> elles croyaient l'écriture passée alors qu'elle restait en
--   brouillon (invisible du grand livre posté = source de vérité légale).
--   Inoffensif aujourd'hui (paires débit/crédit équilibrées par construction)
--   mais filet de sécurité manquant.
--
-- Fix : si auto_post demandé ET déséquilibre, on lève une exception explicite.
--   Le bloc EXCEPTION WHEN OTHERS existant la transforme en success:false
--   (avec rollback des lignes draft déjà insérées). Donc avec auto_post=true,
--   "success:true" implique désormais TOUJOURS status='posted' : le contrat
--   sur lequel s'appuient les appelantes devient vrai.
--
-- Idempotent (CREATE OR REPLACE). Basé sur la définition en base au 2026-05-31.

CREATE OR REPLACE FUNCTION public.create_ledger_transaction(p_copro_id uuid, p_period_id uuid, p_tx_date date, p_label text, p_source_type text DEFAULT NULL::text, p_source_id uuid DEFAULT NULL::uuid, p_entries jsonb DEFAULT '[]'::jsonb, p_auto_post boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx_id UUID;
  v_entry JSONB;
  v_total_debit NUMERIC := 0;
  v_total_credit NUMERIC := 0;
BEGIN
  INSERT INTO ledger_transactions (
    copro_id, period_id, tx_date, label, source_type, source_id, created_by
  ) VALUES (
    p_copro_id, p_period_id, p_tx_date, p_label, p_source_type, p_source_id, auth.uid()
  )
  RETURNING id INTO v_tx_id;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO ledger_entries (
      tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label
    ) VALUES (
      v_tx_id,
      p_copro_id,
      p_period_id,
      (v_entry->>'account_id')::UUID,
      (v_entry->>'lot_id')::UUID,
      v_entry->>'direction',
      (v_entry->>'amount')::NUMERIC,
      v_entry->>'entry_label'
    );

    IF v_entry->>'direction' = 'debit' THEN
      v_total_debit := v_total_debit + (v_entry->>'amount')::NUMERIC;
    ELSE
      v_total_credit := v_total_credit + (v_entry->>'amount')::NUMERIC;
    END IF;
  END LOOP;

  IF p_auto_post THEN
    -- Garde-fou : on refuse de "réussir" sur une écriture déséquilibrée.
    IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
      RAISE EXCEPTION 'create_ledger_transaction: écriture déséquilibrée (débit=% crédit=% écart=%) — auto-post refusé',
        v_total_debit, v_total_credit, (v_total_debit - v_total_credit);
    END IF;
    RETURN post_ledger_transaction(v_tx_id);
  END IF;

  -- Sans auto-post : création en brouillon assumée.
  RETURN jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'status', 'draft'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;
