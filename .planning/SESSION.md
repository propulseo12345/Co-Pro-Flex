# Session State — 2026-06-29 (terrain 0001 assaini : garde-fou anti-copie + registre d'inclusion tranché)

## Branch / Commit
- **Co-Pro-Flex** (docs) : `refonte-v2-cadrage` @ `41b47ef` — **dirty** (6 fichiers : CHANTIERS, REFONTE_DECISIONS, 4 extraits qqfq bannerisés). `env.vitrine.example` non suivi (hors scope).
- **coproflex-v2** (code) : `socle-connaissance-v2` @ `2337401` — **dirty** (PLAN_PILOTE_FINANCE additif + REGISTRE_INCLUSION_0001.md neuf).

## Completed This Session
- **Garde-fou anti-rechute « copier les migrations »** (cause du pb session précédente) : plan pilote retourné en **ADDITIF** (fini « squash du live ») + bannières **voie 1/voie 2** sur `qqfq-extract/`.
- **Registre d'inclusion 0001** généré (workflow ultracode `wwidv6rkf`, 19 agents : classer → avocat du diable → clôture → synthèse) = **403 retenus / 229 exclus**, écrit dans `coproflex-v2/.planning/`. **3 blockers + flags factuels résolus** par lecture des corps de RPC qqfq.
- **4 décisions métier tranchées** (avoir fournisseur INCLUS · budget complémentaire = **version** · état daté **différé** prio n°1 ventes · `payment_method` 4 valeurs) + plomberie. Consigné `REFONTE_DECISIONS` (bloc « BL — Résolution registre 0001 ») + `CHANTIERS`.

## Next Task
- **Committer + push** (2 commits séparés : docs Co-Pro-Flex / code coproflex-v2) si Lyes valide.
- PUIS **écrire le plan de migration `0001-0004`** depuis le registre tranché → revue cascade → BEGIN/ROLLBACK → revue Lyes → apply `oio`.
- Effort conseillé : `Max` (rédaction plan) ; `ultracode` ponctuel pour la revue cascade adversariale avant apply.

## Blockers
- None (registre tranché, décisions prises).

## Key Context
- **Source d'écriture de 0001** = `coproflex-v2/.planning/REGISTRE_INCLUSION_0001.md` (section « Décisions tranchées 2026-06-29 » en tête, PRIME sur le reste).
- `oio` = base neuve cible (vide) · `qqfq` = live gelé (lecture OK **boucle principale only** ; sous-agents bloqués par le garde-fou MCP).
- Flags mineurs encore ouverts (non bloquants) : séquences de pièces · `garage`↔`parking` (lot_type) · déf. exacte `v_call_lines_by_lot_gl` (Palier 1.1).
