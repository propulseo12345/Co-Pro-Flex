# Page d'accueil Gestionnaire — Spec

## Objectif

Refondre la page `/portefeuille` pour en faire la **page d'accueil du compte gestionnaire**. Premier écran après connexion. Permet de voir l'état de santé de l'ensemble des copropriétés, identifier les urgences, et naviguer vers une copro spécifique.

---

## Structure de la page

3 zones verticales :

### 1. TopBar

- Titre : "Mon Portefeuille"
- Sous-titre : "Vue consolidée de vos X copropriétés · Y lots"
- Actions droite : bouton primary "+ Nouvelle copropriété" → redirige vers `/onboarding`

### 2. KPIs agrégés (bandeau)

5 cartes en ligne, calculées sur l'ensemble du portefeuille :

| KPI | Valeur | Sous-info | Couleur |
|-----|--------|-----------|---------|
| Impayés totaux | montant € | X copros concernées | rouge si > 0, vert sinon |
| Taux recouvrement | X% | Tendance (Excellent/Bon/À améliorer) | vert >= 95%, orange >= 85%, rouge < 85% |
| Factures en retard | nombre | montant € | orange si > 0, vert sinon |
| Budgets à risque | nombre | % global consommé | orange si > 0, vert sinon |
| Rapprochement | nombre mvts | X copros en attente | orange si > 0, vert sinon |

### 3. Liste des copropriétés

#### Barre de recherche
- Input avec icône Search
- Filtre en temps réel par nom ou adresse

#### Grille de cartes

Disposition : `grid` responsive (3 colonnes desktop, 2 tablette, 1 mobile).

Triées automatiquement par **score de criticité** (décroissant). Pas de tri manuel.

---

## Score de criticité

Chaque copropriété reçoit un score calculé :

```typescript
function calculateCriticalityScore(copro: ICoproprietePortefeuille): number {
  let score = 0;
  
  // Impayés (poids fort)
  if (copro.totalImpayes > 0) {
    score += 30;
    score += Math.min(copro.totalImpayes / 1000, 20); // bonus proportionnel, plafonné à 20
  }
  
  // Taux recouvrement faible
  if (copro.tauxRecouvrement < 90) {
    score += 20;
    score += (90 - copro.tauxRecouvrement) / 2; // bonus proportionnel
  }
  
  // Mouvements non rapprochés
  if (copro.mouvementsNonRapproches > 0) {
    score += 15;
    score += Math.min(copro.mouvementsNonRapproches, 10);
  }
  
  // Factures en retard
  if (copro.facturesEnRetard > 0) {
    score += 15;
    score += Math.min(copro.facturesEnRetard * 3, 10);
  }
  
  // Budget dépassé > 80%
  const budgetPct = (copro.budgetConsomme / copro.budgetTotal) * 100;
  if (budgetPct > 80) {
    score += 10;
    score += Math.min((budgetPct - 80) / 2, 10);
  }
  
  return score;
}
```

---

## Carte copropriété

### Contenu

```
┌─ [bordure gauche colorée] ──────────────────┐
│  Résidence Les Lilas                         │
│  15 rue des Lilas, 75011 Paris               │
│                                              │
│  24 lots  ·  Solde: 45 230,50 €             │
│  4 impayés (3 542,80 €)  ·  AG: 15/03/2026  │
│                                              │
│  [Badge Impayés] [Badge Factures]            │
└──────────────────────────────────────────────┘
```

### Détails visuels

- **Bordure gauche** : 3px solid, couleur selon score
  - Score 0 : `--success` (#22c55e)
  - Score 1-30 : `--warning` (#f59e0b)
  - Score > 30 : `--danger` (#ef4444)
- **Background** : `#1a1d2e` (surface)
- **Hover** : `translateY(-1px)` + `border-color: rgba(59, 130, 246, 0.3)`
- **Nom** : 16px/600, `#e2e8f0`
- **Adresse** : 13px/400, `#94a3b8`
- **Données** : 13px/500, `#e2e8f0`, montants en `tabular-nums`
- **Impayés** : affiché en `--danger` si > 0
- **Prochaine AG** : affichée si date connue, sinon omise
- **Badges** : badges d'alertes actives (fond `rgba(semantic, 0.1)`, texte couleur vive)
- **Cursor** : `pointer`
- **Radius** : 12px
- **Padding** : 24px

### Ligne "lots · solde"

- Nombre de lots en texte normal
- Solde coloré sémantiquement (vert si positif, rouge si négatif)

### Ligne "impayés · AG"

- Impayés : nombre + montant entre parenthèses, en rouge si > 0, omis si 0
- Prochaine AG : date formatée, omise si aucune AG programmée

### Badges

Affichés uniquement si alertes actives. Types possibles : Impayés, Factures, Budget, Rapprochement, Contrats, AG. Maximum 3 visibles, "+N" si plus.

---

## Comportement au clic

1. Mise à jour du `CoproContext` avec `copro.id`
2. Redirect vers `/dashboard`
3. La sidebar reflète la copro sélectionnée (sélecteur mis à jour)
4. Retour possible via un lien "← Portefeuille" (dans la sidebar ou le header)

---

## Données — Migration Supabase

Le hook `usePortefeuille` utilise actuellement des données mockées. Il sera refactoré pour fetcher depuis Supabase.

### Requêtes nécessaires

1. **Liste des copros** : `SELECT * FROM copros`
2. **Lots par copro** : `SELECT copro_id, COUNT(*) FROM lots GROUP BY copro_id`
3. **Solde par copro** : agrégation depuis `accounts` (type = 'BANQUE', par copro_id)
4. **Impayés** : `call_for_funds` avec `status = 'IMPAYE'` ou solde restant > 0
5. **Prochaine AG** : `ag` avec `date > NOW()` la plus proche
6. **Alertes** : calculées côté client à partir des données ci-dessus

### Approche technique

- Une vue Supabase `portefeuille_overview` ou des requêtes RPC qui agrègent les données
- Le hook fait un seul appel (ou 2-3 en parallèle) et calcule KPIs + score côté client
- Les données mockées servent de fallback pendant le dev

---

## Fichiers concernés

### À refondre (repartir de zéro)
- `src/app/(dashboard)/portefeuille/page.tsx` — page principale
- `src/app/(dashboard)/portefeuille/portefeuille.module.css` — styles

### À refondre (composants)
- `src/components/features/portefeuille/PortefeuilleKpis.tsx` — KPIs agrégés
- `src/components/features/portefeuille/PortefeuilleTable.tsx` → remplacé par `PortefeuilleCoproCard.tsx` (carte) + `PortefeuilleGrid.tsx` (grille)

### À refactorer
- `src/hooks/modules/usePortefeuille.ts` — ajout score de criticité, tri, futur Supabase
- `src/types/models/portefeuille.ts` — ajout champ `prochaineAG`, score

### À vérifier
- `src/lib/copro/activeCopro.ts` — logique de changement de copro active
- `src/components/layout/UnifiedSidebar/` — lien retour portefeuille

---

## Responsive

| Breakpoint | Colonnes grille | KPIs |
|------------|----------------|------|
| Desktop (> 1200px) | 3 colonnes | 5 en ligne |
| Tablette (768-1200px) | 2 colonnes | 3 + 2 |
| Mobile (< 768px) | 1 colonne | scroll horizontal |

---

## Hors scope

- Authentification / rôle gestionnaire (pas encore en place)
- Multi-gestionnaire (un seul gestionnaire pour l'instant)
- Notifications push
- Drag & drop pour réordonner les copros
