# Registre des bugs — Campagne de test CoProFlex

> Gabarit : `.planning/tests/PLAN_TEST_MASTER.md` §8.

---

### BUG-001 : Onboarding bloqué à l'étape « Budget » (drift `ledger_transactions.created_at`) — ✅ CORRIGÉ

- **Domaine / cas :** Onboarding (TC_01) — étape 5 Budget → étape 6.
- **Sévérité :** **Bloquant** (aucun nouveau syndic ne peut finir l'onboarding).
- **Priorité :** P0.
- **Environnement :** app locale `:3100` sur cloud `qqfqrcolzmcbsvfaumiq`, compte démo, copros `E2E-CYCLE-*`, Chromium (Playwright 1.61).
- **Étapes de repro :**
  1. Onboarding A→Z d'une copro neuve ; atteindre l'étape 5 (Budget).
  2. Ajouter un poste, montant, clé ; cliquer « Continuer ».
- **Résultat ATTENDU :** la période comptable est créée, le budget enregistré, passage à l'étape 6 (config appels).
- **Résultat OBTENU :** bouton « Continuer » désactivé (`disabled = isSaving || !periodId`) ; `periodId` jamais résolu.
- **Cause racine :** `readOnboardingPeriod` (`src/lib/onboarding/api.ts`) faisait `.order('created_at')` sur `ledger_transactions` — **colonne inexistante** (la table a `tx_date`/`posted_at`/`created_by`). PostgREST renvoyait **400**, l'erreur était **avalée** (refus silencieux), `getOrCreateOnboardingPeriod` retournait null avant l'INSERT.
- **Effet base :** 0 `accounting_periods` créée pour les copros arrivées à l'étape 5.
- **Correctif :** `order('created_at')` → `order('posted_at')` (commit code). Prouvé par le test héros E2E (vert) + audit RLS/INSERT (l'INSERT period passe bien en authenticated).
- **Reproductible :** Toujours (avant fix).

#### Suivi / à auditer
- **`payments` n'a pas non plus `created_at`** : auditer tous les `order('created_at')` / `select('created_at')` sur `ledger_transactions` et `payments` dans le code (1 seul `order` trouvé sur ces 2 tables, déjà corrigé — mais vérifier les `select`).
- **Anti-pattern systémique : erreurs Supabase avalées** (`if (res.data)` sans gérer `res.error`). À chasser (règle « jamais de refus silencieux »).

---

### BUG-002 : Le portefeuille affiche les copros EN onboarding + clic vers dashboard (au lieu de la reprise du wizard) — ✅ CORRIGÉ + PROUVÉ

- **Domaine / cas :** Portefeuille (TC_11) + Onboarding.
- **Sévérité :** **Majeur** (un syndic voit des copros « en configuration » dans son espace live ; cliquer dessus ouvre un dashboard sans période comptable → état cassé/vide).
- **Priorité :** P1. Confirmé par l'utilisateur 2026-06-22 ; déjà repéré (PILOTE_FINDINGS P1 #1).
- **Résultat ATTENDU :** le portefeuille ne liste QUE les copros finalisées (`onboarding_step IS NULL`) ; une copro en onboarding mène à la reprise `/onboarding/{id}`.
- **Résultat OBTENU :** le portefeuille affiche les 10 copros (9 en onboarding) ; le clic route toujours vers `/dashboard`.
- **Diagnostic (sous-agent Explore) :**
  - `src/hooks/modules/usePortefeuille.ts` (~l.86) : `from('copros').select(...)` **sans** `.is('onboarding_step', null)`. Le badge « N UNITÉS » compte aussi l'onboarding.
  - `src/app/(gestionnaire)/portefeuille/page.tsx` (~l.40) `handleSelectCopro` : `setActiveCopro` + `router.push('/dashboard')` **sans** vérifier `onboarding_step`.
  - Convention fiable : `completeOnboarding` (étape 8) met `onboarding_step = NULL`. Vérifié en base : seule la copro finalisée est NULL.
  - **Cascade** : `src/lib/copro/activeCopro.ts` `getActiveCopro()` (~l.76) sélectionne la 1ʳᵉ copro **sans** filtre → peut activer une copro en onboarding par défaut ; pas de garde côté dashboard.
- **Décision produit (tranchée) :** masquer totalement les copros en onboarding du portefeuille (demande utilisateur : ne montrer que les finies).
- **Correctif appliqué (commit `3858e34`) :**
  1. `usePortefeuille.ts` : `.is('onboarding_step', null)` → la liste ne montre que les copros finalisées.
  2. `getActiveCopro()` (`activeCopro.ts`) : même filtre → défaut sain, ne jamais activer une copro en onboarding.
  3. `CoproContext.tsx` : expose `onboarding_step` (interface `Copro` + select) pour que la garde dispose de l'état RÉEL (DB), pas du cache sessionStorage.
  4. `OnboardingRedirect.tsx` : si la copro active a `onboarding_step` non NULL → `router.push('/onboarding/{id}')` (filet contre un cache pollué par un onboarding à moitié fait).
  - Point 4 « handleSelectCopro » du plan initial abandonné : devenu inutile une fois la liste filtrée (la carte ne reçoit que des copros finies).
- **Revue de cascade :** le flux d'onboarding ne dépend pas de `getActiveCopro` (le wizard prend l'id dans l'URL) → filtrer ne le casse pas. `tsc --noEmit` vert.
- **PROUVÉ (MCP Playwright, navigateur réel, 2026-06-22) :**
  - Portefeuille : 4 copros finalisées affichées / 14 en onboarding masquées (confirmé en base : `count(*) FILTER (onboarding_step IS NULL)=4`, `NOT NULL=14`, total 18).
  - Garde : copro en onboarding rendue active (clic « Reprendre ») puis accès direct `/dashboard` → redirigé vers `/onboarding/{id}`.
  - Pas de faux positif : copro finalisée sélectionnée → reste sur `/dashboard`, contenu plein (budget 50 000 €). 0 erreur console sur tous les écrans.

---

## Retours de code review (PR #35, revue high-effort 32 agents) — différés

Aucun bug CONFIRMED (le fix BUG-001 est correct). Retours PLAUSIBLE traités à part :

- ✅ **Corrigé immédiatement** : `api.ts` `order('posted_at', nullsFirst:false)` (aligné sur `get_opening_balance` 0027) + wording « drift » corrigé ; docstring accent `lots-repartition`.
- 🟡 **DETTE-1 — `onboarding-clean-path.spec.ts` doublon** : ré-implémente le wizard (avec les sélecteurs bugués stepBlock/`getByPlaceholder('0.00')`/pas de clé explicite → probablement cassé) et fait DOUBLON avec `onboardCopro` + redondant avec le héros Acte 1. → **migrer vers `onboardCopro`** (ne garder que ses assertions DB) **ou supprimer**. Règle CLAUDE.md « ne pas laisser deux patterns coexister ». `stepBlock` (helpers.ts) à retirer une fois clean-path migré.
- ⚪ **DETTE-2 — altitude sélecteurs (app)** : les champs montant/clé de `Step5Budget.tsx` n'ont aucun nom accessible → le helper cible par position (`spinbutton.first`, `combobox.first`). Ajouter des `aria-label` (gain a11y + sélecteurs stables) ; ancrer les tantièmes par lot (pas `nth(0/1)`). À faire quand on étend les Actes 2-6.
- ⚪ **DETTE-3 — `readOnboardingPeriod` multi-exercices** : sélectionne la période sur tout le `copro_id` triée par `posted_at` sans `period_id` ; pour le pluriannuel (Actes 5-6) préférer `status='open'` / `tx_date`. À revoir AVANT l'Acte 5.
- ⚪ **DETTE-4 — `workers:1`** sérialise toute la suite (volontaire base partagée) ; plus tard, projet Playwright séparé write/read pour paralléliser les read-only.

---

### BUG-003 : `/ag/new` crée DEUX brouillons d'AG en double — 🔴 À CORRIGER

- **Domaine / cas :** Assemblées générales (TC_04) — planification d'une AG.
- **Sévérité :** **Majeur** (chaque création d'AG laisse un brouillon orphelin sur le live ; pollution de données + liste de brouillons faussée).
- **Priorité :** P1.
- **Repro :** ouvrir `/ag/new` (espace gestionnaire) → 2 lignes `ag_meetings` status `draft` créées à ~20 ms d'intervalle.
- **Preuve (golden, 2026-06-22) :** `b1644229…` (adresse vide, step 1) + `d2b4e0cd…` (adresse remplie, step 2), tous deux `created_at = 17:48:02.90/.92`, même copro.
- **Cause probable :** `useEffect` de création de brouillon joué 2× par React StrictMode (même pattern que `ensureAccountingPeriod` / BUG-001). À rendre idempotent (créer le brouillon à l'action explicite, ou garde anti-double-effet).
- **Vérif de sortie :** une seule ligne `ag_meetings` après une visite `/ag/new`.

---

### BUG-004 : le wizard AG affiche « Exercice comptable non configuré pour 2026 » alors qu'il existe — 🔴 À CORRIGER

- **Domaine / cas :** AG (TC_04), étape Ordre du jour.
- **Sévérité :** **Majeur** (les dates d'exercice ne sont pas pré-remplies ; risque de fausser le pré-remplissage des dates d'appels générés par l'AG).
- **Priorité :** P1.
- **Résultat OBTENU :** bandeau « Exercice comptable non configuré pour l'année 2026 ».
- **Résultat ATTENDU :** l'exercice 2026 (ouvert) est détecté.
- **Preuve base :** `accounting_periods` golden = `Exercice 2026` / `open` / 2026-01-01→2026-12-31, **couvre le 22/07/2026** (date de l'AG). La détection du wizard ne le trouve pas → requête de détection à auditer (filtre année/copro/dates ou source erronée).

---

### BUG-005 : 406 sur `ag_resolutions` (recherche « approbation du budget prévisionnel ») — 🟡 À CORRIGER (mineur)

- **Domaine / cas :** AG — chargement `/ag/new`.
- **Sévérité :** Mineur (erreur avalée, sans blocage visible).
- **Preuve :** `GET …/ag_resolutions?select=id,variables&ag_id=eq.<id>&title=ilike.%approbation du budget prévisionnel%&limit=1` → **406**.
- **Cause probable :** appel `.single()` (header `Accept: …pgrst.object+json`) sur 0 ligne → 406 ; devrait être `.maybeSingle()` + gestion d'erreur (règle « jamais de refus silencieux »).
