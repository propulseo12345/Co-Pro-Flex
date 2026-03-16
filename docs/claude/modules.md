# Modules & Design System — CoProFlex

## Modules fonctionnels

### 1. Dashboard
- KPIs principaux (solde, impayés, AG à venir), alertes critiques, raccourcis actions

### 2. Assemblées Générales (AG)
- Création AG (ordinaire/extraordinaire), 14 résolutions auto-générées
- Ordre du jour, feuille de présence + signature, votes temps réel
- Calcul automatique majorités, votes par correspondance, PDF (convocation/PV)

### 3. Finance
- **Budgets** : Prévisionnel, travaux, ALUR
- **Appels de fonds** : Génération, échéancier, suivi paiements
- **Impayés** : Relances auto (J+15, J+30, J+60, J+90)
- **Comptabilité** : Journaux, grand livre, balance
- **Factures** : Création, validation, paiement

### 4. Maintenance
- Carnet d'entretien, contrats (alertes renouvellement), ordres de service, prestataires

### 5. Documents (GED)
- Catégories (PV, règlements, contrats, diagnostics), upload/download, prévisualisation, archivage

### 6. Communication
- Messagerie privée, mur communautaire, événements

### 7. Copropriétaires
- Annuaire, lots, tantièmes, préférences communication

### 8. Ventes & Impayés
- Workflow vente de lot, questionnaire syndic, suivi impayés, recouvrement

---

## Hooks disponibles

### useBudget
```typescript
const { budgets, selectedBudget, isLoading, error, totals, selectYear, createBudget, updateBudget } = useBudget({ coproprieteId, annee });
```

### useLogbook
```typescript
const { interventions, stats, filters, viewMode, updateFilters, createIntervention } = useLogbook({ coproprieteId });
```

### useAppelsFonds
```typescript
const { appelsFonds, stats, filters, genererEcheancier, enregistrerPaiement } = useAppelsFonds({ coproprieteId, annee });
```

### useContracts
```typescript
const { contracts, stats, contractsExpirantBientot, resilierContract, renouvelerContract } = useContracts({ coproprieteId });
```

### useVenteDetail
```typescript
const { vente, progressEtapes, documentsByType, changeStatus, addDocument } = useVenteDetail({ venteId });
```

---

## Design System

### Variables CSS principales

```css
/* Couleurs */
--color-primary-600: #2563eb;
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;

/* Spacing */
--spacing-1: 0.25rem;  --spacing-2: 0.5rem;
--spacing-4: 1rem;     --spacing-6: 1.5rem;

/* Typography */
--font-size-sm: 0.875rem;  --font-size-base: 1rem;
--font-size-lg: 1.125rem;  --font-size-2xl: 1.5rem;

/* Borders */
--radius-sm: 4px;  --radius-md: 6px;  --radius-lg: 8px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.1);
```

### Dark Mode
- Via `data-theme="dark"` sur `<html>`, géré par `ThemeProvider`
