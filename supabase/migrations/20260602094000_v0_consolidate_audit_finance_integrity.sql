-- ============================================================
-- V0 (consolidation) — audit_finance_integrity = wrapper lecture seule
-- ============================================================
-- Dette repérée : la fonction audit_finance_integrity ré-implémentait les
-- MÊMES 4 contrôles que la vue v_finance_integrity_issues (duplication), avec
-- en plus un auto-fix (UPDATE total_amount des brouillons) = mutation silencieuse
-- contraire à la philosophie « détection d'abord » du plan de correction.
-- Aucun code applicatif ne l'appelle (seuls : sa définition de migration, un
-- test SQL d'existence, et les types générés).
--
-- Consolidation : la fonction devient un WRAPPER LECTURE SEULE de la vue
-- (source unique de vérité). Elle gagne automatiquement les 2 filets V0
-- (CALL_VS_BUDGET_MISMATCH, LOT_GL_MISMATCH). L'auto-fix est retiré.

DROP FUNCTION IF EXISTS public.audit_finance_integrity(uuid, boolean);

CREATE OR REPLACE FUNCTION public.audit_finance_integrity(p_copro_id uuid DEFAULT NULL)
 RETURNS TABLE(
   entity_type text,
   entity_id uuid,
   copro_id uuid,
   issue_type text,
   expected_amount numeric,
   actual_amount numeric,
   difference numeric
 )
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT i.entity_type, i.entity_id, i.copro_id, i.issue_type,
         i.expected_amount, i.actual_amount, i.difference
  FROM public.v_finance_integrity_issues i
  WHERE p_copro_id IS NULL OR i.copro_id = p_copro_id;
$function$;

COMMENT ON FUNCTION public.audit_finance_integrity(uuid) IS
  'Audit integrite financiere : wrapper lecture seule de v_finance_integrity_issues (source unique). Auto-fix retire (detection d''abord). Filtre optionnel par copro_id.';
