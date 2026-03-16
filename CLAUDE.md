# CLAUDE.md - CoProFlex

Plateforme SaaS de gestion de copropriété (marché français).
Frontend Next.js 16 + React 19 + TypeScript 5 + CSS Modules. Backend Supabase (prévu).

---

## SUIVI CONTEXTE

```bash
.planning/context-bar.sh <tokens_estimes>
```
- **SAVE SOON** (70%) → préparer la clôture
- **SAVE NOW** (90%) → exécuter `/token-saver fin` immédiatement

---

## CONFIRMATION AVANT ACTION (OBLIGATOIRE)

Avant TOUTE action (édition, commande bash, création, suppression), Claude DOIT :
1. **Décrire ce qu'il compte faire** en 1-3 lignes (quel fichier, quelle modification, pourquoi)
2. **Attendre la validation explicite** de l'utilisateur

Seules les lectures (Read, Grep, Glob) sont exemptées.

---

## FORMAT DE RETOUR (OBLIGATOIRE)

À chaque fix ou modification :

### Problème constaté
Description claire du bug ou comportement inattendu.

### Solution apportée
- Fichier(s) modifié(s) avec chemin
- Ce qui a été changé et pourquoi
- Impact / comportement attendu après fix

---

## STACK

| Tech | Version | Usage |
|------|---------|-------|
| Next.js | 16 | App Router |
| React | 19 | UI |
| TypeScript | 5 | Typage |
| CSS Modules | - | Styles scopés |
| Lucide React | 0.555 | Icônes |
| jsPDF | 3.0 | PDF |
| clsx | 2.1 | Classes conditionnelles |

Prévu : Supabase, React Hook Form, Zod

---

## STRUCTURE

```
src/
├── app/(dashboard)/       # Routes protégées (dashboard, ag, finance, maintenance, documents, communication, coproprietaires, ventes-impayes, settings)
├── components/
│   ├── ui/                # Composants atomiques (SignatureCanvas, DocumentViewerModal, ThemeToggle)
│   ├── layout/            # Header, Sidebar, PageWrapper
│   └── features/          # Composants métier (ag/, finance/, maintenance/, ventes/)
├── hooks/modules/         # useBudget, useLogbook, useAppelsFonds, useContracts, useVenteDetail
├── lib/                   # utils/, constants/, config/, pdf/
├── types/                 # enums/, models/, common.ts
├── services/              # mock/, api/ (prévu Supabase)
├── data/mock/             # Données mockées
└── providers/             # ThemeProvider
```

---

## DÉTAILS (imports automatiques)

@docs/claude/conventions.md
@docs/claude/business-rules.md
@docs/claude/modules.md
