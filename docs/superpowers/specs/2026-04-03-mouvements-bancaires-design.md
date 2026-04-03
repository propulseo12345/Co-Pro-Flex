# Mouvements Bancaires — Migration Mock → Supabase

**Date** : 2026-04-03
**Statut** : En attente de validation

---

## Contexte

La page mouvements bancaires mélange données Supabase (mouvements, catégorisation, rapprochement) et mocks (comptes, soldes, écritures comptables, suggestions). Le dashboard ne peut pas afficher les vrais soldes car les comptes sont factices. À terme, l'API GoCardless importera les mouvements automatiquement.

## Objectif

Rendre la page mouvements bancaires 100% fonctionnelle sur Supabase. Supprimer tous les mocks. Le solde affiché ici devient la source de vérité pour le dashboard (trésorerie).

---

## 1. Modèle de données

### 1.1 Migration : `account_id` sur `bank_movements`

Ajouter une colonne `account_id UUID REFERENCES accounts(id)` sur `bank_movements`.

**Migration des données existantes** :
- Tous les mouvements existants sont assignés au compte 512 (Banque) de leur copro
- Contrainte NOT NULL ajoutée après le backfill

```sql
ALTER TABLE bank_movements ADD COLUMN account_id UUID REFERENCES accounts(id);

UPDATE bank_movements bm
SET account_id = (
  SELECT a.id FROM accounts a
  WHERE a.copro_id = bm.copro_id AND a.code = '512'
  LIMIT 1
);

ALTER TABLE bank_movements ALTER COLUMN account_id SET NOT NULL;
```

### 1.2 Vue : `v_account_balances`

Calcule le solde de chaque compte bancaire (classe 5).

```sql
CREATE VIEW v_account_balances AS
SELECT
  a.id AS account_id,
  a.copro_id,
  a.code,
  a.name,
  a.initial_balance,
  COALESCE(SUM(bm.amount_signed), 0) AS movements_total,
  a.initial_balance + COALESCE(SUM(bm.amount_signed), 0) AS computed_balance
FROM accounts a
LEFT JOIN bank_movements bm ON bm.account_id = a.id
WHERE a.code LIKE '5%'
GROUP BY a.id, a.copro_id, a.code, a.name, a.initial_balance;
```

### 1.3 Mise à jour : `v_dashboard_kpis`

Trésorerie tirée de `v_account_balances` :
- `tresorerie_courante` = solde du compte 512
- `tresorerie_travaux` = solde du compte 502
- `current_balance` = somme des deux

### 1.4 Mise à jour : `v_bank_movements_overview`

Ajouter `account_id` dans la vue pour que le frontend puisse filtrer par compte.

---

## 2. Frontend — Hook principal

**Fichier** : `src/features/finance/mouvements-bancaires/hooks/useMouvementsBancairesPage.ts`

### 2.1 Comptes bancaires (remplace MOCK_COMPTE_*)

Fetch depuis Supabase :
```
accounts WHERE copro_id = X AND code IN ('512', '502')
```
+ solde depuis `v_account_balances`

Interface cible :
```typescript
interface CompteBancaire {
  id: string;        // UUID réel
  nom: string;       // accounts.name
  type: 'courant' | 'travaux';  // déduit du code (512 = courant, 502 = travaux)
  iban: string | null;
  soldeInitial: number;
  soldeCourant: number;  // depuis v_account_balances.computed_balance
  derniereMaj: string;
}
```

### 2.2 Mouvements filtrés par compte

Le filtre actuel compare `m.accountId === compteActuel.id` avec des IDs mock ('1', '2'). 

Nouveau filtre : `m.accountId === compteActuel.id` où `compteActuel.id` est le vrai UUID du compte 512 ou 502.

La vue `v_bank_movements_overview` retournera `account_id` pour chaque mouvement.

### 2.3 Rapprochement (remplace MOCK_ECRITURES_COMPTABLES)

Le rapprochement matche mouvements bancaires ↔ factures fournisseurs + paiements.

Fetch depuis Supabase :
- `supplier_invoices WHERE copro_id = X AND status IN ('pending', 'validated')`
- `payments WHERE copro_id = X`

Le matching engine compare :
- Montant mouvement ↔ montant facture (tolérance ±5%)
- Date mouvement ↔ date facture (±5 jours)
- Libellé mouvement ↔ nom fournisseur

### 2.4 Suggestions de catégorisation (remplace FOURNISSEURS_CONNUS, MOCK_FACTURES_EN_ATTENTE)

Fetch depuis Supabase :
- `suppliers WHERE copro_id = X` → remplace FOURNISSEURS_CONNUS
- `supplier_invoices WHERE status = 'pending'` → remplace MOCK_FACTURES_EN_ATTENTE

Les heuristiques regex (`HEURISTIQUES_LIBELLE`, `MOTS_CLES_DETECTION`) restent — elles fonctionnent bien en complément.

---

## 3. Matching Engine

**Fichier** : `src/features/finance/mouvements-bancaires/domain/matching-engine.ts`

### Modifications

**Rule 2 — Supplier + Amount** :
- Remplacer `FOURNISSEURS_CONNUS` (constante) par un paramètre `suppliers: Supplier[]` passé au runtime
- Remplacer `MOCK_FACTURES_EN_ATTENTE` par un paramètre `pendingInvoices: SupplierInvoice[]`

**Rule 1 — Exact Amount** :
- Remplacer `ecritures: EcritureComptable[]` par `invoices: SupplierInvoice[]` + `payments: Payment[]`
- Matcher sur montant + date

Les signatures des fonctions changent mais la logique de scoring reste identique.

---

## 4. Mocks à supprimer

| Fichier | Mock | Remplacé par |
|---------|------|-------------|
| `domain/constants.ts` | `MOCK_COMPTE_COURANT` | Supabase `accounts` WHERE code='512' |
| `domain/constants.ts` | `MOCK_COMPTE_TRAVAUX` | Supabase `accounts` WHERE code='502' |
| `domain/constants.ts` | `MOCK_MOUVEMENTS_BASE` | Déjà Supabase (garder pour tests) |
| `domain/constants.ts` | `MOCK_MOUVEMENTS_TRAVAUX` | Déjà Supabase |
| `domain/constants.ts` | `MOCK_ECRITURES_COMPTABLES` | Supabase `supplier_invoices` + `payments` |
| `domain/constants.ts` | `MOCK_APPELS_EN_ATTENTE` | Supabase `call_for_funds` |
| `domain/constants.ts` | `MOCK_FACTURES_EN_ATTENTE` | Supabase `supplier_invoices` |
| `domain/constants.ts` | `FOURNISSEURS_CONNUS` | Supabase `suppliers` |
| Hook (ligne 101-109) | Sync status hardcodé | Dernière date d'import depuis `bank_movements.created_at` |

**Conservés** (données de référence, pas des mocks) :
- `PLAN_COMPTABLE_ESSENTIEL` — plan comptable standard, pas spécifique à une copro
- `HEURISTIQUES_LIBELLE` — regex patterns universels
- `MOTS_CLES_DETECTION` — mots-clés universels

---

## 5. Dashboard — Cohérence

Le dashboard utilise `v_dashboard_kpis` qui tirera les soldes depuis `v_account_balances`.

**Résultat** : le solde affiché sur le dashboard = le solde affiché sur la page mouvements bancaires = `initial_balance + SUM(bank_movements.amount_signed)`.

---

## 6. Ce qu'on ne touche PAS

- Composants UI (table, modales, filtres, AccountPills) — reçoivent les données via props
- Import CSV/OFX — déjà Supabase
- Edge Functions (reconcile, import) — déjà fonctionnelles
- GoCardless API routes — pas dans ce scope

---

## 7. Étapes d'implémentation (ordre)

1. **Migration DB** : `account_id` sur `bank_movements` + backfill + vue `v_account_balances` + MAJ `v_bank_movements_overview` + MAJ `v_dashboard_kpis`
2. **API** : créer fonctions fetch comptes, fetch suppliers, fetch invoices pour le hook
3. **Matching engine** : adapter les signatures pour accepter données Supabase
4. **Hook** : remplacer mocks par fetches Supabase, filtrer par account_id réel
5. **Nettoyage** : supprimer les mocks inutiles de `constants.ts`
6. **Code review** à chaque étape majeure

---

## 8. Vérification

- [ ] Page mouvements bancaires affiche les vrais comptes (512, 502) avec soldes calculés
- [ ] Filtre CC/FT montre les mouvements du bon compte
- [ ] Catégorisation propose des suggestions basées sur les vrais fournisseurs en base
- [ ] Rapprochement propose des factures fournisseurs comme cibles de match
- [ ] Dashboard trésorerie = même solde que la page mouvements bancaires
- [ ] Zéro mock dans le code (sauf PLAN_COMPTABLE et heuristiques regex)
