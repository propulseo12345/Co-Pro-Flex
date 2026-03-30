// ============================================================================
// Mail — Données mockées
// ============================================================================

import type { IMail, IMailFolder, IMailLabel } from '@/features/communication/mail/domain/types';

// ----------------------------------------------------------------------------
// IDs constants (réutilisables dans les tests)
// ----------------------------------------------------------------------------

const COPRO_ID = 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
const USER_ID = 'u1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
const COPRO_EMAIL = 'copro.haussmann@coproflex.fr';
const COPRO_NAME = 'Syndic — Résidence Haussmann';

// Folder IDs
const FOLDER_INBOX   = 'f0000001-0000-4000-a000-000000000001';
const FOLDER_SENT    = 'f0000001-0000-4000-a000-000000000002';
const FOLDER_DRAFTS  = 'f0000001-0000-4000-a000-000000000003';
const FOLDER_ARCHIVE = 'f0000001-0000-4000-a000-000000000004';
const FOLDER_TRASH   = 'f0000001-0000-4000-a000-000000000005';
const FOLDER_SPAM    = 'f0000001-0000-4000-a000-000000000006';

// Label IDs
const LABEL_AG          = 'l0000001-0000-4000-a000-000000000001';
const LABEL_FINANCE     = 'l0000001-0000-4000-a000-000000000002';
const LABEL_MAINTENANCE = 'l0000001-0000-4000-a000-000000000003';
const LABEL_RELANCES    = 'l0000001-0000-4000-a000-000000000004';
const LABEL_SINISTRES   = 'l0000001-0000-4000-a000-000000000005';

// ----------------------------------------------------------------------------
// Dossiers système
// ----------------------------------------------------------------------------

export const MOCK_FOLDERS: IMailFolder[] = [
  {
    id: FOLDER_INBOX,
    coproprieteId: COPRO_ID,
    userId: USER_ID,
    name: 'Boîte de réception',
    folderType: 'inbox',
    icon: 'Inbox',
    isSystem: true,
    sortOrder: 0,
    unreadCount: 3,
  },
  {
    id: FOLDER_SENT,
    coproprieteId: COPRO_ID,
    userId: USER_ID,
    name: 'Envoyés',
    folderType: 'sent',
    icon: 'Send',
    isSystem: true,
    sortOrder: 1,
    unreadCount: 0,
  },
  {
    id: FOLDER_DRAFTS,
    coproprieteId: COPRO_ID,
    userId: USER_ID,
    name: 'Brouillons',
    folderType: 'drafts',
    icon: 'FileEdit',
    isSystem: true,
    sortOrder: 2,
    unreadCount: 0,
  },
  {
    id: FOLDER_ARCHIVE,
    coproprieteId: COPRO_ID,
    userId: USER_ID,
    name: 'Archives',
    folderType: 'archive',
    icon: 'Archive',
    isSystem: true,
    sortOrder: 3,
    unreadCount: 0,
  },
  {
    id: FOLDER_TRASH,
    coproprieteId: COPRO_ID,
    userId: USER_ID,
    name: 'Corbeille',
    folderType: 'trash',
    icon: 'Trash2',
    isSystem: true,
    sortOrder: 4,
    unreadCount: 0,
  },
  {
    id: FOLDER_SPAM,
    coproprieteId: COPRO_ID,
    userId: USER_ID,
    name: 'Spam',
    folderType: 'spam',
    icon: 'ShieldAlert',
    isSystem: true,
    sortOrder: 5,
    unreadCount: 0,
  },
];

// ----------------------------------------------------------------------------
// Labels
// ----------------------------------------------------------------------------

export const MOCK_LABELS: IMailLabel[] = [
  { id: LABEL_AG,          coproprieteId: COPRO_ID, name: 'AG',          color: '#8b5cf6', sortOrder: 0 },
  { id: LABEL_FINANCE,     coproprieteId: COPRO_ID, name: 'Finance',     color: '#22c55e', sortOrder: 1 },
  { id: LABEL_MAINTENANCE, coproprieteId: COPRO_ID, name: 'Maintenance', color: '#f59e0b', sortOrder: 2 },
  { id: LABEL_RELANCES,    coproprieteId: COPRO_ID, name: 'Relances',    color: '#ef4444', sortOrder: 3 },
  { id: LABEL_SINISTRES,   coproprieteId: COPRO_ID, name: 'Sinistres',   color: '#3b82f6', sortOrder: 4 },
];

// ----------------------------------------------------------------------------
// Mails
// ----------------------------------------------------------------------------

export const MOCK_MAILS: IMail[] = [
  // ── 3 reçus non lus ──────────────────────────────────────────────────
  {
    id: 'm0000001-0000-4000-a000-000000000001',
    coproprieteId: COPRO_ID,
    folderId: FOLDER_INBOX,
    from: { name: 'Jean Dupont', email: 'j.dupont@email.fr' },
    to: [{ name: COPRO_NAME, email: COPRO_EMAIL }],
    subject: 'Fuite salle de bain — Lot 12B',
    body: `Bonjour,

Je vous signale une fuite importante au niveau de ma salle de bain (lot 12B, 3ème étage). L'eau s'infiltre dans le plafond du voisin du dessous, M. Martin (lot 8B).

Pourriez-vous envoyer un plombier en urgence ? Je joins des photos et le constat de M. Martin.

Cordialement,
Jean Dupont`,
    bodyPreview: 'Je vous signale une fuite importante au niveau de ma salle de bain (lot 12B, 3ème étage)...',
    status: 'unread',
    isStarred: true,
    isDraft: false,
    hasAttachments: true,
    attachments: [
      { id: 'a001', name: 'photo_fuite_1.jpg', size: '2.4 Mo', type: 'image' },
      { id: 'a002', name: 'constat_martin.pdf', size: '340 Ko', type: 'pdf' },
    ],
    labelIds: [LABEL_MAINTENANCE, LABEL_SINISTRES],
    sentAt: '2025-03-28T09:15:00Z',
    createdAt: '2025-03-28T09:15:00Z',
    updatedAt: '2025-03-28T09:15:00Z',
  },
  {
    id: 'm0000001-0000-4000-a000-000000000002',
    coproprieteId: COPRO_ID,
    folderId: FOLDER_INBOX,
    from: { name: 'Maria Garcia', email: 'm.garcia@email.fr' },
    to: [{ name: COPRO_NAME, email: COPRO_EMAIL }],
    subject: 'Question sur les charges du T1 2025',
    body: `Bonjour,

J'ai reçu l'appel de fonds du 1er trimestre 2025 et je constate une augmentation de 12% par rapport à l'année dernière. Pourriez-vous m'envoyer le détail des postes de dépenses qui justifient cette hausse ?

Par ailleurs, est-ce que le budget prévisionnel voté en AG a bien été respecté ?

Merci d'avance,
Maria Garcia — Lot 5A`,
    bodyPreview: "J'ai reçu l'appel de fonds du 1er trimestre 2025 et je constate une augmentation de 12%...",
    status: 'unread',
    isStarred: false,
    isDraft: false,
    hasAttachments: false,
    attachments: [],
    labelIds: [LABEL_FINANCE],
    sentAt: '2025-03-27T14:32:00Z',
    createdAt: '2025-03-27T14:32:00Z',
    updatedAt: '2025-03-27T14:32:00Z',
  },
  {
    id: 'm0000001-0000-4000-a000-000000000003',
    coproprieteId: COPRO_ID,
    folderId: FOLDER_INBOX,
    from: { name: 'Plomberie Express SARL', email: 'contact@plomberie-express.fr' },
    to: [{ name: COPRO_NAME, email: COPRO_EMAIL }],
    subject: 'Devis n°2025-0347 — Réparation colonne montante',
    body: `Madame, Monsieur,

Suite à notre visite du 25/03/2025, veuillez trouver ci-joint notre devis pour la réparation de la colonne montante eau froide (bâtiment A, cage 2).

Montant HT : 3 850,00 €
TVA 10% : 385,00 €
Montant TTC : 4 235,00 €

Délai d'intervention : 5 jours ouvrés après acceptation.

Restant à votre disposition,
Pierre Leroy — Plomberie Express SARL`,
    bodyPreview: 'Suite à notre visite du 25/03/2025, veuillez trouver ci-joint notre devis pour la réparation...',
    status: 'unread',
    isStarred: false,
    isDraft: false,
    hasAttachments: true,
    attachments: [
      { id: 'a003', name: 'devis_2025-0347.pdf', size: '520 Ko', type: 'pdf' },
    ],
    labelIds: [LABEL_MAINTENANCE],
    sentAt: '2025-03-26T11:00:00Z',
    createdAt: '2025-03-26T11:00:00Z',
    updatedAt: '2025-03-26T11:00:00Z',
  },

  // ── 2 reçus lus ──────────────────────────────────────────────────────
  {
    id: 'm0000001-0000-4000-a000-000000000004',
    coproprieteId: COPRO_ID,
    folderId: FOLDER_INBOX,
    from: { name: 'Philippe Lefebvre', email: 'p.lefebvre@email.fr' },
    to: [{ name: COPRO_NAME, email: COPRO_EMAIL }],
    subject: 'Problème place de parking n°34',
    body: `Bonjour,

Depuis deux semaines, un véhicule non identifié (plaque AB-123-CD) occupe ma place de parking n°34 au sous-sol. Malgré un mot laissé sur le pare-brise, la situation persiste.

Pourriez-vous intervenir ? Le règlement de copropriété est clair sur l'usage exclusif des emplacements.

Merci,
Philippe Lefebvre — Lot 22A`,
    bodyPreview: 'Depuis deux semaines, un véhicule non identifié occupe ma place de parking n°34...',
    status: 'read',
    isStarred: false,
    isDraft: false,
    hasAttachments: false,
    attachments: [],
    labelIds: [],
    sentAt: '2025-03-24T16:45:00Z',
    createdAt: '2025-03-24T16:45:00Z',
    updatedAt: '2025-03-25T08:30:00Z',
  },
  {
    id: 'm0000001-0000-4000-a000-000000000005',
    coproprieteId: COPRO_ID,
    folderId: FOLDER_INBOX,
    from: { name: 'AXA Assurances', email: 'copro@axa.fr' },
    to: [{ name: COPRO_NAME, email: COPRO_EMAIL }],
    subject: 'Attestation assurance MRI 2025 — Résidence Haussmann',
    body: `Madame, Monsieur le Syndic,

Veuillez trouver ci-jointe l'attestation d'assurance Multirisques Immeuble pour l'exercice 2025, renouvelée aux mêmes conditions.

Contrat n° : MRI-2025-887456
Période : 01/01/2025 — 31/12/2025
Prime annuelle TTC : 8 450,00 €

Bien cordialement,
Service Copropriété — AXA`,
    bodyPreview: "Veuillez trouver ci-jointe l'attestation d'assurance Multirisques Immeuble pour l'exercice 2025...",
    status: 'read',
    isStarred: true,
    isDraft: false,
    hasAttachments: true,
    attachments: [
      { id: 'a004', name: 'attestation_MRI_2025.pdf', size: '180 Ko', type: 'pdf' },
    ],
    labelIds: [LABEL_FINANCE],
    sentAt: '2025-03-20T10:00:00Z',
    createdAt: '2025-03-20T10:00:00Z',
    updatedAt: '2025-03-21T09:12:00Z',
  },

  // ── 1 envoyé lu ──────────────────────────────────────────────────────
  {
    id: 'm0000001-0000-4000-a000-000000000006',
    coproprieteId: COPRO_ID,
    folderId: FOLDER_SENT,
    from: { name: COPRO_NAME, email: COPRO_EMAIL },
    to: [{ name: 'Stéphane Bernard', email: 's.bernard@email.fr' }],
    subject: 'Relance impayé — Charges T4 2024 (Lot 18C)',
    body: `Monsieur Bernard,

Malgré notre courrier du 15/02/2025, nous constatons que les charges du 4ème trimestre 2024 restent impayées à ce jour.

Montant dû : 1 245,00 €
Échéance dépassée : 01/01/2025

Nous vous prions de bien vouloir régulariser cette situation sous 15 jours. À défaut, nous serons contraints d'engager une procédure de recouvrement.

Cordialement,
Cabinet Immobilier Haussmann
Syndic de la Résidence Haussmann`,
    bodyPreview: 'Malgré notre courrier du 15/02/2025, nous constatons que les charges du 4ème trimestre 2024 restent impayées...',
    status: 'read',
    isStarred: false,
    isDraft: false,
    hasAttachments: false,
    attachments: [],
    labelIds: [LABEL_RELANCES, LABEL_FINANCE],
    sentAt: '2025-03-22T08:00:00Z',
    createdAt: '2025-03-22T08:00:00Z',
    updatedAt: '2025-03-22T08:00:00Z',
  },

  // ── 2 brouillons ─────────────────────────────────────────────────────
  {
    id: 'm0000001-0000-4000-a000-000000000007',
    coproprieteId: COPRO_ID,
    folderId: FOLDER_DRAFTS,
    from: { name: COPRO_NAME, email: COPRO_EMAIL },
    to: [],
    subject: 'Convocation AG Ordinaire — 15 avril 2025',
    body: `Madame, Monsieur,

Nous avons l'honneur de vous convoquer à l'Assemblée Générale Ordinaire de la copropriété Résidence Haussmann, qui se tiendra le :

Date : Mardi 15 avril 2025
Heure : 18h30
Lieu : Salle polyvalente, RDC Bâtiment A

L'ordre du jour est le suivant :
1. Élection du président de séance
2. Approbation des comptes de l'exercice 2024
3. Vote du budget prévisionnel 2025
...`,
    bodyPreview: "Nous avons l'honneur de vous convoquer à l'Assemblée Générale Ordinaire...",
    status: 'read',
    isStarred: false,
    isDraft: true,
    hasAttachments: false,
    attachments: [],
    labelIds: [LABEL_AG],
    sentAt: null,
    createdAt: '2025-03-29T11:00:00Z',
    updatedAt: '2025-03-29T14:30:00Z',
  },
  {
    id: 'm0000001-0000-4000-a000-000000000008',
    coproprieteId: COPRO_ID,
    folderId: FOLDER_DRAFTS,
    from: { name: COPRO_NAME, email: COPRO_EMAIL },
    to: [{ name: 'Claire Rousseau', email: 'c.rousseau@email.fr' }],
    subject: 'Re: Demande de travaux privatifs — Lot 7B',
    body: `Madame Rousseau,

Suite à votre demande concernant l'installation d'une climatisation dans votre lot, je vous informe que ce type de travaux nécessite`,
    bodyPreview: 'Suite à votre demande concernant l\'installation d\'une climatisation dans votre lot...',
    status: 'read',
    isStarred: false,
    isDraft: true,
    hasAttachments: false,
    attachments: [],
    labelIds: [],
    sentAt: null,
    createdAt: '2025-03-29T16:00:00Z',
    updatedAt: '2025-03-29T16:20:00Z',
  },
];
