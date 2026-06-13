-- ============================================================================
-- 0054 — Mutations + Dashboard (J2-bis lot 6) : 4 vues d'agrégat manquantes
-- ----------------------------------------------------------------------------
-- Écrans câblés Supabase mais interrogeant des vues ABSENTES de la base cible :
--   * features/ventes (mutationsApi) + lib/sales/api → v_mutations_overview,
--     v_etat_date_latest (liste des mutations + états datés)
--   * lib/dashboard/api → v_dashboard_recent_activity, v_dashboard_todos
--     (widgets « activité récente » et « à faire » du tableau de bord)
-- Vues de compat au contrat 5c8209e, portées depuis les définitions legacy
-- (migrations_legacy/) en CANONISANT les colonnes qui ont changé :
--   lots.tantiemes_generaux → v_lots_with_owners ; mutations.notary_* →
--   tiers via notaire_id ; mutations.buyer_name → coproprietaires via
--   buyer_owner_id ; payments.created_at → payment_date ; service_orders.subject
--   → title ; contracts.title → label ; supplier_invoices CASE aux statuts réels.
-- security_invoker = true : la RLS de chaque table source s'applique (un membre
-- ne voit que les lignes de SES copros).
-- NB périmètre : ceci câble la LECTURE (les écrans ne plantent plus). Le workflow
-- d'écriture des mutations (createMutation sur l'ancien modèle, opposition art.20)
-- reste J9.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. v_mutations_overview — liste enrichie des mutations (27 col, contrat 5c8209e)
-- ----------------------------------------------------------------------------
create or replace view public.v_mutations_overview
with (security_invoker = true) as
select
  m.id,
  m.copro_id,
  m.lot_id,
  lo.ref                                   as lot_ref,
  lo.type                                  as lot_type,
  lo.tantiemes_generaux,
  lo.building_id,
  lo.floor,
  m.status,
  m.mutation_type,
  -- Vendeur (dérivé : coproprietaires via seller_owner_id)
  m.seller_owner_id,
  coalesce(
    case when cs.is_company then cs.company_name
         else nullif(trim(concat(cs.first_name, ' ', cs.last_name)), '') end,
    'Inconnu'
  )                                        as seller_name,
  cs.email                                 as seller_email,
  -- Acheteur (dérivé : coproprietaires via buyer_owner_id ; NULL avant validation)
  m.buyer_owner_id,
  case when cb.is_company then cb.company_name
       else nullif(trim(concat(cb.first_name, ' ', cb.last_name)), '') end
                                           as buyer_name,
  cb.email                                 as buyer_email,
  -- Notaire (dérivé : tiers via notaire_id)
  tn.name                                  as notary_name,
  tn.email                                 as notary_email,
  m.requested_at,
  m.signature_date,
  m.effective_date,
  m.notes,
  m.created_at,
  m.updated_at,
  -- Jours restants pour le pré-état daté (échéance 15 j après notification),
  -- seulement tant que la mutation est au stade « notifiée » (draft)
  case
    when m.status = 'draft' and m.requested_at is not null
    then 15 - (current_date - m.requested_at::date)
    else null
  end                                      as days_until_pre_etat_deadline,
  exists (
    select 1 from public.etat_date_snapshots eds
    where eds.mutation_id = m.id and eds.snapshot_type = 'pre'
  )                                        as has_pre_etat,
  exists (
    select 1 from public.etat_date_snapshots eds
    where eds.mutation_id = m.id and eds.snapshot_type = 'final'
  )                                        as has_final_etat
from public.mutations m
left join public.v_lots_with_owners lo on lo.id = m.lot_id
left join public.coproprietaires cs     on cs.id = m.seller_owner_id
left join public.coproprietaires cb     on cb.id = m.buyer_owner_id
left join public.tiers tn               on tn.id = m.notaire_id;

comment on view public.v_mutations_overview is
  'Mutations enrichies (compat 5c8209e) : vendeur/acheteur dérivés de coproprietaires, notaire de tiers, lot de v_lots_with_owners, échéance pré-état 15 j. Lecture seule — workflow d''écriture en J9.';

-- ----------------------------------------------------------------------------
-- 2. v_etat_date_latest — états datés générés d'une mutation (11 col)
-- ----------------------------------------------------------------------------
create or replace view public.v_etat_date_latest
with (security_invoker = true) as
select
  eds.id,
  eds.copro_id,
  eds.mutation_id,
  eds.lot_id,
  eds.snapshot_type,
  eds.generated_at,
  eds.generated_by,
  eds.payload,
  eds.document_id,
  l.ref                                    as lot_ref,
  m.status                                 as mutation_status
from public.etat_date_snapshots eds
join public.mutations m on m.id = eds.mutation_id
left join public.lots l on l.id = eds.lot_id;

comment on view public.v_etat_date_latest is
  'États datés générés (compat 5c8209e) ; le front trie par generated_at desc.';

-- ----------------------------------------------------------------------------
-- 3. v_dashboard_recent_activity — activité récente multi-sources (5 col)
--    (le front ORDER BY event_date desc + LIMIT)
-- ----------------------------------------------------------------------------
create or replace view public.v_dashboard_recent_activity
with (security_invoker = true) as
  -- AG
  select am.copro_id, 'AG' as activity_type,
    case
      when am.status = 'draft'    then 'AG en préparation: ' || am.title
      when am.status = 'convoked' then 'Convocations envoyées: ' || am.title
      when am.status = 'closed'   then 'AG clôturée: ' || am.title
      else 'AG mise à jour: ' || am.title
    end as label,
    am.updated_at as event_date, '/ag/dashboard' as deep_link
  from public.ag_meetings am
  where am.updated_at is not null
union all
  -- Paiements reçus (canonique : payment_date, pas created_at)
  select p.copro_id, 'FINANCE',
    'Paiement reçu: ' || p.amount::text || ' € (Lot ' || coalesce(l.ref, '?') || ')',
    p.payment_date, '/finance/calls'
  from public.payments p
  left join public.lots l on l.id = p.lot_id
union all
  -- Appels de fonds émis
  select cf.copro_id, 'FINANCE', 'Appel émis: ' || cf.label,
    coalesce(cf.issued_at, cf.created_at), '/finance/calls'
  from public.call_for_funds cf
  where cf.status <> 'draft'
union all
  -- Factures fournisseurs (enum canonique : draft, posted, paid, cancelled)
  select si.copro_id, 'FINANCE',
    case
      when si.status = 'posted' then 'Facture comptabilisée: ' || si.label
      when si.status = 'paid'   then 'Facture payée: ' || si.label
      else 'Facture mise à jour: ' || si.label
    end,
    si.created_at, '/finance/invoices'
  from public.supplier_invoices si
  where si.status <> 'draft'
union all
  -- Ordres de service (canonique : title, pas subject)
  select so.copro_id, 'MAINT',
    case
      when so.status = 'sent'      then 'OS envoyé: ' || so.title
      when so.status = 'completed' then 'Intervention terminée: ' || so.title
      when so.status = 'closed'    then 'OS clôturé: ' || so.title
      else 'OS mis à jour: ' || so.title
    end,
    so.updated_at, '/maintenance/service-orders'
  from public.service_orders so
  where so.status not in ('draft', 'cancelled')
union all
  -- Carnet d'entretien
  select le.copro_id, 'MAINT',
    case le.entry_type
      when 'controle'     then 'Contrôle effectué: ' || le.title
      when 'maintenance'  then 'Entretien réalisé: ' || le.title
      when 'incident'     then 'Incident signalé: ' || le.title
      when 'intervention' then 'Intervention réalisée: ' || le.title
      else 'Carnet: ' || le.title
    end,
    le.created_at, '/maintenance/logbook'
  from public.logbook_entries le
union all
  -- Documents (title nullable, contrairement aux autres sources → fallback file_name)
  select d.copro_id, 'DOC', 'Document ajouté: ' || coalesce(d.title, d.file_name),
    d.created_at, '/documents'
  from public.documents d
  where d.status = 'active';

comment on view public.v_dashboard_recent_activity is
  'Activité récente multi-sources (compat 5c8209e ; le front limite à ~20).';

-- ----------------------------------------------------------------------------
-- 4. v_dashboard_todos — tâches/alertes agrégées (6 col)
--    priority: 1=critique, 2=warning, 3=info ; le front trie + limite
-- ----------------------------------------------------------------------------
create or replace view public.v_dashboard_todos
with (security_invoker = true) as
  -- CRITIQUE : impayés > 60 jours
  select u.copro_id,
    (select count(*) from public.v_unpaid_by_lot u2
      where u2.copro_id = u.copro_id and u2.days_overdue > 60)::text
      || ' impayés > 60 jours' as label,
    1 as priority, '/finance/unpaid' as deep_link,
    min(u.oldest_due_date)::date as due_date, 'unpaid_critical' as todo_type
  from public.v_unpaid_by_lot u
  where u.days_overdue > 60
  group by u.copro_id
union all
  -- WARNING : AG en brouillon à finaliser
  select am.copro_id,
    case
      when (select count(*) from public.ag_meetings am2
              where am2.copro_id = am.copro_id and am2.status = 'draft') = 1
      then 'AG en brouillon à finaliser'
      else (select count(*) from public.ag_meetings am2
              where am2.copro_id = am.copro_id and am2.status = 'draft')::text
        || ' AG en brouillon'
    end,
    2, '/ag/dashboard', min(am.meeting_date::date), 'ag_draft'
  from public.ag_meetings am
  where am.status = 'draft'
  group by am.copro_id
union all
  -- WARNING : mouvements bancaires non catégorisés
  select bm.copro_id,
    (select count(*) from public.bank_movements bm2
      where bm2.copro_id = bm.copro_id and bm2.status = 'unmatched')::text
      || ' mouvements bancaires à catégoriser',
    2, '/finance/bank-movements', null::date, 'bank_unmatched'
  from public.bank_movements bm
  where bm.status = 'unmatched'
  group by bm.copro_id
union all
  -- INFO : contrats à renouveler (30 j) — canonique : label, pas title
  select ct.copro_id, 'Contrat à renouveler: ' || ct.label,
    3, '/maintenance/contracts', ct.end_date, 'contract_renewal'
  from public.contracts ct
  where ct.status in ('active', 'to_renew')
    and ct.end_date <= current_date + interval '30 days'
    and ct.end_date >= current_date
union all
  -- INFO : contrôles/entretiens à venir (7 j)
  select le.copro_id, 'Contrôle à effectuer: ' || le.title,
    3, '/maintenance/logbook', le.next_due_at, 'maintenance_due'
  from public.logbook_entries le
  where le.next_due_at is not null
    and le.next_due_at <= current_date + interval '7 days'
    and le.status <> 'terminee';

comment on view public.v_dashboard_todos is
  'Tâches/alertes agrégées du dashboard (compat 5c8209e ; le front trie par priority + limite).';
