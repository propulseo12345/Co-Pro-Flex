# CoProFlex — v2 (TanStack Start)

Reconstruction **from-scratch** du front de CoProFlex sur **TanStack Start** (stable v1).
Le backend **Supabase est partagé** avec l'app actuelle (`../src`, Next.js, gelée) — même base, mêmes RPC. L'ancienne app vit jusqu'au go-live, puis on bascule sur `v2/`.

## Principes (décisions du grilling 2026-06-22)

1. **Moteur identique** (Supabase) = parité au niveau base ; **UI redessinée** (manager-first).
2. **« Feature finie » = écran neuf + test e2e de parité** (clic réel → `audit_finance_integrity = 0` en base).
3. Construction **par ordre de dépendance de données** ; organisation **par catégorie**.
4. **Un seul chemin par feature** (pas de doublons EN/FR).
5. **AG : le moteur SQL est le seul juge du vote** ; l'écran n'affiche que ce qu'il renvoie.

## Stack

- **TanStack Start 1.168.26** + Router 1.170.16 (versions épinglées exactes — famille `@tanstack/*`).
- React 19, Vite 8, TypeScript (strict, jamais `any`).
- **CSS Modules** uniquement (aucun Tailwind). Tokens dans `src/styles/globals.css`.
- Supabase (`@supabase/ssr` + `supabase-js`), React Hook Form + Zod, `@tanstack/react-query` (couche data).
- Polices : `@fontsource-variable` (Inter / Manrope), `@fontsource/fira-code` (montants).

## Démarrage

```bash
npm install
cp .env.local.example .env.local   # puis remplir les clés Supabase
npm run dev                          # http://localhost:3001
```

## Structure

- `src/routes/` — routage par fichiers (TanStack). `_app/` = espace gestionnaire (layout protégé).
- `src/shared/` — **le châssis** : `supabase/`, `auth/`, `providers/`, `ui/` (biblio neuve), `hooks/`, `lib/` (validation, format, mappers, pdf).
- `src/features/<catégorie>/` — le métier, par catégorie (chaque feature = `components/` `hooks/` `api/`).

## Espaces (3 rôles, sécurité prévue dès le départ)

1. **Gestionnaire** (`routes/_app/`) — en cours, **livré et validé en premier**.
2. **Copropriétaire** (`routes/_portail/`) — après le gestionnaire, avant le go-live.
3. **Conseil syndical** (`routes/_conseil/`) — extension du portail copro.

## Contexte & plan

Voir `../.planning/REFONTE_*_2026-06-22.md` (cartographie, chaînes, vérifications) et `REFONTE_QUESTIONS_DEMAIN.md` (batterie de décisions).
