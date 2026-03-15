# Refonte Budget V2 — Qonto Style

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre l'UI de la page Budgets en style Qonto — TopBar sticky + NavBar tabs + Overview Hero avec donut chart + Projection card + Postes en liste tabulaire avec mini progress bars.

**Architecture:** Remplacer le layout actuel (BudgetHeader avec tabs + BudgetSummaryCards + BudgetChart + BudgetProjection + BudgetPostesGrid + BudgetDepensesTable) par des composants Pennylane/Qonto cohérents avec la refonte compta. La TopBar et NavBar réutilisent le même pattern que la comptabilité. La data layer (hooks, API, types) reste 100% inchangée.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, CSS Modules (valeurs hardcodées preview, pas de Tailwind), Lucide React.

**Référence visuelle:** `.planning/preview-budget-v2.html`

---

## Fichiers

| Action | Fichier | Rôle |
|--------|---------|------|
| Create | `src/components/features/finance/Budget/BudgetTopBar.tsx` | TopBar sticky (titre + year pill + actions) |
| Create | `src/components/features/finance/Budget/BudgetTopBar.module.css` | Styles TopBar |
| Create | `src/components/features/finance/Budget/BudgetNavBar.tsx` | Tabs horizontaux (Fonctionnement/Travaux/ALUR) |
| Create | `src/components/features/finance/Budget/BudgetNavBar.module.css` | Styles NavBar |
| Create | `src/components/features/finance/Budget/BudgetOverviewHero.tsx` | Hero card: montant + stats + donut |
| Create | `src/components/features/finance/Budget/BudgetOverviewHero.module.css` | Styles Hero |
| Create | `src/components/features/finance/Budget/BudgetProjectionCard.tsx` | Projection fin d'exercice avec timeline |
| Create | `src/components/features/finance/Budget/BudgetProjectionCard.module.css` | Styles Projection |
| Create | `src/components/features/finance/Budget/BudgetPostesList.tsx` | Liste tabulaire postes avec mini progress bars |
| Create | `src/components/features/finance/Budget/BudgetPostesList.module.css` | Styles Postes |
| Modify | `src/app/(dashboard)/finance/budgets/page.tsx` | Nouveau layout avec TopBar+NavBar |
| Modify | `src/app/(dashboard)/finance/budgets/budgets.module.css` | Layout vertical (plus de container classique) |
| Modify | `src/features/finance/budgets/list/components/FonctionnementTab.tsx` | Utiliser les nouveaux composants |
| Modify | `src/components/features/finance/Budget/index.ts` | Exporter les nouveaux composants |
| Keep | `BudgetHeader.tsx`, `BudgetSummaryCards.tsx`, `BudgetChart.tsx`, `BudgetProjection.tsx`, `BudgetPostesGrid.tsx` | Gardés pour rétrocompatibilité |

---

## Chunk 1: TopBar + NavBar + Layout

### Task 1: BudgetTopBar

**Files:**
- Create: `src/components/features/finance/Budget/BudgetTopBar.tsx`
- Create: `src/components/features/finance/Budget/BudgetTopBar.module.css`

- [ ] **Step 1: Create BudgetTopBar component**

Composant identique en structure à `ComptaTopBar` mais avec :
- Titre "Budgets" (ou "Budget de fonctionnement" selon tab actif)
- Year pill avec dot vert : "Exercice {year}"
- Bouton Export PDF (btn-icon)
- Bouton "+ Créer un budget" (btn-primary)
- Selector année intégré (remplace le select du BudgetHeader actuel)

Props: `selectedYear, onYearChange, onCreateBudget, onExportPDF`

CSS : copier exactement les valeurs de `ComptaTopBar.module.css` (fond `#161822`, bordures `rgba(148,163,184,0.1)`, etc.)

- [ ] **Step 2: Create CSS Module**
- [ ] **Step 3: Commit**

### Task 2: BudgetNavBar

**Files:**
- Create: `src/components/features/finance/Budget/BudgetNavBar.tsx`
- Create: `src/components/features/finance/Budget/BudgetNavBar.module.css`

- [ ] **Step 1: Create BudgetNavBar component**

3 tabs : Fonctionnement, Travaux, Fonds ALUR.
Props: `activeTab: BudgetTab, onTabChange: (tab: BudgetTab) => void`

CSS : copier exactement les valeurs de `ComptaNavBar.module.css` (fond `#161822`, tabs 13px, active `#3b82f6`)

- [ ] **Step 2: Create CSS Module**
- [ ] **Step 3: Commit**

### Task 3: Refonte layout page.tsx

**Files:**
- Modify: `src/app/(dashboard)/finance/budgets/page.tsx`
- Modify: `src/app/(dashboard)/finance/budgets/budgets.module.css`

- [ ] **Step 1: Rewrite page.tsx**

Remplacer `BudgetHeader` par `BudgetTopBar` + `BudgetNavBar`. Supprimer le container classique, utiliser le même layout vertical que la compta :

```tsx
<div className={styles.page}>
  <BudgetTopBar ... />
  <BudgetNavBar activeTab={activeTab} onTabChange={setActiveTab} />
  <div className={styles.content}>
    {activeTab === 'fonctionnement' && <FonctionnementTab ... />}
    {activeTab === 'travaux' && <TravauxTab ... />}
    {activeTab === 'alur' && <ALURTab ... />}
  </div>
  <BudgetsModals ... />
</div>
```

- [ ] **Step 2: Rewrite CSS**

```css
.page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--highbar-height, 48px));
  overflow: hidden;
}
.content {
  padding: 24px 32px;
  flex: 1;
  overflow-y: auto;
}
```

- [ ] **Step 3: Verify build + Commit**

---

## Chunk 2: Overview Hero + Donut

### Task 4: BudgetOverviewHero

**Files:**
- Create: `src/components/features/finance/Budget/BudgetOverviewHero.tsx`
- Create: `src/components/features/finance/Budget/BudgetOverviewHero.module.css`

- [ ] **Step 1: Create component**

Layout grid 2 colonnes :
- **Gauche** : headline "Budget annuel voté", montant 32px bold, sous-texte ("Approuvé en AG..."), 3 stats (Consommé, Disponible, Postes en alerte) avec mini barres de progression
- **Droite** : Donut chart CSS (conic-gradient) avec centre montrant le % consommé + légende à droite du donut

Props:
```ts
interface BudgetOverviewHeroProps {
  budgetAnnuelVote: number;
  totalConsomme: number;
  budgetRestant: number;
  postesEnAlerte: number;
  postesEnAlerteLabels?: string;
  postesBudget: PosteBudgetData[];
}
```

Donut via CSS `conic-gradient` construit dynamiquement à partir de `postesBudget` (couleurs via `POSTE_COLORS`).

- [ ] **Step 2: Create CSS Module** — valeurs exactes preview V2 (fond `#1a1d2e`, bordures `rgba(148,163,184,0.08)`, radius 12px)
- [ ] **Step 3: Export from index.ts + Commit**

### Task 5: Wire OverviewHero dans FonctionnementTab

**Files:**
- Modify: `src/features/finance/budgets/list/components/FonctionnementTab.tsx`

- [ ] **Step 1: Remplacer BudgetSummaryCards + BudgetChart par BudgetOverviewHero**

```tsx
<BudgetOverviewHero
  budgetAnnuelVote={budgetAnnuelVote}
  totalConsomme={totals.totalConsomme}
  budgetRestant={totals.budgetRestant}
  postesEnAlerte={postesEnAlerte.length}
  postesEnAlerteLabels={postesEnAlerte.map(p => p.label).join(', ')}
  postesBudget={postesBudget}
/>
```

Supprimer les imports `BudgetSummaryCards` et `BudgetChart`.

- [ ] **Step 2: Commit**

---

## Chunk 3: Projection Card + Postes List

### Task 6: BudgetProjectionCard

**Files:**
- Create: `src/components/features/finance/Budget/BudgetProjectionCard.tsx`
- Create: `src/components/features/finance/Budget/BudgetProjectionCard.module.css`

- [ ] **Step 1: Create component**

Card avec :
- Header : titre "Projection fin d'exercice" + badge "✓ Dans le budget" ou "⚠ Dépassement prévu"
- Timeline : barre horizontale (consommé = bleu plein | projection = bleu transparent)
- 4 stats en row : Projection totale, Écart vs budget, Conso mensuelle moy., Fiabilité

Props : même interface que `BudgetProjectionProps` existant.

- [ ] **Step 2: Create CSS Module** — fond `#1a1d2e`, bordure subtile, radius 12px
- [ ] **Step 3: Export + Commit**

### Task 7: BudgetPostesList

**Files:**
- Create: `src/components/features/finance/Budget/BudgetPostesList.tsx`
- Create: `src/components/features/finance/Budget/BudgetPostesList.module.css`

- [ ] **Step 1: Create component**

Liste tabulaire (pas une grille de cards) :
- Header row : Poste | Budget voté | Consommation (mini bar) | % | Reste
- Rows cliquables avec : dot couleur + nom (+ badge alerte si applicable) | montant | mini progress bar inline | pourcentage coloré | reste

Props:
```ts
interface BudgetPostesListProps {
  postesBudget: PosteBudgetData[];
  onSelectPoste: (poste: PosteBudget) => void;
}
```

- [ ] **Step 2: Create CSS Module** — fond `#1a1d2e`, rows avec hover `rgba(148,163,184,0.03)`, mini bars 6px
- [ ] **Step 3: Export + Commit**

### Task 8: Wire dans FonctionnementTab

**Files:**
- Modify: `src/features/finance/budgets/list/components/FonctionnementTab.tsx`

- [ ] **Step 1: Remplacer BudgetProjection + BudgetPostesGrid**

```tsx
<BudgetProjectionCard
  budgetAnnuelVote={budgetAnnuelVote}
  totalConsomme={totals.totalConsomme}
  projectedYearEnd={totals.projectedYearEnd}
  projectedDifference={totals.projectedDifference}
  monthsElapsed={totals.monthsElapsed}
  monthsRemaining={totals.monthsRemaining}
  avgMonthlyConsumption={totals.avgMonthlyConsumption}
  fiabiliteNiveau={totals.fiabiliteNiveau}
/>

<BudgetPostesList
  postesBudget={postesBudget}
  onSelectPoste={onSelectPoste}
/>
```

Supprimer imports `BudgetProjection`, `BudgetPostesGrid`, et le wrapper `chartAndProjection`.

Garder `BudgetsList` et `BudgetAlerts` (au-dessus du Hero) et `BudgetDepensesTable` (en bas).

- [ ] **Step 2: Verify build + Commit**

---

## Chunk 4: Cleanup + Polish

### Task 9: Nettoyer la page et supprimer les anciens wrappers

**Files:**
- Modify: `src/app/(dashboard)/finance/budgets/budgets.module.css`
- Modify: `src/components/features/finance/Budget/index.ts`

- [ ] **Step 1: Nettoyer le CSS page** — supprimer les classes .header, .tabs, .tab, .tabActive qui ne sont plus utilisées dans page.tsx
- [ ] **Step 2: Vérifier les exports index.ts** — ajouter tous les nouveaux composants
- [ ] **Step 3: Verify build + Commit final**

---

## Résumé flow FonctionnementTab après refonte

```
BudgetsList (cards des budgets — conservé)
↓
BudgetAlerts (alertes postes — conservé)
↓
BudgetOverviewHero (hero + donut) ← NOUVEAU
↓
BudgetProjectionCard (timeline + stats) ← NOUVEAU
↓
BudgetPostesList (liste tabulaire) ← NOUVEAU
↓
BudgetDepensesTable (dernières dépenses — conservé)
```
