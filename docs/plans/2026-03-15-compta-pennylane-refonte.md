# Refonte Comptabilité V1 — Pennylane Style

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre l'UI comptabilité existante en style Pennylane — sidebar verticale dédiée, top bar sticky, KPI strip, view mode switcher, tables avec groupes par compte.

**Architecture:** Remplacer le layout horizontal tabs actuel par un split layout (sidebar verticale 220px | zone principale). La sidebar remplace `ComptaTabs`, un `ComptaTopBar` sticky remplace `ComptaHeader`, et un `ComptaKpiStrip` compact remplace `ComptaStats`. Le Grand Livre gagne un sélecteur de vue (par compte / chronologique / par journal). Toute la data layer (hooks, API, types) reste inchangée.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules (variables CSS custom, pas de Tailwind), Lucide React icons.

**Référence visuelle:** `.planning/preview-compta-v1.html`

---

## Chunk 1: Layout + Sidebar + TopBar

### Task 1: ComptaSidebar — Navigation verticale

**Files:**
- Create: `src/components/features/finance/Comptabilite/ComptaSidebar.tsx`
- Create: `src/components/features/finance/Comptabilite/ComptaSidebar.module.css`
- Modify: `src/components/features/finance/Comptabilite/index.ts`

- [ ] **Step 1: Create ComptaSidebar component**

```tsx
// src/components/features/finance/Comptabilite/ComptaSidebar.tsx
'use client';

import {
  FileText, BookOpen, Scale, Wallet,
  FileSpreadsheet, ClipboardList, HardHat, Users,
  Lock, History
} from 'lucide-react';
import type { TabCompta } from './types';
import styles from './ComptaSidebar.module.css';

interface ComptaSidebarProps {
  activeTab: TabCompta;
  onTabChange: (tab: TabCompta) => void;
  onShowCloture?: () => void;
  onShowHistorique?: () => void;
  isReadOnly?: boolean;
}

const MAIN_ITEMS: { id: TabCompta; label: string; icon: React.ReactNode }[] = [
  { id: 'grand-livre', label: 'Grand Livre', icon: <FileText size={16} /> },
  { id: 'livre-comptable', label: 'Livre comptable', icon: <BookOpen size={16} /> },
  { id: 'balance', label: 'Balance', icon: <Scale size={16} /> },
];

const DOC_ITEMS: { id: TabCompta; label: string; icon: React.ReactNode }[] = [
  { id: 'compte-gestion', label: 'Compte de gestion', icon: <Wallet size={16} /> },
  { id: 'annexe-1', label: 'Annexe 1 — État financier', icon: <FileSpreadsheet size={14} /> },
  { id: 'annexe-2', label: 'Annexe 2 — Gestion', icon: <FileSpreadsheet size={14} /> },
  { id: 'annexe-3', label: 'Annexe 3 — Clés', icon: <ClipboardList size={14} /> },
  { id: 'annexe-4', label: 'Annexe 4 — Travaux', icon: <HardHat size={14} /> },
  { id: 'annexe-5', label: 'Annexe 5 — Non clôturés', icon: <Users size={14} /> },
];

export function ComptaSidebar({
  activeTab,
  onTabChange,
  onShowCloture,
  onShowHistorique,
  isReadOnly,
}: ComptaSidebarProps) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.sidebarTitle}>Comptabilité</div>

      {MAIN_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`${styles.sidebarItem} ${activeTab === item.id ? styles.active : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className={styles.divider} />
      <div className={styles.sectionLabel}>Documents légaux</div>

      {DOC_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`${styles.sidebarItem} ${activeTab === item.id ? styles.active : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className={styles.divider} />

      {!isReadOnly && onShowCloture && (
        <button className={styles.sidebarItem} onClick={onShowCloture}>
          <span className={styles.icon}><Lock size={16} /></span>
          Clôture exercice
        </button>
      )}
      {onShowHistorique && (
        <button className={styles.sidebarItem} onClick={onShowHistorique}>
          <span className={styles.icon}><History size={16} /></span>
          Historique
        </button>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Create ComptaSidebar CSS Module**

```css
/* src/components/features/finance/Comptabilite/ComptaSidebar.module.css */
.sidebar {
  width: 220px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-light);
  padding: var(--space-lg) 0;
  flex-shrink: 0;
  overflow-y: auto;
  height: 100%;
}

.sidebarTitle {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  padding: 0 var(--space-md);
  margin-bottom: var(--space-md);
}

.sidebarItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px var(--space-md);
  width: 100%;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms;
  border: none;
  border-left: 3px solid transparent;
  background: none;
  text-align: left;
}

.sidebarItem:hover {
  color: var(--text-main);
  background: rgba(148, 163, 184, 0.06);
}

.active {
  color: var(--primary);
  background: rgba(59, 130, 246, 0.08);
  border-left-color: var(--primary);
  font-weight: 600;
}

.icon {
  width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.divider {
  height: 1px;
  background: var(--border-light);
  margin: var(--space-md) 0;
}

.sectionLabel {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  padding: 0 var(--space-md);
  margin: var(--space-sm) 0;
}
```

- [ ] **Step 3: Export ComptaSidebar from index**

Add to `src/components/features/finance/Comptabilite/index.ts`:
```ts
export { ComptaSidebar } from './ComptaSidebar';
```

- [ ] **Step 4: Commit**

```bash
git add src/components/features/finance/Comptabilite/ComptaSidebar.tsx \
        src/components/features/finance/Comptabilite/ComptaSidebar.module.css \
        src/components/features/finance/Comptabilite/index.ts
git commit -m "feat(compta): add vertical ComptaSidebar component (Pennylane style)"
```

---

### Task 2: ComptaTopBar — Barre supérieure sticky

**Files:**
- Create: `src/components/features/finance/Comptabilite/ComptaTopBar.tsx`
- Create: `src/components/features/finance/Comptabilite/ComptaTopBar.module.css`
- Modify: `src/components/features/finance/Comptabilite/index.ts`

- [ ] **Step 1: Create ComptaTopBar component**

```tsx
// src/components/features/finance/Comptabilite/ComptaTopBar.tsx
'use client';

import { Download, FileSpreadsheet, Copy, Lock, CircleDot } from 'lucide-react';
import type { TabCompta } from './types';
import styles from './ComptaTopBar.module.css';

interface ComptaTopBarProps {
  activeTab: TabCompta;
  periodName?: string;
  periodStart?: string;
  periodEnd?: string;
  periodStatus?: string;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onShowCloture?: () => void;
  isReadOnly?: boolean;
}

const TAB_TITLES: Record<TabCompta, string> = {
  'grand-livre': 'Grand Livre',
  'livre-comptable': 'Livre comptable',
  'balance': 'Balance',
  'compte-gestion': 'Compte de gestion',
  'annexe-1': 'Annexe 1 — État financier',
  'annexe-2': 'Annexe 2 — Gestion courante',
  'annexe-3': 'Annexe 3 — Clés de répartition',
  'annexe-4': 'Annexe 4 — Travaux',
  'annexe-5': 'Annexe 5 — Non clôturés',
};

function formatPeriodLabel(start?: string, end?: string): string {
  if (!start || !end) return '';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const year = startDate.getFullYear();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Exercice ${year} — ${fmt(startDate)} au ${fmt(endDate)}`;
}

export function ComptaTopBar({
  activeTab,
  periodStart,
  periodEnd,
  periodStatus,
  onExportPDF,
  onExportExcel,
  onShowCloture,
  isReadOnly,
}: ComptaTopBarProps) {
  const title = TAB_TITLES[activeTab] || 'Comptabilité';
  const periodLabel = formatPeriodLabel(periodStart, periodEnd);
  const isOpen = periodStatus === 'open';

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>{title}</h1>
        {periodLabel && (
          <div className={styles.periodPill}>
            <span className={`${styles.dot} ${isOpen ? styles.dotOpen : styles.dotClosed}`} />
            {periodLabel}
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.btnIcon} onClick={onExportPDF} title="Export PDF">
          <Download size={16} />
        </button>
        <button className={styles.btnIcon} onClick={onExportExcel} title="Export Excel">
          <FileSpreadsheet size={16} />
        </button>
        <button className={styles.btnIcon} title="Copier">
          <Copy size={16} />
        </button>
        {!isReadOnly && onShowCloture && (
          <button className={styles.btnPrimary} onClick={onShowCloture}>
            <Lock size={14} />
            Clôturer {periodStart ? new Date(periodStart).getFullYear() : ''}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ComptaTopBar CSS Module**

```css
/* src/components/features/finance/Comptabilite/ComptaTopBar.module.css */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-xl);
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.title {
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-main);
  margin: 0;
}

.periodPill {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 6px 14px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 20px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--info);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dotOpen {
  background: var(--success);
}

.dotClosed {
  background: var(--text-tertiary);
}

.actions {
  display: flex;
  gap: var(--space-sm);
}

.btnIcon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
}

.btnIcon:hover {
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-main);
}

.btnPrimary {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  border: none;
  background: var(--primary);
  color: white;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 150ms;
}

.btnPrimary:hover {
  background: var(--primary-hover);
}
```

- [ ] **Step 3: Export ComptaTopBar from index**

Add to `src/components/features/finance/Comptabilite/index.ts`:
```ts
export { ComptaTopBar } from './ComptaTopBar';
```

- [ ] **Step 4: Commit**

```bash
git add src/components/features/finance/Comptabilite/ComptaTopBar.tsx \
        src/components/features/finance/Comptabilite/ComptaTopBar.module.css \
        src/components/features/finance/Comptabilite/index.ts
git commit -m "feat(compta): add sticky ComptaTopBar component (Pennylane style)"
```

---

### Task 3: Refonte layout page comptabilité

**Files:**
- Modify: `src/app/(dashboard)/finance/comptabilite/page.tsx`
- Modify: `src/app/(dashboard)/finance/comptabilite/comptabilite.module.css`

- [ ] **Step 1: Rewrite page.tsx with split layout**

Remplacer le contenu de `page.tsx` par un layout `sidebar | main` :

```tsx
// src/app/(dashboard)/finance/comptabilite/page.tsx
'use client';

import { useComptabilitePage } from '@/features/finance/comptabilite';
import {
  ComptaSidebar,
  ComptaTopBar,
  ComptaStats,
  ComptaFilters,
  ComptaInfoBanner,
  ComptaLoadingState,
  ComptaErrorState,
  ComptaNoPeriodState,
  ComptaTabContent,
  DetailModal,
  ClotureModal,
  HistoriqueModal,
} from '@/components/features/finance/Comptabilite';
import { FinanceAnnexeStats } from '@/components/features/finance/FinanceAnnexeStats';
import styles from './comptabilite.module.css';

export default function ComptabilitePage() {
  const page = useComptabilitePage();

  if (!page.currentCoproId || page.isLoading) {
    return <ComptaLoadingState />;
  }

  if (page.error) {
    return <ComptaErrorState error={page.error} onRetry={page.handleRefresh} />;
  }

  if (!page.openPeriod) {
    return (
      <div className={styles.layout}>
        <ComptaSidebar
          activeTab={page.activeTab}
          onTabChange={page.setActiveTab}
        />
        <div className={styles.main}>
          <ComptaTopBar
            activeTab={page.activeTab}
            onExportPDF={page.exportToPDF}
            onExportExcel={page.exportToExcel}
          />
          <div className={styles.content}>
            <ComptaNoPeriodState />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <ComptaSidebar
        activeTab={page.activeTab}
        onTabChange={page.setActiveTab}
        onShowCloture={() => page.setShowClotureModal(true)}
        onShowHistorique={() => page.setShowHistoriqueModal(true)}
        isReadOnly={page.isReadOnly}
      />

      <div className={styles.main}>
        <ComptaTopBar
          activeTab={page.activeTab}
          periodStart={page.openPeriod.start_date}
          periodEnd={page.openPeriod.end_date}
          periodStatus={page.openPeriod.status}
          onExportPDF={page.exportToPDF}
          onExportExcel={page.exportToExcel}
          onShowCloture={() => page.setShowClotureModal(true)}
          isReadOnly={page.isReadOnly}
        />

        <div className={styles.content}>
          {/* Sélecteur d'exercice (si multiples) */}
          {page.allPeriods.length > 1 && (
            <div className={styles.periodSelector}>
              <select
                className={styles.periodSelect}
                value={page.selectedPeriodId || ''}
                onChange={(e) => page.setSelectedPeriodId(e.target.value)}
              >
                {page.allPeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({period.start_date.slice(0, 4)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <FinanceAnnexeStats periodId={page.selectedPeriodId} />

          {/* KPI strip — à remplacer par ComptaKpiStrip en Task 4 */}
          <ComptaStats
            activeTab={page.activeTab}
            totalDebit={page.totalDebit}
            totalCredit={page.totalCredit}
            totalDepenses={0}
            totalBudgetPrevu={0}
            isBalanced={page.isBalanced}
            ecart={page.ecart}
            balanceStats={page.balanceStats}
          />

          {/* Filters */}
          {(page.activeTab === 'grand-livre' || page.activeTab === 'compte-gestion') && (
            <ComptaFilters
              activeTab={page.activeTab}
              searchTerm={page.searchTerm}
              dateDebut={page.dateDebut}
              dateFin={page.dateFin}
              compteFilter={page.compteFilter}
              typeDepenseFilter={page.typeDepenseFilter}
              comptesUniques={page.comptesUniques}
              onSearchChange={page.setSearchTerm}
              onDateDebutChange={page.setDateDebut}
              onDateFinChange={page.setDateFin}
              onCompteFilterChange={page.setCompteFilter}
              onTypeDepenseFilterChange={page.setTypeDepenseFilter}
            />
          )}

          <ComptaTabContent
            activeTab={page.activeTab}
            operations={page.operations}
            filteredOperations={page.filteredOperations}
            lignesBalance={page.lignesBalance}
            allAccountsWithBalances={page.allAccountsWithBalances}
            annee={page.etatCloture.annee}
            onViewOperationDetail={page.handleViewOperationDetail}
            coproId={page.currentCoproId}
            periodId={page.openPeriod?.id ?? null}
            coproName={page.openPeriod?.name}
          />
        </div>
      </div>

      {/* Modals */}
      <DetailModal
        isOpen={page.showDetailModal}
        onClose={() => page.setShowDetailModal(false)}
        selectedOperation={page.selectedOperation}
        selectedDepense={page.selectedDepense}
      />
      {!page.isReadOnly && (
        <ClotureModal
          isOpen={page.showClotureModal}
          onClose={() => page.setShowClotureModal(false)}
          etatCloture={page.etatCloture}
          mouvementsNonCategorises={page.mouvementsNonCategorises}
          totalDebit={page.totalDebit}
          totalCredit={page.totalCredit}
          isBalanced={page.isBalanced}
          ecart={page.ecart}
          onValiderCloture={page.handleValiderCloture}
        />
      )}
      <HistoriqueModal
        isOpen={page.showHistoriqueModal}
        onClose={() => page.setShowHistoriqueModal(false)}
        historique={page.historique}
      />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite page CSS with Pennylane layout**

Remplacer le CSS de `comptabilite.module.css` (page-level) :

```css
/* src/app/(dashboard)/finance/comptabilite/comptabilite.module.css */

/* Split layout: sidebar + main */
.layout {
  display: flex;
  height: calc(100vh - var(--highbar-height, 48px));
  overflow: hidden;
}

.main {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.content {
  padding: var(--space-lg) var(--space-xl);
  flex: 1;
}

/* Period selector (compact, inline) */
.periodSelector {
  margin-bottom: var(--space-md);
}

.periodSelect {
  padding: 6px var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-main);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}

.periodSelect:focus {
  outline: none;
  border-color: var(--primary);
}

/* Responsive: collapse sidebar on small screens */
@media (max-width: 1024px) {
  .layout {
    flex-direction: column;
    height: auto;
  }

  .main {
    overflow-y: visible;
  }
}
```

- [ ] **Step 3: Verify — run dev server and navigate to /finance/comptabilite**

```bash
npm run dev
# Open http://localhost:3000/finance/comptabilite
# Expected: sidebar on left, main content on right, sticky top bar
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/finance/comptabilite/page.tsx \
        src/app/(dashboard)/finance/comptabilite/comptabilite.module.css
git commit -m "feat(compta): split layout with sidebar + sticky topbar (Pennylane V1)"
```

---

## Chunk 2: KPI Strip + View Switcher

### Task 4: ComptaKpiStrip — Bandeau KPI compact

**Files:**
- Create: `src/components/features/finance/Comptabilite/ComptaKpiStrip.tsx`
- Create: `src/components/features/finance/Comptabilite/ComptaKpiStrip.module.css`
- Modify: `src/components/features/finance/Comptabilite/index.ts`
- Modify: `src/app/(dashboard)/finance/comptabilite/page.tsx` (remplacer ComptaStats par ComptaKpiStrip)

- [ ] **Step 1: Create ComptaKpiStrip component**

```tsx
// src/components/features/finance/Comptabilite/ComptaKpiStrip.tsx
'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from './utils';
import styles from './ComptaKpiStrip.module.css';

interface ComptaKpiStripProps {
  totalDebit: number;
  totalCredit: number;
  ecrituresCount: number;
  isBalanced: boolean;
}

export function ComptaKpiStrip({
  totalDebit,
  totalCredit,
  ecrituresCount,
  isBalanced,
}: ComptaKpiStripProps) {
  return (
    <div className={styles.strip}>
      <div className={styles.card}>
        <div className={styles.label}>Total Débit</div>
        <div className={`${styles.value} ${styles.red}`}>
          {formatCurrency(totalDebit)}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Total Crédit</div>
        <div className={`${styles.value} ${styles.green}`}>
          {formatCurrency(totalCredit)}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Écritures</div>
        <div className={`${styles.value} ${styles.blue}`}>{ecrituresCount}</div>
        <div className={styles.trend}>
          <CheckCircle size={12} /> Toutes comptabilisées
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>État balance</div>
        <div className={`${styles.value} ${isBalanced ? styles.green : styles.red}`}>
          {isBalanced ? 'Équilibrée' : 'Déséquilibrée'}
        </div>
        {!isBalanced && (
          <div className={styles.trendDanger}>
            <AlertCircle size={12} /> Vérifier les écritures
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ComptaKpiStrip CSS Module**

```css
/* src/components/features/finance/Comptabilite/ComptaKpiStrip.module.css */
.strip {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.card {
  flex: 1;
  padding: var(--space-md) var(--space-lg);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
}

.label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.value {
  font-size: var(--text-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.red { color: var(--danger); }
.green { color: var(--success); }
.blue { color: var(--primary); }

.trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--success);
  margin-top: 4px;
}

.trendDanger {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--danger);
  margin-top: 4px;
}

@media (max-width: 900px) {
  .strip {
    flex-wrap: wrap;
  }
  .card {
    flex: 1 1 calc(50% - var(--space-sm));
  }
}
```

- [ ] **Step 3: Wire ComptaKpiStrip into page.tsx**

Dans `page.tsx`, remplacer le bloc `<ComptaStats ... />` par :
```tsx
<ComptaKpiStrip
  totalDebit={page.totalDebit}
  totalCredit={page.totalCredit}
  ecrituresCount={page.filteredOperations.length}
  isBalanced={page.isBalanced}
/>
```

Garder `ComptaStats` importé mais ne plus le rendre dans le layout principal (il reste utilisé dans d'autres tabs si nécessaire).

- [ ] **Step 4: Export + Commit**

```bash
git add src/components/features/finance/Comptabilite/ComptaKpiStrip.tsx \
        src/components/features/finance/Comptabilite/ComptaKpiStrip.module.css \
        src/components/features/finance/Comptabilite/index.ts \
        src/app/(dashboard)/finance/comptabilite/page.tsx
git commit -m "feat(compta): add ComptaKpiStrip — compact KPI cards (Pennylane style)"
```

---

### Task 5: ComptaViewSwitcher — Sélecteur de vue Grand Livre

**Files:**
- Create: `src/components/features/finance/Comptabilite/ComptaViewSwitcher.tsx`
- Create: `src/components/features/finance/Comptabilite/ComptaViewSwitcher.module.css`
- Modify: `src/components/features/finance/Comptabilite/types.ts` (ajouter ViewMode)
- Modify: `src/features/finance/comptabilite/hooks/useComptabilitePage.ts` (ajouter viewMode state)
- Modify: `src/components/features/finance/Comptabilite/index.ts`

- [ ] **Step 1: Add ViewMode type**

Dans `types.ts`, ajouter :
```ts
export type GrandLivreViewMode = 'par-compte' | 'chronologique' | 'par-journal';
```

- [ ] **Step 2: Add viewMode state in hook**

Dans `useComptabilitePage.ts`, ajouter :
```ts
import type { GrandLivreViewMode } from '@/components/features/finance/Comptabilite';

// Après la ligne: const [activeTab, setActiveTab] = useState<TabCompta>('grand-livre');
const [viewMode, setViewMode] = useState<GrandLivreViewMode>('par-compte');
```

Et dans le return :
```ts
viewMode,
setViewMode,
```

- [ ] **Step 3: Create ComptaViewSwitcher component**

```tsx
// src/components/features/finance/Comptabilite/ComptaViewSwitcher.tsx
'use client';

import { Search } from 'lucide-react';
import type { GrandLivreViewMode } from './types';
import styles from './ComptaViewSwitcher.module.css';

interface ComptaViewSwitcherProps {
  viewMode: GrandLivreViewMode;
  onViewModeChange: (mode: GrandLivreViewMode) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  compteFilter: string;
  onCompteFilterChange: (value: string) => void;
  comptesUniques: string[];
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
}

const VIEW_MODES: { id: GrandLivreViewMode; label: string }[] = [
  { id: 'par-compte', label: 'Par compte' },
  { id: 'chronologique', label: 'Chronologique' },
  { id: 'par-journal', label: 'Par journal' },
];

export function ComptaViewSwitcher({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  compteFilter,
  onCompteFilterChange,
  comptesUniques,
  dateFilter,
  onDateFilterChange,
}: ComptaViewSwitcherProps) {
  return (
    <div className={styles.viewBar}>
      <div className={styles.viewModes}>
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.id}
            className={`${styles.viewMode} ${viewMode === mode.id ? styles.active : ''}`}
            onClick={() => onViewModeChange(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <div className={styles.searchInput}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Rechercher libellé, compte..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={compteFilter}
          onChange={(e) => onCompteFilterChange(e.target.value)}
        >
          <option value="TOUS">Tous les comptes</option>
          {comptesUniques.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
        >
          <option value="">Toutes les dates</option>
          <option value="T1">T1 (Jan-Mar)</option>
          <option value="T2">T2 (Avr-Jun)</option>
          <option value="T3">T3 (Jul-Sep)</option>
          <option value="T4">T4 (Oct-Déc)</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ComptaViewSwitcher CSS Module**

```css
/* src/components/features/finance/Comptabilite/ComptaViewSwitcher.module.css */
.viewBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
  gap: var(--space-md);
}

.viewModes {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.viewMode {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-tertiary);
  cursor: pointer;
  border: none;
  background: none;
  transition: all 150ms;
}

.viewMode:hover {
  color: var(--text-main);
}

.active {
  background: var(--primary);
  color: white;
}

.filters {
  display: flex;
  gap: var(--space-sm);
}

.searchInput {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 7px var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  min-width: 220px;
}

.searchInput input {
  border: none;
  background: none;
  outline: none;
  color: var(--text-main);
  font-size: var(--text-xs);
  flex: 1;
}

.searchInput input::placeholder {
  color: var(--text-tertiary);
}

.filterSelect {
  padding: 7px var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
}

.filterSelect:focus {
  outline: none;
  border-color: var(--primary);
}

@media (max-width: 900px) {
  .viewBar {
    flex-direction: column;
    align-items: stretch;
  }
  .filters {
    flex-wrap: wrap;
  }
  .searchInput {
    min-width: auto;
    flex: 1;
  }
}
```

- [ ] **Step 5: Export + Commit**

```bash
git add src/components/features/finance/Comptabilite/ComptaViewSwitcher.tsx \
        src/components/features/finance/Comptabilite/ComptaViewSwitcher.module.css \
        src/components/features/finance/Comptabilite/types.ts \
        src/features/finance/comptabilite/hooks/useComptabilitePage.ts \
        src/components/features/finance/Comptabilite/index.ts
git commit -m "feat(compta): add view mode switcher for Grand Livre (par compte/chrono/journal)"
```

---

## Chunk 3: Grand Livre Table Pennylane Restyle

### Task 6: GrandLivreTable — Vue "Par compte" avec groupes

**Files:**
- Modify: `src/components/features/finance/Comptabilite/GrandLivreTable.tsx`
- Modify: `src/components/features/finance/Comptabilite/Comptabilite.module.css` (ajouter styles Pennylane)

- [ ] **Step 1: Refactor GrandLivreTable pour supporter viewMode**

Ajouter prop `viewMode` et regrouper les opérations par compte quand `viewMode === 'par-compte'` :

```tsx
// src/components/features/finance/Comptabilite/GrandLivreTable.tsx
'use client';

import { useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import type { OperationComptable, GrandLivreViewMode } from './types';
import { formatCurrency, formatDate } from './utils';
import styles from './Comptabilite.module.css';

interface GrandLivreTableProps {
  operations: OperationComptable[];
  onViewDetail: (operation: OperationComptable) => void;
  viewMode?: GrandLivreViewMode;
}

/** Regroupe les opérations par compte, trié par code compte */
function groupByCompte(operations: OperationComptable[]) {
  const groups = new Map<string, { label: string; ops: OperationComptable[] }>();
  for (const op of operations) {
    const existing = groups.get(op.compte);
    if (existing) {
      existing.ops.push(op);
    } else {
      groups.set(op.compte, { label: op.compteLabel, ops: [op] });
    }
  }
  // Trier par code compte
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b));
}

export function GrandLivreTable({
  operations,
  onViewDetail,
  viewMode = 'par-compte',
}: GrandLivreTableProps) {
  const totals = useMemo(() => {
    return operations.reduce(
      (acc, op) => ({
        debit: acc.debit + (op.debit || 0),
        credit: acc.credit + (op.credit || 0),
      }),
      { debit: 0, credit: 0 }
    );
  }, [operations]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;
  const grouped = useMemo(() => groupByCompte(operations), [operations]);

  const renderRow = (op: OperationComptable) => (
    <tr key={op.id} className={styles.glRow} onClick={() => onViewDetail(op)}>
      <td className={styles.mono}>{formatDate(op.date)}</td>
      <td className={styles.mono}>{op.numeroPiece || '—'}</td>
      <td><span className={styles.accountBadge}>{op.compte}</span></td>
      <td className={styles.glLibelle}>{op.libelle}</td>
      <td className={`${styles.textRight} ${styles.mono}`}>
        {op.debit > 0 ? <span className={styles.debit}>{formatCurrency(op.debit)}</span> : '—'}
      </td>
      <td className={`${styles.textRight} ${styles.mono}`}>
        {op.credit > 0 ? <span className={styles.credit}>{formatCurrency(op.credit)}</span> : '—'}
      </td>
      <td className={`${styles.textRight} ${styles.mono} ${styles.glSolde}`}>
        {op.solde !== undefined ? formatCurrency(op.solde) : '—'}
      </td>
      <td>
        <span className={styles.statusPosted}>Posté</span>
      </td>
    </tr>
  );

  if (operations.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Aucune opération trouvée</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.glTable}>
        <thead>
          <tr>
            <th style={{ width: 90 }}>Date</th>
            <th style={{ width: 80 }}>N° Pièce</th>
            <th>Compte</th>
            <th>Libellé</th>
            <th className={styles.textRight} style={{ width: 110 }}>Débit</th>
            <th className={styles.textRight} style={{ width: 110 }}>Crédit</th>
            <th className={styles.textRight} style={{ width: 110 }}>Solde</th>
            <th style={{ width: 70 }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {viewMode === 'par-compte'
            ? grouped.map(([compte, { label, ops }]) => (
                <GroupedSection key={compte} compte={compte} label={label}>
                  {ops.map(renderRow)}
                </GroupedSection>
              ))
            : operations.map(renderRow)
          }
        </tbody>
      </table>

      <div className={styles.tableFooter}>
        <div>
          <span className={styles.footerLabel}>Total Débit :</span>
          <span className={`${styles.mono} ${styles.debit}`}> {formatCurrency(totals.debit)}</span>
        </div>
        <div>
          <span className={styles.footerLabel}>Total Crédit :</span>
          <span className={`${styles.mono} ${styles.credit}`}> {formatCurrency(totals.credit)}</span>
        </div>
        {isBalanced && (
          <div className={styles.equilibre}>
            <CheckCircle size={14} /> Balance équilibrée
          </div>
        )}
      </div>
    </div>
  );
}

function GroupedSection({
  compte,
  label,
  children,
}: {
  compte: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr className={styles.groupHeader}>
        <td colSpan={8}>Compte {compte} — {label}</td>
      </tr>
      {children}
    </>
  );
}
```

- [ ] **Step 2: Add Pennylane table styles to Comptabilite.module.css**

Ajouter ces classes à `Comptabilite.module.css` (ne pas supprimer les anciennes — ajouter en fin de fichier) :

```css
/* ── Pennylane Grand Livre Table ── */
.tableWrap {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.glTable {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}

.glTable th {
  text-align: left;
  padding: 10px var(--space-md);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  background: rgba(148, 163, 184, 0.04);
  border-bottom: 1px solid var(--border-light);
}

.glTable td {
  padding: var(--space-md) var(--space-md);
  border-bottom: 1px solid rgba(148, 163, 184, 0.04);
}

.glRow {
  cursor: pointer;
  transition: background 150ms;
}

.glRow:hover td {
  background: rgba(148, 163, 184, 0.03);
}

.mono {
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.accountBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px var(--space-sm);
  background: rgba(59, 130, 246, 0.1);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--info);
}

.glLibelle {
  font-weight: 500;
}

.glSolde {
  font-weight: 600;
}

.statusPosted {
  padding: 2px var(--space-sm);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(34, 197, 94, 0.1);
  color: var(--success);
}

.statusDraft {
  padding: 2px var(--space-sm);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(148, 163, 184, 0.1);
  color: var(--text-secondary);
}

/* Group header row */
.groupHeader td {
  font-weight: 700;
  color: var(--info);
  font-size: var(--text-xs);
  padding: 10px var(--space-md);
  background: rgba(59, 130, 246, 0.04);
  border-bottom: 1px solid var(--border-light);
}

/* Table footer */
.tableFooter {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-xl);
  padding: 14px var(--space-md);
  background: rgba(148, 163, 184, 0.04);
  border-top: 1px solid var(--border-light);
  font-size: var(--text-xs);
  font-weight: 600;
}

.footerLabel {
  color: var(--text-tertiary);
}

.equilibre {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--success);
  font-size: var(--text-xs);
  font-weight: 600;
}
```

- [ ] **Step 3: Wire viewMode prop from page to GrandLivreTable**

Dans `ComptaTabContent.tsx`, passer `viewMode` au `GrandLivreTable` :

Modifier la signature de `ComptaTabContentProps` :
```ts
viewMode?: GrandLivreViewMode;
```

Et dans le render du `grand-livre` :
```tsx
return <GrandLivreTable operations={filteredOperations} onViewDetail={onViewOperationDetail} viewMode={viewMode} />;
```

Dans `page.tsx`, passer `viewMode` à `ComptaTabContent` :
```tsx
<ComptaTabContent
  ...
  viewMode={page.viewMode}
/>
```

- [ ] **Step 4: Verify + Commit**

```bash
npm run dev
# Vérifier que la vue Grand Livre affiche les groupes par compte
# Vérifier le footer avec totaux et statut balance
git add -A
git commit -m "feat(compta): Grand Livre table with grouped accounts + Pennylane styling"
```

---

## Chunk 4: Intégration finale + Polish

### Task 7: Câbler le ViewSwitcher dans la page

**Files:**
- Modify: `src/app/(dashboard)/finance/comptabilite/page.tsx`

- [ ] **Step 1: Remplacer ComptaFilters par ComptaViewSwitcher pour le Grand Livre**

Dans `page.tsx`, remplacer le bloc ComptaFilters conditionnel par :

```tsx
{page.activeTab === 'grand-livre' && (
  <ComptaViewSwitcher
    viewMode={page.viewMode}
    onViewModeChange={page.setViewMode}
    searchTerm={page.searchTerm}
    onSearchChange={page.setSearchTerm}
    compteFilter={page.compteFilter}
    onCompteFilterChange={page.setCompteFilter}
    comptesUniques={page.comptesUniques}
    dateFilter={page.dateDebut}
    onDateFilterChange={page.setDateDebut}
  />
)}

{page.activeTab === 'compte-gestion' && (
  <ComptaFilters
    activeTab={page.activeTab}
    searchTerm={page.searchTerm}
    dateDebut={page.dateDebut}
    dateFin={page.dateFin}
    compteFilter={page.compteFilter}
    typeDepenseFilter={page.typeDepenseFilter}
    comptesUniques={page.comptesUniques}
    onSearchChange={page.setSearchTerm}
    onDateDebutChange={page.setDateDebut}
    onDateFinChange={page.setDateFin}
    onCompteFilterChange={page.setCompteFilter}
    onTypeDepenseFilterChange={page.setTypeDepenseFilter}
  />
)}
```

- [ ] **Step 2: Verify + Commit**

```bash
git add src/app/(dashboard)/finance/comptabilite/page.tsx
git commit -m "feat(compta): wire ViewSwitcher into page, replace ComptaFilters for Grand Livre"
```

---

### Task 8: Nettoyage + suppression ComptaInfoBanner inutile

**Files:**
- Modify: `src/app/(dashboard)/finance/comptabilite/page.tsx` (retirer ComptaInfoBanner, supprimer ancien import ComptaHeader)
- Modify: `src/components/features/finance/Comptabilite/index.ts` (garder les exports pour rétrocompatibilité)

- [ ] **Step 1: Retirer ComptaInfoBanner du page.tsx**

Le banner d'info est remplacé par le `ComptaTopBar` (période + actions). Supprimer la ligne :
```tsx
// SUPPRIMER cette ligne du render:
<ComptaInfoBanner ... />
```

Nettoyer les imports inutilisés (`ComptaHeader`, `ComptaInfoBanner`, `ComptaStats` si remplacé).

- [ ] **Step 2: Supprimer l'import de FinanceAnnexeStats si redondant**

Les KPIs annexes sont remplacés par le `ComptaKpiStrip`. Évaluer si `FinanceAnnexeStats` apporte des données supplémentaires ; si oui, le garder ; sinon le retirer du render.

- [ ] **Step 3: Commit final**

```bash
git add src/app/(dashboard)/finance/comptabilite/page.tsx \
        src/components/features/finance/Comptabilite/index.ts
git commit -m "refactor(compta): cleanup old components, finalize Pennylane V1 layout"
```

---

### Task 9: Responsive sidebar — mode collapse sur mobile

**Files:**
- Modify: `src/components/features/finance/Comptabilite/ComptaSidebar.module.css`
- Modify: `src/app/(dashboard)/finance/comptabilite/comptabilite.module.css`

- [ ] **Step 1: Ajouter responsive breakpoint pour sidebar**

Dans `ComptaSidebar.module.css` :
```css
@media (max-width: 1024px) {
  .sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-light);
    padding: var(--space-md) 0;
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }

  .sidebarTitle,
  .divider,
  .sectionLabel {
    display: none;
  }

  .sidebarItem {
    border-left: none;
    border-bottom: 2px solid transparent;
    padding: var(--space-sm) var(--space-md);
    font-size: var(--text-xs);
    white-space: nowrap;
  }

  .active {
    border-left-color: transparent;
    border-bottom-color: var(--primary);
  }
}
```

- [ ] **Step 2: Verify responsive + Commit**

```bash
git add src/components/features/finance/Comptabilite/ComptaSidebar.module.css \
        src/app/(dashboard)/finance/comptabilite/comptabilite.module.css
git commit -m "feat(compta): responsive sidebar collapse on mobile"
```

---

## Résumé des fichiers

| Action | Fichier | Description |
|--------|---------|-------------|
| Create | `ComptaSidebar.tsx` + `.module.css` | Navigation verticale |
| Create | `ComptaTopBar.tsx` + `.module.css` | Barre sticky avec titre + période + actions |
| Create | `ComptaKpiStrip.tsx` + `.module.css` | Bandeau 4 KPI compact |
| Create | `ComptaViewSwitcher.tsx` + `.module.css` | Toggle vue par compte/chrono/journal + filtres |
| Modify | `page.tsx` | Split layout sidebar + main |
| Modify | `comptabilite.module.css` (page) | Layout styles |
| Modify | `GrandLivreTable.tsx` | Grouped view + Pennylane restyle |
| Modify | `Comptabilite.module.css` (component) | Ajout styles Pennylane |
| Modify | `ComptaTabContent.tsx` | Passer viewMode |
| Modify | `types.ts` | Ajouter GrandLivreViewMode |
| Modify | `useComptabilitePage.ts` | Ajouter viewMode state |
| Modify | `index.ts` | Exports nouveaux composants |
| Keep | `ComptaTabs.tsx` | Garder pour rétrocompatibilité (non utilisé dans page) |
| Keep | `ComptaHeader.tsx` | Garder pour rétrocompatibilité (non utilisé dans page) |
| Keep | `ComptaStats.tsx` | Garder pour tabs Balance/Annexes si besoin |
