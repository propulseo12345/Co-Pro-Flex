# Dashboard Action Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current linear dashboard with a bento grid "Action Board" where every block embeds contextual actions.

**Architecture:** Rewrite 6 existing components in `src/features/dashboard/main/components/` + the CSS module. The hook (`useDashboardMainPage`) stays mostly intact — we extend `KpisData` to carry ODS counts. The page component (`page.tsx`) gets a new bento layout. No new dependencies.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, CSS Modules, Lucide React icons.

**Spec:** `docs/superpowers/specs/2026-03-31-dashboard-redesign.md`
**Preview:** `.planning/previews/dashboard-v3-action.html`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/(dashboard)/dashboard/dashboard.module.css` | Rewrite | All bento grid styles, buttons, cards, badges, responsive |
| `src/app/(dashboard)/dashboard/page.tsx` | Rewrite | Bento grid layout, compose 6 blocks |
| `src/features/dashboard/main/components/DashboardTopBar.tsx` | Create | Top bar with title + pill action buttons |
| `src/features/dashboard/main/components/BentoTresorerie.tsx` | Create | Trésorerie block (span 2) |
| `src/features/dashboard/main/components/BentoAG.tsx` | Create | Prochaine AG block |
| `src/features/dashboard/main/components/BentoBudget.tsx` | Create | Budget block with progress bar |
| `src/features/dashboard/main/components/BentoODS.tsx` | Create | Ordres de service block (span 2) |
| `src/features/dashboard/main/components/BentoPriorites.tsx` | Create | Priorities block (span 2) with mini-cards |
| `src/features/dashboard/main/components/BentoActivite.tsx` | Create | Activité récente block (span 2) |
| `src/features/dashboard/main/components/DashboardStates.tsx` | Modify | Update skeleton to match bento grid |
| `src/features/dashboard/main/components/index.ts` | Rewrite | Export new components |
| `src/features/dashboard/main/index.ts` | Update | Export new components |
| `src/features/dashboard/main/hooks/useDashboardMainPage.ts` | Modify | Add ODS data to KpisData, add `coproName` |

Old files to delete after migration:
- `DashboardHeader.tsx` (replaced by `DashboardTopBar.tsx`)
- `KpiCards.tsx` (replaced by individual Bento blocks)
- `QuickActionsSection.tsx` (merged into TopBar)

---

## Task 1: CSS Module — Bento Grid Foundation

**Files:**
- Rewrite: `src/app/(dashboard)/dashboard/dashboard.module.css`

- [ ] **Step 1: Replace the entire CSS module**

Replace the full content of `dashboard.module.css` with the bento grid system. This is the foundation — all subsequent components depend on these classes.

```css
/* ================================================
   Dashboard — Bento Action Board
   Dark theme, 4-column grid, action-oriented
   ================================================ */

/* Container */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* ── Top Bar ── */
.topbar {
  background: #161822;
  border-radius: 12px;
  padding: 20px 28px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.topbarTitle {
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
}

.topbarSub {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 2px;
}

.topbarActions {
  display: flex;
  gap: 10px;
}

/* ── Bento Grid ── */
.bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.card {
  background: #1a1d2e;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(148, 163, 184, 0.08);
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s ease;
}

.card:hover {
  border-color: rgba(148, 163, 184, 0.15);
}

.span2 {
  grid-column: span 2;
}

/* ── Labels ── */
.label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 12px;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  white-space: nowrap;
}

.btnPill {
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
}

.btnPrimary {
  background: #3b82f6;
  color: #fff;
}

.btnPrimary:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btnGhost {
  background: rgba(148, 163, 184, 0.06);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.btnGhost:hover {
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
}

.btnFull {
  width: 100%;
}

.btnOutlineRed {
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
}

.btnOutlineRed:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btnOutlineAmber {
  background: transparent;
  color: #f59e0b;
  border: 1px solid #f59e0b;
}

.btnOutlineAmber:hover {
  background: rgba(245, 158, 11, 0.1);
}

.btnOutlineBlue {
  background: transparent;
  color: #3b82f6;
  border: 1px solid #3b82f6;
}

.btnOutlineBlue:hover {
  background: rgba(59, 130, 246, 0.1);
}

/* ── Mini-card ── */
.miniCard {
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.04);
  border-radius: 8px;
  padding: 12px 16px;
}

/* ── Monospace numbers ── */
.mono {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-variant-numeric: tabular-nums;
}

/* ── Badge ── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.badgeBlue {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
}

.badgeRed {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.badgeAmber {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
}

.badgeGray {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

/* ── Dot ── */
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dotRed { background: #ef4444; }
.dotBlue { background: #3b82f6; }
.dotGray { background: #64748b; }
.dotGreen { background: #22c55e; }
.dotAmber { background: #f59e0b; }

/* ── Action link ── */
.actionLink {
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
  background: none;
  border: none;
  font-family: inherit;
}

.actionLink:hover {
  opacity: 0.8;
}

.actionLinkRed { color: #ef4444; }
.actionLinkBlue { color: #3b82f6; }
.actionLinkGray { color: #94a3b8; }

/* ── Block: Trésorerie ── */
.tresorerieInner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.tresorerieValue {
  font-size: 32px;
  font-weight: 800;
  color: #22c55e;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-variant-numeric: tabular-nums;
  margin-bottom: 6px;
}

.tresorerieDetail {
  font-size: 13px;
  color: #94a3b8;
}

.tresorerieActions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Block: AG ── */
.agDate {
  font-size: 22px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.agSub {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 12px;
}

.agCountdown {
  margin-bottom: 16px;
}

/* ── Block: Budget ── */
.budgetPct {
  font-size: 28px;
  font-weight: 700;
  color: #3b82f6;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-variant-numeric: tabular-nums;
  margin-bottom: 10px;
}

.progressTrack {
  width: 100%;
  height: 4px;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: #3b82f6;
  border-radius: 4px;
}

.budgetDetail {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 16px;
}

/* ── Block: ODS ── */
.odsHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.odsRows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.odsRow {
  display: flex;
  align-items: center;
  gap: 12px;
}

.odsRowText {
  flex: 1;
  min-width: 0;
}

.odsRowTitle {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.odsRowSub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Block: Priorités ── */
.priorityItems {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.priorityItem {
  display: flex;
  align-items: center;
  gap: 14px;
}

.priorityBar {
  width: 3px;
  align-self: stretch;
  border-radius: 3px;
  flex-shrink: 0;
}

.priorityBarRed { background: #ef4444; }
.priorityBarAmber { background: #f59e0b; }
.priorityBarBlue { background: #3b82f6; }

.priorityContent {
  flex: 1;
  min-width: 0;
}

.priorityTitle {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.prioritySub {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.priorityRight {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ── Block: Activité ── */
.activityHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.activityLink {
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
  cursor: pointer;
  background: none;
  border: none;
  font-family: inherit;
  transition: opacity 0.2s;
}

.activityLink:hover {
  opacity: 0.8;
}

.activityItems {
  display: flex;
  flex-direction: column;
}

.activityItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background 0.15s;
}

.activityItem:hover {
  background: rgba(148, 163, 184, 0.03);
}

.activityText {
  flex: 1;
  font-size: 13px;
  color: #e2e8f0;
}

.activityTime {
  font-size: 12px;
  color: #64748b;
  flex-shrink: 0;
}

/* ── States: Loading ── */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, #131620 25%, #1a1d2e 50%, #131620 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 12px;
}

.skeletonTopbar {
  height: 72px;
  margin-bottom: 16px;
}

.skeletonCard {
  border-radius: 12px;
  min-height: 120px;
}

.skeletonCardTall {
  min-height: 280px;
}

/* ── States: Error ── */
.errorState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 12px;
  text-align: center;
}

.errorIcon {
  color: #ef4444;
  margin-bottom: 16px;
}

.errorText {
  font-size: 14px;
  color: #ef4444;
  margin: 0 0 16px;
}

.retryBtn {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.retryBtn:hover {
  opacity: 0.9;
}

/* ── States: Empty ── */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  text-align: center;
}

.emptyIcon {
  color: #64748b;
  margin-bottom: 16px;
}

.emptyTitle {
  font-size: 20px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 8px;
}

.emptySubtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

/* ── Spinning ── */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* ── Responsive ── */
@media (max-width: 1200px) {
  .bento {
    grid-template-columns: repeat(2, 1fr);
  }

  .span2 {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 12px;
  }

  .bento {
    grid-template-columns: 1fr;
  }

  .span2 {
    grid-column: span 1;
  }

  .topbar {
    flex-direction: column;
    gap: 14px;
    align-items: flex-start;
  }

  .topbarActions {
    flex-wrap: wrap;
  }

  .tresorerieInner {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .tresorerieActions {
    flex-direction: row;
  }

  .priorityItem {
    flex-wrap: wrap;
    gap: 8px;
  }

  .priorityRight {
    width: 100%;
    justify-content: flex-end;
  }
}
```

- [ ] **Step 2: Verify file saved correctly**

Run: `wc -l src/app/\(dashboard\)/dashboard/dashboard.module.css`
Expected: ~420 lines

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/dashboard.module.css
git commit -m "refactor(dashboard): replace CSS module with bento action board styles"
```

---

## Task 2: TopBar Component

**Files:**
- Create: `src/features/dashboard/main/components/DashboardTopBar.tsx`
- Delete: `src/features/dashboard/main/components/DashboardHeader.tsx`

- [ ] **Step 1: Create DashboardTopBar**

```tsx
'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface DashboardTopBarProps {
  coproName: string;
  businessYear: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardTopBar({
  coproName,
  businessYear,
  isRefreshing,
  onRefresh,
}: DashboardTopBarProps) {
  return (
    <div className={styles.topbar}>
      <div>
        <div className={styles.topbarTitle}>Dashboard</div>
        <div className={styles.topbarSub}>
          {coproName} · Exercice {businessYear}
        </div>
      </div>
      <div className={styles.topbarActions}>
        <Link href="/maintenance/service-orders/new" className={`${styles.btn} ${styles.btnPill} ${styles.btnPrimary}`}>
          Créer ODS
        </Link>
        <Link href="/finance/calls" className={`${styles.btn} ${styles.btnPill} ${styles.btnGhost}`}>
          Appel de fonds
        </Link>
        <Link href="/finance/invoices" className={`${styles.btn} ${styles.btnPill} ${styles.btnGhost}`}>
          Nouvelle facture
        </Link>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`${styles.btn} ${styles.btnPill} ${styles.btnGhost}`}
        >
          <RefreshCw size={14} className={isRefreshing ? styles.spinning : ''} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete old DashboardHeader.tsx**

```bash
rm src/features/dashboard/main/components/DashboardHeader.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/main/components/DashboardTopBar.tsx
git add -u src/features/dashboard/main/components/DashboardHeader.tsx
git commit -m "feat(dashboard): add TopBar with pill actions, remove old header"
```

---

## Task 3: Bento Trésorerie Block

**Files:**
- Create: `src/features/dashboard/main/components/BentoTresorerie.tsx`

- [ ] **Step 1: Create BentoTresorerie**

```tsx
'use client';

import Link from 'next/link';
import { formatCurrency } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoTresorerieProps {
  balance: number;
  compteCourant: number;
  fondsTravaux: number;
}

export function BentoTresorerie({ balance, compteCourant, fondsTravaux }: BentoTresorerieProps) {
  return (
    <div className={`${styles.card} ${styles.span2}`}>
      <div className={styles.label}>Trésorerie</div>
      <div className={styles.tresorerieInner}>
        <div>
          <div className={styles.tresorerieValue}>
            {formatCurrency(balance)}
          </div>
          <div className={styles.tresorerieDetail}>
            Compte courant <span className={styles.mono}>{formatCurrency(compteCourant)}</span>
            {' · '}
            Fonds travaux <span className={styles.mono}>{formatCurrency(fondsTravaux)}</span>
          </div>
        </div>
        <div className={styles.tresorerieActions}>
          <Link href="/finance/treasury" className={`${styles.btn} ${styles.btnGhost}`}>
            Voir les comptes
          </Link>
          <Link href="/finance/treasury/rapprochement" className={`${styles.btn} ${styles.btnGhost}`}>
            Rapprocher
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/main/components/BentoTresorerie.tsx
git commit -m "feat(dashboard): add BentoTresorerie block"
```

---

## Task 4: Bento AG Block

**Files:**
- Create: `src/features/dashboard/main/components/BentoAG.tsx`

- [ ] **Step 1: Create BentoAG**

```tsx
'use client';

import Link from 'next/link';
import { formatDateFR } from '@/lib/time/period';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoAGProps {
  nextAgDate: string | null;
  nextAgId: string | null;
  nextAgType?: string;
  nextAgResolutions?: number;
}

export function BentoAG({ nextAgDate, nextAgId, nextAgType, nextAgResolutions }: BentoAGProps) {
  const daysUntil = nextAgDate
    ? Math.ceil((new Date(nextAgDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const agHref = nextAgId ? `/ag/${nextAgId}` : '/ag/dashboard';

  return (
    <div className={styles.card}>
      <div className={styles.label}>Prochaine AG</div>
      {nextAgDate ? (
        <>
          <div className={styles.agDate}>{formatDateFR(nextAgDate)}</div>
          <div className={styles.agSub}>
            {nextAgType ?? 'AG ordinaire'}
            {nextAgResolutions ? ` · ${nextAgResolutions} résolutions` : ''}
          </div>
          {daysUntil !== null && daysUntil > 0 && (
            <div className={styles.agCountdown}>
              <span className={`${styles.badge} ${styles.badgeBlue}`}>
                dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div style={{ flex: 1 }} />
          <Link href={agHref} className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}>
            Préparer l&apos;AG
          </Link>
        </>
      ) : (
        <>
          <div className={styles.agDate} style={{ color: '#94a3b8' }}>Aucune prévue</div>
          <div style={{ flex: 1 }} />
          <Link href="/ag/new" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}>
            Créer une AG
          </Link>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/main/components/BentoAG.tsx
git commit -m "feat(dashboard): add BentoAG block with countdown"
```

---

## Task 5: Bento Budget Block

**Files:**
- Create: `src/features/dashboard/main/components/BentoBudget.tsx`

- [ ] **Step 1: Create BentoBudget**

```tsx
'use client';

import Link from 'next/link';
import { formatCurrency } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoBudgetProps {
  budgetPct?: number;
  budgetVote?: number;
  budgetRealise?: number;
}

export function BentoBudget({ budgetPct, budgetVote, budgetRealise }: BentoBudgetProps) {
  const hasBudget = budgetPct !== undefined && budgetVote !== undefined;

  return (
    <div className={styles.card}>
      <div className={styles.label}>Budget {new Date().getFullYear()}</div>
      {hasBudget ? (
        <>
          <div className={styles.budgetPct}>{budgetPct} %</div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className={styles.budgetDetail}>
            <span className={styles.mono}>{formatCurrency(budgetRealise ?? 0)}</span>
            {' consommés sur '}
            <span className={styles.mono}>{formatCurrency(budgetVote)}</span>
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/finance/budget-current" className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}>
            Voir le budget
          </Link>
        </>
      ) : (
        <>
          <div className={styles.budgetPct} style={{ color: '#94a3b8' }}>—</div>
          <div className={styles.budgetDetail}>Aucun budget voté</div>
          <div style={{ flex: 1 }} />
          <Link href="/finance/budget" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}>
            Créer un budget
          </Link>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/main/components/BentoBudget.tsx
git commit -m "feat(dashboard): add BentoBudget block with progress bar"
```

---

## Task 6: Bento ODS Block

**Files:**
- Create: `src/features/dashboard/main/components/BentoODS.tsx`

- [ ] **Step 1: Create BentoODS**

```tsx
'use client';

import Link from 'next/link';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface OdsGroup {
  count: number;
  label: string;
  names: string;
  dotClass: string;
  linkClass: string;
  linkLabel: string;
  href: string;
}

interface BentoODSProps {
  urgents: number;
  enCours: number;
  programmes: number;
  urgentNames?: string;
  enCoursNames?: string;
  programmesNames?: string;
}

export function BentoODS({
  urgents,
  enCours,
  programmes,
  urgentNames = '',
  enCoursNames = '',
  programmesNames = '',
}: BentoODSProps) {
  const total = urgents + enCours + programmes;

  const groups: OdsGroup[] = [
    {
      count: urgents,
      label: `${urgents} urgent${urgents > 1 ? 's' : ''}`,
      names: urgentNames,
      dotClass: styles.dotRed,
      linkClass: styles.actionLinkRed,
      linkLabel: 'Traiter →',
      href: '/maintenance/service-orders?status=urgent',
    },
    {
      count: enCours,
      label: `${enCours} en cours`,
      names: enCoursNames,
      dotClass: styles.dotBlue,
      linkClass: styles.actionLinkBlue,
      linkLabel: 'Suivre →',
      href: '/maintenance/service-orders?status=en_cours',
    },
    {
      count: programmes,
      label: `${programmes} programmé${programmes > 1 ? 's' : ''}`,
      names: programmesNames,
      dotClass: styles.dotGray,
      linkClass: styles.actionLinkGray,
      linkLabel: 'Planifier →',
      href: '/maintenance/service-orders?status=programme',
    },
  ];

  return (
    <div className={`${styles.card} ${styles.span2}`}>
      <div className={styles.odsHeader}>
        <div className={styles.label} style={{ marginBottom: 0 }}>Ordres de service</div>
        <span className={`${styles.badge} ${styles.badgeBlue}`}>{total} ouverts</span>
      </div>
      <div className={styles.odsRows}>
        {groups.filter(g => g.count > 0).map((group) => (
          <div key={group.label} className={`${styles.miniCard} ${styles.odsRow}`}>
            <span className={`${styles.dot} ${group.dotClass}`} />
            <div className={styles.odsRowText}>
              <div className={styles.odsRowTitle}>{group.label}</div>
              {group.names && <div className={styles.odsRowSub}>{group.names}</div>}
            </div>
            <Link href={group.href} className={`${styles.actionLink} ${group.linkClass}`}>
              {group.linkLabel}
            </Link>
          </div>
        ))}
      </div>
      <Link
        href="/maintenance/service-orders/new"
        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
      >
        Créer un ordre de service
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/main/components/BentoODS.tsx
git commit -m "feat(dashboard): add BentoODS block with status groups"
```

---

## Task 7: Bento Priorités Block

**Files:**
- Create: `src/features/dashboard/main/components/BentoPriorites.tsx`
- Delete: `src/features/dashboard/main/components/PrioritiesSection.tsx`

- [ ] **Step 1: Create BentoPriorites**

```tsx
'use client';

import Link from 'next/link';
import type { DashboardTodo } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoPrioritesProps {
  todos: DashboardTodo[];
  hasTodos: boolean;
  hasMoreTodos: boolean;
  todosCount: number;
}

function getPriorityBarClass(priority: number): string {
  if (priority <= 1) return styles.priorityBarRed;
  if (priority <= 2) return styles.priorityBarAmber;
  return styles.priorityBarBlue;
}

function getPriorityBadgeClass(priority: number): string {
  if (priority <= 1) return styles.badgeRed;
  if (priority <= 2) return styles.badgeAmber;
  return styles.badgeBlue;
}

function getPriorityBtnClass(priority: number): string {
  if (priority <= 1) return styles.btnOutlineRed;
  if (priority <= 2) return styles.btnOutlineAmber;
  return styles.btnOutlineBlue;
}

export function BentoPriorites({ todos, hasTodos, hasMoreTodos, todosCount }: BentoPrioritesProps) {
  return (
    <div className={`${styles.card} ${styles.span2}`}>
      <div className={styles.label}>À traiter maintenant</div>
      {hasTodos ? (
        <div className={styles.priorityItems}>
          {todos.map((todo, index) => (
            <div key={`${todo.todo_type}-${index}`} className={`${styles.miniCard} ${styles.priorityItem}`}>
              <div className={`${styles.priorityBar} ${getPriorityBarClass(todo.priority)}`} />
              <div className={styles.priorityContent}>
                <div className={styles.priorityTitle}>{todo.label}</div>
                {todo.context && (
                  <div className={styles.prioritySub}>{todo.context}</div>
                )}
              </div>
              <div className={styles.priorityRight}>
                {todo.deadline && (
                  <span className={`${styles.badge} ${getPriorityBadgeClass(todo.priority)}`}>
                    {todo.deadline}
                  </span>
                )}
                <Link
                  href={todo.deep_link}
                  className={`${styles.btn} ${getPriorityBtnClass(todo.priority)}`}
                >
                  {todo.action_label ?? 'Voir'}
                </Link>
              </div>
            </div>
          ))}
          {hasMoreTodos && (
            <Link href="/tasks" className={styles.actionLink} style={{ textAlign: 'center', padding: '8px', color: '#3b82f6' }}>
              Voir les {todosCount} tâches →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ padding: '32px', textAlign: 'center', color: '#22c55e', fontSize: '14px' }}>
          Aucune action urgente — tout est sous contrôle.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Delete old PrioritiesSection.tsx**

```bash
rm src/features/dashboard/main/components/PrioritiesSection.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/main/components/BentoPriorites.tsx
git add -u src/features/dashboard/main/components/PrioritiesSection.tsx
git commit -m "feat(dashboard): add BentoPriorites with mini-cards and action buttons"
```

---

## Task 8: Bento Activité Block

**Files:**
- Create: `src/features/dashboard/main/components/BentoActivite.tsx`
- Delete: `src/features/dashboard/main/components/ActivitySection.tsx`

- [ ] **Step 1: Create BentoActivite**

```tsx
'use client';

import Link from 'next/link';
import { formatRelativeTime, type DashboardActivity } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoActiviteProps {
  activities: DashboardActivity[];
  hasActivities: boolean;
}

function getActivityDotClass(activityType: string): string {
  if (activityType.includes('payment') || activityType.includes('paiement')) return styles.dotGreen;
  if (activityType.includes('alert') || activityType.includes('relance')) return styles.dotRed;
  if (activityType.includes('facture') || activityType.includes('document')) return styles.dotAmber;
  return styles.dotBlue;
}

export function BentoActivite({ activities, hasActivities }: BentoActiviteProps) {
  return (
    <div className={`${styles.card} ${styles.span2}`}>
      <div className={styles.activityHeader}>
        <div className={styles.label} style={{ marginBottom: 0 }}>Activité récente</div>
        <Link href="/activity" className={styles.activityLink}>
          Tout voir →
        </Link>
      </div>
      {hasActivities ? (
        <div className={styles.activityItems}>
          {activities.map((activity, index) => (
            <div key={`${activity.activity_type}-${index}`} className={styles.activityItem}>
              <span className={`${styles.dot} ${getActivityDotClass(activity.activity_type)}`} />
              <span className={styles.activityText}>{activity.label}</span>
              <span className={styles.activityTime}>{formatRelativeTime(activity.event_date)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
          Aucune activité récente
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Delete old ActivitySection.tsx**

```bash
rm src/features/dashboard/main/components/ActivitySection.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/main/components/BentoActivite.tsx
git add -u src/features/dashboard/main/components/ActivitySection.tsx
git commit -m "feat(dashboard): add BentoActivite with colored dots"
```

---

## Task 9: Update Exports & Hook

**Files:**
- Rewrite: `src/features/dashboard/main/components/index.ts`
- Modify: `src/features/dashboard/main/index.ts`
- Modify: `src/features/dashboard/main/hooks/useDashboardMainPage.ts`
- Delete: `src/features/dashboard/main/components/KpiCards.tsx`
- Delete: `src/features/dashboard/main/components/QuickActionsSection.tsx`

- [ ] **Step 1: Rewrite components/index.ts**

```ts
export { DashboardTopBar } from './DashboardTopBar';
export { BentoTresorerie } from './BentoTresorerie';
export { BentoAG } from './BentoAG';
export { BentoBudget } from './BentoBudget';
export { BentoODS } from './BentoODS';
export { BentoPriorites } from './BentoPriorites';
export { BentoActivite } from './BentoActivite';
export { DashboardLoadingState, DashboardErrorState, DashboardEmptyState } from './DashboardStates';
```

- [ ] **Step 2: Update main/index.ts**

```ts
export * from './components';
export {
  useDashboardMainPage,
  formatCurrency,
  formatRelativeTime,
  BUSINESS_YEAR,
} from './hooks/useDashboardMainPage';
export type {
  KpisData,
  ComputedDashboardData,
  UseDashboardMainPageResult,
  DashboardTodo,
  DashboardActivity,
} from './hooks/useDashboardMainPage';
```

- [ ] **Step 3: Add ODS fields to KpisData in useDashboardMainPage.ts**

Add these fields to the `KpisData` interface:

```ts
// Add to KpisData interface
ods_urgents?: number;
ods_en_cours?: number;
ods_programmes?: number;
ods_urgent_names?: string;
ods_en_cours_names?: string;
ods_programmes_names?: string;
```

Add `coproName` to the hook return. In the hook function, add:

```ts
// Add to UseDashboardMainPageResult interface
coproName: string;

// In the hook body, after existing code
const coproName = 'Résidence Les Lilas'; // TODO: get from CoproProvider context
```

Return `coproName` in the result object.

- [ ] **Step 4: Remove old DashboardTodo emoji helper**

Remove `getPriorityIcon` function from the hook — it's no longer used (priorities use colored bars now).

Remove `QUICK_ACTIONS` and `QuickAction` type — quick actions are now hardcoded in TopBar links.

Remove unused icon imports (`Wallet`, `AlertTriangle`, etc.) if they're no longer referenced.

- [ ] **Step 5: Delete old files**

```bash
rm src/features/dashboard/main/components/KpiCards.tsx
rm src/features/dashboard/main/components/QuickActionsSection.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/main/components/index.ts
git add src/features/dashboard/main/index.ts
git add src/features/dashboard/main/hooks/useDashboardMainPage.ts
git add -u
git commit -m "refactor(dashboard): update exports, add ODS to KpisData, remove old components"
```

---

## Task 10: Update DashboardStates (Loading/Error/Empty)

**Files:**
- Modify: `src/features/dashboard/main/components/DashboardStates.tsx`

- [ ] **Step 1: Rewrite DashboardStates with bento skeleton**

```tsx
'use client';

import { RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

// ── Loading State ──
export function DashboardLoadingState() {
  return (
    <div className={styles.container}>
      <div className={`${styles.skeleton} ${styles.skeletonTopbar}`} />
      <div className={styles.bento}>
        <div className={`${styles.skeleton} ${styles.skeletonCard} ${styles.span2}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard} ${styles.skeletonCardTall} ${styles.span2}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard} ${styles.skeletonCardTall} ${styles.span2}`} />
        <div className={`${styles.skeleton} ${styles.skeletonCard} ${styles.skeletonCardTall} ${styles.span2}`} />
      </div>
    </div>
  );
}

// ── Error State ──
interface DashboardErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function DashboardErrorState({ error, onRetry }: DashboardErrorStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.errorState}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <p className={styles.errorText}>Erreur lors du chargement : {error}</p>
        <button onClick={onRetry} className={styles.retryBtn}>
          Réessayer
        </button>
      </div>
    </div>
  );
}

// ── Empty State ──
interface DashboardEmptyStateProps {
  businessYear: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardEmptyState({
  businessYear,
  isRefreshing,
  onRefresh,
}: DashboardEmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.topbar}>
        <div>
          <div className={styles.topbarTitle}>Dashboard</div>
          <div className={styles.topbarSub}>Exercice {businessYear}</div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`${styles.btn} ${styles.btnPill} ${styles.btnGhost}`}
        >
          <RefreshCw size={14} className={isRefreshing ? styles.spinning : ''} />
        </button>
      </div>
      <div className={styles.emptyState}>
        <Inbox size={48} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Bienvenue sur CoProFlex</h2>
        <p className={styles.emptySubtitle}>
          Commencez par créer une AG, un appel de fonds ou importer vos données.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/dashboard/main/components/DashboardStates.tsx
git commit -m "refactor(dashboard): update states to match bento layout"
```

---

## Task 11: Rewrite Page Component

**Files:**
- Rewrite: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Rewrite page.tsx with bento grid**

```tsx
'use client';

import {
  useDashboardMainPage,
  DashboardLoadingState,
  DashboardErrorState,
  DashboardEmptyState,
  DashboardTopBar,
  BentoTresorerie,
  BentoAG,
  BentoBudget,
  BentoODS,
  BentoPriorites,
  BentoActivite,
} from '@/features/dashboard/main';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const {
    data,
    isLoading,
    isRefreshing,
    error,
    isEmpty,
    refresh,
    businessYear,
    coproName,
  } = useDashboardMainPage();

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return <DashboardErrorState error={error} onRetry={refresh} />;
  }

  if (isEmpty || !data) {
    return (
      <DashboardEmptyState
        businessYear={businessYear}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />
    );
  }

  const { kpis } = data;

  return (
    <div className={styles.container}>
      <DashboardTopBar
        coproName={coproName}
        businessYear={businessYear}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
      />

      <div className={styles.bento}>
        <BentoTresorerie
          balance={kpis.current_balance}
          compteCourant={kpis.tresorerie ?? kpis.current_balance}
          fondsTravaux={kpis.provisions_travaux ?? 0}
        />

        <BentoAG
          nextAgDate={kpis.next_ag_date}
          nextAgId={kpis.next_ag_id}
        />

        <BentoBudget
          budgetPct={kpis.budget_pct}
          budgetVote={kpis.budget_vote}
          budgetRealise={kpis.budget_realise}
        />

        <BentoODS
          urgents={kpis.ods_urgents ?? 0}
          enCours={kpis.ods_en_cours ?? 0}
          programmes={kpis.ods_programmes ?? 0}
          urgentNames={kpis.ods_urgent_names}
          enCoursNames={kpis.ods_en_cours_names}
          programmesNames={kpis.ods_programmes_names}
        />

        <BentoPriorites
          todos={data.displayedTodos}
          hasTodos={data.hasTodos}
          hasMoreTodos={data.hasMoreTodos}
          todosCount={data.todosCount}
        />

        <BentoActivite
          activities={data.displayedActivities}
          hasActivities={data.hasActivities}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx next build 2>&1 | head -30`

If TypeScript errors appear about missing properties on `DashboardTodo` (`context`, `deadline`, `action_label`), those fields are optional in BentoPriorites — verify they're accessed with optional chaining (`todo.context &&`).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(dashboard): bento action board layout — 6 blocks with embedded actions"
```

---

## Task 12: Extend DashboardTodo Type

**Files:**
- Modify: `src/hooks/modules/useDashboardData.ts` (the upstream data hook)

- [ ] **Step 1: Read the current DashboardTodo type**

Read `src/hooks/modules/useDashboardData.ts` and find the `DashboardTodo` interface.

- [ ] **Step 2: Add optional fields for the Action Board**

Add these optional fields to `DashboardTodo`:

```ts
context?: string;       // Extra context line (e.g., "M. Bernard — 4 580 €")
deadline?: string;      // Deadline badge text (e.g., "J+92", "AG 12/04")
action_label?: string;  // CTA button label (e.g., "Relancer", "Créer ODS")
```

These fields are optional so existing code continues to work. The dashboard API can populate them later.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/modules/useDashboardData.ts
git commit -m "feat(dashboard): extend DashboardTodo with context, deadline, action_label"
```

---

## Task 13: Clean Up & Delete Old Skeletons

**Files:**
- Delete: `src/features/dashboard/main/components/DashboardSkeletons.tsx`
- Delete: `src/features/dashboard/components/DashboardSkeletons.tsx` (old duplicate)

- [ ] **Step 1: Delete skeleton files**

The skeleton is now inline in `DashboardStates.tsx`. Remove the separate files.

```bash
rm src/features/dashboard/main/components/DashboardSkeletons.tsx
rm src/features/dashboard/components/DashboardSkeletons.tsx
```

- [ ] **Step 2: Verify no imports reference old files**

Run: `grep -r "DashboardSkeletons" src/`

If any imports remain, update them to import from `DashboardStates` instead.

- [ ] **Step 3: Final build check**

Run: `npx next build 2>&1 | tail -10`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "chore(dashboard): clean up old skeleton files, final build passes"
```

---

## Task 14: Visual Verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Open dashboard in browser**

Navigate to `http://localhost:3000/dashboard`

- [ ] **Step 3: Verify against preview**

Open `.planning/previews/dashboard-v3-action.html` in a second tab. Compare:

- [ ] TopBar: title, subtitle, 3 pill buttons + refresh
- [ ] Trésorerie: green number, CC/FT detail, ghost buttons
- [ ] AG: date, type, countdown badge, primary button
- [ ] Budget: percentage, progress bar, detail, ghost button
- [ ] ODS: status groups with dots and action links, CTA
- [ ] Priorités: colored bars, badges, outline buttons
- [ ] Activité: colored dots, timestamps
- [ ] Responsive: resize to tablet (2 cols) and mobile (1 col)

- [ ] **Step 4: Fix any visual discrepancies found**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(dashboard): action board complete — visual verification passed"
```
