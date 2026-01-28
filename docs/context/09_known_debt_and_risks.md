# Known Technical Debt and Risks

## Code Quality Issues

### `any` Type Usage
- **Count**: 95 occurrences in 22 files
- **Primary locations**:
  - `src/types/supabase.ts` (12 occurrences) - auto-generated
  - `src/hooks/modules/useAgDraftEdit.ts` (4 occurrences)
  - `src/lib/ag/api.ts` (8 occurrences)
  - `src/features/ventes/domain/types.ts` (4 occurrences)

### Console Statements in Production Code
- **Count**: 131 occurrences in 45 files
- **High-impact files**:
  - `ag-session-persistence.service.ts` (13 occurrences)
  - `electronic-signature.service.ts` (11 occurrences)
  - `emission-appel.service.ts` (10 occurrences)
  - `pv-generation.service.ts` (10 occurrences)
  - `pv-distribution.service.ts` (8 occurrences)

### Monolithic Hooks
| Hook | Lines | Concern |
|------|-------|---------|
| `useAgData.ts` | 1091 | Combines 8+ distinct hooks |
| `useBudget.ts` | ~1000 | 12+ modal states + calculations |
| `useAppelsFonds.ts` | 700+ | Multiple responsibilities |

## Duplicate Code

### Year Constants
| Constant | Location |
|----------|----------|
| `CURRENT_BUSINESS_YEAR = 2026` | `src/lib/time/period.ts` |
| `ANNEE_EXERCICE_ACTUEL = 2026` | `src/lib/dates/index.ts` |

### Multiple Date Utility Libraries
| File | Purpose | Overlap |
|------|---------|---------|
| `src/lib/time/period.ts` | Period/quarter management | Date creation |
| `src/lib/utils/date.ts` | Timezone-aware (date-fns) | Formatting, comparison |
| `src/lib/dates/index.ts` | Comprehensive utilities | Parsing, formatting, math |

## Legacy Files

| File | Status |
|------|--------|
| `useCoproprietairesPage.legacy.ts` | Still present, should be removed |

## Data Inconsistencies

### Mock Data Year Mismatch
| Location | Year Used | Expected |
|----------|-----------|----------|
| `finance/fonds-alur/page.tsx` | 2024 | 2026 |
| `NotificationCenter.tsx` | 2024-12-28 | 2026 |
| Dashboard priorities | Hardcoded | Dynamic |

### Business Year vs Mock Data
- Business year is `2026`
- Significant mock data uses `2024` dates
- Creates inconsistency during testing

## Timezone Handling Risks

### Direct Date Creation
Location: `useAgDrafts.ts`
```typescript
const date = new Date();
date.setDate(date.getDate() + 30);
```
Risk: Uses local timezone instead of `Europe/Paris`

### Inconsistent Patterns
- Some code uses `new Date()` directly
- Other code uses `date-fns-tz` for timezone conversion
- No enforced standard

## Hardcoded Values

### AG Default Date
```typescript
// 30-day default, not configurable
date.setDate(date.getDate() + 30);
```

### Dashboard Data
- All KPIs are static values
- Activity feed is hardcoded
- Priority list is hardcoded

### `isManager` Flag
```typescript
// CoproContext.tsx line 77
isManager = true; // Hardcoded for simplification
```

## Missing Migrations

### Modules Still on Mock Data
| Module | Flag | Status |
|--------|------|--------|
| Budget | `BUDGET_USE_SUPABASE = false` | Mock data |
| Ventes | `VENTES_USE_SUPABASE = false` | Mock data |
| Dashboard | `DASHBOARD_USE_SUPABASE = false` | Static data |

## Security Considerations

### No Sensitive Data Exposure Detected
- Environment variables properly used
- No hardcoded credentials found

### RLS Policies in Place
- All tables have RLS enabled
- Helper functions centralized

## Performance Risks

### Large Hooks
- Hooks exceeding 1000 lines may cause:
  - Slow re-renders
  - Difficult debugging
  - Memory overhead

### No Memoization in Some Cases
- Large data transformations may recalculate unnecessarily

## Testing Gaps

### Unit Tests
- Limited test coverage observed
- Service tests exist: `pv-generation.service.test.ts`, `pv-template-renderer.test.ts`
- Database smoke tests in `supabase/tests/`

### Integration Tests
- No end-to-end test framework observed

## Documentation Gaps

### Missing JSDoc
- Many functions lack documentation
- Type definitions sometimes unclear

### API Documentation
- No OpenAPI/Swagger for Edge Functions

## Dependency Risks

### React 19
- Latest version, may have ecosystem compatibility issues

### Next.js 16
- App Router relatively new
- Some patterns may change

## Future Migration Challenges

### Single-Copro to Multi-Copro
- UI changes required (selector dropdown)
- Context changes (remove hardcoded `isManager`)
- Test all pages with multiple copros

### Mock to Supabase Migration
- Each module requires:
  1. Update feature flag
  2. Verify API layer works
  3. Test data transformations
  4. Handle edge cases

## Risk Summary

| Category | Severity | Impact |
|----------|----------|--------|
| `any` types | Medium | Type safety reduced |
| Console.log | Low | Performance, security logs |
| Monolithic hooks | High | Maintainability |
| Date inconsistencies | Medium | User confusion |
| Mock data mismatch | Low | Testing accuracy |
| Missing tests | High | Regression risk |
