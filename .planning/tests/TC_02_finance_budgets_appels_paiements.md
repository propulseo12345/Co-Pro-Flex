# Plan de test — Finance : budgets, appels de fonds, paiements/encaissements, impayés, relances, relevés

> Application lancée en local (`npm run dev`) pointant sur le cloud live Supabase `qqfqrcolzmcbsvfaumiq`.
> Compte unique : **lyes.triki@coproflex.fr / password123** (bouton « Connexion démo », nom affiché « Jean Dupont »).
> On choisit une copro depuis **/portefeuille** (cliquer une carte) avant tout test finance.

---

## Périmètre & écrans canoniques

Ce plan couvre la chaîne financière « argent appelé → encaissé → impayé → relancé », telle qu'elle est réellement câblée aujourd'hui. Une vérification du code (lecture seule) a montré une réalité importante à connaître avant de tester :

**La génération d'un appel de fonds depuis l'interface n'est PAS branchée à un bouton fonctionnel.** Les trois portes d'entrée visibles affichent toutes un message « bientôt disponible » ou sont grisées :
- Page Appels de fonds → bouton « Générer les appels » : **grisé/désactivé** (le wizard appelle une fonction serveur non livrée pour l'appel exceptionnel).
- Page détail d'un budget → bouton « Générer appels de fonds » : ouvre une fenêtre qui affiche une simple alerte « sera disponible prochainement ».
- Onglet Travaux des budgets → « Générer le prochain appel » : ne fait rien (TODO).

En clair : pour tester la consultation d'appels, le paiement, les impayés et les relances, **il faut une copro qui possède déjà des appels** (par exemple « Résidence Martin », la boucle d'or « Le Clos Saint-Michel », ou une copro générée via `create_test_copro_seeded`). La création d'appel reste néanmoins testée ici au niveau du **moteur serveur** (la fonction `post_budget_call_for_funds` est, elle, bien la route canonique : c'est elle qu'appelle le code lorsque le wizard sera réactivé), mais en marquant clairement que le déclencheur d'interface est aujourd'hui hors service.

Écrans canoniques retenus :

| Domaine | Route / écran | Rôle réel |
|---|---|---|
| Budgets — liste | `/finance/budgets` (onglets Fonctionnement / Travaux / ALUR) | Consultation + création d'un brouillon de budget |
| Budget — détail | `/finance/budgets/[id]` | Édition des postes, lien à une AG |
| Budget — wizard validation | `/finance/budgets/validation` | Assistant 3 étapes : crée un **brouillon de budget** (PAS les appels) |
| Appels de fonds — vue | `/finance/appels-fonds` (onglets Vue globale / Courant / Travaux) | Suivi par exercice : appelé / encaissé / impayés / taux |
| Appel — détail | `/finance/appels-fonds/[callId]` | Lignes par lot, **enregistrement d'un paiement** (modale), relance par lot |
| Impayés | `/finance/unpaid` | Liste des lots en retard (lecture + boutons de relance factices) |
| Relances | `/finance/unpaid/reminders` | Relances réelles : manuelle (1 lot) et campagne globale, historique |
| Relevés individuels | `/finance/releves-individuels` | Relevé de charges par copropriétaire (export HTML/ZIP) — **hors menu** |

**Le paiement réel se fait depuis le détail d'un appel** (`/finance/appels-fonds/[callId]`, bouton « Enregistrer un paiement »), via la fonction serveur `record_payment` → `post_owner_payment` (D512 / C450-x). C'est le seul parcours d'encaissement câblé de bout en bout côté collectif.

---

## Écrans morts / doublons (NE PAS tester)

- **Bouton « Générer les appels »** sur `/finance/appels-fonds` : **désactivé** (grisé). Le wizard `CreateCallWizard` derrière est entièrement codé et branché à la bonne fonction serveur, mais inaccessible. Ne pas écrire de cas de test « happy path » dessus tant qu'il n'est pas réactivé.
- **`/finance/budget-current`** et **`/finance/budget-works`** : vues en **lecture seule** dérivées du budget (consommation budget/réalisé). Doublons d'affichage des onglets de `/finance/budgets`. Pas dans le menu. Ne pas tester ici.
- **Bouton « Générer appels de fonds »** sur `/finance/budgets/[id]` (via `TransformBudgetModal`) : affiche une **alerte « bientôt disponible »**, aucune écriture. Mort.
- **« Générer le prochain appel »** (onglet Travaux, `handleGenerateProchainAppel`) : TODO vide, ne fait rien. Mort.
- **Boutons de relance de `/finance/unpaid`** (icônes téléphone et enveloppe) : `alert()` factices (« sera disponible dans une prochaine version »). Les **vraies** relances sont sur `/finance/unpaid/reminders`. Ne tester sur `/finance/unpaid` que l'affichage.
- **Bouton « Export » / « Export PDF »** des pages Budgets et Appels de fonds : `TODO`, sans effet. Mort.
- **`post_call_for_funds`** : fonction serveur **inexistante** (ancien chemin cassé). Remplacée par `post_budget_call_for_funds`. Ne jamais l'attendre.
- **`createSupplierInvoiceDirect`, `categorizeBankMovement`** : hors périmètre (factures / banque), et la seconde renvoie volontairement une erreur (colonnes supprimées).
- **Relevés individuels** : route vivante mais **absente du menu** finance ; accessible seulement par URL directe. Testée ici à titre informatif (priorité basse).

---

## Cas de test

### A. Budgets

## TC-FIN-BUD-001 : Créer un brouillon de budget de fonctionnement (modale)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro « Résidence Martin » sélectionnée ; compte démo (gestionnaire).
**Étapes :**
1. Aller sur `/finance/budgets`, onglet « Fonctionnement », cliquer « Créer un budget » → **Attendu :** une modale de création s'ouvre (année, postes).
2. Renseigner l'année N+1, ajouter au moins un poste avec un montant, valider → **Attendu :** le budget apparaît dans la liste avec le statut « Brouillon » ; en base, une ligne `budgets` est créée (type `current`, `period_id` de l'exercice correspondant).
3. Cliquer sur le budget créé → **Attendu :** ouverture de `/finance/budgets/[id]` affichant les postes saisis et le montant total.
**Cas limites :** année sans exercice comptable existant → message « Aucune période comptable trouvée pour l'année … » ; montant de poste vide ou négatif → refus / total incohérent à signaler.
**Règle métier :** un budget = prévisionnel voté en AG (décret 2005-240) ; ici on ne crée qu'un brouillon, le vote vient ensuite.

## TC-FIN-BUD-002 : Assistant de validation de budget — création du brouillon (3 étapes)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro « Résidence Martin » ; un exercice comptable ouvert pour l'année visée.
**Étapes :**
1. Aller sur `/finance/budgets/validation` → **Attendu :** étape « Configuration » (montant total, dates, mode d'échéancier, clé de répartition).
2. Saisir un montant, des dates cohérentes, choisir « Trimestriel » et « Charges générales », cliquer « Aperçu » → **Attendu :** étape « Aperçu » affichant la résolution générée automatiquement et l'échéancier.
3. Cliquer « Valider » → **Attendu :** étape « Succès » ; en base, un **budget brouillon** est créé (notes = « Échéancier: TRIMESTRIEL, Clé: CHARGES_GENERALES »). **Aucun appel de fonds n'est généré à cette étape** (vérifier que `/finance/appels-fonds` ne montre pas de nouvel appel).
**Cas limites :** dates incohérentes (fin avant début) ou montant ≤ 0 → l'étape Aperçu doit refuser avec la liste des erreurs ; aucun exercice pour l'année → alerte « Aucun exercice comptable trouvé … ».
**Règle métier :** la validation prépare la résolution d'AG ; la transformation en appels reste un acte séparé (voir section B).

## TC-FIN-BUD-003 : Éditer les postes d'un budget brouillon
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Un budget en statut « Brouillon » (ex. issu de TC-FIN-BUD-001).
**Étapes :**
1. Ouvrir `/finance/budgets/[id]`, cliquer « Modifier » → **Attendu :** éditeur de postes activé.
2. Modifier un montant, ajouter un poste, « Enregistrer » → **Attendu :** total recalculé, message de confirmation ; valeurs persistées au rechargement.
**Cas limites :** budget déjà approuvé en AG → bandeau d'avertissement « ce budget a été approuvé… » mais édition possible ; annuler sans enregistrer ne doit rien modifier.
**Règle métier :** un budget approuvé ne devrait pas être modifié sans nouvelle approbation (avertissement attendu).

## TC-FIN-BUD-004 : Lier un budget à une résolution d'AG
**Priorité :** P2
**Type :** Intégration
**Préconditions / jeu de données :** Budget brouillon avec postes ; une AG comportant une résolution d'approbation de budget.
**Étapes :**
1. Sur `/finance/budgets/[id]`, cliquer « Lier à une AG » → **Attendu :** modale listant les résolutions AG disponibles.
2. Choisir une résolution, valider → **Attendu :** le budget passe en « En attente d'approbation » ; un encart « Résolution AG : Liée » apparaît dans le résumé.
**Cas limites :** aucune résolution disponible → liste vide / message ; budget déjà lié → comportement à vérifier (re-liaison interdite ou remplaçante).
**Règle métier :** l'approbation du budget par l'AG le fait passer « Approuvé » et ouvre la génération d'appels.

## TC-FIN-BUD-005 : Supprimer un budget brouillon
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Budget en statut « Brouillon » sans appel rattaché.
**Étapes :**
1. Sur `/finance/budgets` (ou détail), déclencher la suppression → **Attendu :** confirmation puis disparition de la liste ; ligne supprimée en base.
**Cas limites :** budget approuvé / déjà transformé en appels → suppression doit être refusée ou protégée (ne pas casser les écritures liées).
**Règle métier :** on ne supprime pas un budget ayant généré des écritures au grand livre (intégrité comptable).

---

### B. Appels de fonds — génération (moteur serveur)

> Rappel : aucun bouton d'interface fonctionnel ne génère un appel aujourd'hui. Ces cas valident le **moteur** `post_budget_call_for_funds` (route canonique) et l'état attendu côté écran une fois l'appel présent. Ils s'exécutent soit via réactivation temporaire du wizard, soit par appel direct de la fonction (SQL/console), soit en s'appuyant sur des appels déjà seedés.

## TC-FIN-APL-001 : Générer un appel agrégé à partir d'un budget voté (happy path moteur)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Copro « Résidence Martin » (clés complètes, 7 lots, 1000 tantièmes) ; un budget courant **voté** ; un exercice ouvert.
**Étapes :**
1. Déclencher `post_budget_call_for_funds` (copro, exercice, budget, libellé, échéance, fraction = 1) → **Attendu :** succès ; un appel apparaît dans `/finance/appels-fonds` avec une **ligne par (lot × clé)**.
2. Vérifier le grand livre (`/finance/comptabilite`) → **Attendu :** une écriture équilibrée **Débit 450-1 par lot (avec `lot_id`)** / **Crédit 701** (budget courant), du montant total appelé.
3. Sur le détail de l'appel, vérifier la somme « Appelé » = montant du budget × fraction ; « Encaissé » = 0 ; « Restant » = total.
**Cas limites :** budget non voté / type ALUR → crédit 105 attendu ; travaux → crédit 702 ; arrondis : la somme des lignes doit retomber EXACTEMENT sur le total (ajustement du dernier lot).
**Règle métier :** un appel = fraction d'un budget VOTÉ ; écriture D450-x / C701 (courant), C702 (travaux), C105 (ALUR).

## TC-FIN-APL-002 : Refus si une clé de répartition est incomplète
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Residence Paris Ivry » (clé générale à 0 / incomplète) ou copro dont une clé ne couvre pas 100 % des tantièmes.
**Étapes :**
1. Tenter de générer un appel sur cette clé → **Attendu :** **refus explicite** (contrôle `repartition_key_is_complete`), aucun appel créé, aucune écriture.
**Cas limites :** clé à 0 partout ; somme des poids ≠ total attendu ; lot non rattaché à la clé.
**Règle métier :** une clé doit couvrir l'intégralité des lots/tantièmes concernés sinon l'appel ne peut être ventilé.

## TC-FIN-APL-003 : Appel fractionné en plusieurs échéances (trimestriel)
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Copro « Résidence Martin » ; budget courant voté.
**Étapes :**
1. Générer 4 échéances (installment_index 1→4, installment_count 4), avec 4 dates croissantes → **Attendu :** 4 appels créés, libellés « … — 1/4 », « … — 2/4 », etc.
2. Vérifier que la **somme des 4 échéances = montant total du budget** (au centime près) et que chaque appel a sa propre écriture D450-x/C701.
**Cas limites :** dates non croissantes → refus côté assistant (validation) ; somme des montants ≠ total → refus ; échec sur l'échéance 3 → message « X/4 créés » (création partielle à signaler).
**Règle métier :** chaque échéance reste une fraction du même budget voté.

## TC-FIN-APL-004 : Idempotence — re-générer le même appel ne double pas l'écriture
**Priorité :** P1
**Type :** Régression
**Préconditions / jeu de données :** Un appel déjà généré pour un budget/exercice/échéance donnés.
**Étapes :**
1. Relancer la génération avec les mêmes paramètres → **Attendu :** pas de doublon d'appel ni d'écriture (rejet ou rejeu idempotent), grand livre inchangé.
**Cas limites :** double-clic, double soumission réseau.
**Règle métier :** une même fraction de budget ne doit être appelée qu'une fois (sinon double charge aux copropriétaires).

## TC-FIN-APL-005 : Émettre un appel (brouillon → émis)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Un appel en statut « brouillon ».
**Étapes :**
1. Déclencher l'émission (`updateCallStatus(..., 'issued')`) → **Attendu :** statut « Émis », date d'émission renseignée.
**Cas limites :** émettre un appel déjà émis / annulé → ne pas régresser le statut.
**Règle métier :** l'émission rend l'appel exigible auprès des copropriétaires.

## TC-FIN-APL-006 : Annuler un appel ÉMIS → contre-passation au grand livre
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Un appel **émis sans aucun paiement imputé** sur une copro avec exercice ouvert (la boucle d'or « Le Clos Saint-Michel » est idéale pour le contrôle GL).
**Étapes :**
1. Lancer `cancel_call_for_funds(callId, reason)` → **Attendu :** l'appel passe « Annulé » ; une **écriture inverse** (extourne) est créée dans la période ouverte (D701 / C450-x), le grand livre reste équilibré (l'original n'est jamais effacé).
2. Vérifier que le solde du lot revient à son état d'avant l'appel.
**Cas limites :** appel **avec paiements imputés** → **refus strict** (« désimputer d'abord ») ; appel **en brouillon** → simple bascule de statut, PAS de contre-passation ; aucune période ouverte → refus.
**Règle métier :** le grand livre est immuable : on annule par écriture inverse, jamais par suppression.

---

### C. Paiements / encaissements

## TC-FIN-PAY-001 : Enregistrer un paiement total d'un lot (happy path)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Un appel émis avec des lignes impayées (copro « Résidence Martin » ou boucle d'or).
**Étapes :**
1. Ouvrir `/finance/appels-fonds/[callId]`, cliquer « Enregistrer un paiement » → **Attendu :** modale ; le lot par défaut est le premier ayant un restant dû, montant pré-rempli = restant dû.
2. Garder le montant = restant, mode « Virement », valider → **Attendu :** message « Paiement enregistré et comptabilisé au grand livre » ; au rechargement, la ligne du lot passe « Payé », « Encaissé » augmente, « Restant » diminue d'autant.
3. Vérifier le grand livre → **Attendu :** écriture **Débit 512 (banque) / Crédit 450-x (le lot)** du montant payé.
**Cas limites :** montant à 0 ou négatif → refus de validation ; date vide → refus ; lot non sélectionné → refus.
**Règle métier :** encaissement = D512 / C450-x ; pointage, pas re-création d'écriture d'appel.

## TC-FIN-PAY-002 : Paiement partiel
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Appel émis, lot avec restant dû (ex. 300 €).
**Étapes :**
1. Saisir un montant **inférieur** au restant (ex. 100 €), valider → **Attendu :** ligne du lot en « Partiel », restant = 200 € ; écriture D512/C450-x de 100 €.
**Cas limites :** plusieurs paiements partiels successifs jusqu'à solder le lot (statut bascule « Payé » au dernier).
**Règle métier :** imputation FIFO sur les échéances les plus anciennes de la nature.

## TC-FIN-PAY-003 : Trop-perçu → avance en compte 450-3
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Lot avec restant dû modeste (ex. 150 €).
**Étapes :**
1. Saisir un montant **supérieur** au restant (ex. 250 €) → **Attendu :** un encart informatif prévient « le trop-perçu sera porté en avance (450-3) » (n'empêche pas la validation).
2. Valider → **Attendu :** le restant dû tombe à 0 ; les 100 € excédentaires sont portés en **avance sur le compte 450-3** du lot ; au rechargement, l'« Avance disponible sur ce lot » reflète +100 €.
3. Grand livre → **Attendu :** D512 du total ; C450-x pour la part imputée + C450-3 pour l'avance.
**Cas limites :** montant très supérieur (tout en avance) ; vérifier que l'avance reste visible et réutilisable sur l'appel suivant.
**Règle métier :** trop-perçu = avance (450-3), jamais perdu (art. 1342-10 et règles d'imputation).

## TC-FIN-PAY-004 : Idempotence du paiement (double-clic / retry)
**Priorité :** P0
**Type :** Régression
**Préconditions / jeu de données :** Appel émis, lot avec restant dû.
**Étapes :**
1. Ouvrir la modale de paiement (une clé d'idempotence est générée à l'ouverture), valider, puis re-cliquer rapidement « Enregistrer » avant fermeture (ou simuler un retry réseau) → **Attendu :** **un seul** paiement enregistré, **une seule** écriture au grand livre ; le second appel renvoie un « rejeu idempotent » sans nouvel encaissement.
**Cas limites :** rouvrir la modale (nouvelle clé) puis re-payer → là, deux paiements distincts sont attendus (clés différentes).
**Règle métier :** une `idempotency_key` par tentative évite le double encaissement.

## TC-FIN-PAY-005 : Cloisonnement par nature — imputation forcée « Travaux »
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Un lot ayant des impayés sur DEUX natures (courant ET travaux) — copro avec budget courant et budget travaux appelés.
**Étapes :**
1. Dans la modale, choisir « Imputer sur la nature : Travaux », saisir un montant, valider → **Attendu :** l'encaissement s'impute uniquement sur les appels **travaux** (FIFO intra-travaux), le solde **courant** reste inchangé ; écriture C450-2 (ou compte travaux) et non 450-1.
**Cas limites :** nature « ALUR » → ne doit s'imputer que si explicitement choisie (jamais par défaut) ; montant > restant de la nature choisie → reliquat en avance 450-3.
**Règle métier :** cloisonnement strict courant / travaux / ALUR ; FIFO à l'intérieur de chaque nature ; l'ALUR n'est imputé que sur sélection explicite.

## TC-FIN-PAY-006 : Imputation par défaut (sans choix de nature) = courant puis travaux
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Lot avec impayés courant + travaux.
**Étapes :**
1. Laisser le champ nature sur « Cloisonné par défaut (courant puis travaux) », payer un montant couvrant le courant et débordant sur le travaux → **Attendu :** le courant est soldé en premier, le surplus impute le travaux ; l'ALUR n'est jamais touché automatiquement.
**Cas limites :** montant ne couvrant qu'une partie du courant → seul le courant (FIFO) bouge.
**Règle métier :** ordre légal d'imputation cloisonné, ALUR exclu par défaut.

---

### D. Impayés

## TC-FIN-IMP-001 : Affichage de la liste des impayés
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec au moins un appel émis non soldé (« Résidence Martin »).
**Étapes :**
1. Aller sur `/finance/unpaid` → **Attendu :** tableau des lots en retard (lot, propriétaire, montant dû, échéance la plus ancienne, retard en jours, nombre de lignes impayées) ; cartes de stats (total impayés, nombre de dossiers, contentieux > 90 j).
**Cas limites :** copro 100 % à jour → état vide « Aucun impayé. Tous les copropriétaires sont à jour » ; montant total = somme cohérente des lignes.
**Règle métier :** un impayé = ligne d'appel exigible non encaissée.

## TC-FIN-IMP-002 : Badges de gravité selon le retard
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** Lots avec retards variés (< 30 j, 30-60 j, 60-90 j, > 90 j).
**Étapes :**
1. Observer la colonne « Statut » → **Attendu :** « En retard » (< 30 j), « 1ère relance » (> 30 j), « 2ème relance » (> 60 j), « Contentieux » (> 90 j) ; les lignes > 90 j sont visuellement distinguées.
**Cas limites :** exactement 30 / 60 / 90 jours (bornes).
**Règle métier :** seuils de relance progressifs (cadrage relances copro).

## TC-FIN-IMP-003 : Exclusion des copros en reprise de mandat (onboarding)
**Priorité :** P1
**Type :** Régression
**Préconditions / jeu de données :** Une copro en cours d'onboarding (soldes d'ouverture, sans cycle d'appels réel).
**Étapes :**
1. Ouvrir `/finance/unpaid` sur cette copro → **Attendu :** les « impayés » issus uniquement des à-nouveaux d'ouverture **ne remontent pas** comme dossiers de relance (la vue exclut les copros en onboarding).
**Cas limites :** copro mixte (onboarding clôturé + vrais appels) → seuls les vrais impayés remontent.
**Règle métier :** les impayés excluent les copros en onboarding (pas de relance sur des soldes repris).

## TC-FIN-IMP-004 : Boutons de relance de la page Impayés = factices (à NE PAS confondre)
**Priorité :** P3
**Type :** UI
**Préconditions / jeu de données :** Copro avec impayés ; rôle gestionnaire.
**Étapes :**
1. Sur `/finance/unpaid`, cliquer l'icône enveloppe d'un lot → **Attendu :** une boîte de confirmation puis une **alerte** « L'envoi réel sera disponible dans une prochaine version » ; **aucune relance réelle** n'est créée (rien dans l'historique de `/finance/unpaid/reminders`).
2. Cliquer le bouton « Gérer les relances » → **Attendu :** redirection vers `/finance/unpaid/reminders` (le vrai outil).
**Cas limites :** ne pas attendre d'effet base ; ce cas documente un piège connu.
**Règle métier :** N/A (placeholder UI).

---

### E. Relances (parcours réel)

## TC-FIN-REL-001 : Relance manuelle d'un lot — aperçu (dry-run)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** `/finance/unpaid/reminders`, onglet « Impayés », un lot impayé **avec adresse e-mail** du propriétaire.
**Étapes :**
1. Cliquer « relancer » sur un lot → **Attendu :** modale de relance manuelle.
2. Lancer l'aperçu (dry-run) → **Attendu :** prévisualisation indiquant qu'un envoi aurait lieu et le niveau de relance calculé, **sans rien envoyer** (aucune ligne dans l'historique).
**Cas limites :** lot **sans e-mail** → la relance doit être signalée comme non éligible (le compteur « éligibles » ne le compte pas).
**Règle métier :** niveaux de relance progressifs selon le retard.

## TC-FIN-REL-002 : Relance manuelle d'un lot — envoi réel
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Lot impayé avec e-mail ; rôle gestionnaire.
**Étapes :**
1. Dans la modale, confirmer l'envoi (hors dry-run) → **Attendu :** succès ; la modale se ferme, les listes se rafraîchissent.
2. Onglet « Historique » → **Attendu :** une entrée de relance « envoyée » pour ce lot (niveau, date, destinataire) ; sur le détail de l'appel, le niveau de relance du lot est incrémenté.
**Cas limites :** envoyer une 2ᵉ relance au même lot → niveau qui progresse (1 → 2 → 3, plafonné à 3) ; relances en **pause** (réglages) → envoi bloqué avec message.
**Règle métier :** chaque relance laisse une trace horodatée ; phases successives (relance amiable → mise en demeure).

## TC-FIN-REL-003 : Campagne de relances global — aperçu puis exécution
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Copro avec plusieurs lots impayés éligibles.
**Étapes :**
1. Cliquer « Lancer les relances » (campagne) → **Attendu :** modale ; aperçu (dry-run) affichant un résumé (à traiter / envoyées / ignorées / échecs) **sans envoi**.
2. Confirmer l'exécution réelle → **Attendu :** résumé chiffré (envoyées / ignorées / échecs) ; l'historique se remplit ; les lots sans e-mail sont comptés « ignorés ».
**Cas limites :** relances en pause → réponse « paused » avec raison et date de reprise, aucun envoi ; aucun lot éligible → résumé tout à 0.
**Règle métier :** la campagne applique les règles de délai (`payment_reminder_rules`) et respecte la pause.

## TC-FIN-REL-004 : Filtrage de l'historique des relances
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Historique contenant plusieurs relances de statuts/niveaux/dates variés.
**Étapes :**
1. Onglet « Historique », filtrer par statut (envoyée / échec / annulée), par niveau, par plage de dates → **Attendu :** la liste se restreint correctement à chaque filtre, cumulables.
**Cas limites :** plage de dates vide ; date de fin incluse jusqu'à 23:59:59 ; combinaison de filtres ne renvoyant rien → liste vide propre.
**Règle métier :** N/A (consultation).

## TC-FIN-REL-005 : Relance par lot depuis le détail d'un appel
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** `/finance/appels-fonds/[callId]` avec des lots impayés.
**Étapes :**
1. Sur une ligne de lot impayée, ouvrir la relance → **Attendu :** modale affichant les phases (amiable, relance, mise en demeure) ; la phase active = première non envoyée.
2. Envoyer la phase active → **Attendu :** la phase passe « envoyée », trace en base (`payment_reminders`), le contenu pré-généré reprend le nom du copropriétaire, le lot, le montant et l'échéance.
**Cas limites :** lot déjà payé → pas de relance possible ; toutes les phases envoyées → plus d'action disponible.
**Règle métier :** progression amiable → contentieux, une phase à la fois.

---

### F. Relevés individuels (hors menu — priorité basse)

## TC-FIN-RLV-001 : Consulter les relevés individuels par exercice
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Accès direct à `/finance/releves-individuels` (route absente du menu) ; copro « Résidence Martin ».
**Étapes :**
1. Ouvrir la page, choisir l'exercice courant → **Attendu :** un relevé par copropriétaire (nom, lots, total appelé, total payé, solde) ; stats globales (nb débiteurs / créditeurs, solde global).
2. Ouvrir le détail d'un relevé → **Attendu :** modale détaillant appels et paiements du copropriétaire.
**Cas limites :** filtre solde (débiteur / créditeur / équilibré) ; recherche par nom / lot / e-mail ; exercice sans données → liste vide.
**Règle métier :** le solde par personne se dérive en sommant ses lots (règle lot-centric).

## TC-FIN-RLV-002 : Exporter des relevés (HTML / ZIP / impression)
**Priorité :** P3
**Type :** Fonctionnel
**Préconditions / jeu de données :** Relevés affichés (TC-FIN-RLV-001).
**Étapes :**
1. Sélectionner plusieurs relevés, cliquer « Exporter (n) » → **Attendu :** téléchargement d'une archive ZIP contenant un HTML par copropriétaire.
2. Depuis le détail d'un relevé, « Exporter » / « Imprimer » → **Attendu :** HTML téléchargé / fenêtre d'impression.
**Cas limites :** aucune sélection → bouton d'export désactivé ; export pendant un autre export → bouton verrouillé.
**Règle métier :** N/A (restitution documentaire).

---

### G. Cohérence transverse & contrôles grand livre

## TC-FIN-GL-001 : Cohérence relevé d'appel ↔ grand livre après un cycle complet
**Priorité :** P0
**Type :** Régression
**Préconditions / jeu de données :** Boucle d'or « Le Clos Saint-Michel » (exercice 2026 ouvert) — copro de référence pour le contrôle financier.
**Étapes :**
1. Générer un appel, encaisser un paiement total, puis vérifier sur `/finance/comptabilite` que **somme des débits = somme des crédits** (grand livre équilibré).
2. Vérifier que le « Restant » de l'appel = solde 450-x du lot correspondant.
**Cas limites :** après contre-passation d'un appel, le grand livre doit redevenir cohérent (cf. TC-FIN-APL-006) ; aucune écriture orpheline.
**Règle métier :** comptabilité d'engagement en partie double ; le grand livre est la source unique de vérité.

## TC-FIN-GL-002 : Le taux de recouvrement et les KPI reflètent les paiements
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec appels partiellement encaissés.
**Étapes :**
1. Sur `/finance/appels-fonds`, lire la bande KPI (Total appelé, Total encaissé, Impayés, Taux de recouvrement) → **Attendu :** valeurs cohérentes (encaissé + impayés ≈ appelé ; taux = encaissé / appelé, couleur verte ≥ 80 %, orange ≥ 50 %, rouge sinon).
2. Enregistrer un paiement supplémentaire, recharger → **Attendu :** encaissé et taux augmentent, impayés diminuent.
**Cas limites :** copro sans exercice → message « Aucun exercice comptable » ; exercice sans appel → KPI à 0.
**Règle métier :** N/A (indicateurs dérivés).

## TC-FIN-GL-003 : Isolation par copropriété (RLS)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Deux copros distinctes (« Résidence Martin » et « Residence Paris Ivry »).
**Étapes :**
1. Sélectionner « Résidence Martin », noter les appels/impayés affichés ; basculer sur « Residence Paris Ivry » via `/portefeuille` → **Attendu :** les données financières changent intégralement ; aucune ligne d'une copro ne fuit dans l'autre (budgets, appels, paiements, impayés, relevés tous filtrés par `copro_id` + RLS).
**Cas limites :** accès direct à une URL `/finance/appels-fonds/[callId]` d'un appel d'une AUTRE copro non accessible → « introuvable » / refus (RLS), pas d'affichage.
**Règle métier :** RLS ON+FORCE ; cloisonnement strict des données par copropriété.

---

## Jeu de données requis (rappel)

- **« Résidence Martin »** — copro la plus complète (6 copropriétaires, 7 lots, clés « Charges générales » + « Batiment A » + « Batiment B », 1000 tantièmes). Idéale pour budgets, appels multi-clés, impayés, relevés.
- **« Residence Paris Ivry »** — copro partielle (clé générale à 0) : sert au cas de **refus pour clé incomplète** (TC-FIN-APL-002) et à l'isolation RLS.
- **« Le Clos Saint-Michel »** (id `22222222…`) — boucle d'or finance, exercice 2026 ouvert : référence pour les **contrôles grand livre / contre-passation** (TC-FIN-APL-006, TC-FIN-GL-001).
- **`create_test_copro_seeded()`** — clone une copro jetable « HARNESS » avec un cycle complet : à utiliser pour les tests destructeurs (paiements, annulations, idempotence) sans polluer les copros de démonstration.
- **Pré-requis fréquents :** un **exercice comptable ouvert** pour l'année visée (sinon la création de budget et la génération d'appel échouent), et **des appels déjà présents** (seedés ou via le moteur serveur) pour tout ce qui touche paiements / impayés / relances, le déclencheur d'appel d'interface étant aujourd'hui hors service.
- **Pour les relances réelles :** des copropriétaires ayant une **adresse e-mail** renseignée, et la **pause des relances désactivée** dans les réglages.
