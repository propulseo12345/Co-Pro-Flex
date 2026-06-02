-- =====================================================================
-- V1 — Durcissements issus de la code-review (sûreté go-live RLS)
-- 1) v_finance_integrity_issues : security_invoker=true → la vue respectera
--    la RLS de l'APPELANT une fois la RLS activée (sinon fuite inter-tenant :
--    elle agrège toutes les copros sans filtre par appelant).
--    Sûr maintenant : 'authenticated' a déjà SELECT sur toutes les tables lues.
-- 2) provision_copro_chart : retirer EXECUTE à PUBLIC/anon (SECURITY DEFINER
--    écrivant 82 comptes) ; garder 'authenticated' (futur appel onboarding) + service_role.
-- NB : ne réécrit pas les migrations déjà appliquées ; ce delta aligne le live
--      et un futur replay sur le même état final.
-- =====================================================================

ALTER VIEW public.v_finance_integrity_issues SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.provision_copro_chart(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_copro_chart(uuid) TO authenticated, service_role;
