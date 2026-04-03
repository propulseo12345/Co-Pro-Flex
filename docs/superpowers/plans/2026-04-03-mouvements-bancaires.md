# Mouvements Bancaires — Migration Mock → Supabase

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Code review obligatoire** après chaque tâche majeure (Tasks 1, 3, 5).

**Goal:** Rendre la page mouvements bancaires 100% fonctionnelle sur Supabase — zéro mock, soldes réels, rapprochement sur factures fournisseurs.

**Architecture:** Les comptes bancaires et soldes viennent de `accounts` + `bank_movements`. Le rapprochement matche mouvements ↔ `supplier_invoices` + `payments`. Le matching engine accepte les données Supabase en paramètre au lieu de constantes mock. La vue `v_dashboard_kpis` utilise `v_account_balances` pour la trésorerie.

**Tech Stack:** Supabase (PostgreSQL views, migrations), Next.js 16, React 19, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-03-mouvements-bancaires-design.md`

---

## Task 1: Migration DB — account_id + vues SQL

**Files:**
- Supabase: migration SQL via MCP `execute_sql`

- [ ] **Step 1: Ajouter `account_id` sur `bank_movements`**

```sql
ALTER TABLE bank_movements ADD COLUMN account_id UUID REFERENCES accounts(id);
```

- [ ] **Step 2: Backfill — assigner tous les mouvements existants au compte 512**

```sql
UPDATE bank_movements bm
SET account_id = (
  SELECT a.id FROM accounts a
  WHERE a.copro_id = bm.copro_id AND a.code = '512'
  LIMIT 1
)
WHERE bm.account_id IS NULL;
```

- [ ] **Step 3: Rendre la colonne NOT NULL**

```sql
ALTER TABLE bank_movements ALTER COLUMN account_id SET NOT NULL;
```

- [ ] **Step 4: Créer la vue `v_account_balances`**

```sql
CREATE VIEW v_account_balances AS
SELECT
  a.id AS account_id,
  a.copro_id,
  a.code,
  a.name,
  a.banque,
  a.iban,
  a.initial_balance,
  COALESCE(SUM(bm.amount_signed), 0) AS movements_total,
  a.initial_balance + COALESCE(SUM(bm.amount_signed), 0) AS computed_balance
FROM accounts a
LEFT JOIN bank_movements bm ON bm.account_id = a.id
WHERE a.code LIKE '5%'
GROUP BY a.id, a.copro_id, a.code, a.name, a.banque, a.iban, a.initial_balance;
```

- [ ] **Step 5: Mettre à jour `v_bank_movements_overview` — ajouter `account_id` + `account_code` + `account_category`**

```sql
DROP VIEW v_bank_movements_overview;

CREATE VIEW v_bank_movements_overview AS
SELECT
  bm.id,
  bm.copro_id,
  bm.period_id,
  bm.account_id,
  bm.bank_date,
  bm.value_date,
  bm.amount_signed,
  CASE WHEN bm.amount_signed > 0 THEN 'credit' ELSE 'debit' END AS direction,
  abs(bm.amount_signed) AS amount_abs,
  bm.label,
  bm.bank_ref,
  bm.status,
  bm.account_code,
  bm.account_category,
  bm.created_at,
  COALESCE(sum(bmatch.amount_matched), 0) AS total_matched,
  abs(bm.amount_signed) - COALESCE(sum(bmatch.amount_matched), 0) AS remaining_to_match,
  count(bmatch.id) AS matches_count
FROM bank_movements bm
LEFT JOIN bank_matches bmatch ON bmatch.bank_movement_id = bm.id
GROUP BY bm.id;
```

- [ ] **Step 6: Mettre à jour `v_dashboard_kpis` — trésorerie depuis `v_account_balances`**

```sql
DROP VIEW v_dashboard_kpis;

CREATE VIEW v_dashboard_kpis AS
SELECT
  c.id AS copro_id,
  COALESCE((SELECT computed_balance FROM v_account_balances WHERE copro_id = c.id AND code = '512'), 0) AS tresorerie_courante,
  COALESCE((SELECT computed_balance FROM v_account_balances WHERE copro_id = c.id AND code = '502'), 0) AS tresorerie_travaux,
  COALESCE((SELECT computed_balance FROM v_account_balances WHERE copro_id = c.id AND code = '512'), 0)
  + COALESCE((SELECT computed_balance FROM v_account_balances WHERE copro_id = c.id AND code = '502'), 0) AS current_balance,
  COALESCE((SELECT sum(u.balance) FROM v_unpaid_lots u WHERE u.copro_id = c.id AND u.balance > 0), 0) AS unpaid_total,
  COALESCE((SELECT count(*) FROM v_unpaid_lots u WHERE u.copro_id = c.id AND u.severity = 'critical'), 0)::integer AS critical_unpaid_count,
  (SELECT ag.meeting_date FROM ag_meetings ag WHERE ag.copro_id = c.id AND ag.status IN ('draft','convoked') AND ag.meeting_date >= CURRENT_DATE ORDER BY ag.meeting_date LIMIT 1) AS next_ag_date,
  (SELECT ag.id FROM ag_meetings ag WHERE ag.copro_id = c.id AND ag.status IN ('draft','convoked') AND ag.meeting_date >= CURRENT_DATE ORDER BY ag.meeting_date LIMIT 1) AS next_ag_id,
  (SELECT ag.title FROM ag_meetings ag WHERE ag.copro_id = c.id AND ag.status IN ('draft','convoked') AND ag.meeting_date >= CURRENT_DATE ORDER BY ag.meeting_date LIMIT 1) AS next_ag_title,
  COALESCE((
    SELECT SUM(bl.amount) FROM budgets b
    JOIN accounting_periods ap ON ap.id = b.period_id
    JOIN budget_lines bl ON bl.budget_id = b.id
    WHERE b.copro_id = c.id AND b.budget_type = 'current'
    AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE
  ), 0) AS budget_vote,
  COALESCE((
    SELECT SUM(le.amount) FROM ledger_entries le
    JOIN accounts a ON a.id = le.account_id
    JOIN accounting_periods ap ON ap.id = le.period_id
    WHERE le.copro_id = c.id AND a.code LIKE '6%' AND le.direction = 'debit'
    AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE
  ), 0) AS budget_realise,
  CASE WHEN COALESCE((
    SELECT SUM(bl.amount) FROM budgets b
    JOIN accounting_periods ap ON ap.id = b.period_id
    JOIN budget_lines bl ON bl.budget_id = b.id
    WHERE b.copro_id = c.id AND b.budget_type = 'current'
    AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE
  ), 0) > 0
  THEN ROUND(
    COALESCE((
      SELECT SUM(le.amount) FROM ledger_entries le
      JOIN accounts a ON a.id = le.account_id
      JOIN accounting_periods ap ON ap.id = le.period_id
      WHERE le.copro_id = c.id AND a.code LIKE '6%' AND le.direction = 'debit'
      AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE
    ), 0) * 100.0 / (
      SELECT SUM(bl.amount) FROM budgets b
      JOIN accounting_periods ap ON ap.id = b.period_id
      JOIN budget_lines bl ON bl.budget_id = b.id
      WHERE b.copro_id = c.id AND b.budget_type = 'current'
      AND ap.start_date <= CURRENT_DATE AND ap.end_date >= CURRENT_DATE
    )
  )
  ELSE 0 END AS budget_pct
FROM copros c;
```

- [ ] **Step 7: Vérifier les données**

```sql
SELECT * FROM v_account_balances WHERE copro_id = '11111111-aaaa-bbbb-cccc-111111111111';
SELECT * FROM v_dashboard_kpis WHERE copro_id = '11111111-aaaa-bbbb-cccc-111111111111';
SELECT account_id, label, amount_signed FROM v_bank_movements_overview WHERE copro_id = '11111111-aaaa-bbbb-cccc-111111111111';
```

- [ ] **Step 8: Code review Task 1**

---

## Task 2: API — fonctions fetch comptes + fournisseurs + factures

**Files:**
- Modify: `src/lib/finance/api.ts`

- [ ] **Step 1: Ajouter `listBankAccounts` — fetch comptes avec soldes**

Ajouter dans `src/lib/finance/api.ts` :

```typescript
export interface BankAccountWithBalance {
  account_id: string;
  copro_id: string;
  code: string;
  name: string;
  banque: string | null;
  iban: string | null;
  initial_balance: number;
  movements_total: number;
  computed_balance: number;
}

export async function listBankAccounts(coproId: string): Promise<ApiResult<BankAccountWithBalance[]>> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_account_balances')
    .select('*')
    .eq('copro_id', coproId)
    .order('code');

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      ...d,
      initial_balance: Number(d.initial_balance) || 0,
      movements_total: Number(d.movements_total) || 0,
      computed_balance: Number(d.computed_balance) || 0,
    })) as BankAccountWithBalance[],
    error: null,
  };
}
```

- [ ] **Step 2: Ajouter `listSuppliers` — fetch fournisseurs**

```typescript
export interface SupplierBasic {
  id: string;
  name: string;
  copro_id: string;
}

export async function listSuppliers(coproId: string): Promise<ApiResult<SupplierBasic[]>> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, copro_id')
    .eq('copro_id', coproId)
    .eq('is_active', true);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []) as SupplierBasic[], error: null };
}
```

- [ ] **Step 3: Ajouter `listPendingInvoices` — fetch factures en attente**

```typescript
export interface PendingInvoice {
  id: string;
  copro_id: string;
  supplier_id: string | null;
  supplier_name?: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  label: string | null;
  total_amount: number;
  status: string;
}

export async function listPendingInvoices(coproId: string): Promise<ApiResult<PendingInvoice[]>> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('id, copro_id, supplier_id, invoice_number, invoice_date, due_date, label, total_amount, status, suppliers(name)')
    .eq('copro_id', coproId)
    .in('status', ['pending', 'validated', 'approved']);

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      ...d,
      total_amount: Number(d.total_amount) || 0,
      supplier_name: (d.suppliers as Record<string, unknown>)?.name as string || null,
    })) as PendingInvoice[],
    error: null,
  };
}
```

- [ ] **Step 4: Ajouter `listUnmatchedPayments` — fetch paiements non rapprochés**

```typescript
export interface UnmatchedPayment {
  id: string;
  copro_id: string;
  lot_id: string | null;
  amount: number;
  payment_date: string;
  method: string;
  reference: string | null;
  status: string;
}

export async function listUnmatchedPayments(coproId: string): Promise<ApiResult<UnmatchedPayment[]>> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('payments')
    .select('id, copro_id, lot_id, amount, payment_date, method, reference, status')
    .eq('copro_id', coproId)
    .eq('status', 'validated');

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      ...d,
      amount: Number(d.amount) || 0,
    })) as UnmatchedPayment[],
    error: null,
  };
}
```

- [ ] **Step 5: Mettre à jour le type `BankMovementOverview` — ajouter `account_id`**

Dans `src/lib/finance/api.ts`, modifier l'interface `BankMovementOverview` :

```typescript
export interface BankMovementOverview {
  id: string;
  copro_id: string;
  period_id: string;
  account_id: string;  // ← NOUVEAU
  bank_date: string;
  value_date: string | null;
  amount_signed: number;
  direction: 'credit' | 'debit';
  amount_abs: number;
  label: string;
  bank_ref: string | null;
  status: 'unmatched' | 'matched' | 'ignored';
  account_code: string | null;
  account_category: string | null;
  created_at: string;
  total_matched: number;
  remaining_to_match: number;
  matches_count: number;
}
```

- [ ] **Step 6: Mettre à jour `importBankMovement` payload — ajouter `account_id`**

```typescript
export interface ImportBankMovementPayload {
  copro_id: string;
  period_id: string;
  account_id: string;  // ← NOUVEAU
  movements: Array<{
    bank_date: string;
    value_date?: string;
    amount_signed: number;
    label: string;
    bank_ref?: string;
  }>;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/finance/api.ts
git commit -m "feat(bank): API functions — listBankAccounts, listSuppliers, listPendingInvoices, listUnmatchedPayments"
```

---

## Task 3: Matching Engine — accepter données Supabase

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/domain/matching-engine.ts`
- Modify: `src/features/finance/mouvements-bancaires/domain/types.ts`

- [ ] **Step 1: Ajouter types pour les données Supabase dans `types.ts`**

Ajouter à la fin de `src/features/finance/mouvements-bancaires/domain/types.ts` :

```typescript
// Types pour les données Supabase (rapprochement)
export interface SupplierForMatching {
  id: string;
  name: string;
}

export interface InvoiceForMatching {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  label: string | null;
  total_amount: number;
  status: string;
}

export interface PaymentForMatching {
  id: string;
  lot_id: string | null;
  amount: number;
  payment_date: string;
  method: string;
  reference: string | null;
}
```

- [ ] **Step 2: Modifier `genererSuggestions` — accepter suppliers et invoices en paramètre**

Dans `matching-engine.ts`, modifier la signature de la fonction principale et de Rule 2 :

```typescript
interface MatchingContext {
  suppliers: SupplierForMatching[];
  pendingInvoices: InvoiceForMatching[];
  allMouvements: MouvementBancaireBase[];
}

export function genererSuggestions(
  mouvement: MouvementBancaireBase,
  context: MatchingContext
): SuggestionCategorie[] {
  const suggestions: SuggestionCategorie[] = [];

  // Rule 1: Facture — montant exact + date proche
  for (const invoice of context.pendingInvoices) {
    const montantMvt = Math.abs(mouvement.montant);
    const ecart = Math.abs(montantMvt - invoice.total_amount);
    if (ecart <= 0.02) {
      const dateMvt = new Date(mouvement.date);
      const dateInv = new Date(invoice.invoice_date);
      const diffJours = Math.abs((dateMvt.getTime() - dateInv.getTime()) / 86400000);
      if (diffJours <= 5) {
        suggestions.push({
          compte: invoice.supplier_name ? `Facture ${invoice.supplier_name}` : `Facture #${invoice.invoice_number}`,
          categorie: 'charge',
          confiance: 'haute',
          raison: `Montant exact (${invoice.total_amount}€) + date proche`,
          entiteLiee: {
            type: 'FACTURE',
            id: invoice.id,
            label: invoice.label || `Facture #${invoice.invoice_number}`,
            montant: invoice.total_amount,
          },
        });
      }
    }
  }

  // Rule 2: Fournisseur connu dans le libellé
  for (const supplier of context.suppliers) {
    const keywords = supplier.name.toLowerCase().split(/\s+/);
    const labelLower = mouvement.libelle.toLowerCase();
    if (keywords.some(kw => kw.length > 2 && labelLower.includes(kw))) {
      // Chercher une facture de ce fournisseur
      const matchingInvoice = context.pendingInvoices.find(
        inv => inv.supplier_id === supplier.id && Math.abs(Math.abs(mouvement.montant) - inv.total_amount) / inv.total_amount < 0.05
      );
      suggestions.push({
        compte: matchingInvoice ? `Facture ${supplier.name}` : supplier.name,
        categorie: mouvement.montant < 0 ? 'charge' : 'produit',
        confiance: matchingInvoice ? 'haute' : 'moyenne',
        raison: matchingInvoice
          ? `Fournisseur ${supplier.name} + facture #${matchingInvoice.invoice_number} (${matchingInvoice.total_amount}€)`
          : `Fournisseur reconnu: ${supplier.name}`,
        entiteLiee: matchingInvoice ? {
          type: 'FACTURE',
          id: matchingInvoice.id,
          label: matchingInvoice.label || `Facture #${matchingInvoice.invoice_number}`,
          montant: matchingInvoice.total_amount,
        } : undefined,
      });
    }
  }

  // Rule 3: Heuristiques regex (conservées — données de référence universelles)
  if (suggestions.length === 0) {
    for (const h of HEURISTIQUES_LIBELLE) {
      if (h.pattern.test(mouvement.libelle)) {
        const planEntry = PLAN_COMPTABLE_ESSENTIEL.find(p => p.code === h.compte);
        suggestions.push({
          compte: planEntry?.label || h.compte,
          categorie: planEntry?.categorie || (mouvement.montant < 0 ? 'charge' : 'produit'),
          confiance: 'basse',
          raison: `Détection automatique (libellé)`,
        });
        break;
      }
    }
  }

  // Rule 4: Récurrence (même montant dans mouvements précédents catégorisés)
  if (suggestions.length === 0) {
    const similar = context.allMouvements.find(
      m => m.id !== mouvement.id
        && m.compteComptable
        && Math.abs(Math.abs(m.montant) - Math.abs(mouvement.montant)) <= 0.01
    );
    if (similar) {
      suggestions.push({
        compte: similar.compteComptable!,
        categorie: similar.categorieComptable || '',
        confiance: 'moyenne',
        raison: `Mouvement similaire déjà catégorisé (${similar.libelle})`,
      });
    }
  }

  return suggestions;
}
```

- [ ] **Step 3: Modifier `genererSuggestionsRapprochement` — matcher contre factures + paiements**

```typescript
interface RapprochementContext {
  pendingInvoices: InvoiceForMatching[];
  unmatchedPayments: PaymentForMatching[];
}

export function genererSuggestionsRapprochement(
  mouvement: MouvementBancaireBase,
  context: RapprochementContext
): SuggestionRapprochement[] {
  const suggestions: SuggestionRapprochement[] = [];
  const montantAbs = Math.abs(mouvement.montant);

  // Sorties → matcher avec factures fournisseurs
  if (mouvement.montant < 0) {
    for (const invoice of context.pendingInvoices) {
      const ecart = Math.abs(montantAbs - invoice.total_amount);
      const ecartPct = invoice.total_amount > 0 ? ecart / invoice.total_amount : 1;
      if (ecartPct <= 0.05) {
        const dateMvt = new Date(mouvement.date);
        const dateInv = new Date(invoice.invoice_date);
        const diffJours = Math.abs((dateMvt.getTime() - dateInv.getTime()) / 86400000);
        suggestions.push({
          targetType: 'supplier_payment' as const,
          targetId: invoice.id,
          label: invoice.supplier_name
            ? `${invoice.supplier_name} — Facture #${invoice.invoice_number}`
            : `Facture #${invoice.invoice_number}`,
          montant: invoice.total_amount,
          confiance: ecart <= 0.02 && diffJours <= 5 ? 'haute' : 'moyenne',
          ecart,
        });
      }
    }
  }

  // Entrées → matcher avec paiements copropriétaires
  if (mouvement.montant > 0) {
    for (const payment of context.unmatchedPayments) {
      const ecart = Math.abs(montantAbs - payment.amount);
      const ecartPct = payment.amount > 0 ? ecart / payment.amount : 1;
      if (ecartPct <= 0.05) {
        suggestions.push({
          targetType: 'payment' as const,
          targetId: payment.id,
          label: `Paiement ${payment.method} — ${payment.reference || payment.payment_date}`,
          montant: payment.amount,
          confiance: ecart <= 0.02 ? 'haute' : 'moyenne',
          ecart,
        });
      }
    }
  }

  // Trier par confiance puis par écart
  return suggestions.sort((a, b) => {
    const order = { haute: 0, moyenne: 1, basse: 2 };
    return (order[a.confiance] - order[b.confiance]) || (a.ecart - b.ecart);
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/mouvements-bancaires/domain/matching-engine.ts src/features/finance/mouvements-bancaires/domain/types.ts
git commit -m "feat(bank): matching engine — accept Supabase suppliers/invoices/payments"
```

- [ ] **Step 5: Code review Task 3**

---

## Task 4: Hook — remplacer mocks par Supabase

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts`
- Modify: `src/features/finance/mouvements-bancaires/domain/constants.ts`

- [ ] **Step 1: Ajouter imports des nouvelles API dans le hook**

En haut de `useMouvementsBancairesPage.ts`, remplacer les imports mock par les API :

```typescript
import { listBankAccounts, listSuppliers, listPendingInvoices, listUnmatchedPayments } from '@/lib/finance/api';
import type { BankAccountWithBalance, SupplierBasic, PendingInvoice, UnmatchedPayment } from '@/lib/finance/api';
```

Supprimer les imports :
```typescript
// SUPPRIMER ces imports
import { MOCK_COMPTE_COURANT, MOCK_COMPTE_TRAVAUX, MOCK_ECRITURES_COMPTABLES } from '../domain/constants';
```

- [ ] **Step 2: Ajouter les states et fetches pour comptes, fournisseurs, factures**

Après les states existants, ajouter :

```typescript
// Comptes bancaires réels
const [compteCourant, setCompteCourant] = useState<CompteBancaire | null>(null);
const [compteTravaux, setCompteTravaux] = useState<CompteBancaire | null>(null);

// Données pour matching/rapprochement
const [suppliers, setSuppliers] = useState<SupplierBasic[]>([]);
const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
const [unmatchedPayments, setUnmatchedPayments] = useState<UnmatchedPayment[]>([]);

// Fetch comptes + données de matching au mount
useEffect(() => {
  if (!currentCoproId) return;

  async function fetchBankData() {
    const [accountsRes, suppliersRes, invoicesRes, paymentsRes] = await Promise.all([
      listBankAccounts(currentCoproId!),
      listSuppliers(currentCoproId!),
      listPendingInvoices(currentCoproId!),
      listUnmatchedPayments(currentCoproId!),
    ]);

    if (accountsRes.data) {
      const cc = accountsRes.data.find(a => a.code === '512');
      const ft = accountsRes.data.find(a => a.code === '502');
      if (cc) setCompteCourant({
        id: cc.account_id,
        nom: cc.name,
        type: 'courant',
        iban: cc.iban || '',
        soldeInitial: cc.initial_balance,
        derniereMaj: new Date().toISOString(),
      });
      if (ft) setCompteTravaux({
        id: ft.account_id,
        nom: ft.name,
        type: 'travaux',
        iban: ft.iban || '',
        soldeInitial: ft.initial_balance,
        derniereMaj: new Date().toISOString(),
      });
    }

    if (suppliersRes.data) setSuppliers(suppliersRes.data);
    if (invoicesRes.data) setPendingInvoices(invoicesRes.data);
    if (paymentsRes.data) setUnmatchedPayments(paymentsRes.data);
  }

  fetchBankData();
}, [currentCoproId]);
```

- [ ] **Step 3: Remplacer `compteActuel` — utiliser vrais comptes**

Remplacer :
```typescript
// AVANT (mock)
const compteActuel = compteActif === 'courant' ? MOCK_COMPTE_COURANT : MOCK_COMPTE_TRAVAUX;
```

Par :
```typescript
const compteActuel = compteActif === 'courant' ? compteCourant : compteTravaux;
```

- [ ] **Step 4: Filtrer mouvements par `account_id` réel**

Remplacer le filtre existant :
```typescript
// AVANT (mock ID '1' ou '2')
const mouvementsFiltresParCompte = useMemo(() => {
  return mouvementsBase.filter(m => m.accountId === compteActuel.id);
}, [mouvementsBase, compteActuel.id]);
```

Par :
```typescript
const mouvementsFiltresParCompte = useMemo(() => {
  if (!compteActuel) return mouvementsBase;
  return mouvementsBase.filter(m => m.accountId === compteActuel.id);
}, [mouvementsBase, compteActuel]);
```

- [ ] **Step 5: Adapter le convert Supabase → MouvementBancaireBase — inclure `account_id`**

Dans le mapping des mouvements (lignes 60-76), s'assurer que `accountId` est le UUID réel :

```typescript
const converted: MouvementBancaireBase = {
  id: m.id,
  date: m.bank_date,
  dateValeur: m.value_date || m.bank_date,
  libelle: m.label,
  montant: m.amount_signed,
  type: m.amount_signed > 0 ? 'ENTREE' : 'SORTIE',
  accountId: m.account_id,  // ← UUID réel depuis la vue
  compteComptable: m.account_code || '',
  categorieComptable: (m.account_category as CategorieComptable) || '',
  rapproche: m.status === 'matched',
  ecritureId: null,
  entiteLiee: null,
};
```

- [ ] **Step 6: Adapter `handleCategoriserClick` — passer le contexte Supabase au matching engine**

```typescript
const handleCategoriserClick = useCallback((mouvement: MouvementBancaire) => {
  const suggestions = genererSuggestions(mouvement, {
    suppliers: suppliers.map(s => ({ id: s.id, name: s.name })),
    pendingInvoices: pendingInvoices.map(inv => ({
      id: inv.id,
      supplier_id: inv.supplier_id || null,
      supplier_name: inv.supplier_name || null,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      label: inv.label,
      total_amount: inv.total_amount,
      status: inv.status,
    })),
    allMouvements: mouvementsBase,
  });
  // ... suite inchangée (ouvrir modale avec suggestions)
}, [suppliers, pendingInvoices, mouvementsBase]);
```

- [ ] **Step 7: Adapter `handleOpenRapprochement` — passer factures + paiements**

```typescript
const handleOpenRapprochement = useCallback((mouvement: MouvementBancaire) => {
  const suggestions = genererSuggestionsRapprochement(mouvement, {
    pendingInvoices: pendingInvoices.map(inv => ({
      id: inv.id,
      supplier_id: inv.supplier_id || null,
      supplier_name: inv.supplier_name || null,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      label: inv.label,
      total_amount: inv.total_amount,
      status: inv.status,
    })),
    unmatchedPayments: unmatchedPayments.map(p => ({
      id: p.id,
      lot_id: p.lot_id,
      amount: p.amount,
      payment_date: p.payment_date,
      method: p.method,
      reference: p.reference,
    })),
  });
  // ... suite inchangée (ouvrir modale avec suggestions)
}, [pendingInvoices, unmatchedPayments]);
```

- [ ] **Step 8: Remplacer les valeurs retournées — vrais comptes au lieu de mocks**

À la fin du hook, remplacer :
```typescript
// AVANT
compteCourant: MOCK_COMPTE_COURANT,
compteTravaux: MOCK_COMPTE_TRAVAUX,
```

Par :
```typescript
compteCourant,
compteTravaux,
```

- [ ] **Step 9: Supprimer `ecrituresComptables` state mock et son usage**

Supprimer :
```typescript
// SUPPRIMER
const [ecrituresComptables, setEcrituresComptables] = useState<EcritureComptable[]>(MOCK_ECRITURES_COMPTABLES);
```

Le rapprochement utilise maintenant `pendingInvoices` + `unmatchedPayments` au lieu de `ecrituresComptables`.

- [ ] **Step 10: Commit**

```bash
git add src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts
git commit -m "feat(bank): hook — replace all mocks with Supabase data"
```

---

## Task 5: Nettoyage — supprimer les mocks

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/domain/constants.ts`

- [ ] **Step 1: Supprimer les mocks de `constants.ts`**

Supprimer de `constants.ts` :
- `MOCK_COMPTE_COURANT` (ligne 81-88)
- `MOCK_COMPTE_TRAVAUX` (ligne 90-97)
- `MOCK_MOUVEMENTS_BASE` (ligne 99-239)
- `MOCK_MOUVEMENTS_TRAVAUX` (ligne 241-315)
- `MOCK_ECRITURES_COMPTABLES` (ligne 317-326)
- `MOCK_APPELS_EN_ATTENTE` (ligne 11-17)
- `MOCK_FACTURES_EN_ATTENTE` (ligne 19-23)
- `FOURNISSEURS_CONNUS` (ligne 25-31)

**Conserver** (données de référence universelles) :
- `PLAN_COMPTABLE_ESSENTIEL`
- `HEURISTIQUES_LIBELLE`
- `MOTS_CLES_DETECTION`

- [ ] **Step 2: Supprimer les imports obsolètes dans le hook et partout**

Chercher et supprimer tous les imports de ces constantes supprimées dans tout le projet.

- [ ] **Step 3: Vérifier le build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(bank): remove all mock data — 100% Supabase"
```

- [ ] **Step 5: Code review Task 5**

---

## Task 6: Vérification end-to-end

- [ ] **Step 1: Tester en local**

1. `npm run dev`
2. Se connecter → Portefeuille → Cliquer "Résidence Les Jardins d'Émeraude"
3. Vérifier le dashboard : trésorerie = solde réel, budget = 23 200 €
4. Aller sur Finance → Mouvements bancaires
5. Vérifier : comptes CC et FT avec vrais soldes
6. Vérifier : mouvements filtrés par compte
7. Tester catégorisation : les suggestions proposent les vrais fournisseurs
8. Tester rapprochement : les suggestions proposent les vraies factures

- [ ] **Step 2: Commit final + push**

```bash
git add -A
git commit -m "feat(bank): mouvements bancaires 100% Supabase — comptes, soldes, catégorisation, rapprochement"
git push origin v2
```
