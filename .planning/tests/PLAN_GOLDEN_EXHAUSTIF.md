> ⚠️ **PÉRIMÉ — golden canonique = `coproflex-v2/.planning/GOLDEN_ELARGIE_DRAFT.md`.** La partie *résultat* de ce plan est obsolète (cf. §0.5 de la golden élargie) et le mapping « 602 = eau » y est erroné (le décret = 601 eau / 602 électricité / 603 chauffage). Conservé pour l'historique de cadrage. Voir `coproflex-v2/.planning/SUPERSEDES.md`.

# PLAN DE REFERENCE — Campagne de test exhaustive CoProFlex
## Golden « E2E-GOLDEN Domaine des Tilleuls » (exercices 2026 → 2027)

> Document de référence unique de la campagne. Toute spec, fixture ou exécution de test doit s'aligner sur les valeurs ci-dessous. Les valeurs marquées **[CORRIGÉ]** intègrent les verdicts de la vérification adversariale et priment sur tout calcul antérieur.

---

## 1. Objectif & principes

**But.** Prouver que CoProFlex est prêt pour un vrai syndic : un cycle annuel complet (appels → encaissements → factures → clôture → affectation → annexes → report → état daté) qui se déroule de bout en bout, deux fois (2026 puis 2027), avec preuve écran ET preuve base à chaque acte.

**Principes directeurs :**

1. **Golden narratif + specs ciblées.** Une copro de référence unique parcourt toute l'histoire métier (la « golden »). À côté, des specs ciblées attaquent les cas-limites (majorités, art.26/unanimité, FIFO, GED, maintenance…).
2. **Double preuve.** Chaque acte se valide par (a) ce que l'écran affiche (Playwright, rendu client réel) ET (b) ce que contient le grand livre / les vues dérivées (SQL via MCP). Un écran vert sans GL conforme = échec.
3. **Valeurs attendues pré-calculées.** Les montants attendus sont figés dans ce document, au centime quand c'est déterministe, sinon avec la quote-part théorique exacte + la tolérance d'artefact d'ordre (voir §6).
4. **`audit_finance_integrity = 0` après chaque acte.** Les 4 contrôles (LEDGER_UNBALANCED, LOT_ID_MISSING_45X, LOT_GL_MISMATCH, CALL_TOTAL_MISMATCH) doivent renvoyer 0 ligne en permanence. C'est le filet anti-régression silencieuse.
5. **Zéro dette immédiate.** Tout bug rencontré est corrigé tout de suite (migration via MCP + revue cascade), pas mis en backlog. On ne laisse pas deux patterns coexister.

---

## 2. La copro golden « E2E-GOLDEN Domaine des Tilleuls »

- **Préfixe `E2E-` obligatoire** sur le nom (isolation de campagne, pas de suppression auto).
- **Base tantièmes : 10 000** (`copros.total_tantiemes = 10000`, utilisé par `validateRepartitionKey`).
- **18 lots, 10 copropriétaires** (3 multi-lots). 2 bâtiments.
- Sur la clé générale : **1 EUR appelé = 1 tantième** → toutes les valeurs sont relisibles.

### 2.1 Bâtiments

| Code | Nom | Ascenseur | Niveaux |
|------|-----|-----------|---------|
| A | Bâtiment A | Oui | R+3 (RDC + 3 étages, cave -1) |
| B | Bâtiment B | Non | R+1 (RDC + 1 étage) |

### 2.2 Lots

| Réf | Type | Bât | Étage | Surface (m²) | Propriétaire | Tantièmes généraux |
|-----|------|-----|-------|-------------|--------------|--------------------|
| A-RDC-C1 | local_commercial | A | 0 | 80 | SCI Les Tilleuls | 900 |
| A-RDC-C2 | local_commercial | A | 0 | 60 | SCI Les Tilleuls | 650 |
| A-101 | appartement | A | 1 | 65 | Martin Dupont | 800 |
| A-102 | appartement | A | 1 | 75 | Sophie Laurent | 950 |
| A-201 | appartement | A | 2 | 65 | Hugo Lefebvre | 800 |
| A-202 | appartement | A | 2 | 75 | Pierre Moreau | 950 |
| A-301 | appartement | A | 3 | 90 | Pierre Moreau | 1 100 |
| A-302 | appartement | A | 3 | 90 | Claire Petit | 1 150 |
| A-CAVE-1 | cave | A | -1 | 6 | Martin Dupont | 30 |
| A-CAVE-2 | cave | A | -1 | 6 | Martin Dupont | 30 |
| A-CAVE-3 | cave | A | -1 | 6 | Pierre Moreau | 30 |
| A-CAVE-4 | cave | A | -1 | 6 | Pierre Moreau | 30 |
| A-PK-1 | parking | A | 0 | 12 | Martin Dupont | 50 |
| A-PK-2 | parking | A | 0 | 12 | Pierre Moreau | 50 |
| B-RDC-1 | appartement | B | 0 | 55 | Jean Bernard | 640 |
| B-RDC-2 | appartement | B | 0 | 55 | Lucie Girard | 640 |
| B-101 | appartement | B | 1 | 60 | Thomas Roux | 600 |
| B-102 | appartement | B | 1 | 60 | Emma Fontaine | 600 |

**Somme des tantièmes = 10 000.** ✔

### 2.3 Propriétaires (lot-centric : solde personne = somme de ses lots)

| Propriétaire | Lots | Nb lots | Tantièmes cumulés |
|--------------|------|---------|-------------------|
| **SCI Les Tilleuls** | A-RDC-C1, A-RDC-C2 | 2 (multi) | 1 550 |
| **Martin Dupont** | A-101, A-CAVE-1, A-CAVE-2, A-PK-1 | 4 (multi) | 910 |
| **Pierre Moreau** | A-202, A-301, A-CAVE-3, A-CAVE-4, A-PK-2 | 5 (multi) | 2 160 |
| Sophie Laurent | A-102 | 1 | 950 |
| Hugo Lefebvre | A-201 | 1 | 800 |
| Claire Petit | A-302 | 1 | 1 150 |
| Jean Bernard | B-RDC-1 | 1 | 640 |
| Lucie Girard | B-RDC-2 | 1 | 640 |
| Thomas Roux | B-101 | 1 | 600 |
| Emma Fontaine | B-102 | 1 | 600 |

Cross-check : 1 550 + 910 + 2 160 + 950 + 800 + 1 150 + 640 + 640 + 600 + 600 = **10 000**. ✔

### 2.4 Les clés de répartition (6 réelles + assiette ALUR informative)

| # | Clé | category | basis | coverage | Σ poids |
|---|-----|----------|-------|----------|---------|
| K1 | Charges générales | general | tantiemes | all_lots (18) | 10 000 |
| K2 | Ascenseur Bât A | special | custom | subset (6 apparts A, étage ≥1) | 1 200 |
| K3 | Charges Bât A | special | tantiemes | subset (14 lots A) | 7 520 |
| K4 | Charges Bât B | special | tantiemes | subset (4 lots B) | 2 480 |
| K5 | Eau froide | special | surface | subset (12 lots habitables/commerce) | 830 |
| K6 | Chauffage collectif | special | tantiemes | subset (6 apparts A) | 5 750 |
| K7 | Fonds travaux ALUR | ~~alur~~ → **pas une clé** | — | — | — |

> **[CORRECTION 2026-06-22 — cascade refonte wizard]** K7 n'est **PAS** un `repartition_key`. La cascade a prouvé qu'aucun code ne lit `category='alur'` : la cotisation ALUR vient d'un **budget `budget_type='alur'`** (action AG `CREATE_ALUR_FUND`), réparti sur une clé ordinaire (générale), posté D450-5/C105 par `post_budget_call_for_funds` (compte 105 déduit du `budget_type`, pas de la catégorie de clé). → Ne pas créer de clé ALUR. Les montants ALUR par lot (0,50/tantième) restent valides (basés sur les tantièmes généraux). **K5 (eau) base `surface`** est désormais saisissable : le wizard a été enrichi (champ surface sur les lots + base surface sur les clés + gestion des bâtiments). Voir [[golden_exhaustif_plan]].

**Poids par lot (détail) :**

| Lot | K1 | K2 | K3 | K4 | K5 | K6 | K7 |
|-----|----|----|----|----|----|----|----|
| A-RDC-C1 | 900 | — | 900 | — | 80 | — | 900 |
| A-RDC-C2 | 650 | — | 650 | — | 60 | — | 650 |
| A-101 | 800 | 100 | 800 | — | 65 | 800 | 800 |
| A-102 | 950 | 100 | 950 | — | 75 | 950 | 950 |
| A-201 | 800 | 200 | 800 | — | 65 | 800 | 800 |
| A-202 | 950 | 200 | 950 | — | 75 | 950 | 950 |
| A-301 | 1 100 | 300 | 1 100 | — | 90 | 1 100 | 1 100 |
| A-302 | 1 150 | 300 | 1 150 | — | 90 | 1 150 | 1 150 |
| A-CAVE-1 | 30 | — | 30 | — | — | — | 30 |
| A-CAVE-2 | 30 | — | 30 | — | — | — | 30 |
| A-CAVE-3 | 30 | — | 30 | — | — | — | 30 |
| A-CAVE-4 | 30 | — | 30 | — | — | — | 30 |
| A-PK-1 | 50 | — | 50 | — | — | — | 50 |
| A-PK-2 | 50 | — | 50 | — | — | — | 50 |
| B-RDC-1 | 640 | — | — | 640 | 55 | — | 640 |
| B-RDC-2 | 640 | — | — | 640 | 55 | — | 640 |
| B-101 | 600 | — | — | 600 | 60 | — | 600 |
| B-102 | 600 | — | — | 600 | 60 | — | 600 |
| **Σ** | **10 000** | **1 200** | **7 520** | **2 480** | **830** | **5 750** | **10 000** |

### 2.5 Checks de cohérence des clés (à vérifier dans le seed et en spec)

1. **K1 = 10 000 = `copros.total_tantiemes`** (exact). Couvre les 18 lots.
2. **Cotisation ALUR = au prorata des tantièmes (assiette = clé générale K1, Σ = 10 000), 0,50/tantième — PAS une clé K7 distincte** (cf. [CORRECTION 2026-06-22] : l'ALUR vient du `budget_type='alur'`, jamais d'une clé de catégorie 'alur'). La colonne K7 du tableau §2.4 est **informative (= K1)**, pas un `repartition_key`.
3. **Partition bâtiments stricte : K3 (7 520) + K4 (2 480) = 10 000.** Aucun lot dans les deux, tous couverts.
4. **K2 (ascenseur) = 6 lots = apparts Bât A étage ≥1**, pondération étage (1→100, 2→200, 3→300), Σ = 1 200. Les 12 autres exclus.
5. **K5 (eau) : base surface (≠ tantièmes), Σ = 830 m².** Caves et parkings exclus.
6. **K6 (chauffage) = 6 apparts Bât A, Σ = 5 750** (= somme de leurs tantièmes K1).
7. **Inclusions : K6 (6 apparts) = couverture K2 (6 apparts) ⊂ K3 (14 lots Bât A).** Cohérent.
8. **Modèle de données :** `tantiemes_generaux` **n'est PAS** une colonne de `lots`. Il est dérivé de `repartition_key_lines.weight` sur la clé `category='general'`. Le seed crée 1 ligne (clé générale, lot, weight) par lot + lignes des **clés spéciales uniquement** (K2-K6 ; **PAS de clé ALUR** — l'ALUR se calcule depuis le `budget_type` sur l'assiette générale) **pour les lots couverts** (jamais de `weight=0` en mode subset, sinon le compteur « N/M lots » est faussé). **6 clés réelles**, pas 7.

---

## 3. Conventions comptables de l'appli

### 3.1 Table opération → débit / crédit → preuve

| Opération | Débit | Crédit | RPC / code | Preuve |
|-----------|-------|--------|-----------|--------|
| Appel courant (1 ligne/lot×clé) | 450-1 par lot (agrégé) | 701 (total) | `post_budget_call_for_funds(current)` | 0026:418-611 (mapping l.479-484, GL l.576-594) |
| Appel travaux | 450-2 par lot | 702 (total) | `post_budget_call_for_funds(works)` | 0026:479-484 + 0025:53-58 |
| Cotisation ALUR (art.14-2 II) | 450-5 par lot | **105 (réserve) — jamais 701/702** | `post_budget_call_for_funds(alur)` | 0026:481 + 0025:58 |
| Encaissement copro (total/partiel) | 512 (total encaissé) | 450-x par nature lettrée (450-1/2/5) + trop-perçu 450-3 | `post_owner_payment` / `allocate_payment` | 0026:625-739 |
| Imputation FIFO cloisonnée par nature | *(pas de GL — `payment_allocations`)* | *(idem)* | `allocate_payment` | 0026:301-403 (FIFO `issue_date asc, id asc` l.356) |
| Facture fournisseur — saisie (brouillon) | *(aucune)* | *(aucune)* | `post_supplier_invoice(post=false)` → draft | 0026:751-869 |
| Facture — validation | 6xx (1 ligne/ventilation) | 401 (total TTC) | `validate_supplier_invoice` | 0026:823-858 |
| Facture — paiement | 401 | 512 | `post_supplier_payment` | 0026:881-979 |
| Avoir fournisseur | 401 | 6xx (écriture inverse) | `post_supplier_credit_note` | 0044:40-161 |
| Cut-off droits constatés (art.14-3) | 6x/7x ou contrepartie | 408 / 486 / 487 / 421… **jamais 45x** | `post_period_cutoff` / extourne `reverse_period_cutoff` | 0027:233-489 |
| Engagement (devis/OS voté, non facturé) | *(aucune écriture GL)* | *(aucune)* | `commitments` (BL-PE-1, table neuve) | l'engagé ne touche PAS le GL ; le **réalisé** classe 6 vient EXCLUSIVEMENT de `validate_supplier_invoice` (ci-dessus). `budget_expenses`/`validate_budget_expense` SUPPRIMÉES (BL-PE-1/BL-05, fin du double-posting). |
| Affectation fonds ALUR à un budget travaux | 105 | 705 | `post_alur_transfer` | 0037:17-121 |
| Règlement cash ALUR (Livret A→courant) | 512 | 502 | `settle_alur_transfer_cash` | 0037:126-201 |
| Clôture technique | *(bascule statut)* | — | `close_period` / `approve_period` / `reopen_period` | 0027:77-223 |
| Report à-nouveaux N→N+1 + split résultat | bilan 1/4/5 par compte×lot ; courant net → **478** ; travaux/except net → **12** | contrepartie d'équilibre | `open_next_period(opening_balance)` | 0027:505-677 → **réécrit 0056:175-347** |
| Affectation résultat aux copros | **478** (courant, total) ; **12** (travaux, total) | 450-1 par lot (courant) / 450-2 par lot (travaux) | `regularize_period(result_allocation)` | 0027:1124-1318 → **0056:433-627** |
| Apurement solde travaux gelé (12) post-appro | 450-2 / 12 selon signe | 12 / 450-2 selon signe | `settle_works_balance` | 0057:367-499 |
| État daté art.5 | *(lecture seule)* | — | `generate_etat_date_payload` | 0076:23-184 (v2.0) |
| Soldes d'ouverture / reprise mandat | compte par code ; résidu débiteur → 471 | idem ; résidu créditeur → 472 | `set_opening_balance(opening_onboarding)` | 0027:692-831 |
| Contre-passation générique | inverse origine | inverse | `reverse_ledger_transaction(od)` / `cancel_call_for_funds` / `reverse_payment` / `cancel_supplier_invoice` | 0071:48-233 + 0087 |

> **⚠️ Renommage B3 (0056) :** l'ancien **110 → `12`** (travaux/exceptionnel) et l'ancien **120 → `478`** (courant). Toute la doc parlant de 110/120 désigne désormais 12/478. Les variables internes (`v_acct_120`, `mv_120`…) ont gardé leur nom mais pointent sur 478/12.

> Mapping nature → compte 450-x (`resolve_lot_tiers_account` 0025:42-78) : current→450-1, works→450-2, advance→450-3, loan→450-4, alur→450-5 ; 459 (douteux) hors FIFO.

### 3.2 Règle d'arrondi (confirmée par le code, NON uniforme)

1. **Appels budgétaires = plus grand reste par télescopage cumulatif, 2 niveaux** (0026:504-574) :
   - entre échéances : `montant_i = round(B·i/N,2) − round(B·(i−1)/N,2)` ;
   - entre lots d'une clé : `part = round(T·cw/W,2) − round(T·(cw−w)/W,2)` (cw = poids cumulé).
   - Garantie : **Σ lignes = total au centime.**
2. **Affectation résultat** (0056:557-601) et **apurement travaux** (0057:457-475) = cumulatif où **la dernière ligne absorbe le reste**.
3. **Soldes d'ouverture** (0027:799-811) = pas d'arrondi de répartition, le **résidu exact part en 471/472** → équilibre 0 centime.
4. **Trop-perçu** = `round(p_amount − v_allocated, 2)` → 450-3 (0026:707).
5. Toute l'arithmétique en `numeric(14,2)`, **égalité stricte, aucun epsilon** (0025:476-477).

> **[CORRIGÉ — conséquence majeure des verdicts adversariaux + audit golden 2026-06-28]** Le télescopage est order-invariant **uniquement** quand la clé divise proprement. Par **trimestre**, **seule K1** (0,64375 EUR/tantième, sur les lots dont le tantième K1 n'est PAS multiple de 8) produit un **demi-cent résiduel** dont le placement dépend de l'ordre des lots (`lot_id` UUID). **K5 (eau) = 1,25 EUR/m² EXACT** (1037,50/830, surfaces entières) → divise proprement, **AUCUN résidu** ; idem toutes les autres clés. Donc les cents par lot du courant trimestriel ne sont pas déterministes **pour les seuls lots à résidu K1** et ne doivent pas y être figés comme « sortie GL canonique » ; partout ailleurs ils sont assertables au centime. Échéancier = **TRIMESTRIEL** (D14/BL-09 ; l'« appel annuel unique » est ABANDONNÉ — contournement banni). Voir §6.1 et §9 risque #1.

### 3.3 Ce que vérifie `audit_finance_integrity` (0028:657-758)

4 contrôles, **0 ligne = conforme**, via UNION ALL :

1. **LEDGER_UNBALANCED** — transactions postées dont Σdébit ≠ Σcrédit (tolérance > 0,01).
2. **LOT_ID_MISSING_45X** — lignes postées sur compte `45%` avec `lot_id` NULL.
3. **LOT_GL_MISMATCH** — écart entre solde GL restreint aux mouvements appels+paiements (+ extournes `od`) et `call_for_funds_lines` (dû−payé, hors annulés), par lot (vue `v_lot_vs_gl_mismatch`, col. `gl_call_payment_balance`).
4. **CALL_TOTAL_MISMATCH** — appels non draft/cancelled dont `total_amount ≠ Σ amount_due` des lignes.

**Limites (NON couvert par l'audit) :** solde du fonds 105/ALUR, comptes d'attente 12/478, cohérence facture/paiement fournisseur, invariant 478/12 (ce dernier a son propre garde-fou bloquant `assert_result_allocation_split` en fin de `regularize_period`).

### 3.4 Invariants v2 encore vrais + statut v2 des anciennes fonctions

> Réécrit 2026-06-28 (BL-03 « corriger > copier » + « solutionner, JAMAIS contourner »). La baseline v2 est NEUVE : on ne « contourne » plus rien. Ci-dessous les **invariants comptables à préserver** et le **statut v2** des anciennes fonctions v1. Les références aux numéros de migration du live qqfq (0014, 0026, 0055, 0075, 0087…) sont **sans objet sur la base neuve oio**.

**Invariants à préserver (voie 1 : copie du corps éprouvé) :**
- **FIFO d'imputation** : `issue_date asc, id asc`, cloisonné par nature (450-x).
- **Mapping nature → 450-x** : current→450-1, works→450-2, advance→450-3, loan→450-4, alur→450-5 ; 459 (douteux) hors FIFO.
- **Garde de routage 12/478** : `assert_result_allocation_split` en fin de `regularize_period` (**bloquante**).
- **Émission d'appel** : route unique `post_budget_call_for_funds` (exige `budget_id`) ; `post_call_for_funds` mono-clé **BANNIE**.
- **`amount_paid` + statut de ligne d'appel = DÉRIVÉS du GL** (BL-MIN, G24-T11), jamais mutés en cache → l'ancien souci « `reverse_payment` mute `amount_paid` d'un appel clos » **disparaît à la source**.

**Statut v2 des anciennes fonctions v1 (cf. décisions BL) :**
| Ancienne fonction / table v1 | Statut v2 |
|------------------------------|-----------|
| `budget_expenses` / `validate_budget_expense` | **SUPPRIMÉES** (BL-PE-1) — engagé = `commitments` (no GL), réalisé = `validate_supplier_invoice` |
| Relances impayés (`useImpayesMutations`, cron) | **DIFFÉRÉES** (BL-PE-2) — la baseline détecte l'impayé via le GL, n'envoie rien |
| `fn_annexe_*` / annexes légales | **DIFFÉRÉES hors baseline** (BL-06) — preuve via `audit_finance_integrity` + vues de solde |
| Bancaire (`categorizeBankMovement` / `reconcileBankMovement` / `bank_movements`) | **DIFFÉRÉ** (BL-06, faux-morts) |
| `approve_period` / `reopen_period` | **RPC gardées** ; jamais d'UPDATE nu de `status` ; valeurs `rejected`/`locked` mortes RETIRÉES de l'enum `period_status` (BL-AUDIT) |
| `create_ledger_transaction` | **RÉÉCRITE** (retrait du `WHEN OTHERS THEN success:false`, BL-03) |
| `cancel_supplier_invoice` / contre-passations | **à éprouver en spec ciblée** (`corrections-contre-passation.spec.ts`) |

---

## 4. Timeline 2026 → 2027 (scénario chiffré)

| Date | Événement | Montant clé |
|------|-----------|-------------|
| 2026-01-15 | **AGO 2026** : budget courant 50 000, ALUR 5 000, ravalement façade A (art.25, K3) 22 560 ; échéancier trimestriel | — |
| 2026-01-01 | **Appel T1** : courant 12 500 + ALUR 5 000 (en 1 fois) | 17 500 |
| 2026-01-10 | **Facture F1 Otis** (contrat maintenance ascenseur, 614, K2) saisie | 3 600 |
| 2026-01-15 | F1 payée (D401/C512) | 3 600 |
| 2026-04-01 | **Appel T2** : courant 12 500 + travaux ravalement 22 560 | 35 060 |
| 2026-06-15 | **AGE 2026** : toiture A (art.25, K3) 37 600 + appel except. (exig. 01/09) + budget complémentaire chauffage +2 000 (K6) | — |
| 2026-07-01 | **Appel T3** : courant 12 500 | 12 500 |
| 2026-09-01 | **Appel exceptionnel toiture** exigible | 37 600 |
| 2026-10-01 | **Appel T4** : courant 12 500 | 12 500 |
| 2026-12-28 | **Facture F2 Veolia** (eau, 601, K5) reçue, **non payée** → cut-off 408 | 1 037,50 |
| 2026-12-31 | **Clôture provisoire 2026**. Impayés : Hugo partiel, Thomas total | — |
| 2027-01-12 | Paiement F2 Veolia (en 2027) | 1 037,50 |
| 2027-01-01 / 04-01 | **Appels T1/T2 2027** : courant 13 000/trim + ALUR | 13 000 +ALUR |
| 2027-03-20 | **AGO 2027** : approbation comptes 2026, quitus, affectation résultat, budget 2027 = 52 000 + ALUR 5 000 | — |
| 2027-04-15 | **Vente B-101** (Thomas Roux → Nicolas Garnier) 180 000 → **état daté art.5** (lot débiteur 2 445) | — |
| 2027-12-31 | **Deuxième clôture (2027)** | — |

**Total appelé 2026 = 50 000 (courant) + 5 000 (ALUR) + 22 560 (ravalement) + 37 600 (toiture) = 115 160 EUR.**

---

## 5. Les 3 AG

### 5.1 Seuils de majorité (re-dérivés, base 10 000 tantièmes / 10 votants) — **[CONFIRMÉ]**

| Article | Règle | Seuil golden |
|---------|-------|--------------|
| art.24 (majorité simple) | majorité des présents/représentés | selon présents |
| art.25 (majorité absolue) | `floor(10000/2)+1` | **5 001 tantièmes** |
| passerelle 25-1 | `ceil(10000/3)` | **3 334 tantièmes** |
| art.26 (double majorité) | `floor(2·10000/3)+1` ET `for_n ≥ 6` (`floor(10/2)+1`) | **6 667 tantièmes + ≥ 6 votants** |

### 5.2 AGO 2026 (2026-01-15)

| # | Résolution | Article | action_type | Montant | Résultat attendu |
|---|-----------|---------|-------------|---------|------------------|
| 1 | Budget prévisionnel courant 2026 | art.24 | `CREATE_BUDGET` (current → D450-1/C701) | 50 000 | adopté |
| 2 | Cotisation fonds travaux ALUR (> min légal) | art.25 | `CREATE_ALUR_FUND` (D450-5/C105) | 5 000 | adopté |
| 3 | Travaux ravalement façade A | art.25 | `CREATE_WORK_BUDGET` (D450-2/C702) | 22 560 (K3, 3,00/poids) | adopté (≥ 5 001) |
| 4 | Échéancier trimestriel | art.24 | — | — | adopté |
| 5 | Élection conseil syndical | art.25 | — | — | adopté |

> ALUR : minimum légal = `MAX(2,5 % PPT ; 5 % budget)` = `MAX(2 500 ; 2 500)` = **2 500** ; voté **5 000** = double du minimum → conforme. **[CONFIRMÉ]**

### 5.3 AGE 2026 (2026-06-15) — en cours d'exercice

| # | Résolution | Article | action_type | Montant | Résultat |
|---|-----------|---------|-------------|---------|----------|
| 1 | Travaux exceptionnels toiture A | art.25 | `CREATE_WORK_BUDGET` (D450-2/C702) | 37 600 (K3, 5,00/poids) | adopté |
| 2 | Appel de fonds exceptionnel (exig. 01/09/2026) | art.25 | `CREATE_EXCEPTIONAL_CALL` (D450-2/C702) | 37 600 | adopté |
| 3 | **Budget complémentaire chauffage** (cas « voter un budget en AGE ») | art.24 | `CREATE_BUDGET` (K6) | +2 000 (porte chauffage 11 500 → 13 500) | adopté |

> **Garde « AGE + budget »** : le scénario doit prouver qu'on PEUT voter un budget en assemblée extraordinaire et le **reporter au prévisionnel 2027**. La citation `validate_budget (0026:1047-1049)` est **non vérifiable** dans le contexte → à éprouver empiriquement (test BEGIN/ROLLBACK). Voir §9.

### 5.4 AGO 2027 (2027-03-20)

| # | Résolution | Article | action_type | Résultat |
|---|-----------|---------|-------------|----------|
| 1 | Approbation comptes 2026 | art.24 | `APPROVE_ACCOUNTS` → `regularize_period` (D478/C450-1 courant ; D12/C450-2 travaux) | adopté |
| 2 | Quitus syndic | art.24 | — | adopté |
| 3 | Affectation du résultat 2026 | art.24 | (cf. résolution 1) | adopté |
| 4 | Budget prévisionnel 2027 | art.24 | `CREATE_BUDGET` | 52 000 adopté |
| 5 | ALUR 2027 reconduit | art.25 | `CREATE_ALUR_FUND` | 5 000 adopté |

> **Cas-limites à couvrir en spec ciblée (pas dans la golden) :** une résolution **rejetée** (sous le seuil art.25), la **passerelle 25-1** (échec art.25 → 2e vote majorité simple si ≥ 3 334), l'**art.26** et l'**unanimité**.

> Ordre `activate_ag_decisions` : budgets/élection (0) → appels (1) → `APPROVE_ACCOUNTS` (2, clôture en dernier). **[CONFIRMÉ]**

---

## 6. Valeurs attendues par acte

### 6.1 Appels de fonds — **[CORRIGÉ par la vérif adversariale, verdict « erreurs »]**

**Mapping comptable [CONFIRMÉ] :** courant D450-1/C701 ; ravalement + toiture D450-2/C702 ; ALUR D450-5/C105.

**Budget courant agrégé par clé [CONFIRMÉ] :**

| Clé | Montant annuel | Par trimestre |
|-----|---------------|---------------|
| K1 (général) | 25 750 | 6 437,50 |
| K2 (ascenseur) | 3 600 | 900,00 |
| K3 (Bât A) | 3 760 | 940,00 |
| K4 (Bât B) | 1 240 | 310,00 |
| K5 (eau) | 4 150 | 1 037,50 |
| K6 (chauffage) | 11 500 | 2 875,00 |
| **Total** | **50 000** | **12 500,00** |

> Détail des 9 postes du budget 2026 (codes alignés arrêté 14 mars 2005, cf. BL-CHART) : Assurance 616/K1 10 000 ; Honoraires syndic 621/K1 8 000 ; Nettoyage 611 + élec 602/K1 7 000 ; Ascenseur (contrat Otis) 614/K2 3 600 ; Eau 601/K5 4 150 ; Chauffage 603/K6 11 500 ; Espaces verts A 615/K3 3 760 ; Entretien B 615/K4 1 240 ; Honoraires CS 624/K1 750. **Σ = 50 000.**

**⚠️ NON DÉTERMINABLE au centime sans l'ordre `lot_id` :** par trimestre, **seule K1** (0,64375/tantième) laisse un demi-cent résiduel placé selon l'ordre des lots, sur les lots dont le tantième K1 n'est pas multiple de 8 (**K5 eau = 1,25/m² EXACT → aucun résidu**). **Ne JAMAIS figer les cents par lot du courant K1 comme valeur canonique** sur ces lots. Lots à résidu K1 (**12 lots**) : A-RDC-C1, A-RDC-C2, A-102, A-202, **A-301**, A-302 + 4 caves + 2 parkings → noter « quote-part théorique = `round(part exacte)`, ± 1 cent selon ordre, **total garanti** ». (Lots à division propre, assertables au centime : A-101, A-201, B-RDC-1/2, B-101/102.)

**Valeurs ROBUSTES (division propre, déterministes) :**

| Niveau | Valeurs exactes |
|--------|-----------------|
| **Total T1 courant** | **12 500,00** |
| **Total annuel courant** | **50 000,00** |
| Solde courant annuel — lots à division propre | A-101 **4 685,00** ; A-201 **4 985,00** ; B-RDC-1/2 **2 243,00** ; B-101/102 **2 145,00** |
| **Cross-check propriétaire (théorique exact ± artefact)** | Pierre **31 427,00** (exact) ; Hugo **11 785,00** (exact) ; Jean/Lucie **2 563,00** ; Thomas/Emma **2 445,00** ; SCI ≈ 18 641,25 ; Martin ≈ 12 758,25 ; Sophie ≈ 13 571,25 ; Claire ≈ 16 961,25 |
| **GRAND TOTAL appelé 2026** | **115 160,00** (exact) |

**ALUR par lot [CONFIRMÉ — division propre, order-independent] :** 0,50/tantième →

| Lot | ALUR | Lot | ALUR |
|-----|------|-----|------|
| A-RDC-C1 | 450 | A-302 | 575 |
| A-RDC-C2 | 325 | A-CAVE-1..4 | 15 chacun |
| A-101 | 400 | A-PK-1/2 | 25 chacun |
| A-102 | 475 | B-RDC-1 | 320 |
| A-201 | 400 | B-RDC-2 | 320 |
| A-202 | 475 | B-101 | 300 |
| A-301 | 550 | B-102 | 300 |
| **Σ 450-5** | | | **5 000** |

**Ravalement (tantième × 3, K3) [CONFIRMÉ] :** A-RDC-C1 2 700 ; A-RDC-C2 1 950 ; A-101 2 400 ; A-102 2 850 ; A-201 2 400 ; A-202 2 850 ; A-301 3 300 ; A-302 3 450 ; caves 90 ×4 ; parkings 150 ×2 ; **Bât B = 0**. **Σ = 22 560.**

**Toiture (tantième × 5, K3) [CONFIRMÉ] :** ex. A-301 5 500, A-RDC-C1 4 500, caves 150, parkings 250. **Σ = 37 600.**

**Solde 450-2 par lot (tantième × 8 = ravalement+toiture) [CONFIRMÉ] :** A-RDC-C1 7 200 ; A-RDC-C2 5 200 ; A-101 6 400 ; A-102 7 600 ; A-201 6 400 ; A-202 7 600 ; A-301 8 800 ; A-302 9 200 ; caves 240 ; parkings 400 ; **Bât B 0**. **Σ 450-2 = 60 160.**

**Équilibre GL [CONFIRMÉ] :** débit total = crédit total = **115 160,00** ; chaque opération équilibrée ; conforme LEDGER_UNBALANCED et LOT_ID_MISSING_45X.

> **Recommandation de test (issue de la vérif, alignée D14/BL-09) :** échéancier **TRIMESTRIEL** (l'« appel annuel unique » est ABANDONNÉ — contournement banni). Le seed asserte les cents par lot **uniquement sur les lots à division propre** (A-101, A-201, B-RDC-1/2, B-101/102) + les **totaux et soldes par propriétaire** (exacts) ; les **12 lots à résidu K1 tolèrent ± 1 cent** (l'audit ne le détecte pas, `call_for_funds_lines` portant les mêmes valeurs dérivées). Voir §9 risque #1.

### 6.2 Encaissements — **[OK, verdict « ok » — valeurs validées au centime]**

**Dû par propriétaire sur l'appelé 2026 hors toiture AGE (courant + ALUR + ravalement = 77 560 EUR) :**

| Propriétaire | Dû | Paiement | Impayé |
|--------------|-----|----------|--------|
| SCI Les Tilleuls | 10 891,25 | total (31/03) | 0 |
| Martin Dupont | 8 208,25 | total | 0 |
| Pierre Moreau | 20 627,00 | total | 0 |
| Sophie Laurent | 8 821,25 | total | 0 |
| **Hugo Lefebvre** | 7 785,00 | **partiel 3 892,50** | **3 892,50** |
| Claire Petit | 11 211,25 | total | 0 |
| Jean Bernard | 2 563,00 | total | 0 |
| Lucie Girard | 2 563,00 | total | 0 |
| **Thomas Roux** | 2 445,00 | **0** | **2 445,00** |
| Emma Fontaine | 2 445,00 | total | 0 |
| **Total impayés fin 2026** | | | **6 337,50** |

> Σ des dus par propriétaire = **77 560,00** (périmètre courant + ALUR + ravalement, **hors toiture AGE**). **Toiture exceptionnelle (37 600, exigible 01/09/2026) : encaissée avant clôture par TOUS les lots Bât A SAUF Hugo (A-201)**, qui laisse sa part de 4 000 impayée (USER 2026-06-28). D'où l'impayé GL strict TOTAL §6.4 = 6 337,50 (hors toiture) + 4 000 (toiture Hugo) = **10 337,50**. Le grand total appelé reste 115 160 toiture incluse.

**Détails FIFO validés :**
- **Hugo A-201**, dû 7 785,00 = courant 4 985,00 + ALUR 400,00 + ravalement 2 400,00. Versement 3 892,50 → FIFO multi-nature : courant 2 492,50 + ALUR 400,00 + ravalement 1 000,00. **Résiduel : 450-1 = 2 492,50 ; 450-2 = 1 400,00 ; 450-5 = 0,00.**
- **Thomas B-101**, dû 2 445,00 = courant 2 145,00 (K1+K4+K5 ; pas de K2/K3/K6 car Bât B) + ALUR 300,00. Versement 0 → résiduel intégral.

**Soldes globaux post-encaissement [validés par deux chemins] :**
- **D512 = 71 222,50** (= 77 560 appelé − 6 337,50 impayés).
- Crédits 450 : **450-1 = 45 362,50 ; 450-2 = 21 160,00 ; 450-5 = 4 700,00** ; Σ = 71 222,50 = D512.
- Résiduel total 6 337,50 = 4 637,50 (450-1) + 1 400,00 (450-2) + 300,00 (450-5).
- **Aucun trop-perçu → 450-3 = 0.**

> Réserve (déjà signalée) : l'ordre `id` intra-date peut changer la ventilation par nature du résiduel Hugo, **sans changer aucun total**.

### 6.3 Factures fournisseur — **[OK, verdict « ok »]**

**F1 Otis (3 600,00 TTC, contrat maintenance ascenseur, TVA non récup → ligne = TTC) :**
- Validation 10/01 : **D 614 = 3 600,00 / C 401 = 3 600,00** (équilibrée).
- Paiement 15/01 : **D 401 = 3 600,00 / C 512 = 3 600,00** → facture `paid`.

**F2 Veolia (1 037,50 TTC) :**
- Cut-off 31/12/2026 (CAP) : **D 601 = 1 037,50 / C 408 = 1 037,50** (rattache à 2026).
- Extourne auto 01/01/2027 (`open_next_period` → `reverse_period_cutoff`) : **D 408 = 1 037,50 / C 601 = 1 037,50**.
- Facture 2027 + paiement 12/01/2027 : **D 601/C 401** puis **D 401 = 1 037,50 / C 512 = 1 037,50**.
- **Charge eau nette : 2026 = +1 037,50 ; 2027 = 0** (extourne −1037,50 + facture +1037,50). Conforme art.14-3.

> Le « D408/C512 » du scénario est un raccourci de modélisation : effet net identique (charge 2026, décaissement 2027, 408 soldé). Les valeurs livrées suivent le **comportement réel du code** (auto_reverse).

### 6.4 Clôture 2026 + affectation + annexes + report — **[CORRIGÉ, verdict « erreurs »]**

| Grandeur | Valeur | Statut |
|----------|--------|--------|
| **Résultat courant** | **45 362,50** excédent (= 50 000 − (3 600 + 1 037,50)) | [CONFIRMÉ] |
| **Résultat travaux** | **60 160,00** excédent (= 22 560 + 37 600) | [CONFIRMÉ] |
| Quote-part courant | **4,53625 EUR/tantième** | [CONFIRMÉ] |
| Quote-part travaux | **6,016 EUR/tantième** | [CONFIRMÉ] |
| Invariant affectation | **478 + 12 = 105 522,50** = net source | [CONFIRMÉ] |
| À-nouveau | **111 560,00 = 111 560,00** (équilibré) | [CONFIRMÉ] |
| **Impayé GL strict** | **10 337,50** (Hugo A-201 7 892,50 [courant 2 492,50 + ravalement 1 400 + toiture 4 000] + Thomas B-101 2 445,00 [courant 2 145 + ALUR 300]) | [CORRIGÉ 2026-06-28 — l'ancien « 10 207,50 / Hugo 6 907,50 / Thomas 3 300 » était arithmétiquement IMPOSSIBLE : Thomas (Bât B, 0 travaux) a un dû TOTAL de 2 445 < 3 300. Hyp. toiture encaissée sauf Hugo (USER)] |

**Détail à-nouveau (équilibre) :** 512 = 101 222,50 + 45x = 10 337,50 **|** 105 (ALUR) = 5 000 + 408 = 1 037,50 + 478 = 45 362,50 + 12 = 60 160,00. → **111 560,00 = 111 560,00.**

> **[CORRIGÉ — erreur arithmétique du cumul]** Le **LEDGER CHECK global** (somme des 5 écritures de clôture) vaut **219 157,50 EUR** débit = **219 157,50 EUR** crédit, **et NON 218 157,50** (écart d'exactement 1 000 dans le rapport initial). Détail : 1 037,50 (cut-off F2) + 111 560,00 (à-nouveau) + 1 037,50 (extourne) + 45 362,50 (affect. courant) + 60 160,00 (affect. travaux) = **219 157,50**. Les débits restent = crédits ; seule la somme cumulée affichée était fausse.

> **Note arrondi (tolérable, dernière ligne absorbe le reste) :** A-RDC-C1 quote-part courant = 900 × 4,53625 = 4 082,625 → 4 082,63 (half-up) ou 4 082,62 (banquier) ; B-RDC-2 = 640 × 4,53625 = 2 903,20 (le 2 903,18 d'un rapport antérieur s'écartait de 0,02 — utiliser 2 903,20 / dernière ligne). Ces écarts ± 1 cent sont absorbés par la dernière ligne (cf. §3.2-2).

**Affectation résultat 2026 (votée AGO 2027) :** D478/C450-1 par quote-part (courant), D12/C450-2 par quote-part (travaux), clé `category='general'`, dernière ligne absorbe le reste ; garde-fou bloquant `assert_result_allocation_split` en fin.

**5 annexes légales :** vérifier libellés exacts (annexe 3 = ventilation par clés, 4 = travaux terminés, 5 = travaux non clôturés) ; **fn_annexe_* doivent être ≥ 0075** (format riche, sinon PDF blanc).

### 6.5 État daté art.5 — lot B-101 (Thomas Roux → Nicolas Garnier, effet 2027-04-15) — **[OK, verdict « ok »]**

| Partie | Poste | Montant |
|--------|-------|---------|
| **Partie 1** (dû par le vendeur) | 450-1 débiteur (2026 impayé 2 145 + T1 2027 échu 536,25) | **2 681,25** |
| | 450-5 (ALUR, **inclus en P1** — exclu seulement de P2) | **600,00** |
| | **Total P1** | **3 281,25** |
| **Partie 2** (dû par le syndicat au vendeur) | — (450-5 ALUR exclu, non remboursable) | **0,00** |
| **Partie 3** (charge acquéreur Garnier) | provisions appelées non échues (T2 2027 non échu) | **536,25** |
| | autres postes P3 | 0,00 |
| | **Total P3** | **536,25** |
| Quote-part B-101 | 600/10 000 | **6,0000 %** |

> Équilibre des appels sous-jacents : 3 281,25 D = C. **[CONFIRMÉ — corrigé 2026-06-28 : l'ancien 3 817,50 double-comptait le T2 2027 (à la fois P1 échu et P3 non échu)]**
>
> **Hypothèses TRANCHÉES (USER 2026-06-28, option A) :** base 2027 = **trimestriel 2026 reconduit (536,25/trim)** ; **T1 2027 échu** (due_date < 15/04 → entre en P1), **T2 2027 NON échu** (due_date figé > 2027-04-15 → P3 = 536,25). Plus de double-compte du T2 (P1 450-1 = 2 681,25). Le seed FIGE les `due_date` T1/T2 2027 + le montant trimestriel 2027 de B-101 ; `generate_etat_date_payload` calcule P1/P3 (incohérence supprimée à la source). `provisions_votees_non_appelees_courant = 0` (budget 2026 plus `validated` au 15/04/2027).

---

## 7. Structure des specs

### 7.1 Spec narrative sérielle — `golden-from-scratch.spec.ts`
La copro est **créée vierge depuis l'UI** puis parcourt toute la timeline §4 dans l'ordre, acte par acte. À chaque acte : double preuve (écran + GL) et `audit_finance_integrity = 0`. C'est la **colonne vertébrale** de la campagne ; sérielle (un acte dépend de l'état laissé par le précédent).

### 7.2 Fixture seedée + garde-fou anti-dérive
- **Mettre à jour `create_test_copro_seeded` à la forme golden** (18 lots / base 10 000 / **6 clés réelles** (K1-K6 ; PAS de clé ALUR) / 10 copros, le pilote actuel est en base 1 000 / 7 lots). Création des lignes `repartition_key_lines` (1 ligne clé générale par lot + lignes subset sans `weight=0`).
- **Garde-fou anti-dérive `seed-vs-ui.spec.ts`** : assert que la copro **seedée ≈ la copro construite par l'UI** (mêmes lots, clés, poids, soldes initiaux). Empêche que le seed et le chemin UI divergent silencieusement.

### 7.3 Specs ciblées par domaine (hors golden)
- `ag-majorites-limites.spec.ts` — seuils art.25 (5 001), passerelle 25-1 (3 334), **résolution rejetée** sous le seuil.
- `ag-art26-unanimite.spec.ts` — double majorité art.26 (6 667 + ≥ 6 votants), unanimité, art.26-1.
- `finance-fifo-imputation.spec.ts` — FIFO cloisonné par nature, imputation ciblée, multi-nature défaut art.1342-10, trop-perçu → 450-3.
- `ged-crud.spec.ts` — CRUD documents (GED) : upload, versionnage, suppression, rattachement.
- `maintenance-os-contrats.spec.ts` — ordres de service, contrats de maintenance (chemin canonique `src/lib/maintenance/writes.ts`).
- `factures-fournisseur.spec.ts` — brouillon → validation → paiement → **avoir** → **`cancel_supplier_invoice`** (non encore testée).
- `corrections-contre-passation.spec.ts` — `reverse_ledger_transaction`, `reverse_payment`, `cancel_call_for_funds`.
- `alur-affectation.spec.ts` — `post_alur_transfer` (D105/C705) + `settle_alur_transfer_cash` (D512/C502).
- `etat-date.spec.ts` — variantes P1/P2/P3 (lot débiteur, créditeur, avec/sans ALUR).

### 7.4 Spec reprise mi-année — `reprise-mandat.spec.ts`
`set_opening_balance` (source `opening_onboarding`), résidu 471/472 non bloquant, post-as-you-go ; vérifie qu'une copro reprise en cours d'exercice arrive au même état que la golden from-scratch sur le périmètre repris.

---

## 8. Séquencement d'exécution & gouvernance

**Ordre d'exécution :**
1. **From-scratch d'abord** (`golden-from-scratch.spec.ts`) — la preuve maîtresse, déroulée intégralement.
2. **Puis reprise mi-année** (`reprise-mandat.spec.ts`) — valide le second chemin d'entrée des données.
3. **Puis « 1er janvier »** (passage 2026 → 2027 : clôture, à-nouveaux, affectation, non-régression inter-AG).
4. **En parallèle** (indépendantes) : les specs ciblées §7.3.

**Gouvernance (rappel impératif) :**
- **Claude applique les migrations via MCP Supabase**, avec **revue d'impact en cascade OBLIGATOIRE avant chaque migration** (sous-agent ciblé pour une migration simple, revue adversariale multi-agents pour un enjeu fort).
- Protocole par correctif : diagnostic → revue cascade → test `BEGIN/ROLLBACK` → apply → code-review → vérification (`audit_finance_integrity = 0`).
- **Bugs = zéro dette immédiate** : on corrige et on prouve l'absence de cascade (tester empiriquement, ex. `ON DELETE`), pas de backlog différé.
- Live cloud `qqfqrcolzmcbsvfaumiq` (≥ 0087) ; **vérifier `fn_annexe_* ≥ 0075`** avant tout test d'annexes/PDF.
- Tests adverses sur branche jetable via `create_test_copro_seeded` (claim service_role, `BEGIN/ROLLBACK`), préfixe `E2E-`, **pas de suppression auto**.

---

## 9. Risques connus / points à confirmer (open questions)

1. **[RÉSOLU 2026-06-22 / affiné audit 2026-06-28 — TRIMESTRIEL + tolérance ± 1 cent]** Cents par lot du courant non déterministes : **seul K1** (0,64375/tantième, lots dont le tantième n'est PAS multiple de 8) laisse un demi-cent résiduel placé selon l'ordre `lot_id` (**K5 eau = 1,25/m² EXACT → aucun résidu**, contrairement à une note antérieure). **Décision USER : garder l'échéancier trimestriel (réaliste).** Les specs asserteront les cents par lot **uniquement sur les lots à division propre** (A-101, A-201, B-RDC-1/2, B-101/102) + les **totaux et soldes par propriétaire** ; les **12 lots à résidu K1** (A-RDC-C1/C2, A-102, A-202, **A-301**, A-302, 4 caves, 2 parkings) **tolèrent ± 1 cent**. Totaux assertés exacts (T1 = 12 500 ; annuel = 50 000 ; grand total = 115 160). (verdict appels)
2. **[RÉSOLU 2026-06-28]** Impayé GL strict fin 2026 = **10 337,50** (Hugo A-201 7 892,50 + Thomas B-101 2 445). L'ancien « 10 207,50 / Hugo 6 907,50 / Thomas 3 300 » était **arithmétiquement impossible** (Thomas, Bât B sans travaux, a un dû total de 2 445 < 3 300). Hyp. tranchée USER : toiture (37 600) encaissée avant clôture par tous SAUF Hugo → §6.2 (6 337,50 hors toiture) + Hugo toiture 4 000 = 10 337,50. (verdict clôture)
3. **Cumul LEDGER CHECK corrigé à 219 157,50** (et non 218 157,50). Vérifier que la spec asserte la bonne valeur. (verdict clôture)
4. **[RÉSOLU 2026-06-28, option A]** État daté B-101 : base 2027 = 536,25/trim reconduit ; T1 2027 échu (entre en P1), T2 2027 NON échu (due_date figé > 15/04 → P3 = 536,25) ; budget 2026 plus `validated` (provisions non appelées = 0). **P1 450-1 = 2 681,25** (plus de double-compte du T2 ; Total P1 = 3 281,25). Le seed fige les `due_date`. (verdict état_daté)
5. **Garde « AGE + budget » non prouvée** (`validate_budget 0026:1047-1049` non vérifiable). À éprouver en `BEGIN/ROLLBACK`. (verdict ag_layout)
6. **`reverse_payment` sur appel en période approuvée** mute `amount_paid` de l'appel clos (GL préservé) → **arbitrage métier à confirmer**. (conventions, openOrphans)
7. **`cancel_supplier_invoice` non testée fonctionnellement** + gate front `canReverseSelected` non câblée → spec ciblée + câblage à décider. (conventions)
8. **`fn_annexe_*` / annexe 1 convocation** : confirmer le live ≥ 0075 et que le PDF de convocation n'est plus cassé avant tout envoi. (conventions, mémoire)
9. **Ventilation par nature du résiduel Hugo** dépend de l'ordre `id` intra-date — sans impact sur les totaux, mais à figer si la spec asserte le détail 450-1/450-2/450-5. (verdict encaissements)
10. **`rejectPeriod`/`approvePeriod` front en UPDATE nu** (valeurs `rejected`/`locked` mortes) → utiliser la RPC `approve_period` ; à corriger si la golden passe par l'écran d'approbation. (conventions)
