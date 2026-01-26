import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  FileText,
  Wrench,
  Users,
} from 'lucide-react';

export const DASHBOARD_KPIS = [
  { id: 1, label: 'Solde disponible', value: '10 533,31 €', change: '+2.3%', trend: 'up', icon: DollarSign, color: 'primary' },
  { id: 2, label: 'Budget consommé', value: '25%', change: '1 309,00 € / 5 300,00 €', trend: 'stable', icon: TrendingUp, color: 'success' },
  { id: 3, label: 'Impayés', value: '1 571,64 €', change: '3 copropriétaires', trend: 'down', icon: AlertCircle, color: 'danger' },
  { id: 4, label: 'Tâches en attente', value: '5', change: '2 urgentes', trend: 'warning', icon: Clock, color: 'warning' }
];

export const DASHBOARD_TASKS = [
  { id: 1, title: '2 mouvements à catégoriser', description: 'Associez le bon fournisseur ou copropriétaire ainsi que le compte de charge correspondant à chaque mouvement bancaire afin de mettre à jour le budget ou les soldes des copropriétaires.', priority: 'high', action: 'Catégoriser', actionLink: '/finance/bank-movements', category: 'Finance', dueDate: 'Aujourd\'hui' },
  { id: 2, title: 'Envoyer l\'appel de fonds du 01 octobre 2025', description: 'Échéance : 1 oct. 2025', priority: 'high', action: 'Envoyer', actionLink: '/finance/calls', category: 'Finance', dueDate: '1 oct. 2025' },
  { id: 3, title: 'Reprendre la préparation de votre Assemblée Générale', description: 'Échéance : 6 juin 2025', priority: 'medium', action: 'Continuer', actionLink: '/ag/dashboard', category: 'Assemblées', dueDate: '6 juin 2025' },
  { id: 4, title: 'Renouveler le contrat d\'entretien ascenseur', description: 'Le contrat arrive à échéance dans 15 jours', priority: 'medium', action: 'Voir le contrat', actionLink: '/maintenance/contracts', category: 'Maintenance', dueDate: 'Dans 15 jours' },
  { id: 5, title: 'Vérifier les nouvelles factures', description: '3 nouvelles factures en attente de validation', priority: 'low', action: 'Consulter', actionLink: '/finance/invoices', category: 'Finance', dueDate: 'Cette semaine' }
];

export const DASHBOARD_COPROPRIETAIRES = [
  { id: 1, nom: 'SCI Dvnis', solde: -1372.84, email: 'contact@sci-dvnis.fr', lots: 3 },
  { id: 2, nom: 'Jean DUPONT', solde: -73.30, email: 'j.dupont@email.fr', lots: 1 },
  { id: 3, nom: 'Mathias SLIVET', solde: 0.00, email: 'm.slivet@email.fr', lots: 2 },
  { id: 4, nom: 'Marie BERNARD', solde: 450.00, email: 'm.bernard@email.fr', lots: 1 },
  { id: 5, nom: 'Sophie MARTIN', solde: -125.50, email: 's.martin@email.fr', lots: 1 }
];

export const DASHBOARD_ACTIVITIES = [
  { id: 1, text: 'Facture #2025-034 ajoutée', date: 'Il y a 2h', type: 'info' },
  { id: 2, text: 'Paiement reçu de Marie BERNARD', date: 'Il y a 5h', type: 'success' },
  { id: 3, text: 'Contrat d\'assurance mis à jour', date: 'Hier', type: 'info' },
];

export const DASHBOARD_QUICK_ACTIONS = [
  { label: 'Nouvelle facture', href: '/finance/invoices', icon: FileText },
  { label: 'Appel de fonds', href: '/finance/calls', icon: DollarSign },
  { label: 'Ordre de service', href: '/maintenance/service-orders', icon: Wrench },
  { label: 'Convoquer AG', href: '/ag/dashboard', icon: Users },
];

export const DASHBOARD_DEADLINES = [
  { id: 1, title: 'Appel de fonds Q4', date: '1 oct.', category: 'Finance', urgent: true, daysLeft: 3 },
  { id: 2, title: 'AG Ordinaire', date: '6 juin', category: 'AG', urgent: false, daysLeft: 45 },
  { id: 3, title: 'Renouvellement contrat ascenseur', date: '15 jours', category: 'Maintenance', urgent: true, daysLeft: 15 },
];
