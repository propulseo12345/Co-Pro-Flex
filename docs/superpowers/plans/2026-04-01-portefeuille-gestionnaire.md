# Page d'accueil Gestionnaire — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre `/portefeuille` en page d'accueil gestionnaire avec KPIs agrégés + grille de cartes copropriétés triées par criticité.

**Architecture:** Remplacement de la vue tableau par une grille de cartes cliquables. Le hook `usePortefeuille` est refactoré avec un score de criticité pour le tri automatique. Le clic sur une carte met à jour `activeCopro` (sessionStorage + cache mémoire) et redirige vers `/dashboard`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, CSS Modules, Lucide React

---

## File Structure

| Fichier | Action | Responsabilité |
|---------|--------|---------------|
| `src/types/models/portefeuille.ts` | Modifier | Ajouter `prochaineAG`, `criticalityScore` |
| `src/hooks/modules/usePortefeuille.ts` | Refondre | Score de criticité, tri, recherche |
| `src/components/features/portefeuille/PortefeuilleKpis.tsx` | Refondre | Nouveau design KPIs |
| `src/components/features/portefeuille/PortefeuilleCoproCard.tsx` | Créer | Carte copro individuelle |
| `src/components/features/portefeuille/PortefeuilleGrid.tsx` | Créer | Grille responsive + recherche |
| `src/components/features/portefeuille/PortefeuilleTable.tsx` | Supprimer | Remplacé par Grid+Card |
| `src/components/features/portefeuille/index.ts` | Modifier | Exporter nouveaux composants |
| `src/app/(dashboard)/portefeuille/page.tsx` | Refondre | Assemblage page complète |
| `src/app/(dashboard)/portefeuille/portefeuille.module.css` | Refondre | Styles grille + cartes |
| `src/lib/copro/activeCopro.ts` | Modifier | Ajouter `setActiveCopro()` |
| `src/lib/config/navigation.ts` | Modifier | Ajouter entrée Portefeuille en haut |

---

### Task 1: Types — Ajouter champs au modèle portefeuille

**Files:**
- Modify: `src/types/models/portefeuille.ts`

- [ ] **Step 1: Ajouter les nouveaux champs à `ICoproprietePortefeuille`**

Dans `src/types/models/portefeuille.ts`, ajouter `prochaineAG` et `criticalityScore` à l'interface :

```typescript
export interface ICoproprietePortefeuille {
  id: ID;
  nom: string;
  adresse: string;
  nombreLots: number;
  exerciceCourant: number;
  // Indicateurs financiers
  soldeDisponible: number;
  totalImpayes: number;
  nombreImpayes: number;
  tauxRecouvrement: number;
  // Factures
  facturesEnRetard: number;
  montantFacturesRetard: number;
  // Budget
  budgetTotal: number;
  budgetConsomme: number;
  budgetRestant: number;
  budgetAlerteRisque: boolean;
  // Rapprochement bancaire
  mouvementsNonRapproches: number;
  dernierRapprochement?: string;
  // AG
  prochaineAG?: string; // date ISO
  // Alertes
  alertes: IAlerteCopropriete[];
  // Criticité (calculé côté client)
  criticalityScore: number;
}
```

- [ ] **Step 2: Vérifier que le build compile**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Erreurs sur les fichiers qui utilisent `ICoproprietePortefeuille` sans fournir `criticalityScore` et `prochaineAG`. C'est normal, on corrigera dans les tasks suivantes.

- [ ] **Step 3: Commit**

```bash
git add src/types/models/portefeuille.ts
git commit -m "feat(types): add prochaineAG and criticalityScore to ICoproprietePortefeuille"
```

---

### Task 2: Hook — Score de criticité + tri + recherche

**Files:**
- Modify: `src/hooks/modules/usePortefeuille.ts`

- [ ] **Step 1: Réécrire `usePortefeuille` avec score de criticité**

Remplacer tout le contenu de `src/hooks/modules/usePortefeuille.ts` :

```typescript
'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  ICoproprietePortefeuille,
  IPortefeuilleKPIs,
  AlerteType,
} from '@/types/models/portefeuille';

// =============================================================================
// MOCK DATA (sera remplacé par Supabase)
// =============================================================================

const MOCK_COPROPRIETES: Omit<ICoproprietePortefeuille, 'criticalityScore'>[] = [
  {
    id: 'copro-1',
    nom: 'Résidence Les Lilas',
    adresse: '15 rue des Lilas, 75011 Paris',
    nombreLots: 24,
    exerciceCourant: 2025,
    soldeDisponible: 45230.50,
    totalImpayes: 3542.80,
    nombreImpayes: 4,
    tauxRecouvrement: 87.2,
    facturesEnRetard: 2,
    montantFacturesRetard: 1250.00,
    budgetTotal: 85000,
    budgetConsomme: 42500,
    budgetRestant: 42500,
    budgetAlerteRisque: false,
    mouvementsNonRapproches: 3,
    dernierRapprochement: '2025-01-15',
    prochaineAG: '2026-05-15',
    alertes: [
      { id: 'alert-1', type: 'IMPAYE', severite: 'critique', titre: 'Impayés critiques', description: '2 copropriétaires avec retard > 90 jours', montant: 2845.50, lien: '/finance/unpaid' },
      { id: 'alert-2', type: 'FACTURE', severite: 'warning', titre: 'Factures en attente', description: '2 factures à échéance dépassée', montant: 1250.00, lien: '/finance/factures' },
    ],
  },
  {
    id: 'copro-2',
    nom: 'Le Clos Saint-Martin',
    adresse: '8 avenue Saint-Martin, 75003 Paris',
    nombreLots: 42,
    exerciceCourant: 2025,
    soldeDisponible: 78450.00,
    totalImpayes: 0,
    nombreImpayes: 0,
    tauxRecouvrement: 100,
    facturesEnRetard: 0,
    montantFacturesRetard: 0,
    budgetTotal: 125000,
    budgetConsomme: 95000,
    budgetRestant: 30000,
    budgetAlerteRisque: true,
    mouvementsNonRapproches: 0,
    dernierRapprochement: '2025-01-20',
    alertes: [
      { id: 'alert-3', type: 'BUDGET', severite: 'warning', titre: 'Budget à risque', description: 'Consommation à 76% avec 5 mois restants', montant: 30000, lien: '/finance/budgets' },
    ],
  },
  {
    id: 'copro-3',
    nom: 'Domaine de la Forêt',
    adresse: '120 boulevard de la Forêt, 92400 Courbevoie',
    nombreLots: 68,
    exerciceCourant: 2025,
    soldeDisponible: 125800.00,
    totalImpayes: 8920.40,
    nombreImpayes: 7,
    tauxRecouvrement: 78.5,
    facturesEnRetard: 5,
    montantFacturesRetard: 4580.00,
    budgetTotal: 180000,
    budgetConsomme: 72000,
    budgetRestant: 108000,
    budgetAlerteRisque: false,
    mouvementsNonRapproches: 12,
    dernierRapprochement: '2024-12-28',
    prochaineAG: '2026-04-20',
    alertes: [
      { id: 'alert-4', type: 'IMPAYE', severite: 'critique', titre: 'Impayés importants', description: "7 copropriétaires en situation d'impayé", montant: 8920.40, lien: '/finance/unpaid' },
      { id: 'alert-5', type: 'RAPPROCHEMENT', severite: 'critique', titre: 'Rapprochement en retard', description: '12 mouvements non rapprochés depuis 24 jours', lien: '/finance/mouvements-bancaires' },
      { id: 'alert-6', type: 'FACTURE', severite: 'warning', titre: 'Factures en retard', description: '5 factures à traiter', montant: 4580.00, lien: '/finance/factures' },
    ],
  },
  {
    id: 'copro-4',
    nom: 'Résidence Haussmann',
    adresse: '45 boulevard Haussmann, 75009 Paris',
    nombreLots: 18,
    exerciceCourant: 2025,
    soldeDisponible: 32100.00,
    totalImpayes: 756.20,
    nombreImpayes: 1,
    tauxRecouvrement: 95.8,
    facturesEnRetard: 1,
    montantFacturesRetard: 890.00,
    budgetTotal: 52000,
    budgetConsomme: 18200,
    budgetRestant: 33800,
    budgetAlerteRisque: false,
    mouvementsNonRapproches: 1,
    dernierRapprochement: '2025-01-18',
    alertes: [
      { id: 'alert-7', type: 'CONTRAT', severite: 'warning', titre: 'Contrat à renouveler', description: 'Assurance MRH expire dans 30 jours', dateEcheance: '2025-02-21', lien: '/maintenance/contracts' },
    ],
  },
  {
    id: 'copro-5',
    nom: 'Les Jardins du Parc',
    adresse: '5 allée des Jardins, 94300 Vincennes',
    nombreLots: 35,
    exerciceCourant: 2025,
    soldeDisponible: 56780.00,
    totalImpayes: 0,
    nombreImpayes: 0,
    tauxRecouvrement: 100,
    facturesEnRetard: 0,
    montantFacturesRetard: 0,
    budgetTotal: 95000,
    budgetConsomme: 38000,
    budgetRestant: 57000,
    budgetAlerteRisque: false,
    mouvementsNonRapproches: 0,
    dernierRapprochement: '2025-01-21',
    alertes: [],
  },
];

// =============================================================================
// CRITICALITY SCORE
// =============================================================================

function calculateCriticalityScore(copro: Omit<ICoproprietePortefeuille, 'criticalityScore'>): number {
  let score = 0;

  if (copro.totalImpayes > 0) {
    score += 30;
    score += Math.min(copro.totalImpayes / 1000, 20);
  }

  if (copro.tauxRecouvrement < 90) {
    score += 20;
    score += (90 - copro.tauxRecouvrement) / 2;
  }

  if (copro.mouvementsNonRapproches > 0) {
    score += 15;
    score += Math.min(copro.mouvementsNonRapproches, 10);
  }

  if (copro.facturesEnRetard > 0) {
    score += 15;
    score += Math.min(copro.facturesEnRetard * 3, 10);
  }

  const budgetPct = copro.budgetTotal > 0
    ? (copro.budgetConsomme / copro.budgetTotal) * 100
    : 0;
  if (budgetPct > 80) {
    score += 10;
    score += Math.min((budgetPct - 80) / 2, 10);
  }

  return Math.round(score);
}

// =============================================================================
// KPIs
// =============================================================================

function calculateKPIs(coproprietes: ICoproprietePortefeuille[]): IPortefeuilleKPIs {
  const totalCoproprietes = coproprietes.length;
  const totalLots = coproprietes.reduce((sum, c) => sum + c.nombreLots, 0);
  const totalImpayes = coproprietes.reduce((sum, c) => sum + c.totalImpayes, 0);
  const nombreCoproAvecImpayes = coproprietes.filter(c => c.totalImpayes > 0).length;
  const totalFacturesRetard = coproprietes.reduce((sum, c) => sum + c.facturesEnRetard, 0);
  const montantFacturesRetard = coproprietes.reduce((sum, c) => sum + c.montantFacturesRetard, 0);
  const budgetsARisque = coproprietes.filter(c => c.budgetAlerteRisque).length;
  const budgetGlobalTotal = coproprietes.reduce((sum, c) => sum + c.budgetTotal, 0);
  const budgetGlobalConsomme = coproprietes.reduce((sum, c) => sum + c.budgetConsomme, 0);
  const coproNonRapprochees = coproprietes.filter(c => c.mouvementsNonRapproches > 0).length;
  const mouvementsNonRapprochesTotal = coproprietes.reduce((sum, c) => sum + c.mouvementsNonRapproches, 0);

  const totalAppels = coproprietes.reduce((sum, c) => {
    const appelTotal = c.tauxRecouvrement < 100
      ? c.totalImpayes / (1 - c.tauxRecouvrement / 100)
      : 0;
    return sum + appelTotal;
  }, 0);
  const tauxRecouvrementGlobal = totalAppels > 0
    ? ((totalAppels - totalImpayes) / totalAppels) * 100
    : 100;

  const allAlertes = coproprietes.flatMap(c => c.alertes);
  const alertesCritiques = allAlertes.filter(a => a.severite === 'critique').length;
  const alertesWarning = allAlertes.filter(a => a.severite === 'warning').length;

  return {
    totalCoproprietes,
    totalLots,
    totalImpayes,
    nombreCoproAvecImpayes,
    tauxRecouvrementGlobal,
    totalFacturesRetard,
    montantFacturesRetard,
    budgetsARisque,
    budgetGlobalTotal,
    budgetGlobalConsomme,
    coproNonRapprochees,
    mouvementsNonRapprochesTotal,
    alertesCritiques,
    alertesWarning,
  };
}

// =============================================================================
// HOOK
// =============================================================================

export interface UsePortefeuilleReturn {
  coproprietes: ICoproprietePortefeuille[];
  filteredCoproprietes: ICoproprietePortefeuille[];
  kpis: IPortefeuilleKPIs;
  recherche: string;
  setRecherche: (value: string) => void;
  isLoading: boolean;
}

export function usePortefeuille(): UsePortefeuilleReturn {
  const [recherche, setRecherche] = useState('');
  const [isLoading] = useState(false);

  // Enrichir avec score de criticité + trier
  const coproprietes = useMemo(() => {
    const enriched = MOCK_COPROPRIETES.map(c => ({
      ...c,
      criticalityScore: calculateCriticalityScore(c),
    }));
    return enriched.sort((a, b) => b.criticalityScore - a.criticalityScore);
  }, []);

  // Filtrer par recherche
  const filteredCoproprietes = useMemo(() => {
    if (!recherche) return coproprietes;
    const search = recherche.toLowerCase();
    return coproprietes.filter(
      c => c.nom.toLowerCase().includes(search) || c.adresse.toLowerCase().includes(search)
    );
  }, [coproprietes, recherche]);

  // KPIs sur toutes les copros (pas filtrées)
  const kpis = useMemo(() => calculateKPIs(coproprietes), [coproprietes]);

  return {
    coproprietes,
    filteredCoproprietes,
    kpis,
    recherche,
    setRecherche: useCallback((value: string) => setRecherche(value), []),
    isLoading,
  };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Erreurs possibles dans `page.tsx` (anciens props), c'est normal. Le hook lui-même doit compiler.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/modules/usePortefeuille.ts
git commit -m "feat(hook): refactor usePortefeuille with criticality score and sorting"
```

---

### Task 3: Service — Ajouter `setActiveCopro()` pour le switch de copro

**Files:**
- Modify: `src/lib/copro/activeCopro.ts`

- [ ] **Step 1: Ajouter la fonction `setActiveCopro`**

Ajouter cette fonction après `invalidateActiveCoproCache()` (après ligne 178) dans `src/lib/copro/activeCopro.ts` :

```typescript
/**
 * Change la copro active (utilisé par le portefeuille gestionnaire).
 * Met à jour le cache mémoire + sessionStorage.
 */
export function setActiveCopro(id: string, name: string): void {
  memoryCache = { id, name, timestamp: Date.now() };
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, id);
    sessionStorage.setItem(COPRO_NAME_KEY, name);
  }
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit 2>&1 | grep activeCopro`
Expected: Pas d'erreur liée à ce fichier.

- [ ] **Step 3: Commit**

```bash
git add src/lib/copro/activeCopro.ts
git commit -m "feat(copro): add setActiveCopro for switching active copropriété"
```

---

### Task 4: Composant — Carte copropriété

**Files:**
- Create: `src/components/features/portefeuille/PortefeuilleCoproCard.tsx`

- [ ] **Step 1: Créer le composant `PortefeuilleCoproCard`**

Créer `src/components/features/portefeuille/PortefeuilleCoproCard.tsx` :

```typescript
'use client';

import { Building2, AlertCircle, AlertTriangle, Calendar } from 'lucide-react';
import type { ICoproprietePortefeuille, AlerteType } from '@/types/models/portefeuille';
import styles from '../../../app/(dashboard)/portefeuille/portefeuille.module.css';

const alerteTypeLabels: Record<AlerteType, string> = {
  IMPAYE: 'Impayés',
  FACTURE: 'Factures',
  BUDGET: 'Budgets',
  RAPPROCHEMENT: 'Rapprochement',
  CONTRAT: 'Contrats',
  AG: 'AG',
};

interface PortefeuilleCoproCardProps {
  copro: ICoproprietePortefeuille;
  onSelect: (copro: ICoproprietePortefeuille) => void;
}

function formatMontant(m: number): string {
  return m.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getSeverityClass(score: number): string {
  if (score === 0) return styles.cardBorderSuccess;
  if (score <= 30) return styles.cardBorderWarning;
  return styles.cardBorderDanger;
}

export function PortefeuilleCoproCard({ copro, onSelect }: PortefeuilleCoproCardProps) {
  return (
    <button
      className={`${styles.coproCard} ${getSeverityClass(copro.criticalityScore)}`}
      onClick={() => onSelect(copro)}
      type="button"
    >
      <div className={styles.cardHeader}>
        <Building2 size={18} className={styles.cardIcon} />
        <h3 className={styles.cardName}>{copro.nom}</h3>
      </div>

      <p className={styles.cardAddress}>{copro.adresse}</p>

      <div className={styles.cardStats}>
        <span className={styles.cardLots}>{copro.nombreLots} lots</span>
        <span className={styles.cardSeparator}>·</span>
        <span className={copro.soldeDisponible >= 0 ? styles.cardSoldePositive : styles.cardSoldeNegative}>
          {formatMontant(copro.soldeDisponible)}
        </span>
      </div>

      <div className={styles.cardDetails}>
        {copro.totalImpayes > 0 && (
          <span className={styles.cardImpayes}>
            {copro.nombreImpayes} impayé{copro.nombreImpayes > 1 ? 's' : ''} ({formatMontant(copro.totalImpayes)})
          </span>
        )}
        {copro.prochaineAG && (
          <span className={styles.cardAG}>
            <Calendar size={12} />
            AG : {formatDate(copro.prochaineAG)}
          </span>
        )}
      </div>

      {copro.alertes.length > 0 && (
        <div className={styles.cardAlertes}>
          {copro.alertes.slice(0, 3).map((alerte) => (
            <span
              key={alerte.id}
              className={`${styles.cardAlerteBadge} ${alerte.severite === 'critique' ? styles.alerteCritique : styles.alerteWarning}`}
            >
              {alerte.severite === 'critique' ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
              {alerteTypeLabels[alerte.type]}
            </span>
          ))}
          {copro.alertes.length > 3 && (
            <span className={styles.cardAlerteBadge}>+{copro.alertes.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/portefeuille/PortefeuilleCoproCard.tsx
git commit -m "feat(portefeuille): create PortefeuilleCoproCard component"
```

---

### Task 5: Composant — Grille responsive + recherche

**Files:**
- Create: `src/components/features/portefeuille/PortefeuilleGrid.tsx`

- [ ] **Step 1: Créer le composant `PortefeuilleGrid`**

Créer `src/components/features/portefeuille/PortefeuilleGrid.tsx` :

```typescript
'use client';

import { Search, Building2 } from 'lucide-react';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import { PortefeuilleCoproCard } from './PortefeuilleCoproCard';
import styles from '../../../app/(dashboard)/portefeuille/portefeuille.module.css';

interface PortefeuilleGridProps {
  coproprietes: ICoproprietePortefeuille[];
  recherche: string;
  onRecherche: (value: string) => void;
  onSelectCopro: (copro: ICoproprietePortefeuille) => void;
}

export function PortefeuilleGrid({
  coproprietes,
  recherche,
  onRecherche,
  onSelectCopro,
}: PortefeuilleGridProps) {
  return (
    <div className={styles.gridSection}>
      <div className={styles.gridHeader}>
        <h2 className={styles.gridTitle}>
          Copropriétés
          <span className={styles.gridCount}>{coproprietes.length}</span>
        </h2>
        <div className={styles.gridSearch}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher une copropriété..."
            value={recherche}
            onChange={(e) => onRecherche(e.target.value)}
          />
        </div>
      </div>

      {coproprietes.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} />
          <p>Aucune copropriété ne correspond à votre recherche</p>
        </div>
      ) : (
        <div className={styles.coproGrid}>
          {coproprietes.map((copro) => (
            <PortefeuilleCoproCard
              key={copro.id}
              copro={copro}
              onSelect={onSelectCopro}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/portefeuille/PortefeuilleGrid.tsx
git commit -m "feat(portefeuille): create PortefeuilleGrid component"
```

---

### Task 6: Composant — KPIs refondus

**Files:**
- Modify: `src/components/features/portefeuille/PortefeuilleKpis.tsx`

- [ ] **Step 1: Réécrire `PortefeuilleKpis`**

Remplacer tout le contenu de `src/components/features/portefeuille/PortefeuilleKpis.tsx` :

```typescript
'use client';

import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Receipt,
  PieChart,
  Banknote,
} from 'lucide-react';
import type { IPortefeuilleKPIs } from '@/types/models/portefeuille';
import styles from '../../../app/(dashboard)/portefeuille/portefeuille.module.css';

interface PortefeuilleKpisProps {
  kpis: IPortefeuilleKPIs;
}

function formatMontant(m: number): string {
  return m.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function PortefeuilleKpis({ kpis }: PortefeuilleKpisProps) {
  return (
    <div className={styles.kpisGrid}>
      {/* Impayés totaux */}
      <div className={`${styles.kpiCard} ${kpis.totalImpayes > 0 ? styles.kpiDanger : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Impayés totaux</span>
          <div className={styles.kpiIcon}><AlertCircle size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{formatMontant(kpis.totalImpayes)}</div>
        <div className={styles.kpiSub}>
          {kpis.nombreCoproAvecImpayes > 0
            ? <span className={styles.kpiSubHighlight}>{kpis.nombreCoproAvecImpayes} copro. concernée{kpis.nombreCoproAvecImpayes > 1 ? 's' : ''}</span>
            : <span>Aucun impayé</span>}
        </div>
      </div>

      {/* Taux recouvrement */}
      <div className={`${styles.kpiCard} ${kpis.tauxRecouvrementGlobal < 90 ? styles.kpiWarning : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Taux recouvrement</span>
          <div className={styles.kpiIcon}><TrendingUp size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{kpis.tauxRecouvrementGlobal.toFixed(1)}%</div>
        <div className={styles.kpiSub}>
          {kpis.tauxRecouvrementGlobal >= 95
            ? <><CheckCircle size={12} /> Excellent</>
            : kpis.tauxRecouvrementGlobal >= 85
              ? <><TrendingUp size={12} /> Bon</>
              : <><TrendingDown size={12} /> À améliorer</>}
        </div>
      </div>

      {/* Factures en retard */}
      <div className={`${styles.kpiCard} ${kpis.totalFacturesRetard > 0 ? styles.kpiWarning : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Factures en retard</span>
          <div className={styles.kpiIcon}><Receipt size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{kpis.totalFacturesRetard}</div>
        <div className={styles.kpiSub}>
          {kpis.montantFacturesRetard > 0
            ? <span>{formatMontant(kpis.montantFacturesRetard)}</span>
            : <span>Aucune facture en retard</span>}
        </div>
      </div>

      {/* Budgets à risque */}
      <div className={`${styles.kpiCard} ${kpis.budgetsARisque > 0 ? styles.kpiWarning : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Budgets à risque</span>
          <div className={styles.kpiIcon}><PieChart size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{kpis.budgetsARisque}</div>
        <div className={styles.kpiSub}>
          <span>{kpis.budgetGlobalTotal > 0 ? ((kpis.budgetGlobalConsomme / kpis.budgetGlobalTotal) * 100).toFixed(0) : 0}% budget global consommé</span>
        </div>
      </div>

      {/* Rapprochement */}
      <div className={`${styles.kpiCard} ${kpis.coproNonRapprochees > 0 ? styles.kpiWarning : styles.kpiSuccess}`}>
        <div className={styles.kpiHeader}>
          <span className={styles.kpiLabel}>Rapprochement</span>
          <div className={styles.kpiIcon}><Banknote size={20} /></div>
        </div>
        <div className={styles.kpiValue}>{kpis.mouvementsNonRapprochesTotal}</div>
        <div className={styles.kpiSub}>
          {kpis.coproNonRapprochees > 0
            ? <span className={styles.kpiSubHighlight}>{kpis.coproNonRapprochees} copro. en attente</span>
            : <><CheckCircle size={12} /> Tout rapproché</>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/features/portefeuille/PortefeuilleKpis.tsx
git commit -m "feat(portefeuille): refactor PortefeuilleKpis with simplified props"
```

---

### Task 7: Barrel export — Mettre à jour `index.ts`

**Files:**
- Modify: `src/components/features/portefeuille/index.ts`

- [ ] **Step 1: Mettre à jour les exports**

Remplacer le contenu de `src/components/features/portefeuille/index.ts` :

```typescript
export { PortefeuilleKpis } from './PortefeuilleKpis';
export { PortefeuilleCoproCard } from './PortefeuilleCoproCard';
export { PortefeuilleGrid } from './PortefeuilleGrid';
```

- [ ] **Step 2: Supprimer `PortefeuilleTable.tsx`**

```bash
rm src/components/features/portefeuille/PortefeuilleTable.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/portefeuille/index.ts
git add src/components/features/portefeuille/PortefeuilleTable.tsx
git commit -m "refactor(portefeuille): replace PortefeuilleTable with Grid+Card exports"
```

---

### Task 8: Styles — Refonte CSS complète

**Files:**
- Modify: `src/app/(dashboard)/portefeuille/portefeuille.module.css`

- [ ] **Step 1: Réécrire le CSS**

Remplacer tout le contenu de `src/app/(dashboard)/portefeuille/portefeuille.module.css` :

```css
/* =============================================================================
   PORTEFEUILLE GESTIONNAIRE — Page d'accueil
   ============================================================================= */

.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

/* TopBar */
.topBar {
  background: #161822;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.topBarContent h1 {
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.topBarContent p {
  font-size: 14px;
  color: #94a3b8;
}

.topBarActions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btnPrimary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btnPrimary:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* KPIs Grid */
.kpisGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpiCard {
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
  transition: all 0.15s ease;
}

.kpiCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.kpiCard::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.kpiDanger::before { background: #ef4444; }
.kpiWarning::before { background: #f59e0b; }
.kpiSuccess::before { background: #22c55e; }

.kpiHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.kpiLabel {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.kpiIcon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpiDanger .kpiIcon { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.kpiWarning .kpiIcon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.kpiSuccess .kpiIcon { background: rgba(34, 197, 94, 0.1); color: #22c55e; }

.kpiValue {
  font-size: 22px;
  font-weight: 700;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
}

.kpiDanger .kpiValue { color: #ef4444; }
.kpiWarning .kpiValue { color: #f59e0b; }
.kpiSuccess .kpiValue { color: #22c55e; }

.kpiSub {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.kpiSubHighlight {
  color: #ef4444;
  font-weight: 600;
}

/* Grid Section */
.gridSection {
  background: #1a1d2e;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 12px;
  padding: 24px;
}

.gridHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.gridTitle {
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.gridCount {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: #3b82f6;
  color: white;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.gridSearch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 8px;
  min-width: 280px;
  color: #64748b;
  transition: border-color 0.15s ease;
}

.gridSearch:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.gridSearch input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: 13px;
  color: #e2e8f0;
}

.gridSearch input::placeholder {
  color: #64748b;
}

/* Copro Cards Grid */
.coproGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* Copro Card */
.coproCard {
  background: #131620;
  border: 1px solid rgba(148, 163, 184, 0.06);
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-left: 3px solid transparent;
}

.coproCard:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.cardBorderSuccess { border-left-color: #22c55e; }
.cardBorderWarning { border-left-color: #f59e0b; }
.cardBorderDanger { border-left-color: #ef4444; }

.cardHeader {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cardIcon {
  color: #64748b;
  flex-shrink: 0;
}

.cardName {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
  line-height: 1.3;
}

.cardAddress {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.cardStats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
}

.cardLots {
  color: #94a3b8;
}

.cardSeparator {
  color: #475569;
}

.cardSoldePositive {
  color: #22c55e;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.cardSoldeNegative {
  color: #ef4444;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
}

.cardDetails {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
}

.cardImpayes {
  color: #f87171;
  font-weight: 500;
}

.cardAG {
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cardAlertes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.cardAlerteBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
}

.alerteCritique {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.alerteWarning {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
}

/* Empty state */
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #64748b;
}

.emptyState p {
  margin-top: 16px;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 1400px) {
  .kpisGrid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1200px) {
  .coproGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .kpisGrid {
    grid-template-columns: repeat(2, 1fr);
  }

  .topBar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .kpisGrid {
    grid-template-columns: 1fr;
  }

  .coproGrid {
    grid-template-columns: 1fr;
  }

  .gridHeader {
    flex-direction: column;
    align-items: stretch;
  }

  .gridSearch {
    min-width: auto;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/portefeuille/portefeuille.module.css
git commit -m "feat(portefeuille): rewrite CSS with card grid layout and dark theme"
```

---

### Task 9: Page — Assemblage final

**Files:**
- Modify: `src/app/(dashboard)/portefeuille/page.tsx`

- [ ] **Step 1: Réécrire la page**

Remplacer tout le contenu de `src/app/(dashboard)/portefeuille/page.tsx` :

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { usePortefeuille } from '@/hooks/modules/usePortefeuille';
import { PortefeuilleKpis, PortefeuilleGrid } from '@/components/features/portefeuille';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import styles from './portefeuille.module.css';

export default function PortefeuillePage() {
  const router = useRouter();
  const { filteredCoproprietes, kpis, recherche, setRecherche } = usePortefeuille();

  const totalLots = filteredCoproprietes.reduce((sum, c) => sum + c.nombreLots, 0);

  const handleSelectCopro = (copro: ICoproprietePortefeuille) => {
    setActiveCopro(copro.id as string, copro.nom);
    router.push('/dashboard');
  };

  const handleNewCopro = () => {
    router.push('/onboarding');
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <h1>Mon Portefeuille</h1>
          <p>Vue consolidée de vos {filteredCoproprietes.length} copropriétés · {totalLots} lots</p>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.btnPrimary} onClick={handleNewCopro} type="button">
            <Plus size={18} />
            Nouvelle copropriété
          </button>
        </div>
      </div>

      <PortefeuilleKpis kpis={kpis} />

      <PortefeuilleGrid
        coproprietes={filteredCoproprietes}
        recherche={recherche}
        onRecherche={setRecherche}
        onSelectCopro={handleSelectCopro}
      />
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation complète**

Run: `npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/portefeuille/page.tsx
git commit -m "feat(portefeuille): rewrite page with TopBar, KPIs, and card grid"
```

---

### Task 10: Navigation — Ajouter Portefeuille dans la sidebar

**Files:**
- Modify: `src/lib/config/navigation.ts`

- [ ] **Step 1: Ajouter l'entrée Portefeuille en tête du tableau `MODULES`**

Dans `src/lib/config/navigation.ts`, ajouter l'import `Briefcase` et l'entrée Portefeuille en premier dans le tableau :

Ajouter `Briefcase` aux imports (ligne 1) :

```typescript
import {
  LayoutDashboard, Users, Building2, DollarSign, Wrench,
  FileText, MessageSquare, Scale, Calendar,
  Calculator, Receipt, ArrowLeftRight, FolderOpen, Mail,
  AlertTriangle, BookOpen, ClipboardList, BarChart3, Briefcase,
  type LucideIcon
} from 'lucide-react';
```

Ajouter en premier élément du tableau `MODULES` (avant dashboard) :

```typescript
export const MODULES: ModuleConfig[] = [
  {
    id: 'portefeuille',
    label: 'Portefeuille',
    icon: Briefcase,
    href: '/portefeuille',
    subPages: [],
  },
  {
    id: 'dashboard',
    // ... reste inchangé
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: 0 erreur

- [ ] **Step 3: Commit**

```bash
git add src/lib/config/navigation.ts
git commit -m "feat(nav): add Portefeuille as first sidebar entry"
```

---

### Task 11: Build final + vérification visuelle

**Files:** Aucun nouveau fichier

- [ ] **Step 1: Lancer le build complet**

Run: `npm run build`
Expected: Build successful, 0 erreur

- [ ] **Step 2: Lancer le dev server et vérifier**

Run: `npm run dev`
Vérifier dans le navigateur :
1. Aller sur `http://localhost:3000/portefeuille`
2. Vérifier que les KPIs s'affichent
3. Vérifier que les cartes sont triées par criticité (Domaine de la Forêt en premier)
4. Vérifier qu'une recherche filtre les cartes
5. Cliquer sur une carte → vérifie la redirection vers `/dashboard`
6. Vérifier que "Portefeuille" apparaît dans la sidebar

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat(portefeuille): gestionnaire home page complete — KPIs + card grid + criticality sort"
```
