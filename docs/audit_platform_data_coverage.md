# AUDIT COMPLET - CoProFlex Data Coverage

**Date**: 2026-01-27
**Backend Status**: Supabase déployé et validé (132/132 PASS)
**Frontend Status**: Migration partielle en cours

---

## RÉSUMÉ EXÉCUTIF

| Métrique | Valeur |
|----------|--------|
| **Pages totales** | 120+ routes |
| **Pages connectées Supabase** | ~65% |
| **Pages encore en Mock** | ~25% |
| **Pages Mixed (partiellement)** | ~10% |
| **Fichiers avec mock data** | 124 fichiers |
| **Records mock à migrer** | ~440 records |
| **Clés localStorage critiques** | 12 (AG session) |
| **Vues Supabase disponibles** | 50+ |
| **Edge functions** | 20+ |
| **RPC functions** | 20+ |

### Score de Couverture par Module

| Module | Couverture DB | Statut |
|--------|---------------|--------|
| AG (Meetings) | 85% | ✅ Quasi-complet |
| AG (Session/Votes) | 40% | ⚠️ localStorage critique |
| Finance (Calls) | 90% | ✅ Bon |
| Finance (Comptabilité) | 30% | 🔴 Mock massif |
| Coproprietaires | 95% | ✅ Complet |
| Lots/Tantiemes | 90% | ✅ Bon |
| Documents (GED) | 80% | ✅ Bon |
| Maintenance | 50% | ⚠️ Mixte |
| Communication | 40% | ⚠️ Mixte |
| Dashboard | 0% | 🔴 100% Mock |
| Settings | 10% | 🔴 Majorité Mock |

---

## PHASE 1 - INVENTAIRE DES ROUTES

### Routes Critiques (P0)

#### Finance

| Route | Data Source | Backend Object | Risque |
|-------|-------------|----------------|--------|
| `/finance/calls` | ✅ Supabase | `v_calls_overview`, `useCalls()` | P1 |
| `/finance/appels-fonds` | ✅ Supabase | `useAppelsFonds()` | P1 |
| `/finance/budgets` | ⚠️ Mixed | `useBudget()` + MOCK_POSTES | P0 |
| `/finance/tantiemes` | ✅ Supabase | `useLots()`, `v_lots_with_owners` | P2 |
| `/finance/unpaid` | ✅ Supabase | `useUnpaid()`, `v_unpaid_by_lot` | P1 |
| `/finance/comptabilite` | 🔴 Mock | `MOCK_OPERATIONS`, `MOCK_DEPENSES` | P0 |
| `/finance/factures` | 🔴 Mock | `MOCK_FACTURES` | P0 |
| `/finance/cles-repartition` | ✅ Supabase | `v_repartition_key_*` | P1 |
| `/documents/ledger` | 🔴 Mock | `MOCK_OPERATIONS` | P0 |
| `/documents/balance` | 🔴 Mock | Frontend calculation | P0 |

#### Assemblées Générales

| Route | Data Source | Backend Object | Risque |
|-------|-------------|----------------|--------|
| `/ag/dashboard` | ✅ Supabase | `useAgMeetings()`, `v_ag_overview` | P2 |
| `/ag/new` | ✅ Supabase | `useAgCreateForm()`, edge `ag_create` | P2 |
| `/ag/[id]/session` | ⚠️ Mixed | localStorage + Supabase | P0 |
| `/ag/[id]/feuille-presence` | 🔴 localStorage | `feuille-presence-${agId}` | P0 |
| `/ag/[id]/votes-correspondance` | ⚠️ Mixed | Supabase votes + localStorage drafts | P0 |
| `/ag/[id]/designation-roles` | 🔴 localStorage | `roles-ag-${agId}` | P1 |
| `/ag/[id]/convocation` | ⚠️ Mixed | localStorage send flag | P1 |
| `/ag/[id]/pv` | ✅ Supabase | `v_ag_resolutions_results` | P2 |
| `/ag/resolutions` | ✅ Supabase | Resolutions library | P2 |

#### Copropriétaires & Lots

| Route | Data Source | Backend Object | Risque |
|-------|-------------|----------------|--------|
| `/coproprietaires` | ✅ Supabase | `useCoproprietairesPage()`, `v_coproprietaires_overview` | P2 |

### Routes Secondaires (P1/P2)

#### Communication

| Route | Data Source | Backend Object | Risque |
|-------|-------------|----------------|--------|
| `/communication` | 🔴 Hardcoded | Static `MODULES` array | P2 |
| `/communication/mail` | ✅ Supabase | `useMailData()`, `v_mail_*` | P1 |
| `/communication/mur` | ✅ Supabase | `v_wall_feed` | P2 |
| `/communication/evenements` | ✅ Supabase | `v_events_overview` | P2 |
| `/communication/messagerie-privee` | ✅ Supabase | `v_conversations_overview` | P2 |

#### Maintenance

| Route | Data Source | Backend Object | Risque |
|-------|-------------|----------------|--------|
| `/maintenance` | 🔴 Hardcoded | Static sections | P2 |
| `/maintenance/logbook` | 🔴 Mock | `useLogbook()` → MOCK data | P1 |
| `/maintenance/contracts` | ✅ Supabase | `useContracts()` | P2 |
| `/maintenance/service-orders` | ✅ Supabase | `v_service_orders_overview` | P2 |
| `/maintenance/providers` | ✅ Supabase | `v_providers_overview` | P2 |

#### Documents

| Route | Data Source | Backend Object | Risque |
|-------|-------------|----------------|--------|
| `/documents/ged` | ✅ Supabase | `useGedPageSupabase()`, `v_documents_*` | P2 |

#### Dashboard & Settings

| Route | Data Source | Backend Object | Risque |
|-------|-------------|----------------|--------|
| `/dashboard` | 🔴 Mock | `DASHBOARD_*` from mock | P1 |
| `/settings` | 🔴 Mock | `MOCK_PARAMETRES` | P1 |

---

## PHASE 2 - DÉTECTION MOCK/LOCALSTORAGE

### Fichiers Mock Critiques (CRITIQUE/HIGH)

#### Finance Mock Data (20 fichiers)

```
src/shared/mock/finance.ts (870 lignes - CRITIQUE)
  └─ getInitialFinanceData(): Full dataset (copro, owners, lots, budgets, calls)

src/components/features/finance/AppelsFonds/mock-data.ts
  └─ MOCK_APPELS (6 appels)
  └─ MOCK_COPROPRIETAIRES_APPEL

src/components/features/finance/Budget/mock-data.ts
  └─ MOCK_POSTES_BUDGET (7 postes)

src/components/features/finance/Comptabilite/data.ts
  └─ MOCK_OPERATIONS
  └─ MOCK_DEPENSES

src/components/features/finance/RelevesIndividuels/mock-data.ts
  └─ MOCK_RELEVES_DATA

src/components/features/finance/Factures/data.ts
  └─ MOCK_FACTURES
```

**Hooks impactés:**
- `src/hooks/modules/useAppelsFonds.ts` → MOCK_APPELS
- `src/hooks/modules/useBudget.ts` → MOCK_DEPENSES_BUDGETS
- `src/hooks/modules/useExpenses.ts` → MOCK_DEPENSES_BUDGETS
- `src/hooks/modules/useLedger.ts` → MOCK_OPERATIONS

#### AG Mock Data (15 fichiers)

```
src/lib/mock-data/entities/assemblees.ts
  └─ 7 assemblies + 48 votes

src/lib/mock-data/entities/resolutions.ts
  └─ 12 resolutions

src/lib/mock-data/entities/mandats.ts
  └─ 12 proxy mandates
```

**Hooks impactés:**
- `src/hooks/modules/useVotesCorrespondance.ts` → MOCK_COPROPRIETAIRES
- `src/hooks/modules/useConvocationData.ts` → MOCK_COPROPRIETAIRES
- `src/features/ag/pv/hooks/usePVPage.ts` → MOCK_COPROPRIETAIRES, MOCK_ASSEMBLEES

### localStorage Keys Critiques (AG Session)

| Key Pattern | Usage | Criticité |
|-------------|-------|-----------|
| `ag-resolutions-${agId}` | Liste des résolutions | CRITIQUE |
| `vote-correspondance-${agId}-${coproId}` | Votes par correspondance | CRITIQUE |
| `feuille-presence-${agId}` | Feuille de présence | CRITIQUE |
| `roles-ag-${agId}` | Désignation des rôles | HIGH |
| `ag-sent-${agId}` | Flag envoi convocation | MEDIUM |
| `ag-projector-data-${agId}` | État projecteur | LOW |

**Fichiers utilisant localStorage AG:**
```
src/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/page.tsx (Lines 46, 54, 114, 136)
src/hooks/modules/useVotesCorrespondance.ts (Lines 125, 139, 149)
src/app/(dashboard)/ag/[id]/designation-roles/page.tsx (Lines 23, 28, 37)
src/app/(dashboard)/ag/[id]/convocation/page.tsx (Line 88)
src/app/(dashboard)/ag/[id]/resolutions/new/page.tsx (Lines 100, 132)
```

### Mock Data Central (308 records)

**Location:** `src/lib/mock-data/index.ts`

| Batch | Entities | Count |
|-------|----------|-------|
| Batch 1 (Core) | users, coproprietes, coproprietaires | 21 |
| Batch 2 (Lots) | lots, fournisseurs | 25 |
| Batch 3 (Finance) | budgets, appels, operations | 60 |
| Batch 4 (Maintenance) | contrats, ordres, interventions | 46 |
| Batch 5 (Documents/AG) | documents, assemblees, votes | 112 |
| Batch 6 (Ventes/Comm) | ventes, forum, events | 44 |

---

## PHASE 3 - MAPPING DATA SOURCES SUPABASE

### API Modules Existants

| Module | Fichier | Vues | Tables | Edge Functions |
|--------|---------|------|--------|----------------|
| AG | `src/lib/ag/api.ts` | 5 | 7 | 6 |
| Communication | `src/lib/communication/api.ts` | 4 | 8 | 13 actions |
| Council | `src/lib/council/api.ts` | 3 | 4 | 6 actions |
| Documents | `src/lib/documents/api.ts` | 7 | 4 | Storage API |
| Finance | `src/lib/finance/api.ts` | 8 | 12 | 6 |
| Mail | `src/lib/mail/api.ts` | 2 | 5 | 1 RPC |
| Owners/Lots | `src/lib/owners/api.ts`, `src/lib/lots/api.ts` | 4 | 5 | - |

### Vues Disponibles (50+)

#### AG
- `v_ag_overview` - Liste AG avec stats
- `v_ag_resolutions_results` - Résolutions avec votes
- `v_ag_attendance_summary` - Présences avec tantièmes
- `v_ag_votes_detailed` - Votes individuels
- `v_ag_documents` - Documents générés

#### Finance
- `v_calls_overview` - Appels de fonds avec statut
- `v_call_lines_detailed` - Lignes par appel
- `v_unpaid_by_lot` - Impayés par lot
- `v_payments_overview` - Paiements avec allocation
- `v_unpaid_with_reminders` - Impayés avec relances
- `v_supplier_invoices_overview` - Factures fournisseurs
- `v_bank_movements_overview` - Mouvements bancaires

#### Comptabilité
- `v_general_ledger` - Grand livre
- `v_trial_balance` - Balance générale
- `v_account_movements` - Mouvements par compte
- `v_lot_balance` - Position financière lot
- `v_owner_balance` - Position financière propriétaire
- `v_owner_statement_summary` - Relevé individuel
- `v_owner_statement_lines` - Détail relevé

#### Owners/Lots
- `v_coproprietaires_overview` - Propriétaires enrichis
- `v_lots_with_owners` - Lots avec propriétaire actuel
- `v_repartition_key_totals` - Clés avec totaux
- `v_repartition_key_lines_detailed` - Lignes de clé

### Tables Directes (Écriture)

| Module | Tables | Opérations |
|--------|--------|------------|
| AG | `ag_meetings`, `ag_resolutions`, `ag_attendance`, `ag_votes` | CRUD |
| Finance | `call_for_funds`, `payments`, `supplier_invoices`, `bank_movements` | Via edge |
| Owners | `coproprietaires`, `lot_owners`, `lots` | SELECT, UPDATE |
| Repartition | `repartition_keys`, `repartition_key_lines` | CRUD |

---

## PHASE 4 - LOGIQUE MÉTIER FRONTEND

### Calculs Critiques à Migrer vers DB

#### 1. Calculs de Majorité AG (CRITIQUE)

**Fichier:** `src/components/features/ag/Session/utils.ts`

| Article | Formule actuelle | Action |
|---------|------------------|--------|
| Art. 24 | `pour > (voixExprimees / 2)` | Créer `fn_calculate_article24_result(ag_id)` |
| Art. 25 | `Math.floor(totalTantiemes / 2) + 1` | Créer `fn_calculate_article25_result(ag_id)` |
| Art. 25-1 | Passerelle 25→24 | Créer `fn_calculate_article251_result(ag_id)` |
| Art. 26 | Double majorité 2/3 + 1/2 | Créer `fn_calculate_article26_result(ag_id)` |
| Unanimité | 100% POUR | Créer `fn_calculate_unanimite_result(ag_id)` |

**Source données:** Mock `MOCK_COPROPRIETAIRES`
**Devrait venir de:** `v_ag_participants`

#### 2. Simulation Répartition (CRITIQUE)

**Fichier:** `src/features/finance/chargeKeys/SimulationModal.tsx`

```typescript
// Calcul actuel frontend
const totalWeight = lines.reduce((sum, line) => sum + (line.weight || 0), 0);
const lotMontant = totalWeight > 0 ? (weight / totalWeight) * montantNum : 0;
```

**Action:** Créer `fn_simulate_repartition(copro_id, cle_id, montant)`

#### 3. Taux de Recouvrement (HIGH)

**Fichier:** `src/lib/utils/alerts.ts`

```typescript
const tauxRecouvrement = (montantEncaisse / montantTotal) * 100;
```

**Source données:** `MOCK_APPELS`
**Action:** Créer vue `v_recouvrement_stats`

#### 4. Alertes Budget (HIGH)

**Fichier:** `src/lib/utils/alerts.ts`

```typescript
const pourcentage = (consomme / config.budget) * 100;
// Alert if >= 90%
```

**Source données:** `MOCK_DEPENSES_BUDGETS`
**Action:** Créer `fn_get_budget_alerts(copro_id, year_id)`

#### 5. Escalade Impayés (HIGH)

**Fichier:** `src/lib/utils/alerts.ts`

| Niveau | Jours | Action |
|--------|-------|--------|
| STANDARD | 0-7 | Relance amiable |
| RELANCE | 7-15 | LRAR |
| URGENCE | 15-30 | Mise en demeure |
| CRITIQUE | 30-60 | Contentieux |
| TRÈS CRITIQUE | 60+ | Escalade juridique |

**Action:** Créer `fn_get_reminder_escalation_level(lot_id)`

#### 6. Running Balance Comptabilité (HIGH)

**Fichier:** `src/components/features/finance/Comptabilite/utils.ts`

```typescript
sorted.forEach(op => {
  const variation = calculateSoldeVariation(op.typeCompte, op.debit, op.credit);
  soldeCourant += variation;
});
```

**Action:** Créer vue matérialisée `v_ledger_running_balance`

---

## PHASE 5 - TABLEAU DE COUVERTURE

### Coverage Matrix Complète

| Route | Module | Data Source | Backend Object | Risque | Action |
|-------|--------|-------------|----------------|--------|--------|
| `/dashboard` | Dashboard | 🔴 Mock | DASHBOARD_* | P1 | Créer vues KPI |
| `/finance/calls` | Finance | ✅ Supabase | v_calls_overview | P2 | OK |
| `/finance/appels-fonds` | Finance | ✅ Supabase | useAppelsFonds | P2 | OK |
| `/finance/budgets` | Finance | ⚠️ Mixed | useBudget + MOCK | P0 | Connecter postes |
| `/finance/comptabilite` | Finance | 🔴 Mock | MOCK_OPERATIONS | P0 | Connecter v_general_ledger |
| `/finance/factures` | Finance | 🔴 Mock | MOCK_FACTURES | P0 | Connecter v_supplier_invoices |
| `/finance/tantiemes` | Finance | ✅ Supabase | v_lots_with_owners | P2 | OK |
| `/finance/unpaid` | Finance | ✅ Supabase | v_unpaid_by_lot | P1 | OK |
| `/finance/cles-repartition` | Finance | ✅ Supabase | v_repartition_key_* | P1 | OK |
| `/documents/ledger` | Finance | 🔴 Mock | MOCK_OPERATIONS | P0 | Connecter v_general_ledger |
| `/documents/balance` | Finance | 🔴 Mock | Frontend calc | P0 | Connecter v_trial_balance |
| `/ag/dashboard` | AG | ✅ Supabase | v_ag_overview | P2 | OK |
| `/ag/[id]/session` | AG | ⚠️ Mixed | localStorage + DB | P0 | Migrer vers ag_session_drafts |
| `/ag/[id]/feuille-presence` | AG | 🔴 localStorage | feuille-presence-* | P0 | Migrer vers DB |
| `/ag/[id]/votes-correspondance` | AG | ⚠️ Mixed | votes + localStorage | P0 | Migrer drafts vers DB |
| `/ag/[id]/designation-roles` | AG | 🔴 localStorage | roles-ag-* | P1 | Migrer vers DB |
| `/coproprietaires` | Owners | ✅ Supabase | v_coproprietaires_overview | P2 | OK |
| `/documents/ged` | Documents | ✅ Supabase | v_documents_* | P2 | OK |
| `/maintenance/logbook` | Maintenance | 🔴 Mock | useLogbook MOCK | P1 | Connecter v_logbook_overview |
| `/maintenance/contracts` | Maintenance | ✅ Supabase | v_contracts_overview | P2 | OK |
| `/communication/mail` | Communication | ✅ Supabase | v_mail_* | P1 | OK |
| `/communication/mur` | Communication | ✅ Supabase | v_wall_feed | P2 | OK |
| `/settings` | Settings | 🔴 Mock | MOCK_PARAMETRES | P1 | Créer table settings |

---

## PHASE 6 - CHECKLIST PRIORISÉE

### P0 - Bloquants Onboarding (Sprint 1-2)

#### AG Session - Fin du localStorage

- [ ] **AG-001**: Créer hook `useAGSessionPersistence` utilisant `ag_session_drafts`
- [ ] **AG-002**: Migrer `feuille-presence-${agId}` vers `ag_attendance` + draft
- [ ] **AG-003**: Migrer `vote-correspondance-${agId}-${coproId}` vers `ag_votes` draft
- [ ] **AG-004**: Migrer `roles-ag-${agId}` vers `ag_meetings.roles` JSON
- [ ] **AG-005**: Créer RPC `fn_calculate_article_*_result(ag_id)` pour majorités

#### Finance Comptabilité - Connexion DB

- [ ] **FIN-001**: Connecter `/finance/comptabilite` à `v_general_ledger`
- [ ] **FIN-002**: Connecter `/documents/ledger` à `v_general_ledger`
- [ ] **FIN-003**: Connecter `/documents/balance` à `v_trial_balance`
- [ ] **FIN-004**: Remplacer `MOCK_OPERATIONS` par appels Supabase
- [ ] **FIN-005**: Connecter `/finance/factures` à `v_supplier_invoices_overview`

#### Finance Budget - Connexion Postes

- [ ] **BUD-001**: Créer table `budget_postes` si absente
- [ ] **BUD-002**: Remplacer `MOCK_POSTES_BUDGET` par vue `v_budget_postes`
- [ ] **BUD-003**: Créer `fn_get_budget_alerts(copro_id, year_id)`

### P1 - Important (Sprint 3-4)

#### Dashboard KPIs

- [ ] **DASH-001**: Créer vue `v_dashboard_kpis` (solde, impayés, AG à venir)
- [ ] **DASH-002**: Créer vue `v_dashboard_tasks` (tâches en attente)
- [ ] **DASH-003**: Connecter `useDashboardPage` à ces vues

#### Maintenance Logbook

- [ ] **MAINT-001**: Remplacer mock dans `useLogbook` par `v_logbook_overview`
- [ ] **MAINT-002**: Connecter interventions, travaux, documents

#### Communication Hub

- [ ] **COMM-001**: Remplacer `MODULES` hardcodé par config DB
- [ ] **COMM-002**: Créer vue `v_recent_activity` pour activité récente

#### Settings

- [ ] **SET-001**: Créer table `copropriete_settings`
- [ ] **SET-002**: Remplacer `MOCK_PARAMETRES` par requête DB

#### Calculs Métier

- [ ] **CALC-001**: Créer `fn_simulate_repartition(copro_id, cle_id, montant)`
- [ ] **CALC-002**: Créer vue `v_recouvrement_stats`
- [ ] **CALC-003**: Créer `fn_get_reminder_escalation_level(lot_id)`

### P2 - Nice to Have (Sprint 5+)

- [ ] **OPT-001**: Remplacer calculs running balance par vue matérialisée
- [ ] **OPT-002**: Créer vues pour états datés
- [ ] **OPT-003**: Optimiser alertes contrats avec vue dédiée
- [ ] **OPT-004**: Migrer mock prestataires si non fait

---

## FICHIERS MOCK À SUPPRIMER (Post-Migration)

```
src/shared/mock/finance.ts
src/data/mock/index.ts
src/data/mock/dashboard.mock.ts
src/data/mock/documents-ged.ts
src/data/mock/nouvelle-vente.mock.ts
src/lib/mock-data/index.ts
src/lib/mock-data/entities/*.ts (27 fichiers)
src/components/features/finance/AppelsFonds/mock-data.ts
src/components/features/finance/Budget/mock-data.ts
src/components/features/finance/Comptabilite/data.ts
src/components/features/finance/RelevesIndividuels/mock-data.ts
src/components/features/finance/Factures/data.ts
src/hooks/modules/useCoproprietairesPage.legacy.ts
```

---

## ORDRE DE MIGRATION RECOMMANDÉ

### Effort vs Impact Matrix

| Migration | Effort | Impact | Priorité |
|-----------|--------|--------|----------|
| AG Session localStorage → DB | Medium | Very High | 1 |
| Comptabilité Mock → Supabase | Low | High | 2 |
| Dashboard Mock → Vues | Medium | Medium | 3 |
| Budget Postes Mock → DB | Low | Medium | 4 |
| Maintenance Logbook Mock → DB | Medium | Medium | 5 |
| Settings Mock → DB | Low | Low | 6 |
| Calculs majorités → RPC | Medium | High | 7 |
| Communication Hub → DB | Low | Low | 8 |

### Sprint Plan Suggéré

**Sprint 1 (2 semaines)**
1. AG localStorage → ag_session_drafts
2. Comptabilité pages → v_general_ledger, v_trial_balance

**Sprint 2 (2 semaines)**
3. Budget postes → DB
4. Factures → v_supplier_invoices_overview

**Sprint 3 (2 semaines)**
5. Dashboard KPIs → vues dédiées
6. Maintenance logbook → v_logbook_overview

**Sprint 4 (1 semaine)**
7. Settings → DB
8. Communication hub → config DB
9. Nettoyage fichiers mock

---

## ANNEXES

### A. Liste Complète des Hooks Modules

```
src/hooks/modules/
├── useAGContext.ts
├── useAGDelais.ts
├── useAGSessionPersistence.ts
├── useAGStepGuard.ts
├── useAGWorkflow.ts
├── useAgData.ts
├── useAppelsFonds.ts
├── useBudget.ts
├── useCommunicationData.ts
├── useComposeForm.ts
├── useContracts.ts
├── useConvocationData.ts
├── useConvocationPreview.ts
├── useCorrespondenceVotes.ts
├── useCouncilData.ts
├── useCoproData.ts
├── useCoproprietairesPage.ts
├── useCoproprietairesPage.legacy.ts
├── useDashboardPage.ts
├── useDeliveryConfig.ts
├── useDesignationMultiple.ts
├── useDocumentPermissions.ts
├── useDocumentsData.ts
├── useDossiers.ts
├── useEtatsDate.ts
├── useExpenses.ts
├── useFinanceData.ts
├── useJournalRecouvrement.ts
├── useLedger.ts
├── useLiveResults.ts
├── useLogbook.ts
├── useLotsData.ts
├── useMail.ts
├── useMailData.ts
├── useMailListPage.ts
├── useMaintenanceData.ts
├── useNotifications.ts
├── useNouvelleVenteForm.ts
├── usePortefeuille.ts
├── usePouvoirs.ts
├── useProjectorSync.ts
├── usePVGeneration.ts
├── usePVTemplates.ts
├── useRapportCS.ts
├── useResolutionLibrary.ts
├── useResolutionVariables.ts
├── useSalesPage.ts
├── useStatutFacture.ts
├── useTemplateEditor.ts
├── useTemplatesPage.ts
├── useVenteDetail.ts
├── useVentes.ts
├── useVentesImpayesPage.ts
├── useVentesListPage.ts
├── useVotesCorrespondance.ts
```

### B. API Modules Supabase

```
src/lib/
├── ag/api.ts
├── communication/api.ts
├── council/api.ts
├── documents/api.ts
├── finance/api.ts
├── lots/api.ts
├── mail/api.ts
└── owners/api.ts
```

### C. Vues Supabase Existantes

```sql
-- AG
v_ag_overview
v_ag_resolutions_results
v_ag_attendance_summary
v_ag_votes_detailed
v_ag_documents

-- Finance
v_calls_overview
v_call_lines_detailed
v_unpaid_by_lot
v_payments_overview
v_unpaid_with_reminders
v_payment_reminders_overview
v_supplier_invoices_overview
v_bank_movements_overview

-- Comptabilité
v_general_ledger
v_trial_balance
v_account_movements
v_lot_balance
v_owner_balance
v_owner_statement_summary
v_owner_statement_lines

-- Owners/Lots
v_coproprietaires_overview
v_lots_with_owners
v_repartition_key_totals
v_repartition_key_lines_detailed

-- Documents
v_folders_with_counts
v_documents_with_folder
v_recent_documents
v_document_versions
v_documents_stats
v_documents_by_category
v_documents_expiring

-- Communication
v_wall_feed
v_events_overview
v_conversations_overview
v_conversation_messages

-- Council
v_council_members
v_council_decisions_overview
v_council_documents_overview

-- Mail
v_mail_campaigns_overview
v_mail_inbox_overview

-- Maintenance (implied)
v_service_orders_overview
v_contracts_overview
v_contracts_alerts
v_logbook_overview
v_logbook_alerts
v_providers_overview
```
