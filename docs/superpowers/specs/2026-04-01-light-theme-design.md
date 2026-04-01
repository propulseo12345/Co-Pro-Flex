# Light Theme — CoProFlex

## Résumé

Ajouter un thème light à l'application (actuellement dark-only). Sidebar sombre conservée, contenu en fond crème avec couleurs pastel douces. Basculement via le toggle existant dans le footer sidebar.

## Décisions de design

### Approche retenue

- **Sidebar** : reste en dark dans les deux modes (ancrage visuel, pattern SaaS standard)
- **Contenu** : bascule entre dark (actuel) et light (crème + pastels)
- **Mécanisme** : attribut `data-theme="light"` sur `<html>`, surcharge des variables CSS dans `:root`

### Palette Light — Crème + Pastels

#### Surfaces

| Token | Valeur light | Usage |
|-------|-------------|-------|
| `--background` | `#faf8f5` | Fond de page |
| `--surface` | `#fffefa` | Cards, tables, panneaux |
| `--surface-hover` | `#f8f4ee` | Hover sur cards/rows |
| `--topbar-bg` | `#fffefa` | Header de page |

#### Texte

| Token | Valeur light | Usage |
|-------|-------------|-------|
| `--text-main` | `#3d3529` | Texte principal, titres |
| `--text-secondary` | `#6b5e4e` | Sous-titres, contenu table |
| `--text-tertiary` | `#a89b88` | Labels uppercase, KPI labels |
| `--text-muted` | `#8c7e6a` | Dates, infos très secondaires |

#### Borders

| Token | Valeur light | Usage |
|-------|-------------|-------|
| `--border` | `#ebe6dd` | Borders cards, tables |
| `--border-light` | `#f3efe8` | Séparateurs de lignes |
| `--border-dark` | `#ddd6ca` | Focus inputs |

#### Couleurs sémantiques

| Sémantique | Fond pastel | Texte | Bar top KPI | Usage |
|------------|------------|-------|-------------|-------|
| Primary/Info | `#dce6fa` | `#4a72c0` | `#92b4f4` | Accents, liens, KPI principal |
| Success | `#d4f0e0` | `#3d8f5e` | `#7dd3a8` | Crédits, statuts OK |
| Danger | `#fce0e0` | `#c45555` | `#f4a0a0` | Débits, retards, erreurs |
| Warning | `#faecd0` | `#b08930` | `#f4d080` | Alertes, dépassements |

#### Badges light

| Sémantique | Background | Texte |
|------------|------------|-------|
| Success | `#d4f0e0` | `#3d8f5e` |
| Danger | `#fce0e0` | `#c45555` |
| Warning | `#faecd0` | `#b08930` |
| Info | `#dce6fa` | `#4a72c0` |
| Neutral | `#f0ece5` | `#8c7e6a` |

#### Boutons light

| Type | Background | Texte | Border |
|------|-----------|-------|--------|
| Primary | `#7c9cf5` | `white` | none |
| Ghost | `#f5f0e8` | `#8c7e6a` | `#ebe6dd` |
| Danger | `transparent` | `#c45555` | `#c45555` |

## Architecture technique

### 1. ThemeProvider — Réactiver le toggle

Le `ThemeProvider` actuel est un no-op. Modifications :

- `toggleTheme()` bascule entre `'dark'` et `'light'`
- Pose `data-theme` sur `document.documentElement`
- Persiste le choix dans `localStorage`
- Initialisation : lit `localStorage`, fallback sur `'dark'`

### 2. Variables CSS — Bloc `[data-theme="light"]`

Dans `globals.css`, ajouter un bloc `[data-theme="light"]` qui redéfinit uniquement les variables de contenu. Les variables sidebar ne sont pas touchées (elles utilisent des noms préfixés `--sidebar-*` ou `--nav-*`).

### 3. Composants impactés

Aucun composant ne change de structure. Le thème fonctionne uniquement via les variables CSS. Les composants qui utilisent des couleurs hardcodées (surtout dans les pages finance) devront être auditées :

- Pages finance-v2 : utilisent des couleurs en dur (`#1a1d2e`, `#e2e2eb`, etc.) au lieu des variables CSS
- `finance-v2.module.css` : couleurs hardcodées à remplacer par des variables
- Sidebar (`UnifiedSidebar.module.css`) : utilise déjà des variables `--sidebar-*` et `--nav-*`, pas de changement nécessaire

### 4. Périmètre des fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/providers/ThemeProvider.tsx` | Réactiver toggle, poser `data-theme`, localStorage |
| `src/styles/globals.css` | Ajouter bloc `[data-theme="light"]` avec toutes les variables |
| `src/components/features/finance-v2/finance-v2.module.css` | Remplacer couleurs hardcodées par variables CSS |
| Audit pages finance-v2 | Remplacer inline colors par variables si nécessaire |

### 5. Ce qui ne change PAS

- Sidebar : garde ses couleurs dark dans les deux modes
- Structure des composants : aucun changement de markup
- Hooks / logique métier : aucun impact
- Routes : aucun changement

## Mockup de référence

Preview interactive : `.superpowers/brainstorm/78894-1775076291/content/light-theme-cream.html`
