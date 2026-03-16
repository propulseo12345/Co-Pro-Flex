# Conventions de Code — CoProFlex

## Nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Composants | PascalCase | `BudgetTable.tsx` |
| Hooks | camelCase + use | `useBudget.ts` |
| Utils | camelCase | `formatCurrency.ts` |
| Types/Interfaces | PascalCase + I prefix | `IAssembleeGenerale` |
| Enums | PascalCase | `AGStatut` |
| CSS Modules | camelCase | `styles.container` |
| Constantes | SCREAMING_SNAKE_CASE | `VOTING_ARTICLES` |

## Imports — Toujours utiliser les alias TypeScript

```typescript
// ✅ Correct
import { Button } from '@/components/ui';
import { useBudget } from '@/hooks/modules/useBudget';
import type { IAssembleeGenerale } from '@/types';

// ❌ Incorrect
import { Button } from '../../../components/ui';
```

## Alias disponibles

```typescript
"@/*"           → "./src/*"
"@/components/*" → "./src/components/*"
"@/ui/*"        → "./src/components/ui/*"
"@/features/*"  → "./src/components/features/*"
"@/hooks/*"     → "./src/hooks/*"
"@/lib/*"       → "./src/lib/*"
"@/types/*"     → "./src/types/*"
"@/services/*"  → "./src/services/*"
"@/data/*"      → "./src/data/*"
"@/providers/*" → "./src/providers/*"
```

## Structure d'un composant

```typescript
'use client'; // Si nécessaire

// 1. Imports externes
import { useState, useCallback } from 'react';
import { Icon } from 'lucide-react';

// 2. Imports internes
import { Button } from '@/components/ui';
import styles from './MonComposant.module.css';

// 3. Types locaux
interface MonComposantProps {
  title: string;
  onAction: () => void;
}

// 4. Composant
export function MonComposant({ title, onAction }: MonComposantProps) {
  // Hooks
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

## Règles strictes

- ❌ Jamais de `any` — utiliser `unknown` ou typer correctement
- ❌ Jamais de `console.log` en production
- ❌ Jamais de styles inline (`style={{}}`)
- ✅ Toujours typer les props avec une interface
- ✅ Toujours utiliser CSS Modules
- ✅ Pages < 300 lignes (extraire en composants si plus)
