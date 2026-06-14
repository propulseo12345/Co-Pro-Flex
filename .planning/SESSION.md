# Session State — 2026-06-14 — E4-cœur livré + bascule cloud live + tokenade retiré

## Branch / Commit
`e4-operation-id-ledger` @ `3423585` (E4 `bee14b4` + login 1-clic + playwright local). Pas encore poussé.

## Completed This Session
- **E4-cœur** (migration 0060) : `operation_id` niveau ligne (FK budgets RESTRICT) + précédence `operation_id⇒travaux` (open_next_period, v_result_allocation_split) + garde multi-clés (settle_works_balance). Gate `gate_e4_operation_id_e2e` + db-test.mjs. Revue adversariale OK, **test cloud rollback vert**.
- **Bascule CLOUD LIVE** : nouveau projet `qqfqrcolzmcbsvfaumiq` (59 migrations poussées, RLS ON+FORCE, base vierge), `.env.local` → cloud-only. Local abandonné (RAM).
- **Compte démo 1-clic** `lyes.triki@coproflex.fr`/`password123` (bouton login).
- **tokenade retiré** (hook + MCP + CLAUDE.md global) → redémarrage Claude Code requis.

## Next Task
- **Pousser la branche `e4-operation-id-ledger` + ouvrir la PR** (compte `lyestriki-29`, CI db:test) — push direct main bloqué.
- Puis **E4 câblage écrivains** : facture/appel travaux qui RENSEIGNENT operation_id (param front→edge→RPC ; supplier_invoice_lines sans budget_line_id → saisie explicite de l'opération, décision UX à cadrer).
- 👉 Effort conseillé : **Max** (cadrage UX + câblage séquentiel) ; `ultracode` ponctuel pour revue si on touche au GL.

## Blockers
- Push GitHub : nécessite `lyestriki-29` (autres = 403). Supabase local KO (RAM 16 Go) → tests via cloud rollback (cf. mémoire).

## Key Context
- Cloud live ref `qqfqrcolzmcbsvfaumiq` ; token+db_password dans `.env.local` (gitignoré). Backup `.env.local.bak-local`.
- ⚠️ Retirer le compte démo `password123` avant vrais clients. NE PAS pousser de migration au fil de l'eau sur le live (drift → PR/CI/déploiement délibéré).
- Junk à la racine du repo (fichiers `?? ...`) + .planning non gitignoré : ne JAMAIS `git add .`.
