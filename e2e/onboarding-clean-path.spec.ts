/**
 * E2E — Parcours complet du wizard d'onboarding réparé (smoke "chemin propre").
 *
 * Objectif : prouver qu'une copropriété créée de bout en bout via le VRAI wizard
 * (Step 1 → Step 8) produit un grand livre propre :
 *   - `audit_finance_integrity(copro_id)` ne renvoie AUCUNE ligne (0 écart),
 *   - au moins 1 `call_for_funds` au statut `issued` a bien été posté.
 *
 * Preuve UI : Step 8 ("Enregistrer et vérifier") ne redirige vers /portefeuille
 * QUE si l'audit est propre (audit=0 ET compte d'attente 471/472 soldé).
 * Voir Step8Finalisation.tsx + auditOnboardingBooks() : si un écart subsiste,
 * l'étape reste affichée avec les écarts -> le toHaveURL(/portefeuille/) échouerait.
 *
 * Pré-requis (env, identiques aux specs AG existantes) :
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY      (assertions DB en service-role)
 *   - E2E_USER_EMAIL / E2E_USER_PASSWORD (optionnel : sinon compte démo lyes.triki@coproflex.fr)
 *   - serveur dev lancé (webServer Playwright) + comptes démo seedés
 *
 * NOTE : post-as-you-go. Les appels sont POSTÉS à la validation de Step 6 (route
 * idempotente postOnboardingCalls) ; la reprise est ENREGISTRÉE à la validation de
 * Step 7 (setOnboardingOpeningBalance, non bloquante). Step 8 ne re-poste rien : il
 * LIT l'état réel (auditOnboardingBooks = liste blanche, 471/472 non bloquant).
 * Ici on saisit une reprise ÉQUILIBRÉE (un report 120 contrebalancé par un solde
 * banque) -> net 471/472 = 0 -> audit propre -> redirection /portefeuille.
 */

import { test, expect } from '@playwright/test';
import { getAdminClient, login, stepBlock } from './support/helpers';

test.describe('Onboarding — chemin propre (audit = 0)', () => {
  const uniqueName = `CLEAN-E2E-${Date.now()}`;
  let coproId: string | null = null;

  test.afterAll(async () => {
    // Nettoyage best-effort de la copro de test (cascade attendue sur les tables liées).
    if (coproId) {
      const supabase = getAdminClient();
      await supabase.from('copros').delete().eq('id', coproId);
    }
  });

  test('parcours complet wizard -> redirection /portefeuille + audit propre', async ({ page }) => {
    test.setTimeout(120_000);

    // ── 1) Connexion ──────────────────────────────────────────────────────────
    await login(page);

    // ── 2) Step 1 : créer la copropriété ──────────────────────────────────────
    await page.goto('/onboarding/create');

    // Nom de la copro (placeholder "Résidence Les Lilas").
    await page.getByPlaceholder('Résidence Les Lilas').fill(uniqueName);

    // ADRESSE : depuis le fallback de saisie manuelle (Lot 0.1), les champs rue/CP/ville
    // sont TOUJOURS saisissables directement. L'autocomplete BAN/IGN (data.geopf.fr) n'est
    // qu'un raccourci de pré-remplissage — on ne dépend plus de lui ici (robuste en CI / hors-ligne).
    await page.getByPlaceholder(/Numéro et rue/).fill('1 rue de la Paix');
    // Code postal (placeholder "75001") + Ville (placeholder "Paris").
    await page.getByPlaceholder('75001').fill('75001');
    await page.getByPlaceholder('Paris').fill('Paris');

    await page.getByRole('button', { name: 'Créer et continuer' }).click();

    // Redirection vers /onboarding/{coproId} (Step 2).
    await page.waitForURL(/\/onboarding\/[0-9a-f-]+$/, { timeout: 30000 });
    const m = page.url().match(/\/onboarding\/([0-9a-f-]+)$/);
    expect(m).toBeTruthy();
    coproId = m![1];

    // Récupérer le copro_id en DB par le nom unique (double-vérification).
    const admin = getAdminClient();
    {
      const { data, error } = await admin
        .from('copros')
        .select('id')
        .eq('name', uniqueName)
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBe(coproId);
    }

    // ── 3) Step 2 : ajouter 2 copropriétaires ─────────────────────────────────
    const s2 = stepBlock(page, 'Copropriétaires');
    // Formulaire d'ajout rapide : placeholders "Nom *", "Prénom", "Email".
    // Le bouton d'ajout est une icône (UserPlus) sans libellé -> dernier <button> de la ligne d'ajout.
    // TODO vérifier le sélecteur du bouton "ajouter" (icône UserPlus, pas de texte).
    async function addCoproprietaire(nom: string, prenom: string, email: string): Promise<void> {
      await s2.getByPlaceholder('Nom *').fill(nom);
      await s2.getByPlaceholder('Prénom').fill(prenom);
      await s2.getByPlaceholder('Email').fill(email);
      // Le bouton d'ajout est désactivé tant que "Nom" est vide ; ici il est actif.
      await s2.locator('button:not([disabled])').last().click();
      // Attendre l'apparition de la ligne dans le tableau.
      await expect(s2.getByText(nom, { exact: false }).first()).toBeVisible();
    }
    await addCoproprietaire('Martin', 'Alice', 'alice.martin@example.com');
    await addCoproprietaire('Durand', 'Bob', 'bob.durand@example.com');

    // "Continuer (N copropriétaires)".
    await s2.getByRole('button', { name: /^Continuer \(/ }).click();

    // ── 4) Step 3 : créer 2 lots (500/500) avec propriétaire ──────────────────
    const s3 = stepBlock(page, 'Lots & Clés de répartition');
    // La clé "Charges générales" (base tantièmes, all_lots) est AUTO-CRÉÉE par Step3 :
    // elle couvre les 2 lots -> pas de création de clé manuelle nécessaire.

    async function createLot(ref: string, tantiemes: string, ownerLabel: string): Promise<void> {
      await s3.getByRole('button', { name: 'Ajouter un lot' }).click();
      // Modale "Nouveau lot" (CreateLotModal).
      const modal = page
        .locator('div')
        .filter({ has: page.getByRole('heading', { name: 'Nouveau lot' }) })
        .filter({ visible: true })
        .last();
      await modal.getByPlaceholder('ex: A-101').fill(ref);
      await modal.getByPlaceholder('ex: 500').fill(tantiemes);
      // Sélection du propriétaire (select "Propriétaire", options = display_name des copros).
      // TODO vérifier le label exact de l'option (display_name = "Prénom Nom" ou "Nom Prénom" ?).
      await modal.locator('select').last().selectOption({ label: ownerLabel }).catch(async () => {
        // Repli : sélectionner par index (1re option réelle après "— Aucun —").
        await modal.locator('select').last().selectOption({ index: 1 });
      });
      await modal.getByRole('button', { name: 'Créer le lot' }).click();
      // La modale se ferme après création.
      await expect(modal).toBeHidden({ timeout: 10000 });
    }

    // TODO vérifier : ownerLabel dépend du format display_name renvoyé par la vue lots.
    await createLot('A-101', '500', 'Alice Martin');
    await createLot('A-102', '500', 'Bob Durand');

    // "Continuer (2 lots)".
    await s3.getByRole('button', { name: /^Continuer \(/ }).click();

    // ── 5) Step 4 : comptes bancaires -> on SAUTE (saisie manuelle vide) ───────
    const s4 = stepBlock(page, 'Comptes bancaires');
    // "Continuer" est désactivé en mode "choose" : on bascule en "Saisie manuelle",
    // puis on continue sans rien saisir (les 2 comptes 512000/512100 seront créés à 0).
    await s4.getByRole('button', { name: 'Saisie manuelle' }).click();
    await s4.getByRole('button', { name: 'Continuer' }).click();

    // ── 6) Step 5 : 1 ligne de budget sur la clé générale ─────────────────────
    const s5 = stepBlock(page, 'Budget prévisionnel');
    await s5.getByRole('button', { name: 'Ajouter un poste' }).click();
    // Le dropdown propose les postes prédéfinis : "Honoraires syndic" mappe sur 621
    // (compte de charge réel) -> pas de bascule 628/avertissement.
    await page.getByRole('button', { name: 'Honoraires syndic' }).click();
    // Saisir le montant (input number, placeholder "0.00"). La clé est pré-sélectionnée
    // (defaultKeyId = "Charges générales").
    await s5.getByPlaceholder('0.00').first().fill('4000');
    await s5.getByRole('button', { name: 'Continuer' }).click();

    // ── 7) Step 6 : fréquence Annuel, 0 déjà émis, date AG, valider 1 appel ────
    const s6 = stepBlock(page, 'Appels de fonds');
    await s6.getByRole('button', { name: /^Annuel/ }).click();
    await s6.getByRole('button', { name: 'Aucun' }).click();
    await s6.locator('input[type="date"]').fill('2026-01-15');
    await s6.getByRole('button', { name: /^Voir les appels/ }).click();
    // Post-as-you-go : ce clic POSTE l'appel (idempotent) AVANT d'avancer.
    await s6.getByRole('button', { name: /^Valider ces/ }).click();

    // 7bis) Assertions DB immédiates (I13) : l'appel est issued ET le budget validé.
    {
      const { data: calls, error: callErr } = await admin
        .from('call_for_funds')
        .select('id, status')
        .eq('copro_id', coproId)
        .eq('status', 'issued');
      expect(callErr).toBeNull();
      expect((calls ?? []).length).toBeGreaterThanOrEqual(1);

      const { data: budgets, error: budErr } = await admin
        .from('budgets')
        .select('id, status')
        .eq('copro_id', coproId)
        .eq('budget_type', 'current');
      expect(budErr).toBeNull();
      expect((budgets ?? []).some(b => b.status === 'validated')).toBe(true);
    }

    // ── 8) Step 7 : reprise ÉQUILIBRÉE (report 120 = solde banque) -> 471/472 = 0 ─
    const s7 = stepBlock(page, 'Reprise de soldes');
    // "Report à nouveau — courant" (120) et le 1er compte bancaire reçoivent le MÊME
    // montant : le débit (banque, actif) équilibre le crédit (report 120) -> net 0.
    // Les champs sont des <input type=number> ; on cible par leur libellé proche.
    const reportField = s7.locator('input[type="number"]').first(); // 1er champ banque
    await reportField.fill('1000');
    // Champ "Report à nouveau — courant" : on le repère via le label "120".
    const report120 = s7
      .locator('div')
      .filter({ hasText: /Report à nouveau — courant/ })
      .locator('input[type="number"]')
      .last();
    await report120.fill('1000');
    // Enregistrer (non bloquant). Le bouton wizard est "Enregistrer et continuer".
    await s7.getByRole('button', { name: /Enregistrer et continuer/ }).click();

    // ── 9) Step 8 : finalisation (lit la DB, ne re-poste rien) ─────────────────
    const s8 = stepBlock(page, 'Finalisation');
    await s8.getByRole('button', { name: 'Vérifier et terminer' }).click();

    // ── 10) Preuve UI : redirection /portefeuille => audit propre ─────────────
    await expect(page).toHaveURL(/\/portefeuille/, { timeout: 30000 });

    // ── 11) Assertions DB ─────────────────────────────────────────────────────
    // 11a) audit_finance_integrity -> 0 ligne.
    {
      const { data, error } = await admin.rpc('audit_finance_integrity', {
        p_copro_id: coproId,
      });
      expect(error).toBeNull();
      expect(Array.isArray(data) ? data.length : -1).toBe(0);
    }

    // 11b) Au moins 1 call_for_funds "issued" pour cette copro.
    {
      const { data, error } = await admin
        .from('call_for_funds')
        .select('id, status')
        .eq('copro_id', coproId)
        .eq('status', 'issued');
      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    }
  });
});
