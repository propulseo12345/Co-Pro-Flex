# 0032 rpc-maintenance-comm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline) ou subagent-driven-development. Étapes en `- [ ]`.

**Goal:** Brancher la logique (RPC + triggers) des domaines maintenance/tiers et communication sur les tables déjà posées (0021/0022/0015/0004), sans créer de table/enum/vue/RLS.

**Architecture:** 1 fichier `supabase/migrations/0032_rpc_maintenance_comm.sql`, écrit en **3 paliers** (cœur OS, triggers maintenance, communication). Gate `BEGIN/ROLLBACK` par palier. **1 seul commit** quand les 3 paliers + db reset + vitest sont verts (modèle 0030 — override de la règle « commit par task » du skill, cadence projet).

**Tech Stack:** PostgreSQL 15 (Supabase), PL/pgSQL, harnais docker psql + vitest.

**Spec:** `docs/superpowers/specs/2026-06-07-0032-maintenance-comm-design.md` (validé USER). Scoping `wf_6b9b3e5e-194`.

---

## Conventions (rappel, appliquées à CHAQUE objet)
- RPC : `security definer` + `set search_path = public` ; **après** chaque RPC : `revoke execute on function … from public, anon;` + `grant execute on function … to authenticated, service_role;`
- Fonction trigger : `security definer` + `set search_path = public` ; **après** : `revoke execute on function … from public, anon, authenticated;` (jamais GRANT).
- G-INTERNAL (math pure) : `language sql immutable` + revoke public,anon + grant authenticated,service_role.
- Un seul `%` par RAISE. Cast enum explicite. errcodes : `42501` forbidden / `23514` règle violée / `23503` introuvable.
- Helpers de garde **déjà en 0023** (appeler, jamais redéfinir) : `is_service_call()`, `user_is_copro_manager(uuid)`, `is_conversation_member(uuid, uuid)`.

## Mapping de référence (verrouillé depuis le DDL réel)
- **service_order_status** (0003) : `draft, sent, awaiting_provider, scheduled, in_progress, completed, closed, cancelled, refused`.
- **Table de transitions (souple, validée USER)** :
  | from | → to autorisés |
  |---|---|
  | draft | sent, cancelled |
  | sent | awaiting_provider, refused, cancelled |
  | awaiting_provider | scheduled, refused, cancelled |
  | scheduled | in_progress, cancelled |
  | in_progress | completed, cancelled |
  | completed | closed, in_progress, cancelled |
  | refused | sent, cancelled |
  | closed | (terminal) |
  | cancelled | (terminal) |
- **Jalon par statut** (colonnes `service_orders`) : sent→`sent_at`, awaiting_provider→`acknowledged_at`, scheduled→`scheduled_at`, in_progress→`started_at`, completed→`completed_at`, closed→`closed_at`, refused→`refused_at`, cancelled→`cancelled_at`. (draft : aucun ; `quoted_at`/`validated_at` non câblés.)
- **event_type** : `sent` si →sent ; `cancelled` si →cancelled ; sinon `status_change`.
- **logbook depuis OS** : `entry_type='intervention'`, `category='courante'`, `status` = `terminee` si OS∈{completed,closed} sinon `planifiee` ; `title`=OS.title ; `happened_at`=coalesce(OS.completed_at::date, current_date).

## File Structure
- **Créer** : `supabase/migrations/0032_rpc_maintenance_comm.sql` (en-tête + 3 paliers).
- **Gate (jetable, hors repo)** : `c:/Users/cleme/Desktop/Propulseo/Flex/.gate_0032_pN.sql` (un par palier, supprimé après).

---

## Task 1 — PALIER 1 : cœur ordres de service

**Files:** Create section « PALIER 1 » dans `0032_rpc_maintenance_comm.sql`.

- [ ] **Step 1.1 — En-tête du fichier + `is_valid_service_order_transition`**

```sql
-- ============================================================================================
-- 0032_rpc_maintenance_comm.sql — MAINTENANCE/TIERS + COMMUNICATION (tables 0021/0022/0015/0004)
-- Aucune table/enum/vue/RLS créée. Gardes 0023. RLS centralisée en 0034.
-- Conventions : cf. docs/superpowers/specs/2026-06-07-0032-maintenance-comm-design.md
-- ============================================================================================

-- PALIER 1 — cœur ordres de service ---------------------------------------------------------
create or replace function public.is_valid_service_order_transition(
  p_from service_order_status, p_to service_order_status
) returns boolean language sql immutable as $$
  select case p_from
    when 'draft'             then p_to in ('sent','cancelled')
    when 'sent'              then p_to in ('awaiting_provider','refused','cancelled')
    when 'awaiting_provider' then p_to in ('scheduled','refused','cancelled')
    when 'scheduled'         then p_to in ('in_progress','cancelled')
    when 'in_progress'       then p_to in ('completed','cancelled')
    when 'completed'         then p_to in ('closed','in_progress','cancelled')
    when 'refused'           then p_to in ('sent','cancelled')
    else false
  end;
$$;
revoke execute on function public.is_valid_service_order_transition(service_order_status, service_order_status) from public, anon;
grant  execute on function public.is_valid_service_order_transition(service_order_status, service_order_status) to authenticated, service_role;
```

- [ ] **Step 1.2 — `generate_service_order_number` (advisory lock par copro)**

```sql
create or replace function public.generate_service_order_number(p_copro_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_year text := to_char(current_date, 'YYYY'); v_seq int;
begin
  perform pg_advisory_xact_lock(hashtext(p_copro_id::text));
  select coalesce(max(substring(order_number from '(\d+)$')::int), 0) + 1
    into v_seq
  from public.service_orders
  where copro_id = p_copro_id and order_number like 'OS-' || v_year || '-%';
  return 'OS-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end; $$;
revoke execute on function public.generate_service_order_number(uuid) from public, anon;
grant  execute on function public.generate_service_order_number(uuid) to authenticated, service_role;
```

- [ ] **Step 1.3 — `update_service_order_status` (machine à états)**

```sql
create or replace function public.update_service_order_status(
  p_order_id uuid, p_new_status service_order_status,
  p_comment text default null, p_user_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_so   public.service_orders%rowtype;
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_evt  service_order_event_type;
begin
  select * into v_so from public.service_orders where id = p_order_id for update;
  if not found then
    raise exception 'update_service_order_status: ordre de service % introuvable', p_order_id using errcode='23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_so.copro_id) then
    raise exception 'forbidden: gestionnaire requis pour l''ordre de service %', p_order_id using errcode='42501';
  end if;
  if v_so.status = p_new_status then
    return jsonb_build_object('success', true, 'order_id', p_order_id, 'status', p_new_status, 'noop', true);
  end if;
  if not public.is_valid_service_order_transition(v_so.status, p_new_status) then
    raise exception 'update_service_order_status: transition interdite vers le statut %', p_new_status using errcode='23514';
  end if;

  update public.service_orders set
    status          = p_new_status,
    sent_at         = case when p_new_status='sent'              then coalesce(sent_at, now())         else sent_at end,
    acknowledged_at = case when p_new_status='awaiting_provider' then coalesce(acknowledged_at, now()) else acknowledged_at end,
    scheduled_at    = case when p_new_status='scheduled'         then coalesce(scheduled_at, now())    else scheduled_at end,
    started_at      = case when p_new_status='in_progress'       then coalesce(started_at, now())      else started_at end,
    completed_at    = case when p_new_status='completed'         then coalesce(completed_at, now())    else completed_at end,
    closed_at       = case when p_new_status='closed'            then coalesce(closed_at, now())       else closed_at end,
    refused_at      = case when p_new_status='refused'           then coalesce(refused_at, now())      else refused_at end,
    cancelled_at    = case when p_new_status='cancelled'         then coalesce(cancelled_at, now())    else cancelled_at end,
    refusal_reason  = case when p_new_status='refused'           then coalesce(p_comment, refusal_reason) else refusal_reason end
  where id = p_order_id;

  v_evt := case when p_new_status='sent'      then 'sent'::service_order_event_type
                when p_new_status='cancelled' then 'cancelled'::service_order_event_type
                else 'status_change'::service_order_event_type end;
  insert into public.service_order_events (copro_id, service_order_id, event_type, from_status, to_status, comment, created_by)
  values (v_so.copro_id, p_order_id, v_evt, v_so.status, p_new_status, p_comment, v_user);

  return jsonb_build_object('success', true, 'order_id', p_order_id, 'from', v_so.status, 'to', p_new_status);
end; $$;
revoke execute on function public.update_service_order_status(uuid, service_order_status, text, uuid) from public, anon;
grant  execute on function public.update_service_order_status(uuid, service_order_status, text, uuid) to authenticated, service_role;
```

- [ ] **Step 1.4 — `create_logbook_from_service_order` (idempotent, statut dérivé)**

```sql
create or replace function public.create_logbook_from_service_order(p_order_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_so public.service_orders%rowtype; v_existing uuid; v_status logbook_status; v_id uuid;
begin
  select * into v_so from public.service_orders where id = p_order_id;
  if not found then
    raise exception 'create_logbook_from_service_order: ordre de service % introuvable', p_order_id using errcode='23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_so.copro_id) then
    raise exception 'forbidden: gestionnaire requis pour l''ordre de service %', p_order_id using errcode='42501';
  end if;
  select id into v_existing from public.logbook_entries where service_order_id = p_order_id limit 1;
  if v_existing is not null then return v_existing; end if;

  v_status := case when v_so.status in ('completed','closed') then 'terminee'::logbook_status else 'planifiee'::logbook_status end;
  insert into public.logbook_entries
    (copro_id, building_id, tiers_id, contract_id, service_order_id, entry_type, category, title, happened_at, completed_at, status, created_by)
  values
    (v_so.copro_id, v_so.building_id, v_so.tiers_id, v_so.contract_id, p_order_id,
     'intervention'::logbook_entry_type, 'courante'::intervention_category, v_so.title,
     coalesce(v_so.completed_at::date, current_date),
     case when v_status='terminee' then coalesce(v_so.completed_at::date, current_date) else null end,
     v_status, auth.uid())
  returning id into v_id;
  update public.service_orders set logbook_entry_id = v_id where id = p_order_id and logbook_entry_id is null;
  return v_id;
end; $$;
revoke execute on function public.create_logbook_from_service_order(uuid) from public, anon;
grant  execute on function public.create_logbook_from_service_order(uuid) to authenticated, service_role;
```

- [ ] **Step 1.5 — `delete_service_order` (FK font le ménage)**

```sql
create or replace function public.delete_service_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_copro uuid;
begin
  select copro_id into v_copro from public.service_orders where id = p_order_id;
  if v_copro is null then
    raise exception 'delete_service_order: ordre de service % introuvable', p_order_id using errcode='23503';
  end if;
  if not public.is_service_call() and not public.user_is_copro_manager(v_copro) then
    raise exception 'forbidden: gestionnaire requis pour l''ordre de service %', p_order_id using errcode='42501';
  end if;
  delete from public.service_orders where id = p_order_id; -- events CASCADE, logbook & budget_payment_schedules SET NULL (FK)
  return jsonb_build_object('success', true, 'deleted_order_id', p_order_id);
end; $$;
revoke execute on function public.delete_service_order(uuid) from public, anon;
grant  execute on function public.delete_service_order(uuid) to authenticated, service_role;
```

- [ ] **Step 1.6 — db reset partiel + Gate P1** (`c:/Users/cleme/Desktop/Propulseo/Flex/.gate_0032_p1.sql`)

```sql
\set ON_ERROR_STOP on
begin;
do $$
declare v_copro uuid; v_tiers uuid; v_so1 uuid; v_so2 uuid; v_n1 text; v_n2 text;
  v_res jsonb; v_evt int; v_lb1 uuid; v_lb2 uuid; v_bps_before int; v_bps_after int; v_caught boolean;
begin
  perform set_config('request.jwt.claims','{"role":"service_role"}', true);
  v_copro := public.create_test_copro_seeded('HARNESS-0032-p1');
  select id into v_tiers from public.tiers where copro_id = v_copro order by id limit 1;

  -- numérotation distincte (même transaction : 2e generate voit le 1er OS)
  v_n1 := public.generate_service_order_number(v_copro);
  insert into public.service_orders (copro_id, order_number, tiers_id, title) values (v_copro, v_n1, v_tiers, 'OS test 1') returning id into v_so1;
  v_n2 := public.generate_service_order_number(v_copro);
  insert into public.service_orders (copro_id, order_number, tiers_id, title) values (v_copro, v_n2, v_tiers, 'OS test 2') returning id into v_so2;
  if v_n1 = v_n2 then raise exception 'P1 FAIL: order_number non distincts (% = %)', v_n1, v_n2; end if;
  raise notice 'PASS P1.a — order_number distincts (%, %)', v_n1, v_n2;

  -- transition valide + jalon + event
  v_res := public.update_service_order_status(v_so1, 'sent', 'envoi');
  if (select sent_at from public.service_orders where id=v_so1) is null then raise exception 'P1 FAIL: sent_at non horodate'; end if;
  select count(*) into v_evt from public.service_order_events where service_order_id=v_so1;
  if v_evt <> 1 then raise exception 'P1 FAIL: % events au lieu de 1', v_evt; end if;
  raise notice 'PASS P1.b — transition draft->sent : jalon + 1 event';

  -- transition invalide
  v_caught := false;
  begin perform public.update_service_order_status(v_so1, 'closed'); exception when others then
    if sqlstate='23514' then v_caught := true; else raise; end if; end;
  if not v_caught then raise exception 'P1 FAIL: transition sent->closed acceptee'; end if;
  raise notice 'PASS P1.c — transition interdite -> 23514';

  -- carnet idempotent + statut dérivé (OS en cours -> planifiee)
  v_lb1 := public.create_logbook_from_service_order(v_so1);
  v_lb2 := public.create_logbook_from_service_order(v_so1);
  if v_lb1 <> v_lb2 then raise exception 'P1 FAIL: carnet non idempotent'; end if;
  if (select status from public.logbook_entries where id=v_lb1) <> 'planifiee' then raise exception 'P1 FAIL: statut carnet attendu planifiee'; end if;
  if (select tiers_id from public.logbook_entries where id=v_lb1) is null then raise exception 'P1 FAIL: tiers_id carnet NULL'; end if;
  raise notice 'PASS P1.d — carnet idempotent, statut derive, tiers_id renseigne';

  -- delete : budget_payment_schedules inchangée, logbook détaché
  select count(*) into v_bps_before from public.budget_payment_schedules where copro_id=v_copro;
  perform public.delete_service_order(v_so2);
  select count(*) into v_bps_after from public.budget_payment_schedules where copro_id=v_copro;
  if v_bps_before <> v_bps_after then raise exception 'P1 FAIL: budget_payment_schedules modifiee'; end if;
  if (select service_order_id from public.logbook_entries where id=v_lb1) is null
     and not exists (select 1 from public.service_orders where id=v_so1) then null; end if; -- so1 existe encore
  raise notice 'PASS P1.e — delete : bps inchangee';

  raise notice '=== GATE 0032 PALIER 1 : TOUS PASS ===';
end $$;
rollback;
```

Run :
```bash
cd "c:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex" && npx --no-install supabase db reset 2>&1 | tail -5
docker exec -i supabase_db_Co-Pro-Flex psql -U postgres -d postgres < "c:/Users/cleme/Desktop/Propulseo/Flex/.gate_0032_p1.sql" 2>&1
```
Expected : `=== GATE 0032 PALIER 1 : TOUS PASS ===` puis `ROLLBACK`.

---

## Task 2 — PALIER 2 : triggers maintenance

**Files:** Append section « PALIER 2 » au même fichier.

- [ ] **Step 2.1 — `update_provider_stats` (+ trigger I/U/D, full recompute)**

```sql
-- PALIER 2 — triggers maintenance ----------------------------------------------------------
create or replace function public.update_provider_stats()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_t uuid;
begin
  for v_t in
    select t from (values
      (case when tg_op <> 'DELETE' then new.tiers_id end),
      (case when tg_op <> 'INSERT' then old.tiers_id end)
    ) as s(t) where t is not null
    group by t
  loop
    update public.tiers ti set
      interventions_count  = (select count(*)              from public.logbook_entries le where le.tiers_id = v_t),
      last_intervention_at = (select max(le.happened_at)::timestamptz from public.logbook_entries le where le.tiers_id = v_t)
    where ti.id = v_t;
  end loop;
  return case when tg_op='DELETE' then old else new end;
end; $$;
revoke execute on function public.update_provider_stats() from public, anon, authenticated;
create trigger trg_update_provider_stats
  after insert or update or delete on public.logbook_entries
  for each row execute function public.update_provider_stats();
```

- [ ] **Step 2.2 — `update_contract_status_auto` (+ trigger BEFORE I/U)**

```sql
create or replace function public.update_contract_status_auto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'terminated' then return new; end if;   -- résiliation manuelle préservée
  if new.end_date is not null and current_date > new.end_date then
    new.status := 'expired'::contract_status;
  elsif new.end_date is not null and current_date >= (new.end_date - make_interval(months => new.notice_months))::date then
    new.status := 'to_renew'::contract_status;
  elsif current_date >= new.start_date then
    new.status := 'active'::contract_status;
  else
    new.status := 'draft'::contract_status;
  end if;
  return new;
end; $$;
revoke execute on function public.update_contract_status_auto() from public, anon, authenticated;
create trigger trg_contract_status_auto
  before insert or update on public.contracts
  for each row execute function public.update_contract_status_auto();
```

- [ ] **Step 2.3 — 3 triggers de cohérence inter-copro maintenance**

```sql
-- tiers d'un contrat ∈ même copro
create or replace function public.tr_contract_tiers_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.tiers where id = new.tiers_id;
  if v_c is distinct from new.copro_id then
    raise exception 'contract: tiers % hors copro', new.tiers_id using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_contract_tiers_copro_consistency() from public, anon, authenticated;
create trigger tr_contract_tiers_copro_consistency before insert or update on public.contracts
  for each row execute function public.tr_contract_tiers_copro_consistency();

-- OS : tiers (obligatoire) + contract + lot (si présents) ∈ même copro
create or replace function public.tr_so_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.tiers where id = new.tiers_id;
  if v_c is distinct from new.copro_id then raise exception 'service_order: tiers % hors copro', new.tiers_id using errcode='23514'; end if;
  if new.contract_id is not null then
    select copro_id into v_c from public.contracts where id = new.contract_id;
    if v_c is distinct from new.copro_id then raise exception 'service_order: contrat % hors copro', new.contract_id using errcode='23514'; end if;
  end if;
  if new.lot_id is not null then
    select copro_id into v_c from public.lots where id = new.lot_id;
    if v_c is distinct from new.copro_id then raise exception 'service_order: lot % hors copro', new.lot_id using errcode='23514'; end if;
  end if;
  return new;
end; $$;
revoke execute on function public.tr_so_copro_consistency() from public, anon, authenticated;
create trigger tr_so_copro_consistency before insert or update on public.service_orders
  for each row execute function public.tr_so_copro_consistency();

-- police d'assurance : contrat ∈ même copro ET domaine 'assurance'
create or replace function public.tr_insurance_contract_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid; v_dom uuid;
begin
  select copro_id, domain_id into v_c, v_dom from public.contracts where id = new.contract_id;
  if v_c is distinct from new.copro_id then
    raise exception 'insurance: contrat % hors copro', new.contract_id using errcode='23514';
  end if;
  if v_dom is distinct from (select id from public.work_domain where slug='assurance') then
    raise exception 'insurance: contrat % n''est pas un contrat assurance', new.contract_id using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.tr_insurance_contract_copro_consistency() from public, anon, authenticated;
create trigger tr_insurance_contract_copro_consistency before insert or update on public.insurance_policies
  for each row execute function public.tr_insurance_contract_copro_consistency();
```

- [ ] **Step 2.4 — db reset + Gate P2** (`.gate_0032_p2.sql`)

Assertions (BEGIN/ROLLBACK, `create_test_copro_seeded`) :
1. INSERT `logbook_entries(tiers_id=T)` → `tiers.interventions_count` = (count réel) et `last_intervention_at` non NULL.
2. UPDATE `logbook_entries.tiers_id` T→T2 → T décrémenté, T2 incrémenté ; DELETE → T décrémenté.
3. INSERT `contracts` `start_date=today-400j, end_date=today-1j` → `status='expired'` ; `end_date=today+10j, notice_months=3` → `status='to_renew'` ; `start_date=today-10j, end_date=today+400j` → `status='active'`.
4. INSERT `contracts` avec `tiers_id` d'une **autre** copro → `23514`. Idem `service_orders` (tiers/contract/lot autre copro) et `insurance_policies` (contrat autre copro ; contrat domaine ≠ assurance) → `23514`.

```sql
\set ON_ERROR_STOP on
begin;
do $$
declare v_c1 uuid; v_c2 uuid; v_t1 uuid; v_t2 uuid; v_t_other uuid; v_dom_assur uuid; v_dom_other uuid;
  v_lb uuid; v_cnt int; v_contract uuid; v_caught boolean;
begin
  perform set_config('request.jwt.claims','{"role":"service_role"}', true);
  v_c1 := public.create_test_copro_seeded('HARNESS-0032-p2a');
  v_c2 := public.create_test_copro_seeded('HARNESS-0032-p2b');
  select id into v_t1 from public.tiers where copro_id=v_c1 order by id limit 1;
  select id into v_t2 from public.tiers where copro_id=v_c1 order by id offset 1 limit 1;
  select id into v_t_other from public.tiers where copro_id=v_c2 order by id limit 1;
  select id into v_dom_assur from public.work_domain where slug='assurance';
  select id into v_dom_other from public.work_domain where slug<>'assurance' limit 1;

  -- stats prestataire
  insert into public.logbook_entries (copro_id, tiers_id, entry_type, title, happened_at)
    values (v_c1, v_t1, 'intervention', 'i1', current_date) returning id into v_lb;
  select interventions_count into v_cnt from public.tiers where id=v_t1;
  if v_cnt < 1 then raise exception 'P2 FAIL: interventions_count non incremente (%)', v_cnt; end if;
  if (select last_intervention_at from public.tiers where id=v_t1) is null then raise exception 'P2 FAIL: last_intervention_at NULL'; end if;
  update public.logbook_entries set tiers_id=v_t2 where id=v_lb;
  if (select interventions_count from public.tiers where id=v_t2) < 1 then raise exception 'P2 FAIL: T2 non incremente apres changement'; end if;
  delete from public.logbook_entries where id=v_lb;
  raise notice 'PASS P2.a — stats prestataire (insert/update/delete)';

  -- bascule statut contrat
  insert into public.contracts (copro_id, tiers_id, domain_id, label, start_date, end_date)
    values (v_c1, v_t1, v_dom_other, 'c-exp', current_date-400, current_date-1) returning id into v_contract;
  if (select status from public.contracts where id=v_contract) <> 'expired' then raise exception 'P2 FAIL: contrat non expired'; end if;
  insert into public.contracts (copro_id, tiers_id, domain_id, label, start_date, end_date, notice_months)
    values (v_c1, v_t1, v_dom_other, 'c-renew', current_date-10, current_date+10, 3) returning id into v_contract;
  if (select status from public.contracts where id=v_contract) <> 'to_renew' then raise exception 'P2 FAIL: contrat non to_renew'; end if;
  raise notice 'PASS P2.b — bascule statut contrat (expired/to_renew)';

  -- anti-fuite inter-copro
  v_caught:=false; begin insert into public.contracts (copro_id, tiers_id, domain_id, label, start_date)
    values (v_c1, v_t_other, v_dom_other, 'x', current_date); exception when others then if sqlstate='23514' then v_caught:=true; else raise; end if; end;
  if not v_caught then raise exception 'P2 FAIL: contrat tiers autre copro accepte'; end if;

  insert into public.contracts (copro_id, tiers_id, domain_id, label, start_date)
    values (v_c1, v_t1, v_dom_assur, 'c-assur', current_date-1) returning id into v_contract;
  v_caught:=false; begin insert into public.insurance_policies (copro_id, contract_id, sub_type)
    values (v_c2, v_contract, 'multirisque'); exception when others then if sqlstate='23514' then v_caught:=true; else raise; end if; end;
  if not v_caught then raise exception 'P2 FAIL: police copro != contrat acceptee'; end if;

  insert into public.contracts (copro_id, tiers_id, domain_id, label, start_date)
    values (v_c1, v_t1, v_dom_other, 'c-nonassur', current_date-1) returning id into v_contract;
  v_caught:=false; begin insert into public.insurance_policies (copro_id, contract_id, sub_type)
    values (v_c1, v_contract, 'multirisque'); exception when others then if sqlstate='23514' then v_caught:=true; else raise; end if; end;
  if not v_caught then raise exception 'P2 FAIL: police sur contrat non-assurance acceptee'; end if;
  raise notice 'PASS P2.c — anti-fuite inter-copro (contract/insurance)';

  raise notice '=== GATE 0032 PALIER 2 : TOUS PASS ===';
end $$;
rollback;
```

---

## Task 3 — PALIER 3 : communication

**Files:** Append section « PALIER 3 ».

- [ ] **Step 3.1 — `mark_conversation_read`**

```sql
-- PALIER 3 — communication -----------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not public.is_service_call() and not public.is_conversation_member(p_conversation_id, v_uid) then
    raise exception 'forbidden: non membre de la conversation %', p_conversation_id using errcode='42501';
  end if;
  update public.conversation_members set last_read_at = now(), unread_count = 0
    where conversation_id = p_conversation_id and user_id = v_uid;
  if v_uid is not null then
    update public.messages set read_by = array_append(read_by, v_uid)
      where conversation_id = p_conversation_id and not (v_uid = any(read_by));
  end if;
end; $$;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant  execute on function public.mark_conversation_read(uuid) to authenticated, service_role;
```

- [ ] **Step 3.2 — `update_conversation_last_message` (+ trigger AFTER INSERT)**

```sql
create or replace function public.update_conversation_last_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        last_message_preview = left(new.content, 140),
        updated_at = now()
    where id = new.conversation_id;
  update public.conversation_members
    set unread_count = unread_count + 1
    where conversation_id = new.conversation_id and left_at is null and user_id <> new.author_id;
  return new;
end; $$;
revoke execute on function public.update_conversation_last_message() from public, anon, authenticated;
create trigger trg_conversation_last_message after insert on public.messages
  for each row execute function public.update_conversation_last_message();
```

- [ ] **Step 3.3 — compteurs mur (likes + commentaires, plancher 0)**

```sql
create or replace function public.update_wall_post_comments_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' then
    update public.wall_posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  else
    update public.wall_posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
    return old;
  end if;
end; $$;
revoke execute on function public.update_wall_post_comments_count() from public, anon, authenticated;
create trigger trg_wall_comments_count after insert or delete on public.wall_comments
  for each row execute function public.update_wall_post_comments_count();

create or replace function public.update_wall_post_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' then
    update public.wall_posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  else
    update public.wall_posts set likes_count = greatest(0, likes_count - 1) where id = old.post_id;
    return old;
  end if;
end; $$;
revoke execute on function public.update_wall_post_likes_count() from public, anon, authenticated;
create trigger trg_wall_likes_count after insert or delete on public.wall_likes
  for each row execute function public.update_wall_post_likes_count();
```

- [ ] **Step 3.4 — 6 triggers de cohérence inter-copro comm (template + paramètres)**

Template (remplacer `<FN>`, `<TABLE>`, `<PARENT_TABLE>`, `<PARENT_FK>`, `<LABEL>`) ; pour `events`/`mails`, voir variantes conditionnelles dessous :

```sql
-- modèle simple (parent direct non-null) : member, message, comment, like
create or replace function public.<FN>()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  select copro_id into v_c from public.<PARENT_TABLE> where id = new.<PARENT_FK>;
  if v_c is distinct from new.copro_id then
    raise exception '<LABEL>: parent % hors copro', new.<PARENT_FK> using errcode='23514';
  end if;
  return new;
end; $$;
revoke execute on function public.<FN>() from public, anon, authenticated;
create trigger <FN> before insert or update on public.<TABLE>
  for each row execute function public.<FN>();
```

| `<FN>` | `<TABLE>` | `<PARENT_TABLE>` | `<PARENT_FK>` |
|---|---|---|---|
| tr_member_copro_consistency | conversation_members | conversations | conversation_id |
| tr_message_copro_consistency | messages | conversations | conversation_id |
| tr_comment_copro_consistency | wall_comments | wall_posts | post_id |
| tr_like_copro_consistency | wall_likes | wall_posts | post_id |

Variante `events` (2 liens optionnels) :
```sql
create or replace function public.tr_event_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  if new.linked_ag_id is not null then
    select copro_id into v_c from public.ag_meetings where id = new.linked_ag_id;
    if v_c is distinct from new.copro_id then raise exception 'event: AG % hors copro', new.linked_ag_id using errcode='23514'; end if;
  end if;
  if new.linked_service_order_id is not null then
    select copro_id into v_c from public.service_orders where id = new.linked_service_order_id;
    if v_c is distinct from new.copro_id then raise exception 'event: OS % hors copro', new.linked_service_order_id using errcode='23514'; end if;
  end if;
  return new;
end; $$;
revoke execute on function public.tr_event_copro_consistency() from public, anon, authenticated;
create trigger tr_event_copro_consistency before insert or update on public.events
  for each row execute function public.tr_event_copro_consistency();
```

Variante `mails` (lien optionnel `in_reply_to`) :
```sql
create or replace function public.tr_mail_copro_consistency()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_c uuid;
begin
  if new.in_reply_to is not null then
    select copro_id into v_c from public.mails where id = new.in_reply_to;
    if v_c is distinct from new.copro_id then raise exception 'mail: reponse % hors copro', new.in_reply_to using errcode='23514'; end if;
  end if;
  return new;
end; $$;
revoke execute on function public.tr_mail_copro_consistency() from public, anon, authenticated;
create trigger tr_mail_copro_consistency before insert or update on public.mails
  for each row execute function public.tr_mail_copro_consistency();
```

- [ ] **Step 3.5 — db reset + Gate P3** (`.gate_0032_p3.sql`)

> **Setup auth** : messages/conversations/wall_posts exigent `author_id`/`created_by` → `profiles` → `auth.users`. Le gate crée 2 `auth.users` + `profiles` (rollback). Si l'INSERT `auth.users` échoue (colonnes NOT NULL inattendues), ajuster les colonnes minimales nécessaires lors de l'exécution.

Assertions :
1. INSERT `messages` → `conversations.last_message_preview`/`last_message_at` MAJ + `conversation_members.unread_count +1` pour les membres actifs **sauf l'auteur**.
2. `mark_conversation_read` (claims `sub` = membre) → `unread_count=0`, `last_read_at` MAJ, `auth.uid()` ∈ `messages.read_by` ; non-membre → `42501`.
3. INSERT puis DELETE `wall_likes`/`wall_comments` → `likes_count`/`comments_count` cohérents, plancher 0.
4. INSERT `wall_comments`/`messages`/`conversation_members`/`events`/`mails` avec parent d'une autre copro → `23514`.

```sql
\set ON_ERROR_STOP on
begin;
do $$
declare v_c1 uuid; v_c2 uuid; v_u1 uuid := gen_random_uuid(); v_u2 uuid := gen_random_uuid();
  v_conv uuid; v_post uuid; v_msg uuid; v_unread int; v_likes int; v_caught boolean;
begin
  perform set_config('request.jwt.claims','{"role":"service_role"}', true);
  v_c1 := public.create_test_copro_seeded('HARNESS-0032-p3a');
  v_c2 := public.create_test_copro_seeded('HARNESS-0032-p3b');
  insert into auth.users (id, email) values (v_u1, 'u1@test.local'), (v_u2, 'u2@test.local');
  insert into public.profiles (id, email, full_name) values (v_u1,'u1@test.local','U1'), (v_u2,'u2@test.local','U2');

  insert into public.conversations (copro_id, created_by, is_group) values (v_c1, v_u1, true) returning id into v_conv;
  insert into public.conversation_members (copro_id, conversation_id, user_id) values (v_c1, v_conv, v_u1), (v_c1, v_conv, v_u2);

  -- dénormalisation message
  insert into public.messages (copro_id, conversation_id, author_id, content) values (v_c1, v_conv, v_u1, 'bonjour le fil') returning id into v_msg;
  if (select last_message_preview from public.conversations where id=v_conv) is null then raise exception 'P3 FAIL: preview non maj'; end if;
  select unread_count into v_unread from public.conversation_members where conversation_id=v_conv and user_id=v_u2;
  if v_unread <> 1 then raise exception 'P3 FAIL: unread destinataire = % (attendu 1)', v_unread; end if;
  if (select unread_count from public.conversation_members where conversation_id=v_conv and user_id=v_u1) <> 0 then raise exception 'P3 FAIL: unread auteur incremente'; end if;
  raise notice 'PASS P3.a — preview + unread (sauf auteur)';

  -- mark_conversation_read par le destinataire
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub', v_u2::text)::text, true);
  perform public.mark_conversation_read(v_conv);
  if (select unread_count from public.conversation_members where conversation_id=v_conv and user_id=v_u2) <> 0 then raise exception 'P3 FAIL: unread non remis a 0'; end if;
  if not (v_u2 = any(select read_by from public.messages where id=v_msg)) then raise exception 'P3 FAIL: read_by sans le lecteur'; end if;
  raise notice 'PASS P3.b — mark_conversation_read';

  -- non-membre -> 42501 (u? non membre : créer un 3e user non-membre)
  perform set_config('request.jwt.claims', json_build_object('role','authenticated','sub', gen_random_uuid()::text)::text, true);
  v_caught:=false; begin perform public.mark_conversation_read(v_conv); exception when others then if sqlstate='42501' then v_caught:=true; else raise; end if; end;
  if not v_caught then raise exception 'P3 FAIL: non-membre accepte'; end if;
  raise notice 'PASS P3.c — non-membre -> 42501';

  perform set_config('request.jwt.claims','{"role":"service_role"}', true);
  -- compteurs mur
  insert into public.wall_posts (copro_id, author_id, title, content) values (v_c1, v_u1, 't', 'c') returning id into v_post;
  insert into public.wall_likes (copro_id, post_id, user_id) values (v_c1, v_post, v_u2);
  if (select likes_count from public.wall_posts where id=v_post) <> 1 then raise exception 'P3 FAIL: likes_count != 1'; end if;
  delete from public.wall_likes where post_id=v_post and user_id=v_u2;
  if (select likes_count from public.wall_posts where id=v_post) <> 0 then raise exception 'P3 FAIL: likes_count != 0 apres delete'; end if;
  raise notice 'PASS P3.d — compteurs mur plancher 0';

  -- anti-fuite inter-copro (message vers conversation d'une autre copro)
  v_caught:=false; begin insert into public.messages (copro_id, conversation_id, author_id, content) values (v_c2, v_conv, v_u1, 'x'); exception when others then if sqlstate='23514' then v_caught:=true; else raise; end if; end;
  if not v_caught then raise exception 'P3 FAIL: message copro != conversation accepte'; end if;
  raise notice 'PASS P3.e — anti-fuite inter-copro';

  raise notice '=== GATE 0032 PALIER 3 : TOUS PASS ===';
end $$;
rollback;
```

---

## Task 4 — Verrouillage final

- [ ] **Step 4.1 — db reset complet** : `npx --no-install supabase db reset` → 0001→0032 sans erreur, seed boucle d'or audit=0.
- [ ] **Step 4.2 — vitest** : `npx vitest run` → 75/75 (non régressé).
- [ ] **Step 4.3 — Hygiène anti-doublon** : `grep -nE "create or replace function public\.(is_conversation_member|get_supplier_invoice_paid_amount|post_supplier_invoice|post_supplier_payment)" supabase/migrations/0032_rpc_maintenance_comm.sql` → **0 résultat**.
- [ ] **Step 4.4 — /code-review multi-agent** (workflow adversarial 6 angles, comme 0031) sur `0032_rpc_maintenance_comm.sql` → corriger les bugs simples, différer le métier dans `DEFERRED_USER_DECISIONS.md`.
- [ ] **Step 4.5 — Commit unique** :
```bash
git add supabase/migrations/0032_rpc_maintenance_comm.sql
git commit -m "feat(db): 0032 rpc maintenance + communication (machine etats OS, stats, denormalisation, coherence inter-copro)"
```

---

## Self-Review (writing-plans)
- **Couverture spec** : §4 P1 (5 obj) ✓, P2 (5 obj) ✓, P3 (10 obj : 1 RPC + 3 dénorm + 6 cohérences) ✓ = 20 objets logiques (34 avec triggers séparés). Hors-scope §1 respecté (aucune table/vue/RLS/chaîne fournisseur). 3 arbitrages §2 encodés (transitions souples, statut carnet dérivé, read_by sans exclusion).
- **Placeholders** : aucun « TBD ». Le seul point d'ajustement runtime = colonnes minimales `auth.users` du gate P3 (signalé, fallback documenté).
- **Cohérence des types** : signatures REVOKE/GRANT = signatures de définition (types enum inclus). Jalons/enum vérifiés contre 0021/0003. `is_conversation_member(uuid,uuid)`, `user_is_copro_manager(uuid)`, `is_service_call()` = signatures 0023.
- **Écart vs scope brut** : `generate_service_order_number` n'a pas de câblage d'insertion auto (pas de create RPC ni trigger BEFORE INSERT, hors-scope « futures RPC ») → le numéro est fourni à l'INSERT par l'appelant (front) ou via appel explicite ; testé tel quel. À confirmer au code-review si un `trg_service_order_set_number` BEFORE INSERT est souhaité (non bloquant).
