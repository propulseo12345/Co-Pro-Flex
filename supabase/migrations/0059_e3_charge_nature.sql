-- 0059_e3_charge_nature.sql
-- ============================================================================================
-- E3 (DECISIONS.md, 2026-06-10) — Colonne accounts.charge_nature ('courant'|'travaux').
--
-- Remplace la LISTE EN DUR des comptes travaux (671,672,673,674,677,678,702,705,706), dupliquée
-- dans open_next_period et v_result_allocation_split, par une COLONNE de classification sur accounts.
-- Source unique = le seed (provision_copro_chart) + le backfill ci-dessous.
--
-- CLASSIFICATION (sourcée arrêté 14 mars 2005 + recherche, validée Lyes 2026-06-14) :
--   TRAVAUX = 671,672,673,674,677,678 (charges travaux/exceptionnel) + 6221 (honoraires travaux du
--     syndic, appelés avec les travaux via 702) + 702,705,706 (produits travaux). Tout autre 6x/7x = COURANT.
--   Correction vs liste en dur : +6221 (était mal classé en courant). 677 CONSERVÉ travaux (absent du
--     chart mais légitimement exceptionnel — iso-comportement si une copro legacy en possède un).
--   711 (subventions) = COURANT par défaut -> bascule travaux via operation_id (E4).
--
-- CHECK miroir : charge_nature obligatoire ssi compte de classe 6/7, interdite ailleurs.
-- Précédence operation_id (E4) = travaux quoi qu'il arrive -> câblée en E4 (pas E3).
-- fn_annexe_2 lira la colonne lors de la réécriture en 2 blocs (E8). NE PAS éditer 0056/0057.
-- ============================================================================================

-- ── 1. Colonne + backfill + CHECK miroir ────────────────────────────────────────────────────
alter table public.accounts add column if not exists charge_nature text;

update public.accounts set charge_nature =
  case when code in ('671','672','673','674','677','678','6221','702','705','706') then 'travaux'
       when substr(code, 1, 1) in ('6', '7') then 'courant' else null end;

alter table public.accounts drop constraint if exists ck_accounts_charge_nature;
-- NB : un CHECK passe quand l'expression vaut NULL (seul FALSE bloque). `charge_nature in (...)` vaut
-- NULL si charge_nature est NULL -> il faut un `is not null` explicite, sinon un 6/7 à NULL passerait.
alter table public.accounts add constraint ck_accounts_charge_nature check (
  case when substr(code, 1, 1) in ('6', '7')
       then charge_nature is not null and charge_nature in ('courant', 'travaux')
       else charge_nature is null
  end
);

comment on column public.accounts.charge_nature is
  'E3 : nature de charge ''courant'' | ''travaux'' (classe 6/7 uniquement, NULL ailleurs). Source de classification courant/travaux pour open_next_period et v_result_allocation_split (remplace la liste en dur). Précédence operation_id (E4) à venir.';


-- ── 2. provision_copro_chart : seed de charge_nature pour les futures copros ─────────────────
create or replace function public.provision_copro_chart(p_copro_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.copros where id = p_copro_id) then
    raise exception 'provision_copro_chart: copropriété % introuvable', p_copro_id;
  end if;

  with chart(code, name, atype, nature) as (
    values
      -- CLASSE 1 — Provisions, avances, subventions, emprunts
      ('102',  'Provisions pour travaux décidés',                          'equity',    null),
      ('103',  'Avances',                                                  'equity',    null),
      ('1031', 'Avance de trésorerie',                                     'equity',    null),
      ('1032', 'Avance travaux (art. 18)',                                 'equity',    null),
      ('1033', 'Autres avances',                                           'equity',    null),
      ('105',  'Fonds de travaux ALUR (art. 14-2 II)',                     'equity',    null),
      ('12',  'Solde en attente sur travaux et opérations exceptionnelles','equity',   null),
      ('478',  'Solde en attente sur opérations courantes',               'equity',    null),
      ('131',  'Subventions accordées, en instance de versement',         'equity',    null),
      ('132',  'Subventions encaissées',                                  'equity',    null),
      ('164',  'Emprunts collectifs',                                     'liability', null),
      -- CLASSE 4 — Tiers
      ('401',  'Fournisseurs - Factures parvenues',                       'liability', null),
      ('408',  'Fournisseurs - Factures non parvenues',                   'liability', null),
      ('409',  'Fournisseurs débiteurs',                                  'asset',     null),
      ('420',  'Personnel - Avances et acomptes',                         'asset',     null),
      ('421',  'Personnel - Rémunérations dues',                          'liability', null),
      ('431',  'Sécurité sociale',                                        'liability', null),
      ('432',  'Autres organismes sociaux',                               'liability', null),
      ('442',  'État - Impôts et taxes',                                  'liability', null),
      ('450',  'Copropriétaires - Comptes individualisés',               'asset',     null),
      ('450-1','Copropriétaires - Budget prévisionnel',                   'asset',     'current'),
      ('450-2','Copropriétaires - Travaux art. 14-2',                     'asset',     'works'),
      ('450-3','Copropriétaires - Avances',                               'asset',     'advance'),
      ('450-4','Copropriétaires - Emprunts',                              'asset',     'loan'),
      ('450-5','Copropriétaires - Fonds de travaux ALUR',                 'asset',     'alur'),
      ('459',  'Copropriétaires - Créances douteuses',                    'asset',     'doubtful'),
      ('461',  'Débiteurs divers',                                        'asset',     null),
      ('462',  'Créditeurs divers',                                       'liability', null),
      ('471',  'Attente d''imputation débiteur',                          'asset',     null),
      ('472',  'Attente d''imputation créditeur',                         'liability', null),
      ('486',  'Charges constatées d''avance',                            'asset',     null),
      ('487',  'Produits encaissés d''avance',                            'liability', null),
      ('491',  'Dépréciation - Copropriétaires',                          'liability', null),
      ('492',  'Dépréciation - Autres tiers',                             'liability', null),
      -- CLASSE 5 — Financiers
      ('501',  'Compte à terme',                                          'asset',     null),
      ('502',  'Livret A (fonds travaux)',                                'asset',     null),
      ('512',  'Banque',                                                  'asset',     null),
      ('514',  'Chèques postaux',                                         'asset',     null),
      ('531',  'Caisse',                                                  'asset',     null),
      -- CLASSE 6 — Charges
      ('601',  'Eau',                                                     'expense',   null),
      ('602',  'Électricité',                                             'expense',   null),
      ('603',  'Chauffage, énergie et combustibles',                      'expense',   null),
      ('604',  'Achats produits d''entretien et petits équipements',      'expense',   null),
      ('611',  'Nettoyage des locaux',                                    'expense',   null),
      ('612',  'Locations immobilières',                                  'expense',   null),
      ('613',  'Locations mobilières',                                    'expense',   null),
      ('614',  'Contrats de maintenance',                                 'expense',   null),
      ('615',  'Entretien et petites réparations',                        'expense',   null),
      ('616',  'Primes d''assurances',                                    'expense',   null),
      ('617',  'Frais de personnel',                                      'expense',   null),
      ('621',  'Rémunération du syndic - gestion copropriété',            'expense',   null),
      ('6211', 'Rémunération forfaitaire du syndic',                      'expense',   null),
      ('6212', 'Débours',                                                 'expense',   null),
      ('6213', 'Frais postaux',                                           'expense',   null),
      ('622',  'Autres honoraires du syndic',                             'expense',   null),
      ('6221', 'Honoraires travaux',                                      'expense',   null),
      ('6222', 'Prestations particulières',                              'expense',   null),
      ('623',  'Rémunérations de tiers intervenants',                     'expense',   null),
      ('624',  'Frais du conseil syndical',                               'expense',   null),
      ('625',  'Honoraires',                                              'expense',   null),
      ('627',  'Frais d''assemblées générales',                           'expense',   null),
      ('628',  'Frais divers de gestion',                                 'expense',   null),
      ('632',  'Taxe de balayage',                                        'expense',   null),
      ('633',  'Taxe foncière',                                           'expense',   null),
      ('634',  'Autres impôts et taxes',                                  'expense',   null),
      ('661',  'Remboursement annuités d''emprunt',                       'expense',   null),
      ('662',  'Autres charges financières et agios',                     'expense',   null),
      ('671',  'Travaux décidés par l''AG',                               'expense',   null),
      ('672',  'Travaux urgents (art. 18)',                               'expense',   null),
      ('673',  'Études techniques, diagnostics, consultations',           'expense',   null),
      ('674',  'Travaux délégués au conseil syndical',                    'expense',   null),
      ('678',  'Autres opérations exceptionnelles',                       'expense',   null),
      -- CLASSE 7 — Produits
      ('701',  'Provisions sur opérations courantes',                     'income',    null),
      ('702',  'Provisions sur travaux et opérations exceptionnelles',    'income',    null),
      ('703',  'Avances',                                                 'income',    null),
      ('704',  'Remboursements d''annuités d''emprunts',                  'income',    null),
      ('705',  'Affectation du fonds de travaux',                         'income',    null),
      ('706',  'Provisions délégation de pouvoirs au CS',                 'income',    null),
      ('711',  'Subventions',                                             'income',    null),
      ('713',  'Indemnités d''assurances',                                'income',    null),
      ('714',  'Produits divers',                                         'income',    null),
      ('716',  'Produits financiers',                                     'income',    null)
  )
  insert into public.accounts (copro_id, code, name, account_type, nature, is_system, is_postable, charge_nature)
  select
    p_copro_id,
    c.code,
    c.name,
    c.atype::public.account_type,
    c.nature::public.account_receivable_nature,
    (c.code = '450'),          -- is_system : chapeau agrégateur uniquement (protégé)
    (c.code <> '450'),         -- is_postable : false sur le chapeau, true sur tout le reste
    -- E3 : nature de charge dérivée du code (source unique de classification courant/travaux)
    case when c.code in ('671','672','673','674','677','678','6221','702','705','706') then 'travaux'
         when substr(c.code, 1, 1) in ('6', '7') then 'courant' else null end
  from chart c
  on conflict (copro_id, code) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;
revoke execute on function public.provision_copro_chart(uuid) from public, anon;
grant execute on function public.provision_copro_chart(uuid) to authenticated, service_role;

-- ── 3. open_next_period : lit accounts.charge_nature (fin de la liste en dur) ──────────────────────────────────────────────────────
create or replace function public.open_next_period(
  p_copro_id          uuid,
  p_closing_period_id uuid,
  p_new_name          text default null,
  p_new_start         date default null,
  p_new_end           date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n            accounting_periods%rowtype;
  v_next_id      uuid;
  v_next_start   date;
  v_next_end     date;
  v_next_name    text;
  v_existing_tx  uuid;
  v_existing_dst period_status;
  v_acct_120     uuid;
  v_acct_110     uuid;
  v_carry        jsonb;
  v_net_courant  numeric;
  v_net_travaux  numeric;
  v_result_entry jsonb;
  v_entries      jsonb;
  v_tx_res       jsonb;
  v_rev          jsonb;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  select * into v_n from public.accounting_periods where id = p_closing_period_id and copro_id = p_copro_id;
  if not found then
    raise exception 'open_next_period: exercice de clôture % introuvable pour la copro %', p_closing_period_id, p_copro_id
      using errcode = '23503';
  end if;
  if v_n.status = 'open' then
    raise exception 'open_next_period: clôturez d''abord l''exercice N (close_period) — statut actuel %', v_n.status
      using errcode = '23514';
  end if;

  select id into v_acct_120 from public.accounts where copro_id = p_copro_id and code = '478';
  if v_acct_120 is null then
    raise exception 'open_next_period: compte d''attente courant (478) absent pour la copro %', p_copro_id
      using errcode = '23503';
  end if;
  select id into v_acct_110 from public.accounts where copro_id = p_copro_id and code = '12';
  if v_acct_110 is null then
    raise exception 'open_next_period: compte d''attente travaux (12) absent pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Idempotence : reprise déjà posée ? Le remplacement n'est permis que si NI l'exercice source N NI
  -- l'exercice d'ACCUEIL (period_id de la reprise existante = N+1) ne sont approuvés (exemption
  -- is_ledger_regen_exempt, 0024). Sinon message métier clair AVANT le trigger d'immutabilité GL.
  select t.id, ap.status into v_existing_tx, v_existing_dst
  from public.ledger_transactions t
  join public.accounting_periods ap on ap.id = t.period_id
  where t.copro_id = p_copro_id and t.source_type = 'opening_balance' and t.source_id = p_closing_period_id;
  if v_existing_tx is not null and (v_n.status = 'approved' or v_existing_dst = 'approved') then
    raise exception 'open_next_period: reprise figée — exercice approuvé en AG (source % ou accueil), report à-nouveau interdit', p_closing_period_id
      using errcode = '23514';
  end if;
  if v_existing_tx is not null then
    delete from public.ledger_transactions where id = v_existing_tx;
  end if;

  -- Volet 1 : à-nouveaux des soldes de BILAN (1xx/4xx/5xx), par compte×lot, sens selon le net.
  select jsonb_agg(jsonb_build_object(
           'account_id', x.account_id, 'lot_id', x.lot_id,
           'direction', case when x.net > 0 then 'debit' else 'credit' end,
           'amount', abs(x.net), 'entry_label', 'Report à-nouveau'))
    into v_carry
  from (
    select e.account_id, e.lot_id,
           round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) as net
    from public.ledger_entries e
    join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
    join public.accounts a on a.id = e.account_id
    where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
      and substr(a.code, 1, 1) in ('1', '4', '5')
    group by e.account_id, e.lot_id
    having round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) <> 0
  ) x;

  -- Volet 2 : résultat COURANT (classes 6/7 hors comptes travaux/exceptionnels).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_net_courant
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
    and a.charge_nature = 'courant';

  -- Volet 2 (suite) : résultat TRAVAUX / exceptionnel (comptes ci-dessus).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_net_travaux
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
    and a.charge_nature = 'travaux';

  v_result_entry := '[]'::jsonb;
  if v_net_courant <> 0 then
    v_result_entry := v_result_entry || jsonb_build_array(jsonb_build_object(
      'account_id', v_acct_120, 'lot_id', null,
      'direction', case when v_net_courant < 0 then 'credit' else 'debit' end,
      'amount', abs(v_net_courant), 'entry_label', 'Résultat courant ' || v_n.name));
  end if;
  if v_net_travaux <> 0 then
    v_result_entry := v_result_entry || jsonb_build_array(jsonb_build_object(
      'account_id', v_acct_110, 'lot_id', null,
      'direction', case when v_net_travaux < 0 then 'credit' else 'debit' end,
      'amount', abs(v_net_travaux), 'entry_label', 'Résultat travaux ' || v_n.name));
  end if;

  v_entries := coalesce(v_carry, '[]'::jsonb) || v_result_entry;
  if jsonb_array_length(v_entries) = 0 then
    raise exception 'open_next_period: aucun solde à reporter pour l''exercice %', p_closing_period_id
      using errcode = '23514';
  end if;

  -- Calcul des bornes de N+1 (décalage d'un an par défaut) et création/réouverture.
  v_next_start := coalesce(p_new_start, (v_n.start_date + interval '1 year')::date);
  v_next_end   := coalesce(p_new_end,   (v_n.end_date   + interval '1 year')::date);
  v_next_name  := coalesce(p_new_name,  'Exercice ' || extract(year from v_next_start)::int);

  select id into v_next_id
  from public.accounting_periods
  where copro_id = p_copro_id and start_date = v_next_start and end_date = v_next_end;
  if v_next_id is null then
    insert into public.accounting_periods (copro_id, name, start_date, end_date, status)
    values (p_copro_id, v_next_name, v_next_start, v_next_end, 'open')
    returning id into v_next_id;
  else
    update public.accounting_periods set status = 'open' where id = v_next_id and status <> 'open';
  end if;

  -- À-nouveau posté en N+1 OUVERTE (create_ledger_transaction l'exige ; auto-post équilibré).
  v_tx_res := public.create_ledger_transaction(
    p_copro_id, v_next_id, v_next_start,
    'À-nouveau — reprise des soldes ' || v_n.name || ' → ' || v_next_name,
    'opening_balance', p_closing_period_id, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'open_next_period: échec de la reprise à-nouveau : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  -- Contre-passation du cut-off de N dans N+1 (les charges constatées d'avance/à payer s'extournent).
  v_rev := public.reverse_period_cutoff(p_copro_id, p_closing_period_id);
  if not (v_rev->>'success')::boolean then
    raise exception 'open_next_period: extourne cut-off échouée (période %) : %', p_closing_period_id, v_rev->>'error'
      using errcode = '23514';
  end if;

  return jsonb_build_object(
    'success', true, 'next_period_id', v_next_id, 'next_period_name', v_next_name,
    'opening_tx_id', v_tx_res->>'tx_id', 'carry_lines', coalesce(jsonb_array_length(v_carry), 0),
    'result_courant', v_net_courant, 'result_travaux', v_net_travaux,
    'result_to_478', abs(v_net_courant), 'result_to_12', abs(v_net_travaux),
    'cutoff_reversal', v_rev
  );
end;
$$;
revoke execute on function public.open_next_period(uuid, uuid, text, date, date) from public, anon;
grant execute on function public.open_next_period(uuid, uuid, text, date, date) to authenticated, service_role;

-- ── 4. v_result_allocation_split : result_src lit accounts.charge_nature ──────────────────────────────────────────────────────
create or replace view public.v_result_allocation_split
with (security_invoker = true) as
with alloc_tx as (
  select t.id as tx_id, t.copro_id, t.period_id, t.source_id as source_period_id
  from public.ledger_transactions t
  where t.source_type = 'result_allocation' and t.status = 'posted'
),
mv as (
  -- mv_120 suit le compte d'attente COURANT (478), mv_110 le compte TRAVAUX (12). Noms conservés (B3).
  select at.tx_id, at.copro_id, at.period_id, at.source_period_id,
    coalesce(sum(case when a.code = '478'   then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_120,
    coalesce(sum(case when a.code = '12'    then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_110,
    coalesce(sum(case when a.code = '450-1' then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_450_1,
    coalesce(sum(case when a.code = '450-2' then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_450_2
  from alloc_tx at
  join public.ledger_entries e on e.tx_id = at.tx_id
  join public.accounts a on a.id = e.account_id
  group by at.tx_id, at.copro_id, at.period_id, at.source_period_id
),
result_src as (
  -- B4 : scinde le résultat de l'exercice source en COURANT vs TRAVAUX (même liste de codes travaux
  -- que open_next_period). result_net conservé pour la compat des types générés.
  -- CONVENTION credit-debit = OPPOSÉE de open_next_period (qui calcule en debit-credit) — NE PAS aligner :
  -- mv_* (alloc) sont en credit-debit, donc result_courant doit l'être aussi pour que mv_120 = -result_courant.
  select e.copro_id, e.period_id,
    round(coalesce(sum(case
      when a.charge_nature = 'courant'
      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_courant,
    round(coalesce(sum(case
      when a.charge_nature = 'travaux'
      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_travaux,
    round(coalesce(sum(case
      when substr(a.code,1,1) in ('6','7')
      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_net
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where substr(a.code, 1, 1) in ('6', '7')
  group by e.copro_id, e.period_id
)
select
  mv.copro_id, mv.period_id, mv.tx_id, mv.source_period_id,
  mv.mv_120, mv.mv_110, mv.mv_450_1, mv.mv_450_2,
  coalesce(rs.result_net, 0)     as result_net,        -- conservé (compat types), plus dans la logique
  coalesce(rs.result_courant, 0) as result_courant,    -- AJOUT B4
  coalesce(rs.result_travaux, 0) as result_travaux     -- AJOUT B4
from mv
left join result_src rs on rs.copro_id = mv.copro_id and rs.period_id = mv.source_period_id
where
  -- (a-courant) quote-part courant : 450-1 contrepartie de 478. Toujours active.
  abs(mv.mv_450_1 + mv.mv_120) > 0.01
  -- (b-courant) somme RESTREINTE AU COURANT : déversé courant (mv_120) = −result_courant. CŒUR DU GEL.
  or abs(mv.mv_120 + coalesce(rs.result_courant, 0)) > 0.01
  -- (a-travaux) quote-part travaux : neutre quand gelé (mv_110=mv_450_2=0 → abs(0)=0), contrôle si déversé.
  or abs(mv.mv_450_2 + mv.mv_110) > 0.01
  -- (b-travaux) somme travaux CONDITIONNELLE : ne s'active QUE si la branche travaux a bougé (flag ON).
  or ( (abs(mv.mv_110) > 0.01 or abs(mv.mv_450_2) > 0.01)
       and abs(mv.mv_110 + coalesce(rs.result_travaux, 0)) > 0.01 );

comment on view public.v_result_allocation_split is
  'Garde-fou de l''affectation du résultat (B4 : restreint au COURANT 478/450-1, systématique ; le travaux 12/450-2 n''est contrôlé QUE s''il a été déversé, flag p_affecter_travaux ON). 1 ligne = écriture result_allocation incohérente, 0 ligne = conforme. mv_120=478 (courant), mv_110=12 (travaux). Assiette de assert_result_allocation_split.';;

-- FIN 0059_e3_charge_nature.sql
