> ⚠️ **PÉRIMÉ (v1 gelé).** La direction visuelle canonique v2 vit dans **`coproflex-v2/docs/DESIGN_TOKENS.md`** (tokens Tailwind/shadcn, DA « Indy »). Ce fichier décrit la DA v1 (tokens CSS, thème sombre) et ne sert plus qu'à l'historique. Voir `coproflex-v2/.planning/SUPERSEDES.md`.

# Design System — CoProFlex

Direction artistique de référence. Ce document est lu automatiquement par le skill `apply-design-system` à chaque création/modification de composant UI.

---

## 1. Palette — Surfaces & Backgrounds

| Token | Valeur | Usage |
|-------|--------|-------|
| `--background` | `#0f1117` | Fond de page |
| `--bg-secondary` | `#131620` | Sidebar, kanban cards imbriquées |
| `--bg-tertiary` / `--surface` | `#1a1d2e` | Cards, panneaux, colonnes kanban |
| `--surface-hover` | `#252b3b` | Hover sur cards |
| `--topbar-bg` | `#161822` | En-têtes de page (TopBar sticky) |

## 2. Palette — Texte

| Token | Valeur | Usage |
|-------|--------|-------|
| `--text-main` | `#e2e8f0` | Texte principal, titres, montants |
| `--text-secondary` | `#94a3b8` | Sous-titres, méta-infos |
| `--text-tertiary` | `#64748b` | Labels, en-têtes colonnes (uppercase) |
| `--text-muted` | `#475569` | Dates, infos très secondaires |

## 3. Palette — Couleurs sémantiques (vives)

Les couleurs sémantiques sont **saturées** (mid-tone Tailwind -500/-600), pas les variantes pastel.

| Token | Valeur | Usage |
|-------|--------|-------|
| `--primary` | `#3b82f6` | Boutons CTA, accents, onglet actif |
| `--primary-hover` | `#2563eb` | Hover bouton primary |
| `--secondary` | `#60a5fa` | Texte bleu secondaire (pills, liens) |
| `--success` | `#22c55e` | Montants positifs, statuts OK, catégorisé |
| `--danger` | `#ef4444` | Montants négatifs, retards, erreurs |
| `--warning` | `#f59e0b` | Alertes, dépassements, non-catégorisé |

### Badges — fond + texte

| Sémantique | Background | Texte |
|------------|------------|-------|
| Success | `rgba(34, 197, 94, 0.1)` | `#4ade80` |
| Danger | `rgba(239, 68, 68, 0.1)` | `#f87171` |
| Warning | `rgba(245, 158, 11, 0.1)` | `#fbbf24` |
| Info | `rgba(59, 130, 246, 0.1)` | `#60a5fa` |
| Neutral | `rgba(148, 163, 184, 0.1)` | `#94a3b8` |

## 4. Borders

Les borders sont **très subtiles** — 2 à 5x plus légères que les valeurs par défaut.

| Token | Valeur | Usage |
|-------|--------|-------|
| `--border` | `rgba(148, 163, 184, 0.08)` | Borders principales (cards, colonnes) |
| `--border-light` | `rgba(148, 163, 184, 0.04)` | Séparateurs de lignes dans tables |
| `--border-dark` | `rgba(148, 163, 184, 0.12)` | Focus inputs, borders plus marquées |

### Borders d'accent

- Hover kanban card : `rgba(59, 130, 246, 0.3)` (glow bleu)
- Compte actif : `border-color: var(--primary)` (2px solid)
- Kanban retard : `border-left: 3px solid #ef4444`

## 5. Typographie

Font principale : `Inter` (hérité de globals.css)

| Contexte | Taille | Poids | Détails |
|----------|--------|-------|---------|
| Hero (budget total) | `32px` | `800` | Gros chiffres clés |
| KPI values | `22px` | `700` | Métriques dans strips |
| Titres cards | `20px` | `700` | H2 dans panneaux |
| TopBar titre | `24px` | `700` | Titre de page |
| TopBar sous-titre | `14px` | `400` | Description |
| Texte courant / cells | `13px` | `500-600` | Contenu de table |
| Labels / en-têtes col | `10-11px` | `600` | **UPPERCASE**, letter-spacing 0.5px |
| Badges | `10-11px` | `500-600` | Statuts, pills |
| Montants | `13px` | `500` | `font-variant-numeric: tabular-nums` |

### Montants en mono

Pour l'alignement des colonnes financières :
```css
font-family: 'SF Mono', 'Fira Code', monospace;
font-variant-numeric: tabular-nums;
```

## 6. Espacement & Radius

| Token | Valeur |
|-------|--------|
| Cards/panneaux padding | `24px` (var(--space-xl)) |
| Gap entre cards | `16px` |
| Gap entre sections | `24-32px` |

| Contexte | Radius |
|----------|--------|
| Cards, panneaux | `12px` |
| Boutons, inputs | `8px` |
| Badges, pills | `8px` à `20px` |
| Pills rondes (compte) | `9999px` |

## 7. Shadows & Effets

| Contexte | Shadow |
|----------|--------|
| Bouton primary hover | `0 4px 12px rgba(59, 130, 246, 0.3)` |
| Modal overlay | `0 20px 60px rgba(0, 0, 0, 0.4)` |
| Card hover | `translateY(-1px)` + ombre subtile |
| Aucun shadow sur cards au repos | Pas de box-shadow, juste border |

## 8. Patterns — Composants

### TopBar (en-tête de page)

```
┌─────────────────────────────────────────────────────┐
│  Titre (24px/700)          [SegmentedControl] [Btns]│
│  Sous-titre (14px/400)                              │
└─────────────────────────────────────────────────────┘
```

- Background : `#161822`
- Border : `rgba(148, 163, 184, 0.08)`
- Radius : `12px`
- Actions à droite : segmented control + ghost buttons + CTA primary

### KPI Strip (4 colonnes)

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ LABEL    │ │ LABEL    │ │ LABEL    │ │ LABEL    │
│ Valeur   │ │ Valeur   │ │ Valeur   │ │ Valeur   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- Background card : `#1a1d2e`
- Label : `11px/600`, uppercase, `#64748b`
- Valeur : `22px/700`, couleur sémantique (vert/rouge/blanc selon contexte)

### Table

- Header : `10px/600`, uppercase, `#64748b`, bg `rgba(148, 163, 184, 0.04)`
- Cells : `13px/500`, `#e2e8f0`
- Row hover : `rgba(148, 163, 184, 0.03)`
- Row borders : `rgba(148, 163, 184, 0.04)`
- Montants : colorés sémantiquement (vert entrée, rouge sortie)
- Actions : `#3b82f6`, font-weight 500, underline au hover

### Modal

- Overlay : `rgba(0, 0, 0, 0.5)`
- Content : `#1a1d2e`, radius `12px`, max-width `560-600px`
- Header : padding `24px`, border-bottom subtile, titre `20px/700`
- Footer : `flex justify-end gap 12px`, border-top subtile
- Bouton annuler : ghost style
- Bouton valider : primary `#3b82f6`

### Kanban

- Colonne : `#1a1d2e`, radius `12px`, padding `16px`
- Card : `#131620`, radius `8px`, border `rgba(..., 0.06)`
- Header colonne : dot couleur + titre + count badge + montant total
- Card hover : `border-color: rgba(59, 130, 246, 0.3)`, `translateY(-1px)`

### Badges

```css
display: inline-flex;
align-items: center;
gap: 4px;
padding: 2px 10px;
border-radius: 8px;
font-size: 11px;
font-weight: 500;
background: rgba(semantic, 0.1);
color: semantic-bright;
```

### Alert Banners

- Fond : `rgba(semantic, 0.1)`
- Border : `1px solid rgba(semantic, 0.3)`
- Texte : couleur sémantique vive
- Padding : `12px 20px`, radius `8px`

### Segmented Control (Table/Kanban, Vue table/Workflow)

- Container : `#131620`, border `rgba(..., 0.08)`, radius `8px`, padding `3px`
- Item actif : `#1a1d2e`, color `#e2e8f0`, shadow subtile
- Item inactif : transparent, color `#94a3b8`
- Badge count : `#3b82f6` bg, white text, radius full

### Boutons

| Type | Background | Texte | Border | Hover |
|------|-----------|-------|--------|-------|
| Primary | `#3b82f6` | `white` | none | `#2563eb` + shadow bleu + translateY(-1px) |
| Ghost | `rgba(148, 163, 184, 0.06)` | `#94a3b8` | `rgba(..., 0.08)` | bg 0.1, text `#e2e8f0` |
| Danger outline | `transparent` | `#ef4444` | `1px solid #ef4444` | bg `rgba(239, 68, 68, 0.1)` |
| Cancel | `#131620` | `#e2e8f0` | `rgba(..., 0.08)` | bg légèrement plus clair |

## 9. Règles — Do / Don't

### DO

- Utiliser les **variables CSS** de `globals.css` comme source de vérité
- Couleurs sémantiques **saturées** (-500/-600) pour les valeurs/montants
- Borders **très subtiles** (opacity 0.04 à 0.12)
- Labels en **UPPERCASE** + letter-spacing pour les en-têtes
- `font-variant-numeric: tabular-nums` pour les colonnes de montants
- `translateY(-1px)` + shadow sur hover des éléments cliquables
- Padding généreux (`24px`) dans les cards

### DON'T

- Jamais de couleurs hardcodées quand une variable CSS existe
- Jamais de borders opaques (`1px solid #xxx`) — toujours rgba
- Jamais de `box-shadow` au repos sur les cards (uniquement au hover)
- Jamais de `--text-main: #F1F5F9` pour le texte — utiliser `#e2e8f0`
- Jamais de styles inline (`style={{}}`)
- Jamais de couleurs pastel/atténuées pour les montants financiers
- Jamais de font-size en `rem` dans les composants Finance — utiliser `px` pour la précision

## 10. Référence visuelle

Preview interactive : `.planning/da-preview.html` (ouvrir dans un navigateur)
