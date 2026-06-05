-- 0023_authz_helpers.sql — HELPERS D'AUTORISATION (1er palier du « lot fonctions »)
-- Source : .planning/db-cible/AUTORISATION.md §3/§4/§5 + INVENTAIRE-FONCTIONS.md §F/§P
--          + 01-copros-lots-personnes.md §5.
--
-- Périmètre : CE FICHIER NE CRÉE QUE DES FONCTIONS (aucune table — schéma 0001→0022 déjà posé).
--
-- Conventions communes (AUTORISATION §4 + INVENTAIRE §17/§18) :
--   - SECURITY DEFINER + STABLE + set search_path = public (lire memberships/lot_owners malgré la RLS de l'appelant) ;
--   - RETURN FALSE si auth.uid() IS NULL (sauf is_service_call qui lit le rôle JWT) ;
--   - bug latent évité : %% n'est PAS utilisé — un seul % dans les format()/RAISE ;
--   - ACL deny-by-default : REVOKE EXECUTE FROM public, anon ; GRANT authenticated (+ service_role si appel machine).
--
-- ACL service_role (AUTORISATION §5.1 + INVENTAIRE §17) — DÉCISION TRANCHÉE :
--   Tous les helpers d'autz sauf link_coproprietaire_account reçoivent GRANT ... TO authenticated, service_role.
--   RAISON : ces helpers sont évalués DANS le corps des RPC G-MGR/G-OWNER/G-MIXTE/G-SVC
--   (« is_service_call() OR user_is_copro_manager(p_copro_id) »), dont l'ACL est `authenticated, service_role`
--   (§5.1) — chaîne machine post-as-you-go (import bancaire, callbacks, harnais). En particulier
--   allocate_payment est SECURITY INVOKER + GRANT service_role : ses appelants évaluent les helpers
--   HORS contexte DEFINER, donc l'EXECUTE doit être accordé à service_role explicitement.
--   EXCEPTION link_coproprietaire_account : GRANT authenticated UNIQUEMENT — geste humain d'activation
--   (même logique que set_opening_balance §5.3 : « pas service_role, geste exclusivement humain »).
--
-- Ordre de déclaration : un helper appelé est défini AVANT son appelant.
--   1) is_service_call            (lit le rôle JWT — pas de dépendance)
--   2) user_is_platform_admin     (transverse — appelé par les 2 pivots)
--   3) user_has_copro_access      (pivot SELECT — filtre cabinet intégré)
--   4) user_is_copro_manager      (pivot W — filtre cabinet intégré)
--   5) is_council_member / is_council_president   (source UNIQUE du rôle CS, lit council_members)
--   6) user_is_lot_owner*, user_owns_any_lot_in_copro, get_user_lot_ids   (droits « own » lot)
--   7) is_conversation_member     (messagerie)
--   8) can_view_content           (visibilité simple par contenu — content_visibility)
--   9) user_can_view_document     (visibilité simple par document — document_visibility, A4)
--  10) link_coproprietaire_account (DEFINER + garde email JWT = email invité — câblage portail)
--
-- RECONSTRUCTION PROPRE : on NE crée PAS user_is_council_member (lisait memberships.role) ;
--   on NE référence PAS document_access (table inexistante). Aucun DROP (rien à dropper).

-- ============================================================
-- 1. is_service_call() — l'appel vient-il du backend de confiance ?
-- ============================================================
-- Lit request.jwt.claims->>'role' = 'service_role'. NE dépend PAS de auth.uid()
-- (un appel service_role a auth.uid() NULL). C'est la seule fonction qui ne fail-close pas sur uid NULL.
create or replace function public.is_service_call()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    'anon'
  ) = 'service_role';
$$;
revoke execute on function public.is_service_call() from public, anon;
grant execute on function public.is_service_call() to authenticated, service_role;

-- ============================================================
-- 2. user_is_platform_admin() — rôle plateforme transverse (A13)
-- ============================================================
-- ∃ membership role='platform_admin' pour auth.uid() (transverse, hors cabinet).
-- Appelé en bypass par les 2 pivots ci-dessous + policy ALL sur cabinets.
create or replace function public.user_is_platform_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.role = 'platform_admin'
  );
end;
$$;
revoke execute on function public.user_is_platform_admin() from public, anon;
grant execute on function public.user_is_platform_admin() to authenticated, service_role;

-- ============================================================
-- 3. user_has_copro_access(p_copro_id) — accès lecture à une copro
-- ============================================================
-- user_is_platform_admin() (transverse) OU [∃ membership(uid, copro) — tout rôle —
--   ET (si gestionnaire : profiles.cabinet_id = copros.cabinet_id)].
-- PÉRIMÈTRE CABINET INTÉGRÉ : un gestionnaire ne « passe » que sur les copros de SON cabinet
--   (fail-closed : profiles.cabinet_id NULL ⇒ aucun accès gestionnaire). Le copropriétaire
--   (et tout rôle non-gestionnaire) n'est pas soumis au filtre cabinet (cabinet transitif).
create or replace function public.user_has_copro_access(p_copro_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.user_is_platform_admin() then
    return true;
  end if;

  return exists (
    select 1
    from public.memberships m
    join public.copros c on c.id = m.copro_id
    where m.user_id = auth.uid()
      and m.copro_id = p_copro_id
      and (
        m.role <> 'gestionnaire'
        or c.cabinet_id = (
          select p.cabinet_id from public.profiles p where p.id = auth.uid()
        )
      )
  );
end;
$$;
revoke execute on function public.user_has_copro_access(uuid) from public, anon;
grant execute on function public.user_has_copro_access(uuid) to authenticated, service_role;

-- ============================================================
-- 4. user_is_copro_manager(p_copro_id) — gestionnaire d'une copro (pivot G-MGR)
-- ============================================================
-- user_is_platform_admin() (transverse) OU [membership role='gestionnaire' POUR cette copro
--   ET profiles.cabinet_id = copros.cabinet_id]. Un gestionnaire ne pilote QUE les copros de SON cabinet.
create or replace function public.user_is_copro_manager(p_copro_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if public.user_is_platform_admin() then
    return true;
  end if;

  return exists (
    select 1
    from public.memberships m
    join public.copros c on c.id = m.copro_id
    where m.user_id = auth.uid()
      and m.copro_id = p_copro_id
      and m.role = 'gestionnaire'
      and c.cabinet_id = (
        select p.cabinet_id from public.profiles p where p.id = auth.uid()
      )
  );
end;
$$;
revoke execute on function public.user_is_copro_manager(uuid) from public, anon;
grant execute on function public.user_is_copro_manager(uuid) to authenticated, service_role;

-- ============================================================
-- 5a. is_council_member(p_copro_id, p_user_id) — SOURCE UNIQUE du rôle CS
-- ============================================================
-- ∃ council_members ACTIF (is_active ET end_date IS NULL) du conseil de p_copro_id lié à p_user_id,
--   soit directement (council_members.user_id), soit via la personne (coproprietaire.user_id = p_user_id).
-- Lit UNIQUEMENT council_members (jamais memberships.role). Signature 2 args (réutilisée par GED/contenu).
create or replace function public.is_council_member(p_copro_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return false;
  end if;
  return exists (
    select 1
    from public.council_members cm
    left join public.coproprietaires co on co.id = cm.coproprietaire_id
    where cm.copro_id = p_copro_id
      and cm.is_active
      and cm.end_date is null
      and (cm.user_id = p_user_id or co.user_id = p_user_id)
  );
end;
$$;
revoke execute on function public.is_council_member(uuid, uuid) from public, anon;
grant execute on function public.is_council_member(uuid, uuid) to authenticated, service_role;

-- ============================================================
-- 5b. is_council_president(p_copro_id, p_user_id) — président du CS
-- ============================================================
-- Membre actif du conseil avec role='president' (enum council_role).
create or replace function public.is_council_president(p_copro_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return false;
  end if;
  return exists (
    select 1
    from public.council_members cm
    left join public.coproprietaires co on co.id = cm.coproprietaire_id
    where cm.copro_id = p_copro_id
      and cm.is_active
      and cm.end_date is null
      and cm.role = 'president'
      and (cm.user_id = p_user_id or co.user_id = p_user_id)
  );
end;
$$;
revoke execute on function public.is_council_president(uuid, uuid) from public, anon;
grant execute on function public.is_council_president(uuid, uuid) to authenticated, service_role;

-- ============================================================
-- 6a. user_is_lot_owner(p_lot_id) — propriétaire actif du lot
-- ============================================================
-- ∃ lot_owners ACTIF (end_date IS NULL) du lot, dont la personne est liée à auth.uid()
--   (coproprietaires.user_id = auth.uid()).
create or replace function public.user_is_lot_owner(p_lot_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1
    from public.lot_owners lo
    join public.coproprietaires co on co.id = lo.coproprietaire_id
    where lo.lot_id = p_lot_id
      and lo.end_date is null
      and co.user_id = auth.uid()
  );
end;
$$;
revoke execute on function public.user_is_lot_owner(uuid) from public, anon;
grant execute on function public.user_is_lot_owner(uuid) to authenticated, service_role;

-- ============================================================
-- 6b. user_is_lot_owner_in_copro(p_copro_id, p_lot_id) — idem, borné copro
-- ============================================================
create or replace function public.user_is_lot_owner_in_copro(p_copro_id uuid, p_lot_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1
    from public.lot_owners lo
    join public.coproprietaires co on co.id = lo.coproprietaire_id
    where lo.lot_id = p_lot_id
      and lo.copro_id = p_copro_id
      and lo.end_date is null
      and co.user_id = auth.uid()
  );
end;
$$;
revoke execute on function public.user_is_lot_owner_in_copro(uuid, uuid) from public, anon;
grant execute on function public.user_is_lot_owner_in_copro(uuid, uuid) to authenticated, service_role;

-- ============================================================
-- 6c. user_is_lot_owner_or_manager(p_copro_id, p_lot_id) — OR des deux (RPC mixtes)
-- ============================================================
create or replace function public.user_is_lot_owner_or_manager(p_copro_id uuid, p_lot_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return public.user_is_copro_manager(p_copro_id)
      or public.user_is_lot_owner_in_copro(p_copro_id, p_lot_id);
end;
$$;
revoke execute on function public.user_is_lot_owner_or_manager(uuid, uuid) from public, anon;
grant execute on function public.user_is_lot_owner_or_manager(uuid, uuid) to authenticated, service_role;

-- ============================================================
-- 6d. user_owns_any_lot_in_copro(p_copro_id) — ∃ lot actif de l'utilisateur dans la copro
-- ============================================================
-- Accès portail copropriétaire : possède au moins un lot actif dans cette copro.
create or replace function public.user_owns_any_lot_in_copro(p_copro_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return exists (
    select 1
    from public.lot_owners lo
    join public.coproprietaires co on co.id = lo.coproprietaire_id
    where lo.copro_id = p_copro_id
      and lo.end_date is null
      and co.user_id = auth.uid()
  );
end;
$$;
revoke execute on function public.user_owns_any_lot_in_copro(uuid) from public, anon;
grant execute on function public.user_owns_any_lot_in_copro(uuid) to authenticated, service_role;

-- ============================================================
-- 6e. get_user_lot_ids(p_copro_id) → uuid[] — lots actifs de l'utilisateur dans la copro
-- ============================================================
-- Tableau vide si auth.uid() IS NULL ou aucun lot (jamais NULL → toujours array, filtrage sûr).
create or replace function public.get_user_lot_ids(p_copro_id uuid)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lot_ids uuid[];
begin
  if auth.uid() is null then
    return '{}'::uuid[];
  end if;
  select coalesce(array_agg(distinct lo.lot_id), '{}'::uuid[])
    into v_lot_ids
  from public.lot_owners lo
  join public.coproprietaires co on co.id = lo.coproprietaire_id
  where lo.copro_id = p_copro_id
    and lo.end_date is null
    and co.user_id = auth.uid();
  return v_lot_ids;
end;
$$;
revoke execute on function public.get_user_lot_ids(uuid) from public, anon;
grant execute on function public.get_user_lot_ids(uuid) to authenticated, service_role;

-- ============================================================
-- 7. is_conversation_member(p_conversation_id, p_user_id) — membre actif d'une conversation
-- ============================================================
-- ∃ conversation_members ACTIF (left_at IS NULL) pour ce user dans cette conversation.
create or replace function public.is_conversation_member(p_conversation_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return false;
  end if;
  return exists (
    select 1
    from public.conversation_members cmb
    where cmb.conversation_id = p_conversation_id
      and cmb.user_id = p_user_id
      and cmb.left_at is null
  );
end;
$$;
revoke execute on function public.is_conversation_member(uuid, uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated, service_role;

-- ============================================================
-- 8. can_view_content(p_copro_id, p_visibility, p_user_id) — visibilité SIMPLE par contenu
-- ============================================================
-- Source = enum content_visibility {all_members, council_only, managers_only}
--   (ordre de déclaration ENUMS 0003 l.44 — wall_posts.visibility / events.visibility / council_documents.visibility).
--   - managers_only → gestionnaire seul (user_is_copro_manager)
--   - council_only  → + membre du conseil (is_council_member) OU gestionnaire
--   - all_members   → + tout membre de la copro (user_has_copro_access)
-- p_user_id retenu pour la signature (CS) ; le filtre gestionnaire/accès s'appuie sur auth.uid()
--   (les helpers pivots lisent auth.uid() ; appel attendu avec p_user_id = auth.uid()).
create or replace function public.can_view_content(
  p_copro_id    uuid,
  p_visibility  content_visibility,
  p_user_id     uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return false;
  end if;

  case p_visibility
    when 'managers_only' then
      return public.user_is_copro_manager(p_copro_id);
    when 'council_only' then
      return public.user_is_copro_manager(p_copro_id)
          or public.is_council_member(p_copro_id, p_user_id);
    when 'all_members' then
      return public.user_has_copro_access(p_copro_id);
    else
      return false;
  end case;
end;
$$;
revoke execute on function public.can_view_content(uuid, content_visibility, uuid) from public, anon;
grant execute on function public.can_view_content(uuid, content_visibility, uuid) to authenticated, service_role;

-- ============================================================
-- 9. user_can_view_document(p_document_id) — visibilité SIMPLE par document (A4)
-- ============================================================
-- Source = documents.visibility (enum document_visibility) fixée par le gestionnaire :
--   - 'gestionnaire_seul'    → user_is_copro_manager (gestionnaire de la copro / platform_admin)
--   - 'conseil'              → gestionnaire OU membre du conseil (is_council_member, source unique)
--   - 'tous_coproprietaires' → tout membre de la copro (user_has_copro_access)
-- DIVERGENCE BLUEPRINT TRANCHÉE : INVENTAIRE §J suggérait user_owns_any_lot_in_copro pour la branche
--   'tous_coproprietaires' ; on retient user_has_copro_access conformément à AUTORISATION §4 (source
--   prioritaire) — un doc « tous copropriétaires » doit être visible de TOUT membre copropriétaire de
--   la copro, y compris sans lot actif (filtre large), pas seulement des propriétaires d'un lot.
-- Lit documents.copro_id. N'appelle JAMAIS user_is_council_member (inexistant) ni document_access (table inexistante).
-- Document introuvable → FALSE (deny by default).
create or replace function public.user_can_view_document(p_document_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro_id   uuid;
  v_visibility document_visibility;
begin
  if auth.uid() is null then
    return false;
  end if;

  select d.copro_id, d.visibility
    into v_copro_id, v_visibility
  from public.documents d
  where d.id = p_document_id;

  if v_copro_id is null then
    return false;
  end if;

  case v_visibility
    when 'gestionnaire_seul' then
      return public.user_is_copro_manager(v_copro_id);
    when 'conseil' then
      return public.user_is_copro_manager(v_copro_id)
          or public.is_council_member(v_copro_id, auth.uid());
    when 'tous_coproprietaires' then
      return public.user_has_copro_access(v_copro_id);
    else
      return false;
  end case;
end;
$$;
revoke execute on function public.user_can_view_document(uuid) from public, anon;
grant execute on function public.user_can_view_document(uuid) to authenticated, service_role;

-- ============================================================
-- 10. link_coproprietaire_account(p_invite_token) — câblage portail copropriétaire (Jalon B)
-- ============================================================
-- DEFINER, garde : email du JWT = email de l'invitation. Résout copro_invitations sur le token :
--   - statut 'pending' ET non périmée (now() < expires_at) ;
--   - email JWT (auth.jwt()->>'email') = invitations.email (insensible à la casse).
-- Effets (transaction implicite de la fonction) :
--   1) coproprietaires.user_id := auth.uid() pour la personne invitée (si pas déjà câblée) ;
--   2) INSERT memberships(user_id, copro_id, role='coproprietaire') (idempotent via ON CONFLICT) ;
--   3) invitation → 'accepted' + accepted_at = now().
-- Retourne l'id de la copro câblée. GRANT authenticated UNIQUEMENT (geste humain d'activation —
--   même logique que set_opening_balance §5.3 : pas service_role).
create or replace function public.link_coproprietaire_account(p_invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid := auth.uid();
  v_jwt_email     text := nullif(auth.jwt() ->> 'email', '');
  v_inv           public.copro_invitations%rowtype;
  v_linked_user   uuid;
begin
  if v_uid is null then
    raise exception 'forbidden: authentication required'
      using errcode = '42501';
  end if;

  select * into v_inv
  from public.copro_invitations
  where token = p_invite_token
  for update;

  if not found then
    raise exception 'invalid invitation token'
      using errcode = '22023';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'invitation % is not pending (status=%)', v_inv.id, v_inv.status
      using errcode = '22023';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'invitation % has expired', v_inv.id
      using errcode = '22023';
  end if;

  if v_jwt_email is null or lower(v_jwt_email) <> lower(v_inv.email) then
    raise exception 'forbidden: JWT email does not match invitation email'
      using errcode = '42501';
  end if;

  -- 1) câble la personne invitée à l'utilisateur courant (si pas déjà fait)
  update public.coproprietaires
     set user_id = v_uid
   where id = v_inv.coproprietaire_id
     and user_id is null;

  -- Durcissement : refuser la réassignation si la personne est déjà câblée à un AUTRE compte.
  -- (l'UPDATE conditionnel ci-dessus ne touche rien si user_id <> NULL ; on vérifie l'état final)
  select user_id into v_linked_user
  from public.coproprietaires
  where id = v_inv.coproprietaire_id;

  if v_linked_user is distinct from v_uid then
    raise exception 'forbidden: coproprietaire % already linked to another account', v_inv.coproprietaire_id
      using errcode = '42501';
  end if;

  -- 2) crée le membership copropriétaire (idempotent : 1 rôle / (user, copro))
  insert into public.memberships (user_id, copro_id, role)
  values (v_uid, v_inv.copro_id, 'coproprietaire')
  on conflict (user_id, copro_id) do nothing;

  -- 3) passe l'invitation à 'accepted'
  update public.copro_invitations
     set status = 'accepted',
         accepted_at = now()
   where id = v_inv.id;

  return v_inv.copro_id;
end;
$$;
-- service_role EXPLICITEMENT révoqué : Supabase accorde l'EXECUTE à service_role par
-- défaut à la création ; on le retire pour honorer « authenticated UNIQUEMENT » (geste
-- humain d'activation, §5.3 — pas de chemin machine).
revoke execute on function public.link_coproprietaire_account(text) from public, anon, service_role;
grant execute on function public.link_coproprietaire_account(text) to authenticated;