import fs from 'fs';
const tok = process.env.SUPABASE_ACCESS_TOKEN;
const ref = 'qqfqrcolzmcbsvfaumiq';
const base = 'C:/Users/cleme/Desktop/Propulseo/Flex/Co-Pro-Flex/';
const mig = fs.readFileSync(base + 'supabase/migrations/0060_e4_operation_id_ledger.sql', 'utf8').replace(/\r\n/g, '\n');
const gate = fs.readFileSync(base + 'supabase/tests/gate_e4_operation_id_e2e.sql', 'utf8').replace(/\r\n/g, '\n');

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return { ok: r.ok, status: r.status, body: await r.text() };
}

const script =
  "begin;\n" +
  "select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', true);\n" +
  mig + "\n" +
  gate + "\n" +
  "select 'GATE_RAN_OK' as marker;\n" +
  "rollback;\n";

const res = await q(script);
console.log('status:', res.status);
if (res.body.includes('GATE_RAN_OK')) {
  console.log('RESULT: ✅ gate_e4_operation_id_e2e PASSE (sortie propre, aucune assertion levée)');
} else {
  const m = res.body.match(/E4[^"\\]*/) || res.body.match(/ERROR[^"\\]*/);
  console.log('RESULT: ❌ gate échoué :', m ? m[0].slice(0, 220) : res.body.slice(0, 300));
}
const after = await q("select exists(select 1 from information_schema.columns where table_name='ledger_entries' and column_name='operation_id') as col;");
console.log('post-rollback operation_id présent ?', after.body.slice(0, 60), '(attendu false)');
