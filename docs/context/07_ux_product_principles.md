# UX and Product Principles

## Dashboard

Location: `src/app/(dashboard)/dashboard/page.tsx`

### Current State
- **100% static data** (`DASHBOARD_USE_SUPABASE = false`)
- Navigation-focused design
- Designed to be readable in ~30 seconds

### Structure

| Section | Content |
|---------|---------|
| Header | Title, business year (2026), last update timestamp |
| 3 KPIs | Solde global, Impayés en cours, Prochaine AG |
| À faire maintenant | Max 5 priority items with severity indicators |
| Activité récente | Max 6 recent activity items |
| Raccourcis | 4 quick action buttons |

### KPI Cards
| Metric | Link |
|--------|------|
| Solde global | `/finance/treasury` |
| Impayés en cours | `/finance/unpaid` |
| Prochaine AG | `/ag/dashboard` |

### Quick Actions
| Action | Link |
|--------|------|
| Créer AG | `/ag/new` |
| Appel de fonds | `/finance/calls` |
| Ajouter facture | `/finance/invoices` |
| Ordre de service | `/maintenance/service-orders` |

### Severity Indicators
- 🔴 Critical
- 🟠 Warning
- 🟡 Info

### Styling
- Color status indicators: `metricDanger` (red), `metricWarning` (orange), `metricNormal` (default)
- Responsive: 1-column on mobile, 2-column main grid on desktop
- Dark mode supported via CSS variables

## Well-Designed Pages (Reference Patterns)

### 1. AG Main Page (`ag/page.tsx`)
- Uses `useAgDrafts` with optimized view `v_ag_drafts_progress`
- Clear sections: Drafts, Next AG, History
- Completion ratio calculated in database view
- Empty states handled

### 2. Comptabilite Page (`finance/comptabilite/page.tsx`)
- Tab-based: Grand Livre, Balance, Annexes 1-5
- DataAdapter for Supabase → UI transformation
- Empty states and info banners
- Consistent filtering

### 3. AppelsFonds Module
- Real-time calculated stats
- Alert system with deadlines
- PDF/Excel export capabilities
- Multi-modal workflow

## UI Component Patterns

### DataState Component
Location: `src/components/ui/DataState/`

Handles three states:
- **Loading**: Spinner with message
- **Error**: Error message with retry option
- **Empty**: Empty state with optional action

### Modal System
Pattern used across features:

```
[Feature]Page.tsx
├── useState for each modal
├── handlers: openModal, closeModal
└── Modal components imported from ./modals/
```

### Filter Bars
Standard layout:
- Search input
- Status dropdown
- Date range picker
- Additional filters as needed

## Page Structure Pattern

```typescript
'use client';

export default function ModulePage() {
  // 1. Context
  const { currentCoproId } = useCopro();

  // 2. Business hook
  const { data, isLoading, error, ...actions } = useModuleHook();

  // 3. Local UI state
  const [filters, setFilters] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 4. Guard clause
  if (!currentCoproId) return <NoCoproSelected />;

  // 5. Loading state
  if (isLoading) return <DataState loading />;

  // 6. Error state
  if (error) return <DataState error={error} />;

  // 7. Main render
  return (
    <PageWrapper title="...">
      <Header />
      <Filters />
      <Content />
      <Modals />
    </PageWrapper>
  );
}
```

## Responsive Design

### Breakpoints
| Screen | Width | Layout Changes |
|--------|-------|---------------|
| Mobile | < 768px | Single column |
| Tablet | 768-1024px | 2 columns for main grid |
| Desktop | > 1024px | Full layout |
| Large | > 1400px | Max-width container |

### CSS Custom Properties
```css
--space-* : Spacing scale
--text-*  : Typography scale
--radius-*: Border radius scale
--border  : Divider color
--surface : Card backgrounds
```

## Dark Mode

- Toggle via `data-theme="dark"` on `<html>`
- Managed by `ThemeProvider`
- CSS variables with `:global([data-theme="dark"])` selectors

## Navigation

### Sidebar
- Main navigation menu
- Collapsible sections
- Active state highlighting

### Header
- Copro name display (no selector in single-copro mode)
- User menu
- Notifications
- Theme toggle

## Form Patterns

### Standard Form Structure
1. Form fields with labels
2. Validation messages inline
3. Submit button with loading state
4. Cancel button

### Auto-Save Pattern (AG Drafts)
- Debounce: 500ms
- Visual indicator when saving
- Error handling with retry

## Table Patterns

### SortableTable
- Column headers clickable for sorting
- Ascending/descending toggle
- Visual sort indicator

### Responsive Tables
- Horizontal scroll on mobile
- Priority columns always visible
- Secondary info in expandable rows

## Empty States

Each module provides contextual empty states:
- Descriptive message
- Suggested action
- Link to creation flow

## Error Handling

### API Errors
- Toast notification for transient errors
- Inline error message for form validation
- Full-page error state for critical failures

### Loading States
- Skeleton loaders for content
- Spinner for actions
- Progress bar for long operations
