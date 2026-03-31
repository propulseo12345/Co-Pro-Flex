# États Datés Conformes + Gestion Lots/Tantièmes — Plan d'Implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre les états datés conformes au décret 67-223 (3 parties réglementaires + annexe) et ajouter une UI complète de gestion des lots, tantièmes et clés de répartition.

**Architecture:** Approche bottom-up — fondations SQL d'abord (tables complémentaires), puis UI lots/tantièmes, puis types payload V2, puis PDF client, puis refonte viewer. Les phases 2 et 3 sont parallélisables.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, CSS Modules, jsPDF 3.0, Supabase (SQL + Edge Functions)

---

## File Map

### Phase 1 — SQL (hors repo, exécuté dans Supabase Dashboard)

Pas de fichiers dans le repo — migrations SQL exécutées directement dans Supabase.

### Phase 2 — UI Lots/Tantièmes

```
Créer:
  src/app/(dashboard)/coproprietaires/lots/page.tsx
  src/app/(dashboard)/coproprietaires/lots/lots.module.css
  src/app/(dashboard)/coproprietaires/lots/[id]/page.tsx
  src/app/(dashboard)/coproprietaires/lots/[id]/lot-detail.module.css
  src/app/(dashboard)/coproprietaires/repartition/page.tsx
  src/app/(dashboard)/coproprietaires/repartition/repartition.module.css
  src/components/features/lots/LotTable.tsx
  src/components/features/lots/LotTable.module.css
  src/components/features/lots/LotDetailSidebar.tsx
  src/components/features/lots/LotDetailSidebar.module.css
  src/components/features/lots/LotDetailMain.tsx
  src/components/features/lots/LotDetailMain.module.css
  src/components/features/lots/CreateLotModal.tsx
  src/components/features/lots/CreateLotModal.module.css
  src/components/features/lots/RepartitionKeyCard.tsx
  src/components/features/lots/RepartitionKeyCard.module.css
  src/components/features/lots/RepartitionEditor.tsx
  src/components/features/lots/RepartitionEditor.module.css
  src/components/features/lots/index.ts
  src/hooks/modules/useLotsPage.ts
  src/hooks/modules/useLotDetailPage.ts
  src/hooks/modules/useRepartitionPage.ts
Modifier:
  src/lib/config/navigation.ts (lignes 46-52 — corriger les href des sous-pages)
```

### Phase 3 — Types Payload V2

```
Modifier:
  src/features/ventes/domain/types.ts (renommer EtatDatePayload → EtatDatePayloadV1, ajouter V2 + union)
```

### Phase 4 — PDF côté client

```
Créer:
  src/features/ventes/pdf/pdfLayout.ts
  src/features/ventes/pdf/helpers/formatters.ts
  src/features/ventes/pdf/helpers/renderTable.ts
  src/features/ventes/pdf/helpers/renderSectionTitle.ts
  src/features/ventes/pdf/sections/renderHeader.ts
  src/features/ventes/pdf/sections/renderPartie1.ts
  src/features/ventes/pdf/sections/renderPartie2.ts
  src/features/ventes/pdf/sections/renderPartie3.ts
  src/features/ventes/pdf/sections/renderAnnexe.ts
  src/features/ventes/pdf/generateEtatDatePDF.ts
```

### Phase 5 — Refonte Viewer

```
Créer:
  src/features/ventes/components/EtatDateViewerLegacy.tsx
  src/features/ventes/components/etat-date/EtatDateHeader.tsx
  src/features/ventes/components/etat-date/EtatDatePartie.tsx
  src/features/ventes/components/etat-date/EtatDatePartieRow.tsx
  src/features/ventes/components/etat-date/EtatDateSummary.tsx
  src/features/ventes/components/etat-date/EtatDateAnnexe.tsx
  src/features/ventes/components/etat-date/EtatDateTransactions.tsx
  src/features/ventes/components/etat-date/EtatDateJsonViewer.tsx
  src/features/ventes/components/etat-date/etat-date.module.css
Modifier:
  src/features/ventes/components/EtatDateViewer.tsx (refonte complète — orchestrateur + détection version)
  src/features/ventes/components/EtatDateViewer.module.css (ajustements si nécessaires)
```

---

## Phase 1 — Tables SQL Complémentaires

> **Note :** Ces migrations s'exécutent dans le Supabase Dashboard (SQL Editor). Pas de fichiers dans le repo.

### Task 1: Table `collective_loans`

**Contexte :** Cette table stocke les emprunts collectifs du syndicat — par exemple un emprunt pour financer un ravalement. On en a besoin pour la Partie 1 de l'état daté (sommes dues par le vendeur).

- [ ] **Step 1: Exécuter le SQL dans Supabase Dashboard**

```sql
CREATE TABLE collective_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  lender TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  annual_payment NUMERIC(12,2),
  interest_rate NUMERIC(5,3),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','repaid','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_collective_loans_copro ON collective_loans(copro_id);

-- RLS
ALTER TABLE collective_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view collective loans"
  ON collective_loans FOR SELECT
  USING (copro_id IN (
    SELECT copro_id FROM user_copro_roles WHERE user_id = auth.uid()
  ));
CREATE POLICY "Managers can manage collective loans"
  ON collective_loans FOR ALL
  USING (copro_id IN (
    SELECT copro_id FROM user_copro_roles WHERE user_id = auth.uid() AND role IN ('syndic','president_cs')
  ));
```

- [ ] **Step 2: Vérifier que la table existe**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'collective_loans' ORDER BY ordinal_position;
```

Expected: 12 colonnes listées.

---

### Task 2: Table `collective_loan_shares`

**Contexte :** Lie chaque lot à sa part dans un emprunt collectif. Un lot de 500/10000 tantièmes paiera 5% de l'emprunt.

- [ ] **Step 1: Exécuter le SQL**

```sql
CREATE TABLE collective_loan_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES collective_loans(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  share_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_payment_date DATE,
  UNIQUE(loan_id, lot_id)
);

CREATE INDEX idx_loan_shares_lot ON collective_loan_shares(lot_id);
CREATE INDEX idx_loan_shares_loan ON collective_loan_shares(loan_id);

ALTER TABLE collective_loan_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view loan shares"
  ON collective_loan_shares FOR SELECT
  USING (loan_id IN (
    SELECT id FROM collective_loans WHERE copro_id IN (
      SELECT copro_id FROM user_copro_roles WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Managers can manage loan shares"
  ON collective_loan_shares FOR ALL
  USING (loan_id IN (
    SELECT id FROM collective_loans WHERE copro_id IN (
      SELECT copro_id FROM user_copro_roles WHERE user_id = auth.uid() AND role IN ('syndic','president_cs')
    )
  ));
```

- [ ] **Step 2: Vérifier**

```sql
SELECT * FROM collective_loan_shares LIMIT 0;
```

Expected: Table vide, pas d'erreur.

---

### Task 3: Table `treasury_advances`

**Contexte :** Avances de trésorerie = l'argent que chaque copropriétaire "prête" au syndicat pour le fonctionnement quotidien. 3 types : fonds de roulement (permanent), avance spéciale, fonds travaux ALUR.

- [ ] **Step 1: Exécuter le SQL**

```sql
CREATE TABLE treasury_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES coproprietaires(id),
  advance_type TEXT NOT NULL CHECK (advance_type IN ('permanent','special','work_fund')),
  label TEXT NOT NULL,
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treasury_advances_lot ON treasury_advances(lot_id);
CREATE INDEX idx_treasury_advances_copro ON treasury_advances(copro_id);

ALTER TABLE treasury_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view treasury advances"
  ON treasury_advances FOR SELECT
  USING (copro_id IN (
    SELECT copro_id FROM user_copro_roles WHERE user_id = auth.uid()
  ));
CREATE POLICY "Managers can manage treasury advances"
  ON treasury_advances FOR ALL
  USING (copro_id IN (
    SELECT copro_id FROM user_copro_roles WHERE user_id = auth.uid() AND role IN ('syndic','president_cs')
  ));
```

- [ ] **Step 2: Vérifier**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'treasury_advances' ORDER BY ordinal_position;
```

Expected: 10 colonnes.

---

### Task 4: Table `legal_proceedings`

**Contexte :** Procédures judiciaires en cours — contentieux, recouvrement, etc. Obligatoire dans l'annexe de l'état daté.

- [ ] **Step 1: Exécuter le SQL**

```sql
CREATE TABLE legal_proceedings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  nature TEXT NOT NULL CHECK (nature IN ('litigation','recovery','other')),
  opposing_party TEXT,
  amount_at_stake NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','closed','won','lost')),
  start_date DATE,
  end_date DATE,
  court TEXT,
  lawyer TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_proceedings_copro ON legal_proceedings(copro_id);

ALTER TABLE legal_proceedings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view legal proceedings"
  ON legal_proceedings FOR SELECT
  USING (copro_id IN (
    SELECT copro_id FROM user_copro_roles WHERE user_id = auth.uid()
  ));
CREATE POLICY "Managers can manage legal proceedings"
  ON legal_proceedings FOR ALL
  USING (copro_id IN (
    SELECT copro_id FROM user_copro_roles WHERE user_id = auth.uid() AND role IN ('syndic','president_cs')
  ));
```

- [ ] **Step 2: Vérifier**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'legal_proceedings' ORDER BY ordinal_position;
```

Expected: 14 colonnes.

---

### Task 5: Seed data de test

**Contexte :** Insérer des données cohérentes avec les lots existants pour pouvoir tester les interfaces.

- [ ] **Step 1: Identifier les lots existants**

```sql
SELECT id, ref, copro_id FROM lots ORDER BY ref LIMIT 10;
```

Récupérer le `copro_id` et les IDs des lots.

- [ ] **Step 2: Insérer un emprunt collectif + parts**

```sql
-- Remplacer {COPRO_ID} et {LOT_IDs} par les vraies valeurs
WITH loan AS (
  INSERT INTO collective_loans (copro_id, label, lender, total_amount, remaining_amount, annual_payment, interest_rate, start_date, end_date, status)
  VALUES ('{COPRO_ID}', 'Emprunt ravalement façade 2025', 'Crédit Foncier', 85000.00, 63750.00, 8925.00, 2.150, '2025-01-15', '2035-01-15', 'active')
  RETURNING id
)
INSERT INTO collective_loan_shares (loan_id, lot_id, share_amount, remaining_amount)
SELECT loan.id, lots.id,
  ROUND(85000.00 * lots.tantiemes_generaux::numeric / (SELECT SUM(tantiemes_generaux) FROM lots WHERE copro_id = '{COPRO_ID}'), 2),
  ROUND(63750.00 * lots.tantiemes_generaux::numeric / (SELECT SUM(tantiemes_generaux) FROM lots WHERE copro_id = '{COPRO_ID}'), 2)
FROM loan, lots
WHERE lots.copro_id = '{COPRO_ID}';
```

- [ ] **Step 3: Insérer des avances de trésorerie**

```sql
-- Fonds de roulement permanent pour chaque lot
INSERT INTO treasury_advances (copro_id, lot_id, advance_type, label, amount_due, amount_paid)
SELECT '{COPRO_ID}', id, 'permanent', 'Fonds de roulement',
  ROUND(500.00 * tantiemes_generaux::numeric / (SELECT SUM(tantiemes_generaux) FROM lots WHERE copro_id = '{COPRO_ID}'), 2),
  ROUND(500.00 * tantiemes_generaux::numeric / (SELECT SUM(tantiemes_generaux) FROM lots WHERE copro_id = '{COPRO_ID}'), 2)
FROM lots WHERE copro_id = '{COPRO_ID}';

-- Fonds travaux ALUR pour chaque lot
INSERT INTO treasury_advances (copro_id, lot_id, advance_type, label, amount_due, amount_paid)
SELECT '{COPRO_ID}', id, 'work_fund', 'Fonds travaux ALUR Art. 14-2',
  ROUND(1500.00 * tantiemes_generaux::numeric / (SELECT SUM(tantiemes_generaux) FROM lots WHERE copro_id = '{COPRO_ID}'), 2),
  ROUND(1200.00 * tantiemes_generaux::numeric / (SELECT SUM(tantiemes_generaux) FROM lots WHERE copro_id = '{COPRO_ID}'), 2)
FROM lots WHERE copro_id = '{COPRO_ID}';
```

- [ ] **Step 4: Insérer une procédure judiciaire**

```sql
INSERT INTO legal_proceedings (copro_id, title, nature, opposing_party, amount_at_stake, status, start_date, court, lawyer)
VALUES ('{COPRO_ID}', 'Contentieux infiltrations parking', 'litigation', 'Entreprise BTP Martin', 15000.00, 'in_progress', '2025-09-01', 'TJ Paris 12ème', 'Me Dupont');
```

- [ ] **Step 5: Vérifier les données**

```sql
SELECT 'collective_loans' AS t, count(*) FROM collective_loans
UNION ALL SELECT 'collective_loan_shares', count(*) FROM collective_loan_shares
UNION ALL SELECT 'treasury_advances', count(*) FROM treasury_advances
UNION ALL SELECT 'legal_proceedings', count(*) FROM legal_proceedings;
```

Expected: 1 emprunt, N parts (1 par lot), 2×N avances, 1 procédure.

- [ ] **Step 6: Commit**

```bash
# Pas de commit ici — SQL exécuté dans Supabase Dashboard
# Documenter dans un commentaire de commit futur
```

---

## Phase 2 — UI Gestion Lots / Tantièmes / Clés de Répartition

### Task 6: Corriger la navigation sidebar

**Files:**
- Modify: `src/lib/config/navigation.ts:46-52`

**Contexte :** Les liens "Tantièmes" et "Lots" dans la sidebar pointent vers des routes inexistantes (`/finance/tantiemes`, `/settings/info`). On les corrige vers les nouvelles routes.

- [ ] **Step 1: Modifier la navigation**

Dans `src/lib/config/navigation.ts`, remplacer le bloc `copropriete` (lignes 43-52) par :

```typescript
  {
    id: 'copropriete',
    label: 'Copropriete',
    icon: Building2,
    href: '/coproprietaires',
    subPages: [
      { label: 'Copropriétaires', href: '/coproprietaires', icon: Users },
      { label: 'Lots & Tantièmes', href: '/coproprietaires/lots', icon: Building2 },
      { label: 'Clés de répartition', href: '/coproprietaires/repartition', icon: BarChart3 },
    ],
  },
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `npx next build 2>&1 | tail -5`
Expected: Pas d'erreur TypeScript liée à navigation.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/config/navigation.ts
git commit -m "fix(nav): corriger liens lots et répartition vers les bonnes routes"
```

---

### Task 7: Hook `useLotsPage`

**Files:**
- Create: `src/hooks/modules/useLotsPage.ts`

**Contexte :** Hook qui orchestre la page liste des lots — chargement, filtrage, recherche, stats. Réutilise `useLots` de `useLotsData.ts` qui existe déjà.

- [ ] **Step 1: Créer le hook**

```typescript
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLots } from '@/hooks/modules/useLotsData';
import type { LotWithOwner, LotType } from '@/lib/lots/api';

export type LotFilterType = LotType | 'ALL';
export type LotSortField = 'ref' | 'type' | 'floor' | 'surface' | 'tantiemes_generaux' | 'owner_display_name';
export type SortDirection = 'asc' | 'desc';

export interface UseLotsPageReturn {
  lots: LotWithOwner[];
  filteredLots: LotWithOwner[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: LotFilterType;
  setFilterType: (t: LotFilterType) => void;
  sortField: LotSortField;
  sortDirection: SortDirection;
  handleSort: (field: LotSortField) => void;
  stats: {
    totalLots: number;
    totalTantiemes: number;
    lotsWithOwner: number;
    lotsWithoutOwner: number;
  };
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  createLot: ReturnType<typeof useLots>['createLot'];
  updateLot: ReturnType<typeof useLots>['updateLot'];
  deleteLot: ReturnType<typeof useLots>['deleteLot'];
  isMutating: boolean;
  refresh: () => Promise<void>;
}

export function useLotsPage(): UseLotsPageReturn {
  const { lots, isLoading, error, refresh, createLot, updateLot, deleteLot, isMutating, stats } = useLots();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<LotFilterType>('ALL');
  const [sortField, setSortField] = useState<LotSortField>('ref');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleSort = useCallback((field: LotSortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const filteredLots = useMemo(() => {
    let result = [...lots];

    // Filter by type
    if (filterType !== 'ALL') {
      result = result.filter(lot => lot.type === filterType);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(lot =>
        lot.ref.toLowerCase().includes(q) ||
        (lot.owner_display_name && lot.owner_display_name.toLowerCase().includes(q)) ||
        (lot.type && lot.type.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(bVal as string, 'fr')
        : (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [lots, filterType, searchQuery, sortField, sortDirection]);

  return {
    lots, filteredLots, isLoading, error,
    searchQuery, setSearchQuery, filterType, setFilterType,
    sortField, sortDirection, handleSort,
    stats, showCreateModal, setShowCreateModal,
    createLot, updateLot, deleteLot, isMutating, refresh,
  };
}
```

- [ ] **Step 2: Vérifier le typage**

Run: `npx tsc --noEmit src/hooks/modules/useLotsPage.ts 2>&1 | head -10`
Expected: Pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/modules/useLotsPage.ts
git commit -m "feat(lots): hook useLotsPage — filtrage, tri, recherche"
```

---

### Task 8: Composant `LotTable`

**Files:**
- Create: `src/components/features/lots/LotTable.tsx`
- Create: `src/components/features/lots/LotTable.module.css`

**Contexte :** Tableau triable affichant tous les lots avec ref, type, étage, surface, tantièmes, propriétaire. Suit le design system (dark theme, labels uppercase, borders subtiles).

- [ ] **Step 1: Créer le CSS module**

```css
/* src/components/features/lots/LotTable.module.css */
.tableContainer {
  overflow-x: auto;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  padding: 10px 16px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  text-align: left;
  background: rgba(148, 163, 184, 0.04);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.table th:hover {
  color: #94a3b8;
}

.sortIcon {
  margin-left: 4px;
  opacity: 0.5;
}

.sortIconActive {
  margin-left: 4px;
  opacity: 1;
  color: #3b82f6;
}

.table td {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.04);
}

.table tbody tr {
  transition: background 0.15s;
}

.table tbody tr:hover {
  background: rgba(148, 163, 184, 0.03);
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.lotRef {
  font-weight: 600;
  color: #3b82f6;
  cursor: pointer;
}

.lotRef:hover {
  text-decoration: underline;
}

.typeBadge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.tantiemes {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.surface {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.ownerName {
  color: #e2e8f0;
}

.noOwner {
  color: #64748b;
  font-style: italic;
}

.saleBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  margin-left: 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
}
```

- [ ] **Step 2: Créer le composant**

```typescript
// src/components/features/lots/LotTable.tsx
'use client';

import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { LotWithOwner } from '@/lib/lots/api';
import type { LotSortField, SortDirection } from '@/hooks/modules/useLotsPage';
import styles from './LotTable.module.css';

const LOT_TYPE_LABELS: Record<string, string> = {
  appartement: 'Appartement',
  studio: 'Studio',
  parking: 'Parking',
  cave: 'Cave',
  local_commercial: 'Commerce',
  bureau: 'Bureau',
  garage: 'Garage',
  box: 'Box',
  jardin: 'Jardin',
  terrasse: 'Terrasse',
  balcon: 'Balcon',
  loggia: 'Loggia',
  autre: 'Autre',
};

interface LotTableProps {
  lots: LotWithOwner[];
  sortField: LotSortField;
  sortDirection: SortDirection;
  onSort: (field: LotSortField) => void;
}

export function LotTable({ lots, sortField, sortDirection, onSort }: LotTableProps) {
  const router = useRouter();

  const SortIcon = ({ field }: { field: LotSortField }) => {
    if (field !== sortField) {
      return <ChevronUp size={12} className={styles.sortIcon} />;
    }
    const Icon = sortDirection === 'asc' ? ChevronUp : ChevronDown;
    return <Icon size={12} className={styles.sortIconActive} />;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th onClick={() => onSort('ref')}>Réf <SortIcon field="ref" /></th>
            <th onClick={() => onSort('type')}>Type <SortIcon field="type" /></th>
            <th onClick={() => onSort('floor')}>Étage <SortIcon field="floor" /></th>
            <th onClick={() => onSort('surface')}>Surface <SortIcon field="surface" /></th>
            <th onClick={() => onSort('tantiemes_generaux')}>Tantièmes <SortIcon field="tantiemes_generaux" /></th>
            <th onClick={() => onSort('owner_display_name')}>Propriétaire <SortIcon field="owner_display_name" /></th>
          </tr>
        </thead>
        <tbody>
          {lots.map(lot => (
            <tr key={lot.id}>
              <td>
                <span
                  className={styles.lotRef}
                  onClick={() => router.push(`/coproprietaires/lots/${lot.id}`)}
                >
                  {lot.ref}
                </span>
              </td>
              <td>
                <span className={styles.typeBadge}>
                  {lot.type ? LOT_TYPE_LABELS[lot.type] || lot.type : '-'}
                </span>
              </td>
              <td>{lot.floor != null ? `${lot.floor}` : '-'}</td>
              <td className={styles.surface}>
                {lot.surface != null ? `${lot.surface} m²` : '-'}
              </td>
              <td className={styles.tantiemes}>{lot.tantiemes_generaux}</td>
              <td>
                {lot.owner_display_name ? (
                  <span className={styles.ownerName}>{lot.owner_display_name}</span>
                ) : (
                  <span className={styles.noOwner}>Non attribué</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/lots/LotTable.tsx src/components/features/lots/LotTable.module.css
git commit -m "feat(lots): composant LotTable — tableau triable avec design system"
```

---

### Task 9: Composant `CreateLotModal`

**Files:**
- Create: `src/components/features/lots/CreateLotModal.tsx`
- Create: `src/components/features/lots/CreateLotModal.module.css`

- [ ] **Step 1: Créer le CSS module**

```css
/* src/components/features/lots/CreateLotModal.module.css */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #e2e8f0;
}

.closeBtn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;
}

.closeBtn:hover {
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
}

.body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fieldRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.fieldGroup label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
}

.fieldGroup input,
.fieldGroup select {
  padding: 8px 12px;
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.fieldGroup input:focus,
.fieldGroup select:focus {
  border-color: rgba(148, 163, 184, 0.12);
}

.fieldGroup input::placeholder {
  color: #475569;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
}

.cancelBtn {
  padding: 8px 16px;
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.cancelBtn:hover {
  background: rgba(148, 163, 184, 0.06);
}

.submitBtn {
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.submitBtn:hover:not(:disabled) {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.submitBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Créer le composant**

```typescript
// src/components/features/lots/CreateLotModal.tsx
'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { LotCreate, LotType } from '@/lib/lots/api';
import styles from './CreateLotModal.module.css';

const LOT_TYPES: { value: LotType; label: string }[] = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'parking', label: 'Parking' },
  { value: 'cave', label: 'Cave' },
  { value: 'local_commercial', label: 'Commerce' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'garage', label: 'Garage' },
  { value: 'box', label: 'Box' },
  { value: 'autre', label: 'Autre' },
];

interface CreateLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: Omit<LotCreate, 'copro_id'>) => Promise<{ id: string } | null>;
  isMutating: boolean;
}

export function CreateLotModal({ isOpen, onClose, onCreate, isMutating }: CreateLotModalProps) {
  const [ref, setRef] = useState('');
  const [type, setType] = useState<LotType>('appartement');
  const [floor, setFloor] = useState('');
  const [surface, setSurface] = useState('');
  const [tantiemes, setTantiemes] = useState('');

  const resetForm = useCallback(() => {
    setRef('');
    setType('appartement');
    setFloor('');
    setSurface('');
    setTantiemes('');
  }, []);

  const handleSubmit = async () => {
    if (!ref.trim() || !tantiemes.trim()) return;

    const payload: Omit<LotCreate, 'copro_id'> = {
      ref: ref.trim(),
      type,
      floor: floor ? parseInt(floor, 10) : null,
      surface: surface ? parseFloat(surface) : null,
      tantiemes_generaux: parseInt(tantiemes, 10),
    };

    const result = await onCreate(payload);
    if (result) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Nouveau lot</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label>Référence *</label>
              <input
                type="text"
                value={ref}
                onChange={e => setRef(e.target.value)}
                placeholder="ex: A-101"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Type</label>
              <select value={type} onChange={e => setType(e.target.value as LotType)}>
                {LOT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label>Étage</label>
              <input
                type="number"
                value={floor}
                onChange={e => setFloor(e.target.value)}
                placeholder="ex: 3"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Surface (m²)</label>
              <input
                type="number"
                step="0.01"
                value={surface}
                onChange={e => setSurface(e.target.value)}
                placeholder="ex: 65.5"
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label>Tantièmes généraux *</label>
            <input
              type="number"
              value={tantiemes}
              onChange={e => setTantiemes(e.target.value)}
              placeholder="ex: 500"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Annuler</button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!ref.trim() || !tantiemes.trim() || isMutating}
          >
            {isMutating ? 'Création...' : 'Créer le lot'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/lots/CreateLotModal.tsx src/components/features/lots/CreateLotModal.module.css
git commit -m "feat(lots): composant CreateLotModal — modale de création de lot"
```

---

### Task 10: Index d'exports lots

**Files:**
- Create: `src/components/features/lots/index.ts`

- [ ] **Step 1: Créer l'index**

```typescript
// src/components/features/lots/index.ts
export { LotTable } from './LotTable';
export { CreateLotModal } from './CreateLotModal';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/lots/index.ts
git commit -m "feat(lots): index d'exports composants lots"
```

---

### Task 11: Page liste des lots

**Files:**
- Create: `src/app/(dashboard)/coproprietaires/lots/page.tsx`
- Create: `src/app/(dashboard)/coproprietaires/lots/lots.module.css`

- [ ] **Step 1: Créer le CSS module**

```css
/* src/app/(dashboard)/coproprietaires/lots/lots.module.css */
.topBar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  background: #161822;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  margin-bottom: 24px;
}

.topBarLeft h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
}

.topBarLeft p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #94a3b8;
}

.topBarActions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.addBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.addBtn:hover {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.refreshBtn {
  display: flex;
  align-items: center;
  padding: 8px;
  background: rgba(148, 163, 184, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}

.refreshBtn:hover {
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* KPI Strip */
.kpiStrip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpiCard {
  padding: 16px 20px;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
}

.kpiLabel {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 6px;
}

.kpiValue {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #e2e8f0;
}

.kpiValueSuccess {
  composes: kpiValue;
  color: #22c55e;
}

.kpiValueWarning {
  composes: kpiValue;
  color: #f59e0b;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.searchContainer {
  position: relative;
  flex: 1;
  max-width: 320px;
}

.searchIcon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  pointer-events: none;
}

.searchInput {
  width: 100%;
  padding: 8px 12px 8px 36px;
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.searchInput:focus {
  border-color: rgba(148, 163, 184, 0.12);
}

.searchInput::placeholder {
  color: #475569;
}

.filterSelect {
  padding: 8px 12px;
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
}

.totalTantiemes {
  margin-left: auto;
  padding: 6px 14px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #60a5fa;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

/* Responsive */
@media (max-width: 768px) {
  .kpiStrip {
    grid-template-columns: repeat(2, 1fr);
  }
  .toolbar {
    flex-wrap: wrap;
  }
}
```

- [ ] **Step 2: Créer la page**

```typescript
// src/app/(dashboard)/coproprietaires/lots/page.tsx
'use client';

import { Search, Plus, RefreshCw } from 'lucide-react';
import { useLotsPage } from '@/hooks/modules/useLotsPage';
import { LotTable, CreateLotModal } from '@/components/features/lots';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import styles from './lots.module.css';

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tous les types' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'parking', label: 'Parking' },
  { value: 'cave', label: 'Cave' },
  { value: 'local_commercial', label: 'Commerce' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'garage', label: 'Garage' },
];

export default function LotsPage() {
  const { currentCoproId } = useCopro();
  const {
    filteredLots, isLoading, error, searchQuery, setSearchQuery,
    filterType, setFilterType, sortField, sortDirection, handleSort,
    stats, showCreateModal, setShowCreateModal,
    createLot, isMutating, refresh,
  } = useLotsPage();

  if (!currentCoproId) {
    return <LoadingState message="Chargement de la copropriété..." />;
  }

  return (
    <div className="container">
      {/* TopBar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1>Lots & Tantièmes</h1>
          <p>Gestion des lots et de la répartition des charges</p>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.refreshBtn} onClick={() => refresh()} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          </button>
          <button className={styles.addBtn} onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Nouveau lot
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total lots</span>
          <span className={styles.kpiValue}>{stats.totalLots}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total tantièmes</span>
          <span className={styles.kpiValue}>{stats.totalTantiemes.toLocaleString('fr-FR')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avec propriétaire</span>
          <span className={styles.kpiValueSuccess}>{stats.lotsWithOwner}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Non attribués</span>
          <span className={stats.lotsWithoutOwner > 0 ? styles.kpiValueWarning : styles.kpiValue}>
            {stats.lotsWithoutOwner}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Rechercher un lot ou propriétaire..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterType}
          onChange={e => setFilterType(e.target.value as typeof filterType)}
        >
          {TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className={styles.totalTantiemes}>
          {filteredLots.reduce((s, l) => s + l.tantiemes_generaux, 0).toLocaleString('fr-FR')} tantièmes affichés
        </span>
      </div>

      {/* Content */}
      {isLoading && <LoadingState message="Chargement des lots..." />}
      {error && !isLoading && <ErrorState message={error} onRetry={refresh} />}
      {!isLoading && !error && filteredLots.length === 0 && (
        <EmptyState title="Aucun lot" message="Aucun lot trouvé pour cette copropriété." />
      )}
      {!isLoading && !error && filteredLots.length > 0 && (
        <LotTable
          lots={filteredLots}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      )}

      {/* Modal création */}
      <CreateLotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createLot}
        isMutating={isMutating}
      />
    </div>
  );
}
```

- [ ] **Step 3: Vérifier que la page charge**

Run: `npx next build 2>&1 | grep -E 'error|lots'`
Expected: Route `/coproprietaires/lots` compilée sans erreur.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/coproprietaires/lots/
git commit -m "feat(lots): page liste des lots — KPIs, filtres, tableau triable"
```

---

### Task 12: Hook `useLotDetailPage`

**Files:**
- Create: `src/hooks/modules/useLotDetailPage.ts`

**Contexte :** Hook pour la page détail d'un lot — charge le lot, ses clés de répartition, et les données complémentaires (emprunts, avances).

- [ ] **Step 1: Créer le hook**

```typescript
// src/hooks/modules/useLotDetailPage.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLot } from '@/hooks/modules/useLotsData';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';

export interface LotRepartitionEntry {
  key_id: string;
  key_name: string;
  weight: number;
  total_weight: number;
  share_pct: number;
}

export interface LotLoanShare {
  loan_id: string;
  label: string;
  lender: string | null;
  share_amount: number;
  remaining_amount: number;
  loan_status: string;
}

export interface LotAdvance {
  id: string;
  advance_type: string;
  label: string;
  amount_due: number;
  amount_paid: number;
}

export interface UseLotDetailPageReturn {
  lot: ReturnType<typeof useLot>['lot'];
  isLoading: boolean;
  error: string | null;
  repartition: LotRepartitionEntry[];
  loanShares: LotLoanShare[];
  advances: LotAdvance[];
  isLoadingExtra: boolean;
  refresh: () => Promise<void>;
}

export function useLotDetailPage(lotId: string): UseLotDetailPageReturn {
  const { currentCoproId } = useCopro();
  const { lot, isLoading, error, refresh } = useLot(lotId);
  const [repartition, setRepartition] = useState<LotRepartitionEntry[]>([]);
  const [loanShares, setLoanShares] = useState<LotLoanShare[]>([]);
  const [advances, setAdvances] = useState<LotAdvance[]>([]);
  const [isLoadingExtra, setIsLoadingExtra] = useState(true);

  const fetchExtraData = useCallback(async () => {
    if (!currentCoproId || !lotId) {
      setIsLoadingExtra(false);
      return;
    }

    setIsLoadingExtra(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;

    try {
      // Clés de répartition du lot
      const { data: repData } = await supabase
        .from('v_repartition_key_lines_detailed')
        .select('key_id, key_name, weight, share_pct')
        .eq('copro_id', currentCoproId)
        .eq('lot_id', lotId);

      if (repData) {
        // Enrichir avec total_weight par clé
        const { data: keysData } = await supabase
          .from('v_repartition_key_totals')
          .select('key_id, total_weight')
          .eq('copro_id', currentCoproId);

        const totalMap = new Map<string, number>();
        (keysData || []).forEach((k: { key_id: string; total_weight: number }) => {
          totalMap.set(k.key_id, k.total_weight);
        });

        setRepartition(repData.map((r: { key_id: string; key_name: string; weight: number; share_pct: number }) => ({
          ...r,
          total_weight: totalMap.get(r.key_id) || 0,
        })));
      }

      // Emprunts collectifs
      const { data: loansData } = await supabase
        .from('collective_loan_shares')
        .select(`
          loan_id,
          share_amount,
          remaining_amount,
          collective_loans!inner(label, lender, status)
        `)
        .eq('lot_id', lotId);

      if (loansData) {
        setLoanShares(loansData.map((ls: {
          loan_id: string;
          share_amount: number;
          remaining_amount: number;
          collective_loans: { label: string; lender: string | null; status: string };
        }) => ({
          loan_id: ls.loan_id,
          label: ls.collective_loans.label,
          lender: ls.collective_loans.lender,
          share_amount: ls.share_amount,
          remaining_amount: ls.remaining_amount,
          loan_status: ls.collective_loans.status,
        })));
      }

      // Avances de trésorerie
      const { data: advData } = await supabase
        .from('treasury_advances')
        .select('id, advance_type, label, amount_due, amount_paid')
        .eq('lot_id', lotId);

      if (advData) {
        setAdvances(advData);
      }
    } catch {
      // Silently handle — lot data is still available
    }

    setIsLoadingExtra(false);
  }, [currentCoproId, lotId]);

  useEffect(() => {
    fetchExtraData();
  }, [fetchExtraData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), fetchExtraData()]);
  }, [refresh, fetchExtraData]);

  return {
    lot,
    isLoading,
    error,
    repartition,
    loanShares,
    advances,
    isLoadingExtra,
    refresh: refreshAll,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/modules/useLotDetailPage.ts
git commit -m "feat(lots): hook useLotDetailPage — lot, répartition, emprunts, avances"
```

---

### Task 13: Composants détail lot (sidebar + main)

**Files:**
- Create: `src/components/features/lots/LotDetailSidebar.tsx`
- Create: `src/components/features/lots/LotDetailSidebar.module.css`
- Create: `src/components/features/lots/LotDetailMain.tsx`
- Create: `src/components/features/lots/LotDetailMain.module.css`

- [ ] **Step 1: Créer le CSS sidebar**

```css
/* src/components/features/lots/LotDetailSidebar.module.css */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  padding: 20px;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
}

.cardTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.cardTitle svg {
  color: #64748b;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
}

.field:last-child {
  margin-bottom: 0;
}

.fieldLabel {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
}

.fieldValue {
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
}

.fieldValueMono {
  composes: fieldValue;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.fieldValueSuccess {
  composes: fieldValueMono;
  color: #22c55e;
}

.fieldValueDanger {
  composes: fieldValueMono;
  color: #ef4444;
}

.emptyNote {
  font-size: 12px;
  color: #475569;
  font-style: italic;
}

.loanItem {
  padding: 10px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.04);
}

.loanItem:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.loanLabel {
  font-size: 12px;
  font-weight: 500;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.loanMeta {
  font-size: 11px;
  color: #64748b;
}
```

- [ ] **Step 2: Créer le composant sidebar**

```typescript
// src/components/features/lots/LotDetailSidebar.tsx
'use client';

import { User, Wallet, Landmark, PiggyBank } from 'lucide-react';
import type { LotWithOwner } from '@/lib/lots/api';
import type { LotLoanShare, LotAdvance } from '@/hooks/modules/useLotDetailPage';
import styles from './LotDetailSidebar.module.css';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const ADVANCE_TYPE_LABELS: Record<string, string> = {
  permanent: 'Fonds de roulement',
  special: 'Avance spéciale',
  work_fund: 'Fonds travaux ALUR',
};

interface LotDetailSidebarProps {
  lot: LotWithOwner;
  loanShares: LotLoanShare[];
  advances: LotAdvance[];
}

export function LotDetailSidebar({ lot, loanShares, advances }: LotDetailSidebarProps) {
  const totalLoanRemaining = loanShares.reduce((s, l) => s + l.remaining_amount, 0);
  const workFund = advances.filter(a => a.advance_type === 'work_fund');
  const otherAdvances = advances.filter(a => a.advance_type !== 'work_fund');

  return (
    <div className={styles.sidebar}>
      {/* Propriétaire */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}><User size={16} /> Propriétaire</h3>
        {lot.owner_display_name ? (
          <>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Nom</span>
              <span className={styles.fieldValue}>{lot.owner_display_name}</span>
            </div>
            {lot.owner_email && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Email</span>
                <span className={styles.fieldValue}>{lot.owner_email}</span>
              </div>
            )}
          </>
        ) : (
          <p className={styles.emptyNote}>Aucun propriétaire attribué</p>
        )}
      </div>

      {/* Emprunts collectifs */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}><Landmark size={16} /> Emprunts collectifs</h3>
        {loanShares.length > 0 ? (
          <>
            {loanShares.map(ls => (
              <div key={ls.loan_id} className={styles.loanItem}>
                <div className={styles.loanLabel}>{ls.label}</div>
                <div className={styles.loanMeta}>
                  Restant : {fmt(ls.remaining_amount)} / {fmt(ls.share_amount)}
                </div>
              </div>
            ))}
            <div className={styles.field} style={{ marginTop: 12 }}>
              <span className={styles.fieldLabel}>Total restant</span>
              <span className={styles.fieldValueDanger}>{fmt(totalLoanRemaining)}</span>
            </div>
          </>
        ) : (
          <p className={styles.emptyNote}>Aucun emprunt collectif</p>
        )}
      </div>

      {/* Avances & Fonds */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}><PiggyBank size={16} /> Avances & Fonds</h3>
        {advances.length > 0 ? (
          <>
            {workFund.map(a => (
              <div key={a.id} className={styles.field}>
                <span className={styles.fieldLabel}>Fonds travaux ALUR</span>
                <span className={styles.fieldValueSuccess}>{fmt(a.amount_paid)}</span>
              </div>
            ))}
            {otherAdvances.map(a => (
              <div key={a.id} className={styles.field}>
                <span className={styles.fieldLabel}>{ADVANCE_TYPE_LABELS[a.advance_type] || a.label}</span>
                <span className={styles.fieldValueMono}>
                  {fmt(a.amount_paid)} / {fmt(a.amount_due)}
                </span>
              </div>
            ))}
          </>
        ) : (
          <p className={styles.emptyNote}>Aucune avance enregistrée</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Créer le CSS main**

```css
/* src/components/features/lots/LotDetailMain.module.css */
.main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  padding: 24px;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
}

.cardTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
}

.cardTitle svg {
  color: #64748b;
}

.repTable {
  width: 100%;
  border-collapse: collapse;
}

.repTable th {
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  text-align: left;
  background: rgba(148, 163, 184, 0.04);
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.repTable td {
  padding: 8px 12px;
  font-size: 13px;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.04);
}

.repTable tbody tr:last-child td {
  border-bottom: none;
}

.mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.barContainer {
  height: 6px;
  background: rgba(148, 163, 184, 0.08);
  border-radius: 3px;
  overflow: hidden;
  min-width: 100px;
}

.bar {
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.pct {
  font-size: 11px;
  color: #94a3b8;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.emptyNote {
  font-size: 12px;
  color: #475569;
  font-style: italic;
}
```

- [ ] **Step 4: Créer le composant main**

```typescript
// src/components/features/lots/LotDetailMain.tsx
'use client';

import { BarChart3 } from 'lucide-react';
import type { LotRepartitionEntry } from '@/hooks/modules/useLotDetailPage';
import styles from './LotDetailMain.module.css';

interface LotDetailMainProps {
  repartition: LotRepartitionEntry[];
}

export function LotDetailMain({ repartition }: LotDetailMainProps) {
  return (
    <div className={styles.main}>
      {/* Tantièmes & Répartition */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          <BarChart3 size={18} />
          Tantièmes & Clés de répartition
        </h3>
        {repartition.length > 0 ? (
          <table className={styles.repTable}>
            <thead>
              <tr>
                <th>Clé</th>
                <th>Tantièmes</th>
                <th>Total clé</th>
                <th>Part</th>
                <th style={{ width: '30%' }}></th>
              </tr>
            </thead>
            <tbody>
              {repartition.map(r => (
                <tr key={r.key_id}>
                  <td>{r.key_name}</td>
                  <td className={styles.mono}>{r.weight}</td>
                  <td className={styles.mono}>{r.total_weight}</td>
                  <td className={styles.pct}>{r.share_pct.toFixed(2)}%</td>
                  <td>
                    <div className={styles.barContainer}>
                      <div className={styles.bar} style={{ width: `${Math.min(r.share_pct, 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyNote}>Aucune clé de répartition configurée pour ce lot</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Mettre à jour l'index**

Dans `src/components/features/lots/index.ts`, ajouter :

```typescript
export { LotDetailSidebar } from './LotDetailSidebar';
export { LotDetailMain } from './LotDetailMain';
```

- [ ] **Step 6: Commit**

```bash
git add src/components/features/lots/LotDetailSidebar.tsx src/components/features/lots/LotDetailSidebar.module.css \
  src/components/features/lots/LotDetailMain.tsx src/components/features/lots/LotDetailMain.module.css \
  src/components/features/lots/index.ts
git commit -m "feat(lots): composants détail lot — sidebar (proprio, emprunts, avances) + main (répartition)"
```

---

### Task 14: Page détail lot

**Files:**
- Create: `src/app/(dashboard)/coproprietaires/lots/[id]/page.tsx`
- Create: `src/app/(dashboard)/coproprietaires/lots/[id]/lot-detail.module.css`

- [ ] **Step 1: Créer le CSS**

```css
/* src/app/(dashboard)/coproprietaires/lots/[id]/lot-detail.module.css */
.topBar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  background: #161822;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  margin-bottom: 24px;
}

.topBarLeft h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
}

.topBarMeta {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.metaBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.backBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(148, 163, 184, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 8px;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.backBtn:hover {
  background: rgba(148, 163, 184, 0.1);
  color: #e2e8f0;
}

.layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Créer la page**

```typescript
// src/app/(dashboard)/coproprietaires/lots/[id]/page.tsx
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useLotDetailPage } from '@/hooks/modules/useLotDetailPage';
import { LotDetailSidebar, LotDetailMain } from '@/components/features/lots';
import { LoadingState, ErrorState } from '@/components/ui/DataState/DataState';
import styles from './lot-detail.module.css';

const LOT_TYPE_LABELS: Record<string, string> = {
  appartement: 'Appartement', studio: 'Studio', parking: 'Parking',
  cave: 'Cave', local_commercial: 'Commerce', bureau: 'Bureau',
  garage: 'Garage', box: 'Box', autre: 'Autre',
};

export default function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { lot, isLoading, error, repartition, loanShares, advances, refresh } = useLotDetailPage(id);

  if (isLoading) return <LoadingState message="Chargement du lot..." />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!lot) return <ErrorState message="Lot introuvable" />;

  return (
    <div className="container">
      {/* TopBar */}
      <div className={styles.topBar}>
        <div>
          <h1>Lot {lot.ref}</h1>
          <div className={styles.topBarMeta}>
            {lot.type && <span className={styles.metaBadge}>{LOT_TYPE_LABELS[lot.type] || lot.type}</span>}
            {lot.floor != null && <span className={styles.metaBadge}>Étage {lot.floor}</span>}
            {lot.surface != null && <span className={styles.metaBadge}>{lot.surface} m²</span>}
            <span className={styles.metaBadge}>{lot.tantiemes_generaux} tantièmes</span>
          </div>
        </div>
        <button className={styles.backBtn} onClick={() => router.push('/coproprietaires/lots')}>
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      {/* Layout sidebar + main */}
      <div className={styles.layout}>
        <LotDetailSidebar lot={lot} loanShares={loanShares} advances={advances} />
        <LotDetailMain repartition={repartition} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/coproprietaires/lots/\[id\]/
git commit -m "feat(lots): page détail lot — sidebar + répartition par clé"
```

---

### Task 15: Page clés de répartition

**Files:**
- Create: `src/hooks/modules/useRepartitionPage.ts`
- Create: `src/app/(dashboard)/coproprietaires/repartition/page.tsx`
- Create: `src/app/(dashboard)/coproprietaires/repartition/repartition.module.css`
- Create: `src/components/features/lots/RepartitionKeyCard.tsx`
- Create: `src/components/features/lots/RepartitionKeyCard.module.css`

- [ ] **Step 1: Créer le hook**

```typescript
// src/hooks/modules/useRepartitionPage.ts
'use client';

import { useState, useCallback } from 'react';
import { useRepartitionKeys, useRepartitionKeyDetail } from '@/hooks/modules/useLotsData';
import { useLots } from '@/hooks/modules/useLotsData';

export function useRepartitionPage() {
  const { keys, isLoading, error, refresh, createKey, deleteKey, isMutating } = useRepartitionKeys();
  const { lots } = useLots();
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const detail = useRepartitionKeyDetail(selectedKeyId);

  const handleSelectKey = useCallback((keyId: string) => {
    setSelectedKeyId(prev => prev === keyId ? null : keyId);
  }, []);

  return {
    keys, isLoading, error, refresh,
    createKey, deleteKey, isMutating,
    lots,
    selectedKeyId, handleSelectKey,
    detail,
    showCreateModal, setShowCreateModal,
  };
}
```

- [ ] **Step 2: Créer le CSS de la card**

```css
/* src/components/features/lots/RepartitionKeyCard.module.css */
.card {
  padding: 20px;
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.cardActive {
  composes: card;
  border-color: #3b82f6;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.name {
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
}

.basis {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 500;
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
}

.meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.metaItem {
  font-size: 11px;
  color: #64748b;
}

.metaValue {
  font-weight: 600;
  color: #94a3b8;
  margin-left: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.progressBar {
  height: 4px;
  background: rgba(148, 163, 184, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progressComplete {
  composes: progressFill;
  background: #22c55e;
}

.progressIncomplete {
  composes: progressFill;
  background: #f59e0b;
}

.warning {
  margin-top: 8px;
  font-size: 11px;
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Detail panel */
.detailPanel {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
}

.detailTable {
  width: 100%;
  border-collapse: collapse;
}

.detailTable th {
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  text-align: left;
  background: rgba(148, 163, 184, 0.04);
}

.detailTable td {
  padding: 6px 10px;
  font-size: 12px;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.04);
}

.weightInput {
  width: 80px;
  padding: 4px 8px;
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 12px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  text-align: right;
}

.weightInput:focus {
  border-color: #3b82f6;
  outline: none;
}
```

- [ ] **Step 3: Créer le composant card**

```typescript
// src/components/features/lots/RepartitionKeyCard.tsx
'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { RepartitionKeyWithTotals } from '@/lib/lots/api';
import type { UseRepartitionKeyDetailReturn } from '@/hooks/modules/useLotsData';
import styles from './RepartitionKeyCard.module.css';

const BASIS_LABELS: Record<string, string> = {
  tantiemes: 'Tantièmes',
  surface: 'Surface',
  custom: 'Personnalisé',
};

interface RepartitionKeyCardProps {
  keyData: RepartitionKeyWithTotals;
  isSelected: boolean;
  onSelect: () => void;
  detail: UseRepartitionKeyDetailReturn | null;
}

export function RepartitionKeyCard({ keyData, isSelected, onSelect, detail }: RepartitionKeyCardProps) {
  const completePct = keyData.lots_count > 0
    ? (keyData.lots_with_weight_count / keyData.lots_count) * 100
    : 0;

  return (
    <div className={isSelected ? styles.cardActive : styles.card} onClick={onSelect}>
      <div className={styles.header}>
        <h3 className={styles.name}>{keyData.name}</h3>
        <span className={styles.basis}>{BASIS_LABELS[keyData.basis] || keyData.basis}</span>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          Lots: <span className={styles.metaValue}>{keyData.lots_with_weight_count}/{keyData.lots_count}</span>
        </span>
        <span className={styles.metaItem}>
          Total: <span className={styles.metaValue}>{keyData.total_weight.toLocaleString('fr-FR')}</span>
        </span>
      </div>

      <div className={styles.progressBar}>
        <div
          className={keyData.is_complete ? styles.progressComplete : styles.progressIncomplete}
          style={{ width: `${completePct}%` }}
        />
      </div>

      {!keyData.is_complete && (
        <div className={styles.warning}>
          <AlertTriangle size={12} />
          {keyData.lots_count - keyData.lots_with_weight_count} lot(s) sans poids
        </div>
      )}

      {/* Detail panel */}
      {isSelected && detail && detail.lines.length > 0 && (
        <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
          <table className={styles.detailTable}>
            <thead>
              <tr>
                <th>Lot</th>
                <th>Type</th>
                <th>Poids</th>
                <th>Part %</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map(line => (
                <tr key={line.line_id}>
                  <td style={{ fontWeight: 600, color: '#3b82f6' }}>{line.lot_ref}</td>
                  <td>{line.lot_type || '-'}</td>
                  <td style={{ fontFamily: "'SF Mono', monospace" }}>{line.weight}</td>
                  <td style={{ fontFamily: "'SF Mono', monospace", color: '#94a3b8' }}>
                    {line.share_pct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {detail.validation && !detail.validation.isValid && (
            <div className={styles.warning} style={{ marginTop: 12 }}>
              <AlertTriangle size={12} />
              {detail.validation.warnings.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Créer le CSS page**

```css
/* src/app/(dashboard)/coproprietaires/repartition/repartition.module.css */
.topBar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  background: #161822;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  margin-bottom: 24px;
}

.topBarLeft h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
}

.topBarLeft p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #94a3b8;
}

.addBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #3b82f6;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.addBtn:hover {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.keysGrid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

- [ ] **Step 5: Créer la page**

```typescript
// src/app/(dashboard)/coproprietaires/repartition/page.tsx
'use client';

import { Plus } from 'lucide-react';
import { useRepartitionPage } from '@/hooks/modules/useRepartitionPage';
import { RepartitionKeyCard } from '@/components/features/lots';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import styles from './repartition.module.css';

export default function RepartitionPage() {
  const { currentCoproId } = useCopro();
  const {
    keys, isLoading, error, refresh,
    selectedKeyId, handleSelectKey, detail,
  } = useRepartitionPage();

  if (!currentCoproId) return <LoadingState message="Chargement..." />;

  return (
    <div className="container">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1>Clés de répartition</h1>
          <p>Ventilation des charges par clé et par lot</p>
        </div>
      </div>

      {isLoading && <LoadingState message="Chargement des clés..." />}
      {error && !isLoading && <ErrorState message={error} onRetry={refresh} />}
      {!isLoading && !error && keys.length === 0 && (
        <EmptyState title="Aucune clé" message="Aucune clé de répartition configurée." />
      )}

      {!isLoading && !error && keys.length > 0 && (
        <div className={styles.keysGrid}>
          {keys.map(k => (
            <RepartitionKeyCard
              key={k.key_id}
              keyData={k}
              isSelected={selectedKeyId === k.key_id}
              onSelect={() => handleSelectKey(k.key_id)}
              detail={selectedKeyId === k.key_id ? detail : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Mettre à jour l'index des composants lots**

Ajouter dans `src/components/features/lots/index.ts` :

```typescript
export { RepartitionKeyCard } from './RepartitionKeyCard';
```

- [ ] **Step 7: Commit**

```bash
git add src/hooks/modules/useRepartitionPage.ts \
  src/app/\(dashboard\)/coproprietaires/repartition/ \
  src/components/features/lots/RepartitionKeyCard.tsx \
  src/components/features/lots/RepartitionKeyCard.module.css \
  src/components/features/lots/index.ts
git commit -m "feat(lots): page clés de répartition — cards, détail par clé, barres proportionnelles"
```

---

## Phase 3 — Types Payload V2

### Task 16: Refonte des types EtatDatePayload

**Files:**
- Modify: `src/features/ventes/domain/types.ts`

**Contexte :** On renomme le type actuel `EtatDatePayload` en `EtatDatePayloadV1`, on crée `EtatDatePayloadV2` conforme au décret (3 parties + annexe), et on crée une union `EtatDatePayload` pour la rétrocompatibilité.

- [ ] **Step 1: Renommer l'ancien type et ajouter le V2**

Dans `src/features/ventes/domain/types.ts`, remplacer le bloc `EtatDatePayload` (lignes 98-175) par :

```typescript
// Payload V1 — ancien format (un seul bloc financial_situation)
export interface EtatDatePayloadV1 {
  version?: '1.0';
  legal_reference: string;
  snapshot_type: SnapshotType;
  generated_at: string;

  copro: {
    id: string;
    name: string;
    address: string | null;
    siret: string | null;
  };

  lot: {
    id: string;
    ref: string;
    type: string;
    tantiemes_generaux: number;
    building_id: string | null;
    floor: number | null;
    surface: number | null;
  };

  seller: {
    id: string;
    name: string;
    email: string | null;
    is_company: boolean;
  };

  financial_situation: {
    snapshot_date: string;
    current_balance: number;
    total_calls_issued: number;
    total_payments_received: number;
    unpaid: {
      amount: number;
      lines_count: number;
      oldest_due_date: string | null;
      days_overdue: number;
    };
    work_fund_alur: {
      balance: number;
      note: string;
    };
    pending_calls: {
      amount: number;
      note: string;
    };
  };

  recent_transactions: Array<{
    line_date: string;
    line_type: 'call' | 'payment';
    label: string;
    debit: number;
    credit: number;
    running_balance: number;
    line_status: string;
  }>;

  recent_transactions_count: number;

  mutation: {
    id: string;
    type: MutationType;
    requested_at: string;
    signature_date: string | null;
    notary_name: string | null;
  };
}

// Payload V2 — conforme Décret 67-223, Art. 5 et 5-1
export interface EtatDatePayloadV2 {
  version: '2.0';
  legal_reference: 'Décret 67-223 du 17 mars 1967, Art. 5 et 5-1';
  snapshot_type: SnapshotType;
  generated_at: string;
  snapshot_date: string;

  copro: {
    id: string;
    name: string;
    address: string;
    siret: string | null;
    syndic_name: string;
    syndic_address: string;
  };

  lot: {
    id: string;
    ref: string;
    type: string;
    building: string | null;
    floor: number | null;
    surface: number | null;
    tantiemes_generaux: number;
    total_tantiemes: number;
    repartition_keys: Array<{
      key_name: string;
      tantiemes: number;
      total: number;
    }>;
  };

  seller: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    is_company: boolean;
  };

  mutation: {
    id: string;
    type: MutationType;
    requested_at: string;
    signature_date: string | null;
    notary_name: string | null;
    notary_email: string | null;
  };

  // PARTIE 1 — Sommes dues PAR le vendeur AU syndicat
  partie1_vendeur_doit: {
    provisions_budget: {
      amount: number;
      detail: Array<{
        label: string;
        due_date: string;
        amount_due: number;
        amount_paid: number;
        remaining: number;
      }>;
    };
    provisions_travaux: {
      amount: number;
      detail: Array<{
        label: string;
        due_date: string;
        amount_due: number;
        amount_paid: number;
        remaining: number;
      }>;
    };
    arrieres: {
      amount: number;
      detail: Array<{
        period_label: string;
        amount: number;
      }>;
    };
    emprunts_collectifs: {
      amount: number;
      detail: Array<{
        label: string;
        lender: string;
        total_loan: number;
        seller_share: number;
        remaining: number;
      }>;
    };
    avances_exigibles: {
      amount: number;
      detail: Array<{
        label: string;
        amount_due: number;
        amount_paid: number;
      }>;
    };
    total: number;
  };

  // PARTIE 2 — Sommes dues PAR le syndicat AU vendeur
  partie2_syndicat_doit: {
    avances_versees: {
      amount: number;
      detail: Array<{
        label: string;
        type: string;
        amount: number;
      }>;
    };
    provisions_post_mutation: {
      amount: number;
      note: string;
    };
    trop_percus: {
      amount: number;
      note: string;
    };
    total: number;
  };

  // PARTIE 3 — Sommes incombant au nouvel acquéreur
  partie3_acquereur: {
    reconstitution_avances: {
      amount: number;
      detail: Array<{
        label: string;
        amount: number;
      }>;
    };
    provisions_non_exigibles: {
      amount: number;
      note: string;
    };
    travaux_votes_non_appeles: {
      amount: number;
      detail: Array<{
        label: string;
        ag_date: string;
        total_vote: number;
        lot_share: number;
      }>;
    };
    fonds_travaux_alur: {
      balance: number;
      note: string;
    };
    total: number;
  };

  // ANNEXE
  annexe: {
    historique_charges: Array<{
      period_label: string;
      budget_previsionnel: number;
      hors_budget: number;
      total: number;
    }>;
    procedures_judiciaires: Array<{
      title: string;
      nature: string;
      opposing_party: string;
      amount_at_stake: number;
      status: string;
      court: string;
    }>;
    solde_compte: number;
    recent_transactions: Array<{
      line_date: string;
      line_type: 'call' | 'payment';
      label: string;
      debit: number;
      credit: number;
      running_balance: number;
    }>;
  };
}

// Union — le viewer détecte la version pour choisir le rendu
export type EtatDatePayload = EtatDatePayloadV1 | EtatDatePayloadV2;

// Type guard
export function isPayloadV2(payload: EtatDatePayload): payload is EtatDatePayloadV2 {
  return payload.version === '2.0';
}
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: Possibles erreurs dans `EtatDateViewer.tsx` car il accède à `payload.financial_situation` qui n'existe que dans V1. C'est attendu — on corrigera en Phase 5. Pour l'instant, ajouter un cast temporaire si nécessaire.

- [ ] **Step 3: Si erreurs TS, ajouter un cast dans EtatDateViewer**

Dans `EtatDateViewer.tsx`, après `const payload = snapshot.payload;`, ajouter :

```typescript
const payload = snapshot.payload as EtatDatePayloadV1;
```

Et importer `EtatDatePayloadV1` au lieu de `EtatDatePayload`.

- [ ] **Step 4: Commit**

```bash
git add src/features/ventes/domain/types.ts src/features/ventes/components/EtatDateViewer.tsx
git commit -m "feat(etat-date): types payload V2 conforme décret 67-223 — 3 parties + annexe"
```

---

## Phase 4 — Génération PDF côté client

### Task 17: Constantes de layout PDF + helpers

**Files:**
- Create: `src/features/ventes/pdf/pdfLayout.ts`
- Create: `src/features/ventes/pdf/helpers/formatters.ts`
- Create: `src/features/ventes/pdf/helpers/renderSectionTitle.ts`
- Create: `src/features/ventes/pdf/helpers/renderTable.ts`

- [ ] **Step 1: Créer pdfLayout.ts**

```typescript
// src/features/ventes/pdf/pdfLayout.ts
export const PDF = {
  margin: { left: 20, right: 20, top: 20, bottom: 25 },
  pageWidth: 210, // A4
  contentWidth: 170, // 210 - 20 - 20
  colors: {
    primary: [37, 99, 235] as const,    // #2563EB
    text: [30, 41, 59] as const,        // #1E293B
    textLight: [100, 116, 139] as const, // #64748B
    success: [34, 197, 94] as const,     // #22C55E
    danger: [239, 68, 68] as const,      // #EF4444
    bgSection: [241, 245, 249] as const, // #F1F5F9
    border: [226, 232, 240] as const,    // #E2E8F0
  },
  fonts: {
    title: 18,
    subtitle: 14,
    sectionTitle: 11,
    body: 10,
    small: 9,
    tiny: 8,
  },
} as const;
```

- [ ] **Step 2: Créer formatters.ts**

```typescript
// src/features/ventes/pdf/helpers/formatters.ts
export function fmtEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function fmtDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
```

- [ ] **Step 3: Créer renderSectionTitle.ts**

```typescript
// src/features/ventes/pdf/helpers/renderSectionTitle.ts
import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';

export function renderSectionTitle(doc: jsPDF, y: number, title: string): number {
  if (y > 260) {
    doc.addPage();
    y = PDF.margin.top;
  }

  doc.setFillColor(...PDF.colors.bgSection);
  doc.rect(PDF.margin.left, y, PDF.contentWidth, 8, 'F');
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.primary);
  doc.text(title, PDF.margin.left + 4, y + 6);

  return y + 14;
}
```

- [ ] **Step 4: Créer renderTable.ts**

```typescript
// src/features/ventes/pdf/helpers/renderTable.ts
import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';

interface TableColumn {
  label: string;
  width: number; // percentage of contentWidth
  align?: 'left' | 'right';
}

export function renderTable(
  doc: jsPDF,
  y: number,
  columns: TableColumn[],
  rows: string[][],
): number {
  if (rows.length === 0) {
    doc.setFontSize(PDF.fonts.small);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...PDF.colors.textLight);
    doc.text('Aucun', PDF.margin.left + 4, y + 4);
    return y + 10;
  }

  const colWidths = columns.map(c => (c.width / 100) * PDF.contentWidth);
  let x: number;

  // Header
  doc.setFontSize(PDF.fonts.tiny);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.textLight);
  x = PDF.margin.left;
  columns.forEach((col, i) => {
    const textX = col.align === 'right' ? x + colWidths[i] - 2 : x + 2;
    doc.text(col.label, textX, y + 4, { align: col.align === 'right' ? 'right' : 'left' });
    x += colWidths[i];
  });
  y += 7;

  // Separator
  doc.setDrawColor(...PDF.colors.border);
  doc.setLineWidth(0.3);
  doc.line(PDF.margin.left, y, PDF.margin.left + PDF.contentWidth, y);
  y += 3;

  // Rows
  doc.setFontSize(PDF.fonts.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF.colors.text);

  for (const row of rows) {
    if (y > 270) {
      doc.addPage();
      y = PDF.margin.top;
    }

    x = PDF.margin.left;
    row.forEach((cell, i) => {
      const textX = columns[i].align === 'right' ? x + colWidths[i] - 2 : x + 2;
      doc.text(cell, textX, y, { align: columns[i].align === 'right' ? 'right' : 'left' });
      x += colWidths[i];
    });
    y += 5;
  }

  return y + 3;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/ventes/pdf/pdfLayout.ts src/features/ventes/pdf/helpers/
git commit -m "feat(pdf): layout constants + helpers (formatters, section title, table renderer)"
```

---

### Task 18: Sections PDF (header + parties 1-3 + annexe)

**Files:**
- Create: `src/features/ventes/pdf/sections/renderHeader.ts`
- Create: `src/features/ventes/pdf/sections/renderPartie1.ts`
- Create: `src/features/ventes/pdf/sections/renderPartie2.ts`
- Create: `src/features/ventes/pdf/sections/renderPartie3.ts`
- Create: `src/features/ventes/pdf/sections/renderAnnexe.ts`

- [ ] **Step 1: renderHeader.ts**

```typescript
// src/features/ventes/pdf/sections/renderHeader.ts
import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtDate } from '../helpers/formatters';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderHeader(doc: jsPDF, payload: EtatDatePayloadV2): number {
  const pw = doc.internal.pageSize.getWidth();
  let y = PDF.margin.top;

  // Title
  doc.setFontSize(PDF.fonts.title);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.primary);
  const title = payload.snapshot_type === 'pre' ? 'PRÉ-ÉTAT DATÉ' : 'ÉTAT DATÉ';
  doc.text(title, pw / 2, y, { align: 'center' });
  y += 7;

  // Legal reference
  doc.setFontSize(PDF.fonts.small);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...PDF.colors.textLight);
  doc.text(payload.legal_reference, pw / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Établi le ${fmtDate(payload.snapshot_date)}`, pw / 2, y, { align: 'center' });
  y += 10;

  // Separator
  doc.setDrawColor(...PDF.colors.primary);
  doc.setLineWidth(0.5);
  doc.line(PDF.margin.left, y, pw - PDF.margin.right, y);
  y += 8;

  // Helper for key-value
  const addField = (label: string, value: string) => {
    doc.setFontSize(PDF.fonts.body);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF.colors.text);
    doc.text(label, PDF.margin.left + 4, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 75, y);
    y += 6;
  };

  // Copro info
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.primary);
  doc.text('COPROPRIÉTÉ', PDF.margin.left, y);
  y += 6;
  addField('Nom :', payload.copro.name);
  addField('Adresse :', payload.copro.address);
  if (payload.copro.siret) addField('SIRET :', payload.copro.siret);
  addField('Syndic :', payload.copro.syndic_name);
  y += 3;

  // Lot info
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.primary);
  doc.text('LOT CONCERNÉ', PDF.margin.left, y);
  y += 6;
  addField('Référence :', `${payload.lot.ref} (${payload.lot.type})`);
  if (payload.lot.floor != null) addField('Étage :', `${payload.lot.floor}`);
  if (payload.lot.surface != null) addField('Surface :', `${payload.lot.surface} m²`);
  addField('Tantièmes :', `${payload.lot.tantiemes_generaux} / ${payload.lot.total_tantiemes}`);
  y += 3;

  // Seller
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.primary);
  doc.text('VENDEUR', PDF.margin.left, y);
  y += 6;
  addField('Nom :', payload.seller.name);
  if (payload.seller.email) addField('Email :', payload.seller.email);
  y += 3;

  // Mutation
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.primary);
  doc.text('MUTATION', PDF.margin.left, y);
  y += 6;
  addField('Demandée le :', fmtDate(payload.mutation.requested_at));
  if (payload.mutation.notary_name) addField('Notaire :', payload.mutation.notary_name);

  return y + 5;
}
```

- [ ] **Step 2: renderPartie1.ts**

```typescript
// src/features/ventes/pdf/sections/renderPartie1.ts
import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro, fmtDateShort } from '../helpers/formatters';
import { renderSectionTitle } from '../helpers/renderSectionTitle';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie1(doc: jsPDF, y: number, p1: EtatDatePayloadV2['partie1_vendeur_doit']): number {
  doc.addPage();
  y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.text);
  doc.text('PARTIE 1 — Sommes dues par le vendeur au syndicat', PDF.margin.left, y);
  y += 10;

  // Provisions budget
  y = renderSectionTitle(doc, y, 'Provisions exigibles — Budget prévisionnel');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 35 }, { label: 'Échéance', width: 20 }, { label: 'Dû', width: 15, align: 'right' }, { label: 'Payé', width: 15, align: 'right' }, { label: 'Reste', width: 15, align: 'right' }],
    p1.provisions_budget.detail.map(d => [d.label, fmtDateShort(d.due_date), fmtEuro(d.amount_due), fmtEuro(d.amount_paid), fmtEuro(d.remaining)])
  );

  // Provisions travaux
  y = renderSectionTitle(doc, y, 'Provisions exigibles — Travaux');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 35 }, { label: 'Échéance', width: 20 }, { label: 'Dû', width: 15, align: 'right' }, { label: 'Payé', width: 15, align: 'right' }, { label: 'Reste', width: 15, align: 'right' }],
    p1.provisions_travaux.detail.map(d => [d.label, fmtDateShort(d.due_date), fmtEuro(d.amount_due), fmtEuro(d.amount_paid), fmtEuro(d.remaining)])
  );

  // Arriérés
  y = renderSectionTitle(doc, y, 'Arriérés — Exercices antérieurs');
  y = renderTable(doc, y,
    [{ label: 'Période', width: 60 }, { label: 'Montant', width: 40, align: 'right' }],
    p1.arrieres.detail.map(d => [d.period_label, fmtEuro(d.amount)])
  );

  // Emprunts collectifs
  y = renderSectionTitle(doc, y, 'Emprunts collectifs — Part du lot');
  y = renderTable(doc, y,
    [{ label: 'Emprunt', width: 30 }, { label: 'Prêteur', width: 20 }, { label: 'Total', width: 16, align: 'right' }, { label: 'Part', width: 17, align: 'right' }, { label: 'Reste', width: 17, align: 'right' }],
    p1.emprunts_collectifs.detail.map(d => [d.label, d.lender, fmtEuro(d.total_loan), fmtEuro(d.seller_share), fmtEuro(d.remaining)])
  );

  // Avances exigibles
  y = renderSectionTitle(doc, y, 'Avances exigibles');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 50 }, { label: 'Dû', width: 25, align: 'right' }, { label: 'Payé', width: 25, align: 'right' }],
    p1.avances_exigibles.detail.map(d => [d.label, fmtEuro(d.amount_due), fmtEuro(d.amount_paid)])
  );

  // Total
  y += 5;
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.text);
  doc.text('TOTAL Partie 1 :', PDF.margin.left + 4, y);
  doc.setTextColor(p1.total > 0 ? ...PDF.colors.danger : ...PDF.colors.text);
  doc.text(fmtEuro(p1.total), PDF.margin.left + PDF.contentWidth - 2, y, { align: 'right' });

  return y + 8;
}
```

- [ ] **Step 3: renderPartie2.ts**

```typescript
// src/features/ventes/pdf/sections/renderPartie2.ts
import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro } from '../helpers/formatters';
import { renderSectionTitle } from '../helpers/renderSectionTitle';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie2(doc: jsPDF, y: number, p2: EtatDatePayloadV2['partie2_syndicat_doit']): number {
  doc.addPage();
  y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.text);
  doc.text('PARTIE 2 — Sommes dues par le syndicat au vendeur', PDF.margin.left, y);
  y += 10;

  // Avances versées
  y = renderSectionTitle(doc, y, 'Avances versées restituables');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 40 }, { label: 'Type', width: 30 }, { label: 'Montant', width: 30, align: 'right' }],
    p2.avances_versees.detail.map(d => [d.label, d.type, fmtEuro(d.amount)])
  );

  // Provisions post-mutation
  y = renderSectionTitle(doc, y, 'Provisions post-mutation (trop-versé)');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF.colors.text);
  doc.text(`Montant : ${fmtEuro(p2.provisions_post_mutation.amount)}`, PDF.margin.left + 4, y);
  y += 5;
  if (p2.provisions_post_mutation.note) {
    doc.setFontSize(PDF.fonts.small);
    doc.setTextColor(...PDF.colors.textLight);
    doc.text(p2.provisions_post_mutation.note, PDF.margin.left + 4, y);
    y += 6;
  }

  // Trop-perçus
  y = renderSectionTitle(doc, y, 'Trop-perçus (régularisation)');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF.colors.text);
  doc.text(`Montant : ${fmtEuro(p2.trop_percus.amount)}`, PDF.margin.left + 4, y);
  y += 8;

  // Total
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.text);
  doc.text('TOTAL Partie 2 :', PDF.margin.left + 4, y);
  doc.setTextColor(...PDF.colors.success);
  doc.text(fmtEuro(p2.total), PDF.margin.left + PDF.contentWidth - 2, y, { align: 'right' });

  return y + 8;
}
```

- [ ] **Step 4: renderPartie3.ts**

```typescript
// src/features/ventes/pdf/sections/renderPartie3.ts
import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro, fmtDateShort } from '../helpers/formatters';
import { renderSectionTitle } from '../helpers/renderSectionTitle';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie3(doc: jsPDF, y: number, p3: EtatDatePayloadV2['partie3_acquereur']): number {
  doc.addPage();
  y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.text);
  doc.text('PARTIE 3 — Sommes incombant à l\'acquéreur', PDF.margin.left, y);
  y += 10;

  // Reconstitution avances
  y = renderSectionTitle(doc, y, 'Reconstitution des avances');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 60 }, { label: 'Montant', width: 40, align: 'right' }],
    p3.reconstitution_avances.detail.map(d => [d.label, fmtEuro(d.amount)])
  );

  // Provisions non exigibles
  y = renderSectionTitle(doc, y, 'Provisions non encore exigibles');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF.colors.text);
  doc.text(`Montant : ${fmtEuro(p3.provisions_non_exigibles.amount)}`, PDF.margin.left + 4, y);
  y += 5;
  if (p3.provisions_non_exigibles.note) {
    doc.setFontSize(PDF.fonts.small);
    doc.setTextColor(...PDF.colors.textLight);
    doc.text(p3.provisions_non_exigibles.note, PDF.margin.left + 4, y);
    y += 6;
  }

  // Travaux votés non appelés
  y = renderSectionTitle(doc, y, 'Travaux votés non encore appelés');
  y = renderTable(doc, y,
    [{ label: 'Travaux', width: 30 }, { label: 'Date AG', width: 20 }, { label: 'Total voté', width: 20, align: 'right' }, { label: 'Part lot', width: 30, align: 'right' }],
    p3.travaux_votes_non_appeles.detail.map(d => [d.label, fmtDateShort(d.ag_date), fmtEuro(d.total_vote), fmtEuro(d.lot_share)])
  );

  // Fonds travaux ALUR
  y = renderSectionTitle(doc, y, 'Fonds travaux ALUR (Art. 14-2 II)');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF.colors.text);
  doc.text(`Solde : ${fmtEuro(p3.fonds_travaux_alur.balance)}`, PDF.margin.left + 4, y);
  y += 5;
  doc.setFontSize(PDF.fonts.small);
  doc.setTextColor(...PDF.colors.textLight);
  doc.text(p3.fonds_travaux_alur.note || 'Non rattaché au lot — attaché au copropriétaire', PDF.margin.left + 4, y);
  y += 8;

  // Total
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.text);
  doc.text('TOTAL Partie 3 :', PDF.margin.left + 4, y);
  doc.text(fmtEuro(p3.total), PDF.margin.left + PDF.contentWidth - 2, y, { align: 'right' });

  return y + 8;
}
```

- [ ] **Step 5: renderAnnexe.ts**

```typescript
// src/features/ventes/pdf/sections/renderAnnexe.ts
import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro, fmtDate, fmtDateShort } from '../helpers/formatters';
import { renderSectionTitle } from '../helpers/renderSectionTitle';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

const NATURE_LABELS: Record<string, string> = {
  litigation: 'Contentieux',
  recovery: 'Recouvrement',
  other: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  closed: 'Clôturé',
  won: 'Gagné',
  lost: 'Perdu',
};

export function renderAnnexe(doc: jsPDF, y: number, annexe: EtatDatePayloadV2['annexe'], copro: EtatDatePayloadV2['copro'], snapshotDate: string): number {
  doc.addPage();
  y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF.colors.text);
  doc.text('ANNEXE', PDF.margin.left, y);
  y += 10;

  // Historique charges
  y = renderSectionTitle(doc, y, 'Historique des charges — 2 derniers exercices');
  y = renderTable(doc, y,
    [{ label: 'Exercice', width: 30 }, { label: 'Prévisionnel', width: 23, align: 'right' }, { label: 'Hors budget', width: 23, align: 'right' }, { label: 'Total', width: 24, align: 'right' }],
    annexe.historique_charges.map(h => [h.period_label, fmtEuro(h.budget_previsionnel), fmtEuro(h.hors_budget), fmtEuro(h.total)])
  );

  // Procédures judiciaires
  y = renderSectionTitle(doc, y, 'Procédures judiciaires en cours');
  if (annexe.procedures_judiciaires.length === 0) {
    doc.setFontSize(PDF.fonts.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF.colors.text);
    doc.text('Aucune procédure en cours.', PDF.margin.left + 4, y);
    y += 8;
  } else {
    y = renderTable(doc, y,
      [{ label: 'Objet', width: 25 }, { label: 'Nature', width: 15 }, { label: 'Partie adverse', width: 20 }, { label: 'Enjeu', width: 15, align: 'right' }, { label: 'Statut', width: 12 }, { label: 'Tribunal', width: 13 }],
      annexe.procedures_judiciaires.map(p => [p.title, NATURE_LABELS[p.nature] || p.nature, p.opposing_party, fmtEuro(p.amount_at_stake), STATUS_LABELS[p.status] || p.status, p.court])
    );
  }

  // Transactions récentes
  if (annexe.recent_transactions.length > 0) {
    y = renderSectionTitle(doc, y, 'Dernières opérations du compte');
    y = renderTable(doc, y,
      [{ label: 'Date', width: 15 }, { label: 'Type', width: 12 }, { label: 'Libellé', width: 33 }, { label: 'Débit', width: 13, align: 'right' }, { label: 'Crédit', width: 13, align: 'right' }, { label: 'Solde', width: 14, align: 'right' }],
      annexe.recent_transactions.map(t => [
        fmtDateShort(t.line_date),
        t.line_type === 'call' ? 'Appel' : 'Paiement',
        t.label,
        t.debit > 0 ? fmtEuro(t.debit) : '-',
        t.credit > 0 ? fmtEuro(t.credit) : '-',
        fmtEuro(t.running_balance),
      ])
    );
  }

  // Pied de page
  y += 10;
  doc.setDrawColor(...PDF.colors.border);
  doc.line(PDF.margin.left, y, PDF.margin.left + PDF.contentWidth, y);
  y += 8;

  doc.setFontSize(PDF.fonts.small);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...PDF.colors.textLight);
  doc.text(`Établi le ${fmtDate(snapshotDate)} par ${copro.syndic_name}`, PDF.margin.left, y);
  y += 5;
  doc.text('Les sommes mentionnées sont à jour à la date d\'établissement du présent état.', PDF.margin.left, y);

  return y + 10;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/ventes/pdf/sections/
git commit -m "feat(pdf): sections état daté — header, parties 1-3, annexe"
```

---

### Task 19: Fonction principale `generateEtatDatePDF`

**Files:**
- Create: `src/features/ventes/pdf/generateEtatDatePDF.ts`

- [ ] **Step 1: Créer la fonction**

```typescript
// src/features/ventes/pdf/generateEtatDatePDF.ts
import { jsPDF } from 'jspdf';
import { fmtDateShort } from './helpers/formatters';
import { renderHeader } from './sections/renderHeader';
import { renderPartie1 } from './sections/renderPartie1';
import { renderPartie2 } from './sections/renderPartie2';
import { renderPartie3 } from './sections/renderPartie3';
import { renderAnnexe } from './sections/renderAnnexe';
import type { EtatDatePayloadV2 } from '../domain/types';

export function generateEtatDatePDF(payload: EtatDatePayloadV2): void {
  const doc = new jsPDF();

  // Page 1: Header
  renderHeader(doc, payload);

  // Page 2: Partie 1 — Dettes vendeur
  renderPartie1(doc, 0, payload.partie1_vendeur_doit);

  // Page 3: Partie 2 — Créances vendeur
  renderPartie2(doc, 0, payload.partie2_syndicat_doit);

  // Page 4: Partie 3 — Charges acquéreur
  renderPartie3(doc, 0, payload.partie3_acquereur);

  // Page 5: Annexe
  renderAnnexe(doc, 0, payload.annexe, payload.copro, payload.snapshot_date);

  // Numérotation des pages
  const totalPages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Page ${i}/${totalPages}`, pw - 20, ph - 10, { align: 'right' });
    doc.text('Copro Manager — Document confidentiel', 20, ph - 10);
  }

  // Téléchargement
  const type = payload.snapshot_type === 'pre' ? 'pre-etat-date' : 'etat-date';
  const lotRef = payload.lot.ref.replace(/\s+/g, '-');
  const date = fmtDateShort(payload.snapshot_date).replace(/\//g, '-');
  doc.save(`${type}-${lotRef}-${date}.pdf`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/ventes/pdf/generateEtatDatePDF.ts
git commit -m "feat(pdf): fonction generateEtatDatePDF — orchestrateur 5 sections + téléchargement"
```

---

## Phase 5 — Refonte EtatDateViewer

### Task 20: Copie legacy du viewer v1

**Files:**
- Create: `src/features/ventes/components/EtatDateViewerLegacy.tsx`

**Contexte :** On copie le viewer actuel tel quel dans un composant "legacy" qui sera utilisé pour les anciens snapshots (payload v1).

- [ ] **Step 1: Copier le viewer actuel**

Copier le contenu intégral de `EtatDateViewer.tsx` dans `EtatDateViewerLegacy.tsx`, en renommant :
- Le composant de `EtatDateViewer` à `EtatDateViewerLegacy`
- L'import du type `EtatDatePayload` → `EtatDatePayloadV1`
- Le cast du payload : `const payload = snapshot.payload as EtatDatePayloadV1;`

- [ ] **Step 2: Commit**

```bash
git add src/features/ventes/components/EtatDateViewerLegacy.tsx
git commit -m "feat(etat-date): copie legacy du viewer v1 pour rétrocompatibilité"
```

---

### Task 21: Sous-composants viewer V2

**Files:**
- Create: `src/features/ventes/components/etat-date/EtatDateHeader.tsx`
- Create: `src/features/ventes/components/etat-date/EtatDatePartie.tsx`
- Create: `src/features/ventes/components/etat-date/EtatDatePartieRow.tsx`
- Create: `src/features/ventes/components/etat-date/EtatDateSummary.tsx`
- Create: `src/features/ventes/components/etat-date/EtatDateAnnexe.tsx`
- Create: `src/features/ventes/components/etat-date/EtatDateTransactions.tsx`
- Create: `src/features/ventes/components/etat-date/EtatDateJsonViewer.tsx`
- Create: `src/features/ventes/components/etat-date/etat-date.module.css`

**Note :** Cette tâche est volumineuse. Elle sera décomposée dans l'exécution en créant chaque sous-composant un par un. Le CSS est partagé dans `etat-date.module.css`. La structure de chaque composant suit le même pattern :

- **EtatDateHeader** : Affiche copro, lot, vendeur, mutation (comme le viewer v1 mais avec les champs V2 enrichis)
- **EtatDatePartie** : Composant générique pour Parties 1/2/3 — titre, liste de sous-sections, total
- **EtatDatePartieRow** : Ligne dans une partie — label + montant + toggle pour déplier le détail
- **EtatDateSummary** : 3 KPIs récap (Partie 1, Partie 2, Partie 3) + solde net vendeur
- **EtatDateAnnexe** : Historique charges N-1/N-2, procédures judiciaires
- **EtatDateTransactions** : Tableau des dernières opérations (identique au v1)
- **EtatDateJsonViewer** : Toggle JSON brut (identique au v1)

Chaque composant reçoit la portion pertinente du payload V2 en props. Pas de logique complexe — affichage pur.

- [ ] **Step 1: Créer le CSS partagé (etat-date.module.css)**

Reprendre les styles de `EtatDateViewer.module.css` existant et ajouter les styles pour les nouvelles sections (parties, toggle détail, summary KPIs). Le CSS existant est déjà bien structuré — on étend avec :

```css
/* Ajouter à la fin de etat-date.module.css */

/* Partie section */
.partieHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 8px;
  margin-bottom: 12px;
}

.partieTitle {
  font-size: 14px;
  font-weight: 700;
  color: #e2e8f0;
}

.partieTotal {
  font-size: 16px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.partieTotalPositive {
  composes: partieTotal;
  color: #22c55e;
}

.partieTotalNegative {
  composes: partieTotal;
  color: #ef4444;
}

/* Partie Row */
.partieRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.04);
  cursor: pointer;
  transition: background 0.15s;
}

.partieRow:hover {
  background: rgba(148, 163, 184, 0.03);
}

.partieRowLabel {
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.partieRowAmount {
  font-size: 13px;
  font-weight: 600;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  color: #e2e8f0;
}

.partieRowAmountZero {
  composes: partieRowAmount;
  color: #64748b;
}

.partieRowDetail {
  padding: 8px 12px 8px 32px;
  background: rgba(148, 163, 184, 0.02);
  border-bottom: 1px solid rgba(148, 163, 184, 0.04);
}

/* Summary KPIs */
.summaryGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.summaryCard {
  padding: 12px 16px;
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 8px;
  text-align: center;
}

.summaryLabel {
  display: block;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  margin-bottom: 4px;
}

.summaryValue {
  display: block;
  font-size: 18px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.summaryValueDanger {
  composes: summaryValue;
  color: #ef4444;
}

.summaryValueSuccess {
  composes: summaryValue;
  color: #22c55e;
}

.summaryValuePrimary {
  composes: summaryValue;
  color: #3b82f6;
}

.summaryNet {
  composes: summaryCard;
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.05);
}
```

- [ ] **Step 2-8: Créer chaque sous-composant**

Chaque sous-composant est un composant React fonctionnel simple recevant sa portion du payload V2 en props. Le code exact sera fourni lors de l'exécution — les interfaces sont claires depuis le type `EtatDatePayloadV2`.

- [ ] **Step 9: Commit**

```bash
git add src/features/ventes/components/etat-date/
git commit -m "feat(etat-date): sous-composants viewer V2 — header, parties, summary, annexe, transactions"
```

---

### Task 22: Refonte du viewer orchestrateur

**Files:**
- Modify: `src/features/ventes/components/EtatDateViewer.tsx`

**Contexte :** Le viewer principal devient un orchestrateur léger qui détecte la version du payload et délègue au legacy (v1) ou au nouveau viewer (v2).

- [ ] **Step 1: Refondre EtatDateViewer.tsx**

```typescript
// src/features/ventes/components/EtatDateViewer.tsx
'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { EtatDateViewerLegacy } from './EtatDateViewerLegacy';
import { EtatDateHeader } from './etat-date/EtatDateHeader';
import { EtatDateSummary } from './etat-date/EtatDateSummary';
import { EtatDatePartie } from './etat-date/EtatDatePartie';
import { EtatDateAnnexe } from './etat-date/EtatDateAnnexe';
import { EtatDateTransactions } from './etat-date/EtatDateTransactions';
import { EtatDateJsonViewer } from './etat-date/EtatDateJsonViewer';
import { generateEtatDatePDF } from '../pdf/generateEtatDatePDF';
import { isPayloadV2 } from '../domain/types';
import type { EtatDateSnapshot, EtatDatePayloadV2 } from '../domain/types';
import styles from './EtatDateViewer.module.css';

interface EtatDateViewerProps {
  snapshot: EtatDateSnapshot;
  onViewDocument?: (documentId: string) => void;
}

export function EtatDateViewer({ snapshot, onViewDocument }: EtatDateViewerProps) {
  const payload = snapshot.payload;

  // V1 fallback
  if (!isPayloadV2(payload)) {
    return <EtatDateViewerLegacy snapshot={snapshot} onViewDocument={onViewDocument} />;
  }

  // V2 viewer
  return <EtatDateViewerV2 snapshot={snapshot} payload={payload} />;
}

function EtatDateViewerV2({ snapshot, payload }: { snapshot: EtatDateSnapshot; payload: EtatDatePayloadV2 }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    try {
      generateEtatDatePDF(payload);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header avec bouton PDF */}
      <div className={styles.header}>
        <EtatDateHeader payload={payload} snapshotDate={snapshot.generated_at} />
        <button
          className={styles.downloadBtn}
          onClick={handleDownloadPDF}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 size={14} className={styles.spinner} /> : <Download size={14} />}
          Télécharger PDF
        </button>
      </div>

      {/* Summary 3 KPIs + solde net */}
      <EtatDateSummary
        partie1Total={payload.partie1_vendeur_doit.total}
        partie2Total={payload.partie2_syndicat_doit.total}
        partie3Total={payload.partie3_acquereur.total}
      />

      {/* Partie 1 */}
      <EtatDatePartie
        title="Partie 1 — Sommes dues par le vendeur au syndicat"
        total={payload.partie1_vendeur_doit.total}
        sections={[
          { label: 'Provisions budget prévisionnel', amount: payload.partie1_vendeur_doit.provisions_budget.amount, detail: payload.partie1_vendeur_doit.provisions_budget.detail },
          { label: 'Provisions travaux', amount: payload.partie1_vendeur_doit.provisions_travaux.amount, detail: payload.partie1_vendeur_doit.provisions_travaux.detail },
          { label: 'Arriérés exercices antérieurs', amount: payload.partie1_vendeur_doit.arrieres.amount, detail: payload.partie1_vendeur_doit.arrieres.detail },
          { label: 'Emprunts collectifs', amount: payload.partie1_vendeur_doit.emprunts_collectifs.amount, detail: payload.partie1_vendeur_doit.emprunts_collectifs.detail },
          { label: 'Avances exigibles', amount: payload.partie1_vendeur_doit.avances_exigibles.amount, detail: payload.partie1_vendeur_doit.avances_exigibles.detail },
        ]}
      />

      {/* Partie 2 */}
      <EtatDatePartie
        title="Partie 2 — Sommes dues par le syndicat au vendeur"
        total={payload.partie2_syndicat_doit.total}
        sections={[
          { label: 'Avances versées restituables', amount: payload.partie2_syndicat_doit.avances_versees.amount, detail: payload.partie2_syndicat_doit.avances_versees.detail },
          { label: 'Provisions post-mutation', amount: payload.partie2_syndicat_doit.provisions_post_mutation.amount },
          { label: 'Trop-perçus (régularisation)', amount: payload.partie2_syndicat_doit.trop_percus.amount },
        ]}
      />

      {/* Partie 3 */}
      <EtatDatePartie
        title="Partie 3 — Sommes incombant à l'acquéreur"
        total={payload.partie3_acquereur.total}
        sections={[
          { label: 'Reconstitution des avances', amount: payload.partie3_acquereur.reconstitution_avances.amount, detail: payload.partie3_acquereur.reconstitution_avances.detail },
          { label: 'Provisions non exigibles', amount: payload.partie3_acquereur.provisions_non_exigibles.amount },
          { label: 'Travaux votés non appelés', amount: payload.partie3_acquereur.travaux_votes_non_appeles.amount, detail: payload.partie3_acquereur.travaux_votes_non_appeles.detail },
          { label: 'Fonds travaux ALUR', amount: payload.partie3_acquereur.fonds_travaux_alur.balance },
        ]}
      />

      {/* Annexe */}
      <EtatDateAnnexe annexe={payload.annexe} />

      {/* Transactions */}
      {payload.annexe.recent_transactions.length > 0 && (
        <EtatDateTransactions transactions={payload.annexe.recent_transactions} />
      )}

      {/* JSON toggle */}
      <EtatDateJsonViewer payload={payload} />
    </div>
  );
}
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Pas d'erreur TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/features/ventes/components/EtatDateViewer.tsx
git commit -m "feat(etat-date): refonte viewer — détection version, V2 avec 3 parties + annexe + PDF"
```

---

## Validation finale

### Task 23: Vérification build complet

- [ ] **Step 1: Build complet**

Run: `npx next build 2>&1 | tail -20`
Expected: Build réussi, toutes les routes compilées.

- [ ] **Step 2: Vérifier les routes**

Les routes suivantes doivent être compilées :
- `/coproprietaires/lots` — liste des lots
- `/coproprietaires/lots/[id]` — détail lot
- `/coproprietaires/repartition` — clés de répartition

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat(etat-date+lots): implémentation complète — UI lots/tantièmes, payload V2, PDF, viewer refonte

Phase 2: Pages lots (liste, détail, répartition) avec hooks et composants
Phase 3: Types EtatDatePayloadV2 conforme décret 67-223
Phase 4: Génération PDF côté client (jsPDF, 5 sections)
Phase 5: Refonte EtatDateViewer — détection version, sous-composants, intégration PDF"
```

---

## Notes d'implémentation

### Phase 1 (SQL) — Exécution manuelle requise
Les tables doivent être créées dans le Supabase Dashboard avant de pouvoir tester les hooks `useLotDetailPage` (emprunts, avances). Sans ces tables, les requêtes échoueront silencieusement (try/catch dans le hook).

### Phase 5A (SQL refonte `create_etat_date_snapshot`) — Hors scope de ce plan
La refonte de la fonction SQL qui génère le payload V2 est une tâche Supabase-side. Ce plan couvre uniquement le code client. Un plan séparé sera nécessaire pour la fonction SQL.

### Ordre d'exécution recommandé
1. **Task 6** (navigation) — rapide, débloque les liens sidebar
2. **Tasks 7-15** (Phase 2) — UI lots, peut être testé immédiatement
3. **Task 16** (Phase 3) — types V2, ~5 minutes
4. **Tasks 17-19** (Phase 4) — PDF, testable avec un payload V2 mocké
5. **Tasks 20-22** (Phase 5) — viewer, testable avec un payload V2 mocké
6. **Task 23** — validation build

### Parallélisation possible
- **Phase 2** (Tasks 7-15) et **Phase 3** (Task 16) sont indépendantes → exécutables en parallèle par 2 agents
- **Phase 4** (Tasks 17-19) dépend de Phase 3
- **Phase 5** (Tasks 20-22) dépend de Phases 3 et 4
