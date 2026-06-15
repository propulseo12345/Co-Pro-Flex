# Session State — 2026-06-15 (J5 TERMINÉ — T1→T6 livrés, en attente échange Lyes)

## Branch / Commit
`nuit-2026-06-15` @ `d211c40` (T1→T6 livrés ; déchets racine non suivis — **NE JAMAIS `git add .`**). NON poussée (Option A).

## Completed This Session — J5 INTÉGRAL (migrations 0071→0078)
- **T1 / F9 contre-passation** (0071) — reverse_ledger_transaction + cancel_call_for_funds. `39445b3`+`1c7acf0`.
- **T2 / paiements C2/C3** (0072) — allocate_payment cloisonné + avance 450-3. `95e481a`+`7fb16e9`.
- **T3 / E9 operation_id** (0073) — saisie→GL + filet + close_works_operation. `06996cc`+`e743646`.
- **T4 / annexes E7/E8** (0075) — 6 fn_annexe_* format tableau + gardes PDF. `47eca92`+`3cfa874`.
- **T5 / état daté H2/H3** (0076) — payload cédants+provisions+ALUR + neutralisation couche fantôme. `1d21698`+`912ec69`.
- **T6 / reprise mandat F8** (0077/0078) — résidu 471/472 art.10 + acompte 409. `59d8e93`+`d211c40`.
- Chaque tranche : gate dédié + **db:test 34/34** + tsc 0 + revue adversariale (sous-agent) traitée + commits séparés. Option A respectée (rien poussé/appliqué sur le live).

## Post-J5 (échange Lyes 2026-06-15) — décisions actées
- **#1 fait** : statut `'sent_to_notary'` ajouté (migration **0079**) + index actif maj + fix gate flaky 0075. Commits `20d31d1`+`de93ca4`. db:test 34/34.
- **#2 (avoirs sur acompte) : RIEN À FAIRE** — comportement correct (avoir = pièce globale fournisseur, le net par facture est déjà isolé via le GL).
- **À FAIRE EN SESSION NEUVE** (demande Lyes) :
  - **#4 annexe 3 COMPLÈTE** (minimum légal exigé : réalisé ventilé par clé + budgets N+1/N+2 par clé) — migration **0080**, CREATE OR REPLACE `fn_annexe_3` (méthode : réalisé ventilé au prorata du budget par clé ; produits affectés = appels par clé). PRIORITAIRE (outil destiné à un syndic pro).
  - **#3 inventaire front à retravailler** : refonte complète du front prévue → produire la LISTE des boutons/écrans/features à reprendre (dont sélecteur opération T3, modale facture mock-shaped, viewers état daté) AVANT de coder.
  - **#5 nettoyage vente** : supprimer `lib/sales/api.ts` + rewiring `mutationsApi` 100% RPC (BLOCKER déjà neutralisé, reste le ménage 8 fichiers).
  - **#6 import CSV balance** : en attente d'un exemple de balance d'un syndic sortant (Lyes fournira) ; gabarit fixe V1.

## Next Task — ÉCHANGE AVEC LYES (bilan J5) puis :
1. **Tests runtime F10** par Lyes (navigateur) sur chaque tranche (critères dans PLAN_J5 §T0-T6).
2. **Différés à trancher/coder** (session dédiée) : sélecteur opération à la saisie (T3) ; annexe 3 réalisé/BP par clé (T4) ; suppression lib/sales/api.ts + rewiring mutationsApi + statut 'sent_to_notary' hors-enum (T5) ; import CSV balance papaparse (T6 Brique 2).
3. **Gouvernance Option A** : Lyes applique les migrations 0071→0078 sur branche jetable / live, GO explicite.
4. **Régénérer `src/types/supabase.ts`** (nouvelles RPC/colonnes) — les wrappers front utilisent un client untyped en attendant.

## Blockers
- DB locale = conteneur SEUL `supabase_db_Co-Pro-Flex` (UP healthy) ; jamais `supabase start` (OOM).

## Key Context
- Migrations 0071→0078 appliquées EN LOCAL uniquement (Option A). Prochain n° libre : **0079**.
- Règles dures respectées partout : GL immuable (contre-passation), lot-centric, RPC DEFINER gardées, PK `pk_<table>`.
- Détail complet par tranche (commits, gates, différés, revues) : `.planning/PLAN_J5_2026-06-15.md` §6.
