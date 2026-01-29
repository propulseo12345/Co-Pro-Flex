# Architecture CSS - Module AG

## Principe: Un Shared par Surface

Chaque surface fonctionnelle (Dashboard, Wizard, Session...) peut avoir:

| Fichier | Rôle | Limite |
|---------|------|--------|
| `*.shared.module.css` | Patterns réutilisables (tokens, components) | **<= 450 lignes** |
| `*.common.module.css` | Styles communs entre sous-pages (optionnel) | **<= 120 lignes** |
| `page.module.css` | Styles spécifiques à la page | **<= 250 lignes** |

## Structure Actuelle

```
src/components/features/ag/Dashboard/
├── components/
│   ├── agDashboard.shared.module.css   # Patterns partagés (ListItem, Modal, Badges...)
│   ├── AgListItem.tsx
│   ├── AgStatusBadge.tsx
│   ├── ConfirmModal.tsx
│   └── index.ts

src/app/(dashboard)/ag/dashboard/
├── dashboard.module.css                 # Page-specific (layout, NextAgCard, empty states)
└── page.tsx
```

## Convention de Nommage

### Fichiers CSS
- `agSurface.shared.module.css` - patterns partagés pour une surface
- `agSurface.common.module.css` - styles communs (optionnel)
- `surface.module.css` ou `page.module.css` - page-specific

### Classes CSS

| Type | Convention | Exemple |
|------|------------|---------|
| **Pattern réutilisable** | `.patternName` | `.listItem`, `.modal`, `.badge` |
| **Variante** | `.patternNameVariant` | `.listItemDraft`, `.badgeClosed` |
| **Élément enfant** | `.patternElement` | `.listIcon`, `.listContent`, `.listActions` |
| **État** | `.patternState` | `.listItemHover`, `.modalOpen` |
| **Page-specific** | `.sectionNom` | `.nextAgCard`, `.sectionHeader` |

### Préfixe de tokens
Les tokens CSS doivent être préfixés par le module:
```css
:root {
  --ag-radius-sm: 4px;
  --ag-gap-lg: 1rem;
  --ag-transition: 0.2s ease;
}
```

## Patterns Disponibles (shared)

### ListItem
```tsx
<AgListItem
  icon={<Icon />}
  title="Titre"
  meta="Date • Lieu"
  actions={[{ icon, label, href, onClick, variant }]}
  variant="history" | "draft"
  editable
  onRename={(title) => Promise}
/>
```

### ConfirmModal
```tsx
<ConfirmModal
  open={boolean}
  icon={<Icon />}
  title="Titre"
  description={ReactNode}
  warning="Message warning"
  confirmLabel="Action"
  onConfirm={() => void}
  onCancel={() => void}
  isLoading={boolean}
/>
```

### AgStatusBadge
```tsx
<AgStatusBadge status="draft" | "convoked" | "in_progress" | "closed" />
<AgStatusBadge quorum={85.5} />
```

## Exemple: Dashboard vs Wizard

### Dashboard (actuel)
```
shared (381 lignes): ListItem, Modal, Badges, Empty, Edit patterns
page (134 lignes): Layout, NextAgCard, buttons, empty states spécifiques
```

### Wizard (futur)
```
agWizard.shared.module.css: StepIndicator, FormSection, ValidationBadge
wizard.module.css: Layout wizard, navigation steps
```

## Vérification

```bash
# Check des limites CSS
npm run css:ag:check

# Output attendu:
# ✓ dashboard.module.css: 134/250 lines
# ✓ agDashboard.shared.module.css: 381/450 lines
# All CSS files within limits
```

## Ajout d'un Nouveau Pattern

1. Identifier si le pattern est réutilisable (>= 2 usages potentiels)
2. L'ajouter dans `*.shared.module.css` avec les variantes
3. Créer le composant TSX correspondant si nécessaire
4. Exporter depuis `components/index.ts`
5. Vérifier les limites: `npm run css:ag:check`

## Anti-patterns

- Ne pas dépasser les limites sans refactor
- Ne pas dupliquer des patterns entre pages (extraire dans shared)
- Ne pas utiliser de sélecteurs imbriqués profonds (`.a .b .c .d`)
- Ne pas hardcoder des valeurs (utiliser les tokens)
- Ne pas mettre de logique métier dans les composants UI (AgListItem ne gère pas Supabase)
