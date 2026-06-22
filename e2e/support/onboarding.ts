/**
 * Helper réutilisable : déroule le VRAI wizard d'onboarding (Step 1 → Step 8) et renvoie le
 * copro_id d'une copropriété propre (audit_finance_integrity = 0, 1 appel posté, budget validé).
 *
 * Sert d'« Acte 1 » à des parcours plus longs (cycle annuel, pluriannuel). Le nom est paramétrable :
 * passer un nom préfixé « E2E- » pour qu'il soit purgeable par `.planning/tests/purge_test_copros.sql`.
 *
 * IMPORTANT — sélecteurs (leçons d'exploration MCP) :
 *  - on n'utilise PAS `stepBlock` : le wizard masque les étapes inactives en `display:none`, donc
 *    elles sont ABSENTES de l'arbre d'accessibilité -> `page.getByRole(...)` ne matche que l'étape
 *    visible. (stepBlock + .last() sélectionnait le mauvais conteneur.)
 *  - étape 2 : champs = textbox par NOM ACCESSIBLE (label), bouton « Ajouter » (texte).
 *  - étape 3 : les lots sont AUTO-CRÉÉS (1 par copropriétaire) -> on renseigne les tantièmes
 *    (spinbutton) et on BLUR (la valeur n'est prise en compte qu'au blur).
 */

import { expect, type Page } from '@playwright/test';
import { login } from './helpers';

export interface OnboardOptions {
  /** Nom de la copro. Préfixer « E2E- » pour la rendre purgeable. */
  name: string;
}

/** Crée une copropriété de bout en bout via le wizard et renvoie son id. */
export async function onboardCopro(page: Page, opts: OnboardOptions): Promise<string> {
  await login(page);

  // ── Step 1 : créer la copropriété ──────────────────────────────────────────
  await page.goto('/onboarding/create');
  await page.getByPlaceholder('Résidence Les Lilas').fill(opts.name);
  await page.getByPlaceholder(/Numéro et rue/).fill('1 rue de la Paix');
  await page.getByPlaceholder('75001').fill('75001');
  await page.getByPlaceholder('Paris').fill('Paris');
  await page.getByRole('button', { name: 'Créer et continuer' }).click();

  await page.waitForURL(/\/onboarding\/[0-9a-f-]+$/, { timeout: 30000 });
  const m = page.url().match(/\/onboarding\/([0-9a-f-]+)$/);
  expect(m, 'URL onboarding/{id} attendue').toBeTruthy();
  const coproId = m![1];

  // ── Step 2 : 2 copropriétaires (champs uniques à cette étape) ────────────────
  async function addCoproprietaire(nom: string, prenom: string, email: string): Promise<void> {
    await page.getByRole('textbox', { name: 'Nom *' }).fill(nom);
    await page.getByRole('textbox', { name: 'Prénom' }).fill(prenom);
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await expect(page.getByRole('cell', { name: nom, exact: true })).toBeVisible();
  }
  await addCoproprietaire('Martin', 'Alice', 'alice.martin@example.com');
  await addCoproprietaire('Durand', 'Bob', 'bob.durand@example.com');
  await page.getByRole('button', { name: /^Continuer \(/ }).click();

  // ── Step 3 : lots AUTO-CRÉÉS -> renseigner tantièmes (500/500) + blur ────────
  const tantiemes = page.getByRole('spinbutton');
  await tantiemes.nth(0).fill('500');
  await tantiemes.nth(0).blur();
  await tantiemes.nth(1).fill('500');
  await tantiemes.nth(1).blur();
  await page.getByRole('button', { name: /^Continuer \(/ }).click();

  // ── Step 4 : comptes bancaires (saisie manuelle vide) ────────────────────────
  await page.getByRole('button', { name: 'Saisie manuelle' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // ── Step 5 : budget (1 poste 621 = 4000 €) ───────────────────────────────────
  // Le montant est un spinbutton (« € / an »). NB : getByPlaceholder('0.00') matcherait un input
  // MASQUÉ de l'étape 4 (getByPlaceholder voit le DOM caché) -> on cible le spinbutton visible (a11y).
  await page.getByRole('button', { name: 'Ajouter un poste' }).click();
  await page.getByRole('button', { name: 'Honoraires syndic' }).click();
  // Sélectionner EXPLICITEMENT la clé : la clé par défaut est chargée async ; sans ça, la ligne peut
  // avoir keyId vide -> handleSave l'exclut (label && amount>0 && keyId) -> budget jamais créé.
  await page.getByRole('combobox').first().selectOption({ label: 'Charges générales' });
  await page.getByRole('spinbutton').first().fill('4000');
  await page.getByRole('spinbutton').first().blur();
  // ATTENDRE que le montant soit propagé dans le state (total re-rendu) AVANT de Continuer :
  // sinon handleSave lit un `lines` périmé (montant vide) -> budget jamais créé (closure stale React).
  await expect(page.getByText(/4\s?000,00/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // ── Step 6 : appels annuels, 0 déjà émis, date AG, valider (poste l'appel) ────
  await page.getByRole('button', { name: /^Annuel/ }).click();
  await page.getByRole('button', { name: 'Aucun' }).click();
  await page.locator('input[type="date"]').fill('2026-01-15');
  await page.getByRole('button', { name: /^Voir les appels/ }).click();
  await page.getByRole('button', { name: /^Valider ces/ }).click();

  // ── Step 7 : reprise de soldes. Une reprise VIDE (tout à 0) est DÉJÀ équilibrée (471/472 = 0,
  // copro neuve sans reprise de mandat) -> l'écran affiche « Reprise équilibrée » et on enregistre
  // directement. NB : `input[type=number]` matcherait les tantièmes MASQUÉS de l'étape 3 (DOM caché) ;
  // les champs de reprise sont des spinbutton — non saisis ici (reprise nulle voulue).
  await page.getByRole('button', { name: /Enregistrer et continuer/ }).click();

  // ── Step 8 : finalisation (redirige vers /portefeuille si audit propre) ──────
  await page.getByRole('button', { name: 'Vérifier et terminer' }).click();
  await expect(page).toHaveURL(/\/portefeuille/, { timeout: 30000 });

  return coproId;
}
