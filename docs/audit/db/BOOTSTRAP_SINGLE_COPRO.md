# BOOTSTRAP_SINGLE_COPRO.md
## Guide d'implémentation du mode Single Copro

**Date audit**: 2026-01-28

Ce document décrit comment implémenter le mode "Single Copro" dans CoProFlex en utilisant la fonction RPC `get_default_copro_id()` déjà présente dans Supabase.

---

## 1. CONTEXTE

### Mode Single Copro
- L'utilisateur connecté travaille sur **une seule copropriété** à la fois
- Pas de sélecteur de copropriété visible dans l'UI
- Le `copro_id` est déterminé automatiquement au login
- Le schéma DB reste **multi-tenant** (prêt pour une évolution future)

### Avantages
- UX simplifiée (pas de confusion entre copros)
- Requêtes plus simples (pas de filtre copro_id partout)
- Performance optimisée (RLS filtré sur un seul tenant)
- Migration progressive possible vers multi-copro

---

## 2. LA FONCTION `get_default_copro_id()`

### Existence confirmée
```sql
-- Cette fonction existe déjà dans Supabase!
get_default_copro_id() RETURNS uuid
LANGUAGE sql STABLE
```

### Implémentation probable
```sql
CREATE OR REPLACE FUNCTION get_default_copro_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT copro_id
  FROM memberships
  WHERE user_id = auth.uid()
    AND is_active = true
  ORDER BY
    CASE role
      WHEN 'manager' THEN 1
      WHEN 'council' THEN 2
      ELSE 3
    END,
    created_at ASC
  LIMIT 1;
$$;
```

### Logique de sélection
1. Prend la première copropriété où l'utilisateur a un membership actif
2. Priorise le rôle `manager` (si syndic gère plusieurs copros, prend celle où il est gestionnaire)
3. En cas d'égalité, prend la plus ancienne (première inscrite)

---

## 3. IMPLÉMENTATION CÔTÉ CLIENT

### 3.1 Hook `useCurrentCopro`

Remplacer `CurrentUserProvider.tsx` par un hook Supabase:

```typescript
// src/hooks/useCurrentCopro.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Copro } from '@/types';

interface UseCurrentCoproResult {
  coproId: string | null;
  copro: Copro | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCurrentCopro(): UseCurrentCoproResult {
  const [coproId, setCoproId] = useState<string | null>(null);
  const [copro, setCopro] = useState<Copro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCopro = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Récupérer l'ID via RPC
      const { data: defaultCoproId, error: rpcError } = await supabase
        .rpc('get_default_copro_id');

      if (rpcError) throw rpcError;
      if (!defaultCoproId) throw new Error('No copro found for user');

      setCoproId(defaultCoproId);

      // 2. Récupérer les détails de la copro
      const { data: coproData, error: coproError } = await supabase
        .from('copros')
        .select('*')
        .eq('id', defaultCoproId)
        .single();

      if (coproError) throw coproError;

      setCopro(coproData);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCopro();
  }, []);

  return {
    coproId,
    copro,
    isLoading,
    error,
    refetch: fetchCopro,
  };
}
```

### 3.2 Context Provider (optionnel)

Si vous préférez un Context global:

```typescript
// src/providers/CoproProvider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCurrentCopro } from '@/hooks/useCurrentCopro';
import type { Copro } from '@/types';

interface CoproContextValue {
  coproId: string | null;
  copro: Copro | null;
  isLoading: boolean;
  error: Error | null;
}

const CoproContext = createContext<CoproContextValue | null>(null);

export function CoproProvider({ children }: { children: ReactNode }) {
  const value = useCurrentCopro();

  if (value.isLoading) {
    return <div>Chargement...</div>;
  }

  if (value.error || !value.coproId) {
    return <div>Erreur: Aucune copropriété trouvée</div>;
  }

  return (
    <CoproContext.Provider value={value}>
      {children}
    </CoproContext.Provider>
  );
}

export function useCopro(): CoproContextValue {
  const context = useContext(CoproContext);
  if (!context) {
    throw new Error('useCopro must be used within CoproProvider');
  }
  return context;
}
```

### 3.3 Usage dans les composants

```typescript
// Avant (Mock)
import { useCurrentUser } from '@/providers/CurrentUserProvider';

function BudgetPage() {
  const { currentCopro } = useCurrentUser();
  const budgets = useBudget({ coproprieteId: currentCopro.id });
  // ...
}

// Après (Supabase)
import { useCopro } from '@/providers/CoproProvider';

function BudgetPage() {
  const { coproId } = useCopro();
  const { data: budgets } = useQuery({
    queryKey: ['budgets', coproId],
    queryFn: () => supabase
      .from('v_budgets_summary')
      .select('*')
      .eq('copro_id', coproId)
  });
  // ...
}
```

---

## 4. MIGRATION DES HOOKS EXISTANTS

### Pattern général
```typescript
// Avant (Mock + localStorage)
export function useBudget({ coproprieteId, annee }) {
  const [budgets, setBudgets] = useState(
    () => JSON.parse(localStorage.getItem('coproflex-budgets')) || MOCK_BUDGETS
  );
  // ... filtrage, manipulation locale
}

// Après (Supabase)
export function useBudget({ coproId, periodId }) {
  return useQuery({
    queryKey: ['budgets', coproId, periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_budgets_summary')
        .select('*')
        .eq('copro_id', coproId)
        .eq('period_id', periodId);
      if (error) throw error;
      return data;
    },
    enabled: !!coproId,
  });
}
```

### Hooks à migrer
| Hook actuel | Vue/Table Supabase |
|-------------|-------------------|
| `useBudget` | `v_budgets_summary`, `v_budget_lines_overview` |
| `useAppelsFonds` | `v_calls_overview`, `v_call_lines_detailed` |
| `useLogbook` | `v_logbook_overview` |
| `useContracts` | `v_contracts_overview` |
| `useVenteDetail` | `v_mutation_detail` |
| `useAGContext` | `ag_meetings`, `v_ag_*` |

---

## 5. SUPPRESSION DU LOCALSTORAGE

### Pattern de nettoyage
```typescript
// src/lib/migration/cleanupLocalStorage.ts

const DEPRECATED_KEYS = [
  'coproflex-current-user',
  'coproflex-finance-data',
  'coproflex-budgets',
  // ... tous les 33 BUSINESS_DATA keys
];

export function cleanupDeprecatedLocalStorage() {
  DEPRECATED_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });

  // Nettoyer les clés dynamiques
  Object.keys(localStorage).forEach(key => {
    if (
      key.startsWith('ag-draft-') ||
      key.startsWith('ag-votes-') ||
      key.startsWith('ag-presences-') ||
      // ... autres patterns
    ) {
      localStorage.removeItem(key);
    }
  });
}

// Appeler au login après migration réussie
```

---

## 6. GESTION DE L'AUTHENTIFICATION

### Flow complet
```typescript
// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);

    // Vérifier que l'utilisateur a une copro
    const { data: coproId } = await supabase.rpc('get_default_copro_id');

    if (!coproId) {
      // Rediriger vers onboarding si pas de copro
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

### Middleware de protection
```typescript
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  // Protéger les routes dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/ag/:path*', '/finance/:path*'],
};
```

---

## 7. TESTS

### Test de `get_default_copro_id`
```typescript
// __tests__/hooks/useCurrentCopro.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentCopro } from '@/hooks/useCurrentCopro';

describe('useCurrentCopro', () => {
  it('should return the default copro for authenticated user', async () => {
    const { result } = renderHook(() => useCurrentCopro());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.coproId).toBeDefined();
    expect(result.current.copro).toHaveProperty('name');
    expect(result.current.error).toBeNull();
  });

  it('should return error for user without membership', async () => {
    // Mock user sans membership
    const { result } = renderHook(() => useCurrentCopro());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

---

## 8. CHECKLIST DE MIGRATION

### Phase 1: Préparation
- [ ] Vérifier que `get_default_copro_id()` fonctionne
- [ ] Créer `useCurrentCopro` hook
- [ ] Créer `CoproProvider` (optionnel)
- [ ] Tester avec un utilisateur réel

### Phase 2: Migration des hooks
- [ ] Migrer `useBudget` → Supabase
- [ ] Migrer `useAppelsFonds` → Supabase
- [ ] Migrer `useLogbook` → Supabase
- [ ] Migrer `useContracts` → Supabase
- [ ] Migrer `useVenteDetail` → Supabase
- [ ] Migrer hooks AG → Supabase

### Phase 3: Nettoyage
- [ ] Supprimer `CurrentUserProvider.tsx`
- [ ] Supprimer fichiers `data/mock/*.ts`
- [ ] Supprimer usage localStorage
- [ ] Exécuter `cleanupDeprecatedLocalStorage()`

### Phase 4: Validation
- [ ] Exécuter script de validation (`LOCALSTORAGE_BUSINESS_KEYS.txt`)
- [ ] Vérifier 0 occurrences de clés localStorage dans `src/`
- [ ] Tests E2E complets

---

## 9. FAQ

### Q: Et si l'utilisateur gère plusieurs copros?
**R:** `get_default_copro_id()` retourne la première. Pour une évolution multi-copro, ajouter un sélecteur qui stocke le choix dans `localStorage` (clé UI_PREF, pas BUSINESS_DATA) ou en session.

### Q: Comment gérer le changement de copro (futur)?
**R:** Créer une fonction RPC `set_active_copro(copro_id)` qui vérifie le membership et stocke dans une table `user_preferences`, puis modifier `get_default_copro_id()` pour vérifier d'abord cette table.

### Q: Que se passe-t-il si l'utilisateur n'a aucun membership?
**R:** La fonction retourne `NULL`. Le client doit rediriger vers un écran d'onboarding ou afficher une erreur explicative.

### Q: Les RLS policies fonctionnent-elles automatiquement?
**R:** Oui. Toutes les policies utilisent `user_has_copro_access(copro_id)` ou `user_is_copro_manager(copro_id)` qui vérifient le membership. Le `copro_id` passé dans les requêtes est validé côté serveur.

---

## 10. RÉFÉRENCES

- `docs/audit/db/DB_SCHEMA_OVERVIEW.md` - Vue d'ensemble du schéma
- `docs/audit/db/RPC_DETAIL.md` - Détail de `get_default_copro_id()`
- `docs/audit/KILL_ORDER.md` - Plan de migration complet
- `docs/audit/LOCALSTORAGE_BUSINESS_KEYS.txt` - Clés à supprimer
