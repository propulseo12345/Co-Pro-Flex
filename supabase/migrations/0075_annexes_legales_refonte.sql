-- 0075_annexes_legales_refonte.sql — ANNEXES E7/E8 : refonte SQL des 6 fn_annexe_* au format riche
-- ============================================================================================
-- Source : .planning/PLAN_J5_2026-06-15.md T4 + FACSIMILE_ANNEXES_2026-06-15.md + arbitrages §5
--   (#11 fn_annexe_1_detail_copros = format FRONT {copros[],total} ; #12 68/677/678→travaux ;
--   #13 N+1=budget courant voté / N+2=brouillon ; #14 annexe5 col.D=702+712+131/711+705).
--
-- PROBLÈME RÉSOLU : les fn_annexe_* (0028) renvoyaient des objets SCALAIRES (ex. tresorerie:{...})
--   alors que le front attend des TABLEAUX (LigneCompte[]/Ligne5Colonnes[]) -> `.map` sur scalaire =
--   crash PDF / pages blanches. On réécrit les 6 fonctions au format riche EXACT du contrat front
--   (types.ts AnnexeData1..5). E7 = annexe 1 par SENS sans compensation, 450-5 ALUR ISOLÉ. E8 =
--   annexe 2 en 2 blocs courant/travaux via accounts.charge_nature.
--
-- ARITÉ : fn_annexe_2/3 passent de 2 à 4 args (p_prev_period_id, p_next_period_id en option). On DROP
--   les versions 2-args AVANT le CREATE (CREATE OR REPLACE ne change pas la signature -> PGRST203).
--   prev/next sont AUTO-DÉRIVÉES (tri start_date) si non fournies -> corrige à la source le bug front
--   (p_next_period_id passé = periodId).
--
-- LECTURE SEULE : aucune écriture GL. G-DEF-RO : DEFINER + is_service_call() OR user_has_copro_access
--   + revoke public/anon + grant authenticated/service_role.

-- DROP des arités 2-args de fn_annexe_2/3 (changement de signature).
drop function if exists public.fn_annexe_2(uuid, uuid);
drop function if exists public.fn_annexe_3(uuid, uuid);


-- ============================================================================================
-- ANNEXE 1 — État financier après répartition (E7 : par sens, sans compensation, 450-5 isolé)
-- ============================================================================================
create or replace function public.fn_annexe_1(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start        date;
  v_prev_end     date;
  v_tresorerie   jsonb;
  v_provisions   jsonb;
  v_creances     jsonb;
  v_dettes       jsonb;
  v_tot_tres     jsonb;
  v_tot_prov     jsonb;
  v_tot_crea     jsonb;
  v_tot_det      jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  select start_date into v_start from public.accounting_periods where id = p_period_id;
  -- Fin de l'exercice précédent = veille du début de l'exercice courant (balance sheet cumulative).
  v_prev_end := v_start - 1;

  -- Helper inline : solde cumulé d'un ensemble de comptes, par SENS, jusqu'à une date (incluse).
  -- exercice_clos = cumul jusqu'à aujourd'hui (toutes périodes) ; exercice_precedent = cumul <= v_prev_end.

  -- TRÉSORERIE (50/51/53 → 501/502/512/514/531), solde débiteur (debit - credit).
  with tres as (
    select a.code, max(a.name) as name,
      round(coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0),2) as clos,
      round(coalesce(sum(case when t.tx_date <= v_prev_end then (case when e.direction='debit' then e.amount else -e.amount end) else 0 end),0),2) as prec
    from public.accounts a
    left join public.ledger_entries e on e.account_id = a.id
    left join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
    where a.copro_id = p_copro_id and (a.code like '50%' or a.code like '51%' or a.code like '53%')
    group by a.code
    having coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0) <> 0
  )
  select coalesce(jsonb_agg(jsonb_build_object('compte',code,'libelle',name,'exercice_precedent',prec,'exercice_clos',clos) order by code),'[]'::jsonb),
         jsonb_build_object('exercice_precedent', coalesce(sum(prec),0), 'exercice_clos', coalesce(sum(clos),0))
    into v_tresorerie, v_tot_tres from tres;

  -- PROVISIONS & AVANCES (102/103/1031../105/106/131/12), solde créditeur (credit - debit).
  with prov as (
    select a.code, max(a.name) as name,
      round(coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0),2) as clos,
      round(coalesce(sum(case when t.tx_date <= v_prev_end then (case when e.direction='credit' then e.amount else -e.amount end) else 0 end),0),2) as prec
    from public.accounts a
    left join public.ledger_entries e on e.account_id = a.id
    left join public.ledger_transactions t on t.id = e.tx_id and t.status='posted'
    where a.copro_id = p_copro_id
      -- 12 = solde en attente travaux (ex-110, renommé 0056) ; 478 = solde en attente courant (ex-120).
      and (a.code like '102%' or a.code like '103%' or a.code like '105%' or a.code like '106%' or a.code like '131%' or a.code = '12' or a.code = '478')
    group by a.code
    having coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0) <> 0
  )
  select coalesce(jsonb_agg(jsonb_build_object('compte',code,'libelle',name,'exercice_precedent',prec,'exercice_clos',clos) order by code),'[]'::jsonb),
         jsonb_build_object('exercice_precedent', coalesce(sum(prec),0), 'exercice_clos', coalesce(sum(clos),0))
    into v_provisions, v_tot_prov from prov;

  -- CRÉANCES (section II, SANS COMPENSATION) : 45x DÉBITEURS par lot (450-5 ALUR EXCLU) + 459 + 46/47/48 débiteurs.
  -- Non-compensation : on somme les soldes de lot POSITIFS (débiteurs) — un lot créditeur n'efface pas un débiteur.
  with crea_45 as (
    select round(coalesce(sum(greatest(lb.bal,0)),0),2) as clos,
           round(coalesce(sum(case when lb.bal_prec>0 then lb.bal_prec else 0 end),0),2) as prec
    from (
      select e.lot_id,
        sum(case when e.direction='debit' then e.amount else -e.amount end) as bal,
        sum(case when t.tx_date <= v_prev_end then (case when e.direction='debit' then e.amount else -e.amount end) else 0 end) as bal_prec
      from public.ledger_entries e
      join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
      join public.accounts a on a.id=e.account_id
      where e.copro_id=p_copro_id and a.code like '45%' and a.code <> '450-5' and e.lot_id is not null
      group by e.lot_id
    ) lb
  ),
  crea_other as (
    select a.code, max(a.name) as name,
      round(coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0),2) as clos,
      round(coalesce(sum(case when t.tx_date<=v_prev_end then (case when e.direction='debit' then e.amount else -e.amount end) else 0 end),0),2) as prec
    from public.accounts a
    left join public.ledger_entries e on e.account_id=a.id
    left join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
    where a.copro_id=p_copro_id and (a.code='459' or a.code like '46%' or a.code like '47%' or a.code like '48%')
    group by a.code
    having coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0) > 0
  )
  select
    (select coalesce(jsonb_agg(x) , '[]'::jsonb) from (
        select jsonb_build_object('compte','45','libelle','Copropriétaires - sommes exigibles (créances)','exercice_precedent',prec,'exercice_clos',clos) as x from crea_45 where clos <> 0 or prec <> 0
        union all
        select jsonb_build_object('compte',code,'libelle',name,'exercice_precedent',prec,'exercice_clos',clos) from crea_other
     ) s),
    jsonb_build_object(
      'exercice_precedent', coalesce((select prec from crea_45),0) + coalesce((select sum(prec) from crea_other),0),
      'exercice_clos',      coalesce((select clos from crea_45),0) + coalesce((select sum(clos) from crea_other),0)
    )
    into v_creances, v_tot_crea;

  -- DETTES (section II, SANS COMPENSATION) : 45x CRÉDITEURS par lot (450-5 EXCLU) + 40 + 46/47/48 créditeurs.
  with det_45 as (
    select round(coalesce(sum(greatest(-lb.bal,0)),0),2) as clos,
           round(coalesce(sum(case when lb.bal_prec<0 then -lb.bal_prec else 0 end),0),2) as prec
    from (
      select e.lot_id,
        sum(case when e.direction='debit' then e.amount else -e.amount end) as bal,
        sum(case when t.tx_date <= v_prev_end then (case when e.direction='debit' then e.amount else -e.amount end) else 0 end) as bal_prec
      from public.ledger_entries e
      join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
      join public.accounts a on a.id=e.account_id
      where e.copro_id=p_copro_id and a.code like '45%' and a.code <> '450-5' and e.lot_id is not null
      group by e.lot_id
    ) lb
  ),
  det_other as (
    select a.code, max(a.name) as name,
      round(coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0),2) as clos,
      round(coalesce(sum(case when t.tx_date<=v_prev_end then (case when e.direction='credit' then e.amount else -e.amount end) else 0 end),0),2) as prec
    from public.accounts a
    left join public.ledger_entries e on e.account_id=a.id
    left join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
    where a.copro_id=p_copro_id and (a.code like '40%' or a.code like '46%' or a.code like '47%' or a.code like '48%')
    group by a.code
    having coalesce(sum(case when e.direction='credit' then e.amount else -e.amount end),0) > 0
  )
  select
    (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('compte','45','libelle','Copropriétaires - excédents versés (dettes)','exercice_precedent',prec,'exercice_clos',clos) as x from det_45 where clos <> 0 or prec <> 0
        union all
        select jsonb_build_object('compte',code,'libelle',name,'exercice_precedent',prec,'exercice_clos',clos) from det_other
     ) s),
    jsonb_build_object(
      'exercice_precedent', coalesce((select prec from det_45),0) + coalesce((select sum(prec) from det_other),0),
      'exercice_clos',      coalesce((select clos from det_45),0) + coalesce((select sum(clos) from det_other),0)
    )
    into v_dettes, v_tot_det;

  return jsonb_build_object(
    'section_i', jsonb_build_object(
      'tresorerie', v_tresorerie, 'total_tresorerie', v_tot_tres,
      'provisions', v_provisions, 'total_provisions', v_tot_prov
    ),
    'section_ii', jsonb_build_object(
      'creances', v_creances, 'total_creances', v_tot_crea,
      'dettes', v_dettes, 'total_dettes', v_tot_det
    ),
    -- Total général = (Total 1 trésorerie+provisions) + (Total 2). Côté créances/actif vs dettes/passif.
    'total_general_creances', jsonb_build_object(
      'exercice_precedent', (v_tot_tres->>'exercice_precedent')::numeric + (v_tot_crea->>'exercice_precedent')::numeric,
      'exercice_clos',      (v_tot_tres->>'exercice_clos')::numeric + (v_tot_crea->>'exercice_clos')::numeric
    ),
    'total_general_dettes', jsonb_build_object(
      'exercice_precedent', (v_tot_prov->>'exercice_precedent')::numeric + (v_tot_det->>'exercice_precedent')::numeric,
      'exercice_clos',      (v_tot_prov->>'exercice_clos')::numeric + (v_tot_det->>'exercice_clos')::numeric
    )
  );
end;
$$;
revoke execute on function public.fn_annexe_1(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_1(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- ANNEXE 1 (détail) — par copropriétaire, format FRONT {copros[], total} (#11)
-- ============================================================================================
create or replace function public.fn_annexe_1_detail_copros(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_copros jsonb;
  v_total  jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- Solde par copropriétaire (somme de ses lots, dérivé GL). V1 : régularisation non chiffrée (0) ->
  -- solde_avant = solde_apres = balance. La régularisation d'AG sera branchée ultérieurement.
  with per_person as (
    select owner_name, balance
    from public.v_owner_statement_by_person
    where copro_id = p_copro_id
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'nom', coalesce(owner_name,'Inconnu'),
      'solde_avant_regularisation', round(balance,2),
      'regularisation', 0,
      'solde_apres_regularisation', round(balance,2)
    ) order by owner_name), '[]'::jsonb),
    jsonb_build_object(
      'solde_avant', round(coalesce(sum(balance),0),2),
      'regularisation', 0,
      'solde_apres', round(coalesce(sum(balance),0),2)
    )
    into v_copros, v_total
  from per_person;

  return jsonb_build_object('copros', v_copros, 'total', v_total);
end;
$$;
revoke execute on function public.fn_annexe_1_detail_copros(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_1_detail_copros(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- ANNEXE 2 — Compte de gestion général, 5 colonnes, 2 blocs courant/travaux (E8)
-- ============================================================================================
create or replace function public.fn_annexe_2(
  p_copro_id uuid,
  p_period_id uuid,
  p_prev_period_id uuid default null,
  p_next_period_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start date;
  v_prev  uuid;
  v_next  uuid;
  v_charges_cur  jsonb;
  v_produits_cur jsonb;
  v_charges_trav jsonb;
  v_st_charges  jsonb;
  v_solde_charges jsonb;
  v_total_i     jsonb;
  v_st_produits jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  select start_date into v_start from public.accounting_periods where id = p_period_id;
  -- Auto-dérivation prev/next (corrige le bug front : p_next_period_id passé = periodId).
  v_prev := coalesce(p_prev_period_id, (select id from public.accounting_periods where copro_id=p_copro_id and start_date < v_start order by start_date desc limit 1));
  v_next := nullif(p_next_period_id, p_period_id);
  v_next := coalesce(v_next, (select id from public.accounting_periods where copro_id=p_copro_id and start_date > v_start order by start_date asc limit 1));

  -- Lignes 5 colonnes pour un ensemble de comptes (charges 6x : debit-credit ; produits 7x : credit-debit).
  -- realisé période courante / précédente, budget voté (current validated) période courante / suivante / brouillon suivant.
  -- On construit charges courant (charge_nature='courant'), charges travaux (charge_nature='travaux'), produits.

  -- CHARGES COURANTES (charge_nature='courant').
  with base as (
    select a.id, a.code, a.name, a.charge_nature
    from public.accounts a where a.copro_id=p_copro_id and a.code like '6%'
  ),
  realise as (
    select e.account_id, t.period_id,
      sum(case when e.direction='debit' then e.amount else -e.amount end) as montant
    from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
    where e.copro_id=p_copro_id group by e.account_id, t.period_id
  ),
  budg as (
    select bl.account_id, b.period_id, b.status, sum(bl.amount) as montant
    from public.budgets b join public.budget_lines bl on bl.budget_id=b.id
    where b.copro_id=p_copro_id group by bl.account_id, b.period_id, b.status
  ),
  lignes as (
    select base.code, base.name, base.charge_nature,
      coalesce((select montant from realise r where r.account_id=base.id and r.period_id=v_prev),0) as ex_precedent_approuve,
      coalesce((select montant from budg g where g.account_id=base.id and g.period_id=p_period_id and g.status='validated'),0) as ex_clos_budget_vote,
      coalesce((select montant from realise r where r.account_id=base.id and r.period_id=p_period_id),0) as ex_clos_realise,
      coalesce((select montant from budg g where g.account_id=base.id and g.period_id=v_next and g.status='validated'),0) as bp_en_cours_vote,
      coalesce((select montant from budg g where g.account_id=base.id and g.period_id=v_next and g.status='draft'),0) as bp_a_voter
    from base
  )
  select coalesce(jsonb_agg(jsonb_build_object('compte',code,'libelle',name,'type','charge',
           'ex_precedent_approuve',ex_precedent_approuve,'ex_clos_budget_vote',ex_clos_budget_vote,
           'ex_clos_realise',ex_clos_realise,'bp_en_cours_vote',bp_en_cours_vote,'bp_a_voter',bp_a_voter) order by code)
           filter (where charge_nature='courant' and (ex_precedent_approuve<>0 or ex_clos_budget_vote<>0 or ex_clos_realise<>0 or bp_en_cours_vote<>0 or bp_a_voter<>0)),'[]'::jsonb),
         coalesce(jsonb_agg(jsonb_build_object('compte',code,'libelle',name,'type','charge',
           'ex_precedent_approuve',ex_precedent_approuve,'ex_clos_budget_vote',ex_clos_budget_vote,
           'ex_clos_realise',ex_clos_realise,'bp_en_cours_vote',bp_en_cours_vote,'bp_a_voter',bp_a_voter) order by code)
           filter (where charge_nature='travaux' and (ex_precedent_approuve<>0 or ex_clos_budget_vote<>0 or ex_clos_realise<>0 or bp_en_cours_vote<>0 or bp_a_voter<>0)),'[]'::jsonb),
         jsonb_build_object(
           'ex_precedent_approuve', coalesce(sum(ex_precedent_approuve) filter (where charge_nature='courant'),0),
           'ex_clos_budget_vote',   coalesce(sum(ex_clos_budget_vote) filter (where charge_nature='courant'),0),
           'ex_clos_realise',       coalesce(sum(ex_clos_realise) filter (where charge_nature='courant'),0),
           'bp_en_cours_vote',      coalesce(sum(bp_en_cours_vote) filter (where charge_nature='courant'),0),
           'bp_a_voter',            coalesce(sum(bp_a_voter) filter (where charge_nature='courant'),0))
    into v_charges_cur, v_charges_trav, v_st_charges
  from lignes;

  -- PRODUITS COURANTS (701/711/713/714/716 par code).
  with base as (
    select a.id, a.code, a.name from public.accounts a
    where a.copro_id=p_copro_id and a.code in ('701','711','713','714','716')
  ),
  realise as (
    select e.account_id, t.period_id,
      sum(case when e.direction='credit' then e.amount else -e.amount end) as montant
    from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
    where e.copro_id=p_copro_id group by e.account_id, t.period_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('compte',code,'libelle',name,'type','produit',
           'ex_precedent_approuve',coalesce((select montant from realise r where r.account_id=base.id and r.period_id=v_prev),0),
           'ex_clos_budget_vote',0,
           'ex_clos_realise',coalesce((select montant from realise r where r.account_id=base.id and r.period_id=p_period_id),0),
           'bp_en_cours_vote',0,'bp_a_voter',0) order by code)
           filter (where coalesce((select montant from realise r where r.account_id=base.id and r.period_id=p_period_id),0)<>0
                      or coalesce((select montant from realise r where r.account_id=base.id and r.period_id=v_prev),0)<>0),'[]'::jsonb),
         jsonb_build_object(
           'ex_precedent_approuve', coalesce(sum(coalesce((select montant from realise r where r.account_id=base.id and r.period_id=v_prev),0)),0),
           'ex_clos_budget_vote',0,
           'ex_clos_realise', coalesce(sum(coalesce((select montant from realise r where r.account_id=base.id and r.period_id=p_period_id),0)),0),
           'bp_en_cours_vote',0,'bp_a_voter',0)
    into v_produits_cur, v_st_produits
  from base;

  -- Solde courant = produits courants - charges courantes (par colonne) ; affecté aux copropriétaires.
  v_solde_charges := jsonb_build_object(
    'ex_precedent_approuve', (v_st_produits->>'ex_precedent_approuve')::numeric - (v_st_charges->>'ex_precedent_approuve')::numeric,
    'ex_clos_budget_vote',   (v_st_produits->>'ex_clos_budget_vote')::numeric - (v_st_charges->>'ex_clos_budget_vote')::numeric,
    'ex_clos_realise',       (v_st_produits->>'ex_clos_realise')::numeric - (v_st_charges->>'ex_clos_realise')::numeric,
    'bp_en_cours_vote',      (v_st_produits->>'bp_en_cours_vote')::numeric - (v_st_charges->>'bp_en_cours_vote')::numeric,
    'bp_a_voter',            (v_st_produits->>'bp_a_voter')::numeric - (v_st_charges->>'bp_a_voter')::numeric
  );
  v_total_i := v_st_charges;  -- Total I (charges) = sous-total des charges courantes.

  return jsonb_build_object(
    'charges_courantes', v_charges_cur,
    'sous_total_charges', v_st_charges,
    'solde_charges', v_solde_charges,
    'total_i_charges', v_total_i,
    'produits_courants', v_produits_cur,
    'sous_total_produits', v_st_produits,
    'charges_travaux', v_charges_trav
  );
end;
$$;
revoke execute on function public.fn_annexe_2(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_2(uuid, uuid, uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- ANNEXE 3 — Compte de gestion par clé de répartition (courant), 5 colonnes par clé
-- ============================================================================================
create or replace function public.fn_annexe_3(
  p_copro_id uuid,
  p_period_id uuid,
  p_prev_period_id uuid default null,
  p_next_period_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cles jsonb;
  v_total jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- Charges courantes budgétées (validated) de la période, ventilées par clé. Une section par clé,
  -- chaque clé liste ses comptes de charge courant (Ligne5Colonnes) + total_charges/total_produits/total_net.
  -- V1 (limitation assumée) : seule la colonne ex_clos_budget_vote est renseignée ; le réalisé PAR CLÉ
  -- (ventilation des charges GL sur les clés) et les colonnes BP N+1/N+2 sont à 0 (chantier ultérieur).
  with bl as (
    select rk.id as key_id, rk.name as key_name, a.code, max(a.name) as name, sum(bl.amount) as vote
    from public.repartition_keys rk
    join public.budget_lines bl on bl.repartition_key_id = rk.id and bl.copro_id = p_copro_id
    join public.budgets b on b.id = bl.budget_id and b.period_id = p_period_id and b.status='validated'
    join public.accounts a on a.id = bl.account_id and a.charge_nature='courant'
    where rk.copro_id = p_copro_id
    group by rk.id, rk.name, a.code
  ),
  par_cle as (
    select key_id, key_name,
      jsonb_agg(jsonb_build_object('compte',code,'libelle',name,'type','charge',
        'ex_precedent_approuve',0,'ex_clos_budget_vote',round(vote,2),'ex_clos_realise',0,
        'bp_en_cours_vote',0,'bp_a_voter',0) order by code) as lignes,
      round(sum(vote),2) as total_vote
    from bl group by key_id, key_name
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'nom', key_name,
      'lignes', lignes,
      'total_charges', jsonb_build_object('ex_precedent_approuve',0,'ex_clos_budget_vote',total_vote,'ex_clos_realise',0,'bp_en_cours_vote',0,'bp_a_voter',0),
      'total_produits', jsonb_build_object('ex_precedent_approuve',0,'ex_clos_budget_vote',0,'ex_clos_realise',0,'bp_en_cours_vote',0,'bp_a_voter',0),
      'total_net', jsonb_build_object('ex_precedent_approuve',0,'ex_clos_budget_vote',total_vote,'ex_clos_realise',0,'bp_en_cours_vote',0,'bp_a_voter',0)
    ) order by key_name), '[]'::jsonb),
    jsonb_build_object('ex_precedent_approuve',0,'ex_clos_budget_vote',round(coalesce(sum(total_vote),0),2),'ex_clos_realise',0,'bp_en_cours_vote',0,'bp_a_voter',0)
    into v_cles, v_total
  from par_cle;

  return jsonb_build_object('cles', v_cles, 'total_general', v_total);
end;
$$;
revoke execute on function public.fn_annexe_3(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_3(uuid, uuid, uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- ANNEXE 4 — Travaux art.14-2 & op. exceptionnelles TERMINÉS (budgets works closed)
-- ============================================================================================
create or replace function public.fn_annexe_4(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_operations jsonb;
  v_total jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  with works as (
    select b.id as budget_id, b.name as label,
      coalesce((select sum(bl.amount) from public.budget_lines bl where bl.budget_id=b.id),0) as votees,
      coalesce((select sum(case when e.direction='debit' then e.amount else -e.amount end)
                from public.ledger_entries e
                join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
                where e.copro_id=p_copro_id and e.operation_id=b.id),0) as realisees,
      coalesce((select sum(case when e.direction='credit' then e.amount else -e.amount end)
                from public.ledger_entries e
                join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
                join public.accounts a on a.id=e.account_id
                where e.copro_id=p_copro_id and e.operation_id=b.id and a.code in ('702','712','705','131','711')),0) as provisions
    from public.budgets b
    where b.copro_id=p_copro_id and b.budget_type='works' and b.status='closed'
  )
  select
    coalesce(jsonb_agg(jsonb_build_object('libelle',label,'depenses_votees',round(votees,2),
      'depenses_realisees',round(realisees,2),'provisions_appelees',round(provisions,2),
      'solde',round(provisions - realisees,2)) order by label),'[]'::jsonb),
    jsonb_build_object('libelle','TOTAL','depenses_votees',round(coalesce(sum(votees),0),2),
      'depenses_realisees',round(coalesce(sum(realisees),0),2),'provisions_appelees',round(coalesce(sum(provisions),0),2),
      'solde',round(coalesce(sum(provisions-realisees),0),2))
    into v_operations, v_total
  from works;

  return jsonb_build_object('operations', v_operations, 'total', v_total);
end;
$$;
revoke execute on function public.fn_annexe_4(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_4(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- ANNEXE 5 — Travaux votés NON clôturés (budgets works validated), colonnes A-F
-- ============================================================================================
create or replace function public.fn_annexe_5(p_copro_id uuid, p_period_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_operations jsonb;
  v_total jsonb;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- A votés / B payés (règlements fournisseurs sur l'op) / C réalisés (charges 6x op) / D provisions
  -- appelées (702+712+131/711+705 sur l'op) / E = D - C / F subventions+emprunts à recevoir (131 non encaissé : 0 V1).
  -- B (payés) = règlements fournisseurs (supplier_payments) des factures portant une ligne sur CETTE
  -- opération (flux cash, distinct de C = charges réalisées classe 6). N1 : date_ag ≈ created_at du
  -- budget tant que le lien budget→décision AG n'est pas tracé (V1).
  with works as (
    select b.id as budget_id, b.name as label, b.created_at,
      coalesce((select sum(bl.amount) from public.budget_lines bl where bl.budget_id=b.id),0) as a_votes,
      coalesce((select sum(sp.amount)
                from public.supplier_payments sp
                where sp.copro_id=p_copro_id
                  and sp.supplier_invoice_id in (
                    select distinct sil.invoice_id from public.supplier_invoice_lines sil where sil.operation_id=b.id
                  )),0) as b_payes,
      coalesce((select sum(case when e.direction='debit' then e.amount else -e.amount end)
                from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
                where e.copro_id=p_copro_id and e.operation_id=b.id),0) as c_realises,
      coalesce((select sum(case when e.direction='credit' then e.amount else -e.amount end)
                from public.ledger_entries e join public.ledger_transactions t on t.id=e.tx_id and t.status='posted'
                join public.accounts a on a.id=e.account_id
                where e.copro_id=p_copro_id and e.operation_id=b.id and a.code in ('702','712','705','131','711')),0) as d_provisions
    from public.budgets b
    where b.copro_id=p_copro_id and b.budget_type='works' and b.status='validated'
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'libelle',label,'date_ag',to_char(created_at,'YYYY-MM-DD'),'cle_repartition','',
      'travaux_votes_a',round(a_votes,2),'travaux_payes_b',round(b_payes,2),'travaux_realises_c',round(c_realises,2),
      'appels_recus_d',round(d_provisions,2),'solde_attente_e',round(d_provisions - c_realises,2),'subventions_f',0
    ) order by label),'[]'::jsonb),
    jsonb_build_object(
      'travaux_votes_a',round(coalesce(sum(a_votes),0),2),'travaux_payes_b',round(coalesce(sum(b_payes),0),2),
      'travaux_realises_c',round(coalesce(sum(c_realises),0),2),'appels_recus_d',round(coalesce(sum(d_provisions),0),2),
      'solde_attente_e',round(coalesce(sum(d_provisions - c_realises),0),2),'subventions_f',0
    )
    into v_operations, v_total
  from works;

  return jsonb_build_object('operations', v_operations, 'total', v_total);
end;
$$;
revoke execute on function public.fn_annexe_5(uuid, uuid) from public, anon;
grant execute on function public.fn_annexe_5(uuid, uuid) to authenticated, service_role;

-- FIN 0075_annexes_legales_refonte.sql
