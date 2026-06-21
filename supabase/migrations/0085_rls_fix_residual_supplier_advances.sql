-- 0085_rls_fix_residual_supplier_advances.sql — Correctif sécurité (audit fondations 2026-06-21)
-- ============================================================================================
-- CONTEXTE : deux tables financières créées APRÈS le gros chantier RLS (0034) ont été oubliées —
--   RLS jamais activée, aucune policy, et grants par défaut laissant `anon` (clé publique du
--   frontend) LIRE *et* INSERT/UPDATE/DELETE/TRUNCATE cross-cabinet :
--     - public.opening_balance_residual_items (0077) : détail art.10 de la reprise de mandat (471/472),
--       données nominatives (lot_id, montants).
--     - public.supplier_advances (0078) : acomptes fournisseurs (montants, solde).
--   Faille exploitable ANONYMEMENT depuis internet (Security Advisor : 2× rls_disabled_in_public).
--
-- CORRECTIF : on aligne ces 2 tables sur le patron du projet (modèle 0053_conseil_rapports) :
--   RLS ON + policy `p_mgr_all` (back-office gestionnaire via user_is_copro_manager(copro_id)).
--   Les RPC d'accès (set/get_opening_balance_residual_detail, post/settle_supplier_advance) sont
--   SECURITY DEFINER -> non affectées (elles contournent la RLS de l'appelant ; on ne met PAS `force`).
--   Données de GESTION -> policy gestionnaire seule (pas de volet copropriétaire : ces détails de
--   reprise/acomptes ne sont pas consultés côté copro). On AJOUTE le revoke anon (défense en
--   profondeur) et le revoke TRUNCATE/REFERENCES/TRIGGER de authenticated (TRUNCATE n'est PAS
--   filtré par la RLS — privilège table-level qui viderait toute la table malgré les policies).

-- 1. Activer la serrure (RLS) sur les 2 tables.
alter table public.opening_balance_residual_items enable row level security;
alter table public.supplier_advances             enable row level security;

-- 2. Policy gestionnaire (patron 0053) : un manager n'accède qu'aux lignes de SES copros.
--    `to authenticated` uniquement -> anon n'a AUCUNE policy applicable = tout refusé.
create policy p_mgr_all on public.opening_balance_residual_items
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

create policy p_mgr_all on public.supplier_advances
  as permissive for all to authenticated
  using (public.user_is_copro_manager(copro_id))
  with check (public.user_is_copro_manager(copro_id));

-- 3. Défense en profondeur : anon ne doit avoir AUCUN accès direct à ces tables.
revoke all on public.opening_balance_residual_items from anon;
revoke all on public.supplier_advances             from anon;

-- 4. TRUNCATE/REFERENCES/TRIGGER ne sont pas couverts par la RLS -> les retirer à authenticated
--    (l'accès légitime reste SELECT/INSERT/UPDATE/DELETE, filtré par la policy).
revoke truncate, references, trigger on public.opening_balance_residual_items from authenticated;
revoke truncate, references, trigger on public.supplier_advances             from authenticated;

-- FIN 0085_rls_fix_residual_supplier_advances.sql
