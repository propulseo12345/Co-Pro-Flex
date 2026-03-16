# Refonte Mouvements Bancaires — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la page Mouvements bancaires en une vue unifiée (suppression onglets, header fusionné avec pills comptes, bandeaux alertes compacts, table unique avec rapprochement intégré + slide-over).

**Architecture:** Remplacement des composants volumiques (AccountCards, StatsCards, SyncSection, AlertsSection, TabsNavigation, MovementsTab, RapprochementTab) par 5 nouveaux composants légers. Le hook existant est adapté (ajout filtre rapprochement, suppression onglets). Chaque composant a son propre CSS Module.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules, Lucide React, clsx

**Spec:** `docs/superpowers/specs/2026-03-16-mouvements-bancaires-refonte-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `src/features/finance/mouvements-bancaires/components/AccountPills.tsx` | 2 pills comptes sélectionnables (courant/travaux) avec solde + mini-stats |
| `src/features/finance/mouvements-bancaires/components/AccountPills.module.css` | Styles pills |
| `src/features/finance/mouvements-bancaires/components/AlertBanners.tsx` | 3 bandeaux compacts (non-cat, non-rapprochés, sync) |
| `src/features/finance/mouvements-bancaires/components/AlertBanners.module.css` | Styles bandeaux |
| `src/features/finance/mouvements-bancaires/components/MovementFilters.tsx` | Barre filtres (search + type + catégorie + rapprochement) |
| `src/features/finance/mouvements-bancaires/components/MovementFilters.module.css` | Styles filtres |
| `src/features/finance/mouvements-bancaires/components/UnifiedMovementsTable.tsx` | Table unique avec toutes les colonnes |
| `src/features/finance/mouvements-bancaires/components/UnifiedMovementsTable.module.css` | Styles table |
| `src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.tsx` | Panel latéral suggestions rapprochement |
| `src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.module.css` | Styles slide-over |

### Modified files
| File | Changes |
|------|---------|
| `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts` | Supprimer ongletActif, ajouter rapprochementFilter + showSlideOver, fix console.error + window.location |
| `src/features/finance/mouvements-bancaires/components/index.ts` | Mettre à jour les exports |
| `src/app/(dashboard)/finance/mouvements-bancaires/page.tsx` | Réécrire avec nouveaux composants |

### Deleted (après migration complète)
Composants obsolètes : `AccountCards`, `StatsCards`, `SyncSection`, `AlertsSection`, `TabsNavigation`, `MovementsTab`, `RapprochementTab`, `PageHeader`, `RapprochementModal`

---

## Chunk 1: Hook + AccountPills

### Task 1: Adapter le hook useMouvementsBancairesPage

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts`

- [ ] **Step 1: Ajouter les nouveaux états et supprimer les obsolètes**

Modifications à appliquer au hook :

```typescript
// SUPPRIMER ces imports et états:
// - OngletActif (import type)
// - ongletActif, setOngletActif (state + return)

// AJOUTER:
import { useRouter } from 'next/navigation';

// Nouveau state (après categorieFilter):
const [rapprochementFilter, setRapprochementFilter] = useState<'tous' | 'rapproche' | 'non_rapproche'>('tous');
const [showSlideOver, setShowSlideOver] = useState(false);

// Dans le router (début du hook):
const router = useRouter();
```

- [ ] **Step 2: Étendre filteredMouvements avec rapprochementFilter**

Remplacer le `filteredMouvements` useMemo :

```typescript
const filteredMouvements = useMemo(() => {
  return mouvements.filter(mouvement => {
    const matchesSearch =
      mouvement.libelle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mouvement.montant.toString().includes(searchTerm) ||
      (mouvement.fournisseur && mouvement.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'TOUS' || mouvement.type === typeFilter;

    const matchesCategorie =
      categorieFilter === 'TOUS' ||
      (categorieFilter === 'CATEGORISE' && mouvement.categorise) ||
      (categorieFilter === 'NON_CATEGORISE' && !mouvement.categorise);

    const isRapproche = isMouvementRapproche(mouvement.id);
    const matchesRapprochement =
      rapprochementFilter === 'tous' ||
      (rapprochementFilter === 'rapproche' && isRapproche) ||
      (rapprochementFilter === 'non_rapproche' && !isRapproche);

    return matchesSearch && matchesType && matchesCategorie && matchesRapprochement;
  });
}, [mouvements, searchTerm, typeFilter, categorieFilter, rapprochementFilter, isMouvementRapproche]);
```

- [ ] **Step 3: Adapter handleOpenRapprochement pour le slide-over**

```typescript
const handleOpenRapprochement = useCallback((mouvement: MouvementBancaire) => {
  setSelectedMouvementRapprochement(mouvement);
  const suggestions = genererSuggestionsRapprochement(mouvement, ecrituresComptables);
  setSuggestionsRapprochement(suggestions);
  setShowSlideOver(true); // Remplace setShowRapprochementModal(true)
}, [ecrituresComptables]);
```

- [ ] **Step 4: Adapter handleRapprocher pour fermer le slide-over**

Remplacer `setShowRapprochementModal(false)` par `setShowSlideOver(false)` dans handleRapprocher (ligne 535).

- [ ] **Step 5: Fix handleNavigateToEntity — router.push au lieu de window.location**

```typescript
const handleNavigateToEntity = useCallback((entite: EntiteLiee) => {
  let url = '';
  switch (entite.type) {
    case 'facture':
      url = `/finance/factures?id=${entite.id}`;
      break;
    case 'appel_fonds':
      url = `/finance/appels-fonds?id=${entite.id}`;
      break;
    case 'coproprietaire':
      url = `/coproprietaires?id=${entite.id}`;
      break;
    case 'fournisseur':
      url = `/maintenance/contrats?fournisseur=${entite.id}`;
      break;
  }
  if (url) router.push(url);
}, [router]);
```

- [ ] **Step 6: Supprimer console.error (lignes 441, 517)**

Remplacer les deux `console.error(...)` par rien (supprimer les lignes). L'erreur est déjà dans `result.error` et peut être gérée par l'UI si nécessaire.

- [ ] **Step 7: Mettre à jour le return du hook**

```typescript
// AJOUTER au return:
rapprochementFilter,
setRapprochementFilter,
showSlideOver,
setShowSlideOver,

// SUPPRIMER du return:
// ongletActif,
// setOngletActif,
// showRapprochementModal,
// setShowRapprochementModal,
```

- [ ] **Step 8: Vérifier build**

Run: `npx next build --no-lint 2>&1 | tail -20`

- [ ] **Step 9: Commit**

```bash
git add src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts
git commit -m "refactor(mouvements): adapt hook — add rapprochementFilter, slideOver, fix router.push"
```

---

### Task 2: Créer AccountPills

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/AccountPills.module.css`
- Create: `src/features/finance/mouvements-bancaires/components/AccountPills.tsx`

- [ ] **Step 1: Créer le CSS Module AccountPills.module.css**

```css
.pillsContainer {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.pill {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  cursor: pointer;
  transition: all var(--transition-base);
  opacity: 0.6;
}

.pill:hover {
  opacity: 0.8;
  border-color: var(--primary);
}

.pillActive {
  opacity: 1;
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--surface));
}

.pillAvatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 700;
  color: white;
  background: var(--border);
  flex-shrink: 0;
}

.pillActive .pillAvatar {
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, white));
}

.pillInfo {
  flex: 1;
  min-width: 0;
}

.pillLabel {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.pillSolde {
  font-size: var(--text-xl);
  font-weight: 700;
  letter-spacing: -0.5px;
}

.pillActive .pillSolde {
  color: var(--primary);
}

.pillStats {
  text-align: right;
  line-height: 1.6;
}

.pillStatEntree {
  font-size: var(--text-xs);
  color: var(--success);
}

.pillStatSortie {
  font-size: var(--text-xs);
  color: var(--danger);
}
```

- [ ] **Step 2: Créer le composant AccountPills.tsx**

```typescript
'use client';

import clsx from 'clsx';
import type { TypeCompte, CompteBancaire } from '../domain/types';
import styles from './AccountPills.module.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

interface AccountPillsProps {
  compteActif: TypeCompte;
  soldeActuel: number;
  totalEntrees: number;
  totalSorties: number;
  compteCourant: CompteBancaire;
  compteTravaux: CompteBancaire;
  onCompteChange: (compte: TypeCompte) => void;
}

export function AccountPills({
  compteActif,
  soldeActuel,
  totalEntrees,
  totalSorties,
  compteCourant,
  compteTravaux,
  onCompteChange,
}: AccountPillsProps) {
  return (
    <div className={styles.pillsContainer}>
      <button
        className={clsx(styles.pill, compteActif === 'courant' && styles.pillActive)}
        onClick={() => onCompteChange('courant')}
        type="button"
      >
        <div className={styles.pillAvatar}>CC</div>
        <div className={styles.pillInfo}>
          <div className={styles.pillLabel}>Compte courant</div>
          <div className={styles.pillSolde}>
            {compteActif === 'courant'
              ? formatCurrency(soldeActuel)
              : formatCurrency(compteCourant.soldeInitial)
            }
          </div>
        </div>
        {compteActif === 'courant' && (
          <div className={styles.pillStats}>
            <div className={styles.pillStatEntree}>↑ {formatCurrency(totalEntrees)}</div>
            <div className={styles.pillStatSortie}>↓ {formatCurrency(totalSorties)}</div>
          </div>
        )}
      </button>

      <button
        className={clsx(styles.pill, compteActif === 'travaux' && styles.pillActive)}
        onClick={() => onCompteChange('travaux')}
        type="button"
      >
        <div className={styles.pillAvatar}>FT</div>
        <div className={styles.pillInfo}>
          <div className={styles.pillLabel}>Fonds de travaux</div>
          <div className={styles.pillSolde}>
            {compteActif === 'travaux'
              ? formatCurrency(soldeActuel)
              : formatCurrency(compteTravaux.soldeInitial)
            }
          </div>
        </div>
        {compteActif === 'travaux' && (
          <div className={styles.pillStats}>
            <div className={styles.pillStatEntree}>↑ {formatCurrency(totalEntrees)}</div>
            <div className={styles.pillStatSortie}>↓ {formatCurrency(totalSorties)}</div>
          </div>
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/AccountPills.tsx src/features/finance/mouvements-bancaires/components/AccountPills.module.css
git commit -m "feat(mouvements): add AccountPills component"
```

---

## Chunk 2: AlertBanners + MovementFilters

### Task 3: Créer AlertBanners

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/AlertBanners.module.css`
- Create: `src/features/finance/mouvements-bancaires/components/AlertBanners.tsx`

- [ ] **Step 1: Créer AlertBanners.module.css**

```css
.bannersContainer {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.banner {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  border: 1px solid transparent;
}

.bannerClickable {
  cursor: pointer;
  transition: all var(--transition-base);
}

.bannerClickable:hover {
  filter: brightness(1.1);
}

.bannerNonCat {
  background: color-mix(in srgb, var(--warning) 8%, transparent);
  border-color: color-mix(in srgb, var(--warning) 15%, transparent);
}

.bannerNonRappr {
  background: color-mix(in srgb, #f0883e 8%, transparent);
  border-color: color-mix(in srgb, #f0883e 15%, transparent);
}

.bannerSync {
  background: var(--surface);
  border-color: var(--border);
}

.bannerIcon {
  font-size: var(--text-base);
  flex-shrink: 0;
}

.bannerLabel {
  font-weight: 600;
}

.bannerNonCat .bannerLabel {
  color: var(--warning);
}

.bannerNonRappr .bannerLabel {
  color: #f0883e;
}

.bannerDetail {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.bannerAction {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--primary);
  font-weight: 500;
}

.syncDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.syncDotOk {
  background: var(--success);
}

.syncDotError {
  background: var(--danger);
}

.syncDotSyncing {
  background: var(--primary);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.syncLabel {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.progressBar {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.progressTrack {
  width: 50px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--success);
  border-radius: 2px;
  transition: width var(--transition-base);
}

.progressLabel {
  font-size: var(--text-xs);
  color: var(--success);
  font-weight: 600;
}
```

- [ ] **Step 2: Créer AlertBanners.tsx**

```typescript
'use client';

import clsx from 'clsx';
import type { StatutConnexionBancaire, StatsNonCategorises, EcartSoldes } from '../domain/types';
import styles from './AlertBanners.module.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

interface AlertBannersProps {
  statsNonCategorises: StatsNonCategorises;
  ecartSoldes: EcartSoldes;
  totalMouvements: number;
  statutConnexion: StatutConnexionBancaire;
  getTempsDepuisDerniereSync: () => string;
  onFilterNonCategorises: () => void;
  onFilterNonRapproches: () => void;
}

export function AlertBanners({
  statsNonCategorises,
  ecartSoldes,
  totalMouvements,
  statutConnexion,
  getTempsDepuisDerniereSync,
  onFilterNonCategorises,
  onFilterNonRapproches,
}: AlertBannersProps) {
  const rapproches = totalMouvements - ecartSoldes.mouvementsNonRapproches;
  const progressPct = totalMouvements > 0 ? (rapproches / totalMouvements) * 100 : 100;
  const isSyncing = statutConnexion.statut === 'en_cours';

  return (
    <div className={styles.bannersContainer}>
      {/* Non catégorisés */}
      <button
        type="button"
        className={clsx(styles.banner, styles.bannerNonCat, styles.bannerClickable)}
        onClick={onFilterNonCategorises}
      >
        <span className={styles.bannerIcon}>⚠</span>
        <span className={styles.bannerLabel}>{statsNonCategorises.total} non catégorisés</span>
        <span className={styles.bannerDetail}>({formatCurrency(statsNonCategorises.montantTotal)})</span>
        <span className={styles.bannerAction}>Filtrer →</span>
      </button>

      {/* Non rapprochés */}
      <button
        type="button"
        className={clsx(styles.banner, styles.bannerNonRappr, styles.bannerClickable)}
        onClick={onFilterNonRapproches}
      >
        <span className={styles.bannerIcon}>⚡</span>
        <span className={styles.bannerLabel}>{ecartSoldes.mouvementsNonRapproches} non rapprochés</span>
        {Math.abs(ecartSoldes.ecart) > 0.01 && (
          <span className={styles.bannerDetail}>(écart {formatCurrency(ecartSoldes.ecart)})</span>
        )}
        <div className={styles.progressBar}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <span className={styles.progressLabel}>{rapproches}/{totalMouvements}</span>
        </div>
      </button>

      {/* Sync */}
      <div className={clsx(styles.banner, styles.bannerSync)}>
        <span className={clsx(
          styles.syncDot,
          isSyncing ? styles.syncDotSyncing
            : statutConnexion.statut === 'erreur' ? styles.syncDotError
            : styles.syncDotOk
        )} />
        <span className={styles.syncLabel}>
          {isSyncing ? 'Synchronisation...' : `Sync ${getTempsDepuisDerniereSync()}`}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/AlertBanners.tsx src/features/finance/mouvements-bancaires/components/AlertBanners.module.css
git commit -m "feat(mouvements): add AlertBanners component"
```

---

### Task 4: Créer MovementFilters

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/MovementFilters.module.css`
- Create: `src/features/finance/mouvements-bancaires/components/MovementFilters.tsx`

- [ ] **Step 1: Créer MovementFilters.module.css**

```css
.filtersContainer {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}

.searchBox {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-main);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.searchBox svg {
  flex-shrink: 0;
  color: var(--text-secondary);
}

.searchInput {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: var(--text-sm);
  outline: none;
}

.searchInput::placeholder {
  color: var(--text-secondary);
}

.filterBtn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
}

.filterBtn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.filterBtnActive {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.filterBtnWarning {
  background: color-mix(in srgb, var(--warning) 12%, transparent);
  border-color: color-mix(in srgb, var(--warning) 30%, transparent);
  color: var(--warning);
}

.filterBtnOrange {
  background: color-mix(in srgb, #f0883e 12%, transparent);
  border-color: color-mix(in srgb, #f0883e 30%, transparent);
  color: #f0883e;
}
```

- [ ] **Step 2: Créer MovementFilters.tsx**

```typescript
'use client';

import { Search } from 'lucide-react';
import clsx from 'clsx';
import type { TypeMouvement } from '../domain/types';
import styles from './MovementFilters.module.css';

interface MovementFiltersProps {
  searchTerm: string;
  typeFilter: 'TOUS' | TypeMouvement;
  categorieFilter: 'TOUS' | 'CATEGORISE' | 'NON_CATEGORISE';
  rapprochementFilter: 'tous' | 'rapproche' | 'non_rapproche';
  totalCount: number;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (filter: 'TOUS' | TypeMouvement) => void;
  onCategorieFilterChange: (filter: 'TOUS' | 'CATEGORISE' | 'NON_CATEGORISE') => void;
  onRapprochementFilterChange: (filter: 'tous' | 'rapproche' | 'non_rapproche') => void;
}

export function MovementFilters({
  searchTerm,
  typeFilter,
  categorieFilter,
  rapprochementFilter,
  totalCount,
  onSearchChange,
  onTypeFilterChange,
  onCategorieFilterChange,
  onRapprochementFilterChange,
}: MovementFiltersProps) {
  return (
    <div className={styles.filtersContainer}>
      <div className={styles.searchBox}>
        <Search size={16} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Rechercher par libellé, montant, fournisseur..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <button
        type="button"
        className={clsx(styles.filterBtn, typeFilter === 'TOUS' && categorieFilter === 'TOUS' && rapprochementFilter === 'tous' && styles.filterBtnActive)}
        onClick={() => {
          onTypeFilterChange('TOUS');
          onCategorieFilterChange('TOUS');
          onRapprochementFilterChange('tous');
        }}
      >
        Tous ({totalCount})
      </button>

      <button
        type="button"
        className={clsx(styles.filterBtn, typeFilter === 'ENTREE' && styles.filterBtnActive)}
        onClick={() => onTypeFilterChange(typeFilter === 'ENTREE' ? 'TOUS' : 'ENTREE')}
      >
        ↓ Entrées
      </button>

      <button
        type="button"
        className={clsx(styles.filterBtn, typeFilter === 'SORTIE' && styles.filterBtnActive)}
        onClick={() => onTypeFilterChange(typeFilter === 'SORTIE' ? 'TOUS' : 'SORTIE')}
      >
        ↑ Sorties
      </button>

      <button
        type="button"
        className={clsx(
          styles.filterBtn,
          categorieFilter === 'NON_CATEGORISE' && styles.filterBtnWarning
        )}
        onClick={() => onCategorieFilterChange(categorieFilter === 'NON_CATEGORISE' ? 'TOUS' : 'NON_CATEGORISE')}
      >
        ⚠ Non cat.
      </button>

      <button
        type="button"
        className={clsx(
          styles.filterBtn,
          rapprochementFilter === 'non_rapproche' && styles.filterBtnOrange
        )}
        onClick={() => onRapprochementFilterChange(rapprochementFilter === 'non_rapproche' ? 'tous' : 'non_rapproche')}
      >
        ○ Non rappr.
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/MovementFilters.tsx src/features/finance/mouvements-bancaires/components/MovementFilters.module.css
git commit -m "feat(mouvements): add MovementFilters component"
```

---

## Chunk 3: UnifiedMovementsTable + RapprochementSlideOver

### Task 5: Créer UnifiedMovementsTable

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/UnifiedMovementsTable.module.css`
- Create: `src/features/finance/mouvements-bancaires/components/UnifiedMovementsTable.tsx`

- [ ] **Step 1: Créer UnifiedMovementsTable.module.css**

```css
.tableWrapper {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
  transition: grid-template-columns 0.3s ease;
}

.tableWrapperWithPanel {
  grid-template-columns: 1fr 280px;
}

.tableContainer {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table thead tr {
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table th,
.table td {
  padding: var(--space-sm) var(--space-sm);
  text-align: left;
}

.table tbody tr {
  border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
  transition: background var(--transition-base);
}

.table tbody tr:hover {
  background: color-mix(in srgb, var(--primary) 4%, transparent);
}

.rowNonCategorise {
  background: color-mix(in srgb, var(--warning) 4%, transparent);
}

.rowNonRapproche {
  background: color-mix(in srgb, #f0883e 3%, transparent);
}

.rowSelected {
  background: color-mix(in srgb, var(--primary) 8%, transparent) !important;
  border-color: color-mix(in srgb, var(--primary) 30%, transparent);
}

.textRight {
  text-align: right;
}

.statusDot {
  font-size: var(--text-base);
  line-height: 1;
}

.statusRapproche {
  color: var(--success);
}

.statusNonRapproche {
  color: #f0883e;
}

.dateCell {
  color: var(--text-secondary);
  white-space: nowrap;
}

.montantEntree {
  color: var(--success);
  font-weight: 600;
}

.montantSortie {
  color: var(--danger);
  font-weight: 600;
}

.soldeCell {
  color: var(--text-secondary);
}

.entityBadge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.entityAppel {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.entityFournisseur {
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  color: var(--warning);
}

.entityCopro {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
}

.categorieBadge {
  font-size: var(--text-xs);
}

.categoriseOk {
  color: var(--success);
}

.categoriseNo {
  color: var(--warning);
}

.rapprochementBadge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  background: color-mix(in srgb, var(--success) 8%, transparent);
  color: var(--success);
}

.rapprochementEmpty {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.actionBtn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  padding: 2px 4px;
  transition: opacity var(--transition-base);
}

.actionBtn:hover {
  opacity: 0.8;
}

.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-3xl);
  color: var(--text-secondary);
  gap: var(--space-md);
}
```

- [ ] **Step 2: Créer UnifiedMovementsTable.tsx**

```typescript
'use client';

import { CreditCard } from 'lucide-react';
import clsx from 'clsx';
import { TruncatedText } from '@/components/ui';
import type { MouvementBancaire } from '../domain/types';
import styles from './UnifiedMovementsTable.module.css';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

interface UnifiedMovementsTableProps {
  mouvements: MouvementBancaire[];
  selectedMouvementId: string | null;
  showPanel: boolean;
  isMouvementRapproche: (id: string) => boolean;
  getEcritureRapprochee: (id: string) => { piece: string } | undefined;
  onCategoriserClick: (mouvement: MouvementBancaire) => void;
  onRapprocherClick: (mouvement: MouvementBancaire) => void;
  onOpenEntityDetail: (mouvement: MouvementBancaire) => void;
  children?: React.ReactNode; // Slot for slide-over panel
}

export function UnifiedMovementsTable({
  mouvements,
  selectedMouvementId,
  showPanel,
  isMouvementRapproche,
  getEcritureRapprochee,
  onCategoriserClick,
  onRapprocherClick,
  onOpenEntityDetail,
  children,
}: UnifiedMovementsTableProps) {
  return (
    <div className={clsx(styles.tableWrapper, showPanel && styles.tableWrapperWithPanel)}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>Date</th>
              <th>Libellé</th>
              <th>Entité</th>
              <th className={styles.textRight}>Montant</th>
              <th className={styles.textRight}>Solde</th>
              <th>Catégorie</th>
              <th>Rapproch.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mouvements.map((mvt) => {
              const rapproche = isMouvementRapproche(mvt.id);
              const ecriture = getEcritureRapprochee(mvt.id);

              return (
                <tr
                  key={mvt.id}
                  className={clsx(
                    !mvt.categorise && styles.rowNonCategorise,
                    !rapproche && mvt.categorise && styles.rowNonRapproche,
                    selectedMouvementId === mvt.id && styles.rowSelected
                  )}
                >
                  <td>
                    <span className={clsx(styles.statusDot, rapproche ? styles.statusRapproche : styles.statusNonRapproche)}>
                      {rapproche ? '●' : '○'}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(mvt.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td>
                    {mvt.entiteLiee ? (
                      <button
                        className={styles.actionBtn}
                        onClick={() => onOpenEntityDetail(mvt)}
                        style={{ fontWeight: 'normal', color: 'var(--text-main)' }}
                      >
                        <TruncatedText text={mvt.libelle} maxWidth={220} tooltipPosition="bottom" />
                      </button>
                    ) : (
                      <TruncatedText text={mvt.libelle} maxWidth={220} tooltipPosition="bottom" />
                    )}
                  </td>
                  <td>
                    {mvt.entiteLiee && (
                      <span className={clsx(
                        styles.entityBadge,
                        mvt.entiteLiee.type === 'appel_fonds' && styles.entityAppel,
                        mvt.entiteLiee.type === 'fournisseur' && styles.entityFournisseur,
                        (mvt.entiteLiee.type === 'coproprietaire') && styles.entityCopro,
                      )}>
                        {mvt.entiteLiee.type === 'appel_fonds' && '📄'}
                        {mvt.entiteLiee.type === 'fournisseur' && '🏢'}
                        {mvt.entiteLiee.type === 'coproprietaire' && '👤'}
                        {mvt.entiteLiee.type === 'facture' && '📄'}
                        {' '}{mvt.entiteLiee.reference || mvt.entiteLiee.nom}
                      </span>
                    )}
                  </td>
                  <td className={styles.textRight}>
                    <span className={mvt.type === 'ENTREE' ? styles.montantEntree : styles.montantSortie}>
                      {mvt.type === 'ENTREE' ? '+' : ''}{formatCurrency(mvt.montant)}
                    </span>
                  </td>
                  <td className={clsx(styles.textRight, styles.soldeCell)}>
                    {formatCurrency(mvt.solde)}
                  </td>
                  <td>
                    <span className={clsx(styles.categorieBadge, mvt.categorise ? styles.categoriseOk : styles.categoriseNo)}>
                      {mvt.categorise
                        ? `✓ ${mvt.compteComptable?.split(' - ')[0] || ''}`
                        : '⚠ Non cat.'
                      }
                    </span>
                  </td>
                  <td>
                    {ecriture ? (
                      <span className={styles.rapprochementBadge}>{ecriture.piece}</span>
                    ) : (
                      <span className={styles.rapprochementEmpty}>—</span>
                    )}
                  </td>
                  <td>
                    {!mvt.categorise && (
                      <button className={styles.actionBtn} onClick={() => onCategoriserClick(mvt)}>
                        Catégoriser
                      </button>
                    )}
                    {mvt.categorise && !rapproche && (
                      <button className={styles.actionBtn} onClick={() => onRapprocherClick(mvt)}>
                        Rapprocher
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {mouvements.length === 0 && (
          <div className={styles.emptyState}>
            <CreditCard size={48} />
            <p>Aucun mouvement trouvé</p>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/UnifiedMovementsTable.tsx src/features/finance/mouvements-bancaires/components/UnifiedMovementsTable.module.css
git commit -m "feat(mouvements): add UnifiedMovementsTable component"
```

---

### Task 6: Créer RapprochementSlideOver

**Files:**
- Create: `src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.module.css`
- Create: `src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.tsx`

- [ ] **Step 1: Créer RapprochementSlideOver.module.css**

```css
.panel {
  background: var(--surface);
  border: 1.5px solid color-mix(in srgb, var(--primary) 30%, var(--border));
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
}

.panelHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.panelTitle {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--primary);
}

.closeBtn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-base);
  padding: 2px;
}

.closeBtn:hover {
  color: var(--text-main);
}

.mouvementRecap {
  background: var(--bg-main);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-md);
}

.recapLabel {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-xs);
}

.recapLibelle {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-main);
}

.recapFooter {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-sm);
}

.recapMontant {
  font-size: var(--text-lg);
  font-weight: 700;
}

.recapMontantEntree {
  color: var(--success);
}

.recapMontantSortie {
  color: var(--danger);
}

.recapDate {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  align-self: flex-end;
}

.suggestionsHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.suggestionsTitle {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestionCard {
  background: var(--bg-main);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin-bottom: var(--space-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.suggestionCard:hover {
  border-color: var(--primary);
}

.suggestionCardHigh {
  border-color: color-mix(in srgb, var(--success) 40%, var(--border));
}

.suggestionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
}

.suggestionPiece {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-main);
}

.confidenceBadge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: var(--text-xs);
  font-weight: 700;
}

.confidenceHigh {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}

.confidenceMedium {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
}

.confidenceLow {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
}

.suggestionLibelle {
  font-size: var(--text-sm);
  color: var(--text-main);
  margin-bottom: 2px;
}

.suggestionMeta {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.suggestionFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ecartLabel {
  font-size: var(--text-xs);
  font-weight: 600;
}

.ecartOk {
  color: var(--success);
}

.ecartWarning {
  color: var(--warning);
}

.rapprocherBtn {
  background: var(--primary);
  color: white;
  border: none;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-base);
}

.rapprocherBtn:hover {
  opacity: 0.9;
}

.rapprocherBtnSecondary {
  background: var(--surface);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.manualSection {
  margin-top: auto;
  padding-top: var(--space-md);
  border-top: 1px solid var(--border);
}

.manualBtn {
  width: 100%;
  background: transparent;
  color: var(--primary);
  border: 1px dashed color-mix(in srgb, var(--primary) 40%, transparent);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.manualBtn:hover {
  background: color-mix(in srgb, var(--primary) 5%, transparent);
}
```

- [ ] **Step 2: Créer RapprochementSlideOver.tsx**

```typescript
'use client';

import clsx from 'clsx';
import type { MouvementBancaire, EcritureComptable, SuggestionRapprochement } from '../domain/types';
import styles from './RapprochementSlideOver.module.css';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

function getConfidenceLabel(confiance: string): string {
  if (confiance === 'haute') return '98%';
  if (confiance === 'moyenne') return '45%';
  return '<30%';
}

interface RapprochementSlideOverProps {
  mouvement: MouvementBancaire;
  suggestions: SuggestionRapprochement[];
  ecrituresComptables: EcritureComptable[];
  onRapprocher: (ecritureId: string) => void;
  onClose: () => void;
}

export function RapprochementSlideOver({
  mouvement,
  suggestions,
  ecrituresComptables,
  onRapprocher,
  onClose,
}: RapprochementSlideOverProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>⚡ Rapprocher</span>
        <button className={styles.closeBtn} onClick={onClose} type="button">✕</button>
      </div>

      <div className={styles.mouvementRecap}>
        <div className={styles.recapLabel}>Mouvement</div>
        <div className={styles.recapLibelle}>{mouvement.libelle}</div>
        <div className={styles.recapFooter}>
          <span className={clsx(
            styles.recapMontant,
            mouvement.type === 'ENTREE' ? styles.recapMontantEntree : styles.recapMontantSortie
          )}>
            {mouvement.type === 'ENTREE' ? '+' : ''}{formatCurrency(mouvement.montant)}
          </span>
          <span className={styles.recapDate}>
            {new Date(mouvement.date).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      <div className={styles.suggestionsHeader}>
        <span className={styles.suggestionsTitle}>Écritures suggérées</span>
      </div>

      {suggestions.map((suggestion) => {
        const ecriture = ecrituresComptables.find(e => e.id === suggestion.ecritureId);
        if (!ecriture) return null;

        return (
          <div
            key={suggestion.ecritureId}
            className={clsx(
              styles.suggestionCard,
              suggestion.confiance === 'haute' && styles.suggestionCardHigh
            )}
          >
            <div className={styles.suggestionHeader}>
              <span className={styles.suggestionPiece}>{ecriture.piece}</span>
              <span className={clsx(
                styles.confidenceBadge,
                suggestion.confiance === 'haute' && styles.confidenceHigh,
                suggestion.confiance === 'moyenne' && styles.confidenceMedium,
                suggestion.confiance === 'basse' && styles.confidenceLow,
              )}>
                {getConfidenceLabel(suggestion.confiance)}
              </span>
            </div>
            <div className={styles.suggestionLibelle}>{ecriture.libelle}</div>
            <div className={styles.suggestionMeta}>
              {ecriture.credit > 0 ? 'Crédit' : 'Débit'} {formatCurrency(ecriture.credit > 0 ? ecriture.credit : ecriture.debit)} · {ecriture.compte} · {ecriture.journal}
            </div>
            <div className={styles.suggestionFooter}>
              <span className={clsx(
                styles.ecartLabel,
                Math.abs(suggestion.ecart) < 0.01 ? styles.ecartOk : styles.ecartWarning
              )}>
                Écart: {formatCurrency(suggestion.ecart)}
              </span>
              <button
                className={clsx(
                  styles.rapprocherBtn,
                  suggestion.confiance !== 'haute' && styles.rapprocherBtnSecondary
                )}
                onClick={() => onRapprocher(suggestion.ecritureId)}
                type="button"
              >
                Rapprocher
              </button>
            </div>
          </div>
        );
      })}

      {suggestions.length === 0 && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: 'var(--space-md)' }}>
          Aucune écriture suggérée pour ce mouvement.
        </div>
      )}

      <div className={styles.manualSection}>
        <button className={styles.manualBtn} type="button">
          + Saisie manuelle d&apos;écriture
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.tsx src/features/finance/mouvements-bancaires/components/RapprochementSlideOver.module.css
git commit -m "feat(mouvements): add RapprochementSlideOver component"
```

---

## Chunk 4: Assemblage page + nettoyage

### Task 7: Mettre à jour les exports et réécrire la page

**Files:**
- Modify: `src/features/finance/mouvements-bancaires/components/index.ts`
- Modify: `src/app/(dashboard)/finance/mouvements-bancaires/page.tsx`

- [ ] **Step 1: Mettre à jour index.ts**

Remplacer le contenu de `src/features/finance/mouvements-bancaires/components/index.ts` :

```typescript
// New components
export { AccountPills } from './AccountPills';
export { AlertBanners } from './AlertBanners';
export { MovementFilters } from './MovementFilters';
export { UnifiedMovementsTable } from './UnifiedMovementsTable';
export { RapprochementSlideOver } from './RapprochementSlideOver';

// Conserved components
export { CategorisationModal } from './CategorisationModal';
export { EntityDetailModal } from './EntityDetailModal';
export { ImportModal } from './ImportModal';
export { NewMovementsNotification } from './NewMovementsNotification';
```

- [ ] **Step 2: Réécrire page.tsx**

Remplacer le contenu de `src/app/(dashboard)/finance/mouvements-bancaires/page.tsx` :

```typescript
'use client';

import { Download, Upload, RefreshCw } from 'lucide-react';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import { useMouvementsBancairesPage } from '../../../../features/finance/mouvements-bancaires/hooks';
import {
  AccountPills,
  AlertBanners,
  MovementFilters,
  UnifiedMovementsTable,
  RapprochementSlideOver,
  CategorisationModal,
  EntityDetailModal,
  ImportModal,
  NewMovementsNotification,
} from '../../../../features/finance/mouvements-bancaires/components';

export default function MouvementsBancairesPage() {
  const hook = useMouvementsBancairesPage();
  const isSyncing = hook.statutConnexion.statut === 'en_cours';

  const handleFilterNonCategorises = () => {
    hook.setCategorieFilter('NON_CATEGORISE');
    hook.setTypeFilter('TOUS');
    hook.setRapprochementFilter('tous');
  };

  const handleFilterNonRapproches = () => {
    hook.setRapprochementFilter('non_rapproche');
    hook.setTypeFilter('TOUS');
    hook.setCategorieFilter('TOUS');
  };

  return (
    <div>
      <FinanceTopBar
        title="Mouvements bancaires"
        subtitle="Suivi en temps réel de vos comptes bancaires"
        actions={
          <>
            <button className={topBarStyles.btnGhost} onClick={hook.downloadRIB}>
              <Download size={15} />
              RIB
            </button>
            <button className={topBarStyles.btnGhost} onClick={() => hook.setShowImportModal(true)}>
              <Upload size={15} />
              Import
            </button>
            <button
              className={topBarStyles.btnGhost}
              onClick={hook.handleRefresh}
              disabled={hook.isRefreshing || isSyncing}
            >
              <RefreshCw size={15} className={hook.isRefreshing ? topBarStyles.spinning : undefined} />
              {hook.isRefreshing ? 'Sync...' : 'Synchroniser'}
            </button>
          </>
        }
      />

      <AccountPills
        compteActif={hook.compteActif}
        soldeActuel={hook.soldeActuel}
        totalEntrees={hook.totalEntrees}
        totalSorties={hook.totalSorties}
        compteCourant={hook.compteCourant}
        compteTravaux={hook.compteTravaux}
        onCompteChange={hook.setCompteActif}
      />

      {hook.alerteNouveauxMouvements && (
        <NewMovementsNotification
          count={hook.alerteNouveauxMouvements}
          onDismiss={() => hook.setAlerteNouveauxMouvements(null)}
        />
      )}

      <AlertBanners
        statsNonCategorises={hook.statsNonCategorises}
        ecartSoldes={hook.ecartSoldes}
        totalMouvements={hook.mouvements.length}
        statutConnexion={hook.statutConnexion}
        getTempsDepuisDerniereSync={hook.getTempsDepuisDerniereSync}
        onFilterNonCategorises={handleFilterNonCategorises}
        onFilterNonRapproches={handleFilterNonRapproches}
      />

      <MovementFilters
        searchTerm={hook.searchTerm}
        typeFilter={hook.typeFilter}
        categorieFilter={hook.categorieFilter}
        rapprochementFilter={hook.rapprochementFilter}
        totalCount={hook.mouvements.length}
        onSearchChange={hook.setSearchTerm}
        onTypeFilterChange={hook.setTypeFilter}
        onCategorieFilterChange={hook.setCategorieFilter}
        onRapprochementFilterChange={hook.setRapprochementFilter}
      />

      <UnifiedMovementsTable
        mouvements={hook.filteredMouvements}
        selectedMouvementId={hook.selectedMouvementRapprochement?.id ?? null}
        showPanel={hook.showSlideOver}
        isMouvementRapproche={hook.isMouvementRapproche}
        getEcritureRapprochee={hook.getEcritureRapprochee}
        onCategoriserClick={hook.handleCategoriserClick}
        onRapprocherClick={hook.handleOpenRapprochement}
        onOpenEntityDetail={hook.handleOpenEntityDetail}
      >
        {hook.showSlideOver && hook.selectedMouvementRapprochement && (
          <RapprochementSlideOver
            mouvement={hook.selectedMouvementRapprochement}
            suggestions={hook.suggestionsRapprochement}
            ecrituresComptables={hook.ecrituresComptables}
            onRapprocher={hook.handleRapprocher}
            onClose={() => hook.setShowSlideOver(false)}
          />
        )}
      </UnifiedMovementsTable>

      <CategorisationModal
        isOpen={hook.showCategorieModal}
        selectedMouvement={hook.selectedMouvement}
        suggestions={hook.suggestions}
        selectedSuggestion={hook.selectedSuggestion}
        selectedCategorie={hook.selectedCategorie}
        selectedCompte={hook.selectedCompte}
        onClose={() => hook.setShowCategorieModal(false)}
        onApplySuggestion={hook.handleApplySuggestion}
        onCategorieChange={hook.handleCategorieChange}
        onCompteChange={hook.handleCompteChange}
        onSave={hook.handleSaveCategorie}
      />

      <EntityDetailModal
        isOpen={hook.showDetailModal}
        selectedEntite={hook.selectedEntite}
        onClose={() => hook.setShowDetailModal(false)}
        onNavigate={hook.handleNavigateToEntity}
      />

      <ImportModal
        isOpen={hook.showImportModal}
        importType={hook.importType}
        importFile={hook.importFile}
        isImporting={hook.isImporting}
        onClose={() => hook.setShowImportModal(false)}
        onImportTypeChange={hook.setImportType}
        onFileChange={hook.setImportFile}
        onImport={hook.handleImportFile}
      />
    </div>
  );
}
```

- [ ] **Step 3: Vérifier build**

Run: `npx next build --no-lint 2>&1 | tail -30`
Expected: Build success (ou warnings mineurs liés aux pages non touchées)

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/mouvements-bancaires/components/index.ts src/app/(dashboard)/finance/mouvements-bancaires/page.tsx
git commit -m "feat(mouvements): unified page — assemble new components, remove tabs"
```

---

### Task 8: Supprimer les composants obsolètes

**Files:**
- Delete: 8 composants obsolètes
- Modify: `src/app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css` (garder pour composants conservés)

- [ ] **Step 1: Supprimer les fichiers obsolètes**

```bash
rm src/features/finance/mouvements-bancaires/components/AccountCards.tsx
rm src/features/finance/mouvements-bancaires/components/StatsCards.tsx
rm src/features/finance/mouvements-bancaires/components/SyncSection.tsx
rm src/features/finance/mouvements-bancaires/components/AlertsSection.tsx
rm src/features/finance/mouvements-bancaires/components/TabsNavigation.tsx
rm src/features/finance/mouvements-bancaires/components/MovementsTab.tsx
rm src/features/finance/mouvements-bancaires/components/RapprochementTab.tsx
rm src/features/finance/mouvements-bancaires/components/PageHeader.tsx
rm src/features/finance/mouvements-bancaires/components/RapprochementModal.tsx
```

- [ ] **Step 2: Supprimer le type OngletActif s'il n'est plus utilisé**

Vérifier dans `domain/types.ts` si `OngletActif` est utilisé ailleurs. Si non, supprimer la ligne :
```typescript
export type OngletActif = 'mouvements' | 'rapprochement';
```

- [ ] **Step 3: Vérifier build**

Run: `npx next build --no-lint 2>&1 | tail -30`
Expected: Build success

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(mouvements): remove obsolete components — AccountCards, StatsCards, SyncSection, AlertsSection, TabsNavigation, MovementsTab, RapprochementTab, PageHeader, RapprochementModal"
```

---

### Task 9: Vérification finale + polish

- [ ] **Step 1: Lancer le dev server et vérifier visuellement**

Run: `npx next dev`

Vérifier dans le navigateur `/finance/mouvements-bancaires` :
- [ ] Header avec FinanceTopBar + actions
- [ ] AccountPills : 2 pills, switch fonctionne
- [ ] AlertBanners : 3 bandeaux, clic active les filtres
- [ ] MovementFilters : search + boutons filtres
- [ ] Table : toutes les colonnes, highlight lignes
- [ ] SlideOver : s'ouvre au clic "Rapprocher", suggestions affichées
- [ ] Modales conservées : CategorisationModal, EntityDetailModal, ImportModal
- [ ] Dark theme : pas de blanc qui flash

- [ ] **Step 2: Fix éventuels CSS**

Ajuster si nécessaire les spacing, couleurs, responsive.

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat(mouvements): refonte UI complète — vue unifiée, pills comptes, bandeaux alertes, table rapprochement intégré"
```
