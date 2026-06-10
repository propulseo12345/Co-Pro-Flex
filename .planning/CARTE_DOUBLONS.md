# Carte des doublons & plan de nettoyage — CoProFlex

> Établi le 2026-06-04 (lecture seule : 3 scanners SQL/front/tables + diagnostic AG dédié, recoupés avec la base live `iyfesbjnkpynmwlsmxnp` et les audits existants).
> **Aucune écriture n'a été faite. Aucune copro immuable (`11111111`, `22222222`) n'a été touchée.**

## Synthèse

**21 clusters** dédupliqués (sql=8, front=8, table=5). Sévérité : **2 bloquants**, 4 élevés, 13 moyens/faibles.

La dette dominante est **un seul problème structurel décliné partout** : un système de finalisation d'AG « bespoke » (front + RPC déployées hors-migration) qui **double** le moteur canonique `prepare/activate → generate_calls_from_ag_payload → post_budget_call_for_funds`, et qui **ne génère aucune écriture comptable** (appels de fonds sans grand livre, nomination syndic en INSERT direct depuis le front).

Autour : **~33 fonctions en *drift*** (présentes en base, absentes des migrations → non reproductibles par replay), 2 vraies surcharges SQL non droppées, ~9-10 formateurs euro recopiés, 2 arbres de features front parallèles, des **pages EN/FR qui sont des copies byte-à-byte** (et non des redirects, contrairement à la mémoire projet), et ~6 tables mortes / îlots fermés.

---

## Garde-fous transverses (non négociables)

1. **Copros immuables** : jamais d'écriture/drop/test sur `11111111` ni `22222222`. Tout test de comportement passe par une copro **HARNESS jetable** (`create_test_copro_seeded`).
2. **`ag_pending_actions`** : aucun reset/purge (décision actée). La bascule AG doit préserver cette table.
3. **Grand livre = source unique immuable** : ne jamais introduire un chemin qui crée appels/charges **sans écriture comptable**. Toute redirection conserve ou améliore le posting GL.
4. **Jamais droper sans preuve d'usage NUL** : 0 ligne pertinente + 0 importeur `src/` + 0 FK entrante + **0 usage edge function Deno** (les edge sont hors `src/` et systématiquement oubliées — les greper avant chaque drop).
5. **Ordre du moins risqué au plus risqué** : versionner → droper morts → surcharges/fusions → bloquant AG. Jamais l'inverse.
6. **Empilements `CREATE OR REPLACE` NORMAUX** (≠ doublons) : `calculate_resolution_result` ×3, `seed_golden_loop` ×3, `create_test_copro` ×2, `activate_ag_decisions` ×3, `prepare_ag_decisions` ×2, `generate_calls_from_ag_payload` ×3 → garder le dernier, ne pas traiter.
7. **Après chaque modif** : `tsc --noEmit` + vitest (boucle d'or) verts AVANT de continuer. Une phase n'est finie que sur **preuve**, pas sur affirmation.
8. **Résolution d'overload** : fixer explicitement les appelants sur la bonne signature (args nommés) AVANT de droper l'ancienne.
9. **Regen `supabase.ts`** après tout drop de table/fonction.
10. **Commits séparés** par changement logique ; PRs petites et ciblées.

---

## Carte des clusters

### 🔴 Bloquants

**B1 — Finalisation AG bespoke vs moteur canonique** *(sql / systèmes parallèles)*
- **Garder** : chaîne canonique qui POSTE le GL : `prepare_ag_decisions → activate_ag_decisions → generate_calls_from_ag_payload → post_budget_call_for_funds` (migrations wp2/wp5_1/cr8). Consommée par 3 points : `ClosureRecap.tsx:134`, `usePVPage.ts:740`, `onboarding/api.ts`.
- **Doublon (vivant)** : couche bespoke pilotée par `lib/ag/api/finalisation.api.ts` + module `features/ag/finalisation/` : `create_budget_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag`, `get_ag_pending_actions`, `mark_ag_action_activated`, `generate_combined_calls_from_ag` + `appointSyndicFromAg` (100 % TS, INSERT directs `providers`/`contracts`). Écrivent `ag_pending_actions` mais **pas le GL**.
- **Action** : rediriger TOUT `features/ag/finalisation/` vers le canonique. Ne droper les RPC bespoke qu'en **toute dernière phase**, après preuve d'iso-comportement sur HARNESS.
- **Risque** : très élevé — couper sans rebrancher casse la finalisation d'AG en prod.

**B2 — Générateur d'appels AG sans écriture comptable** *(sql / fonction dupliquée)*
- **Garder** : `generate_calls_from_ag_payload → post_budget_call_for_funds` (cr8 : D450-1/C701, agrégé multi-clés, largest remainder).
- **Doublon** : `generate_combined_calls_from_ag` (front, `draft`, mono-clé, idempotence destructive, INSERT directs `call_for_funds` **sans** `create_ledger_transaction`). Absente des migrations.
- **Action** : rediriger `BlocAppelsFonds` vers le canonique ; auditer en data d'éventuels appels orphelins (HARNESS/dev only). Drop en dernière phase. *Sous-cas de B1, même bascule.*

### 🟠 Élevés

**E1 — Deux arbres de features front** *(front / systèmes parallèles)* — Garder `src/features/*` (moderne, 47 pages) ; legacy `src/components/features/*` encore importé par 68 pages. **Chantier au long cours, hors de ce nettoyage** : ici on fige juste la cible + on traite les sous-doublons concrets. ⚠️ Beaucoup d'homonymes (`PageHeader` ×5, `StatsGrid` ×3) sont des composants maison **légitimes par feature**, pas des doublons → tri cas par cas.

**E2 — Pages EN/FR copiées byte-à-byte** *(front / doublon EN/FR)* — Garder les routes FR de `navigation.ts` (`/contentieux/impayes`, `/contentieux/litiges`). Doublons **identiques (diff vide)** : `legal/disputes` == `contentieux/litiges` ; `ventes-impayes/impayes` == `contentieux/impayes`. **Contredit la mémoire projet** (« neutralisée par redirects » → en fait des copies). Action : supprimer les 2 pages orphelines après grep des `href`. + corriger la mémoire.

**E3 — Double saisie comptable d'une charge** *(sql / fonction dupliquée)* — `validate_budget_expense` ET `post_supplier_invoice` écrivent tous deux D6xx/C401. Si même `budget_line_id` → **charge comptabilisée 2×**. Action : **investiguer en data** avant de trancher quel flux garde la main (décision métier, voir Q3).

**E4 — Générateurs d'appels bas niveau : legacy mono-clé vs agrégé** *(sql / surcharge)* — Garder `post_budget_call_for_funds` (agrégé). `post_call_for_funds` (legacy mono-clé) encore appelé par l'**edge `generate_call_for_funds/index.ts:64`** ET `lib/finance/api.ts:342`. Rediriger + **redéployer l'edge**.

### 🟡 Moyens

**M1 — Tracking envoi AG** : garder `ag_envoi_tracking` (18 lignes, utilisé) ; `ag_notifications`(0)/`ag_notification_events`(0) — hook `useAgNotifications` existe mais monté par **aucune page**. `ag_notification_events` dropable de suite. ⚠️ greper edge `ag_send_*` avant. (Q5)

**M2 — Versioning documents bicéphale** : garder le versioning sur la table `documents` (`parent_document_id`) ; `document_versions`(0 ligne)+vue `v_document_versions` (lue par `getDocumentVersions`). Droper table+vue ET réécrire `getDocumentVersions` **ensemble**.

**M3 — Îlot campagnes mail orphelin** : garder `mails` (Resend) + `email_templates` (6 lignes, 6 FK) ; îlot fermé `mail_inbox/campaigns/recipients/folders/templates` + `lib/mail/api.ts`/`useMailData` monté **nulle part**. Feature abandonnée ? (Q4)

**M4 — Double calcul de majorité AG vs Conseil** : garder `calculate_resolution_result` + `compute_majority_threshold` (seuils art24/25/26) ; `compute_decision_result` (conseil) ré-implémente + **3e implémentation en JS** (`Session/utils.ts`). Fusionner si feature conseil active (Q6).

**M5 — Helpers sécurité conseil + `can_access_document` cassé** : garder `user_is_council_member` + `user_can_view_document` ; `is_council_member`/`is_council_president` (autre table) ; `can_access_document` **CASSÉ** (référence table inexistante `copro_members`) → droper.

**M6 — Feature Sales (EN) morte vs Ventes (FR)** : garder le FR ; îlot orphelin `app/sales/page.tsx` + `components/features/sales/*` + 3 hooks. ⚠️ vérifier que `VentesProvider` (monté dans le layout) ne sert pas **aussi** ventes-impayes avant drop (Q + risque).

**M7 — Surcharge `post_budget_call_for_funds` (8 vs 10 args)** : garder 10 args (cr8) ; 8 args (wp6) jamais droppée → risque de résolution ambiguë. Versionner puis droper après avoir fixé les appelants.

**M8 — Générateurs de copro de test** : `create_test_copro_seeded` (clone) vs `create_clean_test_copro_seeded` (clean-path). Probablement **les deux légitimes** (iso vs onboarding) → documenter le rôle, pas droper. Peu prioritaire.

**M9 — Surcharge `post_supplier_payment` (avec/sans `idempotency_key`)** : garder 8 args (cr5 idempotent) ; 7 args non idempotent = **double paiement fournisseur possible**. Versionner puis droper après vérif edge.

**M10 — Formateur euro recopié ~9-10×** : garder `lib/utils/format.ts` ; re-impls `formatCurrency`/`formatMontant`/`formatEuro`/`formatEuros` éparpillées. Refactor par petits commits + vérif équivalence (espace insécable, arrondi).

### 🟢 Faibles

**F1 — `generate_document_path` (3 vs 4 args)** : versionner puis droper la version 3 args après vérif usage GED.

**F2 — `lot_accounts`** (modèle compte-par-lot abandonné, 21 lignes vestiges, 0 FK, 0 usage `src/`) → droper après grep edge + regen.

**F3 — `shared/services/financeApi.ts`** auto-`@deprecated` (1 importeur résiduel) → rediriger + supprimer.

**F4 — `mail_labels_v2`** (0 ligne, 0 FK, refonte avortée) → droper.

**F5 — Code mort divers** : `ModuleSidebar.tsx` (importé seulement par le barrel), `RelanceModal` « libre » (0 importeur). **FAUX doublons à NE PAS fusionner** : les 2 `PaymentModal` (= 2 domaines, à **renommer** `SupplierInvoicePaymentModal`/`OwnerPaymentModal`), shims AG `useAgSessionPage`/`useConvocationData` (volontaires). `clear_ag_session_drafts` ×2 défs repo (live = 1, RETURNS jsonb).

---

## Plan de nettoyage phasé

### Phase 0 — Vérification live obligatoire *(lecture seule, AUCUNE écriture)*
Lever les incertitudes avant de toucher quoi que ce soit :
- (a) diff exact `pg_proc` live vs migrations → liste figée des ~33 fonctions en drift ; confirmer `clear_ag_session_drafts` = 1 def live.
- (b) **grep des edge functions Deno** (`supabase/functions/`) pour usage de `lot_accounts`, `ag_notifications`, `post_call_for_funds`, `post_supplier_payment`, `generate_call_for_funds`.
- (c) appels `.rpc` dynamiques / `functions.invoke` que le grep statique manque.
- (d) data : un même `budget_line_id` a-t-il reçu D6xx/C401 via `validate_budget_expense` ET `post_supplier_invoice` ?
- (e) `council_votes`/`council_decisions` ont-ils des lignes ?
- (f) `VentesProvider` sert-il aussi ventes-impayes ?
- (g) `useMailData`/`useAgNotifications` montés via un barrel ?
- **Acceptation** : rapport écrit (usage prouvé oui/non + preuve) par candidat. Tout ce qui reste « incertain » NE passe PAS en phase de drop.

### Phase 1 — Stopper le drift *(versionner, zéro changement de comportement)*
Écrire les `CREATE OR REPLACE` des ~33 fonctions live en drift, **à l'identique du live**, dans une migration datée. Supprimer du repo les 7 CREATE présents en migration mais absents du live.
- **Acceptation** : un replay des migrations reproduit le live (`pg_get_functiondef` avant/après identique). `tsc` OK.

### Phase 2 — Droper les morts CONFIRMÉS par la Phase 0
Un drop = un commit séparé.
- SQL : `can_access_document` (cassée), `generate_document_path` 3 args, `post_supplier_payment` 7 args, `post_budget_call_for_funds` 8 args (après conf appelants).
- Tables : `mail_labels_v2`, `ag_notification_events` (+ `ag_notifications` si abandon confirmé), `lot_accounts` (si edge OK), `document_versions`+vue (avec réécriture `getDocumentVersions`).
- Front : `shared/services/financeApi.ts`, `ModuleSidebar.tsx`, `RelanceModal` libre, îlot Sales (si `VentesProvider` OK), pages EN/FR copiées, îlot mail campagnes (si abandon). + **renommer** les 2 `PaymentModal`.
- **Acceptation** : après chaque drop, `tsc` + vitest (HARNESS) verts + regen `supabase.ts` + build Next OK. Corriger la mémoire `app_architecture.md` (dette EN/FR non neutralisée).

### Phase 3 — Surcharges & fusions à risque maîtrisé *(test d'iso-comportement sur HARNESS)*
- `post_call_for_funds → post_budget_call_for_funds` (+ redéploiement edge).
- `validate_budget_expense` vs `post_supplier_invoice` : trancher le flux (data Phase 0), neutraliser le double posting.
- `compute_decision_result → compute_majority_threshold` (si conseil actif).
- `is_council_member/president → user_is_council_member` (si pas de policy RLS dépendante).
- Formateurs euro → `lib/utils/format.ts` (1 domaine/commit).
- **Acceptation** : pour chaque redirection, exécuter le flux complet AVANT/APRÈS sur HARNESS et prouver **diff GL = 0 écart**. Edge redéployée testée en invoke réel.

### Phase 4 — LE bloquant : unifier la finalisation AG sur le canonique
Rebrancher tout `features/ag/finalisation/` sur `prepare/activate → generate_calls_from_ag_payload → post_budget_call_for_funds` (qui POSTE le GL). Remplacer les INSERT TS de `appointSyndicFromAg` par une RPC propre. En **dernier**, droper les RPC bespoke devenues mortes.
- **Acceptation** : sur HARNESS, finaliser une AG de bout en bout via le nouveau chemin et prouver (1) chaque décision génère des écritures GL, (2) `ag_pending_actions` alimentée comme avant (jamais reset), (3) diff GL boucle d'or inchangé. **Revue cross-model avant merge** (enjeu comptable). Drop des bespoke seulement après ces preuves.

---

## Phase 0 — résultats de vérification live (2026-06-04, lecture seule)

> Comptes **exacts** (`count(*)` — le `n_live_tup` des stats sous-comptait, à ne pas utiliser). Greps repo + edge functions Deno. Aucune copro immuable touchée.

**Corrections à la carte (plusieurs « morts » sont vivants) :**

| Cluster | Verdict Phase 0 | Conséquence |
|---|---|---|
| **M1** `ag_notifications` / `ag_notification_events` | 0 ligne **MAIS** l'edge `email_webhook/index.ts:132,150` les **lit + écrit** | ❌ **NON droppables.** Refactorer le webhook d'abord, ou garder. Le « câble derrière le meuble ». |
| **M6** Sales (EN) | `VentesProvider` est **monté dans `layout.tsx:32`** et **consommé par la feature FR vivante** `ventes-impayes` (`useVentesImpayesDashboard:45`) | Garder `VentesProvider` + `useSalesData`/`useSalesMutations`. Ne droper QUE `app/sales/page.tsx` + `components/features/sales/*` + `useSalesPage` (UI anglaise). |
| **M4 / M5** Conseil syndical | `council_votes`=2, `council_decisions`=2, `council_members`=4 → **feature active** | Fusion `compute_decision_result` délicate (données réelles). Pas un drop. |
| **M3** Îlot mail | `mails`=**0** ligne, mais `mail_inbox`=2, `mail_recipients`=9, `mail_folders`=5, `mail_templates`=3, `mail_campaigns`=2, `email_templates`=6 | Le « canonique » `mails` est **vide**, l'îlot porte les données → **décision produit** (Q4), pas un drop mécanique. `useMailData` seulement ré-exporté par le barrel, monté nulle part. |
| **M9** `post_supplier_payment` 7-arg | l'edge `pay_supplier_invoice:53-61` passe `p_idempotency_key` → utilise la **8-arg idempotente** | ✅ 7-arg legacy **droppable** sans risque. |
| **E4** `post_call_for_funds` | edge `generate_call_for_funds/index.ts:64` le consomme | ✅ Confirmé : rediriger + **redéployer l'edge**. |
| **E3** double-saisie charge | budget_expense (7) et supplier_invoice (11) postent classe 6, mais **montants/comptes distincts** (615/616, ~480 vs ~2490) | Pas de **double-comptage réel** en data → risque **architectural** (validate_budget_expense devrait être engagement, cf. mémoire), pas une corruption à nettoyer. |

**Vraiment droppables (0 ligne, 0 FK, 0 usage front/edge confirmés) :** `mail_labels_v2` (0). `document_versions`=0 (mais vue lue par `getDocumentVersions` → drop table+vue+réécriture ensemble). `lot_accounts`=**21 lignes** vestiges (0 FK, 0 usage front/edge) → drop après confirmation que ce sont bien des vestiges. `mails`=0.

**Drift CONFIRMÉ (absents des migrations)** : `generate_combined_calls_from_ag`, `create_budget_from_ag`, `elect_council_from_ag`, `get_ag_pending_actions`, `mark_ag_action_activated`, `submit_budget`, `validate_budget`, `can_access_document`, `fn_annexe_1`, `fn_annexe_5`. **Non-drift** : `create_ag_notification` (versionné `20260125_niveau5a`). *Liste exhaustive des ~33 = figée au début de la Phase 1.*

**Bon point** : aucun `.rpc(`/`functions.invoke(` **dynamique** (nom construit) → les greps statiques sont fiables, pas de consommateur caché par variable.

---

## Questions ouvertes (à trancher avec toi, expert copro)

1. **Finalisation AG** : valides-tu le principe de rebrancher TOUT `features/ag/finalisation/` sur le canonique et d'abandonner la couche bespoke ? (go/no-go Phase 4)
2. **Syndic** : `appointSyndicFromAg` fait des INSERT directs `providers`/`contracts` hors GL. Le passer via une RPC du flux contrats, ou ce « sans écriture comptable » est-il volontaire (nomination ≠ fait comptable) ?
3. **Double saisie de charge** : `post_supplier_invoice` est-elle bien la **seule** source de la charge classe 6, `validate_budget_expense` ne servant qu'à l'engagement extra-comptable ?
4. **Messagerie campagnes** : feature abandonnée (on drope) ou en pause (on garde) ?
5. **`ag_notifications`** : rebrancher `useAgNotifications` sur une page, ou droper `ag_notifications`+events et garder `ag_envoi_tracking` ?
6. **Conseil syndical** : feature `council_votes/decisions` active ? Mêmes majorités légales que l'AG (→ fusion) ou règles propres ?
7. **`suppliers` vs `providers`** : OK pour ajouter `providers.supplier_id` (FK nullable), `suppliers` source unique du contact/IBAN, sans rien droper, plus tard ?
8. **Migration des 2 arbres front** (`components/features → features`) : chantier séparé à planifier après, ou ignoré pour l'instant ?
9. **Correction mémoire** : je corrige `app_architecture.md` (dette EN/FR = copies, pas redirects) — OK ?
