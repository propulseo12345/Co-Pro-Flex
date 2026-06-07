-- ============================================================================
-- 0035 — vues-transverses : derniere migration du lot fonctions
-- ============================================================================
-- 4 vues derivees manquantes. with (security_invoker = true) -> heritent la RLS de 0034.
-- Scoping/SQL : workflow wf_6bd8c8aa-8f0. Vues mortes (v_account_balances, v_mail_*,
-- v_lot_balance, v_alur_lot_contributions) JAMAIS recreees (deps mortes / tantiemes inexistants).
-- ============================================================================

-- ============================================================================
-- v_coproprietaires_overview — annuaire enrichi, 1 ligne par personne (R40 : 0 doublon)
-- ============================================================================
-- Grain = coproprietaires.id (PK). Tous les agrégats multi-lignes sont des sous-requêtes
-- scalaires corrélées : AUCUN join N→M ne peut multiplier la ligne (garantie 0 doublon).
-- ADAPTATIONS CIBLE :
--   - solde dérivé du GL via v_owner_statement_by_lot (lot-centric), PAS de v_lot_balance (inexistant).
--   - total_tantiemes = Σ weight de la clé GÉNÉRALE active (repartition_key_lines), car lots n'a plus tantiemes_generaux.
--   - owner_type : COPROPRIETAIRE si ∃ lot_owner actif, sinon ANCIEN si ∃ rattachement clôturé, sinon COPROPRIETAIRE (personne sans lot).
create or replace view public.v_coproprietaires_overview
with (security_invoker = true) as
select
  c.id,
  c.copro_id,
  c.user_id,
  c.is_company,
  c.company_name,
  c.civility,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.mobile,
  c.address_line1,
  c.address_line2,
  c.city,
  c.postal_code,
  c.country,
  c.prefers_email,
  c.prefers_paper,
  c.notes,
  c.created_at,
  c.updated_at,
  case when c.is_company then c.company_name
       else coalesce(nullif(trim(concat_ws(' ', c.first_name, c.last_name)), ''), 'Inconnu') end
                                                                       as display_name,
  -- Solde lot-centric dérivé du GL : Σ des soldes des lots actifs de la personne.
  coalesce((
    select round(sum(s.balance), 2)
    from public.v_owner_statement_by_lot s
    join public.lot_owners lo on lo.lot_id = s.lot_id
                             and lo.end_date is null
                             and lo.is_primary = true
    where lo.coproprietaire_id = c.id
  ), 0)                                                                as solde,
  case
    when not exists (
           select 1 from public.lot_owners lo
           where lo.coproprietaire_id = c.id and lo.end_date is null
         )
         and exists (
           select 1 from public.lot_owners lo
           where lo.coproprietaire_id = c.id and lo.end_date is not null
         )
    then 'ANCIEN'
    else 'COPROPRIETAIRE'
  end                                                                  as owner_type,
  (
    select cm.role
    from public.council_members cm
    where cm.coproprietaire_id = c.id
      and cm.copro_id = c.copro_id
      and cm.is_active
      and cm.end_date is null
    limit 1
  )                                                                    as council_role,
  (
    select count(*)
    from public.lot_owners lo
    where lo.coproprietaire_id = c.id and lo.end_date is null
  )                                                                    as lots_count,
  -- Tantièmes généraux = Σ weight de la clé "general" active, sur les lots actifs de la personne.
  coalesce((
    select sum(rkl.weight)
    from public.lot_owners lo
    join public.repartition_key_lines rkl on rkl.lot_id = lo.lot_id
    where lo.coproprietaire_id = c.id and lo.end_date is null and lo.is_primary = true
      and rkl.key_id = (
        -- clé générale active canonique de la copro (déterministe ; 1 attendue, dette si >1)
        select rk.id from public.repartition_keys rk
        where rk.copro_id = c.copro_id and rk.category = 'general' and rk.is_active
        order by rk.id limit 1
      )
  ), 0)                                                                as total_tantiemes
from public.coproprietaires c;

comment on view public.v_coproprietaires_overview is
  'Annuaire enrichi par personne (1 ligne/coproprietaire, R40 0 doublon). Solde derive du GL (v_owner_statement_by_lot), tantiemes derives de la cle generale (repartition_key_lines). Lot-centric.';

-- ============================================================================
-- v_owner_statement_by_lot_detail — relevé DÉTAILLÉ par lot (1 ligne par écriture 45x postée)
-- ============================================================================
-- Détail des mouvements 45x (créance copro) portant lot_id, écritures POSTÉES uniquement.
-- Solde cumulé (running_balance) par lot, ordonné par date puis tx. Complète v_owner_statement_by_lot (agrégat).
create or replace view public.v_owner_statement_by_lot_detail
with (security_invoker = true) as
select
  e.copro_id,
  e.lot_id,
  l.ref                                                                as lot_ref,
  e.period_id,
  ap.name                                                              as period_name,
  t.tx_date,
  t.id                                                                 as tx_id,
  t.source_type,
  a.code                                                               as account_code,
  coalesce(e.entry_label, t.label)                                     as label,
  case when e.direction = 'debit'  then e.amount else 0 end            as debit,
  case when e.direction = 'credit' then e.amount else 0 end            as credit,
  case when e.direction = 'debit'  then e.amount else -e.amount end    as movement,
  round(sum(case when e.direction = 'debit' then e.amount else -e.amount end)
        over (partition by e.lot_id
              order by t.tx_date, t.id, e.id
              rows between unbounded preceding and current row), 2)     as running_balance
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
join public.accounts a            on a.id = e.account_id
join public.lots l                on l.id = e.lot_id
join public.accounting_periods ap on ap.id = e.period_id
where e.lot_id is not null
  and a.code like '45%';

comment on view public.v_owner_statement_by_lot_detail is
  'Releve DETAILLE par lot : 1 ligne par ecriture 45x postee (date, libelle, debit/credit, solde cumule). Derive du GL. Complement de v_owner_statement_by_lot (agregat).';

-- ============================================================================
-- v_alur_fund_summary — résumé du fonds de travaux ALUR (art. 14-2 II) par budget ALUR
-- ============================================================================
-- ADAPTÉ CIBLE : alur_transfers.budget_id (PAS alur_budget_id), pas de colonne description.
-- cotisation_annuelle = Σ budget_lines du budget ALUR ; total_transferred = Σ alur_transfers de ce budget ;
-- solde_actuel = cotisation - transferts ; pourcentage_budget = part de la cotisation dans le budget courant
-- de la même période (plancher légal 5 % / 2,5 % PPT non calculé ici, défaut 5.0 si pas de budget courant).
create or replace view public.v_alur_fund_summary
with (security_invoker = true) as
select
  b.id                                                                 as budget_id,
  b.copro_id,
  b.period_id,
  ap.start_date                                                        as period_start,
  ap.end_date                                                          as period_end,
  extract(year from ap.start_date)::int                                as period_year,
  b.name,
  coalesce(lines.total_planned, 0)                                     as cotisation_annuelle,
  coalesce(tr.total_transferred, 0)                                    as total_transferred,
  coalesce(lines.total_planned, 0) - coalesce(tr.total_transferred, 0) as solde_actuel,
  coalesce(
    round((coalesce(lines.total_planned, 0) / nullif(fonct.total_planned, 0) * 100)::numeric, 1),
    0
  )                                                                    as pourcentage_budget,  -- 0 si pas de budget courant validé (NON le plancher légal 5%, qui se calcule ailleurs)
  coalesce(fonct.total_planned, 0)                                     as budget_fonctionnement
from public.budgets b
join public.accounting_periods ap on ap.id = b.period_id
left join lateral (
  select sum(bl.amount) as total_planned
  from public.budget_lines bl
  where bl.budget_id = b.id
) lines on true
left join lateral (
  select sum(t.amount) as total_transferred
  from public.alur_transfers t
  where t.budget_id = b.id
) tr on true
left join lateral (
  select sum(bl.amount) as total_planned
  from public.budgets fb
  join public.budget_lines bl on bl.budget_id = fb.id
  where fb.copro_id = b.copro_id
    and fb.budget_type = 'current'
    and fb.period_id = b.period_id
    and fb.status = 'validated'
) fonct on true
where b.budget_type = 'alur';

comment on view public.v_alur_fund_summary is
  'Resume du fonds de travaux ALUR (art.14-2 II) par budget ALUR : cotisation annuelle (budget_lines), transferts (alur_transfers.budget_id), solde et part du budget courant. Adapte au schema cible.';

-- ============================================================================
-- v_alur_transfers_history — historique des transferts du fonds ALUR
-- ============================================================================
-- ADAPTÉ CIBLE : colonnes réelles de alur_transfers (budget_id, destination enum {works,reserve,operating,other},
-- amount, transfer_date, ledger_tx_id, notes). PAS de destination_budget_id/description/resolution_ag_id.
create or replace view public.v_alur_transfers_history
with (security_invoker = true) as
select
  t.id,
  t.copro_id,
  t.budget_id,
  t.amount,
  t.transfer_date,
  t.destination,
  t.ledger_tx_id,
  t.notes,
  t.created_at,
  ap.name                                                              as period_name,
  extract(year from ap.start_date)::int                                as period_year
from public.alur_transfers t
join public.budgets ab            on ab.id = t.budget_id
join public.accounting_periods ap on ap.id = ab.period_id;

comment on view public.v_alur_transfers_history is
  'Historique des transferts du fonds ALUR (alur_transfers) avec periode du budget ALUR source. Adapte au schema cible (destination enum works/reserve/operating/other, notes).';
