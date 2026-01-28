# Single-Copro vs Multi-Copro Architecture

## Current Mode

**Single-Copro Mode is ACTIVE** (commit `4dc65c1`, 2026-01-27)

### Feature Flag
Location: `src/lib/features/flags.ts`

```typescript
export const SINGLE_COPRO_MODE = true;
export const DEFAULT_COPRO_ID = process.env.NEXT_PUBLIC_DEFAULT_COPRO_ID || null;
```

## Behavior Comparison

| Aspect | Multi-Copro (flag = false) | Single-Copro (flag = true) |
|--------|---------------------------|---------------------------|
| Copro selection | User chooses from dropdown | Auto-selected (1st by date) |
| `isManager` flag | From membership query | Hardcoded `true` |
| Copro list | All accessible copros | Array with single item |
| `setCurrentCoproId()` | Functional, persists to localStorage | No-op, logs debug message |
| Loading state | "Please select copro" error | Loading spinner |
| Selector UI | Dropdown component | Name-only display |

## Active Copro Service

Location: `src/lib/copro/activeCopro.ts`

### 3-Level Cache Strategy

```
Cache Level 1: In-Memory Singleton (5 min TTL)
    ↓ (if miss)
Cache Level 2: sessionStorage (session-persistent)
    ↓ (if miss)
Cache Level 3: Supabase Query → first copro by creation date
```

### Functions

| Function | Purpose |
|----------|---------|
| `getActiveCopro()` | Returns `{ id: string; name: string }` |
| `getActiveCoproId()` | Returns ID only |
| `useActiveCopro()` | React hook with loading/error states |
| `invalidateActiveCoproCache()` | Forces re-fetch on next call |

### Storage Keys
- `coproflex_active_copro_id` (sessionStorage)
- `coproflex_active_copro_name` (sessionStorage)

## CoproContext Provider

Location: `src/providers/CoproContext.tsx`

### Provided Values

```typescript
{
  currentCopro: Copro | null;
  currentCoproId: string | null;
  copros: Copro[];               // Single item in single-copro mode
  isLoading: boolean;
  error: string | null;
  userRole: string | null;
  isManager: boolean;            // Hardcoded true in single-copro
  setCurrentCoproId: (id) => void;  // No-op in single-copro
  refreshCopros: () => Promise<void>;
}
```

### Simplifications in Single-Copro Mode
- Line 77: `isManager = true` (hardcoded)
- Lines 81-84: `setCurrentCoproId()` logs debug message, does nothing
- Selector shows name only, no dropdown

## Backend Remains Multi-Tenant

### Database
- All tables have `copro_id` column (62 tables)
- RLS policies filter by copro_id
- No schema changes for single-copro mode

### RPC Functions
```sql
CREATE FUNCTION get_default_copro_id() RETURNS uuid
  SELECT id FROM public.copros ORDER BY created_at ASC LIMIT 1;
```

### Bootstrap Migration
Location: `supabase/migrations/20260127_single_copro_bootstrap.sql`

Ensures at least one copro exists:
```sql
INSERT INTO public.copros (id, name, ...)
SELECT 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, ...
WHERE NOT EXISTS (SELECT 1 FROM public.copros LIMIT 1);
```

## Data Flow Pattern

### Hook Usage
All hooks extract `currentCoproId` from context:

```typescript
export function useAgDrafts() {
  const { currentCoproId } = useCopro();

  const loadDrafts = useCallback(async () => {
    if (!currentCoproId) {
      setDrafts([]);
      return;
    }
    // Query with .eq('copro_id', currentCoproId)
  }, [currentCoproId]);
}
```

### Page Guard
```typescript
const { currentCoproId } = useCopro();

if (!currentCoproId) {
  return <NoCoproSelected />;  // Shows loading spinner now
}
```

## Reverting to Multi-Copro Mode

### Step 1: Change Flag
```typescript
// src/lib/features/flags.ts
export const SINGLE_COPRO_MODE = false;
```

### Step 2: Restore CoproContext Logic
- Uncomment membership-based copro loading
- Reactivate `setCurrentCoproId` with localStorage persistence
- Restore copro selector dropdown

### Step 3: Restore UI Components
- Uncomment selector in `CoproSelector` component
- Add selector to Header/Sidebar

### Step 4 (Optional): Restore Guards
```typescript
if (!currentCoproId) {
  return <NoCoproSelected message="Please select a copropriété" />;
}
```

**No database changes required** - RLS and copro_id columns remain intact.

## Files Modified by Single-Copro Simplification

### Pages (13 files)
- `ag/page.tsx`, `ag/dashboard/page.tsx`
- `finance/calls/page.tsx`, `finance/comptabilite/page.tsx`
- `finance/unpaid/page.tsx`, `finance/bank-movements/page.tsx`
- `finance/cles-repartition/**/*.tsx` (4 files)
- `documents/ledger/page.tsx`, `documents/balance/page.tsx`
- `coproprietaires/page.tsx`, `settings/reminders/page.tsx`

### Hooks (10+ files)
- `useAgDrafts.ts`
- `useFinanceData.ts`
- `useCoproData.ts`
- `useLotsData.ts`
- `useCoproprietairesPage.ts`
- And others

### Components (8 files)
- `DataState.tsx` - NoCoproSelected shows loading
- `CoproContext.tsx` - Uses activeCopro hook
- `Sidebar`, `Header` - No copro selector

### New Files
- `src/lib/copro/activeCopro.ts`
- `src/lib/copro/index.ts`
- `supabase/migrations/20260127_single_copro_bootstrap.sql`
