# Refonte Factures Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la page Factures avec une vue Kanban par statut (défaut) + Table enrichie (toggle), dans le dark theme v2 cohérent avec comptabilité/budgets/appels-fonds.

**Architecture:** Nouveau dossier `src/features/finance/factures/` avec composants co-localisés (pattern v2). Hook de composition `useFacturesPageV2()` qui enveloppe le hook existant sans le modifier. Les composants et modales existants dans `src/components/features/finance/Factures/` restent en place — seul leur CSS est mis à jour.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules, clsx, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-16-factures-refonte-design.md`

---

## Chunk 1: Structure, types et hook de composition

### Task 1: Créer la structure du dossier et les types Kanban

**Files:**
- Create: `src/features/finance/factures/types.ts`
- Create: `src/features/finance/factures/index.ts`
- Create: `src/features/finance/factures/components/index.ts`
- Create: `src/features/finance/factures/hooks/index.ts`

- [ ] **Step 1: Créer `src/features/finance/factures/types.ts`**

```typescript
import type { Facture, StatutFacture, FacturesKPIData } from '@/components/features/finance/Factures/types';

export type { Facture, StatutFacture, FacturesKPIData };

export type FacturesViewMode = 'kanban' | 'table';

export type KanbanColumnId = 'overdue' | 'pending' | 'to_pay' | 'paid';

export interface KanbanColumn {
  id: KanbanColumnId;
  label: string;
  color: string;
  dotColor: string;
  factures: Facture[];
  total: number;
}
```

- [ ] **Step 2: Créer les barrel exports**

`src/features/finance/factures/hooks/index.ts`:
```typescript
export { useFacturesPageV2 } from './useFacturesPageV2';
```

`src/features/finance/factures/components/index.ts`:
```typescript
// Sera rempli au fur et à mesure des tasks suivantes
```

`src/features/finance/factures/index.ts`:
```typescript
export * from './hooks';
export * from './components';
export * from './types';
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/factures/
git commit -m "feat(factures): scaffold feature folder with Kanban types"
```

---

### Task 2: Créer le hook `useFacturesPageV2`

**Files:**
- Create: `src/features/finance/factures/hooks/useFacturesPageV2.ts`
- Modify: `src/features/finance/factures/hooks/index.ts`

- [ ] **Step 1: Créer le hook de composition**

```typescript
'use client';

import { useState, useMemo } from 'react';
import { useFacturesPage } from '@/features/finance/invoices/useFacturesPage';
import { isFactureEnRetard } from '@/components/features/finance/Factures/types';
import type { Facture, FacturesViewMode, KanbanColumn, KanbanColumnId } from '../types';

const KANBAN_COLUMNS_CONFIG: { id: KanbanColumnId; label: string; color: string; dotColor: string }[] = [
  { id: 'overdue', label: 'En retard', color: '#ef4444', dotColor: '#ef4444' },
  { id: 'pending', label: 'En attente', color: '#3b82f6', dotColor: '#3b82f6' },
  { id: 'to_pay', label: 'À payer', color: '#f59e0b', dotColor: '#f59e0b' },
  { id: 'paid', label: 'Payées', color: '#22c55e', dotColor: '#22c55e' },
];

function classifyFacture(facture: Facture): KanbanColumnId {
  if (isFactureEnRetard(facture)) return 'overdue';
  if (facture.statut === 'PAYEE') return 'paid';
  if (facture.statut === 'A_PAYER') return 'to_pay';
  return 'pending'; // BROUILLON, A_VALIDER, VALIDEE
}

export function useFacturesPageV2() {
  const page = useFacturesPage();
  const [viewMode, setViewMode] = useState<FacturesViewMode>('kanban');

  // Kanban columns — derived from all factures (excluding avoirs), ignoring statut filter
  const kanbanColumns: KanbanColumn[] = useMemo(() => {
    const facturesOnly = page.factures.filter(
      (f: Facture) => f.typeDocument === 'FACTURE'
    );

    // Apply search/fournisseur/period filters but NOT statut filter
    const filtered = facturesOnly.filter((f: Facture) => {
      const matchesSearch = !page.searchTerm ||
        f.fournisseur.toLowerCase().includes(page.searchTerm.toLowerCase()) ||
        f.reference.toLowerCase().includes(page.searchTerm.toLowerCase()) ||
        f.montant.toString().includes(page.searchTerm);
      const matchesFournisseur = !page.fournisseurFilter || f.fournisseur === page.fournisseurFilter;
      return matchesSearch && matchesFournisseur;
    });

    const groups: Record<KanbanColumnId, Facture[]> = {
      overdue: [],
      pending: [],
      to_pay: [],
      paid: [],
    };

    for (const f of filtered) {
      groups[classifyFacture(f)].push(f);
    }

    return KANBAN_COLUMNS_CONFIG.map(col => ({
      ...col,
      factures: groups[col.id],
      total: groups[col.id].reduce((sum, f) => sum + f.montant, 0),
    }));
  }, [page.factures, page.searchTerm, page.fournisseurFilter]);

  // Computed KPI: montant payé
  const montantPaye = useMemo(() => {
    const payees = page.factures.filter(
      (f: Facture) => f.typeDocument === 'FACTURE' && f.statut === 'PAYEE'
    );
    return payees.reduce((sum: number, f: Facture) => sum + f.montant, 0);
  }, [page.factures]);

  return {
    ...page,
    viewMode,
    setViewMode,
    kanbanColumns,
    montantPaye,
  };
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep -i factures`
Expected: aucune erreur liée aux fichiers factures

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/factures/hooks/
git commit -m "feat(factures): add useFacturesPageV2 composition hook with Kanban grouping"
```

---

## Chunk 2: Composants Header et Toggle

### Task 3: Créer FacturesViewToggle

**Files:**
- Create: `src/features/finance/factures/components/FacturesViewToggle.tsx`
- Create: `src/features/finance/factures/components/FacturesViewToggle.module.css`

- [ ] **Step 1: Créer le CSS**

```css
.toggle {
  display: flex;
  gap: 0;
  background: #1a1d2e;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  overflow: hidden;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border: none;
  background: none;
  font-family: inherit;
  transition: all 150ms;
}

.btn:hover {
  color: #94a3b8;
}

.active {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}
```

- [ ] **Step 2: Créer le composant**

```typescript
'use client';

import { LayoutList, Columns3 } from 'lucide-react';
import clsx from 'clsx';
import type { FacturesViewMode } from '../types';
import styles from './FacturesViewToggle.module.css';

interface FacturesViewToggleProps {
  viewMode: FacturesViewMode;
  onViewModeChange: (mode: FacturesViewMode) => void;
}

export function FacturesViewToggle({ viewMode, onViewModeChange }: FacturesViewToggleProps) {
  return (
    <div className={styles.toggle}>
      <button
        className={clsx(styles.btn, viewMode === 'table' && styles.active)}
        onClick={() => onViewModeChange('table')}
      >
        <LayoutList size={14} /> Table
      </button>
      <button
        className={clsx(styles.btn, viewMode === 'kanban' && styles.active)}
        onClick={() => onViewModeChange('kanban')}
      >
        <Columns3 size={14} /> Kanban
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/factures/components/FacturesViewToggle*
git commit -m "feat(factures): add FacturesViewToggle component"
```

---

### Task 4: Créer FacturesPageHeader

**Files:**
- Create: `src/features/finance/factures/components/FacturesPageHeader.tsx`
- Create: `src/features/finance/factures/components/FacturesPageHeader.module.css`

- [ ] **Step 1: Créer le CSS**

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.left {}

.title {
  font-size: 20px;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: -0.025em;
}

.kpis {
  display: flex;
  gap: 16px;
  margin-top: 4px;
}

.kpiItem {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
}

.kpiNum {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.kpiLabel {
  color: #64748b;
  font-size: 12px;
}

.blue { color: #3b82f6; }
.green { color: #22c55e; }
.red { color: #ef4444; }

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btnGhost {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms;
}

.btnGhost:hover {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.25);
}

.btnPrimary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 200ms;
}

.btnPrimary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

@media (max-width: 768px) {
  .header { flex-direction: column; gap: 12px; align-items: flex-start; }
  .actions { width: 100%; flex-wrap: wrap; }
}
```

- [ ] **Step 2: Créer le composant**

```typescript
'use client';

import { Download, Plus } from 'lucide-react';
import clsx from 'clsx';
import type { FacturesViewMode } from '../types';
import type { FacturesKPIData } from '@/components/features/finance/Factures/types';
import { FacturesViewToggle } from './FacturesViewToggle';
import styles from './FacturesPageHeader.module.css';

interface FacturesPageHeaderProps {
  kpiData: FacturesKPIData;
  montantPaye: number;
  viewMode: FacturesViewMode;
  onViewModeChange: (mode: FacturesViewMode) => void;
  onNewFacture: () => void;
  onExport: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function FacturesPageHeader({
  kpiData,
  montantPaye,
  viewMode,
  onViewModeChange,
  onNewFacture,
  onExport,
}: FacturesPageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>Factures fournisseurs</h1>
        <div className={styles.kpis}>
          <div className={styles.kpiItem}>
            <span className={clsx(styles.kpiNum, styles.blue)}>{kpiData.nombreFactures}</span>
            <span className={styles.kpiLabel}>factures</span>
          </div>
          <div className={styles.kpiItem}>
            <span className={clsx(styles.kpiNum, styles.green)}>{formatCurrency(montantPaye)}</span>
            <span className={styles.kpiLabel}>payé</span>
          </div>
          <div className={styles.kpiItem}>
            <span className={clsx(styles.kpiNum, styles.red)}>{formatCurrency(kpiData.montantEchu)}</span>
            <span className={styles.kpiLabel}>en retard</span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <FacturesViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <button className={styles.btnGhost} onClick={onExport}>
          <Download size={14} /> Export
        </button>
        <button className={styles.btnPrimary} onClick={onNewFacture}>
          <Plus size={14} /> Nouvelle facture
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mettre à jour le barrel export**

Ajouter dans `src/features/finance/factures/components/index.ts`:
```typescript
export { FacturesViewToggle } from './FacturesViewToggle';
export { FacturesPageHeader } from './FacturesPageHeader';
```

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/factures/components/FacturesPageHeader* src/features/finance/factures/components/FacturesViewToggle* src/features/finance/factures/components/index.ts
git commit -m "feat(factures): add FacturesPageHeader with KPIs inline and view toggle"
```

---

## Chunk 3: Vue Kanban

### Task 5: Créer FacturesKanbanCard

**Files:**
- Create: `src/features/finance/factures/components/FacturesKanbanCard.tsx`
- Create: `src/features/finance/factures/components/FacturesKanban.module.css`

- [ ] **Step 1: Créer le CSS Kanban (cards + colonnes + grille)**

```css
/* ── Grid ── */
.columns {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* ── Column ── */
.column {
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  padding: 14px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.colHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.colTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.colDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.colCount {
  font-size: 11px;
  color: #64748b;
  padding: 2px 8px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 10px;
}

.colTotal {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.colBody {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Card ── */
.card {
  padding: 12px;
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.06);
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms;
}

.card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.cardOverdue {
  border-left: 3px solid #ef4444;
}

.cardPaid {
  opacity: 0.7;
}

.cardTop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.cardSupplier {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.cardAmount {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e2e8f0;
}

.cardRef {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 6px;
}

.cardBottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cardDate {
  font-size: 11px;
  color: #475569;
}

.cardUrgent {
  font-size: 10px;
  color: #ef4444;
  font-weight: 600;
}

.cardPoste {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(148, 163, 184, 0.08);
  border-radius: 10px;
  color: #94a3b8;
}

/* Color overrides */
.amountRed { color: #ef4444; }
.amountGreen { color: #22c55e; }
.totalRed { color: #ef4444; }
.totalAmber { color: #f59e0b; }
.totalBlue { color: #3b82f6; }
.totalGreen { color: #22c55e; }

/* ── Empty ── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #475569;
  font-size: 12px;
  text-align: center;
  flex: 1;
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .columns { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .columns { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Créer FacturesKanbanCard**

```typescript
'use client';

import clsx from 'clsx';
import type { Facture } from '@/components/features/finance/Factures/types';
import { isFactureEnRetard, getJoursAvantEcheance } from '@/components/features/finance/Factures/types';
import { POSTE_BUDGET_LABELS } from '@/components/features/finance/Factures/utils';
import type { KanbanColumnId } from '../types';
import styles from './FacturesKanban.module.css';

interface FacturesKanbanCardProps {
  facture: Facture;
  columnId: KanbanColumnId;
  onClick: (facture: Facture) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function FacturesKanbanCard({ facture, columnId, onClick }: FacturesKanbanCardProps) {
  const isOverdue = isFactureEnRetard(facture);
  const joursRetard = isOverdue ? Math.abs(getJoursAvantEcheance(facture.dateEcheance)) : 0;
  const isPaid = facture.statut === 'PAYEE';

  return (
    <div
      className={clsx(
        styles.card,
        columnId === 'overdue' && styles.cardOverdue,
        isPaid && styles.cardPaid,
      )}
      onClick={() => onClick(facture)}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardSupplier}>{facture.fournisseur}</div>
        <div className={clsx(
          styles.cardAmount,
          columnId === 'overdue' && styles.amountRed,
          isPaid && styles.amountGreen,
        )}>
          {formatCurrency(facture.montant)}
        </div>
      </div>
      <div className={styles.cardRef}>{facture.reference}</div>
      <div className={styles.cardBottom}>
        {isOverdue ? (
          <div className={styles.cardUrgent}>⚠ {joursRetard}j de retard</div>
        ) : isPaid ? (
          <div className={styles.cardDate}>✓ {facture.datePaiement ? formatDateShort(facture.datePaiement) : 'Payée'}</div>
        ) : (
          <div className={styles.cardDate}>Éch. {formatDateShort(facture.dateEcheance)}</div>
        )}
        {facture.posteBudgetaire && (
          <div className={styles.cardPoste}>
            {POSTE_BUDGET_LABELS[facture.posteBudgetaire] ?? facture.posteBudgetaire}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/factures/components/FacturesKanban* src/features/finance/factures/components/FacturesKanbanCard*
git commit -m "feat(factures): add FacturesKanbanCard + Kanban CSS"
```

---

### Task 6: Créer FacturesKanbanColumn et FacturesKanbanView

**Files:**
- Create: `src/features/finance/factures/components/FacturesKanbanColumn.tsx`
- Create: `src/features/finance/factures/components/FacturesKanbanView.tsx`

- [ ] **Step 1: Créer FacturesKanbanColumn**

```typescript
'use client';

import { FileText } from 'lucide-react';
import clsx from 'clsx';
import type { Facture } from '@/components/features/finance/Factures/types';
import type { KanbanColumn } from '../types';
import { FacturesKanbanCard } from './FacturesKanbanCard';
import styles from './FacturesKanban.module.css';

interface FacturesKanbanColumnProps {
  column: KanbanColumn;
  onCardClick: (facture: Facture) => void;
}

const TOTAL_COLOR_MAP: Record<string, string> = {
  overdue: styles.totalRed,
  pending: styles.totalBlue,
  to_pay: styles.totalAmber,
  paid: styles.totalGreen,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function FacturesKanbanColumn({ column, onCardClick }: FacturesKanbanColumnProps) {
  return (
    <div className={styles.column}>
      <div className={styles.colHeader}>
        <div className={styles.colTitle}>
          <div className={styles.colDot} style={{ background: column.dotColor }} />
          {column.label}
          <span className={styles.colCount}>{column.factures.length}</span>
        </div>
        <div className={clsx(styles.colTotal, TOTAL_COLOR_MAP[column.id])}>
          {formatCurrency(column.total)}
        </div>
      </div>
      <div className={styles.colBody}>
        {column.factures.length === 0 ? (
          <div className={styles.empty}>
            <FileText size={20} style={{ marginBottom: 8, opacity: 0.5 }} />
            Aucune facture
          </div>
        ) : (
          column.factures.map(facture => (
            <FacturesKanbanCard
              key={facture.id}
              facture={facture}
              columnId={column.id}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Créer FacturesKanbanView**

```typescript
'use client';

import type { Facture } from '@/components/features/finance/Factures/types';
import type { KanbanColumn } from '../types';
import { FacturesKanbanColumn } from './FacturesKanbanColumn';
import styles from './FacturesKanban.module.css';

interface FacturesKanbanViewProps {
  columns: KanbanColumn[];
  onCardClick: (facture: Facture) => void;
}

export function FacturesKanbanView({ columns, onCardClick }: FacturesKanbanViewProps) {
  return (
    <div className={styles.columns}>
      {columns.map(column => (
        <FacturesKanbanColumn
          key={column.id}
          column={column}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Mettre à jour le barrel export**

`src/features/finance/factures/components/index.ts`:
```typescript
export { FacturesViewToggle } from './FacturesViewToggle';
export { FacturesPageHeader } from './FacturesPageHeader';
export { FacturesKanbanCard } from './FacturesKanbanCard';
export { FacturesKanbanColumn } from './FacturesKanbanColumn';
export { FacturesKanbanView } from './FacturesKanbanView';
```

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/factures/components/
git commit -m "feat(factures): add FacturesKanbanColumn + FacturesKanbanView"
```

---

## Chunk 4: Vue Table et Rewire Page

### Task 7: Créer FacturesTableView

**Files:**
- Create: `src/features/finance/factures/components/FacturesTableView.tsx`
- Create: `src/features/finance/factures/components/FacturesTableView.module.css`

- [ ] **Step 1: Créer le CSS Table dark theme**

```css
.container {}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.searchBar {
  flex: 1;
  min-width: 240px;
  padding: 8px 14px;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  font-family: inherit;
  transition: border-color 150ms;
}

.searchBar::placeholder { color: #64748b; }
.searchBar:focus { outline: none; border-color: rgba(59, 130, 246, 0.4); }

.chip {
  padding: 6px 14px;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 20px;
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 150ms;
  white-space: nowrap;
}

.chip:hover { color: #e2e8f0; }

.chipActive {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

@media (max-width: 768px) {
  .filters { flex-direction: column; }
  .searchBar { min-width: auto; width: 100%; }
}
```

- [ ] **Step 2: Créer le composant wrapper**

Le `FacturesTableView` réutilise les composants existants `FacturesFilters` et `FacturesTable` (déjà fonctionnels) avec une barre de filtres redesignée.

```typescript
'use client';

import { FacturesFilters } from '@/components/features/finance/Factures/FacturesFilters';
import { FacturesTable } from '@/components/features/finance/Factures/FacturesTable';
import type { useFacturesPage } from '@/features/finance/invoices/useFacturesPage';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import styles from './FacturesTableView.module.css';

interface FacturesTableViewProps {
  page: ReturnType<typeof useFacturesPage>;
  postesBudget: PosteBudgetData[];
}

export function FacturesTableView({ page, postesBudget }: FacturesTableViewProps) {
  return (
    <div className={styles.container}>
      <FacturesFilters
        searchTerm={page.searchTerm}
        onSearchChange={page.setSearchTerm}
        statutFilter={page.statutFilter}
        onStatutFilterChange={page.handleStatutFilterChange}
        sortOrder={page.sortOrder}
        onSortOrderChange={() => page.setSortOrder((prev: string) => prev === 'DESC' ? 'ASC' : 'DESC')}
        fournisseurFilter={page.fournisseurFilter}
        onFournisseurFilterChange={page.setFournisseurFilter}
        fournisseurs={page.fournisseurs}
        periodeFilter={page.periodeFilter}
        onPeriodeFilterChange={page.setPeriodeFilter}
      />
      <FacturesTable
        factures={page.filteredFactures}
        postesBudget={postesBudget}
        onStatutClick={page.handleStatutClick}
        onCategorize={page.handleCategorize}
        onView={page.handleView}
        onEdit={page.handleEdit}
        onDelete={page.handleDelete}
        onCreateAvoir={page.handleCreateAvoir}
        onViewPJ={page.handleView}
        sortColumn={page.sortColumn}
        sortDirection={page.sortDirection}
        onSort={page.handleSort}
      />
    </div>
  );
}
```

- [ ] **Step 3: Mettre à jour le barrel export**

Ajouter dans `src/features/finance/factures/components/index.ts`:
```typescript
export { FacturesTableView } from './FacturesTableView';
```

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/factures/components/FacturesTableView*
git commit -m "feat(factures): add FacturesTableView wrapper for existing table + filters"
```

---

### Task 8: Rewire la page principale

**Files:**
- Modify: `src/app/(dashboard)/finance/factures/page.tsx`

- [ ] **Step 1: Réécrire page.tsx**

Remplacer le contenu de `src/app/(dashboard)/finance/factures/page.tsx` par :

```typescript
'use client';

import { useFacturesPageV2 } from '@/features/finance/factures';
import {
  FacturesPageHeader,
  FacturesKanbanView,
  FacturesTableView,
} from '@/features/finance/factures';
import { PaymentModal } from '@/components/features/finance/Factures/modals/PaymentModal';
import { AccountingModal } from '@/components/features/finance/Factures/modals/AccountingModal';
import { ViewModal } from '@/components/features/finance/Factures/modals/ViewModal';
import { EditModal } from '@/components/features/finance/Factures/modals/EditModal';
import { DeleteModal } from '@/components/features/finance/Factures/modals/DeleteModal';
import { NewFactureModal } from '@/components/features/finance/Factures/modals/NewFactureModal';
import { AvoirModal } from '@/components/features/finance/Factures/modals/AvoirModal';
import { useBudget } from '@/hooks/modules/useBudget';

export default function FacturesPage() {
  const page = useFacturesPageV2();
  const { postesBudget } = useBudget();

  if (page.isLoading) {
    return (
      <div style={{ padding: 'var(--space-xl)', color: '#94a3b8', textAlign: 'center' }}>
        Chargement des factures...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 'var(--space-xl)' }}>
      <FacturesPageHeader
        kpiData={page.kpiData}
        montantPaye={page.montantPaye}
        viewMode={page.viewMode}
        onViewModeChange={page.setViewMode}
        onNewFacture={page.handleNewFacture}
        onExport={() => {/* TODO */}}
      />

      {page.viewMode === 'kanban' ? (
        <FacturesKanbanView
          columns={page.kanbanColumns}
          onCardClick={page.handleView}
        />
      ) : (
        <FacturesTableView page={page} postesBudget={postesBudget} />
      )}

      {page.showPaymentModal && page.selectedFacture && (
        <PaymentModal facture={page.selectedFacture} onClose={page.closePaymentModal} onPaymentComplete={page.handlePaymentComplete} />
      )}
      {page.showAccountingModal && page.selectedFacture && (
        <AccountingModal facture={page.selectedFacture} selectedTypeDepense={page.selectedTypeDepense} onTypeDepenseChange={page.setSelectedTypeDepense} onClose={page.closeAccountingModal} onSend={page.handleSendToAccounting} />
      )}
      {page.showViewModal && page.selectedFacture && (
        <ViewModal facture={page.selectedFacture} onClose={page.closeViewModal} />
      )}
      {page.showEditModal && page.selectedFacture && (
        <EditModal facture={page.selectedFacture} editForm={page.editForm} postesBudget={postesBudget} onEditFormChange={page.setEditForm} onClose={page.closeEditModal} onSave={page.handleSaveEdit} />
      )}
      {page.showDeleteModal && page.selectedFacture && (
        <DeleteModal facture={page.selectedFacture} onClose={page.closeDeleteModal} onConfirm={page.handleConfirmDelete} />
      )}
      {page.showNewModal && (
        <NewFactureModal
          form={page.newFactureForm}
          postesBudget={postesBudget}
          suppliers={page.suppliers}
          createError={page.createError}
          isCreating={page.isMutating}
          onFormChange={page.setNewFactureForm}
          onClose={() => { page.clearCreateError(); page.closeNewModal(); }}
          onCreate={page.handleCreateFacture}
        />
      )}
      {page.showAvoirModal && page.selectedFacture && (
        <AvoirModal facture={page.selectedFacture} onClose={page.closeAvoirModal} onConfirm={page.handleConfirmAvoir} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit 2>&1 | grep -i factures`
Expected: aucune erreur liée aux fichiers factures

- [ ] **Step 3: Tester manuellement dans le navigateur**

Naviguer sur http://localhost:3000/finance/factures :
- La vue Kanban doit s'afficher par défaut avec 4 colonnes
- Le toggle Table/Kanban doit fonctionner
- Les KPIs inline doivent afficher les bons chiffres
- Le clic sur une card doit ouvrir la ViewModal

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/factures/page.tsx
git commit -m "feat(factures): rewire page with Kanban/Table toggle and new header"
```

---

## Chunk 5: Nettoyage et polish

### Task 9: Supprimer l'ancien CSS inutilisé

**Files:**
- Delete: `src/app/(dashboard)/finance/factures/factures.module.css` (si plus importé)

- [ ] **Step 1: Vérifier que l'ancien CSS n'est plus importé**

Run: `grep -r "factures.module.css" src/app/(dashboard)/finance/factures/`
Expected: aucun résultat (l'import a été supprimé dans le rewire)

- [ ] **Step 2: Supprimer le fichier**

```bash
rm src/app/(dashboard)/finance/factures/factures.module.css
```

- [ ] **Step 3: Commit**

```bash
git add -u src/app/(dashboard)/finance/factures/
git commit -m "chore(factures): remove legacy factures.module.css"
```

---

### Task 10: Vérification finale et test complet

- [ ] **Step 1: Vérifier la compilation TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep -v __tests__`
Expected: aucune erreur (les erreurs test runner pré-existantes sont exclues)

- [ ] **Step 2: Tester la vue Kanban**

Sur http://localhost:3000/finance/factures :
- [ ] 4 colonnes affichées (En retard, En attente, À payer, Payées)
- [ ] Les factures en retard ont un border-left rouge
- [ ] Les factures payées sont en opacity réduite
- [ ] Les KPIs header sont cohérents avec les colonnes
- [ ] Clic sur une card ouvre la ViewModal

- [ ] **Step 3: Tester la vue Table**

- [ ] Clic sur "Table" dans le toggle affiche la vue table
- [ ] Filtres et tri fonctionnent
- [ ] Retour sur "Kanban" fonctionne

- [ ] **Step 4: Tester responsive**

- [ ] Sur écran moyen (< 1024px) : 2 colonnes Kanban
- [ ] Sur mobile (< 640px) : 1 colonne Kanban

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(factures): refonte complète — Kanban par statut + Table toggle + dark theme v2"
```
