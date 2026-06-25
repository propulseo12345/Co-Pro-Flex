# Cadrage v2 → Base Saine — Plan

> **Nature** : ceci est un **plan de cadrage** (décisions, audit, consolidation), pas un plan d'implémentation de code. La skill `writing-plans` est adaptée : chaque tâche produit un **livrable de cadrage** vérifiable par un **critère de palier**, au lieu d'un cycle test→code.
> **Sous-skill d'exécution** : `superpowers:executing-plans` (inline, checkpoints) — chaque tâche est cochable (`- [ ]`).

**Goal :** Amener le cadrage v2 à une base saine = une **photo de décisions complète, cohérente, sans contradiction**, et **consolidée en specs build-ready par module**, prête à attaquer l'implémentation sans angle mort.

**Approche :** On part de l'audit de cohérence `.planning/AUDIT_COHERENCE_CADRAGE_2026-06-24.md` (26 anomalies, registre de supersedes, ordre de construction en 13 paliers, déjà produits par workflow ultracode). On (1) finit le grilling des 35 décisions PARTIAL en priorisant les doctrines de socle, (2) complète l'audit là où il manque (drift hors-finance), (3) résout les anomalies de cohérence, (4) consolide en fiches-modules. Une action sécurité live est traitée hors-bande car critique.

**Méthode/outils :** grilling 1-question-à-la-fois (skill `methodo-coproflex`) + `AskUserQuestion` + vérif base réelle ; workflows ultracode pour les audits/sweeps ; `REFONTE_DECISIONS_2026-06-23.md` = registre vivant des décisions.

## Global Constraints

- **Source vivante des décisions** : `REFONTE_DECISIONS_2026-06-23.md` (préfixes A/B/D/E/G24/C-P). Toute décision ratifiée s'y écrit ; jamais en double dans la mémoire.
- **Une seule photo** des anomalies : `.planning/AUDIT_COHERENCE_CADRAGE_2026-06-24.md` (mise à jour quand une anomalie est résolue).
- **Cadence grilling** : 1 question, vérif base réelle, ma reco, `AskUserQuestion`, puis consignation. Français vulgarisé, le pourquoi avant le comment.
- **Corriger > copier** : chaque décision est une occasion de corriger un bug/drift v1, jamais de reproduire un défaut.
- **Registre des chantiers** `.planning/CHANTIERS.md` mis à jour à chaque changement d'état.
- **Push** : 1 commit logique par lot de décisions, poussé via `gh auth switch lyestriki-29`.

---

## ⚠️ Action hors-bande (à traiter sans attendre la fin du cadrage)

### Tâche S0 : Fermer la faille de sécurité du live (ANOM-01)

**Pourquoi hors plan** : c'est une fuite de données nominatives exploitable depuis internet, pas une décision de cadrage. Elle ne doit pas attendre.

**Constat** : RLS **ON SANS FORCE** sur 87 tables (la mémoire/CLAUDE.md affirment à tort « ON+FORCE ») + 2 tables `0077` (opening_balance_residual_items, nominatif) et `0078` (supplier_advances) **sans aucune RLS** → `anon` peut SELECT/INSERT/UPDATE/DELETE depuis le net.

- [ ] **S0.1** — Vérifier empiriquement l'état RLS du live (`relrowsecurity`/`relforcerowsecurity` sur les 87+2 tables) via MCP Supabase, en BEGIN/ROLLBACK ou lecture seule. **Critère** : liste exacte des tables non-FORCE et des 2 sans RLS confirmée.
- [ ] **S0.2** — Décider avec Lyes le correctif (migration `00xx` : `FORCE ROW LEVEL SECURITY` partout + policies sur 0077/0078). **Critère** : migration revue en cascade (revue adversariale, c'est de la sécurité).
- [ ] **S0.3** — Corriger la mémoire `coproflex_cloud_live` (« ON+FORCE » → réalité), retirer le compte démo `password123` du backlog go-live.
- [ ] **S0.4** — Appliquer + re-vérifier (`get_advisors` = 0 sur RLS). **Critère** : advisor sécurité vert, anon ne peut plus lire 0077/0078.

> Gate S0 : aucune table exposée à `anon`, mémoire alignée sur le réel. **Peut tourner en parallèle des phases ci-dessous.**

---

## Phase 1 — Compléter la photo (grilling des 35 PARTIAL)

> But : 0 décision PARTIAL ouverte. Ordre par criticité : les **doctrines de socle d'abord** (elles conditionnent la baseline), puis les modules.

### Tâche 1.1 : Ratifier les 8 doctrines fondatrices C.17

**Pourquoi en premier** : ce sont des contrats de signature/sécurité transverses (idempotence, horloge métier, machine à états, cron, webhooks, super-admin). Les acter après coup forcerait à réécrire toutes les RPC d'écriture et tous les jobs (ANOM-20).

- [ ] Griller une par une les 8 doctrines (cf. AUDIT §2 « C.17 ») : `set_ag_status` unique · audit trail des actions (`reason`/`reversed_by`) · `p_idempotency_key` obligatoire · `p_tx_date` horloge métier · registre `cron_runs` · enums EN/libellés FR + purge valeurs mortes · contrat webhooks · droit super-admin (break-glass).
- [ ] Consigner dans `REFONTE_DECISIONS` (lot `G24-C17-P`).

**Critère de palier** : les 8 doctrines ratifiées et écrites ; elles deviennent des contraintes de socle citées au Palier 0 du plan d'implémentation.

### Tâche 1.2 : Trancher les ~7 arbitrages expert métier (avec Lyes)

**Pourquoi tôt** : chacun bloque du code aval (cf. AUDIT §2 « arbitrages expert »).

- [ ] Griller : minimum ALUR légal · immutabilité période approuvée · période de référence état daté (Q9, recoupe ANOM-09) · équilibre annexe 1 créances=dettes (bloque gate 0088) · clôture compte vendeur écriture vs pointage (D33) · définition fonds travaux affichée (D67) · **dérivation réalisé+impayés du GL** (D20/E6, recoupe ANOM-12 et ANOM-03).
- [ ] Consigner (lot `G24-EXPERT-P`).

**Critère** : 7 arbitrages tranchés ; en particulier le couplage impayés↔GL (ANOM-03) a une réponse, car il débloque Phase 3 et le Palier 6.

### Tâche 1.3 : Ratifier C.11 P4-P6

- [ ] Griller P4 (idempotence envois en masse), P5 (source unique destinataires), P6 (modération mur soft-delete). Reprend exactement où on s'est arrêté.
- [ ] Consigner (compléter le lot `G24-C11-P`).

**Critère** : domaine C.11 entièrement cadré (P1→P6).

### Tâche 1.4 : Ratifier C.12 (ventes/état daté — 6)

- [ ] Griller les 6 (cf. AUDIT §2 « C.12 »). Attention aux recoupements D33/D36/E9 déjà partiellement tranchés + à l'arbitrage clôture compte vendeur (1.2).
- [ ] Consigner (lot `G24-C12-P`).

**Critère** : domaine C.12 cadré.

### Tâche 1.5 : Ratifier C.13 (conseil syndical — 5)

- [ ] Griller les 5 (FK council, président CS, accès pièces, délégation dormante, annexion avis). Dépend du périmètre A1/A2 (déjà cadré).
- [ ] Consigner (lot `G24-C13-P`).

**Critère** : domaine C.13 cadré.

### Tâche 1.6 : Ratifier C.14 (conformité — 6)

- [ ] Griller les 6 (cf. AUDIT §2 « C.14 »). Inclut la résolution de l'incohérence `document_access_log` (ANOM-10 : construire vs report P1).
- [ ] Consigner (lot `G24-C14-P`).

**Critère** : domaine C.14 cadré ; statut de `document_access_log` tranché.

### Tâche 1.7 : Ratifier C.15 (portail/RGPD/multi-rôle — 5)

- [ ] Griller les 5. **Le multi-copro/multi-rôle (1 auth/personne, switcher contexte+rôle) doit être tranché AVANT de coder le middleware** (B3).
- [ ] Consigner (lot `G24-C15-P`).

**Critère** : domaine C.15 cadré ; modèle d'identité du portail figé.

### Tâche 1.8 : Ratifier C.16 (multi-cabinet — 5)

- [ ] Griller les 5. **Résoudre ici la contradiction mandat syndic V1/P1 (ANOM-08)** : trancher l'entité `syndic_mandate` minimale V1, sinon D30 (plafond 3 mandats) est orphelin de données. Inclut l'escalade platform_admin (impacte la baseline RLS).
- [ ] Consigner (lot `G24-C16-P`).

**Critère** : domaine C.16 cadré ; `TRIAGE_PARTIE_C` à **0 PARTIAL ouvert** → **photo complète**.

---

## Phase 2 — Compléter l'audit (drift hors-finance)

> But : la photo de drift ne couvrait que la finance (118 refs cassées). AG/maintenance/GED/communication/ventes n'ont **jamais** été audités (ANOM-25). Sans ça, le plan raisonne sur une cartographie partielle.

### Tâche 2.1 : Workflow ultracode « drift hors-finance »

- [ ] Lancer un workflow (un lecteur par domaine : AG, maintenance, GED, communication, ventes) qui croise le front réel (RPC/vues invoquées) avec le schéma live, et liste : RPC fantômes, vues absentes, enums morts, succès mensongers (stubs), capacités dormantes non câblées.
- [ ] Sortie : `.planning/AUDIT_DRIFT_HORS_FINANCE_2026-06-24.md` (même format que `AUDIT_DRIFT_FINANCE`).

**Critère de palier** : chaque domaine hors-finance a son inventaire d'orphelins « à câbler vs à purger » ; les anomalies notables remontent dans l'audit de cohérence.

---

## Phase 3 — Résoudre les anomalies de cohérence

> But : 0 contradiction bloquante ouverte ; un registre de supersedes unique et vivant. On NE recode rien ici — on **réécrit les décisions** pour qu'elles soient univoques.

### Tâche 3.1 : Centraliser le registre des supersedes

- [ ] Créer dans `REFONTE_DECISIONS` une **section unique « SUPERSEDES (X remplace Y) »** à partir de l'AUDIT §4 (déjà constitué). Chaque décision supersédée pointe vers celle qui la remplace.
**Critère** : un seul endroit fait foi pour « quelle décision prime ».

### Tâche 3.2 : Réécrire les contradictions bloquantes/importantes

- [ ] **ANOM-02** (trésorerie) : réécrire D21/D67/G24-T7 pour acter « deux poches » comme **seul** modèle ; marquer le multi-512 comme abandonné.
- [ ] **ANOM-07** (pièces convocation) : réécrire A3 → avertissement non bloquant (aligner sur G24-C8-P P4).
- [ ] **ANOM-09** (partie 3 état daté) : marquer DEFERRED-D5 résolue par Cadrage-8.
- [ ] **ANOM-11** (machine à états AG) : aligner `business-rules.md` sur G24-T11/C.17 (RPC `set_ag_status`, pas d'UPDATE front).
- [ ] **ANOM-13/16** (migrations à moitié faites) : noter explicitement « 110→12 à finir dans `regularize_period` » et « provider = Brevo, purger Resend » comme dette de purge AVANT reconstruction.
- [ ] **ANOM-12** : reporter ici la décision expert (1.2) sur la dérivation réalisé/impayés (source unique GL).
**Critère** : chaque anomalie 🔴/🟠 a soit une réécriture de décision, soit une note « tranché par tâche X », dans l'audit.

### Tâche 3.3 : Marquer les orphelins à créer vs purger

- [ ] Lister, à partir de l'AUDIT (§3 orphelines + Phase 2) les objets **à créer** (`copro_bank_accounts`, `commitments`, `create_ag_with_standard_resolutions`, `create_budget_from_ag_resolution`, `post_exceptional_call_for_funds`, route avance art.35, 12 vues d'agrégat, `record/settle_mutation_opposition`, `register_generated_document`…) vs **à purger** (routes/enums morts, `postOnboardingOpeningBalances`, `createEtatDateSnapshot`, `post_call_for_funds`).
**Critère** : une liste « créer / purger » exploitable directement par le plan d'implémentation.

---

## Phase 4 — Consolidation build-ready (le pont vers l'implémentation)

> But : transformer le nuage de décisions en **une fiche par module**, exploitable par un implémenteur sans contexte.

### Tâche 4.1 : Figer l'ordre de construction (13 paliers)

- [ ] Valider/affiner avec Lyes l'ordre de construction de l'AUDIT §5 (Palier 0 → 12 + transverse). **Critère** : ordre validé, dépendances explicites (X avant Y).

### Tâche 4.2 : Une fiche par module (~15 modules)

- [ ] Pour chaque module métier (cf. les ~15 modules, ANOM-22), produire une fiche `.planning/modules/<module>.md` : décisions applicables (codes A/B/D/E/G24/C-P) · schéma cible (tables/colonnes) · RPC à créer/réutiliser · orphelins à créer/purger · vues de lecture · gardes/RLS · ordre de dépendance · golden attendu.
- [ ] Workflow ultracode possible (un agent par module, à partir du registre + audit).
**Critère** : chaque module a une fiche autosuffisante ; un nouvel implémenteur peut prendre une fiche et construire sans relire tout le corpus.

### Tâche 4.3 : Clôturer le cadrage

- [ ] Mettre à jour `CHANTIERS.md` : « Grilling PARTIE C » → ✅ livré ; ouvrir le chantier « Implémentation v2 par paliers ».
- [ ] Snapshot `SESSION.md` + commit + push.
**Critère** : `base saine` déclarée = photo complète + 0 contradiction bloquante + fiches-modules prêtes.

---

## Self-Review (vérif du plan vs objectif)

- **Couverture de l'objectif** : photo complète → Phase 1 (35 PARTIAL) + Phase 2 (drift hors-finance) ; cohérence → Phase 3 (26 anomalies + supersedes) ; build-ready → Phase 4 (fiches-modules + ordre). ✅
- **Risques top-10 de l'audit** : sécurité live → S0 ; créances↔GL → 1.2/3.2 ; ruptures AG→finance → recensées (3.3, traitées en implémentation Palier 3) ; trésorerie → 3.2 ; doctrines C.17 → 1.1 ; faux-vert → Phase 2 + S0 ; photo incomplète → Phase 1+2 ; arbitrages expert → 1.2 ; migrations à moitié faites → 3.2 ; périmètre V1/P1 → 1.7/1.8. ✅
- **Limite assumée** : ce plan **n'implémente rien** (sauf S0 sécurité). La construction réelle suit l'ordre des 13 paliers, dans des plans d'implémentation dédiés par palier/module — c'est la suite logique après la base saine.
