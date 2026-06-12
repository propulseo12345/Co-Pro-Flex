-- ============================================================================
-- 0048 — Bucket Storage `ged` + policies d'isolation (audit sécurité 2026-06-12)
-- ============================================================================
-- Le front uploade les documents (GED, PV d'AG, justificatifs) dans le bucket
-- `ged` avec un chemin `${copro_id}/${categorie}/${annee}/...` — mais AUCUNE
-- migration ne créait le bucket ni ses policies : en cloud neuf, soit la GED
-- est cassée (RLS storage ON sans policy), soit un opérateur « répare » en
-- rendant le bucket PUBLIC (tous les documents de toutes les copros exposés).
-- La policy legacy de référence (migrations_legacy, commentée) utilisait en
-- plus le MAUVAIS segment de chemin ([2], calibré pour un ancien préfixe) :
-- le copro_id est aujourd'hui le segment [1].
--
-- Bucket PRIVÉ + 3 policies alignées sur le modèle RLS 0034 :
--   lecture   = membre de la copro (user_has_copro_access)
--   écriture  = gestionnaire de la copro (user_is_copro_manager)
--   service_role bypasse par construction (webhooks/jobs).
--
-- Garde d'environnement : le harnais de rejeu (rebaseline-check, base jetable
-- hors stack Supabase) n'a PAS le schéma `storage` — la migration s'y déclare
-- inapplicable proprement au lieu d'échouer.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice '0048: schéma storage absent (rejeu hors stack Supabase) — bucket ged non créé ici.';
    return;
  end if;

  -- 1. Bucket privé (idempotent).
  insert into storage.buckets (id, name, public)
  values ('ged', 'ged', false)
  on conflict (id) do update set public = false;

  -- 2. Policies sur storage.objects (drop + create : rejouable).
  drop policy if exists ged_select_copro_member on storage.objects;
  drop policy if exists ged_insert_copro_manager on storage.objects;
  drop policy if exists ged_update_copro_manager on storage.objects;
  drop policy if exists ged_delete_copro_manager on storage.objects;

  -- Lecture : tout membre de la copro (copropriétaire inclus — base du portail).
  create policy ged_select_copro_member on storage.objects
    for select to authenticated
    using (
      bucket_id = 'ged'
      and public.user_has_copro_access(((string_to_array(name, '/'))[1])::uuid)
    );

  -- Écriture/remplacement/suppression : gestionnaire de la copro uniquement.
  create policy ged_insert_copro_manager on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'ged'
      and public.user_is_copro_manager(((string_to_array(name, '/'))[1])::uuid)
    );

  create policy ged_update_copro_manager on storage.objects
    for update to authenticated
    using (
      bucket_id = 'ged'
      and public.user_is_copro_manager(((string_to_array(name, '/'))[1])::uuid)
    )
    with check (
      bucket_id = 'ged'
      and public.user_is_copro_manager(((string_to_array(name, '/'))[1])::uuid)
    );

  create policy ged_delete_copro_manager on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'ged'
      and public.user_is_copro_manager(((string_to_array(name, '/'))[1])::uuid)
    );
end $$;
