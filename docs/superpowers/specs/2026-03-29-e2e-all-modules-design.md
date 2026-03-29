# Design Spec — E2E Tests All Modules
**Date**: 2026-03-30 (mis à jour avec vrais noms de tables Supabase)
**Fichier cible** : `e2e/all-modules.spec.ts`

---

## Objectif

Fichier de tests E2E unique et exhaustif couvrant l'ensemble des modules fonctionnels de CoProFlex. Ce fichier est le **fichier de test maître** — il remplace et absorbe les specs AG existants (`ag-workflow.spec.ts`, `ag-draft-resume.spec.ts`, `ag-resolutions-step2.spec.ts`) qui peuvent être conservés pour leur granularité mais ne sont plus les seuls tests E2E.

---

## Stack & Prérequis

- **Framework** : Playwright (`@playwright/test` ^1.58)
- **Base URL** : `http://localhost:3000`
- **Auth** : Aucune — les pages dashboard sont accessibles sans authentification en dev
- **DB** : Supabase — chaque test écrit via UI, vérifie via admin client
- **Env vars requises** :
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TEST_COPRO_ID` — UUID d'une copropriété de test avec seed data

### Seed data requise

La copropriété `TEST_COPRO_ID` doit avoir :
- Au moins 3 copropriétaires avec tantièmes
- Au moins 2 lots
- Au moins 1 exercice comptable configuré
- Au moins 1 prestataire dans l'annuaire

---

## Architecture du fichier

```
e2e/all-modules.spec.ts
├── Helpers partagés
│   ├── getAdminClient() — Supabase service role client
│   ├── cleanupByPrefix(table, column, prefix) — nettoyage générique
│   └── TEST_PREFIX = 'E2E_ALL_'
│
├── test.describe('AG — Assemblées Générales') [9 tests]
├── test.describe('Finance — Budgets') [4 tests]
├── test.describe('Finance — Appels de fonds') [3 tests]
├── test.describe('Finance — Factures') [4 tests]
├── test.describe('Finance — Mouvements bancaires') [3 tests]
├── test.describe('Maintenance — Contrats') [4 tests]
├── test.describe('Maintenance — Ordres de service') [5 tests]
├── test.describe('Maintenance — Carnet d'entretien') [3 tests]
├── test.describe('Documents — GED') [4 tests]
├── test.describe('Communication — Messagerie privée') [3 tests]
├── test.describe('Communication — Mur communautaire') [3 tests]
├── test.describe('Communication — Événements') [2 tests]
├── test.describe('Copropriétaires') [3 tests]
└── test.describe('Ventes & Impayés') [4 tests]
```

**Total : ~58 tests**

---

## Stratégie commune

### Pattern par module

```typescript
test.describe('Module — Sous-module', () => {
  let entityId: string;
  const testTitle = `${TEST_PREFIX}MODULE_${Date.now()}`;

  test.beforeAll(async () => {
    await cleanupByPrefix('table_name', 'title', TEST_PREFIX + 'MODULE_');
  });

  test.afterAll(async () => {
    await cleanupByPrefix('table_name', 'title', testTitle);
  });

  test('1. Naviguer vers la page → contenu de base visible', async ({ page }) => { ... });
  test('2. Créer une entité → visible en liste', async ({ page }) => { ... });
  test('3. Modifier l'entité → changement persisté en DB', async ({ page }) => { ... });
  test('4. Action métier (valider/clôturer/résilier) → statut DB mis à jour', async ({ page }) => { ... });
});
```

### Vérification DB systématique

Après chaque action UI critique, vérifier l'état en DB via `getAdminClient()`. Après chaque vérification DB, recharger la page et vérifier que l'UI reflète l'état DB (test de rehydration).

### data-testid vs sélecteurs CSS

- Préférer `[data-testid="..."]` quand disponible
- Fallback sur `button:has-text("...")` ou `[class*="..."]` (comme dans les specs AG existants)
- Les sélecteurs CSS Modules suivent le pattern `[class*="nomDuModule"]`

---

## Tests détaillés

### AG — Assemblées Générales

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | Créer une AG ordinaire (titre, type, date, lieu) → navigate `/ag/new` | `ag_meetings.status = 'draft'` |
| 2 | Ajouter résolution auto (pré-remplir obligatoires) | `ag_resolutions` count > 0 |
| 3 | Ajouter résolution personnalisée | `ag_resolutions` count + 1 |
| 4 | Configurer convocation → continuer | Navigation vers `/envoi` |
| 5 | Configurer envoi (email pour tous) → continuer | Navigation vers `/preparation` |
| 6 | Feuille de présence (marquer présents) | `ag_attendance` rows créées |
| 7 | Session live — voter sur résolution 1 | `ag_votes` rows créées |
| 8 | Générer PV et clôturer | `ag_meetings.status = 'closed'` |
| 9 | Rechargement page agenda → données DB (pas localStorage) | Résolutions visibles après clear localStorage |

### Finance — Budgets

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/finance/budgets` charge → titre page visible | — |
| 2 | Créer budget (nom + année + montant global) | Row dans `budgets` |
| 3 | Modifier un poste budgétaire (changer montant) | `budget_lines` mis à jour |
| 4 | Valider le budget → statut change | `budgets.status = 'validated'` |

### Finance — Appels de fonds

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/finance/appels-fonds` charge → liste visible | — |
| 2 | Générer échéancier trimestriel (4 appels) | 4 rows dans `call_for_funds` |
| 3 | Enregistrer paiement sur 1er appel | `call_for_funds_lines.status = 'paid'` |

### Finance — Factures

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/finance/factures` charge → liste visible | — |
| 2 | Créer facture (fournisseur + montant + date échéance) | Row dans `supplier_invoices` |
| 3 | Approuver la facture | `supplier_invoices.status = 'approved'` |
| 4 | Marquer comme payée | `supplier_invoices.status = 'paid'` |

### Finance — Mouvements bancaires

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/finance/mouvements-bancaires` charge → liste visible | — |
| 2 | Filtrer par compte (CC vs FT) → liste filtrée | — |
| 3 | Catégoriser un mouvement → badge catégorie visible | `bank_movements.account_category` mis à jour |

### Maintenance — Contrats

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/maintenance/contracts` charge → liste visible | — |
| 2 | Créer contrat (prestataire + dates + montant) | Row dans `contracts` |
| 3 | Vérifier badge alerte renouvellement (contrat < 60j) | — |
| 4 | Résilier le contrat → statut change | `contracts.status = 'resiliated'` |

### Maintenance — Ordres de service

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/maintenance/service-orders` charge → liste visible | — |
| 2 | Créer OS (description + prestataire) | `service_orders.status = 'BROUILLON'` |
| 3 | Envoyer l'OS | `service_orders.status = 'ENVOYE'` |
| 4 | Programmer l'intervention (date) | `service_orders.status = 'INTERVENTION_PROGRAMMEE'` |
| 5 | Clôturer l'OS | `service_orders.status = 'CLOTURE'` |

### Maintenance — Carnet d'entretien

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/maintenance/logbook` charge → liste visible | — |
| 2 | Ajouter intervention (type + date + prestataire + description) | Row dans `logbook_entries` |
| 3 | Filtrer par type → liste filtrée | — |

### Documents — GED

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/documents/ged` charge → liste visible | — |
| 2 | Uploader un PDF (titre + catégorie) | Row dans `documents` |
| 3 | Cliquer sur le document → modal prévisualisation s'ouvre | — |
| 4 | Archiver le document → badge statut change | `documents.status = 'archived'` |

### Communication — Messagerie privée

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/communication/messagerie-privee` charge → liste visible | — |
| 2 | Créer message (destinataire + sujet + corps) | Row dans `messages` |
| 3 | Ouvrir le message → contenu affiché | — |

### Communication — Mur communautaire

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/communication/mur` charge → posts visibles | — |
| 2 | Publier nouveau post (titre + contenu) | Row dans `wall_posts`, visible en tête de liste |
| 3 | Liker un post → compteur incrémenté | Row créée dans `wall_likes` |

### Communication — Événements

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/communication/evenements` charge → liste visible | — |
| 2 | Créer événement (titre + date + lieu) | Row dans `events`, visible en liste |

### Copropriétaires

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/coproprietaires` charge → liste avec noms et lots | — |
| 2 | Ouvrir fiche copropriétaire → informations affichées | — |
| 3 | Modifier un tantième → valeur sauvegardée | `lots.tantiemes` mis à jour |

### Ventes & Impayés

| # | Test | Vérification DB |
|---|------|-----------------|
| 1 | `/ventes-impayes/ventes` charge → liste visible | — |
| 2 | Créer nouvelle vente (lot + acquéreur) | Row dans `mutations` |
| 3 | Faire avancer workflow (étape 1 → 2) | `mutations.status` mis à jour + row dans `mutation_steps` |
| 4 | `/ventes-impayes/impayes` charge → liste impayés visible | — |

---

## Helpers partagés

```typescript
// Supabase admin client (service role — bypass RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Nettoyage générique par préfixe
async function cleanupByPrefix(table: string, column: string, prefix: string) {
  const supabase = getAdminClient();
  await supabase.from(table).delete().like(column, `${prefix}%`);
}

// Clear localStorage des clés ag-*
async function clearAgLocalStorage(page: Page) {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter(key => key.startsWith('ag-'))
      .forEach(key => localStorage.removeItem(key));
  });
}
```

---

## Gestion du cleanup

- `beforeAll` : nettoyer les données de test précédentes (par préfixe `E2E_ALL_`)
- `afterAll` : nettoyer les données créées durant le test
- Les IDs créés en test N sont stockés dans des variables de scope `describe` et réutilisés dans les tests suivants
- Les tests suivants utilisent `test.skip(!entityId, 'Requires entity from test N')` pour éviter les faux négatifs

---

## Données de test

Toutes les entités créées utilisent le préfixe `E2E_ALL_` + nom module + timestamp :
```
E2E_ALL_AG_1234567890
E2E_ALL_BUDGET_1234567890
E2E_ALL_CONTRAT_1234567890
...
```

---

## Exécution

```bash
# Lancer tous les tests
npm run test:e2e

# Lancer avec UI Playwright
npm run test:e2e:ui

# Lancer uniquement ce fichier
npx playwright test e2e/all-modules.spec.ts

# Lancer un describe spécifique
npx playwright test e2e/all-modules.spec.ts --grep "Maintenance — Contrats"
```
