# Plan de test — Authentification & Communication

> Domaine : connexion / déconnexion / session + hub Communication (mail, messagerie privée, mur communautaire).
> Environnement : app en local (`npm run dev`) branchée sur le Supabase cloud live `qqfqrcolzmcbsvfaumiq`, RLS ON+FORCE.
> Compte unique : `lyes.triki@coproflex.fr` / `password123` (nom affiché « Jean Dupont »), rôle gestionnaire.

---

## Périmètre & écrans canoniques

Voici les écrans réellement câblés et utilisés (ceux qu'on teste). Tout le reste est listé plus bas dans « écrans morts ».

### Authentification
- **`/auth/login`** — page de connexion. Contient un formulaire email + mot de passe (« Se connecter ») ET un bouton « Connexion démo — Gestionnaire » qui remplit les champs et connecte en 1 clic. Au succès → redirection vers `/portefeuille`.
- **Middleware de session** (`src/lib/supabase/middleware.ts`) — c'est le « videur » à l'entrée : il rafraîchit la session à chaque navigation et, en logique d'« autorisation par liste blanche », redirige tout visiteur non connecté vers `/auth/login` SAUF les pages publiques (vitrine, `/auth/*`). Il renvoie aussi un utilisateur déjà connecté loin des pages `/auth`.
- **Garde-fou de second niveau** dans `(dashboard)/layout.tsx` : même si le middleware laissait passer, la page se re-vérifie côté serveur (`getUser()`) et redirige vers `/auth/login` sans session. C'est la défense « ceinture + bretelles ».
- **`/auth/callback`** (route technique) — échange un code OAuth/lien magique contre une session. En cas d'échec, redirige vers `/auth/login?error=auth_callback_error`. Marginal pour le compte démo (login par mot de passe), mais testé en cas limite.

### Communication
- **`/communication`** — le hub : 3 compteurs en haut (mails non lus, messages non lus, publications récentes) + 3 cartes cliquables (Boîte mail, Messagerie, Mur). Lecture seule, sert d'aiguillage.
- **`/communication/mail`** — boîte mail partagée par copropriété (3 colonnes : dossiers / liste / lecteur). Envoi réel d'emails via le service Resend (route `/api/mail/send`), brouillons, lu/non-lu, favori, archive, corbeille persistés en base. **Boîte partagée par copro** : la RLS filtre sur « gestionnaire de la copro », pas sur le propriétaire du mail.
- **`/communication/messagerie`** — messagerie privée type chat (liste de conversations + panneau de discussion). Données réelles Supabase (tables `conversations`, `messages`, vue `v_conversations_overview`), envoi de message en base + temps réel (realtime), compteur de non-lus, marquage lu via RPC `mark_conversation_read`.
- **`/communication/mur`** — mur communautaire (fil de publications + commentaires + likes + épingles). Données réelles (vue `v_wall_feed`, tables `wall_posts` / `wall_comments` / `wall_likes`, compteurs maintenus par triggers SQL).

### Constat structurel important (à signaler comme anomalie, pas un cas de test)
**Il n'existe AUCUN bouton « Se déconnecter » réellement affiché dans l'application.** Les trois composants de déconnexion (`AuthStatus`, `UserMenu`, `UserSwitcher`) existent dans le code mais ne sont montés nulle part : le seul à être référencé (`AuthStatus`) vit dans `HighBar`, qui n'est rendu par aucune page. Ni la barre latérale du dashboard (`UnifiedSidebar`), ni le portefeuille n'exposent de déconnexion.
→ Conséquence pour le test : les cas de déconnexion (TC-AUTH-004 et suivants) se font en l'état via les outils navigateur (suppression des cookies de session) ou via la console, et **le manque de bouton visible est lui-même un bug UX P1** (un gestionnaire ne peut pas se déconnecter normalement).

---

## Écrans morts / doublons (NE PAS tester)

| Élément | Chemin | Pourquoi mort / doublon |
|---|---|---|
| `UserMenu` | `src/components/ui/UserMenu/UserMenu.tsx` | Composant de menu profil + déconnexion **non monté** (importé seulement par lui-même). Doublon de `AuthStatus`. |
| `UserSwitcher` | `src/components/ui/UserSwitcher/UserSwitcher.tsx` | Bandeau utilisateur + déconnexion **non monté**. Doublon de `AuthStatus`. |
| `AuthStatus` (via `HighBar`) | `src/components/ui/AuthStatus` + `src/components/layout/HighBar` | `AuthStatus` n'est référencé que dans `HighBar`, et `HighBar` n'est rendu par aucune page → de fait inatteignable aujourd'hui. À garder en tête comme « le composant à rebrancher », mais pas de parcours utilisateur dessus. |
| Module « Événements » communication | (mentionné dans `docs/claude/modules.md`) | Pas de route `/communication/evenements` réelle dans `src/app`. Documentation en avance sur le code. |
| Pages e2e / specs anciennes | `docs/tests/...`, `docs/superpowers/...` | Documents de planification, pas des écrans. |
| Champ/bouton « Mon profil » dans `UserMenu` | — | Ne fait rien (`onClick` = ferme le menu). De toute façon dans un composant mort. |
| Labels & dossiers personnalisés du mail | `createLabel` / `createFolder` dans `useMailbox` | Créent un objet **en mémoire seulement** (non persisté en base, non câblé à une UI de création). À ne pas tester comme fonctionnalité réelle ; signaler comme non-implémenté si une UI les expose. |

---

## Cas de test

### Authentification

## TC-AUTH-001 : Connexion démo en 1 clic (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** déconnecté (aucune session), page `/auth/login` ouverte.
**Étapes :**
1. Ouvrir `/auth/login` → **Attendu :** logo CoProFlex, sous-titre « Connexion à votre espace », formulaire email/mot de passe vide, séparateur « Démo », bouton « Connexion démo — Gestionnaire » affichant `lyes.triki@coproflex.fr`.
2. Cliquer « Connexion démo — Gestionnaire » → **Attendu :** le bouton/les boutons passent en état désactivé pendant le chargement (« Connexion... »), puis redirection automatique vers `/portefeuille`.
3. Observer le portefeuille → **Attendu :** liste des copropriétés visible (au moins « Résidence Martin », « Residence Paris Ivry »). Session active (cookie `sb-...-auth-token` présent).
**Cas limites :** double-clic rapide sur le bouton ne doit pas lancer deux connexions ni provoquer d'erreur ; rafraîchir la page après connexion garde la session.
**Règle métier :** compte démo unique réellement provisionné sur le live (`DEMO_EMAIL` dans `login/page.tsx`).

## TC-AUTH-002 : Connexion manuelle par formulaire (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** déconnecté.
**Étapes :**
1. Sur `/auth/login`, saisir `lyes.triki@coproflex.fr` dans Email et `password123` dans Mot de passe → **Attendu :** champs renseignés, bouton « Se connecter » actif.
2. Cliquer « Se connecter » → **Attendu :** bouton « Connexion... » pendant le chargement, puis redirection vers `/portefeuille`, session active.
**Cas limites :** soumettre le formulaire vide → le navigateur bloque (champs `required`, type `email`) ; email sans `@` → validation HTML5 bloque l'envoi.
**Règle métier :** —

## TC-AUTH-003 : Connexion refusée — mauvais identifiants
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** déconnecté.
**Étapes :**
1. Saisir `lyes.triki@coproflex.fr` + un mot de passe faux (`wrongpass`) puis « Se connecter » → **Attendu :** AUCUNE redirection, un bandeau d'erreur rouge s'affiche au-dessus du formulaire (message Supabase, ex. « Invalid login credentials »).
2. Saisir un email inexistant (`inconnu@coproflex.fr`) + n'importe quel mot de passe → **Attendu :** même type de bandeau d'erreur, pas de redirection.
**Cas limites :** le message ne doit PAS révéler si c'est l'email ou le mot de passe qui est faux (message générique = bonne pratique sécurité) ; après une erreur, une nouvelle tentative correcte doit fonctionner (le bandeau se vide).
**Règle métier :** —

## TC-AUTH-004 : Accès direct à une page protégée sans session → redirection login
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** déconnecté (cookies de session supprimés).
**Étapes :**
1. Dans la barre d'adresse, aller directement sur `/communication` → **Attendu :** redirection immédiate vers `/auth/login` (jamais le contenu du hub).
2. Tester aussi `/communication/mail`, `/communication/messagerie`, `/communication/mur`, `/portefeuille` → **Attendu :** chacun redirige vers `/auth/login`.
**Cas limites :** vérifier que les routes « oubliées » historiquement (`/conformite`, `/contentieux`, `/conseil-syndical`, `/dossiers`, `/legal`, `/agenda`) redirigent aussi (l'audit 2026-06-12 est passé en liste blanche : tout est protégé sauf le public). Les pages vitrine (`/`, `/tarifs`, `/contact`, `/faq`…) restent accessibles sans session.
**Règle métier :** middleware en allowlist (audit sécurité 2026-06-12).

## TC-AUTH-005 : Utilisateur déjà connecté renvoyé hors des pages /auth
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** connecté (compte démo).
**Étapes :**
1. Aller manuellement sur `/auth/login` → **Attendu :** redirection automatique vers `/portefeuille` (on ne revoit pas l'écran de login en étant connecté).
**Cas limites :** revenir en arrière (bouton précédent navigateur) ne doit pas piéger l'utilisateur sur une page de login fantôme.
**Règle métier :** —

## TC-AUTH-006 : Déconnexion (logout) et invalidation de session
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté (compte démo). ⚠️ Aucun bouton de déconnexion n'est câblé dans l'UI (voir constat structurel) : déclencher le logout via la console (`supabase.auth.signOut()`) OU supprimer les cookies de session dans les outils navigateur.
**Étapes :**
1. Déclencher la déconnexion → **Attendu :** session supprimée (cookies `sb-*-auth-token` effacés).
2. Naviguer vers `/communication` (ou rafraîchir) → **Attendu :** redirection vers `/auth/login`.
**Cas limites :** après logout, le bouton « retour » du navigateur sur une page protégée doit re-déclencher la redirection (pas de page protégée servie depuis le cache).
**Règle métier :** —
**Anomalie attendue :** absence de bouton « Se déconnecter » visible = **bug UX P1** à consigner.

## TC-AUTH-007 : Session expirée — ne JAMAIS afficher un faux contenu vide
**Priorité :** P0
**Type :** Régression
**Préconditions / jeu de données :** connecté puis session rendue invalide (supprimer/corrompre le cookie `sb-*-auth-token` SANS recharger, ou attendre l'expiration du jeton).
**Étapes :**
1. Avec la session expirée, déclencher un chargement de données (rafraîchir `/communication/mail` ou `/communication/messagerie`) → **Attendu (correct) :** soit redirection propre vers `/auth/login`, soit un message d'erreur explicite (« Votre session a expiré, reconnectez-vous »).
2. Observer le comportement réel → **Attendu (à vérifier / risque connu) :** l'écran NE doit PAS afficher « 0 mail », « 0 conversation » ou « aucune publication » comme si tout était vide. Un faux vide est un **défaut** : l'utilisateur croit que ses données ont disparu.
**Cas limites :** déjà observé sur l'étape d'onboarding (vide silencieux quand session expirée). Vérifier ici que mail/messagerie/mur ne reproduisent pas ce faux vide ; si les requêtes RLS renvoient `[]` sans erreur visible, c'est le bug à remonter (P0).
**Règle métier :** RLS ON ; une lecture refusée par RLS doit produire une erreur explicite, pas un vide trompeur.

## TC-AUTH-008 : Reconnexion après expiration
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** session expirée (suite de TC-AUTH-007), redirigé sur `/auth/login`.
**Étapes :**
1. Se reconnecter (démo 1 clic ou formulaire) → **Attendu :** retour sur `/portefeuille`, session de nouveau valide.
2. Rouvrir `/communication/mail` → **Attendu :** les données réapparaissent normalement (la copro précédemment sélectionnée ou un état par défaut cohérent).
**Cas limites :** la copropriété sélectionnée avant expiration peut être perdue (re-sélection depuis `/portefeuille` attendue) — vérifier qu'on ne reste pas bloqué sur un écran sans copro.
**Règle métier :** —

## TC-AUTH-009 : Callback d'authentification en erreur
**Priorité :** P2
**Type :** Intégration
**Préconditions / jeu de données :** déconnecté.
**Étapes :**
1. Forger l'URL `/auth/callback?code=code-invalide` → **Attendu :** redirection vers `/auth/login?error=auth_callback_error` (pas de session créée, pas de page blanche/erreur 500).
2. Appeler `/auth/callback` sans paramètre `code` → **Attendu :** redirection vers `/auth/login?error=auth_callback_error`.
**Cas limites :** le paramètre `error` dans l'URL n'est pas affiché à l'utilisateur par la page login actuelle (elle n'exploite pas `searchParams.error`) → à signaler : l'utilisateur ne voit aucun message après un callback raté (UX P2).
**Règle métier :** —

---

### Communication — Hub

## TC-COMM-001 : Hub — affichage des compteurs et aiguillage
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté, copro « Résidence Martin » sélectionnée depuis `/portefeuille`.
**Étapes :**
1. Ouvrir `/communication` → **Attendu :** titre « Communication », 3 compteurs (Mails non lus / Messages non lus / Publications récentes) avec des nombres cohérents (≥ 0), 3 cartes : Boîte mail, Messagerie, Mur.
2. Vérifier les badges : si des mails non lus existent, badge « N non lu(s) » sur la carte mail ; conversations actives → badge « N active(s) » ; publications de la semaine → badge « N cette semaine » ; publication épinglée → aperçu « 📌 Titre ».
3. Cliquer la carte « Boîte mail » → **Attendu :** navigation vers `/communication/mail`. Idem « Messagerie » → `/communication/messagerie`, « Mur » → `/communication/mur`.
**Cas limites :** sans copro sélectionnée (`currentCoproId` null), les compteurs restent à 0 et aucune requête ne part — vérifier qu'il n'y a pas d'erreur console ; copro « Residence Paris Ivry » (plus pauvre) doit afficher des compteurs à 0 ou faibles sans planter.
**Règle métier :** « Publications récentes » = posts des 7 derniers jours ; « Mails non lus » = reçus, non lus, non archivés, non supprimés.

---

### Communication — Messagerie privée

## TC-MSG-001 : Lire une conversation et marquer comme lue
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté, copro avec au moins une conversation existante (sinon en créer une au préalable — voir « jeu de données requis »). « Résidence Martin » de préférence.
**Étapes :**
1. Ouvrir `/communication/messagerie` → **Attendu :** colonne gauche = liste des conversations (titre, dernier message, horodatage, pastille de non-lus éventuelle) ; panneau droit en état vide « Sélectionnez une conversation ».
2. Cliquer une conversation portant des non-lus → **Attendu :** le panneau droit affiche les messages groupés par date, la pastille de non-lus de cette conversation tombe à 0 (optimiste), et le total de non-lus diminue d'autant.
3. Recharger la page → **Attendu :** la conversation reste à 0 non-lu (persistance via RPC `mark_conversation_read`).
**Cas limites :** un gestionnaire NON membre de la conversation a 0 non-lu → le RPC n'est pas appelé (évite une erreur 42501 de routine), pas d'erreur visible ; si le RPC échoue, la liste se resynchronise (le faux zéro local est corrigé).
**Règle métier :** RLS — le marquage lu est gardé sur l'appartenance à la conversation (membership).

## TC-MSG-002 : Envoyer un message (persistance + temps réel)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté, une conversation sélectionnée dont l'utilisateur démo est membre.
**Étapes :**
1. Saisir un texte dans la zone de réponse et appuyer sur Entrée (ou cliquer l'icône Envoyer) → **Attendu écran :** le message apparaît immédiatement (envoi optimiste, bulle « à moi » à droite), la zone de saisie se vide.
2. **Attendu base :** une ligne est insérée dans `messages` (`author_id` = utilisateur démo, `content`, `conversation_id`, `copro_id`) ; le trigger `trg_conversation_last_message` (0032) met à jour `last_message_at` / aperçu de la conversation et les non-lus des autres membres.
3. Recharger → **Attendu :** le message envoyé est toujours présent (l'optimiste a bien été remplacé par la ligne réelle).
**Cas limites :** message vide ou uniquement des espaces → bouton Envoyer désactivé, rien ne part ; `Shift+Entrée` insère un retour à la ligne sans envoyer ; envoi sans copro ou sans utilisateur (cas anormal) → no-op ; le panneau auto-défile vers le bas après envoi.
**Règle métier :** —

## TC-MSG-003 : Réception en temps réel d'un nouveau message
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** une conversation ouverte ; capacité à insérer un message « de l'autre côté » (autre onglet/session, ou insertion directe en base sur la même `conversation_id`).
**Étapes :**
1. Conversation X ouverte dans l'onglet A. Depuis une autre source, insérer un message dans `messages` pour la conversation X → **Attendu :** dans l'onglet A, la nouvelle bulle apparaît sans rechargement (abonnement realtime `messages-<convId>`), l'aperçu de la conversation dans la liste se met à jour.
**Cas limites :** changer de conversation doit fermer proprement l'ancien canal realtime (pas de fuite/abonnement résiduel) ; un message inséré pour une AUTRE conversation que celle ouverte ne doit pas s'afficher dans le panneau actif.
**Règle métier :** —

## TC-MSG-004 : Filtres et recherche de conversations
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** copro avec plusieurs conversations (au moins une lue, une non lue, une archivée si possible).
**Étapes :**
1. Basculer le filtre sur « Non lues » → **Attendu :** seules les conversations avec non-lus restent.
2. Filtre « Archivées » → **Attendu :** seules les conversations archivées s'affichent.
3. Saisir un terme dans la recherche → **Attendu :** la liste se restreint aux conversations dont le titre OU le dernier message contient le terme (insensible à la casse).
**Cas limites :** filtre « all » masque les archivées (alignement avec le compteur du hub) ; recherche sans résultat → liste vide sans erreur ; le total de non-lus exclut les archivées (cohérence badge/hub).
**Règle métier :** —

## TC-MSG-005 : Archiver une conversation
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** une conversation active sélectionnée.
**Étapes :**
1. Archiver la conversation courante → **Attendu écran :** elle disparaît de la vue « all », le panneau de discussion se vide (retour à l'état « Sélectionnez une conversation ») si c'était l'active.
2. **Attendu base :** `conversations.is_archived = true`.
3. Filtre « Archivées » → **Attendu :** la conversation y apparaît.
**Cas limites :** archiver retire bien la conversation du compteur de non-lus global du hub.
**Règle métier :** —

---

### Communication — Mur communautaire

## TC-MUR-001 : Publier un message sur le mur (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté, copro « Résidence Martin » sélectionnée.
**Étapes :**
1. Sur `/communication/mur`, ouvrir l'éditeur (bouton « Nouvelle publication ») → **Attendu :** modale avec Titre, Contenu, Catégorie (liste déroulante), case « Épingler ».
2. Renseigner un titre et un contenu, choisir une catégorie, laisser « Épingler » décoché, cliquer « Publier » → **Attendu écran :** la modale se ferme, la publication apparaît en tête du fil avec l'auteur « Jean Dupont » (nom de session posé en optimiste).
3. **Attendu base :** ligne insérée dans `wall_posts` (`copro_id`, `author_id` = utilisateur démo, `title`, `content`, `category`, `visibility = 'all_members'`, `is_pinned = false`).
4. Recharger → **Attendu :** la publication persiste, l'auteur réel est résolu par `v_wall_feed` (profil/rôle dérivés).
**Cas limites :** bouton « Publier » désactivé tant que titre OU contenu est vide (espaces seuls ne comptent pas) ; fermer la modale sans publier ne crée rien.
**Règle métier :** —

## TC-MUR-002 : Épingler / désépingler une publication
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** au moins une publication existante.
**Étapes :**
1. Publier avec « Épingler » coché (ou épingler une publication existante) → **Attendu écran :** la publication remonte dans la zone des épinglées (en tête de fil) ; **Attendu base :** `wall_posts.is_pinned = true`, `pinned_at` renseigné.
2. Désépingler → **Attendu :** elle repasse dans le fil normal ; `is_pinned = false`, `pinned_at = null`.
3. Sur le hub `/communication`, vérifier que l'aperçu « 📌 Titre » reflète la dernière épinglée.
**Cas limites :** plusieurs épinglées → tri par date de création décroissante.
**Règle métier :** —

## TC-MUR-003 : Liker / déliker une publication (compteur fiable)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** une publication existante.
**Étapes :**
1. Cliquer « J'aime » → **Attendu écran :** l'état du bouton bascule (liké) ; **Attendu base :** une ligne dans `wall_likes` (`post_id`, `user_id`, `copro_id`). Le compteur de likes affiché provient du trigger `trg_wall_likes_count` (0032), resynchronisé après l'action — il doit montrer +1, JAMAIS +2.
2. Cliquer à nouveau (déliker) → **Attendu :** la ligne `wall_likes` est supprimée, compteur −1.
**Cas limites :** double-clic rapide ne doit pas créer deux likes ni doubler le compteur (le compteur réel est relu depuis `v_wall_feed`, pas incrémenté localement) ; liker sans copro/utilisateur (cas anormal) → no-op.
**Règle métier :** compteurs maintenus par triggers SQL, jamais incrémentés côté front (anti double-comptage).

## TC-MUR-004 : Commenter une publication
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** une publication existante.
**Étapes :**
1. Sélectionner une publication → **Attendu :** le panneau de commentaires s'ouvre à droite et charge les commentaires existants (triés du plus ancien au plus récent).
2. Saisir un commentaire et le poster → **Attendu écran :** il apparaît immédiatement avec l'auteur « Jean Dupont » (optimiste) ; le compteur de commentaires de la publication augmente de 1 (valeur relue depuis `v_wall_feed`).
3. **Attendu base :** ligne dans `wall_comments` (`post_id`, `author_id`, `content`, `copro_id`).
**Cas limites :** après rechargement, l'auteur des commentaires retombe sur « Utilisateur » (le nom n'est PAS stocké en base depuis la migration 0022, jointure profil non faite côté commentaire) → comportement connu, à signaler comme limite d'affichage, pas un bug bloquant ; compteur de commentaires +1 et non +2 (anti double-comptage).
**Règle métier :** —

## TC-MUR-005 : Supprimer une publication
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** une publication créée par l'utilisateur démo.
**Étapes :**
1. Supprimer une publication → **Attendu écran :** elle disparaît du fil, ses commentaires aussi, le panneau de commentaires se ferme si elle était sélectionnée.
2. **Attendu base :** ligne supprimée de `wall_posts` (et commentaires liés selon cascade).
**Cas limites :** vérifier le comportement RLS si on tente de supprimer une publication d'un autre auteur (selon la politique : refus silencieux ou erreur) — la suppression front est optimiste, vérifier que la base reflète le refus (la ligne reste) si RLS bloque.
**Règle métier :** RLS ON.

## TC-MUR-006 : Filtres catégories / mes publications / recherche
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** plusieurs publications de catégories différentes, dont certaines de l'utilisateur démo.
**Étapes :**
1. Filtrer par une catégorie via la barre latérale → **Attendu :** seules les publications de cette catégorie restent ; le compteur par catégorie correspond.
2. Filtre « Mes publications » → **Attendu :** seules celles dont `author_id` = utilisateur démo.
3. Filtre « Épinglées » → seules les épinglées. Recherche texte → restreint sur titre/contenu (insensible à la casse).
**Cas limites :** filtre sans résultat → fil vide sans erreur ; les épinglées restent visuellement en tête quand on est en « all ».
**Règle métier :** —

---

### Communication — Boîte mail

## TC-MAIL-001 : Envoyer un email (Resend + persistance)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** connecté, copro « Résidence Martin » sélectionnée. ⚠️ Resend doit être configuré (clé API + adresse expéditrice) ; en environnement de test sans domaine vérifié, l'envoi peut échouer en 502 — voir cas limites.
**Étapes :**
1. Sur `/communication/mail`, cliquer « Composer » → **Attendu :** modale « Nouveau message » avec champs À, (CC repliable), Objet, Corps.
2. Saisir un destinataire valide, un objet, un corps, cliquer « Envoyer » → **Attendu écran :** la modale se ferme, le mail apparaît dans le dossier « Envoyés ».
3. **Attendu base :** appel `POST /api/mail/send` → 200 ; ligne dans `mails` avec `status = 'sent'`, `owner_id` = utilisateur démo, `from_email` = adresse Resend configurée, `resend_id` renseigné, `sent_at` daté.
**Cas limites :** À vide OU objet vide → bouton n'envoie pas (garde front `draft.to.length === 0 || !subject.trim()`) ; la route refait la validation côté serveur (400 si `to`/`subject`/`body`/`coproId` manquants) ; plusieurs destinataires séparés par virgules → tableau d'emails ; échec Resend → réponse 502 avec message, le mail n'est PAS enregistré.
**Règle métier :** —

## TC-MAIL-002 : Autorisation serveur avant envoi (sécurité)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** connecté.
**Étapes :**
1. Envoyer un mail pour une copro dont l'utilisateur EST gestionnaire → **Attendu :** 200, mail parti et enregistré.
2. (Test sécurité) Appeler `POST /api/mail/send` avec un `coproId` d'une copro dont l'utilisateur n'est PAS gestionnaire → **Attendu :** réponse 403/401 (`requireCoproManager`), AUCUN email envoyé, aucune ligne `mails` créée.
**Cas limites :** appel sans session (cookies absents) → refus ; l'autorisation est vérifiée AVANT l'appel Resend (« l'email parti ne se rappelle pas »).
**Règle métier :** audit sécurité 2026-06-12 — anti-relais spam/phishing depuis l'adresse vérifiée du domaine.

## TC-MAIL-003 : Brouillon (enregistrement automatique à la fermeture)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté, copro sélectionnée.
**Étapes :**
1. Ouvrir « Composer », saisir un objet et/ou un corps, puis fermer la modale (croix ou clic extérieur) SANS envoyer → **Attendu écran :** le brouillon apparaît dans le dossier « Brouillons ».
2. **Attendu base :** ligne `mails` avec `status = 'draft'`, `owner_id` = utilisateur démo, `is_read = true`, `sent_at = null`.
**Cas limites :** fermer une modale entièrement vide ne crée PAS de brouillon (garde `toField || subject || body`) ; le brouillon n'est pas envoyé par email (pas d'appel Resend).
**Règle métier :** —

## TC-MAIL-004 : Lire un mail reçu et marquer comme lu
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** un mail reçu non lu dans la boîte (statut `received`, `is_read = false`). Insérer un mail de test ou utiliser l'inbound si configuré.
**Étapes :**
1. Sur dossier « Réception », cliquer un mail non lu → **Attendu écran :** le lecteur affiche l'expéditeur, l'objet, le corps ; le mail passe en lu (style « lu »), le compteur « non lus » diminue de 1.
2. **Attendu base :** `mails.is_read = true` pour ce mail.
3. Recharger → **Attendu :** le mail reste lu, le compteur du hub reflète la baisse.
**Cas limites :** ouvrir un mail déjà lu ne déclenche pas de mise à jour inutile ; compteur de non-lus = reçus non lus, non archivés, non supprimés.
**Règle métier :** —

## TC-MAIL-005 : Favori / Archive / Corbeille
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** au moins un mail en réception.
**Étapes :**
1. Mettre un mail en favori (étoile) → **Attendu :** étoile active, mail visible dans le dossier « Favoris » ; `is_starred = true` en base. Re-cliquer → retire le favori.
2. Archiver un mail → **Attendu :** il quitte la réception, apparaît dans « Archive » ; `is_archived = true`. Le sélecteur se vide.
3. Supprimer un mail → **Attendu :** il quitte le dossier courant, apparaît dans « Corbeille » ; `is_deleted = true`, `deleted_at` daté (suppression logique, pas physique).
**Cas limites :** un mail archivé ne compte plus dans les « non lus » du hub ; un mail supprimé sort de tous les dossiers sauf la corbeille.
**Règle métier :** —

## TC-MAIL-006 : Répondre à un mail (pré-remplissage)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** un mail reçu sélectionné.
**Étapes :**
1. Cliquer « Répondre » dans le lecteur → **Attendu :** modale ouverte avec À pré-rempli (adresse de l'expéditeur), Objet préfixé « Re: » (sans doubler le « Re: » s'il existe déjà), corps vide.
2. Saisir une réponse, envoyer → **Attendu :** mail `status = 'sent'`, `in_reply_to` = id du mail d'origine ; il apparaît dans « Envoyés ».
**Cas limites :** répondre à un mail dont l'objet est déjà « Re: ... » ne produit pas « Re: Re: ... ».
**Règle métier :** —

## TC-MAIL-007 : Recherche et filtrage par dossier
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** mails dans plusieurs dossiers.
**Étapes :**
1. Changer de dossier (Réception / Envoyés / Brouillons / Archive / Corbeille / Favoris) → **Attendu :** la liste affiche uniquement les mails du dossier, la sélection se réinitialise.
2. Saisir un terme dans la recherche → **Attendu :** filtre sur objet / expéditeur / corps (insensible à la casse), tri par date décroissante.
**Cas limites :** recherche sans résultat → liste vide sans erreur ; **labels et dossiers personnalisés** ne sont pas persistés (créés en mémoire seulement) → ne pas tester comme fonctionnalité réelle ; si une UI permet de les créer, signaler la non-persistance.
**Règle métier :** —

## TC-MAIL-008 : Isolation par copropriété (RLS, boîte partagée)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** mails existants sur « Résidence Martin » ET sur une autre copro.
**Étapes :**
1. Sélectionner « Résidence Martin » puis ouvrir le mail → **Attendu :** uniquement les mails de cette copro.
2. Revenir à `/portefeuille`, sélectionner « Residence Paris Ivry », rouvrir le mail → **Attendu :** uniquement les mails de cette copro, AUCUN mail de Résidence Martin.
**Cas limites :** la boîte est partagée par copro (RLS sur « gestionnaire de la copro », pas sur `owner_id`) → tous les mails de la copro sont visibles par le gestionnaire, quel que soit l'auteur ; aucune fuite inter-copro.
**Règle métier :** RLS ON+FORCE — filtrage sur `user_is_copro_manager(copro_id)`.

---

## Jeu de données requis (rappel)

- **Compte** : `lyes.triki@coproflex.fr` / `password123` (gestionnaire, « Jean Dupont »), seul utilisateur réel sur le cloud live.
- **Copro la plus complète** : « Résidence Martin » (6 copropriétaires, 7 lots, clés Charges générales / Bâtiment A / Bâtiment B). À utiliser pour tous les tests communication « happy path ».
- **Copro partielle / contre-test isolation** : « Residence Paris Ivry » (plus pauvre) pour vérifier les compteurs faibles et l'isolation RLS inter-copro (TC-MAIL-008, TC-COMM-001).
- **Copro jetable** : `create_test_copro_seeded()` clone une copro « HARNESS » si l'on veut un terrain vierge sans polluer les copros de démo.
- **Pré-requis communication réel** :
  - Messagerie : nécessite des lignes dans `conversations` / `conversation_members` / `messages` pour la copro testée (l'app ne propose pas de bouton « nouvelle conversation » dans la page testée → semer en base au préalable, et ajouter l'utilisateur démo comme membre pour pouvoir envoyer/marquer lu).
  - Mail : pour tester la réception, insérer un mail `status = 'received'`, `is_read = false` (ou utiliser la route inbound `/api/mail/inbound` si configurée). L'envoi réel requiert une clé Resend + adresse expéditrice valides, sinon attendre une erreur 502.
  - Mur : peut être alimenté entièrement par l'UI (publication, like, commentaire) — pas de pré-seed obligatoire.
- **Tests de session** : pour TC-AUTH-006/007, prévoir l'accès aux outils navigateur (suppression de cookies `sb-*-auth-token`) puisque aucun bouton de déconnexion n'est câblé dans l'UI.
