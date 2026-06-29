# Session State — 2026-06-29 (R1 0004/0005 écrites + COMPILE-TEST VERT → prochaine étape = APPLY oio)

## Branch / Commit
- **Co-Pro-Flex** (docs) : `refonte-v2-cadrage` @ `47bdd1c` (dirty : SESSION/PROGRESS/REFONTE/CHANTIERS modifiés ; untracked `env.vitrine.example`).
- **coproflex-v2** (code) : `socle-connaissance-v2` @ `6eab1ad`. **RIEN commité, RIEN appliqué en base.** Untracked/modifié : migrations `0004`/`0005`, `.planning/rpc-qqfq/`, `scripts/db/`, `.env.local` (gitignoré).

## Completed This Session
- Workflow ultracode → **`0004` (6 fn) + `0005` (5 fn)** écrites ; audit cascade adversarial (8 dim) + tri Lyes → **4 corrections** (doublons get_period/get_open retirés de 0004 ; garde `p_nature_filter` ; fail-loud auto_post ; Hugo = imputation ciblée à câbler dans Gate 1).
- **COMPILE-TEST BEGIN/ROLLBACK VERT sur `oio`** : `0001→0005` s'appliquent proprement (**functions=30 tables=26 triggers=33 policies=0**), ROLLBACK → oio reste **0/0**. Voie = **connexion directe Postgres** (le MCP ne peut PAS pousser ~100 Ko inline).
- **Outillage durable prêt** : `coproflex-v2/scripts/db/runner.mjs` (dry défaut / `--apply` = COMMIT) ; `pg` installé (node_modules gitignoré) ; `OIO_DB_URL` dans `.env.local` ; CA Supabase `.planning/rpc-qqfq/supabase-ca.crt`.

## Next Task (SESSION NEUVE)
- **APPLIQUER `0001→0005` sur oio** après feu vert Lyes : `node coproflex-v2/scripts/db/runner.mjs --apply`.
- ⚠️ **Décider AVANT apply** : tracking migrations Supabase (apply raw node-pg = PAS de `schema_migrations` ; OK pour oio neuf mais à acter vs `supabase db push`).
- PUIS : **scénario Gate 1** (golden, 77 560 ; Hugo en imputation ciblée) = preuve du comportement au centime. Effort : `ultracode` possible.

## Blockers
- None.

## Key Context
- `oio`=`oiozjlvlsfzvkmvltiue` (cible, VIDE 0/0) · `qqfq` = live gelé.
- Comptes : claude.ai = **lyestriki@yahoo.fr** ; Supabase (oio+qqfq) = **lyes.triki@propulseo-site.com** ; ancien `iyfes…` = compte `contact@coproflex.fr` (NE PAS supprimer sans backup, contient GED/Edge).
- MCP Supabase = OK pour **requêtes**, PAS pour pousser de gros fichiers → migrations via **runner direct** (`scripts/db/runner.mjs`, lit OIO_DB_URL + CA).
- Détail vivant = `PROGRESS_v2-migrations.md` (§ Phase B + Phase C).
