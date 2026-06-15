-- ============================================================================
-- 0065 — RPC pouvoirs AG (mandats) : get/save/delete/update_justificatif
-- ----------------------------------------------------------------------------
-- Le front (src/hooks/modules/usePouvoirs.ts) appelle 4 RPC FANTÔMES qui
-- n'existaient pas :
--   get_ag_pouvoirs(p_ag_id)
--   save_ag_pouvoir(p_ag_id, p_mandant_id, p_mandataire_id, p_signed_at)
--   delete_ag_pouvoir(p_pouvoir_id)
--   update_ag_pouvoir_justificatif(p_pouvoir_id, p_filename, p_path, p_size)
--
-- MODÈLE RÉEL = table ag_attendance (0017). Un POUVOIR n'est PAS une table
-- dédiée : c'est UNE LIGNE MANDANT où la personne se fait représenter :
--   coproprietaire_id   = le MANDANT (celui qui donne son pouvoir)
--   presence_type       = 'proxy'
--   represented_by_id   = le MANDATAIRE (celui qui reçoit le pouvoir)
--   represented_by_name = nom affiché du mandataire (dénormalisé)
--   proxy_document_id   = justificatif signé (FK documents, nullable)
--   proxy_signed_at     = date de signature du mandat
-- L'identifiant « pouvoir_id » exposé au front = ag_attendance.id de la ligne
-- MANDANT. Un mandataire détient N pouvoirs = N lignes mandant distinctes (il
-- n'a JAMAIS de ligne « mandataire » propre côté pouvoir).
--
-- UPSERT : la contrainte uq_ag_attendance_owner UNIQUE(ag_id, coproprietaire_id)
-- garantit une seule ligne par (AG, copropriétaire). save_ag_pouvoir UPSERTE
-- donc sur (ag_id, mandant) : si le mandant a déjà une ligne (présence réelle),
-- on la BASCULE en 'proxy' SANS détruire ses lot_ids / tantiemes (on ne touche
-- que presence_type + represented_by_* + proxy_*). Si aucune ligne, on en crée
-- une (lot_ids vides, tantiemes 0 — les tantièmes affichés sont DÉRIVÉS de la
-- propriété, pas stockés ici).
--
-- LIMITE LÉGALE art.22 (loi 1965) PORTÉE CÔTÉ SERVEUR : un mandataire ne peut
-- détenir plus de 3 pouvoirs. save_ag_pouvoir REFUSE (errcode 23514) si, sur
-- cette AG, represented_by_id = mandataire compte DÉJÀ >= 3 lignes proxy (en
-- excluant la ligne du mandant courant, pour autoriser un simple changement de
-- mandataire sur un pouvoir existant). Reprend MAX_POUVOIRS_PAR_MANDATAIRE=3.
--
-- JUSTIFICATIF : le hook upload le fichier dans Storage puis appelle
-- update_ag_pouvoir_justificatif(filename, path, size). On matérialise un
-- document GED (table documents) et on pointe proxy_document_id dessus +
-- proxy_signed_at = now(). get_ag_pouvoirs ré-expose file_name/file_path du
-- document joint (justificatif_filename / justificatif_path).
--
-- SÉCURITÉ : security definer + garde alignée sur les RPC AG (0050/0062) :
--   is_service_call() OR user_is_copro_manager(copro de l'AG dérivée de
--   ag_meetings). La copro n'est JAMAIS passée par le client.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper interne : nom affiché + tantièmes d'un copropriétaire (clé générale
-- active), aligné sur rpc_get_ag_coproprietaires (0030). NON exposé (interne).
-- ----------------------------------------------------------------------------
-- (inline dans get_ag_pouvoirs ci-dessous ; pas de fonction séparée pour rester
--  cohérent avec le périmètre de la tranche)

-- ----------------------------------------------------------------------------
-- get_ag_pouvoirs — liste les pouvoirs (lignes proxy) au format PouvoirDB
-- ----------------------------------------------------------------------------
create or replace function public.get_ag_pouvoirs(p_ag_id uuid)
returns table (
  id                     uuid,
  ag_id                  uuid,
  mandant_id             uuid,
  mandant_name           text,
  mandant_tantiemes      numeric,
  mandataire_id          uuid,
  mandataire_name        text,
  mandataire_tantiemes   numeric,
  signed_at              timestamptz,
  justificatif_filename  text,
  justificatif_path      text,
  created_at             timestamptz,
  updated_at             timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro uuid;
  v_key   uuid;
begin
  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'get_ag_pouvoirs: AG % introuvable', p_ag_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;

  -- clé générale active (NULL toléré -> tantièmes 0)
  select rk.id into v_key
  from public.repartition_keys rk
  where rk.copro_id = v_copro
    and rk.category = 'general'
    and rk.is_active = true
  limit 1;

  return query
  with tant as (
    select
      co.id,
      (case when co.is_company then co.company_name
            else trim(coalesce(co.first_name,'') || ' ' || coalesce(co.last_name,'')) end)::text as display_name,
      coalesce(sum(rkl.weight * lo.share_percent / 100.0), 0)::numeric as total_tantiemes
    from public.coproprietaires co
    left join public.lot_owners lo
      on lo.coproprietaire_id = co.id
     and lo.copro_id = co.copro_id
     and lo.end_date is null
    left join public.repartition_key_lines rkl
      on rkl.key_id = v_key and rkl.lot_id = lo.lot_id
    where co.copro_id = v_copro
    group by co.id, co.is_company, co.company_name, co.first_name, co.last_name
  )
  select
    a.id,
    a.ag_id,
    a.coproprietaire_id                                  as mandant_id,
    md.display_name                                      as mandant_name,
    coalesce(md.total_tantiemes, 0)                      as mandant_tantiemes,
    a.represented_by_id                                  as mandataire_id,
    coalesce(a.represented_by_name, mr.display_name)     as mandataire_name,
    coalesce(mr.total_tantiemes, 0)                      as mandataire_tantiemes,
    a.proxy_signed_at                                    as signed_at,
    d.file_name                                          as justificatif_filename,
    d.file_path                                          as justificatif_path,
    a.created_at,
    a.updated_at
  from public.ag_attendance a
  left join tant md on md.id = a.coproprietaire_id
  left join tant mr on mr.id = a.represented_by_id
  left join public.documents d on d.id = a.proxy_document_id
  where a.ag_id = p_ag_id
    and a.presence_type = 'proxy'
    and a.represented_by_id is not null
  order by md.display_name nulls last, a.created_at;
end;
$$;
revoke execute on function public.get_ag_pouvoirs(uuid) from public, anon;
grant  execute on function public.get_ag_pouvoirs(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- save_ag_pouvoir — UPSERT d'un pouvoir (ligne mandant -> 'proxy')
-- ----------------------------------------------------------------------------
-- Retour jsonb { success, pouvoir_id, error } (contrat du hook : data.success /
-- data.pouvoir_id / data.error). Les violations métier renvoient success=false
-- avec un message ; les violations d'intégrité dures (errcode) remontent telles
-- quelles côté client (error supabase).
create or replace function public.save_ag_pouvoir(
  p_ag_id         uuid,
  p_mandant_id    uuid,
  p_mandataire_id uuid,
  p_signed_at     timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro          uuid;
  v_mandataire_nom text;
  v_proxy_count    int;
  v_id             uuid;
begin
  -- 1. existence + copro de l'AG
  select m.copro_id into v_copro from public.ag_meetings m where m.id = p_ag_id;
  if v_copro is null then
    raise exception 'save_ag_pouvoir: AG % introuvable', p_ag_id using errcode = '23503';
  end if;

  -- 2. garde d'accès
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''AG %', p_ag_id using errcode = '42501';
  end if;

  -- 3. mandant / mandataire valides
  if p_mandant_id is null or p_mandataire_id is null then
    raise exception 'save_ag_pouvoir: mandant et mandataire requis' using errcode = '22004';
  end if;
  if p_mandant_id = p_mandataire_id then
    return jsonb_build_object('success', false,
      'error', 'Le mandant et le mandataire ne peuvent pas être la même personne');
  end if;

  -- les deux doivent appartenir à la copro de l'AG
  if not exists (select 1 from public.coproprietaires c
                 where c.id = p_mandant_id and c.copro_id = v_copro) then
    return jsonb_build_object('success', false, 'error', 'Mandant inconnu pour cette copropriété');
  end if;
  if not exists (select 1 from public.coproprietaires c
                 where c.id = p_mandataire_id and c.copro_id = v_copro) then
    return jsonb_build_object('success', false, 'error', 'Mandataire inconnu pour cette copropriété');
  end if;

  -- 4. LIMITE LÉGALE art.22 : le mandataire détient déjà 3 pouvoirs sur cette AG ?
  --    On compte les lignes proxy le pointant, en EXCLUANT la ligne du mandant
  --    courant (autorise un re-save / changement de mandataire sans faux positif).
  select count(*) into v_proxy_count
  from public.ag_attendance a
  where a.ag_id = p_ag_id
    and a.presence_type = 'proxy'
    and a.represented_by_id = p_mandataire_id
    and a.coproprietaire_id <> p_mandant_id;
  if v_proxy_count >= 3 then
    raise exception 'art.22: le mandataire détient déjà 3 pouvoirs (limite légale)'
      using errcode = '23514';
  end if;

  -- 5. nom dénormalisé du mandataire
  select (case when c.is_company then c.company_name
               else trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')) end)
    into v_mandataire_nom
  from public.coproprietaires c
  where c.id = p_mandataire_id;

  -- 6. UPSERT sur la ligne MANDANT. Si une ligne de présence existe déjà, on la
  --    BASCULE en 'proxy' sans toucher lot_ids / tantiemes (présence préservée).
  insert into public.ag_attendance
    (ag_id, copro_id, coproprietaire_id, presence_type,
     represented_by_id, represented_by_name, proxy_signed_at)
  values
    (p_ag_id, v_copro, p_mandant_id, 'proxy',
     p_mandataire_id, v_mandataire_nom, p_signed_at)
  on conflict (ag_id, coproprietaire_id) do update
    set presence_type       = 'proxy',
        represented_by_id    = excluded.represented_by_id,
        represented_by_name  = excluded.represented_by_name,
        proxy_signed_at      = coalesce(excluded.proxy_signed_at, public.ag_attendance.proxy_signed_at)
  returning id into v_id;

  return jsonb_build_object('success', true, 'pouvoir_id', v_id);
end;
$$;
revoke execute on function public.save_ag_pouvoir(uuid, uuid, uuid, timestamptz) from public, anon;
grant  execute on function public.save_ag_pouvoir(uuid, uuid, uuid, timestamptz) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- delete_ag_pouvoir — révoque un pouvoir SANS perdre une présence réelle
-- ----------------------------------------------------------------------------
-- L'enum attendance_type ne contient PAS de valeur 'absent' (only present/proxy/
-- correspondence). On ne peut donc pas « neutraliser » la ligne par un statut.
-- Règle (préserve toute présence physique) :
--   • si la ligne porte un signal de présence réelle (signed / arrived_at /
--     signature_data) -> on la REPASSE en 'present' et on vide les champs de
--     mandat (la personne était bien là, on retire juste le pouvoir) ;
--   • sinon (pure ligne de pouvoir) -> on SUPPRIME la ligne.
-- Retour jsonb { success, error }.
create or replace function public.delete_ag_pouvoir(p_pouvoir_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro    uuid;
  v_real     boolean;
  v_found    uuid;
begin
  select a.copro_id,
         (a.signed or a.arrived_at is not null or a.signature_data is not null)
    into v_copro, v_real
  from public.ag_attendance a
  where a.id = p_pouvoir_id and a.presence_type = 'proxy';
  if v_copro is null then
    return jsonb_build_object('success', false, 'error', 'Pouvoir introuvable');
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis' using errcode = '42501';
  end if;

  if v_real then
    -- présence réelle convertie : on conserve la ligne, on retire le mandat
    update public.ag_attendance
      set presence_type      = 'present',
          represented_by_id   = null,
          represented_by_name = null,
          proxy_document_id   = null,
          proxy_signed_at     = null
    where id = p_pouvoir_id
    returning id into v_found;
  else
    -- pure ligne de pouvoir : suppression
    delete from public.ag_attendance where id = p_pouvoir_id
    returning id into v_found;
  end if;

  return jsonb_build_object('success', v_found is not null);
end;
$$;
revoke execute on function public.delete_ag_pouvoir(uuid) from public, anon;
grant  execute on function public.delete_ag_pouvoir(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- update_ag_pouvoir_justificatif — rattache le justificatif signé (GED)
-- ----------------------------------------------------------------------------
-- Le hook a déjà uploadé le fichier dans Storage (bucket documents) puis passe
-- filename / path / size. On matérialise un document GED (idempotent sur
-- (copro_id, file_path)) et on pointe proxy_document_id dessus + proxy_signed_at.
create or replace function public.update_ag_pouvoir_justificatif(
  p_pouvoir_id uuid,
  p_filename   text,
  p_path       text,
  p_size       integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_copro uuid;
  v_doc   uuid;
begin
  if p_filename is null or btrim(p_filename) = '' or p_path is null or btrim(p_path) = '' then
    raise exception 'update_ag_pouvoir_justificatif: filename et path requis' using errcode = '22004';
  end if;

  select a.copro_id into v_copro
  from public.ag_attendance a
  where a.id = p_pouvoir_id and a.presence_type = 'proxy';
  if v_copro is null then
    return jsonb_build_object('success', false, 'error', 'Pouvoir introuvable');
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis' using errcode = '42501';
  end if;

  -- document GED idempotent sur (copro_id, file_path)
  insert into public.documents (copro_id, file_name, file_path, file_size, mime_type, category, source_module)
  values (v_copro, p_filename, p_path, p_size, 'application/octet-stream', 'autre', 'ag')
  on conflict (copro_id, file_path) do update
    set file_name = excluded.file_name,
        file_size = excluded.file_size,
        updated_at = now()
  returning id into v_doc;

  update public.ag_attendance
    set proxy_document_id = v_doc,
        proxy_signed_at   = coalesce(proxy_signed_at, now())
  where id = p_pouvoir_id;

  return jsonb_build_object('success', true, 'document_id', v_doc);
end;
$$;
revoke execute on function public.update_ag_pouvoir_justificatif(uuid, text, text, integer) from public, anon;
grant  execute on function public.update_ag_pouvoir_justificatif(uuid, text, text, integer) to authenticated, service_role;
