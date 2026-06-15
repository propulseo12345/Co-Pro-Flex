-- 0080_etat_date_identity.sql — ÉTAT DATÉ : figer l'IDENTITÉ des parties dans le payload (valeur probante)
-- ============================================================================================
-- POURQUOI : un état daté (art.5 décret 67-223) est une pièce qui NOMME les parties (syndicat,
--   syndic, lot, vendeur, notaire). Jusqu'ici generate_etat_date_payload (0076) ne renvoyait que
--   les IDENTIFIANTS (copro/seller/lot.id). Le snapshot étant IMMUABLE (etat_date_snapshots), figer
--   les noms à la génération en fait une preuve complète et opposable (Option B, décision USER 2026-06-15).
--
-- CE QUI CHANGE : on enrichit le payload avec des blocs nommés GELÉS, lus aux tables d'identité à v_eff :
--   - copro   (public.copros)          : name, adresse composée, siret, num_immatriculation
--   - syndic  (public.cabinets via copros.cabinet_id, nullable) : name, siret, adresse, email, phone
--   - lot     (public.lots)            : ref, type, floor, surface
--   - seller  (public.coproprietaires) : name (société|civilité+nom), civility, is_company, email, adresse
--   - notaire (public.tiers via mutations.notaire_id, nullable)  : name, office_name, ref, email, adresse
--
-- INCHANGÉ : toute la logique FINANCIÈRE (45x figés, quote-part, cédants H2, P3 H3, ALUR) — copiée à
--   l'identique de 0076. LECTURE SEULE (aucune écriture GL). create_etat_date_snapshot / validate_mutation
--   INCHANGÉES. Les 3 clés racine du CHECK ck_etat_date_payload_parts (0019) sont CONSERVÉES.
-- G-DEF : DEFINER + (is_service_call() OR user_is_copro_manager) + revoke public/anon.

create or replace function public.generate_etat_date_payload(
  p_copro_id      uuid,
  p_mutation_id   uuid,
  p_snapshot_type etat_date_type
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_mut         public.mutations%rowtype;
  v_eff         date;
  v_lot         public.lots%rowtype;
  v_key         uuid;
  v_w           numeric;
  v_total_w     numeric;
  v_items       jsonb;
  v_p1_total    numeric;
  v_p2_items    jsonb;
  v_p2_total    numeric;
  v_by_nature   jsonb;
  v_adv         numeric;
  v_prov        numeric;
  v_cedants     jsonb;
  v_share_cur   numeric;
  v_share_wrk   numeric;
  v_called_cur  numeric;
  v_called_wrk  numeric;
  v_called_alur numeric;
  v_prov_cur    numeric;
  v_prov_wrk    numeric;
  v_alur        numeric;
  -- Blocs d'identité (Option B)
  v_copro       public.copros%rowtype;
  v_cab         public.cabinets%rowtype;
  v_seller      public.coproprietaires%rowtype;
  v_notaire     public.tiers%rowtype;
begin
  select * into v_mut from public.mutations where id = p_mutation_id and copro_id = p_copro_id;
  if v_mut.id is null then
    raise exception 'generate_etat_date_payload: mutation % introuvable (copro %)', p_mutation_id, p_copro_id using errcode = '23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: gestionnaire requis (mutation %)', p_mutation_id using errcode = '42501';
  end if;
  v_eff := coalesce(v_mut.effective_date, v_mut.signature_date, current_date);
  select * into v_lot from public.lots where id = v_mut.lot_id;

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
  -- ALUR à venir (#16) = MAX(0, 5 % de la quote-part courant − ALUR déjà appelé).
  v_alur := round(greatest(0.05 * v_share_cur - v_called_alur, 0), 2);

  -- ════ Identité des parties (GELÉE dans le snapshot — valeur probante art.5) ════
  select * into v_copro from public.copros where id = p_copro_id;
  if v_copro.cabinet_id is not null then
    select * into v_cab from public.cabinets where id = v_copro.cabinet_id;
  end if;
  select * into v_seller from public.coproprietaires where id = v_mut.seller_owner_id;
  if v_mut.notaire_id is not null then
    select * into v_notaire from public.tiers where id = v_mut.notaire_id;
  end if;

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
    -- ── Identité gelée ──
    'lot', jsonb_build_object(
      'id', v_mut.lot_id, 'ref', v_lot.ref, 'type', v_lot.type::text,
      'floor', v_lot.floor, 'surface', v_lot.surface),
    'copro', jsonb_build_object(
      'id', p_copro_id, 'name', v_copro.name,
      'address', nullif(concat_ws(', ', v_copro.address, nullif(trim(concat_ws(' ', v_copro.postal_code, v_copro.city)), '')), ''),
      'siret', v_copro.siret, 'num_immatriculation', v_copro.num_immatriculation),
    'syndic', case when v_cab.id is null then null else jsonb_build_object(
      'name', v_cab.name, 'siret', v_cab.siret, 'email', v_cab.email, 'phone', v_cab.phone,
      'address', nullif(concat_ws(', ', v_cab.address_line1, v_cab.address_line2, nullif(trim(concat_ws(' ', v_cab.postal_code, v_cab.city)), '')), '')) end,
    'seller', jsonb_build_object(
      'id', v_mut.seller_owner_id,
      'name', case when v_seller.is_company then v_seller.company_name
                   else nullif(trim(concat_ws(' ', v_seller.first_name, v_seller.last_name)), '') end,
      'civility', v_seller.civility,
      'is_company', coalesce(v_seller.is_company, false),
      'email', v_seller.email,
      'address', nullif(concat_ws(', ', v_seller.address_line1, v_seller.address_line2, nullif(trim(concat_ws(' ', v_seller.postal_code, v_seller.city)), '')), '')),
    'notaire', case when v_notaire.id is null then null else jsonb_build_object(
      'name', v_notaire.name, 'office_name', v_notaire.office_name, 'notary_reference', v_notaire.notary_reference,
      'email', v_notaire.email, 'phone', v_notaire.phone,
      'address', nullif(concat_ws(', ', v_notaire.address, nullif(trim(concat_ws(' ', v_notaire.postal_code, v_notaire.city)), '')), '')) end,
    'effective_date', v_eff,
    'snapshot_type', p_snapshot_type,
    'legal_reference', 'art.5 decret 67-223',
    'balance_45x_by_nature', v_by_nature
  );
end; $$;
revoke execute on function public.generate_etat_date_payload(uuid, uuid, etat_date_type) from public, anon;
grant execute on function public.generate_etat_date_payload(uuid, uuid, etat_date_type) to authenticated, service_role;

-- FIN 0080_etat_date_identity.sql
