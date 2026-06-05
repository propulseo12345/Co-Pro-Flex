-- 0025_rpc_gl_core.sql -- GL CANONIQUE (sous-lot 1/5 de la chaine finance)
-- Source : .planning/db-cible/02-finance-grand-livre.md S0/S5 (FONCTIONS) + S6 copro-template
--          + INVENTAIRE-FONCTIONS.md SA + AUTORISATION.md S5.3/S5.1/S2.3
--          + contrats LIVE EXACTS (migrations_legacy) + colonnes verifiees sur 0012/0013/0002.
--
-- BUT : poser les PRIMITIVES d'ecriture du grand livre (route canonique create/post), le
--       provisionnement du plan de comptes, et 2 helpers GL. Ce fichier NE CREE QUE des FONCTIONS.
--       AUCUNE table. AUCUN trigger. AUCUN objet 0001->0024 recree ni retouche.
--
-- IMMUTABILITE / REGENERATION : is_ledger_regen_exempt + le recablage des 4 triggers d'immutabilite
--   vivent desormais en 0024 (SECTION 0, self-coherent -- decision USER). create_ledger_transaction
--   ecrit DONC a travers le filet 0024 : ecritures EQUILIBREES, lot_id sur les 45x, jamais sur un
--   compte non postable, periode 'open' obligatoire. La regeneration runtime (affectation/cloture/
--   a-nouveaux) reste permise par l'exemption 0024 tant que la periode n'est pas 'approved'.
--
-- CONVENTIONS (durcissement transverse -- lecon 0023/0024) :
--   - SECURITY DEFINER + set search_path = public ; STABLE (lectures), VOLATILE (ecritures) ;
--   - deny-by-default : REVOKE EXECUTE FROM public, anon ; GRANT authenticated (+ service_role
--     pour les G-MGR/G-SVC a branche machine) ;
--   - un seul % (jamais %%) ; errcode '42501' forbidden, '23514' integrite (aligne 0024) ;
--   - PAS de WHEN OTHERS masquant : l'exception remonte (rollback reel).
--
-- Ordre de declaration (helpers AVANT les RPC qui les appellent) :
--   1) resolve_lot_tiers_account  (G-INTERNAL -- sous-compte 450-x par nature)
--   2) get_period_for_date        (G-INTERNAL -- exercice contenant une date, cut-off)
--   3) provision_copro_chart      (G-MGR -- plan de comptes standard d'une copro)
--   4) create_ledger_transaction  (G-MGR + G-SVC -- ROUTE CANONIQUE d'ecriture du GL)
--   5) post_ledger_transaction    (G-MGR + G-SVC -- bascule draft -> posted)

-- ============================================================================================
-- 1. resolve_lot_tiers_account(p_copro_id, p_nature) -> sous-compte créance 450-x  [G-INTERNAL]
-- ============================================================================================
-- Résout le sous-compte de créance copropriétaire par NATURE (mappe la nature -> code 450-x) :
--   current -> 450-1 · works -> 450-2 · advance -> 450-3 · loan -> 450-4 · alur -> 450-5.
-- (Le mapping reflète accounts.nature ∈ account_receivable_nature ; les 450-x sont provisionnés
--  par provision_copro_chart §4, qui pose la nature à la création — fin du parsing de code.)
-- NB : 'doubtful' (459) n'est PAS une cible d'appel/paiement courant (créance douteuse, traitée
--  hors imputation FIFO) → volontairement absent du mapping ; son compte porte néanmoins sa nature
--  dans le chart (§4) pour permettre la résolution par accounts.nature côté dépréciation.
-- Lève si la nature est inconnue ou si le sous-compte n'est pas provisionné pour la copro.
-- STABLE (lecture pure). Appelée par les posteurs métier (appel de fonds, paiement copro…).
create or replace function public.resolve_lot_tiers_account(p_copro_id uuid, p_nature text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_code       text;
  v_account_id uuid;
begin
  v_code := case lower(p_nature)
    when 'current' then '450-1'   -- budget prévisionnel courant
    when 'works'   then '450-2'   -- travaux art. 14-2
    when 'advance' then '450-3'   -- avances
    when 'loan'    then '450-4'   -- emprunts
    when 'alur'    then '450-5'   -- fonds de travaux ALUR
    else null
  end;

  if v_code is null then
    raise exception 'resolve_lot_tiers_account: nature inconnue "%" (attendu: current|works|advance|loan|alur)', p_nature;
  end if;

  select id into v_account_id
  from public.accounts
  where copro_id = p_copro_id and code = v_code;

  if v_account_id is null then
    raise exception 'resolve_lot_tiers_account: sous-compte % introuvable pour la copro % (à provisionner avant tout appel/paiement)', v_code, p_copro_id;
  end if;

  return v_account_id;
end;
$$;
revoke execute on function public.resolve_lot_tiers_account(uuid, text) from public, anon;
grant execute on function public.resolve_lot_tiers_account(uuid, text) to authenticated, service_role;


-- ============================================================================================
-- 2. get_period_for_date(p_copro_id, p_date) -> exercice contenant la date  [G-INTERNAL]
-- ============================================================================================
-- Helper cut-off : trouve l'exercice (accounting_periods) de la copro dont l'intervalle
-- [start_date ; end_date] contient p_date. Retourne NULL si aucun exercice ne couvre la date
-- (l'appelant décide quoi faire — pas de RAISE ici, lecture pure). STABLE.
-- Borne défensive : si plusieurs exercices se chevauchaient (ne devrait pas arriver), on prend
-- le plus récent par start_date (LIMIT 1).
create or replace function public.get_period_for_date(p_copro_id uuid, p_date date)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period_id uuid;
begin
  select ap.id into v_period_id
  from public.accounting_periods ap
  where ap.copro_id = p_copro_id
    and p_date between ap.start_date and ap.end_date
  order by ap.start_date desc
  limit 1;

  return v_period_id;
end;
$$;
revoke execute on function public.get_period_for_date(uuid, date) from public, anon;
grant execute on function public.get_period_for_date(uuid, date) to authenticated, service_role;


-- (is_ledger_regen_exempt ET le recablage des 4 triggers d'immutabilite ont ete DEPLACES
--  en 0024 -- decision USER << 0024 self-coherent >> : 0025 ne touche plus aucun objet de 0024.)


-- ============================================================================================
-- 3. provision_copro_chart(p_copro_id) -> integer  [G-MGR]
-- ============================================================================================
-- Crée le plan de comptes standard (décret 2005-240) d'une copropriété : classes 1/4/5/6/7,
-- dont les sous-comptes copropriétaires 450-1..5 + 459 (créances douteuses), le chapeau
-- agrégateur 450 (is_postable=false), les comptes d'attente de reprise de mandat 471/472, etc.
-- Idempotente : ON CONFLICT (copro_id, code) DO NOTHING → ne touche jamais l'existant.
-- Conformité au filet 0024 :
--   - is_postable : false UNIQUEMENT sur le chapeau '450' (agrégateur), true partout ailleurs
--     (les sous-comptes 450-1..5/459 SONT postables et exigeront lot_id, cf. trg_enforce_lot_id_on_45x) ;
--   - nature : posée UNIQUEMENT sur les comptes 45% (ck_nature_only_on_45x, 0012) — 450-1..5
--     reçoivent leur account_receivable_nature ; 459 reçoit 'doubtful' (créance douteuse, mappée par
--     l'enum §2) ; le chapeau 450 reste à nature NULL (agrégateur, pas une créance d'une nature) ;
--   - is_system : true sur le chapeau '450' (protégé), cohérent avec la référence live.
-- VOLATILE (écriture). Retourne le nombre de comptes effectivement insérés.
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
      ('110',  'Solde en attente sur travaux et opérations exceptionnelles','equity',   null),
      ('120',  'Solde en attente sur opérations courantes',               'equity',    null),
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


-- ============================================================================================
-- 4. create_ledger_transaction(...) -> jsonb  [G-MGR + G-SVC]  — ROUTE CANONIQUE D'ÉCRITURE GL
-- ============================================================================================
-- Insère 1 en-tête (ledger_transactions) + N lignes (ledger_entries) en partie double depuis le
-- tableau jsonb p_entries (clés par ligne : account_id, lot_id?, direction debit|credit, amount,
-- entry_label?). Si p_auto_post ET équilibre Σdébit=Σcrédit, délègue à post_ledger_transaction
-- (bascule draft -> posted, qui revérifie tout). Retourne le jsonb de post_ledger_transaction si
-- auto-post, sinon {success:true, tx_id, total_debit, total_credit, status:'draft'}.
--
-- RÉÉCRITURE vs live (verdict §3, AUTORISATION §5.3) :
--   - SUPPRESSION du « WHEN OTHERS THEN success:false » qui masquait l'exception et avalait le
--     rollback (anti-pattern compta) → toute erreur (déséquilibre via le constraint trigger
--     DEFERRED, lot_id manquant sur 45x, compte non postable, période close…) REMONTE et
--     provoque un vrai ROLLBACK ;
--   - GARDE G-MGR + G-SVC (§5.3) : is_service_call() OU user_is_copro_manager(p_copro_id),
--     sinon RAISE 42501 — DEFINER bypasse la RLS, cette garde est le seul rempart ;
--   - VÉRIFICATION PÉRIODE : p_period_id DOIT appartenir à p_copro_id ET status='open'
--     (sinon RAISE) — interdit toute écriture dans une période close/approuvée dès la création
--     (le filet 0024 ne contrôle pas le statut de période à l'insert ; post_ledger_transaction le
--     revérifie, mais on échoue tôt pour ne pas créer de tx draft orpheline en période close).
-- VOLATILE. created_by = auth.uid() (NULL en appel service_role, cohérent).
create or replace function public.create_ledger_transaction(
  p_copro_id    uuid,
  p_period_id   uuid,
  p_tx_date     date,
  p_label       text,
  p_source_type text    default null,
  p_source_id   uuid    default null,
  p_entries     jsonb   default '[]'::jsonb,
  p_auto_post   boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id        uuid;
  v_entry        jsonb;
  v_total_debit  numeric(14,2) := 0;
  v_total_credit numeric(14,2) := 0;
  v_period_copro uuid;
  v_period_status period_status;
begin
  -- Garde §5.3 : gestionnaire de la copro OU appel machine de confiance.
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id
      using errcode = '42501';
  end if;

  -- Vérif période : appartient à la copro ET ouverte (pas d'écriture en période close/approuvée).
  select ap.copro_id, ap.status
    into v_period_copro, v_period_status
  from public.accounting_periods ap
  where ap.id = p_period_id;

  if v_period_copro is null then
    raise exception 'create_ledger_transaction: période % introuvable', p_period_id
      using errcode = '23503';
  end if;
  if v_period_copro is distinct from p_copro_id then
    raise exception 'create_ledger_transaction: la période % n''appartient pas à la copro %', p_period_id, p_copro_id
      using errcode = '23514';
  end if;
  if v_period_status <> 'open' then
    raise exception 'create_ledger_transaction: période % non ouverte (statut=%) — écriture interdite', p_period_id, v_period_status
      using errcode = '23514';
  end if;

  -- En-tête (le cast text -> ledger_source_type valide la valeur ; NULL accepté).
  insert into public.ledger_transactions (
    copro_id, period_id, tx_date, label, source_type, source_id, created_by
  ) values (
    p_copro_id, p_period_id, p_tx_date, p_label,
    p_source_type::public.ledger_source_type, p_source_id, auth.uid()
  )
  returning id into v_tx_id;

  -- Lignes (partie double). Les triggers 0024 valident chaque ligne (postable, lot_id sur 45x,
  -- cohérence copro/période) ; l'équilibre est vérifié au COMMIT par le constraint trigger DEFERRED.
  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    insert into public.ledger_entries (
      tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label
    ) values (
      v_tx_id,
      p_copro_id,
      p_period_id,
      (v_entry->>'account_id')::uuid,
      nullif(v_entry->>'lot_id', '')::uuid,
      (v_entry->>'direction')::public.ledger_direction,
      (v_entry->>'amount')::numeric,
      v_entry->>'entry_label'
    );

    if (v_entry->>'direction') = 'debit' then
      v_total_debit := v_total_debit + (v_entry->>'amount')::numeric;
    else
      v_total_credit := v_total_credit + (v_entry->>'amount')::numeric;
    end if;
  end loop;

  -- Auto-post si demandé et équilibré (post_ledger_transaction revérifie tout : période, ≥1 ligne,
  -- équilibre, immutabilité). numeric(14,2) = arithmétique exacte au centime → égalité stricte.
  if p_auto_post and v_total_debit = v_total_credit then
    return public.post_ledger_transaction(v_tx_id);
  end if;

  return jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'status', 'draft'
  );
end;
$$;
revoke execute on function public.create_ledger_transaction(uuid, uuid, date, text, text, uuid, jsonb, boolean) from public, anon;
grant execute on function public.create_ledger_transaction(uuid, uuid, date, text, text, uuid, jsonb, boolean) to authenticated, service_role;


-- ============================================================================================
-- 5. post_ledger_transaction(p_tx_id) -> jsonb  [G-MGR + G-SVC]  — bascule draft -> posted
-- ============================================================================================
-- Valide une transaction 'draft' et la passe en 'posted' (À PARTIR D'ICI = IMMUABLE) :
--   refuse si déjà posted / période non 'open' / 0 ligne / déséquilibre ; sinon
--   status='posted', posted_at=now(), posted_by=auth.uid().
--
-- RÉÉCRITURE vs live (verdict §3, AUTORISATION §5.3) :
--   - SUPPRESSION du « WHEN OTHERS THEN success:false » masquant → l'exception remonte (rollback) ;
--   - SUPPRESSION du bloc ledger_locks (verrou WP5.2 ABANDONNÉ, table morte non recréée — le gel
--     est binaire : status='open' ⇒ écriture possible, sinon non) ;
--   - GARDE G-MGR + G-SVC : is_service_call() OU user_is_copro_manager (la copro est dérivée de la
--     tx) sinon RAISE 42501 ;
--   - équilibre : égalité STRICTE Σdébit=Σcrédit (numeric(14,2) exact, aucun epsilon — cohérent
--     avec le constraint trigger 0024).
-- Les cas fonctionnels d'échec (déjà posted / période close / 0 ligne / déséquilibre) restent
-- retournés en {success:false, error, …} : ce ne sont PAS des exceptions masquées mais des
-- pré-conditions métier explicites (le live les retournait déjà ainsi, hors WHEN OTHERS). Les
-- appelants (post_owner_payment, post_supplier_invoice…) testent (->>'success') et RAISE eux-mêmes.
-- VOLATILE.
create or replace function public.post_ledger_transaction(p_tx_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx           record;
  v_period       record;
  v_total_debit  numeric(14,2);
  v_total_credit numeric(14,2);
  v_entry_count  integer;
begin
  -- 1. La transaction existe ?
  select * into v_tx
  from public.ledger_transactions
  where id = p_tx_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Transaction not found',
      'tx_id', p_tx_id
    );
  end if;

  -- Garde §5.3 : gestionnaire de la copro de la tx OU appel machine de confiance.
  if not public.is_service_call() and not public.user_is_copro_manager(v_tx.copro_id) then
    raise exception 'forbidden: manager required for copro %', v_tx.copro_id
      using errcode = '42501';
  end if;

  -- 2. Déjà postée ?
  if v_tx.status = 'posted' then
    return jsonb_build_object(
      'success', false,
      'error', 'Transaction already posted',
      'tx_id', p_tx_id,
      'posted_at', v_tx.posted_at
    );
  end if;

  -- 3. Période ouverte ?
  select * into v_period
  from public.accounting_periods
  where id = v_tx.period_id;

  if v_period.status <> 'open' then
    return jsonb_build_object(
      'success', false,
      'error', format('Period is not open (status=%s)', v_period.status),
      'tx_id', p_tx_id,
      'period_id', v_tx.period_id,
      'period_status', v_period.status
    );
  end if;

  -- 4. Totaux + nombre de lignes.
  select
    coalesce(sum(amount) filter (where direction = 'debit'), 0),
    coalesce(sum(amount) filter (where direction = 'credit'), 0),
    count(*)
  into v_total_debit, v_total_credit, v_entry_count
  from public.ledger_entries
  where tx_id = p_tx_id;

  -- 5. Au moins une ligne ?
  if v_entry_count = 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'Transaction has no entries',
      'tx_id', p_tx_id
    );
  end if;

  -- 6. Équilibre strict (numeric(14,2) exact).
  if v_total_debit <> v_total_credit then
    return jsonb_build_object(
      'success', false,
      'error', 'Transaction is not balanced',
      'tx_id', p_tx_id,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit,
      'difference', v_total_debit - v_total_credit
    );
  end if;

  -- 7. Bascule draft -> posted (immuable à partir d'ici, cf. triggers 0024 recâblés SECTION 0).
  update public.ledger_transactions
  set status    = 'posted',
      posted_at = now(),
      posted_by = auth.uid()
  where id = p_tx_id;

  -- 8. Succès.
  return jsonb_build_object(
    'success', true,
    'tx_id', p_tx_id,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'entry_count', v_entry_count,
    'posted_at', now()
  );
end;
$$;
revoke execute on function public.post_ledger_transaction(uuid) from public, anon;
grant execute on function public.post_ledger_transaction(uuid) to authenticated, service_role;

-- FIN 0025_rpc_gl_core.sql