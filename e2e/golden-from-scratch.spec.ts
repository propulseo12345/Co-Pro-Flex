/**
 * E2E — « Acte 1 » de la campagne golden : créer la copro GOLDEN via le VRAI wizard
 * d'onboarding (données riches) et asserter la STRUCTURE + la COMPTA de base en service-role.
 *
 * Pourquoi ce test : c'est le socle « from-scratch » de la campagne. On prouve que le wizard,
 * piloté avec une copro réaliste (2 bâtiments, 18 lots variés, 10 propriétaires, 6 clés,
 * budget multi-postes, échéancier trimestriel), produit une copro structurellement et
 * comptablement saine (grand livre propre, appels postés, budget validé).
 *
 * ISOLATION : copro PERSISTANTE (aucun teardown auto — décision de cadrage). Nom préfixé
 * « E2E-GOLDEN- » → inspectable après le run, purgeable À LA DEMANDE via
 * `.planning/tests/purge_test_copros.sql`.
 */

import { test, expect } from '@playwright/test';
import { getAdminClient } from './support/helpers';
import { onboardGolden } from './support/onboardGolden';
import {
  GOLDEN,
  expectedKeyWeightSums,
  expectedGeneralTantiemeSum,
} from './support/golden-data';

interface KeyRow {
  id: string;
  name: string;
}

interface KeyLineRow {
  weight: number;
}

interface LotRow {
  id: string;
  ref: string;
  surface: number | null;
  building_id: string | null;
}

interface BuildingRow {
  id: string;
  name: string;
}

test.describe('Golden from-scratch — onboarding riche (copro persistante E2E-GOLDEN)', () => {
  const coproName = `${GOLDEN.coproNamePrefix}-${Date.now()}`;
  let coproId = '';

  test('Acte 1 — onboarding golden : structure + compta de base', async ({ page }) => {
    test.setTimeout(240_000);
    const admin = getAdminClient();

    await test.step('Dérouler le wizard golden de bout en bout', async () => {
      coproId = await onboardGolden(page, coproName);
      expect(coproId, 'copro_id renvoyé par le wizard').toBeTruthy();
    });

    await test.step('Copro créée avec le bon nom (préfixe purgeable)', async () => {
      const { data, error } = await admin
        .from('copros')
        .select('id, name')
        .eq('id', coproId)
        .single();
      expect(error, 'lecture copro').toBeNull();
      expect(data?.name, 'nom copro = E2E-GOLDEN-...').toBe(coproName);
    });

    await test.step('18 lots créés + surface & building_id persistés', async () => {
      const { data: lots, error } = await admin
        .from('lots')
        .select('id, ref, surface, building_id')
        .eq('copro_id', coproId);
      expect(error, 'lecture lots').toBeNull();
      const rows = (lots ?? []) as LotRow[];
      expect(rows.length, 'nombre de lots').toBe(GOLDEN.lots.length); // 18

      // Index par ref pour des assertions ciblées.
      const byRef = new Map(rows.map((l) => [l.ref, l]));
      for (const expected of GOLDEN.lots) {
        const actual = byRef.get(expected.ref);
        expect(actual, `lot ${expected.ref} présent`).toBeTruthy();
        expect(Number(actual!.surface), `surface ${expected.ref}`).toBe(expected.surface);
      }

      // building_id : récupérer l'id du Bâtiment A, vérifier que tous les lots A-* y pointent.
      const { data: buildings, error: bErr } = await admin
        .from('buildings')
        .select('id, name')
        .eq('copro_id', coproId);
      expect(bErr, 'lecture buildings').toBeNull();
      const buildingByName = new Map(
        ((buildings ?? []) as BuildingRow[]).map((b) => [b.name, b.id]),
      );
      const buildingAId = buildingByName.get('Bâtiment A');
      expect(buildingAId, 'Bâtiment A présent').toBeTruthy();

      for (const expected of GOLDEN.lots.filter((l) => l.building === 'A')) {
        const actual = byRef.get(expected.ref);
        expect(actual!.building_id, `building_id du lot ${expected.ref}`).toBe(buildingAId);
      }
    });

    await test.step('Tantièmes généraux : somme = clé générale « Charges générales »', async () => {
      const sum = await sumKeyWeights(admin, coproId, 'Charges générales');
      expect(sum, 'somme tantièmes généraux').toBe(expectedGeneralTantiemeSum());
    });

    await test.step('Chaque clé spéciale a la bonne somme de poids', async () => {
      const expectedSums = expectedKeyWeightSums();
      for (const key of GOLDEN.keys) {
        const sum = await sumKeyWeights(admin, coproId, key.name);
        expect(sum, `somme poids clé « ${key.name} »`).toBe(expectedSums[key.name]);
      }
    });

    await test.step('Budget courant validé', async () => {
      const { data: budgets, error } = await admin
        .from('budgets')
        .select('id, status, budget_type')
        .eq('copro_id', coproId)
        .eq('budget_type', 'current');
      expect(error, 'lecture budgets').toBeNull();
      expect(
        (budgets ?? []).some((b) => b.status === 'validated'),
        'budget courant validé',
      ).toBe(true);
    });

    await test.step('Au moins 1 appel de fonds émis', async () => {
      const { data: calls, error } = await admin
        .from('call_for_funds')
        .select('id, status')
        .eq('copro_id', coproId)
        .eq('status', 'issued');
      expect(error, 'lecture call_for_funds').toBeNull();
      expect((calls ?? []).length, 'appels issued').toBeGreaterThanOrEqual(1);
    });

    await test.step('Grand livre propre — audit_finance_integrity = 0 écart', async () => {
      const { data: audit, error } = await admin.rpc('audit_finance_integrity', {
        p_copro_id: coproId,
      });
      expect(error, 'audit_finance_integrity').toBeNull();
      expect(Array.isArray(audit) ? audit.length : -1, 'écarts grand livre').toBe(0);
    });

    // eslint-disable-next-line no-console
    console.log(
      `[golden] copro persistante : ${coproName} (${coproId}) — purge via purge_test_copros.sql`,
    );
  });
});

/**
 * Somme des poids (repartition_key_lines.weight) d'une clé de répartition désignée par son
 * nom, pour une copro donnée. Renvoie 0 si la clé n'a aucune ligne.
 */
async function sumKeyWeights(
  admin: ReturnType<typeof getAdminClient>,
  coproId: string,
  keyName: string,
): Promise<number> {
  const { data: keys, error: keyErr } = await admin
    .from('repartition_keys')
    .select('id, name')
    .eq('copro_id', coproId)
    .eq('name', keyName);
  expect(keyErr, `lecture clé « ${keyName} »`).toBeNull();
  const keyRows = (keys ?? []) as KeyRow[];
  expect(keyRows.length, `clé « ${keyName} » unique`).toBe(1);

  const { data: lines, error: lineErr } = await admin
    .from('repartition_key_lines')
    .select('weight')
    .eq('key_id', keyRows[0].id);
  expect(lineErr, `lecture lignes clé « ${keyName} »`).toBeNull();
  return ((lines ?? []) as KeyLineRow[]).reduce((acc, l) => acc + Number(l.weight), 0);
}
