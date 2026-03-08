# Navigation V1 Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace current Sidebar+Header navigation with High Bar (8 module tabs) + contextual ModuleSidebar.

**Architecture:** Two new layout components (HighBar, ModuleSidebar) replace two existing ones (Sidebar, Header). Route restructuring for Contentieux module. Navigation config centralized in a single MODULE_CONFIG.

**Tech Stack:** Next.js 16 App Router, React 19, CSS Modules, TypeScript 5, Lucide icons

---

## Team Structure

| Role | Scope |
|------|-------|
| **Coordinator** | Orchestrates tasks, reviews integration, validates final result |
| **Agent Frontend** | Tasks 1-4: HighBar, ModuleSidebar, Layout, CSS variables |
| **Agent Routes** | Tasks 5-7: Route moves, search config, cleanup |

---

### Task 1: Navigation Config (shared data)

**Files:**
- Create: `src/lib/config/navigation.ts`

**Step 1: Create the centralized navigation config**

```typescript
import {
  LayoutDashboard, Users, Building2, DollarSign, Wrench,
  FileText, MessageSquare, Scale, Settings, Calendar,
  Calculator, Receipt, ArrowLeftRight, FolderOpen, Mail,
  ShoppingCart, AlertTriangle, BookOpen, ClipboardList,
  LucideIcon
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  subPages: SubPage[];
}

export interface SubPage {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    subPages: [], // No sidebar for dashboard
  },
  {
    id: 'ag',
    label: 'AG',
    icon: Users,
    href: '/ag/dashboard',
    subPages: [
      { label: 'Tableau de bord', href: '/ag/dashboard', icon: LayoutDashboard },
      { label: 'Prochaine AG', href: '/ag/nouvelle', icon: Calendar },
      { label: 'Historique', href: '/ag/historique', icon: BookOpen },
    ],
  },
  {
    id: 'copropriete',
    label: 'Copropriété',
    icon: Building2,
    href: '/coproprietaires',
    subPages: [
      { label: 'Copropriétaires', href: '/coproprietaires', icon: Users },
      { label: 'Tantièmes', href: '/finance/tantiemes', icon: BarChart3 },
      { label: 'Lots', href: '/settings/info', icon: Building2 },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    href: '/finance/comptabilite',
    subPages: [
      { label: 'Comptabilité', href: '/finance/comptabilite', icon: Calculator },
      { label: 'Budgets', href: '/finance/budgets', icon: FileText },
      { label: 'Factures', href: '/finance/factures', icon: Receipt },
      { label: 'Appels de fonds', href: '/finance/appels-fonds', icon: DollarSign },
      { label: 'Mouvements bancaires', href: '/finance/mouvements-bancaires', icon: ArrowLeftRight },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    href: '/maintenance/logbook',
    subPages: [
      { label: "Carnet d'entretien", href: '/maintenance/logbook', icon: BookOpen },
      { label: 'Contrats', href: '/maintenance/contracts', icon: ClipboardList },
      { label: 'Prestataires', href: '/maintenance/providers', icon: Users },
      { label: 'Ordres de service', href: '/maintenance/service-orders', icon: Wrench },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    href: '/documents/ged',
    subPages: [
      { label: 'GED — Mes documents', href: '/documents/ged', icon: FolderOpen },
      { label: 'Courrier officiel', href: '/communication/mail', icon: Mail },
      { label: 'État daté', href: '/documents/etat-date', icon: ShoppingCart },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    href: '/communication/mur',
    subPages: [
      { label: 'Mur', href: '/communication/mur', icon: MessageSquare },
      { label: 'Calendrier', href: '/communication/evenements', icon: Calendar },
    ],
  },
  {
    id: 'contentieux',
    label: 'Contentieux',
    icon: Scale,
    href: '/contentieux/impayes',
    subPages: [
      { label: 'Impayés', href: '/contentieux/impayes', icon: AlertTriangle },
      { label: 'Litiges', href: '/contentieux/litiges', icon: Scale },
    ],
  },
];

/** Detect active module from pathname */
export function getActiveModule(pathname: string): ModuleConfig | undefined {
  // Check subPages first for exact match
  for (const mod of MODULES) {
    if (mod.subPages.some(sp => pathname.startsWith(sp.href))) return mod;
  }
  // Fallback: check module href prefix
  return MODULES.find(mod => pathname.startsWith(mod.href));
}
```

NOTE: Import `BarChart3` is missing in the above — add it to the import list.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/config/navigation.ts`

**Step 3: Commit**

```bash
git add src/lib/config/navigation.ts
git commit -m "feat(nav): centralized MODULE_CONFIG for navigation v1"
```

---

### Task 2: HighBar Component

**Files:**
- Create: `src/components/layout/HighBar/HighBar.tsx`
- Create: `src/components/layout/HighBar/HighBar.module.css`
- Create: `src/components/layout/HighBar/index.ts`

**Step 1: Create HighBar.tsx**

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { MODULES, getActiveModule } from '@/lib/config/navigation';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import { AuthStatus } from '@/components/ui/AuthStatus';
import { Search } from 'lucide-react';
import styles from './HighBar.module.css';

export default function HighBar() {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);

  return (
    <header className={styles.highbar} role="banner">
      <Link href="/dashboard" className={styles.logo} aria-label="Accueil CoProFlex">
        CoProFlex
      </Link>

      <nav className={styles.tabs} aria-label="Modules">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule?.id === mod.id;
          return (
            <Link
              key={mod.id}
              href={mod.href}
              className={clsx(styles.tab, isActive && styles.tabActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{mod.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.actions}>
        <AuthStatus />
        <NotificationCenter />
      </div>
    </header>
  );
}
```

**Step 2: Create HighBar.module.css**

Key styles:
- Fixed top, full width, height 48px
- Background: `#151821`
- Tabs: horizontal flex, gap 2px
- Active tab: bottom border `#2563eb`, text white
- Inactive tab: text `#8892a4`
- Logo: font-weight 700, color white, no-underline
- Actions: flex end, gap 8px

**Step 3: Create index.ts**

```typescript
export { default as HighBar } from './HighBar';
export { default } from './HighBar';
```

**Step 4: Commit**

```bash
git add src/components/layout/HighBar/
git commit -m "feat(nav): HighBar component with 8 module tabs"
```

---

### Task 3: ModuleSidebar Component

**Files:**
- Create: `src/components/layout/ModuleSidebar/ModuleSidebar.tsx`
- Create: `src/components/layout/ModuleSidebar/ModuleSidebar.module.css`
- Create: `src/components/layout/ModuleSidebar/index.ts`

**Step 1: Create ModuleSidebar.tsx**

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Settings } from 'lucide-react';
import { getActiveModule } from '@/lib/config/navigation';
import ThemeToggle from '@/ui/ThemeToggle';
import styles from './ModuleSidebar.module.css';

export default function ModuleSidebar() {
  const pathname = usePathname();
  const activeModule = getActiveModule(pathname);

  // No sidebar for dashboard or unknown modules
  if (!activeModule || activeModule.subPages.length === 0) {
    return null;
  }

  return (
    <aside className={styles.sidebar} aria-label="Sous-navigation">
      <div className={styles.title}>{activeModule.label}</div>

      <nav className={styles.nav}>
        {activeModule.subPages.map((page) => {
          const Icon = page.icon;
          const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
          return (
            <Link
              key={page.href}
              href={page.href}
              className={clsx(styles.item, isActive && styles.itemActive)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{page.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <ThemeToggle />
        <Link href="/settings" className={styles.settingsLink} aria-label="Paramètres">
          <Settings size={16} />
        </Link>
      </div>
    </aside>
  );
}
```

**Step 2: Create ModuleSidebar.module.css**

Key styles:
- Width: 220px, fixed left, below highbar (top: 48px)
- Background: `#131620`
- Title: padding 16px, font-weight 600, color `#e2e8f0`, font-size 13px, uppercase, letter-spacing 0.5px
- Items: padding 8px 16px, color `#8892a4`, hover `#e2e8f0`
- Active item: color `#2563eb`, background `rgba(37,99,235,0.1)`, border-left 2px solid `#2563eb`
- Footer: margin-top auto, padding 12px 16px, border-top `1px solid rgba(255,255,255,0.06)`

**Step 3: Create index.ts**

```typescript
export { default as ModuleSidebar } from './ModuleSidebar';
export { default } from './ModuleSidebar';
```

**Step 4: Commit**

```bash
git add src/components/layout/ModuleSidebar/
git commit -m "feat(nav): ModuleSidebar contextual component"
```

---

### Task 4: Update Dashboard Layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/styles/globals.css` (add nav CSS variables)
- Modify: `src/components/layout/index.ts`

**Step 1: Update layout.tsx**

Replace `<Sidebar />` + `<Header />` with `<HighBar />` + `<ModuleSidebar />`.
New structure:

```tsx
<div className="app-container">
  <HighBar />
  <div className="app-body">
    <ModuleSidebar />
    <main className="main-content">
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </main>
  </div>
</div>
```

**Step 2: Add CSS variables to globals.css**

```css
/* Navigation V1 */
--highbar-height: 48px;
--highbar-bg: #151821;
--sidebar-nav-width: 220px;
--sidebar-nav-bg: #131620;
--nav-accent: #2563eb;
--nav-text: #e2e8f0;
--nav-text-muted: #8892a4;
```

Update `.app-container` and `.main-content` styles:
- `.app-container`: flex-direction column (highbar on top)
- `.app-body`: flex-direction row (sidebar + content)
- `.main-content`: margin-left adapts to sidebar presence

**Step 3: Update layout/index.ts exports**

Add HighBar and ModuleSidebar exports, keep old exports for now (remove in Task 7).

**Step 4: Verify app loads**

Run: `npm run dev` — check `/dashboard` (no sidebar) and `/finance/comptabilite` (sidebar with Finance subpages).

**Step 5: Commit**

```bash
git add src/app/(dashboard)/layout.tsx src/styles/globals.css src/components/layout/index.ts
git commit -m "feat(nav): integrate HighBar+ModuleSidebar in dashboard layout"
```

---

### Task 5: Route Restructuring — Contentieux Module

**Files:**
- Create: `src/app/(dashboard)/contentieux/impayes/page.tsx` (move from ventes-impayes/impayes)
- Create: `src/app/(dashboard)/contentieux/impayes/impayes.module.css` (move)
- Create: `src/app/(dashboard)/contentieux/litiges/page.tsx` (move from legal/disputes)
- Create: `src/app/(dashboard)/contentieux/litiges/disputes.module.css` (move)

**Step 1: Move impayés**

```bash
mkdir -p src/app/\(dashboard\)/contentieux/impayes
cp src/app/\(dashboard\)/ventes-impayes/impayes/page.tsx src/app/\(dashboard\)/contentieux/impayes/
cp src/app/\(dashboard\)/ventes-impayes/impayes/impayes.module.css src/app/\(dashboard\)/contentieux/impayes/
```

No import changes needed — CSS modules are relative.

**Step 2: Move litiges**

```bash
mkdir -p src/app/\(dashboard\)/contentieux/litiges
cp src/app/\(dashboard\)/legal/disputes/page.tsx src/app/\(dashboard\)/contentieux/litiges/
cp src/app/\(dashboard\)/legal/disputes/disputes.module.css src/app/\(dashboard\)/contentieux/litiges/
```

**Step 3: Verify pages load**

Run: `npm run dev` — check `/contentieux/impayes` and `/contentieux/litiges`.

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/contentieux/
git commit -m "feat(nav): contentieux module routes (impayés + litiges)"
```

---

### Task 6: Update Search Config

**Files:**
- Modify: `src/lib/config/search.ts`

**Step 1: Update routes**

- Change `/legal/disputes` → `/contentieux/litiges`
- Add `/contentieux/impayes` with category 'Contentieux'
- Remove Analytics entry
- Update categories: 'Juridique' → 'Contentieux'

**Step 2: Commit**

```bash
git add src/lib/config/search.ts
git commit -m "fix(nav): update search routes for new navigation"
```

---

### Task 7: Cleanup — Remove Old Components & Routes

**Files:**
- Delete: `src/components/layout/Header/` (3 files)
- Delete: `src/components/layout/Sidebar/` (3 files)
- Delete: `src/app/(dashboard)/analytics/` (2 files)
- Delete: `src/app/preview/navigation/` (3 files)
- Modify: `src/components/layout/index.ts` — remove Header/Sidebar exports

**Step 1: Remove old layout components**

```bash
rm -rf src/components/layout/Header
rm -rf src/components/layout/Sidebar
```

**Step 2: Remove deprecated routes**

```bash
rm -rf src/app/\(dashboard\)/analytics
rm -rf src/app/preview/navigation
```

**Step 3: Update layout/index.ts**

```typescript
export { HighBar } from './HighBar';
export { ModuleSidebar } from './ModuleSidebar';
export { PageWrapper } from './PageWrapper';
```

**Step 4: Search for any remaining imports of Header or Sidebar**

Run: `grep -r "from.*layout/Header\|from.*layout/Sidebar" src/`
Fix any broken imports found.

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add -A
git commit -m "chore(nav): remove old Header, Sidebar, Analytics, preview"
```

---

## Execution Order & Dependencies

```
Task 1 (config) ──┬──→ Task 2 (HighBar)  ──┐
                   │                         ├──→ Task 4 (Layout) ──→ Task 7 (Cleanup)
                   └──→ Task 3 (Sidebar)  ──┘
                                          Task 5 (Routes)  ──→ Task 6 (Search) ──→ Task 7
```

- Tasks 2+3 can run **in parallel** (both depend only on Task 1)
- Task 5+6 can run **in parallel** with Tasks 2+3
- Task 4 needs Tasks 2+3 completed
- Task 7 needs Tasks 4+5+6 completed
