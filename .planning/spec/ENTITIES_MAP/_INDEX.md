# ENTITIES_MAP — Audit logique métier CoProFlex

> Spec durable + backlog de dette + support de validation métier.
> Chaque fiche colle 1-1 aux tables/vues/fonctions Supabase réelles et trace chaque écart à une preuve.
> Projet Supabase : `iyfesbjnkpynmwlsmxnp`. Démarré le 2026-05-30.

## Arbitrages métier validés (utilisateur, expert copropriété)

- **Source unique de vérité = le GRAND LIVRE** (`ledger_entries`). Ce n'est pas un choix d'archi : c'est **légalement obligatoire** (décret 2005-240 + art. 14-3 loi 65-557 — partie double + droits constatés). Voir mémoire `compta_engagement`.
- **« Budget consommé »** = charges comptabilisées **classe 6 en comptabilité d'engagement** (dès la facture, pas au paiement) — **à condition que le grand livre soit TOUJOURS alimenté**.
- **Quorum AG** : on **affiche** la présence/quorum mais **on ne bloque rien** (pas de quorum légal en copro).
- **Clé de répartition ALUR** : clé par **défaut = clé des charges générales** (tantièmes généraux) sauf vote contraire ; assiette = **≥ 5 % du budget COURANT** (art. 14-2-1 ; **+ ≥ 2,5 % du PPT** si un plan pluriannuel est adopté).
- **Budget « voté »** = budgets **approuvés en AG** (`status IN ('validated','closed')`) ; `submitted` **exclu**. Distinguer *voté (acte)* = passage à `validated`, de *voté (agrégat lu)* = `validated`+`closed`.
- **Période active** = exercice **`open`** (unique par copro) **+ sélecteur** d'année ; remplace `CURRENT_DATE` partout.
- **Décision d'AG → incrément auto** des données copro (budget voté → actif + appels, comptes approuvés → clôture/report…), via `ag_pending_actions`/`activate_ag_decisions` à fiabiliser (rang 6). Voir mémoire `ag_auto_population`.
- **Comptabilité d'engagement** : le réalisé se rattache à l'**exécution** de la prestation (pas à la date de facture), cut-off **408/486** à la clôture.
- **Trésorerie** : afficher **deux indicateurs distincts** au dashboard — trésorerie *comptable* (grand livre 5xx) **et** *solde bancaire à l'instant T* (relevés) ; `bank_movements` conservé pour le **rapprochement bancaire** (jamais source rivale de la compta).
- **Compte copropriétaires (450/411)** : `lot_id` **obligatoire** — tout mouvement est toujours lié à un lot ; appel de fonds ventilé par lot.
- **`budget_expenses` / cycle des dépenses → TRANCHÉ** : modèle **Voté / Engagé / Réalisé / Disponible** au go-live. Réalisé = grand livre (classe 6) ; engagé = contrats + OS **+ saisie manuelle** (prévient sans bloquer si pas de justificatif, mais crée l'écriture) ; engagement né à la signature devis/OS ; dépassement = **fige l'initial + avenant séparé**. Défauts : contrat = 1 ligne annuelle, seuil d'alerte configurable (10 %). Cf. `research/cycle-depense.md`.
- **Pré-remplissage auto en AG** (ex. budget N = report du final voté N-1) : à spécifier rangs 3 (Budget) & 6 (AG). Voir mémoire `ag_auto_population`.
- Auth réelle + RLS = **hors périmètre** de cet audit (chantier séparé).

## Glossaire des termes à désambiguïser

| Terme | Définition retenue | Source unique |
|---|---|---|
| **Budget consommé / réalisé** | Charges comptabilisées classe 6 en *engagement* (PAS le payé) | `ledger_entries` comptes 6xx postés |
| **Solde** (copropriétaire/lot) | Position nette au compte 450/411 | `ledger_entries` compte 450, par lot |
| **Impayé** | Solde *débiteur* du compte 450 | même source (ledger 450), filtré débiteur |
| **Trésorerie « banque » vs « compta »** | La trésorerie officielle = ledger 5xx posté ; la banque (`bank_movements`) sert au *rapprochement*, jamais de source rivale | `ledger_entries` comptes 5xx postés |
| **Engagement** | Enregistrement de la charge à la date de facture, pas au paiement (art. 14-3) | — |

## Matrice « concept → source unique de vérité »

| Concept | Source unique CIBLE | Calculé aujourd'hui depuis | Statut |
|---|---|---|---|
| Trésorerie (classe 5) | ledger 5xx postés (**comptable**) **+** KPI distinct solde bancaire instant T (`bank_movements`, rapprochement) | `v_account_balances` (bank_movements) **ET** `fn_annexe_1` (ledger) → écart **6 521,49 €** | 🔴 BUG |
| Budget réalisé/consommé | ledger 6xx postés (engagement) | `fn_annexe_2` (ledger) **ET** `budget_expenses` (orpheline) | 🔴 BUG |
| Solde copropriétaire | ledger 450 par lot/owner | `v_owner_balance` ← `v_lot_balance` | 🟠 PARTIEL |
| Solde lot | ledger 450/411 avec lot_id | `v_lot_balance` (via lot_id) | 🟠 PARTIEL |
| Impayés | ledger 450 débiteur | dérivé du 450 (incomplet) | 🔴 BUG |
| Balance par classe | `v_trial_balance` (posted) | `v_general_ledger_by_account_class` (draft+posted) | 🔴 BUG |

## Statut des entités (ordre d'audit validé)

| Rang | Entité | Fiche | Statut |
|---|---|---|---|
| 1 | **Grand livre & comptes** | `01-grand-livre.md` | 🟡 BROUILLON (en revue) |
| 2 | **Dashboard KPIs** | `02-dashboard-kpis.md` | 🟡 BROUILLON (en revue) |
| 3 | **Budgets & réalisé** | `03-budget.md` | 🟡 BROUILLON (en revue) |
| 4 | Appels de fonds, paiements & pont lot↔compte | `04-appels-paiements.md` | 🟡 BROUILLON (audité) |
| 5 | Tantièmes & clés de répartition | `05-tantiemes-cles.md` | 🟡 BROUILLON (audité) |
| 6 | AG — votes & majorités | `06-ag-votes.md` | 🟡 BROUILLON (audité) |
| 7 | Mutations/état daté & rôles | `07-mutations-conseil.md` | 🟡 BROUILLON (audité) |
| 8 | GED / communication / maintenance | `08-ged-comm-maintenance.md` | 🟡 BROUILLON (audité) |

> ✅ **AUDIT DES 8 RANGS TERMINÉ (2026-05-31).** Synthèse de clôture : `../SYNTHESE_AUDIT.md`. Prochaine étape = plan de correction priorisé.
