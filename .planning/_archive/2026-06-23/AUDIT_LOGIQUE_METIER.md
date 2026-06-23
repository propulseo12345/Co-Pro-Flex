# AUDIT DE LA LOGIQUE MÉTIER — CoProFlex

**Plateforme de gestion de copropriété (droit français) — Audit de conformité réglementaire et d'intégrité comptable**

---

> ### Encadré méthodologique
>
> **Nature de l'audit.** Audit en **LECTURE SEULE**. Aucune correction n'a été appliquée à la base, au code ou aux données. Tous les correctifs présentés sont **PROPOSÉS** et attendent l'arbitrage de Lyes.
>
> **Méthode de preuve.** Chaque règle a été vérifiée par **double preuve** : (1) **statique** — lecture du code réellement déployé (`pg_get_functiondef`, `pg_get_viewdef`, `pg_trigger`, `pg_constraint` en base vivante, et lecture du front), et non des seuls fichiers de migration ; (2) **active** — recalcul indépendant *read-only* sur des données réelles.
>
> **Boucle d'or.** Copropriété de référence « **Le Clos Saint-Michel** » (`22222222-...`), **exercice 2026 ouvert** / **exercice 2025 clos**, 6 lots, 5 copropriétaires, 1000 tantièmes. Quand la boucle d'or ne permet pas d'exhiber un cas (mono-nature, unanimité, 0 mutation), la preuve est portée par les copros de test `11111111` / `Residence Test` ou reste explicitement **statique**.
>
> **Contre-audit.** Chaque finding initiale est passée par un **contre-audit adverse** (champ `review`). Les findings **écartées** (`holds=false`) sont listées à part et ne comptent **PAS** comme problèmes. Les sévérités affichées ci-dessous sont les **sévérités corrigées** après contre-audit.
>
> **Date.** 2026-06-02. **Modèle comptable de référence** : partie double / droits constatés (décret 2005-240 + arrêté du 14 mars 2005), compte tiers `450-x` par nature + dimension `lot_id`, modèle `411-xxx` abandonné.

---

## Tableau de bord sévérité

### Comptes par verdict (findings RETENUES uniquement, après contre-audit)

| Verdict | Nombre |
|---|---|
| ✅ Conforme | 16 |
| ⚠️ Écart | 14 |
| ❌ Faux-manquant | 3 |
| **Total retenu** | **33** |
| *(écartées au contre-audit)* | *2* |

### Comptes par sévérité (findings retenues)

| Sévérité | Nombre | Répartition |
|---|---|---|
| 🔴 Bloquant | 3 | Affectation du résultat (stub WP5.3), à-nouveau jamais posté, double générateur d'appels actif |
| 🟠 Majeur | 11 | |
| 🟡 Mineur | 13 | |
| ⚪ Info / conforme | 16 | |

### Top problèmes BLOQUANTS (à traiter en priorité)

1. **[8] Affectation du résultat non implémentée** — `regularize_period` est un **stub vide** (WP5.3). À l'approbation des comptes, l'excédent/déficit n'est jamais réparti `120/110 → 450` par quote-part. La boucle financière de bout en bout ne se referme pas.
2. **[8] À-nouveau jamais posté sur la boucle d'or** — 0 transaction `source_type='opening_balance'`. `open_next_period` existe mais n'est **jamais enchaîné** par `activate_ag_decisions/APPROVE_ACCOUNTS`. *(Sévérité ramenée à majeur au contre-audit — voir chapitre 8.)*
3. **[9] Double générateur d'appels actif** — `generate_combined_calls_from_ag`, câblé sur un écran de finalisation **actif**, crée des appels `draft` **hors grand livre**, désactive un trigger en DDL, et **neutralise** le chemin canonique. **Déjà matérialisé** sur la copro `11111111` (double jeu d'appels, l'un hors compta).

### Top problèmes MAJEURS structurants

- **[1] Double implémentation du calcul de majorité** (back SQL conforme vs front JS faux sur art.24/25-1) — le front **persiste** un résultat juridiquement erroné au PV.
- **[2] Opposants juridiques jamais identifiés nominativement** au PV (départ du délai de recours art. 42).
- **[2] « Quorum » inventé** imprimé au PV (« QUORUM NON ATTEINT ») alors qu'aucun quorum n'existe en copropriété.
- **[5] FIFO d'imputation non cloisonné par nature** (courant/travaux/ALUR se croisent) — reproductible sur `11111111`.
- **[6] Fonds ALUR : solde fantôme** (vue sur `budget_lines` ≠ grand livre) + **plancher 5% non contrôlé** + **affectation 105→705 inexistante**.
- **[7] État daté non conforme** au modèle réglementaire 3 volets + **quote-part ALUR toujours à 0**.
- **[4] Compte chapeau `450` imputé directement** par les routes canoniques (7 écritures postées sur un compte système non terminal).

---

## Chapitre 1 — AG : majorités & calcul des votes

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| Doc des règles métier reflète art.24 = voix exprimées | ⚠️ Écart | 🟡 Mineur | Loi 65-557 art. 24 | `docs/claude/business-rules.md` l.7, 18 | Statique : doc dit `FLOOR(présents/2)+1` (abstentions au dénominateur, faux) ; code live `for>against`. Doc auto-importée → propage le mauvais modèle mental | MAJ `business-rules.md` : art.24 = voix exprimées (`for>against`, abstentions exclues) ; réserver toute formule de seuil à l'affichage. Le code fait foi |
| `compute_majority_threshold` cohérent art.24 | ⚠️ Écart | 🟡 Mineur | Loi 65-557 art. 24 | `compute_majority_threshold` branche `art24` + ELSE | Recalcul : `compute_majority_threshold('art24',1000,0,5,5)=1` vs 501 stocké (divergence interne 500). Seul consommateur live = `calculate_resolution_result` qui écrase la valeur → impact **latent** | Aligner art.24 (et ELSE) sur voix exprimées `FLOOR((for+against)/2)+1`, OU documenter comme purement indicatif. Migration WP2.7 incomplète (a patché `calculate_resolution_result` mais pas cette fonction) |
| **Une seule source de vérité pour le calcul de majorité** | ⚠️ Écart | 🟠 Majeur | Loi 65-557 art. 24/25/25-1/26 | Back `calculate_resolution_result` vs front `Session/utils.ts` (`checkMajority`) | Front réimplémente le calcul en JS. Art.24 back `for>against` vs front `pour > voixExprimées/2` (abstention au dénominateur = **faux**). Contre-ex. for=40/against=30/abst=40 → back **adopte**, front **rejette** | Faire du front un **simple afficheur** des champs persistés par la RPC back. Si calcul client requis : corriger `ART_24` en `pour > contre`. Vérifier aussi `ART_25_1` |
| Art.24 inclut correspondance, exclut abstention (front) | ⚠️ Écart | 🟠 Majeur | Loi 65-557 art. 24 + 17-1 A | `Session/utils.ts` case `ART_24` | Front met l'abstention au dénominateur. **Aggravation** : le résultat front est **PERSISTÉ** (`ag_resolutions.is_approved/status` via `persistResolutionResult` `useAgSessionPage.ts:522-533`) et inscrit au **PV** — pas un simple affichage. La RPC back correcte n'est jamais appelée par le front | `adopted = pour > contre` (seuil indicatif sur pour+contre) ; OU faire persister la décision par la RPC back faisant autorité |
| Art.24 = voix exprimées (back) | ✅ Conforme | ⚪ Info | Loi 65-557 art. 24 | `calculate_resolution_result` (migration WP2.7 = live, octet pour octet) | Recalcul boucle d'or res 1/2 : `recomputed_approved=true`, `threshold=501` = stocké. Identité parfaite | RAS |
| Art.26 = double majorité (2/3 voix + majorité en nombre) | ✅ Conforme | 🟡 Mineur | Loi 65-557 art. 26 | Back `calculate_resolution_result` `art26` ; libellé front `resolutions.ts` | Logique back conforme (`for>=FLOOR(total*2/3)+1 AND voters_for>=FLOOR(total_owners/2)+1`). Écart **documentaire** : libellé front imprécis | Corriger texte `MAJORITES.ART_26.seuil` : « Majorité EN NOMBRE des copropriétaires représentant au moins les 2/3 des voix ». Aucune logique à changer |
| Art.25-1 (passerelle) | ✅ Conforme | ⚪ Info | Loi 65-557 art. 25-1 | `calculate_resolution_result` `art25` (bridge sur 1/3) | Éligibilité sur 1/3 des voix de **tous** ; second vote `art25_1` traité à la majorité art.24. Back `for>FLOOR(total/3)` ≡ front `>=ceil(total/3)` | RAS. Vérifier la création/exécution du second vote (`bridge_vote_id`) dans le domaine 9 |
| Art.25 = majorité absolue de tous les copropriétaires | ✅ Conforme | ⚪ Info | Loi 65-557 art. 25 | `calculate_resolution_result` `art25` | `for>=FLOOR(total/2)+1` sur `total_tantiemes` (SUM lots), pas les présents. Recalcul = 501 | RAS |

**Synthèse.** Le calcul de majorité côté **serveur** (`calculate_resolution_result`, WP2.7) est conforme à la loi modifiée et recalculé sans écart sur la boucle d'or (art.24, for=1000/against=0, seuil 501). Le point dur est la **double implémentation** : le front réimplémente le calcul en JS, met à tort l'abstention au dénominateur de l'art.24/25-1, et — aggravation confirmée au contre-audit — **persiste** ce résultat erroné dans `ag_resolutions` et au PV, sans jamais appeler la RPC back faisant autorité. Une décision légalement adoptée peut donc être enregistrée « rejetée » (risque d'annulation art.42). Restent des dettes mineures : doc obsolète auto-importée et `compute_majority_threshold` non migrée (code mort pour l'issue, mais piège futur).

---

## Chapitre 2 — AG : pouvoirs, correspondance, opposants, quorum

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| Plafond pouvoirs : max 3 SAUF si total voix ≤ 10% du syndicat | ⚠️ Écart | 🟡 Mineur | Loi 65-557 art. 22, I, al.3 (post-ELAN, seuil 10%) | `save_ag_pouvoir` (DB) ; `usePouvoirs.ts` ; `AddPowerForm.tsx` | Plafond binaire `count>=3` partout, aucune comparaison aux tantièmes. Exception 10% documentée comme **TODO non fait**. Défaut **sur-restrictif** (refuse un 4e pouvoir parfois légal) — ne produit jamais d'AG illégale | Au-delà de 3, autoriser si `(tantièmes mandataire + Σ mandants + nouveau) ≤ 0.10 × total_syndicat`. RPC source unique, front = avertissement |
| **Vote correspondance sur résolution AMENDÉE → défaillant** | ❌ Faux-manquant | 🟠 Majeur | Loi 65-557 art. 17-1 A | `register_correspondence_vote` ; `calculate_resolution_result` | Anti-double-vote **conforme**. Mais requalification « pour correspondance sur résolution amendée → défaillant » **totalement absente** : aucun flag d'amendement, aucune neutralisation. La version live a même perdu le breakdown `by_source`. Prive du recours art.42 | (1) Flag `amended_in_session` sur `ag_resolutions` (distinct de `is_customized`) ; (2) exclure les votes correspondance du décompte des résolutions amendées (= défaillants) ; (3) alerter le syndic avant confirmation |
| **Opposants juridiques identifiés nominativement au PV** | ❌ Faux-manquant | 🟠 Majeur | Loi 65-557 art. 42 al.2 ; décret 67-223 art. 17 | `ag_resolutions` (agrégats only) ; `pv-template.service.ts` ; `generatePVPDF.ts` | Aucune notion d'opposant juridique : pas d'inversion selon résultat (`contre` sur adoptée / `pour` sur rejetée). PV imprime **totaux only**, jamais la liste nominative qui fait courir le délai de 2 mois. Décret 67-223 art.17 exige **aussi** de nommer les abstentionnistes | Vue `v_ag_opposants` : `(vote='against' AND is_approved) OR (vote='for' AND NOT is_approved)` + jointure nom + **défaillants** + **abstentionnistes** ; injecter au PV sous rubrique « Opposants (départ délai recours art.42) » |
| **Pas de quorum inventé bloquant/affiché** | ⚠️ Écart | 🟠 Majeur | Loi 65-557 / décret 67-223 (aucun quorum en copro) | `compute_ag_quorum` ; `generatePVPDF.ts:351-352` ; `QuorumPreviewCard.tsx:21` ; `pv-template.service.ts:175-178,283` | Le vote n'est **jamais** bloqué (conforme). Mais **3 seuils contradictoires** inventés (`>0`/`>25%`/`>=50%`) et le PV imprime « QUORUM NON ATTEINT » + « nouvelle convocation nécessaire » (l.175-178) = **juridiquement faux**. Recalcul : `is_quorum_reached=FALSE` sur AG pleinement valable (cause : `ag_attendance.lot_ids=[]` → tantièmes=0) | Supprimer toute mention QUORUM du PV ; remplacer par un décompte de participation indicatif ; harmoniser les 3 seuils ; corriger le remplissage `ag_attendance.tantiemes` |
| Art.24 = voix exprimées (abstentions exclues) | ✅ Conforme | ⚪ Info | Loi 65-557 art. 24 | `calculate_resolution_result` (WP2.7) | Recalcul boucle d'or : for=1000/contre=0, seuil 501 = stocké. Concordance parfaite | RAS. Dette : aligner `compute_majority_threshold` ; surveiller divergence front |

**Synthèse.** Domaine à fort enjeu juridique. Le socle technique du vote ne bloque jamais à tort (pas de quorum bloquant, anti-double-vote correct), mais **trois lacunes de conformité PV** : (1) les **opposants** et **défaillants** ne sont jamais identifiés nominativement, ce qui mine le point de départ du recours art.42 ; (2) la requalification **art.17-1 A** (correspondance sur résolution amendée) est absente ; (3) un **quorum fictif** est imprimé sur un document légal. Le plafond de pouvoirs est sur-restrictif (mineur après contre-audit : il refuse parfois un pouvoir légal mais ne génère jamais d'AG illégale).

---

## Chapitre 3 — Charges & répartition (clés / tantièmes / ventilation)

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| Σ lignes = total appelé au centime (largest remainder cr8) | ⚠️ Écart | 🟡 Mineur | art. 10 + 14-1 loi 65-557 | Données seed pré-cr8 ; chemin `finalize_and_activate_ag → generate_calls_from_ag_payload` | Σ 4 appels = **15000,16 €** vs budget voté **15000,00 €** = **+0,16 € au GL** (débit 450-1). Données stockées = arrondi **naïf** (avant migration cr8 272000), pas le télescopage. Code **actuel** recalcule à 0 écart. Immatériel par lot (±0,01-0,02/trimestre) | Régénérer les appels non encaissés via la route cr8 ; écriture de régularisation pour T1 payé/T2 partiel ; déprécier `generate_combined_calls_from_ag` |
| Une seule route de ventilation canonique | ⚠️ Écart | 🟡 Mineur | art. 10 loi 65-557 / décret 67-223 art.1-4 ; sincérité (décret 2005-240) | 4 implémentations : `post_call_for_funds` (naïf), `post_budget_call_for_funds` (cr8), `generate_combined_calls_from_ag` (dernier-lot + DISABLE TRIGGER), front `useCreateCallWizard.ts` (preview) | 4 algos pour la **même opération légale**. `generate_combined` **désactive** `trg_validate_call_total` (workaround sur bug reconnu). Le GL **reste équilibré** (débit=crédit), mais le montant stocké **dérive** du demandé. Divergence preview/stockage d'un centime | Unifier sur le télescope cr8 ; garantir `total_amount=montant demandé` ; supprimer le DISABLE TRIGGER ; aligner la preview front |
| Détection Σappels ≠ budget voté par les vues d'intégrité | ❌ Faux-manquant | 🟡 Mineur | art. 14-1 loi 65-557 ; décret 2005-240 art.14-3 | `v_call_total_mismatch`, `v_finance_integrity_issues` | Les vues comparent uniquement header vs Σlignes **intra-appel** (rendu trivial par `trg_validate_call_total`). Le sur-appel de 0,16 € reste **invisible** (`v_call_total_mismatch=[]`). Aucune vue ne croise Σappels vs budget | Vue `v_call_vs_budget_mismatch` : `round(Σtotal_amount WHERE status<>'cancelled')` vs `round(Σbudget_lines.amount)`, seuil 0,01, exposée dans `v_finance_integrity_issues` ; ignorer/expliciter les écarts d'arrondi purs |
| Ventilation par lot = montant × poids / Σpoids | ✅ Conforme | ⚪ Info | art. 10 al.1 loi 65-557 ; décret 67-223 art.1-4 | `post_call_for_funds`, `post_budget_call_for_funds` | Recalcul 18 lignes appel T1 : `matches=true` partout. Ex. lot 102 Charges = `round(2625×155/1000)=406,88` = stocké | RAS |
| `repartition_key_is_complete` bloque les clés incomplètes | ✅ Conforme | ⚪ Info | art. 10 loi 65-557 ; décret 67-223 art.1 | `repartition_key_is_complete` | Test 4 clés boucle d'or : toutes `is_complete=true`. Garde-fou câblé (RAISE si incomplète) | RAS |
| Snapshot `weight_snapshot` figé sur les lignes | ✅ Conforme | ⚪ Info | art. 10 loi 65-557 ; sincérité (décret 2005-240) | `post_*_call_for_funds` (INSERT `weight_snapshot`) | 18 lignes T1 : `frozen_matches_current=true`. Gel de la quote-part alimenté à l'émission | RAS |

**Synthèse.** La **formule** de ventilation art.10 est correcte au niveau de la ligne (recalcul au centime sur les 18 lignes), le gel de quote-part et le garde-fou de complétude fonctionnent. Les écarts résiduels sont tous **mineurs après contre-audit** : ils relèvent de l'**arrondi** (0,16 € sur 15000 figés dans le seed pré-cr8, GL équilibré) et de l'**hygiène d'architecture** (4 algorithmes concurrents dont un désactive un trigger en DDL). Le seul vrai trou est l'**absence d'un contrôle d'intégrité Σappels vs budget voté** dans les vues d'audit.

---

## Chapitre 4 — Compta d'engagement : grand livre (partie double)

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| Équilibre garanti **structurellement** au posting | ⚠️ Écart | 🟡 Mineur | Décret 2005-240 art.1 (livres équilibrés en résultat) | Aucun trigger de balance sur `ledger_*` ; `check_transaction_balance()` STABLE jamais câblée | Équilibre vérifié **uniquement par les RPC**. Un `UPDATE status='posted'` direct (RLS off en dev) passerait une tx déséquilibrée. Recalcul : 0 tx posted déséquilibrée (effet des RPC, pas d'une contrainte). Gap **tracé** (spec 01 Q3) | Renforcement **defense-in-depth** : `CONSTRAINT TRIGGER DEFERRABLE` recalculant Σdébit/Σcrédit au posting (pattern maison `trg_validate_call_total`), OU verrouiller le flux via RPC seules. Décision d'archi ouverte, pas non-conformité |
| **45x = sous-compte par nature + lot_id ; jamais compte par lot ; jamais 411** | ⚠️ Écart | 🟠 Majeur | Décret 2005-240 ; modèle interne 450-x | `enforce_lot_id_on_45x()` | Modèle par nature correct, 0 mouvement 411-xxx. **MAIS** le compte **chapeau `450` (is_system, non terminal)** porte **7 écritures POSTED réelles** générées par les routes canoniques (appel T1 tx `5dbf1fff` D450/C701 ; 2 paiements `20773bf1`/`31b8a195` C450/D512) au lieu de `450-1`. Le trigger n'enforce que `lot_id`, pas l'imputabilité → **2 patterns coexistent** (solde copro éclaté 450 vs 450-1) | **PRIORITAIRE** : rendre le chapeau 450 **non-imputable** ; re-imputer les 3 tx vers 450-1 ; auditer les RPC qui ciblent parfois le chapeau ; purger la draft seed `81d0f732` ; (option) élargir le trigger à `LIKE '45%'` |
| Aucune écriture posted sans `source_id` | ⚠️ Écart | 🟡 Mineur | Décret 2005-240 art. 6 (pièces justificatives) | `source_id` nullable sans contrainte ; `create_ledger_transaction` passe `p_source_id` brut | Aucune garde DB n'exige `source_id`. **32 tx posted** « pièce » sans `source_id` réparties sur 5 copros (Clos St-Michel 5, Jardins d'Émeraude 11, Residence Test 16) — défaut **structurel**, pas que seed. Boucle d'or 2026 propre (13/13) | CHECK conditionnel : `source_type 'pièce' ⇒ source_id NOT NULL` ; rétro-rattacher les 5 tx seed 2025 |
| Chaque tx équilibrée Σdébit=Σcrédit (tol. 0,01) | ✅ Conforme | ⚪ Info | Décret 2005-240 art. 1 et 5 | `post_ledger_transaction` ; garde cr3 `create_ledger_transaction` | 19 tx, écart 0,00 € sur **chacune** ; global 29584,12 = 29584,12. Base entière : 0 tx posted déséquilibrée | RAS |
| Immutabilité après posting | ✅ Conforme | ⚪ Info | Décret 2005-240 art. 5 | 4 triggers + CHECK `ck_posted_consistency` | Verrous actifs (UPDATE/DELETE tx, INSERT/UPDATE/DELETE lignes, retour draft). 60 lignes posted / 2 draft | RAS |
| Emploi correct des classes (6=charges, 7=produits) | ✅ Conforme | ⚪ Info | Plan comptable copro décret 2005-240 | `accounts.account_type` | Recalcul : classe 4 asset/liability, 5 asset, 6 expense, 7 income. **Zéro** classe détournée | RAS |

**Synthèse.** Le grand livre est **sain sur le fond** : 19 transactions, 62 lignes, toutes équilibrées, aucune classe détournée, 0 mouvement `411-xxx`, immutabilité verrouillée. Le point relevé au contre-audit comme **majeur** est l'**imputation directe sur le compte chapeau système `450`** par les routes canoniques (7 écritures postées réelles), qui éclate le solde copropriétaire entre `450` et `450-1` — c'est la coexistence de deux patterns que le projet proscrit. Les autres écarts sont des **renforcements** (équilibre garanti par RPC seulement, `source_id` non contraint).

---

## Chapitre 5 — Appels / paiements / imputation FIFO / cut-off / surallocation

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| Génération selon échéancier (un appel/échéance, Σlignes=total) | ⚠️ Écart | 🟡 Mineur | art. 14-1 loi 65-557 + art. 35 décret 67-223 | `useCreateCallWizard.ts` ; `post_call_for_funds` | Wizard ventile proprement ; **seul défaut réel** : boucle « multiple » **non atomique** (N `createCall` ; échec à l'appel k laisse k-1 créés). Le moteur `echeancier.ts` n'est **PAS** un chemin de création d'appels (brouillons localStorage, 2 imports, jamais de GL). Recalcul : 4 appels, **18 lignes** chacun, mismatch=0 | Rendre la boucle atomique via RPC unique `post_budget_call_for_funds(p_installment_index/count)` (déjà en base, arrondi correct). Nettoyer `echeancier.ts` = hygiène, pas risque comptable |
| **FIFO cloisonné par NATURE (courant/travaux/ALUR ne se croisent pas)** | ⚠️ Écart | 🟠 Majeur | Règle métier `payment_imputation_rules` ; étayée par arrêté 14/03/2005 (450-1/2/5) + art.14-2 ; art.1342-10 c.civ. | `allocate_payment` (FIFO sans filtre `budget_type`) ; `post_owner_payment` (ventile par nature **après** coup) | FIFO itère sur **toutes** natures, ordonné par date seule → un versement courant peut éteindre une dette ALUR. **Reproductible read-only** sur `11111111` lot `08c42026` : rangs 1-5 current, **rang 6 = ALUR 87,46 €**, rangs 7+ current → un encaissement atteignant le rang 6 éteint l'ALUR avant des dettes courantes plus récentes. `PaymentModal.tsx` n'envoie jamais `call_line_ids` (FIFO auto forcé) | Paramètre `p_nature` dans `allocate_payment` (JOIN budgets, filtre `budget_type`) OU FIFO indépendant par nature ; `post_owner_payment` propage la nature |
| Paiement : D512 / C450-x par nature, trop-perçu → 450-3 | ✅ Conforme | ⚪ Info | arrêté 14/03/2005 ; décret 2005-240 art.14-3 | `post_owner_payment` ; `resolve_lot_tiers_account` | Recalcul 6 paiements : `D512=C450x=montant`, `lot_id` correct partout, crédit 450-1 (current). Branche 450-3 non exercée (0 trop-perçu) | RAS. Tester un paiement > dû pour couvrir 450-3 |
| FIFO cloisonné par LOT, exclut les appels annulés | ✅ Conforme | ⚪ Info | art. 1342-10 c.civ. | `allocate_payment` (cr4) | 35 allocations : `crosses_lot=false`, `hits_cancelled=false`, 0 re-lettrage. T1 (2026-01-01) soldé avant T2 (2026-04-01) | RAS. Option : tie-break `due_date`/`created_at` plutôt que `cf.id` |
| Cut-off : encaissement sur PÉRIODE OUVERTE, pas celle de l'appel | ✅ Conforme | ⚪ Info | décret 2005-240 art.14-3 | `post_period_cutoff` ; `post_owner_payment` (period_id de l'appelant) | `post_period_cutoff` refuse si période non `open`, idempotent, date à `end_date`, gère 408/486… `post_owner_payment` écrit dans la période fournie, pas dérivée de l'appel. Pas de cut-off ni de cas cross-période sur la boucle d'or (statique) | RAS. Preuve active : paiement N+1 soldant appel N une fois 2027 ouvert |
| Pas de surallocation (Σalloué ≤ montant, tol. 0,01) | ✅ Conforme | ⚪ Info | arrêté 14/03/2005 ; art.1342-10 c.civ. | `trg_validate_payment_allocation` ; `v_payment_allocation_issues` | Double filet (algo `LEAST` + trigger CHECK). Recalcul 6 paiements : `unallocated=0`, `over_allocated=false`. Vues = 0 ligne | RAS |
| Idempotence (double-clic ne crée pas 2 encaissements) | ✅ Conforme | ⚪ Info | partie double décret 2005-240 art.14-3 | `ux_payments_idempotency` (cr5) ; `post_owner_payment` (ON CONFLICT) ; `PaymentModal.tsx:44` | Chaîne complète clé stable front → edge → RPC `ON CONFLICT DO NOTHING` + replay. 2 paiements récents avec clé, 0 doublon, 1 `ledger_tx_id` distincte chacun | RAS. Option : `idempotency_key` NOT NULL une fois tous les chemins migrés |

**Synthèse.** Domaine **globalement sain** sur la boucle d'or : grand livre des 6 paiements cohérent (D512=C450-1, lot correct), zéro surallocation, zéro croisement de lot, FIFO chronologique respecté, idempotence de bout en bout. Le seul écart **majeur** est l'**absence de cloisonnement du FIFO par nature** — confirmé reproductible *read-only* sur `11111111` (un encaissement peut éteindre une dette ALUR avant des dettes courantes plus récentes), ce qui fausse les soldes des sous-comptes `450-1/2/5` et casse la ségrégation réglementaire des fonds. L'écart sur l'échéancier est ramené à **mineur** (seule la non-atomicité de la boucle « multiple » tient ; le moteur legacy `echeancier.ts` n'est pas un chemin de création d'appels).

---

## Chapitre 6 — Fonds travaux ALUR (art. 14-2)

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| **Le solde du fonds ALUR doit refléter le grand livre (105), pas budget_lines** | ⚠️ Écart | 🟠 Majeur | Loi 65-557 art. 14-3 (compta engagement) + 14-2 II ; décret 2005-240 art. 5 et 2 | `create_alur_fund_from_ag` ; `v_alur_fund_summary` | La RPC crée budget+budget_line(105) **sans aucune écriture GL**. `v_alur_fund_summary.solde_actuel = SUM(budget_lines) − SUM(alur_transfers)`, **jamais le GL**. Recalcul : vue=**665 €**, GL=**0 €** (0 écriture sur 105 ET 450-5) → **solde fantôme**. Le droit constaté naît à l'émission de l'appel, pas au vote | (a) Brancher `v_alur_fund_summary` sur le solde réel du compte 105 (ou afficher « budgété » vs « comptabilisé ») ; (b) garantir l'enchaînement vote ALUR → émission de l'appel → D450-5/C105. **NE PAS** poster à la création du budget (créerait une créance fictive) |
| **Cotisation annuelle ALUR ≥ 5% du budget prévisionnel** | ❌ Faux-manquant | 🟠 Majeur | Loi 65-557 art. 14-2 II (plancher 5%) | `FondsALURModal.tsx:77` (min=1) ; `create_alur_fund_from_ag` ; `post_budget_call_for_funds` ; `v_alur_fund_summary` | **Aucun contrôle** du seuil nulle part. Modal accepte 1%. Recalcul : budget « v2 test doublon » 100 € = **0,755%** enregistré sans blocage. Boucle d'or à 5,02% par **calibrage du seed**, pas par garde | Avertissement bloquant front (calculer 5% du budget saisi) + garde serveur exigeant un **flag de dérogation** (DTG/immeuble <5 ans) plutôt qu'une EXCEPTION dure |
| **Affectation 105 → 705 lors de l'emploi des fonds** | ❌ Faux-manquant | 🟠 Majeur | Arrêté 14/03/2005 (compte 705) ; décret 2005-240 | Commentaire seul `wp1_finance_rpcs.sql:430-431` ; `alur_transfers` sans posting ; `useALURData.ts:271-308` | **Aucune fonction** n'implémente D105/C705. `createTransfer` fait un simple `insert('alur_transfers')` **sans écriture GL**. Recalcul : compte 705 = **0 écriture** sur toutes les copros ; 0 `alur_transfer`. Chaîne 105→705 **inerte** | RPC `post_alur_transfer` : (1) INSERT `alur_transfers` ET (2) `create_ledger_transaction` D105/C705 + affectation au budget destinataire ; brancher `useALURData.createTransfer` ET `TransferModal` dessus |
| RPC ALUR s'appuie sur les tables réelles, ne masque pas les erreurs | ⚠️ Écart | 🟡 Mineur | Robustesse / intégrité technique (pas obligation légale) | `create_alur_fund_from_ag` | Fallback période interroge `fiscal_periods` (`to_regclass=NULL`, schéma réel = `accounting_periods`) → plante si 1er SELECT vide. `EXCEPTION WHEN OTHERS` avale l'erreur (`finalisation.api.ts` ne teste que `error`, pas `success`). Chemin AG standard ne l'appelle pas (front-direct only) | Remplacer `fiscal_periods`→`accounting_periods` et `is_active`→`status='open'` ; restreindre le `WHEN OTHERS` |
| Appel cotisation ALUR crédite 105 (pas 701/702) : D450-5/C105 | ✅ Conforme | ⚪ Info | Loi 65-557 art. 14-2 II ; décret 2005-240 | `post_budget_call_for_funds`, `post_call_for_funds` ; `resolve_lot_tiers_account` | Les 2 routes : `CASE budget_type WHEN 'alur' THEN '105'`, débit via `resolve_lot_tiers_account('alur')='450-5'`. Jamais 701/702. **Mais** 0 écriture réelle sur la boucle d'or pour le prouver activement | RAS sur l'imputation. Le problème = l'appel n'a jamais été posté (finding 1) |
| Clé de répartition ALUR existante et complète (tantièmes) | ✅ Conforme | ⚪ Info | Loi 65-557 art. 14-2 | `create_alur_fund_from_ag` ; `post_budget_call_for_funds:97-106` ; `v_alur_lot_contributions` | Budget-line ALUR rattachée à clé « Fonds travaux ALUR » ; garde `repartition_key_is_complete` ; ventilation par `tantiemes_generaux`. Jamais matérialisé en lignes (statique) | RAS. Émettre réellement l'appel pour valider de bout en bout |

**Synthèse.** L'**imputation théorique** de la cotisation ALUR est **correcte** (D450-5/C105, jamais 701/702). Mais le domaine cumule trois écarts **majeurs** : (1) le solde ALUR affiché (665 €) est un **fantôme** sourcé sur `budget_lines`, totalement découplé du grand livre (0 €) ; (2) le **plancher légal de 5%** n'est contrôlé nulle part (un fonds à 0,755% passe) ; (3) l'**affectation 105→705** lors de l'emploi des fonds n'existe pas — la table `alur_transfers` historise sans jamais comptabiliser. S'ajoute un bug mineur de robustesse (`create_alur_fund_from_ag` référence une table inexistante `fiscal_periods`, erreurs avalées).

---

## Chapitre 7 — Mutations / état daté

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| **Quote-part fonds ALUR à l'état daté** | ⚠️ Écart | 🟠 Majeur | Loi 65-557 art. 14-2 II ; arrêté 13/12/2019 ; décret 67-223 art. 5 | `generate_etat_date_payload` étape 6 (`WHERE le.lot_id = mutation.lot_id AND a.code LIKE '105%'`) | Le 105 (equity) **n'a jamais de `lot_id`** → filtre ne ramène rien → `balance=0` **systématique**. Preuve : 2 snapshots stockés (`11111111`) ont `alur_balance=0,00` alors que le 105 réel = -1500,01. Champ légal obligatoire **toujours faux** | Quote-part au **prorata des tantièmes** : `solde_global_105 × (lot.tantiemes / SUM(tantiemes copro))`. **NB** : `copros.total_tantiemes=NULL` → utiliser `SUM(lots.tantiemes_generaux)` ; clé ALUR existe (`category='alur'`) |
| **État daté conforme au modèle réglementaire 3 volets** | ⚠️ Écart | 🟠 Majeur | arrêté 13/12/2019 art. 5 ; décret 67-223 art. 5, 6-2 | DB `generate_etat_date_payload` (v1.0 plat) vs front `types.ts` (V2 3 parties) ; edge `generate_etat_date` (PDF v1.0 codé en dur) | Backend émet **v1.0 plat** ; front type/rend **V2** (partie1/2/3) jamais alimentée → retombe sur `EtatDateViewerLegacy` (le PDF V2 est **code mort**). Le PDF **réellement remis** (edge) code en dur « Néant »/« Non applicable » pour travaux votés, procédures, emprunts. 2 snapshots stockés = v1.0 | Réécrire le générateur (**SQL ET edge**) en structure 2.0 à 3 volets + annexe ; corriger le param fantôme `p_user_id` |
| Répartition vendeur/acquéreur par date d'exigibilité | ⚠️ Écart | 🟠 Majeur | art. 6-2 décret 67-223 ; art. 14-1 loi 65-557 | `generate_etat_date_payload` étape 7 (`due_date > CURRENT_DATE`) ; `validate_mutation` | Borne sur `CURRENT_DATE`, pas la date de cession. Aucun split vendeur/acquéreur réel (100% sur vendeur). `validate_mutation` ne réimpute ni ne poste rien. La machinerie V2 est une **coquille vide**. **NB** : exigibilité légale = `issue_date` (1er jour trimestre), PAS `due_date` (~1 mois après sur la boucle d'or) | Créer un **vrai** générateur V2 ; borner sur `issue_date <= signature_date` (vendeur) sinon acquéreur ; écriture de transfert solde 450 vendeur→acquéreur à la validation |
| Historique lot_owners append-only (jamais de DELETE) | ✅ Conforme | ⚪ Info | art. 20 loi 65-557 | `validate_mutation` ; `assignOwnerToLot` ; `archiveCoproprietaire` | 3 chemins font `UPDATE end_date + INSERT`, jamais DELETE (grep vide, 0 trigger cascade). Frontière = `signature_date`. 30 lignes, 1 `end_date` cohérente, 0 doublon primaire | RAS. Option : trigger `BEFORE DELETE` append-only |
| État daté figé (snapshot immuable), accès vendeur coupé à end_date | ✅ Conforme | ⚪ Info | art. 20 loi 65-557 | `etat_date_snapshots` ; vues `v_lot_balance`/`v_owner_statement` (`end_date IS NULL`) | Payload JSON figé append-only. Vues filtrent `end_date IS NULL AND is_primary` → vendeur disparaît à end_date. Pas de RLS/portail (propriété des vues, pas contrôle d'autorisation) | RAS. Avant portail : borner l'accès vendeur start/end ; figer le snapshot final |

**Synthèse.** Le socle d'**historisation** des propriétaires est correct (soft-delete par `end_date`, aucun DELETE, frontière calée sur la signature, snapshot immuable). Mais l'**état daté lui-même** souffre de trois écarts **majeurs** de conformité réglementaire : (1) la **quote-part ALUR** est structurellement à 0 (filtre `lot_id` sur un compte sans dimension lot) ; (2) le **modèle légal 3 volets** n'est jamais généré — le PDF réellement remis (edge) est un v1.0 incomplet, la V2 du front est du code mort ; (3) la **répartition vendeur/acquéreur par exigibilité** n'est ni calculée (borne `CURRENT_DATE`) ni matérialisée par une écriture. Domaine différé hors chantier finance actif, mais bloquant pour le go-live mutations.

---

## Chapitre 8 — Clôture / à-nouveau / affectation résultat + 5 annexes

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| **Affectation du résultat 120/110 → 450 par quote-part à l'approbation** | ⚠️ Écart | 🔴 Bloquant | Décret 2005-240 art. 6 + annexe 1 « après répartition » ; loi 65-557 art. 14-1 | `regularize_period` = **stub** (`RETURN success:true, skipped:'WP5.3 not implemented'`) | La fonction d'affectation **ne fait rien** : ne lit rien, ne crée aucune écriture. Aucune RPC `affecter_resultat`. Recalcul boucle d'or 2025 : résultat = charges 890 − produits **235** = **655 € déficit** (et non 755), **jamais** porté sur 120 ni réparti sur 450. `open_next_period` en a la capacité mais **n'a pas tourné** | Implémenter `regularize_period`/`affecter_resultat` : lire solde 120, transaction datée à l'AG N+1 ventilant par quote-part en D/C 450-1 par lot (D120/C450 excédent, D450/C120 complément) ; option remboursement via 512 |
| **À-nouveau : report soldes 1/4/5 + résultat 6/7→120 vers N+1** | ⚠️ Écart | 🟠 Majeur | Arrêté 14/03/2005 (annexes) ; intangibilité bilan d'ouverture (PCG) | `open_next_period` (correcte) — **jamais exécutée** ; `activate_ag_decisions/APPROVE_ACCOUNTS` n'enchaîne **pas** `open_next_period` | Recalcul : **0** tx `source_type='opening_balance'`. Soldes 2025 orphelins : 450=-635, 512=-120, **120=+755** (reprise s'équilibrant à 0). 2026 peuplé de données de test ne se réconciliant pas avec un à-nouveau. Fonction OK, séquence métier non déclenchée (gap **d'orchestration**) | Enchaîner `open_next_period` après `approve_period` dans `APPROVE_ACCOUNTS` ; garde-fou UI signalant un exercice clos sans à-nouveau N+1. Exécution **différée** (donnée immuable) |
| Annexe 1 équilibrée (Actif = Passif) | ⚠️ Écart | 🟠 Majeur | Décret 2005-240 annexe 1 ; partie double | `close_period` (UPDATE statut only) ; `fn_annexe_1` (pas de section 120) | Annexe 1(2025) **déséquilibrée** : 2 causes cumulées — (i) résultat/compte 120 **absent du passif** ; (ii) `fn_annexe_1` **additionne la trésorerie des deux côtés**. Écart entre totaux internes = 635 € ; écart bilanciel vrai = 755 €. GL équilibré (2685=2685) : défaut de **présentation** | Afficher le solde 120 en section capitaux ET/OU rendre `open_next_period` obligatoire avant publication (évite la double écriture du résultat) ; corriger le double-comptage trésorerie |
| `fn_annexe_5` colonne D « appels reçus » rattachée à l'opération | ⚠️ Écart | 🟡 Mineur | Décret 2005-240 annexe 5 (arrêté 14/03/2005) | `fn_annexe_5` colonne `appels_recus_d` (`a.code LIKE '12%'`, sans `budget_id` ni `period_id`) | **Mauvais compte** : somme le 12x (solde en attente, equity) au lieu de **702** (provisions travaux) — cf. `fn_annexe_4` qui fait correctement `702%` + `period_id`. + pas de corrélation opération/période. Colonne D quasi-nulle. Preuve nulle en actif (budget works en `draft`) | Aligner sur `fn_annexe_4` : taper sur **702** (pas 12x), borner par `period_id`, corréler au budget travaux. (Défaut de rattachement par opération commun aux 2 annexes, à traiter globalement) |
| `fn_annexe_2` : réalisé charges = classe 6, jamais classe 7 | ✅ Conforme | ⚪ Info | Décret 2005-240 annexe 2 | `fn_annexe_2` (CTE `charge_lines` 6%, `product_lines` 7%) | **Bug signalé INFIRMÉ.** Recalcul : `ex_clos_realise` charges = 2980,00 (= net débiteur classe 6), produits = 15000,16 (= net créditeur classe 7), correctement **séparés** y compris dans `fn_dashboard_kpis`. Aucune contamination | RAS. Documenter le test de non-régression (`charge_lines∈6%`, `product_lines∈7%`) |
| Les 5 annexes existent et sont générables | ✅ Conforme | ⚪ Info | Décret 2005-240 art. 5 + annexes 1-5 | `fn_annexe_1`…`fn_annexe_5` + `useAnnexeData.ts` | Les 6 fonctions existent, STABLE, mappées au front. Exécutées sans erreur sur la boucle d'or. **Contredit** `AUDIT_COPROFLEX.md` (« 2-5 manquantes ») | RAS. Réserve : auditer le rendu PDF réglementaire des 5 états |

**Synthèse.** Le bug historiquement signalé sur `fn_annexe_2` (réalisé = produits) est **infirmé** par recalcul (charges classe 6 et produits classe 7 strictement séparés), et les **5 annexes existent** bel et bien. Mais deux écarts ferment la boucle financière : (1) l'**affectation du résultat** est un **stub vide** (WP5.3 non implémenté) — **bloquant** ; (2) l'**à-nouveau n'a jamais été posté** et n'est pas enchaîné par l'approbation des comptes (ramené à **majeur** : la fonction est correcte, c'est un gap d'orchestration, et l'absence d'à-nouveau est normale tant que 2025 n'est pas approuvé). Conséquence chiffrée : l'**annexe 1 de 2025 est déséquilibrée** (résultat absent du passif + double-comptage trésorerie).

---

## Chapitre 9 — Propagation AG → budget → appels

| Règle | Verdict | Sév. | Article | Emplacement | Preuve | Correctif proposé |
|---|---|---|---|---|---|---|
| **Pas de double générateur actif** | ⚠️ Écart | 🔴 Bloquant | Décret 2005-240 art. 1-2 (compta engagement) + loi 65-557 art. 14-1 | `generate_combined_calls_from_ag` ; front `BlocAppelsFonds.tsx:61 → finalisation.api.ts:169` | Second générateur câblé sur écran **actif** : (a) appels `status='draft'`, `budget_id=NULL`, **aucun** `create_ledger_transaction` → **hors GL** ; (b) `ALTER TABLE … DISABLE TRIGGER` (DDL en RPC SECURITY DEFINER) ; (c) pré-marque les `ag_pending_actions` 'activated' → **neutralise** le chemin canonique. **DÉJÀ matérialisé** sur `11111111` : 6 appels draft hors-GL coexistant avec 6 appels canoniques postés sur la même période. Défaut dans les **deux ordres** (neutralise avant / doublonne après) | (1) Retirer l'appel front, router exclusivement par `activate_ag_decisions/generate_calls_from_ag_payload` ; (2) déprécier/réécrire `generate_combined` pour poster au GL sans DDL ; (3) si conservée : jamais de DDL |
| Σ appels = budget voté, rattrapage d'arrondi | ⚠️ Écart | 🟡 Mineur | art. 14-1 loi 65-557 ; décret 2005-240 (concordance) | `post_budget_call_for_funds` (cr8) ; migration `272000_cr8` | Code **actuel CONFORME** (double télescopage, Σ exact, recalcul=0 écart). Données figées pré-cr8 : Σ=15000,16 vs 15000,00 (+0,16 €), GL équilibré. Détail prouvé : Ascenseur T1 dernier lot stocké 81,38 vs cr8 81,37 | Aucune correction code. Ne pas toucher la boucle d'or (immuable). Test de non-régression / vue `v_call_total_mismatch` : Σappels = Σbudget_lines par budget |
| `ag_pending_actions` fiable (anti-doublon, statut, intégrité) | ⚠️ Écart | 🟡 Mineur | Pilier auto-population AG→données ; décret 2005-240 (traçabilité amont) | `prepare_ag_decisions` (guard `IF EXISTS … CONTINUE`) ; contraintes table | Anti-doublon **uniquement applicatif**. Aucune contrainte d'unicité sur `(ag_id, resolution_id)`. Sans verrou, 2 appels concurrents en READ COMMITTED → doublons. + `EXCEPTION WHEN OTHERS` masque la cause. Boucle d'or : 0 doublon (risque structurel non réalisé) | **UNIQUE INDEX `(ag_id, resolution_id)`** (full, `resolution_id` NOT NULL — pas `action_type`) ; remontée d'erreur typée ; option advisory lock |
| `finalize_and_activate_ag` atomique et idempotent | ✅ Conforme | ⚪ Info | art. 14-1/14-2 loi 65-557 ; décret 2005-240 | `finalize_and_activate_ag` | `RAISE EXCEPTION` sur échec (rollback total). Idempotence : `IF NOT EXISTS … prepare ELSE skipped` ; activate ne traite que `pending`→`activated`. Boucle d'or : status `finalized`, 2 actions `activated`, 0 doublon | RAS |
| Appels routés par `post_budget_call_for_funds` (écriture GL), pas draft | ✅ Conforme | ⚪ Info | décret 2005-240 art. 14-3 | `generate_calls_from_ag_payload → post_budget_call_for_funds → create_ledger_transaction(auto_post)` | Appels en `status='issued'`, D450-x/C701, tx `posted`. Boucle d'or : `appel_sans_ledger_tx=0`, `appel_status_draft=0`, `appel_budget_null=0` | RAS |
| Lien AG→budget (`source_ag_id`) + activation draft→validated | ✅ Conforme | ⚪ Info | art. 14-1 loi 65-557 | `prepare_ag_decisions` ; `activate_ag_decisions` | Budget `754df77c` `validated`, `source_ag_id`=AG finalized, 4 appels référencent ce budget. Chaîne tracée | RAS |

**Synthèse.** La chaîne **canonique** (`calculate_resolution_result → prepare → activate → generate_calls_from_ag_payload → post_budget_call_for_funds`) est conforme et atomique : erreurs propagées par RAISE (rollback global), idempotence garantie, appels écrits au grand livre (D450-1/C701 postés, équilibrés). Le point **bloquant** est le **second générateur** `generate_combined_calls_from_ag`, câblé sur un écran de finalisation actif, qui crée des appels **hors grand livre**, désactive un trigger en DDL et **neutralise** le chemin canonique — divergence **déjà réalisée** en données réelles sur `11111111`. S'ajoutent l'écart d'arrondi figé pré-cr8 (mineur, code actuel conforme) et l'absence de filet d'unicité base sur `ag_pending_actions` (mineur, risque structurel).

---

## Findings ÉCARTÉES au contre-audit (NON retenues comme problèmes)

Ces findings ont été **infirmées** (`holds=false`) par le contre-audit adverse. Elles ne comptent pas dans le tableau de bord.

| Domaine | Règle initiale | Sévérité initiale | Raison de l'écartement |
|---|---|---|---|
| **1 — AG majorités** | « Base des voix = tantièmes du copropriétaire (et présence valorisée) » → prétendait un *rejet systématique* art.25 si `present_tantiemes=0` | majeur | **RÉFUTÉE.** Le code déployé (`calculate_resolution_result` patché par migration `20260125184422`) dérive les seuils art.25/26/26-1/unanimité de `total_tantiemes = SUM(lots.tantiemes_generaux)` via `compute_ag_quorum`, **indépendant** de `attendance.lot_ids`. Recalcul : avec `present_tantiemes=0`, art.24/25/26/unanimité **tous adoptés** (1000>0, >=501, >=667, >=1000). Aucun rejet systématique. Reste une dette **mineure** d'affichage présence/votes (feuille de présence non peuplée), pas un défaut de calcul de majorité. |
| **4 — Grand livre** | « Robustesse du contrat de retour des RPC (pas de faux succès silencieux) » → s'appuyait sur 17 tx posted vides | mineur | **RÉFUTÉE.** (1) Le correctif proposé (« garde tx posted ≥2 lignes ») **existe déjà** (`IF v_entry_count=0 THEN RETURN success:false` dans `post_ledger_transaction`). (2) Les 17 tx vides proviennent d'un **seed direct** (`status='posted'` inséré hors RPC, `created_by`/`posted_by` NULL, copros « Residence Test ») dont les lignes ont été bloquées par `trg_ledger_entry_no_insert_posted` — **aucun lien causal** avec le `WHEN OTHERS` des RPC. Réduite à une simple note d'hygiène (info). |

---

## Constats transverses (patterns récurrents)

1. **`EXCEPTION WHEN OTHERS THEN RETURN success:false` généralisé.** Présent dans `create_ledger_transaction`, `post_ledger_transaction`, `create_alur_fund_from_ag`, `prepare_ag_decisions`. Masque la cause racine (`SQLERRM` aplati) et **oblige chaque appelant à tester `success`** — or `finalisation.api.ts` ne teste souvent que `error` (transport), pas `success` → risque de **faux succès silencieux**. L'atomicité globale est sauvée par les RAISE de `finalize_and_activate_ag`, mais le pattern reste un piège. *Recommandation transverse : remontée d'erreur typée (SQLSTATE + contexte) ou re-RAISE après log.*

2. **Garanties applicatives non doublées en base (defense-in-depth).** Plusieurs invariants critiques ne reposent QUE sur les RPC, jamais sur une contrainte/trigger : équilibre Σdébit=Σcrédit au posting (ch.4), unicité `ag_pending_actions` (ch.9), `source_id` obligatoire (ch.4), plancher 5% ALUR (ch.6). Tous contournables par un écrit direct (RLS off en dev). Le projet possède pourtant le pattern (`CONSTRAINT TRIGGER` `trg_validate_call_total`/`trg_validate_invoice_total`) — **asymétrie** à résorber.

3. **Migrations à moitié faites (deux patterns qui coexistent).** Récurrent et explicitement contraire aux règles projet :
   - WP2.7 art.24 : a patché `calculate_resolution_result` mais **pas** `compute_majority_threshold` (ch.1).
   - **Double calcul de majorité** back SQL (faisant foi) vs front JS (faux + persisté) (ch.1).
   - **4 algorithmes de ventilation** d'appels concurrents + un `DISABLE TRIGGER` workaround (ch.3).
   - **2 générateurs d'appels** dont un hors-GL câblé en prod (ch.9).
   - **2 versions d'état daté** v1.0 (DB+edge) vs V2 (front, code mort) (ch.7).

4. **Compte chapeau système imputé directement.** Le `450` (is_system, non terminal) reçoit des écritures réelles au lieu de `450-1` (ch.4) ; même nature de problème que les comptes 105/450-5 jamais mouvementés là où ils devraient l'être (ch.6).

5. **Doc vs code divergents, et doc auto-importée.** `business-rules.md` décrit art.24 = présents (faux) et est **auto-importé** dans le contexte projet → propage le mauvais modèle mental (ch.1). À l'inverse, `AUDIT_COPROFLEX.md` prétend « annexes 2-5 manquantes » alors qu'elles existent (ch.8). La documentation n'est fiable ni dans un sens ni dans l'autre.

6. **Vues de reporting découplées du grand livre.** `v_alur_fund_summary` source un solde sur `budget_lines` (665 € fantôme vs 0 € réel, ch.6) ; `fn_annexe_1` double-compte la trésorerie et omet le 120 (ch.8) ; `fn_annexe_5` tape sur le mauvais compte (12x au lieu de 702, ch.8). Le **grand livre doit rester la source unique de vérité**, les vues doivent en dériver.

7. **Données de seed pré-correctifs figées.** L'écart d'arrondi +0,16 € (ch.3/9), les 5 tx sans `source_id` (ch.4), l'absence d'à-nouveau (ch.8) sont tous des **artefacts de seed** antérieurs aux migrations correctives, non régénérés. Distinguer systématiquement « défaut du code actuel » de « donnée historique figée ».

---

## PLAN D'ACTION HOLISTIQUE SÉQUENCÉ

> Les vagues sont ordonnées pour que les correctifs **ne se cassent pas entre eux**. Effort : **S** (≲ ½ j), **M** (1-2 j), **L** (> 2 j). Risque de régression indiqué.
> **Rien n'est appliqué.** Ce plan attend l'arbitrage de Lyes.

### Vague 0 — Hygiène & filets sans dépendance (préparer le terrain)

Aucune dépendance ; à faire avant les vagues lourdes pour sécuriser ce qui suit.

| # | Item | Sév. | Effort | Risque régression |
|---|---|---|---|---|
| 0.1 | MAJ `business-rules.md` (art.24 = voix exprimées) + supprimer la formule fausse | 🟡 | S | Nul (doc) |
| 0.2 | Corriger libellés front : `MAJORITES.ART_26.seuil`, faute légale `ART_26` | 🟡/conf. | S | Nul (texte) |
| 0.3 | Finir migration WP2.7 : aligner `compute_majority_threshold` art.24/ELSE sur voix exprimées | 🟡 | S | Faible (valeur déjà écrasée) |
| 0.4 | Fix `create_alur_fund_from_ag` : `fiscal_periods`→`accounting_periods`, restreindre `WHEN OTHERS` | 🟡 | S | Faible |
| 0.5 | Tests de non-régression : `fn_annexe_2` (6%/7%), Σappels=Σbudget_lines | conf. | S | Nul |

### Vague 1 — Filets d'intégrité base (defense-in-depth) — *dépend de rien, protège tout le reste*

À poser **avant** de toucher aux données/RPC : ces garde-fous attraperont les régressions des vagues suivantes.

| # | Item | Sév. | Effort | Risque régression | Dépend de |
|---|---|---|---|---|---|
| 1.1 | UNIQUE INDEX `ag_pending_actions(ag_id, resolution_id)` | 🟡 | S | **Vérifier 0 doublon existant d'abord** (OK sur base) | — |
| 1.2 | CHECK `source_type 'pièce' ⇒ source_id NOT NULL` | 🟡 | S | Moyen — rétro-rattacher les 5 tx seed 2025 **avant** d'activer | — |
| 1.3 | Vue `v_call_vs_budget_mismatch` (Σappels vs budget) dans `v_finance_integrity_issues` | 🟡 | S | Nul (lecture) ; ignorer arrondis purs | — |
| 1.4 | Rendre le compte chapeau `450` **non-imputable** (garde « compte non terminal ») | 🟠 | M | **Élevé** — doit suivre 1.5 sinon casse les routes qui ciblent 450 | **avant 1.5 NON** : voir note |
| 1.5 | Re-imputer les 3 tx canoniques (`5dbf1fff`, `20773bf1`, `31b8a195`) vers 450-1 + auditer les RPC qui ciblent le chapeau | 🟠 | M | Moyen | **doit précéder 1.4** |
| 1.6 | (Option) `CONSTRAINT TRIGGER` équilibre Σdébit=Σcrédit au posting | 🟡 | M | Faible | — |

> **Note d'ordre 1.4/1.5** : corriger d'abord la **cause** (RPC ciblant le chapeau, item 1.5) puis poser le **verrou** (non-imputabilité, 1.4). Inverser casserait le posting canonique.

### Vague 2 — Unification des générateurs d'appels — *bloque la fiabilité financière, dépend de V1*

C'est la **clé de voûte** : tant que deux générateurs coexistent, les correctifs de ventilation/affectation sont fragiles.

| # | Item | Sév. | Effort | Risque régression | Dépend de |
|---|---|---|---|---|---|
| 2.1 | Retirer l'appel front `BlocAppelsFonds → generate_combined_calls_from_ag` ; router 100% par `activate_ag_decisions/generate_calls_from_ag_payload` | 🔴 | M | Moyen — tester le flux finalisation de bout en bout | 1.3 (filet) |
| 2.2 | Déprécier/supprimer `generate_combined_calls_from_ag` (et son `DISABLE TRIGGER`) | 🔴 | M | Moyen | 2.1 |
| 2.3 | Rendre la boucle « multiple » du wizard atomique (RPC unique `post_budget_call_for_funds(p_installment_index/count)`) | 🟡 | S | Faible | 2.1 |
| 2.4 | Nettoyer/retirer `echeancier.ts` (brouillon localStorage, hors compta) | 🟡 | S | Faible (2 imports) | — |

### Vague 3 — Cloisonnement par nature & ALUR — *dépend de l'unification (V2)*

| # | Item | Sév. | Effort | Risque régression | Dépend de |
|---|---|---|---|---|---|
| 3.1 | `allocate_payment` : paramètre `p_nature` / FIFO indépendant par nature ; `post_owner_payment` propage | 🟠 | M | Moyen — couvre courant/travaux/ALUR | 1.4/1.5 (450-x propres) |
| 3.2 | Brancher `v_alur_fund_summary` sur le solde réel du 105 (ou « budgété » vs « comptabilisé ») | 🟠 | S | Faible | — |
| 3.3 | Garantir enchaînement vote ALUR → émission appel → D450-5/C105 | 🟠 | M | Moyen | 2.1 (générateur unique) |
| 3.4 | Plancher 5% : avertissement front + flag de dérogation serveur (pas EXCEPTION dure) | 🟠 | M | Faible | — |
| 3.5 | RPC `post_alur_transfer` (INSERT `alur_transfers` + D105/C705) ; brancher `useALURData.createTransfer` ET `TransferModal` | 🟠 | M | Moyen | 3.2 |

### Vague 4 — Boucle de clôture financière (le cœur « finance-first ») — *dépend de tout l'amont*

C'est la séquence qui **referme la boucle d'or** ; elle suppose des appels propres (V2) et des 450-x corrects (V1).

| # | Item | Sév. | Effort | Risque régression | Dépend de |
|---|---|---|---|---|---|
| 4.1 | Implémenter `regularize_period`/`affecter_resultat` (120/110→450 par quote-part, daté AG N+1) | 🔴 | L | **Élevé** — écritures réelles, tester excédent ET déficit | V1, V2 |
| 4.2 | Enchaîner `open_next_period` dans `activate_ag_decisions/APPROVE_ACCOUNTS` + garde-fou UI | 🟠 | M | Moyen | 4.1 (ordre approbation→affectation→à-nouveau) |
| 4.3 | `fn_annexe_1` : afficher le 120 au passif + corriger le double-comptage trésorerie | 🟠 | M | Moyen | 4.1/4.2 |
| 4.4 | `fn_annexe_5` : taper sur 702 (pas 12x) + borner `period_id` + corréler au budget travaux | 🟡 | M | Faible | — |

> **Ordre intra-vague 4 critique** : approbation des comptes → **affectation du résultat** (4.1) → **à-nouveau** (4.2) → annexes (4.3). Inverser produirait un bilan d'ouverture incohérent.

### Vague 5 — Conformité PV & documents légaux (go-live, hors boucle financière)

Indépendant de la finance ; peut avancer en parallèle des vagues 3-4.

| # | Item | Sév. | Effort | Risque régression | Dépend de |
|---|---|---|---|---|---|
| 5.1 | Front AG : faire persister la décision par la RPC back (`calculate_resolution_result`) au lieu du calcul JS ; ou corriger `ART_24`/`ART_25_1` (`pour>contre`) | 🟠 | M | Moyen — valeur légale | 0.1 |
| 5.2 | Supprimer toute mention « QUORUM » du PV ; décompte de participation indicatif ; corriger `ag_attendance.tantiemes` (lot_ids vides) | 🟠 | M | Faible | — |
| 5.3 | Vue `v_ag_opposants` (+ défaillants + abstentionnistes) injectée au PV | 🟠 | M | Faible | — |
| 5.4 | Flag `amended_in_session` + neutralisation votes correspondance (défaillants) art.17-1 A | 🟠 | L | Moyen | 5.3 |
| 5.5 | Plafond pouvoirs : règle des 10% au-delà de 3 (RPC source unique) | 🟡 | M | Faible | — |

### Vague 6 — Mutations / état daté (différé, go-live mutations)

| # | Item | Sév. | Effort | Risque régression | Dépend de |
|---|---|---|---|---|---|
| 6.1 | Quote-part ALUR état daté : prorata `SUM(lots.tantiemes_generaux)` (105 sans lot_id) | 🟠 | M | Faible | 3.2/3.3 (105 fiable) |
| 6.2 | Générateur état daté V2 3 volets (**SQL ET edge**) + param fantôme `p_user_id` | 🟠 | L | Moyen | 6.1 |
| 6.3 | Répartition vendeur/acquéreur sur `issue_date <= signature_date` + écriture transfert 450 | 🟠 | L | Moyen | 6.2, V4 |

---

### Récapitulatif des dépendances (chemin critique)

```
V0 (hygiène)  ─┐
V1 (filets DB) ─┼─► V2 (unif. générateurs) ─► V3 (nature/ALUR) ─┐
               │         │                                      ├─► V4 (clôture: affectation → à-nouveau → annexes)
1.5 → 1.4 ─────┘         └──────────────────────────────────────┘
V5 (PV)  ── parallèle, dépend seulement de 0.1
V6 (mutations) ── dépend de V3 (ALUR) + V4 (transfert)
```

**Chemin critique go-live finance** : `V1 → V2 → V3 → V4.1 → V4.2 → V4.3`. C'est cette chaîne qui rend la **boucle d'or financière testable de bout en bout** (priorité utilisateur). Les vagues 5 et 6 (PV, mutations) sont des conditions de go-live **complémentaires** mais hors boucle financière stricte.

---

**Rappel final.** Cet audit est en **lecture seule** : aucune correction n'a été appliquée à la base, au code, aux données ni à la boucle d'or (qui doit rester immuable). Tous les items ci-dessus sont **proposés** et hiérarchisés ; leur exécution, leur ordre définitif et leur périmètre **attendent l'arbitrage de Lyes**, notamment sur les points à logique métier (plancher ALUR dérogeable, modèle d'affectation du résultat excédent/déficit, choix verrou DB vs flux RPC unique pour l'équilibre du grand livre).