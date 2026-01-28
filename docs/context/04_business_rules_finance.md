# Business Rules: Finance

## Budget Lifecycle

```
BROUILLON → EN_ATTENTE_APPROBATION → APPROUVE (or REJETE)
```

| Status | Allowed Operations |
|--------|-------------------|
| `BROUILLON` | Create, edit, delete, submit to AG |
| `EN_ATTENTE_APPROBATION` | View, transform to calls |
| `APPROUVE` | Generate fund calls, transform budget |
| `REJETE` | Archive only |

## Budget Types

| Type | Description |
|------|-------------|
| `COURANT` / `fonctionnement` | Operational budget (recurring expenses) |
| `TRAVAUX` | Works budget (capital improvements) |
| `ALUR` | ALUR reserve fund (Loi ALUR) |

## Expense Workflow

```
BROUILLON → EN_ATTENTE_VALIDATION → VALIDEE (or REJETEE)
```

| Status | Impact |
|--------|--------|
| `BROUILLON` | No impact on budget |
| `EN_ATTENTE_VALIDATION` | No impact on budget |
| `VALIDEE` | Counts toward budget consumption |
| `REJETEE` | No impact on budget |

### Validation Rules
- Supporting document (facture) required
- Invoices can be linked from Factures module or uploaded directly
- Only `VALIDEE` expenses count toward budget consumption

## Call for Funds Lifecycle

```
BROUILLON → ENVOYE → PARTIELLEMENT_PAYE → SOLDE
         ↘ ANNULE
```

| Status | Condition |
|--------|-----------|
| `BROUILLON` | Draft, not sent |
| `ENVOYE` | Sent to co-owners |
| `PARTIELLEMENT_PAYE` | Some payments received |
| `SOLDE` | 100% paid |
| `ANNULE` | Cancelled |

### Optimal Schedule (DELAIS_OPTIMAUX)
| Deadline | Days Before Due Date |
|----------|---------------------|
| Generation | J-45 |
| Emission | J-40 |
| Reminder 1 | J-15 |
| Reminder 2 | J-5 |

## Database Invariant

```sql
call_for_funds.total_amount = SUM(call_for_funds_lines.amount_due)
-- Tolerance: 0.01€ (rounding)
```

Enforced by constraint trigger. Any violation aborts transaction.

## Payment Processing

```
Payment Received
    ↓
allocate_payment_to_call()
    ↓
Update call_for_funds_lines.amount_paid
    ↓
Trigger: update_call_status()
    ↓
Auto-update Call Status & Reminders
```

### Payment Status
| Status | Description |
|--------|-------------|
| `ENREGISTRE` / `recorded` | Payment recorded |
| `RAPPROCHE` / `reconciled` | Matched with bank movement |
| `ANNULE` / `reversed` | Cancelled/reversed |

### Over-allocation Prevention
```sql
payment_allocations.amount ≤ call_for_funds_lines.amount_due
```

## Apportionment Keys (Clés de Répartition)

| Type | Description |
|------|-------------|
| By tantièmes | Default, proportional to share units |
| By equal parts | Same amount per lot |
| By floor area | Proportional to surface area |
| Mixed/custom | Custom rules |

### Application
- Budget → Calls allocation
- Annual services distribution
- Special assessments

## Accounting (Ledger)

### Ledger Transaction States
| Status | Description |
|--------|-------------|
| `draft` | Editable |
| `posted` | Immutable (audit trail) |

### Immutability Rule
- Transactions with `status='posted'` cannot be modified
- Enforced by trigger `trg_ledger_tx_immutable()`

### Entry Balance Rule
- Sum of debits must equal sum of credits for each transaction
- Enforced at database level

## Accounting Period (Exercice)

| Status | Description |
|--------|-------------|
| `OUVERT` / `open` | Active period for transactions |
| `CLOTURE` / `closed` | Closed, no new transactions |
| `ARCHIVE` / `locked` | Archived, audit-only |

### Period Constraints
- Maximum duration: 18 months
- Defined in `date-validation.ts`

## ALUR Funds

### Rules
- Annual contribution per co-owner
- Calculated per tantièmes
- Separate accounting
- Can transfer to main budget or works budgets
- Historical tracking of transfers

## Unpaid Management

### Status Progression
```
EN_ATTENTE → EN_RETARD → RELANCE_1 → RELANCE_2 → MISE_EN_DEMEURE → RECOUVREMENT
```

### Automated Reminders
| Stage | Days After Due Date |
|-------|-------------------|
| Reminder 1 | J+15 |
| Reminder 2 | J+30 |
| Formal notice | J+60 |
| Collection | J+90 |

## Status Mapping

| Frontend Enum | Database Value |
|---------------|----------------|
| `BudgetStatut.BROUILLON` | `'draft'` |
| `BudgetStatut.APPROUVE` | `'approved'` |
| `BudgetStatut.EN_ATTENTE_APPROBATION` | `'pending_approval'` |
| `BudgetStatut.REJETE` | `'rejected'` |

| Frontend Payment | Database Value |
|-----------------|----------------|
| `ModePaiement.VIREMENT` | `'transfer'` |
| `ModePaiement.CHEQUE` | `'check'` |
| `ModePaiement.PRELEVEMENT` | `'direct_debit'` |
| `ModePaiement.ESPECES` | `'cash'` |

## Budget Calculations

### Consumption Tracking
```typescript
avgMonthlyConsumption = totalConsomme / monthsElapsed
```

### Reliability Index
```typescript
fiabilite = min(1, monthsElapsed / 6)
// 0 at month 1, 1 at month 6
```

### Weighted Projection
```typescript
projectedYearEnd = fiabilite * projectionBrute + (1 - fiabilite) * budgetVote
```

### Confidence Interval
```typescript
margeErreur = (1 - fiabilite) * 0.3
// 30% at month 1, 0% at month 6
```

### Alert Threshold
Posts with consumption > 90% of budget are flagged as `postesEnAlerte`.
