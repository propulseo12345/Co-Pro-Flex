-- 0086_assert_rls_completeness.sql — Garde-fou anti-récidive RLS (audit fondations 2026-06-21)
-- ============================================================================================
-- CONTEXTE : 2 tables (0077/0078) ont échappé au registre RLS et sont restées sans serrure
--   jusqu'à 0085. Pour qu'aucune FUTURE table de `public` ne subisse le même sort, on ajoute
--   une fonction d'assertion réutilisable qui lève une exception si une table publique n'a pas
--   la RLS activée.
--
-- IMPORTANT — où l'exécuter : UNIQUEMENT contre une base où la RLS est censée être ON (le CLOUD).
--   En DEV/local, `apply_rls_environment` désactive volontairement la RLS (décision F5 : « RLS on
--   = avant la prod, pas avant de tester en dev ») -> cette assertion échouerait par construction
--   en local. Elle est donc destinée à un check CLOUD (pré-déploiement / CI cloud), pas à `db:test`.
--
-- CHOIX DE CONCEPTION : on ne maintient PAS de liste des ~88 tables attendues (fragile, source
--   d'erreur). On vérifie la propriété directement : « toute table de public (hors liste blanche)
--   doit avoir relrowsecurity ». Liste blanche VIDE au 2026-06-21 (100% des tables ont la RLS) ;
--   toute exception future devra être ajoutée ICI, explicitement et justifiée.
--
-- REVUE CASCADE : migration purement ADDITIVE — crée une fonction en LECTURE SEULE sur le
--   catalogue système (pg_class/pg_namespace). Ne touche aucune table métier, aucune donnée,
--   aucune RPC/vue/trigger existant. Impact sur l'existant = nul. N'appelle PAS apply_rls_environment.

create or replace function public.assert_public_tables_have_rls()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_missing text[];
begin
  select array_agg(c.relname order by c.relname)
    into v_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')         -- tables ordinaires + partitionnées
    and not c.relrowsecurity
    and c.relname not like 'pg_%'
    -- LISTE BLANCHE (exceptions volontaires) : vide à ce jour.
    and c.relname <> all (array[]::text[]);

  if v_missing is not null then
    raise exception 'RLS-COMPLETENESS: % table(s) public sans RLS: %',
      array_length(v_missing, 1), v_missing
      using errcode = '42501',
            hint = 'Activer la RLS + policy sur ces tables, ou les ajouter explicitement (justifiées) à la liste blanche de assert_public_tables_have_rls().';
  end if;
end;
$$;

revoke execute on function public.assert_public_tables_have_rls() from public, anon, authenticated;
grant  execute on function public.assert_public_tables_have_rls() to service_role;

comment on function public.assert_public_tables_have_rls() is
  'Garde-fou anti-recidive RLS (audit 2026-06-21): raise si une table public n a pas la RLS. A executer contre le CLOUD (RLS ON), PAS le local dev (RLS off volontaire). Brancher en check cloud / pre-deploiement.';

-- FIN 0086_assert_rls_completeness.sql
