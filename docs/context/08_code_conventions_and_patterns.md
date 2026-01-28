# Code Conventions and Patterns

## Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| Components | PascalCase | `BudgetTable.tsx`, `AgDraftCard.tsx` |
| Hooks | camelCase + `use` prefix | `useAgDrafts.ts`, `useBudget.ts` |
| Services | `[module].service.ts` | `pv-generation.service.ts` |
| API files | `[module]/api.ts` | `lib/ag/api.ts` |
| Types/Interfaces | PascalCase + `I` prefix (optional) | `IAssembleeGenerale`, `AgMeeting` |
| Enums | PascalCase | `AGStatut`, `BudgetStatut` |
| CSS Modules | camelCase | `styles.container`, `styles.headerTitle` |
| Constants | SCREAMING_SNAKE_CASE | `VOTING_ARTICLES`, `DELAIS_OPTIMAUX` |
| DB tables | snake_case | `ag_meetings`, `call_for_funds` |
| DB columns | snake_case | `copro_id`, `meeting_date` |

## Status Enum Mapping

### Frontend (French, SCREAMING_CASE)
```typescript
enum AGStatut {
  BROUILLON,
  CONVOQUEE,
  EN_COURS,
  TERMINEE,
  ANNULEE
}
```

### Database (English, snake_case)
```sql
ag_status = 'draft' | 'convoked' | 'in_progress' | 'closed' | 'pv_generated'
```

## Import Structure

### Order
1. External packages
2. Internal modules (using aliases)
3. Local files
4. Styles

### Aliases
```typescript
import { Button } from '@/components/ui';
import { useBudget } from '@/hooks/modules/useBudget';
import type { IAssembleeGenerale } from '@/types';
import styles from './Component.module.css';
```

## Component Structure

```typescript
'use client'; // If needed

// 1. External imports
import { useState, useCallback } from 'react';
import { Icon } from 'lucide-react';

// 2. Internal imports
import { Button } from '@/components/ui';
import styles from './Component.module.css';

// 3. Local types
interface ComponentProps {
  title: string;
  onAction: () => void;
}

// 4. Component
export function Component({ title, onAction }: ComponentProps) {
  // Hooks first
  const [state, setState] = useState(false);

  // Handlers
  const handleClick = useCallback(() => {
    onAction();
  }, [onAction]);

  // Render
  return (
    <div className={styles.container}>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Action</Button>
    </div>
  );
}
```

## Hook Pattern (Business Logic)

```typescript
export function useModuleName(options?: Options): UseModuleReturn {
  // 1. Context
  const { currentCoproId } = useCopro();

  // 2. State
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Load function
  const load = useCallback(async () => {
    if (!currentCoproId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiCall(currentCoproId);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  // 4. Effects
  useEffect(() => {
    load();
  }, [load]);

  // 5. Return
  return { data, isLoading, error, refresh: load };
}
```

## Service Pattern (Pure Functions)

```typescript
// lib/services/module.service.ts

export class ModuleService {
  static calculate(input: Input): Output {
    // Pure function, no side effects
    return result;
  }

  static generate(data: Data): Document {
    // Pure transformation
    return document;
  }
}
```

## API Layer Pattern

```typescript
// lib/[module]/api.ts

import { createClient } from '@/lib/supabase/client';

export async function listItems(coproId: string): Promise<ApiResult<Item[]>> {
  const client = createClient();
  return client
    .from('items')
    .select('*')
    .eq('copro_id', coproId)
    .order('created_at', { ascending: false });
}

export async function getItem(id: string): Promise<ApiResult<Item>> {
  const client = createClient();
  return client
    .from('items')
    .select('*')
    .eq('id', id)
    .single();
}
```

## Feature Flag Pattern

```typescript
// Check before using Supabase
if (BUDGET_USE_SUPABASE) {
  return supabaseImplementation();
} else {
  return mockImplementation();
}
```

## Types Location

### Global Types
- `src/types/enums/` - Status enums, role enums
- `src/types/models/` - Entity interfaces

### Feature-Specific Types
- `src/components/features/[module]/types.ts`
- `src/features/[module]/domain/types.ts`

## CSS Modules Rules

### File Naming
- `Component.module.css` alongside `Component.tsx`

### Class Naming
```css
.container { }
.headerTitle { }
.actionButton { }
.isActive { }
.hasError { }
```

### No Inline Styles
```typescript
// ✅ Correct
<div className={styles.container}>

// ❌ Incorrect
<div style={{ padding: '10px' }}>
```

## Error Handling

### Try-Catch Pattern
```typescript
try {
  const result = await apiCall();
  setData(result);
} catch (error) {
  setError(error instanceof Error ? error.message : 'Unknown error');
} finally {
  setIsLoading(false);
}
```

### Guard Clauses
```typescript
if (!currentCoproId) return null;
if (isLoading) return <Loading />;
if (error) return <Error message={error} />;
```

## File Size Guidelines

| File Type | Guideline |
|-----------|-----------|
| Pages | < 300 lines (extract components if larger) |
| Hooks | Single responsibility (current hooks exceed this) |
| Components | Single purpose, composable |
| Services | Pure functions, no state |

## Observed Anti-Patterns

### Monolithic Hooks
Current state: Some hooks exceed 1000 lines
- `useAgData.ts`: 1091 lines
- `useBudget.ts`: ~1000 lines
- `useAppelsFonds.ts`: 700+ lines

### Console Statements
131 occurrences in 45 files (should be removed in production)

### `any` Type Usage
95 occurrences in 22 files (primarily in auto-generated Supabase types)

### Duplicate Constants
- `CURRENT_BUSINESS_YEAR` in `period.ts`
- `ANNEE_EXERCICE_ACTUEL` in `dates/index.ts`

## TypeScript Configuration

### Strict Mode
- `strict: true` enabled
- `noImplicitAny` enforced (with exceptions)

### Path Aliases
Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      // ... other aliases
    }
  }
}
```
