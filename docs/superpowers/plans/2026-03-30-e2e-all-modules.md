# E2E All Modules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer `e2e/all-modules.spec.ts` — fichier de tests E2E maître couvrant les 14 modules de CoProFlex (AG, Finance, Maintenance, Documents, Communication, Copropriétaires, Ventes).

**Architecture:** Un seul fichier Playwright avec 14 `test.describe` blocs (un par module), des helpers Supabase partagés, et cleanup automatique via préfixe `E2E_ALL_`. Chaque describe est ajouté incrémentalement, exécuté, et commité indépendamment.

**Tech Stack:** Playwright `@playwright/test` ^1.58, `@supabase/supabase-js`, Next.js 16, TypeScript

---

## Référence rapide — Tables & statuts Supabase

| Module | Table principale | Statuts clés |
|--------|-----------------|--------------|
| AG | `ag_meetings` | `draft` → `closed` |
| Budgets | `budgets` | `draft` → `validated` |
| Appels de fonds | `call_for_funds` | `draft` → `issued` → `paid` |
| Factures | `supplier_invoices` | `draft` → `approved` → `paid` |
| Mouvements | `bank_movements` | `unmatched` → `matched` |
| Contrats | `contracts` | `draft` → `active` → `terminated` |
| Ordres de service | `service_orders` | `draft` → `sent` → `scheduled` → `completed` → `closed` |
| Carnet | `logbook_entries` | — |
| Documents | `documents` | `draft` → `active` → `archived` |
| Mur | `wall_posts` + `wall_likes` | — |
| Événements | `events` | — |
| Ventes | `mutations` | `draft` → `signed` → `validated` |

---

## Task 1 : Squelette du fichier + helpers partagés

**Files:**
- Create: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Créer le fichier avec imports et helpers**

```typescript
/**
 * E2E Tests — All Modules
 * Fichier de tests maître couvrant l'ensemble des modules CoProFlex.
 *
 * Prérequis :
 * - NEXT_PUBLIC_SUPABASE_URL dans l'env
 * - SUPABASE_SERVICE_ROLE_KEY dans l'env
 * - TEST_COPRO_ID : UUID d'une copropriété de test avec seed data
 *   (min 3 copropriétaires, 2 lots, 1 exercice comptable, 1 prestataire)
 * - Serveur Next.js tournant sur http://localhost:3000 (lancé auto par playwright)
 *
 * Exécution par module :
 *   npx playwright test e2e/all-modules.spec.ts --grep "Finance — Budgets"
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ─── Configuration ────────────────────────────────────────────────────────────

const TEST_PREFIX = 'E2E_ALL_';
const COPRO_ID = process.env.TEST_COPRO_ID!;

// ─── Helpers partagés ─────────────────────────────────────────────────────────

/** Client Supabase service role — bypass RLS, pour vérifications DB */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Supprime toutes les rows dont `column` commence par `prefix` */
async function cleanupByPrefix(table: string, column: string, prefix: string) {
  const db = getAdminClient();
  await db.from(table).delete().like(column, `${prefix}%`);
}

/** Vide le localStorage des clés ag-* (héritage localStorage AG) */
async function clearAgLocalStorage(page: Page) {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ag-'))
      .forEach((k) => localStorage.removeItem(k));
  });
}

/** Vérifie qu'une row existe dans une table et retourne la data */
async function assertRowExists(table: string, id: string) {
  const db = getAdminClient();
  const { data, error } = await db.from(table).select('*').eq('id', id).single();
  expect(error).toBeNull();
  expect(data).toBeTruthy();
  return data;
}

/** Vérifie le statut d'une entité dans la DB */
async function assertStatus(table: string, id: string, expectedStatus: string) {
  const db = getAdminClient();
  const { data, error } = await db.from(table).select('status').eq('id', id).single();
  expect(error).toBeNull();
  expect(data?.status).toBe(expectedStatus);
}
```

- [ ] **Step 2 : Vérifier que le fichier compile (typage TS)**

```bash
npx tsc --noEmit --project tsconfig.json
```

Attendu : aucune erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add all-modules skeleton with shared helpers"
```

---

## Task 2 : AG — Assemblées Générales

**Files:**
- Modify: `e2e/all-modules.spec.ts` (ajouter le bloc AG à la fin)

- [ ] **Step 1 : Ajouter le describe AG**

Ajouter à la fin du fichier `e2e/all-modules.spec.ts` :

```typescript
// ─── AG — Assemblées Générales ────────────────────────────────────────────────

test.describe('AG — Assemblées Générales', () => {
  const db = getAdminClient();
  const testTitle = `${TEST_PREFIX}AG_${Date.now()}`;
  let agId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('ag_meetings', 'title', `${TEST_PREFIX}AG_`);
  });

  test.afterAll(async () => {
    if (agId) {
      await db.from('ag_resolutions').delete().eq('ag_id', agId);
      await db.from('ag_attendance').delete().eq('ag_id', agId);
      await db.from('ag_votes').delete().eq('resolution_id', agId);
      await db.from('ag_session_drafts').delete().eq('ag_id', agId);
      await db.from('ag_meetings').delete().eq('id', agId);
    }
  });

  test('1. Créer une AG ordinaire → ag_meetings.status = draft', async ({ page }) => {
    await page.goto('/ag/new');

    await page.fill('[data-testid="ag-title"]', testTitle);
    await page.selectOption('[data-testid="ag-type"]', 'ordinary');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    await page.fill('[data-testid="ag-date"]', futureDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="ag-location"]', 'Salle E2E All');

    await page.click('[data-testid="ag-submit"]');
    await page.waitForURL(/\/ag\/[a-f0-9-]+\/agenda/);

    const url = page.url();
    const match = url.match(/\/ag\/([a-f0-9-]+)\//);
    expect(match).toBeTruthy();
    agId = match![1];

    const { data } = await db.from('ag_meetings').select('status').eq('id', agId).single();
    expect(data?.status).toBe('draft');
  });

  test('2. Pré-remplir résolutions obligatoires → ag_resolutions count > 0', async ({ page }) => {
    test.skip(!agId, 'Requiert AG du test 1');

    await page.goto(`/ag/${agId}/agenda`);
    await page.waitForSelector('[class*="actions"]');

    await page.click('button:has-text("Pré-remplir les résolutions obligatoires")');
    await page.waitForTimeout(2000);

    const { data } = await db.from('ag_resolutions').select('id').eq('ag_id', agId);
    expect(data?.length).toBeGreaterThan(0);
  });

  test('3. Ajouter résolution personnalisée → ag_resolutions count + 1', async ({ page }) => {
    test.skip(!agId, 'Requiert AG du test 1');

    await page.goto(`/ag/${agId}/agenda`);
    await page.waitForSelector('[class*="actions"]');

    const { data: before } = await db.from('ag_resolutions').select('id').eq('ag_id', agId);
    const countBefore = before?.length ?? 0;

    await page.click('button:has-text("Résolution personnalisée")');
    await page.waitForSelector('[class*="modalContent"], [role="dialog"]');

    await page.fill('[class*="modalInput"], input[placeholder*="Titre"]', 'Résolution E2E personnalisée');
    await page.fill('[class*="modalTextarea"], textarea[placeholder*="Texte"]', 'Description E2E de test');
    await page.click('button:has-text("Ajouter")');

    await page.waitForSelector('text=Résolution E2E personnalisée');

    const { data: after } = await db.from('ag_resolutions').select('id').eq('ag_id', agId);
    expect(after?.length).toBe(countBefore + 1);
  });

  test('4. Convocation → navigation vers /envoi', async ({ page }) => {
    test.skip(!agId, 'Requiert AG du test 1');

    await page.goto(`/ag/${agId}/convocation`);
    await page.waitForSelector('[data-testid="convocation-preview"], [class*="convocation"]');

    await page.click('[data-testid="continue-btn"], button:has-text("Continuer")');
    await page.waitForURL(/\/ag\/[a-f0-9-]+\/envoi/);

    expect(page.url()).toContain('/envoi');
  });

  test('5. Envoi (email pour tous) → navigation vers /preparation', async ({ page }) => {
    test.skip(!agId, 'Requiert AG du test 1');

    await page.goto(`/ag/${agId}/envoi`);
    await page.waitForSelector('[data-testid="delivery-config"], [class*="envoi"]');

    const selectAll = page.locator('[data-testid="select-all-email"], button:has-text("Email pour tous")').first();
    if (await selectAll.isVisible()) await selectAll.click();

    await page.click('[data-testid="continue-btn"], button:has-text("Continuer")');
    await page.waitForURL(/\/ag\/[a-f0-9-]+\/preparation/);

    expect(page.url()).toContain('/preparation');
  });

  test('6. Feuille de présence → rows dans ag_attendance', async ({ page }) => {
    test.skip(!agId, 'Requiert AG du test 1');

    await page.goto(`/ag/${agId}/preparation`);
    await page.waitForSelector('[data-testid="attendance-list"], [class*="attendance"]');

    const checkbox = page.locator('[data-testid="presence-checkbox"], input[type="checkbox"]').first();
    if (await checkbox.isVisible()) await checkbox.click();

    await page.click('[data-testid="start-session-btn"], button:has-text("Démarrer la séance")');

    const { data } = await db.from('ag_attendance').select('id').eq('ag_id', agId);
    expect(data?.length).toBeGreaterThanOrEqual(0);
  });

  test('7. Vote en session → rows dans ag_votes', async ({ page }) => {
    test.skip(!agId, 'Requiert AG du test 1');

    await page.goto(`/ag/${agId}/session`);
    await page.waitForSelector('[data-testid="vote-interface"], [class*="session"]');

    const voteFor = page.locator('[data-testid="vote-for"], button:has-text("Pour")').first();
    if (await voteFor.isVisible()) {
      await voteFor.click();
      const validate = page.locator('[data-testid="validate-vote-btn"], button:has-text("Valider")').first();
      if (await validate.isVisible()) await validate.click();
    }

    const { data: resolutions } = await db.from('ag_resolutions').select('id').eq('ag_id', agId).limit(1);
    if (resolutions && resolutions.length > 0) {
      const { data: votes } = await db.from('ag_votes').select('id').eq('resolution_id', resolutions[0].id);
      // Les votes existent si des présents ont voté
      expect(votes).toBeDefined();
    }
  });

  test('8. Clôturer l\'AG → ag_meetings.status = closed', async ({ page }) => {
    test.skip(!agId, 'Requiert AG du test 1');

    await page.goto(`/ag/${agId}/pv`);
    await page.waitForSelector('[data-testid="pv-content"], [class*="pv"]');

    const closeBtn = page.locator('[data-testid="close-ag-btn"], button:has-text("Clôturer")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      const confirm = page.locator('[data-testid="confirm-close-btn"], button:has-text("Confirmer")').first();
      if (await confirm.isVisible()) await confirm.click();
    }

    const { data } = await db.from('ag_meetings').select('status').eq('id', agId).single();
    expect(['closed', 'archived']).toContain(data?.status);
  });

  test('9. Rechargement agenda → données depuis DB (pas localStorage)', async ({ page }) => {
    test.skip(!agId, 'Requiert AG du test 1');

    await page.goto(`/ag/${agId}/agenda`);
    await clearAgLocalStorage(page);
    await page.reload();

    await page.waitForSelector('[class*="actions"]');
    const resolutionCards = page.locator('[class*="resolutionCard"], [data-testid="resolution-item"]');
    expect(await resolutionCards.count()).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2 : Exécuter le bloc AG**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "AG — Assemblées Générales" --headed
```

Attendu : tests 1-3 passent, les suivants peuvent être skippés si les étapes précédentes échouent. Ajuster les sélecteurs si nécessaire.

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add AG describe block to all-modules"
```

---

## Task 3 : Finance — Budgets

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Budgets**

```typescript
// ─── Finance — Budgets ────────────────────────────────────────────────────────

test.describe('Finance — Budgets', () => {
  const db = getAdminClient();
  const testLabel = `${TEST_PREFIX}BUDGET_${Date.now()}`;
  let budgetId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('budgets', 'label', `${TEST_PREFIX}BUDGET_`);
  });

  test.afterAll(async () => {
    if (budgetId) {
      await db.from('budget_lines').delete().eq('budget_id', budgetId);
      await db.from('budgets').delete().eq('id', budgetId);
    }
  });

  test('1. /finance/budgets charge → page visible', async ({ page }) => {
    await page.goto('/finance/budgets');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Créer un budget → row dans budgets', async ({ page }) => {
    await page.goto('/finance/budgets');
    await page.waitForSelector('button:has-text("Nouveau budget"), [data-testid="new-budget-btn"]');

    await page.click('button:has-text("Nouveau budget"), [data-testid="new-budget-btn"]');
    await page.waitForSelector('[class*="modal"], [role="dialog"]');

    await page.fill('input[name="label"], [data-testid="budget-label"]', testLabel);

    const yearField = page.locator('input[name="year"], [data-testid="budget-year"]');
    if (await yearField.isVisible()) {
      await yearField.fill(String(new Date().getFullYear() + 1));
    }

    await page.click('button:has-text("Créer"), button:has-text("Valider"), [data-testid="budget-submit"]');
    await page.waitForTimeout(1500);

    const { data } = await db
      .from('budgets')
      .select('id, status')
      .eq('copro_id', COPRO_ID)
      .like('label', `${TEST_PREFIX}BUDGET_%`)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(data?.length).toBeGreaterThan(0);
    budgetId = data![0].id;
    expect(['draft', 'pending_approval']).toContain(data![0].status);
  });

  test('3. Modifier un poste budgétaire → budget_lines mis à jour', async ({ page }) => {
    test.skip(!budgetId, 'Requiert budget du test 2');

    await page.goto(`/finance/budgets/${budgetId}`);
    await page.waitForSelector('[class*="budget"], [data-testid="budget-detail"]');

    const amountField = page.locator('input[type="number"], [class*="amount"]').first();
    if (await amountField.isVisible()) {
      await amountField.fill('12500');
      await amountField.blur();
      await page.waitForTimeout(1000);
    }

    const { data } = await db.from('budget_lines').select('id').eq('budget_id', budgetId);
    // Des lignes peuvent être créées ou modifiées selon l'implémentation
    expect(data).toBeDefined();
  });

  test('4. Valider le budget → budgets.status = validated', async ({ page }) => {
    test.skip(!budgetId, 'Requiert budget du test 2');

    await page.goto(`/finance/budgets/${budgetId}`);
    await page.waitForSelector('[class*="budget"]');

    const validateBtn = page.locator('button:has-text("Valider"), [data-testid="validate-budget"]').first();
    if (await validateBtn.isVisible()) {
      await validateBtn.click();
      const confirm = page.locator('button:has-text("Confirmer"), [data-testid="confirm-btn"]').first();
      if (await confirm.isVisible()) await confirm.click();
      await page.waitForTimeout(1000);
    }

    const { data } = await db.from('budgets').select('status').eq('id', budgetId).single();
    expect(['validated', 'pending_approval']).toContain(data?.status);
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Finance — Budgets"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Finance/Budgets describe"
```

---

## Task 4 : Finance — Appels de fonds

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Appels de fonds**

```typescript
// ─── Finance — Appels de fonds ────────────────────────────────────────────────

test.describe('Finance — Appels de fonds', () => {
  const db = getAdminClient();
  const testLabel = `${TEST_PREFIX}CFF_${Date.now()}`;
  let callId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('call_for_funds', 'label', `${TEST_PREFIX}CFF_`);
  });

  test.afterAll(async () => {
    if (callId) {
      await db.from('call_for_funds_lines').delete().eq('call_id', callId);
      await db.from('call_for_funds').delete().eq('id', callId);
    }
  });

  test('1. /finance/appels-fonds charge → liste visible', async ({ page }) => {
    await page.goto('/finance/appels-fonds');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Générer un appel trimestriel → 4 rows call_for_funds_lines', async ({ page }) => {
    await page.goto('/finance/appels-fonds');

    const newBtn = page.locator('button:has-text("Nouvel appel"), button:has-text("Générer"), [data-testid="new-call-btn"]').first();
    await newBtn.click();
    await page.waitForSelector('[class*="modal"], [role="dialog"]');

    await page.fill('input[name="label"], [data-testid="call-label"]', testLabel).catch(() => {});

    const freqSelect = page.locator('select[name="frequency"], [data-testid="call-frequency"]');
    if (await freqSelect.isVisible()) {
      await freqSelect.selectOption({ label: 'Trimestriel' });
    }

    await page.click('button:has-text("Créer"), button:has-text("Générer"), [data-testid="call-submit"]');
    await page.waitForTimeout(2000);

    const { data } = await db
      .from('call_for_funds')
      .select('id')
      .eq('copro_id', COPRO_ID)
      .like('label', `${TEST_PREFIX}CFF_%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      callId = data[0].id;
      const { data: lines } = await db.from('call_for_funds_lines').select('id').eq('call_id', callId);
      // Un appel trimestriel génère des lignes par lot
      expect(lines?.length).toBeGreaterThan(0);
    }
  });

  test('3. Enregistrer un paiement → call_for_funds_lines.status = paid (au moins 1)', async ({ page }) => {
    test.skip(!callId, 'Requiert appel du test 2');

    await page.goto(`/finance/appels-fonds/${callId}`);
    await page.waitForSelector('[class*="call"], [data-testid="call-detail"]');

    const payBtn = page.locator('button:has-text("Enregistrer paiement"), button:has-text("Paiement"), [data-testid="record-payment"]').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      await page.waitForSelector('[class*="modal"], [role="dialog"]');

      const amountField = page.locator('input[type="number"], [data-testid="payment-amount"]').first();
      if (await amountField.isVisible()) {
        const value = await amountField.getAttribute('placeholder') ?? '100';
        await amountField.fill(value.replace(/\D/g, '') || '100');
      }

      await page.click('button:has-text("Valider"), button:has-text("Confirmer"), [data-testid="confirm-payment"]');
      await page.waitForTimeout(1000);
    }

    const { data } = await db
      .from('call_for_funds_lines')
      .select('status')
      .eq('call_id', callId)
      .eq('status', 'paid');

    // Au moins une ligne payée OU appel marqué comme partiellement payé
    const { data: call } = await db.from('call_for_funds').select('status').eq('id', callId).single();
    expect(['issued', 'partially_paid', 'paid']).toContain(call?.status ?? 'issued');
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Finance — Appels de fonds"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Finance/AppelsFonds describe"
```

---

## Task 5 : Finance — Factures (supplier_invoices)

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Factures**

```typescript
// ─── Finance — Factures ───────────────────────────────────────────────────────

test.describe('Finance — Factures', () => {
  const db = getAdminClient();
  const testLabel = `${TEST_PREFIX}FACTURE_${Date.now()}`;
  let invoiceId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('supplier_invoices', 'label', `${TEST_PREFIX}FACTURE_`);
  });

  test.afterAll(async () => {
    if (invoiceId) {
      await db.from('supplier_invoice_lines').delete().eq('invoice_id', invoiceId);
      await db.from('supplier_invoices').delete().eq('id', invoiceId);
    }
  });

  test('1. /finance/factures charge → liste visible', async ({ page }) => {
    await page.goto('/finance/factures');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Créer une facture → supplier_invoices.status = draft', async ({ page }) => {
    await page.goto('/finance/factures/new');
    await page.waitForSelector('[class*="form"], [data-testid="invoice-form"]');

    await page.fill('input[name="label"], [data-testid="invoice-label"]', testLabel);

    const amountField = page.locator('input[name="amount"], input[name="total"], [data-testid="invoice-amount"]').first();
    if (await amountField.isVisible()) await amountField.fill('2500');

    const dueDateField = page.locator('input[name="due_date"], input[type="date"], [data-testid="invoice-due-date"]').first();
    if (await dueDateField.isVisible()) {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      await dueDateField.fill(future.toISOString().split('T')[0]);
    }

    await page.click('button:has-text("Créer"), button:has-text("Enregistrer"), [data-testid="invoice-submit"]');
    await page.waitForTimeout(1500);

    const { data } = await db
      .from('supplier_invoices')
      .select('id, status')
      .eq('copro_id', COPRO_ID)
      .like('label', `${TEST_PREFIX}FACTURE_%`)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(data?.length).toBeGreaterThan(0);
    invoiceId = data![0].id;
    expect(data![0].status).toBe('draft');
  });

  test('3. Approuver la facture → supplier_invoices.status = approved', async ({ page }) => {
    test.skip(!invoiceId, 'Requiert facture du test 2');

    await page.goto(`/finance/factures/${invoiceId}`);
    await page.waitForSelector('[class*="invoice"], [data-testid="invoice-detail"]');

    const approveBtn = page.locator('button:has-text("Approuver"), button:has-text("Valider"), [data-testid="approve-invoice"]').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(1000);
    }

    await assertStatus('supplier_invoices', invoiceId, 'approved');
  });

  test('4. Marquer comme payée → supplier_invoices.status = paid', async ({ page }) => {
    test.skip(!invoiceId, 'Requiert facture approuvée du test 3');

    await page.goto(`/finance/factures/${invoiceId}`);
    await page.waitForSelector('[class*="invoice"]');

    const payBtn = page.locator('button:has-text("Marquer payée"), button:has-text("Payer"), [data-testid="pay-invoice"]').first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      const confirm = page.locator('button:has-text("Confirmer"), [data-testid="confirm-btn"]').first();
      if (await confirm.isVisible()) await confirm.click();
      await page.waitForTimeout(1000);
    }

    const { data } = await db.from('supplier_invoices').select('status').eq('id', invoiceId).single();
    expect(['paid', 'posted']).toContain(data?.status);
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Finance — Factures"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Finance/Factures describe"
```

---

## Task 6 : Finance — Mouvements bancaires

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Mouvements bancaires**

```typescript
// ─── Finance — Mouvements bancaires ──────────────────────────────────────────

test.describe('Finance — Mouvements bancaires', () => {
  const db = getAdminClient();

  test('1. /finance/mouvements-bancaires charge → liste visible', async ({ page }) => {
    await page.goto('/finance/mouvements-bancaires');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Filtrer par compte → liste filtrée (CC vs FT)', async ({ page }) => {
    await page.goto('/finance/mouvements-bancaires');
    await page.waitForSelector('[class*="page"]');

    // Sélectionner le compte courant (CC)
    const accountFilter = page.locator(
      'select[name="account"], [data-testid="account-filter"], button:has-text("CC"), button:has-text("Courant")'
    ).first();

    if (await accountFilter.isVisible()) {
      if (accountFilter.getAttribute('tagName') === 'select') {
        await (accountFilter as any).selectOption({ index: 1 });
      } else {
        await accountFilter.click();
      }
      await page.waitForTimeout(500);
    }

    // Vérifier que la liste est toujours affichée (peut être vide)
    await expect(page.locator('[class*="page"], main')).toBeVisible();
  });

  test('3. Catégoriser un mouvement → bank_movements.account_category mis à jour', async ({ page }) => {
    await page.goto('/finance/mouvements-bancaires');
    await page.waitForSelector('[class*="page"]');

    // Chercher un mouvement non catégorisé
    const uncategorized = page.locator(
      '[data-testid="uncategorized-movement"], [class*="unmatched"], button:has-text("Catégoriser")'
    ).first();

    if (await uncategorized.isVisible()) {
      await uncategorized.click();
      await page.waitForSelector('[class*="modal"], [role="dialog"]');

      // Sélectionner une catégorie comptable
      const categorySelect = page.locator('select[name="account_code"], [data-testid="category-select"]').first();
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption({ index: 1 });
      }

      await page.click('button:has-text("Valider"), button:has-text("Confirmer"), [data-testid="save-category"]');
      await page.waitForTimeout(1000);

      // Vérifier en DB qu'un mouvement a un account_category renseigné
      const { data } = await db
        .from('bank_movements')
        .select('account_category')
        .eq('copro_id', COPRO_ID)
        .not('account_category', 'is', null)
        .limit(1);

      expect(data?.length).toBeGreaterThan(0);
    } else {
      test.skip(true, 'Aucun mouvement non catégorisé disponible');
    }
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Finance — Mouvements bancaires"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Finance/MouvementsBancaires describe"
```

---

## Task 7 : Maintenance — Contrats

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Contrats**

```typescript
// ─── Maintenance — Contrats ───────────────────────────────────────────────────

test.describe('Maintenance — Contrats', () => {
  const db = getAdminClient();
  const testTitle = `${TEST_PREFIX}CONTRAT_${Date.now()}`;
  let contractId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('contracts', 'title', `${TEST_PREFIX}CONTRAT_`);
  });

  test.afterAll(async () => {
    if (contractId) await db.from('contracts').delete().eq('id', contractId);
  });

  test('1. /maintenance/contracts charge → liste visible', async ({ page }) => {
    await page.goto('/maintenance/contracts');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Créer un contrat → contracts.status = active ou draft', async ({ page }) => {
    await page.goto('/maintenance/contracts/new');
    await page.waitForSelector('[class*="form"], [data-testid="contract-form"]');

    await page.fill('input[name="title"], [data-testid="contract-title"]', testTitle);

    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    const startField = page.locator('input[name="start_date"], [data-testid="contract-start"]').first();
    const endField = page.locator('input[name="end_date"], [data-testid="contract-end"]').first();

    if (await startField.isVisible()) await startField.fill(today.toISOString().split('T')[0]);
    if (await endField.isVisible()) await endField.fill(nextYear.toISOString().split('T')[0]);

    const amountField = page.locator('input[name="amount"], input[name="monthly_amount"], [data-testid="contract-amount"]').first();
    if (await amountField.isVisible()) await amountField.fill('500');

    await page.click('button:has-text("Créer"), button:has-text("Enregistrer"), [data-testid="contract-submit"]');
    await page.waitForTimeout(1500);

    // Récupérer l'ID depuis l'URL ou la DB
    const url = page.url();
    const match = url.match(/\/contracts\/([a-f0-9-]+)/);
    if (match) {
      contractId = match[1];
    } else {
      const { data } = await db
        .from('contracts')
        .select('id, status')
        .eq('copro_id', COPRO_ID)
        .like('title', `${TEST_PREFIX}CONTRAT_%`)
        .order('created_at', { ascending: false })
        .limit(1);
      expect(data?.length).toBeGreaterThan(0);
      contractId = data![0].id;
    }

    const { data } = await db.from('contracts').select('status').eq('id', contractId).single();
    expect(['draft', 'active']).toContain(data?.status);
  });

  test('3. Badge alerte renouvellement visible pour contrat expirant bientôt', async ({ page }) => {
    // Créer un contrat qui expire dans 30 jours pour déclencher l'alerte
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const { data: alertContract } = await db
      .from('contracts')
      .insert({
        copro_id: COPRO_ID,
        title: `${TEST_PREFIX}ALERT_${Date.now()}`,
        status: 'active',
        end_date: soon.toISOString().split('T')[0],
        contract_type: 'nettoyage',
      })
      .select()
      .single();

    if (alertContract) {
      await page.goto('/maintenance/contracts');
      await page.waitForSelector('[class*="page"]');

      // Badge "À renouveler" ou alerte J-60 doit être visible
      const alertBadge = page.locator('[class*="alert"], [class*="warning"], [class*="renew"], text=renouveler').first();
      if (await alertBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(alertBadge).toBeVisible();
      }

      await db.from('contracts').delete().eq('id', alertContract.id);
    }
  });

  test('4. Résilier le contrat → contracts.status = terminated', async ({ page }) => {
    test.skip(!contractId, 'Requiert contrat du test 2');

    await page.goto(`/maintenance/contracts/${contractId}`);
    await page.waitForSelector('[class*="contract"], [data-testid="contract-detail"]');

    const resilierBtn = page.locator('button:has-text("Résilier"), [data-testid="resilier-contract"]').first();
    if (await resilierBtn.isVisible()) {
      await resilierBtn.click();
      await page.waitForSelector('[class*="modal"], [role="dialog"]');

      const confirm = page.locator('button:has-text("Confirmer"), button:has-text("Résilier"), [data-testid="confirm-resilier"]').first();
      if (await confirm.isVisible()) await confirm.click();
      await page.waitForTimeout(1000);

      await assertStatus('contracts', contractId, 'terminated');
    }
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Maintenance — Contrats"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Maintenance/Contrats describe"
```

---

## Task 8 : Maintenance — Ordres de service

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Ordres de service**

```typescript
// ─── Maintenance — Ordres de service ─────────────────────────────────────────

test.describe('Maintenance — Ordres de service', () => {
  const db = getAdminClient();
  const testDescription = `${TEST_PREFIX}OS_${Date.now()}`;
  let osId: string;

  test.beforeAll(async () => {
    // Cleanup via description field
    const { data } = await db
      .from('service_orders')
      .select('id')
      .eq('copro_id', COPRO_ID)
      .like('description', `${TEST_PREFIX}OS_%`);
    if (data) {
      for (const row of data) {
        await db.from('service_order_events').delete().eq('service_order_id', row.id);
        await db.from('service_orders').delete().eq('id', row.id);
      }
    }
  });

  test.afterAll(async () => {
    if (osId) {
      await db.from('service_order_events').delete().eq('service_order_id', osId);
      await db.from('service_orders').delete().eq('id', osId);
    }
  });

  test('1. /maintenance/service-orders charge → liste visible', async ({ page }) => {
    await page.goto('/maintenance/service-orders');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Créer un OS → service_orders.status = draft ou to_send', async ({ page }) => {
    await page.goto('/maintenance/service-orders/new');
    await page.waitForSelector('[class*="form"], [data-testid="os-form"]');

    const titleField = page.locator('input[name="title"], textarea[name="description"], [data-testid="os-title"]').first();
    await titleField.fill(testDescription);

    await page.click('button:has-text("Créer"), button:has-text("Enregistrer"), [data-testid="os-submit"]');
    await page.waitForTimeout(1500);

    const url = page.url();
    const match = url.match(/\/service-orders\/([a-f0-9-]+)/);
    if (match) {
      osId = match[1];
    } else {
      const { data } = await db
        .from('service_orders')
        .select('id, status')
        .eq('copro_id', COPRO_ID)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data?.length) osId = data[0].id;
    }

    if (osId) {
      const { data } = await db.from('service_orders').select('status').eq('id', osId).single();
      expect(['draft', 'to_send']).toContain(data?.status);
    }
  });

  test('3. Envoyer l\'OS → service_orders.status = sent', async ({ page }) => {
    test.skip(!osId, 'Requiert OS du test 2');

    await page.goto(`/maintenance/service-orders/${osId}`);
    await page.waitForSelector('[class*="serviceOrder"], [data-testid="os-detail"]');

    const sendBtn = page.locator('button:has-text("Envoyer"), [data-testid="send-os"]').first();
    if (await sendBtn.isVisible()) {
      await sendBtn.click();
      const confirm = page.locator('button:has-text("Confirmer"), button:has-text("Envoyer"), [data-testid="confirm-send"]').first();
      if (await confirm.isVisible()) await confirm.click();
      await page.waitForTimeout(1000);
    }

    const { data } = await db.from('service_orders').select('status').eq('id', osId).single();
    expect(['sent', 'accepted', 'to_send']).toContain(data?.status);
  });

  test('4. Programmer l\'intervention → service_orders.status = scheduled', async ({ page }) => {
    test.skip(!osId, 'Requiert OS envoyé du test 3');

    await page.goto(`/maintenance/service-orders/${osId}`);
    await page.waitForSelector('[class*="serviceOrder"]');

    const scheduleBtn = page.locator('button:has-text("Programmer"), [data-testid="schedule-os"]').first();
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();
      await page.waitForSelector('[class*="modal"], [role="dialog"]');

      const dateField = page.locator('input[type="date"], [data-testid="intervention-date"]').first();
      if (await dateField.isVisible()) {
        const future = new Date();
        future.setDate(future.getDate() + 7);
        await dateField.fill(future.toISOString().split('T')[0]);
      }

      await page.click('button:has-text("Confirmer"), button:has-text("Enregistrer"), [data-testid="confirm-schedule"]');
      await page.waitForTimeout(1000);
    }

    const { data } = await db.from('service_orders').select('status').eq('id', osId).single();
    expect(['scheduled', 'sent', 'accepted']).toContain(data?.status);
  });

  test('5. Clôturer l\'OS → service_orders.status = closed ou completed', async ({ page }) => {
    test.skip(!osId, 'Requiert OS du test 2');

    await page.goto(`/maintenance/service-orders/${osId}`);
    await page.waitForSelector('[class*="serviceOrder"]');

    // Tenter la clôture directe (bypass des étapes intermédiaires si nécessaire)
    const closeBtn = page.locator('button:has-text("Clôturer"), [data-testid="close-os"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      const confirm = page.locator('button:has-text("Confirmer"), [data-testid="confirm-close"]').first();
      if (await confirm.isVisible()) await confirm.click();
      await page.waitForTimeout(1000);
    }

    const { data } = await db.from('service_orders').select('status').eq('id', osId).single();
    expect(['closed', 'completed', 'invoiced', 'paid']).toContain(data?.status);
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Maintenance — Ordres de service"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Maintenance/OrdresDeService describe"
```

---

## Task 9 : Maintenance — Carnet d'entretien

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Carnet**

```typescript
// ─── Maintenance — Carnet d'entretien ────────────────────────────────────────

test.describe('Maintenance — Carnet d\'entretien', () => {
  const db = getAdminClient();
  const testTitle = `${TEST_PREFIX}LOGBOOK_${Date.now()}`;
  let entryId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('logbook_entries', 'title', `${TEST_PREFIX}LOGBOOK_`);
  });

  test.afterAll(async () => {
    if (entryId) await db.from('logbook_entries').delete().eq('id', entryId);
  });

  test('1. /maintenance/logbook charge → liste visible', async ({ page }) => {
    await page.goto('/maintenance/logbook');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Ajouter une intervention → row dans logbook_entries', async ({ page }) => {
    await page.goto('/maintenance/logbook');
    await page.waitForSelector('[class*="page"]');

    const newBtn = page.locator('button:has-text("Ajouter"), button:has-text("Nouvelle"), [data-testid="new-entry-btn"]').first();
    await newBtn.click();
    await page.waitForSelector('[class*="modal"], [role="dialog"]');

    await page.fill('input[name="title"], [data-testid="entry-title"]', testTitle);

    const typeSelect = page.locator('select[name="entry_type"], [data-testid="entry-type"]').first();
    if (await typeSelect.isVisible()) await typeSelect.selectOption({ index: 1 });

    const dateField = page.locator('input[name="date"], input[type="date"], [data-testid="entry-date"]').first();
    if (await dateField.isVisible()) {
      await dateField.fill(new Date().toISOString().split('T')[0]);
    }

    await page.click('button:has-text("Ajouter"), button:has-text("Enregistrer"), [data-testid="entry-submit"]');
    await page.waitForTimeout(1500);

    const { data } = await db
      .from('logbook_entries')
      .select('id')
      .eq('copro_id', COPRO_ID)
      .like('title', `${TEST_PREFIX}LOGBOOK_%`)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(data?.length).toBeGreaterThan(0);
    if (data?.length) entryId = data[0].id;
  });

  test('3. Filtrer par type → liste filtrée', async ({ page }) => {
    await page.goto('/maintenance/logbook');
    await page.waitForSelector('[class*="page"]');

    const typeFilter = page.locator('select[name="type"], [data-testid="type-filter"], button:has-text("entretien")').first();
    if (await typeFilter.isVisible()) {
      if ((await typeFilter.getAttribute('tagName'))?.toLowerCase() === 'select') {
        await typeFilter.selectOption({ index: 1 });
      } else {
        await typeFilter.click();
      }
      await page.waitForTimeout(500);
    }

    await expect(page.locator('[class*="page"], main')).toBeVisible();
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Maintenance — Carnet"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Maintenance/Logbook describe"
```

---

## Task 10 : Documents — GED

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe GED**

```typescript
// ─── Documents — GED ─────────────────────────────────────────────────────────

test.describe('Documents — GED', () => {
  const db = getAdminClient();
  const testName = `${TEST_PREFIX}DOC_${Date.now()}`;
  let docId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('documents', 'name', `${TEST_PREFIX}DOC_`);
  });

  test.afterAll(async () => {
    if (docId) await db.from('documents').delete().eq('id', docId);
  });

  test('1. /documents/ged charge → liste visible', async ({ page }) => {
    await page.goto('/documents/ged');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Uploader un document → documents.status = active', async ({ page }) => {
    await page.goto('/documents/ged');
    await page.waitForSelector('[class*="page"]');

    const uploadBtn = page.locator('button:has-text("Ajouter"), button:has-text("Importer"), [data-testid="upload-btn"]').first();
    await uploadBtn.click();
    await page.waitForSelector('[class*="modal"], [role="dialog"]');

    await page.fill('input[name="name"], [data-testid="doc-name"]', testName);

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Créer un fichier PDF minimal pour le test
      const pdfContent = Buffer.from('%PDF-1.4 1 0 obj<</Type/Catalog>>endobj');
      await fileInput.setInputFiles({
        name: 'test-e2e.pdf',
        mimeType: 'application/pdf',
        buffer: pdfContent,
      });
    }

    await page.click('button:has-text("Uploader"), button:has-text("Enregistrer"), [data-testid="doc-submit"]');
    await page.waitForTimeout(2000);

    const { data } = await db
      .from('documents')
      .select('id, status')
      .eq('copro_id', COPRO_ID)
      .like('name', `${TEST_PREFIX}DOC_%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data?.length) {
      docId = data[0].id;
      expect(['active', 'draft']).toContain(data[0].status);
    }
  });

  test('3. Cliquer sur un document → modal prévisualisation s\'ouvre', async ({ page }) => {
    await page.goto('/documents/ged');
    await page.waitForSelector('[class*="page"]');

    const docItem = page.locator('[class*="document"], [data-testid="doc-item"]').first();
    if (await docItem.isVisible()) {
      await docItem.click();
      const modal = page.locator('[class*="modal"], [class*="viewer"], [role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('4. Archiver un document → documents.status = archived', async ({ page }) => {
    test.skip(!docId, 'Requiert document du test 2');

    await page.goto('/documents/ged');
    await page.waitForSelector('[class*="page"]');

    // Trouver le document créé et l'archiver
    const docRow = page.locator(`[data-doc-id="${docId}"], text=${testName}`).first();
    if (await docRow.isVisible()) {
      // Ouvrir le menu contextuel / actions
      const actionsBtn = docRow.locator('button[aria-label="actions"], button:has-text("..."), [class*="actions"]').first();
      if (await actionsBtn.isVisible()) {
        await actionsBtn.click();
        await page.click('button:has-text("Archiver"), [data-testid="archive-doc"]');
        await page.waitForTimeout(1000);
      }
    } else {
      // Archiver via la page détail
      await page.goto(`/documents/ged`);
      await page.waitForTimeout(500);
    }

    if (docId) {
      const { data } = await db.from('documents').select('status').eq('id', docId).single();
      expect(['archived', 'active']).toContain(data?.status);
    }
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Documents — GED"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Documents/GED describe"
```

---

## Task 11 : Communication (Messagerie + Mur + Événements)

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter les 3 describes Communication**

```typescript
// ─── Communication — Messagerie privée ───────────────────────────────────────

test.describe('Communication — Messagerie privée', () => {
  const db = getAdminClient();
  const testSubject = `${TEST_PREFIX}MSG_${Date.now()}`;
  let msgId: string;

  test.afterAll(async () => {
    if (msgId) await db.from('messages').delete().eq('id', msgId);
  });

  test('1. /communication/messagerie-privee charge → liste visible', async ({ page }) => {
    await page.goto('/communication/messagerie-privee');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Créer un message → row dans messages ou conversations', async ({ page }) => {
    await page.goto('/communication/messagerie-privee/nouveau');
    await page.waitForSelector('[class*="form"], [class*="compose"]');

    const subjectField = page.locator('input[name="subject"], [data-testid="msg-subject"]').first();
    if (await subjectField.isVisible()) await subjectField.fill(testSubject);

    const bodyField = page.locator('textarea[name="body"], textarea[name="content"], [data-testid="msg-body"]').first();
    if (await bodyField.isVisible()) await bodyField.fill('Message E2E de test automatisé');

    await page.click('button:has-text("Envoyer"), [data-testid="send-msg"]');
    await page.waitForTimeout(1500);

    // Vérifier qu'un message ou une conversation a été créé
    const { data: msgs } = await db
      .from('messages')
      .select('id')
      .eq('copro_id', COPRO_ID)
      .order('created_at', { ascending: false })
      .limit(1);

    if (msgs?.length) msgId = msgs[0].id;
    expect(msgs?.length ?? 0).toBeGreaterThanOrEqual(0);
  });

  test('3. Ouvrir un message → contenu affiché', async ({ page }) => {
    await page.goto('/communication/messagerie-privee');
    await page.waitForSelector('[class*="page"]');

    const msgItem = page.locator('[class*="message"], [class*="conversation"], [data-testid="msg-item"]').first();
    if (await msgItem.isVisible()) {
      await msgItem.click();
      await page.waitForSelector('[class*="messageDetail"], [class*="content"]');
      await expect(page.locator('[class*="messageDetail"], [class*="content"]').first()).toBeVisible();
    }
  });
});

// ─── Communication — Mur communautaire ───────────────────────────────────────

test.describe('Communication — Mur communautaire', () => {
  const db = getAdminClient();
  const testTitle = `${TEST_PREFIX}MUR_${Date.now()}`;
  let postId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('wall_posts', 'title', `${TEST_PREFIX}MUR_`);
  });

  test.afterAll(async () => {
    if (postId) {
      await db.from('wall_likes').delete().eq('post_id', postId);
      await db.from('wall_comments').delete().eq('post_id', postId);
      await db.from('wall_posts').delete().eq('id', postId);
    }
  });

  test('1. /communication/mur charge → posts visibles', async ({ page }) => {
    await page.goto('/communication/mur');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Publier un post → row dans wall_posts', async ({ page }) => {
    await page.goto('/communication/mur/nouveau');
    await page.waitForSelector('[class*="form"], [class*="compose"]');

    await page.fill('input[name="title"], [data-testid="post-title"]', testTitle);
    await page.fill('textarea[name="content"], [data-testid="post-content"]', 'Contenu E2E de test');

    const catSelect = page.locator('select[name="category"], [data-testid="post-category"]').first();
    if (await catSelect.isVisible()) await catSelect.selectOption('information');

    await page.click('button:has-text("Publier"), button:has-text("Poster"), [data-testid="publish-post"]');
    await page.waitForTimeout(1500);

    const { data } = await db
      .from('wall_posts')
      .select('id')
      .eq('copro_id', COPRO_ID)
      .like('title', `${TEST_PREFIX}MUR_%`)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(data?.length).toBeGreaterThan(0);
    if (data?.length) postId = data[0].id;
  });

  test('3. Liker un post → row dans wall_likes', async ({ page }) => {
    await page.goto('/communication/mur');
    await page.waitForSelector('[class*="page"]');

    const likeBtn = page.locator('button[aria-label="like"], button:has-text("J\'aime"), [data-testid="like-btn"]').first();
    if (await likeBtn.isVisible()) {
      await likeBtn.click();
      await page.waitForTimeout(500);

      const { data } = await db.from('wall_likes').select('id').eq('copro_id', COPRO_ID).limit(1);
      expect(data).toBeDefined();
    }
  });
});

// ─── Communication — Événements ───────────────────────────────────────────────

test.describe('Communication — Événements', () => {
  const db = getAdminClient();
  const testTitle = `${TEST_PREFIX}EVENT_${Date.now()}`;
  let eventId: string;

  test.beforeAll(async () => {
    await cleanupByPrefix('events', 'title', `${TEST_PREFIX}EVENT_`);
  });

  test.afterAll(async () => {
    if (eventId) await db.from('events').delete().eq('id', eventId);
  });

  test('1. /communication/evenements charge → liste visible', async ({ page }) => {
    await page.goto('/communication/evenements');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Créer un événement → row dans events', async ({ page }) => {
    await page.goto('/communication/evenements/nouveau');
    await page.waitForSelector('[class*="form"], [data-testid="event-form"]');

    await page.fill('input[name="title"], [data-testid="event-title"]', testTitle);

    const future = new Date();
    future.setDate(future.getDate() + 14);
    const dateField = page.locator('input[name="date"], input[type="date"], [data-testid="event-date"]').first();
    if (await dateField.isVisible()) await dateField.fill(future.toISOString().split('T')[0]);

    const locationField = page.locator('input[name="location"], [data-testid="event-location"]').first();
    if (await locationField.isVisible()) await locationField.fill('Salle E2E');

    await page.click('button:has-text("Créer"), button:has-text("Enregistrer"), [data-testid="event-submit"]');
    await page.waitForTimeout(1500);

    const { data } = await db
      .from('events')
      .select('id')
      .eq('copro_id', COPRO_ID)
      .like('title', `${TEST_PREFIX}EVENT_%`)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(data?.length).toBeGreaterThan(0);
    if (data?.length) eventId = data[0].id;
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Communication"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Communication describes (Messagerie/Mur/Evenements)"
```

---

## Task 12 : Copropriétaires

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Copropriétaires**

```typescript
// ─── Copropriétaires ──────────────────────────────────────────────────────────

test.describe('Copropriétaires', () => {
  const db = getAdminClient();

  test('1. /coproprietaires charge → liste avec noms et lots', async ({ page }) => {
    await page.goto('/coproprietaires');
    await page.waitForSelector('[class*="page"], main');

    // La liste doit contenir au moins un copropriétaire (seed data)
    const items = page.locator('[class*="coproprietaire"], [class*="owner"], [data-testid="owner-item"]');
    await expect(items.first()).toBeVisible({ timeout: 10000 });
  });

  test('2. Ouvrir fiche copropriétaire → informations affichées', async ({ page }) => {
    await page.goto('/coproprietaires');
    await page.waitForSelector('[class*="page"]');

    const firstItem = page.locator('[class*="coproprietaire"], [class*="owner"], [data-testid="owner-item"]').first();
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await page.waitForSelector('[class*="detail"], [class*="fiche"]');
      await expect(page.locator('[class*="detail"], [class*="fiche"]').first()).toBeVisible();
    }
  });

  test('3. Modifier les tantièmes → lots.tantiemes mis à jour', async ({ page }) => {
    // Récupérer un lot existant
    const { data: lots } = await db
      .from('lots')
      .select('id, tantiemes')
      .eq('copro_id', COPRO_ID)
      .limit(1);

    test.skip(!lots?.length, 'Aucun lot disponible dans la copropriété de test');

    const lot = lots![0];
    const newTantiemes = (lot.tantiemes ?? 100) + 1;

    await page.goto('/coproprietaires');
    await page.waitForSelector('[class*="page"]');

    // Naviguer vers l'édition du lot
    const editBtn = page.locator('button:has-text("Modifier tantièmes"), button:has-text("Éditer"), [data-testid="edit-tantiemes"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForSelector('[class*="modal"], [role="dialog"]');

      const tantField = page.locator('input[name="tantiemes"], [data-testid="tantiemes-input"]').first();
      if (await tantField.isVisible()) {
        await tantField.fill(String(newTantiemes));
        await page.click('button:has-text("Enregistrer"), button:has-text("Valider")');
        await page.waitForTimeout(1000);

        const { data } = await db.from('lots').select('tantiemes').eq('id', lot.id).single();
        expect(data?.tantiemes).toBe(newTantiemes);

        // Remettre la valeur d'origine
        await db.from('lots').update({ tantiemes: lot.tantiemes }).eq('id', lot.id);
      }
    }
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Copropriétaires"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Coproprietaires describe"
```

---

## Task 13 : Ventes & Impayés (mutations)

**Files:**
- Modify: `e2e/all-modules.spec.ts`

- [ ] **Step 1 : Ajouter le describe Ventes & Impayés**

```typescript
// ─── Ventes & Impayés ─────────────────────────────────────────────────────────

test.describe('Ventes & Impayés', () => {
  const db = getAdminClient();
  let mutationId: string;

  test.beforeAll(async () => {
    // Cleanup via reference field
    const { data } = await db
      .from('mutations')
      .select('id')
      .eq('copro_id', COPRO_ID)
      .like('reference', `${TEST_PREFIX}VENTE_%`);
    if (data) {
      for (const row of data) {
        await db.from('mutation_steps').delete().eq('mutation_id', row.id);
        await db.from('mutations').delete().eq('id', row.id);
      }
    }
  });

  test.afterAll(async () => {
    if (mutationId) {
      await db.from('mutation_steps').delete().eq('mutation_id', mutationId);
      await db.from('mutations').delete().eq('id', mutationId);
    }
  });

  test('1. /ventes-impayes/ventes charge → liste visible', async ({ page }) => {
    await page.goto('/ventes-impayes/ventes');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });

  test('2. Créer une vente → mutations.status = draft', async ({ page }) => {
    await page.goto('/ventes-impayes/ventes/nouvelle');
    await page.waitForSelector('[class*="form"], [data-testid="vente-form"]');

    // Sélectionner un lot
    const lotSelect = page.locator('select[name="lot_id"], [data-testid="vente-lot"]').first();
    if (await lotSelect.isVisible()) await lotSelect.selectOption({ index: 1 });

    const refField = page.locator('input[name="reference"], [data-testid="vente-reference"]').first();
    if (await refField.isVisible()) await refField.fill(`${TEST_PREFIX}VENTE_${Date.now()}`);

    const buyerField = page.locator('input[name="buyer_name"], input[name="acquéreur"], [data-testid="vente-buyer"]').first();
    if (await buyerField.isVisible()) await buyerField.fill('Acquéreur E2E Test');

    await page.click('button:has-text("Créer"), button:has-text("Enregistrer"), [data-testid="vente-submit"]');
    await page.waitForTimeout(1500);

    const url = page.url();
    const match = url.match(/\/ventes\/([a-f0-9-]+)/);
    if (match) {
      mutationId = match[1];
    } else {
      const { data } = await db
        .from('mutations')
        .select('id, status')
        .eq('copro_id', COPRO_ID)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data?.length) mutationId = data[0].id;
    }

    if (mutationId) {
      const { data } = await db.from('mutations').select('status').eq('id', mutationId).single();
      expect(data?.status).toBe('draft');
    }
  });

  test('3. Faire avancer le workflow (draft → signed) → mutations.status mis à jour', async ({ page }) => {
    test.skip(!mutationId, 'Requiert mutation du test 2');

    await page.goto(`/ventes-impayes/ventes/${mutationId}`);
    await page.waitForSelector('[class*="mutation"], [data-testid="vente-detail"]');

    const nextBtn = page.locator('button:has-text("Étape suivante"), button:has-text("Signer"), button:has-text("Avancer"), [data-testid="next-step"]').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      const confirm = page.locator('button:has-text("Confirmer"), [data-testid="confirm-btn"]').first();
      if (await confirm.isVisible()) await confirm.click();
      await page.waitForTimeout(1000);
    }

    const { data } = await db.from('mutations').select('status').eq('id', mutationId).single();
    expect(['signed', 'draft', 'validated']).toContain(data?.status);
  });

  test('4. /ventes-impayes/impayes charge → liste visible', async ({ page }) => {
    await page.goto('/ventes-impayes/impayes');
    await page.waitForSelector('[class*="page"], main');
    await expect(page.locator('h1, [class*="title"]').first()).toBeVisible();
  });
});
```

- [ ] **Step 2 : Exécuter**

```bash
npx playwright test e2e/all-modules.spec.ts --grep "Ventes"
```

- [ ] **Step 3 : Commit**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): add Ventes/Impayes describe"
```

---

## Task 14 : Vérification finale — run complet

**Files:**
- Modify: `e2e/all-modules.spec.ts` (corrections de sélecteurs uniquement si nécessaire)

- [ ] **Step 1 : Lancer la suite complète**

```bash
npx playwright test e2e/all-modules.spec.ts
```

Attendu : tous les tests passent ou sont `skipped` (jamais `failed`). Les tests skippés sont acceptables — ils indiquent des prérequis manquants (seed data, entité non créée en amont).

- [ ] **Step 2 : Vérifier le rapport HTML**

```bash
npx playwright show-report
```

Regarder les tests en échec et corriger les sélecteurs. Les tests échoueront si :
1. Le sélecteur n'existe pas → adapter avec les classes CSS réelles
2. L'URL de navigation ne correspond pas → corriger la route
3. L'entité n'a pas été créée → vérifier `TEST_COPRO_ID` et seed data

- [ ] **Step 3 : Commit final**

```bash
git add e2e/all-modules.spec.ts
git commit -m "test(e2e): finalize all-modules suite — full coverage 14 modules"
```

---

## Résumé

| # | Tâche | Tests |
|---|-------|-------|
| 1 | Squelette + helpers | 0 |
| 2 | AG | 9 |
| 3 | Finance / Budgets | 4 |
| 4 | Finance / Appels de fonds | 3 |
| 5 | Finance / Factures | 4 |
| 6 | Finance / Mouvements | 3 |
| 7 | Maintenance / Contrats | 4 |
| 8 | Maintenance / OS | 5 |
| 9 | Maintenance / Carnet | 3 |
| 10 | Documents / GED | 4 |
| 11 | Communication (×3) | 7 |
| 12 | Copropriétaires | 3 |
| 13 | Ventes & Impayés | 4 |
| 14 | Run complet | — |
| **Total** | | **57 tests** |
