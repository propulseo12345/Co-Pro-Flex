import {
  Clock,
  Mail,
  Send,
  FileText,
  Gavel,
  AlertCircle,
  Euro,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import type { ModeEnvoi } from '@/types/models/impaye';
import type { WorkflowStep, StatutConfig, ModeEnvoiConfig, Impaye } from './types';

export const MODE_ENVOI_CONFIG: Record<ModeEnvoi, ModeEnvoiConfig> = {
  email: { label: 'Email', icon: Mail },
  courrier: { label: 'Courrier simple', icon: Send },
  lrar: { label: 'Recommandé AR', icon: FileText },
};

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'en_retard', label: 'En retard', icon: Clock, color: '#f59e0b' },
  { id: 'relance_amiable_1', label: 'Relance amiable 1', icon: Mail, color: '#f97316' },
  { id: 'relance_amiable_2', label: 'Relance amiable 2', icon: Send, color: '#ef4444' },
  { id: 'mise_en_demeure', label: 'Mise en demeure', icon: FileText, color: '#dc2626' },
  { id: 'contentieux', label: 'Contentieux', icon: Gavel, color: '#991b1b' },
];

export const STATUT_CONFIG: Record<string, StatutConfig> = {
  en_retard: { bg: '#fef3c7', color: '#92400e', label: 'En retard', darkBg: 'rgba(251, 191, 36, 0.2)', darkColor: '#fbbf24' },
  relance_amiable_1: { bg: '#fed7aa', color: '#9a3412', label: 'Relance amiable 1', darkBg: 'rgba(251, 146, 60, 0.2)', darkColor: '#fb923c' },
  relance_amiable_2: { bg: '#fecaca', color: '#991b1b', label: 'Relance amiable 2', darkBg: 'rgba(248, 113, 113, 0.2)', darkColor: '#f87171' },
  mise_en_demeure: { bg: '#fee2e2', color: '#7f1d1d', label: 'Mise en demeure', darkBg: 'rgba(239, 68, 68, 0.2)', darkColor: '#ef4444' },
  contentieux: { bg: '#fce7f3', color: '#9d174d', label: 'Contentieux', darkBg: 'rgba(236, 72, 153, 0.2)', darkColor: '#ec4899' },
  regle: { bg: '#d1fae5', color: '#065f46', label: 'Réglé', darkBg: 'rgba(52, 211, 153, 0.2)', darkColor: '#34d399' },
};

export const HISTORIQUE_ICONS: Record<string, React.ElementType> = {
  creation: AlertCircle,
  relance_amiable_1: Mail,
  relance_amiable_2: Send,
  mise_en_demeure: FileText,
  contentieux: Gavel,
  paiement_partiel: Euro,
  paiement_total: CheckCircle2,
  note: FileText,
  appel_telephonique: Phone,
};

export const MOCK_IMPAYES: Impaye[] = [
  {
    id: 1,
    coproprietaire: {
      nom: 'Pierre MARTIN',
      email: 'pierre.martin@email.com',
      telephone: '06 12 34 56 78',
      adresse: '15 rue des Lilas, 75012 Paris',
    },
    lot: 'Lot 22',
    batiment: 'Bâtiment A',
    montant: 850,
    montantInitial: 850,
    periode: 'T4 2025',
    type: 'charges',
    statut: 'relance_amiable_2',
    dateEcheance: '2025-10-31',
    dateCreation: '2025-10-01',
    historique: [
      { id: 1, date: '2025-10-01', type: 'creation', description: "Création de l'impayé - Charges T4 2025", contenu: { type: 'note', note: "Impayé créé automatiquement suite à l'échéance du 31/10/2025 non réglée." } },
      { id: 2, date: '2025-11-05', type: 'relance_amiable_1', description: 'Envoi de la 1ère relance amiable par email', destinataire: 'pierre.martin@email.com', canal: 'email', contenu: { type: 'email', email: { objet: 'Rappel de paiement - Charges de copropriété', corps: "Madame, Monsieur,\n\nNous vous informons que votre compte présente un solde débiteur correspondant aux charges de copropriété.\n\nMontant dû : 850,00 €\nPériode concernée : T4 2025\nDate d'échéance initiale : 31 octobre 2025\nLot : Lot 22 - Bâtiment A\n\nNous vous remercions de bien vouloir procéder au règlement de cette somme dans les meilleurs délais.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.\n\nLe Syndic\nCopro Manager", destinataire: 'pierre.martin@email.com', dateEnvoi: '2025-11-05T10:30:00' } } },
      { id: 3, date: '2025-11-20', type: 'relance_amiable_2', description: 'Envoi de la 2ème relance amiable par courrier recommandé', destinataire: '15 rue des Lilas, 75012 Paris', canal: 'courrier_recommande', contenu: { type: 'courrier', pdfGenere: true, courrier: { titre: 'DEUXIÈME RAPPEL - Charges de copropriété impayées', corps: 'Courrier recommandé envoyé le 20/11/2025', destinataire: 'Pierre MARTIN', adresse: '15 rue des Lilas, 75012 Paris', dateEnvoi: '2025-11-20', recommande: true, numeroSuivi: '1A 234 567 890 FR' } } },
      { id: 4, date: '2025-11-25', type: 'appel_telephonique', description: "Contact téléphonique - Le copropriétaire s'engage à régulariser avant fin décembre", canal: 'telephone', contenu: { type: 'telephone', telephone: { dateAppel: '2025-11-25T14:15:00', duree: '12 minutes', interlocuteur: 'Pierre MARTIN', telephone: '06 12 34 56 78', resumeEchange: "M. Martin explique des difficultés financières temporaires suite à une perte d'emploi.", engagementsPris: 'Paiement intégral des 850€ avant le 31 décembre 2025.', prochainContact: '15 décembre 2025 si aucun paiement reçu' } } },
    ],
  },
  {
    id: 2,
    coproprietaire: { nom: 'Marie DURAND', email: 'marie.durand@email.com', telephone: '06 98 76 54 32', adresse: '8 avenue Victor Hugo, 75016 Paris' },
    lot: 'Lot 18',
    batiment: 'Bâtiment B',
    montant: 1200,
    montantInitial: 1500,
    periode: 'T3 2025',
    type: 'travaux',
    statut: 'contentieux',
    dateEcheance: '2025-09-30',
    dateCreation: '2025-09-01',
    historique: [
      { id: 1, date: '2025-09-01', type: 'creation', description: "Création de l'impayé - Travaux ravalement T3 2025", montant: 1500 },
      { id: 2, date: '2025-10-05', type: 'relance_amiable_1', description: 'Envoi de la 1ère relance amiable', destinataire: 'marie.durand@email.com' },
      { id: 3, date: '2025-10-20', type: 'paiement_partiel', description: 'Paiement partiel reçu', montant: 300 },
      { id: 4, date: '2025-10-25', type: 'relance_amiable_2', description: 'Envoi de la 2ème relance amiable', destinataire: 'marie.durand@email.com' },
      { id: 5, date: '2025-11-10', type: 'mise_en_demeure', description: 'Envoi de la mise en demeure par huissier', destinataire: '8 avenue Victor Hugo, 75016 Paris' },
      { id: 6, date: '2025-11-25', type: 'contentieux', description: "Passage en procédure contentieuse - Dossier transmis à l'avocat" },
    ],
  },
  {
    id: 3,
    coproprietaire: { nom: 'Jean LEBRUN', email: 'jean.lebrun@email.com', telephone: '06 11 22 33 44', adresse: '42 boulevard Haussmann, 75009 Paris' },
    lot: 'Lot 5',
    batiment: 'Bâtiment A',
    montant: 450,
    montantInitial: 450,
    periode: 'T4 2025',
    type: 'charges',
    statut: 'relance_amiable_1',
    dateEcheance: '2025-10-31',
    dateCreation: '2025-10-15',
    historique: [
      { id: 1, date: '2025-10-15', type: 'creation', description: "Création de l'impayé - Charges T4 2025" },
      { id: 2, date: '2025-11-20', type: 'relance_amiable_1', description: 'Envoi de la 1ère relance amiable', destinataire: 'jean.lebrun@email.com' },
    ],
  },
  {
    id: 4,
    coproprietaire: { nom: 'Sophie BERNARD', email: 'sophie.bernard@email.com', telephone: '06 55 66 77 88', adresse: '23 rue de la Paix, 75002 Paris' },
    lot: 'Lot 12',
    batiment: 'Bâtiment C',
    montant: 2100,
    montantInitial: 2100,
    periode: 'T2-T3 2025',
    type: 'charges',
    statut: 'mise_en_demeure',
    dateEcheance: '2025-06-30',
    dateCreation: '2025-06-01',
    historique: [
      { id: 1, date: '2025-06-01', type: 'creation', description: "Création de l'impayé - Charges T2 2025" },
      { id: 2, date: '2025-07-05', type: 'relance_amiable_1', description: 'Envoi de la 1ère relance amiable', destinataire: 'sophie.bernard@email.com' },
      { id: 3, date: '2025-07-25', type: 'relance_amiable_2', description: 'Envoi de la 2ème relance amiable', destinataire: 'sophie.bernard@email.com' },
      { id: 4, date: '2025-08-15', type: 'note', description: 'Aucune réponse aux relances' },
      { id: 5, date: '2025-09-01', type: 'creation', description: 'Ajout charges T3 2025 au dossier' },
      { id: 6, date: '2025-10-01', type: 'mise_en_demeure', description: 'Envoi de la mise en demeure', destinataire: '23 rue de la Paix, 75002 Paris' },
    ],
  },
  {
    id: 5,
    coproprietaire: { nom: 'Paul DUPONT', email: 'paul.dupont@email.com', telephone: '06 99 88 77 66', adresse: '5 place de la République, 75011 Paris' },
    lot: 'Lot 31',
    batiment: 'Bâtiment A',
    montant: 320,
    montantInitial: 320,
    periode: 'T4 2025',
    type: 'charges',
    statut: 'en_retard',
    dateEcheance: '2025-11-30',
    dateCreation: '2025-11-01',
    historique: [{ id: 1, date: '2025-11-01', type: 'creation', description: "Création de l'impayé - Charges T4 2025" }],
  },
];
