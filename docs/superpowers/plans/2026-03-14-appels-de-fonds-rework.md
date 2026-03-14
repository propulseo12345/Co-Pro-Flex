# Appels de fonds — Refonte complète — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruire entièrement le module appels de fonds avec un dashboard campagne par exercice (onglets Vue globale / Budget courant / Travaux) + page détail par appel.

**Architecture:** 3 onglets sur page listing, navigation vers page détail. Hooks composent les hooks React Query existants (`useCalls`, `useCallLines`, etc.). Types API réutilisés directement. Migration DB pour ajouter tantièmes à la vue.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, CSS Modules, Supabase (views + Edge Functions)

**Spec:** `docs/superpowers/specs/2026-03-14-appels-de-fonds-rework-design.md`
**Maquette:** `.superpowers/brainstorm/67034-1773491862/appels-v5.html`

---

## File Structure

### New files to create

```
src/features/finance/appels-fonds/
├── types.ts                            # Types d'affichage (TrimesterCard, TravauxProject, AppelTab, etc.)
├── utils.ts                            # Fonctions utilitaires (recoveryRate, buildTrimesterCards, buildTravauxProjects, trimesterLabel)
├── hooks/
│   ├── useAppelsFondsPage.ts           # Orchestrateur page listing
│   ├── useAppelsFondsDetail.ts         # Orchestrateur page détail
│   └── useAppelsFondsActions.ts        # Mutations (emit, cancel)
├── components/
│   ├── AppelsFondsHeader.tsx           # Page header + period bar
│   ├── AppelsFondsTabs.tsx             # Barre 3 onglets
│   ├── TabVueGlobale.tsx               # Contenu onglet vue globale
│   ├── TabBudgetCourant.tsx            # Contenu onglet budget courant
│   ├── TabTravaux.tsx                  # Contenu onglet travaux
│   ├── TrimesterCard.tsx               # Carte trimestre
│   ├── TravauxCard.tsx                 # Carte travaux + échéancier
│   ├── EcheanceCard.tsx                # Carte échéance individuelle
│   ├── StatsGrid.tsx                   # 4 KPI cards réutilisable
│   ├── ProgressBar.tsx                 # Barre progression compacte
│   ├── AlertBanner.tsx                 # Bandeau alerte impayés
│   ├── DetailHeader.tsx                # Header page détail
│   ├── CoproTable.tsx                  # Tableau copropriétaires
│   └── StatusBadge.tsx                 # Badge statut
├── services/
│   └── avis-appel-export.service.ts    # Copié + adapté de l'ancien
└── styles/
    ├── AppelsFondsPage.module.css      # Page listing (header, period, tabs)
    ├── Cards.module.css                # TrimesterCard, TravauxCard, EcheanceCard
    ├── StatsGrid.module.css            # StatsGrid, ProgressBar, AlertBanner
    ├── DetailPage.module.css           # DetailHeader
    └── CoproTable.module.css           # CoproTable, StatusBadge
```

### Files to modify

```
src/app/(dashboard)/finance/appels-fonds/page.tsx          # Réécrire — importer nouveaux composants
src/app/(dashboard)/finance/appels-fonds/[callId]/page.tsx # Réécrire — importer nouveaux composants
src/lib/finance/api.ts                                     # Ajouter lot_weight, key_total_weight à CallLineDetailed
```

### Files to delete (Task finale)

```
src/components/features/finance/AppelsFonds/               # 37 fichiers legacy
src/hooks/modules/useAppelsFonds.ts                        # Hook monolithique 832 lignes
src/app/(dashboard)/finance/calls/                         # Page doublon
src/features/finance/calls/                                # Feature doublon
src/lib/services/emission-appel.service.ts                 # Service mock
src/lib/services/regles-modification-appel.service.ts      # Service mock
```

---

## Chunk 1: Fondations (types, utils, migration DB)

### Task 1: Types d'affichage

**Files:**
- Create: `src/features/finance/appels-fonds/types.ts`

- [ ] **Step 1: Créer le fichier types**

```typescript
import type { CallForFundsOverview } from '@/lib/finance/api';

export type AppelTab = 'all' | 'courant' | 'travaux';

export type TrimesterStatus = 'draft' | 'active' | 'paid';

export interface TrimesterCard {
  trimester: number;
  label: string;
  calls: CallForFundsOverview[];
  totalAmount: number;
  totalPaid: number;
  recoveryRate: number;
  keys: { name: string; amount: number }[];
  status: TrimesterStatus;
}

export interface TravauxProject {
  budgetId: string;
  budgetLabel: string;
  agId: string | null;
  agDate: string | null;
  resolutionTitle: string;
  article: string;
  repartitionKeyName: string;
  totalAmount: number;
  totalPaid: number;
  recoveryRate: number;
  calls: CallForFundsOverview[];
}

export interface AppelStats {
  totalCalled: number;
  totalPaid: number;
  totalUnpaid: number;
  recoveryRate: number;
}

export interface TravauxStats extends AppelStats {
  projectCount: number;
}

export interface DetailStats {
  called: number;
  paid: number;
  remaining: number;
  paidCount: number;
  totalCount: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/types.ts
git commit -m "feat(appels-fonds): add display types (TrimesterCard, TravauxProject, AppelTab)"
```

---

### Task 2: Fonctions utilitaires

**Files:**
- Create: `src/features/finance/appels-fonds/utils.ts`

- [ ] **Step 1: Créer les utilitaires**

```typescript
import type { CallForFundsOverview } from '@/lib/finance/api';
import type { BudgetOverview } from '@/lib/budget/api';
import type { TrimesterCard, TravauxProject, TrimesterStatus, AppelStats } from './types';

/** Calcule le taux de recouvrement en pourcentage */
export function recoveryRate(totalAmount: number, totalPaid: number): number {
  return totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 1000) / 10 : 0;
}

/** Label trimestre : "T1 — Janvier → Mars 2026" */
export function trimesterLabel(trimester: number, periodStart: string): string {
  const year = new Date(periodStart).getFullYear();
  const months: Record<number, [string, string]> = {
    1: ['Janvier', 'Mars'],
    2: ['Avril', 'Juin'],
    3: ['Juillet', 'Septembre'],
    4: ['Octobre', 'Décembre'],
  };
  const [start, end] = months[trimester] ?? ['?', '?'];
  return `T${trimester} — ${start} → ${end} ${year + (trimester === 4 ? 1 : 0)}`;
}

/** Dérive le statut d'un trimestre depuis ses appels */
function deriveTrimesterStatus(calls: CallForFundsOverview[]): TrimesterStatus {
  if (calls.length === 0) return 'draft';
  if (calls.every(c => c.status === 'paid')) return 'paid';
  if (calls.some(c => c.status !== 'draft')) return 'active';
  return 'draft';
}

/** Construit les cartes trimestres depuis les appels budget courant */
export function buildTrimesterCards(
  calls: CallForFundsOverview[],
  periodStart: string
): TrimesterCard[] {
  const byTrimester = new Map<number, CallForFundsOverview[]>();

  for (const call of calls) {
    const t = call.trimester ?? 1;
    const existing = byTrimester.get(t) ?? [];
    existing.push(call);
    byTrimester.set(t, existing);
  }

  const cards: TrimesterCard[] = [];
  for (const [trimester, trimCalls] of byTrimester) {
    const totalAmount = trimCalls.reduce((sum, c) => sum + c.total_amount, 0);
    const totalPaid = trimCalls.reduce((sum, c) => sum + c.total_paid, 0);

    const keysMap = new Map<string, number>();
    for (const c of trimCalls) {
      keysMap.set(c.repartition_key_name, (keysMap.get(c.repartition_key_name) ?? 0) + c.total_amount);
    }

    cards.push({
      trimester,
      label: trimesterLabel(trimester, periodStart),
      calls: trimCalls,
      totalAmount,
      totalPaid,
      recoveryRate: recoveryRate(totalAmount, totalPaid),
      keys: Array.from(keysMap, ([name, amount]) => ({ name, amount })),
      status: deriveTrimesterStatus(trimCalls),
    });
  }

  return cards.sort((a, b) => a.trimester - b.trimester);
}

/** Construit les projets travaux depuis appels + budgets */
export function buildTravauxProjects(
  calls: CallForFundsOverview[],
  budgets: BudgetOverview[]
): TravauxProject[] {
  const budgetMap = new Map(budgets.map(b => [b.id, b]));
  const byBudget = new Map<string, CallForFundsOverview[]>();

  for (const call of calls) {
    if (!call.budget_id) continue;
    const existing = byBudget.get(call.budget_id) ?? [];
    existing.push(call);
    byBudget.set(call.budget_id, existing);
  }

  const projects: TravauxProject[] = [];
  for (const [budgetId, budgetCalls] of byBudget) {
    const budget = budgetMap.get(budgetId);
    if (!budget) continue;

    const sortedCalls = [...budgetCalls].sort(
      (a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime()
    );
    const totalAmount = sortedCalls.reduce((sum, c) => sum + c.total_amount, 0);
    const totalPaid = sortedCalls.reduce((sum, c) => sum + c.total_paid, 0);

    projects.push({
      budgetId,
      budgetLabel: budget.name,
      agId: null, // TODO: à enrichir quand le lien AG→budget sera exposé
      agDate: null,
      resolutionTitle: budget.name,
      article: '', // TODO: à enrichir
      repartitionKeyName: sortedCalls[0]?.repartition_key_name ?? '',
      totalAmount,
      totalPaid,
      recoveryRate: recoveryRate(totalAmount, totalPaid),
      calls: sortedCalls,
    });
  }

  return projects;
}

/** Calcule les stats agrégées pour un ensemble d'appels */
export function computeStats(calls: CallForFundsOverview[]): AppelStats {
  const totalCalled = calls.reduce((sum, c) => sum + c.total_amount, 0);
  const totalPaid = calls.reduce((sum, c) => sum + c.total_paid, 0);
  return {
    totalCalled,
    totalPaid,
    totalUnpaid: totalCalled - totalPaid,
    recoveryRate: recoveryRate(totalCalled, totalPaid),
  };
}

/** Formatte un montant en euros */
export function formatEuros(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/utils.ts
git commit -m "feat(appels-fonds): add utility functions (buildTrimesterCards, buildTravauxProjects, stats)"
```

---

### Task 3: Migration DB — tantièmes dans v_call_lines_detailed

**Files:**
- Create: `supabase/migrations/20260314_call_lines_add_weight.sql`
- Modify: `src/lib/finance/api.ts` (ajouter 2 champs à `CallLineDetailed`)

- [ ] **Step 1: Créer la migration SQL**

```sql
-- Migration: Ajouter lot_weight et key_total_weight à v_call_lines_detailed
-- Permet d'afficher les tantièmes dans la page détail des appels de fonds

CREATE OR REPLACE VIEW v_call_lines_detailed
WITH (security_invoker = true) AS
SELECT
  cfl.id,
  cfl.copro_id,
  cfl.call_id,
  cf.label as call_label,
  cf.issue_date,
  cf.due_date,
  cf.status as call_status,
  cf.repartition_key_id,
  cfl.lot_id,
  l.ref as lot_ref,
  l.type as lot_type,
  cfl.amount_due,
  cfl.amount_paid,
  cfl.amount_due - cfl.amount_paid as amount_remaining,
  cfl.status,
  -- Tantièmes : poids du lot dans la clé de répartition de l'appel
  COALESCE(rkl.weight, 0) as lot_weight,
  -- Total tantièmes de la clé
  COALESCE(rk_total.total_weight, 0) as key_total_weight,
  -- Premier propriétaire actif
  (
    SELECT cp.first_name || ' ' || cp.last_name
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = cfl.lot_id
      AND lo.is_primary = true
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
    LIMIT 1
  ) as owner_name
FROM call_for_funds_lines cfl
JOIN call_for_funds cf ON cf.id = cfl.call_id
JOIN lots l ON l.id = cfl.lot_id
LEFT JOIN repartition_key_lines rkl
  ON rkl.key_id = cf.repartition_key_id AND rkl.lot_id = cfl.lot_id
LEFT JOIN (
  SELECT key_id, SUM(weight) as total_weight
  FROM repartition_key_lines
  GROUP BY key_id
) rk_total ON rk_total.key_id = cf.repartition_key_id;
```

- [ ] **Step 2: Mettre à jour le type TypeScript**

Dans `src/lib/finance/api.ts`, ajouter à `CallLineDetailed` :

```typescript
// Ajouter après owner_name:
  repartition_key_id: string;
  lot_weight: number;
  key_total_weight: number;
```

- [ ] **Step 3: Appliquer la migration en DB**

```bash
# Via Supabase CLI ou directement en DB
# supabase db push
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260314_call_lines_add_weight.sql src/lib/finance/api.ts
git commit -m "feat(db): add lot_weight and key_total_weight to v_call_lines_detailed"
```

---

## Chunk 2: Composants UI atomiques (StatsGrid, ProgressBar, AlertBanner, StatusBadge)

### Task 4: StatsGrid component

**Files:**
- Create: `src/features/finance/appels-fonds/components/StatsGrid.tsx`
- Create: `src/features/finance/appels-fonds/styles/StatsGrid.module.css`

- [ ] **Step 1: Créer le CSS**

```css
/* StatsGrid.module.css */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}

.iconBlue { background: var(--primary-light); color: var(--secondary); }
.iconGreen { background: rgba(52, 211, 153, 0.2); color: var(--success); }
.iconRed { background: rgba(248, 113, 113, 0.2); color: var(--danger); }
.iconAmber { background: rgba(251, 191, 36, 0.2); color: var(--warning); }
.iconPurple { background: rgba(167, 139, 250, 0.15); color: #A78BFA; }

.label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-main);
}

.valueGreen { color: var(--success); }
.valueRed { color: var(--danger); }

.valueSuffix {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-weight: 400;
}

@media (max-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 2: Créer le composant**

```typescript
'use client';

import styles from '../styles/StatsGrid.module.css';
import clsx from 'clsx';

export type StatColor = 'blue' | 'green' | 'red' | 'amber' | 'purple';

export interface StatItem {
  icon: string;
  iconColor: StatColor;
  label: string;
  value: string;
  valueColor?: 'green' | 'red';
  suffix?: string;
}

interface StatsGridProps {
  items: StatItem[];
}

const iconColorMap: Record<StatColor, string> = {
  blue: styles.iconBlue,
  green: styles.iconGreen,
  red: styles.iconRed,
  amber: styles.iconAmber,
  purple: styles.iconPurple,
};

const valueColorMap: Record<string, string> = {
  green: styles.valueGreen,
  red: styles.valueRed,
};

export function StatsGrid({ items }: StatsGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item, i) => (
        <div key={i} className={styles.card}>
          <div className={clsx(styles.icon, iconColorMap[item.iconColor])}>
            {item.icon}
          </div>
          <div>
            <div className={styles.label}>{item.label}</div>
            <div className={clsx(styles.value, item.valueColor && valueColorMap[item.valueColor])}>
              {item.value}
              {item.suffix && <span className={styles.valueSuffix}> {item.suffix}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/appels-fonds/components/StatsGrid.tsx src/features/finance/appels-fonds/styles/StatsGrid.module.css
git commit -m "feat(appels-fonds): add StatsGrid component"
```

---

### Task 5: ProgressBar, AlertBanner, StatusBadge

**Files:**
- Create: `src/features/finance/appels-fonds/components/ProgressBar.tsx`
- Create: `src/features/finance/appels-fonds/components/AlertBanner.tsx`
- Create: `src/features/finance/appels-fonds/components/StatusBadge.tsx`
- Append to: `src/features/finance/appels-fonds/styles/StatsGrid.module.css`

- [ ] **Step 1: ProgressBar**

```typescript
'use client';

import clsx from 'clsx';
import styles from '../styles/StatsGrid.module.css';

interface ProgressBarProps {
  label: string;
  value: string;
  percentage: number;
  color?: 'green' | 'purple';
}

export function ProgressBar({ label, value, percentage, color = 'green' }: ProgressBarProps) {
  return (
    <div className={styles.progressCompact}>
      <span className={styles.progressLabel}>{label}</span>
      <div className={styles.progressTrack}>
        <div
          className={clsx(styles.progressFill, color === 'purple' ? styles.progressPurple : styles.progressGreen)}
          style={{ '--progress-width': `${Math.min(percentage, 100)}%` } as React.CSSProperties}
        />
      </div>
      <span className={styles.progressValue}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: AlertBanner**

```typescript
'use client';

import styles from '../styles/StatsGrid.module.css';

interface AlertBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AlertBanner({ message, actionLabel, onAction }: AlertBannerProps) {
  return (
    <div className={styles.alertBanner}>
      <span className={styles.alertIcon}>⚠</span>
      <div dangerouslySetInnerHTML={{ __html: message }} />
      {actionLabel && onAction && (
        <button className={styles.alertAction} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: StatusBadge**

```typescript
'use client';

import styles from '../styles/StatsGrid.module.css';
import clsx from 'clsx';

type BadgeVariant = 'green' | 'amber' | 'red' | 'neutral' | 'purple';

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

const variantMap: Record<BadgeVariant, string> = {
  green: styles.badgeGreen,
  amber: styles.badgeAmber,
  red: styles.badgeRed,
  neutral: styles.badgeNeutral,
  purple: styles.badgePurple,
};

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={clsx(styles.badge, variantMap[variant])}>
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Ajouter les styles manquants** dans `StatsGrid.module.css` :

```css
/* ProgressBar */
.progressCompact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
  font-size: var(--text-sm);
}

.progressLabel {
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.progressTrack {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 500ms ease;
  width: var(--progress-width, 0%);
}

.progressGreen { background: var(--success); }
.progressPurple { background: #A78BFA; }

.progressValue {
  font-weight: 600;
  white-space: nowrap;
}

/* AlertBanner */
.alertBanner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  margin-bottom: var(--space-lg);
  background: rgba(248, 113, 113, 0.2);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--danger);
}

.alertIcon { font-size: 16px; flex-shrink: 0; }

.alertAction {
  margin-left: auto;
  padding: 4px 12px;
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
  white-space: nowrap;
  font-family: inherit;
}

.alertAction:hover { background: rgba(248, 113, 113, 0.25); }

/* StatusBadge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
}

.badgeGreen { background: rgba(52, 211, 153, 0.2); color: var(--success); }
.badgeAmber { background: rgba(251, 191, 36, 0.2); color: var(--warning); }
.badgeRed { background: rgba(248, 113, 113, 0.2); color: var(--danger); }
.badgeNeutral { background: rgba(148, 163, 184, 0.2); color: var(--text-tertiary); }
.badgePurple { background: rgba(167, 139, 250, 0.15); color: #A78BFA; }
```

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/appels-fonds/components/ProgressBar.tsx \
        src/features/finance/appels-fonds/components/AlertBanner.tsx \
        src/features/finance/appels-fonds/components/StatusBadge.tsx \
        src/features/finance/appels-fonds/styles/StatsGrid.module.css
git commit -m "feat(appels-fonds): add ProgressBar, AlertBanner, StatusBadge components"
```

---

## Chunk 3: Composants cartes (TrimesterCard, TravauxCard, EcheanceCard)

### Task 6: TrimesterCard

**Files:**
- Create: `src/features/finance/appels-fonds/components/TrimesterCard.tsx`
- Create: `src/features/finance/appels-fonds/styles/Cards.module.css`

- [ ] **Step 1: Créer le CSS des cartes**

```css
/* Cards.module.css */

/* ── TrimesterCard ── */
.trimCard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.trimCard:hover {
  box-shadow: var(--shadow-md);
  border-color: rgba(148, 163, 184, 0.3);
  transform: translateY(-1px);
}

.trimCardActive {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(37, 99, 235, 0.02) 100%);
}

.trimCardDraft {
  border-style: dashed;
  opacity: 0.65;
}

.trimCardDraft:hover { opacity: 0.85; }

.trimHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.trimTitle { font-size: 15px; font-weight: 600; }

.trimMeta {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.trimMetaActive { color: var(--primary); font-weight: 600; }

.trimProgress {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  margin-bottom: 12px;
  overflow: hidden;
}

.trimProgressFill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 400ms ease;
}

.trimKeys {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.trimKeyTag {
  padding: 3px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.trimActions {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.actionBtn {
  flex: 1;
  padding: 6px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
  font-family: inherit;
}

.actionBtn:hover {
  color: var(--text-main);
  border-color: rgba(148, 163, 184, 0.3);
  background: var(--surface-hover, #252b3b);
}

.actionBtnPrimary {
  composes: actionBtn;
  background: var(--primary-light);
  color: var(--primary);
  border-color: transparent;
}

.actionBtnPrimary:hover {
  background: var(--primary);
  color: white;
}

/* ── TravauxCard ── */
.travauxCard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 20px;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
  border-left: 3px solid #A78BFA;
}

.travauxCard:hover { box-shadow: var(--shadow-md); }

.travauxHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.travauxTitle { font-size: 15px; font-weight: 600; margin-bottom: 2px; }

.travauxOrigin { font-size: 12px; color: var(--text-tertiary); }
.travauxOriginLink { color: var(--primary); text-decoration: none; cursor: pointer; }

.travauxAmount { text-align: right; }
.travauxTotal { font-size: 18px; font-weight: 700; }
.travauxSub { font-size: 12px; color: var(--text-tertiary); }

.travauxProgress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.travauxProgressBar {
  flex: 1;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.travauxProgressFill {
  height: 100%;
  border-radius: var(--radius-full);
  background: #A78BFA;
}

.travauxPct {
  font-size: var(--text-sm);
  font-weight: 600;
  color: #A78BFA;
  min-width: 40px;
  text-align: right;
}

.echeancierLabel {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.echeancierGrid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.travauxActions {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

/* ── EcheanceCard ── */
.echeance {
  flex: 1;
  min-width: 140px;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.echeance:hover {
  border-color: rgba(148, 163, 184, 0.3);
  background: var(--surface-hover, #252b3b);
}

.echeancePaid {
  border-color: rgba(52, 211, 153, 0.3);
  background: rgba(52, 211, 153, 0.06);
}

.echeanceCurrent {
  border-color: #A78BFA;
  background: rgba(167, 139, 250, 0.06);
}

.echeanceUpcoming {
  opacity: 0.6;
  border-style: dashed;
}

.echeanceLabel { font-weight: 600; color: var(--text-main); margin-bottom: 2px; }
.echeanceDate { color: var(--text-tertiary); font-size: 11px; }
.echeanceAmount { font-weight: 600; margin-top: 4px; }

/* ── Grids ── */
.trimesterGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

.travauxGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .trimesterGrid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Créer TrimesterCard**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { TrimesterCard as TrimesterCardType } from '../types';
import { formatEuros } from '../utils';
import { StatusBadge } from './StatusBadge';
import styles from '../styles/Cards.module.css';

interface TrimesterCardProps {
  card: TrimesterCardType;
}

function recoveryBadgeVariant(rate: number): 'green' | 'amber' | 'neutral' {
  if (rate >= 75) return 'green';
  if (rate >= 25) return 'amber';
  return 'neutral';
}

export function TrimesterCard({ card }: TrimesterCardProps) {
  const router = useRouter();
  const firstCallId = card.calls[0]?.id;
  const issuedAt = card.calls.find(c => c.issued_at)?.issued_at;

  const handleDetail = () => {
    if (firstCallId) router.push(`/finance/appels-fonds/${firstCallId}`);
  };

  const unpaidCount = card.calls.reduce((sum, c) => sum + c.lines_unpaid_count, 0);
  const progressColor = card.recoveryRate >= 75 ? 'var(--success)' : 'var(--warning)';

  return (
    <div
      className={clsx(
        styles.trimCard,
        card.status === 'active' && styles.trimCardActive,
        card.status === 'draft' && styles.trimCardDraft,
      )}
      onClick={handleDetail}
    >
      <div className={styles.trimHeader}>
        <span className={styles.trimTitle}>{card.label}</span>
        <StatusBadge
          label={card.status === 'draft' ? 'Brouillon' : `${card.recoveryRate} %`}
          variant={card.status === 'draft' ? 'neutral' : recoveryBadgeVariant(card.recoveryRate)}
        />
      </div>

      <div className={styles.trimMeta}>
        {card.keys.length} clé{card.keys.length > 1 ? 's' : ''} · {formatEuros(card.totalAmount)}
        {issuedAt && ` · Émis le ${new Date(issuedAt).toLocaleDateString('fr-FR')}`}
        {card.status === 'active' && !issuedAt && (
          <strong className={styles.trimMetaActive}> · En cours</strong>
        )}
      </div>

      <div className={styles.trimProgress}>
        <div
          className={styles.trimProgressFill}
          style={{ width: `${card.recoveryRate}%`, background: progressColor }}
        />
      </div>

      <div className={styles.trimKeys}>
        {card.keys.map(k => (
          <span key={k.name} className={styles.trimKeyTag}>
            {k.name} — {formatEuros(k.amount)}
          </span>
        ))}
      </div>

      <div className={styles.trimActions}>
        {card.status === 'draft' ? (
          <button className={styles.actionBtnPrimary} onClick={e => { e.stopPropagation(); }}>
            Émettre
          </button>
        ) : (
          <>
            <button className={styles.actionBtn} onClick={e => { e.stopPropagation(); }}>
              📄 Avis
            </button>
            <button className={styles.actionBtnPrimary} onClick={e => { e.stopPropagation(); handleDetail(); }}>
              📊 Détail
            </button>
            {unpaidCount > 0 && (
              <button className={styles.actionBtn} onClick={e => { e.stopPropagation(); }}>
                Relancer ({unpaidCount})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/appels-fonds/components/TrimesterCard.tsx \
        src/features/finance/appels-fonds/styles/Cards.module.css
git commit -m "feat(appels-fonds): add TrimesterCard component + Cards CSS"
```

---

### Task 7: EcheanceCard + TravauxCard

**Files:**
- Create: `src/features/finance/appels-fonds/components/EcheanceCard.tsx`
- Create: `src/features/finance/appels-fonds/components/TravauxCard.tsx`

- [ ] **Step 1: EcheanceCard**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { CallForFundsOverview } from '@/lib/finance/api';
import { formatEuros } from '../utils';
import { StatusBadge } from './StatusBadge';
import styles from '../styles/Cards.module.css';

interface EcheanceCardProps {
  call: CallForFundsOverview;
  index: number;
  total: number;
}

export function EcheanceCard({ call, index, total }: EcheanceCardProps) {
  const router = useRouter();
  const isPaid = call.status === 'paid';
  const isCurrent = call.status === 'issued' || call.status === 'partially_paid';
  const isUpcoming = call.status === 'draft';

  const rate = call.total_amount > 0
    ? Math.round((call.total_paid / call.total_amount) * 100)
    : 0;

  let statusLabel = 'À émettre';
  let statusVariant: 'green' | 'purple' | 'neutral' = 'neutral';
  let amountColor = 'var(--text-tertiary)';

  if (isPaid) {
    statusLabel = 'Soldé';
    statusVariant = 'green';
    amountColor = 'var(--success)';
  } else if (isCurrent) {
    statusLabel = `En cours — ${rate} %`;
    statusVariant = 'purple';
    amountColor = '#A78BFA';
  }

  return (
    <div
      className={clsx(
        styles.echeance,
        isPaid && styles.echeancePaid,
        isCurrent && styles.echeanceCurrent,
        isUpcoming && styles.echeanceUpcoming,
      )}
      onClick={() => !isUpcoming && router.push(`/finance/appels-fonds/${call.id}`)}
    >
      <div className={styles.echeanceLabel}>Appel {index + 1}/{total}</div>
      <div className={styles.echeanceDate}>
        Échéance : {new Date(call.due_date).toLocaleDateString('fr-FR')}
      </div>
      <div className={styles.echeanceAmount} style={{ color: amountColor }}>
        {formatEuros(call.total_amount)}
      </div>
      <StatusBadge label={statusLabel} variant={statusVariant} />
    </div>
  );
}
```

- [ ] **Step 2: TravauxCard**

```typescript
'use client';

import { useRouter } from 'next/navigation';
import type { TravauxProject } from '../types';
import { formatEuros } from '../utils';
import { EcheanceCard } from './EcheanceCard';
import styles from '../styles/Cards.module.css';

interface TravauxCardProps {
  project: TravauxProject;
}

export function TravauxCard({ project }: TravauxCardProps) {
  const router = useRouter();
  const currentCall = project.calls.find(
    c => c.status === 'issued' || c.status === 'partially_paid'
  );
  const unpaidCount = project.calls.reduce((sum, c) => sum + c.lines_unpaid_count, 0);

  return (
    <div className={styles.travauxCard}>
      <div className={styles.travauxHeader}>
        <div>
          <div className={styles.travauxTitle}>{project.budgetLabel}</div>
          <div className={styles.travauxOrigin}>
            {project.agDate && `AG du ${new Date(project.agDate).toLocaleDateString('fr-FR')} · `}
            {project.resolutionTitle}
            {project.article && ` · `}
            {project.article && (
              <span className={styles.travauxOriginLink}>Art. {project.article}</span>
            )}
            {` · Clé : ${project.repartitionKeyName}`}
          </div>
        </div>
        <div className={styles.travauxAmount}>
          <div className={styles.travauxTotal}>{formatEuros(project.totalAmount)}</div>
          <div className={styles.travauxSub}>Encaissé : {formatEuros(project.totalPaid)}</div>
        </div>
      </div>

      <div className={styles.travauxProgress}>
        <div className={styles.travauxProgressBar}>
          <div
            className={styles.travauxProgressFill}
            style={{ width: `${project.recoveryRate}%` }}
          />
        </div>
        <span className={styles.travauxPct}>{project.recoveryRate} %</span>
      </div>

      <div className={styles.echeancierLabel}>
        Échéancier — {project.calls.length} appel{project.calls.length > 1 ? 's' : ''}
      </div>
      <div className={styles.echeancierGrid}>
        {project.calls.map((call, i) => (
          <EcheanceCard key={call.id} call={call} index={i} total={project.calls.length} />
        ))}
      </div>

      <div className={styles.travauxActions}>
        <button className={styles.actionBtn}>📄 Avis PDF</button>
        {currentCall && (
          <button
            className={styles.actionBtnPrimary}
            onClick={() => router.push(`/finance/appels-fonds/${currentCall.id}`)}
          >
            📊 Détail
          </button>
        )}
        {unpaidCount > 0 && (
          <button className={styles.actionBtn}>Relancer ({unpaidCount})</button>
        )}
        <button className={styles.actionBtn}>📨 Envoyer</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/appels-fonds/components/EcheanceCard.tsx \
        src/features/finance/appels-fonds/components/TravauxCard.tsx
git commit -m "feat(appels-fonds): add TravauxCard + EcheanceCard components"
```

---

## Chunk 4: Tabs + Header + Page listing

### Task 8: AppelsFondsHeader + AppelsFondsTabs

**Files:**
- Create: `src/features/finance/appels-fonds/components/AppelsFondsHeader.tsx`
- Create: `src/features/finance/appels-fonds/components/AppelsFondsTabs.tsx`
- Create: `src/features/finance/appels-fonds/styles/AppelsFondsPage.module.css`

- [ ] **Step 1: Créer le CSS page**

Le CSS doit inclure : `.pageHeader`, `.headerTitle`, `.headerSubtitle`, `.headerActions`, `.periodBar`, `.periodNav`, `.periodNavBtn`, `.periodLabel`, `.periodMeta`, `.periodMetaValue`, `.tabsBar`, `.tab`, `.tabActive`, `.tabIcon`, `.tabIconBlue`, `.tabIconPurple`, `.tabIconNeutral`, `.tabLabel`, `.tabAmount`, `.sectionTitleRow`, `.sectionIconSm`, `.sectionTitleText`, `.sectionMeta`.

Suivre la maquette `appels-v5.html` pour les valeurs exactes. Inclure les media queries `@media (max-width: 768px)`.

- [ ] **Step 2: Créer AppelsFondsHeader**

Props : `periodLabel: string`, `periodMeta: string`, `onPrev: () => void`, `onNext: () => void`, `onGenerate: () => void`, `onExport: () => void`.

Rendu : `.pageHeader` (titre + boutons) + `.periodBar` (nav + label + meta).

- [ ] **Step 3: Créer AppelsFondsTabs**

Props : `activeTab: AppelTab`, `onTabChange: (tab: AppelTab) => void`, `globalAmount: string`, `globalRate: number`, `courantAmount: string`, `courantRate: number`, `travauxAmount: string`, `travauxRate: number`.

Rendu : `.tabsBar` avec 3 `.tab` (Vue globale, Budget courant, Travaux). Chaque tab montre icône + label + montant + badge taux.

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/appels-fonds/components/AppelsFondsHeader.tsx \
        src/features/finance/appels-fonds/components/AppelsFondsTabs.tsx \
        src/features/finance/appels-fonds/styles/AppelsFondsPage.module.css
git commit -m "feat(appels-fonds): add AppelsFondsHeader + AppelsFondsTabs"
```

---

### Task 9: TabVueGlobale, TabBudgetCourant, TabTravaux

**Files:**
- Create: `src/features/finance/appels-fonds/components/TabVueGlobale.tsx`
- Create: `src/features/finance/appels-fonds/components/TabBudgetCourant.tsx`
- Create: `src/features/finance/appels-fonds/components/TabTravaux.tsx`

- [ ] **Step 1: TabVueGlobale**

Props : `globalStats: AppelStats`, `courantStats: AppelStats`, `travauxStats: TravauxStats`, `impayesCount: number`, `onViewImpayes: () => void`.

Rendu : `StatsGrid` (4 KPIs globaux) + `AlertBanner` (si impayés) + section Budget courant (`ProgressBar` vert) + section Travaux (`ProgressBar` violet).

- [ ] **Step 2: TabBudgetCourant**

Props : `stats: AppelStats`, `trimesterCards: TrimesterCard[]`, `impayesCount: number`, `onViewImpayes: () => void`.

Rendu : `StatsGrid` + `ProgressBar` + `AlertBanner` (si impayés) + `.trimesterGrid` avec `TrimesterCard` pour chaque carte.

- [ ] **Step 3: TabTravaux**

Props : `stats: TravauxStats`, `projects: TravauxProject[]`.

Rendu : `StatsGrid` (4e KPI = nombre de chantiers) + `ProgressBar` violet + `.travauxGrid` avec `TravauxCard` pour chaque projet.

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/appels-fonds/components/TabVueGlobale.tsx \
        src/features/finance/appels-fonds/components/TabBudgetCourant.tsx \
        src/features/finance/appels-fonds/components/TabTravaux.tsx
git commit -m "feat(appels-fonds): add tab content components (VueGlobale, BudgetCourant, Travaux)"
```

---

### Task 10: Hook useAppelsFondsPage

**Files:**
- Create: `src/features/finance/appels-fonds/hooks/useAppelsFondsPage.ts`

- [ ] **Step 1: Créer le hook**

```typescript
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  useCalls,
  useCallCampaigns,
  useAccountingPeriods,
  useUnpaid,
} from '@/hooks/modules/useFinanceData';
import { useBudgetData } from '@/hooks/modules/useBudgetData';
import type { AppelTab, TrimesterCard, TravauxProject, AppelStats, TravauxStats } from '../types';
import { buildTrimesterCards, buildTravauxProjects, computeStats } from '../utils';

export function useAppelsFondsPage() {
  const [activeTab, setActiveTab] = useState<AppelTab>('all');

  // Data
  const { data: allCalls, isLoading: callsLoading } = useCalls();
  const { data: campaigns } = useCallCampaigns();
  const { data: periods, isLoading: periodsLoading } = useAccountingPeriods();
  const { data: unpaid } = useUnpaid();
  // Charger les budgets pour la période sélectionnée (pour connaître le type current/works)
  const selectedYear = selectedPeriod
    ? new Date(selectedPeriod.start_date).getFullYear()
    : new Date().getFullYear();
  const { budgets } = useBudgetData({ periodYear: selectedYear });

  // Period navigation
  const sortedPeriods = useMemo(
    () => [...(periods ?? [])].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [periods]
  );
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const selectedPeriod = sortedPeriods[selectedPeriodIndex] ?? null;

  const navigatePeriod = useCallback((direction: 'prev' | 'next') => {
    setSelectedPeriodIndex(prev => {
      if (direction === 'prev') return Math.min(prev + 1, sortedPeriods.length - 1);
      return Math.max(prev - 1, 0);
    });
  }, [sortedPeriods.length]);

  // Filter calls by period
  const periodCalls = useMemo(() => {
    if (!selectedPeriod || !allCalls) return [];
    return allCalls.filter(c => c.period_id === selectedPeriod.id);
  }, [allCalls, selectedPeriod]);

  // Budget type map
  const budgetTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of budgets) {
      map.set(b.id, b.budget_type);
    }
    return map;
  }, [budgets]);

  // Split courant / travaux
  const courantCalls = useMemo(
    () => periodCalls.filter(c => !c.budget_id || budgetTypeMap.get(c.budget_id) === 'current'),
    [periodCalls, budgetTypeMap]
  );
  const travauxCalls = useMemo(
    () => periodCalls.filter(c => c.budget_id && budgetTypeMap.get(c.budget_id) === 'works'),
    [periodCalls, budgetTypeMap]
  );

  // Build display data
  const trimesterCards = useMemo(
    () => buildTrimesterCards(courantCalls, selectedPeriod?.start_date ?? ''),
    [courantCalls, selectedPeriod]
  );

  const worksBudgets = useMemo(
    () => budgets.filter(b => b.budget_type === 'works' && b.period_id === selectedPeriod?.id),
    [budgets, selectedPeriod]
  );

  const travauxProjects = useMemo(
    () => buildTravauxProjects(travauxCalls, worksBudgets),
    [travauxCalls, worksBudgets]
  );

  // Stats
  const globalStats: AppelStats = useMemo(() => computeStats(periodCalls), [periodCalls]);
  const courantStats: AppelStats = useMemo(() => computeStats(courantCalls), [courantCalls]);
  const travauxStats: TravauxStats = useMemo(() => ({
    ...computeStats(travauxCalls),
    projectCount: travauxProjects.length,
  }), [travauxCalls, travauxProjects]);

  const impayesCount = unpaid?.length ?? 0;

  return {
    // Data
    calls: periodCalls,
    trimesterCards,
    travauxProjects,
    campaign: campaigns?.find(c => c.period_id === selectedPeriod?.id) ?? null,

    // Stats
    globalStats,
    courantStats,
    travauxStats,

    // UI
    activeTab,
    setActiveTab,
    impayesCount,

    // Period
    periods: sortedPeriods,
    selectedPeriod,
    navigatePeriod,
    canGoPrev: selectedPeriodIndex < sortedPeriods.length - 1,
    canGoNext: selectedPeriodIndex > 0,

    // Loading
    isLoading: callsLoading || periodsLoading,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/hooks/useAppelsFondsPage.ts
git commit -m "feat(appels-fonds): add useAppelsFondsPage hook (orchestrator)"
```

---

### Task 11: Page listing (réécrire page.tsx)

**Files:**
- Modify: `src/app/(dashboard)/finance/appels-fonds/page.tsx`

- [ ] **Step 1: Réécrire la page**

```typescript
'use client';

import { useAppelsFondsPage } from '@/features/finance/appels-fonds/hooks/useAppelsFondsPage';
import { AppelsFondsHeader } from '@/features/finance/appels-fonds/components/AppelsFondsHeader';
import { AppelsFondsTabs } from '@/features/finance/appels-fonds/components/AppelsFondsTabs';
import { TabVueGlobale } from '@/features/finance/appels-fonds/components/TabVueGlobale';
import { TabBudgetCourant } from '@/features/finance/appels-fonds/components/TabBudgetCourant';
import { TabTravaux } from '@/features/finance/appels-fonds/components/TabTravaux';
import { formatEuros } from '@/features/finance/appels-fonds/utils';

export default function AppelsFondsPage() {
  const {
    trimesterCards, travauxProjects,
    globalStats, courantStats, travauxStats,
    activeTab, setActiveTab, impayesCount,
    selectedPeriod, navigatePeriod, canGoPrev, canGoNext,
    isLoading,
  } = useAppelsFondsPage();

  if (isLoading) return <div>Chargement...</div>;

  const periodLabel = selectedPeriod
    ? `Exercice ${new Date(selectedPeriod.start_date).getFullYear()}–${new Date(selectedPeriod.end_date).getFullYear()}`
    : 'Aucun exercice';

  const periodMeta = selectedPeriod
    ? `Budget courant : ${formatEuros(courantStats.totalCalled)} · Travaux votés : ${formatEuros(travauxStats.totalCalled)}`
    : '';

  return (
    <>
      <AppelsFondsHeader
        periodLabel={periodLabel}
        periodMeta={periodMeta}
        onPrev={() => navigatePeriod('prev')}
        onNext={() => navigatePeriod('next')}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onGenerate={() => {}}
        onExport={() => {}}
      />

      <AppelsFondsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        globalAmount={formatEuros(globalStats.totalCalled)}
        globalRate={globalStats.recoveryRate}
        courantAmount={formatEuros(courantStats.totalCalled)}
        courantRate={courantStats.recoveryRate}
        travauxAmount={formatEuros(travauxStats.totalCalled)}
        travauxRate={travauxStats.recoveryRate}
      />

      {activeTab === 'all' && (
        <TabVueGlobale
          globalStats={globalStats}
          courantStats={courantStats}
          travauxStats={travauxStats}
          impayesCount={impayesCount}
          onViewImpayes={() => {}}
        />
      )}

      {activeTab === 'courant' && (
        <TabBudgetCourant
          stats={courantStats}
          trimesterCards={trimesterCards}
          impayesCount={impayesCount}
          onViewImpayes={() => {}}
        />
      )}

      {activeTab === 'travaux' && (
        <TabTravaux
          stats={travauxStats}
          projects={travauxProjects}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Vérifier que la page compile**

```bash
cd /Users/trikilyes/Desktop/Flex/Co-Pro-Flex && npx next build --no-lint 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/finance/appels-fonds/page.tsx
git commit -m "feat(appels-fonds): rewrite listing page with tabs (vue globale, budget courant, travaux)"
```

---

## Chunk 5: Page détail

### Task 12: DetailHeader + CoproTable

**Files:**
- Create: `src/features/finance/appels-fonds/components/DetailHeader.tsx`
- Create: `src/features/finance/appels-fonds/components/CoproTable.tsx`
- Create: `src/features/finance/appels-fonds/styles/DetailPage.module.css`
- Create: `src/features/finance/appels-fonds/styles/CoproTable.module.css`

- [ ] **Step 1: Créer le CSS** pour DetailHeader (back link, titre, sous-titre, actions) et CoproTable (table standard du design system).

- [ ] **Step 2: DetailHeader**

Props : `title: string`, `subtitle: string`, `onBack: () => void`, `onGeneratePdf: () => void`, `onSend: () => void`, `onRecordPayment: () => void`, `callStatus: CallStatus`.

Rendu : back link + titre + sous-titre + boutons (PDF, Envoyer, + Paiement). Bouton paiement uniquement si statut !== 'draft' && !== 'cancelled'.

- [ ] **Step 3: CoproTable**

Props : `lines: CallLineDetailed[]`, `onRemind: (lineId: string) => void`.

Rendu : tableau avec colonnes Copropriétaire, Lot, Tantièmes (lot_weight / key_total_weight), Montant dû, Payé, Statut (StatusBadge), Actions (Relancer si impayé/partiel). Lignes impayées avec classe `.rowDanger`. Triées : payés en haut, impayés en bas.

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/appels-fonds/components/DetailHeader.tsx \
        src/features/finance/appels-fonds/components/CoproTable.tsx \
        src/features/finance/appels-fonds/styles/DetailPage.module.css \
        src/features/finance/appels-fonds/styles/CoproTable.module.css
git commit -m "feat(appels-fonds): add DetailHeader + CoproTable components"
```

---

### Task 13: Hook useAppelsFondsDetail

**Files:**
- Create: `src/features/finance/appels-fonds/hooks/useAppelsFondsDetail.ts`

- [ ] **Step 1: Créer le hook**

```typescript
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCallLines, useRecordPayment } from '@/hooks/modules/useFinanceData';
import * as financeApi from '@/lib/finance/api';
import type { DetailStats } from '../types';

// Petit hook local pour charger un call par ID
function useCallById(callId: string) {
  const [data, setData] = useState<financeApi.CallForFundsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    financeApi.getCallById(callId).then(result => {
      if (!cancelled && result.data) setData(result.data);
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [callId]);

  return { data, isLoading };
}

export function useAppelsFondsDetail(callId: string) {
  const { data: call, isLoading: callLoading } = useCallById(callId);
  const { data: lines, isLoading: linesLoading } = useCallLines(callId);
  const { mutate: doRecordPayment, isLoading: paymentLoading } = useRecordPayment();

  const stats: DetailStats = useMemo(() => {
    if (!lines) return { called: 0, paid: 0, remaining: 0, paidCount: 0, totalCount: 0 };
    const called = lines.reduce((s, l) => s + l.amount_due, 0);
    const paid = lines.reduce((s, l) => s + l.amount_paid, 0);
    return {
      called,
      paid,
      remaining: called - paid,
      paidCount: lines.filter(l => l.status === 'paid').length,
      totalCount: lines.length,
    };
  }, [lines]);

  const sortedLines = useMemo(() => {
    if (!lines) return [];
    return [...lines].sort((a, b) => {
      const statusOrder = { paid: 0, partial: 1, unpaid: 2 };
      return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
    });
  }, [lines]);

  return {
    call,
    lines: sortedLines,
    stats,
    isLoading: callLoading || linesLoading,
    paymentLoading,
    recordPayment: doRecordPayment,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/hooks/useAppelsFondsDetail.ts
git commit -m "feat(appels-fonds): add useAppelsFondsDetail hook"
```

---

### Task 14: Page détail (réécrire [callId]/page.tsx)

**Files:**
- Modify: `src/app/(dashboard)/finance/appels-fonds/[callId]/page.tsx`

- [ ] **Step 1: Réécrire la page**

Importer `useAppelsFondsDetail`, `DetailHeader`, `StatsGrid`, `CoproTable`. Utiliser `useParams()` pour récupérer `callId`. Construire les 4 stats items depuis `stats`. Router `useRouter()` pour le back.

- [ ] **Step 2: Vérifier la compilation**

```bash
cd /Users/trikilyes/Desktop/Flex/Co-Pro-Flex && npx next build --no-lint 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/finance/appels-fonds/\[callId\]/page.tsx
git commit -m "feat(appels-fonds): rewrite detail page with CoproTable + stats"
```

---

## Chunk 6: Nettoyage legacy

### Task 15: Supprimer le code legacy

**Files:** voir liste section "Files to delete" ci-dessus.

- [ ] **Step 1: Vérifier qu'aucun import ne référence les fichiers legacy**

```bash
grep -r "from.*components/features/finance/AppelsFonds" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
grep -r "from.*hooks/modules/useAppelsFonds" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
grep -r "from.*features/finance/calls" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
grep -r "from.*services/emission-appel" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
grep -r "from.*services/regles-modification" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

Si des imports existent encore, les corriger avant de supprimer.

- [ ] **Step 2: Supprimer les fichiers**

```bash
rm -rf src/components/features/finance/AppelsFonds/
rm src/hooks/modules/useAppelsFonds.ts
rm -rf src/app/\(dashboard\)/finance/calls/
rm -rf src/features/finance/calls/
rm src/lib/services/emission-appel.service.ts
rm src/lib/services/regles-modification-appel.service.ts
```

- [ ] **Step 3: Supprimer l'ancien contenu du dossier feature**

```bash
rm -f src/features/finance/appels-fonds/components/AppelsFondsMainContent.tsx
rm -f src/features/finance/appels-fonds/components/AppelsFondsModals.tsx
rm -f src/features/finance/appels-fonds/components/AppelsFondsMainContent.module.css
rm -f src/features/finance/appels-fonds/components/index.ts
rm -f src/features/finance/appels-fonds/hooks/index.ts
rm -f src/features/finance/appels-fonds/index.ts
```

- [ ] **Step 3b: Supprimer l'enum legacy AppelFondsStatut**

Dans `src/types/enums/statuts.ts`, supprimer `AppelFondsStatut`, `APPEL_FONDS_TRANSITIONS`, `STATUTS_APPEL_FONDS`, `peutEmettreAppel`, `peutModifierAppel`, `peutAnnulerAppel` et les exports associés.

- [ ] **Step 4: Vérifier la compilation**

```bash
cd /Users/trikilyes/Desktop/Flex/Co-Pro-Flex && npx next build --no-lint 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(appels-fonds): remove legacy components, hooks, and services (37 files)"
```

---

## Chunk 7: Service PDF (adaptation)

### Task 16: Adapter le service avis-appel-export

**Files:**
- Create: `src/features/finance/appels-fonds/services/avis-appel-export.service.ts`

- [ ] **Step 1: Copier et adapter le service**

Copier depuis `src/components/features/finance/AppelsFonds/services/avis-appel-export.service.ts`.

Remplacer les types :
- `AppelFonds` → `CallForFundsOverview` (import depuis `@/lib/finance/api`)
- `CoproprietaireAppel` → `CallLineDetailed` (import depuis `@/lib/finance/api`)

Adapter les champs :
- `appel.montant` → `call.total_amount`
- `appel.dateEcheance` → `call.due_date`
- `copro.nom` → `line.owner_name`
- `copro.lot` → `line.lot_ref`
- `copro.montant` → `line.amount_due`

Signatures finales :
```typescript
export function generateAvisAppelHTML(call: CallForFundsOverview, line: CallLineDetailed, meta: AvisAppelMeta): string
export function exportAvisAppelPDF(call: CallForFundsOverview, line: CallLineDetailed, meta: AvisAppelMeta): void
export function downloadAllAvisAppels(call: CallForFundsOverview, lines: CallLineDetailed[], meta: AvisAppelMeta): void

interface AvisAppelMeta {
  coproprieteNom: string;
  coproprieteAdresse: string;
  syndicNom: string;
  syndicAdresse: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/finance/appels-fonds/services/avis-appel-export.service.ts
git commit -m "feat(appels-fonds): adapt PDF export service to new API types"
```

---

### Task 17: Hook useAppelsFondsActions (mutations)

**Files:**
- Create: `src/features/finance/appels-fonds/hooks/useAppelsFondsActions.ts`

- [ ] **Step 1: Créer le hook**

```typescript
'use client';

import { useCallback, useState } from 'react';
import { useCreateCall } from '@/hooks/modules/useFinanceData';
import { updateCallStatus } from '@/lib/finance/api';
import type { CreateCallPayload } from '@/lib/finance/api';

export function useAppelsFondsActions() {
  const { mutate: createCall, isLoading: createLoading } = useCreateCall();
  const [emitLoading, setEmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Émettre un appel : passe de draft → issued */
  const emitCall = useCallback(async (callId: string) => {
    setEmitLoading(true);
    setError(null);
    try {
      const result = await updateCallStatus(callId, 'issued');
      if (!result.data?.success) {
        setError(result.error ?? 'Erreur lors de l\'émission');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setEmitLoading(false);
    }
  }, []);

  /** Annuler un appel : passe à cancelled */
  const cancelCall = useCallback(async (callId: string) => {
    setEmitLoading(true);
    setError(null);
    try {
      const result = await updateCallStatus(callId, 'cancelled');
      if (!result.data?.success) {
        setError(result.error ?? 'Erreur lors de l\'annulation');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setEmitLoading(false);
    }
  }, []);

  /** Générer les appels pour un exercice */
  const generateCalls = useCallback(async (payload: CreateCallPayload) => {
    setError(null);
    try {
      await createCall(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur génération');
    }
  }, [createCall]);

  return {
    emitCall,
    cancelCall,
    generateCalls,
    isLoading: createLoading || emitLoading,
    error,
  };
}
```

- [ ] **Step 2: Brancher dans TrimesterCard et TravauxCard**

Dans `TrimesterCard.tsx`, ajouter prop `onEmit: (callId: string) => void` et l'appeler sur le bouton "Émettre".
Dans `TravauxCard.tsx`, ajouter prop `onEmit: (callId: string) => void` et l'appeler sur les échéances "À émettre".
Les pages `TabBudgetCourant` et `TabTravaux` passent ces callbacks depuis le hook `useAppelsFondsActions`.

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/appels-fonds/hooks/useAppelsFondsActions.ts
git commit -m "feat(appels-fonds): add useAppelsFondsActions hook (emit, cancel, generate)"
```
