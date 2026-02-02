# CLAUDE.md - Contexte Projet CoProFlex

Ce fichier fournit le contexte complet du projet pour Claude/Cursor AI.
Placé à la racine du projet, il est lu automatiquement.

---

## 🎯 PROJET

**CoProFlex** est une plateforme SaaS de gestion de copropriété pour le marché français.

### Objectif
Fournir aux syndics professionnels et bénévoles un outil complet pour gérer :
- Les Assemblées Générales (AG) avec votes conformes à la loi française
- La comptabilité et les appels de fonds
- La maintenance et les contrats prestataires
- Les documents et la communication
- Les ventes de lots et impayés

### État actuel
- **Frontend** : Fonctionnel avec données mockées
- **Backend** : Supabase
- **Pages** : ~100 pages fonctionnelles
- **Score qualité** : ~75/100

---

## 🛠️ STACK TECHNIQUE

| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 16 | Framework React (App Router) |
| React | 19 | UI Library |
| TypeScript | 5 | Typage statique |
| CSS Modules | - | Styles scopés |
| Lucide React | 0.555 | Icônes |
| jsPDF | 3.0 | Génération PDF |
| clsx | 2.1 | Classes conditionnelles |

### Pas encore installé (prévu)
- Supabase (BDD + Auth)
- React Hook Form (Formulaires)
- Zod (Validation)

---

## 📁 STRUCTURE DU PROJET

```
copro-manager/
├── src/
│   ├── app/                        # Routes Next.js (App Router)
│   │   ├── (dashboard)/            # Route Group - pages protégées
│   │   │   ├── layout.tsx          # Layout avec Sidebar/Header
│   │   │   ├── dashboard/          # Tableau de bord
│   │   │   ├── ag/                 # Assemblées Générales
│   │   │   ├── finance/            # Finance (budgets, appels, factures)
│   │   │   ├── maintenance/        # Maintenance (contrats, ordres service)
│   │   │   ├── documents/          # GED
│   │   │   ├── communication/      # Messagerie, mur, événements
│   │   │   ├── coproprietaires/    # Annuaire copropriétaires
│   │   │   ├── ventes-impayes/     # Ventes lots et impayés
│   │   │   └── settings/           # Paramètres
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Redirect vers /dashboard
│   │   ├── not-found.tsx           # Page 404
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                     # Composants atomiques réutilisables
│   │   │   ├── SignatureCanvas/
│   │   │   ├── DocumentViewerModal/
│   │   │   ├── ThemeToggle/
│   │   │   └── index.ts
│   │   ├── layout/                 # Composants de structure
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── PageWrapper/
│   │   │   └── index.ts
│   │   └── features/               # Composants métier par module
│   │       ├── ag/
│   │       ├── finance/
│   │       │   ├── Budget/
│   │       │   └── AppelsFonds/
│   │       ├── maintenance/
│   │       │   ├── Logbook/
│   │       │   └── Contracts/
│   │       ├── ventes/
│   │       │   └── VenteDetail/
│   │       └── index.ts
│   │
│   ├── hooks/
│   │   ├── modules/                # Hooks métier
│   │   │   ├── useBudget.ts
│   │   │   ├── useLogbook.ts
│   │   │   ├── useAppelsFonds.ts
│   │   │   ├── useContracts.ts
│   │   │   └── useVenteDetail.ts
│   │   └── index.ts
│   │
│   ├── lib/
│   │   ├── utils/                  # Fonctions utilitaires
│   │   │   ├── echeancier.ts
│   │   │   ├── budget.ts
│   │   │   └── service-order.ts
│   │   ├── constants/              # Constantes métier
│   │   │   ├── alerts.ts
│   │   │   ├── resolutions-bank.ts
│   │   │   └── ag-auto-resolutions.ts
│   │   ├── config/
│   │   │   └── search.ts
│   │   └── pdf/                    # Générateurs PDF
│   │       └── generateVentePDF.ts
│   │
│   ├── types/
│   │   ├── enums/                  # Énumérations
│   │   │   ├── roles.ts
│   │   │   ├── statuts.ts
│   │   │   ├── vote-types.ts
│   │   │   ├── misc.ts
│   │   │   └── index.ts
│   │   ├── models/                 # Interfaces des entités
│   │   │   ├── user.ts
│   │   │   ├── copropriete.ts
│   │   │   ├── coproprietaire.ts
│   │   │   ├── ag.ts
│   │   │   ├── finance.ts
│   │   │   ├── maintenance.ts
│   │   │   ├── document.ts
│   │   │   ├── communication.ts
│   │   │   └── index.ts
│   │   ├── common.ts               # Types utilitaires
│   │   └── index.ts
│   │
│   ├── services/                   # (Prévu pour Supabase)
│   │   ├── mock/
│   │   └── api/
│   │
│   ├── data/
│   │   └── mock/                   # Données mockées
│   │
│   ├── providers/
│   │   └── ThemeProvider.tsx
│   │
│   └── styles/
│       └── globals.css             # Variables CSS + styles globaux
│
├── public/
├── .cursorrules                    # Règles pour Cursor AI
├── CLAUDE.md                       # Ce fichier
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 📝 CONVENTIONS DE CODE

### Nommage

| Type | Convention | Exemple |
|------|------------|---------|
| Composants | PascalCase | `BudgetTable.tsx` |
| Hooks | camelCase + use | `useBudget.ts` |
| Utils | camelCase | `formatCurrency.ts` |
| Types/Interfaces | PascalCase + I prefix | `IAssembleeGenerale` |
| Enums | PascalCase | `AGStatut` |
| CSS Modules | camelCase | `styles.container` |
| Constantes | SCREAMING_SNAKE_CASE | `VOTING_ARTICLES` |

### Imports

Toujours utiliser les alias TypeScript :

```typescript
// ✅ Correct
import { Button } from '@/components/ui';
import { useBudget } from '@/hooks/modules/useBudget';
import type { IAssembleeGenerale } from '@/types';

// ❌ Incorrect
import { Button } from '../../../components/ui';
```

### Alias disponibles

```typescript
"@/*"           → "./src/*"
"@/components/*" → "./src/components/*"
"@/ui/*"        → "./src/components/ui/*"
"@/features/*"  → "./src/components/features/*"
"@/hooks/*"     → "./src/hooks/*"
"@/lib/*"       → "./src/lib/*"
"@/types/*"     → "./src/types/*"
"@/services/*"  → "./src/services/*"
"@/data/*"      → "./src/data/*"
"@/providers/*" → "./src/providers/*"
```

### Structure d'un composant

```typescript
'use client'; // Si nécessaire

// 1. Imports externes
import { useState, useCallback } from 'react';
import { Icon } from 'lucide-react';

// 2. Imports internes
import { Button } from '@/components/ui';
import styles from './MonComposant.module.css';

// 3. Types locaux
interface MonComposantProps {
  title: string;
  onAction: () => void;
}

// 4. Composant
export function MonComposant({ title, onAction }: MonComposantProps) {
  // Hooks
  const [state, setState] = useState(false);

  // Handlers
  const handleClick = useCallback(() => {
    onAction();
  }, [onAction]);

  // Render
  return (
    <div className={styles.container}>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Action</Button>
    </div>
  );
}
```

### Règles strictes

- ❌ Jamais de `any` - utiliser `unknown` ou typer correctement
- ❌ Jamais de `console.log` en production
- ❌ Jamais de styles inline (`style={{}}`)
- ✅ Toujours typer les props avec une interface
- ✅ Toujours utiliser CSS Modules
- ✅ Pages < 300 lignes (extraire en composants si plus)

---

## 🏛️ RÈGLES MÉTIER CRITIQUES

### Votes en AG (Loi française)

| Article | Majorité | Usage |
|---------|----------|-------|
| Article 24 | Majorité simple (présents/représentés) | Décisions courantes |
| Article 25 | Majorité absolue (tous les copros) | Travaux d'amélioration |
| Article 25-1 | Passerelle 25→24 | Si échec art. 25 avec 1/3 des voix |
| Article 26 | Double majorité (2/3 tantièmes + majorité copros) | Actes de disposition |
| Article 26-1 | Passerelle 26→25 | Si échec art. 26 avec 1/2 des voix |
| Unanimité | 100% des tantièmes | Aliénation parties communes |

### Calcul des majorités

```typescript
// Article 24 : Majorité simple des présents
const seuilArt24 = Math.floor(tantiemesPresents / 2) + 1;

// Article 25 : Majorité absolue de tous
const seuilArt25 = Math.floor(totalTantiemes / 2) + 1;

// Article 26 : Double majorité
const seuilArt26Tantiemes = Math.floor(totalTantiemes * 2 / 3) + 1;
const seuilArt26Copros = Math.floor(totalCoproprietaires / 2) + 1;
```

### Workflow Ordres de Service

```
BROUILLON → ENVOYE → EN_ATTENTE_PRESTATAIRE → INTERVENTION_PROGRAMMEE → INTERVENTION_REALISEE → CLOTURE
                  ↘                        ↘                        ↘
                   ANNULE                  ANNULE                   ANNULE
```

### Échéanciers Appels de Fonds

| Mode | Appels | Répartition |
|------|--------|-------------|
| UNIQUE | 1 | 100% |
| SEMESTRIEL | 2 | 50% / 50% |
| TRIMESTRIEL | 4 | 25% × 4 |
| PERSONNALISE | N | Configurable |

---

## 📦 MODULES FONCTIONNELS

### 1. Dashboard
- KPIs principaux (solde, impayés, AG à venir)
- Alertes critiques
- Raccourcis actions

### 2. Assemblées Générales (AG)
- Création AG (ordinaire/extraordinaire)
- Génération automatique des 14 résolutions ordinaires
- Gestion ordre du jour
- Feuille de présence avec signature
- Système de vote (temps réel)
- Calcul automatique des majorités
- Votes par correspondance
- Génération convocation/PV (PDF)

### 3. Finance
- **Budgets** : Prévisionnel, travaux, ALUR
- **Appels de fonds** : Génération, échéancier, suivi paiements
- **Impayés** : Relances automatiques (J+15, J+30, J+60, J+90)
- **Comptabilité** : Journaux, grand livre, balance
- **Factures** : Création, validation, paiement

### 4. Maintenance
- **Carnet d'entretien** : Historique interventions
- **Contrats** : Gestion, alertes renouvellement
- **Ordres de service** : Workflow complet
- **Prestataires** : Annuaire, évaluation

### 5. Documents (GED)
- Catégories : PV, règlements, contrats, diagnostics...
- Upload/Download
- Prévisualisation
- Archivage réglementaire

### 6. Communication
- Messagerie privée
- Mur communautaire (posts, commentaires)
- Événements

### 7. Copropriétaires
- Annuaire complet
- Gestion des lots
- Tantièmes
- Préférences communication

### 8. Ventes & Impayés
- Workflow vente de lot
- Questionnaire syndic
- Suivi impayés
- Procédures de recouvrement

---

## 🎨 DESIGN SYSTEM

### Variables CSS principales

```css
/* Couleurs */
--color-primary-600: #2563eb;
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;

/* Spacing */
--spacing-1: 0.25rem;
--spacing-2: 0.5rem;
--spacing-4: 1rem;
--spacing-6: 1.5rem;

/* Typography */
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
--font-size-lg: 1.125rem;
--font-size-2xl: 1.5rem;

/* Borders */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
```

### Dark Mode
- Supporté via `data-theme="dark"` sur `<html>`
- Géré par `ThemeProvider`
- 891 règles CSS pour le dark mode

---

## 🪝 HOOKS DISPONIBLES

### useBudget
```typescript
const {
  budgets, selectedBudget, isLoading, error, totals,
  selectYear, createBudget, updateBudget
} = useBudget({ coproprieteId, annee });
```

### useLogbook
```typescript
const {
  interventions, stats, filters, viewMode,
  updateFilters, createIntervention
} = useLogbook({ coproprieteId });
```

### useAppelsFonds
```typescript
const {
  appelsFonds, stats, filters,
  genererEcheancier, enregistrerPaiement
} = useAppelsFonds({ coproprieteId, annee });
```

### useContracts
```typescript
const {
  contracts, stats, contractsExpirantBientot,
  resilierContract, renouvelerContract
} = useContracts({ coproprieteId });
```

### useVenteDetail
```typescript
const {
  vente, progressEtapes, documentsByType,
  changeStatus, addDocument
} = useVenteDetail({ venteId });
```
