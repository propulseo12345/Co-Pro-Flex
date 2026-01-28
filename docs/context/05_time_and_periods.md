# Time and Period Management

## Business Year Configuration

### Source of Truth
Location: `src/lib/time/period.ts`

```typescript
const CURRENT_BUSINESS_YEAR = 2026;

export function getCurrentBusinessYear(): number {
  return CURRENT_BUSINESS_YEAR;
}
```

### Duplicate Constant
Location: `src/lib/dates/index.ts`

```typescript
export const ANNEE_EXERCICE_ACTUEL = 2026;
```

## Timezone Configuration

| Setting | Value |
|---------|-------|
| Timezone | `Europe/Paris` |
| Locale | `fr-FR` |

Defined in:
- `src/lib/constants/app.ts`
- `src/lib/dates/index.ts`

## Date Format Configuration

Location: `src/lib/constants/app.ts`

```typescript
DATE_FORMAT: {
  short: 'dd/MM/yyyy',              // 19/01/2026
  long: 'EEEE d MMMM yyyy',         // dimanche 19 janvier 2026
  withTime: 'dd/MM/yyyy HH:mm',     // 19/01/2026 19:08
  time: 'HH:mm',                    // 19:08
  iso: "yyyy-MM-dd'T'HH:mm:ssXXX",  // 2026-01-19T19:08:00+01:00
}
```

## Date Utility Files

### `src/lib/time/period.ts`
Business year and quarter management.

| Function | Returns |
|----------|---------|
| `getCurrentBusinessYear()` | `2026` |
| `getDefaultPeriodRange()` | `{ start: "2026-01-01", end: "2026-12-31" }` |
| `normalizeDateInput()` | ISO string (YYYY-MM-DD) |
| `isInCurrentBusinessYear()` | boolean |
| `getQuarter()` | 1-4 |
| `getQuarterLabel()` | "T1", "T2", "T3", "T4" |
| `getQuarterStart()` / `getQuarterEnd()` | ISO string |

### `src/lib/utils/date.ts`
Timezone-aware utilities using date-fns and date-fns-tz.

| Function | Purpose |
|----------|---------|
| `now()` | Current time in Paris timezone |
| `today()` | Start of today (00:00) Paris time |
| `toParisTime()` | Convert UTC to Paris timezone (for display) |
| `toUTC()` | Convert Paris time to UTC (for storage) |
| `formatDate()` | Format with locale support |
| `formatRelative()` | Relative format ("Il y a X jours") |
| `isDateFuture()` / `isDatePast()` / `isDateToday()` | Comparison in Paris timezone |
| `daysDiff()` / `monthsDiff()` | Date differences |

### `src/lib/dates/index.ts`
Comprehensive utilities with parsing and formatting.

| Function | Example Output |
|----------|---------------|
| `formatDateFR()` | "27/01/2026" |
| `formatDateLongFR()` | "27 janvier 2026" |
| `formatDateTimeFR()` | "27/01/2026 14:30" |
| `formatTimeFR()` | "14:30" |
| `formatRelativeFR()` | "Il y a 2 heures" |
| `todayISO()` | "2026-01-27" |
| `parseDbDate()` | Parse ISO from database → Date |
| `parseDbDateOrNow()` | Parse or fallback to now() |

### `src/lib/utils/date-validation.ts`
Legal date constraints for French property law.

| Constant | Value | Description |
|----------|-------|-------------|
| `DELAI_CONVOCATION_AG` | 21 | Min days between convocation and AG |
| `DUREE_MAX_MANDAT_SYNDIC` | 36 | Max months for syndic mandate |
| `DUREE_MIN_MANDAT_SYNDIC` | 3 | Min months for syndic mandate |
| `DELAI_CONTESTATION_AG` | 2 | Months to contest AG |
| `DUREE_MAX_EXERCICE` | 18 | Max months for fiscal year |

## Period Functions

### Quarter Management
| Function | Returns |
|----------|---------|
| `getQuarter(date)` | 1, 2, 3, or 4 |
| `getQuarterLabel(date)` | "T1", "T2", "T3", "T4" |
| `getCurrentQuarterBounds()` | `{ start: Date, end: Date }` |

### Fiscal Year
| Function | Returns |
|----------|---------|
| `getExerciceActuel()` | 2026 |
| `getExercicesList(count)` | `["2026", "2025", "2024"]` |
| `isInCurrentExercice(date)` | boolean |

## AG Default Date

Location: `src/hooks/modules/useAgDrafts.ts`

```typescript
function getDefaultMeetingDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}
```

Default AG meeting date is set to 30 days from creation.

## Known Date Inconsistencies

| Issue | Location | Details |
|-------|----------|---------|
| Duplicate year constant | `period.ts` and `dates/index.ts` | Both define 2026 |
| Mock data uses 2024 | `finance/fonds-alur/page.tsx` | ALUR fund dates in 2024 |
| Historical mock data | `mock-data/entities/assemblees.ts` | AG data from 2015-2026 |
| Direct Date() usage | `useAgDrafts.ts` | Uses `new Date()` without timezone |
| Notification mock dates | `NotificationCenter.tsx` | Uses `2024-12-28T14:30:00` |

## Database Date Storage

All dates stored in Supabase use:
- `TIMESTAMPTZ` type (timestamp with timezone)
- ISO 8601 format
- UTC storage, converted on retrieval

## Supabase Date Fields

Example from `v_ag_drafts_progress` view:

```sql
m.created_at,
m.updated_at,
r.last_resolution_at,
a.last_attendance_at,

GREATEST(
  m.updated_at,
  COALESCE(r.last_resolution_at, m.updated_at),
  COALESCE(a.last_attendance_at, m.updated_at)
) AS last_activity_at
```
