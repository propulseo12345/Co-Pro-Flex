-- 0076_etat_date_h2h3.sql — ÉTAT DATÉ H2/H3 : payload enrichi (cédants + provisions votées + ALUR)
-- ============================================================================================
-- Source : .planning/PLAN_J5_2026-06-15.md T5 + arbitrages §5 (#15 enrichir le SQL au contrat V2 du
--   front en gardant les 3 clés racine du CHECK ; #16 ALUR à venir = MIN 5 % du budget prévisionnel
--   annuel ; #17 provisions votées non appelées COURANT (art.14-1) + TRAVAUX, postes distincts).
--
-- BUT : generate_etat_date_payload (0031) — signature INCHANGÉE, corps enrichi :
--   H2 : `cedants[]` = TOUS les propriétaires actifs du lot à la date d'effet (pas seulement
--        seller_owner_id), chacun NOMMÉ + share_percent (état daté multi-cédants).
--   H3 : partie_3 (charge acquéreur) complétée par
--        - provisions_votees_non_appelees_courant (art.14-1) = quote-part lot du budget COURANT validé
--          MOINS Σ appels émis pour ce budget ;
--        - provisions_votees_non_appelees_travaux (#17) = idem budget TRAVAUX validé ;
--        - alur_a_venir (art.14-2-1, #16) = MAX(0, 5 % de la quote-part lot du budget courant − ALUR
--          déjà appelé).
--   `version='2.0'` -> le front reconnaît le contrat V2 (isPayloadV2). Les 3 clés racine du CHECK
--   ck_etat_date_payload_parts (0019) sont CONSERVÉES (partie_1/2/3).
--
-- LECTURE SEULE (aucune écriture GL). create_etat_date_snapshot / validate_mutation INCHANGÉES (déjà
--   correctes : validate_mutation ne poste AUCUN GL et bascule lot_owners — lot-centric). On les laisse.
-- G-DEF : DEFINER + is_service_call() OR user_is_copro_manager + revoke public/anon.

create or replace function public.generate_etat_date_payload(
  p_copro_id      uuid,
  p_mutation_id   uuid,
  p_snapshot_type etat_date_type
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_mut       public.mutations%rowtype;
  v_eff       date;
  v_lot_ref   text;
  v_key       uuid;
  v_w         numeric;
  v_total_w   numeric;
  v_items     jsonb;
  v_p1_total  numeric;
  v_p2_items  jsonb;
  v_p2_total  numeric;
  v_by_nature jsonb;
  v_adv       numeric;
  v_prov      numeric;
  v_cedants   jsonb;
  v_share_cur numeric;
  v_share_wrk numeric;
  v_called_cur numeric;
  v_called_wrk numeric;
  v_called_alur numeric;
  v_prov_cur  numeric;
  v_prov_wrk  numeric;
  v_alur      numeric;
begin
  select * into v_mut from public.mutations where id = p_mutation_id and copro_id = p_copro_id;
  if v_mut.id is null then
    raise exception 'generate_etat_date_payload: mutation % introuvable (copro %)', p_mutation_id, p_copro_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis (mutation %)', p_mutation_id using errcode = '42501';
  end if;
  v_eff := coalesce(v_mut.effective_date, v_mut.signature_date, current_date);
  select ref into v_lot_ref from public.lots where id = v_mut.lot_id;

  -- 45x du LOT figés à v_eff. P1 = débiteur (du PAR le vendeur) ; P2 = créditeur (du AU vendeur), hors 450-5 ALUR.
  select
    coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'nature', x.nature, 'amount', x.bal) order by x.code) filter (where x.bal > 0), '[]'::jsonb),
    coalesce(sum(x.bal) filter (where x.bal > 0), 0),
    coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'nature', x.nature, 'amount', -x.bal) order by x.code) filter (where x.bal < 0 and x.code <> '450-5'), '[]'::jsonb),
    coalesce(-sum(x.bal) filter (where x.bal < 0 and x.code <> '450-5'), 0),
    coalesce(jsonb_object_agg(x.code, x.bal) filter (where x.bal <> 0), '{}'::jsonb)
  into v_items, v_p1_total, v_p2_items, v_p2_total, v_by_nature
  from (
    select a.code, coalesce(a.nature::text, 'autre') as nature,
           round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2) as bal
    from public.ledger_entries e
    join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
    join public.accounts a on a.id = e.account_id
    where e.copro_id = p_copro_id and e.lot_id = v_mut.lot_id
      and a.code like '45%' and t.tx_date <= v_eff
    group by a.code, a.nature
  ) x;

  -- Quote-part (clé générale active).
  select id into v_key from public.repartition_keys
    where copro_id = p_copro_id and category = 'general' and is_active = true limit 1;
  if v_key is null then
    raise exception 'generate_etat_date_payload: cle de repartition generale active introuvable (copro %)', p_copro_id using errcode = '23503';
  end if;
  select rkl.weight into v_w from public.repartition_key_lines rkl where rkl.key_id = v_key and rkl.lot_id = v_mut.lot_id;
  select sum(weight) into v_total_w from public.repartition_key_lines where key_id = v_key;

  -- P3 (existant) : avances 450-3 + provisions appelées NON échues à v_eff.
  select coalesce(round(sum(case when e.direction = 'credit' then e.amount else -e.amount end), 2), 0)
    into v_adv
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.lot_id = v_mut.lot_id and a.code = '450-3' and t.tx_date <= v_eff;

  select coalesce(sum(cfl.amount_due - cfl.amount_paid), 0)
    into v_prov
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  where cfl.copro_id = p_copro_id and cfl.lot_id = v_mut.lot_id
    and cf.status not in ('draft', 'cancelled')
    and cf.issue_date <= v_eff
    and cf.due_date > v_eff;

  -- ════ H2 : TOUS les cédants actifs du lot à v_eff ════
  select coalesce(jsonb_agg(jsonb_build_object(
           'coproprietaire_id', cp.id,
           'nom', case when cp.is_company then cp.company_name else coalesce(cp.first_name || ' ' || cp.last_name, 'Inconnu') end,
           'share_percent', lo.share_percent,
           'start_date', lo.start_date,
           'end_date', lo.end_date
         ) order by lo.start_date), '[]'::jsonb)
    into v_cedants
  from public.lot_owners lo
  join public.coproprietaires cp on cp.id = lo.coproprietaire_id
  where lo.lot_id = v_mut.lot_id
    and lo.start_date <= v_eff
    and (lo.end_date is null or lo.end_date >= v_eff);

  -- ════ H3 : quote-part lot des budgets validés (courant/travaux) via les clés du budget ════
  select
    coalesce(sum(bl.amount * coalesce(rkl.weight,0) / nullif(kt.total,0)) filter (where b.budget_type='current'),0),
    coalesce(sum(bl.amount * coalesce(rkl.weight,0) / nullif(kt.total,0)) filter (where b.budget_type='works'),0)
    into v_share_cur, v_share_wrk
  from public.budgets b
  join public.budget_lines bl on bl.budget_id = b.id
  left join public.repartition_key_lines rkl on rkl.key_id = bl.repartition_key_id and rkl.lot_id = v_mut.lot_id
  left join (select key_id, sum(weight) as total from public.repartition_key_lines group by key_id) kt on kt.key_id = bl.repartition_key_id
  where b.copro_id = p_copro_id and b.status = 'validated' and b.budget_type in ('current','works');

  -- Déjà appelé (émis, non annulé, <= v_eff) par nature de budget.
  select
    coalesce(sum(cfl.amount_due) filter (where coalesce(b.budget_type::text,'current')='current'),0),
    coalesce(sum(cfl.amount_due) filter (where b.budget_type='works'),0),
    coalesce(sum(cfl.amount_due) filter (where b.budget_type='alur'),0)
    into v_called_cur, v_called_wrk, v_called_alur
  from public.call_for_funds_lines cfl
  join public.call_for_funds cf on cf.id = cfl.call_id
  left join public.budgets b on b.id = cf.budget_id
  where cfl.copro_id = p_copro_id and cfl.lot_id = v_mut.lot_id
    and cf.status not in ('draft','cancelled') and cf.issue_date <= v_eff;

  v_prov_cur := round(greatest(v_share_cur - v_called_cur, 0), 2);
  v_prov_wrk := round(greatest(v_share_wrk - v_called_wrk, 0), 2);
  -- ALUR à venir (#16) = MAX(0, 5 % de la quote-part courant − ALUR déjà appelé). Note si pas de budget courant.
  v_alur := round(greatest(0.05 * v_share_cur - v_called_alur, 0), 2);

  return jsonb_build_object(
    'version', '2.0',
    'partie_1_sommes_dues_vendeur', jsonb_build_object(
      'label', 'Sommes dues par le vendeur au syndicat',
      'items', v_items, 'total', v_p1_total),
    'partie_2_dues_par_syndicat', jsonb_build_object(
      'label', 'Sommes dont le syndicat est debiteur envers le vendeur',
      'items', v_p2_items, 'total', v_p2_total,
      'note', 'Hors fonds de travaux art.14-2 (450-5) : attache au lot, non remboursable au vendeur'),
    'partie_3_charge_acquereur', jsonb_build_object(
      'label', 'A la charge de l''acquereur',
      'reconstitution_avances', v_adv,
      'provisions_appelees_non_echues', v_prov,
      'provisions_votees_non_appelees_courant', v_prov_cur,
      'provisions_votees_non_appelees_travaux', v_prov_wrk,
      'alur_a_venir', v_alur,
      'alur_note', case when v_share_cur = 0 then 'Budget courant non voté : cotisation ALUR à venir non chiffrée (min. 5 % du budget prévisionnel)' else null end,
      'total', round(v_adv + v_prov + v_prov_cur + v_prov_wrk + v_alur, 2)),
    'cedants', v_cedants,
    'annexe_quote_part', jsonb_build_object(
      'label', 'Bases de calcul de la quote-part (annexe art.5)',
      'tantiemes_lot', coalesce(v_w, 0), 'tantiemes_total', coalesce(v_total_w, 0),
      'owner_share_pct', case when coalesce(v_total_w, 0) > 0 then round(coalesce(v_w, 0) * 100.0 / v_total_w, 4) else 0 end),
    'lot', jsonb_build_object('id', v_mut.lot_id, 'ref', v_lot_ref),
    'copro', jsonb_build_object('id', p_copro_id),
    'seller', jsonb_build_object('id', v_mut.seller_owner_id),
    'effective_date', v_eff,
    'snapshot_type', p_snapshot_type,
    'legal_reference', 'art.5 decret 67-223',
    'balance_45x_by_nature', v_by_nature
  );
end; $$;
revoke execute on function public.generate_etat_date_payload(uuid, uuid, etat_date_type) from public, anon;
grant execute on function public.generate_etat_date_payload(uuid, uuid, etat_date_type) to authenticated, service_role;


-- ============================================================================================
-- validate_mutation — FALLBACK acquéreur : si p_buyer_owner_id NULL, réutiliser mutations.buyer_owner_id
-- ============================================================================================
-- Permet au front (useSalesMutations.validateSale) d'appeler la RPC canonique en ne passant que la
-- mutation + les dates : l'acquéreur choisi À LA CRÉATION (mutations.buyer_owner_id) est réutilisé.
-- Le reste est INCHANGÉ vs 0031 : ZÉRO GL, bascule lot_owners (lot-centric), statut 'validated'.
create or replace function public.validate_mutation(
  p_mutation_id        uuid,
  p_signature_date     date,
  p_effective_date     date    default null,
  p_buyer_owner_id     uuid    default null,
  p_buyer_first_name   text    default null,
  p_buyer_last_name    text    default null,
  p_buyer_company_name text    default null,
  p_buyer_email        text    default null,
  p_buyer_is_company   boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_mut   public.mutations%rowtype;
  v_eff   date;
  v_buyer uuid;
begin
  select * into v_mut from public.mutations where id = p_mutation_id;
  if v_mut.id is null then
    raise exception 'validate_mutation: mutation % introuvable', p_mutation_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_mut.copro_id) then
    raise exception 'forbidden: gestionnaire requis pour la mutation %', p_mutation_id using errcode = '42501';
  end if;
  if v_mut.status = 'validated' then
    raise exception 'validate_mutation: mutation % deja validee', p_mutation_id using errcode = '23514';
  end if;
  if v_mut.status = 'cancelled' then
    raise exception 'validate_mutation: mutation % annulee', p_mutation_id using errcode = '23514';
  end if;

  v_eff := coalesce(p_effective_date, p_signature_date);
  if v_eff is null then
    raise exception 'validate_mutation: date d''effet requise' using errcode = '23514';
  end if;

  -- Acquéreur : id fourni -> sinon celui choisi à la création (mutations.buyer_owner_id) -> sinon création à la volée.
  v_buyer := coalesce(p_buyer_owner_id, v_mut.buyer_owner_id);
  if v_buyer is null then
    if coalesce(p_buyer_company_name, p_buyer_last_name) is null then
      raise exception 'validate_mutation: acquereur requis (id ou nom)' using errcode = '23514';
    end if;
    insert into public.coproprietaires (copro_id, is_company, company_name, first_name, last_name, email)
    values (v_mut.copro_id, (p_buyer_company_name is not null), p_buyer_company_name, p_buyer_first_name, p_buyer_last_name, p_buyer_email)
    returning id into v_buyer;
  else
    if not exists (select 1 from public.coproprietaires where id = v_buyer and copro_id = v_mut.copro_id) then
      raise exception 'validate_mutation: acquereur % hors copro %', v_buyer, v_mut.copro_id using errcode = '23503';
    end if;
  end if;

  if v_buyer = v_mut.seller_owner_id then
    raise exception 'validate_mutation: acquereur et vendeur identiques (mutation %)', p_mutation_id using errcode = '23514';
  end if;

  -- LOT-CENTRIC : clore TOUS les proprietaires actifs du lot, ouvrir l'acquereur. AUCUN GL (le 450 suit le lot).
  -- V1 = acquereur UNIQUE a 100 % (indivision acquereur = H1, DIFFEREE J9). Ne pas rappeler cette RPC
  -- pour ajouter un co-acquereur (le 100 % ferait sauter tr_lot_owner_shares_sum au 2e insert).
  update public.lot_owners set end_date = v_eff where lot_id = v_mut.lot_id and end_date is null;
  insert into public.lot_owners (lot_id, coproprietaire_id, copro_id, share_percent, is_primary, start_date)
  values (v_mut.lot_id, v_buyer, v_mut.copro_id, 100, true, v_eff);

  update public.mutations
     set buyer_owner_id = v_buyer, signature_date = p_signature_date, effective_date = v_eff, status = 'validated'
   where id = p_mutation_id;

  update public.mutation_steps
     set status = 'completed', completed_at = now(), completed_by = auth.uid()
   where mutation_id = p_mutation_id and step_key in ('signature_acte', 'cloture_compte') and status <> 'completed';

  return jsonb_build_object('success', true, 'mutation_id', p_mutation_id,
    'buyer_owner_id', v_buyer, 'effective_date', v_eff, 'gl_posted', false);
end; $$;
revoke execute on function public.validate_mutation(uuid, date, date, uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.validate_mutation(uuid, date, date, uuid, text, text, text, text, boolean) to authenticated, service_role;

-- FIN 0076_etat_date_h2h3.sql
