#!/usr/bin/env node
/**
 * db:test — runner des gates SQL d'intégrité financière contre la base locale (Docker).
 *
 * Exécute une liste CURATÉE de tests SQL auto-rollback (chacun pose un savepoint via
 * son bloc EXCEPTION et lève ROLLBACK_TEST_OK en fin de parcours -> aucune donnée ne
 * persiste). Chaque test reçoit le contexte service_role en tête (gardes is_service_call).
 *
 * Un test PASSE si psql sort en code 0 (ON_ERROR_STOP=1 : toute assertion échouée
 * re-lève une ERROR -> code non nul). Le runner sort non nul si au moins un test échoue.
 *
 * NB : liste curatée volontairement (pas un glob de supabase/tests/*.sql) — plusieurs
 * tests legacy portent sur des domaines encore driftés (ex. maintenance). On élargit la
 * liste au fur et à mesure des rebranchements. Voir aussi `npm test` (vitest, logique pure).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CONTAINER = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_Co-Pro-Flex';
const CLAIM = `select set_config('request.jwt.claims', '{"role":"service_role"}', false);\n`;

// Gates vérifiées (auto-rollback). Chemins relatifs à la racine du projet.
const GATES = [
  'supabase/tests/t1_onboarding_gate.sql',
  'supabase/tests/20260603100000_positive_proof_test.sql',
  'supabase/tests/20260603104000_moteur_acceptance_test.sql',
  'supabase/tests/20260603103000_period_from_exercice_debut_test.sql',
  'supabase/tests/gate_0042_resolution_templates.sql',
  'supabase/tests/gate_0043_seed_resolution_templates.sql',
];

function runGate(relPath) {
  const sql = CLAIM + readFileSync(join(ROOT, relPath), 'utf8');
  const res = spawnSync(
    'docker',
    ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8' }
  );
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const ok = res.status === 0 && !/ERROR/i.test(out);
  return { ok, out };
}

console.log(`db:test — ${GATES.length} gates SQL (conteneur ${CONTAINER})\n`);

let failures = 0;
for (const gate of GATES) {
  const { ok, out } = runGate(gate);
  if (ok) {
    console.log(`  ✓ ${basename(gate)}`);
  } else {
    failures++;
    console.log(`  ✗ ${basename(gate)}`);
    console.log(out.split('\n').filter((l) => /ERROR|FAIL/i.test(l)).map((l) => `      ${l}`).join('\n'));
  }
}

console.log('');
if (failures > 0) {
  console.error(`db:test — ${failures}/${GATES.length} gate(s) en échec.`);
  process.exit(1);
}
console.log(`db:test — ${GATES.length}/${GATES.length} gates OK.`);
