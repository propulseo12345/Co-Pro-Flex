# CHECK-FINAL — Vérification post-correction du blueprint db-cible

> 2026-06-04 — Phase Audit, **lecture seule** (live `iyfesbjnkpynmwlsmxnp`, code `src/` + `supabase/functions/`). Aucun fichier blueprint modifié à ce stade : ce document constate l'état des corrections déjà appliquées et rend le verdict.

---

## 1. VERDICT

**GO.** Le blueprint est générable sans bug en cascade ni trou bloquant/majeur de schéma. Les 8 trouvailles mécaniques sont corrigées dans les fichiers et vérifiées contre le live + le code réel ; aucune n'a introduit de nouvelle incohérence. Restent **2 items design/utilisateur** (sévérité majeure, mais **non bloquants** : aucun ne casse le schéma ni la génération, les deux sont séquencés/circonscrits) qui relèvent d'un arbitrage USER, pas d'un bug.

- Bloquants restants : **0**
- Majeurs restants (bugs) : **0**
- Items design/user à soumettre à l'USER : **2** (majeurs en impact, non bloquants pour la re-baseline)

---

## 2. Trouvailles mécaniques — CONFIRMÉES & CORRIGÉES

Chaque correction a été relue dans le fichier ET vérifiée empiriquement (colonne live, corps de fonction, edge, enum).

### 2.1 `get_pending_reminders_to_send` lit `lots.owner_id` (colonne inexistante)
- **Fichier** : `INVENTAIRE-FONCTIONS.md` §H (l.123).
- **Correction présente** : reclassée **RÉÉCRIRE** (G-DEF-RO) ; remplacer `c.id = l.owner_id` par jointure `lot_owners lo ON lo.lot_id = ul.lot_id AND lo.is_primary AND lo.end_date IS NULL` puis `coproprietaires c ON c.id = lo.coproprietaire_id` (ou consommer `v_unpaid_by_lot`).
- **Vérif live** : `lots.owner_id` = **absente** ; le corps de `get_pending_reminders_to_send` contient bien `owner_id` ; `lot_owners` expose `lot_id`, `coproprietaire_id`, `is_primary`, `end_date` (cibles de la réécriture) ; vue `v_unpaid_by_lot` existe. ✅ Correction valide, cible de réécriture existante.

### 2.2 `validate_budget_expense` lit `budget_expenses.fournisseur` (colonne supprimée en cible)
- **Fichier** : `INVENTAIRE-FONCTIONS.md` §A (l.51).
- **Correction présente** : reclassée **RÉÉCRIRE** ; résoudre le nom via `SELECT name FROM tiers WHERE id = v_exp.tiers_id`, fallback `v_exp.label` ; séquencé avec la migration `fournisseur`→`tiers_id`.
- **Vérif live** : `budget_expenses.fournisseur` **existe** (sera renommée), `budget_expenses.tiers_id` **pas encore** ; corps de fonction contient bien `fournisseur`. ✅ Correction valide et séquencée.

### 2.3 `create_logbook_from_service_order` écrit `provider_id` / lit `subject` (renommés)
- **Fichier** : `INVENTAIRE-FONCTIONS.md` §K (l.151).
- **Correction présente** : reclassée **RÉÉCRIRE** ; INSERT `logbook_entries.provider_id` → `tiers_id` (val. `v_order.tiers_id`) ; lecture `v_order.subject` → `v_order.title` ; aligné avec `update_provider_stats` (même cause).
- **Vérif live** : `logbook_entries.provider_id` existe / `tiers_id` pas encore ; `service_orders.subject` existe / `title` pas encore ; corps de fonction contient bien `provider_id` ET `subject`. ✅ Correction valide.

### 2.4 Drop des notifications AG séquencé sur le seul `email_webhook` (2 senders cassent)
- **Fichier** : `OBJETS-ABANDONNES.md` §1.2 (l.43) + `INVENTAIRE-FONCTIONS.md` §C note (l.91) + ordre §5 (l.254).
- **Correction présente** : séquençage **CORRIGÉ** — drop des 5 fonctions conditionné au rebranchement des **TROIS** edges (`ag_send_convocations` + `ag_send_relance` + `email_webhook`), pas du seul webhook.
- **Vérif code** : `ag_send_convocations/index.ts` appelle `get_ag_recipients` (l.233), `create_ag_notification` (l.291), `mark_notification_sent` (l.313), `mark_notification_failed` (l.325) ; `ag_send_relance/index.ts` appelle `create_ag_notification` (l.305), `mark_notification_sent` (l.339). Les deux répertoires d'edge existent. ✅ Correction valide : sans elle, drop = RPC vers fonction inexistante au runtime des 2 expéditeurs.

### 2.5 `create_clean_test_copro` / `create_test_copro` cassent avec `cabinet_id` NOT NULL
- **Fichier** : `01-copros-lots-personnes.md` §5 (l.422) + dépendance de séquence §A1 (l.470).
- **Correction présente** : reclassées **RÉÉCRIRE (CI)** ; injecter un `cabinet_id` valide dans l'`INSERT INTO copros` (cabinet du template §6.1) + retirer les colonnes mortes droppées ; à faire **avant** le re-test session-user.
- **Cohérence interne** : aligné avec INVENTAIRE-FONCTIONS §O qui les liste GARDER — ici la note §5 précise le durcissement « RÉÉCRIRE ». Léger résidu cosmétique (§O reste libellé « GARDER » sans renvoyer au RÉÉCRIRE de 01 §5), **sans impact** : la disposition exécutable (réécrire avant NOT NULL) est sans ambiguïté dans 01. ✅ Trou de génération comblé.

### 2.6 TEMPLATE-SEED étape 18 nomme la table mais omet les RPC opposition
- **Fichier** : `TEMPLATE-SEED.md` étape 18 (l.87-89).
- **Correction présente** : l'étape 18 appelle désormais explicitement `record_mutation_opposition(mutation, avis_date, causes)` PUIS `settle_mutation_opposition(opposition_id, payment_date, amount)` → D512/C450-x (`source_type='mutation'`) apurant le 450 du lot.
- **Cohérence** : conforme à la décision verrouillée (opposition art.20, settle apure le 450 du lot, pas de transfert personne→personne) et à l'enum `opposition_status` (ENUMS §6.3). ✅ Correction valide.

### 2.7 `document_visibility` : trois jeux de valeurs incompatibles
- **Fichier** : `ENUMS.md` §0 (l.18), §6.5 (l.340).
- **Correction présente** : jeu de labels **tranché = celui de 06** (`{gestionnaire_seul, conseil, tous_coproprietaires}`), désigné **source unique** ; AUTORISATION §4/§7.2 et 06 §2/§3 (qui parlaient de `manager_only/council/all_owners`) doivent s'y aligner. Mapping migration depuis `document_confidentiality` fourni (manager→gestionnaire_seul, council→conseil, public→tous_coproprietaires, restricted→gestionnaire_seul), `DEFAULT 'gestionnaire_seul'`.
- **Cohérence** : `document_relation_kind` retire `acl` (A4) ; `document_confidentiality` supprimé. Catalogue désormais cohérent en interne. ✅ Correction valide (l'alignement réel de AUTORISATION.md reste une tâche d'implémentation, pas un bug de schéma : la source unique est désignée sans ambiguïté).

### 2.8 `delivery_status` : valeur live `error` sans remap (cast 1:1 impossible)
- **Fichier** : `ENUMS.md` §1.2 (l.54).
- **Correction présente** : règle de conversion **OBLIGATOIRE** ajoutée — `error → failed` avant `ALTER COLUMN ... TYPE delivery_status`, sinon `invalid input value for enum`.
- **Vérif live** : enum `delivery_status` ne contient **pas** `error` ; `ag_envoi_tracking.status` est `text` et porte **9 lignes** `error` (dont l'immuable 11111111). ✅ Correction valide et indispensable au cast.

---

## 3. Faux-positifs / vérifications croisées notables (rien à corriger)

- **`transfer_destination` CONSERVÉ** : confirmé cohérent — `alur_transfers` est un faux-mort GARDÉ (2 vues + `useALURData.ts`), l'enum est structurellement requis par `alur_transfers.destination`. Pas un orphelin. (ENUMS §4.1 note, OBJETS-ABANDONNES §1.4.)
- **`period_status` 5→3** : le maintien de `closed` ET `approved` (jalons `closed_at`/`approved_at` distincts) est justifié par la donnée live (6 périodes `closed`) et la chaîne `close_period`→`approve_period`. Pas de sur-fusion. (ENUMS §1.3.)
- **Notifications AG GARDÉES transitoires** : la cohérence entre INVENTAIRE-FONCTIONS §C/§Q.3 (« GARDÉ TRANSITOIRE → DROP étape 3 ») et OBJETS-ABANDONNES PARTIE 2 (table en faux-mort) est maintenue ; pas de drop mécanique.

---

## 4. ITEMS DESIGN / UTILISATEUR RÉSIDUELS (à soumettre à l'USER — PAS des bugs)

> Ces 2 items sont des **arbitrages métier**, pas des défauts de génération. Aucun ne casse le schéma ni la re-baseline. Ils sont **majeurs en impact** mais **non bloquants** (séquencés / circonscrits). À trancher par l'USER, au même titre que `dossiers` / `document_access` l'ont été.

### 4.1 [majeur, non bloquant] `budget_payment_schedules` classée ABANDONNÉE alors qu'elle est câblée front de bout en bout
- **Fichier** : `OBJETS-ABANDONNES.md` §1.1 (l.25).
- **Constat** : la fiche classe la table « ABANDONNÉE / DROP » sur la seule preuve « `payment-schedules.api.ts` (jamais branché) » et « 0 fonction métier ». **C'est incomplet.** Chaîne front réelle et atteignable, vérifiée :
  - `src/lib/budget/payment-schedules.api.ts` LIT/ÉCRIT la table (`.from('budget_payment_schedules')` sur select/insert/update — `listPaymentSchedules`, `createPaymentPhases`, `markPhasePaid`, etc.).
  - `src/hooks/modules/usePaymentSchedule.ts` consomme cette api (read + write).
  - `TravauxDetailModal.tsx` monte le hook **et est réellement RENDU** sur deux pages dashboard : `app/(dashboard)/finance/budget-works/page.tsx` (l.112) et, via `BudgetsModals.tsx` (l.201), `app/(dashboard)/finance/budgets/page.tsx` (l.223).
- **Pourquoi c'est un item design et non un bug** : selon la **Règle d'or** du document lui-même (l.5 : « 0 importeur front réel » exigé pour ABANDONNÉ ; « toute preuve d'usage bascule en À GARDER faux mort »), la table devrait être un **faux-mort GARDÉ**, traitée comme `mutation_steps`/`alur_transfers`. Mais : 0 ligne, 0 écriture GL, et le DROP est **déjà correctement séquencé** (réécrire `delete_service_order` AVANT). Ce n'est donc pas un build-breaker — c'est l'arbitrage « garder une feature travaux atteignable depuis l'UI mais inactive, ou la dropper » qui n'a pas été soumis faute d'avoir vu la preuve front.
- **À soumettre à l'USER** : DROP (statu quo du doc) **ou** bascule en faux-mort GARDÉ. Si GARDÉE, reconsidérer l'enum `payment_phase_status` (retiré ENUMS §4.1 l.276) et la disposition de `delete_service_order`.

### 4.2 [majeur, non bloquant] Edge functions humaines en `service_role` : contournent RLS + la garde G-MGR (fuite inter-cabinet)
- **Fichier** : `01-copros-lots-personnes.md` (modèle d'autorisation) + couche edge (TS, hors schéma).
- **Constat (mécanisme réel, prouvé)** : 3 edges déclenchés par un humain créent leur client avec `SUPABASE_SERVICE_ROLE_KEY` **sans forwarder le JWT user** — `maintenance-workflow` (l.62-71), `council-workflow` (l.62-71), `communication-workflow` (l.78-87). Le JWT ne sert qu'à `auth.getUser()` ; toutes les écritures DB tournent en `service_role`. `handleUpdateStatus` fait `.update('service_orders').eq('id', orderId)` sur un `orderId` arbitraire, `handleCreateOrder` écrit sur `data.coproId` — **aucun contrôle copro/cabinet**. Double effet sur le modèle cible : (1) RLS bypassée ; (2) dans la garde `is_service_call() OR user_is_copro_manager(p_copro_id)`, `is_service_call()` = TRUE court-circuite l'unique endroit où vit le filtre cabinet → un gestionnaire du cabinet A peut écrire sur une copro du cabinet B.
- **Correctif de la trouvaille sur ses propres exemples** : 3 des 6 edges qu'elle cite sont des **faux positifs** (Pattern B). `ag-register-correspondence-vote`, `ag-get-live-results`, `ag-correspondence-eligible` utilisent la clé service_role comme `apikey` MAIS **forwardent le JWT user** via `global.headers.Authorization` → PostgREST résout le rôle depuis le bearer (`authenticated`), `is_service_call()` = FALSE, la garde G-MGR/G-OWNER S'APPLIQUE. Le bon pattern de référence existe déjà (`record_payment`, anon + JWT user). Le trou réel est donc **circonscrit à 3 edges** (Pattern A).
- **Vérif** : `is_service_call` absente du live (à créer, conforme blueprint) ; son corps cible (AUTORISATION §2.3) lit uniquement `request.jwt.claims->>'role'` (dépend du bearer, pas de l'apikey) — empiriquement confirmé.
- **Pourquoi c'est un item design et non un bug de schéma** : le schéma et les fonctions cibles se génèrent et s'exécutent correctement ; les gardes DB sont justes. Le trou est dans la couche edge (TS) qui échappe au modèle « cloisonnement centralisé dans les helpers ». Non bloquant pour la re-baseline (n'altère ni schéma ni génération), impact sécurité inter-tenant réel mais confiné, fix net déjà démontré.
- **À soumettre à l'USER** : convertir les 3 edges Pattern A vers le pattern `record_payment`/`ag-register` (anon + JWT user) **OU** les faire re-dériver `copro_id` puis appeler `user_is_copro_manager(auth.uid())` avant toute écriture. Recommander d'inscrire dans AUTORISATION une exigence explicite : « tout edge déclenché par un humain s'exécute en session-user (anon + JWT), jamais en service_role ».

---

## 5. Synthèse

| Catégorie | Nb | État |
|---|---|---|
| Trouvailles mécaniques corrigées & vérifiées | 8 | ✅ landées, aucune régression introduite |
| Bloquants restants | 0 | — |
| Majeurs (bugs) restants | 0 | — |
| Items design/user à arbitrer | 2 | `budget_payment_schedules` (DROP vs faux-mort) · 3 edges humains en service_role (anon+JWT vs re-dérive cabinet) |

**Conclusion : GO** pour la génération du blueprint db-cible. Les 2 items résiduels sont à présenter à l'USER comme des décisions (au même titre que les arbitrages `dossiers`/`document_access`), non comme des correctifs préalables au build.
