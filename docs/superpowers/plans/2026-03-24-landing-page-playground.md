# Landing Page CoProFlex — Playground Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapter la landing page Playground en 12 sections pour CoProFlex, style fidèle avec contenu copropriété.

**Architecture:** Page unique dans `src/app/preview/velorah/` avec composants isolés par section. Chaque section = 1 composant + 1 CSS Module. Le hero dark existant est conservé, les sections Playground light viennent en dessous avec une transition dégradée. Un composant `FeatureGrid` réutilisable gère les sections 4-5-6.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, CSS Modules, Lucide React 0.555

**Spec:** `docs/superpowers/specs/2026-03-24-landing-page-playground-design.md`

---

## File Structure

```
src/app/preview/velorah/
├── layout.tsx                          # MODIFY — ajouter font DM Serif Display
├── page.tsx                            # MODIFY — importer et assembler toutes les sections
├── velorah.module.css                  # MODIFY — ajouter transition dark→light
├── components/
│   ├── LogoCarousel.tsx                # CREATE — Section 2
│   ├── LogoCarousel.module.css         # CREATE
│   ├── DiscoverSection.tsx             # CREATE — Section 3
│   ├── DiscoverSection.module.css      # CREATE
│   ├── FeatureGrid.tsx                 # CREATE — Sections 4-5-6 (réutilisable)
│   ├── FeatureGrid.module.css          # CREATE
│   ├── InteractiveSlider.tsx           # CREATE — Section 7
│   ├── InteractiveSlider.module.css    # CREATE
│   ├── Testimonials.tsx                # CREATE — Section 8
│   ├── Testimonials.module.css         # CREATE
│   ├── Sizes.tsx                       # CREATE — Section 9
│   ├── Sizes.module.css                # CREATE
│   ├── Support.tsx                     # CREATE — Section 10
│   ├── Support.module.css              # CREATE
│   ├── CtaSection.tsx                  # CREATE — Section 11
│   ├── CtaSection.module.css           # CREATE
│   ├── Footer.tsx                      # CREATE — Section 12
│   └── Footer.module.css              # CREATE
public/
└── velorah/                            # CREATE — images et placeholders
    ├── screenshots/                    # Placeholders screenshots app
    └── illustrations/                  # Placeholders illustrations aquarelles
```

---

## Task 1: Setup — Layout, fonts, variables CSS Playground

**Files:**
- Modify: `src/app/preview/velorah/layout.tsx`
- Modify: `src/app/preview/velorah/velorah.module.css`

- [ ] **Step 1: Ajouter DM Serif Display via next/font/google dans layout.tsx**

Remplacer les `<link>` Google Fonts par des imports `next/font/google` dans le layout. Le layout utilise ses propres `<html>` donc on peut appliquer les classes font directement :

```tsx
import { DM_Serif_Display, Instrument_Serif, Inter } from 'next/font/google';

const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--pg-font-display' });
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--pg-font-body' });

// Dans le return :
<html lang="fr" className={`${dmSerif.variable} ${instrumentSerif.variable} ${inter.variable}`}>
```

Supprimer les `<link>` Google Fonts du `<head>` existant.

- [ ] **Step 2: Ajouter les variables CSS Playground dans velorah.module.css**

Après le bloc `:root` existant (qui contient les variables dark Velorah), ajouter un scope `.playgroundSection` avec les variables Playground isolées du dark mode :

```css
/* ── Playground Sections (light) ── */

.playgroundSection {
  --pg-bg: #FEF5E4;
  --pg-bg-white: #FFFFFF;
  --pg-text: #052641;
  --pg-text-secondary: #807E7A;
  --pg-text-tertiary: #AAAAAA;
  --pg-accent: #3079FF;
  --pg-orange: #FC5F35;
  --pg-yellow: #FFA211;
  --pg-green: #55AC63;
  --pg-blue: #0081F1;
  --pg-border: #E2DFD8;
  --pg-font-display: 'DM Serif Display', serif;
  --pg-font-body: 'Inter', sans-serif;
}
```

- [ ] **Step 3: Ajouter la transition dark → light**

```css
/* ── Transition Dark → Light ── */

.transition {
  height: 200px;
  background: linear-gradient(
    to bottom,
    hsl(201, 100%, 13%) 0%,
    #FEF5E4 100%
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/preview/velorah/layout.tsx src/app/preview/velorah/velorah.module.css
git commit -m "feat(landing): setup Playground fonts + CSS variables + transition"
```

---

## Task 2: Placeholder assets

**Files:**
- Create: `public/velorah/screenshots/` (10 fichiers placeholder)
- Create: `public/velorah/illustrations/` (8 fichiers placeholder)

- [ ] **Step 1: Créer les dossiers**

```bash
mkdir -p public/velorah/screenshots public/velorah/illustrations
```

- [ ] **Step 2: Générer les placeholders screenshots (SVG inline)**

Pour chaque module, créer un fichier SVG placeholder minimal. Exemple pour `screenshot-dashboard.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="#E2DFD8" rx="12"/>
  <text x="600" y="400" text-anchor="middle" font-family="Inter, sans-serif" font-size="24" fill="#807E7A">Dashboard — Screenshot à venir</text>
</svg>
```

Fichiers à créer :
- `screenshot-dashboard.svg`
- `screenshot-ag.svg`
- `screenshot-ag-votes.svg`
- `screenshot-ag-pv.svg`
- `screenshot-finance-budget.svg`
- `screenshot-finance-appels.svg`
- `screenshot-maintenance.svg`
- `screenshot-documents.svg`
- `screenshot-communication.svg`
- `screenshot-coproprietaires.svg`

- [ ] **Step 3: Générer les placeholders illustrations (SVG inline)**

Même principe, fond crème avec texte descriptif :

Fichiers à créer :
- `illustration-haussmann-left.svg`
- `illustration-garden-right.svg`
- `illustration-support.svg`
- `illustration-small-copro.svg`
- `illustration-medium-copro.svg`
- `illustration-large-copro.svg`
- `illustration-residence.svg`
- `illustration-mixed.svg`

- [ ] **Step 4: Commit**

```bash
git add public/velorah/
git commit -m "feat(landing): add placeholder SVG assets for screenshots and illustrations"
```

---

## Task 3: Section 2 — Logo Carousel

**Files:**
- Create: `src/app/preview/velorah/components/LogoCarousel.tsx`
- Create: `src/app/preview/velorah/components/LogoCarousel.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer LogoCarousel.module.css**

```css
.section {
  background: var(--pg-bg);
  padding: 48px 0;
  overflow: hidden;
}

.title {
  font-family: var(--pg-font-body);
  font-size: 14px;
  font-weight: 500;
  color: var(--pg-text-secondary);
  text-align: center;
  margin-bottom: 32px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.track {
  display: flex;
  gap: 48px;
  animation: scroll 30s linear infinite;
  width: max-content;
}

.logo {
  flex-shrink: 0;
  width: 120px;
  height: 40px;
  background: var(--pg-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--pg-font-body);
  font-size: 12px;
  color: var(--pg-text-tertiary);
}

@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .track {
    animation: none;
  }
}
```

- [ ] **Step 2: Créer LogoCarousel.tsx**

```tsx
'use client';

import styles from './LogoCarousel.module.css';

const LOGOS = Array.from({ length: 8 }, (_, i) => `Partenaire ${i + 1}`);

export function LogoCarousel() {
  return (
    <section className={styles.section}>
      <p className={styles.title}>Rejoint par plus de 500+ copropriétés</p>
      <div className={styles.track}>
        {/* Dupliquer 2x pour loop continu */}
        {[...LOGOS, ...LOGOS].map((name, i) => (
          <div key={i} className={styles.logo}>
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Intégrer dans page.tsx**

Ajouter après le hero existant dans `page.tsx` :

```tsx
import { LogoCarousel } from './components/LogoCarousel';

// Dans le return, après </section> (hero) :
// IMPORTANT : Un seul wrapper .playgroundSection englobe TOUTES les sections light (2 à 12)
// pour que les CSS variables --pg-* soient accessibles partout.
<div className={styles.transition} />
<div className={styles.playgroundSection}>
  <LogoCarousel />
  {/* Les sections suivantes seront ajoutées ici dans les tasks suivants */}
</div>
```

- [ ] **Step 4: Vérifier visuellement dans le navigateur**

Run: `npm run dev` et ouvrir `http://localhost:3000/preview/velorah`
Expected: Hero dark → transition dégradée → fond crème avec logos défilants

- [ ] **Step 5: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add logo carousel section with infinite scroll"
```

---

## Task 4: Section 3 — Découvrez CoProFlex

**Files:**
- Create: `src/app/preview/velorah/components/DiscoverSection.tsx`
- Create: `src/app/preview/velorah/components/DiscoverSection.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer DiscoverSection.module.css**

Styles pour : conteneur section, barre onglets (avec flèches), cadre screenshot, illustrations absolute, lien vidéo. Desktop first avec breakpoints `1024px` et `768px`.

Points clés CSS :
- `.section` : `background: var(--pg-bg)`, `padding: 80px 0`, `position: relative`, `overflow: hidden`
- `.tabs` : `display: flex`, `align-items: center`, `justify-content: center`, `gap: 8px`, `margin-bottom: 48px`
- `.tab` : `padding: 10px 20px`, `border-radius: 24px`, `font-size: 14px`, `cursor: pointer`, `color: var(--pg-text-secondary)`, `background: transparent`, `border: none`
- `.tabActive` : `color: var(--pg-accent)`, `font-weight: 600`
- `.arrowBtn` : `width: 40px`, `height: 40px`, `border-radius: 50%`, `border: 1px solid var(--pg-border)`, `background: white`, `cursor: pointer`
- `.screenshotFrame` : `max-width: 900px`, `margin: 0 auto`, `background: white`, `border-radius: 12px`, `box-shadow: 0 20px 60px rgba(0,0,0,0.1)`, `overflow: hidden`
- `.screenshotImg` : `width: 100%`, `height: auto`, `display: block`
- `.illustrationLeft`, `.illustrationRight` : `position: absolute`, `top: 50%`, `transform: translateY(-50%)`, `width: 280px`, `pointer-events: none`
- `.illustrationLeft` : `left: 0`
- `.illustrationRight` : `right: 0`
- `.videoLink` : centré, `margin-top: 32px`, icône play bleu + texte
- Responsive `<= 768px` : illustrations `display: none`, screenshot pleine largeur

- [ ] **Step 2: Créer DiscoverSection.tsx**

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import styles from './DiscoverSection.module.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', screenshot: '/velorah/screenshots/screenshot-dashboard.svg' },
  { id: 'ag', label: 'AG', screenshot: '/velorah/screenshots/screenshot-ag.svg' },
  { id: 'finance', label: 'Finance', screenshot: '/velorah/screenshots/screenshot-finance-budget.svg' },
  { id: 'maintenance', label: 'Maintenance', screenshot: '/velorah/screenshots/screenshot-maintenance.svg' },
  { id: 'documents', label: 'Documents', screenshot: '/velorah/screenshots/screenshot-documents.svg' },
  { id: 'communication', label: 'Communication', screenshot: '/velorah/screenshots/screenshot-communication.svg' },
];

export function DiscoverSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className={styles.section}>
      {/* Illustrations latérales */}
      <div className={styles.illustrationLeft}>
        <Image
          src="/velorah/illustrations/illustration-haussmann-left.svg"
          alt="Immeuble haussmannien"
          fill
          sizes="280px"
        />
      </div>
      <div className={styles.illustrationRight}>
        <Image
          src="/velorah/illustrations/illustration-garden-right.svg"
          alt="Jardin de copropriété"
          fill
          sizes="280px"
        />
      </div>

      {/* Onglets */}
      <div className={styles.tabs} role="tablist">
        <button
          className={styles.arrowBtn}
          onClick={() => setActiveTab((prev) => (prev - 1 + TABS.length) % TABS.length)}
          aria-label="Onglet précédent"
        >
          <ChevronLeft size={18} />
        </button>

        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${i === activeTab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(i)}
            role="tab"
            aria-selected={i === activeTab}
          >
            {tab.label}
          </button>
        ))}

        <button
          className={styles.arrowBtn}
          onClick={() => setActiveTab((prev) => (prev + 1) % TABS.length)}
          aria-label="Onglet suivant"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Screenshot */}
      <div className={styles.screenshotFrame}>
        <Image
          className={styles.screenshotImg}
          src={TABS[activeTab].screenshot}
          alt={`Module ${TABS[activeTab].label} de CoProFlex`}
          width={1200}
          height={800}
          priority={activeTab === 0}
        />
      </div>

      {/* Video link */}
      <div className={styles.videoLink}>
        <Play size={20} />
        <span>Regarder la visite guidée · 10 min</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Intégrer dans page.tsx**

```tsx
import { DiscoverSection } from './components/DiscoverSection';

// Après <LogoCarousel /> :
<DiscoverSection />
```

- [ ] **Step 4: Vérifier visuellement**

Expected: Onglets cliquables, screenshot change, illustrations de chaque côté, lien vidéo en bas

- [ ] **Step 5: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add Discover section with tabs and screenshot preview"
```

---

## Task 5: Sections 4-5-6 — FeatureGrid (composant réutilisable)

**Files:**
- Create: `src/app/preview/velorah/components/FeatureGrid.tsx`
- Create: `src/app/preview/velorah/components/FeatureGrid.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer FeatureGrid.module.css**

Styles pour le grid bento Playground :
- `.section` : `padding: 80px 24px`, `max-width: 1200px`, `margin: 0 auto`
- `.sectionBgCream` : `background: var(--pg-bg)`
- `.sectionBgWhite` : `background: var(--pg-bg-white)`
- `.header` : `text-align: center`, `margin-bottom: 48px`
- `.label` : `display: inline-flex`, `padding: 4px 12px`, `border-radius: 20px`, `font-size: 12px`, `font-weight: 600`, `color: white`, `background: var(--label-color)`
- `.title` : `font-family: var(--pg-font-display)`, `font-size: 40px`, `color: var(--pg-text)`, `margin-top: 16px`
- `.description` : `font-size: 16px`, `color: var(--pg-text-secondary)`, `max-width: 600px`, `margin: 12px auto 0`
- `.grid` : `display: grid`, `grid-template-columns: 1fr 1fr 1fr`, `gap: 16px`
- `.cardTestimonial` : `grid-column: span 1`, `grid-row: span 2`, `border-radius: 16px`, `padding: 32px`, `color: white`, `display: flex`, `flex-direction: column`, `justify-content: space-between`, `background: var(--testimonial-bg)`
- `.cardLarge` : `grid-column: span 1`, `border-radius: 16px`, `overflow: hidden`, `background: white`, `border: 1px solid var(--pg-border)`
- `.cardSmall` : `border-radius: 16px`, `padding: 24px`, `background: white`, `border: 1px solid var(--pg-border)`
- Responsive `<= 1024px` : `grid-template-columns: 1fr 1fr`, testimonial `span 2`
- Responsive `<= 768px` : `grid-template-columns: 1fr`

- [ ] **Step 2: Créer FeatureGrid.tsx**

```tsx
import type { ComponentType } from 'react';
import styles from './FeatureGrid.module.css';

interface FeatureGridProps {
  label: string;
  labelColor: string;
  title: string;
  description: string;
  background?: 'cream' | 'white';
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
    screenshot?: string;
    icon?: ComponentType<{ size?: number; className?: string }>;
  }>;
}

export function FeatureGrid({
  label,
  labelColor,
  title,
  description,
  background = 'white',
  testimonial,
  cards,
}: FeatureGridProps) {
  const bgClass = background === 'cream' ? styles.sectionBgCream : styles.sectionBgWhite;

  return (
    <section className={`${styles.section} ${bgClass}`}>
      <div className={styles.header}>
        <span
          className={styles.label}
          style={{ '--label-color': labelColor } as React.CSSProperties}
        >
          {label}
        </span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.grid}>
        {/* Testimonial card */}
        <div
          className={styles.cardTestimonial}
          style={{ '--testimonial-bg': testimonial.bgColor } as React.CSSProperties}
        >
          <blockquote className={styles.quote}>
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>
          <div className={styles.author}>
            <strong>{testimonial.author}</strong>
            <span>{testimonial.role}</span>
          </div>
        </div>

        {/* Feature cards */}
        {cards.map((card, i) => {
          if (card.type === 'large') {
            return (
              <div key={i} className={styles.cardLarge}>
                {card.screenshot && (
                  <img
                    className={styles.cardImage}
                    src={card.screenshot}
                    alt={card.title}
                  />
                )}
                <div className={styles.cardBody}>
                  <h3>{card.title}</h3>
                  {card.description && <p>{card.description}</p>}
                </div>
              </div>
            );
          }
          const IconComponent = card.icon;
          return (
            <div key={i} className={styles.cardSmall}>
              {IconComponent && <IconComponent size={24} className={styles.cardIcon} />}
              <h3>{card.title}</h3>
              {card.description && <p>{card.description}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Intégrer les 3 sections dans page.tsx**

Importer `FeatureGrid` et les icônes Lucide. Ajouter dans le wrapper `.playgroundSection` après `<DiscoverSection />` :

```tsx
import { FeatureGrid } from './components/FeatureGrid';
import { Vote, FileText, PiggyBank, Receipt, Wrench, FolderOpen } from 'lucide-react';

{/* Section 4 — AG */}
<FeatureGrid
  label="Assemblées Générales"
  labelColor="#FC5F35"
  title="Des AG aussi simples que vos réunions d'équipe"
  description="Votes temps réel, procès-verbaux automatiques, convocations conformes — tout le processus d'AG digitalisé."
  testimonial={{
    quote: "Depuis CoProFlex, nos AG se déroulent en 1h au lieu de 3. Les votes sont instantanés et le PV est prêt à la signature en fin de séance.",
    author: "Marie Dupont",
    role: "Syndic professionnelle, Nexity",
    bgColor: "#FC5F35",
  }}
  cards={[
    { type: 'large', title: 'Votes temps réel', description: 'Résultats instantanés avec calcul automatique des majorités', screenshot: '/velorah/screenshots/screenshot-ag-votes.svg' },
    { type: 'large', title: 'PV automatique', description: 'Procès-verbal généré et prêt à signer en fin de séance', screenshot: '/velorah/screenshots/screenshot-ag-pv.svg' },
    { type: 'small', title: '14 résolutions auto-générées', icon: Vote },
    { type: 'small', title: 'Votes par correspondance', icon: FileText },
  ]}
/>

{/* Section 5 — Finance */}
<FeatureGrid
  label="Finance"
  labelColor="#55AC63"
  title="La vision financière complète de votre copropriété"
  description="Budgets, appels de fonds, impayés et comptabilité — une vue à 360° de vos finances."
  testimonial={{
    quote: "Le suivi des impayés avec relances automatiques nous a fait gagner 15% de taux de recouvrement en 6 mois.",
    author: "Thomas Bernard",
    role: "Gestionnaire, Foncia",
    bgColor: "#55AC63",
  }}
  cards={[
    { type: 'large', title: 'Budgets prévisionnels', description: 'Prévisionnel, travaux et ALUR en un coup d\'œil', screenshot: '/velorah/screenshots/screenshot-finance-budget.svg' },
    { type: 'large', title: 'Appels de fonds', description: 'Échéanciers automatiques et suivi des paiements', screenshot: '/velorah/screenshots/screenshot-finance-appels.svg' },
    { type: 'small', title: 'Suivi impayés & relances auto', icon: PiggyBank },
    { type: 'small', title: 'Comptabilité : journaux, grand livre, balance', icon: Receipt },
  ]}
/>

{/* Section 6 — Maintenance & Documents */}
<FeatureGrid
  label="Maintenance & Documents"
  labelColor="#0081F1"
  title="Maintenance & Documents sous contrôle"
  description="Carnet d'entretien, ordres de service, GED et contrats — tout centralisé et accessible."
  testimonial={{
    quote: "La GED a transformé notre organisation. Plus aucun document perdu, tout est accessible en 2 clics par les copropriétaires.",
    author: "Sophie Laurent",
    role: "Présidente du conseil syndical",
    bgColor: "#0081F1",
  }}
  cards={[
    { type: 'large', title: 'Carnet d\'entretien', description: 'Suivi des interventions et ordres de service', screenshot: '/velorah/screenshots/screenshot-maintenance.svg' },
    { type: 'large', title: 'Gestion documentaire', description: 'PV, règlements, contrats, diagnostics — tout archivé', screenshot: '/velorah/screenshots/screenshot-documents.svg' },
    { type: 'small', title: 'Contrats & alertes renouvellement', icon: Wrench },
    { type: 'small', title: 'Communication & messagerie', icon: FolderOpen },
  ]}
/>
```

- [ ] **Step 4: Vérifier visuellement les 3 grids**

Expected: 3 sections avec grid bento, couleurs différentes, screenshots placeholder, textes CoProFlex

- [ ] **Step 5: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add FeatureGrid component with AG, Finance, Maintenance sections"
```

---

## Task 6: Section 7 — Interactive Slider

**Files:**
- Create: `src/app/preview/velorah/components/InteractiveSlider.tsx`
- Create: `src/app/preview/velorah/components/InteractiveSlider.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer InteractiveSlider.module.css**

Similar à DiscoverSection mais :
- Fond `var(--pg-bg)`
- Titre centré en `var(--pg-font-display)`, `48px`
- Onglets avec soulignement bleu (pas pills rondes)
- Screenshot plus grand (max-width `1100px`)
- Pas d'illustrations latérales
- Breakpoint `768px` : onglets en scroll horizontal (`overflow-x: auto`, `white-space: nowrap`)

- [ ] **Step 2: Créer InteractiveSlider.tsx**

Même pattern que DiscoverSection : state pour onglet actif, 7 onglets (Dashboard, Finance, AG, Maintenance, Documents, Communication, Copropriétaires), grand screenshot, flèches navigation, accessibilité `role="tablist"`.

- [ ] **Step 3: Intégrer dans page.tsx après les FeatureGrids**

- [ ] **Step 4: Vérifier visuellement**

- [ ] **Step 5: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add interactive slider section with tab navigation"
```

---

## Task 7: Section 8 — Testimonials

**Files:**
- Create: `src/app/preview/velorah/components/Testimonials.tsx`
- Create: `src/app/preview/velorah/components/Testimonials.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer Testimonials.module.css**

Layout split :
- `.section` : `background: var(--pg-bg-white)`, `padding: 80px 24px`
- `.container` : `display: grid`, `grid-template-columns: 1fr 1fr`, `gap: 48px`, `max-width: 1200px`, `margin: 0 auto`
- `.videoPlaceholder` : `background: var(--pg-border)`, `border-radius: 16px`, `aspect-ratio: 16/9`, `display: flex`, `align-items: center`, `justify-content: center`
- `.playButton` : cercle bleu `var(--pg-accent)` avec icône play blanc
- `.quote` : `font-family: var(--pg-font-display)`, `font-size: 28px`, `color: var(--pg-text)`
- `.authors` : liste horizontale, auteur actif mis en avant
- Animation fade sur les citations, `aria-live="polite"`, pause au hover
- Responsive `<= 768px` : 1 colonne

- [ ] **Step 2: Créer Testimonials.tsx**

4 témoignages mockés (syndic, gestionnaire, copropriétaire, président CS). Auto-rotation toutes les 5s avec pause au hover. `prefers-reduced-motion` désactive l'auto-rotation.

- [ ] **Step 3: Intégrer dans page.tsx**

- [ ] **Step 4: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add testimonials section with rotating quotes"
```

---

## Task 8: Section 9 — Sizes

**Files:**
- Create: `src/app/preview/velorah/components/Sizes.tsx`
- Create: `src/app/preview/velorah/components/Sizes.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer Sizes.module.css**

- `.section` : fond `var(--pg-bg)`, padding `80px 24px`
- `.header` : `display: flex`, `justify-content: space-between`, titre à gauche, description + bouton à droite
- `.cards` : `display: grid`, `grid-template-columns: repeat(6, 1fr)`, `gap: 16px`
- `.card` : `background: white`, `border-radius: 16px`, `border: 1px solid var(--pg-border)`, `text-align: center`, `padding: 24px 16px`
- `.cardImage` : `width: 100%`, `height: 140px`, `object-fit: contain`
- Responsive `<= 1024px` : 3 colonnes, `<= 768px` : 2 colonnes

- [ ] **Step 2: Créer Sizes.tsx**

6 cards avec données mockées (Petite < 20 lots, Moyenne 20-50, Grande 50-200, Résidence, ASL/AFUL, Mixte). Images placeholder illustrations.

- [ ] **Step 3: Intégrer dans page.tsx**

- [ ] **Step 4: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add sizes section with copropriété type cards"
```

---

## Task 9: Section 10 — Support

**Files:**
- Create: `src/app/preview/velorah/components/Support.tsx`
- Create: `src/app/preview/velorah/components/Support.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer Support.module.css**

Deux blocs empilés :
- **Bloc A** : fond blanc, grid 2 colonnes (illustration gauche, contenu droite), 3 sous-colonnes features
- **Bloc B** : fond `var(--pg-bg)`, illustration + stats
- Bouton "Parler à un expert" : `background: var(--pg-accent)`, `color: white`, `border-radius: 8px`

- [ ] **Step 2: Créer Support.tsx**

Données mockées pour les 3 colonnes (Onboarding, Support, Évolution) et les stats.

- [ ] **Step 3: Intégrer dans page.tsx**

- [ ] **Step 4: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add support section with features grid and stats"
```

---

## Task 10: Section 11 — CTA Final

**Files:**
- Create: `src/app/preview/velorah/components/CtaSection.tsx`
- Create: `src/app/preview/velorah/components/CtaSection.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer CtaSection.module.css**

- `.section` : fond `#052641`
- `.wrapper` : fond clair, `border-radius: 16px`, centré, padding `64px`
- `.ctaButton` : `background: var(--pg-accent)`, `color: white`, `padding: 16px 48px`, `border-radius: 8px`, `font-size: 18px`, `font-weight: 600`
- `.features` : grid 4 colonnes pour les cards (Sans engagement, Onboarding, Sécurité, Support)

- [ ] **Step 2: Créer CtaSection.tsx**

Avec les 4 cards features utilisant les icônes Lucide : `Unlock`, `GraduationCap`, `ShieldCheck`, `Headphones`.

**Vérification icônes** : Avant d'implémenter, confirmer que `GraduationCap` existe dans lucide-react 0.555. Vérifier avec : `grep -r "GraduationCap" node_modules/lucide-react/dist/esm/icons/`. Si absent, utiliser `BookOpen` en fallback.

- [ ] **Step 3: Intégrer dans page.tsx**

- [ ] **Step 4: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add CTA section with demo button and feature cards"
```

---

## Task 11: Section 12 — Footer

**Files:**
- Create: `src/app/preview/velorah/components/Footer.tsx`
- Create: `src/app/preview/velorah/components/Footer.module.css`
- Modify: `src/app/preview/velorah/page.tsx`

- [ ] **Step 1: Créer Footer.module.css**

- `.footer` : fond `#052641`, `padding: 64px 24px 32px`, `color: white`
- `.grid` : 4 colonnes de liens (Produit, Ressources, Entreprise, Légal)
- `.logo` : `font-family: var(--pg-font-display)`, `font-size: 28px`
- `.links` : `list-style: none`, liens en `rgba(255,255,255,0.6)`, hover `white`
- `.bottom` : `border-top: 1px solid rgba(255,255,255,0.1)`, réseaux sociaux + copyright
- Responsive `<= 768px` : 2 colonnes puis 1 colonne

- [ ] **Step 2: Créer Footer.tsx**

Toutes les données de liens hardcodées. Icônes réseaux sociaux en SVG inline ou Lucide.

- [ ] **Step 3: Intégrer dans page.tsx**

- [ ] **Step 4: Commit**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): add footer with links grid and social icons"
```

---

## Task 12: Assemblage final + polish

**Files:**
- Modify: `src/app/preview/velorah/page.tsx`
- Modify: `src/app/preview/velorah/velorah.module.css`

- [ ] **Step 1: Vérifier l'assemblage complet de page.tsx**

S'assurer que toutes les sections sont importées et ordonnées correctement. Structure finale de `page.tsx` :

```tsx
<div className={styles.page}>
  {/* Video + Nav + Hero (existant, dark) */}
  <video ... />
  <nav ... />
  <section className={styles.hero}> ... </section>

  {/* Transition dark → light */}
  <div className={styles.transition} />

  {/* TOUTES les sections light dans UN SEUL wrapper .playgroundSection
      pour que les CSS variables --pg-* soient accessibles partout */}
  <div className={styles.playgroundSection}>
    <LogoCarousel />           {/* Section 2 */}
    <DiscoverSection />        {/* Section 3 */}
    <FeatureGrid ... />        {/* Section 4 — AG */}
    <FeatureGrid ... />        {/* Section 5 — Finance */}
    <FeatureGrid ... />        {/* Section 6 — Maintenance */}
    <InteractiveSlider />      {/* Section 7 */}
    <Testimonials />           {/* Section 8 */}
    <Sizes />                  {/* Section 9 */}
    <Support />                {/* Section 10 */}
    <CtaSection />             {/* Section 11 */}
    <Footer />                 {/* Section 12 */}
  </div>
</div>
```

**Note** : Tous les composants utilisent `next/image` (import Image from 'next/image') au lieu de `<img>` pour les illustrations et screenshots.

- [ ] **Step 2: Vérifier le scroll complet desktop**

Ouvrir `http://localhost:3000/preview/velorah` et scroller de haut en bas. Vérifier les transitions entre sections, les espaces, la cohérence visuelle.

- [ ] **Step 3: Vérifier responsive tablette (1024px) et mobile (768px)**

DevTools → Responsive mode. Vérifier que les grids passent en 1 colonne, les illustrations disparaissent sur mobile, les onglets scrollent horizontalement.

- [ ] **Step 4: Commit final**

```bash
git add src/app/preview/velorah/
git commit -m "feat(landing): complete Playground-style landing page assembly and polish"
```

---

## Récapitulatif des commits

| Task | Commit | Sections |
|------|--------|----------|
| 1 | Setup fonts + variables + transition | Infrastructure |
| 2 | Placeholder assets | Assets |
| 3 | Logo Carousel | Section 2 |
| 4 | Discover Section | Section 3 |
| 5 | FeatureGrid × 3 | Sections 4-5-6 |
| 6 | Interactive Slider | Section 7 |
| 7 | Testimonials | Section 8 |
| 8 | Sizes | Section 9 |
| 9 | Support | Section 10 |
| 10 | CTA Section | Section 11 |
| 11 | Footer | Section 12 |
| 12 | Assemblage + polish | Final |
