# Refonte Factures — Design Spec

## Contexte

Page Factures fournisseurs de CoProFlex (gestion copropriété). La page actuelle est fonctionnelle (header, KPIs, filtres, table triable, 7 modales) mais n'a pas reçu la refonte visuelle v2 ni d'amélioration UX.

## Décisions de design

- **Layout principal** : Kanban par statut (par défaut) + Table enrichie (toggle)
- **Inspirations** : Qonto (KPIs, table), Tiime/Trello (kanban), Pennylane (dark theme)
- **Style** : dark theme `#1a1d2e`, cohérent avec compta/budgets/appels-fonds v2

## Architecture de la page

### Header

```
┌──────────────────────────────────────────────────────────┐
│ Factures fournisseurs                                     │
│ 47 factures · 12 450 € payé · 4 200 € en retard         │
│                        [Table | Kanban]  [Export] [+ New] │
└──────────────────────────────────────────────────────────┘
```

- Titre + KPIs inline (pas de KPI strip séparé — intégré au header)
- Toggle vue : `Table` / `Kanban` (Kanban actif par défaut)
- Bouton Export (CSV) + bouton Nouvelle facture

#### KPI inline — mapping exact

| Label affiché | Source `FacturesKPIData` | Calcul |
|---------------|-------------------------|--------|
| `47 factures` | `nombreFactures` | Déjà existant |
| `12 450 € payé` | **nouveau champ** `montantPaye` | `totalMontant - totalAPayer` (à ajouter dans `calculerKPIFactures`) |
| `4 200 € en retard` | `montantEchu` | Déjà existant |

### Vue Kanban (défaut)

4 colonnes fixes. **"En retard" est prioritaire** : une facture en retard apparaît toujours dans la colonne "En retard", quel que soit son statut réel.

#### Mapping StatutFacture → Colonne Kanban

| Colonne Kanban | Couleur | Statuts source (`StatutFacture`) | Condition |
|----------------|---------|----------------------------------|-----------|
| **En retard** | `#ef4444` | Tout sauf `PAYEE` | `isFactureEnRetard(facture) === true` (prioritaire) |
| **En attente** | `#3b82f6` | `BROUILLON` + `A_VALIDER` + `VALIDEE` | Non en retard |
| **A payer** | `#f59e0b` | `A_PAYER` | Non en retard |
| **Payées** | `#22c55e` | `PAYEE` | Toujours (jamais en retard par définition) |

**Règle de priorité** : `isFactureEnRetard()` est évalué en premier. Si `true`, la facture va dans "En retard" même si son statut est `A_PAYER` ou `VALIDEE`.

#### Documents AVOIR dans le Kanban

Les avoirs (`typeDocument === 'AVOIR'`) sont **exclus du Kanban**. Ils n'ont pas de workflow de paiement et ne correspondent pas au concept de pipeline. Ils restent visibles uniquement en vue Table avec un badge "Avoir" distinct.

Chaque colonne :
- Header : dot couleur + label + compteur (badge) + total euros
- Cards scrollables

#### Card facture

```
┌─────────────────────────────┐
│ ENGIE Energie      2 340 € │  ← fournisseur + montant TTC
│ FAC-2026-0042               │  ← référence
│ ⚠ 15j retard      Énergie  │  ← alerte/date + poste budgétaire
└─────────────────────────────┘
```

- Fond `#131620`, border `rgba(148,163,184,0.06)`, radius `8px`
- Cards en retard : `border-left: 3px solid #ef4444`
- Cards payées : `opacity: 0.7`
- Hover : `border-color: rgba(59,130,246,0.3)`
- **Clic** : ouvre `ViewModal` (détail lecture seule, qui donne accès aux actions Payer/Catégoriser/Editer)

### Vue Table

Activée via le toggle. Layout classique enrichi :

#### Barre de filtres
- Champ recherche (fournisseur, référence, montant)
- Chips statiques par poste budgétaire : liste issue de `PosteBudget` (type existant)
- **Note** : le champ `posteBudgetaire` sur les factures n'est renseigné qu'après catégorisation comptable. Les chips filtrent sur ce champ quand il existe, sinon la facture n'apparaît dans aucun filtre poste (visible seulement via "Tous")

#### Table

| Fournisseur | Réf. | Date | Échéance | Poste | Montant TTC | Statut | Actions |
|-------------|------|------|----------|-------|-------------|--------|---------|

- Colonne Fournisseur : avatar (initiales + couleur) + nom + SIRET/contrat
- Colonne Échéance : rouge si dépassée
- Colonne Poste : badge bleu (ou vide si non catégorisée)
- Colonne Statut : badge coloré (En retard/A payer/En attente/Payée/Avoir)
- Actions inline au hover : Voir, Payer/Catégoriser, Menu (⋯)
- Table triable par clic sur headers
- **Les avoirs** sont visibles en Table avec un badge "Avoir" violet

### Modales

Les 7 modales existantes sont conservées avec refonte CSS dark theme :

1. **NewFactureModal** — création facture (formulaire)
2. **ViewModal** — détail facture/avoir lecture seule
3. **EditModal** — édition facture
4. **PaymentModal** — enregistrer un paiement (sélection compte, confirmation)
5. **AccountingModal** — catégorisation comptable (poste budgétaire, compte)
6. **DeleteModal** — confirmation suppression
7. **AvoirModal** — création avoir

Refonte CSS : fond `#1a1d2e`, bordures subtiles, boutons cohérents v2.

## Composants

### Nouveau dossier : `src/features/finance/factures/`

Tous les nouveaux composants et styles co-localisés dans ce dossier (pattern v2, comme `appels-fonds/`) :

```
src/features/finance/factures/
├── components/
│   ├── FacturesPageHeader.tsx
│   ├── FacturesPageHeader.module.css
│   ├── FacturesViewToggle.tsx
│   ├── FacturesViewToggle.module.css
│   ├── FacturesKanbanView.tsx
│   ├── FacturesKanbanView.module.css
│   ├── FacturesKanbanColumn.tsx
│   ├── FacturesKanbanCard.tsx
│   ├── FacturesTableView.tsx
│   ├── FacturesTableView.module.css
│   └── index.ts
├── hooks/
│   └── useFacturesPageV2.ts
├── types.ts          ← re-export depuis l'ancien + nouveaux types Kanban
└── index.ts
```

### Composants conservés in-place (refonte CSS uniquement)

Restent dans `src/components/features/finance/Factures/` :
- `modals/` (7 modales) — seul le CSS est mis à jour
- `types.ts` — reste la source de vérité pour `Facture`, `StatutFacture`, `isFactureEnRetard`, `FacturesKPIData`
- `utils.ts` — utilitaires de formatage
- `PJ/`, `PosteBudgetSelector/`, `StatutBadge/`, `StatutSelect/`, `StatutWorkflow/` — sous-composants utilisés par les modales

### Hook

**Nouveau hook `useFacturesPageV2()`** dans `src/features/finance/factures/hooks/` qui :
- Importe et compose `useFacturesPage()` (hook existant inchangé)
- Ajoute : `viewMode: 'kanban' | 'table'` + `setViewMode`
- Ajoute : `kanbanColumns: KanbanColumn[]` — factures groupées selon le mapping statut→colonne (voir section Kanban), dérivé de `filteredFactures` **en excluant le filtre statut** (le Kanban remplace ce filtre par sa structure en colonnes)
- Ajoute : `montantPaye: number` — pour le KPI header

Ce pattern de composition évite de modifier le hook existant et ses imports.

## Styles

CSS co-localisés avec les composants (voir arborescence ci-dessus).

Palette dark theme cohérente :
- Fond colonnes : `#1a1d2e`
- Fond cards : `#131620`
- Bordures : `rgba(148, 163, 184, 0.08)`
- Labels : `#64748b`
- Valeurs : `#e2e8f0`
- `font-variant-numeric: tabular-nums` pour tous les montants

## Migration

1. Créer `src/features/finance/factures/` avec les nouveaux composants
2. Créer `useFacturesPageV2()` qui compose l'ancien hook
3. Rewire `src/app/(dashboard)/finance/factures/page.tsx` pour importer depuis `@/features/finance/factures`
4. Supprimer l'ancien CSS `factures.module.css` de la route (remplacé par les CSS co-localisés)
5. Refonte CSS des modales dans `src/components/features/finance/Factures/modals/` (dark theme)
6. **Les composants existants restent en place** — pas de déplacement, pas de risque de casse d'imports

## Hors scope

- Drag & drop entre colonnes Kanban (pas de réordonnancement)
- Notifications temps réel
- Intégration OCR/scan de factures
- Modification du hook `useFacturesPage` existant (on compose dessus)
- Déplacement des composants existants (on crée à côté, pas de migration de fichiers)
