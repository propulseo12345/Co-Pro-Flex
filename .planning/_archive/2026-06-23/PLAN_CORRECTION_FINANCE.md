# PLAN DE CORRECTION — Boucle financière (CoProFlex)

> Date : 2026-05-31 · Issu de l'audit des 8 rangs (`spec/SYNTHESE_AUDIT.md`, fiches `01`→`08`).
>
> ## ✅ WP1 TERMINÉ & TESTÉ DE BOUT EN BOUT (2026-05-31, session nuit)
> **Socle posé (3 migrations du matin)** : `resolve_lot_tiers_account` (WP1.1), colonnes TVA (WP1.3), trigger `trg_enforce_lot_id_on_45x` (WP1.7).
>
> **Réécriture des 4 opérations en RPC Postgres atomiques** appelant `create_ledger_transaction` (migration `20260531120000_wp1_finance_rpcs.sql`), + edge functions transformées en **wrappers minces** (déployées v2/v5, source rapatriée dans `supabase/functions/`) :
> | Opération | RPC | Edge | Écriture validée |
> |---|---|---|---|
> | Appel de fonds | `post_call_for_funds` | generate_call_for_funds v5 | N×(D 450-x/lot) / C 701·702·**105** |
> | Paiement copro | `post_owner_payment` | record_payment v2 | D 512 / C 450-x par nature, trop-perçu→450-3 |
> | Facture fourn. | `post_supplier_invoice` | create_supplier_invoice v2 | D 6xx/ligne / C 401, TVA sur la pièce |
> | Paiement fourn. | `post_supplier_payment` | pay_supplier_invoice v2 | D 401 / C 512 |
>
> **Test e2e sur copro `11111111-aaaa-…` (réel)** : appel courant 600€ → 15 écritures 450-1/701 ; paiements intégral/partiel/trop-perçu (450-3) ; facture 600€ TTC (615+611/401) ; règlement (401/512). **Contrôle global : 22 écritures postées, 0 déséquilibrée, 0 sans `source_id`.** Smoke test HTTP de l'edge OK.
>
> **2 bugs trouvés & corrigés au passage** (même anti-pattern de double comptage sur trigger AFTER) :
> - `allocate_payment` : retrait de l'incrément manuel `amount_paid` (le trigger fait foi) — migration `…120000`.
> - `validate_supplier_invoice_total` : ne plus ré-ajouter `NEW.amount` — migration `…120500`.
> - + `source_type='supplier_payment'` ajouté au CHECK `ledger_transactions` — migration `…120800`.
>
> **Correction métier (recherche loi)** : appel **fonds de travaux ALUR** crédite la **réserve `105`** (art. 14-2 II, arrêté 14/03/2005), PAS 701/702 ni 705. Voir mémoire `alur_fonds_travaux_accounting`.
>
> **RESTE mineur WP1** (non bloquant) : backfill `source_id` sur les écritures historiques (les nouvelles l'ont) ; dépréciation formelle `lot_accounts`/411 (WP1.6 — les RPC ne les utilisent déjà plus) ; les données de test e2e partiront au reseed (WP6).
>
> **▶ PROCHAIN LOT : WP2** (auto-propagation AG) — ou WP4 d'abord si on veut un **payoff visible** (dashboard/impayés qui lisent enfin le grand livre désormais correct).
>
> ⚠️ Les 3 autres copros-test n'ont PAS les sous-comptes 450-x (seules `11111111` 16 lots et `22222222` 6 lots sont équipées). Tester sur `11111111`.
> **Scope : FINANCE + LOGIQUE uniquement.** **Différé** : rang 7, rang 8, conformité non-finance, RLS/auth.

---

## 0. La « boucle d'or » à rendre testable

C'est le parcours qu'on veut voir fonctionner de bout en bout :

```
AG vote le budget  ──►  budget ACTIF  ──►  appels de fonds générés (ventilés par clé, par lot)
                                                │
                                                ▼
                              écritures au GRAND LIVRE  (Débit 450-x par lot / Crédit 70x)
                                                │
          ┌──────────────────────┬─────────────┴───────────────┐
          ▼                      ▼                              ▼
   copropriétaire paie   facture fournisseur          dashboard / impayés
   (512 / 450, lettrage) (6xx / 401 = réalisé)        (tout dérive du grand livre)
                                │
                                ▼
                       paiement fournisseur (401 / 512)
```

Tant que cette boucle n'écrit pas au grand livre, **tous** les chiffres restent faux. C'est pourquoi l'ordre ci-dessous part du **socle ledger**.

---

## Ordre des lots (du fondement vers l'aval)

| Lot | Titre | Rang(s) | Effort* | Dépend de |
|---|---|---|---|---|
| **WP1** | Socle grand livre (écritures réelles) | 4 | L (4-6 j) | — |
| **WP2** | Pilier auto-propagation AG | 6 | L (4-6 j) | WP1 |
| **WP3** | Clés & ventilation par sous-compte | 5 | M (3-4 j) | WP1 |
| **WP4** | Source unique dashboard / budget / impayés | 1-2-3 | M (2-3 j) | WP1, WP3 |
| **WP5** | Clôture 408/486 & régularisation + N/N+1 | 1-3-4 | M (3-4 j) | WP1-WP4 |
| **WP6** | Seed cohérent + parcours de test | tous | S (1-2 j) | WP1-WP4 |

\* *Effort indicatif (dev-jours), à affiner selon vélocité. S=petit, M=moyen, L=large.*

> Recommandation : livrer **WP1 → WP6 le plus tôt possible** (dès que WP1-WP4 sont là) pour avoir une démo cliquable, puis WP5. On peut aussi avancer **WP6 en parallèle** (le seed se construit au fur et à mesure).

---

## WP1 — Socle grand livre (écritures réelles) · rang 4

**Problème.** Les 3 edge functions comptables écrivent des colonnes inexistantes (`date`/`transaction_id`/`debit`/`credit`) → tout INSERT échoue, rien n'arrive au grand livre. `source_id` jamais renseigné. `lot_accounts` pointe le 411 (non conforme). `generate_call_for_funds` poste une écriture 450 globale non ventilée.

**Principe directeur.** **Tout passe par la fonction DB canonique `create_ledger_transaction()`** (qui appelle `post_ledger_transaction` via `p_auto_post=true`). Vérifié : cette fonction prend déjà les BONNES colonnes (`tx_date`, `direction`, `amount`, `lot_id`, `source_id`) et équilibre/poste. Les 3 edge functions cassées font au contraire des `INSERT` directs avec colonnes fantômes (`date`/`transaction_id`/`debit`/`credit`) → **on les réécrit pour appeler `create_ledger_transaction`**, on ne rafistole pas les INSERT.

**Modèle de compte acté :** sous-compte par **nature** (450-1 courant / 450-2 travaux / 450-3 avances / 450-4 emprunts / 450-5 ALUR — **déjà créés en base**) + **dimension `lot_id`** sur chaque écriture. Les `411-xxx` sont abandonnés.

**Tâches**
1. **WP1.1** Helper `resolve_lot_tiers_account(copro_id, nature)` → renvoie l'`account_id` du 450-x selon la nature (courant→450-1, travaux→450-2, avances→450-3, emprunts→450-4, ALUR→450-5). (remplace la résolution `code='450'` / `lot_accounts`/411)
2. **WP1.2** Réécrire `record_payment` → ordre : créer le paiement → `allocate_payment` (FIFO) → puis `create_ledger_transaction` : Débit 512 / Crédit 450-x **ventilé par nature des lignes lettrées** (`lot_id` obligatoire), `source_type='payment'`, `source_id=payment.id`. **Trop-perçu / part non lettrée → 450-3 (avances)** [décidé 2026-05-31]. (D-01, D-02)
3. **WP1.3** Réécrire `create_supplier_invoice` → via `create_ledger_transaction` : Débit 6xx (par ligne) / Crédit 401, `label` (pas `date`/`description`), `source_id=invoice.id` ; **capturer `montant_ht`/`montant_tva`/`taux_tva`** sur `supplier_invoices(_lines)`. (D-01, D-08)
4. **WP1.4** Réécrire `pay_supplier_invoice` → via `create_ledger_transaction` : Débit 401 / Crédit 512, `source_id=supplier_payment.id`. (D-01, D-02)
5. **WP1.5** `generate_call_for_funds` : remplacer l'unique écriture 450 globale par **N écritures Débit 450-x par lot** (montant lot-ventilé, `lot_id` porté) / Crédit **701** (courant) ou **702** (travaux), via `create_ledger_transaction` ; `source_id=call.id`. Router la nature via `budget_type` (lien WP3). (D-05, D-07)
6. **WP1.6** Déprécier `lot_accounts`/411 dans les écritures (plus de résolution par compte-par-lot) ; conserver la table pour compat le temps de la migration, mais les écritures passent par 450-x + `lot_id`. (D-03, D-04 revisités par le modèle acté)
7. **WP1.7** CHECK `lot_id NOT NULL` sur les écritures dont le compte est de classe 45x (exempter 70x/71x/768/758) ; nettoyer les 6 écritures orphelines. (D-06)
8. **WP1.8** Renseigner `source_id` partout (déjà supporté par `create_ledger_transaction`) ; ENUM `source_type` (P2, peut suivre). (D-15, D-02)

**Test de validation (preuve)**
- Saisir une facture fournisseur → **2 lignes au grand livre** (6xx débit, 401 crédit), `source_id`=la facture, statut `posted`, HT/TVA enregistrés.
- Enregistrer un paiement copro → **512 débit / 450-x crédit avec `lot_id`**.
- Émettre un appel courant → **autant d'écritures 450-1 que de lots** (chacune avec `lot_id`), somme=total, contrepartie 701.
- `SUM(debit)=SUM(credit)` sur la période ; solde d'un lot = `SUM(450* WHERE lot_id=X)` cohérent.

---

## WP2 — Pilier auto-propagation AG · rang 6

**Problème.** `close_ag` n'enclenche jamais `prepare`/`activate` ; le scrutin n'est pas calculé sur le vrai chemin de finalisation ; `activate_ag_decisions` est partiel, non atomique, à échecs silencieux. → un budget voté ne devient jamais actif, les appels ne partent pas.

**Décisions actées :** activation **à la notification du PV** (pas à la clôture brute), avec **fenêtre de correction** pour le gestionnaire avant envoi, puis **gel**. Art. 24 = majorité des **exprimés** (for+against).

**Tâches**
1. **WP2.1** Orchestrateur serveur unique `finalize_and_activate_ag(ag_id)` en **transaction** :
   `calculate_resolution_result` (toutes résolutions) → `prepare_ag_decisions` → **état « PV en préparation » modifiable** → à « notifier le PV » : `activate_ag_decisions` → **gel** + horodatage (départ du délai de contestation). (VOTES-P0-01/02)
2. **WP2.2** Garantir que **tout** chemin de finalisation calcule le scrutin ; supprimer/relever le `EXCEPTION WHEN OTHERS` silencieux ; **backfill** des AG déjà finalisées (recalcul depuis `ag_votes`). (VOTES-P0-01)
3. **WP2.3** `activate_ag_decisions` : **atomique** (tout-ou-rien ou compensation), `result_data` peuplé, actions `failed` remontées. (VOTES-P0-03)
4. **WP2.4** Câbler les **RPC dédiées** : `CREATE_BUDGET`/`CREATE_WORK`/`CREATE_ALUR` → `create_budget_from_ag` (budget `validated`) ; `SCHEDULE_*` → générateur d'appels unique ; `APPROVE_ACCOUNTS` → clôture période + report N+1 (voir WP5). (VOTES-P1-04/05/06)
5. **WP2.5** **Idempotence** : clé d'idempotence / `IF EXISTS` par cible (pas de budget ni d'appels en double au rejeu). (VOTES-P1, mémoire `ag_auto_population`)
6. **WP2.6** **Unifier les 2 générateurs d'appels** (`generate_calls_from_ag_payload` vs `generate_combined_calls_from_ag`) en un seul, idempotent. (VOTES-P1-07, D-10)
7. **WP2.7** Corriger `compute_majority_threshold` art. 24 → seuil sur `(for+against)`, abstentions exclues. (VOTES-P2-12)
8. **WP2.8** Remplir `ag_resolutions.variables` (payload d'action) à la création/édition de résolution. (VOTES-P1-10)

**Test de validation (preuve)**
- Créer une AG, voter un budget « pour », **notifier le PV** → le budget passe `validated`, des appels sont générés, et les écritures 450/701 apparaissent au grand livre (WP1).
- **Rejouer** l'activation → aucun doublon (idempotence).
- Une résolution avec abstentions est correctement adoptée/rejetée selon les **exprimés**.

---

## WP3 — Clés & ventilation par sous-compte · rang 5

**Problème.** Pas de catégorie (générale/spéciale/ALUR), routage 450 générique (sous-comptes jamais utilisés), clés incomplètes ventilées silencieusement, pas de versioning.

**Décisions :** versioning = `valid_from/valid_to` (reco appliquée) ; base tantièmes paramétrable par copro avec défaut + alerte sans blocage (reco appliquée).

**Tâches**
1. **WP3.1** Colonne `category` (enum `general|special|alur`) sur `repartition_keys` + backfill depuis les noms. (D5-06)
2. **WP3.2** **Routage `budget_type → 450-x`** (`current→450-1`, `works→450-2`, `alur→450-5`) dans le générateur d'appels et la régularisation. (D5-04 = pendant de WP1.6)
3. **WP3.3** **Versioning** `valid_from/valid_to` (+ historique) ; l'appel résout la version active à `issue_date`. (D5-02)
4. **WP3.4** **Validation de complétude** : bloquer l'émission d'un appel si la clé `all_lots` est incomplète (`is_complete=false`) ; `expected_total_weight` + alerte si base ≠ attendue (sans bloquer). (D5-05, D5-03, D5-10)
5. **WP3.5** Source unique des poids = `repartition_key_lines` ; déprécier/synchroniser `lots.tantiemes_*`. (D5-11)
6. **WP3.6** `call_for_funds_lines.repartition_key_id` + `weight_snapshot` (traçabilité + auditabilité). (D5-03)
7. **WP3.7** (Donnée) clé ALUR orpheline : peupler ou désactiver dans le seed. (D5-01)

**Test de validation (preuve)**
- Un appel sur une clé incomplète est **refusé** avec message clair.
- Un appel courant écrit en **450-1**, un appel travaux en **450-2**, ALUR en **450-5**.
- Modifier une clé crée une **nouvelle version** ; les appels passés gardent l'ancienne.

---

## WP4 — Source unique dashboard / budget / impayés · rangs 1-2-3

**Problème.** Mêmes chiffres calculés différemment selon l'écran (vue vs fonction, `CURRENT_DATE`, clés JSON fausses, casse, redondance).

**Tâches**
1. **WP4.1** `fn_dashboard_kpis` : corriger les **6 clés JSON** (`total_tresorerie`/`total_creances`/`total_provisions`/`total_dettes` `->>'exercice_clos'` ; `total_i_charges` `->>'ex_clos_budget_vote'`/`'ex_clos_realise'`).
2. **WP4.2** `v_dashboard_kpis` : `CURRENT_DATE` → **période active** ; ajouter `status='posted'` ; filtrer `budget.status`.
3. **WP4.3** `v_general_ledger_by_account_class` : ajouter `AND status='posted'`.
4. **WP4.4** Bug de casse `'critical'` → `'CRITICAL'` (alerte impayés muette).
5. **WP4.5** `v_budget_consumption_by_account` : `status='posted'` + inclure `'closed'` ; rebrancher `v_budgets_overview`/`v_budget_lines_overview`/`useBudget` dessus (réalisé = ledger).
6. **WP4.6** Unifier « voté » = `validated`/`closed` partout (exclure `submitted` dans `fn_annexe_2`).
7. **WP4.7** Supprimer la **redondance dashboard** (une seule implémentation par KPI, alignée ledger).
8. **WP4.8** **Trésorerie = 2 KPI** (comptable ledger 5xx postés + solde bancaire relevés).
9. **WP4.9** **Impayé = appels échus non lettrés** (`v_unpaid_by_lot` canonique) ; requalifier `v_unpaid_lots` en diagnostic.

**Test de validation (preuve)**
- Le « budget consommé » est **identique** sur le dashboard, la page budget et l'annexe 2.
- La trésorerie affiche 2 chiffres distincts cohérents.
- Les impayés correspondent aux appels échus non lettrés (et non au solde net 450).

---

## WP5 — Clôture 408/486, régularisation & transition N/N+1 · rangs 1-3-4

**Décisions actées :** clôture 408/486 = **assistant semi-auto** (OS exécutés non facturés proposés + saisie manuelle), extourne N+1 auto ; transition N/N+1 = **période multi-état**.

**Tâches**
1. **WP5.1** Période **multi-état** : lever `enforce_single_open_period` ; statut riche par exercice (`appels_ouverts`/`saisie_ouverte`/`en_inventaire`/`figé`) ; figeage à l'approbation AG. (angle mort #2)
2. **WP5.2** Assistant de clôture **408** (FNP) : proposition depuis l'engagement (OS réalisés non facturés) + saisie manuelle ; écriture Débit 6x / Crédit 408 ; **extourne N+1 auto**. **486** pour charges à cheval. (angle mort #3)
3. **WP5.3** **Régularisation de fin d'exercice** : suivre **Appelé (70x)** distinct du **Réalisé (classe 6)** (ne jamais additionner) ; répartir excédent/déficit par lot (459/450). KPI dédié. (angle mort #5)
4. **WP5.4** Couche **engagement** (`budget_expenses` requalifiée + `service_orders`/`contracts` → `budget_line_id`) pour alimenter le « engagé » et les propositions 408. (rang 3, P1)

**Test de validation (preuve)**
- À la clôture, un OS réalisé non facturé propose un 408 ; après validation, le réalisé inclut la charge ; l'extourne apparaît en N+1.
- L'annexe 2 distingue Appelé / Réalisé et l'écart est réparti par lot.

---

## WP6 — Seed cohérent + parcours de test

**But.** Des données factices qui exercent toute la boucle d'or, pour cliquer dans l'app et vérifier la cohérence.

**Contenu du seed**
- 1 copro, ~6-8 lots avec tantièmes (clé générale complète à base contrôlée + 1 clé spéciale `subset` ex. ascenseur).
- 1 exercice ouvert ; 1 budget voté **via le flux AG** (pour tester WP2) → budget actif + appels générés (WP1/WP3).
- Quelques paiements copro (dont **1 partiel** pour tester le lettrage) → écritures 512/450.
- 1-2 factures fournisseurs (avec HT/TVA) payées → 6xx/401 puis 401/512.
- (optionnel WP5) 1 OS réalisé non facturé pour la clôture 408.

**Parcours de test documenté** (check-list cliquable) : ouvrir le dashboard → vérifier budget/réalisé/trésorerie/impayés ; ouvrir la page budget → même réalisé ; ouvrir les impayés → cohérents avec les appels échus non lettrés ; chaque chiffre **traçable** à une écriture du grand livre.

---

## Récapitulatif des décisions appliquées (modifiables)

| Sujet | Décision retenue | Source |
|---|---|---|
| Compte tiers | 450 + sous-comptes 450-1/2/3/5 par nature | actée |
| **Modèle compte tiers** | **sous-compte par NATURE (450-1/2/3/4/5) + dimension `lot_id`** sur chaque écriture. Solde d'un lot = somme des 450-x filtrée sur `lot_id`. Les `411-xxx` (un compte par lot) sont **abandonnés** (non conformes). `lot_accounts` déprécié dans les écritures. | actée 2026-05-31 |
| Compte 450 en mutation | **suit le lot** (Option A) : pas de compte à fermer (c'est une dimension `lot_id`), on fige juste le solde du lot à l'état daté ; historique via `lot_owners` daté | actée |
| Prorata mutation | exigibilité des appels (légal) ; temporis réglé chez le notaire | actée |
| Pouvoirs art. 22 | avertir sans bloquer, **mais alerte visible + tracée** (qui passe outre, quand) — protège le syndic (art. 42) | actée |
| Trop-perçu paiement copro | part non lettrée (paiement > total dû) → **450-3 (avances)** | actée |
| Environnement de correction | **direct sur `iyfesbjnkpynmwlsmxnp`** (peu de données, surtout seed) | actée |
| Provision appel | Crédit 701 (courant) / 702 (travaux) / **105 (fonds travaux ALUR, réserve)** | actée 2026-05-31 (loi) |
| Versioning clés | `valid_from/valid_to` + historique | reco |
| Base tantièmes | paramétrable/copro, défaut contrôlé, alerte sans blocage | reco |
| Art. 24 | majorité des exprimés (for+against) | actée |
| Activation décisions AG | à la notification du PV, fenêtre de correction puis gel | actée |
| TVA | hors champ TTC + capture HT/TVA/taux sur factures (briques) | actée |
| Impayé | appels échus non lettrés | actée |
| Trésorerie | 2 KPI (comptable + bancaire) | actée |
| Transition N/N+1 | période multi-état | actée |
| Clôture 408/486 | assistant semi-auto + saisie manuelle | actée |

## Explicitement DIFFÉRÉ (hors ce plan)
Rang 7 (mutations, état daté, prorata, conseil syndical art. 21-22) · Rang 8 (GED, communication, maintenance hors lien charge, extranet ALUR, RGPD, DTG/PPT) · RLS/auth.
