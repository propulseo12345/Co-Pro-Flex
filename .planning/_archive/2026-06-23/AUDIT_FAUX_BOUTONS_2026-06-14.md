# Audit « faux boutons » — reliquat J4 (2026-06-14)

> Généré par le workflow `j4-faux-boutons-audit` (5 agents read-only + synthèse). Recoupe le pass J10 (polish). Un bouton conditionnellement désactivé n'est PAS un faux bouton.

**Total : 29 findings** — no_handler:28, empty_handler:1

## Couverture par module

| Module | Findings | Parcouru |
|---|---|---|
| finance | 10 | Audit systématique de 156 fichiers React du module finance (src/components/features/financ |
| ag (CoProFlex) | 0 | 183 fichiers TSX examinés (128 avec boutons identifiés par grep). Analyse exhaustive inclu |
| maintenance | 4 | 64 fichiers du module maintenance parcourus, 237 éléments <button> examinés, 61 fichiers a |
| documents-communication | 10 | 30 fichiers examinés : 19 du module documents/ged + 11 du module communication (mail, mur, |
| ventes-copro-divers | 3 | 81 fichiers examinés, environ 120+ boutons analysés dans les 6 dossiers cibles |

## ✅ Nets à corriger (confidence ≥ 70)

| Fichier:ligne | Bouton | Type | Action suggérée |
|---|---|---|---|
| `src/components/features/documents/ged/components/Header.tsx:41` | Importer | no_handler | Cabler onClick={onImport} (passer le handler en prop depuis le parent) - import GED est une feature attendue, pas un bouton a supprimer |
| `src/components/features/portefeuille/PortefeuilleSummary.tsx:132` | Voir tout le flux | no_handler | Cabler onClick pour naviguer vers la page complete du flux/activite, sinon supprimer |
| `src/components/features/documents/ged/components/DocumentList.tsx:129` | Telecharger (tableau) | no_handler | Cabler onClick={() => handleDownload(doc)} - telechargement GED via storage Supabase |
| `src/components/features/documents/ged/components/DocumentGrid.tsx:149` | Telecharger (grille) | no_handler | Cabler onClick={() => handleDownload(doc)} - meme handler que DocumentList, factoriser |
| `src/features/communication/mail/components/MailReader.tsx:164` | Telecharger (piece jointe) | no_handler | Cabler onClick={(e) => handleDownloadAttachment(e, att.id)} |
| `src/features/communication/mail/components/ComposeModal.tsx:176` | Joindre un fichier | no_handler | Cabler onClick vers un <input type=file> cache (ref.click()) pour la selection de fichier |
| `src/components/features/ventes-impayes/RelanceModal.tsx:60` | Envoyer les relances | no_handler | Cabler onClick={handleSendRelances} - aucun handler present, le disabled ne suffit pas (verifie dans le code: bouton inerte) |
| `src/components/features/ventes-impayes/ImpayesCritiquesSection.tsx:98` | Envoyer une relance | empty_handler | Le onClick ne fait que e.stopPropagation(); ajouter l'appel d'envoi de relance apres, ou supprimer le bouton |
| `src/features/maintenance/serviceOrders/components/ServiceOrdersFinanceView.tsx:80` | Exporter | no_handler | Cabler onClick={onExport} (le pattern onGoToNew existe deja ligne 83, calquer dessus) |
| `src/features/communication/mail/components/MailReader.tsx:187` | Transferer | no_handler | Cabler onClick={() => onForward?.(mail)} et ajouter la prop onForward |
| `src/features/communication/mail/components/MailSidebar.tsx:103` | Element de label (liste) | no_handler | Cabler onClick={() => onLabelSelect(label.id)} - un item de liste sans handler est un selecteur mort |
| `src/features/communication/mail/components/MailSidebar.tsx:115` | Ajouter un label | no_handler | Cabler onClick={onCreateLabel} (modale de creation) |
| `src/components/features/maintenance/Logbook/TravauxTab.tsx:51` | Consulter le PPT | no_handler | Cabler onClick vers la route/action de consultation du PPT (router.push) ou supprimer si PPT pas encore en place |
| `src/features/maintenance/providers/components/ProviderInfoSections.tsx:241` | N piece(s) jointes | no_handler | Cabler onClick pour telecharger/ouvrir les pieces jointes de l'intervention |
| `src/components/features/finance/Ledger/EcrituresModal.tsx:78` | Export Excel | no_handler | Cabler onClick vers export Excel des ecritures (voir besoin produit export ci-dessous) |

## ⚖️ À trancher (décision produit)

- EXPORTS finance (decision produit unique a trancher en lot): BalanceTable.tsx:111 'Exporter', BalanceHeader.tsx:25 'Export Excel' + :26 'Export PDF', EcrituresModal.tsx:78 'Export Excel'. Question: implemente-t-on l'export comptable (CSV/Excel/PDF) maintenant, ou retire-t-on ces boutons jusqu'a la feature ? 4 boutons morts qui dependent du meme choix.
- ComptaTopBar.tsx:73 'Copier': copier quoi exactement (titre/periode/numero d'ecriture) ? L'action n'est pas evidente -> definir l'intention produit avant de cabler, sinon supprimer.
- ClotureModal.tsx:112 'Categoriser' et ClotureTab.tsx:123 'Cloturer [mois]': dependent du workflow de cloture bancaire/comptable (RPC cote base). A trancher: ces actions appellent quelle RPC, et le flux de cloture est-il deja implemente cote serveur ?
- Appels de fonds travaux (TravauxCard.tsx:64 'Avis PDF', :74 'Relancer', :76 'Envoyer'): dependent du moteur d'appels de fonds/relances + generation PDF. A cadrer avec le chantier finance avant cablage.
- ChatPanel.tsx:180 'Creer OS' et :186 'Fiche copro': dependent de l'existence des workflows ordre de service et navigation fiche copro -> confirmer que ces destinations existent avant de cabler.
- PlannedOrdersSection.tsx:142 (chevron toggle): PAS un faux bouton net. Le parent <div> ligne 120 a deja onClick toggle, le clic fonctionne par propagation. Decision qualite: soit ajouter onClick explicite sur le bouton, soit retirer le <button> (garder l'icone) pour eviter le double-element trompeur.

## Tous les findings (brut)

| Module | Fichier:ligne | Bouton | Type | Conf. | Action |
|---|---|---|---|---|---|
| finance | `src/components/features/finance/Comptabilite/BalanceTable.tsx:111` | Exporter | no_handler | 95 | Ajouter onClick avec fonction d'export CSV/Excel pour la balance comptable, ou s |
| finance | `src/features/finance/balance/components/BalanceHeader.tsx:25` | Export Excel | no_handler | 95 | Câbler vers une fonction d'export Excel ou supprimer si non implémenté |
| finance | `src/features/finance/balance/components/BalanceHeader.tsx:26` | Export PDF | no_handler | 95 | Câbler vers une fonction d'export PDF ou supprimer si non implémenté |
| finance | `src/features/finance/appels-fonds/components/TravauxCard.tsx:64` | Avis PDF | no_handler | 90 | Implémenter onClick pour générer et télécharger l'avis PDF du projet, ou supprim |
| finance | `src/features/finance/appels-fonds/components/TravauxCard.tsx:74` | Relancer | no_handler | 90 | Implémenter onClick pour ouvrir une modale de relance ou naviguer vers page rela |
| finance | `src/features/finance/appels-fonds/components/TravauxCard.tsx:76` | Envoyer | no_handler | 90 | Implémenter onClick pour envoyer les appels de fonds ou notifications aux coprop |
| finance | `src/components/features/finance/Comptabilite/ComptaTopBar.tsx:73` | Copier | no_handler | 85 | Implémenter onClick pour copier le titre/période actuelle dans le presse-papiers |
| finance | `src/components/features/finance/Comptabilite/modals/ClotureModal.tsx:112` | Catégoriser | no_handler | 92 | Câbler onClick pour naviguer vers page de catégorisation ou ouvrir modale de cat |
| finance | `src/features/finance/mouvements-bancaires/components/ClotureTab.tsx:123` | Clôturer [mois] | no_handler | 93 | Implémenter onClick pour déclencher clôture du mois comptable via API |
| finance | `src/components/features/finance/Ledger/EcrituresModal.tsx:78` | Export Excel | no_handler | 94 | Câbler onClick pour exporter la liste des écritures en Excel |
| maintenance | `src/components/features/maintenance/Logbook/TravauxTab.tsx:51` | Consulter le PPT | no_handler | 95 | Ajouter onClick ou connecter à une route/action. Exemple: onClick={() => router. |
| maintenance | `src/components/features/maintenance/Contracts/PlannedOrdersSection/PlannedOrdersSection.tsx:142` | (Chevron toggle icon) | no_handler | 85 | Ajouter onClick={() => setIsExpanded(!isExpanded)} ou retirer le bouton car le p |
| maintenance | `src/features/maintenance/serviceOrders/components/ServiceOrdersFinanceView.tsx:80` | Exporter | no_handler | 95 | Ajouter onClick={onExport} ou onClick pour déclencher l'export. Voir ligne 83 po |
| maintenance | `src/features/maintenance/providers/components/ProviderInfoSections.tsx:241` | N pièce(s) jointes | no_handler | 90 | Ajouter onClick pour télécharger/afficher les pièces jointes. Exemple: onClick={ |
| documents-communication | `src/components/features/documents/ged/components/DocumentList.tsx:129` | Télécharger (dans le tableau) | no_handler | 95 | Ajouter onClick={handleDownload} ou implémenter la fonction de téléchargement ma |
| documents-communication | `src/components/features/documents/ged/components/DocumentGrid.tsx:149` | Télécharger (dans la grille) | no_handler | 95 | Ajouter onClick={handleDownload} ou implémenter la fonction de téléchargement ma |
| documents-communication | `src/components/features/documents/ged/components/Header.tsx:41` | Importer | no_handler | 98 | Ajouter onClick={onImport} et passer le handler en prop depuis le composant pare |
| documents-communication | `src/features/communication/mail/components/MailReader.tsx:164` | Télécharger (pièce jointe) | no_handler | 95 | Ajouter onClick={(e) => handleDownloadAttachment(e, att.id)} avec implémentation |
| documents-communication | `src/features/communication/mail/components/MailReader.tsx:187` | Transférer | no_handler | 92 | Ajouter onClick={(e) => onForward?.(mail)} ou implémenter la prop onForward avec |
| documents-communication | `src/features/communication/mail/components/ComposeModal.tsx:176` | Joindre un fichier | no_handler | 95 | Ajouter onClick={handleAttach} et créer une fonction pour gérer la sélection de  |
| documents-communication | `src/features/communication/mail/components/MailSidebar.tsx:103` | Élément de label (liste) | no_handler | 90 | Ajouter onClick={() => onLabelSelect(label.id)} ou onClick={() => onFolderChange |
| documents-communication | `src/features/communication/mail/components/MailSidebar.tsx:115` | Ajouter un label | no_handler | 92 | Ajouter onClick={onCreateLabel} ou implémenter une modale de création de label |
| documents-communication | `src/features/communication/messagerie/components/ChatPanel.tsx:180` | Créer OS | no_handler | 90 | Ajouter onClick={onCreateOS} ou implémenter une modale/workflow pour créer un or |
| documents-communication | `src/features/communication/messagerie/components/ChatPanel.tsx:186` | Fiche copro | no_handler | 90 | Ajouter onClick={onViewCoprietaireSheet} ou implémenter la navigation vers la fi |
| ventes-copro-divers | `src/components/features/ventes-impayes/RelanceModal.tsx:60` | Envoyer les relances | no_handler | 95 | Ajouter onClick handler ou câbler vers une fonction d'envoi de relances (par ex. |
| ventes-copro-divers | `src/components/features/portefeuille/PortefeuilleSummary.tsx:132` | Voir tout le flux | no_handler | 98 | Ajouter onClick pour naviguer vers la page complète ou câbler onClick={handleVie |
| ventes-copro-divers | `src/components/features/ventes-impayes/ImpayesCritiquesSection.tsx:98` | Envoyer une relance | empty_handler | 92 | Implémenter la logique d'envoi de relance dans le onClick, ou supprimer le bouto |

## Synthèse

29 findings, 0 doublon reel (toutes les paires Telecharger GED / Export Excel / MailSidebar pointent des fichiers ou lignes distincts). Repartition: 28 no_handler + 1 empty_handler. J'ai verifie 2 cas ambigus dans le code: (1) RelanceModal 'Envoyer les relances' n'a vraiment aucun onClick (le disabled ne le rend pas fonctionnel) -> vrai faux bouton; (2) le chevron de PlannedOrdersSection clique deja via le parent ligne 120 -> ce N'EST PAS un faux bouton, juste un defaut de qualite, je l'ai sorti des actionnables. Resultat: 15 faux boutons NETS prets a cabler/activer/supprimer (telechargements GED, pieces jointes mail, transfert/labels mail, joindre fichier, import GED, exporter OS, relances impayes, consulter PPT). 14 findings demandes en decision produit car la correction depend d'un choix non tranche: les 4 EXPORTS comptables (meme decision groupee), le bouton 'Copier' a l'intention floue, la cloture bancaire/comptable (RPC serveur), les appels de fonds travaux + relances, les actions ChatPanel (Creer OS / Fiche copro) qui supposent des destinations existantes, et le chevron redondant. Prochaine etape recommandee: traiter le lot 'telechargements/pieces jointes' (storage Supabase) d'un bloc car ils partagent le meme handler, puis soumettre la decision EXPORTS comptables groupee."

> NB : le lot **exports comptables** (Comptabilité topbar, BalanceHeader, EcrituresModal) est en cours de résorption via la **PR #26** (export CSV). Les téléchargements GED/pièces jointes mail partagent le même handler storage Supabase → à traiter en bloc (chantier J2-bis/J9).