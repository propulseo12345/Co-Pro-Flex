# Session State — 2026-06-26 (repo v2 dédié : infra migrée, purge à venir)

## Branch / Commit
- **ANCIEN repo** (v1 gelé + cadrage) : `refonte-v2-cadrage` @ `4501b05` (dirty : `.planning/CHANTIERS.md`, `SUPERSEDES.md`, `AUDIT_CONTRADICTIONS_2026-06-26.md`, `business-rules.md`, `SESSION.md` modifiés/créés — **non commités**)
- **NOUVEAU repo v2** : `Desktop/Code/coproflex-v2` → `propulsFlex/Coproflex`, `main` @ `8b46139` (**pushed**, propre)

## Completed This Session
- Mémoire migrée (104 fiches) vers la clé du nouveau chemin projet.
- **Audit cohérence exhaustif** (2 vagues, ~310 agents) → `.planning/AUDIT_CONTRADICTIONS_2026-06-26.md` : **107 findings** (🔴18 🟠54 🟡28 ⚪7), À RATIFIER.
- **Décision : repo v2 dédié** (supersède « même repo », [[migration_tanstack_start]]). **Phases 1-2 FAITES** : `v2-tanstack/`→repo indépendant, `typecheck`+`vite build` verts, poussé GitHub (HTTPS, compte `propulsFlex`). `.env.local` gitignoré (prouvé).

## Next Task
- **Phase 3** : créer `coproflex-v2/docs/` = base canonique v2 (« lis seulement ici ») en y faisant ATTERRIR la purge des 107 findings (decisions ledger + schéma cible db-cible nettoyé + glossaires nettoyés + design-system + plan golden, corrigés EN ENTRANT). Puis **Phase 4** (`CLAUDE.md` v2 + hook `rules-v2` + re-clé mémoire vers `coproflex-v2` + corriger les 4-5 mémoires empoisonnées), **Phase 5** (pointeur ancien repo = v1 gelé).
- Effort conseillé : **`Max`** (curation/correction en dialogue ; ponctuellement 1 sous-agent par thème).

## Blockers
- None. (gh CLI absent → push via git HTTPS + GCM, URL `https://propulsFlex@github.com/propulsFlex/Coproflex.git` ; auteur commits = Lyes Triki/propulseo.)

## Key Context
- 107 findings ≈ **12 thèmes** : RLS-off auto-chargé · super-admin=rôle (vs table) · pv_* UPDATE front · « patch live » périmé · Resend→Brevo · finance via Edge · réalisé hors GL · plan comptable inventé · statuts/enum · impayés=statut · stack Next.js · reprise données live. À challenger : ANOM-008/023/028/030.
- Traitement PAR TYPE : docs vivants→corriger sur place ; specs v1 pré-refonte→bannière SUPERSEDED (pas de réécriture) ; snapshots→registre.
- Backend Supabase cloud `qqfqrcolzmcbsvfaumiq` **inchangé**. Base neuve = baseline 0001 fraîche (Palier 0, APRÈS la purge).
- ⚠️ Mémoires à re-clé vers `c--Users-lyest-Desktop-Code-coproflex-v2` quand Lyes ouvrira Claude depuis le nouveau repo (Phase 4).
