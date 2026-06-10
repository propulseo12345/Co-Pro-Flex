# OBJETS ABANDONNÉS — DB cible CoProFlex

> **2026-06-04 — lecture seule** sur le live `iyfesbjnkpynmwlsmxnp`. Aucune écriture.
> Synthèse consolidée : base = `_cartographie/T3-objets-abandonnes.md` + confirmations des 8 blueprints de domaine (`01`→`08`) + `ENUMS.md`.
> **Règle d'or (mémoire)** : on ne marque ABANDONNÉ que si **0 ligne pertinente + 0 importeur front réel + 0 usage edge + 0 dépendance DB (FK/vue/fonction)**. Toute preuve d'usage bascule en **À GARDER (faux mort)**.
> **Méthode de preuve** : (a) `count(*)` ; (b) grep `src/` (hors `types/supabase.ts` généré) ; (c) grep edge Deno `supabase/functions/` ; (d) FK entrantes + vues + fonctions DB dépendantes.
> ⚠️ Aucun DROP n'est « sec » quand un câblage existe : la colonne **Séquençage** indique le rebranchement obligatoire AVANT suppression.

---

## PARTIE 1 — OBJETS ABANDONNÉS (ne PAS reprendre dans la DB cible)

### 1.1 TABLES abandonnées

| Table | Lignes (a) | Front (b) | Edge (c) | DB / FK (d) | Verdict & séquençage |
|---|---|---|---|---|---|
| **`lot_accounts`** | 21 | 0 (`.from` absent ; seul hit = types générés) | 0 | 0 FK entrante, 0 vue, 0 fonction | **ABANDONNÉE / DROP sec.** Vestige modèle « un compte 411 par lot », contredit la règle lot-centric (450-x + dimension `lot_id`). T3-A1, 02 §1.13. |
| **`mail_labels_v2`** | 0 | 0 (labelling vit côté front `IMailLabel`/`DEFAULT_LABELS`) | 0 | 0 FK, 0 vue, 0 fonction | **ABANDONNÉE / DROP sec.** T3-A2. |
| **`mail_campaigns`** | 2 | `lib/mail/api.ts` + `useMailData.ts` (montés sur AUCUNE page) | 0 | île FK fermée, 0 FK entrante externe | **ABANDONNÉE** (décision USER « DROP campagnes emailing de masse »). T3-A3, 08 §7. |
| **`mail_inbox`** | 2 | idem île | 0 | vue `v_mail_inbox_overview` (île) | **ABANDONNÉE.** T3-A3, 08 §7. |
| **`mail_recipients`** | 9 | idem île | 0 | île FK | **ABANDONNÉE.** T3-A3. |
| **`mail_folders`** | 5 | idem île | 0 | île FK | **ABANDONNÉE.** T3-A3. |
| **`mail_templates`** | 3 | idem île | 0 | île FK | **ABANDONNÉE.** T3-A3. |
| **`ag_pouvoirs`** | 0 | (doublonne `ag_attendance.represented_by_id`) | 0 | 0 ligne sur les 2 copros → 0 perte | **ABANDONNÉE / FUSION.** Le mandat (présence + procuration + correspondance) est porté par `ag_attendance` enrichi des champs justificatif rapatriés. **Séquençage** : rebrancher `save/get_ag_pouvoir` sur les RPC attendance AVANT drop. 04 §1.7 / §6-1. |
| **`notaires`** | — | (FK `mutations.notaire_id`) | — | remplacée par `tiers(is_notary=true)` | **ABANDONNÉE / FUSION tiers.** `mutations.notaire_id` repointe `tiers(id)` (`ON DELETE SET NULL` conservé). 07 §4. |
| **`document_access`** | 0 | (b) `lib/documents/api.ts` l.580/598 ; (c) edge `get_document_url` l.115 | ACL fine par doc, lue par `user_can_view_document` | **ABANDONNÉE / DROP après rebranchement (A4).** Décision USER : confidentialité GED SIMPLE par document = visibilité {gestionnaire seul / + conseil syndical / + tous copropriétaires}, fixée par le gestionnaire. L'ACL fine ligne-à-ligne disparaît. **Séquençage** : (1) réécrire `user_can_view_document` pour s'appuyer sur la nouvelle colonne `visibility` + propriété de lot + appartenance conseil (sans `document_access`) ; (2) rebrancher `lib/documents/api.ts` + edge `get_document_url` ; (3) PUIS DROP. 06 §1. |
| **`dossiers`** | 12 (démo 11111111) | (b) mini-kanban tâches gestion ; aucun doc ne pointe dessus (lien doc↔dossier mort) | 0 FK entrante métier | **ABANDONNÉE / DROP sec (A5).** Décision USER : pas de module tâches dans la cible. Données non reprises (COPRO-TEMPLATE de A à Z, A1). 06 §9. |

> **`alur_transfers` — RETIRÉE de cette liste (faux mort câblé)** : déplacée en PARTIE 2. La table est lue par `useALURData.ts` l.286 + 2 vues (`v_alur_fund_summary`, `v_alur_transfers_history`) → 0 ligne ≠ mort. CONSERVÉE structure + RLS (cohérent MIGRATION-DONNEES §3 ligne `alur_transfers` « CONSERVÉE, ne PAS DROP »). La règle de réconciliation verrouillée la classe FAUX MORT à GARDER.

> **Note `lots`/`copros`/`accounts`/etc. — colonnes droppées (table conservée)** : ce ne sont pas des tables abandonnées mais des **dénormalisations mortes** retirées à la reprise : `copros.{lots_count, total_tantiemes, buildings_count}` (01 §1.1/§7-A1) ; `lots.tantiemes_{generaux,escalier,ascenseur,chauffage}` (01 §1.2, dette structurelle #1) ; `accounts.parent_id` ; `accounting_periods.{locked_at, locked_by}` (verrou WP5.2 abandonné, 02 §1.6) ; `bank_movements.{account_code, account_category}` ; `treasury_advances.owner_id` (12/12 NULL).
> **`copros.cabinet_id` — RETIRÉE des abandons (A12 → MULTI-CABINET)** : ne PLUS droper. Devient **FK NOT NULL → `cabinets(id)`** (couche de tenance multi-cabinet posée dès la cible). Le cloisonnement par cabinet est centralisé dans les helpers d'autz (`user_has_copro_access`/`user_is_copro_manager` intègrent le périmètre cabinet). Écrans CRUD cabinet + invitation gestionnaires différés (finance d'abord). Voir INVENTAIRE-FONCTIONS §F + AUTORISATION.

### 1.2 FONCTIONS abandonnées

**Couche AG « bespoke » (n'écrit jamais le grand livre — décision USER verrouillée, T3-A4, 04 §5)**
`create_budget_from_ag`, `generate_combined_calls_from_ag` (source des 6 appels `issued` orphelins `ledger_tx_id` NULL, 03 §1.5), `create_alur_fund_from_ag`, `elect_council_from_ag`, `finish_ag_session`, `get_ag_pending_actions`, `mark_ag_action_activated`.
- (b) consommées par `lib/ag/api/finalisation.api.ts` + `features/ag/finalisation/` → **rebrancher sur le canonique AVANT drop** (Phase 4). (c) 0 edge. (d) doublent la chaîne qui POSTE le GL : `prepare_ag_decisions → activate_ag_decisions → generate_calls_from_ag_payload → post_budget_call_for_funds`.
- **Verdict : ABANDONNÉES** après rebranchement front prouvé iso-comportement sur HARNESS. La cible ne garde QUE la chaîne canonique.

**Fonctions « notifications fantômes » (île `ag_notifications`)** — 04 §5
`create_ag_notification`, `mark_notification_sent`, `mark_notification_failed`, `get_ag_recipients`, `get_ag_sending_stats`. → **ABANDONNÉES** après refacto (canal légal = `ag_envoi_tracking`). **Séquençage CORRIGÉ** : ces 5 fonctions ont TROIS consommateurs vivants à rebrancher sur `ag_envoi_tracking` AVANT le drop (5 fonctions + tables `ag_notifications`/`ag_notification_events`), pas le seul `email_webhook`. (1) **`ag_send_convocations`** (producteur, cœur légal) appelle `get_ag_recipients` (l.233), `create_ag_notification` (l.291), `mark_notification_sent` (l.313), `mark_notification_failed` (l.319) ; (2) **`ag_send_relance`** (producteur) appelle `create_ag_notification` (l.305), `mark_notification_sent` (l.339) ; (3) **`email_webhook`** (callback aval) lit `ag_notifications` par `provider_message_id` (l.131-135) et écrit `ag_notification_events` (l.150). Droper après n'avoir basculé que `email_webhook` casse au runtime les deux expéditeurs (RPC vers fonction inexistante) et scinde la donnée sur deux canaux. **Drop conditionné au rebranchement des TROIS edges (convocations + relance + webhook).**

**Surcharges legacy / doublons SQL (garder UNIQUEMENT la signature canonique)** — T3-A5, 02/03/06/07
| Fonction | Verdict | Raison |
|---|---|---|
| `post_budget_call_for_funds` **8-arg** | **ABANDONNÉE** | la 10-arg agrégée est la cible. |
| `post_supplier_payment` **7-arg** | **ABANDONNÉE / DROP** | non idempotente, risque double paiement ; l'edge `pay_supplier_invoice` passe déjà `p_idempotency_key` (8-arg). 07 §5. |
| `post_call_for_funds` (mono-clé) | **ABANDONNÉE** | supplantée par l'agrégé. **Séquençage** : rebrancher l'edge `generate_call_for_funds` sur la 10-arg AVANT abandon. 02 §A3, 03 §7. |
| `can_access_document(doc_id, user_id)` | **ABANDONNÉE / DROP sec** | **CASSÉE** : réfère table inexistante `copro_members` + rôles obsolètes. On garde `user_can_view_document`. 06 §5. |
| `generate_document_path` **3-arg** | **ABANDONNÉE** | surcharge legacy, format incompatible (drift) ; garder la 4-arg `ged/copro/category/year/file`. 06 §5. |
| `user_is_council_member` | **ABANDONNÉE** | lisait `memberships.role` (divergence) ; source unique = `is_council_member` (lit `council_members`). 04 §3. |
| `clear_ag_session_drafts` (doublon repo) | **ABANDONNÉE** | ne garder que la dernière signature. T3-A5. |
| `ensure_dev_membership`, `get_default_copro_id` | **ABANDONNÉES (prod)** | artefacts DEV-only, hors schéma cible prod (01 §5, AUTORISATION §5.2). |

**Fichiers de migration MORTS (7 `CREATE` sans contrepartie live — NE PAS rejouer)** — T3-A6
`generate_ag_document_path`, `get_latest_ag_document`, `register_ag_document`, `remove_ag_milestone`, `trg_ag_documents_create_ged_entry`, `trg_documents_updated_at`, `update_forum_topic_stats`. Présents en migration, absents du live → un replay les recréerait à tort.

### 1.3 VUES abandonnées

| Vue | Verdict | Raison & séquençage |
|---|---|---|
| `v_account_balances` | **DROP** | dérivait le 512 des `bank_movements` (chemin parallèle) ; la trésorerie se dérive du GL via `v_trial_balance`. 02 §1.8 / §5bis. |
| `v_alur_fund_summary` | **GARDER** | lit `alur_transfers` (faux mort CONSERVÉ) ; vue câblée `useALURData.ts`. NE PAS droper. |
| `v_alur_transfers_history` | **GARDER** | lit `alur_transfers` (faux mort CONSERVÉ) ; câblée front. NE PAS droper. |
| `v_mail_campaigns_overview`, `v_mail_inbox_overview` | **DROP** | île campagnes emailing (T3-A3, 08 §1). |
| `v_mail_*` (génériques) | **NON reconduites** | bloc campagnes droppé. 08 §6. |

### 1.4 ENUMS abandonnés — ENUMS.md §2.1 / §4.1 / §6

**Supprimés par fusion** (valeurs absorbées par un type unique) :
- `vote_direction` + `council_vote_choice` → **`vote_choice`** (AG + conseil, un seul type).
- `mail_delivery_status` → **`delivery_status`**.
- `urgency_level` + `work_priority` → **`priority_level`** (5 niveaux ; `work_priority.urgent`→`critical`).

**Supprimés par DROP de feature / remplacés par table de référence** :
- `mail_campaign_status`, `mail_recipient_type`, `mail_delivery_status` → feature emailing droppée.
- `ag_notification_type` → île notifications fantôme droppée (canal = `ag_envoi_tracking`).
- `contract_type`, `provider_domain`, `planned_work_type` → **table de réf `work_domain`** (extensible sans migration d'enum ; colonnes deviennent FK `domain_id`).
- `provider_category` → **`tiers_category`** (`coproflex` retiré, label marketing).

**Retirés des conservés (orphelins après DROP de leur unique table porteuse)** :
- `transfer_destination` → **CONSERVÉ** : sa table porteuse `alur_transfers` est un faux mort GARDÉ (correction réconciliation), l'enum reste donc nécessaire.
- `payment_phase_status` → **CONSERVÉ** : sa table porteuse `budget_payment_schedules` est un faux mort GARDÉ (câblé front : `usePaymentSchedule.ts`/`TravauxDetailModal.tsx`), l'enum reste donc nécessaire.

**Abandonné (jamais créé)** :
- `tiers_type` → les rôles de `tiers` sont portés par **FLAGS booléens** `is_supplier`/`is_provider`/`is_notary` (un enum ne sait pas exprimer le cumul de rôles). 02 §1.12, 07 §1.1.

---

## PARTIE 2 — « FAUX MORTS » : objets GARDÉS malgré 0 ligne (preuve de câblage)

> 0 ligne ≠ table morte. Ces objets croisent au moins une preuve d'usage réel → **NE PAS droper**.

| Objet | Lignes | Preuve de câblage (décisive) |
|---|---|---|
| `alur_transfers` (TABLE) | 0 | (b) `useALURData.ts` l.286 ; (d) vues `v_alur_fund_summary` + `v_alur_transfers_history`. Feature fonds travaux ALUR, transfert pas encore opéré. **GARDER structure + RLS, 0 ligne** (cohérent MIGRATION-DONNEES §3). Un éventuel branchement GL (le transfert ALUR devrait poster une écriture) est une amélioration future, PAS un motif de DROP. |
| `bank_matches` (TABLE) | 0 | (c/d) lue par `refresh_bank_movement_status` + vues `v_bank_movements_overview`/`v_payments_overview` (feature mouvements-bancaires). Rapprochement pas encore fait. 02 §1.9. |
| `budget_payment_schedules` (TABLE) | 0 | (b) `usePaymentSchedule.ts` → `TravauxDetailModal.tsx` (échéancier paiement travaux), monté sur **2 pages dashboard** (Budget/Travaux). **Confirmé câblé par l'USER → DROP ANNULÉ (ex-A8).** GARDER structure + RLS, 0 ligne ; `delete_service_order` reste inchangée (n'a PLUS à être réécrite pour la dropper). 03 §1.9 / §7-A4. |
| `mutation_steps` (TABLE) | 0 | (b) `lib/sales/api.ts` (l.235/423) ; (d) vue `v_mutation_detail` + trigger `initialize_mutation_steps`. Feature mutations gestionnaire. 05 §1.2 / §7. |
| `technical_documents` (TABLE) | 0 | (b) `useLogbook.ts` l.150 (carnet d'entretien). |
| `planned_works` (TABLE) | 0 | (b) `useLogbook.ts` l.170 ; (d) `domain_id → work_domain`. 07 §1.10. |
| `insurance_policies` (TABLE) | 0 | (b) `useLogbook.ts` l.195 + `useAssuranceDetailPage.ts` l.53 ; trigger intégrité slug `assurance`. 07 §1.9. |
| `council_documents` (TABLE) | 0 | (b) `useConseilSyndicalPage.ts` l.57 + `lib/council/api.ts` l.395 ; (c) edge `council-workflow` l.407. Porte enums `council_doc_link_type`/`content_visibility` (conservés tant qu'elle vit). 04 §1.9, 06 §note anti-contradiction. |
| ~~`document_access` (TABLE)~~ | — | **DÉPLACÉE en PARTIE 1 — ABANDONNÉE / DROP séquencé (A4).** L'arbitrage 06 §1 est tranché par l'USER : confidentialité GED SIMPLE (3 niveaux de visibilité fixés par le gestionnaire), l'ACL fine disparaît. DROP après réécriture `user_can_view_document` + rebranchement front/edge. |
| `document_versions` (TABLE) | 0 | (b) via vue `v_document_versions` lue par `lib/documents/api.ts` l.408. Drop seulement en bloc (table + vue + réécriture `getDocumentVersions`). 06 §5bis. |
| `ag_milestones` (TABLE) | 0 | (b) `useAGDelais.ts` l.149 + RPC `get/save_ag_milestone`. **Drop SÉQUENCÉ** : réécrire `get_ag_wizard_state` (jalons → `ag_session_drafts`) AVANT. 04 §1. |
| `ag_notifications` + `ag_notification_events` (TABLE) | 0 / 0 | (b) `useAgNotifications.ts` l.77 ; (c) edge `email_webhook` l.132 (lit) + l.150 (écrit `events`). « Câble derrière le meuble » → GARDER jusqu'à refacto webhook vers `ag_envoi_tracking`. ⚠️ pas un drop mécanique. 04 §5/§6. |
| `mails` (TABLE) | 0 | (b) `useMailbox.ts`, `app/api/mail/{send,inbound}`, `communication/mail/page.tsx`. = messagerie/boîte interne (Resend), à NE PAS confondre avec l'île campagnes. 08 §1.8 / §6. |
| `budget_expenses` (TABLE) | 1 | (d) reprise `ledger_tx_id` des 7/11 dépenses comptabilisées (lien GL immuable) ; `fournisseur`→`tiers_id`. 03 §6. |
| `treasury_advances` / emprunt collectif (TABLE) | 0 | branchement GL à câbler (`post_collective_loan`), pas de reprise de données mais structure conservée. 02 §8. |
| `providers` (TABLE) | 13 | **FUSION** en `tiers` (`is_provider=true`) — pas un drop, migration de données. T3-B, 02 §1.12, 07 §3. |
| `suppliers` (TABLE) | 8 | **FUSION** en `tiers` (`is_supplier=true`). Les FK `…_id → suppliers`/`providers` se repointent sur `tiers`. JAMAIS de drop des deux sources. 02 §1.12. |
| `council_doc_link_type` / `content_visibility` (ENUMS) | — | **CONSERVÉS** tant que `council_documents` vit (correction anti-contradiction ENUMS.md : NON absorbés par `document_relation_kind`). |
| `_rls_state_snapshot` (TABLE) | 69 | Outillage du toggle RLS dev/prod. Artefact opérationnel → GARDER comme **tooling** (hors schéma métier), pas migré comme table de domaine. T3-B. |

---

## PARTIE 3 — ARBITRAGES UTILISATEUR OUVERTS (ne PAS trancher seul)

> **2026-06-04 — TOUS LES ARBITRAGES SONT TRANCHÉS (décisions USER verrouillées). Plus aucun objet ouvert à ce niveau.**
>
> Pour mémoire des résolutions :
> - `dossiers` → **DROP** (A5, pas de module tâches) — voir PARTIE 1.
> - `copros.cabinet_id` → **CONSERVÉE en FK NOT NULL** (A12 → multi-cabinet) — RETIRÉE des abandons.
> - `document_access` → **DROP séquencé** (A4, confidentialité GED simple) — voir PARTIE 1.
> - `admin` (rôle) → **`platform_admin`** (transverse hors cabinet, A13).
> - `budget_status 7→5`, `notaire table→rôle tiers` → tranchés dans les blueprints de domaine.

---

## Synthèse

- **Tables abandonnées (CONFIRMÉES)** : 10 (`lot_accounts`, `mail_labels_v2`, île campagnes ×5 = `mail_campaigns`/`mail_inbox`/`mail_recipients`/`mail_folders`/`mail_templates`, `ag_pouvoirs`, `notaires`, **`document_access`** (A4, DROP séquencé), **`dossiers`** (A5, DROP sec)). Dont 2 fusions + 2 séquencées (jamais DROP sec). ⚠️ `mail_folders`/`mail_templates`/`mail_inbox` : DROP uniquement parce que purement île campagne — la messagerie interne transactionnelle vit dans `mails` (faux mort gardé).
- **Tables RETIRÉES de la liste des abandons** : `alur_transfers` (faux mort câblé → PARTIE 2), **`budget_payment_schedules`** (faux mort câblé confirmé USER → PARTIE 2, ex-A8 annulé), `copros.cabinet_id` (devient FK NOT NULL, A12 → multi-cabinet). Plus aucun arbitrage USER ouvert (PARTIE 3 close).
- **Fonctions abandonnées** : couche bespoke AG (7) + notifications fantômes (5, GARDÉ TRANSITOIRE → DROP étape 3) + 8 surcharges/doublons legacy + 7 fichiers migration morts.
- **Vues abandonnées** : `v_account_balances`, 2 vues campagnes + `v_mail_*`. (Les 2 vues ALUR sont GARDÉES.)
- **Enums abandonnés** : 12 supprimés (fusion/feature) + `tiers_type` jamais créé. (`transfer_destination` CONSERVÉ avec `alur_transfers` ; `payment_phase_status` CONSERVÉ avec `budget_payment_schedules`.)
- **Faux morts GARDÉS** : 18 objets (13 tables 0-ligne câblées dont `alur_transfers`, `budget_payment_schedules`, `mutation_steps`, `mails` — `document_access` retiré (→ abandonné A4) ; `providers`/`suppliers` à fusionner, 2 enums conseil, tooling RLS).
- **Garde-fou transverse** : tout objet à 0 ligne mais câblé front/edge/vue/fonction est **conservé** ; `count(*)=0` SEUL n'est jamais une preuve de mort. Tout DROP avec câblage est **séquencé** (rebranchement AVANT). Copros immuables `11111111`/`22222222` non touchées (lecture seule).
