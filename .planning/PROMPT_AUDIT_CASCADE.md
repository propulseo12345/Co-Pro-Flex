# Prompt de reprise — Audit anti-cascade + Harnais de cycle de vie

> Préparé le 2026-06-16 en fin de session « câblage V1/V2/V3 + onboarding ».
> Objectif : détecter les bugs **structurels** (cascade) dormants dans le schéma/migrations
> ET mettre en place un filet permanent. Effort conseillé : **ultracode** (fan-out).

## Contexte
- Cloud live Supabase `qqfqrcolzmcbsvfaumiq`, schéma à la migration **0084**.
- RLS **ON + FORCE** sur les tables sensibles. CLAUDE applique les migrations via MCP `apply_migration`.
- Bug déclencheur (déjà corrigé) : création de copro bloquée par RLS (amorçage poule & œuf),
  puis suppression de copro cassée (FK `accounts→copros` RESTRICT), le tout masqué par des
  erreurs avalées côté front. Corrigé via `create_copro` (0083) + `delete_onboarding_copro` (0084).

## Les 5 familles de « bugs cascade » à chasser
1. **Amorçage RLS** (poule & œuf) : `WITH CHECK` qui exige une ligne pas encore créée.
2. **FK RESTRICT** qui bloque une suppression.
3. **Triggers BEFORE DELETE/UPDATE** (immuabilité) qui bloquent une cascade.
4. **Erreurs avalées côté front** (`const { data } = await …` sans gérer `error`).
5. **Décalage colonnes/params front ↔ table/RPC** (insert/rpc qui plante en silence).

## Ce que j'ai DÉJÀ établi cette session (ne pas refaire, réutiliser)
- **FK référençant `copros`** : 14 tables en **RESTRICT** (accounting_periods, accounts, bank_matches,
  bank_movements, budget_expenses, collective_loans, ledger_entries, ledger_transactions,
  opening_balance_residual_items, payment_allocations, payments, period_cutoff_items,
  supplier_advances, treasury_advances) ; tout le reste en CASCADE.
- **Triggers BEFORE DELETE** existants : `ledger_entries.trg_ledger_entry_immutable`,
  `ledger_transactions.trg_ledger_tx_no_delete_posted` (bloquent suppr. d'écritures POSTÉES, sauf
  `is_ledger_regen_exempt`), `documents.trg_prevent_document_deletion` (bloque si `deletion_blocked`
  + rétention active), `etat_date_snapshots.tr_etat_date_immutable`.
- **Patron RLS** quasi universel : `p_mgr_all` = `user_is_copro_manager(copro_id)` (ALL) + souvent
  `p_sel_access` = `user_has_copro_access(copro_id)` (SELECT). Helpers DEFINER basés sur `memberships`.
- **Dump advisors sécurité** : `.claude/projects/.../tool-results/mcp-supabase-get_advisors-1781625674702.txt`
  (188k car. — à lire en sous-agent par tranches de 80k, NE PAS charger en contexte principal).

## Méthode (3 volets)

### Volet 1 — Audit statique du schéma (read-only, SQL introspection)
Produire un rapport `.planning/AUDIT_CASCADE_2026-06-NN.md` classé par criticité, couvrant :
- **Carte FK `ON DELETE` complète** (toutes les tables, pas seulement copros) → chaînes RESTRICT
  bloquantes + rayons de CASCADE dangereux (suppression parent qui nettoie de la donnée financière).
- **Couverture RLS** : tables `rowsecurity=true` **sans aucune policy** (deny-all silencieux) ;
  policies `WITH CHECK` à risque d'amorçage (réfèrent la table elle-même) ; commandes (INSERT/
  UPDATE/DELETE) sans policy pour le gestionnaire attendu.
- **Triggers BEFORE DELETE/UPDATE** (la liste ci-dessus + tout nouveau) → quels chemins ils bloquent.
- **Fonctions SECURITY DEFINER** : `SET search_path` manquant, `EXECUTE` accordé à `anon`/`public`.
- **Colonnes NOT NULL sans défaut** (risque d'insert silencieux) confrontées aux sites d'insert front.
- Exploiter aussi `mcp__supabase__get_advisors` (security + performance).

### Volet 2 — Scan « contrat front ↔ base » (fan-out sur le code)
Inventorier tous les `.insert()/.update()/.upsert()/.delete()/.rpc()` du front et flagger :
- **erreurs avalées** (pattern `const { data } = await …` sans `error`),
- **RPC fantômes** : `.rpc('nom')` dont la fonction n'existe pas en base (cf. dette connue `createCall`
  → `post_call_for_funds` inexistante),
- **mismatch colonnes** insert vs schéma réel.
Découper par domaine (finance, ag, ventes/ventes-impayes, onboarding, maintenance, documents/ged,
communication, settings, copro/lots/owners) — 1 agent par domaine.

### Volet 3 — Harnais de cycle de vie (dynamique, durable) → `db:test`
- Lire l'infra existante : `scripts/db-test.mjs`, les gates SQL, `create_test_copro(_seeded)`
  (harnais copro jetable déjà existant), `audit_finance_integrity`.
- Écrire un gate qui, sur une **copro jetable**, déroule le cycle complet et **asserte chaque étape** :
  create_copro → ajouts (copropriétaires/lots/clés/comptes/budget) → appels → reprise soldes →
  (option mutation/état daté) → **delete_onboarding_copro**. Doit prouver « aucune cascade ne casse ».
- Vérifier comment `db:test` se connecte (DB locale docker `supabase_db_Co-Pro-Flex` vs cloud via
  rollback). Si la DB locale est en retard, soit la rejouer, soit tester en transaction ROLLBACK
  sur le cloud (cf. mémoire `cloud_migration_test_rollback`).

## Livrables attendus
1. `.planning/AUDIT_CASCADE_2026-06-NN.md` — risques dormants classés (RESTRICT/RLS/triggers/front).
2. Correctifs des vrais blocages trouvés (par branche + PR, gardes 4-points anti-cascade).
3. Nouveau gate `db:test` « lifecycle » + harnais réutilisable.

## Garde-fous
- Tout par **branche + PR** ; migrations appliquées au cloud par CLAUDE après OK USER.
- Confirmer avant toute écriture sur le live ; jamais d'action sortante sans validation.
- Réutiliser les acquis ci-dessus (FK/triggers/RLS déjà cartographiés) pour ne pas re-brûler des tours.
