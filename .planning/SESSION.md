# Session State — 2026-04-04 01:05

## Branch
v2

## Completed This Session
- Toggle dark/light demos LP: context React + variables CSS dans demo-shared.module.css, 8 composants demo migrés
- Preview da-preview.html: toggle dark/light ajouté avec palette light
- Illustrations hero: tailles en vw (responsive zoom), agrandies 3x +10%, décalée gauche -30px
- Demo frame: réduit de 10% (810x468)
- Textes LP: tirets longs supprimés, "personnes réelles" → "professionnels"
- Logo: agrandi 2x +20% (101px)
- Hero content: monté de 30px, demo descendue de 30px

## Next Task
Commit + push + deploy Vercel des ajustements LP (tailles images, textes, logo, spacing)

## Blockers
None

## Key Context
- DemoThemeProvider enveloppe DiscoverSection + 3 FeatureGrid dans page.tsx, light mode par défaut
- Les illustrations utilisent vw + max-width + aspect-ratio pour stabilité au zoom
- FeatureGrid est resté Server Component, DemoThemeToggle/Wrapper sont des Client Components séparés
