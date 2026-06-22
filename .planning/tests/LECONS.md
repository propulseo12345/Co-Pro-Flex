# Journal de leçons — Campagne de test Playwright CoProFlex

> Tenu **au fil de l'eau** pendant la campagne. Objectif double : (1) éviter de
> reproduire nos erreurs ; (2) extraire un **format réutilisable** pour la vibe-library
> (harnais E2E à double preuve écran + base, transposable à d'autres projets).
>
> Chaque leçon : **Symptôme** (ce qu'on a vu) → **Cause** (le mécanisme) →
> **Règle générale** (réutilisable, métier-agnostique) → **Tag stack** (divergence éventuelle).
>
> ⚠️ Stack CoProFlex = **npm / ESLint / CSS Modules / Next.js** ≠ stack vibe-library
> (pnpm / Biome / Tailwind). Ne généraliser que les principes, jamais le tooling.

---

## L01 — Les navigateurs Playwright sont mariés à une version précise

- **Symptôme** : `browserType.launch: Executable doesn't exist at …chromium_headless_shell-1208…`. Puis, après avoir aligné la version, la cible se déplace en `-1228`.
- **Cause** : chaque version de `@playwright/test` exige un **build de navigateur exact** (1.58→1208, 1.61→1228). Le cache `ms-playwright` est **partagé entre tous les projets** de la machine, mais chaque version y range *son* dossier. Un autre projet en 1.61 peut donc « marcher » avec le build 1223 sans que ce build serve à un projet en 1.58. `npm install` pose la **librairie**, jamais le navigateur (`npx playwright install` est un pas séparé).
- **Règle générale** : pour démarrer une suite Playwright, faire **deux** installations distinctes (lib + navigateur), et si plusieurs projets partagent la machine, **épingler la même version** partout ou accepter un navigateur par version. Sur Windows, **ne pas lancer `playwright install` en arrière-plan** : il renvoie `exit 0` sans toujours finir l'extraction (dossier créé, `.exe` absent) → préférer le foreground et vérifier la présence du binaire.
- **Tag stack** : neutre (vaut pour tout projet Playwright).

## L02 — Un test ne doit jamais présumer la donnée

- **Symptôme** : le pilote `lots-repartition` cherchait la colonne « **Bâtiment** A » (accent) alors que l'app affiche « **Batiment** A » (sans accent) — le nom réel de la clé en base.
- **Cause** : l'auteur du test a deviné le libellé au lieu de le relever sur l'app réelle. La donnée venait d'une saisie/seed sans accent.
- **Règle générale** : avant d'écrire une assertion sur un libellé, **explorer l'app live** (ici via le MCP Playwright) pour relever le **texte/sélecteur exact**. La source de vérité de l'assertion, c'est l'app rendue + la base — pas l'intuition orthographique.
- **Tag stack** : neutre.

## L03 — Anti-pattern : tests séquentiels qui se passent un état

- **Symptôme** : `ag-workflow.spec.ts` découpe un parcours en 8 tests (« STEP 1 »…« STEP 7 ») partageant des variables, alors que la config est `fullyParallel: true`.
- **Cause** : rien ne garantit l'ordre d'exécution sous parallélisme → fragile, casse dès que ça parallélise vraiment.
- **Règle générale** : un **parcours = UN test autonome** avec des jalons internes (`test.step()`). Les tests séparés doivent être **indépendants** (chacun monte son propre état). Sur une **base partagée**, forcer `workers: 1` pour éviter les collisions inter-specs.
- **Tag stack** : neutre.

## L04 — Sur données immuables, le teardown par DELETE est impossible

- **Symptôme** : `copros.delete()` en `afterAll` échoue dès qu'une copro a un grand livre **posté** ; les copros de test s'accumulent silencieusement en base.
- **Cause** : protections volontaires de la compta — trigger d'immutabilité `BEFORE DELETE` sur `ledger_transactions` (0024), 14 FK en `ON DELETE RESTRICT`, et la RPC `delete_onboarding_copro` (0084) qui **refuse** une copro postée/finalisée.
- **Règle générale** : sur toute app à **données immuables** (comptabilité, audit, journal d'événements), prévoir **dès la conception** un mécanisme de **purge privilégié** (service-role / DEFINER) **garde-foué par un préfixe de test** (ex. `E2E-`) — jamais une suppression naïve. Et **ne pas auto-détruire** : laisser l'artefact **inspectable**, purge **explicite à la demande**.
- **Tag stack** : neutre (le principe) ; l'implémentation s'appuie sur Supabase/Postgres (triggers, FK, RPC SECURITY DEFINER).

## L05 — Garde-fou denylist sur les données de référence

- **Symptôme** : risque qu'un test en écriture cible par erreur une copro de référence (Résidence Martin, Paris Ivry, boucle d'or `22222222`) et corrompe une base immuable.
- **Cause** : rien n'empêche techniquement une mutation de viser un id de référence ; la convention seule ne suffit pas.
- **Règle générale** : maintenir dans le harnais une **liste rouge d'ids de référence** et **envelopper le client base de test** pour qu'il **refuse toute mutation** (`insert`/`update`/`delete`) ciblant ces ids — exception bruyante immédiate. La **lecture** reste autorisée.
- **Tag stack** : neutre (le principe) ; ici client `@supabase/supabase-js` service-role.

## L06 — `session_replication_role` : indisponible en RPC, et sensible à la forme

- **Symptôme** : la purge des copros de test nécessite de désactiver immutabilité GL **et** contraintes FK. `session_replication_role = replica` fait les deux. Mais : (1) dans une fonction `SECURITY DEFINER`, `permission denied to set parameter "session_replication_role"` ; (2) même hors fonction, `perform set_config('session_replication_role','replica',true)` est refusé, alors que la forme littérale `set local session_replication_role = replica` passe.
- **Cause** : c'est un paramètre super-privilège. (1) Dans une fonction DEFINER, le rôle effectif devient le **propriétaire** (non super-privilégié) → refus. (2) La forme `set_config()` et la forme `SET LOCAL` ne sont pas traitées identiquement côté privilèges sur cette connexion managée.
- **Règle générale** : pour une app immuable hébergée (Supabase & co), une purge de test qui doit lever les FK **ne peut pas vivre dans une RPC** ni passer par PostgREST/clé service_role — elle doit s'exécuter via une **connexion admin** (MCP / `psql` direct), sous forme de **script** (DO block), avec `set local session_replication_role = replica` (forme **littérale**), pas `set_config`. Pattern : `replica` → purge des tables RESTRICT (order-free) → `origin` → `delete` racine (cascade).
- **Tag stack** : spécifique Postgres/Supabase managé (privilèges des GUC super-user). Le principe « purge admin hors RPC » est généralisable.

## L07 — Sélecteurs a11y (getByRole) vs DOM caché (getByPlaceholder / locator CSS)

- **Symptôme** : sur un wizard multi-étapes, `getByPlaceholder('0.00')` et `locator('input[type="number"]')` matchaient des champs d'**autres étapes** (montant étape 4, tantièmes étape 3), provoquant « element is not visible » et des timeouts.
- **Cause** : le wizard garde les étapes inactives dans le DOM en `display:none`. `getByPlaceholder` / `locator(css)` cherchent dans le **DOM entier** (caché inclus) ; `getByRole` n'interroge que l'**arbre d'accessibilité** (les `display:none` en sont exclus).
- **Règle générale** : dans un wizard/onglets qui masquent par `display:none`, **toujours cibler par `getByRole`** (textbox/spinbutton/button + nom accessible) — ça scope automatiquement à l'étape visible. Réserver `getByPlaceholder`/CSS aux pages mono-écran. Helper `stepBlock` (filtre `div` + `.last()`) à éviter : il sélectionne le mauvais conteneur.
- **Tag stack** : neutre (tout front à étapes masquées).

## L08 — Bug de DRIFT trouvé par l'E2E : `ledger_transactions.created_at` inexistant

- **Symptôme** : impossible de dépasser l'étape « Budget » de l'onboarding (bouton Continuer désactivé). En réalité un `GET ledger_transactions?...order=created_at` renvoyait **400**.
- **Cause** : `readOnboardingPeriod` (`src/lib/onboarding/api.ts`) ordonnait sur `created_at`, **colonne absente** de `ledger_transactions` (a `tx_date` + `posted_at`, et `created_by`). Le 400 faisait échouer la résolution de période → `periodId` null → étape bloquée. **Bug bloquant réel** : tout nouveau syndic était coincé. Erreur **avalée** côté front (refus silencieux).
- **Règle générale** : (1) l'E2E à double preuve trouve les drifts schéma↔code que le type-check ne voit pas (clients « untyped ») ; (2) ne jamais avaler `error` d'une requête Supabase — surface-la ; (3) après correction, auditer le pattern ailleurs (`payments` n'a pas non plus `created_at`). Fix : `order('posted_at')`.
- **Tag stack** : spécifique Supabase/PostgREST (400 sur colonne inconnue) ; le principe « E2E révèle le drift » est neutre.

---

*(Ajouter une entrée à chaque nouvelle erreur/piège rencontré pendant la campagne.)*
