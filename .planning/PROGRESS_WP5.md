# PROGRESS — WP5 : Clôture, cut-off, à-nouveau, régularisation, engagement

Suivi multi-sessions du chantier WP5 (comptabilité de fin d'exercice).
Détail technique durable WP5.1 → mémoire `wp5_1_periode_anouveau`.

## WP5.1 — Période multi-état + report à-nouveau ✅ LIVRÉ (2026-06-01)
9 migrations sur `v2` (non poussées), `20260601090000` → `20260601098000` :
1. normalize_report_accounts (110/120)
2. source_type opening_balance
3. exemption immutabilité ciblée
4. index unique reprise
5. close_period (hardening) + approve_period + regularize_period (stub)
6. open_next_period
7. hook AG (prepare/activate_ag_decisions)
8. fix carry : reporter AUSSI 110/120 (corrige le 2e rollover) ← code-review
9. fix AG : échec franc si période introuvable ← code-review

Tests boucle d'or : rollover 1 an + 2 ans équilibrés ; idempotence OK ; boucle d'or restaurée.

### Reste à faire sur WP5.1 (différé, non bloquant)
- [ ] **Tester gel + chemin AG (Tests 6/7)** sur une **copro jetable** (approbation irréversible → pas sur la boucle d'or). Crée une AG `APPROVE_ACCOUNTS` (dates ISO), `prepare`+`activate`, assert période `approved` + reprise figée + `open_next_period` refusé.
- [ ] **Séparation courant/travaux des classes 6/7** : aujourd'hui tout le résultat va en 120, le 110 reste à 0. À implémenter quand la typologie des comptes de gestion (travaux/exceptionnel) sera tranchée avec l'expert.
- [ ] Cleanups code-review : libellé 120 du gabarit d'onboarding à aligner sur « Solde en attente sur opérations courantes » ; prédicat d'exemption dupliqué 4× (optionnel : extraire un helper).

## WP5.2 — Cut-off 408/486 + verrou ✅ CŒUR LIVRÉ (cleanups différés : types TS, index TOCTOU)
**Design révisé (2026-06-01, validé expert)** : on ABANDONNE le canal d'écriture en période fermée + le statut `locked`/`lock_period`/`ledger_locks`. Constat vérifié : le gel du courant est DÉJÀ effectif via la garde `status != 'open'` ; `ledger_locks` était du code mort ; `lock_period` était une orpheline prod-only (dérive base↔git). Correction d'un exercice clôturé-mais-pas-approuvé = **réouverture contrôlée** (intangibilité = approbation AG seulement).

- [x] **Point 1 — nettoyage du verrou mort** (commit `6cb4027`) : `DROP ledger_locks` (table+contrôle dans post_ledger_transaction), `DROP lock_period`. Vérifié en base.
- [x] **Point 2 — `reopen_period`** (commit `a5be343`, durci `a3da4fc`) : closed/locked/**rejected**→open, 4 garde-fous (approuvé / autre période ouverte / exercice postérieur approuvé / efface marqueurs). Validés sur copro jetable `075c0249`. **Décision métier (2026-06-01)** : `rejected` (comptes rejetés en AG, art. 11 décret 67-223) est RÉOUVRABLE — non intangible, doit être corrigé puis re-présenté. `approved` seul est intangible.
- [x] **Point 3 — cut-off générique** ✅ LIVRÉ (2026-06-01) : moteur générique **4 natures** (CAP/CCA/PCA/PAR), contrepartie paramétrable (408/421/431/432/486/487/4618), flag **`auto_reverse`** (estimations extournées vs dettes certaines soldées au paiement), extourne auto au 01/01 via `open_next_period`, immutabilité étendue au `closing` (double test source+accueil), index unique `(copro,source_id,period_id) WHERE closing`. **5 migrations appliquées + commitées** sur `v2` : `20260601110000` immutabilité closing (`47ce257`) · `111000` table period_cutoff_items + index (`150074b`) · `112000` cutoff_entry_pair + post_period_cutoff (`b6604ee`) · `113000` reverse_period_cutoff (`1bd67ef`) · `114000` hook open_next_period atomique + nettoyage msg lock_period (`b3b974c`). **Test end-to-end T6 validé** sur jetable `075c0249` (exercice 2097→2098) : 4 natures + CAP sociale ; cut-off équilibré ; extourne auto `reversed=4` ; en N+1 → 408/486/487/4618=0, 431=-200 (dette certaine reportée) ; idempotence (1 seule extourne) ; gel (exempt `closing` = false sur approuvé) ; toutes périodes équilibrées. Boucle d'or `22222222` intacte (aucun à-nouveau posté dessus, non mutée). Exclusions documentées : intérêts ALUR (→105), dépréciations 491/492.

Tests B (chemin AG approbation + gel + immutabilité + irréversibilité) **validés** sur jetable `075c0249` (exercice synthétique 2099→2100). Footprint de test laissé sur cette copro (2026 closed, 2099 approved, 2100 closed).

### Revue de code des migrations pt1+pt2 (2026-06-01)
- [x] **Durcissement `reopen_period`** (commit `a3da4fc`, appliqué en base) : migration `supabase/migrations/20260601102000_wp5_2_reopen_period_hardening.sql`. Contenu final (au-delà du plan initial, après audit adverse 4 angles) : (1) bloc `EXCEPTION WHEN OTHERS → {success:false}` (contrat JSON) ; (2) garde explicite des statuts réouvrables `closed/locked/rejected` + UPDATE filtré idem (l'ancien UPDATE était inconditionnel) — `rejected` rendu réouvrable suite à décision métier ; (3) `GET DIAGNOSTICS ROW_COUNT` → `success:false` si 0 ligne (ferme la fenêtre « success:true sur 0 ligne » sous course de statut). Testé sur jetable `075c0249` : closed→open / noop / approved-refus / re-close / later-approved-refus / rejected→open.
- [ ] **Régénérer les types TS** : `src/types/supabase.ts` contient encore `ledger_locks`/`lock_period` (supprimés) et **manque** `reopen_period`. Supprimer aussi `src/lib/supabase/database.types.ts` (2ᵉ fichier de types, orphelin/non importé).
- [ ] **TOCTOU « 1 seule période open »** : la garde de `reopen_period` + le trigger `check_single_open_period` sont des EXISTS non verrouillants → 2 réouvertures concurrentes de périodes différentes peuvent créer 2 périodes `open`. Fix : index unique partiel `CREATE UNIQUE INDEX ... ON accounting_periods(copro_id) WHERE status='open'` (durcit l'invariant global ; tester tous les flux période).
- [ ] **Garde 4 `reopen_period` sur-bloque** (heuristique `start_date >` au lieu du lien réel `opening_balance.source_id`) : comportement *fail-safe* (bloque trop, jamais trop peu). Raffinement optionnel : indexer sur l'existence d'une reprise `source_id = période` dont la cible est `approved`.
- Message d'erreur `lock_period` dans `open_next_period` (097000:48) : **déjà corrigé par le plan cut-off (Task 5)** qui réécrit la fonction. Faux positifs écartés : « perte du gel sélectif » (levier jamais câblé) et statut `locked` zombie (label d'enum gardé inerte par décision).

### Revue de code WP5.2 cut-off (2026-06-01, workflow recall 15 findings)
Triée : aucun bug bloquant (la majorité par-design / réfutés / TOCTOU acté). **3 durcissements différés** (non bloquants, ne PAS réécrire les migrations appliquées sans décision) :
- [ ] **Réversion aval périmée** : `post_period_cutoff(N)` ne nettoie pas l'extourne déjà posée en N+1 (régénérée seulement au prochain `open_next_period`). OK dans le flux documenté (transitoire, N+1 fermée pendant la correction), mais flux interrompu = extourne périmée. → durcir (DELETE de l'extourne aval si N+1 non approuvée) ou documenter l'obligation de re-`open_next_period`.
- [ ] **`reverse_period_cutoff` re-dérive N+1** (start_date>… LIMIT 1) au lieu de recevoir le `v_next_id` calculé par `open_next_period` → divergence possible si dates non contiguës (mitigé par garde « N+1 open » + rollback). → passer `p_next_period_id` en paramètre.
- [ ] **Messages d'erreur** : `RAISE 'Échec… %', v_tx_res` → utiliser `v_tx_res->>'error'` ; `reopen_period` renvoie `SQLERRM` brut (assumé) ; pas de validation de classe de compte dans `post_period_cutoff` (45x en account_id échoue opaquement — la spec §6 voulait ce contrôle).

## WP5.3 — Régularisation (affectation du résultat) ⏳
- Remplacer le stub `regularize_period(copro, période)` : répartir l'excédent/déficit 120/110 → 450 par quote-part, à l'approbation AG.

## WP5.4 — Couche engagement ⏳
- Voté → engagé → réalisé → payé (cf. mémoire `compta_engage_realise`).
