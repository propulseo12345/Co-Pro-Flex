-- 0066_bank_reconcile_rpc.sql — TRANCHE T9 : RAPPROCHEMENT BANCAIRE (voie d'écriture)
-- ============================================================================================
-- BUT : poser les 2 RPC du rapprochement bancaire (import de relevé + pointage), branchées
--       par les edge functions import_bank_movement / reconcile_bank_movement.
--       Ce fichier NE CRÉE QUE des FONCTIONS. AUCUNE table (toutes en 0001→0022 ; tables
--       bank_movements / bank_matches en 0014). AUCUN objet existant recréé ni retouché.
--
-- MODÈLE DE POINTAGE (cascade critique — leçon métier figée) :
--   Le compte 512 (Banque) est DÉJÀ mouvementé À LA SAISIE du paiement :
--     - post_owner_payment (0026) débite 512 à l'encaissement copropriétaire,
--     - post_supplier_payment (0026) crédite 512 au règlement fournisseur.
--   Donc rapprocher un relevé bancaire avec un paiement DÉJÀ saisi = POINTAGE PUR :
--     INSERT dans bank_matches + UPDATE bank_movements.status='matched'.
--     >>> ZÉRO écriture dans le grand livre (aucune ligne ledger_entries / ledger_transactions). <<<
--   Reposter D512/C45x ici DOUBLERAIT l'encaissement (trésorerie + annexes fausses). Interdit.
--   Le cas « encaissement jamais saisi » (sans lot_id ni period_id) est HORS SCOPE de ce payload.
--
-- CONVENTIONS (alignées 0023/0025/0026) :
--   - SECURITY DEFINER + set search_path = public (lookups inter-tables, non soumis à la RLS 0034).
--   - Garde G-MGR sur les 2 RPC : IF NOT is_service_call() AND NOT user_is_copro_manager(copro)
--     THEN RAISE ... errcode 42501 (la branche is_service_call permet import/CI/harnais).
--   - SÉCU anti-IDOR : cohérence des copros des 3 ids (mouvement, target, p_copro_id) vérifiée
--     AVANT toute écriture (un target d'une autre copro est rejeté).
--   - UN SEUL % dans les RAISE/format (jamais %%). errcode : 42501 / 23514 / 23503.
--   - deny-by-default : REVOKE EXECUTE FROM public, anon ; GRANT authenticated, service_role.
--
-- ORDRE DE DÉCLARATION :
--   A. import_bank_movements   (INSERT relevé, skip doublons bank_ref)
--   B. reconcile_bank_movement (pointage pur : INSERT bank_matches + UPDATE status, ZÉRO GL)


-- ============================================================================================
-- A. import_bank_movements(p_copro_id, p_period_id, p_account_id, p_movements jsonb) -> jsonb
-- ============================================================================================
-- INSERT des lignes de relevé (status 'unmatched'). Skip les doublons (même bank_ref NON NULL
--   sur la même copro) sans erreur. Renvoie {imported, skipped, errors}.
-- Garde G-MGR. Vérifie que le compte de trésorerie appartient bien à la copro (anti-IDOR).
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

  -- Le compte de trésorerie doit appartenir à la copro (anti-IDOR sur account_id).
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

    -- Doublon : même bank_ref NON NULL déjà importé sur cette copro -> skip silencieux.
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

    insert into public.bank_movements
      (copro_id, period_id, account_id, bank_date, value_date, amount_signed, label, bank_ref, status)
    values
      (p_copro_id, p_period_id, p_account_id, v_bank_dt,
       nullif(r->>'value_date','')::date, v_amount, nullif(r->>'label',''), v_ref, 'unmatched')
    returning id into v_new_id;

    v_imported := v_imported + 1;
  end loop;

  return jsonb_build_object('imported', v_imported, 'skipped', v_skipped, 'errors', v_errors);
end;
$$;
revoke execute on function public.import_bank_movements(uuid, uuid, uuid, jsonb) from public, anon;
grant  execute on function public.import_bank_movements(uuid, uuid, uuid, jsonb) to authenticated, service_role;


-- ============================================================================================
-- B. reconcile_bank_movement(p_copro_id, p_bank_movement_id, p_target_type, p_target_id,
--                            p_amount_matched) -> jsonb
-- ============================================================================================
-- POINTAGE PUR : rapproche un mouvement bancaire avec un objet DÉJÀ saisi (paiement copro /
--   règlement fournisseur / autre). INSERT bank_matches + UPDATE bank_movements.status='matched'.
--   >>> AUCUNE écriture dans le grand livre <<< (le 512 est déjà mouvementé à la saisie).
-- Renvoie {match_id, movement_status}.
-- SÉCU anti-IDOR : les 3 ids (mouvement, p_copro_id, target) doivent appartenir à la MÊME copro.
-- Idempotence raisonnable : re-pointer le MÊME (mouvement, type, target) ne crée pas de doublon
--   (on renvoie le match existant). Garde G-MGR.
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

  -- target_type valide (cast vers l'enum ; valeur inconnue -> 22P02 remonté tel quel).
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
  select id into v_match_id
  from public.bank_matches
  where bank_movement_id = p_bank_movement_id
    and target_type = v_type
    and target_id is not distinct from p_target_id;

  if v_match_id is null then
    -- POINTAGE PUR — INSERT bank_matches. AUCUNE écriture grand livre ici.
    insert into public.bank_matches
      (copro_id, bank_movement_id, target_type, target_id, amount_matched, matched_by)
    values
      (p_copro_id, p_bank_movement_id, v_type, p_target_id, v_amount, auth.uid())
    returning id into v_match_id;
  end if;

  -- 5) Le mouvement passe à 'matched' (pointé).
  update public.bank_movements
     set status = 'matched'
   where id = p_bank_movement_id and status <> 'matched';

  return jsonb_build_object(
    'match_id', v_match_id,
    'movement_status', (select status::text from public.bank_movements where id = p_bank_movement_id)
  );
end;
$$;
revoke execute on function public.reconcile_bank_movement(uuid, uuid, text, uuid, numeric) from public, anon;
grant  execute on function public.reconcile_bank_movement(uuid, uuid, text, uuid, numeric) to authenticated, service_role;
