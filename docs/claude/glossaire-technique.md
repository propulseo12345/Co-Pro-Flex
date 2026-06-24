# Glossaire technique CoProFlex (jargon de code / projet)

> Vocabulaire **technique propre au projet** (pas les concepts de programmation générale).
> Jumeau métier (copro + compta) : [/CONTEXT.md](../../CONTEXT.md). Un mot ne va que dans **un** des deux.
> Format : **terme** en gras + définition courte + `_Avoid_:` si un synonyme/anti-patron est à bannir.
> **Enrichissement au fil de l'eau** (y compris PR de rename/typo) : si tu croises ou renommes un terme technique ambigu, ajoute-le ici dans la même PR.

---

## Architecture & stack

- **v2-tanstack** — le front v2 reconstruit from-scratch (`v2-tanstack/`, TanStack Start). L'ancien front Next (`src/`) reste **gelé en référence**, jamais modifié. _Avoid_: « copier v1 » ; Tailwind (stack réelle = **CSS Modules**).
- **Server function / loader** — couche données du front : navigateur → server function → **RPC SQL** → DB. La double écriture comptable reste **dans une transaction SQL**, jamais sortie de la base. _Avoid_: logique comptable côté client/edge.
- **Edge function** — réservée aux **cron/webhooks** uniquement (ex. relances, ingestion bancaire), pas à la logique métier. `Implémentation:` patron pg_cron `0055`.
- **Migration** — script SQL versionné `supabase/migrations/NNNN_*.sql` qui modifie la structure/les fonctions de la base. Appliquée par Claude sur le live (gouvernance tout-cloud). _Avoid_: « le repo migrations = source de vérité » (il a drifté — vérifier la base réelle).

## Grand livre — mécanique

- **RPC canonique** — la **route d'écriture unique** d'une opération. Toute écriture au GL passe par `create_ledger_transaction` (0025), qui porte le verrou de période (`status='open'`). _Avoid_: dupliquer une garde dans chaque writer ; un 2ᵉ chemin d'écriture pour une même opération (« un chemin par feature »).
- **source_type** — étiquette de l'écriture (`call_for_funds`, `payment`, `opening_balance`, `result_allocation`, `works_settlement`, `closing`…) ; sert au filtrage des audits et des annexes.
- **operation_id** — dimension **non-GL** portée au niveau de la ligne (rattachement à une opération travaux). Re-étiquetable sans toucher aux montants. Modèle de référence pour la **clé de répartition** sur une charge (re-étiquetage non-GL).
- **charge_nature** — classification **binaire** d'un compte : `courant` / `travaux`. `Implémentation:` `accounts.charge_nature` (0059). Les comptes « contextuels » (produits des 2 côtés) se classent par `operation_id`, pas par compte.
- **Doctrine des états (G24-T11)** — deux familles : (1) statut **conséquence des comptes** (payé/soldé/réalisé) = **TOUJOURS calculé depuis le GL via une vue**, jamais un drapeau stocké ; (2) statut **événement/décision** (AG, OS, recouvrement) = **stocké** mais changé **uniquement par une fonction de transition serveur unique et gardée**, jamais par un UPDATE éparpillé.

## Tests & vérification

- **Gate** — test SQL d'invariant (`supabase/tests/gate_*.sql`) qui prouve une propriété (équilibre, valeurs attendues, négatifs interdits). Doit être **vert** avant merge. _Avoid_: « skipper »/truquer un gate pour sortir de la boucle.
- **Golden / boucle d'or** — copropriété de référence aux valeurs attendues vérifiées, qui doit rester **inchangée** (parité du résultat comptable) après toute migration finance. `Implémentation:` `seed_golden_loop` (0029).
- **Harnais** — copro **jetable** clonée pour tester en isolation. `Implémentation:` `create_test_copro` / `create_test_copro_seeded` (claim service_role, BEGIN/ROLLBACK pour tester sur le live sans le polluer).
- **audit_finance_integrity** — fonction qui doit renvoyer **0 écart** ; condition de la DoD finance.
- **DoD** — Definition of Done stricte par feature (tsc 0 · unit · **e2e Playwright qui PROUVE en base** · non-régression · lint · /simplify · code review multi-agents · vérif navigateur · PR). `Implémentation:` skill `methodo-coproflex`, note `rules-v2.md`.

## Gardes & autorisation

- **G-MGR / G-SVC / G-DEF-RO** — annotations de garde sur les fonctions SQL : gestionnaire requis / appel service (`is_service_call()`) / definer read-only. Vérifier `is_service_call()` dans les gardes.
- **RLS collectif vs back-office** — `user_has_copro_access` (collectif) vs `user_is_copro_manager` (back-office) ; helpers `SECURITY DEFINER` anti-récursion. `Implémentation:` 0034.

## Conventions de chantier

- **Préfixe de chantier** — un chantier = un **préfixe unique** pour numéroter ses décisions (ex. `G24-*` cadrage PARTIE C, `UX-*`, `GLOSS-`). Jamais réutiliser une lettre/numéro d'un autre chantier. _Avoid_: « C2 » ambigu entre deux chantiers.
- **rules-v2.md** — note des RÈGLES v2 **réinjectée à chaque message** (hook `UserPromptSubmit`). Décision de **méthode** → mettre à jour le skill `methodo-coproflex` + `rules-v2.md` ; décision **produit** → `REFONTE_DECISIONS`.
- **CHANTIERS.md** — registre des chantiers (statuts) pour ne pas oublier un travail commencé. `Implémentation:` `.planning/CHANTIERS.md`.
- **Mapper snake↔camel** — obligatoire entre la base (snake_case) et le front (camelCase) ; ne jamais consommer le brut.
