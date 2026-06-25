# Session State — 2026-06-25 (socle C.17 bouclé 8/8 + EXP-4)

## Branch / Commit
`refonte-v2-cadrage` @ `cbabd20` (+ ce snapshot)

## Completed This Session
- **Socle C.17 BOUCLÉ 8/8** : **C17-6** (machines à états : enum EN / libellé FR, **statut dérivé** OS↔facture, refusé≠annulé, signé≠validé, période 3 temps + refus AG), **C17-8** (super-admin **lecture seule + break-glass dès V1** + anti-cumul en base + flag `profiles.is_platform_admin`), **C17-5** (cron robuste : **rattrapage 2 vitesses** émission/relance, mode émission **au choix gestionnaire**, registre `cron_runs`, alertes non bloquantes).
- **EXP-4** (équilibre annexe 1) : **égalité GLOBALE** + **pop-up à 2 visages** (🟢 pédago avant affectation / 🔴 alarmant après) **JAMAIS bloquant** + **trace du passage outre** (branché C17-2).
- Décisions consignées dans `REFONTE_DECISIONS_2026-06-23.md` (commit `cbabd20`). Backlog vocabulaire créé : `.planning/GLOSSAIRE_A_FAIRE.md` (**option A** : passe `ultracode` en fin de cadrage).

## Next Task
- Reprendre le grilling à **EXP-5** (puis EXP-3, EXP-6, EXP-1, C16-1, C15-5… ordre conseillé `PRE_GRILLING_PACK_2026-06-25.md` **ligne 28**).
- Effort conseillé : **`Max`** (cadrage séquentiel).

## Blockers
- None.

## Key Context
- **Méthode grilling** (à reprendre telle quelle) : par dossier, je sépare « **ta décision métier** » vs « **ma plomberie** » ; questions via **AskUserQuestion** (ma reco en 1er) ; explication FR vulgarisée si tu demandes. Décisions → `REFONTE_DECISIONS` (sections « Socle C.17 » + « Arbitrages expert ») ; vocabulaire ratifié → `GLOSSAIRE_A_FAIRE.md` (**NE PAS** intégrer les termes des dossiers non grillés).
- **Arbitrages strictement USER restants** : mandat syndic V1, période de l'état daté, minimum ALUR, multi-rôle (créances↔GL déjà cadré via EXP-7/EXP-4).
- **REPRISE SUR AUTRE PC** : `git pull` la branche `refonte-v2-cadrage`, puis `/token-saver start`. Tout l'état est **dans le repo** (`.planning/SESSION.md` + `REFONTE_DECISIONS`) — pas besoin de la mémoire locale.
