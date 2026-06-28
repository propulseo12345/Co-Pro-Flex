# Session State — 2026-06-28 (socle front poussé · fondation DB v2 finance-first démarrée)

## Branch / Commit
- **coproflex-v2** (code) : `socle-connaissance-v2` @ `6b93589` — socle **poussé** ; dirty : `.planning/PLAN_PILOTE_FINANCE.md` (non commité), `.env.local` (repointé oio, gitignoré).
- **Co-Pro-Flex** (docs) : `refonte-v2-cadrage` @ `4944479` — dirty 7 (CHANTIERS/SESSION/SUPERSEDES/BILAN/rules-v2 + REFONTE/glossaire pré-existants), **non poussé** (`gh auth switch lyestriki-29`).

## Completed This Session
- Socle front v2 : assaini + gate frontières réparé/prouvé + revue multi-agents + **6 commits poussés**.
- Règle méthode « suppression = accord en amont » (rules-v2 5-bis + methodo + mémoire).
- Cadrage fondation : décisions verrouillées (base neuve · finance-first · projet **oio** · specimen Appels de fonds · golden Tilleuls), plan écrit, pré-vol docs purgé.
- **0.1 FAIT** : oio ACTIVE_HEALTHY, `.env.local`→oio (service-role live retirée). Faille `user_is_platform_admin` **confirmée dans le vrai code** de qqfq.

## Next Task
- **0.2 baseline `0001`** : MOI j'extrais le moteur finance-first de `qqfq` vers fichiers de référence (1 lot fait : helpers sécu, dans le scratch) → **workflow ultracode** clean/squash + revue cascade (corriger faille→`platform_admins`, FORCE RLS, supersedes db-cible, doctrines C.17 finance) → draft → revue Lyes → apply oio BEGIN/ROLLBACK.
- Effort conseillé : **`ultracode`** (extraction par moi, nettoyage+revue par agents).

## Blockers
- ⚠️ **Sous-agents NE peuvent PAS lire la prod via MCP** (garde-fou) → extraction de `qqfq` = **boucle principale uniquement**. Voir [[prod_read_main_loop_only]].

## Key Context
- Org « Propulseo 3 (Coproflex) » : **oio** (`oiozjlvlsfzvkmvltiue`) = base v2 vide/prête · **qqfq** (`qqfqrcolzmcbsvfaumiq`) = live GELÉ (88 tables, RPC finance mûr).
- Lecture schéma qqfq = OK (feu vert Lyes nommant la prod). Login démo oio KO tant que pas seedé.
- Scratch extraction : `…/scratchpad/db-extract/`.
