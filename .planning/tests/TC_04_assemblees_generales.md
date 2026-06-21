# Plan de test — Assemblées Générales (cycle de vie complet)

> Domaine : module AG, du brouillon à l'archivage.
> Environnement : `npm run dev` en local pointant sur le cloud live Supabase `qqfqrcolzmcbsvfaumiq`.
> Compte unique : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`), affiché « Jean Dupont ».
> Sélection de la copro : `/portefeuille` → cliquer une copro (recommandé : **Résidence Martin**, la plus complète).

---

## Périmètre & écrans canoniques

L'AG est un **assistant en 9 étapes** (un « wizard »), comme un formulaire en plusieurs pages où l'on avance pas à pas. La barre de progression (composant `Stepper`) et l'enchaînement réel des boutons « Continuer » donnent l'ordre canonique :

| Étape | Route | Rôle | Statut visé |
|------|-------|------|-------------|
| 1 Planification | `/ag/[id]/edit` | Date, heure, lieu, type, budget prévisionnel | `draft` |
| 2 Ordre du jour | `/ag/[id]/agenda` | Résolutions (modèles obligatoires + banque + sur-mesure), variables, réordonnancement | `draft` |
| 3 Préparation convocation | `/ag/[id]/convocation` | Aperçu PDF convocation + annexes + modes d'envoi | `draft` |
| 4 Envoi convocation | `/ag/[id]/envoi` | Envoi réel (email/courrier/ZIP) → marque l'AG « convoquée » | `convoked` |
| 5 Votes par correspondance *(optionnel)* | `/ag/[id]/votes-correspondance` | Saisie des votes papier reçus avant l'AG + suivi | `convoked` |
| 6 Feuille de présence | `/ag/[id]/feuille-presence` | Présents / représentés / correspondance + signatures + quorum indicatif | `convoked` |
| 7 Tenue de l'AG (session) | `/ag/[id]/session` | Votes en séance, calcul majorités, passerelles, clôture | `session_active` → `closed` |
| 8 Procès-verbal | `/ag/[id]/pv` | Génère le PV, signe, **active les décisions** | `pv_signed` |
| 9 Finalisation *(optionnel)* | `/ag/[id]/finalisation` | Revue lecture seule des décisions activées, classer l'AG | `finalized` |

Autres écrans canoniques :
- **`/ag/dashboard`** : tableau de bord AG (liste En cours / Passées / Brouillons / Historique). C'est la page d'entrée du module (lien sidebar « AG »).
- **`/ag/new`** : création initiale (planification) → crée le brouillon puis redirige vers `/ag/[id]/agenda`.
- **`/ag/resolutions`** : bibliothèque de résolutions (modèles), avec création/édition de modèles via une fenêtre modale et bouton « Ajouter à une AG ».
- **`/ag/[id]/projector`** : mode « vidéoprojecteur » (affichage plein écran des votes en séance), ouvert depuis la session. Canonique mais accessoire.
- **`/ag/[id]/designation-roles`** : désignation du bureau (président/secrétaire/scrutateur) et du conseil syndical, outil de séance. Canonique mais en marge du wizard.
- **`/ag/[id]/votes-correspondance/[coproId]`** : sous-page de saisie détaillée des votes d'un copropriétaire donné.

Chaînes RPC réellement câblées (à vérifier côté grand livre / base) :
- Création des résolutions standard = boucle d'`addResolution` (helper `createStandardResolutions`), PAS un appel unique `create_ag_with_standard_resolutions`.
- Démarrage séance = `start_ag` (via UPDATE `status='session_active'`).
- Vote = edge function `ag_cast_vote` avec **repli direct en base** si erreur 401/JWT.
- Clôture (étape 7) = `close_ag` **PUIS** `prepare_ag_decisions`, dans cet ordre impératif.
- Activation des décisions = `activate_ag_decisions`, **une seule fois à l'étape PV**, après la garde 471/472.
- Finalisation = `finalize_ag` ; archivage = `archive_ag`.

---

## Écrans morts / doublons (NE PAS tester)

Repérés en lecture de code (non câblés au parcours canonique, ou doublons d'une ancienne version) :

- **`/ag` (ancienne liste)** — `src/app/(dashboard)/ag/page.tsx`. Remplacée par `/ag/dashboard`. La navigation (sidebar + recherche) pointe sur `/ag/dashboard`. Tout le groupe de composants `@/components/features/ag/AgOverview` (dont `AgNextMeetingCard`) appartient à cette ancienne pile.
- **`/ag/[id]/preparation`** — doublon historique de l'étape 5. Affiche `Stepper currentStep={5}` (votes + pouvoirs) mais le parcours canonique de l'étape 5 est `votes-correspondance`. N'est atteignable que par des liens hérités (vieux `AgNextMeetingCard`, bouton retour de `votes-correspondance`, états de chargement de la session). Les pouvoirs et la pré-saisie des votes ne sont PAS le flux principal.
- **`/ag/[id]/checklist`** — écran de démonstration : tâches **codées en dur** (mock), avec styles en ligne. Aucun lien depuis le wizard.
- **`/ag/[id]/minutes`** — ancien écran de « minutes » remplacé par `pv`. Non lié.
- **`/ag/resolutions-preview`** — page de prévisualisation/maquette des résolutions (vues table/cards via `?v=1`/`?v=2`). Maquette, non câblée au parcours.
- **`/ag/[id]/resolutions/new` + `/ag/resolutions/select-ag`** — flux « créer une résolution sur-mesure en pleine page ». Doublon de la création de résolution réelle, qui se fait soit dans la **modale** de la bibliothèque (`/ag/resolutions`), soit dans l'agenda (étape 2). À ne pas tester comme parcours principal.

> Note : le repli `castVoteDirect` (vote écrit directement en base si l'edge function renvoie 401) n'est PAS un écran mort : c'est un filet de sécurité à garder en tête lors des tests de vote.

---

## Cas de test

### TC-AG-001 : Créer une AG ordinaire (planification, étape 1)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin sélectionnée. Compte démo.
**Étapes :**
1. Aller sur `/ag/dashboard` → cliquer « Planifier une AG » (ou « Nouvelle AG ») → **Attendu :** ouverture de `/ag/new`, étape 1 du Stepper active, un brouillon est auto-créé en base (`ag_meetings.status = 'draft'`).
2. Choisir type **Ordinaire**, format **Présentiel**, renseigner une date à **≥ 21 jours**, une heure, et l'adresse (rue + code postal 5 chiffres + ville) → **Attendu :** aucune erreur de validation ; le calendrier des jalons légaux s'affiche.
3. Cliquer « Continuer » → **Attendu :** redirection vers `/ag/[id]/agenda` ; en base, le brouillon a la date/lieu enregistrés ; pour une AGO les résolutions standard sont préparées (draft `resolutions`).
**Cas limites :**
- Date dans le passé → message « La date doit être dans le futur ».
- Date à moins de 21 jours (type non URGENTE) → message rappelant le délai légal de convocation + date minimum recommandée.
- Code postal ≠ 5 chiffres → erreur dédiée.
- Champs lieu vides → erreurs « rue/code postal/ville obligatoires ».
**Règle métier :** Délai de convocation **21 jours** (art. 9 décret 67-223). Budget prévisionnel voté en AGO.

### TC-AG-002 : Format mixte / visio — lien de visioconférence
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Brouillon en cours d'édition (étape 1).
**Étapes :**
1. Choisir le format **Mixte** (présentiel + visio) et laisser le champ lien vide → cliquer « Continuer » → **Attendu :** un lien de réunion à distance est généré automatiquement (service `ensureRemoteMeeting`).
2. Choisir un format imposant la visio et coller un lien invalide (ex. `truc`) → **Attendu :** message « Le lien n'est pas valide ».
**Cas limites :** Format visio obligatoire + lien vide et non auto-générable → message « Le lien de visioconférence est obligatoire ».
**Règle métier :** Visio admise depuis le décret 2020 / loi ELAN ; le lien doit être communiqué dans la convocation.

### TC-AG-003 : Générer les résolutions standard d'une AGO
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** AGO créée (TC-AG-001), sur `/ag/[id]/agenda`.
**Étapes :**
1. Observer la liste des résolutions pré-remplies → **Attendu :** les résolutions obligatoires système de l'AGO sont présentes (désignation du bureau, approbation des comptes, quitus, approbation du budget prévisionnel, fonds de travaux ALUR, élection du conseil syndical…), numérotées dans l'ordre.
2. Cliquer une variable surlignée (ex. `{montant}`, `{annee}`, un nom de copropriétaire) → **Attendu :** éditeur de variable ; pour une variable de type copropriétaire, un menu déroulant listant les copros avec recherche.
**Cas limites :**
- Copro sans modèle obligatoire configuré → 0 résolution créée mais pas d'erreur bloquante.
- Variables non renseignées → l'aperçu de la convocation (étape 3) signalera les variables manquantes.
**Règle métier :** Une AGO doit statuer sur les comptes de l'exercice clos, le budget prévisionnel N+1, le quitus, le fonds travaux ALUR.

### TC-AG-004 : Ajouter une résolution depuis la banque + une résolution sur-mesure
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Sur `/ag/[id]/agenda`.
**Étapes :**
1. Cliquer « Banque de résolutions » → sélectionner une résolution → **Attendu :** elle s'ajoute en fin de liste, avec sa majorité (art.24/25/26) et ses variables.
2. Cliquer « Résolution personnalisée » → saisir titre + texte + majorité → enregistrer → **Attendu :** ajout à la liste.
3. Glisser-déposer pour réordonner, puis supprimer une résolution → **Attendu :** numérotation recalculée ; persistance après rechargement de la page.
**Cas limites :**
- Ajouter un doublon déjà présent (même titre) → le picker ne doit pas le re-proposer (filtre `existingTitles`).
- Liste vide → bouton « Continuer » désactivé.
**Règle métier :** Chaque question soumise au vote doit figurer à l'ordre du jour (art. 13 décret 67-223) ; pas de vote hors ODJ.

### TC-AG-005 : Préparer la convocation (aperçu PDF + annexes)
**Priorité :** P0
**Type :** Fonctionnel / UI
**Préconditions / jeu de données :** Résidence Martin, AGO avec résolutions, sur `/ag/[id]/convocation`.
**Étapes :**
1. Attendre le chargement → **Attendu :** aperçu PDF de la convocation (ordre du jour, lieu, date) ; pour une AGO, les annexes comptables 1 à 5 de l'exercice **N-1** sont proposées.
2. Cocher/décocher des annexes, ajouter un document uploadé (devis) → **Attendu :** l'aperçu se met à jour.
3. Cliquer « Continuer » → **Attendu :** redirection vers `/ag/[id]/envoi` ; l'étape courante en base passe à 3.
**Cas limites :**
- Variables de résolutions encore vides → indicateur de variables manquantes.
- Copro partielle (Residence Paris Ivry, clé générale à 0) → l'aperçu reste affichable mais les annexes comptables peuvent être vides/incomplètes (ne pas envoyer si annexe 1 cassée — dette connue).
**Règle métier :** Pièces obligatoires : ordre du jour + annexes comptables ; pour travaux/contrats, devis joints (art. 11 décret 67-223). Cotisation ALUR = MAX(2,5 % PPT ; 5 % budget).

### TC-AG-006 : Envoyer les convocations → statut « convoquée »
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Sur `/ag/[id]/envoi`.
**Étapes :**
1. Configurer les modes d'envoi par copropriétaire (email / courrier) → lancer l'envoi → **Attendu :** barre de progression ; en fin, génération d'un ZIP des courriers téléchargeable.
2. Revenir au tableau de bord → **Attendu :** l'AG apparaît en « Convoquée » ; en base `ag_meetings.status = 'convoked'` et `convocation_date` renseignée.
**Cas limites :**
- Copropriétaire sans email pour un envoi email → l'envoi le bascule en courrier / le signale, sans bloquer les autres.
- Annuler en cours d'envoi → l'opération s'arrête proprement (abort), statut non avancé.
**Règle métier :** Convocation par LRAR / voie électronique avec accord ; preuve d'envoi conservée (art. 64 décret 67-223). Le compte à rebours de 21 jours court à compter de la réception.

### TC-AG-007 : Contrôle du délai de convocation (21 jours)
**Priorité :** P1
**Type :** Fonctionnel / Régression
**Préconditions / jeu de données :** Nouvelle AGO en planification.
**Étapes :**
1. Saisir une date à **moins de 21 jours** → tenter de continuer → **Attendu :** blocage avec message de délai légal + date minimum recommandée.
2. Repasser à une date conforme → **Attendu :** déblocage, calendrier des jalons affiché.
**Cas limites :** Type **URGENTE** → le contrôle de 21 jours est levé (cas dérogatoire).
**Règle métier :** Délai minimal **21 jours** avant l'AG (art. 9 décret 67-223), sauf urgence.

### TC-AG-008 : Votes par correspondance — saisie d'un formulaire papier (étape 5)
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** AG « convoquée », résolutions existantes, sur `/ag/[id]/votes-correspondance`.
**Étapes :**
1. Déplier « Saisir les votes des formulaires papier » → sélectionner un copropriétaire → **Attendu :** la liste des résolutions s'affiche.
2. Utiliser « Tout Pour » puis ajuster un vote (Contre/Abstention) → cliquer « Enregistrer les votes » → **Attendu :** message « N vote(s) enregistré(s) » ; en base, lignes `ag_votes` avec `vote_source = 'correspondence'`.
3. Cliquer « Voir les votes » → **Attendu :** le copropriétaire apparaît dans le suivi avec ses votes et le statut du formulaire.
**Cas limites :**
- Aucun copropriétaire sélectionné → liste des résolutions masquée, bouton désactivé.
- Saisie après le délai (J-3 avant l'AG) → bandeau d'alerte « vous n'êtes plus censé accepter de votes ».
- Étape entièrement optionnelle : cliquer « Démarrer l'AG » sans rien saisir doit fonctionner.
**Règle métier :** Vote par correspondance sur formulaire conforme (loi ELAN art. 17-1A) ; reçu **au plus tard 3 jours avant** l'AG. Un votant par correspondance compté comme défaillant s'il est aussi noté « contre » sur une passerelle.

### TC-AG-009 : Feuille de présence + quorum indicatif (étape 6)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin (6 copros, 1000 tantièmes), AG convoquée, sur `/ag/[id]/feuille-presence`.
**Étapes :**
1. Marquer des copropriétaires « Présent », un « Représenté » (mandataire), un « Correspondance » → **Attendu :** les compteurs de présence et les **statistiques de quorum** (tantièmes présents/représentés) se mettent à jour en temps réel (`compute_ag_quorum`).
2. Ouvrir la signature d'un présent → dessiner une signature → enregistrer → **Attendu :** signature stockée, le copropriétaire est marqué signé.
3. Cliquer « Continuer vers la session » → **Attendu :** redirection vers `/ag/[id]/session`.
**Cas limites :**
- Des présents/représentés non signés → fenêtre de confirmation listant les non-signataires avant de continuer (les « correspondance » sont exclus).
- 0 présent et 0 représenté → bouton « Continuer » désactivé.
- Le quorum est **indicatif** : aucun blocage légal de quorum (en copro le quorum n'est pas requis pour délibérer).
**Règle métier :** Pas de quorum bloquant en AG de copropriété (loi 65-557) ; la présence sert au calcul des majorités. Un mandataire ne peut porter **plus de 3 pouvoirs** (art. 22, sauf seuil 10 % tantièmes).

### TC-AG-010 : Pouvoirs (mandats) — plafond art. 22
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Feuille de présence (ou onglet pouvoirs), Résidence Martin.
**Étapes :**
1. Désigner un copropriétaire comme mandataire (représentant) d'un absent → **Attendu :** l'absent est compté « représenté », ses tantièmes ajoutés au mandataire.
2. Tenter d'attribuer un **4ᵉ** pouvoir au même mandataire → **Attendu :** alerte / refus au-delà de 3 (sauf dérogation seuil 10 %).
**Cas limites :** Mandataire détenant ≤ 10 % des tantièmes totaux → la dérogation au plafond de 3 s'applique.
**Règle métier :** Art. 22 loi 65-557 : max **3 mandats**, dérogation si total représenté ≤ 10 % des voix.

### TC-AG-011 : Démarrer la session et voter une résolution art. 24
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Sur `/ag/[id]/session`, présences renseignées.
**Étapes :**
1. Cliquer « Démarrer la session » → **Attendu :** présences enregistrées en base, `start_ag` exécuté, `ag_meetings.status = 'session_active'`.
2. Sur la 1ʳᵉ résolution (majorité art. 24), saisir des votes Pour/Contre/Abstention pour chaque présent → valider → **Attendu :** le résultat (adoptée/rejetée) est calculé selon la **majorité simple des présents/représentés** ; en base, votes en `ag_votes` (`vote_source = 'live'`) et résolution en `approved`/`rejected`.
3. Passer à la résolution suivante → **Attendu :** progression, résolution courante mise à jour.
**Cas limites :**
- Repli `castVoteDirect` : si l'edge function renvoie 401, le vote est quand même écrit en base (vérifier que le vote n'est jamais « perdu silencieusement »).
- Vote sur une résolution déjà décidée → vote figé (contrainte UNIQUE résolution+copropriétaire), pas de doublon.
- Abstention ne compte pas comme « contre » à l'art. 24.
**Règle métier :** Art. 24 = majorité des voix exprimées des présents/représentés ; abstentions exclues du décompte.

### TC-AG-012 : Majorité art. 25 et passerelle 25-1
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Session active, une résolution à la majorité **art. 25** (ex. travaux d'amélioration).
**Étapes :**
1. Voter de façon à NE PAS atteindre la majorité absolue de **tous** les copropriétaires, mais avec **au moins 1/3** des voix « pour » → valider → **Attendu :** une **fenêtre passerelle** propose un **second vote immédiat à l'art. 24**.
2. Choisir « Procéder au second vote » et atteindre la majorité simple des présents → **Attendu :** la résolution est **adoptée par passerelle 25-1**, le résultat le mentionne.
**Cas limites :**
- Pour < 1/3 des voix → pas de passerelle proposée, résolution rejetée.
- Choisir « Ajourner » dans la passerelle → résolution marquée ajournée (reportée).
**Règle métier :** Art. 25 = majorité absolue de tous les copropriétaires ; passerelle **25-1** vers art. 24 si ≥ 1/3 des voix obtenues.

### TC-AG-013 : Majorité art. 26 et passerelle 26-1
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Session active, une résolution **art. 26** (acte de disposition / modification règlement).
**Étapes :**
1. Voter sans atteindre la double majorité (2/3 des tantièmes + majorité des copropriétaires) mais avec **≥ 1/2** des copropriétaires représentant **≥ 1/3** des voix → **Attendu :** passerelle **26-1** proposant un second vote.
2. Tester une résolution à **l'unanimité** (ex. aliénation partie commune) : un seul « contre » → **Attendu :** rejetée.
**Cas limites :** Double majorité partiellement atteinte (2/3 tantièmes mais pas la majorité des copros, ou inverse) → non adoptée sans passerelle.
**Règle métier :** Art. 26 = 2/3 des tantièmes **+** majorité en nombre des copropriétaires ; passerelle 26-1 ; unanimité = 100 % pour les aliénations.

### TC-AG-014 : Désignation du bureau et du conseil syndical
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Session active OU `/ag/[id]/designation-roles` après feuille de présence renseignée.
**Étapes :**
1. Sur une résolution de désignation du bureau (DESIGNATE_BUREAU), choisir président / secrétaire / scrutateur parmi les présents → **Attendu :** les noms et `*_id` sont enregistrés sur `ag_meetings` (réutilisés à l'étape PV pour les signataires).
2. Sur une résolution d'élection du conseil syndical adoptée, ajouter des membres → **Attendu :** proposition d'ajout d'une désignation supplémentaire (modale), membres mémorisés pour l'activation des décisions.
**Cas limites :**
- Aucun présent/représenté → la page `designation-roles` affiche un avertissement et renvoie vers la feuille de présence.
- Le secrétaire peut être le gestionnaire (syndic) → mention « représentant le syndic ».
**Règle métier :** Bureau (président/secrétaire/scrutateur) obligatoire ; conseil syndical élu à l'art. 25 (passerelle 24 possible).

### TC-AG-015 : Clôturer la séance (close_ag PUIS prepare_ag_decisions)
**Priorité :** P0
**Type :** Intégration / Régression
**Préconditions / jeu de données :** Toutes les résolutions votées en session.
**Étapes :**
1. Après la dernière résolution, valider → **Attendu :** la session se termine automatiquement ; redirection vers `/ag/[id]/pv`.
2. Vérifier en base → **Attendu :** `close_ag` a figé et **approuvé** les résolutions (statuts `approved`/`rejected`), `ag_meetings.status = 'closed'`, puis `prepare_ag_decisions` a matérialisé **les résolutions approuvées** dans `ag_pending_actions` (statut `pending`).
**Cas limites :**
- **Ordre impératif** : si `prepare_ag_decisions` tournait avant `close_ag`, **0 décision** serait matérialisée (échec silencieux) — vérifier qu'on obtient bien autant d'actions en attente que de résolutions « à effet » adoptées.
- Résolution courante non encore validée au moment de « Aller au PV » → la modale de confirmation du vote s'ouvre d'abord (pas de saut).
**Règle métier :** `close_ag` est ce qui passe les résolutions en `approved` ; `prepare_ag_decisions` ne matérialise QUE les `approved`.

### TC-AG-016 : Générer le PV et l'aperçu PDF (étape 8)
**Priorité :** P0
**Type :** Fonctionnel / UI
**Préconditions / jeu de données :** AG `closed`, sur `/ag/[id]/pv`.
**Étapes :**
1. Attendre le chargement (RPC `rpc_get_ag_pv_bundle`) → **Attendu :** le texte du PV liste chaque résolution avec son résultat (ADOPTÉE/REJETÉE) et le détail des votes ; les statistiques de présence sont correctes.
2. Cliquer « Aperçu PDF » puis « Télécharger PDF » → **Attendu :** PDF généré ; classement automatique dans la GED (catégorie `pv_ag`).
**Cas limites :**
- Chargement trop long (> timeout) → message d'erreur + bouton « Réessayer », pas de spinner muet.
- ID d'AG invalide → message « ID AG invalide ».
**Règle métier :** Le PV mentionne pour chaque résolution la majorité requise, le résultat et le décompte ; nom des opposants/défaillants (art. 17 décret 67-223) pour le délai de recours.

### TC-AG-017 : Signer le PV → activation des décisions (UNE seule fois)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** AG `closed`, PV généré, décisions en attente (`ag_pending_actions` `pending`).
**Étapes :**
1. Ouvrir « Signataires », choisir le mode (sur place / électronique), pré-remplir via « Auto-remplir depuis l'AG » → renseigner nom/prénom (et email si électronique) → valider les signatures → **Attendu :** `activate_ag_decisions` est exécuté ; un **récapitulatif d'activation** s'affiche (N activées / M échouées).
2. Vérifier les effets en base → **Attendu :** selon les résolutions adoptées : création du **budget prévisionnel actif**, du **fonds de travaux ALUR** (écriture D450-5 / C105), des **appels de fonds**, et du **conseil syndical** ; statut AG → `pv_signed`, étape courante = 9.
**Cas limites :**
- **Idempotence** : revenir sur la page et re-valider les signatures ne doit PAS ré-activer ni dupliquer budget/appels (l'activation est « une seule fois »).
- Échec d'activation (RAISE Postgres) → message explicite « l'activation a échoué : aucun budget/appel généré », **le PV n'est PAS marqué signé**, l'AG ne progresse pas → le syndic corrige la résolution fautive et relance.
- Mode électronique sans email → blocage « renseigner l'email » ; mode sur place sans nom/prénom → blocage.
**Règle métier :** Les décisions votées en AG alimentent automatiquement l'état de la copro (budget actif, ALUR, conseil). Immuabilité du grand livre : pas de double écriture.

### TC-AG-018 : Garde 471/472 — arrêté des comptes non soldé bloque l'activation
**Priorité :** P0
**Type :** Intégration / Régression
**Préconditions / jeu de données :** AG arrêtant les comptes (résolution APPROVE_ACCOUNTS), sur une copro dont la **reprise des soldes n'est pas terminée** (compte d'attente 471/472 ≠ 0).
**Étapes :**
1. À l'étape PV, tenter de valider les signatures → **Attendu :** **refus AVANT toute écriture** avec message « Impossible d'arrêter les comptes : la reprise des soldes n'est pas terminée — compte 471/472 non soldé : X € », sans message contradictoire « signatures validées ».
2. Solder la reprise (471/472 = 0) puis relancer → **Attendu :** l'activation s'exécute normalement.
**Cas limites :**
- CoproId indéterminable + arrêté des comptes en attente → **fail-closed** : on bloque (jamais de contournement silencieux).
- Pas d'arrêté des comptes dans l'AG → aucune garde financière, activation directe.
**Règle métier :** On ne peut arrêter les comptes tant que la reprise de mandat (471/472) n'est pas bouclée — sinon le grand livre serait corrompu.

### TC-AG-019 : Finaliser l'AG (étape 9, lecture seule)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** AG `pv_signed`, décisions activées, sur `/ag/[id]/finalisation`.
**Étapes :**
1. Consulter la page → **Attendu :** **revue en lecture seule** des décisions déjà activées (`get_ag_pending_actions`) avec leur statut (activée / échec) ; PAS de bouton d'activation manuelle par bloc.
2. Cliquer « Finaliser » → **Attendu :** `finalize_ag` exécuté ; `ag_meetings.status = 'finalized'`.
**Cas limites :**
- `finalize_ag` est ouvert **dès `pv_signed`** (la signature est le fait juridique déterminant) — tester aussi qu'une AG `pv_sent` peut être finalisée.
- Une action en `failed` doit empêcher / signaler la finalisation tant que toutes les décisions ne sont pas activées.
- `finalize_ag` ne relance JAMAIS `activate_ag_decisions` (immuabilité).
**Règle métier :** Finalisation = classement administratif après signature ; les décisions sont déjà passées en base à l'étape PV.

### TC-AG-020 : Diffuser le PV (pv_sent)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** AG `pv_signed`.
**Étapes :**
1. Déclencher la diffusion / l'envoi du PV aux copropriétaires → **Attendu :** statut `pv_sent`, `pv_sent_at` renseignée.
**Cas limites :** `pv_sent` est posé par mise à jour front (transition de gestion) ; il ne ré-active pas les décisions.
**Règle métier :** Notification du PV aux opposants/défaillants par LRAR fait courir le **délai de recours de 2 mois** (art. 42 loi 65-557).

### TC-AG-021 : Archiver une AG
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** AG `finalized` (Résidence Martin), tableau de bord onglet « AG passées ».
**Étapes :**
1. Depuis l'historique, cliquer « Archiver » sur une AG finalisée (action visible si gestionnaire) → **Attendu :** `archive_ag` exécuté ; l'AG bascule en `archived` et disparaît des AG actives.
**Cas limites :**
- `archive_ag` accepte aussi `closed`, `pv_generated`, `pv_signed`, `pv_sent` (pas seulement `finalized`).
- Compte non gestionnaire → action « Archiver » absente (garde gestionnaire).
**Règle métier :** L'AG archivée reste consultable (PV) mais n'est plus modifiable.

### TC-AG-022 : Reprendre un brouillon à la bonne étape
**Priorité :** P1
**Type :** Fonctionnel / Régression
**Préconditions / jeu de données :** Un brouillon arrêté à l'étape 3 (convocation).
**Étapes :**
1. Sur `/ag/dashboard`, section Brouillons, cliquer « Continuer » → **Attendu :** ouverture directe à l'étape atteinte la plus avancée (`max_step_reached`), pas à l'étape 1.
2. Dans le Stepper, cliquer une étape **déjà franchie** → **Attendu :** navigation autorisée ; cliquer une étape **future non atteinte** → **Attendu :** non cliquable (verrouillée).
**Cas limites :**
- Cache sessionStorage corrompu / DB momentanément indisponible → la progression ne **redescend jamais** (valeur « collante » max).
- Brouillon localStorage (legacy, sans persistance Supabase) → repris via `/ag/[id]/edit`.
**Règle métier :** N/A (UX wizard).

### TC-AG-023 : Renommer / supprimer un brouillon
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Au moins un brouillon sur `/ag/dashboard`.
**Étapes :**
1. Renommer un brouillon en ligne → **Attendu :** `ag_meetings.title` mis à jour, libellé reflété.
2. Supprimer un brouillon → confirmer dans la modale → **Attendu :** l'AG et ses données associées sont supprimées, disparaît de la liste.
**Cas limites :**
- Annuler dans la modale → aucune suppression.
- Suppression d'une AG **déjà convoquée/clôturée** ne doit pas être proposée comme un simple « brouillon » (seules les AG en préparation sont supprimables ici).
**Règle métier :** N/A.

### TC-AG-024 : Bibliothèque de résolutions — créer un modèle et l'ajouter à une AG
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** `/ag/resolutions`, un cabinet associé au compte, une AG en brouillon disponible.
**Étapes :**
1. Cliquer « Créer un modèle » → remplir l'éditeur (modale) → enregistrer → **Attendu :** le modèle apparaît dans « Mes modèles personnalisés ».
2. Sur une carte de résolution, cliquer « Ajouter à une AG » → choisir l'AG cible → **Attendu :** la résolution est ajoutée à l'ordre du jour de cette AG.
**Cas limites :**
- Compte **sans cabinet** → création/édition/suppression de modèles désactivées, message explicite (pas de refus silencieux).
- Erreur d'enregistrement → bandeau d'erreur dans la modale (pas d'échec muet).
**Règle métier :** Modèles conformes à la législation française ; majorité (art.) portée par le modèle.

### TC-AG-025 : Annuler le déroulé d'une séance (repli in_progress)
**Priorité :** P2
**Type :** Fonctionnel / Régression
**Préconditions / jeu de données :** AG en `session_active` avec votes saisis.
**Étapes :**
1. Sur `/ag/[id]/session`, cliquer « Annuler le déroulé » → confirmer → **Attendu :** `ag_meetings.status = 'in_progress'`, `session_started_at` remis à null, brouillons de session purgés ; redirection vers `/ag/[id]/feuille-presence`.
**Cas limites :**
- Refuser la confirmation → rien n'est annulé.
- Reprise après annulation : on peut re-renseigner présences et re-démarrer la session sans données fantômes.
**Règle métier :** N/A (gestion d'erreur / reprise).

### TC-AG-026 : RLS — cloisonnement par copropriété
**Priorité :** P0
**Type :** Intégration / Sécurité
**Préconditions / jeu de données :** Compte démo, deux copros (Résidence Martin, Residence Paris Ivry).
**Étapes :**
1. Créer/consulter une AG sur Résidence Martin, puis changer de copro vers Residence Paris Ivry via `/portefeuille` → **Attendu :** la liste AG n'affiche QUE les AG de la copro courante (filtre `copro_id` + RLS).
2. Tenter d'ouvrir l'URL d'une AG d'une autre copro à laquelle l'utilisateur n'a pas accès → **Attendu :** données non chargées / accès refusé (RLS ON+FORCE).
**Cas limites :** Les votes, présences et résolutions ne fuient pas entre copros.
**Règle métier :** Isolation stricte des données par copropriété (RGPD + cloisonnement métier).

---

## Jeu de données requis (rappel)

- **Résidence Martin** (recommandée pour le parcours complet) : 6 copropriétaires, 7 lots, 1000 tantièmes, clés « Charges générales » + « Bâtiment A » + « Bâtiment B ». Idéale pour tester présences, pouvoirs, majorités art.24/25/26 et l'activation budget/ALUR/conseil.
- **Residence Paris Ivry** : copro partielle (clé générale à 0) — utile pour les cas dégradés (annexes incomplètes, convocation à ne pas envoyer).
- **Le Clos Saint-Michel** (id `22222222…`) : copro finance de référence (« boucle d'or ») pour vérifier les écritures du grand livre après activation des décisions (budget, ALUR D450-5/C105, appels de fonds).
- **HARNESS jetable** : `create_test_copro_seeded()` pour un cycle AG complet destructif sans polluer les copros de référence (recommandé pour TC-AG-015 à TC-AG-021 et le test d'idempotence TC-AG-017).
- Compte : `lyes.triki@coproflex.fr` / `password123` (« Jean Dupont »), seul utilisateur, rôle gestionnaire.
- Pour les majorités : prévoir au moins une résolution de chaque type (art.24, art.25 + passerelle, art.26 + passerelle, unanimité) à l'ordre du jour, et une AGO arrêtant les comptes pour la garde 471/472 (TC-AG-018).
