La navigation confirme les 8 modules du menu réel. J'ai toute la matière. Je produis maintenant le document de référence consolidé.

# CARTOGRAPHIE COMPLÈTE — ÉTAT DES LIEUX CoProFlex

Document de référence — base LIVE `qqfqrcolzmcbsvfaumiq` · front `Co-Pro-Flex/src` (Next.js 16 / React 19 / TS5 / CSS Modules) · backend Supabase RPC (PostgREST direct, edge non déployées) · snapshot 2026-06-22.

Codes gravité utilisés partout : **🔴 ROUGE** (piège fonctionnel / faux-vert / corruption silencieuse) · **🟠 ORANGE** (dette structurelle coûteuse) · **🟡 JAUNE** (bruit à nettoyer).

---

## 1. VUE D'ENSEMBLE

### 1.1 Les 8 modules de la navigation réelle (`lib/config/navigation.ts`)

La sidebar n'expose que **8 modules** ; tout le reste des routes existe mais est orphelin (atteignable seulement par URL directe). C'est le fait structurant n°1 : **bien plus de surface applicative existe que ce que le menu montre**.

| Module nav | Sous-pages exposées | Routes du domaine RÉELLEMENT existantes |
|---|---|---|
| Dashboard | `/dashboard` | 1 |
| AG | dashboard, new, resolutions | ~20+ (session, convocation, PV, finalisation, pouvoirs, votes-correspondance…) |
| Copropriété | coproprietaires, lots | + tantièmes, lots/[id], répartition |
| **Finance** | comptabilité, opérations-à-apurer, budgets, factures, appels-fonds, mouvements-bancaires, diagnostic (**7**) | **30+** (15+ orphelines : ledger, balance, annexes, closing, expenses, invoices/*, bank-movements, transactions, transfer, unpaid/*, releves-individuels, tantiemes, cles-repartition, budget-current/works) |
| Maintenance | logbook, contracts, providers, service-orders, ppt | + insurance, planned-works, work-domain |
| Conformité 2026 | ppt, dpe, facturx | (tous mock) |
| Documents | GED, courrier officiel, état daté (→ Ventes) | + ledger/balance/annexes/closing/expenses (hors-nav) |
| Communication | mail, messagerie, mur | + events |
| Contentieux | impayes, litiges | + ventes-impayes/* (redirects), sales (mort) |

### 1.2 Poids / risque par catégorie (les 13 + extensions)

| # | Catégorie | Poids fonctionnel | Risque dominant |
|---|---|---|---|
| 1 | **Finances / Grand livre / Compta / Annexes / Budgets** | Énorme (cœur métier + légal) | 🔴 Annexes en drift de contenu ; doublons EN/FR massifs ; `api.ts` 1903 lignes ; nav n'expose que 7/30 écrans |
| 2 | **Paiements FIFO + Banque / Rapprochement** | Élevé (trésorerie) | 🔴 Synchro 100% fake ; catégorisation cassée ; clôture/RIB boutons morts ; écritures GL jamais chargées |
| 3 | **Impayés & relances** | Élevé (recouvrement) | 🔴 Écran nav `/contentieux/impayes` = mutations FACTICES ; vrai moteur (`/finance/unpaid/reminders`) hors-nav |
| 4 | **AG (cycle de vie)** | Énorme (légal) | 🟠 RPC solides mais 15 edge non déployées ; uploads vote perdus (base64) ; convocation non câblée |
| 5 | **Clôture / périodes / résultat 110/120** | Élevé (légal) | 🔴 Page `/documents/closing` statique ; mouvements-non-catégorisés = 0 en dur |
| 6 | **État daté / Mutations / Ventes** | Élevé (légal) | 🔴 Doublon `/sales` 100% mock ; moteur état daté solide (RPC) mais `VentesProvider` no-op |
| 7 | **Factures fournisseurs** | Moyen-élevé | 🔴 Doublon legacy `/invoices` ; InvoicePicker lit MOCK |
| 8 | **Copropriétaires / Lots / Clés / Tantièmes** | Socle structurel | 🟠 Clés/tantièmes hors-nav ; multi-copro désactivé (`CoproContext:269`) |
| 9 | **Maintenance / GED / Prestataires** | Moyen | 🟠 RPC solides ; 3 emplacements prestataires ; signature électronique = stub mort |
| 10 | **Conseil syndical** | Moyen (légal art.21) | 🟠 Rapport CS autosave avale erreurs ; tables vides |
| 11 | **Communication / Mur / Mail / Messagerie** | Moyen | 🟠 routes `as any` ; envoi mail réel à vérifier |
| 12 | **Conformité 2026 (PPT/DPE/Factur-X)** | Moyen (réglementaire) | 🔴 100% mock présenté comme feature |
| 13 | **Litiges** | Faible | 🔴 Table inexistante, 2 coquilles vides byte-identiques |

---

## 2. CARTOGRAPHIE PAR CATÉGORIE

### CAT. 1 — Finances : Grand livre / Comptabilité / Balance / Annexes / Budgets

**Écrans (canoniques en gras) :**
- **`/finance/comptabilite`** — hub multi-onglets : grand livre (par compte/écriture), livre comptable, balance, compte de gestion, annexes 1-5 ; sélecteur période ; export CSV ; clôture ; contre-passation.
- **`/finance/budgets`** — hub 3 onglets (fonctionnement / travaux / ALUR) : création, édition, transformation, transfert, affectation ALUR, postes, dépenses.
- **`/finance/appels-fonds`** + `[callId]` — suivi appels (KPI, taux d'encaissement, wizard, relances) ; détail par lot/clé, encaissements, émission, annulation, export avis.
- **`/finance/factures`** (V2 Kanban) + `new` + `[id]` — workflow facture fournisseur par statut.
- **`/finance/operations-a-apurer`** — file gel 12 / soldes travaux d'exercices clos.
- **`/finance/diagnostic`** — lecture seule des anomalies `audit_finance_integrity`.
- **Orphelins / doublons** : `budget-current`, `budget-works`, `budgets/[id]`, `budgets/validation`, `etats-dates` (redirect), `tantiemes`, `cles-repartition[/new/[id]]`, `releves-individuels` ; **Documents** : `ledger[/full]`, `balance`, `annexes`, `closing` (mock), `expenses` ; **legacy EN** : `invoices*`, `bank-movements`, `transactions`, `transfer`, `unpaid`.

**Actions clés :** sélection période/exercice · bascule GL par compte/écriture · filtres · export CSV (art.18-1) · `close_period` (garde équilibre) · `reverse_ledger_transaction` (motif, bloquée sur régénérables) · CRUD budgets (dont depuis résolution AG) · `validate_budget_expense` · wizard activation budget · `close_works_operation` · ALUR `post_alur_transfer`/`settle_alur_transfer_cash` · `post_budget_call_for_funds` · émission/annulation appel · `recordPayment` · relances · cycle facture (`validate_supplier_invoice`/`post_supplier_payment`/`post_supplier_credit_note`).

**Backend touché :** RPC `post_budget_call_for_funds`, `cancel_call_for_funds`, `reverse_ledger_transaction`, `close_period`, `settle_works_balance`, `close_works_operation`, `validate_budget_expense`, cycle fournisseur, ALUR, `audit_finance_integrity`. Vues `v_general_ledger`, `v_trial_balance`, `v_account_balances`, `v_budgets_overview`, `v_calls_overview`, `v_payments_overview`, `v_supplier_invoices_overview`, `v_alur_*`, `v_works_pending_settlement`. Hooks `useFinanceData`, `useBudget`, `useLedger`, `useAnnexeData`.

**Issues condensées :**
- 🔴 **Annexes** : `fn_annexe_1..5` existent (refonte 0075) mais **drift de contenu** ; **PDF convocation annexe 1 cassé** — lecture seule donc 0 corruption GL, mais chiffres potentiellement faux sans alerte. Ne pas envoyer à un syndic réel sans validation expert + golden.
- 🔴 **`/documents/closing`** statique : boutons « Approuver/Annuler l'arrêté » sans handler ; année et annexes en dur ; `approvePeriod`/`rejectPeriod` existent en API mais non câblés.
- 🔴 **HISTORIQUE factice** : `useComptabilitePage` retourne `historique=[]` et `mouvementsNonCategorises=[]` en dur → HistoriqueModal vide, contrôle de clôture « mouvements non catégorisés » toujours 0.
- 🟠 **Doublons EN/FR** : factures (`/factures` V2 vs `/invoices*` legacy), bancaire (3 écrans), budget (3 écrans).
- 🟠 Exports non câblés (`AnnexeTables` 5 handlers TODO, avis-appel PDF placeholder) ; `lib/finance/api.ts` = 1903 lignes ; clôture via `alert()` natif.

---

### CAT. 2 — Paiements copro (FIFO) + Banque / Rapprochement

**Écrans :** **`/finance/mouvements-bancaires`** (canonique, 2 modes Table/Workflow ; Workflow = 4 onglets Import / Catégorisation / Rapprochement (SplitReconciliation) / Clôture). La **saisie de paiement FIFO vit dans `/finance/appels-fonds/[callId]`** (PaymentModal → `post_owner_payment`). Doublon mort : `/finance/bank-movements`.

**Actions clés :** sélection compte (courant/travaux) · import CSV/CFONB (`import_bank_movements`) · rapprochement/pointage (`reconcile_bank_movement`, INSERT `bank_matches`, **zéro écriture GL**) · split/batch · `post_owner_payment` (FIFO cloisonné par nature, trop-perçu en avance 450-3, idempotent) · règlement fournisseur (`post_supplier_payment` D401/C512).

**Backend touché :** RPC `import_bank_movements`, `reconcile_bank_movement`, `refresh_bank_movement_status`, `post_owner_payment`, `allocate_payment`/`unallocate_payment`. Vues `v_bank_movements_overview`, `v_account_balances`, `v_payments_overview`, `v_unpaid_by_lot`, `v_lot_advance_balance`. Tables `payments`, `payment_allocations`, `bank_movements`, `bank_matches`.

**Issues condensées :**
- 🔴 **Synchro 100% FAKE** : `handleRefresh` = `setTimeout(2500)` + `Math.random()` + invente des mouvements aléatoires ; aucune banque contactée ; statut « connecté » en dur.
- 🔴 **Catégorisation unitaire cassée** : `categorizeBankMovement` renvoie toujours une erreur (colonnes retirées en 0014), avalée en catch vide → faux succès à l'écran.
- 🔴 **Écritures GL jamais chargées** : `ecrituresComptables = []` jamais alimenté → écart de soldes, colonne « Rapproché », `mouvementsNonRapproches` calculés sur données fantômes ; `handleSaveCategorie` fabrique des références factices (`AF-…`, statut `PAYEE` en dur).
- 🔴 **Boutons morts** : RIB (`downloadRIB = () => {}`), « Clôturer {mois} » (aucun onClick, écart codé `0:0`).
- 🟠 Batch catégorisation mal câblée (appelle `reconcileMutation` avec `target_type='other'`) ; annulation de rapprochement non persistée ; `reconcile` perd le typage métier (`target_type='other'` partout) ; pas de pointage partiel ; OFX annoncé mais non supporté.

---

### CAT. 3 — Impayés & relances

**Écrans :** **`/contentieux/impayes`** (dans la nav, belle UI **mais mutations factices**) · `/finance/unpaid/reminders` (vrai moteur edge, **hors-nav**) · `/finance/unpaid` (vue simple, actions MOCK, hors-nav) · `/finance/releves-individuels` (hors-nav, agrégat client) · `/contentieux/litiges` (100% mock) · `/settings/reminders` (config réelle).

**Actions clés :** liste/filtre par palier · sélection multiple · détail timeline · relance unitaire/groupée (FACTICE sur `/contentieux`) · preview/download PDF (jsPDF + archivage GED) · « marquer réglé » (FACTICE, ne poste aucun paiement) · export PDF/CSV · [RÉEL sur `/unpaid/reminders`] `send_manual_payment_reminder`, `run_payment_reminders` (dry-run + résumé) · [RÉEL sur `/settings/reminders`] règles, pause globale, templates.

**Backend touché :** vues `v_unpaid_by_lot`, `v_unpaid_with_reminders`, `v_payment_reminders_overview`. Tables `payment_reminders`, `payment_reminder_rules`, `reminder_settings`, `email_templates`. Edge `send_manual_payment_reminder`, `run_payment_reminders` (non déployées → front via RPC). `record_payment` = voie légitime NON utilisée par « marquer réglé ».

**Issues condensées :**
- 🔴 **BUG MAJEUR** : `useImpayesPage.ts` (l.303-409, 426-499) — relances et « marquer réglé » = `setTimeout` + setState local, **aucune écriture Supabase, aucun paiement GL**, alors que la modale affiche « action enregistrée et irréversible ». Faux positif comptable (l'impayé réapparaît au refresh).
- 🔴 **Deux implémentations concurrentes** : la jolie UI (factice, dans la nav) ≠ le vrai moteur (pauvre, hors-nav).
- 🔴 `/contentieux/litiges` + `/legal/disputes` = coquilles vides byte-identiques (`MOCK_LITIGES=[]`, table inexistante).
- 🟠 Code mort : `useImpayesMutations` (vraie route d'écriture) importé nulle part ; `useJournalRecouvrement` + `JournalRecouvrement/*` jamais montés.
- 🟠 Seuils de paliers incohérents (90/120 vs >90 vs 15/30/60/90) sans constante unique ; relevés recalculés client (divergence GL) ; `createUntypedClient = as any`.

---

### CAT. 4 — Assemblées Générales (cycle de vie)

**Écrans :** `/ag/dashboard`, `/ag/new`, `/ag/resolutions` (nav) + session, convocation, PV, finalisation, pouvoirs, feuille de présence, votes-correspondance (**garder `-copro`**).

**Actions clés :** cycle `draft→convoked→session_active→closed→pv_*→finalized→archived`. Ordre impératif : `close_ag` PUIS `prepare_ag_decisions`. Activation **une seule fois** à l'étape PV (`activate_ag_decisions`). `cast_vote`, calcul majorités (art.24/25/25-1/26/26-1/unanimité), vote par correspondance, pouvoirs, génération convocation/PV.

**Backend touché :** RPC `start_ag`, `close_ag`, `prepare_ag_decisions`, `activate_ag_decisions`, `finalize_ag`, `archive_ag`, `cast_vote`, `calculate_resolution_result`, `compute_ag_quorum`, `create_ag_with_standard_resolutions`, `register_correspondence_form_votes`, `get_ag_live_results`, `save_ag_pouvoir`. Tables `ag_meetings`, `ag_resolutions`, `ag_votes`, `ag_attendance`, `ag_pending_actions`, `resolution_templates` (100 lignes). **15 edge `ag_*` non déployées.**

**Issues condensées :**
- 🔴 Upload justificatif de vote (`useVotesCorrespondance:566`) stocké en **base64 dans le state** → perdu au refresh (data loss).
- 🔴 Envoi convocation non câblé (`useDeliveryConfig:422,459` → TODO ag_notifications).
- 🟠 `finalize_ag_session` droppée 0038 (volontaire). Toute la couche AG en `as any` (`lib/ag/api/utils.ts:11` propage). `usePVSignatures:80` userId en dur.

---

### CAT. 5 — Clôture / périodes / affectation résultat 110/120

**Écrans :** intégré à `/finance/comptabilite` (ClotureModal) ; `/documents/closing` (statique, hors-nav).

**Actions clés :** `open_next_period`, `approve_period`, `close_period`, `reopen_period`, `regularize_period` ; affectation résultat (excédent reste sur 450 par défaut, écriture 120/110→450 par quote-part datée AG N+1) ; `settle_works_balance`.

**Backend touché :** RPC périodes (WP5), `assert_no_unlinked_works_entries`, `assert_result_allocation_split`, `v_result_allocation_split`. Table `accounting_periods` (enum `period_status` open/closed/approved — verrou binaire WP5.2). `period_cutoff_items` (408/486).

**Issues condensées :**
- 🔴 Parcours de clôture non guidé : page `/documents/closing` statique ; pré-checks équilibre + mouvements-non-catégorisés **factices** (0 en dur) ; `approvePeriod`/`rejectPeriod` non câblés à l'UI.
- 🟠 Compte de gestion + annexes recalculés en lecture (pas de snapshot figé type état daté) → risque de drift à la clôture.

---

### CAT. 6 — État daté / Mutations / Ventes

**Écrans :** **`/ventes-impayes/ventes`** (canonique, lié en nav via « État daté ») + `features/ventes` + `lib/sales/api.ts`. Doublon mort **`/sales`** (100% mock en mémoire, `alert('Documents envoyés au notaire')`).

**Actions clés :** génération payload état daté (3 parties art.5), snapshot figé, workflow vente, questionnaire syndic.

**Backend touché :** RPC `generate_etat_date_payload` (10462 chars, solide), `create_etat_date_snapshot`, `get_lot_balance_45x`, trigger `tr_etat_date_immutable`. Tables `mutations`, `mutation_steps`, `etat_date_snapshots`, `mutation_oppositions`, `legal_proceedings`.

**Issues condensées :**
- 🔴 `VentesProvider:255,296` : `updateDocumentStatus` et `addHistorique` = **no-op « for MVP »** mais exposés → un appelant croit historiser/changer un statut, rien ne se passe.
- 🔴 `vente-workflow-validation.service.ts:335` stub ; route `/sales` + `useSalesPage` 100% mock.
- 🟠 Domaine vente entièrement `as any` (`mutationsApi.ts`).

---

### CAT. 7 — Factures fournisseurs

**Écrans :** **`/finance/factures`** (V2 Kanban, `useFacturesPageV2`) + `new` + `[id]`. Legacy mort : `/finance/invoices*`, `invoices/payment*`, dossier `components/features/finance/Factures`.

**Actions clés :** saisie brouillon (fournisseur à la volée) · `validate_supplier_invoice` (D6xx/C401) · `post_supplier_payment` (D401/C512) · `post_supplier_credit_note` (avoir) · acomptes `post_supplier_advance`/`settle_supplier_advance_on_invoice`.

**Backend touché :** RPC fournisseur (toutes solides). Tables `supplier_invoices`, `supplier_invoice_lines`, `supplier_payments`, `supplier_advances`, `tiers` (is_supplier).

**Issues condensées :**
- 🔴 `InvoicePickerModal` lit **MOCK_FACTURES** au lieu de Supabase ; `CreateBudgetModal.getMockBudgetN1` données N-1 mockées.
- 🟠 Doublon legacy `/invoices` ; modales legacy mockées (NewFacture/Edit/View/Avoir/Accounting).

---

### CAT. 8 — Copropriétaires / Lots / Clés / Tantièmes

**Écrans :** `/coproprietaires`, `/coproprietaires/lots` (nav) ; `lots/[id]`, `tantiemes`, `cles-repartition[/new/[id]]` (hors-nav).

**Backend touché :** tables `copros` (18), `lots` (131, unité de gestion centrale), `lot_owners` (130, liaison N:N), `coproprietaires` (98), `repartition_keys` (39) + `repartition_key_lines` (309). Règle lot-centric : solde par personne = somme de ses lots.

**Issues condensées :**
- 🟠 Multi-copro désactivé (`CoproContext.tsx:269` TODO réactiver) ; clés/tantièmes hors-nav (structurels, devraient avoir leur hub) ; `useLotsRepartitionGrid`, `useLotDetailPage` en `as any`.

---

### CAT. 9 — Maintenance / GED / Prestataires / Contrats / OS

**Écrans :** `/maintenance/logbook`, `contracts`, `providers`, `service-orders`, `ppt` (nav) ; `/documents/ged` (nav). Doublon : `logbook` + `logbook-page` ; 3 entrées prestataires.

**Backend touché :** RPC `update_service_order_status`, `create_logbook_from_service_order`, `is_valid_service_order_transition`, `create_document_version`, `generate_document_path`, `register_ag_document`, `user_can_view_document`. Tables `documents`, `document_folders`, `technical_documents`, `contracts`, `service_orders`, `logbook_entries`, `insurance_policies`, `planned_works`. Edge maintenance/GED **non déployées**.

**Issues condensées :**
- 🔴 `electronic-signature.service.ts` : DocuSign + Yousign = stubs localStorage, 0 consommateur (feature annoncée inexistante).
- 🟠 GED : `getDocumentUrl().catch(()=>{})` (aperçu vide silencieux) ; `DocumentViewerModal` masque échecs en « aucune entité / pas d'historique » ; `remote-meeting.service` retombe sur Jitsi pour Zoom/Teams.

---

### CAT. 10 — Conseil syndical (art.21)

**Backend touché :** tables `council_members`, `council_decisions`, `council_votes`, `council_documents`, `rapports_activite_cs` + `sections_rapport_cs` + `annexes_rapport_cs` (toutes 0 ligne).

**Issues :** 🟠 `useRapportCS:110` autosave `.catch(()=>{})` ; `:241` upload fichier TODO. Tables vides → feature pas éprouvée.

---

### CAT. 11 — Communication / Mail / Messagerie / Mur / Événements

**Backend touché :** RPC `mark_conversation_read`, `is_conversation_member`. Tables `conversations`, `conversation_members`, `messages`, `wall_posts`/`wall_comments`/`wall_likes`, `events`, `mails`. Edge communication-workflow **non déployée**. API routes `app/api/mail/send|inbound`.

**Issues :** 🟠 `useMur`, `useMailbox`, `useMessagerie`, routes mail en `as any` ; `email-vente.ts` expéditeur en dur.

---

### CAT. 12 — Conformité 2026 (PPT / DPE / Factur-X)

**Écrans :** `/conformite/ppt`, `/conformite/dpe`, `/conformite/facturx` (dans la nav). 🔴 **100% mock** : `useDPE`/`useFacturX`/`usePPT` branchés sur `MOCK_DPE_LIST`/`MOCK_FACTURES_FACTURX`/`MOCK_PPT_COPROPRIETES`. Présenté comme feature dans le menu à un syndic réel → à livrer ou retirer.

---

### CAT. 13 — Litiges

🔴 `/contentieux/litiges` + `/legal/disputes` = deux fichiers byte-identiques, `MOCK_LITIGES=[]`, table `litiges` inexistante, tous boutons inertes. Décider : table+workflow réels, ou masquer du menu.

---

## 3. LE MOTEUR (RPC / edge par domaine + statut) & ÉCARTS REPO↔LIVE

Statut : **solide** · **drift** · **cassée** · **non-câblée** · **manquante**.

| Domaine | Fonctions solides | À surveiller |
|---|---|---|
| **Appels de fonds** | `post_budget_call_for_funds` (canonique), `cancel_call_for_funds`, `update_call_status`, `generate_calls_from_ag_payload` | 🔴 `post_call_for_funds` **FANTÔME** (0 sur live ; lib migrée OK, mais edge `generate_call_for_funds/index.ts:64` l'appelle encore → cassée si déployée) ; `post_exceptional_call_for_funds` **manquante** (appels hors budget jamais livrés) |
| **Paiements** | `post_owner_payment`, `allocate/unallocate_payment`, `reverse_payment`, cycle fournisseur complet, `post_supplier_advance`, `cancel_supplier_invoice` | `reverse_payment` ne bloque PAS sur période approuvée = **par design** (atterrit en période ouverte) |
| **Grand livre** | `create_ledger_transaction`, `post_ledger_transaction`, `reverse_ledger_transaction` (0071), `post_period_cutoff`, triggers immutabilité | — |
| **AG** | chaîne `start→close→prepare→activate→finalize→archive`, votes, quorum, majorités | `finalize_ag_session` droppée 0038 (volontaire) ; **15 edge `ag_*` non déployées** |
| **Périodes** | `open_next_period`, `approve_period`, `close_period`, `reopen_period`, `regularize_period`, `settle_works_balance`, opening balance | — |
| **État daté** | `generate_etat_date_payload`, `create_etat_date_snapshot`, `get_lot_balance_45x`, `tr_etat_date_immutable` | — |
| **Annexes** | — | 🔴 `fn_annexe_1..5` **drift de contenu** (lecture seule, 0 corruption GL, mais PDF convocation annexe 1 cassé) |
| **Banque** | `import_bank_movements`, `reconcile_bank_movement`, `refresh_bank_movement_status` | `categorizeBankMovement` (lib TS) **neutralisée volontairement** (colonnes mortes 0014, renvoie erreur explicite) |
| **Maintenance/GED/Comm** | `update_service_order_status`, `create_logbook_from_service_order`, GED, conversations | edge workflows **non déployées** |
| **Audit/correction** | `audit_finance_integrity`, `assert_*_rls` (0086), `reverse_payment` (0087) | — |
| **Harnais test** | `create_test_copro(_seeded)`, `create_clean_test_copro(_seeded)`, `seed_golden_loop`, `force_delete_test_copro` x2 | les 2 `force_delete` = live only (voir écarts) |

**Verdict faux-positifs levés :** `reverse_payment`, `cancel_supplier_invoice`, `categorizeBankMovement`, `post_call_for_funds` (côté lib) **ne sont PAS des bugs ouverts**.

### Écarts repo local ↔ live

- **Live a 89 migrations** (0001→0087 + 2 du 22/06) ; **~170 fonctions/triggers** ; RLS ON+FORCE ; 1 cron (`daily-payment-reminders`, 7h).
- 🔴 **Sur le LIVE, absentes du repo** : `20260622122732 force_delete_test_copro` et `20260622122949 force_delete_test_copro_v2_harness_prefix` (appliquées via MCP pour ménage E2E-/HARNESS) → **drift descendant, à rapatrier en .sql versionnés** (le repo ne reconstruit pas le live à l'identique).
- **Dans le repo, absentes du live** : aucune.
- **Trou `0074`** : n'existe nulle part (saut 0073→0075) — à documenter pour ne pas croire à une perte.
- **Format version** : 0001→0081 court ; ≥0082 horodaté (passage `supabase db push` daté le 16/06).
- 🟠 **28 edge functions `.ts` dans le repo, 0 déployée sur le live** → couche edge = **code mort en prod**. Le moteur réel = RPC SQL via PostgREST. À trancher : déployer ou supprimer (au moins `generate_call_for_funds` qui appelle un RPC fantôme).

---

## 4. LE MODÈLE DE DONNÉES

**87 tables** · **72 vues** (`v_*` + `tiers_directory`) · **80 enums** · base quasi vierge (advisors perf théoriques). Migration `providers→tiers` consommée ; aucune table morte historique (`lot_accounts`, `mail_labels_v2`, `suppliers`/`providers`) ne subsiste.

### Tables par domaine

- **Socle multi-cabinet** : `cabinets` (1), `copros` (18, pivot), `buildings` (14), **`lots` (131, unité de gestion)**, `repartition_keys`/`repartition_key_lines`, `coproprietaires` (98), **`lot_owners` (130, liaison N:N)**, `profiles`, `memberships`, `copro_invitations`.
- **Compta cœur** : **`accounts` (1498)** — 108 sous-comptes `450-*` par nature (enum `account_receivable_nature` current/works/alur/loan/advance/doubtful), `charge_nature` sur classe 6 ; **`ledger_transactions` (11) + `ledger_entries` (161)** porte `lot_id`/`account_id`/`copro_id`/`period_id`/`operation_id`, `source_type` enum riche ; `accounting_periods` (9) ; `period_cutoff_items`, `opening_balance_residual_items`.
- **Appels/budgets/paiements/banque** : `budgets` (7)/`budget_lines`/`budget_expenses`/`budget_payment_schedules` ; `call_for_funds` (11) + **`call_for_funds_lines` (486)** (1 ligne/(lot×clé)) ; `payments`/`payment_allocations` (FIFO) ; `bank_movements`/`bank_matches` ; `treasury_advances`, `collective_loans`, `alur_transfers` ; relances `payment_reminder_rules` (54)/`payment_reminders`/`reminder_settings` (18)/`email_templates` (6).
- **AG** : `ag_meetings` (2), `ag_resolutions`, `ag_votes`, `ag_attendance`, correspondance, **`ag_pending_actions`** (AG→copro), drafts/tracking/notifications/milestones/documents, `resolution_templates` (100), `pv_templates`.
- **Conseil syndical** : `council_*`, `rapports_activite_cs` + sections + annexes.
- **Mutations/état daté/juridique** : `mutations`/`mutation_steps`, `etat_date_snapshots`, `mutation_oppositions`, `legal_proceedings`.
- **GED/maintenance/fournisseurs** : `document_folders`/`documents`/`document_relations`/`technical_documents` ; `tiers` (annuaire canonique) ; `supplier_invoices`/`_lines`/`supplier_payments`/`supplier_advances` (409) ; `contracts`, `service_orders`/`_events`, `logbook_entries`, `insurance_policies`, `planned_works`, `work_domain` (28).
- **Communication** : `conversations`/`conversation_members`/`messages`, `wall_*`, `events`, `mails`.

### RLS

- **RLS activée 87/87.** **FORCE sur 6 tables** (noyau comptable : `accounts`, `accounting_periods`, `ledger_transactions`, `ledger_entries`, `payment_allocations`). ⚠️ **`payments` n'a PAS FORCE** (asymétrie à noter, protégée par 3 policies). 1-6 policies par table, jamais 0.
- **Pas d'advisor anon / rls_disabled** → contrairement à la faille 0085, le live actuel n'expose aucune table au rôle `anon`. Bon.

### Advisors sécurité (170 lints)

- 🟡 1 ERROR `security_definer_view` sur `tiers_directory` (volontaire, exposition RIB contrôlée).
- 🟠 1 WARN `auth_leaked_password_protection` désactivée (HaveIBeenPwned off) — pertinent vu compte démo `password123` en clair. À activer avant vrais clients.
- 🟡 1 WARN `extension_in_public` (`pg_net`).
- 🟠 154 WARN `authenticated_security_definer_function_executable` (modèle assumé ; risque = gardes internes `is_service_call()`, à auditer sur RPC à écriture comptable).
- 🔴 **13 WARN `function_search_path_mutable`** dont **triggers du grand livre** (`tr_ledger_tx_immutable`, `tr_ledger_tx_no_delete_posted`, `set_updated_at`, `cutoff_entry_pair`, `tr_*_copro_consistency`) → **point sécurité le plus concret** : figer `SET search_path = ''` (touche l'immutabilité GL).

### Advisors perf (380 lints, base vide → théoriques)

- 169 `unindexed_foreign_keys` (69 tables ; indexer `ledger_entries`, `call_for_funds_lines`, `lot_owners` avant volume).
- 100 `unused_index` (normal base neuve, ne rien supprimer).
- 79 `multiple_permissive_policies` (consolidable).
- 🟠 **32 `auth_rls_initplan`** (16 tables) — `auth.uid()` non encapsulé → réévalué par ligne. **Optimisation la plus rentable** : `(select auth.uid())`.

### Tables mortes / doublons

- 🟠 **`document_versions`** (existe, 0 ligne) + vue `v_document_versions` = seul suspect résiduel (versioning non implémenté, `documents` aussi à 0). Vérifier qu'aucune RPC/front n'y écrit → candidate DROP.
- `v_providers_overview` subsiste (vue de compat lisant `tiers` filtré, inoffensive).
- Dette doublons EN/FR **soldée côté tables** (les « table + vue homonyme » sont le pattern normal table-physique / vue-d'agrégat).

**Priorités DB :** (1) figer search_path des 13 fn/triggers GL ; (2) activer protection mots de passe + retirer compte démo en clair ; (3) optimiser 16 tables `auth_rls_initplan` ; (4) statuer `document_versions`.

---

## 5. REGISTRE DE DETTE CONSOLIDÉ (porter / ne pas porter / corriger)

### 🔴 ROUGE — sécuriser avant tout

| Item | Localisation | Action |
|---|---|---|
| Annexes en drift de contenu | `fn_annexe_1..5`, PDF convocation annexe 1 | **Corriger** : valider expert + golden avant tout envoi client |
| Mutations factices impayés | `useImpayesPage.ts:303-409,426-499` | **Corriger** : brancher edge + `record_payment`, utiliser `useImpayesMutations` |
| « Marquer réglé » sans paiement GL | RegleModal | **Corriger** : passer par `record_payment` (D512/C450) |
| Banque : synchro fake + écritures GL jamais chargées | `useMouvementsBancairesPage`, `ecrituresComptables=[]` | **Corriger** : charger `v_general_ledger` côté 512, supprimer l'état fantôme, retirer fausse synchro |
| Catégorisation bancaire cassée (faux succès) | `categorizeBankMovement` + catch vide | **Corriger** : assumer pointage-pur, retirer CategorisationModal ou la recâbler |
| `/documents/closing` statique + mouvements-non-catégorisés=0 en dur | `useComptabilitePage` | **Corriger** : parcours clôture réel |
| Upload justificatif vote en base64 perdu | `useVotesCorrespondance:566` | **Corriger** : Supabase Storage |
| Envoi convocation non câblé | `useDeliveryConfig:422,459` | **Corriger** : ag_notifications |
| `VentesProvider` no-op exposés | `VentesProvider:255,296` | **Corriger** : implémenter ou retirer du contexte |
| Variable template rendue vide silencieusement | `resolver.ts:73` | **Corriger** : lever / marquer visiblement (corruption doc légal) |
| Bouton « générer appel » inerte | `useBudget:710` | **Corriger** ou retirer |
| InvoicePicker lit MOCK | `InvoicePickerModal` | **Corriger** : Supabase |
| Typage perdu sur compta & état daté | `mutationsApi`, `finance/api`, `budget/api`, `accounting-period` | **Corriger (racine)** : régénérer types incluant RPC/vues, wrappers typés |
| Services 100% mock présentés comme features | signature électronique, assurances, expenses, conformité DPE/PPT/Factur-X, litiges, `/sales` | **Ne pas porter** + décider livrer/retirer du menu |
| `post_call_for_funds` fantôme appelé par edge | `generate_call_for_funds/index.ts:64` | **Corriger** ou supprimer l'edge |

### 🟠 ORANGE — dette structurelle à solder

- **Doublons EN/FR** : un seul chemin. **Ne pas porter** : `finance/invoices*`, `finance/bank-movements`, `finance/transactions`, `finance/transfer`, `(dashboard)/sales` + `components/features/sales` + `useSalesPage`, `legal/disputes`, `features/ag/votes-correspondance` (sans `-copro`).
- **`shared/`** (`shared/ui`, `shared/hooks`, `shared/services/financeApi`, `shared/hooks/useFinance` ~50 hooks no-op + `deprecatedMutation()`, `shared/index.ts`) = **bloc mort, 0 importeur réel → supprimer / ne pas porter**.
- `catch → return []/null/false` (pieces-justificatives, facture-pj, pv-*, dashboard) → **corriger** en `Result<T,E>` typé.
- Pattern `-page` (`dashboard-page`, `reminders-page`, `logbook-page`) → unifier route/feature.
- 28 edge non déployées → déployer OU supprimer (pas de coexistence).
- `lib/finance/api.ts` 1903 lignes → découper par sous-domaine.
- Multi-copro désactivé (`CoproContext:269`).
- DB : search_path GL, `auth_rls_initplan`, protection mdp.

### 🟡 JAUNE — nettoyage

- **143 `alert()`** → `ToastProvider`.
- `@deprecated` à purger ; setters fantômes (`useBudget:878,908,929`) ; no-op `usePouvoirs:655`.
- Mocks dev (`lib/mock-data/**`, `hooks/useDevMockData.ts`, `shared/mock/**`).
- Suffixe `factures-new` parasite ; 3 entrées prestataires ; styles inline interdits.

**Fichiers pivots :** `src/lib/config/navigation.ts` (vérité du canonique) · `src/shared/{index,hooks/useFinance,services/financeApi}.ts` (bloc mort) · `src/lib/services/electronic-signature.service.ts` (stub mort) · `src/lib/ag/api/utils.ts:11` (origine propagation `as any`) · `src/lib/finance/api.ts` (monolithe 1903 l.) · `supabase/functions/generate_call_for_funds/index.ts:64` (RPC fantôme).

---

## CATÉGORIES MANQUANTES ÉVENTUELLES

La liste des 13 catégories couvre Finance/Banque/Impayés mais **sous-traite ou omet plusieurs domaines applicatifs réels** présents dans la nav, le schéma (87 tables) et le code. Oublis identifiés :

1. **🔴 Assemblées Générales (cycle de vie complet)** — domaine MAJEUR (module nav dédié, ~20 routes, chaîne RPC `start_ag→archive_ag`, 100 `resolution_templates`, vote par correspondance, pouvoirs, génération convocation/PV, `ag_pending_actions` AG→copro). N'apparaît dans la liste des 13 que comme dépendance de Finance (budgets depuis résolution). **Mérite une catégorie pleine** — c'est la moitié légale du produit.

2. **🔴 Conformité 2026 (PPT / DPE collectif / Factur-X)** — module nav entier (`/conformite/*`), réglementaire (loi Climat & Résilience, Factur-X 2026), **100% mock** mais exposé au syndic. Absent des 13.

3. **🟠 Conseil syndical** — module métier (art.21 loi 1965) : `council_members/decisions/votes/documents`, `rapports_activite_cs` + sections + annexes, RPC dédiées. Absent des 13.

4. **🟠 Maintenance & GED & Prestataires** — carnet d'entretien, contrats (alertes renouvellement), ordres de service (workflow 6 états `service_orders`), prestataires (`tiers`), assurances, PPT planifiés, `work_domain` (28). GED = `documents`/`document_folders`/versions + RPC `user_can_view_document`. Domaine entier hors des 13.

5. **🟠 Communication (Mail / Messagerie / Mur / Événements)** — module nav (`/communication/*`) : `conversations`/`messages`, `wall_*`, `events`, `mails`, API routes mail in/out, edge communication-workflow. Absent.

6. **🟠 Copropriétaires / Lots / Clés / Tantièmes** — socle structurel (module nav Copropriété + 5 écrans finance orphelins clés/tantièmes). Mentionné en filigrane mais jamais traité comme catégorie ; or c'est la donnée de base de tout le reste (`lots` 131, `lot_owners` 130, `repartition_keys` 39).

7. **🟠 Ventes / État daté / Mutations / Juridique** — au-delà des « impayés » : workflow vente de lot, état daté art.5 (RPC solide), mutations notaire, oppositions, `legal_proceedings`. Traité partiellement sous Impayés mais c'est un domaine légal distinct.

8. **🟡 Dashboard / pilotage portefeuille multi-copro** — KPI cabinet, top débiteurs, vue agrégée multi-copro (aujourd'hui désactivée `CoproContext:269`). Aucune catégorie.

9. **🟡 Administration / Settings / Auth / Multi-tenant** — `/settings/*` (dont reminders, la seule porte d'entrée du vrai moteur de relances), `cabinets`/`memberships`/`profiles`/`copro_invitations`, RLS, compte démo, GoTrue. Transverse mais jamais cartographié.

10. **🟡 Signature électronique & PDF** — `electronic-signature.service` (DocuSign/Yousign stubs), `usePVSignatures`, génération PDF (jsPDF : convocation, PV, avis d'appel, relances, annexes, relevés, état daté). Couche transverse à enjeu légal (preuve), aujourd'hui éclatée et partiellement morte.

11. **🟡 Réunions distantes / AG hybride** — `remote-meeting.service` (Jitsi seul, Zoom/Teams/Meet stubs OAuth). Petit mais réglementairement pertinent (AG à distance).

**Recommandation de cadrage :** passer de **13 catégories Finance-centrées** à un découpage par **module métier réel** (≈ Dashboard, AG, Copropriété/Lots, Finance-compta, Banque-paiements, Recouvrement, Ventes/État daté/Juridique, Maintenance-GED, Conseil syndical, Communication, Conformité 2026, Administration/Settings, + couches transverses Signature/PDF et Multi-tenant). Les 13 actuelles couvrent ~3 modules sur ~11.
