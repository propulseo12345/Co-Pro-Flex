# Design — Creation du budget depuis l'AG (etape 1 + etape 9)

Date: 2026-03-07

## Contexte

La page de finalisation (etape 9) doit creer un budget dans la table `budgets` + `budget_lines`.
`budget_lines` exige `account_id` (NOT NULL) et `repartition_key_id` (NOT NULL).

Actuellement le `BudgetPoste` de l'etape 1 ne contient que `{id, poste, montant}` — il manque
le compte comptable et la cle de repartition. La RPC `create_budget_from_ag` echoue car elle
insere des budget_lines sans account_id.

## Decision

Enrichir le type `BudgetPoste` des l'etape 1 avec `accountId` + `repartitionKeyId`.
Le syndic choisit un poste predefini -> le compte et la cle sont pre-remplis automatiquement
mais toujours modifiables. A l'etape 9 on recupere les postes de l'etape 1 et on les affiche
avec possibilite de modification avant creation.

## Modele de donnees

### BudgetPoste enrichi

```typescript
interface BudgetPoste {
  id: string;
  poste: string;           // label libre ou predefini
  montant: number;
  accountId: string;       // UUID du compte comptable
  accountCode: string;     // "608" pour affichage
  accountName: string;     // "Assurances" pour affichage
  repartitionKeyId: string; // UUID cle de repartition
  repartitionKeyName: string; // "Charges generales" pour affichage
}
```

Stockage: serialise JSON dans `ag_meetings.opening_notes.budgetPostes`.

### Mapping poste -> compte (pre-remplissage)

| Poste predefini | Compte | Cle repartition |
|-----------------|--------|-----------------|
| Eau froide collective | 605 Eau | Eau froide |
| Electricite parties communes | 606 Electricite | Charges generales |
| Assurance immeuble | 608 Assurances | Charges generales |
| Contrat maintenance ascenseur | 604 Ascenseur | Ascenseur |
| Honoraires syndic | 609 Honoraires syndic | Charges generales |
| Menage / Entretien | 602 Entretien et reparations | Charges generales |
| Fournitures | 601 Achats - Fournitures | Charges generales |
| Frais AG | 612 Frais d'AG | Charges generales |
| Frais postaux et bancaires | 611 Frais postaux et bancaires | Charges generales |
| Poste personnalise | 615 Charges diverses (defaut) | Charges generales |

Le mapping ne fait que pre-remplir. Le gestionnaire peut toujours modifier le compte
et la cle de repartition via des dropdowns.

## UI Etape 1 — Planification (BudgetSection)

### Ajout d'un poste

1. Select poste predefini (ou saisie libre) + champ montant
2. Sous le select: dropdown compte comptable (pre-rempli, modifiable) + dropdown cle de repartition (pre-rempli, modifiable)
3. Bouton Ajouter

### Liste des postes

Chaque ligne affiche: label | compte | cle | montant | actions (edit/delete)

En mode edition: label, montant, compte et cle sont tous editables.

### Import budget N-1

Importe label + montant + account_id + repartition_key_id directement depuis
les `budget_lines` du budget N-1. Pas de re-selection necessaire.

### Chargement des donnees

Au mount de la page edit, charger:
- `accounts` (WHERE copro_id = X AND is_active = true AND account_type = 'expense')
- `repartition_keys` (WHERE copro_id = X AND is_active = true)

Ces listes alimentent les dropdowns.

## UI Etape 9 — Finalisation (BlocBudget)

### Source de donnees

`ag_meetings.opening_notes` -> deserialiser -> `budgetPostes[]`

Fallback si opening_notes vide: utiliser `ag_resolutions.variables.montant` pour
creer un poste unique "Budget global" (comportement actuel).

### Affichage

Liste des postes avec: label | compte (code) | cle (abrege) | montant | actions

Le syndic peut:
- Modifier les montants
- Modifier compte et cle
- Ajouter/supprimer des postes
- Le tout avant de cliquer "Creer le budget"

### Chargement des donnees

Au mount, charger `accounts` et `repartition_keys` de la copro (memes requetes que etape 1).

## RPC create_budget_from_ag

### Parametre p_postes (nouveau format)

```json
[
  {
    "label": "Assurance immeuble",
    "amount": 4200,
    "sort_order": 0,
    "account_id": "uuid-608",
    "repartition_key_id": "uuid-charges-generales"
  }
]
```

### Modifications RPC

L'INSERT dans budget_lines ajoute account_id et repartition_key_id:

```sql
INSERT INTO budget_lines (budget_id, copro_id, label, amount, sort_order, account_id, repartition_key_id)
VALUES (
  v_budget_id,
  v_copro_id,
  v_poste->>'label',
  (v_poste->>'amount')::NUMERIC,
  (v_poste->>'sort_order')::INT,
  (v_poste->>'account_id')::UUID,
  (v_poste->>'repartition_key_id')::UUID
);
```

## Perimetre

### Inclus
- Enrichir BudgetPoste (type + UI etape 1 + UI etape 9)
- Charger accounts/repartition_keys aux etapes 1 et 9
- Import budget N-1 avec account_id + repartition_key_id
- Modifier la RPC create_budget_from_ag
- Mapping auto poste -> compte/cle

### Exclus
- Modification du plan comptable (ajout/suppression de comptes)
- Modification des cles de repartition
- Validation comptable avancee
