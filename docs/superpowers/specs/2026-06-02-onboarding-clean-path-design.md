# Design — Réparer le parcours d'onboarding pour un grand livre propre, prouvé par une copro de test propre

> Date : 2026-06-02 · Statut : design validé + challengé par revue croisée (autre Claude) et contre-vérifié dans le code. Prêt pour le plan d'implémentation.
> Mémoire liée : [[v1_audit_reconciled]], [[ledger_account_model]], [[appel_fonds_agrege_model]], [[lot_centric_rule]], [[golden_loop_copro]], [[test_harness_throwaway_copro]], [[ag_auto_population]].
> Cartographie source : workflow `onboarding-clean-path-recon` (8 agents, signatures vérifiées en double lecture).

## 1. Objectif

Faire en sorte que le **vrai parcours d'onboarding** produise une copropriété **comptablement saine** (grand livre conforme), en remplaçant les `INSERT` bruts et créations de comptes « à la volée » par les **routines canoniques** déjà en base. Prouver le résultat par une **copro de test née du vrai chemin**, dont l'audit d'intégrité renvoie **0 écart**.

Cadre la décision utilisateur : on **répare le parcours, puis on prouve** (pas un fixture SQL parallèle). C'est l'exécution de **1.5-C2 + 1.5-D** du plan V1, avec la copro propre comme **test d'acceptation**.

## 2. Constat clé : aujourd'hui le « vrai parcours » est le parcours *sale*

Le code TS d'onboarding ([src/lib/onboarding/api.ts](../../../src/lib/onboarding/api.ts)) n'utilise aucune routine canonique : il crée des comptes nus, poste sur le **chapeau 450** (sans `lot_id`), sans `source_id`, et bypasse les RPC. Construire une copro « via le vrai parcours » tel quel donnerait une copro **sale** → contradiction. Il faut donc **réparer d'abord**.

### Deux générateurs d'appels coexistent
- **Onboarding Step 6** (`generateCallsFromBudget`) : manuel, **sale**. Bootstrap initial.
- **Activation d'AG** (`finalize_and_activate_ag` → `post_budget_call_for_funds`) : **canonique**. Flux métier normal (budget voté en AG → appels auto, cf. [[ag_auto_population]]).

`seed_golden_loop` passe déjà par le chemin canonique (AG + `post_owner_payment` + `post_supplier_invoice`). Il est donc **réutilisable tel quel** pour le test SQL.

## 3. Briques canoniques (signatures vérifiées, certifiées)

| RPC | Rôle | Définition |
|---|---|---|
| `provision_copro_chart(p_copro_id uuid) → integer` | 82 comptes (décret 2005-240) ; chapeau 450 `is_postable=false` + 450-1..5 ; idempotent | [20260602170000:23](../../../supabase/migrations/20260602170000_v1_5a_provision_copro_chart.sql) |
| `post_budget_call_for_funds(copro, period, budget, label, trimester, issue, due, fraction=1.0, inst_index=NULL, inst_count=NULL) → jsonb` | Crée `call_for_funds` (`issued`) + lignes par lot×clé + ledger : **D 450-x/lot (avec lot_id), C 701/702/105**. Résout le débit via `resolve_lot_tiers_account`, vérifie complétude des clés, arrondi cumulatif. | [20260531272000:22](../../../supabase/migrations/20260531272000_cr8_appel_largest_remainder.sql) |
| `resolve_lot_tiers_account(copro, nature) → uuid` | 450-x par nature (current→450-1, works→450-2, alur→450-5…). **RAISE si non provisionné.** | [20260531011114:6](../../../supabase/migrations/20260531011114_wp1_resolve_lot_tiers_account.sql) |
| `create_ledger_transaction(copro, period, date, label, source_type, source_id, entries jsonb, auto_post) → jsonb` | Route atomique partie-double. **`entries` accepte `lot_id` par ligne** ; garde-fou d'équilibre si `auto_post`. | [20260531261000:20](../../../supabase/migrations/20260531261000_cr3_ledger_tx_balance_guard.sql) |
| `audit_finance_integrity(p_copro_id uuid) → SETOF` (vue `v_finance_integrity_issues`) | **Le juge.** 8 codes. 0 ligne = copro propre. | [20260602160000:12](../../../supabase/migrations/20260602160000_v1_0_finance_integrity_source_id_chapeau450.sql) |

Pas de RPC dédiée aux soldes d'ouverture par lot → voie propre = `create_ledger_transaction(source_type='opening_balance', source_id=period_id, entries=[…lot_id…], auto_post=true)`.

**Codes d'intégrité** (critère 0 écart) : `TOTAL_MISMATCH`, `OVER_ALLOCATED`, `UNDER_ALLOCATED`, `OVER_PAID`, `CALL_VS_BUDGET_MISMATCH`, `LOT_GL_MISMATCH`, `SOURCE_ID_MISSING`, `CHAPEAU_450_POSTED`.

## 4. Les foyers de saleté à réparer

| # | Emplacement | Problème | Fix canonique |
|---|---|---|---|
| 1 | [api.ts:409-428](../../../src/lib/onboarding/api.ts) (450/701), [api.ts:301-326](../../../src/lib/onboarding/api.ts) (600), [api.ts:598-618](../../../src/lib/onboarding/api.ts) (450/120) | Comptes créés à la volée | `provision_copro_chart` à la naissance ; résoudre les comptes par code dans le plan |
| 2 | [api.ts:464-482](../../../src/lib/onboarding/api.ts) **+ doublon** [Step6AgAppels.tsx:189-207](../../../src/components/features/onboarding/steps/Step6AgAppels.tsx) | Appels postés sur chapeau 450, sans lot_id, sans source_id | `post_budget_call_for_funds` (boucle d'échéances) ; le composant n'appelle plus que l'api |
| 3 | [api.ts:626-669](../../../src/lib/onboarding/api.ts) | Reprise non-atomique, sans source_id | `create_ledger_transaction(opening_balance, auto_post=true)` |

**Règle anti-régression (CLAUDE.md) :** ne pas laisser deux patterns coexister → le doublon du composant (foyer 2) **doit** être supprimé.

## 5. Contraintes dures

- **Provisionner tôt** : `provision_copro_chart` juste après la création copro (Step 1), sinon `resolve_lot_tiers_account` plante.
- **Valider avant gel** : l'audit « 0 écart » doit passer **avant** approbation de la période (immutabilité du grand livre).
- **`lot_id` obligatoire sur 450-x** (trigger `enforce_lot_id_on_45x`) — assuré par les RPC.
- **Pas d'import CSV** : structure créée item par item → le test SQL la fabrique en synthétique ; le smoke Playwright la saisit via l'UI.
- **Dépendance auth** : `createCopropriete` lit `auth.getUser()` pour le membership admin → le smoke Playwright doit tourner connecté.

## 6. Design — 3 tracks, livrés ensemble (les 3 phases d'un coup)

### Track A — Réparer le code TS d'onboarding (le vrai chemin utilisateur)
- **A0 — Naissance propre** : `createCopropriete` appelle `provision_copro_chart`. Suppression de tous les blocs « ensure compte » nus. `createOnboardingBudget` résout le compte de charge depuis le plan (par code/catégorie), plus de `600` ad hoc.
  - *Critère* : copro neuve = 82 comptes, 450-1..5 présents, chapeau `is_postable=false`.
- **A1 — Appels canoniques** : `generateCallsFromBudget` boucle **uniquement les échéances restantes** (de `alreadyDone+1` à `n`, cf. décision Q2) et appelle `post_budget_call_for_funds(... inst_index=t, inst_count=n)`. `Step6AgAppels.tsx` ne fait plus qu'appeler l'api (doublon supprimé). **Idempotence DB réelle** (pas un guard frontend) : un re-déclenchement ne reposte pas. Erreur « clé incomplète » remontée par la RPC = **bloquante et explicite** (jamais skip silencieux).
  - *Critère* : appels sur 450-x avec lot_id + source_id ; `CHAPEAU_450_POSTED`=0, `CALL_VS_BUDGET_MISMATCH`=0 ; double-déclenchement = 0 doublon.
- **A2 — Reprise canonique** : `saveRepriseSoldes` construit **une seule** transaction `create_ledger_transaction(source_type='opening_balance', auto_post=true)`, entries **ventilées par nature et par lot** (D 450-x/lot via `resolve_lot_tiers_account(nature)`, ALUR 450-5 isolé), **contrepartie = compte d'attente 471/472** (pas 120 — cf. décision reprise « B → A »). Solde créditeur (avoir) géré par inversion de direction (aucune contrainte de signe ne le bloque). Le compte d'attente **doit être soldé à 0 avant l'approbation de la période**.
  - *Critère* : transaction unique équilibrée, source_id présent, pas de chapeau, 471/472 = 0 avant gel.

### Track B — Fixture propre + test d'acceptation SQL
- Nouvelle fonction `create_clean_test_copro(p_tag)` : INSERT copro fraîche → `provision_copro_chart` → **structure synthétique** (4 lots 250+250+250+250 tantièmes, 3 copropriétaires dont un multi-lots, 3 clés : générale sur tous + eau + ascenseur, key_lines, 1 fournisseur, exercice ouvert) → `seed_golden_loop`.
- Variante seedée `create_clean_test_copro_seeded` (comme l'actuel `_seeded`).
- **Ne part plus de `22222222`** (abandon du clone). 
  - *Critère* : `SELECT * FROM audit_finance_integrity(copro)` = **0 ligne**.

### Track C — Smoke Playwright (le vrai chemin UI)
- Test E2E connecté qui parcourt l'onboarding réparé sur données minimales (copro, 2-3 lots, 1 clé, budget, génération appels, reprise), puis vérifie en DB `audit_finance_integrity(copro)` = 0.
- Réutilise l'infra existante ([playwright.config.ts](../../../playwright.config.ts), `e2e/`).
  - *Critère* : smoke vert + 0 écart.

## 7. Décisions actées

1. **Test d'acceptation = SQL/RPC + smoke Playwright** (défense en profondeur).
2. **Portée = les 3 phases d'un coup** (A0+A1+A2 + tracks B et C).
3. **Onboarding = appel direct `post_budget_call_for_funds`** (sans AG), bootstrap d'une copro existante. Le flux AG-driven reste la voie normale hors onboarding.
4. **Reprise des soldes = option « B → A »** : contrepartie en **compte d'attente 471/472**, ventilée par nature+lot, **soldée à 0 avant approbation** de la période (converge vers le bilan d'ouverture complet sans l'imposer d'emblée). **Jamais 120** (mélangerait avec le résultat-en-attente).
5. **Frontière temporelle = snapshot à la date d'entrée** : le solde repris reflète la situation à l'entrée (appels déjà émis inclus) ; on ne génère **que les échéances restantes** de l'exercice.
6. **Postage en fin de wizard, après `audit_finance_integrity = 0`** (pas étape par étape) : tolérant à l'erreur humaine, aligné « valider avant gel ».

### Corrections issues de la revue croisée (challengée + vérifiée code)
- **Idempotence DB réelle** des appels et de la reprise (le guard actuel est frontend-only ; Step7 n'en a aucun → doublons au double-clic). Vrai bug à corriger.
- **`628` non-silencieux** : une charge non mappée déclenche un warning explicite, jamais un défaut muet.
- **Angle mort de l'audit documenté** : `audit_finance_integrity` ne détecte **pas** un mauvais compte de charge (écriture équilibrée) → la preuve « 0 écart » a une limite connue, à écrire noir sur blanc.
- **Fixture Track B enrichie** : inclure un **solde créditeur**, un **lot exempté de clé**, une **reprise multi-natures** (sinon on prouve un cas trop facile).
- Faux positifs écartés par le code : pas de contrainte de signe (avoir OK), lot à tantièmes 0 déjà omis (`amount>0`), multi-budgets même période sans collision (`call_id`/`source_id` distincts), aucun autre appelant de la logique sale (refactor sûr).

## 8. Critère d'acceptation global

`audit_finance_integrity(copro_id)` renvoie **0 ligne** pour : (a) une copro `create_clean_test_copro_seeded` (Track B), et (b) une copro créée par le smoke Playwright (Track C). Type check + build verts.

## 9. À régler pendant l'implémentation (détails, plus de blocage de design)

- Table de correspondance catégorie de ligne budget → compte de charge du plan (A0), défaut `628` **avec warning**.
- UX de l'erreur « clé incomplète » (A1) : message bloquant qui pointe la clé à compléter.
- Mécanisme d'idempotence retenu (A1/A2) : check-before-post vs capture gracieuse de la violation `UNIQUE`.
- Comment solder le compte d'attente 471/472 dans le wizard (A2) : saisie banque (Step 4) + réserves → résiduel à 0 ; gate d'approbation.
- Forme de la session Playwright connectée (C) : utilisateur + projet de test.
- Déprécier `create_test_copro` (clone) au profit de `create_clean_test_copro`, ou garder les deux le temps de la transition.
- TVA : confirmer le positionnement produit (syndic pro) — **hors scope de cette tranche**, mais à acter.

## 10. Hors scope

- Migration des données prod existantes déjà sales (data_migration séparée).
- Enforcement `is_postable` par trigger (1.4) et contrainte d'équilibre (4.2b) — étapes V1 distinctes.
- Reclassement des soldes chapeau historiques (1.5c), draft boucle d'or (1.5a).
- Flux d'invitation copropriétaire / portail (autre chantier).
