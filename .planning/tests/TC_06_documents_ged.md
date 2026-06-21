# Plan de test — Documents / GED (gestion documentaire)

> Domaine : la **gestion des documents** (classer, importer, télécharger, prévisualiser, archiver, supprimer, lier, droits d'accès, rétention légale).
> Hors périmètre ici : les « documents » qui sont en réalité des **sorties comptables** (grand livre, balance, dépenses, annexes, clôture) — testés dans le domaine Finance.

---

## Périmètre & écrans canoniques

### Écran réellement utilisé (le seul à tester en profondeur)
- **`/documents/ged`** — l'écran GED « vivant ». Toute la logique passe par le hook **`useGedPageSupabase`** (et non `useGedPage`, qui est l'ancienne version mockée).
  C'est une vue en 2 panneaux :
  - **À gauche** : une barre latérale avec 3 onglets — **Dossiers** (arborescence + documents), **Récents** (10 derniers), **Favoris** (étoilés). Plus un mini-filtre « Filtrer dossiers… ».
  - **À droite** : le panneau de détail du document sélectionné (aperçu intégré + actions Ouvrir / Télécharger / Lier / Favori / Droits d'accès).
  - **En haut** : bouton « Nouveau dossier », bouton « Ajouter un document », et une recherche globale.

### Actions canoniques branchées sur Supabase (à tester)
| Action | Mécanisme réel | Effet base |
|--------|----------------|-----------|
| Importer un document | `UploadDocumentModal` → `uploadDocument()` | Fichier dans le bucket `ged` + ligne `documents` |
| Créer / renommer / supprimer un dossier | `createFolder` / `updateFolder` / `deleteFolder` (table `document_folders`) | — |
| Supprimer un document | `deleteDocument()` = **soft-delete** (`status='deleted'`) | Garde `trg_document_soft_delete_guard` (rétention) |
| Prévisualiser | URL signée du bucket `ged` (`getDocumentUrl`) | — |
| Télécharger | `downloadDocument()` (blob) | — |
| Mettre en favori | `toggleStarDocument` → `is_starred` | — |
| Lier à une entité | `LinkModal` → `linkDocumentToEntity` (table `document_relations`) | — |
| Catégorie auto à l'import | `detectCategory()` (motifs sur le nom de fichier) | — |
| Auto-classement depuis d'autres modules | `auto-file-ged.service.ts` (PV, factures, états datés générés ailleurs « tombent » dans la GED) | — |

### Règles métier de rétention (côté base, automatiques)
- À chaque création/modification d'un document, un trigger calcule :
  - `expiration_date` = (date du document, sinon date de création) + `retention_years` (défaut **10 ans**) ;
  - `deletion_blocked` = **vrai** si la catégorie est **légale** (`pv_ag`, `convocation`, `reglement`, `contrat`, `diagnostic`, `etat_date`) **et** que l'échéance n'est pas passée.
- Tant que `deletion_blocked` est vrai et que l'échéance n'est pas passée, **toute suppression est refusée** par la base (la suppression douce de l'écran GED comme une suppression dure). Le motif technique remonte : `cannot delete protected document … (legal retention not expired)`.
- `generate_document_path` (RPC) produit le chemin de stockage canonique `<copro>/<categorie>/<annee>/<fichier>`. NB : le front actuel calcule lui-même un chemin équivalent dans `uploadDocument`, il n'appelle pas la RPC ; le résultat doit rester cohérent (préfixe copro/catégorie/année).

---

## Écrans morts / doublons (NE PAS tester)

- **`/documents` (hub)** : simple page de cartes-liens (GED + 4 sorties comptables). On peut vérifier que la carte « GED » mène à `/documents/ged` (couvert en TC-GED-001), mais il n'y a aucune logique métier à tester ici.
- **`useGedPage.ts`** : ancien hook (version mockée, sans Supabase). Remplacé par `useGedPageSupabase`. **Mort** — ne pas tester.
- **Composants `ged/components/` non importés par la page canonique** : `Header`, `Checklist`, `VersioningAlerts`, `SearchBar`, `AdvancedFilters`, `ModeSwitch`, `DropZone`, `Breadcrumb`, `Toolbar`, `ActiveFilters`, `FolderGrid`, `SearchResults`, `Pagination`, `EmptyState`, `TechnicalDocumentsSection`. La page `/documents/ged` n'importe **que** `LinkModal` et `UploadDocumentModal` (qui lui-même utilise `FolderTreeSelect`). Tous les autres sont des vestiges de l'ancien écran — **ne pas écrire de cas de test dessus**.
- **`/documents/ledger`, `/documents/ledger/full`, `/documents/balance`, `/documents/expenses`, `/documents/annexes`, `/documents/closing`** : ce sont des **sorties comptables** → domaine Finance. Hors périmètre ici.
- **Onglet « Historique » et « Utilisateurs autorisés » du gestionnaire de droits d'accès** : alimentés par un **store en mémoire** (`useDocumentPermissions`), pas par Supabase → ne persistent pas. À ne pas tester comme fonctionnel persistant ; signalés comme limite connue dans TC-GED-016.

---

## Cas de test

## TC-GED-001 : Accès à la GED depuis le hub Documents
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** connecté en démo (Jean Dupont) ; copro « Résidence Martin » sélectionnée depuis /portefeuille.
**Étapes :**
1. Ouvrir `/documents` → **Attendu :** 5 cartes affichées (GED, Grand livre, Balance, Dépenses, Annexes).
2. Cliquer la carte « GED - Gestion documentaire » → **Attendu :** redirection vers `/documents/ged`, titre « Mes documents », barre latérale avec onglets Dossiers / Récents / Favoris.
3. Attendre la fin du chargement → **Attendu :** liste des dossiers et compteur « X documents / Y dossiers » affichés, sans message d'erreur.
**Cas limites :** si aucune copro n'est sélectionnée, la page doit afficher une erreur explicite (« Vérifiez que vous êtes connecté et membre de cette copropriété »), pas un écran blanc.
**Règle métier :** —

## TC-GED-002 : Importer un document (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », GED ouverte.
**Étapes :**
1. Cliquer « Ajouter un document » → **Attendu :** modale d'import avec zone de glisser-déposer.
2. Sélectionner un PDF valide (< 25 Mo), ex. `facture_edf.pdf` → **Attendu :** le fichier apparaît dans la liste, taille affichée en Mo, titre pré-rempli (nom sans extension), catégorie auto = « Facture ».
3. Choisir un dossier cible, laisser confidentialité « Public » → **Attendu :** sélection prise en compte.
4. Cliquer « Ajouter » → **Attendu :** bouton passe en « Ajout en cours… », puis la modale se ferme.
5. Vérifier la barre latérale → **Attendu :** le document apparaît (onglet Récents en tête, et dans le dossier choisi).
**Effet base attendu :** 1 fichier dans le bucket `ged` au chemin `<coproId>/facture/<année>/<timestamp>_facture_edf.pdf` ; 1 ligne `documents` (status `active`, category `facture`, visibility `tous_coproprietaires`). Trigger : `expiration_date` = date + 10 ans, `deletion_blocked` = **faux** (facture n'est PAS une catégorie légale protégée).
**Cas limites :** fichier vide ; nom avec accents/espaces (le chemin doit être « assaini » : caractères spéciaux remplacés par `_`).
**Règle métier :** rétention par défaut 10 ans.

## TC-GED-003 : Import refusé — fichier trop volumineux
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », GED ouverte.
**Étapes :**
1. Ouvrir la modale d'import, ajouter un fichier > 25 Mo → **Attendu :** la ligne s'affiche en rouge avec le message « Fichier trop volumineux (max 25 Mo) ».
2. Observer le bouton « Ajouter » → **Attendu :** désactivé (aucun fichier valide à importer).
3. Ajouter en plus un petit fichier valide → **Attendu :** le bouton affiche « Ajouter » et n'importera **que** le fichier valide (le gros est ignoré).
**Cas limites :** plusieurs fichiers dont certains trop gros → seuls les valides partent ; le compteur du bouton (ex. « Ajouter (2) ») reflète le nombre de fichiers valides.
**Règle métier :** plafond 25 Mo par fichier (limite applicative).

## TC-GED-004 : Catégorisation automatique à l'import (détection sur le nom)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », GED ouverte, catégorie laissée sur « Autre ».
**Étapes :**
1. Importer un fichier nommé `PV_AG_2025.pdf` → **Attendu :** catégorie auto-détectée = « PV d'AG ».
2. Nouvel import `contrat_assurance.pdf` → **Attendu :** catégorie = « Contrat ».
3. Nouvel import `devis_ravalement.pdf` → **Attendu :** catégorie = « Devis ».
4. Nouvel import `photo_hall.jpg` (aucun motif connu) → **Attendu :** catégorie reste « Autre » (sauf si un dossier cible impose une catégorie par défaut).
**Cas limites :** si l'utilisateur a déjà changé manuellement la catégorie (≠ « Autre »), la détection auto ne doit PAS l'écraser. Si un dossier cible a une catégorie par défaut, elle s'applique quand le nom ne matche rien.
**Règle métier :** ordre de priorité = motif du nom de fichier > catégorie par défaut du dossier > « Autre ».

## TC-GED-005 : Import par glisser-déposer
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** « Résidence Martin », GED ouverte.
**Étapes :**
1. Ouvrir la modale d'import → glisser un fichier sur la zone pointillée → **Attendu :** la zone se met en surbrillance pendant le survol, puis le fichier est ajouté à la liste au dépôt.
2. Valider l'import → **Attendu :** même résultat que TC-GED-002.
**Cas limites :** déposer plusieurs fichiers d'un coup → tous ajoutés à la file. Déposer un dossier (non un fichier) → ne doit pas planter.
**Règle métier :** —

## TC-GED-006 : Créer un dossier à la racine
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », GED ouverte.
**Étapes :**
1. Cliquer « Nouveau dossier » → **Attendu :** modale « Nouveau dossier » avec champ vide et focus automatique.
2. Saisir « Diagnostics 2026 » puis « Créer » (ou touche Entrée) → **Attendu :** la modale se ferme, le dossier apparaît dans la barre latérale (avec « 0 document »).
**Effet base attendu :** 1 ligne `document_folders` (parent_id NULL, is_system false, sort_order = max+1).
**Cas limites :** nom vide → bouton « Créer » désactivé ; nom uniquement des espaces → idem (trim). Deux dossiers de même nom : autorisé (pas de contrainte d'unicité côté UI), à confirmer.
**Règle métier :** —

## TC-GED-007 : Créer un sous-dossier
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », au moins un dossier existant.
**Étapes :**
1. Sur un dossier, cliquer le menu « … » → « Sous-dossier » → **Attendu :** modale « Nouveau sous-dossier ».
2. Saisir un nom et créer → **Attendu :** le sous-dossier apparaît imbriqué (déplier le dossier parent pour le voir), avec son propre compteur.
**Effet base attendu :** ligne `document_folders` avec `parent_id` = dossier parent.
**Cas limites :** arborescence sur plusieurs niveaux (N niveaux supportés) — créer un sous-sous-dossier et vérifier l'affichage en cascade.
**Règle métier :** —

## TC-GED-008 : Renommer un dossier
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un dossier existant.
**Étapes :**
1. Menu « … » d'un dossier → « Renommer » → **Attendu :** le nom devient un champ éditable inline (focus auto).
2. Modifier le nom, appuyer sur Entrée → **Attendu :** nouveau nom affiché, persisté.
3. Recommencer mais appuyer sur Échap → **Attendu :** modification annulée, ancien nom conservé.
**Effet base attendu :** `document_folders.name` mis à jour, `updated_at` rafraîchi.
**Cas limites :** valider avec un nom vide → l'ancien nom doit être conservé (pas d'écrasement par une chaîne vide). Perte de focus (blur) avec un nom valide → enregistre.
**Règle métier :** —

## TC-GED-009 : Supprimer un dossier (les documents survivent)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un dossier contenant au moins 1 document non protégé.
**Étapes :**
1. Menu « … » → « Supprimer » → **Attendu :** confirmation indiquant « Les documents qu'il contient ne seront pas supprimés mais déplacés à la racine ».
2. Confirmer → **Attendu :** le dossier disparaît ; ses documents réapparaissent dans la section « Sans dossier ».
**Effet base attendu :** ligne `document_folders` supprimée ; les `documents` concernés voient leur `folder_id` retomber à NULL (selon la FK/règle de la base).
**Cas limites :** supprimer un dossier contenant des sous-dossiers → comportement des sous-dossiers à vérifier (orphelins ou remontés). Annuler la confirmation → rien ne change.
**Règle métier :** la suppression d'un contenant ne doit jamais détruire les pièces (intégrité documentaire).

## TC-GED-010 : Prévisualiser un document dans le panneau de détail
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », au moins 1 PDF et 1 image importés.
**Étapes :**
1. Sélectionner un PDF dans la barre latérale → **Attendu :** panneau de détail affiche nom, badges (catégorie, confidentialité, tags), date/taille/format, et un aperçu **iframe** du PDF (URL signée du bucket).
2. Sélectionner une image → **Attendu :** aperçu image affiché (balise img, URL signée).
3. Sélectionner un fichier non prévisualisable (ex. .docx) → **Attendu :** placeholder « Aperçu non disponible » avec l'icône du type.
**Cas limites :** pendant le chargement de l'URL signée, le placeholder doit indiquer « Chargement… ». URL signée expirée/invalide → pas de crash, placeholder.
**Règle métier :** —

## TC-GED-011 : Ouvrir le document en grand (visionneuse)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un PDF sélectionné.
**Étapes :**
1. Cliquer « Ouvrir » dans les actions du panneau → **Attendu :** la visionneuse plein écran (`DocumentViewerModal`) s'ouvre sur le document.
2. Fermer la visionneuse → **Attendu :** retour à la GED, document toujours sélectionné.
**Cas limites :** ouvrir un document sans fichier associé → la visionneuse doit gérer l'absence de fichier sans planter.
**Règle métier :** l'ouverture est journalisée comme action « VIEW » (log en mémoire — non persistant, cf. limite TC-GED-016).

## TC-GED-012 : Télécharger un document
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un document avec fichier réel.
**Étapes :**
1. Sélectionner le document, cliquer « Télécharger » → **Attendu :** le navigateur télécharge le fichier sous son nom d'origine (`document.nom`).
**Cas limites :** document sans `url` (fichier manquant) → le bouton ne doit rien faire de cassant ; en cas d'échec réseau, alerte « Erreur lors du téléchargement ».
**Règle métier :** —

## TC-GED-013 : Supprimer un document NON protégé (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un document de catégorie **non légale** (ex. `facture`, `photo`, `autre`).
**Étapes :**
1. Survoler le document dans la barre latérale → cliquer l'icône corbeille → **Attendu :** confirmation « Supprimer définitivement … ? Cette action est irréversible ».
2. Confirmer → **Attendu :** le document disparaît de toutes les listes (Dossiers, Récents, Favoris) ; si c'était le document affiché, le panneau de détail se vide.
**Effet base attendu :** `documents.status` passe à `deleted` (suppression **douce** ; les vues de compat l'excluent). Le fichier reste dans le bucket (soft-delete logique uniquement).
**Cas limites :** annuler la confirmation → rien ne change. Supprimer le dernier document d'un dossier → le dossier reste avec « 0 document ».
**Règle métier :** suppression douce, pas de purge physique.

## TC-GED-014 : Suppression REFUSÉE — document à rétention légale active
**Priorité :** P0
**Type :** Fonctionnel + Intégration
**Préconditions / jeu de données :** « Résidence Martin » ; importer un document de catégorie **légale** récente, ex. un PV d'AG (`pv_ag`) daté de cette année (donc `deletion_blocked = vrai`, échéance dans ~10 ans).
**Étapes :**
1. Sélectionner le PV d'AG → corbeille → confirmer la suppression → **Attendu :** la suppression **échoue** ; un message d'erreur remonte (la base lève `cannot delete protected document … (legal retention not expired)`).
2. Rafraîchir la liste → **Attendu :** le document est **toujours présent** (status resté `active`).
**Effet base attendu :** `status` reste `active` ; aucune ligne modifiée. Le trigger `trg_document_soft_delete_guard` (sur UPDATE vers `deleted`) et `trg_prevent_document_deletion` (sur DELETE) bloquent tous deux.
**Cas limites :** vérifier le même blocage pour `convocation`, `reglement`, `contrat`, `diagnostic`, `etat_date`. **Point de vigilance UI** : aujourd'hui l'erreur remonte via `console.error` côté hook — vérifier que l'utilisateur voit bien un message (sinon la suppression « semble » avoir échoué silencieusement = bug à signaler).
**Règle métier :** conservation légale des pièces de copropriété (PV, règlement, contrats, diagnostics, états datés) ; suppression interdite tant que l'échéance n'est pas atteinte.

## TC-GED-015 : Calcul d'échéance et statut de protection à l'import
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence HARNESS » jetable (via `create_test_copro_seeded()`) pour ne pas polluer, ou « Résidence Martin ».
**Étapes :**
1. Importer un document `pv_ag` daté du jour → **Attendu (base)** : `expiration_date` ≈ aujourd'hui + 10 ans ; `deletion_blocked = vrai`.
2. Importer un document `facture` daté du jour → **Attendu (base)** : `expiration_date` ≈ +10 ans ; `deletion_blocked = faux` (catégorie non légale).
3. (Si possible via SQL de test) forcer un `pv_ag` avec une `document_date` très ancienne (échéance dépassée) → **Attendu :** `deletion_blocked = faux` → suppression alors **autorisée**.
**Effet base attendu :** cohérence du trigger `calculate_document_expiration` : base = `document_date` sinon `created_at` ; `deletion_blocked` vrai uniquement si catégorie légale ET échéance future.
**Cas limites :** `retention_years` à NULL → `expiration_date` NULL → un document légal à échéance NULL reste **protégé** (jamais expiré).
**Règle métier :** rétention = base + nombre d'années ; protection = catégorie légale + non expiré.

## TC-GED-016 : Gérer les droits d'accès / niveau de confidentialité
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un document sélectionné, compte démo (rôle gestionnaire → bouton Droits visible).
**Étapes :**
1. Dans les actions du panneau, cliquer l'icône bouclier (Droits d'accès) → **Attendu :** modale « Gestion des droits d'accès » (onglets Niveau d'accès / Utilisateurs autorisés / Historique).
2. Choisir un niveau (Public / Conseil syndical / Syndic uniquement / Confidentiel) → **Attendu :** la carte sélectionnée est mise en valeur ; un avertissement « sera modifié après sauvegarde » s'affiche si changement.
3. Enregistrer → **Attendu :** la modale se ferme.
**Cas limites — LIMITE CONNUE À VÉRIFIER :** la sauvegarde du niveau passe par `useDocumentPermissions.updateDocumentConfidentiality`, qui écrit dans un **store en mémoire**, PAS dans Supabase. Donc après rechargement de la page, le badge de confidentialité du document **n'est pas modifié** (la valeur réelle vient de `documents.visibility`). À documenter comme écart fonctionnel : le panneau « Droits d'accès » n'est pas persistant. Idem onglet « Historique » (logs en mémoire, vides après reload) et « Utilisateurs autorisés » (non persistés).
**Règle métier :** 4 niveaux de visibilité (public / conseil / syndic / confidentiel). Le badge « Confidentiel » + cadenas s'affiche pour tout document non public.

## TC-GED-017 : Bouton Droits masqué pour un rôle non gestionnaire
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** un membership de rôle copropriétaire (non disponible avec le seul compte démo actuel — à tester quand un compte copropriétaire existera).
**Étapes :**
1. Ouvrir la GED en tant que copropriétaire → sélectionner un document → **Attendu :** le bouton « Droits d'accès » (bouclier) n'apparaît pas (`canManageAccess` réservé admin/syndic).
2. Vérifier qu'un document à visibilité « Syndic uniquement » ou « Conseil » n'apparaît pas dans la liste filtrée du copropriétaire.
**Cas limites :** RLS — un copropriétaire ne doit jamais récupérer (côté base) un document hors de sa visibilité ; le filtrage front (`filterAccessibleDocuments`) est une seconde barrière, pas la seule.
**Règle métier :** confidentialité documentaire + RLS par rôle.

## TC-GED-018 : Mettre / retirer un document des favoris
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », un document sélectionné.
**Étapes :**
1. Cliquer l'icône étoile dans les actions → **Attendu :** l'étoile se remplit (jaune) immédiatement (mise à jour optimiste).
2. Aller dans l'onglet « Favoris » → **Attendu :** le document y figure.
3. Re-cliquer l'étoile → **Attendu :** l'étoile redevient vide, le document quitte l'onglet Favoris.
**Effet base attendu :** `documents.is_starred` basculé. En cas d'échec réseau, l'étoile revient à son état précédent (rollback optimiste).
**Cas limites :** double-clic rapide → l'état final doit rester cohérent. Échec base → rollback visuel.
**Règle métier :** —

## TC-GED-019 : Lier un document à une entité métier
**Priorité :** P2
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin », un document nommé de façon évocatrice (ex. `facture_chauffage.pdf`).
**Étapes :**
1. Sélectionner le document → cliquer « Lier » → **Attendu :** modale « Lier ce document » avec une suggestion auto (« Détection automatique » + % de confiance) basée sur le nom/catégorie.
2. Cliquer une cible (ex. « Facture / Fournisseur » ou un module de la grille manuelle) → **Attendu :** alerte « Liaison créée avec succès », modale fermée.
3. Rouvrir « Lier » sur le même document → **Attendu :** la liaison apparaît dans « Liaisons existantes » avec un lien « Voir » vers le module cible.
**Effet base attendu :** 1 ligne `document_relations` (entity_type canonique re-mappé, ex. `facture` → `supplier_invoice` ; `relation_kind` selon le type de lien).
**Cas limites :** entités sans équivalent canonique (`APPEL_FONDS`, `IMPAYE`) → rabattues sur `other` ; le lien « Voir » correspondant peut ne pas pointer sur une route exploitable (à signaler). Lier deux fois la même entité → comportement à vérifier (doublon possible).
**Règle métier :** traçabilité documentaire entre une pièce et son objet métier (AG, contrat, ordre de service, facture, mutation…).

## TC-GED-020 : Recherche globale et onglets Récents / Favoris
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » (riche en documents).
**Étapes :**
1. Saisir ≥ 2 caractères dans la recherche globale → **Attendu :** la liste se restreint aux documents dont le nom (fuzzy) ou la catégorie correspond.
2. Onglet « Récents » → **Attendu :** les 10 derniers documents par date d'ajout, plus récent en tête.
3. Onglet « Favoris » → **Attendu :** uniquement les documents étoilés.
4. Champ « Filtrer dossiers… » (onglet Dossiers) → **Attendu :** filtre la liste des dossiers par nom.
**Cas limites :** recherche sans résultat → état vide propre. Accents/casse ignorés. Les dossiers non vides remontent avant les dossiers vides dans le tri.
**Règle métier :** —

## TC-GED-021 : Auto-classement d'un document généré par un autre module
**Priorité :** P1
**Type :** Intégration
**Préconditions / jeu de données :** « Résidence Martin » ; déclencher depuis un autre module une génération de PDF auto-filée (ex. PV d'AG, convocation, état daté, ordre de service — selon ce qui est câblé sur `auto-file-ged.service.ts`).
**Étapes :**
1. Générer le document dans le module source (ex. PV depuis l'AG) → **Attendu :** aucune action manuelle requise dans la GED.
2. Revenir sur l'onglet `/documents/ged` (ou quitter/revenir sur l'onglet du navigateur) → **Attendu :** un rafraîchissement silencieux se déclenche (au retour de visibilité) et le document apparaît, classé dans le dossier correspondant (ex. « Assemblées Générales »).
**Effet base attendu :** ligne `documents` avec `source_module` ≠ `manual` (ag / finance / maintenance…), classée dans le bon dossier (résolution via `AUTOFILE_FOLDER_MAP`), éventuellement liée à l'entité source.
**Cas limites :** si le dossier cible n'existe pas encore, il doit être résolu/créé (fallbackName). Document généré pour une copro ≠ copro active → ne doit pas apparaître ici (cloisonnement par `copro_id` + RLS).
**Règle métier :** chaque pièce générée (PV, convocation, état daté…) doit atterrir automatiquement dans la GED de la bonne copro.

## TC-GED-022 : Cloisonnement par copropriété (RLS)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** deux copros distinctes (« Résidence Martin » et « Residence Paris Ivry »), chacune avec des documents.
**Étapes :**
1. Ouvrir la GED sur « Résidence Martin », noter les documents/dossiers → **Attendu :** uniquement ceux de Martin.
2. Basculer sur « Residence Paris Ivry » (depuis /portefeuille) puis rouvrir la GED → **Attendu :** uniquement les documents/dossiers d'Ivry ; aucun document de Martin visible.
**Effet base attendu :** toutes les requêtes filtrent par `copro_id` ; RLS ON+FORCE empêche toute fuite inter-copro même si le filtre front était contourné.
**Cas limites :** aucune copro sélectionnée → erreur explicite, liste vide. Import dans la copro A : ne doit jamais créer de ligne rattachée à la copro B.
**Règle métier :** isolation stricte des données entre copropriétés.

---

## Jeu de données requis (rappel)

- **Compte démo** : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`). Affiché « Jean Dupont ». Seul utilisateur ; rôle effectif **gestionnaire** (donc bouton « Droits d'accès » visible).
- **« Résidence Martin »** : copro la plus complète (6 copropriétaires, 7 lots, clés Charges générales / Bâtiment A / Bâtiment B, 1000 tantièmes) → **copro principale pour la GED** (sélectionner depuis `/portefeuille`).
- **« Residence Paris Ivry »** : 2ᵉ copro → utilisée pour le test de cloisonnement (TC-GED-022).
- **`create_test_copro_seeded()`** : clone une copro jetable « HARNESS » → recommandé pour les tests de rétention/échéance qui créent puis tentent de supprimer des pièces légales (TC-GED-015), afin de ne pas accumuler de PV protégés non supprimables dans Résidence Martin.
- **Fichiers de test à préparer** : 1 PDF valide nommé `facture_*.pdf`, 1 PDF `PV_AG_<année>.pdf`, 1 PDF `contrat_*.pdf`, 1 image `.jpg`, 1 `.docx` (non prévisualisable), 1 fichier > 25 Mo (pour le rejet).
- **Limites connues à garder en tête** (non bloquantes mais à signaler dans les rapports) :
  - Le panneau « Droits d'accès » (niveau de confidentialité, utilisateurs autorisés, historique) **n'est pas persisté** (store en mémoire), il ne reflète pas `documents.visibility` après rechargement.
  - Les échecs de suppression d'un document protégé remontent via `console.error` ; vérifier qu'un message utilisateur visible existe bien (sinon = bug d'UX à remonter).
