# PLAN_CORRECTION_VALIDE.md

> **Statut : DOCUMENT DE VALIDATION — LECTURE SEULE.**
> Ce document VALIDE et AFFINE le plan de correction d'audit CoProFlex après passage en **red-team** (chaque correctif jugé best / improve / replace ; les remplacements contre-vérifiés en base ; le séquencement et la complétude challengés).
> Il représente la **« meilleure solution » arbitrée**, prête à être implémentée — **RIEN n'est appliqué ici**. Aucune migration, aucun DDL, aucun UPDATE. On attend le **go de Lyes** avant toute écriture.
> Date : 2026-06-02. Boucle d'or de référence : copropriété `22222222` « Le Clos Saint-Michel », exercice 2026 ouvert. Témoin immuable : `11111111`.

---

## 1. Verdict global

Le plan d'audit est **solide et globalement la meilleure direction** (route canonique unique, partie double, immutabilité, idempotence, ventilation art.10, finance-first). Le red-team le **confirme sur les fondations** mais impose **une correction d'ordre bloquante**, **deux durcissements de faisabilité**, et **plusieurs gaps à tester avant d'écrire la moindre ligne**.

### 1.1 Synthèse chiffrée des correctifs

Sur les **34 items** des 9 chapitres :

| Verdict red-team | Nombre | Signification |
|---|---:|---|
| **[INCHANGÉ]** — best confirmé « meilleure solution » | 16 | Aucun changement, souvent un test de non-régression à ajouter |
| **[AMÉLIORÉ]** — improve (cible juste, moyen à durcir) | 13 | Correctif conservé mais resserré (source unique, defense-in-depth, périmètre) |
| **[REMPLACÉ]** — replace (moyen technique faux) | 5 | Correctif d'origine inopérant/contre-productif → solution de remplacement, toutes contre-vérifiées |

Les **5 remplacements** ont tous été contre-vérifiés en base. Verdict de contre-vérification : **les 5 confirment que le remplacement est meilleur que l'origine**, mais **4 sur 5 aboutissent à un HYBRIDE** (la thèse du remplacement + un mécanisme plus simple que celui proposé par le challenger). Aucun remplacement « pur ».

### 1.2 Corrections de séquencement

| # | Correction | Gravité |
|---|---|---|
| **S1** | **Inverser 4.1 et 4.2.** L'à-nouveau (`open_next_period`, 4.2) **alimente** le compte 120 ; l'affectation (`regularize_period`, 4.1) le **vide** vers les 450. Le plan affirmait l'inverse. **4.1 dépend de 4.2.** | **BLOQUANT** |
| **S2** | **Ajouter en tête de V4 l'orchestration manquante** : `open_next_period` n'est appelé **nulle part** dans `activate_ag_decisions/APPROVE_ACCOUNTS` (seul `regularize_period` y est câblé, et c'est un stub vide). Sans ce câblage, ni 4.1 ni 4.2 ne se déclenchent. | **BLOQUANT** |
| **S3** | **Retirer la fausse dépendance 3.1 → 1.4/1.5.** `allocate_payment` travaille sur `call_for_funds_lines`, pas sur les comptes 450. 3.1 est parallélisable à V1. | Calibrage |
| **S4** | **1.5 reclassé** en nettoyage de données seed (risque faible), pas correction de RPC (les routes résolvent déjà 450-1). Garder 1.5 avant 1.4. | Calibrage |
| **S5** | **2.3 déjà partiellement fait** : la surcharge `post_budget_call_for_funds` 10-args **existe déjà** en base → 2.3 = brancher le front, pas créer la RPC. | Calibrage |

### 1.3 Gaps ajoutés (findings/interactions manqués par l'audit)

| # | Gap | Gravité |
|---|---|---|
| **G1** | **DOUBLE COMPTAGE du résultat** entre `regularize_period` (V4.1) et `open_next_period` (V4.2). `regularize_period` **est déjà câblé** dans `activate_ag_decisions` (contrairement à ce qu'affirme l'audit) ; `open_next_period` **recalcule** net(6/7) et le reposte sur 120. Résultat compté deux fois. | **BLOQUANT** |
| **G2** | **Re-imputation 450→450-1 (1.5) techniquement IMPOSSIBLE par UPDATE** : `is_ledger_regen_exempt` n'exempte que `opening_balance`/`closing`. Les tx visées sont `call_for_funds`/`payment` → bloquées par les triggers d'immutabilité. | Majeur |
| **G3** | **Le RELEVÉ DE COMPTE légal diverge du GL** de −423 à +30 € par copropriétaire (boucle d'or). `v_owner_statement_lines` est construit hors-GL. Document légal (art.35 décret 67-223), jamais testé, **destiné à empirer** avec les écritures GL de V4. | Majeur |
| **G4** | **FIFO par nature (3.1) inopérant sur les appels `budget_id=NULL`** produits par `generate_combined`. Dépend **strictement** de V2 (disparition de ces appels), pas seulement de « 450-x propres ». | Majeur |
| **G5** | **Couplage cross-compte 2025/2026** : 2025 vit sur le chapeau 450, 2026 sur 450-1. Rendre 450 non-imputable (1.4) avant de reprendre 2025 fait **échouer l'à-nouveau**. Ordre imposé : 1.5 → 1.4 → à-nouveau. | Majeur |
| **G6** | **Réconciliation des paiements déjà imputés sur appels hors-GL** (V2) : des `payment_allocations` pointent vers des appels `budget_id=NULL` jamais passés au GL. Supprimer/régénérer orphelinise les allocations. | Majeur |
| **G7** | **Persistance front incomplète** : `persistResolutionResult` n'écrit que `is_approved`/`status`, jamais `threshold_*`/`tantiemes_*`/`voters_*` → la future vue opposants (5.3) lira des champs périmés. Interaction V5.1↔V5.3 plus profonde que « corriger le calcul ». | Majeur |
| **G8** | **Chiffre clé faux** : résultat 2025 = **−755 €** déficit (charges 601 = 890, produits 701 = 135), **pas 655 €**. Tout raisonnement d'affectation basé sur 655 est erroné. | À corriger |
| **G9** | Domaine **facture fournisseur** (modèle canonique #8) non audité : 1 seule facture, TVA NULL, pas de multi-poste ni de test du rejet brouillon. « Pas de finding » ≠ « conforme prouvé ». | Mineur |
| **G10** | Bugs d'affichage front AG secondaires : `pourcentagePour` calculé sur un dénominateur incluant les non-votants ; 2 budgets ALUR sous le plancher 5% (pas un seul). | Mineur |

---

## 2. Correctifs revus chapitre par chapitre

> Seuls les items **non-best** sont détaillés. Les items best confirmés sont listés en fin de chaque chapitre avec leur test de non-régression. Marquage : **[INCHANGÉ]** / **[AMÉLIORÉ]** / **[REMPLACÉ]**.

### Chapitre 1 — AG : majorités & calcul des votes

**Verdict chapitre :** diagnostic solide, mais le tableau d'origine présente « corriger le JS » **OU** « basculer sur la RPC » comme équivalents — ce qui contredit la source unique (canon #1) et la règle d'hygiène #9. **La cible n'est pas ambiguë : RPC = autorité, JS = preview non-faisant-foi.**

- **Item 1.1 — Source unique du calcul de majorité** — **[AMÉLIORÉ]** (confiance : moyenne)
  - *Origine :* corriger le JS **OU** basculer sur la RPC (présentés en « OU »).
  - *Retenu :* **hiérarchie ferme, pas de « OU ».** (A) **Couper la persistance du verdict côté JS** : retirer `is_approved`/`status` de `persistResolutionResult` — le front ne persiste que les votes bruts dans `ag_votes`. (B) **Autorité = back** : `finalize_and_activate_ag` (déjà déployé) recalcule via `calculate_resolution_result` sur l'ensemble complet des votes avant `prepare/activate`. (C) **PV** : ne rien notifier avant `finalize_and_activate_ag` (vrai risque art.42). (E) **Verrou defense-in-depth** : CONSTRAINT TRIGGER interdisant d'écrire `ag_resolutions.is_approved/status` hors `calculate_resolution_result`.
  - *Raison :* le mécanisme proposé par le challenger (persister votes → appeler la RPC → relire, **par résolution en séance**) est de la sur-ingénierie + un aléa d'ordre (le live tourne sur localStorage, votes `_dup_` et échecs `castVote` sautés). La chaîne **finance est déjà protégée** (`prepare_ag_decisions` filtre `is_approved=true` **après** recompute back) → le vrai rayon de blast est la **fenêtre PV**. D'où l'hybride : thèse du remplacement, mécanisme allégé.

- **Item 1.2 — Art.24 front (abstention au dénominateur)** — **[AMÉLIORÉ]** (confiance : haute)
  - *Origine :* `adopted = pour > contre` (JS seul).
  - *Retenu :* **HYBRIDE.** (1) **Autorité en base** via la RPC (remplit aussi `tantiemes_*`, `voters_*`, `threshold`, `voted_at` que le patch JS laissait périmés). (2) **Preview live honnête** : corriger `checkMajority` ART_24/ART_25_1 en `pour > contre` (`Session/utils.ts` l.51, l.84) ET le jumeau `handleValidateSecondVote` (`useSessionVoting.ts` l.198, même bug `pour > voixExprimees/2`) — pour que preview, projector et export CSV affichent la même valeur que la RPC. (3) **Contrainte d'ordre** : recalcul **avant** tout flip de statut, en passant par la RPC `cast_vote` (pas `castVoteDirect` qui contourne les gardes).
  - *Raison :* le patch JS seul est **insuffisant** (laisse les colonnes dérivées périmées → 2e incohérence PV/annexes). La RPC route vers du code déjà juste. Les deux pièces sont nécessaires.
  - *Contre-vérification :* remplacement meilleur confirmé (high) ; ni audit-seul ni remplacement-pur ne suffisent → hybride.

- **Item 1.3 — Doc business-rules.md art.24** — **[AMÉLIORÉ]** (confiance : haute)
  - *Retenu :* MAJ doc + enrichir : « exprimées = for + against (hors abstention/défaillant), correspondance incluse ». **Ne PAS écrire de formule de seuil** dans la doc métier (éviter un 2e modèle) ; pointer `calculate_resolution_result` comme référence unique.

- **Item 1.4 — `compute_majority_threshold` non aligné art.24** — **[AMÉLIORÉ]** (confiance : haute)
  - *Origine :* aligner art24/ELSE sur `FLOOR((for+against)/2)+1`, OU documenter comme indicatif.
  - *Retenu :* **trancher pour la 2e branche.** La 1re est **techniquement infaisable** : la signature ne reçoit pas for/against (seulement `present_tantiemes`). Faire de `compute_majority_threshold` une fonction **purement indicative** (seuils 25/26/unanimité), lui **retirer** toute prétention art.24 (renvoyer NULL + description pour art24/art25_1, l'art.24 n'a pas de seuil fixe). Commentaire SQL : décision art.24 vit dans `calculate_resolution_result`.

**Items best [INCHANGÉ] :** Art.24 back conforme (ajouter en test de non-régression le contre-exemple `for=40/against=30/abst=40`) ; Art.26 double majorité (corriger libellé + vérifier ART_26_1) ; Art.25-1 passerelle (back RAS, **front ART_25_1 à corriger avec l'art.24**) ; Art.25 majorité absolue.

### Chapitre 2 — AG : pouvoirs, correspondance, opposants, quorum

- **Item 2.1 — Plafond pouvoirs (count>=3, exception 10% absente)** — **[AMÉLIORÉ]**
  - *Retenu :* fix audit (autoriser si tantièmes mandataire + Σ mandants + nouveau ≤ 0,10 × total) **+ 3 précisions** : (a) `total_syndicat` = `SUM(lots.tantiemes_generaux)` (pas `copros.total_tantiemes` qui peut être NULL) ; (b) front = **avertissement non bloquant** consommant le verdict RPC (retirer `MAX_POUVOIRS_PAR_MANDATAIRE=3` du front, sinon 2 patterns) ; (c) message d'erreur RPC distinguant « plafond 3 ET >10% » de « mandant déjà représenté ».

- **Item 2.2 — Vote correspondance sur résolution amendée non requalifié (art.17-1 A)** — **[AMÉLIORÉ]**
  - *Retenu :* **réutiliser le mécanisme existant**, ne pas inventer une neutralisation parallèle. (a) colonne `amended_in_session` bool sur `ag_resolutions` (distincte de `is_customized`) ; (b) `UPDATE ag_votes SET is_excluded=true, exclusion_reason='art_17_1_A_amended' WHERE resolution_id=? AND vote_source='correspondence'` (réutilise l'invariant déjà filtré par `calculate_resolution_result`) ; (c) **restaurer le breakdown `by_source`** régressé par `20260531160000`/`20260125184422` (sans lui, impossible de savoir quels votes sont correspondance) ; (d) requalification **automatique** au passage `amended_in_session=true` + re-déclencher `calculate_resolution_result` ; (e) le défaillant requalifié alimente la liste défaillants du PV (item 2.3).

- **Item 2.3 — Opposants non identifiés nominativement au PV (art.42)** — **[AMÉLIORÉ]**
  - *Retenu :* vue `v_ag_opposants` dérivée + **4 compléments** : (1) inversion sur `is_approved` **FINAL** (post-passerelle), pas le résultat intermédiaire ; (2) défaillants = (convoqués) MINUS (présents ∪ représentés ∪ correspondance valable) ; à défaut, copropriétaire actif (`lot_owners end_date IS NULL`) sans ligne `ag_attendance` ; (3) inclure les correspondance requalifiés défaillants (2.2) ; (4) **abstentionnistes en rubrique séparée** (l'abstention n'ouvre PAS le recours art.42). Réutiliser `v_ag_votes_detailed` (gestion `is_company`).

**Items best [INCHANGÉ] :** Quorum fictif sur le PV — **best confirmé**, à durcir : retirer `is_quorum_reached` de `compute_ag_quorum`, peupler `ag_attendance.tantiemes/lot_ids` **à la source**, un seul « taux de participation » côté RPC. Art.24 back conforme (dette `compute_majority_threshold` = item 1.4).

### Chapitre 3 — Charges & répartition

> **Le chapitre le plus solide.** Aucun item à remplacer : la route de référence (`generate_calls_from_ag_payload → post_budget_call_for_funds` avec installments) **existe déjà**, GL-correcte.

- **Item 3.1 (ch.3) — Écart +0,16 € figé pré-cr8** — **[AMÉLIORÉ]**
  - *Retenu :* **ne corriger que le CODE**, pas l'historique. (1) NE PAS régénérer T1 payé/T2 partiel (immutabilité GL, lettrage). (2) **Ne rien régulariser** sur l'historique (0,16 € n'est pas une créance réelle) ; garantir 0 écart sur les **futurs** appels. Conforme au constat « donnée seed figée ≠ défaut du code ».

- **Item 3.2 (ch.3) — 4 implémentations de ventilation concurrentes (dont DISABLE TRIGGER)** — **[AMÉLIORÉ]**
  - *Retenu :* **réduire à UNE primitive partagée.** Extraire le bloc de télescopage cumulatif de `post_budget_call_for_funds` en fonction interne (`ventilate_amount_by_key(key_id, target_amount)`) ; faire appeler `post_call_for_funds` dessus avec `total_amount = montant demandé exact` (delta absorbé par le télescopage cumulatif, **pas** par le « dernier lot »). Aligner la preview front (`useCreateCallWizard` L148-170) sur la même formule. Le DISABLE TRIGGER disparaît mécaniquement avec la suppression de `generate_combined` (ch.9 item 2.2).

- **Item 3.3 (ch.3) — Détection Σappels ≠ budget voté absente** — **[AMÉLIORÉ]**
  - *Retenu :* vue `v_call_vs_budget_mismatch` + 3 précisions : (1) borner par `budget_id` ET `period_id` ; (2) ne comparer que les appels rattachés au budget (`cf.budget_id`), pas toutes natures ; (3) **ne pas relever le seuil 0,01** pour cacher les arrondis — après correction cr8 la vue doit retomber à 0 (sinon on masque le symptôme).

**Items best [INCHANGÉ] :** ventilation par lot conforme ; `repartition_key_is_complete` ; `weight_snapshot` figé.

### Chapitre 4 — Grand livre (partie double)

- **Item 4.1 (ch.4 / 1.5) — Chapeau 450 porte 7 écritures POSTED** — **[REMPLACÉ]** (contre-vérif : high)
  - *Origine :* re-imputer les 3 tx vers 450-1 par **UPDATE** ; auditer les RPC qui ciblent le chapeau ; élargir `enforce_lot_id_on_45x` à `LIKE '45%'`.
  - *Diagnostic faux :* les 7 lignes ont `created_by/posted_by` NULL + même `created_at` = **artefact de seed**, pas défaut du code. **Aucune fonction ne contient le littéral '450'** ; `resolve_lot_tiers_account` ne renvoie que 450-1..5. « Auditer les RPC » = chasse au fantôme.
  - *Retenu (HYBRIDE) :* (1) **reclasser en artefact de seed.** (2) **NE PAS faire d'UPDATE** des 3 tx postées (bloqué par `trg_ledger_entry_immutable`/`trg_ledger_tx_immutable`) ; assainir le solde, si voulu, par une **écriture de reclassement datée** via `create_ledger_transaction`, jamais UPDATE en place. (3) **Neutraliser uniquement la draft `81d0f732`** (seul écrit modifiable). (4) **Verrou dans le bon ordre** : (a) **D'ABORD** provisionner 450-1..5 sur les 3 copros à compte plat (`075c0249`, `2e341146`, `fd415d71`, où 450 est l'unique tiers, `is_system=FALSE`) ; (b) **ENSUITE** poser une garde « compte interdit au posting » via **colonne explicite `accounts.is_postable`** + CONSTRAINT TRIGGER ; (c) **NE PAS** élargir `enforce_lot_id_on_45x` à `LIKE '45%'` (n'attrape pas l'imputation sur le chapeau et casse les 3 copros plates).
  - *Raison :* l'UPDATE est inapplicable (immutabilité) et le « non-terminal via parent_id » est sans base (`nb_children=0` partout). On écarte l'option « re-seed » du challenger sur la base vivante (détruirait l'exo 2026 ouvert).

- **Item 4.2 (ch.4) — Écriture posted sans source_id (pièce art.6)** — **[REMPLACÉ]** (contre-vérif : high)
  - *Origine :* CHECK `source_type='pièce' ⇒ source_id NOT NULL`.
  - *Diagnostic faux :* **aucun `source_type='pièce'` n'existe** (valeurs réelles : `call_for_funds`, `payment`, `supplier_invoice`…). Le CHECK serait un **no-op** qui ne se déclenche jamais. Le code RPC actuel **passe déjà** `source_id` (conforme).
  - *Retenu (HYBRIDE) :* (1) **RE-SEED** (pas UPDATE) des **28 tx** posted sans source_id (20 `call_for_funds` + 8 `payment`, réparties sur 5 copros — chiffre audit « 5 tx » largement sous-estimé) ; 14 reconstructibles via `table.ledger_tx_id`, ~14 **orphelines** à recréer. (2) **Après seed propre seulement** : CHECK à **énumération positive** — `source_type IN ('call_for_funds','payment','supplier_invoice','supplier_payment','budget_expense') ⇒ source_id NOT NULL`, en NOT VALID puis VALIDATE. (3) **Durcissement (a)** : ne pas exempter `'manual'` par simple silence (OD métier devrait porter une pièce art.6) ; nettoyer d'abord les `manual` de test. (4) **Durcissement (b)** : auditer/recréer les ~14 orphelines avant VALIDATE. **Le code RPC n'a pas à être modifié.**

- **Item 4.3 (ch.4) — Équilibre garanti seulement par les RPC** — **[AMÉLIORÉ]**
  - *Retenu :* **trancher pour le CONSTRAINT TRIGGER** (pas « RPC seules »). Câblage sur le passage `status→'posted'` de `ledger_transactions` (AFTER UPDATE), **DEFERRABLE INITIALLY DEFERRED** comme `trg_validate_call_total`/`trg_validate_invoice_total`, tolérance 0,01, réutilisant `check_transaction_balance()` (déjà STABLE).

**Item best [INCHANGÉ] :** Draft seed `81d0f732` à purger — best, mais **via correction du seed** (pas DELETE ponctuel) ; vérifier qu'aucun test front ne pointe sur cet id.

### Chapitre 5 — Appels / paiements / FIFO / cut-off / surallocation

- **Item 5.1 (ch.5) — Boucle « multiple » non atomique** — **[REMPLACÉ]** (contre-vérif : high)
  - *Origine :* router sur `post_budget_call_for_funds(p_installment_index/count)`.
  - *Diagnostic faux :* le wizard appelle `createCall → post_call_for_funds` (mono-clé, `p_repartition_key_id` + `p_total_amount`). `post_budget_call_for_funds` ne prend **ni** clé **ni** total saisi → router dessus **perd la clé/total** (régression). De plus c'est `post_call_for_funds` qui fait l'arrondi **naïf** (le RPC nommé n'est même pas celui à corriger).
  - *Retenu (HYBRIDE durci) :* (1) **RPC dédiée** `post_call_for_funds_installments(... p_installments jsonb)` créant les N appels + N écritures GL dans **UNE transaction** (rollback global) ; la boucle JS devient un seul appel. (2) **Corriger l'arrondi en même temps** (télescopage à 2 niveaux : découpage en échéances `round(total*k/n)-round(total*(k-1)/n)` + ventilation inter-lots télescopée) — idéalement via le helper SQL commun (dette ch.3). (3) **Defense-in-depth** : répliquer côté serveur la validation `Σ échéances = total` (`isStep3Valid`). (4) Nettoyer `echeancier.ts`. **NE PAS** router le wizard sur `post_budget_call_for_funds(installment)`. **Séquencer après V2.**

- **Item 5.2 (ch.5) — FIFO cloisonné par nature absent** — **[AMÉLIORÉ]**
  - *Origine :* paramètre `p_nature` dans `allocate_payment`, OU FIFO indépendant par nature.
  - *Retenu :* **FIFO indépendant par nature** (la variante `p_nature` est **inopérante** : `post_owner_payment` appelle `allocate_payment` une fois sans nature, `PaymentModal` n'envoie jamais `call_line_ids`). Dans `allocate_payment` : JOIN `call_for_funds_lines→call_for_funds→budgets`, `ORDER BY COALESCE(budget_type,'current'), cf.issue_date, cf.id`, **reste à allouer consommé séparément par nature**. Aucun param ni changement d'appelant. Garder `p_call_line_ids` comme override manuel (art.1342-10). **Spécifier** : reliquat après la nature visée → 450-3 (avance), **jamais** éteindre une autre nature ; appliquer **aux nouveaux paiements seulement** (boucle d'or immuable). **Dépend de G4** (V2 d'abord, sinon `budget_id=NULL` non classable).

- **Item 5.7 (ch.5) — Idempotence : 2 surcharges `post_owner_payment`** — **[AMÉLIORÉ]**
  - *Retenu :* (1) **DROP de la surcharge 8 args** (sans `idempotency_key`) une fois confirmé qu'aucun chemin edge/front ne l'appelle (grep préalable) ; (2) **ensuite seulement** rendre `idempotency_key` NOT NULL. L'option NOT NULL seule ne suffit pas tant que la surcharge legacy existe.

**Items best [INCHANGÉ] :** trop-perçu→450-3 (**tester** un paiement > dû, branche jamais exercée) ; FIFO par lot (RAS) ; cut-off période ouverte (**tester** paiement N+1 soldant appel N) ; surallocation (exemplaire, à généraliser).

### Chapitre 6 — Fonds travaux ALUR

- **Item 6.F1 — Solde ALUR fantôme (vue sur budget_lines 665 € au lieu du GL 105)** — **[AMÉLIORÉ]**
  - *Retenu :* (a) version unique « solde comptabilisé = solde GL du 105 » (**pas** de double affichage budgété/comptabilisé qui réintroduit `budget_lines`) ; (b) **router l'ALUR par le générateur canonique** (`generate_calls_from_ag_payload → post_budget_call_for_funds` avec `budget_type='alur'`) pour que l'émission produise D450-5/C105 ; (c) corriger `create_alur_fund_from_ag` pour qu'il ne porte plus la ligne budgétaire sur 105 (equity). **Séquencer après V2.** Vérifier que `open_next_period` reporte bien le 105 en à-nouveau (intangibilité réserve).

- **Item 6.F2 — Plancher 5% non contrôlé** — **[AMÉLIORÉ]**
  - *Retenu :* **3 couches** au lieu d'un flag applicatif. (1) front = avertissement non bloquant pré-remplissant 5% ; (2) colonne `budgets.alur_exemption_reason` (enum `immeuble_neuf`|`dtg_sans_travaux`|`petite_copro`, horodatée + AG de référence) ; (3) **CONSTRAINT TRIGGER** sur budgets/budget_lines (modèle `trg_validate_call_total`) : si cotisation < 5% du budget courant de la même période ET exemption NULL → RAISE. **Correction légale** : exonération immeuble neuf = **10 ans** (garantie de parfait achèvement), pas « <5 ans ». Dénominateur = 5% du **budget prévisionnel courant 701**, pas du total appels ni du budget ALUR.

- **Item 6.F3 — Affectation 105→705 inexistante** — **[AMÉLIORÉ]**
  - *Retenu :* RPC `post_alur_transfer` qui (1) **vérifie un budget/dépense travaux voté rattaché** (`resolution_ag_id` **obligatoire**) — l'art.14-2 II restreint l'emploi du fonds aux travaux ; (2) **vérifie solde 105 ≥ montant** (garde solde ≥ 0) ; (3) poste D105/C705 via `create_ledger_transaction` (sans lot_id, comptes collectifs) ; (4) INSERT `alur_transfers` en traçage. **Retirer/conditionner la destination `compte_courant` libre** (détournement d'affectation). Garde base : interdire `alur_transfers` si Σtransfers > solde 105. Cut-off : affectation 105→705 et charge travaux sur le **même exercice**. Retirer le `.insert` direct dans `useALURData.ts:285`.

- **Item 6.F4 — `create_alur_fund_from_ag` (table `fiscal_periods` inexistante + WHEN OTHERS)** — **[AMÉLIORÉ]**
  - *Retenu :* **minimum** = rename `fiscal_periods→accounting_periods`, `is_active→status='open'`, remplacer `EXCEPTION WHEN OTHERS` par une remontée typée (RAISE/re-RAISE avec SQLSTATE — `finalisation.api.ts` ne teste que le transport, faux succès silencieux possible). **Au-delà** (V3, après V2) : aligner sur le chemin canonique AG→budget (ne plus pré-marquer `activated`, ne plus porter la ligne sur 105, laisser `activate_ag_decisions` émettre l'appel). Le rename = palier 0.4 non bloquant ; la refonte du rôle = V3.

### Chapitre 7 — Mutations / état daté

- **Item 7.6.3 — Répartition sur CURRENT_DATE + « transfert de solde 450 vendeur→acquéreur »** — **[REMPLACÉ]** (contre-vérif : high)
  - *Origine :* borner sur `issue_date <= signature_date` ; **écriture de transfert 450 vendeur→acquéreur**.
  - *Diagnostic faux :* `ledger_entries` **n'a aucune dimension propriétaire** — le solde est porté par `(450-1, lot_id)` et **suit le lot**. Le « transfert » est soit un no-op, soit force un compte par propriétaire (**proscrit** par canon #2). Le mécanisme de figement existe déjà (`validate_mutation` fait `end_date` vendeur + INSERT acquéreur même lot ; les vues filtrent `end_date IS NULL`).
  - *Retenu (HYBRIDE) :* (1) **borner sur `signature_date`** (date de cession, pas CURRENT_DATE) **par NATURE** : budget prévisionnel art.14-1 sur `issue_date<=signature_date` ; **travaux art.14-2 sur la date d'appel** ; **ALUR non réparti** (acquis au syndicat). (2) **Ne PAS transférer de solde** : figer le vendeur, rattacher les écritures futures au nouvel owner via le `lot_id` inchangé. (3) Remplacer `EXCEPTION WHEN OTHERS` par RAISE typé (rollback) dans `validate_mutation` ET `create_etat_date_snapshot`. (4) **Idempotence** : refuser une 2e validation si `status='validated'`. (5) Écriture D/C 450-1/461 = **option documentée réservée** au cas solidarité art.20 / reprise expresse, **jamais** le défaut (régularisation du prix = ressort du notaire).

- **Item 7.6.1 — Quote-part ALUR à l'état daté toujours = 0** — **[AMÉLIORÉ]**
  - *Retenu :* **ne pas recoder le prorata** — la vue `v_alur_lot_contributions` le calcule **déjà** (avec `total_tantiemes` recalculé par SUM). (a) **D'abord** corriger la source ALUR (6.F1) ; (b) lire la quote-part via la vue existante (JOIN `lot_id`), pas un calcul tantièmes inline (sinon 2 patterns) ; (c) **présenter en PARTIE III** (sommes incombant à l'acquéreur), mention « quote-part acquise au syndicat, non remboursable au vendeur (art.14-2 II) ». **Dépendance d'ordre forte sur 6.F1.**

- **Item 7.6.2 — État daté non conforme au modèle 3 volets (arrêté 13/12/2019)** — **[AMÉLIORÉ]**
  - *Retenu :* **payload SQL v2.0 = SEULE source.** (1) réécrire `generate_etat_date_payload` en version '2.0' (partie1/2/3 + annexe), alimenter **réellement** chaque poste depuis le GL (provisions 701/450-1, travaux 450-5/702, arriérés solde 450, ALUR via la vue, emprunts/travaux votés via tables AG) ; (2) **trancher UN seul moteur PDF** (edge consomme v2.0 **ou** front depuis payload — pas deux `generateEtatDatePDF`) ; (3) une fois en '2.0', `isPayloadV2` rebascule et le viewer V2 redevient vivant (ne pas réécrire le front, **l'alimenter**) ; (4) corriger le param fantôme `p_user_id` ; (5) **tranche verticale** : 1 poste de bout en bout avant de généraliser. Gérer les **deux versions en lecture** (snapshots historiques v1.0 immuables).

**Items best [INCHANGÉ] :** historique `lot_owners` append-only (option trigger BEFORE DELETE en V1, prévoir exemption RGPD) ; état daté figé + accès vendeur coupé (poser **vraie RLS** + immuabilité `payload` le jour du portail).

### Chapitre 8 — Clôture / à-nouveau / affectation + 5 annexes

> **Erreur de fond de l'audit :** c'est `open_next_period` (à-nouveau) qui **alimente** le 120 en soldant 6/7, pas l'inverse. L'ordre intra-vague 4 est inversé.

- **Item 8 — Ordre intra-vague 4 : affectation (4.1) AVANT à-nouveau (4.2)** — **[REMPLACÉ]** (contre-vérif : high)
  - *Origine :* « approbation → affectation 4.1 → à-nouveau 4.2 ; inverser produirait un bilan d'ouverture incohérent ».
  - *Diagnostic faux :* le 120 est **vide** tant que `open_next_period` n'a pas tourné. Affecter avant l'à-nouveau lit un 120 vide → affectation à zéro. **`open_next_period` est ABSENT du flux** (à ajouter), pas mal-ordonné.
  - *Retenu (HYBRIDE) :* séquence dans `activate_ag_decisions/APPROVE_ACCOUNTS` : `close_period(N)` → **`open_next_period(N)`** (poste 6/7→120 + report 1/4/5, déjà codé, jamais appelé) → `approve_period(N)` (fige la reprise) → **`regularize_period`** (à implémenter : lit le 120 figé, ventile 120/110→450 par quote-part **datée à l'AG N+1**, remboursement en option via 512) → annexes. **REJETER** la « fusion de l'affectation dans `open_next_period` » du challenger (casserait la datation AG, le vote, l'idempotence). Résultat 2025 à tester = **−755 €** (pas 655, cf. G8).

- **Item 8.4.1 — `regularize_period` est un stub vide** — **[AMÉLIORÉ]**
  - *Retenu :* implémenter + 3 compléments : (a) **paramètre date d'AG** (ou le lire depuis l'AG liée) pour dater l'écriture ; (b) ventiler **120 (clé courante) ET 110 (clé travaux)** séparément ; (c) **idempotence** (`source_type='result_allocation'` + `source_id=period_id`). **Dépend impérativement de l'à-nouveau (S1/S2).** Voir G1 (double comptage).

- **Item 8.4.2 — À-nouveau jamais exécuté (gap d'orchestration)** — **[AMÉLIORÉ]**
  - *Retenu :* enchaîner `open_next_period` **après** `approve_period`, **avant** `regularize_period`. Atomicité : échec `open_next_period` → rollback de `approve_period` (RAISE, pattern `finalize_and_activate_ag`). **Conflit de statut à documenter** : `open_next_period` refuse de re-tourner si N `approved` ET tx d'à-nouveau existe → OK au 1er passage, ré-exécution gelée.

- **Item 8.4.3 — Annexe 1 déséquilibrée** — **[AMÉLIORÉ]**
  - *Retenu :* corriger le **double-comptage trésorerie** (ne compter 50/51 qu'une fois, en actif) ; **AJOUTER le 110** au filtre provisions/capitaux (le 120 est **déjà capté** par `LIKE '12%'` — affirmation audit « 120 absent » **inexacte**, c'est le **110** le vrai oubli) ; **bandeau d'avertissement** « résultat non encore affecté » plutôt qu'un blocage `open_next_period` obligatoire (l'annexe N doit être consultable avant l'AG).

**Items best [INCHANGÉ] :** Annexe 5 colonne D (taper sur 702 pas 12x, borner period_id — **corréler au budget travaux** pour pluriannuel) ; `fn_annexe_2` (bug infirmé, test de non-régression) ; les 5 annexes existent (**réserve : auditer le rendu PDF réglementaire**, cf. G9).

### Chapitre 9 — Propagation AG → budget → appels

> **L'audit sous-estime l'ampleur de la fourche :** ce ne sont pas deux générateurs d'appels, mais **deux flux de finalisation complets** (wizard `create_budget_from_ag` + `generate_combined` hors-GL VS chaîne canonique `activate_ag_decisions → generate_calls_from_ag_payload → post_budget_call_for_funds`).

- **Item 9.2.1 — Double générateur actif** — **[REMPLACÉ]** → contre-vérif : **`replacement_better=false`**, l'origine reste la bonne ossature, mais HYBRIDE final (confiance : haute)
  - *Origine (audit) :* retirer l'appel front + router 100% canonique. **Confirmé juste.**
  - *Remplacement proposé (challenger) :* garder le wizard et le rebrancher. **Rejeté** : repose sur deux affirmations fausses — `create_budget_from_ag` n'« crée pas systématiquement un 2e budget » (contrainte UNIQUE + garde « Budget déjà créé » → il **échoue**, course d'ordonnancement, pas double-budget) ; « CREATE_BUDGET flippe sans lignes → 0 appel » est trop large (WP2 réutilise le budget **avec** ses lignes). Le garder = **3e chemin** de création de budget (anti-règle #9).
  - *Retenu (HYBRIDE) :* (A) **garder le fix audit** : retirer l'appel `BlocAppelsFonds → generate_combined`, router 100% canonique. (B) **Résoudre la fourche budget SANS la version du challenger** : l'édition des postes (BlocBudget) écrit les lignes dans **le budget unique** que `prepare_ag_decisions` réutilise/tague (`draft_from_ag`, `source_ag_id`), **au lieu** d'appeler `create_budget_from_ag` (qui recrée version+1 et entre en collision avec la garde d'unicité). (C) **Point valable du challenger conservé** : persister le choix 1/2/4 appels dans `payload->>'modalites_paiement_budget'` de `SCHEDULE_BUDGET_PAYMENTS` (vérifié : payload `'{}'` sur AG `24d3a499` → retombe sur `'trimestriel'`). (D) Filets V1 d'abord. (E) **Test E2E sur copro jetable** (pas la boucle d'or).

- **Item 9.2.3 — Boucle multiple atomique** — **[AMÉLIORÉ]** (lié S5)
  - *Retenu :* **ne pas créer de 5e route.** Router le wizard vers `generate_calls_from_ag_payload` (qui boucle déjà `1..v_nb_appels` en appelant `post_budget_call_for_funds(v_i, v_nb_appels)` avec RAISE → rollback atomique) : l'atomicité est obtenue **gratuitement** si 2.1 est bien fait. La surcharge 10-args existe déjà → câbler le front.

**Items best [INCHANGÉ] :** déprécier `generate_combined` + son DISABLE TRIGGER (**+ purger les 6 drafts orphelins**, cf. G6) ; UNIQUE INDEX `ag_pending_actions(ag_id, resolution_id)` (resolution_id sans NULL ni doublon) ; retirer `echeancier.ts` ; vue `v_call_vs_budget_mismatch` (ignorer arrondis purs).

---

## 3. Séquencement VALIDÉ

### 3.1 Graphe V0→V6 corrigé

```
V0  FILETS & PREVIEW HONNÊTE (non bloquants, parallélisables)
    ├─ 0.1  UNIQUE INDEX ag_pending_actions(ag_id, resolution_id)        [best]
    ├─ 0.2  vue v_call_vs_budget_mismatch → v_finance_integrity_issues   [improve]
    ├─ 0.3  preview JS honnête : checkMajority/handleValidateSecondVote   [improve]  (interim de 1.x)
    ├─ 0.4  rename create_alur_fund_from_ag + RAISE typé (WHEN OTHERS)    [improve]
    ├─ 0.5  vue v_lot_vs_gl_mismatch (G3, grain LOT) + tests non-régression [GAP G3]
    └─ 0.6  (UI, DIFFÉRÉ) page /finance/diagnostic affichant v_finance_integrity_issues  [ajout Lyes 2026-06-02]
            → les filets V0 fonctionnent déjà côté base ; cette page les rend visibles au gestionnaire.
                                                                          
V1  GRAND LIVRE PROPRE (cause → verrou)        ┌── parallélisable : 3.1 (FIFO) NE dépend PAS de V1 (S3)
    ├─ 1.5  reclasser chapeau 450 = artefact seed ; neutraliser draft 81d0f732 ;
    │        provisionner 450-1..5 sur 3 copros plates                   [REPLACÉ→hybride]  (PAS d'UPDATE de tx postée, G2)
    ├─ 1.4  colonne accounts.is_postable + CONSTRAINT TRIGGER            [REPLACÉ→hybride]  (APRÈS 1.5, G5)
    ├─ 4.2b CONSTRAINT TRIGGER équilibre Σdébit=Σcrédit                  [improve]
    └─ 4.x  re-seed des 28 tx sans source_id PUIS CHECK source_id        [REPLACÉ→hybride]
                                                                          
V2  CLÉ DE VOÛTE — ROUTE D'APPELS UNIQUE  (★ chemin critique)
    ├─ 2.1  retirer front generate_combined + router 100% canonique +
    │        écrire les lignes dans le budget unique draft_from_ag +
    │        persister modalité dans le payload                          [REPLACÉ→hybride, replacement_better=false]
    ├─ 2.2  déprécier generate_combined + DISABLE TRIGGER + purger drafts orphelins [best + G6]
    ├─ 2.3  câbler wizard sur surcharge 10-args existante (PAS de SQL)   [improve, S5]
    ├─ 3.2  primitive de ventilation partagée (post_call_for_funds)      [improve]
    └─ G6   réconciliation des paiements imputés sur appels hors-GL      [GAP]
                                                                          
V3  ALUR / FONDS TRAVAUX  (après V2)
    ├─ 3.1  FIFO cloisonné par nature (parallélisable, dépend de V2 pas de V1) [improve, S3/G4]
    ├─ 6.F1 vue ALUR sur GL 105 + routage canonique                     [improve]
    ├─ 6.F2 plancher 5% : front + alur_exemption_reason + CONSTRAINT TRIG [improve]
    ├─ 6.F3 post_alur_transfer (D105/C705, garde solde, travaux voté)    [improve]
    └─ 6.F4 refonte rôle create_alur_fund_from_ag (canonique)           [improve]
                                                                          
V4  CLÔTURE FINANCIÈRE  (★ referme la boucle d'or — ORDRE CORRIGÉ)
    ├─ 4.0  ★ AJOUTER open_next_period dans APPROVE_ACCOUNTS (orchestration manquante) [GAP S2]
    ├─ 4.2  à-nouveau : open_next_period poste 6/7→120 + report 1/4/5    [improve]   ◄── AVANT 4.1
    ├─ 4.1  affectation : regularize_period 120/110→450 datée AG N+1     [improve]   ◄── APRÈS 4.2
    │        ⚠ G1 : open_next_period doit reporter le SOLDE du 120 (≈0 après affectation),
    │              PAS recalculer net(6/7) → sinon DOUBLE COMPTAGE
    ├─ 4.3  annexe 1 : +110 au passif, corriger double-comptage trésorerie [improve]
    ├─ 8.5  annexe 5 colonne D sur 702 + period_id + budget travaux      [best]
    └─ G3   rebrancher v_owner_statement_lines sur le GL (même vague)    [GAP, interaction V4]
                                                                          
V5  AG — AUTORITÉ DU CALCUL & PV  (traiter V5.1 et 0.3/1.4 ensemble)
    ├─ 5.1  RPC = autorité : couper persistance JS de is_approved + verrou [improve, hybride]
    ├─ 5.2  pouvoirs 10% (RPC) + correspondance amendée (is_excluded + by_source) [improve]
    └─ 5.3  vue v_ag_opposants (inversion sur is_approved FINAL + défaillants) [improve, dépend G7/5.1]
                                                                          
V6  MUTATIONS / ÉTAT DATÉ  (après V3 ALUR fiable + V4 clôture)
    ├─ 6.3  split par nature sur signature_date + figer vendeur (PAS de transfert) [REPLACÉ→hybride]
    ├─ 6.1  quote-part ALUR via v_alur_lot_contributions, partie III     [improve, dépend 6.F1]
    └─ 6.2  payload état daté v2.0 (3 volets) + un seul moteur PDF       [improve]
```

### 3.2 Corrections d'ordre vs plan d'origine

1. **(BLOQUANT) V4 : 4.2 AVANT 4.1.** Preuves convergentes : `open_next_period` calcule `v_net67`→120 ; `activate_ag_decisions` câble `regularize` mais **pas** `open_next_period` ; 120 à 0 écriture sur la boucle d'or ; mémo expert (120→450 posté en N+1).
2. **(BLOQUANT) V4 : ajouter `open_next_period` à l'orchestration** (item 4.0). Sans lui, ni 4.1 ni 4.2 ne se déclenchent.
3. **3.1 ne dépend PAS de V1** (`allocate_payment` sur tables métier) → parallélisable. Mais **dépend de V2** (G4 : `budget_id=NULL` non classable).
4. **1.5 avant 1.4** conservé, mais **risque reclassé à faible** (nettoyage seed, pas correction RPC).
5. **2.3 = câblage front**, pas création SQL (surcharge 10-args déjà en base).

### 3.3 Chemin critique minimal — boucle d'or testable de bout en bout

```
4.0  Câbler open_next_period dans activate_ag_decisions/APPROVE_ACCOUNTS
  ↓
2.1 + 2.2  Unifier sur le générateur canonique unique (retirer generate_combined du front + déprécier RPC + DISABLE TRIGGER)
  ↓
1.5 + 1.4  Nettoyer les tx seed du chapeau 450 → 450-1 (sans UPDATE de tx postée) PUIS verrou non-imputabilité
  ↓
4.2  À-nouveau : open_next_period pose le résultat 6/7 sur 120
  ↓
4.1  Affectation : regularize_period solde 120→450 par quote-part datée AG N+1   (⚠ G1 : 120 reporté = SOLDE, pas recalcul)
  ↓
4.3 + G3  Annexe 1 (120/110 au passif + double-comptage trésorerie) ET rebrancher le relevé de compte sur le GL
```

C'est **cette chaîne, dans cet ordre (4.2 AVANT 4.1)**, qui referme la boucle d'or financière testable de bout en bout. Le FIFO par nature (3.x) est parallélisable hors chemin critique strict tant que la boucle d'or reste mono-nature « current ».

---

## 4. Gaps & tests à faire avant d'implémenter

### 4.1 Interactions entre correctifs (à neutraliser AVANT d'écrire)

| Interaction | Risque | Mitigation à appliquer |
|---|---|---|
| **V4.1 × V4.2** (G1) | **Double comptage du résultat** : `regularize` vire 120→450 (N), `open_next_period` reposte net(6/7)→120 (N+1). | `open_next_period` reporte le **SOLDE** du 120 (≈0 après affectation), **pas** un recalcul net(6/7). Test excédent ET déficit sur copro jetable : 120 final = 0, 450 augmenté **une seule fois**. |
| **V1.5 × immutabilité GL** (G2) | UPDATE de tx postée → `restrict_violation`. | **Aucun UPDATE.** Reclassement par écriture inverse datée si assainissement voulu ; sinon laisser l'historique figé. Effort réel > « M ». |
| **V2 × V3.1** (G4) | FIFO par nature inopérant sur `budget_id=NULL`. | Séquence stricte V2 + réconciliation **PUIS** 3.1. Garde : refuser `allocate_payment` si ligne cible sur appel sans `budget_id`. |
| **V1.4/1.5 × V4.2** (G5) | À-nouveau 2025 (sur chapeau 450) refusé si 450 non-imputable. | Ordre imposé : 1.5 (reprendre 2025→450-1) → 1.4 (verrou) → à-nouveau. Vérifier qu'aucun `opening_balance` ne cible le chapeau. |
| **V4 × relevé de compte** (G3) | Écritures affectation/à-nouveau invisibles au relevé hors-GL. | Rebrancher `v_owner_statement_lines` sur le GL **dans la même vague V4**, pas après. |
| **V1.5 × annexes/FIFO** | Vues filtrant littéralement `'450'` (≠ `'450%'`) changent de résultat. | Auditer toutes les vues/RPC référençant `'450'` vs `'450%'` avant reprise ; revalider `fn_annexe_1` 2025. |
| **V0.3 × calculate_resolution_result** | « Corriger » `compute_majority_threshold` donne un faux sentiment de sécurité. | Traiter 0.3/1.4 (ch.1) **et** 5.1 ensemble : une seule fonction faisant foi, front simple afficheur. |
| **V5.1 × V5.3** (G7) | Vue opposants lira `threshold_*`/`tantiemes_*` périmés (front n'écrit que `is_approved`/`status`). | UNE seule source écrivant **tout** le bloc résultat (la RPC). 5.3 après 5.1. |

### 4.2 Tests actifs ciblés à produire avant implémentation (verdicts « conforme » sur cas limites non exercés)

1. **AG art.24 avec abstention non nulle** : créer une résolution `for=40/against=30/abst=40` → prouver activement la divergence back/front (la boucle d'or est en unanimité, le bug n'est jamais exercé).
2. **Trop-perçu 450-3** : un paiement > dû sur la boucle d'or → prouver le routage 450-3 (branche jamais exercée, 0 occurrence).
3. **Cut-off cross-période** : paiement N+1 soldant un appel N une fois 2027 ouvert (cas statique aujourd'hui).
4. **Extourne cut-off dans `open_next_period`** : dérouler sur une copro **avec** cut-off 408/486 (la boucle d'or n'en a aucun ; seule `075c0249` en a).
5. **Affectation + à-nouveau sur copro jetable** : piéger le **double comptage** (G1) — vérifier 120 final = 0 et 450 augmenté une seule fois, résultat **−755 €**.
6. **Relevé vs GL** : `v_owner_vs_gl_mismatch` en vue d'intégrité (écarts actuels −423 à +30 € par copropriétaire).
7. **Équilibre Σdébit=Σcrédit** : présenter le « conforme » comme « conforme par construction RPC, **non verrouillé** » jusqu'à pose du CONSTRAINT TRIGGER (un UPDATE direct RLS-off le casse).
8. **Facture fournisseur** (G9) : exercer une facture TVA renseignée + une facture multi-lignes + tenter un brouillon sans posting (confirmer le rejet) — preuve actuelle quasi nulle (1 facture, TVA NULL).

### 4.3 Chiffre à corriger partout

- **Résultat 2025 boucle d'or = −755 € (déficit)** : charges classe 6 (601) = 890, produits classe 7 (701) = 135. **PAS 655 €** (l'audit a survalorisé les produits et présente une incohérence interne 655/755). Les 2 tx « manual draft » de 100 € (non postées) brouillent le chiffre. Tout test d'affectation doit utiliser **−755**.

---

## 5. PAR OÙ COMMENCER (recommandation)

Tranche **finance-first**, verticale, chaque palier avec son critère de test. On démarre par **V0 (filets, zéro risque)** puis on attaque le **chemin critique** dans le bon ordre.

1. **V0 — Poser les filets et la preview honnête (non bloquant, parallélisable).**
   - UNIQUE INDEX `ag_pending_actions(ag_id, resolution_id)` ; vue `v_call_vs_budget_mismatch` ; vue `v_owner_vs_gl_mismatch` (G3) ; preview JS honnête (`checkMajority` + `handleValidateSecondVote` en `pour > contre`).
   - **Critère de test :** les vues d'intégrité s'affichent et chiffrent les écarts connus (+0,16 € ; −423/+30 € relevé vs GL) sans rien casser ; un 2e INSERT de même `(ag_id, resolution_id)` échoue ; la preview live affiche la même majorité que la RPC sur le contre-exemple `40/30/40`.

2. **V2 — Unifier la route d'appels (clé de voûte).**
   - Retirer l'appel front `generate_combined` ; router 100% canonique ; écrire les lignes de budget dans le **budget unique** `draft_from_ag` ; persister la modalité 1/2/4 dans le payload ; déprécier `generate_combined` + son DISABLE TRIGGER ; **purger/réconcilier les drafts et paiements orphelins** (G6).
   - **Critère de test (copro jetable, PAS la boucle d'or) :** AG finalisée → budget édité → appels postés **D450-x/C701**, **0 appel `budget_id=NULL`** résiduel, modalité respectée, `payment_allocations` cohérentes.

3. **V1 — Grand livre propre (cause puis verrou).**
   - Reclasser le chapeau 450 en artefact de seed ; neutraliser la draft `81d0f732` ; provisionner 450-1..5 sur les 3 copros plates ; **puis** `accounts.is_postable` + CONSTRAINT TRIGGER ; re-seed des 28 tx sans `source_id` puis CHECK ; CONSTRAINT TRIGGER équilibre.
   - **Critère de test :** **aucun UPDATE de tx postée tenté** ; un INSERT sur le chapeau 450 (ou sur un compte `is_postable=false`) est refusé ; le posting des 3 copros plates fonctionne toujours ; le CHECK `source_id` passe VALIDATE sans rejeter de donnée existante.

4. **V4 — Refermer la boucle de clôture (ORDRE CORRIGÉ 4.2 → 4.1).**
   - Câbler `open_next_period` dans `APPROVE_ACCOUNTS` (4.0) ; à-nouveau (4.2) ; affectation (4.1) **datée AG N+1** ; annexe 1 (+110, double-comptage trésorerie) + rebrancher le relevé sur le GL (G3).
   - **Critère de test (copro jetable, déficit −755 €) :** après `approve → open_next → regularize`, le **120 final = 0**, le **450 augmenté une seule fois** (pas de double comptage G1), l'annexe 1 équilibrée, le relevé de compte = solde GL au centime.

5. **V3 / V5 / V6** — ALUR, autorité du calcul AG + PV, mutations/état daté : à enchaîner ensuite, chacun derrière ses dépendances (3.1 après V2 ; 6.x après V2 ; 5.3 après 5.1 ; 6.1 après 6.F1 ; V6 après V3+V4).

---

## 6. Arbitrages de Lyes — 2026-06-02

> Décisions métier prises avec Lyes (expert copropriété) après challenge des verdicts. Elles **affinent** les correctifs ci-dessus et **font foi** pour l'implémentation. Toujours **non appliquées** (lecture seule).

### ① Affectation du résultat (ch.8 / V4.1) — **l'AG tranche**
L'affectation de l'excédent/déficit est **décidée par l'AG** qui approuve les comptes (report, imputation sur travaux/ALUR, ou remboursement). Le « l'excédent reste sur le 450 » devient un **simple fallback** appliqué *uniquement si l'AG n'a rien voté*. → `regularize_period` doit lire la **décision d'AG** (résolution d'affectation) et ne retomber sur le 450 qu'à défaut. Écriture 120/110→450 par quote-part **datée à l'AG N+1**.

### ② Imputation des paiements (ch.5 / V3.1) — **cloisonnement par nature confirmé**
FIFO **indépendant par nature** (courant / travaux / ALUR ne se croisent jamais), au nom de la ségrégation légale du fonds ALUR (art. 14-2, non remboursable). Entorse assumée à une lecture pure de l'art. 1342-10. **Imputation manuelle** possible (le copropriétaire/gestionnaire peut désigner la dette). → paramètre `p_nature` dans `allocate_payment`.

### ③ Vote par correspondance sur résolution amendée (ch.2 / V5.4) — **le gestionnaire qualifie, l'effet légal est automatique**
- Le **gestionnaire qualifie** l'amendement : flag manuel `amended_in_session` posé en séance (lui/le président jugent si c'est un amendement de fond). C'est **son** choix.
- Une fois qualifiée amendée, l'effet sur le **« pour » par correspondance est imposé** par l'art. **17-1 A** : « …assimilé à un **copropriétaire défaillant** pour cette résolution ». Le système **applique automatiquement** (pour → défaillant, donc **hors exprimés**), **montre l'impact** (« N votes pour reclassés défaillants → résultat recalculé ») et le gestionnaire **confirme**. Il ne peut **pas** garder ces « pour » (sinon AG annulable, art. 42).
- **Zone d'ombre** (« contre » / « abstention » par correspondance sur résolution amendée : la loi est muette) → laissés au gestionnaire **avec alerte**, non tranchés à sa place.
- Réflexe métier amont : si l'amendement transforme la résolution en **question nouvelle hors ordre du jour**, ne **pas voter / reporter** (choix du gestionnaire).
- Les défaillants ainsi créés alimentent la liste **« défaillants/opposants » du PV** (départ délai recours art. 42) — lien avec l'item 5.3.

### ④ Plafond de pouvoirs (ch.2 / V5.5) — **prévenir sans bloquer**
Règle des **10 %** au-delà de 3 mandats (art. 22 al. 3) **+** exclusion du syndic/conjoint/préposés comme mandataire (art. 22 al. 4) : surfacées en **avertissement** (front, visible), **jamais de blocage dur** (pas d'EXCEPTION serveur). ⚠️ L'avertissement doit rappeler que **dépasser la limite peut vicier le vote** (risque d'annulation) — c'est un choix éclairé du gestionnaire, pas un garde-fou silencieux.

### ⑤ Quorum (ch.2 / V5.2) — **participation indicative, pas de quorum**
Retirer toute mention « QUORUM NON ATTEINT » / « nouvelle convocation nécessaire » du PV (juridiquement faux : pas de quorum en copropriété). **Afficher à la place** un **décompte de participation indicatif** (tantièmes présents/représentés + nb de copropriétaires). Corriger au passage le remplissage `ag_attendance.tantiemes` (aujourd'hui `lot_ids=[]` → 0).

---

**Rien n'est appliqué. En attente du go de Lyes.**