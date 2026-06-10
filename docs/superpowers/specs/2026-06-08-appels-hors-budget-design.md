# Appels de fonds hors budget — Design (Tranche 2 rebranchement finance)

**Date :** 2026-06-08
**Statut :** validé (brainstorming) — prêt pour writing-plans

## Objectif

Rebrancher le wizard d'appels de fonds sur le schéma cible (0001→0036) et lui ajouter un **mode « hors budget »** (appel exceptionnel/travaux non budgété, et avance/fonds de roulement art.35), puisque l'ancienne route mono-clé `post_call_for_funds` est abandonnée et que `post_budget_call_for_funds` ne couvre que le budget-driven.

## Contexte (problème)

- `createCall` (lib/finance/api.ts) et l'edge `generate_call_for_funds` appellent `post_call_for_funds` (mono-clé, **abandonnée** en 0026) → plantent.
- Le wizard actuel raisonne « montant libre + une clé » ; `post_budget_call_for_funds` raisonne « budget + échéance » (montant dérivé du budget, agrégé multi-clés). Incompatibles.
- Besoin métier : émettre des appels **hors budget prévisionnel** (exceptionnel, travaux votés non budgétés, avance art.35).

## Comptabilité (vérifiée — arrêté 14/03/2005)

| Cas (mode) | Débit | Crédit |
|---|---|---|
| Exceptionnel / travaux hors budget (`p_kind='exceptional'`) | 450-2 (nature *works*) / lot | **702** « Provisions sur travaux et opérations exceptionnelles » |
| Avance / fonds de roulement art.35 (`p_kind='advance'`) | 450-3 (nature *advance*) / lot | **1031** « Avance de trésorerie » (passif classe 1, **pas** un produit) |

> Le 701 (« opérations courantes ») est réservé au **budget prévisionnel** : un appel hors budget courant est une *opération exceptionnelle* → 702. L'avance est un **fonds remboursable** crédité en direct (modèle cohérent avec l'ALUR → 105). **Remboursement de l'avance = hors scope** (étape ultérieure).

Le débit passe toujours par le sous-compte 450 **avec `lot_id`** via `resolve_lot_tiers_account(copro, nature)`. Comptes confirmés présents dans `provision_copro_chart` (0025) : 450-2, 450-3, 702, 1031.

## Architecture (approche A — cœur partagé, DRY)

L'algorithme de **ventilation** (répartition par lot×clé en arrondi cumulatif par télescopage + écriture GL D 450-x/lot agrégé / C contrepartie + `create_ledger_transaction`) est subtil et juridiquement critique → **une seule implémentation**.

**Migration `0037_rpc_appels_hors_budget.sql`** :

1. **Helper interne** `_post_call_distribute(p_copro_id uuid, p_period_id uuid, p_call_id uuid, p_debit_acct uuid, p_credit_acct uuid, p_key_amounts jsonb, p_label text) returns jsonb`
   - `p_key_amounts` = `[{ "key_id": uuid, "target_amount": numeric }, …]`.
   - Insère les `call_for_funds_lines` par (lot×clé) en arrondi cumulatif (logique extraite de l'actuel 0026 l.541-574).
   - Construit les entrées GL (D 450-x/lot agrégé toutes clés ; C `p_credit_acct` au total), appelle `create_ledger_transaction(..., auto_post=true)`, met à jour `call_for_funds.ledger_tx_id`.
   - SECURITY DEFINER, search_path public, grants `authenticated, service_role` (mêmes gardes que l'existant).

2. **`post_budget_call_for_funds` réécrite** (CREATE OR REPLACE) : conserve sa logique d'entrée (nature/contrepartie depuis `budget_type`, montant par clé depuis `budget_lines` × fraction/échéance, gardes clés complètes), insère l'en-tête `call_for_funds` (budget_id, repartition_key_id=null), puis **appelle `_post_call_distribute`** au lieu de réimplémenter lignes+GL. **Comportement identique** (contrat de retour inchangé).

3. **`post_exceptional_call_for_funds(p_copro_id uuid, p_period_id uuid, p_kind text, p_repartition_key_id uuid, p_amount numeric, p_label text, p_issue_date date, p_due_date date, p_trimester int default null, p_description text default null) returns jsonb`** :
   - `p_kind` : `'exceptional'` → (nature `works`, contrepartie code `702`) ; `'advance'` → (nature `advance`, contrepartie code `1031`). Sinon RAISE 23514.
   - Gardes : `p_amount > 0` ; clé complète (`repartition_key_is_complete`) ; période ouverte (héritée via `create_ledger_transaction`).
   - Résout débit `resolve_lot_tiers_account(copro, nature)` + crédit par code.
   - Insère en-tête `call_for_funds` (budget_id=null, repartition_key_id=p_key, total_amount=p_amount, status 'issued').
   - Appelle `_post_call_distribute(..., p_key_amounts := [{key_id:p_repartition_key_id, target_amount:p_amount}], ...)`.
   - Retour `{ success, call_id, ledger_tx_id }` (même forme que les autres).
   - Mono-clé + échéance unique (multi-clés / échéancier = différés).

### Front

- **`lib/finance/api.ts`** : remplacer `createCall` (mono-clé budget-driven cassé) par deux fonctions claires : `createBudgetCall(...)` (→ `post_budget_call_for_funds`, boucle échéances) et `createExceptionalCall(...)` (→ `post_exceptional_call_for_funds`). Supprimer l'appel à `post_call_for_funds`.
- **Wizard `useCreateCallWizard`** : ajouter un sélecteur de **mode** (Sur budget / Hors budget). Mode budget = sélection budget + échéancier. Mode hors budget = kind (exceptionnel/travaux | avance) + clé + montant + date d'échéance. Retirer la saisie « montant libre + clé » de l'ancien modèle budget.
- **Edge `generate_call_for_funds`** : router vers la bonne RPC selon le mode (ou la déprécier au profit d'appels RPC directs si elle n'apporte rien — à confirmer en plan).
- Régénérer `src/types/supabase.ts` après 0037.

## Gestion d'erreurs

- RPC : RAISE avec errcode SQLSTATE (23514 contrainte, 23503 FK introuvable) ; messages explicites. Le front mappe `error.message`.
- Clé incomplète, montant ≤ 0, compte manquant, période fermée → refus net, aucun état partiel (transaction atomique de la fonction).

## Tests / vérification (3-checks)

1. **`db reset` 0001→0037** propre.
2. **Boucle d'or `0029` inchangée** (prouve la non-régression de `post_budget_call_for_funds` après extraction du helper).
3. **Gate `gate_0037.sql`** : `post_exceptional_call_for_funds` mode exceptionnel poste bien D 450-2 / C 702 équilibré + lignes par lot ; mode avance poste D 450-3 / C 1031 ; somme lignes = montant ; v_lot_vs_gl cohérent.
4. **vitest** : tests de la ventilation côté SQL via gate ; côté front, tests unitaires des helpers de construction de payload si logique pure.
5. `tsc --noEmit` 0 erreur.

## Hors scope (différé)

- Remboursement de l'avance (au départ du copropriétaire).
- Multi-clés et échéancier pour le mode hors budget.
- Tranches 3-6 du rebranchement (paiement, factures, budgets/ALUR, quick wins).
