# Plan de test — Maintenance & Entretien

> Domaine fonctionnel : gestion de la maintenance d'une copropriété (carnet d'entretien,
> contrats + alertes de renouvellement, ordres de service avec leur workflow, prestataires).
> Stack : Next.js 16 / React 19 / CSS Modules / Supabase cloud `qqfqrcolzmcbsvfaumiq` (RLS ON+FORCE).
> Compte de test unique : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo »),
> affiché « Jean Dupont ». Une copro doit être sélectionnée depuis `/portefeuille` AVANT d'ouvrir
> les écrans (tous les hooks lisent `currentCoproId` du contexte ; sans copro, rien ne charge).

---

## Périmètre & écrans canoniques

Ce qui est réellement câblé, utilisé et persiste en base. C'est ce qu'on teste.

| Écran | Route | Source de données / persistance |
|-------|-------|---------------------------------|
| Hub Maintenance | `/maintenance` | Statique : 4 cartes (Carnet, Contrats, Prestataires, Ordres de service). |
| Carnet d'entretien | `/maintenance/logbook` | Supabase : interventions (`logbook_entries` via `v_logbook_overview`), travaux prévus (`planned_works`), docs techniques (`technical_documents`), assurances (`insurance_policies`), infos copro (`copros`). |
| Détail assurance | `/maintenance/logbook/assurances/[id]` | Supabase `insurance_policies`. |
| Contrats (liste + alertes) | `/maintenance/contracts` | Supabase : liste via store partagé alimenté par `loadContracts` ; renouvellements via `contracts.status = pending_renewal/to_renew`. |
| Nouveau contrat | `/maintenance/contracts/new` | **Canonique d'écriture** : `createContract` (table `contracts` + `tiers`) PUIS upload du PDF dans la GED (`documents`, lié au contrat). PDF OBLIGATOIRE. |
| Détail contrat | `/maintenance/contracts/[id]` | Supabase contrat + actions (résiliation, renouvellement). |
| Ordres de service (liste) | `/maintenance/service-orders` | Supabase `v_service_orders_overview` (+ fusion d'éventuels brouillons `localStorage` de secours). |
| Nouvel ordre de service | `/maintenance/service-orders/new` | Supabase : `generate_service_order_number` (RPC) + insert `service_orders`. Fallback `localStorage` si la base échoue. |
| Détail ordre de service | `/maintenance/service-orders/[id]` | Supabase : `update_service_order_status` (RPC) pour chaque transition ; upload PJ dans la GED. |
| Prestataires (hub à onglets) | `/maintenance/providers` | **Canonique prestataires** : `v_providers_overview` filtré par catégorie (onglets Tous/Copropriété/Syndic/CoproFlex). Écriture via `tiers` (`is_provider`). |
| Détail prestataire | `/maintenance/providers/[id]` | Supabase `tiers` + interventions liées (`logbook_entries`) + contrats liés (`contracts`). Modale d'ajout d'intervention et d'édition prestataire. |

**Note workflow Ordres de Service.** L'enum cible en base est :
`draft / sent / awaiting_provider / refused / scheduled / in_progress / completed / closed / cancelled`.
L'UI affiche le pipeline « métier » en français :
`Brouillon → À envoyer → Envoyé → Accepté → Programmé → En cours → Réalisé → Clôturé` (+ `Annulé`, `Refusé`).
Les anciens statuts `Facturé`/`Payé` n'existent plus : la facturation vit sur `supplier_invoices` et le
badge « Facturé » est dérivé de la facture liée à l'OS.

---

## Écrans morts / doublons (NE PAS tester)

- **`/maintenance/ppt`** — n'affiche rien : c'est une simple redirection serveur vers `/conformite/ppt`.
  Le Plan Pluriannuel de Travaux vit dans le domaine **Conformité**, pas Maintenance. Hors périmètre ici
  (à couvrir dans le plan de test Conformité). Le menu latéral pointe encore vers `/maintenance/ppt`,
  donc on vérifie juste que le clic atterrit bien sur `/conformite/ppt` (TC-MNT-001).
- **`/maintenance/directory`** — annuaire en lecture seule, doublon mort de la fiche Prestataires.
  Le bouton « Ajouter un professionnel » n'a AUCUN handler (ne fait rien). Aucun lien depuis le hub ni
  le menu. Redondant avec `/maintenance/providers`. Ne pas écrire de cas dessus.
- **`/maintenance/providers/copro`** et **`/maintenance/providers/syndic`** — vues filtrées séparées
  (tableau) qui font doublon avec les onglets « Copropriété » / « Syndic » déjà présents dans le hub
  `/maintenance/providers`. Plus aucun lien ne mène vers ces routes (le hub canonique a remplacé la
  navigation par sous-catégorie). Leurs boutons « Ajouter » renvoient vers le hub avec `?add=…`.
  On ne teste que le hub. (À noter pour le ménage : ces deux routes sont à supprimer.)
- **`/maintenance/providers/coproflex`** — « marketplace » nationale de prestataires certifiés.
  Fonctionnellement à moitié morte : les avis renvoient toujours une liste VIDE (commentaire code
  « will be fetched in a future milestone »), et « Demander des devis » n'envoie rien — ça affiche
  juste un toast de succès factice puis vide la sélection. La liste affichée se limite aux prestataires
  de catégorie `coproflex` déjà en base de la copro (pas une vraie base nationale). On ne couvre PAS
  le parcours devis/avis (mock). L'onglet « CoproFlex » du hub suffit pour lister ces prestataires.
- **Modal « Nouveau contrat » du hub Contrats** (`ContractsModals` / `handleAddContrat`) — ancien chemin
  de création qui écrit dans un store local puis tente une synchro Supabase SANS pièce jointe PDF.
  Le chemin canonique est `/maintenance/contracts/new` (PDF obligatoire + écriture propre + GED).
  Ne pas tester la création via ce modal (doublon partiel à retirer) ; le tester créerait un contrat
  sans PDF, contraire à la règle métier « contrat = PDF en GED ».
- **Exports « PDF » texte** (`contrat.txt`, récap interventions) — l'export « PDF » des contrats produit
  en réalité un fichier `.txt` (simulation). Cosmétique / non bloquant : on le mentionne mais sans en
  faire un cas P0.

---

## Cas de test

### A. Hub & navigation

## TC-MNT-001 : Hub Maintenance — accès aux 4 sections + redirection PPT
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro « Résidence Martin » sélectionnée, compte démo.
**Étapes :**
1. Ouvrir `/maintenance` → **Attendu :** titre « Maintenance & Entretien » + 4 cartes : Carnet d'entretien, Contrats, Annuaire professionnels, Ordres de service.
2. Cliquer « Carnet d'entretien » → **Attendu :** arrive sur `/maintenance/logbook`.
3. Revenir, cliquer « Contrats » → **Attendu :** `/maintenance/contracts`.
4. Revenir, cliquer « Annuaire professionnels » → **Attendu :** `/maintenance/providers` (hub à onglets).
5. Revenir, cliquer « Ordres de service » → **Attendu :** `/maintenance/service-orders`.
6. Dans le menu latéral, cliquer l'entrée « PPT » → **Attendu :** la page redirige automatiquement vers `/conformite/ppt` (le PPT n'est PAS un écran Maintenance).
**Cas limites :** Sans copro sélectionnée, les sous-pages s'ouvrent mais affichent des listes vides (aucun crash). Le hub ne propose PAS de lien vers « Annuaire » (`/directory`), ni « Prestataires copro/syndic », ni « PPT » → cohérent avec les écrans morts.

---

### B. Carnet d'entretien (`/maintenance/logbook`)

## TC-MNT-002 : Carnet — affichage des interventions et KPIs
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin », au moins 1 intervention en base (sinon créer via TC-MNT-003 d'abord).
**Étapes :**
1. Ouvrir `/maintenance/logbook` → **Attendu :** en-tête avec les 6 KPIs (En cours, Planifiées, Travaux prévus, Travaux votés, Coût année, Urgences) renseignés ; onglet « Interventions » actif par défaut.
2. Vérifier la liste des interventions → **Attendu :** triées par priorité de statut (En cours, puis Planifiée, puis Terminée), date décroissante en second critère.
3. Cliquer le KPI « Planifiées » → **Attendu :** la liste se filtre sur les interventions au statut Planifiée ; recliquer le même KPI annule le filtre.
**Cas limites :** Copro sans intervention → liste vide, KPIs à 0, aucun crash. Les montants/coûts s'affichent au format français.

## TC-MNT-003 : Carnet — créer une intervention (happy path)
**Priorité :** P0
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** « Résidence Martin » (a des prestataires) ; copro sélectionnée.
**Étapes :**
1. Cliquer « Nouvelle intervention » → **Attendu :** modale de création.
2. Saisir un titre, choisir une catégorie (Courante / Travaux importants), un type, un statut, sélectionner un prestataire existant, saisir un coût → valider → **Attendu :** toast « Intervention créée » ; nouvelle ligne `logbook_entries` en base (copro_id = copro courante, injecté côté serveur), visible dans la liste après rafraîchissement.
3. Si l'intervention n'est pas visible avec le filtre actif → **Attendu :** toast « Intervention créée (non visible) » avec mention du filtre bloquant + bouton pour réinitialiser les filtres.
**Cas limites :**
- Titre vide → toast « Le titre est obligatoire », pas d'insert.
- Ni prestataire ni intervenant saisi → toast « Sélectionnez un prestataire ou saisissez un intervenant ».
- Choisir « Nouveau prestataire » sans nom → toast « Le nom du nouveau prestataire est obligatoire ».
- Choisir « Nouveau prestataire » + nom → un `tiers` (is_provider, catégorie copropriété) est créé AVANT l'intervention, puis l'intervention lui est rattachée.
**Règle métier :** Le carnet d'entretien est obligatoire (décret 2001-477 / art. 18 loi 65-557) ; toute intervention doit y être tracée.

## TC-MNT-004 : Carnet — modifier une intervention (dont passage à « Terminée »)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** 1 intervention existante au statut Planifiée ou En cours.
**Étapes :**
1. Cliquer l'icône d'édition d'une intervention → **Attendu :** la modale se pré-remplit avec ses valeurs.
2. Changer le statut en « Terminée » + saisir un coût → valider → **Attendu :** toast « Modifications enregistrées » ; en base, `status = terminee` et `completed_at` est renseigné (date du jour).
**Cas limites :** Titre effacé → toast d'erreur, pas d'update. Coût négatif : à vérifier (champ number, idéalement refusé).

## TC-MNT-005 : Carnet — éditer les infos de la copropriété
**Priorité :** P2
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** « Résidence Martin ».
**Étapes :**
1. Dans la section « Informations copropriété », activer le mode édition, modifier l'adresse / la ville / l'année de construction → enregistrer → **Attendu :** la table `copros` est mise à jour (name/address/postal_code/city/annee_construction) ; le mode édition se ferme.
**Cas limites :** Si la sauvegarde échoue (réseau/RLS), le mode édition RESTE ouvert ET un message « La sauvegarde a échoué… » s'affiche (pas de perte silencieuse). Le nombre de bâtiments/lots affiché est figé (1 / 0 par défaut, non rebranché) — ne pas le considérer comme un bug bloquant.

## TC-MNT-006 : Carnet — consulter une assurance
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec au moins une `insurance_policies` (ex. « Résidence Martin » ou copro HARNESS seedée).
**Étapes :**
1. Dans la section « Assurances » du carnet, cliquer une assurance → **Attendu :** ouverture de `/maintenance/logbook/assurances/[id]` avec assureur, n° de police, prime annuelle, franchise, garanties.
**Cas limites :** ID d'assurance inexistant → page de détail vide / message d'absence, pas de crash.

---

### C. Contrats (`/maintenance/contracts`)

## TC-MNT-007 : Contrats — liste, KPIs et tri par priorité de statut
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec quelques contrats (créer via TC-MNT-008 si vide).
**Étapes :**
1. Ouvrir `/maintenance/contracts` → **Attendu :** liste des contrats triée par priorité (Expirés en premier, puis À renouveler, Actifs, Brouillons, Résiliés) ; bandeau du contrat syndic ; barre de coût annuel total.
2. Filtrer par statut, par catégorie, par recherche texte (nom / prestataire / n° contrat) → **Attendu :** la liste se restreint correctement.
**Cas limites :** Recherche sans résultat → liste vide. Contrat dont la date de fin approche → doit apparaître en « À renouveler » dans les alertes.

## TC-MNT-008 : Contrats — créer un contrat avec PDF (canonique)
**Priorité :** P0
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** « Résidence Martin » (a des prestataires) ; un fichier PDF de test à portée de main.
**Étapes :**
1. Aller sur `/maintenance/contracts/new` → **Attendu :** formulaire « Nouveau contrat ».
2. Renseigner libellé, type de contrat, prestataire, date début, date fin, coût annuel, et **joindre un PDF** → cliquer « Créer le contrat » → **Attendu :**
   - une ligne est créée dans `contracts` (label/reference/tiers_id/domain_id/annual_amount, copro_id = courante) ;
   - le PDF est uploadé dans la GED (`documents`, catégorie `contrat`, lié à ce contrat, module source `maintenance`) ;
   - redirection vers `/maintenance/contracts` ; le contrat apparaît dans la liste.
**Cas limites :**
- **Aucun PDF joint** → alerte « Veuillez joindre le fichier PDF du contrat (champ obligatoire) », pas d'enregistrement (règle métier : un contrat doit avoir sa pièce).
- Type de contrat non mappé / domaine non seedé → l'enregistrement échoue FORT avec un message explicite (« Domaine d'intervention inconnu… ») — pas de contrat à moitié créé.
- Champs requis HTML (libellé, type, dates, coût) vides → le navigateur bloque la soumission.
**Règle métier :** Les contrats de maintenance et leurs pièces sont conservés et communicables (notamment à l'acquéreur, art. 18 / questionnaire vente).

## TC-MNT-009 : Contrats — détail d'un contrat
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** 1 contrat existant.
**Étapes :**
1. Depuis la liste, cliquer « Voir détails » → **Attendu :** `/maintenance/contracts/[id]` affiche les infos générales, dates, conditions, financier, prestataire, statut.
**Cas limites :** Contrat introuvable (id invalide) → message d'absence, pas de crash.

## TC-MNT-010 : Contrats — demander puis confirmer un renouvellement
**Priorité :** P1
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** 1 contrat « Expiré » ou « À renouveler ».
**Étapes :**
1. Sur un contrat expiré, ouvrir la décision de renouvellement, saisir une nouvelle date de fin, confirmer la demande → **Attendu :** toast « Demande de renouvellement envoyée… » ; en base le contrat passe `status = to_renew` avec la nouvelle `end_date` ; il apparaît dans les renouvellements en attente.
2. Sur ce renouvellement en attente, cliquer « Confirmer » → **Attendu :** toast « Renouvellement confirmé jusqu'au … » ; en base `status = active`, `end_date` = nouvelle date, `start_date` = aujourd'hui ; le contrat sort de la file d'attente.
**Cas limites :** « Annuler la demande » retire le renouvellement de la file sans modifier le contrat. Si Supabase échoue, fallback `localStorage` (`coproflex_pending_renewals`) — la demande reste visible mais non persistée en base (à signaler comme dette, pas un succès trompeur).
**Règle métier :** Surveillance des échéances pour éviter la reconduction tacite non désirée (préavis de résiliation).

## TC-MNT-011 : Contrats — résilier un contrat
**Priorité :** P1
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** 1 contrat « Actif ».
**Étapes :**
1. Ouvrir la décision sur un contrat actif, choisir « Résilier », saisir une raison → confirmer → **Attendu :** toast « Contrat … résilié » ; en base `status = terminated`, `terminated_at` daté, `termination_reason` = la raison saisie.
**Cas limites :** Raison vide : vérifier le comportement (idéalement requise). Échec Supabase → fallback local + le toast ne doit pas mentir sur la persistance.

## TC-MNT-012 : Contrats — exporter la liste
**Priorité :** P3
**Type :** Fonctionnel
**Préconditions / jeu de données :** Quelques contrats.
**Étapes :**
1. Cliquer « Exporter » → format Excel → **Attendu :** un fichier `.csv` se télécharge (statut, libellé, prestataire, type, échéance, coût).
2. Tester l'export « Acquéreurs » → **Attendu :** un fichier listant uniquement les contrats ACTIFS.
**Cas limites :** L'export « PDF » produit en réalité un `.txt` (simulation connue) — cosmétique, non bloquant.

---

### D. Ordres de service (`/maintenance/service-orders`)

## TC-MNT-013 : OS — liste, statistiques et filtres
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro avec quelques OS (créer via TC-MNT-014 si vide).
**Étapes :**
1. Ouvrir `/maintenance/service-orders` → **Attendu :** vue « Finance » des OS avec compteurs (total, brouillons, en attente prestataire, programmés, réalisés, clôturés) ; liste triée par date décroissante.
2. Rechercher par sujet / n° d'OS / prestataire, filtrer par statut → **Attendu :** la liste se restreint correctement.
**Cas limites :** OS créés hors-ligne (brouillons en `localStorage`, IDs non-UUID) sont fusionnés et ne sont PAS dupliqués s'ils existent déjà en base.

## TC-MNT-014 : OS — créer un ordre classique et l'envoyer (happy path)
**Priorité :** P0
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** « Résidence Martin » (prestataires disponibles).
**Étapes :**
1. `/maintenance/service-orders/new` → laisser le type « Classique » → choisir une catégorie d'intervention → sélectionner un prestataire cohérent → **Attendu :** liste de prestataires filtrée par catégorie ; alerte d'incohérence si le prestataire ne couvre pas la catégorie.
2. Renseigner titre, description, objet et corps de l'email → cliquer « Générer et envoyer » → **Attendu :**
   - un numéro d'OS est généré (RPC `generate_service_order_number`) ;
   - un `service_orders` est créé (copro_id courante, origin `syndic`, status `sent`) ;
   - alerte de succès « Ordre de service envoyé à <prestataire> » ; redirection vers la liste.
3. Vérifier la liste → **Attendu :** le nouvel OS apparaît au statut « Envoyé ».
**Cas limites :**
- Titre / description / objet / corps d'email vides → « Veuillez remplir tous les champs obligatoires », pas d'envoi.
- Type Classique sans prestataire → erreur « Le prestataire est obligatoire en mode classique ».
- Échec base → fallback `localStorage` AVEC un message d'avertissement honnête « Sauvegardé localement (erreur DB…) » (pas présenté comme un succès).

## TC-MNT-015 : OS — créer un brouillon
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Copro sélectionnée.
**Étapes :**
1. Sur `/maintenance/service-orders/new`, saisir au minimum un titre → cliquer « Enregistrer en brouillon » → **Attendu :** OS créé en base avec status `draft` ; alerte « Brouillon sauvegardé » ; il apparaît au statut « Brouillon » dans la liste.
**Cas limites :** Titre vide → « Le titre est obligatoire pour sauvegarder un brouillon », pas d'enregistrement.

## TC-MNT-016 : OS — créer un ordre contractuel
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** 1 contrat actif rattaché à un prestataire.
**Étapes :**
1. Sur `/maintenance/service-orders/new`, choisir le type « Contractuel » → sélectionner un contrat → **Attendu :** le prestataire est renseigné automatiquement d'après le contrat.
2. Compléter titre/description/email et envoyer → **Attendu :** `service_orders` créé avec `order_type = contrat`, `contract_id` rattaché, status `sent`.
**Cas limites :** Type Contractuel sans contrat sélectionné → « Le contrat est obligatoire en mode contractuel ».

## TC-MNT-017 : OS — parcours complet du workflow jusqu'à clôture
**Priorité :** P0
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** 1 OS au statut « Envoyé » (issu de TC-MNT-014).
**Étapes :**
1. Ouvrir le détail `/maintenance/service-orders/[id]` → **Attendu :** barre de pipeline + panneau d'action proposant la/les prochaine(s) étape(s) ; statut courant « Envoyé ».
2. Passer « Envoyé → Accepté » (cocher la checklist : confirmation prestataire, devis conforme) → valider → **Attendu :** appel `update_service_order_status` (status `awaiting_provider`) ; un événement est ajouté à l'historique ; le statut avance.
3. Passer « Accepté → Programmé » en saisissant une date d'intervention (obligatoire) → valider → **Attendu :** status `scheduled`, date enregistrée.
4. Passer « Programmé → Réalisé » en saisissant date de réalisation + montant final (obligatoires) → valider → **Attendu :** status `completed`, montant final stocké (`quoted_amount`/`actual_amount`).
5. Passer « Réalisé → Clôturé » + note de clôture → valider → **Attendu :** status `closed` ; l'archivage GED de l'OS est déclenché ; aucune transition suivante n'est proposée.
6. Vérifier l'historique → **Attendu :** chaque transition est tracée (ancien → nouveau statut, auteur, date, note interne le cas échéant), reconstruit depuis `service_order_events`.
**Cas limites :**
- Passage à « Programmé » sans date → erreur « Date d'intervention obligatoire ».
- Passage à « Réalisé » sans date OU sans montant → erreur « Date et montant obligatoires ».
- Transition invalide non proposée (le panneau ne montre que les étapes autorisées par `VALID_TRANSITIONS`).
**Règle métier :** Workflow OS = BROUILLON → ENVOYE → EN_ATTENTE_PRESTATAIRE → INTERVENTION_PROGRAMMEE → INTERVENTION_REALISEE → CLOTURE (ANNULE possible à toute étape non finale). Mappé sur l'enum Supabase draft/sent/awaiting_provider/scheduled/completed/closed/cancelled.

## TC-MNT-018 : OS — refus par le prestataire puis renvoi
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** 1 OS au statut « Envoyé ».
**Étapes :**
1. Sur le détail, choisir la transition « Refusé » → saisir une raison de refus (obligatoire) → valider → **Attendu :** status `refused` ; la raison est tracée dans l'historique (`refusal_reason`).
2. Depuis « Refusé », relancer vers « À envoyer » → **Attendu :** l'OS peut repartir dans le circuit.
**Cas limites :** Refus sans raison → erreur « Raison du refus obligatoire ».

## TC-MNT-019 : OS — annulation
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** 1 OS à un statut non final (≠ Clôturé/Annulé).
**Étapes :**
1. Sur le détail, cliquer « Annuler cet OS » → confirmer la boîte de dialogue → **Attendu :** `update_service_order_status` vers `cancelled` ; statut « Annulé » ; plus aucune transition proposée.
**Cas limites :** Sur un OS déjà Clôturé ou Annulé, le bouton « Annuler cet OS » n'est PAS affiché. Refuser la confirmation → aucune action.

## TC-MNT-020 : OS — joindre une pièce (PJ) au détail
**Priorité :** P2
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** 1 OS existant ; copro sélectionnée ; un fichier (PDF ou image) de test.
**Étapes :**
1. Sur le détail, onglet « Pièces jointes », cliquer « + Ajouter un document », choisir un fichier → **Attendu :** le fichier est uploadé dans la GED (`documents`, catégorie `ordre_service`, lié à l'OS) ; il apparaît dans la liste des PJ après rafraîchissement ; cliquer une PJ ouvre la visionneuse.
**Cas limites :** Upload multiple en une fois. Échec d'upload sur un fichier → l'erreur est loguée, les autres continuent (pas de blocage total).

## TC-MNT-021 : OS — supprimer un ordre de service
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** 1 OS supprimable.
**Étapes :**
1. Depuis la liste, déclencher la suppression d'un OS → confirmer → **Attendu :** pour un OS en base (ID UUID), appel RPC `delete_service_order` puis disparition de la liste ; pour un brouillon local (ID non-UUID), suppression du `localStorage` uniquement.
**Cas limites :** Refuser la confirmation → aucune suppression. Erreur de suppression en base → alerte « Erreur lors de la suppression », l'OS reste affiché.

---

### E. Prestataires (`/maintenance/providers`)

## TC-MNT-022 : Prestataires — hub à onglets, KPIs et recherche
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** « Résidence Martin » (plusieurs prestataires de catégories différentes).
**Étapes :**
1. Ouvrir `/maintenance/providers` → **Attendu :** en-tête « Annuaire prestataires » ; KPIs (Total, Actifs, Interventions total, Note moyenne) ; onglets Tous / Copropriété / Syndic / CoproFlex avec leur compteur.
2. Basculer entre les onglets → **Attendu :** la liste de gauche se restreint à la catégorie ; filtre additionnel par domaine via les pastilles.
3. Sélectionner un prestataire dans la liste → **Attendu :** le panneau de droite affiche ses coordonnées, stats (interventions / note / contrats), domaines, et les boutons Appeler / Email / Voir fiche complète.
4. Rechercher par nom / domaine / ville → **Attendu :** la liste filtre en direct.
**Cas limites :** Onglet sans prestataire → « Aucun prestataire trouvé ». Prestataire sans téléphone/email → boutons inactifs (pas de `tel:`/`mailto:` vide).

## TC-MNT-023 : Prestataires — ajouter un prestataire
**Priorité :** P0
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** Copro sélectionnée.
**Étapes :**
1. Sur le hub, cliquer « Prestataire » → **Attendu :** modale d'ajout.
2. Renseigner nom, catégorie, domaine(s), email/téléphone/ville/adresse → valider → **Attendu :** toast « Prestataire "<nom>" ajouté » ; en base un `tiers` est créé (`is_provider = true`, `copro_id` courante, `category`, `domain_ids` résolus depuis les slugs `work_domain`) ; il apparaît dans la liste/onglet correspondant.
**Cas limites :**
- Nom vide → l'ajout doit échouer (toast d'erreur).
- Domaine non seedé dans `work_domain` → échec FORT avec message explicite (pas de prestataire à moitié créé).
- La catégorie « coproflex » est stockée en base sous `category = externe` (traduction) — à vérifier qu'elle réapparaît bien dans l'onglet CoproFlex.

## TC-MNT-024 : Prestataires — fiche détaillée + interventions + contrats liés
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** 1 prestataire ayant au moins une intervention ET un contrat.
**Étapes :**
1. Ouvrir `/maintenance/providers/[id]` → **Attendu :** coordonnées, statistiques (interventions / note / nb contrats), domaines, contrats liés (depuis `contracts` filtrés sur ce prestataire), historique des interventions (depuis `logbook_entries`).
2. Cliquer une intervention de l'historique → **Attendu :** modale de détail (coût, statut, type, date, intervenant).
**Cas limites :** Prestataire introuvable → écran « Prestataire introuvable » + lien retour. Prestataire sans contrat → la section « Contrats liés » n'apparaît pas.

## TC-MNT-025 : Prestataires — éditer un prestataire
**Priorité :** P1
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** 1 prestataire existant.
**Étapes :**
1. Sur la fiche, cliquer « Modifier », changer email / téléphone / adresse / domaines → enregistrer → **Attendu :** toast « Prestataire mis à jour » ; en base `tiers` mis à jour (y compris `domain_ids` re-résolus depuis les slugs) ; les valeurs reflétées à l'écran.
**Cas limites :** Désélectionner tous les domaines = `domain_ids` vidés explicitement (≠ ne pas toucher). Échec Supabase → l'UI affiche quand même la valeur locale (optimiste) mais l'erreur est loguée — à signaler comme risque de divergence affichage/base.

## TC-MNT-026 : Prestataires — ajouter une intervention depuis la fiche
**Priorité :** P2
**Type :** Fonctionnel | Intégration
**Préconditions / jeu de données :** 1 prestataire existant.
**Étapes :**
1. Sur la fiche, cliquer « Intervention » → remplir la modale → valider → **Attendu :** toast « Intervention ajoutée » ; une entrée `logbook_entries` est créée et rattachée à ce prestataire (`tiers_id`), visible dans l'historique de la fiche ET dans le carnet d'entretien.
**Cas limites :** L'entrée est créée avec `entry_type = intervention` (valeur particulière). **À vérifier en base** que cette valeur est acceptée par l'enum `entry_type` du carnet (le carnet classique utilise entretien/incident/controle) — si l'insert échoue silencieusement, c'est un bug à remonter.

## TC-MNT-027 : Prestataires — supprimer un prestataire
**Priorité :** P1
**Type :** Fonctionnel | Régression
**Préconditions / jeu de données :** 1 prestataire SANS contrat ni OS, et 1 prestataire AVEC dépendances (contrat/OS/intervention).
**Étapes :**
1. Sur un prestataire sans dépendance, déclencher la suppression → confirmer → **Attendu :** toast « Prestataire supprimé » ; ligne `tiers` supprimée ; retour à la liste.
2. Tenter de supprimer un prestataire référencé par un contrat ou un OS → **Attendu :** soit la suppression est bloquée par une contrainte FK (message d'erreur clair), soit le comportement de cascade est documenté. **À éprouver empiriquement** : ne pas laisser une suppression casser des OS/contrats existants (intégrité référentielle).
**Cas limites :** Refuser la confirmation → aucune suppression. Suppression échouée → toast « Erreur lors de la suppression », le prestataire reste.

---

### F. RLS / Isolation des données

## TC-MNT-028 : Cloisonnement par copropriété (RLS)
**Priorité :** P0
**Type :** Intégration | Régression
**Préconditions / jeu de données :** Deux copros distinctes accessibles au compte démo (« Résidence Martin » et « Residence Paris Ivry »), chacune avec au moins 1 prestataire/contrat/OS/intervention.
**Étapes :**
1. Sélectionner « Résidence Martin », noter les listes (prestataires, contrats, OS, carnet).
2. Basculer sur « Residence Paris Ivry » via `/portefeuille` → **Attendu :** toutes les listes Maintenance se rechargent et ne montrent QUE les données d'Ivry ; aucune donnée de Martin ne fuit (RLS + filtre `copro_id`).
3. Tenter d'ouvrir directement l'URL d'un OS / contrat / prestataire appartenant à une copro à laquelle le compte n'a PAS accès → **Attendu :** « introuvable » (RLS bloque la lecture), pas d'affichage des données.
**Cas limites :** Création (intervention, contrat, OS, prestataire) sans copro sélectionnée → l'action échoue proprement (« No copro selected ») sans insert orphelin.
**Règle métier :** Étanchéité multi-copro (et multi-cabinet) — RLS ON+FORCE sur le cloud live.

---

## Jeu de données requis (rappel)

- **« Résidence Martin »** — copro la plus complète (6 copropriétaires, 7 lots, clés Charges générales + Bâtiment A + Bâtiment B, 1000 tantièmes). À privilégier : elle dispose de prestataires de plusieurs catégories, ce qui couvre les onglets et les sélecteurs.
- **« Residence Paris Ivry »** — copro partielle (6 copros, 6 lots, clé générale à 0). Sert de seconde copro pour le test de cloisonnement RLS (TC-MNT-028).
- **`create_test_copro_seeded()`** — RPC clonant une copro jetable « HARNESS » : utile pour créer/supprimer librement (OS, contrats, prestataires, interventions) sans polluer les copros de démo, notamment pour les tests destructifs (suppression, workflow complet, cascade FK).
- **Boucle d'or « Le Clos Saint-Michel » (id 22222222…)** — copro finance de référence ; à NE PAS modifier ici (réservée aux tests finance).
- **Prérequis transverses :** être connecté avec le compte démo, AVOIR sélectionné une copro depuis `/portefeuille` avant chaque scénario (sans copro, les écrans chargent à vide) ; disposer d'un PDF de test (TC-MNT-008) et d'un fichier image/PDF (TC-MNT-020) pour les uploads GED.
