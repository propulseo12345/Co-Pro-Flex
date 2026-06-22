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
