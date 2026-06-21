# Plan de test — Finance : Factures fournisseurs, Banque/Rapprochement, Comptabilité

> Domaine couvert : factures fournisseurs (saisie, comptabilisation, paiement, avoirs), mouvements bancaires & rapprochement, comptabilité (grand livre, balance, journaux, annexes), opérations à apurer, transferts.
> Environnement : app locale (`npm run dev`) sur le cloud live `qqfqrcolzmcbsvfaumiq`. Compte démo unique `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo »). Choisir une copro depuis `/portefeuille`.
> Vocabulaire rapide pour le testeur non développeur :
> - **Grand livre** = le journal officiel et légal de tous les mouvements d'argent. Chaque opération y laisse une trace en double (un « débit » d'un côté, un « crédit » de l'autre, du même montant).
> - **Écriture comptabilisée (« posted »)** = gravée dans le grand livre, on ne peut plus l'effacer ; pour corriger on passe une écriture inverse (« contre-passation »).
> - **Comptes** : 6xx = charges (dépenses) ; 7xx = produits (recettes) ; 401 = ce qu'on doit aux fournisseurs ; 512 = la banque ; 450-x = comptes des copropriétaires ; 12 = solde des travaux.

---

## Périmètre & écrans canoniques

Confirmé par lecture du code (navigation `src/lib/config/navigation.ts`, hooks et appels RPC réels) :

| Écran | Route | Rôle canonique | Source de vérité |
|---|---|---|---|
| Factures fournisseurs (liste) | `/finance/factures` | Kanban/tableau des factures ; lance les modales Comptabiliser / Payer / Avoir / Voir / Modifier / Supprimer | RPC réelles via `useFacturesPage` |
| Nouvelle facture | `/finance/factures/new` | Saisie + comptabilisation en un geste (`post_immediately:true` → écriture D6xx/C401) | `useNewFacturePage` |
| Détail facture | `/finance/factures/[id]` | Fiche lecture + bouton « Créer un avoir » + boutons de workflow (statut) | `useFactureDetailPage` |
| Mouvements bancaires | `/finance/mouvements-bancaires` | Écran bancaire principal : import CSV, catégorisation, rapprochement, vue table/workflow | `useMouvementsBancairesPage` |
| Comptabilité | `/finance/comptabilite` | Hub légal : Grand livre, Livre comptable, Balance, Compte de gestion, Annexes 1→5 ; clôture d'exercice ; contre-passation | `useComptabilitePage` |
| Opérations à apurer | `/finance/operations-a-apurer` | Soldes travaux (compte 12) en attente d'affectation aux 450-2 | `useWorksPendingSettlement` + `settle_works_balance` |
| Grand livre (doc) | `/documents/ledger` (+ `/full`) | Vue arborescente du grand livre par classe + liste des écritures | `useLedger` |
| Balance (doc) | `/documents/balance` | Balance des comptes, contrôle Σdébit=Σcrédit | `useBalancePage` |
| Annexes légales (doc) | `/documents/annexes` | 5 annexes décret 2005-240 (vue simplifiée + documents officiels) | `useAnnexeData` / `useAnnexeSummary` |
| Relevé des dépenses (doc) | `/documents/expenses` | Relevé général des charges (classe 6) + produits (classe 7) | `useExpenses` |

> NB d'accès : les pages `/documents/ledger`, `/documents/balance`, `/documents/annexes`, `/documents/expenses` ne sont PAS dans le menu latéral (le module Documents ne liste que GED / Courrier / État daté). Elles sont atteintes par URL directe ou par des liens internes. La comptabilité du menu Finance (`/finance/comptabilite`) propose les mêmes onglets Grand livre / Balance / Annexes : c'est le point d'entrée principal. Tester en priorité les onglets de `/finance/comptabilite` ; les pages `/documents/*` sont des vues secondaires de la même donnée.

> Nuance financière MAJEURE à connaître pour interpréter les résultats :
> - Le parcours qui **écrit réellement au grand livre** passe par les **modales de la liste `/finance/factures`** (Comptabiliser → `validate_supplier_invoice`, Payer → `post_supplier_payment`) et par `/finance/factures/new`.
> - Les **boutons de workflow de la fiche détail `/finance/factures/[id]`** (« Soumettre », « Valider », « Mettre en paiement », « Marquer comme payée ») font UNIQUEMENT un changement de statut en base, **sans générer d'écriture comptable**. Ce sont des raccourcis d'état, pas la voie comptable. À tester séparément (TC dédié) et à ne pas confondre avec le vrai paiement.

---

## Écrans morts / doublons (NE PAS tester)

| Écran | Route | Pourquoi mort / doublon |
|---|---|---|
| Anciennes factures (stack sans GL) | `/finance/invoices/*` (page, `/new`, `/[id]`, `/payment*`, confirmation) | Doublon historique de `/finance/factures` sans grand livre ; non routé. Le hook `useFacturesPage` (de `features/finance/invoices`) est réutilisé par la nouvelle liste, mais les **pages** `app/.../finance/invoices/*` sont mortes. |
| État daté Finance | `/finance/etats-dates` | `redirect()` pur vers `/ventes-impayes/ventes`. Le vrai état daté vit dans les mutations de vente. |
| Virement | `/finance/transfer` | Formulaire 100 % statique : le bouton « Effectuer le virement » n'a aucun handler, rien n'est persisté. Stub non fonctionnel. |
| Diagnostic finance | `/finance/diagnostic` | Outil de debug technique (toujours listé dans le menu Finance mais hors périmètre fonctionnel). |
| Catégorisation bancaire (hybride) | `/finance/bank-movements` | Écran secondaire de catégorisation des mouvements `unmatched` via `reconcile_bank_movement`. Fonctionnel mais doublonne le workflow complet de `/finance/mouvements-bancaires` (qui est l'écran routé au menu). NE PAS écrire de cas dessus ; le rapprochement se teste sur `/finance/mouvements-bancaires`. |
| Arrêté des comptes | `/documents/closing` | Stub statique : tous les onglets affichent « Cette annexe n'est pas disponible sur CoProFlex ». Les boutons Approuver/Annuler n'ont pas de handler. |

> Piège connu, à signaler comme BUG plutôt qu'à tester comme fonctionnalité : sur `/finance/mouvements-bancaires`, la modale « Catégoriser » appelle `categorizeBankMovement`, qui est **neutralisée côté API** (les colonnes de catégorie n'existent plus en base depuis la migration 0014). Elle renvoie une erreur explicite. La vraie catégorisation passe par le **rapprochement** (relier le mouvement à un paiement/règlement déjà saisi). Voir TC-FIN-CPT-024.

---

## Cas de test

### A. Factures fournisseurs

## TC-FIN-CPT-001 : Saisie + comptabilisation d'une facture (parcours canonique)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro « Résidence Martin », exercice (période comptable) ouvert, au moins un fournisseur actif et un compte de charge 6xx existant. Compte démo.
**Étapes :**
1. Aller sur `/finance/factures` → cliquer « Nouvelle facture » → **Attendu :** ouverture de `/finance/factures/new`, formulaire affiché (pas de message bloquant).
2. Choisir un fournisseur, un compte de charge 6xx, saisir libellé, date, échéance et un montant TTC (ex. 240 €), valider → **Attendu :** redirection vers `/finance/factures/[id]` ; la facture apparaît au statut « À payer » (posted).
3. Ouvrir `/finance/comptabilite` onglet Grand livre (ou `/documents/ledger`) → **Attendu effet base :** une écriture comptabilisée existe : **Débit 6xx (charge) 240 € / Crédit 401 (fournisseur) 240 €**, datée de la facture.
4. Vérifier la balance (onglet Balance) → **Attendu :** balance toujours équilibrée (Σ débit = Σ crédit).
**Cas limites :** montant 0 ou négatif refusé (« Le montant doit être supérieur à 0 ») ; échéance antérieure à la date facture refusée ; libellé vide refusé ; compte de charge non choisi refusé.
**Règle métier :** facture en 2 temps, ici saisie = comptabilisation (`post_immediately`) ; TVA non récupérable (montant saisi = TTC, mono-poste sur un compte 6xx) ; partie double obligatoire (décret 2005-240, art. 14-3).

## TC-FIN-CPT-002 : Préconditions de saisie absentes (message bloquant)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro sans période ouverte, OU sans fournisseur actif, OU sans compte 6xx (ex. « Residence Paris Ivry » si plus dépouillée).
**Étapes :**
1. Aller sur `/finance/factures/new` → **Attendu :** un message clair remplace le formulaire, selon le cas : « Aucune période comptable ouverte… », ou « Aucun fournisseur actif… », ou « Aucun compte de charge (6xx) actif… ». Aucun formulaire plantable.
**Cas limites :** copro non sélectionnée (revenir au portefeuille).
**Règle métier :** on ne peut comptabiliser que dans une période ouverte.

## TC-FIN-CPT-003 : Création de fournisseur à la volée pendant la saisie
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro « Résidence Martin », période ouverte.
**Étapes :**
1. Sur `/finance/factures/new`, ouvrir le bloc « nouveau fournisseur », saisir un nom inédit, valider → **Attendu :** le fournisseur est créé puis automatiquement sélectionné dans le champ Fournisseur.
2. Recommencer avec un nom déjà existant (même en casse différente) → **Attendu :** pas de doublon créé ; le fournisseur existant est sélectionné.
3. Laisser le nom vide et valider → **Attendu :** message « Le nom du fournisseur est requis ».
**Cas limites :** nom avec espaces seulement = considéré vide ; doublon insensible à la casse.
**Règle métier :** anti-doublon fournisseur (annuaire des tiers, flag `is_supplier`).

## TC-FIN-CPT-004 : Comptabiliser une facture brouillon depuis la liste (modale Comptabiliser)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Une facture au statut Brouillon (draft) existe (créée sans comptabilisation immédiate, ou importée). Copro « Résidence Martin ».
**Étapes :**
1. Sur `/finance/factures`, ouvrir l'action « Comptabiliser » sur la facture brouillon, choisir le type de dépense, valider → **Attendu :** la facture passe « À payer » ; pas d'erreur.
2. Vérifier le grand livre → **Attendu effet base :** écriture **D 6xx / C 401** créée et comptabilisée (appel réel `validate_supplier_invoice`).
**Cas limites :** double clic / re-validation d'une facture déjà comptabilisée → ne doit pas créer de double écriture (`already_posted`).
**Règle métier :** validation = comptabilisation (D6xx/C401).

## TC-FIN-CPT-005 : Régler une facture comptabilisée (modale Payer)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Une facture au statut « À payer » (posted). Copro « Résidence Martin », période ouverte.
**Étapes :**
1. Sur `/finance/factures`, action « Payer » sur la facture, choisir le compte bancaire à débiter, confirmer → **Attendu :** la facture passe « Payée » ; KPI « Total payé » mis à jour.
2. Vérifier le grand livre → **Attendu effet base :** écriture de règlement **Débit 401 (fournisseur) / Crédit 512 (banque)** du montant payé (appel réel `post_supplier_payment`).
3. Relancer exactement le même règlement (même facture, même jour) → **Attendu :** pas de double écriture (clé d'idempotence `pay-<id>-<date>`).
**Cas limites :** échec serveur → la facture ne doit PAS passer « Payée » à tort (l'état optimiste n'est appliqué que si l'écriture réussit) ; copro/période manquante = paiement refusé.
**Règle métier :** paiement = D401/C512 ; idempotence du règlement.

## TC-FIN-CPT-006 : Avoir total sur une facture comptabilisée
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Facture comptabilisée (posted ou paid), avec ventilation. Copro « Résidence Martin », période ouverte.
**Étapes :**
1. Liste `/finance/factures` action « Avoir », OU fiche détail bouton « Créer un avoir » ; saisir un montant égal au total de la facture, un motif et une référence, valider → **Attendu :** un avoir (pièce séparée, montant affiché en négatif) est créé et rattaché à la facture d'origine.
2. Vérifier le grand livre → **Attendu effet base :** écriture INVERSE de la comptabilisation : **Débit 401 / Crédit 6xx** (la ventilation d'origine est recopiée par la RPC `post_supplier_credit_note`).
3. Ouvrir la facture d'origine → **Attendu :** section « Avoirs liés » présente l'avoir ; « Avoirs déduits » et « Reste à payer » recalculés.
**Cas limites :** créer un avoir sur un avoir → refusé (« Un avoir ne peut pas être créé sur un autre avoir ») ; avoir possible uniquement si facture posted/paid (pas sur brouillon) ; pas de période ouverte → refusé.
**Règle métier :** avoir = facture négative, écriture inverse ; la facture d'origine reste immuable (l'avoir est une pièce distincte).

## TC-FIN-CPT-007 : Avoir partiel (prorata de la ventilation)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Facture comptabilisée multi-lignes ou avec ventilation connue. Copro « Résidence Martin ».
**Étapes :**
1. Créer un avoir d'un montant inférieur au total (ex. moitié) → **Attendu :** avoir créé avec des lignes au prorata de la ventilation d'origine.
2. Grand livre → **Attendu effet base :** écriture inverse partielle (D401/C6xx) du montant de l'avoir.
**Cas limites :** ventilation d'origine introuvable → message « Ventilation… introuvable : avoir partiel impossible (un avoir total reste possible) » ; montant produisant 0 ligne valide → message d'erreur dédié.
**Règle métier :** avoir partiel = lignes au prorata ; TVA non récupérable conservée.

## TC-FIN-CPT-008 : Classement Kanban des factures (colonnes & nets d'avoirs)
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** Copro « Résidence Martin » avec factures à divers statuts + au moins un avoir.
**Étapes :**
1. Sur `/finance/factures` en vue Kanban → **Attendu :** colonnes « En retard », « En attente », « À payer », « Payées », « Avoirs » ; chaque facture dans la bonne colonne (en retard = échéance dépassée et non payée ; payée = statut Payée ; etc.).
2. Vérifier une facture ayant un avoir → **Attendu :** son montant affiché est le NET (montant − avoirs) ; la colonne « Avoirs » affiche le total en négatif.
3. Basculer en vue Tableau → **Attendu :** mêmes factures, tri par colonne (date, échéance, fournisseur, montant, statut) opérationnel.
**Cas limites :** recherche par fournisseur/référence/montant ; filtre par fournisseur.
**Règle métier :** un avoir n'est pas une facture (exclu des KPI « à payer »/retards).

## TC-FIN-CPT-009 : KPI factures (compteurs et filtres)
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** Copro « Résidence Martin » avec factures variées.
**Étapes :**
1. Sur `/finance/factures`, lire le bandeau KPI : Factures (nombre), Total payé, En retard (montant échu), Cette semaine (échéances) → **Attendu :** valeurs cohérentes avec la liste.
2. Filtrer par KPI (ex. « En retard ») → **Attendu :** la liste ne montre que les factures non payées et en retard.
**Cas limites :** copro sans facture → KPI à 0, liste vide sans erreur.

## TC-FIN-CPT-010 : Boutons de workflow de la fiche détail = changement de statut SANS écriture (à isoler)
**Priorité :** P1
**Type :** Régression
**Préconditions / jeu de données :** Une facture sur sa fiche `/finance/factures/[id]`. Copro « Résidence Martin ».
**Étapes :**
1. Sur la fiche, cliquer le bouton de workflow (ex. « Mettre en paiement » puis « Marquer comme payée ») → **Attendu écran :** le statut change, le rail de workflow avance.
2. Vérifier le grand livre → **Attendu effet base :** AUCUNE nouvelle écriture comptable n'a été générée par ce bouton (seul le champ statut a bougé).
**Cas limites :** noter l'incohérence possible — une facture peut afficher « Payée » via ce bouton sans écriture D401/C512. À confirmer comme comportement attendu (raccourci d'état) ou à remonter comme risque métier.
**Règle métier :** la voie comptable réelle est la modale « Payer » de la liste (TC-005), pas ce bouton.

## TC-FIN-CPT-011 : Modifier / Supprimer (annuler) une facture
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Facture existante. Copro « Résidence Martin ».
**Étapes :**
1. Action « Modifier » → changer date/référence/montant → **Attendu :** mise à jour persistée (refresh confirme).
2. Action « Supprimer » → confirmer → **Attendu :** la facture disparaît de la liste (annulation en base, statut cancelled).
**Cas limites :** suppression d'une facture déjà comptabilisée/payée — vérifier le comportement (l'annulation comptable correcte est la contre-passation, pas la suppression silencieuse) ; remonter si une écriture posted reste orpheline.
**Règle métier :** grand livre immuable après comptabilisation (préférer contre-passation).

---

### B. Mouvements bancaires & rapprochement

## TC-FIN-CPT-020 : Import d'un relevé bancaire CSV
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Copro « Résidence Martin », période ouverte, un compte bancaire (512) configuré. Fichier CSV de relevé valide.
**Étapes :**
1. Sur `/finance/mouvements-bancaires`, passer en mode Workflow, onglet Import, charger le fichier CSV → **Attendu :** les mouvements sont importés et listés ; un récap de synchro indique le nombre importé.
2. Vérifier dans la table → **Attendu :** chaque ligne a date, libellé, montant signé (entrée +/sortie −), au bon compte (courant/travaux).
**Cas limites :** fichier vide / format invalide → message « Aucun mouvement trouvé… » ou « Erreur lors de l'import… » ; aucune ligne fantôme ajoutée.
**Règle métier :** import = alimentation des mouvements bruts (statut initial non rapproché).

## TC-FIN-CPT-021 : Idempotence de l'import (pas de doublons)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Même fichier CSV que TC-020, déjà importé une fois. Copro « Résidence Martin ».
**Étapes :**
1. Réimporter exactement le même fichier → **Attendu effet base :** les mouvements déjà présents ne sont PAS dupliqués (compteur « skipped » > 0 côté RPC `import_bank_movement`) ; seuls d'éventuels nouveaux mouvements sont ajoutés.
**Cas limites :** même fichier mais une ligne modifiée (montant/réf) = traitée comme nouvelle ; vérifier la règle de déduplication réelle (date+montant+réf/libellé).
**Règle métier :** idempotence de l'import bancaire.

## TC-FIN-CPT-022 : Rapprochement d'un mouvement avec un règlement déjà saisi
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Un mouvement bancaire non rapproché correspondant à un paiement copropriétaire OU un règlement fournisseur déjà enregistré. Copro « Résidence Martin ».
**Étapes :**
1. Sur `/finance/mouvements-bancaires`, ouvrir le rapprochement sur le mouvement (ou onglet Rapprochement en mode Workflow) ; sélectionner la suggestion correspondante, valider → **Attendu écran :** le mouvement passe de « non rapproché » à « rapproché » (matched).
2. Recharger → **Attendu effet base :** le statut « matched » persiste (appel réel `reconcile_bank_movement`).
**Cas limites :** rapprocher deux fois le même mouvement ; montant du mouvement ≠ montant de la cible (rapprochement partiel) ; aucune suggestion → rapprochement manuel.
**Règle métier :** rapprochement = pointage (statut unmatched → matched), pas de re-création d'écriture (le 512 a déjà bougé à la saisie).

## TC-FIN-CPT-023 : Filtres et indicateurs des mouvements (non catégorisés / non rapprochés / écart de soldes)
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** Copro « Résidence Martin » avec mouvements mêlant rapprochés et non rapprochés.
**Étapes :**
1. Lire les bandeaux d'alerte (non catégorisés, non rapprochés, écart de soldes) → **Attendu :** compteurs cohérents.
2. Cliquer « Filtrer les non rapprochés » → **Attendu :** la table ne montre que ces mouvements.
3. Basculer compte courant / compte travaux → **Attendu :** seuls les mouvements du compte actif s'affichent ; solde, total entrées/sorties recalculés.
**Cas limites :** copro à un seul compte ; aucun mouvement → progression 100 %.

## TC-FIN-CPT-024 : Modale « Catégoriser » d'un mouvement (anomalie connue à vérifier)
**Priorité :** P1
**Type :** Régression
**Préconditions / jeu de données :** Un mouvement non rapproché. Copro « Résidence Martin ».
**Étapes :**
1. Ouvrir « Catégoriser » sur un mouvement, choisir un compte, enregistrer → **Attendu :** la catégorisation directe par compte ne persiste PAS côté serveur (`categorizeBankMovement` est neutralisée : colonnes de catégorie supprimées en base, migration 0014). L'état local peut sembler changer mais rien n'est sauvegardé.
2. Recharger la page → **Attendu :** le mouvement réapparaît non catégorisé.
**Cas limites :** confirmer le message d'erreur explicite plutôt qu'un faux succès ; documenter que la voie réelle de « catégorisation » est le rapprochement (TC-022).
**Règle métier :** un mouvement se relie à un objet métier déjà saisi (paiement/règlement), il ne se catégorise pas par UPDATE direct.

## TC-FIN-CPT-025 : Bouton « Synchroniser » (simulation, à signaler)
**Priorité :** P3
**Type :** Régression
**Préconditions / jeu de données :** `/finance/mouvements-bancaires`, n'importe quelle copro.
**Étapes :**
1. Cliquer « Synchroniser » → **Attendu :** animation de chargement puis statut connecté (avec ~10 % d'« erreur de connexion » aléatoire) — comportement SIMULÉ (pas de vraie connexion bancaire ; `handleRefresh` est un mock à délai et tirage aléatoire).
**Cas limites :** la « nouvelle synchro » peut annoncer des « nouveaux mouvements » fictifs sans rien ajouter à la table. À remonter comme placeholder (pas une vraie intégration bancaire vision lecture seule).
**Règle métier :** la connexion bancaire en lecture seule (vision API) n'est pas encore branchée ici.

---

### C. Comptabilité : grand livre, balance, journaux, annexes, clôture, contre-passation

## TC-FIN-CPT-030 : Grand livre — affichage et équilibre
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Boucle d'or « Le Clos Saint-Michel » (id 22222222…) OU « Résidence Martin » avec écritures.
**Étapes :**
1. Sur `/finance/comptabilite` onglet Grand livre (vue par compte) → **Attendu :** liste des écritures comptabilisées (posted) de la période sélectionnée ; KPI Total Débit / Total Crédit affichés.
2. Lire le KPI « État balance » → **Attendu :** « Équilibrée » (Σ débit = Σ crédit, écart = 0).
3. Basculer en vue chronologique / par pièce → **Attendu :** mêmes écritures regroupées différemment ; chaque opération a un numéro de pièce dérivé de la source.
**Cas limites :** filtres compte / date / recherche ; copro sans écriture → état vide propre.
**Règle métier :** balance équilibrée Σdébit=Σcrédit ; le grand livre n'affiche que le posted.

## TC-FIN-CPT-031 : Sélecteur de période (exercices multiples)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro ayant au moins 2 exercices (un ouvert, un clos).
**Étapes :**
1. Sur `/finance/comptabilite`, changer la période via le sélecteur → **Attendu :** grand livre, balance et annexes se recalculent pour la période choisie ; le bandeau de période et la pastille de statut (vert ouvert / gris clos) changent.
2. Sélectionner une période close → **Attendu :** le bouton « Clôturer » disparaît (lecture seule), mais la contre-passation reste possible si une autre période est ouverte (voir TC-035).
**Cas limites :** auto-sélection de la période la plus récente avec écritures au chargement.

## TC-FIN-CPT-032 : Balance des comptes (contrôle d'équilibre)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Boucle d'or « Le Clos Saint-Michel » ou « Résidence Martin ».
**Étapes :**
1. Onglet Balance (ou `/documents/balance`) → **Attendu :** une ligne par compte avec débit/crédit/solde ; total général affiché.
2. Vérifier l'indicateur d'équilibre → **Attendu :** « Équilibrée », écart = 0.
**Cas limites :** masquer les soldes nuls ; filtre par classe ; recherche par code/nom de compte ; comparaison N-1 si activée.
**Règle métier :** Σdébit = Σcrédit sur toute la balance.

## TC-FIN-CPT-033 : Livre comptable / Compte de gestion (plan complet avec soldes)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » avec écritures.
**Étapes :**
1. Onglet « Livre comptable » → **Attendu :** TOUT le plan comptable de la copro, y compris les comptes à solde 0 (utile pour vérifier la complétude du plan).
2. Onglet « Compte de gestion » → **Attendu :** présentation charges/produits cohérente avec le grand livre.
**Cas limites :** comptes sans mouvement affichés à 0.

## TC-FIN-CPT-034 : Clôture d'exercice
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec exercice OUVERT et balance équilibrée (ex. copro de harnais via `create_test_copro_seeded`, pour ne pas figer une copro de référence). Compte démo.
**Étapes :**
1. Sur `/finance/comptabilite`, cliquer « Clôturer <année> » → la modale de clôture affiche débit/crédit/écart/état balance → confirmer → **Attendu :** message « Clôture … validée avec succès » ; la période passe au statut close (pastille grise, bouton Clôturer disparaît) ; appel réel `close_period`.
2. Vérifier qu'un exercice suivant peut s'ouvrir et que les à-nouveaux/résultats sont reportés (selon le moteur).
**Cas limites :** clôture refusée si balance déséquilibrée (« Le grand livre présente un déséquilibre comptable ») ; refusée s'il reste des mouvements bancaires non catégorisés ; aucune période ouverte → message dédié.
**Règle métier :** on ne clôture qu'un grand livre équilibré ; après clôture, immuabilité (corrections par contre-passation/réouverture selon droits).

## TC-FIN-CPT-035 : Contre-passation d'une écriture (annulation comptable)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Une écriture comptabilisée non régénérable (ex. une facture comptabilisée), une période OUVERTE existante. Copro de harnais conseillée.
**Étapes :**
1. Onglet Grand livre, ouvrir le détail d'une opération éligible → bouton de contre-passation disponible → saisir un motif, confirmer → **Attendu écran :** modale se ferme, grand livre rafraîchi.
2. Vérifier le grand livre → **Attendu effet base :** une écriture INVERSE (extourne) est créée dans la période ouverte, du même montant et de sens opposé ; l'écriture d'origine reste présente (immuabilité) et marquée extournée ; appel réel `reverse_ledger_transaction`.
**Cas limites :** bouton indisponible si : opération déjà extournée, opération qui EST une extourne, écriture régénérable (à-nouveau / clôture / onboarding / affectation du résultat), ou aucune période ouverte → vérifier que le bouton est bien grisé/absent dans ces cas.
**Règle métier :** grand livre immuable → on corrige par contre-passation, jamais par effacement.

## TC-FIN-CPT-036 : Export comptable CSV (grand livre / balance / journaux)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » avec écritures.
**Étapes :**
1. Sur `/finance/comptabilite`, menu Export CSV → choisir Grand livre, puis Balance, puis Journaux → **Attendu :** trois fichiers CSV téléchargés, nommés avec copro/exercice/année, contenant les données affichées.
**Cas limites :** export désactivé quand 0 écriture ; encodage des montants en français correct.
**Règle métier :** finalité légale (transmission CS / expert, art. 18-1).

## TC-FIN-CPT-037 : Annexes comptables — vue simplifiée
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », période avec données (budget, travaux, impayés…).
**Étapes :**
1. Sur `/finance/comptabilite` onglets Annexe 1→5, OU `/documents/annexes` vue « simplifiée » → **Attendu :** cartes KPI (Trésorerie, Budget consommé %, Travaux en cours, Impayés, Provisions travaux, Dettes fournisseurs) cohérentes avec le grand livre.
**Cas limites :** copro sans données → valeurs à 0, pas d'erreur.
**Règle métier :** annexes obligatoires (décret 2005-240).

## TC-FIN-CPT-038 : Annexes comptables — documents officiels (5 annexes légales)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », période close ou ouverte avec écritures, budget et clés de répartition renseignés.
**Étapes :**
1. Sur `/documents/annexes` onglet « Documents officiels » (ou onglets Annexe N de la comptabilité) → **Attendu :** Annexe 1 (état financier) + complément détail copros, Annexe 2 (gestion courante), Annexe 3 (ventilation par clés de répartition), Annexe 4 (travaux terminés), Annexe 5 (travaux non clôturés) ; libellés conformes.
2. Recouper Annexe 1 avec la balance → **Attendu :** trésorerie / dettes / provisions cohérentes avec les comptes 512 / 401 / 105.
**Cas limites :** annexe 4/5 vides si aucun travaux ; vérifier que les libellés exacts correspondent (3 = ventilation clés, 4 = travaux terminés, 5 = travaux non clôturés) ; PDF de convocation (annexe 1) connu pour être cassé → ne pas envoyer, à signaler.
**Règle métier :** 5 annexes légales, libellés et cohérences croisées imposés par le décret 2005-240.

## TC-FIN-CPT-039 : Relevé général des dépenses (charges classe 6 / produits classe 7)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » avec charges saisies.
**Étapes :**
1. Sur `/documents/expenses` → **Attendu :** charges groupées par compte (classe 6) avec total ; produits (classe 7) si présents ; section Résultat (produits − charges) ; récap TVA.
2. Recouper le total charges avec le grand livre classe 6 → **Attendu :** montants cohérents.
**Cas limites :** bandeau d'avertissement « données potentiellement incomplètes » si peu de charges ; **noter** que la colonne comparatif N-1 est codée en dur (valeurs fictives) → ne pas considérer le N-1 comme fiable.
**Règle métier :** relevé des charges de l'exercice (classe 6) ; TVA non récupérable en copro.

## TC-FIN-CPT-040 : Grand livre (vue Documents arborescente) et liste des écritures
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » avec écritures.
**Étapes :**
1. Sur `/documents/ledger` → **Attendu :** arbre par classe comptable avec solde par classe ; bouton « Liste des écritures » ouvre la modale détaillée (recherche, filtre par compte, dates, tri, regroupement).
2. `/documents/ledger/full` → **Attendu :** vue étendue cohérente.
**Cas limites :** copro sans écriture → « Aucune écriture comptable » ; bandeau « généré depuis Supabase ».

---

### D. Opérations à apurer (solde travaux compte 12 → 450-2)

## TC-FIN-CPT-050 : Lister les soldes travaux en attente d'apurement
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec un solde sur le compte 12 (travaux) reporté d'un exercice (boucle d'or ou harnais seedé). 
**Étapes :**
1. Sur `/finance/operations-a-apurer` → **Attendu :** KPI (nombre d'opérations, solde travaux total, plus ancien report) ; tableau listant chaque solde 12 par exercice avec son ancienneté ; note explicative présente.
2. Copro sans solde 12 → **Attendu :** état « Aucune opération à apurer ».
**Cas limites :** ancienneté affichée (mois / an(s)) correcte.
**Règle métier :** le résultat des travaux/opérations exceptionnelles reste sur le 12 et se reporte jusqu'à la clôture définitive de l'opération.

## TC-FIN-CPT-051 : Apurer un solde travaux (affectation au 450-2)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec un solde 12 à apurer, période ouverte. Harnais conseillé (écriture irréversible côté boucle d'or).
**Étapes :**
1. Sur `/finance/operations-a-apurer`, cliquer « Apurer » sur une ligne → confirmer dans la modale → **Attendu écran :** la ligne disparaît de la liste après succès ; KPI mis à jour.
2. Vérifier le grand livre → **Attendu effet base :** écriture d'affectation du solde 12 vers les comptes copropriétaires **450-2** par quote-part (appel réel `settle_works_balance`).
**Cas limites :** apurement à ne faire qu'à la clôture définitive de l'opération (l'écran le rappelle) ; erreur RPC → la ligne reste et le message d'erreur s'affiche ; ne pas apurer deux fois le même solde.
**Règle métier :** apurement compte 12 → 450-2 (affectation aux copropriétaires) à la clôture définitive ; quote-part par lot (règle lot-centric).

---

### E. Transferts inter-comptes

## TC-FIN-CPT-060 : Virement / transfert (écran NON fonctionnel — vérification de l'état réel)
**Priorité :** P3
**Type :** Régression
**Préconditions / jeu de données :** N'importe quelle copro.
**Étapes :**
1. Accéder à `/finance/transfer` (URL directe) → remplir bénéficiaire, IBAN, montant, libellé → cliquer « Effectuer le virement » → **Attendu :** AUCUN effet (pas de persistance, pas d'écriture, pas de message de succès) — le bouton n'a pas de handler. Confirmer que l'écran est un stub.
**Cas limites :** à remonter : soit retirer l'écran, soit l'implémenter (transfert courant ↔ travaux : D512-travaux / C512-courant). Ne pas le présenter comme fonctionnel à un utilisateur.
**Règle métier :** un vrai transfert inter-comptes doit générer une écriture banque à banque ; non implémenté à ce jour.

---

## Jeu de données requis (rappel)

- **« Résidence Martin »** (copro la plus complète : 6 copropriétaires, 7 lots, clés « Charges générales » + « Batiment A » + « Batiment B », 1000 tantièmes) : copro principale pour factures, banque, annexes, dépenses. Exiger une **période comptable ouverte**, au moins **un fournisseur** et un **compte de charge 6xx** pour les TC factures.
- **Boucle d'or « Le Clos Saint-Michel »** (id 22222222…, exercice 2026 ouvert) : référence finance pour grand livre / balance / annexes en LECTURE seulement (ne pas y créer d'écritures destructrices : immuabilité du grand livre).
- **« Residence Paris Ivry »** (partielle, clé générale à 0) : utile pour les cas de préconditions manquantes (TC-002) et états vides.
- **`create_test_copro_seeded()`** : créer une copro jetable « HARNESS » pour tous les cas qui ÉCRIVENT de façon irréversible (clôture TC-034, contre-passation TC-035, apurement TC-051, paiement/avoir). Une copro fraîche part à 0 écart ; tout écart résiduel sur la boucle d'or (+0,16 / −423 / +30) est un artefact historique, pas un bug.
- **Fichier CSV de relevé bancaire** valide pour TC-020/021 (import + idempotence) ; un même fichier réutilisé pour prouver la non-duplication.
- Toujours **sélectionner la copro depuis `/portefeuille`** avant d'entrer dans Finance ; sans copro active, les écrans affichent un état de chargement.
