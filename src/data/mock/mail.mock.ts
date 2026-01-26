// Mock data for mail module
import type { MailTemplate, MailGroupe, MailParticipant } from '@/types/models/mail';

export interface LegacyEmailMessage {
  id: number;
  subject: string;
  recipients: string[];
  sender?: string;
  recipientType: 'all' | 'group' | 'individual';
  date: string;
  status: 'sent' | 'opened' | 'received' | 'draft';
  hasAttachment: boolean;
  preview: string;
  body?: string;
  template?: string;
  isRead?: boolean;
  folderId?: string;
  attachments?: { name: string; size: string; type: string }[];
}

export interface MailFolder {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  order: number;
}

// Colors for folders
export const FOLDER_COLORS = [
  '#818cf8', '#f472b6', '#34d399', '#fbbf24',
  '#60a5fa', '#a78bfa', '#fb923c', '#4ade80',
];

// Default folders
export const DEFAULT_FOLDERS: MailFolder[] = [
  { id: 'important', name: 'Important', color: '#ef4444', isDefault: true, order: 0 },
  { id: 'travaux', name: 'Travaux', color: '#f59e0b', isDefault: true, order: 1 },
  { id: 'comptabilite', name: 'Comptabilité', color: '#22c55e', isDefault: true, order: 2 },
  { id: 'ag', name: 'Assemblées Générales', color: '#8b5cf6', isDefault: true, order: 3 },
];

// Email templates
export const EMAIL_TEMPLATES: MailTemplate[] = [
  {
    id: 'convocation-ag',
    name: 'Convocation AG',
    subject: 'Convocation Assemblée Générale - [Date]',
    body: `Madame, Monsieur,

Nous avons le plaisir de vous convoquer à l'Assemblée Générale Ordinaire de la copropriété.

Date : [Date]
Heure : [Heure]
Lieu : [Lieu]

L'ordre du jour sera le suivant :
1. [Point 1]
2. [Point 2]
3. [Point 3]

Vous trouverez ci-joint la convocation officielle et l'ordre du jour détaillé.

En cas d'impossibilité de vous rendre à cette assemblée, nous vous remercions de bien vouloir nous retourner votre pouvoir dûment complété.

Cordialement,
Le Conseil Syndical`
  },
  {
    id: 'avis-travaux',
    name: 'Avis de travaux',
    subject: 'Information travaux - [Type de travaux]',
    body: `Madame, Monsieur,

Nous vous informons que des travaux vont être réalisés dans la copropriété.

Nature des travaux : [Description]
Date de début : [Date]
Durée estimée : [Durée]
Entreprise : [Nom de l'entreprise]

Pendant la durée des travaux :
- [Consigne 1]
- [Consigne 2]

Nous vous remercions de votre compréhension.

Cordialement,
Le Syndic`
  },
  {
    id: 'rappel-echeances',
    name: 'Rappel échéances',
    subject: 'Rappel : Échéance des charges du [Trimestre]',
    body: `Madame, Monsieur,

Nous vous rappelons que l'échéance des charges du [Trimestre] arrive à son terme le [Date].

Montant à régler : [Montant] €

Nous vous remercions de procéder au règlement dans les meilleurs délais.

Pour toute question concernant vos charges, n'hésitez pas à nous contacter.

Cordialement,
Le Syndic`
  },
  {
    id: 'info-generale',
    name: 'Information générale',
    subject: '[Objet de l\'information]',
    body: `Madame, Monsieur,

[Corps du message]

Nous restons à votre disposition pour toute information complémentaire.

Cordialement,
Le Syndic`
  }
];

// Recipient groups
export const RECIPIENT_GROUPS: MailGroupe[] = [
  { id: 'all', label: 'Tous les copropriétaires', count: 42 },
  { id: 'cs', label: 'Conseil syndical', count: 5 },
  { id: 'etage-1', label: 'Copropriétaires - Étage 1', count: 6 },
  { id: 'etage-2', label: 'Copropriétaires - Étage 2', count: 8 },
  { id: 'etage-3', label: 'Copropriétaires - Étage 3', count: 8 },
  { id: 'etage-4', label: 'Copropriétaires - Étage 4', count: 8 },
  { id: 'etage-5', label: 'Copropriétaires - Étage 5', count: 7 },
];

// Individual recipients
export const INDIVIDUAL_RECIPIENTS: MailParticipant[] = [
  { id: 'u1', nom: 'Marie Martin', lot: 'Lot 12', email: 'marie.martin@email.com', type: 'coproprietaire' },
  { id: 'u2', nom: 'Jean-Pierre Dubois', lot: 'Lot 8', email: 'jp.dubois@email.com', type: 'coproprietaire' },
  { id: 'u3', nom: 'Sophie Leroy', lot: 'Lot 3', email: 's.leroy@email.com', type: 'coproprietaire' },
  { id: 'u4', nom: 'Paul Bernard', lot: 'Lot 15', email: 'p.bernard@email.com', type: 'coproprietaire' },
  { id: 'u5', nom: 'Claire Moreau', lot: 'Lot 7', email: 'c.moreau@email.com', type: 'coproprietaire' },
  { id: 'u6', nom: 'Thomas Petit', lot: 'Lot 22', email: 't.petit@email.com', type: 'coproprietaire' },
  { id: 'u7', nom: 'Isabelle Durand', lot: 'Lot 5', email: 'i.durand@email.com', type: 'coproprietaire' },
  { id: 'u8', nom: 'François Robert', lot: 'Lot 18', email: 'f.robert@email.com', type: 'coproprietaire' },
];

// Reply emails data
export const REPLY_EMAILS: Record<number, { subject: string; sender: string; body: string; senderEmail?: string }> = {
  101: {
    subject: 'RE: Demande d\'information sur les travaux',
    sender: 'Marie Martin',
    senderEmail: 'marie.martin@email.com',
    body: `Suite à votre mail concernant les travaux de ravalement, j'aurais quelques questions :

1. Quelle sera la durée estimée des travaux ?
2. Y aura-t-il des nuisances sonores importantes ?
3. Devrons-nous fermer nos volets pendant certaines phases ?
4. Le parking sera-t-il accessible pendant toute la durée du chantier ?

Je vous remercie par avance pour vos réponses.

Cordialement,
Marie Martin`
  },
  102: {
    subject: 'Problème de fuite au 3ème étage',
    sender: 'Jean-Pierre Dubois',
    senderEmail: 'jp.dubois@email.com',
    body: `Je vous signale une fuite d'eau constatée ce matin dans ma salle de bain.

L'eau semble provenir du plafond, ce qui suggère un problème au niveau de l'appartement du dessus ou des canalisations communes.

J'ai placé une bassine pour le moment mais la situation nécessite une intervention rapide.

Merci de bien vouloir prendre les dispositions nécessaires dans les plus brefs délais.

Cordialement,
Jean-Pierre Dubois`
  },
  103: {
    subject: 'Question sur les charges du T4',
    sender: 'Sophie Leroy',
    senderEmail: 's.leroy@email.com',
    body: `Je souhaiterais obtenir des éclaircissements concernant le montant des charges du dernier trimestre...`
  },
  104: {
    subject: 'Confirmation présence AG',
    sender: 'Paul Bernard',
    senderEmail: 'p.bernard@email.com',
    body: `Je confirme ma présence à l'Assemblée Générale du 15 décembre. Cordialement.`
  },
  105: {
    subject: 'Demande de pouvoir AG',
    sender: 'Claire Moreau',
    senderEmail: 'c.moreau@email.com',
    body: `N'étant pas disponible le jour de l'AG, veuillez trouver ci-joint mon pouvoir dûment rempli...`
  }
};

// Mock inbox emails
export const MOCK_INBOX: LegacyEmailMessage[] = [
  {
    id: 101,
    subject: 'RE: Demande d\'information sur les travaux',
    sender: 'Marie Martin (Lot 12)',
    recipients: ['Syndic'],
    recipientType: 'individual',
    date: '2025-12-22T10:30:00',
    status: 'received',
    hasAttachment: false,
    preview: 'Bonjour, suite à votre mail concernant les travaux de ravalement, j\'aurais quelques questions...',
    body: `Bonjour,

Suite à votre mail concernant les travaux de ravalement, j'aurais quelques questions :

1. Quelle sera la durée estimée des travaux ?
2. Y aura-t-il des nuisances sonores importantes ?
3. Devrons-nous fermer nos volets pendant certaines phases ?
4. Le parking sera-t-il accessible pendant toute la durée du chantier ?

Je vous remercie par avance pour vos réponses.

Cordialement,
Marie Martin
Appartement 12`,
    isRead: false
  },
  {
    id: 102,
    subject: 'Problème de fuite au 3ème étage',
    sender: 'Jean-Pierre Dubois (Lot 8)',
    recipients: ['Syndic'],
    recipientType: 'individual',
    date: '2025-12-21T14:15:00',
    status: 'received',
    hasAttachment: true,
    preview: 'Je vous signale une fuite d\'eau constatée dans ma salle de bain. Vous trouverez en pièce jointe des photos...',
    body: `Bonjour,

Je vous signale une fuite d'eau constatée ce matin dans ma salle de bain.

L'eau semble provenir du plafond, ce qui suggère un problème au niveau de l'appartement du dessus ou des canalisations communes.

J'ai placé une bassine pour le moment mais la situation nécessite une intervention rapide.

Vous trouverez en pièce jointe des photos du problème.

Merci de bien vouloir prendre les dispositions nécessaires dans les plus brefs délais.

Cordialement,
Jean-Pierre Dubois`,
    attachments: [
      { name: 'photo_fuite_1.jpg', size: '2.1 Mo', type: 'image' },
      { name: 'photo_fuite_2.jpg', size: '1.8 Mo', type: 'image' }
    ],
    isRead: false
  },
  {
    id: 103,
    subject: 'Question sur les charges du T4',
    sender: 'Sophie Leroy (Lot 3)',
    recipients: ['Syndic'],
    recipientType: 'individual',
    date: '2025-12-20T09:45:00',
    status: 'received',
    hasAttachment: false,
    preview: 'Je souhaiterais obtenir des éclaircissements concernant le montant des charges du dernier trimestre...',
    body: `Bonjour,

Je souhaiterais obtenir des éclaircissements concernant le montant des charges du dernier trimestre.

J'ai constaté une augmentation significative par rapport au trimestre précédent et j'aimerais comprendre les raisons de cette hausse.

Pourriez-vous me faire parvenir un détail des charges ?

Cordialement,
Sophie Leroy`,
    isRead: true
  },
  {
    id: 104,
    subject: 'Confirmation présence AG',
    sender: 'Paul Bernard (Lot 15)',
    recipients: ['Syndic'],
    recipientType: 'individual',
    date: '2025-12-19T16:30:00',
    status: 'received',
    hasAttachment: false,
    preview: 'Je confirme ma présence à l\'Assemblée Générale du 15 décembre. Cordialement.',
    body: `Bonjour,

Je confirme ma présence à l'Assemblée Générale du 15 décembre.

Cordialement,
Paul Bernard`,
    isRead: true
  },
  {
    id: 105,
    subject: 'Demande de pouvoir AG',
    sender: 'Claire Moreau (Lot 7)',
    recipients: ['Syndic'],
    recipientType: 'individual',
    date: '2025-12-18T11:00:00',
    status: 'received',
    hasAttachment: true,
    preview: 'N\'étant pas disponible le jour de l\'AG, veuillez trouver ci-joint mon pouvoir dûment rempli...',
    body: `Bonjour,

N'étant pas disponible le jour de l'AG, veuillez trouver ci-joint mon pouvoir dûment rempli au profit de M. Jean Dupont.

Je vous remercie de bien vouloir en prendre note.

Cordialement,
Claire Moreau`,
    attachments: [
      { name: 'Pouvoir_AG_Claire_Moreau.pdf', size: '89 Ko', type: 'pdf' }
    ],
    isRead: true
  }
];

// Mock sent emails
export const MOCK_SENT: LegacyEmailMessage[] = [
  {
    id: 1,
    subject: 'Convocation Assemblée Générale - 15 Décembre 2025',
    recipients: ['Tous les copropriétaires'],
    recipientType: 'all',
    date: '2025-11-28T14:30:00',
    status: 'opened',
    hasAttachment: true,
    preview: 'Nous avons le plaisir de vous convoquer à l\'Assemblée Générale...',
    body: `Madame, Monsieur,

Nous avons le plaisir de vous convoquer à l'Assemblée Générale Ordinaire de la copropriété située au 10 rue du 4 Septembre, 75002 Paris.

Date : Dimanche 15 Décembre 2025
Heure : 10h00
Lieu : Salle des fêtes, 15 rue de la Mairie, 75002 Paris

L'ordre du jour sera le suivant :
1. Élection du bureau de l'assemblée
2. Approbation des comptes de l'exercice clos au 31/12/2024
3. Vote du budget prévisionnel 2025
4. Travaux de réfection de la toiture - Devis et vote
5. Renouvellement du contrat de gardiennage
6. Questions diverses

Vous trouverez ci-joint :
- La convocation officielle
- L'ordre du jour détaillé
- Les comptes de l'exercice
- Les devis pour les travaux de toiture
- Le formulaire de pouvoir

En cas d'impossibilité de vous rendre à cette assemblée, nous vous remercions de bien vouloir nous retourner votre pouvoir dûment complété.

Cordialement,

Le Conseil Syndical
Résidence Le Clos Fleuri`,
    attachments: [
      { name: 'Convocation_AG_2025.pdf', size: '245 Ko', type: 'pdf' },
      { name: 'Ordre_du_jour_AG_2025.pdf', size: '128 Ko', type: 'pdf' },
      { name: 'Comptes_exercice_2024.pdf', size: '1.2 Mo', type: 'pdf' },
      { name: 'Devis_toiture.pdf', size: '890 Ko', type: 'pdf' },
      { name: 'Formulaire_pouvoir.pdf', size: '45 Ko', type: 'pdf' }
    ],
    template: 'Convocation AG'
  },
  {
    id: 2,
    subject: 'Avis de travaux - Réfection toiture',
    recipients: ['Tous les copropriétaires'],
    recipientType: 'all',
    date: '2025-11-25T09:15:00',
    status: 'sent',
    hasAttachment: false,
    preview: 'Nous vous informons que des travaux de réfection de la toiture...',
    body: `Madame, Monsieur,

Nous vous informons que des travaux de réfection de la toiture débuteront prochainement.

Ces travaux sont nécessaires suite au diagnostic réalisé et aux infiltrations constatées.

Un planning détaillé vous sera communiqué très prochainement.

Cordialement,
Le Syndic`
  },
  {
    id: 3,
    subject: 'Rappel échéance charges T4 2025',
    recipients: ['Copropriétaires étage 2'],
    recipientType: 'group',
    date: '2025-11-20T16:45:00',
    status: 'received',
    hasAttachment: true,
    preview: 'Veuillez trouver ci-joint le rappel pour le règlement...',
    body: `Madame, Monsieur,

Nous vous rappelons que l'échéance des charges du 4ème trimestre 2025 arrive à son terme.

Veuillez trouver ci-joint le rappel pour le règlement de vos charges.

Cordialement,
Le Syndic`,
    attachments: [
      { name: 'Rappel_charges_T4_2025.pdf', size: '156 Ko', type: 'pdf' }
    ],
    template: 'Rappel échéances'
  },
  {
    id: 4,
    subject: 'Compte-rendu réunion conseil syndical',
    recipients: ['Conseil syndical'],
    recipientType: 'group',
    date: '2025-11-15T17:00:00',
    status: 'opened',
    hasAttachment: true,
    preview: 'Veuillez trouver ci-joint le compte-rendu de la réunion du conseil syndical du 14 novembre...',
    body: `Chers membres du conseil syndical,

Veuillez trouver ci-joint le compte-rendu de la réunion du conseil syndical du 14 novembre.

Cordialement,
Le Président du CS`,
    attachments: [
      { name: 'CR_reunion_CS_14-11-2025.pdf', size: '234 Ko', type: 'pdf' }
    ]
  }
];

// Mock drafts
export const MOCK_DRAFTS: LegacyEmailMessage[] = [
  {
    id: 201,
    subject: 'Information travaux ascenseur',
    recipients: ['Tous les copropriétaires'],
    recipientType: 'all',
    date: '2025-12-22T08:00:00',
    status: 'draft',
    hasAttachment: false,
    preview: 'Nous vous informons que l\'ascenseur sera en maintenance du...',
    body: `Madame, Monsieur,

Nous vous informons que l'ascenseur sera en maintenance du [date début] au [date fin].

Nous vous prions de bien vouloir nous excuser pour la gêne occasionnée.

Cordialement,
Le Syndic`
  },
  {
    id: 202,
    subject: 'Rappel règlement intérieur',
    recipients: ['Tous les copropriétaires'],
    recipientType: 'all',
    date: '2025-12-20T15:30:00',
    status: 'draft',
    hasAttachment: true,
    preview: 'Suite à plusieurs incidents, nous souhaitons vous rappeler les règles concernant...',
    body: `Madame, Monsieur,

Suite à plusieurs incidents, nous souhaitons vous rappeler les règles concernant l'utilisation des parties communes.

[À compléter]

Cordialement,
Le Syndic`,
    attachments: [
      { name: 'Reglement_interieur.pdf', size: '345 Ko', type: 'pdf' }
    ]
  }
];

// Mock archived emails
export const MOCK_ARCHIVED: LegacyEmailMessage[] = [
  {
    id: 301,
    subject: 'Convocation AG 2024',
    recipients: ['Tous les copropriétaires'],
    recipientType: 'all',
    date: '2024-11-15T14:30:00',
    status: 'opened',
    hasAttachment: true,
    preview: 'Convocation à l\'Assemblée Générale ordinaire 2024...',
    body: `Madame, Monsieur,

Nous avons le plaisir de vous convoquer à l'Assemblée Générale Ordinaire 2024.

Cordialement,
Le Conseil Syndical`,
    attachments: [
      { name: 'Convocation_AG_2024.pdf', size: '245 Ko', type: 'pdf' }
    ],
    template: 'Convocation AG'
  },
  {
    id: 302,
    subject: 'PV AG 2024',
    recipients: ['Tous les copropriétaires'],
    recipientType: 'all',
    date: '2024-12-20T10:00:00',
    status: 'opened',
    hasAttachment: true,
    preview: 'Veuillez trouver ci-joint le procès-verbal de l\'Assemblée Générale 2024...',
    body: `Madame, Monsieur,

Veuillez trouver ci-joint le procès-verbal de l'Assemblée Générale 2024.

Cordialement,
Le Conseil Syndical`,
    attachments: [
      { name: 'PV_AG_2024.pdf', size: '567 Ko', type: 'pdf' }
    ]
  }
];

// Get all mock emails combined
export function getAllMockEmails(): LegacyEmailMessage[] {
  return [...MOCK_INBOX, ...MOCK_SENT, ...MOCK_DRAFTS, ...MOCK_ARCHIVED];
}

// Find mock email by ID
export function findMockEmailById(id: number | string): LegacyEmailMessage | undefined {
  const numId = typeof id === 'string' ? Number(id) : id;
  return getAllMockEmails().find(e => e.id === numId);
}
