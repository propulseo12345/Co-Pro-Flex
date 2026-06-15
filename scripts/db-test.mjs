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
  'supabase/tests/gate_0043_seed_resolution_templates.sql',
  'supabase/tests/gate_rls_definer_guards.sql',
  'supabase/tests/gate_supplier_invoice_validation.sql',
  'supabase/tests/gate_0047_maintenance_views.sql',
  'supabase/tests/gate_0049_main_screen_views.sql',
  'supabase/tests/gate_0051_communication.sql',
  'supabase/tests/gate_0054_mutations_dashboard.sql',
  'supabase/tests/gate_0055_cron_reminders.sql',
  'supabase/tests/gate_finance_loop_e2e.sql',
  'supabase/tests/gate_cloture_affectation_e2e.sql',
  'supabase/tests/gate_gel_travaux_e2e.sql',
  'supabase/tests/gate_multicles_e2e.sql',
  'supabase/tests/gate_charge_nature_e2e.sql',
  'supabase/tests/gate_e4_operation_id_e2e.sql',
  'supabase/tests/gate_avoir_fournisseur_e2e.sql',
  'supabase/tests/gate_0061_council_members_detail.sql',
  'supabase/tests/gate_0062_ag_milestones_rpc.sql',
  'supabase/tests/gate_0063_ag_envoi_choices.sql',
  'supabase/tests/gate_0064_mutations_create.sql',
  'supabase/tests/gate_0065_ag_pouvoirs.sql',
  'supabase/tests/gate_0066_bank_reconcile.sql',
  'supabase/tests/gate_0067_charge_nature_corrective.sql',
  'supabase/tests/gate_0068_set_account_charge_nature.sql',
  'supabase/tests/gate_0071_reverse_ledger.sql',
];

// Gates DIFFÉRÉES — phase sécurité (NON bloquantes).
// Elles exercent le chemin `authenticated` / RLS de PROD : `SET ROLE authenticated` puis
// accès direct aux tables. En DEV ce chemin n'est PAS câblé volontairement — `authenticated`
// n'a de grant que sur tiers_directory (migration 0034) et la RLS est désactivée
// (apply_rls_environment fail-open). Décision F5 : « RLS on = avant la prod, pas avant de
// tester en dev ». Ces gates échouent donc PAR CONSTRUCTION (permission denied) jusqu'à la
// phase sécurité (grants authenticated + RLS on). Elles restent exécutées et visibles, mais
// ne bloquent pas db:test. Si l'une se met à PASSER → la PROMOUVOIR vers GATES.
const DEFERRED_GATES = [
  'supabase/tests/gate_0042_resolution_templates.sql',
  'supabase/tests/gate_rls_multitenant_isolation.sql',
  'supabase/tests/gate_0050_ag_annexes.sql',
  'supabase/tests/gate_0052_ged.sql',
  'supabase/tests/gate_0053_conseil_rapports.sql',
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

console.log(`db:test — ${GATES.length} gates bloquantes + ${DEFERRED_GATES.length} différées (conteneur ${CONTAINER})\n`);

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

// Différées (phase sécurité) : exécutées, NON bloquantes. Un PASSAGE = signal de promotion.
console.log('\n  — différées (phase sécurité — non bloquantes) —');
let promote = 0;
for (const gate of DEFERRED_GATES) {
  const { ok } = runGate(gate);
  if (ok) {
    promote++;
    console.log(`  ⬆ ${basename(gate)} — PASSE désormais → PROMOUVOIR vers GATES (sécurité câblée ?)`);
  } else {
    console.log(`  ⏸ ${basename(gate)} (différé — rouge attendu, chemin authenticated/RLS non câblé en dev)`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`db:test — ${failures}/${GATES.length} gate(s) bloquante(s) en échec.`);
  process.exit(1);
}
console.log(`db:test — ${GATES.length}/${GATES.length} gates bloquantes OK${promote ? ` ; ${promote} différée(s) À PROMOUVOIR` : ` ; ${DEFERRED_GATES.length} différées rouges (attendu)`}.`);
