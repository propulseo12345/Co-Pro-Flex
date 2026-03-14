# Convention de sous-dossiers GED — Spec

> **Date:** 2026-03-14
> **Scope:** Toute generation de document PDF archivee dans la GED via `autoFileToGED`

---

## Probleme

Les documents generes (convocations, PV, relances, appels de fonds...) s'accumulent a plat dans les dossiers racine de la GED. Sans sous-dossiers, un dossier "Assemblees Generales" peut contenir des centaines de fichiers melanges (convocations, PV, de differentes annees).

## Solution

### 1. Support de sous-dossiers multi-niveaux dans `autoFileToGED`

Le parametre `subFolderName` accepte un chemin avec `/` pour creer une arborescence de N niveaux :

```typescript
autoFileToGED({
  subFolderName: 'Appels de fonds 2026/T1 - Janvier 2026',
  // cree: [dossier racine] → Appels de fonds 2026 → T1 - Janvier 2026
});
```

**Implementation** : `resolveOrCreateSubFolder` split le chemin sur `/` et boucle sur chaque segment, creant chaque niveau si inexistant.

### 2. Convention de nommage

Regle generale : `{TypeDocument} {annee|exercice|date}`

- `{annee}` par defaut (ex: `Diagnostics 2026`)
- `{date}` si un batch volumineux est genere pour un evenement precis (ex: `Convocations AG 2026-04-13`)
- Sous-niveaux supplementaires si la granularite l'exige (ex: trimestres)

### 3. Mapping complet par module

| Dossier racine | subFolderName | Declencheur | Status |
|---|---|---|---|
| Assemblees Generales | `Convocations AG {date}` | Dispatch envoi (N PDFs/copro) | FAIT |
| Assemblees Generales | `Convocations AG {annee}` | Telechargement preview unique | FAIT |
| Assemblees Generales | `PV AG {annee}` | Telechargement PV | FAIT |
| Comptabilite | `Appels de fonds {exercice}/T{n} - {mois} {annee}` | Emission appels trimestriels | A VENIR |
| Comptabilite | `Releves de charges {exercice}` | Cloture exercice | A VENIR |
| Correspondances | `Relances {annee}` | Envoi relance impaye | FAIT |
| Correspondances | `Exports {annee}` | Export PDF impayes | FAIT |
| Contrats | `Resiliations {annee}` | Resiliation contrat | FAIT |
| Diagnostics | `Diagnostics {annee}` | Telechargement doc technique | FAIT |
| Assurances | `Assurances` | Telechargement attestation | FAIT |
| Documents Legaux | `Ventes {annee}` | Generation doc vente | FAIT |

### 4. Arborescence exemple complete

```
GED/
├── Assemblees Generales/
│   ├── Convocations AG 2026-04-13/
│   │   ├── Convocation_AG_2026-04-13_DUPONT.pdf
│   │   └── Convocation_AG_2026-04-13_MARTIN.pdf
│   ├── PV AG 2026/
│   │   └── PV_AG_Ordinaire_2026.pdf
│   └── Convocation_AG_2026.pdf  (preview unique, pas de sous-dossier si une seule)
│
├── Comptabilite/
│   └── Appels de fonds 2026/
│       ├── T1 - Janvier 2026/
│       │   ├── Appel_DUPONT_T1_2026.pdf
│       │   └── Appel_MARTIN_T1_2026.pdf
│       ├── T2 - Avril 2026/
│       ├── T3 - Juillet 2026/
│       └── T4 - Octobre 2026/
│
├── Correspondances/
│   ├── Relances 2026/
│   │   ├── Relance_DUPONT_2026-03-01.pdf
│   │   └── Relance_BERNARD_2026-03-15.pdf
│   └── Exports 2026/
│
├── Contrats/
│   └── Resiliations 2026/
│       └── Resiliation_Ascenseur_2026.pdf
│
├── Diagnostics/
│   └── Diagnostics 2026/
│       └── DPE_Batiment_A.pdf
│
├── Assurances/
│   └── Assurances/
│       └── Attestation_MRH_2026.pdf
│
└── Documents Legaux/
    └── Ventes 2026/
        └── Etat_Date_Lot_12.pdf
```

### 5. Modification technique

**Fichier** : `src/lib/services/auto-file-ged.service.ts`

**Changement** : `resolveOrCreateSubFolder` accepte un chemin multi-segments :

```typescript
// Avant (1 niveau)
async function resolveOrCreateSubFolder(coproId, parentId, subFolderName)

// Apres (N niveaux)
async function resolveOrCreateSubFolder(coproId, parentId, subFolderPath)
// split sur '/' → boucle creant chaque niveau
```

**Aucun changement d'API** : le parametre reste `subFolderName: string`. Les call sites existants (sans `/`) continuent de fonctionner.

### 6. Affichage GED

Le composant GED (`src/app/(dashboard)/documents/ged/page.tsx`) doit rendre les sous-dossiers recursivement a tous les niveaux (pas juste 1 niveau de profondeur).
