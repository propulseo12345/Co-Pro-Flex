-- ============================================================================
-- 0047 — Vues d'agrégat MAINTENANCE + KPIs portefeuille (drift hors-finance, lot 1)
-- ============================================================================
-- Recrée les 8 vues que le front consomme (useProvidersHubPage, useContractDetailPage,
-- useLogbook, useServiceOrders*, useMaintenanceData, usePortefeuille), perdues à la
-- re-baseline. Philosophie : VUES DE COMPATIBILITÉ — le contrat de colonnes est celui
-- contre lequel le front a été compilé (ancien src/types/supabase.ts, commit 5c8209e),
-- PAS le SQL du commit initial (les vues avaient évolué ensuite sur l'ancien cloud :
-- + address/postal_code/contact_role prestataires, + provider_email/phone et
-- accepted_at sur les OS, vues *_alerts refondues en « overview filtrée + alert_level/
-- is_overdue »). Correspondances schéma cible :
--   providers                  -> tiers (is_provider = true)
--   provider_id                -> tiers_id
--   providers.category 'coproflex' -> tiers_category 'externe' (mappé en LECTURE pour
--     conserver le tri par onglets du hub prestataires)
--   providers.domains          -> work_domain.slug[] (via tiers.domain_ids)
--   contracts.title            -> contracts.label
--   contracts.contract_number  -> contracts.reference
--   contracts.contract_type    -> work_domain.slug (via domain_id)
--   contracts.description      -> contracts.observations
--   service_orders.subject     -> service_orders.title
--   service_orders.planned_intervention_date -> scheduled_at
--   service_orders.accepted_at -> acknowledged_at
--   service_orders.supplier_invoice_id -> FK INVERSÉE : dernière
--     supplier_invoices.service_order_id (lateral, la plus récente)
--   coproflex_label            -> false (champ marketplace dé-scopé du blueprint)
-- Toutes les vues : security_invoker = true (héritent la RLS 0034, pattern 0036).
--
-- + Extension de l'enum ag_draft_type : le front (draft-persistence.ts) persiste
-- 7 types de brouillon AG que la re-baseline avait perdus (roles, session,
-- variables, resolution_vars, signataires, resolutions_results,
-- resolutions_passerelles). Sans eux, save_ag_session_draft rejette la valeur et
-- le front retombe silencieusement sur localStorage (perte de persistance DB).
-- ============================================================================

alter type public.ag_draft_type add value if not exists 'roles';
alter type public.ag_draft_type add value if not exists 'session';
alter type public.ag_draft_type add value if not exists 'variables';
alter type public.ag_draft_type add value if not exists 'resolution_vars';
alter type public.ag_draft_type add value if not exists 'signataires';
alter type public.ag_draft_type add value if not exists 'resolutions_results';
alter type public.ag_draft_type add value if not exists 'resolutions_passerelles';

-- ----------------------------------------------------------------------------
-- Vue 1 : synthèse prestataires
-- ----------------------------------------------------------------------------
create or replace view public.v_providers_overview
with (security_invoker = true) as
select
  t.id,
  t.copro_id,
  t.name,
  case when t.category = 'externe' then 'coproflex' else t.category::text end as category,
  coalesce(
    (select array_agg(wd.slug order by wd.sort_order)
       from public.work_domain wd
      where wd.id = any(t.domain_ids)),
    '{}'::text[]
  ) as domains,
  t.contact_name,
  t.contact_role,
  t.email,
  t.phone,
  t.phone_emergency,
  t.address,
  t.postal_code,
  t.city,
  t.siret,
  t.rating_avg,
  t.rating_count,
  t.interventions_count,
  t.last_intervention_at,
  false as coproflex_label,
  t.is_active,
  t.created_at,
  -- 'to_renew' = contrat toujours en vigueur (le trigger métier y bascule dès
  -- la fenêtre de préavis) : il reste compté comme actif.
  (select count(*)
     from public.contracts c
    where c.tiers_id = t.id and c.status in ('active', 'to_renew')) as active_contracts_count,
  (select count(*)
     from public.service_orders so
    where so.tiers_id = t.id and so.status not in ('closed', 'cancelled')) as pending_orders_count
from public.tiers t
where t.is_provider = true;

comment on view public.v_providers_overview is
  'Vue synthétique des prestataires (tiers is_provider) avec statistiques — contrat de colonnes compatible front (ex-table providers, category externe exposée ''coproflex'').';

-- ----------------------------------------------------------------------------
-- Vue 2 : synthèse contrats
-- ----------------------------------------------------------------------------
create or replace view public.v_contracts_overview
with (security_invoker = true) as
select
  c.id,
  c.copro_id,
  c.tiers_id as provider_id,
  t.name as provider_name,
  c.reference as contract_number,
  wd.slug as contract_type,
  c.label as title,
  c.observations as description,
  c.start_date,
  c.end_date,
  c.renewal_date,
  c.tacit_renewal,
  c.notice_months,
  c.annual_amount,
  c.status,
  c.is_regulatory,
  c.created_at,
  c.end_date - current_date as days_remaining,
  -- NB : un trigger métier bascule status -> 'to_renew' dès la fenêtre de préavis ;
  -- l'alerte doit donc couvrir 'active' ET 'to_renew'.
  case
    when c.status in ('active', 'to_renew') and c.end_date is not null
         and c.end_date - current_date <= coalesce(c.notice_months, 0) * 30 then true
    else false
  end as renewal_alert,
  (select count(*)
     from public.logbook_entries le
    where le.contract_id = c.id) as interventions_count,
  (select count(*)
     from public.service_orders so
    where so.contract_id = c.id) as orders_count
from public.contracts c
-- LEFT join : contracts est en lecture COLLECTIVE (RLS 0034) mais tiers est
-- manager-only — un INNER join ferait disparaître la ligne entière pour un
-- copropriétaire (revue adversariale 2026-06-11). provider_name nullable.
left join public.tiers t on t.id = c.tiers_id
left join public.work_domain wd on wd.id = c.domain_id;

comment on view public.v_contracts_overview is
  'Vue synthétique des contrats avec alertes renouvellement — colonnes compat (title<-label, contract_number<-reference, contract_type<-work_domain.slug, description<-observations).';

-- ----------------------------------------------------------------------------
-- Vue 3 : alertes contrats (= overview filtrée + alert_level)
-- ----------------------------------------------------------------------------
create or replace view public.v_contracts_alerts
with (security_invoker = true) as
select
  o.*,
  case
    when o.status = 'expired' or (o.days_remaining is not null and o.days_remaining < 0) then 'critical'
    when o.status = 'to_renew' or o.renewal_alert
         or (o.days_remaining is not null and o.days_remaining <= 30) then 'warning'
    else 'info'
  end as alert_level
from public.v_contracts_overview o
where o.status in ('active', 'to_renew', 'expired')
  and o.end_date is not null
  and o.end_date <= current_date + 180;

comment on view public.v_contracts_alerts is
  'Alertes contrats (fenêtre 180 jours) : v_contracts_overview filtrée + alert_level (critical/warning/info).';

-- ----------------------------------------------------------------------------
-- Vue 4 : carnet d'entretien
-- ----------------------------------------------------------------------------
create or replace view public.v_logbook_overview
with (security_invoker = true) as
select
  le.id,
  le.copro_id,
  le.building_id,
  b.name as building_name,
  le.entry_type,
  le.category,
  le.title,
  le.description,
  le.equipment_concerned,
  le.tiers_id as provider_id,
  coalesce(t.name, le.provider_name_snapshot) as provider_name,
  le.contract_id,
  c.label as contract_title,
  le.service_order_id,
  so.order_number,
  wd.slug as domain,
  le.budget_category,
  le.happened_at,
  le.completed_at,
  le.next_due_at,
  le.cost,
  le.status,
  le.document_id,
  le.comments,
  le.created_at,
  case
    when le.next_due_at is not null then le.next_due_at - current_date
    else null
  end as days_to_next_due,
  case
    when le.next_due_at is not null and le.next_due_at <= current_date + 7 then true
    else false
  end as due_alert,
  case
    when le.next_due_at is not null and le.next_due_at < current_date
         and le.status <> 'terminee' then true
    else false
  end as is_overdue
from public.logbook_entries le
left join public.buildings b on b.id = le.building_id
left join public.tiers t on t.id = le.tiers_id
left join public.contracts c on c.id = le.contract_id
left join public.service_orders so on so.id = le.service_order_id
left join public.work_domain wd on wd.id = le.domain_id;

comment on view public.v_logbook_overview is
  'Vue du carnet d''entretien avec relations — colonnes compat (provider_*<-tiers, domain<-work_domain.slug) + is_overdue.';

-- ----------------------------------------------------------------------------
-- Vue 5 : alertes carnet (= overview filtrée, même contrat de colonnes)
-- ----------------------------------------------------------------------------
create or replace view public.v_logbook_alerts
with (security_invoker = true) as
select o.*
from public.v_logbook_overview o
where o.next_due_at is not null
  and o.next_due_at <= current_date + 30
  and o.status <> 'terminee';

comment on view public.v_logbook_alerts is
  'Alertes carnet d''entretien (échéances à 30 jours, non terminées) : v_logbook_overview filtrée.';

-- ----------------------------------------------------------------------------
-- Vue 6 : ordres de service
-- ----------------------------------------------------------------------------
create or replace view public.v_service_orders_overview
with (security_invoker = true) as
select
  so.id,
  so.copro_id,
  so.building_id,
  b.name as building_name,
  so.lot_id,
  l.ref as lot_ref,
  so.order_number,
  so.tiers_id as provider_id,
  t.name as provider_name,
  t.email as provider_email,
  t.phone as provider_phone,
  so.order_type,
  so.origin,
  so.contract_id,
  c.label as contract_title,
  so.title as subject,
  so.description,
  so.urgency,
  so.is_art18_emergency,
  so.scheduled_at as planned_intervention_date,
  so.estimated_amount,
  so.quoted_amount,
  so.actual_amount,
  so.status,
  so.created_at,
  so.created_by,
  so.sent_at,
  so.acknowledged_at as accepted_at,
  so.completed_at,
  so.closed_at,
  si.id as supplier_invoice_id,
  si.invoice_number,
  si.total_amount as invoice_amount,
  current_date - so.created_at::date as days_since_creation,
  0 as documents_count,
  (select count(*)
     from public.service_order_events soe
    where soe.service_order_id = so.id) as events_count,
  -- Cumul facturé de l'OS : un OS peut porter plusieurs factures (acompte/
  -- situations/solde) + avoirs — l'écart vs estimé doit raisonner sur le cumul.
  (select count(*)
     from public.supplier_invoices si3
    where si3.service_order_id = so.id
      and si3.doc_kind = 'invoice' and si3.status in ('posted', 'paid')) as invoices_count,
  coalesce((
    select sum(case when si3.doc_kind = 'invoice' then si3.total_amount else -si3.total_amount end)
      from public.supplier_invoices si3
     where si3.service_order_id = so.id and si3.status in ('posted', 'paid')
  ), 0) as invoiced_total
from public.service_orders so
left join public.buildings b on b.id = so.building_id
left join public.lots l on l.id = so.lot_id
join public.tiers t on t.id = so.tiers_id
left join public.contracts c on c.id = so.contract_id
-- « Dernière facture » = la plus récente PAR DATE DE FACTURE, postée ou payée
-- uniquement (un brouillon ou une facture annulée ne doit jamais masquer un
-- acompte posté au GL — revue adversariale 2026-06-11) ; id en tiebreaker.
left join lateral (
  select si2.id, si2.invoice_number, si2.total_amount
    from public.supplier_invoices si2
   where si2.service_order_id = so.id
     and si2.doc_kind = 'invoice'
     and si2.status in ('posted', 'paid')
   order by si2.invoice_date desc, si2.created_at desc, si2.id desc
   limit 1
) si on true;

comment on view public.v_service_orders_overview is
  'Vue synthétique des ordres de service — colonnes compat (subject<-title, planned_intervention_date<-scheduled_at, accepted_at<-acknowledged_at, supplier_invoice_id<-FK inversée, dernière facture liée).';

-- ----------------------------------------------------------------------------
-- Vue 7 : statistiques maintenance par copro
-- ----------------------------------------------------------------------------
create or replace view public.v_maintenance_stats
with (security_invoker = true) as
select
  co.id as copro_id,
  co.name as copro_name,
  (select count(*) from public.tiers t
    where t.copro_id = co.id and t.is_provider and t.is_active) as active_providers_count,
  -- 'to_renew' reste un contrat en vigueur (trigger métier) : compté actif,
  -- et son montant annuel reste dans le total.
  (select count(*) from public.contracts c
    where c.copro_id = co.id and c.status in ('active', 'to_renew')) as active_contracts_count,
  (select count(*) from public.contracts c
    where c.copro_id = co.id and c.status = 'to_renew') as contracts_to_renew_count,
  (select coalesce(sum(c.annual_amount), 0) from public.contracts c
    where c.copro_id = co.id and c.status in ('active', 'to_renew')) as contracts_annual_total,
  (select count(*) from public.service_orders so
    where so.copro_id = co.id and so.status not in ('closed', 'cancelled')) as pending_orders_count,
  (select count(*) from public.service_orders so
    where so.copro_id = co.id and so.urgency in ('high', 'critical')
      and so.status not in ('closed', 'cancelled')) as urgent_orders_count,
  (select count(*) from public.logbook_entries le
    where le.copro_id = co.id) as logbook_entries_count,
  (select coalesce(sum(le.cost), 0) from public.logbook_entries le
    where le.copro_id = co.id
      and le.happened_at >= date_trunc('year', current_date)) as maintenance_cost_ytd
from public.copros co;

comment on view public.v_maintenance_stats is
  'Statistiques de maintenance par copropriété. ⚠️ Fiable UNIQUEMENT pour un gestionnaire : en security_invoker, un copropriétaire obtiendrait des compteurs partiels (tables manager-only filtrées par la RLS) présentés comme des totaux. Ne PAS réutiliser pour le portail copropriétaire sans trancher la politique RLS.';

-- ----------------------------------------------------------------------------
-- Vue 8 : KPIs portefeuille (1 ligne par copro)
-- ----------------------------------------------------------------------------
-- Le front portefeuille (usePortefeuille) attend une vue multi-copros ; la
-- fonction canonique fn_dashboard_kpis (0028) est mono-copro + période. Cette
-- vue réplique les MÊMES règles comptables (512 hors 5121 ; impayés échus via
-- v_unpaid_by_lot, vue canonique lot-centric) en security_invoker : la RLS de
-- 0034 filtre les copros — pas besoin de garde applicative.
create or replace view public.v_dashboard_kpis
with (security_invoker = true) as
select
  co.id as copro_id,
  -- Trésorerie courante : solde réel cumulé des 512 (hors 5121 travaux), GL posté.
  coalesce((
    select sum(case when e.direction = 'debit' then e.amount else -e.amount end)
      from public.ledger_entries e
      join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
      join public.accounts a            on a.id = e.account_id
     where e.copro_id = co.id and a.code like '512%' and a.code not like '5121%'
  ), 0) as current_balance,
  -- Impayé échu total (vue canonique lot-centric).
  coalesce((
    select sum(u.total_unpaid)
      from public.v_unpaid_by_lot u
     where u.copro_id = co.id
  ), 0) as unpaid_total,
  -- Nombre de lots en impayé.
  coalesce((
    select count(*)
      from public.v_unpaid_by_lot u
     where u.copro_id = co.id and u.total_unpaid > 0
  ), 0) as critical_unpaid_count,
  next_ag.id   as next_ag_id,
  next_ag.title as next_ag_title,
  next_ag.meeting_date as next_ag_date
from public.copros co
left join lateral (
  select m.id, m.title, m.meeting_date
    from public.ag_meetings m
   where m.copro_id = co.id
     and m.meeting_date >= current_date
     and m.status in ('draft', 'convoked')
   order by m.meeting_date asc
   limit 1
) next_ag on true;

comment on view public.v_dashboard_kpis is
  'KPIs portefeuille par copro (trésorerie 512 hors travaux, impayés échus lot-centric, prochaine AG) — mêmes règles que fn_dashboard_kpis (0028). ⚠️ Fiable UNIQUEMENT pour un gestionnaire : en security_invoker, un copropriétaire verrait des montants partiels (sa seule dette, trésorerie 0) présentés comme des totaux copro. Ne PAS réutiliser pour le portail copropriétaire sans trancher la politique RLS.';
