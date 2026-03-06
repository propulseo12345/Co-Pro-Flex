# Design : Annexes comptables obligatoires (Decret 2005-240)

Date : 2026-03-06
Statut : Valide
Approche : A - Fonctions SQL Supabase + Composants React legers

---

## Contexte

Les 5 annexes comptables sont obligatoires pour chaque convocation d'AG de copropriete (Decret n.2005-240 du 14 mars 2005). Elles doivent etre jointes a la convocation et presenter les donnees financieres dans un format reglementaire precis.

Reference : convocation Matera (Logique metier/Exemple Convocation.pdf)

## Etat des lieux

### Composants existants (a remplacer)

- `src/components/features/finance/Comptabilite/AnnexeTables.tsx` (~945 lignes)
- `src/components/features/finance/Comptabilite/types.ts` (172 lignes)
- `src/components/features/finance/Comptabilite/data.ts` (donnees mock)

### Ecarts identifies

| Annexe | Ecart principal |
|--------|----------------|
| 1 | Structure Actif/Passif generique au lieu de Tresorerie/Provisions + Creances/Dettes par compte. Manque le detail copropriétaires. |
| 2 | 4 colonnes (budget/realise/ecart/%) au lieu de 5 colonnes legales. Ne sert pas au vote du BP. |
| 3 | Liste plate au lieu de groupement par cle de repartition avec sous-totaux. |
| 4 | Colonnes non conformes (statut/dates vs depenses votees/realisees/provisions/solde). |
| 5 | **Completement hors-sujet** : affiche dettes/creances par tiers au lieu du suivi travaux votes non clotures. |

### Vues Supabase existantes (reutilisees)

- `v_trial_balance` : balance par compte/periode -> Annexe 1
- `v_budget_consumption_by_account` : budget vote vs realise par compte -> Annexes 2, 3, 4
- `v_lot_balance` / `v_owner_balance` : soldes par lot/proprio -> Annexe 1 detail
- `v_repartition_key_lines_detailed` / `v_repartition_key_totals` : cles de repartition -> Annexe 3
- `v_alur_fund_summary` : fonds travaux ALUR -> Annexe 5
- `budgets` / `budget_lines` : budgets previsionnels -> Annexes 2, 3

---

## Architecture

```
Supabase (SQL)                         Next.js (React)
+----------------------------+         +--------------------------------+
| fn_annexe_1(copro, period) |--JSON-->| useAnnexeData(copro, period, X)|
| fn_annexe_1_detail_copros  |         |                                |
| fn_annexe_2(copro, period, |         | Annexe1Table (refonte)         |
|            next_period)    |         | Annexe2Table (refonte)         |
| fn_annexe_3(copro, period, |         | Annexe3Table (refonte)         |
|            next_period)    |         | Annexe4Table (refonte)         |
| fn_annexe_4(copro, period) |         | Annexe5Table (refonte)         |
| fn_annexe_5(copro, period) |         |                                |
|                            |         | ConvocationAnnexes (nouveau)   |
| Vues existantes:           |         | Export HTML / PDF              |
| v_trial_balance            |         +--------------------------------+
| v_budget_consumption_*     |
| v_lot_balance              |
| v_owner_balance            |
| v_repartition_key_*        |
+----------------------------+
```

---

## 1. Fonctions SQL

### fn_annexe_1(p_copro_id uuid, p_period_id uuid)

Retourne JSON :
```json
{
  "section_i": {
    "tresorerie": [
      { "compte": "50", "libelle": "Fonds places", "exercice_precedent": 8526.26, "exercice_clos": 5130.68 },
      { "compte": "51", "libelle": "Banque", "exercice_precedent": 2885.27, "exercice_clos": 4115.10 }
    ],
    "total_tresorerie": { "exercice_precedent": 11411.53, "exercice_clos": 9245.78 },
    "provisions": [
      { "compte": "12", "libelle": "Solde en attente sur travaux", "exercice_precedent": 14500.00, "exercice_clos": 12861.04 },
      { "compte": "105", "libelle": "Fonds de travaux", "exercice_precedent": 6174.99, "exercice_clos": 8989.81 },
      { "compte": "1031", "libelle": "Avances de tresorerie", "exercice_precedent": 11749.50, "exercice_clos": 11749.50 }
    ],
    "total_provisions": { "exercice_precedent": 32424.49, "exercice_clos": 33600.35 }
  },
  "section_ii": {
    "creances": [
      { "compte": "40", "libelle": "Fournisseurs", "exercice_precedent": 2990.47, "exercice_clos": 7859.29 },
      { "compte": "47", "libelle": "Compte d attente", "exercice_precedent": 0, "exercice_clos": 0.13 },
      { "compte": "450", "libelle": "Coproprietaires individualises", "exercice_precedent": 553.63, "exercice_clos": 7.07 }
    ],
    "total_creances": { "exercice_precedent": 3544.10, "exercice_clos": 7866.49 },
    "dettes": [
      { "compte": "40", "libelle": "Fournisseurs", "exercice_precedent": 12.93, "exercice_clos": 12.93 },
      { "compte": "47", "libelle": "Compte d attente", "exercice_precedent": 1.99, "exercice_clos": 0 },
      { "compte": "450", "libelle": "Coproprietaires individualises", "exercice_precedent": 24541.81, "exercice_clos": 32207.80 }
    ],
    "total_dettes": { "exercice_precedent": 24556.73, "exercice_clos": 32220.73 }
  },
  "total_general_creances": { "exercice_precedent": 35968.59, "exercice_clos": 41466.84 },
  "total_general_dettes": { "exercice_precedent": 35968.26, "exercice_clos": 41466.51 }
}
```

Source : `v_trial_balance` filtre par comptes 50, 51, 12, 105, 1031, 40, 47, 450.
Pour creances/dettes des comptes 40, 47, 450 : debit = creance, credit = dette.
Periode N-1 : jointure sur `accounting_periods` precedente.

### fn_annexe_1_detail_copros(p_copro_id uuid, p_period_id uuid)

Retourne JSON :
```json
{
  "copros": [
    { "nom": "Tanguy ABADIR", "solde_avant_regularisation": 0, "regularisation": 151.81, "solde_apres_regularisation": 0 }
  ],
  "total": { "solde_avant": -32200.73, "regularisation": 7768.36, "solde_apres": -32200.73 }
}
```

Source : `v_owner_balance` + calcul regularisation depuis ecritures de cloture.

### fn_annexe_2(p_copro_id uuid, p_period_id uuid, p_next_period_id uuid)

Retourne JSON :
```json
{
  "charges_courantes": [
    {
      "compte": "601",
      "libelle": "Eau",
      "ex_precedent_approuve": 9706.26,
      "ex_clos_budget_vote": 9500.00,
      "ex_clos_realise": 9544.06,
      "bp_en_cours_vote": 10000.00,
      "bp_a_voter": 2000.00
    }
  ],
  "sous_total_charges": { ... },
  "solde_charges": { ... },
  "total_i_charges": { ... },
  "produits_courants": [ ... ],
  "sous_total_produits": { ... },
  "solde_produits": { ... },
  "total_i_produits": { ... },
  "charges_travaux": [ ... ],
  "produits_travaux": [ ... ]
}
```

5 colonnes couvrant 3 exercices :
- ex_precedent_approuve : budget N-2 realise (ou N-1 approuve)
- ex_clos_budget_vote : budget N vote en AG
- ex_clos_realise : depenses reelles N
- bp_en_cours_vote : budget N+1 deja vote
- bp_a_voter : budget N+2 a soumettre

Source : `v_budget_consumption_by_account` pour 3 periodes + `budget_lines` pour les previsionnels.

### fn_annexe_3(p_copro_id uuid, p_period_id uuid, p_next_period_id uuid)

Retourne JSON :
```json
{
  "cles": [
    {
      "nom": "Charges generales",
      "lignes": [
        { "compte": "601", "libelle": "Eau", "ex_precedent": 9706.26, "ex_clos_budget": 9500, "ex_clos_realise": 9544.06, "bp_en_cours": 10000, "bp_a_voter": 2000 }
      ],
      "total_charges": { ... },
      "total_produits": { ... },
      "total_net": { ... },
      "provisions_copros": { ... },
      "solde": { ... }
    },
    {
      "nom": "Charges Batiment A",
      "lignes": [ ... ]
    }
  ],
  "total_general": { ... }
}
```

Memes 5 colonnes, groupees par cle de repartition.
Source : `v_budget_consumption_by_account` + `budget_lines.repartition_key_id` + `repartition_keys`.

### fn_annexe_4(p_copro_id uuid, p_period_id uuid)

Retourne JSON :
```json
{
  "operations": [
    {
      "libelle": "Total",
      "depenses_votees": 0,
      "depenses_realisees": 0,
      "provisions_appelees": 0,
      "solde": 0
    }
  ]
}
```

Source : `budgets` (type = 'travaux' ou 'exceptionnel') + `v_budget_consumption_by_account`.

### fn_annexe_5(p_copro_id uuid, p_period_id uuid)

Retourne JSON :
```json
{
  "operations": [
    {
      "libelle": "Etancheite de la terrasse",
      "date_ag": "2024-03-18",
      "cle_repartition": "Charges generales",
      "travaux_votes_a": 19552.70,
      "travaux_payes_b": 19552.70,
      "travaux_realises_c": 12633.74,
      "appels_recus_d": 12633.74,
      "solde_attente_e": -6918.96,
      "subventions_f": 0
    }
  ],
  "total": { ... }
}
```

Source : `budgets` (travaux, statut != cloture) + ecritures comptables associees.

---

## 2. Types TypeScript

Fichier : `src/components/features/finance/Comptabilite/types.ts` (refonte)

```typescript
// Annexe 1 - Etat financier apres repartition
interface LigneCompte {
  compte: string;
  libelle: string;
  exercice_precedent: number;
  exercice_clos: number;
}

interface TotalSection {
  exercice_precedent: number;
  exercice_clos: number;
}

interface AnnexeData1 {
  section_i: {
    tresorerie: LigneCompte[];
    total_tresorerie: TotalSection;
    provisions: LigneCompte[];
    total_provisions: TotalSection;
  };
  section_ii: {
    creances: LigneCompte[];
    total_creances: TotalSection;
    dettes: LigneCompte[];
    total_dettes: TotalSection;
  };
  total_general_creances: TotalSection;
  total_general_dettes: TotalSection;
}

interface DetailCopro {
  nom: string;
  solde_avant_regularisation: number;
  regularisation: number;
  solde_apres_regularisation: number;
}

interface AnnexeData1DetailCopros {
  copros: DetailCopro[];
  total: { solde_avant: number; regularisation: number; solde_apres: number };
}

// Annexe 2 & 3 - 5 colonnes legales
interface Ligne5Colonnes {
  compte: string;
  libelle: string;
  ex_precedent_approuve: number;
  ex_clos_budget_vote: number;
  ex_clos_realise: number;
  bp_en_cours_vote: number;
  bp_a_voter: number;
}

interface AnnexeData2 {
  charges_courantes: Ligne5Colonnes[];
  sous_total_charges: Ligne5Colonnes;
  solde_charges: Ligne5Colonnes; // excedents/insuffisances
  total_i_charges: Ligne5Colonnes;
  produits_courants: Ligne5Colonnes[];
  sous_total_produits: Ligne5Colonnes;
  solde_produits: Ligne5Colonnes;
  total_i_produits: Ligne5Colonnes;
  charges_travaux: Ligne5Colonnes[];
  produits_travaux: Ligne5Colonnes[];
}

interface CleAnnexe3 {
  nom: string;
  lignes: Ligne5Colonnes[];
  total_charges: Ligne5Colonnes;
  total_produits: Ligne5Colonnes;
  total_net: Ligne5Colonnes;
  provisions_copros: Ligne5Colonnes;
  solde: Ligne5Colonnes;
}

interface AnnexeData3 {
  cles: CleAnnexe3[];
  total_general: Ligne5Colonnes;
}

// Annexe 4 - Travaux et operations exceptionnelles
interface LigneAnnexe4 {
  libelle: string;
  depenses_votees: number;
  depenses_realisees: number;
  provisions_appelees: number;
  solde: number;
}

interface AnnexeData4 {
  operations: LigneAnnexe4[];
  total: LigneAnnexe4;
}

// Annexe 5 - Travaux votes non clotures
interface LigneAnnexe5 {
  libelle: string;
  date_ag: string;
  cle_repartition: string;
  travaux_votes_a: number;
  travaux_payes_b: number;
  travaux_realises_c: number;
  appels_recus_d: number;
  solde_attente_e: number; // E = D - C
  subventions_f: number;
}

interface AnnexeData5 {
  operations: LigneAnnexe5[];
  total: Omit<LigneAnnexe5, 'libelle' | 'date_ag' | 'cle_repartition'>;
}
```

---

## 3. Hook useAnnexeData

Fichier : `src/hooks/modules/useAnnexeData.ts`

Un hook generique qui appelle la bonne fonction SQL :

```typescript
function useAnnexeData<T>(
  copro_id: string,
  period_id: string,
  annexeType: 1 | 2 | 3 | 4 | 5,
  next_period_id?: string // requis pour annexes 2 et 3
): { data: T | null; loading: boolean; error: string | null }
```

Appelle `supabase.rpc('fn_annexe_X', params)`.

---

## 4. Composants React (refonte)

Fichier : `src/components/features/finance/Comptabilite/AnnexeTables.tsx` (reecrit)

Chaque composant :
- Recoit les donnees typees depuis le hook
- Affiche les colonnes legales exactes
- Titre complet legal : "Annexe X : [titre] de l'exercice realise du [date] au [date]..."
- En-tete de colonnes conforme (Pour approbation des comptes | Pour le vote du BP)
- Export HTML preservant le format legal
- Impression via window.print()

### Annexe1Table
- Section I : Tresorerie + Provisions (2 colonnes N-1, N)
- Section II : Creances | Dettes (face a face comme dans Matera)
- Total General (I)+(II)

### Annexe1DetailCoprosTable (nouveau)
- Tableau complementaire : Nom | Solde avant | Regularisation | Solde apres

### Annexe2Table
- En-tetes a 2 niveaux : "Pour approbation" (3 col) | "Pour vote BP" (2 col)
- Sections : Charges courantes / Produits courants / Charges travaux / Produits travaux
- Sous-totaux + Solde + Total I et Total II

### Annexe3Table
- Memes 5 colonnes
- Groupement par cle avec sous-totaux par cle
- Total general + Provisions + Solde

### Annexe4Table
- Colonnes : Depenses votees / Realisees / Provisions appelees / Solde

### Annexe5Table
- Colonnes A-F avec formule E=D-C
- Reference AG de vote et cle de repartition
- Total

---

## 5. Integration convocation

Nouveau composant `ConvocationAnnexes` qui orchestre les 5 (+1) tables :

```typescript
function ConvocationAnnexes({ copro_id, period_id, next_period_id }: Props) {
  // Charge les 6 jeux de donnees en parallele
  // Affiche sequentiellement : Annexe 1 -> Detail copros -> Annexe 2 -> 3 -> 4 -> 5
}
```

Utilise dans la page convocation AG existante.

---

## Plan d'implementation

### Phase 1 : SQL (migrations Supabase)
1. Migration fn_annexe_1 + fn_annexe_1_detail_copros
2. Migration fn_annexe_2
3. Migration fn_annexe_3
4. Migration fn_annexe_4
5. Migration fn_annexe_5

### Phase 2 : TypeScript
6. Refonte types.ts (nouveaux types, garder les anciens temporairement)
7. Creation useAnnexeData.ts

### Phase 3 : Composants React
8. Refonte Annexe1Table + creation Annexe1DetailCoprosTable
9. Refonte Annexe2Table (5 colonnes)
10. Refonte Annexe3Table (groupement par cle)
11. Refonte Annexe4Table (colonnes legales)
12. Refonte Annexe5Table (suivi travaux, pas dettes/creances)

### Phase 4 : Integration
13. Creation ConvocationAnnexes
14. Integration dans le flux convocation AG
15. Nettoyage mock data et anciens types
