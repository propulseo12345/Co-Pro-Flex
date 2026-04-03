cc# Plan de Tests E2E — CoProFlex
**Date** : 30 mars 2026
**Rédacteur** : Équipe CoProFlex
**Destinataire** : Testeur

---

## Avant de commencer

### Prérequis techniques

1. Lancer l'application en local : `npm run dev`
2. Ouvrir le navigateur sur `http://localhost:3000`
3. Se connecter avec un compte de test ayant accès à une copropriété de démonstration
4. La copropriété de test doit contenir :
   - Au moins 3 copropriétaires avec tantièmes
   - Au moins 2 lots
   - Au moins 1 exercice comptable configuré
   - Au moins 1 prestataire dans l'annuaire

### Convention de notation

Pour chaque test, noter le résultat :
- ✅ **PASS** — le comportement attendu est observé
- ❌ **FAIL** — le comportement attendu n'est pas observé
- ⚠️ **PARTIEL** — le test passe partiellement (noter ce qui ne fonctionne pas)
- ⏭️ **SKIP** — test non réalisable (noter la raison)

---

## Module 1 — Assemblées Générales (AG)

### TEST AG-01 — Créer une AG ordinaire

**Actions à réaliser :**
1. Aller sur `/ag/new`
2. Remplir le champ **Titre** avec un nom de test (ex : "AG Test E2E")
3. Sélectionner le **Type** : Ordinaire
4. Choisir une **Date** dans 30 jours
5. Remplir le champ **Lieu** (ex : "Salle de réunion")
6. Cliquer sur **Créer / Suivant**

**Résultat attendu :**
- Redirection automatique vers la page de l'ordre du jour (`/ag/[id]/agenda`)
- L'AG apparaît avec le statut **Brouillon**

---

### TEST AG-02 — Pré-remplir les résolutions obligatoires

**Actions à réaliser :**
1. Depuis la page ordre du jour d'une AG en brouillon
2. Cliquer sur le bouton **"Pré-remplir les résolutions obligatoires"**
3. Attendre quelques secondes

**Résultat attendu :**
- Les résolutions légales obligatoires apparaissent dans la liste
- Au moins 1 résolution est visible

---

### TEST AG-03 — Ajouter une résolution personnalisée

**Actions à réaliser :**
1. Depuis la page ordre du jour
2. Cliquer sur **"Résolution personnalisée"**
3. Remplir le **Titre** (ex : "Résolution de test")
4. Remplir le **Texte** de la résolution
5. Cliquer sur **Ajouter**

**Résultat attendu :**
- La résolution personnalisée apparaît dans la liste
- Le nombre total de résolutions a augmenté de 1

---

### TEST AG-04 — Configurer la convocation

**Actions à réaliser :**
1. Aller sur la page **Convocation** de l'AG (`/ag/[id]/convocation`)
2. Vérifier que l'aperçu de la convocation est visible
3. Cliquer sur **Continuer**

**Résultat attendu :**
- Redirection vers la page **Envoi** (`/ag/[id]/envoi`)

---

### TEST AG-05 — Configurer l'envoi

**Actions à réaliser :**
1. Depuis la page **Envoi**
2. Sélectionner **Email** pour tous les copropriétaires (bouton "Email pour tous" si disponible)
3. Cliquer sur **Continuer**

**Résultat attendu :**
- Redirection vers la page **Préparation** (`/ag/[id]/preparation`)

---

### TEST AG-06 — Feuille de présence

**Actions à réaliser :**
1. Depuis la page **Préparation**
2. Cocher au moins 1 copropriétaire comme **Présent**
3. Cliquer sur **Démarrer la séance**

**Résultat attendu :**
- La présence est enregistrée
- Navigation vers la session ou confirmation visible

---

### TEST AG-07 — Vote en session live

**Actions à réaliser :**
1. Aller sur la page **Session** de l'AG (`/ag/[id]/session`)
2. Sur la première résolution, cliquer sur **Pour**
3. Cliquer sur **Valider le vote**

**Résultat attendu :**
- Le vote est enregistré
- La résolution passe à l'état voté ou le compteur de voix se met à jour

---

### TEST AG-08 — Clôturer l'AG et générer le PV

**Actions à réaliser :**
1. Aller sur la page **PV** de l'AG (`/ag/[id]/pv`)
2. Vérifier que le contenu du PV est affiché
3. Cliquer sur **Clôturer l'AG**
4. Confirmer la clôture

**Résultat attendu :**
- L'AG passe au statut **Clôturée** ou **Archivée**
- Le PV est disponible

---

### TEST AG-09 — Rechargement de page (persistance DB)

**Actions à réaliser :**
1. Depuis la page ordre du jour d'une AG avec des résolutions
2. Recharger la page (F5 ou Ctrl+R)

**Résultat attendu :**
- Les résolutions sont toujours visibles après rechargement
- Aucune perte de données

---

## Module 2 — Finance / Budgets

### TEST BUDGET-01 — Affichage de la liste des budgets

**Actions à réaliser :**
1. Aller sur `/finance/budgets`

**Résultat attendu :**
- La page se charge sans erreur
- Le titre de la page est visible
- La liste des budgets (ou un message "Aucun budget") s'affiche

---

### TEST BUDGET-02 — Créer un nouveau budget

**Actions à réaliser :**
1. Depuis `/finance/budgets`, cliquer sur **"Nouveau budget"**
2. Remplir le **Nom/Libellé** du budget
3. Renseigner l'**Année** (ex : année suivante)
4. Cliquer sur **Créer**

**Résultat attendu :**
- Le budget apparaît dans la liste
- Son statut est **Brouillon**

---

### TEST BUDGET-03 — Modifier un poste budgétaire

**Actions à réaliser :**
1. Ouvrir un budget existant
2. Modifier le montant d'un poste (ex : saisir 12 500 €)
3. Valider la saisie (clic hors du champ ou bouton Enregistrer)

**Résultat attendu :**
- Le montant est mis à jour dans le tableau
- La modification est persistée (visible après rechargement)

---

### TEST BUDGET-04 — Valider un budget

**Actions à réaliser :**
1. Depuis la page d'un budget en brouillon
2. Cliquer sur **"Valider le budget"**
3. Confirmer si une boîte de dialogue apparaît

**Résultat attendu :**
- Le statut du budget passe à **Validé**
- Le badge de statut change dans l'interface

---

## Module 3 — Finance / Appels de fonds

### TEST ADF-01 — Affichage de la liste des appels de fonds

**Actions à réaliser :**
1. Aller sur `/finance/appels-fonds`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des appels de fonds s'affiche

---

### TEST ADF-02 — Générer un échéancier trimestriel

**Actions à réaliser :**
1. Cliquer sur **"Nouvel appel"** ou **"Générer"**
2. Renseigner un libellé
3. Sélectionner la fréquence : **Trimestriel**
4. Cliquer sur **Créer / Générer**

**Résultat attendu :**
- Un appel de fonds est créé
- Les lignes de l'échéancier sont visibles (une par lot, par trimestre)

---

### TEST ADF-03 — Enregistrer un paiement

**Actions à réaliser :**
1. Ouvrir un appel de fonds existant
2. Cliquer sur **"Enregistrer paiement"** pour une ligne
3. Saisir le montant payé
4. Confirmer

**Résultat attendu :**
- La ligne passe au statut **Payé** ou **Partiellement payé**
- Le total encaissé se met à jour

---

## Module 4 — Finance / Factures

### TEST FAC-01 — Affichage de la liste des factures

**Actions à réaliser :**
1. Aller sur `/finance/factures`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des factures s'affiche

---

### TEST FAC-02 — Créer une facture

**Actions à réaliser :**
1. Aller sur `/finance/factures/new`
2. Renseigner le **Libellé** de la facture
3. Saisir le **Montant** (ex : 2 500 €)
4. Choisir une **Date d'échéance** (dans 30 jours)
5. Cliquer sur **Créer**

**Résultat attendu :**
- La facture apparaît dans la liste avec le statut **Brouillon**

---

### TEST FAC-03 — Approuver une facture

**Actions à réaliser :**
1. Ouvrir une facture en statut Brouillon
2. Cliquer sur **"Approuver"** ou **"Valider"**

**Résultat attendu :**
- Le statut passe à **Approuvée**
- Le badge de statut change dans l'interface

---

### TEST FAC-04 — Marquer une facture comme payée

**Actions à réaliser :**
1. Ouvrir une facture approuvée
2. Cliquer sur **"Marquer comme payée"** ou **"Payer"**
3. Confirmer si nécessaire

**Résultat attendu :**
- Le statut passe à **Payée**

---

## Module 5 — Finance / Mouvements bancaires

### TEST MB-01 — Affichage des mouvements bancaires

**Actions à réaliser :**
1. Aller sur `/finance/mouvements-bancaires`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des mouvements bancaires s'affiche

---

### TEST MB-02 — Filtrer par compte (CC vs FT)

**Actions à réaliser :**
1. Sur la page des mouvements, sélectionner le compte **Courant (CC)** dans le filtre
2. Observer la liste
3. Sélectionner ensuite le compte **Travaux (FT)**
4. Observer la liste

**Résultat attendu :**
- La liste se filtre selon le compte sélectionné
- Les montants affichés correspondent au compte sélectionné

---

### TEST MB-03 — Catégoriser un mouvement

**Actions à réaliser :**
1. Trouver un mouvement **non catégorisé** dans la liste
2. Cliquer sur **"Catégoriser"** ou sur le mouvement
3. Sélectionner un code comptable / une catégorie
4. Valider

**Résultat attendu :**
- Le mouvement affiche désormais la catégorie sélectionnée
- Il n'est plus marqué comme "non catégorisé"

---

## Module 6 — Maintenance / Contrats

### TEST CONT-01 — Affichage de la liste des contrats

**Actions à réaliser :**
1. Aller sur `/maintenance/contracts`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des contrats s'affiche

---

### TEST CONT-02 — Créer un contrat

**Actions à réaliser :**
1. Aller sur `/maintenance/contracts/new`
2. Renseigner le **Titre** du contrat
3. Renseigner la **Date de début** (aujourd'hui)
4. Renseigner la **Date de fin** (dans 1 an)
5. Saisir le **Montant** (ex : 500 € / mois)
6. Cliquer sur **Créer**

**Résultat attendu :**
- Le contrat apparaît dans la liste avec le statut **Actif** ou **Brouillon**

---

### TEST CONT-03 — Alerte de renouvellement

**Actions à réaliser :**
1. Depuis la liste des contrats
2. Observer les contrats dont la date de fin est dans moins de 60 jours

**Résultat attendu :**
- Un badge ou une alerte **"À renouveler"** est visible sur ces contrats
- La couleur du badge est orange ou rouge

---

### TEST CONT-04 — Résilier un contrat

**Actions à réaliser :**
1. Ouvrir un contrat actif
2. Cliquer sur **"Résilier"**
3. Confirmer la résiliation

**Résultat attendu :**
- Le statut du contrat passe à **Résilié**
- Le contrat est toujours visible dans la liste (avec le nouveau statut)

---

## Module 7 — Maintenance / Ordres de service

### TEST OS-01 — Affichage de la liste des ordres de service

**Actions à réaliser :**
1. Aller sur `/maintenance/service-orders`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des ordres de service s'affiche

---

### TEST OS-02 — Créer un ordre de service

**Actions à réaliser :**
1. Aller sur `/maintenance/service-orders/new`
2. Remplir la **Description** du problème
3. Sélectionner un **Prestataire** si disponible
4. Cliquer sur **Créer**

**Résultat attendu :**
- L'ordre de service apparaît dans la liste avec le statut **Brouillon**

---

### TEST OS-03 — Envoyer l'ordre de service

**Actions à réaliser :**
1. Ouvrir un OS en statut Brouillon
2. Cliquer sur **"Envoyer"**
3. Confirmer si nécessaire

**Résultat attendu :**
- Le statut passe à **Envoyé**

---

### TEST OS-04 — Programmer l'intervention

**Actions à réaliser :**
1. Ouvrir un OS envoyé
2. Cliquer sur **"Programmer l'intervention"**
3. Sélectionner une date (dans 7 jours)
4. Confirmer

**Résultat attendu :**
- Le statut passe à **Intervention programmée**
- La date d'intervention est visible

---

### TEST OS-05 — Clôturer l'ordre de service

**Actions à réaliser :**
1. Ouvrir un OS (peu importe son statut actuel)
2. Cliquer sur **"Clôturer"**
3. Confirmer

**Résultat attendu :**
- Le statut passe à **Clôturé** ou **Réalisé**

---

## Module 8 — Maintenance / Carnet d'entretien

### TEST LOG-01 — Affichage du carnet d'entretien

**Actions à réaliser :**
1. Aller sur `/maintenance/logbook`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des interventions s'affiche

---

### TEST LOG-02 — Ajouter une intervention

**Actions à réaliser :**
1. Cliquer sur **"Ajouter"** ou **"Nouvelle intervention"**
2. Renseigner le **Titre**
3. Sélectionner le **Type** (entretien, contrôle, incident, etc.)
4. Choisir la **Date** (aujourd'hui)
5. Cliquer sur **Enregistrer**

**Résultat attendu :**
- L'intervention apparaît dans la liste
- Les informations saisies sont correctement affichées

---

### TEST LOG-03 — Filtrer par type

**Actions à réaliser :**
1. Depuis la liste du carnet
2. Sélectionner un type de filtre (ex : "Entretien")
3. Observer la liste

**Résultat attendu :**
- Seules les interventions du type sélectionné sont affichées

---

## Module 9 — Documents / GED

### TEST GED-01 — Affichage de la GED

**Actions à réaliser :**
1. Aller sur `/documents/ged`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des documents s'affiche (ou un message "Aucun document")

---

### TEST GED-02 — Uploader un document

**Actions à réaliser :**
1. Cliquer sur **"Ajouter"** ou **"Importer"**
2. Renseigner le **Nom** du document
3. Sélectionner un fichier PDF depuis votre ordinateur
4. Cliquer sur **Uploader / Enregistrer**

**Résultat attendu :**
- Le document apparaît dans la liste
- Son statut est **Actif**

---

### TEST GED-03 — Prévisualiser un document

**Actions à réaliser :**
1. Cliquer sur un document dans la liste

**Résultat attendu :**
- Une fenêtre de prévisualisation s'ouvre
- Le document est affiché (ou un aperçu est proposé)

---

### TEST GED-04 — Archiver un document

**Actions à réaliser :**
1. Sur un document actif, ouvrir le menu d'actions (bouton "..." ou clic droit)
2. Cliquer sur **"Archiver"**
3. Confirmer si nécessaire

**Résultat attendu :**
- Le statut du document passe à **Archivé**
- Un badge "Archivé" est visible sur le document

---

## Module 10 — Communication / Messagerie privée

### TEST MSG-01 — Affichage de la messagerie

**Actions à réaliser :**
1. Aller sur `/communication/messagerie-privee`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des conversations/messages s'affiche

---

### TEST MSG-02 — Envoyer un message

**Actions à réaliser :**
1. Aller sur `/communication/messagerie-privee/nouveau`
2. Sélectionner un **Destinataire**
3. Renseigner le **Sujet**
4. Écrire le **Corps** du message
5. Cliquer sur **Envoyer**

**Résultat attendu :**
- Le message apparaît dans la liste des messages envoyés ou des conversations

---

### TEST MSG-03 — Ouvrir et lire un message

**Actions à réaliser :**
1. Depuis la liste des messages, cliquer sur un message

**Résultat attendu :**
- Le contenu du message est affiché
- L'expéditeur, la date et le corps sont visibles

---

## Module 11 — Communication / Mur communautaire

### TEST MUR-01 — Affichage du mur

**Actions à réaliser :**
1. Aller sur `/communication/mur`

**Résultat attendu :**
- La page se charge sans erreur
- Les publications du mur sont visibles

---

### TEST MUR-02 — Publier un post

**Actions à réaliser :**
1. Aller sur `/communication/mur/nouveau`
2. Renseigner le **Titre**
3. Écrire le **Contenu**
4. Sélectionner une **Catégorie** (information, urgent, question, etc.)
5. Cliquer sur **Publier**

**Résultat attendu :**
- Le post apparaît en tête du mur communautaire
- Le titre et le contenu sont correctement affichés

---

### TEST MUR-03 — Liker un post

**Actions à réaliser :**
1. Sur le mur communautaire, trouver un post
2. Cliquer sur le bouton **"J'aime"** / cœur / pouce

**Résultat attendu :**
- Le compteur de likes augmente de 1
- Le bouton change d'état visuel (actif)

---

## Module 12 — Communication / Événements

### TEST EVT-01 — Affichage des événements

**Actions à réaliser :**
1. Aller sur `/communication/evenements`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des événements s'affiche

---

### TEST EVT-02 — Créer un événement

**Actions à réaliser :**
1. Aller sur `/communication/evenements/nouveau`
2. Renseigner le **Titre** de l'événement
3. Choisir une **Date** (dans 14 jours)
4. Renseigner le **Lieu**
5. Cliquer sur **Créer**

**Résultat attendu :**
- L'événement apparaît dans la liste
- La date et le lieu sont correctement affichés

---

## Module 13 — Copropriétaires

### TEST COPRO-01 — Affichage de l'annuaire

**Actions à réaliser :**
1. Aller sur `/coproprietaires`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des copropriétaires s'affiche avec leurs noms et lots associés

---

### TEST COPRO-02 — Ouvrir la fiche d'un copropriétaire

**Actions à réaliser :**
1. Depuis la liste, cliquer sur un copropriétaire

**Résultat attendu :**
- La fiche du copropriétaire s'ouvre
- Les informations sont visibles : nom, lots, tantièmes, coordonnées

---

### TEST COPRO-03 — Modifier les tantièmes d'un lot

**Actions à réaliser :**
1. Sur la fiche d'un copropriétaire ou depuis la liste des lots
2. Cliquer sur **"Modifier les tantièmes"** ou **"Éditer"**
3. Changer la valeur des tantièmes
4. Cliquer sur **Enregistrer**

**Résultat attendu :**
- La nouvelle valeur des tantièmes est affichée
- La modification est persistée (visible après rechargement)

---

## Module 14 — Ventes & Impayés

### TEST VENTE-01 — Affichage de la liste des ventes

**Actions à réaliser :**
1. Aller sur `/ventes-impayes/ventes`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des ventes / mutations en cours s'affiche

---

### TEST VENTE-02 — Créer une nouvelle vente

**Actions à réaliser :**
1. Aller sur `/ventes-impayes/ventes/nouvelle`
2. Sélectionner le **Lot** concerné
3. Renseigner le nom de l'**Acquéreur**
4. Cliquer sur **Créer**

**Résultat attendu :**
- La vente apparaît dans la liste avec le statut **Brouillon**

---

### TEST VENTE-03 — Faire avancer le workflow de vente

**Actions à réaliser :**
1. Ouvrir une vente en statut Brouillon
2. Cliquer sur **"Étape suivante"** ou **"Signer"**
3. Confirmer si nécessaire

**Résultat attendu :**
- Le statut de la vente avance (Brouillon → Signé ou étape suivante)
- La progression du workflow est visible

---

### TEST VENTE-04 — Affichage de la liste des impayés

**Actions à réaliser :**
1. Aller sur `/ventes-impayes/impayes`

**Résultat attendu :**
- La page se charge sans erreur
- La liste des impayés s'affiche (ou un message "Aucun impayé")

---

## Récapitulatif

| Module | Tests | Résultats |
|--------|-------|-----------|
| AG — Assemblées Générales | 9 | |
| Finance — Budgets | 4 | |
| Finance — Appels de fonds | 3 | |
| Finance — Factures | 4 | |
| Finance — Mouvements bancaires | 3 | |
| Maintenance — Contrats | 4 | |
| Maintenance — Ordres de service | 5 | |
| Maintenance — Carnet d'entretien | 3 | |
| Documents — GED | 4 | |
| Communication — Messagerie | 3 | |
| Communication — Mur | 3 | |
| Communication — Événements | 2 | |
| Copropriétaires | 3 | |
| Ventes & Impayés | 4 | |
| **Total** | **57** | |

---

## Notes du testeur

*(Espace libre pour noter les bugs, comportements inattendus, ou questions)*

---
