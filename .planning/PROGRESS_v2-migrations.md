# PROGRESS — Migrations baseline v2 (cœur finance, RPC R1 = 0004/0005)

> Doc vivant du chantier « FONDATION DB v2 » côté RPC. Sert AUSSI de doc de pilotage du workflow d'authoring (phase B).
> Repo code : `coproflex-v2` (`socle-connaissance-v2`). Décisions consignées : `REFONTE_DECISIONS_2026-06-23.md` (bloc BL-R1).

## État (2026-06-29)
- ✅ **0001/0002/0003 écrits + revus + corrigés** (enums+socle / 14 tables finance bigint / sécurité C16-4 + intégrité GL). NON appliqués.
- ✅ **Extraction qqfq R1 COMPLÈTE** : `rpc-qqfq/qqfq-rpc-bodies.sql` (19 corps) + `rpc-qqfq/helpers-r1.sql` (`repartition_key_is_complete`, avec note d'adaptation `coverage_mode`→`repartition_category`).
- ✅ **Grilling R1 BOUCLÉ** : R1-01 (maigre 12 fn) · Gate 1 = 77 560 · workflow B = pipeline/fonction + filet cohérence. **Prêt pour phase B (ultracode).**
- ✅ **Phase B (workflow authoring) FAITE** (workflow `wdazr2npa`, 51 agents) : `0004` (6 fn après retrait doublons) + `0005` (5 fn) écrites ; audit cascade adversarial + tri Lyes ; 3 bugs objectifs corrigés à l'écriture + 4 retours triés appliqués. Détail § « Phase B — Résultat ».
- ✅ **Phase C — compile-test BEGIN/ROLLBACK VERT** (2026-06-29) : `0001→0005` s'appliquent proprement sur `oio` puis ROLLBACK (**functions=30 tables=26 triggers=33 policies=0** ; oio reste **0/0**). Voie = **connexion directe Postgres** via `coproflex-v2/scripts/db/runner.mjs` (le MCP ne peut pas pousser ~100 Ko inline).
- ⏳ **Phase C — suite (SESSION NEUVE)** : **APPLY réel** `node coproflex-v2/scripts/db/runner.mjs --apply` (après feu vert Lyes ; décider AVANT le tracking `schema_migrations`) → puis **scénario Gate 1** (golden 77 560, Hugo en imputation ciblée) = preuve comportement au centime.

### Outillage migrations (durable)
- `coproflex-v2/scripts/db/runner.mjs` — dry par défaut (BEGIN→applique→compte→ROLLBACK) ; `--apply` = COMMIT. Lit `OIO_DB_URL` + CA dans `.env.local`. `pg` dans `scripts/db/` (node_modules gitignoré).
- `OIO_DB_URL` (connexion directe oio, mdp à caractère spécial → parser découpe au dernier `@`) dans `coproflex-v2/.env.local` (gitignoré). CA Supabase : `.planning/rpc-qqfq/supabase-ca.crt` (public). TLS vérifié (jamais désactivé).
- SQL de test combiné : `.planning/rpc-qqfq/_compile_test_r1.sql`.

## R1-01 — Périmètre R1 = MAIGRE, chemin courant dans l'année (12 fn)
Prouvé seul par le golden 2026 (appels + encaissements), SANS dépendance au cut-off, aux corrections, ni à la reprise.

### 0004 — GL core / périodes (helpers) / plan de comptes / répartition (8 fn)
| Fn | Voie | Notes d'adaptation |
|---|---|---|
| `create_ledger_transaction` | voie1 + bigint | **Corps qqfq DÉJÀ propre** (lève des exceptions, PAS de `WHEN OTHERS→success:false`) → la consigne « rewrite » du plan est caduque ; juste bigint + le cast `::ledger_source_type` valide déjà l'enum. |
| `post_ledger_transaction` | voie1 + bigint | Équilibre strict (bigint = exact). |
| `get_period_for_date` | voie1 | Lecture seule (STABLE). |
| `get_open_period` | **NEUVE** | Période `status='open'` d'une copro (≤1 par invariant WP5.1) ou NULL ; loader pilote. |
| `provision_copro_chart` | **rewrite/seed** | Codes LÉGAUX du golden : 601 eau, 602 électricité, 603 chauffage, 611 nettoyage, 614 ascenseur, 615 espaces verts, 616 assurance, 621 syndic, 624 frais CS ; 701/702/705/711 ; 450-1/-2/-3/-5 ; 105 ALUR. **Seed MAIGRE = ce que le golden exerce** (pas tout le plan légal). |
| `resolve_lot_tiers_account` | rewrite léger | 4 natures **{current, works, advance, alur}** → 450-1/-2/-3/-5 ; **retirer la branche `loan`** (prend du texte, pas l'enum → pas de casse). |
| `set_account_charge_nature` | voie1 | `charge_nature` {courant, travaux}. |
| `compute_repartition_shares` | voie1 + bigint | Arrondi cumulatif (golden §3.2) en centimes ; `weight`/`share_pct` restent `numeric`. |

### 0005 — appels / paiements (4 fn + 1 helper)
| Fn | Voie | Notes |
|---|---|---|
| `post_budget_call_for_funds` | voie1 + bigint | **Générique 3 natures** : budget_type current→C701, works→C702, alur→C105 ; D450-x par lot agrégé. Garde dur `repartition_key_is_complete`. Pose `call_for_funds.status='issued'`, lignes `amount_due`. |
| `repartition_key_is_complete` | voie1 (helper) | **À EXTRAIRE de qqfq.** Garde dur (refuse appel si la clé ne couvre pas tous les lots). **Adapter** : qqfq `coverage_mode='subset'` → notre `repartition_category` `special` (subset = ≥1 ligne weight>0) ; `general` = tous lots couverts. |
| `post_owner_payment` | voie1 + bigint | Crée le paiement (D512/C450-x) + appelle `allocate_payment`. **Retirer toute écriture `amount_paid`** (n'existe plus). |
| `allocate_payment` | **rewrite** | FIFO cloisonné par nature, **SANS écrire `amount_paid`/`status`** (dérivés en vue, G24-T11). Écrit `payment_allocations`. |
| `get_lot_balance_45x` | voie1 + bigint | Solde 45x agrégé d'un lot (fonction, pas vue). |

❌ **Exclus de R1** (doctrine G24-T11) : `update_call_status`, `recalculate_all_call_statuses`, trigger de statut de ligne → statut payé/partiel = **vue dérivée** (`v_call_lines_by_lot_gl`, en 0007/R2).

## Différé hors R1 (justifié par finance-first maigre + dépendances réelles)
- **→ 0006 (avec le cut-off)** : `close_period`, `approve_period`, `reopen_period`, `open_next_period`. **Raison dure** : `open_next_period` → `reverse_period_cutoff` (cut-off, 0006). Prouvé par l'à-nouveau 2026→2027.
- **→ tranche « corrections »** : `reverse_ledger_transaction` (dép. `is_ledger_regen_exempt`), `cancel_call_for_funds` (→ reverse_ledger), `reverse_payment` (→ reverse_ledger + `unallocate_payment`). Spec ciblée `corrections-contre-passation.spec.ts`.
- **→ tranche « reprise de mandat » (TOUT différée)** : `set_opening_balance` (source `opening_onboarding`, résidu 471/472). Spec `reprise-mandat.spec.ts`. ⚠️ `opening_balance` (à-nouveau annuel, `open_next_period`) reste, lui (≠ reprise).

## Règles d'adaptation (toutes fn copiées)
- **Argent** : `numeric(14,2)`/`numeric` montants → **bigint centimes**. `weight`/`share_pct`/`weight_snapshot`/tantièmes/surface = restent `numeric`. **Arrondi cumulatif** (golden §3.2), jamais `round(numeric)`.
- **asOf** : dates en paramètre, **jamais** `DEFAULT CURRENT_DATE` (C17-4). NB : `reverse_ledger_transaction` (différé) a un `coalesce(p_reversal_date, current_date)` → à revoir quand on le fera.
- **Sécurité** : garder `SECURITY DEFINER` + `SET search_path=public` ; helpers `is_service_call`/`user_is_copro_manager`/`user_has_copro_access` = en 0003 (vérifier signatures).
- **Enums : NE PAS copier les enums qqfq** — utiliser la baseline 0001. `lot_type` : mapper `'commerce'` (qqfq) → `'local_commercial'` (0001). `ledger_source_type` R1 utilise : `call_for_funds`, `payment`, `od`, `opening_balance` (`transfer`/`opening_onboarding` = hors R1, dans des fn différées). Vérifier que 0001 couvre le set utilisé ; sinon `ALTER TYPE ADD VALUE` (trivial).

## Décisions de grilling (2026-06-29) — TRANCHÉES
- **R1-01** : R1 = maigre, chemin courant dans l'année (12 fn). ✅
- **Q3 — Gate 1 = monde budgété complet 77 560** : courant 50 000 (C701) + travaux ravalement 22 560 (C702) + ALUR 5 000 (C105) via `post_budget_call_for_funds` + encaissements + impayé hors toiture 6 337,50 + `audit_finance_integrity`=0 + équilibre GL + golden inchangé. Toiture exceptionnelle 37 600 (`post_exceptional_call`) → hors R1. ✅
- **Q4 — Workflow B = pipeline par fonction + filet de cohérence.** ✅

## Phase B — Design du workflow d'authoring (ultracode)
- **Spec de conventions commune** = CE PROGRESS (voies, bigint, asOf, enums, rewrites) + `rpc-qqfq/qqfq-rpc-bodies.sql` + `rpc-qqfq/helpers-r1.sql` + baseline `0001`/`0002`/`0003` (à RÉFÉRENCER, jamais inventer une colonne/enum).
- **Pipeline par fonction (13 items = 12 fn + 1 helper)** : chaque item → [agent **auteur** (copie voie1+bigint OU rewrite noté) → agent **auto-vérif cohérence** vs 0001-0003 : refs colonnes/enums/fn, bigint, asOf, rewrite appliqué]. Rewrites = agents dédiés (`allocate_payment`, `provision_copro_chart`, `resolve_lot_tiers_account`, `repartition_key_is_complete` adapté, `post_owner_payment` sans `amount_paid`). `get_open_period` = agent « écriture neuve » (période open d'une copro ou NULL).
- **Étape d'assemblage + cohérence globale par migration** (barrier) : ordonne par dépendance dans `0004`/`0005`, vérifie refs croisées + signatures + qu'AUCUNE fn différée n'est tirée → produit les 2 fichiers.
- **Sortie** = `coproflex-v2/supabase/migrations/0004_gl_core_and_periods.sql` + `0005_calls_and_payments.sql` (NON appliqués).
- **Puis phase C** (séparée) : revue cascade ultracode → **tri Lyes** (AskUserQuestion) → BEGIN/ROLLBACK sur `oio` (+ scénario Gate 1) → OK Lyes → apply.

## Phase B — Résultat (2026-06-29, workflow `wdazr2npa` / 51 agents)
- **Écrites** (NON appliquées) : `0004_gl_core_and_periods.sql` (**6 fn** après retrait doublons) + `0005_calls_and_payments.sql` (**5 fn**).
- **3 bugs objectifs corrigés à l'écriture** (auto-vérif, auraient planté à coup sûr) : `set_account_charge_nature` (cast bigint→boolean à chaque appel) · `allocate_payment` (garde d'accès manquante sur fn SECURITY DEFINER) · `post_owner_payment` (ON CONFLICT à prédicat partiel incompatible avec la contrainte unique TOTALE de 0002).
- **Audit cascade adversarial** (8 dimensions + juges sceptiques) : 15 pistes → 13 réfutées (style/défensif/redondances volontaires) → **2 confirmées** + 1 doublon structurel.
- **Tri Lyes (2026-06-29) → corrections appliquées** :
  - **R1-fix1 — Doublon** : `get_period_for_date` + `get_open_period` RETIRÉS de 0004 (vivent déjà en 0003). 0004 = 6 fn.
  - **R1-fix2 — Hugo / Gate 1** : code RPC **inchangé** (copie fidèle qqfq : le FIFO auto ne touche jamais l'ALUR = invariant voulu). **Décision : le scénario Gate 1 impute Hugo via `p_call_line_ids` (imputation ciblée art.1342-10)** pour reproduire la ventilation 450-1/450-2/450-5 du golden au centime. ⚠️ **À CÂBLER dans la spec Gate 1** (sinon les asserts 450-x échouent — c'est un choix de design du test, pas un bug de code).
  - **R1-fix3 — Garde filtre** : `allocate_payment` rejette un `p_nature_filter` hors {current,works,alur} (errcode 22023, fail-loud).
  - **R1-fix4 — Auto-post** : `create_ledger_transaction` lève une exception si `auto_post` demandé sur écriture déséquilibrée (au lieu d'un draft « success:true » trompeur). Calcul comptable inchangé.
- **NEXT = phase C** : compile-test BEGIN/ROLLBACK des 0001→0005 sur `oio` (preuve empirique « zéro bug cascade ») → scénario Gate 1 (77 560) → tri Lyes → apply.

## Phases & acceptation
- **A — Extraction** ✅ (sauf `repartition_key_is_complete`).
- **B — Workflow authoring (ultracode)** : produit `0004` + `0005` depuis l'extraction + ce doc (adaptation bigint/asOf + réécritures notées + vérif cohérence colonnes/enums vs 0001-0003).
- **C — Revue cascade (ultracode) → tri Lyes (AskUserQuestion) → BEGIN/ROLLBACK sur `oio` → OK Lyes → apply.**
- **Gate 0** (structure+sécu) : `get_advisors` 0 `rls_disabled` (NB : RLS FORCE + vues = 0007/R2), schéma cohérent — BEGIN/ROLLBACK.
- **Gate 1** (cœur finance, R1) : scénario e2e SQL (BEGIN/ROLLBACK) déroulant les RPC sur le golden, **assert au centime** (selon Q3), `audit_finance_integrity=0`, équilibre GL, **golden inchangé**.

## Réf
- Extraction : `coproflex-v2/.planning/rpc-qqfq/qqfq-rpc-bodies.sql`
- Recette : `coproflex-v2/.planning/PLAN_MIGRATION_0001-0004.md` · Registre : `…/REGISTRE_INCLUSION_0001.md`
- Golden : `Co-Pro-Flex/.planning/tests/PLAN_GOLDEN_EXHAUSTIF.md` + `…/BL_AUDIT_GOLDEN_2026-06-28.md`
- Décisions : `REFONTE_DECISIONS_2026-06-23.md` (BL-R1) · Chantier : `CHANTIERS.md` (FONDATION DB v2)
