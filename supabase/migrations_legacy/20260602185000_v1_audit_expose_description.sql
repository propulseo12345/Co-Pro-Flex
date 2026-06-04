-- ============================================================
-- V1 (B0) — audit_finance_integrity expose la colonne `description`
-- ============================================================
-- Problème : le wrapper audit_finance_integrity(p_copro_id uuid) ne projetait
-- PAS la colonne `description`, alors que la vue source v_finance_integrity_issues
-- la porte. Le front (auditOnboardingBooks / Step8Finalisation) lit issue.description
-- pour afficher un message lisible quand la finalisation est bloquée → champ vide.
--
-- Correctif : on recrée la fonction à l'identique en AJOUTANT `description text`
-- à RETURNS TABLE (juste après issue_type) et `i.description` à la projection.
-- Tout le reste est conservé : param p_copro_id uuid DEFAULT NULL, filtre,
-- LANGUAGE sql / STABLE / SECURITY DEFINER / search_path 'public'.
--
-- Pourquoi un DROP avant CREATE : changer la liste RETURNS TABLE modifie le type
-- de retour ; PostgreSQL refuse un CREATE OR REPLACE dans ce cas. Il faut donc
-- DROP puis CREATE.
--
-- Compatibilité appelants (ajout d'une colonne = additif) :
--   - Front (src/lib/onboarding/api.ts) : lit par nom de champ → OK.
--   - Test SQL (supabase/tests/20260602_v0_filets_tests.sql) : fait
--     SELECT count(*) ... FROM audit_finance_integrity(...) WHERE issue_type IN (...)
--     → référence par nom, pas positionnelle → OK.
--   - Aucun appelant ne fait un SELECT positionnel (col1, col2, ...) sur cette
--     fonction, donc l'insertion de `description` ne décale rien de cassant.

DROP FUNCTION IF EXISTS public.audit_finance_integrity(uuid);

CREATE OR REPLACE FUNCTION public.audit_finance_integrity(p_copro_id uuid DEFAULT NULL)
 RETURNS TABLE(
   entity_type text,
   entity_id uuid,
   copro_id uuid,
   issue_type text,
   description text,
   expected_amount numeric,
   actual_amount numeric,
   difference numeric
 )
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT i.entity_type, i.entity_id, i.copro_id, i.issue_type, i.description,
         i.expected_amount, i.actual_amount, i.difference
  FROM public.v_finance_integrity_issues i
  WHERE p_copro_id IS NULL OR i.copro_id = p_copro_id;
$function$;

COMMENT ON FUNCTION public.audit_finance_integrity(uuid) IS
  'Audit integrite financiere : wrapper lecture seule de v_finance_integrity_issues (source unique). Expose description (B0). Auto-fix retire (detection d''abord). Filtre optionnel par copro_id.';
