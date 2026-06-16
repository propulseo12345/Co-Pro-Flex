-- 0083_create_copro.sql — RPC transactionnelle de création de copropriété (onboarding)
-- ============================================================================================
-- PROBLÈME : la RLS de copros (policy p_mgr_all, WITH CHECK user_is_copro_manager(id)) repose sur
--   une membership 'gestionnaire' liée à la copro — qui n'existe pas encore au moment de l'INSERT.
--   Amorçage par insertion directe donc IMPOSSIBLE (poule & œuf) → l'onboarding échouait avec
--   « new row violates row-level security policy for table "copros" ».
--
-- SOLUTION : RPC SECURITY DEFINER qui crée, EN UNE TRANSACTION et en contournant proprement la RLS :
--   1) la copropriété (cabinet = celui du gestionnaire connecté),
--   2) la membership 'gestionnaire' (l'appelant),
--   3) le plan comptable canonique (provision_copro_chart).
--   Authz interne : appelant authentifié + rattaché à un cabinet (profiles.cabinet_id). Atomique :
--   toute erreur annule l'ensemble (plus besoin du nettoyage best-effort côté front).
--
-- G-DEF : DEFINER + check auth.uid()/cabinet + revoke public/anon, grant authenticated/service_role.

create or replace function public.create_copro(
  p_name                 text,
  p_address              text default null,
  p_city                 text default null,
  p_postal_code          text default null,
  p_annee_construction   int  default null,
  p_siret                text default null,
  p_previous_syndic_name text default null,
  p_exercice_debut       int  default 1
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_cabinet uuid;
  v_copro   uuid;
  v_name    text := nullif(btrim(p_name), '');
begin
  if v_uid is null then
    raise exception 'create_copro: non authentifié' using errcode = '42501';
  end if;
  if v_name is null then
    raise exception 'create_copro: nom de copropriété requis' using errcode = '23514';
  end if;

  select cabinet_id into v_cabinet from public.profiles where id = v_uid;
  if v_cabinet is null then
    raise exception 'create_copro: compte non rattaché à un cabinet' using errcode = '23503';
  end if;

  insert into public.copros (
    cabinet_id, name, address, city, postal_code,
    annee_construction, siret, previous_syndic_name, exercice_debut,
    onboarding_step, onboarding_max_step
  ) values (
    v_cabinet, v_name,
    nullif(btrim(p_address), ''), nullif(btrim(p_city), ''), nullif(btrim(p_postal_code), ''),
    p_annee_construction, nullif(btrim(p_siret), ''), nullif(btrim(p_previous_syndic_name), ''),
    coalesce(p_exercice_debut, 1),
    2, 2
  )
  returning id into v_copro;

  insert into public.memberships (user_id, copro_id, role)
  values (v_uid, v_copro, 'gestionnaire');

  perform public.provision_copro_chart(v_copro);

  return jsonb_build_object('id', v_copro, 'name', v_name);
end; $$;
revoke execute on function public.create_copro(text, text, text, text, int, text, text, int) from public, anon;
grant execute on function public.create_copro(text, text, text, text, int, text, text, int) to authenticated, service_role;
