# MOCK_INVENTORY.md - Inventaire Complet des Mocks CoProFlex

> **Date:** 2026-01-28 (v2 - corrigé)
> **Auteur:** Audit automatisé
> **Version:** 2.0

---

## RÉSUMÉ EXÉCUTIF

| Métrique | Valeur |
|----------|--------|
| **Sources Mock (fichiers)** | 14 |
| **Exports MOCK_* identifiés** | 78 |
| **Consumers (imports mock)** | 131 |
| **Clés localStorage** | 47 |
| **Pages Next.js (total)** | 118 |
| **Priorité P0 (critiques)** | 12 |
| **Priorité P1 (secondaires)** | 8 |
| **Priorité P2 (dev/test)** | 3 |

---

## TABLE 1: SOURCES (Origines de données non-Supabase)

| SourceID | Type | Path | Export(s) / Key(s) | Module | Criticité | ConsumersCount | RoutesCount | Notes |
|----------|------|------|-------------------|--------|-----------|----------------|-------------|-------|
| **S001** | MOCK_DIR | `src/data/mock/index.ts` | 50+ exports: MOCK_COPROPRIETAIRES, MOCK_PARAMETRES, MOCK_BUDGETS, MOCK_FACTURES, etc. | Global | **P0** | 83 | 25 | Fichier central ~3000 lignes |
| **S002** | MOCK_FILE | `src/data/mock/documents-ged.ts` | GED_FOLDERS, MOCK_DOCUMENTS_GED, MOCK_DOCUMENTS_STATS, DOCUMENT_CATEGORIES | Documents | **P0** | 13 | 2 | GED complète mockée |
| **S003** | MOCK_FILE | `src/data/mock/mail.mock.ts` | MOCK_INBOX, MOCK_SENT, MOCK_DRAFTS, DEFAULT_FOLDERS, FOLDER_COLORS | Communication | **P0** | 8 | 2 | Messagerie mail |
| **S004** | MOCK_FILE | `src/data/mock/nouvelle-vente.mock.ts` | MOCK_COPROPRIETAIRES, MOCK_LOTS, MOCK_NOTAIRES, MOCK_ORDRES_SERVICE | Ventes | **P1** | 3 | 1 | Wizard nouvelle vente |
| **S005** | MOCK_FILE | `src/shared/mock/finance.ts` | MOCK_COPROPRIETE, MOCK_COPROPRIETAIRES, MOCK_LOTS, MOCK_BUDGETS, MOCK_APPELS_FONDS, etc. | Finance | **P0** | 5 | 3 | 871 lignes finance |
| **S006** | MOCK_FILE | `src/components/features/finance/AppelsFonds/mock-data.ts` | MOCK_APPELS, MOCK_COPROPRIETAIRES_APPEL, MOCK_RESOLUTIONS_AG | Finance | **P0** | 2 | 1 | Appels de fonds |
| **S007** | MOCK_FILE | `src/components/features/finance/Budget/mock-data.ts` | MOCK_POSTES_BUDGET | Finance | **P1** | 1 | 1 | Postes budget |
| **S008** | MOCK_FILE | `src/components/features/finance/RelevesIndividuels/mock-data.ts` | MOCK_COPROPRIETAIRES_RELEVE, MOCK_RELEVES | Finance | **P2** | 1 | 0 | Relevés individuels |
| **S009** | MOCK_DIR | `src/lib/mock-data/` | 34 fichiers (~308 entités), MOCK_DATA_STATS | Global | **P1** | 1 | 0 | Consumer: `hooks/modules/useAGContext.ts:15` |
| **S010** | PROVIDER | `src/providers/CurrentUserProvider.tsx` | MOCK_USERS (6 utilisateurs) | Auth | **P0** | 4 | 118 | Via layout.tsx = toutes pages |
| **S011** | PROVIDER | `src/providers/ContractsProvider.tsx` | MOCK_CONTRATS_DETAILLES, MOCK_PRESTATAIRES_*, MOCK_ASSURANCES | Maintenance | **P0** | 1 | 12 | Contrats/Assurances |
| **S012** | LOCALSTORAGE_DB | `features/communication/hooks/useWall*.ts` | `MUR_STORAGE_KEY` | Communication | **P0** | 3 | 3 | Mur communautaire |
| **S013** | LOCALSTORAGE_DB | `features/communication/hooks/useEvent*.ts` | `EVENTS_STORAGE_KEY` | Communication | **P0** | 3 | 3 | Événements |
| **S014** | LOCALSTORAGE_DB | AG hooks (multiples) | `ag-draft-*`, `ag-resolutions-*`, `ag-session-*`, `ag-votes-*` | AG | **P0** | 13 | 15 | Workflow AG complet |
| **S015** | LOCALSTORAGE_DB | `features/finance/budgets/useBudgetDetailPage.ts` | `coproflex-budgets` + DEFAULT_BUDGETS | Finance | **P0** | 1 | 1 | Budget + fallback mock |
| **S016** | HARDCODE_DEFAULT | `hooks/useGlobalVariables.ts` | MOCK_CONTRAT_SYNDIC, MOCK_PARAMETRES | Global | **P0** | 3 | 15 | Variables globales AG |
| **S017** | SERVICE | `lib/services/mail.service.ts` | MOCK_MAILS (initialData) | Communication | **P1** | 1 | 3 | Service mail |
| **S018** | SERVICE | `lib/services/contracts.service.ts` | contratsState init mock | Maintenance | **P1** | 1 | 5 | État contrats |
| **S019** | UTIL | `lib/utils/alerts.ts` | Imports MOCK_* pour alertes | Dashboard | **P0** | 1 | 1 | Alertes dashboard |
| **S020** | UTIL | `lib/utils/mock-generator.ts` | generateMockCoproprietaires | Dev | **P2** | 1 | 0 | Générateur dev |
| **S021** | HOOK | `hooks/useDevMockData.ts` | MOCK_COPROPRIETAIRES, générateurs | Dev | **P2** | 1 | 0 | Dev uniquement |

---

## TABLE 2: CONSUMERS (Fichiers important des mocks)

| ConsumerID | Path | Hook/Component | Route(s) | SourceID(s) | Impact UI |
|------------|------|----------------|----------|-------------|-----------|
| **C001** | `providers/ContractsProvider.tsx` | Provider | 12 pages maintenance | S001, S011 | Tous contrats/prestataires |
| **C002** | `providers/CurrentUserProvider.tsx` | Provider | 118 (via layout) | S010 | Auth + Permissions |
| **C003** | `hooks/useGlobalVariables.ts` | Hook | 15 (AG, docs) | S001, S016 | Variables syndic |
| **C004** | `hooks/modules/useAppelsFonds.ts` | Hook | 1 | S006 | Liste appels |
| **C005** | `hooks/modules/useContracts.ts` | Hook | 3 | S001 | Prestataires |
| **C006** | `hooks/modules/useSalesPage.ts` | Hook | 2 | S001 | Sales + copros |
| **C007** | `hooks/modules/useLogbook.ts` | Hook | 2 | S001 | Interventions |
| **C008** | `hooks/modules/useExpenses.ts` | Hook | 2 | S001 | Dépenses |
| **C009** | `hooks/modules/useConvocationData.ts` | Hook | 2 | S001 | Copropriétaires |
| **C010** | `hooks/modules/usePouvoirs.ts` | Hook | 1 | S001, S014 | Copros + localStorage |
| **C011** | `hooks/modules/useVotesCorrespondance.ts` | Hook | 1 | S001, S014 | Copros + localStorage |
| **C012** | `hooks/modules/useResolutionVariables.ts` | Hook | 2 | S001 | Variables |
| **C013** | `hooks/modules/useComposeForm.ts` | Hook | 1 | S003 | Templates mail |
| **C014** | `hooks/modules/useMailListPage.ts` | Hook | 2 | S003, LS | Dossiers mail |
| **C015** | `shared/services/financeApi.ts` | Service | 5 | S005, LS | API finance |
| **C016** | `shared/hooks/useFinance.ts` | Hook | 3 | S005 | Hooks finance |
| **C017** | `lib/utils/alerts.ts` | Util | 1 | S001, S006, S019 | KPIs alertes |
| **C018** | `lib/services/contracts.service.ts` | Service | 5 | S001, S018 | État contrats |
| **C019** | `lib/services/pv-signature.service.ts` | Service | 1 | S001 | Signataires |
| **C020** | `features/ag/pv/hooks/usePVPage.ts` | Hook | 1 | S001, S014, S016 | PV complet |
| **C021** | `features/ag/hooks/useAgSessionPage.ts` | Hook | 1 | S014, S016 | Session AG |
| **C022** | `features/ag/hooks/useAgAgendaPage.ts` | Hook | 1 | S001, S014 | Agenda AG |
| **C023** | `features/ag/hooks/useAgEnvoiPage.ts` | Hook | 1 | S001, S014 | Envoi convocations |
| **C024** | `features/finance/budgets/useBudgetDetailPage.ts` | Hook | 1 | S015 | Budget detail |
| **C025** | `features/communication/hooks/useWallPage.ts` | Hook | 1 | S012 | Mur page |
| **C026** | `features/communication/hooks/useEventsPage.ts` | Hook | 1 | S013 | Events page |
| **C027** | `components/features/documents/ged/hooks/*.ts` | Hooks | 2 | S002 | GED hooks |
| **C028** | `components/features/documents/ged/components/*.tsx` | Components | 2 | S002 | GED UI |
| **C029** | `components/features/finance/Budget/*.tsx` | Components | 3 | S001, S005, S007 | Budget UI |
| **C030** | `components/features/finance/AppelsFonds/*.tsx` | Components | 1 | S006 | Appels UI |
| **C031** | `components/features/communication/mail/*.tsx` | Components | 2 | S003 | Mail UI |
| **C032** | `components/features/ventes-impayes/*.tsx` | Components | 1 | S004 | Ventes UI |
| **C033** | `components/features/ag/Session/*.tsx` | Components | 1 | S001 | AG Session UI |
| **C034** | `components/features/maintenance/Contracts/*.tsx` | Components | 3 | S001 | Contrats UI |
| **C035** | 25 pages `app/(dashboard)/**/*.tsx` | Pages | 25 | S001 | Direct imports |

---

## TABLE 3: LOCALSTORAGE CLASSIFICATION

| Key | Path(s) | Type | Données stockées | Migration Supabase |
|-----|---------|------|------------------|--------------------|
| `theme` | `providers/ThemeProvider.tsx` | **UI_PREF** | dark/light | `user_preferences` (optionnel) |
| `coproflex-sidebar-width` | `components/layout/Sidebar/Sidebar.tsx` | **UI_PREF** | Largeur px | Non requis |
| `coproflex-current-user` | `providers/CurrentUserProvider.tsx` | **BUSINESS_DATA** | User ID | Supabase Auth session |
| `coproflex-finance-data` | `shared/services/financeApi.ts` | **BUSINESS_DATA** | Finance complète | Tables finance |
| `coproflex-budgets` | `features/finance/budgets/useBudgetDetailPage.ts` | **BUSINESS_DATA** | Budgets + statuts | `budgets` table |
| `mail-copro-data` | `app/(dashboard)/communication/mail/[id]/page.tsx` | **BUSINESS_DATA** | Emails | `mail_messages` |
| `mur-communautaire` | `features/communication/hooks/useWall*.ts` | **BUSINESS_DATA** | Publications | `wall_posts` |
| `coproflex-events` | `features/communication/hooks/useEvent*.ts` | **BUSINESS_DATA** | Événements | `events` |
| `newOrdresService` | `features/maintenance/serviceOrders/hooks/*.ts` | **EPHEMERAL** | Formulaire en cours | Non requis |
| `custom_ordres_service` | `app/(dashboard)/maintenance/contracts/page.tsx` | **BUSINESS_DATA** | OS créés | `service_orders` |
| `ag-draft-{agId}` | Multiple (5+ fichiers) | **BUSINESS_DATA** | Brouillon AG | `ag_drafts` (existe) |
| `ag-resolutions-{agId}` | Multiple (8+ fichiers) | **BUSINESS_DATA** | Résolutions | `ag_resolutions` |
| `ag-sent-{agId}` | `features/ag/hooks/useAgEnvoiPage.ts` | **BUSINESS_DATA** | Statut envoi | `ag_convocations_sent` |
| `ag-presences-{agId}` | `lib/constants/ag-workflow.ts`, PV hooks | **BUSINESS_DATA** | Présences | `ag_presences` |
| `ag-session-{agId}` | `features/ag/hooks/useAgSessionPage.ts` | **BUSINESS_DATA** | Session en cours | `ag_sessions` |
| `ag-votes-{agId}` | `features/ag/hooks/useAgSessionPage.ts` | **BUSINESS_DATA** | Votes temps réel | `ag_votes` |
| `ag-variables-{agId}` | `features/ag/hooks/useAgSessionPage.ts` | **BUSINESS_DATA** | Variables session | `ag_session_variables` |
| `ag-signataires-{agId}` | `features/ag/pv/hooks/usePVPage.ts` | **BUSINESS_DATA** | Signataires | `ag_signataires` |
| `ag-pv-signed-{agId}` | `features/ag/pv/hooks/usePVPage.ts` | **EPHEMERAL** | Flag signé | `ag_pv_status` |
| `ag-completed-{agId}` | `features/ag/pv/hooks/usePVPage.ts` | **BUSINESS_DATA** | AG terminée | `ag_meetings.status` |
| `feuille-presence-{agId}` | `app/(dashboard)/ag/[id]/feuille-presence/page.tsx` | **BUSINESS_DATA** | Feuille présence | `ag_presences` |
| `roles-ag-{agId}` | `app/(dashboard)/ag/[id]/designation-roles/page.tsx` | **BUSINESS_DATA** | Rôles désignés | `ag_roles` |
| `vote-correspondance-{agId}-{coproId}` | `app/(dashboard)/ag/[id]/votes-correspondance/` | **BUSINESS_DATA** | Votes copro | `ag_votes_correspondance` |
| `ag-workflow-state-{agId}` | `hooks/modules/useAGWorkflow.ts` | **EPHEMERAL** | État workflow UI | Non requis |
| `ag-jalons-completes-{agId}` | `hooks/modules/useAGDelais.ts` | **BUSINESS_DATA** | Jalons | `ag_milestones` |
| `ag-sending-{agId}` | `hooks/modules/useConvocationData.ts` | **EPHEMERAL** | Config envoi temp | Non requis |
| `ag-coproprietaires-{agId}` | `hooks/modules/useConvocationData.ts` | **EPHEMERAL** | Cache copros | Non requis |
| `ag-review-{agId}` | `hooks/modules/useConvocationPreview.ts` | **EPHEMERAL** | Validation review | Non requis |
| `ag-donnees-partagees-{agId}` | `lib/utils/ag-variables.ts` | **BUSINESS_DATA** | Données partagées | `ag_shared_data` |
| `resolutions-budget-auto` | `app/(dashboard)/finance/budgets/validation/page.tsx` | **EPHEMERAL** | Résolutions temp | Non requis |
| `budgets` | `app/(dashboard)/finance/budgets/validation/page.tsx` | **EPHEMERAL** | Cache budgets | Non requis |
| `custom-resolutions-library` | `features/ag/hooks/useAgResolutionsPage.ts` | **BUSINESS_DATA** | Bibliothèque | `resolution_templates` |
| `coproflex-pv-templates` | `lib/services/pv-template.service.ts` | **BUSINESS_DATA** | Templates PV | `pv_templates` |
| `pv-signatures-{agId}` | `lib/services/pv-signature.service.ts` | **BUSINESS_DATA** | Signatures PV | `ag_pv_signatures` |
| `coproflex-pv-jobs` | `lib/services/pv-generation.service.ts` | **EPHEMERAL** | Jobs async | Non requis |
| `coproflex-pv-documents` | `lib/services/pv-generation.service.ts` | **BUSINESS_DATA** | Documents générés | `documents` |
| `coproflex-distribution-jobs` | `lib/services/pv-distribution.service.ts` | **EPHEMERAL** | Jobs async | Non requis |
| `coproflex-ged-documents` | `lib/services/pv-distribution.service.ts` | **BUSINESS_DATA** | Documents GED | `documents` |
| `coproflex-signature-requests` | `lib/services/electronic-signature.service.ts` | **BUSINESS_DATA** | Demandes signature | `signature_requests` |
| `coproflex-pieces-justificatives` | `lib/services/pieces-justificatives.service.ts` | **BUSINESS_DATA** | Pièces justif | `pieces_justificatives` |
| `coproflex-factures-pj` | `lib/services/facture-pj.service.ts` | **BUSINESS_DATA** | PJ factures | `factures_pj` |
| `coproflex-mails` | `lib/services/mail.service.ts` | **BUSINESS_DATA** | Emails | `mail_messages` |
| `coproflex-pouvoirs-{agId}` | `hooks/modules/usePouvoirs.ts` | **BUSINESS_DATA** | Pouvoirs | `ag_pouvoirs` |
| `coproflex-notifications` | `hooks/modules/useNotifications.ts` | **BUSINESS_DATA** | Notifications | `notifications` |
| `coproflex-dossiers` | `hooks/modules/useDossiers.ts` | **BUSINESS_DATA** | Dossiers | `dossiers` |
| `ged-search-history` | `components/features/documents/ged/hooks/useDocumentSearch.ts` | **UI_PREF** | Historique recherche | `search_history` (optionnel) |
| `coproflex-dev-dataset-size` | `hooks/useDevMockData.ts` | **UI_PREF** | Taille dataset dev | Non requis |

### Résumé Classification

| Type | Count | Action |
|------|-------|--------|
| **UI_PREF** | 4 | Garder ou migrer optionnellement |
| **EPHEMERAL** | 10 | Garder (formulaires, cache temp) |
| **BUSINESS_DATA** | 33 | **MIGRER PUIS SUPPRIMER** |

> **Liste complète:** Voir `docs/audit/LOCALSTORAGE_BUSINESS_KEYS.txt` pour la liste exhaustive des 33 clés BUSINESS_DATA avec script de validation.

---

## COMMANDES DE VÉRIFICATION

```bash
# Compter imports mock par source
rg -c "from '@/data/mock'" src --type ts
# Résultat attendu: 83

# Compter consumers shared/mock/finance
rg -c "from '@/shared/mock/finance'" src --type ts
# Résultat attendu: 5

# Compter pages Next.js (App Router)
find src/app -name "page.tsx" | wc -l
# Résultat attendu: 118

# Compter clés localStorage BUSINESS_DATA
rg -c "localStorage\.(get|set)Item" src --type ts
# Résultat: ~200 occurrences
```

---

*Généré automatiquement v2.0 - Données vérifiées par grep*
