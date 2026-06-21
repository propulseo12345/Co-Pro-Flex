# Plan de test — Dashboard & Portefeuille (multi-copro)

> Domaine : point d'entrée du gestionnaire. Connexion (démo) → Portefeuille (liste des copros) → choix de la copro active → Dashboard (KPIs / alertes / raccourcis).
> Environnement : `npm run dev` en local pointant sur le cloud live Supabase `qqfqrcolzmcbsvfaumiq`. Compte démo unique `lyes.triki@coproflex.fr` (affiché « Jean Dupont »).

---

## Périmètre & écrans canoniques

Ce qui est réellement câblé et utilisé dans le produit, à tester :

| Écran / route | Rôle | Source de données |
|---|---|---|
| `/auth/login` (bouton « Connexion démo ») | Point d'entrée, ouvre la session démo | Supabase Auth |
| `(gestionnaire)/portefeuille` | Liste des copros gérées + KPIs consolidés + alertes reprise ; on y **choisit la copro active** | table `copros` + vue `v_dashboard_kpis` (via `usePortefeuille`) |
| `(dashboard)/dashboard` | Tableau de bord d'**une** copro (la copro active) : trésorerie, AG, budget, ODS, priorités, activité | `fn_dashboard_kpis` + vues `v_dashboard_*` (via `useDashboardData`) |
| Bandeau « opérations de travaux à apurer » sur le dashboard | Alerte de découvrabilité (soldes travaux 12 non affectés) | `useWorksPendingSettlement` |
| Sidebar gestionnaire (`GestionnaireSidebar`) | Navigation du niveau cabinet (Portefeuille / Onboarding / etc.) | `navigationGestionnaire.ts` |
| Sidebar copro (`UnifiedSidebar`) | Lien « ◄ Portefeuille » de retour + nom de la copro active + recherche | `CoproContext` |

**Mécanique de la copro active (important pour les tests) :**

- Cliquer une ligne de copro dans le portefeuille appelle `setActiveCopro(id, nom)` qui **écrit dans `sessionStorage`** (clés `coproflex_active_copro_id` / `coproflex_active_copro_name`) + un cache mémoire, puis pousse vers `/dashboard`.
- Le brief parle de `localStorage` : c'est en réalité **`sessionStorage`** (vérifié dans `src/lib/copro/activeCopro.ts`). Conséquence concrète : la copro choisie **persiste tant que l'onglet reste ouvert** (rafraîchissement OK), mais **se perd si on ferme l'onglet** ou ouvre un nouvel onglet.
- Au tout premier chargement **sans sélection préalable** (session vierge), la copro active = **la première copro par date de création**. Sur le cloud actuel, c'est **« Residence Paris Ivry »** (et non Résidence Martin).
- Le `CoproContext` est en **mode « single copro »** : il n'y a pas de menu déroulant de copro dans la sidebar copro (le sélecteur multi-copro est désactivé dans le code). On change de copro **uniquement en repassant par le portefeuille**.

**État réel des données cloud (au moment de la rédaction) :** les deux copros ont des KPIs financiers à 0 (aucune écriture postée) et **aucune AG**. Le dashboard tombe donc sur son **état vide « Bienvenue sur CoProFlex »** pour les deux. Les cas qui supposent des KPIs non nuls sont marqués comme nécessitant un jeu de données enrichi (boucle d'or 22222222 ou copro HARNESS).

---

## Écrans morts / doublons (NE PAS tester)

Ne PAS écrire de cas de test sur ces écrans : ils ne sont pas câblés, sont des coquilles vides, ou des doublons non utilisés dans le parcours canonique.

| Écran / route | Pourquoi on ne le teste pas |
|---|---|
| `(gestionnaire)/agenda` | `PlaceholderPage` — page « Agenda global » vide, rien à tester. |
| `(gestionnaire)/reporting` | `PlaceholderPage` — page « Reporting » vide. |
| `(gestionnaire)/facturation` | `PlaceholderPage` vide. |
| `(gestionnaire)/modeles` | `PlaceholderPage` vide. |
| `(gestionnaire)/prestataires` | `PlaceholderPage` vide. |
| `(gestionnaire)/parametres-cabinet` | `PlaceholderPage` vide. |
| `CoproSelector` (composant dans `CoproContext.tsx`) | Désactivé (`SINGLE_COPRO_MODE = true`) — n'affiche que le nom, pas de dropdown. |
| Bloc « Maintenance » de `PortefeuilleSummary` (avatars JD/ML/+4) | Données **factices en dur** (avatars codés, texte dérivé de `facturesEnRetard` qui vaut toujours 0). Cosmétique mort. |
| KPI portefeuille « Encaisse Totale » tendance `+4.2%` | Valeur **codée en dur**, pas un vrai calcul. |
| Bouton « Voir tout le flux » (panneau Actions Critiques du portefeuille) | Aucun handler, ne navigue nulle part. |
| `(dashboard)/ag/dashboard` | C'est le **tableau de bord des AG** (module AG), pas le dashboard principal. Couvert par le domaine AG, hors périmètre ici. |
| Lien « Voir les N tâches » / « Tout voir » (Bento Priorités / Activité) | Volontairement **masqués** (`/tasks` et `/activity` n'existent pas — commentaires « TODO go-live » dans le code). |

---

## Cas de test

### Connexion & arrivée sur le portefeuille

## TC-DASH-001 : Connexion démo 1-clic puis arrivée sur le portefeuille
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Déconnecté. Page `/auth/login` ouverte. Compte démo Jean Dupont.
**Étapes :**
1. Cliquer le bouton « Connexion démo ». → **Attendu :** authentification réussie, redirection vers une page protégée du gestionnaire (portefeuille ou dashboard), aucun message d'erreur.
2. Naviguer vers `/portefeuille` (ou s'y trouver déjà). → **Attendu :** le titre « Mon Portefeuille » s'affiche, le sous-titre indique « Vue consolidée de vos 2 copropriétés », et la liste montre 2 lignes : « Residence Paris Ivry » et « Résidence Martin ».
3. Observer le pied de la sidebar. → **Attendu :** « Jean Dupont » / « Syndic professionnel ».
**Cas limites :** session déjà ouverte (ne pas redemander le login) ; double-clic sur le bouton (pas de double session ni d'erreur).
**Règle métier :** compte démo de pré-vente, à retirer avant mise en production réelle (mot de passe en clair).

## TC-DASH-002 : Accès direct à une page protégée sans être connecté
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Déconnecté (vider la session). 
**Étapes :**
1. Ouvrir directement `/portefeuille` dans la barre d'adresse. → **Attendu :** redirection vers `/auth/login` (garde de layout gestionnaire, défense en profondeur).
2. Ouvrir directement `/dashboard`. → **Attendu :** redirection vers `/auth/login`.
**Cas limites :** session expirée en cours d'utilisation → au prochain chargement, retour login (pas d'écran blanc, pas de données d'une autre session).
**Règle métier :** RLS + garde serveur ; un anonyme ne doit voir aucune donnée copro.

---

### Portefeuille — liste, KPIs consolidés, recherche

## TC-DASH-003 : En-tête du portefeuille — nombre de copros et de lots
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, sur `/portefeuille`. 2 copros (6 + 7 lots = 13 lots réels).
**Étapes :**
1. Lire le sous-titre de l'en-tête. → **Attendu :** « Vue consolidée de vos 2 copropriétés · N lots ».
**Cas limites / bug attendu :** le hook `usePortefeuille` met `nombreLots = 0` pour **chaque** copro (il ne requête jamais la table `lots`). Le sous-titre affiche donc **« · 0 lots »** au lieu de « · 13 lots ». **À signaler comme anomalie** : compteur de lots toujours à zéro sur le portefeuille.
**Règle métier :** le portefeuille consolide le parc ; un compteur de lots faux décrédibilise la vue cabinet.

## TC-DASH-004 : Bandeau KPIs consolidés du portefeuille (4 cartes)
**Priorité :** P1
**Type :** UI / Fonctionnel
**Préconditions / jeu de données :** Connecté, `/portefeuille`. Données cloud actuelles (KPIs à 0).
**Étapes :**
1. Observer les 4 cartes KPI. → **Attendu :** « Encaisse Totale » = somme des soldes des copros (0 € avec les données actuelles), « Taux Recouvrement » = 100,0 % (vert « Excellent ») car aucun impayé, « Impayés Totaux » = 0 € (« Aucun impayé », carte verte), « Rapprochement » = 0 (« mvts non rapprochés »).
**Cas limites :** carte « Impayés » passe en rouge dès qu'une copro a un impayé > 0 ; carte « Taux » passe en orange si < 90 %. La tendance « +4.2 % » de l'Encaisse est codée en dur (cosmétique, ne pas vérifier comme un vrai calcul).
**Règle métier :** KPIs dérivés du grand livre (`v_dashboard_kpis`) — source unique de vérité ; tout chiffre doit être cohérent avec la fiche copro.

## TC-DASH-005 : Cohérence KPIs portefeuille ↔ somme des lignes copro
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Connecté, `/portefeuille`. Idéalement une copro enrichie (boucle d'or / HARNESS) ajoutée pour avoir des montants non nuls.
**Étapes :**
1. Relever le « Solde Global » affiché sur chaque ligne de copro. → **Attendu :** la carte « Encaisse Totale » du haut = la somme arithmétique de ces soldes.
2. Relever les impayés par copro (si visibles via le dashboard de chacune). → **Attendu :** « Impayés Totaux » et « X copro. concernées » cohérents.
**Cas limites :** arrondis (les lignes affichent 2 décimales, les cartes 0 décimale) ; une copro à solde négatif doit faire baisser l'Encaisse Totale.
**Règle métier :** consolidation = somme exacte, pas d'écart inexpliqué.

## TC-DASH-006 : Liste des copropriétés — contenu d'une ligne
**Priorité :** P1
**Type :** UI
**Préconditions / jeu de données :** Connecté, `/portefeuille`.
**Étapes :**
1. Observer la ligne « Résidence Martin ». → **Attendu :** icône immeuble, nom « Résidence Martin », adresse (concaténation adresse/ville/CP, ou « Adresse non renseignée » si vide), « Solde Global » formaté en € (0,00 € actuellement), un compteur d'alertes critiques, un compteur maintenance, et « Date AG » (« — » si aucune AG), un chevron à droite.
2. Vérifier le badge du titre de section. → **Attendu :** « Copropriétés — 2 UNITÉS ».
**Cas limites / anomalies attendues :** les compteurs « alertes critiques » et « maintenance » sont **toujours 0** (le hook ne remplit jamais `alertes` ni `facturesEnRetard`) → à signaler comme placeholders. « Date AG » montre « — » pour les 2 copros (aucune AG en base).
**Règle métier :** unité de gestion = la copro ; la ligne doit refléter l'état réel (solde du grand livre, prochaine AG).

## TC-DASH-007 : Recherche d'une copropriété
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, `/portefeuille`, 2 copros.
**Étapes :**
1. Taper « martin » dans le champ « Rechercher une adresse, un nom... ». → **Attendu :** seule « Résidence Martin » reste affichée (filtrage insensible à la casse, sur nom OU adresse).
2. Taper « paris » (ville présente sur les deux). → **Attendu :** les copros dont l'adresse contient « paris » apparaissent.
3. Taper « zzzzz » (aucun résultat). → **Attendu :** état vide « Aucune copropriété ne correspond à votre recherche » avec icône immeuble.
4. Vider le champ. → **Attendu :** la liste complète revient.
**Cas limites :** espaces, accents (« résidence » vs « residence ») ; le badge « N UNITÉS » suit le nombre filtré.
**Règle métier :** —

## TC-DASH-008 : Alerte « reprise d'onboarding à terminer »
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, `/portefeuille`. Cas nominal : aucune copro avec reprise incomplète → aucune alerte. Cas enrichi : une copro avec écritures `source_type = 'opening_onboarding'` dont le net 471/472 ≠ 0.
**Étapes :**
1. Charger le portefeuille avec les données actuelles. → **Attendu :** **aucune** carte d'alerte reprise (le net 471/472 onboarding est nul / inexistant).
2. (Cas enrichi) Sur une copro avec reprise incomplète, recharger. → **Attendu :** une carte d'alerte reprise apparaît avec le nom de la copro et le résidu signé ; cliquer ouvre la modale `RepriseAlertModal`.
**Cas limites / régression clé :** un **virement non identifié** (suspens opérationnel 471/472 **hors** onboarding) ne doit **PAS** déclencher l'alerte (le calcul ne somme que les transactions `opening_onboarding`). Seuil de déclenchement : |net| ≥ 0,01 €.
**Règle métier :** reprise de mandat ; le grand livre est la source de vérité du résidu.

## TC-DASH-009 : Bloc « Prochaines AG » du portefeuille
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** Connecté, `/portefeuille`. Aucune AG en base actuellement.
**Étapes :**
1. Observer la carte « Prochaines AG » (bas de page). → **Attendu :** « Aucune AG programmée » (car `prochaineAG` vide pour les 2 copros).
2. (Cas enrichi) Avec au moins une copro ayant une `next_ag_date` future. → **Attendu :** jusqu'à 3 copros listées, triées par date AG croissante, la plus proche en couleur « soon ».
**Cas limites :** plus de 3 AG → seules les 3 plus proches s'affichent ; format de date « 12 juin ».
**Règle métier :** —

## TC-DASH-010 : Bouton « Nouvelle copropriété » (onboarding)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, `/portefeuille`.
**Étapes :**
1. Cliquer « Nouvelle copropriété » (bouton bleu en haut à droite). → **Attendu :** navigation vers `/onboarding`.
**Cas limites :** —
**Règle métier :** hors périmètre fonctionnel du test (couvert par le domaine Onboarding) — on vérifie seulement le routage.

---

### Sélection de la copro active & passage au dashboard

## TC-DASH-011 : Choisir une copro → atterrir sur son dashboard
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Connecté, `/portefeuille`.
**Étapes :**
1. Cliquer la ligne « Résidence Martin ». → **Attendu :** navigation vers `/dashboard`. En base/session : `sessionStorage.coproflex_active_copro_id` = id de Résidence Martin, `coproflex_active_copro_name` = « Résidence Martin ».
2. Observer la barre supérieure du dashboard (si données présentes) ou la sidebar copro. → **Attendu :** le nom de la copro active affiché = « Résidence Martin » (sous-titre « Résidence Martin · Exercice AAAA » sur la TopBar, et nom dans le sélecteur de la sidebar copro).
**Cas limites :** copro sans aucune donnée → le dashboard affiche l'état vide « Bienvenue sur CoProFlex » (voir TC-DASH-014), mais l'identité de la copro active doit quand même être Résidence Martin.
**Règle métier :** le dashboard est toujours relatif à **une** copro active.

## TC-DASH-012 : Persistance de la copro active au rafraîchissement
**Priorité :** P1
**Type :** Régression
**Préconditions / jeu de données :** Connecté ; avoir sélectionné « Résidence Martin » depuis le portefeuille (TC-DASH-011).
**Étapes :**
1. Sur `/dashboard`, rafraîchir la page (F5). → **Attendu :** la copro active reste « Résidence Martin » (lue depuis `sessionStorage`), pas de retour à la copro par défaut.
2. Naviguer vers `/finance` puis revenir `/dashboard`. → **Attendu :** toujours « Résidence Martin ».
**Cas limites :** fermer l'onglet puis rouvrir l'app → la sélection est perdue (sessionStorage), retour à la **première copro par date** (« Residence Paris Ivry »). C'est le comportement actuel à documenter, pas forcément le souhaité.
**Règle métier :** —

## TC-DASH-013 : Copro active par défaut sur session vierge
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Connecté, **sans** sélection préalable (sessionStorage vidé / nouvel onglet).
**Étapes :**
1. Aller directement sur `/dashboard` sans passer par le portefeuille. → **Attendu :** la copro active est **« Residence Paris Ivry »** (première copro par `created_at`), pas Résidence Martin.
**Cas limites :** s'il n'existe aucune copro → erreur « Aucune copropriété trouvée » remontée à l'UI (pas un spinner infini) ; toute erreur RLS/réseau doit s'afficher, pas être avalée en `null`.
**Règle métier :** mode single-copro : `get`/`order by created_at`.

## TC-DASH-014 : Changer de copro active sans repasser par le portefeuille — impossible (mode single-copro)
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** Connecté, sur `/dashboard`, copro active = Résidence Martin.
**Étapes :**
1. Chercher un sélecteur de copro dans la sidebar copro. → **Attendu :** le nom de la copro est affiché avec un chevron, mais **aucun menu déroulant fonctionnel** (sélecteur désactivé en mode single-copro). Le seul moyen de changer = cliquer « ◄ Portefeuille » et choisir une autre copro.
2. Cliquer « ◄ Portefeuille » (haut de la sidebar copro). → **Attendu :** retour à `/portefeuille`.
**Cas limites :** —
**Règle métier :** le changement de copro se fait exclusivement via le portefeuille.

---

### Dashboard — états, KPIs, alertes, raccourcis

## TC-DASH-015 : Dashboard — état vide (copro sans données)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, copro active = une copro sans écriture ni AG (cas réel actuel : Résidence Martin ou Residence Paris Ivry).
**Étapes :**
1. Ouvrir `/dashboard`. → **Attendu :** d'abord un état de chargement (squelettes), puis l'**état vide** : titre « Dashboard », sous-titre « Exercice AAAA », encart « Bienvenue sur CoProFlex » + « Commencez par créer une AG, un appel de fonds ou importer vos données. », icône Inbox, bouton rafraîchir.
2. Cliquer le bouton rafraîchir (icône ↻). → **Attendu :** l'icône tourne pendant le rechargement, l'état reste vide (toujours pas de données).
**Cas limites :** `isEmpty` est vrai quand trésorerie = 0 ET impayés = 0 ET prochaine AG = null ET 0 activité ET 0 todo. Dès qu'**un** de ces éléments est non nul, on bascule sur le dashboard plein.
**Règle métier :** —

## TC-DASH-016 : Dashboard — état d'erreur de chargement
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté. Provoquer une erreur (couper le réseau, ou copro active = id invalide / RLS refusée).
**Étapes :**
1. Ouvrir `/dashboard` avec le KPI principal en échec. → **Attendu :** écran d'erreur « Erreur lors du chargement : <message> » avec icône d'alerte et bouton « Réessayer ».
2. Rétablir le réseau puis cliquer « Réessayer ». → **Attendu :** le dashboard se recharge normalement.
**Cas limites :** une erreur sur les **KPIs** fait échouer la page entière ; une erreur sur les **activités/todos** seules est tolérée (listes vides, pas d'écran d'erreur global).
**Règle métier :** ne jamais avaler une erreur en spinner muet (cf. règle « jamais de refus silencieux »).

## TC-DASH-017 : Dashboard plein — carte Trésorerie
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, copro active **enrichie** (boucle d'or 22222222 « Le Clos Saint-Michel » ou copro HARNESS seedée). Pour la tester ici, l'ajouter au cloud ou pointer une copro à écritures.
**Étapes :**
1. Ouvrir `/dashboard`. → **Attendu :** carte « Trésorerie » affichant le solde global (= trésorerie courante dérivée du grand livre via `fn_dashboard_kpis`), détail « Compte courant <montant> · Fonds travaux <montant> ».
2. Vérifier la valeur « Fonds travaux ». → **Attendu :** = provisions travaux (comptes 103+105, fonds ALUR/réserve), PAS le solde du compte bancaire travaux.
3. Cliquer « Voir les comptes ». → **Attendu :** navigation vers `/finance/comptabilite`. Cliquer « Rapprocher » → `/finance/mouvements-bancaires`.
**Cas limites :** solde négatif affiché correctement ; cohérence montant ↔ grand livre / balance de la copro.
**Règle métier :** KPIs dérivés du grand livre = source unique ; le fonds travaux du dashboard = réserve ALUR (décision USER 2026-06-08).

## TC-DASH-018 : Dashboard plein — carte Prochaine AG
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, copro active avec une AG à venir (statut draft/convoked/in_progress/session_active, date future).
**Étapes :**
1. Observer la carte « Prochaine AG ». → **Attendu :** date de l'AG formatée FR, sous-titre type d'AG, badge « dans N jours » si la date est future.
2. Cliquer « Préparer l'AG ». → **Attendu :** navigation vers `/ag/<id_de_l_AG>`.
3. (Cas sans AG — état réel actuel) → **Attendu :** « Aucune prévue » + bouton « Créer une AG » menant à `/ag/new`.
**Cas limites :** AG dont la date est passée mais statut encore vivant → ne doit pas remonter (filtre `meeting_date >= now`) ; plusieurs AG futures → la plus proche est choisie.
**Règle métier :** cycle de vie AG ; seules les AG « à venir et vivantes » comptent comme prochaine AG.

## TC-DASH-019 : Dashboard plein — carte Budget
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, copro active avec un budget voté et des charges réalisées.
**Étapes :**
1. Observer la carte « Budget AAAA ». → **Attendu :** pourcentage de consommation, barre de progression (plafonnée à 100 %), détail « <réalisé> consommés sur <voté> », bouton « Voir le budget » → `/finance/budgets`.
2. (Cas sans budget) → **Attendu :** « — », « Aucun budget voté », bouton « Créer un budget » → `/finance/budgets`.
**Cas limites :** consommation > 100 % → la barre reste à 100 % mais le pourcentage affiché peut dépasser ; budget réalisé alimenté par la classe 6 du grand livre.
**Règle métier :** budget_realise = charges réelles (classe 6) ; cohérence avec le module Budget.

## TC-DASH-020 : Dashboard plein — carte Ordres de service
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, copro active avec des ODS ouverts (urgents / en cours / programmés).
**Étapes :**
1. Observer la carte « Ordres de service ». → **Attendu :** badge « N ouverts », une ligne par groupe non vide (urgents en rouge, en cours en bleu, programmés en gris) avec les noms d'ODS et un lien d'action.
2. Cliquer « Traiter → » sur les urgents. → **Attendu :** `/maintenance/service-orders?status=urgent` (idem `en_cours`, `programme`).
3. Cliquer « Créer un ordre de service ». → **Attendu :** `/maintenance/service-orders/new`.
**Cas limites :** aucun ODS → seul le bouton « Créer » reste, badge « 0 ouverts ».
**Règle métier :** —

## TC-DASH-021 : Dashboard plein — Priorités « À traiter maintenant »
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, copro active générant des todos (impayé critique, AG brouillon, virements non rapprochés, renouvellement de contrat, entretien dû).
**Étapes :**
1. Observer le bloc « À traiter maintenant ». → **Attendu :** liste de tâches triées par priorité (1 rouge, 2 ambre, 3 bleu), chacune avec libellé, contexte éventuel, échéance et un bouton d'action.
2. Cliquer le bouton d'action d'une tâche. → **Attendu :** navigation vers le `deep_link` de la tâche (ex. impayés → fiche/relance, AG brouillon → édition AG).
3. (Cas sans todo) → **Attendu :** message « Aucune action urgente — tout est sous contrôle. ».
**Cas limites :** max 5 tâches affichées ; le lien « Voir les N tâches » est volontairement masqué (page `/tasks` inexistante) — ne pas le chercher.
**Règle métier :** les priorités dérivent des vues métier (impayés, AG, banque, contrats, maintenance).

## TC-DASH-022 : Dashboard plein — Activité récente
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, copro active avec des évènements récents (paiement, facture, doc, AG).
**Étapes :**
1. Observer « Activité récente ». → **Attendu :** jusqu'à 6 lignes, triées par date décroissante, chacune avec une pastille colorée selon le type, le libellé et un temps relatif (« À l'instant », « Il y a 3h », « Hier », « Il y a 4j », ou date FR).
2. (Cas sans activité) → **Attendu :** « Aucune activité récente ».
**Cas limites :** le lien « Tout voir » est masqué (page `/activity` inexistante).
**Règle métier :** —

## TC-DASH-023 : Bandeau « opérations de travaux à apurer »
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, copro active avec des soldes travaux (compte 12) non encore affectés (`useWorksPendingSettlement` non vide). Cas réel actuel : probablement vide.
**Étapes :**
1. Ouvrir `/dashboard` (état plein). → **Attendu (cas avec données) :** un bandeau cliquable « N opération(s) de travaux à apurer — <total> en attente d'affectation ».
2. Cliquer le bandeau. → **Attendu :** navigation vers `/finance/operations-a-apurer`.
3. (Cas sans solde travaux à apurer) → **Attendu :** **aucun** bandeau affiché (le composant ne rend rien si la liste est vide).
**Cas limites :** total = somme des valeurs absolues des soldes travaux ; pluriel « opérations » géré.
**Règle métier :** découvrabilité B4 — soldes travaux gelés (12) à affecter (110/120) avant clôture.

## TC-DASH-024 : Dashboard — raccourcis de la barre supérieure
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté, `/dashboard` en état plein (sinon la TopBar pleine n'apparaît pas — voir cas limite).
**Étapes :**
1. Cliquer « Créer ODS ». → **Attendu :** `/maintenance/service-orders/new`.
2. Cliquer « Appel de fonds ». → **Attendu :** `/finance/appels-fonds`.
3. Cliquer « Nouvelle facture ». → **Attendu :** `/finance/factures`.
4. Cliquer l'icône rafraîchir (↻). → **Attendu :** rechargement des données, icône en rotation pendant le refresh, sans changer de copro.
**Cas limites :** en **état vide**, la TopBar n'affiche QUE le bouton rafraîchir (pas les 3 raccourcis) — ne pas les chercher dans ce cas.
**Règle métier :** —

## TC-DASH-025 : Navigation croisée Dashboard ↔ Portefeuille
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** Connecté, copro active = Résidence Martin, sur `/dashboard`.
**Étapes :**
1. Cliquer « ◄ Portefeuille » dans la sidebar copro. → **Attendu :** `/portefeuille`, copro active inchangée en session.
2. Cliquer « Residence Paris Ivry » dans la liste. → **Attendu :** `/dashboard`, la copro active bascule sur Residence Paris Ivry (TopBar / sidebar mis à jour), les KPIs correspondent à cette nouvelle copro (et non aux données de Résidence Martin).
3. Cliquer le logo « CoProFlex » de la sidebar copro. → **Attendu :** navigation vers `/dashboard`.
**Cas limites / régression clé :** après bascule de copro, **aucune** donnée résiduelle de la copro précédente ne doit rester affichée (KPIs, AG, activité tous rechargés pour la nouvelle copro).
**Règle métier :** isolation stricte des données par copro (cohérence + RLS).

---

## Jeu de données requis (rappel)

- **Compte démo** : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`), affiché « Jean Dupont ». Seul utilisateur.
- **Copros présentes au cloud** (par ordre de création) :
  1. **Residence Paris Ivry** (6 lots) — **première par date → copro active par défaut** sur session vierge. Clé générale à 0, copro partielle.
  2. **Résidence Martin** (7 lots, 6 copropriétaires, clés « Charges générales » + « Bâtiment A » + « Bâtiment B », 1000 tantièmes) — copro la plus complète côté structure.
- **État finance actuel** : les deux copros ont des KPIs financiers à **0** et **aucune AG** → le dashboard tombe sur l'**état vide** « Bienvenue sur CoProFlex ». Les cas TC-DASH-017 à 023 (dashboard plein) nécessitent une copro **enrichie**.
- **Pour tester le dashboard plein** : utiliser la **boucle d'or « Le Clos Saint-Michel » (id 22222222...)** (finance de référence) ou cloner une copro jetable via `create_test_copro_seeded()` (copro « HARNESS ») et la rendre copro active via le portefeuille.
- **Pour l'alerte reprise (TC-DASH-008)** : il faut une copro avec des écritures `ledger_transactions.source_type = 'opening_onboarding'` dont le net des comptes 471/472 ≠ 0. Veiller à ce qu'un simple virement non identifié (suspens hors onboarding) ne déclenche **pas** l'alerte.
- **Note `sessionStorage`** : la copro active vit dans `sessionStorage` (clés `coproflex_active_copro_id` / `coproflex_active_copro_name`), pas `localStorage` — pratique pour réinitialiser un test (vider la session ouvre l'app sur la copro par défaut).
