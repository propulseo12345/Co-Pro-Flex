# Session State — 2026-03-16 23:30

## Branch
v2

## Completed This Session
- Recherche web bonnes pratiques Claude Code (repos, hooks, skills, context mgmt)
- Règle "confirmation avant action" ajoutée dans CLAUDE.md + feedback memory
- Split CLAUDE.md (470→75 lignes) + 3 fichiers @import (conventions, business-rules, modules)
- Hooks: PreToolUse block-dangerous.sh + PostToolUse eslint --fix auto
- 3 slash commands: /project:review, /project:fix-types, /project:check-build

## Next Task
Tests E2E: créer budget travaux avec échéancier + vérifier modale détail + marquer phase payée. Ou traiter les problèmes sécu identifiés (isManager||true, XSS, open redirect).

## Blockers
None

## Key Context
- Prettier non installé, hooks utilisent ESLint uniquement
- Routes dupliquées factures/invoices et mouvements-bancaires/bank-movements toujours présentes
