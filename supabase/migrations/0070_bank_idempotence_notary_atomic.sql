-- 0070_bank_idempotence_notary_atomic.sql
-- ============================================================================================
-- Durcissements issus de la revue adversariale de la nuit (2026-06-15). AUCUN changement
-- fonctionnel : on rend idempotents/atomiques des chemins qui reposaient sur des SELECT-then-INSERT
-- (corrects en mono-utilisateur, fragiles en concurrence). APPEND-ONLY : on recrée les fonctions de
-- 0066/0064 via CREATE OR REPLACE (on ne retouche pas les migrations déjà écrites).
--
-- CONTENU :
--   1. Index unique partiel uq_bank_mov_copro_ref  (idempotence import par bank_ref).
--   2. Index uniques partiels uq_bank_matches_*     (idempotence pointage).
--   3. import_bank_movements   : backstop ON CONFLICT (course concurrente).
--   4. reconcile_bank_movement : insert match race-safe + statut via refresh_bank_movement_status
--      (Option A — gère le pointage partiel : 'unmatched' tant que Σ < |montant|).
--   5. upsert_mutation_notary  : INSERT ... ON CONFLICT (atomique, plus de race 23505).
--
-- PRÉ-REQUIS DONNÉES : les index uniques supposent l'absence de doublons préexistants. Sur une base
-- rejouée 0001→0069 ou la base cloud vierge, les tables sont vides à ce stade -> aucune dédup requise.
-- ============================================================================================

-- ── 1+2. Index uniques (backstop idempotence en base) ───────────────────────────────────────
-- bank_movements : un même bank_ref (non nul) ne peut exister 2x dans une copro.
create unique index if not exists uq_bank_mov_copro_ref
  on public.bank_movements (copro_id, bank_ref)
  where bank_ref is not null;

-- bank_matches : un même triplet (mouvement, type, cible) ne peut être pointé 2x.
-- target_id est nullable (cas 'other') -> deux index partiels couvrent NULL et NON-NULL.
create unique index if not exists uq_bank_matches_target_nn
  on public.bank_matches (bank_movement_id, target_type, target_id)
  where target_id is not null;
create unique index if not exists uq_bank_matches_target_null
  on public.bank_matches (bank_movement_id, target_type)
  where target_id is null;


-- ── 3. import_bank_movements : backstop ON CONFLICT (corps 0066 + idempotence base) ─────────
create or replace function public.import_bank_movements(
  p_copro_id   uuid,
  p_period_id  uuid,
  p_account_id uuid,
  p_movements  jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_imported int := 0;
  v_skipped  int := 0;
  v_errors   jsonb := '[]'::jsonb;
  v_acct_ok  boolean;
  v_ref      text;
  v_amount   numeric;
  v_bank_dt  date;
  v_exists   boolean;
  v_new_id   uuid;
  r          jsonb;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  if p_movements is null or jsonb_typeof(p_movements) <> 'array' then
    raise exception 'import_bank_movements: p_movements doit être un tableau jsonb'
      using errcode = '23514';
  end if;

  select exists(
    select 1 from public.accounts where id = p_account_id and copro_id = p_copro_id
  ) into v_acct_ok;
  if not v_acct_ok then
    raise exception 'import_bank_movements: compte % introuvable pour la copro %', p_account_id, p_copro_id
      using errcode = '23503';
  end if;

  for r in select * from jsonb_array_elements(p_movements)
  loop
    v_ref     := nullif(r->>'bank_ref', '');
    v_bank_dt := (r->>'bank_date')::date;
    v_amount  := (r->>'amount_signed')::numeric;

    if v_amount is null or v_bank_dt is null then
      v_errors := v_errors || to_jsonb(format(
        'ligne ignorée (bank_date/amount_signed manquant) : %', r::text));
      continue;
    end if;

    -- Pré-filtre applicatif (skip explicite + comptage précis).
    if v_ref is not null then
      select exists(
        select 1 from public.bank_movements
        where copro_id = p_copro_id and bank_ref = v_ref
      ) into v_exists;
      if v_exists then
        v_skipped := v_skipped + 1;
        continue;
      end if;
    end if;

    -- Backstop idempotent en base : l'index unique partiel garantit l'unicité même en course.
    insert into public.bank_movements
      (copro_id, period_id, account_id, bank_date, value_date, amount_signed, label, bank_ref, status)
    values
      (p_copro_id, p_period_id, p_account_id, v_bank_dt,
       nullif(r->>'value_date','')::date, v_amount, nullif(r->>'label',''), v_ref, 'unmatched')
    on conflict (copro_id, bank_ref) where bank_ref is not null do nothing
    returning id into v_new_id;

    if v_new_id is null then
      v_skipped := v_skipped + 1;   -- course perdue : inséré par une transaction concurrente
    else
      v_imported := v_imported + 1;
    end if;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped', v_skipped, 'errors', v_errors);
end;
$$;
revoke execute on function public.import_bank_movements(uuid, uuid, uuid, jsonb) from public, anon;
grant  execute on function public.import_bank_movements(uuid, uuid, uuid, jsonb) to authenticated, service_role;


-- ── 4. reconcile_bank_movement : insert race-safe + statut via refresh (Option A) ───────────
create or replace function public.reconcile_bank_movement(
  p_copro_id         uuid,
  p_bank_movement_id uuid,
  p_target_type      text,
  p_target_id        uuid,
  p_amount_matched   numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov_copro    uuid;
  v_mov_amount   numeric;
  v_target_copro uuid;
  v_amount       numeric;
  v_match_id     uuid;
  v_type         bank_match_target_type;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  v_type := p_target_type::bank_match_target_type;

  -- 1) Le mouvement existe et appartient à la copro (anti-IDOR).
  select copro_id, amount_signed into v_mov_copro, v_mov_amount
  from public.bank_movements where id = p_bank_movement_id;
  if v_mov_copro is null then
    raise exception 'reconcile_bank_movement: mouvement % introuvable', p_bank_movement_id
      using errcode = '23503';
  end if;
  if v_mov_copro <> p_copro_id then
    raise exception 'forbidden: mouvement % n''appartient pas à la copro %', p_bank_movement_id, p_copro_id
      using errcode = '42501';
  end if;

  -- 2) La cible existe et appartient à la MÊME copro (anti-IDOR). 'other' = pas de FK : skip.
  if v_type = 'payment' then
    select copro_id into v_target_copro from public.payments where id = p_target_id;
  elsif v_type = 'supplier_payment' then
    select copro_id into v_target_copro from public.supplier_payments where id = p_target_id;
  else
    v_target_copro := p_copro_id; -- 'other' : cible libre, pas de table à contrôler.
  end if;

  if v_type in ('payment', 'supplier_payment') then
    if v_target_copro is null then
      raise exception 'reconcile_bank_movement: cible % (%) introuvable', p_target_id, p_target_type
        using errcode = '23503';
    end if;
    if v_target_copro <> p_copro_id then
      raise exception 'forbidden: cible % n''appartient pas à la copro %', p_target_id, p_copro_id
        using errcode = '42501';
    end if;
  end if;

  -- 3) Montant pointé : défaut = valeur absolue du mouvement (ck_match_amount > 0).
  v_amount := round(coalesce(p_amount_matched, abs(v_mov_amount)), 2);
  if v_amount <= 0 then
    raise exception 'reconcile_bank_movement: montant pointé doit être positif (reçu %)', v_amount
      using errcode = '23514';
  end if;

  -- 4) Idempotence : même (mouvement, type, target) déjà pointé -> renvoie le match existant.
  --    INSERT race-safe : en cas de course (unique_violation sur uq_bank_matches_*), on relit.
  select id into v_match_id
  from public.bank_matches
  where bank_movement_id = p_bank_movement_id
    and target_type = v_type
    and target_id is not distinct from p_target_id;

  if v_match_id is null then
    begin
      insert into public.bank_matches
        (copro_id, bank_movement_id, target_type, target_id, amount_matched, matched_by)
      values
        (p_copro_id, p_bank_movement_id, v_type, p_target_id, v_amount, auth.uid())
      returning id into v_match_id;
    exception when unique_violation then
      select id into v_match_id
      from public.bank_matches
      where bank_movement_id = p_bank_movement_id
        and target_type = v_type
        and target_id is not distinct from p_target_id;
    end;
  end if;

  -- 5) Statut recalculé depuis la somme des matches (source unique refresh_bank_movement_status,
  --    0028) : matched ssi Σ amount_matched >= |montant|, sinon 'unmatched'. Gère le pointage
  --    partiel (le mouvement reste 'unmatched' jusqu'au complément). AUCUNE écriture grand livre.
  perform public.refresh_bank_movement_status(p_bank_movement_id);

  return jsonb_build_object(
    'match_id', v_match_id,
    'movement_status', (select status::text from public.bank_movements where id = p_bank_movement_id)
  );
end;
$$;
revoke execute on function public.reconcile_bank_movement(uuid, uuid, text, uuid, numeric) from public, anon;
grant  execute on function public.reconcile_bank_movement(uuid, uuid, text, uuid, numeric) to authenticated, service_role;


-- ── 5. upsert_mutation_notary : find-or-create ATOMIQUE (INSERT ... ON CONFLICT) ────────────
-- Remplace le SELECT-then-INSERT (course 23505 sur uq_tiers_name) par un upsert atomique.
-- Sémantique préservée : coalesce n'efface jamais une valeur existante avec un NULL.
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

  insert into public.tiers (copro_id, name, is_notary, is_active, category, email, office_name, notary_reference)
  values (p_copro_id, btrim(p_name), true, true, 'externe', p_email, p_office_name, p_notary_reference)
  on conflict (copro_id, name) do update
     set is_notary        = true,
         is_active        = true,
         email            = coalesce(excluded.email, public.tiers.email),
         office_name      = coalesce(excluded.office_name, public.tiers.office_name),
         notary_reference = coalesce(excluded.notary_reference, public.tiers.notary_reference)
  returning id into v_id;

  return v_id;
end;
$$;
revoke execute on function public.upsert_mutation_notary(uuid, text, text, text, text) from public, anon;
grant  execute on function public.upsert_mutation_notary(uuid, text, text, text, text) to authenticated, service_role;

-- FIN 0070_bank_idempotence_notary_atomic.sql
