# 🌅 BRIEF DU MATIN — fin de cadrage v2 (préparé la nuit du 2026-06-25 → 26)

> **À quoi sert ce document.** Tu m'as demandé de préparer en avance **toutes les questions de grilling restantes**, de les analyser et de te livrer **mes propositions** pour qu'on **ratifie vite** demain matin. Chaque dossier est une **fiche de décision** prête : la question en clair, mon état des lieux, **ma reco** (corrections adversariales déjà intégrées), ce qui est **strictement ta décision d'expert**, les dépendances, les pièges, et les **options** que je te poserai en `AskUserQuestion`.
>
> **Méthode (inchangée).** Par dossier : « ta décision métier » vs « ma plomberie » ; questions via `AskUserQuestion` (ma reco en 1er) ; explication FR vulgarisée à la demande. Décisions ratifiées → `REFONTE_DECISIONS_2026-06-23.md` ; vocabulaire → `GLOSSAIRE_A_FAIRE.md`.
>
> **Comment on déroule demain.** On peut soit enchaîner les `AskUserQuestion` dans l'ordre conseillé, soit tu lis ce brief et tu me dis « OK sur tout sauf X, Y, Z » — beaucoup de fiches sont des **confirmations** de ce qui est déjà codé/déjà acté, donc ça devrait aller vite.

## Où on en est
- **Socle C.17 = 8/8 tranché** · **EXP-7** (GL source unique) ✅ · **EXP-4** (équilibre annexe 1) ✅.
- **EXP-5 reste EN ATTENTE de ta réponse** (tu es allé dormir avant de trancher) → re-présenté en tête du bloc EXP, **ma reco = pointage + 3 garde-fous**.
- **Restent à griller : 35 dossiers** = 6 dossiers de **socle « rejoués » jamais tranchés** (à voir EN PRIORITÉ) + 29 dossiers de l'ordre conseillé (EXP-5 inclus).

## ⚠️ Les 5 arbitrages strictement TOI qui BLOQUENT la suite (issus de l'audit de cohérence)
Ces 5 points ne sont pas « rédigeables » par moi — ils conditionnent plusieurs dossiers d'un coup. À trancher tôt :
1. **ANOM-03 — couplage impayés ↔ grand livre.** EXP-7 pose « le GL seul juge » mais le **couplage concret** impayés↔GL reste ouvert. Bloque : onboarding, mutation, relances, état daté, portail. *(Cité par C12-1, C12-3, C12-4, C12-5, EXP-3.)*
2. **ANOM-02 — modèle de trésorerie.** « Deux poches » (512 courant + 502 livret, tranché) contredit le multi-512 (D21/D67/G24-T7) **jamais réécrit**. Bloque EXP-6 + toute la chaîne paiement + `copro_bank_accounts` (absente, ANOM-06).
3. **Mandat de syndic en V1 (ANOM-08).** A3 dit « plus tard », C16-1/C16-5 disent « prérequis ». Tant que non tranché, C16-1/C16-3/C16-5 et D30 (plafond 3 mandats) sont orphelins. 
4. **EXP-3 — période de référence de l'état daté.** Exercice clos vs exercice en cours à la date d'effet (recoupe ANOM-09/D5).
5. **Minimum ALUR légal.** 2,5 % budget vs **MAX(2,5 % PPT ; 5 % budget)** — arbitrage juridique pur (cadré côté EXP-1 mais à confirmer).
> 6ᵉ point d'ordre (pas un arbitrage métier mais un **risque de séquençage**) : **C15-5 multi-rôle** doit être figé **avant** de coder le middleware (Palier 1), pas au Palier 12.

## Ordre de grilling conseillé
**Socle oublié d'abord** : EXP-2 · C11-P4 · C14-1 · C14-3 · C14-4 · C15-2.
**Puis l'ordre conseillé** : EXP-5 · EXP-3 · EXP-6 · EXP-1 · C16-1 · C16-4 · C15-5 · C15-1 · C12-2 · C12-1 · C12-4 · C12-3 · C12-5 · C12-6 · C13-2 · C13-1 · C13-3 · C13-5 · C13-4 · C14-2 · C14-5 · C14-6 · C15-3 · C15-4 · C16-2 · C16-3 · C16-5 · C11-P5 · C11-P6.

## Synthèse de mes recos (1 ligne / dossier)

| Code | Ma reco en une ligne |
|------|----------------------|
| **EXP-2** | Gel TOTAL à `approved` (déjà codé) ; régul d'un oubli post-AG = opération exceptionnelle datée N+1 sur **678/718**, jamais de réouverture. |
| **C11-P4** | Écrire `'pending'` AVANT le provider + `UNIQUE(ag,copro,canal)` + rejeu doux (calque D32) → anti double-convocation. |
| **C14-1** | Journal `document_access_log` minimal RÉEL (RLS gestionnaire, purge 1 an) + RPC `set_document_visibility` sur les 3 niveaux SQL ; abandonner le mock 4-niveaux. |
| **C14-3** | DTG = document réglementaire dédié (`type='dtg'`), JAMAIS une 3ᵉ source de travaux ; lien DTG→PPT par pré-remplissage (P1). |
| **C14-4** | Champs Factur-X = clause de **DoD du module Factures** (SIRET exigé, HT+taux→TVA, `currency='EUR'`) ; TVA scalaire V1, multi-taux P1. |
| **C15-2** | SEPA via **GoCardless Payments** (à intégrer ; ce qu'on a = lecture seule) ; edge signé + `webhook_events` ; écriture GL **au paiement confirmé** seulement. |
| **EXP-5** | **Confirmer le pointage** (pas d'écriture de transfert) + 3 garde-fous (issue serveur si solde≠0, LIVE vs figé, opposition art.20 distincte). |
| **EXP-3** | `v_eff` = **seule** date de référence (pas de `dateReference` v1) + scoper la projection partie 3 à l'exercice de v_eff via `period_id`. |
| **EXP-6** | Tuile « Fonds travaux » = **105 strict** via `v_alur_fund_balance` + carte 2 faces (Face 2 = compte **502 seul**, le 512100 est un fantôme). |
| **EXP-1** | **5 % du budget** (abandon des 2 fausses branches) + garde-fou non bloquant + exemption « ≤ 10 lots ». |
| **C16-1** | Réutiliser la table `contracts` (domaine « syndic »), **pas de table neuve** ; ⚠️ arbitrage USER = périmètre du mandat en V1. |
| **C16-4** | Table dédiée `platform_admins` hors-tenant + bypass lecture seule tracé ; patch live **avant** la baseline RLS v2. |
| **C15-5** | Contexte `{copro_id, role}` en **cookie signé serveur** + middleware qui revalide sur memberships réels ; **figer AVANT de coder le middleware**. |
| **C15-1** | V1 = chaîne complète en **saisie syndic** (attendance amont + `mark_resolution_amended` + agrégat) ; self-service copro au Palier 12. |
| **C12-2** | Avis de mutation = **événement autonome** sur `mutations` + todo dérivé ; supprimer le faux compteur `requested_at+15`. |
| **C12-1** | `settle` opposition = **wrapper sur le post-paiement standard** (un seul chemin d'écriture, jamais l'ALUR) ; **bloquant ANOM-03**. |
| **C12-4** | Découpler clôture vendeur ↔ signature ; vrai contrôle de solde **à `effective_date`** (cut-off `p_as_of`), hors 450-5. |
| **C12-3** | Note art.6-2 **figée en SQL** dans le payload immuable (V1, zéro calcul) ; ne pas publier au notaire avant verrou ANOM-03. |
| **C12-5** | Ratifier `signed ≠ validated` **ET** verrouiller la machine à états (2 RPC gardées + régénérer les types périmés). |
| **C12-6** | Gestionnaire-only (déjà l'existant) ; **s'aligner sur FORCE partout** (pas « retirer FORCE ») ; corriger la base légale RGPD inventée. |
| **C13-2** | `set_council_president` = RPC dédiée idempotente (exige membre actif) ; `ELECT_COUNCIL` ne pose que les membres ; sans président = non bloquant. |
| **C13-1** | **Pas de nouvelles FK** : réutiliser `linked_resolution_id` + polymorphe `council_documents` (déjà câblés) ; coût de création **nul**. |
| **C13-3** | Bon outil par cible : GL en vue **SECURITY DEFINER masquée**, contrats en invoker, devis en DEFINER ; **1 access-log générique** (résout ANOM-10). |
| **C13-5** | Alerte **non bloquante calculée en SQL** (greffée sur `validate_ag_variables`) ; avis unique gestionnaire V1 ; silencieuse si copro sans CS. |
| **C13-4** | **V1 zéro-migration** : ne rien poser (crochet inexistant = piège à copie) ; délégation art.21-1 en P1 ; tracer 624/674/706 dormants. |
| **C14-2** | Saisir UN fait (`date_derniere_declaration_rnic`) + statut « à jour/en retard » dérivé de `approved_at` ; alerte passive ; téléservice ANAH P1. |
| **C14-5** | Rendre **bloquant au go-live du portail** le cloisonnement RLS perso + réparer le journal d'accès fantôme ; check-list 2019-650 non bloquante. |
| **C14-6** | Barème de conservation **fusionné avec C.10-P1** (1 table éditable) ; registre PV = vue dérivée mais numéro `pv_sequence_no` **matérialisé**. |
| **C16-2** | Noyau honoraires V1 tel quel (ligne budget **621 appelée via 701**), zéro objet neuf ; grille Novelli = P1 (suspendue au mandat). |
| **C16-3** | Sortie de mandat minimale : `copros.status` archivé gardé + RPC + **export de passation** (CSV + 45x + liste GED) ; transfert complet = P1. |
| **C16-5** | 2 vues + `cabinet_id` à la source + agrégat **SUM pur** (supprimer le re-calcul JS) ; pas de tuile « mandats à renouveler » sans entité mandat. |
| **C11-P5** | **1 projection canonique** (`display_name` + vue socle, la RPC dérive) ; indivision = `is_primary` ; porter l'adresse complète. |
| **C11-P6** | **Soft-delete auditable** (RPC gardée + filtre `v_wall_feed`) comme contrat de design v2 ; hard-delete RGPD séparé ; retirer GRANT anon + RLS FORCE. |

---


---

## Bloc SOCLE rejoués (non tranchés) — 6 dossiers

Dossiers de socle « rejoués » (échec au 1er run), non encore tranchés dans REFONTE_DECISIONS. À griller avant/avec le bloc C.17 pour ne rien oublier avant la refonte from-scratch.

---

### EXP-2 — Immutabilité de la période approuvée + régul N+1 (678/718)
**La question (1 phrase claire)** : Que verrouille-t-on EXACTEMENT une fois l'exercice approuvé en AG, et par quel couple comptable régularise-t-on un oubli découvert après coup ?
**État réel (base)** : Le verrou EXISTE et est solide — enum `period_status` (open/closed/approved), cadenas central `create_ledger_transaction` qui refuse toute écriture si la période n'est pas `open`, 4 triggers d'immutabilité du GL posté + exemption `is_ledger_regen_exempt` qui se ferme dès qu'une période passe `approved`. `reopen_period` interdit déjà de rouvrir un exercice approuvé. MAIS : `approve_period`/`open_next_period`/`regularize_period`/`reopen_period` n'ont AUCUN appelant front (moteur correct, jamais piloté). Gaps chart : `718` « Produits exceptionnels » ABSENT partout (seed + migrations), `677` référencé mais absent de la liste d'insertion (incohérence), `772` n'existe pas et ne doit pas exister.
**Ma proposition** : Ratifier le gel TOTAL à `approved` sans toucher au moteur (déjà codé) ; garder `closed` réouvrable avant AG. Tout oubli post-AG = opération exceptionnelle datée N+1 sur **678 (charge) / 718 (produit)**, jamais de réouverture, tracée par un `source_type` dédié (visible GL + annexe 2), exclue de la liste blanche `is_ledger_regen_exempt`. Bannir 672/772. Migration corrective : ajouter `718`, réparer `677`, finir 110→12 / 120→478 dans `open_next_period` (ANOM-13).
**Ce qui est strictement TA décision (USER)** : (1) gel total = doctrine ; (2) couple 678/718 vs par-nature vs réouverture break-glass ; (3) créer un `source_type` dédié + son nom ; (4) déclencheur de `approve_period` (bouton manager vs auto à l'AG d'approbation des comptes) ; (5) garder `closed` distinct de `approved`.
**Dépendances / préalables bloquants** : machine à états AG (C.17 #1 : `approve_period` déclenché par fait juridique daté) ; migration classe 7 (718) qui impacte `charge_nature` + listes en dur de `open_next_period`/`v_result_allocation_split` ; nouveau `source_type` dans l'enum `ledger_source_type` ; refonte annexes 0075 (régul visible bloc « travaux/exceptionnel » annexe 2). Recoupe directement C17-4 (horloge/dates serveur).
**Pièges adversariaux à connaître** : réflexe PCG entreprise « 672/772 » = FAUX en copro (672 = travaux urgents art.18 ; 772 inexistant → RPC en échec 23503). ANOM-13 : `open_next_period` lit ENCORE 110/120 (renommage à moitié fait) → ne pas graver le verrou sur des comptes morts. Le `source_type` de régul ne doit PAS entrer dans `is_ledger_regen_exempt` (c'est une écriture définitive, pas régénérable). Libellé légal exact de 718 à recroiser sur l'arrêté 14 mars 2005 avant de figer le seed.
**Options (pour AskUserQuestion)** : 1. **Gel total + régul 678/718 N+1 tracée (ma reco)** — immutabilité complète, oubli corrigé en exceptionnel daté N+1, conforme art.14-3 + arrêté 14/03/2005 · 2. **Régul par nature (pas exceptionnel)** — ré-imputer sur le compte d'origine daté N+1 ; mélange une charge N-1 dans le résultat courant N+1 sans signal, moins traçable · 3. **Réouverture exceptionnelle encadrée (break-glass)** — DÉCONSEILLÉ : casse l'opposabilité des comptes votés, risque de contestation d'AG.
**Risque si on tranche mal** : 672/772 → annexes faussées + RPC qui plante ; réouverture → perte d'opposabilité + corruption du couplage à-nouveaux/affectation ; oubli du gap chart (718/677) → régul plante à la pose ; verrou figé sans finir 110/120 → copie du vocabulaire mort dans tout le cycle clôture.

---

### C11-P4 — Idempotence / reprise des envois en masse (anti double-convocation)
**La question (1 phrase claire)** : Comment empêcher qu'une convocation d'AG parte deux fois (ou se perde sans trace) lors d'un envoi en masse interrompu ou re-cliqué ?
**État réel (base)** : Table `ag_envoi_tracking` = trace légale qui fait foi, MAIS **AUCUNE contrainte UNIQUE** → deux lignes identiques possibles. Enum `delivery_status` contient déjà `'pending'` (aucune modif d'enum requise). RPC `save_ag_envoi_tracking` fait des INSERT successifs sans dédup → re-clic ré-insère tout. Orchestration 100 % CLIENT (`useAgEnvoiPage.ts`) : boucle séquentielle + bulk-insert de la trace À LA FIN → si le navigateur ferme à mi-course, envois partis mais ZÉRO trace (preuve perdue) ; re-clic = double convocation. Edge `send-convocation-email` renvoie un succès MENSONGER sans clé Resend. Seconde pile `ag_notifications` (transitoire, à droper) double le tracking.
**Ma proposition** : (1) Écrire la ligne en `'pending'` AVANT d'appeler le provider, basculer en `sent`/`failed` après. (2) Contrainte UNIQUE `(ag_id, coproprietaire_id, canal[, version_doc])`. (3) Re-clic = rejeu DOUX (calque D32) : ne retraite que `pending`/`failed`, saute les `sent`. (4) Cible unique = `ag_envoi_tracking` (abandon de `ag_notifications`). (5) Orchestration côté serveur (D22) recommandée.
**Ce qui est strictement TA décision (USER)** : périmètre de la clé (`+version_doc` pour convocation rectificative ?) ; blocage dur (contrainte SQL) vs doux (rejeu) ; double canal même copro toléré ou averti ; quelle pile garder ; **effort serveur (refonte D22) vs boucle front patchée** = le vrai arbitrage coût/V1.
**Dépendances / préalables bloquants** : D22 (archi 3 couches) ; C11-P5 (source unique destinataires — la clé n'a de sens que si `coproprietaire_id` est stable) ; C11 « tracking agnostique Brevo » + ANOM-16 (modèle de webhook qui ferme `pending→sent→delivered/bounced`) ; C.17 §3 (contrat d'idempotence général `p_idempotency_key` — ne pas inventer 2 conventions) ; idempotence doit couvrir AUSSI postal/recommandé (coût d'un recommandé doublé réel).
**Pièges adversariaux à connaître** : clé trop large (sans canal) → bloque l'envoi multi-canal légitime → contournement → retour au double. Clé avec `version_doc` mal définie → chaque régén PDF = « nouvelle version » → garde-fou devient passoire (rattacher au versioning documentaire G24-C10-1). Ne PAS bâtir sur `ag_notifications` (table « à droper »). Ne pas se fier au retour de l'edge stub (ANOM-04). La trace = fait juridique daté → RPC gardée, pas UPDATE front libre (C.17 §1).
**Options (pour AskUserQuestion)** : 1. **Serveur + clé versionnée + rejeu doux (ma reco)** — orchestration serveur (D22), `pending` avant provider, UNIQUE `(ag, copro, canal, version)`, rejeu D32, abandon pile transitoire ; le plus robuste juridiquement · 2. **Trace + contrainte sans refonte serveur** — boucle front gardée par RPC `pending→sent/failed` + UNIQUE `(ag, copro, canal)` ; sécurise sans chantier D22, pipeline client encore fragile · 3. **Clé simple `(ag, copro, canal)`** — sans version ; suffit au cas nominal, bloque la convocation rectificative comme doublon.
**Risque si on tranche mal** : pré-écriture oubliée → interruption = preuve perdue → impossible de prouver l'expédition à 21 j francs → **annulation de l'AG** (contestation art.42, 2 mois). Blocage dur sans rejeu doux → un bounce bloque tout → gestionnaire refait hors système. Clé trop stricte/large → garde-fou inutile ou contourné.

---

### C14-1 — Journal d'accès/diffusion des actes (`document_access_log` ABSENT, ANOM-10)
**La question (1 phrase claire)** : Construit-on un vrai journal des accès aux documents (qui a vu/téléchargé quoi) et fige-t-on le réglage de confidentialité, aujourd'hui un faux mock en mémoire ?
**État réel (base)** : **Table `document_access_log(s)` INEXISTANTE sous tout nom** (ANOM-10) — D44/triage la décrivent existante, c'est FAUX. Pire : l'edge `get_document_url` (`logDocumentAccess`) INSERT déjà dans `document_access_logs` à chaque accès puis avale l'erreur en silence (« table may not exist ») → 0 trace + faux-vert + drift de nommage (s/sans-s). Confidentialité = DEUX modèles incompatibles : (a) SQL RÉEL persisté = enum `document_visibility` à 3 valeurs (`gestionnaire_seul`/`conseil`/`tous_coproprietaires`) appliqué par l'edge + RLS — fonctionne ; (b) front MOCK volatile (`useDocumentPermissions.ts`, variables module en JS) = 4 niveaux + ACL fine par utilisateur, modale `AccessRightsManager` dont « Enregistrer » N'ÉCRIT NULLE PART, onglet Historique = théâtre vide. ACL fine déjà abandonnée par décision 0020.
**Ma proposition** : Construire un journal MINIMAL mais réel : table `document_access_log` (copro_id, document_id, user_id, action, success, created_at), RLS gestionnaire-only en lecture, alimentée par le SEUL tuyau (server function d'URL signée), purge auto à 1 an (cron, proportionnalité RGPD), logue téléchargements + refus d'abord. Réglage confidentialité via RPC `set_document_visibility` sur les **3 niveaux SQL existants**, en ABANDONNANT le 4e niveau + ACL du mock (déjà supersedé par D69-bis). Ne pas recoder la modale 4-niveaux en v2.
**Ce qui est strictement TA décision (USER)** : construire maintenant vs reporter P1 ; table dédiée vs **audit-trail générique** (C.17 #2, réutilisé par reverse_payment/contre-passations/modération mur/accès CS art.21) ; grain (téléchargements seuls vs + consultations/refus/changements de visibilité) ; rétention (1 an ?) ; supprimer la modale 4-niveaux ou la rebrancher sur 3 niveaux ; faut-il une 4e brique « réservé au(x) propriétaire(s) du lot » via `documents.coproprietaire_id`/`lot_id` pour pièces nominatives sensibles ?
**Dépendances / préalables bloquants** : **ANOM-01 (RLS ON sans FORCE) à fermer d'abord** sinon le journal trace des accès sur une base lisible en anon ; D69-bis (3 cercles, abandon 4e niveau — le mock est déjà périmé) ; C.17 #2 (audit générique) ; `get_document_url` non déployée (ANOM-04) ; bloquant go-live du **portail copropriétaire** (journalisation accès docs = exigence RGPD).
**Pièges adversariaux à connaître** : recoder le 4-niveaux + ACL = code déjà condamné par D69-bis + faille de confidentialité réelle (doc « confidentiel » lisible par le cercle SQL effectif). Laisser l'insert silencieux = faux-vert permanent (rien le jour d'un contrôle CNIL/litige art.33). Reporter sans retirer le faux = aggravation RGPD (garantie inexistante affichée). Sur-loguer sans purge = non-conformité art.5 RGPD. « art.64-9 du décret 67-223 » cité par le triage = NON vérifié, ne pas reprendre tel quel.
**Options (pour AskUserQuestion)** : 1. **Construire minimal + 3 niveaux SQL (ma reco)** — vraie table + RPC `set_document_visibility`, abandon 4e niveau, débloque le portail, coût faible · 2. **Audit-trail générique d'abord** — table transverse C.17 #2 réutilisée partout ; plus structurant, chantier de socle plus lourd · 3. **Reporter P1 + retirer le faux** — marquer D44 en P1, supprimer insert silencieux/onglet Historique/mock, garder la RPC 3-niveaux ; bloque le go-live RGPD du portail.
**Risque si on tranche mal** : faille de confidentialité réelle + faux sentiment de sécurité ; faux-vert le jour d'un litige ; portail bloqué au go-live ; volumétrie/RGPD si sur-log sans purge ; journal cosmétique si RLS FORCE pas posée avant.

---

### C14-3 — DTG confondu avec le PPT
**La question (1 phrase claire)** : Modélise-t-on le DTG (diagnostic constat) comme un document réglementaire dédié distinct du PPT (plan d'action), et comment matérialise-t-on « le DTG alimente le PPT » ?
**État réel (base)** : Le réceptacle EXISTE déjà — enum `technical_doc_type` contient déjà `'dtg'`/`'ppt'`/etc. (pas une création), table `technical_documents` (pointe vers `documents`, donc le PDF vit dans la GED) avec `doc_type`, `validity_date`, `observations` (mais AUCUNE colonne métier dédiée : pas de « DTG réalisé le / conclusion travaux O/N »). Table `planned_works` = le PPT réel (`from_ppt`, `ppt_year`, montants, `ag_id`...). **AUCUN lien `planned_works`↔`technical_documents` type dtg** (ni FK, ni vue, ni RPC). Côté front : TOUT est mock (`usePPT.ts`, `MOCK_PPT`, `MOCK_TECHNICAL_DOCUMENTS`) — aucune requête réelle. Donc le `type='dtg'` n'est pas absent, mais le COUPLAGE DTG→PPT et la sémantique « maillon distinct » le sont.
**Ma proposition** : Garder le DTG comme document réglementaire dédié (`technical_documents` type='dtg'), surtout PAS une 3e source de données travaux. Matérialiser le lien par un **pré-remplissage assisté** (« générer un brouillon de PPT depuis le DTG » → crée des `planned_works` brouillons), pas un couplage rigide. V1 = rendre le `type='dtg'` réel + l'afficher dans la check-list de conformité. P1 = pré-remplissage PPT + traçabilité des déclencheurs d'obligation.
**Ce qui est strictement TA décision (USER)** : DTG = simple document vs entité enrichie (colonnes date réalisation / conclusion travaux O/N / coût 10 ans / validité réglementaire) ; matérialisation du lien (vue faible vs FK `planned_works.source_dtg_id` vs action de pré-remplissage) ; tracer ou non les déclencheurs d'obligation DTG ; périmètre V1 vs P1 ; le lien DTG→PPT est-il un attendu légal FORT (à challenger : le PPT « s'appuie sur » le DTG) ?
**Dépendances / préalables bloquants** : ENFANT de **D54** (persister le domaine Conformité, 100 % mock aujourd'hui) — pas autonome ; D56 (applicabilité dynamique, présentée comme AIDE jamais bloquante — confirmé USER) ; D39 (PPT = vue dérivée des opérations réelles, PAS une 3e source) ; recoupe P3 (`document_requirements` + `v_copro_document_compliance`). RNIC absent (voisin, hors C14-3).
**Pièges adversariaux à connaître** : transformer le DTG en 3e source de travaux = anti-D39 → divergence DTG / `planned_works` / GL (le type de double-source qu'on combat, ANOM-12). Faire de l'applicabilité un GATE = viole D56 (assister, pas bloquer). Sur-modéliser (FK + colonnes) sur un domaine 100 % mock non audité (ANOM-25) = dette de schéma sur une feuille à faible enjeu. Seuils d'âge (10 ans DTG / 15 ans PPT) + calendrier PPT à reconfirmer avant de coder D56. Vérifier qu'une `document_category` GED ne doublonne pas déjà `technical_doc_type`.
**Options (pour AskUserQuestion)** : 1. **Document dédié + pré-remplissage assisté (ma reco)** — type='dtg' réceptacle existant, pas de 3e source ; V1 type réel + check-list, P1 pré-remplissage + déclencheurs · 2. **Entité DTG enrichie + FK dure vers le PPT** — colonnes métier + `source_dtg_id` ; structuré mais sur-modélise + couplage rigide · 3. **Minimal V1 : désambiguïser l'affichage** — aucune migration, séparer visuellement DTG/PPT en branchant le type existant ; le plus rapide, lien non outillé.
**Risque si on tranche mal** : option lourde trop tôt → FK figée sur domaine mock → re-migration quand D54/D56 affinent ; minimal → confusion persiste, ressaisie DTG dans PPT, check-list conformité (P3) incomplète → fiche synthétique/todos légaux (D70) faussés ; 3e source de travaux → divergence chiffres (ANOM-12) ; gate au lieu d'aide → viole D56.

---

### C14-4 — Factur-X / EN 16931 (pré-requis du module Factures)
**La question (1 phrase claire)** : Fait-on des champs Factur-X (SIRET, TVA par taux, numéro/date/devise, `tiers.siret`) un pré-requis OBLIGATOIRE du module Factures, AVANT la future session Factur-X ?
**État réel (base)** : Toit posé sur fondations vides — les colonnes sont DÉCLARÉES mais ni remplies ni utilisées. EXISTE : SIRET (`cabinets.siret`, `copros.siret`, `tiers.siret` avec CHECK 14 chiffres + `tiers.vat_number`), TVA SCALAIRE (un seul `taux_tva`/`taux_pct` par facture/ligne), `invoice_number`/`invoice_date`, RPC `validate_supplier_invoice`/`post_supplier_invoice`. MANQUE : **DEVISE nulle part** (aucune colonne `currency`, euro implicite — EN 16931 BT-5 l'exige) ; **TVA par taux EN 16931 (BG-23, multi-taux) non modélisée** ; la RPC `validate_supplier_invoice` IGNORE HT/TVA/taux (ne lit que le TTC `sil.amount`) → colonnes restent NULL ; le formulaire `useNewFacturePage` envoie mono-poste TTC sans SIRET/HT/TVA/devise ; aucun générateur PDF/A-3+XML CII ; module Factur-X front = 100 % MOCK (`useFacturX.ts` en setTimeout, `MOCK_FACTURES_FACTURX`).
**Ma proposition** : Acter C14-4 comme **clause de Definition of Done du module Factures** (pas un nouveau chantier). SIRET tolérant au brouillon mais EXIGÉ à la validation (porte de sortie `vat_number` pour fournisseur étranger) ; TVA = taux scalaire par ligne en V1, HT/TVA dérivés et persistés à l'écriture, multi-taux BG-23 en P1 ; GL reste TTC (copro non-assujettie, TVA = charge, décret 2005-240) + flag `copros.is_vat_liable` dormant ; **devise `currency DEFAULT 'EUR'` posée maintenant** ; périmètre = data-readiness UNIQUEMENT, le générateur reste la session ultérieure.
**Ce qui est strictement TA décision (USER)** : SIRET bloquant vs tolérant ; granularité TVA V1 (scalaire vs multi-taux BG-23) ; saisie HT+taux→TVA dérivée vs TTC seul ; devise posée maintenant vs différée ; périmètre (data-readiness vs inclure le générateur) ; niveau d'exigence selon le calendrier e-invoicing.
**Dépendances / préalables bloquants** : **D55/D19 (ventilation TVA + HT/TVA par ligne)** doit être tranché ET câblé — C14-4 et la position C.6 (V1 = copro non-assujettie + fiabiliser HT/TVA/taux + flag `is_vat_liable`) sont le MÊME chantier, à fusionner ; module Factures (Palier 6) ; `tiers`/création fournisseur à la volée ; évolution `validate_supplier_invoice`/`post_supplier_invoice` (persister HT/TVA sans changer le TTC porté au GL) ; migration devise ; C.17 (idempotence/horloge des RPC touchées).
**Pièges adversariaux à connaître** : « EN 16931 » exact sur l'intention mais PARTIEL sur la lettre (notre scalaire n'est pas la ventilation multi-taux BG-23). La copro **REÇOIT** plus de Factur-X qu'elle n'en émet → la vraie priorité = **ingestion d'un Factur-X entrant**, couverte par AUCUNE des 3 options. Module Factur-X mock = faux-vert de conformité (ANOM-10/26, test tautologique) → au minimum étiqueter « démo ». Copros avec locaux commerciaux assujettis (taux mixtes) → le scalaire V1 sature vite, `is_vat_liable` à réveiller plus tôt.
**Options (pour AskUserQuestion)** : 1. **Champs requis, TVA scalaire (ma reco)** — DoD du module Factures : SIRET à la validation, HT+taux→TVA persistés, `currency DEFAULT 'EUR'`, D19 activée, GL reste TTC ; générateur + multi-taux en P1 · 2. **Conformité fiscale totale dès V1** — table multi-taux BG-23, SIRET dur, devise + générateur PDF/A-3+XML ; sur-ingénierie pour un non-assujetti · 3. **Tout en session dédiée** — rien exigé au build ; risque de back-fill/re-saisie de l'historique (l'archéologie à éviter).
**Risque si on tranche mal** : différer → factures live TTC sans SIRET/TVA → migration de back-fill manuelle (RGPD/probatoire délicat) ou re-saisie ; sur-spécifier → retarde le module Factures (pivot Palier 6) ; laisser le mock → faux-vert de conformité chez un vrai syndic.

---

### C15-2 — Paiement en ligne des charges (SEPA GoCardless vs CB Stripe)
**La question (1 phrase claire)** : Quel rail de paiement en ligne des charges (SEPA GoCardless vs CB Stripe) et comment écrit-on l'encaissement au grand livre sans jamais inscrire un paiement qui n'a pas eu lieu ?
**État réel (base)** : RÉUTILISABLE et sain : `payments` (avec `idempotency_key`), `payment_allocations`, **`post_owner_payment`** = route canonique (idempotente, écrit D512/C450-x, gère le trop-perçu en avance 450-3, appelle `allocate_payment` en interne — donc le webhook appelle `post_owner_payment`, PAS `allocate_payment`), `allocate_payment` (FIFO cloisonné par nature), `reverse_payment`/`unallocate_payment` (contre-passation prouvée), edge `record_payment` (wrapper authentifié, pas signé), enum `payment_method` avec `direct_debit`. MANQUE : `webhook_events` (idempotence par `event_id`, pilier C.17 #7) INEXISTANT ; table `sepa_mandates` INEXISTANTE (`direct_debit` = libellé sans plomberie) ; `payment_intents` INEXISTANT (SEPA asynchrone J+2 à J+5, rejet jusqu'à 8 semaines) ; edge webhook signé + GoCardless Payments INEXISTANT ; **0 edge déployée (ANOM-04)**. ⚠️ Mémoire « SEPA GoCardless déjà intégré » PARTIELLEMENT FAUSSE : `src/lib/banking/gocardless.ts` = Bank Account Data (Open Banking DSP2, LECTURE SEULE), PAS GoCardless Payments (prélèvement).
**Ma proposition** : Valider la décision telle quelle, avec précision. SEPA plutôt que CB (provisions récurrentes, mandat signé une fois, commission plus basse) ; GoCardless plutôt que Stripe pour CE flux ; jamais d'INSERT brut (tout via `post_owner_payment`). Edge DÉDIÉ `gocardless_webhook` qui (1) vérifie la signature sur le corps brut, (2) résout copro→lot→copro et refuse sinon, (3) idempotent via `webhook_events(event_id)`, (4) n'écrit au GL QUE sur « paiement confirmé », (5) contre-passe via `reverse_payment` si rejet SEPA. V1 = poser le modèle (table `sepa_mandates` + edge + `webhook_events`) sans forcément collecter les mandats live.
**Ce qui est strictement TA décision (USER)** : produit GoCardless (confirmer **Payments**, pas Bank Account Data) ; quand écrit-on au GL (au webhook `confirmed` vs `payment_intent` pending→paid→failed) ; table `sepa_mandates` dès V1 vs « modèle posé » seul ; durcir `record_payment` vs créer un edge `gocardless_webhook` dédié ; niveau V1 (modèle posé vs prélèvement live) ; GoCardless vs Stripe unifié avec le billing SaaS vs tout reporter en P1.
**Dépendances / préalables bloquants** : **C.17 #7 (contrat webhook : `webhook_events`, signature corps brut, résolution copro, jamais service_role qui shunte l'appartenance, dead-letter) à trancher AVANT** — C15-2 en est la 1re application ; C.17 #3 (idempotence) ; **ANOM-02 (deux poches 512/502 — le webhook doit savoir quel 512 créditer)** ; **ANOM-03 (créances GL vs `call_for_funds_lines` — FIFO peut imputer sur une échéance fantôme)** ; C15-5 (compte multi-rôle/portail — copro authentifié rattaché à SON lot) ; C.17 #4 (`payment_date DEFAULT CURRENT_DATE` contredit l'horloge serveur — la date = encaissement effectif `charged`, pas le clic) ; **ANOM-04 (0 edge déployée)**. Ne pas confondre avec le billing Stripe de l'abonnement cabinet (flux distinct).
**Pièges adversariaux à connaître** : écrire au CLIC (sans attendre la confirmation) = encaissements fantômes au GL + FIFO qui éteint des créances non payées = corruption de la source de vérité (risque #1). Webhook sans signature / service_role shuntant l'appartenance = un faux « paiement confirmé » solde une dette gratuitement ou écrit dans la copro d'un autre (faille critique). Confondre Bank Account Data (qu'on a, lecture) et Payments (à intégrer) = brique crue faite → V1 qui glisse. Pas de gestion du rejet SEPA 8 semaines = `LOT_GL_MISMATCH` persistant. À vérifier sur la doc GoCardless : SEPA Direct Debit CORE récurrent FR + R-transactions (non vérifié dans le repo).
**Options (pour AskUserQuestion)** : 1. **SEPA GoCardless Payments, webhook→post_owner_payment, V1 = modèle posé (ma reco)** — mandats SEPA, edge signé + `webhook_events` + `sepa_mandates`, écriture GL au « confirmé », rejet→`reverse_payment` ; souveraineté FR, adapté aux provisions · 2. **Stripe (CB + SEPA) unifié avec le billing SaaS** — une seule intégration ; CB = commission plus élevée, mélange flux cabinet/copro · 3. **Reporter entièrement en P1** — V1 = saisie manuelle + rapprochement lecture (GoCardless Bank Account Data existant) ; zéro dette webhook avant un socle finance sain, mais ne tient pas le « modèle posé V1 ».
**Risque si on tranche mal** : écriture au clic → faux soldes lot + corruption GL ; webhook non signé → faille critique (dette soldée gratuitement / cross-copro) ; confusion produit GoCardless → estimation fausse ; rejet SEPA non géré → mismatch persistant ; CB par défaut → commissions facturées au syndicat + mode pas légalement attendu pour des provisions.


---

## Bloc EXP — arbitrages expert (4 dossiers)

### EXP-5 — Clôture du compte vendeur à la mutation : écriture ou pointage ?
**La question (1 phrase claire)** : Quand un lot change de propriétaire, faut-il passer une écriture comptable de transfert vendeur→acquéreur, ou simplement « pointer » le jalon de clôture sans toucher le grand livre ?
**État réel (base)** : Le POINTAGE est déjà codé. `validate_mutation` (0031 L.446-527) ferme la ligne vendeur dans `lot_owners` (end_date), ouvre l'acquéreur, marque les jalons « signature_acte » + « cloture_compte » — et retourne explicitement `gl_posted=false` (« AUCUN GL, le 450 suit le lot »). L'option « écriture » n'existe PAS : aucune fonction ne transfère le 450. Le crochet `ledger_source_type='mutation'` existe dans l'enum mais n'est jamais écrit (dormant).
**Ma proposition** : CONFIRMER le pointage (option 1) + 3 garde-fous. Le solde 450 porte la dimension `lot_id` et « suit le lot » : rien à transférer, c'est juste comptablement. Une écriture de transfert doublerait une créance déjà bien placée. CORRECTION adversariale intégrée : ne PAS dire que l'écriture « casse l'annexe 1 » (une partie double équilibrée ne la casse pas) ; le vrai risque est le **double comptage / double source de vérité** + une écriture parasite qui pourrait tomber en période close. Garde-fou n°1 = matérialiser une issue/tâche SERVEUR si solde≠0 — c'est un **petit chantier** (table/colonne ou `mutation_steps.payload`), pas un simple câblage : aucune table issue/task n'existe côté serveur aujourd'hui.
**Ce qui est strictement TA décision (USER)** : (a) confirmer pointage vs écriture ; (b) le sort du cas CRÉDITEUR (le syndicat doit au vendeur : avances art.35, trop-perçu) — remboursement vs transfert à l'acquéreur, aujourd'hui non tranché ; (c) trancher LIVE vs effective_date pour l'alerte (voir pièges).
**Dépendances / préalables bloquants** : ANOM-03 (source de vérité créances = GL vs `call_for_funds_lines`, écart prouvé jusqu'à -13550 après cancel) — tant qu'elle n'impose pas le GL comme source unique, le solde affiché à la mutation peut être FAUX. C12 jalon 6. Immutabilité période (si on choisissait l'écriture).
**Pièges adversariaux à connaître** : Les RPC d'opposition art.20 (`record_mutation_opposition` / `settle_mutation_opposition`) **n'existent NULLE PART** — seulement listées « à faire » en commentaire 0019. La seule écriture qui apurerait le 450 à la vente est donc un chantier C.12 futur, pas un existant : ne pas présenter l'opposition comme opérationnelle. Garde-fou n°2 (LIVE pour l'alerte / figé pour l'état daté) **contredit la lettre du triage C.12** qui demande « à effective_date » → c'est un arbitrage à ratifier, pas une constatation.
**Options (pour AskUserQuestion)** : 1. Pointage + 3 garde-fous (issue serveur si solde≠0, LIVE/figé, opposition distincte) — ma reco, zéro double-écriture · 2. Pointage nu (statu quo) — aucune trace serveur du solde, contredit « issue forcée si solde≠0 » · 3. Écriture de transfert 450 — déconseillé, double la créance, écriture inutile rendue telle par le lot-centric.
**Risque si on tranche mal** : Écriture → double comptage de la créance + écriture parasite en période close, bugs comptables durs à débusquer. Pointage nu → un vendeur part avec une ardoise non tracée (alerte = texte de modale volatile), perte du recouvrement art.20, cas créditeur jamais arbitré. Transverse : sans ANOM-03 résolu, on alerte sur un chiffre faux.

---

### EXP-3 — Période de référence de l'état daté
**La question (1 phrase claire)** : Sur quelle date/exercice s'arrête la photo des comptes de l'état daté remis au notaire ?
**État réel (base)** : La photo s'arrête TOUJOURS à `v_eff = coalesce(effective_date, signature_date, current_date)` (0076 L.60 / 0080 L.62), dérivée serveur. La RPC `generate_etat_date_payload` n'accepte AUCUN paramètre de date. Tout le financier (soldes 45x parties 1/2, avances/provisions appelées partie 3) est borné `tx_date <= v_eff`. Le champ `dateReference` saisissable est un vestige v1 100% mock (`useEtatsDate.ts`) qui meurt gelé.
**Ma proposition** : v_eff comme SEULE date de référence (option 1), PAS de `dateReference` libre — c'est la loi (art.5 décret 67-223) et c'est déjà codé. ET corriger le vrai défaut : les blocs « provisions votées non appelées » courant/travaux (0076/0080 L.124-134) prennent TOUS les budgets `status='validated'` SANS filtre de période → deux exercices se cumulent et gonflent la part acheteur. Scoper à l'exercice en vigueur à v_eff via `mutations.period_id` (colonne existe, FK accounting_periods, jamais lue). C'est l'application de E9-q **déjà ratifiée par toi** (REFONTE_DECISIONS L.88), quelques lignes SQL.
**Ce qui est strictement TA décision (USER)** : (a) confirmer v_eff comme unique référence vs un arrêté comptable distinct (dernier exercice approuvé) pour la projection P3 ; (b) exiger une date d'effet/signature pour un état daté `'final'` (interdire current_date silencieux sur le final).
**Dépendances / préalables bloquants** : ANOM-03 (GL vs `call_for_funds_lines`) — P1/P2 lisent le GL, MAIS la P3 « appelées non échues » lit le compteur `call_for_funds_lines` (0080 L.101-108) → l'état daté hérite de la divergence sur une PARTIE de P3, à trancher avant. Versioning tantièmes (D63/G24-AM8).
**Pièges adversariaux à connaître** : **Le gap tantièmes est plus profond que dit** : non seulement `repartition_key_lines` n'a pas de valid_from/valid_to, mais même la CLÉ est sélectionnée par `is_active=true limit 1` (0080 L.85-86) = la clé active AUJOURD'HUI, pas celle valable à v_eff. Numéros d'articles secondaires à fiabiliser (14-2-1, 6-3 décret 67-223 incertains ; le 5% ALUR est porté par art.14-2, pas 14-2-1). `current_date` en `'final'` reste possible techniquement (create_etat_date_snapshot retombe dessus).
**Options (pour AskUserQuestion)** : 1. v_eff + scoper P3 via period_id (reco) — applique E9-q, quelques lignes SQL · 2. v_eff seul, P3 inchangée — zéro migration mais conserve le cumul multi-exercices que E9-q interdit · 3. v_eff + arrêté distinct (dernier exercice approuvé pour P3) — plus prudent juridiquement mais ignore le budget courant et complexifie, à écarter sauf exigence notariale.
**Risque si on tranche mal** : Option B → dès deux budgets validés sur des exercices différents, la part acheteur est SURÉVALUÉE dans une pièce notariale opposable (acheteur paie trop / état daté contesté). Réintroduire dateReference libre → photo datable à un instant arbitraire ≠ date d'effet, non conforme art.5, attaquable. `'final'` sans date → photo datée « du jour du clic », non opposable.

---

### EXP-6 — Définition du « solde fonds travaux » affiché (D67)
**La question (1 phrase claire)** : Que recouvre exactement le solde « fonds travaux » montré à l'utilisateur — le 102 (art.14-2 I), le 105 (ALUR art.14-2 II), ou autre chose ?
**État réel (base)** : 3 surfaces, 3 définitions DIVERGENTES pour le même libellé. Dashboard (`BentoTresorerie.tsx` + `api.ts:134`) = somme **103 + 105**. Balance comptable (`balance-copro-transform.ts:129`) = **105 (+703)**. Vue canonique `v_alur_fund_balance` (0037, votée « source unique » 2026-06-08) = **105 strict**. Le 103 est un compte d'AVANCES (remboursables au vendeur), PAS une réserve. Le 102 est quasi dormant en V1 (travaux via 702). Tous les comptes existent au seed (0025).
**Ma proposition** : Tuile « Fonds de travaux » = **105 strict via `v_alur_fund_balance`** imposée aux 3 surfaces (option 1) + doctrine « carte à deux faces » qui existe déjà dans CONTEXT.md L.55 : Face 1 = réserve réglementaire (105), Face 2 = trésorerie réellement épargnée, JAMAIS additionnées. On SORT le 103 (mélanger une dette du collectif avec une réserve acquise est trompeur) et on n'agrège PAS le 102 (notion 14-2 I distincte ; ligne séparée le jour où il sera vivant). CORRECTIONS adversariales intégrées : **Face 2 = compte 502 SEUL** — le « 512100 »/« 5121 » cité (et dans CONTEXT.md L.55) **n'existe PAS au seed**, ce sont des filtres d'exclusion d'un compte fantôme ; ne pas bâtir une vue dessus. Le bug 103+105 est dans **AU MOINS 2 fonctions** de 0028 (L.518 ET L.841), à ne reproduire nulle part en v2. La balance n'est PAS saine non plus : elle inclut 703 (avances) et omet 705 (vrai produit ALUR) — à corriger aussi.
**Ce qui est strictement TA décision (USER)** : (a) 105 strict seul vs carte deux-faces ; (b) montrer ou non en complément la trésorerie épargnée (502) + le rappel « virement livret→courant non effectué » (`v_alur_transfers_pending_cash`).
**Dépendances / préalables bloquants** : ANOM-02 « deux poches » (512 courant + 502 livret) = **PRÉREQUIS BLOQUANT** (audit la décrit comme contradiction non résolue : multi-512 par nature ABANDONNÉ au profit de 512 courant + 502). Tant qu'elle n'est pas tranchée, la Face 2 ne doit pas être figée. ANOM-19 (reconstruction vue agrégat).
**Pièges adversariaux à connaître** : Le commentaire « fonds de réserve 103 » (0028:518) est FAUX (le seed dit « Avances »). Le compte 512100/5121 est un FANTÔME (jamais seedé). **Ne PAS adosser la reco au seuil légal « 5% du budget »** comme preuve : ce seuil est déclaré OUVERT par notre propre audit (L.42) et n'est pas universel (régimes différents depuis loi Climat 2021) — voir EXP-1. L'argument « isoler le 105 » tient pour des raisons COMPTABLES (réserve acquise vs dette), pas par un seuil légal présenté comme certain.
**Options (pour AskUserQuestion)** : 1. 105 strict + carte 2 faces (Face 2 = 502 seul) — reco · 2. 105 strict, une seule face — corrige le bug mais l'utilisateur ne voit pas si le cash est réellement sur le livret · 3. Garder 103+105 (statu quo) — non recommandé, mélange dette et réserve, fausse le contrôle légal.
**Risque si on tranche mal** : Garder 103+105 → « fonds travaux » juridiquement faux (gonflé d'avances remboursables) → votes AG biaisés, contrôle du minimum faussé, contradiction avec l'état daté (450-5 exclu de la partie créditeur), trois chiffres divergents qui ruinent la confiance finance. Additionner 105 (engagement) + 502 (cash) → double comptage (le double du fonds réel).

---

### EXP-1 — Minimum légal de la cotisation ALUR (art.14-2 II)
**La question (1 phrase claire)** : Quel plancher légal applique-t-on/affiche-t-on pour la cotisation annuelle au fonds de travaux : 2,5% du budget, MAX(2,5% PPT ; 5% budget), ou 5% du budget ?
**État réel (base)** : Question DÉJÀ tranchée dans le projet. Le mémo `docs_obligatoires_convocation.md` (correction expert 2026-06-15) dit mot pour mot : plancher = **5% du budget prévisionnel annuel**, ce N'EST PAS un MAX(2,5% PPT ; 5%). Le code ne contient QUE « 5% du budget » (jamais 2,5% PPT ; aucune assiette PPT calculée nulle part). Mais : la constante `FONDS_ALUR_POURCENTAGE_MIN = 5` est **morte** (jamais importée), « 5% » est recopié en dur dans 6 fichiers, et **aucune garde de plancher n'existe** (ni front, ni CHECK, ni RPC) — on peut saisir 0% ou 100%. Écriture cotisation = D450-5/C105 (0026:482), `validate_ag_variables` ne valide même pas le montant ALUR (exception L.1064).
**Ma proposition** : Option 1 « garde-fou intelligent ». Fermer le faux débat (5% est la réponse, ratifiée). 5% = défaut pré-rempli (déjà le cas) + **avertissement NON-bloquant** si l'AG vote moins + montant **re-dérivé du budget validé** (plus de saisie libre = anti faux-WYSIWYG). Pas de blocage SQL : le GL enregistre le vote réel. Centraliser la règle en UNE source de vérité (tuer la constante morte + les 6 libellés dispersés). CORRECTIONS adversariales intégrées : (1) le wording de l'avertissement doit dire « plancher légal 5% — **vérifiez qu'une exemption art.14-2 II s'applique, sinon la décision est irrégulière** », PAS « l'AG est souveraine et peut baisser » (un minimum d'ordre public ne se vote pas en dessous sans exemption) ; (2) exemption = copro de **« 10 lots OU MOINS »** (pas « moins de 10 ») ; (3) abandonner les **DEUX** branches fausses de l'intitulé (le « 2,5% du budget » aussi, pas que le MAX-PPT) ; (4) corriger la ligne 42 de l'audit en « plancher = 5% budget prévisionnel + 3 exemptions, TRANCHÉ ».
**Ce qui est strictement TA décision (USER)** : (a) ratifier 5% + abandon définitif des 2 variantes ; (b) plancher = garde-fou non-bloquant vs blocage dur ; (c) gérer les exemptions par un flag par copro plutôt qu'une règle aveugle ; (d) confirmer l'assiette = budget prévisionnel COURANT seul (art.14-1), pas budget+travaux.
**Dépendances / préalables bloquants** : Chaîne AG→finance (`create_ag_with_standard_resolutions` + `create_budget_from_ag_resolution`, ANOM-05/D28-D29) doit injecter le montant voté, sinon le template ag-06 reste inerte. Le budget prévisionnel doit être matérialisé (assiette du 5%) avant tout calcul/garde.
**Pièges adversariaux à connaître** : La formule MAX(2,5% PPT ; 5%) renvoie à une AUTRE règle (seuil petite copro / RNIC) — coder une assiette PPT = matérialiser du droit inventé (aucune table ne la stocke). Plancher DUR sans exemptions = rend l'app illégale à l'envers (force une cotisation que la loi dispense). Au câblage : vérifier que `budgetMontant` (ag-variables.ts:138) = le prévisionnel COURANT et non un total incluant travaux, sinon 5% sur mauvaise base. Bien distinguer COTISATION (D450-5/C105) de l'AFFECTATION (D105/C705, 0037) — ne pas confondre.
**Options (pour AskUserQuestion)** : 1. Garde-fou 5% : défaut + avertissement non-bloquant (mention exemptions) + montant dérivé + centralisation (reco) · 2. Défaut simple 5% : pré-rempli sans avertissement ni dérivation — léger mais 0% passe inaperçu · 3. Plancher dur bloquant : viole la souveraineté AG et casse les copros exemptées — déconseillé.
**Risque si on tranche mal** : Rouvrir le MAX-PPT → coder une assiette PPT inexistante = droit inventé. Plancher dur sans exemptions → app illégale à l'envers + viole « le GL enregistre le vote réel ». Statu quo (montant saisi libre) → faux-WYSIWYG (la résolution affiche un montant qui ment) + piège migration à moitié faite (« 5% » dans 6 fichiers). Ligne 42 non corrigée → la fausse prémisse ressort à chaque relecture.


---

## Bloc C16 — Cabinet / multi-cabinet (5 dossiers)

> NB transverse (à garder en tête sur C16-1 et C16-5) : le **périmètre V1 du MANDAT DE SYNDIC est un arbitrage strictement USER, NON résolu**. Il y a une contradiction frontale à trancher : la décision A3 dit « la cérémonie du mandat (contrat-type) vient PLUS TARD, en P1 », alors que C16-1 et C16-5 traitent le mandat comme un **prérequis V1** (sans entité mandat datée, pas d'alerte « à renouveler », pas de KPI portefeuille, et le crochet AG reste mort). Décider « mandat en V1 » ou « mandat différé P1 » conditionne C16-1, C16-3 (déclencheur de sortie) et la tuile mandat de C16-5. C'est LE nœud du bloc.

---

### C16-1 — Mandat de syndic en V1 : entité dédiée OU réutiliser `contracts` ?

**La question (1 phrase claire)** : Comment modéliser le mandat de syndic en V1 (dates début/fin/renouvellement) pour alimenter l'alerte « mandat à renouveler », les KPIs portefeuille et le crochet AG — en créant une table neuve, ou en réutilisant l'existant ?

**État réel (base)** : La table `contracts` (`0021`) porte DÉJÀ exactement la dimension d'un mandat (start_date, end_date, renewal_date, tacit_renewal, notice_months, status), le slug `'syndic'` est DÉJÀ seedé (`0004` l.49), l'alerte « à renouveler » est DÉJÀ codée (`v_contracts_overview`/`v_contracts_alerts`, `0047`, horloge serveur), et le renouvellement en chaîne par AG fonctionne DÉJÀ via `MANAGE_CONTRACT` (`0030`). Ce qui MANQUE vraiment : le crochet `APPOINT_SYNDIC` est un **no-op informatif** (pointe vers le tuyau mort), et `v_cabinet_overview` n'existe pas (KPIs agrégés en JS côté client).

**Ma proposition** : **Réutiliser `contracts` (domaine « syndic »), PAS de table neuve.** On hérite gratuitement de l'alerte, des vues et du moteur AG (cohérent avec la règle v2 « un seul chemin/feature »). Travail V1 réduit à : (a) seeder un `contracts 'syndic'` à l'onboarding (`create_copro`), durée défaut **3 ans modifiable, jamais bloquée si < 3 ans** ; (b) re-router `APPOINT_SYNDIC`/les 2 résolutions front vers la logique `MANAGE_CONTRACT` ; (c) exposer « mandats à renouveler » dans `v_cabinet_overview` en sommant `v_contracts_alerts` filtré `'syndic'`. Honoraires = HORS mandat (au budget, poste 621). Actes hors mandat = avertissement non bloquant en V1.

**Ce qui est strictement TA décision (USER)** : (1) le périmètre V1 du mandat (vs A3 « plus tard » — le nœud transverse) ; (2) **le vrai arbitrage de fond** : `contracts.tiers_id` est NOT NULL et un `tiers` est par construction un **fournisseur EXTERNE** — réutiliser `contracts` oblige à inscrire le cabinet gestionnaire comme un « tiers/prestataire » de chaque copro. Acceptable ou non sur le plan du modèle ?

**Dépendances / préalables bloquants** : A3 (cérémonie contrat-type en P1, à concilier) ; vérifier RLS `contracts` ON+FORCE dans la baseline v2 (ANOM-01) ; basculer le tri JS de `useContracts.ts` sur horloge asOf (C.17-4).

**Pièges adversariaux à connaître** : le « plafond 3 mandats » qui justifiait l'entité est un FAUX AMI = 3 *pouvoirs de vote*/mandataire (art.22 al.3), **déjà codé en `0065`**, sans lien avec la durée. Le dossier initial affirmait « rien n'existe, table à créer de zéro » = FAUX (doublonnerait `contracts`). Et réutiliser à l'aveugle a son coût caché (le `tiers_id`).

**Options (pour AskUserQuestion)** : 1. **Réutiliser `contracts 'syndic'` (RECO)** — zéro table neuve, hérite alerte+vues+moteur AG ; coût = cabinet inscrit comme `tiers` de la copro. · 2. **Table dédiée `syndic_mandate`** — sépare proprement le syndic du fournisseur externe, mais duplique la source du mandat (viole règle v2) + re-code alerte/RLS/routage déjà existants. À retenir SEULEMENT si « syndic = tiers » est jugé inacceptable. · 3. **Différer en P1** — statu quo : `APPOINT_SYNDIC` reste mort, pas de KPI « à renouveler », `v_cabinet_overview` amputée. Respecte A3 mais laisse un câblage AG mort pour un coût de réutilisation pourtant faible.

**Risque si on tranche mal** : créer `syndic_mandate` en croyant « rien n'existe » = doublon d'entité = la dette même que la refonte veut tuer ; réutiliser `contracts` sans trancher `tiers_id` = migration qui casse (NOT NULL) ou faux tiers bricolé sans décision ; différer = câblage AG mort + actes possibles hors mandat sans signal.

---

### C16-4 — Escalade `platform_admin` : fermer la porte dérobée globale

**La question (1 phrase claire)** : Comment fermer la faille d'escalade super-admin (un `platform_admin` sur une seule copro devient dieu sur TOUS les cabinets) et où stocker ce droit hors du périmètre tenant ?

**État réel (base)** : `platform_admin` existe comme valeur de l'enum `membership_role`, donc porté par `memberships` dont `copro_id` est NOT NULL. **La faille** : `user_is_platform_admin()` (`0023` l.63-83) fait un `exists` sur `memberships` **sans regarder copro_id** → un seul rang ouvre un bypass GLOBAL en **lecture ET écriture** (court-circuite `user_has_copro_access`, `user_is_copro_manager`, + 4e helper `user_is_cabinet_manager` `0042`, + policies `p_admin_all FOR ALL`). `profiles.is_platform_admin` n'existe PAS ; `admin_cabinet` et `responsible_manager_id` non plus (décidés sur papier seulement) ; aucune table d'audit/break-glass n'existe. RLS live = ON SANS FORCE sur 82/87 tables (5 GL déjà en FORCE).

**Ma proposition (option A)** : Sortir le flag vers une **table dédiée `platform_admins(user_id PK)`** (hors-tenant), faire de ce flag un **bypass LECTURE SEULE tracé**, créer **`admin_cabinet` DANS LE MÊME chantier** (sur-ensemble du filtre cabinet déjà en place), et appliquer en **patch live hors-bande (0088+) AVANT la baseline RLS v2** car la faille est active. Écriture exceptionnelle = RPC break-glass avec motif obligatoire + ligne d'audit. Cumul `platform_admin`+`gestionnaire` INTERDIT. Vérifier d'abord 0 rang sur le live avant de débrancher ; enum laissé mort.

**Ce qui est strictement TA décision (USER)** : (1) table dédiée vs colonne `profiles` (l'audit de référence recommandait la COLONNE — je dévie consciemment) ; (2) patch live immédiat vs tout dans la baseline RLS v2 ; (3) créer `admin_cabinet` maintenant ou juste après ; (4) retirer ou non la valeur d'enum après vérif live.

**Dépendances / préalables bloquants** : E1 (fermer cette escalade) est un **prérequis explicite de B5** (vrai 2e tenant) ; doctrine C.17 #8 (super-admin lecture seule + break-glass) à ratifier ; la baseline RLS v2 réécrit les helpers `0023` → C16-4 doit être tranché AVANT de l'écrire (sinon rétro-installation douloureuse).

**Pièges adversariaux à connaître** : la policy `p_own_update` sur `profiles` ne verrouille QUE `cabinet_id` → une colonne `profiles.is_platform_admin` serait **auto-modifiable** par l'utilisateur = auto-promotion en dieu (faille pire). Périmètre sous-estimé : **4 helpers** à corriger, pas 3 (oubli de `user_is_cabinet_manager` `0042`). RGPD : citer art. 5-2/32 (accountability/sécurité), PAS art. 30 (registre des traitements).

**Options (pour AskUserQuestion)** : 1. **Table dédiée + patch live + admin_cabinet (RECO)** — `platform_admins` hors-tenant (aucune policy d'auto-update), lecture seule, break-glass tracé, admin_cabinet créé en même temps, patch live 0088+ avant baseline. · 2. **Colonne `profiles.is_platform_admin` + live** — même sécurité MAIS exige de durcir `p_own_update` (étape critique facile à oublier) ; c'est la voie de l'audit de référence. · 3. **Tout dans la baseline RLS v2** — un seul lot propre, pas de double travail, MAIS la faille cross-tenant reste ouverte sur le live jusque-là (contredit E1 prérequis B5).

**Risque si on tranche mal** : garder le flag sur `memberships` = accès R+W global non tracé sur tous les cabinets (fuite RGPD + écritures fantômes sur GL légal) ; colonne `profiles` sans durcir `p_own_update` = auto-promotion ; ne pas créer `admin_cabinet` maintenant = rouvrir le chantier RLS plus tard ; repousser à la baseline avec un 2e cabinet en prod = porte dérobée ouverte en multi-tenant.

---

### C16-2 — Honoraires de syndic : noyau forfait sur compte 621

**La question (1 phrase claire)** : Faut-il créer une modélisation dédiée des honoraires de syndic en V1, ou le forfait de gestion sur le compte 621 appelé avec les provisions suffit-il ?

**État réel (base)** : Le compte **621** « Rémunération du syndic » (+ sous-comptes 6211 forfait / 6212 débours / 6213 frais postaux / 622 autres) est DÉJÀ seedé par `provision_copro_chart` (`0025`), classé `charge_nature='courant'` (`0059`, bonne poche). La chaîne « ligne de budget sur 621 → `validate_budget` → `post_budget_call_for_funds` » écrit D450-1/lot · C701 et marche **génériquement, zéro code syndic**. Le front mappe DÉJÀ le poste `honoraires_syndic → '621'`. Le golden loop (`0029`) matérialise déjà « Honoraires syndic 4500 » appelé en T1 → noyau V1 PROUVÉ. Ce qui MANQUE : toute table/RPC/grille dédiée (Novelli = ALUR 2014 + décret 2015-342) = ZÉRO support, tout l'effort P1.

**Ma proposition** : **Valider C16-2 V1 tel quel** = ligne de budget standard sur 621, incluse au prévisionnel courant, appelée via 701. **Zéro objet nouveau.** Seul ajout (« clean and simple ») : pré-suggérer la ligne 621 dans tout nouveau budget prévisionnel. Prestations hors forfait (état daté, recouvrement) = saisie manuelle sur 622. On ne comptabilise QUE la charge copro, jamais le CA cabinet (GL par-copro). Grille Novelli complète = P1, **suspendue à l'arbitrage mandat (ANOM-08)**.

**Ce qui est strictement TA décision (USER)** : (1) valider le noyau V1 budget-line vs ajouter un raccourci UI dédié ; (2) confirmer 621 agrégé suffit en V1 (vs ventiler 6211/6212/6213 dès maintenant) ; (3) confirmer que le forfait est appelé AVEC les provisions courantes (pas en appel séparé).

**Dépendances / préalables bloquants** : aucune pour le noyau V1 (le forfait sur 621 marche sans entité mandat). Le P1 Novelli, lui, dépend de l'entité mandat (ANOM-08, NON tranchée). Recoupe ANOM-17 (faux WYSIWYG appel) et la classif charge_nature (E3/0059).

**Pièges adversariaux à connaître** : la ligne honoraires DOIT passer par le **budget prévisionnel**, jamais par le wizard d'appel libre — `post_budget_call_for_funds` RECALCULE depuis `budget_lines` et IGNORE toute saisie front (consigne d'usage, pas garde technique, tant qu'ANOM-17 non corrigé). Étiquette « Novelli » imprécise = c'est ALUR 2014 + décret 2015-342 (l'arrêté Novelli 2010 vise l'INFORMATION des honoraires, autre chose).

**Options (pour AskUserQuestion)** : 1. **V1 budget-line 621 (RECO)** — chemin existant prouvé par le seed, zéro objet, pré-suggérer la ligne 621 ; Novelli en P1 suspendu au mandat. · 2. **V1 + raccourci UI dédié** — idem moteur mais écran « Honoraires de gestion » + ventilation 6211/6212/6213 ; plus de confort, code UI en plus pour valeur faible, risque de doublonner le chemin budget. · 3. **Bloquer C16-2 sur le mandat** — ne rien acter avant ANOM-08, traiter forfait+Novelli+plafond+KPIs d'un bloc ; cohérent mais gèle un noyau V1 déjà fonctionnel qui ne dépend pas du mandat.

**Risque si on tranche mal** : sur-modéliser en V1 (table honoraires avant l'arbitrage mandat) = schéma à refaire en P1 + double chemin d'écriture (ANOM-17) ; laisser saisir via le wizard d'appel libre = honoraire jamais appelé ou faux montant (ANOM-05/17) ; classer 621 en « travaux » par erreur = mauvaise poche à la clôture (110/120, annexes 4/5) ; confondre « absent du code » et « interdit par la loi » = disqualifier à tort un P1 légal et attendu.

---

### C16-3 — Transfert de portefeuille / sortie de mandat : sortie minimale V1

**La question (1 phrase claire)** : Que livrer en V1 pour la fin de mandat / changement de syndic — un état « archivé lecture seule » + export de passation, sans vrai transfert intra-plateforme ?

**État réel (base)** : La table `copros` n'a **AUCUNE notion de cycle de vie** (pas de status, is_active, date de fin) — seul `onboarding_step` existe → « archivée lecture seule » N'A AUCUN SUPPORT, c'est à construire (absent du code, pas interdit par la loi). `copros.cabinet_id` est une FK dure NOT NULL sans date ni statut. Une copro live ne peut être ni supprimée (`delete_onboarding_copro` interdit sur copro finalisée + immutabilité GL) ni transférée → **aucun chemin de sortie propre**. Côté export, seul `accounting-csv.ts` existe (compta uniquement, PAS un dossier de passation complet). `APPOINT_SYNDIC` = no-op ; `previous_syndic_name` (`0081`) = nom du sortant à l'onboarding, lecture seule.

**Ma proposition** : Valider la « sortie minimale » comme scope V1 **après reformulation** (la décision littérale est inapplicable). Construire : (1) une colonne d'**état explicite** `copros.status (active|archived)` + archived_at/by/reason via **RPC gardée `set_copro_status`** (jamais d'UPDATE front) ; (2) un « lecture seule » **RÉEL imposé côté serveur** (les RPC d'écriture refusent si `status=archived`), pas un simple grisage UI ; l'archivage ne supprime rien ; (3) export passation V1 « minimal mais défendable » = compta CSV + état des comptes 45x + liste des pièces GED (ZIP complet décret 2019-650 = P1) ; (4) archivage MANUEL, RÉVERSIBLE avec trace, sans toucher `cabinet_id`, memberships conservés.

**Ce qui est strictement TA décision (USER)** : (1) confirmer que la sortie minimale est bien le scope V1 (la position triage est PARTIAL/non ratifiée) ; (2) périmètre exact du dossier de passation V1 ; (3) interdire en V1 tout re-rattachement `cabinet_id` (la reprise par un autre cabinet passe par ré-onboarding) ; (4) déclencheur manuel (vs auto sur date de fin, qui dépend du mandat).

**Dépendances / préalables bloquants** : **ANOM-08 / C16-1** — « à l'expiration du mandat » n'a aucun déclencheur tant qu'aucune entité ne porte une date de fin ; le manuel V1 contourne justement ça, mais il faut l'ACTER (auto = P1). RLS baseline (lecture seule imposée serveur). Immutabilité GL (l'archivage coexiste, ne supprime pas).

**Pièges adversariaux à connaître** : **inversion d'attribution** — `business-rules.md` est la SOURCE du mauvais pattern (UPDATE front), c'est la doctrine machine-à-états qui le CORRIGE (la conclusion « RPC gardée » reste juste). Le KPI portefeuille réel est `v_dashboard_kpis` (sans filtre de statut) → dès qu'on introduit un statut, le filtrer AUSSI, sinon il compte les mandats perdus. Base légale corrigée : la passation = **décret 67-223 art. 18-2** (pas « loi art. 18-2 » ni « art. 33-1 », faux).

**Options (pour AskUserQuestion)** : 1. **Sortie minimale reformulée (RECO)** — état `status` gardé serveur + RPC, lecture seule serveur, réversible, manuel, sans toucher cabinet_id ; export = CSV + 45x + liste GED ; vrai transfert + ZIP complet = P1. · 2. **Zéro sortie en V1** — rien codé : copro live reste active indéfiniment, tout en P1 ; plus rapide mais impossible de clore un mandat perdu. · 3. **Sortie + passation complète V1** — état archivé + ZIP décret 2019-650 complet (compta+GED+AG+lots+45x+ALUR+carnet) ; le plus défendable mais gros chantier 6+ modules qui retarde la baseline + risque de glisser vers le transfert interdit.

**Risque si on tranche mal** : coder C16-3 littéralement = échec à l'exécution (la colonne n'existe pas) ; archivage en masquage UI seul = faux « lecture seule » contournable par API (ANOM-01) ; autoriser UPDATE `cabinet_id` = vrai transfert non cadré pouvant faire fuiter une compta entière vers le mauvais cabinet ; omettre ANOM-08 = « sortie à l'expiration » sans déclencheur = code mort.

---

### C16-5 — KPIs portefeuille `v_cabinet_overview` + tuile « mandats à renouveler »

**La question (1 phrase claire)** : Comment construire l'agrégat portefeuille du gestionnaire (`v_cabinet_overview`) en sommant les vues par-copro sans jamais recalculer, et que faire de la tuile « mandats à renouveler » en V1 ?

**État réel (base)** : `v_cabinet_overview` **n'existe pas** (0 occurrence — livrable proposé, jamais créé). La vraie vue feuille KPI est `v_dashboard_kpis` (`0049`, security_invoker, 1 ligne/copro : trésorerie 512, impayés lot-centric, prochaine AG) mais **sans `cabinet_id`**. **Anti-patron en place** : `usePortefeuille.ts` lit la feuille PUIS re-somme 14 KPI en JS (`calculateKPIs()`) = le « 2e calcul client » à tuer. `copros.cabinet_id` (FK vers `cabinets`, créée en **0006**) = seul lien copro→cabinet. **AUCUNE entité mandat de syndic** (le seul « mandat » en base = pouvoirs de vote AG, autre chose). DRIFT : les vues feuilles existent en migration mais sont ABSENTES du dump baseline (live quasi vierge).

**Ma proposition** : **Découper en 2 vues + brancher `cabinet_id` à la SOURCE + ne PAS afficher la tuile mandat sans entité.** Dans l'ordre : (1) **ajouter `cabinet_id` DANS `v_dashboard_kpis`** (join `copros`) — au plus bas niveau pour que le filtre de sécurité s'applique partout ; (2) créer `v_cabinet_overview` = **pur `SUM/GROUP BY cabinet_id`** de cette feuille (hérite mécaniquement de la justesse du GL) ; (3) **SUPPRIMER `usePortefeuille.calculateKPIs()`** (l'écran lit la liste filtrée + l'agrégat SQL, addition une seule fois) ; (4) prérequis : **re-matérialiser d'abord les vues feuilles** absentes du live (sinon « somme du vide » = faux-vert) ; (5) **NE PAS afficher « mandats à renouveler »** tant que l'entité mandat n'est pas créée (afficher un compteur sans donnée = chiffre faux interdit). **RLS FORCE sur `cabinet_id` = PRÉREQUIS BLOQUANT, pas étape parallèle.**

**Ce qui est strictement TA décision (USER)** : (1) le périmètre V1 du mandat (le nœud transverse) — créer l'entité minimale pour alimenter la tuile, OU masquer la tuile et reporter le plafond légal (D30) en P1 ; (2) `v_cabinet_overview` livrable V1 à part entière (différenciateur manager-first) vs sous-produit gratuit ; (3) matérialisation directe V1 (perf assumée) vs matérialisée P1.

**Dépendances / préalables bloquants** : **ANOM-01 (RLS FORCE)** = prérequis bloquant à l'étanchéité inter-cabinet ; **ANOM-03** (divergence GL 4950 vs `call_for_funds_lines` 4450, écart 500) à figer avant tout total impayés ; re-matérialisation des feuilles `0049`/`0054` sur le live ; **ANOM-08** (mandat) pour la tuile ; D66/UX-SWITCHER (multi-copro réel, aujourd'hui `SINGLE_COPRO_MODE` verrouille) = pas de surface UI sans lui.

**Pièges adversariaux à connaître** : base légale CORRIGÉE — durée du mandat = **décret 67-223 art. 28** (PAS « loi 65-557 art. 28 » qui traite des scissions = erreur grave) ; « sommer pas recalculer » = décision interne D68 (PAS « décret 2005-240 art. 6 ») ; étanchéité = RGPD **art. 5-1-f + 32** (PAS art. 5-1-c minimisation). `cabinet_id` sans RLS FORCE laisse la fuite ouverte.

**Options (pour AskUserQuestion)** : 1. **2 vues + `cabinet_id` à la source (RECO)** — cabinet_id dans la feuille, agrégat SUM pur, suppression du re-calcul JS, re-matérialisation des feuilles d'abord, tuile mandat alimentée par entité minimale `syndic_mandate`, RLS FORCE bloquant. · 2. **Agrégat seul, tuile mandat masquée** — même base technique mais on n'affiche PAS la tuile mandat (pas d'entité créée) ; pilotage trésorerie/impayés/copros/AG marche, mandat attend P1 ; zéro risque de chiffre faux mais reporte D30. · 3. **Vue agrégat directe sans toucher la feuille** — minimal, le filtre cabinet vit seulement dans l'agrégat ; plus court mais feuille « sans garde cabinet » fragile pour le multi-tenant/switcher.

**Risque si on tranche mal** : garder le re-calcul JS = total affiché ≠ somme des lignes (le bug visé) ; brancher sur la mauvaise source d'impayés (ANOM-03 non figée) = total cabinet faux ; poser l'agrégat avant de re-matérialiser les feuilles = 0 partout (faux-vert) ; `cabinet_id` sans FORCE = fuite inter-cabinet (RGPD) ; afficher « mandats à renouveler » sans entité = compteur trompeur interdit + plafond légal non vérifiable.


---

## Bloc C15 — Portail copropriétaire / votes (4 dossiers)

---

### C15-5 — Compte multi-rôle / multi-copro : où vit le contexte actif ?

**La question (1 phrase claire)** : Où stocke-t-on la copro et la casquette actives (gestionnaire / copropriétaire / conseil), et qui tranche le droit d'accès à chaque requête ?

**État réel (base)** : 1 compte = 1 personne est DÉJÀ garanti (`profiles` → `auth.users`). `memberships` impose `UNIQUE(user_id, copro_id)` = 1 seul rôle par (user, copro) ; enum à 3 valeurs seulement (gestionnaire / coproprietaire / platform_admin — le conseil vit ailleurs, dans `council_members`). Les 3 helpers SQL d'autz (`user_has_copro_access`, `user_is_copro_manager`...) sont déjà codés (SECURITY DEFINER, deny-by-default, filtre cabinet intégré). MANQUE : la RPC `get_my_contexts` (source unique du switcher — inexistante), le cookie de contexte signé, le middleware global v2 (aujourd'hui juste un `beforeLoad` de session sans rôle). V1 (gelé) force `isManager || true` + rôle par défaut « gestionnaire » = faux-vert dangereux.

**Ma proposition** : Contexte `{copro_id, role}` en **cookie signé relu côté serveur** ; un **middleware global qui revalide à chaque requête contre les memberships RÉELS** (jamais de rôle par défaut, deny si pas de membership) ; **UNE RPC `get_my_contexts`** comme source unique, agrégeant `memberships` + dérivation `council_members` (conseil) + `lot_owners` (qualité de copro d'un gestionnaire). On GARDE `UNIQUE(user_id, copro_id)` : le cumul gestionnaire+copro sur une même copro se dérive des lots, pas d'une 2e ligne. 1 cabinet / personne accepté en V1.

**Ce qui est strictement TA décision (USER)** : (1) contexte côté serveur vs client ; (2) garder ou lever `UNIQUE(user_id, copro_id)` ; (3) accepter « 1 cabinet par personne » en V1 ; (4) sort du cumul `platform_admin` + gestionnaire (recoupe doctrine C17-8). **Doctrine « contexte serveur + middleware tranche sur memberships réels » à FIGER AVANT de coder le middleware (B3)** — sinon ordre de construction inversé, tout le Palier 1 (châssis) à refaire.

**Dépendances / préalables bloquants** : B3 middleware deny-by-default (la décision le précède) · C16 escalade platform_admin (cible `profiles.is_platform_admin`, n'existe pas encore) · **RLS ON+FORCE (ANOM-01, aujourd'hui ON SANS FORCE sur 87 tables)** = dernier rempart de l'étanchéité · Palier 12 (espace copro/conseil absent du code → le switcher multi-rôle n'a de sens qu'une fois cet espace bâti) · câbler `link_coproprietaire_account` côté front (jamais appelé aujourd'hui).

**Pièges adversariaux à connaître** : Helpers DEFINER = ils contournent la RLS de l'appelant PAR CONSTRUCTION → le test e2e d'étanchéité doit attaquer (a) les `.from(table)` directs ET (b) les RPC DEFINER, en VRAIE session (pas service_role qui shunte tout). FORCE seul ne couvre pas un angle DEFINER. Garde-fou 0086 ne teste PAS FORCE (que `relrowsecurity`) → à durcir. Cumul gestionnaire-aussi-copro-AILLEURS (autre cabinet) : pas de membership → `get_my_contexts` doit UNIONNER memberships ET lot_owners. Docstring trompeur dans `activeCopro.ts` cite une RPC fantôme `get_default_copro_id` → à purger au portage (sinon un agent la recrée).

**Options (pour AskUserQuestion)** : 1. **Serveur + RPC unique (reco)** — cookie signé + middleware revalidant + `get_my_contexts` agrégée ; garde UNIQUE, dérive le cumul des lots. · 2. **Serveur, 3 lectures séparées** — même principe serveur mais sans RPC d'agrégation : plus simple maintenant, mais chaque écran refait la jointure → divergence (la maladie du v1). · 3. **Lever UNIQUE (2 lignes/copro)** — modélise le double rôle explicitement mais CASSE les 3 helpers DEFINER (supposent 1 ligne) → réaudit/réécriture, régression élevée, et inutile (la qualité de copro se dérive déjà des lots).

**Risque si on tranche mal** : Contexte côté client (sessionStorage v1) ou rôle par défaut = n'importe qui forge un `copro_id`/rôle → fuite financière et nominative inter-cabinet (RGPD art. 32, rupture du cloisonnement comptable décret 2005-240 art. 14). Oublier la dérivation `council_members` = un membre du CS aussi copro perd son accès conseil (art. 21). RLS ON SANS FORCE = tout le raisonnement s'effondre (test vert en service_role, faux en session réelle). Erreur ici = à refaire AVANT le middleware → contamine Palier 1 et Palier 12.

---

### C15-1 — Vote par correspondance : neutralisation du défaillant (art. 17-1 A) [version AFFINÉE]

**La question (1 phrase claire)** : Comment rendre conforme l'art. 17-1 A — un correspondant dont la résolution est amendée en séance est « défaillant » (présent au quorum, voix non exprimée) — et jusqu'où va-t-on (saisie syndic vs vote self-service du copro) ?

**État réel (base)** : La « vanne » existe (la vue de résultats filtre déjà `is_excluded=false`), mais AUCUN robinet ne l'ouvre : pas de colonne `is_amended`, **0 writer ne pose jamais `is_excluded=true`** dans tout le repo, pas de RPC `mark_resolution_amended`. `form_document_id` (+ FK) existe mais n'est JAMAIS écrit. **Trou amont décisif** : `compute_ag_quorum` calcule le quorum SUR `ag_attendance` SEUL, et `register_correspondence_form_votes` n'y écrit JAMAIS → le correspondant n'est déjà pas dans le quorum (seul `save_ag_pouvoir` alimente l'attendance, pour les proxy). v2-tanstack = vierge sur la correspondance (front à neuf). L'ÉCRITURE est gestionnaire-only ; la LECTURE (`get_ag_live_results`) est déjà ouverte au copro membre.

**Ma proposition** : V1 = **chaîne complète, saisie syndic uniquement**, en 4 morceaux : (amont) garantir un `ag_attendance(presence_type='correspondence')` avec les tantièmes à `register_correspondence_form_votes` (quorum) ; (aval) RPC gardée `mark_resolution_amended(resolution_id, reason)` qui pose `is_amended` + bascule `is_excluded=true` / `exclusion_reason='art.17-1 A'` sur TOUS les votes correspondance de CETTE résolution (neutralisation totale) ; (lecture) agrégat informatif `excluded_correspondence` dans `get_ag_live_results` (sans toucher le calcul) ; (preuve) écrire `form_document_id` (formulaire REÇU/signé archivé GED). Pas de snapshot de texte par détail. **Le self-service copro part au Palier 12** (dépend du multi-rôle).

**Ce qui est strictement TA décision (USER)** : (a) garantir l'attendance amont (sinon conformité illusoire) ; (b) PDF reçu suffit vs double snapshot de texte ; (c) périmètre V1 = saisie syndic OU self-service copro (le libellé dit « en ligne » mais le code est syndic-only).

**Dépendances / préalables bloquants** : C.17 machine à états (marquer « amendée » = RPC gardée, jamais UPDATE front — ANOM-11) · horloge serveur `now()` (déjà OK, ANOM-20) · self-service ⇒ multi-rôle C15-5 NON tranché + RLS portail · GED/bucket (0048) pour archiver le form · AG cycle complet (Palier 9, branche sur `close_ag`).

**Pièges adversariaux à connaître** : **`mark_resolution_amended` seule NE SUFFIT PAS** — sans l'attendance amont, le défaillant n'a jamais compté au quorum → « présent au quorum / voix non exprimée » reste faux (c'est ce qui a fait passer le verdict à « à nuancer »). Ne PAS dire « les deux RPC sont gestionnaire-only » : seule l'écriture l'est. `ck_ag_vote_exclusion` n'impose AUCUNE valeur de motif → `'art.17-1 A'` est conventionnel, d'où l'exigence de la RPC gardée comme SEULE voie. Neutraliser par résolution (pas par AG), uniquement les `vote_source='correspondence'` de cette résolution.

**Options (pour AskUserQuestion)** : 1. **Chaîne complète saisie syndic (reco)** — amont (attendance) + aval (`mark_resolution_amended`) + agrégat + `form_document_id` ; self-service différé Portail. · 2. **Neutralisation aval seule** — juste la RPC + agrégat, sans attendance ni form : plus rapide mais **laisse la conformité 17-1 A illusoire** → à éviter. · 3. **V1 complet self-service copro** — route portail + RPC ouverte au copro + RLS : dépend du multi-rôle non tranché → fondations absentes, tout recoder au Portail + faille transitoire (un copro pourrait voter pour autrui).

**Risque si on tranche mal** : Oublier la neutralisation (aval) = nullité juridique des votes dès qu'un syndic amende en séance (cas courant) → majorité faussée, action en nullité art. 42 (2 mois). Oublier l'attendance (amont) = quorum faux dans les deux sens, conformité illusoire malgré la RPC. Self-service maintenant = double travail + faille de sécurité transitoire. Neutralisation par UPDATE front = contournement de la machine à états sans trace.

**Coût objets à créer** : colonne `ag_resolutions.is_amended` (+ `amended_at/by`) · RPC `mark_resolution_amended` (~40-60 lignes) · modif `register_correspondence_form_votes` (upsert attendance + `form_document_id`) · modif `get_ag_live_results` (agrégat lecture). Aucune incidence grand-livre. Passe par revue cascade + BEGIN/ROLLBACK + Advisor 0.

---

### C15-3 — Périmètre RGPD du portail : bloquants go-live vs différé P1

**La question (1 phrase claire)** : Quels items RGPD sont VRAIMENT bloquants pour ouvrir le portail (page conf + cookies + base légale + durées + self-rectification tracée + journal d'accès docs), et lesquels se diffèrent en P1 (registre / DPO / AIPD) ?

**État réel (base)** : ~80% du CONTENU juridique existe déjà : page `/confidentialite` complète mais TEMPLATE non finalisé (placeholders `[Nom société]`/`[Adresse]`, DPO fictif, sous-traitant email Brevo MANQUANT). Brique durées en base (`documents.retention_years DEFAULT 10` + `ck_retention`). MANQUE en CODE+BASE : (a) le journal d'accès docs n'est qu'un MOCK en mémoire (`accessLogsStore`, perdu au reload — ANOM-10) ; (b) aucune self-rectification tracée ; (c) **drift d'enum** : TS `NiveauConfidentialite` (4 valeurs) ≠ SQL `document_visibility` (3 valeurs) → la couche permissions raisonne sur un modèle inexistant. ⚠️ **v2-tanstack est VIDE** : ces artefacts sont dans le `src/` GELÉ → à RE-ÉCRIRE, pas à finaliser.

**Ma proposition** : Séparer 2 natures de bloquants. (1) CONTENU/PUBLICATION (ni code ni base, ta charge) : finaliser la page (raison sociale, adresse, DPO réel, **AJOUTER Brevo**), et RETIRER la mention « cookies non-essentiels/consentement » si zéro traceur (pas de bannière requise). (2) CODE+BASE = seulement DEUX mécanismes : journal d'accès docs (UNE table d'audit transverse, RPC SECURITY DEFINER, partagée C14/C15-3/C15-4) + self-rectification bornée aux COORDONNÉES (email/tel/adresse), le reste routé vers le syndic. Durées : mention + champ suffisent ; purge auto différée P1. Registre/DPO/AIPD différés P1 (registre minimal = document à préparer avant 1er client).

**Ce qui est strictement TA décision (USER)** : le découpage exact bloquant/P1 ; la portée de la self-rectification (coordonnées seules vs tous champs) ; faut-il une bannière cookies dès V1 ; faut-il un mécanisme de purge dès le go-live ; le registre des traitements est-il acceptable en P1.

**Dépendances / préalables bloquants** : **3 prérequis durs** — (a) réconcilier l'enum sur les 3 valeurs SQL AVANT de coder le journal (sinon on trace des niveaux fantômes) ; (b) figer le multi-rôle C15-5 (sinon journal nominatif = rôle fantôme) ; (c) **RLS ON+FORCE (ANOM-01)** sinon la mention « contrôle d'accès RBAC » de la page MENT. Provider email (Brevo) à figer pour la liste des sous-traitants.

**Pièges adversariaux à connaître** : **NE PAS s'appuyer sur art. 10 RGPD** (« données pénales ») pour justifier le registre — un impayé de charges n'est PAS une donnée pénale ; le bon fondement est le caractère NON OCCASIONNEL du portail (art. 30.5). La page PROMET déjà un consentement cookies ET une « journalisation des accès » qui n'existent pas → promesses non tenues = inexactitude RGPD attaquable (à corriger AVANT publication). En v2, re-vérifier qu'aucun traceur (Vercel Analytics/Speed Insights) n'est embarqué par défaut. Self-rectification de l'email = valider format + double opt-in (l'email sert aussi de canal de convocation légale).

**Options (pour AskUserQuestion)** : 1. **2 items code + finition page (reco)** — journal d'audit transverse + self-rectif coordonnées ; page finalisée (Brevo, DPO, placeholders) sans bannière si zéro traceur ; 3 prérequis (enum 3 valeurs, multi-rôle, RLS FORCE) ; reste P1. · 2. **+ bannière + purge auto** — version prudente : bannière dès V1 + cron de purge sur `retention_years` ; 2 chantiers que la loi n'exige PAS sans traceur → retarde le go-live. · 3. **Registre + DPO + AIPD aussi bloquants** — maximaliste : juridiquement le plus sûr mais bloque la livraison sur du non-code (l'AIPD n'est probablement pas obligatoire).

**Risque si on tranche mal** : Sur-périmètre = retard go-live pour des obligations non requises ou non codables. Sous-périmètre : coder le journal avant l'enum = audit faux à refaire ; publier la page en l'état = omission Brevo + promesses cookies/journal non tenues = plainte CNIL ; afficher RBAC sans RLS FORCE = FAUSSE déclaration de sécurité (pire grief en cas de fuite) ; mock mémoire conservé = aucune trace ne survit au reload, syndic incapable de prouver « qui a vu mon dossier ». Self-rectif tous champs = un copro réécrit ses tantièmes/soldes = corruption de données de gestion.

---

### C15-4 — Espace conseil syndical : étanchéité art. 21 (journal d'accès + mention au login)

**La question (1 phrase claire)** : Comment tracer les accès des membres du conseil syndical aux données nominatives et les informer de la finalité (contrôle de gestion, non diffusion) au login conseil ?

**État réel (base)** : Les briques d'IDENTITÉ et de DROIT existent et marchent : table `council_members`, helper `is_council_member` (source unique du rôle CS), enum `content_visibility`, `can_view_content`, RLS posée (0034) → la LECTURE CS est déjà gatée. MANQUE les 2 objets de C15-4 : (A) **journal d'accès CS** = seulement un MOCK en mémoire (`accessLogsStore`, perdu au reload, IP jamais captée) — c'est l'objet fantôme `document_access_log` de ANOM-10 ; (B) **mention confidentialité/finalité au login conseil** = absente (grep = 0). v2-tanstack n'a aucune route `/espace-conseil` ni UI portail (Palier 12). C15-4 = AJOUT pur, pas de correction de l'existant.

**Ma proposition** : **UNE table d'accès canonique côté serveur** (RPC SECURITY DEFINER, IP serveur, grain document view/download), **mutualisée GED + portail + CS** (résout ANOM-10 d'un coup — pas 3 objets divergents). Colonnes : acteur, role_contexte (`council`), copro_id, objet_type/id, action, finalité, IP, horodatage. Au login conseil : **bandeau INFORMATIF non bloquant** (finalité art. 21, interdiction de diffusion), PAS un clic-consentement (le droit de regard du CS est légal, pas optionnel). Prévoir une durée de rétention de ces traces dès la création.

**Ce qui est strictement TA décision (USER)** : grain (consultation réelle vs ouverture d'espace) ; UNE table transverse vs table CS dédiée ; bandeau informatif vs consentement horodaté ; le journal d'accès est-il bloquant go-live alors que l'espace CS n'arrive qu'au Palier 12 ; durée de rétention.

**Dépendances / préalables bloquants** : **C15-5 (multi-rôle)** conditionne la colonne `role_contexte` ET le déclencheur du bandeau → à trancher AVANT de figer le schéma de la table (pas seulement avant l'UI) · Palier 12 (espace CS inexistant : on tranche le design maintenant, on branche au build) · doctrine C.17-2 (audit transverse) · ANOM-10 (objet fantôme unique) · **RLS ON+FORCE (ANOM-01)** sinon on journalise une étanchéité contournable.

**Pièges adversariaux à connaître** : La table d'accès est ELLE-MÊME un traitement → à inscrire au registre art. 30 ET à mentionner dans l'information art. 13 (surveiller copro/CS sans le dire = nouvelle non-conformité) — le dossier ne couvrait que la rétention. Ne PAS qualifier les impayés/soldes de « données sensibles » (art. 9) : ce sont des données patrimoniales appelant vigilance, pas le régime art. 9. Le décret 67-223 art. 26 subordonne l'accès CS à un AVIS préalable au syndic (à cadrer, peut être un événement à journaliser). **Tension de séquencement** : « bloquant go-live » mais dépend du Palier 12 → à résoudre (soit le portail CS entre dans le go-live, soit le bloquant ne vaut que s'il est exposé au lancement).

**Options (pour AskUserQuestion)** : 1. **Table unique + bandeau (reco)** — table d'accès canonique serveur mutualisée GED+portail+CS (résout ANOM-10) + bandeau art. 21 non bloquant ; journal = bloquant go-live, bandeau = V1 léger. · 2. **Deux tables séparées** — `cs_access_log` distincte de l'audit d'écriture : plus lisible mais re-fragmente et ne résout pas ANOM-10 d'un coup. · 3. **Consentement horodaté** — exiger un consentement du membre CS : juridiquement bancal (faire « consentir » à un droit légal art. 21), pourrait bloquer un contrôle légitime.

**Risque si on tranche mal** : Garder le mock = exposer des données nominatives sans pouvoir prouver qui a consulté quoi (violation redevabilité art. 5.2/24, risque CNIL). Trois journaux divergents = on pérennise ANOM-10. Consentement exprès = fausse base juridique (un membre qui refuse bloque son propre droit). Implémenter avant C15-5 = trace au mauvais contexte + colonne `role_contexte` mal modélisée. Sans RLS FORCE = on journalise une étanchéité contournable (fausse sécurité). Oublier la rétention = journal de données perso conservé à vie (art. 5.1.e).

---


---

## Bloc C12 — Ventes & mutations (6 dossiers)

> Source unique : `.planning/PRE_GRILLING_PACK_2026-06-25.md`. Versions AFFINÉES retenues pour C12-2 et C12-5.
> Recoupements transverses signalés : **EXP-5** (clôture compte vendeur = pointage, pas de ré-écriture GL) et **EXP-3** (horloge / période de l'état daté = `effective_date`). **ANOM-03** (divergence prouvée GL 4950 vs `call_for_funds_lines` 4450, écart 500) est un préalable bloquant cité par 5 des 6 dossiers.

---

### C12-2 — Avis de mutation : événement autonome ou attribut d'opposition ?

**La question (1 phrase claire)** : L'« avis de mutation » du notaire est-il un événement saisi tôt sur la table `mutations` (qui déclenche le pré-état daté), ou reste-t-il prisonnier de la ligne d'opposition art.20 comme aujourd'hui ?

**État réel (base)** : Le moteur pre/final est DÉJÀ solide (enum `etat_date_type`, RPC `create_etat_date_snapshot`/`generate_etat_date_payload` 0080, snapshot immuable). MAIS l'`avis_mutation_date` ne vit QUE sur `mutation_oppositions` (CHECK `+15 j` = vrai délai légal art.20). Et un SECOND compteur « 15 j » divergent existe dans la vue `v_mutations_overview` (0054), compté depuis `requested_at` (ouverture du dossier, aucune base légale) — son commentaire ment sur ce qu'il calcule. Aucune colonne `avis_mutation_date` sur `mutations`, aucun statut « avis reçu », aucune table notifications.

**Ma proposition** : Option A. Faire de l'avis un **événement autonome sur `mutations`** (1 colonne `avis_mutation_date`), saisissable avant toute opposition. Le « 15 j » de C12-2 = délai de COURTOISIE de production du pré-état daté (convention, pas légal) ; le 15 j légal art.20 reste sur `mutation_oppositions`. Le « todo daté » = branche dérivée dans `v_dashboard_todos` (pas de table notifications). Supprimer/réparer le compteur `requested_at+15`.

**Ce qui est strictement TA décision (USER)** : (1) avis autonome (A) vs statu quo opposition-centric (B) ; (2) statut « avis reçu » = présence de la date OU vraie valeur d'enum `avis_received` ; (3) confirmer parité de contenu pre = final (assumée) ; (4) todo dérivé vs table notifications + cron (option C).

**Dépendances / préalables bloquants** : **C12-1 est un prérequis réel** (les RPC opposition n'existent pas). Recoupe **EXP-3** (horloge asOf, calcul à `current_date` côté vue, déjà le cas). Reprise de mandat : l'avis peut arriver avant un GL de lot complet.

**Pièges adversariaux à connaître** : Ne PAS confondre les deux « 15 j » (légal art.20 vs courtoisie). Si on supprime le compteur faux SANS poser de signal explicite ni la branche todo, plus AUCUNE échéance visible (piège via l'index `uq_mutations_active_lot` : un dossier « avis reçu » reste `status='draft'`). `p_snapshot_type` EST bien tracé dans le payload (n'influence pas le calcul financier, mais le code ne « ment » pas). L'enum mort `final_etat_generated` n'existe pas en SQL (grep le front).

**Options (pour AskUserQuestion)** : 1. **A. Avis autonome sur `mutations`** (reco) — 1 colonne + branche todo dérivée, le plus juste métier, peu de migration · 2. **B. Statu quo opposition-centric** — oblige à créer une opposition même sans dette (illogique), friction utilisateur · 3. **C. Avis autonome + table notifications + cron** — robuste pour relances email, mais infra cron + 2e état à synchroniser, à réserver si alerte email V1.

**Risque si on tranche mal** : Confondre les deux délais → afficher une fausse échéance légale et/ou rater le vrai délai art.20 = **perte du privilège de recouvrement du syndicat sur le prix de vente**. Reproduire les deux compteurs en v2 = dette pérennisée.

---

### C12-1 — RPC opposition art.20 (record / settle)

**La question (1 phrase claire)** : Le règlement de l'opposition (`settle`) réutilise-t-il le post-paiement standard (chemin `payment`), ou crée-t-on un chemin d'écriture dédié `source_type='mutation'` comme le suggère le blueprint ?

**État réel (base)** : La table `mutation_oppositions` EXISTE avec toutes les colonnes/contraintes (CHECK `+15 j`, `ck_opp_paid` exige une écriture pour passer `paid`, `uq_opposition_mutation` = 1 par dossier). `post_owner_payment` (0026) = chemin D33 complet (idempotence, FIFO `allocate_payment`, trop-perçu en 450-3). MAIS `record_mutation_opposition`, `settle_mutation_opposition`, `reconstitute_buyer_advances` et toute UI/route sont **INEXISTANTES** (listées « différées » en commentaire 0019, jamais écrites).

**Ma proposition** : Option 1 (wrapper sur D33). `settle_mutation_opposition` n'écrit pas lui-même : il appelle `post_owner_payment`, récupère le `ledger_tx_id`, le recopie dans l'opposition → `paid`. La traçabilité art.20 vit sur la LIGNE opposition, pas sur le `source_type`. `record` fige le solde **EXIGIBLE** (pas la P1 brute), `status='opposed'`, causes ventilées + privilège/chirographaire, replay idempotent. `reconstitute_buyer_advances` (P3) câblé dans le même chantier. Débite toujours le **512 courant**, jamais 105/450-5 ALUR.

**Ce qui est strictement TA décision (USER)** : (1) wrapper D33 vs chemin dédié `source_type='mutation'` vs geler tout C12-1 ; (2) `record` crée directement en `opposed` (et non `pending`) ; (3) source du montant opposé (exclure le non-échu) ; (4) chemins V1 vs P1 (`released`/`contested`).

**Dépendances / préalables bloquants** : **ANOM-03 = bloquant dur** (le montant opposable dérive du solde 450 ; tant que GL ≠ `call_for_funds_lines`, le montant est faux). Recoupe **EXP-5** : le settle est un encaissement (pointage D512/C450), cohérent avec « le 450 suit le lot ». Recoupe **EXP-3** : période = période ouverte à la date de versement notaire.

**Pièges adversariaux à connaître** : `get_lot_balance_45x` (0082) est INAPTE tel quel : `code like '45%'` inclut le 450-5 ALUR et ne distingue PAS échu/non-échu → ni bon détecteur d'exigible, ni bon nudge. Le nudge « partagé avec validate_mutation » n'est en fait câblé NULLE PART encore. Le settle via `post_owner_payment` crée une ligne `payments` qui apparaîtra dans le rapprochement bancaire comme un paiement copro ordinaire (à retrouver via method/reference). Bases légales : citer **art.2402 CC** (ancien 2374, renuméroté 2021) et réserver « liquides et exigibles » à l'art.19 (19-1 = privilège mobilier).

**Options (pour AskUserQuestion)** : 1. **Wrapper sur D33** (reco) — un seul chemin d'écriture, FIFO/idempotence gratuits, aligné « un seul chemin par feature » · 2. **Chemin dédié `source_type='mutation'`** — traçabilité dans l'écriture, mais 2e porte d'écriture sur le 450 = drift interdit en v2 · 3. **Geler C12-1** — tant qu'ANOM-03 (+ GL du lot propre, pas de `LOT_GL_MISMATCH` résiduel) n'est pas verrouillé.

**Risque si on tranche mal** : Chemin dédié → 2 portes d'écriture qui divergent (solde lot faux, `paid` menteur). Coder avant ANOM-03 → opposition juridiquement fausse (créance perdue ou opposition contestable art.20). Toucher le 450-5 ALUR au settle → rembourser au vendeur un fonds acquis au lot (faute, art.14-2 II).

---

### C12-4 — Clôture du compte vendeur (jalon 6) : vrai contrôle de solde

**La question (1 phrase claire)** : Découple-t-on la clôture du compte vendeur de la signature et en fait-on un vrai contrôle de solde lu à la date d'effet (avec « issue » si solde ≠ 0), au lieu d'une case cochée silencieusement ?

**État réel (base)** : Aujourd'hui `validate_mutation` (version LIVE = **0076**, pas 0031) coche d'un seul UPDATE `signature_acte` ET `cloture_compte` à `completed`, **sans jamais lire le solde**. Un vendeur peut partir avec 800 € d'impayés et l'appli affiche « compte clôturé » = faux vert dangereux. `get_lot_balance_45x` lit le solde LIVE, **sans aucun cut-off de date**. Aucune RPC `close_seller_account` n'existe ; l'enum `mutation_step_status` n'a que `pending/in_progress/completed/skipped` (pas d'« issue »).

**Ma proposition** : Option 1. (1) Ajouter `p_as_of date DEFAULT NULL` à `get_lot_balance_45x` (cut-off, rétro-compatible). (2) Créer `close_seller_account(p_mutation_id, p_resolution, p_reason)` : lit le solde du LOT à `effective_date`, |solde|<0,005 → completed, sinon EXIGE une résolution motivée et pose une **issue dans le payload jsonb** (pas de nouvelle valeur d'enum). (3) Retirer `cloture_compte` du WHERE de `validate_mutation` (découplage). Juger **hors 450-5 ALUR**.

**Ce qui est strictement TA décision (USER)** : (1) issue dans payload vs nouvelle valeur d'enum vs bloquant dur ; (2) **confirmer : juger HORS 450-5 ALUR** ; (3) un solde CRÉDITEUR compte-t-il comme « non soldé » (remboursement vendeur) ; (4) tolérance |solde|<0,005.

**Dépendances / préalables bloquants** : Recoupe **EXP-5** directement (clôture = lecture/pointage, zéro écriture GL — le 450 suit le lot). Recoupe **EXP-3** (lire à `effective_date`, même horloge que l'état daté final, sinon deux chiffres au notaire). ANOM-03 (solde lu du GL = bon côté, mais valeur à re-vérifier si la divergence bascule). Toute modif part de **0076**, pas 0031 (version morte).

**Pièges adversariaux à connaître** : `validate_mutation` LIVE = **0076** (signature différente, p_buyer_is_company). La contrainte `ck_step_completed` (`completed` ⇔ `completed_at` non nul) interdit qu'un jalon non soldé reste `completed` → une issue s'affiche comme step **`in_progress` + payload**, pas un statut à part (badge UI dérivé). `upsert_mutation_step` ÉCRASE le payload entier (pas de merge) → reconstruire le payload complet à chaque rejeu. Ajouter `p_as_of` ne suffit PAS : il faut AUSSI gérer le périmètre comptes (exclure 450-5).

**Options (pour AskUserQuestion)** : 1. **Issue dans payload** (reco) — zéro migration d'enum, traçabilité riche, conforme C.17 #1 · 2. **Nouvelle valeur d'enum `issue`** — plus lisible mais migration d'enum + revoir `ck_step_completed` + tout le mapping front · 3. **Bloquant dur à effective_date** — revient sur D34 « on prévient, on ne bloque pas », risque de geler des ventes légitimes (dette réglée à la vente).

**Risque si on tranche mal** : Garder le completed silencieux → faux vert comptable, perte du droit d'opposition art.20, faute professionnelle possible. Lire au mauvais moment (live) → divergence avec l'état daté remis au notaire. Inclure le 450-5 → fausses issues. Bloquant dur → ventes légitimes gelées.

---

### C12-3 — Répartition vendeur/acquéreur (art.6-2) : nommer et afficher

**La question (1 phrase claire)** : Fige-t-on côté SQL une note explicite art.6-2 (« charges à la date d'effet, résultat à l'acquéreur, pas de pro rata temporis auto ») dans le payload probant de l'état daté, sans aucun calcul nouveau ?

**État réel (base)** : La règle art.6-2 est **déjà appliquée correctement** mais jamais NOMMÉE : la partie 3 met à la charge de l'acquéreur le résultat + provisions à venir en quote-part lot SANS pro rata ; `validate_mutation` ne fait que bouger la date dans `lot_owners` (450 suit le lot) ; 450-5 ALUR exclu de la P2. Le `legal_reference` figé ne cite que « art.5 décret 67-223 ». Aucune note, aucune colonne de pro rata. C'est un manque d'EXPLICITATION, pas un faux chiffre.

**Ma proposition** : Option 1. Enrichir `legal_reference` (art.5 + art.6-2) et ajouter une clé `repartition_note` dans `partie_3_charge_acquereur`, texte figé côté SQL (donc dans le snapshot immuable = opposable). Front et PDF affichent la note. **Zéro migration de structure, zéro calcul.** Acter : on ne code AUCUN pro rata (garde-fou anti-régression).

**Ce qui est strictement TA décision (USER)** : (1) note figée SQL vs front/PDF seul vs différer ; (2) `legal_reference` enrichi OU clé `repartition_note` dédiée (reco : les DEUX, séparément) ; (3) wording exact de la note ; (4) acter zéro pro rata dans `mutations`.

**Dépendances / préalables bloquants** : **ANOM-03 plus critique que présenté** : la P3 elle-même (`provisions_appelees_non_echues`, `v_called_*`) est lue de `call_for_funds_lines`, PAS du GL → ne **pas publier la note au notaire** avant verrou ANOM-03. Recoupe **EXP-5** (la note explique pourquoi le solde vendeur n'est pas re-découpé). Identité gelée du payload (0080).

**Pièges adversariaux à connaître** : Le slot front `note` est SINGULIER et déjà occupé par `alur_note` (`EtatDateViewer.tsx` l.160) → ajouter `repartition_note` exige fusion ou 2e slot (pas « zéro changement de composant »). Wording à durcir : « celui qui est copropriétaire LORS DE L'APPROBATION DES COMPTES » (pas mécaniquement « acquéreur ») ; les charges déjà exigibles AVANT cession restent au VENDEUR (P1). Coder un pro rata « pour bien faire » = FAUTE (le partage conventionnel relève de l'acte notarié).

**Options (pour AskUserQuestion)** : 1. **Note figée côté SQL** (reco) — vit dans la pièce probante, opposable, coût quasi nul, V1 · 2. **Note front/PDF seul** — plus rapide mais absente du snapshot immuable, valeur juridique moindre · 3. **Différer** — moteur déjà correct, mais on continue d'émettre des états datés muets sur qui paie quoi.

**Risque si on tranche mal** : Note front-seule → perdue à la régénération/export, non opposable. Différer → malentendu notaire (croit que le syndic a fait le partage). Coder un pro rata → chiffre faux dans une pièce légale. Publier avant ANOM-03 → rendre un faux chiffre plus crédible.

---

### C12-5 — Enum `mutation_status` : ratifier `signed` ≠ `validated` + verrouiller la machine à états

**La question (1 phrase claire)** : On ratifie la distinction `signed` (acte signé) ≠ `validated` (bascule `lot_owners`), mais corrige-t-on le libellé faux « table de transition posée par RPC » en créant les gardes serveur manquantes (conformément à C17-1) ?

**État réel (base)** : Enum = **7 valeurs LIVE** (`sent_to_notary` ajouté par 0079). `signed` ≠ `validated` est DÉJÀ acquis (`validate_mutation` 0076 exécute le transfert). MAIS la « linéarité » est à moitié fausse : 2 transitions (`→sent_to_notary`, `→signed`) sont des **UPDATE front bruts dans DEUX familles de code**, et `validate_mutation` n'exige PAS l'entrée `signed` (saut `etat_generated → validated` réel). Drift de types : `src/types/supabase.ts` est PÉRIMÉ (6 valeurs) ET `DbMutationStatus` (lib/sales/api.ts) contient une valeur fantôme `final_etat_generated` → risque 22P02.

**Ma proposition** : Option 1. Ratifier `signed` ≠ `validated`. Conformément à C17-1 : (1) remplacer les 2 UPDATE front (dans les deux familles) par RPC gardées (`set_mutation_sent_to_notary`, `mark_mutation_signed`) ; (2) garde « entrée = `signed` » dans `validate_mutation` + sauts donation/succession nommés ; (3) écrire `status` ET `mutation_steps` par la MÊME RPC (source = `mutations.status`, A21) ; (4) régénérer `supabase.ts` + corriger `DbMutationStatus` ; (5) autoriser quelques sauts nommés.

**Ce qui est strictement TA décision (USER)** : (1) garder + verrouiller (RPC) vs statu quo front vs fusionner `signed` dans `validated` ; (2) forcer `signed` avant `validated` ou autoriser le saut donation/succession ; (3) chemin `validated → cancelled` (contre-passation) ou terminal volontaire ; (4) contrainte de transition en BASE ou gardes RPC seulement.

**Dépendances / préalables bloquants** : **C17-1** (machine à états centralisée, aucun UPDATE de status front) — en CONFLIT direct avec l'état actuel. **C12-4** (`validate_mutation` clôt déjà `cloture_compte` — interaction à arbitrer). C12-2 (même table de transition). ANOM-03 contamine l'état daté produit en cours de chaîne.

**Pièges adversariaux à connaître** : NE PAS documenter la table sur le dump 2026-06-23 NI sur `supabase.ts` (tous deux à 6 valeurs) → on oublierait `sent_to_notary`. `validate_mutation` LIVE = **0076** (pas 0031). Argument donation/succession : PAS « pas de notaire » (faux) mais « pas d'acte de VENTE signé ni d'opposition art.20 sur un prix ». TROIS familles de code écrivent le status (deux par UPDATE front). Contre-passation après `validated` = manque de code (dette), pas un interdit légal.

**Options (pour AskUserQuestion)** : 1. **Garder + verrouiller (RPC)** (reco) — machine à états réellement serveur, types régénérés, aligné C17-1 · 2. **Garder, statu quo front** — libellé « posée par RPC » reste faux/dette, recopie le contournement en v2 · 3. **Fusionner `signed` dans `validated`** — perd la maîtrise de `effective_date` (art.6-2) et casse la clôture découplée C12-4. Déconseillé.

**Risque si on tranche mal** : Statu quo → bascule `lot_owners` (qui décide qui paie/vote/reçoit la convocation) déclenchable dans le mauvais ordre = **propriétaire fantôme**, mauvaise personne appelée, vote au mauvais lot, contamination de l'état daté. Fusionner → perte de la date d'effet. Documenter sur une source périmée → reproduire l'omission `sent_to_notary`.

---

### C12-6 — RLS ventes/état daté/opposition : gestionnaire-only

**La question (1 phrase claire)** : On ratifie le « gestionnaire-only, aucune policy copro » (déjà l'état réel), mais applique-t-on FORCE comme l'exige la baseline v2, ou suit-on l'ancien patron qui réservait FORCE au grand livre ?

**État réel (base)** : Les 4 tables (`mutations`, `mutation_steps`, `mutation_oppositions`, `etat_date_snapshots`) sont DÉJÀ gestionnaire-only (policies 0034 `user_is_copro_manager`, aucune policy copro). `etat_date_snapshots` = insert-seul (immuable art.5). Le notaire est une fiche `tiers` (jamais un user). Toutes les RPC d'accès sont DEFINER + garde manager. **Dans 0034, FORCE est réservé à 5 tables du grand livre** ; aucune table ventes n'y est. Mais `record/settle_mutation_opposition` n'existent pas encore.

**Ma proposition** : Ratifier le contrat « RLS ON + policies gestionnaire-only + revoke anon + AUCUNE policy copro ». **MAIS attention** : ma reco initiale « retirer le mot FORCE » est en conflit avec la baseline v2 déjà tranchée → je m'aligne sur **FORCE partout** (option B reformulée). FORCE apporte un gain marginal de défense en profondeur (pas zéro). Acter aussi : ajouter un `revoke anon` table-level explicite (pas garanti par 0034), et que les futures RPC d'opposition porteront DEFINER + manager + revoke anon.

**Ce qui est strictement TA décision (USER)** : (1) **FORCE partout (baseline B1) vs sans FORCE (ancien patron GL)** — c'est le vrai arbitrage, et il peut rouvrir B1 ; (2) confirmer `etat_date_snapshots` immuable (insert-seul) ; (3) volet copro à zéro assumé (portail C.15 → RPC DEFINER dédiée, jamais policy table).

**Dépendances / préalables bloquants** : **ANOM-01** (prouver sur le LIVE que la RLS est réellement ON ; garde-fou `0086 assert_public_tables_have_rls`, cloud-only). Décision baseline **B1 / Palier 0-bis / Palier 1** (« RLS ON+FORCE 87 tables ») — C12-6 ne peut PAS trancher « sans FORCE » en ignorant cette cible déjà choisie. Helpers authz DEFINER (0023/0045). Notaire=tiers (0015) figé.

**Pièges adversariaux à connaître** : La reco originale « retirer FORCE » **contredit la baseline v2** (B1 a choisi de généraliser FORCE) — ne PAS la présenter comme acquise. La base légale « art.6-2 loi 65-557 = RGPD » est **INVENTÉE** : l'art.6-2 régit la répartition de charges ; le bon fondement minimisation = Règlement UE 2016/679 art.5.1.c. Le `revoke anon` table-level n'est PAS dans 0034 (seulement niveau fonctions) → c'est un AJOUT (précédent 0085). Libellé `tiers_directory` à inverser (`where is_notary = false` GARDE les non-notaires).

**Options (pour AskUserQuestion)** : 1. **FORCE partout (aligné baseline B1)** (reco révisée) — cohérent avec la cible v2, défense en profondeur, mais débat « FORCE inutile ici » devient sans objet · 2. **Sans FORCE (ancien patron GL)** — aligné 0034/0085, mais ROUVRE B1, à ne pas trancher en silence · 3. **Ouvrir un volet copro** — casse gestionnaire-only, expose données nominatives d'autres lots (atteinte vie privée). Non recommandé ; besoin futur = RPC DEFINER.

**Risque si on tranche mal** : Garder un « FORCE » mal compris sans prouver l'ENABLE live (ANOM-01) → données nominatives (vendeur/acquéreur, dettes, notaire) potentiellement lisibles cross-cabinet via la clé anon (faille type 0085). Ouvrir une policy copro → un copropriétaire lit l'état daté/oppositions d'AUTRES lots. Futures RPC d'opposition sans le contrat DEFINER+manager → même brèche par une autre porte.


---

## Bloc C13 — Conseil syndical (5 dossiers)

> **Rappel transverse (audit du pack)** : les tables `council_decisions` / `council_votes` existent en SQL (migrations 0017 / 0030) mais sont **INERTES CÔTÉ FRONT** : aucun écran ne les écrit (0 `functions.invoke('council-workflow')` dans `src`). Un modèle d'écriture existe pourtant déjà — l'edge function `council-workflow` (INSERT decisions, UPSERT votes, attache docs, appelle `compute_decision_result`) — mais elle n'est branchée à aucun écran ni déployée. Conséquence : chaque dossier C.13 « légifère sur du vide » côté UI. Toute reco « réutiliser X » suppose une plomberie d'écriture à (re)construire en v2 ; chaque fiche porte donc son **coût de création d'objet**.

---

### C13-2 — Découpler l'élection du président du CS

**La question (1 phrase claire)** : faut-il sortir la désignation du président du conseil du payload d'élection AG (`ELECT_COUNCIL`) pour la confier à une RPC dédiée `set_council_president`, avec garantie technique d'« au plus un président actif » ?

**État réel (base)** : la table `council_members`, l'enum `council_role` (qui contient déjà `president`) et le helper `is_council_president` (0023) existent. MAIS la seule façon de poser un président aujourd'hui = le glisser dans le JSON d'`ELECT_COUNCIL`, qui recopie le rôle **sans aucun contrôle d'unicité** : un payload à deux `president` insère deux présidents actifs. La RPC `set_council_president` **N'EXISTE NULLE PART** (0 occurrence). Aucune contrainte SQL ne garantit ≤ 1 président. Front conseil = lecture seule.

**Ma proposition** : option A — découpler + ceinture ET bretelles. (1) `ELECT_COUNCIL` ne pose QUE des membres (rôle forcé à `member`). (2) Nouvelle RPC `set_council_president` = seule porte : exige que la personne soit déjà membre actif (art. 22), rétrograde l'ancien président en `member`, promeut le nouveau, idempotente, tracée (qui/quand/motif), date validée serveur. (3) Index UNIQUE PARTIEL au prédicat IDENTIQUE à `is_council_president` (`is_active AND end_date IS NULL AND role='president'`) comme filet anti-corruption. (4) Sans président = non bloquant (le helper renvoie déjà `false`). (5) V1 = président seul, pas de `set_council_role` générique (rôles décoratifs = piège à copie ANOM-23).

**Ce qui est strictement TA décision (USER)** : (a) le découplage est-il total ou tolère-t-on encore un président dans le payload AG (mais via le même chemin gardé) ; (b) l'ancien président devient `member` (reste au conseil) ou sort du conseil ; (c) périmètre V1 = président seul ou tout le bureau ; (d) UI tout de suite ou RPC d'abord.

**Dépendances / préalables bloquants** : D50 (éligibilité copropriétaire actif, déjà codée — à réutiliser) ; doctrine C.17 #2/#3/#4 (audit trail + idempotence + horloge serveur) ; cohérence du cran de droits avec C13-1 (RLS gestionnaire `p_mgr_all`).

**Pièges adversariaux à connaître** : (1) le « deux présidents » est un trou de CONTRAT (atteignable par SQL/payload brut/future UI), PAS un exploit d'un écran existant — donc « pourrait » et non « un syndic le fait ». (2) L'index partiel n'est étanche que si la RPC n'écrit JAMAIS un président `is_active=true` MAIS `end_date NOT NULL` (sinon maille ouverte). (3) Double garde d'éligibilité : `is_council_member` actif (art. 22) ET copropriétaire actif (lot_owners) — pas un seul. (4) Si `ELECT_COUNCIL` force `member`, le bloc PV n'affichera plus la couronne « Président » tant que la RPC n'a pas tourné. (5) Ne pas confondre `ag_meetings.president_id` (président DE SÉANCE) avec le président DU conseil.

**Options (pour AskUserQuestion)** : 1. **Découpler + 2 garde-fous (reco)** — RPC dédiée + index unique partiel, double porte fermée · 2. **RPC seule, sans index** — plus simple mais helper de droits faussable en silence si un autre chemin repose un 2e président · 3. **`set_council_role` générique** — couvre tout le bureau mais code mort aujourd'hui (seul `president` porte des droits) = piège ANOM-23.

**Risque si on tranche mal** : sans garde-fou d'unicité, deux présidents actifs → `is_council_president` ouvre EN SILENCE les droits président (RLS, GED art. 21) à une personne illégitime — faille silencieuse, le pire des bugs. Et garder la désignation dans le payload AG viole l'art. 22 (le CS élit son président, pas l'AG) et perd la trace juridique.

---

### C13-1 — Lier les avis du CS à un OS/contrat (FK ?)

**La question (1 phrase claire)** : faut-il ajouter à `council_decisions` deux nouvelles colonnes FK typées `linked_service_order_id` / `linked_contract_id` (en RESTRICT) pour relier un avis du conseil à un ordre de service ou un contrat ?

**État réel (base)** : les tables `council_decisions` / `council_votes` existent (0017) mais sont **inertes côté front** (un modèle d'écriture existe en edge `council-workflow`, non câblé à l'UI, non déployé). `council_decisions` porte DÉJÀ `linked_ag_id` + `linked_resolution_id` (tous deux ON DELETE **SET NULL**). `council_documents` porte DÉJÀ un lien polymorphe `linked_type`/`linked_id` dont l'enum couvre déjà `contract` et `service_order` — et l'edge l'utilise déjà. Les colonnes `linked_service_order_id`/`linked_contract_id` n'existent NULLE PART sur council_decisions (les seuls hits sont sur la table `events`). `compute_decision_result` (0030) calcule une majorité simple PAR TÊTE, juridiquement correcte.

**Ma proposition** : **NE PAS ajouter les 2 FK.** Réutiliser les crochets existants. Avis V1 = une ligne `council_decisions` saisie par le gestionnaire (status approved=favorable / rejected=défavorable), rattachée au marché via `linked_resolution_id` (déjà là, et déjà utilisé par le code d'écriture edge) ; cas OS/contrat hors-AG = `council_documents` (`linked_type`/`linked_id`). `council_votes` + `compute_decision_result` restent dormants (P1, par tête). **Aucune migration de structure.**

**Ce qui est strictement TA décision (USER)** : (a) accepter « zéro FK / réutiliser l'existant » vs typage fort ; (b) en V1, l'avis CS = avis unique gestionnaire (council_votes dormant) ou déjà un scrutin ; (c) acter que « decision/vote/approved » se LIT à l'écran comme « avis favorable/défavorable » (D52, l'avis n'est pas opposable).

**Dépendances / préalables bloquants** : A1/A2 (l'espace CS doit exister pour que ces tables servent côté UI) ; D52 (V1 = consultation, pas de pouvoir décisionnel) ; partage le crochet `linked_resolution_id` avec C13-5 ; le workflow d'écriture devra être réécrit en RPC/server function v2 (chantier espace CS, pas C13-1).

**Pièges adversariaux à connaître** : (1) la prémisse « tables 100% vierges, rien ne les écrit » est FAUSSE — l'edge `council-workflow` écrit déjà decisions/votes/documents ; le bon argument est « le code d'écriture existant se passe DÉJÀ des 2 FK ». (2) RESTRICT est à l'envers : il bloquerait la suppression d'un OS/contrat à cause d'un vieil avis-archive, et contredit la convention SET NULL de la table. (3) Le « vote pondéré P1 » est un CONTRESENS juridique : un CS vote par tête (1 membre = 1 voix), jamais par tantièmes (seule l'AG vote par tantièmes, art. 22) → `compute_decision_result` est déjà conforme, à laisser dormant, pas à réécrire. (4) Ajouter ces FK = créer une 3e mécanique de lien après `council_documents` et les liens AG/résolution.

**Options (pour AskUserQuestion)** : 1. **Réutiliser l'existant (reco)** — 0 FK, `linked_resolution_id` + `council_documents` ; coût de création NUL ; un seul chemin · 2. **2 FK mais SET NULL + CHECK** — typage fort sans bloquer les suppressions, mais 3e mécanique + migration sur table inerte · 3. **2 FK RESTRICT (proposition initiale)** — le plus risqué : verrou de gestion absurde + contredit la convention de la table.

**Risque si on tranche mal** : RESTRICT → un gestionnaire ne peut plus supprimer/annuler un OS ou un contrat tant qu'un avis consultatif d'archive le mentionne. Et trois patrons concurrents de lien = précisément la dette de doublons que v2 doit tuer (le modèle recopie ensuite le mauvais exemple). Coût de création : NUL en reco ; options 2/3 = ALTER TABLE + FK ± CHECK sur une table dont l'UI n'existe pas encore.

---

### C13-3 — Droit d'accès du CS aux pièces (GL/devis/contrats)

**La question (1 phrase claire)** : comment ouvrir au conseil syndical l'accès aux pièces de gestion (grand livre, devis, contrats) et faut-il journaliser ses consultations, sachant que la décision propose « vues dédiées en security_invoker + RLS is_council_member » ?

**État réel (base)** : le helper `is_council_member` (0023), le patron de vue `security_invoker` (v_council_members_detail 0061) et la RLS council existent déjà. MAIS : aucune vue dédiée conseil pour GL/devis/contrats (à créer) ; la RLS de `ledger_transactions` ne connaît que gestionnaire OU copropriétaire-sur-ses-lots — **le CS n'existe pas comme rôle collectif** ; `service_orders` = mgr seul ; `contracts` = déjà collectif (visible du CS). Aucune table d'access-log (le `document_access_log` que D44 croit exister est ABSENT = fantôme ANOM-10). Une vue `security_invoker` posée telle quelle rendrait **0 ligne du GL** au membre du CS.

**Ma proposition** : appliquer le bon outil par cible. (1) **GL → vue SECURITY DEFINER** (et non invoker), garde `is_council_member` + `copro_id` interne, **AGRÉGÉE** (soldes classes 6/7) en MASQUANT les écritures nominatives 45x. (2) **Contrats → vue security_invoker** (RLS déjà collective). (3) **Devis → vue DEFINER** sur `service_orders` au-dessus du seuil (V1, en attendant l'entité consultation 1→N devis de C9). **Journalisation → UNE seule table d'accès générique** (résout aussi ANOM-10), tracée à l'ouverture d'écran (pas ligne par ligne), purge RGPD 1 an. « Demande de pièce » = P1, hors V1 (crochet UX seul).

**Ce qui est strictement TA décision (USER)** : (a) GL agrégé sans noms vs grand livre brut nominatif ; (b) vue GL en DEFINER (cadrage strict, ma reco) vs invoker + ouverture RLS (plus large) ; (c) une table d'access-log générique vs dédiée ; (d) rétention 1 an ; (e) implémenter maintenant vs reporter après socle.

**Dépendances / préalables bloquants** : **ANOM-01** (RLS ON mais SANS FORCE — à poser sur council_*/ledger_*/contracts, sinon étanchéité théorique) ; **ANOM-19** la vue GL conseil doit dériver de `v_general_ledger` (qui EXISTE en code 0036/0071 mais absente sur le LIVE = drift à réaligner — PAS « à recréer from scratch ») ; doctrine C.17 #2 (audit trail unique) ; C9 (entité devis inexistante).

**Pièges adversariaux à connaître** : (1) le masquage des 45x est une prudence **RGPD** (minimisation, art. 5), PAS une exigence de l'art. 21 (qui donne au contraire un accès LARGE « toute pièce ») → ne pas le présenter comme une règle de la loi de 1965. (2) `v_general_ledger` n'est PAS un fantôme à recréer : elle existe en code, c'est un drift live. (3) Une vue DEFINER mal bornée fuit le GL inter-copro → re-poser la garde `copro_id` ET en faire la SEULE porte. (4) FORCE manque même sur council_* (apply_rls_environment ne le pose que sur 5 tables). (5) Ne pas livrer la table d'access-log isolément dans C13-3 sans coordonner avec C.14/ANOM-10 (sinon on crée le 3e mécanisme qu'on prétend éviter).

**Options (pour AskUserQuestion)** : 1. **Bon outil par cible (reco)** — GL DEFINER agrégé/masqué, contrats invoker, devis DEFINER ; 1 table d'access-log générique ; prérequis FORCE + dériver de v_general_ledger · 2. **À la lettre (invoker partout)** — conforme au texte mais expose le GL nominatif brut par n'importe quel client (RGPD) et journalisation contournable · 3. **Reporter après socle** — figer la doctrine, coder quand FORCE + GL socle sont prêts.

**Risque si on tranche mal** : invoker partout → CS voit 0 ligne (feature morte) ; ouvrir la RLS sans agréger → diffusion du GL nominatif (dettes/paiements de chaque copropriétaire identifié) = violation RGPD ; pas de FORCE → isolation du conseil purement théorique (policy contournable par le propriétaire de table).

---

### C13-5 — Annexer l'avis du CS sur un marché + alerte convocation

**La question (1 phrase claire)** : faut-il lier l'avis du conseil sur un marché art. 21 à la résolution AG concernée et déclencher une ALERTE (non bloquante) si cet avis manque au moment de la convocation ?

**État réel (base)** : `council_decisions` porte déjà le bon crochet `linked_resolution_id` (FK SET NULL) — présent mais inexploité. MAIS **aucune RPC d'écriture** d'un avis CS (grep create/submit/record = 0) : un avis ne peut pas être saisi depuis l'app = « demi-feature orpheline ». Le **seuil art. 21 par copro n'est stocké NULLE PART**. Le front `useConvocationAnnexes.ts` = cases à cocher COSMÉTIQUES (item rapport CS `obligatoire:false`, jamais relié). `check_convocation_delay` ne contrôle que le délai 21 j, aucun contrôle de pièces. Patron d'alerte non-bloquante réutilisable = `validate_ag_variables` (renvoie issues[] + is_valid).

**Ma proposition** : alerte **NON BLOQUANTE calculée en SQL**, jamais un verrou, en V1 minimaliste (avis unique saisi par le gestionnaire : favorable/défavorable/réservé dans `council_decisions.status` + description). Greffer l'alerte sur `validate_ag_variables` : au pré-vol convocation, lister les résolutions « marché > seuil art. 21 » sans avis CS lié. **Silencieuse si 0 membre CS actif** (copro sans conseil). Front = affichage seul.

**Ce qui est strictement TA décision (USER)** : (a) avis unique gestionnaire (V1) vs scrutin pondéré (P1) ; (b) acter le caractère NON bloquant ; (c) acter que la source de vérité est SQL, pas le front cosmétique ; (d) où stocker le seuil art. 21 par copro.

**Dépendances / préalables bloquants** (à séquencer AVANT C13-5, sinon inexécutable) : (a) **créer une RPC d'écriture d'avis CS** (n'existe pas) ; (b) **stocker le seuil art. 21 par copro** (absent) ; (c) FK/lien vers le marché (dépend C13-1) ; (d) **trancher ANOM-07** (contradiction A3 « pièces forcées » vs C13-5 « non bloquant » — acter globalement le non-bloquant d'abord).

**Pièges adversariaux à connaître** : (1) l'absence d'avis CS art. 21 **N'EST PAS** une cause de nullité de l'AG (causes strictes = délai art. 9, feuille de présence art. 14, ordre du jour) → bloquer mentirait sur le droit ; au passage corriger l'incohérence interne du repo qui cite « art. 64 »/« art. 13 » pour le même délai 21 j. (2) L'exigence art. 21 mord à l'ENGAGEMENT du marché par le syndic, pas seulement avant l'AG → l'alerte de convocation est un FILET, pas le contrôle principal (dépendance D52). (3) Ne pas confondre l'avis PONCTUEL sur marché (`council_decisions`) avec le RAPPORT ANNUEL du CS (table réelle `rapports_activite_cs` en 0053, pas « rapports_cs »). (4) Si l'alerte vit en front, elle ment comme les cases actuelles.

**Options (pour AskUserQuestion)** : 1. **Non bloquant + SQL (reco, V1)** — avis = council_decision gestionnaire lié à la résolution, alerte SQL greffée sur validate_ag_variables, silencieuse si 0 membre CS ; prérequis RPC d'écriture + seuil art. 21 + ANOM-07 tranchée · 2. **Lien seul, pas d'alerte (V0)** — exploite linked_resolution_id, zéro contrôle auto ; rapide mais ne tient pas la promesse (le syndic peut oublier l'avis) · 3. **Vote pondéré du CS (P1)** — vrai scrutin via council_votes ; lourd, surdimensionné pour V1.

**Risque si on tranche mal** : alerte BLOQUANTE → on empêche de convoquer les (nombreuses) copros sans conseil + on invente un motif de nullité inexistant ; alerte en FRONT seul → elle ment, le syndic se croit couvert et engage un marché sans l'avis obligatoire (faute de gestion engageant sa responsabilité) ; ignorer le seuil → bruit (se déclenche à tort partout ou jamais) ; ne pas trancher ANOM-07 → deux comportements contradictoires coexistent = la dette « deux patterns » à proscrire.

---

### C13-4 — Délégation de pouvoir au conseil syndical (art. 21-1)

**La question (1 phrase claire)** : faut-il poser dès la V1 un « crochet dormant » en base pour la future délégation de pouvoir au CS (art. 21-1), ou ne rien poser et tout créer en P1 ?

**État réel (base)** : les tables conseil existent, mais `council_decisions` n'a **AUCUNE colonne de délégation** (ni plafond, ni scope, ni durée, ni compte-rendu). Le crochet `DELEGATE_TO_COUNCIL` **n'existe NULLE PART** (0 occurrence ; l'enum `ag_action_type` ne le contient pas) — il est À CRÉER, pas pré-posé. Aucune RPC d'écriture d'avis/décision CS. Les comptes `624` (frais CS), `674` (travaux délégués), `706` (provisions délégation) sont seedés mais **dormants et non câblés**. La V1 = consultation/avis seulement (D52).

**Ma proposition** : **en V1, ne RIEN poser en base pour la délégation. Zéro migration, zéro valeur d'enum, zéro colonne, zéro table.** Documenter l'intention (P1), laisser le terrain vierge, tout créer d'un bloc en P1 une fois la forme juridique et le schéma comptable tranchés. L'avis V1 passe par la route fonctionnelle D52, PAS par la demi-feature `council_decisions`/`votes` inerte. Tracer **explicitement** dans la décision que 624/674/706 restent dormants. Garde anti-confusion : l'avis CS au-delà du seuil art. 21 est obligatoire à recueillir mais **ne vaut JAMAIS autorisation d'engager** (seule l'AG, ou une délégation art. 21-1 votée, engage).

**Ce qui est strictement TA décision (USER)** : (a) zéro-migration (ma reco) vs pré-poser une table/un enum « dormant » ; (b) acter noir sur blanc que 624/674/706 restent dormants jusqu'au schéma d'engagement P1 ; (c) confirmer que le gate D52 est un avertissement de process, jamais un feu vert légal.

**Dépendances / préalables bloquants** : C13-1 / D52 (la route d'avis V1 dont C13-4 est l'extension différée) ; G24-T8 (modèle de seuils par copro, à réutiliser en P1, pas dupliquer) ; doctrine C.17 #3/#4 (idempotence + horloge) pour la future RPC d'activation ; ANOM-25 (audit hors-finance à confirmer avant de poser quoi que ce soit).

**Pièges adversariaux à connaître** : (1) un enum/table « dormant » = **piège à copie** (ANOM-23) : graver `DELEGATE_TO_COUNCIL` crée une valeur que `activate_ag_decisions` ne traite pas → un dev croit la chaîne câblée, l'AG vote une délégation qui ne se matérialise jamais = **échec silencieux** (le pire des bugs juridico-financiers). (2) Le 706 est **bien placé** en classe 7 (produit) — un appel de provision = D 45x / C 70x ; le vrai chantier P1 n'est pas sa classe mais le schéma d'écriture complet (cut-off, droits constatés décret 2005-240 art. 14-3). (3) art. 21-1 et art. 25 (point a) sont **deux faces du même acte** (art. 25 a = la majorité de vote ; art. 21-1 = le contenu/les limites), PAS deux régimes concurrents. (4) Ne pas confondre avec l'art. 25-1 (passerelle = simple second vote, PAS un fondement de délégation). (5) Le plafond art. 21-1 est OBLIGATOIRE + compte-rendu annuel : graver une table avant d'avoir tranché le schéma = migration corrective.

**Options (pour AskUserQuestion)** : 1. **V1 zéro-migration (reco)** — terrain vierge propre, tout créé en P1 ; avis via route D52 ; comptes laissés dormants (tracé) ; coût NUL · 2. **Pré-poser la table `council_delegation`** — table dédiée vide ; capacité « physiquement » réservée mais table morte qui invite à la copie et qu'il faudra peut-être redessiner · 3. **Ajouter la valeur d'enum `DELEGATE_TO_COUNCIL`** — visuellement cohérent mais valeur inerte non traitée par activate_ag_decisions = échec silencieux, anti-pattern exact que v2 veut éliminer.

**Risque si on tranche mal** : options 2/3 → objet mort = piège à copie ; une délégation votée par l'AG ne se matérialise jamais **sans aucune erreur visible** ; et risque de figer un schéma faux (plafond/compte-rendu obligatoires non modélisés). Risque transverse à TOUTES les options : que l'avis consultatif V1 soit pris pour un pouvoir d'engagement → un CS qui croit pouvoir valider seul une dépense > seuil ferait engager la copro **illégalement** (le gate D52 doit rester un avertissement, jamais un feu vert).


---

## Bloc C14 (Conformité) + C11 (Communication) — 5 dossiers

> Fiches de ratification. Reco = option 1 sauf mention. Corrections adversariales déjà intégrées dans chaque proposition.

---

### C14-2 — Immatriculation / télédéclaration annuelle RNIC

**La question (1 phrase claire)** : Comment savoir et signaler qu'une copropriété est (ou non) à jour de sa télédéclaration annuelle au registre national (RNIC) sans afficher un voyant « à jour » qui ment ?

**État réel (base)** : Seul `copros.num_immatriculation` (le numéro RNIC brut) existe (0007:13, nullable). AUCUN enum `rnic_status`, AUCUNE colonne `date_derniere_declaration_rnic`, AUCUNE branche de conformité légale dans `v_dashboard_todos` (5 branches seulement, 0054). Front v2 : zéro mention RNIC. Le cycle annuel est ancrable sur `accounting_periods.approved_at` (état `approved`), posé par `approve_period` via l'action AG `APPROVE_ACCOUNTS` — donc « approuvée » EST déjà l'approbation des comptes en AG.

**Ma proposition** : On saisit UN SEUL fait à la main = `date_derniere_declaration_rnic`. Le statut « à jour / en retard » est 100 % DÉRIVÉ (jamais stocké) : déclaration vide OU antérieure à `approved_at` du dernier exercice approuvé ⇒ « due ». Ancrage sur `approved_at` (PAS sur la clôture technique `closed`, sinon l'alerte sonne trop tôt). Alerte = 6e branche PASSIVE de `v_dashboard_todos` (zéro cron en V1). Mini-enum factuel `rnic_status` (`non_immatriculee/immatriculee/radiee`) pour ce que la date ne porte pas (radiation). Champ sur la fiche Identité (D65), pas de 4e onglet. Téléservice ANAH = P1.

**Ce qui est strictement TA décision (USER)** : (a) mini-enum factuel OU date seule sans enum ; (b) téléservice ANAH confirmé en P1 ; (c) audit de l'édition du n°/date en dette tracée OU créer `param_audit_log` d'abord.

**Dépendances / préalables bloquants** : D65 (écran Identité éditable) ; D70 (ajouter une branche conformité à `v_dashboard_todos`, aujourd'hui 0) ; cycle AG/période opérationnel (il l'est). SI on veut l'e-mail push → doctrine C.17 (#5 registre `cron_runs` + idempotence, #4 horloge `asOf`) à poser AVANT.

**Pièges adversariaux à connaître** : Numérotation CCH rectifiée — annuel = **L711-3** (pas L711-4) ; syndic déclarant = **L711-4** (pas L711-2) ; sanction astreinte ANAH = **L711-6**. Ancrer sur `approved_at`, pas `closed` ni `new Date()` (ANOM-20). `immatriculee` est dérivable (`num_immatriculation IS NOT NULL`) → le mini-enum ne sert que pour `radiee`/dispense.

**Options (pour AskUserQuestion)** : 1. **Date saisie + statut dérivé + mini-enum factuel** (RECO) — anti-maquillage, capte la radiation sans re-migrer · 2. **Date seule, AUCUN enum** — le plus minimal, mais incapable de représenter une radiation/dispense · 3. **Enum statut saisi à la main** — NON RECO, viole « jamais maquiller » (voyant vert non fondé, ANOM-10).

**Risque si on tranche mal** : Option 3 = on recrée l'anomalie traquée (faux « à jour » → syndic croit conforme, encourt l'astreinte L711-6). Statu quo = aucune alerte, jamais prévenu. Mauvais ancrage (`closed`/`new Date()`) = faux positif, l'alerte ment dans l'autre sens.

---

### C14-5 — Coffre-fort/extranet : cloisonnement des documents (décret 2019-650)

**La question (1 phrase claire)** : Avant d'ouvrir le portail copropriétaire, comment garantir qu'un document nominatif (relevé, état daté) n'est visible que de son propriétaire, et quels autres livrables (check-list, journal d'accès, trace de dérogation) sont bloquants ?

**État réel (base)** : `documents.coproprietaire_id` EXISTE (FK SET NULL + index) mais N'EST PAS lu par la RLS : `user_can_view_document` (0023:443-479) ne regarde que `visibility` (3 valeurs). Un doc nominatif n'a AUCUNE règle qui le réserve. Journal fantôme : l'edge `get_document_url` insère dans `document_access_logs` (PLURIEL, table inexistante) dans un try/catch qui avale l'erreur → 0 trace (ANOM-10). AUCUNE table check-list (`document_requirements`). `resolution_templates` existe (0042/0043) mais pas le modèle « dispense extranet ».

**Ma proposition** : Découper en 3 livrables de priorités différentes. **BLOQUANT au go-live du portail** = cloisonnement RLS : 4e branche dans `user_can_view_document` (« si `coproprietaire_id` renseigné → gestionnaire OU ce copro via `coproprietaires.user_id = auth.uid()` ; indivision via `lot_owners`/`get_user_lot_ids` »). **V1** = réparer le journal : créer `document_access_log` (SINGULIER), aligner l'edge, SUPPRIMER le catch silencieux, purge 1 an. **NON bloquant** = check-list 2019-650 (vue dérivée de la GED, jamais un statut stocké). **V1 léger** = trace dérogation (`resolution_template` + flag daté `extranet_dispense`). Front : abandonner `NiveauConfidentialite` 4 niveaux + l'ACL nominative en mémoire.

**Ce qui est strictement TA décision (USER)** : (a) portée go-live : cloisonnement seul bloquant vs tout le bloc ; (b) check-list 2019-650 = V1 ou P1 ; (c) opposabilité : faut-il un horodatage de mise à disposition par pièce ?

**Dépendances / préalables bloquants** : Portail copropriétaire (Palier 12) + `link_coproprietaire_account` — sans portail vivant le cloisonnement n'a pas d'audience (donc « bloquant au go-live DU PORTAIL », pas du go-live gestionnaire). Helpers 0023 (déjà là). `cron_runs` pour la purge = INEXISTANT (à créer, ne pas présenter comme acquis).

**Pièges adversariaux à connaître** : `cron_runs` n'existe pas (0 occurrence) — ne pas le supposer pour la purge. Le journal relève plutôt du RGPD art. 30 + reco CNIL (durée des logs) que de l'art. 32 (l'art. 32 fonde le cloisonnement). La 4e branche « personnel » n'est PAS un 4e niveau de visibilité (l'enum reste à 3), juste un prédicat additionnel.

**Options (pour AskUserQuestion)** : 1. **Cloisonnement BLOQUANT, reste V1/P3** (RECO) — corrige la fuite RGPD, répare le journal fantôme, check-list non bloquante · 2. **Tout le bloc au go-live** — extranet pleinement opposable mais go-live portail décalé · 3. **Cloisonnement seul, reste plus tard** — minimal RGPD, mais extranet moins opposable.

**Risque si on tranche mal** : Ouvrir le portail sans cloisonnement = fuite de données nominatives entre copropriétaires (RGPD art. 32). Laisser le journal fantôme = fausse traçabilité (faux-vert le jour d'un litige d'accès). Stocker un statut de complétude = check-list qui ment. Recopier le front v1 = deux modèles d'autorisation concurrents.

---

### C14-6 — Conservation/archivage légal : barème + registre des PV

**La question (1 phrase claire)** : Comment porter les durées légales de conservation dans un barème éditable (sans dupliquer un modèle de durée) et bâtir un registre des PV numéroté « sans trou » dérivé des AG, et non un silo séparé ?

**État réel (base)** : Les durées sont CALCULÉES par le trigger `calculate_document_expiration` (0031:178-189), avec 6 catégories légales HARDCODÉES dans le corps de la fonction → non éditable. AUCUNE table `document_retention_rules`, AUCUN `is_permanent`, AUCUNE colonne de numéro sur `ag_meetings`, AUCUNE vue `v_pv_register`. `ag_meetings` porte `pv_document_id` (NULLABLE, ON DELETE SET NULL), `pv_generated_at`, `status`. G24-AM2 (séquences serveur sans trou) = décidé mais NON implémenté.

**Ma proposition** : Ne créer AUCUN 2e modèle de durée — le barème = exactement C.10-P1 (déjà validé) : table éditable `document_retention_rules` seedée + `is_permanent` ; le trigger lit la table (10 ans en filet). Grain via un `legal_doc_type` dédié (l'enum `document_category` mélange juridique et pratique). `is_permanent` hérité de la règle mais surchargeable par doc, verrouille la purge à vie. Registre PV = vue `v_pv_register` DÉRIVÉE de `ag_meetings`, MAIS numéro `pv_sequence_no` MATÉRIALISÉ sur la ligne (jamais calculé par `row_number()` qui se renumérote), alimenté par G24-AM2 à la GÉNÉRATION du PV, clé `(copro_id, 'pv', année de meeting_date)`. C14-6 livré APRÈS G24-AM2 (vrai bloquant V1). Purge gestionnaire + motif tracé (journal G24-T9). `document_access_log` laissé à C.10-P4.

**Ce qui est strictement TA décision (USER)** : (a) tout en V1 (option 1) vs numérotation seule en V1, barème différé (option 2) ; (b) grain du barème (`legal_doc_type` dédié vs enum existant) ; (c) périmètre du registre (toutes les AG avec PV vs seulement signés/diffusés).

**Dépendances / préalables bloquants** : G24-AM2 (séquences) DOIT être livré avant — vrai bloquant V1. C.10-P1 (à fusionner, même PR). C.10-P2 `register_generated_document` + resserrer le FK `pv_document_id` (ON DELETE RESTRICT, sinon registre avec numéro mais sans fichier). Machine à états AG gardée (dates `pv_*` fiables, pas UPDATE front — ANOM-11).

**Pièges adversariaux à connaître** : Le décret 67-223 **art.17 vise la COMPTABILITÉ, PAS un registre coté des PV** — la numérotation PV sans trou est une **bonne pratique anti-fraude qu'on s'impose**, pas une obligation légale dure (ne pas sur-justifier). Le filet hardcodé actuel est NON CONFORME pour les pièces à vie (un PV redevient purgeable après 10 ans, art.8 violé) → argument fort pour tout faire en V1. AGO + AGE de la même année partagent le compteur PV annuel.

**Options (pour AskUserQuestion)** : 1. **Fusion C.10-P1 + numéro matérialisé** (RECO) — solde la dette du trigger, registre fiable · 2. **Numérotation V1, barème différé** — plus rapide mais garde la dette des durées non éditables (et la non-conformité art.8) · 3. **Registre = vue pure, numéro calculé** — le plus léger mais se renumérote au moindre SET NULL/suppression → plus un registre « sans trou ».

**Risque si on tranche mal** : Numéro calculé (option 3) = un PV déjà diffusé change de numéro après coup (perte de valeur probante). 2e modèle de durées = deux vérités qui divergent (doc verrouillé d'un côté, purgeable de l'autre). Livrer avant G24-AM2 = registre sans numéro ou bricolage à ré-aligner. Absorber `document_access_log` ici = double traitement avec C.10-P4.

---

### C11-P5 — Source unique des destinataires (drift de projection)

**La question (1 phrase claire)** : Comment imposer UNE seule source de vérité « qui est destinataire et comment il s'appelle », alors qu'aujourd'hui deux objets (vue + RPC) calculent le nom et les tantièmes différemment ?

**État réel (base)** : TROIS chemins coexistent. RPC `rpc_get_ag_coproprietaires` (0030, chemin canonique des envois AG) : `display_name` sans fallback + pondère les tantièmes par `share_percent` (répartit le poids du lot entre indivisaires). Vue `v_coproprietaires_overview` (0035) : fallback « Inconnu » + concentre le poids sur le `is_primary`. Plus des lectures directes de la table. AUCUNE colonne `display_name` ni colonne FR en base (toujours calculée, alias EN). Les deux objets choisissent la clé générale par `order by id limit 1` (non déterministe si >1 clé active). `address_line2` jamais lu côté convocation.

**Ma proposition** : UNE projection canonique à deux portes partageant la même plomberie : fonction SQL `display_name(coproprietaire)` + vue socle `v_coproprietaires_overview` (seule à connaître nom/tantièmes/solde/adresse complète/éligibilité/canal) ; la RPC scopée-AG NE recalcule plus rien, elle lit la vue et ajoute sa garde DEFINER. Contrat de champs figé en EN, réutilisé partout. Arbitrages : fallback « Inconnu » ; personne morale = `company_name` seul ; indivision = destinataire = mandataire `is_primary`, poids du lot compté UNE fois (modèle vue = le bon pour l'AG, art.23) ; clé générale canonique déterministe à figer AVANT ; porter l'adresse COMPLÈTE (`address_line2`) ; exclure les anciens propriétaires ; flag `is_eligible_recipient` + canal préféré DANS la source.

**Ce qui est strictement TA décision (USER)** : (a) une projection (vue socle + RPC dérive) vs deux objets à contrat partagé ; (b) règle display_name personne morale (representant en ligne « à l'attention de » optionnelle ?) ; (c) périmètre destinataires (inclure les copros sans lot ?).

**Dépendances / préalables bloquants** : Socle Personnes & lots (Palier 2). ANOM-19 (12 vues d'agrégat fantômes à recréer, dont celle-ci). Décision indivision/`lot_owners`. **Fermer la non-détermination de la clé générale** (contrainte d'unicité clé générale active) AVANT de figer la signature, sinon la « source unique » ment encore.

**Pièges adversariaux à connaître** : **Le « bug indivision » du dossier est FAUX tel qu'écrit** — la RPC pondère par `share_percent` et somme bien au poids du lot (pas de gonflement des voix). La vraie divergence est RÉPARTITION (RPC : A=500/B=500) vs CONCENTRATION (vue : A=1000/B=0), les deux sommant à 1000. Pour le vote AG, c'est la **RPC (demi-voix) qui est juridiquement discutable** (art.23 : un mandataire commun = UNE voix) → le modèle `is_primary` de la vue est le bon. Ne pas faire ratifier l'illustration « gonflement des voix ». Le commentaire « la vue peut retourner des doublons » est PÉRIMÉ (sous-requêtes scalaires, 0 doublon).

**Options (pour AskUserQuestion)** : 1. **Vue socle, RPC dérive** (RECO) — une logique, garde DEFINER conservée, adresse complète, dédup JS supprimée · 2. **Une seule projection (tout sur la vue)** — un seul objet mais perte de la garde scopée-AG → risque fuite portail · 3. **Deux sources, contrat partagé minimal** — moins de refonte mais le drift peut réapparaître.

**Risque si on tranche mal** : Deux logiques divergentes = quorum/majorité calculés différemment selon l'écran (délibération contestable, art.22). Adresse tronquée (sans line2) = convocation non valable (art.64-65 → AG attaquable). Tout sur la vue sans garde DEFINER = portail copro expose l'annuaire complet (fuite RGPD). Flag d'éligibilité hors source = clé d'idempotence des envois (C11-P4) instable → doubles convocations.

---

### C11-P6 — Modération du mur : soft-delete auditable

**La question (1 phrase claire)** : Faut-il remplacer la suppression dure actuelle du mur (DELETE client + cascade destructeur, sans trace) par un masquage auditable, et graver ce contrat pour la future table mur v2 ?

**État réel (base)** : `deletePost` fait un `supabase.from('wall_posts').delete()` DIRECT depuis le navigateur (useMur.ts:279), aucune RPC mur n'existe. FK `wall_comments`/`wall_likes` → `wall_posts` ON DELETE CASCADE → supprimer un post efface DÉFINITIVEMENT les commentaires de tiers, sans aucune trace qui/quand/pourquoi. AUCUNE colonne modération (`is_hidden/hidden_by/motif/hidden_at` = 0 hit), AUCUNE table de signalement. `is_locked` existe en colonne mais jamais câblé. `v_wall_feed` ne filtre aucun statut. RLS ON sans FORCE + `GRANT ALL ON wall_posts TO anon` (ANOM-01). Précédent : `mails.is_deleted/deleted_at` (sans `deleted_by` ni motif).

**Ma proposition** : RATIFIER, et verrouiller comme CONTRAT DE DESIGN de la future table mur v2 (rien sur l'ancien Next gelé) : (1) `is_hidden` sur `wall_posts` ET `wall_comments` ; (2) masquage via RPC gardée (`hide_wall_post`/`hide_wall_comment`), jamais `.delete()`/`.update()` front ; (3) `v_wall_feed` filtre `is_hidden = false` (invisible aux copros, relisible par le gestionnaire) ; (4) hard-delete séparé réservé gestionnaire pour le droit à l'effacement RGPD ; (5) motif = enum (spam/insulte/hors-sujet/donnée perso) + libre optionnel ; (6) `is_locked` (fermer la discussion) distinct de `is_hidden` (retirer le contenu) ; (7) trigger sur UPDATE de `is_hidden` pour les compteurs. Préalable non négociable : retirer `GRANT ALL TO anon` + RLS FORCE (sinon modération cosmétique).

**Ce qui est strictement TA décision (USER)** : (a) inclure le signalement structuré (table dédiée P1) ou le sortir du périmètre ; (b) QUI peut masquer (gestionnaire seul vs + auteur vs président CS) ; (c) rétention d'un post masqué (aligner sur le barème C.14 ou durée propre).

**Dépendances / préalables bloquants** : C.17 doctrine 1 (RPC gardée, aucun UPDATE/DELETE statut front) + doctrine 2 (audit qui/quoi/motif). Recréation de la table mur + `v_wall_feed` en v2 (Palier 11). ANOM-01 (retirer GRANT anon + RLS FORCE) = bloquant. Patron soft-delete à partager avec `mails` (le patron, pas le nom/sens de colonne).

**Pièges adversariaux à connaître** : **LCEN art.6 (hébergeur) = sur-interprétation** — un mur interne réservé aux membres d'UNE copro n'est pas un hébergeur au sens propre ; à dégrader en « inspiration / bonne pratique », ne pas écrire qu'il « fonde » la table de signalement. RGPD art.15 = lien le plus faible (le vrai fondement est art.5.2 accountability). `v_wall_feed` ne filtre RIEN (pas même par copro — c'est le front + RLS qui filtrent) : dire « filtre QUE par copro » est faux, mais la conclusion (il FAUT y ajouter `is_hidden=false`) tient. Ne pas FORCER l'unification avec `mails.is_deleted` (corbeille perso) — sémantique différente du masquage par un tiers.

**Options (pour AskUserQuestion)** : 1. **Ratifier (contrat v2)** (RECO) — soft-delete auditable complet + signalement table dédiée P1 · 2. **Ratifier sans le signalement** — plus léger, mais modération seulement réactive (aucun copro ne peut signaler proprement) · 3. **Affiner d'abord avec l'expert** — trancher QUI modère / rétention / compteurs / wording RGPD avant de graver.

**Risque si on tranche mal** : Statu quo = effacement irréversible en cascade + zéro traçabilité (syndic sans défense face à une accusation de censure, manque l'accountability RGPD art.5.2). Oublier de filtrer `v_wall_feed` = posts « masqués » toujours visibles (fausse modération). Pas de hard-delete séparé = impossible d'honorer le droit à l'effacement (art.17). Ne pas retirer GRANT anon + FORCE = durcissement contournable. Dupliquer la convention `mails` = deux patrons divergents.

---
