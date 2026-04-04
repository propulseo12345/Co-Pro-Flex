# Session State — 2026-04-04 15:30

## Branch
v2

## Completed This Session
- Route group (marketing): layout partagé, LpNav avec menu mobile, Footer avec vrais liens
- Composants partagés: PageHero, CtaBanner, SectionHeader
- Migration homepage vers (marketing)/page.tsx, suppression ancien page.tsx
- 18 pages marketing créées: fonctionnalités (hub + 6 détails), tarifs, contact, à propos, FAQ, sécurité, comment ça marche, comparaison, blog (index + [slug]), mentions légales, CGU, confidentialité
- SEO: sitemap.ts, robots.ts, JSON-LD FAQPage
- Code review + fix 9 issues: metadata Server Components, inline styles → CSS vars, accents français, liens morts, accessibilité formulaire

## Next Task
Nice-to-have restants: extraire FaqAccordion partagé (dupliqué 3x), factoriser formatDate blog, normaliser breakpoints responsive, supprimer font Instrument Serif inutile

## Blockers
None

## Key Context
- Build Turbopack crashe (bug interne), utiliser NEXT_TURBOPACK=0 pour build webpack
- Les données FAQ sont dans faq/data.ts (séparé du client component pour permettre l'import serveur)
- Contenu complet rédigé dans docs/content/marketing-content.md
