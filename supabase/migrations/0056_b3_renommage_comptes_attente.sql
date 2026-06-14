-- 0056_b3_renommage_comptes_attente.sql
-- ============================================================================================
-- B3 (DECISIONS.md, 2026-06-10, J0.2b) — Conformité du plan comptable copropriété
--   (arrêté du 14 mars 2005). DEUX mouvements de renommage de CODES de comptes :
--     1. 110 -> '12'  : compte « Solde en attente sur travaux et opérations exceptionnelles ».
--                       Le 110 portait déjà le LIBELLÉ légal du compte 12 ; on lui donne le CODE légal.
--     2. 120 -> '478' : compte d'attente du résultat COURANT (sas technique clôture -> approbation AG,
--                       art. 45-1 décret 67-223). Au plan officiel, TOUT « 12x » se lit comme du
--                       travaux ; ce compte d'attente courant — invention applicative, pas un compte
--                       normalisé — DOIT donc sortir de la racine 12x. 478 = « Autres comptes
--                       transitoires » (racine 47 = comptes transitoires / d'attente), classe 4 :
--                       toujours capté par le carry-forward à-nouveau (substr(code,1,1) in ('1','4','5')).
--
-- MÉCANIQUE (auditée, prouvée bit-pour-bit) : les écritures (ledger_entries) référencent leur compte
--   par account_id (uuid, FK) ; le code n'existe QUE dans accounts.code (text, unique PAR copro). Un
--   renommage est donc un simple UPDATE d'UNE ligne accounts par copro — AUCUNE écriture postée n'est
--   modifiée, AUCUN trigger d'immutabilité (qui ne portent que sur ledger_*) n'est déclenché.
--
-- PÉRIMÈTRE STRICT B3 : substitution de codes + mise à jour des littéraux qui les résolvent / filtrent
--   / affichent, À LOGIQUE FONCTIONNELLE IDENTIQUE. N'empiète PAS sur B4 (gel du 12 / flag travaux),
--   B5 (assertion multi-clés), E3 (charge_nature), E4 (operation_id) — rien de tout cela n'apparaît ici.
--   Les noms de VARIABLES internes (v_acct_120, mv_120, v_solde_120…) et de COLONNES de la vue
--   (mv_120/mv_110) sont CONSERVÉS : CREATE OR REPLACE VIEW interdit de renommer une colonne, et aucun
--   consommateur ne les lit hors types générés. Ils désignent désormais respectivement 478 et 12
--   (cf. commentaires en place).
-- ============================================================================================

-- ── 1. GARDE ANTI-COLLISION (avant tout UPDATE) ───────────────────────────────────────────
-- Le seed ne crée jamais '12' ni '478' ; mais une copro réelle a pu saisir un tel code à la main
-- (accounts.code est libre). On bloque explicitement plutôt que de laisser échouer l'UPDATE (23505).
do $$
declare v_collisions text;
begin
  select string_agg(distinct copro_id::text, ', ') into v_collisions
  from public.accounts where code in ('12', '478');
  if v_collisions is not null then
    raise exception 'B3/0056 : collision — un compte 12 ou 478 préexiste (copro(s) : %). Résoudre avant renommage.', v_collisions
      using errcode = '23505';
  end if;
end $$;

-- ── 2. DONNÉES EXISTANTES : renommage des codes (UPDATE — PAS de réécriture du grand livre) ──
update public.accounts set code = '12'  where code = '110';
update public.accounts set code = '478' where code = '120';

-- ── 3. SEED (futures copros) : provision_copro_chart redéfinie avec les bons codes ──────────
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
  insert into public.accounts (copro_id, code, name, account_type, nature, is_system, is_postable)
  select
    p_copro_id,
    c.code,
    c.name,
    c.atype::public.account_type,
    c.nature::public.account_receivable_nature,
    (c.code = '450'),          -- is_system : chapeau agrégateur uniquement (protégé)
    (c.code <> '450')          -- is_postable : false sur le chapeau, true sur tout le reste
  from chart c
  on conflict (copro_id, code) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;
revoke execute on function public.provision_copro_chart(uuid) from public, anon;
grant execute on function public.provision_copro_chart(uuid) to authenticated, service_role;

-- ── 4. open_next_period (résolution + report du résultat courant/travaux) ──────────────────────────────────────────────────────
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
    and substr(a.code, 1, 1) in ('6', '7')
    and a.code not in ('671', '672', '673', '674', '677', '678', '702', '705', '706');

  -- Volet 2 (suite) : résultat TRAVAUX / exceptionnel (comptes ci-dessus).
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_net_travaux
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id
    and a.code in ('671', '672', '673', '674', '677', '678', '702', '705', '706');

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

-- ── 5. v_result_allocation_split (VUE garde-fou anti faux-vert) ──────────────────────────────────────────────────────
create or replace view public.v_result_allocation_split
with (security_invoker = true) as
with alloc_tx as (
  -- Une écriture d'affectation = (copro, période d'accueil N+1, période source N).
  select t.id as tx_id, t.copro_id, t.period_id, t.source_id as source_period_id
  from public.ledger_transactions t
  where t.source_type = 'result_allocation' and t.status = 'posted'
),
mv as (
  -- Mouvements par compte agrégés sur l'écriture d'affectation (crédit − débit).
  -- NB B3 : colonnes mv_120/mv_110 CONSERVÉES (CREATE OR REPLACE VIEW interdit de renommer une colonne ;
  --   aucun consommateur ne les lit hors types générés). mv_120 suit désormais le compte d'attente
  --   COURANT (478), mv_110 le compte d'attente TRAVAUX (12).
  select at.tx_id, at.copro_id, at.period_id, at.source_period_id,
    coalesce(sum(case when a.code = '478'   then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_120,
    coalesce(sum(case when a.code = '12'   then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_110,
    coalesce(sum(case when a.code = '450-1' then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_450_1,
    coalesce(sum(case when a.code = '450-2' then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0) as mv_450_2
  from alloc_tx at
  join public.ledger_entries e on e.tx_id = at.tx_id
  join public.accounts a on a.id = e.account_id
  group by at.tx_id, at.copro_id, at.period_id, at.source_period_id
),
result_src as (
  -- Résultat de l'exercice source N = net des classes 6/7 du GL posté de la période N
  -- (charges 6 en débit, produits 7 en crédit ; résultat = Σ(crédit − débit) = excédent si > 0).
  select e.copro_id, e.period_id,
    round(coalesce(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 0), 2) as result_net
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where substr(a.code, 1, 1) in ('6', '7')
  group by e.copro_id, e.period_id
)
select
  mv.copro_id,
  mv.period_id,
  mv.tx_id,
  mv.source_period_id,
  mv.mv_120,
  mv.mv_110,
  mv.mv_450_1,
  mv.mv_450_2,
  coalesce(rs.result_net, 0) as result_net
from mv
left join result_src rs on rs.copro_id = mv.copro_id and rs.period_id = mv.source_period_id
where
  -- (a) quote-part : 450-x est la CONTREPARTIE de 12x (sens opposés en partie double) ⇒ ils se somment à 0.
  --     mv_450_1 = −mv_120 et mv_450_2 = −mv_110 quand la ventilation par lot reflète exactement 478/12.
  abs(mv.mv_450_1 + mv.mv_120) > 0.01
  or abs(mv.mv_450_2 + mv.mv_110) > 0.01
  -- (b) invariant de somme : la ventilation déversée (478 courant + 12 travaux) = OPPOSÉ du résultat de
  --     l'exercice source (l'affectation sort le résultat des comptes de report) ⇒ (mv_120 + mv_110) + result_net = 0.
  or abs((mv.mv_120 + mv.mv_110) + coalesce(rs.result_net, 0)) > 0.01;

comment on view public.v_result_allocation_split is
  'Garde-fou de l''invariant d''affectation du résultat (478 courant / 12 travaux ; ex-120/110) (blueprint §0.2) : 1 ligne par écriture result_allocation dont la ventilation par nature (478/450-1 courant, 12/450-2 travaux) ou la somme (478+12 = résultat de l''exercice source) est incohérente. 0 ligne = conforme. Assiette de assert_result_allocation_split.';


-- ── 6. assert_result_allocation_split (garde-fou bloquant) ──────────────────────────────────────────────────────
create or replace function public.assert_result_allocation_split(
  p_copro_id  uuid,
  p_period_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.v_result_allocation_split
    where copro_id = p_copro_id and period_id = p_period_id
  ) then
    raise exception 'assert_result_allocation_split: affectation du résultat non conforme à l''invariant d''affectation (478 courant / 12 travaux) (copro %, période %) — ventilation par nature (478/450-1 courant ET 12/450-2 travaux) ou somme (478+12 = résultat) incohérente', p_copro_id, p_period_id
      using errcode = '23514';
  end if;
end;
$$;
revoke execute on function public.assert_result_allocation_split(uuid, uuid) from public, anon;
grant execute on function public.assert_result_allocation_split(uuid, uuid) to authenticated, service_role;

-- ── 7. regularize_period (affectation du résultat) ──────────────────────────────────────────────────────
create or replace function public.regularize_period(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src_status  period_status;
  v_src_end     date;
  v_next        uuid;
  v_next_status period_status;
  v_ag_date     date := current_date;
  v_key         uuid;
  v_total_w     numeric;
  v_solde_120   numeric;
  v_solde_110   numeric;
  v_acct_120    uuid;
  v_acct_110    uuid;
  v_acct_4501   uuid;
  v_acct_4502   uuid;
  v_entries     jsonb := '[]'::jsonb;
  v_running     numeric;
  v_alloc       numeric;
  v_cnt         integer;
  v_lines       integer := 0;
  v_tx_res      jsonb;
  r             record;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- Exercice SOURCE N : on en dérive la date de fin (pour trouver N+1) et son statut (garde immutabilité).
  select status, end_date into v_src_status, v_src_end
  from public.accounting_periods
  where id = p_period_id and copro_id = p_copro_id;
  if v_src_status is null then
    raise exception 'regularize_period: exercice source % introuvable pour la copro %', p_period_id, p_copro_id
      using errcode = '23503';
  end if;

  -- Période d'accueil N+1 (premier exercice postérieur à N).
  select id, status into v_next, v_next_status
  from public.accounting_periods
  where copro_id = p_copro_id
    and start_date > v_src_end
  order by start_date
  limit 1;
  if v_next is null then
    raise exception 'regularize_period: exercice N+1 introuvable pour l''affectation (ouvrir open_next_period d''abord)'
      using errcode = '23503';
  end if;

  -- Garde immutabilité (message métier AVANT le trigger 0024) : l'exemption is_ledger_regen_exempt exige
  -- que NI l'exercice source N NI l'exercice d'accueil N+1 ne soient approuvés. Si l'un l'est et qu'une
  -- affectation existe déjà, on lève un message clair plutôt que de laisser le trigger remonter un message
  -- générique d'immutabilité GL.
  if (v_src_status = 'approved' or v_next_status = 'approved')
     and exists (
       select 1 from public.ledger_transactions
       where copro_id = p_copro_id and source_type = 'result_allocation' and source_id = p_period_id
     ) then
    raise exception 'regularize_period: affectation figée — exercice % approuvé en AG (source ou accueil), réaffectation interdite', p_period_id
      using errcode = '23514';
  end if;

  -- Idempotence : on remplace l'affectation précédente tant que NI N NI N+1 ne sont approuvés.
  if v_src_status <> 'approved' and v_next_status <> 'approved' then
    delete from public.ledger_transactions
    where copro_id = p_copro_id and source_type = 'result_allocation' and source_id = p_period_id;
  end if;

  select id into v_acct_120  from public.accounts where copro_id = p_copro_id and code = '478';
  select id into v_acct_110  from public.accounts where copro_id = p_copro_id and code = '12';
  select id into v_acct_4501 from public.accounts where copro_id = p_copro_id and code = '450-1';
  select id into v_acct_4502 from public.accounts where copro_id = p_copro_id and code = '450-2';
  if v_acct_4501 is null or v_acct_4502 is null then
    raise exception 'regularize_period: comptes 450-1/450-2 absents pour la copro %', p_copro_id
      using errcode = '23503';
  end if;

  -- Soldes 12 (travaux) / 478 (courant) de N+1 (après à-nouveau) : Σ(débit − crédit) sur chaque compte de report.
  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_solde_120
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = v_next and a.code = '478';

  select round(coalesce(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 0), 2)
    into v_solde_110
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = v_next and a.code = '12';

  if v_solde_120 = 0 and v_solde_110 = 0 then
    return jsonb_build_object('success', true, 'skipped', 'soldes 12 et 478 nuls', 'next_period_id', v_next);
  end if;

  -- Clé de répartition (générale active) — assiette commune courant/travaux (choix documenté ci-dessus).
  select id into v_key
  from public.repartition_keys
  where copro_id = p_copro_id and category = 'general' and is_active = true
  limit 1;
  if v_key is null then
    raise exception 'regularize_period: clé de répartition générale active introuvable (copro %)', p_copro_id
      using errcode = '23503';
  end if;
  select sum(weight) into v_total_w from public.repartition_key_lines where key_id = v_key;
  if coalesce(v_total_w, 0) <= 0 then
    raise exception 'regularize_period: somme des poids de la clé générale nulle (copro %)', p_copro_id
      using errcode = '23514';
  end if;
  select count(*) into v_cnt from public.repartition_key_lines where key_id = v_key;

  -- Branche COURANT : D 478 (au total) / C 450-1 par quote-part (sens selon excédent/déficit).
  if v_solde_120 <> 0 then
    v_entries := v_entries || jsonb_build_object(
      'account_id', v_acct_120, 'lot_id', null,
      'direction', case when v_solde_120 > 0 then 'credit' else 'debit' end,
      'amount', abs(v_solde_120), 'entry_label', 'Affectation du résultat courant');

    v_running := 0;
    v_lines := 0;
    for r in select lot_id, weight from public.repartition_key_lines where key_id = v_key order by lot_id
    loop
      v_lines := v_lines + 1;
      if v_lines = v_cnt then
        v_alloc := round(abs(v_solde_120), 2) - v_running;
      else
        v_alloc := round(abs(v_solde_120) * r.weight / v_total_w, 2);
        v_running := v_running + v_alloc;
      end if;
      if v_alloc <> 0 then
        v_entries := v_entries || jsonb_build_object(
          'account_id', v_acct_4501, 'lot_id', r.lot_id,
          'direction', case when v_solde_120 > 0 then 'debit' else 'credit' end,
          'amount', v_alloc, 'entry_label', 'Affectation résultat courant au lot');
      end if;
    end loop;
  end if;

  -- Branche TRAVAUX (MIROIR) : D 12 (au total) / C 450-2 par quote-part (même arrondi cumulatif).
  if v_solde_110 <> 0 then
    v_entries := v_entries || jsonb_build_object(
      'account_id', v_acct_110, 'lot_id', null,
      'direction', case when v_solde_110 > 0 then 'credit' else 'debit' end,
      'amount', abs(v_solde_110), 'entry_label', 'Affectation du résultat travaux');

    v_running := 0;
    v_lines := 0;
    for r in select lot_id, weight from public.repartition_key_lines where key_id = v_key order by lot_id
    loop
      v_lines := v_lines + 1;
      if v_lines = v_cnt then
        v_alloc := round(abs(v_solde_110), 2) - v_running;
      else
        v_alloc := round(abs(v_solde_110) * r.weight / v_total_w, 2);
        v_running := v_running + v_alloc;
      end if;
      if v_alloc <> 0 then
        v_entries := v_entries || jsonb_build_object(
          'account_id', v_acct_4502, 'lot_id', r.lot_id,
          'direction', case when v_solde_110 > 0 then 'debit' else 'credit' end,
          'amount', v_alloc, 'entry_label', 'Affectation résultat travaux au lot');
      end if;
    end loop;
  end if;

  -- UNE SEULE écriture result_allocation (les deux branches réunies), datée AG, en N+1 ouverte.
  v_tx_res := public.create_ledger_transaction(
    p_copro_id, v_next, v_ag_date,
    'Affectation du résultat ' || p_period_id, 'result_allocation', p_period_id, v_entries, true
  );
  if not (v_tx_res->>'success')::boolean then
    raise exception 'regularize_period: échec écriture grand livre : %', v_tx_res->>'error'
      using errcode = '23514';
  end if;

  -- GARDE-FOU 12/478 EN FIN (rollback si la double ventilation manque) — modèle check_transaction_balance.
  perform public.assert_result_allocation_split(p_copro_id, v_next);

  return jsonb_build_object(
    'success', true,
    'allocated_courant', abs(v_solde_120),
    'allocated_travaux', abs(v_solde_110),
    'next_period_id', v_next,
    'tx_id', v_tx_res->>'tx_id'
  );
end;
$$;
revoke execute on function public.regularize_period(uuid, uuid) from public, anon;
grant execute on function public.regularize_period(uuid, uuid) to authenticated, service_role;

-- ── 8. ASSERTION POST-MIGRATION : plus aucun 110/120 ne subsiste ────────────────────────────
do $$
declare v_left int;
begin
  select count(*) into v_left from public.accounts where code in ('110', '120');
  if v_left <> 0 then
    raise exception 'B3/0056 : % compte(s) 110/120 subsiste(nt) après renommage', v_left;
  end if;
end $$;

-- FIN 0056_b3_renommage_comptes_attente.sql
