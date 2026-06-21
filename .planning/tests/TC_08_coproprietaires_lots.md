# Plan de test — Copropriétaires, Lots & Clés de répartition (espace gestionnaire)

> Domaine : annuaire des copropriétaires, gestion des lots, et clés de répartition (tantièmes).
> Environnement : app locale (`npm run dev`) sur Supabase cloud `qqfqrcolzmcbsvfaumiq`, compte démo `lyes.triki@coproflex.fr` (affiché « Jean Dupont »). Sélection d'une copro depuis `/portefeuille`.
> Principe métier central : **l'unité de gestion est LE LOT, jamais le copropriétaire**. Un copropriétaire est juste « la personne qui possède un ou plusieurs lots ».

---

## Périmètre & écrans canoniques

Trois écrans seulement composent ce domaine (confirmés par le menu de gauche `src/lib/config/navigation.ts`, module « Copropriété ») :

1. **Annuaire des copropriétaires** — route `/coproprietaires`
   - Liste des personnes (onglets Copropriétaires / Locataires / Anciens), recherche, KPI (nombre, solde global, impayés).
   - Bouton « Nouveau copropriétaire » + menu d'actions par ligne (Modifier / Archiver).
   - Modale d'ajout/édition (`CoproprietaireEditModal`) : Nom\*, Prénom, Fonction, Téléphone, Email\*.

2. **Lots & Répartition** — route `/coproprietaires/lots`
   - **Grille unique** « Lots × clés de répartition », partagée avec l'étape 3 de l'onboarding.
   - Colonne **Tantièmes** = la **clé générale**, **éditable** : c'est la SOURCE UNIQUE du tantième général (elle écrit dans `repartition_key_lines` de la clé `category='general'`, pas dans une colonne `lots`).
   - Colonnes suivantes = **clés spéciales** (la clé générale est volontairement masquée pour éviter le doublon avec « Tantièmes »).
   - Boutons : Lot (créer), Clé (créer), édition de lot (crayon par ligne → `EditLotModal` qui gère aussi suppression et réaffectation de propriétaire), édition de clé (clic sur l'en-tête de colonne → `EditKeyModal`).
   - KPI : nombre de lots, total tantièmes généraux, nombre de clés spéciales.

3. **Détail d'un lot** — route `/coproprietaires/lots/[id]`
   - Fiche lecture : caractéristiques du lot, répartition par clé, parts d'emprunt, avances. Bouton Retour. (Pas d'édition ici : l'édition se fait dans la grille.)

Couche données (lecture seule pour le testeur, mais à vérifier en base) :
- Personnes : table `coproprietaires`, vue `v_coproprietaires_overview` (expose `solde`, `owner_type`, `lots_count`, `total_tantiemes`).
- Lots : table `lots`, vue `v_lots_with_owners`.
- Propriété : table `lot_owners` (historique avec `start_date`/`end_date`, `is_primary`, `share_percent`).
- Clés : tables `repartition_keys` (avec `category` general/special/alur et `coverage_mode` all_lots/subset) + `repartition_key_lines` (le poids par lot), vues `v_repartition_key_totals` et `v_repartition_key_lines_detailed`.

---

## Écrans morts / doublons (NE PAS tester)

Ces écrans existent dans le code mais ne sont reliés à aucun menu et/ou font doublon avec la grille canonique. **Ne pas écrire de cas de test dessus** ; tout au plus vérifier qu'ils ne sont pas exposés.

| Route | Statut | Raison |
|---|---|---|
| `/coproprietaires/repartition` | Mort (redirection) | Le fichier ne fait que `redirect('/coproprietaires/lots')`. |
| `/finance/cles-repartition` | Doublon mort | Vue « cartes » des clés. Absente du menu Finance et du menu Copropriété. La gestion des clés se fait dans la grille `/coproprietaires/lots`. |
| `/finance/cles-repartition/new` | Doublon mort | Ancien formulaire de création de clé (saisie tantièmes lot par lot). Remplacé par la modale « Clé » + édition de cellules dans la grille. |
| `/finance/cles-repartition/[id]` | Doublon mort | Ancienne fiche d'édition de clé. Remplacée par `EditKeyModal` + cellules de la grille. |
| `/finance/tantiemes` | Doublon mort | Ancienne page de saisie des tantièmes par lot. Seul lien restant = une carte dans `/settings` (page de réglages elle-même hors parcours). Source unique = colonne Tantièmes de la grille. |

> Note QA : ces doublons partagent partiellement la même base de données. Si un testeur y modifie des tantièmes par erreur, l'effet est réel en base. Vérifier surtout qu'aucun lien de navigation principal n'y mène (cas TC-LOT-019).

---

## Cas de test

### Copropriétaires (annuaire)

## TC-LOT-001 : Lister les copropriétaires d'une copro
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro « Résidence Martin » sélectionnée depuis `/portefeuille`. Compte démo.
**Étapes :**
1. Aller sur `/coproprietaires` → **Attendu :** la liste affiche les 6 copropriétaires de Résidence Martin (colonnes Nom complet, Fonction, Solde, Téléphone, Email).
2. Observer la bande de KPI → **Attendu :** « Copropriétaires » = 6 ; « Solde global » = somme des soldes (format euro fr-FR) ; « Avec impayés » = nb de soldes < 0 ; « À jour » = 6 − impayés.
3. Vérifier l'onglet actif → **Attendu :** onglet « Copropriétaires » sélectionné par défaut.
**Cas limites :** Copro sans copropriétaire → message « Aucun copropriétaire trouvé pour cette copropriété » (EmptyState), pas de spinner infini. Si aucune copro sélectionnée → spinner « Chargement de la copropriété… » ou message d'erreur du contexte (jamais un spinner muet).
**Règle métier :** Le solde affiché est par personne = somme des soldes de ses lots (dérivé), conforme à la règle lot-centric.

## TC-LOT-002 : Rechercher un copropriétaire
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin, ≥ 6 copropriétaires.
**Étapes :**
1. Taper un nom partiel dans la barre de recherche → **Attendu :** la liste se filtre en direct sur nom complet, email OU téléphone.
2. Cliquer la croix « × » de la recherche → **Attendu :** le filtre se vide, toute la liste revient.
**Cas limites :** Recherche sans résultat → « Aucun résultat pour votre recherche. ». Recherche insensible à la casse. Accents : vérifier qu'un terme accentué/non accentué se comporte de façon cohérente.

## TC-LOT-003 : Ajouter un nouveau copropriétaire (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin sélectionnée. Compte gestionnaire.
**Étapes :**
1. Cliquer « Nouveau copropriétaire » → **Attendu :** modale « Ajouter un copropriétaire » (champs Nom\*, Prénom, Fonction, Téléphone, Email\*).
2. Saisir Nom = « Durand », Prénom = « Marie », Email = « marie.durand@test.fr », Téléphone = « 0612345678 » → **Attendu :** le téléphone s'auto-formate « 06 12 34 56 78 ».
3. Cliquer « Enregistrer » → **Attendu :** modale fermée, le nouveau copropriétaire apparaît dans la liste ; KPI « Copropriétaires » passe à 7.
4. Vérifier en base → **Attendu :** 1 ligne dans `coproprietaires` (copro_id correct, last_name « Durand ») ; il apparaît dans `v_coproprietaires_overview` avec `owner_type = COPROPRIETAIRE`, `lots_count = 0`, `solde = 0`.
**Cas limites :** Personne créée SANS lot → bien visible dans l'onglet Copropriétaires (la vue inclut les personnes sans lot). RLS : seul un gestionnaire de cette copro peut créer (un compte sans accès doit échouer côté base).
**Règle métier :** Un copropriétaire peut exister sans lot tant qu'on ne lui en a pas assigné ; le lot reste l'unité de gestion.

## TC-LOT-004 : Validation à la création — champs obligatoires
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin. Modale d'ajout ouverte.
**Étapes :**
1. Laisser Nom vide → **Attendu :** bouton « Enregistrer » désactivé.
2. Renseigner Nom mais laisser Email vide → **Attendu :** bouton « Enregistrer » toujours désactivé (Nom\* ET Email\* requis par `disabled={!form.nom || !form.email}`).
3. Renseigner Nom + Email → **Attendu :** bouton actif.
**Cas limites :** **BUG POTENTIEL À CONFIRMER** — l'email n'est pas validé en format (type=email natif seulement). Saisir « pasunemail » et enregistrer → vérifier si la base accepte ou non ; documenter (aucune validation Zod côté modale). Espaces seuls dans Nom (« &nbsp;&nbsp; ») : le bouton s'active car non-vide, mais `last_name` est trimé → vérifier le résultat en base (last_name « » ).

## TC-LOT-005 : Modifier un copropriétaire existant
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin, au moins 1 copropriétaire.
**Étapes :**
1. Sur une ligne, cliquer « ⋮ » puis « Modifier » → **Attendu :** modale « Modifier le copropriétaire » pré-remplie (Nom, Prénom, Fonction, Téléphone, Email).
2. Changer l'email et le téléphone, cliquer « Enregistrer » → **Attendu :** modale fermée, valeurs mises à jour dans la liste.
3. Vérifier en base → **Attendu :** `coproprietaires.email`/`mobile` modifiés, `updated_at` rafraîchi.
**Cas limites :** Le champ « Fonction » est affiché et éditable dans la modale MAIS n'est PAS persisté par `mapToUpdate` (qui ne renvoie que nom/prénom/mobile/email). À CONFIRMER : modifier uniquement la Fonction → la valeur ne doit PAS changer en base (c'est un champ d'affichage dérivé du `council_role`). Documenter comme incohérence UX.

## TC-LOT-006 : Archiver un copropriétaire (soft delete)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin, choisir un copropriétaire qui possède au moins 1 lot.
**Étapes :**
1. Cliquer « ⋮ » → « Archiver » → **Attendu :** confirmation native « Êtes-vous sûr de vouloir archiver… marqué comme ancien copropriétaire. ».
2. Confirmer → **Attendu :** la personne disparaît de l'onglet « Copropriétaires ».
3. Aller sur l'onglet « Anciens » → **Attendu :** la personne y apparaît (`owner_type = ANCIEN`).
4. Vérifier en base → **Attendu :** toutes ses lignes `lot_owners` actives reçoivent une `end_date` = aujourd'hui (aucune ligne `coproprietaires` supprimée).
**Cas limites :** Archiver un copropriétaire SANS lot → **BUG POTENTIEL** : l'archivage agit uniquement sur `lot_owners` ; sans ligne active, rien ne change et la personne reste « Copropriétaire ». À confirmer et documenter. Ses lots redeviennent « sans propriétaire » dans la grille (colonne Propriétaire = « — »).
**Règle métier :** Historique de propriété conservé (table `lot_owners` jamais purgée) — exigence légale de traçabilité des mutations.

## TC-LOT-007 : Onglet Locataires (fonctionnalité non disponible)
**Priorité :** P3
**Type :** UI
**Préconditions / jeu de données :** N'importe quelle copro.
**Étapes :**
1. Cliquer l'onglet « Locataires » → **Attendu :** liste vide + message « La gestion des locataires sera disponible prochainement. ».
**Cas limites :** Vérifier qu'aucune action (créer) ne crée par erreur un « locataire » (le type n'existe pas en base).

---

### Lots (grille Lots & Répartition)

## TC-LOT-008 : Afficher la grille Lots & Répartition
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin (7 lots, clés « Charges générales » + « Bâtiment A » + « Bâtiment B », 1000 tantièmes).
**Étapes :**
1. Aller sur `/coproprietaires/lots` → **Attendu :** grille avec 7 lignes de lots ; colonnes Réf, Type, Propriétaire, **Tantièmes** (éditable), puis 1 colonne par clé spéciale (Bâtiment A, Bâtiment B).
2. Vérifier que la colonne « Tantièmes » correspond à la clé générale et que la clé générale N'apparaît PAS comme colonne séparée → **Attendu :** pas de doublon « Charges générales » en colonne.
3. Vérifier les KPI → **Attendu :** « Lots » = 7 ; « Tantièmes généraux » = 1000 ; « Clés spéciales » = 2 (la générale est exclue du compte des clés spéciales).
4. Vérifier la ligne « Total » → **Attendu :** Total tantièmes = 1000 (somme de la clé générale) ; pour chaque clé spéciale, total + ratio « X/Y lots » et coche ✓ si complète.
**Cas limites :** Copro sans lot → EmptyState « Aucun lot ». « Residence Paris Ivry » (clé générale à 0) → total tantièmes = 0, vérifier l'absence de division par zéro dans les % (affichage « — »).

## TC-LOT-009 : Créer un lot (happy path)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin. Pour ne pas polluer la golden loop finance, préférer une copro jetable créée via `create_test_copro_seeded()` (« HARNESS ») si l'on veut tester sans effet de bord.
**Étapes :**
1. Cliquer « Lot » → **Attendu :** modale « Nouveau lot » (Référence\*, Type, Étage, Tantièmes généraux\*, Propriétaire).
2. Saisir Référence = « A-999 », Type = Appartement, Tantièmes = 50, Propriétaire = un copropriétaire existant → cliquer « Créer le lot ».
3. **Attendu :** modale fermée, nouvelle ligne « A-999 » dans la grille, colonne Tantièmes = 50, Propriétaire = la personne choisie ; KPI « Lots » +1, « Tantièmes généraux » +50.
4. Vérifier en base → **Attendu :** 1 ligne `lots` (réf, type) ; 1 ligne `repartition_key_lines` sur la clé générale avec weight=50 ; pour chaque clé spéciale en mode `all_lots`, une ligne auto-créée (weight = tantièmes si basis=tantiemes, sinon 0) ; 1 ligne `lot_owners` active (`is_primary=true`, `share_percent=100`, `end_date=null`).
**Cas limites :** Référence en doublon → vérifier comportement (contrainte d'unicité éventuelle → message d'erreur, pas de crash silencieux). Tantièmes laissé vide ou « Référence » vide → bouton « Créer le lot » désactivé.
**Règle métier :** Le tantième n'est pas une colonne du lot mais une ligne de la clé générale (source unique).

## TC-LOT-010 : Créer un lot SANS propriétaire
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro jetable HARNESS ou Résidence Martin.
**Étapes :**
1. Ouvrir « Nouveau lot », laisser Propriétaire = « — Aucun — », créer → **Attendu :** lot créé, colonne Propriétaire = « — ».
2. Vérifier en base → **Attendu :** lot existe, aucune ligne `lot_owners` active pour ce lot.
**Cas limites :** Le lot orphelin compte quand même dans le total des tantièmes et dans les clés. Vérifier qu'il apparaît dans la grille et dans le détail.

## TC-LOT-011 : Éditer un lot (référence, type, étage, tantièmes)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec ≥ 1 lot (HARNESS de préférence).
**Étapes :**
1. Cliquer le crayon d'une ligne → **Attendu :** modale « Modifier le lot {réf} » pré-remplie.
2. Changer Tantièmes généraux (ex : de 50 à 80), Étage et Type, cliquer « Enregistrer ».
3. **Attendu :** grille mise à jour (colonne Tantièmes = 80), Total recalculé.
4. Vérifier en base → **Attendu :** `lots.type`/`floor` mis à jour ; la ligne `repartition_key_lines` de la clé générale passe weight=80 (upsert sur conflit key_id,lot_id) ; les clés spéciales basées sur les tantièmes ne sont PAS recalculées automatiquement (à documenter).
**Cas limites :** Référence vidée ou tantièmes vidés → bouton « Enregistrer » désactivé. Tantième = 0 saisi via cette modale → vérifier que la ligne générale passe à 0 (la personne perd tout poids général).
**Règle métier :** La colonne Tantièmes de la grille et le champ « Tantièmes généraux » de la modale écrivent au MÊME endroit (clé générale) — cohérence à vérifier.

## TC-LOT-012 : Éditer le tantième directement dans la cellule de la grille
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec ≥ 1 lot et une clé générale identifiée (HARNESS).
**Étapes :**
1. Dans la colonne « Tantièmes », cliquer la cellule d'un lot, saisir une nouvelle valeur, cliquer ailleurs (blur) → **Attendu :** la valeur est enregistrée, le Total se recalcule.
2. Vérifier en base → **Attendu :** `repartition_key_lines` de la clé générale pour ce lot = nouvelle valeur (upsert).
**Cas limites :** Saisir 0 → **Attendu :** la ligne de poids est SUPPRIMÉE (`deleteRepartitionKeyLine` quand weight===0). Pour la clé générale en `all_lots`, la vue ré-injecte le lot avec poids 0 → le lot reste affiché à 0 (pas disparu). Saisir une valeur non numérique → ignorée (parseInt → NaN, pas d'écriture). Saisir une valeur négative → vérifier si la base accepte (pas de garde côté UI) ; documenter si un tantième négatif passe.
**Règle métier :** Source unique des tantièmes généraux = la clé générale ; toute modification doit s'y refléter.

## TC-LOT-013 : Supprimer un lot
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro jetable HARNESS (NE PAS supprimer un lot de la golden loop). Choisir un lot SANS écritures comptables.
**Étapes :**
1. Ouvrir l'édition du lot → cliquer « Supprimer » → **Attendu :** confirmation native « Supprimer le lot {réf} ? Cette action est irréversible. ».
2. Confirmer → **Attendu :** la ligne disparaît, KPI « Lots » −1, Total tantièmes recalculé.
3. Vérifier en base → **Attendu :** ligne `lots` supprimée (hard delete) ; lignes `repartition_key_lines` du lot supprimées en cascade ; `lot_owners` du lot traités selon la contrainte FK.
**Cas limites :** **POINT À RISQUE** — suppression = hard DELETE. Si le lot est référencé par des écritures financières (appels de fonds, `ledger`, `budget_lines` via dimension lot_id), la contrainte FK doit bloquer la suppression avec un message d'erreur clair, PAS un crash ni une avalanche silencieuse. Tester empiriquement sur un lot AVEC mouvements (copro 22222222 en lecture, ou cloner) pour vérifier le blocage `ON DELETE RESTRICT`.
**Règle métier :** Immutabilité du grand livre : on ne doit pas pouvoir effacer un lot porteur d'écritures.

## TC-LOT-014 : Réaffecter un lot à un autre propriétaire (mutation)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Résidence Martin (6 copropriétaires) ou HARNESS ; un lot ayant déjà un propriétaire.
**Étapes :**
1. Ouvrir l'édition du lot, changer le « Propriétaire » pour une autre personne, « Enregistrer » → **Attendu :** grille mise à jour (nouveau nom en colonne Propriétaire).
2. Vérifier en base → **Attendu :** l'ancienne ligne `lot_owners` reçoit `end_date` = aujourd'hui ; une NOUVELLE ligne `lot_owners` est créée (`start_date` aujourd'hui, `end_date=null`, `is_primary=true`, `share_percent=100`).
3. Recharger la grille → **Attendu :** un seul propriétaire actif affiché.
**Cas limites :** Passer le propriétaire à « — Aucun — » → l'ownership actif est clôturé, aucune nouvelle ligne créée, colonne = « — ». Réaffecter alors qu'on n'a PAS changé la sélection → aucun appel (`ownerId !== currentOwnerId` garde-fou).
**Règle métier :** Historique de propriété par chevauchement de dates (`lot_owners`) ; jamais d'écrasement, traçabilité des mutations.

## TC-LOT-015 : Un copropriétaire avec plusieurs lots
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin (6 copros / 7 lots → au moins une personne a 2 lots).
**Étapes :**
1. Dans la grille, repérer une personne propriétaire de 2 lots (même nom sur 2 lignes).
2. Aller dans l'annuaire `/coproprietaires` → **Attendu :** la personne apparaît UNE seule fois ; son solde = somme des soldes de ses 2 lots.
3. (Optionnel base) Vérifier `v_coproprietaires_overview.lots_count = 2` et `total_tantiemes` = somme des tantièmes de ses 2 lots.
**Cas limites :** Réaffecter UN des deux lots à quelqu'un d'autre → la personne reste copropriétaire (toujours 1 lot), solde recalculé.
**Règle métier :** Le solde par personne se dérive en sommant ses lots (lot-centric).

## TC-LOT-016 : Page détail d'un lot
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec lots (Résidence Martin).
**Étapes :**
1. Naviguer vers `/coproprietaires/lots/[id]` d'un lot existant (ou via lien si disponible) → **Attendu :** en-tête « Lot {réf} » + badges (type, étage, tantièmes), barre latérale (caractéristiques, parts d'emprunt, avances), répartition par clé.
2. Cliquer « Retour » → **Attendu :** retour à `/coproprietaires/lots`.
**Cas limites :** Lot inexistant → « Lot introuvable » (ErrorState), pas de crash. Lot sans clé spéciale → section répartition cohérente (juste la générale).

---

### Clés de répartition (tantièmes spéciaux)

## TC-LOT-017 : Créer une clé spéciale « certains lots » (subset)
**Priorité :** P0
**Type :** Fonctionnel
**Préconditions / jeu de données :** Résidence Martin (clés Bâtiment A/B existent) ou HARNESS.
**Étapes :**
1. Cliquer « Clé » → **Attendu :** modale « Nouvelle clé de répartition » (Nom\*, Portée [Certains lots / Tous les lots], Base de calcul [Tantièmes / Personnalisé], Description). Portée par défaut = « Certains lots » (subset).
2. Saisir Nom = « Ascenseur Bât A », Portée = « Certains lots », créer → **Attendu :** nouvelle colonne dans la grille, en-tête « Ascenseur Bât A », statut « 0/0 lots » au départ (aucune ligne).
3. Vérifier en base → **Attendu :** 1 ligne `repartition_keys` avec `category='special'`, `coverage_mode='subset'`, `is_active=true` ; AUCUNE ligne `repartition_key_lines` créée automatiquement.
4. Renseigner un poids pour 2 lots dans la nouvelle colonne (blur) → **Attendu :** statut « 2/2 lots » et coche ✓ (une clé subset n'inclut QUE les lots à qui on a donné un poids).
**Cas limites :** Nom vide → bouton « Créer la clé » désactivé. La clé spéciale n'est jamais comptée dans la colonne « Tantièmes » ni dans le KPI tantièmes généraux.
**Règle métier :** Clé « certains lots » = répartition partielle (ex. ascenseur ne concerne pas le RDC). Décret 67-223 / loi 65-557 : charges spéciales réparties selon l'utilité.

## TC-LOT-018 : Créer une clé « tous les lots » (all_lots) basée sur les tantièmes
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** HARNESS ou Résidence Martin.
**Étapes :**
1. Cliquer « Clé », Nom = « Chauffage », Portée = « Tous les lots », Base = « Tantièmes », créer.
2. **Attendu :** nouvelle colonne ; chaque lot reçoit un poids (lignes auto-créées pour les lots existants — cf. logique `createLot` côté création de lot, et initialisation côté clé). Vérifier le statut « X/X lots » (X = nombre total de lots).
3. Vérifier en base → **Attendu :** `coverage_mode='all_lots'`, lignes `repartition_key_lines` pour les lots concernés.
**Cas limites :** Base « Personnalisé » → poids initiaux à 0, statut incomplet tant qu'on ne saisit rien. Différence visible avec « subset » : en all_lots, un lot à 0 reste compté dans le dénominateur (« 6/7 ») ; en subset, seuls les lots à poids > 0 comptent (« 6/6 »).
**Règle métier :** Charges générales = tantièmes (art. 10 loi 65-557) ; une clé « tous les lots » modélise une charge commune.

## TC-LOT-019 : Modifier une clé existante (nom, portée, base)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec ≥ 1 clé spéciale (HARNESS de préférence).
**Étapes :**
1. Cliquer l'en-tête de la colonne d'une clé spéciale → **Attendu :** modale « Modifier la clé » pré-remplie + encart « Lots couverts : X/Y » et « Total poids ».
2. Renommer la clé, « Enregistrer » → **Attendu :** en-tête de colonne mis à jour.
3. Changer la portée de « Tous les lots » → « Certains lots », « Enregistrer ».
4. Vérifier en base → **Attendu :** `coverage_mode='subset'` ET toutes les lignes `repartition_key_lines` à `weight=0` de cette clé sont SUPPRIMÉES (purge), pour que le compteur passe de « 3/7 » à « 3/3 ».
**Cas limites :** Nom vidé → bouton désactivé. Passer subset → all_lots ne ré-injecte PAS automatiquement les lots manquants (vérifier le comportement : ils peuvent rester absents jusqu'à saisie d'un poids).
**Règle métier :** La portée détermine le dénominateur de complétude (X/Y).

## TC-LOT-020 : Supprimer une clé spéciale (soft delete)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec une clé spéciale supprimable (HARNESS).
**Étapes :**
1. Ouvrir « Modifier la clé » → cliquer « Supprimer » → **Attendu :** confirmation « Supprimer la clé "{nom}" ? Cette action est irréversible. ».
2. Confirmer → **Attendu :** la colonne disparaît de la grille, KPI « Clés spéciales » −1.
3. Vérifier en base → **Attendu :** la ligne `repartition_keys` passe `is_active=false` (SOFT delete, pas de hard delete car des `budget_lines` peuvent la référencer) ; les lignes `repartition_key_lines` restent mais la clé n'apparaît plus.
**Cas limites :** Tenter de supprimer/masquer la CLÉ GÉNÉRALE → elle n'est pas affichée comme colonne éditable de clé (pas d'en-tête cliquable) ; vérifier qu'on ne peut pas la désactiver depuis cet écran (sinon les tantièmes généraux disparaîtraient). Supprimer une clé référencée par un budget → vérifier que la lecture du budget historique ne casse pas (soft delete justement prévu pour ça).
**Règle métier :** Une clé liée à des charges votées ne doit jamais être effacée physiquement (intégrité comptable).

## TC-LOT-021 : Complétude / validité des clés (avertissements)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec une clé all_lots où au moins 1 lot a un poids 0 (HARNESS).
**Étapes :**
1. Observer l'en-tête de la clé incomplète dans la grille → **Attendu :** statut « X/Y lots » en couleur d'alerte (pas de coche ✓) tant que X < Y.
2. Compléter tous les poids → **Attendu :** statut passe à « Y/Y ✓ », couleur succès.
3. Dans `EditKeyModal`, vérifier l'encart → **Attendu :** « ⚠ N lot(s) sans poids » disparaît quand la clé est complète.
**Cas limites :** Clé en tantièmes dont le total ≠ total copro → la validation (`validateRepartitionKey`) signale « Le total (X) ne correspond pas au total de la copropriété (Y) ». Clé à total 0 → « Aucun poids défini pour cette clé ».
**Règle métier :** Une clé de charges doit couvrir 100 % des lots concernés ; un trou fausse la répartition des appels de fonds.

## TC-LOT-022 : Non-régression — pas d'accès aux écrans doublons via la navigation
**Priorité :** P2
**Type :** Régression
**Préconditions / jeu de données :** N'importe quelle copro.
**Étapes :**
1. Parcourir le menu de gauche (module « Copropriété ») → **Attendu :** seuls « Copropriétaires » (`/coproprietaires`) et « Lots & Répartition » (`/coproprietaires/lots`) sont proposés.
2. Vérifier le module « Finance » → **Attendu :** AUCUN lien vers `/finance/cles-repartition` ni `/finance/tantiemes`.
3. Ouvrir `/coproprietaires/repartition` directement → **Attendu :** redirection immédiate vers `/coproprietaires/lots`.
**Cas limites :** Accès direct par URL aux pages doublons (`/finance/cles-repartition`, `/finance/tantiemes`) → elles peuvent encore s'afficher et écrire en base ; le signaler comme dette (risque de double saisie incohérente). Vérifier au moins qu'elles ne crashent pas et lisent la même copro.

## TC-LOT-023 : Isolation par copropriété (RLS / changement de copro)
**Priorité :** P0
**Type :** Intégration
**Préconditions / jeu de données :** Deux copros distinctes (« Résidence Martin » et « Residence Paris Ivry »).
**Étapes :**
1. Sélectionner Résidence Martin, noter les copropriétaires et lots.
2. Revenir à `/portefeuille`, sélectionner Residence Paris Ivry → aller sur `/coproprietaires` puis `/coproprietaires/lots`.
3. **Attendu :** seules les données de Paris Ivry s'affichent (6 copros, 6 lots), AUCUNE fuite de Résidence Martin.
**Cas limites :** RLS ON+FORCE en base : un copropriétaire/lot d'une autre copro ne doit jamais être lisible ni modifiable. Toute requête filtre sur `copro_id` ET les politiques RLS. Vérifier qu'un changement de copro vide bien les états (pas de cache d'une copro affiché sous une autre).
**Règle métier :** Étanchéité multi-cabinet / multi-copro (RGPD + cloisonnement comptable).

---

## Jeu de données requis (rappel)

- **Résidence Martin** : copro la plus complète — 6 copropriétaires, 7 lots, clés « Charges générales » (générale) + « Bâtiment A » + « Bâtiment B », 1000 tantièmes. Cas de test « lecture/affichage », plusieurs lots par personne, clés spéciales.
- **Residence Paris Ivry** : copro partielle — 6 copropriétaires, 6 lots, clé générale à 0. Cas limites « total = 0 », isolation multi-copro.
- **`create_test_copro_seeded()`** : RPC qui clone une copro jetable « HARNESS ». **À privilégier pour TOUS les cas en écriture** (création/édition/suppression de lots, clés, mutations) afin de ne pas polluer les copros de référence ni la golden loop finance.
- **« Le Clos Saint-Michel » (id 22222222…)** : copro finance de référence — **NE PAS y supprimer de lot/clé** ; utilisable en lecture pour vérifier le blocage de suppression d'un lot porteur d'écritures (TC-LOT-013).
- Compte unique : `lyes.triki@coproflex.fr` / `password123` (« Connexion démo » 1-clic sur `/auth/login`), affiché « Jean Dupont », rôle gestionnaire.

> Rappel sécurité QA : les écrans doublons morts (`/finance/cles-repartition`, `/finance/tantiemes`) écrivent dans les MÊMES tables. Ne les utiliser pour aucun test ; toute modification y est réelle.
