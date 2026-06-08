# PROGRESS — Finition des 5 trous du module budget

**Feature :** compléter les morceaux non implémentés du module budget (Finance)
**Branche :** finance-drift-rebranchement
**Démarré :** 2026-06-08
**Tracker maître projet :** `.planning/PROGRESS_REFONTE.md` (ce doc en est un sous-chantier)

> Constat de départ (2026-06-08) : le module budget est **déjà branché à Supabase de
> bout en bout** (lectures `useBudgetData` « Supabase only », écritures
> `useBudgetMutations` → `lib/budget/api.ts`, orchestrateur `useBudget`). Le snapshot
> SESSION.md qui annonçait un « drift enum/colonnes » à corriger était **périmé** :
> ce point est déjà fait. Le vrai travail = finir 5 trous fonctionnels.

---

## Cycle de vie d'un budget (où se logent les trous)

```
   1. CRÉATION (brouillon)                                    ✅ branché
      │   budget + postes + devis + échéancier
      ▼
   2. VOTE EN AG ───────────────────────────────► 🕳️ #4  lien AG↔budget (à CADRER)
      │   la résolution votée active le budget
      ▼
   3. BUDGET ACTIF / VOTÉ
      ├──────────────► 🕳️ #2  transformer en appels de fonds (NON-trivial)
      │                            ▼
      │                🕳️ #3  générer le prochain appel (NON-trivial : mock→DB)
      ▼
   4. VIE DU BUDGET
      │   dépenses sur postes + validation comptable          ✅ branché
      │   [budget TRAVAUX] ──► 🕳️ #1  affecter le fonds ALUR  ✅ SPEC FAITE
      ▼
   5. CLÔTURE → résultat → à-nouveau (110/120)                ✅ branché

   À CÔTÉ : 🕳️ #5  mock budget-maintenance = CODE MORT → suppression
```

---

## Les trous (inventaire révisé après 2 revues adversariales — 2026-06-08)

> Les efforts « léger » du tracket initial ont été **corrigés** par la revue : #2 et #3 ne
> sont PAS du simple câblage (cf. section « Re-vérification »). Inventaire complété des
> trous oubliés (Export PDF, InvoicePicker, getBudgetN1…), tous réintégrés au périmètre,
> mais l'ordre commence par #1.

| # | Trou | Ce que ça fait | État | Effort réel |
|---|------|----------------|------|-------------|
| 1 | Affectation fonds ALUR (+ TransferModal codé en dur, `historiqueTransferts` vide) | Financer des travaux votés depuis le fonds | **Spec + plan écrits, revus 🟢 go-with-fixes** | Moyen |
| 4 | Lien AG ↔ budget | Afficher le vote qui a approuvé un budget | **Cadré = affichage seul** | Faible (front-only) |
| 2 | Budget → appels de fonds | Générer les appels d'un budget voté | À faire | **Non-trivial** (wrapper `post_budget_call_for_funds` ~90 l. : validation clés + idempotence + boucle échéances) |
| 3 | Générer prochain appel | Émettre l'appel suivant de l'échéancier | À faire | **Non-trivial** : `echeancier` jamais mappé + handler no-op + logique sur mock → migration mock→DB + décision d'archi |
| 5 | Mock budget-maintenance | (rien — code mort) | À supprimer | Faible — supprimer service **+ `mock-data.ts` + ré-export `Budget/index.ts:9`** |
| 6 | **AFFECT_ALUR_FUND (suivi #1)** | Déclencher l'affectation ALUR depuis une résolution d'AG | À faire (2e étape) | Moyen (réutilise `post_alur_transfer`) |
| 7 | Export PDF budget | Bouton stub (`alert`/no-op) sur `budgets/page.tsx` + `budget-works/page.tsx` ; `BudgetHeader.tsx` non monté (code mort) | À faire | Faible |
| 8 | InvoicePickerModal sur mock | Lit `MOCK_FACTURES` (factures non branchées) | À faire (dépend du module Factures) | Moyen |
| 9 | `getBudgetN1` faux | Renvoie les postes de l'année COURANTE en guise de N-1 (reprise de postes erronée) | À faire | Faible |

---

## Ordre d'exécution prévu

**On commence par #1** (décision USER 2026-06-08), puis :
1. **#1 — implémentation** (spec + plan prêts, revus). Inclut la réécriture de TransferModal et le peuplement de `historiqueTransferts`.
2. **#4 — affichage du lien AG** (front-only, léger).
3. **#2 puis #3 — appels de fonds** (non triviaux : prévoir le temps).
4. **#5 — suppression du code mort** (service + mock-data.ts + ré-export).
5. **#6 AFFECT_ALUR_FUND**, puis #7 (Export PDF), #9 (`getBudgetN1`), #8 (InvoicePicker, dépend de Factures).

---

## Décisions actées

### Trou #1 — Affectation fonds ALUR (validé USER 2026-06-08)
- Affectation **aux travaux votés uniquement** (fonds réglementé art.14-2) ; refus
  explicite de la destination compte courant.
- Le bouton fait **seulement la décision comptable** (D105/C705) ; le mouvement de cash
  réel (Livret A 502 → courant 512) est **tracé à part** avec un **rappel** tant qu'il
  n'est pas réglé.
- Écritures : affectation **D105/C705** (`source_type='transfer'`) ; règlement cash
  **D512/C502**. Destination enum = `'works'`.
- Règle de **cut-off** : l'affectation doit être postée dans le même exercice que la
  charge de travaux (pour la neutralisation à la clôture via le 705→110).
- Audit cascade 🟢 (aucun double-comptage, comptes seedés/postables, `'transfer'` déjà
  dans l'enum, FK saines). Détail dans la spec.
- Migration cible : **0037** (0036 = dernière ; à coordonner avec « appels hors budget »).

### Transverses (préférences USER, en mémoire)
- Jamais de refus silencieux → toujours un message expliquant le refus.
- Vision long terme : connexion API bancaire **en lecture seule** pour réconcilier le
  règlement du cash (cocher le rappel automatiquement).

---

## Trou #4 — CADRÉ (2026-06-08)

Décision : **affichage seul**. Le moteur AG est déjà bâti côté base (résolutions avec
`linked_budget_id`, budgets avec `source_ag_id`, file `ag_pending_actions`, RPC
`activate_ag_decisions` qui valide les budgets / poste les appels / clôture). Le module
budget se contente donc d'**afficher** le lien existant (« budget voté à l'AG du …,
résolution n°… ») via `source_ag_id` ; le vote et l'activation restent dans le module AG
(chemin canonique, pas de duplication). Conséquences front :
- `useBudget.ts` : remplacer `resolutionsAG: []` par la lecture réelle du lien AG des
  budgets affichés (date AG + n° résolution + majorité).
- Neutraliser/retirer l'action « lier à une AG » côté budget (`handleLinkToAG` qui
  changeait juste un statut) — le module budget ne vote pas.
- Front-only, **pas de migration**.

## Découverte clé (2026-06-08) : maillon ALUR↔AG manquant

L'enum `ag_action_type` a `CREATE_ALUR_FUND` (= cotisation qui REMPLIT le fonds,
D450-5/C105) mais **aucune action pour AFFECTER le fonds à des travaux** (D105/C705). Or
l'utilisation du fonds est une décision d'AG. → nouvel item **#6 AFFECT_ALUR_FUND** :
ajouter la valeur d'enum + une branche dans `activate_ag_decisions` qui appelle la
**même** RPC `post_alur_transfer` (cœur partagé). Décidé : on livre #1 (bouton manuel)
d'abord, le chemin AG suit.

---

## Re-vérification adversariale (2 workflows ultra — 2026-06-08)

**Workflow 1 — revue du SQL 0037** : verdict **go-with-fixes**. Architecture comptable
jugée juste, mais 1 blocker (gate infaisable : palier (e) viole `uq_budget_version` +
`uq_budget_one_validated`) + majors (refus silencieux si période close, pas de
sérialisation anti-double-clic, solde affiché divergent, gate ne testait NI la
neutralisation 705→110 NI la garde sécu NI le crédit 705). → corrigés dans le plan.

**Workflow 2 — re-vérif du solo du jour** : socle confirmé exact (branchement Supabase,
trous #1/#2/#4, code mort #5, tout l'AG, audit cascade #1). Coquilles corrigées :
- `post_call_for_funds` **bannie** (n'existe pas en base — vérifié `pg_proc`) ; seule
  `post_budget_call_for_funds` existe. Doc corrigée.
- Plafond ALUR : **solde cumulé du 105**, PAS `v_alur_fund_summary` (par exercice). Doc corrigée.
- #2/#3 requalifiés non-triviaux ; #5 complété ; trous #7/#8/#9 ajoutés.

### Décision — source unique du solde du fonds (USER 2026-06-08)
Le « solde disponible » du fonds ALUR = **solde cumulé du compte 105** (Σ crédit−débit,
toutes périodes postées), côté serveur ET côté front. Le plan ajoute une vue
`v_alur_fund_balance` que la modale/bandeau/`useBudget` consomment. On abandonne le
solde par exercice (`v_alur_fund_summary`) comme borne de saisie.

### DETTE finance confirmée (hors chantier ALUR)
`src/lib/finance/api.ts:342` (`createCall`, chemin appel de fonds mono-clé du front)
appelle `post_call_for_funds` — **RPC inexistante** dans la base 0001→0036 (vérifié :
`select … from pg_proc` ne renvoie que `post_budget_call_for_funds`). Ce chemin est donc
**cassé** contre le schéma cible. À traiter séparément : migrer `createCall` vers
`post_budget_call_for_funds` (ou statuer). NE PAS mélanger au #1.

---

## Artefacts liés

- Spec #1 : `docs/superpowers/specs/2026-06-08-affectation-fonds-alur-design.md`
- Plan #1 : `docs/superpowers/plans/2026-06-08-affectation-fonds-alur.md` (revu, fixes intégrés)
- Code concerné : `src/hooks/modules/useBudget.ts` (`handleTransferALUR:447`,
  `resolutionsAG:[] :821`, `getBudgetN1:656`, `historiqueTransferts:350/358`),
  `src/lib/budget/api.ts`,
  `src/components/features/finance/Budget/modals/TransferModal.tsx` (codé en dur),
  `src/lib/services/budget-maintenance.service.ts` + `Budget/mock-data.ts` + `Budget/index.ts:9` (#5 à supprimer).

---

## Journal d'avancement

- [x] **2026-06-08** — Audit du module budget : snapshot périmé, branchement Supabase OK,
      5 trous identifiés et triés.
- [x] **2026-06-08** — Trou #1 cadré (décisions métier) + audit cascade 🟢 + spec écrite.
- [x] **2026-06-08** — Trou #4 cadré (affichage seul) + découverte du maillon ALUR↔AG manquant (→ item #6).
- [x] **2026-06-08** — Plan #1 écrit, puis **2 revues ultra** (SQL 0037 + re-vérif solo) ; coquilles corrigées dans plan/spec/tracker ; dette createCall confirmée ; décision source-105.
- [ ] **Trou #1** — implémentation (migration 0037 + harnais + branchement front).
- [ ] **Trou #4** — affichage du lien AG (front-only, lecture `source_ag_id`).
- [ ] **Trou #2** — transformer budget → appels de fonds (câblage).
- [ ] **Trou #3** — générer le prochain appel (câblage échéancier).
- [ ] **Trou #5** — supprimer le code mort budget-maintenance.
- [ ] **Trou #6** — AFFECT_ALUR_FUND : affectation ALUR déclenchée par l'AG (réutilise post_alur_transfer).
