# Frontend Architecture

## Tech Stack

| Technology | Version | Usage |
|------------|---------|-------|
| Next.js | 16 | App Router (`src/app/`) |
| React | 19 | Functional components |
| TypeScript | 5 | Static typing |
| CSS Modules | - | Scoped styles per component |
| Lucide React | 0.555 | Icons |
| jsPDF | 3.0 | PDF generation (convocations, PV, exports) |
| date-fns / date-fns-tz | - | Date manipulation |

## Directory Structure

```
src/
├── app/(dashboard)/          # ~100 pages with route group
├── components/
│   ├── ui/                   # Atomic components (17 folders)
│   ├── layout/               # Header, Sidebar, PageWrapper
│   └── features/             # Business components by module (12 folders)
├── features/                 # Domain modules (ag, finance, maintenance, ventes, communication)
├── hooks/modules/            # 56 business hooks
├── lib/
│   ├── services/             # 18 business services
│   ├── constants/            # Business constants (legal delays, chart of accounts, etc.)
│   ├── utils/                # Utilities (dates, formats, etc.)
│   ├── mock-data/            # Demo data
│   └── pdf/                  # 10 PDF generators
├── types/
│   ├── enums/                # Statuses, roles, vote types
│   └── models/               # Business interfaces (15+ files)
└── providers/                # CoproContext, ThemeProvider
```

## Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Pages** (`app/`) | Entry point, hook orchestration, conditional rendering |
| **Hooks** (`hooks/modules/`) | Business logic, CRUD, calculations, local state |
| **Features** (`features/`) | Complex logic with sub-structure (components, hooks, domain, types) |
| **Components** (`components/features/`) | Business UI, forms, tables, modals |
| **Services** (`lib/services/`) | Pure business operations (PV generation, call emission, etc.) |

## Key UI Components

### Atomic Components (`components/ui/`)
- AuthStatus
- DataState (loading/error/empty states)
- DatePicker / DateRangePicker
- DocumentViewerModal
- NotificationCenter
- SignatureCanvas
- SortableTable
- ThemeToggle
- UserSwitcher

### Layout Components (`components/layout/`)
- Header
- Sidebar
- PageWrapper

### Feature Components (`components/features/`)

| Module | Components |
|--------|------------|
| AG | AgOverview, Session, Convocation, Signatures, Pouvoirs, VotesCorrespondance |
| Finance | AppelsFonds, Budget, Comptabilite, Factures, Ledger, RelevesIndividuels, Reminders |
| Maintenance | Contracts, Logbook, ProviderCard, ServiceOrders |
| Documents | GED, AccessRightsManager |
| Ventes | VenteDetail |

## Providers

### CoproContext (`providers/CoproContext.tsx`)

Provides:
```typescript
{
  currentCopro: Copro | null;
  currentCoproId: string | null;
  copros: Copro[];
  isLoading: boolean;
  error: string | null;
  userRole: string | null;
  isManager: boolean;  // hardcoded to true in single-copro mode
  setCurrentCoproId: (id: string) => void;  // no-op in single-copro mode
  refreshCopros: () => Promise<void>;
}
```

### ThemeProvider

Manages dark/light mode via `data-theme` attribute on `<html>`.

## Import Aliases

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

## Feature Flags

Location: `src/lib/features/flags.ts`

| Flag | Default | Purpose |
|------|---------|---------|
| `SINGLE_COPRO_MODE` | `true` | Auto-selects first copro, hides selector |
| `DEFAULT_COPRO_ID` | `null` | Override copro (env variable) |
| `BUDGET_USE_SUPABASE` | `false` | Budget module data source |
| `VENTES_USE_SUPABASE` | `false` | Ventes module data source |
| `DASHBOARD_USE_SUPABASE` | `false` | Dashboard data source |
| `DASHBOARD_COMPACT_MODE` | `true` | Compact dashboard display |
| `DASHBOARD_MAX_PRIORITIES` | `5` | Max items in "To Do" section |
| `DASHBOARD_MAX_ACTIVITIES` | `6` | Max items in "Recent Activity" |
