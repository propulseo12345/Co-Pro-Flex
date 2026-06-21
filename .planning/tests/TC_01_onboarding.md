# Plan de test — Onboarding (création + configuration d'une copropriété)

> Objectif : tester de bout en bout le parcours d'onboarding (l'assistant en 8 étapes
> qui crée une copropriété puis la configure jusqu'à pouvoir l'exploiter). On vérifie à
> la fois ce qui s'affiche à l'écran ET, dès qu'il y a de la finance, l'effet réel dans
> le grand livre (le journal comptable légal de la copro).
>
> Environnement : app lancée en local (`npm run dev`) pointant sur le cloud live Supabase
> `qqfqrcolzmcbsvfaumiq`. Compte démo unique : `lyes.triki@coproflex.fr` / `password123`
> (bouton « Connexion démo » sur `/auth/login`). Nom affiché : « Jean Dupont ».

---

## Périmètre & écrans canoniques

L'onboarding est une suite linéaire. Voici ce qui est réellement câblé et donc à tester :

| Route | Rôle | Composant réel |
|-------|------|----------------|
| `/onboarding` | Liste des copros en cours de configuration + bouton « Nouvelle copropriété » + suppression | `onboarding/page.tsx` |
| `/onboarding/create` | **Étape 1 — Identité** (crée la copro en base via RPC `create_copro`, puis redirige vers le wizard) | `Step1Copropriete` |
| `/onboarding/[id]` | **Wizard étapes 2 à 8** (une seule page, les étapes sont des panneaux affichés/masqués) | `[id]/page.tsx` orchestre `Step2…Step8` + `RepriseSoldes` |

Les 8 étapes du wizard (ordre imposé, source `ONBOARDING_STEPS`) :

1. **Copropriété** (Identité) — faite sur `/onboarding/create`, pas rejouée dans le wizard.
2. **Copropriétaires** — ajout rapide (nom obligatoire) ; liste les copropriétaires existants (utile en reprise de mandat).
3. **Lots & Clés** — auto-amorçage : crée 1 « Charges générales » (clé générale) si absente, puis 1 lot par copropriétaire saisi à l'étape 2 ; colonne TANTIÈMES éditable = la clé générale ; clés spéciales possibles (toutes les lots ou un sous-ensemble).
4. **Comptes bancaires** — 2 modes : « Connecter ma banque » (Open Banking) ou « Saisie manuelle » ; crée le compte courant (512000) et le fonds travaux ALUR (512100).
5. **Budget prévisionnel** — postes (prédéfinis ou personnalisés) rattachés à une clé ; étape « passable » ; crée un budget `draft`.
6. **AG & Appels** — fréquence (annuel/semestriel/trimestriel), nombre d'appels déjà émis, date d'AG, prévisualisation éditable ; **post-as-you-go : les appels sont réellement émis ici** (écritures D 450-1 / C 701).
7. **Reprise de soldes** — solde d'entrée (banque, réserves, fournisseurs, reports) + soldes par lot (courant/travaux/ALUR/avance) ; équilibre via comptes d'attente 471/472.
8. **Finalisation** — audit lecture seule (2 erreurs bloquantes possibles) + preuve d'appel émis ; clôt l'onboarding et renvoie vers `/portefeuille`.

Règles de navigation importantes (issues du code, à connaître pour tester juste) :
- On ne peut cliquer dans le stepper que sur une étape **déjà atteinte** (`maxStepReached`). On ne saute pas en avant.
- Les boutons « Continuer » sont **désactivés** tant que la condition minimale n'est pas remplie (ex. au moins 1 copropriétaire à l'étape 2, au moins 1 lot à l'étape 3).
- L'état d'avancement est persistant en base (`onboarding_step` / `onboarding_max_step`) : on peut quitter et reprendre plus tard depuis `/onboarding`.

---

## Écrans morts / doublons (NE PAS tester)

À recenser, sans écrire de cas de test dessus :

- **`/onboarding/new`** : simple redirection vers `/onboarding/create`. Route dépréciée. (Vérifier juste qu'elle redirige — couvert en une ligne dans TC-ONB-002.)
- **`StepDocuments.tsx`, `StepContracts.tsx`, `StepCarnetEntretien.tsx`** (+ leurs `.module.css`) : composants d'anciennes étapes **jamais importés** par la page wizard. Code mort. Ne pas tester.
- **`postOnboardingOpeningBalances()`** (api.ts) : ancienne fonction de reprise (source_type `opening_balance`). **Plus appelée** par le wizard — Step8 ne poste plus rien et la reprise passe désormais par `setOnboardingOpeningBalance` (moteur `set_opening_balance`). Code mort à ne pas tester via l'UI.
- **`RepriseAlertCard` / `RepriseAlertModal`** : bandeau d'alerte affiché sur **`/portefeuille`** pour compléter une reprise restée déséquilibrée APRÈS l'onboarding. C'est une fonctionnalité **distincte** du wizard (chemin « finir une reprise plus tard »), à tester dans le domaine Portefeuille/Finance, pas ici. Mentionné pour mémoire ; un cas de transition est tout de même tracé en TC-ONB-019.
- **« Connecter ma banque » (Open Banking, `useBankConnect`)** : dépend d'un fournisseur externe (institutions, redirection bancaire) non disponible en environnement de test live démo. On teste le **choix** du mode et le repli « Saisie manuelle » ; le flux de connexion réel est hors périmètre fonctionnel testable ici (noté en cas limite de TC-ONB-008).

---

## Cas de test

### Étape 1 — Identité de la copropriété + liste

## TC-ONB-001 : Créer une nouvelle copropriété (happy path étape 1)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté en démo (Jean Dupont). Aller sur `/onboarding`.
**Étapes :**
1. Cliquer « Nouvelle copropriété » → **Attendu :** arrivée sur `/onboarding/create`, formulaire « Créer la copropriété ».
2. Saisir Nom = « Résidence Test Onboarding », Adresse = « 10 rue de Test », Code postal = « 75011 », Ville = « Paris », laisser Mois de début d'exercice = Janvier → **Attendu :** aucun message d'erreur sous les champs.
3. Cliquer « Créer et continuer » → **Attendu :** bouton passe en « Création… », puis redirection vers `/onboarding/[id]` à l'**étape 2**. En base : 1 ligne `copros` (cabinet = celui du gestionnaire), 1 membership `gestionnaire`, et le plan comptable canonique provisionné (RPC `create_copro` transactionnelle).
4. Revenir sur `/onboarding` → **Attendu :** une carte « Résidence Test Onboarding » apparaît avec barre de progression « Étape 2 / 8 — Copropriétaires ».
**Cas limites :** champs obligatoires vides → messages « est obligatoire » sous chaque champ, pas de création. Code postal : seuls les chiffres acceptés, max 5. Erreur serveur (ex. pas de cabinet rattaché) → message affiché sous le champ Nom, pas de redirection.
**Règle métier :** la création passe par `create_copro` (SECURITY DEFINER) car l'INSERT direct est impossible (la policy RLS exige une membership qui n'existe pas encore — amorçage poule & œuf).

## TC-ONB-002 : Champs optionnels d'identité + route /onboarding/new dépréciée
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté en démo, sur `/onboarding/create`.
**Étapes :**
1. Remplir les champs obligatoires + Année de construction = « 1987 » + Nom du syndic sortant = « Cabinet Ancien Syndic » + Mois de début d'exercice = « Juillet » → **Attendu :** formulaire accepte les valeurs.
2. Cliquer « Créer et continuer » → **Attendu :** copro créée ; en base `annee_construction=1987`, `previous_syndic_name` renseigné, `exercice_debut=7`.
3. Dans la barre d'adresse, aller sur `/onboarding/new` → **Attendu :** redirection automatique vers `/onboarding/create` (route morte mais inoffensive).
**Cas limites :** Année de construction hors bornes (avant 1700 ou après année+5) ; mois de début = juillet ⇒ vérifier plus tard (étape 5/6) que l'exercice généré couvre juillet→juin et non janvier→décembre.
**Règle métier :** `exercice_debut` pilote le calcul de l'exercice comptable (exercice décalé possible, pas seulement civil).

## TC-ONB-003 : Reprise d'un onboarding en cours
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Une copro en onboarding existe (ex. issue de TC-ONB-001), avancée jusqu'à l'étape 3 ou plus.
**Étapes :**
1. Aller sur `/onboarding` → **Attendu :** la carte affiche l'étape courante et le pourcentage.
2. Cliquer « Reprendre » → **Attendu :** ouverture de `/onboarding/[id]` directement à l'étape précédemment atteinte (pas un retour à l'étape 2).
3. Dans le stepper, cliquer une étape ANTÉRIEURE déjà atteinte → **Attendu :** navigation autorisée vers cette étape.
4. Tenter de cliquer une étape POSTÉRIEURE non atteinte → **Attendu :** clic sans effet (navigation interdite).
**Cas limites :** rafraîchir la page en plein wizard → l'état est rechargé depuis la base, on retombe à la même étape.

## TC-ONB-004 : Supprimer une copropriété en onboarding depuis la liste
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Une copro **en onboarding** existe (jamais finalisée), de préférence une copro jetable créée pour le test.
**Étapes :**
1. Sur `/onboarding`, cliquer l'icône corbeille d'une carte → **Attendu :** confirmation « Supprimer « <nom> » et toutes ses données ? Cette action est irréversible. ».
2. Confirmer → **Attendu :** la carte disparaît de la liste. En base : la copro et ses enfants (plan comptable, périodes, écritures…) sont purgés dans l'ordre FK-safe (RPC `delete_onboarding_copro`).
3. Annuler sur une autre carte → **Attendu :** rien n'est supprimé.
**Cas limites :** échec serveur → la carte **reste** affichée (pas de retrait optimiste trompeur) et un bandeau d'erreur rouge apparaît. La RPC refuse de supprimer une copro qui n'est PLUS en onboarding (compta live) → vérifier qu'on ne peut pas détruire une copro finalisée par ce bouton.
**Règle métier :** suppression réservée aux copros en onboarding ; protège une comptabilité réelle.

### Étape 2 — Copropriétaires

## TC-ONB-005 : Ajouter des copropriétaires (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro fraîchement créée (TC-ONB-001), étape 2.
**Étapes :**
1. Vérifier l'état initial → **Attendu :** « Aucun copropriétaire ajouté », bouton « Continuer » désactivé.
2. Saisir Nom = « Durand », Prénom = « Marie », Email = « marie@test.fr », cliquer « Ajouter » → **Attendu :** ligne ajoutée au tableau, compteur « 1 copropriétaire », formulaire vidé. En base : 1 ligne `coproprietaires` (copro_id correct, `prefers_email=true` par défaut).
3. Ajouter 2 autres copropriétaires → **Attendu :** compteur « 3 copropriétaires », bouton devient « Continuer (3 copropriétaires) » actif.
4. Cliquer « Continuer » → **Attendu :** passage à l'étape 3.
**Cas limites :** Nom vide → bouton « Ajouter » désactivé, aucun ajout. Touche Entrée dans un champ = équivaut à « Ajouter ». Téléphone : chiffres seulement, max 10. Email facultatif (pas de blocage si absent).

## TC-ONB-006 : Supprimer un copropriétaire + erreurs de chargement
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro à l'étape 2 avec ≥ 2 copropriétaires.
**Étapes :**
1. Cliquer la corbeille d'une ligne → **Attendu :** ligne retirée du tableau, compteur décrémenté. En base : ligne `coproprietaires` supprimée.
2. Supprimer tous les copropriétaires → **Attendu :** retour à l'état vide, bouton « Continuer » re-désactivé.
**Cas limites :** si le chargement de la liste échoue (ex. session expirée) → bandeau « Impossible de charger les copropriétaires : … » (jamais confondre « liste vide » et « chargement KO »). L'ajout qui échoue côté serveur → bandeau d'erreur affichant la vraie raison, formulaire non vidé.

## TC-ONB-007 : Étape 2 affiche les copropriétaires existants (reprise de mandat)
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Une copro qui a DÉJÀ des copropriétaires (ex. « Résidence Martin » : 6 copropriétaires) et qui serait remise en onboarding, OU une copro de test où on a ajouté des copropriétaires puis quitté.
**Étapes :**
1. Reprendre l'onboarding et arriver à l'étape 2 → **Attendu :** le tableau pré-affiche les copropriétaires déjà en base (pas un tableau vide), avec le bon compteur.
2. Ajouter un copropriétaire supplémentaire → **Attendu :** il s'additionne aux existants.
**Cas limites :** ordre d'affichage par nom de famille croissant.
**Règle métier :** en reprise de mandat, on ne ressaisit pas les copropriétaires déjà connus.

### Étape 3 — Lots & Clés de répartition

## TC-ONB-008 : Auto-amorçage des lots (1 lot par copropriétaire) + clé générale
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro de test arrivée à l'étape 3 pour la **première fois**, avec 3 copropriétaires saisis à l'étape 2 et **aucun lot** encore créé.
**Étapes :**
1. Arriver sur l'étape 3 → **Attendu :** message transitoire « Préparation des lots… », puis une grille avec **3 lots** (Lot 1, Lot 2, Lot 3) chacun assigné à un copropriétaire de l'étape 2. En base : clé « Charges générales » (category=general, basis=tantiemes, couverture tous les lots) créée si absente + 3 lots avec leur ligne dans la clé générale.
2. Vérifier la KPI strip → **Attendu :** « Lots = 3 », « Tantièmes = 0 » (non encore saisis), « Clés spéciales » comptées.
**Cas limites :** ne PAS double-créer si on revient sur l'étape 3 (l'amorçage ne s'exécute que s'il y a 0 lot). Si 0 copropriétaire à l'étape 2, l'amorçage ne crée rien (mais l'étape 2 empêche déjà d'arriver là sans copropriétaire).
**Règle métier :** unité de gestion = le LOT ; chaque copropriétaire reçoit au moins un lot.

## TC-ONB-009 : Saisir les tantièmes de la clé générale
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Étape 3, lots amorcés (ex. 3 lots). Cible courante du projet : total 1000 tantièmes (cf. « Résidence Martin »).
**Étapes :**
1. Dans la colonne TANTIÈMES (= clé générale), saisir des poids pour chaque lot (ex. 400 / 350 / 250) → **Attendu :** chaque saisie est enregistrée (poids `repartition_key_lines` mis à jour), KPI « Tantièmes » se met à jour vers 1000.
2. Cliquer « Continuer » → **Attendu :** passage à l'étape 4 (le bouton n'exige que ≥ 1 lot, pas la complétude des tantièmes ici).
**Cas limites :** laisser un lot à 0 tantième → autorisé à ce stade (la complétude de clé est vérifiée plus tard, au moment d'émettre les appels). Total ≠ 1000 → toléré ici mais à surveiller (cohérence métier).
**Règle métier :** la colonne TANTIÈMES édite directement la clé « Charges générales ».

## TC-ONB-010 : Ajouter un lot manuel + ajouter une clé spéciale (sous-ensemble de lots)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Étape 3 avec lots existants (analogue à « Résidence Martin » : clés « Batiment A » / « Batiment B » sur certains lots).
**Étapes :**
1. Cliquer « Ajouter un lot », renseigner la modale (réf, type, propriétaire) → **Attendu :** nouveau lot dans la grille, assigné au copropriétaire choisi.
2. Cliquer « Ajouter une clé », créer « Batiment A » en couverture « certains lots » → **Attendu :** nouvelle colonne de clé ; seuls les lots du sous-ensemble peuvent recevoir un poids.
3. Saisir des poids dans cette clé pour 2 lots seulement → **Attendu :** poids enregistrés ; la clé est « complète » uniquement si la somme des poids des lots couverts est cohérente.
4. Modifier un lot (clic sur la ligne) puis le supprimer via la modale d'édition → **Attendu :** lot retiré, lignes de clés associées nettoyées.
**Cas limites :** clé « certains lots » sans aucun poids = incomplète → bloquera l'émission des appels à l'étape 6 si un poste budgétaire l'utilise. Supprimer le dernier lot → bouton « Continuer » re-désactivé (besoin d'au moins 1 lot).
**Règle métier :** une clé peut couvrir tous les lots (générale) ou un sous-ensemble (clé spéciale par bâtiment/escalier).

### Étape 4 — Comptes bancaires

## TC-ONB-011 : Saisie manuelle des comptes bancaires (courant + fonds ALUR)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro de test à l'étape 4.
**Étapes :**
1. État initial → **Attendu :** deux cartes de choix « Connecter ma banque » (badge Recommandé) et « Saisie manuelle » ; bouton « Continuer » désactivé tant qu'aucun mode n'est choisi.
2. Cliquer « Saisie manuelle » → **Attendu :** deux blocs : « Compte courant » (Obligatoire) et « Fonds travaux ALUR » (Obligatoire loi ALUR).
3. Renseigner banque/IBAN/BIC/solde initial pour les deux (ex. courant 5 000 €, ALUR 2 000 €) → **Attendu :** IBAN formaté par blocs de 4, BIC en majuscules (max 11).
4. Cliquer « Continuer » → **Attendu :** passage à l'étape 5. En base : 2 comptes `accounts` créés (code 512000 « Compte courant », 512100 « Fonds travaux ALUR », type asset, `initial_balance` renseigné).
**Cas limites :** repasser sur l'étape 4 et re-cliquer Continuer → **idempotent** : ne recrée pas les comptes déjà existants (512000/512100 déjà présents). Champs banque/IBAN laissés vides → comptes créés quand même (solde 0), pas de blocage dur.
**Règle métier :** le fonds travaux ALUR sur compte séparé est obligatoire depuis la loi ALUR (2014).

## TC-ONB-012 : Choix du mode « Connecter ma banque » (limites Open Banking)
**Priorité :** P3
**Type :** UI
**Préconditions / jeu de données :** Étape 4.
**Étapes :**
1. Cliquer « Connecter ma banque » → **Attendu :** écran « Choisissez votre banque » avec champ de recherche et liste d'institutions OU spinner « Chargement des banques… ».
2. Cliquer « Retour » → **Attendu :** retour à l'écran de choix des modes.
**Cas limites :** le flux complet (redirection bancaire, récupération des comptes, affectation courant/fonds) dépend d'un fournisseur externe **non disponible en test live démo** → ne pas viser un succès de connexion réelle ; en cas d'erreur, un panneau « Erreur de connexion » + « Réessayer » doit s'afficher (pas de plantage). Le mapping courant/fonds n'est testable que si le fournisseur renvoie des comptes.

### Étape 5 — Budget prévisionnel

## TC-ONB-013 : Construire un budget prévisionnel (postes prédéfinis)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro de test à l'étape 5, avec la clé « Charges générales » et des lots.
**Étapes :**
1. État initial → **Attendu :** bandeau « Passer cette étape » disponible ; liste de postes vide.
2. Cliquer « Ajouter un poste », choisir « Eau » dans le menu → **Attendu :** ligne « Eau » ajoutée, clé pré-sélectionnée = « Charges générales ».
3. Saisir 1 200 € pour Eau, ajouter « Assurance » à 800 €, « Honoraires syndic » à 2 000 € → **Attendu :** barre de total = 4 000 €, compteur « 3 postes ».
4. Cliquer « Continuer » → **Attendu :** passage à l'étape 6. En base : 1 budget `current` `draft` créé + 3 `budget_lines` avec le bon compte de charge (Eau→601, Assurance→616, Honoraires→621) et la clé renseignée.
**Cas limites :** montant 0 ou négatif sur un poste → la ligne est ignorée à l'enregistrement (seules les lignes label + montant > 0 + clé sont retenues). Re-créer le budget (revenir puis Continuer) → réutilise le même budget de la période (au plus 1 budget `current` par période).

## TC-ONB-014 : Poste personnalisé tombant sur le compte 628 (avertissement non bloquant)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Étape 5.
**Étapes :**
1. Cliquer « Ajouter un poste » puis « Poste personnalisé », saisir « Décoration hall » = 500 €, clé = Charges générales → **Attendu :** ligne éditable avec champ libellé.
2. Cliquer « Continuer » → **Attendu :** bandeau d'avertissement « Postes sans compte de charge dédié, imputés en 628 (Divers) : Décoration hall. » ; le bouton devient « Continuer malgré tout ».
3. Re-cliquer « Continuer malgré tout » → **Attendu :** passage à l'étape 6 (budget tout de même créé, poste imputé en 628).
**Cas limites :** plan comptable incomplet (compte 628 absent) → message d'erreur explicite « Plan comptable incomplet : compte 628 absent », pas de budget créé. Un poste prédéfini ne déclenche jamais ce warning.
**Règle métier :** chaque poste doit être rattaché à un compte de charge ; à défaut, repli sur 628 (Divers), modifiable plus tard dans les Paramètres.

## TC-ONB-015 : Passer l'étape budget (pas encore de budget voté)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Étape 5.
**Étapes :**
1. Cliquer « Passer cette étape » (ou « Continuer » sans aucun poste) → **Attendu :** passage à l'étape 6 sans budget créé.
2. Observer l'étape 6 → **Attendu :** message « Aucun budget n'a été créé à l'étape précédente. Les appels de fonds seront créés plus tard », seul un bouton « Continuer » disponible (pas de configuration d'appels).
**Cas limites :** sans budget, aucun appel ne peut être émis ; vérifier que la finalisation (étape 8) ne réclame PAS d'appel émis dans ce cas (pas de budget validé ⇒ pas de blocage NO_ISSUED_CALL).

### Étape 6 — AG & Appels de fonds (post-as-you-go)

## TC-ONB-016 : Émettre les appels de fonds trimestriels (happy path + grand livre)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Copro de test arrivée à l'étape 6 avec un budget créé (ex. 4 000 € sur clé Charges générales complète) et des tantièmes saisis (clé complète).
**Étapes :**
1. Vérifier le bandeau budget → **Attendu :** « Budget annuel : 4 000 € → 1 000 € / trimestre » (avec fréquence trimestrielle par défaut).
2. Laisser Fréquence = Trimestriel, « Aucun » appel déjà émis, saisir une Date d'AG → **Attendu :** bouton « Voir les appels (4) » activé une fois la date renseignée.
3. Cliquer « Voir les appels » → **Attendu :** prévisualisation de 4 appels (T1…T4) avec dates d'émission/échéance pré-calculées (ancrées sur le début d'exercice) et 1 000 € chacun, total 4 000 €.
4. Cliquer « Valider ces 4 appels » → **Attendu :** bouton « Émission… » puis passage à l'étape 7. En base : 4 `call_for_funds` (status émis, non draft/cancelled) + écritures grand livre **D 450-1 (par lot, au prorata des tantièmes) / C 701** pour chaque appel ; budget passé en `validated`.
**Cas limites :** dates éditables ligne par ligne avant validation. **Idempotence** : si on revient et re-valide, seules les échéances manquantes sont repostées (pas de doublon). Clé de répartition incomplète → erreur « Clé de répartition incomplète — complétez la répartition avant d'émettre les appels » AVANT tout postage (état partiel évité).
**Règle métier :** appel de fonds budgété = D 450-1/lot agrégé · C 701 (compta d'engagement, partie double).

## TC-ONB-017 : Reprise en cours d'exercice — appels déjà émis
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Étape 6 avec budget créé, fréquence trimestrielle.
**Étapes :**
1. Indiquer « 2 (T1, T2) » appels déjà émis → **Attendu :** « Voir les appels (2) » ne génère que les 2 appels RESTANTS (T3, T4).
2. Valider → **Attendu :** seuls T3 et T4 sont postés en base (T1/T2 supposés gérés par l'ancien syndic et repris via l'étape 7).
**Cas limites :** si « tous » les appels sont déjà émis (alreadyDone = total) → bouton « Continuer » direct, aucun appel posté. Changer la fréquence remet « déjà émis » à 0 si la valeur dépasse le nouveau total.
**Règle métier :** ne pas re-émettre des appels déjà envoyés par le syndic sortant.

## TC-ONB-018 : Exercice décalé — dates d'appels ancrées sur le mois de début d'exercice
**Priorité :** P2
**Type :** Intégration
**Préconditions / jeu de données :** Copro créée avec Mois de début d'exercice = Juillet (cf. TC-ONB-002), arrivée à l'étape 6 avec budget.
**Étapes :**
1. Fréquence trimestrielle, voir les appels → **Attendu :** dates d'émission ancrées sur juillet (T1 = juillet, T2 = octobre, T3 = janvier, T4 = avril), pas sur janvier.
**Cas limites :** la période comptable créée doit couvrir juillet N → juin N+1 ; vérifier la cohérence entre période (étape 5/7) et dates d'appels.
**Règle métier :** l'exercice peut être décalé ; les échéances suivent le mois de début d'exercice (`exercice_debut`).

### Étape 7 — Reprise de soldes

## TC-ONB-019 : Reprise plein exercice — soldes globaux + soldes par lot équilibrés
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Copro de test à l'étape 7 avec lots et comptes bancaires créés. Cas équilibré (l'actif = le passif + créances).
**Étapes :**
1. Observer le bloc « Comptes essentiels » → **Attendu :** une ligne par compte bancaire créé (512000/512100), + champs Fonds travaux ALUR (105), Dettes fournisseurs (401), Report courant (478), Report travaux (12).
2. Saisir banque courant = 5 000, fonds ALUR = 2 000, etc. ; puis dans « Soldes par lot » saisir des créances courant/travaux/ALUR par lot dont la somme équilibre l'actif.
3. Observer l'indicateur d'équilibre → **Attendu :** quand le net 471/472 ≈ 0, bandeau vert « Reprise équilibrée — rien en attente (471/472) ».
4. Cliquer « Enregistrer et continuer » → **Attendu :** passage à l'étape 8. En base : une transaction `opening_onboarding`/`set_opening_balance` postée à la date = 1er jour de la période, écritures équilibrées avec contrepartie 471/472 ≈ 0.
**Cas limites :** déséquilibre → bandeau orange « Reste à imputer (471/472) : <montant> » (non bloquant, invite à chercher la cause). Ré-ouvrir l'étape 7 puis ré-enregistrer → les valeurs saisies sont **ré-hydratées** correctement (banque/autres/charges-produits) et ne sont pas effacées.
**Règle métier :** convention de signe — positif = le copropriétaire/l'actif doit ; négatif = avoir/passif ; l'avance (103) tracée à part, hors solde affiché.

## TC-ONB-020 : Reprise en cours d'année — charges/produits déjà courus
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Étape 7.
**Étapes :**
1. Cocher « Reprise en cours d'année » → **Attendu :** apparition d'un champ « Date de reprise » + deux colonnes Charges (6xx) / Produits (7xx).
2. Saisir une date de reprise dans l'exercice + quelques montants de charges/produits déjà courus → **Attendu :** ces lignes entrent dans la reprise (charges au débit, produits au crédit).
3. Enregistrer → **Attendu :** écritures incluant les 6xx/7xx ; date de reprise bornée à l'exercice (clamp si hors [start, end]).
**Cas limites :** section « Autres comptes (classes 1 à 5) » repliable : montants saisis là doivent être conservés à la ré-ouverture. La case « Reprise en cours d'année » ne doit PAS se re-cocher seule à la ré-ouverture d'une reprise plein-exercice.

## TC-ONB-021 : Passer l'étape de reprise
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Étape 7.
**Étapes :**
1. Cliquer « Passer » → **Attendu :** passage à l'étape 8 sans aucune écriture de reprise.
**Cas limites :** vérifier qu'aucune transaction `opening` parasite n'est créée par le simple fait de passer.

### Étape 8 — Finalisation

## TC-ONB-022 : Finaliser l'onboarding (happy path complet)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Copro de test ayant traversé toutes les étapes avec un grand livre cohérent (budget validé + appels émis OU étape budget passée).
**Étapes :**
1. Sur l'étape 8, lire le texte explicatif → **Attendu :** mention « une reprise incomplète (471/472 ≠ 0) n'empêche pas de terminer ».
2. Cliquer « Vérifier et terminer » → **Attendu :** bouton « Vérification… », audit lecture seule lancé (aucune nouvelle écriture postée). Si tout est propre → redirection vers `/portefeuille`. En base : `onboarding_step`/`onboarding_max_step` mis à NULL (la copro sort de l'onboarding).
3. Sur `/portefeuille` → **Attendu :** la copro apparaît désormais comme copro exploitable (plus dans la liste `/onboarding`).
**Cas limites :** un résidu 471/472 ≠ 0 affiche un avertissement orange avec lien « Compléter maintenant » (rouvre l'étape 7) MAIS n'empêche pas la finalisation. Les avertissements non bloquants (LOT_GL_MISMATCH, CALL_VS_BUDGET_MISMATCH) sont listés sans bloquer.

## TC-ONB-023 : Blocage — budget validé mais aucun appel émis (NO_ISSUED_CALL)
**Priorité :** P0
**Type :** Régression
**Préconditions / jeu de données :** Copro où un budget a été créé et validé mais sans appel émis (ex. on est passé en étape 6 sans valider d'appels alors qu'un budget existe — à provoquer si possible, sinon via re-ouverture).
**Étapes :**
1. Sur l'étape 8, cliquer « Vérifier et terminer » → **Attendu :** message bloquant « Un budget a été validé mais aucun appel n'a été émis. Revenez à l'étape AG & Appels… », **pas** de redirection.
2. Revenir à l'étape 6, émettre les appels, revenir à l'étape 8 et re-vérifier → **Attendu :** finalisation débloquée.
**Cas limites :** si AUCUN budget validé (étape budget passée) → ce blocage ne s'applique pas (faux positif évité sur plan vide).
**Règle métier :** un budget validé implique qu'un échéancier était voulu ; finaliser sans appel émis laisserait la copro sans recettes.

## TC-ONB-024 : Blocage — écart structurel du grand livre (LEDGER_UNBALANCED / LOT_ID_MISSING_45X)
**Priorité :** P1
**Type :** Régression
**Préconditions / jeu de données :** Copro dont le grand livre présenterait une faute de la liste blanche (écriture déséquilibrée, ou créance 45x sans lot). Ces fautes sont normalement empêchées par les triggers DB — c'est un test du dernier rempart.
**Étapes :**
1. Sur l'étape 8, « Vérifier et terminer » → **Attendu :** encart rouge « N écart(s) bloquant(s) — corrigez avant de terminer » listant `LEDGER_UNBALANCED` et/ou `LOT_ID_MISSING_45X` ; pas de finalisation.
**Cas limites :** seules ces 2 fautes bloquent ; tout le reste (mismatch de réconciliation, 471/472) est un avertissement. Ce cas est difficile à provoquer par l'UI normale (triggers anti-corruption) → si non reproductible en boîte noire, le marquer « non testable par l'UI, couvert par les triggers DB + tests unitaires `finalisation-rules.test.ts` ».
**Règle métier :** `audit_finance_integrity` + liste blanche `BLOCKING_ISSUE_TYPES` (LEDGER_UNBALANCED, LOT_ID_MISSING_45X).

## TC-ONB-025 : Parcours complet de bout en bout (smoke test E2E)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Aucune copro de test préexistante (on en crée une dédiée, à supprimer après).
**Étapes :**
1. `/onboarding` → Nouvelle copropriété → créer (étape 1) → **Attendu :** redirection wizard étape 2.
2. Ajouter 3 copropriétaires (étape 2) → Continuer.
3. Vérifier 3 lots amorcés, saisir tantièmes (étape 3) → Continuer.
4. Saisie manuelle 2 comptes bancaires (étape 4) → Continuer.
5. Budget 3 postes prédéfinis (étape 5) → Continuer.
6. Appels trimestriels, AG datée, valider 4 appels (étape 6) → Continuer.
7. Reprise équilibrée (étape 7) → Enregistrer et continuer.
8. Finalisation (étape 8) → Vérifier et terminer → **Attendu :** arrivée sur `/portefeuille`, copro exploitable, plus en onboarding.
9. (Nettoyage) Si la copro est encore en onboarding (test interrompu), la supprimer depuis `/onboarding`.
**Cas limites :** mesurer qu'à chaque « Continuer » l'état est persisté (rafraîchir au milieu = reprise au bon endroit). Cohérence finale grand livre : Σ débit = Σ crédit ; appels D 450-1 / C 701 ; reprise via 471/472.
**Règle métier :** valide l'ensemble de la chaîne d'onboarding et la sortie vers l'exploitation.

---

## Jeu de données requis (rappel)

- **Compte démo** : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`). Nom affiché « Jean Dupont ». Seul utilisateur.
- **Copro de test dédiée** : pour les cas de création/suppression, créer une copro jetable (ex. « Résidence Test Onboarding ») et la supprimer en fin de test via `/onboarding` (corbeille) tant qu'elle est en onboarding.
- **« Résidence Martin »** : copro la plus complète (6 copropriétaires, 7 lots, clés « Charges générales » + « Batiment A » + « Batiment B », 1000 tantièmes) — référence pour la structure lots/clés et la reprise des copropriétaires existants (TC-ONB-007).
- **« Residence Paris Ivry »** : copro partielle (6 copropriétaires, 6 lots, clé générale à 0) — utile pour tester un état incomplet.
- **« Le Clos Saint-Michel » (22222222…)** : boucle d'or finance de référence (exercice ouvert) — comparaison de cohérence grand livre.
- **`create_test_copro_seeded()`** : RPC qui clone une copro jetable « HARNESS » pour les tests destructifs.
- **Exercice décalé** : pour TC-ONB-018, créer une copro avec Mois de début d'exercice = Juillet.

### Notes pour l'exécutant
- En finance, toujours croiser l'écran ET le grand livre (table `ledger_transactions` / `ledger_entries` sur le cloud) : un écran « vert » ne prouve pas une écriture équilibrée.
- L'idempotence est un thème récurrent (étapes 4, 6, 7) : re-jouer une action ne doit jamais créer de doublon.
- Ne pas tester les écrans morts listés plus haut.
