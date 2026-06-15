-- 0067_charge_nature_corrective.sql
-- ============================================================================================
-- T10 (J5) — Correctif de classification accounts.charge_nature (décision validée Lyes 2026-06-15).
--
-- BUG (0059) : 661 (remboursement annuités d'emprunt), 662 (autres charges financières et agios) et
-- 704 (remboursements d'annuités d'emprunts) tombaient en 'courant' par fallback, alors qu'ils
-- relèvent du résultat TRAVAUX (financement des travaux : emprunt collectif + agios + remboursement
-- d'annuités). La liste 'travaux' de 0059 (671,672,673,674,677,678,6221,702,705,706) les omettait.
--
-- CE QUI EST CORRIGÉ :
--   (1) provision_copro_chart : la branche 'travaux' du seed gagne 661,662,704 (futures copros).
--   (2) backfill ciblé des comptes EXISTANTS encore en 'courant' (copros déjà provisionnées).
--
-- INVARIANTS (ne PAS toucher) :
--   - 711 (subventions) RESTE 'courant' (bascule travaux via operation_id E4 ; gate_charge_nature_e2e
--     l'asserte explicitement).
--   - open_next_period et v_result_allocation_split (0059) lisent déjà accounts.charge_nature : on NE
--     les régénère PAS (cela effacerait la précédence operation_id câblée en E4/0060). Le correctif de
--     données suffit, la logique de lecture est inchangée.
--   - CHECK ck_accounts_charge_nature (0059) inchangé : 661/662/704 sont classe 6/7, 'travaux' est une
--     valeur autorisée -> aucun conflit de contrainte.
-- ============================================================================================

-- ── 1. provision_copro_chart : ajoute 661,662,704 à la branche 'travaux' (futures copros) ───
-- Corps EXTRAIT VERBATIM de 0059 ; SEULE différence : la liste de codes 'travaux' du CASE final
-- gagne 661,662,704 (le backfill 0059 n'est PAS rejoué — voir bloc 2 pour les comptes existants).
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
    -- T10/0067 : +661,662,704 en 'travaux' (financement travaux : annuités emprunt + agios).
    case when c.code in ('661','662','671','672','673','674','677','678','6221','702','704','705','706') then 'travaux'
         when substr(c.code, 1, 1) in ('6', '7') then 'courant' else null end
  from chart c
  on conflict (copro_id, code) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;
revoke execute on function public.provision_copro_chart(uuid) from public, anon;
grant execute on function public.provision_copro_chart(uuid) to authenticated, service_role;


-- ── 2. Backfill ciblé des comptes EXISTANTS (copros déjà provisionnées) ──────────────────────
-- Reclasse 661/662/704 mal classés en 'courant'. Garde `= 'courant'` : ne touche pas un compte déjà
-- 'travaux' (idempotent) ni un éventuel NULL (impossible ici, ce sont des comptes de classe 6/7).
update public.accounts
   set charge_nature = 'travaux'
 where code in ('661', '662', '704')
   and charge_nature = 'courant';

-- FIN 0067_charge_nature_corrective.sql
