import type {
  CompteBancaire,
  MouvementBancaireBase,
  EcritureComptable,
  StatutConnexionBancaire,
  HistoriqueSynchronisation,
  CategorieComptable,
} from './types';

export const MOCK_APPELS_EN_ATTENTE = [
  { id: 'af-1', coproprietaire: 'LEBLANC MARIE', montant: 1562.50, periode: 'T4 2024' },
  { id: 'af-2', coproprietaire: 'MOREAU PIERRE', montant: 1250.00, periode: 'T4 2024' },
  { id: 'af-3', coproprietaire: 'LAURENT SOPHIE', montant: 1875.00, periode: 'T4 2024' },
  { id: 'af-4', coproprietaire: 'DUBOIS ISABELLE', montant: 1250.00, periode: 'T4 2024' },
  { id: 'af-5', coproprietaire: 'UNKNOWN', montant: 2500.00, periode: 'T1 2025' },
];

export const MOCK_FACTURES_EN_ATTENTE = [
  { id: 'fac-1', fournisseur: 'EDF', montant: 1245.50, description: 'Électricité janvier' },
  { id: 'fac-2', fournisseur: 'VEOLIA', montant: 890.00, description: 'Eau décembre' },
  { id: 'fac-3', fournisseur: 'OTIS', montant: 1890.00, description: 'Maintenance ascenseur' },
];

export const FOURNISSEURS_CONNUS = [
  { nom: 'EDF', compte: '606', label: 'Eau et électricité', motsClés: ['edf', 'electricite', 'électricité'] },
  { nom: 'VEOLIA', compte: '606', label: 'Eau et électricité', motsClés: ['veolia', 'eau'] },
  { nom: 'OTIS', compte: '615', label: 'Entretien et réparations', motsClés: ['otis', 'ascenseur'] },
  { nom: 'ENGIE', compte: '606', label: 'Eau et électricité', motsClés: ['engie', 'gaz'] },
  { nom: 'AXA', compte: '616', label: 'Primes d\'assurance', motsClés: ['axa', 'assurance'] },
];

export const MOTS_CLES_DETECTION = {
  appelsFonds: ['appel de fonds', 'appel fonds', 'charges', 'provision', 'cotisation'],
  travaux: ['travaux', 'btp', 'chantier', 'renovation', 'rénovation'],
  entretien: ['entretien', 'maintenance', 'réparation', 'reparation', 'ascenseur', 'plomberie'],
  assurance: ['assurance', 'prime', 'sinistre'],
  energie: ['edf', 'electricite', 'électricité', 'engie', 'gaz', 'veolia', 'eau'],
  remboursement: ['remboursement', 'avoir', 'retour', 'annulation'],
};

export const HEURISTIQUES_LIBELLE: Array<{
  pattern: RegExp;
  compte: string;
  label: string;
  categorie: CategorieComptable;
}> = [
  { pattern: /vir(ement)?\.?\s*(sepa|entrant)/i, compte: '701', label: 'Appels de fonds', categorie: 'produit' },
  { pattern: /appel\s*(de\s*)?fonds/i, compte: '701', label: 'Appels de fonds', categorie: 'produit' },
  { pattern: /charges?\s*(copro|courantes?)/i, compte: '701', label: 'Appels de fonds', categorie: 'produit' },
  { pattern: /prel[eè]v\.?\s*(edf|engie|électricité)/i, compte: '606', label: 'Eau et électricité', categorie: 'charge' },
  { pattern: /edf|électricité|electricite/i, compte: '606', label: 'Eau et électricité', categorie: 'charge' },
  { pattern: /veolia|lyonnaise|eau\s*(de\s*)?paris/i, compte: '606', label: 'Eau et électricité', categorie: 'charge' },
  { pattern: /gaz|engie/i, compte: '606', label: 'Eau et électricité', categorie: 'charge' },
  { pattern: /otis|schindler|kone|ascenseur/i, compte: '615', label: 'Entretien et réparations', categorie: 'charge' },
  { pattern: /entretien|maintenance|réparation|plombier|électricien/i, compte: '615', label: 'Entretien et réparations', categorie: 'charge' },
  { pattern: /axa|allianz|maif|assurance|prime/i, compte: '616', label: 'Primes d\'assurance', categorie: 'charge' },
  { pattern: /travaux|rénovation|btp|chantier/i, compte: '605', label: 'Travaux', categorie: 'charge' },
  { pattern: /syndic|honoraires?\s*syndic/i, compte: '622', label: 'Honoraires syndic', categorie: 'charge' },
  { pattern: /remboursement|avoir|annulation/i, compte: '758', label: 'Produits divers', categorie: 'produit' },
];

export const COMPTES_CHARGE = [
  { code: '605', label: 'Travaux' },
  { code: '606', label: 'Eau et électricité' },
  { code: '614', label: 'Charges de personnel' },
  { code: '615', label: 'Entretien et réparations' },
  { code: '616', label: 'Primes d\'assurance' },
  { code: '618', label: 'Divers' },
];

export const COMPTES_PRODUIT = [
  { code: '701', label: 'Appels de fonds' },
  { code: '758', label: 'Produits divers de gestion courante' },
  { code: '768', label: 'Autres produits financiers' },
];

export const MOCK_COMPTE_COURANT: CompteBancaire = {
  id: '1',
  nom: 'Compte courant copropriété',
  type: 'courant',
  iban: 'FR76 1234 5678 9012 3456 7890 123',
  soldeInitial: 43943.50,
  derniereMaj: new Date().toISOString()
};

export const MOCK_COMPTE_TRAVAUX: CompteBancaire = {
  id: '2',
  nom: 'Compte fonds de travaux',
  type: 'travaux',
  iban: 'FR76 9876 5432 1098 7654 3210 987',
  soldeInitial: 28450.00,
  derniereMaj: new Date().toISOString()
};

export const MOCK_MOUVEMENTS_BASE: MouvementBancaireBase[] = [
  {
    id: '1',
    date: '2025-01-20',
    libelle: 'VIREMENT LEBLANC MARIE APPEL DE FONDS T4',
    montant: 1562.50,
    type: 'ENTREE',
    categorise: true,
    compteComptable: '701 - Appels de fonds',
    categorie: 'produit',
    entiteLiee: {
      type: 'appel_fonds',
      id: 'af-1',
      nom: 'LEBLANC Marie',
      reference: 'AF-2024-T4-001',
      montant: 1562.50,
      details: {
        periode: 'T4 2024',
        lot: 'Lot 12 - Appartement 3ème étage',
        tantiemes: 125,
        email: 'marie.leblanc@email.com',
        telephone: '06 12 34 56 78'
      }
    }
  },
  {
    id: '2',
    date: '2025-01-18',
    libelle: 'PRELEVEMENT EDF ELECTRICITE JANVIER',
    montant: -1245.50,
    type: 'SORTIE',
    categorise: true,
    compteComptable: '606 - Eau et électricité',
    categorie: 'charge',
    fournisseur: 'EDF',
    entiteLiee: {
      type: 'facture',
      id: 'fac-1',
      nom: 'EDF',
      reference: 'FAC-EDF-2025-001',
      montant: 1245.50,
      details: {
        dateEcheance: '2025-01-25',
        statut: 'PAYEE'
      }
    }
  },
  {
    id: '3',
    date: '2025-01-15',
    libelle: 'VIREMENT MOREAU PIERRE APPEL DE FONDS T4',
    montant: 1250.00,
    type: 'ENTREE',
    categorise: true,
    compteComptable: '701 - Appels de fonds',
    categorie: 'produit',
    entiteLiee: {
      type: 'appel_fonds',
      id: 'af-2',
      nom: 'MOREAU Pierre',
      reference: 'AF-2024-T4-002',
      montant: 1250.00,
      details: {
        periode: 'T4 2024',
        lot: 'Lot 8 - Appartement 2ème étage',
        tantiemes: 100,
        email: 'pierre.moreau@email.com',
        telephone: '06 98 76 54 32'
      }
    }
  },
  {
    id: '4',
    date: '2025-01-12',
    libelle: 'PRELEVEMENT VEOLIA EAU DECEMBRE',
    montant: -890.00,
    type: 'SORTIE',
    categorise: true,
    compteComptable: '606 - Eau et électricité',
    categorie: 'charge',
    fournisseur: 'Veolia',
    entiteLiee: {
      type: 'facture',
      id: 'fac-2',
      nom: 'VEOLIA',
      reference: 'FAC-VEOLIA-2024-012',
      montant: 890.00,
      details: {
        dateEcheance: '2025-01-20',
        statut: 'PAYEE'
      }
    }
  },
  {
    id: '5',
    date: '2025-01-10',
    libelle: 'VIREMENT ENTRANT REF 12345',
    montant: 2500.00,
    type: 'ENTREE',
    categorise: false
  },
  {
    id: '6',
    date: '2025-01-08',
    libelle: 'PRELEVEMENT OTIS MAINTENANCE ASCENSEUR',
    montant: -1890.00,
    type: 'SORTIE',
    categorise: true,
    compteComptable: '615 - Entretien et réparations',
    categorie: 'charge',
    fournisseur: 'Otis',
    entiteLiee: {
      type: 'facture',
      id: 'fac-3',
      nom: 'OTIS',
      reference: 'FAC-OTIS-2025-001',
      montant: 1890.00,
      details: {
        dateEcheance: '2025-01-15',
        statut: 'PAYEE'
      }
    }
  },
];

export const MOCK_ECRITURES_COMPTABLES: EcritureComptable[] = [
  { id: 'ec-1', date: '2025-01-20', libelle: 'Appel de fonds T4 - LEBLANC Marie', debit: 0, credit: 1562.50, compte: '701', journal: 'BQ', piece: 'AF-2024-T4-001', rapproche: true, mouvementRapproche: '1' },
  { id: 'ec-2', date: '2025-01-18', libelle: 'Facture EDF - Électricité janvier', debit: 1245.50, credit: 0, compte: '606', journal: 'AC', piece: 'FAC-EDF-2025-001', rapproche: true, mouvementRapproche: '2' },
  { id: 'ec-3', date: '2025-01-15', libelle: 'Appel de fonds T4 - MOREAU Pierre', debit: 0, credit: 1250.00, compte: '701', journal: 'BQ', piece: 'AF-2024-T4-002', rapproche: true, mouvementRapproche: '3' },
  { id: 'ec-4', date: '2025-01-12', libelle: 'Facture VEOLIA - Eau décembre', debit: 890.00, credit: 0, compte: '606', journal: 'AC', piece: 'FAC-VEOLIA-2024-012', rapproche: true, mouvementRapproche: '4' },
  { id: 'ec-5', date: '2025-01-10', libelle: 'Produits exceptionnels', debit: 0, credit: 2500.00, compte: '758', journal: 'OD', piece: 'OD-2025-001', rapproche: false },
  { id: 'ec-6', date: '2025-01-08', libelle: 'Facture OTIS - Maintenance ascenseur', debit: 1890.00, credit: 0, compte: '615', journal: 'AC', piece: 'FAC-OTIS-2025-001', rapproche: true, mouvementRapproche: '6' },
  { id: 'ec-7', date: '2025-01-05', libelle: 'Honoraires syndic T1 2025', debit: 3200.00, credit: 0, compte: '622', journal: 'AC', piece: 'FAC-SYNDIC-2025-001', rapproche: false },
  { id: 'ec-8', date: '2025-01-03', libelle: 'Appel de fonds T4 - DURAND Jean', debit: 0, credit: 1875.00, compte: '701', journal: 'BQ', piece: 'AF-2024-T4-003', rapproche: false },
];

export const MOCK_STATUT_CONNEXION: StatutConnexionBancaire = {
  statut: 'connecte',
  banque: 'Crédit Mutuel',
  derniereSynchronisation: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  prochaineSynchronisation: new Date(Date.now() + 1000 * 60 * 60 * 16).toISOString(),
  modeActif: 'automatique',
  comptesConnectes: 2,
  comptesTotal: 2
};

export const MOCK_HISTORIQUE_SYNC: HistoriqueSynchronisation[] = [
  {
    id: 'sync-1',
    date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString().split('T')[0],
    heure: new Date(Date.now() - 1000 * 60 * 60 * 8).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    mode: 'automatique',
    statut: 'succes',
    nombreMouvements: 6,
    message: 'Synchronisation quotidienne réussie',
    details: { nouveauxMouvements: 2, mouvementsMisAJour: 4, erreurs: 0 }
  },
  {
    id: 'sync-2',
    date: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString().split('T')[0],
    heure: '06:30',
    mode: 'automatique',
    statut: 'succes',
    nombreMouvements: 4,
    message: 'Synchronisation quotidienne réussie',
    details: { nouveauxMouvements: 4, mouvementsMisAJour: 0, erreurs: 0 }
  },
  {
    id: 'sync-3',
    date: new Date(Date.now() - 1000 * 60 * 60 * 56).toISOString().split('T')[0],
    heure: '06:30',
    mode: 'automatique',
    statut: 'partiel',
    nombreMouvements: 3,
    message: 'Synchronisation partielle - timeout sur compte travaux',
    details: { nouveauxMouvements: 3, mouvementsMisAJour: 0, erreurs: 1 }
  },
  {
    id: 'sync-4',
    date: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString().split('T')[0],
    heure: '14:22',
    mode: 'manuel',
    statut: 'succes',
    nombreMouvements: 8,
    message: 'Import manuel CSV réussi',
    details: { nouveauxMouvements: 8, mouvementsMisAJour: 0, erreurs: 0 }
  },
];
