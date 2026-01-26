import type { AppelFonds, CoproprietaireAppel, ResolutionAG } from './types';

export const MOCK_RESOLUTIONS_AG: ResolutionAG[] = [
  {
    id: 'res-1',
    numero: '2024-AG-001',
    titre: 'Adoption du budget prévisionnel 2025',
    dateAG: '2024-11-15',
    montantVote: 87500,
    statut: 'ADOPTEE'
  },
  {
    id: 'res-2',
    numero: '2024-AG-002',
    titre: 'Travaux d\'isolation thermique',
    dateAG: '2024-11-15',
    montantVote: 42000,
    statut: 'ADOPTEE'
  },
  {
    id: 'res-3',
    numero: '2024-AG-003',
    titre: 'Travaux de ravalement façade',
    dateAG: '2024-11-15',
    montantVote: 45000,
    statut: 'ADOPTEE'
  }
];

// Fonction utilitaire pour calculer des dates dynamiques basées sur aujourd'hui
const getDateRelative = (joursOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + joursOffset);
  return date.toISOString().split('T')[0];
};

export const MOCK_APPELS: AppelFonds[] = [
  // Cas 1: Appel à générer avec délai TROP COURT (25 jours seulement)
  // Illustre le problème #17 - déclenchera alertes "GENERATION_EN_RETARD" et "DELAI_INSUFFISANT"
  {
    id: '1',
    dateExigibilite: getDateRelative(25), // Échéance dans 25 jours
    dateEmission: getDateRelative(0), // Date d'émission = aujourd'hui
    dateLimiteReglement: getDateRelative(20),
    statut: 'A_GENERER',
    montantTotal: 12500.00,
    montantEncaisse: 0,
    description: 'Appel de fonds - Charges T1 2025 (DÉLAI COURT)',
    periode: 'T1 2025',
    type: 'fonctionnement',
    resolutionAGId: 'res-1',
    resolutionAGNumero: '2024-AG-001',
    cleRepartitionId: 'cle-generale'
  },
  // Cas 2: Appel envoyé avec échéance proche - déclenchera "RELANCE_1_DUE"
  {
    id: '2',
    dateExigibilite: getDateRelative(12), // Échéance dans 12 jours
    dateEmission: getDateRelative(-30), // Émis il y a 30 jours
    dateLimiteReglement: getDateRelative(7),
    statut: 'ENVOYE',
    montantTotal: 8900.00,
    montantEncaisse: 5400.00,
    description: 'Appel de fonds - Travaux toiture',
    periode: 'Février 2025',
    type: 'travaux',
    budgetTravauxId: '1',
    projetNom: 'Rénovation toiture',
    devisUrl: '/documents/devis-toiture.pdf',
    resolutionAGId: 'res-2',
    resolutionAGNumero: '2024-AG-002',
    cleRepartitionId: 'cle-toiture',
    historiqueRelances: [
      {
        id: 'rel-1',
        date: getDateRelative(-15),
        type: 'EMAIL',
        destinataires: ['Sophie LAURENT', 'Isabelle DUBOIS'],
        message: 'Rappel : votre règlement est attendu avant le...',
        statut: 'ENVOYEE'
      }
    ]
  },
  // Cas 3: Appel avec échéance TRÈS proche - déclenchera "RELANCE_2_DUE" et "ECHEANCE_IMMINENTE"
  {
    id: '3',
    dateExigibilite: getDateRelative(4), // Échéance dans 4 jours
    dateEmission: getDateRelative(-40), // Émis il y a 40 jours (délai correct)
    dateLimiteReglement: getDateRelative(2),
    statut: 'ENVOYE',
    montantTotal: 11200.00,
    montantEncaisse: 9800.00,
    description: 'Appel de fonds - Charges T4 2024 (URGENT)',
    periode: 'T4 2024',
    type: 'fonctionnement',
    resolutionAGId: 'res-1',
    resolutionAGNumero: '2024-AG-001',
    cleRepartitionId: 'cle-generale',
    historiqueRelances: [
      {
        id: 'rel-2',
        date: getDateRelative(-20),
        type: 'EMAIL',
        destinataires: ['Sophie LAURENT', 'Isabelle DUBOIS', 'Anne ROUSSEAU'],
        message: 'Premier rappel de paiement',
        statut: 'ENVOYEE'
      },
      {
        id: 'rel-3',
        date: getDateRelative(-7),
        type: 'COURRIER',
        destinataires: ['Sophie LAURENT'],
        message: 'Mise en demeure',
        statut: 'ENVOYEE'
      }
    ]
  },
  // Cas 4: Appel préparé mais pas encore envoyé - déclenchera "ENVOI_EN_RETARD"
  {
    id: '4',
    dateExigibilite: getDateRelative(20), // Échéance dans 20 jours
    dateEmission: getDateRelative(-10), // Préparé il y a 10 jours
    dateLimiteReglement: getDateRelative(15),
    statut: 'EN_PREPARATION',
    montantTotal: 18500.00,
    montantEncaisse: 0,
    description: 'Appel de fonds - Ravalement façade',
    periode: 'T1 2025',
    type: 'travaux',
    budgetTravauxId: '2',
    projetNom: 'Ravalement façade',
    resolutionAGId: 'res-3',
    resolutionAGNumero: '2024-AG-003',
    cleRepartitionId: 'cle-facade'
  },
  // Cas 5: Appel avec calendrier OPTIMAL (délai correct de 45+ jours) - pas d'alerte
  {
    id: '5',
    dateExigibilite: getDateRelative(60), // Échéance dans 60 jours
    dateLimiteReglement: getDateRelative(55),
    statut: 'A_GENERER',
    montantTotal: 15000.00,
    montantEncaisse: 0,
    description: 'Appel de fonds - Charges T2 2025 (Planifié)',
    periode: 'T2 2025',
    type: 'fonctionnement',
    resolutionAGId: 'res-1',
    resolutionAGNumero: '2024-AG-001',
    cleRepartitionId: 'cle-generale'
  },
  // Cas 6: Appel soldé - pas d'alerte
  {
    id: '6',
    dateExigibilite: getDateRelative(-10), // Échéance passée
    dateEmission: getDateRelative(-55), // Émis il y a 55 jours
    dateLimiteReglement: getDateRelative(-15),
    statut: 'SOLDE',
    montantTotal: 9500.00,
    montantEncaisse: 9500.00,
    description: 'Appel de fonds - Charges T3 2024',
    periode: 'T3 2024',
    type: 'fonctionnement',
    resolutionAGId: 'res-1',
    resolutionAGNumero: '2024-AG-001',
    cleRepartitionId: 'cle-generale',
    historiqueRelances: []
  },
];

export const MOCK_COPROPRIETAIRES_APPEL: CoproprietaireAppel[] = [
  {
    id: '1',
    nom: 'Marie LEBLANC',
    lot: 'A1',
    tantiemes: 125,
    montantIndividuel: 1562.50,
    modeEnvoiRecommande: 'email',
    envoye: true,
    email: 'marie.leblanc@example.fr',
    adresse: '12 Rue de la Paix, 75001 Paris',
    paiement: {
      montantDu: 1562.50,
      montantPaye: 1562.50,
      statutPaiement: 'PAYE',
      datePaiement: '2025-01-10',
      modePaiement: 'VIREMENT'
    },
    recommande: {
      modeEnvoi: 'ELECTRONIQUE',
      statut: 'LU',
      datePrepare: '2025-01-05',
      dateEnvoi: '2025-01-06',
      dateLivraison: '2025-01-06',
      dateLecture: '2025-01-07',
      numeroSuivi: 'AR123456789FR'
    }
  },
  {
    id: '2',
    nom: 'Pierre MOREAU',
    lot: 'A2',
    tantiemes: 100,
    montantIndividuel: 1250.00,
    modeEnvoiRecommande: 'electronique',
    envoye: true,
    email: 'pierre.moreau@example.fr',
    adresse: '12 Rue de la Paix, 75001 Paris',
    paiement: {
      montantDu: 1250.00,
      montantPaye: 800.00,
      statutPaiement: 'PARTIELLEMENT_PAYE',
      datePaiement: '2025-01-12',
      modePaiement: 'VIREMENT'
    },
    recommande: {
      modeEnvoi: 'ELECTRONIQUE',
      statut: 'LIVRE',
      datePrepare: '2025-01-05',
      dateEnvoi: '2025-01-06',
      dateLivraison: '2025-01-06',
      numeroSuivi: 'AR123456790FR'
    }
  },
  {
    id: '3',
    nom: 'Sophie LAURENT',
    lot: 'B3',
    tantiemes: 150,
    montantIndividuel: 1875.00,
    modeEnvoiRecommande: 'email',
    envoye: true,
    email: 'sophie.laurent@example.fr',
    adresse: '12 Rue de la Paix, 75001 Paris',
    paiement: {
      montantDu: 1875.00,
      montantPaye: 0,
      statutPaiement: 'NON_PAYE'
    },
    recommande: {
      modeEnvoi: 'POSTAL',
      statut: 'ENVOYE',
      datePrepare: '2025-01-05',
      dateEnvoi: '2025-01-07',
      numeroSuivi: '1A12345678901'
    }
  },
  {
    id: '4',
    nom: 'Jean MARTIN',
    lot: 'B4',
    tantiemes: 125,
    montantIndividuel: 1562.50,
    modeEnvoiRecommande: 'courrier',
    envoye: true,
    adresse: '12 Rue de la Paix, 75001 Paris',
    paiement: {
      montantDu: 1562.50,
      montantPaye: 1562.50,
      statutPaiement: 'PAYE',
      datePaiement: '2025-01-08',
      modePaiement: 'CHEQUE'
    },
    recommande: {
      modeEnvoi: 'POSTAL',
      statut: 'LIVRE',
      datePrepare: '2025-01-05',
      dateEnvoi: '2025-01-07',
      dateLivraison: '2025-01-09',
      numeroSuivi: '1A12345678902'
    }
  },
  {
    id: '5',
    nom: 'Isabelle DUBOIS',
    lot: 'C5',
    tantiemes: 100,
    montantIndividuel: 1250.00,
    modeEnvoiRecommande: 'email',
    envoye: true,
    email: 'isabelle.dubois@example.fr',
    adresse: '12 Rue de la Paix, 75001 Paris',
    paiement: {
      montantDu: 1250.00,
      montantPaye: 0,
      statutPaiement: 'NON_PAYE'
    },
    recommande: {
      modeEnvoi: 'ELECTRONIQUE',
      statut: 'LU',
      datePrepare: '2025-01-05',
      dateEnvoi: '2025-01-06',
      dateLivraison: '2025-01-06',
      dateLecture: '2025-01-08',
      numeroSuivi: 'AR123456791FR'
    }
  },
  {
    id: '6',
    nom: 'Claude BERNARD',
    lot: 'C6',
    tantiemes: 150,
    montantIndividuel: 1875.00,
    modeEnvoiRecommande: 'electronique',
    envoye: true,
    email: 'claude.bernard@example.fr',
    adresse: '12 Rue de la Paix, 75001 Paris',
    paiement: {
      montantDu: 1875.00,
      montantPaye: 1875.00,
      statutPaiement: 'PAYE',
      datePaiement: '2025-01-11',
      modePaiement: 'PRELEVEMENT'
    },
    recommande: {
      modeEnvoi: 'ELECTRONIQUE',
      statut: 'LU',
      datePrepare: '2025-01-05',
      dateEnvoi: '2025-01-06',
      dateLivraison: '2025-01-06',
      dateLecture: '2025-01-06',
      numeroSuivi: 'AR123456792FR'
    }
  },
  {
    id: '7',
    nom: 'Anne ROUSSEAU',
    lot: 'D7',
    tantiemes: 125,
    montantIndividuel: 1562.50,
    modeEnvoiRecommande: 'email',
    envoye: false,
    email: 'anne.rousseau@example.fr',
    adresse: '12 Rue de la Paix, 75001 Paris',
    paiement: {
      montantDu: 1562.50,
      montantPaye: 0,
      statutPaiement: 'NON_PAYE'
    },
    recommande: {
      modeEnvoi: 'ELECTRONIQUE',
      statut: 'PREPARE',
      datePrepare: '2025-01-05'
    }
  },
  {
    id: '8',
    nom: 'Marc PETIT',
    lot: 'D8',
    tantiemes: 125,
    montantIndividuel: 1562.50,
    modeEnvoiRecommande: 'courrier',
    envoye: false,
    adresse: '12 Rue de la Paix, 75001 Paris',
    paiement: {
      montantDu: 1562.50,
      montantPaye: 0,
      statutPaiement: 'NON_PAYE'
    },
    recommande: {
      modeEnvoi: 'POSTAL',
      statut: 'NON_ENVOYE'
    }
  },
];
