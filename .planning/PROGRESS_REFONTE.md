# PROGRESS — Refonte CoProFlex (tracker maître)

> **Document de suivi unique de la refonte.** Point d'entrée des sessions.
> Dernière mise à jour : **2026-06-03** · Branche `v2` @ `14cb14d` (= `origin/main` = `origin/v2`).
> État **vérifié dans le code** (pas seulement les docs) le 2026-06-03 via un audit multi-agents.
> Détails par chantier : `PROGRESS_V1.md` (durcissement grand livre), `PROGRESS_WP5.md` (période/clôture),
> `PROGRESS_go-live.md` (mise en prod), `docs/superpowers/specs|plans/2026-06-03-reprise-*` (reprise).
> Snapshot courant : `SESSION.md`. Priorité actée : **« finance d'abord, app testable »**.

---

## 0. ⚠️ PIVOT 2026-06-04 — RE-BASELINE COMPLÈTE (lire en premier)

**Changement de stratégie.** L'approche incrémentale sur `v2` (décrite §1+ ci-dessous, toujours valide
comme **référence métier/historique**) est **suspendue** au profit d'une **reconstruction propre de la base**
(le dépôt de migrations n'était pas reproductible). Livrables de la session 2026-06-04 :
- **Blueprint base cible** → `.planning/db-cible/` (22 arbitrages tranchés + **multi-cabinet** + copro-template propre, 0 reprise du live). Mémoire `db-cible-blueprint`.
- **Atlas applicatif** → `.planning/atlas/` (front+edge+api ↔ base, `MATRICE-LIAISON`, **`REGISTRE-RISQUES` = 42 risques**). Mémoire `rebuild-atlas-roadmap`.
- **Roadmap phasé 0→4** → `docs/superpowers/plans/2026-06-04-rebaseline-roadmap.md` (42 risques rattachés) + plans Phase 0 détaillés.

**Exécution EN COURS** sur la branche **`phase0-db-rebaseline`** (≠ `v2`), cadence subagent-driven stricte, test en **Supabase local** (chaîne `0001→0016` rejouable à neuf, 36 tables) @ `c16c2f1` :
- ✅ Fait/relu/commité (2026-06-04) : **`0001`→`0016`** = extensions + enums (75) + work_domain + **socle 01** (cabinets→copros→buildings→lots→clés de répartition→copropriétaires/lot_owners→profils/memberships/invitations) + **finance 02 COMPLÈTE** (accounts, ledger GL partie double, paiements/banque/avances/emprunts, tiers + vue directory) + **domaine 03** (budgets/appels/relances/email_templates). Chaque migration = implémenteur sonnet → double relecture conformité+qualité → `db reset` + tests fonctionnels → commit.
- ▶️ Reprise : **domaine 04 AG + conseil** (fichier `0017`, ~13 tables, à synthétiser depuis blueprint 04) → 05 mutations → 06 GED → 07 maintenance → 08 communication → helpers/gardes → triggers/vues/RLS → restauration → types TS. **⚠️ Décalage numérotation : fichier = Task plan +1 dès Task 14** (`0013b` renuméroté `0014`, Supabase refuse le suffixe alpha ; cf. mémoire `phase0-sql-conventions`). Voir `SESSION.md`.

---

## 1. Vue d'ensemble

Phase : **construction de la boucle financière**. Le **bas de la boucle** (onboarding propre → appels →
encaissements → reprise de mandat → audit=0 → clôture/cut-off) est **codé ET prouvé** (vitest 75/0,
build vert, acceptation SQL = 0 écart, boucle d'or 22222222 intacte). Le **haut de la boucle**
(AG vote les comptes → report à-nouveau + affectation auto) est **codé en briques mais NON orchestré**.

- **Boucle finance : ~85 %** — bas ET haut de la boucle clos (Lot 1 fait, clôture AG bouclée) ; reste V2 (route appel unique), V3 (FIFO cloisonné).
- **Produit : ~60 % démo syndic mono-utilisateur · ~35 % SaaS multi-clients prod** (RLS off, pas
  d'isolation users, pas de paiement en ligne, pas de portail copropriétaire).

✅ **Trou critique RÉSOLU (2026-06-03, Lot 1)** : `open_next_period` est câblé dans l'approbation des
comptes AG (`activate_ag_decisions`) et `regularize_period` affecte réellement le 120→450-1 par quote-part.
Boucle fermée et **prouvée** (copro jetable : 2026 approved, 2027 ouvert, 120 soldé, excédent 12 030 € réparti
par tantièmes ; vitest 75/0). Migrations `20260604090000`→`093000`. Reste V2 (route appel unique) + V3 (FIFO).

---

## 2. FINANCE (le cœur)

### ✅ FAIT (prouvé)
- **Reprise de mandat / balance d'ouverture** — livrée de bout en bout (2026-06-03, 27 commits + 8 fixes
  code-review). `source_type='opening_onboarding'` (résiste à la clôture), moteur
  `set/get_opening_balance` (annule-et-repasse, résidu→471/472), verrou étape 8 (liste blanche + preuve
  positive), garde AG fail-closed, écran `RepriseSoldes` + wizard post-as-you-go + alerte.
- **Onboarding clean-path** — `provision_copro_chart` (82 comptes décret 2005-240) branché dans
  `createCopropriete` ; postage différé gaté `audit_finance_integrity=0` ; acceptation B2 = 0 écart.
- **Socle WP1→WP4** — 4 RPC atomiques (`post_call_for_funds/owner_payment/supplier_invoice/supplier_payment`)
  via `create_ledger_transaction` ; `finalize_and_activate_ag` ; budgets general/special/alur + versioning ;
  `fn_dashboard_kpis` / `fn_annexe_2`.
- **Appel de fonds agrégé** multi-clés (`post_budget_call_for_funds`, largest-remainder, Σ=budget).
- **WP5.1/5.2** — période multi-état (open/closed/approved) + à-nouveau ; cut-off 408/486 + extourne auto ;
  `reopen_period` durci ; verrou mort `ledger_locks` supprimé.
- **Immutabilité GL (G2)** — 4 triggers, assainissement par écriture inverse uniquement ; filets
  `v_finance_integrity_issues` + page Diagnostic.
- **ALUR art.14-2** — cotisation D450-5 / C105 (réserve), pas 701/702.

### 🔄 EN COURS
- **V1 « grand livre propre »** à mi-chemin (`PROGRESS_V1.md`) : filets + provision faits ; **reste**
  reclassement des soldes chapeau 450→450-1 (075c0249 ~299€, 2e341146 ~3560€), neutralisation seed
  niveau2d, et le durcissement (ci-dessous). Colonne `accounts.is_postable` ajoutée **sans enforcement**.

### ⬜ À FAIRE
- ✅ **V4.0 + V4 FAITS (2026-06-03, Lot 1)** — `open_next_period` câblé dans l'approbation AG ; à-nouveau
  ventilé 120 (courant) / 110 (travaux) ; `regularize_period` affecte le 120→450-1 par quote-part (datée AG).
  Prouvé E2E (copro jetable). Migrations `20260604090000`→`093000`. Plan : `docs/superpowers/plans/2026-06-03-lot1-boucle-finance.md`.
- **V2** — route d'appels **unique** : retirer `generate_combined_calls_from_ag` du front
  (`src/lib/ag/api/finalisation.api.ts:169`), router 100% vers `post_budget_call_for_funds`.
- ✅ **V3 (light) FAIT (2026-06-03, DB)** — le GL crédite déjà le bon 450-x (nature dérivée des lignes payées) ;
  ajouté un **filtre nature OPTIONNEL** sur `allocate_payment`/`post_owner_payment` (migration `20260604094000`,
  overloads consolidés). Reste : exposer `nature_filter` côté TS/edge/UI.
- **V2** *(reste à faire)* — router `BlocAppelsFonds` vers `activate_ag_decisions` (route canonique cr8 live OK)
  + migration de reset des **7 `ag_pending_actions` 'activated'** (sinon le swap génère 0 appel).
- **Durcissement DB V1 (ordre G5 imposé)** : 1.5 reclassement chapeau → **1.4 enforcement `is_postable`**
  (CONSTRAINT TRIGGER) → **4.2b trigger d'équilibre Σdébit=Σcrédit** ∥ **4.x CHECK source_id NOT VALID** ∥
  **P3-a drop surcharge 8-params** `post_budget_call_for_funds`.
- **P4** — mapping poste→compte **modulable** (`DEFAULT_POSTE_CHARGE_ACCOUNT` → table `copro_poste_account_map`
  + UI `/settings/comptabilite`).
- **§11 reprise (avant 1re vraie reprise client)** — traçabilité **471/472 ligne-par-ligne** (origine/date/
  montant/ancienneté, art.10) + **sortie par décision d'AG** ; import Excel balance (V2) ; acompte 409.
- **#10 code-review** (différé) — net 471/472 copro-wide vs par période (multi-période).

---

## 3. MODULES APP

### ✅ FAIT
- 133 pages / 140 routes, 3 route groups (dashboard / gestionnaire / marketing), **100 % Supabase**
  (le mock est un cimetière sans consommateur). 8 modules câblés ; **AG le plus complet** (vote temps réel,
  majorités 24/25/26, PV, finalisation, 25 edge functions). **Dette doublons EN/FR neutralisée** (redirects
  308 + nav FR → plus de 404 à l'usage). Site marketing 100 % réel (CGU/mentions).

### 🔄 EN COURS
- Cohérence financière affichée (dashboard/budget divergents tant que le GL n'est pas la source unique
  partout) ; routes orphelines à trancher (finance/transfer, releves-individuels, tantiemes…).

### ⬜ À FAIRE
- Suppression réelle des fichiers EN + ~57 dead links ; 6 stubs cabinet (PlaceholderPage) ;
  conformité 2026 (DPE/PPT/Factur-X) et contentieux/litiges = **100 % mock** → brancher ou sortir du scope ;
  **portail copropriétaire** (route group `(coproprietaire)`, plan `PLAN_MAITRE_VUE_COPROPRIETAIRE.md` :
  ~90% du data existe, reste UI + RLS + `coproprietaires.user_id` + invitation).

---

## 4. GO-LIVE (sécurité / prod)

### ✅ FAIT
- Auth de route (middleware → `getUser()` → redirect `/auth/login`). `createCoproprietaire` +
  `ensure_dev_membership` (migration). Push effectif (origin sync 14cb14d).

### 🔄 EN COURS
- Multi-utilisateurs : **`owner_id` hardcodé `f76855bb-…` dans 6 fichiers** (communication mur/mail/
  messagerie + 2 routes API) → boîtes/messages partagés. RLS : policies écrites, **non activées**.

### ⬜ À FAIRE / 🚫 BLOCANTS STRUCTURELS PROD
- **RLS désactivée (~71 tables) + anon key publiée** → base de prod ouverte. **Blocant sécurité n°1**
  (atténuation : policies déjà écrites = bascule + test).
- **`owner_id` → `auth.uid()`** (isolation users).
- **Paiement en ligne** (Stripe) absent · **portail copropriétaire** absent.
- Validation formulaires (ni Zod ni RHF) · **aucune CI** (`.github/workflows`) · headers sécu (CSP/HSTS) ·
  `vercel.json` · supprimer le piège `/finance/factures/new` (mock setTimeout qui ne persiste rien).

---

## 5. ROADMAP — lots ordonnés (prochaines sessions)

> Deux ancrages possibles pour démarrer : **(A)** finir proprement la reprise (preuve navigateur), **(B)**
> refermer la boucle finance (clôture AG = chemin critique). Recommandé : Lot 0 puis Lot 1.

- **Lot 0 — Clôturer la reprise** *(rapide, « app testable »)*
  1. **E2E navigateur** du wizard reprise + **fallback saisie manuelle d'adresse** (débloque sans clé Maps).
  2. **§11** : traçabilité 471/472 ligne-par-ligne + sortie par décision d'AG.
- **Lot 1 — Refermer la boucle finance** *(chemin critique fonctionnel)*
  3. **V4.0** câbler `open_next_period` dans l'approbation AG.
  4. **V4** à-nouveau (report solde 120) puis **affectation réelle** (remplacer le stub `regularize_period`).
  5. **V2** route d'appels unique → puis **V3** FIFO cloisonné par nature.
- **Lot 2 — Durcissement DB V1 (ordre G5)** : reclassement chapeau → `is_postable` (1.4) → trigger
  équilibre (4.2b) ∥ CHECK source_id (4.x) ∥ drop overload (P3-a). *(migrations → GO requis)*
- **Lot 3 — Features** : P4 (mapping poste→compte modulable) ; portail copropriétaire (+ réactivation RLS).
- **Lot 4 — Sécurité prod / go-live** : `owner_id`→`auth.uid()`, RLS on (~71 tables), validation (Zod/RHF),
  CI, headers, paiement en ligne.
- **Lot 5 — Différés métier (rangs 7-8)** : mutations de lot / état daté, conseil syndical (art.21-22),
  GED/extranet ALUR, communication, maintenance, RGPD, DTG/PPT.

---

## 6. Blocants / règles de garde
- **Toute migration sur `iyfesbjnkpynmwlsmxnp` exige un GO explicite utilisateur.**
- **Ordre G5 non négociable** : poser l'enforcement `is_postable` **après** reclassement/report (sinon le
  1er `open_next_period` recopie un solde sur un compte devenu non imputable → échec).
- **40 tx historiques sans `source_id`** (dont témoin 11111111 + boucle d'or 22222222) **non assainissables**
  (immutabilité) → CHECK source_id en **NOT VALID** seulement, jamais VALIDATE.
- E2E reprise bloqué sur `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` absente → fallback adresse manuelle.

---

## 7. Dette transverse (à ramasser au fil de l'eau)
- 95 `any` (22 fichiers), 131 `console.*` (45 fichiers), hooks monolithiques (`useAgData` 1091L,
  `useBudget` ~1000L, `useAppelsFonds` 700L+), modules encore `*_USE_SUPABASE=false` (BUDGET/VENTES/DASHBOARD),
  doublons constantes année + libs de dates, fichiers `.legacy`, tests DOM composants à reconstituer.

---

> **Honnêteté « prouvé vs déclaré »** : la boucle finance **de base** est prouvée (onboarding propre,
> appels, reprise équilibrée, audit=0, rollover/cut-off testés). Ce qui est **déclaré mais pas encore
> prouvé** : la reprise en **vrai navigateur** (Lot 0.1) et la **clôture bouclée par l'AG** (Lot 1, pas
> branchée). Mettre à jour ce fichier à chaque fin de session (cocher les lots, dater).
