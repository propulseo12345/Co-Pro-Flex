-- ============================================================================
-- 0064 — Mutations : colonne buyer_draft + RPC find-or-create notaire (T7)
-- ============================================================================
-- BUG corrigé (front « Nouvelle mutation » plantait) :
--   createMutation / updateMutation (src/lib/sales/api.ts + le jumeau
--   src/features/ventes/api/mutationsApi.ts) INSÉRAIENT / PATCHAIENT des colonnes
--   ABSENTES de la table mutations (0019) : buyer_name, buyer_email,
--   buyer_is_company, notary_name, notary_email, notary_reference.
--   → erreur Postgres « column ... does not exist » à chaque création.
--
-- Modèle réel mutations (0019) : pas de colonnes acquéreur/notaire « libres ».
--   buyer_owner_id -> coproprietaires (NULL jusqu'à validate_mutation),
--   notaire_id     -> tiers(is_notary).
--
-- Réparation MINIMALE (le workflow vente complet = J9) :
--   (a) buyer_draft jsonb (nullable, additif) : tiroir fourre-tout pour les infos
--       acquéreur saisies AVANT que l'acquéreur ne devienne copropriétaire
--       (il n'est PAS encore dans coproprietaires → surtout pas de FK vers une
--       valeur inexistante). Zéro impact sur l'existant (nullable, sans défaut
--       contraignant). v_mutations_overview (0054) dérive déjà buyer_name/
--       notary_name de coproprietaires/tiers : la nouvelle colonne ne casse
--       AUCUNE vue.
--   (b) RPC upsert_mutation_notary : le notaire saisi librement est matérialisé
--       comme un tiers (is_notary = true) RÉUTILISÉ s'il existe déjà (même nom
--       dans la copro — uq_tiers_name unique(copro_id, name)), sinon créé.
--       Find-or-create ATOMIQUE côté serveur : évite la course sur la contrainte
--       d'unicité que ferait un select-puis-insert côté client, et reste aligné
--       sur le pattern d'écriture tiers (createProvider : INSERT direct sous
--       policy p_mgr_all). Garde : is_service_call() OR user_is_copro_manager.
--
-- RLS : la table mutations garde ses policies existantes (0026/0034) ; l'ajout
--   d'une colonne ne les modifie pas. La RPC est SECURITY DEFINER + garde
--   explicite + search_path figé (anti-injection).

-- ----------------------------------------------------------------------------
-- 1. mutations.buyer_draft — infos acquéreur saisies (pré-validation)
-- ----------------------------------------------------------------------------
alter table public.mutations
  add column if not exists buyer_draft jsonb;

comment on column public.mutations.buyer_draft is
  'Infos acquéreur saisies AVANT validation (l''acquéreur n''est pas encore copropriétaire) : { name, email, is_company }. Remplacé par buyer_owner_id à la validation (validate_mutation, J9). Additif T7.';

-- ----------------------------------------------------------------------------
-- 2. upsert_mutation_notary — find-or-create d'un tiers notaire pour une copro
-- ----------------------------------------------------------------------------
-- Renvoie l'id du tiers notaire (existant réutilisé OU nouvellement créé).
-- Le nom est la clé fonctionnelle (uq_tiers_name unique(copro_id, name)).
-- Les coordonnées (email/office_name/notary_reference) sont mises à jour si
-- fournies (coalesce : on n'efface jamais une valeur existante avec un NULL).
create or replace function public.upsert_mutation_notary(
  p_copro_id         uuid,
  p_name             text,
  p_email            text default null,
  p_office_name      text default null,
  p_notary_reference text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_copro_id is null then
    raise exception 'upsert_mutation_notary: copro_id requis' using errcode = '22004';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'upsert_mutation_notary: nom du notaire requis' using errcode = '22004';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis pour la copro %', p_copro_id using errcode = '42501';
  end if;

  -- Réutilise un tiers existant du même nom dans la copro (idempotent).
  select t.id into v_id
  from public.tiers t
  where t.copro_id = p_copro_id and t.name = btrim(p_name)
  limit 1;

  if v_id is not null then
    update public.tiers
       set is_notary        = true,
           is_active        = true,
           email            = coalesce(p_email, email),
           office_name      = coalesce(p_office_name, office_name),
           notary_reference = coalesce(p_notary_reference, notary_reference)
     where id = v_id;
    return v_id;
  end if;

  insert into public.tiers (copro_id, name, is_notary, category, email, office_name, notary_reference)
  values (p_copro_id, btrim(p_name), true, 'externe', p_email, p_office_name, p_notary_reference)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.upsert_mutation_notary(uuid, text, text, text, text) from public, anon;
grant  execute on function public.upsert_mutation_notary(uuid, text, text, text, text) to authenticated, service_role;

comment on function public.upsert_mutation_notary(uuid, text, text, text, text) is
  'Find-or-create d''un tiers notaire (is_notary) pour une copro, clé = nom (uq_tiers_name). Réutilise/MAJ si existant. Garde : is_service_call() OR user_is_copro_manager. T7 (createMutation).';
