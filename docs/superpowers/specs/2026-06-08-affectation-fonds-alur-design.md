# Spec — Affectation du fonds de travaux ALUR (trou #1 du module budget)

**Date :** 2026-06-08
**Branche :** finance-drift-rebranchement
**Statut :** design validé (USER 2026-06-08) ; plan d'implémentation écrit puis **revu par 2 workflows ultra** (SQL 0037 + re-vérif solo) → verdict **go-with-fixes**, correctifs intégrés (solde = 105 cumulé, pré-gardes, sérialisation, gate durci).

---

## 1. Problème

Dans l'onglet ALUR du module budget, le bouton « Transfert ALUR » est décoratif :
`handleTransferALUR` (`src/hooks/modules/useBudget.ts:447`) ne fait qu'un `alert()` puis
ferme la modale. Aucune écriture comptable, aucune trace en base.

L'objectif : rendre ce bouton réel et **légalement correct**, en s'appuyant sur l'infra
déjà câblée mais « faux-morte » (table `alur_transfers`, vues `v_alur_fund_summary` /
`v_alur_transfers_history`), à laquelle il ne manque que les RPC d'écriture.

## 2. Décisions métier (tranchées avec USER)

1. **Affectation aux travaux votés uniquement.** Le fonds ALUR (art. 14-2 II) est
   réglementé : il ne peut financer que des travaux décidés en AG. Pas de transfert
   libre vers le compte courant.
2. **Le bouton ne fait que la décision comptable** (reprise de réserve), pas le
   mouvement de trésorerie. Le cash réel (Livret A → compte courant) est tracé
   séparément, avec un **rappel** tant qu'il n'est pas réglé.
3. **Jamais de refus silencieux** : toute tentative interdite (ex. destination compte
   courant) renvoie un message explicite.
4. **Vision long terme** (hors scope de cette spec) : connexion API bancaire en lecture
   seule pour réconcilier automatiquement le règlement du cash.

## 3. Modèle comptable

Deux événements distincts dans le temps, donc deux écritures séparées :

| Événement | Écriture | Nature |
|-----------|----------|--------|
| **Affectation** (décision) | **D 105 / C 705** | Reprise de la réserve ALUR (105) couverte par le produit d'affectation (705). Aucun cash ne bouge. |
| **Règlement cash** (plus tard) | **D 512 / C 502** | Le cash quitte le Livret A fonds travaux (502) vers le compte courant (512). |

**Comptes** (déjà seedés par `provision_copro_chart`, tous postables) :
- `105` Fonds de travaux ALUR (art. 14-2 II) — equity
- `705` Affectation du fonds de travaux — income
- `502` Livret A (fonds travaux) — asset (compte séparé)
- `512` Banque (compte courant) — asset

**Règle de cut-off (critique) :** l'écriture d'affectation D105/C705 doit être postée
dans **le même exercice comptable que la charge de travaux** (671/672…). C'est ce qui
permet, à la clôture, la neutralisation correcte (cf. §6).

## 4. Modèle de données

Table existante `public.alur_transfers` (migration 0016) — colonnes actuelles :
`id, copro_id, budget_id (FK budgets ON DELETE SET NULL), destination
(transfer_destination), amount, transfer_date, ledger_tx_id (FK ledger_transactions
ON DELETE RESTRICT), notes, created_at, updated_at`.

**Ajout (migration nouvelle, voir §8) :**
- `cash_settled boolean not null default false` — le virement réel a-t-il eu lieu ?
- `cash_settled_at date` (nullable) — date du règlement cash.
- `cash_ledger_tx_id uuid` (nullable, FK ledger_transactions ON DELETE RESTRICT) —
  lien vers l'écriture D512/C502 du règlement.

**Valeurs d'enum réelles** (`transfer_destination` = `'works','reserve','operating','other'`) :
- affectation aux travaux → `destination = 'works'`
- compte courant (refusé) → `'operating'`

## 5. RPC à créer

### 5.1 `post_alur_transfer` — la décision d'affectation

Signature (à finaliser au plan) :
`post_alur_transfer(p_copro_id uuid, p_budget_id uuid, p_amount numeric, p_transfer_date date, p_notes text default null) returns jsonb`

Comportement, dans une seule transaction :
1. Garde : `is_service_call()` OU `user_is_copro_manager(p_copro_id)` (cohérent avec
   les autres RPC finance).
2. Vérifie que `p_budget_id` est un budget **travaux** (`budget_type='works'`) **voté**
   (`status='validated'`) de la copro. Sinon → `{success:false, error:'…'}` explicite.
3. Vérifie `0 < p_amount ≤ solde cumulé du compte 105` (Σ crédit−débit du 105 de la
   copro, **toutes périodes postées** — le fonds ALUR est pluriannuel). PAS
   `v_alur_fund_summary` (qui est un solde prévisionnel par exercice). Sinon → erreur
   explicite (« montant supérieur au solde disponible du fonds »).
   Pré-gardes additionnelles (revue 2026-06-08) : `p_transfer_date` non NULL, et la
   période du budget travaux doit être `'open'` (sinon `{success:false}` lisible —
   sinon `create_ledger_transaction` lèverait une exception brute, contraire au contrat).
4. Poste l'écriture via `create_ledger_transaction(... source_type:='transfer',
   source_id:=p_budget_id, p_entries:=[D105, C705], p_auto_post:=true)` dans la
   **période du budget travaux** (`budget.period_id`) — garantit le cut-off avec la
   charge 671 (§3). Sérialisation : `pg_advisory_xact_lock` sur la copro avant la lecture
   du solde, pour empêcher deux affectations concurrentes de sur-affecter le fonds.
5. Insère la ligne `alur_transfers` (`destination='works'`, `budget_id`, `amount`,
   `transfer_date`, `ledger_tx_id` = tx créée, `cash_settled=false`, `notes`).
6. Retourne `{success:true, transfer_id, ledger_tx_id}`.

Refus explicite si destination = compte courant (côté front la destination est forcée à
« travaux » ; la RPC reste défensive et renvoie un message si on lui passe autre chose).

**Cœur partagé (décision USER 2026-06-08).** `post_alur_transfer` est conçue pour être
le moteur unique de l'affectation, appelable par DEUX entrées : (1) le bouton manuel du
module budget (cette spec), et (2) plus tard, une nouvelle action d'AG `AFFECT_ALUR_FUND`
branchée dans `activate_ag_decisions` (l'affectation du fonds est juridiquement une
décision d'AG). La garde `is_service_call()` permet déjà l'appel depuis l'activation AG
(contexte service). Le chemin AG est un **suivi** (voir §9), pas dans cette spec, mais la
signature de la RPC ne doit pas l'empêcher.

### 5.2 `settle_alur_transfer_cash` — le règlement du cash réel

Signature : `settle_alur_transfer_cash(p_transfer_id uuid, p_settled_date date) returns jsonb`

1. Garde manager/service.
2. Charge la ligne `alur_transfers` **`FOR UPDATE`** (sérialise les règlements
   concurrents) ; si `cash_settled` déjà true → message explicite (« virement déjà
   marqué comme effectué »), pas de double écriture.
3. Poste l'écriture D512/C502 (`source_type='transfer'`, `source_id=p_transfer_id`) dans
   la période ouverte.
4. Met à jour la ligne : `cash_settled=true, cash_settled_at=p_settled_date,
   cash_ledger_tx_id = tx créée`.
5. Retourne `{success:true, cash_ledger_tx_id}`.

## 6. Audit cascade (réalisé 2026-06-08) — 🟢

- **Route GL** : `create_ledger_transaction` valide période ouverte + équilibre (au
  commit) + postabilité ; D105/C705 et D512/C502 sont équilibrées et sans `lot_id`
  (trigger `trg_enforce_lot_id_on_45x` ne s'applique qu'au 45x). OK.
- **`source_type`** : valeur `'transfer'` déjà dans l'enum `ledger_source_type` →
  aucune migration d'enum. OK.
- **Clôture / résultat** (`open_next_period`, 0027) : le 705 appartient au panier
  « résultat travaux » routé vers le 110. La charge D671 (+) est neutralisée par le
  C705 (−) ; si le fonds couvre tout, net travaux = 0 → rien ne remonte au 110 → pas de
  rappel aux copropriétaires. **Aucun double-comptage** — c'est le mécanisme légal
  attendu. Conditionné à la règle de cut-off (§3).
- **`alur_transfers`** : FK saines (`ledger_tx_id` ON DELETE RESTRICT protège le lien) ;
  vue `v_alur_transfers_history` non fragile (l'ajout de colonnes ne casse pas une vue) ;
  client front non typé (`as any`) → l'ajout de colonnes ne casse pas la compilation.
- **Comptes** 105/705/502/512 seedés et postables pour chaque copro. OK.

Edge case noté (non bloquant) : `budget_id ON DELETE SET NULL` — supprimer un budget
travaux orphelinerait `budget_id` du transfert (l'écriture GL survit). `deleteBudget`
n'autorise que les brouillons, or un budget affecté est `validated` → non supprimable
via l'app. Acceptable.

**Correctif post-revue (2026-06-08)** : le plafonnement du montant était initialement
décrit via `v_alur_fund_summary` (solde par exercice) — **faux** pour un fonds
pluriannuel et incohérent avec la source serveur. Corrigé : la borne (serveur ET front)
est le **solde cumulé du compte 105**. La revue a aussi confirmé qu'il fallait : une
pré-garde « période ouverte » (sinon exception brute), la sérialisation anti-double-clic,
et un gate prouvant réellement la neutralisation 705→110 + la garde de sécurité.

## 7. Front (branchement)

- `useBudget.ts` : `handleTransferALUR` appelle `post_alur_transfer` (remplace l'`alert()`),
  affiche succès/erreur explicite, puis `refresh()` + rechargement ALUR.
- **`TransferModal` à RÉÉCRIRE** (pas un simple branchement) : aujourd'hui les champs ne
  sont pas contrôlés et le bouton appelle `onTransfer(5000, 'COMPTE_COURANT')` **en dur**
  (montant figé + destination interdite). Il faut un formulaire contrôlé (montant saisi,
  budget travaux sélectionné), retirer l'option compte courant, et **borner la saisie sur
  le solde cumulé du 105** (cf. ci-dessous), pas sur le solde par exercice.
- **Source unique du solde (décision USER 2026-06-08)** : nouvelle vue
  `v_alur_fund_balance` (solde cumulé du 105 par copro) ; la modale, le bandeau et le
  `soldeActuel` exposé par `useBudget` lisent CETTE vue — plus de divergence front/serveur,
  on abandonne `v_alur_fund_summary` comme borne de saisie.
- Filtre des budgets éligibles dans la modale : seulement les budgets travaux **votés**
  (état front `EN_COURS` = DB `validated`), pas les clos (`TERMINE`).
- `historiqueTransferts` (aujourd'hui toujours `[]` dans `useBudget`) : le peupler depuis
  `v_alur_transfers_history` pour que l'onglet ALUR montre les affectations passées.
- Onglet ALUR : bandeau de rappel alimenté par `v_alur_transfers_pending_cash`
  (`cash_settled=false`) — « X € affectés en attente de virement » + bouton « marquer le
  virement effectué » → `settle_alur_transfer_cash`.
- Vérifier `useALURData.ts` au branchement (lecture seule) pour la cohérence des champs lus.

## 8. Découpage migration & tests (cadence 3-checks)

- **1 migration `0037`** (0036 = dernière existante, 0037 = prochain numéro libre ; à
  coordonner avec la migration « appels hors budget » si elle est écrite avant — elle
  visait aussi 0037, le premier des deux prend 0037, l'autre 0038) :
  - `alter table alur_transfers add column cash_settled / cash_settled_at / cash_ledger_tx_id` ;
  - `create function post_alur_transfer` (pré-gardes + advisory_lock) ;
  - `create function settle_alur_transfer_cash` (`FOR UPDATE`) ;
  - `create view v_alur_transfers_pending_cash` (rappels) ;
  - `create view v_alur_fund_balance` (solde cumulé du 105 par copro — source unique) ;
  - grants (revoke public/anon, grant authenticated/service_role).
- **Harnais** : docker `psql` + gate SQL durci (revue 2026-06-08) — équilibre GL, **105
  décrémenté** du montant affecté (PAS `v_alur_fund_summary`), **crédit du 705 vérifié**,
  refus (montant ≤ 0, période close, non-manager → 42501), **neutralisation 705→110
  prouvée** (charge 671 + `close_period`/`open_next_period` + net 110 = 0), pas de 2e
  écriture cash sur double règlement, sur copro jetable `create_test_copro_seeded`) + vitest.
- **Preuve** : enchaînement charge 671 → affectation → clôture → à-nouveau sur copro
  harnais ; vérifier que le solde du 105 baisse, le net travaux est neutralisé (110 = 0),
  et qu'un règlement cash bouge bien 502→512 sans toucher au résultat.

## 9. Périmètre — ce qui N'EST PAS dans cette spec

Les autres « trous » du module budget sont nommés ici pour délimiter, **pas** traités :
- **#2** Transformer budget → appels de fonds : câblage vers **`post_budget_call_for_funds`**
  (la SEULE RPC d'appel du schéma cible ; `post_call_for_funds` est **bannie/inexistante**).
  **NON-trivial** : le précédent (onboarding) fait ~90 lignes (validation des clés +
  idempotence par échéance + boucle multi-échéances). Spec/plan séparé.
- **#3** Générer le prochain appel : **NON-trivial** — le champ `echeancier` n'est jamais
  mappé côté front, le handler est un no-op ; c'est une migration mock→DB + décision
  d'archi, pas du simple câblage.
- **#4** Lien `resolutionsAG` ↔ budget : **cadré = affichage seul** (le module budget
  AFFICHE le lien existant via `source_ag_id` ; le vote/activation restent au module AG,
  chemin canonique). Front-only, pas de migration.
- **AFFECT_ALUR_FUND (suivi du #1)** : déclencher l'affectation D105/C705 depuis une
  résolution d'AG, en réutilisant `post_alur_transfer`. Nécessite : ajout de la valeur
  `AFFECT_ALUR_FUND` à l'enum `ag_action_type`, une branche dans `activate_ag_decisions`,
  et l'UI du wizard AG. **Hors de cette spec** (2e étape, décidée 2026-06-08).
- **#5** Mock `budget-maintenance.service.ts` : **code mort** (aucun consommateur) →
  suppression du service + `mock-data.ts` + l'export dans `Budget/index.ts`.
