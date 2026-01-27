# Audit des Dates - CoProFlex

## Date de l'audit
**27 janvier 2026**

---

## Résumé exécutif

Ce document recense tous les usages de dates dans le codebase CoProFlex. L'objectif est de standardiser le handling des dates pour assurer la cohérence temporelle (nous sommes en 2026).

### Problèmes identifiés
1. **Dates hardcodées obsolètes** : Nombreuses références à 2024/2025 dans les mocks et seeds
2. **Parsing sans timezone** : Conversion de dates DB sans gestion explicite de Europe/Paris
3. **Constantes ANNEE_EXERCICE** : Hardcodées à '2024' au lieu d'être dynamiques
4. **Formats inconsistants** : Mélange de `toLocaleDateString`, `toISOString`, formats manuels

---

## 1. Usages de `new Date()`

### 1.1 Création de dates courantes (timestamp actuel)
| Fichier | Ligne | Pattern | Commentaire |
|---------|-------|---------|-------------|
| `src/providers/VentesProvider.tsx` | 70, 101, 137, 142, etc. | `new Date().toISOString()` | OK - timestamp courant |
| `src/providers/ContractsProvider.tsx` | 164-165 | `new Date()` | OK - comparaison dates |
| `src/hooks/useFacturePJ.ts` | 110, 177 | `new Date().toISOString()` | OK - timestamp courant |
| `src/hooks/useEmissionAppel.ts` | 133 | `new Date().toISOString()` | OK - timestamp courant |
| `src/hooks/usePVSignatures.ts` | 328, 332 | `new Date()` | OK - timestamp signature |
| `src/shared/ui/FiltersBar/FiltersBar.tsx` | 176-221 | `new Date()` | OK - calcul périodes |
| `src/components/ui/DatePicker/DatePicker.tsx` | 80, 149, 176, 338, 370 | `new Date()` | OK - calendrier |
| `supabase/functions/*` | multiples | `new Date().toISOString()` | OK - Edge Functions |

### 1.2 Parsing de dates depuis strings (⚠️ ATTENTION)
| Fichier | Ligne | Pattern | Risque |
|---------|-------|---------|--------|
| `src/providers/ContractsProvider.tsx` | 174 | `new Date(c.dateFin)` | ⚠️ Pas de timezone |
| `src/data/mock/index.ts` | 2982 | `new Date(b.dateCreation)` | ⚠️ Tri sans timezone |
| `supabase/functions/send_manual_payment_reminder/index.ts` | 69 | `new Date(dateStr)` | ⚠️ Parsing UTC |
| `supabase/functions/run_payment_reminders/index.ts` | 71, 199 | `new Date(dateStr)` | ⚠️ Parsing UTC |
| `supabase/functions/generate_owner_statement/index.ts` | 92 | `new Date(str)` | ⚠️ Parsing UTC |
| `supabase/functions/ag_send_relance/index.ts` | 78, 88 | `new Date(dateStr)` | ⚠️ Parsing UTC |

### 1.3 Dates hardcodées dans les providers
| Fichier | Ligne | Valeur | Action |
|---------|-------|--------|--------|
| `src/providers/CurrentUserProvider.tsx` | 18 | `new Date('2020-01-01')` | Mock - À mettre à jour |
| `src/providers/CurrentUserProvider.tsx` | 28 | `new Date('2021-06-15')` | Mock - À mettre à jour |
| `src/providers/CurrentUserProvider.tsx` | 38 | `new Date('2022-03-10')` | Mock - À mettre à jour |
| `src/providers/CurrentUserProvider.tsx` | 48 | `new Date('2019-09-01')` | Mock - À mettre à jour |
| `src/providers/CurrentUserProvider.tsx` | 58 | `new Date('2020-05-15')` | Mock - À mettre à jour |
| `src/providers/CurrentUserProvider.tsx` | 68 | `new Date('2023-01-15')` | Mock - À mettre à jour |

---

## 2. Dates hardcodées (strings)

### 2.1 Constante ANNEE_EXERCICE
| Fichier | Ligne | Valeur | Action requise |
|---------|-------|--------|----------------|
| `src/app/(dashboard)/documents/ledger/page.tsx` | 8 | `'2024'` | ➡️ Dynamique ou 2026 |
| `src/app/(dashboard)/documents/balance/page.tsx` | 19 | `'2024'` | ➡️ Dynamique ou 2026 |
| `src/app/(dashboard)/documents/ledger/full/page.tsx` | 19 | `'2024'` | ➡️ Dynamique ou 2026 |

### 2.2 Références '2024' dans les mocks
| Fichier | Occurrences | Contexte |
|---------|-------------|----------|
| `src/data/mock/documents-ged.ts` | 2 | Dossiers '2024' |
| `src/data/mock/index.ts` | 2 | Exercice fiscal |
| `src/lib/mock-data/entities/documents.ts` | 15+ | Tags et métadonnées |
| `src/lib/services/document-metadata.service.ts` | 5 | Tags et dates |
| `src/lib/services/pv-export.service.ts` | 1 | Exercice exemple |

### 2.3 Références '2025' dans les mocks
| Fichier | Occurrences | Contexte |
|---------|-------------|----------|
| `src/lib/documents/variables/catalogue.ts` | 1 | Exemple variable |
| `src/lib/mock-data/entities/appels-fonds.ts` | 1 | Période |
| `src/lib/mock-data/entities/documents.ts` | 2 | Tags budget |
| `src/app/(dashboard)/finance/releves-individuels/page.tsx` | 3 | Liste exercices, défaut |
| `src/components/features/finance/RelevesIndividuels/mock-data.ts` | 2 | Génération mock |

### 2.4 Liste EXERCICES hardcodée
| Fichier | Ligne | Valeur |
|---------|-------|--------|
| `src/app/(dashboard)/finance/releves-individuels/page.tsx` | 22 | `['2025', '2024', '2023']` |

---

## 3. Formatage des dates (`toLocaleDateString`, `toLocaleTimeString`)

### 3.1 Formatage fr-FR correct
| Fichier | Pattern | OK |
|---------|---------|-----|
| `src/features/ventes/components/MutationCard.tsx:17` | `toLocaleDateString('fr-FR', {...})` | ✅ |
| `src/features/ventes/components/EtatDateViewer.tsx:56` | `toLocaleDateString('fr-FR', {...})` | ✅ |
| `src/app/(dashboard)/ventes-impayes/ventes/[id]/page.tsx:66` | `toLocaleDateString('fr-FR', {...})` | ✅ |
| `src/hooks/modules/useAGContext.ts:91` | `toLocaleDateString('fr-FR', {...})` | ✅ |
| `src/components/ui/DocumentViewerModal/DocumentViewerModal.tsx` | Multiple | ✅ |

### 3.2 Fichiers avec formatage de dates (liste complète)
- `src/app/(dashboard)/ag/dashboard/page.tsx`
- `src/app/(dashboard)/ag/[id]/seance/page.tsx`
- `src/app/(dashboard)/communication/messages/page.tsx`
- `src/app/(dashboard)/communication/wall/page.tsx`
- `src/app/(dashboard)/documents/page.tsx`
- `src/app/(dashboard)/finance/bank-movements/page.tsx`
- `src/app/(dashboard)/finance/calls/page.tsx`
- `src/app/(dashboard)/finance/comptabilite/page.tsx`
- `src/app/(dashboard)/finance/factures/page.tsx`
- `src/app/(dashboard)/maintenance/logbook/page.tsx`
- `src/app/(dashboard)/ventes-impayes/impayes/page.tsx`
- `src/components/features/ag/Dashboard/AGCard.tsx`
- `src/components/features/ag/PresenceManagement/PresenceManagement.tsx`
- `src/components/features/finance/Budget/components/*.tsx`
- `src/components/features/maintenance/Contracts/*.tsx`
- `src/components/features/maintenance/Logbook/*.tsx`
- `src/components/features/ventes/VenteDetail/*.tsx`
- Et 50+ autres fichiers...

---

## 4. Colonnes DB avec dates (Supabase)

### 4.1 Types de colonnes date/timestamp
| Type | Count |
|------|-------|
| `timestamp with time zone` | ~200 colonnes |
| `date` | ~50 colonnes |
| `timestamp without time zone` | ~20 colonnes |

### 4.2 Tables principales avec dates
| Table | Colonnes dates |
|-------|----------------|
| `accounting_entries` | `entry_date`, `created_at`, `updated_at` |
| `ag_sessions` | `date_ag`, `convocation_sent_at`, `started_at`, `ended_at`, `created_at` |
| `bank_movements` | `bank_date`, `created_at` |
| `call_for_funds` | `emission_date`, `due_date`, `created_at` |
| `contracts` | `start_date`, `end_date`, `renewal_date`, `created_at` |
| `invoices` | `invoice_date`, `due_date`, `payment_date`, `created_at` |
| `owners` | `entry_date`, `exit_date`, `created_at` |
| `reminders` | `sent_at`, `next_reminder_date`, `created_at` |
| `service_orders` | `request_date`, `scheduled_date`, `completion_date` |
| Et 30+ autres tables... |

---

## 5. Seeds SQL avec dates obsolètes

### 5.1 Fichiers de migration avec seeds
| Fichier | Dates trouvées |
|---------|----------------|
| `supabase/migrations/20260126000006_niveau6a_maintenance_seed.sql` | 2024-*, 2025-* |
| `supabase/migrations/20260126000006_niveau6b_council_communication_seed.sql` | 2024-*, 2025-* |
| `supabase/migrations/20260126000006_niveau6c_ged_seed.sql` | 2024-*, 2025-* |
| `supabase/migrations/20250526000003_data_coproprietaires_lots.sql` | 2024-*, 2025-* |
| Et potentiellement d'autres... |

---

## 6. Opérations "date math"

### 6.1 Calculs de dates
| Fichier | Opération |
|---------|-----------|
| `src/providers/ContractsProvider.tsx:165` | `new Date(); dans30Jours.setDate(...)` |
| `src/shared/ui/FiltersBar/FiltersBar.tsx` | Calcul semaine/mois/trimestre/année |
| `src/components/ui/NotificationCenter/NotificationCenter.tsx` | `Date.now() - 3600000` (mock) |
| `src/hooks/useGlobalVariables.ts:61,137` | `new Date().getFullYear() + 1` |
| `supabase/functions/get_document_url/index.ts:356` | `Date.now() + expiresIn * 1000` |

### 6.2 Comparaisons de dates
| Fichier | Pattern |
|---------|---------|
| `src/providers/ContractsProvider.tsx` | `dateFin < now`, `dateFin > dans30Jours` |
| `supabase/functions/run_payment_reminders/index.ts` | `new Date(paused_until) >= new Date()` |
| `src/components/ui/DatePicker/DatePicker.tsx` | `isSameDay(day, new Date())` |

---

## 7. Recommandations

### 7.1 Créer utilitaires centralisés (`src/lib/dates/index.ts`)
```typescript
// Fonctions à créer
export function todayParis(): Date;
export function parseDbDate(isoString: string): Date;
export function formatDateFR(date: Date | string): string;
export function formatDateTimeFR(date: Date | string): string;
export function getExerciceActuel(): number;
export function safeCompareDates(a: Date | string, b: Date | string): number;
```

### 7.2 Remplacer ANNEE_EXERCICE hardcodé
```typescript
// Avant
const ANNEE_EXERCICE = '2024';

// Après
import { getExerciceActuel } from '@/lib/dates';
const ANNEE_EXERCICE = getExerciceActuel().toString();
```

### 7.3 Standardiser les seeds SQL vers 2026
- Mettre à jour toutes les dates 2024/2025 vers 2026
- Garder une logique cohérente (passé récent, présent, futur proche)

### 7.4 Ajouter timezone explicite pour parsing DB
```typescript
// Avant (risqué)
new Date(row.created_at)

// Après (sûr)
parseDbDate(row.created_at)
```

---

## 8. Fichiers modifiés (27/01/2026)

### Haute priorité - CORRIGÉ ✅
1. `src/app/(dashboard)/documents/ledger/page.tsx` - ANNEE_EXERCICE ➡️ Utilise `getExerciceActuel()`
2. `src/app/(dashboard)/documents/balance/page.tsx` - ANNEE_EXERCICE ➡️ Utilise `getExerciceActuel()`
3. `src/app/(dashboard)/documents/ledger/full/page.tsx` - ANNEE_EXERCICE ➡️ Utilise `getExerciceActuel()`
4. `src/app/(dashboard)/finance/releves-individuels/page.tsx` - EXERCICES ➡️ Utilise `getExercicesList(3)`

### Mock data - CORRIGÉ ✅
5. `src/shared/mock/finance.ts` - Exercice EN_COURS mis à 2026
6. `src/components/features/finance/RelevesIndividuels/mock-data.ts` - Dates 2025 ➡️ 2026
7. `src/lib/mock-data/entities/appels-fonds.ts` - Appel en préparation ➡️ 2026

### Non modifié (données historiques réalistes)
8. Seeds SQL - Contiennent l'historique 2024/2025 (cohérent pour janvier 2026)
9. `src/data/mock/documents-ged.ts` - Archives 2024 (historique)
10. `src/providers/CurrentUserProvider.tsx` - Dates création utilisateurs (historique)

---

## 9. Fichiers créés

### Module utilitaires dates
- `src/lib/dates/index.ts` - Module centralisé avec:
  - `parseDbDate()` - Parsing sécurisé des dates DB
  - `formatDateFR()` - Format "27/01/2026"
  - `formatDateLongFR()` - Format "27 janvier 2026"
  - `formatDateTimeFR()` - Format "27/01/2026 14:30"
  - `formatTimeFR()` - Format "14:30"
  - `formatRelativeFR()` - Format "Il y a 2 heures"
  - `todayParis()` - Date actuelle
  - `todayISO()` - Format "2026-01-27"
  - `safeCompareDates()` - Comparaison sécurisée
  - `isPast()`, `isFuture()`, `isToday()`, `isSameDay()`
  - `addDays()`, `addMonths()`, `daysBetween()`
  - `getExerciceActuel()` - Retourne 2026
  - `getExercicesList()` - Retourne ["2026", "2025", "2024"]
  - Constantes: `TIMEZONE`, `LOCALE`, `ANNEE_EXERCICE_ACTUEL`

---

## 10. Statistiques

| Métrique | Valeur |
|----------|--------|
| Fichiers avec `new Date()` | ~80 |
| Fichiers avec `toLocaleDateString` | ~60 |
| Références hardcodées '2024' | ~25 (historique, OK) |
| Références hardcodées '2025' | ~15 (historique, OK) |
| Colonnes DB date/timestamp | ~300 |
| Seeds SQL | Inchangés (historique réaliste) |
| Fichiers corrigés | 7 |
| Module créé | `src/lib/dates/index.ts` |
