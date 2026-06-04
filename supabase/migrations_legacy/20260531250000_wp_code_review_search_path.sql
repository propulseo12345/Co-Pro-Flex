-- wp_code_review_fixes : durcissement search_path (revue de code)
--
-- Fige search_path = 'public' sur deux fonctions SECURITY DEFINER qui ne
-- l'avaient pas encore, pour éviter toute résolution de schéma ambiguë
-- (recommandation de revue de code / hardening Supabase).
--
-- Idempotent : rejouable sans effet de bord.
-- NB : l'autre volet de cette revue (version durcie de seed_golden_loop)
-- est déjà porté par 20260531240000_seed_golden_loop.sql.

ALTER FUNCTION public.fn_dashboard_kpis(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.fn_annexe_2(uuid, uuid, uuid) SET search_path TO 'public';
