# Audit État Connexion Supabase - 30 Janvier 2026

## Résumé Exécutif

| Module | Synchronisé ✅ | Partiel 🟡 | Non sync ❌ | Score |
|--------|---------------|------------|-------------|-------|
| Finance & Comptabilité | 18 hooks | 3 services | 5 pages | 72% |
| Assemblées Générales | 15 hooks | 8 services | 12 pages | 55% |
| Documents (GED) | 8 hooks | 2 services | 3 pages | 78% |
| Communication & Social | 12 hooks | 1 service | 2 pages | 85% |

**Statistiques globales :**
- **localStorage matches** : ~115 occurrences (hors UI preferences)
- **MOCK_ patterns** : ~146 fichiers concernés
- **Hooks Supabase créés** : 14 hooks *Data.ts complets
- **Tables Supabase** : ~45 tables + ~20 vues

---

## 1. MODULE FINANCE & COMPTABILITÉ

### ✅ Synchronisé Supabase (READ + WRITE)

| Page/Route | Hook(s) | Source Supabase | Status |
|------------|---------|-----------------|--------|
| /finance/appels-fonds | `useFinanceData.useCalls`, `useCallLines` | `v_calls_overview`, `v_call_lines_detailed` | ✅ Complet |
| /finance/impayes | `useFinanceData.useUnpaid`, `useUnpaidWithReminders` | `v_unpaid_lots`, `v_unpaid_with_reminders` | ✅ Complet |
| /finance/paiements | `useFinanceData.usePayments`, `useRecordPayment` | `payments`, `record_payment()` RPC | ✅ Complet |
| /finance/factures | `useFinanceData.useSupplierInvoices` | `supplier_invoices`, `v_supplier_invoices_overview` | ✅ Complet |
| /documents/ledger | `useFinanceData.useGeneralLedger` | `v_general_ledger` | ✅ READ only |
| /documents/balance | `useFinanceData.useTrialBalance` | `v_trial_balance` | ✅ READ only |
| /finance/relances | `usePaymentReminders`, `usePaymentReminderRules` | `payment_reminders`, `payment_reminder_rules` | ✅ Complet |

### 🟡 Partiel (Supabase + fallback mock)

| Page/Route | Hook(s) | Source actuelle | Source Supabase cible | Gap |
|------------|---------|-----------------|----------------------|-----|
| /finance/rapprochement-bancaire | `useRapprochementBancairePage` | `MOCK_LIGNES_RELEVE`, `MOCK_LIGNES_LOGICIEL` fallback | `bank_movements`, `reconcile_bank_movement()` | WRITE fallback mock |
| /finance/mouvements-bancaires | `useMouvementsBancairesPage` | `MOCK_COMPTE_COURANT`, `MOCK_COMPTE_TRAVAUX` | `bank_accounts`, `bank_movements` | Comptes mock |
| Budget (postes) | `budget-maintenance.service` | `MOCK_POSTES_BUDGET` | `budget_items` via Supabase | Données référence |

### ❌ Non Synchronisé (localStorage/mocks)

| Page/Route | Hook(s) | Source actuelle | Source Supabase cible | Gap | Priorité | Effort |
|------------|---------|-----------------|----------------------|-----|----------|--------|
| /finance/budgets (depenses) | `useBudget`, `useExpenses` | `MOCK_OPERATIONS`, local state | `budget_expenses`, `v_budget_summary` | READ+WRITE | P1 | M |
| /finance/fonds-alur | `useALURData` | Partiel Supabase | `alur_transfers` (migration 20260129) | READ complet mais WRITE partiel | P1 | S |
| Comptabilité complète | `MOCK_OPERATIONS` dans data.ts | Fichier mock | `ledger_entries`, `ledger_transactions` | READ+WRITE+Archive | P2 | L |

**Fichiers mock Finance à éliminer :**
```
src/components/features/finance/Budget/mock-data.ts
src/components/features/finance/AppelsFonds/mock-data.ts
src/components/features/finance/Comptabilite/data.ts
src/features/finance/mouvements-bancaires/domain/constants.ts (MOCK_*)
src/features/finance/rapprochement-bancaire/domain/constants.ts (MOCK_*)
src/shared/mock/finance.ts
```

---

## 2. MODULE ASSEMBLÉES GÉNÉRALES (AG)

### ✅ Synchronisé Supabase (READ + WRITE)

| Page/Route | Hook(s) | Source Supabase | Status |
|------------|---------|-----------------|--------|
| /ag/dashboard | `useAgData.useAgMeetings` | `ag_meetings`, `v_ag_overview` | ✅ Liste AG |
| /ag/[id] (détail) | `useAgData.useAgDetail` | `ag_meetings`, `ag_resolutions`, `ag_attendance` | ✅ Complet |
| /ag/[id]/session (votes) | `useAgData.useCastVote` | `ag_votes`, `cast_vote()` RPC | ✅ Complet |
| /ag/[id]/resolutions | `useAddResolution`, `useUpdateResolution`, `useDeleteResolution` | `ag_resolutions`, RPC | ✅ Complet |
| /ag/[id]/presence | `useRegisterAttendance`, `useRemoveAttendance` | `ag_attendance`, RPC | ✅ Complet |
| Documents AG | `useAgDocuments`, `useGenerateAgDocument` | `ag_documents`, Storage | ✅ Complet |
| Notifications AG | `ag_send_convocations`, `ag_send_relance` | `ag_notifications`, `ag_notification_events` | ✅ Edge Functions |

### 🟡 Partiel (Supabase prioritaire + localStorage fallback)

| Page/Route | Hook(s) | Source actuelle | Source Supabase cible | Gap |
|------------|---------|-----------------|----------------------|-----|
| /ag/[id]/agenda | `useAgAgendaPage` | Supabase + `localStorage` fallback | `ag_session_drafts` | Fallback encore actif |
| /ag/[id]/session | `useAgSessionPage` + `ag-session-persistence.service` | Supabase primary, localStorage fallback | `ag_session_drafts`, RPC | Migration fallback |
| /ag/[id]/pv | `usePVPage` | `MOCK_COPROPRIETAIRES`, `MOCK_ASSEMBLEES` fallback | `coproprietaires`, `ag_meetings` | Fallback mock |
| Convocation | `useConvocationData` | localStorage choices | `ag_sending_choices` (à créer?) | Choix d'envoi |
| Delivery config | `useDeliveryConfig` | localStorage preferences | Table à créer | Préférences |

### ❌ Non Synchronisé (localStorage/mocks critiques)

| Page/Route | Hook(s) | Source actuelle | Source Supabase cible | Gap | Priorité | Effort |
|------------|---------|-----------------|----------------------|-----|----------|--------|
| /ag/[id]/votes-correspondance | `useVotesCorrespondance` | `localStorage.getItem('vote-correspondance-*')` | `ag_correspondence_votes` (existe) | WRITE localStorage | P0 | M |
| /ag/[id]/votes-correspondance/[coproId] | Page directe | `localStorage` | `register_correspondence_form_votes()` RPC | WRITE | P0 | S |
| /ag/[id]/feuille-presence | Page directe | `localStorage.getItem('feuille-presence-*')` | `ag_attendance` | Doublonne avec attendance | P1 | S |
| /ag/[id]/designation-roles | Page directe | `localStorage.getItem('roles-ag-*')` | `ag_session_drafts.roles` | WRITE | P1 | S |
| /ag/[id]/convocation | Page directe | `localStorage.setItem('ag-sent-*')` | `ag_meetings.status` = 'convoked' | Flag envoi | P1 | S |
| /ag/resolutions (bibliothèque) | `useAgResolutionsPage` | `localStorage('custom-resolutions-library')` | `resolution_templates` (à créer) | Bibliothèque custom | P2 | M |
| Pouvoirs | `usePouvoirs` | `localStorage('pouvoirs-*')` | `ag_attendance.proxy_id` | Mandats | P1 | S |
| Projector sync | `useProjectorSync` | `localStorage(PROJECTOR_*)` | Realtime channel | Sync projecteur | P2 | M |

**Services AG avec localStorage :**
```
src/lib/services/ag-session-persistence.service.ts (Supabase primary, localStorage fallback)
src/lib/services/pv-signature.service.ts (localStorage complet)
src/lib/services/electronic-signature.service.ts (localStorage)
src/lib/ag/draft-persistence.ts (Supabase + localStorage fallback)
```

**Mocks AG à éliminer :**
```
src/data/mock/index.ts → MOCK_COPROPRIETAIRES, MOCK_ASSEMBLEES
src/lib/mock-data/entities/assemblees.ts
```

---

## 3. MODULE DOCUMENTS (GED)

### ✅ Synchronisé Supabase (READ + WRITE)

| Page/Route | Hook(s) | Source Supabase | Status |
|------------|---------|-----------------|--------|
| /documents/ged | `useDocumentsData.useGedPage` | `documents`, `document_folders` | ✅ Complet |
| Upload/Download | `useDocuments.uploadDocument` | Supabase Storage + `documents` | ✅ Complet |
| Folders | `useFolders` | `document_folders` | ✅ Complet |
| Stats | `useDocumentStats` | `v_document_stats` | ✅ READ |
| Versions | `useDocumentVersions` | `document_versions` | ✅ READ |

### 🟡 Partiel

| Page/Route | Hook(s) | Source actuelle | Source Supabase cible | Gap |
|------------|---------|-----------------|----------------------|-----|
| Search history | `useDocumentSearch` | `localStorage('ged-search-history')` | N/A (UX local ok) | Acceptable |
| Metadata | `document-metadata.service` | `MOCK_DOCUMENT_METADATA` | `documents.metadata` JSONB | Enrichissement |
| Versioning | `document-versioning.service` | `MOCK_DOCUMENT_VERSIONING` | `document_versions` | Utiliser table |
| Linking | `document-linking.service` | `MOCK_DOCUMENT_LINKS` | `document_entity_links` | Liens entités |

### ❌ Non Synchronisé

| Page/Route | Hook(s) | Source actuelle | Source Supabase cible | Gap | Priorité | Effort |
|------------|---------|-----------------|----------------------|-----|----------|--------|
| /documents/ledger/full | Page directe | `MOCK_OPERATIONS` | `v_general_ledger` | READ | P2 | S |
| Templates PV | `pv-template.service` | Migration legacy ok | `pv_templates` | Déjà migré (cleanup done) | - | - |

**Mocks Documents à éliminer :**
```
src/lib/services/document-metadata.service.ts (MOCK_DOCUMENT_METADATA)
src/lib/services/document-versioning.service.ts (MOCK_DOCUMENT_VERSIONING)
src/lib/services/document-linking.service.ts (MOCK_DOCUMENT_LINKS)
src/lib/mock-data/entities/documents.ts
```

---

## 4. MODULE COMMUNICATION & SOCIAL

### ✅ Synchronisé Supabase (READ + WRITE)

| Page/Route | Hook(s) | Source Supabase | Status |
|------------|---------|-----------------|--------|
| /communication/mur | `useCommunicationData.useWallPosts` | `wall_posts`, `wall_comments`, `wall_likes` | ✅ Complet |
| /communication/mur/[id] | `useWallPost` | Posts + comments | ✅ Complet |
| /communication/evenements | `useEvents`, `useUpcomingEvents` | `calendar_events` | ✅ Complet |
| /communication/messagerie-privee | `useConversations`, `useConversation` | `conversations`, `messages`, `conversation_members` | ✅ Complet |
| Actions (like, pin, comment) | `useToggleLike`, `useTogglePin`, `useCreateComment` | RPC via Edge Function | ✅ Complet |

### 🟡 Partiel

| Page/Route | Hook(s) | Source actuelle | Source Supabase cible | Gap |
|------------|---------|-----------------|----------------------|-----|
| /communication/mail | `useMailData`, `mail.service` | `MOCK_MAILS` + localStorage | `mail_campaigns`, `mail_recipients` | Module mail dédié |

### ❌ Non Synchronisé

| Page/Route | Hook(s) | Source actuelle | Source Supabase cible | Gap | Priorité | Effort |
|------------|---------|-----------------|----------------------|-----|----------|--------|
| /communication/recherche | Page directe | `MOCK_RESULTS` inline | Full-text search RPC | Search global | P2 | M |
| Mail service complet | `mail.service.ts` | `localStorage('mail-storage')` | `mail_campaigns`, `mail_templates` | Migration complète | P1 | L |

**Mocks Communication à éliminer :**
```
src/app/(dashboard)/communication/recherche/page.tsx (MOCK_RESULTS inline)
src/data/mock/mail.mock.ts
src/lib/services/mail.service.ts (MOCK_MAILS + localStorage)
src/lib/mock-data/entities/conversations.ts
src/lib/mock-data/entities/events.ts
src/lib/mock-data/entities/forum.ts
```

---

## 5. SERVICES TRANSVERSES (localStorage)

### Acceptable (préférences UI)

| Service | Usage | Verdict |
|---------|-------|---------|
| `ThemeProvider` | Theme dark/light | ✅ OK (UX) |
| `Sidebar` | Largeur sidebar | ✅ OK (UX) |
| `useDocumentSearch` | Historique recherche | ✅ OK (UX) |
| `useNotifications` | Notifs lues | 🟡 Pourrait être DB |
| `useDevMockData` | Dev mock size | ✅ OK (dev only) |

### À migrer

| Service | localStorage Key | Table cible | Priorité |
|---------|-----------------|-------------|----------|
| `ag-session-persistence.service` | `presences-*`, `votes-*`, `roles-*` | `ag_session_drafts` | P0 (fallback) |
| `pv-signature.service` | `pv-signatures-*` | `ag_pv_signatures` (à créer) | P1 |
| `electronic-signature.service` | `signature-requests` | `electronic_signature_requests` | P2 |
| `mail.service` | `mail-storage` | `mail_campaigns` | P1 |
| Delivery preferences | `ag-delivery-preferences` | `user_preferences` JSONB | P2 |

---

## 6. FICHIERS DEPRECATED À SUPPRIMER

Les fichiers suivants sont marqués DEPRECATED et ne doivent plus être importés :

```typescript
// ❌ src/shared/services/financeApi.ts - DEPRECATED
// ❌ src/shared/hooks/useFinance.ts - DEPRECATED

// Vérification qu'ils ne sont plus importés :
// rg "from '@/shared/services/financeApi'" --type ts
// rg "from '@/shared/hooks/useFinance'" --type ts
```

**Imports à vérifier :**
- `financeApi.ts` : Doit être remplacé par `@/lib/finance/api`
- `useFinance.ts` : Doit être remplacé par `useFinanceData` / `useBudgetData`

---

## 7. TABLES SUPABASE UTILISÉES

### Finance
- `calls_for_funds`, `call_lines`, `payments`
- `supplier_invoices`, `suppliers`
- `bank_movements`, `bank_accounts`
- `accounts`, `ledger_transactions`, `ledger_entries`
- `repartition_keys`, `accounting_periods`
- `payment_reminders`, `payment_reminder_rules`
- `alur_transfers`

### AG
- `ag_meetings`, `ag_resolutions`, `ag_votes`
- `ag_attendance`, `ag_documents`
- `ag_notifications`, `ag_notification_events`
- `ag_session_drafts`, `ag_correspondence_votes`

### Documents
- `documents`, `document_folders`, `document_versions`
- `document_access_logs`

### Communication
- `wall_posts`, `wall_comments`, `wall_likes`
- `calendar_events`
- `conversations`, `messages`, `conversation_members`

### Vues utilisées
- `v_ag_overview`, `v_calls_overview`, `v_call_lines_detailed`
- `v_unpaid_lots`, `v_unpaid_with_reminders`
- `v_general_ledger`, `v_trial_balance`
- `v_supplier_invoices_overview`
- `v_document_stats`, `v_ag_drafts_progress`

---

## 8. COMMANDES DE VÉRIFICATION

```bash
# Compter les usages localStorage (hors docs)
rg "localStorage\.(getItem|setItem)" --type ts -c | grep -v "docs/" | grep -v ".test.ts"

# Compter les MOCK_ patterns (hors docs)
rg "MOCK_" --type ts -c | grep -v "docs/" | grep -v ".test.ts"

# Vérifier imports deprecated
rg "from '@/shared/services/financeApi'" --type ts
rg "from '@/shared/hooks/useFinance'" --type ts

# Lister les hooks *Data.ts
ls -la src/hooks/modules/use*Data.ts
```

---

*Audit généré le 30 janvier 2026*
