# Audit P0 Finance Sync - Rapport

**Date**: 2026-01-27
**Statut**: ✅ COMPLÉTÉ - Build OK - MUTATIONS SYNCHRONISÉES
**Objectif**: Supprimer toute dépendance MOCK/localStorage/state-only sur les pages Finance/Compta et garantir la synchronisation avec Supabase.

---

## RÉSUMÉ DES CHANGEMENTS

### Phase 1 - Affichage (Data Fetching)

| Fichier | Changement |
|---------|------------|
| `src/lib/finance/api.ts` | Ajout `getGeneralLedger()`, `getTrialBalance()` |
| `src/hooks/modules/useFinanceData.ts` | Ajout `useGeneralLedger()`, `useTrialBalance()` |
| `src/hooks/modules/useLedger.ts` | Suppression MOCK → Supabase via `useGeneralLedger` |
| `src/app/(dashboard)/documents/ledger/page.tsx` | Ajout états loading/error/empty |
| `src/app/(dashboard)/documents/balance/page.tsx` | Suppression MOCK → Supabase via `useTrialBalance` |
| `src/app/(dashboard)/finance/comptabilite/page.tsx` | **Suppression 10 MOCK_* → Supabase** |

### Phase 2 - Mutations (Real Sync)

| Fichier | Mutation | API Supabase | Refresh |
|---------|----------|--------------|---------|
| `src/app/(dashboard)/finance/bank-movements/page.tsx` | `handleValidate` | `useReconcileBankMovement` | ✅ `refresh()` |
| `src/features/finance/invoices/useFacturesPage.ts` | `handlePaymentComplete` | `usePaySupplierInvoice` | ✅ `refreshWithTimestamp()` |
| `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts` | `handleSaveCategorie` | `useReconcileBankMovement` | ✅ `refreshWithTimestamp()` |
| `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts` | `handleRapprocher` | `useReconcileBankMovement` | ✅ `refreshWithTimestamp()` |
| `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts` | `handleImportFile` | `useImportBankMovement` | ✅ `refresh()` |

### Indicateurs UI ajoutés

| Page | Source Indicator | Last Refresh Timestamp |
|------|-----------------|----------------------|
| `/finance/bank-movements` | ✅ "Source: Supabase (v_bank_movements_overview)" | ✅ |
| `/finance/factures` | Disponible via `lastRefresh` | ✅ |
| `/finance/mouvements-bancaires` | Disponible via `lastRefresh` | ✅ |

### Tests créés:
- `supabase/tests/p0_finance_sync_smoke.sql`

---

## PHASE 1 — PREUVES (Audit ciblé)

### 1. /finance/comptabilite

| Élément | Valeur |
|---------|--------|
| **Fichier** | `src/app/(dashboard)/finance/comptabilite/page.tsx` |
| **Hook principal** | Aucun (state local) |
| **Imports MOCK** | `MOCK_OPERATIONS`, `MOCK_DEPENSES`, `MOCK_HISTORIQUE`, `MOCK_MOUVEMENTS_NON_CATEGORISES`, `MOCK_ETAT_CLOTURE`, `MOCK_ANNEXE_1-5` (lignes 26-35) |
| **Appels Supabase** | AUCUN |
| **Verdict** | **🔴 MOCK** |

**Preuve**:
```typescript
// Ligne 68-70
const [etatCloture] = useState<EtatCloture>(MOCK_ETAT_CLOTURE);
const [historique] = useState<HistoriqueModification[]>(MOCK_HISTORIQUE);
const [mouvementsNonCategorises] = useState<MouvementNonCategorise[]>(MOCK_MOUVEMENTS_NON_CATEGORISES);

// Ligne 77
const operationsWithBalances = calculateGrandLivreBalances(MOCK_OPERATIONS, 0);
```

---

### 2. /documents/ledger

| Élément | Valeur |
|---------|--------|
| **Fichier** | `src/app/(dashboard)/documents/ledger/page.tsx` |
| **Hook principal** | `useLedger` (`src/hooks/modules/useLedger.ts`) |
| **Imports MOCK** | `MOCK_OPERATIONS` via `useLedger.ts` ligne 4 |
| **Appels Supabase** | AUCUN |
| **Verdict** | **🔴 MOCK** |

**Preuve** (dans `useLedger.ts`):
```typescript
// Ligne 4
import { MOCK_OPERATIONS } from '@/components/features/finance/Comptabilite/data';

// Ligne 27
const balanceData = useMemo(() => calculateBalance(MOCK_OPERATIONS), []);

// Ligne 44
MOCK_OPERATIONS.forEach(op => comptes.add(op.compte));

// Ligne 49
let result = [...MOCK_OPERATIONS];
```

---

### 3. /documents/balance

| Élément | Valeur |
|---------|--------|
| **Fichier** | `src/app/(dashboard)/documents/balance/page.tsx` |
| **Hook principal** | Aucun (calcul direct) |
| **Imports MOCK** | `MOCK_OPERATIONS` (ligne 8) |
| **Appels Supabase** | AUCUN |
| **Verdict** | **🔴 MOCK** |

**Preuve**:
```typescript
// Ligne 8
import { MOCK_OPERATIONS } from '@/components/features/finance/Comptabilite/data';

// Ligne 32-34
const balanceData = useMemo(() => {
    return calculateBalance(MOCK_OPERATIONS);
}, []);
```

---

### 4. /finance/factures

| Élément | Valeur |
|---------|--------|
| **Fichier** | `src/app/(dashboard)/finance/factures/page.tsx` |
| **Hook principal** | `useFacturesPage` (`src/features/finance/invoices/useFacturesPage.ts`) |
| **Imports MOCK** | `MOCK_FACTURES` (fallback ligne 6), `MOCK_POSTES_BUDGET` (page ligne 14) |
| **Appels Supabase** | `useSupplierInvoices`, `useCreateSupplierInvoice`, `usePaySupplierInvoice`, `useOpenPeriod` |
| **Verdict** | **🟡 MIXTE** |

**Preuve** (dans `useFacturesPage.ts`):
```typescript
// Ligne 6
import { MOCK_FACTURES } from '@/components/features/finance/Factures/data';

// Ligne 37-38
const { data: supabaseInvoices, isLoading, error, refresh } = useSupplierInvoices();
const { data: openPeriod } = useOpenPeriod();

// Ligne 60-70 - PROBLÈME: Fallback sur MOCK si pas de data
const initialFactures = currentCoproId && supabaseFactures.length > 0 ? supabaseFactures : MOCK_FACTURES;
const [factures, setFactures] = useState<Facture[]>(initialFactures);

useEffect(() => {
  if (currentCoproId && supabaseFactures.length > 0) {
    setFactures(supabaseFactures);
  } else if (!currentCoproId) {
    setFactures(MOCK_FACTURES);
  }
}, [currentCoproId, supabaseFactures]);
```

**Problèmes identifiés**:
1. Fallback sur MOCK si Supabase retourne une liste vide (au lieu d'afficher "vide")
2. Mutations locales uniquement (handlePaymentComplete, handleSendToAccounting, etc.)
3. Pas de gestion de l'état loading/error dans la page

---

### 5. /finance/bank-movements

| Élément | Valeur |
|---------|--------|
| **Fichier** | `src/app/(dashboard)/finance/bank-movements/page.tsx` |
| **Hook principal** | Aucun (state local) |
| **Imports MOCK** | `MOCK_MOUVEMENTS_BANCAIRES`, `MOCK_PLAN_COMPTABLE` (ligne 3) |
| **Appels Supabase** | AUCUN |
| **Verdict** | **🔴 MOCK** |

**Preuve**:
```typescript
// Ligne 3
import { MOCK_MOUVEMENTS_BANCAIRES, MOCK_PLAN_COMPTABLE } from '@/data/mock';

// Ligne 22
const allAccounts = flattenAccounts(MOCK_PLAN_COMPTABLE);

// Ligne 37-40
<h2>Mouvements à catégoriser ({MOCK_MOUVEMENTS_BANCAIRES.length})</h2>
{MOCK_MOUVEMENTS_BANCAIRES.map((mouvement) => (
```

---

### 6. /finance/mouvements-bancaires

| Élément | Valeur |
|---------|--------|
| **Fichier** | `src/app/(dashboard)/finance/mouvements-bancaires/page.tsx` |
| **Hook principal** | `useMouvementsBancairesPage` (`src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts`) |
| **Imports MOCK** | `MOCK_MOUVEMENTS_BASE`, `MOCK_ECRITURES_COMPTABLES`, etc. (fallback lignes 21-30) |
| **Appels Supabase** | `useBankMovements`, `useImportBankMovement`, `useReconcileBankMovement`, `useOpenPeriod` |
| **Verdict** | **🟡 MIXTE** |

**Preuve** (dans `useMouvementsBancairesPage.ts`):
```typescript
// Lignes 21-30
import {
  MOCK_MOUVEMENTS_BASE,
  MOCK_ECRITURES_COMPTABLES,
  MOCK_STATUT_CONNEXION,
  MOCK_HISTORIQUE_SYNC,
  ...
} from '../domain/constants';

// Ligne 48
const { data: supabaseBankMovements, isLoading, error, refresh } = useBankMovements();

// Ligne 71-80 - PROBLÈME: Fallback sur MOCK
const initialMouvements = currentCoproId && supabaseMouvements.length > 0 ? supabaseMouvements : MOCK_MOUVEMENTS_BASE;
```

---

## PHASE 2 — BACKEND "Golden Query"

### Vues Supabase disponibles (migration 20260125_niveau2d_ledger.sql)

| Vue | Existe | Usage prévu |
|-----|--------|-------------|
| `v_general_ledger` | ✅ | Comptabilité, Grand Livre |
| `v_trial_balance` | ✅ | Balance comptable |
| `v_supplier_invoices_overview` | ✅ | Factures fournisseurs |
| `v_bank_movements_overview` | ✅ | Mouvements bancaires |

### Queries "Golden"

**A) Comptabilité / Grand Livre**:
```sql
SELECT * FROM v_general_ledger
WHERE copro_id = :currentCoproId
  AND status = 'posted'
ORDER BY tx_date DESC, account_code;
```

**B) Balance Comptable**:
```sql
SELECT * FROM v_trial_balance
WHERE copro_id = :currentCoproId
  AND period_id = :currentPeriodId
ORDER BY account_code;
```

**C) Factures Fournisseurs**:
```sql
SELECT * FROM v_supplier_invoices_overview
WHERE copro_id = :currentCoproId
ORDER BY invoice_date DESC;
```

**D) Mouvements Bancaires**:
```sql
SELECT * FROM v_bank_movements_overview
WHERE copro_id = :currentCoproId
ORDER BY bank_date DESC;
```

---

## PHASE 3 — PLAN D'IMPLÉMENTATION

### Étape 1: Ajouter fonctions API manquantes (`src/lib/finance/api.ts`)

```typescript
// À ajouter
export async function getGeneralLedger(coproId: string, periodId?: string)
export async function getTrialBalance(coproId: string, periodId: string)
```

### Étape 2: Ajouter hooks manquants (`src/hooks/modules/useFinanceData.ts`)

```typescript
// À ajouter
export function useGeneralLedger(periodId?: string)
export function useTrialBalance(periodId: string)
```

### Étape 3: Mettre à jour useLedger.ts

- Remplacer `MOCK_OPERATIONS` par appel à `useGeneralLedger()`
- Ajouter gestion loading/error

### Étape 4: Mettre à jour les pages

| Page | Action |
|------|--------|
| `/finance/comptabilite` | Brancher sur `useGeneralLedger` + `useTrialBalance` |
| `/documents/ledger` | Le hook sera mis à jour automatiquement |
| `/documents/balance` | Brancher sur `useTrialBalance` |
| `/finance/factures` | Supprimer fallback MOCK, ajouter états loading/empty |
| `/finance/bank-movements` | Brancher sur `useBankMovements` |
| `/finance/mouvements-bancaires` | Supprimer fallback MOCK, ajouter états loading/empty |

### Étape 5: Tests smoke SQL

Créer `supabase/tests/p0_finance_sync_smoke.sql` avec:
- Test v_general_ledger avec filtre copro_id
- Test v_trial_balance avec filtre copro_id
- Test v_supplier_invoices_overview
- Test v_bank_movements_overview
- Test RLS enabled
- Test security_invoker=true

---

## Changelog à produire

### Fichiers à modifier:
1. `src/lib/finance/api.ts` - Ajouter getGeneralLedger, getTrialBalance
2. `src/hooks/modules/useFinanceData.ts` - Ajouter useGeneralLedger, useTrialBalance
3. `src/hooks/modules/useLedger.ts` - Remplacer MOCK par Supabase
4. `src/app/(dashboard)/finance/comptabilite/page.tsx` - Brancher Supabase
5. `src/app/(dashboard)/documents/balance/page.tsx` - Brancher Supabase
6. `src/app/(dashboard)/finance/bank-movements/page.tsx` - Brancher Supabase
7. `src/features/finance/invoices/useFacturesPage.ts` - Supprimer fallback MOCK
8. `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts` - Supprimer fallback MOCK

### Tests à créer:
- `supabase/tests/p0_finance_sync_smoke.sql`

---

## Scénarios de vérification manuelle

### Lecture (Phase 1)
1. **Refresh persiste**: Ouvrir /finance/comptabilite → Refresh navigateur → Mêmes données affichées
2. **Voir ledger**: /documents/ledger → Données issues de v_general_ledger
3. **Balance équilibrée**: /documents/balance → Totaux débit = crédit (depuis v_trial_balance)

### Mutations (Phase 2)
4. **Payer facture**: /finance/factures → Sélectionner facture → Marquer payée → Refresh navigateur → Statut "PAYEE" persisté
5. **Catégoriser mouvement**: /finance/bank-movements → Sélectionner compte → Valider → Mouvement disparaît de la liste "unmatched"
6. **Import CSV**: /finance/mouvements-bancaires → Import CSV → Mouvements visibles après refresh
7. **Rapprochement bancaire**: /finance/mouvements-bancaires → Rapprocher écriture → Statut mis à jour dans Supabase

### Indicateurs visuels
8. **Source Supabase visible**: /finance/bank-movements → Badge "Source: Supabase (v_bank_movements_overview)" visible
9. **Timestamp actualisation**: /finance/bank-movements → Affiche heure de dernière actualisation

---

## État final des pages Finance

| Page | Lecture Supabase | Mutations Supabase | Indicateur Source | Zero MOCK |
|------|-----------------|-------------------|------------------|-----------|
| `/finance/comptabilite` | ✅ | N/A (lecture seule) | ❌ À ajouter | ✅ |
| `/finance/factures` | ✅ | ✅ `handlePaymentComplete` | ❌ À ajouter | ✅ |
| `/finance/bank-movements` | ✅ | ✅ `handleValidate` | ✅ | ✅ |
| `/finance/mouvements-bancaires` | ✅ | ✅ Import/Catégoriser/Rapprocher | ❌ À ajouter | ✅ |
| `/documents/ledger` | ✅ | N/A | ❌ À ajouter | ✅ |
| `/documents/balance` | ✅ | N/A | ❌ À ajouter | ✅ |
