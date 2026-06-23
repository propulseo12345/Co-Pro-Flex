# 🔄 PROMPT DE REPRISE — Chantier « Correction Finance » CoProFlex

> À coller / lire au démarrage de la prochaine session. Objectif de la prochaine session :
> **finir TOUT ce qui reste (WP5, WP6 + finitions), puis faire les tests à la toute fin.**

---

## 0. Contexte en 30 secondes

Plateforme de gestion de copropriété (Next.js 16 + Supabase). On répare la **boucle financière** : tout doit dériver du **grand livre** (compta partie double, décret 2005-240). La « boucle d'or » : *AG vote un budget → budget actif → appels de fonds générés → écritures au grand livre par lot → paiements/factures → tous les écrans lisent ce même grand livre.*

- **Base Supabase** : projet `iyfesbjnkpynmwlsmxnp` (compte perso, via MCP).
- **Copro de test** : `11111111-aaaa-bbbb-cccc-111111111111` (« Résidence Les Jardins d'Émeraude », 15 lots, 1029 tantièmes).
- **Période OUVERTE** : `0a808340-3ba6-4d3c-86cb-aa06a6c1f304` = **Exercice 2027** (seule période où l'on peut poster). Exercices 2025/2026 = `closed`.
- **Route comptable canonique** : `create_ledger_transaction(copro, period, tx_date, label, source_type, source_id, entries jsonb, auto_post)`. Entries = `{account_id, lot_id, direction, amount, entry_label}`. Équilibre toléré 0,01 €.
- **Git** : branche `v2`, base de session `51c2ea7`, **14 commits propres** ajoutés (HEAD `c1c4177`). Rien n'est poussé.
- **Plan détaillé** : `.planning/PLAN_CORRECTION_FINANCE.md`. Audit : `.planning/spec/`.

---

## 1. ✅ CE QUI EST FAIT (et prouvé)

### WP1 — Socle grand livre
4 RPC Postgres atomiques via `create_ledger_transaction`, + 4 edge functions = wrappers minces (déployées) :
- `post_call_for_funds` (appel : N×D 450-x/lot / C 701·702·**105 ALUR**)
- `post_owner_payment` (paiement copro : D 512 / C 450-x par nature, **trop-perçu→450-3**)
- `post_supplier_invoice` (facture : D 6xx / C 401, TVA sur la pièce)
- `post_supplier_payment` (règlement : D 401 / C 512)
- Modèle compte tiers = **sous-compte par nature (450-1/2/3/4/5) + dimension `lot_id`** (jamais un compte par lot). Helper `resolve_lot_tiers_account(copro, nature)`. Trigger `trg_enforce_lot_id_on_45x` (refuse 45x sans lot_id).
- 2 bugs corrigés : double comptage `allocate_payment` + `validate_supplier_invoice_total` ; `source_type` enrichi.
- **Testé e2e** : grand livre équilibré global = 0, 0 écriture sans `source_id`.

### WP3 — Clés & ventilation
`category` (general/special/alur), versioning `valid_from/to`, fonction `repartition_key_is_complete` + **blocage** des clés `all_lots` incomplètes dans `post_call_for_funds`, snapshot `repartition_key_id`+`weight_snapshot` sur les lignes d'appel. Clé ALUR peuplée. **Prouvé** : appel ALUR réel 450-5/105.

### WP4 — Source unique écrans (cœur)
- `fn_dashboard_kpis` : 6 chemins JSON faux corrigés (le dashboard renvoyait 0 partout).
- `fn_annexe_2` : exclut budgets `submitted` (voté = validated/closed).
- `v_general_ledger_by_account_class`, `v_budget_consumption_by_account` : filtrent `status='posted'` (+ `closed`).
- `v_unpaid_by_lot` (impayé = appels échus non lettrés) confirmée canonique.
- **Dépense budget → grand livre** (suite au test user) : `validate_budget_expense(expense_id)` = valider une dépense crée l'écriture **D 6xx / C 401** (idempotent, si période ouverte). Front : `updateExpenseStatus` cas VALIDEE → RPC. **Prouvé** : conso budget = réalisé grand livre = même chiffre.

### Sécurité
`generate_call_for_funds` : faille d'auth fermée (JWT exigé, plus de service-role+verify_jwt=false).

### WP2 — Auto-propagation AG (PROUVÉ)
- Orchestrateur **`finalize_and_activate_ag(ag_id, activate)`** : calcule résolutions → prépare → active, **ATOMIQUE + IDEMPOTENT**. Activation à la notif PV (décision actée), fenêtre de correction puis gel.
- `calculate_resolution_result` : **art.24 = majorité des exprimés** (for>against), abstentions exclues.
- `generate_calls_from_ag_payload` : **route désormais par `post_call_for_funds`** → appels d'AG écrivent au grand livre (avant : appels `draft` hors compta = maillon cassé).
- `prepare_ag_decisions` : réutilise le budget de période existant + idempotence par résolution.
- **Prouvé** sur AG de test `22220000-0000-0000-0000-000000000001` : vote → budget validé auto ; **rejeu = 0 doublon**.

---

## 2. ⏳ CE QUI RESTE À FAIRE (prochaine session)

### Ordre recommandé : **WP6 (seed propre) → WP5 (clôture) → finitions → TESTS à la fin**
Raison : un seed propre (WP6) nettoie les artefacts de test ET donne des données cohérentes pour tester WP5 et tout le reste à la fin.

### WP6 — Seed cohérent + parcours de test
- **Nettoyer les artefacts de test** créés cette session sur la copro `11111111` : AG de test `22220000-…0001` (+ ses résolutions/votes/présence/pending_actions), budget_line `…b1` + dépense `…b2`, et tous les appels/paiements/factures de démo. (⚠️ suppressions = demander OK user, le classifier bloque sinon.)
- **Corriger les incohérences de seed révélées par les tests** :
  - Budget 2026 en `draft` sur période `closed` mais affiché « voté » → statut à assainir.
  - Pas de **solde bancaire d'ouverture** (512) → trésorerie négative. Ajouter une écriture `opening` ou un solde initial.
  - **Budget validé non rattaché à la période ouverte** → `budget_vote = 0` au dashboard. Rattacher un budget courant validé à la période 2027.
  - Dépenses `budget_expenses` 2026 (≈5 430 €) jamais comptabilisées (période fermée) = historique, à acter ou purger.
- **Construire un seed « boucle d'or » complet** : 1 copro propre, exercice ouvert, budget voté **via le flux AG** (tester WP2), appels générés, quelques paiements (dont 1 partiel), 1-2 factures fournisseurs payées, 1 dépense validée.
- **Documenter le parcours de test cliquable** (la check-list pour la phase de tests finale).

### WP5 — Clôture 408/486, régularisation, N/N+1
- **WP5.1** Période **multi-état** : lever `enforce_single_open_period` (aujourd'hui 1 seule période ouverte possible) ; statut riche par exercice ; figeage à l'approbation AG.
- **WP5.2** Assistant clôture **408** (FNP, charges à payer) : proposer depuis l'engagement (OS réalisés non facturés) + saisie manuelle ; écriture D 6x / C 408 ; **extourne N+1 auto**. **486** pour charges à cheval.
- **WP5.3** Régularisation fin d'exercice : suivre **Appelé (70x)** distinct du **Réalisé (classe 6)** (ne jamais additionner) ; répartir excédent/déficit par lot (459/450).
- **WP5.4** Couche **engagement** : requalifier `budget_expenses` en engagé + lier `service_orders`/`contracts` au budget.

### Finitions différées (à ramasser en fin de parcours)
- **WP2** : 2.2 retirer les `EXCEPTION WHEN OTHERS` restants (`prepare_ag_decisions`, `calculate_resolution_result`, `create_budget_from_ag`…) ; 2.4 RPC dédiées ; 2.8 remplir `ag_resolutions.variables` à la création.
- **WP4** : 4.2 `v_dashboard_kpis` période active si utilisé ; 4.4 bug de casse `'critical'`→`'CRITICAL'` (chercher le consommateur de `v_unpaid_lots.severity`) ; 4.7 dé-dupliquer les implémentations dashboard ; 4.8 trésorerie = 2 KPI (comptable ledger + solde bancaire) ; **brancher `fn_dashboard_kpis.total_impayes` sur `v_unpaid_by_lot`** (aujourd'hui = créances annexe 1, pas l'impayé échu).
- **Front** : auditer les pages qui affichent encore 0 / 404 / mock (dette « doublons EN/FR » connue). Le 2e générateur d'appels `generate_combined_calls_from_ag` n'a PAS été unifié (WP2.6 partiel) — vérifier qu'aucun chemin ne l'appelle en doublon de `generate_calls_from_ag_payload`.

### 🧪 TESTS — à faire à la TOUTE FIN (sur le seed WP6 propre)
1. Dashboard : KPIs non nuls et cohérents (trésorerie/impayés/budget/provisions).
2. Voter un budget en AG → vérifier budget actif + appels générés au grand livre + rejeu sans doublon.
3. Paiement copro (intégral/partiel/trop-perçu→450-3) ; facture fournisseur + règlement ; dépense validée → 6xx/401.
4. Cohérence : même chiffre « réalisé/consommé » sur dashboard ET page budget.
5. Impayés = appels échus non lettrés par lot.
6. Grand livre : Σdébit = Σcrédit ; chaque chiffre d'écran traçable à une écriture.

---

## 2bis. 🔍 REVUE DE CODE (fin de session) — à traiter

**Corrigé sur le moment :** fichier migration `…150000` — bloc `v_unpaid_by_lot` retiré (il échouait au rejeu : la vue existe déjà avec d'autres colonnes ; rien à recréer). Aligné sur la base réelle.

**Vrais points à corriger (par gravité) :**
1. **[moyen-haut] `validate_budget_expense` / période fermée** : marque la dépense `validated` + renvoie `success:true` même quand elle ne poste PAS (période non ouverte) → réintroduit la divergence « consommé≠réalisé » en silence. Fix : bloquer la validation si période non ouverte (RAISE) **ou** surfacer `posted:false` côté front avec un avertissement.
2. **[moyen-haut] `fn_annexe_2.total_i_charges.ex_clos_realise`** (→ dashboard `budget_realise`) somme **`product_lines` (classe 7, produits)** au lieu de **`charge_lines` (classe 6, charges)**. Pré-existant mais exposé : le « budget réalisé » du dashboard affiche peut-être les produits au lieu des charges. **À vérifier métier puis corriger** (l.173/175 de `…140000`).
3. **[moyen, défensif] `create_ledger_transaction` renvoie `success:true` même si déséquilibré** (reste `draft`, non posté). Mes RPC testent `success` et pas `status='posted'`. Inoffensif aujourd'hui (écritures équilibrées par construction) mais piège latent → durcir : vérifier que la tx est bien `posted`.
4. **[moyen] `post_owner_payment` + `allocate_payment` (branche `p_call_line_ids`)** : ne filtre pas par `lot_id` ni n'exclut les appels `cancelled` → on peut lettrer un paiement du lot A sur des lignes du lot B / d'un appel annulé, crédit 450-x sur le mauvais lot. Fix : garder que les `call_line_ids` ⊂ lot du paiement et appel non annulé.
5. **[moyen] Idempotence des paiements** : `post_owner_payment` (et partiellement `post_supplier_payment`) — double-clic = double encaissement. Fix : clé d'idempotence ou garde UI.
6. **[moyen, design] `activate_ag_decisions` atomique** : une seule résolution en échec (ex. clé incomplète) fait rollback de TOUTE l'activation de l'AG, sans trace `failed`. Trade-off voulu — prévoir message d'erreur clair, ou isolation+compensation par action.
7. **[mineur] `src/lib/budget/api.ts` cas VALIDEE** : ne remet plus `rejection_comment` à NULL → dépense rejetée puis re-validée garde son ancien motif. Fix : `validate_budget_expense` peut remettre `rejection_comment=NULL`.
8. **[mineur] `generate_calls_from_ag_payload`** : Σ des N appels ≠ total voté (arrondi non rattrapé sur le dernier appel) — quelques centimes d'écart budget/appels.
9. **[mineur] `v_budget_consumption_by_account`** filtre le réalisé par `tx_date ∈ [start,end]` alors que `fn_annexe_2` filtre par `period_id` → 2 sémantiques de période pour le même « réalisé » (divergence sur écritures de cut-off/antidatées).

**Faux positifs écartés :** nature `budget_type` inconnue (enum = current/works/alur seulement) ; échec de renommage de colonnes sur `v_budget_consumption`/`v_general_ledger` (les vues existantes avaient DÉJÀ ces noms — l'application a réussi).

---

## 3. Gotchas / garde-fous
- **On ne poste que dans une période `open`** (post_ledger_transaction le vérifie). Seul **2027** est ouvert.
- **Le classifier bloque les suppressions et migrations non explicitement consenties** → demander l'OK user avant tout DELETE / `apply_migration`.
- **`.planning/` partiellement versionné** (SESSION + PLAN committés) ; le reste (previews, scripts) non. Décider d'un `.gitignore` si besoin.
- **Migrations appliquées en direct** = toutes rapatriées en fichiers `supabase/migrations/` cette session ; continuer ainsi (fichier + `apply_migration`).
- **Serveur dev** : `npm run dev` dans `Co-Pro-Flex/` → http://localhost:3000.
- **Mémoires à jour** : `ledger_account_model`, `alur_fonds_travaux_accounting`, `ag_auto_population`, `compta_engage_realise`, `finance_first_testable`.

---

## 4. Migrations de la session (référence)
`…011114/011138/011212` (rapatriées WP1) · `…120000/120500/120800` (WP1) · `…130000` (WP3) · `…140000/150000` (WP4) · `…160000/170000/170500` (WP2) · `…180000` (WP4 dépense→ledger).
