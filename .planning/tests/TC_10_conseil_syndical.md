# Plan de test — Conseil Syndical

> Domaine fonctionnel : gestion du conseil syndical (membres élus + rapports d'activité).
> Stack : Next.js 16 / React 19 / CSS Modules / Supabase cloud `qqfqrcolzmcbsvfaumiq` (RLS ON+FORCE).
> Compte de test : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`), nom affiché « Jean Dupont ». Sélection de la copro depuis `/portefeuille`.

---

## Périmètre & écrans canoniques

Le domaine vit sur **deux routes** seulement, plus un point d'entrée côté AG :

1. **`/conseil-syndical`** — page à 2 onglets (`src/app/(dashboard)/conseil-syndical/page.tsx`) :
   - **Onglet « Rapports d'activité »** (onglet actif par défaut) : liste des rapports de la copro + bouton **« Nouveau rapport »**. Chaque carte est cliquable et mène à l'éditeur.
   - **Onglet « Membres »** : grille de cartes (nom, rôle, e-mail) **en lecture seule**. Les membres sont lus via la vue `v_council_members_detail` (migration 0061). Aucun bouton d'ajout/suppression/désignation ici : la composition du conseil se décide **uniquement en AG**.

2. **`/conseil-syndical/rapport/[id]`** — éditeur de rapport (`src/app/(dashboard)/conseil-syndical/rapport/[id]/page.tsx`) :
   - **Header** : titre, badge de statut, période, indicateur de sauvegarde, boutons « Sauvegarder » et « Soumettre pour révision ».
   - **Éditeur** (zone principale) : titre, introduction/résumé, rapport détaillé, sections additionnelles (ajout / renommage / réordonnancement / suppression).
   - **Sidebar** : statut, annexes (ajout/suppression), aperçu du texte de résolution AG, actions de workflow (Valider, Lier à une AG / Publier).
   - **Auto-save** : sauvegarde automatique débouncée (3 s pour le contenu, 800 ms pour les sections).
   - **Persistance réelle** (migration 0053) : tables `rapports_activite_cs` + `sections_rapport_cs` + `annexes_rapport_cs`.

3. **Élection du conseil via AG** (point d'entrée amont, hors-route conseil-syndical) :
   - Résolution canonique **`ELECT_COUNCIL`** (« Élection des membres du conseil syndical », art. 25), générée automatiquement dans l'ordre du jour d'une AG ordinaire.
   - À l'activation des décisions de l'AG (`activate_ag_decisions`, étape PV), la base **désactive l'ancien conseil** (`is_active = false`, `end_date = current_date`) puis **upserte les élus** dans `council_members`. C'est le **seul** mécanisme qui peuple l'onglet « Membres ».
   - Garde métier : un élu doit être un **copropriétaire actif** (au moins un lot actif dans la copro), sinon l'activation échoue.
   - Revue lecture seule des élus à l'étape Finalisation AG : `BlocConseilSyndical.tsx`.

> Rôles en base (`council_role`, enum migration 0003) : `president`, `secretary`, `treasurer`, `member`, `observer`. L'UFFI affiche en français (Président / Secrétaire / Trésorier / Membre) ; `observer` est rabattu sur « Membre ».

---

## Écrans morts / doublons (NE PAS tester)

Ces éléments existent dans le code mais ne sont **pas le parcours canonique** ; ne pas écrire de cas de test dessus.

- **`DesignationMultiplePanel` + `useDesignationMultiple`** (`src/components/features/ag/Session/`, `src/hooks/modules/useDesignationMultiple.ts`) : ancien wizard d'« Élection du Conseil Syndical » pendant la séance. Le vote est **simulé** (`setTimeout` + résultat codé en dur `pour: 100/contre: 10`), l'état est **purement local** et n'est jamais persisté dans `council_members`. C'est un prototype non câblé au flux réel — la vraie élection passe par la résolution `ELECT_COUNCIL` + `activate_ag_decisions`. À ne pas confondre avec le vrai parcours.
- **Export PDF du rapport** : le bouton « Exporter en PDF » de la sidebar affiche `alert('Export PDF en cours de développement')` — fonctionnalité absente, ne pas tester comme fonctionnelle (un seul cas négatif documenté ci-dessous).
- **Upload de fichier dans une annexe** : le champ fichier de la modale d'annexe et l'upload Storage sont des **TODO** (`// TODO: Upload fichier`). Seuls le nom et le type d'annexe sont persistés ; le fichier n'est pas envoyé. Ne pas tester l'upload réel.
- **Migrations legacy** : `supabase/migrations_legacy/20241231_create_conseil_syndical.sql`, `20260126_niveau6b_council_communication*.sql` — schéma d'une ancienne modélisation (« conseil_syndical » comme entité). Non actif. Ignorer.
- **`council_documents`** : table de **liens vers la GED**, n'a jamais porté les rapports (commentaire explicite dans `useConseilSyndicalPage.ts`). Les rapports vivent dans `rapports_activite_cs` (0053). Ne pas tester.
- **Mock-data conseil** (`src/lib/mock-data/entities/*`) : données factices non utilisées par les pages réelles (qui tapent Supabase). Ignorer.
- **`soumettrePourRevision` / statut `en_revision`** : conservé comme étape de workflow mais sans collaboration multi-utilisateurs réelle (un seul compte démo). Testé une fois pour la mécanique de statut, pas en tant que vrai flux de relecture à plusieurs.

---

## Cas de test

### A. Page Conseil Syndical — navigation & onglets

## TC-CS-001 : Accès à la page Conseil Syndical et onglet par défaut
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté en démo, copro « Résidence Martin » sélectionnée depuis `/portefeuille`.
**Étapes :**
1. Depuis le menu, ouvrir « Conseil Syndical » (`/conseil-syndical`) → **Attendu :** la page s'affiche avec le titre « Conseil Syndical », le sous-titre « Gestion des membres et des rapports d'activité », et **deux onglets** : « Rapports d'activité » et « Membres ».
2. Observer l'onglet actif au chargement → **Attendu :** l'onglet **« Rapports d'activité »** est actif par défaut (bouton « Nouveau rapport » visible).
**Cas limites :** sans copro sélectionnée, la page se charge mais membres et rapports restent vides (le hook ne déclenche le chargement que si `currentCoproId` existe). Pas de message d'erreur attendu.
**Règle métier :** —

## TC-CS-002 : Bascule entre les onglets Rapports et Membres
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** copro « Résidence Martin », page conseil-syndical ouverte.
**Étapes :**
1. Cliquer sur l'onglet « Membres » → **Attendu :** la grille de membres remplace la liste des rapports, l'onglet « Membres » prend le style actif.
2. Cliquer sur l'onglet « Rapports d'activité » → **Attendu :** la liste des rapports réapparaît, l'onglet « Rapports » redevient actif.
**Cas limites :** la bascule est purement front (`activeTab` local), aucun rechargement réseau attendu entre les onglets.
**Règle métier :** —

### B. Onglet Membres (lecture seule, alimenté par l'AG)

## TC-CS-003 : Affichage des membres élus du conseil
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** copro disposant d'un conseil élu (membres actifs dans `council_members`). Si « Résidence Martin » n'a pas de conseil, le créer au préalable via le parcours TC-CS-014 (élection en AG) ou utiliser une copro où l'élection a déjà été activée.
**Étapes :**
1. Ouvrir l'onglet « Membres » → **Attendu :** une carte par membre **actif** (`is_active = true`), avec initiales en avatar, nom complet, **rôle traduit en français** (Président / Secrétaire / Trésorier / Membre) et e-mail cliquable (`mailto:`).
2. Vérifier l'ordre → **Attendu :** les membres sont triés par rôle (tri base `order by role`).
3. Croiser avec la base → **Attendu (BDD) :** chaque carte correspond à une ligne de `v_council_members_detail` où `copro_id` = copro courante et `is_active = true` ; les membres désactivés (anciens conseils) **n'apparaissent pas**.
**Cas limites :**
- Membre rattaché à un **profile** (et non à un coproprietaire) : `first_name`/`last_name` NULL → l'affichage retombe sur `full_name` (jamais de carte au nom vide).
- Membre **société** (`company_name`) : affiché via `full_name` = raison sociale.
- E-mail manquant : champ e-mail vide, pas de plantage.
**Règle métier :** composition du conseil syndical (art. 21 loi 1965 / art. 22-26 décret 1967).

## TC-CS-004 : Copro sans conseil élu — état vide de l'onglet Membres
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** copro **sans aucun membre actif** dans `council_members` (ex. « Residence Paris Ivry » si aucune élection activée, ou une copro HARNESS fraîche).
**Étapes :**
1. Ouvrir l'onglet « Membres » → **Attendu :** la grille est vide (aucune carte), sans erreur ni spinner bloqué.
**Cas limites :** vérifier qu'aucun membre d'une **autre** copro ne s'affiche (cloisonnement par `copro_id` + RLS).
**Règle métier :** —

## TC-CS-005 : Cloisonnement RLS des membres entre copros
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** au moins deux copros, dont une avec conseil élu (« Résidence Martin ») et une autre.
**Étapes :**
1. Sélectionner « Résidence Martin », noter la liste des membres → **Attendu :** liste A.
2. Revenir au portefeuille, sélectionner une autre copro, ouvrir l'onglet « Membres » → **Attendu :** la liste change et ne contient **aucun** membre de la copro précédente.
3. (BDD) Vérifier que la vue `v_council_members_detail` est `security_invoker = true` → **Attendu :** l'utilisateur ne voit que les membres des copros auxquelles il a accès (RLS 0034 héritée).
**Cas limites :** un utilisateur sans accès à une copro ne doit récupérer aucune ligne même en forçant l'URL/le contexte.
**Règle métier :** RLS — `user_has_copro_access`.

### C. Onglet Rapports — liste & création

## TC-CS-006 : Liste des rapports d'activité de la copro
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** copro « Résidence Martin » avec au moins un rapport existant (sinon en créer un via TC-CS-007 d'abord).
**Étapes :**
1. Ouvrir l'onglet « Rapports d'activité » → **Attendu :** une carte par rapport, affichant : titre, badge de statut (Brouillon / En révision / Validé / Publié) avec icône, période (mois/année début → fin), nombre d'annexes (si > 0), extrait d'introduction, date de dernière modification.
2. Vérifier l'ordre → **Attendu :** rapports triés du plus récent au plus ancien (`order by created_at desc`).
3. (BDD) **Attendu :** seuls les rapports où `copro_id` = copro courante sont listés (cloisonnement + RLS).
**Cas limites :** rapport sans introduction → « Aucune introduction » affiché ; rapport sans annexe → pas de pastille d'annexes.
**Règle métier :** —

## TC-CS-007 : Création d'un nouveau rapport (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** copro « Résidence Martin » sélectionnée, session valide.
**Étapes :**
1. Onglet « Rapports », cliquer « Nouveau rapport » → **Attendu :** redirection automatique vers `/conseil-syndical/rapport/[nouvel-id]`.
2. Observer l'en-tête du nouvel éditeur → **Attendu :** titre pré-rempli du type « Rapport d'activité AAAA-AAAA » (année précédente → année courante), statut **Brouillon**, période début = 1er juin de l'an passé / fin = 31 mai de l'an courant.
3. (BDD) Vérifier la ligne créée dans `rapports_activite_cs` → **Attendu :** `copro_id` = copro courante, `author_id` = id de l'utilisateur de session, `status = 'brouillon'`, `period_start`/`period_end` en dates locales (pas de glissement d'un jour dû à l'UTC).
**Cas limites :**
- **Sans copro sélectionnée** : le handler ne fait rien (`if (!currentCoproId) return`), pas de création.
- **Session expirée** (`user.id` absent) : alerte « Session expirée — reconnectez-vous pour créer un rapport. », pas de création.
**Règle métier :** le rapport est rattaché à la copro (le « conseil syndical » n'est pas une entité persistée).

### D. Éditeur de rapport — contenu & sauvegarde

## TC-CS-008 : Édition du titre, de l'introduction et du contenu + auto-save
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** un rapport au statut **Brouillon** ouvert dans l'éditeur.
**Étapes :**
1. Modifier le titre dans le champ « Titre du rapport » → **Attendu :** l'indicateur de sauvegarde passe à « Modifications non sauvegardées » (icône horloge).
2. Saisir un texte dans « Introduction / Résumé » et dans « Rapport détaillé » → **Attendu :** la saisie reste fluide (texte ne « saute » pas).
3. Attendre ~3 s sans action → **Attendu :** l'indicateur passe à « Sauvegarde... » puis « Sauvegardé » (auto-save débouncée).
4. Recharger la page (F5) → **Attendu :** le titre, l'intro et le contenu saisis sont conservés.
5. (BDD) **Attendu :** `rapports_activite_cs` reflète `title`, `introduction`, `content` ; `content_text` contient le texte **sans balises HTML** (strip).
**Cas limites :** un échec réseau d'auto-save n'efface PAS la saisie en cours (bannière d'erreur affichée, mais l'éditeur reste rempli) ; pas d'unhandled rejection.
**Règle métier :** —

## TC-CS-009 : Sauvegarde manuelle via le bouton « Sauvegarder »
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** rapport Brouillon ouvert, une modification non sauvegardée en attente.
**Étapes :**
1. Cliquer « Sauvegarder » → **Attendu :** l'indicateur passe par « Sauvegarde... » puis « Sauvegardé », et le bouton se désactive quand il n'y a plus de modifications en attente.
2. (BDD) **Attendu :** la ligne `rapports_activite_cs` est à jour.
**Cas limites :** le bouton « Sauvegarder » n'est visible que si le rapport est éditable (Brouillon ou En révision) ; il est désactivé quand `hasUnsavedChanges` est faux ou pendant une sauvegarde.
**Règle métier :** —

## TC-CS-010 : Gestion des sections additionnelles (ajout, renommage, réordonnancement, suppression)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** rapport Brouillon ouvert.
**Étapes :**
1. Cliquer « Ajouter une section », saisir un titre, valider → **Attendu :** la section apparaît dans la liste ; (BDD) une ligne dans `sections_rapport_cs` avec `rapport_id`, `copro_id` (dérivé du rapport), `sort_order`.
2. Déplier la section et saisir un contenu → **Attendu :** après ~800 ms le contenu est persisté (débounce section) ; recharger conserve le contenu.
3. Ajouter une 2e section, puis cliquer la flèche « Monter » / « Descendre » → **Attendu :** l'ordre change à l'écran et les `sort_order` sont réécrits en base.
4. Supprimer une section (corbeille) → **Attendu :** la section disparaît ; (BDD) la ligne `sections_rapport_cs` est supprimée.
**Cas limites :**
- Bouton « Ajouter » désactivé si le titre est vide.
- Frappe rapide titre puis contenu : les deux mises à jour sont **accumulées** et ne s'écrasent pas mutuellement (débounce par section).
- Flèches « Monter »/« Descendre » désactivées aux extrémités.
**Règle métier :** —

## TC-CS-011 : Ajout et suppression d'une annexe (sans fichier)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** rapport Brouillon ou En révision ouvert.
**Étapes :**
1. Dans la sidebar, section « Annexes », cliquer « + » → **Attendu :** une modale « Ajouter une annexe » s'ouvre (champ nom, sélecteur type Document/Image/Tableau, champ fichier optionnel).
2. Saisir un nom, choisir un type, valider « Ajouter » → **Attendu :** l'annexe apparaît dans la liste avec l'icône du type, le compteur « Annexes (N) » s'incrémente ; (BDD) une ligne dans `annexes_rapport_cs` (`name`, `kind`, `sort_order` = max+1, `copro_id` dérivé).
3. Cliquer la corbeille d'une annexe → **Attendu :** l'annexe disparaît ; (BDD) la ligne est supprimée.
**Cas limites :**
- Bouton « Ajouter » désactivé si le nom est vide.
- Le champ **fichier est un TODO** : même en sélectionnant un fichier, `file_url` reste NULL (pas d'upload Storage). Ne pas attendre de téléchargement réel.
- Les boutons d'ajout/suppression d'annexe ne sont visibles que si le rapport est éditable (Brouillon/En révision).
**Règle métier :** —

## TC-CS-012 : Édition bloquée sur un rapport Validé ou Publié (lecture seule)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** un rapport au statut **Validé** (ou Publié) ouvert dans l'éditeur.
**Étapes :**
1. Observer l'éditeur → **Attendu :** champs titre/intro/contenu **désactivés** (`disabled`), pas de bouton « Ajouter une section », pas de boutons d'ajout/suppression d'annexe, pas de bouton « Sauvegarder » ni « Soumettre ».
2. Tenter de modifier un champ → **Attendu :** impossible (champ verrouillé).
**Cas limites :** l'édition est rouverte uniquement pour les statuts Brouillon et En révision (`canEdit`).
**Règle métier :** un rapport validé est figé (intégrité du document soumis à l'AG).

### E. Workflow de validation du rapport

## TC-CS-013 : Cycle de statut Brouillon → En révision → Validé
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** un rapport **Brouillon** avec titre + introduction renseignés.
**Étapes :**
1. Dans le header, cliquer « Soumettre pour révision » → **Attendu :** le statut passe à **En révision** (badge mis à jour, message sidebar « soumis pour relecture ») ; (BDD) `status = 'en_revision'`. Les modifications en attente sont d'abord sauvegardées.
2. Dans la sidebar (section Actions), cliquer « Valider le rapport » → **Attendu :** statut **Validé** ; (BDD) `status = 'valide'`, `validated_by` = id utilisateur de session (= `profiles.id`, PAS un `council_members.id`), `validated_at` renseigné.
**Cas limites :**
- Le bouton « Soumettre pour révision » n'est visible qu'en statut Brouillon.
- Le bouton « Valider le rapport » n'apparaît qu'en statut En révision.
- Après validation, l'éditeur passe en lecture seule (cf. TC-CS-012).
**Règle métier :** —

## TC-CS-014 : Génération du texte de résolution AG depuis le rapport
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** un rapport avec période et introduction renseignées.
**Étapes :**
1. Dans la sidebar, section « Résolution AG », cliquer « Aperçu » → **Attendu :** un encart affiche un texte du type « L'assemblée générale prend acte du compte rendu d'activité du Conseil Syndical pour la période de [mois année] à [mois année]. [introduction] Le rapport complet est annexé au présent procès-verbal. »
2. Vérifier que la période et l'introduction du rapport apparaissent bien dans le texte → **Attendu :** cohérence avec les valeurs saisies.
**Cas limites :** rapport sans introduction → le texte est généré sans le paragraphe d'intro (pas de plantage). Texte vide → message « Aucun texte généré (complétez le rapport) ».
**Règle métier :** compte rendu d'activité du conseil syndical présenté à l'AG (art. 21 loi 1965).

## TC-CS-015 : Publication d'un rapport validé vers une AG à venir
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** un rapport au statut **Validé** + au moins une AG **à venir** (statut `draft` ou `convoked`) dans la **même** copro.
**Étapes :**
1. Sidebar → cliquer « Lier à une AG » → **Attendu :** un sélecteur d'AG apparaît, listant uniquement les AG `draft`/`convoked` de la copro (titre + date).
2. Choisir une AG et cliquer « Publier vers cette AG » → **Attendu :** statut **Publié**, message sidebar « Lié à l'AG » ; (BDD) `status = 'publie'`, `ag_id` renseigné.
3. (BDD) Vérifier l'unicité → **Attendu :** un seul rapport Publié par AG ; un éventuel rapport précédemment publié sur cette même AG est passé en `archive`.
**Cas limites :**
- **Rapport non validé** : la publication est refusée côté service (« Seul un rapport validé peut être publié. »).
- **AG d'une autre copro** : refus (« Cette AG appartient à une autre copropriété. »).
- **AG déjà tenue/clôturée** (statut hors draft/convoked) : refus (« Le rapport se publie vers une AG à venir... »).
- **Aucune AG à venir** : message « Aucune AG à venir (brouillon ou convoquée) dans cette copropriété. », pas de sélecteur.
- **Conflit d'unicité** (23505) : message « Un rapport est déjà publié pour cette AG — archivez-le d'abord. »
**Règle métier :** le rapport du conseil est une **pièce de convocation** présentée à une AG future (art. 21 loi 1965).

## TC-CS-016 : Le rapport du conseil apparaît comme annexe de convocation
**Priorité :** P2
**Type :** Intégration
**Préconditions / jeu de données :** convocation d'une AG **ordinaire** (parcours AG → convocation).
**Étapes :**
1. Ouvrir l'écran de convocation d'une AG ordinaire, section annexes → **Attendu :** « Rapport du conseil syndical » figure dans la liste des annexes, catégorie « contextuel », **non obligatoire** (donc **décoché par défaut**).
2. Cocher l'annexe « Rapport du conseil syndical » → **Attendu :** elle s'ajoute à la liste des annexes incluses (`annexeNames` / `annexesForPDF`).
**Cas limites :** annexe optionnelle = exclue par défaut (différence avec les annexes 1-5 comptables qui sont obligatoires et toujours incluses).
**Règle métier :** rapport du conseil syndical = pièce de convocation (annexe contextuelle, recommandée mais non strictement obligatoire selon l'ordre du jour).

### F. Élection du conseil via AG (amont — peuplement de l'onglet Membres)

## TC-CS-017 : Présence de la résolution d'élection du conseil dans une AG ordinaire
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** création d'une AG ordinaire sur une copro (ordre du jour auto-généré).
**Étapes :**
1. Créer une AG ordinaire et ouvrir son ordre du jour → **Attendu :** une résolution « Élection des membres du conseil syndical » (`action_type = 'ELECT_COUNCIL'`, type `council`, majorité **art. 25**) est présente.
**Cas limites :** vérifier que cette résolution attend une variable `council_members[]` (liste des élus) — sans elle, la validation pré-activation signale « liste des membres élus manquante ou vide ».
**Règle métier :** élection du conseil syndical à la majorité de l'article 25 (loi 1965).

## TC-CS-018 : Activation de l'élection → peuplement de council_members
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** une AG ordinaire avec résolution `ELECT_COUNCIL` **votée et approuvée**, dont les variables `council_members[]` listent des copropriétaires **actifs** (au moins un lot actif chacun), avec rôles (1 `president`, le reste `member`). Copro « Résidence Martin » (6 copropriétaires actifs).
**Étapes :**
1. Dérouler la clôture de l'AG (`close_ag` → `prepare_ag_decisions`) puis l'activation à l'étape PV (`activate_ag_decisions`) → **Attendu :** pas d'erreur.
2. (BDD) Vérifier `council_members` pour la copro → **Attendu :** un ancien conseil éventuel est **désactivé** (`is_active = false`, `end_date = current_date`), et les nouveaux élus sont insérés (`is_active = true`, `start_date = current_date`, rôle conforme au payload).
3. Ouvrir `/conseil-syndical` onglet « Membres » → **Attendu :** les nouveaux élus s'affichent avec leur rôle ; les anciens (désactivés) n'apparaissent plus.
4. Vérifier l'étape Finalisation AG (`BlocConseilSyndical`) → **Attendu :** revue **lecture seule** des élus (couronne pour le président, libellé « Président du CS » / « Membre du CS »).
**Cas limites :**
- **Copropriétaire non actif** dans le payload (aucun lot actif) : l'activation **échoue** avec une erreur explicite (« n'est pas un copropriétaire actif de la copro »).
- **`coproprietaire_id` manquant** dans un élément du payload : échec (23514).
- **Idempotence / re-run le même jour** : un réélu déjà inséré au même `start_date` est toléré (upsert `on conflict (copro_id, coproprietaire_id, start_date)` → met à jour le rôle, réactive, `end_date = null`), pas de doublon.
**Règle métier :** élection du conseil (art. 21 loi 1965, art. 25 loi 1965 pour la majorité, art. 22-26 décret 1967).

## TC-CS-019 : Renouvellement du conseil (remplacement de l'ancienne composition)
**Priorité :** P1
**Type :** Intégration / Régression
**Préconditions / jeu de données :** une copro disposant déjà d'un conseil actif (issu de TC-CS-018), et une **nouvelle** AG avec `ELECT_COUNCIL` désignant une composition **différente**.
**Étapes :**
1. Activer la nouvelle élection → **Attendu (BDD) :** tous les membres précédemment actifs sont passés `is_active = false` / `end_date = current_date`, et la nouvelle liste devient le conseil actif.
2. Onglet « Membres » → **Attendu :** seule la nouvelle composition s'affiche (les anciens ont disparu de la grille mais restent en historique en base).
**Cas limites :** un membre reconduit (présent dans les deux compositions, même `start_date`) ne crée pas de doublon (upsert). Un membre présent uniquement dans l'ancienne composition est bien désactivé.
**Règle métier :** mandat du conseil syndical (3 ans max, renouvelable — art. 22 décret 1967).

### G. Cas négatifs / robustesse

## TC-CS-020 : Rapport introuvable ou identifiant invalide
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté en démo.
**Étapes :**
1. Ouvrir `/conseil-syndical/rapport/00000000-0000-0000-0000-000000000000` (UUID valide mais inexistant) → **Attendu :** message « Rapport non trouvé. Ce rapport n'existe pas ou vous n'avez pas les droits pour y accéder. »
2. Ouvrir `/conseil-syndical/rapport/abc` (non-UUID) → **Attendu :** même message « Rapport non trouvé » (l'id non-UUID est traité comme introuvable, **pas** une erreur Postgres brute 22P02 à l'écran).
**Cas limites :** un rapport d'une copro à laquelle l'utilisateur n'a pas accès renvoie aussi « Rapport non trouvé » (RLS).
**Règle métier :** RLS sur `rapports_activite_cs`.

## TC-CS-021 : Export PDF du rapport non disponible
**Priorité :** P3
**Type :** UI
**Préconditions / jeu de données :** un rapport ouvert dans l'éditeur.
**Étapes :**
1. Sidebar → cliquer « Exporter en PDF » → **Attendu :** une alerte « Export PDF en cours de développement » s'affiche, aucun fichier n'est généré.
**Cas limites :** fonctionnalité **non implémentée** — ce cas documente le comportement actuel (placeholder), à requalifier quand l'export sera codé.
**Règle métier :** —

---

## Jeu de données requis (rappel)

- **Compte démo** : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`), seul utilisateur, nom affiché « Jean Dupont ».
- **« Résidence Martin »** (copro la plus complète : 6 copropriétaires, 7 lots, clés Charges générales + Bâtiment A + Bâtiment B, 1000 tantièmes) → idéale pour : élection d'un conseil (TC-CS-018/019), affichage membres (TC-CS-003), création/édition de rapports.
- **« Residence Paris Ivry »** (partielle) ou une **copro HARNESS fraîche** (`create_test_copro_seeded()`) → utile pour l'**état vide** (TC-CS-004) et pour tester l'élection à blanc sans polluer une copro de référence.
- **AG à venir** (statut `draft` ou `convoked`) dans la copro testée → indispensable pour la **publication du rapport** (TC-CS-015) et l'apparition de l'annexe de convocation (TC-CS-016).
- **Résolution `ELECT_COUNCIL`** avec variables `council_members[]` (copropriétaires actifs + rôles) → pré-requis du peuplement de l'onglet Membres (TC-CS-017/018/019).
- **Accès BDD cloud** (`qqfqrcolzmcbsvfaumiq`) pour les vérifications grand livre / tables : `rapports_activite_cs`, `sections_rapport_cs`, `annexes_rapport_cs`, `council_members`, vue `v_council_members_detail`.

> Rappel cadence finance/AG : ne pas mener les tests d'élection sur la boucle d'or « Le Clos Saint-Michel » (immutabilité). Préférer une copro HARNESS ou « Résidence Martin ».
