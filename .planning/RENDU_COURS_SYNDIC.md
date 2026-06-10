# Analyse formation × CoProFlex — Rapport de croisement
**Date : 03 juin 2026 — Confidentiel fondateur**

---

## 1. Synthèse exécutive

**Verdict net : CoProFlex est sur la bonne trajectoire, mais incomplet sur des points légalement structurants.**

Le cœur de l'architecture (partie double, plan comptable décret 2005-240, lot-centric, clés de répartition, grand livre immuable, statuts de période) est **confirmé et aligné** avec la doctrine formation sur tous ses aspects fondamentaux. C'est solide.

Là où ça coince : trois familles de gaps concentrent le risque réel avant une mise en production commerciale.

1. **Boucle financière annuelle incomplète** : `regularize_period` (WP5.3) est un stub. L'exercice ne se boucle pas. Les soldes copropriétaires sont faux après chaque clôture tant que l'affectation 120/110→450 n'est pas implémentée. La formation (ARC Vilsalmon + doc comptabilité) en fait une obligation centrale, pas une option.

2. **Documents légaux convocation AG non conformes** : les libellés des 5 annexes sont faux (Annexe 3 = "Budget prévisionnel" au lieu de "Ventilation par clés"), le rapport CS et la fiche synthétique sont marqués `obligatoire: false` alors que la loi les impose. Ces erreurs génèrent des convocations juridiquement contestables dès le premier usage.

3. **PPT et DPE entièrement sur mock-data** : deux modules obligatoires depuis 2023-2025 qui ne persistent rien en base. Ce n'est pas une question de conformité future — pour les copropriétés de plus de 200 lots, l'obligation PPT date du 1er janvier 2023.

Ce qui est différé à bon escient : la vue copropriétaire (extranet ALUR), les locataires, le module contentieux complet, le PPT connecté. La priorisation "finance d'abord, boucle testable" est correcte.

---

## 2. Verdict par module

| Module | Verdict | Résumé |
|---|---|---|
| Finance & Comptabilité | Partiel | Fondations solides (GL, partie double, 450-x, cut-off, appels) mais boucle annuelle ouverte (WP5.3 stub), annexes 1/3/4/5 non tracées en migration, ventilation 110/120 incorrecte |
| AG & Gouvernance | Partiel | Majorités, feuille de présence, pouvoirs, PV bien modélisés ; libellés des 5 annexes faux, rapport CS et devis travaux marqués non-obligatoires, co-construction OdJ avec CS absente |
| Copropriétaires, Lots & RCP | Partiel | Lot-centric ancré, mutations modélisées, mais état daté avec des zéros en dur (document légal remis au notaire !), fonds ALUR non sous-comptabilisé par lot en GL, EDD non structuré |
| Maintenance, Travaux & PPT | Partiel — risque bloquant | Schéma OS/contrats/logbook bien conçu, mais PPT et DPE 100% mock-data (modules légalement obligatoires depuis 2023-2026), calcul cotisation ALUR incomplet |
| GED & Documents légaux | Partiel | Infrastructure GED mature (durées, versioning, signed URLs, auto-filing), mais checklist obligatoires statique (toujours rouge sans lire la base), fiche synthétique non-obligatoire, envoi PV stub |
| Impayés & Recouvrement | Partiel — risque bloquant | Workflow de relance modélisé, vues SQL complètes, mais statut "sent" posé sans envoi réel, référence légale incorrecte (art.19 au lieu de 10-1/19-2), plan d'apurement absent en SQL |

---

## 3. Écarts majeurs vs la formation

### Sévérité BLOQUANTE (risque juridique ou commercial direct)

**B-1 — État daté avec zéros en dur** (`create_etat_date_snapshot`)
`work_fund_alur.balance = 0` et `pending_calls.amount = 0` hardcodés. L'état daté est un document légal remis au notaire (art. 20 loi 65-557 + décret 67-223). Une vente avec un état daté faux engage la responsabilité du syndic.
*Source : formation ARC Vilsalmon, guide ARC-Services*

**B-2 — Module PPT entièrement sur mock-data**
`usePPT.ts` initialise depuis `MOCK_PPT_COPROPRIETES`, aucun appel Supabase. Les copropriétés >200 lots avaient l'obligation PPT au 1er janvier 2023.
*Source : formation PPT loi Climat 2024, guide ARC-Services*

**B-3 — Module DPE entièrement sur mock-data**
`useDPE.ts` initialise depuis `MOCK_DPE_LIST`. Le DPE est un document légal avec dates de validité encadrées réglementairement. Les copropriétés >200 lots ont l'obligation DPE collectif depuis le 1er janvier 2024.
*Source : formation PPT loi Climat 2024*

**B-4 — Envoi de relances : statut "sent" sans envoi réel**
`recipient_email = null` (TODO non résolu). Une mise en demeure sans envoi réel ne déclenche pas le délai légal art. 10-1 ni la déchéance du terme art. 19-2. C'est le cas le plus dangereux : l'interface donne l'illusion d'une mise en demeure envoyée.
*Source : doc ARC 25 ans, guide ARC-Services*

---

### Sévérité MAJEURE (erreur métier documentée)

**M-1 — regularize_period : stub no-op (WP5.3)**
L'affectation 120/110 → 450-x par quote-part n'est pas implémentée. Après chaque clôture d'exercice, les soldes copropriétaires restent faux. Le cycle financier annuel ne se boucle pas.
*Source : formation ARC Vilsalmon (processus affectation résultat), annexes Vilsalmon*

**M-2 — Ventilation 110/120 incorrecte dans `open_next_period`**
TOUT le net 6/7 va dans le 120. Les charges de travaux (671-678, 702, 705) devraient alimenter le 110 ("solde en attente sur travaux et opérations exceptionnelles"), pas le 120 ("solde opérations courantes"). La formation Vilsalmon distingue explicitement les deux.
*Source : formation annexes Vilsalmon, ARC doc comptabilité*

**M-3 — Libellés des 5 annexes faux dans `useConvocationAnnexes.ts`**
Annexe 3 = "Budget prévisionnel" (faux, c'est la ventilation par clés de répartition). Annexe 4 = "État des dettes et créances" (faux, ce sont les travaux terminés). Annexe 5 = "Situation de trésorerie" (faux, c'est l'état des travaux non clôturés avec colonnes A/B/C/D/E/F). Des convocations générées avec ces libellés sont juridiquement incorrectes (art. 11 décret 67-223).
*Source : formation annexes Vilsalmon (doc d8559ced), très précis*

**M-4 — Rapport CS et fiche synthétique marqués `obligatoire: false`**
Le rapport du CS est obligatoire depuis le décret du 20 avril 2010. La fiche synthétique est obligatoire depuis la loi ALUR 2014 (art. 8-2 loi 65-557). Leur absence est un motif de contestation des décisions d'AG.
*Source : doc ARC 25 ans (4b4e5d4b), formation annexes Vilsalmon*

**M-5 — Devis travaux marqué `obligatoire: false`**
L'art. 11 décret 67-223 impose les devis en pièce jointe pour toute résolution de travaux. Leur absence entraîne la nullité automatique de la résolution — pas seulement l'annulabilité.
*Source : doc ARC 25 ans (4b4e5d4b)*

**M-6 — Fonds travaux 105 non éclaté par lot en grand livre**
La vue `v_alur_lot_contributions` calcule une quote-part par extrapolation sur les tantièmes globaux. La formation (ARC Vilsalmon, guide ARC-Services) impose des sous-comptes 105-x par lot pour "éviter l'enrichissement sans cause lors des mutations". Sans cela, l'état daté ne peut pas être calculé correctement non plus.
*Source : ARC doc comptabilité (6815ebeb), guide ARC-Services (896afe15), art. 8 arrêté 2005*

**M-7 — Calcul cotisation ALUR : seulement 5% budget, jamais 2,5% PPT**
La loi Climat 2021 impose MAX(2,5% PPT voté ; 5% budget prévisionnel). Le calcul actuel ne consulte jamais le montant du PPT.
*Source : formation PPT loi Climat 2024, ARC doc comptabilité*

**M-8 — Restriction mandats : blocage dur à 3 sans exception des 10%**
Art. 22 loi 65-557 : un mandataire peut dépasser 3 mandats si l'ensemble des tantièmes ne dépasse pas 10% du total. De plus, le syndic et ses préposés ne peuvent recevoir de mandat — non vérifié en base.
*Source : doc ARC 25 ans (4b4e5d4b)*

**M-9 — Mutations sans écriture comptable de régularisation**
`validate_mutation` crée le nouvel owner mais ne génère aucune écriture dans `ledger_transactions`. Le solde 450 du vendeur n'est pas soldé. Incompatible avec la comptabilité d'engagement.
*Source : ARC doc comptabilité, doc ARC 25 ans*

**M-10 — Scoring impayés sur montant absolu (pas ratio budget)**
`v_unpaid_lots` classe CRITICAL > 2 000 €. Le guide ARC 2002 pose le seuil d'alerte à 25-30% du budget annuel. Un résidant dans une copropriété avec budget 20 000 € est en alerte dès 5 000 € ; dans une copropriété à 300 000 €, 2 000 € est une poussière. Le scoring actuel est trompeur.
*Source : guide copropriétés fragiles ARC 2002 (f385d3d0)*

**M-11 — Référence légale incorrecte dans les templates de mise en demeure**
Le template cite "art. 19" qui est le superprivilège, pas la mise en demeure. La mise en demeure s'appuie sur les art. 14-1 (budget), 19-2 (déchéance du terme) et 10-1 (frais privatifs).
*Source : doc ARC 25 ans (4b4e5d4b)*

**M-12 — alur_transfers : transferts hors grand livre**
La table `alur_transfers` trace les mouvements du fonds ALUR sans écriture dans `ledger_transactions`. La comptabilité d'engagement impose que tout mouvement soit tracé en partie double.
*Source : ARC doc comptabilité (6815ebeb)*

**M-13 — Annexes 1/3/4/5 : aucune migration SQL CREATE FUNCTION dans le dépôt**
`fn_annexe_1`, `fn_annexe_3`, `fn_annexe_4`, `fn_annexe_5` existent dans les types TypeScript et sont appelées, mais aucune migration ne les crée. Seule `fn_annexe_2` est versionnée. Statut incertain : soit déployées hors contrôle de version, soit manquantes.
*Source : croisement code*

---

### Sévérité MINEURE (à corriger, pas urgent)

- Délai convocation mesuré en jours calendaires simples au lieu de jours francs (art. 64 décret 67-223)
- Durée de conservation des correspondances : 5 ans dans le service mock au lieu de 10 ans légaux
- Reconduction tacite des contrats : alertée mais pas bloquée (guide ARC-Services la "bannit explicitement")
- Numéro ADEME du DPE stocké mais fichier XML absent (obligation décret 2020-1609)
- `lots_count` dans `copros` compte tous les lots, pas seulement les lots principaux (fausse les seuils PPT/DPE)

---

## 4. Focus Finance : la formation confirme-t-elle notre design ?

### Ce que la formation CONFIRME (avec références précises)

**Confirmé — Partie double + vérification d'équilibre**
La formation (ARC doc comptabilité, annexes Vilsalmon) est explicite : "toute écriture portée au débit doit avoir une contrepartie au crédit". La vérification débit=crédit avant posting dans `post_ledger_transaction` est conforme et suffisante.

**Confirmé — Plan comptable décret 2005-240 : les 82 comptes**
La provision_copro_chart couvre exactement les classes citées par la formation (101/102/103/105/110/120/401/408/450-x/459/471/472/486/487/512/601-67x/701-716). Rien à ajouter sur la structure de base.

**Confirmé — Sous-comptes 450-1 à 450-5 par nature**
La formation (ARC Vilsalmon, art. 10 décret comptable) valide exactement ce découpage : courant, travaux, avances, emprunts, ALUR. Non-postabilité du chapeau 450 : correct.

**Confirmé — Unité de gestion = LE LOT, pas le copropriétaire**
Passage clé de la formation : "un compte comptable par copropriétaire, avec option de 4 sous-comptes". Mais la formation dit aussi "éclater le fonds travaux par LOT et non par copropriétaire". Notre implémentation lot-centric avec dérivation du solde propriétaire par sommation des lots est exactement ce que préconise la formation. Solide.

**Confirmé — À-nouveau = report du SOLDE des comptes de bilan (classes 1/4/5)**
La formation (ARC Vilsalmon) : "les comptes de résultat se soldent et vont sur 120 ; les comptes de bilan sont reportés par leur solde". `open_next_period` qui reporte le solde (pas les écritures individuelles) est la bonne approche. Le fix 20260601097000 qui inclut 110/120 dans le report est confirmé.

**Confirmé — 120 = solde opérations courantes**
La formation valide explicitement : "le 120 reçoit le solde net des charges et produits courants (classe 6 courante / classe 7 courante)". Mais avec une nuance importante sur 110 (voir ci-dessous).

**Confirmé — Appel de fonds agrégé : D450-1/C701 par lot, puis D512/C450 à l'encaissement**
La formation décrit exactement ce processus en deux temps. Notre implémentation `post_budget_call_for_funds` suit ce schéma.

**Confirmé — Appel ALUR : D450-5/C105 (PAS C701)**
La formation (ARC doc comptabilité) est explicite sur ce point. Notre budget_type='alur' avec v_credit_code='105' est correct.

**Confirmé — Comptes 408/486/487 pour le cut-off de clôture**
La formation valide les charges à payer (408), charges constatées d'avance (486), produits constatés d'avance (487). La RPC `post_period_cutoff` WP5.2 est conforme.

**Confirmé — Immutabilité du GL : obligatoire légalement**
La formation cite "l'exigence légale" et les triggers empêchant UPDATE/DELETE sur les transactions postées sont la bonne implémentation.

**Confirmé — Statut de période open→closed→approved, gel par l'AG**
La formation (annexes Vilsalmon) : "l'approbation en AG fige les comptes". Le hook AG qui appelle `approve_period` est conforme.

**Confirmé — Comptes d'attente 471/472 : justifiés ou soldés en clôture**
La formation (annexes Vilsalmon) : "les comptes 47 doivent être soldés — nécessitent une décision d'AG". L'utilisation de 471/472 pour la reprise de mandat (set_opening_balance) est acceptable comme résidu transitoire, à condition de forcer leur apurement.

---

### Ce que la formation CONTREDIT ou PRÉCISE (impact sur Lot 1)

**Contradiction — Ventilation 110 vs 120 dans `open_next_period`**
La formation distingue sans ambiguïté :
- Compte 120 = "solde en attente sur opérations COURANTES"
- Compte 110 = "solde en attente sur TRAVAUX et opérations exceptionnelles"

Comptes concernés par le 110 : 671 (travaux décidés AG), 672 (travaux urgents), 673 (études), 677 (pertes créances), 678 (charges exceptionnelles), 702 (provisions travaux), 705 (affectation fonds travaux), 706 (remboursements).

Le code actuel met **tout** dans le 120. C'est une divergence documentée dans le plan de correction. **Impact direct sur Lot 1** : à corriger dans le même sprint que WP5.3 (ils sont liés — l'affectation aux copropriétaires doit distinguer courant et travaux).

**Contradiction — WP5.3 : `regularize_period` est un stub**
La formation est explicite sur le processus : "le solde excédentaire ou déficitaire des opérations courantes est distribué aux copropriétaires par quote-part lors de l'approbation des comptes en AG". L'écriture est D120/C450-1 par lot (ou D110/C450-2 pour la part travaux), au prorata des tantièmes généraux, **datée à la date de l'AG**. Ce n'est pas optionnel : sans cette étape, les soldes de `v_lot_balance` sont faux dès la fin du premier exercice.

**Précision — Fonds ALUR : les 105 doivent être éclatés par LOT en GL**
La formation (ARC doc comptabilité, art. 8 arrêté 2005, guide ARC-Services) est très précise : "sous-comptes du 105 PAR LOT". Notre implémentation actuelle (105 global + `v_alur_lot_contributions` calculée par tantièmes) est "mieux que rien" mais ne satisfait pas l'exigence légale. **Impact Lot 1 direct** : pour l'état daté et les mutations, c'est bloquant.

**Précision — Cohérence inter-annexes : obligatoire légalement**
La formation (annexes Vilsalmon) cite trois règles de cohérence croisée que le code ne vérifie pas :
1. Solde courant Annexe 2 (haut) = Annexe 3 (total net par clé)
2. Solde travaux Annexe 2 (bas) = Annexe 4
3. Compte 12 (annexe 1) = Solde E de l'Annexe 5

Ces contrôles sont des obligations légales (art. 11 décret 67-223), pas des "nice-to-have".

**Précision — Annexe 6 : liste individualisée des soldes copropriétaires obligatoire**
La formation dit explicitement : "la globalisation des comptes 45 doit être accompagnée d'une liste individualisée jointe (nom + montant débiteur/créditeur)". C'est une pièce obligatoire à joindre à la convocation. `v_owner_balance` existe mais n'est pas formalisée comme document légal.

---

## 5. Recommandations priorisées

### Haute priorité — Sprint immédiat (avant toute démonstration client)

| # | Recommandation | Effort | Pourquoi maintenant |
|---|---|---|---|
| H-1 | Implémenter `regularize_period` (WP5.3) : D120/C450-1 et D110/C450-2 par lot au prorata des tantièmes, daté à la date d'approbation AG | M | Boucle financière annuelle ouverte ; soldes faux après chaque clôture |
| H-2 | Corriger ventilation 110/120 dans `open_next_period` : filtrer 671-678/702/705/706 vers 110 au lieu de 120 | S | Directement lié à H-1 ; les deux ensemble bouclent l'exercice |
| H-3 | Corriger les libellés des 5 annexes dans `useConvocationAnnexes.ts` (Annexe 3 = ventilation par clés, Annexe 4 = travaux terminés, Annexe 5 = travaux non clôturés) | S | Génère des convocations juridiquement incorrectes dès maintenant |
| H-4 | Passer `rapport_conseil_syndical` et `fiche_synthetique` à `obligatoire: true` ; `devis_travaux` conditionnel si résolution travaux à l'OdJ | S | Nullité potentielle des décisions d'AG |
| H-5 | Corriger l'état daté : remplacer les zéros hardcodés par des requêtes réelles sur `v_alur_lot_contributions` et `call_for_funds_lines` | S | Document légal remis au notaire ; la responsabilité du syndic est engagée |
| H-6 | Vérifier (via MCP Supabase) si fn_annexe_1/3/4/5 existent en base et les extraire en migration versionnée si oui ; sinon les implémenter | L | Fonctions appelées par fn_dashboard_kpis — statut inconnu |
| H-7 | Corriger la référence légale dans les templates de mise en demeure : remplacer art.19 par art.14-1/19-2/10-1 ; bloquer le bouton "Envoyer" si `recipient_email` null | S | Responsabilité juridique + risque de fausse mise en demeure |

### Priorité moyenne — Sprint suivant (avant go-live commercial)

| # | Recommandation | Effort | Pourquoi |
|---|---|---|---|
| M-1 | Connecter `usePPT` et `useDPE` à Supabase (`planned_works` et `technical_documents`) | M | Modules légalement obligatoires ; obligation PPT >200 lots depuis 2023 |
| M-2 | Créer une RPC `compute_alur_minimum(copro_id, budget_prev)` : MAX(2,5% PPT ; 5% budget), brancher sur page fonds-alur | S | Conformité loi Climat 2021 ; calcul actuel incomplet |
| M-3 | Ajouter dans `copros` : `construction_reception_year` et `lots_principaux_count` ; créer RPC `compute_ppt_dpe_obligation(copro_id)` | S | Seuils PPT/DPE basés sur lots principaux, pas total |
| M-4 | Tracer les transferts ALUR dans le GL : remplacer la table `alur_transfers` extra-comptable par des appels à `create_ledger_transaction` | M | Comptabilité d'engagement impose la traçabilité en partie double |
| M-5 | Créer `payment_plans` SQL (échéanciers d'apurement) avec RPC `create_payment_plan` | M | Gap fonctionnel majeur pour les copropriétaires de bonne foi |
| M-6 | Rendre la checklist `DOCUMENTS_OBLIGATOIRES_CHECKLIST` dynamique (requête réelle sur `documents` avec statut+catégorie+expiration) | M | Aujourd'hui toujours "tout à rouge" — inutilisable |
| M-7 | Corriger `save_ag_pouvoir` : ajouter règle 10% tantièmes + exclusion syndic/conjoint/préposés | M | Déjà prévu dans PLAN_CORRECTION_VALIDE.md — pas encore codé |
| M-8 | Implémenter les règles de péremption DPE anticipée dans `useDPE` : avant 31/12/2017 → caduc 01/01/2023 ; entre 01/2018 et 06/2021 → caduc 01/01/2025 ; classe A/B/C post-01/07/2021 → exempt | S | Calcul naïf à +10 ans faux pour des millésimes importants |

### Priorité basse — Backlog conformité 2026

| # | Recommandation | Effort |
|---|---|---|
| B-1 | Éclater le fonds travaux 105 par lot en GL (modifier `post_budget_call_for_funds` pour créditer 105 avec lot_id) | L |
| B-2 | Créer une vue `v_annexes_coherence_check` (3 règles légales : 2↔3, 2bas↔4, 12↔5) | M |
| B-3 | Implémenter la fiche synthétique auto-générée (art. 8-2 loi 65-557) | M |
| B-4 | Créer une vue `v_copro_fragility_indicators` (ratio impayés/budget, ratio dettes fournisseurs/budget) pour remplacer le scoring sur montant absolu | S |
| B-5 | Supprimer le fallback localStorage des ordres de service (données contractuelles) | S |
| B-6 | Créer table `litiges` et connecter la page contentieux (actuellement `MOCK_LITIGES = []`) | L |
| B-7 | Ajouter contrôle plafond avance de trésorerie 1031 ≤ 1/6e du budget | S |
| B-8 | Générer la liste individualisée des soldes copropriétaires (annexe 6) depuis `v_owner_balance` | S |

---

## 6. Questions à trancher par l'expert (Lyes)

**Q-1 — Affectation WP5.3 : qui décide du montant distribué aux copropriétaires ?**
La formation dit : l'excédent est distribué selon la clé générale (tantièmes généraux) à la date de l'AG d'approbation. Mais pour un déficit (insuffisance), la formation précise qu'un appel complémentaire est émis. CoProFlex doit-il bloquer l'approbation si le 120 est débiteur (excédent de charges) jusqu'à émission de l'appel complémentaire, ou laisser passer et émettre l'appel en T1 N+1 comme aujourd'hui prévu ?
*Enjeu : ordre des opérations en AG et comportement du solde en période entre clôture et affectation.*

**Q-2 — Rapport CS : qui le produit dans le flux CoProFlex ?**
La table `council_reports` et `rapport-cs.service.ts` existent mais sont en données mockées. Le rapport CS est une pièce obligatoire à joindre à la convocation. Est-ce que CoProFlex doit permettre au conseil syndical de le rédiger directement dans l'app (feature à développer), ou simplement obliger l'upload d'un fichier ? Le plan PLAN_MAITRE_VUE_COPROPRIETAIRE.md prévoit l'espace CS — peut-on en dériver ce workflow ou c'est un chantier séparé ?

**Q-3 — PPT/DPE : prioriser la connexion Supabase ou attendre la vue copropriétaire ?**
Les deux modules sont bloquants légalement pour les copropriétés >200 lots. Mais leur front tourne sur mock. La connexion à Supabase est un M (2-5 jours). Est-ce que ça entre dans le sprint "finance/boucle" ou c'est une release parallèle ? Le risque est de promettre PPT/DPE à des clients sans pouvoir le livrer.

**Q-4 — Fonds ALUR 105 par lot : quel niveau de conformité viser pour le go-live ?**
La formation exige des sous-comptes 105-x par lot en GL. C'est un L (gros chantier). La vue `v_alur_lot_contributions` par tantièmes est fonctionnelle mais non conforme. Pour le go-live, peut-on afficher un disclaimer "quote-part indicative" sur l'état daté et corriger post-go-live ? Ou est-ce légalement inacceptable dès la première vente avec état daté ?

**Q-5 — Deux résolutions distinctes en AG : "approbation des comptes" vs "approbation de la répartition" ?**
La formation (doc ARC 25 ans) insiste sur ce point : deux effets juridiques distincts. CoProFlex les fusionne en une résolution. Est-ce un écart à corriger avant le go-live (changement de modèle de données) ou une simplification acceptable pour une v1 ?

**Q-6 — Scoring impayés : quel seuil pour les "CRITICAL" ?**
La formation (guide copropriétés fragiles 2002) recommande un ratio impayés/budget. Mais un ratio implique que chaque vue chargée fasse une jointure sur le budget prévisionnel actif. Quelle est la tolérance de performance acceptable ? Peut-on passer à un ratio pour les KPIs portefeuille et garder le montant absolu pour le tri/filtrage dans les listes ?

**Q-7 — fn_annexe_1/3/4/5 : vraiment absentes ou déployées hors migration ?**
Ces fonctions sont déclarées dans les types TypeScript et appelées par fn_dashboard_kpis. Si elles existent en base sans migration, c'est une dette technique immédiate (non reproductible sur un environnement frais). Dois-je exécuter un MCP Supabase pour vérifier leur existence et les exporter en migration, ou sais-tu déjà qu'elles ne sont pas déployées ?

---

*Sources consultées : (1) "Savoir lire et exploiter les documents comptables de sa copropriété" — ARC (6815ebeb) ; (2) "Les annexes comptables — 5 annexes" — L. Vilsalmon/ARC (d8559ced) ; (3) "Le règlement de copropriété — EDD, clauses" — ARC M. Brûlon (12ca9c18) ; (4) "La copropriété depuis 25 ans + rappel des principaux textes" — ARC (4b4e5d4b) ; (5) "Plan Pluriannuel de Travaux + loi Climat 2021" — ARC formation technique 2024 (6bb516c2) ; (6) "Petit guide méthodologique copropriétés en difficulté/fragiles" — ARC/CDC/Région IDF 2002 (f385d3d0) ; (7) "Guide de l'assistance technique des responsables de copropriété" — ARC-Services (896afe15). Les croisements code sont issus de l'analyse des migrations SQL et des hooks TypeScript du dépôt Co-Pro-Flex.*
