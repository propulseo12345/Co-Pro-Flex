# Plan de test — Ventes (mutations de lot + état daté) & Impayés / Contentieux / Recouvrement

> Cible : application lancée en local (`npm run dev`) pointant sur le cloud live Supabase `qqfqrcolzmcbsvfaumiq`.
> Compte : `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo » 1-clic). Seul utilisateur, affiché « Jean Dupont ».
> Sélection de copropriété : depuis `/portefeuille`, cliquer une copro (sans copro sélectionnée, la plupart des écrans sont vides).

---

## Périmètre & écrans canoniques

Deux grands domaines, regroupés dans la navigation sous **Documents > État daté** (pour les ventes) et **Contentieux** (pour les impayés / litiges).

### A. Ventes de lot (mutations) + état daté — code canonique `src/features/ventes`

| Écran | Route | Rôle |
|-------|-------|------|
| **Liste des mutations** | `/ventes-impayes/ventes` | Point d'entrée RÉEL des ventes (lien menu « Documents > État daté » pointe ici). Stats, recherche, filtres statut/type, bouton « Nouvelle mutation » (modal). Hook `useMutations`. |
| **Création** | Modal `CreateMutationModal` (dans la liste) | Choix du lot (liste réelle des lots de la copro), type de mutation, acquéreur libre, notaire libre, notes. Crée une ligne `mutations` (statut `draft`). |
| **Détail / workflow** | `/ventes-impayes/ventes/[id]` | Cœur du parcours : timeline 6 étapes, panneau d'actions contextuelles, parties (vendeur/acquéreur/notaire), états datés générés, alerte délai 15 j. Hook `useMutationDetail`. |

**Cycle de vie d'une mutation (enum `MutationStatus`) :**
```
draft ─(générer pré-état)→ pre_etat_generated ─(générer état final)→ etat_generated
  └─(envoyer notaire)→ sent_to_notary ─(marquer signé)→ signed ─(valider)→ validated
                                                                    cancelled (depuis n'importe quel état non final)
```
Libellés FR affichés : Notifiée / Pré-état envoyé / État daté généré / Envoyé au notaire / En attente acte / Validée / Annulée.

**RPC / mécanismes back :**
- Création mutation : insert `mutations` + `upsert_mutation_notary` (le notaire devient un tiers `is_notary`), acquéreur stocké dans `buyer_draft` (jsonb).
- Génération état daté : RPC `create_etat_date_snapshot(p_copro_id, p_mutation_id, p_snapshot_type)` → fige un payload V2 immuable (`generate_etat_date_payload`, 3 parties art. 5) dans `etat_date_snapshots` ET fait avancer le statut de la mutation.
- Envoi notaire : update statut `sent_to_notary` + RPC `upsert_mutation_step('envoi_notaire', completed)`.
- Validation : RPC `validate_mutation` → bascule `lot_owners` (transfert de propriété lot-centric), **zéro écriture au grand livre**.
- Avertissement solde vendeur : RPC `get_lot_balance_45x` (lecture live du grand livre) affiché dans la modale de validation, **n'empêche jamais** la validation.
- PDF état daté : généré côté client (`generateEtatDatePDF`) au clic « Télécharger PDF », puis archivé automatiquement dans la GED (catégorie `etat_date`, fire-and-forget).

### B. Impayés / Recouvrement — canonique `/contentieux/impayes`

| Écran | Route | Rôle |
|-------|-------|------|
| **Impayés (V3)** | `/contentieux/impayes` | Écran canonique. Lien menu « Contentieux > Impayés ». Hook `useImpayesPage`. Liste des lots en retard (DONNÉES RÉELLES via vues `v_unpaid_with_reminders`), stats, filtres par statut, fiche détail, modales relance / règlement / export, relances groupées. |
| **Litiges** | `/contentieux/litiges` | Lien menu « Contentieux > Litiges ». **Coquille vide** : `MOCK_LITIGES = []`, aucune persistance, boutons « Nouveau litige » / « Voir détails » sans effet. Testé seulement en surface (présence + état vide). |

**Statuts impayé (enum métier) :** en retard / 1ère relance amiable / 2ème relance amiable / mise en demeure / contentieux / réglé.

**⚠ Limite majeure à connaître pour le test (vérifiée dans le code) :**
- La **lecture** des impayés est réelle (Supabase, vues `v_unpaid_by_lot` / `v_unpaid_with_reminders`).
- Les **actions** de l'écran `/contentieux/impayes` (envoi de relance, relances groupées, « marquer réglé ») sont **simulées en mémoire** (`setTimeout` + mise à jour de l'état React local). Elles **ne créent AUCUN enregistrement en base** (`payment_reminders`) et **ne touchent PAS le grand livre**. Au rechargement de la page (F5), tout revient à l'état réel.
- Le hook de persistance réelle des relances `useImpayesMutations` (insert `payment_reminders`) existe dans le code **mais n'est branché sur aucune page** (recouvrement codé, non câblé).
- Conséquence : les cas « relance / règlement » se testent comme du **comportement d'écran** (UI + PDF généré + GED), pas comme un effet base. C'est explicitement noté dans chaque cas concerné.

---

## Écrans morts / doublons (NE PAS tester)

| Écran / route | Statut | Pourquoi |
|---------------|--------|----------|
| `/sales` | Doublon mort | Workflow de vente 100 % mock (`useSalesPage`, données factices). Non lié au menu, jamais alimenté par Supabase. Le canonique est `/ventes-impayes/ventes`. |
| `/ventes-impayes` (hub) | Mort | Tableau de bord « Ventes & Impayés » basé sur `useVentesImpayesDashboard` (mocks) ; non référencé dans le menu. Supplanté par les écrans dédiés Contentieux + liste mutations. |
| `/ventes-impayes/ventes/nouvelle` | Mort | Formulaire « Nouvelle vente » bâti sur `MOCK_COPROPRIETAIRES = []` et `MOCK_LOTS = []` (TODO Supabase jamais fait) : aucun lot/vendeur sélectionnable. La vraie création passe par le modal `CreateMutationModal` de la liste. |
| `/ventes-impayes/impayes` | Redirigé | `redirect('/contentieux/impayes')` (code) + redirection `next.config.ts`. Inaccessible à l'usage. |
| `/finance/unpaid` | Redirigé | Redirection `next.config.ts` → `/contentieux/impayes`. (Ancienne vue lecture seule, actions en `alert()`.) |
| `/finance/etats-dates` | Redirigé | `redirect('/ventes-impayes/ventes')`. Ancien moteur état daté 100 % mock. |
| `/legal/disputes` | Redirigé | Redirection `next.config.ts` → `/contentieux/litiges`. Doublon strict (même mock vide). |
| `useImpayesMutations` (hook) | Code non câblé | Persistance réelle des relances ; n'est importé par aucune page. À ne pas tester tant qu'il n'est pas branché. |

> NB : `/contentieux/litiges` est gardé au périmètre (il est dans le menu) mais uniquement en test de surface (TC-IMP-011), car il n'a aucune logique réelle.

---

## Cas de test

> Jeu de données recommandé : **« Résidence Martin »** (6 copropriétaires, 7 lots, 3 clés, 1000 tantièmes) = la copro la plus complète pour les ventes. Pour les impayés, utiliser une copro où des appels de fonds existent avec des échéances dépassées (voir « Jeu de données requis »). À défaut, créer une copro jetable via `create_test_copro_seeded()`.

---

### A. Ventes de lot (mutations) & état daté

## TC-VTE-001 : Accéder à la liste des mutations et vérifier l'état vide
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Connecté en démo, copro « Résidence Martin » sélectionnée, aucune mutation existante.
**Étapes :**
1. Menu « Documents » > « État daté » (ou aller à `/ventes-impayes/ventes`) → **Attendu :** titre « Gestion des Mutations », sous-titre mentionnant « états datés conformes Art. 20 ».
2. Observer les 3 stats en haut → **Attendu :** « Mutations en cours » = 0, « Mutations finalisées » = 0, « États datés manquants » = 0.
3. Observer la zone liste → **Attendu :** message « Aucune mutation trouvée » (état vide, pas d'erreur, pas de spinner figé).
**Cas limites :** Sans copro sélectionnée → liste vide sans plantage. Recharger la page (F5) → l'état vide reste cohérent (lecture réelle).
**Règle métier :** État daté = obligation art. 20 loi 65-557 (information de l'acquéreur lors d'une mutation).

## TC-VTE-002 : Créer une mutation (vente) — happy path
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Copro « Résidence Martin », au moins un lot avec un propriétaire actif.
**Étapes :**
1. Cliquer « Nouvelle mutation » → **Attendu :** modal « Nouvelle mutation » avec 4 sections (Lot, Acquéreur, Notaire, Notes).
2. Ouvrir le menu déroulant « Lot » → **Attendu :** liste des lots réels de la copro au format « réf - type (X tantièmes) - Nom propriétaire ».
3. Choisir un lot → **Attendu :** le vendeur est déduit automatiquement du propriétaire actuel du lot (pas de champ vendeur à saisir).
4. Laisser « Type de mutation » = Vente, saisir un acquéreur (ex. « Marie MARTIN », email), un notaire (ex. « Maître DUVAL », réf « REF-2026-001 »), une note → **Attendu :** champs acceptés.
5. Cliquer « Créer la mutation » → **Attendu :** modal se ferme, la liste affiche une carte mutation au statut « Notifiée » (badge), stat « Mutations en cours » passe à 1.
6. Effet base : ligne dans `mutations` (statut `draft`, `seller_owner_id` rempli, `notaire_id` pointant un tiers `is_notary` créé/réutilisé, acquéreur dans `buyer_draft`).
**Cas limites :** Soumettre sans lot → bouton « Créer » désactivé (champ lot obligatoire). Acquéreur/notaire laissés vides → création quand même possible (ils sont optionnels). Cocher « Personne morale » → `is_company` reflété dans `buyer_draft`. Créer 2 mutations sur le même lot → autorisé côté UI (pas de garde d'unicité visible) : à signaler si comportement métier indésirable.
**Règle métier :** Le vendeur est toujours le propriétaire actuel du lot (modèle lot-centric).

## TC-VTE-003 : Générer le pré-état daté
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Une mutation au statut « Notifiée » (draft), créée en TC-VTE-002.
**Étapes :**
1. Ouvrir la mutation (clic sur la carte → `/ventes-impayes/ventes/[id]`) → **Attendu :** page détail, timeline avec « Notifiée » complétée, panneau « Actions » proposant « Générer le pré-état daté ».
2. Cliquer « Générer le pré-état daté » → **Attendu :** toast « Pré-état daté généré », statut passe à « Pré-état envoyé », un bloc « États Datés (Art. 20) » apparaît avec un viewer.
3. Effet base : 1 ligne `etat_date_snapshots` (type `pre`, payload V2 figé), statut mutation = `pre_etat_generated`.
4. Dérouler le viewer → **Attendu :** 3 parties affichées : Partie 1 (sommes dues PAR le vendeur), Partie 2 (sommes dues AU vendeur, hors ALUR), Partie 3 (à la charge de l'acquéreur), + annexe quote-part (tantièmes lot / total / %).
**Cas limites :** Si la copro n'a aucun grand livre (appels/paiements), les totaux des 3 parties = 0 (pas une erreur). Mutation déjà au-delà de draft → le bouton « Générer le pré-état » n'apparaît plus.
**Règle métier :** Pré-état daté à fournir sous 15 j de la demande du notaire (art. 20). Le snapshot est immuable (valeur probante).

## TC-VTE-004 : Alerte de délai 15 jours sur le pré-état
**Priorité :** P2
**Type :** UI / Fonctionnel
**Préconditions / jeu de données :** Une mutation au statut « Notifiée » dont `days_until_pre_etat_deadline` ≤ 5 et pas de pré-état généré (peut nécessiter un seed avec `requested_at` ancien).
**Étapes :**
1. Ouvrir la mutation → **Attendu :** bandeau d'alerte (jaune si ≤ 5 j restants, rouge si « Délai dépassé ») avec le texte « Le pré-état daté doit être généré sous 15 jours (Art. 20 Loi 65-557) ».
2. Générer le pré-état → **Attendu :** l'alerte disparaît (condition `!has_pre_etat` n'est plus vraie).
**Cas limites :** Délai > 5 j → aucun bandeau. Mutation annulée → pas de bandeau.
**Règle métier :** Délai légal de 15 jours (art. 20).

## TC-VTE-005 : Générer l'état daté final
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Une mutation au statut « Pré-état envoyé » (TC-VTE-003).
**Étapes :**
1. Sur la page détail, cliquer « Générer l'état daté final » → **Attendu :** toast « État daté final généré », statut passe à « État daté généré ».
2. Effet base : nouvelle ligne `etat_date_snapshots` (type `final`), statut mutation = `etat_generated`.
3. Vérifier la timeline → **Attendu :** étapes « Pré-état généré » et « État daté final » complétées.
4. Vérifier le bloc États Datés → **Attendu :** le pré-état ET l'état final sont tous deux affichés (deux viewers).
**Cas limites :** Régénérer un état final (le bouton reste dispo en `etat_generated`) → un nouveau snapshot final est créé, l'ancien reste immuable (vérifier qu'on n'écrase pas). Statut signed/validated → bouton final indisponible.
**Règle métier :** L'état daté définitif accompagne l'acte authentique (art. 5 décret 67-223 pour la structure en 3 parties).

## TC-VTE-006 : Télécharger le PDF de l'état daté + archivage GED
**Priorité :** P1
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Une mutation avec au moins un état daté généré (pré ou final).
**Étapes :**
1. Dans le viewer de l'état daté, cliquer « Télécharger PDF » → **Attendu :** un fichier PDF se télécharge (nom contenant le lot / la date), spinner pendant la génération.
2. Ouvrir le PDF → **Attendu :** identité copro/syndic/lot/vendeur/notaire « gelée », les 3 parties art. 5 avec leurs totaux, l'annexe quote-part. Référence légale en en-tête.
3. Observer le message sous le bouton → **Attendu :** « Archivé dans la GED » (ou « Échec de l'archivage GED (PDF téléchargé) » si l'archivage échoue, le PDF restant téléchargé dans tous les cas).
4. Aller dans Documents > GED → **Attendu :** le PDF est rangé dans un sous-dossier « États datés <année> », catégorie « état daté », lié à la mutation.
**Cas limites :** Double-clic sur « Télécharger » → pas de double archivage incohérent. PDF d'un snapshot ancien (legacy V1) → bascule sur le viewer legacy (cas rare, à signaler s'il survient).
**Règle métier :** L'état daté est une pièce légale → conservation GED.

## TC-VTE-007 : Jalon « Envoyé au notaire »
**Priorité :** P1
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Une mutation au statut « État daté généré » (etat_generated).
**Étapes :**
1. Panneau Actions → cliquer « Envoyer au notaire » → **Attendu :** toast « Dossier envoyé au notaire », statut passe à « Envoyé au notaire », étape de timeline « Envoyé au notaire » complétée.
2. Effet base : statut mutation = `sent_to_notary` + étape `envoi_notaire` à `completed` (RPC `upsert_mutation_step`, payload avec `sent_at`).
**Cas limites :** Le bouton « Envoyer au notaire » n'apparaît QUE depuis `etat_generated` (pas avant l'état final). Si l'étape RPC échoue, vérifier que le statut n'est pas laissé incohérent (erreur remontée en toast).
**Règle métier :** Le notaire doit recevoir l'état daté définitif avant la signature de l'acte.

## TC-VTE-008 : Marquer l'acte signé
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Une mutation au statut « Envoyé au notaire » (sent_to_notary).
**Étapes :**
1. Cliquer « Marquer acte signé » → **Attendu :** modale de signature avec un champ date (pré-rempli à aujourd'hui).
2. Choisir une date et confirmer → **Attendu :** statut passe à « En attente acte » (signed), `signature_date` enregistrée, étape « Acte signé » complétée dans la timeline.
3. Effet base : `mutations.status = 'signed'`, `signature_date` renseignée.
**Cas limites :** Date vide → confirmer le comportement (refus ou date par défaut). Date dans le futur → à signaler si accepté sans contrôle.
**Règle métier :** La date de signature de l'acte est le fait juridique qui fige la mutation.

## TC-VTE-009 : Valider la mutation (transfert de propriété) avec acquéreur saisi à la création
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Une mutation au statut « En attente acte » (signed) avec un acquéreur déjà renseigné à la création.
**Étapes :**
1. Cliquer « Valider la mutation » → **Attendu :** modale de validation ; comme l'acquéreur existe déjà, le formulaire acquéreur n'est PAS demandé.
2. Observer l'avertissement de solde → **Attendu :** affichage du solde 45x du vendeur (RPC `get_lot_balance_45x`) : message d'avertissement si le vendeur est débiteur, mais validation possible quoi qu'il arrive.
3. Confirmer → **Attendu :** toast « Mutation validée - Transfert de propriété effectué », statut « Validée », timeline complète.
4. Effet base : `validate_mutation` bascule `lot_owners` (l'acquéreur devient propriétaire actif du lot, l'ancien propriétaire reçoit une `end_date`). **Aucune écriture au grand livre.**
5. Vérifier dans Copropriétaires > le lot → **Attendu :** le nouveau propriétaire est bien rattaché au lot.
**Cas limites :** Vendeur débiteur (solde > 0) → avertissement affiché mais ne bloque pas (règle voulue). Tenter de valider une mutation déjà validée → action indisponible.
**Règle métier :** Modèle lot-centric : le transfert se matérialise sur `lot_owners`, pas par une écriture comptable. Les soldes 45x suivent le lot.

## TC-VTE-010 : Valider la mutation en saisissant l'acquéreur au moment de la validation
**Priorité :** P1
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Une mutation au statut « En attente acte » créée SANS acquéreur (champs acquéreur laissés vides à la création).
**Étapes :**
1. Cliquer « Valider la mutation » → **Attendu :** la modale affiche un formulaire acquéreur (prénom, nom, email, case société).
2. Saisir l'acquéreur et confirmer → **Attendu :** validation réussie, transfert effectué avec ce nouvel acquéreur.
3. Effet base : `validate_mutation` crée/rattache le copropriétaire acquéreur puis bascule `lot_owners`.
**Cas limites :** Formulaire acquéreur incomplet (nom manquant) → comportement à vérifier (refus attendu). Case « société » cochée → l'acquéreur est traité comme personne morale.
**Règle métier :** L'acquéreur doit être identifié avant le transfert de propriété.

## TC-VTE-011 : Annuler une mutation
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Une mutation à n'importe quel statut non final (draft → signed).
**Étapes :**
1. Cliquer « Annuler » → **Attendu :** confirmation navigateur « Êtes-vous sûr de vouloir annuler cette mutation ? ».
2. Confirmer → **Attendu :** toast « Mutation annulée », statut « Annulée », plus aucune action disponible sauf consultation.
3. Effet base : `mutations.status = 'cancelled'`.
**Cas limites :** Annuler une mutation déjà « Validée » → l'action « Annuler » ne doit pas être proposée (transfert irréversible). Annuler une mutation avec états datés déjà générés → les snapshots restent (immuables) mais la mutation est marquée annulée.
**Règle métier :** Une mutation validée (transfert effectué) ne s'annule pas via ce bouton (immuabilité du transfert).

## TC-VTE-012 : Recherche et filtres de la liste des mutations
**Priorité :** P2
**Type :** UI / Fonctionnel
**Préconditions / jeu de données :** Au moins 3 mutations dans des statuts différents (ex. draft, signed, validated) et types variés (vente, donation).
**Étapes :**
1. Saisir un nom de vendeur / notaire / réf lot dans la recherche → **Attendu :** la liste se filtre instantanément sur la correspondance.
2. Sélectionner un statut dans le filtre « Tous les statuts » → **Attendu :** seules les mutations de ce statut restent.
3. Sélectionner un type dans « Tous les types » → **Attendu :** filtrage cumulatif statut + type.
4. Vider la recherche / remettre « Tous » → **Attendu :** toutes les mutations réapparaissent.
**Cas limites :** Recherche sans résultat → « Aucune mutation trouvée ». Recherche avec casse mélangée → insensible à la casse (vérifié dans le filtre).

## TC-VTE-013 : Cohérence des stats de la liste
**Priorité :** P2
**Type :** Fonctionnel / Régression
**Préconditions / jeu de données :** Plusieurs mutations à des statuts variés, dont au moins une sans pré-état et une validée.
**Étapes :**
1. Comparer le compteur « Mutations en cours » → **Attendu :** = nombre de mutations dans draft + pre_etat_generated + etat_generated + sent_to_notary + signed (hors validées/annulées).
2. Comparer « Mutations finalisées » → **Attendu :** = nombre de mutations « Validée ».
3. Comparer « États datés manquants » → **Attendu :** = nombre de mutations non validées/non annulées sans pré-état OU sans état final.
4. Générer un pré-état sur une mutation puis revenir à la liste → **Attendu :** les compteurs se mettent à jour en conséquence.
**Cas limites :** 0 mutation → tous les compteurs à 0.

---

### B. Impayés / Contentieux / Recouvrement

## TC-IMP-001 : Afficher la liste des impayés (données réelles)
**Priorité :** P0
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Copro avec des appels de fonds dont des échéances sont dépassées et non soldées (sinon « aucun impayé »). Connecté en démo.
**Étapes :**
1. Menu « Contentieux » > « Impayés » (`/contentieux/impayes`) → **Attendu :** page « Impayés », bandeau de légende du workflow, filtres par statut.
2. Observer les stats → **Attendu :** « En cours », montant total, nombre en mise en demeure, nombre en contentieux, cohérents avec les lignes affichées.
3. Observer la liste → **Attendu :** une ligne par lot en retard, avec propriétaire, montant dû, retard en jours, statut déduit du retard / dernière relance.
4. Recharger (F5) → **Attendu :** mêmes données (lecture réelle depuis `v_unpaid_with_reminders`).
**Cas limites :** Copro sans impayé → liste vide (pas de mock affiché). Erreur de chargement → message d'erreur explicite (pas de fausses données — règle d'audit 2026-06-12). Sans copro sélectionnée → liste vide.
**Règle métier :** Niveaux de relance copropriété : J+15, J+30, J+60, J+90 (1ère relance / 2ème relance / mise en demeure / contentieux).

## TC-IMP-002 : Filtrer les impayés par statut
**Priorité :** P2
**Type :** UI / Fonctionnel
**Préconditions / jeu de données :** Liste d'impayés contenant plusieurs niveaux (en retard, relancé, mise en demeure…).
**Étapes :**
1. Cliquer un filtre de statut (ex. « Mise en demeure ») → **Attendu :** seules les lignes de ce statut restent ; le compteur de sélection se réinitialise.
2. Cliquer « Tous » → **Attendu :** toutes les lignes réapparaissent.
**Cas limites :** Filtre sur un statut sans aucune ligne → liste vide cohérente. Filtre « Réglé » → affiche les impayés clôturés (s'il y en a en mémoire suite à un règlement simulé).

## TC-IMP-003 : Consulter la fiche détail d'un impayé
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Au moins un impayé dans la liste.
**Étapes :**
1. Cliquer sur une ligne / « Voir détail » → **Attendu :** modale de détail avec propriétaire, lot, montant, période de retard, et l'historique des relances.
2. Observer l'historique → **Attendu :** au minimum la ligne « Impayé détecté » + éventuelles relances déjà enregistrées en base (`payment_reminders`).
3. Cliquer un item d'historique → **Attendu :** modale d'historique détaillé (contenu du courrier/email si présent).
**Cas limites :** Impayé sans relance → historique réduit à la détection. Données partielles (email/adresse vide) → affichage tolérant (« Inconnu » / champ vide), pas de plantage.

## TC-IMP-004 : Générer l'aperçu PDF d'une relance
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Un impayé sélectionné, copro sélectionnée.
**Étapes :**
1. Sur un impayé, ouvrir « Relancer » → **Attendu :** modale de relance avec choix du type (1ère relance / 2ème relance / mise en demeure), le type proposé par défaut correspond à l'étape suivante du workflow.
2. Cliquer « Aperçu PDF » → **Attendu :** modale d'aperçu affichant le courrier de relance (montant, lot, échéance, copropriétaire), contrôle de zoom fonctionnel.
**Cas limites :** Aperçu puis fermeture → l'URL blob est libérée (pas de fuite). Type « 2ème relance » sans 1ère relance précédente → le PDF se génère quand même (à signaler si métier veut un blocage).
**Règle métier :** La mise en demeure se fait par lettre recommandée (modèle distinct).

## TC-IMP-005 : Envoyer une relance simple (comportement d'écran — NON persisté)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Un impayé en statut « en retard » ou « 1ère relance ».
**Étapes :**
1. Ouvrir « Relancer », choisir un type, cliquer « Envoyer la relance » → **Attendu :** indicateur de traitement (~1,5 s) puis fermeture de la modale.
2. Observer la liste → **Attendu :** le statut de l'impayé avance d'un cran (ex. en retard → 1ère relance) et une entrée s'ajoute à son historique (en mémoire).
3. **Recharger la page (F5)** → **Attendu CRITIQUE :** l'avancement DISPARAÎT (retour à l'état réel base) — car l'action n'écrit PAS dans `payment_reminders`. À documenter comme limite connue / défaut à corriger (le hook réel `useImpayesMutations` n'est pas branché).
**Cas limites :** Aucun effet sur le grand livre (une relance n'est jamais une écriture comptable). Aucun email réel n'est envoyé.
**Règle métier :** Une relance documente la procédure de recouvrement, sans impact comptable.

## TC-IMP-006 : Télécharger le PDF de relance + archivage GED
**Priorité :** P2
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Un impayé sélectionné, copro sélectionnée.
**Étapes :**
1. Depuis la modale d'historique / relance, cliquer « Télécharger » → **Attendu :** un PDF de relance se télécharge (nom : type_relance_<nom>_<date>.pdf).
2. Aller dans Documents > GED → **Attendu :** le PDF est archivé (catégorie « courrier », sous-dossier « Relances <année> », module finance).
**Cas limites :** Échec d'archivage → le PDF reste téléchargé (fire-and-forget). Plusieurs téléchargements → noms datés cohérents.

## TC-IMP-007 : Marquer un impayé comme réglé (comportement d'écran — NON persisté)
**Priorité :** P1
**Type :** Fonctionnel
**Préconditions / jeu de données :** Un impayé actif.
**Étapes :**
1. Ouvrir « Régler » sur un impayé, confirmer → **Attendu :** traitement (~1 s), le montant passe à 0, statut « Réglé », entrée d'historique « Impayé réglé intégralement ».
2. **Recharger la page (F5)** → **Attendu CRITIQUE :** l'impayé réapparaît à son montant réel — l'action ne touche NI `call_for_funds_lines`, NI le grand livre. À documenter comme limite : le vrai règlement d'un impayé passe par un encaissement (paiement D512/C450) dans le module Finance / rapprochement bancaire, pas par ce bouton.
**Cas limites :** Aucun risque d'écriture comptable parasite (justement parce que c'est simulé). Signaler le risque de confusion utilisateur (croire qu'un impayé est soldé alors que la compta ne bouge pas).
**Règle métier :** Le règlement réel d'un impayé = pointage d'un encaissement sur le compte 450 du lot (modèle de rapprochement bancaire).

## TC-IMP-008 : Relances groupées (sélection multiple — comportement d'écran)
**Priorité :** P2
**Type :** Fonctionnel
**Préconditions / jeu de données :** Au moins 2 impayés actifs.
**Étapes :**
1. Cocher plusieurs impayés (ou « Tout sélectionner ») → **Attendu :** barre de sélection indiquant le nombre sélectionné.
2. Cliquer « Relances groupées » → **Attendu :** assistant en étapes (sélection du type → confirmation → succès).
3. Choisir un type, envoyer → **Attendu :** traitement (~2 s), seuls les impayés éligibles à ce type sont relancés, écran de succès.
4. **Recharger (F5)** → **Attendu :** avancements perdus (non persisté, même limite que TC-IMP-005).
**Cas limites :** Sélection vide → l'assistant ne s'ouvre pas. Type non applicable à un impayé sélectionné → cet impayé est exclu (filtre d'éligibilité).

## TC-IMP-009 : Exporter la liste des impayés (PDF / CSV)
**Priorité :** P2
**Type :** Fonctionnel / Intégration
**Préconditions / jeu de données :** Une liste d'impayés non vide.
**Étapes :**
1. Cliquer « Exporter » → **Attendu :** modale d'export avec le nombre de lignes filtrées et le montant total.
2. Choisir « PDF » → **Attendu :** un PDF récapitulatif se télécharge ET est archivé en GED (catégorie « relevé de charges », sous-dossier « Exports <année> »), message de succès.
3. Choisir « Excel/CSV » → **Attendu :** un fichier CSV se télécharge.
**Cas limites :** Export d'une liste filtrée → seules les lignes filtrées sont exportées. Liste vide → export d'un document vide ou bouton inactif (à vérifier).

## TC-IMP-010 : Cohérence du mapping statut ↔ retard
**Priorité :** P2
**Type :** Régression
**Préconditions / jeu de données :** Impayés avec des retards de durées différentes (< 30 j, 30-60, 60-90, 90-120, > 120) et/ou des niveaux de relance enregistrés.
**Étapes :**
1. Pour chaque impayé, vérifier le statut affiché → **Attendu :** mapping conforme : dernière relance prioritaire (niveau ≥ 90 → contentieux, ≥ 60 → mise en demeure, ≥ 30 → 2ème relance, ≥ 15 → 1ère relance) ; à défaut, repli sur le retard (≥ 120 contentieux, ≥ 90 mise en demeure, ≥ 60 2ème relance, ≥ 30 1ère relance, sinon « en retard »).
**Cas limites :** Impayé avec relance ancienne mais petit retard → le statut suit la dernière relance, pas le retard.
**Règle métier :** Échelle de relances J+15 / J+30 / J+60 / J+90.

## TC-IMP-011 : Écran Litiges (test de surface — coquille vide)
**Priorité :** P3
**Type :** UI
**Préconditions / jeu de données :** Connecté en démo, copro sélectionnée.
**Étapes :**
1. Menu « Contentieux » > « Litiges » (`/contentieux/litiges`) → **Attendu :** page « Litiges », stats « Litiges actifs » = 0 et « Total litiges » = 0, aucune carte.
2. Cliquer « Nouveau litige » → **Attendu :** AUCUN effet (bouton non câblé). À documenter comme fonctionnalité non implémentée.
**Cas limites :** Aucune donnée n'est jamais affichée (table litiges absente, `MOCK_LITIGES = []`). Ne pas écrire de cas fonctionnel dessus tant que la feature n'existe pas.
**Règle métier :** Sans objet (placeholder).

## TC-IMP-012 : Isolation des impayés par copropriété (RLS)
**Priorité :** P1
**Type :** Intégration / Sécurité
**Préconditions / jeu de données :** Deux copros distinctes ayant chacune des impayés.
**Étapes :**
1. Sélectionner copro A, noter les impayés affichés → **Attendu :** uniquement les impayés de A.
2. Changer pour copro B (depuis `/portefeuille`) → **Attendu :** la liste se recharge avec uniquement les impayés de B (aucune fuite de A).
3. Idem pour la liste des mutations (changer de copro) → **Attendu :** mutations propres à chaque copro.
**Cas limites :** RLS ON+FORCE : aucune ligne d'une autre copro ne doit apparaître, même via rechargement. Compte démo gestionnaire = accès à ses copros uniquement.
**Règle métier :** Cloisonnement multi-copropriété (RLS).

---

## Jeu de données requis (rappel)

| Besoin | Source recommandée |
|--------|--------------------|
| **Ventes / mutations** (lots + propriétaires actifs) | « Résidence Martin » (6 copropriétaires, 7 lots, 3 clés, 1000 tantièmes) — la plus complète. |
| **État daté avec parties non nulles** | Copro disposant d'un grand livre (appels de fonds + paiements), ex. boucle d'or « Le Clos Saint-Michel » (id `22222222…`) ou copro jetable via `create_test_copro_seeded()`. |
| **Impayés réels** | Copro avec appels de fonds dont des échéances sont dépassées et non soldées (vues `v_unpaid_by_lot` / `v_unpaid_with_reminders`). Si « Résidence Martin » n'en a pas, créer des appels avec `due_date` passée, ou utiliser `create_test_copro_seeded()`. |
| **Alerte délai 15 j (TC-VTE-004)** | Mutation avec `requested_at` ancien (J-11 ou plus) sans pré-état → nécessite un seed ciblé. |
| **Isolation RLS (TC-IMP-012)** | Deux copros distinctes : « Résidence Martin » + « Residence Paris Ivry » (ou une copro HARNESS jetable). |
| **Compte** | `lyes.triki@coproflex.fr` / `password123` (bouton « Connexion démo »), profil gestionnaire « Jean Dupont ». |

### Limites connues à garder en tête pendant l'exécution
- **Relance / règlement d'impayé = simulation d'écran** : l'avancement et le passage « réglé » ne survivent pas à un F5 et n'écrivent rien en base (`payment_reminders` / grand livre intacts). Le hook réel `useImpayesMutations` n'est pas branché. C'est le défaut central de ce domaine — à reporter comme bug/feature non finie.
- **Litiges** : non implémenté (coquille vide), aucune table.
- **Validation de mutation** : transfert lot-centric sur `lot_owners`, jamais d'écriture au grand livre ; l'avertissement de solde vendeur ne bloque pas.
- **Écrans morts** (`/sales`, `/ventes-impayes` hub, `/ventes-impayes/ventes/nouvelle`) : à ne pas confondre avec le parcours canonique pendant les tests.
