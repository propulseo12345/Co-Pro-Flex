# Plan de test — Conformité (DPE, PPT, Factur-X)

> **AVERTISSEMENT MAJEUR — Ce domaine est une MAQUETTE.**
> Après lecture du code (lecture seule), les trois écrans de conformité (DPE collectif,
> Plan Pluriannuel de Travaux, Factur-X) **ne sont reliés à AUCUNE base de données**.
> Ils affichent et manipulent des données « en dur » écrites dans le code
> (`mock-data.ts`), conservées uniquement dans la mémoire de la page (état React).
>
> Conséquences concrètes pour le testeur :
> - **Rien n'est enregistré dans Supabase.** Aucune écriture, aucune ligne créée, aucun grand livre impacté. Il n'y a donc **pas de « résultat base de données » à vérifier** dans ce domaine (contrairement aux domaines finance).
> - **Tout est perdu au rechargement de la page (F5).** Une modification, un ajout ou une suppression disparaît dès qu'on actualise ou qu'on quitte l'écran.
> - **Les données affichées ne sont PAS celles du cloud.** On voit toujours les copropriétés fictives codées en dur (« Résidence Les Pins », « Immeuble Voltaire », « Les Jardins du Lac », « Résidence Berlioz »), **jamais** « Résidence Martin » ni les vraies copros du compte démo.
> - **Les boutons « Télécharger PDF », « Télécharger PDF/A-3 » et « Générer Factur-X »** sont **simulés** : ils affichent un message ou une animation, mais ne produisent aucun fichier réel (le code dit explicitement « disponible après intégration backend » et « téléchargement simulé »).
>
> Les cas de test ci-dessous valident donc essentiellement **l'affichage, la navigation,
> la validation des formulaires et le comportement visuel de la maquette**, pas une logique
> métier persistée. Les obligations légales sont listées car la maquette les anticipe, mais
> **leur respect réel n'est PAS testable** tant que le backend n'existe pas.

---

## Périmètre & écrans canoniques

Accès : barre latérale gauche, entrée **« PPT »** (groupe Conformité), qui déploie 3 sous-entrées :
**PPT**, **DPE Collectif**, **Factur-X** (source : `src/lib/config/navigation.ts`).
Le domaine est aussi atteignable par la recherche globale (`src/lib/config/search.ts`).

Écrans réellement câblés et à tester :

| Écran | Route | Rôle |
|---|---|---|
| DPE — liste portefeuille | `/conformite/dpe` (sans copro sélectionnée) | Tableau de toutes les copros fictives avec classe énergie, dates, statut |
| DPE — fiche détail (vue copro) | `/conformite/dpe` (copro sélectionnée) **ou** `/conformite/dpe/[coproprieteId]` | Détail d'une copro : échelle énergie, infos, historique + boutons Modifier / Planifier renouvellement |
| DPE — modale Modifier | (depuis la fiche détail) | Édition des champs DPE avec validation |
| DPE — modale Planifier renouvellement | (depuis la fiche détail) | Ajoute une entrée à l'historique |
| PPT — grille portefeuille | `/conformite/ppt` (sans copro) | Cartes des copros avec filtres (Toutes / À jour / En retard / À compléter) |
| PPT — détail copro (Kanban) | `/conformite/ppt` (copro sélectionnée) **ou** `/conformite/ppt/[coproprieteId]` | Kanban des travaux par statut + filtre par année |
| PPT — modale Ajouter/Modifier un travail | (depuis le détail copro) | Création / édition / suppression d'un travail prévisionnel |
| PPT — carte détail d'un travail | (clic sur une carte du Kanban) | Détail + étapes (devis → réception) |
| Factur-X — tableau | `/conformite/facturx` | Factures fictives + filtres + boutons Générer / Télécharger (simulés) |

**Nuance importante sur le détail copro (DPE et PPT) :** quand on sélectionne une **vraie**
copropriété du cloud (depuis `/portefeuille`), son identifiant ne correspond à aucun
identifiant mock. Le code applique alors un **repli silencieux** (`?? dpeData[0]` /
`?? coproData[0]`) : il affiche **toujours la première copropriété fictive** (« Résidence Les Pins »),
quelle que soit la copro réellement sélectionnée. C'est un comportement de maquette à documenter
(voir TC-CONF-004 et TC-CONF-012).

---

## Écrans morts / doublons (NE PAS tester)

- **`/maintenance/ppt`** — n'est PAS un écran : c'est une simple redirection vers
  `/conformite/ppt` (`src/app/(dashboard)/maintenance/ppt/page.tsx` fait `redirect('/conformite/ppt')`).
  C'est un alias volontaire, donc on ne le teste pas comme écran propre (un seul cas de
  non-régression de redirection suffit, intégré à TC-CONF-018).
- **`conformite/layout.tsx`** — coquille vide (`return <>{children}</>`), rien à tester.
- **Boutons « Télécharger PDF » (fiche DPE), « PDF/A-3 » et « Générer Factur-X »** — ne sont
  pas des écrans morts mais des **actions simulées** : à tester uniquement pour leur retour
  visuel (toast / animation), pas pour un fichier produit. Couverts en TC-CONF-007 et TC-CONF-017.

Aucun écran « doublon mort » au sens strict dans ce domaine : la structure est mince et
chaque composant est utilisé. Le vrai « piège » du domaine n'est pas un doublon, c'est
l'absence totale de backend (voir avertissement en tête).

---

## Cas de test

### DPE — Diagnostic de Performance Énergétique collectif

#### TC-CONF-001 : Liste DPE du portefeuille s'affiche
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté en démo (Jean Dupont), **aucune copro sélectionnée** (revenir à l'accueil ou ne pas avoir cliqué de copro). Données = mock.
**Étapes :**
1. Ouvrir la barre latérale, déployer le groupe Conformité, cliquer **DPE Collectif** → **Attendu :** la page `/conformite/dpe` s'ouvre, titre « DPE Collectif », sous-titre mentionnant « obligation légale depuis le 01/01/2026 ».
2. Observer le tableau → **Attendu :** 4 lignes fictives (Résidence Les Pins, Immeuble Voltaire, Les Jardins du Lac, Résidence Berlioz), colonnes Copropriété / Lots / Classe DPE / Date diagnostic / Expiration / Statut / Actions.
3. Vérifier les badges de classe (A→G colorés) et de statut → **Attendu :** Les Pins = Valide (vert), Voltaire = Expire bientôt (orange), Jardins du Lac = Valide, Berlioz = Expiré (rouge).
**Cas limites :** aucune donnée réelle attendue ; le tableau est identique quel que soit le compte (toujours les 4 mocks).
**Règle métier :** DPE collectif obligatoire pour les copropriétés à chauffage collectif / immeubles d'habitation, échéancier loi Climat & Résilience (art. 158, L.126-31 CCH) ; obligation généralisée au 01/01/2026 pour les copros de 50 lots ou moins. **Non vérifiable en base ici (maquette).**

#### TC-CONF-002 : Code couleur des statuts DPE cohérent avec les dates
**Priorité :** P2
**Type :** UI
**Préconditions / jeu de données :** Liste DPE affichée (mock).
**Étapes :**
1. Comparer la date d'expiration et le badge de statut de chaque ligne → **Attendu :** expiration passée = « Expiré » (rouge) ; expiration dans moins de 6 mois = « Expire bientôt » (orange) ; sinon « Valide » (vert).
**Cas limites :** le statut affiché vient du mock figé, pas d'un recalcul à la date du jour dans la liste (le recalcul n'a lieu qu'à l'édition). Vérifier que le mock « Résidence Berlioz » (expiré 2025) reste rouge même si on est en 2026.
**Règle métier :** un DPE est valable 10 ans ; au-delà, renouvellement obligatoire.

#### TC-CONF-003 : Ouvrir la fiche détail d'une copro depuis la liste
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Liste DPE affichée (mock).
**Étapes :**
1. Sur la ligne « Immeuble Voltaire », cliquer **Voir la fiche** → **Attendu :** navigation vers `/conformite/dpe/copro-2`, fiche détail affichée.
2. Observer la fiche → **Attendu :** échelle énergétique avec la classe active mise en évidence (F), bloc « Informations DPE » (date diagnostic, expiration, diagnostiqueur EcoThermie SAS, N° ADEME, conso 375 kWh/m²/an, GES 84), bandeau d'alerte orange « Le DPE expire dans moins de 6 mois », bloc « Travaux recommandés » (vide), bloc « Historique des DPE ».
3. Cliquer **Retour à la liste** → **Attendu :** retour sur `/conformite/dpe`.
**Cas limites :** route `/conformite/dpe/copro-2` accédée directement (rafraîchir l'URL) → la fiche se réaffiche (mock retrouvé par ID). Route avec ID inexistant → repli sur la 1ère copro (voir TC-CONF-004).
**Règle métier :** la fiche doit présenter classe énergie + GES, conso, émissions, diagnostiqueur, N° ADEME (identifiant officiel du DPE).

#### TC-CONF-004 : Sélectionner une VRAIE copro affiche la mauvaise fiche (piège maquette)
**Priorité :** P0
**Type :** Régression
**Préconditions / jeu de données :** Aller sur `/portefeuille`, cliquer une vraie copro (ex. **Résidence Martin**). Puis ouvrir **DPE Collectif**.
**Étapes :**
1. Avec « Résidence Martin » sélectionnée comme copro courante, ouvrir `/conformite/dpe` → **Attendu (comportement réel actuel) :** la page passe en vue détail (car une copro est sélectionnée), mais comme l'ID de Résidence Martin ne correspond à aucun mock, le code retombe sur le **premier mock** : on voit la fiche de **« Résidence Les Pins »**, PAS celle de Résidence Martin.
2. Vérifier le sous-titre de la barre → **Attendu :** il affiche « Résidence Les Pins · 32 lots · Classe D… », ce qui est **incohérent** avec la copro réellement sélectionnée.
**Cas limites :** c'est le défaut central de la maquette : aucune liaison entre les vraies copros et les données DPE. À traiter comme **bug bloquant** pour une mise en production, mais **comportement attendu connu** tant que le backend n'existe pas.
**Règle métier :** sans objet (défaut technique, pas métier).

#### TC-CONF-005 : Modifier une fiche DPE — happy path
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Fiche détail DPE ouverte en vue copro (depuis `/conformite/dpe` avec copro sélectionnée, OU naviguer de façon à avoir les boutons d'action — la modale Modifier n'apparaît que sur la vue copro de `/conformite/dpe`, pas sur la route `/[coproprieteId]`).
**Étapes :**
1. Cliquer **Modifier** → **Attendu :** modale « Modifier la fiche DPE » pré-remplie avec les valeurs actuelles.
2. Changer la classe énergétique (ex. D → C), la conso (ex. 215 → 140), cliquer **Enregistrer** → **Attendu :** modale fermée, toast vert « Fiche DPE mise à jour », l'échelle énergétique et les infos affichent les nouvelles valeurs, le statut est recalculé selon la nouvelle date d'expiration.
**Cas limites :** **les modifications ne sont PAS persistées** : F5 (rafraîchir) ramène les valeurs mock d'origine. À documenter explicitement.
**Règle métier :** N° ADEME et dates doivent rester cohérents ; mise à jour théorique de la fiche DPE collective.

#### TC-CONF-006 : Validation du formulaire d'édition DPE
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Modale « Modifier la fiche DPE » ouverte.
**Étapes :**
1. Vider le champ « Date diagnostic », cliquer **Enregistrer** → **Attendu :** message « Requis » sous le champ, modale reste ouverte, rien n'est sauvegardé.
2. Mettre une date d'expiration **antérieure ou égale** à la date de diagnostic, **Enregistrer** → **Attendu :** message « Doit être postérieure à la date de diagnostic ».
3. Vider « Diagnostiqueur » → **Attendu :** « Requis ». Vider « N° ADEME » → **Attendu :** « Requis ».
4. Mettre conso énergie = 0 (ou négatif) → **Attendu :** « Doit être > 0 ». Idem émissions GES.
5. Corriger tous les champs, **Enregistrer** → **Attendu :** la modale se ferme, toast succès.
**Cas limites :** champs nombre avec valeur vide convertie en 0 (échoue la validation > 0) ; N° ADEME limité à 20 caractères (maxLength).
**Règle métier :** un DPE doit avoir un diagnostiqueur certifié et un N° ADEME ; date d'expiration = diagnostic + 10 ans.

#### TC-CONF-007 : Bouton « Télécharger PDF » de la fiche DPE (simulé)
**Priorité :** P3
**Type :** UI
**Préconditions / jeu de données :** Fiche détail DPE ouverte.
**Étapes :**
1. Cliquer **Télécharger PDF** → **Attendu :** aucun fichier n'est téléchargé (le bouton n'a pas de handler câblé). À confirmer visuellement.
**Cas limites :** ce bouton est purement décoratif dans la maquette. Le signaler comme « non fonctionnel ».
**Règle métier :** sans objet.

#### TC-CONF-008 : Planifier le renouvellement DPE — happy path
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Fiche détail DPE en vue copro (boutons d'action visibles).
**Étapes :**
1. Cliquer **Planifier renouvellement** → **Attendu :** modale « Planifier le renouvellement DPE », champ diagnostiqueur pré-rempli avec le diagnostiqueur actuel.
2. Saisir une date prévue, éventuellement modifier le diagnostiqueur et ajouter des notes, cliquer **Planifier** → **Attendu :** modale fermée, toast vert « Renouvellement DPE planifié pour le JJ/MM/AAAA » (date formatée FR), une nouvelle entrée apparaît dans l'historique.
**Cas limites :** notes vides = l'entrée d'historique n'a pas de champ notes (filtré si vide) ; non persisté (F5 efface).
**Règle métier :** anticiper le renouvellement avant expiration (DPE valable 10 ans).

#### TC-CONF-009 : Validation « date prévue requise » au renouvellement
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Modale « Planifier le renouvellement DPE » ouverte.
**Étapes :**
1. Laisser la date prévue vide, cliquer **Planifier** → **Attendu :** message « La date prévue est requise », modale reste ouverte.
2. Renseigner la date → **Attendu :** le message disparaît, action acceptée.
**Cas limites :** seul le champ date est obligatoire ; diagnostiqueur et notes optionnels.
**Règle métier :** sans objet (validation de saisie).

#### TC-CONF-010 : Fermeture des modales DPE (croix, Annuler, clic hors-modale)
**Priorité :** P3
**Type :** UI
**Préconditions / jeu de données :** Modale Modifier ou Planifier ouverte.
**Étapes :**
1. Cliquer la croix (X) → **Attendu :** modale fermée, aucune modification appliquée.
2. Rouvrir, cliquer **Annuler** → **Attendu :** fermée sans effet.
3. Rouvrir, cliquer en dehors de la modale (sur le fond grisé) → **Attendu :** fermée sans effet.
**Cas limites :** clic à l'intérieur de la modale ne doit PAS la fermer (propagation stoppée).
**Règle métier :** sans objet.

### PPT — Plan Pluriannuel de Travaux

#### TC-CONF-011 : Grille PPT du portefeuille + filtres
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Aucune copro sélectionnée. Ouvrir **PPT** depuis la barre latérale.
**Étapes :**
1. Page `/conformite/ppt` → **Attendu :** titre « Plan Pluriannuel de Travaux », grille de cartes des copros fictives, barre de filtres (Toutes / À jour / En retard / À compléter).
2. Cliquer **En retard** → **Attendu :** seules les copros ayant un travail « En cours » dont la date prévisionnelle est dépassée restent affichées.
3. Cliquer **À compléter** → **Attendu :** seules les copros sans aucun travail.
4. Revenir à **Toutes** → **Attendu :** toutes les copros réapparaissent.
**Cas limites :** un filtre peut renvoyer 0 carte (vérifier l'état vide propre).
**Règle métier :** PPT obligatoire (loi Climat & Résilience, art. L.731-2 CCH) pour les immeubles de plus de 15 ans, à projeter sur **10 ans** ; échéancier d'entrée en vigueur selon la taille de la copro. **Non vérifiable en base (maquette).**

#### TC-CONF-012 : Ouvrir le détail PPT d'une copro (Kanban)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Grille PPT affichée (mock).
**Étapes :**
1. Cliquer sur une carte de copro (ex. Résidence Les Pins) → **Attendu :** navigation vers `/conformite/ppt/copro-1`, vue Kanban avec colonnes par statut (À l'étude / Prévu / Voté en AG / En cours / Terminé), travaux répartis dans les colonnes.
2. Observer le sélecteur d'année (2026→2035) → **Attendu :** sélectionner une année filtre les travaux affichés selon leur date prévisionnelle.
3. Cliquer une carte de travail → **Attendu :** panneau de détail du travail (titre, type, montant, étapes devis→réception).
**Cas limites :** même piège que DPE — sélectionner une **vraie** copro affiche le 1er mock (repli `?? coproData[0]`). À documenter.
**Règle métier :** le PPT s'échelonne sur 10 ans (sélecteur 2026-2035 cohérent).

#### TC-CONF-013 : Ajouter un travail au PPT — happy path
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Détail PPT d'une copro en vue copro (`/conformite/ppt` avec copro sélectionnée — le bouton « + Ajouter un travail » n'apparaît que là, pas sur la route `/[coproprieteId]`).
**Étapes :**
1. Cliquer **+ Ajouter un travail** → **Attendu :** modale « Ajouter un travail » avec formulaire (titre, type, statut, date prévisionnelle, montant estimé, priorité, description).
2. Renseigner titre « Réfection escalier », type Sécurité, date 2029-05-01, montant 15000, priorité Haute, **Ajouter** → **Attendu :** modale fermée, toast vert « Travail "Réfection escalier" ajouté au PPT », nouvelle carte dans la colonne du statut choisi (À l'étude par défaut), le compteur « X travaux planifiés » du sous-titre augmente.
3. Vérifier que le travail créé contient les 5 étapes par défaut (Devis, Vote en AG, Commande, Intervention, Réception) à « À venir ».
**Cas limites :** non persisté (F5 efface) ; le travail est ajouté à la copro courante.
**Règle métier :** un travail du PPT suit un cycle devis → vote AG → commande → intervention → réception.

#### TC-CONF-014 : Validation du formulaire « travail PPT »
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Modale Ajouter/Modifier un travail ouverte.
**Étapes :**
1. Laisser le titre vide, **Ajouter** → **Attendu :** « Le titre est requis ».
2. Laisser la date prévisionnelle vide → **Attendu :** « La date est requise ».
3. Mettre montant vide, 0 ou négatif → **Attendu :** « Montant invalide (doit être > 0) ».
4. Corriger, **Ajouter** → **Attendu :** acceptation, modale fermée, toast.
**Cas limites :** titre limité à 120 caractères (maxLength) ; montant non numérique (lettres) rejeté.
**Règle métier :** un travail prévisionnel doit avoir un montant estimé chiffré.

#### TC-CONF-015 : Modifier un travail existant
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Détail PPT copro avec au moins un travail.
**Étapes :**
1. Cliquer une carte de travail → panneau détail → cliquer **Modifier** → **Attendu :** modale « Modifier le travail » pré-remplie.
2. Changer le statut (ex. À l'étude → Voté en AG), **Enregistrer** → **Attendu :** toast « Travail "…" mis à jour », la carte se déplace dans la colonne correspondante du Kanban.
**Cas limites :** non persisté ; sur la route `/conformite/ppt/[coproprieteId]` (vue détail directe), l'édition/suppression depuis la carte sont **désactivées** (handlers vides) — seul l'affichage est possible.
**Règle métier :** un travail voté en AG bascule de « Prévu » à « Voté » (lien théorique avec l'AG).

#### TC-CONF-016 : Supprimer un travail (avec confirmation)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Modale « Modifier le travail » ouverte (mode édition).
**Étapes :**
1. Cliquer **Supprimer** → **Attendu :** le bouton se transforme en « Confirmer la suppression » (double-clic de sécurité).
2. Cliquer **Confirmer la suppression** → **Attendu :** modale fermée, toast « Travail "…" supprimé », la carte disparaît du Kanban, le compteur diminue.
**Cas limites :** cliquer **Annuler** après le 1er clic Supprimer → annule sans supprimer ; suppression aussi possible depuis le panneau détail (bouton Supprimer direct). Non persisté.
**Règle métier :** sans objet.

### Factur-X — Facture électronique

#### TC-CONF-017 : Tableau Factur-X — affichage, filtres et génération simulée
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Ouvrir **Factur-X** depuis la barre latérale (avec ou sans copro sélectionnée).
**Étapes :**
1. Page `/conformite/facturx` → **Attendu :** titre « Factur-X », sous-titre mentionnant « e-facturation obligatoire dès septembre 2026 », tableau des factures fictives (N°, Copropriété, Fournisseur, Montant TTC, Date, Paiement, Factur-X, Actions).
2. Cliquer le filtre **En attente** → **Attendu :** seules les factures au statut Factur-X « En attente » restent ; **Générées** → statut « Généré » ; **Non applicable** → factures profil minimum.
3. Sur une facture « En attente », cliquer **Générer Factur-X** → **Attendu :** bouton passe en « Génération… » avec spinner (~1,5 s simulé), puis le statut devient « Factur-X ✓ » avec la date du jour, un toast vert « Factur-X généré pour la facture … » s'affiche, et le bouton devient **PDF/A-3** (téléchargement).
4. Cliquer **PDF/A-3** sur une facture générée → **Attendu :** toast info « Téléchargement simulé — … (PDF/A-3 disponible après intégration backend) », **aucun fichier réel** n'est téléchargé.
**Cas limites :** filtrage par copro courante : si une vraie copro est sélectionnée, le filtre par nom ne matche aucune facture mock → **tableau vide** (« Aucune facture pour ce filtre. ») ; non persisté (F5 réinitialise les statuts).
**Règle métier :** facturation électronique obligatoire (réforme e-invoicing) — réception pour toutes les entreprises et émission progressive ; format Factur-X = PDF/A-3 avec XML embarqué conforme **EN 16931**. **Génération réelle non implémentée (maquette).**

#### TC-CONF-018 : Navigation, recherche globale et alias /maintenance/ppt
**Priorité :** P2
**Type :** Intégration
**Préconditions / jeu de données :** Connecté en démo.
**Étapes :**
1. Dans la barre latérale, vérifier le groupe Conformité → **Attendu :** 3 entrées PPT, DPE Collectif, Factur-X, chacune menant à la bonne route.
2. Ouvrir la recherche globale et taper « DPE » / « PPT » / « Factur » → **Attendu :** chaque écran apparaît en résultat et y conduit.
3. Saisir l'URL `/maintenance/ppt` → **Attendu :** redirection automatique vers `/conformite/ppt` (alias, pas un écran distinct).
**Cas limites :** vérifier qu'aucune entrée de menu ne mène à une 404.
**Règle métier :** sans objet.

#### TC-CONF-019 : Non-persistance générale (régression maquette)
**Priorité :** P0
**Type :** Régression
**Préconditions / jeu de données :** N'importe quel écran de conformité après une action (DPE modifié, travail PPT ajouté, Factur-X généré).
**Étapes :**
1. Effectuer une modification (ex. ajouter un travail PPT) → **Attendu :** changement visible à l'écran.
2. Rafraîchir la page (F5) → **Attendu (comportement actuel) :** **toutes les modifications disparaissent**, on retrouve les données mock d'origine.
3. Changer de copro puis revenir → **Attendu :** mêmes données mock, aucune trace des changements.
**Cas limites :** ce test documente que le domaine n'a **aucune persistance**. À considérer comme **bloquant avant toute mise en production** : aucune des trois fonctionnalités n'est réellement utilisable par un syndic.
**Règle métier :** les obligations DPE / PPT / Factur-X imposent un suivi durable et traçable — impossible sans backend. À signaler au métier.

---

## Jeu de données requis (rappel)

- **Compte :** `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » sur `/auth/login`), affiché « Jean Dupont ». Seul utilisateur.
- **Données affichées par ce domaine :** **uniquement les mocks codés en dur**, indépendants du cloud :
  - DPE / PPT : « Résidence Les Pins » (`copro-1`), « Immeuble Voltaire » (`copro-2`), « Les Jardins du Lac » (`copro-3`), « Résidence Berlioz » (`copro-4`).
  - Factur-X : factures FAC-2026-001 à FAC-2026-004 + FAC-2025-198, fournisseurs fictifs.
- **Sélection de copro réelle** (Résidence Martin, Residence Paris Ivry, etc.) depuis `/portefeuille` :
  utile **uniquement** pour reproduire le piège du repli sur le 1er mock (TC-CONF-004, TC-CONF-012)
  et le tableau Factur-X vide filtré par nom (TC-CONF-017). Elle n'alimente **pas** ces écrans.
- **Aucune préparation Supabase nécessaire** : ce domaine n'écrit ni ne lit la base. Aucun
  grand livre, aucune RLS, aucune idempotence à vérifier ici.
- **Conseil de test :** tester systématiquement le rafraîchissement (F5) après chaque action
  pour matérialiser l'absence de persistance (TC-CONF-019).
