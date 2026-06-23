/**
 * Helper « Acte 1 golden » : déroule le VRAI wizard d'onboarding avec la fixture RICHE
 * (`GOLDEN`) et renvoie le copro_id. Pendant DATA-DRIVEN : tout est piloté par `golden-data.ts`.
 *
 * Pourquoi un helper dédié (pas `onboardCopro`) : la copro golden a 18 lots / 10 propriétaires /
 * 6 clés / 9 postes de budget — il faut éditer les lots auto-amorcés, en créer d'autres, créer
 * les clés spéciales et remplir une grille de poids. C'est l'« Acte 1 » réutilisable de la
 * campagne golden.
 *
 * LEÇONS DE SÉLECTEURS (display:none = a11y tree partiel) :
 *  - Le wizard rend toutes les étapes atteintes mais masque les inactives en `display:none`.
 *    `getByRole(...)` ne matche QUE l'étape visible → on cible au niveau `page` (pas de stepBlock).
 *  - `getByPlaceholder` / `locator('input[type=number]')` VOIENT le DOM caché → on préfère
 *    `getByRole('spinbutton')` / `getByLabel(...)` (a11y) qui ne voient que le visible.
 *  - Les inputs de poids (grille étape 3) sont NON CONTRÔLÉS : fill() PUIS blur() obligatoire.
 *  - Les modales (lot/clé) n'existent dans le DOM qu'ouvertes ; attendre leur h2 avant de remplir.
 *  - Étape 2 : les champs n'ont que des placeholders ; Playwright en fait le nom accessible,
 *    donc getByRole('textbox', { name: 'Nom *' }) fonctionne (placeholder exact, astérisque inclus).
 *
 * ORDRE DE L'AUTO-AMORÇAGE (étape 3) : le wizard crée 1 lot « Lot N » par propriétaire, dans
 * l'ordre de `listCoproprietaires` trié par display_name ASC. Lot 1 ↔ owners triés[0], etc.
 * On NE se fie PAS au numéro « Lot N » : on cible chaque ligne par le NOM du propriétaire
 * (colonne Propriétaire), ce qui reste valable quel que soit le tri d'affichage.
 */

import { expect, type Page, type Locator } from '@playwright/test';
import { login } from './helpers';
import {
  GOLDEN,
  splitOwnerName,
  type GoldenLot,
  type GoldenKey,
  type GoldenBudgetPoste,
} from './golden-data';

/** Map value de l'enum LotType → label affiché dans le <select> Type. */
const LOT_TYPE_LABELS: Record<GoldenLot['type'], string> = {
  appartement: 'Appartement',
  studio: 'Studio',
  commerce: 'Commerce',
  bureau: 'Bureau',
  cave: 'Cave',
  parking: 'Parking',
  garage: 'Garage',
  local_technique: 'Local technique',
  autre: 'Autre',
};

/** Remplit un input numéro non contrôlé (defaultValue + onBlur) : fill PUIS blur. */
async function fillAndBlur(locator: Locator, value: string): Promise<void> {
  await locator.fill(value);
  await locator.blur();
}

/**
 * Déroule le wizard golden de bout en bout et renvoie le copro_id.
 * @param page  page Playwright (sera connectée par le helper).
 * @param name  nom de la copro (préfixer « E2E-GOLDEN- » pour la purge).
 */
export async function onboardGolden(page: Page, name: string): Promise<string> {
  await login(page);

  // ── Étape 1 : créer la copropriété (page /onboarding/create, hors wizard) ───────────
  await page.goto('/onboarding/create');
  await page.getByPlaceholder('Résidence Les Lilas').fill(name);
  await page.getByPlaceholder(/Numéro et rue/).fill(GOLDEN.address);
  await page.getByPlaceholder('75001').fill(GOLDEN.postal);
  await page.getByPlaceholder('Paris').fill(GOLDEN.city);
  await page.getByRole('button', { name: 'Créer et continuer' }).click();

  await page.waitForURL(/\/onboarding\/[0-9a-f-]+$/, { timeout: 30_000 });
  const match = page.url().match(/\/onboarding\/([0-9a-f-]+)$/);
  expect(match, 'URL onboarding/{id} attendue').toBeTruthy();
  const coproId = match![1];

  // ── Étape 2 : 10 copropriétaires ────────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: 'Copropriétaires' })).toBeVisible();
  for (let i = 0; i < GOLDEN.owners.length; i++) {
    const owner = GOLDEN.owners[i];
    const { firstName, lastName } = splitOwnerName(owner);
    await page.getByRole('textbox', { name: 'Nom *' }).fill(lastName);
    await page.getByRole('textbox', { name: 'Prénom' }).fill(firstName);
    await page.getByRole('textbox', { name: 'Email' }).fill(`e2e.golden${i}@example.test`);
    await page.getByRole('button', { name: 'Ajouter' }).click();
    // Attendre la confirmation DOM (ligne ajoutée + champs reset) avant le suivant :
    // handleAdd est async, sans cette attente on saisirait par-dessus l'ancien.
    await expect(page.getByRole('cell', { name: lastName, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nom *' })).toHaveValue('');
  }
  await page.getByRole('button', { name: /^Continuer \(/ }).click();

  // ── Étape 3 : lots & clés ──────────────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: 'Lots & Clés de répartition' })).toBeVisible();

  // (a) Bâtiments — créer AVANT d'éditer les lots (le <select> Bâtiment n'apparaît que
  //     si buildings.length > 0). Bouton « Ajouter » homonyme du bouton étape 2 (caché) :
  //     getByRole ne voit que le visible, mais on scope par le placeholder du bloc pour
  //     la robustesse.
  for (const building of GOLDEN.buildings) {
    await page.getByPlaceholder('Nom du bâtiment (ex : Bâtiment A)').fill(building.name);
    await page.getByPlaceholder('Étages').fill(String(building.floors));
    // « Ajouter » du bloc Bâtiments : seul visible (l'étape 2 est en display:none).
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByText(building.name, { exact: true }).first()).toBeVisible();
  }

  // (b) Attendre la fin de l'auto-amorçage (1 lot « Lot N » par propriétaire) : tant que
  //     ça tourne l'écran affiche « Préparation des lots… » et il n'y a pas de grille.
  await expect(page.getByText('Préparation des lots…')).toBeHidden({ timeout: 30_000 });
  await expect(page.getByRole('columnheader', { name: 'Réf' })).toBeVisible();

  // (b) Pour chaque propriétaire : ÉDITER son lot auto-amorcé vers son 1er lot golden,
  //     puis CRÉER ses lots golden restants. On regroupe les lots golden par propriétaire
  //     en conservant l'ordre de la fixture.
  const lotsByOwner = new Map<string, GoldenLot[]>();
  for (const lot of GOLDEN.lots) {
    const list = lotsByOwner.get(lot.owner) ?? [];
    list.push(lot);
    lotsByOwner.set(lot.owner, list);
  }

  for (const owner of GOLDEN.owners) {
    const ownerLots = lotsByOwner.get(owner) ?? [];
    if (ownerLots.length === 0) continue;

    // -- Éditer le lot auto-amorcé de ce propriétaire (unique à cet instant : on n'a pas
    //    encore créé les lots supplémentaires). On le cible par le NOM du propriétaire.
    const seededRow = page.getByRole('row').filter({ hasText: owner }).first();
    await seededRow.getByRole('button', { name: 'Modifier le lot' }).click();
    await editLotInModal(page, ownerLots[0], { changeOwner: false });

    // -- Créer les lots golden restants de ce propriétaire (avec sélection EXPLICITE du
    //    propriétaire, sinon le lot n'est rattaché à personne).
    for (let k = 1; k < ownerLots.length; k++) {
      await createLotInModal(page, ownerLots[k], owner);
    }
  }

  // (c) Créer les 5 clés SPÉCIALES (la clé générale « Charges générales » est auto-créée).
  for (const key of GOLDEN.keys) {
    await createKeyInModal(page, key);
  }

  // (d) Remplir les POIDS de chaque clé spéciale (les lots absents restent à 0 = hors clé).
  for (const key of GOLDEN.keys) {
    for (const [ref, weight] of Object.entries(key.weights)) {
      const cell = page.getByLabel(`${key.name} ${ref}`, { exact: true });
      await fillAndBlur(cell, String(weight));
      // Re-query après remount (la key React est indexée sur le poids committé) pour
      // attendre la propagation avant de passer à la cellule suivante.
      await expect(page.getByLabel(`${key.name} ${ref}`, { exact: true })).toHaveValue(String(weight));
    }
  }

  await page.getByRole('button', { name: /^Continuer \(/ }).click();

  // ── Étape 4 : comptes bancaires (saisie manuelle, soldes nuls) ──────────────────────
  await expect(page.getByRole('heading', { level: 2, name: 'Comptes bancaires' })).toBeVisible();
  await page.getByRole('button', { name: /Saisie manuelle/ }).click();
  await expect(page.getByText('Compte principal pour les opérations courantes')).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // ── Étape 5 : budget multi-postes ──────────────────────────────────────────────────
  // Attendre que la clé soit chargée ET periodId prêt : le bouton « Continuer » s'active
  // quand periodId est résolu.
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeEnabled();
  for (let i = 0; i < GOLDEN.budget.postes.length; i++) {
    await addBudgetPoste(page, GOLDEN.budget.postes[i], i);
  }
  // Attendre que le total reflète la dernière saisie (évite une closure stale dans handleSave).
  await expect(page.getByText(/50\s?000,00/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Les 9 postes sont des postes personnalisés → ils tombent sur le compte 628 (Divers),
  // ce qui déclenche un bandeau d'avertissement NON bloquant. Le 1er clic a déjà CRÉÉ le
  // budget ; il faut un 2e clic « Continuer malgré tout » pour avancer.
  // handleSave (1er clic) a CRÉÉ le budget puis, comme les 9 postes tombent en 628, affiche un
  // bandeau d'avertissement au lieu d'avancer. Attendre que « Continuer malgré tout » apparaisse
  // (rendu async APRÈS la création du budget) PUIS cliquer — un isVisible() instantané racerait
  // avec la création et serait sauté (on resterait bloqué à l'étape 5).
  const warnContinue = page.getByRole('button', { name: 'Continuer malgré tout' });
  await expect(warnContinue).toBeVisible({ timeout: 15_000 });
  await warnContinue.click();

  // ── Étape 6 : appels (trimestriel, 0 déjà émis, date AG, valider = poste les appels) ─
  await expect(page.getByRole('button', { name: 'Trimestriel (4)' })).toBeVisible();
  await page.getByRole('button', { name: 'Trimestriel (4)' }).click();
  await page.getByRole('button', { name: 'Aucun' }).click();
  // Attendre que le budget soit chargé pour des montants/dates par défaut corrects.
  await expect(page.getByText('Budget annuel :')).toBeVisible();
  const agInput = page.locator('input[type="date"]');
  await agInput.fill(GOLDEN.agDate);
  await agInput.blur();
  await expect(page.getByRole('button', { name: 'Voir les appels (4)' })).toBeEnabled();
  await page.getByRole('button', { name: 'Voir les appels (4)' }).click();
  await expect(page.getByRole('heading', { name: '4 appels à valider' })).toBeVisible();
  await page.getByRole('button', { name: 'Valider ces 4 appels' }).click();

  // ── Étape 7 : reprise de soldes NULLE (copro neuve → déjà équilibrée 471/472 = 0) ───
  await expect(page.getByRole('heading', { name: 'Reprise de soldes' })).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();

  // ── Étape 8 : finalisation (redirige vers /portefeuille si audit propre) ────────────
  await expect(page.getByRole('heading', { name: 'Finalisation' })).toBeVisible();
  await page.getByRole('button', { name: 'Vérifier et terminer' }).click();
  await expect(page).toHaveURL(/\/portefeuille/, { timeout: 30_000 });

  return coproId;
}

/**
 * Remplit la modale EditLotModal (champs SANS label lié → cibler par rôle + ordre DOM).
 * Ordre des spinbutton : [0]=Étage, [1]=Surface, [2]=Tantièmes généraux.
 * Ordre des combobox AVEC bâtiments : [0]=Type, [1]=Bâtiment, [2 / .last()]=Propriétaire.
 */
async function editLotInModal(
  page: Page,
  lot: GoldenLot,
  opts: { changeOwner: boolean },
): Promise<void> {
  // SCOPER au dialog : la grille (spinbuttons de poids) et le bloc Bâtiments (textbox)
  // restent VISIBLES derrière l'overlay → sans scope, getByRole('textbox'/'spinbutton')
  // matche plusieurs éléments (strict mode violation).
  const dlg = page.getByRole('dialog', { name: 'Modifier le lot' });
  await expect(dlg).toBeVisible();

  // Référence : seul textbox de la modale (les autres champs sont number/select).
  await dlg.getByRole('textbox').fill(lot.ref);

  // Type (1er combobox).
  await dlg.getByRole('combobox').first().selectOption({ label: LOT_TYPE_LABELS[lot.type] });

  // Étage / Surface / Tantièmes (3 spinbutton dans l'ordre DOM).
  const spin = dlg.getByRole('spinbutton');
  await spin.nth(0).fill(String(lot.floor));
  await spin.nth(1).fill(String(lot.surface));
  await spin.nth(2).fill(String(lot.tantieme));

  // Bâtiment (2e combobox, présent car des bâtiments ont été créés).
  const building = GOLDEN.buildings.find(b => b.code === lot.building);
  if (building) {
    await dlg.getByRole('combobox').nth(1).selectOption({ label: building.name });
  }

  // Propriétaire : déjà rattaché par l'amorçage ; ne le changer que si demandé.
  if (opts.changeOwner) {
    await dlg.getByRole('combobox').last().selectOption({ label: lot.owner });
  }

  await dlg.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dlg).toBeHidden();
}

/**
 * Remplit la modale CreateLotModal (champs AVEC placeholders). Propriétaire = sélection
 * EXPLICITE obligatoire (défaut « — Aucun — »).
 */
async function createLotInModal(page: Page, lot: GoldenLot, owner: string): Promise<void> {
  await page.getByRole('button', { name: 'Ajouter un lot' }).click();
  // SCOPER au dialog (grille + bloc Bâtiments visibles derrière → collisions sinon).
  const dlg = page.getByRole('dialog', { name: 'Nouveau lot' });
  await expect(dlg).toBeVisible();

  await dlg.getByRole('textbox').fill(lot.ref);
  await dlg.getByRole('combobox').first().selectOption({ label: LOT_TYPE_LABELS[lot.type] });
  const spin = dlg.getByRole('spinbutton');
  await spin.nth(0).fill(String(lot.floor));
  await spin.nth(1).fill(String(lot.surface));

  const building = GOLDEN.buildings.find(b => b.code === lot.building);
  if (building) {
    await dlg.getByRole('combobox').nth(1).selectOption({ label: building.name });
  }

  await spin.nth(2).fill(String(lot.tantieme));
  // Propriétaire = dernier <select> de la modale.
  await dlg.getByRole('combobox').last().selectOption({ label: owner });

  await dlg.getByRole('button', { name: 'Créer le lot' }).click();
  await expect(dlg).toBeHidden();
  // La nouvelle ligne apparaît dans la grille (colonne Réf).
  await expect(page.getByRole('cell', { name: lot.ref, exact: true }).first()).toBeVisible();
}

/**
 * Remplit la modale CreateKeyModal (clé spéciale). Portée/base sélectionnées par VALEUR
 * (plus robuste que les longs labels). category est forcé à « special » côté code.
 */
async function createKeyInModal(page: Page, key: GoldenKey): Promise<void> {
  await page.getByRole('button', { name: 'Ajouter une clé' }).click();
  const dlg = page.getByRole('dialog', { name: 'Nouvelle clé de répartition' });
  await expect(dlg).toBeVisible();

  // Nom : 2 textbox dans cette modale (nom + description) → cibler par placeholder.
  await dlg.getByPlaceholder('ex: Charges générales, Ascenseur bât. A...').fill(key.name);
  await dlg.getByRole('combobox').first().selectOption(key.coverage);
  await dlg.getByRole('combobox').nth(1).selectOption(key.basis);

  await dlg.getByRole('button', { name: 'Créer la clé' }).click();
  await expect(dlg).toBeHidden();
  // La colonne de la clé apparaît dans la grille (en-tête cliquable).
  await expect(page.getByText(key.name, { exact: true }).first()).toBeVisible();
}

/**
 * Ajoute un poste de budget à l'étape 5 en POSTE PERSONNALISÉ (libellé libre + montant +
 * clé). Le dropdown se referme après chaque ajout → on le ré-ouvre à chaque poste.
 * @param index  position du poste (0-based) pour cibler les inputs de la nouvelle ligne.
 */
async function addBudgetPoste(page: Page, poste: GoldenBudgetPoste, index: number): Promise<void> {
  await page.getByRole('button', { name: 'Ajouter un poste' }).click();
  await page.getByRole('button', { name: 'Poste personnalisé' }).click();

  // Libellé : seul input texte de libellé (les prédéfinis sont des <span>) → placeholder.
  await page.getByPlaceholder('Nom du poste').nth(index).fill(poste.libelle);

  // Montant : spinbutton de la ligne (1 par ligne) → index.
  const amount = page.getByRole('spinbutton').nth(index);
  await fillAndBlur(amount, String(poste.montant));

  // Clé de répartition : <select> de la ligne. Sélection EXPLICITE par nom de clé
  // (option vide « Clé » = ligne ignorée à l'enregistrement).
  await page.getByRole('combobox').nth(index).selectOption({ label: poste.key });
}
