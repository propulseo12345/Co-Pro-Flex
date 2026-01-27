# Mode Single Copro - Documentation

## Vue d'ensemble

Ce document décrit la simplification de CoProFlex pour fonctionner en **mode "Single Copro"** (une seule copropriété active). Cette modification simplifie l'expérience utilisateur tout en conservant l'architecture multi-copro en base de données pour une future évolution.

## Date de migration

**27 janvier 2026**

---

## Ce qui a été modifié

### Backend (Supabase)

| Fichier | Description |
|---------|-------------|
| `supabase/migrations/20260127_single_copro_bootstrap.sql` | Migration garantissant l'existence d'une copro par défaut |
| `supabase/tests/single_copro_bootstrap_smoke.sql` | Test smoke vérifiant le bootstrap |

**Fonction SQL ajoutée:**
- `get_default_copro_id()` - Retourne l'ID de la première copropriété (par date de création)

### Frontend - Service Active Copro

| Fichier | Description |
|---------|-------------|
| `src/lib/copro/activeCopro.ts` | Service centralisé pour la copro active |
| `src/lib/copro/index.ts` | Exports du module |

**Fonctions exposées:**
- `getActiveCopro()` - Récupère la copro active (ID + nom)
- `getActiveCoproId()` - Récupère uniquement l'ID
- `useActiveCopro()` - Hook React avec loading/error states
- `useActiveCoproId()` - Hook simplifié (uniquement ID)
- `invalidateActiveCoproCache()` - Pour invalider le cache (futur multi-copro)

### Frontend - CoproContext

| Fichier | Modifications |
|---------|---------------|
| `src/providers/CoproContext.tsx` | Utilise `useActiveCopro()` au lieu des memberships |

**Changements clés:**
- Le provider utilise maintenant le service `activeCopro` comme source de vérité
- `setCurrentCoproId()` est un NO-OP (conservé pour compatibilité API)
- `CoproSelector` affiche uniquement le nom (pas de dropdown)
- Constante `SINGLE_COPRO_MODE = true` pour contrôler le comportement

### Frontend - Pages refactorées

Les patterns `if (!currentCoproId) { return <NoCoproSelected />; }` ont été remplacés par des LoadingState:

| Page | Modification |
|------|--------------|
| `finance/calls/page.tsx` | Loading combiné |
| `finance/comptabilite/page.tsx` | Loading combiné |
| `finance/tantiemes/page.tsx` | Loading combiné |
| `finance/unpaid/page.tsx` | Loading combiné |
| `finance/unpaid/reminders/page.tsx` | Loading combiné |
| `finance/bank-movements/page.tsx` | Loading combiné |
| `finance/cles-repartition/page.tsx` | Loading combiné |
| `finance/cles-repartition/new/page.tsx` | Loading combiné |
| `finance/cles-repartition/[id]/page.tsx` | Loading combiné |
| `documents/ledger/page.tsx` | Loading combiné |
| `documents/balance/page.tsx` | Loading combiné |
| `coproprietaires/page.tsx` | LoadingState |
| `ag/dashboard/page.tsx` | LoadingState |
| `ag/[id]/votes-correspondance/page.tsx` | Spinner inline |
| `settings/reminders/page.tsx` | Loading combiné |

### Composant NoCoproSelected

Le composant `NoCoproSelected` dans `src/components/ui/DataState/DataState.tsx` a été modifié pour afficher un état de chargement au lieu d'un message d'erreur.

---

## Ce qui n'a PAS été modifié

- **Tables Supabase** : Aucune colonne `copro_id` supprimée
- **RLS (Row Level Security)** : Politiques inchangées
- **Hooks de données** : Continuent de filtrer par `copro_id`
- **Structure DB** : Architecture multi-copro préservée

---

## Comportement actuel

1. Au démarrage, le `CoproProvider` appelle `useActiveCopro()`
2. Ce hook fetch la première copro via `get_default_copro_id()` (RPC Supabase)
3. L'ID est mis en cache (sessionStorage + mémoire) pour 5 minutes
4. Tous les hooks métier (`useCalls`, `useLedger`, etc.) utilisent `currentCoproId` du contexte
5. L'utilisateur ne voit jamais de sélecteur de copro

---

## Comment revenir au mode Multi-Copro

### Étape 1: Modifier CoproContext

```typescript
// src/providers/CoproContext.tsx

// 1. Retirer l'import de useActiveCopro
// import { useActiveCopro } from '@/lib/copro/activeCopro';

// 2. Restaurer la logique basée sur memberships (voir git history avant commit)

// 3. Remettre setCurrentCoproId fonctionnel
const setCurrentCoproId = useCallback((id: string) => {
  setCurrentCoproIdState(id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id);
  }
}, []);
```

### Étape 2: Réactiver CoproSelector

```typescript
// src/providers/CoproContext.tsx

const SINGLE_COPRO_MODE = false; // Changer à false

// Décommenter le code du sélecteur dans CoproSelector
```

### Étape 3: Intégrer le sélecteur dans l'UI

Ajouter `<CoproSelector />` dans:
- `src/components/layout/Header/Header.tsx` ou
- `src/components/layout/Sidebar/Sidebar.tsx`

### Étape 4: Restaurer les guards dans les pages (optionnel)

Si vous souhaitez afficher "Aucune copropriété sélectionnée" au lieu de loading:
```typescript
if (!currentCoproId) {
  return <NoCoproSelected />;
}
```

---

## Fichiers créés

```
supabase/migrations/20260127_single_copro_bootstrap.sql
supabase/tests/single_copro_bootstrap_smoke.sql
src/lib/copro/activeCopro.ts
src/lib/copro/index.ts
docs/single_copro_mode.md (ce fichier)
```

---

## Copropriété par défaut

La migration bootstrap garantit qu'une copro existe toujours:

- **ID par défaut** (si aucune copro existait): `aaaaaaaa-0000-0000-0000-000000000001`
- **Nom par défaut**: "CoPro Demo 2026"
- **Copro actuelle**: "Résidence Les Jardins d'Émeraude" (première par date de création)

---

## Tests

### Test SQL (smoke test)

```bash
# Via MCP Supabase ou psql
\i supabase/tests/single_copro_bootstrap_smoke.sql
```

### Vérifications manuelles

1. Ouvrir `/coproprietaires` → Doit charger les copropriétaires
2. Ouvrir `/finance/calls` → Doit charger les appels de fonds
3. Ouvrir `/documents/ledger` → Doit charger le grand livre
4. Refresh navigateur → La copro reste la même
5. Aucun sélecteur de copro visible dans l'UI

---

## Notes techniques

### Cache multi-niveau

Le service `activeCopro` utilise un cache à 3 niveaux:
1. **Mémoire** (singleton) - Le plus rapide
2. **sessionStorage** - Persiste entre refreshes
3. **Supabase RPC** - Source de vérité

TTL du cache: 5 minutes

### Compatibilité TypeScript

Toutes les modifications maintiennent le typage strict. Aucun `any` ajouté.

### Performance

La stratégie de cache minimise les appels Supabase:
- Premier chargement: 1 RPC + 1 SELECT
- Refreshes suivants (même session): 0 appels
- Après expiration cache (5 min): 1 RPC + 1 SELECT
