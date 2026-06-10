# DECISIONS.md — Journal partagé des décisions (CoProFlex / refonte finance)

> **Pièce maîtresse de l'organisation.** Tout ce qu'on tranche vit ICI (pas dans un chat).
> L'ouvrier (Claude Code) lit ce fichier AVANT de juger un comportement « bug » vs « volontaire ».
> Dernière mise à jour : 2026-06-10 soir (session d'arbitrage J0.2b : TOUS les 🟡/🔴 tranchés + §H).

## Légende des statuts
- 🟢 **FAIT LOI** — sourcé (Légifrance/décret), **non négociable**.
- 🟢 **TRANCHÉ** — décidé entre nous, stable.
- 🟡 **PROPOSÉ** — recommandation de Claude, **attend le feu vert de Lyes**.
- 🔴 **OUVERT** — à trancher par Lyes (expert copro).
- ⏭️ **DIFFÉRÉ** — hors du palier 1 (boucle finance testable).

**Compteur :** **0 point en attente** — l'intégralité des 🟡/🔴 a été tranchée le 2026-06-10 (session J0.2b, dossier `DOSSIER_ARBITRAGE_J0.md`, analyse expert + 4 durcissements). Les ⏭️ DIFFÉRÉ restent différés. Exécution des verdicts = jalon **J5** du plan maître (sauf mention contraire).

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
- **B3** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **Compte d'attente « 120 » CONSERVÉ** comme mécanisme technique (sas légal clôture→approbation, art. 45-1 décret 67-223 ; vidé vers 450-1 dans la même transaction que l'approbation AG, garde-fou bloquant). **Renommage REQUIS en J5 (avant 1ᵉʳ client, pas optionnel)** : re-coder 110→« 12 » (code légal exact) et sortir le compte d'attente courant de la racine 12x — le compte est visible ~6 mois à la balance N+1 pré-AG (période de contrôle du CS, art. 21) et un « 120 » se lit comme du *travaux* dans le plan officiel. Répartition directe (option B) rejetée : daterait la créance avant son fait générateur.
- **B4** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **GEL DU 110** : la branche travaux de `regularize_period` passe derrière un flag (`p_affecter_travaux`, défaut OFF) et l'invariant (b) de `v_result_allocation_split` est restreint au courant. Le solde travaux **se reporte d'exercice en exercice** (= comportement légal du compte 12) ; l'affectation se déclenche **manuellement à la clôture définitive de l'opération** (conforme B2). **Exigence UX liée : un écran liste les opérations travaux en attente d'apurement** (sinon le gel devient un oubli — grief classique des changements de syndic). L'affectation automatique par opération viendra avec E4.
- **B5** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **Clé générale pour le palier, avec ASSERTION BLOQUANTE** : `regularize_period` doit lever une erreur explicite (« répartition par clé d'origine non encore supportée ») si l'exercice porte des appels multi-clés — jamais de décomptes individuels silencieusement faux. **Cible** (même horizon que E4) : répartition **par clé d'origine** — courant clé par clé (charges réelles − provisions appelées par clé), travaux à la clé de l'opération. **« Clé travaux dédiée » globale REJETÉE** (aussi arbitraire que la générale, zéro gain de conformité).
- **B6** 🟢 **TRANCHÉ** — **Reprise de mandat** : contrepartie de la balance d'ouverture = comptes d'attente **471/472**, jamais 89x ni 120 (vérifié dans le code). ⚠️ Dette : **deux chemins front** font la reprise différemment → à unifier.

---

## C — Paiements & AG
- **C1** 🟢 **FAIT LOI** — **Cloisonnement ALUR obligatoire** (fonds dédié d'ordre public, loi 65 art. 14-2). Un paiement ne peut éteindre une dette ALUR avec des fonds courants. Le commentaire de code invoquant l'art. 1342-10 pour un FIFO multi-nature est un **contresens** (« plus ancienne » y est de 4ᵉ rang).
- **C2** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **Cloisonnement par nature PAR DÉFAUT** : un paiement s'impute d'abord dans sa nature (courant/travaux/ALUR ne se croisent JAMAIS), le FIFO d'ancienneté joue *à l'intérieur* de chaque nature, reliquat → 450-3, imputation manuelle (`p_call_line_ids`) toujours possible. Seule lecture compatible avec l'affectation d'ordre public du fonds ALUR (art. 14-2-1) et le modèle 450-1…5. Les accessoires/intérêts (art. 1343-1) = chantier séparé (rien de modélisé à ce jour).
- **C3** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **Reprise AUTOMATIQUE du trop-perçu** (450-3) à l'émission de l'appel : même lot, même nature (cohérent C2), allocation tracée au GL, **+ mention explicite sur l'avis d'appel** (« Avance disponible imputée : −X € ») pour éviter les appels incompréhensibles. Remboursement sur demande = option. **L'avance de trésorerie permanente art. 35 (compte 103) n'est JAMAIS touchée** par cette reprise. Aligne le trop-perçu sur le modèle déjà acté pour l'excédent de clôture (WP5.3).
- **C4** 🟢 **FAIT LOI** — Majorités AG (art. 24/25/26) calculées sur la base = **total du syndicat** (vérifié dans le code).
- **C5** 🟢 **TRANCHÉ** — Passerelle 25-1 = **informative** (pas de 2ᵉ vote automatique). AG → budget actif → appels = **sur action explicite** du gestionnaire (atomique).
- **C6** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **Art. 24 = majorité des VOIX EXPRIMÉES** (texte en vigueur : « majorité des voix exprimées des copropriétaires présents, représentés ou ayant voté par correspondance » ; abstentions et blancs hors décompte). Le moteur (`calculate_resolution_result`) est déjà conforme — **corriger** la doc, les enums front (`vote-types.ts`), le **seuil affiché faux** de `useFeuillePresence` (« 50%+1 des présents »), les mocks et `docs/claude/business-rules.md`. Zéro impact sur les résultats déjà calculés.
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
- **E2** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — Convention actuelle **présumée juste** (référence expert : 1=état financier · 2=compte de gestion général · 3=ventilation par clés · 4=travaux art.14-2 terminés · 5=travaux votés non clôturés ; la « source minoritaire » qui intervertit 3/4 se trompe). **Vérification du fac-similé JO obligatoire** (procédure dans la fiche E2 du dossier) **puis gel SIMULTANÉ** des libellés aux 3 endroits (SQL + front `useConvocationAnnexes` + PDF) — clôt E1 du même geste.
- **E3** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — Colonne **`charge_nature`** ('courant'|'travaux') sur `accounts` : CHECK miroir (obligatoire sur 6x/7x, interdite ailleurs), **seed SOURCÉ sur la nomenclature de l'arrêté** (pas l'intuition — la liste en dur a déjà dérivé : 661/662/703/704 absents, 6221 mal classé, 677 fantôme), `open_next_period` + `fn_annexe_2` lisent la colonne. **Précédence gravée : écriture portant `operation_id` (E4) = travaux quoi qu'il arrive ; sinon nature du compte.**
- **E4** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **`operation_id uuid null` REFERENCES `budgets(id)` au niveau LIGNE (`ledger_entries`)** + index partiel + garde « obligatoire si compte de nature travaux (E3) ». Pas de table dédiée (le budget works EST l'opération). Câblage : `create_ledger_transaction` (⚠️ grep des appelants front/edge avant de figer la signature, leçon 0033), `post_supplier_invoice`, annexes 4/5 réécrites **par opération** (fini le double comptage croisé des comptes partagés et les charges invisibles). Prérequis de B4-cible et E9.
- **E5** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **662 = travaux par défaut**, configurable au compte (les frais bancaires de fonctionnement vont au 628) ; **661 et 704** (annuités d'emprunt) traités du même geste.
- **E6** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **711-718 = courant par défaut**, configurable au compte ; vigilance **711** (subventions ANAH/MaPrimeRénov' travaux) : bascule en travaux par précédence `operation_id` (E4).
- **E7** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **`fn_annexe_1` réécrite** : solde par (lot × sous-compte 45x), split débiteurs/créditeurs **par sens de solde, SANS compensation**, ligne dédiée « cotisations fonds travaux à recevoir » (450-5 débiteur), 103/105 au bloc « réserves », comptes d'attente au passif. Pure réécriture de fonction, zéro schéma. Le split « par personne » rejeté (contraire à A2, re-compenserait).
- **E8** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **Annexe 2 en DEUX blocs** (modèle officiel) : bloc I opérations courantes (réalisé vs budget prévisionnel `current`, art. 14-1), bloc II travaux/exceptionnel (réalisé + rappel du voté AG, **sans** colonne budget) ; clés JSON renommées ; le total des deux boucle avec le résultat à affecter (art. 8). Dépend d'E3.
- **E9** 🟢 **TRANCHÉ (2026-06-10, J0.2b)** — **Rattachement opération OBLIGATOIRE à la saisie** (la validation refuse une ligne sur compte travaux sans `operation_id` ; coût UI = un sélecteur) **+ filet** : ligne visible « travaux non rattachés » en annexe 5 (legacy/reprises) **+ blocage de la clôture d'opération** tant qu'il en reste sur ses comptes. Aucun euro de travaux ne disparaît silencieusement. Bandeau « approximation non autoritaire » rejeté (intenable pour F7).
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
- **G6** 🟢 **TRANCHÉ (2026-06-10)** — **Horizon du plan = FEATURE-COMPLETE.** Le plan maître va jusqu'au feature-complete (rangs 7-8 inclus : mutations/ventes, paiement en ligne, conformité 2026, RGPD), avec deux paliers intermédiaires : **BÊTA pilotes** puis **1ER CLIENT PROD** (F7). Suivi unique : `.planning/PLAN_MAITRE_FIN_PROJET.md`.
- **G7** 🟢 **TRANCHÉ (2026-06-10)** — **Recâblage hors-finance COMPLET avant bêta.** Les ~80 objets driftés (AG pouvoirs/jalons/envois/brouillons, communication, GED, maintenance, CS, budget front) sont recréés et rebranchés AVANT d'inviter un pilote (pas de masquage « à venir »). Méthode = celle de la finance : vues d'agrégat + rebranchement + gate par module. *Remplace la reco « stratégie 1 » de `AUDIT_DRIFT_HORS_FINANCE_2026-06-10.md`.*
- **G8** 🟢 **TRANCHÉ (2026-06-10)** — **Arbitrages comptables en session dédiée amont.** Les 7 🔴 + 7 🟡 (+ D2/D3/D5/D6 état daté + 2 arbitrages seed E2E AG) se tranchent en UNE session d'arbitrage au début du plan (Jalon 0.2), sur dossier préparé par Claude (1 page par point : enjeu, options, reco sourcée). Évite le rework sur annexes/clôture/cloisonnement.
- **G5** 🟢 **TRANCHÉ + FAIT (migration 0044)** — **Avoirs fournisseurs = TYPE DÉDIÉ** : `doc_kind` sur `supplier_invoices`, montant POSITIF, écriture INVERSE **C6xx/D401**, lien `original_invoice_id` nullable, RPC `post_supplier_credit_note` (copie ventilation ou lignes explicites). Q1/Q2/Q3 validés (Lyes). Vue `remaining_to_pay` nette des avoirs ; paiement avoir-aware (un avoir ne se paie pas ; 'paid' = paiement du NET). Prouvé : `gate_avoir_fournisseur_e2e.sql` (9 invariants, db:test 9/9). Spec : `SPEC_AVOIRS_FOURNISSEURS.md`. **Dette notée** : `post_supplier_payment` (0026) renvoie `invoice_status` sur le brut (statut réel correct via trigger) ; relances à filtrer sur doc_kind ; UI « Créer un avoir » à câbler (front).

---

## H — Arbitrages J0.2b : état daté, mutations & fixtures (🟢 TRANCHÉ 2026-06-10)
> Reprend les points ouverts de `DEFERRED_USER_DECISIONS.md` (D3-D6) + les 2 arbitrages du seed E2E. Détail & sources : `DOSSIER_ARBITRAGE_J0.md`.
- **H1** 🟢 *(ex-D3)* — **Indivision côté acquéreur** : `validate_mutation` prend un **tableau d'acquéreurs** `{coproprietaire_id, share_percent, is_primary}` (gardes : Σ=100, un seul primary). La correction manuelle post-validation rejetée (fenêtre de documents légaux faux sans trace). **Démembrement usufruit/nue-propriété = noté backlog mutations (J9).**
- **H2** 🟢 *(ex-D4)* — **État daté nominatif complet** : le payload liste **TOUS les `lot_owners` actifs à la date d'effet** (primaire marqué) — un document opposable nomme tous les cédants ; montants lot-centric inchangés.
- **H3** 🟢 *(ex-D5)* — **Partie 3 complète** : + **provisions non encore exigibles du budget VOTÉ** (trimestres restants, appelés ou non, art. 14-1) + **cotisation ALUR de la période** (hors budget, art. 14-2-1). L'approximation est permise par le texte, **l'omission non** (un état daté sous-évalué engage le syndic).
- **H4** 🟢 *(ex-D6)* — **Index unique partiel `uq_key_general_active`** (`repartition_keys(copro_id) WHERE category='general' AND is_active`) en migration dédiée, **après vérification** qu'aucune copro existante n'a de doublon. Une corruption silencieuse de tantièmes devient une erreur franche.
- **H5** 🟢 *(ex-S1)* — **Seed E2E AG validé tel quel** (résolution travaux #8 insérée à la main, 4 résolutions standard non votées assumées). **Dette courte : template système `CREATE_WORK_BUDGET`** dans `resolution_templates` (c'est la raison d'être de la banque de résolutions).
- **H6** 🟢 *(ex-S2)* — **Raccourci de cycle AG du seed assumé** (activation avant `close_ag`, arrêt à `closed` sans PV — juridiquement neutre, les décisions sont exécutoires dès le vote). **Réalignement sur le cycle canonique au livrage du chantier #2.** L'ancien arbitrage « aucune RPC de clôture » est **caduc** (`close_ag` existe, 0030).

---

### Sources (pour les 🟢 FAIT LOI)
Décret n°2005-240 du 14 mars 2005 (art. 8) · Arrêté du 14 mars 2005 (art. 7-11, nomenclature + 5 annexes) · Loi n°65-557 du 10 juillet 1965 (art. 14-2 / 14-2-1) · Code civil art. 1342-10 / 1343-1. Détail de la recherche : conversation du 2026-06-08 (5 sous-agents, sources Légifrance).
