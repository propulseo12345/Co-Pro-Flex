# Plan de test — Paramètres & Cabinet

> Domaine : réglages au niveau copropriété (paramètres, modèles) et au niveau cabinet.
> Environnement : app locale (`npm run dev`) branchée sur le cloud live Supabase `qqfqrcolzmcbsvfaumiq`.
> Compte unique : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`), nom affiché « Jean Dupont ».
> Sélection de copro : depuis `/portefeuille` (cliquer une copro) avant de tester tout écran qui dépend d'une copro.

---

## Périmètre & écrans canoniques

Après exploration du code, **trois** parcours sont réellement branchés sur la base et persistent les données. Ce sont les seuls à tester en profondeur.

| Écran | Route | Source de données | Ce qu'on y fait |
|-------|-------|-------------------|-----------------|
| **Réglage des relances** | `/settings/reminders` | Tables `reminder_settings`, `payment_reminder_rules`, `email_templates` (Supabase) + fonction serveur `run_payment_reminders` pour le test à blanc | Mettre les relances en pause, activer/désactiver chaque palier (J+15, J+30…), changer le délai, choisir le modèle d'e-mail, éditer le contenu d'un modèle d'e-mail, lancer un « test à blanc » |
| **Modèles de Procès-Verbal (PV)** | `/settings/templates` et l'éditeur `/settings/templates/[id]` | Table `pv_templates` (Supabase) | Créer / dupliquer / supprimer un modèle de PV, le définir par défaut, l'importer / l'exporter (JSON), éditer ses sections / paramètres / formulations, aperçu, export HTML/PDF/Word |
| **Banque de résolutions (modèles d'AG)** | `/ag/resolutions` (et la même donnée via la modale « Bibliothèque de résolutions » dans `/ag/[id]/agenda`) | Table `resolution_templates` — 3 niveaux : Système (lecture seule), Cabinet, Cette copro | Rechercher / filtrer, créer / dupliquer / modifier / supprimer un modèle de résolution, vérifier le verrou « modèle système non modifiable » et le verrou « aucun cabinet associé » |

**Point d'accès dans le menu** : « Modèles » de la banque de résolutions s'atteint par le module **AG → Bibliothèque des résolutions** (`/ag/resolutions`), PAS par le menu cabinet « Modèles » (qui est mort, voir plus bas). Les réglages copro (`/settings/...`) ne sont pas dans le menu principal mais accessibles par URL directe et par des liens internes (ex. depuis `/finance/unpaid/reminders`).

**Notion importante de « cabinet »** : la création d'un modèle de résolution exige un `cabinet_id` rattaché au compte. Si le compte de démo n'a pas de cabinet, l'écran affiche « Aucun cabinet associé » et désactive la création. Ce cas doit être vérifié explicitement (TC-SET-016).

---

## Écrans morts / doublons (NE PAS tester)

Ces écrans existent dans le menu ou par URL mais ne font rien d'utile. Ne PAS écrire de cas de test fonctionnels dessus — juste vérifier au passage qu'ils ne plantent pas.

| Écran | Route | État réel |
|-------|-------|-----------|
| **Paramètres cabinet** | `/parametres-cabinet` | Page « bouchon » : composant `PlaceholderPage`, affiche seulement « Paramètres cabinet — Cette fonctionnalité arrive prochainement » + lien retour. **Aucune édition d'infos cabinet n'existe.** |
| **Facturation cabinet** | `/facturation` | Page bouchon « arrive prochainement ». Pas de facturation du cabinet codée. |
| **Prestataires (niveau cabinet)** | `/prestataires` | Page bouchon « arrive prochainement ». Le vrai écran prestataires vit sous `/maintenance/providers` (domaine Maintenance, hors de ce plan). |
| **Modèles (menu cabinet)** | `/modeles` | Page bouchon « arrive prochainement ». DOUBLON mort : les vrais modèles sont `/settings/templates` (PV) et `/ag/resolutions` (résolutions). |
| **Informations de la copropriété** | `/settings/info` | **100 % maquette** : données en dur dans le code (`MOCK_COPROPRIETAIRES`, lots/clés en mémoire), rien n'est lu ni écrit en base. Ajouter/modifier/supprimer un lot ou une clé ne persiste pas (perdu au rechargement). Le vrai écran lots/répartition est `/coproprietaires/lots`. |
| **Hub Paramètres** | `/settings` | Page de liens en dur. La carte « Copropriété » affiche un nom/adresse vides (TODO non branché). Liens vers `/settings/info` (mort) et `/finance/tantiemes`. Pas de logique à tester. |

> Conséquence : la consigne « éditer les infos cabinet » et « facturation du cabinet » **ne correspond à aucune fonctionnalité réelle** aujourd'hui. On le documente (TC-SET-001) au lieu d'écrire des cas qui échoueront toujours.

---

## Cas de test

### Écrans morts — vérification de non-régression (légère)

## TC-SET-001 : Les écrans cabinet sont des pages « à venir » (bouchons)
**Priorité :** P2
**Type :** Régression
**Préconditions / jeu de données :** connecté en démo, n'importe quelle copro sélectionnée.
**Étapes :**
1. Aller sur `/parametres-cabinet` → **Attendu :** page « Paramètres cabinet », texte « Cette fonctionnalité arrive prochainement », lien « ← Retour au portefeuille ». Pas d'erreur, pas d'écran blanc.
2. Aller sur `/facturation` → **Attendu :** même type de page bouchon « Facturation… arrive prochainement ».
3. Aller sur `/prestataires` → **Attendu :** page bouchon « Prestataires… arrive prochainement ».
4. Aller sur `/modeles` → **Attendu :** page bouchon « Modèles… arrive prochainement ».
5. Cliquer le lien retour → **Attendu :** redirige vers `/portefeuille`.
**Cas limites :** ouvrir ces URL en étant déconnecté → doit rediriger vers `/auth/login` (garde de layout cabinet).
**Règle métier :** néant (fonctionnalités non livrées).

## TC-SET-002 : L'écran « Informations de la copropriété » ne persiste rien (maquette)
**Priorité :** P2
**Type :** Régression
**Préconditions / jeu de données :** « Résidence Martin » sélectionnée.
**Étapes :**
1. Aller sur `/settings/info` → **Attendu :** la page affiche des clés (« Charges générales », « Ascenseur ») et des lots EN DUR, qui ne correspondent PAS à la vraie Résidence Martin (données de maquette).
2. Ajouter une clé de répartition « Test » puis recharger la page (F5) → **Attendu :** la clé « Test » a disparu (rien n'a été enregistré en base). Confirme que l'écran est une maquette.
3. Ajouter / supprimer un lot, recharger → **Attendu :** modification perdue.
**Cas limites :** ne JAMAIS utiliser cet écran comme source de vérité ; le vrai écran lots = `/coproprietaires/lots`.
**Règle métier :** néant (maquette).

---

### Réglage des relances — `/settings/reminders` (CANONIQUE)

## TC-SET-003 : Affichage de la configuration des relances
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » sélectionnée.
**Étapes :**
1. Aller sur `/settings/reminders` → **Attendu :** titre « Configuration des relances » + sous-titre « …pour Résidence Martin ». Trois blocs visibles : statut/pause, tableau des règles (paliers J+N), grille des modèles d'e-mail. Un bouton « Retour aux relances » (→ `/finance/unpaid/reminders`).
2. Vérifier le tableau des règles → **Attendu :** une ligne par palier (ex. J+15, J+30, J+60, J+90), avec son état actif/inactif, son délai en jours et le modèle d'e-mail associé.
3. Vérifier la grille des modèles → **Attendu :** seuls les modèles dont le code commence par `payment_reminder` apparaissent (filtre métier).
**Cas limites :** aucune copro sélectionnée → écran « Chargement de la configuration… » qui ne se débloque pas (attendu : sélectionner d'abord une copro). Erreur réseau → état d'erreur avec bouton « Réessayer ».
**Règle métier :** relances automatiques J+15 / J+30 / J+60 / J+90 (cf. modules.md).

## TC-SET-004 : Mettre les relances en pause (et enregistrer)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin », relances actuellement non en pause.
**Étapes :**
1. Activer l'interrupteur « Pause » → **Attendu :** un bouton « Enregistrer » devient actif (l'écran détecte une modification non sauvegardée).
2. Renseigner une date « En pause jusqu'au » (ex. dans 1 mois) et un motif (ex. « Vacances syndic ») → **Attendu :** champs acceptés.
3. Cliquer « Enregistrer » → **Attendu :** sauvegarde OK, le bouton « Enregistrer » se désactive. **Effet base :** ligne `reminder_settings` de la copro avec `is_paused = true`, `paused_until` et `pause_reason` renseignés (upsert : créée si absente).
4. Recharger la page → **Attendu :** la pause est toujours active avec sa date et son motif (persistance confirmée).
**Cas limites :** désactiver la pause puis enregistrer → `is_paused = false` ; les champs date/motif peuvent rester ou être vidés (`null`). Pause sans date/motif → autorisé (champs facultatifs).
**Règle métier :** une copro en pause ne doit plus déclencher de relance automatique (vérifié via TC-SET-007).

## TC-SET-005 : Activer / désactiver un palier de relance
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin ».
**Étapes :**
1. Dans le tableau des règles, basculer l'état d'un palier (ex. désactiver J+60) → **Attendu :** l'état change immédiatement. **Effet base :** `payment_reminder_rules.is_active` de cette règle passé à `false`.
2. Recharger → **Attendu :** le palier reste désactivé.
3. Le réactiver → **Attendu :** `is_active = true`, persistant.
**Cas limites :** une erreur serveur affiche une alerte « Erreur: … » et l'état n'est pas modifié.
**Règle métier :** seuls les paliers actifs sont parcourus par le moteur de relance.

## TC-SET-006 : Modifier le délai d'un palier (validation 1–365, anti-doublon)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », au moins 2 paliers actifs (ex. J+15 et J+30).
**Étapes :**
1. Changer le délai d'un palier à `45` → **Attendu :** accepté. **Effet base :** `delay_days = 45` enregistré.
2. Saisir `0` (ou un nombre négatif) → **Attendu :** alerte « Le delai doit etre entre 1 et 365 jours », pas d'enregistrement.
3. Saisir `400` → **Attendu :** même alerte (borne haute 365).
4. Mettre le délai d'un palier à une valeur déjà utilisée par un AUTRE palier actif (ex. mettre J+30 alors qu'un palier J+30 actif existe déjà) → **Attendu :** alerte « Une regle active existe deja pour J+30 », pas d'enregistrement.
**Cas limites :** la borne 1 et la borne 365 doivent être acceptées (test des extrêmes). Deux paliers peuvent partager un délai si l'un est INACTIF (le contrôle ne porte que sur les règles actives).
**Règle métier :** un délai = nombre de jours après échéance avant relance ; pas de doublon de palier actif.

## TC-SET-007 : Lancer un test à blanc (dry-run) des relances
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin » (idéalement avec des impayés pour avoir un nombre > 0).
**Étapes :**
1. Cliquer « Tester » (lancement à blanc) → **Attendu :** appel de la fonction serveur `run_payment_reminders` en mode `dry_run` (aucun e-mail réellement envoyé). Un résultat s'affiche : nombre d'e-mails qui SERAIENT envoyés, ou message de pause.
2. Vérifier qu'aucune relance réelle n'a été créée → **Effet base :** AUCUNE nouvelle ligne dans `payment_reminders`, aucun e-mail parti (mode test).
3. Mettre la copro en pause (TC-SET-004) puis relancer le test → **Attendu :** le résultat indique l'état « en pause » (sent = 0), confirmant que la pause coupe bien les relances.
**Cas limites :** erreur serveur → message « Erreur inconnue » ou détail de l'erreur ; le bouton ne reste pas bloqué en chargement. Copro sans impayé → « 0 envoyé » sans erreur.
**Règle métier :** le test à blanc ne doit JAMAIS envoyer de vrai e-mail ni écrire de relance (idempotence / sécurité).

## TC-SET-008 : Associer un modèle d'e-mail à un palier
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », au moins un modèle `payment_reminder_*` disponible.
**Étapes :**
1. Sur une ligne de palier, ouvrir le sélecteur de modèle et choisir un modèle d'e-mail → **Attendu :** sélection prise en compte. **Effet base :** `payment_reminder_rules.template_id` mis à jour avec l'id du modèle.
2. Choisir « (aucun modèle) » → **Attendu :** `template_id = null` enregistré (le palier utilisera le modèle par défaut selon le délai).
3. Recharger → **Attendu :** le choix est conservé.
**Cas limites :** un modèle dont le code ne commence pas par `payment_reminder` ne doit pas apparaître dans la liste.
**Règle métier :** un palier sans modèle explicite retombe sur le modèle `payment_reminder_<délai>`.

## TC-SET-009 : Éditer le contenu d'un modèle d'e-mail de relance
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin ».
**Étapes :**
1. Dans la grille des modèles (ou via « voir le modèle » d'une règle), ouvrir un modèle d'e-mail → **Attendu :** une fenêtre d'édition s'ouvre avec l'objet (subject), le corps HTML et le corps texte.
2. Modifier l'objet et le corps, puis enregistrer → **Attendu :** fenêtre fermée, modèle rafraîchi. **Effet base :** `email_templates` mis à jour (`subject`, `body_html`, `body_text`, `updated_at`).
3. Rouvrir le modèle → **Attendu :** les nouvelles valeurs sont là (persistance).
**Cas limites :** erreur serveur → alerte « Erreur: … », la fenêtre reste ouverte. Variables disponibles ({{...}}) : vérifier qu'elles ne sont pas cassées par l'édition.
**Règle métier :** les modèles globaux (`copro_id = null`) sont partagés ; un modèle propre à la copro a `copro_id` renseigné.

## TC-SET-010 : Lecture seule pour un non-gestionnaire (RLS / rôle)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** compte sans rôle gestionnaire sur la copro (théorique — un seul compte existe aujourd'hui, donc cas à vérifier dès qu'un compte copropriétaire existera).
**Étapes :**
1. Ouvrir `/settings/reminders` en tant que non-gestionnaire → **Attendu :** les interrupteurs, champs et boutons d'enregistrement sont désactivés (l'écran reçoit `isManager = false`).
2. Tenter une écriture directe (via outil/console) → **Attendu :** refus côté base (RLS ON+FORCE bloque l'écriture par un non-gestionnaire).
**Cas limites :** avec le seul compte démo (gestionnaire), ce cas n'est pas reproductible en l'état — à documenter comme « à tester quand le portail copropriétaire existera ».
**Règle métier :** seul le syndic/gestionnaire configure les relances.

---

### Modèles de Procès-Verbal — `/settings/templates` (CANONIQUE)

## TC-SET-011 : Lister les modèles de PV
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » sélectionnée.
**Étapes :**
1. Aller sur `/settings/templates` → **Attendu :** titre « Templates de Procès-Verbal », au moins un modèle système par défaut + une carte « Créer un nouveau template ». Chaque carte montre nom, date, statut de validation.
2. Repérer le modèle système → **Attendu :** marqué comme tel ; l'édition directe est interdite (cf. TC-SET-014).
**Cas limites :** copro non encore résolue au montage → état de chargement, puis liste ; pas de requête avec un id vide.
**Règle métier :** un modèle de PV par défaut existe pour la génération des PV d'AG.

## TC-SET-012 : Créer un nouveau modèle de PV
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin ».
**Étapes :**
1. Cliquer « Nouveau template », saisir un nom (ex. « Modèle test syndic ») + description, valider → **Attendu :** redirection automatique vers l'éditeur `/settings/templates/<id>`. **Effet base :** nouvelle ligne dans `pv_templates` rattachée à la copro/organisation.
2. Revenir à la liste → **Attendu :** le nouveau modèle apparaît.
**Cas limites :** nom vide → la création ne se déclenche pas (bouton sans effet). Aucune copro / session expirée → message « Aucune copropriété active ou session expirée — création impossible ».
**Règle métier :** modèles multi-tenant (par organisation).

## TC-SET-013 : Dupliquer, définir par défaut, supprimer un modèle de PV
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin », au moins un modèle non-système existant.
**Étapes :**
1. Sur un modèle, menu → « Dupliquer » → **Attendu :** copie créée (« … (copie) »), redirection vers son éditeur. **Effet base :** nouvelle ligne `pv_templates`.
2. Menu → « Définir par défaut » sur un modèle → **Attendu :** ce modèle devient le défaut, l'ancien défaut perd ce statut. **Effet base :** via la fonction serveur transactionnelle (un seul défaut garanti par l'index unique partiel `uq_pv_templates_default` — pas de doublon de défaut).
3. Menu → « Supprimer » → confirmation → **Attendu :** le modèle disparaît de la liste. **Effet base :** ligne supprimée.
**Cas limites :** définir par défaut deux fois de suite ne doit pas créer 2 défauts (atomicité). Supprimer le modèle par défaut → vérifier le comportement (un autre devient-il défaut ?).
**Règle métier :** un seul modèle de PV par défaut par organisation.

## TC-SET-014 : Un modèle système est en lecture seule
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », modèle système présent.
**Étapes :**
1. Tenter d'ouvrir l'éditeur d'un modèle système (`/settings/templates/<id-systeme>`) → **Attendu :** écran « Template système — Les templates système ne peuvent pas être modifiés. Dupliquez-le… » + bouton retour. Aucun champ éditable.
2. Dupliquer le modèle système puis éditer la copie → **Attendu :** la copie (non-système) est éditable normalement.
**Cas limites :** tenter une sauvegarde forcée d'un modèle système (via spec) → refus « Le template système ne peut pas être modifié — dupliquez-le ».
**Règle métier :** la base de modèles système est protégée en écriture.

## TC-SET-015 : Éditer, prévisualiser et exporter un modèle de PV
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un modèle de PV non-système.
**Étapes :**
1. Ouvrir l'éditeur, onglet « Sections » : activer/désactiver une section optionnelle, modifier son contenu → **Attendu :** badge « Non enregistré » apparaît ; la sauvegarde persiste dans `pv_templates.spec` (sections). Les sections marquées « obligatoires » ne peuvent pas être désactivées.
2. Onglet « Paramètres » : changer une couleur / police / marge → **Attendu :** modification prise dans `spec.global` / `spec.header`.
3. Onglet « Formulations » : modifier une formulation → **Attendu :** enregistré dans `spec.formulations`.
4. Bouton « Aperçu » → **Attendu :** panneau d'aperçu HTML rendu avec des données de démonstration ; erreurs de variables listées le cas échéant.
5. Insérer une variable depuis la palette dans une section → **Attendu :** la variable {{...}} est insérée à la position du curseur.
6. Exporter en HTML, PDF, puis Word (.docx) → **Attendu :** un fichier est téléchargé pour chaque format, sans erreur.
**Cas limites :** export pendant un chargement → bouton désactivé (spinner). Variable inexistante → signalée dans les erreurs d'aperçu.
**Règle métier :** le PV généré doit respecter la structure légale (sections obligatoires non désactivables).

## TC-SET-015b : Importer / Exporter un modèle de PV en JSON
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un modèle existant.
**Étapes :**
1. Sur un modèle, menu → « Exporter » → **Attendu :** téléchargement d'un fichier `template-<id>.json` contenant `name`, `description`, `spec`.
2. Bouton « Importer », coller le JSON exporté, valider → **Attendu :** nouveau modèle créé à partir du JSON, redirection vers son éditeur. **Effet base :** nouvelle ligne `pv_templates`.
3. Importer un JSON invalide (sans `name` ou sans `spec.sections`) → **Attendu :** message « JSON invalide : champs name et spec.sections requis. », pas de création.
**Cas limites :** JSON syntaxiquement cassé → message « JSON invalide ». Import sans copro active → « Aucune copropriété active — import impossible ».
**Règle métier :** néant (portabilité des modèles).

---

### Banque de résolutions (modèles d'AG) — `/ag/resolutions` (CANONIQUE)

## TC-SET-016 : Afficher la banque de résolutions et le verrou « cabinet »
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » sélectionnée.
**Étapes :**
1. Menu AG → « Bibliothèque des résolutions » (`/ag/resolutions`) → **Attendu :** titre « Bibliothèque de résolutions », un compteur de modèles « conformes à la législation française », barre de recherche, tri, filtres.
2. Vérifier les niveaux des cartes → **Attendu :** chaque résolution porte un niveau « Système », « Cabinet » ou « Cette copro ». Les modèles « Système » sont en lecture seule (pas de bouton Modifier/Supprimer).
3. Si le compte n'a PAS de cabinet associé → **Attendu :** bandeau « Aucun cabinet associé à votre compte — la création de modèles est désactivée » et bouton « Créer un modèle » désactivé/absent. Si le compte A un cabinet → le bouton « Créer un modèle » est actif.
**Cas limites :** noter explicitement si le compte démo a ou non un cabinet (conditionne TC-SET-017/018/019). Sans cabinet, seuls les modèles Système sont visibles.
**Règle métier :** modèles à 3 niveaux de portée (Système / Cabinet / Copro) ; un cabinet est requis pour créer.

## TC-SET-017 : Créer un modèle de résolution (cabinet ou copro)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin », compte AVEC cabinet associé.
**Étapes :**
1. « Créer un modèle » → remplir titre, catégorie, texte, majorité (art. 24/25/26…), tags, et choisir la portée (cabinet vs « cette copro »), valider → **Attendu :** fenêtre fermée, le modèle apparaît dans la liste avec le bon badge de niveau. **Effet base :** nouvelle ligne `resolution_templates` avec `cabinet_id` renseigné ; `copro_id` = la copro si portée « cette copro », sinon `null` ; `code = null`, `scope = 'org'`.
2. Rechercher le modèle créé → **Attendu :** trouvé par titre / texte / tags.
**Cas limites :** sans cabinet → message « Aucun cabinet associé à votre compte. Impossible de créer un modèle ». Champs obligatoires manquants → erreur de validation dans l'éditeur. Majorité incohérente avec le type d'AG → vérifier le comportement de filtrage.
**Règle métier :** majorités légales art. 24 (simple) / 25 (absolue) / 25-1 / 26 (double) / 26-1 / unanimité (business-rules.md).

## TC-SET-018 : Modifier / dupliquer / supprimer un modèle de résolution
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin », compte avec cabinet, au moins un modèle Cabinet OU Copro éditable.
**Étapes :**
1. Sur un modèle « Cabinet » ou « Cette copro », cliquer « Modifier », changer le texte, enregistrer → **Attendu :** modèle mis à jour. **Effet base :** `resolution_templates` ligne modifiée (mappage snake_case ↔ camelCase via le point d'entrée unique `mapRowFromDb`).
2. Sur n'importe quel modèle (même Système), cliquer « Dupliquer » → **Attendu :** une copie « … (copie) » est créée au niveau Cabinet. **Effet base :** nouvelle ligne avec `cabinet_id` du cabinet courant, `copro_id = null`, titre suffixé « (copie) ».
3. Sur un modèle éditable, « Supprimer » → confirmation « Supprimer ce modèle de résolution ? Cette action est irréversible. » → valider → **Attendu :** modèle disparu. **Effet base :** ligne supprimée.
**Cas limites :** annuler la confirmation de suppression → rien n'est supprimé.
**Règle métier :** un modèle dupliqué devient réutilisable au niveau cabinet ; on choisit la portée « cette copro » à la (re)création.

## TC-SET-019 : Verrou « modèle système non modifiable / non supprimable »
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », au moins un modèle « Système ».
**Étapes :**
1. Sur une carte « Système », vérifier l'absence des boutons « Modifier » et « Supprimer » (seul « Dupliquer » est proposé) → **Attendu :** conforme.
2. Forcer une mise à jour d'un modèle système (via outil) → **Attendu :** refus « Un modèle système est en lecture seule. »
3. Forcer une suppression d'un modèle système → **Attendu :** refus « Un modèle système ne peut pas être supprimé. »
**Cas limites :** id introuvable → « Modèle introuvable. »
**Règle métier :** la base de modèles Système (`cabinet_id = null`) est protégée en écriture/suppression.

## TC-SET-020 : Recherche, filtres et tri de la banque de résolutions
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** « Résidence Martin ».
**Étapes :**
1. Rechercher un mot (ex. « budget ») → **Attendu :** la liste se filtre sur titre/texte/tags, le compteur « X résolutions trouvées sur Y » se met à jour ; bouton « Effacer » remet la liste complète.
2. Ouvrir « Filtres » : filtrer par catégorie, type d'AG (Ordinaire/Extraordinaire), majorité, tag, « obligatoires uniquement » → **Attendu :** la liste reflète les filtres, le badge de compteur de filtres actifs s'incrémente ; « Réinitialiser » remet tout à zéro.
3. Changer le tri (Pertinence / Plus utilisées / Alphabétique / Par catégorie / Récentes) → **Attendu :** l'ordre des cartes change ; en mode « Par catégorie », les résolutions sont groupées et pliables.
4. Pagination (si plus d'une page) → **Attendu :** Précédent/Suivant changent de page, désactivés aux extrémités.
**Cas limites :** recherche sans résultat → état vide « Aucune résolution trouvée » + bouton réinitialiser si filtré. Section « Mes modèles personnalisés » visible seulement s'il y en a et sans filtre actif.
**Règle métier :** « obligatoires » = résolutions imposées pour un type d'AG donné.

## TC-SET-021 : Cohérence banque ↔ modale AG (même donnée, deux entrées)
**Priorité :** P2
**Type :** Régression
**Préconditions / jeu de données :** « Résidence Martin », une AG en préparation (statut permettant l'édition de l'ordre du jour).
**Étapes :**
1. Créer un modèle de résolution depuis `/ag/resolutions` (TC-SET-017).
2. Aller dans `/ag/[id]/agenda`, ouvrir la modale « Bibliothèque de résolutions » → **Attendu :** le modèle créé y apparaît aussi (même table `resolution_templates`, même fournisseur de données). Son niveau (Cabinet/Copro) est cohérent.
3. Ajouter ce modèle à l'ordre du jour de l'AG → **Attendu :** la résolution est ajoutée ; dans la modale elle passe à « Déjà ajoutée ».
**Cas limites :** un modèle de portée « cette copro » créé sur une autre copro ne doit PAS apparaître ici (isolation par `copro_id`). Un modèle Cabinet doit apparaître sur toutes les copros du cabinet.
**Règle métier :** isolation multi-tenant (Système global, Cabinet par cabinet, Copro par copro).

---

## Jeu de données requis (rappel)

- **Connexion** : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`). Seul utilisateur ; affiché « Jean Dupont ».
- **Copro principale de test** : « Résidence Martin » (6 copropriétaires, 7 lots, clés « Charges générales » + « Bâtiment A » + « Bâtiment B », 1000 tantièmes) — la plus complète pour relances/impayés.
- **Pré-requis impayés** (pour TC-SET-007, test à blanc significatif) : avoir au moins un lot avec un impayé sur « Résidence Martin » ; sinon le dry-run renverra 0 (toujours valide, juste moins parlant).
- **Cabinet associé** : vérifier au début (TC-SET-016) si le compte démo a un `cabinet_id`. Beaucoup de cas de la banque de résolutions (création/modif/suppression) en dépendent.
- **AG en préparation** (pour TC-SET-021) : une AG dont l'ordre du jour est encore éditable sur « Résidence Martin ».
- **Copro alternative** : « Residence Paris Ivry » (partielle, clé générale à 0) ou une copro jetable via `create_test_copro_seeded()` pour tester l'isolation multi-tenant des modèles de portée « cette copro ».
- **Ne pas utiliser** comme source de vérité : `/settings/info` (maquette) ni les écrans cabinet `/parametres-cabinet`, `/facturation`, `/prestataires`, `/modeles` (bouchons).
