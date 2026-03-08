# Design — Redesign Navigation V1 (High Bar + Sidebar Contextuelle)

**Date:** 2026-03-08
**Status:** Approuvé

## Objectif

Remplacer la navigation actuelle (Sidebar 260px collapsible + Header) par une High Bar horizontale avec 8 modules + une sidebar contextuelle par module.

## Architecture Layout

```
┌──────────────────────────────────────────────────────────┐
│ Logo │ Dashboard AG Copro Finance Maint Docs Comm Cont. │ 🔔 JD │
├──────┬───────────────────────────────────────────────────┤
│ Sub  │                                                   │
│ pages│          Contenu principal                        │
│      │                                                   │
│ ──── │                                                   │
│ ⚙ 🌙 │                                                   │
└──────┴───────────────────────────────────────────────────┘
```

## Modules (8)

| Module | Route prefix | Sous-pages |
|--------|-------------|------------|
| Dashboard | `/dashboard` | (pas de sidebar, pleine largeur) |
| AG | `/ag` | Tableau de bord AG, Prochaine AG, Historique |
| Copropriété | `/coproprietaires` | Copropriétaires, Tantièmes, Lots |
| Finance | `/finance` | Comptabilité, Budgets, Factures, Appels de fonds, Mouvements bancaires |
| Maintenance | `/maintenance` | Carnet d'entretien, Contrats, Prestataires, Ordres de service |
| Documents | `/documents` | GED, Courrier officiel, État daté |
| Communication | `/communication` | Mur, Calendrier, Mail officiel |
| Contentieux | `/contentieux` | Impayés, Litiges |

## Composants

| Composant | Chemin | Rôle |
|-----------|--------|------|
| `HighBar` | `src/components/layout/HighBar/` | Barre horizontale fixe : logo, 8 onglets, notifs, avatar |
| `ModuleSidebar` | `src/components/layout/ModuleSidebar/` | Sidebar contextuelle 220px, sous-pages module actif |
| Layout | `src/app/(dashboard)/layout.tsx` | Assemble HighBar + ModuleSidebar + contenu |

## Suppression

- `src/components/layout/Header/` → remplacé par HighBar
- `src/components/layout/Sidebar/` → remplacé par ModuleSidebar
- `src/app/preview/navigation/` → plus nécessaire
- Sections Analytics → supprimées

## Direction artistique

| Element | Couleur |
|---------|---------|
| High bar fond | `#151821` |
| Onglet actif | `#2563eb` |
| Sidebar fond | `#131620` |
| Sidebar item actif | `#2563eb` + `rgba(37,99,235,0.1)` bg |
| Contenu fond | `#0f1117` |
| Texte principal | `#e2e8f0` |
| Texte secondaire | `#8892a4` |

## Détection module actif

```typescript
const MODULE_ROUTES: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/ag': 'ag',
  '/coproprietaires': 'copropriete',
  '/finance': 'finance',
  '/maintenance': 'maintenance',
  '/documents': 'documents',
  '/communication': 'communication',
  '/contentieux': 'contentieux',
};
// Match par pathname.startsWith(prefix)
```

## Routes à déplacer

- `/ventes-impayes/impayes` → `/contentieux/impayes`
- `/legal/disputes` → `/contentieux/litiges`
- `/ventes-impayes` → supprimé (état daté → Documents)

## Ce qui ne change PAS

- Hooks métier, RPCs Supabase, types/models
- Composants features (contenu des pages)
- CSS Modules des pages existantes
- Logique AG session
