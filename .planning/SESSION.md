# Session State — 2026-06-25 (fin de cadrage : socle C.17 + EXP-7)

## Branch / Commit
`refonte-v2-cadrage` @ `5cc06de` (dirty : 2 fichiers — HYGIENE_REPO, ce SESSION.md)

## Completed This Session
- **S0 (faille RLS live)** vérifié empiriquement (MCP, lecture seule) = **FAUSSE ALERTE** : 87 tables RLS ON, 0 anon-exploitable, déjà bouché par 0085/0086 → **clos** ; mémoire `coproflex-cloud-live` corrigée (FORCE = 5/87 cœur finance, pas « ON+FORCE partout ») ; durcissement (FORCE généralisé + 170 advisors) = chantier séparé non urgent.
- **Socle C.17 COMPLET** tranché + consigné (REFONTE_DECISIONS, salve « Socle C.17 ») : **C17-1** (machine à états AG `set_ag_status` + verrou + signature/PV rectificatif), **C17-2** (audit des annulations, colonnes typées), **C17-3** (idempotence, empreinte naturelle), **C17-4** (horloge métier, date explicite+NOT NULL, 7 colonnes), **C17-7** (webhooks, porte unique en base).
- **EXP-7** tranché : **GL = source unique des montants** (réalisé + impayés), séquencé **réalisé d'abord → impayés après la vue d'ancienneté G24-T5**.
- 2 commits `docs(cadrage)` : `7748156` (pack + audits), `5cc06de` (décisions).

## Next Task
- Reprendre le grilling : **C17-6** (cohérence machines à états SQL), puis C17-8, C17-5, EXP-4… (ordre conseillé du pack, ligne 28 de `PRE_GRILLING_PACK_2026-06-25.md`).
- Effort conseillé : **`Max`** (dialogue de cadrage séquentiel).

## Blockers
- None.

## Key Context
- Décisions → `REFONTE_DECISIONS_2026-06-23.md` (salves « Socle C.17 » + « Arbitrages expert ») ; registre → `CHANTIERS.md`.
- **C17-6 — faits live DÉJÀ vérifiés** (gain de temps) : `mutation_status` a MAINTENANT `sent_to_notary` (migration 0079 → le dossier pré-grillé qui dit « 6 valeurs » est **périmé**, 7 en réalité) ; `logbook_status` encore en **FR** (planifiee/en_cours/terminee = incohérence) ; `update_service_order_status` + `is_valid_service_order_transition` **EXISTENT** (l'OS a déjà sa RPC de transition gardée) ; mutation/période = **pas** de RPC de transition.
- MCP Supabase épinglé sur le live `qqfqrcolzmcbsvfaumiq` (lecture seule pour les vérifs ; `v_lot_vs_gl_mismatch` = 0 ligne aujourd'hui).
- 6 arbitrages strictement USER restants : créances↔GL (partiellt via EXP-7), mandat V1, annexe 1, période état daté, minimum ALUR, multi-rôle.
