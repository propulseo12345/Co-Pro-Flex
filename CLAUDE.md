# CLAUDE.md - CoProFlex

Plateforme SaaS de gestion de copropriété (marché français).
Frontend Next.js 16 + React 19 + TypeScript 5 + CSS Modules. Backend Supabase (prévu).

> ⚙️ **Refonte v2 en cours** dans `v2-tanstack/` (TanStack Start, from-scratch). Le `v2-tanstack/` est la cible ; l'ancien front Next reste **gelé en référence**. Décisions : `.planning/REFONTE_DECISIONS_2026-06-23.md`.

---

## ⭐ RÈGLES v2 (refonte from-scratch) — PRIORITÉ

Rappelées aussi automatiquement à chaque message (hook `UserPromptSubmit` → `.claude/hooks/rules-v2.md`). **Méthode complète = skill `methodo-coproflex`.**

1. **From-scratch** : on ne **reproduit pas** l'ancien ; jamais « supprimer le code v1 » (il meurt gelé). **Corriger > copier.**
2. **Grand livre = source unique** des chiffres ; solutionner la **cause**, **jamais maquiller** (ni « skip »/truquer un test).
3. **Français vulgarisé** : le pourquoi avant le comment, métaphores du quotidien.
4. **Stack réelle v2** : CSS Modules (**jamais Tailwind**) ; react-query + server functions → **RPC SQL** ; edge = cron/webhooks only.
5. **Confirmer avant gros changement** ; petites modifs évidentes = agir.
6. **DoD stricte** (toute feature) : tsc 0 · unit · **e2e Playwright qui PROUVE en base** · **non-régression** · lint · `/simplify` · **code review multi-agents** · vérif navigateur · PR + push. *(+ base : revue cascade + BEGIN/ROLLBACK + Advisor 0 ; + finance : audit = 0 + équilibre GL + golden inchangé.)*

**Maintenance** : décision de **méthode** → mettre à jour le skill `methodo-coproflex` + `rules-v2.md` ; décision **produit** → `REFONTE_DECISIONS`.

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

## EXPLICATION EN FRANÇAIS SIMPLE (OBLIGATOIRE)

Toute explication technique DOIT être formulée en français accessible, comme si on parlait à quelqu'un qui ne code pas. Concrètement :
- **Éviter le jargon** ou le traduire immédiatement (ex: « une migration = un script qui modifie la structure de la base de données »)
- **Expliquer le pourquoi** avant le comment : quel problème on résout, quel risque si on ne le fait pas
- **Utiliser des analogies** quand c'est possible (ex: « JSONB c'est comme un tiroir fourre-tout vs une armoire avec des tiroirs étiquetés »)
- Les blocs de code restent techniques, mais le texte autour doit être compréhensible par tous

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

## REVUE DE CODE À CHAQUE GROS CHANTIER (OBLIGATOIRE)

Tout **gros chantier** (feature large, migration à enjeu — surtout finance / grand livre —, refonte, changement structurant multi-fichiers) DOIT passer une **code review avant clôture / merge** :
1. Lancer `/code-review` (ou une **revue adversariale multi-agents** sur le diff de la branche) une fois le code écrit et le type-check / les tests verts.
2. Trier les retours : **vrai bug / faux positif / différé** ; corriger les vrais avant de merger.
3. Ne **jamais** annoncer « terminé » tant que la revue n'est pas passée et les vrais retours traités.

Une petite modif isolée (typo, rename local, fix évident) en est exemptée.

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

@CONTEXT.md
@docs/claude/glossaire-technique.md
@docs/claude/conventions.md
@docs/claude/business-rules.md
@docs/claude/modules.md
@docs/claude/design-system.md
