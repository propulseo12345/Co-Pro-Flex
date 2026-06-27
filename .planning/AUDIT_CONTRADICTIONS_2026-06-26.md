# Audit de cohérence v2 — « anti-pièges à copie » (2026-06-26)

> Liste À RATIFIER (vrai positif / faux positif / différé). LECTURE SEULE : aucune source n'a été modifiée. Corrections ultérieures en PR séparée.

## Métadonnées
- Périmètre : « tout sauf déchets » (blueprints db-cible, specs, contexte auto-chargé, 104 mémoires, atlas, tests, snapshots ; hors _archive/cours-syndic/dumps).
- Étalon : grand livre des décisions (REFONTE_DECISIONS + BILAN + SUPERSEDES + réconciliation « live gelé » du 2026-06-26).
- Exécution : 2 vagues multi-agents (vague 1 = 9 grappes ; vague 2 = 23 grappes relancées après throttling), vérification adversariale par finding (panel de 3 jurés pour les 🔴).
- Micro-trous de couverture (non bloquants) : 1 tiers du `PRE_GRILLING_PACK` (SNP-2b) et 1 juré sur 3 d'un finding META non rejoués → signalés en Complétude.

## Résumé global

**Total : 107 findings retenus (ANOM-001 → ANOM-107), numérotation continue sur les 2 vagues.**

| Gravité | Nombre |
|---------|--------|
| 🔴 Red | 18 |
| 🟠 Orange | 54 |
| 🟡 Yellow | 28 |
| ⚪ White | 7 |
| **Total** | **107** |

> Vague 1 = ANOM-001→034 (34 findings) ; vague 2 = ANOM-035→107 (73 findings). ANOM-106 est un emplacement réservé (doublon de ANOM-063 explicitement écarté, conservé pour ne pas renuméroter). Le décompte par gravité compte une anomalie par couple fichier+énoncé après dédoublonnage ; un même thème (provider Resend, RLS sans FORCE, super-admin via membership) apparaît sur plusieurs fichiers = autant de points de copie distincts.

### Top pièces les plus dangereuses (fusion des Top-5 des 2 vagues)
1. 🔴 `dev_phase_rls.md` (mémoire active) ordonne de laisser RLS OFF et de **ne pas alerter** — un agent de build désamorce l'Advisor et naît sans cloisonnement multi-tenant (ANOM-001).
2. 🔴 `2026-03-14-convocation-dispatch-design.md` §5.1 : policy RLS avec `COALESCE(auth.uid(), '0000…')` + **sans FORCE** — un échec d'auth retombe sur un UUID anonyme fixe au lieu d'un deny-by-default (ANOM-002).
3. 🔴 `2026-03-14-convocation-dispatch-design.md` §2.3 : RPC convocation lit `lots.tantiemes` / `lots.owner_id` — colonnes **fantômes en v2** → majorités fausses ou crash schéma (ANOM-003).
4. 🔴 `db-cible/04-ag-gouvernance.md` : machine à états AG qui **écrit `status` en direct** sans `set_ag_status` ni trigger-verrou → ressuscite la doctrine bannie « pv_* par UPDATE front » (ANOM-004).
5. 🔴 `2026-03-14-wizard-appel-fonds-ponctuel-design.md` : appels exceptionnels via **Edge Function sans nature comptable ni écriture GL atomique** → la cause racine que D13/D15 corrigent (ANOM-007).
6. 🔴 `INVENTAIRE-FONCTIONS.md` §F/§P : bypass `user_is_platform_admin()` câblé dans le portier **ÉCRITURE** → recrée mot pour mot la faille d'escalade C16-4 (ANOM-037).
7. 🔴 `catalogue-finance.md` : le RÉALISÉ budgétaire « ne joint pas le ledger » → double-vérité du réalisé qu'EXP-7 ferme (ANOM-038) ; et `glossaire-technique.md` L52 garde « pv_* posés par UPDATE front » dans un fichier canonique (ANOM-035).
8. 🔴 `BILAN_CADRAGE §5` désigne « patcher le live » (super-admin + FORCE 87 tables) comme **prochaine action** — l'instruction la plus susceptible d'être exécutée, périmée par RECONCIL-LIVE (ANOM-044) ; et les specs `cloture-finalisation-ag` / `portefeuille` rouvrent pv_* UPDATE front (ANOM-041) et impayés = status call_for_funds (ANOM-042).

### Docs à corriger en priorité (fusion dédoublonnée des deux vagues)
1. `.planning/db-cible/00-SYNTHESE.md` (RLS bicéphale + FORCE comptable-only + Resend) — pilote la génération du socle.
2. `.planning/db-cible/01-copros-lots-personnes.md` (FORCE « non requis » + DISABLE dev sur le domaine tenance).
3. `.planning/db-cible/04-ag-gouvernance.md` (machine à états + RLS toggle + Resend).
4. `.planning/db-cible/02-finance-grand-livre.md` + `03-budgets-appels-impayes.md` + `05-mutations-etat-date.md` (double-posting, RLS sans FORCE, enum mutation, 110/120, validate_mutation).
5. `.planning/db-cible/ENUMS.md` + `INVENTAIRE-FONCTIONS.md` + `MIGRATION-DONNEES.md` (enum mutation 6 valeurs, bypass admin écriture, seed super-admin = rôle).
6. `docs/superpowers/specs/2026-03-14-convocation-dispatch-design.md` (3 red : RLS anon, tantièmes fantômes, Resend/Edge).
7. `docs/claude/glossaire-technique.md` + `catalogue-finance.md` + `business-rules.md` + `modules.md` + `CONTEXT.md` (contexte auto-chargé : pv_* UPDATE front, réalisé hors GL, platform_admin enum, OS statuts FR, Resend canonique).
8. `docs/superpowers/specs/` (cloture-finalisation-ag, portefeuille-gestionnaire, phase1-resync-drift, mouvements-bancaires, conformité-2026, portail-coproprietaire, banque-resolutions).
9. Mémoires `dev_phase_rls.md` + `coproflex_cloud_live.md` + `ui_ux_refonte_direction.md` + `dev_demo_accounts_seed_gap.md` (RLS-off / patch-live / Next.js / seed super-admin périmés).
10. Registres pré-refonte `.planning/DECISIONS.md` (×2) + `DECISIONS_CADRAGE_2026-06-15.md` + `DECISIONS_AUTONOMIE.md` (gouvernance « migrer le live », edge métier, multi-512, Resend, jsPDF).
11. Plans de test `.planning/tests/` (TC_01/03/04/06/09/11, PLAN_GOLDEN, PLAN_TEST_MASTER : 512100, 4 niveaux GED, 103+105, live cible, password123).
12. `.planning/BILAN_CADRAGE_2026-06-26.md` + `SUPERSEDES.md` section D + `atlas/MATRICE-LIAISON.md` + `TRIAGE_PARTIE_C` / `CARTOGRAPHIE_CONTEXTE` (patch live, 672/772, user_is_platform_admin sur 2 portiers).

---

## Findings

> Vague 1 (ANOM-001→034) puis vague 2 (ANOM-035→107). Numérotation continue, conservée telle quelle. Findings VERBATIM (verdicts real/ambiguous d'origine). Les deux vagues n'utilisent pas exactement la même mise en forme du titre (emoji en fin de ligne en vague 1, en tête en vague 2) : conservée à l'identique.

### Vague 1 (ANOM-001 → ANOM-034)

> Triés par gravité (🔴 > 🟠 > 🟡 > ⚪) puis par grappe. Doublons fusionnés (le provider Resend apparaît dans 6 fichiers : un finding par emplacement, car chaque doc est un point de copie distinct).

### 🔴 Red

---

**ANOM-001 — RLS off « volontaire » gravé dans une mémoire active 🔴**
- **Fichier** : `dev_phase_rls.md` (mémoire Claude du projet, `…/memory/dev_phase_rls.md`), l.10-18.
- **Énoncé fautif** : « RLS désactivé sur la majorité des tables (~72/87)… C'est volontaire… Ne pas remonter les advisories… Ne pas auto-générer / proposer d'appliquer des `ALTER TABLE … ENABLE ROW LEVEL SECURITY` sans demande explicite… À revoir quand on passe en prod. »
- **Décision qui prime** : B5 / RECONCIL-LIVE-2026-06-26 (verdict **real**, conf. 1.0) — RLS ON+FORCE sur TOUTES les tables, NATIF dans la baseline 0001 ; Advisor `rls_disabled = 0` est un gate DoD bloquant.
- **Pourquoi un agent serait piégé** : cette note est chargée en contexte et se présente comme une consigne projet permanente, non bornée au live. Un agent construisant la baseline 0001 la lit comme la règle courante, laisse RLS off et désamorce l'Advisor → fuite multi-tenant, faille 0085 rouverte.
- **Correction suggérée** : marquer la mémoire PÉRIMÉE pour v2. La base neuve naît RLS ON+FORCE partout ; `rls_disabled` doit rester à 0 ; la consigne « ne pas proposer d'activer » ne vaut plus.

---

**ANOM-002 — Policy RLS avec fallback UUID anonyme, sans FORCE 🔴**
- **Fichier** : `docs/superpowers/specs/2026-03-14-convocation-dispatch-design.md` §5.1, l.263-273.
- **Énoncé fautif** : `ENABLE ROW LEVEL SECURITY` (pas de FORCE) puis `FOR ALL USING (… WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID))`.
- **Décision qui prime** : B5 + B3 + RECONCIL-LIVE (verdict **real**, conf. 1.0) — RLS ON+FORCE natif baseline 0001, middleware deny-by-default, validation serveur `getUser()`.
- **Pourquoi un agent serait piégé** : le snippet SQL est prêt-à-copier dans un .md « Validé ». Le `COALESCE` transforme un échec d'auth (session anon, `auth.uid()` NULL) en comparaison silencieuse à un UUID fixe au lieu de refuser — l'inverse exact du deny-by-default ; et FORCE est omis.
- **Correction suggérée** : pas de fallback UUID ; deny-by-default si `auth.uid()` NULL ; RLS ON+FORCE natif.

---

**ANOM-003 — RPC de convocation lit les tantièmes depuis des colonnes fantômes 🔴**
- **Fichier** : `docs/superpowers/specs/2026-03-14-convocation-dispatch-design.md` §2.3, l.88-96.
- **Énoncé fautif** : `rpc_get_ag_convocation_bundle` lit `l.tantiemes` (l.88), `SUM(l.tantiemes)` pour le total (l.93-95), et la propriété via `JOIN lots l ON l.owner_id = cp.id` (l.90).
- **Décision qui prime** : D9 (+ D8/D11) (verdict **real**, conf. 1.0) — source unique du tantième = `repartition_key_lines.weight` ; `lots.tantiemes_generaux` = doublon à supprimer ; propriété via `lot_owners` (`is_primary`).
- **Pourquoi un agent serait piégé** : générer cette RPC lirait `lots.tantiemes` / `lots.owner_id`, supprimées en v2 → soit le bug prouvé (majorités à 0), soit un crash schéma. Le caveat l.105 ne couvre que les colonnes d'adresse, pas la source du tantième.
- **Correction suggérée** : tantièmes via `repartition_key_lines.weight` (clé concernée) ; propriété via `lot_owners.is_primary`.

---

**ANOM-004 — Machine à états AG : écriture directe de `status`, sans guichet ni verrou 🔴**
- **Fichier** : `.planning/db-cible/04-ag-gouvernance.md` §0 (l.12-24), §4 TRIGGERS (l.401-410), §5 GARDER (l.418-447).
- **Énoncé fautif** : la chaîne est pilotée par `finalize_and_activate_ag` / `start_ag` / `close_ag` / `archive_ag` qui écrivent `ag_meetings.status` directement. Aucune occurrence de `set_ag_status`, `pv_signed_at`, `signed_by` ni de trigger anti-UPDATE-status dans le fichier (greps à zéro).
- **Décision qui prime** : C17-1 (verdict **real**, conf. 1.0) — TOUS les statuts AG passent EXCLUSIVEMENT par la RPC gardée `set_ag_status` (date serveur, `pv_signed_at`/`signed_by`) + trigger `BEFORE UPDATE OF status` ; les RPC métier DÉLÈGUENT l'écriture du status.
- **Pourquoi un agent serait piégé** : recopier ce blueprint recrée la doctrine bannie « pv_* par UPDATE front » : transitions ni gardées ni horodatées serveur, marche-arrière non encadrée sur une étape ayant alimenté le GL.
- **Correction suggérée** : ajouter `set_ag_status` (guichet unique) + colonnes `pv_signed_at`/`signed_by` + trigger anti-UPDATE-status ; réécrire `start_ag`/`close_ag`/`finalize_and_activate_ag`/`archive_ag` pour déléguer l'écriture du status.

---

**ANOM-005 — RLS « ON prod / OFF dev » + FORCE comptable-only dans la synthèse DB 🔴**
- **Fichier** : `.planning/db-cible/00-SYNTHESE.md` §2 (l.66), §4 décision 1 (l.90), §6 (l.159).
- **Énoncé fautif** : « RLS partout (ON prod / OFF dev) » ; « RLS `ENABLE` prod / `DISABLE` dev (drapeau par environnement), `FORCE` sur tables comptables ».
- **Décision qui prime** : RECONCIL-LIVE-2026-06-26 / B5 (verdict **real**, conf. 1.0) — RLS ON+FORCE sur TOUTES les tables natif dans la baseline 0001, sans drapeau prod/dev, sans FORCE partiel.
- **Pourquoi un agent serait piégé** : ce doc pilote la génération du socle. Un agent produirait des migrations à RLS conditionnel (OFF dev) avec FORCE limité au comptable, laissant les tables socle (`lots`, `coproprietaires`, `memberships`) sans FORCE et exploitables en dev.
- **Correction suggérée** : remplacer par RLS ON+FORCE natif sur toutes les tables dans 0001, sans drapeau d'environnement ; aligner §2/§3/§4/§6.

---

**ANOM-006 — Domaine tenance : « FORCE non requis ici » + DISABLE dev 🔴**
- **Fichier** : `.planning/db-cible/01-copros-lots-personnes.md` §3 RLS (l.353), §8 (l.492).
- **Énoncé fautif** : « RLS `ENABLE` partout en prod (`FORCE` non requis ici — pas de tables comptables dans ce domaine), `DISABLE` en dev ».
- **Décision qui prime** : RECONCIL-LIVE-2026-06-26 / B5-E1 (verdict **real**, conf. 1.0) — RLS ON+FORCE sur TOUTES les tables dès 0001 ; pas de DISABLE dev.
- **Pourquoi un agent serait piégé** : le domaine 01 contient justement les tables d'identité/tenance (`cabinets`, `memberships`, `coproprietaires`, `lot_owners`) qui portent le cloisonnement multi-cabinet. Se fier à « FORCE non requis ici » laisse ces tables sans FORCE (owner-of-table bypasse RLS) et désactive RLS en dev → étanchéité PALIER-1 contournable.
- **Correction suggérée** : RLS ON+FORCE sur toutes les tables du domaine 01 dès 0001 ; retirer « FORCE non requis » et « DISABLE en dev ».

---

**ANOM-007 — Appels exceptionnels émis via Edge sans nature comptable ni écriture GL 🔴**
- **Fichier** : `docs/superpowers/specs/2026-03-14-wizard-appel-fonds-ponctuel-design.md` §3 (l.22-23), §6 (l.181), §8 (l.224-228).
- **Énoncé fautif** : soumission via `createCall()` → Edge Function `generate_call_for_funds` (un appel par échéance) ; `callType` non persisté ; appel exceptionnel = `budget_id=null` sans route ni nature ; migration sur l'Edge Function.
- **Décision qui prime** : D13 / D15 / D22 (verdict **real**, conf. 1.0) — tout appel porte une justification ; routes dédiées `post_exceptional_call_for_funds` (450-2/702), avance art.35 (450-3/1031) ; écriture GL atomique à l'émission via RPC ; pas d'Edge (edge = cron/webhooks only).
- **Pourquoi un agent serait piégé** : implémenter ce design émet des appels exceptionnels via Edge générique, sans route/nature comptable, sans double écriture GL atomique — exactement la cause racine que D13/D15 corrigent.
- **Correction suggérée** : émettre via RPC dédiée (`post_exceptional_call_for_funds` / avance art.35) portant la nature + écriture GL atomique ; pas d'Edge ; statut via RPC gardée.

---

**ANOM-008 — Seed : super-admin via membership + comptes démo en clair 🔴**
- **Fichier** : `dev_demo_accounts_seed_gap.md` (nœud mémoire) décrivant `supabase/seed.sql`, l.12 + l.14-16.
- **Énoncé fautif** : recréer en seed 3 comptes démo en clair (`password123`) et donner le super-admin via un `memberships` de rôle `platform_admin` (« le plus simple » pour bypasser via `user_is_platform_admin()`).
- **Décision qui prime** : C16-4 + E7-q (verdict **real**, conf. 0.67) — super-admin dans une table dédiée `platform_admins(user_id PK)` hors-tenant, JAMAIS un rôle dans `memberships` ; AUCUN compte démo en clair (baseline native).
- **Pourquoi un agent serait piégé** : recopier ce seed recrée (a) l'escalade (super-admin = valeur de `membership_role`) et (b) un mot de passe en clair côté bundle → bypass global + accès admin trivial. `supabase/seed.sql` fait littéralement cela aujourd'hui.
- **Correction suggérée** : super-admin = INSERT dans `platform_admins` ; pas de compte démo en clair ; comptes de test via fixtures non livrées avec secrets propres. *(À ratifier : source partiellement hors-repo — voir Note.)*

---

### 🟠 Orange

---

**ANOM-009 — Logique financière câblée sur Edge Functions (appels de fonds) 🟠**
- **Fichier** : `docs/superpowers/specs/2026-03-14-appels-de-fonds-rework-design.md` §7.1, l.351-353.
- **Énoncé fautif** : `createCall → Edge Function generate_call_for_funds` ; `recordPayment → Edge Function record_payment` ; `updateCallStatus → Direct table update`.
- **Décision qui prime** : ARCHI-3COUCHES / D22 (verdict **real**, conf. 0.82) — navigateur → server function TanStack → RPC Postgres (double écriture atomique) → DB ; edges = cron + webhooks only ; statut via RPC gardée.
- **Pourquoi un agent serait piégé** : recâblerait l'émission d'appel et l'encaissement (double écriture) sur Edge et poserait le statut par UPDATE direct — les trois patterns interdits.
- **Correction suggérée** : logique financière en RPC SQL (`post_budget_call_for_funds`, `post_owner_payment`) via server function ; statut via RPC gardée ; pas d'Edge.

---

**ANOM-010 — Convocation e-mail via Edge Function Resend 🟠**
- **Fichier** : `docs/superpowers/specs/2026-03-14-convocation-dispatch-design.md` §4.2/§4.3, l.204-212.
- **Énoncé fautif** : canal EMAIL = « Edge Function Supabase (Resend) » ; nouvelle Edge `send-convocation-email`, provider Resend (ou SendGrid).
- **Décision qui prime** : G24-C11-P2 + ARCHI-3COUCHES (verdict **real**, conf. 0.85) — Brevo V1, couple neutre `provider`/`provider_message_id`, table `delivery_events`, e-mail via server function → RPC, edges = webhooks/cron only.
- **Pourquoi un agent serait piégé** : recréerait une Edge Function métier Resend au lieu de l'adaptateur Brevo + tracking neutre.
- **Correction suggérée** : envoi via server function → adaptateur Brevo ; tracking dans `delivery_events` ; pas d'Edge métier.

---

**ANOM-011 — Provider e-mail Resend dans la synthèse DB 🟠**
- **Fichier** : `.planning/db-cible/00-SYNTHESE.md` §4 décision 7 (l.99), §4 transverse (l.84).
- **Énoncé fautif** : « `mails` (boîte Resend transactionnelle, câblée front)… sont GARDÉES ».
- **Décision qui prime** : C11-P2 (verdict **real**, conf. 0.82) — tracking fournisseur-agnostique, provider V1 = Brevo, couple `provider`+`provider_message_id` (remplace `resend_id`), une seule table `delivery_events`.
- **Pourquoi un agent serait piégé** : recopierait une table `mails` portée sur Resend (`resend_id`) au lieu du couple neutre alimenté par l'adaptateur Brevo. L'entrée SUPERSEDES existante vise le blueprint 08, PAS la synthèse 00.
- **Correction suggérée** : « boîte transactionnelle fournisseur-agnostique (provider V1 = Brevo) », colonnes `provider`+`provider_message_id`, `delivery_events` unique.

---

**ANOM-012 — Provider Resend dans le blueprint 04 (notifications AG) 🟠**
- **Fichier** : `.planning/db-cible/_cartographie/04-ag-gouvernance.md` §1 `ag_notifications`, l.86.
- **Énoncé fautif** : « delivery_status 8 valeurs, provider Resend, opened_at… ».
- **Décision qui prime** : G24-C11-P2 (verdict **real**, conf. 0.78) — tracking neutre, Brevo V1, `provider`+`provider_message_id`.
- **Pourquoi un agent serait piégé** : même si l'îlot est destiné au DROP, un agent qui s'en inspire pour le schéma d'envoi recrée le couplage Resend. Occurrence distincte de l'entrée SUPERSEDES (file 08).
- **Correction suggérée** : décrire le tracking neutre Brevo (`provider`+`provider_message_id`) au lieu de Resend.

---

**ANOM-013 — RLS `mails` : INSERT direct service_role depuis l'edge inbound 🟠**
- **Fichier** : `.planning/db-cible/08-communication.md` §3 (l.291, 295), §0 (l.28).
- **Énoncé fautif** : la route `app/api/mail/inbound` écrit les mails entrants Resend côté serveur via `service_role` (INSERT direct sur `mails`).
- **Décision qui prime** : C17-7 (verdict **real**, conf. 0.85) — table `webhook_events` + UNIQUE(provider,event_id) + RPC `ingest_webhook_event` SECURITY DEFINER ; l'edge vérifie la signature → appelle la RPC → 200, JAMAIS d'INSERT direct ; anti-rejeu ; Brevo V1.
- **Pourquoi un agent serait piégé** : câblerait un INSERT direct service_role sans signature ni anti-rejeu → réintroduit le pattern interdit, perte d'idempotence sur les événements entrants.
- **Correction suggérée** : l'edge inbound vérifie la signature Brevo puis appelle `ingest_webhook_event` (DEFINER) ; pas d'INSERT direct sur `mails`.

---

**ANOM-014 — Provider Resend dans le spec mutations 🟠**
- **Fichier** : `.planning/spec/ENTITIES_MAP/07-mutations-conseil.md` §2.3 (l.50), §3.5 (l.81), §5 D7-05 (l.111).
- **Énoncé fautif** : « email_webhook (bounces/opens Resend) » ; tracking Resend ; `ag_send_pv_notification` à créer sur cette infra.
- **Décision qui prime** : G24-C11-P2 (verdict **real**, conf. 0.90) — Brevo V1, couple neutre + `delivery_events`.
- **Pourquoi un agent serait piégé** : recâblerait Resend (webhook + `resend_id`) au lieu de Brevo + couple neutre. Occurrence dans un fichier non couvert par SUPERSEDES.
- **Correction suggérée** : Brevo + `provider`/`provider_message_id` neutre + `delivery_events` (G24-C11-P2 / C17-7).

---

**ANOM-015 — Provider Resend dans le spec GED/comm/maintenance 🟠**
- **Fichier** : `.planning/spec/ENTITIES_MAP/08-ged-comm-maintenance.md` §2 (l.32), §6.
- **Énoncé fautif** : « Notifications légales AG = `ag_notifications` (+ `ag_notification_events` tracking Resend) », repris en source unique cible sans corriger le prestataire.
- **Décision qui prime** : G24-C11-P2 (verdict **real**, conf. 0.72) — Brevo V1, tracking neutre + `delivery_events`.
- **Pourquoi un agent serait piégé** : câblerait le tracking sur Resend. L'item connu pour ce fichier porte sur la GED (4 niveaux), pas sur Resend.
- **Correction suggérée** : Brevo + `delivery_events` (G24-C11-P2).

---

**ANOM-016 — Envoi e-mail via Resend (module appels de fonds) 🟠**
- **Fichier** : `docs/superpowers/specs/2026-03-14-appels-de-fonds-rework-design.md` §7.4, l.~374.
- **Énoncé fautif** : « Email via Resend (Edge Function) ».
- **Décision qui prime** : G24-C11-P2 (verdict **real**, conf. 0.85) — Brevo V1 + adaptateur provider-agnostique.
- **Pourquoi un agent serait piégé** : recoderait l'envoi e-mail sur Resend (provider/clé API faux). Fichier distinct de l'entrée SUPERSEDES (db-cible/08).
- **Correction suggérée** : Brevo via adaptateur provider-agnostique (G24-C11-P2 / C17-7).

---

**ANOM-017 — Statuts facture fournisseur à 5 valeurs (spec) 🟠**
- **Fichier** : `.planning/spec/ENTITIES_MAP/04-appels-paiements.md` §2.4, l.44.
- **Énoncé fautif** : `supplier_invoices.status` enum = `draft|approved|posted|paid|cancelled` (5 valeurs, dont `approved`).
- **Décision qui prime** : D17 (verdict **real**, conf. 0.92) — strictement 4 statuts SQL (`draft/posted/paid/cancelled`) pilotés par les écritures ; supprimer le 5e (code mort, `A_VALIDER` = déjà `draft`).
- **Pourquoi un agent serait piégé** : figerait l'enum SQL à 5 valeurs avec `approved` → machine à états facture incohérente.
- **Correction suggérée** : 4 statuts (`draft/posted/paid/cancelled`) ; supprimer `approved`.

---

**ANOM-018 — Module Factures bâti sur l'enum FR à 5 statuts 🟠**
- **Fichier** : `docs/superpowers/specs/2026-03-16-factures-refonte-design.md` §Vue Kanban + §142.
- **Énoncé fautif** : `StatutFacture` = BROUILLON / A_VALIDER / VALIDEE / A_PAYER / PAYEE (+ AVOIR), `types.ts` désigné « source de vérité ».
- **Décision qui prime** : D17 / D18 (verdict **real**, conf. 0.90) — 4 statuts SQL pilotés par le GL ; supprimer le mock à 5 statuts ; « en retard » = vue dérivée de l'échéance.
- **Pourquoi un agent serait piégé** : recoderait Factures sur le mock mort à 5 statuts FR au lieu des 4 statuts SQL pilotés par les écritures.
- **Correction suggérée** : `draft/posted/paid/cancelled` (D17/D18) ; « en retard » = vue dérivée, pas un statut.

---

**ANOM-019 — Recouvrement à 3 paliers (spec appels-paiements) 🟠**
- **Fichier** : `.planning/spec/ENTITIES_MAP/04-appels-paiements.md` §3 (l.64), §5 P2-2 (l.110), §7 Q6.
- **Énoncé fautif** : « art.19-2 : relance → mise en demeure → contentieux » historisés (3 paliers), grain par appel/ligne.
- **Décision qui prime** : D59 (+ D16) (verdict **real**, conf. 0.82) — échelle structurée à 7 stades ; impayé = VUE sur le GL ; grain = solde global par lot, lettre consolidée par personne.
- **Pourquoi un agent serait piégé** : sous-dimensionnerait l'échelle (7 stades) et raterait le grain par personne + le frais art.10-1 (G24-C5-P2).
- **Correction suggérée** : 7 stades (D59) + grain solde global par lot/personne (D16) + frais 450-6/714 (G24-C5-P2).

---

**ANOM-020 — Relances par appel + 3 phases hardcodées + fondement art.19 🟠**
- **Fichier** : `docs/superpowers/specs/2026-03-14-systeme-relances-design.md` §2 (l.19-24), §6 (l.164), §3/§4.
- **Énoncé fautif** : template 3 phases en dur (amiable J+15, formelle J+30, MED J+60) attaché au couple lot/appel (`call_line_id`, `call_id`) ; MED citant « l'article 19 de la loi du 10 juillet 1965 ».
- **Décision qui prime** : D59 + D16 (+ G24-C5-2, D60) (verdict **real**, conf. 0.90/0.95) — échelle 7 stades centralisée dans Recouvrement ; grain solde GL par personne (abandon `call_id`/`call_line_id` pour le grain de relance) ; MED = point de départ art.36 ; templates data-driven.
- **Pourquoi un agent serait piégé** : recoderait 3 phases hardcodées par appel avec un fondement légal erroné (art.19 ≠ procédure d'intérêts), au lieu de l'échelle 7 stades par personne sur le solde GL.
- **Correction suggérée** : brancher sur l'échelle 7 stades (D59) ; grain solde GL par lot/personne (D16) ; MED = art.36 ; templates fusionnés depuis le GL (D60).

---

**ANOM-021 — Fusion tiers remplacée par une FK providers→suppliers 🟠**
- **Fichier** : `.planning/spec/ENTITIES_MAP/04-appels-paiements.md` §2.4 + §5 P1-4 + §6 (l.121).
- **Énoncé fautif** : `providers` ⊥ `suppliers` (deux référentiels) → cible = « FK `providers→suppliers` + vue de réconciliation ».
- **Décision qui prime** : fusion tiers verrouillée USER (réf. D38 imprécis) (verdict **real**, conf. 0.85) — UNE entité `tiers` (rôles `is_provider`/`is_supplier`/`is_notary`), FK repointées sur `tiers`, pas deux tables reliées par FK (cf. `db-cible/07` §1.1, `db-cible/02` §1.12).
- **Pourquoi un agent serait piégé** : créerait une FK entre deux tables tiers séparées, perpétuant le doublon au lieu de la table `tiers` unique.
- **Correction suggérée** : référentiel `tiers` unifié (migration de fusion, pas de drop des sources) ; pas de FK de réconciliation.

---

**ANOM-022 — Enum mutation à 6 statuts + UPDATE front (spec) 🟠**
- **Fichier** : `.planning/spec/ENTITIES_MAP/07-mutations-conseil.md` §2.1 (l.29), §2.2 (l.41-42).
- **Énoncé fautif** : `mutations.status` = `draft→pre_etat_generated→etat_generated→signed→validated→cancelled` (6 valeurs, sans `sent_to_notary`) ; `validate_mutation` fait `UPDATE lot_owners`/status par fonction directe.
- **Décision qui prime** : C12-5 / C17-6(c) (verdict **real**, conf. 0.88) — 7 valeurs (`sent_to_notary` inclus), `signed ≠ validated`, transitions par RPC gardées (`set_mutation_sent_to_notary`, `mark_mutation_signed`), jamais d'UPDATE front cru.
- **Pourquoi un agent serait piégé** : recréerait l'enum à 6 statuts sans `sent_to_notary` et poserait les statuts par UPDATE direct. Entrée SUPERSEDES proche vise `db-cible/05`, fichier différent.
- **Correction suggérée** : enum 7 valeurs ; transitions par RPC gardées uniquement ; `signed` distinct de `validated`.

---

**ANOM-023 — Clôture du compte vendeur traitée comme question ouverte 🟠**
- **Fichier** : `.planning/spec/ENTITIES_MAP/07-mutations-conseil.md` §5 D7-03 + §7 Q9 (l.107, 146).
- **Énoncé fautif** : Q9 « le solde vendeur est-il soldé/transféré ? » présentée comme indécise ; D7-03 [P0] « prorata vendeur/acquéreur non calculé → implémenter le partage ».
- **Décision qui prime** : D33 / EXP-5 / C12-3 / C12-4 (verdict **real**, conf. 0.67) — `validate_mutation` ne poste rien ; le 450 suit le lot (`lot_id`) ; clôture vendeur = simple POINTAGE de jalon ; ZÉRO pro rata (le coder = faute).
- **Pourquoi un agent serait piégé** : pourrait coder une écriture de transfert vendeur→acheteur (Q9 « transféré ») ou un prorata (D7-03), tous deux interdits → fausse écriture sur fait notarié.
- **Correction suggérée** : acter D33/EXP-5/C12-3/C12-4 ; supprimer Q9 et D7-03 comme questions ouvertes. *(Note : le finding amalgame le « transfert atomique » l.41, qui est conforme — voir Note.)*

---

**ANOM-024 — Appels de provisions générés en draft « au vote » 🟠**
- **Fichier** : `.planning/spec/ENTITIES_MAP/03-budget.md` §7 point 2 (l.138).
- **Énoncé fautif** : « Appels de provisions → auto-générés en brouillon au vote… les 4 appels trimestriels en draft ; écriture de provision à l'émission ».
- **Décision qui prime** : D15 (+ D13-bis) (verdict **real**, conf. 0.72) — pas de cycle brouillon→écriture (création = écriture atomique) ; échéancier rattaché à la résolution, 1 appel émis par ligne à SA date trimestrielle ; mode auto/manuel.
- **Pourquoi un agent serait piégé** : recréerait un cycle « draft au vote » au lieu de l'échéancier rattaché + émission échelonnée par ligne.
- **Correction suggérée** : échéancier rattaché auto (D13-bis) ; 1 appel émis par ligne à sa date ; écriture GL à l'émission (D15).

---

**ANOM-025 — Plan comptable inventé (671 « travaux votés », remap 605→671) 🟠**
- **Fichier** : `docs/superpowers/specs/2026-03-16-rapprochement-bancaire-design.md` §Plan comptable + §Migration (l.78-139).
- **Énoncé fautif** : « 671 Travaux votés AG » comme compte de charge ; remap `605→671`, `622→621`, `758/768→714` ; « 705 Fonds travaux ALUR ».
- **Décision qui prime** : PCG copro réel / G24-T11 (+ G24-C4-1, EXP-6) (verdict **real**, conf. 0.85) — travaux → 702 (produit/appel) + provision 102 ; fonds ALUR = 105 ; états toujours calculés depuis le GL ; codes inventés bannis.
- **Pourquoi un agent serait piégé** : figerait un plan inventé (671 n'est pas « travaux votés » au PCG copro), envoyant les charges travaux sur un mauvais compte → classements faux au GL.
- **Correction suggérée** : aligner sur le PCG copro réel (travaux 702, provision 102, fonds ALUR 105, produits 70x) ; ne pas inventer 671 ; distinguer cotisation ALUR (105) et affectation (705).

---

**ANOM-026 — PaymentModal avec sélecteur de compte au règlement 🟠**
- **Fichier** : `docs/superpowers/specs/2026-03-16-factures-refonte-design.md` §Modales, l.105.
- **Énoncé fautif** : « PaymentModal — enregistrer un paiement (sélection compte, confirmation) ».
- **Décision qui prime** : ARB-2 (verdict **real**, conf. 0.85) — deux poches : un seul compte courant payeur (512) ; `p_bank_account_id` abandonné ; puiser dans le fonds = virement interne 502→512 avant paiement ; D21 (choix du compte au règlement) superseed.
- **Pourquoi un agent serait piégé** : ajouterait un sélecteur de compte de trésorerie au paiement fournisseur alors que le paiement part toujours du 512.
- **Correction suggérée** : `post_supplier_payment` toujours depuis le 512 courant ; pas de sélecteur de compte (ARB-2 / PALIER-6).

---

### 🟡 Yellow

---

**ANOM-027 — RLS modélisée comme toggle `_rls_state_snapshot` ON/OFF (04, 06, 08) 🟡**
- **Fichier** : `.planning/db-cible/06-documents-ged.md` §3 (l.244) ; `.planning/db-cible/04-ag-gouvernance.md` §3 (l.368), §6.2 (l.505) ; `.planning/db-cible/08-communication.md` §0 (l.24), §3 (l.271, 293).
- **Énoncé fautif** : « ENABLE + FORCE… En dev, le toggle `_rls_state_snapshot` gère le OFF » ; « RLS ON (ENABLE prod / DISABLE dev) » ; « FORCE… gap n°1 : 12/17 avaient relrowsecurity=false ».
- **Décision qui prime** : RECONCIL-LIVE-2026-06-26 / B5 (verdict **real**, conf. 0.6-0.82) — sécurité native dans la baseline 0001, RLS ON+FORCE inconditionnel ; aucun mécanisme de désactivation dev ; tout « FORCE x/y à corriger » est périmé.
- **Pourquoi un agent serait piégé** : recopierait le toggle `_rls_state_snapshot` et des migrations qui désactivent RLS « pour le dev » → fenêtre deny-by-default rouverte, et FORCE traité comme gap à patcher au lieu d'inconditionnel.
- **Correction suggérée** : retirer toute mention du toggle et du « OFF dev » ; RLS ON+FORCE inconditionnel dans 0001, étanchéité prouvée par e2e.

---

**ANOM-028 — Constats live « RLS OFF 8/8 » + toggle dev-OFF (08) 🟡**
- **Fichier** : `.planning/db-cible/08-communication.md` §0 (l.24, 271, 293).
- **Énoncé fautif** : « RLS OFF sur 15/15 / 8/8 désactivées en live » + « En dev le toggle `_rls_state_snapshot` gère le OFF » (clause forward-looking).
- **Décision qui prime** : RECONCIL-LIVE-2026-06-26 (verdict **real**, conf. 0.6) — sécurité native 0001 ; les constats live sont historiques, la clause toggle dev-OFF est périmée.
- **Pourquoi un agent serait piégé** : pourrait livrer une bascule RLS dev-OFF. Atténué : le §3 cible prévoit bien ON+FORCE sur les 8 tables.
- **Correction suggérée** : marquer « live OFF 8/8 » comme historique ; baseline 0001 pose RLS ON+FORCE nativement, sans toggle dev.

---

**ANOM-029 — Tuile fonds travaux dérivée de `fn_annexe_1` (somme provisions) 🟡**
- **Fichier** : `.planning/spec/ENTITIES_MAP/02-dashboard-kpis.md` §2 (l.38), §6 (l.98).
- **Énoncé fautif** : KPI fonds/provisions travaux sur `fn_annexe_1.total_provisions`, sans préciser 105 strict.
- **Décision qui prime** : EXP-6 (verdict **real**, conf. 0.78) — tuile « Fonds travaux » = compte 105 STRICT via `v_alur_fund_balance` ; bug corrigé (le dashboard sommait 103+105) ; carte deux faces (105 / livret 502 seul).
- **Pourquoi un agent serait piégé** : recâblerait la tuile depuis `total_provisions` et re-sommerait 103+105.
- **Correction suggérée** : tuile = 105 strict via `v_alur_fund_balance` (EXP-6), carte deux faces.

---

**ANOM-030 — ALUR présenté comme plancher 5 % plat, sans exemptions 🟡**
- **Fichier** : `.planning/spec/ENTITIES_MAP/_INDEX.md` §Arbitrages, l.12.
- **Énoncé fautif** : « assiette = ≥ 5 % du budget COURANT (art. 14-2-1 ; + ≥ 2,5 % du PPT si plan adopté) » sans exemptions.
- **Décision qui prime** : EXP-1 (+ ARB-5) (verdict **real**, conf. 0.62) — plancher MAX(5 % budget ; 2,5 % PPT) NON universel : 3 exemptions légales (neuf <5 ans, ≤10 lots par dispense unanimité, DTG sans travaux 10 ans) ; garde-fou non bloquant ; tuer `FONDS_ALUR_POURCENTAGE_MIN`.
- **Pourquoi un agent serait piégé** : appliquerait 5 % à toutes les copros → fausses alertes sur copros neuves/petites.
- **Correction suggérée** : renvoyer vers ARB-5 + EXP-1 (formule MAX + 3 exemptions, non bloquant).

---

**ANOM-031 — `budget_payment_schedules` figé en table d'acomptes travaux à statut front 🟡**
- **Fichier** : `docs/superpowers/specs/2026-03-15-echeancier-prestataire-design.md` §Modèle de données.
- **Énoncé fautif** : nouvelle table `budget_payment_schedules` dédiée aux acomptes travaux, phases pilotées par enum local `payment_phase_status`, liens `document_id`/`service_order_id`, sans `resolution_id`, GL hors scope ; RLS via helpers v1 `user_has_copro_access`/`user_is_copro_manager`.
- **Décision qui prime** : D13-bis (+ C16-4) (verdict **real**, conf. 0.88/0.82) — généraliser `budget_payment_schedules` (échéancier rattaché aux résolutions, lien `resolution_id`, sortir les valeurs financières du jsonb, écriture GL à l'émission) ; helpers de droits à corriger (faille `user_is_platform_admin` ignore `copro_id`), RLS ON+FORCE, contexte via `get_my_contexts`.
- **Pourquoi un agent serait piégé** : ferait de la table un échéancier travaux isolé piloté front et copierait les helpers RLS v1 faillés.
- **Correction suggérée** : généraliser `budget_payment_schedules` (rattachement `resolution_id`, GL à l'émission) ; helpers RLS corrigés (`get_my_contexts`, FORCE).

---

**ANOM-032 — Workflow OS à 11 statuts + état daté pdf-lib + rétention en dur 🟡**
- **Fichier** : `.planning/spec/ENTITIES_MAP/08-ged-comm-maintenance.md` §2/§3 (l.30, 42, 46), §4 GED-03 (l.55) ; `.planning/spec/ENTITIES_MAP/07-mutations-conseil.md` §2.3 (l.50).
- **Énoncé fautif** : « `service_orders` (42 col, workflow 11 statuts) » ; rétention codée en dur dans `calculate_document_expiration` (contrat=15, pv_ag/facture/diagnostic=10, reglement/plan=0) ; « `generate_etat_date` (v2, PDF pdf-lib…) ».
- **Décision qui prime** : G24-C9-P5/C17-6 (OS = 9 valeurs + transition gardée, refusé≠annulé), C14-6 (rétention = table éditable `document_retention_rules` + `is_permanent`), TECH-PDF (HTML→PDF headless, abandon pdf-lib) (verdicts **real**, conf. 0.82).
- **Pourquoi un agent serait piégé** : recréerait un enum OS à 11 valeurs, des durées de rétention en dur (un PV à vie redeviendrait purgeable à 10 ans), et un état daté en pdf-lib programmatique.
- **Correction suggérée** : OS = 9 valeurs + transition gardée ; rétention via table éditable lue par le trigger ; état daté en HTML→PDF headless.

---

### ⚪ White

---

**ANOM-033 — Carte de migration de DONNÉES depuis le live (GED) ⚪**
- **Fichier** : `.planning/db-cible/06-documents-ged.md` §6, l.312-329.
- **Énoncé fautif** : « migrer 51 docs (43+8)… Repris : id, copro_id, file_name… Migrer uniquement les 4 dossiers manuels… `document_links → document_relations` (29 lignes) ».
- **Décision qui prime** : DB-NEUVE / RECONCIL-LIVE (verdict **real**, conf. 0.82) — baseline 0001 par squash+clean du SCHÉMA ; seed via seed-to-golden (B10) ; le live MEURT GELÉ, pas de reprise de lignes.
- **Pourquoi un agent serait piégé** : écrirait des scripts de migration de données depuis le live gelé au lieu de régénérer la golden → travail mort + dépendance à une base abandonnée.
- **Correction suggérée** : remplacer la carte de DONNÉES par squash+clean schéma → 0001 → seed golden ; garder éventuellement la carte comme référence de FORME du remap.

---

**ANOM-034 — Reprise des ledger_tx du live « à l'identique » (maintenance) ⚪**
- **Fichier** : `.planning/db-cible/07-maintenance-tiers.md` §6.2/§7-1, l.426-441.
- **Énoncé fautif** : « Conserver `ledger_tx_id`… migrer l'état tel quel (immutabilité GL prime)… 1 paiement avec `ledger_tx_id` non NULL à conserver à l'identique ».
- **Décision qui prime** : DB-NEUVE / RECONCIL-LIVE (verdict **real**, conf. 0.88) — golden RECRÉÉE par seed-to-golden (B10) puis capturée ; le live meurt gelé sans reprise.
- **Pourquoi un agent serait piégé** : copierait des `ledger_tx` du live « pour préserver l'immutabilité » → import d'archéologie comptable contraire à la golden recréée à neuf. Note : le fichier 07 ne porte PAS le bandeau A1 « PAS de reprise du live » présent en tête de 02/03/05.
- **Correction suggérée** : équilibre GL prouvé en recréant la golden à neuf (PALIER-2/B10), pas en important les `ledger_tx` du live ; ajouter le bandeau A1 au fichier 07.

---

---

### Vague 2 (ANOM-035 → ANOM-107)

### 🔴 RED

**🔴 ANOM-035 — Glossaire technique : « pv_* posés par UPDATE front »**
- Fichier : `docs/claude/glossaire-technique.md` L52 (entrée « in_progress (repli AG) »)
- Énoncé fautif : « Les statuts `pv_*` sont posés par UPDATE front, pas par une fonction serveur » + _Avoid_ : « le poser via une fonction de transition serveur ».
- Décision qui prime : **C17-1** (real) — TOUS les statuts AG, y compris `pv_*`, passent EXCLUSIVEMENT par la RPC gardée `set_ag_status` + trigger base anti-UPDATE-status hors RPC. La doctrine v1 est explicitement bannie comme piège à copie.
- Pourquoi un agent serait piégé : le glossaire technique est canonique (lu avant de nommer/coder). Son jumeau business-rules.md:66 est déjà corrigé, mais ici la doctrine périmée survit ET son _Avoid_ proscrit la bonne pratique. Un implémenteur recopierait l'UPDATE front, contournant le verrou base.
- Correction suggérée : aligner L52 sur business-rules.md:66 / C17-1 — `pv_*` posés via `set_ag_status` uniquement, jamais par UPDATE front.

**🔴 ANOM-036 — ENUMS.md : `mutation_status` à 6 valeurs sans `sent_to_notary`**
- Fichier : `.planning/db-cible/ENUMS.md` §6.3 (l.317)
- Énoncé fautif : `mutation_status | draft, pre_etat_generated, etat_generated, signed, validated, cancelled` (6 valeurs, `sent_to_notary` absent du fichier entier).
- Décision qui prime : **C12-5** + **C17-6(c)** (real) — enum = 7 valeurs LIVE incluant `sent_to_notary` (déjà migré 0079) ; « ne pas documenter sur le dump 6 valeurs périmé » ; corriger la valeur fantôme `final_etat_generated`.
- Pourquoi un agent serait piégé : incohérence interne dans le même §6.3 — `mutation_step_key` inclut `envoi_notaire` (l.319) et C12-5 nomme la RPC `set_mutation_sent_to_notary`. Générer l'enum à 6 valeurs casse cette transition → 22P02.
- Correction suggérée : ajouter `sent_to_notary` (cible 7 valeurs alignée live), aligner sur C12-5/C17-6, vérifier la valeur fantôme `final_etat_generated`.

**🔴 ANOM-037 — INVENTAIRE-FONCTIONS : bypass admin câblé dans le portier ÉCRITURE**
- Fichier : `.planning/db-cible/INVENTAIRE-FONCTIONS.md` §F (l.106-111) + §P (l.193-197)
- Énoncé fautif : `user_is_copro_manager` pivot sur `role ∈ {gestionnaire, platform_admin}` ; `user_is_platform_admin()` « appelé en bypass par `user_has_copro_access` ET `user_is_copro_manager` » ; `platform_admin` traité comme rôle membership transverse.
- Décision qui prime : **C17-8(c)(d)** amendée **C16-4** (real, confidence 1) — table dédiée `platform_admins(user_id PK)` hors-tenant ; `platform_admin` retiré de l'enum `membership_role` ; bypass admin UNIQUEMENT sur le portier LECTURE, RETIRÉ du portier ÉCRITURE ; anti-cumul admin/gestionnaire en base.
- Pourquoi un agent serait piégé : générer ces 2 helpers depuis cet inventaire recrée mot pour mot la faille C16-4 (bypass GLOBAL R+W inter-tenant sur memberships). C'est le piège à copie de sécurité le plus grave de la grappe.
- Correction suggérée : `user_is_platform_admin()` lit `platform_admins` (pas memberships) ; bypass seulement dans `user_has_copro_access` (lecture) ; retirer `platform_admin` du set de rôles gestionnaire.

**🔴 ANOM-038 — catalogue-finance : le RÉALISÉ budgétaire « ne joint pas le ledger »**
- Fichier : `docs/claude/catalogue-finance.md` v_budgets_overview (l.263, l.350, l.353) + v_budget_lines_overview (l.358)
- Énoncé fautif : « total_spent = Σ budget_expenses.amount … la vue n'interroge donc PAS le ledger » ; « Suivi extra-comptable, ne touche pas le grand livre » ; « ne pas basculer sur total_spent sans décision métier ».
- Décision qui prime : **EXP-7** (real, confidence 1) — tout MONTANT (réalisé budget) se LIT dans le GL ; rebrancher v_budgets_overview/v_budget_lines_overview sur la classe 6 ; `budget_expenses` devient l'ENGAGÉ (posting de `validate_budget_expense` retiré, ANOM-12).
- Pourquoi un agent serait piégé : reconstruire ces deux vues « à l'identique » (le doc les marque RECREATE pour la migration 0036) recrée la double-vérité du réalisé qu'EXP-7 ferme. Touche la justesse des chiffres et les annexes. Distinct du déjà-connu (qui vise db-cible/02-03, fichier différent).
- Correction suggérée : marquer ces deux fiches « réalisé À REBRANCHER sur la classe 6 du GL (EXP-7) ; budget_expenses = ENGAGÉ seulement, posting retiré » ; retirer la règle « ne joint PAS le ledger ».

**🔴 ANOM-039 — DECISIONS.md (.planning) : « RLS off en dev = voulu »**
- Fichier : `.planning/DECISIONS.md` §D1 (l.51), section « Comportements VOLONTAIRES (NE PAS signaler comme bugs) »
- Énoncé fautif : « RLS désactivée en dev (~72/87 tables) = voulu. Bascule fail-open hors prod = voulue en dev. »
- Décision qui prime : **B5** + **RECONCIL-LIVE-2026-06-26** (real, confidence 1) — RLS ON+FORCE sur les tables sensibles dès la baseline v2, native dans la baseline 0001 de la base neuve ; plus de RLS-off-en-dev par défaut.
- Pourquoi un agent serait piégé : la consigne « ne pas signaler comme bug » est un piège à copie actif. Un agent générant la baseline neuve recopierait « RLS off en dev » et rouvrirait la faille que 0001 doit fermer nativement.
- Correction suggérée : marquer §D1 périmé — v2 = RLS ON+FORCE native dès 0001 (B5 / C16-4 / RECONCIL-LIVE).

**🔴 ANOM-040 — DECISIONS.md (racine) : RLS différée « à activer avant prod, Phase 1 »**
- Fichier : `DECISIONS.md` (racine) §D / l.129
- Énoncé fautif : « RLS désactivée sur ~72/87 tables = voulu en phase dev (à activer avant prod, Phase 1). »
- Décision qui prime : **B5** + **RECONCIL-LIVE-2026-06-26** (real, confidence 1) — RLS ON+FORCE native dans 0001 ; pas d'activation différée « avant prod ».
- Pourquoi un agent serait piégé : ce DECISIONS.md racine est déclaré (en-tête) comme le fichier lu avant de coder les tranches finance ; un agent reproduirait la RLS différée dans la base neuve. Artefact distinct du §D1 du .planning (autre fichier, autre numérotation).
- Correction suggérée : étiqueter/archiver ce DECISIONS.md racine comme registre v1 ; aligner §D sur RLS ON+FORCE native baseline 0001.

**🔴 ANOM-041 — Spec clôture-finalisation AG : `pv_*` posés par UPDATE front toléré**
- Fichier : `docs/superpowers/specs/2026-06-09-cloture-finalisation-ag-design.md` §3 décision 5 + §4 (L57-69) + hors-périmètre (L132-133)
- Énoncé fautif : « pv_generated / pv_signed / pv_sent : posés par le front (UPDATE direct, tolérés — transitions de gestion sans impact comptable) » ; « plier pv_* dans des RPC : toléré pour l'instant ».
- Décision qui prime : **C17-1** (real, confidence 1) — `set_ag_status` = seule voie d'écriture du status + trigger anti-UPDATE-status ; option « UPDATE front + trigger seul » explicitement écartée ; colonnes serveur `pv_signed_at`/`signed_by`.
- Pourquoi un agent serait piégé : la spec se présente comme « cycle canonique cible » ; un agent reconstruisant la finalisation recâblerait pv_* en UPDATE direct front, contournant le verrou base et l'horodatage serveur. Non marquée superseded ; fichier distinct du jumeau business-rules.md déjà corrigé.
- Correction suggérée : marquer la spec superseded par C17-1 ; retirer la décision 5 (« UPDATE direct toléré »), remplacer par « tous les statuts AG via set_ag_status ».

**🔴 ANOM-042 — Spec portefeuille : impayés = status sur call_for_funds**
- Fichier : `docs/superpowers/specs/2026-04-01-portefeuille-gestionnaire-design.md` §Données « Impayés » L158 + §KPIs L25
- Énoncé fautif : « Impayés : call_for_funds avec status = 'IMPAYE' ou solde restant > 0 », alimentant le KPI « Impayés totaux » et le score de criticité.
- Décision qui prime : **ARB-1** (real, confidence 1) — le solde 45x du GL est l'UNIQUE source du montant d'un impayé ; `call_for_funds_lines` ne fournit plus jamais un total (carnet d'âge seulement) ; vue d'ancienneté G24-T5.
- Pourquoi un agent serait piégé : calculer le montant depuis un status/solde sur call_for_funds recrée la divergence double-compteur (GL 4950 vs détail 4450) qu'ARB-1 interdit. Source de vérité financière.
- Correction suggérée : source impayés = vue d'ancienneté dérivée du solde 45x du GL ; supprimer toute lecture d'un status/total sur call_for_funds.

**🔴 ANOM-043 — TC_11 dashboard : Fonds travaux = 103+105**
- Fichier : `.planning/tests/TC_11_dashboard_portefeuille.md` TC-DASH-017 (l.234, l.237)
- Énoncé fautif : « Fonds travaux = provisions travaux (comptes 103+105, fonds ALUR/réserve) » ; « le fonds travaux du dashboard = réserve ALUR (décision USER 2026-06-08) ».
- Décision qui prime : **EXP-6** (real, confidence 0.95) — tuile « Fonds travaux » = compte 105 STRICT via `v_alur_fund_balance` ; le mélange 103 (avances/dette) + 105 (réserve acquise) est le BUG nommément corrigé (fausse les votes AG et le contrôle du minimum 5 % ARB-5).
- Pourquoi un agent serait piégé : le TC présente le pattern bugué comme règle métier attendue. Un agent générant `fn_dashboard_kpis` depuis ce TC reproduirait le double comptage.
- Correction suggérée : Fonds travaux = 105 STRICT, `v_alur_fund_balance` source unique sur les 3 surfaces (dashboard/balance/vue) ; jamais 103+105.

**🔴 ANOM-044 — BILAN_CADRAGE §5 : « patcher le live » comme prochaine action**
- Fichier : `.planning/BILAN_CADRAGE_2026-06-26.md` §5 « Recommandation finale — la prochaine action » (l.98-100)
- Énoncé fautif : « Fermer d'abord les deux portes ouvertes en prod (Étape 0). 1. Patcher l'escalade super-admin… 2. Poser FORCE sur les 87 tables + durcir le gate. »
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** (real, confidence 1 ; confirmée SESSION.md « plus de patch live séparé », CHANTIERS.md l.80) — le live meurt gelé, aucun patch ; sécurité native dans la baseline 0001.
- Pourquoi un agent serait piégé : c'est la recommandation-titre du bilan, l'instruction la plus susceptible d'être exécutée ; elle dirige vers des patchs sur un live gelé interdit par la décision du jour. (Comble le trou de la vague 1 — voir Complétude META-1.)
- Correction suggérée : réécrire §5 — prochaine action = Palier 0 (baseline 0001 sécurisée nativement) ; supprimer les points 1 et 2 ciblant le live.

### 🟠 ORANGE

**🟠 ANOM-045 — Blueprint 02 : RLS « ON prod / OFF dev » sans FORCE**
- Fichier : `.planning/db-cible/02-finance-grand-livre.md` §3 RLS (l.351)
- Énoncé fautif : « RLS ACTIVÉ partout … service_role bypass total (ON prod / OFF dev) » — FORCE absent de tout le §3.
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** + B5/E1/ANOM-01 (real, confidence 0.8) — RLS ON+FORCE natif baseline 0001 sur toutes les tables ; admin = authenticated sous RLS, jamais service_role.
- Pourquoi un agent serait piégé : « OFF dev » présente la RLS comme optionnelle, et l'absence de FORCE génère la faille (manager contourne ses propres policies) que la baseline doit fermer nativement.
- Correction suggérée : « RLS ON + FORCE natif baseline 0001 sur TOUTES les tables, aucune table sans FORCE » ; reformuler le bypass service_role (admin = session authenticated sous RLS).

**🟠 ANOM-046 — Blueprint 03 : RLS « OFF sur 8/10 tables, ON prod / OFF dev »**
- Fichier : `.planning/db-cible/03-budgets-appels-impayes.md` §3 RLS (l.312)
- Énoncé fautif : « RLS ACTIVÉ partout (aujourd'hui OFF sur 8/10 tables, volontaire en dev) … service_role bypass total (ON prod / OFF dev) » — pas de FORCE.
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** (real, confidence 0.78) — RLS ON+FORCE natif dans la baseline 0001.
- Pourquoi un agent serait piégé : un implémenteur générant les tables budgets/appels/impayés depuis ce blueprint recrée des tables sans FORCE (faux-vert n°2 « FORCE 5/87 »).
- Correction suggérée : « RLS ON + FORCE natif baseline 0001 » ; retirer le « OFF dev ».

**🟠 ANOM-047 — Blueprint 05 : `validate_mutation` auto-complète `cloture_compte`**
- Fichier : `.planning/db-cible/05-mutations-etat-date.md` §5 (l.288)
- Énoncé fautif : `validate_mutation` pose « step `signature_acte`/`cloture_compte=completed` ».
- Décision qui prime : **C12-4** + EXP-5 (real, confidence 0.9) — découpler : retirer `cloture_compte` du WHERE/portée de `validate_mutation` ; la clôture = `close_seller_account` séparé, pointage préventif jamais bloquant (issue payload si solde≠0, step `in_progress`).
- Pourquoi un agent serait piégé : auto-compléter `cloture_compte` masque le vrai contrôle de solde et recouple ce que C12-4 demande de découpler.
- Correction suggérée : retirer `cloture_compte=completed` de `validate_mutation` ; confier l'avancement à `close_seller_account`.

**🟠 ANOM-048 — Blueprint 05 : `avis_mutation_date` seulement sur `mutation_oppositions`**
- Fichier : `.planning/db-cible/05-mutations-etat-date.md` §1.3bis (l.142) ; absente de `mutations` (§1.1)
- Énoncé fautif : `avis_mutation_date` (déclencheur) portée uniquement sur `mutation_oppositions`.
- Décision qui prime : **C12-2** (real, confidence 0.9) — ajouter `avis_mutation_date` SUR `mutations` (saisissable tôt, déclenche le pré-état daté + todo dérivé) ; le 15j légal art.20 reste sur mutation_oppositions.
- Pourquoi un agent serait piégé : sans la colonne sur `mutations`, le déclencheur du pré-état daté et le todo dashboard n'ont pas de source ; l'avis ne peut être saisi avant qu'une opposition existe.
- Correction suggérée : ajouter `avis_mutation_date` sur `mutations` (déclencheur) ; garder le délai légal +15 sur mutation_oppositions + garde-fou de synchro.

**🟠 ANOM-049 — Carto 05 : « écriture GL de clôture » dans `validate_mutation` présentée comme défaut à corriger**
- Fichier : `.planning/db-cible/_cartographie/05-mutations-etat-date.md` §3 défaut #2 (l.191) + §5 (l.230)
- Énoncé fautif : « validate_mutation ne génère AUCUNE écriture… défaut métier #1 à corriger » / « régénère la chaîne avec écriture GL de clôture de compte ».
- Décision qui prime : **EXP-5** (real, confidence 0.95) — `validate_mutation` ne pose AUCUNE écriture (450 suit le lot via lot_owners + lot_id) ; clôture = pointage ; une écriture vendeur→acheteur DOUBLERAIT (faute). Option écriture de transfert ÉCARTÉE.
- Pourquoi un agent serait piégé : prendre ce verdict pour consigne ajouterait une écriture de clôture/transfert → double comptage du 450, contraire à EXP-5/D33/C12-4.
- Correction suggérée : marquer ce verdict PÉRIMÉ — l'absence d'écriture est VOULUE (lot-centric) ; recouvrement par opposition art.20, clôture = pointage non bloquant.

**🟠 ANOM-050 — MIGRATION-DONNEES : platform_admin posé comme « rôle » pour le seed**
- Fichier : `.planning/db-cible/MIGRATION-DONNEES.md` §2 (l.65)
- Énoncé fautif : « `platform_admin` : 1 profil équipe CoProFlex (rôle transverse, hors cabinet) pour opérer le seed ».
- Décision qui prime : **C16-4** (real, confidence 0.72) — super-admin = ligne dans la table dédiée `platform_admins(user_id PK)` hors-tenant, pas un rôle membership ; compte admin = authenticated normal.
- Pourquoi un agent serait piégé : le seed global poserait le super-admin comme rôle membership au lieu d'une ligne platform_admins, propageant le modèle périmé dans la baseline et le TEMPLATE-SEED.
- Correction suggérée : « 1 ligne platform_admins(user_id) pour l'opérateur du seed » ; le profil reste un user authenticated standard.

**🟠 ANOM-051 — Glossaire technique : escalade platform_admin = « flag hors flux » (piste)**
- Fichier : `docs/claude/glossaire-technique.md` L82 (entrée « Escalade platform_admin (faille E1) »)
- Énoncé fautif : « le rôle platform_admin (membership privilégié) … Pistes : le sortir vers un flag hors flux + introduire admin_cabinet distinct… ».
- Décision qui prime : **C16-4** (real, confidence 0.9) — TABLE DÉDIÉE `platform_admins(user_id PK)` hors-tenant (pas un flag/rôle) ; bypass lecture-seule tracé + break-glass ; anti-cumul en base ; enum laissé mort.
- Pourquoi un agent serait piégé : « flag hors flux » est présenté comme piste ouverte alors que la décision (table dédiée) est tranchée → risque de coder un flag/rôle.
- Correction suggérée : remplacer la « piste » par la décision C16-4 (table dédiée, bypass lecture-seule + break-glass, anti-cumul, enum mort).

**🟠 ANOM-052 — Glossaire technique : platform_admin = valeur d'enum membership_role**
- Fichier : `docs/claude/glossaire-technique.md` L17 (entrée « Multi-cabinet »)
- Énoncé fautif : « Rôles applicatifs = enum membership_role {gestionnaire, coproprietaire, platform_admin} ».
- Décision qui prime : **C16-4** (real, confidence 0.9) — `platform_admin` = table dédiée hors-tenant, enum laissé mort, jamais dérivé de memberships.
- Pourquoi un agent serait piégé : décrire platform_admin comme un rôle membership légitime invite à recoder la faille E1/C16-4 (super-admin dérivé de memberships sans copro_id).
- Correction suggérée : préciser que la valeur d'enum platform_admin est LAISSÉE MORTE ; super-admin dans `platform_admins(user_id PK)` hors-tenant.

**🟠 ANOM-053 — catalogue-finance : récit « migration 0036 sur le live + patch front Next »**
- Fichier : `docs/claude/catalogue-finance.md` en-tête + §1 + §6 (l.3, l.1632-1672)
- Énoncé fautif : « Confronte le code app … au schéma réel (0001→0035) … Les 15 vues forment le contenu de la migration 0036 … Créer la migration APRÈS les tables sources ».
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** + DB-NEUVE-V2 / C15-3 (real, confidence 0.82) — live gelé, aucun patch ; base v2 = projet neuf, baseline 0001 par squash+clean ; front v1 gelé.
- Pourquoi un agent serait piégé : prendre ce doc pour feuille de route ferait écrire une migration 0036 + patcher le src/ Next gelé au lieu de reconstruire en baseline 0001.
- Correction suggérée : bandeau « RÉFÉRENCE D'ARCHÉOLOGIE du live gelé — PAS une feuille de route ; le contenu correctness des vues = INTRANT à la baseline 0001, pas un patch du live/du src Next ».

**🟠 ANOM-054 — catalogue-finance : v_account_balances sur `accounts.initial_balance`**
- Fichier : `docs/claude/catalogue-finance.md` v_account_balances (l.1370, l.1405)
- Énoncé fautif : « on part du solde initial saisi sur le compte (accounts.initial_balance) … a.initial_balance + Σ bank_movements ».
- Décision qui prime : **D5** (real, confidence 0.9) — solde bancaire saisi UNE SEULE FOIS (vraie écriture d'ouverture à la reprise), juste l'IBAN à la création ; supprimer le champ `initial_balance` fantôme.
- Pourquoi un agent serait piégé : recréer la vue 0036 telle quelle ressuscite le champ fantôme et sort le solde bancaire du GL.
- Correction suggérée : le solde d'ouverture = vraie écriture d'ouverture (512/502) au GL, pas une colonne `accounts.initial_balance` à supprimer.

**🟠 ANOM-055 — catalogue-finance : trésorerie multi-512 par nature (512%/502%/5121%)**
- Fichier : `docs/claude/catalogue-finance.md` v_account_balances (l.1370, l.1414-1416, l.1423)
- Énoncé fautif : « comptes dont le code commence par 512, 502 ou 5121 … `a.code like '512%' or '502%' or '5121%'` … 512x courant vs 502x/5121x travaux ».
- Décision qui prime : **ARB-2** + EXP-6 + G24-T7 (real, confidence 0.82) — deux poches (512 courant + 502 ALUR), abandon du multi-512 par nature ; 512100/5121x = fantôme ; comptes bancaires sur `copro_bank_accounts` (fin du 512 en dur).
- Pourquoi un agent serait piégé : reprendre le filtre 512%/502%/5121% recrée le multi-512 par nature abandonné et le compte fantôme 5121x.
- Correction suggérée : deux poches via `copro_bank_accounts` (512 courant + 502 ALUR) ; retirer 5121x et l'axe « travaux » par sous-compte.

**🟠 ANOM-056 — CONTEXT.md : provider e-mail « canonique Resend »**
- Fichier : `CONTEXT.md` L162 (section GED/Communication)
- Énoncé fautif : « Messagerie / mails (canonique Resend) : l'envoi/réception transactionnel passe par public.mails (boîte Resend, 0022)… ».
- Décision qui prime : **E3-q** + C11-P2 (real, confidence 0.9) — emails = Brevo (recréé proprement, pas le code Resend v1) ; couple neutre provider+provider_message_id, pilote Brevo ; Brevo supersede Resend.
- Pourquoi un agent serait piégé : « canonique Resend » est un piège à copie — un implémenteur recâblerait Resend au lieu de Brevo (réécriture de toute la couche email). Incohérence interne : CONTEXT.md cite déjà Brevo ailleurs (L160).
- Correction suggérée : « provider e-mail = Brevo (E3-q/C11-P2), couple provider+provider_message_id, delivery_events source unique » ; boîte Resend v1 = gelée non reprise.

**🟠 ANOM-057 — Mémoire ui_ux_refonte_direction : « stack réelle Next.js 16 »**
- Fichier : `memory/ui_ux_refonte_direction.md` ligne 16
- Énoncé fautif : « frontend-design sur la stack RÉELLE (Next.js 16 + CSS Modules + docs/claude/design-system.md … JAMAIS Tailwind) ».
- Décision qui prime : **STACK-VERROUILLEE** (real, confidence 0.88) — stack v2 = TanStack Start 1.168.26 + react-router épinglés, React 19, Vite 8 ; refonte from-scratch dans v2-tanstack/ ; Next.js n'est plus la cible.
- Pourquoi un agent serait piégé : reconstruire l'UI gestionnaire/copro depuis cette note (toujours pointée comme direction active dans CHANTIERS.md:32) échafauderait des écrans Next.js (App Router/RSC) au lieu de TanStack Start.
- Correction suggérée : refonte UI dans v2-tanstack/ (TanStack Start, server functions), pas Next.js ; seul « CSS Modules, jamais Tailwind » reste valable.

**🟠 ANOM-058 — Spec portail copro (night_session) : RSC + RLS différée / filtrage applicatif**
- Fichier : `docs/superpowers/specs/2026-06-10-portail-coproprietaire-design.md` ligne 22 (cité sous le nom erroné « night_session_2026_06_10.md »)
- Énoncé fautif : « server-first RSC (RLS différée → filtrage applicatif obligatoire via getPortalContext()), V1 zéro-migration … RLS = gate de lancement » ; vues qui « renvoient TOUT sans RLS ».
- Décision qui prime : **B5** + D69/VIS-3CERCLES + C15-3 (real, confidence 0.85) — RLS ON+FORCE = gardien dès baseline v2 ; vues dédiées portail scopées par RLS, jamais filtrage applicatif ; portail v2 à RE-ÉCRIRE en TanStack, pas en RSC.
- Pourquoi un agent serait piégé : la spec (dossier specs/ actif, non archivée) rouvre la faille d'étanchéité et désigne la mauvaise stack.
- Correction suggérée : portail v2 = TanStack Start + RLS ON+FORCE native (baseline 0001) comme gardien ; pas de RLS différée/filtrage applicatif ni RSC.

**🟠 ANOM-059 — Spec mouvements-bancaires : v_account_balances sur initial_balance**
- Fichier : `docs/superpowers/specs/2026-04-03-mouvements-bancaires-design.md` §1.2 + §2.1
- Énoncé fautif : `a.initial_balance + SUM(bank_movements)` ; `CompteBancaire.soldeInitial` ; solde dashboard = initial_balance + Σ mouvements.
- Décision qui prime : **D5** (real, confidence 0.9) — supprimer le champ `initial_balance` fantôme ; solde bancaire = vraie écriture d'ouverture (GL).
- Pourquoi un agent serait piégé : construire v_account_balances depuis cette spec ressuscite le champ banni et sort le solde du grand livre (contredit « GL source unique »).
- Correction suggérée : dériver le solde de l'écriture d'ouverture 512/502 ; supprimer la dépendance au champ fantôme.

**🟠 ANOM-060 — Spec portefeuille : KPIs calculés côté client**
- Fichier : `docs/superpowers/specs/2026-04-01-portefeuille-gestionnaire-design.md` §Données (L150-166) + §Hors scope (L200-204)
- Énoncé fautif : KPIs portefeuille + score de criticité calculés CÔTÉ CLIENT depuis SELECT bruts ; « Authentification / rôle gestionnaire pas encore en place », un seul gestionnaire.
- Décision qui prime : **C16-5** (real, confidence 0.9) — tuer `usePortefeuille.calculateKPIs` ; cabinet_id dans v_dashboard_kpis ; v_cabinet_overview = pur SUM/GROUP BY en base ; RLS FORCE prérequis bloquant.
- Pourquoi un agent serait piégé : reconstruire le portefeuille en agrégeant côté client recrée le bug visé (total affiché ≠ somme des lignes) et ignore le contexte multi-rôle serveur (C15-5).
- Correction suggérée : v_cabinet_overview/v_dashboard_kpis agrégées en base avec cabinet_id ; impayés lus du GL (solde 45x).

**🟠 ANOM-061 — Spec banque-resolutions : stack Next.js + cabinet via profiles.cabinet_id**
- Fichier : `docs/superpowers/specs/2026-06-09-banque-resolutions-editable-design.md` L7 + §5.1 + §4.1
- Énoncé fautif : « Stack réelle : Next.js 16 + React 19 » ; provider dans `(dashboard)/layout.tsx` ; helper `user_is_cabinet_manager` dérivant le cabinet de `profiles.cabinet_id`.
- Décision qui prime : **STACK-VERROUILLEE** + C15-5 (real, confidence 0.82) — from-scratch dans v2-tanstack (Next gelé) ; cabinet dérivé du contexte serveur signé multi-rôle, pas d'une colonne.
- Pourquoi un agent serait piégé : implémenter cette feature reconstruit dans l'app Next morte ; le helper mono-colonne ignore le contexte serveur multi-rôle.
- Correction suggérée : porter la feature dans v2-tanstack (react-query + server functions) ; dériver le cabinet du contexte serveur signé (C15-5).

**🟠 ANOM-062 — Spec onboarding-clean-path : statut période `rejected`**
- Fichier : `docs/superpowers/specs/2026-06-01-wp5.1-periode-multietat-a-nouveau-design.md` §4 (L37-38) + §3.5
- Énoncé fautif : machine d'état période = `open|locked|closed|approved|rejected` ; « rejected = comptes rejetés en AG, retour possible en locked ».
- Décision qui prime : **D24** (real, confidence 0.9) — la base propre v2 ne reprend pas le statut non canonique `rejected` ; refus d'approbation = pas de 4e statut (tracé dans la résolution d'AG).
- Pourquoi un agent serait piégé : reconstruire la machine d'état période recréerait l'enum `rejected` et la transition `rejected→locked` que la base neuve doit exclure. (Note : `locked` reste légitime, seul `rejected` est à exclure.)
- Correction suggérée : baseline v2 = `open→…→closed→approved` sans `rejected` ; le refus est tracé dans la résolution d'AG.

**🟠 ANOM-063 — Spec phase1-resync-drift : patcher/graver le live en prod**
- Fichier : `docs/superpowers/specs/2026-06-04-phase1-resync-drift-design.md` (toute la spec : §1/§6/§7)
- Énoncé fautif : « figer le live iyfesbjnkpynmwlsmxnp », BAC1/2/3 appliqués en prod sur GO, patch can_access_document/cast_vote sur le live, « application prod lot par lot ».
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** (real, confidence 0.85) — le live meurt gelé, aucun patch ; tout reconstruit dans la baseline 0001 de la base neuve.
- Pourquoi un agent serait piégé : c'est un PLAN D'ACTION normatif (« on grave », « application prod sur GO ») non marqué résolu ; l'exécuter patche un live gelé.
- Correction suggérée : marquer « résolue par squash+clean DB-NEUVE-V2 » — gardes DEFINER, search_path, can_access_document droppée = natifs dans la baseline 0001, pas appliqués au live.

**🟠 ANOM-064 — MATRICE-LIAISON : AJOUTER user_is_platform_admin() appelé par les deux portiers**
- Fichier : `.planning/atlas/MATRICE-LIAISON.md` §3 RPC AUTORISATION/RLS (l.~77)
- Énoncé fautif : « `user_is_platform_admin()` | **AJOUTER** | (appelé par les 2 helpers ci-dessus) | nouveau, transverse » — les 2 helpers étant `user_is_copro_manager` (écriture) ET `user_has_copro_access` (lecture).
- Décision qui prime : **C17-8** + C16-4 (real, confidence 0.9) — table dédiée `platform_admins(user_id PK)` hors-tenant ; bypass UNIQUEMENT en lecture, retiré du portier écriture ; anti-cumul en base.
- Pourquoi un agent serait piégé : suivre cette « disposition cible » recrée précisément l'escalade (helper platform_admin branché sur le portier d'écriture, dérivé de memberships).
- Correction suggérée : super-admin = table dédiée `platform_admins(user_id PK)` ; bypass lecture seule, jamais appelé par le portier d'écriture.

**🟠 ANOM-065 — DECISIONS_CADRAGE : gouvernance « migrer le live qqfq »**
- Fichier : `.planning/DECISIONS_CADRAGE_2026-06-15.md` en-tête (l.3-6)
- Énoncé fautif : « Gouvernance : Option A — je n'applique AUCUNE migration sur le live qqfqrcolzmcbsvfaumiq ; je livre les .sql + gates, Lyes applique au déploiement ; tests sur branche Supabase jetable. »
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** + DB-NEUVE-V2 (real, confidence 0.88) — live gelé, aucun patch ; base v2 = projet neuf, baseline 0001 par squash+clean.
- Pourquoi un agent serait piégé : le doc est une liste de TODOs active (« à exécuter en J2-bis/J5 ») — un agent croirait devoir livrer des .sql à appliquer sur qqfq et tester sur une branche jetable.
- Correction suggérée : marquer PÉRIMÉ (v1) ou archiver dans _archive/ ; gouvernance v2 = base neuve, baseline 0001, live gelé.

**🟠 ANOM-066 — DECISIONS_CADRAGE : edge functions pour la logique métier état daté/mutation**
- Fichier : `.planning/DECISIONS_CADRAGE_2026-06-15.md` GED §5 (l.14) + État daté §10 (l.28)
- Énoncé fautif : « créer les edge functions manquantes generate_etat_date et validate_mutation » ; câbler des composants front du src/ v1 existant.
- Décision qui prime : **ARCHI-3COUCHES** (D22) (real, confidence 0.85) — navigateur→server function TanStack→RPC Postgres ; edge = cron+webhooks UNIQUEMENT ; logique métier en RPC SQL ; src/ v1 gelé.
- Pourquoi un agent serait piégé : un agent créerait des edge functions pour la logique métier (état daté/mutation) au lieu de RPC, et finaliserait le src/ v1 gelé.
- Correction suggérée : marquer ce fichier v1 périmé ; état daté/mutation = RPC SQL via server functions.

**🟠 ANOM-067 — DECISIONS_AUTONOMIE : étendre post_supplier_payment avec account_id 512 multi-comptes**
- Fichier : `.planning/DECISIONS_AUTONOMIE.md` §B (l.21)
- Énoncé fautif : « Sous-compte banque (512-x) au paiement … étendre post_supplier_payment pour accepter un account_id 512 cible (multi-comptes bancaires). »
- Décision qui prime : **ARB-2** (real, confidence 0.9) — deux poches (512 courant + 502 ALUR) ; abandon du multi-512 par nature ET du p_bank_account_id obligatoire au paiement.
- Pourquoi un agent serait piégé : recoder post_supplier_payment avec p_bank_account_id/multi-512, le chemin abandonné.
- Correction suggérée : marquer la question tranchée par ARB-2 (deux poches, pas de p_bank_account_id) ; supprimer le projet multi-512.

**🟠 ANOM-068 — DECISIONS_AUTONOMIE : secrets RESEND_*, edge email_webhook Resend**
- Fichier : `.planning/DECISIONS_AUTONOMIE.md` §B (l.33, l.55)
- Énoncé fautif : « Secrets à poser : RESEND_INBOUND_SECRET, RESEND_WEBHOOK_SECRET, REMINDERS_CRON_SECRET » + edge email_webhook Resend.
- Décision qui prime : **G24-C11-P2** + E3-q (real, confidence 0.8) — tracking fournisseur-agnostique, prestataire V1 = Brevo ; couple provider+provider_message_id remplace resend_id ; supersede « Resend câblé ».
- Pourquoi un agent serait piégé : recâblage e-mail sur Resend (stub faux-succès connu) au lieu de Brevo + adaptateur agnostique.
- Correction suggérée : renvoyer vers G24-C11-P2/E3-q — Brevo, couple provider/provider_message_id, secrets Brevo + DNS coproflex.fr.

**🟠 ANOM-069 — TC_01 onboarding : fonds ALUR créé sur 512100**
- Fichier : `.planning/tests/TC_01_onboarding.md` étape 4 (l.29) + TC-ONB-011 (l.179)
- Énoncé fautif : « crée le compte courant (512000) et le fonds travaux ALUR (512100) » ; « 2 comptes accounts créés (512000 / 512100 Fonds travaux ALUR) ».
- Décision qui prime : **ARB-2** + EXP-6 (real, confidence 0.9) — deux poches : 512 courant + 502 ALUR ; le 512100 est un compte fantôme jamais seedé.
- Pourquoi un agent serait piégé : recopier ce plan créerait le fonds ALUR sur 512100 (fantôme) au lieu de 502.
- Correction suggérée : remplacer 512100 par 502 (livret ALUR) ; seul compte payeur = 512 ; virement interne 502→512 avant paiement.

**🟠 ANOM-070 — TC_06 GED : 4 niveaux de confidentialité dont « Confidentiel »**
- Fichier : `.planning/tests/TC_06_documents_ged.md` TC-GED-016/017 (l.224, l.227)
- Énoncé fautif : « Choisir un niveau (Public / Conseil syndical / Syndic uniquement / Confidentiel) » ; « 4 niveaux de visibilité (public / conseil / syndic / confidentiel) ».
- Décision qui prime : **D44** + C14-5 (real, confidence 0.82) — 3 niveaux (public/conseil/gestionnaire) à droits réels par RLS ; abandon du 4e niveau ; enum `visibility` à 3 valeurs.
- Pourquoi un agent serait piégé : reconstruire la GED v2 recopierait 4 niveaux dont « Confidentiel » abandonné + nomenclature divergente (« syndic » vs « gestionnaire »).
- Correction suggérée : ramener à 3 niveaux (public/conseil/gestionnaire) ; retirer « Confidentiel » ; aligner sur `user_can_view_document` + enum 3 valeurs.

**🟠 ANOM-071 — TC_04 AG : pv_sent posé par UPDATE front**
- Fichier : `.planning/tests/TC_04_assemblees_generales.md` TC-AG-020 (l.300)
- Énoncé fautif : « pv_sent est posé par mise à jour front (transition de gestion) ».
- Décision qui prime : **C17-1** (real, confidence 0.9) — tous les statuts AG (y compris pv_*) via `set_ag_status`, verrou base anti-UPDATE.
- Pourquoi un agent serait piégé : un agent v2 recopierait l'UPDATE front pour pv_sent en écrivant le test/code, contournant le guichet.
- Correction suggérée : pv_sent (comme tous les statuts AG) transite par `set_ag_status` en v2 ; pas d'UPDATE front.

**🟠 ANOM-072 — TRIAGE_PARTIE_C : régularisation N+1 via 672/772**
- Fichier : `.planning/TRIAGE_PARTIE_C_2026-06-24.md` C.7 (l.233)
- Énoncé fautif : « 672/772 datés N+1 tracés par un source_type explicite » pour la régularisation d'un oubli sur exercice approuvé.
- Décision qui prime : **G24-C7-P5** + EXP-2 (real, confidence 0.95) — régularisation post-AG = charge 678 / produit 718 ; bannir 672/772 (vocabulaire PCG faux, inexistant en copro).
- Pourquoi un agent serait piégé : copier ces codes poserait des écritures de régularisation sur 672/772 (comptes faux), faussant le résultat N+1 et l'annexe 2.
- Correction suggérée : remplacer « 672/772 » par « 678/718 » ; renvoyer à G24-C7-P5/EXP-2 ; marquer la ligne tranchée.

**🟠 ANOM-073 — CARTOGRAPHIE_CONTEXTE : régularisation post-approbation via 672/772**
- Fichier : `.planning/CARTOGRAPHIE_CONTEXTE_v2_2026-06-24.md` C.7 (~l.293, finding pointait l.233)
- Énoncé fautif : « Régularisation via 672 (charges) / 772 (produits) … Entre dans le résultat N+1 ».
- Décision qui prime : **EXP-2** (real, confidence 0.9) — régul en avant N+1 charge→678 / produit→718 ; bannir 672/772 ; gap chart = ajouter 718, corriger 677.
- Pourquoi un agent serait piégé : codes comptables faux recopiés dans la RPC de régularisation N+1.
- Correction suggérée : aligner sur EXP-2/G24-C7-P5 — 678/718, jamais 672/772.

**🟠 ANOM-074 — TRIAGE_PARTIE_C : multi-512 par nature + p_bank_account_id obligatoire**
- Fichier : `.planning/TRIAGE_PARTIE_C_2026-06-24.md` C.6 (l.221)
- Énoncé fautif : « défaut (travaux→512100, courant→512000) … imposer p_bank_account_id obligatoire sur toutes les RPC de décaissement ».
- Décision qui prime : **ARB-2** (real, confidence 0.82) — deux poches (512 courant + 502 ALUR, virement interne 502→512) ; abandon du multi-512 par nature ET du p_bank_account_id obligatoire ; réécrire D21/D67/G24-T7.
- Pourquoi un agent serait piégé : recâbler les RPC de décaissement avec p_bank_account_id obligatoire + compte 512100 (fantôme EXP-6), reconstruisant l'archi abandonnée.
- Correction suggérée : modèle deux poches ARB-2 ; supprimer p_bank_account_id obligatoire et toute mention 512100.

**🟠 ANOM-075 — TC_04 AG : résolutions standard via createStandardResolutions**
- Fichier : `.planning/tests/TC_04_assemblees_generales.md` Chaînes RPC câblées (l.35-39)
- Énoncé fautif : « Création des résolutions standard = boucle d'addResolution (createStandardResolutions), PAS un appel unique create_ag_with_standard_resolutions ».
- Décision qui prime : **D28** (real, confidence 0.62) — rupture racine : `createStandardResolutions` crée les résolutions SANS `action_type` → pilier AG→copro cassé ; v2 = `create_ag_with_standard_resolutions` (qui pose action_type).
- Pourquoi un agent serait piégé : le test documente le chemin bug-racine comme câblage de fait ET nie activement la RPC cible, sans marqueur anti-patron.
- Correction suggérée : marquer `createStandardResolutions` comme anti-patron v1 ; cible v2 = `create_ag_with_standard_resolutions` ; aligner TC-AG-003/015/017.

**🟠 ANOM-076 — PLAN_GOLDEN §8 : campagne exécutée/migrée sur le live qqfq**
- Fichier : `.planning/tests/PLAN_GOLDEN_EXHAUSTIF.md` §8 Gouvernance (l.450-454) + en-tête
- Énoncé fautif : « Claude applique les migrations via MCP Supabase » ; « Live cloud qqfqrcolzmcbsvfaumiq (≥ 0087) ; vérifier fn_annexe ≥ 0075 » ; BEGIN/ROLLBACK sur le live.
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** (real, confidence 0.9) — live gelé, aucun patch ; v2 = base neuve, baseline 0001 ; tests contre la base neuve.
- Pourquoi un agent serait piégé : le « document de référence unique de la campagne » dirige vers le live gelé pour appliquer des migrations et y faire tourner les tests.
- Correction suggérée : rebaser la campagne sur le projet neuf v2 (baseline 0001) ; live = référence gelée en lecture seule.

**🟠 ANOM-077 — PLAN_TEST_MASTER : cloud live « RLS activé et forcé » + compte password123**
- Fichier : `.planning/tests/PLAN_TEST_MASTER.md` §2 Environnement (l.46-59)
- Énoncé fautif : « branchée sur la vraie base de production (cloud) » ; « cloud live Supabase qqfqrcolzmcbsvfaumiq (RLS activé et forcé) » ; « lyes.triki@coproflex.fr / password123 ».
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** + BILAN-FAUXVERT + E7-q (real, confidence 0.72) — live gelé ; RLS « ON+FORCE » FAUX sur le live (FORCE 5/87) ; sécurité native baseline 0001 ; compte démo password123 à retirer.
- Pourquoi un agent serait piégé : un testeur v2 brancherait un environnement périmé et insécure (live non réellement forcé + password123) au lieu de la base neuve.
- Correction suggérée : pointer la campagne sur la base neuve ; retirer « live RLS forcé » ; supprimer password123 au profit d'un compte de test non en clair.

**🟠 ANOM-078 — PLAN_GOLDEN / TC_04 : minimum ALUR = MAX(2,5% PPT ; 5% budget) sans PPT**
- Fichier : `.planning/tests/PLAN_GOLDEN_EXHAUSTIF.md` §5.2 (l.246) + TC_04 (l.122)
- Énoncé fautif : « ALUR minimum légal = MAX(2,5 % PPT ; 5 % budget) = MAX(2 500 ; 2 500) = 2 500 » — la branche 2,5% PPT matérialisée alors qu'aucun PPT n'est adopté dans le golden.
- Décision qui prime : **ARB-5** + EXP-1 (real, confidence 0.82) — 5% budget = plancher TOUJOURS ; la branche 2,5% s'active SEULEMENT si un PPT est adopté ET porte sur le MONTANT TRAVAUX du PPT (jamais le budget).
- Pourquoi un agent serait piégé : recopier la formule où 2,5% porte sur le budget et où MAX PPT s'applique sans PPT (les 2 notes fausses qu'ARB-5/EXP-1 corrigent).
- Correction suggérée : sans PPT, minimum = 5% du budget seul ; avec PPT = MAX(5% budget ; 2,5% du MONTANT TRAVAUX du PPT).

**🟠 ANOM-079 — TC_03 : paiement fournisseur demande « choisir le compte à débiter »**
- Fichier : `.planning/tests/TC_03_finance_factures_banque_compta.md` TC-FIN-CPT-005 (l.104)
- Énoncé fautif : « choisir le compte bancaire à débiter » (p_bank_account_id) lors du paiement fournisseur via post_supplier_payment.
- Décision qui prime : **ARB-2** (real, confidence 0.9) — un seul compte courant payeur 512 ; abandon de p_bank_account_id obligatoire ; puiser l'épargne = virement interne 502→512 avant paiement.
- Pourquoi un agent serait piégé : recâbler post_supplier_payment avec un sélecteur de compte obligatoire (le test sert de spec comportementale).
- Correction suggérée : en v2 le paiement part toujours du 512 courant (pas de sélecteur) ; supprimer l'étape « choisir le compte à débiter ».

**🟠 ANOM-080 — CARTOGRAPHIE_CONTEXTE : super-admin = flag profiles.is_platform_admin**
- Fichier : `.planning/CARTOGRAPHIE_CONTEXTE_v2_2026-06-24.md` C.16 (l.439) + C.17 (l.446)
- Énoncé fautif : « Sortir platform_admin de memberships → flag profiles.is_platform_admin (ou table dédiée) » ; « escalade platform_admin … planifiée (E1) ».
- Décision qui prime : **C16-4** (amende C17-8) (real, confidence 0.78) — table dédiée `platform_admins(user_id PK)` hors-tenant ; la colonne profiles est auto-modifiable (risque d'auto-promotion) → écartée ; sécurité native baseline 0001 (plus rien à « planifier »).
- Pourquoi un agent serait piégé : poser un flag is_platform_admin sur profiles (modèle écarté car auto-promouvable) au lieu de la table dédiée hors-tenant.
- Correction suggérée : table dédiée `platform_admins(user_id PK)` ; retirer la variante profiles ; sécurité native baseline 0001.

### 🟡 YELLOW

**🟡 ANOM-081 — Blueprint 02 : affectation du résultat sur comptes 110/120 codés en dur**
- Fichier : `.planning/db-cible/02-finance-grand-livre.md` §0.2 (l.55-69) + invariant `assert_result_allocation_split`
- Énoncé fautif : « résultat se ventile par NATURE sur 110 (travaux) / 120 (courant) … D120/C450-1 … D110/C450-2 ».
- Décision qui prime : **EXP-2** (real, confidence 0.85) — finir le renommage 110→12 / 120→478 ; le report travaux passe par le compte 12, le courant par 478.
- Pourquoi un agent serait piégé : 110/120 sont codés en dur jusque dans l'invariant bloquant — fige le verrou sur du vocabulaire mort, l'assertion testerait les mauvais comptes.
- Correction suggérée : réconcilier le couple de report (110→12, 120→478) avant de figer `v_result_allocation_split`/`assert_result_allocation_split`.

**🟡 ANOM-082 — Blueprint 05 : payload état daté sans repartition_note art.6-2**
- Fichier : `.planning/db-cible/05-mutations-etat-date.md` §1.3 (l.119) + §5 (l.286)
- Énoncé fautif : payload immuable avec `legal_reference='art.5 décret 67-223'` seul, pas de `repartition_note` ni art.6-2.
- Décision qui prime : **C12-3** (real, confidence 0.9) — figer une `repartition_note` art.6-2 + enrichir `legal_reference` (art.5 + art.6-2) dans le payload immuable.
- Pourquoi un agent serait piégé : sans repartition_note/art.6-2, la pièce probante n'explicite pas la répartition charges vendeur/acquéreur (manque opposable, payload immuable une fois émis).
- Correction suggérée : ajouter `repartition_note` (art.6-2) et étendre `legal_reference` à « art.5 + art.6-2 » (attention : slot front note déjà occupé par alur_note → 2e slot/fusion).

**🟡 ANOM-083 — Carto 02 : §5 MIGRATION reprise de données live**
- Fichier : `.planning/db-cible/_cartographie/02-finance-grand-livre.md` §5 (l.164-167)
- Énoncé fautif : « Reprendre uniquement gold 22222222 + immuable 11111111 … Point dur : les 6 écritures 450/lot_id NULL … Décision USER nécessaire pour la copro immuable ».
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** + A1 (real, confidence 0.82) — live gelé, aucune reprise ; copro-template from-scratch.
- Pourquoi un agent serait piégé : §5 donne des instructions de reprise (« données à reprendre », « décision USER nécessaire ») qui pousseraient à migrer le live au lieu de la golden seedée.
- Correction suggérée : marquer §5 PÉRIMÉE (carto = photo live 2026-06-04, supersédée par A1 + RECONCIL-LIVE).

**🟡 ANOM-084 — Carto 03 : §5 MIGRATION reprise ligne-à-ligne**
- Fichier : `.planning/db-cible/_cartographie/03-budgets-appels-impayes.md` §5 (l.262-283)
- Énoncé fautif : tableau de reprise 22222222/11111111 + « Reprendre weight_snapshot / ledger_tx_id tel quel ».
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** + A1 (real, confidence 0.85) — live gelé, aucune reprise ; copro-template via chaîne canonique. Le blueprint cible 03 §6 (l.390) tranche déjà « PAS de reprise ».
- Pourquoi un agent serait piégé : la carto reste un plan de migration concurrent non flaggé qu'un agent pourrait suivre.
- Correction suggérée : marquer §5 PÉRIMÉE (supersédée par A1/RECONCIL-LIVE).

**🟡 ANOM-085 — Carto 05 : §5 MIGRATION reprise état daté/legal_proceedings**
- Fichier : `.planning/db-cible/_cartographie/05-mutations-etat-date.md` §5 (l.213-231)
- Énoncé fautif : « données à reprendre », « OUI (11111111) », « reprendre le payload tel quel ».
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** + A1 (real, confidence 0.82 ; cf. MIGRATION-DONNEES.md « PAS de reprise du live ») — base neuve, seed-to-golden Tilleuls.
- Pourquoi un agent serait piégé : tenter de migrer l'état daté figé/legal_proceedings du live (effort inutile + données de test parasites).
- Correction suggérée : marquer §5 PÉRIMÉE ; renvoyer vers MIGRATION-DONNEES.md/A1.

**🟡 ANOM-086 — Carto T1 : can_access_document / user_can_view_document à GARDER (ACL fine)**
- Fichier : `.planning/db-cible/_cartographie/T1-fonctions.md` §G (l.156-157)
- Énoncé fautif : `can_access_document` GARDER ; `user_can_view_document` GARDER, dépend de `document_access` (ACL fine ligne-à-ligne).
- Décision qui prime : **C14-5** (A4) (real, confidence 0.82) — confidentialité GED simple 3 niveaux (`visibility`) ; `document_access` DROP séquencé ; `can_access_document` DROP sec ; `user_can_view_document` réécrite sur `visibility`.
- Pourquoi un agent serait piégé : copier T1 ressuscite l'ACL fine abandonnée et la fonction cassée (réfère copro_members inexistante). Atténué : INVENTAIRE + OBJETS-ABANDONNES corrigent déjà.
- Correction suggérée : marquer T1 snapshot legacy supersédé par INVENTAIRE-FONCTIONS (Q.6 + §J) et OBJETS-ABANDONNES §1.1 ; ne pas générer depuis T1.

**🟡 ANOM-087 — Carto T3 : document_access classé « À GARDER »**
- Fichier : `.planning/db-cible/_cartographie/T3-objets-abandonnes.md` §B (l.71)
- Énoncé fautif : « document_access (TABLE) | 0 | (b) lib/documents/api.ts l.580/598 ; (c) edge get_document_url … GARDER. »
- Décision qui prime : **C14-5** (A4) (real, confidence 0.86) — document_access DROP séquencé après réécriture user_can_view_document + rebranchement front/edge ; ACL fine disparaît.
- Pourquoi un agent serait piégé : copié, il maintient l'ACL fine abandonnée. Atténué : OBJETS-ABANDONNES §1.1 a déplacé document_access en ABANDONNÉ.
- Correction suggérée : marquer T3 snapshot legacy supersédé par OBJETS-ABANDONNES PARTIE 1 (document_access ABANDONNÉ A4).

**🟡 ANOM-088 — Glossaire technique : live « RLS ON mais pas FORCE (à durcir) »**
- Fichier : `docs/claude/glossaire-technique.md` L16 (entrée « CoProFlex live qqfq »)
- Énoncé fautif : « RLS ON mais pas FORCE (à durcir), 0 edge déployée… ».
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** (real, confidence 0.72) — live gelé jamais patché ; RLS ON+FORCE native dans la baseline 0001 ; « à durcir » périmé.
- Pourquoi un agent serait piégé : « (à durcir) » suggère un patch du live, condamné ; peut faire perdre du temps à durcir un projet gelé.
- Correction suggérée : live qqfq GELÉ (référence, jamais patché) ; RLS ON+FORCE native dans la baseline 0001 v2.

**🟡 ANOM-089 — Glossaire technique : constat live « FORCE seulement sur 6 tables »**
- Fichier : `docs/claude/glossaire-technique.md` L80 (entrée « RLS ON + FORCE »)
- Énoncé fautif : « Constat live : ON quasi partout mais FORCE seulement sur 6 tables du noyau comptable » + _Avoid_ « étanchéité non prouvée en réel ».
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** (real, confidence 0.78) — live gelé sans patch ; RLS ON+FORCE sur TOUTES les tables native baseline 0001.
- Pourquoi un agent serait piégé : le « constat live (FORCE N tables) à corriger » est périmé en tant que to-do ; un agent pourrait croire devoir durcir le live.
- Correction suggérée : remplacer le « constat live » par l'exigence baseline 0001 v2 = RLS ON+FORCE sur toutes les tables sensibles dès la création.

**🟡 ANOM-090 — business-rules : workflow OS en libellés FR figés (6 statuts)**
- Fichier : `docs/claude/business-rules.md` L28-34 (« Workflow Ordres de Service »)
- Énoncé fautif : « BROUILLON → ENVOYE → EN_ATTENTE_PRESTATAIRE → INTERVENTION_PROGRAMMEE → INTERVENTION_REALISEE → CLOTURE ↘ ANNULE » (6 statuts).
- Décision qui prime : **C17-6** (real, confidence 0.95) — enum 9 canonique EN (draft→sent→awaiting_provider→scheduled→in_progress→completed→closed + refused, cancelled) ; refusé≠annulé ; facturé/payé = dérivé hors enum ; FR = affichage seulement. C17-6 nomme « business-rules.md 6 » comme à corriger.
- Pourquoi un agent serait piégé : recopier une machine OS à 6 valeurs FR figées (sans in_progress, sans refused distinct), divergeant de l'enum service_order_status à 9 valeurs.
- Correction suggérée : enum canonique EN à 9 valeurs ; FR=affichage seulement ; refused≠cancelled.

**🟡 ANOM-091 — modules.md : architecture en 8 modules legacy (Ventes & Impayés fusionnés)**
- Fichier : `docs/claude/modules.md` L3-33 (« Modules fonctionnels »)
- Énoncé fautif : 8 modules dont « Ventes & Impayés » fusionnés.
- Décision qui prime : **UX-HUBS** + D37 (real, confidence 0.85) — 6 hubs métier + Accueil ; remplace les ~12 zones éclatées ; Recouvrement séparé de Ventes & Mutations.
- Pourquoi un agent serait piégé : ce doc auto-importé dans CLAUDE.md pourrait faire reconstruire la nav v1 éclatée et re-fusionner Recouvrement/Ventes (contraire à D37).
- Correction suggérée : réécrire en 6 hubs + Accueil ; Recouvrement distinct de Ventes & Mutations ; noter que modules.md décrit l'ancien découpage v1.

**🟡 ANOM-092 — Spec banque-resolutions : stack Next.js (en-tête, doublon contextuel)**
- Fichier : `docs/superpowers/specs/2026-06-09-cloture-finalisation-ag-design.md` L6 + L131-133 (stack)
- Énoncé fautif : spec ancrée sur l'ancienne app (Next.js, src/features, finalisation.api.ts gelé) ; tolère les UPDATE directs de gestion ; aucune mention v2-tanstack.
- Décision qui prime : **STRUCTURE-FROMSCRATCH** + C17-1 (real, confidence 0.62) — from-scratch dans v2-tanstack ; ancien src/ gelé jeté au go-live.
- Pourquoi un agent serait piégé : lue comme plan de build, inciterait à patcher le src/ gelé au lieu de reconstruire dans v2-tanstack.
- Correction suggérée : bandeau « historique v1-DB, ne pas exécuter tel quel en v2 ; reconstruire via set_ag_status dans v2-tanstack ».

**🟡 ANOM-093 — Spec conformité-2026 : module Conformité = hub séparé + mocks**
- Fichier : `docs/superpowers/specs/2026-04-12-conformite-2026-design.md` §2.1 + §5.4 + §8
- Énoncé fautif : entrée nav niveau 1 « Conformité 2026 » ; PPT/DPE/Factur-X en mocks (data/mock/conformite.ts) ; Supabase + génération XML hors périmètre v1 ; arbo Next.js.
- Décision qui prime : **UX-HUBS** + D39/D54/D55 (real, confidence 0.88) — 6 hubs (pas de 7e hub Conformité) ; données réelles persistées ; Factur-X = ingestion réelle.
- Pourquoi un agent serait piégé : reconstruire une entrée nav séparée + données mock recrée l'architecture éclatée et les mocks que la refonte bannit.
- Correction suggérée : replacer PPT/DPE/Factur-X dans les hubs (Maintenance/Documents&comm) + dashboard conformité agrégé non bloquant (D54/D56) ; supprimer les mocks ; Factur-X = ingestion réelle (C14-4).

**🟡 ANOM-094 — Spec conformité-2026 : DPE par copro + PPT module autonome**
- Fichier : `docs/superpowers/specs/2026-04-12-conformite-2026-design.md` §4 + §3
- Énoncé fautif : DPE 1 par copropriété (`IDPE.coproprieteId`) ; PPT module autonome sur `TravauxPrevisionnel` mocké.
- Décision qui prime : **D54** (real, confidence 0.9) — DPE 1 par BÂTIMENT versionné ; PPT = couche de planification au-dessus des opérations réelles (operation_id), pas une 3e source.
- Pourquoi un agent serait piégé : modéliser DPE par copro et PPT comme source autonome recrée le modèle mock que D39/D54 corrigent.
- Correction suggérée : DPE rattaché au bâtiment versionné ; PPT connecté aux operations (operation_id) + fonds ALUR + vote AG.

**🟡 ANOM-095 — Spec portail copro : référence au plan PLAN_MAITRE archivé + RSC + RLS différée**
- Fichier : `docs/superpowers/specs/2026-06-10-portail-coproprietaire-design.md` L5 + §5 + §8
- Énoncé fautif : « Lecture préalable : .planning/PLAN_MAITRE_VUE_COPROPRIETAIRE.md » ; portail bâti sur src/app Next 16 RSC + RLS différée (gate de lancement).
- Décision qui prime : **BILAN-PURGE-CONTRADICTIONS** + RECONCIL-LIVE (real, confidence 0.8) — PLAN_MAITRE archivé, remplacé par C15 portail + stack v2 TanStack + RLS FORCE native.
- Pourquoi un agent serait piégé : s'appuyer sur le plan archivé + src/app Next réintroduit la stack Next + le modèle « RLS différée à réactiver ».
- Correction suggérée : réancrer sur C15 (portail) + RLS FORCE native baseline 0001 + v2-tanstack ; retirer la dépendance au plan archivé.

**🟡 ANOM-096 — TRIAGE_PARTIE_C : reverse_ledger_transaction exposé + unallocate_payment sans p_reason**
- Fichier : `.planning/tests/PLAN_GOLDEN_EXHAUSTIF.md` §3.4 (l.194) + §9 risque 6 (l.465)
- Énoncé fautif : `reverse_ledger_transaction` présenté comme contre-passation exposée ; `unallocate_payment (0087)` « interne » sans p_reason obligatoire.
- Décision qui prime : **C17-2** (real, confidence 0.62) — motif OBLIGATOIRE refusé si vide au niveau RPC, étendu à toutes les annulations (+ p_reason sur unallocate_payment) ; reverse_ledger_transaction reste interne (guichet gardé) ; 2 wrappers front.
- Pourquoi un agent serait piégé : traiter reverse_ledger_transaction comme exposé et oublier p_reason obligatoire (faible risque — plan de test du live v1).
- Correction suggérée : noter que ces fonctions sont au comportement v1 (live gelé) ; cible v2 = p_reason obligatoire partout + reverse_ledger_transaction interne only.

**🟡 ANOM-097 — TC_06 GED : journal d'accès = store mémoire non persistant**
- Fichier : `.planning/tests/TC_06_documents_ged.md` TC-GED-016 cas limite (l.226)
- Énoncé fautif : panneau Droits d'accès « écrit dans un store en mémoire, PAS dans Supabase … non persistant » présenté comme limite connue à tolérer.
- Décision qui prime : **C14-1** (real, confidence 0.85) — journal d'accès = table réelle `document_access_log` (RLS gestionnaire-only, purge 1 an, server function unique) + RPC `set_document_visibility` sur 3 niveaux SQL ; cloisonnement bloquant go-live (C14-5).
- Pourquoi un agent serait piégé : conserver le store mémoire non persistant au lieu de la table réelle, ratant un livrable bloquant go-live.
- Correction suggérée : visibilité persistée via `set_document_visibility` (3 niveaux SQL) ; accès journalisés en table `document_access_log` ; ne pas reproduire le store mémoire.

**🟡 ANOM-098 — DECISIONS_AUTONOMIE : stratégie PDF = jsPDF (bump jspdf 3→4)**
- Fichier : `.planning/DECISIONS_AUTONOMIE.md` §B deps (l.34)
- Énoncé fautif : « jspdf 3→4.2.1 (revalider ~25 générateurs PDF) ».
- Décision qui prime : **PDF-STRATEGY** (AM1/TECH-1) (real, confidence 0.85) — v2 = HTML→PDF (templates HTML → moteur headless Chrome/Puppeteer en server function).
- Pourquoi un agent serait piégé : reconstruire des générateurs jsPDF v1 au lieu de HTML→PDF.
- Correction suggérée : acter PDF-STRATEGY (HTML→PDF) ; les bumps jsPDF sont sans objet en v2.

**🟡 ANOM-099 — DECISIONS.md (.planning) §B3 : conserver le compte interne 120/110**
- Fichier : `.planning/DECISIONS.md` §B3 (l.78-84)
- Énoncé fautif : compte d'attente interne « 120 »/« 110 » à conserver comme transit courant, à renommer 110→« 12 » en J5.
- Décision qui prime : **EXP-2** (real, confidence 0.78) — courant→450, travaux gelé sur 12 ; finir 110→12 / 120→478 (110/120 = résidus à nettoyer, pas un modèle à reconstruire).
- Pourquoi un agent serait piégé : recréer un compte interne 120/110 dans la base neuve au lieu d'utiliser 12/478. (§B3 porte le statut « PROPOSÉ », ce qui atténue.)
- Correction suggérée : acter dans le registre v2 que 110→12 et 120→478 ; ne pas recréer un compte interne 120.

**🟡 ANOM-100 — DECISIONS_AUTONOMIE : faille IDOR GoCardless « à patcher J2-bis » sur le live**
- Fichier : `.planning/DECISIONS_AUTONOMIE.md` §B (l.31)
- Énoncé fautif : faille IDOR requisition↔copro « à faire avec le chantier rapprochement bancaire (J2-bis) » via table bank_requisitions ajoutée.
- Décision qui prime : **D7** + RECONCIL-LIVE (real, confidence 0.78) — GoCardless conservé mais correction IDOR native (base/architecture neuve), pas un patch différé sur le live.
- Pourquoi un agent serait piégé : seul le cadre « patch J2-bis sur le live » est périmé ; la correction reste requise.
- Correction suggérée : rattacher la correction IDOR à D7 dans la construction v2 (table de rattachement native), pas un patch live.

**🟡 ANOM-101 — Spec onboarding-clean-path : réparer src/ v1 + golden 22222222**
- Fichier : `docs/superpowers/specs/2026-06-02-onboarding-clean-path-design.md` L2 + Track B §6
- Énoncé fautif : réparer le parcours d'onboarding du src/ existant (api.ts) + boucle d'or 22222222 / create_test_copro ; « data prod existante sale à migrer ».
- Décision qui prime : **STRUCTURE-FROMSCRATCH** (real, confidence 0.82) — from-scratch dans v2-tanstack ; ancien src/ gelé ; base neuve squash+clean quasi vide, pas de migration de data prod.
- Pourquoi un agent serait piégé : patcher le src/ gelé au lieu de reconstruire en v2 (white/advisory).
- Correction suggérée : conserver les briques canoniques (provision_copro_chart, post_budget_call_for_funds) ; réécrire la couche TS dans v2-tanstack contre la golden Tilleuls (A7), pas patcher le src gelé.

**🟡 ANOM-102 — TC_09 : échelle de relance 4 niveaux figée + grain par appel**
- Fichier : `.planning/tests/TC_09_ventes_impayes.md` TC-IMP-001 (l.242) + TC-IMP-010
- Énoncé fautif : « Niveaux de relance : J+15/J+30/J+60/J+90 (1ère relance / 2ème relance / mise en demeure / contentieux) » présenté comme règle métier, mapping statut par lot/par appel.
- Décision qui prime : **D16** + D59 (real, confidence 0.82) — relances centralisées dans Recouvrement, grain = solde global par lot (échéance la plus ancienne), abandon du grain par appel ; lettre consolidée par personne ; échelle 7 stades. (La cadence J+15/30/60/90 reste valable pour les stades amiables.)
- Pourquoi un agent serait piégé : reprendre le grain par appel v1 et l'échelle 4-niveaux figée (« J+90 = contentieux » = l'heuristique fragile remplacée).
- Correction suggérée : grain = solde global par lot, lettre consolidée par personne (D16), échelle 7 stades (D59) ; J+15/30/60/90 reste pour les stades amiables 1-2.

### ⚪ WHITE

**⚪ ANOM-103 — Blueprint 02 : « corriger le verdict live anon 189/190 »**
- Fichier : `.planning/db-cible/02-finance-grand-livre.md` §3 matrice (l.377) + §5 (l.402)
- Énoncé fautif : « anon = aucun accès … Corrige le verdict T1 (189/190 fonctions exposées anon) » ; garde « REVOKE EXECUTE FROM anon » cadrée comme patch live.
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** (real, confidence 0.82) — 0 grant anon natif baseline 0001 ; rien à « corriger » sur le live gelé.
- Pourquoi un agent serait piégé : cosmétique — la cible (0 anon) est correcte, mais « corriger le verdict live » est un récit périmé.
- Correction suggérée : « natif baseline 0001 » au lieu de « corrige le verdict live » ; supprimer la métrique 189/190 (artefact live).

**⚪ ANOM-104 — modules.md : « Relances auto (J+15, J+30, J+60, J+90) »**
- Fichier : `docs/claude/modules.md` L16 (Finance > Impayés)
- Énoncé fautif : « Relances auto (J+15, J+30, J+60, J+90) ».
- Décision qui prime : **D60** (real, confidence 0.82) — amiable au choix gestionnaire (cron J+15/30/60/90 OU manuel) ; relances centralisées dans Recouvrement ; grain = solde global par lot (D16).
- Pourquoi un agent serait piégé : « auto » seul efface le choix manuel et le rattachement à Recouvrement (mineur ; cadence exacte).
- Correction suggérée : relances amiables au choix gestionnaire (cron par défaut OU manuel), centralisées dans Recouvrement, grain = solde global par lot.

**⚪ ANOM-105 — DECISIONS.md (racine) A3 : min ALUR « si un PPT existe » sans exemptions**
- Fichier : `DECISIONS.md` (racine) §A / A3 (l.40-42)
- Énoncé fautif : « Cotisation annuelle minimale = le PLUS ÉLEVÉ entre 5% du budget ET 2,5% du PPT adopté (si un PPT existe). »
- Décision qui prime : **ARB-5** + EXP-1 (real, confidence 0.7) — la formule est correcte ; manque la nuance « plancher 5% toujours » + les 3 exemptions légales art.14-2-1.
- Pourquoi un agent serait piégé : build_risk quasi nul (formule juste) ; un lecteur croirait le plancher 5% toujours dû.
- Correction suggérée : renvoyer vers ARB-5/EXP-1 (plancher 5% inconditionnel + 3 exemptions).

**⚪ ANOM-106 — Spec phase1-resync : (couvert ANOM-063, doublon écarté)** — *non émis ; voir ANOM-063.*

**⚪ ANOM-107 — SUPERSEDES section D + mémoire coproflex_cloud_live : « à patcher au pré-Palier 0 »**
- Fichier : `.planning/SUPERSEDES.md` section D (l.~39) + mémoire `coproflex_cloud_live`
- Énoncé fautif : « RLS FORCE 5/87 … escalade platform_admin … À patcher au pré-Palier 0 » (et mémoire affirmant « RLS ON+FORCE » sur le live).
- Décision qui prime : **RECONCIL-LIVE-2026-06-26** (real) — surclassé : live gelé sans patch ; sécurité native baseline 0001. (Déjà signalé en vague 1 comme « connu » ; ré-émis ici comme témoin de la grappe META-1.)
- Pourquoi un agent serait piégé : « à patcher au pré-Palier 0 » oriente vers un patch live désormais interdit ; la prose du registre n'a pas encore propagé RECONCIL-LIVE.
- Correction suggérée : mettre à jour la ligne D pour pointer RECONCIL-LIVE (live gelé) ; corriger la mémoire « live RLS ON+FORCE » (faux, FORCE 5/87).

---

---

## Complétude

> Fusion des bilans de couverture des deux vagues. **Aucune grappe morte (dead = true)** dans aucune des deux vagues. Les grappes muettes (found = 0) le sont toutes pour une raison justifiée (snapshots datés non confondables ou plans pré-refonte explicitement marqués), détaillée ci-dessous.
>
> **Micro-trous de couverture ajoutés (non bloquants)** : (1) le tiers central du `PRE_GRILLING_PACK_2026-06-25.md` (grappe SNP-2b) n'a pas été rejoué — seuls SNP-2a (tiers 1) et SNP-2c (tiers 3) ont été couverts, tous deux muets justifiés ; (2) sur le finding META lié à BILAN_CADRAGE §5 l.102 (« C16-4 exige ce patch avant tout 2e cabinet »), 1 juré sur 3 n'a pas été rejoué → finding classé *ambiguous* et **non émis** (voir confirmation du témoin ci-dessous).

### Vague 1

**Grappes muettes (found = 0)** : aucune. Les 10 grappes couvertes (BP-1, BP-3, BP-5, BP-6, SP-1, SP-2, PWS-1, MEM-1, MEM-2) ont toutes produit ≥4 findings.

**Grappes mortes (dead = true) à relancer** : aucune signalée.

**Grappe NON traitée à relancer (TROU de couverture)** : **PWS-2** — la seconde moitié des specs `docs/superpowers/specs` (fichiers 2026-03-24 → 2026-06-24) n'a pas été auditée (hors grappe PWS-1). À planifier : ces specs étant plus récents, le risque de pièges à copie y est potentiellement plus élevé. **Signalé comme trou de l'audit.**

**Témoins attendus :**
1. **Mentions « patch live » / « sécurité live hors-bande » / « à patcher pré-Palier 0 »** (BILAN_CADRAGE Étape 0/§5/§2c, SUPERSEDES section D, mémoire `coproflex_cloud_live`) périmées par la réconciliation du jour → **PARTIELLEMENT retrouvé**. La mémoire `coproflex_cloud_live` est bien signalée (provider Resend + bloc « durcir FORCE 5/87 / retirer compte démo / à patcher avant prod » périmés par RECONCIL — cf. notes MEM-1), et `dev_phase_rls.md` (ANOM-001) capture la doctrine RLS-off différée. **TROU : les occurrences précises dans `BILAN_CADRAGE` (Étape 0/§5/§2c) et `SUPERSEDES` section D n'ont PAS fait l'objet d'un finding numéroté distinct** — elles ne sont mentionnées qu'en notes de grappe. À acter explicitement comme périmées.
2. **`db-cible/01` super-admin = valeur d'enum** → **retrouvé (known)** : présent dans SUPERSEDES, signalé `maybe_already_known` par les grappes BP-1/MEM ; pas re-numéroté comme anomalie neuve (correct). ANOM-008 en est le prolongement non-known (seed.sql + compte en clair).
3. **`db-cible/08` provider Resend** → **retrouvé (known)** : couvert par SUPERSEDES ; les occurrences neuves dans d'AUTRES fichiers (00, 04, 07, 08-spec) sont remontées en ANOM-011/012/014/015.
4. **`db-cible/02+03` multi-512 & double-posting `validate_budget_expense`** → **retrouvé (known)** : confirmé par les grappes SP-1/BP-5 comme déjà listé dans SUPERSEDES ; non re-numéroté (correct). ARB-2 (multi-512) est par ailleurs ré-attesté via ANOM-026.

---

### Vague 2

Récapitulatif par grappe relancée (found = nombre de findings réels retenus ; ambiguous non comptés comme findings).

| Grappe | found | État | Note |
|--------|-------|------|------|
| **BP-2** (db-cible 02/03 + cartos) | 8 | vivante | RED double-posting déjà émis en vague 1 ; ici RLS sans FORCE (02/03), 110/120 invariant, §5 migrations cartos, white anon. |
| **BP-4** (db-cible 05 + carto) | 7 | vivante | Enum mutation/source_type traités vague 1 ; ici validate_mutation/cloture_compte, avis_mutation_date, art.6-2, verdicts carto. |
| **BP-7** (ENUMS/INVENTAIRE/MIGRATION-DONNEES + T1/T3) | 7 | vivante | RED enum 6 valeurs + bypass écriture ; orange MIGRATION-DONNEES ; yellow T1/T3 cartos. |
| **CTX-1** (glossaire-technique + business-rules + modules) | 8 | vivante | RED pv_* UPDATE front ; orange platform_admin x2 ; yellow OS 6 statuts, modules 8, RLS live x2. |
| **CTX-2** (catalogue-finance) | 6 | vivante | RED réalisé budget_expenses ; orange migration 0036, initial_balance, multi-512. |
| **CTX-3** (CONTEXT.md) | 2 | vivante | Resend canonique + 512100 Face 2. Reste du glossaire sain (cible vs réel bien distingués). |
| **MEM-3** (35 mémoires) | 9→4 émis ici | vivante | ui_ux Next.js, wp5.1 110/120, night_session portail RSC, supabase_project live ; le reste couvert par DEJA CONNUS. |
| **CTX (catalogue v_account_balances)** | inclus CTX-2 | — | D5 + ARB-2 émis (ANOM-054/055). |
| **PWP-1** | 0 | **muette (justifiée)** | Plans pré-refonte mars 2026, ancienneté EXPLICITE (date + stack Next auto-déclarée) → non confondables. |
| **PWP-2** | 0 | **muette (justifiée)** | Idem (mars-avril, en-têtes « Next.js 16 App Router »). |
| **PWP-3** | 0 | **muette (justifiée)** | Plans mai-juin ciblant le live iyfes + stack Next, marqueurs forts. |
| **PWP-4** | 1 | vivante | COMMENT SQL migration 0041 grave « pv_* par UPDATE front » (white, déjà corrigé à la source). |
| **PWS-2** (17 specs) | 17→émis ici | vivante | RED cloture-finalisation + portefeuille impayés ; orange treasury/initial_balance/RLS-dev/KPI client/resync ; yellow conformité/portail/banque/rejected. |
| **ATL-1** (atlas 15 fichiers) | 2 | vivante | Orange MATRICE platform_admin sur 2 portiers ; Resend descriptif (white, connu). |
| **PIL-1** (DECISIONS divers) | 14→émis ici | vivante | RED RLS-off-voulu x2 (DECISIONS .planning + racine) ; orange gouvernance/edge/multi-512/Resend ; yellow PDF/120/IDOR ; white A3. |
| **TST-1** (TC_01/03/04/06/11 + PLAN_GOLDEN/MASTER) | 13→émis ici | vivante | RED Fonds travaux 103+105 ; orange 512100/4 niveaux GED/createStandardResolutions/pv_sent/choix compte/live cible/password123/ALUR. |
| **TST-2** (TC_07-13) | 9→émis ici | vivante | RED EXP-6 ; yellow Resend/RLS forcé/compte démo/échelle relance ; chevauchement TST-1. |
| **META-1** (BILAN_CADRAGE + SUPERSEDES) | 6→2 émis ici | vivante | **Voir confirmation ci-dessous.** |
| **SNP-1** (MORNING_BRIEF) | 1 | vivante | Reco C16-4 « patcher le live » (white, connu). Reste = questions ouvertes, non flaggé. |
| **SNP-2a** (PRE_GRILLING tiers 1) | 0 | **muette (justifiée)** | Snapshot daté « rien n'est tranché : matériau de grilling » → barre relevée, recos = décisions alignées. |
| **SNP-2c** (PRE_GRILLING tiers 3) | 0 | **muette (justifiée)** | Idem ; zones périmées = déjà connues/surclassées RECONCIL-LIVE. |
| **SNP-3** (cartographies 2026-06-22) | 0 | **muette (justifiée)** | Snapshots datés descriptifs (Écrans/Issues connues), non prescriptifs. |
| **SNP-4** (triage/carto 2026-06-22/24) | 7→émis ici | vivante | RED/orange 672/772 + multi-512 (ANOM-072/073/074/080) ; reste = questions ouvertes non flaggées. |

### Confirmation du témoin attendu (trou de la vague 1)

**OUI, la grappe META-1 a comblé le trou.** Les énoncés « patcher le live » sont capturés comme PÉRIMÉS par RECONCIL-LIVE-2026-06-26 :

- **BILAN_CADRAGE §5** (« Recommandation finale — la prochaine action » : patcher l'escalade super-admin + FORCE sur 87 tables) → **ANOM-044 (RED)**, verdict real confidence 1. C'est l'instruction la plus directive du document.
- **BILAN_CADRAGE §3 Étape 0 / §2c faux-vert** → couverts par la même famille ; le finding ANOM-044 scope correctement §5, et la note de grappe META-1 signale que §3/§2c portent la même staleness (à corriger en même temps). Émis comme occurrences red/orange dans la couverture META-1 (6 occurrences au total : §3 Étape 0, §5 reco, §2c constat, + SUPERSEDES D, mémoire).
- **SUPERSEDES section D** (« à patcher au pré-Palier 0 ») + mémoire `coproflex_cloud_live` → **ANOM-107 (WHITE)**, verdict real ; déjà reconnu « connu » mais ré-affirmé ici comme témoin pour fermer le trou.

Note d'ambiguïté : **ANOM (BILAN §5 l.102 « C16-4 exige ce patch avant tout 2e cabinet »)** a été classé **ambiguous** (la décision RECONCIL-LIVE n'est pas gravée verbatim dans le repo, et MORNING_BRIEF la présentait encore comme question USER ouverte) → **non émis comme finding**. Recommandation transverse : graver RECONCIL-LIVE-2026-06-26 dans REFONTE_DECISIONS + SUPERSEDES pour lever cette dernière ambiguïté et propager la purge à BILAN §3/§2c et SUPERSEDES D.

Aucune grappe **morte** (à relancer) : toutes ont produit soit des findings, soit une justification de mutisme solide (snapshots datés non confondables ou plans pré-refonte explicitement marqués).

---

## Note — ratification

Cette liste est un **inventaire à RATIFIER**, pas un verdict définitif. Pour chaque ANOM, trancher : **vrai positif** (à corriger), **faux positif** (à écarter), ou **différé** (réel mais hors priorité). Points à challenger en priorité lors de la ratification :
- **ANOM-008** : source partiellement hors-repo (le fichier `dev_demo_accounts_seed_gap.md` n'a pas été retrouvé au filesystem par un des relecteurs) — vérifier que c'est bien `supabase/seed.sql` qui est visé.
- **ANOM-023** : le finding amalgame un point conforme (`validate_mutation` « transfert atomique » l.41 = transfert de propriété `lot_owners`, COHÉRENT avec EXP-5) et un point réel (Q9 + prorata D7-03). Ne ratifier QUE le volet Q9/prorata. Un relecteur avait même classé l'ensemble en faux positif.
- **Confiances < 0.7** (ANOM-008, ANOM-023, ANOM-028, ANOM-030) : à examiner de plus près avant correction.

**Aucune correction n'a été appliquée** : ce rapport est en lecture seule. Les corrections devront partir dans une **PR séparée et ciblée** (idéalement une PR par doc ou par thème — RLS/FORCE, provider e-mail, statuts/enum, finance/Edge), après ratification de cette liste.

**Rappel transverse (les deux vagues)** : les corrections partent dans des **PR séparées et ciblées, une par thème** — RLS/FORCE, provider e-mail (Resend→Brevo), statuts/enum, finance/Edge (réalisé GL, multi-512, double-posting), machine à états AG (`set_ag_status` / pv_*), plan comptable (672/772→678/718, 110/120→12/478, 105 strict). Recommandation prioritaire issue de la vague 2 : **graver RECONCIL-LIVE-2026-06-26 dans REFONTE_DECISIONS + SUPERSEDES** pour lever la dernière ambiguïté « patch live » et propager la purge à BILAN §3/§2c et SUPERSEDES section D.
