# Session State — 2026-06-12 ~15:30 (lot 1 livré + mergé, lot 2 découverte faite)

## Branch / Commit
`j2bis-lot2-ag-annexes` @ `a5f06fd` (= origin/main post-PR #13, clean hors parasites 0-octet)

## Completed This Session
- **Lot 1 J2-bis LIVRÉ + MERGÉ (PR #13)** : 0049 (4 vues écrans principaux + rename unpaid_lots_count + statuts AG alignés) + gate 14/14 ; spinners silencieux réparés (cause racine) ; purge mock impayés ; VentesProvider descendu ; badge facture OS. Preuves : tsc 0, gates 14/14, vitest 97/97.
- **CI réparée** : CLI Supabase épinglée 2.105.0 (`latest` cassait main depuis le 11/06 sur TOUTES les branches).
- **Codex acté HS** : règle inversée dans CLAUDE.md global (Claude exécute par défaut, Codex = second avis CLI direct seulement).
- Lot 2 : découverte COMPLÈTE → périmètre réel 6 vues + 2 RPC + 1 table + 1 ALTER (8 RPC mortes à ne pas créer).

## Next Task
- **Écrire migration 0050 + gate_0050_ag_annexes** selon `.planning/PROGRESS_j2bis-lot2-ag-annexes.md` (TOUT le design y est : contrats, sources, pièges). Puis db:test, tsc, vitest, commits, PR.
- Effort : `Max` pour l'écriture ; **`ultracode` à proposer pour la revue adversariale de fin de lot, AVANT merge**.

## Blockers
- None. (Push : `gh auth switch -u lyestriki-29` juste avant chaque push — le compte actif retombe seul sur Propulseo.)

## Key Context
- vitest : lancer depuis `C:\Users\...` (C MAJUSCULE) sinon double chargement vitest → échec bidon (10 fichiers "reading 'config'").
- Base docker locale déjà à jour 0049 ; `npm run dev -- -p 3010` (port 3000 = TropPayé).
- Parasites 0-octet racine : `git clean -f` à faire par Lyes.
