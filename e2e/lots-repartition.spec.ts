/**
 * E2E — Pilote « Lots & Répartition » (LECTURE SEULE) sur Résidence Martin.
 *
 * Fige ce qui a été validé à la main le 2026-06-21 après le correctif de l'étape 3
 * d'onboarding (fusion Tantièmes / clé générale) :
 *   - UNE seule colonne d'en-tête « Tantièmes » (= la clé générale, source unique),
 *   - AUCUN doublon « Charges générales » en colonne,
 *   - les 2 clés spéciales (« Bâtiment A », « Bâtiment B ») apparaissent en colonnes.
 *
 * Double preuve : le RENDU (en-têtes de la grille) ET la VÉRITÉ en base (service-role) :
 *   - la clé `category='general'` couvre les 7 lots pour 1000 tantièmes au total,
 *   - exactement 2 clés `category='special'` actives.
 *
 * Résidence Martin est en onboarding (step 3) : la grille s'affiche dans le wizard
 * `/onboarding/{id}` (Step3LotsKeys), seule étape visible au chargement (currentStep=3).
 * AUCUNE écriture — le test observe uniquement.
 */

import { test, expect } from '@playwright/test';
import { getAdminClient, login, stepBlock } from './support/helpers';
import { COPRO_MARTIN_NAME } from './support/config';

test.describe('Lots & Répartition — pilote lecture seule (Résidence Martin)', () => {
  test('1 colonne Tantièmes (clé générale), pas de doublon, 2 clés spéciales + vérité DB', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const admin = getAdminClient();

    // ── Résoudre l'ID de la copro par son nom (pas d'UUID en dur) ──────────────
    const { data: copro, error: coproErr } = await admin
      .from('copros')
      .select('id, onboarding_step')
      .eq('name', COPRO_MARTIN_NAME)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    expect(coproErr, 'lecture table copros').toBeNull();
    expect(copro, `copropriété « ${COPRO_MARTIN_NAME} » introuvable en base`).not.toBeNull();
    const coproId = copro!.id as string;

    // ── Connexion + ouverture de la copro dans le wizard d'onboarding ──────────
    await login(page);
    await page.goto(`/onboarding/${coproId}`);

    // Bloc d'étape 3 (visible au chargement pour une copro en onboarding_step=3).
    const s3 = stepBlock(page, 'Lots & Clés de répartition');
    await expect(s3).toBeVisible({ timeout: 20000 });

    // ── Preuve RENDU : en-têtes de la grille (rôle columnheader = <th>) ────────
    // 1 seule colonne « Tantièmes » (clé générale fusionnée — plus de doublon).
    await expect(
      page.getByRole('columnheader', { name: 'Tantièmes', exact: true }),
    ).toHaveCount(1, { timeout: 15000 });
    // Aucun en-tête de colonne « Charges générales » (l'ancien doublon a disparu).
    await expect(
      page.getByRole('columnheader', { name: 'Charges générales' }),
    ).toHaveCount(0);
    // Les 2 clés spéciales apparaissent en colonnes (en-tête = nom + statut « N/M lots »).
    await expect(page.getByRole('columnheader', { name: /Bâtiment A/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Bâtiment B/ })).toBeVisible();

    // ── Preuve BASE : la clé générale couvre 7 lots = 1000 tantièmes ───────────
    const { data: generalKey, error: genErr } = await admin
      .from('repartition_keys')
      .select('id')
      .eq('copro_id', coproId)
      .eq('category', 'general')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    expect(genErr, 'lecture clé générale').toBeNull();
    expect(generalKey, 'clé générale absente').not.toBeNull();

    const { data: lines, error: linesErr } = await admin
      .from('repartition_key_lines')
      .select('weight')
      .eq('key_id', generalKey!.id);
    expect(linesErr, 'lecture lignes de la clé générale').toBeNull();
    expect(lines, 'lignes de la clé générale').not.toBeNull();
    expect(lines!.length, 'nombre de lots couverts par la clé générale').toBe(7);
    const totalTantiemes = lines!.reduce((sum, l) => sum + Number(l.weight), 0);
    expect(totalTantiemes, 'somme des tantièmes généraux').toBeCloseTo(1000, 2);

    // ── Preuve BASE : exactement 2 clés spéciales actives ──────────────────────
    const { data: specialKeys, error: specErr } = await admin
      .from('repartition_keys')
      .select('id, name')
      .eq('copro_id', coproId)
      .eq('category', 'special')
      .eq('is_active', true);
    expect(specErr, 'lecture clés spéciales').toBeNull();
    expect(specialKeys?.length, 'nombre de clés spéciales actives').toBe(2);
  });
});
