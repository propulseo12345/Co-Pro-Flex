-- 0024_triggers_integrite_gl.sql — FILET D'INTÉGRITÉ DU GRAND LIVRE (et RIEN d'autre)
-- Source : .planning/db-cible/02-finance-grand-livre.md §0.2/§4 (triggers socle légal, A2 élargi)
--          + .planning/db-cible/INVENTAIRE-FONCTIONS.md §M (liste des triggers d'intégrité GL)
--          + colonnes EXACTES vérifiées sur 0013_ledger.sql (ledger_transactions / ledger_entries /
--            accounting_periods) et 0012_accounts.sql (accounts.code / is_postable / nature).
--
-- BUT : poser le filet d'intégrité du grand livre AVANT les RPC finance de 0025. Aucune RPC ne doit
--       pouvoir écrire le GL sans garde. Ce fichier NE CRÉE QUE des fonctions trigger + triggers.
--       AUCUNE table créée. AUCUNE contrainte déclarative posée ici (cf. note « un seul open »).
--
-- CONVENTIONS (alignées 0005 / 0008..0023) :
--   - fonctions trigger en plpgsql, nommées clairement (tr_<x>()) ;
--   - triggers nommés trg_<x> ;
--   - G-TRIG : REVOKE EXECUTE ... FROM public, anon, authenticated (jamais appelées directement) ;
--   - DURCISSEMENT (aligné 0023) : les fonctions qui font des lookups inter-tables (accounts/lots/
--     ledger_transactions/ledger_entries) sont SECURITY DEFINER + `set search_path = public`. Raison :
--     au lot RLS 0026 (RLS ON + FORCE sur finance), un SELECT interne en INVOKER serait soumis à la
--     policy de l'appelant ; si la tx/compte parent n'était pas visible, v_tx_status reviendrait NULL
--     et la garde d'immutabilité serait silencieusement contournée. DEFINER neutralise ce risque.
--     (tr_lot_copro_consistency de 0008 est resté en INVOKER ; on durcit ici DÈS MAINTENANT car ces
--      gardes sont le SOCLE LÉGAL d'immutabilité, pas une simple cohérence de FK.)
--   - bug latent évité : un seul % (jamais %%) dans les RAISE ;
--   - errcode '23514' (check_violation) pour les violations d'intégrité ;
--   - pas de set_updated_at (posé table par table en 0005→0022).
--
-- ============================================================================================
-- DÉJÀ PRÉSENT — NON RECRÉÉ ICI (sinon « create trigger » en double casse `supabase db reset`) :
--   set_updated_at() + tous les trg_*_updated (0005 + chaque table) ;
--   handle_new_user() + on_auth_user_created (0011) ;
--   tr_lot_copro_consistency (0008), tr_lot_owner_copro_consistency + tr_lot_owner_shares_sum (0010),
--   tr_rkl_copro_consistency (0009), tr_invitation_copro_consistency (0011),
--   check_tiers_domain_ids (0015).
--   AUCUN trg_ledger_* ni enforce_lot_id_on_45x n'existe encore = c'est le NEUF de 0024 (vérifié
--   par grep exhaustif sur 0001→0023 : seuls 0013 et ce fichier mentionnent ces noms).
--
-- « UNE SEULE PÉRIODE OPEN PAR COPRO » : DÉJÀ garantie par 0013 via la contrainte DÉCLARATIVE
--   `uq_period_single_open` = UNIQUE INDEX (copro_id) WHERE status='open' (0013, l.33-35).
--   Le blueprint §1.4/§4 (l.178 / l.393) acte ce remplacement du trigger `enforce_single_open_period`
--   par cette contrainte (« déclaratif > trigger »). → 0024 NE pose RIEN sur accounting_periods.
--
-- HORS PÉRIMÈTRE 0024 (repoussé à 0025→0028, NE PAS écrire ici) :
--   - le balayage des tr_*_copro_consistency des autres domaines (finance hors GL strict, AG, GED,
--     maintenance, communication) → posés dans leurs migrations de domaine respectives ;
--   - validate_call_for_funds_total / validate_supplier_invoice_total / validate_payment_allocation /
--     trg_call_line_status_sync / trg_cff_ledger_required (couplés aux RPC posteurs) → 0025 ;
--   - assert_result_allocation_split + v_result_allocation_split (invariant 110/120, assertion
--     in-function appelée par regularize_period) → 0025.
-- ============================================================================================


-- ============================================================================================
-- SECTION 1 — IMMUTABILITÉ DU GRAND LIVRE (en-têtes + lignes)
-- ============================================================================================
-- Une écriture `posted` est gravée dans le marbre (compta d'engagement, décret 2005-240) :
-- on ne la modifie ni ne la supprime ; on la contre-passe par une écriture inverse.

-- 1.1 ledger_transactions : UPDATE interdit dès que la tx est postée
--     (la bascule draft -> posted reste possible : old.status='draft' à ce moment-là).
create or replace function public.tr_ledger_tx_immutable()
returns trigger language plpgsql as $$
begin
  if old.status = 'posted' then
    raise exception 'ledger_transactions % : écriture postée, modification interdite (immutabilité GL)', old.id
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_ledger_tx_immutable
  before update on public.ledger_transactions
  for each row execute function public.tr_ledger_tx_immutable();
revoke execute on function public.tr_ledger_tx_immutable() from public, anon, authenticated;

-- 1.2 ledger_transactions : DELETE interdit si postée (une tx draft peut être supprimée).
create or replace function public.tr_ledger_tx_no_delete_posted()
returns trigger language plpgsql as $$
begin
  if old.status = 'posted' then
    raise exception 'ledger_transactions % : écriture postée, suppression interdite (immutabilité GL)', old.id
      using errcode = '23514';
  end if;
  return old;
end;
$$;
create trigger trg_ledger_tx_no_delete_posted
  before delete on public.ledger_transactions
  for each row execute function public.tr_ledger_tx_no_delete_posted();
revoke execute on function public.tr_ledger_tx_no_delete_posted() from public, anon, authenticated;

-- 1.3 ledger_entries : UPDATE *ET* DELETE interdits dès que la transaction parente est postée.
--     CORRECTIF (revue major — trou central d'immutabilité) : le blueprint §4 (l.386) définit ce
--     trigger comme « UPDATE/DELETE bloqués sur tx posted ». Sans le volet DELETE, un
--     `DELETE FROM ledger_entries WHERE id = ...` d'UNE ligne isolée sur une tx 'posted' n'était
--     bloqué par AUCUN garde : trg_ledger_tx_no_delete_posted ne couvre que l'EN-TÊTE (donc le
--     CASCADE), et tr_check_transaction_balance ne se déclenche qu'AFTER INSERT (pas sur DELETE).
--     On pouvait donc déséquilibrer/altérer en silence une écriture pourtant gravée dans le marbre.
--     → on étend ici à `before update or delete`, en lisant OLD pour les deux cas.
--     Cas LÉGITIME du CASCADE : la suppression d'un en-tête DRAFT emporte ses lignes (ON DELETE
--     CASCADE, 0013 l.86) ; comme la tx est 'draft', v_tx_status='draft' → la garde laisse passer.
create or replace function public.tr_ledger_entry_immutable()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_tx_status ledger_tx_status;
begin
  select status into v_tx_status from public.ledger_transactions where id = old.tx_id;
  if v_tx_status = 'posted' then
    raise exception 'ledger_entries % : ligne d''une écriture postée, modification/suppression interdite (immutabilité GL)', old.id
      using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
create trigger trg_ledger_entry_immutable
  before update or delete on public.ledger_entries
  for each row execute function public.tr_ledger_entry_immutable();
revoke execute on function public.tr_ledger_entry_immutable() from public, anon, authenticated;

-- 1.4 ledger_entries : INSERT interdit dans une transaction déjà postée
--     (on n'ajoute pas une ligne à une écriture gravée ; il faut une nouvelle tx).
create or replace function public.tr_ledger_entry_no_insert_posted()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_tx_status ledger_tx_status;
begin
  select status into v_tx_status from public.ledger_transactions where id = new.tx_id;
  if v_tx_status = 'posted' then
    raise exception 'ledger_entries : insertion interdite dans l''écriture postée % (immutabilité GL)', new.tx_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_ledger_entry_no_insert_posted
  before insert on public.ledger_entries
  for each row execute function public.tr_ledger_entry_no_insert_posted();
revoke execute on function public.tr_ledger_entry_no_insert_posted() from public, anon, authenticated;


-- ============================================================================================
-- SECTION 2 — COHÉRENCE INTRINSÈQUE D'UNE LIGNE DU GRAND LIVRE
-- ============================================================================================

-- 2.1 ledger_entries : copro_id / period_id de la ligne = ceux de l'en-tête ; le compte appartient
--     à la MÊME copro que la tx ; le lot (si renseigné) appartient à cette copro. Empêche toute
--     fuite inter-copro / inter-période dans le GL.
create or replace function public.tr_ledger_entry_consistency()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_tx_copro  uuid;
  v_tx_period uuid;
  v_acc_copro uuid;
  v_lot_copro uuid;
begin
  select copro_id, period_id into v_tx_copro, v_tx_period
  from public.ledger_transactions where id = new.tx_id;

  if v_tx_copro is distinct from new.copro_id then
    raise exception 'ledger_entries % : copro_id (%) divergent de l''en-tête (%)', new.id, new.copro_id, v_tx_copro
      using errcode = '23514';
  end if;
  if v_tx_period is distinct from new.period_id then
    raise exception 'ledger_entries % : period_id (%) divergent de l''en-tête (%)', new.id, new.period_id, v_tx_period
      using errcode = '23514';
  end if;

  select copro_id into v_acc_copro from public.accounts where id = new.account_id;
  if v_acc_copro is distinct from new.copro_id then
    raise exception 'ledger_entries % : compte % appartient à une autre copro', new.id, new.account_id
      using errcode = '23514';
  end if;

  if new.lot_id is not null then
    select copro_id into v_lot_copro from public.lots where id = new.lot_id;
    if v_lot_copro is distinct from new.copro_id then
      raise exception 'ledger_entries % : lot % appartient à une autre copro', new.id, new.lot_id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
create trigger trg_ledger_entry_consistency
  before insert or update on public.ledger_entries
  for each row execute function public.tr_ledger_entry_consistency();
revoke execute on function public.tr_ledger_entry_consistency() from public, anon, authenticated;

-- 2.2 ledger_entries : on ne poste JAMAIS sur un compte non postable (accounts.is_postable=false),
--     ex. le « 450 » parent agrégateur.
--     CORRECTIF (revue minor) : étendu à INSERT *OR* UPDATE. Le blueprint §4 (l.389) décrit ce garde
--     « refuse ligne sur compte is_postable=false », sans restreindre à l'INSERT. Couvre le cas d'un
--     UPDATE d'account_id sur une ligne DRAFT vers un compte agrégateur : l'immutabilité (1.3) ne
--     bloque l'UPDATE que si la tx parente est 'posted' ; sur une tx draft l'UPDATE passerait sinon.
create or replace function public.tr_enforce_is_postable()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_postable boolean;
  v_code     text;
begin
  select is_postable, code into v_postable, v_code
  from public.accounts where id = new.account_id;
  if v_postable is false then
    raise exception 'ledger_entries % : compte % (%) non postable (agrégateur)', new.id, v_code, new.account_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_enforce_is_postable
  before insert or update on public.ledger_entries
  for each row execute function public.tr_enforce_is_postable();
revoke execute on function public.tr_enforce_is_postable() from public, anon, authenticated;

-- 2.3 ledger_entries : A2 (verrou USER) — toute ligne sur un compte de copropriétaire 45x POSTABLE
--     EXIGE lot_id NOT NULL, SANS liste blanche ni exception. Le périmètre 45x se lit sur le préfixe
--     de code `45%` (accounts.nature ne qualifie QUE ces comptes, cf. ck_nature_only_on_45x, 0012).
--     Ne vise PAS 512/401/6x/7x/105/110/120 : aucun lot_id requis sur ces comptes.
create or replace function public.tr_enforce_lot_id_on_45x()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_code     text;
  v_postable boolean;
begin
  select code, is_postable into v_code, v_postable
  from public.accounts where id = new.account_id;

  if v_code like '45%' and v_postable is true and new.lot_id is null then
    raise exception 'ledger_entries % : compte copropriétaire % (45x postable) exige un lot_id (règle lot-centric A2)', new.id, v_code
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_enforce_lot_id_on_45x
  before insert or update on public.ledger_entries
  for each row execute function public.tr_enforce_lot_id_on_45x();
revoke execute on function public.tr_enforce_lot_id_on_45x() from public, anon, authenticated;


-- ============================================================================================
-- SECTION 3 — ÉQUILIBRE DE LA PARTIE DOUBLE (Σ débits = Σ crédits par transaction)
-- ============================================================================================
-- CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED : l'équilibre est vérifié au COMMIT, lorsque
-- TOUTES les lignes de l'écriture sont posées (un contrôle ligne par ligne casserait l'équilibre
-- transitoirement). Couvre tous les chemins d'écriture, RPC comme accès direct.
--
-- SUFFISANCE D'« AFTER INSERT » (dépendance tracée, revue minor) : une tx 'posted' ne peut PLUS
-- muter — ses lignes sont immuables en UPDATE *ET* DELETE (cf. 1.3 corrigé) et aucun INSERT n'y est
-- accepté (1.4). L'équilibre n'a donc à être (re)vérifié qu'à l'INSERT des lignes. Cette suffisance
-- REPOSE explicitement sur l'immutabilité COMPLÈTE (U+D) des lignes posted : si 1.3 ne couvrait que
-- l'UPDATE, un DELETE de ligne déséquilibrerait sans recontrôle — d'où le correctif de 1.3.
--
-- Tolérance d'arrondi : INUTILE ici. amount est numeric(14,2) (0013) — arithmétique EXACTE en base
-- (pas de float), chaque montant stocké à 2 décimales exactement. La somme de numeric(14,2) reste
-- exacte au centime → l'égalité stricte v_debit = v_credit est la bonne assertion (aucun epsilon).
create or replace function public.tr_check_transaction_balance()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  v_debit  numeric(14,2);
  v_credit numeric(14,2);
begin
  -- la tx peut avoir disparu (suppression d'une tx draft → lignes en cascade) : rien à vérifier.
  if not exists (select 1 from public.ledger_transactions where id = new.tx_id) then
    return null;
  end if;

  select
    coalesce(sum(amount) filter (where direction = 'debit'), 0),
    coalesce(sum(amount) filter (where direction = 'credit'), 0)
  into v_debit, v_credit
  from public.ledger_entries
  where tx_id = new.tx_id;

  if v_debit <> v_credit then
    raise exception 'ledger_transactions % : partie double déséquilibrée (débits=% / crédits=%)', new.tx_id, v_debit, v_credit
      using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger trg_check_transaction_balance
  after insert on public.ledger_entries
  deferrable initially deferred
  for each row execute function public.tr_check_transaction_balance();
revoke execute on function public.tr_check_transaction_balance() from public, anon, authenticated;

-- FIN 0024_triggers_integrite_gl.sql