# AUDIT PLATEFORME COPROFLEX
## Produit → Data → Logique Métier

**Date:** 2026-01-27
**Projet:** CoProFlex - Plateforme SaaS de gestion de copropriété
**Supabase Project ID:** iyfesbjnkpynmwlsmxnp

---

## RÉSUMÉ EXÉCUTIF

| Métrique | Valeur |
|----------|--------|
| Tables Supabase | 67 |
| Vues Supabase | ~60 |
| Fonctions/RPC | 107 |
| Politiques RLS | ~200 |
| Pages Frontend | ~100 |
| Pages connectées Supabase | ~30 (~30%) |
| Pages avec Mock Data | ~45 (~45%) |
| Pages statiques/navigation | ~25 (~25%) |

**VERDICT GLOBAL: PARTIEL** - Infrastructure Supabase solide mais de nombreuses pages utilisent encore des données mock.

---

## 1. ASSEMBLÉES GÉNÉRALES (AG)

### 1.1 Dashboard AG (`/ag/dashboard`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Liste AG, prochaine AG, historique, KPIs |
| **B) Implémentation** | ✓ SUPABASE | `useAgMeetings()` → `src/hooks/modules/useAgData.ts` |
| **C) Tables DB** | ✓ | `ag_meetings`, `ag_resolutions`, `ag_attendance` |
| **D) Invariants** | ✓ | Calcul quorum côté DB (`compute_ag_quorum`) |
| **E) RLS** | ✓ | Gestionnaire: ALL, Copro: SELECT (status ≠ draft) |
| **F) Verdict** | **OK** | |

### 1.2 Session AG (`/ag/[id]/session`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Votes temps réel, calcul majorités Art.24/25/26 |
| **B) Implémentation** | ✓ SUPABASE | `useAgSessionPage()` → `src/features/ag/hooks/useAgSessionPage.ts` |
| **C) Tables DB** | ✓ | `ag_votes`, `ag_session_drafts`, `ag_resolutions` |
| **D) Invariants** | ✓ | `calculate_resolution_result()`, `compute_majority_threshold()`, `cast_vote()` |
| **E) RLS** | ✓ | Gestionnaire: ALL, Vote unique par copro (trigger) |
| **F) Verdict** | **OK** | |

### 1.3 Votes par Correspondance (`/ag/[id]/votes-correspondance`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Saisie votes anticipés, validation avant AG |
| **B) Implémentation** | ⚠️ MIXTE | `useCorrespondenceVotes()` + données mock pour liste copros |
| **C) Tables DB** | ✓ | `ag_correspondence_votes` |
| **D) Invariants** | ✓ | Vérification existence copropriétaire côté DB |
| **E) RLS** | ✓ | Gestionnaire: ALL |
| **F) Verdict** | **PARTIEL** | Liste copropriétaires mockée |
| **G) TODO** | Connecter à `coproprietaires` + `lot_owners` |

### 1.4 Bibliothèque Résolutions (`/ag/resolutions`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Modèles résolutions standard (14 obligatoires) |
| **B) Implémentation** | ⚠️ MIXTE | `useResolutionLibrary()` - constantes + Supabase |
| **C) Tables DB** | ✓ | `ag_resolutions` (custom), constantes pour standards |
| **D) Invariants** | ✓ | `create_ag_with_standard_resolutions()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **OK** | Standards en constantes = acceptable |

### 1.5 Convocations (`/ag/[id]/convocation`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Génération PDF, envoi, délai 21j |
| **B) Implémentation** | ✓ SUPABASE | `useAgEnvoiPage()` |
| **C) Tables DB** | ✓ | `ag_notifications`, `ag_notification_events` |
| **D) Invariants** | ✓ | `check_convocation_delay()`, `create_ag_notification()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **OK** | |

---

## 2. FINANCE & COMPTABILITÉ

### 2.1 Budget Courant (`/finance/budget-current`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Suivi consommation budget |
| **B) Implémentation** | ❌ MOCK | `MOCK_BUDGETS`, `MOCK_EXERCICE_ACTUEL` → `src/data/mock/index.ts` |
| **C) Tables DB** | ✓ | `budgets`, `budget_lines` EXISTENT |
| **D) Invariants** | ✓ | `calculate_budget_projection()`, `validate_budget()` EXISTENT |
| **E) RLS** | ✓ | Politiques en place |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Remplacer MOCK par vue `v_budgets_summary` |

### 2.2 Appels de Fonds (`/finance/calls`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Génération, échéancier, suivi paiements |
| **B) Implémentation** | ❌ MOCK | `MOCK_APPELS_FONDS` → `src/app/(dashboard)/finance/calls/page.tsx:4` |
| **C) Tables DB** | ✓ | `call_for_funds`, `call_for_funds_lines`, `payments` EXISTENT |
| **D) Invariants** | ✓ | `allocate_payment()`, `validate_call_for_funds_total()` EXISTENT |
| **E) RLS** | ✓ | Copro voit ses propres lignes (`user_is_lot_owner`) |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Connecter à `v_calls_overview`, `v_calls_collection_stats` |

### 2.3 Factures (`/finance/factures`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Création, validation, paiement fournisseurs |
| **B) Implémentation** | ⚠️ MIXTE | Hook + données mock |
| **C) Tables DB** | ✓ | `supplier_invoices`, `supplier_invoice_lines`, `supplier_payments` |
| **D) Invariants** | ✓ | `validate_supplier_invoice_total()`, `validate_supplier_payment()` |
| **E) RLS** | ✓ | Gestionnaire only |
| **F) Verdict** | **PARTIEL** | |
| **G) TODO** | Utiliser `v_supplier_invoices_overview` |

### 2.4 Mouvements Bancaires (`/finance/bank-movements`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Import relevés, rapprochement |
| **B) Implémentation** | ✓ SUPABASE | `useMouvementsBancairesPage()` |
| **C) Tables DB** | ✓ | `bank_movements`, `bank_matches` |
| **D) Invariants** | ✓ | `refresh_bank_movement_status()` |
| **E) RLS** | ✓ | Gestionnaire only |
| **F) Verdict** | **OK** | |

### 2.5 Comptabilité - Grand Livre (`/documents/ledger`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Journal, écritures, balance |
| **B) Implémentation** | ⚠️ MIXTE | `useLedger()` avec fallback mock |
| **C) Tables DB** | ✓ | `ledger_transactions`, `ledger_entries`, `accounts` |
| **D) Invariants** | ✓ | `post_ledger_transaction()`, `check_transaction_balance()`, immutabilité |
| **E) RLS** | ✓ | |
| **F) Verdict** | **PARTIEL** | |
| **G) TODO** | Retirer fallback mock dans `useLedger()` |

### 2.6 Balance (`/documents/balance`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Balance des comptes |
| **B) Implémentation** | ❌ MOCK | Données hardcodées |
| **C) Tables DB** | ✓ | Vue `v_trial_balance` EXISTE |
| **D) Invariants** | ✓ | Equilibre garanti par triggers |
| **E) RLS** | ✓ | |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Connecter à `v_trial_balance` |

---

## 3. DOCUMENTS (GED)

### 3.1 GED Principal (`/documents/ged`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Upload, catégories, versioning, confidentialité |
| **B) Implémentation** | ✓ SUPABASE | `useGedPageSupabase()` avec détection connexion |
| **C) Tables DB** | ✓ | `documents`, `document_folders`, `document_versions`, `document_access` |
| **D) Invariants** | ✓ | `prevent_protected_document_deletion()`, `create_document_version()` |
| **E) RLS** | ✓ | 3 niveaux: public, council, restricted |
| **F) Verdict** | **OK** | Indicateur connexion visible dans UI |

---

## 4. MAINTENANCE

### 4.1 Carnet d'Entretien (`/maintenance/logbook`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Historique interventions, équipements |
| **B) Implémentation** | ⚠️ MIXTE | `useLogbook()` - Services + MOCK_* |
| **C) Tables DB** | ✓ | `logbook_entries` |
| **D) Invariants** | ✓ | `create_logbook_from_service_order()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **PARTIEL** | |
| **G) TODO** | Migrer `MOCK_INFORMATIONS_COPROPRIETE`, `MOCK_TRAVAUX_PREVISIONNELS` |

### 4.2 Contrats (`/maintenance/contracts`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Gestion contrats, alertes renouvellement |
| **B) Implémentation** | ✓ SUPABASE | `useContractDetailPage()`, `ContractsProvider` |
| **C) Tables DB** | ✓ | `contracts` |
| **D) Invariants** | ✓ | `update_contract_status_auto()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **OK** | |

### 4.3 Ordres de Service (`/maintenance/service-orders`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Workflow complet, statuts |
| **B) Implémentation** | ✓ SUPABASE | `useServiceOrdersListPage()` |
| **C) Tables DB** | ✓ | `service_orders`, `service_order_events` |
| **D) Invariants** | ✓ | `is_valid_service_order_transition()`, `update_service_order_status()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **OK** | |

### 4.4 Prestataires (`/maintenance/providers`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Annuaire, évaluation |
| **B) Implémentation** | ✓ SUPABASE | `useProvidersHubPage()` |
| **C) Tables DB** | ✓ | `providers` |
| **D) Invariants** | ✓ | `update_provider_stats()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **OK** | |

---

## 5. COMMUNICATION

### 5.1 Mur Communautaire (`/communication/mur`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Posts, commentaires, likes |
| **B) Implémentation** | ❌ MOCK | `MOCK_PUBLICATIONS` + localStorage → `useWallPage.ts:9` |
| **C) Tables DB** | ✓ | `wall_posts`, `wall_comments`, `wall_likes` EXISTENT |
| **D) Invariants** | ✓ | `update_wall_post_comments_count()`, `update_wall_post_likes_count()` |
| **E) RLS** | ✓ | Visibilité par rôle (`can_view_content`) |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Connecter à `v_wall_feed`, remplacer localStorage |

### 5.2 Messagerie (`/communication/messagerie`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Conversations privées |
| **B) Implémentation** | ✓ SUPABASE | Vue `v_conversations_overview` |
| **C) Tables DB** | ✓ | `conversations`, `messages`, `conversation_members` |
| **D) Invariants** | ✓ | `mark_conversation_read()`, `update_conversation_last_message()` |
| **E) RLS** | ✓ | `is_conversation_member()` |
| **F) Verdict** | **OK** | |

### 5.3 Mail Officiel (`/communication/mail`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Campagnes email, templates |
| **B) Implémentation** | ❌ MOCK | Données mock |
| **C) Tables DB** | ✓ | `mail_campaigns`, `mail_templates`, `mail_inbox` EXISTENT |
| **D) Invariants** | ✓ | `generate_campaign_recipients()`, `update_mail_campaign_stats()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Utiliser `v_mail_campaigns_overview` |

### 5.4 Calendrier/Événements (`/communication/calendrier`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Événements copropriété |
| **B) Implémentation** | ✓ SUPABASE | `useEventEditorPage()` |
| **C) Tables DB** | ✓ | `events` |
| **D) Invariants** | - | |
| **E) RLS** | ✓ | `can_view_content(visibility)` |
| **F) Verdict** | **OK** | |

---

## 6. COPROPRIÉTAIRES & LOTS

### 6.1 Annuaire Copropriétaires (`/coproprietaires`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Liste, édition, contact |
| **B) Implémentation** | ❌ MOCK | `INITIAL_COPROPRIETAIRES` hardcodé → `useCoproprietairesPage.ts:14` |
| **C) Tables DB** | ✓ | `coproprietaires`, `lot_owners` EXISTENT |
| **D) Invariants** | - | |
| **E) RLS** | ✓ | Copro voit son propre record |
| **F) Verdict** | **MANQUANT** | **BLOQUANT ONBOARDING** |
| **G) TODO** | Connecter à `coproprietaires` + `v_lots_with_owners` |

### 6.2 Paramètres Lots (`/settings/lots`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Tantièmes, clés répartition |
| **B) Implémentation** | ❌ MOCK | Données mock |
| **C) Tables DB** | ✓ | `lots`, `repartition_keys`, `repartition_key_lines` EXISTENT |
| **D) Invariants** | ✓ | `compute_repartition_shares()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **MANQUANT** | **BLOQUANT ONBOARDING** |
| **G) TODO** | Connecter à `v_repartition_key_lines_detailed` |

---

## 7. VENTES & IMPAYÉS

### 7.1 Hub Ventes/Impayés (`/ventes-impayes`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Dashboard, stats, actions rapides |
| **B) Implémentation** | ❌ MOCK | `VENTES_IMPAYES_STATS`, `VENTES_RECENTES` → `ventes-impayes.mock.ts` |
| **C) Tables DB** | ✓ | `mutations` EXISTE |
| **D) Invariants** | ✓ | `validate_mutation()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Connecter à `v_mutations_overview` |

### 7.2 Gestion Impayés (`/ventes-impayes/impayes`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Suivi, relances automatiques |
| **B) Implémentation** | ❌ MOCK | Données hardcodées |
| **C) Tables DB** | ✓ | `payment_reminders`, `payment_reminder_rules` EXISTENT |
| **D) Invariants** | ✓ | `create_payment_reminder()`, `get_pending_reminders_to_send()` |
| **E) RLS** | ✓ | |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Connecter à `v_unpaid_with_reminders`, `v_payment_reminders_overview` |

---

## 8. CONSEIL SYNDICAL

### 8.1 Espace Conseil Syndical (`/conseil-syndical`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Décisions, votes internes, documents |
| **B) Implémentation** | ❌ MOCK | Données mock |
| **C) Tables DB** | ✓ | `council_members`, `council_decisions`, `council_votes`, `council_documents` EXISTENT |
| **D) Invariants** | ✓ | `compute_decision_result()` |
| **E) RLS** | ✓ | `is_council_member()`, `is_council_president()` |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Connecter à `v_council_members`, `v_council_decisions_overview` |

---

## 9. JURIDIQUE

### 9.1 Litiges (`/legal/disputes`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Suivi contentieux |
| **B) Implémentation** | ❌ MOCK | Données mock |
| **C) Tables DB** | ⚠️ | Table `disputes` NON TROUVÉE |
| **D) Invariants** | - | |
| **E) RLS** | - | |
| **F) Verdict** | **MANQUANT** | |
| **G) TODO** | Créer table `disputes` + RLS |

---

## 10. PARAMÈTRES

### 10.1 Paramètres Généraux (`/settings`)
| Critère | Statut | Détails |
|---------|--------|---------|
| **A) Attendus métier** | ✓ | Config copropriété |
| **B) Implémentation** | ❌ MOCK | `MOCK_PARAMETRES` |
| **C) Tables DB** | ✓ | `copros`, `buildings` EXISTENT |
| **D) Invariants** | - | |
| **E) RLS** | ✓ | |
| **F) Verdict** | **PARTIEL** | |
| **G) TODO** | Connecter à `copros` |

---

## SYNTHÈSE PAR MODULE

| Module | Pages | OK | Partiel | Manquant | Score |
|--------|-------|----|---------|---------:|------:|
| **AG** | 8 | 6 | 2 | 0 | 88% |
| **Finance** | 10 | 2 | 3 | 5 | 35% |
| **Documents** | 3 | 3 | 0 | 0 | 100% |
| **Maintenance** | 5 | 4 | 1 | 0 | 90% |
| **Communication** | 5 | 3 | 0 | 2 | 60% |
| **Copropriétaires** | 3 | 0 | 0 | 3 | 0% |
| **Ventes/Impayés** | 4 | 0 | 0 | 4 | 0% |
| **Conseil Syndical** | 1 | 0 | 0 | 1 | 0% |
| **Juridique** | 1 | 0 | 0 | 1 | 0% |
| **Paramètres** | 3 | 0 | 2 | 1 | 33% |
| **TOTAL** | **43** | **18** | **8** | **17** | **51%** |

---

## BLOQUANTS ONBOARDING (Priorité 1)

Ces éléments empêchent l'utilisation en production:

1. **Annuaire Copropriétaires** - Sans liste réelle, impossible de gérer les votes AG
2. **Paramètres Lots/Tantièmes** - Sans tantièmes réels, calculs majorités incorrects
3. **Appels de Fonds** - Fonction essentielle pour cash-flow syndic

## NON-BLOQUANTS (Priorité 2)

1. Mur communautaire - Fonctionnalité sociale
2. Mail officiel - Peut utiliser email externe temporairement
3. Conseil syndical - Peut fonctionner avec emails
4. Litiges - Fonctionnalité avancée
5. Budget courant - Dashboard informatif

---

## CHECKLIST IMPLÉMENTATION

### Phase 1 - Bloquants (Semaines 1-2)

- [ ] **Copropriétaires**
  - [ ] Créer `src/hooks/modules/useCoproprietairesSupabase.ts`
  - [ ] Requêter `coproprietaires` JOIN `lot_owners` JOIN `lots`
  - [ ] Utiliser vue `v_lots_with_owners`
  - [ ] Tester RLS copro vs gestionnaire

- [ ] **Lots & Tantièmes**
  - [ ] Créer page `/settings/lots/page.tsx` connectée
  - [ ] Requêter `repartition_keys`, `repartition_key_lines`
  - [ ] Utiliser `v_repartition_key_totals`

- [ ] **Appels de Fonds**
  - [ ] Remplacer `MOCK_APPELS_FONDS` par `call_for_funds`
  - [ ] Utiliser `v_calls_overview`, `v_call_lines_detailed`
  - [ ] Intégrer `allocate_payment()` RPC

### Phase 2 - Finance (Semaines 3-4)

- [ ] **Budget Courant**
  - [ ] Connecter à `v_budgets_summary`
  - [ ] Utiliser `v_budget_consumption_by_account`

- [ ] **Balance**
  - [ ] Connecter à `v_trial_balance`

- [ ] **Factures**
  - [ ] Finaliser connexion `v_supplier_invoices_overview`

### Phase 3 - Communication (Semaines 5-6)

- [ ] **Mur**
  - [ ] Remplacer localStorage par `wall_posts`
  - [ ] Utiliser `v_wall_feed`
  - [ ] Implémenter realtime Supabase

- [ ] **Mail Officiel**
  - [ ] Connecter `mail_campaigns`
  - [ ] Intégrer envoi réel (Resend/Postmark)

### Phase 4 - Modules Avancés (Semaines 7-8)

- [ ] **Conseil Syndical**
  - [ ] Créer hooks Supabase
  - [ ] Tester RLS `is_council_member()`

- [ ] **Ventes/Impayés**
  - [ ] Connecter `mutations`, `v_mutations_overview`
  - [ ] Implémenter `v_unpaid_with_reminders`

- [ ] **Litiges**
  - [ ] Créer table `disputes`
  - [ ] Ajouter RLS

---

## FONCTIONS SUPABASE DISPONIBLES (107)

### RLS Helpers
- `user_is_copro_manager(copro_id)` - Vérifie rôle gestionnaire
- `user_has_copro_access(copro_id)` - Vérifie membership
- `is_council_member(copro_id)` - Vérifie membre CS
- `user_is_lot_owner(lot_id)` - Vérifie propriétaire lot
- `can_view_content(copro_id, visibility)` - Vérifie niveau accès

### AG
- `create_ag_with_standard_resolutions()` - Crée AG + 14 résolutions
- `calculate_resolution_result()` - Calcul résultat vote
- `compute_majority_threshold()` - Seuil majorité Art.24/25/26
- `compute_ag_quorum()` - Calcul quorum
- `cast_vote()` - Enregistre vote
- `close_ag()` - Clôture AG

### Finance
- `allocate_payment()` - Affecte paiement aux lignes
- `validate_call_for_funds_total()` - Vérifie intégrité appel
- `calculate_budget_projection()` - Projection budget
- `post_ledger_transaction()` - Enregistre écriture comptable
- `create_etat_date_snapshot()` - Génère état daté

### Maintenance
- `create_logbook_from_service_order()` - Crée entrée carnet
- `is_valid_service_order_transition()` - Valide workflow OS
- `update_contract_status_auto()` - MAJ auto statut contrat

---

## VUES SUPABASE DISPONIBLES (~60)

### Finance
- `v_budgets_summary` - Résumé budgets
- `v_budget_consumption_by_account` - Consommation par compte
- `v_calls_overview` - Vue appels de fonds
- `v_call_lines_detailed` - Détail lignes appels
- `v_trial_balance` - Balance comptable
- `v_general_ledger` - Grand livre
- `v_owner_financial_summary` - Résumé financier copro
- `v_unpaid_with_reminders` - Impayés avec relances

### AG
- `v_ag_overview` - Vue AG
- `v_ag_resolutions_results` - Résultats votes
- `v_ag_vote_stats_by_resolution` - Stats par résolution
- `v_ag_attendance_summary` - Feuille présence

### Documents
- `v_documents_with_folder` - Docs avec dossier
- `v_documents_stats` - Stats documents
- `v_accessible_documents` - Docs accessibles (RLS)

### Communication
- `v_wall_feed` - Flux mur
- `v_conversations_overview` - Conversations
- `v_mail_campaigns_overview` - Campagnes mail

### Maintenance
- `v_contracts_overview` - Contrats
- `v_contracts_alerts` - Alertes contrats
- `v_service_orders_overview` - Ordres de service
- `v_logbook_overview` - Carnet entretien

---

## CONCLUSION

L'infrastructure Supabase est **solide et complète**:
- 67 tables couvrant tous les modules
- 107 fonctions pour logique métier côté serveur
- ~60 vues pour requêtes optimisées
- ~200 politiques RLS avec 3 niveaux de rôles

Le travail restant est principalement de **connexion frontend**:
- Remplacer les imports `MOCK_*` par des hooks Supabase
- Utiliser les vues existantes plutôt que requêtes complexes
- Supprimer les fallbacks localStorage

**Estimation effort**: 4-6 semaines développeur pour atteindre 100% connexion.
