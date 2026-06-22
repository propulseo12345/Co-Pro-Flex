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

### BUG-002 : Le portefeuille affiche les copros EN onboarding + clic vers dashboard (au lieu de la reprise du wizard) — 🔴 À CORRIGER

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
- **Correctif proposé (front, ciblé) :**
  1. `usePortefeuille.ts` : fetch `onboarding_step` + filtre `.is('onboarding_step', null)`.
  2. `getActiveCopro()` : même filtre (sécurité défaut).
  3. **Garde espace gestionnaire/dashboard** : si la copro active a `onboarding_step` non NULL → `redirect('/onboarding/{id}')` (filet pour liens directs / sessionStorage).
  4. (option) `handleSelectCopro` : router vers `/onboarding/{id}` si non NULL (défense en profondeur).
- **À trancher (produit) :** masquer totalement les copros en onboarding du portefeuille (reco) **vs** les afficher marquées « en configuration ». L'utilisateur a demandé : **ne montrer que les finies**.
- **Vérif de sortie :** test E2E — portefeuille ne liste que les copros finalisées ; clic copro onboarding → `/onboarding/{id}` ; copro onboarding active → redirigée hors dashboard.
