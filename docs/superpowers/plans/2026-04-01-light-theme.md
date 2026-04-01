# Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un thème light (fond crème + pastels doux) avec sidebar sombre conservée, toggle fonctionnel via le footer sidebar.

**Architecture:** Surcharge des variables CSS via `[data-theme="light"]` dans globals.css. ThemeProvider réactivé pour poser l'attribut sur `<html>` et persister en localStorage. Aucun composant modifié structurellement.

**Tech Stack:** CSS Custom Properties, React Context, localStorage

---

### Task 1: Réactiver le ThemeProvider

**Files:**
- Modify: `src/providers/ThemeProvider.tsx`

- [ ] **Step 1: Réécrire ThemeProvider avec toggle fonctionnel**

```tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  mounted: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('coproflex-theme') as Theme | null;
    const initial = stored === 'light' ? 'light' : 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('coproflex-theme', next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/providers/ThemeProvider.tsx
git commit -m "feat(theme): reactivate ThemeProvider with toggle + localStorage"
```

---

### Task 2: Ajouter les variables CSS light dans globals.css

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Ajouter le bloc `[data-theme="light"]` à la fin du fichier, avant tout `@media`**

Ajouter ce bloc juste avant les media queries ou à la fin du `:root` block :

```css
/* =============================================
   LIGHT THEME — Crème + Pastels
   Sidebar conserve ses couleurs dark (--sidebar-*, --nav-*)
   ============================================= */
[data-theme="light"] {
  /* Surfaces */
  --background: #faf8f5;
  --bg-secondary: #f5f0e8;
  --bg-tertiary: #f0ece5;
  --surface: #fffefa;
  --surface-hover: #f8f4ee;
  --card-bg: #fffefa;
  --hover-bg: #f8f4ee;
  --bg: #faf8f5;
  --surface-secondary: #f5f0e8;
  --background-hover: #f0ece5;
  --background-secondary: #f5f0e8;
  --background-disabled: #f0ece5;

  /* Text */
  --text-main: #3d3529;
  --text-secondary: #6b5e4e;
  --text-tertiary: #a89b88;
  --text-inverse: #fffefa;
  --text-primary: #3d3529;
  --text: #3d3529;
  --color-text-primary: #3d3529;
  --color-text-secondary: #6b5e4e;
  --color-text-tertiary: #a89b88;

  /* Borders */
  --border: #ebe6dd;
  --border-light: #f3efe8;
  --border-dark: #ddd6ca;
  --border-color: #ebe6dd;
  --color-border: #ebe6dd;

  /* Semantic colors — saturated for readability on light bg */
  --primary: #4a72c0;
  --primary-hover: #3b5fa8;
  --primary-light: rgba(74, 114, 192, 0.12);
  --primary-dark: #5a82d4;
  --primary-color: #4a72c0;
  --secondary: #5a82d4;
  --secondary-hover: #4a72c0;
  --secondary-light: rgba(90, 130, 212, 0.12);
  --danger: #c45555;
  --danger-light: rgba(196, 85, 85, 0.1);
  --warning: #b08930;
  --warning-light: rgba(176, 137, 48, 0.1);
  --warning-dark: #c49a38;
  --success: #3d8f5e;
  --success-light: rgba(61, 143, 94, 0.1);
  --success-dark: #4aa86e;
  --info: #4a72c0;
  --info-light: rgba(74, 114, 192, 0.1);
  --error: #c45555;
  --error-light: rgba(196, 85, 85, 0.1);
  --error-dark: #b53e3e;

  /* Badges */
  --badge-success-bg: #d4f0e0;
  --badge-success-text: #3d8f5e;
  --badge-warning-bg: #faecd0;
  --badge-warning-text: #b08930;
  --badge-danger-bg: #fce0e0;
  --badge-danger-text: #c45555;
  --badge-info-bg: #dce6fa;
  --badge-info-text: #4a72c0;
  --badge-neutral-bg: #f0ece5;
  --badge-neutral-text: #8c7e6a;
  --badge-purple-bg: #ece0fa;
  --badge-purple-text: #7c5cbf;

  /* Status */
  --status-active-bg: #d4f0e0;
  --status-active-text: #3d8f5e;
  --status-pending-bg: #faecd0;
  --status-pending-text: #b08930;
  --status-inactive-bg: #f0ece5;
  --status-inactive-text: #8c7e6a;

  /* Additional semantic */
  --blue-500: #5a82d4;
  --blue-600: #4a72c0;
  --blue-700: #3b5fa8;
  --indigo-500: #7c7cf4;
  --indigo-600: #6366f1;
  --purple-500: #9b7cf4;
  --purple-600: #8b5cf6;
  --amber-500: #d4a740;
  --amber-600: #b08930;
  --green-600: #3d8f5e;
  --green-700: #2d7a4a;
  --red-600: #c45555;
  --red-700: #b53e3e;

  /* Icon backgrounds */
  --icon-bg-blue: #dce6fa;
  --icon-bg-indigo: #e0dafa;
  --icon-bg-purple: #ece0fa;
  --icon-bg-amber: #faecd0;
  --icon-bg-green: #d4f0e0;
  --icon-bg-cyan: #d0f0f0;

  /* Color aliases */
  --color-bg-primary: #faf8f5;
  --color-bg-secondary: #f5f0e8;
  --color-bg-tertiary: #f0ece5;
  --color-primary-100: rgba(74, 114, 192, 0.1);
  --color-primary-500: #5a82d4;
  --color-primary-600: #4a72c0;
  --color-primary-700: #3b5fa8;

  /* Shadows — lighter for cream bg */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* Glows — disabled in light mode */
  --glow-primary: none;
  --glow-success: none;
  --glow-warning: none;
}
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(theme): add light theme CSS variables — cream + pastels"
```

---

### Task 3: Remplacer les couleurs hardcodées dans finance-v2.module.css

**Files:**
- Modify: `src/components/features/finance-v2/finance-v2.module.css`

Le CSS finance-v2 utilise des couleurs en dur (`#1a1d2e`, `#e2e2eb`, `#64748b`, etc.) au lieu des variables CSS. Il faut les remplacer pour que le light theme fonctionne.

- [ ] **Step 1: Remplacer les couleurs de surface**

Remplacements dans tout le fichier :
- `#1a1d2e` → `var(--surface)` (background cards, KPIs)
- `#131620` → `var(--bg-secondary)` (backgrounds secondaires)
- `#1e1f26` → `var(--surface-hover)` (hover states)

- [ ] **Step 2: Remplacer les couleurs de texte**

- `#e2e2eb` → `var(--text-main)` (titres, texte principal)
- `#e2e8f0` → `var(--text-main)` (texte principal variante)
- `#94a3b8` → `var(--text-secondary)` (texte secondaire)
- `#64748b` → `var(--text-tertiary)` (labels, muted)
- `#475569` → `var(--text-tertiary)` (très muted)

- [ ] **Step 3: Remplacer les borders**

- `rgba(148, 163, 184, 0.08)` → `var(--border-light)` (borders subtiles)
- `rgba(148, 163, 184, 0.06)` → `var(--border-light)` (séparateurs)
- `rgba(148, 163, 184, 0.05)` → `var(--border-light)` (table rows)
- `rgba(148, 163, 184, 0.04)` → `var(--border-light)` (très subtil)
- `rgba(148, 163, 184, 0.02)` → `var(--surface-hover)` (hover rows)
- `rgba(148, 163, 184, 0.03)` → `var(--surface-hover)` (hover subtil)

Note : Les couleurs sémantiques vives (badges `#4ade80`, `#f87171`, `#fbbf24`, `#60a5fa` et bars KPI `#adc6ff`, `#34d399`, `#ffb4ab`, `#ffb786`) restent en dur — elles sont identiques dark/light.

- [ ] **Step 4: Vérifier que le build passe**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add src/components/features/finance-v2/finance-v2.module.css
git commit -m "refactor(finance-v2): replace hardcoded colors with CSS variables for theme support"
```

---

### Task 4: Tester le toggle end-to-end

**Files:**
- Aucun fichier à modifier

- [ ] **Step 1: Lancer le dev server et tester manuellement**

Run: `npx next dev`

Vérifications :
1. Ouvrir l'app dans le navigateur
2. Cliquer sur "Thème clair" / "Thème sombre" dans le footer de la sidebar
3. Vérifier que le fond passe de `#0f1117` (dark) à `#faf8f5` (crème)
4. Vérifier que les cards passent de `#1a1d2e` à `#fffefa`
5. Vérifier que la sidebar reste sombre dans les deux modes
6. Rafraîchir la page — le thème choisi doit persister (localStorage)
7. Naviguer vers une page finance-v2 — vérifier que les KPIs et tables ont bien les couleurs light

- [ ] **Step 2: Vérifier le build final**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat(theme): light theme complete — cream bg + pastel colors + toggle"
```
