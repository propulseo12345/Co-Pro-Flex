# DECISIONS.md — Journal partagé des décisions (CoProFlex / refonte finance)

> **Pièce maîtresse de l'organisation.** Tout ce qu'on tranche vit ICI (pas dans un chat).
> L'ouvrier (Claude Code) lit ce fichier AVANT de juger un comportement « bug » vs « volontaire ».
> Dernière mise à jour : 2026-06-08.

## Légende des statuts
- 🟢 **FAIT LOI** — sourcé (Légifrance/décret), **non négociable**.
- 🟢 **TRANCHÉ** — décidé entre nous, stable.
- 🟡 **PROPOSÉ** — recommandation de Claude, **attend le feu vert de Lyes**.
- 🔴 **OUVERT** — à trancher par Lyes (expert copro).
- ⏭️ **DIFFÉRÉ** — hors du palier 1 (boucle finance testable).

**Compteur :** 7 points 🟡 PROPOSÉ + 7 points 🔴 OUVERT en attente. Les plus structurants : **B3** (compte interne 120) et **C6** (mesure de l'art. 24).

---

## A — Fondations comptables (🟢 FAIT LOI)
Invariants. Toute violation = bug.
- **A1** 🟢 **Grand livre = source unique de vérité.** Tout solde se dérive des écritures postées, jamais d'une table parallèle (relevé bancaire, budget…).
- **A2** 🟢 **Lot-centric.** L'unité de gestion est le **lot**, jamais la personne. `lot_id` obligatoire sur tout compte copropriétaire (45x). Le solde d'une personne = somme de ses lots.
- **A3** 🟢 **Partie double + comptabilité d'engagement** (droits constatés, décret n°2005-240 art. 14-3). Chaque opération équilibrée.
- **A4** 🟢 **Sous-comptes 450 par nature** : 450-1 courant · 450-2 travaux · 450-3 avance · 450-4 prêt · 450-5 fonds travaux ALUR.
- **A5** 🟢 **Immutabilité du GL.** Une écriture postée ne se modifie ni ne se supprime → correction par **contre-passation** (écriture inverse).
- **A6** 🟢 **Écritures canoniques** : appel D 450/lot · C 701 ; encaissement D 512 · C 450-x ; facture D 6xx · C 401 ; cotisation ALUR D 450-5 · C 105 (réserve, art. 14-2 II).

---

## B — Affectation du résultat & clôture
- **B1** 🟢 **FAIT LOI** — Séparation **courant / travaux** à la clôture (décret 2005-240 **art. 8**). Le courant se répartit immédiatement sur les 450 ; le travaux à la clôture de l'opération. La séparation est obligatoire (le bug « tout sur 120 » était une non-conformité).
- **B2** 🟢 **FAIT LOI** — Le résultat **travaux** ne se répartit **qu'à la clôture DÉFINITIVE de l'opération** (qui peut chevaucher plusieurs exercices), pas à chaque fin d'année.
- **B3** 🔴 **OUVERT** *(le plus structurant)* — **Le compte interne « 120 ».** Le code a inventé un compte « Solde en attente sur opérations courantes » (120) pour garer le résultat courant avant répartition. Le plan légal **ne prévoit pas** de compte d'attente pour le courant (répartition directe). **Question : on assume le 120 comme commodité technique (vidé aussitôt vers 450-1), ou on répartit en direct à la lettre du plan ?**
- **B4** 🔴 **OUVERT** — Aujourd'hui le résultat travaux est affecté **chaque année** (non conforme à B2). On corrige maintenant (passe à l'affectation à la clôture d'opération, dépend de E4 `operation_id`), ou on accepte la non-conformité pour le palier 1 (qui n'exerce pas de travaux pluriannuels) ?
- **B5** 🔴 **OUVERT** — Clé d'affectation du résultat : le code utilise la **clé générale unique** pour courant ET travaux. On garde, ou on crée une **clé travaux dédiée** (plus juste) ?
- **B6** 🟢 **TRANCHÉ** — **Reprise de mandat** : contrepartie de la balance d'ouverture = comptes d'attente **471/472**, jamais 89x ni 120 (vérifié dans le code). ⚠️ Dette : **deux chemins front** font la reprise différemment → à unifier.

---

## C — Paiements & AG
- **C1** 🟢 **FAIT LOI** — **Cloisonnement ALUR obligatoire** (fonds dédié d'ordre public, loi 65 art. 14-2). Un paiement ne peut éteindre une dette ALUR avec des fonds courants. Le commentaire de code invoquant l'art. 1342-10 pour un FIFO multi-nature est un **contresens** (« plus ancienne » y est de 4ᵉ rang).
- **C2** 🟡 **PROPOSÉ** — **Cloisonnement par nature PAR DÉFAUT** pour tous les paiements (courant/travaux/ALUR ne se croisent jamais ; reliquat → avance 450-3 ; accessoires avant principal, art. 1343-1). Aujourd'hui le défaut est un FIFO multi-nature. → confirmer la bascule.
- **C3** 🔴 **OUVERT** — Le **trop-perçu (avance 450-3)** se ré-impute-t-il **automatiquement** au prochain appel, ou reste-t-il **manuel** ? (aujourd'hui : manuel, aucune reprise auto.)
- **C4** 🟢 **FAIT LOI** — Majorités AG (art. 24/25/26) calculées sur la base = **total du syndicat** (vérifié dans le code).
- **C5** 🟢 **TRANCHÉ** — Passerelle 25-1 = **informative** (pas de 2ᵉ vote automatique). AG → budget actif → appels = **sur action explicite** du gestionnaire (atomique).
- **C6** 🔴 **OUVERT** *(structurant)* — **Art. 24.** Le code mesure la majorité simple sur les **voix exprimées** (plus de oui que de non) ; la doc front dit « majorité des présents ». **Question : confirme-t-on que la règle légale = voix exprimées (et on corrige la doc), ou tu veux une autre base ?**
- **C7** 🟢 **TRANCHÉ** — **Dashboard** *(le brief T0 y réfère comme « C8 » ; il n'existait pas de point dashboard en section C à retirer).* Réparation **GL-stricte** dès T0. ⚠️ **Vérifié** : (a) le vrai blocage d'entrée = la **vue manquante `v_dashboard_kpis`** (le dashboard échoue dur dessus), PAS `ensure_dev_membership` ; (b) `v_dashboard_recent_activity`/`v_dashboard_todos` **se dégradent déjà** côté front (tableau vide) → **inutile de créer 3 vues** ; (c) **`fn_dashboard_kpis` (dérivé GL) existe déjà** → réutiliser cette fonction plutôt que créer une vue parallèle qui divergerait. **Bornage** : trésorerie (512) + impayés (450 débiteurs) + prochaine AG ; le reste en placeholder.

---

## D — Comportements VOLONTAIRES (NE PAS signaler comme bugs)
- **D1** RLS désactivée en dev (~72/87 tables) = **voulu**. Bascule fail-open hors prod = voulue en dev.
- **D2** Boucle d'or copro **22222222** : écarts historiques **+0,16 / −423 / +30** = **artefacts attendus** (copro fraîche = 0 écart).
- **D3** `src/types/supabase.ts` **périmé** (post_call_for_funds y traîne) = connu, à régénérer plus tard ≠ bug de logique.
- **D4** Copro **11111111 gelée** (immutabilité GL) = ne pas y toucher.

---

## E — Plan comptable, natures & annexes
- **E1** 🟢 **FAIT LOI** — Titres officiels des 5 annexes (arrêté 14 mars 2005) : annexe **3** = opérations courantes ventilées par clés · **4** = travaux art.14-2 réalisés · **5** = travaux votés **non clôturés**. Le **code** (`useConvocationAnnexes`) porte de **mauvais libellés** → à corriger (la spec interne est juste).
- **E2** 🔴 **OUVERT** — Numérotation exacte **annexe 3 vs 4** : une source minoritaire les intervertit. À **vérifier visuellement sur le PDF officiel** des modèles avant de figer les libellés en base.
- **E3** 🟡 **PROPOSÉ** — Ajouter une **2ᵉ dimension « nature » (courant/travaux)** sur les comptes 6x/7x, distincte de la nature des 45x. Remplace la liste en dur actuelle (qui oublie 661/662/671/677/703/704).
- **E4** 🟡 **PROPOSÉ** — Ajouter une **« étiquette opération/chantier » (`operation_id`)** sur les écritures de charges travaux. **Condition légale** pour produire l'annexe 5 (suivi par opération). C'est un ajout de schéma.
- **E5** 🟡 **PROPOSÉ** — Nature du **662** (agios/charges financières) = **travaux** par défaut, configurable au compte.
- **E6** 🟡 **PROPOSÉ** — Nature des **711-718** (produits divers) = **courant** par défaut, configurable au compte.
- **E7** 🟡 **PROPOSÉ** — **Annexe 1** : séparer **débiteurs (créances) / créditeurs (dettes)** par sens de solde, **par lot** ; **isoler le 450-5 ALUR** (ligne « cotisations fonds travaux à recevoir » si débiteur) ; 105/103 au bloc « réserves ». Aujourd'hui les sens sont mélangés (les avances copro disparaissent).
- **E8** 🟡 **PROPOSÉ** — **Annexe 2** : présentation en **DEUX blocs** (courant + travaux), pas exclusion des travaux. Le budget prévisionnel (art.14-1) ne s'affiche que dans le bloc courant.
- **E9** 🔴 **OUVERT** — « Réalisé » travaux quand la **facture fournisseur n'a pas de budget rattaché** : comment éviter le sous-comptage (lier facture → budget, ou étiqueter « approximation non autoritaire ») ?
- **E10** 🟢 **FAIT LOI** — **Fonds travaux ALUR** : solde disponible = solde créditeur **cumulé du compte 105** (tous exercices), **déjà net** des emplois (D105/C705). Seuil de cotisation = **MAX(2,5 % PPT ; 5 % budget)**. Non remboursable, attaché au **lot**.

---

## F — Palier 1 : cadrage & séquencement (🟢 TRANCHÉ)
- **F0** 🟢 **TRANCHÉ (T0 = nettoyage)** + ⏭️ **(bascule = Phase 1)** — **`ensure_dev_membership`.** ⚠️ **Vérifié dans le code (révise le brief T0)** : (a) la RPC **ne provoque PAS de 500** — ses appelants (`activeCopro.ts`, `usePortefeuille.ts`) **avalent l'erreur** et retombent sur « première copro » (RLS off) ; (b) **aucun `membership` n'est semé** pour l'utilisateur local sur 22222222 → le prérequis « résoudre via le vrai mécanisme » **n'est PAS rempli**. **Donc T0** = retirer les **4 appels morts** (`activeCopro`, `usePortefeuille`, `useAgDrafts`, `useConvocationAg`) + blocs TODO bootstrap, **en gardant le fallback « première copro »**. **La bascule** sur `user_has_copro_access` est **reportée Phase 1** (exige un membership semé + RLS on), sinon écran « aucune copro » en dev.
- **F1** 🟢 **But** : app **testable bientôt + fonctionnelle + code propre**. Stratégie = **réconcilier la carto puis exécuter**, finance d'abord, en **tranches verticales testables**.
- **F2** 🟢 **1er palier** = **boucle finance E2E** : créer copro → budget → appel → encaissement → relance → facture → clôture → annexes, prouvée au GL (`audit_finance_integrity = 0`).
- **F3** 🟢 **Borne haute** = **budget créé directement** (pas d'orchestration AG pour ce palier).
- **F4** 🟢 **Appel** = route **agrégée** `post_budget_call_for_funds`. L'**appel hors-budget / exceptionnel** (migration 0037, déjà conçue) = **après** le palier 1.
- **F5** 🟢 **Sécurité (RLS on, isolation users)** = **avant la prod**, pas avant de tester en dev.
- **F6** ⏭️ **DIFFÉRÉ** (hors palier 1) : rapprochement bancaire · opposition art. 20 (ventes) · portail copropriétaire (UI) · délais PV/contestation · archivage légal des annexes · volumes/ASL.
- **F7** 🟢 **TRANCHÉ** — **Cible v1 = vrai PREMIER CLIENT EN PRODUCTION** (pas une démo). Conséquence : la **conformité légale des documents produits** (5 annexes, état daté, fonds travaux, imputation) ET la **sécurité** (RLS, isolation users, 4 trous) passent sur le **chemin critique = obligatoires**. Plusieurs 🔴/🟡 (annexes, `operation_id`, cloisonnement, 110/120) deviennent **requis**, plus optionnels.
- **F8** 🟢 **TRANCHÉ** — **Reprise de mandat = besoin réel OBLIGATOIRE** (un 1er mandat syndic est quasi toujours la reprise d'une copro existante avec son passé). À **fiabiliser avant le 1er client** : unifier les 2 chemins front (cf. B6), traçabilité 471/472 ligne-par-ligne (origine/date/montant/ancienneté, art.10), import de balance. *(Un 1er client sur copro neuve de-risque le lancement, mais la reprise doit exister.)*
- **F9** 🟢 **TRANCHÉ** — **UX de correction (contre-passation) = à concevoir + livrer avant prod.** Le grand livre est immuable (correct) → un syndic qui se trompe doit pouvoir **corriger via un écran de contre-passation guidé**, jamais rester bloqué. Slot : après que la boucle finance tourne, avant le 1er client.
- **F10** 🟢 **TRANCHÉ (cadence de test)** — **Test runtime par Lyes à la fin de CHAQUE tranche** + **recette complète aux jalons** (fin boucle finance · après activation sécurité · avant 1er client). Claude **annonce quoi tester** à chaque palier ; ne lance pas Playwright à sa place.

---

## G — Cadrage bêta (🟢 TRANCHÉ 2026-06-10)
- **G1** 🟢 **TRANCHÉ** — **Périmètre bêta = AVEC portail copropriétaire** (pas « gestionnaire-only »). Conséquence : le **portail copro** (UI + RLS + `coproprietaires.user_id` + invitations, plan `PLAN_MAITRE_VUE_COPROPRIETAIRE.md`) **remonte sur le chemin critique bêta** — il n'est plus « bêta 2 ». ⚠️ Nuance vs **F6** (qui le différait *hors palier 1 finance*) : il reste hors du palier finance, mais devient **requis avant la bêta**.
- **G2** 🟢 **TRANCHÉ** — **Cible cloud bêta = projet Supabase NEUF** dédié, schéma propre `0001→0044` redéployé. Cloud actuel laissé **intact**. **Toute migration cloud = sur GO explicite.**
  - ✅ **RE-BASELINE PROUVÉE (2026-06-10)** : la chaîne **0001→0044 rejoue à 0 erreur** sur une base neuve (env Supabase fidèle), **même en transaction par fichier** (comme `db push`), + smoke `audit_finance_integrity=0`. Mémoire « migrations non reproductibles » = **périmée**. Harnais : `scripts/rebaseline-check.sh`.
  - ✅ **CI `db:test` passée en BLOQUANT** (`.github/workflows/ci.yml`, `continue-on-error` retiré).
  - ⚠️ **AVANT le 1er `db push` cloud + 1er cabinet** : corriger **B1 (RLS démarre OFF en prod : `app.environment` jamais positionné)** + **M2 (assertion REVOKE anon fragile)** — **relèvent de la session Phase 1 sécurité/RLS** (différée). Audit complet + checklist : `.planning/RE-BASELINE_READINESS.md`. Faux positif écarté : 0043 a déjà son `on conflict`.
- **G3** 🟢 **TRANCHÉ + FAIT (code)** — **Wizard d'appel manuel (`createCall`) MASQUÉ pour la bêta** (appelle `post_call_for_funds`, non livrée). Les appels passent par la validation budget en AG (`post_budget_call_for_funds`). Réactiver quand `post_exceptional_call_for_funds` sera implémentée (cf. F4). *Commit `970c4d3`.*
- **G4** 🟢 **TRANCHÉ + FAIT (code)** — **Statut facture fournisseur « validée » = `posted`** (pas de statut `'approved'` distinct ; enum `supplier_invoice_status` = `draft/posted/paid/cancelled`). *Commit `7b1db68`.*
- **G5** 🟢 **TRANCHÉ + FAIT (migration 0044)** — **Avoirs fournisseurs = TYPE DÉDIÉ** : `doc_kind` sur `supplier_invoices`, montant POSITIF, écriture INVERSE **C6xx/D401**, lien `original_invoice_id` nullable, RPC `post_supplier_credit_note` (copie ventilation ou lignes explicites). Q1/Q2/Q3 validés (Lyes). Vue `remaining_to_pay` nette des avoirs ; paiement avoir-aware (un avoir ne se paie pas ; 'paid' = paiement du NET). Prouvé : `gate_avoir_fournisseur_e2e.sql` (9 invariants, db:test 9/9). Spec : `SPEC_AVOIRS_FOURNISSEURS.md`. **Dette notée** : `post_supplier_payment` (0026) renvoie `invoice_status` sur le brut (statut réel correct via trigger) ; relances à filtrer sur doc_kind ; UI « Créer un avoir » à câbler (front).

---

### Sources (pour les 🟢 FAIT LOI)
Décret n°2005-240 du 14 mars 2005 (art. 8) · Arrêté du 14 mars 2005 (art. 7-11, nomenclature + 5 annexes) · Loi n°65-557 du 10 juillet 1965 (art. 14-2 / 14-2-1) · Code civil art. 1342-10 / 1343-1. Détail de la recherche : conversation du 2026-06-08 (5 sous-agents, sources Légifrance).
