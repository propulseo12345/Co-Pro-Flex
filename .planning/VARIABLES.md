# Variables AG — Logique complète

Ce document décrit la logique des variables utilisées dans les résolutions AG,
leur source de données, et comment elles sont exploitées à la finalisation.

---

## Principe général

Les variables sont des placeholders `{nom_variable}` dans le texte des résolutions.
Elles sont saisies par le syndic pendant la session AG (modal Variables).

**Stockage** : `ag_resolutions.variables` (JSONB) — map `{clé: valeur_string}`

**Récupération à la finalisation** : via la RPC `get_ag_pending_actions` qui joint
`ag_pending_actions` + `ag_resolutions` et retourne `resolution.variables`.

---

## Variables par type de résolution

### CREATE_BUDGET — Approbation du budget prévisionnel
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `montant` | Montant total voté | `"23 200,00"` | Poste initial du BlocBudget |
| `date_debut` | Début exercice (JJ/MM/AAAA) | `"01/01/2027"` | Extraction année → exercice |
| `date_fin` | Fin exercice | `"31/12/2027"` | Affiché dans BlocSimple |

**Parsing** : `parseFrenchAmount("23 200,00")` → `23200` (espaces + virgule décimale)
**Exercice** : `date_debut.split('/')[2]` → `"2027"` → `parseInt`

---

### CREATE_ALUR_FUND — Fonds de travaux ALUR
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `montant` | Montant annuel voté | `"1 160,00"` | Pré-rempli dans BlocALUR |
| `pourcentage` | % du budget | `"5"` | Affiché uniquement |

**Modalités** : récupérées depuis `SCHEDULE_ALUR_PAYMENTS.variables.modalites_paiement_fonds`
(mapping : `"trimestriel"` → `"TRIMESTRIEL"`, `"semestriel"` → `"SEMESTRIEL"`, sinon `"UNIQUE"`)

---

### SCHEDULE_ALUR_PAYMENTS — Calendrier fonds ALUR
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `dates_echeances_fonds` | Dates en texte libre | `"1er janvier 2026, 1er avril 2026…"` | Affiché dans BlocSimple |
| `modalites_paiement_fonds` | Fréquence | `"trimestriel"` | Source pour BlocALUR.modalites |

---

### SCHEDULE_BUDGET_PAYMENTS — Calendrier budget
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `dates_echeances_budget` | Dates en texte libre | `"1er janvier 2027…"` | Affiché dans BlocSimple |
| `modalites_paiement_budget` | Fréquence | `"trimestriel"` | Affiché dans BlocSimple |

---

### APPROVE_ACCOUNTS — Approbation des comptes
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `montant` | Solde des comptes | `"11 155,50"` | Affiché dans BlocSimple |
| `date_debut` | Début exercice | `"01/01/2025"` | Affiché |
| `date_fin` | Fin exercice | `"31/12/2025"` | Affiché |

---

### GRANT_QUITUS — Quitus au syndic
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `date_debut` | Début période | `"01/01/2025"` | Affiché dans BlocSimple |
| `date_fin` | Fin période | `"31/12/2025"` | Affiché |

---

### DESIGNATE_BUREAU — Bureau de séance (×3)
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `nom_president` | Nom du président de séance | `""` (souvent vide) | Affiché si non vide |
| `nom_secretaire` | Nom du secrétaire | `""` | Affiché si non vide |
| `nom_scrutateur` | Nom du scrutateur | `""` | Affiché si non vide |

**Note** : Ces noms sont souvent vides car désignés verbalement en séance.
BlocSimple filtre les variables vides (`v !== ''`).

---

### APPOINT_SYNDIC — Nomination du syndic
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `nom_syndic` | Nom du syndic | `""` (souvent vide) | Affiché si non vide |
| `duree_mandat_mois` | Durée en mois | `""` | Affiché si non vide |
| `honoraires_annuels_ttc` | Honoraires TTC | `""` | Affiché si non vide |

---

### ELECT_COUNCIL — Élection du conseil syndical
| Variable | Description | Exemple | Usage finalisation |
|----------|-------------|---------|-------------------|
| `noms` | Noms des élus (séparés par virgule) | `"Emma ROBERT"` | Affiché dans BlocSimple |

---

## Fonctions de parsing (BlocBudget / BlocALUR)

```typescript
// Montant français "23 200,00" → 23200
function parseFrenchAmount(val: string | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/\s/g, '').replace(',', '.')) || 0;
}

// Date "01/01/2027" → 2027
function extractYear(dateDDMMYYYY: string | undefined): number {
  if (!dateDDMMYYYY) return new Date().getFullYear() + 1;
  const parts = dateDDMMYYYY.split('/');
  return parseInt(parts[2]) || new Date().getFullYear() + 1;
}

// "trimestriel" → "TRIMESTRIEL"
function mapModalites(val: string | undefined): string {
  switch (val?.toLowerCase()) {
    case 'trimestriel': return 'TRIMESTRIEL';
    case 'semestriel':  return 'SEMESTRIEL';
    case 'mensuel':     return 'MENSUEL';
    default:            return 'UNIQUE';
  }
}
```

---

## Flux complet de bout en bout

```
Session AG
  └─ Syndic saisit variables dans modal Variables
       └─ Sauvegardé dans ag_resolutions.variables (JSONB)

Fin de session → finish_ag_session()
  └─ Crée ag_pending_actions avec resolution_id → ag_resolutions

Page Finalisation
  └─ get_ag_pending_actions() → joint ag_pending_actions + ag_resolutions
       └─ Retourne { action_type, status, resolution: { title, variables } }
            ├─ BlocBudget  ← CREATE_BUDGET.variables.{montant, date_debut}
            ├─ BlocALUR    ← CREATE_ALUR_FUND.variables.{montant}
            │               + SCHEDULE_ALUR_PAYMENTS.variables.{modalites_paiement_fonds}
            └─ BlocSimple  ← toutes autres actions, variables non vides
```

---

## Actions sans variables significatives

Ces actions génèrent un BlocSimple sans données affichables (variables vides ou absentes) :
- `MANAGE_CONTRACT` — aucune variable standard
- `CREATE_WORK_BUDGET` — variables à définir selon le projet
- `CREATE_EXCEPTIONAL_CALL` — variables à définir selon le projet
