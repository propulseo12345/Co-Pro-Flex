-- 0028_derives_vues_annexes.sql — DÉRIVÉS, VUES & ANNEXES (sous-lot 4/5 finance)
-- Source : .planning/db-cible/02-finance-grand-livre.md (GL fait autorité) + 03-budgets-appels-impayes.md
--          (impayés/relances) + mémoire annexes_legales_copro (libellés EXACTS 3/4/5)
--          + corps LEGACY faisant autorité (supabase/migrations_legacy, version la plus récente),
--            ADAPTÉS au schéma cible (colonnes EXACTES vérifiées sur 0008/0009/0010/0012/0013/0014/0016/0021).
--
-- BUT : exposer tout ce qui se DÉRIVE du grand livre (ledger_entries fait autorité) sans jamais y écrire :
--       balance (v_trial_balance), relevés lot-centric (v_owner_statement_by_lot / _by_person),
--       impayés par lot (v_unpaid_by_lot), encaissements (v_payments_overview), rapprochement bancaire
--       (v_bank_movements_overview), détection d'écart relevé↔GL (v_lot_vs_gl_mismatch) ; les fonctions
--       de reporting (get_owner_statement, fn_dashboard_kpis, calculate_budget_projection), le CONTRÔLE
--       D'INTÉGRITÉ DU GL (audit_finance_integrity = clé de validation de la boucle d'or 0029), les 5
--       ANNEXES COMPTABLES LÉGALES (libellés corrigés), et la chaîne de RELANCES impayés (seuls objets
--       qui écrivent — dans payment_reminders, JAMAIS le GL) + ses 2 triggers SEED idempotents/non bloquants.
--       Ce fichier NE CRÉE QUE des VUES, FONCTIONS et 2 TRIGGERS SEED. AUCUNE table (toutes en 0001→0022).
--       AUCUN objet 0001→0027 recréé ni retouché (sinon double create casse `supabase db reset`).
--
-- IMPÉRATIFS RESPECTÉS :
--   - ledger_entries fait AUTORITÉ pour TOUS les soldes (jamais bank_movements ni un chemin parallèle).
--   - Vues LOT-CENTRIC : le solde par PERSONNE se dérive en SOMMANT ses lots (jamais un compte/personne).
--   - v_account_balances ABANDONNÉE — NON créée (la balance vit dans v_trial_balance).
--   - v_lot_vs_gl_mismatch : VÉRIFIÉ absent de 0001→0027 (référencé comme MODÈLE dans un commentaire de
--     0027 mais jamais CREATE) → créé ICI.
--   - lots n'a PAS de owner_id : la personne d'un lot passe TOUJOURS par lot_owners + coproprietaires.
--   - Les 2 triggers seed (rules/settings) sont IDEMPOTENTS et NON bloquants : create_default_reminder_rules
--     LEFT JOIN email_templates par code (template_id NULL accepté, FK nullable) car les templates système
--     ne sont seedés qu'en 0034 → une création de copro (y compris harnais) ne casse JAMAIS.
--
-- ADAPTATIONS schéma cible (vs LEGACY) :
--   1. v_trial_balance legacy projetait a.parent_id — ABSENT en cible (0012 n'a pas parent_id) → retiré.
--   2. payments / bank_movements n'ont PAS de colonne created_at en cible → vues sans created_at.
--   3. owner_statement legacy lisait lots.tantiemes_generaux (DROPPÉ en 0008) → relevés DÉRIVÉS DU GL
--      (450x avec lot_id) au grain LOT, puis somme par personne via lot_owners (lot-centric strict).
--   4. audit_finance_integrity legacy = wrapper de v_finance_integrity_issues (jungle de vues + auto-fix)
--      → RÉÉCRIT en fonction SELF-CONTAINED dérivée du GL : déséquilibre tx (Σ D≠Σ C), ligne 45x sans
--      lot_id, écart relevé↔GL, écart total appel↔lignes. Retourne 0 ligne si conforme. G-DEF-RO.
--   5. get_pending_reminders_to_send legacy dérivait le propriétaire via lots.owner_id (INEXISTANT) →
--      consomme v_unpaid_by_lot (owner_name/email déjà exposés) + résout owner_id via lot_owners primaire.
--   6. Annexes : libellés CORRIGÉS (annexe 3 = « Ventilation des charges par clé de répartition » ;
--      annexe 4 = « Travaux terminés (art.14-2) » ; annexe 5 = « Travaux non clôturés / en cours »).
--   7. mark_reminder_sent / mark_reminder_failed : branche service_role (callback provider) en plus de G-MGR.
--   8. is_reminders_paused legacy renvoyait une TABLE — conservé (RETURNS TABLE), passe en G-DEF-RO.
--
-- CONVENTIONS (durcissement transverse 0023→0027) :
--   - Lecture/reporting = G-DEF-RO : SECURITY DEFINER + set search_path=public + STABLE + garde d'accès
--     (IF NOT is_service_call() AND NOT user_has_copro_access(p_copro_id) THEN RAISE 42501) ; GRANT authenticated.
--   - get_owner_statement = G-MIXTE (user_is_lot_owner_or_manager).
--   - Mutations relances = G-MGR (user_is_copro_manager) ; mark_* + branche service_role.
--   - VUES : with (security_invoker = true) (héritent la RLS de la table sous-jacente au lot 0034). Pas de GRANT par vue.
--   - Triggers seed (fonctions) : SECURITY DEFINER + search_path ; REVOKE EXECUTE FROM public, anon, authenticated.
--   - deny-by-default : REVOKE EXECUTE FROM public, anon ; GRANT authenticated (+ service_role si chemin machine).
--   - UN SEUL % (jamais %% ni %.2f). errcodes : 42501 / 23514 / 23503. Pas de WHEN OTHERS masquant.
--
-- ORDRE DE DÉCLARATION (un objet appelé est défini AVANT son appelant) :
--   A. VUES GL-dérivées :
--      1. v_trial_balance
--      2. v_owner_statement_by_lot
--      3. v_owner_statement_by_person   (somme by_lot via lot_owners)
--      4. v_unpaid_by_lot               (exclut reprises onboarding ; expose owner_name/email)
--      5. v_payments_overview
--      6. v_bank_movements_overview
--      7. v_lot_vs_gl_mismatch          (modèle 0027 ; créé ICI)
--   B. Fonctions dérivées / reporting :
--      8. get_owner_statement           [G-MIXTE]
--      9. fn_dashboard_kpis             [G-DEF-RO]
--     10. calculate_budget_projection   [G-DEF-RO]
--     11. audit_finance_integrity       [G-DEF-RO] — CONTRÔLE BOUCLE D'OR (0029)
--     12. refresh_bank_movement_status  [G-MGR]
--   C. Annexes comptables légales :
--     13. fn_annexe_1 / 14. fn_annexe_1_detail_copros / 15. fn_annexe_2 / 16. fn_annexe_3 /
--     17. fn_annexe_4 / 18. fn_annexe_5
--   D. Relances impayés :
--     19. v_unpaid_lot_owner (helper interne)  20. get_pending_reminders_to_send [G-DEF-RO]
--     21. create_payment_reminder [G-MGR]  22. mark_reminder_sent / 23. mark_reminder_failed [G-MGR+SVC]
--     24. cancel_stale_reminders [G-MGR]  25. is_reminders_paused [G-DEF-RO]
--     26. create_default_reminder_rules / 27. create_default_reminder_settings [G-TRIG seed]


-- ============================================================================================
-- A.1  v_trial_balance — BALANCE par compte × copro × période (Σ débit / Σ crédit / solde)
-- ============================================================================================
-- Source = ledger_entries POSTÉES uniquement. Invariant : Σ total_debit = Σ total_credit (global copro).
-- Adapté : pas de a.parent_id (absent en cible). security_invoker hérite la RLS du lot 0034.
create or replace view public.v_trial_balance
with (security_invoker = true) as
select
  e.copro_id,
  e.period_id,
  ap.name                                                              as period_name,
  e.account_id,
  a.code                                                               as account_code,
  a.name                                                               as account_name,
  a.account_type,
  sum(case when e.direction = 'debit'  then e.amount else 0 end)        as total_debit,
  sum(case when e.direction = 'credit' then e.amount else 0 end)        as total_credit,
  sum(case when e.direction = 'debit'  then e.amount else 0 end)
    - sum(case when e.direction = 'credit' then e.amount else 0 end)    as balance,
  count(*)                                                             as entry_count
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
join public.accounts a            on a.id = e.account_id
join public.accounting_periods ap on ap.id = e.period_id
group by e.copro_id, e.period_id, ap.name, e.account_id, a.code, a.name, a.account_type;

comment on view public.v_trial_balance is
  'Balance des comptes par copro x periode (ecritures posted). Sigma total_debit = Sigma total_credit (invariant GL).';


-- ============================================================================================
-- A.2  v_owner_statement_by_lot — RELEVÉ par LOT (solde 450x par lot, lot-centric, dérivé GL)
-- ============================================================================================
-- Source = ledger_entries sur les comptes 45x (créance copro) qui PORTENT lot_id (0024 l'impose).
-- balance > 0 = le lot doit à la copro (débiteur) ; < 0 = la copro doit au lot (créditeur/avance).
-- owner_name/email = propriétaire principal ACTIF du lot (via lot_owners + coproprietaires).
create or replace view public.v_owner_statement_by_lot
with (security_invoker = true) as
select
  e.copro_id,
  e.lot_id,
  l.ref                                                                 as lot_ref,
  (
    select case when cp.is_company then cp.company_name
                else coalesce(cp.first_name || ' ' || cp.last_name, 'Inconnu') end
    from public.lot_owners lo
    join public.coproprietaires cp on cp.id = lo.coproprietaire_id
    where lo.lot_id = e.lot_id
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  )                                                                     as owner_name,
  (
    select cp.email
    from public.lot_owners lo
    join public.coproprietaires cp on cp.id = lo.coproprietaire_id
    where lo.lot_id = e.lot_id
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  )                                                                     as owner_email,
  sum(case when e.direction = 'debit'  then e.amount else 0 end)        as total_debit,
  sum(case when e.direction = 'credit' then e.amount else 0 end)        as total_credit,
  round(
    sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2
  )                                                                     as balance
from public.ledger_entries e
join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
join public.accounts a            on a.id = e.account_id
join public.lots l                on l.id = e.lot_id
where e.lot_id is not null
  and a.code like '45%'
group by e.copro_id, e.lot_id, l.ref;

comment on view public.v_owner_statement_by_lot is
  'Releve par LOT : solde des comptes 45x portant lot_id (derive du GL poste). balance>0 = lot debiteur. Lot-centric.';


-- ============================================================================================
-- A.3  v_owner_statement_by_person — RELEVÉ par PERSONNE = somme des lots possédés (lot-centric)
-- ============================================================================================
-- Le solde par PERSONNE se DÉRIVE en sommant les lots de la personne (jamais un compte par personne).
-- Rattache un lot à la personne via son propriétaire principal ACTIF (lot_owners.is_primary, end_date NULL).
create or replace view public.v_owner_statement_by_person
with (security_invoker = true) as
select
  sl.copro_id,
  lo.coproprietaire_id                                                  as owner_id,
  case when cp.is_company then cp.company_name
       else coalesce(cp.first_name || ' ' || cp.last_name, 'Inconnu') end as owner_name,
  cp.email                                                              as owner_email,
  count(distinct sl.lot_id)                                            as lots_count,
  sum(sl.total_debit)                                                  as total_debit,
  sum(sl.total_credit)                                                 as total_credit,
  round(sum(sl.balance), 2)                                            as balance
from public.v_owner_statement_by_lot sl
join public.lot_owners lo       on lo.lot_id = sl.lot_id
                               and lo.is_primary = true
                               and lo.end_date is null
join public.coproprietaires cp  on cp.id = lo.coproprietaire_id
group by sl.copro_id, lo.coproprietaire_id, cp.is_company, cp.company_name, cp.first_name, cp.last_name, cp.email;

comment on view public.v_owner_statement_by_person is
  'Releve par PERSONNE = somme des soldes de ses lots (derive de v_owner_statement_by_lot via lot_owners). Lot-centric.';


-- ============================================================================================
-- A.4  v_unpaid_by_lot — IMPAYÉS par lot (échu non réglé) ; EXCLUT les copros en onboarding
-- ============================================================================================
-- Source = call_for_funds_lines du/payé (échu < aujourd'hui). Une copro en onboarding (onboarding_step
-- non terminé) peut avoir des appels postés sans reprise finie → ne doit PAS remonter en relances
-- (legacy 20260603110000_v1_6_unpaid_exclude_onboarding). En cible, onboarding_step DEFAULT 0 et passe
-- à NULL une fois l'onboarding terminé → on exclut step NON NULL (en cours). Expose owner_name/email.
-- ⚠ CONTRAT 0029 (boucle d'or) : copros.onboarding_step a DEFAULT 0 (0007) → une copro FRAÎCHEMENT créée
--   a step=0 et est EXCLUE de cette vue. Le harnais 0029 DOIT poser onboarding_step = NULL sur sa copro
--   de test AVANT d'asserter les impayés, sinon la gate « v_unpaid_by_lot cohérent » serait vacuously
--   true (0 ligne). Idem en prod, le code applicatif repasse onboarding_step à NULL en fin d'onboarding.
--   fn_dashboard_kpis.total_impayes, get_pending_reminders_to_send et cancel_stale_reminders en dépendent.
create or replace view public.v_unpaid_by_lot
with (security_invoker = true) as
select
  cfl.copro_id,
  cfl.lot_id,
  l.ref                                                                 as lot_ref,
  (
    select cp.first_name || ' ' || cp.last_name
    from public.lot_owners lo
    join public.coproprietaires cp on cp.id = lo.coproprietaire_id
    where lo.lot_id = cfl.lot_id
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  )                                                                     as owner_name,
  (
    select cp.email
    from public.lot_owners lo
    join public.coproprietaires cp on cp.id = lo.coproprietaire_id
    where lo.lot_id = cfl.lot_id
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  )                                                                     as owner_email,
  sum(cfl.amount_due - cfl.amount_paid)                                as total_unpaid,
  count(cfl.id)                                                        as unpaid_lines_count,
  min(cf.due_date)                                                     as oldest_due_date,
  (current_date - min(cf.due_date))                                    as days_overdue
from public.call_for_funds_lines cfl
join public.call_for_funds cf on cf.id = cfl.call_id
join public.lots l            on l.id = cfl.lot_id
join public.copros c          on c.id = cfl.copro_id
where cfl.status <> 'paid'
  and cf.status not in ('draft', 'cancelled')
  and cf.due_date < current_date
  and c.onboarding_step is null
group by cfl.copro_id, cfl.lot_id, l.ref
having sum(cfl.amount_due - cfl.amount_paid) > 0;

comment on view public.v_unpaid_by_lot is
  'Impayes agreges par lot (echu non regle). Exclut les copros encore en onboarding (onboarding_step non NULL). Expose owner_name/email pour les relances.';


-- ============================================================================================
-- A.5  v_payments_overview — ENCAISSEMENTS avec ventilation + propriétaire (lot-centric)
-- ============================================================================================
-- Adapté : payments cible n'a PAS de created_at → retiré. Propriétaire = principal actif du lot.
create or replace view public.v_payments_overview
with (security_invoker = true) as
select
  p.id,
  p.copro_id,
  p.period_id,
  p.lot_id,
  l.ref                                                                 as lot_ref,
  p.amount,
  p.payment_date,
  p.method,
  p.reference,
  p.status,
  p.ledger_tx_id,
  coalesce(sum(pa.amount_allocated), 0)                               as total_allocated,
  p.amount - coalesce(sum(pa.amount_allocated), 0)                     as unallocated,
  count(pa.id)                                                         as allocations_count,
  (
    select cp.first_name || ' ' || cp.last_name
    from public.lot_owners lo
    join public.coproprietaires cp on cp.id = lo.coproprietaire_id
    where lo.lot_id = p.lot_id
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  )                                                                     as owner_name
from public.payments p
join public.lots l                  on l.id = p.lot_id
left join public.payment_allocations pa on pa.payment_id = p.id
group by p.id, l.ref;

comment on view public.v_payments_overview is
  'Encaissements avec montant alloue/non alloue et proprietaire principal du lot.';


-- ============================================================================================
-- A.6  v_bank_movements_overview — RAPPROCHEMENT BANCAIRE (bank_movements + bank_matches)
-- ============================================================================================
-- INTRANT (ne fait PAS autorité sur les soldes : le GL fait foi). Adapté : pas de created_at en cible.
create or replace view public.v_bank_movements_overview
with (security_invoker = true) as
select
  bm.id,
  bm.copro_id,
  bm.period_id,
  bm.bank_date,
  bm.value_date,
  bm.amount_signed,
  case when bm.amount_signed > 0 then 'credit' else 'debit' end         as direction,
  abs(bm.amount_signed)                                                as amount_abs,
  bm.label,
  bm.bank_ref,
  bm.status,
  coalesce(sum(bmt.amount_matched), 0)                                as total_matched,
  abs(bm.amount_signed) - coalesce(sum(bmt.amount_matched), 0)         as remaining_to_match,
  count(bmt.id)                                                        as matches_count
from public.bank_movements bm
left join public.bank_matches bmt on bmt.bank_movement_id = bm.id
group by bm.id;

comment on view public.v_bank_movements_overview is
  'Mouvements bancaires avec etat de rapprochement (bank_matches). Intrant : le GL fait autorite sur les soldes.';


-- ============================================================================================
-- A.7  v_lot_vs_gl_mismatch — DÉTECTION écart RELEVÉ ↔ GRAND LIVRE (Gap G3, grain LOT)
-- ============================================================================================
-- VÉRIFIÉ absent de 0001→0027 (référencé en commentaire de 0027 comme modèle, jamais créé). 0 ligne si
-- conforme. côté GL = v_owner_statement_by_lot.balance (créance 45x par lot, source de référence) ;
-- côté relevé = Σ(amount_due − amount_paid) des call_for_funds_lines non draft/cancelled, au grain LOT
-- (jamais au grain personne : double-compterait une indivision). difference = gl − relevé.
create or replace view public.v_lot_vs_gl_mismatch
with (security_invoker = true) as
with releve as (
  select cfl.copro_id,
         cfl.lot_id,
         sum(cfl.amount_due - coalesce(cfl.amount_paid, 0)) as statement_balance
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  where cf.status not in ('draft', 'cancelled')
  group by cfl.copro_id, cfl.lot_id
)
select
  coalesce(sl.copro_id, r.copro_id)                                    as copro_id,
  coalesce(sl.lot_id, r.lot_id)                                        as lot_id,
  l.ref                                                                 as lot_ref,
  sl.owner_name,
  coalesce(sl.balance, 0)                                              as gl_balance,
  coalesce(r.statement_balance, 0)                                    as statement_balance,
  coalesce(sl.balance, 0) - coalesce(r.statement_balance, 0)          as difference
from public.v_owner_statement_by_lot sl
full outer join releve r on r.lot_id = sl.lot_id and r.copro_id = sl.copro_id
left join public.lots l on l.id = coalesce(sl.lot_id, r.lot_id)
where abs(coalesce(sl.balance, 0) - coalesce(r.statement_balance, 0)) > 0.01;

comment on view public.v_lot_vs_gl_mismatch is
  'Lots dont le solde du releve (call_for_funds_lines du-paye) diverge du solde GL (v_owner_statement_by_lot, 45x). Detection lecture seule (Gap G3), grain lot.';


-- ============================================================================================
-- B.8  get_owner_statement(...) -> jsonb   [G-MIXTE]   — relevé d'un lot/personne, dérivé du GL
-- ============================================================================================
-- Retourne le relevé d'un copropriétaire en SOMMANT ses lots (lit v_owner_statement_by_lot / _by_person).
-- G-MIXTE : gestionnaire de la copro OU propriétaire de l'UN de ses lots. Si p_lot_id fourni, la garde
-- s'appuie sur ce lot (user_is_lot_owner_or_manager) ; sinon garde manager OU possède un lot de la copro.
-- Pas de WHEN OTHERS masquant (les exceptions remontent). Solde = somme des lots de la personne.
create or replace function public.get_owner_statement(
  p_copro_id  uuid,
  p_owner_id  uuid,
  p_period_id uuid default null,
  p_lot_id    uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copro   record;
  v_owner   record;
  v_person  record;
  v_lots    jsonb;
begin
  -- Garde G-MIXTE : manager, ou propriétaire (du lot ciblé sinon d'un lot de la copro).
  if not public.is_service_call() then
    if p_lot_id is not null then
      if not public.user_is_lot_owner_or_manager(p_copro_id, p_lot_id) then
        raise exception 'forbidden: lot owner or manager required for copro %', p_copro_id
          using errcode = '42501';
      end if;
    else
      if not public.user_is_copro_manager(p_copro_id)
         and not public.user_owns_any_lot_in_copro(p_copro_id) then
        raise exception 'forbidden: owner or manager required for copro %', p_copro_id
          using errcode = '42501';
      end if;
    end if;
  end if;

  select id, name, address, siret into v_copro
  from public.copros where id = p_copro_id;
  if not found then
    raise exception 'get_owner_statement: copro % introuvable', p_copro_id using errcode = '23503';
  end if;

  select c.id,
         case when c.is_company then c.company_name
              else coalesce(c.first_name || ' ' || c.last_name, 'Inconnu') end as name,
         c.email
    into v_owner
  from public.coproprietaires c
  where c.id = p_owner_id and c.copro_id = p_copro_id;
  if not found then
    raise exception 'get_owner_statement: coproprietaire % introuvable pour la copro %', p_owner_id, p_copro_id
      using errcode = '23503';
  end if;

  -- Solde DÉRIVÉ = somme des lots de la personne (lot-centric).
  select * into v_person
  from public.v_owner_statement_by_person
  where copro_id = p_copro_id and owner_id = p_owner_id;

  -- Détail des lots possédés (avec leur solde GL).
  select coalesce(jsonb_agg(jsonb_build_object(
           'lot_id',       sl.lot_id,
           'lot_ref',      sl.lot_ref,
           'total_debit',  sl.total_debit,
           'total_credit', sl.total_credit,
           'balance',      sl.balance
         ) order by sl.lot_ref), '[]'::jsonb)
    into v_lots
  from public.v_owner_statement_by_lot sl
  join public.lot_owners lo on lo.lot_id = sl.lot_id
                           and lo.is_primary = true
                           and lo.end_date is null
  where sl.copro_id = p_copro_id
    and lo.coproprietaire_id = p_owner_id
    and (p_lot_id is null or sl.lot_id = p_lot_id);

  return jsonb_build_object(
    'success',      true,
    'generated_at', now(),
    'copro',        jsonb_build_object('id', v_copro.id, 'name', v_copro.name,
                                       'address', v_copro.address, 'siret', v_copro.siret),
    'owner',        jsonb_build_object('id', v_owner.id, 'name', v_owner.name, 'email', v_owner.email),
    'period_id',    p_period_id,
    'summary',      jsonb_build_object(
                      'lots_count',    coalesce(v_person.lots_count, 0),
                      'total_debit',   coalesce(v_person.total_debit, 0),
                      'total_credit',  coalesce(v_person.total_credit, 0),
                      'balance',       coalesce(v_person.balance, 0)
                    ),
    'lots',         v_lots,
    'lots_count',   jsonb_array_length(v_lots)
  );
end;
$$;
revoke execute on function public.get_owner_statement(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.get_owner_statement(uuid, uuid, uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- B.9  fn_dashboard_kpis(p_copro_id, p_period_id) -> jsonb   [G-DEF-RO]   — KPI tableau de bord
-- ============================================================================================
-- KPI dérivés DU GRAND LIVRE (jamais d'un chemin parallèle) : trésorerie = solde réel cumulé des comptes
-- 512 (hors 5121 travaux) ; impayés = Σ v_unpaid_by_lot ; provisions = solde 103/105 (fonds) ; dettes =
-- Σ crédit 40x − débit 40x ; budget voté/réalisé = budget validé courant vs charges 6x réalisées de la
-- période. Legacy FINAL (20260531220000 trésorerie GL + 20260531250000 search_path) ; on s'affranchit de
-- la chaîne fn_annexe_* pour rester robuste et 100 % GL-dérivé. G-DEF-RO.
create or replace function public.fn_dashboard_kpis(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tresorerie    numeric := 0;
  v_impayes       numeric := 0;
  v_provisions    numeric := 0;
  v_dettes        numeric := 0;
  v_budget_vote   numeric := 0;
  v_budget_real   numeric := 0;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- Trésorerie = solde RÉEL cumulé des comptes 512 (hors 5121 travaux), GL posté, toutes périodes.
  select coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0)
    into v_tresorerie
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a            on a.id = e.account_id
  where e.copro_id = p_copro_id and a.code like '512%' and a.code not like '5121%';

  -- Impayé ÉCHU (vue canonique lot-centric).
  select coalesce(sum(total_unpaid), 0) into v_impayes
  from public.v_unpaid_by_lot where copro_id = p_copro_id;

  -- Provisions / réserves (fonds de réserve 103 + fonds travaux ALUR 105), solde créditeur cumulé.
  select coalesce(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 0)
    into v_provisions
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a            on a.id = e.account_id
  where e.copro_id = p_copro_id and (a.code like '103%' or a.code like '105%');

  -- Dettes fournisseurs / tiers (40x), solde créditeur cumulé.
  select coalesce(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 0)
    into v_dettes
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a            on a.id = e.account_id
  where e.copro_id = p_copro_id and a.code like '40%';

  -- Budget courant voté de la période (budget validé, type 'current').
  select coalesce(sum(bl.amount), 0) into v_budget_vote
  from public.budgets b
  join public.budget_lines bl on bl.budget_id = b.id
  where b.copro_id = p_copro_id and b.period_id = p_period_id
    and b.budget_type = 'current' and b.status = 'validated';

  -- Réalisé = charges classe 6 postées de la période (débit − crédit).
  select coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0)
    into v_budget_real
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a            on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_period_id and a.code like '6%';

  return jsonb_build_object(
    'tresorerie',        v_tresorerie,
    'total_impayes',     v_impayes,
    'provisions_travaux', v_provisions,
    'dettes',            v_dettes,
    'budget_vote',       v_budget_vote,
    'budget_realise',    v_budget_real,
    'budget_pct', case when v_budget_vote > 0 then round(v_budget_real / v_budget_vote * 100, 1) else 0 end
  );
end;
$$;
revoke execute on function public.fn_dashboard_kpis(uuid, uuid) from public, anon;
grant execute on function public.fn_dashboard_kpis(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- B.10 calculate_budget_projection(p_copro_id, p_period_id, p_budget_type) -> jsonb   [G-DEF-RO]
-- ============================================================================================
-- Budget vs réalisé par compte de charge (6x), pour un type de budget donné (current/works/alur).
-- voted = Σ budget_lines du budget validé ; realized = Σ charges 6x postées de la période. G-DEF-RO.
create or replace function public.calculate_budget_projection(
  p_copro_id    uuid,
  p_period_id   uuid,
  p_budget_type budget_type default 'current'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lines        jsonb;
  v_total_voted  numeric := 0;
  v_total_real   numeric := 0;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  with voted as (
    select a.code as account_code, max(a.name) as account_name, sum(bl.amount) as voted_amount
    from public.budgets b
    join public.budget_lines bl on bl.budget_id = b.id
    join public.accounts a      on a.id = bl.account_id
    where b.copro_id = p_copro_id and b.period_id = p_period_id
      and b.budget_type = p_budget_type and b.status = 'validated'
    group by a.code
  ),
  realized as (
    select a.code as account_code, max(a.name) as account_name,
           sum(case when e.direction = 'debit' then e.amount else -e.amount end) as realized_amount
    from public.ledger_entries e
    join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
    join public.accounts a            on a.id = e.account_id
    where e.copro_id = p_copro_id and e.period_id = p_period_id and a.code like '6%'
    group by a.code
  ),
  merged as (
    select coalesce(v.account_code, r.account_code)                  as account_code,
           coalesce(v.account_name, r.account_name)                  as account_name,
           coalesce(v.voted_amount, 0)                               as voted_amount,
           coalesce(r.realized_amount, 0)                            as realized_amount
    from voted v
    full outer join realized r on r.account_code = v.account_code
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'account_code',    m.account_code,
           'account_name',    m.account_name,
           'voted_amount',    m.voted_amount,
           'realized_amount', m.realized_amount,
           'remaining',       m.voted_amount - m.realized_amount,
           'consumed_pct',    case when m.voted_amount > 0
                                   then round(m.realized_amount / m.voted_amount * 100, 1) else 0 end
         ) order by m.account_code), '[]'::jsonb),
         coalesce(sum(m.voted_amount), 0),
         coalesce(sum(m.realized_amount), 0)
    into v_lines, v_total_voted, v_total_real
  from merged m;

  return jsonb_build_object(
    'copro_id',        p_copro_id,
    'period_id',       p_period_id,
    'budget_type',     p_budget_type,
    'lines',           v_lines,
    'total_voted',     v_total_voted,
    'total_realized',  v_total_real,
    'total_remaining', v_total_voted - v_total_real,
    'consumed_pct', case when v_total_voted > 0 then round(v_total_real / v_total_voted * 100, 1) else 0 end
  );
end;
$$;
revoke execute on function public.calculate_budget_projection(uuid, uuid, budget_type) from public, anon;
grant execute on function public.calculate_budget_projection(uuid, uuid, budget_type) to authenticated, service_role;


-- ============================================================================================
-- B.11 audit_finance_integrity(p_copro_id) -> TABLE   [G-DEF-RO]   — CONTRÔLE D'INTÉGRITÉ DU GL
-- ============================================================================================
-- CLÉ DE VALIDATION de la boucle d'or (0029). Retourne 0 ligne / 0 écart si la copro est conforme,
-- sinon 1 ligne par anomalie. SELF-CONTAINED, 100 % dérivé du GL (pas de jungle de vues legacy).
-- Détecte :
--   - LEDGER_UNBALANCED : une transaction postée dont Σ débit ≠ Σ crédit (viole la partie double) ;
--   - LOT_ID_MISSING_45X : une ligne 45x postée SANS lot_id (créance copro sans lot, viole lot-centric) ;
--   - LOT_GL_MISMATCH : écart entre le solde du relevé (appels) et le solde GL d'un lot (v_lot_vs_gl_mismatch) ;
--   - CALL_TOTAL_MISMATCH : un appel dont total_amount ≠ Σ amount_due des lignes.
-- Filtre optionnel par copro (p_copro_id NULL = toutes les copros visibles). G-DEF-RO.
create or replace function public.audit_finance_integrity(p_copro_id uuid default null)
returns table (
  entity_type     text,
  entity_id       uuid,
  copro_id        uuid,
  issue_type      text,
  description     text,
  expected_amount numeric,
  actual_amount   numeric,
  difference      numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_copro_id is not null
     and not public.is_service_call()
     and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  return query
  -- 1) Transactions postées déséquilibrées (Σ débit ≠ Σ crédit).
  select
    'ledger_transaction'::text,
    t.id,
    t.copro_id,
    'LEDGER_UNBALANCED'::text,
    ('Transaction desequilibree : ' || t.label)::text,
    sum(case when e.direction = 'debit'  then e.amount else 0 end),
    sum(case when e.direction = 'credit' then e.amount else 0 end),
    sum(case when e.direction = 'debit'  then e.amount else 0 end)
      - sum(case when e.direction = 'credit' then e.amount else 0 end)
  from public.ledger_transactions t
  join public.ledger_entries e on e.tx_id = t.id
  where t.status = 'posted'
    and (p_copro_id is null or t.copro_id = p_copro_id)
  group by t.id, t.copro_id, t.label
  having abs(
    sum(case when e.direction = 'debit'  then e.amount else 0 end)
    - sum(case when e.direction = 'credit' then e.amount else 0 end)
  ) > 0.01

  union all
  -- 2) Lignes 45x postées sans lot_id (créance copro sans lot).
  select
    'ledger_entry'::text,
    e.id,
    e.copro_id,
    'LOT_ID_MISSING_45X'::text,
    ('Ligne compte ' || a.code || ' sans lot_id')::text,
    0::numeric,
    e.amount,
    e.amount
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a            on a.id = e.account_id
  where a.code like '45%'
    and e.lot_id is null
    and (p_copro_id is null or e.copro_id = p_copro_id)

  union all
  -- 3) Écart relevé ↔ GL par lot (Gap G3).
  select
    'lot'::text,
    g.lot_id,
    g.copro_id,
    'LOT_GL_MISMATCH'::text,
    ('Ecart releve/GL - lot ' || coalesce(g.lot_ref, g.lot_id::text))::text,
    g.gl_balance,
    g.statement_balance,
    g.difference
  from public.v_lot_vs_gl_mismatch g
  where (p_copro_id is null or g.copro_id = p_copro_id)

  union all
  -- 4) Appel dont total_amount ≠ Σ amount_due des lignes.
  select
    'call_for_funds'::text,
    cf.id,
    cf.copro_id,
    'CALL_TOTAL_MISMATCH'::text,
    ('Total appel != somme des lignes : ' || cf.label)::text,
    cf.total_amount,
    coalesce(sum(cfl.amount_due), 0),
    cf.total_amount - coalesce(sum(cfl.amount_due), 0)
  from public.call_for_funds cf
  left join public.call_for_funds_lines cfl on cfl.call_id = cf.id
  where cf.status not in ('draft', 'cancelled')
    and (p_copro_id is null or cf.copro_id = p_copro_id)
  group by cf.id, cf.copro_id, cf.label, cf.total_amount
  having abs(cf.total_amount - coalesce(sum(cfl.amount_due), 0)) > 0.01;
end;
$$;
revoke execute on function public.audit_finance_integrity(uuid) from public, anon;
grant execute on function public.audit_finance_integrity(uuid) to authenticated, service_role;

comment on function public.audit_finance_integrity(uuid) is
  'Controle d integrite du GL (cle de validation boucle d or 0029) : detecte tx desequilibree, ligne 45x sans lot_id, ecart releve/GL, ecart total appel/lignes. 0 ligne si conforme.';


-- ============================================================================================
-- B.12 refresh_bank_movement_status(p_movement_id) -> bank_movement_status   [G-MGR]
-- ============================================================================================
-- Met à jour bank_movements.status depuis bank_matches (INTRANT : ne poste PAS le GL). matched si Σ
-- rapproché ≥ |montant|, sinon unmatched ; 'ignored' reste 'ignored'. Garde G-MGR (copro dérivée du mvt).
create or replace function public.refresh_bank_movement_status(p_movement_id uuid)
returns bank_movement_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov          bank_movements%rowtype;
  v_matched      numeric;
  v_new_status   bank_movement_status;
begin
  select * into v_mov from public.bank_movements where id = p_movement_id;
  if not found then
    raise exception 'refresh_bank_movement_status: mouvement % introuvable', p_movement_id
      using errcode = '23503';
  end if;

  if not public.is_service_call() and not public.user_is_copro_manager(v_mov.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_mov.copro_id
      using errcode = '42501';
  end if;

  if v_mov.status = 'ignored' then
    return 'ignored';
  end if;

  select coalesce(sum(amount_matched), 0) into v_matched
  from public.bank_matches where bank_movement_id = p_movement_id;

  if v_matched >= abs(v_mov.amount_signed) then
    v_new_status := 'matched';
  else
    v_new_status := 'unmatched';
  end if;

  update public.bank_movements set status = v_new_status where id = p_movement_id;
  return v_new_status;
end;
$$;
revoke execute on function public.refresh_bank_movement_status(uuid) from public, anon;
grant execute on function public.refresh_bank_movement_status(uuid) to authenticated, service_role;


-- ============================================================================================
-- C — ANNEXES COMPTABLES LÉGALES (décret 2005-240) — libellés EXACTS (mémoire annexes_legales_copro)
-- ============================================================================================
-- Source = ledger_entries (réalisé) / accounts / budgets / repartition_keys. Toutes G-DEF-RO, dérivées
-- du GL posté de la période. Les annexes 3/4/5 portent les libellés LÉGAUX corrigés.

-- C.13 fn_annexe_1 — ÉTAT FINANCIER APRÈS RÉPARTITION (trésorerie, provisions, créances, dettes)
create or replace function public.fn_annexe_1(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tresorerie numeric := 0;
  v_provisions numeric := 0;
  v_creances   numeric := 0;
  v_dettes     numeric := 0;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- Trésorerie = solde des comptes 512 (banque) cumulé toutes périodes (solde de caisse réel).
  select coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0)
    into v_tresorerie
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and a.code like '512%';

  -- Provisions / fonds (103 réserve + 105 fonds travaux ALUR), solde créditeur cumulé.
  select coalesce(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 0)
    into v_provisions
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and (a.code like '103%' or a.code like '105%');

  -- Créances copropriétaires = solde débiteur des comptes 45x cumulé (ce que les lots doivent).
  select coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0)
    into v_creances
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and a.code like '45%';

  -- Dettes fournisseurs / tiers (40x), solde créditeur cumulé.
  select coalesce(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 0)
    into v_dettes
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and a.code like '40%';

  return jsonb_build_object(
    'titre', 'Annexe 1 - Etat financier apres repartition',
    'section_i',  jsonb_build_object(
      'tresorerie',       jsonb_build_object('exercice_clos', v_tresorerie),
      'total_provisions', jsonb_build_object('exercice_clos', v_provisions)
    ),
    'section_ii', jsonb_build_object(
      'creances',     jsonb_build_object('exercice_clos', v_creances),
      'total_dettes', jsonb_build_object('exercice_clos', v_dettes)
    )
  );
end;
$$;
revoke execute on function public.fn_annexe_1(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_1(uuid, uuid) to authenticated, service_role;


-- C.14 fn_annexe_1_detail_copros — créances/dettes DÉTAILLÉES par copropriétaire (somme de ses lots)
create or replace function public.fn_annexe_1_detail_copros(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_detail jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'owner_id',     owner_id,
           'owner_name',   owner_name,
           'lots_count',   lots_count,
           'solde',        balance,
           'sens',         case when balance > 0 then 'creance' when balance < 0 then 'dette' else 'solde' end
         ) order by owner_name), '[]'::jsonb)
    into v_detail
  from public.v_owner_statement_by_person
  where copro_id = p_copro_id;

  return jsonb_build_object(
    'titre', 'Annexe 1 (detail) - Creances et dettes par coproprietaire',
    'coproprietaires', v_detail
  );
end;
$$;
revoke execute on function public.fn_annexe_1_detail_copros(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_1_detail_copros(uuid, uuid) to authenticated, service_role;


-- C.15 fn_annexe_2 — COMPTE DE GESTION GÉNÉRAL (charges 6x / produits 7x : budget voté vs réalisé)
create or replace function public.fn_annexe_2(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_charges  jsonb;
  v_produits jsonb;
  v_tot_charge_vote   numeric := 0;
  v_tot_charge_real   numeric := 0;
  v_tot_produit_real  numeric := 0;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  with realized as (
    select a.code as compte, max(a.name) as libelle,
           sum(case when e.direction = 'debit'  then e.amount else 0 end) as deb,
           sum(case when e.direction = 'credit' then e.amount else 0 end) as cred
    from public.ledger_entries e
    join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
    join public.accounts a on a.id = e.account_id
    where e.copro_id = p_copro_id and e.period_id = p_period_id
      and (a.code like '6%' or a.code like '7%')
    group by a.code
  ),
  budgeted as (
    select a.code as compte, sum(bl.amount) as vote
    from public.budgets b
    join public.budget_lines bl on bl.budget_id = b.id
    join public.accounts a      on a.id = bl.account_id
    where b.copro_id = p_copro_id and b.period_id = p_period_id and b.status = 'validated'
    group by a.code
  ),
  charge_lines as (
    select r.compte, r.libelle,
           coalesce(bg.vote, 0)        as ex_clos_budget_vote,
           (r.deb - r.cred)            as ex_clos_realise
    from realized r
    left join budgeted bg on bg.compte = r.compte
    where r.compte like '6%'
  ),
  product_lines as (
    select r.compte, r.libelle,
           coalesce(bg.vote, 0)        as ex_clos_budget_vote,
           (r.cred - r.deb)            as ex_clos_realise
    from realized r
    left join budgeted bg on bg.compte = r.compte
    where r.compte like '7%'
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object(
       'compte', cl.compte, 'libelle', cl.libelle,
       'ex_clos_budget_vote', cl.ex_clos_budget_vote, 'ex_clos_realise', cl.ex_clos_realise
     ) order by cl.compte) from charge_lines cl), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
       'compte', pl.compte, 'libelle', pl.libelle,
       'ex_clos_budget_vote', pl.ex_clos_budget_vote, 'ex_clos_realise', pl.ex_clos_realise
     ) order by pl.compte) from product_lines pl), '[]'::jsonb),
    coalesce((select sum(ex_clos_budget_vote) from charge_lines), 0),
    coalesce((select sum(ex_clos_realise)     from charge_lines), 0),
    coalesce((select sum(ex_clos_realise)     from product_lines), 0)
  into v_charges, v_produits, v_tot_charge_vote, v_tot_charge_real, v_tot_produit_real;

  return jsonb_build_object(
    'titre', 'Annexe 2 - Compte de gestion general (charges et produits)',
    'charges_courantes', v_charges,
    'produits_courants', v_produits,
    'total_i_charges', jsonb_build_object(
      'ex_clos_budget_vote', v_tot_charge_vote,
      'ex_clos_realise',     v_tot_charge_real
    ),
    'total_produits', jsonb_build_object('ex_clos_realise', v_tot_produit_real),
    'resultat_exercice', v_tot_produit_real - v_tot_charge_real
  );
end;
$$;
revoke execute on function public.fn_annexe_2(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_2(uuid, uuid) to authenticated, service_role;


-- C.16 fn_annexe_3 — VENTILATION DES CHARGES PAR CLÉ DE RÉPARTITION (libellé légal corrigé)
create or replace function public.fn_annexe_3(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cles jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- Ventilation des charges budgétées de la période par clé de répartition (assiette = budget_lines).
  with par_cle as (
    select rk.id as key_id, rk.name as key_name, rk.category,
           coalesce(sum(bl.amount), 0) as montant
    from public.repartition_keys rk
    left join public.budget_lines bl on bl.repartition_key_id = rk.id and bl.copro_id = p_copro_id
    left join public.budgets b       on b.id = bl.budget_id and b.period_id = p_period_id
                                    and b.status = 'validated'
    where rk.copro_id = p_copro_id
    group by rk.id, rk.name, rk.category
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'cle_id',   key_id,
           'cle',      key_name,
           'categorie', category,
           'montant',  montant
         ) order by key_name), '[]'::jsonb)
    into v_cles
  from par_cle;

  return jsonb_build_object(
    'titre', 'Annexe 3 - Ventilation des charges par cle de repartition',
    'cles', v_cles
  );
end;
$$;
revoke execute on function public.fn_annexe_3(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_3(uuid, uuid) to authenticated, service_role;


-- C.17 fn_annexe_4 — TRAVAUX TERMINÉS (art.14-2) — opérations de travaux clôturées (libellé corrigé)
create or replace function public.fn_annexe_4(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_operations jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- Budgets travaux CLÔTURÉS (status='closed') : montant voté vs réalisé (charges 6x cumulées, tous exercices).
  -- Réalisé via EXISTS (anti fan-out) : un budget peut avoir PLUSIEURS budget_lines sur le MÊME compte 6x
  -- (ventilation multi-clés) ; un JOIN budget_lines multiplierait chaque écriture du GL -> EXISTS = 1x.
  with works as (
    select b.id as budget_id, b.name as label, b.period_id,
           coalesce((select sum(bl.amount) from public.budget_lines bl where bl.budget_id = b.id), 0) as vote,
           coalesce((
             select sum(case when e.direction = 'debit' then e.amount else -e.amount end)
             from public.ledger_entries e
             join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
             join public.accounts a on a.id = e.account_id
             where e.copro_id = p_copro_id and a.code like '6%'
               and exists (
                 select 1 from public.budget_lines bl
                 where bl.budget_id = b.id and bl.account_id = e.account_id
               )
           ), 0) as realise
    from public.budgets b
    where b.copro_id = p_copro_id and b.budget_type = 'works' and b.status = 'closed'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'budget_id', budget_id,
           'libelle',   label,
           'vote',      vote,
           'realise',   realise,
           'solde',     vote - realise
         ) order by label), '[]'::jsonb)
    into v_operations
  from works;

  return jsonb_build_object(
    'titre', 'Annexe 4 - Travaux et operations exceptionnelles termines (art. 14-2)',
    'operations', v_operations
  );
end;
$$;
revoke execute on function public.fn_annexe_4(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_4(uuid, uuid) to authenticated, service_role;


-- C.18 fn_annexe_5 — TRAVAUX NON CLÔTURÉS / EN COURS (libellé corrigé)
create or replace function public.fn_annexe_5(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_operations jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- Budgets travaux NON clôturés (validés, en cours) : voté vs réalisé cumulé (toutes périodes).
  -- Réalisé via EXISTS (anti fan-out) : un budget peut avoir PLUSIEURS budget_lines sur le MÊME compte 6x
  -- (ventilation multi-clés) ; un JOIN budget_lines multiplierait chaque écriture du GL -> EXISTS = 1x.
  with works as (
    select b.id as budget_id, b.name as label,
           coalesce((select sum(bl.amount) from public.budget_lines bl where bl.budget_id = b.id), 0) as vote,
           coalesce((
             select sum(case when e.direction = 'debit' then e.amount else -e.amount end)
             from public.ledger_entries e
             join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
             join public.accounts a on a.id = e.account_id
             where e.copro_id = p_copro_id and a.code like '6%'
               and exists (
                 select 1 from public.budget_lines bl
                 where bl.budget_id = b.id and bl.account_id = e.account_id
               )
           ), 0) as realise
    from public.budgets b
    where b.copro_id = p_copro_id and b.budget_type = 'works' and b.status = 'validated'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'budget_id', budget_id,
           'libelle',   label,
           'vote',      vote,
           'realise',   realise,
           'solde',     vote - realise
         ) order by label), '[]'::jsonb)
    into v_operations
  from works;

  return jsonb_build_object(
    'titre', 'Annexe 5 - Etat des travaux non clotures / en cours (art. 14-2)',
    'operations', v_operations
  );
end;
$$;
revoke execute on function public.fn_annexe_5(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_5(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- D — RELANCES IMPAYÉS (domaine 03 §H) — seuls objets qui écrivent (payment_reminders, JAMAIS le GL)
-- ============================================================================================

-- D.19 v_unpaid_lot_owner — helper interne : impayés par lot + owner_id du propriétaire principal actif.
-- Réutilise v_unpaid_by_lot (owner_name/email) et résout owner_id via lot_owners (lots n'a PAS owner_id).
create or replace view public.v_unpaid_lot_owner
with (security_invoker = true) as
select
  u.copro_id,
  u.lot_id,
  u.lot_ref,
  (
    select lo.coproprietaire_id
    from public.lot_owners lo
    where lo.lot_id = u.lot_id
      and lo.is_primary = true
      and lo.end_date is null
    limit 1
  )                                  as owner_id,
  u.owner_name,
  u.owner_email,
  u.total_unpaid,
  u.unpaid_lines_count,
  u.oldest_due_date,
  u.days_overdue
from public.v_unpaid_by_lot u;

comment on view public.v_unpaid_lot_owner is
  'Impayes par lot enrichis de owner_id (proprietaire principal actif via lot_owners). Base des relances.';


-- D.20 get_pending_reminders_to_send(p_copro_id) -> TABLE   [G-DEF-RO]
-- Croise les impayés (v_unpaid_lot_owner) avec les règles actives, en excluant les paliers déjà relancés.
-- RÉÉCRIT : le legacy dérivait le propriétaire via lots.owner_id (INEXISTANT) → owner_id vient de
-- v_unpaid_lot_owner (lot_owners). G-DEF-RO (accès copro requis).
create or replace function public.get_pending_reminders_to_send(p_copro_id uuid)
returns table (
  lot_id          uuid,
  lot_ref         text,
  owner_id        uuid,
  owner_name      text,
  owner_email     text,
  unpaid_amount   numeric,
  oldest_due_date date,
  days_overdue    integer,
  delay_level     integer,
  rule_id         uuid,
  template_id     uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  return query
  with active_rules as (
    select prr.id as rule_id, prr.delay_days, prr.template_id
    from public.payment_reminder_rules prr
    where prr.copro_id = p_copro_id and prr.is_active = true and prr.channel = 'email'
  ),
  unpaid as (
    select u.lot_id, u.lot_ref, u.owner_id, u.owner_name, u.owner_email,
           u.total_unpaid, u.oldest_due_date, u.days_overdue
    from public.v_unpaid_lot_owner u
    where u.copro_id = p_copro_id
      and u.total_unpaid > 0
      and u.owner_email is not null
  ),
  already_sent as (
    select distinct pr.lot_id, pr.delay_level
    from public.payment_reminders pr
    where pr.copro_id = p_copro_id and pr.status in ('sent', 'pending')
  )
  select
    ul.lot_id,
    ul.lot_ref,
    ul.owner_id,
    ul.owner_name,
    ul.owner_email,
    ul.total_unpaid                                  as unpaid_amount,
    ul.oldest_due_date,
    ul.days_overdue::integer,
    ar.delay_days                                    as delay_level,
    ar.rule_id,
    ar.template_id
  from unpaid ul
  cross join active_rules ar
  where ul.days_overdue >= ar.delay_days
    and not exists (
      select 1 from already_sent a
      where a.lot_id = ul.lot_id and a.delay_level = ar.delay_days
    )
  order by ul.days_overdue desc, ar.delay_days asc;
end;
$$;
revoke execute on function public.get_pending_reminders_to_send(uuid) from public, anon;
grant execute on function public.get_pending_reminders_to_send(uuid) to authenticated, service_role;


-- D.21 create_payment_reminder(...) -> uuid   [G-MGR]   — INSERT payment_reminders (pending)
create or replace function public.create_payment_reminder(
  p_copro_id        uuid,
  p_lot_id          uuid,
  p_owner_id        uuid,
  p_unpaid_amount   numeric,
  p_oldest_due_date date,
  p_days_overdue    integer,
  p_delay_level     integer,
  p_rule_id         uuid,
  p_recipient_email text,
  p_recipient_name  text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reminder_id uuid;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id using errcode = '42501';
  end if;

  insert into public.payment_reminders (
    copro_id, lot_id, owner_id,
    unpaid_amount, oldest_due_date, days_overdue,
    delay_level, reminder_rule_id,
    recipient_email, recipient_name,
    status, delivery_status, scheduled_at, created_by
  ) values (
    p_copro_id, p_lot_id, p_owner_id,
    p_unpaid_amount, p_oldest_due_date, p_days_overdue,
    p_delay_level, p_rule_id,
    p_recipient_email, p_recipient_name,
    'pending', 'pending', now(), auth.uid()
  )
  returning id into v_reminder_id;

  return v_reminder_id;
end;
$$;
revoke execute on function public.create_payment_reminder(uuid, uuid, uuid, numeric, date, integer, integer, uuid, text, text) from public, anon;
grant execute on function public.create_payment_reminder(uuid, uuid, uuid, numeric, date, integer, integer, uuid, text, text) to authenticated, service_role;


-- D.22 mark_reminder_sent(...) -> void   [G-MGR + service_role pour callback provider]
create or replace function public.mark_reminder_sent(
  p_reminder_id         uuid,
  p_provider_message_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_copro uuid;
begin
  select copro_id into v_copro from public.payment_reminders where id = p_reminder_id;
  if v_copro is null then
    raise exception 'mark_reminder_sent: relance % introuvable', p_reminder_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: manager required for copro %', v_copro using errcode = '42501';
  end if;

  update public.payment_reminders
  set status = 'sent',
      delivery_status = 'sent',
      sent_at = now(),
      provider_message_id = coalesce(p_provider_message_id, provider_message_id)
  where id = p_reminder_id;
end;
$$;
revoke execute on function public.mark_reminder_sent(uuid, text) from public, anon;
grant execute on function public.mark_reminder_sent(uuid, text) to authenticated, service_role;


-- D.23 mark_reminder_failed(...) -> void   [G-MGR + service_role pour callback provider]
create or replace function public.mark_reminder_failed(
  p_reminder_id   uuid,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_copro uuid;
begin
  select copro_id into v_copro from public.payment_reminders where id = p_reminder_id;
  if v_copro is null then
    raise exception 'mark_reminder_failed: relance % introuvable', p_reminder_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: manager required for copro %', v_copro using errcode = '42501';
  end if;

  -- Échec = état terminal : on horodate (cancelled_at) en cohérence avec cancelled_reason (pas de
  -- colonne failed_at dédiée en cible ; cancelled_at sert de timestamp de clôture pour failed/stale).
  update public.payment_reminders
  set status = 'failed',
      delivery_status = 'failed',
      cancelled_at = now(),
      cancelled_reason = p_error_message
  where id = p_reminder_id;
end;
$$;
revoke execute on function public.mark_reminder_failed(uuid, text) from public, anon;
grant execute on function public.mark_reminder_failed(uuid, text) to authenticated, service_role;


-- D.24 cancel_stale_reminders(p_copro_id) -> integer   [G-MGR]   — lots soldés -> status 'stale'
create or replace function public.cancel_stale_reminders(p_copro_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cancelled integer;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id using errcode = '42501';
  end if;

  with paid_lots as (
    select l.id as lot_id
    from public.lots l
    where l.copro_id = p_copro_id
      and not exists (
        select 1 from public.v_unpaid_by_lot u
        where u.lot_id = l.id and u.total_unpaid > 0
      )
  )
  update public.payment_reminders pr
  set status = 'stale',
      cancelled_at = now(),
      cancelled_reason = 'Paiement recu - relance annulee automatiquement'
  from paid_lots pl
  where pr.lot_id = pl.lot_id
    and pr.copro_id = p_copro_id
    and pr.status = 'pending';

  get diagnostics v_cancelled = row_count;
  return v_cancelled;
end;
$$;
revoke execute on function public.cancel_stale_reminders(uuid) from public, anon;
grant execute on function public.cancel_stale_reminders(uuid) to authenticated, service_role;


-- D.25 is_reminders_paused(p_copro_id) -> TABLE   [G-DEF-RO]   — lit reminder_settings
create or replace function public.is_reminders_paused(p_copro_id uuid)
returns table (
  is_paused    boolean,
  paused_until date,
  pause_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  return query
  select coalesce(rs.is_paused, false), rs.paused_until, rs.pause_reason
  from public.reminder_settings rs
  where rs.copro_id = p_copro_id
    and rs.is_paused = true
    and (rs.paused_until is null or rs.paused_until >= current_date);

  if not found then
    return query select false, null::date, null::text;
  end if;
end;
$$;
revoke execute on function public.is_reminders_paused(uuid) from public, anon;
grant execute on function public.is_reminders_paused(uuid) to authenticated, service_role;


-- ============================================================================================
-- D.26 create_default_reminder_rules() [G-TRIG SEED] — AFTER INSERT copros, NON BLOQUANT
-- ============================================================================================
-- ROBUSTESSE OBLIGATOIRE : les email_templates système (payment_reminder_7/30/60) ne sont seedés QU'EN
-- 0034. Le trigger LIT les templates par code en LEFT JOIN — template_id NULL ACCEPTÉ (FK nullable,
-- ON DELETE SET NULL en 0016). Sans cette robustesse, TOUTE création de copro (y compris les harnais)
-- casserait. ON CONFLICT DO NOTHING = idempotent. SECURITY DEFINER + REVOKE (jamais appelé directement).
create or replace function public.create_default_reminder_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t7  uuid;
  v_t30 uuid;
  v_t60 uuid;
begin
  -- LEFT JOIN logique : NULL si le template n'existe pas encore (seedé en 0034). Jamais de RAISE.
  select id into v_t7  from public.email_templates where code = 'payment_reminder_7'  and copro_id is null limit 1;
  select id into v_t30 from public.email_templates where code = 'payment_reminder_30' and copro_id is null limit 1;
  select id into v_t60 from public.email_templates where code = 'payment_reminder_60' and copro_id is null limit 1;

  insert into public.payment_reminder_rules (copro_id, delay_days, channel, template_id, label, is_active)
  values
    (new.id,  7, 'email', v_t7,  '1ere relance amiable (J+7)', true),
    (new.id, 30, 'email', v_t30, '2eme relance (J+30)', true),
    (new.id, 60, 'email', v_t60, 'Dernier rappel avant conseil syndical (J+60)', true)
  on conflict (copro_id, delay_days) do nothing;

  return new;
end;
$$;
revoke execute on function public.create_default_reminder_rules() from public, anon, authenticated;

create trigger trg_create_default_reminder_rules
  after insert on public.copros
  for each row execute function public.create_default_reminder_rules();


-- ============================================================================================
-- D.27 create_default_reminder_settings() [G-TRIG SEED] — AFTER INSERT copros, NON BLOQUANT
-- ============================================================================================
-- INSERT reminder_settings(copro_id) ON CONFLICT DO NOTHING (singleton/copro, PK = copro_id). Idempotent.
create or replace function public.create_default_reminder_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reminder_settings (copro_id)
  values (new.id)
  on conflict (copro_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.create_default_reminder_settings() from public, anon, authenticated;

create trigger trg_create_default_reminder_settings
  after insert on public.copros
  for each row execute function public.create_default_reminder_settings();


-- FIN 0028_derives_vues_annexes.sql
