# Roadmap maître — Re-baseline CoProFlex + assainissement des 42 risques

> Écrit 2026-06-04. Tracker de tête de la refonte. Lecture seule des sources
> (`.planning/db-cible/`, `.planning/atlas/`). Ce document est la **vue phasée complète** ;
> chaque phase 1→4 reçoit son **propre plan détaillé écrit juste avant son exécution**
> (méthode `writing-plans` : tâches « bite-sized », chemins exacts, 1 test/tâche, commits fréquents).

## Goal

Reconstruire CoProFlex sur une **base de données propre** (re-baseline SQL + seed d'une
COPRO-TEMPLATE canonique) et **assainir les 42 risques** du `REGISTRE-RISQUES.md` (R1..R42),
en livrant des **tranches verticales testables de bout en bout**, finance d'abord, le grand
livre restant la **source unique** de tout solde, l'unité de gestion restant **le lot**, et
le cloisonnement **multi-cabinet** (RLS par cabinet) posé dès la fondation.

## Architecture (cible)

```
  CABINETS (tenant racine, RLS cloisonnée par cabinet — helpers centralisés)
      │ copros.cabinet_id FK NOT NULL
      ▼
  01 SOCLE  copros · buildings · lots · lot_owners · coproprietaires
            repartition_keys(+lines)=quote-part · memberships · profiles
      │
      ├─ 02 FINANCE / GRAND LIVRE  (accounts · ledger_* · périodes) ── SOURCE UNIQUE du solde
      ├─ 03 BUDGETS / APPELS / ALUR / IMPAYÉS  ── poste le GL via post_budget_call_for_funds
      ├─ 04 AG + CONSEIL (auto-population)      ── finalize_and_activate_ag → prepare → activate → poste GL
      ├─ 05 MUTATIONS / ÉTAT DATÉ (art.5/art.20)
      ├─ 06 GED  ·  07 MAINTENANCE/TIERS (fusion `tiers`, `work_domain`)  ·  08 COMMUNICATION
      └─ tout solde (lot, personne, trésorerie) se DÉRIVE des vues v_* sur le GL posté
```

- **Couche d'accès** : on étend le modèle RPC de la finance (chaque écriture passe par une
  fonction `SECURITY DEFINER` gardée `G-MGR`/`G-OWNER`, deny-by-default) aux domaines mutants ;
  l'accès table direct résiduel s'appuie sur la RLS cloisonnée.
- **Edges/API** : edges Deno en `ANON+JWT` (RLS active) par défaut ; `/api/**` gated session+cabinet.
- **Seed** : la COPRO-TEMPLATE est une **séquence de RPC canoniques idempotente** (jamais d'INSERT
  brut sur le GL), rejouable sur branche jetable → audit cible = 0 écart.

## Tech Stack

- **Front** : Next.js 16 (App Router) · React 19 · TypeScript 5 **strict, jamais `any`** ·
  CSS Modules (pas de Tailwind) · Lucide · npm · ESLint (pas Biome/pnpm).
- **Back** : Supabase / Postgres — migrations SQL versionnées, fonctions `SECURITY DEFINER`,
  RLS `ENABLE` prod / `DISABLE` dev + `FORCE` sur tables comptables, edges Deno.
- **Test SQL** (vaut comme « test » de chaque tâche SQL) : appliquer la migration sur une
  **branche Supabase jetable** → **requête de vérification structurelle** (`information_schema`,
  `pg_policies`, `pg_proc`) → **diff vs blueprint** (`db-cible/0x-*.md`) → **commit**.
- **Test front** : `tsc --noEmit` + ESLint + vitest + parcours réel (Playwright) sur le template.

---

## PHASE 0 — Fondation (re-baseline SQL + seed template + test restauration)

**Objectif.** Reconstruire le schéma propre depuis zéro (aucune ligne du live, décision A1) et
poser la COPRO-TEMPLATE de référence, vérifiée par audit à 0 écart.

**Périmètre.**
- Génération SQL ordonnée : enums + `work_domain` ; **table `cabinets`** (tenant racine) ;
  socle 01 (`copros.cabinet_id` FK NOT NULL → lots → personnes, DROP des `lots.tantiemes_*`,
  quote-part exclusivement dans `repartition_key_lines`) ; finance 02 (accounts → ledger →
  périodes) ; domaines 03→08 ; **helpers d'autorisation** (cloisonnement cabinet centralisé :
  `user_has_copro_access` / `user_is_copro_manager`) + gardes in-function deny-by-default ;
  triggers d'intégrité (`copro_id`, `enforce_lot_id_on_45x` **sans exception**, A2) ; vues `v_*` ;
  RLS (ENABLE prod / DISABLE dev, FORCE comptable).
- Seed global (une fois) : `work_domain` (~28 slugs), 6 `email_templates` système, 1 `platform_admin`.
- Seed COPRO-TEMPLATE (`TEMPLATE-SEED.md`) : cabinet → copro → 6 lots → 4 clés → exercice ouvert →
  à-nouveaux propres (`set_opening_balance`) → boucle financière complète (AG→appels→encaissements→
  facture→ALUR→clôture→affectation 110/120→à-nouveau N+1) → 1 mutation (état daté + opposition art.20).

**Risques couverts directement (préparation du terrain pour tout le reste).**
- **R32** (DROP sec tables mortes : `lot_accounts`, `mail_labels_v2`, île campagnes ×5,
  `ag_pouvoirs`→fusion attendance A10, `notaires`→fusion `tiers`) — n'existent simplement pas dans
  le schéma neuf ; fichiers migration morts non rejoués.
- **R40** (vue `v_coproprietaires_overview` doublonnante) — réécrite proprement côté DB cible.
- **R15** (cast `any` généralisé) — **amorcé** : génération des types TS depuis la base neuve
  (`generate_typescript_types`) qui remplace `createUntypedClient`.
- Fondations de **R1..R14** (RLS, helpers, gardes, GL, lot-centric) posées ici mais **rebranchées**
  dans les phases suivantes.

**Dépendances / ordre.** Aucune (point de départ). Bloque toutes les autres phases.

**Critère d'acceptation testable.**
1. La COPRO-TEMPLATE **se restaure sur une branche Supabase jetable** par la séquence de RPC.
2. `audit_finance_integrity(copro)` = **0 écart** ; Σ débits = Σ crédits (GL équilibré).
3. **0 écriture 45x sans `lot_id`** (`SELECT count(*) FROM ledger_entries e JOIN accounts a … WHERE
   a.nature LIKE '45%' AND e.lot_id IS NULL` = 0).
4. Σ `weight` = total sur les 4 clés ; `repartition_key_is_complete = true` ; 1 primaire actif/lot.
5. **Diff structurel** schema ↔ blueprint `db-cible/01..08` = 0 divergence ; `pg_proc` confirme
   les 126 fonctions GARDÉES + 20 RÉÉCRITES + 10 AJOUTÉES, 0 fonction ABANDONNÉE présente.

---

## PHASE 1 — Sécurité (cloisonnement inter-cabinet)

**Objectif.** Fermer les 4 trous BLOQUANTS de sécurité avant toute exposition prod.

**Périmètre & risques couverts.**
- **R1** — gate session + scoping copro/cabinet sur **tout** route handler `/api/**` (le middleware
  ne protège que les pages) ; helper `requireManager(req, coproId)` partagé.
- **R2** — 3 edges humains `service_role` (`maintenance-workflow`, `council-workflow`,
  `communication-workflow`) → repasser en **ANON+JWT** (RLS active, comme les 14 edges sains) ou
  re-dériver `copro_id` + `user_is_copro_manager(auth.uid())` en tête de handler ;
  `maintenance-workflow` prioritaire (seul sans re-check).
- **R3** — `register_correspondence_form_votes` (`SECURITY DEFINER` sans `auth.uid()`) : ajouter garde
  `auth.uid()` + appartenance copro ; idem pour `ag-get-live-results` / `ag-correspondence-eligible`
  (service_role sans re-check) → ANON+JWT.
- **R4** — `/api/mail/inbound` : vérifier la **signature webhook Resend**, résoudre la copro par
  destinataire, retirer `DEFAULT_COPRO_ID 11111111` / `DEFAULT_OWNER_ID` en dur (lié R16, finalisé Ph.3).

**Dépendances / ordre.** Après Phase 0 (helpers `user_is_copro_manager`/RLS doivent exister).
Indépendant de la finance ; peut être mené en parallèle de la Phase 2 si besoin.

**Critère d'acceptation testable.** Sur la branche jetable, en session **cabinet B**, toute requête
`/api/**` et tout appel des 3 edges visant une copro du **cabinet A** renvoie **403/refus** ;
un POST `/api/mail/inbound` **sans signature valide** est **rejeté** ; aucun ID copro/owner en dur
ne subsiste (grep = 0). En session légitime (cabinet propriétaire), les mêmes appels passent.

---

## PHASE 2 — Finance propre & testable de bout en bout

**Objectif.** Rendre la **boucle financière complète** réelle et testable de bout en bout, chaque
opération écrivant le grand livre (compta d'engagement), aucune source parallèle concurrente.

**Périmètre & risques couverts.**
- **R5** — AG → GL : rebrancher la chaîne canonique `finalize_and_activate_ag → prepare_ag_decisions →
  activate_ag_decisions → generate_calls_from_ag_payload → post_budget_call_for_funds` ; **abandonner**
  la chaîne bespoke (`create_budget_from_ag`, `generate_combined_calls_from_ag`, `create_alur_fund_from_ag`,
  `elect_council_from_ag`, `finish_ag_session`) **après** rebranchement.
- **R6** — factures → GL : réactiver les edges `create_supplier_invoice`/`pay_supplier_invoice`
  (post-as-you-go D6xx/C401, D401/C512), **supprimer l'UPDATE direct** de `supplier_invoices.status`,
  brancher la ventilation réelle ; avoir = écriture d'extourne (pas montant négatif).
- **R18** — DROP du cluster `invoices/*` (5 pages legacy factices, rien à rebrancher) ; garder `factures/*`.
- **R22** — budgets : supprimer doublons `budget-works`/`budget-current` ; compléter ou retirer
  `budgets/validation` (persiste échéancier/clé).
- **R23** — trésorerie : garder `mouvements-bancaires` (seul routé) ; retirer `transactions` +
  `bank-movements` ; persister l'import.
- **R10** — `etats-dates` : rebrancher sur lots/owners/GL réels (état daté art.10-1, domaine 05).
- **R7** — réécrire `cast_vote` (bug garde attendance + UNIQUE) avant fiabilisation des votes.
- **R11** — relances impayés : brancher `handleSendRelance`/`…Groupees`/`MarkAsRegle` sur les RPC
  existantes (`createPaymentReminder`/`markReminderSent`) au lieu des `setTimeout`/`setState`.
- **R26** — surcharges SQL legacy : garder la signature canonique (`post_budget_call_for_funds` 10-arg,
  `post_supplier_payment` idempotent) ; `post_call_for_funds` agrégé 10-arg, rebrancher l'edge
  `generate_call_for_funds` AVANT abandon de la mono-clé.
- **R27** — réécrire les fonctions buggées (`get_pending_reminders_to_send`, `validate_budget_expense`,
  `create_logbook_from_service_order`, `generate_service_order_number`) en séquence avec les renommages
  (`lot_owners`, `tiers_id`, `title`).
- **R17** (portefeuille) — câbler les vrais KPIs (recouvrement/impayés dérivés du GL) ; retirer
  `ensure_dev_membership` du chemin prod. *(financier, donc rattaché ici.)*

**Dépendances / ordre.** Après Phase 0 (RPC canoniques + GL) ; **après Phase 1** pour exposer sans
risque inter-cabinet. Tranches verticales successives : (a) AG→appels (R5/R7), (b) encaissements/
relances (R11/R27), (c) factures (R6/R18/R27), (d) trésorerie (R23), (e) budgets (R22/R26),
(f) état daté (R10), (g) portefeuille KPIs (R17).

**Critère d'acceptation testable.** Sur la COPRO-TEMPLATE (branche jetable), parcours **réel**
(Playwright) : voter un budget en AG → appels générés (D450/C701) → encaisser 1 lot → relancer 1 lot
impayé (reminder persisté) → saisir+payer 1 facture (D6xx/C401 puis D401/C512) → clôturer/affecter →
**`audit_finance_integrity` reste à 0 écart** et chaque étape a produit une **écriture GL vérifiable** ;
aucune page `invoices/*`, `budget-works/current`, `transactions`/`bank-movements` ne subsiste ;
`etats-dates` affiche des montants dérivés du GL (pas de mock).

---

## PHASE 3 — Dédoublonnage hors finance (finir les migrations)

**Objectif.** Éliminer les doubles sources de vérité et les doublons de features hors finance —
ne plus laisser deux patterns coexister (un mauvais exemple à copier).

**Périmètre & risques couverts.**
- **R8** — contrats : unifier sur Supabase ; supprimer le store mémoire `contracts.service.ts` et les
  fallbacks localStorage ; `/contracts/new` écrit en base.
- **R9** — `settings/info` : rebrancher sur le chemin onboarding réel (lots/clés/copropriétaires).
- **R12** — `document_access` (table abandonnée A4) : **séquencé** — (1) réécrire `user_can_view_document`
  sur colonne `visibility` 3 niveaux, (2) rebrancher front (`AccessRightsManager`) + edge
  `get_document_url`, (3) **PUIS DROP**.
- **R13** — île `ag_notifications` : **séquencé** — rebrancher les 3 edges (`ag_send_convocations`,
  `ag_send_relance`, `email_webhook`) sur `ag_envoi_tracking` AVANT drop des 5 fonctions + 2 tables.
- **R19** — providers : factoriser `/providers/copro` & `/providers/syndic` (+`/directory`) en un
  composant paramétré par `category`.
- **R20** — ventes : garder un chemin impayés (rediriger `/contentieux/impayes` doublon byte-à-byte
  vers `/ventes-impayes/impayes`) ; garder `features/ventes`, retirer `/sales` legacy fictif.
- **R25** — `council_documents` : rebrancher `conseil-syndical/` + edge `council-workflow` sur le
  modèle documentaire canonique (faux-mort gardé tant que vivant).
- **R16** — identité hardcodée (`DEFAULT_OWNER_ID`/`CURRENT_USER_ID`) dans `useMailbox`/`useMessagerie`/
  `useMur`/`/api/mail/send`/hub comm → rebrancher sur `auth.uid()` (finalise le résiduel de R4).
- **R21** (data-layer) — finir les migrations : une seule porte par domaine (AG triplé, Ventes ×3),
  éteindre `lib/mock-data`. *(dédoublonnage transverse, rattaché ici.)*

**Dépendances / ordre.** Après Phase 2 (la finance, plus risquée, est stabilisée). Chaque DROP câblé
est **séquencé** (rebrancher AVANT). R12/R13 sont des séquences strictes ; R16 dépend de R4 (Phase 1).

**Critère d'acceptation testable.** Pour chaque domaine : **une seule** source de données prouvée
(grep : 0 import `lib/mock-data`, 0 store mémoire contrats, 0 `DEFAULT_OWNER_ID`) ; les tables
`document_access` et l'île `ag_notifications` sont **droppées sur la branche jetable** sans erreur
runtime (parcours GED + convocation AG verts en Playwright après rebranchement) ; `tsc --noEmit` vert.

---

## PHASE 4 — Nettoyage (morts, orphelins, cosmétique, RLS prod)

**Objectif.** Retirer le code mort/orphelin résiduel, finaliser l'accès via RPC, et activer la
posture RLS de production.

**Périmètre & risques couverts.**
- **R14** — accès direct table → étendre le modèle RPC aux derniers domaines mutants ; **ne pas livrer
  prod avec RLS off** (bascule ENABLE).
- **R15** — finaliser le retypage sur les types générés (suppression des derniers casts `any`).
- **R24** — Conformité (Factur-X/PPT/DPE 100% mock) : brancher ou statuer hors-scope finance-first ;
  corriger/retirer le lien DPE 404.
- **R28** — `budget_payment_schedules` : arbitrage **tranché A8 = CONSERVÉ** (faux-mort câblé) ;
  confirmer le câblage `usePaymentSchedule`→`TravauxDetailModal`, `delete_service_order` inchangée.
- **R29** — 4 pages AG mortes (`ag/page.tsx`, `ag/[id]/minutes`, `designation-roles`,
  `votes-correspondance/[coproId]`, `resolutions-preview`, `checklist` mock) : supprimer.
- **R30** — pages finance mortes (`transfer`, `invoices/new|payment*|confirmation`, `factures/new`
  doublon) : supprimer.
- **R31** — `/dossiers` + `useDossiers` (DROP A5) ; statuer `/contentieux/litiges` (coquille).
- **R33** — hooks racine candidats morts (`useDocumentVariables`, `useGlobalVariables`,
  `useRolesExclusion`, `usePieceJustificative`, `useDevMockData`, `useKeyboardNavigation`) : confirmer
  fichier par fichier puis supprimer.
- **R34** — orphelins de routage (`releves-individuels`, `fonds-alur`, `cles-repartition`, `unpaid`) :
  ajouter à la sidebar OU statuer abandon.
- **R35** — templates PV stubs (`duplicate/setDefault/export/import/updateSection` → `null`) :
  implémenter ou désactiver les boutons ; corriger/retirer `preview` 404 ; retirer IDs `org-001` en dur.
- **R36** — handlers `alert()`/TODO (`handleTransferALUR`, `handleTransformToAppele`, exports PDF,
  marketplace, contact marketing) : implémenter par tranche ou désactiver visuellement.
- **R37** — fallbacks localStorage maintenance (`newOrdresService`, `coproflex_pending_renewals`,
  `custom_ordres_service`) : retirer ; corriger les deps de `useLogbook`.
- **R38** — compteurs maintenus client (`likes_count`/`comments_count`/`unread_count`/
  `last_message_preview`) → triggers/RPC DB ; factoriser `useCommunicationKpis`.
- **R39** — fiche lot sur faux-morts 0-ligne (`collective_loan_shares`/`collective_loans`,
  `treasury_advances`) : câbler la feature (post_collective_loan **différé A16**) ou masquer les sections.
- **R41** — cosmétique : bandeau « Source: Supabase » en dur, coordonnées placeholder marketing,
  redirect post-auth incohérent (`login`→`/portefeuille` vs `callback`→`/dashboard`),
  `archiveCoproprietaire` sans effet si copro sans lot.
- **R42** — `src/services/recommande` : confirmer usage puis garder/supprimer.

**Dépendances / ordre.** Dernière phase ; certains DROP (R29..R34) dépendent du rebranchement des
phases 2-3. La bascule **RLS prod** (R14) est l'**ultime étape** (après que tous les parcours passent
avec gardes actives).

**Critère d'acceptation testable.** Sur la branche jetable : RLS **ENABLE** sur toutes les tables +
FORCE comptable, et le **parcours complet du template** (AG→finance→GED→comm→mutation) reste vert en
session gestionnaire légitime ; `tsc --noEmit` + ESLint **0 erreur** (0 `any` résiduel) ; aucune route
morte/orpheline listée ne répond (404 attendus retirés) ; grep des handlers `alert()`/TODO ciblés = 0.

---

## TABLEAU DE COUVERTURE — R1..R42 → Phase

| Risque | Sévérité | Phase | Risque | Sévérité | Phase |
|---|---|---|---|---|---|
| R1  | BLOQUANT | **1** | R22 | MAJEUR | **2** |
| R2  | BLOQUANT | **1** | R23 | MAJEUR | **2** |
| R3  | BLOQUANT | **1** | R24 | MAJEUR | **4** |
| R4  | BLOQUANT | **1** | R25 | MAJEUR | **3** |
| R5  | BLOQUANT | **2** | R26 | MAJEUR | **2** |
| R6  | BLOQUANT | **2** | R27 | MAJEUR | **2** |
| R7  | MAJEUR | **2** | R28 | MAJEUR | **4** (A8 conservé) |
| R8  | MAJEUR | **3** | R29 | MINEUR | **4** |
| R9  | MAJEUR | **3** | R30 | MINEUR | **4** |
| R10 | MAJEUR | **2** | R31 | MINEUR | **4** |
| R11 | MAJEUR | **2** | R32 | MINEUR | **0** |
| R12 | MAJEUR | **3** | R33 | MINEUR | **4** |
| R13 | MAJEUR | **3** | R34 | MINEUR | **4** |
| R14 | MAJEUR | **4** | R35 | MINEUR | **4** |
| R15 | MAJEUR | **0** (amorce) → **4** (fin) | R36 | MINEUR | **4** |
| R16 | MAJEUR | **3** | R37 | MINEUR | **4** |
| R17 | MAJEUR | **2** | R38 | MINEUR | **4** |
| R18 | MAJEUR | **2** | R39 | MINEUR | **4** |
| R19 | MAJEUR | **3** | R40 | MINEUR | **0** |
| R20 | MAJEUR | **3** | R41 | MINEUR | **4** |
| R21 | MAJEUR | **3** | R42 | MINEUR | **4** |

**Bilan couverture : 42/42 risques rattachés.**
- Phase 0 : R32, R40, R15(amorce) — 3
- Phase 1 : R1, R2, R3, R4 — 4
- Phase 2 : R5, R6, R7, R10, R11, R17, R18, R22, R23, R26, R27 — 11
- Phase 3 : R8, R9, R12, R13, R16, R19, R20, R21, R25 — 9
- Phase 4 : R14, R15(fin), R24, R28, R29, R30, R31, R33, R34, R35, R36, R37, R38, R39, R41, R42 — 16
- (6 BLOQUANT en Phases 1-2 ; 22 MAJEUR répartis 2/3/4 ; 14 MINEUR en Phase 4 sauf R40→0.)

---

## Note — plans détaillés par phase

Chaque phase 1→4 reçoit son **propre plan détaillé** (méthode `writing-plans`), écrit **juste avant
son exécution**, avec tâches « bite-sized » (2-5 min) à checkbox `- [ ]`, chemins de fichiers exacts,
contenu réel, **un critère de test par tâche**, et commits fréquents. Pour le SQL, « test » =
appliquer la migration sur une branche Supabase jetable + requête de vérification structurelle + diff
vs blueprint, puis commit. La Phase 0 s'appuie sur `TEMPLATE-SEED.md` / `MIGRATION-DONNEES.md` /
`INVENTAIRE-FONCTIONS.md` ; les phases 1→4 sur `REGISTRE-RISQUES.md`, `MATRICE-LIAISON.md` et les
blueprints de domaine `db-cible/01..08`.
