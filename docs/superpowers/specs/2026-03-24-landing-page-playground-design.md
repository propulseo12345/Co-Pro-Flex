# Landing Page CoProFlex — Design Playground

Adaptation fidèle de la landing page Playground (gestion crèches) pour CoProFlex (gestion copropriété, marché français). Reproduction pixel-perfect du style Playground avec contenu métier copropriété.

---

## Décisions de design

| Décision | Choix |
|----------|-------|
| Style visuel | Playground tel quel (fond crème `#FEF5E4`, orange/bleu, warm) |
| Hero | Conserver le hero Velorah dark existant, transition vers light |
| Illustrations | Aquarelles thème immobilier (haussmannien, balcons, jardins) |
| Screenshots | Vrais screenshots de l'app CoProFlex |
| Section "Découvrez" | Format hero Playground (onglets + screenshot + illustrations latérales) |
| Approche implémentation | Reproduction fidèle section par section via API Figma |

## Palette Playground

| Token | Valeur | Usage |
|-------|--------|-------|
| Spring Wood | `#FEF5E4` | Fond sections alternées |
| White | `#FFFFFF` | Fond sections alternées |
| Blue Whale | `#052641` | Texte titres, fond dark (CTA, footer) |
| Dodger Blue | `#3079FF` | Accent principal, boutons, onglets actifs |
| Outrageous Orange | `#FC5F35` | Accent secondaire, labels AG |
| Sun | `#FFA211` | Accent tertiaire, labels témoignages |
| Fruit Salad | `#55AC63` | Accent finance/succès |
| Azure Radiance | `#0081F1` | Accent maintenance/documents |
| Friar Gray | `#807E7A` | Texte secondaire, descriptions |
| Westar | `#E2DFD8` | Borders, séparateurs |
| Silver Chalice | `#AAAAAA` | Texte tertiaire |

## Typographie

- Titres : **DM Serif Display** (à confirmer via extraction Figma — fallback : Playfair Display). Charger via `next/font/google` dans `velorah/layout.tsx`
- Corps : Inter (déjà chargé dans le layout)
- Tailles fidèles au design Figma

## Architecture fichiers

```
src/app/preview/velorah/
├── layout.tsx                    # Layout existant (ajouter fonts Playground)
├── page.tsx                      # Page principale — toutes les sections
├── velorah.module.css            # Styles existants hero + nouveaux styles sections
├── components/
│   ├── LogoCarousel.tsx          # Section 2
│   ├── LogoCarousel.module.css
│   ├── DiscoverSection.tsx       # Section 3 — onglets + screenshot + illustrations
│   ├── DiscoverSection.module.css
│   ├── FeatureGrid.tsx           # Sections 4-5-6 — composant réutilisable
│   ├── FeatureGrid.module.css
│   ├── InteractiveSlider.tsx     # Section 7
│   ├── InteractiveSlider.module.css
│   ├── Testimonials.tsx          # Section 8
│   ├── Testimonials.module.css
│   ├── Sizes.tsx                 # Section 9
│   ├── Sizes.module.css
│   ├── Support.tsx               # Section 10
│   ├── Support.module.css
│   ├── CtaSection.tsx            # Section 11
│   ├── CtaSection.module.css
│   ├── Footer.tsx                # Section 12
│   └── Footer.module.css
└── assets/                       # Images téléchargées depuis Figma
    ├── illustrations/            # Aquarelles immobilier
    └── screenshots/              # Screenshots app CoProFlex
```

## Sections

### Section 1 — Hero (existant)

Inchangé. Dark navy `hsl(201, 100%, 13%)` avec vidéo background, Instrument Serif, liquid-glass. Fichiers existants conservés tels quels.

### Section 2 — Transition + Logo Carousel

**Transition** : Dégradé CSS de `hsl(201, 100%, 13%)` vers `#FEF5E4` sur ~200px.

**Logo Carousel** :
- Fond `#FEF5E4`
- Texte "Rejoint par plus de 500+ copropriétés" en `#052641`
- 8 logos placeholder défilants en boucle infinie via animation CSS `translateX` (set dupliqué 2x pour loop continu)
- Logos : rectangles gris `#E2DFD8` avec texte "Partenaire X" (remplaçables par vrais logos)

### Section 3 — Découvrez CoProFlex

Format fidèle au hero Playground (screenshot de référence fourni par l'utilisateur).

**Layout** :
- Fond `#FEF5E4`
- Barre d'onglets horizontale avec flèches ← → navigation
- Onglets : Dashboard, AG, Finance, Maintenance, Documents, Communication
- Onglet actif : texte `#3079FF` + icône colorée, inactifs en `#807E7A`

**Contenu central** :
- Screenshot réel de l'app CoProFlex dans un cadre blanc avec ombre
- Sidebar app visible dans le screenshot
- Le screenshot change selon l'onglet actif (state React)

**Illustrations** :
- Illustrations aquarelles immobilier positionnées en absolute de chaque côté
- Gauche : immeuble haussmannien / balcons fleuris
- Droite : jardin / cour intérieure

**Bas** :
- "Regarder la visite guidée · 10 min" avec icône play bleu

### Section 4 — Assemblées Générales

**Header** :
- Label orange `#FC5F35` avec icône
- Titre "Des AG aussi simples que vos réunions d'équipe" en `#052641`
- Description en `#807E7A`

**Grid Bento** (reproduit le marketing grid Playground) :
- Card Témoignage : fond `#FC5F35`, citation syndic, nom/rôle, illustration/animation
- Card Large : screenshot module votes temps réel
- Card Large : screenshot PV automatique
- Card Small : "14 résolutions auto-générées" + icône
- Card Small : "Votes par correspondance" + icône

### Section 5 — Vision Financière

**Header** :
- Label vert `#55AC63`
- Titre "La vision financière complète de votre copropriété"

**Grid Bento** :
- Card Témoignage : fond vert, citation gestionnaire
- Card Large : screenshot budgets prévisionnels
- Card Large : screenshot appels de fonds / échéancier
- Card Small : "Suivi impayés & relances auto"
- Card Small : "Comptabilité : journaux, grand livre, balance"

### Section 6 — Maintenance & Documents

**Header** :
- Label bleu `#0081F1`
- Titre "Maintenance & Documents sous contrôle"

**Grid Bento** :
- Card Témoignage : fond bleu, citation
- Card Large : screenshot carnet d'entretien / ordres de service
- Card Large : screenshot GED documents
- Card Small : "Contrats & alertes renouvellement"
- Card Small : "Communication & messagerie"

### Section 7 — Slider Interactif

- Fond `#FEF5E4`
- Titre centré "Gérez votre copropriété facilement" en `#052641`
- Barre d'onglets avec flèches ← → : Dashboard, Finance, AG, Maintenance, Documents, Communication, Copropriétaires
- Onglet actif souligné bleu `#3079FF`
- Grand screenshot app pleine largeur dans cadre avec ombre
- "Regarder la visite guidée" en bas (optionnel)

Différence avec section 3 : pas d'illustrations latérales, screenshot plus grand, plus de détail.

### Section 8 — Témoignages

- Fond blanc
- **Gauche** : Placeholder statique (image thumbnail + bouton play décoratif). L'URL vidéo sera ajoutée ultérieurement
- **Droite** :
  - Titre "Ce que nos clients en disent" en `#052641`
  - Citations rotatives (4 témoignages) avec animation fade
  - Chaque citation : texte en gros, nom + rôle + copropriété
  - Auteurs listés en bas, actif mis en avant
  - Bouton "Voir tous les témoignages" style secondary

### Section 9 — Tailles de copropriétés

- Fond `#FEF5E4`
- **Gauche** : Titre "Adapté à toutes les copropriétés" en `#052641`
- **Droite** : Description + bouton bleu "En savoir plus"
- **Cards horizontales** avec illustrations aquarelles :
  - Petite copropriété (< 20 lots)
  - Moyenne copropriété (20-50 lots)
  - Grande copropriété (50-200 lots)
  - Résidence (multi-bâtiments)
  - ASL / AFUL (associations foncières)
  - Immeuble mixte (commerce + habitation)

Chaque card : illustration aquarelle, titre `#052641`, sous-titre descriptif.

### Section 10 — Support & Accompagnement

**Bloc A** (fond blanc) :
- Gauche : illustration aquarelle
- Droite : titre "Un accompagnement humain, de vrais experts", description, bouton "Parler à un expert"
- 3 colonnes features :
  - Onboarding : migration données, formation, accompagnement 90j
  - Support : chat direct, réponse < 2h, base connaissances
  - Évolution : mises à jour mensuelles, roadmap publique, demandes features

**Bloc B** (fond `#FEF5E4`) :
- Illustration aquarelle à gauche
- "Un support récompensé par nos utilisateurs"
- Stats : "98% satisfaction", "Réponse < 2h"

### Section 11 — CTA Final

- Fond `#052641`
- **Wrapper clair** :
  - Titre "Demander une démo gratuite"
  - Description "Découvrez CoProFlex en 30 minutes avec un expert dédié"
  - Bouton CTA `#3079FF` "Réserver ma démo"
  - Screenshot app en dessous
- **4 cards features** (icônes Lucide + descriptions) :
  - "Sans engagement" (icône `Unlock`)
  - "Onboarding inclus" (icône `GraduationCap`)
  - "Données sécurisées" (icône `ShieldCheck`)
  - "Support dédié" (icône `Headphones`)

### Section 12 — Footer

- Fond `#052641`
- Logo CoProFlex
- **4 colonnes de liens** :
  - Produit : Fonctionnalités, Tarifs, Intégrations, Sécurité, Roadmap
  - Ressources : Blog, Guides, Webinaires, Centre d'aide, API
  - Entreprise : À propos, Contact, Carrières, Presse, Partenaires
  - Légal : CGU, Confidentialité, Cookies, Mentions légales
- Bas : réseaux sociaux, copyright, adresse
- Contact : email, téléphone

## Composant réutilisable — FeatureGrid

Les sections 4, 5, 6 partagent la même structure. Un composant `FeatureGrid` accepte :

```typescript
interface FeatureGridProps {
  label: string;
  labelColor: string;           // #FC5F35, #55AC63, #0081F1
  title: string;
  description: string;
  testimonial: {
    quote: string;
    author: string;
    role: string;
    bgColor: string;
  };
  cards: Array<{
    type: 'large' | 'small';
    title: string;
    description?: string;
    screenshot?: string;        // chemin image pour cards large
    icon?: React.ComponentType<{ size?: number; className?: string }>;  // Composant Lucide passé directement
  }>;
}
```

## Assets à préparer

**Stratégie placeholder** : Toutes les images non disponibles utilisent un placeholder (fond `#E2DFD8` + texte centré `#807E7A` décrivant le contenu attendu). Cela débloque l'implémentation sans attendre les vrais assets.

1. **Illustrations aquarelles immobilier** : À générer ou sourcer. Fichiers attendus :
   - `illustration-haussmann-left.webp` — immeuble haussmannien (sections 3, 10)
   - `illustration-garden-right.webp` — jardin / cour intérieure (section 3)
   - `illustration-support.webp` — personnage support (section 10)
   - `illustration-small.webp` à `illustration-mixed.webp` — 6 types copropriétés (section 9)
2. **Screenshots app** : Capturer depuis l'app CoProFlex. Fichiers attendus :
   - `screenshot-dashboard.png`
   - `screenshot-ag.png`, `screenshot-ag-votes.png`, `screenshot-ag-pv.png`
   - `screenshot-finance-budget.png`, `screenshot-finance-appels.png`
   - `screenshot-maintenance.png`, `screenshot-documents.png`
   - `screenshot-communication.png`, `screenshot-coproprietaires.png`
3. **Logos partenaires** : 8 placeholders rectangulaires pour le moment
4. **Assets Figma** : Télécharger les SVG/images depuis les sections Figma avant expiration (7 jours)

## Responsive

- Desktop first (fidèle au Figma 1920px)
- **Breakpoints** : tablette `<= 1024px`, mobile `<= 768px`
- Tablette : grids passent en 1 colonne, onglets scroll horizontal
- Mobile : sections empilées, illustrations masquées, screenshots pleine largeur

## Accessibilité

- Onglets (sections 3, 7) : `role="tablist"` / `role="tab"` / `aria-selected` / navigation clavier (flèches gauche/droite)
- Animations : respecter `prefers-reduced-motion` (LogoCarousel pause, Testimonials pas de rotation)
- Images : `alt` descriptif pour illustrations, `alt` avec nom du module pour screenshots
- Carousel témoignages (section 8) : `aria-live="polite"`, stoppable au hover
- Contraste : tous les textes respectent WCAG AA sur leurs fonds respectifs

## Contraintes techniques

- CSS Modules uniquement (pas de Tailwind)
- Pas de dépendances supplémentaires (animations CSS pures)
- Images dans `public/` ou `assets/` local (pas de CDN externe sauf vidéo)
- Composants isolés dans `src/app/preview/velorah/components/`
- **Isolation dark mode** : Le `velorah/layout.tsx` définit ses propres variables CSS locales qui ne dépendent PAS du ThemeProvider global. Les sections light ne doivent jamais hériter de `--background: #0f1117` du design system dark
