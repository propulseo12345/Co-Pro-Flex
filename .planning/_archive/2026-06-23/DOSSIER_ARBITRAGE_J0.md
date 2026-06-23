# DOSSIER D'ARBITRAGE — J0.2 (session dédiée, décision G8)

> ✅ **TRANCHÉ le 2026-06-10 (session J0.2b)** — les 20 verdicts sont journalisés dans
> **`DECISIONS.md`** (B3-B5, C2/C3/C6, E2-E9 passés 🟢 + nouvelle section **§H** pour
> état daté/mutations/fixtures). Durcissements expert vs recos initiales : **B3** renommage
> 110→12 requis J5 (pas optionnel) · **B4** + écran « opérations à apurer » · **B5** assertion
> bloquante si multi-clés · **C3** mention de la reprise d'avance sur l'avis d'appel.
> Ce dossier reste la référence des analyses détaillées (état du code, sources légales).

> Préparé le 2026-06-10. **20 fiches**, une par décision en attente : 7 🔴 + 7 🟡 de
> `DECISIONS.md`, 4 points état daté de `DEFERRED_USER_DECISIONS.md`, 2 arbitrages seed E2E.
> Chaque fiche : enjeu vulgarisé → état réel du code (vérifié dans les migrations) → droit
> sourcé → options → reco. **Tu coches, le code suit.** Temps estimé : 45-60 min.
>
> Après la session : reporter chaque décision dans `DECISIONS.md` (statut 🟢 TRANCHÉ),
> puis les jalons J5 (conformité) et J6 (seed/déploiement) du `PLAN_MAITRE_FIN_PROJET.md`
> consomment ces décisions.

## Sommaire & dépendances

| # | Sujet | Reco | Conditionne |
|---|-------|------|-------------|
| B3 | Compte d'attente 120 (courant) | A (assumer) + C (hygiène codes) | Annexe 1, lisibilité externe |
| B4 | Affectation travaux annuelle | C (gel du 110) | B5, E4, clôture conforme |
| B5 | Clé d'affectation du résultat | A maintenant, C en cible | Justesse régularisations |
| C2 | Cloisonnement paiements par nature | A (par défaut) | C3, soldes 450-x justes |
| C3 | Trop-perçu : reprise auto | A (auto à l'appel) | Relances justes |
| C6 | Art. 24 = voix exprimées | A (confirmer + corriger doc) | Validité des votes |
| E2 | Numérotation annexes 3/4 | A (vérif PDF d'abord) | E1 libellés, convocations |
| E3 | Nature courant/travaux sur 6x/7x | A (colonne + CHECK) | E5, E6, E8, clôture |
| E4 | `operation_id` sur écritures travaux | A (niveau ligne) | B4-A, E9, annexes 4/5 |
| E5 | Nature du 662 (agios) | A (travaux par défaut) | — (valeur de seed E3) |
| E6 | Nature des 711-718 (produits) | A (courant par défaut) | — (valeur de seed E3) |
| E7 | Annexe 1 : débiteurs/créditeurs par lot | A (réécriture par sens) | Document légal juste |
| E8 | Annexe 2 : deux blocs | A (courant + travaux) | Dépend E3 |
| E9 | Réalisé travaux sans budget | A+C (obligatoire + filet) | Dépend E3+E4 |
| D3 | Indivision côté acquéreur | A (tableau d'acquéreurs) | Mutations justes |
| D4 | État daté : tous les cédants | B (lister les indivisaires) | Document opposable |
| D5 | État daté partie 3 : périmètre | B (couverture complète) | Risque litige notaire |
| D6 | Verrou « une clé générale active » | A (index unique partiel) | Tantièmes déterministes |
| S1 | Seed E2E : résolution budget travaux | A (FINAL tel quel) + C en dette | Fixture E2E (J6) |
| S2 | Seed E2E : raccourci de cycle AG | A (assumer, réaligner au chantier #2) | Fixture E2E (J6) |

> **Lecture conseillée dans l'ordre** : B3→B4→B5 (un bloc cohérent), puis E3→E4 (les deux
> fondations de schéma), puis le reste librement. Les recos B4-C et B5-A/C sont liées :
> si B4 = C (gel du 110), B5 ne porte plus que sur le courant au palier 1.

---

## Bloc A — Clôture & affectation du résultat

### B3 — Compte d'attente « 120 » sur le courant
**Enjeu** — Entre la clôture du 31/12 et l'AG d'approbation, le résultat courant doit bien être logé quelque part au bilan : c'est le rôle que le code fait jouer au « 120 », inconnu du plan officiel. Mal tranché, on a soit un bilan présenté avec un compte hors nomenclature (piège pour un auditeur externe), soit une répartition prématurée qui crée des créances/dettes avant leur fait générateur — et sur les mauvaises personnes en cas de mutation entre clôture et AG.
**État actuel du code** — `provision_copro_chart` (0025:159-160) crée `110` « Solde en attente sur travaux et opérations exceptionnelles » (libellé légal du 12) et `120` « Solde en attente sur opérations courantes » (inventé). À l'`APPROVE_ACCOUNTS`, `activate_ag_decisions` (0030:1847-1873) enchaîne **dans la même transaction** `close_period` → `open_next_period` (résultat 6/7 ventilé par nature : courant→120, travaux→110, 0027:594-625) → `regularize_period` (D120/C450-1 par quote-part, 0027 §13) : le 120 est vidé aussitôt, sous garde-fou bloquant `assert_result_allocation_split`. Prouvé vert par `supabase/tests/gate_cloture_affectation_e2e.sql`. ⚠️ Le risque resurgit si on appelle `open_next_period` à la main sans `regularize_period` (RPC indépendantes, c'est permis).
**Ce que dit le droit** — Nomenclature arrêté 14/3/2005, classe 1 : 10x/105, **12** (travaux et opérations exceptionnelles uniquement), 13x, 16x — ni 110, ni 120. Décret 2005-240 art. 8 : séparation courant/travaux, le courant se répartit directement. Décret 67-223 art. 45-1 : le trop ou moins-perçu est porté au compte de ceux qui sont copropriétaires **lors de l'approbation des comptes** — la régularisation n'est exigible qu'à l'AG, pas au 1ᵉʳ jour de N+1.
**Options** :
- **A. Assumer le 120 technique (état actuel)** — zéro code ; conforme en pratique car transitoire intra-transaction (n'apparaît jamais sur une annexe 1 « après répartition ») ; conditions : compte marqué interne, exclu des éditions légales, ou présenté « résultat en instance d'affectation » si un solde survit au chemin manuel.
- **B. Répartition directe à la lettre** — fusionner l'affectation dans l'à-nouveau ; supprime le 120 mais réécrit `open_next_period`/`regularize_period`/garde-fou/gate, perd la trace GL distincte « affectation décidée à l'AG », et date la créance avant son fait générateur (45-1).
- **C. A + hygiène de codes** — garder le mécanisme, re-coder `110`→`12` (code légal exact) et sortir le compte d'attente courant de la racine 12x : un « 120 » se lit comme une subdivision du 12 légal, donc comme du **travaux** — contresens garanti à la première lecture externe.
**Reco** — **A tout de suite, C en finition avant le 1ᵉʳ client (F7)**. Le compte d'attente n'est pas une entorse : c'est la traduction comptable du décalage légal clôture→approbation (45-1). Ce qui est attaquable, c'est la numérotation qui singe le plan, pas le mécanisme.
**Décision** : ☐ A ☐ B ☐ C ☐ autre : ______

### B4 — Affectation annuelle du résultat travaux (non conforme à B2)
**Enjeu** — B2 (🟢 fait loi) : le résultat travaux ne se répartit qu'à la clôture **définitive** de l'opération, qui peut chevaucher plusieurs exercices. Le code l'affecte chaque année : sur un chantier pluriannuel, on poserait des régularisations fictives en cours d'opération, sur les copropriétaires de l'année N. Avec l'immutabilité du GL (A5), c'est le seul scénario qui produit des écritures **fausses et définitives** — irrattrapable proprement après une mutation.
**État actuel du code** — `regularize_period` (0027:1268-1293) déverse le solde 110 en D110/C450-2 par quote-part à **chaque** `APPROVE_ACCOUNTS` (0030:1870-1871). Le garde-fou impose même cette annualité : invariant (b) de `v_result_allocation_split` (0027:1068-1070). Aucun `operation_id` (E4 non implémenté) : le système ne peut pas savoir si une opération est close. Limite assumée en tête du gate E2E : la branche travaux n'y est **pas exercée** (seed 100 % courant).
**Ce que dit le droit** — La fonction même du compte 12 (arrêté 14/3/2005) est de **porter le solde travaux d'un exercice à l'autre** jusqu'au dénouement de l'opération — le report en attente n'est pas un pis-aller, c'est le comportement légal. Décret 67-223 art. 45-1 : régularisation aux copropriétaires du jour de l'approbation des comptes de l'opération.
**Options** :
- **A. Correction complète maintenant** — affectation par opération à sa clôture : exige E4 (`operation_id`), chantier schéma+RPC hors gabarit du palier 1.
- **B. Statu quo assumé** — zéro coût ; pari que le 1ᵉʳ client n'a aucun travaux pluriannuel. Fragile vu F7, et c'est l'option qui fabrique des écritures fausses immuables.
- **C. Gel du 110 (intermédiaire conforme)** — conditionner la branche travaux de `regularize_period` (flag `p_affecter_travaux`, défaut false) et restreindre l'invariant (b) au courant seul. Le solde travaux **reste en 110 d'exercice en exercice** (= comportement légal du 12) ; le gestionnaire — qui, lui, sait si l'opération est finie — déclenche l'affectation à la main en attendant E4.
**Reco** — **C**. Conforme à B2 dès le palier 1, coût borné (2 objets ; gate inchangé), réversible (un solde en attente ne crée aucun droit faux, il retarde juste la régularisation), et ne préjuge pas du design E4. B n'est défendable que si le 1ᵉʳ client n'ouvre aucun budget travaux — ce qu'on ne maîtrise pas.
**Décision** : ☐ A ☐ B ☐ C ☐ autre : ______

### B5 — Clé d'affectation du résultat : générale unique ou dédiée ?
**Enjeu** — Répartir un résultat sur une autre clé que celle des provisions qui l'ont produit transfère de l'argent entre lots : un excédent « ascenseur » remboursé aux tantièmes généraux rembourse aussi les rez-de-chaussée. C'est la justesse de la régularisation individuelle de chaque copropriétaire qui se joue.
**État actuel du code** — `regularize_period` (0027:1225-1233) résout **une** clé `category='general'` active et l'applique aux **deux** branches (450-1 et 450-2). Choix explicitement documenté comme provisoire (0027:1117-1120) — le commentaire suggère d'ailleurs `category='alur'` comme clé travaux, ce qui est un contresens. L'enum `repartition_category` = `('general','special','alur')` (0003:23) : aucune catégorie travaux n'existe. Boucle d'or et gate étant mono-clé, l'approximation y est invisible.
**Ce que dit le droit** — Art. 10 loi 65-557 : charges réparties aux tantièmes généraux ou **par utilité** (clés spéciales) ; la régularisation (décret 67-223 art. 45-1) suit la clé des provisions appelées, opération par opération. Il n'existe **pas** de « clé travaux » légale unique : chaque opération votée a la sienne.
**Options** :
- **A. Clé générale unique (palier 1)** — zéro coût ; exact tant que toutes les provisions sont appelées à la clé générale (cas actuel) ; faux dès la première clé spéciale.
- **B. Clé travaux dédiée globale** — fausse bonne idée : aussi arbitraire que la clé générale, donnerait une illusion de justesse — coût d'enum/migration pour zéro gain de conformité.
- **C. Cible : répartition par clé d'origine** — courant : régularisation **clé par clé** (charges réelles − provisions appelées, par clé) ; travaux : clé du budget/de l'opération. Se branche naturellement sur E4/B4-A ; vrai chantier, même horizon.
**Reco** — **A maintenant, C en cible, rejeter B**. Cohérence avec B4 : si B4 = C (gel du 110), la branche travaux sort du palier 1 et B5 ne porte plus que sur le courant, où la clé générale est défendable tant que le palier n'émet que des appels à clé générale. Inscrire la limite dans DECISIONS.md pour qu'elle ne devienne pas un faux acquis.
**Décision** : ☐ A ☐ B ☐ C ☐ autre : ______

---

## Bloc B — Paiements & votes

### C2 — Cloisonnement par nature par défaut
**Enjeu** — Aujourd'hui, un paiement reçu s'impute sur TOUS les appels impayés du lot confondus (courant, travaux, ALUR), du plus ancien au plus récent. Un virement destiné aux charges courantes peut donc « manger » une cotisation fonds travaux : les soldes par poche (450-1…450-5) ne disent plus ce que le lot doit réellement à chaque nature.
**État actuel du code** — `allocate_payment(p_payment_id, p_call_line_ids, p_nature_filter default NULL)` : NULL = FIFO multi-nature (`0026`:303-356) ; filtre nature opt-in `current/works/alur` via `budget_type` ; `post_owner_payment` le relaie tel quel (686), reliquat final → 450-3 (706-712). Aucune gestion des accessoires/intérêts.
**Ce que dit le droit** — Art. 1342-10 C. civ. : l'imputation suit d'abord l'indication du débiteur — or un paiement répond à un appel typé, donc à une nature. Art. 14-2-1 loi 65-557 : les sommes du fonds travaux sont attachées aux lots et définitivement acquises au syndicat → les mélanger au courant fausse une affectation d'ordre public. Art. 1343-1 : le paiement partiel s'impute d'abord sur les accessoires.
**Options** : **A** = cloisonnement par défaut (FIFO conservé à l'intérieur de chaque nature, jamais de croisement, reliquat → 450-3 ; imputation manuelle `p_call_line_ids` toujours possible). **B** = statu quo (FIFO multi-nature, cloisonnement opt-in).
**Reco** — **A**. C'est la seule lecture compatible avec l'affectation légale du fonds travaux et le modèle 450-1…5 déjà acté ; B produit des soldes par nature mécaniquement faux dès le premier paiement « à cheval ». Les accessoires (1343-1) restent un chantier séparé : rien dans le code ne les modélise encore.
**Décision** : ☐ A ☐ B ☐ autre : ______

### C3 — Trop-perçu (450-3) : reprise auto ou manuelle
**Enjeu** — Quand un copropriétaire paie trop, l'excédent dort en avance (450-3). Au prochain appel on lui réclame le montant plein : s'il ne complète pas, il est relancé alors que sa cagnotte couvrirait la dette.
**État actuel du code** — Trop-perçu posté en 450-3 à l'encaissement (`0026`:619-620, 706-712) ; aucune fonction de reprise n'existe (grep `apply_advance|reimpute` = vide) ; l'appel suivant débite 450-1 plein, sans netting.
**Ce que dit le droit** — Aucun texte n'impose la reprise auto ; la compensation (art. 1347 C. civ.) joue entre dettes liquides et exigibles dès qu'elle est invoquée. En revanche, relancer ou mettre en demeure un lot globalement créditeur est indéfendable. Déjà acté pour l'excédent de clôture (WP5.3) : reste sur le 450, apuré à l'appel suivant.
**Options** : **A** = reprise auto à l'émission de l'appel (même lot, même nature si C2=A, allocation tracée ; remboursement sur demande en option). **B** = statu quo manuel (action gestionnaire « utiliser l'avance »). **C** = manuel, MAIS solde exigible et relances nettent toujours l'avance (minimum vital).
**Reco** — **A**. Aligne le trop-perçu sur le modèle déjà décidé pour l'excédent de clôture, supprime le risque de relance à tort et l'accumulation d'avances oubliées. Si tu préfères garder la main, C est le plancher : ne jamais relancer un créditeur.
**Décision** : ☐ A ☐ B ☐ C ☐ autre : ______

### C6 — Art. 24 : voix exprimées, pas « majorité des présents »
**Enjeu** — Avec 10 présents (4 pour, 3 contre, 3 abstentions) : adopté en « voix exprimées », rejeté en « majorité des présents » (l'abstention compterait contre). Le choix de la base change l'issue des votes — et un seuil annoncé faux en séance expose l'AG à l'annulation (contestation art. 42).
**État actuel du code** — Le calcul serveur est juste : `calculate_resolution_result` → art24 adopté si `for_t > against_t`, abstentions exclues (`0030`:43-44, 104-107) ; art. 25-1 à la même règle. C'est la doc/front qui contredit : `src/types/enums/vote-types.ts:5,27` (« majorité simple des présents »), `src/hooks/modules/useFeuillePresence.ts:248` (seuil « 50%+1 des présents » — calcul faux), mocks, `docs/referentiel-ag-copropriete.md:101` + `docs/claude/business-rules.md` (même seuil faux).
**Ce que dit le droit** — Art. 24 I loi 65-557, version en vigueur (vérifié Légifrance) : « les décisions… sont prises à la majorité des voix exprimées des copropriétaires présents, représentés ou ayant voté par correspondance ». Abstentions et blancs hors décompte.
**Options** : **A** = confirmer la base légale « voix exprimées » (code inchangé) et corriger doc + enums + `useFeuillePresence` + mocks. **B** = autre base (serait contra legem).
**Reco** — **A**. Le moteur est conforme à la lettre du texte ; le risque vient uniquement des libellés front qui induisent le gestionnaire en erreur en séance. Correction de doc, zéro impact sur les résultats déjà calculés.
**Décision** : ☐ A ☐ B ☐ autre : ______

---

## Bloc C — Annexes & plan comptable

### E2 — Numérotation annexe 3 vs 4 : vérification visuelle avant gel
**Enjeu** — Les titres des 5 annexes partent dans la convocation d'AG (document légal envoyé à chaque copropriétaire) et vont être gravés à 3 endroits (SQL, front, templates PDF). Une source minoritaire intervertit la 3 et la 4 : si on fige le mauvais numéro, tous les documents produits sont faux. Coût de la vérif : 10 minutes.
**État actuel du code** — Les titres SQL suivent déjà la convention E1 : `fn_annexe_3` « Ventilation des charges par clé » / `fn_annexe_4` « Travaux terminés » / `fn_annexe_5` « Travaux non clôturés » (`0028`:1039,1094,1149). Le front porte un TROISIÈME jeu, faux quelle que soit l'issue : 3 = « Budget prévisionnel », 4 = « Dettes et créances », 5 = « Trésorerie » (`useConvocationAnnexes.ts:59-81`). Au passage, `fn_annexe_3` ventile le **budget** (budget_lines), pas le réalisé — écart de contenu vs modèle, à traiter avec E8.
**Ce que dit le droit** — Décret n°2005-240, art. 5 : documents de synthèse « conformes aux modèles » ; arrêté du 14 mars 2005, art. 7-11 + modèles annexés ; joints à la convocation (décret 67-223, art. 11). Référence : Légifrance → arrêté du 14 mars 2005, version consolidée, **fac-similé JO** des annexes (les tableaux ne sont pas tous retranscrits en HTML).
**À vérifier visuellement sur le PDF** : (1) en-tête exact (numéro + intitulé) des modèles 3, 4, 5 ; (2) le renvoi article→annexe (art. 9, 10, 11 de l'arrêté) ; (3) le contenu confirme le titre (3 = colonnes par clés ; 4 = opérations TERMINÉES voté/réalisé ; 5 = en cours + provisions appelées) ; (4) pas de renumérotation post-ALUR.
**Options** : **A** — vérif PDF d'abord, puis gel simultané des libellés (SQL + front + PDF) en un seul geste. **B** — figer tout de suite sur E1 et corriger si le PDF infirme.
**Reco** — **A**. Vérif quasi gratuite contre un risque de document légal faux en masse ; et elle clôt E1 définitivement (le front est à corriger dans tous les cas).
**Décision** : ☐ A ☐ B ☐ autre : ______

### E3 — Dimension « nature » (courant/travaux) sur les comptes 6x/7x
**Enjeu** — Toute la clôture repose sur la séparation courant/travaux : le courant se répartit immédiatement, le travaux attend la clôture d'opération (B1/B2), et les annexes 2/4/5 se découpent pareil. Aujourd'hui ce partage repose sur une liste de comptes codée en dur : tout compte oublié ou créé par un cabinet tombe **silencieusement** en « courant ».
**État actuel du code** — Liste en dur dans `open_next_period` : `('671','672','673','674','677','678','702','705','706')` (`0027`:602,611). Vérifié vs le plan seedé (`0025`:195-238) : **661, 662, 703, 704 absents** (→ courant de fait), **6221 « Honoraires travaux » classé courant**, et **677 listé mais jamais seedé** (compte fantôme). Nuance vs DECISIONS.md : 671/677 sont bien DANS la liste SQL ; les vrais oubliés sont 661/662/703/704 + 6221. Côté schéma, `accounts.nature` existe mais est verrouillée aux 45x (`ck_nature_only_on_45x`, `0012`:12,25).
**Ce que dit le droit** — Décret n°2005-240, art. 1er et 8 : bipartition obligatoire opérations courantes / travaux art. 14-2 et opérations exceptionnelles, jusque dans l'affectation du résultat. La loi n'impose pas la méthode de classement : elle impose que le partage soit juste.
**Options** : **A** — colonne `charge_nature` ('courant'|'travaux') sur `accounts`, CHECK miroir (obligatoire sur 6x/7x, interdite ailleurs), seed par défaut, ré-création de `open_next_period` + `fn_annexe_2` pour lire la colonne (1 migration + 2 fonctions). **B** — compléter la liste en dur : zéro schéma, mais le défaut silencieux et la dérive restent. **C** — dériver uniquement de `operation_id` (E4) : insuffisant, les 70x d'appels et charges sans opération restent inclassables.
**Reco** — **A** — la liste a déjà prouvé qu'elle dérive (6221, 677). Règle de précédence à graver : écriture portant un `operation_id` (E4) = travaux quoi qu'il arrive ; sinon nature du compte. E5/E6 deviennent alors de simples valeurs de seed.
**Décision** : ☐ A ☐ B ☐ C ☐ autre : ______

### E4 — Étiquette opération/chantier (`operation_id`) sur les écritures travaux
**Enjeu** — L'annexe 5 légale se présente **par opération** (chaque chantier : voté, réalisé, provisions appelées, solde). Sans étiquette opération sur les écritures, on ne sait produire qu'une approximation par compte. C'est aussi le prérequis de B4 (affecter le résultat travaux à la clôture de **l'opération**) et de E9.
**État actuel du code** — `ledger_entries` n'a aucune dimension opération (`0013`:84-96). `fn_annexe_4/5` approximent le réalisé par correspondance de **comptes** (EXISTS sur `budget_lines.account_id`, `0028`:1066-1082,1121-1137) : deux opérations partageant le compte 671 comptent chacune **toutes** les écritures 671 (double comptage croisé), une charge sur un compte hors budget n'apparaît nulle part. La colonne « provisions appelées » manque (dérivable : les appels travaux portent déjà `budget_id`, `0026`:479-484).
**Ce que dit le droit** — Arrêté du 14 mars 2005, art. 10-11 + modèles 4/5 : suivi ligne à ligne **par opération** votée (art. 14-2 loi 65-557) ; décret 2005-240 art. 8 : le résultat travaux s'affecte par opération à sa clôture.
**Options** : **A** — colonne `operation_id uuid null` REFERENCES `budgets(id)` sur `ledger_entries` + index partiel + garde « obligatoire si compte de nature travaux (E3) » ; câblage : `create_ledger_transaction` (⚠️ greper les appelants front/edge avant de figer la signature, leçon 0033), `post_supplier_invoice`, annexes 4/5 réécrites par opération. **B** — au niveau transaction : plus simple, mais une facture ventilée sur 2 chantiers devient impossible. **C** — table `operations` dédiée : propre à long terme, surdimensionné (le budget works EST l'opération).
**Reco** — **A** — granularité ligne (cas réel : facture multi-chantiers), FK vers budgets works, pas de nouvelle table. Rétro-remplissage : aucun (copros de test). F7 le rend de toute façon obligatoire avant le 1er client.
**Décision** : ☐ A ☐ B ☐ C ☐ autre : ______

### E5 — Nature du compte 662 (charges financières et agios)
**Enjeu** — Où part le solde du 662 à la clôture : réparti immédiatement (courant) ou rattaché à une opération (travaux) ? En copro, les charges financières apparaissent surtout avec un emprunt collectif qui finance… des travaux.
**État actuel du code** — 662 seedé (`0025`:222) mais **absent** de la liste travaux (`0027`:602) → classé courant de fait, sans mécanisme de configuration.
**Ce que dit le droit** — Aucun classement légal figé du 662 ; seul s'impose le partage courant/travaux du décret 2005-240. Les intérêts d'un emprunt suivent logiquement l'opération qu'il finance.
**Options** : **A** — défaut **travaux**, configurable au compte (valeur de seed E3). **B** — défaut courant, configurable.
**Reco** — **A** — l'usage dominant du 662 en copro est lié au financement de travaux ; les frais bancaires de fonctionnement ont leur place en 628. La précédence E4 règle les cas fins. Traiter **661 et 704** (annuités d'emprunt) du même geste.
**Décision** : ☐ A ☐ B ☐ autre : ______

### E6 — Nature des comptes 711-718 (produits divers)
**Enjeu** — Même question côté produits : subventions, indemnités d'assurance, produits financiers — courant ou travaux ? Un mauvais défaut gonfle le résultat courant réparti immédiatement avec de l'argent qui appartient à une opération.
**État actuel du code** — Seedés : 711, 713, 714, 716 (`0025`:235-238) ; absents de la liste `0027`:602 → courant de fait (conforme au défaut proposé, mais par accident, sans configuration possible).
**Ce que dit le droit** — Bipartition décret 2005-240 ; les modèles d'annexes 4/5 tracent le **financement des opérations** (provisions, emprunts, subventions) : une subvention liée à des travaux votés doit suivre l'opération.
**Options** : **A** — défaut **courant** pour tous, configurable au compte (colonne E3). **B** — seed différencié d'emblée : 711 (subventions) = travaux, le reste courant.
**Reco** — **A** pour la simplicité du palier 1, avec vigilance 711 : une subvention travaux (ANAH, MaPrimeRénov' copro) doit porter l'`operation_id` (E4) et bascule en travaux par précédence.
**Décision** : ☐ A ☐ B ☐ autre : ______

### E7 — Annexe 1 : débiteurs/créditeurs par sens de solde, par lot ; isoler le 450-5
**Enjeu** — L'annexe 1 doit montrer séparément ce que les copropriétaires **doivent** (créances) et ce que le syndicat **leur doit** (avances, trop-perçus). Aujourd'hui tout est compensé dans un seul agrégat : un lot créditeur efface un lot débiteur, les avances disparaissent et l'état présenté aux copropriétaires est faux.
**État actuel du code** — `fn_annexe_1` (`0028`:849-863) : créances = net débiteur agrégé de **tout** le 45x (les créditeurs se compensent, 450-5 noyé dedans) ; dettes = 40x uniquement (les copropriétaires créditeurs n'apparaissent nulle part) ; 103/105 affichés en « provisions » (`0028`:841-847) ; 120/110 absents du passif (constat audit ch.8, correctif 4.3 toujours applicable). Le détail existant compense par **personne** (`v_owner_statement_by_person`, `0028`:897-906).
**Ce que dit le droit** — Arrêté du 14 mars 2005, art. 7 + modèle annexe 1 : état financier après répartition, partie I trésorerie/réserves, partie II créances ET dettes présentées **sans compensation**. Cohérent avec l'état daté (le 450-5 ALUR y est déjà traité à part) et A2 lot-centric.
**Options** : **A** — réécrire `fn_annexe_1` : solde par (lot × sous-compte 45x), split débiteur/créditeur par **sens**, ligne dédiée « cotisations fonds travaux à recevoir » (450-5 débiteur), 103/105 au bloc « réserves », 120/110 au passif. Pure réécriture de fonction, zéro schéma. **B** — split par personne en réutilisant la vue existante : moins de travail, mais une personne avec un lot débiteur et un lot créditeur se compense encore — contraire à A2.
**Reco** — **A** — c'est le modèle légal et la règle lot-centric déjà FAIT LOI ; B reproduirait le défaut qu'on corrige un cran plus loin.
**Décision** : ☐ A ☐ B ☐ autre : ______

### E8 — Annexe 2 : deux blocs (courant + travaux), budget prévisionnel au bloc courant seul
**Enjeu** — Le compte de gestion général doit séparer les opérations courantes (comparées au budget prévisionnel art. 14-1) des travaux/opérations exceptionnelles (hors budget par définition, art. 14-2). Aujourd'hui tout est fusionné : la colonne « budget voté » mélange budgets courants ET travaux, la comparaison n'a pas de sens.
**État actuel du code** — `fn_annexe_2` (`0028`:937-996) : un seul bloc, réalisé = tout 6x/7x de la période ; la CTE `budgeted` (948-955) joint **tous** les budgets `validated` sans filtre `budget_type` ; les clés JSON s'appellent `charges_courantes`/`produits_courants` alors qu'elles contiennent les travaux — trompeur.
**Ce que dit le droit** — Arrêté du 14 mars 2005, art. 8 + modèle annexe 2 : partie opérations courantes (réalisé vs budget art. 14-1) et partie travaux art. 14-2 / opérations exceptionnelles ; le total des deux boucle avec le résultat à affecter (décret 2005-240, art. 8).
**Options** : **A** — deux blocs découpés par la nature E3 : bloc I courant (réalisé + budget voté `current`), bloc II travaux/exceptionnel (réalisé, rappel du voté AG, **sans** colonne budget prévisionnel) ; renommer les clés JSON. **B** — exclure les travaux de l'annexe 2 : non conforme au modèle, le résultat affiché ne bouclerait plus avec l'affectation art. 8.
**Reco** — **A** — c'est littéralement le modèle officiel, et c'est ce qui rend l'affectation B1/B2 lisible par l'AG. Dépend d'E3.
**Décision** : ☐ A ☐ B ☐ autre : ______

### E9 — « Réalisé » travaux quand la facture n'a pas de budget rattaché
**Enjeu** — Si une facture de travaux n'est reliée à aucune opération, son montant sort des radars : l'annexe 5 sous-compte le réalisé, le syndic croit son chantier moins avancé qu'il ne l'est, et le document légal est faux.
**État actuel du code** — Rien n'exige le lien : `supplier_invoice_lines.budget_line_id` nullable SET NULL (`0021`:293), **pas propagé** au grand livre. Le réalisé des annexes 4/5 est reconstruit par correspondance de comptes : compte hors budget = invisible (sous-comptage), compte partagé entre 2 opérations = compté deux fois.
**Ce que dit le droit** — Comptabilité d'engagement (décret 2005-240 ; art. 14-3 loi 65-557) : toute charge travaux constatée se rattache à une opération votée (art. 14-2) ; les modèles 4/5 exigent le suivi **par opération** — une approximation n'est pas « conforme aux modèles » (décret art. 5).
**Options** : **A** — rattachement **obligatoire à la saisie** : la validation refuse une ligne sur compte travaux (E3) sans `operation_id` (E4) ; le réalisé devient Σ exacte des écritures étiquetées. **B** — garder l'approximation + bandeau « non autoritaire » : sous-comptage et double comptage persistent ; intenable pour F7. **C** — filet complémentaire à A : ligne visible « travaux non rattachés » en annexe 5 (reprises de mandat, legacy) + blocage de la clôture d'opération tant qu'il en reste.
**Reco** — **A + C** — la contrainte coûte un sélecteur d'opération dans le formulaire facture ; le filet C garantit qu'aucun euro de travaux ne disparaît **silencieusement**, même sur données reprises.
**Décision** : ☐ A+C ☐ A seul ☐ B ☐ autre : ______

---

## Bloc D — État daté (mutations)

### D3 — Indivision côté acquéreur (`validate_mutation`)
**Enjeu** — À la vente, la RPC installe UN acquéreur à 100 %. Or couple ou indivision successorale = cas majoritaire ; l'app ignorerait le second indivisaire (convocations, mandataire commun, quote-parts, portail).
**État actuel du code** — `validate_mutation` (0031) écrase tous les co-propriétaires actifs et crée un acquéreur unique à 100 %. La DB le supporte déjà (`lot_owners.share_percent`, Σ≤100) — seule la signature de la RPC bride.
**Ce que dit le droit** — Art. 23 al. 2 loi 65-557 : les indivisaires sont représentés à l'AG par un mandataire commun — encore faut-il les connaître. L'avis de mutation (art. 6 décret 67-223) notifie le transfert avec le ou les bénéficiaires nommés dans l'acte.
**Options** : **A** = paramètre tableau `{coproprietaire_id, share_percent, is_primary}` dès maintenant (gardes : Σ=100, un seul primary). **B** = mono-acquéreur conservé + correction manuelle de `lot_owners` après validation.
**Reco** — **A**. Changement de signature modeste, structure déjà prête ; B laisse une fenêtre où feuille de présence et convocations sont juridiquement fausses, sans garde-fou ni trace.
**Décision** : ☐ A ☐ B ☐ autre : ______

### D4 — État daté nominatif vs lot-centric
**Enjeu** — Le payload désigne UN vendeur (`seller_owner_id`) alors que tous les montants sont calculés par lot. En indivision, le document officiel remis au notaire ne nomme qu'un seul des cédants.
**État actuel du code** — `generate_etat_date_payload` (0031) : `seller` = un seul `seller_owner_id`, montants lot-centric. En indivision avant vente, ça ne désigne qu'un indivisaire.
**Ce que dit le droit** — Art. 5 décret 67-223 : l'état daté récapitule les sommes dues par « le copropriétaire cédant » au titre du lot ; en indivision, les cédants sont tous les indivisaires — un document opposable doit les nommer tous.
**Options** : **A** = assumer `seller_owner_id` comme libellé indicatif (documenter). **B** = lister dans le payload tous les `lot_owners` actifs à la date d'effet (primaire marqué), montants inchangés.
**Reco** — **B**. Coût quasi nul (payload seul, aucun calcul modifié), parfaitement cohérent avec lot-centric (les montants restent au lot, seule l'identification devient complète). A laisse un document officiel nominativement incomplet.
**Décision** : ☐ A ☐ B ☐ autre : ______

### D5 — Périmètre de la partie 3 (à la charge de l'acquéreur)
**Enjeu** — La partie 3 dit au notaire ce que l'acquéreur devra payer. Aujourd'hui elle ne contient que les appels déjà émis non échus : les trimestres restants du budget voté et la cotisation fonds travaux à venir n'y figurent pas → le notaire sous-provisionne, l'acquéreur découvre la note après.
**État actuel du code** — 0031 : partie 3 = reconstitution des avances 450-3 + appels émis non échus uniquement (constat revue multi-agent 2026-06-07 ; « défendable » en l'état).
**Ce que dit le droit** — Art. 5 décret 67-223, 3e partie : reconstitution des avances « d'une manière même approximative » + **provisions non encore exigibles** du budget prévisionnel + provisions non encore exigibles hors budget. Combiné à l'art. 14-1 (provisions exigibles au 1er jour de chaque période), les trimestres futurs du budget VOTÉ entrent dans le texte, appel émis ou non ; la cotisation fonds travaux (art. 14-2-1) relève du hors-budget.
**Options** : **A** = statu quo documenté (exact seulement si tous les appels de l'exercice sont pré-émis — rien ne le garantit). **B** = couverture complète : provisions restantes du budget voté + cotisation ALUR de la période, calculées depuis le budget (estimation permise).
**Reco** — **B**. C'est la lettre du décret : l'approximation est autorisée, l'omission non. Un état daté sous-évalué se retourne contre le syndicat (et le syndic professionnel) au premier litige acquéreur.
**Décision** : ☐ A ☐ B ☐ autre : ______

### D6 — Invariant « une seule clé générale active »
**Enjeu** — Rien n'empêche deux clés de répartition « générale » actives sur une copro. Tous les calculs de tantièmes (état daté, seuils AG, régularisation) prennent alors « la première venue » (`limit 1` sans `order by`) — avec un résultat potentiellement différent d'un module à l'autre, silencieusement.
**État actuel du code** — Pattern `limit 1` établi et volontairement homogène (0027/0030/0031 — ne PAS corriger localement) ; aucune contrainte d'unicité ; le SQL du verrou est déjà écrit dans la dette 0034/0035 : `create unique index uq_key_general_active on repartition_keys(copro_id) where category='general' and is_active`.
**Ce que dit le droit** — Art. 5 loi 65-557 : les quotes-parts générales sont fixées par le règlement de copropriété — il n'existe juridiquement qu'UN référentiel de tantièmes généraux par copro.
**Options** : **A** = poser l'index unique partiel en migration dédiée (après vérification qu'aucune copro seedée n'a 2 clés). **B** = statu quo (convention `limit 1`, documentée).
**Reco** — **A**. Un verrou d'une ligne qui transforme une corruption silencieuse de tantièmes en erreur franche à l'insertion ; B conserve un non-déterminisme entre modules sur LA donnée pivot de toute la répartition.
**Décision** : ☐ A ☐ B ☐ autre : ______

---

## Bloc E — Seed E2E AG (fixture de test, jalon J6)

### S1 — Résolution budget travaux hors générateur standard
**Enjeu** — Le générateur d'AG (`create_ag_with_standard_resolutions`) ne sait pas créer un vote de budget travaux. Le DRAFT détournait la résolution n°4 (budget courant) ; le FINAL insère à la main une résolution n°8 et laisse 4 résolutions standard (comptes, quitus, budget courant, syndic) sans vote → « rejected » au PV de la fixture.
**État actuel du code** — `seed_ag_e2e_FINAL.sql`:243-265 : INSERT direct #8 (`works`/`art25`/`CREATE_WORK_BUDGET`) + NB métier explicite. La banque `resolution_templates` (chantier #3, livré) pourrait porter un template travaux.
**Ce que dit le droit** — Néant (fixture de test). Nuance métier : un PV où comptes et quitus sont « rejetés » est un scénario lourd — gênant si la copro E2E sert un jour de démo client.
**Options** : **A** = valider le FINAL tel quel (#8 manuelle + 4 rejets assumés, documenté). **B** = AG ordinaire « complète » (voter #2/#3/#6 et lier #4 au budget courant). **C** = traiter la racine : template système `CREATE_WORK_BUDGET` dans `resolution_templates` pour que le moteur génère le vote travaux sans INSERT bespoke.
**Reco** — **A** maintenant (débloque le test E2E sans toucher au moteur) + **C** en dette courte — c'est exactement ce pour quoi la banque de résolutions a été construite. B seulement si la fixture devient support de démo commerciale.
**Décision** : ☐ A ☐ A+C ☐ B ☐ autre : ______

### S2 — Raccourci de cycle AG dans le seed
**Enjeu** — L'arbitrage noté le 2026-06-09 (« aucune RPC de clôture ») est **caduc** : `close_ag` existe (0030:781-845) et le FINAL l'appelle. Ce qui reste à valider : le seed ACTIVE les décisions (`finalize_and_activate_ag`:301) AVANT de lever la séance (`close_ag`:308), et s'arrête à `closed` sans PV — alors que le cycle canonique est close → PV → activation/finalize.
**État actuel du code** — `seed_ag_e2e_FINAL.sql`:300-309 ; cycle canonique documenté (0041) ; chantier #2 (close_ag → activate@PV → finalize_ag) : spec+plan committés, T0→T6 **non exécutés**.
**Ce que dit le droit** — Rien n'impose un ordre interne : les décisions d'AG sont exécutoires dès le vote (sous réserve du délai de contestation, art. 42 loi 65-557).
**Options** : **A** = assumer le raccourci (but de la fixture = données activées + une AG passée + une AG à tenir ; le PV reste générable ensuite dans l'app). **B** = aligner le seed sur le cycle canonique dès que le chantier #2 est livré.
**Reco** — **A** maintenant, avec note de réalignement vers B au livrage du chantier #2 : la fixture teste l'état des données, pas le workflow PV — et le cycle cible n'existe pas encore en base.
**Décision** : ☐ A ☐ B ☐ autre : ______
