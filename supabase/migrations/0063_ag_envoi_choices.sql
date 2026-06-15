-- ============================================================================
-- 0063 — Choix d'envoi AG : get_ag_envoi_choices / save_ag_envoi_choices
-- ----------------------------------------------------------------------------
-- Le front (useAgEnvoiPage) appelait deux RPC FANTÔMES qui n'existaient pas.
-- Les CHOIX d'envoi (par copropriétaire : quels canaux) sont un BROUILLON
-- ÉDITABLE, à NE PAS confondre avec les TRACES d'envoi réelles (table
-- ag_envoi_tracking, écrites par le pipeline de dispatch et qui FONT FOI —
-- preuve légale du délai de 21 jours, art. 13 décret 67-223).
--
-- ⚠️ LEÇON (revue adversariale) : une 1re version stockait les choix DANS
-- ag_envoi_tracking et purgeait à chaque save les lignes
-- "status='queued' OR sent_at IS NULL". Or le dispatch écrit les canaux LÉGAUX
-- (recommandé…) en status='queued' → un simple re-toggle aurait SUPPRIMÉ une
-- preuve d'expédition. CORRECTIF : les choix vivent dans une colonne jsonb dédiée
-- ag_meetings.envoi_choices ; save_ag_envoi_choices NE TOUCHE JAMAIS
-- ag_envoi_tracking. Le mapping SendingMethod (front) -> notification_channel se
-- fait au moment de l'ENVOI réel (convocation-dispatch), pas ici : le brouillon
-- conserve les codes front (SendingChoice) tels quels.
--
-- SÉCURITÉ : security definer + is_service_call() OR user_is_copro_manager(copro
-- de l'AG, dérivée de ag_meetings, jamais du client). grant authenticated/service_role.
-- ============================================================================

-- Colonne de brouillon des choix d'envoi (format SendingChoice[] du front).
alter table public.ag_meetings
  add column if not exists envoi_choices jsonb;

comment on column public.ag_meetings.envoi_choices is
  'Brouillon ÉDITABLE des choix d''envoi de convocation : [{coproprietaireId, methods:[codes SendingMethod]}]. DISTINCT des traces d''envoi (ag_envoi_tracking, immuables = preuve légale). Alimenté par save_ag_envoi_choices ; ne porte aucune valeur d''envoi (sent_at/status).';

-- ----------------------------------------------------------------------------
-- get_ag_envoi_choices — lit le brouillon de choix (jamais les traces d'envoi)
-- ----------------------------------------------------------------------------
create or replace function public.get_ag_envoi_choices(p_ag_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro   uuid;
  v_choices jsonb;
begin
  select m.copro_id, m.envoi_choices into v_copro, v_choices
  from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'get_ag_envoi_choices: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;
  return coalesce(v_choices, '[]'::jsonb);
end;
$$;
revoke execute on function public.get_ag_envoi_choices(uuid) from public, anon;
grant  execute on function public.get_ag_envoi_choices(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- save_ag_envoi_choices — remplace le brouillon (UPDATE ag_meetings.envoi_choices)
-- ----------------------------------------------------------------------------
-- p_choices : [{ "coproprietaireId": uuid, "methods": ["RECOMMANDE","EMAIL"] }, ...]
-- Anti-injection : chaque coproprietaireId cité doit appartenir à la copro de l'AG.
-- N'écrit QUE ag_meetings.envoi_choices — ag_envoi_tracking n'est JAMAIS touché.
create or replace function public.save_ag_envoi_choices(p_ag_id uuid, p_choices jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro  uuid;
  v_choice jsonb;
  v_cop_id uuid;
  v_count  integer := 0;
begin
  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'save_ag_envoi_choices: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;
  if p_choices is not null and jsonb_typeof(p_choices) is distinct from 'array' then
    raise exception 'save_ag_envoi_choices: p_choices doit être un tableau jsonb (AG %)', p_ag_id
      using errcode = '22023';
  end if;

  -- Anti-injection : valider l'appartenance copro de chaque copropriétaire cité.
  if p_choices is not null then
    for v_choice in select * from jsonb_array_elements(p_choices)
    loop
      v_cop_id := nullif(v_choice ->> 'coproprietaireId', '')::uuid;
      if v_cop_id is not null and not exists (
        select 1 from public.coproprietaires co
        where co.id = v_cop_id and co.copro_id = v_copro
      ) then
        raise exception 'save_ag_envoi_choices: copropriétaire % absent de la copro % (AG %)',
          v_cop_id, v_copro, p_ag_id using errcode = '23503';
      end if;
      v_count := v_count + 1;
    end loop;
  end if;

  update public.ag_meetings
     set envoi_choices = coalesce(p_choices, '[]'::jsonb)
   where id = p_ag_id;

  return jsonb_build_object('success', true, 'ag_id', p_ag_id, 'count', v_count);
end;
$$;
revoke execute on function public.save_ag_envoi_choices(uuid, jsonb) from public, anon;
grant  execute on function public.save_ag_envoi_choices(uuid, jsonb) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Nettoyage : helpers de mapping d'une version précédente devenus inutiles
-- (le mapping SendingMethod <-> notification_channel se fait côté dispatch).
-- Placé APRÈS le CREATE OR REPLACE des RPC pour qu'aucune RPC n'en dépende plus.
-- Idempotent : no-op sur une base fraîche.
-- ----------------------------------------------------------------------------
drop function if exists public._ag_sending_method_to_channel(text);
drop function if exists public._ag_channel_to_sending_method(notification_channel);
