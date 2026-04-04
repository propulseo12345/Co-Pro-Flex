# Session State — 2026-04-04 17:00

## Branch
v2

## Completed This Session
- FaqAccordion: composant partagé flat/card, migré 3 pages, supprimé styles dupliqués
- formatDate blog: remplacé par formatDateLongFR existant dans @/lib/dates
- Instrument Serif: CSS corrigé pour utiliser var(--font-display) au lieu du nom hardcodé
- Breakpoints: normalisés 640/700/800 → 600px (3 fichiers), 900px tarifs conservé

## Next Task
Nice-to-have terminés. Prochaine étape : intégration Supabase ou nouvelles features selon priorités

## Blockers
None

## Key Context
- Build Turbopack crashe, utiliser NEXT_TURBOPACK=0 pour build webpack
- FaqAccordion supporte variant="flat" (défaut) et variant="card" (style contact)
