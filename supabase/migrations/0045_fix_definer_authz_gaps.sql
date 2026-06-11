-- 0045_fix_definer_authz_gaps.sql — FERMETURE DE 7 FUITES CROSS-TENANT (J1 / B1 sécurité)
-- ============================================================================================
-- Découvert par audit adversarial RLS (workflow ultracode, 2026-06-10).
--
-- MÉCANISME COMMUN (une seule classe de défaut) : 7 fonctions `SECURITY DEFINER` — qui tournent
--   en tant que propriétaire (postgres) et CONTOURNENT donc la RLS par conception — sont exposées
--   en `grant execute … to authenticated` SANS garde interne d'autorisation. La RLS (seule barrière
--   inter-cabinet, via user_has_copro_access / user_is_copro_manager → profiles.cabinet_id =
--   copros.cabinet_id) ne s'applique pas à l'intérieur de ces fonctions. → IDOR : un utilisateur
--   connecté du cabinet A peut lire des données du cabinet B en fournissant l'ID d'un objet de B.
--
-- CORRECTIF (identique partout) : on `create or replace` les 7 fonctions en ajoutant en tête la
--   garde canonique G-MGR/G-ACCESS du projet (cf. 0023/0025/0026) :
--     if not public.is_service_call() and not public.user_has_copro_access(<copro>) then
--       raise exception '…' using errcode = '42501'; end if;
--   - copro_id DÉRIVÉ de l'objet passé en paramètre quand il n'est pas direct (clé/facture) ;
--   - `user_has_copro_access` pour les helpers de LECTURE (le leak « A lit B » est déjà fermé :
--     A n'a pas accès à B) ; `user_is_copro_manager` pour les données back-office/financières
--     réservées gestionnaire (montants fournisseurs, n° d'ordre de service) ;
--   - 3 fonctions à corps SQL mono-instruction converties en plpgsql pour héberger la garde.
--
-- TRANSPARENCE POUR LES FLUX LÉGITIMES :
--   - appels machine (seed, harnais, import) : `is_service_call()` = true → garde franchie ;
--   - gestionnaire/copropriétaire sur SA copro : user_has_copro_access/manager = true → franchie ;
--   - appelants internes (posteurs déjà gardés sur la MÊME copro, triggers fournisseurs) : le
--     contexte JWT est conservé → la garde ré-évaluée passe pour le même tenant.
--   Aucune signature/aucun type de retour modifié → contrats PostgREST inchangés.
--
-- Preuve : gate `gate_rls_definer_guards.sql` (cabinet A reçoit 42501 sur les 7 RPC avec un objet
--   du cabinet B, et réussit sur les siens).

-- ============================================================================================
-- 1. compute_repartition_shares(key_id) — MEDIUM — ventilation des tantièmes (lecture)
--    SQL → plpgsql. copro_id dérivé de la clé. Garde : accès copro.
-- ============================================================================================
create or replace function public.compute_repartition_shares(p_key_id uuid)
returns table (
  lot_id    uuid,
  weight    numeric,
  share_pct numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_copro uuid;
begin
  select copro_id into v_copro from public.repartition_keys where id = p_key_id;
  if not public.is_service_call() and not public.user_has_copro_access(v_copro) then
    raise exception 'forbidden: accès copro requis (compute_repartition_shares)' using errcode = '42501';
  end if;

  return query
  with k as (
    select coalesce(sum(weight), 0) as total_weight
    from public.repartition_key_lines
    where key_id = p_key_id
  )
  select
    rkl.lot_id,
    rkl.weight,
    case when k.total_weight > 0
      then round(rkl.weight * 100.0 / k.total_weight, 6)
      else 0
    end as share_pct
  from public.repartition_key_lines rkl
  cross join k
  where rkl.key_id = p_key_id;
end;
$$;
revoke execute on function public.compute_repartition_shares(uuid) from public, anon;
grant execute on function public.compute_repartition_shares(uuid) to authenticated, service_role;

-- ============================================================================================
-- 2. get_supplier_invoice_paid_amount(invoice_id) — MEDIUM — montant payé (financier)
--    SQL → plpgsql. copro_id dérivé de la facture. Garde : gestionnaire.
-- ============================================================================================
create or replace function public.get_supplier_invoice_paid_amount(p_invoice_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro uuid;
begin
  select copro_id into v_copro from public.supplier_invoices where id = p_invoice_id;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis (get_supplier_invoice_paid_amount)' using errcode = '42501';
  end if;

  return coalesce((
    select sum(amount)
    from public.supplier_payments
    where supplier_invoice_id = p_invoice_id
  ), 0);
end;
$$;
revoke execute on function public.get_supplier_invoice_paid_amount(uuid) from public, anon;
grant execute on function public.get_supplier_invoice_paid_amount(uuid) to authenticated, service_role;

-- ============================================================================================
-- 3. supplier_invoice_net_payable(invoice_id) — MEDIUM — reste à payer (financier)
--    SQL → plpgsql. copro_id dérivé de la facture. Garde : gestionnaire.
--    NB : aussi appelée par les triggers fournisseurs (contexte JWT conservé → garde franchie
--    pour le gestionnaire agissant sur SA facture, ou is_service_call en machine).
-- ============================================================================================
create or replace function public.supplier_invoice_net_payable(p_invoice_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro uuid;
begin
  select copro_id into v_copro from public.supplier_invoices where id = p_invoice_id;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis (supplier_invoice_net_payable)' using errcode = '42501';
  end if;

  return (
    select si.total_amount
         - coalesce((select sum(cn.total_amount) from public.supplier_invoices cn
                     where cn.original_invoice_id = si.id and cn.doc_kind = 'credit_note' and cn.status = 'posted'), 0)
    from public.supplier_invoices si where si.id = p_invoice_id
  );
end;
$$;
revoke execute on function public.supplier_invoice_net_payable(uuid) from public, anon;
grant  execute on function public.supplier_invoice_net_payable(uuid) to authenticated, service_role;

-- ============================================================================================
-- 4. resolve_lot_tiers_account(copro_id, nature) — LOW — résolution compte 450-x (oracle)
--    Déjà plpgsql. copro_id direct. Garde : accès copro (helper de posting).
-- ============================================================================================
create or replace function public.resolve_lot_tiers_account(p_copro_id uuid, p_nature text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code       text;
  v_account_id uuid;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: accès copro requis (resolve_lot_tiers_account)' using errcode = '42501';
  end if;

  v_code := case lower(p_nature)
    when 'current' then '450-1'   -- budget prévisionnel courant
    when 'works'   then '450-2'   -- travaux art. 14-2
    when 'advance' then '450-3'   -- avances
    when 'loan'    then '450-4'   -- emprunts
    when 'alur'    then '450-5'   -- fonds de travaux ALUR
    else null
  end;

  if v_code is null then
    raise exception 'resolve_lot_tiers_account: nature inconnue "%" (attendu: current|works|advance|loan|alur)', p_nature;
  end if;

  select id into v_account_id
  from public.accounts
  where copro_id = p_copro_id and code = v_code;

  if v_account_id is null then
    raise exception 'resolve_lot_tiers_account: sous-compte % introuvable pour la copro % (à provisionner avant tout appel/paiement)', v_code, p_copro_id;
  end if;

  return v_account_id;
end;
$$;
revoke execute on function public.resolve_lot_tiers_account(uuid, text) from public, anon;
grant execute on function public.resolve_lot_tiers_account(uuid, text) to authenticated, service_role;

-- ============================================================================================
-- 5. get_period_for_date(copro_id, date) — LOW — exercice couvrant une date (oracle)
--    Déjà plpgsql. copro_id direct. Garde : accès copro. NULL légitime conservé.
-- ============================================================================================
create or replace function public.get_period_for_date(p_copro_id uuid, p_date date)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period_id uuid;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: accès copro requis (get_period_for_date)' using errcode = '42501';
  end if;

  select ap.id into v_period_id
  from public.accounting_periods ap
  where ap.copro_id = p_copro_id
    and p_date between ap.start_date and ap.end_date
  order by ap.start_date desc
  limit 1;

  return v_period_id;
end;
$$;
revoke execute on function public.get_period_for_date(uuid, date) from public, anon;
grant execute on function public.get_period_for_date(uuid, date) to authenticated, service_role;

-- ============================================================================================
-- 6. repartition_key_is_complete(key_id) — LOW — booléen complétude clé (oracle)
--    Déjà plpgsql. copro_id dérivé de la clé. Garde : accès copro (après lookup).
-- ============================================================================================
create or replace function public.repartition_key_is_complete(p_key_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key     record;
  v_missing integer;
begin
  select * into v_key from public.repartition_keys where id = p_key_id;
  if not found then
    return false;
  end if;

  if not public.is_service_call() and not public.user_has_copro_access(v_key.copro_id) then
    raise exception 'forbidden: accès copro requis (repartition_key_is_complete)' using errcode = '42501';
  end if;

  if v_key.coverage_mode = 'subset' then
    return exists (
      select 1 from public.repartition_key_lines
      where key_id = p_key_id and weight > 0
    );
  end if;

  select count(*) into v_missing
  from public.lots l
  where l.copro_id = v_key.copro_id
    and not exists (
      select 1 from public.repartition_key_lines rkl
      where rkl.key_id = p_key_id and rkl.lot_id = l.id and rkl.weight > 0
    );

  return v_missing = 0;
end;
$$;
revoke execute on function public.repartition_key_is_complete(uuid) from public, anon;
grant execute on function public.repartition_key_is_complete(uuid) to authenticated, service_role;

-- ============================================================================================
-- 7. generate_service_order_number(copro_id) — LOW — séquence n° OS (compteur)
--    Déjà plpgsql. copro_id direct. Garde : gestionnaire (cohérent avec les RPC sœurs 0032).
-- ============================================================================================
create or replace function public.generate_service_order_number(p_copro_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_year text := to_char(current_date, 'YYYY'); v_seq int;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis (generate_service_order_number)' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_copro_id::text));
  select coalesce(max(substring(order_number from '(\d+)$')::int), 0) + 1
    into v_seq
  from public.service_orders
  where copro_id = p_copro_id and order_number like 'OS-' || v_year || '-%';
  return 'OS-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end; $$;
revoke execute on function public.generate_service_order_number(uuid) from public, anon;
grant  execute on function public.generate_service_order_number(uuid) to authenticated, service_role;
