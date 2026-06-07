-- ============================================================================================
-- 0031_rpc_ged_mutations.sql — GED (documents) + MUTATIONS (vente de lot / etat date)
-- Sur tables 0019/0020. Aucune table creee. Gardes 0023. RLS centralisee en 0034.
-- ============================================================================================
-- GED — moitié GED de 0031_rpc_ged_mutations.sql (documents / versioning / dossiers système)
-- Source : INVENTAIRE-FONCTIONS.md §J + 06-documents-ged.md §1/§4/§5/§5.1/§5bis
-- Tables posées en 0020_ged.sql. user_can_view_document = déjà en 0023 (NON redéfini ici).
-- Conventions 0023-0030 : RPC = SECURITY DEFINER set search_path = public + REVOKE public/anon + GRANT authenticated,service_role ;
--   fonctions trigger = SECURITY DEFINER + REVOKE public,anon,authenticated. Un seul % par RAISE. Cast enum explicite.

-- ============================================================
-- generate_document_path (4 args) — chemin canonique ged/<copro>/<category>/<year>/<file>
-- ============================================================
-- Lecture pure (aucune table touchée) mais le corps appelle now() (catégorie STABLE) → STABLE, pas IMMUTABLE. G-INTERNAL (REVOKE anon).
create or replace function public.generate_document_path(
  p_copro_id  uuid,
  p_category  document_category,
  p_year      integer default extract(year from now())::integer,
  p_file_name text default null
)
returns text
language sql
stable
as $$
  select 'ged/'
       || p_copro_id::text || '/'
       || p_category::text || '/'
       || coalesce(p_year, extract(year from now())::integer)::text || '/'
       || coalesce(p_file_name, '');
$$;
revoke execute on function public.generate_document_path(uuid, document_category, integer, text) from public, anon;
grant execute on function public.generate_document_path(uuid, document_category, integer, text) to authenticated, service_role;

-- ============================================================
-- create_document_system_folders(p_copro_id, p_user_id) — seed arborescence système (idempotent)
-- ============================================================
-- G-MGR. ON CONFLICT DO NOTHING sur uq_document_folders_name (copro_id, parent_id, name).
-- category_default : valeurs document_category cible UNIQUEMENT — 'courrier' (jamais 'correspondance', supprimée).
create or replace function public.create_document_system_folders(
  p_copro_id uuid,
  p_user_id  uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid := coalesce(p_user_id, auth.uid());
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: not a manager of copro %', p_copro_id
      using errcode = '42501';
  end if;

  insert into public.document_folders
    (copro_id, parent_id, name, icon, color, sort_order, is_system, category_default, created_by)
  values
    (p_copro_id, null, 'Assemblées générales', 'Users',     '#3B82F6', 1,  true, 'pv_ag'::document_category,        v_creator),
    (p_copro_id, null, 'Règlement & EDD',      'BookOpen',  '#8B5CF6', 2,  true, 'reglement'::document_category,    v_creator),
    (p_copro_id, null, 'Contrats',             'FileText',  '#10B981', 3,  true, 'contrat'::document_category,      v_creator),
    (p_copro_id, null, 'Factures',             'Receipt',   '#F59E0B', 4,  true, 'facture'::document_category,      v_creator),
    (p_copro_id, null, 'Diagnostics',          'Activity',  '#EF4444', 5,  true, 'diagnostic'::document_category,   v_creator),
    (p_copro_id, null, 'Plans',                'Map',       '#06B6D4', 6,  true, 'plan'::document_category,         v_creator),
    (p_copro_id, null, 'Correspondances',      'Mail',      '#EC4899', 7,  true, 'courrier'::document_category,     v_creator),
    (p_copro_id, null, 'Budgets & comptes',    'Calculator','#6366F1', 8,  true, 'budget'::document_category,       v_creator),
    (p_copro_id, null, 'Ordres de service',    'Wrench',    '#F97316', 9,  true, 'ordre_service'::document_category,v_creator),
    (p_copro_id, null, 'Photos',               'Image',     '#14B8A6', 10, true, 'photo'::document_category,        v_creator)
  on conflict (copro_id, parent_id, name) do nothing;

  -- Sous-dossiers (rattachés à leur racine système par name)
  insert into public.document_folders
    (copro_id, parent_id, name, icon, color, sort_order, is_system, category_default, created_by)
  select p_copro_id, parent.id, sub.name, sub.icon, sub.color, sub.sort_order, true, sub.category_default::document_category, v_creator
  from public.document_folders parent
  join (values
    ('Contrats',          'Assurances',       'Shield',  '#10B981', 1, 'assurance'),
    ('Contrats',          'Devis',            'FileText','#10B981', 2, 'devis'),
    ('Budgets & comptes', 'Appels de fonds',  'Coins',   '#6366F1', 1, 'appel_fonds'),
    ('Budgets & comptes', 'Relevés de charges','ListChecks','#6366F1', 2, 'releve_charges'),
    ('Assemblées générales', 'États datés',   'FileSignature', '#3B82F6', 1, 'etat_date')
  ) as sub(parent_name, name, icon, color, sort_order, category_default)
    on sub.parent_name = parent.name
  where parent.copro_id = p_copro_id
    and parent.parent_id is null
    and parent.is_system
  on conflict (copro_id, parent_id, name) do nothing;
end;
$$;
revoke execute on function public.create_document_system_folders(uuid, uuid) from public, anon;
grant execute on function public.create_document_system_folders(uuid, uuid) to authenticated, service_role;

-- ============================================================
-- create_document_version — modèle POINTEUR (snapshot état courant → document_versions, bump current_version_no)
-- ============================================================
-- G-MGR (copro dérivée du document). document_versions = source UNIQUE de versioning (A9).
create or replace function public.create_document_version(
  p_document_id   uuid,
  p_new_file_path text,
  p_new_file_name text,
  p_new_file_size integer,
  p_new_file_hash text,
  p_change_summary text default null,
  p_user_id        uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc     public.documents%rowtype;
  v_creator uuid := coalesce(p_user_id, auth.uid());
  v_next_no integer;
  v_version_id uuid;
begin
  select * into v_doc
  from public.documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'document % not found', p_document_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_doc.copro_id) then
    raise exception 'forbidden: not a manager of copro %', v_doc.copro_id
      using errcode = '42501';
  end if;

  v_next_no := v_doc.current_version_no + 1;

  -- Snapshot du nouvel état comme version courante de l'historique
  insert into public.document_versions
    (document_id, version_number, file_path, file_name, file_size, file_hash, change_summary, created_by)
  values
    (p_document_id, v_next_no, p_new_file_path, p_new_file_name, p_new_file_size, p_new_file_hash, p_change_summary, v_creator)
  returning id into v_version_id;

  -- Le document pointe désormais sur le nouveau fichier courant
  update public.documents
     set file_path          = p_new_file_path,
         file_name          = p_new_file_name,
         file_size          = p_new_file_size,
         file_hash          = p_new_file_hash,
         current_version_no = v_next_no
   where id = p_document_id;

  return v_version_id;
end;
$$;
revoke execute on function public.create_document_version(uuid, text, text, integer, text, text, uuid) from public, anon;
grant execute on function public.create_document_version(uuid, text, text, integer, text, text, uuid) to authenticated, service_role;

-- ============================================================
-- TRIGGER FN : calculate_document_expiration (BEFORE I/U documents)
-- ============================================================
-- expiration_date := base (document_date sinon created_at) + retention_years ; deletion_blocked si catégorie légale non expirée.
create or replace function public.calculate_document_expiration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base date;
  v_legal boolean;
begin
  v_base := coalesce(new.document_date, new.created_at::date, current_date);

  if new.retention_years is null then
    new.expiration_date := null;
  else
    new.expiration_date := (v_base + make_interval(years => new.retention_years))::date;
  end if;

  v_legal := new.category in (
    'pv_ag'::document_category,
    'convocation'::document_category,
    'reglement'::document_category,
    'contrat'::document_category,
    'diagnostic'::document_category,
    'etat_date'::document_category
  );

  new.deletion_blocked := v_legal
    and (new.expiration_date is null or new.expiration_date > current_date);

  return new;
end;
$$;
revoke execute on function public.calculate_document_expiration() from public, anon, authenticated;

-- ============================================================
-- TRIGGER FN : update_document_search_text (BEFORE I/U documents)
-- ============================================================
-- search_text := to_tsvector('french', title || file_name || description || tags).
create or replace function public.update_document_search_text()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.search_text := to_tsvector(
    'french',
    coalesce(new.title, '') || ' '
      || coalesce(new.file_name, '') || ' '
      || coalesce(new.description, '') || ' '
      || coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$$;
revoke execute on function public.update_document_search_text() from public, anon, authenticated;

-- ============================================================
-- TRIGGER FN : prevent_protected_document_deletion (BEFORE DELETE documents)
-- ============================================================
-- Re-quête l'état courant (pas d'image figée) : bloque si deletion_blocked et non expiré.
create or replace function public.prevent_protected_document_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocked boolean;
  v_expiration date;
begin
  select deletion_blocked, expiration_date
    into v_blocked, v_expiration
  from public.documents
  where id = old.id;

  if coalesce(v_blocked, false)
     and (v_expiration is null or v_expiration > current_date) then
    raise exception 'cannot delete protected document % (legal retention not expired)', old.id
      using errcode = '42501';
  end if;

  return old;
end;
$$;
revoke execute on function public.prevent_protected_document_deletion() from public, anon, authenticated;

-- ============================================================
-- CREATE TRIGGER sur documents (3 triggers GED)
-- ============================================================
create trigger trg_document_search_text
  before insert or update on public.documents
  for each row execute function public.update_document_search_text();

create trigger trg_document_expiration
  before insert or update on public.documents
  for each row execute function public.calculate_document_expiration();

create trigger trg_prevent_document_deletion
  before delete on public.documents
  for each row execute function public.prevent_protected_document_deletion();

-- ============================================================
-- VUE v_document_versions — historique (source unique document_versions)
-- ============================================================
create or replace view public.v_document_versions
with (security_invoker = true) as
select
  dv.document_id,
  dv.version_number,
  dv.file_path,
  dv.file_name,
  dv.file_size,
  dv.created_by,
  dv.created_at
from public.document_versions dv;


-- ============================================================================================
-- MUTATIONS — vente de lot / etat date (tables 0019). Lot-centric (A3) : validate_mutation change
-- lot_owners et ne poste AUCUN GL (le solde 450 suit le lot). Recouvrement art.20 (opposition) = differe.
-- Triggers de coherence intra-copro + immutabilite etat date : differes de 0019 (en-tete 0019), poses ici.
-- ============================================================================================

-- ------------------------------------------------------------
-- Triggers de coherence intra-copro (filet RLS) + immutabilite etat date
-- ------------------------------------------------------------
create or replace function public.tr_mutation_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lot_copro uuid; v_per_copro uuid;
begin
  select copro_id into v_lot_copro from public.lots where id = new.lot_id;
  if v_lot_copro is distinct from new.copro_id then
    raise exception 'mutation: lot % hors copro %', new.lot_id, new.copro_id using errcode = '23514';
  end if;
  if new.period_id is not null then
    select copro_id into v_per_copro from public.accounting_periods where id = new.period_id;
    if v_per_copro is distinct from new.copro_id then
      raise exception 'mutation: periode % hors copro %', new.period_id, new.copro_id using errcode = '23514';
    end if;
  end if;
  return new;
end; $$;
revoke execute on function public.tr_mutation_copro_consistency() from public, anon, authenticated;
create trigger tr_mutation_copro_consistency before insert or update on public.mutations
  for each row execute function public.tr_mutation_copro_consistency();

create or replace function public.tr_mutation_step_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_copro uuid;
begin
  select copro_id into v_copro from public.mutations where id = new.mutation_id;
  if v_copro is distinct from new.copro_id then
    raise exception 'mutation_step: mutation % hors copro %', new.mutation_id, new.copro_id using errcode = '23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_mutation_step_copro_consistency() from public, anon, authenticated;
create trigger tr_mutation_step_copro_consistency before insert or update on public.mutation_steps
  for each row execute function public.tr_mutation_step_copro_consistency();

create or replace function public.tr_opposition_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_mut_copro uuid; v_lot_copro uuid;
begin
  select copro_id into v_mut_copro from public.mutations where id = new.mutation_id;
  select copro_id into v_lot_copro from public.lots where id = new.lot_id;
  if v_mut_copro is distinct from new.copro_id or v_lot_copro is distinct from new.copro_id then
    raise exception 'opposition: mutation/lot hors copro %', new.copro_id using errcode = '23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_opposition_copro_consistency() from public, anon, authenticated;
create trigger tr_opposition_copro_consistency before insert or update on public.mutation_oppositions
  for each row execute function public.tr_opposition_copro_consistency();

create or replace function public.tr_etat_date_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_mut_copro uuid; v_lot_copro uuid;
begin
  select copro_id into v_mut_copro from public.mutations where id = new.mutation_id;
  select copro_id into v_lot_copro from public.lots where id = new.lot_id;
  if v_mut_copro is distinct from new.copro_id or v_lot_copro is distinct from new.copro_id then
    raise exception 'etat_date: mutation/lot hors copro %', new.copro_id using errcode = '23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_etat_date_copro_consistency() from public, anon, authenticated;
create trigger tr_etat_date_copro_consistency before insert or update on public.etat_date_snapshots
  for each row execute function public.tr_etat_date_copro_consistency();

create or replace function public.tr_legal_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_lot_copro uuid;
begin
  if new.lot_id is not null then
    select copro_id into v_lot_copro from public.lots where id = new.lot_id;
    if v_lot_copro is distinct from new.copro_id then
      raise exception 'legal: lot % hors copro %', new.lot_id, new.copro_id using errcode = '23514';
    end if;
  end if;
  return new;
end; $$;
revoke execute on function public.tr_legal_copro_consistency() from public, anon, authenticated;
create trigger tr_legal_copro_consistency before insert or update on public.legal_proceedings
  for each row execute function public.tr_legal_copro_consistency();

-- etat date IMMUABLE (art.5 decret 67-223, calque GL) : DELETE interdit ; UPDATE interdit sauf
-- materialisation unique du document_id (NULL -> non NULL), tout le reste inchange.
create or replace function public.tr_etat_date_immutable()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'etat_date_snapshots % immuable : suppression interdite', old.id using errcode = '42501';
  end if;
  if not (old.document_id is null and new.document_id is not null
          and new.payload = old.payload and new.snapshot_type = old.snapshot_type
          and new.effective_date = old.effective_date and new.mutation_id = old.mutation_id
          and new.lot_id = old.lot_id and new.copro_id = old.copro_id) then
    raise exception 'etat_date_snapshots % immuable : seule la liaison document_id est modifiable', old.id using errcode = '42501';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_etat_date_immutable() from public, anon, authenticated;
create trigger tr_etat_date_immutable before update or delete on public.etat_date_snapshots
  for each row execute function public.tr_etat_date_immutable();

-- ------------------------------------------------------------
-- initialize_mutation_steps (trigger AFTER INSERT) — seed des 6 jalons (demande = completed)
-- ------------------------------------------------------------
create or replace function public.initialize_mutation_steps()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.mutation_steps (copro_id, mutation_id, step_key, status, completed_at)
  values
    (new.copro_id, new.id, 'demande',        'completed', now()),
    (new.copro_id, new.id, 'pre_etat_date',  'pending',   null),
    (new.copro_id, new.id, 'etat_date',      'pending',   null),
    (new.copro_id, new.id, 'envoi_notaire',  'pending',   null),
    (new.copro_id, new.id, 'signature_acte', 'pending',   null),
    (new.copro_id, new.id, 'cloture_compte', 'pending',   null);
  return new;
end; $$;
revoke execute on function public.initialize_mutation_steps() from public, anon, authenticated;
create trigger tr_mutation_init_steps after insert on public.mutations
  for each row execute function public.initialize_mutation_steps();

-- ------------------------------------------------------------
-- upsert_mutation_step — avance un jalon (G-MGR ; completed_by = auth.uid())
-- ------------------------------------------------------------
create or replace function public.upsert_mutation_step(
  p_mutation_id uuid,
  p_step_key    mutation_step_key,
  p_status      mutation_step_status default 'completed',
  p_payload     jsonb default '{}'::jsonb
)
returns public.mutation_steps
language plpgsql security definer set search_path = public as $$
declare v_copro uuid; v_row public.mutation_steps;
begin
  select copro_id into v_copro from public.mutations where id = p_mutation_id;
  if v_copro is null then
    raise exception 'upsert_mutation_step: mutation % introuvable', p_mutation_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour la mutation %', p_mutation_id using errcode = '42501';
  end if;
  insert into public.mutation_steps (copro_id, mutation_id, step_key, status, payload, completed_at, completed_by)
  values (v_copro, p_mutation_id, p_step_key, p_status, coalesce(p_payload, '{}'::jsonb),
          case when p_status = 'completed' then now() else null end,
          case when p_status = 'completed' then auth.uid() else null end)
  on conflict (mutation_id, step_key) do update
    set status       = excluded.status,
        payload      = excluded.payload,
        completed_at = case when excluded.status = 'completed' then coalesce(public.mutation_steps.completed_at, now()) else null end,
        completed_by = case when excluded.status = 'completed' then coalesce(public.mutation_steps.completed_by, auth.uid()) else null end
  returning * into v_row;
  return v_row;
end; $$;
revoke execute on function public.upsert_mutation_step(uuid, mutation_step_key, mutation_step_status, jsonb) from public, anon;
grant execute on function public.upsert_mutation_step(uuid, mutation_step_key, mutation_step_status, jsonb) to authenticated, service_role;

-- ------------------------------------------------------------
-- validate_mutation — transfert de propriete (lot_owners), AUCUN GL, le 450 suit le lot (A3)
-- ------------------------------------------------------------
create or replace function public.validate_mutation(
  p_mutation_id        uuid,
  p_signature_date     date,
  p_effective_date     date    default null,
  p_buyer_owner_id     uuid    default null,
  p_buyer_first_name   text    default null,
  p_buyer_last_name    text    default null,
  p_buyer_company_name text    default null,
  p_buyer_email        text    default null,
  p_buyer_is_company   boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_mut   public.mutations%rowtype;
  v_eff   date;
  v_buyer uuid;
begin
  select * into v_mut from public.mutations where id = p_mutation_id;
  if v_mut.id is null then
    raise exception 'validate_mutation: mutation % introuvable', p_mutation_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_mut.copro_id) then
    raise exception 'forbidden: gestionnaire requis pour la mutation %', p_mutation_id using errcode = '42501';
  end if;
  if v_mut.status = 'validated' then
    raise exception 'validate_mutation: mutation % deja validee', p_mutation_id using errcode = '23514';
  end if;
  if v_mut.status = 'cancelled' then
    raise exception 'validate_mutation: mutation % annulee', p_mutation_id using errcode = '23514';
  end if;

  v_eff := coalesce(p_effective_date, p_signature_date);
  if v_eff is null then
    raise exception 'validate_mutation: date d''effet requise' using errcode = '23514';
  end if;

  -- resoudre l'acquereur : id fourni, sinon creation a la volee
  v_buyer := p_buyer_owner_id;
  if v_buyer is null then
    if coalesce(p_buyer_company_name, p_buyer_last_name) is null then
      raise exception 'validate_mutation: acquereur requis (id ou nom)' using errcode = '23514';
    end if;
    -- is_company DÉRIVÉ de la présence du nom de société (source de vérité unique = ck_copro_person_company en 0010),
    -- pour ne jamais violer la contrainte is_company = (company_name is not null).
    insert into public.coproprietaires (copro_id, is_company, company_name, first_name, last_name, email)
    values (v_mut.copro_id, (p_buyer_company_name is not null), p_buyer_company_name, p_buyer_first_name, p_buyer_last_name, p_buyer_email)
    returning id into v_buyer;
  else
    if not exists (select 1 from public.coproprietaires where id = v_buyer and copro_id = v_mut.copro_id) then
      raise exception 'validate_mutation: acquereur % hors copro %', v_buyer, v_mut.copro_id using errcode = '23503';
    end if;
  end if;

  -- acquereur != vendeur (message metier clair plutot qu'une violation brute de ck_mut_seller_buyer_distinct, 0019)
  if v_buyer = v_mut.seller_owner_id then
    raise exception 'validate_mutation: acquereur et vendeur identiques (mutation %)', p_mutation_id using errcode = '23514';
  end if;

  -- LOT-CENTRIC : clore TOUS les proprietaires actifs du lot, ouvrir l'acquereur. AUCUN GL (le 450 suit le lot).
  update public.lot_owners
     set end_date = v_eff
   where lot_id = v_mut.lot_id and end_date is null;

  insert into public.lot_owners (lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date)
  values (v_mut.lot_id, v_buyer, v_mut.copro_id, 100, true, v_eff);

  update public.mutations
     set buyer_owner_id = v_buyer,
         signature_date = p_signature_date,
         effective_date = v_eff,
         status         = 'validated'
   where id = p_mutation_id;

  update public.mutation_steps
     set status = 'completed', completed_at = now(), completed_by = auth.uid()
   where mutation_id = p_mutation_id and step_key in ('signature_acte', 'cloture_compte') and status <> 'completed';

  return jsonb_build_object('success', true, 'mutation_id', p_mutation_id,
    'buyer_owner_id', v_buyer, 'effective_date', v_eff, 'gl_posted', false);
end; $$;
revoke execute on function public.validate_mutation(uuid, date, date, uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.validate_mutation(uuid, date, date, uuid, text, text, text, text, boolean) to authenticated, service_role;

-- ------------------------------------------------------------
-- generate_etat_date_payload — etat date art.5 decret 67-223 (3 parties), fige a effective_date
-- ------------------------------------------------------------
create or replace function public.generate_etat_date_payload(
  p_copro_id      uuid,
  p_mutation_id   uuid,
  p_snapshot_type etat_date_type
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_mut      public.mutations%rowtype;
  v_eff      date;
  v_lot_ref  text;
  v_key      uuid;
  v_w        numeric;
  v_total_w  numeric;
  v_items    jsonb;
  v_p1_total numeric;
  v_by_nature jsonb;
  v_adv      numeric;
  v_prov     numeric;
begin
  select * into v_mut from public.mutations where id = p_mutation_id and copro_id = p_copro_id;
  if v_mut.id is null then
    raise exception 'generate_etat_date_payload: mutation % introuvable (copro %)', p_mutation_id, p_copro_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis (mutation %)', p_mutation_id using errcode = '42501';
  end if;
  v_eff := coalesce(v_mut.effective_date, v_mut.signature_date, current_date);
  select ref into v_lot_ref from public.lots where id = v_mut.lot_id;

  -- P1 : sommes 45x du LOT figees a v_eff (par compte/nature). balance>0 = du par le lot.
  select
    coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'nature', x.nature, 'amount', x.bal) order by x.code) filter (where x.bal <> 0), '[]'::jsonb),
    coalesce(sum(x.bal), 0),
    coalesce(jsonb_object_agg(x.code, x.bal) filter (where x.bal <> 0), '{}'::jsonb)
  into v_items, v_p1_total, v_by_nature
  from (
    select a.code, coalesce(a.nature::text, 'autre') as nature,
           round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) as bal
    from public.ledger_entries e
    join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
    join public.accounts a on a.id = e.account_id
    where e.copro_id = p_copro_id and e.lot_id = v_mut.lot_id
      and a.code like '45%' and t.tx_date <= v_eff
    group by a.code, a.nature
  ) x;

  -- P2 : quote-part (cle generale active)
  select id into v_key from public.repartition_keys
    where copro_id = p_copro_id and category = 'general' and is_active = true limit 1;
  -- aligne sur 0027/0030 : sans cle generale active, l'etat date serait silencieusement a 0% de quote-part (piece legale)
  if v_key is null then
    raise exception 'generate_etat_date_payload: cle de repartition generale active introuvable (copro %)', p_copro_id using errcode = '23503';
  end if;
  select rkl.weight into v_w from public.repartition_key_lines rkl where rkl.key_id = v_key and rkl.lot_id = v_mut.lot_id;
  select sum(weight) into v_total_w from public.repartition_key_lines where key_id = v_key;

  -- P3 : reconstitution avances (450-3) + provisions appelees NON echues a v_eff
  select coalesce(round(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 2), 0)
    into v_adv
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.lot_id = v_mut.lot_id and a.code = '450-3' and t.tx_date <= v_eff;

  select coalesce(sum(cfl.amount_due - cfl.amount_paid), 0)
    into v_prov
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  where cfl.copro_id = p_copro_id and cfl.lot_id = v_mut.lot_id
    and cf.status not in ('draft', 'cancelled')
    and cf.issue_date <= v_eff   -- gel symetrique de l'emission a la date d'effet (aligne sur P1/avances : tx_date <= v_eff)
    and cf.due_date > v_eff;

  return jsonb_build_object(
    'partie_1_sommes_dues_vendeur', jsonb_build_object(
      'label', 'Sommes dues par le vendeur au syndicat',
      'items', v_items, 'total', v_p1_total),
    'partie_2_dues_par_syndicat', jsonb_build_object(
      'label', 'Bases de calcul de la quote-part',
      'tantiemes_lot', coalesce(v_w, 0), 'tantiemes_total', coalesce(v_total_w, 0),
      'owner_share_pct', case when coalesce(v_total_w, 0) > 0 then round(coalesce(v_w, 0) * 100.0 / v_total_w, 4) else 0 end),
    'partie_3_charge_acquereur', jsonb_build_object(
      'label', 'A la charge de l''acquereur',
      'reconstitution_avances', v_adv,
      'provisions_appelees_non_echues', v_prov,
      'total', round(v_adv + v_prov, 2)),
    'lot', jsonb_build_object('id', v_mut.lot_id, 'ref', v_lot_ref),
    'copro', jsonb_build_object('id', p_copro_id),
    'seller', jsonb_build_object('id', v_mut.seller_owner_id),
    'effective_date', v_eff,
    'snapshot_type', p_snapshot_type,
    'legal_reference', 'art.5 decret 67-223',
    'balance_45x_by_nature', v_by_nature
  );
end; $$;
revoke execute on function public.generate_etat_date_payload(uuid, uuid, etat_date_type) from public, anon;
grant execute on function public.generate_etat_date_payload(uuid, uuid, etat_date_type) to authenticated, service_role;

-- ------------------------------------------------------------
-- create_etat_date_snapshot — fige l'etat date (immuable) + avance le workflow
-- ------------------------------------------------------------
create or replace function public.create_etat_date_snapshot(
  p_copro_id      uuid,
  p_mutation_id   uuid,
  p_snapshot_type etat_date_type
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_mut     public.mutations%rowtype;
  v_eff     date;
  v_payload jsonb;
  v_id      uuid;
begin
  select * into v_mut from public.mutations where id = p_mutation_id and copro_id = p_copro_id;
  if v_mut.id is null then
    raise exception 'create_etat_date_snapshot: mutation % introuvable (copro %)', p_mutation_id, p_copro_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis (mutation %)', p_mutation_id using errcode = '42501';
  end if;
  v_eff := coalesce(v_mut.effective_date, v_mut.signature_date, current_date);
  v_payload := public.generate_etat_date_payload(p_copro_id, p_mutation_id, p_snapshot_type);

  insert into public.etat_date_snapshots (copro_id, mutation_id, lot_id, snapshot_type, effective_date, payload, generated_by)
  values (p_copro_id, p_mutation_id, v_mut.lot_id, p_snapshot_type, v_eff, v_payload, auth.uid())
  returning id into v_id;

  if p_snapshot_type = 'pre' then
    update public.mutations set status = 'pre_etat_generated' where id = p_mutation_id and status = 'draft';
    update public.mutation_steps set status = 'completed', completed_at = now(), completed_by = auth.uid()
      where mutation_id = p_mutation_id and step_key = 'pre_etat_date' and status <> 'completed';
  else
    update public.mutations set status = 'etat_generated' where id = p_mutation_id and status in ('draft', 'pre_etat_generated');
    update public.mutation_steps set status = 'completed', completed_at = now(), completed_by = auth.uid()
      where mutation_id = p_mutation_id and step_key = 'etat_date' and status <> 'completed';
  end if;

  return jsonb_build_object('success', true, 'snapshot_id', v_id, 'snapshot_type', p_snapshot_type, 'payload', v_payload);
end; $$;
revoke execute on function public.create_etat_date_snapshot(uuid, uuid, etat_date_type) from public, anon;
grant execute on function public.create_etat_date_snapshot(uuid, uuid, etat_date_type) to authenticated, service_role;

-- ------------------------------------------------------------
-- VUE v_mutation_detail — mutation + jalons (6) + opposition
-- ------------------------------------------------------------
create or replace view public.v_mutation_detail
with (security_invoker = true) as
select
  m.id, m.copro_id, m.lot_id, m.period_id, m.status, m.mutation_type,
  m.seller_owner_id, m.buyer_owner_id, m.notaire_id,
  m.requested_at, m.signature_date, m.effective_date, m.cancelled_at, m.cancel_reason, m.notes,
  m.created_at, m.updated_at,
  (select coalesce(jsonb_agg(jsonb_build_object(
            'step_key', s.step_key, 'status', s.status,
            'completed_at', s.completed_at, 'completed_by', s.completed_by) order by s.step_key), '[]'::jsonb)
     from public.mutation_steps s where s.mutation_id = m.id) as steps,
  (select to_jsonb(o) from public.mutation_oppositions o where o.mutation_id = m.id) as opposition
from public.mutations m;
