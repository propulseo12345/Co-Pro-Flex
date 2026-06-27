> ⛔ **DOCUMENT HISTORIQUE — PÉRIMÉ (archivé 2026-06-26).** Écrit AVANT le grilling du 2026-06-26 qui a TRANCHÉ les 5 arbitrages que ce plan présente comme « encore ouverts » (ARB-1..5 + C15-5). NE PAS s'y fier pour l'état des décisions → voir `REFONTE_DECISIONS_2026-06-23.md` + `SUPERSEDES.md`. Conservé pour trace de raisonnement.

# Audit de cohérence — plan refonte v2 (2026-06-26)

> Sources lues : `REFONTE_DECISIONS_2026-06-23.md` (en entier : A/B/UX/E, D1→D70, salves G24, socle C.17 8/8, EXP-7, EXP-4), `AUDIT_COHERENCE_CADRAGE_2026-06-24.md` (26 ANOM + 13 paliers), `AUDIT_DRIFT_HORS_FINANCE_2026-06-25.md` (AG/maintenance/GED/comm/ventes), `PRE_GRILLING_PACK_2026-06-25.md` (constats transverses + arbitrages USER ouverts + ordre de grilling), plan `docs/superpowers/plans/2026-06-24-cadrage-base-saine.md`.

---

## 1. Verdict global

**Sous conditions — pas tout à fait prêt à démarrer la construction de code.** Le cadrage est remarquablement abouti : le socle transverse C.17 est tranché à 8/8, les deux gros arbitrages comptables EXP-7 (source de vérité) et EXP-4 (équilibre annexe 1) sont actés, et l'ordre de construction en 13 paliers existe. Mais **5 arbitrages strictement USER restent ouverts** (dont le couplage impayés↔GL, le périmètre V1 du mandat de syndic, la période de l'état daté, le minimum ALUR, la doctrine multi-rôle) et **plusieurs décisions écrites se contredisent encore** parce que les anciennes formulations n'ont pas été réécrites quand une décision plus récente les a remplacées. Tant que ces points ne sont pas soldés et que les contradictions ne sont pas purgées des textes, démarrer le code, c'est risquer de bâtir sur le mauvais modèle (surtout finance et middleware) et de recopier des formulations périmées. La bonne nouvelle : ce sont des décisions à prendre, pas des chantiers techniques — une demi-journée de grilling ciblé peut tout débloquer.

---

## 2. Contradictions internes détectées

> Une « contradiction » ici = deux décisions écrites qui disent l'inverse l'une de l'autre. Le piège n'est pas tant le désaccord de fond (souvent déjà tranché en faveur de la plus récente) que le fait que **les deux textes coexistent encore** : un implémenteur peut copier le mauvais.

### 2.1 — Modèle de trésorerie : multi-512 vs « deux poches » (ANOM-02) 🔴
- **En tension** : D21 / D67 / G24-T7 décrivent un **multi-512 par nature** (choix du compte 512 au paiement, `p_bank_account_id` obligatoire) ↔ **G24-C6-P P1** acte le modèle **« deux poches »** (un seul compte courant payeur 512 + un livret ALUR 502, virement interne 502→512 avant tout paiement, abandon explicite du `p_bank_account_id`).
- **Impact** : c'est le modèle le plus structurant de toute la finance. EXP-6 (tuile fonds travaux), la chaîne paiement fournisseur (D21), la carte fonds travaux à deux faces (D67) et `copro_bank_accounts` (G24-T7, ANOM-06) se construisent dessus. Matérialiser le mauvais casse la chaîne entière.
- **Comment trancher** : « deux poches » est la décision la plus récente et validée USER → **réécrire D21, D67, G24-T7** pour acter « deux poches » comme seul modèle et marquer le multi-512 + `p_bank_account_id` comme abandonnés. C'est déjà prévu en tâche 3.2 du plan ; à exécuter avant le Palier 2.

### 2.2 — Mandat de syndic : V1 vs P1 (ANOM-08) 🔴
- **En tension** : **A3** classe le mandat de syndic en **P1 (backlog, plus tard)** ↔ **C16-1 / C16-5** en font un **prérequis V1** (renouvellement de mandat, tuile) ↔ **D30** pose le **plafond 3 mandats (art.22) en V1**, qui est orphelin de données sans entité mandat ↔ le journal de grilling tranche côté S7 « on modélise le mandat en V1 » mais **A3 et C16 ne sont pas réalignés**.
- **Impact** : sans entité `syndic_mandate` minimale en V1, D30 (plafond 3 mandats) ne peut pas fonctionner (rien à compter). De plus la branche `APPOINT_SYNDIC` d'`activate_ag_decisions` est un no-op informatif (drift AG confirmé) : une résolution « renouvellement du syndic » est marquée « activée » sans effet.
- **Comment trancher** : décision de périmètre **strictement USER**. Si V1 retenu, définir l'entité minimale (durée, dates, lien copro) et réaligner A3. Recoupe G24-META (« remonter les noyaux légaux minimaux en V1 »).

### 2.3 — Pièces de convocation : forcées vs avertissement non bloquant (ANOM-07) 🟠
- **En tension** : **A3** liste « pièces convocation **forcées** » dans les 5 P0 ↔ **G24-C8-P P4** (et la doctrine transverse « alerter > verrouiller ») dit **avertissement non bloquant**.
- **Impact** : un blocage dur peut empêcher d'envoyer une convocation valable (friction) ; un non-blocage peut laisser partir une convocation incomplète (risque de nullité). C'est un choix produit/juridique.
- **Comment trancher** : la position récente non bloquante prime (cohérente avec D6/D34/D56) → réécrire A3.

### 2.4 — Machine à états AG : UPDATE front vs RPC gardée (ANOM-11) 🟠
- **En tension** : `business-rules.md` (et le `comment` de la migration 0041) documentent « pv_* posés par UPDATE front » ↔ **C17-1** impose le guichet unique `set_ag_status` + verrou base, aucun UPDATE front.
- **Impact** : recopier la doctrine `business-rules.md` en v2 rouvre exactement le contournement que C17-1 ferme. Le drift hors-finance le confirme : ~10 fichiers font `from('ag_meetings')` en UPDATE brut.
- **Comment trancher** : C17-1 est tranché ✅ → réécrire `business-rules.md` et le comment 0041 pour pointer `set_ag_status`. Pur recadrage de formulation (piège à copie).

### 2.5 — Réalisé budgétaire : `budget_expenses` vs classe 6 du GL (ANOM-12) 🟠
- **En tension** : les vues budget (`v_budgets_overview`/`v_budget_lines_overview`) somment encore `budget_expenses.amount` ↔ **D20 / EXP-7** imposent le réalisé dérivé de la classe 6 du GL ; double-posting actif (`validate_budget_expense` ET `validate_supplier_invoice` postent tous deux D6xx/C401).
- **Impact** : deux « réalisés » possibles, annexe 3 contestable. EXP-7 a **déjà tranché** (GL source unique, séquencé : réalisé d'abord, impayés après G24-T5) → cette contradiction est résolue **sur le fond**, il reste à exécuter (couper le posting de `validate_budget_expense`, rebrancher les vues).
- **Comment trancher** : aucune décision à prendre — EXP-7(c) le règle ; juste tracer dans le registre des supersedes que `budget_expenses` n'est plus une source de chiffre.

### 2.6 — Affectation travaux à la clôture : auto vs gelé (ANOM-15) 🟠
- **En tension** : D25 / la mémoire `ventilation_110_120` décrivent encore une affectation **auto** de la branche travaux (D120/C450-2) ↔ `regularize_period` (0057/0058) **gèle** la branche travaux par défaut (`p_affecter_travaux=false`, déversement via `settle_works_balance`).
- **Impact** : si le plan suppose l'auto, les annexes 4/5 et l'invariant EXP-4 sont faussés. EXP-4(b) intègre déjà le gel travaux dans l'armement de l'invariant → cohérent, à condition de réécrire D25/la mémoire.

### 2.7 — Renommage 110→12 / 120→478 à moitié fait (ANOM-13) 🟠 → reclassé faux risque
- **Statut** : EXP-4 a vérifié que la **dernière** définition de `regularize_period`/`open_next_period` est **0058**, qui utilise bien 12/478 ; seuls des **noms de variables/commentaires** « 110/120 » résiduels subsistent (à nettoyer dans 0058, pas 0057). **Pas une re-correction de code**, juste un nettoyage cosmétique anti-piège-à-copie.

### 2.8 — Provider email : Brevo vs Resend (ANOM-16) 🟠
- **En tension** : décision **Brevo** (E3-q, G24-C11-P P2) ↔ code 100 % **Resend** (le drift comm confirme : Brevo totalement absent de `src/`).
- **Impact** : faible sur le fond (décidé Brevo), mais le code réel ne porte aucun choix de provider. La doctrine v2 (couple neutre `provider`+`provider_message_id`, 1 adaptateur par presta) règle ça par construction.
- **Comment trancher** : décidé ✅ → purger Resend en v2, configurer clé Brevo + DNS coproflex.fr (SPF/DKIM). Note de dette de purge, pas de débat.

---

## 3. Arbitrages USER encore ouverts qui BLOQUENT

> Ce sont les vrais points durs : **aucune reco ne peut les trancher à la place de Lyes** (périmètre, droit, doctrine produit). Classés par criticité / largeur de blocage.

### 🔴 CRITIQUE — bloque la finance entière
**A. Couplage impayés ↔ GL (ANOM-03, recoupe EXP-7/EXP-4/D20)**
- EXP-7 pose bien la **doctrine** (« le GL seul juge des montants ») et la séquence (réalisé d'abord, impayés après création de la vue d'ancienneté G24-T5). Mais le **couplage concret impayés↔GL** — c.-à-d. acter que `v_unpaid_by_lot` cesse de sommer `call_for_funds_lines` pour lire le solde 45x — reste une décision OUVERTE. Divergence prouvée à l'audit (GL 4950 vs compteur 4450 ; `cancel_call_for_funds` laissait audit=3). 
- **Bloque** : onboarding, mutation, relances (paliers J+15/30/60/90), état daté, portail. C'est le point n°2 du top-risques.
- **Nuance importante** (vérif 2026-06-25) : `v_lot_vs_gl_mismatch = 0 ligne` aujourd'hui (base quasi vide + correctifs juin) → divergence **structurelle prouvée par le code, pas active**. On n'est pas en feu, mais le modèle doit être figé avant de coder les impayés.

### 🔴 CRITIQUE — bloque le middleware (Palier 1, tôt)
**B. Multi-rôle / multi-copro (C15-5)**
- La reco est solide (1 auth/personne, switcher porte contexte ET rôle, middleware tranche sur memberships réels) mais doit être **figée AVANT de coder le middleware deny-by-default (B3)**. Or l'ordre de construction met le middleware au **Palier 1** et le portail au **Palier 12** → risque réel de coder le middleware sans la doctrine multi-rôle.
- **Bloque** : la sécurité du châssis (B3/B4), et tout le portail en aval. Voir aussi §4.

### 🟠 IMPORTANT — bloque clôture / annexes / gate finance
**C. Période de référence de l'état daté (EXP-3, recoupe ANOM-09 / DEFERRED-D5)**
- Sur quel exercice/arrêté s'appuie la photo de l'état daté : exercice clos vs exercice en cours à la date d'effet. Cadrage-8 (couverture complète) supersede DEFERRED-D5 (statu quo) **mais la trace D5 n'est pas marquée résolue** et l'arbitrage USER explicite manque.
- **Bloque** : moteur état daté (Palier 10), cohérence avec G24-T5.

**D. Minimum ALUR légal**
- 2,5 % du budget vs MAX(2,5 % PPT ; 5 % budget). La mémoire `docs_obligatoires_convocation` dit MAX, l'audit liste les deux. Pur arbitrage juridique expert, cité par les EXP mais **absent des 34 dossiers**.
- **Bloque** : la face « comparaison au minimum légal » de la carte fonds travaux (D67), les todos de conformité (D70), le contrôle min ALUR (cron P1).

**E. Équilibre annexe 1 — dépendance en cascade (EXP-4, bloque gate 0088)**
- EXP-4 est **tranché ✅** (égalité globale, alerte non bloquante à 2 visages, trace). MAIS le test 0088 ne peut être figé tant qu'**ANOM-03 (source créances)** et le renommage 110→12 ne sont pas soldés, car l'invariant « créances=dettes après répartition » dépend des montants (EXP-7) et du sort du résultat. Donc : décision prise, **mise en œuvre conditionnée** aux points A ci-dessus.

> **Note sur le modèle de trésorerie « deux poches » vs multi-512 (ANOM-02)** : techniquement c'est une **contradiction** (déjà tranchée USER « deux poches », cf §2.1) plus qu'un arbitrage ouvert. Il reste l'**action USER de valider la réécriture** de D21/D67/G24-T7. À traiter au Palier 0 avant `copro_bank_accounts`.

---

## 4. Risques d'ordre de construction

> Cas où un objet est planifié **avant** la doctrine qui le gouverne, ou avant un socle dont il dépend.

### 4.1 — Middleware (Palier 1) avant doctrine multi-rôle (C15-5, portail Palier 12) 🔴
Le plus grave. Le middleware deny-by-default se code au Palier 1, mais le modèle d'identité multi-rôle/multi-copro qui le pilote n'est grillé qu'avec C.15 (portail, Palier 12). **Mitigation** : remonter la décision C15-5 au **Palier 0** (décision, pas code) pour que le middleware naisse déjà multi-rôle-aware (le contexte serveur tranche sur les memberships réels), même si le portail UI vient bien plus tard.

### 4.2 — `copro_bank_accounts` (Palier 2) avant figeage « deux poches » (ANOM-02/06)
G24-T7 fait de `copro_bank_accounts` un prérequis bloquant de toute la finance (Palier 2). Mais sa forme (2 poches 512+502 vs multi-512) dépend de la contradiction §2.1 non purgée. **Mitigation** : figer « deux poches » au Palier 0 (déjà prévu) avant de créer la table.

### 4.3 — Doctrines C.17 = contrats rétroactifs (ANOM-20)
Idempotence (C17-3), horloge `asOf` (C17-4), `set_ag_status` (C17-1), audit trail (C17-2), cron (C17-5), webhooks (C17-7), super-admin (C17-8) sont des **contrats de socle** : les installer après coup forcerait à réécrire toutes les RPC d'écriture et tous les jobs. Elles sont tranchées ✅ et doivent être **gravées au Palier 0** comme contraintes citées par tous les paliers suivants. C'est bien le plan — risque maîtrisé tant qu'on ne saute pas le Palier 0.

### 4.4 — RLS FORCE + super-admin avant tout 2ᵉ tenant
C17-8 (super-admin lecture seule + anti-cumul) **présuppose RLS en FORCE généralisé** (ANOM-01) : sans FORCE, le owner/service contourne et la lecture seule n'a aucune valeur. Donc S0 (sécurité live, hors-bande) et le Palier 0-bis doivent précéder l'activation de tout vrai 2ᵉ cabinet (B5).

### 4.5 — Réparer AG→finance (Palier 3) suppose les orphelins créés au Palier 2
Les 3 ruptures racines (ANOM-05) ne se réparent qu'avec `create_ag_with_standard_resolutions` (D28), `create_budget_from_ag_resolution` (D29, **absente de toutes les migrations**), `post_exceptional_call_for_funds` (D13/ANOM-21) et `commitments` (G24-T6/ANOM-18). Le Palier 3 « prouver le cycle en SQL » échoue si ces objets ne sont pas posés avant. Dépendance correctement ordonnée dans le plan, à condition que le Palier 2 les livre tous.

---

## 5. Dépendances de socle non encore matérialisées

> Objets/plomberies que plusieurs décisions présupposent mais qui **n'existent pas en base**. Confirmés par l'audit de drift (finance + hors-finance). « Qui dépend de quoi » entre crochets.

### Finance (à créer, Palier 2/5)
- **`copro_bank_accounts`** (G24-T7, ANOM-06) — inexistante ; fin du « 512 en dur ». [dépend de : figeage deux poches §2.1] → [requis par : D21 paiement, D67 carte fonds, EXP-6].
- **`commitments`** / palier « engagé » (G24-T6, ANOM-18) — inexistant ; un OS de 8000 € est invisible au budget. [requis par : cut-off 408/486 D26, suivi voté/engagé/réalisé D20/D40, annexes travaux].
- **Vue d'ancienneté unique G24-T5** (solde 45x par lot × nature × ancienneté) — prérequis EXPLICITE des impayés. [requis par : EXP-7 volet impayés, relances D16, état daté, portail, dashboard ; bloque le rebranchement de `v_unpaid_by_lot`].
- **~12 vues d'agrégat fantômes** (`v_general_ledger`, `v_calls_overview`, `v_account_balances`…) lues par le front mais absentes (ANOM-19) — chantier pivot Palier 5, à recréer dérivant du GL.
- **`create_budget_from_ag_resolution`** (D29) — absente de toutes les migrations (grep 0 hit) ; cause du 23503 + rollback de l'activation. [bloque : tout le pilier AG→finance].
- **`post_exceptional_call_for_funds`** + route avance art.35 (D13, ANOM-21) — inexistantes ; un syndic ne PEUT pas créer d'appel hors-budget (wizard désactivé). [requis par : D13-bis `CREATE_EXCEPTIONAL_CALL` débranché].
- **Échéancier unifié (D13-bis)** — généraliser `budget_payment_schedules` + ajouter `resolution_id` sur `call_for_funds` ; un seul système d'échéancier budget+travaux+exceptionnel. [requis par : émission au fil des trimestres D15, cron émission C17-5].

### AG (drift = surtout côté front)
- **`set_ag_status`** RPC + colonne **`pv_signed_at`** (C17-1) — toutes deux absentes ; la date de signature du PV (fait juridique) n'est stockée nulle part. [requis par : finalize_ag, audit trail C17-2, horloge C17-4].
- **`create_ag_with_standard_resolutions`** existe ✅ mais le front emprunte le mauvais chemin (`createStandardResolutions` JS qui perd `action_type`) — à rebrancher, pas à créer.

### Conseil syndical (capacité dormante la plus grosse)
- **`council_decisions` / `council_votes` / `council_documents`** — tables + enums + `compute_decision_result` + edge `council-workflow` présents en SQL, **ZÉRO câblage front** (1 seule ref, dans les types générés). [D52 « devis à valider » et C13 légifèrent sur du vide] → chaque dossier C.13 doit porter son **coût de création d'objet** (RPC d'écriture submit/decide/vote + UI), pas seulement sa doctrine.

### Ventes / état daté / opposition
- **`record_mutation_opposition`** + `settle` (C12-1, D36) — la table `mutation_oppositions` existe et est lue par `v_mutation_detail`, mais **jamais écrite** (colonne `opposition` toujours NULL). [D36 « exposer l'opposition art.20 » = LA protection de D34].
- **Contrôle de solde au jalon « clôture compte vendeur »** (C12-4, D33) — `get_lot_balance_45x` n'avertit que côté front, jalon marqué « completed » en bloc sans contrôle. [bloque : issue forcée si solde≠0].
- **Module contentieux sur `legal_proceedings`** (D57, C5-P3) — table riche, 0 câblage ; RPC `record_legal_proceeding` à créer.

### GED / Communication / Conformité
- **`document_access_log`** (ANOM-10, D44/G24-C10-P P4) — **fantôme** : ni base, ni migration ; le hook écrit dans un store RAM perdu au reload. Statut « créer vs purger » à acter (D44 dit existant à tort ; D69-bis 3 niveaux pourrait suffire).
- **`register_generated_document`** (D43/G24-C10-P P2) — nom inexistant ; la vraie RPC est `register_ag_document` (0050). À renommer dans la cartographie + généraliser à TOUS les générateurs.
- **`commitments`** (déjà cité) + **table sinistres/claims** (G24-C9-P P1) — absente ; le « sinistre » n'existe que comme `logbook_entry_type='incident'`.
- **`insurance_policies.start_date/end_date`** absentes — les alertes d'échéance d'assurance tournent sur une date vide (édition assurance = mock RAM mensonger).
- **Table `notifications` générique** (G24-C11-1) — n'existe pas ; seules `ag_notifications` (AG-spécifiques) existent.
- **`v_conversations_overview.last_sender_name/role`** absentes — la liste affiche « Admin CoProFlex » en dur (additif de vue, ou purger le mapper).
- **`param_audit_log` ciblé** (D65-b) — aucune table d'audit générique n'existe ; nouvelle infra (paramètres sensibles + coordonnées).
- **Numérotation séquentielle sans trou** (G24-AM2) — à poser dès la baseline (rétro-install douloureuse).

### Faux-vert structurel (transverse)
- **`payments = 0` sur le live** (ANOM-26) — tests de parité vacués, assertions tautologiques. Poser des paiements réels AVANT la campagne golden.
- **0 edge déployée** (ANOM-04) — le front AG/comm invoque 12+ edges absentes → fallbacks direct-DB non équivalents (ghost columns, action_type perdu, triggers shuntés). Doctrine v2 = recréer proprement (cron+webhooks), pas redéployer les 27 edges v1.

---

## 6. Recommandation d'ordre de traitement

> Du plus bloquant au plus tardif. L'idée : trancher d'abord ce qui empoisonne le socle (Palier 0), purger les contradictions de texte en parallèle (cheap), puis créer les objets de socle dans le bon ordre.

**Étape 1 — Sécurité live, hors-bande (ne pas attendre)**
1. **S0 / ANOM-01** : RLS ON+FORCE sur 87 tables + policies sur 0077/0078 + corriger la mémoire « ON+FORCE » fausse + retirer le compte démo `password123`. Prérequis absolu de C17-8 et de tout 2ᵉ tenant.

**Étape 2 — Trancher les 5 arbitrages USER ouverts (§3) — 1 session de grilling**
2. **Couplage impayés↔GL (A / ANOM-03)** — le plus large, débloque finance/onboarding/mutation/relances/état daté/portail.
3. **Multi-rôle/multi-copro (B / C15-5)** — à figer AVANT le middleware Palier 1.
4. **Période de référence état daté (C / EXP-3)** + **minimum ALUR (D)** + **valider la réécriture « deux poches »** (clôt ANOM-02).
   → ces 4 décisions débloquent respectivement clôture/annexes, carte fonds/conformité, et toute la chaîne paiement.

**Étape 3 — Purger les contradictions de texte (§2) — recadrage de formulation, peu coûteux, en lot**
5. Réécrire **D21/D67/G24-T7** → « deux poches » seul (ANOM-02) ; **A3** → mandat V1 ou P1 selon §3.B (ANOM-08) + pièces convocation non bloquantes (ANOM-07) ; **`business-rules.md`** + comment 0041 → `set_ag_status` (ANOM-11) ; **D25 / mémoire ventilation_110_120** → travaux gelé par défaut (ANOM-15) ; noter dettes de purge « Brevo, purger Resend » (ANOM-16) et « commentaires 110/120 à nettoyer dans 0058 » (ANOM-13).
6. Centraliser le **registre des supersedes** (§4 de l'audit du 24) comme section vivante unique dans `REFONTE_DECISIONS`.
7. Dresser la liste **« objets à créer / à purger »** (§5 ci-dessus + drift) exploitable directement par le plan d'implémentation.

**Étape 4 — Construire le socle dans l'ordre (paliers)**
8. **Palier 0** : graver les 8 doctrines C.17 + les arbitrages tranchés comme contraintes de baseline.
9. **Palier 2** : socle GL → `create_ledger_transaction` + `copro_bank_accounts` (deux poches) + `commitments` + clés + période 'open' + vérif empirique `regularize_period` multi-clés (G24-T12, 1ʳᵉ action technique).
10. **Palier 3** : créer `create_budget_from_ag_resolution` + `create_ag_with_standard_resolutions` (rebranchement) + `post_exceptional_call_for_funds`, réparer les 3 ruptures AG→finance et **prouver le cycle annuel en SQL** avant toute UI.
11. **Palier 5** : recréer les ~12 vues d'agrégat + la vue d'ancienneté G24-T5 (débloque enfin le rebranchement impayés d'EXP-7 + l'invariant EXP-4 / test 0088).
12. Reste des paliers (6→12) selon le plan, chacun créant ses objets de socle dormants (opposition, contentieux, document_access_log si retenu, notifications, audit log) **avec leur coût de création explicite**.

**Règle d'or transverse** : avant la campagne golden, **poser des paiements réels** (ANOM-26) et **recréer les edges proprement** (ANOM-04) pour que les tests de parité prouvent vraiment quelque chose en base (DoD anti-faux-vert B9).
