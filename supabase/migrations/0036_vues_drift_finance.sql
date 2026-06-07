-- ============================================================================
-- 0036 — vues-drift-finance : recréation des vues d'agrégat finance
-- ============================================================================
-- 15 vues finance abandonnées lors de la re-baseline mais TOUJOURS consommées par
-- le front (cf. .planning/AUDIT_DRIFT_FINANCE.md + docs/claude/catalogue-finance.md §1).
-- Chaque bloc est recopié VERBATIM depuis le catalogue (SQL vérifié contre 0001→0035).
-- Toutes en with (security_invoker = true) -> héritent la RLS collectif/back-office de 0034.
--
-- NB RESSUSCITATION : v_account_balances et v_alur_lot_contributions étaient marquées
-- « vues mortes » dans l'en-tête de 0035 (« JAMAIS recreees ») ; elles sont volontairement
-- recréées ici (décision USER) — adaptées au schéma cible. Le gate_0035.sql a été ajusté
-- en conséquence (retrait de ces deux vues de la liste des vues mortes).
-- ============================================================================

-- === v_general_ledger ===
-- 0036 : recréation du grand livre dénormalisé (atlas GARDER)
-- Aplatit ledger_entries + en-tête tx + compte + lot. Aucune agrégation :
-- l'appelant filtre status='posted' et dérive la balance en sommant debit - credit.
CREATE OR REPLACE VIEW public.v_general_ledger
WITH (security_invoker = true) AS
SELECT
    e.id                                                   AS entry_id,
    e.tx_id                                                AS tx_id,
    t.copro_id                                             AS copro_id,
    t.period_id                                            AS period_id,
    t.tx_date                                              AS tx_date,
    t.label                                                AS tx_label,
    t.source_type                                          AS source_type,
    t.source_id                                            AS source_id,
    t.status                                               AS status,
    t.posted_at                                            AS posted_at,
    a.id                                                   AS account_id,
    a.code                                                 AS account_code,
    a.name                                                 AS account_name,
    a.account_type                                         AS account_type,
    e.lot_id                                               AS lot_id,
    l.ref                                                  AS lot_ref,
    e.direction                                            AS direction,
    e.amount                                               AS amount,
    e.entry_label                                          AS entry_label,
    -- colonnes débit/crédit séparées (confort de calcul aval)
    CASE WHEN e.direction = 'debit'  THEN e.amount ELSE 0 END AS debit,
    CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END AS credit
FROM public.ledger_entries e
JOIN public.ledger_transactions t ON t.id = e.tx_id
JOIN public.accounts a            ON a.id = e.account_id
LEFT JOIN public.lots l           ON l.id = e.lot_id;

COMMENT ON VIEW public.v_general_ledger IS
'Grand livre denormalise : 1 ligne par ecriture (ledger_entries) + en-tete tx + compte + lot. Filtrer status=posted en aval.';

-- === v_calls_overview ===
CREATE OR REPLACE VIEW public.v_calls_overview
WITH (security_invoker = true) AS
SELECT
  cf.id,
  cf.copro_id,
  cf.period_id,
  cf.budget_id,
  cf.repartition_key_id,
  (
    SELECT string_agg(DISTINCT rk.name, ', ' ORDER BY rk.name)
    FROM public.call_for_funds_lines cfl2
    JOIN public.repartition_keys rk ON rk.id = cfl2.repartition_key_id
    WHERE cfl2.call_id = cf.id
  ) AS repartition_key_name,
  cf.label,
  cf.trimester,
  cf.issue_date,
  cf.due_date,
  cf.total_amount,
  cf.status,
  cf.ledger_tx_id,
  cf.created_at,
  cf.issued_at,
  COALESCE(SUM(cfl.amount_paid), 0)::numeric(14,2) AS total_paid,
  (cf.total_amount - COALESCE(SUM(cfl.amount_paid), 0))::numeric(14,2) AS total_unpaid,
  COUNT(DISTINCT cfl.lot_id) AS lines_count,
  (
    COUNT(DISTINCT cfl.lot_id)
    - COUNT(DISTINCT cfl.lot_id) FILTER (WHERE cfl.status <> 'paid'::call_line_status)
  ) AS lines_paid_count,
  COUNT(DISTINCT cfl.lot_id) FILTER (WHERE cfl.status <> 'paid'::call_line_status) AS lines_unpaid_count
FROM public.call_for_funds cf
LEFT JOIN public.call_for_funds_lines cfl ON cfl.call_id = cf.id
GROUP BY cf.id;

COMMENT ON VIEW public.v_calls_overview IS 'Synthèse des appels de fonds (1 ligne/appel) : totaux appelé/payé/impayé + décompte des lots payés/impayés (multi-clés, comptage par lot).';

-- === v_call_lines_detailed ===
CREATE VIEW public.v_call_lines_detailed
WITH (security_invoker = true) AS
SELECT
    cfl.id,
    cfl.copro_id,
    cfl.call_id,
    cf.label                                   AS call_label,
    cf.issue_date,
    cf.due_date,
    cf.status                                  AS call_status,
    cfl.repartition_key_id,
    cfl.lot_id,
    l.ref                                       AS lot_ref,
    l.type                                      AS lot_type,
    cfl.amount_due,
    cfl.amount_paid,
    cfl.amount_due - cfl.amount_paid            AS amount_remaining,
    cfl.status,
    COALESCE(cfl.weight_snapshot, rkl.weight, 0::numeric) AS lot_weight,
    COALESCE(rk_total.total_weight, 0::numeric)          AS key_total_weight,
    (
        SELECT
            CASE
                WHEN cp.is_company THEN COALESCE(cp.company_name, '')
                ELSE btrim(COALESCE(cp.first_name, '') || ' ' || COALESCE(cp.last_name, ''))
            END
        FROM public.lot_owners lo
        JOIN public.coproprietaires cp ON cp.id = lo.coproprietaire_id
        WHERE lo.lot_id = cfl.lot_id
          AND lo.is_primary = true
          AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
        ORDER BY lo.start_date DESC
        LIMIT 1
    )                                           AS owner_name,
    rk.name                                     AS repartition_key_name,
    COALESCE(gen.weight, 0::numeric)            AS lot_tantiemes
FROM public.call_for_funds_lines cfl
JOIN public.call_for_funds cf  ON cf.id = cfl.call_id
JOIN public.lots l             ON l.id  = cfl.lot_id
LEFT JOIN public.repartition_keys rk
       ON rk.id = cfl.repartition_key_id
LEFT JOIN public.repartition_key_lines rkl
       ON rkl.key_id = cfl.repartition_key_id
      AND rkl.lot_id = cfl.lot_id
LEFT JOIN (
    SELECT key_id, SUM(weight) AS total_weight
    FROM public.repartition_key_lines
    GROUP BY key_id
) rk_total ON rk_total.key_id = cfl.repartition_key_id
LEFT JOIN LATERAL (
    SELECT rkl_g.weight
    FROM public.repartition_key_lines rkl_g
    JOIN public.repartition_keys rk_g ON rk_g.id = rkl_g.key_id
    WHERE rkl_g.lot_id = cfl.lot_id
      AND rk_g.copro_id = cfl.copro_id
      AND rk_g.category = 'general'
      AND rk_g.is_active = true
    ORDER BY rk_g.valid_from DESC
    LIMIT 1
) gen ON true;

-- === v_call_campaigns ===
create or replace view public.v_call_campaigns
with (security_invoker = true) as
with calls_agg as (
  select
    cf.copro_id,
    cf.period_id,
    count(*)                                                          as total_calls,
    count(distinct cf.trimester) filter (where cf.trimester is not null)            as total_trimesters,
    count(distinct cf.trimester) filter (
      where cf.trimester is not null and cf.status not in ('draft','cancelled')
    )                                                                as trimesters_issued,
    sum(cf.total_amount)                                             as total_amount,
    count(*) filter (where cf.status = 'cancelled')                  as cancelled_count,
    count(*) filter (where cf.status = 'draft')                      as draft_count
  from public.call_for_funds cf
  group by cf.copro_id, cf.period_id
),
lines_agg as (
  select
    cfl.copro_id,
    cf.period_id,
    coalesce(sum(cfl.amount_paid), 0)                                as total_paid,
    count(distinct cfl.repartition_key_id) filter (where cfl.repartition_key_id is not null) as total_keys
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  group by cfl.copro_id, cf.period_id
),
ag_link as (
  -- AG la plus recente parmi les budgets rattaches aux appels de la periode
  select distinct on (cf.copro_id, cf.period_id)
    cf.copro_id,
    cf.period_id,
    am.id            as ag_id,
    am.meeting_date  as ag_meeting_date,
    am.title         as ag_title
  from public.call_for_funds cf
  join public.budgets b      on b.id = cf.budget_id
  join public.ag_meetings am on am.id = b.source_ag_id
  order by cf.copro_id, cf.period_id, am.meeting_date desc
)
select
  ca.copro_id,
  ca.period_id,
  ap.name                                                           as period_name,
  ap.start_date                                                     as period_start,
  ap.end_date                                                       as period_end,
  al.ag_id,
  al.ag_meeting_date,
  al.ag_title,
  ca.total_calls,
  coalesce(la.total_keys, 0)                                        as total_keys,
  ca.total_trimesters,
  ca.trimesters_issued,
  ca.total_amount,
  coalesce(la.total_paid, 0)                                        as total_paid,
  case
    when ca.cancelled_count = ca.total_calls                                  then 'cancelled'
    when ca.draft_count = ca.total_calls                                      then 'draft'
    when coalesce(la.total_paid, 0) >= ca.total_amount and ca.total_amount > 0 then 'paid'
    when coalesce(la.total_paid, 0) > 0                                       then 'partially_paid'
    else 'issued'
  end::call_for_funds_status                                        as global_status
from calls_agg ca
join public.accounting_periods ap on ap.id = ca.period_id
left join lines_agg la on la.copro_id = ca.copro_id and la.period_id = ca.period_id
left join ag_link  al on al.copro_id = ca.copro_id and al.period_id = ca.period_id;

comment on view public.v_call_campaigns is 'Synthese par exercice de toutes les campagnes d''appels de fonds (totaux appeles/payes, trimestres, cles, statut global, AG d''origine).';

-- === v_supplier_invoices_overview ===
CREATE VIEW v_supplier_invoices_overview
WITH (security_invoker = true) AS
SELECT
  si.id,
  si.copro_id,
  si.period_id,
  si.tiers_id,
  t.name                                        AS supplier_name,
  si.invoice_number,
  si.invoice_date,
  si.due_date,
  si.label,
  si.total_amount,
  si.status,
  si.ledger_tx_id,
  si.document_id,
  si.created_at,
  COALESCE(SUM(sp.amount), 0)                    AS total_paid,
  si.total_amount - COALESCE(SUM(sp.amount), 0)  AS remaining_to_pay,
  COUNT(sp.id)                                   AS payments_count
FROM supplier_invoices si
JOIN tiers t ON t.id = si.tiers_id
LEFT JOIN supplier_payments sp ON sp.supplier_invoice_id = si.id
GROUP BY si.id, t.name;

COMMENT ON VIEW v_supplier_invoices_overview IS 'Factures fournisseurs avec montants payes (nom fournisseur derive de tiers).';

-- === v_budgets_overview ===
-- Migration 0036 — recréation de v_budgets_overview (synthèse budget : prévu / dépensé / reste)
-- Source autoritaire : schéma 0001→0035. Toutes colonnes utilisées existent telles quelles.
-- Différence vs legacy : ajout de b.version pour coller à l'interface TS BudgetOverview.
DROP VIEW IF EXISTS public.v_budgets_overview;

CREATE VIEW public.v_budgets_overview
WITH (security_invoker = true) AS
SELECT
  b.id,
  b.copro_id,
  b.period_id,
  b.budget_type,
  b.status,
  b.version,
  b.name,
  b.notes,
  b.created_at,
  b.validated_at,
  ap.name                                   AS period_name,
  ap.start_date                             AS period_start,
  ap.end_date                               AS period_end,
  EXTRACT(YEAR FROM ap.start_date)::int     AS period_year,
  COALESCE(lines.lines_count, 0)::int       AS lines_count,
  COALESCE(lines.total_planned, 0)          AS total_planned,
  COALESCE(exp.total_spent, 0)              AS total_spent,
  COALESCE(exp.validated_spent, 0)          AS validated_spent,
  COALESCE(lines.total_planned, 0) - COALESCE(exp.validated_spent, 0) AS remaining
FROM public.budgets b
LEFT JOIN public.accounting_periods ap
  ON ap.id = b.period_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS lines_count,
    SUM(bl.amount) AS total_planned
  FROM public.budget_lines bl
  WHERE bl.budget_id = b.id
) lines ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(be.amount) AS total_spent,
    SUM(be.amount) FILTER (WHERE be.status = 'validated') AS validated_spent
  FROM public.budget_expenses be
  WHERE be.budget_id = b.id
) exp ON true;

COMMENT ON VIEW public.v_budgets_overview IS 'Synthèse par budget : montant prévu (Σ budget_lines), dépensé tous statuts et validé (Σ budget_expenses), reste = prévu − validé. Suivi extra-comptable, ne touche pas le grand livre.';

-- === v_budget_lines_overview ===
-- Migration 0036+ : recreation de v_budget_lines_overview
-- Lignes de budget enrichies du suivi de consommation (depenses agregees).
DROP VIEW IF EXISTS public.v_budget_lines_overview;

CREATE VIEW public.v_budget_lines_overview
WITH (security_invoker = true) AS
SELECT
  bl.id,
  bl.copro_id,
  bl.budget_id,
  bl.account_id,
  bl.repartition_key_id,
  bl.label,
  bl.code,
  bl.amount                                   AS planned_amount,
  bl.sort_order,
  bl.created_at,
  COALESCE(exp.expenses_count, 0)::int        AS expenses_count,
  COALESCE(exp.total_spent, 0)                AS total_spent,
  COALESCE(exp.validated_spent, 0)            AS validated_spent,
  COALESCE(exp.pending_count, 0)::int         AS pending_count,
  bl.amount - COALESCE(exp.validated_spent, 0) AS remaining,
  CASE
    WHEN bl.amount > 0
      THEN ROUND((COALESCE(exp.validated_spent, 0) / bl.amount * 100)::numeric, 1)
    ELSE 0
  END                                         AS consumption_pct
FROM public.budget_lines bl
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int                                            AS expenses_count,
    SUM(be.amount)                                           AS total_spent,
    SUM(be.amount) FILTER (WHERE be.status = 'validated')    AS validated_spent,
    COUNT(*) FILTER (WHERE be.status = 'pending_validation')::int AS pending_count
  FROM public.budget_expenses be
  WHERE be.budget_line_id = bl.id
) exp ON true;

COMMENT ON VIEW public.v_budget_lines_overview IS 'Lignes budgetaires avec suivi de consommation (depenses agregees par ligne).';

-- === v_budget_expenses_detail ===
-- Migration 0036 — vue de détail des dépenses budgétaires (RESHAPE legacy)
-- Changement clé vs legacy : fournisseur (texte libre) -> dérivé de tiers.name via budget_expenses.tiers_id
create or replace view public.v_budget_expenses_detail
with (security_invoker = true) as
select
  e.id,
  e.copro_id,
  e.budget_id,
  e.budget_line_id,
  e.label,
  e.amount,
  e.montant_ht,
  e.taux_tva,
  e.tx_date,
  e.status,
  t.name            as fournisseur,   -- RESHAPE : nom dérivé du tiers (NULL si tiers_id NULL)
  e.tiers_id,
  e.piece_jointe,
  e.validated_at,
  e.validated_by,
  e.rejection_comment,
  e.created_at,
  e.updated_at,
  bl.label          as line_label,
  bl.code           as line_code,
  b.name            as budget_name,
  b.budget_type
from public.budget_expenses e
join public.budget_lines bl on bl.id = e.budget_line_id
join public.budgets b       on b.id = e.budget_id
left join public.tiers t    on t.id = e.tiers_id;

comment on view public.v_budget_expenses_detail is
  'Detail des depenses budgetaires avec contexte (poste, budget) ; fournisseur derive de tiers.name via tiers_id.';

-- === v_alur_lot_contributions ===
-- Migration 0036 (proposée) — recréer v_alur_lot_contributions sur le schéma cible.
-- LOT-CENTRIC : montants dérivés des VRAIES écritures par lot (lignes d'appel ALUR + grand livre 450-5),
-- PAS d'un redécoupage du total par tantièmes. tantiemes = INFO (repartition_key_lines.weight).
drop view if exists public.v_alur_lot_contributions;

create view public.v_alur_lot_contributions
with (security_invoker = true) as
with general_key as (
  -- clé générale active canonique par copro (déterministe ; 1 attendue, dette si >1)
  select distinct on (rk.copro_id) rk.copro_id, rk.id as key_id
  from public.repartition_keys rk
  where rk.category = 'general' and rk.is_active
  order by rk.copro_id, rk.id
),
lot_weights as (
  select
    l.id          as lot_id,
    l.copro_id,
    l.ref         as lot_ref,
    coalesce(rkl.weight, 0) as weight
  from public.lots l
  join general_key gk on gk.copro_id = l.copro_id
  left join public.repartition_key_lines rkl
    on rkl.lot_id = l.id and rkl.key_id = gk.key_id
),
copro_totals as (
  select copro_id, sum(weight) as total_weight
  from lot_weights
  group by copro_id
),
latest_alur as (
  -- dernier budget ALUR par copro (exercice ALUR courant)
  select distinct on (b.copro_id)
    b.copro_id,
    b.id                                  as budget_id,
    extract(year from ap.start_date)::int as period_year
  from public.budgets b
  join public.accounting_periods ap on ap.id = b.period_id
  where b.budget_type = 'alur'
  order by b.copro_id, ap.start_date desc
),
alur_lines as (
  -- VRAIES sommes par lot sur l'exercice ALUR courant (lignes d'appel ALUR émises)
  select
    cfl.lot_id,
    sum(cfl.amount_due)  as cotisation_appelee,
    sum(cfl.amount_paid) as cotisation_versee
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  join latest_alur la           on la.budget_id = cf.budget_id
  where cf.status not in ('draft', 'cancelled')
  group by cfl.lot_id
),
alur_ledger as (
  -- solde du sous-compte ALUR (450-5, nature='alur') par lot = vérité légale (cumulatif, écritures postées)
  select
    e.lot_id,
    sum(case when e.direction = 'debit' then e.amount else -e.amount end) as solde_alur
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id
  join public.accounts a            on a.id = e.account_id
  where a.nature = 'alur'
    and t.status = 'posted'
    and e.lot_id is not null
  group by e.lot_id
)
select
  lw.lot_id,
  lw.copro_id,
  lw.lot_ref,
  lw.weight as tantiemes_generaux,
  round((lw.weight / nullif(ct.total_weight, 0) * 100)::numeric, 2) as share_percent,
  lo.coproprietaire_id as owner_id,
  coalesce(
    case when c.is_company then c.company_name
         else nullif(trim(concat_ws(' ', c.first_name, c.last_name)), '')
    end,
    'Non assigné'
  ) as owner_name,
  la.period_year,
  coalesce(al.cotisation_appelee, 0) as lot_cotisation_appelee,
  coalesce(al.cotisation_versee, 0)  as lot_cotisation_versee,
  coalesce(led.solde_alur, 0)        as lot_solde_alur
from lot_weights lw
join copro_totals ct on ct.copro_id = lw.copro_id
left join latest_alur la  on la.copro_id = lw.copro_id
left join alur_lines al   on al.lot_id = lw.lot_id
left join alur_ledger led on led.lot_id = lw.lot_id
left join public.lot_owners lo
  on lo.lot_id = lw.lot_id and lo.end_date is null and lo.is_primary = true
left join public.coproprietaires c on c.id = lo.coproprietaire_id
where lw.weight > 0;

comment on view public.v_alur_lot_contributions is
  'Contributions ALUR par lot, LOT-CENTRIC : appelee/versee = lignes d''appel ALUR du dernier budget ALUR ; solde = compte 450-5 (nature alur) du grand livre par lot. tantiemes = info. Ne depend plus de v_alur_fund_summary.';

-- === v_lots_with_owners ===
CREATE OR REPLACE VIEW public.v_lots_with_owners
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.copro_id,
  l.ref,
  l.type,
  l.floor,
  l.surface,
  l.description,
  l.building_id,
  b.name                                   AS building_name,
  COALESCE(g.tantiemes_generaux, 0)        AS tantiemes_generaux,
  NULL::numeric                            AS tantiemes_escalier,
  NULL::numeric                            AS tantiemes_ascenseur,
  NULL::numeric                            AS tantiemes_chauffage,
  cp.id                                     AS coproprietaire_id,
  CASE
    WHEN cp.is_company THEN cp.company_name
    ELSE NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '')
  END                                       AS owner_display_name,
  cp.first_name                             AS owner_first_name,
  cp.last_name                              AS owner_last_name,
  cp.email                                  AS owner_email,
  lo.share_percent,
  l.created_at,
  l.updated_at
FROM public.lots l
LEFT JOIN public.buildings b
  ON b.id = l.building_id
LEFT JOIN public.lot_owners lo
  ON lo.lot_id = l.id
 AND lo.end_date IS NULL
 AND lo.is_primary = true
LEFT JOIN public.coproprietaires cp
  ON cp.id = lo.coproprietaire_id
LEFT JOIN LATERAL (
  SELECT SUM(rkl.weight) AS tantiemes_generaux
  FROM public.repartition_key_lines rkl
  JOIN public.repartition_keys rk
    ON rk.id = rkl.key_id
  WHERE rkl.lot_id = l.id
    AND rk.category = 'general'
    AND rk.is_active = true
) g ON true;

-- === v_repartition_key_totals ===
create or replace view public.v_repartition_key_totals
with (security_invoker = true) as
with key_lots as (
  -- Lots du périmètre de chaque clé + poids éventuel
  -- all_lots : produit tous les lots de la copro (poids depuis la ligne si elle existe)
  -- subset   : uniquement les lots ayant une ligne rattachée à la clé
  select
    rk.id                              as key_id,
    rk.copro_id                        as copro_id,
    l.id                               as lot_id,
    coalesce(rkl.weight, 0)            as weight
  from public.repartition_keys rk
  join public.lots l
    on l.copro_id = rk.copro_id
  left join public.repartition_key_lines rkl
    on rkl.key_id = rk.id
   and rkl.lot_id = l.id
  where rk.coverage_mode = 'all_lots'

  union all

  select
    rk.id                              as key_id,
    rk.copro_id                        as copro_id,
    rkl.lot_id                         as lot_id,
    rkl.weight                         as weight
  from public.repartition_keys rk
  join public.repartition_key_lines rkl
    on rkl.key_id = rk.id
  where rk.coverage_mode = 'subset'
)
select
  rk.id                                                  as key_id,
  rk.copro_id                                            as copro_id,
  rk.name                                                as name,
  rk.description                                         as description,
  rk.basis                                               as basis,
  rk.coverage_mode                                       as coverage_mode,
  rk.is_active                                           as is_active,
  coalesce(sum(kl.weight), 0)::numeric(14,4)            as total_weight,
  count(kl.lot_id)::int                                  as lots_count,
  count(kl.lot_id) filter (where kl.weight > 0)::int     as lots_with_weight_count,
  (count(kl.lot_id) > 0
    and count(kl.lot_id) filter (where kl.weight > 0) = count(kl.lot_id)) as is_complete
from public.repartition_keys rk
left join key_lots kl
  on kl.key_id = rk.id
group by
  rk.id, rk.copro_id, rk.name, rk.description,
  rk.basis, rk.coverage_mode, rk.is_active;

-- === v_repartition_key_lines_detailed ===
-- Migration 0036 : recréation de la vue détail des lignes d'une clé de répartition.
-- RESHAPE vs legacy : tantiemes_generaux n'est plus une colonne de lots (droppée) ;
-- il est dérivé du poids du lot dans la clé GÉNÉRALE active de la copro.
create view public.v_repartition_key_lines_detailed
with (security_invoker = true)
as
with general_weights as (
  -- Poids de chaque lot dans la clé générale active de sa copropriété.
  -- Si plusieurs clés générales actives existaient, on agrège (SUM) par sécurité.
  select
    rkl_g.lot_id,
    sum(rkl_g.weight) as tantiemes_generaux
  from public.repartition_key_lines rkl_g
  join public.repartition_keys rk_g
    on rk_g.id = rkl_g.key_id
  where rk_g.category = 'general'
    and rk_g.is_active = true
  group by rkl_g.lot_id
),
key_totals as (
  -- Somme des poids par clé, pour le calcul de la part en pourcentage.
  select
    rkl_t.key_id,
    sum(rkl_t.weight) as total_weight
  from public.repartition_key_lines rkl_t
  group by rkl_t.key_id
)
select
  rkl.id                                   as line_id,
  rkl.copro_id                             as copro_id,
  rkl.key_id                               as key_id,
  rk.name                                  as key_name,
  rk.basis                                 as basis,
  rk.coverage_mode                         as coverage_mode,
  rkl.lot_id                               as lot_id,
  l.ref                                    as lot_ref,
  l.type                                   as lot_type,
  coalesce(gw.tantiemes_generaux, 0)       as tantiemes_generaux,
  l.surface                                as surface,
  rkl.weight                               as weight,
  case
    when coalesce(kt.total_weight, 0) = 0 then 0
    else round(rkl.weight / kt.total_weight * 100, 4)
  end                                      as share_pct
from public.repartition_key_lines rkl
join public.repartition_keys rk
  on rk.id = rkl.key_id
join public.lots l
  on l.id = rkl.lot_id
left join general_weights gw
  on gw.lot_id = rkl.lot_id
left join key_totals kt
  on kt.key_id = rkl.key_id;

-- === v_unpaid_with_reminders ===
-- Migration 0036 — v_unpaid_with_reminders : impayés par lot enrichis des relances.
-- RESHAPE de la vue legacy : on conserve sa logique (v_unpaid_* + LATERAL payment_reminders)
-- mais on ÉLARGIT la shape pour matcher ce que les hooks vivants lisent réellement
-- (unpaid_amount, severity, lot_type, owner_phone, total_due, total_paid).
-- Base = v_unpaid_lot_owner (0028) qui résout déjà owner_id/name/email + agrégats par lot.
create or replace view public.v_unpaid_with_reminders
with (security_invoker = true) as
with base as (
  select
    cfl.copro_id,
    cfl.lot_id,
    l.ref                                    as lot_ref,
    l.type                                   as lot_type,
    sum(cfl.amount_due)                       as total_due,
    sum(cfl.amount_paid)                      as total_paid,
    sum(cfl.amount_due - cfl.amount_paid)     as unpaid_amount,
    count(cfl.id)                             as unpaid_lines_count,
    min(cf.due_date)                          as oldest_due_date,
    (current_date - min(cf.due_date))         as days_overdue
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  join public.lots l            on l.id = cfl.lot_id
  join public.copros c          on c.id = cfl.copro_id
  where cfl.status <> 'paid'
    and cf.status not in ('draft', 'cancelled')
    and cf.due_date < current_date
    and c.onboarding_step is null
  group by cfl.copro_id, cfl.lot_id, l.ref, l.type
  having sum(cfl.amount_due - cfl.amount_paid) > 0
),
owned as (
  select
    b.*,
    op.coproprietaire_id                      as owner_id,
    case when op.is_company then op.company_name
         else coalesce(op.first_name || ' ' || op.last_name, 'Inconnu') end as owner_name,
    op.email                                  as owner_email,
    op.phone                                  as owner_phone
  from base b
  left join lateral (
    select cp.id as coproprietaire_id, cp.is_company, cp.company_name,
           cp.first_name, cp.last_name, cp.email, cp.phone
    from public.lot_owners lo
    join public.coproprietaires cp on cp.id = lo.coproprietaire_id
    where lo.lot_id = b.lot_id
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  ) op on true
)
select
  o.copro_id,
  o.lot_id,
  o.lot_ref,
  o.lot_type,
  o.owner_id,
  o.owner_name,
  o.owner_email,
  o.owner_phone,
  o.total_due,
  o.total_paid,
  o.unpaid_amount,
  o.unpaid_amount                              as total_unpaid,  -- alias compat legacy/finance/api.ts
  o.unpaid_lines_count,
  o.oldest_due_date,
  o.days_overdue,
  case
    when o.days_overdue >= 90 then 'CRITICAL'   -- 4e palier / contentieux
    when o.days_overdue >= 60 then 'HIGH'       -- 3e relance (J+60)
    when o.days_overdue >= 30 then 'MEDIUM'     -- 2e relance (J+30)
    when o.days_overdue >= 15 then 'MINOR'      -- 1re relance (J+15)
    else 'NONE'                                 -- echu < 15 j, 1re relance pas encore due
  end                                          as severity,
  last_reminder.id          as last_reminder_id,
  last_reminder.delay_level as last_reminder_level,
  last_reminder.status      as last_reminder_status,
  last_reminder.sent_at     as last_reminder_sent_at,
  coalesce(reminder_count.total, 0) as total_reminders_sent
from owned o
left join lateral (
  select pr.id, pr.delay_level, pr.status, pr.sent_at
  from public.payment_reminders pr
  where pr.lot_id = o.lot_id
    and pr.copro_id = o.copro_id
    and pr.status in ('sent', 'pending')
  order by pr.delay_level desc, pr.created_at desc
  limit 1
) last_reminder on true
left join lateral (
  select count(*) as total
  from public.payment_reminders pr
  where pr.lot_id = o.lot_id
    and pr.copro_id = o.copro_id
    and pr.status = 'sent'
) reminder_count on true;

comment on view public.v_unpaid_with_reminders is
  'Impayes par lot (echu non regle, copros en onboarding exclues) enrichis de la derniere relance et du compteur de relances envoyees. severity alignee sur les 4 paliers de relance J+15/30/60/90 (NONE<15, MINOR>=15, MEDIUM>=30, HIGH>=60, CRITICAL>=90).';

-- === v_payment_reminders_overview ===
-- Migration 0036 — recréation de v_payment_reminders_overview (atlas : GARDER cible)
-- Vue d'archive : aplatit chaque relance avec la ref du lot et le libellé de sa règle.
-- Aucune jointure live sur le copropriétaire : owner_name = snapshot recipient_name.
create or replace view public.v_payment_reminders_overview
with (security_invoker = true) as
select
  pr.id,
  pr.copro_id,
  pr.lot_id,
  l.ref                as lot_ref,
  pr.owner_id,
  pr.recipient_name    as owner_name,
  pr.recipient_email,
  pr.unpaid_amount,
  pr.oldest_due_date,
  pr.days_overdue,
  pr.delay_level,
  pr.status,
  pr.delivery_status,
  pr.scheduled_at,
  pr.sent_at,
  pr.cancelled_at,
  pr.cancelled_reason,
  pr.created_at,
  prr.label            as rule_label,
  prr.channel
from public.payment_reminders pr
join public.lots l
  on l.id = pr.lot_id
left join public.payment_reminder_rules prr
  on prr.id = pr.reminder_rule_id;

-- === v_account_balances ===
create view public.v_account_balances
with (security_invoker = true) as
select
  a.id              as account_id,
  a.copro_id        as copro_id,
  a.code            as code,
  a.name            as name,
  a.bank_name       as banque,
  a.iban            as iban,
  a.initial_balance as initial_balance,
  coalesce(mv.movements_total, 0::numeric) as movements_total,
  a.initial_balance + coalesce(mv.movements_total, 0::numeric) as computed_balance
from public.accounts a
left join lateral (
  select sum(bm.amount_signed) as movements_total
  from public.bank_movements bm
  where bm.account_id = a.id
) mv on true
where a.account_type = 'asset'
  and a.is_active = true
  and (a.code like '512%' or a.code like '502%' or a.code like '5121%');
