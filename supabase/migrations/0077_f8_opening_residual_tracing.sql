-- 0077_f8_opening_residual_tracing.sql — F8 Brique 1 : traçabilité du résidu 471/472 (art.10)
-- ============================================================================================
-- Source : .planning/PLAN_J5_2026-06-15.md T6 Brique 1 + arbitrages §5 (#20 détail art.10 en TABLE
--   COMPAGNE hors-GL ; #21 lot_id optionnel, somme == résidu en WARNING + flag stale).
--
-- CONTEXTE : set_opening_balance (0027) pose un résidu net en 471 (débiteur) / 472 (créditeur) =
--   complément d'équilibre de la reprise de mandat. L'art.10 du décret 2005-240 impose de DÉTAILLER
--   ce qui compose ce résidu (créances/dettes non encore imputées). On stocke ce détail dans une TABLE
--   COMPAGNE HORS-GL (le grand livre n'est pas touché : le détail est extra-comptable, modifiable).
--
-- VÉRIF « table similaire » (instruction Lyes) : aucune table de détail de résidu n'existe ; treasury_advances
--   est un autre domaine (avances de trésorerie copro art.35, pas la reprise 471/472). -> table NEUVE justifiée.
--
-- FLAG STALE : le résidu GL peut bouger (re-saisie set_opening_balance). On fige residual_amount_at_save
--   à l'enregistrement du détail ; get_*_detail renvoie stale=true si le résidu GL courant a changé depuis.
-- DÉTAIL ≠ RÉSIDU = WARNING (jamais bloquant, #21) : la reprise peut s'affiner progressivement.

-- ============================================================================================
-- 1. Table compagne opening_balance_residual_items (HORS-GL)
-- ============================================================================================
create table public.opening_balance_residual_items (
  id                       uuid             not null default gen_random_uuid(),
  copro_id                 uuid             not null references public.copros(id) on delete restrict,
  period_id                uuid             not null references public.accounting_periods(id) on delete restrict,
  label                    text             not null,
  origin_date              date,
  amount                   numeric(14,2)    not null,
  direction                ledger_direction not null,           -- debit = compose le 471 ; credit = le 472
  lot_id                   uuid             references public.lots(id) on delete restrict,  -- optionnel (#21)
  residual_amount_at_save  numeric(14,2)    not null,           -- résidu GL net figé à l'enregistrement (flag stale)
  created_at               timestamptz      not null default now(),
  constraint pk_opening_balance_residual_items primary key (id),
  constraint ck_obri_amount                    check (amount > 0)
);
create index idx_obri_copro_period
  on public.opening_balance_residual_items (copro_id, period_id);

comment on table public.opening_balance_residual_items is
  'Detail art.10 du residu de reprise de mandat (471/472), HORS-GL (extra-comptable). signed = Σ(debit−credit) ; doit ≈ residu GL (sinon warning). residual_amount_at_save fige le residu a l enregistrement -> flag stale si le GL bouge.';


-- ============================================================================================
-- 2. Helper interne : résidu GL net courant (471/472 de la reprise opening_onboarding)  [G-INTERNAL]
-- ============================================================================================
-- residu net = Σ(debit−credit) sur 471 ET 472 : 471 débiteur -> +, 472 créditeur -> − (cohérent set_opening_balance).
create or replace function public.opening_residual_gl(p_copro_id uuid, p_period_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(round(sum(case when e.direction = 'debit' then e.amount else -e.amount end), 2), 0)
  from public.ledger_entries e
  join public.ledger_transactions t on t.id = e.tx_id and t.status = 'posted'
  join public.accounts a on a.id = e.account_id
  where e.copro_id = p_copro_id and e.period_id = p_period_id
    and t.source_type = 'opening_onboarding' and a.code in ('471', '472');
$$;
revoke execute on function public.opening_residual_gl(uuid, uuid) from public, anon;
grant execute on function public.opening_residual_gl(uuid, uuid) to authenticated, service_role;


-- ============================================================================================
-- 3. set_opening_balance_residual_detail(p_copro_id, p_period_id, p_items) -> jsonb   [G-MGR]
-- ============================================================================================
-- DELETE+INSERT idempotent. Vérifie que p_period_id APPARTIENT à p_copro_id (trou IDOR) + statut open.
-- Stocke residual_amount_at_save = résidu GL courant. NE TOUCHE PAS LE GL. Renvoie le delta signed vs résidu.
create or replace function public.set_opening_balance_residual_detail(
  p_copro_id  uuid,
  p_period_id uuid,
  p_items     jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status period_status;
  v_pcopro uuid;
  v_residual numeric;
  v_signed numeric := 0;
  v_item jsonb;
  v_cnt integer := 0;
begin
  if not public.is_service_call() and not public.user_is_copro_manager(p_copro_id) then
    raise exception 'forbidden: manager required for copro %', p_copro_id using errcode = '42501';
  end if;

  -- IDOR : la période doit appartenir à la copro.
  select copro_id, status into v_pcopro, v_status from public.accounting_periods where id = p_period_id;
  if v_pcopro is null then
    raise exception 'set_opening_balance_residual_detail: période % introuvable', p_period_id using errcode = '23503';
  end if;
  if v_pcopro is distinct from p_copro_id then
    raise exception 'set_opening_balance_residual_detail: la période % n''appartient pas à la copro %', p_period_id, p_copro_id using errcode = '23514';
  end if;
  if v_status <> 'open' then
    raise exception 'set_opening_balance_residual_detail: période % non ouverte (statut=%)', p_period_id, v_status using errcode = '23514';
  end if;

  v_residual := public.opening_residual_gl(p_copro_id, p_period_id);

  -- Idempotent : on repart d'une ardoise vierge pour cette copro×période.
  delete from public.opening_balance_residual_items where copro_id = p_copro_id and period_id = p_period_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.opening_balance_residual_items
      (copro_id, period_id, label, origin_date, amount, direction, lot_id, residual_amount_at_save)
    values (
      p_copro_id, p_period_id,
      coalesce(v_item->>'label', 'Sans libellé'),
      nullif(v_item->>'origin_date','')::date,
      (v_item->>'amount')::numeric,
      (v_item->>'direction')::ledger_direction,
      nullif(v_item->>'lot_id','')::uuid,
      v_residual
    );
    v_signed := v_signed + case when (v_item->>'direction') = 'debit' then (v_item->>'amount')::numeric else -(v_item->>'amount')::numeric end;
    v_cnt := v_cnt + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'items_count', v_cnt,
    'residual_gl', v_residual,
    'detail_signed', round(v_signed, 2),
    'balanced', abs(round(v_signed, 2) - v_residual) < 0.01,
    'warning', case when abs(round(v_signed, 2) - v_residual) >= 0.01
                    then 'Le détail (' || round(v_signed,2) || ') ne correspond pas au résidu GL (' || v_residual || ')'
                    else null end
  );
end;
$$;
revoke execute on function public.set_opening_balance_residual_detail(uuid, uuid, jsonb) from public, anon;
grant execute on function public.set_opening_balance_residual_detail(uuid, uuid, jsonb) to authenticated, service_role;


-- ============================================================================================
-- 4. get_opening_balance_residual_detail(p_copro_id, p_period_id) -> jsonb   [G-DEF-RO]
-- ============================================================================================
-- Renvoie les items + le résidu GL courant + flag STALE (le résidu a changé depuis l'enregistrement)
-- + balanced (somme signée == résidu courant).
create or replace function public.get_opening_balance_residual_detail(
  p_copro_id  uuid,
  p_period_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_items jsonb;
  v_residual numeric;
  v_signed numeric;
  v_saved numeric;
begin
  if not public.is_service_call() and not public.user_has_copro_access(p_copro_id) then
    raise exception 'forbidden: copro access required for copro %', p_copro_id using errcode = '42501';
  end if;

  v_residual := public.opening_residual_gl(p_copro_id, p_period_id);

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'label', label, 'origin_date', origin_date, 'amount', amount,
      'direction', direction, 'lot_id', lot_id
    ) order by created_at), '[]'::jsonb),
    coalesce(sum(case when direction = 'debit' then amount else -amount end), 0),
    -- min (conservateur) : tous les items partagent la même valeur (posée en bloc), mais si une
    -- incohérence survenait, on déclenche le stale plutôt que de le masquer.
    min(residual_amount_at_save)
  into v_items, v_signed, v_saved
  from public.opening_balance_residual_items
  where copro_id = p_copro_id and period_id = p_period_id;

  return jsonb_build_object(
    'items', v_items,
    'residual_gl', v_residual,
    'detail_signed', round(v_signed, 2),
    'balanced', abs(round(v_signed, 2) - v_residual) < 0.01,
    -- stale : un détail a été saisi (v_saved non NULL) mais le résidu GL a changé depuis.
    'stale', (v_saved is not null and abs(v_saved - v_residual) >= 0.01)
  );
end;
$$;
revoke execute on function public.get_opening_balance_residual_detail(uuid, uuid) from public, anon;
grant execute on function public.get_opening_balance_residual_detail(uuid, uuid) to authenticated, service_role;

-- FIN 0077_f8_opening_residual_tracing.sql
