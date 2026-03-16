# Refonte Mouvements Bancaires — Design Spec

**Date**: 2026-03-16
**Branche**: v2
**Statut**: Approuvé

## Périmètre

Cette refonte concerne **uniquement** la page `/finance/mouvements-bancaires`. La route séparée `/finance/rapprochement-bancaire` (session-based, avec import CSV, certification mensuelle, solde de relevé) reste **hors scope** et inchangée. Le rapprochement intégré ici est le rapprochement rapide mouvement↔écriture déjà présent dans l'onglet de la page mouvements, pas le workflow complet de rapprochement bancaire mensuel.

## Résumé

Refonte complète de la page Mouvements bancaires. Suppression des onglets Mouvements/Rapprochement au profit d'une vue unifiée. Suppression des sections volumineuses (SyncSection, AlertsSection, AccountCards, StatsCards) remplacées par un header fusionné avec pills comptes, des bandeaux d'alerte compacts et une table unique intégrant catégorisation et rapprochement rapide.

## Décisions de design

| Question | Choix |
|----------|-------|
| Usage principal | Consultation quotidienne + rapprochement à parts égales |
| Sections Sync/Alertes | Condenser en bandeaux compacts |
| AccountCards + StatsCards | Fusionner dans un nouveau composant (pills comptes dans le header) |
| Rapprochement | Tableau unifié + panel slide-over (pas d'onglet séparé) |

## Architecture de la page

### 1. Header (FinanceTopBar + AccountPills)

- `FinanceTopBar` : titre + subtitle + actions (Import, RIB, Synchroniser) — API existante inchangée
- `AccountPills` : **composant séparé rendu sous le FinanceTopBar** (pas injecté dedans) :
  - 2 pills côte à côte (Compte courant / Fonds de travaux)
  - Pill active : bordure bleue, solde en gros, mini-stats entrées/sorties
  - Pill inactive : grisée, opacité réduite, clic pour switcher
  - Données pill inactive : utiliser `compteCourant.soldeInitial` / `compteTravaux.soldeInitial` du hook (déjà disponibles)

### 2. Bandeaux d'alerte (3 bandeaux en ligne)

Remplacent SyncSection + AlertsSection + StatsCards.

| Bandeau | Contenu | Action au clic |
|---------|---------|----------------|
| Non catégorisés | Nombre + montant total, icône ⚠ jaune | Active le filtre "Non cat." dans la table |
| Non rapprochés | Nombre + écart + barre progression (X/Y), icône ⚡ orange | Active le filtre "Non rappr." |
| Sync | Indicateur vert/rouge + "il y a Xh" | Rien (informatif) |

### 3. Table unique (suppression des onglets)

Colonnes :
| Colonne | Description |
|---------|-------------|
| Statut | ● vert (rapproché) ou ○ orange (non rapproché) |
| Date | Format fr-FR |
| Libellé | Texte tronqué, cliquable si entité liée |
| Entité liée | Badge coloré (📄 Appel, 🏢 Fournisseur, 👤 Copro) |
| Montant | Vert (+) / Rouge (-), font-weight bold |
| Solde | Gris, courant après mouvement |
| Catégorie | ✓ + compte comptable (vert) ou ⚠ Non cat. (jaune) |
| Rapprochement | Badge pièce comptable (vert) ou "—" |
| Action | "Catégoriser" et/ou "Rapprocher" selon statut |

Filtres (barre horizontale) :
- Recherche texte libre
- Tous (count)
- Entrées
- Sorties
- Non catégorisés (⚠)
- Non rapprochés (○)

Highlight : lignes non catégorisées en fond jaune subtil, lignes non rapprochées en fond orange subtil, ligne sélectionnée en fond bleu.

### 4. Panel slide-over (rapprochement)

S'ouvre à droite de la table au clic sur "Rapprocher". La table se réduit en `grid-template-columns: 1fr 280px`.

Contenu du panel :
1. **Header** : titre "Rapprocher" + bouton fermer
2. **Récap mouvement** : libellé, montant, date
3. **Suggestions d'écritures** : classées par score de confiance
   - Score en badge (98% vert, 45% jaune, <30% rouge)
   - Libellé écriture, montant, compte, journal
   - Écart calculé
   - Bouton "Rapprocher" par suggestion
4. **Saisie manuelle** : bouton en bas pour créer une écriture manuellement

Panel fermé par défaut. Se ferme au clic ✕ ou après rapprochement réussi.

## Composants à créer / modifier

### Nouveaux composants (`src/features/finance/mouvements-bancaires/components/`)

| Composant | Rôle |
|-----------|------|
| `AccountPills` | Pills comptes dans le header (remplace AccountCards) |
| `AlertBanners` | 3 bandeaux compacts (remplace AlertsSection + SyncSection) |
| `UnifiedMovementsTable` | Table unique avec toutes les colonnes (remplace MovementsTab + RapprochementTab) |
| `RapprochementSlideOver` | Panel latéral suggestions (remplace RapprochementModal) |
| `MovementFilters` | Barre de filtres enrichie |

### Composants à supprimer

- `AccountCards` → remplacé par `AccountPills`
- `StatsCards` → données absorbées par pills + bandeaux
- `SyncSection` → condensé dans bandeau sync
- `AlertsSection` → condensé dans bandeaux alertes
- `TabsNavigation` → plus d'onglets
- `MovementsTab` → absorbé par `UnifiedMovementsTable`
- `RapprochementTab` → absorbé par `UnifiedMovementsTable` + `RapprochementSlideOver`
- `PageHeader` → déjà remplacé par `FinanceTopBar`

### Composants conservés

- `CategorisationModal` — inchangée
- `EntityDetailModal` — inchangée
- `ImportModal` — inchangée
- `NewMovementsNotification` — inchangée
### Composants hors scope

La route `/finance/rapprochement-bancaire` et tout son feature folder (`src/features/finance/rapprochement-bancaire/`) restent **inchangés**. Ce workflow (sessions, import CSV, certification, soldes de relevé) est un processus distinct du rapprochement rapide intégré ici.

### Hook

Le hook `useMouvementsBancairesPage` est conservé et adapté :
- Supprimer `ongletActif` / `setOngletActif` (plus d'onglets)
- Ajouter `showSlideOver` / `setShowSlideOver` pour le panel
- Ajouter filtre `rapprochementFilter: 'tous' | 'rapproche' | 'non_rapproche'` (lowercase, cohérent avec `StatutRapprochement` existant dans domain/types.ts)
- Supprimer les `console.error` (interdit par conventions)
- Remplacer `window.location.href` par `useRouter().push()` dans `handleNavigateToEntity`

### CSS

**Stratégie de migration :**
1. Créer un nouveau `MouvementsBancaires.module.css` dans `src/features/finance/mouvements-bancaires/styles/` pour les nouveaux composants
2. Les composants conservés (`CategorisationModal`, `EntityDetailModal`, `ImportModal`, `NewMovementsNotification`) continuent à importer l'ancien fichier tant qu'ils ne sont pas modifiés
3. Chaque nouveau composant a son propre CSS Module (ex: `AccountPills.module.css`, `AlertBanners.module.css`, etc.)
4. L'ancien `mouvements-bancaires.module.css` (63KB, dans app/) n'est supprimé qu'une fois tous les composants migrés — pas avant

## Interactions clés

1. **Clic pill compte** → switch compte actif, recharge données
2. **Clic bandeau "Non catégorisés"** → active filtre ⚠ dans la table
3. **Clic bandeau "Non rapprochés"** → active filtre ○ dans la table
4. **Clic "Rapprocher" sur une ligne** → ouvre slide-over à droite avec suggestions
5. **Clic "Rapprocher" dans le panel** → rapproche, ferme panel, met à jour la ligne (● vert + badge pièce)
6. **Clic "Catégoriser" sur une ligne** → ouvre CategorisationModal (existante)
7. **Clic entité liée** → ouvre EntityDetailModal (existante)

## Dark theme

Tous les composants suivent le design system existant avec `data-theme="dark"`. Couleurs principales :
- Background page : transparent (hérite `.main-content`)
- Cards/panels : `var(--surface)` ou `#161b22`
- Borders : `var(--border)` ou `#30363d`
- Texte : `var(--text-main)`, `var(--text-secondary)`

## Contraintes

- Pas de padding sur le container (`.main-content` gère déjà le padding global)
- Noms de classes CSS sans conflit avec `.card` global → utiliser des noms spécifiques
- `FinanceTopBar` : utilisé tel quel (pas de modification de son API)
- `FinanceKpiStrip` : **supprimé de cette page** (remplacé par AccountPills + AlertBanners qui portent les mêmes données)
- Max 300 lignes par composant
