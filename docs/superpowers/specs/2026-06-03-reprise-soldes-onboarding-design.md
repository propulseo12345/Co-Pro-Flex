# Spec — Reprise de soldes / balance d'ouverture (onboarding) + durcissement du verrou

> Date : 2026-06-03 · Branche : `v2` · Statut : **design validé + revue d'impact + revue finale intégrées**, prêt pour le plan.
> Mémoire liée : [[onboarding-clean-path]], [[ledger_account_model]], [[lot_centric_rule]],
> [[alur_fonds_travaux_accounting]], [[wp5_1_periode_anouveau]], [[affectation_resultat_copro]],
> [[ag_auto_population]].

## 1. Contexte & objectif

Un syndic récupère **en permanence** des copropriétés gérées par un autre syndic (reprise de
mandat). L'onboarding doit donc permettre de **reprendre la balance d'entrée** (les « à‑nouveaux »)
de façon **simple**, et produire un grand livre conforme (décret 2005‑240).

L'étape 7 actuelle ne capture que les soldes copropriétaires par lot (450‑1/2/5) et **pose toute la
contrepartie sur 471/472**, sans saisir la vraie contrepartie (banque, réserves, fournisseurs,
report). Conséquence : dès qu'un solde est saisi, 471/472 ≠ 0 → le verrou bloque → étape
**inutilisable**. La revue a aussi montré que le verrou est **contournable** (état React volatil) et
**certifie « propre » un grand livre vide**.

Objectif : livrer une reprise **complète, simple, non bloquante, ré‑éditable**, corriger le verrou, et
neutraliser les **cascades** (revue d'impact + revue finale) **avant** de coder.

## 2. Décisions validées (avec l'expert métier)

1. **Reprise complète mais simple** : set « Essentiel » + section « Autres comptes » (classes 1‑5).
2. **Non bloquant** : l'écart va sur le compte d'attente 471/472 (livres équilibrés), on **prévient**,
   alerte **persistante** « Reprise à terminer » tant que ≠ 0. Les **vraies fautes comptables** restent
   bloquantes (cf. §6).
3. **Écran ré‑éditable** dans le wizard **et après finalisation** (via l'alerte). Sous le capot :
   **annule‑et‑repasse** (remplacement intégral).
4. **Report à nouveau = 110/120** (spécifique copro). Le **110/120 ne reçoit QUE le résultat des
   exercices clos antérieurs** ; le résultat de l'exercice en cours vit dans les 6/7 (jamais dupliqué
   en 110/120). Pas de 119 (PCG, hors copro).
5. **Granularité par lot** (lot‑centric). Si l'ancien syndic ne fournit que le solde par personne,
   c'est le syndic qui ventile entre les lots.
6. **Avance 103 ventilée par lot** ; **105 (fonds ALUR) global** (réserve acquise au syndicat),
   distinct de la trésorerie placée 502.
7. **Reprise en cours d'année incluse** : on **poste les classes 6/7** (charges en 6xx, provisions &
   produits en 7xx) → image fidèle, l'annexe budget/réalisé couvre l'exercice entier. **Solution
   propre validée par lecture du code** (cf. §3.5) : grâce au `source_type` dédié, la clôture
   `open_next_period` reporte le bilan **et** intègre ces 6/7 dans le résultat **sans double‑comptage
   et sans la modifier**.
8. **Solde copropriétaire affiché = créance 450 uniquement** (le 103/lot est tracé à part).
9. **Verrou étape 8** : `clean` = **liste blanche** de vraies fautes (cf. §6) ; le reste = avertissement.

## 3. Architecture

### 3.1 Le moteur unique — `set_opening_balance`

RPC Postgres canonique, **idempotente par remplacement**, en **une transaction** :

```
set_opening_balance(p_copro_id, p_period_id, p_as_of_date, p_lines jsonb) → { success, residual, lines_count, as_of_date }
p_lines[] = { account_code, lot_id (nullable), amount (signé), nature? }
```

Séquence interne (copier les patterns sûrs `open_next_period` / `post_period_cutoff`) :
1. **Pré‑garde statut** : lire `accounting_periods.status` (avec `FOR UPDATE`) ; si `<> 'open'` →
   `RETURN {success:false,'réouvrez la période'}` **avant tout DELETE**. *(I3)*
2. **Annule** l'éventuelle reprise d'onboarding existante de la période
   (`source_type='opening_onboarding'`, cf. §3.5) par DELETE (cascade `ledger_entries`). Autorisé par
   l'exemption d'immutabilité **étendue** (§3.5) tant que la période n'est pas `approved`.
3. **Construit** les écritures depuis `p_lines` (résolution par code ; 450‑x via
   `resolve_lot_tiers_account` pour current/works/alur ; 103/lot, 105, 401, 110/120, 6/7 par code).
   **Comptes bancaires** : résolus par `account_id` des comptes créés à l'étape 4
   (`account_type='asset'` + `code LIKE '512%'/'502%'`), **jamais** par le code `512` nu. *(B5)*
4. **Calcule le reste** = −(Σ montants signés), pose sur **471** (débiteur) / **472** (créditeur), avec
   un libellé traçable. Le 471/472 ne reçoit **que** les inconnus, **pas** une contrepartie de
   commodité des 6/7 (qui s'équilibrent dans la balance d'entrée complète). *(B2)*
5. **Poste UNE écriture équilibrée** via `create_ledger_transaction(..., p_auto_post := true)`,
   `source_type := 'opening_onboarding'`, `source_id := p_period_id`.
6. **Vérifie le retour** : `create_ledger_transaction` a un `EXCEPTION WHEN OTHERS` qui **avale** le
   `RAISE` et renvoie `success:false` **sans rollback** → tester `(v_res->>'success')::boolean` et
   `RAISE` si false, sinon le DELETE de l'étape 2 se committe **sans remplacement** (perte de
   données). *(mineur critique)*

**Période d'onboarding** *(B6)* : `ensureAccountingPeriod` ne doit **plus** coder l'année civile en
dur. Dériver la période depuis `copros.exercice_debut` + l'année de reprise, et **garantir
`p_as_of_date ∈ [start, end]`** de la période ciblée (sinon `set_opening_balance` reçoit un
`p_period_id` incohérent avec `p_as_of_date`).

### 3.2 Lecture pour pré‑remplissage — `get_opening_balance`

`get_opening_balance(p_copro_id, p_period_id) → { lines[], residual, as_of_date }` : relit l'écriture
`opening_onboarding` courante et la remappe en lignes de formulaire. Source de vérité unique = le grand
livre (**pas de table brouillon**).

### 3.3 Couche TS (`src/lib/onboarding/api.ts`)

- Remplacer `postOnboardingOpeningBalances` (skip‑if‑exists silencieux) par
  `setOnboardingOpeningBalance(coproId, periodId, asOfDate, lines)` → appelle `set_opening_balance`.
- Ajouter `getOnboardingOpeningBalance(coproId, periodId)`.
- **Corriger `listComptesBancaires`** *(B5)* : il filtre `account_type='bank'` (valeur absente de
  l'enum) → toujours vide. Filtrer `account_type='asset'` + `code LIKE '512%'/'502%'`.
- Lister les comptes du plan pour « Autres comptes » (classes 1‑5 uniquement).

### 3.4 Composants (chacun < 200 lignes)

- `RepriseSoldes` (conteneur réutilisable wizard + autonome ; charge `get_opening_balance`).
- `BalanceEntreeForm` : Essentiel (512/502 **pré‑remplis via `account_id` des comptes de l'étape 4**,
  105 global, 401 global, 110/120) + « Autres comptes » repliable (classes 1‑5) + bascule **« reprise
  en cours d'année »** (date de reprise ; si ≠ 1er jour → saisie des 6/7).
- `SoldesParLotTable` : par lot pour 450‑1/2/5 **et** 103.
- `EquilibreIndicator` : « Reste à imputer (471/472) : X € » + nudge « cherche la cause ».

### 3.5 Le `source_type` dédié `opening_onboarding` (cœur de la correction B1+B2)

La reprise d'onboarding et le report inter‑exercices sont **deux choses différentes** ; elles doivent
porter des `source_type` distincts.

- **Aujourd'hui** : `open_next_period` (live `20260601114000`, l.42‑50) **SELECT puis DELETE** la tx
  `source_type='opening_balance' AND source_id = N`, **avant** de calculer le report. Si la reprise
  d'onboarding portait aussi `opening_balance`/`source_id=N`, elle serait **supprimée** à la 1ʳᵉ
  clôture (la balance d'entrée disparaît de N+1), et l'index unique
  `uq_ledger_tx_opening_balance (copro_id, source_id) WHERE source_type='opening_balance'`
  entrerait en collision.
- **Correctif** :
  1. **Migration** : ajouter `'opening_onboarding'` à la contrainte
     `ledger_transactions_source_type_check` (dernière def : `20260601091000`).
  2. **Index unique partiel dédié** : `(copro_id, source_id) WHERE source_type='opening_onboarding'`
     (≠ l'index `opening_balance`) → pas de collision avec le report inter‑exercices.
  3. **Étendre `is_ledger_regen_exempt`** (def **live** centralisée `20260601110000`, qui exempte
     déjà `('opening_balance','closing')`) pour inclure `'opening_onboarding'` → l'annule‑et‑repasse
     reste possible tant que la période n'est pas `approved`.
  4. **`open_next_period` n'est PAS modifié** : il ne supprime que `opening_balance` (ignore donc la
     reprise d'onboarding), **et** ses sommes de report (classes 1/4/5) et de résultat (classes 6/7)
     sont **par classe de compte, indépendantes du `source_type`** → les écritures de la reprise
     d'onboarding sont **automatiquement et correctement** reportées et résultées. C'est ce qui rend
     la reprise des 6/7 propre **sans** double‑comptage ni exclusion.
- **Rétro‑compat** *(I16)* : prévoir la migration des copros déjà onboardées sous l'ancien
  `postOnboardingOpeningBalances` (tx `opening_balance`/`source_id=periodId`) vers le nouveau
  `source_type`, pour éviter qu'`open_next_period` ne les supprime à leur 1ʳᵉ clôture.

## 4. UX de l'écran de reprise

Double libellé métier/compte, exemple de format, une colonne, phrase d'amorce (« préparez le dernier
relevé bancaire + la dernière balance du syndic sortant »), erreurs à côté du champ, **mode
« démarrage à zéro »** (ancien syndic bénévole / historique inexploitable). Bloquer uniquement le
vérifiable à 100 % ; « Enregistrer » fonctionne même avec un reste ≠ 0.

## 5. Pivots anti‑cascade (revue d'impact, vérifiés en base)

### Pivot 1 — « solde par lot » restreint aux comptes 450 %/459 % (B2‑impact)
`v_lot_balance` agrège aujourd'hui **toute** écriture `WHERE lot_id IS NOT NULL` **sans filtre de
code** (vérifié). → le 103/lot polluerait le solde copropriétaire affiché (annuaire/AG/votes).
**Correctif** : `v_lot_balance` (et `v_coproprietaires_overview.solde`) ne comptent que `450%`/`459%`.
Le 103/lot reste posté (lot‑centric) et s'expose via une **vue dédiée « avance par lot »**.
**Non‑régressif** : 0 écriture 103/105 par lot aujourd'hui (vérifié, y compris boucle d'or 22222222).
⚠️ Ce pivot **ne suffit pas** à débloquer l'étape 8 pour la reprise 450‑x → voir §6 (B3).

### Pivot 2 — garde 471/472 hors onboarding ET hors boucle AG (B3 + B4)
- **À l'onboarding** : `auditOnboardingBooks` renvoie `clean` = **liste blanche** (cf. §6) ; le
  `waitingBalance` (net 471/472) est renvoyé **séparément** comme **avertissement non bloquant**.
- **À l'arrêté des comptes (AG)** : la garde **dure** 471/472 ≠ 0 vit en **pré‑validation de l'AG**,
  **côté app/orchestrateur AVANT `activate_ag_decisions`** (jamais un `RAISE` 471/472 **dans** la
  boucle `activate_ag_decisions`, qui annulerait TOUTE l'AG). La **clôture technique `close_period`
  n'est PAS bloquée** par 471/472 (cf. §7/B4).

### Pivot 3 — régulariser l'enum `account_type` (B5‑impact)
Le live a `income` mais **aucune migration ne l'ajoute** (patché hors‑bande) → un `db reset` propre
échouerait sur `provision_copro_chart`. Migration idempotente
`ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'income'` avant `provision_copro_chart`, et
**tester un reset complet** (CI).

## 6. Verrou de finalisation (étape 8)

Le verrou **lit l'état réel en base** (plus la mémoire React) : chaque étape **enregistre à la
validation** (appels à l'étape 6 ; reprise à l'étape 7). `clean` est calculé **côté app** dans
`auditOnboardingBooks` par une **liste blanche d'`issue_type` bloquants** (B3) :

```
clean = aucune issue ∈ { TOTAL_MISMATCH, OVER_ALLOCATED, OVER_PAID, SOURCE_ID_MISSING, CHAPEAU_450_POSTED }
```

**Bloquant** (vraie faute — casse les livres) :
- `TOTAL_MISMATCH` (écriture déséquilibrée) ; `OVER_ALLOCATED` (Σ affectations d'un encaissement >
  montant reçu) ; `OVER_PAID` (règlement fournisseur > facture) ; `SOURCE_ID_MISSING` (écriture sans
  origine) ; `CHAPEAU_450_POSTED` (postage sur 450 nu).
- **Preuve positive** : si un plan d'appels avec ≥ 1 échéance a été saisi mais **0 appel émis** pour
  le budget validé → bloquer. Ne **pas** bloquer le cas « aucun échéancier voulu » (plan vide).

**Exclus du calcul de `clean`** (avertissements seulement, B3) :
- `LOT_GL_MISMATCH` (la créance d'ouverture 450‑x n'a pas d'appel correspondant → mismatch **normal**,
  indistinguable d'un vrai écart sans marqueur — d'où l'option, recommandée, d'ajouter une colonne
  d'origine à `v_lot_vs_gl_mismatch` pour ne pas masquer un vrai écart **hors** reprise) ;
- `CALL_VS_BUDGET_MISMATCH` (reprise d'année : une partie déjà appelée hors outil) ;
- net **471/472 ≠ 0** (reprise incomplète).

Note : `OVER_ALLOCATED`/`OVER_PAID` ne peuvent **pas** se déclencher pendant une reprise (elle ne crée
ni paiement ni règlement fournisseur). Un copropriétaire qui paie trop = **avoir** (solde créditeur
450), jamais bloqué.

## 7. Alerte persistante, sortie AG, garde clôture

- **Carte fixe** sur le tableau de bord : « Reprise à terminer : X € à imputer » (→ rouvre
  `RepriseSoldes`). Source = net 471/472 ≠ 0.
- **Traçabilité ligne par ligne** de l'écart (origine/date/montant + **ancienneté**) — art. 10 arrêté
  14/03/2005, parade au « puits sans fond » (ARC).
- **Sortie propre = décision d'AG** (répartir sur 450 ou affecter au fonds), cohérent avec
  [[ag_auto_population]].
- **Garde** *(B4, tranché)* : **seul l'arrêté des comptes en AG est bloqué** tant que 471/472 ≠ 0
  (pré‑validation avant `activate_ag_decisions`). La **clôture technique `close_period` n'est pas
  modifiée** (elle reporte le 471/472 comme un solde de bilan ordinaire, justifié ligne par ligne) —
  on évite ainsi de changer sa signature `boolean` et la cascade associée. 471/472 restent au
  **bilan**, jamais déversés dans le résultat/affectation.

## 8. Risques d'implémentation (dans le plan)

| # | Risque | Parade |
|---|--------|--------|
| I1 | Collision/suppression de la reprise par `open_next_period` (B1). | `source_type='opening_onboarding'` dédié + index partiel séparé + `is_ledger_regen_exempt` étendu (§3.5). **Test** : onboarding(N) → `close_period(N)` → `open_next_period(N)` → **asserter que la balance d'entrée survit dans N+1**. |
| I2 | Idempotence par **remplacement** (actuel = skip‑if‑exists). | DELETE‑then‑recreate atomique (pattern `open_next_period`/`post_period_cutoff`). |
| I3 | Échec **brut** du trigger si replace sur période approuvée. | Pré‑garde `status='open'` + `FOR UPDATE` en tête + message métier. |
| I4 | Résidu d'arrondi de la ventilation 6/7 → 471/472 ≠ 0 permanent. | **Largest‑remainder** (pattern cr8) ; 471/472 ne reçoit que l'intentionnel. |
| I5 | Copros en onboarding dans impayés/relances. | Filtre `onboarding_step IS NULL`. ⚠️ **`v_unpaid_by_lot` a deux définitions concurrentes** (`20260125:898` et `20260401:633`, colonnes divergentes, aucune ne joint `copros`) → identifier la def vivante, ajouter `JOIN copros`, gérer « cannot drop columns », **supprimer la def morte** (finir la migration). |
| I6 | Ré‑édition budget après postage étape 6 → budget dupliqué (INSERT sec). | Verrouiller `budget_lines` une fois des appels émis **ou** upsert `(copro_id, period_id, budget_type)` + recharger Step5 ; contrainte d'unicité ; tester l'aller‑retour 5↔6. |
| I7 | Faux positif « budget validé & 0 appel ». | Bloquer **seulement** si `callPlan.installments.length > 0` et 0 posté ; compter sur le budget réellement validé. |
| I8 | Émission partielle (`alreadyDone>0`) → `CALL_VS_BUDGET_MISMATCH` durable. | Trancher le comptage des échéances déjà émises (ou exclure budgets en reprise du contrôle) — déjà en avertissement (§6). |
| I9 | 6/7 « par clé » sans dimension clé en GL. | Poster les 6/7 **sans `lot_id`** (global par compte) ; ventilation par clé = affaire du budget. Résolution par **code**, non silencieuse. |
| I10 | `open_next_period` reporte le 103 (classe 1) avec son `lot_id`. | Vérifié sain (`enforce_lot_id_on_45x` muet hors 450/459) ; test « 103/lot reporté conserve son lot_id ». |
| I11 | Test d'acceptation dans `supabase/tests/` n'est lancé par **rien**. | **Ne pas** se contenter de le déplacer : garder un bloc auto‑rollback **exécutable** (en migration **ou** job CI `psql -f`). Ne jamais déplacer les `CREATE FUNCTION` seed/`create_clean_test_copro`. |
| I12 | Ré‑édition de reprise après une 1ʳᵉ clôture → 120 figé désynchronisé. | Si un N+1 « open » existe avec report `source_id=N`, ré‑appeler `open_next_period(N)` dans la même transaction, **ou** bloquer la ré‑édition de N tant que N+1 a des écritures non‑reprise. |
| I13 | E2E `onboarding-clean-path` caduc (skip étape 7, post DB étape 6). | MAJ en‑tête ; assertions DB après étape 6 (CFF issued + budget validated) ; conserver l'idempotence par trimester. |
| I14 | `create_ledger_transaction` avale le `RAISE` (`success:false` sans rollback). | Dans `set_opening_balance` : `RAISE` si `(v_res->>'success')` ≠ true (cf. §3.1 étape 6). |
| I16 | Copros déjà onboardées sous l'ancien moteur. | Migration de re‑typage `opening_balance`→`opening_onboarding` pour les reprises d'onboarding existantes (cf. §3.5). |

## 9. Confirmé sain (revue d'impact + revue finale)

- **Exemption d'immutabilité ciblée** (`is_ledger_regen_exempt`, live `20260601110000`) : DELETE+repost
  autorisé tant que la période source ≠ `approved` ; posted→draft toujours interdit. Faisable **sous
  réserve de l'étendre à `opening_onboarding`** (§3.5).
- **Patterns de référence** : `open_next_period` (`20260601114000`), `post_period_cutoff`.
- **`create_ledger_transaction(auto_post=true)`** : `success ⟹ posted` + équilibré (sinon
  `success:false`, d'où I14).
- **FK‑safe** : aucune table ne référence une tx d'ouverture ; `ledger_entries.tx_id` `ON DELETE
  CASCADE`.
- **471/472 ne fausse aucun KPI dashboard** : impayés/relances lisent `v_unpaid_by_lot`.
- **`enforce_lot_id_on_45x` ne contraint que 450 %/459 %** → 103/lot et 6/7 sans lot_id passent.
- **`v_lot_balance` sans filtre de code** → Pivot 1 nécessaire et bien ciblé.
- **Report à nouveau 110/120** conforme décret (pas 119).
- **Boucle d'or 22222222 inchangée** (immutabilité GL) ; test V0 reste vert.

## 10. Tests & preuve (TDD)

- **`set_opening_balance`** : équilibre garanti ; replace sans doublon ; résidu correct ; pré‑garde
  `status` ; `RAISE` si `create_ledger_transaction` échoue (I14) ; 103/lot ; 6/7 sans lot_id ;
  largest‑remainder.
- **Cycle de vie (I1)** : onboarding(N) → `close_period(N)` → `open_next_period(N)` → **la balance
  d'entrée survit dans N+1** et le résultat (incluant les 6/7 d'ouverture) est viré en 120 **une seule
  fois**.
- **Verrou** : copro **vide** non certifiée ; `LOT_GL_MISMATCH`/`CALL_VS_BUDGET_MISMATCH`/471‑472 non
  bloquants ; `OVER_ALLOCATED`/`OVER_PAID` bloquants (live app).
- **Pivot 1** : `v_lot_balance` restreinte 450/459 → solde copro = 450 only ; 103/lot via vue dédiée.
- **Acceptation** enrichie (déséquilibre → 471/472 → warning → soldé → 0), **exécutable** (I11).
- **E2E** : compléter `onboarding-clean-path` + assertions étape 6 (I13).
- **Repro** : `supabase db reset` complet (Pivot 3).
- **Non‑régression** : boucle d'or 22222222 + harnais à 0 écart.

## 11. Hors‑scope / différé

- **Import Excel/CSV** de la balance — V2.
- **Mapping poste→compte modulable** (Paramètres) — P4 du plan de remédiation précédent.
- **Acompte fournisseur (409)** — module règlements fournisseurs.
- **Drop surcharge 8‑params** `post_budget_call_for_funds` — migration séparée + GO.

## 12. Ordre d'attaque (détaillé dans le plan)

1. **Pivot 3** (enum) + **Pivot 1** (vues 450/459) — socle DB non‑régressif (prouvé par reset + V0).
2. **`source_type opening_onboarding`** (contrainte + index + `is_ledger_regen_exempt` étendu) +
   **rétro‑compat** (I16).
3. **Moteur** `set_opening_balance` / `get_opening_balance` (+ tests SQL, dont le cycle de vie I1).
4. **Période** dérivée de `exercice_debut` (B6) + **`listComptesBancaires`** corrigé (B5).
5. **Pivot 2** (alignement 471/472 onboarding + pré‑validation AG hors boucle).
6. **Écran** `RepriseSoldes` réutilisable + intégration wizard (post‑as‑you‑go) + **verrou étape 8**
   (liste blanche).
7. **Alerte** tableau de bord + filtre `onboarding_step IS NULL` (I5) + I6/I7.
8. **Tests** d'acceptation enrichis + E2E + reset CI.

> Chaque palier : `tsc` + `build` verts, test SQL d'acceptation à 0 écart, **GO explicite** avant tout
> `apply_migration` sur `iyfesbjnkpynmwlsmxnp`.
