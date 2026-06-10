# Fiche 06 — AG : votes, majorités & auto-propagation (RANG 6)

> **Statut : BROUILLON** — Date : 2026-05-30
> Audit logique métier CoProFlex — lecture seule stricte (aucune mutation).
> Projet Supabase `iyfesbjnkpynmwlsmxnp`, schéma `public`.
> Posture double : développeur fullstack senior (intégrité, idempotence, atomicité, remontée d'erreurs) + expert syndic (loi 65-557, décret 67-223).
> **Le rang 6 est le PILIER : c'est le DÉCLENCHEUR amont de tous les autres rangs (budget r3, appels/450 r4, clés r5, conseil r7).**

---

## 1. Identité — périmètre du rang 6

Le rang 6 couvre **le cycle de vie de l'AG, le scrutin et la traduction automatique des décisions votées en état incrémenté de la copropriété**. Trois sous-domaines indissociables :

1. **Tenue de l'AG & scrutin** : convocation → session → enregistrement présence/pouvoirs/correspondance → votes → calcul des majorités → clôture → PV → finalisation.
2. **Droit des majorités** : application des seuils art. 24 / 25 / 25-1 / 26 / 26-1 / unanimité, contrôle des pouvoirs (art. 22), vote par correspondance (art. 17-1 A), quorum (non bloquant), délais (convocation 21 j, contestation 2 mois).
3. **Auto-propagation (AUTO-POPULATION)** : une décision *approuvée* doit incrémenter l'état réel de la copro — budget actif + appels, fonds travaux/ALUR, comptes approuvés → clôture + report N+1, conseil syndical élu, modification de clé → nouvelle version votée. Mécanisme : `prepare_ag_decisions` → `ag_pending_actions` → `activate_ag_decisions`.

**Principe d'architecture financière à respecter** : une décision AG ne touche **jamais** directement le grand livre. Elle crée des *actions* (créer budget, générer appels…) qui, elles, génèrent les écritures. Source unique financière = grand livre (ledger).

---

## 2. Modèle de données + source de vérité

### 2.1 Tables (12)

| Table | Rôle | Source de vérité |
|---|---|---|
| `ag_meetings` | Cycle de vie AG (statut, étapes wizard, dates convocation/PV) | Statut & dates AG |
| `ag_resolutions` | Résolutions + **totaux calculés** (tantiemes_for/against/abstention, voters_*, threshold_*, is_approved, is_bridgeable, vote_details) + `action_type` + `variables` | **Résultat de vote consolidé** (dérivé) |
| `ag_votes` | Votes bruts unitaires (`vote`, `tantiemes`, `vote_source`, `is_excluded`) | **Source brute du scrutin** |
| `ag_attendance` | Présents / représentés / correspondance (pas les absents) | Présence pour quorum |
| `ag_pouvoirs` | Délégations de pouvoir (mandant → mandataire) | Mandats |
| `ag_correspondence_votes` / `ag_correspondence_vote_details` | Formulaires de vote par correspondance + détail par résolution | Votes correspondance avant intégration |
| `ag_pending_actions` | File des incréments à appliquer (action_type, target_table, target_id, payload, status, error_message, result_data) | **File d'auto-propagation** |
| `ag_session_drafts` | Brouillons UI persistés (attendance, votes, résolutions, envoi, milestones…) versionnés | Cache de session (UI), **PAS source légale** |
| `ag_notifications` / `ag_notification_events` / `ag_envoi_tracking` | Traçabilité des envois (couverte par fiche 07 notifications) | Trace légale des envois |

### 2.2 Enums clés

- `vote_direction` (sur `ag_votes.vote`) : `for | against | abstention`
- `vote_source` : `live | correspondence`
- `majority_type` : `art24 | art25 | art25_1 | art26 | art26_1 | unanimity`
- `resolution_status`, `ag_status` (workflow), `attendance_type` : `present | proxy | correspondence`

### 2.3 Fonctions PG (cœur du rang 6, vérifiées via `pg_get_functiondef`)

- **`compute_majority_threshold(majority_type, total_tantiemes, present_tantiemes, total_owners, present_owners)`** — `IMMUTABLE`, retourne `(threshold_tantiemes, threshold_owners, description)`.
- **`calculate_resolution_result(resolution_id)`** — `SECURITY DEFINER`, agrège `ag_votes`, calcule et **persiste** le résultat dans `ag_resolutions`.
- **`compute_ag_quorum(ag_id)`** — calcule présence (informatif).
- **`close_ag(ag_id, closing_notes)`** — itère résolutions `pending/voting`, appelle `calculate_resolution_result`, passe l'AG à `closed`. **Gardé sur `status='in_progress'`.**
- **`rpc_finalize_ag_session`** / **`finish_ag_session`** — chemins de finalisation alternatifs (UI).
- **`prepare_ag_decisions(ag_id)`** — lit les résolutions `is_approved=true` avec `action_type`, crée les `ag_pending_actions`.
- **`activate_ag_decisions(ag_id)`** — applique les actions `pending`.
- RPC d'incrément dédiées **présentes mais non câblées** : `create_budget_from_ag`, `create_alur_fund_from_ag`, `elect_council_from_ag` (voir §6).
- `cast_vote`, `register_correspondence_vote`, `save_ag_pouvoir`, `compute_ag_quorum`, `create_ag_with_standard_resolutions`, `generate_calls_from_ag_payload`, `generate_combined_calls_from_ag`.

### 2.4 Edge functions

`ag_create`, `ag_add_resolution`, `ag_start_session`, `ag_cast_vote`, `ag_close`, `ag_send_convocations`, `ag_send_relance`, `ag_register_attendance` (fiche 07 pour le détail notifications).

### 2.5 Vues

`v_ag_resolution_vote_summary` et `v_ag_vote_stats_by_resolution` (ségrégation live / correspondence et for/against/abstention pour l'affichage).

---

## 3. Règles métier + loi (formules attendues)

| Article | Règle légale | Formule attendue |
|---|---|---|
| **Art. 24** | Majorité simple des voix **EXPRIMÉES** des présents/représentés/correspondance (abstentions exclues) | seuil = `> 50 %` de `(for + against)` — dénominateur = exprimés |
| **Art. 25** | Majorité absolue des voix de **TOUS** les copropriétaires (présents + représentés + **absents**) | seuil = `FLOOR(total_tantiemes/2)+1` |
| **Art. 25-1** | Passerelle : si art. 25 échoue mais `for ≥ 1/3` du total → **second vote immédiat** à l'art. 24 | `for > FLOOR(total_tantiemes/3)` → re-vote art. 24 |
| **Art. 26** | Double majorité : majorité **EN NOMBRE** des copropriétaires **ET** ≥ **2/3** des tantièmes | `for_tantiemes ≥ FLOOR(total*2/3)+1` **ET** `for_owners ≥ FLOOR(total_owners/2)+1` |
| **Art. 26-1** | Passerelle 26 (conditions légales spécifiques) | `for > FLOOR(total_tantiemes/2)` |
| **Unanimité** | 100 % des tantièmes, 0 contre (aliénation parties communes…) | `for ≥ total_tantiemes` ET `against = 0` |
| **Art. 22 (pouvoirs)** | Mandataire ≤ **3 délégations**, **sauf** si `(voix mandants + voix propres) ≤ 10 %` du syndicat | contrôle au mandat et/ou au vote |
| **Art. 17-1 A (correspondance)** | Compte comme **présent**. Si résolution **amendée en séance** → vote correspondance à revalider/neutraliser | flag amendement requis |
| **Quorum** | **PAS de quorum légal en copro** : afficher, ne pas bloquer | informatif uniquement |
| **Convocation (art. 9 décret)** | Délai **21 jours** avant l'AG | `meeting_date ≥ convocation_date + 21 j` |
| **Contestation (art. 42 al. 2)** | Délai **2 mois** à compter de la **notification du PV** (action en contestation, pas nullité automatique) | départ = `pv_sent_at`, pas `closed_at` |

---

## 4. État réel en base (preuves vérifiées)

### 4.1 Calcul des majorités — code RÉELLEMENT en base (CONFORME sur le cœur)

`compute_majority_threshold` (extrait réel) :

```
WHEN 'art24'    THEN FLOOR(p_present_tantiemes/2)+1, NULL, 'Majorité simple des présents/représentés (Art. 24)'
WHEN 'art25'    THEN FLOOR(p_total_tantiemes/2)+1,   NULL, 'Majorité absolue de tous les tantièmes (Art. 25)'
WHEN 'art25_1'  THEN FLOOR(p_present_tantiemes/2)+1,  NULL, ...
WHEN 'art26'    THEN FLOOR(p_total_tantiemes*2/3)+1,  FLOOR(p_total_owners/2)+1, 'Double majorité...'
WHEN 'art26_1'  THEN FLOOR(p_total_tantiemes/2)+1,   NULL, ...
WHEN 'unanimity'THEN p_total_tantiemes,              p_total_owners, ...
```

- **Art. 25, 26, unanimité : formules CONFORMES.** Art. 26 teste bien les deux seuils dans `calculate_resolution_result` : `v_votes_for >= threshold_tantiemes AND v_voters_for >= threshold_owners`.
- **Art. 24 : seuil basé sur `present_tantiemes` (présents+représentés) et non sur les EXPRIMÉS (for+against, hors abstention).** → DÉCISION EXPERT 2026-05-31 : doit être recalculé sur les exprimés. Voir dette VOTES-P2-12.
- **Passerelles 25-1 / 26-1 : la DÉTECTION `is_bridgeable` est codée** (`art25` : `for > FLOOR(total/3)` ; `art26` : `for > FLOOR(total/2)`), **mais aucun automatisme ne crée le second vote** ; `majority_type` est figé à la création → la bascule n'est jamais opérée.

### 4.2 `calculate_resolution_result` — CORRECTION MAJEURE (vs version antérieure de cette fiche)

Le code réel **est correct et persiste tout** (corrige les constats initiaux « UPDATE cassé / fonction jamais appelée », qui étaient FAUX) :

```
UPDATE ag_resolutions SET
  tantiemes_for=..., tantiemes_against=..., tantiemes_abstention=...,
  voters_for=..., voters_against=..., voters_abstention=...,
  threshold_tantiemes=..., threshold_voters=...,
  is_approved=..., is_bridgeable=..., status=...,
  vote_details=jsonb_build_object(...), voted_at=NOW(), updated_at=NOW()
WHERE id=p_resolution_id;
```

Agrégation saine, **mixe live + correspondance** (correct art. 17-1 A) en excluant les neutralisés :
`FROM ag_votes WHERE resolution_id=... AND (is_excluded=false OR is_excluded IS NULL)`. Abstentions stockées séparément ; `is_excluded` = conflit d'intérêt art. 24 II.

**Le vrai problème** (déterminé par lecture de code) :
- `calculate_resolution_result` n'est appelée que par `close_ag`, **gardé sur `status='in_progress'`**.
- En base DEV, l'AG `24d3a499` est `finalized` avec `tantiemes_for=0` / `threshold=NULL` / `voted_at=NULL` alors que `ag_votes` contient ~906 voix `for` → **finalisée par un chemin (`rpc_finalize_ag_session`/`finish_ag_session`) qui n'a jamais déclenché le calcul.**
- `calculate_resolution_result` finit par `EXCEPTION WHEN OTHERS THEN RETURN success:false` → **toute erreur d'UPDATE serait avalée silencieusement.**

### 4.3 Cycle de vie & clôture (CONFIRMÉ)

- `close_ag` calcule les résolutions puis `UPDATE ag_meetings SET status='closed'`. **Aucun `prepare_ag_decisions` ni `activate_ag_decisions`.** L'activation vit côté front (`usePVPage`), couplée à la signature du PV — hors transaction serveur.
- Trois chemins de finalisation concurrents : `close_ag` (calcule), `rpc_finalize_ag_session`/`finish_ag_session` (ne calculent pas) + edge `ag_close` → incohérence (D6-07).

### 4.4 Auto-propagation — `ag_pending_actions` + `activate_ag_decisions` (état réel CONFIRMÉ)

Boucle `WHERE status='pending'`, `BEGIN ... EXCEPTION WHEN OTHERS THEN UPDATE status='failed', error_message=SQLERRM` **par action** :
- **Idempotence partielle** : ne retraite pas les `activated`, mais aucune garde anti-doublon métier (un re-run après remise à `pending` regénérerait des appels).
- **Pas d'atomicité globale** : chaque action committée indépendamment → succès partiel possible (budget validé mais appels non générés).
- **`ELECT_COUNCIL`** ne fait que **désactiver** l'ancien conseil (`is_active=false`) — **n'insère aucun nouveau membre** dans cette branche. ⚠️ NUANCE (confirmée rang 7) : la fonction dédiée `elect_council_from_ag`, elle, **insère bien** ; il manque juste son câblage dans `activate_ag_decisions`.
- **`APPROVE_ACCOUNTS`** = simple `UPDATE budgets SET status='closed'` — pas de clôture de `accounting_periods`, pas de report N+1, pas d'écriture.
- **`CREATE_BUDGET/WORK/ALUR`** = `UPDATE budgets SET status='validated'` sur un budget déjà créé en `draft_from_ag`. Les RPC dédiées `create_budget_from_ag`/`create_alur_fund_from_ag`/`elect_council_from_ag` **existent mais ne sont jamais appelées** (code mort / chemin parallèle).
- `payload` souvent `{}` (variables non remplies en amont).
- Phantom `create_budget_from_ag_with_account_and_key` : **n'existe pas** en base (retirer du backlog historique).

---

## 5. Mal implémenté / dette (priorisé)

### 🔴 P0 — bloquant le PILIER (auto-propagation)

**VOTES-P0-01 — Scrutin non calculé/persisté sur le chemin de finalisation réel.** AG `24d3a499` `finalized` avec `tantiemes_for=0`, `threshold=NULL`, `voted_at=NULL` alors que `ag_votes` contient ~906 `for`. `calculate_resolution_result` est correcte mais appelée seulement par `close_ag` (gardé `in_progress`) ; `rpc_finalize_ag_session`/`finish_ag_session` posent le statut sans calculer. *Action* : tout chemin de finalisation doit appeler `calculate_resolution_result` ; supprimer/relever le `EXCEPTION WHEN OTHERS` qui avale les erreurs ; backfill idempotent des AG finalisées.

**VOTES-P0-02 — `close_ag` n'enclenche pas l'auto-propagation ; activation uniquement côté front (signature PV).** Risque « AG close mais état copro non incrémenté ». *Action* : orchestrateur serveur transactionnel `calculate → prepare → [revue gestionnaire] → notifier PV → activate`. **Décision expert 2026-05-31 : déclenchement à la NOTIFICATION DU PV** (pas à la clôture brute), avec fenêtre de correction avant envoi, puis gel.

**VOTES-P0-03 — `activate_ag_decisions` sans atomicité : succès partiel = état copro incohérent.** Chaque action committée indépendamment ; `EXCEPTION WHEN OTHERS` met en `failed` mais laisse les précédentes committées. *Action* : transaction tout-ou-rien (ou compensation/retry), `result_data` peuplé, `failed` remontés à l'UI.

### 🟠 P1 — conformité du scrutin & robustesse

**VOTES-P1-04 — `ELECT_COUNCIL` (branche d'activate) n'insère aucun membre** (désactive seulement l'ancien). La fonction dédiée `elect_council_from_ag` insère bien (confirmé rang 7) → la câbler. Débloque rang 7.

**VOTES-P1-05 — `APPROVE_ACCOUNTS` sans clôture comptable ni report N+1** (seul `UPDATE budgets SET status='closed'`). Clôturer `accounting_periods`, créer N+1, reporter les soldes (rang 3, écritures via ledger).

**VOTES-P1-06 — RPC d'incrément dédiées non câblées (code mort) + UPDATE directs.** Router `activate_ag_decisions` sur les RPC dédiées, ou les DROP. Phantom `create_budget_from_ag_with_account_and_key` : n'existe pas.

**VOTES-P1-07 — Deux générateurs d'appels divergents** (`generate_calls_from_ag_payload` incrémental vs `generate_combined_calls_from_ag` destructif). Unifier (rang 4 D-10) ; le déclencheur AG appelle le canonique idempotent.

**VOTES-P1-08 — Pouvoirs art. 22 : exception 10 % non implémentée, aucun contrôle au vote.** `save_ag_pouvoir` plafonne à 3 sans calcul des 10 % ; `cast_vote` ne contrôle rien. → `validate_proxy_powers(ag_id, mandataire_id)`.

**VOTES-P1-09 — Correspondance + amendement en séance : pas de revalidation** (art. 17-1 A). Ajouter `ag_resolutions.is_amended` ; neutraliser/alerter à la clôture.

**VOTES-P1-10 — Payloads d'actions vides** (`COALESCE(variables,'{}')`, modalités/montants/dates absents). Garantir le remplissage de `ag_resolutions.variables` (edge `ag_add_resolution`) ; documenter le schéma par `action_type`.

**VOTES-P1-11 — Absents non tracés** (notification PV art. 42). `ag_attendance` ne stocke que présents/représentés/correspondance. Dériver les absents à la clôture (lot_owners actifs − ag_attendance).

### 🟡 P2 — cohérence & qualité

**VOTES-P2-12 — Art. 24 : seuil sur présents, pas sur exprimés.** DÉCISION EXPERT 2026-05-31 : recalculer sur `(for+against)`, abstentions exclues. `FLOOR(present_tantiemes/2)+1` → majorité des exprimés.

**VOTES-P2-13 — Pas de contrainte (resolution_type, majority_type) ni forçage unanimité aliénation.** Table `resolution_type_rules` + CHECK.

**VOTES-P2-14 — Couverture des incréments incomplète : `MODIFY_REPARTITION_KEY` et travaux urgents absents.** Ajouter `MODIFY_REPARTITION_KEY` (INSERT nouvelle version de clé, jamais écraser — R5-D2) et `MANAGE_WORK_URGENT` (statut « engagé syndic, ratification en attente », art. 37 décret).

**VOTES-P2-15 — `ag_session_drafts` sans FK vers `ag_meetings` ; désync UI/BD.** FK `ON DELETE CASCADE` ; le PV se construit depuis `ag_resolutions`/`ag_votes`, jamais depuis `draft_data`.

**VOTES-P2-16 — Convocation 21 j non contrôlée en base** (warning seulement post-envoi). CHECK ou `validate_convocation_deadline`.

### 🟢 P3

**VOTES-P3-17 — Contestation PV (2 mois) non outillée.** `pv_sent_at` existe (souvent NULL) ; calculer `pv_contestation_deadline = pv_sent_at + 2 mois` + alerte. (`pv_signed_at` n'existe pas — constat antérieur inexact.)

> *Constats réfutés par la vérif :* « UPDATE cassé / fonction jamais appelée » (le code persiste bien) ; enum `attendance_type` (l'edge rejette la valeur invalide) ; phantom `create_budget_from_ag_with_account_and_key` (inexistant) ; `pv_signed_at` (inexistant).

---

## 6. Sources divergentes → source unique

| Sujet | Sources divergentes | Source unique cible |
|---|---|---|
| Résultat d'un vote | `ag_votes` (brut) vs `ag_resolutions.*` (consolidé) | `ag_votes` = source brute ; `ag_resolutions` = projection recalculable via `calculate_resolution_result` |
| Finalisation AG | `close_ag` / `rpc_finalize_ag_session` / `finish_ag_session` / edge `ag_close` | **un seul** orchestrateur (à choisir : `close_ag`) appelant calcul + `prepare`+`activate` |
| État voté → données copro | résolution `is_approved` vs état réel (budget/CS/clé) | `ag_pending_actions` appliqué par `activate_ag_decisions` (idempotent) |
| Total tantièmes pour seuils | base partielle éventuelle vs clé générale (rang 5) | clé générale `repartition_key_lines` (source unique tantièmes) |
| Brouillon vs réel | `ag_session_drafts` vs tables `ag_*` | tables `ag_*` = légales ; draft = cache, purgé à la finalisation |

---

## 7. Questions expert (décisions métier à trancher)

1. **Déclenchement de l'auto-propagation** : automatique à la clôture (`close_ag` appelle `activate`) ou étape manuelle validée par le gestionnaire (revue avant application) ? Recommandation : auto à la clôture **mais** en transaction tracée + possibilité de rejeu sûr.
2. **Art. 24 dénominateur** : confirmer que le seuil doit être la majorité des **exprimés** (for+against), abstentions exclues — et corriger `compute_majority_threshold`.
3. **Passerelle 25-1** : second vote **immédiat automatique** dans la même session, ou proposé au président de séance ?
4. **Pouvoirs art. 22** : bloquer au mandat la 4ᵉ délégation (sauf ≤10 %), ou alerter sans bloquer ?
5. **Report N+1 / clôture des comptes** : `close_accounts` doit-il créer l'écriture de report et le budget N+1 en une seule action AG ?
6. **Correspondance amendée** : neutraliser automatiquement ou exiger un re-vote présentiel explicite ?
7. **Élection CS** : `elect_council_from_ag` doit-il peupler `council_members` (rang 7) directement à l'activation ?

---

## 8. Vue d'ensemble & impacts transverses (le PILIER)

**Le rang 6 est le moteur d'incrémentation de toute l'application.** Son dysfonctionnement explique en partie les symptômes financiers constatés en rangs 1-4 : si l'auto-propagation ne s'exécute pas (D6-01/D6-02), alors **le budget voté ne devient jamais actif, les appels ne sont pas générés, et le grand livre reste vide** — ce qui rejoint la cause racine « ponts d'alimentation cassés ».

```
AG (résolutions votées)
   │  close_ag  ──►  calculate_resolution_result  (majorités)   [✅ cœur conforme, ⚠️ art.24]
   │
   ▼  prepare_ag_decisions ──► ag_pending_actions ──► activate_ag_decisions   [🔴 non déclenché + squelette]
        ├─ create_budget      → budgets (rang 3)            → budget ACTIF
        ├─ generate calls     → call_for_funds (rang 4)     → écritures 450/701 (grand livre)
        ├─ create_alur_fund   → clé ALUR (rang 5 D5-01)     → fonds travaux
        ├─ update_repartition → nouvelle version de clé (rang 5 D5-02)
        ├─ elect_council      → council_members (rang 7)
        └─ close_accounts     → clôture + report N+1 (rang 3/1)
```

**Dépendances critiques :**
- **→ Rang 3/4** : `create_budget` + génération d'appels sont la jonction AG→finances. Tant que D6-01/02 tiennent, les corrections P0 du rang 4 (edge functions ledger) ne suffiront pas : il manquera le **déclencheur**.
- **→ Rang 5** : `update_repartition_key` doit créer une **nouvelle version votée** (D5-02 versioning) — l'AG est le seul point d'entrée légal pour modifier une clé (art. 11/25 b).
- **→ Rang 5 (ALUR)** : `create_alur_fund_from_ag` doit peupler la clé ALUR aujourd'hui orpheline (D5-01).
- **→ Rang 7** : `elect_council_from_ag` alimente le conseil syndical.

**Verdict :** le scrutin (cœur de calcul des majorités) est **étonnamment solide** — formules art. 25/26/unanimité conformes, abstentions séparées, exclusion de vote gérée. Mais **l'auto-propagation, qui est LA raison d'être de l'outil, n'est pas opérationnelle** (non déclenchée + squelette + non idempotente + échecs silencieux). C'est le **chantier P0 le plus structurant de tout l'audit**, car il commande la valeur de tous les autres rangs.
