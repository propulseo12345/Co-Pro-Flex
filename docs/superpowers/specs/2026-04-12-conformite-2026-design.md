# Spec — Module Conformité 2026

**Date :** 2026-04-12  
**Auteur :** Lyes Triki  
**Statut :** Approuvée

---

## 1. Contexte & Objectif

Trois obligations légales françaises entrent en vigueur en 2026 et ne sont couvertes par aucun module existant de CoProFlex :

| Obligation | Échéance | Cible |
|-----------|----------|-------|
| **PPT** — Plan Pluriannuel de Travaux | Obligatoire depuis 2023 pour >200 lots, extension progressive | Toutes copropriétés |
| **DPE Collectif** | Obligatoire depuis 01/01/2026 pour <50 lots | Toutes copropriétés |
| **Factur-X** | E-facturation obligatoire dès septembre 2026 | Factures fournisseurs |

Le module **Conformité 2026** regroupe ces trois sous-modules dans une entrée dédiée de la navigation principale (niveau 1), distincte de Maintenance.

---

## 2. Architecture générale

### 2.1 Navigation

Nouvelle entrée dans `src/lib/config/navigation.ts` :

```
Conformité 2026
├── PPT (Plan Pluriannuel de Travaux)   → /conformite/ppt
├── DPE Collectif                        → /conformite/dpe
└── Factur-X                             → /conformite/facturx
```

L'entrée PPT existante sous Maintenance (`/maintenance/ppt`) est conservée comme redirect vers `/conformite/ppt` pour ne pas casser d'éventuels favoris.

### 2.2 Pattern UX commun — deux niveaux

PPT et DPE partagent le même pattern de navigation à deux niveaux :

```
Niveau 1 — Vue gestionnaire (toutes copropriétés)
    ↓ clic sur une copropriété
Niveau 2 — Vue détail par copropriété
    ↑ breadcrumb "← Retour à la liste"
```

Factur-X n'a qu'un seul niveau (vue gestionnaire).

### 2.3 Structure des fichiers

```
src/
├── app/(dashboard)/conformite/
│   ├── layout.tsx                      # Layout avec sous-nav Conformité
│   ├── ppt/
│   │   ├── page.tsx                    # Vue gestionnaire PPT
│   │   └── [coproprieteId]/page.tsx    # Kanban + timeline PPT par copro
│   ├── dpe/
│   │   ├── page.tsx                    # Vue gestionnaire DPE
│   │   └── [coproprieteId]/page.tsx    # Fiche DPE par copropriété
│   └── facturx/
│       └── page.tsx                    # Vue gestionnaire Factur-X
├── components/features/conformite/
│   ├── ppt/
│   │   ├── PPTGestionnaireGrid.tsx     # Grille copros (niveau 1)
│   │   ├── PPTKanban.tsx               # Kanban 5 colonnes (niveau 2)
│   │   ├── PPTYearSelector.tsx         # Pills 2026-2035
│   │   └── PPTCardDetail.tsx           # Modal timeline d'un travail
│   ├── dpe/
│   │   ├── DPEGestionnaireTable.tsx    # Table copros + statut (niveau 1)
│   │   ├── DPEFicheDetail.tsx          # Fiche complète (niveau 2)
│   │   ├── DPEEnergyScale.tsx          # Échelle A-G visuelle
│   │   └── DPEHistorique.tsx           # Historique DPE
│   └── facturx/
│       └── FacturXTable.tsx            # Table factures + statut XML
├── hooks/modules/
│   ├── usePPT.ts
│   ├── useDPE.ts
│   └── useFacturX.ts
├── types/models/
│   └── conformite.ts                   # Types PPT, DPE, FacturX
└── data/mock/
    └── conformite.ts                   # Données mockées
```

---

## 3. Module PPT

### 3.1 Vue gestionnaire (niveau 1)

Affiche toutes les copropriétés gérées avec leur avancement PPT global.

**Composants :**
- `PPTGestionnaireGrid` — grille de cards, une par copropriété
- Chaque card : nom copro, nombre de lots, statut global (badge), nb travaux par statut, barre de progression, bouton "Voir le PPT"

**Filtres :** Toutes / À compléter / En retard / À jour

### 3.2 Vue par copropriété — Kanban 10 ans (niveau 2)

Kanban horizontal à 5 colonnes correspondant aux statuts :

| Colonne | Statut enum | Couleur accent |
|---------|-------------|----------------|
| À l'étude | `A_L_ETUDE` | `--text-tertiary` |
| Prévu | `PREVU` | `--warning` |
| Voté en AG | `VOTE` | `--secondary` |
| En cours | `EN_COURS` | `--primary` |
| Terminé | `TERMINE` | `--success` |

**Sélecteur d'année :** Pills 2026→2035. Cliquer sur une année filtre les travaux prévus pour cette année. Une pill "Tous" regroupe l'ensemble des 10 ans.

**Cards travaux :** titre, type (icône + label), montant estimé, date prévisionnelle, badge priorité.

**Clic sur une card → modal timeline :** étapes du travail (devis, vote AG, commande, intervention, réception), avec date, statut, et montant à chaque étape.

### 3.3 Types PPT

```typescript
// Réutilise TravauxPrevisionnel + TravauxPrevisionnelStatut existants
// Nouveau :
export interface IPPTCopropriete {
  coproprieteId: string;
  nom: string;
  nbLots: number;
  travaux: ITravauxPrevisionnel[];
  derniereMAJ: string;
}
```

### 3.4 Hook usePPT

```typescript
const {
  coproprietes,      // liste pour vue gestionnaire
  selectedCopro,     // copro active (niveau 2)
  selectCopro,       // fn de navigation niveau 2
  travaux,           // travaux filtrés par année
  selectedYear,      // année active (null = tous)
  setYear,
  isLoading,
} = usePPT({ gestionnaire?: boolean, coproprieteId?: string });
```

---

## 4. Module DPE Collectif

### 4.1 Vue gestionnaire (niveau 1)

Table listant toutes les copropriétés avec leur statut DPE.

**Colonnes :** Copropriété | Lots | Classe DPE | Date diagnostic | Expiration | Statut | Actions

**Statuts :**
- `VALIDE` — DPE à jour (vert)
- `EXPIRE_BIENTOT` — expiration < 6 mois (orange)
- `EXPIRE` — expiré (rouge)
- `MANQUANT` — pas de DPE enregistré (gris)

**Actions rapides :** "Voir la fiche" / "Planifier un renouvellement"

### 4.2 Vue par copropriété — Fiche DPE (niveau 2)

Deux colonnes :

**Colonne gauche — Fiche DPE (`DPEFicheDetail`) :**
- Bloc classe énergie : échelle A→G (bandes colorées), classe actuelle mise en évidence (badge large)
- Champs : date diagnostic, date expiration, diagnostiqueur (nom + ADEME), N° rapport ADEME, consommation énergie (kWh/m²/an), émissions GES (kgCO₂/m²/an)
- Boutons : Télécharger PDF / Planifier renouvellement / Modifier

**Colonne droite :**
- Bannière alerte (info si valide, warning si bientôt expiré, danger si expiré)
- Card "Travaux recommandés suite au DPE" : liste de travaux avec lien vers le PPT, montant estimé, badge statut
- Card "Historique des DPE" : tableau des DPEs précédents (date, classe, diagnostiqueur)
- Téléchargement document PDF

### 4.3 Échelle énergétique visuelle (`DPEEnergyScale`)

```
A ████████  < 70 kWh/m²/an   ← vert foncé
B ███████   70–110            ← vert clair
C ██████    110–180           ← jaune-vert
D █████     180–250           ← jaune
E ████      250–330           ← orange
F ███       330–420           ← orange foncé
G ██        > 420             ← rouge
```

La classe active est mise en évidence avec un badge et une flèche.

### 4.4 Types DPE

```typescript
export type ClasseDPE = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type StatutDPE = 'VALIDE' | 'EXPIRE_BIENTOT' | 'EXPIRE' | 'MANQUANT';

export interface IDPE {
  id: string;
  coproprieteId: string;
  classeEnergie: ClasseDPE;
  classeGES: ClasseDPE;
  dateDiagnostic: string;
  dateExpiration: string;
  diagnostiqueur: string;
  numeroADEME: string;
  consoEnergie: number;     // kWh/m²/an
  emissionsGES: number;     // kgCO₂/m²/an
  travauxRecommandes: string[];  // IDs travaux PPT liés
  documents: string[];      // URLs PDF
  historique: IDPEHistorique[];
}

export interface IDPEHistorique {
  id: string;
  dateDiagnostic: string;
  classeEnergie: ClasseDPE;
  diagnostiqueur: string;
}
```

### 4.5 Hook useDPE

```typescript
const {
  coproprietes,     // vue gestionnaire
  selectedDPE,      // DPE actif (niveau 2)
  selectCopro,
  travauxLies,      // travaux PPT recommandés
  isLoading,
} = useDPE({ gestionnaire?: boolean, coproprieteId?: string });
```

---

## 5. Module Factur-X

### 5.1 Vue unique gestionnaire

Tableau reprenant les factures existantes du module Finance, enrichi d'une colonne **Factur-X** indiquant le statut de génération du fichier XML embarqué.

**Colonnes :** Facture N° | Copropriété | Fournisseur | Montant TTC | Date | Statut paiement | **Factur-X** | Actions

**Statuts Factur-X :**
- `GENERE` — fichier XML généré (vert, badge "Factur-X ✓")
- `EN_ATTENTE` — facture validée, XML pas encore généré (orange)
- `NON_APPLICABLE` — facture antérieure à sept. 2026 (gris)

**Action "Générer Factur-X" :** visible sur les factures en statut `EN_ATTENTE`. Lance la génération du fichier hybride PDF+XML (Profil EN 16931).

**Téléchargement :** bouton pour télécharger le PDF/A-3 avec XML embarqué.

### 5.2 Types Factur-X

```typescript
export type StatutFacturX = 'GENERE' | 'EN_ATTENTE' | 'NON_APPLICABLE';

export interface IFactureFacturX {
  factureId: string;
  statutFacturX: StatutFacturX;
  dateGeneration?: string;
  urlFichierXML?: string;
  urlPDFA3?: string;
  profil: 'MINIMUM' | 'BASIC_WL' | 'EN16931';
}
```

### 5.3 Hook useFacturX

```typescript
const {
  factures,          // liste enrichie avec statut FacturX
  genererFacturX,    // fn(factureId) → génère le XML
  telecharger,       // fn(factureId) → download PDF/A-3
  isLoading,
  filters,
  setFilters,
} = useFacturX();
```

### 5.4 Génération (phase 1 — mock)

En phase 1 (données mockées), la génération simule un délai de 1-2s et passe le statut de `EN_ATTENTE` à `GENERE`. L'intégration réelle avec une lib XML (ex. `facturx-node` ou API) est prévue en phase 2 avec Supabase Edge Functions.

---

## 6. Navigation & Layout

### 6.1 Ajout dans navigation.ts

```typescript
{
  label: 'Conformité 2026',
  icon: ShieldCheck,
  href: '/conformite',
  children: [
    { label: 'PPT', href: '/conformite/ppt', icon: ClipboardList },
    { label: 'DPE Collectif', href: '/conformite/dpe', icon: Zap },
    { label: 'Factur-X', href: '/conformite/facturx', icon: FileCode },
  ]
}
```

### 6.2 Layout sous-nav

`conformite/layout.tsx` affiche un `SegmentedControl` ou sous-nav horizontal (PPT / DPE / Factur-X) persistant sur toutes les sous-pages.

---

## 7. Données mockées

Les données mockées sont dans `src/data/mock/conformite.ts` et suivent le pattern des autres modules (ex. `mock/maintenance.ts`).

Copropriétés de référence : Résidence Les Pins (32 lots), Immeuble Voltaire (18 lots), Les Jardins du Lac (65 lots), Résidence Berlioz (12 lots).

---

## 8. Hors périmètre (v1)

- Intégration Supabase (base de données réelle)
- Notifications automatiques (expiration DPE, rappels PPT)
- Import depuis fichiers ADEME
- Génération XML Factur-X réelle (simulée en v1)
- Module Conformité accessible depuis mobile (responsive non prioritaire en v1)

---

## 9. Séquence d'implémentation recommandée

1. **Types & mock data** — `conformite.ts` types + données
2. **Navigation** — ajout entrée Conformité dans `navigation.ts`
3. **Layout** — `conformite/layout.tsx` + sous-nav
4. **Module PPT** — hooks → composants → pages (gestionnaire + détail)
5. **Module DPE** — hooks → composants → pages (gestionnaire + détail)
6. **Module Factur-X** — hook → composant table → page
7. **Redirect** — `/maintenance/ppt` → `/conformite/ppt`
