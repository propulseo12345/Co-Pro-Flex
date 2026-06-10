# Design — Factures fournisseurs : validation & paiement RÉELS au grand livre (J2.8)

> Spec validée le 2026-06-11. Chantier J2.8 du `PLAN_MAITRE_FIN_PROJET.md` — le seul trou
> réel restant de J2 (le reste des modules est déjà sur Supabase, audit 2026-06-10).
> Branche : `j2-factures-validation-gl` (empilée sur `j1-rls-securite` pour l'ordre des migrations).

## 1. Problème

La compta de copropriété est en **partie double** : toute opération doit générer une écriture
équilibrée au grand livre (GL). Or, dans la page Factures, deux actions ne respectent pas ça —
elles basculent un statut **sans aucune écriture comptable** :

- **« Comptabiliser » un brouillon** (`handleSendToAccounting`, `src/features/finance/invoices/useFacturesPage.ts:265`)
  → `updateSupplierInvoice({status:'posted'})` nu. Pas de D6xx/C401. Une facture devient
  « comptabilisée » sans exister dans le GL.
- **« Payer »** (`handlePaymentComplete`, `src/features/finance/invoices/useFacturesPage.ts:232`)
  → `updateSupplierInvoice({status:'paid'})` nu. Le commentaire l'avoue : *« This bypasses the Edge
  Function that requires auth »*. Pas de mouvement D401/C512. Le syndic « paie » mais la banque ne
  bouge pas dans les comptes.

**Mécanisme racine** : la machinerie de posting existe déjà côté base, mais incomplète au bon endroit.
- `post_supplier_invoice` (0026:751) poste D6xx/C401 **uniquement à la création** (`p_post_immediately`).
  Aucune route ne poste un **brouillon déjà enregistré** (`draft → posted`).
- `post_supplier_payment` (0026:881) poste D401/C512 (idempotent, gardé gestionnaire) — mais le front
  le court-circuite (problème d'auth sur l'edge `pay_supplier_invoice`) au profit d'un flip de statut.

## 2. Modèle visé (facture en 2 temps)

`saisie = brouillon` (aucune écriture) → `validation gestionnaire` (**naissance de l'écriture
D6xx/C401**) → `paiement` (mouvement D401/C512). La validation est le **fait comptable**, pas une
étiquette. Modèle déjà décidé (mémoire `facture_fournisseur_model` ; l'option « brouillon sans
posting » avait été REJETÉE — le bug actuel est précisément cette option qui fuit).

**Décision (2026-06-11)** : un brouillon **en-tête seul (sans ligne)** reste autorisé (capture rapide
du modal liste), mais la **validation est refusée** tant qu'il n'a pas ≥ 1 ligne de ventilation
(sinon aucune charge à imputer en D6xx → écriture impossible).

## 3. Architecture — approche retenue (A)

Réutiliser la machinerie GL canonique, tout en base, appelée en `supabase.rpc(...)` avec la session
(évite le souci d'auth des edge functions).

### 3.1 Nouvelle RPC `validate_supplier_invoice(p_invoice_id uuid) returns jsonb`

Miroir de la branche « posting » de `post_supplier_invoice`, mais sur un brouillon **existant** + ses
lignes déjà persistées. `language plpgsql · security definer · set search_path = public`.

Corps :
1. **Garde** : `if not is_service_call() and not user_is_copro_manager(<copro de la facture>) then raise 42501`.
   (copro dérivée de la facture, cf. leçon `[[rls-phase0-model]]` — pas de DEFINER non gardé.)
2. Charger la facture (`id, copro_id, period_id, status, doc_kind, label, invoice_date, total_amount, ledger_tx_id`).
   - Introuvable → `raise 23503`.
   - `doc_kind <> 'invoice'` (un avoir) → `raise` (les avoirs passent par `post_supplier_credit_note`).
3. **Idempotence par le statut** :
   - `status = 'posted'` ET `ledger_tx_id` non nul → **no-op**, retourne `{success, invoice_id, ledger_tx_id, already_posted:true}`.
   - `status in ('paid','cancelled')` → `raise` (état terminal, on ne re-poste pas).
   - sinon (`draft`) → on poste.
4. Charger les lignes (`supplier_invoice_lines` du `invoice_id`). **0 ligne → `raise 23514`** avec un
   message clair (« brouillon sans ligne : ajouter au moins un poste de charge avant de comptabiliser »).
5. Construire les écritures : **D 6xx par ligne** (`account_id`, `amount`, `entry_label`) + **C 401**
   (total, libellé « Dette fournisseur : … »). Récupérer le compte 401 de la copro (introuvable → `raise 23503`).
6. Poster via la route canonique : `create_ledger_transaction(copro, period, invoice_date, 'Facture
   fournisseur : '||label, 'supplier_invoice', invoice_id, entries, true)`. Échec → `raise`.
7. `update supplier_invoices set status='posted', ledger_tx_id = <tx> where id = invoice_id`.
8. Retour `{success:true, invoice_id, ledger_tx_id, total_amount}`.

ACL : `revoke ... from public, anon; grant ... to authenticated, service_role`.

### 3.2 Paiement — router vers `post_supplier_payment` (existant)

`handlePaymentComplete` appelle la RPC `post_supplier_payment(copro, period, invoice_id, amount,
payment_date, method, reference, idempotency_key)` en `supabase.rpc(...)` (session, gardée
gestionnaire, idempotente) → écriture **D401/C512**, passage `paid` quand Σ paiements ≥ total. On
remplace le flip de statut nu. La période/compte 512 sont dérivés comme aujourd'hui côté front
(compte débité choisi dans le modal de paiement = sous-compte 512).

### 3.3 Front (rewire minimal)

- `src/lib/finance/api.ts` : ajouter `validateSupplierInvoice(copro_id, invoice_id)` (→ `rpc('validate_supplier_invoice')`)
  et s'assurer que `paySupplierInvoice` cible la RPC `post_supplier_payment` (ou l'edge si son auth est
  fiabilisée — défaut = RPC directe). Remonter l'erreur métier (42501 / 23514) à l'UI.
- `useFacturesPage.ts` : `handleSendToAccounting` → `validateSupplierInvoice` (au lieu du flip `posted`) ;
  `handlePaymentComplete` → paiement réel (au lieu du flip `paid`). Garder le refresh optimiste, mais
  **n'appliquer l'état optimiste que si la RPC réussit** (sinon afficher l'erreur, ne pas mentir à l'écran).
- Brouillon sans ligne : l'UI doit permettre d'ajouter des lignes au brouillon avant « Comptabiliser » ;
  si l'utilisateur tente de comptabiliser un brouillon vide, afficher le message renvoyé par la RPC.

## 4. Gestion d'erreurs

| Cas | Comportement |
|-----|--------------|
| Non-gestionnaire | `42501` → message « gestionnaire requis », pas de changement d'état |
| Brouillon sans ligne | `23514` → message « ajouter un poste avant de comptabiliser » |
| Facture déjà postée | no-op idempotent (retour `already_posted`), pas de double écriture |
| Facture payée/annulée | refus explicite |
| Compte 401 absent | `23503` (plan comptable à provisionner) |
| Avoir (`credit_note`) | refus → passe par `post_supplier_credit_note` |

## 5. Tests (gate SQL `gate_supplier_invoice_validation.sql`)

Auto-rollback, contexte service_role, sur copro jetable seedée. Prouve, valeurs DÉRIVÉES (jamais en dur) :
1. **Validation poste une écriture équilibrée** : créer un brouillon (post_immediately=false) avec 2
   lignes → `validate_supplier_invoice` → 1 transaction `posted` liée, Σdébit = Σcrédit = total,
   D = somme des lignes sur leurs comptes 6xx, C = total sur 401.
2. **Idempotence** : re-valider → aucune nouvelle écriture (même `ledger_tx_id`), retour `already_posted`.
3. **Brouillon sans ligne refusé** : brouillon en-tête seul → `validate_supplier_invoice` lève `23514`.
4. **Garde cross-tenant** : un gestionnaire du cabinet A valide une facture du cabinet B → `42501`
   (cf. famille de gardes DEFINER de 0045).
5. **Paiement** : `post_supplier_payment` sur la facture postée → écriture D401/C512, statut `paid`
   quand Σ ≥ total ; re-paiement idempotent (même `idempotency_key`) → pas de double mouvement.
6. **Audit** : `audit_finance_integrity(copro) = 0` après le parcours complet (brouillon→validé→payé).

Branché dans `scripts/db-test.mjs` (CI bloquante).

## 6. Hors périmètre (différé)

- Rattachement du justificatif (`document_id`) à la saisie de facture (attente terrain Lyes, va avec 2.3 GED).
- Unification fine du modal liste (le quick-create reste, on ne le réécrit pas — on borne juste la validation).
- Fiabilisation de l'auth des edge functions (on les contourne par RPC ; chantier infra séparé).
- Régénération complète des types (2.9), à refaire si la nouvelle signature RPC l'impose.

## 7. Migration

`supabase/migrations/0046_validate_supplier_invoice.sql` (numéro après le 0045 de J1 — d'où l'empilement
de branche). Une seule migration : la nouvelle RPC `validate_supplier_invoice` (+ commentaire). Rejeu
prouvé par `scripts/rebaseline-check.sh` (chaîne fraîche) + le gate ci-dessus.
