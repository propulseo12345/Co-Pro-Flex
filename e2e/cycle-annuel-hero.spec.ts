/**
 * E2E — Test « héros » : la VIE d'une copropriété sur plusieurs exercices.
 *
 * Objectif (cf. cadrage campagne de test, critère #3 « persistance & non-régression inter-AG ») :
 * prouver qu'un syndic peut vivre un CYCLE ANNUEL COMPLET puis enchaîner sur l'exercice suivant
 * en RÉCUPÉRANT les informations (report à-nouveaux, impayés, budget N-1). Un syndic ne vit pas
 * un exercice isolé : c'est aux JOINTURES entre années que tout se joue.
 *
 * Structure (tranches verticales — chaque acte vérifie ÉCRAN + GRAND LIVRE) :
 *   Acte 1 — Onboarding : copro + budget validé + appel posté        [CETTE TRANCHE]
 *   Acte 2 — Encaissement des appels (D512/C450)                     [à venir]
 *   Acte 3 — Facture fournisseur + paiement (D6xx/C401, D401/C512)   [à venir]
 *   Acte 4 — Clôture 2026 + 5 annexes + affectation résultat          [à venir]
 *   Acte 5 — Passage 2027 (open_next_period) : report à-nouveaux      [à venir]
 *   Acte 6 — Exercice 2027 : continuité (budget N-1, impayés reportés)[à venir]
 *
 * ISOLATION : copro PERSISTANTE (aucun teardown auto — décision de cadrage). Nom préfixé « E2E- »
 * -> inspectable après le run, purgeable À LA DEMANDE via `.planning/tests/purge_test_copros.sql`.
 */

import { test, expect } from '@playwright/test';
import { getAdminClient } from './support/helpers';
import { onboardCopro } from './support/onboarding';

test.describe('Cycle annuel — héros pluriannuel (copro persistante E2E-)', () => {
  const coproName = `E2E-CYCLE-${Date.now()}`;
  let coproId = '';

  test('vie de la copro 2026 -> 2027 (continuité inter-exercices)', async ({ page }) => {
    test.setTimeout(180_000);
    const admin = getAdminClient();

    await test.step('Acte 1 — Onboarding : copro + budget validé + appel posté', async () => {
      coproId = await onboardCopro(page, { name: coproName });

      // Preuve base : grand livre propre (aucun écart d'intégrité).
      const { data: audit, error: auditErr } = await admin.rpc('audit_finance_integrity', {
        p_copro_id: coproId,
      });
      expect(auditErr, 'audit_finance_integrity').toBeNull();
      expect(Array.isArray(audit) ? audit.length : -1, 'écarts grand livre').toBe(0);

      // Preuve base : au moins 1 appel posté + budget courant validé.
      const { data: calls } = await admin
        .from('call_for_funds')
        .select('id, status')
        .eq('copro_id', coproId)
        .eq('status', 'issued');
      expect((calls ?? []).length, 'appels issued').toBeGreaterThanOrEqual(1);

      const { data: budgets } = await admin
        .from('budgets')
        .select('id, status')
        .eq('copro_id', coproId)
        .eq('budget_type', 'current');
      expect((budgets ?? []).some((b) => b.status === 'validated'), 'budget courant validé').toBe(true);

      // eslint-disable-next-line no-console
      console.log(`[héros] copro persistante : ${coproName} (${coproId}) — purge via purge_test_copros.sql`);
    });

    // Actes 2 → 6 : ajoutés tranche par tranche (voir en-tête). Le test reste vert tant qu'on
    // n'ajoute pas un acte qui échoue -> chaque tranche est livrée prouvée.
  });
});
