# Business Rules: Assemblées Générales (AG)

## AG Lifecycle

```
draft → convoked → in_progress → closed → pv_generated
```

| Status | Allowed Operations |
|--------|-------------------|
| `draft` | Edit info, add/modify/delete resolutions |
| `convoked` | Register correspondence votes, collect powers |
| `in_progress` | Register attendance, record votes |
| `closed` | View results, prepare PV |
| `pv_generated` | Read-only archive |

## 7-Step Workflow

| Step | Name | Prerequisites |
|------|------|---------------|
| 1 | Planification | None |
| 2 | Ordre du jour | AG must exist |
| 3 | Convocation | Resolutions must exist |
| 4 | Envoi | Convocation generated |
| 5 | Votes correspondance | Resolutions must exist (optional) |
| 6 | Session AG | Resolutions must exist |
| 7 | Procès-verbal | Session completed |

## Legal Deadlines

Defined in `src/lib/utils/date-validation.ts` and `src/lib/constants/ag-delais-legaux.ts`

| Deadline | Days | Reference |
|----------|------|-----------|
| Convocation minimum | 21 days before AG | Article 9 |
| Convocation recommended | 30 days before AG | Best practice |
| Order frozen | 21 days before AG | With convocation |
| Co-owner questions | 6 days before AG | |
| Powers reception | 1 day before AG | |
| Correspondence votes | 3 days before AG | |
| PV drafting | 30 days after AG | Recommended |

### Alert Levels
| Level | Condition |
|-------|-----------|
| `a_venir` | > 7 days remaining |
| `imminent` | 3-7 days remaining |
| `urgent` | < 3 days remaining |
| `depasse` | Past deadline |

## Majority Calculations

### Article 24 - Simple Majority (Present/Represented)
```
threshold = floor(tantièmes_présents / 2) + 1
adopted = tantièmes_pour >= threshold
```

### Article 25 - Absolute Majority (All Co-owners)
```
threshold = floor(total_tantièmes / 2) + 1
adopted = tantièmes_pour >= threshold
```

### Article 25-1 - Bridge Rule (25 → 24)
If Article 25 fails AND votes_pour > total_tantièmes / 3:
- Re-vote immediately with Article 24 majority

### Article 26 - Double Majority
```
threshold_tantièmes = floor(total_tantièmes × 2/3) + 1
threshold_copros = floor(total_coproprietaires / 2) + 1
adopted = (tantièmes_pour >= threshold_tantièmes) AND (voters_pour >= threshold_copros)
```

### Article 26-1 - Bridge Rule (26 → 25)
If Article 26 fails AND votes_pour > total_tantièmes / 2:
- Re-vote immediately with Article 25 majority

### Unanimity
```
adopted = tantièmes_pour === total_tantièmes
```

## Resolution Types

| Type | Default Article | Use Case |
|------|-----------------|----------|
| `budget` | Article 24 | Budget approval |
| `accounts` | Article 24 | Account approval |
| `works` | Article 25/26 | Improvement works |
| `appointment` | Article 24 | Role designation |
| `contract` | Article 24 | Contract approval |
| `rules` | Article 26 | Bylaw changes |
| `other` | Article 24 | General matters |

## AG Creation

- Default meeting date: today + 30 days
- For ordinary AG: auto-generates 14 standard resolutions

## Attendance Rules

| Presence Type | Description |
|---------------|-------------|
| `present` | Physically present |
| `proxy` | Represented by another co-owner |
| `correspondence` | Voted by mail before AG |

### Powers (Mandats)
- Max 3 mandates per mandataire (French law)
- Tracked in `ag_attendance.represented_by_id`

## Correspondence Votes

- Must be submitted 3 days before AG
- Stored as JSONB array: `[{resolution_id, vote}]`
- Auto-integrated into attendance when session starts
- Neutralized if co-owner arrives in person

## Session Persistence

### Storage Strategy
1. Primary: Supabase (`ag_session_drafts` table)
2. Fallback: localStorage

### Draft Types
- `presences` - Attendance records
- `roles` - Bureau assignments
- `votes` - Vote records
- `resolution_state` - Resolution progress
- `session_metadata` - Session info

### Auto-Save
- Debounce: 500ms
- Hook: `useAgDraftEdit`

## Status Mapping

| Frontend Enum | Database Value |
|---------------|----------------|
| `AGStatut.BROUILLON` | `'draft'` |
| `AGStatut.CONVOQUEE` | `'convoked'` |
| `AGStatut.EN_COURS` | `'in_progress'` |
| `AGStatut.TERMINEE` | `'closed'` |
| - | `'pv_generated'` |

| Frontend Resolution | Database Value |
|--------------------|----------------|
| `ResolutionStatut.BROUILLON` | `'draft'` |
| `ResolutionStatut.SOUMISE` | `'pending'` |
| `ResolutionStatut.VOTEE` | `'voted'` |
| `ResolutionStatut.ADOPTEE` | `'approved'` |
| `ResolutionStatut.REJETEE` | `'rejected'` |

## Key Constraints

1. **Resolutions frozen after convocation**: Cannot modify when `status != 'draft'`
2. **Attendance locked when voting starts**: Cannot modify after first vote
3. **21-day minimum**: Convocation must be sent at least 21 days before AG
4. **Immutable votes**: Once cast, votes cannot be changed
