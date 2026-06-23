# AUDIT V1 — « GRAND LIVRE PROPRE » réconcilié avec la base live

> **Lecture seule. Rien n'est appliqué.** Produit le 2026-06-02 par un workflow d'audit (4 agents items + synthèse), croisant `PLAN_CORRECTION_VALIDE.md` (chap.4 + §3.1 V1 + §4 gaps), les fichiers `supabase/migrations/`, et les **données live vérifiées** de `iyfesbjnkpynmwlsmxnp` (boucle d'or `22222222`, témoin `11111111`).
> **But** : avant d'écrire la moindre migration V1, dire item par item ce qui est **déjà fait / partiel / à faire / périmé dans le plan**, donner le périmètre réel chiffré, et le séquencement.

---

## 1. Verdict en un coup d'œil

| Item V1 | Verdict | En une phrase |
|---|:--:|---|
| **1.5** — reclasser chapeau 450 (artefact seed) + neutraliser draft `81d0f732` + provisionner 450-1..5 sur 3 copros plates | ❌ **à faire** | Confirmé, mais **la vraie cause est l'ancien seed `niveau2d`**, et le périmètre du plan est sous-spécifié (témoin `11111111` aussi concerné, 2/3 copros plates pas vides). |
| **4.x** — re-seed des tx sans `source_id` PUIS CHECK | ⚠️ **plan périmé** | **40 tx** sans `source_id` (pas 28) ; le « re-seed » est **impossible** (immutabilité bloque aussi le DELETE) ; CHECK posable en **NOT VALID seulement**. |
| **1.4 + G5** — colonne `accounts.is_postable` + CONSTRAINT TRIGGER ; non-imputabilité | ❌ **à faire** | `is_postable` confirmé absent ; mais l'argument du plan sur `enforce_lot_id` est **faux** (déjà en `'450%'`). |
| **4.2b** — CONSTRAINT TRIGGER équilibre Σdébit=Σcrédit | ❌ **à faire** | **Aucun trigger d'équilibre** ; `cr3` ne pose **pas** de verrou (durcit juste une RPC). |
| **G2** — immutabilité (pas d'UPDATE de tx postée) | ✅ **déjà fait** | Verrouillé et solide ; le DELETE l'est aussi → tout assainissement par **écriture inverse datée**, jamais UPDATE/DELETE. |
| **4.3** — annexe 1 (+110) | — **hors V1** | Reporting légal (`fn_annexe_1`), classé V4. Ne rien faire en V1. |

---

## 2. Détail par item

### Item 1.5 — Chapeau 450, draft, copros plates → ❌ à faire

**Confirmé :**
- Les écritures du chapeau 450 de `22222222` sont bien des **artefacts seed** : 3 tx posted = 7 entries + 1 draft, **toutes** `created_by`/`posted_by`/`source_id` NULL, même `created_at` (2026-01-25 17:13:57).
- **Aucune fonction** ne contient le littéral nu `'450'` (vérifié : `pg_proc` regex `'450'` non suivi de `%`/`-` → 0). « Auditer les RPC qui ciblent le chapeau » = chasse au fantôme confirmée.
- La draft `81d0f732` existe (`status=draft`, `manual`, 1 entry sans `lot_id`), **référencée par aucun code/test** (seulement les `.md` de planning).
- Les 3 copros plates (`075c0249`, `2e341146`, `fd415d71`) ont **uniquement** le 450 nu (`is_system=false`), aucune 450-1..5 → `resolve_lot_tiers_account` **RAISE** sur tout appel/paiement. Provisionner 450-1..5 (+459) est nécessaire et suffisant.

**Corrections / ajouts au plan :**
1. **La vraie cause est l'ancien seed** `20260125_niveau2d_ledger_seed.sql` (ligne 115 résout `v_account_copros` au code `'450'` puis y poste TX1/2/3/6/8/9). Le `seed_golden_loop` (31/05) est **innocent** (route 100 % canonique vers 450-1). → **corriger/neutraliser ce seed**, sinon tout re-seed/clone recrée le problème (hygiène repo).
2. **Le témoin `11111111` porte aussi 12 écritures** sur son chapeau 450 (`is_system=true`), dont 5 sans `lot_id`. → **explicitement LAISSÉ FIGÉ** (immutabilité témoin), **hors périmètre de correction**. À écrire noir sur blanc pour qu'un implémenteur ne tente pas de le « nettoyer ».
3. **« 450 = unique tiers » est faux pour 2/3 copros plates** : `075c0249` (1 entry `opening` postée, avec `lot_id`) et `2e341146` (4 entries `opening` postées) ont déjà un solde **immuable** sur leur 450 nu. Seule `fd415d71` est vide. Le provisionnement ne déplace pas ces `opening` → prévoir reclassement par écriture datée si chapeau-à-zéro voulu, ou accepter le solde figé.
4. Cas hors scope : `a3403914` (« MArtin myster ») n'a **aucun compte classe 4** — à traiter séparément.

**Comment (G2 oblige)** : assainissement uniquement par **écriture de reclassement datée** via `create_ledger_transaction` (portant un `lot_id`), **jamais d'UPDATE**. Draft `81d0f732` : corriger le seed plutôt qu'un DELETE isolé.

### Item 4.x — `source_id` NULL + CHECK → ⚠️ plan périmé

**Périmètre réel (vérifié) : 40 tx posted sans `source_id`**, pas 28 :

| source_type | tx NULL posted | reconstructibles (lien inverse) |
|---|---:|---:|
| call_for_funds | 20 | 10 |
| payment | 8 | 2 |
| supplier_invoice | 4 | 2 |
| manual | 5 | 1 |
| opening | 3 | 0 |
| **Total** | **40** | **15** (pas 14) → **25 orphelines** |

Répartition par copro : `075c0249` (2 cff + 3 manual + 1 opening), `11111111` (3 cff + 2 manual + 5 payment + 3 supplier_invoice), `22222222` (1 cff + 3 payment + 1 supplier_invoice), `2e341146` (4 cff + 2 opening), `fd415d71` (10 cff).

**Corrections au plan :**
1. **Chiffre faux** : 40, pas 28 (le plan oublie 4 supplier_invoice + 5 manual + 3 opening). Le chiffre audit d'origine « 5 tx » est aussi faux.
2. **« RE-SEED (pas UPDATE) » est impossible** : `trg_ledger_tx_no_delete_posted` bloque le DELETE d'une tx postée **exactement comme** `trg_ledger_tx_immutable` bloque l'UPDATE (exemption réservée à `opening_balance`/`closing`). Aucune des 40 n'est exemptable. Le mot « re-seed » suggère une opération réalisable qui ne l'est pas.
3. **18 des 40 tx sont sur le témoin `11111111` (13) + la boucle d'or `22222222` (5)** → intouchables par règle. Recréer les 25 orphelines à l'aveugle = fabriquer des pièces fictives (contraire art.6).
4. **La CHECK ne peut PAS être `VALIDATE`** : `VALIDATE` échouerait sur 32 lignes (20 cff + 8 payment + 4 supplier_invoice) non assainissables. → **poser la CHECK en `NOT VALID` seulement** (fige le FUTUR — ce qui est l'objectif réel, le code RPC pose déjà `source_id`) ; exposer l'historique via une vue `v_finance_integrity_issues`.
5. La CHECK proposée (5 types) **n'inclut ni `manual` ni `opening`** → garde incomplète. Et **ne pas requalifier `opening` → `opening_balance`** : faux sémantiquement (`opening` = ouverture initiale immuable ; `opening_balance` = à-nouveau régénérable) **et** bloqué par les triggers. État « à moitié fait » = normal, pas un défaut à corriger en V1.

**Déjà bon** : le code RPC (WP1+) pose `source_id` ET le lien inverse `table.ledger_tx_id`. Les 40 NULL sont **tous** des artefacts seed (`created_by` NULL à 100 %).

### Item 1.4 + G5 — `accounts.is_postable` + non-imputabilité → ❌ à faire

**Confirmé :**
- `accounts.is_postable` **absent** (15 colonnes, aucune ; absent de toutes les migrations).
- `parent_id` NULL et `nb_children=0` sur **100 %** des 45x → hiérarchie vide, **inexploitable** pour dériver « non-terminal ».
- `is_system` **ambigu** : `true` sur le chapeau des 5 copros « réelles », `false` sur celui des 3 plates → ne distingue pas « chapeau interdit » de « seul tiers en service ».

**Correction au plan (wording) :** l'argument « ne pas élargir `enforce_lot_id_on_45x` à `'45%'` car ça n'attrape pas le chapeau » est **FAUX** : la fonction est **déjà** `LIKE '450%' OR '459%'`, donc `'450'` est déjà attrapé. **La vraie justification de `is_postable`** : `enforce_lot_id` ne contrôle **que le `lot_id`**, pas le caractère imputable du compte — il **laisse passer** une imputation sur le chapeau dès qu'un `lot_id` est fourni (cas réel : `22222222`, 7/7 entries chapeau **avec** `lot_id`). `is_postable` ferme ce trou. **Conclusion du plan correcte** (ne pas toucher `enforce_lot_id`, ajouter `is_postable` par-dessus) — seul l'argument est à corriger.

**Design retenu :**
- `ADD COLUMN accounts.is_postable boolean NOT NULL DEFAULT true`.
- Backfill `false` **uniquement** sur les chapeaux qui ont déjà des 450-1..5 (`11111111`, `22222222`, `1feca864`, `a71786d2`, `fe96e927`). **Laisser `true`** sur le 450 nu des 3 plates **jusqu'à** provisionnement (sinon plus aucun compte postable).
- **CONSTRAINT TRIGGER BEFORE INSERT sur `ledger_entries`** (granularité ligne, c'est elle qui porte `account_id`) : si `is_postable=false` → RAISE. **Complément** (pas remplacement) de `enforce_lot_id`. Modèle : `trg_validate_call_total`.

**G5 (ordre) réel mais latent :** `open_next_period` reporte les soldes 1/4/5 par `account_id`+`lot_id` ; si le chapeau porte un solde il serait recopié **sur le chapeau** en N+1. Aujourd'hui **0 `opening_balance` ne cible un 45x** (l'à-nouveau n'a jamais tourné), mais le chapeau porte des soldes (`11111111`:12, `22222222`:7). → poser `is_postable=false` **avant** d'avoir reporté/reclassé ces soldes ferait échouer le 1er `open_next_period`. **Ordre impératif confirmé : 1.5 → 1.4 → à-nouveau.** ⚠️ Sur `11111111`, 5/12 entries chapeau ont `lot_id` NULL → un re-report les rejetterait même sans `is_postable` (preuve d'un chemin historique antérieur au trigger).

### Item 4.2b — CONSTRAINT TRIGGER équilibre → ❌ à faire / G2 immutabilité → ✅ déjà fait

**4.2b = intégralement à faire :**
- **Zéro trigger d'équilibre** Σdébit=Σcrédit (vérifié : `pg_trigger` deferrable sur `ledger_transactions`+`ledger_entries` = vide).
- `check_transaction_balance` existe (STABLE) mais est **orpheline** : `wired_as_trigger=0`, **aucune** fonction ne l'appelle.
- **`cr3_ledger_tx_balance_guard` ne pose AUCUN trigger** : elle durcit seulement `create_ledger_transaction` (RAISE si déséquilibre, **et uniquement quand `p_auto_post=true`**). Garde **applicative contournable** par INSERT direct RLS-off. Le nom « balance_guard » est trompeur → **4.2b n'est ni fait ni partiel.**

**Pièges techniques pour l'implémentation :**
- `check_transaction_balance` **RETURNS TABLE** (5 colonnes) → **inutilisable** directement comme prédicat de trigger. Faire `SELECT is_balanced INTO ...` ou recoder `ABS(Σd-Σc)<=0.01` inline.
- Déclencher sur **`INSERT OR UPDATE`** (pas `AFTER UPDATE` seul comme écrit ligne 123 du plan), sinon un INSERT direct déjà `status='posted'` déséquilibré **échappe** au verrou.
- `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`, contrôle si `NEW.status='posted'`, tolérance **0,01** (ne pas la relever). Modèle : `trg_validate_call_total`.

**G2 = déjà fait et solide :** `is_ledger_regen_exempt` n'exempte que `opening_balance`/`closing` **ET** `source_id NOT NULL` **ET** les 2 périodes `status<>'approved'`. Les 4 triggers d'immutabilité (tx + entry, update/delete/no-insert) sont actifs. Tous les types posted (cff, payment, supplier_invoice, manual, opening) sont **non-exemptables**. → **aucun travail base**. Conséquence : assainissement (1.5, 4.x) par **écriture inverse datée** ou copro neuve, jamais UPDATE/DELETE. ⚠️ Subtilités : `opening` (3 tx) **n'est PAS** exempté (seul `opening_balance` l'est) ; et l'exemption `opening_balance`/`closing` **tombe dès `approve_period`** → séquencer 1.5/à-nouveau **avant** approbation.

---

## 3. Corrections à reporter dans `PLAN_CORRECTION_VALIDE.md`

1. **§4.x** : périmètre = **40 tx** sans `source_id` (20 cff + 8 payment + **4 supplier_invoice + 5 manual + 3 opening**), pas 28.
2. **§4.x** : « RE-SEED (pas UPDATE) » → **impossible** : le DELETE est bloqué comme l'UPDATE. Reformuler en « historique figé + garantir le futur ».
3. **§4.x** : reconstructibilité = **15/40** (pas 14) ; **25 orphelines** (pas ~14) ; **18 sur témoin/boucle d'or** (intouchables). CHECK en **`NOT VALID` seulement**, jamais `VALIDATE`.
4. **§4.x durcissement (a)** : le « nettoyage des manual de test » ne vise que 3 tx (075c0249), elles-mêmes posted/immuables ; les 2 de `11111111` sont sur le témoin. La CHECK n'inclut ni `manual` ni `opening`.
5. **Ligne 114 (1.4/G5)** : l'argument « `enforce_lot_id` à `45%` n'attrape pas le chapeau » est **FAUX** (déjà `'450%'`). Corriger le wording, garder la conclusion (`is_postable` par-dessus).
6. **§4.2b** : `cr3_ledger_tx_balance_guard` **ne pose aucun trigger/contrainte** (durcit une RPC, `p_auto_post` seulement). 4.2b reste **entièrement à faire**.
7. **§4.2b** : prévoir le piège `check_transaction_balance` RETURNS TABLE (→ `SELECT ... INTO`) et `INSERT OR UPDATE` (pas `AFTER UPDATE` seul).
8. **§1.5 (S4, ligne 33)** : ajouter explicitement la **correction de l'ancien seed `20260125_niveau2d_ledger_seed.sql`** (vraie cause), sinon re-seed recrée le problème.
9. **§1.5** : 2/3 copros plates **ne sont pas vides** (075c0249 + 2e341146 portent des `opening` postées immuables).
10. **§1.5** : expliciter que le **témoin `11111111` (12 écritures chapeau) est laissé figé**, hors périmètre.
11. **`opening` vs `opening_balance`** : ne **pas** requalifier (faux + bloqué). État « à moitié fait » normal.
12. **G2 (ligne 41/301)** : déjà fait en base → reformuler en conséquence opérationnelle, et noter que l'exemption **tombe à `approve_period`**.

---

## 4. Séquencement réel recommandé pour V1

Ordre interne confirmé **1.5 → 1.4 → à-nouveau** (G5), avec **4.2b et 4.x parallélisables**.

```
(0)  AVANT toute migration : produire vues/tests d'intégrité sur copro JETABLE (create_test_copro_seeded)
     - v_finance_integrity_issues (liste les 40 tx source_id NULL = état de référence)
     - contrôle pré-1.4 « net du chapeau 450 par copro » (doit = 0 avant d'activer is_postable=false)
       ↓
(1.5a) Corriger/neutraliser l'ancien seed 20260125_niveau2d_ledger_seed.sql (ligne 115 + TX1/2/3/6/8/9 + draft 81d0f732)
       → coupe la cause à la racine (corriger le seed, pas un DELETE isolé)
       ↓
(1.5b) Provisionner 450-1..5 (+459) sur 075c0249 / 2e341146 / fd415d71 → débloque resolve_lot_tiers_account
       (laisser leurs 'opening' postées figées sur le 450 nu)
       ↓
(1.5c) Sur copros de TRAVAIL uniquement (jamais 11111111 ni 22222222) : reclasser solde chapeau→450-1
       par écriture DATÉE via create_ledger_transaction (avec lot_id, jamais UPDATE)
       ↓
(1.4)  ADD COLUMN accounts.is_postable DEFAULT true ; backfill false UNIQUEMENT sur chapeaux dotés de 450-1..5 ;
       laisser true sur le 450 nu des plates jusqu'à provisionnement ; CONSTRAINT TRIGGER BEFORE INSERT sur ledger_entries
       ↓
(4.2b) Fonction trigger d'équilibre (SELECT is_balanced INTO ... ou inline) + CONSTRAINT TRIGGER
       AFTER INSERT OR UPDATE on ledger_transactions, DEFERRABLE INITIALLY DEFERRED, si status='posted', tol. 0,01
       — parallélisable à 1.x
       ↓
(4.x)  CHECK source_id NOT NULL en NOT VALID (ne PAS VALIDATE) ; documenter l'historique seed figé via la vue d'intégrité
       ↓
(G2)   rien à faire (déjà verrouillé)
```

> NB : `3.1`/FIFO **ne dépend pas de V1** (parallèle, mais dépend de V2). L'à-nouveau effectif (`open_next_period`, V4.2) appartient à V4 (après V2) — il n'est dans V1 que comme **contrainte d'ordre** (poser `is_postable=false` APRÈS report des soldes chapeau).

---

## 5. Prérequis avant d'écrire la moindre migration

- [ ] **Ne pas corriger au fil de l'eau** : V1 planifiée et testée de bout en bout sur **copro jetable** (`create_test_copro_seeded`), jamais sur `11111111` (témoin) ni `22222222` (boucle d'or, exo 2026 ouvert).
- [ ] **Aucun UPDATE ni DELETE de tx posted** (G2 verrouillé : `restrict_violation`). Tout assainissement = **écriture de reclassement datée** via `create_ledger_transaction` (avec `lot_id` pour les 450-x). Vaut pour 1.5 et 4.x.
- [ ] **Corriger le PLAN avec les chiffres vérifiés** (§3 ci-dessus) **avant** d'écrire.
- [ ] **Produire les vues/tests d'intégrité d'abord** : `v_finance_integrity_issues` (40 tx) ; contrôle « net chapeau 450 par copro = 0 » avant `is_postable=false` ; test #7 (un INSERT RLS-off d'une tx posted déséquilibrée passe AVANT 4.2b, rejeté APRÈS, en transaction rollback).
- [ ] **Backfill `is_postable` conditionnel** : `false` seulement sur chapeaux dotés de 450-1..5 ; `true` sur le 450 nu des plates tant que leurs 450-1..5 manquent et que leurs `opening` postées ne sont pas gérées.
- [ ] **Exclure du périmètre** : témoin `11111111` (chapeau figé, 5/12 sans `lot_id`) et boucle d'or `22222222` (7 entries chapeau figées). Traiter `a3403914` (aucun compte classe 4) hors V1.
- [ ] **Séquencer toute reprise/à-nouveau AVANT `approve_period`** (l'exemption d'immutabilité tombe au statut `approved`). Ne pas requalifier `opening` en `opening_balance`.
- [ ] **Piège 4.2b** : `check_transaction_balance` RETURNS TABLE → `SELECT is_balanced INTO` ; trigger sur `INSERT OR UPDATE` ; tolérance 0,01 inchangée.
- [ ] **Re-valider les vues filtrant `'450%'`** (`fn_annexe_1`, `fn_annexe_1_detail_copros`) après assainissement : elles agrègent chapeau + 450-x. `4.3`/`fn_annexe_1` reste **hors V1** (rangé V4).
