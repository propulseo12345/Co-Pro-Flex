import fs from 'fs';
const tok = process.env.SUPABASE_ACCESS_TOKEN;
const ref = 'qqfqrcolzmcbsvfaumiq';
const mig = fs.readFileSync(
  'C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex/supabase/migrations/0060_e4_operation_id_ledger.sql',
  'utf8'
).replace(/\r\n/g, '\n');

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { ok: r.ok, status: r.status, body: await r.text() };
}

const testBlock = `
do $$
declare
  v_copro uuid; v_period uuid; v_acct_c uuid; v_acct_512 uuid; v_budget uuid;
  v_res jsonb; v_tx1 uuid; v_tx2 uuid;
  v_op_travaux boolean; v_noop_courant boolean; v_col boolean;
begin
  v_copro := public.create_test_copro_seeded('E4 cloud rollback test');
  select id into v_period from public.accounting_periods where copro_id=v_copro and status='open' order by start_date desc limit 1;
  select id into v_acct_c from public.accounts where copro_id=v_copro and charge_nature='courant' and substr(code,1,1)='6' limit 1;
  select id into v_acct_512 from public.accounts where copro_id=v_copro and substr(code,1,1)='5' limit 1;
  select id into v_budget from public.budgets where copro_id=v_copro limit 1;
  if v_period is null or v_acct_c is null or v_acct_512 is null or v_budget is null then
    raise exception 'E4_SETUP_FAIL period=% acctC=% acct512=% budget=%', v_period, v_acct_c, v_acct_512, v_budget;
  end if;

  -- tx1 : ligne courant 6xx AVEC operation_id -> doit etre classee TRAVAUX (precedence)
  v_res := public.create_ledger_transaction(v_copro, v_period, current_date, 'E4 test op', 'opening_balance', null,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acct_c, 'direction','debit','amount',100,'entry_label','test op','operation_id', v_budget::text),
      jsonb_build_object('account_id', v_acct_512, 'direction','credit','amount',100,'entry_label','contrepartie')
    ), true);
  v_tx1 := (v_res->>'tx_id')::uuid;

  -- tx2 : meme compte courant SANS operation_id -> doit rester COURANT
  v_res := public.create_ledger_transaction(v_copro, v_period, current_date, 'E4 test noop', 'opening_balance', null,
    jsonb_build_array(
      jsonb_build_object('account_id', v_acct_c, 'direction','debit','amount',50,'entry_label','test noop'),
      jsonb_build_object('account_id', v_acct_512, 'direction','credit','amount',50,'entry_label','contrepartie')
    ), true);
  v_tx2 := (v_res->>'tx_id')::uuid;

  -- assertion precedence (expression de v_result_allocation_split)
  select (e.operation_id is not null or a.charge_nature='travaux')
    into v_op_travaux
  from public.ledger_entries e join public.accounts a on a.id=e.account_id
  where e.tx_id = v_tx1 and substr(a.code,1,1)='6';

  select (e.operation_id is null and a.charge_nature='courant')
    into v_noop_courant
  from public.ledger_entries e join public.accounts a on a.id=e.account_id
  where e.tx_id = v_tx2 and substr(a.code,1,1)='6';

  v_col := exists(select 1 from information_schema.columns where table_name='ledger_entries' and column_name='operation_id');

  if not v_op_travaux then raise exception 'E4_FAIL: ligne op-set classee COURANT (attendu TRAVAUX)'; end if;
  if not v_noop_courant then raise exception 'E4_FAIL: ligne no-op pas classee COURANT'; end if;

  -- succes : on leve pour forcer le ROLLBACK et remonter le verdict
  raise exception 'E4_TEST_OK op_travaux=% noop_courant=% col_present=%', v_op_travaux, v_noop_courant, v_col;
end $$;
`;

const fullScript =
  "begin;\n" +
  "select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true);\n" +
  mig + "\n" +
  testBlock +
  "rollback;\n";

const res = await q(fullScript);
console.log('--- APPLY+TEST (en transaction, rollback) ---');
console.log('status:', res.status);
const body = res.body;
if (body.includes('E4_TEST_OK')) {
  const m = body.match(/E4_TEST_OK[^"\\]*/);
  console.log('RESULT: ✅', m ? m[0] : 'E4_TEST_OK');
} else if (body.includes('E4_FAIL') || body.includes('E4_SETUP_FAIL')) {
  const m = body.match(/E4_[A-Z_]*FAIL[^"\\]*/);
  console.log('RESULT: ❌ ASSERTION', m ? m[0] : body.slice(0, 300));
} else {
  console.log('RESULT: ⚠️ ERREUR (probable syntaxe/compilation 0060):');
  console.log(body.slice(0, 600));
}

// preuve du rollback : la colonne ne doit PAS exister hors transaction
const after = await q("select exists(select 1 from information_schema.columns where table_name='ledger_entries' and column_name='operation_id') as col_present;");
console.log('--- POST-ROLLBACK (live) ---');
console.log('operation_id présent dans la base live ?', after.body.slice(0, 80), '(attendu: false)');
