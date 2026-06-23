# CARTOGRAPHIE REFONTE - DETAIL PAR CATEGORIE (2026-06-22)

> Dump fidele des agents de cartographie (rejeu 2026-06-22). Complement de REFONTE_CARTOGRAPHIE_2026-06-22.md. 15 categories.

## Onboarding / Reprise de mandat

### Ecrans
- **Onboarding — liste (copros en cours)** (`/onboarding`) - Liste des copropriétés non finalisées (onboarding_step != null) sous forme de cartes : nom, adresse, barre de progression (étape N/8 + %), date de création. Actions : Reprendre, Supprimer. CTA « Nouvelle copropriété ». src/app/(gestionnaire)/onboarding/page.tsx
- **Onboarding — création (étape 1)** (`/onboarding/create`) - Étape 1 hors-wizard : formulaire de création de la copropriété (Step1Copropriete). Crée la copro via RPC create_copro puis redirige vers /onboarding/{id}. src/app/(gestionnaire)/onboarding/create/page.tsx
- **Onboarding — wizard (étapes 2 à 8)** (`/onboarding/[id]`) - Assistant multi-étapes monté en continu (toutes les steps atteintes restent en DOM, masquées par display:none). Pilote la navigation, résout budgetId/periodId, redirige vers /portefeuille à la fin. src/app/(gestionnaire)/onboarding/[id]/page.tsx
- **Onboarding — redirect déprécié** (`/onboarding/new`) - Redirige (redirect server) vers /onboarding/create. Route legacy conservée. src/app/(gestionnaire)/onboarding/new/page.tsx
- **Portefeuille (point d'entrée reprise hors wizard)** (`/portefeuille`) - Affiche des cartes d'alerte « Reprise à terminer » (RepriseAlertCard) quand le net 471/472 d'une copro != 0, et ouvre la RepriseAlertModal pour compléter la reprise sans repasser par le wizard. src/app/(gestionnaire)/portefeuille/page.tsx

### Actions cles
- Créer une copropriété (RPC create_copro : copro + membership gestionnaire + plan comptable canonique en une transaction SECURITY DEFINER) — nom, adresse (autocomplete Google Maps), CP, ville, mois de début d'exercice, année de construction, nom du syndic sortant (previous_syndic_name = marqueur reprise de mandat)
- Lister / reprendre / supprimer un onboarding (RPC delete_onboarding_copro : purge FK-safe des enfants RESTRICT, refuse si compta live)
- Persister la progression : onboarding_step + onboarding_max_step sur copros ; finalisation = remise des deux à NULL (completeOnboarding)
- Étape 2 — ajouter/supprimer des copropriétaires (mapping communication_preference -> prefers_email/prefers_paper)
- Étape 3 — gérer bâtiments, lots, clés de répartition et tantièmes ; auto-création de la clé « Charges générales » (category=general) si absente ; auto-amorçage d'1 lot par copropriétaire si 0 lot
- Étape 4 — saisir les comptes bancaires : 2 modes (connexion Open Banking GoCardless via /api/banking/* OU saisie manuelle), crée 512000 (courant) et 512100 (fonds travaux ALUR) avec initial_balance
- Étape 5 — composer le budget prévisionnel (postes prédéfinis + personnalisés, clé par ligne) ; createOnboardingBudget mappe chaque poste vers un compte de charge 6xx (défaut 628 + avertissement), idempotent par (copro, période, type current)
- Étape 6 — configurer l'échéancier d'appels (annuel/semestriel/trimestriel + nb d'appels déjà émis + date AG), preview éditable des dates, POSTE les appels via post_budget_call_for_funds (idempotent par trimestre, valide la complétude des clés avant)
- Étape 7 — reprise des soldes d'ouverture : banques, réserve ALUR (105), fournisseurs (401), reports courant (478) / travaux (12), soldes par lot (450-1/450-2/450-5 + avance 103), comptes 1-5/6xx/7xx, toggle reprise en cours d'année + date ; postage via set_opening_balance (DELETE+repost total, résidu sur 471/472)
- Étape 8 — finalisation : audit_finance_integrity (liste blanche bloquante) + preuve positive d'appel émis ; bloque si faute structurelle ou budget validé sans appel ; résidu 471/472 = avertissement non bloquant ; termine et route vers /portefeuille
- Reprise hors wizard depuis le portefeuille : RepriseAlertCard -> RepriseAlertModal (résolution SEULE de la période, jamais de création parasite)
- Garde AG (réutilisée en étape PV) : bloquer l'arrêté des comptes APPROVE_ACCOUNTS si net 471/472 != 0 (checkAgWaitingBalanceGuard / shouldBlockAccountClosure, fail-closed via resolveCoproIdForAg)

### Formulaires & modales
- Step1Copropriete : formulaire de création (nom, recherche d'adresse Google Maps + suggestions, CP, ville, mois d'exercice select 1-12, année construction, syndic sortant) — validation locale (Record<string,string>)
- Step2Coproprietaires : formulaire d'ajout rapide en ligne (nom*/prénom/email/téléphone, Enter pour ajouter) + tableau avec suppression
- Step3LotsKeys : BuildingsManager + CreateLotModal / EditLotModal / CreateKeyModal / EditKeyModal (importés de @/components/features/lots) + LotsRepartitionGrid
- Step4Comptes : sélecteur de mode (Connecter ma banque / Saisie manuelle), picker d'institution (recherche), 2 cartes manuelles (courant + fonds ALUR : banque/IBAN/BIC/solde), sélecteurs d'affectation des comptes connectés + AccountPreview
- Step5Budget : liste de cartes-postes (libellé, montant €/an, select de clé), dropdown d'ajout (postes prédéfinis colorés + poste personnalisé), bandeau « Passer cette étape », bandeau d'avertissement 628
- Step6AgAppels : 2 phases — config (pills fréquence, pills nb d'appels déjà émis, date AG) puis preview (table éditable des dates émission/échéance + montant + total)
- RepriseSoldes (étape 7) : BalanceEntreeForm (sections Essentiel / Autres comptes repliable / reprise en cours d'année avec date + charges 6xx/produits 7xx) + SoldesParLotTable (colonnes 450-1/450-2/450-5/103 par lot) + EquilibreIndicator (résidu 471/472)
- Step8Finalisation : panneau d'audit (issues bloquantes / avertissements / résidu 471/472 + lien « Compléter maintenant ») + bouton Vérifier et terminer
- RepriseAlertModal (portefeuille) : overlay modal qui réutilise RepriseSoldes hors wizard
- window.confirm() natif pour la suppression d'un onboarding (pas de modal custom)
- Orphelins (jamais montés dans le wizard) : StepContracts, StepDocuments, StepCarnetEntretien — formulaires complets avec signature onClose

### Backend touche
- RPC create_copro (migration 0083, SECURITY DEFINER : copro + membership + provision_copro_chart)
- RPC delete_onboarding_copro (migration 0084, purge FK-safe)
- RPC post_budget_call_for_funds (postage des appels d'onboarding)
- RPC repartition_key_is_complete (pré-validation des clés avant postage des appels)
- RPC set_opening_balance / get_opening_balance (moteur canonique de reprise, migration 0027 ; signe débit+/crédit-, account_code)
- RPC create_ledger_transaction (utilisée par le writer LEGACY postOnboardingOpeningBalances, source_type opening_balance)
- RPC resolve_lot_tiers_account (résolution sous-comptes 450-x par nature — utilisée par le writer legacy)
- RPC audit_finance_integrity (migration 0028 : issues LEDGER_UNBALANCED, LOT_ID_MISSING_45X, LOT_GL_MISMATCH, CALL_*_MISMATCH)
- Tables : copros (onboarding_step, onboarding_max_step, exercice_debut, previous_syndic_name, annee_construction, siret), coproprietaires (prefers_email/prefers_paper, address_line1…), accounts (codes 512000/512100, initial_balance, is_postable, charge_nature), accounting_periods (status open, uq_period_copro_name), budgets (budget_type current, status draft/validated, version), budget_lines, call_for_funds (trimester, status), ledger_transactions (source_type, posted_at), ledger_entries, repartition_keys, repartition_key_lines, buildings, lots, ag_meetings, ag_pending_actions (action_type APPROVE_ACCOUNTS)
- Vue v_lots_with_owners (liste des lots avec propriétaire pour la reprise)
- Edge / API routes Next : /api/banking/institutions, /api/banking/connect, /api/banking/accounts, /api/banking/callback (GoCardless Open Banking, via useBankConnect)
- Google Maps Places (useGoogleMapsAutocomplete) pour l'adresse en étape 1
- sessionStorage (coproflex_active_copro_id via setActiveCopro ; bank_requisition_id pour le retour bancaire)

### Issues connues
- Code mort : StepContracts.tsx, StepDocuments.tsx, StepCarnetEntretien.tsx (+ leurs .module.css) ne sont importés nulle part — orphelins avec signature onClose, jamais montés dans le wizard 8 étapes (qui passe 6 -> reprise(7) -> finalisation(8)). Confirme l'écart titre/réalité : aucune étape Documents/Contrats/Carnet.
- Writer dupliqué/mort : src/lib/onboarding/api.ts:720 postOnboardingOpeningBalances (source_type='opening_balance', via create_ledger_transaction + resolve_lot_tiers_account) n'est appelé par aucun composant — superseded par le moteur set_opening_balance (setOnboardingOpeningBalance). Deux modèles de reprise coexistent en code (dette de migration).
- Incohérence de source_type : les chemins de LECTURE (reprise-alert.ts getRepriseResidual + api.ts readOnboardingPeriod) filtrent sur source_type='opening_onboarding', alors que le writer legacy écrit 'opening_balance' et l'audit (api.ts:735) lit 'opening_balance'. À auditer : le RPC set_opening_balance écrit-il bien 'opening_onboarding' ? Sinon l'alerte portefeuille et la résolution de période ne verraient jamais la reprise réelle.
- Erreurs avalées en Step4Comptes : handleSaveManual / handleSaveConnected ignorent totalement le retour de createCompteBancaire (pas de try/catch, pas d'état d'erreur) — un échec d'insertion banque passe inaperçu et on avance quand même (onComplete). Viole la règle « jamais de refus silencieux ».
- Erreur avalée en Step2Coproprietaires : handleDelete n'agit que sur success, ne lit pas error (suppression échouée = aucune remontée), alors que handleAdd/load gèrent l'erreur explicitement — incohérence dans le même fichier.
- Step4 : solde_initial est stocké sur accounts.initial_balance mais NE génère aucune écriture d'ouverture (le vrai solde banque est ressaisi en étape 7 via 512x). Risque de double saisie / d'incohérence si l'utilisateur croit que le solde de l'étape 4 alimente le grand livre.
- useBankConnect.ts:160 retourne isConfigured: true en dur (commentaire « sera false si pas de clés API » non implémenté) ; requisitionId/fetchAccounts exposés mais non consommés par Step4.
- Step5Budget handleSave utilise new Date().getFullYear() pour nommer le budget (« Budget prévisionnel {année civile} ») alors que la période est dérivée de exercice_debit — nom potentiellement faux pour un exercice décalé ou un onboarding à cheval sur l'année.
- Step5Budget : handleSkip est défini mais le seul déclencheur réel de skip est le bandeau (onComplete(null)); la logique « 0 ligne valide -> onComplete(null) » court-circuite aussi silencieusement.
- Conventions : layout.tsx onboarding utilise style inline (interdit par conventions.md) ; le wizard [id]/page.tsx et Step6 utilisent abondamment style={{display:...}} et style inline de table (pragmatique keep-mounted, mais hors design-system).
- useOnboarding initialise currentStep/maxStepReached à 2 en dur ; si getOnboardingState échoue (erreur non affichée), on reste bloqué à l'étape 2 sans message.
- Mock legacy non relié : src/lib/mock-data/entities/mandats.ts modélise des mandats AG (procurations), aucun rapport avec la « reprise de mandat » d'onboarding — homonymie trompeuse, pas le modèle du mandat syndic.
- Concurrence StrictMode : plusieurs effets de seed (Step3 clé générale + lots) et de période s'appuient sur des gardes useRef/idempotence ; fragiles aux re-montages mais documentés.
- Type safety : api.ts contourne les types générés via createUntypedClient (cast as unknown as SupabaseClient) sur tout le domaine — pas de any direct mais perte de vérification de schéma (tables/vues hors types).

### Besoins refonte (manager-first)
- Aligner sur le parcours réel de reprise de mandat d'un syndic : un syndic entrant récupère un dossier complet (RC, ETDD, dernière balance, PV de la dernière AG, contrats en cours, carnet d'entretien, diagnostics, sinistres). La refonte devrait soit câbler réellement les étapes Documents / Contrats / Carnet d'entretien (qui existent déjà en code orphelin) soit les retirer, mais le métier les attend dans une reprise propre.
- Distinguer explicitement deux chemins (déjà cadrés dans les notes projet) : copropriété NEUVE (création) vs REPRISE DE MANDAT (mi-exercice, soldes hérités) — l'UI mélange les deux ; un sélecteur en tête de wizard adapterait les étapes (la reprise active la saisie de soldes + charges/produits déjà courus, le neuf la masque).
- Manager-first : tableau de bord d'avancement par copro reprise avec checklist des pièces légales obligatoires (assurance MRI, RC, état daté du syndic sortant, fonds ALUR transféré) et alertes de conformité, plutôt qu'une simple barre de progression.
- Reprise des soldes : ergonomie experte — import de balance (CSV/copier-coller) du syndic sortant, rapprochement guidé banque vs grand livre, ventilation assistée des reports 12/478 et de la réserve ALUR, et surtout aide au solde du résidu 471/472 (proposer les écarts probables) au lieu de laisser un avertissement passif.
- Unifier le modèle de reprise (supprimer le writer postOnboardingOpeningBalances dupliqué, un seul source_type, un seul moteur) pour éliminer la dette EN-double et fiabiliser l'alerte « reprise à terminer ».
- Cohérence comptable étape 4/7 : soit l'étape 4 alimente directement l'ouverture banque (512x), soit elle ne capte que l'IBAN/BIC et la saisie du solde n'apparaît qu'en reprise — éviter la double saisie du solde.
- Gestion d'erreurs systématique : chaque écriture (banque, copropriétaire, budget, appels) doit remonter une erreur visible et idempotente (Step4 et Step2 delete actuellement muets).
- Mandat syndic comme entité de premier rang : modéliser le mandat (durée, honoraires, date d'effet, syndic sortant/entrant, AG de désignation) — aujourd'hui réduit à un champ texte previous_syndic_name ; un expert syndic attend une vraie fiche mandat reliée au contrat de syndic.
- Reprise des appels déjà émis : aujourd'hui on déclare seulement « N appels déjà émis » sans les recréer ni reprendre les encaissements partiels associés — un syndic entrant a besoin de reprendre l'état réel des appels et paiements en cours.
- Validation par formulaire normalisée (Zod + RHF, infra déjà existante dans le repo) au lieu des Record<string,string> et validations ad hoc disséminées.

### Questions ouvertes
- Quel est le source_type réellement écrit par le RPC set_opening_balance ? ('opening_onboarding' attendu par les lectures vs 'opening_balance' du writer legacy/audit) — décision bloquante pour fiabiliser l'alerte de reprise et la résolution de période.
- Faut-il conserver, câbler ou supprimer les étapes orphelines Documents / Contrats / Carnet d'entretien dans le parcours de reprise ? (impacte le nombre d'étapes : 8 affichées mais 7 réelles + 1 hors-wizard)
- La reprise des appels déjà émis et des paiements partiels du syndic sortant doit-elle être reconstituée écriture par écriture, ou seulement résumée en solde par lot (modèle actuel) ?
- Le solde bancaire de l'étape 4 (accounts.initial_balance) doit-il devenir une vraie écriture d'ouverture, ou rester une simple métadonnée saisie à nouveau en étape 7 ?
- Modélise-t-on enfin le mandat syndic comme entité (durée, honoraires, AG de désignation), ou reste-t-il un champ texte previous_syndic_name ?
- Faut-il un point d'entrée explicite « Reprise de mandat » distinct de « Nouvelle copropriété » dès le portefeuille, avec checklist des pièces légales obligatoires ?
- Politique de finalisation : on autorise aujourd'hui à terminer avec un résidu 471/472 non soldé (non bloquant) — est-ce acceptable pour un vrai syndic, ou faut-il un statut « reprise provisoire » jusqu'à apurement ?
- La connexion bancaire GoCardless est-elle dans le périmètre de la reprise (clés API à provisionner), ou la saisie manuelle reste-t-elle le chemin nominal pour la V1 ?
- Comment gérer une reprise sur exercice décalé / à cheval sur l'année civile dans le nommage et le bornage des budgets et appels (incohérences getFullYear constatées) ?

## Copropriétaires & Lots (clés de répartition, tantièmes)

### Ecrans
- **Annuaire copropriétaires** (`/coproprietaires`) - Liste/annuaire des copropriétaires avec KPI (nombre, solde global, impayés, à jour), onglets Copropriétaires/Locataires/Anciens, recherche, création/édition/archivage via modale et menu contextuel.
- **Lots & Répartition (grille)** (`/coproprietaires/lots`) - Grille matricielle lots x clés : une colonne TANTIÈMES éditable (clé générale) + une colonne par clé spéciale, édition inline des poids au blur, KPI (lots, tantièmes généraux, clés spéciales), création/édition de lots et de clés, affectation propriétaire.
- **Détail d'un lot** (`/coproprietaires/lots/[id]`) - Fiche lot lecture seule : propriétaire, emprunts collectifs (collective_loan_shares), avances & fonds (treasury_advances dont fonds travaux ALUR), tableau des tantièmes/clés avec barre de part. Pas d'édition ici (retour vers la grille).
- **Redirection répartition** (`/coproprietaires/repartition`) - Page vide : redirect serveur immédiat vers /coproprietaires/lots (alias historique).
- **Clés de répartition (liste)** (`/finance/cles-repartition`) - Cartes des clés avec stats (configurées/valides/avec alertes), badge de validation, simulation de répartition d'un montant, accès édition, suppression (soft delete) réservée au gestionnaire.
- **Nouvelle clé** (`/finance/cles-repartition/new`) - Création d'une clé (nom, code, type Générale/Personnalisée, description) + saisie des tantièmes par lot avec aides de remplissage (égal 10000, selon type de lot, tout effacer) et panneau résumé/validité.
- **Détail/édition d'une clé** (`/finance/cles-repartition/[id]`) - Édition métadonnées clé + poids par lot, carte de validation, carte de simulation intégrée. Sauvegarde par diff des lignes (ajout/suppression/maj).
- **Tantièmes (référentiel)** (`/finance/tantiemes`) - Vue pédagogique des tantièmes : info légale, stats (total tantièmes, lots, copros), tableau tantièmes par lot (édition inline ref+tantièmes), tableau agrégé par copropriétaire, exemple de calcul de vote.

### Actions cles
- Lister/filtrer copropriétaires par onglet (Copropriétaire/Locataire/Ancien) et recherche texte (nom, email, téléphone)
- Créer un copropriétaire (nom, prénom, fonction*, téléphone, email) - *fonction non persistée
- Modifier un copropriétaire (mêmes champs)
- Archiver un copropriétaire (soft delete: pose end_date sur tous les lot_owners actifs -> passe en ANCIEN)
- Créer un lot (réf, type, étage, surface, bâtiment, tantièmes généraux, propriétaire)
- Modifier un lot (mêmes champs) ; supprimer un lot (hard delete, confirm)
- Éditer inline le tantième général d'un lot dans la grille (au blur) ; édition inline ref+tantièmes dans /finance/tantiemes
- Affecter/changer le propriétaire d'un lot (clôture l'ownership actif + crée le nouveau à 100%)
- Créer une clé de répartition (nom, base tantiemes/surface/custom, portée all_lots/subset, description, category=special)
- Modifier une clé (nom, base, portée, description) ; supprimer une clé (soft delete = is_active=false)
- Éditer inline le poids d'un lot sur une clé dans la grille (poids 0 = suppression de la ligne)
- Auto-initialiser les lignes de clé à la création (all_lots) et auto-créer les lignes pour un nouveau lot sur les clés all_lots
- Simuler la répartition d'un montant selon une clé (montant -> répartition par lot/copro, %, euros)
- Valider une clé (total vs total_tantiemes copro, lots sans poids, total=0) - calcul côté client
- Consulter la fiche lot : emprunts collectifs, avances/fonds ALUR, tantièmes par clé
- Agréger les tantièmes par copropriétaire (somme de ses lots) pour vue d'ensemble et exemple de vote

### Formulaires & modales
- CoproprietaireEditModal - création/édition copropriétaire (nom*, prénom, fonction, téléphone formaté, email*)
- Menu contextuel copropriétaire (Modifier / Archiver) positionné dynamiquement
- CreateLotModal - nouveau lot (réf*, type, étage, surface, bâtiment si fournis, tantièmes*, propriétaire)
- EditLotModal - édition lot + bouton Supprimer (window.confirm) ; styles inline danger
- CreateKeyModal - nouvelle clé (nom*, portée, base, description)
- EditKeyModal - édition clé + encart lots couverts/total/alerte + bouton Supprimer (window.confirm) ; styles inline
- Modale de confirmation suppression de clé sur /finance/cles-repartition (page-level)
- SimulationModal - calcul et tableau de répartition d'un montant pour une clé (lots, %, montants)
- Édition inline (sans modale) dans la grille /lots et dans /finance/tantiemes (inputs au blur / boutons check/cancel)
- BuildingsManager - bloc gestion bâtiments (réutilisé onboarding + settings, PAS sur les pages de ce domaine)

### Backend touche
- Tables: lots, repartition_keys, repartition_key_lines, lot_owners, coproprietaires, copros, buildings, collective_loans, collective_loan_shares, treasury_advances
- Vues: v_coproprietaires_overview (display_name, solde, owner_type, council_role, lots_count, total_tantiemes), v_lots_with_owners, v_repartition_key_totals, v_repartition_key_lines_detailed
- Aucune RPC: tout passe par accès table/vue direct via client Supabase non typé (createClient() as any)
- Écritures lots: insert/update/delete sur lots ; tantième général écrit comme ligne de la clé category=general (upsert onConflict key_id,lot_id)
- Écritures clés: insert/update repartition_keys (soft delete is_active=false), insert/upsert/delete repartition_key_lines, purge des lignes weight=0 au passage en subset
- Affectation propriétaire: lot_owners (update end_date des actifs, insert share_percent=100/is_primary=true)
- Archivage copro: lot_owners.end_date sur toutes les lignes actives du copropriétaire
- Colonnes lots dérivées: tantiemes_generaux/ascenseur/chauffage/escalier ne sont PAS des colonnes de lots, ils proviennent des lignes de clé / de la vue

### Issues connues
- BUG hooks: useClesRepartitionPage.ts (l.52) et useCleDetailPage.ts (l.66,76) utilisent useState(()=>{...}) comme un effet. Le callback ne s'exécute qu'une fois au montage avec key/lines encore vides (chargés en async) -> validations jamais chargées au 1er rendu et formulaire de détail clé jamais initialisé depuis la clé chargée (champs nom/code/type/desc restent vides; fallback via nom||key?.name masque partiellement le bug).
- DEAD CODE: composants LotTable.tsx et RepartitionKeyCard.tsx exportés dans components/features/lots/index.ts mais jamais rendus (aucun <LotTable>/<RepartitionKeyCard>).
- CHAMP MORT: 'Fonction' (council_role) éditable dans CoproprietaireEditModal mais mapToUpdate/mapToCreate (useCoproprietairesPage.ts l.62-79) n'envoient pas la fonction -> saisie silencieusement ignorée; le rôle CS n'est pas modifiable depuis ce domaine.
- CHAMP MORT: 'Code' de clé saisi dans new/page.tsx et useCleDetailPage (setCode) mais jamais persisté (RepartitionKeyCreate n'a pas de champ code). Le code affiché est juste key_id.slice(0,8).
- ERREURS AVALÉES: useLotDetailPage.ts (catch {} silencieux l.120), SimulationModal/useNewClePage catch génériques; createLot avale l'erreur d'insert des lignes de clé (await sans check l.267). v_lots_with_owners 'peut retourner des doublons' -> déduplication manuelle (owners/api l.134) = symptôme d'une vue non distincte.
- UX REGRESSION: handleSave (copro) et handleDelete utilisent alert()/confirm() natifs au lieu des modales du design-system; styles inline (EditLotModal l.153/157, EditKeyModal l.107-142, LotDetailMain l.27/39) interdits par design-system.md.
- ONGLET FANTÔME: onglet 'Locataires' toujours visible mais renvoie systématiquement une liste vide ('disponible prochainement'); pas de modèle locataire en base.
- INDIVISION NON GÉRÉE: assignOwnerToLot force share_percent=100/is_primary=true et clôt TOUS les ownerships -> 1 lot = 1 seul propriétaire, alors que lot_owners supporte is_primary + share_percent (multi-propriétaires en base).
- INCOHÉRENCE 'irréversible': EditLotModal annonce suppression irréversible (hard delete réel), mais clé = soft delete (is_active=false) tout en disant aussi 'irréversible' -> message trompeur.
- DOUBLON DE TYPE: interface LotWithOwner définie deux fois (lib/lots/api.ts complète et lib/owners/api.ts partielle) + listLotsWithOwners dupliquée dans les deux fichiers.
- VALIDATION FAIBLE: fillFromExisting('surface') applique des poids forfaitaires par type de lot (appartement=100, etc.) sans rapport avec la vraie surface; libellé 'Selon type de lot' trompeur. La validation de clé est purement cliente (pas de garde serveur sur somme des tantièmes).
- DRIFT POTENTIEL: tout l'accès se fait en client 'as any' (types Supabase non régénérés pour ces vues) -> aucune sécurité de type, risque de drift silencieux colonne/vue.

### Besoins refonte (manager-first)
- Fiche copropriétaire complète et dédiée (route /coproprietaires/[id]) : coordonnées complètes (adresse, civilité, société), lots détenus, solde et historique compte, préférences de communication (prefers_email/paper déjà en base mais non éditables ici), rôle conseil syndical éditable, documents liés.
- Gérer l'indivision et la multipropriété : plusieurs propriétaires par lot avec quote-parts (share_percent) et propriétaire principal (is_primary), usufruit/nue-propriété, mandataire commun - exigence réelle syndic.
- Séparer clairement copropriétaire (personne) et lot (unité de gestion) tout en respectant la règle lot-centric : appels/créances par lot, solde dérivé par personne; aujourd'hui la table mélange annuaire et solde dérivé.
- Historique des mutations de propriété (date d'acquisition, prix, état daté) au lieu d'un simple end_date qui efface l'historique; rattacher au module ventes.
- Tableau des tantièmes/clés unifié et professionnel : vérification automatique somme=total copropriété par clé, alerte si une clé spéciale ne couvre pas les bons lots, contrôle de cohérence inter-clés, verrouillage après AG.
- Saisie de clés par bâtiment/escalier/cage réellement structurée (rattachement lot->bâtiment exploité), import en masse (Excel/CSV) du tableau de répartition à l'onboarding.
- Réintégrer un vrai gestionnaire de bâtiments dans ce domaine (BuildingsManager existe mais n'est utilisé qu'en onboarding/settings) pour rattacher les lots.
- Vue 'manager-first' : faire ressortir impayés, lots sans propriétaire, clés incomplètes/invalides, copropriétaires sans email, mandats CS expirants - alertes actionnables plutôt que tableaux bruts.
- Locataires : soit implémenter le modèle (avec leur propre vue), soit retirer l'onglet fantôme.
- Espaces copropriétaire/conseil syndical : portail copropriétaire (lecture de ses lots/tantièmes/solde) et vue CS - cohérent avec la direction de refonte.
- Remplacer alert()/confirm()/styles inline par le design-system (modales, toasts, CSS Modules) et régénérer les types Supabase pour supprimer les 'as any'.

### Questions ouvertes
- Modèle d'indivision : quote-part par millième ou pourcentage ? Comment ventiler les appels et le vote entre indivisaires (mandataire unique obligatoire) ?
- Le tantième général doit-il rester stocké comme une ligne de la clé 'general' (modèle actuel) ou redevenir une colonne de lots ? Source unique à trancher pour éviter le double stockage vue/ligne.
- Clé de répartition : faut-il un vrai champ 'code' persistant et unique, ou supprimer ce champ mort de l'UI ?
- Validation des tantièmes : doit-elle devenir une garde serveur (contrainte/trigger sur somme par clé = total copropriété) plutôt qu'une simple alerte cliente ?
- Suppression de lot : faut-il interdire (ou contre-passer) si le lot porte des écritures/appels, comme pour le grand livre ? Aujourd'hui hard delete sans garde métier visible.
- Mutation de propriété : modéliser un cycle complet (acte, date, état daté, fonds ALUR acquis au fonds) lié aux ventes, ou garder le simple end_date ?
- Locataires : dans le périmètre syndic (gestion locative ?) ou hors périmètre -> décider d'implémenter ou de retirer l'onglet.
- Édition du rôle conseil syndical : se fait-elle ici (fiche copro) ou exclusivement dans le module AG/Conseil syndical ? Aligner pour éviter le champ 'fonction' mort.
- Faut-il figer/verrouiller le tableau de répartition après approbation en AG (immutabilité) et tracer les versions de clés par exercice ?

## Finance — Appels de fonds (budget / hors-budget / exceptionnel / ALUR)

### Ecrans
- **Appels de fonds (liste/dashboard)** (`/finance/appels-fonds`) - Vue d'ensemble par exercice comptable des appels de fonds. Sélecteur d'exercice, bande KPI (Total appelé / encaissé / impayés / taux recouvrement), 3 onglets : Vue globale (accordéon Courant/Travaux), Budget courant (cartes trimestrielles), Travaux (cartes par chantier + échéancier). Bouton 'Générer les appels' DÉSACTIVÉ + bouton Export non implémenté.
- **Détail d'un appel de fonds** (`/finance/appels-fonds/[callId]`) - Détail d'un appel : en-tête (libellé, échéance, clés), StatsGrid (appelé/encaissé/restant/copros payés), tableau des lots (1 ligne/lot, total agrégé + ventilation par clé dépliable), actions par lot (Relancer), modales Paiement et Relance. Boutons 'Avis PDF' et 'Envoyer' présents mais no-op.
- **Opérations à apurer** (`/finance/operations-a-apurer`) - Liste des soldes travaux (compte 12) reportés d'exercice en exercice, en attente d'affectation aux copropriétaires (450-2). KPI (nb opérations, solde total, plus ancien report), table par exercice avec sens (à appeler/à rembourser), bouton 'Affecter aux copropriétaires' ouvrant ApurerModal (settle_works_balance).

### Actions cles
- Sélectionner l'exercice comptable (dropdown) pour filtrer tous les appels affichés
- Basculer entre onglets Vue globale / Budget courant / Travaux
- Déplier les catégories (Budget Courant / Budget Travaux) et groupes (trimestriels / exceptionnels / ponctuels) en accordéon
- Naviguer vers le détail d'un appel (clic carte trimestre, carte travaux 'Détail', échéance travaux)
- Émettre un appel en brouillon (TrimesterCard bouton 'Émettre' → updateCallStatus 'issued') — handler onEmit NON câblé depuis la page (prop jamais passée)
- Créer un appel manuel via wizard 4 étapes (Type → Montant → Échéancier → Récap) : DÉSACTIVÉ sur la page (bouton disabled), mais le wizard est entièrement codé et appelle createCall→post_budget_call_for_funds
- Enregistrer un paiement sur un lot (PaymentModal → record_payment edge → post_owner_payment) avec choix nature (courant/travaux/ALUR), idempotence, gestion trop-perçu en avance 450-3
- Relancer un copropriétaire impayé (RelanceModal : 4 phases amiable/formelle/mise en demeure/contentieux, génération courrier, createManualReminder)
- Annuler un appel (useAppelsFondsActions.cancelCall : brouillon=bascule statut, émis=cancel_call_for_funds contre-passation) — codé mais NON câblé à un bouton UI
- Affecter le solde travaux 12 aux copropriétaires à la clôture (settle_works_balance)
- Rafraîchir la liste des opérations à apurer
- Générer/imprimer un avis d'appel HTML par copropriétaire (service avis-appel-export entièrement codé mais NON câblé)
- Export global des appels (bouton présent, handler vide)

### Formulaires & modales
- CreateCallWizard (modale 4 étapes) : StepType (type exceptionnel/travaux + budget rattaché + libellé + description), StepAmount (montant total + clé de répartition + preview ventilation), StepSchedule (paiement unique ou échéancier 2/3/4 avec dates croissantes + somme), StepRecap (récap + tableau ventilation par lot). Confirmation de fermeture si données saisies. ACTUELLEMENT INACCESSIBLE (bouton déclencheur disabled).
- PaymentModal : sélection lot, montant (pré-rempli avec restant dû), date, mode de paiement (virement/SEPA/chèque/carte/espèces/autre), référence, nature d'imputation optionnelle, hints avance 450-3 et trop-perçu. Validation Zod (paymentSchema) + RHF. Idempotency key par ouverture.
- RelanceModal : stepper 4 phases (RelanceStepper) + aperçu/édition du courrier (RelancePreview) avec choix de canal (email/courrier/both), envoi (createManualReminder). État 'toutes phases envoyées → contentieux'.
- ApurerModal (opérations à apurer) : récap exercice, solde 12, écriture comptable affichée (C12/D450-2 ou D12/C450-2), avertissement 'définitif', confirmation settle_works_balance.
- Confirmation de fermeture du wizard (sous-dialogue 'Annuler la création ?').

### Backend touche
- RPC post_budget_call_for_funds (createCall — route canonique, dérive le montant du budget voté ; ancien post_call_for_funds INEXISTANT)
- RPC cancel_call_for_funds (annulation appel posté avec contre-passation)
- RPC reverse_ledger_transaction (contre-passation écriture, via reverseLedgerTransaction)
- RPC settle_works_balance (apurement solde travaux 12 → 450-2)
- Edge function record_payment (forward vers RPC post_owner_payment ; imputation FIFO, trop-perçu→450-3, idempotence)
- Vue v_calls_overview (listCalls / getCallById / getCallsForTrimester)
- Vue v_call_lines_detailed (getCallLines / getCombinedCallLines)
- Vue v_call_campaigns (listCallCampaigns)
- Vue v_unpaid_by_lot (listUnpaid, comptage impayés)
- Vue v_lot_advance_balance (listLotAdvances / getLotAdvanceBalance, avances 450-3)
- Vue v_works_pending_settlement (listWorksPendingSettlement)
- Vue v_payment_reminders_overview (listPaymentReminders, niveaux de relance)
- Table call_for_funds (updateCallStatus : status + issued_at en écriture directe, hors RPC)
- Table payment_reminders (createManualReminder : insert direct)
- Tables/API connexes : accounting_periods (listAccountingPeriods), repartition_keys + lignes (lib/lots/api pour le wizard), budgets (lib/budget/api.listBudgets pour wizardBudgets)
- Comptes du grand livre impliqués : 450-1/450-2/450-3, 701/702/705, 105 (ALUR), 12 (résultat travaux), 512

### Issues connues
- Création manuelle d'appel entièrement codée mais DÉSACTIVÉE : page.tsx ligne 108-115 bouton disabled ; l'appel exceptionnel attend post_exceptional_call_for_funds non livré. Le wizard, useCreateCallWizard, StepType/Amount/Schedule/Recap sont donc du code complet inaccessible (Co-Pro-Flex/src/app/(dashboard)/finance/appels-fonds/page.tsx, components/CreateCallWizard/*)
- Boutons morts page détail : 'Avis PDF' (handleGeneratePdf TODO Task 16) et 'Envoyer' (handleSend TODO Task 17) sont des no-op ; handleRemind est aussi un no-op vide (Co-Pro-Flex/src/app/(dashboard)/finance/appels-fonds/[callId]/page.tsx:83-86)
- Service avis-appel-export.service.ts (génération HTML/print/PDF + export groupé) ENTIÈREMENT CODÉ mais JAMAIS importé/appelé (seulement réexporté par services/index.ts) → code mort tant que 'Avis PDF' n'est pas câblé
- Bug données : createManualReminder (api.ts:1602) accepte un champ 'channel' dans son payload mais ne l'insère PAS dans payment_reminders → le canal de relance choisi (email/courrier) est perdu en base
- RelanceModal reçoit coproName='Copropriete' et syndicName='Le Syndic' en DUR depuis la page détail ([callId]/page.tsx:106-107) → les courriers de relance générés contiennent des placeholders au lieu des vrais noms
- useRelance.ts:133 recipient_email forcé à null avec TODO 'charger depuis coproprietaire' → relances email sans destinataire réel
- Boutons 'Avis', 'Relancer', 'Envoyer' dans TrimesterCard et TravauxCard sont des no-op (onClick vide ou stopPropagation seul) — TrimesterCard.tsx:85,92 ; TravauxCard.tsx:64,74,76
- onEmit jamais propagé : TabBudgetCourant/TabTravaux/TrimesterCard acceptent onEmit mais la page ne le passe jamais → bouton 'Émettre' d'un brouillon inopérant. De même onViewImpayes de AlertBanner jamais fourni
- cancelCall (useAppelsFondsActions) et emitCall codés mais le hook useAppelsFondsActions n'est importé NULLE PART (grep) → toute la logique d'émission/annulation est orpheline
- Composants exportés mais NON consommés (code mort) : AppelsFondsHeader, AppelsFondsKpiStrip, TabListe (la page utilise FinanceTopBar/FinanceKpiStrip de components/layout à la place)
- Doublon de hooks déprécié : src/shared/hooks/useFinance.ts expose useAppelsFonds/useCreateAppelFonds/usePaiements... tous @deprecated renvoyant des stubs vides (no-op) — dette EN/FR-legacy non supprimée
- Catégorisation courant/travaux fragile : split basé sur l'appartenance budget_id à des Set chargés via useBudgetData(periodYear) ; un appel sans budget_id ou budget inconnu retombe en 'courant' par défaut (useAppelsFondsPage.ts:119-130) → risque de mauvais rangement
- wizardBudgets recharge TOUS les budgets travaux via import dynamique de @/lib/budget/api dans un useEffect avec catch silencieux vide (useAppelsFondsPage.ts:245-252) → erreurs avalées
- Le libellé AlertBanner est codé en dur 'sur T1 + T2 — Relance J+30 recommandée' (TabBudgetCourant.tsx:70) quel que soit le contenu réel
- Pas de gestion fonds ALUR (105) ni d'appel avance art.35 dans CE domaine : la nature 'alur' n'existe qu'en filtre d'imputation de paiement, pas en création d'appel

### Besoins refonte (manager-first)
- Réactiver et finir la création manuelle d'appels : livrer post_exceptional_call_for_funds (exceptionnel→450-2/702, avance art.35→450-3/1031) et brancher le wizard ; aujourd'hui un syndic ne peut PAS créer un appel hors validation de budget en AG
- Unifier le cycle de vie d'un appel dans l'UI : brouillon→émis→partiel→payé→annulé, avec boutons réels Émettre/Annuler (câbler useAppelsFondsActions déjà écrit) et statut visible cohérent
- Câbler la génération et l'envoi de l'avis d'appel (PDF légal par copropriétaire + envoi email/courrier groupé) — service déjà codé ; un syndic doit pouvoir éditer puis diffuser les avis en masse
- Vrai moteur de relances : destinataires réels (email/adresse du copropriétaire), persistance du canal, planification automatique J+15/30/60/90, génération LRAR, et passerelle vers le recouvrement/contentieux et le conseil syndical
- Manager-first : faire ressortir en tête les actions à mener (appels à émettre, échéances dépassées, relances dues, soldes 12 à apurer) plutôt que d'imposer la navigation par onglets/accordéons ; KPI cliquables vers l'action
- Vue par copropriétaire / par lot transverse aux appels (solde global, échéancier consolidé, historique de relances) — actuellement tout est cloisonné par appel
- Gérer explicitement les natures : courant, travaux (par opération/budget voté), exceptionnel, fonds ALUR art.14-2, avance art.35 — avec écritures et libellés conformes, et liaison à l'AG d'origine (résolution/article)
- Échéancier standard légal (trimestriel par défaut, appel du 1er jour de trimestre) cohérent avec la doctrine ARC, généré automatiquement à la validation du budget, avec régularisation de fin d'exercice
- Export comptable réel (au lieu du bouton vide) et rapprochement avec le grand livre/annexes 1-5
- Supprimer le code mort (AppelsFondsHeader, AppelsFondsKpiStrip, TabListe, shared/hooks/useFinance.ts) pour ne pas induire en erreur la refonte

### Questions ouvertes
- Faut-il autoriser un appel de fonds totalement libre (montant arbitraire) ou tout appel doit-il dériver d'un budget/résolution voté ? La route canonique post_budget_call_for_funds impose aujourd'hui un budget_id ; l'exceptionnel et l'avance art.35 doivent-ils passer par une RPC dédiée ?
- Quelle est la doctrine d'échéancier cible : trimestriel imposé (appelable d'avance) ou paramétrable par copropriété/budget ? Le wizard propose unique/2/3/4 libre, le moteur AG fait du trimestriel.
- Comment matérialiser l'appel ALUR (cotisation art.14-2 : D450-5/C105) dans CE domaine — onglet/nature dédié ou rester géré côté budget ALUR ?
- Modèle des relances : centraliser dans le module Impayés/recouvrement (déjà existant) ou garder une relance par appel ? Aujourd'hui le niveau de relance est calculé par lot toutes natures confondues — est-ce le bon grain ?
- L'émission (brouillon→émis) doit-elle générer l'écriture au grand livre au moment de l'émission ou de la validation AG ? Actuellement post_budget_call_for_funds poste l'écriture à la création, et updateCallStatus ne fait que basculer le statut.
- Faut-il un envoi diffusé (email + portail copropriétaire + courrier) intégré, ou l'avis reste-t-il un simple export à imprimer ?
- Quel niveau d'automatisation pour l'apurement du solde travaux 12 : action manuelle à la clôture (actuel) ou proposition assistée à la clôture définitive de l'opération ?
- Quels rôles/permissions pour créer, émettre, annuler un appel et déclencher une contre-passation (enjeu grand livre immuable) ?

## Factures fournisseurs & paiements

### Ecrans
- **Factures fournisseurs (liste canonique)** (`/finance/factures`) - Ecran principal du domaine. Affiche les factures + avoirs en 2 vues (Kanban par statut: En retard/En attente/A payer/Payees/Avoirs, et Table avec sidebar de filtres). KPI strip (nb factures, total paye, en retard, echeances semaine). Donnees Supabase reelles via useFacturesPageV2 -> useFacturesPage. Heberge tous les modals d'action (paiement, comptabilisation, voir, editer, supprimer, avoir).
- **Nouvelle facture (saisie canonique)** (`/finance/factures/new`) - Formulaire reel de saisie+comptabilisation en un geste (post_immediately=true -> ecriture D6xx/C401). Mono-poste sur un compte de charge 6xx, creation fournisseur (tiers) a la volee inline, garde-fous explicites (periode ouverte, fournisseur actif, plan comptable). Route de saisie UNIQUE selon le commentaire en page liste.
- **Detail facture / avoir** (`/finance/factures/[id]`) - Fiche complete: infos generales, reste a payer + avoirs deduits, ventilation comptable, avoirs lies, pieces jointes, workflow (5 etapes) et historique en sidebar. Bouton de progression de statut + creation d'avoir (total/partiel) via CreateAvoirModal (RPC post_supplier_credit_note). Lecture/maj reelles.
- **Factures (liste LEGACY)** (`/finance/invoices`) - Ancienne liste read-only (table simple, recherche, filtre statut, 3 stat cards). Lit Supabase via useSupplierInvoices mais aucune action n'ecrit. Non referencee dans le menu. Doublon de /finance/factures.
- **Nouvelle facture (LEGACY mock)** (`/finance/invoices/new`) - Formulaire 100% mock: champs fournisseur/date/ref/montant/IBAN/BIC + zone upload PDF, mais le bouton Enregistrer n'a aucun handler (state local non soumis). Code mort.
- **Detail facture (LEGACY)** (`/finance/invoices/[id]`) - Fiche read-only (infos, doc factice 245 Ko, historique factice 'Il y a 2 jours'). Boutons Valider/Rejeter/Marquer payee/Telecharger PDF sans handler. Code mort.
- **Paiement facture (LEGACY, dossiers presents)** (`/finance/invoices/payment, /payment/[id], /payment/confirmation`) - Dossiers de pages de paiement de l'ancien parcours invoices (page + detail + confirmation). A verifier/auditer; non relies au parcours canonique (le paiement canonique passe par PaymentModal sur /finance/factures).
- **Facturation (gestionnaire)** (`/facturation`) - Placeholder pur (PlaceholderPage 'Facturation'), aucun contenu. Espace gestionnaire distinct, non cable.
- **Factur-X (conformite e-facturation)** (`/conformite/facturx`) - Tableau de generation Factur-X (PDF/A-3 + XML EN 16931) en prevision de l'e-facturation obligatoire 09/2026. 100% mock (MOCK_FACTURES_FACTURX, generation/telechargement simules par setTimeout + toast). Reference dans le menu.

### Actions cles
- Saisir une facture fournisseur (mono-poste) -> ecriture immediate D6xx/C401 via createSupplierInvoice (post_immediately) ou createSupplierInvoiceDirect (brouillon nu)
- Creer un fournisseur a la volee (insert tiers is_supplier=true) avec anti-doublon par nom
- Comptabiliser/valider un brouillon (A_PAYER) via validate_supplier_invoice (D6xx/C401) - AccountingModal
- Regler une facture comptabilisee (PAYEE) via post_supplier_payment idempotent (D401/C512) - PaymentModal
- Faire progresser le statut depuis la fiche detail (handleChangeStatut -> updateSupplierInvoice status) sans ecriture comptable
- Creer un avoir total (ventilation copiee) ou partiel (lignes au prorata) via post_supplier_credit_note (ecriture inverse D401/C6xx)
- Editer une facture (date/ref/montant) via updateSupplierInvoice - EditModal
- Supprimer une facture = soft delete (status='cancelled') via deleteSupplierInvoice
- Filtrer/trier/rechercher (statut, fournisseur, periode, KPI clic, tri colonnes, sidebar all/overdue/paid/pending)
- Basculer vue Kanban / Table (FacturesViewToggle)
- Gerer les pieces jointes (upload fichier Supabase Storage / lien externe / principale / voir / telecharger) via FacturePJSection + facturePJService
- Generer/Telecharger un Factur-X (mock) ; Export liste factures (bouton TODO, non implemente)

### Formulaires & modales
- NewFacturePage (form RHF-like manuel, useNewFacturePage) sur /finance/factures/new : date, echeance, fournisseur (select + creation inline), compte de charge 6xx, reference, libelle, montant
- NewFactureModal (RHF + Zod factureSchema, datalist fournisseurs, PosteBudgetSelector, FacturePJSection, warning depassement budget) - ORPHELIN (plus monte, retire au profit de /new)
- PaymentModal - choix compte a debiter + beneficiaire (MOCK), 2 etapes verifier/confirmer, faux spinner setTimeout, faux ecran succes
- AccountingModal - type de depense + compte de charge auto/manuel (liste hardcodee), recap, 'Valider et passer a A payer'
- EditModal - date/fournisseur(MOCK select)/reference/montant/poste budgetaire/URL fichier
- DeleteModal - confirmation suppression
- AvoirModal (components/.../modals) - reference/motif/montant, recap solde net - utilise par la liste
- CreateAvoirModal (features/finance/invoices) - mode total/partiel, numero/date/libelle, warning depasse solde - utilise par la fiche detail (DOUBLON fonctionnel d'AvoirModal)
- ViewModal - apercu rapide facture (PJ, GED lies)
- LienExterneModal / UploadZone / PJList - gestion pieces jointes
- Formulaire mock /finance/invoices/new (sans soumission)

### Backend touche
- Vues: v_supplier_invoices_overview (liste, porte tiers_id/doc_kind/remaining_to_pay/total_paid/credited_amount/original_invoice_id), v_bank_movements_overview, v_account_balances
- Tables: supplier_invoices (insert direct, update, soft-delete status), supplier_invoice_lines (lecture ventilation), tiers (fournisseurs is_supplier=true, insert/select)
- RPC: validate_supplier_invoice(p_invoice_id) D6xx/C401 ; post_supplier_payment(p_copro_id,p_period_id,p_supplier_invoice_id,p_amount,p_payment_date,p_method,p_reference,p_idempotency_key) D401/C512 idempotent ; post_supplier_credit_note(p_copro_id,p_period_id,p_tiers_id,p_invoice_number,p_invoice_date,p_label,p_original_invoice_id?,p_lines?) ecriture inverse
- Edge Functions: create_supplier_invoice (via invokeEdgeFunction, chemin canonique /new) ; pay_supplier_invoice (paySupplierInvoice/usePaySupplierInvoice - DECLAREE MAIS NON APPELEE depuis l'UI)
- Storage/Service: facturePJService (upload fichier, lien externe, URL signee) + hook useFacturePJ ; accounting-period (useOpenPeriod) ; useAccounts (plan 6xx), useRepartitionKeys
- Helpers: lib/finance/credit-notes.ts prorateLines (avoir partiel)

### Issues connues
- PaymentModal (components/features/finance/Factures/modals/PaymentModal.tsx) entierement MOCK: MOCK_FOURNISSEURS, MOCK_COMPTES (soldes factices), IBAN/BIC factices, 'Fournisseur detecte automatiquement par IA' mensonger, paiement simule par setTimeout(3000)+ecran succes. Le compte a debiter et le beneficiaire choisis sont IGNORES par le vrai post_supplier_payment (qui poste C512 generique) -> incoherence UI/compta majeure
- EditModal: select fournisseur lie a MOCK_FOURNISSEURS (data.ts) au lieu des vrais tiers -> un vrai fournisseur n'apparait pas, et handleSaveEdit n'envoie meme pas le fournisseur au backend (updateSupplierInvoice ne prend pas supplier_id)
- AccountingModal: ALL_COMPTES_CHARGE hardcode (avec doublons '606 Electricite'/'606 Eau', '628' double) ; le compte choisi (currentAccount) est passe a onSend mais handleSendToAccounting l'IGNORE (appelle validate_supplier_invoice sans compte) -> selection sans effet
- Doublon EN/FR massif: /finance/invoices (page+new+[id]+payment/*) vs /finance/factures canonique ; features/finance/invoices vs factures vs factures-new ; tous coexistent (anti-pattern migration a moitie)
- Code mort: /finance/invoices/new (bouton Enregistrer sans handler), /finance/invoices/[id] (Valider/Rejeter/Marquer payee/Telecharger sans handler), historique 'Il y a 2 jours' et doc '245 Ko' en dur
- NewFactureModal.tsx (RHF+Zod, PJ, detection poste) ORPHELIN: plus monte (commentaire page liste l'a retire) -> infra de validation Zod + upload PJ a la creation perdue dans le parcours /new qui n'a NI poste budgetaire NI pieces jointes
- createSupplierInvoiceDirect insere status='draft' sans ligne ni ecriture (utilise par handleCreateFacture legacy) -> factures fantomes possibles, contraire au modele 'validee=posted'
- 2 modals d'avoir concurrents: AvoirModal (liste, motif enum MOTIFS_AVOIR, pas de mode total/partiel explicite) vs CreateAvoirModal (detail, mode total/partiel) -> UX et regles divergentes
- Boutons morts fiche detail /factures/[id]: Imprimer, Exporter, et toutes les actions PJ (Voir/Telecharger/Ouvrir) sont des boutons sans onClick
- Bouton Export liste = {/* TODO */} (page.tsx ligne 48)
- Erreurs avalees: handlePaymentComplete/handleSendToAccounting/handleSaveEdit/handleConfirmDelete font console.error(result.error) puis continuent l'etat optimiste (handleSaveEdit/Delete updatent l'UI MEME si l'ecriture echoue) - paiement/accounting ont ete corriges (optimiste conditionnel) mais edit/delete non
- Factur-X 100% mock (useFacturX, MOCK_FACTURES_FACTURX, setTimeout, toast 'simule') alors que la page est exposee au menu comme une feature de conformite reelle
- /facturation (espace gestionnaire) = PlaceholderPage vide
- invoiceIdMap (useFacturesPage.ts) Map module-level inutile (mappe id->id), residu mort
- Dossier /finance/invoices/payment/* non audite, parcours de paiement orphelin parallele au PaymentModal

### Besoins refonte (manager-first)
- Unifier en UN seul parcours: supprimer /finance/invoices/* et features invoices/factures-new redondants, garder une seule liste, une seule fiche, un seul formulaire de saisie
- Cycle de vie facture aligne sur la compta d'engagement reelle: brouillon (saisie+PJ) -> comptabilisee (engagement D6xx/C401) -> reglee (D401/C512), avec le statut pilote par les ecritures et non par un flip nu. Supprimer les transitions decoratives (BROUILLON->A_VALIDER->VALIDEE->A_PAYER) qui ne correspondent pas aux 4 statuts SQL (draft/posted/paid/cancelled)
- PaymentModal reel: lister les vrais comptes de tresorerie (512/bank_accounts) avec solde reel, lier le beneficiaire au tiers de la facture, recuperer l'IBAN reel du fournisseur, et passer le compte tresorerie choisi a post_supplier_payment (qui doit accepter un compte de banque) -> reconciliation bancaire coherente
- Ventilation multi-postes au lieu du mono-poste impose: une facture ventilable sur plusieurs comptes de charge + cle de repartition par ligne + rattachement operation travaux (operation_id deja prevu dans le payload mais pas dans l'UI /new)
- Reintegrer la saisie de PJ obligatoire/recommandee a la creation (le parcours /new actuel ne permet aucun justificatif) + apercu PDF inline
- Pieces jointes et detection automatique du poste (OCR/IA reelle, pas le faux 'detecte par IA') ; rapprochement Factur-X reel (PDF/A-3 + XML EN 16931) en vue de l'obligation 09/2026, branche sur les vraies factures
- Vue 'a payer' orientee tresorier: regroupement par echeance, generation d'un fichier de virement SEPA/lot de paiement, suivi engage/realise/paye par budget
- Garde-fous depassement budget non bloquants mais traces (lien vers vote AG / decision), au lieu d'un window.confirm
- Workflow de validation a 2 mains (saisie gestionnaire -> validation responsable) avec piste d'audit reelle (historique alimente par le backend, pas 'Utilisateur courant' en dur)
- Avoirs: un seul composant, regle claire total/partiel, controle du reste a payer et impact sur le solde fournisseur ; gestion du fournisseur devenu crediteur (report sur facture suivante)

### Questions ouvertes
- Garde-t-on 5 statuts metier (BROUILLON/A_VALIDER/VALIDEE/A_PAYER/PAYEE) ou s'aligne-t-on strictement sur les 4 statuts SQL (draft/posted/paid/cancelled) ? Le mapping actuel ecrase A_VALIDER->draft et VALIDEE->posted, source d'ambiguite
- Saisie = comptabilisation immediate (post_immediately, modele actuel /new) OU vrai 2-temps brouillon -> validation par un responsable ? Decision a figer (la dette mentionne LOT 1.2 RPC de validation)
- Mono-poste definitif ou ventilation multi-comptes/multi-cles requise (annexes legales, travaux par operation) ?
- Le reglement doit-il choisir un compte de tresorerie reel et l'IBAN beneficiaire (vrai virement) ? Si oui, faut-il etendre post_supplier_payment et brancher la reconciliation bancaire ?
- Que faire d'Edge Function pay_supplier_invoice (declaree, jamais appelee) vs RPC post_supplier_payment : on supprime l'une ?
- Quel sort pour /finance/invoices/* et /finance/invoices/payment/* (suppression pure ou parcours de paiement a recuperer) et pour le placeholder /facturation ?
- Factur-X: in-scope de cette refonte (vraie generation/transmission) ou reste mock jusqu'a l'echeance reglementaire ?
- TVA: confirme-t-on TVA non recuperable en copro (montant TTC mono-ligne) ou faut-il gerer HT/TVA/TTC par ligne (amount_ht/amount_tva/taux_pct existent deja dans supplier_invoice_lines) ?
- Suppression: soft delete cancelled suffit-il, ou faut-il une contre-passation comptable si la facture etait deja postee/payee ?
- Gestion des fournisseurs: edition du fournisseur d'une facture, fiche fournisseur (IBAN/BIC/SIRET), et place de l'annuaire des tiers dans ce domaine ?

## Clôture d'exercice + affectation du résultat + 5 annexes comptables légales (décret 2005-240)

### Ecrans
- **Comptabilité (hub canonique clôture + annexes)** (`/finance/comptabilite`) - Vrai centre du domaine. TopBar avec pill période + bouton 'Clôturer <année>' (visible si période open). NavBar à onglets : Grand Livre, Livre comptable, Balance, Compte de gestion, et dropdown Annexes 1→5. Sélecteur de période (si >1). KPI strip (débit/crédit/écritures/équilibre). Bandeau FinanceAnnexeStats (trésorerie/créances/provisions/dettes via fn_dashboard_kpis). Lance ClotureModal.
- **Opérations à apurer (solde travaux 12)** (`/finance/operations-a-apurer`) - Liste les soldes du compte 12 (travaux) gelés en attente d'affectation aux copropriétaires (450-2), par exercice. KPI (nb opérations, solde total, plus ancien report). Bouton 'Apurer' par ligne -> ApurerModal -> settle_works_balance. Découvrable aussi via WorksToSettleBanner sur le dashboard.
- **Annexes comptables (page dédiée /documents)** (`/documents/annexes`) - Double vue : 'Vue simplifiée' (6 KPI cards) et 'Documents officiels' (annexes 1, complément 1, 2, 3, 4, 5 rendues en tables légales). Doublon partiel du dropdown Annexes du hub comptabilité. Seule entrée listée depuis /documents.
- **Arrêté des comptes (stub mort)** (`/documents/closing`) - Page STATIQUE non câblée : titre 'Exercice <N-1> - Arrêté', boutons décoratifs 'Approuver les comptes'/'Annuler l'arrêté' sans handler, onglets Annexe 1→5 inertes, et message 'Cette annexe n'est pas disponible sur CoProFlex'. Aucune donnée, aucun lien entrant.
- **Documents (landing)** (`/documents`) - Grille de cartes : GED, Grand livre (/documents/ledger), Balance (/documents/balance), Dépenses (/documents/expenses), Annexes comptables (/documents/annexes). Famille /documents/* qui duplique le hub Finance>Comptabilité.
- **Clôture AG (récap décisions, dont approbation comptes)** (`/ag/[id]/checklist (composant ClosureRecap)`) - Récapitulatif des résolutions adoptées (dont APPROVE_ACCOUNTS, GRANT_QUITUS), complétion des variables manquantes, puis bouton 'Clôturer l'AG' -> close_ag + prepare_ag_decisions. Point d'entrée AG du cycle d'approbation des comptes.
- **Convocation AG — section annexes comptables** (`/ag/[id]/convocation (ConvocationAnnexesSection)`) - Pour les AGO, charge les annexes 1-5 de l'exercice CLOS (N-1) via useConvocationAccountingData et les intègre au PDF de convocation (annexe-pdf-tables.ts / generateConvocationPDF.ts).

### Actions cles
- Clôturer l'exercice : handleValiderCloture (useComptabilitePage) -> financeApi.closePeriod -> RPC close_period. ATTENTION : côté SQL, close_period ne fait QUE basculer le statut open->closed, il NE déclenche NI l'affectation du résultat NI l'à-nouveau.
- Garde-fous de clôture côté front : blocage si déséquilibre partie double (isBalanced) ou mouvements non catégorisés (mouvementsNonCategorises) — mais mouvementsNonCategorises est codé en dur à [] / 0, donc ce garde-fou est inopérant.
- Affecter le solde travaux (compte 12) aux copropriétaires : settleWorksBalance -> RPC settle_works_balance (écriture C12/D450-2 = appel, ou D12/C450-2 = remboursement, par quote-part). Seule brique d'affectation réellement câblée.
- Contre-passation d'écriture : reverseLedgerTransaction (0071), bloquée pour les écritures régénérables (opening_balance, closing, opening_onboarding, result_allocation).
- Export comptable CSV (grand livre / balance / journaux) généré client (art. 18-1).
- Consultation des 5 annexes : fn_annexe_1, fn_annexe_1_detail_copros, fn_annexe_2..5 (annexes 2/3 dérivent prev/next période côté SQL depuis 0075).
- Impression annexe : window.print() (le seul export annexe réellement implémenté).
- Approbation des comptes en AG : ClosureRecap -> close_ag + prepare_ag_decisions (variables APPROVE_ACCOUNTS/GRANT_QUITUS).
- [NON CÂBLÉ] Affectation du résultat D120/C450-1 + D110/C450-2 : RPC regularize_period existe et est robuste (garde-fou v_result_allocation_split + assert_result_allocation_split) mais AUCUN appelant front.
- [NON CÂBLÉ] Ouverture exercice suivant / à-nouveau : RPC open_next_period existe, aucun appelant front.
- [NON CÂBLÉ] Approbation/rejet de période : financeApi.approvePeriod / rejectPeriod existent (UPDATE direct closed->approved/rejected) ET RPC approve_period existe, mais aucun composant ne les appelle.
- [NON CÂBLÉ] Réouverture d'exercice : RPC reopen_period existe, aucun appelant front.

### Formulaires & modales
- ClotureModal (Comptabilite/modals/ClotureModal.tsx) : récap débit/crédit/équilibre, alertes, liste mouvements non catégorisés (toujours vide), confirmation 'opération irréversible', bouton 'Valider la clôture' (désactivé si non équilibré ou mvts non catégorisés).
- ApurerModal (operations-a-apurer/ApurerModal.tsx) : récap exercice/solde 12/écriture (C12/D450-2 ou D12/C450-2)/effet (appel ou remboursement), warning 'définitif', bouton 'Affecter aux copropriétaires'.
- DetailModal (Comptabilite/modals/DetailModal.tsx) : détail d'une opération + contre-passation (raison + bouton, conditionné par canReverseSelected).
- HistoriqueModal (Comptabilite/modals/HistoriqueModal.tsx) : historique des modifications — alimenté par historique=[] (toujours vide).
- ClosureRecap (ag/Closure/ClosureRecap.tsx) : récap résolutions adoptées + saisie inline des variables manquantes (ClosureVariableInline) + bouton 'Clôturer l'AG'.
- Toggle de vue Annexes (/documents/annexes) : 'Vue simplifiée' (KPI) vs 'Documents officiels' (tables légales).
- Boutons décoratifs sans handler : 'Approuver les comptes' et 'Annuler l'arrêté des comptes' sur /documents/closing ; bouton 'Catégoriser' dans ClotureModal ; boutons 'Exporter' des annexes (onExport vide).

### Backend touche
- RPC close_period(p_period_id) -> Json : open->closed, garde G-MGR. NE fait PAS l'affectation ni l'à-nouveau (simple flip de statut + closed_at/closed_by).
- RPC approve_period(p_period_id) -> Json : closed->approved, gel définitif (ferme l'exemption d'immutabilité is_ledger_regen_exempt). NON appelée par le front.
- RPC reopen_period(p_period_id) -> Json : réouverture (interdite si approved). NON appelée par le front.
- RPC open_next_period(p_copro_id, p_closing_period_id, p_new_start/end/name?) : reprise à-nouveau (110/120 + 450 carry). NON appelée par le front.
- RPC regularize_period(p_copro_id, p_period_id) -> Json : affectation du résultat en UNE écriture result_allocation datée AG, postée en N+1 ouverte, D120/C450-1 (courant) + D110/C450-2 (travaux) par quote-part ; idempotente par remplacement tant que non approuvée ; appelle assert_result_allocation_split en fin. NON appelée par le front.
- RPC settle_works_balance(p_copro_id, p_period_id?) -> Json : apure le solde 12 vivant vers 450-2. CÂBLÉE.
- Vue v_works_pending_settlement : soldes 12 en attente (page operations-a-apurer + banner dashboard).
- RPC fn_annexe_1, fn_annexe_1_detail_copros, fn_annexe_2, fn_annexe_3, fn_annexe_4, fn_annexe_5 (annexes ; 2/3 dérivent prev/next période côté SQL depuis 0075).
- RPC fn_dashboard_kpis(p_copro_id, p_period_id) : KPI annexes simplifiées (AnnexeContext + FinanceAnnexeStats).
- Vue v_result_allocation_split + assert_result_allocation_split : garde-fou bloquant de l'invariant 110/120 (migration 0027).
- Table accounting_periods : status (open/closed/approved/rejected), start/end_date, closed_at, approved_at, approval_notes — lue partout, écrite directement par approvePeriod/rejectPeriod (UPDATE hors RPC).
- Tables/comptes du grand livre : ledger_transactions (source_type result_allocation/closing/opening_balance), comptes 12/110/120/450-1/450-2 (cf. migration 0056 renommage 110->12/120->478 à recroiser).
- RPC close_ag, prepare_ag_decisions, finalize_ag, validate_ag_variables, get_ag_pending_actions (chaîne AG d'approbation des comptes).
- RPC reverse_ledger_transaction (0071, contre-passation).

### Issues connues
- MAILLON CENTRAL MANQUANT : tout l'aval de la clôture est codé en SQL mais NON câblé. regularize_period (affectation 110/120->450), open_next_period (à-nouveau), approve_period, reopen_period n'ont AUCUN appelant front (vérifié : 0 occurrence hors types/supabase.ts). useFinanceData.ts n'expose aucun hook pour eux. Conséquence : un gestionnaire peut 'clôturer' (flip statut) mais ne peut NI affecter le résultat NI ouvrir l'exercice suivant NI approuver les comptes depuis l'app.
- approvePeriod/rejectPeriod (lib/finance/api.ts:1184/1205) = code mort : jamais importés/appelés. De plus ils font un UPDATE direct sur accounting_periods au lieu d'appeler la RPC approve_period (deux chemins divergents pour la même transition).
- /documents/closing = page entièrement morte : stub statique, boutons 'Approuver/Annuler l'arrêté' sans onClick, onglets inertes, message 'Cette annexe n'est pas disponible sur CoProFlex', et aucun lien entrant (absente de navigation.ts ET de la grille /documents). Bug 'bouton mort' caractérisé.
- Doublon de famille de routes : /documents/closing, /documents/annexes, /documents/ledger, /documents/balance, /documents/expenses dupliquent le hub canonique /finance/comptabilite (onglets Grand Livre/Balance + dropdown Annexes). Deux implémentations d'annexes coexistent : page /documents/annexes (LegalView) et ComptaTabContent — migration à moitié faite.
- Garde-fou de clôture inopérant : dans useComptabilitePage, mouvementsNonCategorises=[] et etatCloture.mouvementsNonCategorises=0 sont hardcodés ; le blocage 'mouvements non catégorisés' de ClotureModal ne se déclenchera jamais. historique=[] et alertes=[] aussi figés (HistoriqueModal toujours vide).
- UX d'erreur médiocre : handleValiderCloture utilise alert() (blocages clôture + succès) au lieu de toasts/UI.
- Années en dur : closing/page.tsx fait getFullYear()-1 ; annexes/page.tsx et ComptaTabContent dérivent les libellés de période (exPrecedent/bpEnCours...) depuis new Date().getFullYear() au lieu des dates réelles de la période sélectionnée -> libellés faux si on consulte un exercice ancien.
- Annexes : onExport vide partout (commentaires 'TODO: HTML export' dans AnnexeTables.tsx) — seul window.print() marche. Pas d'export PDF/Excel des annexes dans le hub (alors que la convocation, elle, a annexe-pdf-tables.ts).
- Typage faible récurrent : (supabase.rpc as any) dans useAnnexeData, AnnexeContext, FinanceAnnexeStats, useConvocationAccountingData (RPC hors types générés) ; createUntypedClient pour settle/vues. Drift types non régénérés sur ce domaine.
- Cohérence métier à vérifier (MEMORY) : migration 0056 renomme 110->12 / 120->478, mais le code et les commentaires de regularize_period/operations parlent encore de 110/120/12 ; risque d'incohérence de nommage de comptes entre annexes, affectation et apurement (drift annexes signalé read-only mais à recroiser).
- Annexe 1 : LegalView passe periodId mais pas de nextPeriodId aux annexes 2/3 (depuis /documents/annexes), alors que ComptaTabContent accepte nextPeriodId=null ; reliance sur la dérivation SQL 0075 — fragile si non déployée.
- useConvocationAccountingData : loadedRef empêche tout rechargement si coproId/exercice change après un premier load réussi (cache jamais invalidé).

### Besoins refonte (manager-first)
- Créer un véritable assistant 'Clôture & arrêté des comptes' manager-first, séquentiel et explicite, matérialisant le cycle légal réel : 1) contrôles pré-clôture (équilibre, mvts non catégorisés RÉELS, factures en attente, soldes 12 à apurer) ; 2) close_period ; 3) open_next_period (à-nouveau N+1) ; 4) regularize_period (affectation 110/120->450) ; 5) approbation en AG (approve_period) ; avec état/feu tricolore par étape et réversibilité contrôlée (reopen_period).
- Câbler immédiatement les 4 RPC orphelines (regularize_period, open_next_period, approve_period, reopen_period) via des hooks useFinanceData + boutons d'action — c'est la priorité n°1 : la valeur métier existe en base, il manque la surface.
- Distinguer clairement à l'écran les 4 statuts de période (open/closed/approved/rejected) et leurs transitions autorisées, avec verrouillage visuel après 'approved' (intangibilité expliquée à l'utilisateur).
- Unifier les annexes en UNE seule implémentation (supprimer /documents/closing et la famille /documents/* legacy, ou les rediriger) ; le hub Finance>Comptabilité devient la source unique. Finir la migration EN/FR et legacy.
- Affectation du résultat lisible pour un syndic : un écran 'Affectation du résultat <exercice>' montrant excédent/déficit courant (120/12) et travaux (110), la ventilation par quote-part et par lot, AVANT de poster, avec rattachement à la décision d'AG (date AG, résolution APPROVE_ACCOUNTS).
- Export PDF/Excel réel des 5 annexes (réutiliser annexe-pdf-tables.ts déjà fait pour la convocation) + impression propre paginée ; remplacer les onExport vides.
- Libellés de période dérivés des dates réelles de l'exercice sélectionné (et non de l'année courante), pour la consultation d'exercices passés.
- Remplacer les alert() par des toasts + écrans de confirmation riches ; afficher l'historique réel des clôtures/affectations (qui/quand) à la place du HistoriqueModal vide.
- Tableau de bord 'fin d'exercice' regroupant : opérations à apurer (12), résultat à affecter, mouvements à catégoriser, factures à valider — pour que le syndic voie d'un coup ce qui bloque l'arrêté.
- Lier explicitement le cycle comptable (approve_period) au cycle AG (close_ag/activate_ag_decisions) : l'approbation des comptes votée en AG devrait déclencher/proposer approve_period (aujourd'hui les deux mondes sont déconnectés).

### Questions ouvertes
- Affectation du résultat : doit-elle être déclenchée MANUELLEMENT par le gestionnaire (bouton dédié) ou AUTOMATIQUEMENT par l'activation de la résolution APPROVE_ACCOUNTS en AG (activate_ag_decisions) ? Aujourd'hui regularize_period n'est appelée nulle part.
- Faut-il enchaîner automatiquement close_period -> open_next_period -> regularize_period dans un seul flux 'clôture', ou garder 3 actions distinctes ? (le SQL impose à-nouveau AVANT affectation : open_next_period puis regularize_period).
- Statut 'approved' déclenché par quoi : un acte de gestion (bouton approve_period) ou strictement le PV d'AG d'approbation des comptes ? Et qui peut rejeter (rejected) et que devient l'exercice rejeté ?
- Faut-il conserver la famille /documents/* (closing, ledger, balance, expenses, annexes) ou la supprimer/rediriger vers /finance/comptabilite ? Décider de la route canonique avant la refonte.
- Excédent courant : reste sur le 450 (apuré sur l'appel T1 N+1) par défaut avec remboursement optionnel (cf. décision WP5.3 en mémoire) — confirmer que la refonte expose ce choix à l'écran.
- Apurement travaux (settle_works_balance) vs affectation du résultat (regularize_period) : comment présenter les deux au gestionnaire sans confusion (le 12 reporté volontairement vs le 110/120 affecté à la clôture) ?
- Nommage des comptes après 0056 (12/478 vs 110/120) : quel est le plan comptable cible canonique à afficher dans les annexes et les écritures d'affectation ?
- Annexes 2/3 : confirmer que la dérivation auto prev/next période (0075) est déployée partout et que le front ne doit plus jamais passer p_next_period_id.
- Faut-il une page/onglet 'Affectation du résultat' distinct des annexes, ou l'intégrer à l'assistant de clôture ?
- Garde-fou 'mouvements non catégorisés' : doit-il vraiment bloquer la clôture (et donc être branché sur des données réelles), ou rester indicatif ?

## AG / Assemblées générales (cycle complet) — gestionnaire

### Ecrans
- **Liste AG (legacy)** (`/ag`) - Liste minimaliste : brouillons, prochaine AG, stats, historique, lien biblio. Doublonne /ag/dashboard (useAgMeetings + useAgDrafts). Probablement à fusionner/supprimer.
- **Tableau de bord AG** (`/ag/dashboard`) - Hub principal : onglets « AG en cours / passées », prochaine AG (NextAgCard), AG actives, brouillons (Supabase + localStorage legacy), historique, dupliquer/archiver/supprimer. Source canonique de navigation.
- **Planifier une AG (création)** (`/ag/new`) - Étape 1 : type (ordinaire/extra/urgente/mixte), format (présentiel/visio/hybride + URL visio), date/heure (jalons délais légaux), adresse (Google Maps autocomplete), budget optionnel (postes + comptes + clés). Crée l'AG via edge ag_create puis génère résolutions standard.
- **Modifier la planification** (`/ag/[id]/edit`) - Étape 1 d'une AG existante : ré-édite type/date/adresse/budget. Réutilise le formulaire de /new. Met à jour ag_meetings + résolution budget.
- **Ordre du jour** (`/ag/[id]/agenda`) - Étape 2 : liste réordonnable de résolutions, édition inline des variables (placeholders {x}), sélecteur copropriétaire pour rôles, ajout depuis bibliothèque/custom, préfill obligatoires, aperçu ODJ live, période comptable.
- **Nouvelle résolution (formulaire)** (`/ag/[id]/resolutions/new`) - Création d'une résolution custom (titre, majorité, clé répartition, corps, appel de fonds + échéancier). Sauvegarde en draft 'resolutions' puis retour agenda.
- **Sélection AG pour résolution** (`/ag/resolutions/select-ag`) - Choisit une AG brouillon avant d'ouvrir /resolutions/new. Pont depuis la bibliothèque.
- **Bibliothèque de résolutions** (`/ag/resolutions`) - Catalogue de modèles (système/cabinet/copro) : recherche, filtres (catégorie/type AG/majorité/tags/obligatoire), tri, pagination, CRUD modèles cabinet, copier, ajouter à une AG, modèles personnalisés.
- **Préparation convocation** (`/ag/[id]/convocation`) - Étape 3 : aperçu PDF convocation (versions), validation des variables manquantes, checklist de revue, annexes comptables (fn_annexe_1..5) + documents joints, mode dégradé si données partielles.
- **Envoi des convocations** (`/ag/[id]/envoi`) - Étape 4 : matrice copropriétaire × méthode (recommandé/lettre/avis électronique/email/remise main propre), 'tout cocher', pipeline d'envoi (modal progression + ZIP), persistance choix via save_ag_envoi_choices, jalons.
- **Votes par correspondance + pouvoirs** (`/ag/[id]/preparation`) - Étape 5 (live) : onglets Votes par correspondance (saisie par copropriétaire, justificatifs, tantièmes) et Pouvoirs (mandats), aperçu quorum prévisionnel. NB : le nom de route 'preparation' ne reflète pas le contenu.
- **Votes par correspondance (variante)** (`/ag/[id]/votes-correspondance`) - Étape 5 (variante distincte) : compte à rebours, ouverture vote en ligne (toggle non persistant), saisie formulaires papier, suivi des votes reçus. Chevauche /preparation.
- **Saisie votes pour un copropriétaire** (`/ag/[id]/votes-correspondance/[coproId]`) - Sous-page : saisie/validation des votes correspondance d'un copropriétaire précis (save_votes_correspondance), progression, verrouillage après validation.
- **Feuille de présence** (`/ag/[id]/feuille-presence`) - Étape 6 (DB-first) : présence/représenté/correspondance/absent par copropriétaire, calcul quorum + seuils, signatures (pad), export PDF, bulk présent/absent, garde avant session si non signés.
- **Désignation des rôles** (`/ag/[id]/designation-roles`) - Désignation président/secrétaire/scrutateur de séance + membres conseil syndical (titulaires/suppléants), parmi présents/représentés ; sync vers ag_meetings + draft 'roles'.
- **Session / déroulé de l'AG** (`/ag/[id]/session`) - Étape 7 : tenue live — présences, vote résolution par résolution, calcul majorité (art.24/25/25-1/26/26-1/unanimité), passerelles, modale résultat, variables par résolution, budget/ALUR, projecteur, ajout désignations à la volée, clôture → close_ag + prepare_ag_decisions.
- **Projecteur** (`/ag/[id]/projector`) - Affichage plein écran salle (token URL) : titre AG, état (attente/point info/vote en cours/entre résolutions/terminé), indicateur de sync, basé sur localStorage partagé par la session.
- **Procès-verbal** (`/ag/[id]/pv`) - Étape 8 : génération texte+PDF du PV, édition signataires (auto-fill bureau), mode signature (sur place/électronique), garde 471/472 (arrêté des comptes), ACTIVATION des décisions (activate_ag_decisions), archivage GED, passage pv_signed.
- **PV (legacy localStorage)** (`/ag/[id]/minutes`) - Ancienne page PV lisant ag-draft/ag-resolutions depuis localStorage, bouton 'Télécharger PV' mort. Code mort à supprimer (doublon de /pv).
- **Finalisation des décisions** (`/ag/[id]/finalisation`) - Étape 9 (revue lecture seule) : blocs budget/ALUR/appels de fonds/conseil syndical/actions simples issus de ag_pending_actions, bouton 'Marquer comme terminée' → finalize_ag.
- **Checklist de préparation** (`/ag/[id]/checklist`) - Checklist statique de tâches J-60→J-1 (état non persisté, en dur) + bouton vers ClosureRecap → /pv. Largement maquette.
- **Preview résolutions (maquette)** (`/ag/resolutions-preview`) - Page de comparaison visuelle V1 tableau / V2 cartes avec 4 résolutions en dur. Outil de design, pas une vraie feature.

### Actions cles
- Planifier une AG : choisir type/format/date/heure/adresse, activer budget prévisionnel (postes/comptes/clés), validation délais légaux de convocation
- Auto-générer les résolutions obligatoires (createStandardResolutions) selon type AG + exercice + budget
- Construire l'ordre du jour : ajouter/supprimer/réordonner résolutions, ajouter depuis bibliothèque ou custom, préfill obligatoires
- Éditer les variables d'une résolution inline (montants, noms via sélecteur copropriétaire, dates, modalités)
- Gérer la bibliothèque de modèles : créer/dupliquer/éditer/supprimer modèles cabinet, copier, ajouter à une AG
- Générer/prévisualiser/télécharger le PDF de convocation + valider les variables manquantes + checklist de revue
- Attacher annexes comptables (fn_annexe_1..5) et documents joints à la convocation
- Choisir les méthodes d'envoi par copropriétaire et lancer le pipeline d'envoi (avec ZIP + progression)
- Envoyer convocations / relances par edge function (ag_send_convocations / ag_send_relance) + vérifier le délai légal (check_convocation_delay)
- Marquer l'AG comme convoquée (markConvoked → statut convoked)
- Saisir les votes par correspondance (papier/en ligne) par copropriétaire + valider (save_votes_correspondance)
- Gérer les pouvoirs/mandats (ajout, justificatif, validation) et voir le quorum prévisionnel
- Remplir la feuille de présence (présent/représenté/correspondance/absent), calculer quorum, faire signer (pad), exporter PDF
- Désigner le bureau (président/secrétaire/scrutateur) + membres du conseil syndical
- Démarrer la session (start_ag → session_active) avec enregistrement des présences
- Voter résolution par résolution en live, calculer la majorité, gérer les passerelles 25-1/26-1 (second vote/ajournement)
- Persister les votes (ag_cast_vote / castVoteDirect fallback) + statut approved/rejected par résolution
- Piloter l'affichage projecteur (ouvrir/copier URL token)
- Clôturer la session (close_ag + prepare_ag_decisions) → matérialise les ag_pending_actions
- Générer le PV (texte + PDF jsPDF) et l'archiver dans la GED
- Renseigner les signataires (auto-fill bureau), choisir le mode de signature, signer (pad ou électronique)
- Activer les décisions de l'AG (activate_ag_decisions) → crée budget/ALUR/appels/conseil, avec garde 471/472
- Finaliser l'AG (finalize_ag) puis archiver (archive_ag)
- Dupliquer une AG passée, supprimer un brouillon, renommer un brouillon
- Reprendre une AG là où elle a été laissée (save_ag_wizard_state / max_step_reached)

### Formulaires & modales
- Formulaire création AG (/new) : type, format, visio, date/heure, adresse Google Maps, budget + postes
- Formulaire édition planification (/edit) avec BudgetSection + AddressSection
- Formulaire nouvelle résolution custom (titre/majorité/clé/corps/appel de fonds + échéancier)
- Modal CustomResolutionModal + InlineResolutionEditor (agenda)
- Modal BibliothequeResolutions (sélection depuis la banque dans l'agenda)
- VariableEditor (édition de variable de résolution, popover dans l'agenda)
- CustomResolutionEditor + AddToAGModal (bibliothèque)
- ConvocationReviewChecklist (modal de revue convocation)
- SendProgressModal + SendConvocationsModal (envoi)
- SignatureModal / SignaturePadModal (feuille de présence + PV)
- RoleSelect modal (désignation des rôles)
- Modales session : résultat de vote, passerelle (second vote/ajournement), édition variable, financement, fonds ALUR, édition budget, ajout désignation, avertissement validation, ProjectorModal
- Modal signataires PV + auto-fill confirm + ActivationRecap (récap activation des décisions)
- ConfirmModal (suppression brouillon dashboard)
- ClosureRecap (depuis checklist)
- Alertes natives (window.alert/confirm) omniprésentes : envoi, validation votes, garde 471/472, clôture session, finalisation

### Backend touche
- Edge functions : ag_create, ag_close, ag_add_resolution, ag_cast_vote, ag_register_attendance (non déployée → fallback direct), ag_start_session, ag_generate_document, ag_send_convocations, ag_send_relance
- RPC workflow : close_ag, prepare_ag_decisions, activate_ag_decisions, finalize_ag, archive_ag, calculate_resolution_result (côté SQL)
- RPC bundles/lecture : rpc_get_ag_pv_bundle, rpc_get_ag_convocation_bundle, rpc_get_ag_coproprietaires, get_ag_recipients, get_ag_pending_actions, get_ag_envoi_choices, get_ag_milestones, get_ag_session_draft, compute_ag_quorum
- RPC écriture/état : save_ag_envoi_choices, save_ag_milestone, save_ag_wizard_state, save_ag_session_draft, save_votes_correspondance, check_convocation_delay
- RPC annexes comptables : fn_annexe_1, fn_annexe_2, fn_annexe_3, fn_annexe_4, fn_annexe_5
- Tables : ag_meetings, ag_resolutions, ag_votes, ag_attendance, ag_session_drafts, ag_notifications, ag_pending_actions, resolution_templates, coproprietaires, lots, lot_owners, budgets, budget_lines, accounting_periods, repartition_keys, documents, document_relations, copros
- Vues : v_ag_overview, v_ag_resolutions_results, v_ag_attendance_summary, v_ag_votes_detailed, v_ag_notification_stats
- Storage : bucket 'ged' (documents convocation/annexes + archivage PV via autoFileToGED)
- Realtime : channel postgres_changes sur ag_notifications
- Gardes onboarding : checkAgWaitingBalanceGuard / agHasPendingAccountClosure / resolveCoproIdForAg (471/472 avant activation)

### Issues connues
- DOUBLON de page liste : /ag (page.tsx, useAgMeetings+useAgDrafts) vs /ag/dashboard (useAgDashboardPage) — deux hubs concurrents, /ag semble obsolète.
- CODE MORT : /ag/[id]/minutes lit ag-draft-${id} / ag-resolutions-${id} depuis localStorage et le bouton 'Télécharger le PV (PDF)' n'a aucun handler — doublon non fonctionnel de /pv.
- FEATURE ORPHELINE : src/features/ag/votes-correspondance/ (OwnersPanel, VotesPanel, useVotesCorrespondancePage) n'est importée par aucune route ; seul son propre dossier la référence (dead code).
- DOUBLON d'étape 5 : /preparation (usePreparationPage → useVotesCorrespondance + usePouvoirs) ET /votes-correspondance (useCorrespondenceVotes inline) couvrent toutes deux 'votes par correspondance' avec des modèles de données différents → risque de divergence et confusion gestionnaire.
- CODE MORT/maquette : /ag/resolutions-preview (4 résolutions en dur, outil de design) et /ag/[id]/checklist (tâches J-60→J-1 en dur, état non persisté).
- votes-correspondance/page.tsx : toggle 'Ouvrir les votes en ligne' (onlineVotingEnabled) est un state local non persisté + plusieurs boutons sans handler ('Télécharger feuille vierge', 'formulaire de vote/pouvoirs', 'Tout savoir...') = boutons morts.
- Refus/erreurs gérés par window.alert/confirm partout (envoi, votes, PV, session) — pas de toasts/UI cohérente ; en session 'Individual vote save failure — non-blocking' avale silencieusement les échecs (useAgSessionPage persistResolutionResult).
- Fallbacks edge→direct fragiles : castVote/addResolution détectent l'échec par matching de chaîne d'erreur ('401','JWT','non-2xx'...) ; registerAttendance n'utilise QUE le direct (edge non déployée) — incohérence et dépendance RLS côté client.
- Drift annexes (mémoire projet) : fn_annexe_1..5 incomplètes ; PDF convocation annexe 1 réputée cassée → la convocation peut partir incomplète.
- useAgNotifications (sendConvocations/sendRelances/validateConvocationDelay, realtime) existe mais n'est câblé à AUCUNE page du domaine AG (consommé seulement par envoi via SendConvocationsModal partiel) — pipeline d'envoi réel = useAgEnvoiPage, donc duplication de logique d'envoi.
- Dépendances useEffect incomplètes dans useAgSessionPage (effets sur votes/sessionState/présences sans toutes les deps) → risque de stale closures malgré les refs ; complexité extrême (>900 lignes, 7 sous-hooks).
- Persistance projecteur via localStorage (useSessionProjector) — pas de canal temps réel serveur, sync best-effort, fragile multi-appareils.
- Résolutions 'dupliquées' en session portent un id '_dup_' non persistable (skip d'updateResolution) — la logique de désignation à la volée crée des entités locales non sauvegardées en DB.
- Code mort résiduel localStorage : drafts localStorage encore lus/affichés dans le dashboard et useNewResolutionPage écrit un draft 'resolutions' jamais relu par l'agenda DB-first (migration localStorage→DB non finie).
- Le nom de route /preparation est trompeur (c'est l'étape 5 votes/pouvoirs, pas la préparation step 1 qui est /edit + /agenda).
- Mapping type AG lossy : URGENTE→extraordinary et MIXTE→special écrasent l'intention métier (useAgCreateForm) ; l'édition ne propose que ORDINAIRE/EXTRAORDINAIRE.

### Besoins refonte (manager-first)
- Unifier en UN seul hub AG (supprimer /ag legacy, /minutes, /checklist maquette, /resolutions-preview) et une seule étape 'votes par correspondance' (choisir /preparation OU /votes-correspondance, fusionner les modèles).
- Wizard manager-first à état serveur unique : barre de progression claire (statut DB = source de vérité), reprise fiable, et libellés de routes alignés sur les étapes (renommer /preparation).
- Vue 'pilotage AG' synthétique : pour chaque AG, où on en est (convocations envoyées X/Y, votes correspondance reçus, quorum prévisionnel, décisions à activer) en un coup d'œil — actuellement éclaté sur 9 pages.
- Remplacer tous les alert()/confirm() par un système de notifications + modales de confirmation cohérent, et surfacer explicitement les échecs (votes non sauvegardés, annexes incomplètes) au lieu de les avaler.
- Tableau de bord 'délais légaux' proactif : J-21 convocation, J-3 votes correspondance, alertes de non-conformité (art.64 décret 67-223) intégrées au flux, pas seulement à la création.
- Convocation : bloquer l'envoi tant que les annexes obligatoires (fiche synthétique, rapport CS, devis, annexes comptables) ne sont pas complètes ; corriger le drift fn_annexe.
- Session : simplifier le déroulé (réduire la dette des 7 sous-hooks), garantir la persistance DB de TOUS les votes et désignations (supprimer les ids _dup_ locaux), projecteur en temps réel serveur (Realtime) plutôt que localStorage.
- Workflow de clôture/activation rendu explicite et idempotent côté UI : montrer clairement close_ag→prepare→activate→finalize, avec récap des entités créées (budget, appels, conseil) et lien direct vers Finance.
- Gestion des pouvoirs/correspondance conforme : plafond de 3 mandats/mandataire, vérif tantièmes 5%/10%, traçabilité des formulaires reçus.
- Pipeline d'envoi unifié et traçable (recommandé électronique avec valeur probante, accusés, relances automatiques) en s'appuyant sur ag_notifications + edge functions, en supprimant la double implémentation.
- Signature électronique réelle du PV (intégration prestataire) au lieu d'un pad + alert ; statut juridique pv_signed adossé à une preuve.

### Questions ouvertes
- Garde-t-on /preparation OU /votes-correspondance comme étape 5 unique, et quel modèle de données (useVotesCorrespondance vs useCorrespondenceVotes) devient canonique ?
- Supprime-t-on définitivement /ag (legacy), /minutes, /checklist, /resolutions-preview, et le dossier features/ag/votes-correspondance orphelin ? (parité à vérifier avant suppression)
- Quel est le statut cible du vote en ligne par les copropriétaires (toggle 'Ouvrir les votes') : feature réelle reliée au portail copropriétaire ou suppression ?
- Doit-on conserver les fallbacks edge→direct (RLS-dependent) ou tout faire passer par des RPC/edge sécurisées et fiables ?
- La logique de désignation à la volée en session (résolutions _dup_ non persistées) doit-elle créer de vraies résolutions en DB ?
- Quel niveau de conformité légale est exigé pour la refonte (plafonds pouvoirs, valeur probante de l'envoi électronique, signature électronique du PV) ?
- Le projecteur doit-il devenir temps réel serveur (Realtime/WebRTC) et multi-appareils, ou rester un affichage local mono-poste ?
- Faut-il modéliser un vrai mandat de syndic (APPOINT_SYNDIC) ou rester sur le no-op informatif actuel ?
- Gestion des annexes : qui répare le drift fn_annexe_1..5 et impose-t-on un blocage d'envoi tant que la convocation est incomplète ?
- Faut-il préserver le mapping URGENTE/MIXTE→extraordinary/special ou introduire de vrais types AG distincts dans le schéma ?

## Ventes / Etat date / Mutations

### Ecrans
- **Hub Ventes & Impayes (dashboard)** (`/ventes-impayes`) - Tableau de bord d'entree : KPIs (ventes en cours/finalisees, impayes en cours, montant total impayes), ventes recentes, impayes critiques, activite recente, actions rapides. Lit les ventes via VentesProvider/useSalesList (Supabase) et les impayes via lib/impayes/api, avec FALLBACK sur donnees mockees en dur si rien ne charge.
- **Liste des Mutations (canonique)** (`/ventes-impayes/ventes`) - Ecran canonique du domaine. Liste des mutations (cartes MutationCard) avec stats (en cours / finalisees / etats dates manquants), recherche (lot/vendeur/acquereur/notaire), filtres statut + type, bouton Nouvelle mutation (ouvre CreateMutationModal). Source = vue v_mutations_overview via useMutations.
- **Detail Mutation** (`/ventes-impayes/ventes/[id]`) - Pilote du cycle de vie d'une mutation : header + badge statut, alerte delai pre-etat (Art.20, 15j), colonne Actions (genere pre/final, envoi notaire, signe, valider, annuler), timeline workflow, info lot, parties (vendeur/acquereur/notaire), etats dates (EtatDateViewer V2 + PDF + archivage GED), notes. Source = useMutationDetail (v_mutations_overview + v_etat_date_latest).
- **Nouvelle vente (legacy, mocke)** (`/ventes-impayes/ventes/nouvelle`) - Formulaire de vente DETAILLE (lot, vendeur, acquereur saisie/selection, notaire, dates compromis/acte/art6, documents a generer, ordres de service, notes). PROBLEME : alimente par MOCK_COPROPRIETAIRES=[] et MOCK_LOTS=[] vides en dur, submit simule (setTimeout) puis createVente. Doublon fonctionnel de CreateMutationModal.
- **Etats dates Finance (redirige)** (`/finance/etats-dates`) - Ancien moteur d'etat date Finance (100% mocke). Devenu une simple redirect() vers /ventes-impayes/ventes. Le code mort derriere (features/finance/datedStates, useEtatsDate, types/models/etat-date) est marque a supprimer (B4) mais toujours present et exporte.
- **Impayes (redirige)** (`/ventes-impayes/impayes`) - Ancien ecran impayes du segment ventes ; redirect() vers /contentieux/impayes (canonique). Le module impayes complet vit sous components/features/ventes-impayes/impayes mais releve du domaine Contentieux/Impayes, pas Ventes/Etat date.

### Actions cles
- Creer une mutation (CreateMutationModal -> createMutation -> INSERT mutations + upsert_mutation_notary pour le tiers notaire + buyer_draft jsonb, status=draft)
- Generer le pre-etat date (RPC create_etat_date_snapshot type=pre -> fige payload immuable via generate_etat_date_payload, passe status draft->pre_etat_generated)
- Generer l'etat date final (RPC create_etat_date_snapshot type=final -> status -> etat_generated)
- Telecharger le PDF de l'etat date (generateEtatDatePDF V2 : header, 3 parties art.5, annexe quote-part, signature syndic, certificat art.20-II) + archivage automatique en GED (autoFileToGED, categorie etat_date, fire-and-forget)
- Envoyer le dossier au notaire (sendToNotary -> status sent_to_notary + upsert_mutation_step envoi_notaire completed)
- Marquer l'acte signe (SignatureModal -> updateMutation status=signed + signature_date)
- Valider la mutation / transfert de propriete (ValidationModal -> RPC validate_mutation : bascule lot_owners, AUCUNE ecriture grand livre, le fonds ALUR 450-5 reste attache au lot ; saisie acquereur si pas de buyer_name)
- Avertissement solde vendeur avant validation (getLotBalance45x via RPC get_lot_balance_45x : affiche debiteur/crediteur, n'empeche jamais la validation)
- Annuler une mutation (cancelMutation -> status=cancelled, possible tant que pas validee/annulee)
- Filtrer / rechercher les mutations (par statut, type, texte lot/vendeur/acquereur/notaire)
- Relance groupee des impayes (depuis le hub, ouvre RelanceModal) -- releve surtout du domaine impayes
- Generer email notaire (lib/utils/email-vente : substitution de variables sur template) -- utilitaire present, non cable a un ecran vivant

### Formulaires & modales
- CreateMutationModal (features/ventes/components) : lot + type mutation + acquereur libre (nom/email/societe) + notaire (nom/email/ref) + notes. Modal canonique de creation.
- ValidationModal (features/ventes/detail) : confirmation transfert propriete + avertissement solde vendeur (debiteur/crediteur) + sous-formulaire acquereur (prenom/nom/email) si buyer_name absent.
- SignatureModal (features/ventes/detail) : saisie date de signature de l'acte.
- MutationToast (features/ventes/detail) : feedback succes/erreur des actions.
- NouvelleVenteForm + NouvelleVenteConfirmModal (components/features/ventes-impayes, route /nouvelle) : gros formulaire mocke, doublon de CreateMutationModal.
- RelanceModal / VentesExportModal / VenteHistoryModal (components/features/ventes-impayes) : relance impayes, export, historique.
- EditVenteModal / SendToNotaireModal / SignDocumentModal / ImportSignature / WorkflowConfirmModal / LinkOrdreServiceModal / Toast (components/features/ventes/VenteDetail/modals) : suite de modales d'un detail vente PARALLELE et NON BRANCHE (code mort).
- EtatDateJsonViewer : toggle d'affichage du JSON brut du payload (debug/transparence).

### Backend touche
- Tables : mutations (0019, buyer_draft jsonb, notaire_id FK tiers, status enum mutation_status), mutation_steps, etat_date_snapshots (payload immuable), lot_owners (bascule a la validation), tiers (is_notary), lots, coproprietaires
- Vues : v_mutations_overview (liste enrichie, 0054), v_mutation_detail (detail + steps + snapshots), v_etat_date_latest (dernier snapshot par type), v_lots_with_owners (tantiemes)
- RPC etat date / mutation : generate_etat_date_payload (0031/0076/0080, lecture seule art.5 3 parties + identite gelee), create_etat_date_snapshot (0031, fige + avance workflow), validate_mutation (0031/0076, bascule lot_owners, 0 ecriture GL, fallback buyer_owner_id), upsert_mutation_step (0031), upsert_mutation_notary (0064, find-or-create tiers notaire), initialize_mutation_steps, record_mutation_opposition
- RPC finance lue : get_lot_balance_45x (0082, solde reel 45x du lot pour avertissement), create_ledger_transaction (appelee uniquement par la fonction MORTE createSaleCompletionLedgerEntry)
- Enum : mutation_status {draft, pre_etat_generated, etat_generated, sent_to_notary (ajoute 0079), signed, validated, cancelled} ; mutation_type {sale, donation, succession, other}
- Edge Function : get_document_signed_url (telechargement PDF GED du viewer legacy V1). NB : les edge functions generate_etat_date / validate_mutation N'EXISTENT PAS, tout passe par RPC.
- Impayes (hub) : lib/impayes/api listUnpaidWithReminders (domaine impayes, consomme par le dashboard ventes)

### Issues connues
- DRIFT ENUM STATUT : lib/sales/api.ts (DbMutationStatus + createEtatDateSnapshot) utilise 'final_etat_generated' qui N'EXISTE PAS dans l'enum DB (0003/0079 = 'etat_generated'). Un appel a salesApi.createEtatDateSnapshot ecrirait un statut invalide. Heureusement cette fonction est morte (chemin canonique = RPC) -> code mort + piege a copie.
- DEUX domaines 'mutation status' divergents : features/ventes/domain/types.ts (MutationStatus, labels FR) vs lib/sales/api.ts (DbMutationStatus). MUTATION_STATUS_LABELS mappe 'pre_etat_generated'->'Pre-etat envoye' et 'signed'->'En attente acte' (labels trompeurs vs valeurs).
- CODE MORT MASSIF non branche : components/features/ventes/VenteDetail/* (20+ fichiers : VenteWorkflow, VenteChecklist, VenteTabs, VenteDocuments, VenteHistorique, 7 modals) n'est importe par AUCUNE route app (seulement par mock-data + PDFs + le service de validation). Le detail canonique est features/ventes/detail.
- CODE MORT : src/lib/services/vente-workflow-validation.service.ts (workflow V2 complet de validation par etapes) repose sur les types VenteDetail morts ; calculerSoldeVendeur() retourne 0 en dur (TODO mock).
- CODE MORT a supprimer (B4 jamais fait) : features/finance/datedStates (encore exporte via features/finance/index.ts), hooks/modules/useEtatsDate, types/models/etat-date ; export HTML via window.print, 0 persistance.
- PAGE /ventes/nouvelle MOCKEE : MOCK_COPROPRIETAIRES=[] et MOCK_LOTS=[] vides en dur (TODO Replace with Supabase), submit factice (setTimeout 1s/2s). Doublon de CreateMutationModal. useNouvelleVenteForm appelle createVente (VentesProvider) mais sans vraies donnees lot/vendeur.
- FALLBACK MOCK en prod sur le hub : dashboard/domain/constants.ts (IMPAYES_CRITIQUES 'M. Simon'/'Mme Lopez', montants 12450/65j) sert de fallback affiche si le fetch impayes echoue ou est vide -> risque d'afficher de fausses donnees a un vrai syndic.
- SECRETS/DEFAULTS EN DUR : lib/utils/email-vente.ts DEFAULT_SYNDIC ('Jean MARTIN', syndic@coproflex.fr, tel bidon) et DEFAULT_COPROPRIETE ('Residence Les Jardins', adresse Paris) avec TODO non resolu.
- ERREURS AVALEES : useMutationDetail.loadSellerBalance catch{} silencieux (pas d'avertissement si l'API echoue) ; VentesProvider.updateDocumentStatus / addHistorique sont des no-op MVP (commentaires); plusieurs console.error dans lib/sales/api.ts (interdit par conventions 'jamais console.log').
- DIVERGENCE D'APPEL validate_mutation : mutationsApi.validateMutation passe p_buyer_* (7 params) tandis que useSalesMutations.validateSale ne passe que 3 params -> deux conventions d'appel pour une RPC overloadee, fragile.
- DOUBLON DE PILE DE DONNEES : VentesProvider+useSalesData+useSalesMutations (mappe DB->Vente legacy) ne sert plus qu'a alimenter le hub en LECTURE ; toutes ses methodes d'ecriture (createVente, advanceWorkflow, updateStatut...) ne sont declenchees nulle part dans une route vivante.
- DEAD LINK potentiel : EtatDateViewer onViewDocument pousse vers /documents/ged?doc=ID (viewer legacy V1) ; le viewer V2 n'expose plus de document_id de la meme facon (PDF genere client + archive async).
- Timeline du detail : libelles ('Notifiee','Pre-etat genere'...) recodes a la main dans page.tsx, partiellement desynchronises des labels de MUTATION_STATUS_LABELS.

### Besoins refonte (manager-first)
- Unifier en UN SEUL parcours mutation : supprimer la pile legacy (components/features/ventes/VenteDetail, vente-workflow-validation.service, /nouvelle mocke, features/finance/datedStates, useEtatsDate, types/models/etat-date, VentesProvider+useSalesData+useSalesMutations s'ils ne servent qu'au hub) et ne garder que features/ventes + RPC. Migration a moitie faite = piege a copie.
- Vue gestionnaire 'pipeline mutations' type kanban par statut (Notifiee / Pre-etat / Etat final / Notaire / Signe / Validee) avec montants et alerte delai Art.20 (15j) en tete -- aujourd'hui c'est une simple liste de cartes.
- Cockpit detail manager-first : faire ressortir le SOLDE VENDEUR reel (45x) et le devenir des sommes (retenue notaire / reprise acquereur) des l'ouverture, pas seulement dans la modale de validation ; checklist des pieces obligatoires (PV AG, reglement, carnet entretien, diagnostics, certificat art.20) reellement cablee a la GED.
- Saisie acquereur structuree : choisir un copro existant OU saisir un tiers, avec creation reelle du coproprietaire a la validation ; aujourd'hui buyer_draft jsonb + saisie libre, sans annuaire.
- Generation et envoi reel du dossier notaire : email-vente.ts existe mais n'est pas cable a un envoi (Edge/SMTP) ni aux vraies coordonnees syndic/copro -> a brancher sur les parametres du cabinet.
- Cloture du compte vendeur / apurement a la mutation : modeliser explicitement le sort du solde 45x au transfert (le syndic attend une etape 'cloture compte vendeur' tracee), aujourd'hui purement informatif.
- Tracabilite : journal d'evenements de la mutation (qui a genere quoi, quand) persistant (addHistorique est un no-op) ; horodatage et auteur des snapshots exposes dans l'UI.
- Etat date : exposer clairement pre-etat vs etat date definitif et l'opposition art.20-II (record_mutation_opposition existe en RPC mais aucune UI ne l'utilise).
- Coherence visuelle : detail-vente.module.css utilise des couleurs en dur (#fee2e2, #92400e...) hors design-system sombre -> repasser sur les tokens CSS.

### Questions ouvertes
- Garde-t-on l'opposition Art.20-II (record_mutation_opposition est cablee cote DB mais aucune UI) ? Si oui, ou l'exposer dans le parcours (apres envoi notaire ?).
- La cloture/apurement du compte vendeur a la mutation doit-elle generer une ecriture (transfert du solde 45x vers l'acquereur ou regularisation) ou rester un pointage informatif ? Aujourd'hui validate_mutation ne poste rien.
- Le fonds travaux ALUR (450-5) reste attache au lot et suit l'acquereur (decision actee) : confirme-t-on qu'il n'y a JAMAIS de remboursement vendeur ni d'ecriture au transfert ?
- Faut-il bloquer la validation quand le vendeur est debiteur, ou conserver le simple avertissement non bloquant actuel (choix metier expert) ?
- Acquereur = nouveau coproprietaire cree automatiquement a la validation, ou rattachement a un copro existant via annuaire ? Definit le modele buyer_draft vs lien lot_owners.
- Quelles pieces sont OBLIGATOIRES dans le dossier notaire et doivent bloquer l'envoi (PV AG, reglement, carnet entretien, diagnostics) ? La checklist legacy existait mais n'est pas branchee.
- Le pre-etat date est-il un livrable distinct envoye au notaire (delai 15j Art.20) ou un brouillon interne ? Impacte le workflow et les statuts.
- Doit-on supprimer entierement la pile legacy avant la refonte (risque de regressions du hub qui lit encore via VentesProvider) ou migrer le hub d'abord vers useMutations ?
- Le hub /ventes-impayes melange Ventes et Impayes (2 domaines) : on scinde en deux espaces ou on garde un hub combine ?

## Maintenance / Prestataires (carnet d'entretien, contrats, annuaire, ordres de service, PPT, assurances)

### Ecrans
- **Hub Maintenance** (`/maintenance`) - Page d'aiguillage 4 cartes (Carnet d'entretien, Contrats, Annuaire professionnels, Ordres de service). Réutilise documents.module.css. Note: la carte 'Contrats' parle d'assurances mais l'onglet assurances vit DANS le carnet, pas dans /contracts.
- **Carnet d'entretien** (`/maintenance/logbook`) - Cœur du carnet légal: infos copro éditables, KPIs (en cours/planifiées/travaux/coût/urgences), liste/édition interventions (courantes vs travaux importants), assurances et contrats liés. Données Supabase via useLogbook (logbook_entries) + contrats via store mock.
- **Détail/édition d'une assurance** (`/maintenance/logbook/assurances/[id]`) - Fiche assurance (type, assureur, garanties, infos complémentaires, documents). Édition inline + ajout/suppression documents.
- **Liste des contrats** (`/maintenance/contracts`) - TopBar + filtres (recherche/statut) + bandeau syndic + KPIs + timeline échéances + liste. Renouvellements en attente. ATTENTION: liste alimentée par store mock contracts.service tandis que le détail lit Supabase (double source).
- **Nouveau contrat** (`/maintenance/contracts/new`) - Formulaire création contrat (libellé, n°, type→work_domain, prestataire, dates, tacite reconduction, préavis, coût, PDF obligatoire). Écrit dans table contracts via createContract + upload PDF dans la GED.
- **Détail d'un contrat** (`/maintenance/contracts/[id]`) - Fiche contrat: bloc prestataire (appel/email/urgence), infos principales, pièces jointes, historique interventions, alertes échéance, bannière renouvellement en attente (localStorage). Actions Contacter/Modifier/Résilier.
- **Hub Annuaire/Prestataires** (`/maintenance/providers`) - Vue regroupée 3 catégories (Copropriété / Syndic / CoproFlex) + recherche + export CSV + ajout prestataire. Données Supabase (tiers via v_providers_overview).
- **Prestataires de la copropriété** (`/maintenance/providers/copro`) - Tableau filtrable/triable des prestataires category=copropriete (déjà intervenus). Voir/Éditer/Supprimer. Bouton Ajouter renvoie vers /providers?add=copro (param non consommé).
- **Prestataires du syndic** (`/maintenance/providers/syndic`) - Idem copro mais category=syndic. Contient des libellés sans accents (drift de localisation).
- **Marketplace CoproFlex** (`/maintenance/providers/coproflex`) - Base nationale de prestataires certifiés: recherche, filtres (CP/domaine/certifiés), tri (note/avis), sélection multiple (max 5), comparaison, demande de devis. Données = providers category=coproflex (avis et tarifs encore vides).
- **Détail d'un prestataire** (`/maintenance/providers/[id]`) - Fiche: coordonnées, stats (interventions/note/contrats), domaines, certifications, contrats liés, historique interventions + modale détail. Modifier/Supprimer/Ajouter intervention. 100% styles inline.
- **Liste des ordres de service** (`/maintenance/service-orders`) - Liste + stats + filtres (recherche/statut) + aperçu email. Fusion Supabase (service_orders) + fallback localStorage. Suppression, navigation détail/création.
- **Nouvel ordre de service** (`/maintenance/service-orders/new`) - Wizard OS: type (Classique/Contractuel), catégorie intervention, prestataire/contrat, détails, contact sur place (copropriétaire), email, pièces jointes. Brouillon ou Envoi → service_orders (RPC generate_service_order_number), fallback localStorage.
- **Détail/pipeline d'un ordre de service** (`/maintenance/service-orders/[id]`) - Pipeline 8 étapes cliquables (BROUILLON→CLÔTURE), panneau de transition avec checklist + champs conditionnels (date/montant/refus/note), historique dépliable, pièces jointes (upload GED), email, facture liée dérivée. Boutons Email/PDF du topbar morts.
- **PPT (redirection)** (`/maintenance/ppt`) - redirect() pur vers /conformite/ppt (le Plan Pluriannuel de Travaux a déménagé dans le module Conformité). N'affiche rien.

### Actions cles
- Carnet: créer une intervention (logbook_entries via createEntry, copro_id injecté du contexte)
- Carnet: éditer une intervention existante (updateEntry)
- Carnet: éditer et sauvegarder les infos de la copropriété (handleSaveInfo)
- Carnet: filtrer interventions par KPI/statut/prestataire/équipement/année + bascule vue courantes/travaux importants
- Carnet: exporter (PDF complet / Excel / PDF acquéreurs) — génère des fichiers .txt/.csv (pas de vrai PDF)
- Assurance: éditer garanties + infos, ajouter/supprimer documents
- Contrats: créer un contrat avec PDF obligatoire (createContract → table contracts + uploadDocument GED)
- Contrats: modifier un contrat (updateContract)
- Contrats: résilier un contrat (terminateContract → status terminated, reason)
- Contrats: renouveler/confirmer/annuler un renouvellement (status to_renew/active, persistance Supabase + fallback localStorage)
- Contrats: contacter le prestataire (ContactProviderModal), appeler/emailer (liens tel:/mailto:)
- Contrats: ajouter/supprimer/télécharger pièces jointes (LOCAL uniquement, non persisté; download = faux .txt)
- Contrats: export liste (PDF/Excel/Acquéreurs) en .txt/.csv; télécharger contrat syndic (toast factice avec setTimeout)
- Prestataires: ajouter un prestataire (createProvider → tiers is_provider, domaines→work_domain UUID)
- Prestataires: modifier (updateProvider), supprimer (deleteProvider, confirm natif)
- Prestataires: ajouter une intervention depuis la fiche prestataire (createEntry)
- Prestataires: export annuaire CSV
- Marketplace: sélectionner jusqu'à 5 prestataires, comparer, demander des devis (handleDevisSubmit = toast seulement, aucun envoi réel)
- OS: créer en brouillon ou envoyer (createOrder + RPC generate_service_order_number, fallback localStorage)
- OS: faire avancer le statut via pipeline (update_service_order_status RPC + service_order_events)
- OS: annuler un OS (status cancelled), supprimer (delete_service_order RPC)
- OS: uploader des pièces jointes (uploadDocument GED lié à service_order_id)
- OS: aperçu et envoi d'email au prestataire (sendOrderEmail = passe le statut à sent, n'envoie pas de mail)
- OS: rattachement facture dérivé de supplier_invoices (FK service_order_id), badge Facturé

### Formulaires & modales
- AddContractModal / EditContractModal (features/maintenance/contracts) + ContractEditModal sur le détail
- EditSyndicModal + ManageSyndicDocumentsModal (contrat syndic)
- ResiliationModal (résiliation avec template/mode d'envoi recommandé) + ContactProviderModal
- Formulaire 'Nouveau contrat' plein écran (PDF obligatoire) + ProviderSelector
- Modale détail intervention (inline dans providers/[id]) + AddInterventionModal + EditProviderModal
- AddProviderModal (hub) — ajout simplifié
- DevisModal + CompareModal + CoproFlexProviderCard (marketplace)
- Logbook: LogbookModals (EquipementModal, DocumentModal, FormulaireGarantiesAssurance, modale 'voir intervention'), ToastCreation, EquipementCombobox, BarreFiltresInterventions
- OS new: ServiceOrderTypeSelector, ServiceOrderCategorySection, ServiceOrderProviderSection (alerte cohérence métier/prestataire), ServiceOrderDetailsSection, ServiceOrderContactSection (recherche copropriétaire), ServiceOrderEmailSection, ServiceOrderAttachmentSection
- OS detail: panneau d'action de transition (checklist + champs conditionnels), DocumentViewerModal, EmailPreviewModal, EmailEditor, ContractSelector, AttachmentUpload, ListePiecesJointesOS
- Ajout pièce jointe contrat (formulaire inline nom+type) sur contracts/[id]
- Confirmations natives window.confirm() pour suppressions (prestataires, OS, pièces jointes)

### Backend touche
- Tables: tiers (prestataires, is_provider=true, category externe pour coproflex), contracts (label/reference/tiers_id/observations/domain_id), logbook_entries, service_orders, service_order_events, supplier_invoices (FK service_order_id), documents (GED), coproprietaires (contact sur place), work_domain (référentiel slugs→UUID)
- Vues: v_providers_overview, v_contracts_overview, v_contracts_alerts, v_service_orders_overview (avec invoices_count/invoiced_total/supplier_invoice_id), v_logbook_overview, v_logbook_alerts, v_maintenance_stats
- RPC: generate_service_order_number, update_service_order_status, delete_service_order
- Lib d'écriture canonique: src/lib/maintenance/writes.ts (createProvider/createContract/createLogbookEntry, translateProviderWrite/translateContractWrite, resolveDomainIds qui échoue fort si slug non seedé)
- Hooks data: src/hooks/modules/useMaintenanceData.ts (useProviders/useContracts/useServiceOrders/useLogbook/useMaintenanceStats — client Supabase non typé via 'as any')
- GED: src/lib/documents/api.ts uploadDocument (lié contractId / serviceOrderId, sourceModule maintenance)
- Store mock parallèle: src/lib/services/contracts.service.ts (état module-level + useSyncExternalStore, loadContracts/loadSyndicContract lisent v_contracts_overview mais l'écriture renouveler/résilier reste en mémoire)
- localStorage: 'coproflex_pending_renewals', 'newOrdresService', 'custom_ordres_service' (fallbacks hors-ligne)

### Issues connues
- DOUBLE SOURCE DE VÉRITÉ contrats: /maintenance/contracts affiche le store mock (contracts.service via useSyncExternalStore) tandis que /contracts/[id] lit Supabase. handleAddContrat/handleSaveContrat écrivent dans le mock PUIS 'sync' Supabase en best-effort (erreurs avalées par console.error). Risque d'incohérence liste↔détail (useContracts.ts:113-160, useContractsPage.ts).
- Bouton MORT: 'Ajouter un professionnel' sur /maintenance/directory n'a aucun onClick (directory/page.tsx:33).
- Boutons MORTS: 'Email' et 'PDF' dans le topbar de /service-orders/[id] sont sans onClick (service-orders/[id]/page.tsx:231-232).
- PAGE DOUBLON: /maintenance/directory réimplémente l'annuaire (useProviders direct, styles directory.module.css) en parallèle du hub /maintenance/providers — deux annuaires concurrents, le directory n'est lié à aucun bouton d'ajout fonctionnel.
- Pièces jointes contrat NON PERSISTÉES: contracts/[id] gère pieceJointes en useState local; ajout/suppression perdus au refresh; le téléchargement génère un faux .txt récapitulatif (contracts/[id]/page.tsx:141-152, useContractDetailPage.ts:209-227).
- Exports/téléchargements FACTICES: contracts.service handleTelecharger et handleExport produisent des .txt/.csv au lieu de vrais PDF; handleDownloadSyndicPDF ne fait qu'un setTimeout + toast (useContracts.ts:189-271).
- Renouvellement contrat via localStorage côté détail (clé coproflex_pending_renewals) + window.location.reload() après confirmation (contracts/[id]/page.tsx:93-116) — non synchronisé avec la persistance Supabase du hook liste.
- 'Demander des devis' marketplace = handleDevisSubmit ne fait qu'un toast, aucune création de demande en base (useCoproFlexPage.ts:83-87); avis et tarifs codés en dur à [] ('future milestone').
- OS sauvegarde silencieuse en localStorage si Supabase échoue, mais l'utilisateur voit '✓ envoyé' (useNewServiceOrderPage handleSaveDraft/handleSend) — succès trompeur; idem handleGenerateOrder dans useContractsPage qui au moins signale l'échec.
- OS detail handleSaveEdit ne persiste PAS la description en base: il met seulement à jour l'état local + alert('✓ Modifications enregistrées') (useServiceOrderDetailPage.ts:266-288) — faux positif d'enregistrement.
- OS detail handleStatusUpdate n'envoie ni montant réel ni raison de refus de façon fiable (passe montantFinal en quotedAmount; refusalReason jamais transmis au RPC); CLÔTURE archive via simulateGedArchive (mock, pas de vraie archive GED).
- Mapping de statuts FRAGILE et redondant: PIPELINE_STEPS/STATUS_TO_PIPELINE/VALID_TRANSITIONS dupliqués entre page OS detail et le hook, avec doublons ACCEPTE/EN_ATTENTE_PRESTATAIRE et PLANIFIE/INTERVENTION_PROGRAMMEE à dédupliquer par label.
- VIOLATION conventions design: providers/[id], contracts/[id], service-orders/new utilisent massivement des styles inline (style={{}}) et des couleurs/valeurs en dur, alors que CLAUDE.md/design-system interdisent les styles inline.
- DRIFT localisation EN/FR: providers/syndic/page.tsx contient des libellés sans accents ('Alphabetique', 'Derniere intervention', 'telephone', 'trouve') vs copro/page.tsx accentué.
- Type de contrat: TYPE_TO_DOMAIN (new) mappe 'securite'→absent et 'menage'→menage; loadContracts mappe securite→AUTRE — perte d'information sur les contrats sécurité; eau/securite non dans TypeContrat UI complet.
- useContracts (mock) et useContractsSupabase coexistent: useNewServiceOrderPage et useContractDetailPage utilisent la version Supabase, mais la liste utilise la version mock — deux 'useContracts' homonymes prêtent à confusion.
- avis CoproFlex et certifications/tarif/disponibilité du prestataire renvoient null/[] (non présents dans v_providers_overview) — la marketplace et la fiche affichent des stats partiellement vides.
- Param d'URL ?add=copro/?add=syndic (boutons Ajouter des sous-listes) et ?edit=true (édition prestataire) ne sont consommés que partiellement: /providers ne lit pas 'add', le hub ouvre toujours AddProviderModal sans pré-catégorie.
- createUntypedClient = createClient() as any et plusieurs (supabase as any) — typage Supabase contourné dans tout useMaintenanceData.

### Besoins refonte (manager-first)
- Source unique pour les contrats: supprimer le store mock contracts.service et brancher la liste sur les mêmes vues Supabase que le détail; le renouvellement/résiliation doivent passer par un statut persisté unique (pas de localStorage).
- Unifier l'annuaire: fusionner /maintenance/directory dans le hub /providers (ou supprimer directory) et rendre l'ajout fonctionnel partout; une seule navigation copro/syndic/CoproFlex avec filtres.
- GED réelle pour les pièces jointes de contrats: persister via documents (comme les OS) et offrir un vrai téléchargement/visionnage du PDF d'origine, pas un récapitulatif .txt.
- Vrais exports: générer PDF (jsPDF déjà dans la stack) pour la liste de contrats, le contrat syndic et l'annexe acquéreurs (annexe légale des contrats en cours) au lieu de fichiers texte.
- OS manager-first: vue Kanban par statut + pipeline, dérivation automatique du coût réalisé depuis la facture liée (supplier_invoices), envoi d'email RÉEL au prestataire (Edge function) avec accusé, et persistance fiable de l'édition de description.
- Carnet d'entretien légal complet: rattacher explicitement le carnet d'entretien obligatoire (décret 2001-477), l'échéancier des contrôles réglementaires (ascenseur, chaufferie, extincteurs, électricité, gaz, DTA) avec alertes d'échéance, et l'historique des travaux votés en AG (lien AG→carnet).
- Plan Pluriannuel de Travaux (PPT loi Climet/ALUR): aujourd'hui simple redirection — il faut un vrai module relié au fonds travaux ALUR et aux décisions d'AG; clarifier s'il reste dans Conformité ou revient dans Maintenance.
- Cohérence prestataire↔intervention↔contrat↔facture: une seule fiche prestataire agrégeant interventions (logbook), contrats, OS et factures + total dépensé sur l'année (déjà prévu totalAmountYear=null) pour piloter la relation fournisseur.
- Assurances: sortir les assurances du carnet vers une section dédiée 'Assurances' (multirisque immeuble, RC, dommages-ouvrage) avec suivi des garanties, sinistres et échéances de prime, alignée sur la carte 'Contrats' du hub qui les promet déjà.
- Marketplace CoproFlex: brancher les avis vérifiés et la demande de devis sur de vraies tables/flux (création de RFQ, réponses, comparatif), ou la masquer tant que c'est non fonctionnel pour éviter l'effet démo.
- Supprimer tous les fallbacks localStorage silencieux et les alert()/confirm() natifs au profit de toasts/modales cohérentes et d'états d'erreur explicites; bannir les styles inline (CSS Modules).
- Typage strict: retirer les 'as any' du client Supabase via types générés à jour, et un référentiel de statuts/domaines unique partagé front+DB (fin des triples mappings).

### Questions ouvertes
- Le carnet d'entretien doit-il rester la 'maison-mère' des assurances et contrats liés, ou éclate-t-on en modules distincts (Carnet / Contrats / Assurances) avec des vues croisées ?
- Le PPT revient-il dans Maintenance ou reste-t-il définitivement dans /conformite ? Quel est le lien attendu avec le fonds travaux ALUR et les votes d'AG ?
- Quelle est LA source de vérité contrats à conserver: la table 'contracts' (colonnes label/reference/tiers_id) ou un modèle aligné sur 'tiers'/work_domain ? Le store mock doit-il disparaître totalement ?
- Renouvellement de contrat: doit-il créer un nouveau contrat (versioning/avenants) ou prolonger le même enregistrement ? Quel workflow d'accord du prestataire (statut intermédiaire to_renew/pending) et quelle trace ?
- Envoi des ordres de service et des courriers de résiliation: envoi email/LRE réel attendu (Edge/provider d'envoi) ou simple génération de document à envoyer manuellement ? Faut-il un accusé/recommandé électronique ?
- Marketplace CoproFlex: est-ce une vraie place de marché multi-cabinets (avis, devis, mise en relation) à construire, ou une vitrine à geler pour la V1 ?
- Quels contrôles réglementaires (et périodicités) doivent être pré-cadrés dans le carnet pour générer automatiquement les alertes d'échéance et les OS associés ?
- Le coût/montant 'réalisé' d'un OS doit-il être saisi manuellement (montantFinal) ou strictement dérivé des factures fournisseurs (supplier_invoices) pour rester cohérent avec la compta d'engagement ?
- Faut-il rattacher chaque intervention/OS/contrat à une clé de répartition / un poste budgétaire pour préparer l'imputation comptable (engagé→réalisé) dès la maintenance ?
- L'annuaire 'prestataires du syndic' est-il partagé entre toutes les copros d'un même cabinet (multi-cabinet) ou cloisonné par copro ? Impacte le modèle tiers et la RLS.

## GED / Documents

### Ecrans
- **Hub Documents** (`/documents`) - Page d'accueil du domaine: 5 cartes de navigation (GED, Grand livre, Balance, Depenses, Annexes). Pure navigation, aucune donnee. Melange GED documentaire et sorties comptables sous un meme parapluie.
- **GED - Mes documents** (`/documents/ged`) - Ecran central de la GED. Vue scindee (split-view): sidebar a 3 onglets (Dossiers arborescents N niveaux / Recents / Favoris) + panneau de detail avec apercu (iframe PDF / img). Upload, dossiers CRUD, liaison entites, droits d'acces, favoris, suppression. C'est le seul ecran GED reellement cable.
- **Releve general des depenses** (`/documents/expenses`) - Annexe comptable: charges classe 6 + produits classe 7 par compte, recap TVA, resultat, synthese N/N-1, rapport de coherence budget. ENTIEREMENT alimente par des donnees mock vides (MOCK_DEPENSES_BUDGETS = []), donc ecran vide en prod.
- **Grand livre / Balance / Cloture / Annexes (liens hub)** (`/documents/ledger, /documents/balance, /documents/closing, /documents/annexes`) - Sorties comptables listees dans le hub Documents mais relevant du domaine Finance/Comptabilite. Hors perimetre GED documentaire stricto sensu mais accessibles depuis l'entree Documents.

### Actions cles
- Uploader un ou plusieurs documents (drag&drop ou selection) avec categorie, dossier cible, confidentialite, tags, description (UploadDocumentModal -> documentsApi.uploadDocument -> Storage bucket 'ged' + insert table documents)
- Telecharger un document (download blob signe depuis Storage)
- Ouvrir/previsualiser un document (iframe PDF, img, ou DocumentViewerModal avec historique de versions)
- Creer un dossier ou sous-dossier (arborescence N niveaux, couleur, ordre)
- Renommer un dossier (inline edit)
- Supprimer un dossier (les documents sont 'deplaces a la racine' selon le texte du modal - comportement non garanti cote API)
- Supprimer un document (soft-delete status='deleted', bloque si deletion_blocked / conservation legale)
- Marquer/demarquer un document en favori (toggle is_starred, optimistic update + rollback)
- Lier un document a une entite metier (facture, contrat, AG, ordre de service, vente, coproprietaire...) avec detection auto par nom/categorie (LinkModal)
- Gerer les droits d'acces / niveau de confidentialite d'un document (AccessRightsManager) - MAIS persiste seulement en memoire (mock)
- Rechercher un document (barre globale fuzzy + filtre dossiers en sidebar)
- Filtrer la liste des dossiers en sidebar
- Classement automatique de PDF generes par d'autres modules dans la GED (auto-file-ged.service: convocations, PV, factures, etats datees, ordres de service, etc.)
- Cote Depenses: filtrer par statut (toutes/validee/en attente/non validee), afficher le rapport de coherence, exporter Excel/PDF (boutons morts)

### Formulaires & modales
- UploadDocumentModal - import multi-fichiers, max 25 Mo, detection auto de categorie (detect-category), FolderTreeSelect avec creation de dossier a la volee, choix confidentialite/tags/description
- Modal 'Nouveau dossier / Nouveau sous-dossier' (inline dans ged/page.tsx) - simple champ nom
- Modal de confirmation 'Supprimer le dossier'
- Modal de confirmation 'Supprimer le document' (irreversible)
- LinkModal - liaison document<->entite, suggestion auto + grille manuelle des 9 modules liables + liaisons existantes avec liens de navigation
- AccessRightsManager - 3 onglets (Niveau d'acces / Utilisateurs autorises / Historique), 4 niveaux (public/CS/syndic/confidentiel) - persistance MOCK uniquement
- DocumentViewerModal (ui/) - visionneuse plein ecran avec historique de versions (getDocumentVersions)
- Renommage de dossier inline (input avec Enter/Escape/blur), pas un modal

### Backend touche
- Storage bucket 'ged' (upload, createSignedUrl, download)
- Table documents (canonique) - insert/update/soft-delete via toCanonicalDocumentRow; colonnes visibility, source_module, status, is_starred, deletion_blocked
- Table document_folders - CRUD dossiers
- Table document_relations (canonique) - liens document<->entite (entity_type/entity_id/relation_kind)
- Vue v_documents_with_folder - lecture documents (shape legacy: confidentiality, version, is_current_version)
- Vue v_folders_with_counts - dossiers + compteurs
- Vue v_documents_stats - statistiques par copro
- Vue v_recent_documents - documents recents (getRecentDocuments, non appele par l'UI actuelle)
- Vue v_documents_by_category (non appelee par l'UI)
- Vue v_documents_expiring (non appelee - documentsNeedingAttention code en dur a vide)
- Vue v_document_versions - historique versions (utilise par DocumentViewerModal)
- Table coproprietaires - lecture pour AccessRightsManager (liste utilisateurs)
- Table profiles - lecture du nom utilisateur (useDocumentPermissions)
- Trigger trg_document_soft_delete_guard (0052) - refuse suppression si conservation legale
- Enums canoniques: document_visibility, document_source, document_entity_type, document_relation_kind (mappes depuis vocabulaire legacy via tables de traduction dans api.ts)

### Issues connues
- CODE MORT MASSIF: components/index.ts exporte 16 composants (Header, Checklist, VersioningAlerts, SearchBar, AdvancedFilters, ModeSwitch, DropZone, Breadcrumb, Toolbar, ActiveFilters, FolderGrid, SearchResults, Pagination, EmptyState, TechnicalDocumentsSection) mais SEUL LinkModal est importe par ged/page.tsx. Toute une UI GED alternative (grille/liste/breadcrumb/pagination/filtres avances) est ecrite mais jamais montee.
- HOOK SUR-DIMENSIONNE NON UTILISE: useGedPageSupabase.ts expose viewMode, navigationMode, getFilteredDocuments, getPaginatedDocuments, getTotalPages, handleDrop, handleFilesSelected, navigateToFolder, handleMoveDocument, subFolders, breadcrumb, stats, etc. La page n'en consomme qu'une fraction et reimplemente sa propre logique de filtrage/arborescence (docsByFolder, SubFolderTree) en doublon.
- DROITS D'ACCES = MOCK EN MEMOIRE: useDocumentPermissions.ts utilise accessConfigsStore/accessLogsStore (objets module-level). Tout reglage de confidentialite via AccessRightsManager est PERDU au reload et N'EST JAMAIS ecrit dans documents.visibility. Securite documentaire non fonctionnelle cote persistance.
- DOUBLE SOURCE DE CONFIDENTIALITE: la confidentialite affichee vient de documents.confidentiality (DB), mais sa modification passe par updateDocumentConfidentiality (mock). Deux modeles co-existent (DocumentConfidentiality 'public/council/manager/restricted' cote API vs NiveauConfidentialite 'PUBLIC/CS_ONLY/SYNDIC_ONLY/CONFIDENTIEL' cote enums) -> drift EN/legacy non reconcilie.
- PAGE EXPENSES 100% MOCK: hooks/modules/useExpenses.ts a MOCK_DEPENSES_BUDGETS=[] + TODO 'Replace with Supabase queries' + DONNEES_N1/NB_COPROPRIETAIRES/BUDGET_PAR_POSTE en dur. Ecran toujours vide, jamais cable au grand livre reel.
- BOUTONS MORTS expenses/page.tsx: 'Export Excel' et 'Export PDF' sans handler.
- TechnicalDocumentsSection.tsx: alimente par MOCK_TECHNICAL_DOCUMENTS (donnees factices) - composant mort ET mock.
- ERREURS AVALEES: ged/page.tsx getDocumentUrl(...).catch(()=>{}) (apercu echoue en silence); handleCreateLink catch -> alert mais OK; toggleStarDocument catch silencieux (rollback sans message); auto-file-ged.service avale les echecs de liaison (catch vide).
- FEEDBACK PRIMITIF: les retours utilisateur passent par window.alert() (upload, liaison, erreurs de download) au lieu d'un systeme de toast - incoherent avec le reste de l'app.
- ENUMS LIABLES SANS CIBLE CANONIQUE: APPEL_FONDS et IMPAYE se rabattent sur 'other' (commentaire explicite dans api.ts) -> liaisons creees mais non re-navigables (linkedEntityTypeFromCanonical retourne null pour 'other'). INTERVENTION et ORDRE_SERVICE collisionnent sur 'service_order'.
- SUPPRESSION DOSSIER: le modal promet 'documents deplaces a la racine' mais deleteFolder fait un simple DELETE; selon la FK documents.folder_id (ON DELETE), les docs peuvent etre orphelins ou la suppression echouer - comportement non verifie.
- useGedPage.ts est un simple re-export de useGedPageSupabase (relique de migration mock->Supabase a nettoyer).
- FolderTreeSelect/getFolderPath/getRootFolders/getSubFolders/getRecentDocuments/getDocumentsByCategory/getExpiringDocuments: fonctions API ecrites mais non appelees par l'UI active.
- Detection d'entite par regex sur nom de fichier (linking.ts) fragile et franco-centree; liste de fournisseurs en dur (edf, engie, otis...).
- Pas de pagination ni virtualisation dans la sidebar: tous les documents/dossiers sont charges et rendus d'un coup (getDocuments sans limit) -> probleme de perf sur grosse copro.

### Besoins refonte (manager-first)
- Choisir UNE seule UI GED et supprimer l'autre: soit le split-view actuel (ged/page.tsx), soit la suite de composants grille/liste/filtres/pagination dormante. Aujourd'hui un syndic ne dispose ni de vue tableau triable, ni de filtres avances reellement actifs, ni de pagination.
- Rendre les droits d'acces REELS: persister visibility/confidentialite en base, journaliser les acces (table document_access_log), brancher la RLS. Un syndic doit pouvoir reserver un doc au CS ou a lui seul et que ce soit applique - actuellement c'est cosmetique.
- Vue 'documents reglementaires obligatoires' manager-first: tableau de bord des pieces legales avec dates de validite et alertes d'expiration (diagnostics plomb/amiante/DPE collectif, controles ascenseur/chaufferie/extincteurs, garantie decennale, DTA) - la matiere existe (TechnicalDocumentsSection, v_documents_expiring) mais est morte/mock. C'est un attendu fort du metier syndic.
- Connecter la page Depenses au grand livre reel (classe 6/7 par exercice) - aujourd'hui vide. Et integrer l'export Excel/PDF reglementaire (annexe 2 du decret 2005-240).
- Classement automatique fiabilise et visible: l'auto-file-ged existe mais en silence; offrir au gestionnaire une revue des documents auto-classes, des regles de nommage/dossiers configurables, et la liaison automatique fiable (pas de rabattement silencieux sur 'other').
- Coffre-fort coproprietaire / portail: exposer les documents publics aux coproprietaires et les docs CS au conseil syndical (cf. spec portail), ce qui suppose des droits d'acces persistes (point ci-dessus).
- Versioning expose dans l'UI principale: la table de versions existe (v_document_versions, getDocumentVersions) mais n'apparait que dans le DocumentViewerModal. Permettre remplacer/versionner un document depuis la fiche.
- Recherche serveur plein-texte (la vue a deja un search_text/textSearch french inutilise) au lieu du fuzzy client; + filtres categorie/date/taille/type reellement actifs.
- Remplacer tous les window.alert() par le systeme de toast de l'app + gerer les etats de chargement/erreur d'upload de maniere non bloquante (progression, file d'attente).
- Liaison bidirectionnelle: depuis une facture/AG/contrat voir et attacher ses pieces (getDocumentsForEntity est ecrit mais peu mobilise cote modules).

### Questions ouvertes
- Perimetre du domaine: garde-t-on le hub /documents qui melange GED documentaire et sorties comptables (ledger/balance/closing/annexes/expenses), ou separe-t-on GED (vraie gestion de fichiers) et 'Documents comptables' (rendus du grand livre) dans deux entrees distinctes ?
- Modele de confidentialite cible: on tranche entre les 4 niveaux DocumentConfidentiality (public/council/manager/restricted) cote DB et les 4 NiveauConfidentialite (PUBLIC/CS_ONLY/SYNDIC_ONLY/CONFIDENTIEL) cote front - lequel est canonique, et garde-t-on un niveau 'confidentiel par utilisateur nomme' (qui exige une table de droits par doc) ?
- Documents techniques/reglementaires: deviennent-ils une vraie entite avec dates de validite et alertes (table dediee + categorie GED), ou restent-ils de simples documents tagges ? Cela conditionne le tableau de bord d'expiration.
- Suppression: soft-delete generalise vs suppression dure ? Quelles categories sont 'conservation legale' (deletion_blocked) et pour combien d'annees (retention_years) - regle metier a figer (PV, comptes, contrats).
- Faut-il un cycle de vie/validation des documents (brouillon -> publie -> archive) ou le simple statut active/archived/deleted suffit-il ?
- Liaisons APPEL_FONDS / IMPAYE: ajoute-t-on des valeurs d'enum document_entity_type dediees (migration) ou abandonne-t-on ces deux types de liaison qui finissent en 'other' ?
- Quel comportement attendu a la suppression d'un dossier non vide (deplacer a la racine, refuser, cascade) - aligner le code sur le texte affiche.
- Auto-classement: les regles de mapping categorie->dossier (auto-file-ged) doivent-elles etre configurables par cabinet/copro, ou rester des conventions en dur ?
- Limite de taille (25 Mo) et types acceptes: a confirmer; faut-il OCR / extraction de metadonnees serveur plutot que l'heuristique regex sur nom de fichier ?

## Communication (messagerie, mail, mur)

### Ecrans
- **Hub Communication** (`/communication`) - Page d'accueil du domaine : 3 KPI (mails non lus, messages non lus, publications recentes 7j) + 3 cartes-modules cliquables (Boite mail / Messagerie / Mur) avec apercus (derniers sujets, derniere conversation, post epingle). KPI charges en direct via client Supabase non type (createUntypedClient).
- **Messagerie interne (chat)** (`/communication/messagerie`) - Layout 2 colonnes : ConversationList (recherche + 6 filtres) a gauche, ChatPanel (fil de messages groupes par date, zone de saisie, realtime INSERT) a droite. Conversations internes copro (direct/groupe/prestataire).
- **Boite mail (Resend)** (`/communication/mail`) - Client mail 3 colonnes : MailSidebar (dossiers systeme + labels + dossiers perso + jauge stockage factice), MailList (liste + recherche + favori), MailReader (lecture + actions), ComposeModal. Email transactionnel reel via Resend (envoi API + webhook entrant).
- **Mur communautaire** (`/communication/mur`) - Reseau social interne 3 colonnes : MurSidebar (categories + filtres epingles/mes posts + tags populaires hardcodes), PostFeed (posts epingles + reguliers, recherche, bouton creer), panneau commentaires lateral. Posts categorises, likes, commentaires, epinglage.

### Actions cles
- Hub: lire les 3 KPI (mails non lus, messages non lus, publications 7j) et naviguer vers chaque module
- Messagerie: selectionner une conversation (marque lu via RPC mark_conversation_read + remise a zero optimiste du badge)
- Messagerie: envoyer un message texte (insert direct table messages + update optimiste, le trigger trg_conversation_last_message maj last_message + unread des autres membres)
- Messagerie: filtrer conversations (Toutes/Non lues/Archivees/Direct/Groupes/Prestas) et rechercher (titre + dernier message)
- Messagerie: depuis le header d'un fil prestataire -> 'Creer OS' (redirige /maintenance/service-orders/new), d'un fil direct -> 'Fiche copro' (redirige /coproprietaires)
- Messagerie (expose par le hook mais SANS UI): markAsRead, archiveConversation
- Mail: composer/envoyer un mail (POST /api/mail/send -> Resend + insert mails status=sent, autorisation requireCoproManager)
- Mail: enregistrer un brouillon (insert direct mails status=draft) - declenche aussi automatiquement a la fermeture du modal si contenu non vide
- Mail: repondre (pre-remplit destinataire + objet Re:), selectionner un mail (marque is_read=true), archiver, supprimer (soft-delete is_deleted), basculer favori (is_starred)
- Mail: naviguer dossiers (inbox/sent/drafts/archive/trash/spam/starred) et rechercher (objet/expediteur/corps)
- Mur: creer une publication (titre, contenu, categorie, epingler) - insert direct wall_posts
- Mur: liker/unliker (insert/delete wall_likes, compteur resynchronise depuis v_wall_feed), commenter (insert wall_comments), epingler/desepingler (update is_pinned direct table)
- Mur: filtrer par categorie/epingles/mes publications, rechercher (titre/contenu)
- Mur (expose par le hook mais SANS UI): deletePost

### Formulaires & modales
- ComposeModal (mail): champs A / CC (repliable) / Objet / Corps, bouton Paperclip (pieces jointes) NON fonctionnel, Envoyer. Auto-sauvegarde brouillon a la fermeture. Validation minimale (to non vide + objet non vide), pas de Zod/RHF
- PostEditor (mur): modal Titre / Contenu / Categorie (select 5 valeurs) / checkbox Epingler. canSubmit = titre+contenu non vides. Pas de Zod/RHF
- PostComments: textarea inline d'ajout de commentaire (Enter pour envoyer)
- ChatPanel: textarea de saisie inline avec auto-resize, boutons Paperclip/Smile NON fonctionnels, Enter envoie
- Aucun formulaire/modal de creation de conversation (gap majeur, voir knownIssues)

### Backend touche
- Tables: conversations, conversation_members, messages, wall_posts, wall_comments, wall_likes, mails (migration 0022_communication.sql). Table events creee mais AUCUNE UI dans ce domaine
- Vues: v_conversations_overview (0049, security_invoker, my_unread_count/other_members), v_wall_feed (0049, auteur+role derives, is_liked_by_me, compteurs) - colonne is_archived ajoutee en 0051_conversations_is_archived.sql
- RPC: mark_conversation_read (0032, garde is_conversation_member)
- Triggers (0032): trg_conversation_last_message (maj last_message + unread des membres actifs sauf auteur), trg_wall_comments_count, trg_wall_likes_count (compteurs denormalises)
- Routes API Next: POST /api/mail/send (Resend + insert mails, garde requireCoproManager), POST /api/mail/inbound (webhook Resend signe HMAC svix, insert service_role, route vers MAIL_INBOUND_COPRO_ID)
- lib/mail/resend.ts: singleton Resend (RESEND_API_KEY)
- Edge function communication-workflow (create-post/comment/event/conversation, toggle-like/pin, send-message, mark/leave/add-member) avec authz complete - mais JAMAIS appelee par le front (code mort)
- Realtime Supabase: channel messages-{convId} (INSERT messages), channel mails-realtime (INSERT mails)
- RLS: mails gate sur user_is_copro_manager (boite PARTAGEE par copro, pas par owner)

### Issues connues
- CODE MORT MAJEUR: supabase/functions/communication-workflow/index.ts (805 lignes, authz/visibility complete) n'est jamais invoque par le front - aucun functions.invoke dans src/. Le front fait des inserts directs en table qui contournent toute la logique d'autorisation (council_only/managers_only, verif membership pour send-message, verif admin pour add-member)
- FAILLE/INCOHERENCE AUTORISATION: useMur.togglePin et deletePost ecrivent directement wall_posts (update is_pinned / delete) sans verifier que l'utilisateur est gestionnaire - alors que l'edge function exige user_is_copro_manager. Tout membre peut epingler/desepingler n'importe quel post (la seule barriere serait la RLS). togglePin est expose dans l'UI (PostCard), deletePost expose dans le hook mais SANS bouton UI
- VISIBILITE NON IMPLEMENTEE: createPost force visibility='all_members' en dur (useMur.ts:250). Les modes council_only/managers_only de l'edge function et de la colonne wall_posts.visibility sont inaccessibles depuis l'UI
- ROLE D'AUTEUR EN DUR: useMur.ts:19 CURRENT_USER_ROLE = 'syndic' (commentaire 'cablage rôle reel releve de J2.5'). Tout post/commentaire cree affiche optimiste le badge Syndic quel que soit le vrai role
- NOM/ROLE EXPEDITEUR PERDU EN MESSAGERIE: mapConversationPreview lit row.last_sender_name/last_sender_role mais v_conversations_overview ne les expose PAS -> fallback constant 'Admin CoProFlex' (useMessagerie.ts:53-54). mapMessage force senderRole='copro' (ligne 96) et sendMessage force senderRole='syndic' (ligne 351) - roles factices
- NOM DE COMMENTAIRE PERDU: mapComment force authorName='Utilisateur' (useMur.ts:83, wall_comments ne stocke pas le nom, pas de jointure profiles au fetch). Le vrai nom n'apparait que pour le commentaire qu'on vient de poster (pose localement), pas au rechargement
- BOUTONS MORTS: ChatPanel pieces jointes (Paperclip) + emoji (Smile) sans handler; ComposeModal Paperclip sans handler; MailReader 'Transferer' (Forward) sans onClick; MailSidebar 'Ajouter un label' + clic sur un label + dossiers perso sans effet reel (createLabel/createFolder/addLabel/moveToFolder ne sont que du state local jamais persiste, jamais cables a l'UI)
- DOSSIERS/LABELS MAIL FACTICES: DEFAULT_FOLDERS et DEFAULT_LABELS sont en dur (constants.ts), il n'y a aucune table mail_folders/mail_labels (l'ile campagnes a ete droppee, cf. 0022 commentaire). unreadCount par dossier toujours 0, dossiers perso jamais charges depuis la DB
- DONNEES DEMO HARDCODEES: MailSidebar.tsx:144 affiche 'copro.haussmann@coproflex.fr' + jauge stockage '0,23 Go sur 1 Go' factice; useMailbox.ts:15-16 SYNDIC_EMAIL/SYNDIC_NAME en dur 'Residence Haussmann'; MurSidebar POPULAR_TAGS hardcodes ('Travaux 2025'...) sans lien avec wall_posts.tags reels
- FILTRE MESSAGERIE INERTE: ConversationList propose les filtres Direct/Groupes/Prestas mais le type 'prestataire' n'est jamais derive (mapConversationPreview ne renvoie que 'group' ou 'direct' selon is_group) -> filtre Prestas toujours vide; le type prestataire n'existe nulle part en base
- PIECES JOINTES MESSAGERIE/MUR INERTES: mapMessage lit row.attachments (colonne qui n'existe PAS dans la table messages, supprimee en 0022 au profit de attachment_id) -> toujours []. sendMessage insere attachment_id:null + attachments:null (colonne attachments inexistante -> insert potentiellement en echec silencieux). mapPost force attachments:[] (useMur.ts:65)
- ERREURS AVALEES: la quasi-totalite des mutations Supabase ignore l'erreur (pas de toast/feedback): useMailbox deleteMail/archiveMail/toggleStar/selectMail/saveDraft, useMur togglePin/deletePost/addComment, useMessagerie archiveConversation. sendMail: si res.ok est faux, le modal se ferme sans message d'erreur. Seul mark_conversation_read logge en console.error
- PARAGRAPHES MAIL = body.split: MailReader rend le corps en splittant sur \n (pas de HTML), alors que la table stocke body_html (jamais affiche). Le webhook entrant stocke html mais il n'est jamais rendu
- TYPAGE: usage systematique de createUntypedClient() = createClient() as any dans les 4 fichiers (page hub + 3 hooks), contournant le typage Supabase - viole la regle 'jamais de any'
- SUPPRESSION MAIL PERMANENTE ABSENTE: CORBEILLE_JOURS=30 declare (constants) mais aucune purge; pas de 'vider la corbeille', pas de restauration depuis la corbeille
- INDEX-KEY: hub (apercu sujets), MailReader (paragraphes) utilisent l'index de tableau comme key (eslint-disable assume)

### Besoins refonte (manager-first)
- Brancher les ecritures sur l'edge function communication-workflow (ou des RPC SECURITY DEFINER equivalentes) au lieu d'inserts directs en table, pour faire respecter les autorisations metier (qui peut epingler, supprimer, publier en mode conseil/gestionnaire, ajouter un membre) cote serveur et pas seulement via RLS
- Implementer la creation de conversation depuis l'UI (selecteur de copropriétaires/CS/prestataires + premier message) - aujourd'hui impossible de demarrer un fil depuis l'app
- Resoudre noms et roles reels (jointure profiles + memberships) pour expediteurs de messages, auteurs de commentaires et previews de conversation - supprimer les fallbacks 'Admin CoProFlex'/'Utilisateur'/role 'syndic' en dur
- Vue gestionnaire-first: un centre de communication unifie (inbox + messages + mur) avec priorisation (impayes, AG en cours, sinistres), liens contextuels vers le lot/copropriétaire/dossier concerne, et tracabilite (rattacher un mail/message a une intervention, une AG, un appel de fonds)
- Pieces jointes reelles: brancher attachment_id -> documents (GED) en messagerie/mur, et un vrai upload + stockage pour les mails (la colonne attachments JSONB existe mais n'est jamais alimentee ni rendue)
- Mail: rendre le HTML (body_html), supprimer l'email/stockage factices, derouter les dossiers/labels vers une vraie persistance ou les retirer s'ils restent decoratifs; router automatiquement un mail entrant vers la bonne copro (le mapping est aujourd'hui une seule copro via env var)
- Mur: exposer la visibilite (tous/conseil/gestionnaires), gerer les tags reels (au lieu des tags populaires hardcodes), le type 'sondage' avec vrai vote, et la moderation/verrouillage (is_locked existe en base, jamais expose)
- Notifications/feedback: remonter toutes les erreurs Supabase a l'utilisateur (toasts), badges de non-lus fiables et coherents entre hub et modules, notifications push/email sur nouveau message ou mention
- Evenements/agenda: la table events est creee et l'edge function la gere, mais il n'existe AUCUNE UI - un calendrier copro (AG, interventions liees) est attendu par un syndic et a sa place dans Communication
- Typage strict: supprimer les createUntypedClient as any en typant les vues/RPC (types Supabase generes), conformement aux conventions du projet

### Questions ouvertes
- Messagerie interne vs mail Resend: garde-t-on DEUX canaux distincts (chat interne + email transactionnel) ou unifie-t-on ? Quel est le canal officiel de communication legale syndic<->copropriétaire (la convocation/PV passe deja par un autre dispatch) ?
- Qui peut faire quoi sur le mur: un copropriétaire peut-il publier librement, ou seulement le syndic/CS ? Faut-il une moderation a priori (validation) ou a posteriori (signalement/verrouillage) ? Le mur est-il un argument commercial ou un risque (deriva, contentieux) ?
- La boite mail est PARTAGEE par copro (RLS sur user_is_copro_manager). Est-ce le modele voulu (boite collective du syndic pour la copro) ou faut-il une boite par gestionnaire ? Comment gere-t-on le multi-copro pour un meme gestionnaire ?
- Le mail entrant est route vers une seule copro via MAIL_INBOUND_COPRO_ID (env var). Quelle est la regle metier de routage adresse->copro a figer (sous-adresse par copro, parsing du destinataire, etc.) ?
- Faut-il conserver l'edge function communication-workflow comme couche d'ecriture canonique (et y brancher le front), ou la migrer en RPC SQL comme le reste de la finance ? Aujourd'hui elle est complete mais morte
- Perimetre evenements/agenda: integre-t-on l'agenda (table events) dans la refonte Communication, ou est-ce un module a part / hors V1 ?
- Pieces jointes: passent-elles toutes par la GED (documents) pour une source unique, y compris pour les mails Resend ?
- Roles a afficher: la messagerie/mur supposent des roles syndic/copro/conseil/prestataire/gardien - le type prestataire n'existe pas en base; faut-il vraiment des conversations avec prestataires ici ou cela releve-t-il du module Maintenance ?

## Conseil syndical (gouvernance copro) — gestion des membres élus + rapports d'activité du CS, espace gestionnaire

### Ecrans
- **Conseil Syndical (hub 2 onglets)** (`/conseil-syndical`) - Page d'entrée du domaine. Onglet 'Rapports d'activité' (actif par défaut) = liste des rapports du CS de la copro + bouton 'Nouveau rapport'. Onglet 'Membres' = grille lecture seule des membres élus (avatar initiales, nom, rôle FR, e-mail mailto). src/app/(dashboard)/conseil-syndical/page.tsx
- **Éditeur de rapport d'activité CS** (`/conseil-syndical/rapport/[id]`) - Éditeur 3 zones (Header + Editor principal + Sidebar) d'un rapport d'activité. Titre/introduction/contenu détaillé en textarea, sections additionnelles ordonnables, annexes, aperçu texte de résolution AG, workflow de validation. Auto-save débouncé. src/app/(dashboard)/conseil-syndical/rapport/[id]/page.tsx

### Actions cles
- Basculer entre onglets 'Rapports d'activité' et 'Membres' (état local activeTab, aucun appel réseau)
- Consulter la liste des membres actifs du CS (lecture seule, via vue v_council_members_detail, tri par rôle, filtre is_active=true) — AUCUN ajout/édition/suppression de membre côté CS
- Cliquer un e-mail membre (lien mailto:)
- Lister les rapports d'activité de la copro (tri created_at desc, badge statut, période, nb annexes, extrait intro)
- Créer un nouveau rapport ('Nouveau rapport' → insert rapports_activite_cs, période figée 1er juin N-1 → 31 mai N, titre auto, puis redirection window.location.href vers l'éditeur)
- Éditer titre / introduction / contenu détaillé du rapport (mise à jour optimiste + auto-save débouncé 3s)
- Sauvegarder manuellement (bouton 'Sauvegarder', désactivé si rien à sauver)
- Ajouter / renommer / déplier-réduire / monter-descendre / supprimer une section additionnelle (persistance débouncée 800ms, updates accumulés par section)
- Réordonner les sections (boucle d'UPDATE sort_order un par un)
- Ajouter une annexe (nom + type Document/Image/Tableau ; upload fichier NON implémenté)
- Supprimer une annexe
- Télécharger une annexe (lien si file_url présent — jamais peuplé en pratique)
- Soumettre le rapport pour révision (brouillon → en_revision ; sauvegarde d'abord)
- Valider le rapport (en_revision → valide ; validated_by = profiles.id session, validated_at)
- Aperçu du texte de résolution AG auto-généré (genererTexteResolution)
- Lier/Publier le rapport vers une AG à venir (valide → publie ; sélecteur d'AG draft/convoked de la même copro ; archive l'ancien publié)
- Exporter en PDF (bouton présent mais STUB : alert 'en cours de développement')
- Retour vers /conseil-syndical (bouton flèche du header)
- [Amont, hors domaine] Élire/renouveler le CS via la résolution AG ELECT_COUNCIL → activate_ag_decisions peuple council_members (SEUL mécanisme de peuplement)

### Formulaires & modales
- Onglets Rapports/Membres (boutons toggle, pas de form)
- Formulaire inline 'Nouvelle section' (champ titre + Annuler/Ajouter, bouton désactivé si titre vide)
- Champs textarea titre/intro/contenu et titre+contenu par section (contrôlés, disabled si non éditable)
- Modale 'Ajouter une annexe' (champ nom, select type document/image/tableau, input file optionnel non câblé — TODO upload)
- Encart 'Aperçu' du texte de résolution AG (toggle, <pre>)
- Sélecteur d'AG cible pour la publication (select des AG draft/convoked, remplace un ancien prompt() à UUID libre)
- Indicateur de sauvegarde dans le header (Sauvegarde.../Modifications non sauvegardées/Sauvegardé)
- Bannière d'erreur de sauvegarde (role=alert) qui ne remplace PAS l'éditeur
- États plein écran : Chargement / Erreur (si rapport non chargé) / Rapport non trouvé

### Backend touche
- Table rapports_activite_cs (0053) — CRUD via rapportCSService ; colonnes EN (title, period_start/end, status FR, content/content_text, ag_id, resolution_id, validated_by/at, author_id)
- Table sections_rapport_cs (0053) — FK composite (rapport_id, copro_id), sort_order
- Table annexes_rapport_cs (0053) — kind document/image/tableau, file_url/name/size (jamais peuplé), embedded_content, sort_order
- Vue v_council_members_detail (0061, security_invoker=true) — résout identité membre depuis coproprietaires PUIS profiles ; lue par useConseilSyndicalPage
- Table council_members (0017) — lue indirectement via la vue ; peuplée UNIQUEMENT par activate_ag_decisions (ELECT_COUNCIL, 0030)
- Table ag_meetings — lue pour le sélecteur d'AG (publication, statuts draft/convoked) et garde de publierRapport
- Index unique uq_rapports_cs_ag_publie — 1 seul rapport publié par AG (géré côté service + catch 23505)
- RLS classe A (0034) : user_has_copro_access en lecture, user_is_copro_manager en écriture sur les 3 tables rapports
- RPC compute_decision_result (0030) — utilisée par l'edge function council-workflow uniquement (PAS par le front)
- Edge function council-workflow (create-decision/cast-vote/update-decision-status/attach-document/get-decision-results/get-my-council-role) sur tables council_decisions/council_votes/council_documents — ORPHELINE, aucun appel depuis src
- Client Supabase non typé (createClient() as any) dans le hook page, le service et la sidebar (tables 0053 absentes des types générés)

### Issues connues
- BOUTON MORT : 'Exporter en PDF' (RapportSidebar.tsx:289-299) = alert('Export PDF en cours de développement'), alors qu'un générateur PDF COMPLET existe (src/lib/pdf/generateRapportCSPDF.ts, ~320 lignes : downloadRapportCSPDF/generateRapportCSAnnexePDF). Code mort non câblé.
- UPLOAD ANNEXE NON IMPLÉMENTÉ : input file de la modale annexe a un onChange vide avec '// TODO: Gérer l'upload de fichier' (RapportSidebar.tsx:351-353) ; useRapportCS.ts:241-251 a '// TODO: Upload fichier si présent vers Supabase Storage' (placeholder commenté). Seuls nom+type sont persistés, file_url reste NULL → le bouton télécharger d'annexe ne s'affiche jamais.
- EDGE FUNCTION ORPHELINE : supabase/functions/council-workflow/index.ts (décisions/votes/documents du CS) n'est invoquée NULLE PART dans src — feature 'décisions du conseil entre deux AG' (vote majorité simple, art.21) codée backend mais sans aucune UI. Tables council_decisions/council_votes idem inertes côté front.
- INTÉGRATION CONVOCATION ABSENTE : le test plan TC-CS-016 décrit 'Rapport du conseil syndical' comme annexe de convocation AG, mais aucun code dans src/components/features/ag ne référence le rapport CS ; getRapportPourAG() et generateRapportCSAnnexePDF() ne sont appelés nulle part → le rapport publié n'est PAS réellement annexé à la convocation/PV. Cycle 'publier vers AG' est un cul-de-sac fonctionnel.
- NAVIGATION : aucune entrée de menu/sidebar trouvée pour /conseil-syndical dans src (grep nav/menu/Sidebar = 0 hit). Accès probable uniquement par URL directe ou via un menu non repéré → à vérifier.
- DRIFT EN/FR : enum council_role en ANGLAIS en base (president/secretary/treasurer/member/observer) mappé à la main vers FR (president/secretaire/tresorier/membre) dans useConseilSyndicalPage.ts:25 ; observer écrasé sur 'membre' (rôle observateur perdu à l'affichage). Statuts rapport en FR en base (cas particulier assumé).
- DOUBLONS DE TYPES : conseil-syndical.ts définit deux familles parallèles (I* 'modernes' IRapportActiviteCS/IMembreConseilSyndical + versions 'legacy' RapportActiviteCS/MembreConseilSyndical) ; seules les legacy sont utilisées. ICommentaireRapportCS/CommentaireRapportCS définis mais jamais persistés ni affichés (feature commentaires de révision fantôme).
- RÔLES INCOHÉRENTS ENTRE COUCHES : la page CS gère 4 rôles (president/secretaire/tresorier/membre), BlocConseilSyndical (AG finalisation) n'en gère que 2 (president/member), la désignation AG parle de TITULAIRE/SUPPLEANT — trois vocabulaires de rôles différents pour le même conseil.
- WIZARD MORT : DesignationMultiplePanel + useDesignationMultiple (AG Session) = ancien wizard d'élection avec vote SIMULÉ (setTimeout, résultat codé en dur pour:100/contre:10), état purement local jamais persisté dans council_members (confirmé TC_10 'écrans morts').
- getRapportPourAG / lierResolution / changerStatut(publique)/genererTexteResolutionAnnexe : plusieurs méthodes du service rapport-cs.service.ts ne sont jamais appelées par le front (lierResolution, getRapportPourAG).
- REORDER SECTIONS NON ATOMIQUE : reorderSections (useRapportCS.ts:206) fait une boucle d'UPDATE séquentiels ; un échec en milieu de boucle laisse un ordre incohérent (rollback par reload, pas transactionnel).
- MIGRATIONS LEGACY MORTES : migrations_legacy/20241231_create_conseil_syndical.sql + 20260126_niveau6b_council_communication*.sql = ancienne modélisation 'conseil_syndical' comme entité, non active.
- CONSEIL = NON-ENTITÉ : conseilSyndicalId est 'legacy, ignoré' partout (champ '' codé en dur) ; le conseil n'est pas modélisé, seulement ses membres (council_members) et ses rapports rattachés à la copro — pas de mandat/date de fin/nombre statutaire suivi.
- SESSION : handleCreateRapport utilise alert() pour 'Session expirée' et window.location.href (rechargement dur) plutôt que router.push.
- ERREUR AVALÉE : chargement des rapports dans le hook page catch + console.error sans feedback utilisateur (rapports restent vides silencieusement si l'appel échoue).

### Besoins refonte (manager-first)
- Vue 'gouvernance' manager-first : composition actuelle du conseil EN UN COUP D'OEIL (président mis en avant, rôles, mandats avec date début/fin et alerte échéance 3 ans art.22 décret 1967) + historique des conseils passés (la vue v_council_members_detail expose déjà is_active/end_date pour ça).
- Surface d'édition des membres pour le gestionnaire : aujourd'hui zéro action sur l'onglet Membres. Au minimum corriger un rôle, fin de mandat, démission/remplacement entre deux AG (cooptation art.25 décret) sans devoir refaire une AG ; aujourd'hui tout passe obligatoirement par ELECT_COUNCIL.
- Suivi du mandat : nombre de membres statutaire (vs élus), durée 3 ans, date de prochaine ré-élection, conformité quorum CS — rien de tout ça n'est suivi.
- Brancher OU supprimer le générateur PDF : soit câbler downloadRapportCSPDF au bouton + generateRapportCSAnnexePDF à la convocation/PV (vraie valeur métier : le compte rendu art.21 doit être joint à la convocation de l'AG d'approbation des comptes), soit retirer le bouton stub.
- Implémenter l'upload d'annexes réel (Supabase Storage) — actuellement promesse non tenue, l'utilisateur croit joindre un fichier qui n'est jamais envoyé.
- Éditeur rich-text réel : aujourd'hui de simples <textarea> alors que le modèle stocke du 'HTML' (champ content + content_text strippé) — incohérence, l'éditeur ne produit jamais de HTML.
- Décider du sort de la feature 'décisions du conseil entre AG' (edge function council-workflow + tables council_decisions/votes) : soit lui donner une vraie UI (consultation du CS sur devis/travaux, vote majorité simple, traçabilité art.21), soit la supprimer pour ne pas laisser une demi-feature.
- Espace conseiller syndical dédié (cf. direction refonte 'créer espaces copropriétaire & conseil syndical') : permettre aux MEMBRES du CS (et pas seulement le gestionnaire) de consulter docs confidentiels, co-rédiger le rapport, voter — la migration 0053 note déjà ce besoin (policy council_members côté écriture manquante).
- Unifier le vocabulaire des rôles (un seul enum cohérent CS, ne pas perdre 'observer', réconcilier TITULAIRE/SUPPLEANT avec president/member/treasurer/secretary).
- Workflow de relecture collaboratif réel (statut en_revision + commentaires ICommentaireRapportCS aujourd'hui fantômes) : qui relit, qui valide, traçabilité.
- Lien tangible rapport ↔ AG : à la publication, créer/alimenter réellement la résolution 'Compte rendu du CS' de l'AG cible (lierResolution existe mais inutilisée) et l'annexer à la convocation.
- Tableau de bord CS : devis à examiner, contrats à renouveler, points en attente, prochaine réunion — un vrai cockpit plutôt que 2 onglets liste.

### Questions ouvertes
- Le CS doit-il devenir une entité persistée (mandat, dates, nb statutaire, quorum) ou rester une simple collection de membres + rapports rattachés à la copro ?
- Garde-t-on la feature 'décisions du conseil entre deux AG' (council-workflow / council_decisions / council_votes) ? Si oui, qui l'opère (membres CS via portail dédié ?) et avec quelle valeur juridique (art.21) ?
- Qui peut éditer/valider un rapport d'activité : seulement le gestionnaire (RLS actuelle), ou aussi les membres du CS via le futur espace conseiller (impact RLS — policy council_members à créer) ?
- Le rapport d'activité du CS doit-il être OBLIGATOIREMENT annexé à la convocation de l'AG d'approbation des comptes (art.21), et qui le déclenche : auto à la convocation ou via publication manuelle ?
- Faut-il un éditeur rich-text (HTML réel) ou conserver du texte brut ? Le modèle prévoit du HTML mais l'UI ne fait que du texte.
- Le gestionnaire peut-il modifier la composition du conseil hors AG (cooptation, démission, correction de rôle), ou la composition reste-t-elle strictement pilotée par ELECT_COUNCIL en AG ?
- Conserve-t-on le rôle 'observer' (perdu à l'affichage) et les rôles secretary/treasurer (gérés par la page mais pas par BlocConseilSyndical) ?
- Que faire du générateur PDF complet mais débranché : le câbler (export + annexe) ou le supprimer ?
- Faut-il gérer les suppléants distinctement des titulaires (le wizard AG les distingue, council_members non) ?
- Statut/cycle du rapport : garde-t-on en_revision/archive sans collaboration réelle, ou simplifie-t-on (brouillon → validé → publié) ?
- Faut-il une entrée de menu explicite pour /conseil-syndical (actuellement introuvable) et sous quel regroupement (Gouvernance/AG) ?

## Conformité (DPE, PPT, Factur-X)

### Ecrans
- **DPE Collectif — vue gestionnaire (liste portefeuille)** (`/conformite/dpe`) - Tableau de tous les DPE collectifs du portefeuille (copro, lots, classe énergie colorée A-G, date diagnostic, expiration, statut Valide/Expire bientôt/Expiré/Manquant). Si un CoproContext est actif, bascule automatiquement sur la fiche détail de la copro courante (vue duale dans le même fichier page.tsx).
- **DPE Collectif — fiche détail (vue copro)** (`/conformite/dpe/[coproprieteId]`) - Fiche d'une copro : échelle énergétique A-G avec curseur, informations DPE (dates, diagnostiqueur, N° ADEME, conso kWh/m²/an, émissions GES), bannière d'alerte selon statut, travaux recommandés, historique des diagnostics. Boutons Modifier / Planifier renouvellement disponibles uniquement via la vue intégrée /conformite/dpe (CoproContext), pas via la route param.
- **PPT — vue gestionnaire (grille portefeuille)** (`/conformite/ppt`) - Grille de cartes par copropriété : statut global (À jour / En retard / À compléter), répartition des travaux par statut (à l'étude/prévu/voté/en cours/terminé), barre de progression % terminé, filtres TOUTES/À jour/En retard/À compléter. Bascule sur le kanban de la copro si CoproContext actif.
- **PPT — kanban copro** (`/conformite/ppt/[coproprieteId]`) - Plan Pluriannuel de Travaux d'une copro en kanban à 5 colonnes (À l'étude, Prévu, Voté en AG, En cours, Terminé) avec total € par colonne, filtre par année (2026-2035), détail timeline d'un travail au clic. NB : sur la route param l'édition/suppression sont volontairement désactivées (no-op).
- **Factur-X — table e-facturation** (`/conformite/facturx`) - Table des factures fournisseurs avec statut paiement, statut Factur-X (Généré / En attente / Non applicable), profil (MINIMUM/BASIC_WL/EN16931), filtrage par statut, action Générer Factur-X (simulée 1,5 s) et Télécharger PDF/A-3 (simulé). Filtrée par nom de la copro courante si CoproContext actif.
- **Redirection PPT maintenance** (`/maintenance/ppt`) - Page de simple redirection serveur (redirect) vers /conformite/ppt — entrée d'origine du PPT dans le menu Maintenance, conservée pour ne pas casser les liens.

### Actions cles
- DPE : consulter la liste portefeuille avec statut de validité calculé côté front (computeStatut : EXPIRE si date passée, EXPIRE_BIENTOT si < 6 mois)
- DPE : ouvrir la fiche détail d'une copro (router.push vers /conformite/dpe/[id])
- DPE : modifier la fiche (classe énergie/GES, dates, diagnostiqueur, N° ADEME, conso, émissions) — recalcule le statut, état local uniquement
- DPE : planifier le renouvellement (date prévue + diagnostiqueur + notes) — ajoute une entrée dans l'historique en mémoire
- DPE : 'Télécharger PDF' (bouton présent mais SANS handler — action morte)
- PPT : filtrer le portefeuille par statut global (TOUTES/À jour/En retard/À compléter)
- PPT : filtrer les travaux d'une copro par année (2026 à 2035, ou Tous)
- PPT : ajouter un travail (titre, type, statut, date, montant estimé, priorité, description) — crée 5 étapes par défaut (Devis/Vote AG/Commande/Intervention/Réception)
- PPT : modifier un travail existant
- PPT : supprimer un travail (avec confirmation à deux temps dans le modal, ou direct depuis la fiche détail)
- PPT : ouvrir le détail d'un travail (timeline des étapes avec icônes Fait/En cours/À venir, dates, montants, commentaires)
- Factur-X : filtrer les factures par statut Factur-X
- Factur-X : générer un Factur-X (simulation async 1500 ms, passe le statut à GENERE + date)
- Factur-X : télécharger le PDF/A-3 (toast 'Téléchargement simulé' — pas de fichier réel)

### Formulaires & modales
- DPEEditModal — édition fiche DPE : selects classe énergie/GES (A-G), dates diagnostic/expiration, diagnostiqueur, N° ADEME, conso énergie, émissions GES. Validation locale : champs requis, expiration > diagnostic, conso/émissions > 0.
- DPERenewModal — planification renouvellement : date prévue (requise), diagnostiqueur (pré-rempli), notes optionnelles.
- PPTTravailModal — création/édition d'un travail : titre, type (11 types via TYPE_LABELS), statut, date prévisionnelle, montant estimé, priorité (Faible/Normale/Haute/Critique), description. Suppression à confirmation deux temps. Validation locale : titre/date requis, montant > 0.
- PPTCardDetail — modal lecture seule (overlay) : titre, type, estimation, description, timeline des étapes. Bouton Modifier (no-op sur la route param).
- Pas de modal côté Factur-X — actions inline dans la table (Générer / Télécharger).

### Backend touche
- AUCUN backend réel. 100% mock front-end.
- Données : MOCK_DPE_LIST (components/features/conformite/dpe/mock-data.ts, 4 copros), MOCK_PPT_COPROPRIETES (ppt/mock-data.ts, 4 copros / 8 travaux), MOCK_FACTURES_FACTURX (facturx/mock-data.ts, 5 factures).
- État géré en useState dans les hooks useDPE / usePPT / useFacturX — toute modification est perdue au rechargement.
- Aucune table Supabase (vérifié : pas de create table travaux_previsionnel/plan_pluriannuel/dpe/facturx dans supabase/migrations), aucun RPC, aucune edge function, aucune vue dédiée à ce domaine.
- Les enums TypeTravauxPrevisionnel et TravauxPrevisionnelStatut existent côté types (src/types/enums) mais n'ont pas d'équivalent en base.

### Issues connues
- Domaine 100% mock sans persistance — toute saisie (édition DPE, ajout/suppression travail PPT, génération Factur-X) est volatile, perdue au reload. Aucun fil de sauvegarde vers Supabase.
- Bouton mort : 'Télécharger PDF' dans DPEFicheDetail.tsx (lignes 54-56) n'a AUCUN onClick — bouton totalement inerte.
- Action factice avalée : useFacturX.telecharger (hook ligne 53-59) n'émet qu'un toast 'Téléchargement simulé', aucun fichier généré. genererFacturX simule un setTimeout 1500 ms sans rien produire.
- Drift d'identifiants probable : les hooks matchent currentCoproId aux IDs mock 'copro-1..4', mais le CoproContext réel sert des UUID Supabase → le find échoue systématiquement et tombe sur le fallback dpeData[0] / coproData[0] (useDPE l.45-46, usePPT l.42-43). Le gestionnaire voit donc TOUJOURS la 1re copro mock quelle que soit la copro réellement sélectionnée.
- Vue duale ambiguë dans /conformite/dpe/page.tsx et /conformite/ppt/page.tsx : la même route affiche soit la liste portefeuille soit la fiche copro selon CoproContext — comportement implicite, source de confusion.
- Edition/suppression PPT désactivées en silence sur la route param /conformite/ppt/[coproprieteId] (page l.57-58 : callbacks vides avec commentaire 'non disponible sur cette vue'), alors que les boutons Modifier restent visibles dans PPTCardDetail → bouton trompeur.
- Style inline interdit par les conventions : DPEEnergyScale.tsx l.29 style={{ width: barWidth }} et PPTGestionnaireGrid.tsx l.79 style={{ width: progress% }} (la règle 'jamais de style inline' est violée — toléré pour largeur dynamique mais non conforme).
- Double point d'entrée PPT : /maintenance/ppt redirige vers /conformite/ppt — vestige d'une migration de menu (PPT a déménagé Maintenance → Conformité), à nettoyer une fois la nav stabilisée.
- Statut 'MANQUANT' du DPE est défini dans les types et géré dans STATUT_CONFIG/STATUT_ALERT mais aucune donnée mock ne le produit et computeStatut ne le renvoie jamais → branche morte non testée.
- selectedDPE ne filtre jamais réellement par copro en pratique (cf. drift IDs) ; les sous-titres FinanceTopBar affichent donc des données potentiellement incohérentes avec la copro sélectionnée dans le header.
- Aucune validation du N° ADEME (format réel = 13 caractères) ni de la cohérence classe énergie ↔ conso kWh affichée dans l'échelle (l'échelle DPEEnergyScale a ses propres seuils codés en dur, indépendants de la conso saisie).
- Travaux recommandés DPE toujours vides dans les mocks (travauxRecommandes: []) → la carte 'Travaux recommandés suite au DPE' montre systématiquement l'état vide.
- Pas de lien entre PPT et DPE alors que métier-ment le PPT découle du DPE/PUC : IDPE possède un champ travauxRecommandes: ITravauxPPT[] jamais alimenté ni relié au module PPT.

### Besoins refonte (manager-first)
- Persister le domaine en base : tables previsional_works (PPT) avec FK copro + operation_id finance, dpe_collectif (1 par copro, versionné = historique des diagnostics), e_invoices/facturx (lié aux factures fournisseurs existantes). Aujourd'hui zéro persistance.
- Brancher le PPT sur le réel grand livre et le module AG : un travail 'Voté en AG' devrait provenir d'une résolution réellement votée (cf. cycle AG → ag_pending_actions), pas d'un statut saisi à la main. Le montant voté/réel devrait se réconcilier avec les écritures travaux (classe 6 travaux / 105 ALUR).
- Relier DPE → PPT : générer/pré-remplir les travaux du PPT à partir des préconisations du DPE collectif (obligation depuis le décret PPT, le PPT est l'audit énergétique opérationnalisé). Le champ travauxRecommandes existe déjà, l'exploiter.
- Manager-first : un vrai tableau de bord conformité agrégé multi-copro en page d'accueil du module (combien de DPE expirés/à renouveler, combien de PPT à compléter avant l'échéance légale, factures non Factur-X avant l'obligation) avec actions de masse et tri par urgence/échéance légale.
- Échéances légales pilotées : rappels automatiques (PPT obligatoire selon taille/âge de l'immeuble, DPE collectif obligatoire depuis 2024-2026 par tranches, e-facturation B2B obligatoire 2026-2027). Calculer dynamiquement l'applicabilité par copro plutôt que des sous-titres en dur.
- Factur-X : intégration réelle au module Factures fournisseurs (le domaine duplique des factures mock alors qu'il existe déjà supplier_invoices) — générer un vrai PDF/A-3 + XML CII EN 16931, gérer la réception via PDP/PPF, statuts de cycle de vie e-facture (émise/reçue/rejetée/encaissée).
- Téléchargements réels : générer les PDF (fiche DPE, export PPT, Factur-X) via le pipeline jsPDF déjà présent dans lib/pdf, supprimer les boutons morts/simulés.
- Upload de pièces justificatives : rattacher le PDF du diagnostic DPE et les devis PPT à la GED (catégorie diagnostics existe déjà dans la GED).
- Supprimer la vue duale implicite : séparer clairement écran portefeuille (multi-copro) et écran fiche (mono-copro) ; piloter par le sélecteur de copro global de façon déterministe.
- Lien parties prenantes : exposer ces conformités côté portail copropriétaire et conseil syndical (lecture du DPE, du PPT voté, des échéances) — cohérent avec la direction 'créer espaces copropriétaire & CS'.

### Questions ouvertes
- Le PPT existe en double notion : module Conformité ici (mock) vs. la logique travaux/budgets travaux déjà en base (operation_id, classe 6 travaux, ALUR). Faut-il un module PPT autonome ou le PPT doit-il être une simple vue de planification au-dessus des opérations travaux réelles ? (risque de 3e source de vérité travaux).
- Quel est le périmètre légal exact à supporter pour le déclenchement automatique : seuils PPT (immeubles > 15 ans / nombre de lots), tranches d'obligation DPE collectif, calendrier e-facturation B2B 2026-2027 ? Décisions métier à figer pour calculer l'applicabilité par copro.
- DPE collectif : un seul DPE par copropriété (bâtiment) ou multi-bâtiments / multi-DPE par copro ? Le modèle actuel suppose 1 DPE = 1 copro, à confirmer pour les copros multi-bâtiments (cf. golden 'Domaine des Tilleuls' 2 bâtiments).
- Factur-X : génère-t-on les factures SORTANTES (appels de fonds / refacturations) ou seulement les factures fournisseurs ENTRANTES ? L'obligation 2026 concerne le B2B ; le statut d'un syndic (mandataire) vis-à-vis de la copro et des fournisseurs doit être tranché avant de modéliser.
- Quel niveau d'intégration PDP/PPF (plateforme de dématérialisation) vise-t-on en V1 : simple génération du fichier conforme, ou transmission/réception via une plateforme agréée ?
- Faut-il versionner le DPE (historique des diagnostics successifs) en base avec une table dédiée, ou stocker uniquement le DPE courant + archiver les anciens en GED ?
- Les statuts PPT (à l'étude/prévu/voté/en cours/terminé) doivent-ils rester saisissables manuellement ou être dérivés de l'état réel (devis en GED, vote AG, OS, réception) pour éviter le drift métier déjà observé sur la finance ?

## Contentieux / Litiges

### Ecrans
- **Impayés (recouvrement)** (`/contentieux/impayes`) - Écran canonique du recouvrement. Liste les lots en retard avec workflow de relances (en retard → relance 1 → relance 2 → mise en demeure → contentieux), stats (actifs, montant total, mises en demeure, contentieux), filtres par statut, sélection multiple, relances groupées, export PDF/CSV. Données de LECTURE réelles (Supabase), mais toutes les ACTIONS d'écriture sont simulées en mémoire.
- **Impayés (route legacy redirigée)** (`/ventes-impayes/impayes`) - Ancienne route dupliquée byte-à-byte. Désormais un simple redirect("/contentieux/impayes") — doublon résolu (commentaire V3 dans le fichier). Le impayes.module.css co-localisé reste importé par les composants de la feature.
- **Litiges** (`/contentieux/litiges`) - Liste/gestion des litiges (voisinage, travaux, charges, autre) avec stats (actifs / total), badges statut+priorité, cartes litige. Coquille 100% statique : MOCK_LITIGES = [] codé en dur, aucune table, boutons sans handler.

### Actions cles
- Impayés — Consulter la liste des lots en retard (lecture réelle v_unpaid_with_reminders + v_payment_reminders_overview via lib/impayes/api)
- Impayés — Filtrer par statut workflow (tous / en_retard / relance_amiable_1 / relance_amiable_2 / mise_en_demeure / contentieux / clôturés)
- Impayés — Voir détails & historique d'un impayé (timeline des actions, fiche copropriétaire, montants)
- Impayés — Envoyer une relance unitaire (relance 1 email / relance 2 courrier / mise en demeure huissier / passage contentieux) — SIMULÉ (setTimeout + setState, jamais persisté)
- Impayés — Prévisualiser le PDF de relance avant envoi (previewRelancePDF)
- Impayés — Télécharger le PDF de relance + archivage GED fire-and-forget (autoFileToGED catégorie courrier)
- Impayés — Marquer un impayé comme réglé (passe statut=regle, montant=0 EN MÉMOIRE ; AUCUN encaissement comptable, aucune écriture grand livre)
- Impayés — Sélection multiple (toggle par carte, tout sélectionner/désélectionner)
- Impayés — Relances groupées en 3 étapes (sélection type → prévisualisation modèle + liste destinataires → envoi) — SIMULÉ
- Impayés — Exporter les impayés filtrés en PDF (generateImpayesExportPDF + archivage GED catégorie releve_charges) ou CSV (generateImpayesExportCSV)
- Impayés — Consulter le détail d'une action d'historique (email/courrier/téléphone/note) via HistoriqueDetailModal
- Litiges — Bouton « Nouveau litige » (AUCUN onClick — bouton mort)
- Litiges — Bouton « Voir détails » par carte (AUCUN onClick — bouton mort)
- Litiges — Bouton « Ajouter note » par carte (AUCUN onClick — bouton mort)

### Formulaires & modales
- DetailModal — fiche copropriétaire + détails impayé + timeline historique cliquable, bouton « Passer à l'étape suivante » (src/components/features/ventes-impayes/impayes/components/DetailModal.tsx)
- RelanceModal — sélecteur du type de relance (étapes futures du workflow), affichage du mode d'envoi, bouton prévisualiser PDF, warning « action irréversible enregistrée à l'historique », confirmation d'envoi (RelanceModal.tsx)
- RegleModal — confirmation « Marquer comme réglé » (RegleModal.tsx)
- RelancesGroupeesModal — wizard 3 étapes select/preview/success : choix du type, comptage éligibles par type, aperçu du modèle (variables {{nom}} {{montant}}…), liste destinataires avec alerte « pas d'email », écran succès (RelancesGroupeesModal.tsx)
- ExportModal — choix format PDF / Excel, récap nb impayés + montant, états loading/success (ExportModal.tsx)
- HistoriqueDetailModal — rendu email (de/à/objet/corps), courrier (destinataire/adresse/recommandé/n° suivi + boutons PDF), appel téléphonique (interlocuteur/durée/résumé/engagements), note (HistoriqueDetailModal.tsx)
- PreviewModal — visionneuse PDF avec zoom et téléchargement (PreviewModal.tsx)
- Filters — barre de filtres par statut + bouton Clôturés (Filters.tsx)
- SelectionBar / Header / StatsGrid / WorkflowLegend — barre de sélection, en-tête avec actions Exporter + Relances groupées, 4 KPI, légende du workflow
- Litiges — AUCUN modal réel : le bouton « Nouveau litige » n'ouvre rien (formulaire de création inexistant)

### Backend touche
- VUE v_unpaid_with_reminders — lecture liste impayés enrichie (listUnpaidWithReminders) — UTILISÉE par l'écran
- VUE v_unpaid_by_lot — lecture impayés basique + stats (listUnpaidByLot, getImpayesStats) — code présent, NON appelée par l'écran actif
- VUE v_payment_reminders_overview — lecture historique des relances (listPaymentReminders) — UTILISÉE par l'écran
- TABLE payment_reminders — insert (createPaymentReminder), update status='sent' (markReminderSent), update status='stale'/cancelled (cancelReminder) — code présent mais JAMAIS appelé par l'écran (orphelin)
- TABLE payment_reminder_rules — lecture des règles de relance (listReminderRules) — code présent, non câblé à l'UI
- TABLE call_for_funds_lines — lecture du détail des lignes impayées par lot (getUnpaidLinesForLot) — code présent, non câblé à l'UI
- Stockage GED via autoFileToGED (lib/services/auto-file-ged.service) — archivage fire-and-forget des PDF relances/exports
- AUCUN backend pour les litiges — pas de table litiges, pas de RPC, pas d'edge function ; rien n'est persisté ni lu
- AUCUNE écriture comptable sur « marquer réglé » — pas d'appel à create_ledger_transaction ni à une RPC d'encaissement/imputation (D512/C450)

### Issues connues
- RELANCES NON PERSISTÉES : useImpayesPage.handleSendRelance / handleSendRelancesGroupees simulent (setTimeout 1500-2000ms + setState) sans jamais appeler impayesApi.createPaymentReminder/markReminderSent. Tout disparaît au rechargement. Fichier: src/components/features/ventes-impayes/impayes/hooks/useImpayesPage.ts (l.303-374, 426-499)
- « MARQUER RÉGLÉ » FICTIF ET DANGEREUX : handleMarkAsRegle met montant=0 + statut=regle en mémoire, AUCUN encaissement comptable. L'impayé réapparaît au reload (la vue v_unpaid lit le grand livre réel) et aucune écriture n'est générée. useImpayesPage.ts l.377-409
- HOOK DE PERSISTANCE ORPHELIN #1 : src/hooks/modules/useImpayesMutations.ts (createReminder/markReminderSent/cancelReminder, complet et fonctionnel) n'est importé par AUCUNE page — code mort. La mémoire projet [vente_cleanup_chantier] dit de le GARDER en vue du câblage du recouvrement.
- HOOK DE LECTURE ORPHELIN #2 : src/hooks/modules/useImpayesData.ts (liste + filtres severity + getImpayesStats) jamais importé par une page — doublon non utilisé de la logique de useImpayesPage.
- LITIGES = COQUILLE VIDE : src/app/(dashboard)/contentieux/litiges/page.tsx — MOCK_LITIGES = [] inline + TODO « Replace with Supabase query when litiges table is created » ; 5 boutons (Nouveau litige, Ajouter note, Voir détails) SANS onClick = boutons morts.
- ENTITÉ LITIGES RICHE MAIS TOTALEMENT ORPHELINE : src/lib/mock-data/entities/litiges.ts définit un modèle Litige complet (référence, plaignant/mis en cause, type, statut, priorité, actions, résolution, montant indemnisation, notes confidentielles) + 4 mocks + helpers, mais N'EST IMPORTÉ NULLE PART. Doublon de modélisation jamais relié à la page.
- FALLBACK MOCK SUPPRIMÉ MAIS COMMENTAIRES PÉRIMÉS : l'atlas front-07 mentionne un fallback MOCK_IMPAYES ; le code actuel l'a retiré (commentaire « AUCUN fallback mock, audit 2026-06-12 »). L'atlas .planning/atlas/front-07-ventes-contentieux.md est donc partiellement périmé (ex: décrit encore le doublon byte-à-byte alors qu'il y a maintenant un redirect).
- DRIFT EN/FR & STATUTS DIVERGENTS : le modèle orphelin entities/litiges.ts utilise des statuts (ouvert/en_cours/mediation/contentieux/resolu/classe) différents de ceux de la page (OUVERT/EN_COURS/RESOLU/CLOS en MAJUSCULES) — deux taxonomies incompatibles.
- STATUT IMPAYÉ DÉRIVÉ HEURISTIQUEMENT : mapDelayLevelToStatut (useImpayesPage.ts l.30-49) déduit le statut depuis days_overdue/last_reminder_level faute de statut réel persisté — fragile, ne reflète pas l'état juridique réel.
- CHAMPS MANQUANTS DANS LA VUE : mapUnpaidToImpaye remplit batiment='' et adresse='' (commentaire « Not available in the view ») → la mise en demeure courrier/huissier affiche une adresse vide.
- TYPAGE any GÉNÉRALISÉ : lib/impayes/api.ts utilise createUntypedClient() (cast as any, eslint-disable) pour toutes les vues/tables — pas dans les types Supabase générés.
- CODE DOUTEUX dans getUnpaidLinesForLot : .lt('amount_paid', supabase.rpc ? undefined : undefined) — expression sans effet, filtrage réellement fait en JS ; reliquat de code à nettoyer (lib/impayes/api.ts l.382).
- ERREURS AVALÉES : nombreux console.error sans remontée UI dans lib/impayes/api ; handleExport avale l'erreur (catch {} ferme juste le modal sans message).
- EXPÉDITEUR EN DUR : HistoriqueDetailModal affiche « Copro Manager <syndic@copromanager.fr> » codé en dur (ancien nom de marque, pas CoProFlex).

### Besoins refonte (manager-first)
- Câbler réellement le recouvrement : brancher useImpayesPage sur useImpayesMutations (createPaymentReminder/markReminderSent) pour persister chaque relance dans payment_reminders, avec statut de livraison et trace d'envoi.
- Relier « marquer réglé » à la comptabilité : ouvrir le flux d'encaissement (paiement D512/C450 avec imputation FIFO par nature, cf. mémoire payment_imputation_rules) au lieu d'un setState — un impayé ne se règle pas, il s'encaisse.
- Construire un vrai module Litiges/Procédures : table litiges (réf, plaignant/mis en cause, type, statut, priorité, lot, responsable, documents liés, journal d'actions, résolution, montant), à partir du modèle déjà conçu dans entities/litiges.ts. CRUD complet + rattachement GED.
- Journal de recouvrement par dossier : le modèle NoteJournal/CategorieNote (commandement de payer, audience, jugement, huissier, échéancier, décision CS…) existe déjà dans types/models/impaye.ts mais n'est pas implémenté — c'est le cœur d'un suivi contentieux pro.
- Vue manager-first « pilotage du recouvrement » : prioriser par enjeu (montant × ancienneté × stade), alertes d'échéances légales (délai mise en demeure, prescription), prochaines actions à mener, exposer le coût/risque par dossier.
- Automatiser le workflow légal : relances auto J+15/J+30/J+60/J+90 via payment_reminder_rules (table déjà prête), génération LRAR avec n° de suivi, déclenchement mise en demeure art.19 loi 1965, escalade contentieux.
- Lier impayés ↔ procédure judiciaire ↔ frais récupérables : tracer les frais de recouvrement (art.10-1) imputables au copropriétaire défaillant, et le passage en contentieux comme dossier juridique structuré.
- Intégrer l'envoi réel (email/courrier/LRAR) avec un provider, accusés de réception, et statut delivery_status (déjà prévu dans payment_reminders).
- Unifier la taxonomie des statuts (une seule source de vérité), supprimer le doublon entities/litiges.ts vs page, et nettoyer le code mort (useImpayesData orphelin).
- Lien direct vers la fiche copropriétaire / état daté / annexe impayés depuis chaque dossier (parcours manager fluide).

### Questions ouvertes
- Périmètre du module Litiges : se limite-t-on au contentieux financier (impayés → procédure) ou couvre-t-on aussi les litiges non financiers (voisinage, travaux non autorisés, dégâts des eaux, contestation de charges) comme le suggère le modèle entities/litiges.ts ? Deux features distinctes ou une seule table « affaires » ?
- Modèle de données « Litige » : on part du modèle déjà conçu (entities/litiges.ts) avec plaignant/mis en cause polymorphes (copropriétaire/syndic/CS/prestataire/tiers) et journal d'actions, ou on conçoit du neuf ? Quel niveau de confidentialité (notes_confidentielles, accès CS) ?
- Le « réglé » d'un impayé : doit-il OBLIGATOIREMENT passer par un encaissement comptable (paiement saisi/rapproché) plutôt que par un bouton manuel ? Le bouton « marquer réglé » doit-il disparaître au profit du flux de paiement ?
- Statut de l'impayé : doit-il être dérivé du grand livre + des relances réelles (auto) ou piloté manuellement par le gestionnaire (stade juridique posé à la main) ? Aujourd'hui c'est une heuristique fragile.
- Automatisation des relances : les règles J+15/J+30… (payment_reminder_rules) doivent-elles déclencher des relances automatiques (cron/edge) ou rester sur une action manuelle assistée ? Qui valide l'envoi d'une LRAR/mise en demeure ?
- Frais de recouvrement art.10-1 : doit-on modéliser et imputer automatiquement les frais (relance, mise en demeure, huissier, avocat) au copropriétaire défaillant, et générer les écritures associées ?
- Intégration envoi réel : quel provider (email transactionnel, LRAR électronique type AR24, huissier) ? Faut-il tracer les preuves d'envoi/réception pour valeur juridique ?
- Rôles & visibilité : le module contentieux est-il réservé au gestionnaire, ou partagé avec le conseil syndical (lecture) et exposé partiellement au copropriétaire concerné (son propre dossier) ?
- Sort des hooks/mocks orphelins (useImpayesData, useImpayesMutations, entities/litiges.ts) : supprimer ou réutiliser comme socle de la refonte ? L'atlas front-07 doit-il être réécrit (il décrit un état partiellement périmé) ?

## Parametres (reglages, info copro, relances, modeles/templates)

### Ecrans
- **Hub Parametres** (`/settings`) - Page d'accueil des reglages : cartes de navigation vers les sous-sections (Informations copro, Tantiemes/cles via /finance/tantiemes) + carte laterale 'Copropriete' (nom/adresse). Page entierement statique : nom/adresse codes en dur a '' (TODO Supabase non fait).
- **Informations / Parametrage des lots** (`/settings/info`) - Gestion de la structure physique et juridique de la copro : batiments (REEL, Supabase), cles de repartition (MOCK), liste des lots avec tantiemes par cle (MOCK), actions globales de dedoublonnage (boutons morts). Mix incoherent reel/mock dans un meme ecran.
- **Configuration des relances** (`/settings/reminders`) - Pilotage des relances d'impayes automatiques : pause globale (date de fin + raison), regles par delai (J+x, actif/inactif, template associe), grille des templates email, edition de template, test en simulation (dry-run). Entierement branche Supabase + edge function.
- **Modeles de PV (liste)** (`/settings/templates`) - CRUD des modeles de proces-verbal d'AG : grille de cartes (template systeme verrouille + templates copro), creer, dupliquer, importer (JSON), exporter, definir par defaut, supprimer, apercu. Branche Supabase (table pv_templates).
- **Editeur de modele de PV** (`/settings/templates/[id]`) - Editeur de modele PV avec 3 onglets (Sections / Parametres / Formulations), insertion de variables {{...}}, apercu live HTML, export HTML/PDF/DOCX. Bloque pour les templates systeme (lecture seule, doit etre duplique).

### Actions cles
- Hub: naviguer vers Informations copro et vers Tantiemes/cles (/finance/tantiemes)
- Info/Batiments (REEL): ajouter un batiment (nom + nb etages), supprimer un batiment (les lots sont detaches via building_id ON DELETE SET NULL, pas supprimes)
- Info/Cles (MOCK): afficher formulaire, ajouter une cle de repartition, annuler — etat local uniquement, perdu au refresh
- Info/Lots (MOCK): ajouter un lot, editer un lot (numero, type, principal, coproprietaire, tantiemes generaux + tantiemes par cle), supprimer un lot (confirm() natif), sauvegarder/annuler — etat local uniquement
- Info/Actions globales: 'Dedoublonner un coproprietaire', 'Rattacher deux coproprietaires', 'Valider' — 3 boutons SANS aucun onClick (morts)
- Relances: activer/suspendre les relances (toggle pause), definir date de fin de pause + raison, enregistrer les reglages
- Relances: activer/desactiver une regle, modifier le delai (J+x, valide 1-365, refuse les doublons de delai actif), associer un template a une regle
- Relances: editer un template email (sujet, corps HTML, corps texte) avec apercu et liste de variables disponibles
- Relances: lancer un test en simulation (dry-run) — appelle l'edge function run_payment_reminders et affiche le nombre de relances qui seraient envoyees
- Relances: 'Retour aux relances' vers /finance/unpaid/reminders
- Templates PV: creer un modele (nom + description) puis redirige vers l'editeur
- Templates PV: dupliquer, exporter (telechargement JSON via Blob), importer (collage JSON), definir par defaut (RPC transactionnelle set_default_pv_template), supprimer
- Templates PV editeur: activer/desactiver une section (sauf required), editer le contenu HTML d'une section, inserer une variable a la position du curseur, reordonner (reorderSections expose mais non cable dans l'UI), modifier global/header/formulations, exporter HTML/PDF/DOCX (avec donnees mock)

### Formulaires & modales
- Info: formulaire inline 'Ajouter une cle de repartition' (input nom + Ajouter/Annuler)
- Info: formulaire inline LotEditForm (numero, type select, checkbox lot principal, coproprietaire select, tantiemes generaux, un champ tantieme par cle additionnelle) avec validation disabled si numero/coproprietaire vides
- Info: bloc BuildingsManager (input nom + input nb etages + bouton Ajouter, liste avec suppression) — seul formulaire reellement persiste
- Info: confirm() natif du navigateur pour la suppression d'un lot
- Relances: TemplateEditModal (sujet, corps HTML monospace, corps texte optionnel, tags de variables, apercu via dangerouslySetInnerHTML)
- Relances: section pause inline (toggle + date + raison + boutons Tester/Enregistrer)
- Templates PV: CreateTemplateModal (nom + description)
- Templates PV: DeleteTemplateModal (confirmation irreversible)
- Templates PV: ImportTemplateModal (textarea JSON)
- Templates PV: VariablesPalette (panneau lateral d'insertion de variables), PreviewPanel (apercu live), menu contextuel par carte (Dupliquer/Exporter/Definir par defaut/Supprimer)

### Backend touche
- Tables: buildings (CRUD via lib/buildings/api.ts), lots.building_id (FK ON DELETE SET NULL)
- Tables: payment_reminder_rules (list/create/update via lib/finance/api.ts)
- Tables: reminder_settings (get avec defaut PGRST116, upsert via updateReminderSettings)
- Tables: email_templates (list filtre copro_id NULL ou =copro, update via updateEmailTemplate)
- Tables: pv_templates (list/get/create/update/delete via pv-template.service.ts, filtre copro_id=org OR is_system_template)
- RPC: set_default_pv_template (migration 0052, transactionnelle, dé-flague + pose le nouveau defaut), increment_template_usage
- Edge functions: run_payment_reminders (test dry-run + execution reelle), send_manual_payment_reminder (sendManualReminder, non utilise dans CE domaine mais expose)
- RLS: buildings (lecture=acces copro, ecriture=gestionnaire, 0034), trigger tr_lot_copro_consistency
- AUCUN backend: /settings hub (nom/adresse codes en dur ''), cles de repartition et lots de /settings/info (etat React local mock, MOCK_COPROPRIETAIRES en dur)

### Issues connues
- DRIFT MAJEUR — coexistence reel/mock dans /settings/info: les batiments sont persistes en base mais les CLES DE REPARTITION et les LOTS sont du pur etat local mock (useInfoCoproPage.ts lignes 30-78, MOCK_COPROPRIETAIRES, lots/cles en useState). Tout est perdu au refresh, aucune ecriture Supabase. Le vrai CRUD lots/cles existe ailleurs (components/features/lots: CreateLotModal, CreateKeyModal, LotTable, LotsRepartitionGrid) et N'EST PAS utilise ici.
- 3 boutons morts dans GlobalActions.tsx (settings/info): 'Dedoublonner un coproprietaire', 'Rattacher deux coproprietaires', 'Valider' — aucun onClick.
- Bouton mort 'Apercu' (handlePreview) dans useTemplatesPage.ts ligne 99-101: redirige vers /settings/templates/[id]/preview, route INEXISTANTE (aucun dossier preview). 404 garanti.
- Stub assume — getValidationStatus dans useTemplatesPage.ts lignes 103-108 retourne TOUJOURS {status:'valid'}: 'TODO: validateTemplate is now async... return valid status to unblock build'. Le badge de validation des cartes est donc faux. La vraie validation (validateTemplate) existe dans le service mais n'est jamais appelee a l'affichage.
- TODO non fait — /settings hub page.tsx ligne 8: 'TODO: Fetch from Supabase coproprietes table', nom/adresse de la copro affiches vides en dur.
- Erreurs avalees — pv-template.service.ts: nombreux catch qui console.error puis return null/[] (listTemplates, createTemplate, updateTemplate, deleteTemplate, setDefaultTemplate); l'UI ne distingue pas 'pas de template' de 'erreur reseau'. createTemplate avale meme le code 42P01 (table absente) sans message clair.
- UX brute — suppression de lot via confirm() natif (useInfoCoproPage.ts ligne 96), incoherent avec les modales custom du reste de l'app.
- Cartes masquees (TODO go-live) dans /settings hub: 'Visibilite des informations' (/settings/visibility, route inexistante, lie aux roles copro #14) et 'Mes factures CoProFlex' (/invoices, route inexistante) — fonctionnalites prevues mais non construites.
- upsert reminder_settings (api.ts ligne 1687) chaine un .eq('copro_id') apres .upsert(): le .eq est ignore par PostgREST sur un upsert, il faut que copro_id soit la cle de conflit — risque de doublon si pas de contrainte unique sur copro_id.
- Fonctionnalite exposee mais non cablee: reorderSections (usePVTemplates) — aucun drag&drop ni bouton de reordre dans SectionEditor de l'editeur.
- Doublon de notion 'template': deux systemes totalement separes — templates EMAIL de relance (email_templates) et templates PV (pv_templates), tous deux sous /settings, avec deux moteurs de variables {{...}} distincts et deux UI d'edition differentes.
- XSS potentiel — apercu de template email via dangerouslySetInnerHTML (TemplateEditModal ligne 105) et apercu PV; contenu editable par le gestionnaire (risque limite mais a noter).

### Besoins refonte (manager-first)
- Brancher reellement les CLES DE REPARTITION et les LOTS de /settings/info sur Supabase en reutilisant le CRUD existant (components/features/lots) au lieu du mock — c'est le coeur du parametrage d'une copro et aujourd'hui rien n'est persiste.
- Unifier le parametrage 'structure copro' (batiments + lots + cles + tantiemes + coproprietaires) dans un ecran coherent, avec controle de coherence des tantiemes (somme = base de la cle, alerte si total ≠ 10000/1000 selon EDD) — un syndic attend une verification automatique de l'equilibre des tantiemes par cle.
- Implementer les vraies actions metier de gestion des coproprietaires (dedoublonnage, rattachement de comptes, fusion) aujourd'hui en boutons morts — ce sont des operations reelles et sensibles (impact grand livre/comptes tiers).
- Ajouter un ecran 'Identite de la copro' editable (raison sociale, adresse, n° immatriculation RNIC, regime, RIB syndic, dates d'exercice, syndic/mandat) — actuellement le hub affiche nom/adresse en dur vides; un syndic a besoin de gerer la fiche signaletique legale.
- Construire la gestion de visibilite/roles (carte masquee) pour le portail coproprietaire et conseil syndical, alignee avec la refonte manager-first et les espaces copro/CS prevus.
- Reunir les deux familles de modeles (emails de relance + PV + a terme convocations, etats dates, courriers) sous un module 'Modeles/Documents' coherent avec un editeur et un moteur de variables uniques, plutot que deux systemes paralleles.
- Apercu de modele avec donnees REELLES de la copro selectionnee (pas seulement mock) et validation affichee fidelement (cabler validateTemplate au lieu du stub 'toujours valide').
- Audit/journal des changements de parametres (qui a modifie une cle, un tantieme, une regle de relance, un modele) — tracabilite attendue d'un syndic professionnel.
- Permissions granulaires gestionnaire vs assistant sur les parametres sensibles (tantiemes, regles de relance) et garde-fous (impossible de modifier des tantiemes sur un exercice cloture).

### Questions ouvertes
- Le parametrage des lots/cles/tantiemes doit-il rester sous /settings ou migrer entierement vers /finance/tantiemes et /coproprietaires (annuaire+lots), /settings ne gardant que les reglages transverses ? Aujourd'hui c'est dedouble et incoherent.
- Quelle est la source de verite des tantiemes : la table lots/lot_repartition_keys (cf. components/features/lots) ou un autre modele ? Le mock de /settings/info reinvente une structure (autresCles en Record<string,number>) qui ne correspond pas au schema reel.
- Modification des tantiemes en cours d'exercice : interdite (immutabilite type grand livre) ou autorisee avec historisation/date d'effet ? Decision metier necessaire avant de cabler.
- Faut-il fusionner email_templates et pv_templates en un seul moteur de modeles, ou les garder separes (cycles de vie tres differents) ?
- Les relances : confirmer que reminder_settings a bien une contrainte unique sur copro_id (sinon l'upsert est bugue) et clarifier la portee (par copro vs par cabinet).
- Que doit contenir la 'fiche identite copro' editable et quels champs sont legalement obligatoires (immatriculation RNIC, etc.) pour un vrai syndic ?
- Roles/visibilite (carte masquee #14): quels niveaux (gestionnaire, assistant, coproprietaire, conseil syndical) et quel parametrage exposer cote /settings ?
- Les actions 'dedoublonner/rattacher coproprietaire' relevent-elles des parametres ou de l'annuaire coproprietaires ? Definir leur effet exact sur les comptes tiers (450) et le grand livre.
- Le template systeme PV (system-default, code en dur dans le service, pas en base) est-il la bonne approche, ou faut-il un seed en base versionne pour pouvoir le faire evoluer ?

## Dashboard & Portefeuille

### Ecrans
- **Dashboard copropriété (tableau de bord mono-copro)** (`/dashboard`) - Écran d'accueil d'une copropriété active. Grille bento : Trésorerie (compte courant + fonds travaux), Prochaine AG (compte à rebours), Budget courant (% consommé), Ordres de service (urgents/en cours/programmés), À traiter maintenant (todos priorisés), Activité récente. États loading/error/empty gérés. TopBar avec raccourcis (Créer ODS, Appel de fonds, Nouvelle facture, Refresh).
- **Mon Portefeuille (sélecteur multi-copro gestionnaire)** (`/portefeuille`) - Vue consolidée du parc : KPIs agrégés (encaisse totale, taux de recouvrement, impayés totaux, mouvements non rapprochés), bande Actions Critiques + Maintenance + Prochaines AG, alertes de reprise d'onboarding (471/472 != 0), liste/recherche des copros. Cliquer une copro la définit comme active (setActiveCopro) et redirige vers /dashboard. Bouton Nouvelle copropriété -> /onboarding.
- **Marketing / Accueil (racine publique)** (`/`) - Landing marketing publique (DiscoverSection, FeatureGrid, démos). N'EST PAS le sélecteur de portefeuille malgré l'énoncé : la racine / est la page marketing, le sélecteur réel est /portefeuille dans l'espace (gestionnaire).

### Actions cles
- Dashboard: rafraîchir les KPIs (bouton refresh -> refetch getDashboardData)
- Dashboard: naviguer vers comptabilité (BentoTresorerie 'Voir les comptes' -> /finance/comptabilite)
- Dashboard: lancer un rapprochement bancaire (BentoTresorerie 'Rapprocher' -> /finance/mouvements-bancaires)
- Dashboard: préparer/créer une AG (BentoAG -> /ag/{id} si AG existante, sinon /ag/new ; fallback /ag/dashboard)
- Dashboard: voir/créer le budget (BentoBudget -> /finance/budgets)
- Dashboard: traiter/suivre/planifier les ODS par statut (BentoODS -> /maintenance/service-orders?status=urgent|en_cours|programme)
- Dashboard: créer un ordre de service (BentoODS + TopBar -> /maintenance/service-orders/new)
- Dashboard: ouvrir une tâche prioritaire via deep_link (BentoPriorites -> /finance/unpaid, /ag/dashboard, /finance/bank-movements, /maintenance/contracts, /maintenance/logbook selon todo_type)
- Dashboard: raccourcis TopBar (Appel de fonds -> /finance/appels-fonds ; Nouvelle facture -> /finance/factures)
- Dashboard: bannière 'opérations de travaux à apurer' -> /finance/operations-a-apurer (n'apparaît que si soldes 12 en attente)
- Portefeuille: rechercher une copro par nom/adresse (filtre client)
- Portefeuille: sélectionner une copro -> bascule la copro active (sessionStorage + cache mémoire) puis /dashboard
- Portefeuille: créer une nouvelle copropriété -> /onboarding
- Portefeuille: ouvrir l'alerte de reprise d'onboarding -> modale RepriseSoldes (saisie soldes d'entrée par lot)
- Portefeuille: bouton 'Voir tout le flux' (Actions Critiques) -> AUCUNE action (bouton mort, pas de onClick)

### Formulaires & modales
- RepriseAlertModal (portefeuille): modale d'achèvement de reprise d'onboarding. Résout la période d'onboarding (resolveOnboardingPeriod) puis affiche RepriseSoldes (saisie des soldes d'entrée 471/472 par lot). Ne crée jamais de période en effet de bord ; message clair si aucune reprise identifiable.
- Aucun autre vrai formulaire dans CE domaine : le dashboard et le portefeuille sont en lecture seule + navigation. Toute saisie (AG, budget, ODS, facture, paiement) se fait dans les domaines cibles via deep-links.
- Barre de recherche portefeuille (input contrôlé, pas un formulaire soumis).

### Backend touche
- RPC fn_dashboard_kpis(p_copro_id, p_period_id) -> jsonb {tresorerie, total_impayes, provisions_travaux, dettes, budget_vote, budget_realise, budget_pct} (SECURITY DEFINER, garde is_service_call/user_has_copro_access) — source unique des KPIs financiers du dashboard
- Vue v_dashboard_kpis (security_invoker) : current_balance (512 hors 5121), unpaid_total + unpaid_lots_count (v_unpaid_by_lot), next_ag_id/title/date — utilisée par le portefeuille (KPIs par copro) ET pour unpaid_lots_count du dashboard
- Vue v_dashboard_recent_activity : UNION AG (ag_meetings) + paiements (payments+lots) + appels (call_for_funds) + factures (supplier_invoices) + ODS (service_orders) + carnet (logbook_entries) + documents (documents) — alimente BentoActivite
- Vue v_dashboard_todos : UNION impayés >60j (v_unpaid_by_lot) + AG brouillon (ag_meetings) + mouvements non rapprochés (bank_movements) + contrats à renouveler (contracts) + contrôles à effectuer (logbook_entries) — alimente BentoPriorites
- Table ag_meetings : requête directe dans getDashboardKpis (prochaine AG, statuts draft/convoked/in_progress/session_active)
- Table copros : liste (onboarding_step IS NULL) pour le portefeuille et getActiveCopro ; détail dans CoproContext (loadCoproDetails)
- Tables memberships + profiles : rôle utilisateur + cabinet_id dans CoproContext ; gardes de layout (gestionnaire/dashboard)
- getActiveAccountingPeriod (lib/finance/accounting-period) : résout p_period_id pour fn_dashboard_kpis
- Table ledger_entries + accounts + ledger_transactions : getRepriseResidual (net 471/472 des tx source_type='opening_onboarding') pour les alertes de reprise du portefeuille
- Migrations : 0028 (fn_dashboard_kpis), 0049 (recrée v_dashboard_kpis + vues écrans), 0047 (rename unpaid_lots_count), 0054 (vues mutations dashboard)

### Issues connues
- BENTO ODS MORT : page.tsx passe kpis.ods_urgents/ods_en_cours/ods_programmes/ods_*_names à BentoODS, mais getDashboardKpis (src/lib/dashboard/api.ts) ne les renvoie JAMAIS et fn_dashboard_kpis (DB) ne les calcule pas. Les champs ods_* du type KpisData (useDashboardMainPage.ts:26-32) sont donc toujours undefined -> BentoODS affiche systématiquement '0 ouverts' et aucune ligne, seulement le bouton 'Créer un ODS'. Drift type<->données.
- DEEP-LINK 404 : v_dashboard_recent_activity pointe les paiements et appels vers '/finance/calls' qui N'EXISTE PAS (la route réelle est /finance/appels-fonds). Toute activité FINANCE de type paiement/appel mène à une page introuvable.
- DOUBLONS EN/FR de routes finance utilisés de façon incohérente dans le même domaine : v_dashboard_recent_activity -> /finance/invoices ; v_dashboard_todos -> /finance/bank-movements ; BentoTresorerie -> /finance/mouvements-bancaires ; TopBar -> /finance/factures. Les deux variantes (invoices/factures, bank-movements/mouvements-bancaires) coexistent (migration EN->FR non terminée).
- BOUTON MORT : PortefeuilleSummary.tsx 'Voir tout le flux' (ligne 132) n'a aucun onClick/href.
- LIENS MASQUÉS / pages inexistantes : BentoPriorites (TODO ligne 64) et BentoActivite (TODO ligne 23) ont leurs liens 'Voir les N tâches' (/tasks) et 'Tout voir' (/activity) commentés car les pages n'existent pas.
- DONNÉES PORTEFEUILLE EN DUR : usePortefeuille mappe nombreLots=0, tauxRecouvrement=100, budgetTotal=0, facturesEnRetard=0, mouvementsNonRapproches=0, alertes=[] (api ne les fournit pas). Conséquences : KPI 'Taux Recouvrement' toujours 100% (libellé 'Excellent'), aucune copro jamais 'à risque', cartes Actions Critiques budget/factures/rapprochement jamais affichées. Le total lots affiché dans le header est donc toujours 0.
- CHIFFRES FACTICES : PortefeuilleSummary affiche '+4.2%' en dur (kpiTrend Encaisse Totale) et des avatars maintenance JD/ML/+4 codés en dur ; GestionnaireSidebar footer affiche 'Jean Dupont / Syndic professionnel' en dur.
- INDICATEURS LIGNE COPRO TROMPEURS : PortefeuilleCoproRow utilise facturesEnRetard (toujours 0) pour le compteur Maintenance et copro.alertes (toujours []) pour les alertes critiques -> toujours 0/OK.
- LABEL AMBIGU : BentoTresorerie 'Fonds travaux' est en réalité provisions_travaux = solde 103+105 (fonds réserve + ALUR), PAS la trésorerie du compte bancaire travaux 5121 (choix documenté USER 2026-06-08 mais source de confusion gestionnaire).
- DOC OBSOLÈTE : activeCopro.ts documente l'usage de get_default_copro_id() mais le code fait un .from('copros') direct ; la fonction get_default_copro_id n'existe pas en base (commentaire trompeur, pas un bug runtime).
- RISQUE RLS DOCUMENTÉ : v_dashboard_kpis en security_invoker n'est fiable que pour un gestionnaire ; un copropriétaire verrait des montants partiels présentés comme totaux copro (commentaire SQL d'avertissement, à trancher avant portail copro).
- FETCH N+1 PORTEFEUILLE : getRepriseResidual est appelé en Promise.all une fois PAR copro à chaque montage du portefeuille (boucle sur ledger_entries) -> coût croissant avec le parc, sans cache.
- MODE MULTI-COPRO DÉSACTIVÉ : CoproContext.SINGLE_COPRO_MODE=true + CoproSelector neutralisé (dropdown commenté) ; isManager forcé à true (|| true) ; setCurrentCoproId conservé mais 'sans effet' annoncé alors qu'il agit réellement (override). Le portefeuille reste l'unique moyen de switcher de copro.

### Besoins refonte (manager-first)
- Câbler réellement la tuile Ordres de service : ajouter le calcul ods_urgents/en_cours/programmes (+ noms) à fn_dashboard_kpis ou une vue dédiée, sinon retirer la tuile pour ne pas mentir au gestionnaire.
- Unifier les routes finance (choisir FR ou EN, supprimer le doublon) et corriger les deep_links des vues (/finance/calls -> /finance/appels-fonds) — un syndic qui clique une activité doit atterrir sur la bonne page.
- Remplir les vrais indicateurs portefeuille (nombre de lots, taux de recouvrement réel, factures en retard, mouvements non rapprochés, budgets à risque, alertes) via une vue d'agrégat par copro plutôt que des 0 en dur ; supprimer les chiffres factices (+4.2%, avatars, Jean Dupont).
- Dashboard manager-first : prioriser ce qui demande une décision (impayés critiques échus, AG à convoquer dans les délais légaux art.64, appels de fonds à émettre, factures à valider/payer, rapprochements en attente, contrats/diagnostics expirants) avec montants et échéances datées, pas une grille uniforme.
- Ajouter des indicateurs de conformité légale en tête (DPE collectif, PPT, fonds travaux ALUR vs minimum légal, AG annuelle obligatoire dans les 6 mois de la clôture) — un syndic pilote d'abord ses obligations.
- Vue trésorerie multi-comptes claire : séparer compte courant (512) / compte travaux bancaire (5121) / réserve ALUR (105) / fonds réserve (103) avec libellés exacts, au lieu de fusionner provisions et trésorerie.
- Portefeuille : tri/filtre par criticité (le champ criticalityScore existe mais vaut 0 partout), badges d'alerte réels par copro, colonne 'prochaine échéance' (AG, clôture, appel) ; rendre la recherche serveur si le parc grossit.
- Réactiver un vrai sélecteur de copro dans la barre (en plus du portefeuille) pour switcher sans repasser par la liste, et préparer proprement le multi-copro (retirer le || true sur isManager, gérer les rôles).
- Activité récente : pagination/'tout voir' réelle (page /activity) ou retrait du teaser ; idem page tâches /tasks.
- Performance : remplacer le N+1 getRepriseResidual par une vue/agrégat unique des reprises non soldées du parc.

### Questions ouvertes
- Le sélecteur de portefeuille reste-t-il à /portefeuille (espace gestionnaire) ou devient-il la vraie page d'atterrissage post-login ? Faut-il un sélecteur permanent en barre en plus de la liste ?
- Repasse-t-on en multi-copro (KPIs consolidés réels, switch rapide) ou le mono-copro reste-t-il le mode cible ? Cela conditionne CoproContext, isManager et la RLS des vues.
- Quelle est la définition métier validée de 'Fonds travaux' affichée au gestionnaire : réserve ALUR (105) seule, 103+105, ou la trésorerie du compte bancaire travaux 5121 ? (incohérence actuelle dashboard vs intuition).
- Quels indicateurs de criticité d'une copro doit-on calculer et avec quels seuils (impayés, budget consommé, rapprochements, conformité) pour un tri 'à risque' utile ?
- Le dashboard doit-il être réutilisé pour le portail copropriétaire (mêmes vues) ? Si oui, trancher la politique RLS car les KPIs security_invoker exposent des montants partiels comme des totaux.
- Quelles obligations légales (AG dans les délais, DPE, PPT, ALUR minimum, dates d'état daté) doivent remonter en alertes prioritaires sur le tableau de bord d'un vrai syndic ?
- Quelle est la source canonique unique des KPIs : fn_dashboard_kpis (RPC) ou v_dashboard_kpis (vue) ? Les deux coexistent avec des règles 'censées' identiques — en garder une seule.
- Sur quelle profondeur/règle calcule-t-on les 'todos' (>60j pour impayés, 30j contrats, 7j contrôles) — ces seuils sont-ils ceux voulus par le métier ou à paramétrer par cabinet ?
