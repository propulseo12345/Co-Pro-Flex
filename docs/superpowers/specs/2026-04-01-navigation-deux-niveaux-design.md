# Navigation à deux niveaux — Gestionnaire / Copropriété

## Objectif

Créer une architecture de navigation à deux niveaux séparés :
- **Niveau Gestionnaire** — vue cabinet, gestion multi-copros, outils transversaux
- **Niveau Copropriété** — modules spécifiques à une copro (existant)

Chaque niveau a son propre layout Next.js et sa propre sidebar. La bascule se fait par clic sur une carte copro (gestionnaire → copro) ou bouton retour (copro → gestionnaire).

---

## Architecture des routes

```
src/app/
├── (gestionnaire)/                    # NOUVEAU — Layout gestionnaire
│   ├── layout.tsx                     # GestionnaireLayout + GestionnaireSidebar
│   ├── portefeuille/                  # DÉPLACÉ depuis (dashboard)/portefeuille
│   │   ├── page.tsx
│   │   └── portefeuille.module.css
│   ├── reporting/
│   │   └── page.tsx                   # Placeholder
│   ├── agenda/
│   │   └── page.tsx                   # Placeholder
│   ├── prestataires/
│   │   └── page.tsx                   # Placeholder
│   ├── modeles/
│   │   └── page.tsx                   # Placeholder
│   ├── facturation/
│   │   └── page.tsx                   # Placeholder
│   └── parametres-cabinet/
│       └── page.tsx                   # Placeholder
│
├── (dashboard)/                       # EXISTANT — Layout copropriété
│   ├── layout.tsx                     # Inchangé (sauf sidebar modifiée)
│   ├── dashboard/
│   ├── ag/
│   ├── finance/
│   └── ...
```

Les route groups `(gestionnaire)` et `(dashboard)` permettent deux layouts séparés sans affecter les URLs.

---

## Sidebar Gestionnaire

### Composant

Nouveau composant `GestionnaireSidebar` dans `src/components/layout/GestionnaireSidebar/`.

### Structure visuelle

Même structure que la sidebar copro existante :
- Même fond, même espacement, même radius, même typographie
- Même mécanisme de collapse (icônes seules)
- Seul le contenu des menus change

### Items de navigation (à plat, pas de groupes)

| Ordre | Label | Icône (Lucide) | Route |
|-------|-------|----------------|-------|
| 1 | Portefeuille | Briefcase | `/portefeuille` |
| 2 | Reporting | BarChart3 | `/reporting` |
| 3 | Agenda global | Calendar | `/agenda` |
| 4 | Prestataires | Users | `/prestataires` |
| 5 | Modèles | FileText | `/modeles` |
| 6 | Facturation | Receipt | `/facturation` |
| 7 | Paramètres | Settings | `/parametres-cabinet` |

### En-tête de la sidebar

En haut, un bloc identifiant le contexte gestionnaire :
```
┌─────────────────────┐
│ [Logo CF] Mon Cabinet│
│          Gestionnaire│
└─────────────────────┘
```

---

## Sidebar Copropriété — Modification

### Bouton retour

Ajout d'un bouton **"← Portefeuille"** en haut de la sidebar copro existante, au-dessus du sélecteur de copro actuel.

```
┌─────────────────────┐
│ ← Portefeuille      │  ← NOUVEAU
├─────────────────────┤
│ Résidence Les Lilas  │  ← Sélecteur copro existant
│ 15 rue des Lilas     │
├─────────────────────┤
│ Dashboard            │
│ AG                   │
│ Finance              │
│ ...                  │
└─────────────────────┘
```

### Style du bouton retour

- Fond : transparent
- Texte : `#94a3b8` (text-secondary)
- Hover : `#e2e8f0` (text-main)
- Icône : `ArrowLeft` (Lucide), taille 14px
- Font-size : 12px
- Padding : `8px 12px`
- Border-bottom : `1px solid rgba(148, 163, 184, 0.08)`
- Clic : redirect vers `/portefeuille`

### Retrait de Portefeuille de la nav copro

Retirer l'entrée `portefeuille` du tableau `MODULES` dans `navigation.ts` (ajoutée dans la session précédente). La route `/portefeuille` appartient maintenant au layout gestionnaire.

---

## Layout Gestionnaire

### Composant

Nouveau fichier `src/app/(gestionnaire)/layout.tsx`.

### Structure

```typescript
export default function GestionnaireLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <GestionnaireSidebar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
```

Même structure que le layout copro existant `(dashboard)/layout.tsx` :
- Sidebar à gauche, contenu à droite
- La sidebar se collapse en mode icônes
- Le contenu prend le reste de la largeur

---

## Config Navigation Gestionnaire

Nouveau fichier `src/lib/config/navigationGestionnaire.ts` :

```typescript
import {
  Briefcase, BarChart3, Calendar, Users,
  FileText, Receipt, Settings,
  type LucideIcon
} from 'lucide-react';

export interface GestionnaireModuleConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export const GESTIONNAIRE_MODULES: GestionnaireModuleConfig[] = [
  { id: 'portefeuille', label: 'Portefeuille', icon: Briefcase, href: '/portefeuille' },
  { id: 'reporting', label: 'Reporting', icon: BarChart3, href: '/reporting' },
  { id: 'agenda', label: 'Agenda global', icon: Calendar, href: '/agenda' },
  { id: 'prestataires', label: 'Prestataires', icon: Users, href: '/prestataires' },
  { id: 'modeles', label: 'Modèles', icon: FileText, href: '/modeles' },
  { id: 'facturation', label: 'Facturation', icon: Receipt, href: '/facturation' },
  { id: 'parametres', label: 'Paramètres', icon: Settings, href: '/parametres-cabinet' },
];
```

---

## Pages Placeholder

Toutes les pages gestionnaire sauf Portefeuille affichent un placeholder identique.

### Composant réutilisable

`src/components/ui/PlaceholderPage.tsx` — composant générique :

```
┌────────────────────────────────────────┐
│                                        │
│          [Icône du module, 48px]       │
│          Nom du module                  │
│                                        │
│    Cette fonctionnalité arrive          │
│    prochainement.                       │
│                                        │
│    [← Retour au portefeuille]          │
│                                        │
└────────────────────────────────────────┘
```

### Style

- Centré verticalement et horizontalement
- Background : `#1a1d2e` (surface)
- Border : `1px solid rgba(148, 163, 184, 0.08)`
- Radius : 12px
- Icône : couleur `#64748b`, 48px
- Titre : 20px/700, `#e2e8f0`
- Description : 14px/400, `#94a3b8`
- Lien retour : `#3b82f6`, hover underline

---

## Flux de navigation

1. **Connexion** → `/portefeuille` (layout gestionnaire)
2. **Clic carte copro** → `setActiveCopro(id, nom)` + redirect `/dashboard` (layout copro)
3. **Clic "← Portefeuille"** dans sidebar copro → redirect `/portefeuille` (layout gestionnaire)
4. **Clic item sidebar gestionnaire** → page gestionnaire correspondante
5. **Clic item sidebar copro** → page copro correspondante (inchangé)

---

## Fichiers concernés

### À créer
- `src/app/(gestionnaire)/layout.tsx` — layout gestionnaire
- `src/app/(gestionnaire)/layout.module.css` — styles layout
- `src/components/layout/GestionnaireSidebar/GestionnaireSidebar.tsx` — sidebar
- `src/components/layout/GestionnaireSidebar/GestionnaireSidebar.module.css` — styles sidebar
- `src/components/layout/GestionnaireSidebar/index.ts` — barrel export
- `src/lib/config/navigationGestionnaire.ts` — config navigation
- `src/components/ui/PlaceholderPage.tsx` — composant placeholder
- `src/app/(gestionnaire)/reporting/page.tsx` — placeholder
- `src/app/(gestionnaire)/agenda/page.tsx` — placeholder
- `src/app/(gestionnaire)/prestataires/page.tsx` — placeholder
- `src/app/(gestionnaire)/modeles/page.tsx` — placeholder
- `src/app/(gestionnaire)/facturation/page.tsx` — placeholder
- `src/app/(gestionnaire)/parametres-cabinet/page.tsx` — placeholder

### À déplacer
- `src/app/(dashboard)/portefeuille/` → `src/app/(gestionnaire)/portefeuille/`

### À modifier
- `src/lib/config/navigation.ts` — retirer l'entrée Portefeuille
- `src/components/layout/UnifiedSidebar/` — ajouter bouton "← Portefeuille" en haut

### À supprimer
- Rien

---

## Hors scope

- Implémentation du contenu des pages gestionnaire (Reporting, Agenda, etc.)
- Authentification / gestion des rôles
- Responsive mobile de la sidebar gestionnaire (suit le même pattern que l'existant)
- Redirection automatique à la connexion (pas d'auth en place)
