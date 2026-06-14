import fs from 'fs';
const M = 'C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex/supabase/migrations/';
const r = f => fs.readFileSync(M + f, 'utf8').replace(/\r\n/g, '\n');

function slice(src, startAnchor, endAnchor, name) {
  const i = src.indexOf(startAnchor);
  if (i < 0) throw new Error('start introuvable: ' + name);
  const j = src.indexOf(endAnchor, i);
  if (j < 0) throw new Error('end introuvable: ' + name);
  return src.slice(i, j + endAnchor.length);
}
function must(block, from, to, name) {
  if (!block.includes(from)) throw new Error('REMPLACEMENT manque (' + name + '): ' + from.slice(0, 70));
  return block.split(from).join(to);
}

const f25 = r('0025_rpc_gl_core.sql');
const f57 = r('0057_b4_gel_compte_travaux.sql');
const f59 = r('0059_e3_charge_nature.sql');

// 1) create_ledger_transaction : ajout operation_id a l'INSERT
let clt = slice(f25,
  'create or replace function public.create_ledger_transaction(',
  'grant execute on function public.create_ledger_transaction(uuid, uuid, date, text, text, uuid, jsonb, boolean) to authenticated, service_role;',
  'create_ledger_transaction');
clt = must(clt,
  "      tx_id, copro_id, period_id, account_id, lot_id, direction, amount, entry_label\n    ) values (\n      v_tx_id,\n      p_copro_id,\n      p_period_id,\n      (v_entry->>'account_id')::uuid,\n      nullif(v_entry->>'lot_id', '')::uuid,\n      (v_entry->>'direction')::public.ledger_direction,",
  "      tx_id, copro_id, period_id, account_id, lot_id, operation_id, direction, amount, entry_label\n    ) values (\n      v_tx_id,\n      p_copro_id,\n      p_period_id,\n      (v_entry->>'account_id')::uuid,\n      nullif(v_entry->>'lot_id', '')::uuid,\n      nullif(v_entry->>'operation_id', '')::uuid,\n      (v_entry->>'direction')::public.ledger_direction,",
  'clt INSERT');

// 2) open_next_period : precedence operation_id => travaux
let onp = slice(f59,
  'create or replace function public.open_next_period(',
  'grant execute on function public.open_next_period(uuid, uuid, text, date, date) to authenticated, service_role;',
  'open_next_period');
onp = must(onp,
  "  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id\n    and a.charge_nature = 'courant';",
  "  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id\n    and e.operation_id is null and a.charge_nature = 'courant';",
  'onp courant');
onp = must(onp,
  "  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id\n    and a.charge_nature = 'travaux';",
  "  where e.copro_id = p_copro_id and e.period_id = p_closing_period_id\n    and (e.operation_id is not null or a.charge_nature = 'travaux');",
  'onp travaux');

// 3) v_result_allocation_split : precedence dans result_src
let vras = slice(f59,
  'create or replace view public.v_result_allocation_split',
  "Assiette de assert_result_allocation_split.';;",
  'v_result_allocation_split');
vras = must(vras,
  "      when a.charge_nature = 'courant'\n      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_courant,",
  "      when e.operation_id is null and a.charge_nature = 'courant'\n      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_courant,",
  'vras courant');
vras = must(vras,
  "      when a.charge_nature = 'travaux'\n      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_travaux,",
  "      when e.operation_id is not null or a.charge_nature = 'travaux'\n      then (case when e.direction = 'credit' then e.amount else -e.amount end) else 0 end), 0), 2) as result_travaux,",
  'vras travaux');

// 4) settle_works_balance : garde multi-cles (inseree avant la lecture du compte 12)
let swb = slice(f57,
  'create or replace function public.settle_works_balance(',
  'grant execute on function public.settle_works_balance(uuid, uuid) to authenticated, service_role;',
  'settle_works_balance');
const GUARD =
  "  -- E4 : GARDE MULTI-CLES. Le solde 12 a apurer peut provenir de travaux appeles sur PLUSIEURS\n" +
  "  -- cles distinctes (potentiellement multi-exercices). Le distribuer via la seule cle generale\n" +
  "  -- produirait des decomptes individuels SILENCIEUSEMENT FAUX -> on leve. La repartition par cle\n" +
  "  -- d'origine (cible) reste differee. Cles au niveau LIGNE (call_for_funds_lines), appels TRAVAUX.\n" +
  "  -- NB : volontairement au niveau LIGNE (et non l'en-tete cf.repartition_key_id comme B5/0058, qui\n" +
  "  -- est 'toujours NULL' en multi-cles -> garde inoperante). Limite connue : un mix lignes avec/sans\n" +
  "  -- cle n'est pas couvert (count des cles non-NULL) -> sera leve par la repartition par cle d'origine.\n" +
  "  if (select count(distinct cfl.repartition_key_id)\n" +
  "        from public.call_for_funds cf\n" +
  "        join public.call_for_funds_lines cfl on cfl.call_id = cf.id\n" +
  "        join public.budgets b on b.id = cf.budget_id\n" +
  "       where cf.copro_id = p_copro_id\n" +
  "         and b.budget_type = 'works'\n" +
  "         and cfl.repartition_key_id is not null) > 1 then\n" +
  "    raise exception 'settle_works_balance: apurement par cle d''origine non encore supporte — les travaux de la copro % portent des appels multi-cles (apurement par cle generale seule impossible)', p_copro_id\n" +
  "      using errcode = '23514';\n" +
  "  end if;\n\n" +
  "  select id into v_acct_12  from public.accounts where copro_id = p_copro_id and code = '12';";
swb = must(swb,
  "  select id into v_acct_12  from public.accounts where copro_id = p_copro_id and code = '12';",
  GUARD, 'swb guard');

const header =
  "-- 0060_e4_operation_id_ledger.sql\n" +
  "-- ============================================================================================\n" +
  "-- E4 (DECISIONS.md SS E) — operation_id au niveau LIGNE du grand livre + precedence travaux.\n" +
  "--\n" +
  "-- 1. ledger_entries.operation_id uuid null REFERENCES budgets(id) : rattache une ecriture a une\n" +
  "--    OPERATION (budget travaux). Optionnel, retro-compatible (backfill NULL).\n" +
  "-- 2. create_ledger_transaction lit operation_id dans le jsonb p_entries (cle optionnelle/ligne).\n" +
  "--    Signature INCHANGEE -> aucun appelant casse. Les ecrivains qui renseignent operation_id\n" +
  "--    (facture travaux, appel travaux) = tranche dediee ULTERIEURE (cablage ecrivains).\n" +
  "-- 3. PRECEDENCE STRICTE en LECTURE : une ligne portant operation_id != NULL compte comme TRAVAUX\n" +
  "--    quoi qu'il arrive (meme si accounts.charge_nature='courant', ex. 711 subvention travaux).\n" +
  "--    Injectee dans open_next_period et v_result_allocation_split.\n" +
  "-- 4. settle_works_balance : GARDE MULTI-CLES bloquante (differee en B5).\n" +
  "--\n" +
  "-- 0025/0057/0059 NE SONT PAS EDITES : leurs fonctions/vue sont SUPERSEDED par les CREATE OR\n" +
  "-- REPLACE ci-dessous (qui s'executent apres dans la chaine). Editer les versions de ces fichiers\n" +
  "-- n'aurait aucun effet apres 0060 -> toute evolution de ces objets passe par une migration >= 0060.\n" +
  "-- FK volontairement RESTRICT (pas SET NULL) : un budget reference par une ecriture POSTEE ne peut\n" +
  "-- etre supprime (immutabilite GL, A5) -> pas de mutation silencieuse d'une classif travaux.\n" +
  "-- ============================================================================================\n\n" +
  "-- == 1. ledger_entries.operation_id ==\n" +
  "alter table public.ledger_entries\n" +
  "  add column if not exists operation_id uuid references public.budgets(id) on delete restrict;\n\n" +
  "create index if not exists idx_entries_operation\n" +
  "  on public.ledger_entries (operation_id) where operation_id is not null;\n\n" +
  "comment on column public.ledger_entries.operation_id is\n" +
  "  'E4 : operation (budget travaux) rattachee a la ligne. Si non NULL, la ligne est de nature TRAVAUX quoi qu''il arrive (precedence sur accounts.charge_nature). FK RESTRICT : immutabilite GL.';\n\n" +
  "-- == 2. create_ledger_transaction : lit operation_id dans p_entries (signature inchangee) ==\n";

const out = header + clt +
  "\n\n-- == 3a. open_next_period : precedence operation_id => travaux ==\n" + onp +
  "\n\n-- == 3b. v_result_allocation_split : precedence operation_id => travaux ==\n" + vras +
  "\n\n-- == 4. settle_works_balance : garde multi-cles bloquante (E4) ==\n" + swb +
  "\n\n-- FIN 0060_e4_operation_id_ledger.sql\n";

fs.writeFileSync(M + '0060_e4_operation_id_ledger.sql', out);
console.log('OK 0060 genere, longueur', out.length, 'caracteres');
console.log('Blocs: clt', clt.length, '| onp', onp.length, '| view', vras.length, '| swb', swb.length);
