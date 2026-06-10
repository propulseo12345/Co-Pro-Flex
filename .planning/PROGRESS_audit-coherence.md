# PROGRESS — Audit logique métier & cohérence des données (CoProFlex)

> Suivi vivant de la refonte. Multi-sessions. Dernière MAJ : 2026-05-30.
> Branche `v2` @ `51c2ea7`. Spec : `.planning/spec/ENTITIES_MAP/`. Recherche : `.planning/spec/research/`.
> **Aucune modif de code/base à ce stade** — l'audit produit de la documentation ; les corrections viendront après (plan priorisé).

---

## 0. Objectif & cadre

Auditer **le fonctionnement et la cohérence de TOUTES les données** de l'app, pour qu'un syndic puisse faire confiance à l'outil au go-live. Déclencheur : un même chiffre diffère d'un écran à l'autre (budget consommé 0 € vs 5 430 €, trésorerie 1 325 € vs 0 €). Cause profonde : la logique a été construite écran par écran, chaque écran calcule depuis une source différente, et le grand livre est peu/mal alimenté.

**Périmètre :** audit transversal de toutes les entités. **Hors périmètre :** auth réelle + RLS (chantier séparé).

**Référence de vérité = les DEUX combinés :** (1) les PDF `Logique metier/` (cahier des charges) ; (2) la loi de la copropriété (loi 65-557, décret 67-223, décret comptable 2005-240). On croise et on signale les écarts.

---

## 1. Principe fondateur (acquis, vérifié en droit)

**Le GRAND LIVRE (`ledger_entries`) est la source unique de vérité financière** — ce n'est pas un choix d'archi, c'est **légalement obligatoire** : comptabilité copro en **partie double + droits constatés (engagement)** depuis 2006 (décret 2005-240 + arrêté 14/03/2005, art. 14-3 loi 65-557). Toute opération financière doit générer une écriture ; le « réalisé » = charges classe 6 comptabilisées ; le saisir hors grand livre = risque de **nullité des comptes** (art. 42). Voir mémoires `compta_engagement`, `compta_engage_realise`.

---

## 2. Méthode & dynamique

- **Une fiche de spec par entité** dans `ENTITIES_MAP/`, gabarit fixe à 7 sections (Identité · Modèle de données + source de vérité · Règles métier + loi · État réel en base · Mal implémenté/dette P0-P3 · Sources divergentes → source unique · Questions expert). Statut : BROUILLON → validé.
- Chaque dette tracée à une vue/fonction + preuve. Chaque flou → question à l'expert.
- **Dynamique de travail (important) :** dialogue d'experts. Claude prend des positions argumentées (droit + code + sources), recommande, et **challenge** l'utilisateur (expert syndic) ; réciproquement. Voir mémoire `expert_challenge`. Ne pas être un simple exécutant.
- Outil : lecture seule via MCP Supabase (projet `iyfesbjnkpynmwlsmxnp`) + workflows d'audit par rang.

---

## 3. Avancement par rang

| Rang | Entité | Fiche | Statut |
|---|---|---|---|
| 1 | Grand livre & comptes | `01-grand-livre.md` | ✅ Audité (brouillon validé sur décisions) |
| 2 | Dashboard KPIs | `02-dashboard-kpis.md` | ✅ Audité |
| 3 | Budgets & réalisé | `03-budget.md` | ✅ Audité, **toutes décisions métier tranchées** |
| 4 | **Appels de fonds, paiements & pont lot↔compte** | `04-appels-paiements.md` | ✅ Audité (16 dettes, 5 P0 confirmées) |
| 5 | **Tantièmes & clés de répartition** | `05-tantiemes-cles.md` | ✅ Audité (16 dettes, 2 P0, 7 P1) |
| 6 | **AG — votes, majorités & auto-propagation des décisions** | `06-ag-votes.md` | ✅ Audité (17 dettes, 3 P0 — pilier non opérationnel) |
| 7 | **Mutations/état daté & rôles (conseil syndical)** | `07-mutations-conseil.md` | ✅ Audité (12 dettes, 3 P0) |
| 8 | **GED / communication / maintenance** | `08-ged-comm-maintenance.md` | ✅ Audité (~5 P0 ponts OS→facture, ~14 P1 ; RLS comm hors périmètre) |

*Symptôme ancre (budget/trésorerie) : **entièrement expliqué** (rangs 1-2). Cause = 3 ponts d'alimentation cassés + bugs de vues/clés JSON + double implémentation dashboard.*

---

## 4. Décisions métier ACTÉES (ne pas rouvrir)

**Grand livre / Trésorerie**
- Grand livre = source unique (obligation légale).
- Trésorerie au dashboard = **2 KPI distincts** : trésorerie *comptable* (ledger 5xx postés) **et** *solde bancaire à l'instant T* (relevés). `bank_movements` conservé pour le **rapprochement bancaire**, jamais source rivale.
- `lot_id` **obligatoire** sur les écritures du compte copropriétaires (450/411) → appel de fonds **ventilé par lot**.

**Budget — modèle Voté / Engagé / Réalisé / Disponible**
- **Réalisé = TOUJOURS le grand livre** (classe 6 postés, via `v_budget_consumption_by_account`). `budget_expenses` perd ce rôle.
- `budget_expenses` **requalifiée en couche d'ENGAGEMENT** + porte de saisie manuelle : sans justificatif → **prévient sans bloquer**, mais **génère quand même l'écriture** (à arbitrer vs B4, cf. review en cours).
- **Engagement** = signature devis / émission OS (récurrent : mise en cours du contrat), **pas** au vote d'AG.
- **Dépassement** = on **fige** le montant engagé/voté initial + **avenant historisé séparément** (jamais d'écrasement). Seuil d'alerte **global + configurable** (défaut 10 %, prévient sans bloquer).
- **« Budget voté »** = `status IN ('validated','closed')` ; `submitted` **exclu**.
- **Exercice clos** = réalisé **figé** (snapshot annexe 2 approuvée) ; recalcul live seulement pour l'exercice ouvert.
- **Appels de provisions** = auto-générés en **brouillon** au vote, **émis par le gestionnaire** (écriture de provision à l'émission).
- **Travaux urgents (art. 18)** = statut dédié « engagé par le syndic, ratification en attente » (charge au ledger avant le vote).
- **Rattachement temporel** : courant = annuel ; **travaux = par opération (pluriannuel)** ; **ALUR = cagnotte permanente** (hors exercice).
- **Pont engagement↔charge** = créer la FK `providers ↔ suppliers`.
- Clé de répartition **ALUR = clé propre**, assiette = **5 % minimum** du budget courant (modulable à la hausse).

**Dashboard**
- Période de référence = exercice **`open` par défaut + sélecteur** (jamais `CURRENT_DATE`).
- Seuils de sévérité des impayés **paramétrables** ; « critique » = seuil de **mise en demeure** (art. 19).
- Une **seule implémentation** par KPI, alignée sur le grand livre (supprimer la redondance vue `v_dashboard_kpis` vs fonction `fn_dashboard_kpis`).

**Transverse (pilier rang 6)**
- **Les décisions votées en AG incrémentent automatiquement les données de la copro** (budget voté → actif, travaux → opération + appels, comptes approuvés → clôture + report N+1, CS élu → conseil…). Mécanisme existant `ag_pending_actions` → `activate_ag_decisions` / `create_budget_from_ag` à **fiabiliser** (idempotence, remontée d'erreurs). Voir `ag_auto_population`.
- **Report N-1 → N** : pré-remplissage du budget N depuis le final voté N-1 (à spécifier rangs 3 & 6).

**TVA / Exercices / Clôture (rang 4 — tranché 2026-05-30, sources BOFIP / Sénat 2005 / ARC / Compta-Online)**
- **TVA** : la compta du syndicat reste **hors champ, en TTC** — même en immeuble mixte avec commerces (le syndicat n'est pas assujetti pour sa mission légale de conservation/administration). Go-live : **garder seulement 2 briques** (irréversibles/triviales) — ① champ **HT/TVA/taux sur les factures fournisseurs**, ② **flag « assujetti »** sur lot/copropriétaire. **Déférés** (à la demande d'un vrai client) : le **générateur d'attestation de TVA déductible** (cas B — compte 4458, prorata clé × usage, taux réduit habitation / normal autre) et le **cas C bailleur** (location de parties communes = produit réparti aux copropriétaires / revenus fonciers 2044, **pas** une TVA collectée par le syndicat). Parc cible à dominante résidentielle → priorité = P0 ledger, pas l'attestation.
- **Transition N/N+1** : lever `enforce_single_open_period`. **Période multi-état** — statut riche par exercice (`appels_ouverts` / `saisie_ouverte` / `en_inventaire` / `figé`), plusieurs exercices actifs en parallèle avec droits distincts. **Figeage définitif à l'approbation en AG** (se raccorde au pilier AG→données, rang 6).
- **Clôture 408/486** : **assistant de clôture semi-automatique** — la couche engagement (OS exécutés non facturés) **propose** les écritures 408 (Débit 6x / Crédit 408), le gestionnaire **valide/estime**, **extourne N+1 générée auto** ; **+ saisie 408/486 manuelle** pour les charges à cheval hors OS (eau, élec, contrats). Pas de trigger 100 % aveugle.

**Rang 4 — Appels / paiements (tranché 2026-05-30, cf. fiche 04)**
- **Compte tiers copropriétaire = 450 + sous-comptes par nature** (4501 courant / 4502 travaux / 4503 avances / 4504 emprunts), un jeu par lot. Pilote D-03 (refonte `lot_accounts` 411→450) et D-04 (trigger de création des sous-comptes à l'INSERT d'un lot, selon nature).
- **Impayé = solde restant dû échu** (pas le montant initial) ; on relance le reste.
- **Relance** : échéance comptable à `due_date` (J+0), 1ʳᵉ relance **paramétrable** (défaut J+15).
- **Mise en demeure (art. 19-2)** = **LRAR suffit** (huissier seulement au contentieux) ; après mise en demeure, **déchéance du terme** → provisions non échues exigibles.
- **Compte de provision** : Crédit **701** (courant) / **702** (travaux).
- **Charges classe 6 mutualisées** (eau, élec…) = **sans `lot_id`** (communes) ; ventilation par lot via la **clé** à l'appel/régularisation. La contrainte `lot_id` (D-06) ne vise **que le 450**.
- *Ouvert :* les 3 edge functions cassées ont-elles tourné via l'UI en prod (→ paiements/factures non comptabilisés à reconstituer) ou la donnée correcte est-elle seedée ? (à confirmer avec l'expert).

---

## 5. Backlog de correction (consolidé rangs 1-3 — à exécuter APRÈS l'audit)

> ⚠️ **Prérequis bloquant n°1** : tant que les ponts d'alimentation sont cassés, le grand livre reste vide et tout le « réalisé » reste à 0.

**P0**
1. Réparer les **3 edge functions cassées** `create_supplier_invoice`, `pay_supplier_invoice`, `record_payment` (colonnes : `tx_date`/`tx_id`/`direction`/`amount`). Idéalement → fonctions DB (`post_supplier_invoice`) routant tout par `create_ledger_transaction`/`post_ledger_transaction`.
2. `fn_dashboard_kpis` : corriger les **6 clés JSON** (`total_tresorerie`/`total_creances`/`total_provisions`/`total_dettes` `->>'exercice_clos'` ; `total_i_charges` `->>'ex_clos_budget_vote'`/`'ex_clos_realise'`).
3. `v_dashboard_kpis` : remplacer `CURRENT_DATE` par la **période active** ; ajouter `status='posted'` ; filtrer `budget.status`.
4. `v_general_ledger_by_account_class` : ajouter `AND lt.status='posted'`.
5. Bug de casse : `'critical'` → `'CRITICAL'` (`critical_unpaid_count` + `v_dashboard_todos`) — l'alerte impayés critiques est muette.
6. Rebrancher `v_budgets_overview`/`v_budget_lines_overview`/`useBudget` sur **`v_budget_consumption_by_account`** (réalisé ledger).
7. `v_budget_consumption_by_account` : ajouter `status='posted'` + inclure `'closed'`.
8. Unifier la définition « voté » = `validated`/`closed` partout (exclure `submitted` dans `fn_annexe_2`).
9. Supprimer la **redondance dashboard** (une seule implémentation, ledger).

**P1**
- Câbler la **couche engagement** (`budget_expenses` requalifiée + `service_orders`/`contracts` → `budget_line_id`).
- **Unifier les 2 générateurs d'appels** (par clé de répartition) + émission + écriture de provision (45/70).
- `source_id` renseigné sur `ledger_transactions` (backref pièce↔écriture).
- Adosser **ALUR (105)** au ledger ; **trésorerie 2 KPI** ; FK **providers↔suppliers** ; assouplir `period_id` pour works/ALUR.

**P2/P3**
- Équilibre débit=crédit contraint en base ; verrou période au niveau ligne ; `validated_by/at` + unicité du voté ; fiabiliser `activate_ag_decisions` ; report N-1 auto ; snapshot figé à la clôture ; statut « urgence/ratification » ; nettoyer enums orphelins + RPC fantôme `create_budget_from_ag_with_account_and_key`.

**Rang 4 — Appels / paiements / fournisseurs / impayés (audité 2026-05-30 ; détail + preuves dans `04-appels-paiements.md` §5)**

*P0 — le grand livre n'est PAS alimenté tant que non réglé*
- **D-01** Réécrire les 3 edge functions `create_supplier_invoice` / `pay_supplier_invoice` / `record_payment` : colonnes fantômes `date`/`transaction_id`/`debit`/`credit` → réelles `tx_date`/`tx_id`/`direction`+`amount` (+ `period_id`). Cible : router via `create_ledger_transaction()` / `post_ledger_transaction()`.
- **D-02** Renseigner `source_id` sur les écritures (0/38 aujourd'hui — backref pièce↔écriture perdu).
- **D-03** `lot_accounts` → compte **450** (aujourd'hui 21/21 sur 411, non conforme).
- **D-04** Trigger `AFTER INSERT ON lots` créant automatiquement le compte tiers 450.
- **D-05** `generate_call_for_funds` : ventiler l'écriture 450 **par lot** (aujourd'hui une seule écriture globale non ventilée).

*P1*
- **D-06** CHECK `lot_id` obligatoire sur classe 450 (6 écritures fautives). **D-07** RPC d'émission d'appel générant la provision (12/22 appels sans écriture). **D-08** colonnes HT/TVA/taux sur `supplier_invoices(_lines)`. **D-09** flag `is_tva_assujetti` sur `lots`/`coproprietaires`.

*P2/P3*
- **D-10** unifier les 2 générateurs d'appels. **D-11** trigger validation total en DEFERRED (au lieu de DISABLE/ENABLE DDL). **D-12** dédupliquer règles de relance (18 = 3×6). **D-13** palier mise en demeure art. 19-2. **D-14** pont `providers`↔`suppliers`. **D-15** ENUM `source_type`. **D-16** nommage `date`/`tx_date`.

*Écartés par la vérif adversariale :* la FK engagement→facture existe déjà (`service_orders.supplier_invoice_id`) ; le lien appel↔ledger se fait au niveau de l'appel (pas de la ligne).

**Rang 5 — Tantièmes & clés de répartition (audité 2026-05-30 ; détail dans `05-tantiemes-cles.md`). Socle technique SAIN, mais 16 dettes dont 2 P0. À traiter dans le même lot que les P0 du rang 4 (chemin commun clé→ventilation→450-x).**

*P0*
- **D5-01** Clé ALUR active mais vide (copro 11111111, 0 ligne) → fonds travaux non appelable. Peupler ou désactiver ; bloquer `is_active=true` si `is_complete=false`.
- **D5-02** Aucun versioning des clés (ni `valid_from/to`/`period_id`/`updated_at`) → une modif réécrit rétroactivement les exercices clos (viole décret 2005-240 + opposabilité AG). Historiser + résoudre la version active à `issue_date`.

*P1*
- **D5-03** `call_for_funds_lines` sans `repartition_key_id`/`weight_snapshot`. **D5-04 (=D-05)** routage 450 générique — sous-comptes 450-1/2/5 jamais utilisés (`budget_type→450-x`). **D5-05** clés `all_lots` incomplètes (15/16, 1/4) ventilées silencieusement (ne consulte pas `is_complete`). **D5-06** pas de `category` (general/special/alur). **D5-07** aucun contrôle assiette ALUR (5 % hard-codé front). **D5-08** RLS : modif de clé par gestionnaire sans gating AG. **D5-09** aucune régularisation/ventilation des charges 6xx par lot.

*P2/P3*
- **D5-10** base de poids non normalisée (1029, 1473, 124…). **D5-11** double source `lots.tantiemes_*` vs `repartition_key_lines`. **D5-12** `is_complete` ne couvre ni base ni assiette. **D5-13** 2 générateurs d'appels divergents. **D5-14** lien AG↔clé implicite. **D5-15** front sans `basis=surface`. **D5-16** arrondi non absorbé sur le dernier lot (edge fn).
- *Écartés par la vérif :* « basis = text » (enums OK), « lignes orphelines » (FK CASCADE), un cas commerce/ascenseur (M7).

**Rang 6 — AG : votes, majorités & auto-propagation (audité 2026-05-30 ; détail dans `06-ag-votes.md`). PARADOXE : scrutin solide, MAIS le pilier d'auto-propagation N'EST PAS OPÉRATIONNEL. C'est le chantier P0 le plus structurant de l'audit — il explique en partie le « grand livre vide ».**

*P0 — le pilier (sans lui, budget voté jamais actif, appels jamais générés)*
- **VOTES-P0-01** Scrutin non calculé sur le vrai chemin de finalisation : `calculate_resolution_result` est CORRECTE mais appelée seulement par `close_ag` (gardé `in_progress`) ; `rpc_finalize_ag_session`/`finish_ag_session` figent le statut sans calculer (preuve : AG `24d3a499` finalized, `for=0`, alors que `ag_votes`≈906 for). Tout chemin doit calculer + supprimer le `EXCEPTION WHEN OTHERS` qui avale l'erreur + backfill.
- **VOTES-P0-02** `close_ag` n'enclenche pas `prepare`+`activate` (activation uniquement côté front). Orchestrateur serveur unique. **Décision expert : déclenchement à la NOTIFICATION DU PV, avec fenêtre de correction avant envoi, puis gel.**
- **VOTES-P0-03** `activate_ag_decisions` non atomique (succès partiels committés, `EXCEPTION` silencieux par action). Transaction tout-ou-rien + remontée des `failed`.

*P1 — conformité scrutin & robustesse*
- **VOTES-P1-04** branche `ELECT_COUNCIL` n'insère pas (désactive seulement) — la fonction dédiée `elect_council_from_ag` insère bien (confirmé rang 7), à câbler. **VOTES-P1-05** `APPROVE_ACCOUNTS` sans clôture période/report N+1. **VOTES-P1-06** RPC dédiées = code mort (UPDATE directs). **VOTES-P1-07** 2 générateurs d'appels divergents (lié D-10). **VOTES-P1-08** pouvoirs art. 22 (exception 10 % + contrôle au vote) absents. **VOTES-P1-09** correspondance amendée non revalidée. **VOTES-P1-10** payloads d'actions vides. **VOTES-P1-11** absents non tracés (notification PV).

*P2/P3*
- **VOTES-P2-12** Art. 24 sur présents au lieu des exprimés → **DÉCISION EXPERT : corriger sur (for+against)**. **VOTES-P2-13** pas de contrainte type↔majorité. **VOTES-P2-14** `MODIFY_REPARTITION_KEY` (nouvelle version clé, R5-D2) + travaux urgents (art. 37) absents. **VOTES-P2-15** `ag_session_drafts` sans FK. **VOTES-P2-16** convocation 21j non contrôlée. **VOTES-P3-17** deadline contestation PV non outillée.
- *Réfutés :* « UPDATE cassé » (le code persiste bien), enum `attendance_type`, phantom `create_budget_from_ag_with_account_and_key`, `pv_signed_at` (inexistants).

*Cœur CONFORME (vérifié) :* formules art. 25 / 26 (double seuil) / unanimité ; abstentions séparées ; `is_excluded` (conflit d'intérêt art. 24 II).

*Décisions expert (2026-05-31) :*
- **Art. 24 = majorité des EXPRIMÉS** (`for+against`, abstentions exclues), PAS des présents → corriger `compute_majority_threshold` (D6-03/VOTES-P2-12).
- **Activation des décisions = à la NOTIFICATION DU PV**, pas à la clôture brute. Entre clôture et notification : état « PV en préparation » **modifiable par le gestionnaire** (corriger une erreur de saisie). Une fois le PV notifié → `activate_ag_decisions` + **gel** + départ du délai de contestation 2 mois (art. 42, cohérent rang 7). Pilote l'orchestrateur unique (D6-01/02) : `calculate → prepare → [revue/correction gestionnaire] → notifier PV → activate (idempotent)`.

**Rang 7 — Mutations / état daté / conseil syndical (audité 2026-05-30 ; détail dans `07-mutations-conseil.md`). RÉVÉLATEUR AVAL : l'état daté agrège rangs 4/5/6 dans un document à valeur probante légale (risque responsabilité syndic). Socle structurel sain (mutation atomique, snapshot figé, historique horodaté, élection CS câblée).**

*P0 — état daté = document légal probant*
- **D7-01** Solde lu depuis `v_owner_statement_summary` (appels−paiements) au lieu du grand livre `v_lot_balance` (450). Réécrire `generate_etat_date_payload` sur le ledger — sinon état daté faux.
- **D7-02** Les 3 parties art. 20 non structurées dans le payload (vendeur dû / syndicat débiteur / acquéreur). Restructurer.
- **D7-03** Prorata vendeur/acquéreur des charges non calculé (exigibilité des appels OU prorata temporis — à trancher).

*P1*
- **D7-04** Aucun contrôle d'éligibilité CS art. 22 (syndic/conjoint/préposé pourrait être membre). **D7-05** notification du PV non tracée (`ag_send_pv_notification` absent) → départ du délai de contestation art. 42 inconnu. **D7-06** ALUR à la mutation non marqué « acquis au syndicat » (non remboursable). **D7-07** opposition du syndic sur le prix (art. 20) non modélisée. **D7-08** `lot_accounts` sans unicité ni end_date.

*P2/P3*
- **D7-09** mandat CS 3 ans : pas d'alerte fin de mandat / mise en concurrence syndic. **D7-10** indivision / SCI mal modélisées. **D7-11** snapshot état daté sans garde d'immutabilité dure. **D7-12** `council_documents` sans `document_type`.
- *Nuance vs rang 6 :* `elect_council_from_ag` (fonction dédiée) **insère bien** les membres — il manque juste son câblage dans `activate_ag_decisions` (D6-04).

**Rang 8 — GED / communication / maintenance (audité 2026-05-30 ; détail dans `08-ged-comm-maintenance.md`). CONTRASTE : la GED est le sous-système le PLUS MATURE (à préserver, câbler — ne pas refondre) ; la maintenance reconfirme le thème dominant « ponts cassés ».**

*P0*
- **R8-D-01/02/03/11** chaîne OS→facture→écriture→carnet à **0 %** : `supplier_invoices.document_id`, `service_orders.supplier_invoice_id`, `ledger_transactions.source_id` tous NULL (même cause que rang 4). + **M-09** OS-2026-0003 `closed` sans facture/montant/carnet, `created_by` NULL.
- *(COMM-F1 « RLS comm non activé » classé P0 par le sous-agent → **HORS PÉRIMÈTRE** : RLS dev volontaire, chantier séparé go-live. Non retenu.)*

*P1*
- **GED-05** extranet ALUR (`document_access` vide). **LE-01** carnet sans volet assurances (décret 2001-477). **LE-03** `technical_documents` vide + pas de lien `planned_works` (DTG/PPT). **M-01** workflow OS sans CHECK statut↔données. **COMM-F2** 3 systèmes de communication → acter `ag_notifications` (légal) + `mail_campaigns` (bulk) + **droper `mails`**. **CONTRACT-01** reconduction tacite sans automatisation.

*P2/P3*
- **GED-13** `document_links` polymorphe sans FK. **LE-02** pas de vue d'alerte échéances techniques. **COMM-F4** RGPD messagerie. **ARCH-01** archivage 10 ans non automatisé. **EVT-01** maturité modules sociaux.
- *Réfutés :* paths legacy (UUID copro valide), exposition extranet (`content_visibility` n'a pas de `public`), `service_order_events` (audit maintenance, pas comm).
- *4e thème ajouté :* rétention / extranet / RGPD documentaire (obligation légale, non bloquant technique).

---

## 9. AUDIT TERMINÉ — synthèse de clôture (2026-05-31)

**Voir `spec/SYNTHESE_AUDIT.md` pour le détail.** Les 8 rangs sont audités (lecture seule, fiches 01-08).

**Cause racine :** les ponts d'alimentation du grand livre sont cassés → le ledger (source unique légale) n'est quasiment jamais alimenté.

**4 thèmes :** (1) ponts cassés / auto-propagation non opérationnelle [dominant] ; (2) source unique non respectée ; (3) intégrité & conformité ; (4) rétention/extranet/RGPD documentaire.

**Décompte P0 :** rang 1-2 (~5), rang 4 (5), rang 5 (2), rang 6 (3), rang 7 (2), rang 8 (1+transverse). Sain : majorités AG (art. 25/26/unanimité), GED.

**Ordre du plan de correction (à valider) :** 1. Socle ledger (rang 4) → 2. Pilier auto-propagation (rang 6) → 3. Clés & ventilation (rang 5) → 4. Source unique dashboard/impayés (rangs 1-2-3) → 5. Aval probant (rang 7) → 6. Conformité & sécurité (rang 8) → 7. Clôture 408/486 & régularisations.

**Prochaine étape :** construire le **plan de correction priorisé et chiffré** (du §5 backlog + cet ordre), validé avec l'utilisateur **avant toute modif de code/base**.

---

## 6. Prochaines actions

1. **Intégrer les retours de la review de spec** (workflow `coproflex-review-spec`, en cours à la clôture) — notamment trancher la tension **B4 (engagement n'écrit pas au ledger) vs B5 (saisie manuelle crée une écriture)** dans `03-budget.md`.
2. **Rang 4 — Appels de fonds, paiements & pont lot↔compte** : appels (provisions 14-1, ventilation par lot), paiements copro (`payments`/`payment_allocations`), pont `lot_accounts` (10/31 lots sans compte 411), réconciliation impayés (ledger 450 vs appels), et le pont paiement→ledger (edge functions cassées).
3. Puis rangs 5 → 8.
4. **Plan de correction priorisé** (à partir du §5) — validé avec l'utilisateur avant toute modif de code/base.

---

## 7. Artefacts & mémoires

- Spec : `ENTITIES_MAP/_INDEX.md` + fiches `01`→`08` ; **synthèse de clôture : `spec/SYNTHESE_AUDIT.md`**.
- Recherche : `research/cycle-depense.md` (cycle de la dépense, engagé/réalisé, 408/486, sources).
- Mémoires liées : `compta_engagement`, `compta_engage_realise`, `ag_auto_population`, `financial_coherence`, `expert_challenge`, `user_profile`, `app_architecture`.
- Données : 28 retours Pastel classés (dans la cartographie initiale) ; backup DB `Retour DB/`.

---

## 8. Retours de la review de spec (2026-05-30)

**Verdict :** fiches **fidèles au schéma réel** (les 7 affirmations techniques structurantes reconfirmées en base) et **socle juridique solide**. Corrections = précisions + 1 contradiction réelle + des angles morts à arbitrer. Aucun P0 juridique (les P0 sont des bugs techniques).

### Corrections APPLIQUÉES dans les fiches/mémoires
- **Contradiction B4/B5 résolue** : *engagement pur* (extra-comptable, n'écrit jamais) ≠ *saisie manuelle d'une CHARGE exécutée* (génère Débit 6x/Crédit 401 = réalisé). `budget_expenses` requalifiée distingue les deux natures de ligne.
- `01-grand-livre §6` : cibles **trésorerie** (2 KPI, bank_movements conservé) et **budget réalisé** (requalification, pas de suppression) alignées sur les décisions.
- `_INDEX` : ajout des arbitrages **voté = validated/closed**, **période active = open + sélecteur**, **AG → incrément auto** ; matrice trésorerie en 2 KPI ; ALUR « du budget **courant** » + glossaire engagement.
- Précisions juridiques : fait générateur = **exécution** de la prestation (R3, pas « date de facture ») ; art. 42 = **action en contestation** (pas nullité auto) ; travaux urgents = **art. 37 décret** + 1/3 réservé à l'ouverture du chantier ; mise en demeure = **art. 19-2** ; ALUR = **art. 14-2-1** (≥5 % courant **+ ≥2,5 % du PPT** si PPT adopté → flag « PPT adopté ») ; appels 4×25 % = **défaut**, l'AG peut voter d'autres modalités ; réalisé = **classe 6** (annexe expose 6 et 7).
- Mémoires `compta_engagement` (fait générateur) et `compta_engage_realise` (contestation) raffinées.

### Corrections mineures restantes à intégrer (par rang)
- `02 §2` : préciser que `5121%` va côté **TRAVAUX** (avec `502%`), `512%` non-5121 côté courant.
- `01 §5` : formuler au présent qu'**une tx draft existe déjà** (1/38) → l'écart by-class vs trial-balance n'est pas hypothétique.
- `_INDEX` matrice « budget réalisé » : nommer `v_budget_consumption_by_account` + requalification.
- **Compte copropriétaires** : le compte réglementaire est le **450 + sous-comptes 4501-4504** (budget/travaux/avances/emprunts). Le **411** (utilisé par `lot_accounts`) **n'est pas conforme** au plan comptable copro → vérifier/normaliser (rang 4/5). Retirer l'amalgame « 450/411 ».
- **`lot_id` obligatoire** : à restreindre aux écritures **appels/paiements copropriétaires (450)** ; produits financiers/divers → comptes **768/758** hors contrainte (rang 4). Vérifier la nature des 6 écritures 450 sans lot avant de durcir.

### NOUVEAUX angles morts / décisions à arbitrer avec l'expert
1. **TVA** (copros avec locaux commerciaux / assujetties) : acter **hors-scope go-live** (100 % résidentiel) OU câbler la **classe 44** (4456/4457/4455) + flag « copro assujettie » + réalisé en HT. *Sans décision, ces copros ont une compta fausse.*
   → ✅ **TRANCHÉ (2026-05-30)** : hors champ TTC + **2 briques V1** (HT/TVA sur factures, flag assujetti) ; **attestation (cas B) et bailleur (cas C) déférés**. Présence de commerces ≠ syndicat assujetti. Voir §4.
2. **Transition N/N+1** : `enforce_single_open_period` interdit la **coexistence** de l'exercice N (pas encore approuvé, ~5-6 mois) et N+1 (ouvert pour appels) — pourtant la norme. Distinguer « open-posting » vs « open-appels » / période d'inventaire (rang 4/7).
   → ✅ **TRANCHÉ (2026-05-30)** : **période multi-état** (statut riche par exercice, figeage à l'approbation AG). Voir §4.
3. **Génération & extourne 408 / 486 à la clôture** : qui marque « exécuté non facturé » ? quel trigger crée le 408 ? extourne N+1 ? neutralisation 486 du réalisé ? *Sans ça le réalisé est sous/sur-estimé à la clôture → annexe 2 faussée* (rang 1/4).
   → ✅ **TRANCHÉ (2026-05-30)** : **assistant semi-auto depuis l'engagement + saisie manuelle**, extourne N+1 auto. Voir §4.
4. **Lettrage & paiements partiels** : l'impayé = **appels échus non lettrés**, pas le solde net 450. Mécanisme de lettrage + paiement partiel + réparer `source_id` (rang 4).
5. **Régularisation de fin d'exercice** (cœur de l'approbation des comptes) : suivre **Appelé (provisions 70)** distinct du **Réalisé (charges 6)** — ne jamais les additionner ; répartir excédent/déficit par lot (459/450) (rang 4 + nouveau KPI).
6. **Fonds travaux en mutation** : la quote-part ALUR du lot **reste acquise au syndicat** (le vendeur ne la récupère pas) ; l'état daté publie le solde fonds travaux du lot (rang 7).
7. **Contrainte classe ↔ nature de compte (R6)** : un compte mal préfixé fausse **silencieusement** réalisé/trésorerie → CHECK/trigger **avant go-live** (remonter R6 de P3 à **P1**).
8. **Emprunt collectif (classe 16)** : confirmer hors-scope go-live, mais ne pas verrouiller le budget travaux pluriannuel (prévoir rattachement futur au plan de remboursement 16/66).
