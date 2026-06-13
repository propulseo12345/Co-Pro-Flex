import { Facture, CompteBancaire, Fournisseur, TypeDepense } from './types';

/** Clés de répartition disponibles */
export interface CleRepartition {
  id: string;
  nom: string;
  description: string;
  type: 'GENERALE' | 'ASCENSEUR' | 'CHAUFFAGE' | 'PARKING' | 'BATIMENT';
}

export const MOCK_CLES_REPARTITION: CleRepartition[] = [
  { id: 'cle-generale', nom: 'Clé générale', description: 'Tantièmes généraux de copropriété', type: 'GENERALE' },
  { id: 'cle-ascenseur', nom: 'Clé ascenseur', description: 'Répartition selon usage ascenseur', type: 'ASCENSEUR' },
  { id: 'cle-chauffage', nom: 'Clé chauffage', description: 'Répartition selon surface chauffée', type: 'CHAUFFAGE' },
  { id: 'cle-parking', nom: 'Clé parking', description: 'Répartition parking souterrain', type: 'PARKING' },
  { id: 'cle-batiment-a', nom: 'Clé bâtiment A', description: 'Charges spécifiques bâtiment A', type: 'BATIMENT' },
  { id: 'cle-batiment-b', nom: 'Clé bâtiment B', description: 'Charges spécifiques bâtiment B', type: 'BATIMENT' },
];

/** Comptes comptables disponibles */
export const COMPTES_COMPTABLES = [
  { code: '601', libelle: 'Achats stockés - Matières premières' },
  { code: '602', libelle: 'Achats stockés - Autres approvisionnements' },
  { code: '606', libelle: 'Achats non stockés de matières et fournitures' },
  { code: '611', libelle: 'Sous-traitance générale' },
  { code: '613', libelle: 'Locations' },
  { code: '614', libelle: 'Charges locatives et de copropriété' },
  { code: '615', libelle: 'Entretien et réparations' },
  { code: '616', libelle: "Primes d'assurance" },
  { code: '622', libelle: "Rémunérations d'intermédiaires et honoraires" },
  { code: '626', libelle: 'Frais postaux et télécommunications' },
  { code: '627', libelle: 'Services bancaires' },
];

export const MOCK_FOURNISSEURS: Fournisseur[] = [
  {
    id: '1',
    nom: 'EDF',
    email: 'contact@edf.fr',
    telephone: '+33 9 69 32 15 15',
    adresse: '22-30 Avenue de Wagram, 75008 Paris',
    iban: 'FR76 1234 5678 9012 3456 7890 123',
    bic: 'EDFLFR21XXX',
    services: ['Électricité']
  },
  {
    id: '2',
    nom: 'Veolia Eau',
    email: 'contact@veolia.fr',
    telephone: '+33 1 71 75 00 00',
    adresse: '21 Rue La Boétie, 75008 Paris',
    iban: 'FR76 9876 5432 1098 7654 3210 987',
    bic: 'VEOLIAFR1XXX',
    services: ['Eau']
  },
  {
    id: '3',
    nom: 'Allianz Assurances',
    email: 'contact@allianz.fr',
    telephone: '+33 1 44 86 20 00',
    adresse: 'Tour Allianz, 1 Cours Michelet, 92800 Puteaux',
    iban: 'FR76 1111 2222 3333 4444 5555 666',
    bic: 'ALLZFR21XXX',
    services: ['Assurance']
  },
  {
    id: '4',
    nom: 'Entreprise Martin BTP',
    email: 'contact@martin-btp.fr',
    telephone: '+33 1 45 67 89 10',
    adresse: '15 Rue des Artisans, 92100 Boulogne-Billancourt',
    iban: 'FR76 7777 8888 9999 0000 1111 222',
    bic: 'CMBRFR2BXXX',
    services: ['Travaux', 'Entretien']
  },
  {
    id: '5',
    nom: 'CleanPro Services',
    email: 'contact@cleanpro.fr',
    telephone: '+33 1 40 55 66 77',
    adresse: '8 Avenue des Entrepreneurs, 75015 Paris',
    iban: 'FR76 3333 4444 5555 6666 7777 888',
    bic: 'CLPNFR21XXX',
    services: ['Ménage']
  },
  {
    id: '6',
    nom: 'Otis Ascenseurs',
    email: 'contact@otis.fr',
    telephone: '+33 1 55 23 33 00',
    adresse: '3 Place de la Pyramide, 92800 Puteaux',
    iban: 'FR76 9999 0000 1111 2222 3333 444',
    bic: 'OTISFR21XXX',
    services: ['Ascenseur', 'Entretien']
  },
];

export const MOCK_COMPTES: CompteBancaire[] = [
  {
    id: 'compte-courant',
    nom: 'Compte Courant Copropriété',
    type: 'courant',
    solde: 45230.50,
    iban: 'FR76 1234 5678 9012 3456 7890 123'
  },
  {
    id: 'compte-travaux',
    nom: 'Fonds Travaux',
    type: 'travaux',
    solde: 28450.00,
    iban: 'FR76 9876 5432 1098 7654 3210 987'
  }
];

export const MOCK_FACTURES: Facture[] = [
  // Facture EDF - validée, à payer
  {
    id: '1',
    typeDocument: 'FACTURE',
    date: '2025-01-15',
    dateEcheance: '2025-01-31',
    fournisseur: 'EDF',
    reference: 'EDF-2025-001',
    montant: 1245.50,
    statut: 'A_PAYER',
    posteBudgetaire: 'electricite',
    fichier: '/documents/factures/edf-janvier-2025.pdf',
    cleRepartitionId: 'cle-generale',
    ventilation: [
      { id: 'v1-1', compteComptable: '606', libelle: 'Électricité parties communes', montantHT: 1037.92, tauxTVA: 20, montantTVA: 207.58, montantTTC: 1245.50, cleRepartitionId: 'cle-generale' }
    ],
    historique: [
      { id: 'h1-1', date: '2025-01-15', type: 'CREATION', nouveauStatut: 'BROUILLON', utilisateur: 'Jean Dupont' },
      { id: 'h1-2', date: '2025-01-16', type: 'CHANGEMENT_STATUT', statutPrecedent: 'BROUILLON', nouveauStatut: 'A_VALIDER', utilisateur: 'Jean Dupont' },
      { id: 'h1-3', date: '2025-01-17', type: 'CHANGEMENT_STATUT', statutPrecedent: 'A_VALIDER', nouveauStatut: 'VALIDEE', utilisateur: 'Marie Martin', commentaire: 'Ventilation vérifiée' },
      { id: 'h1-4', date: '2025-01-18', type: 'CHANGEMENT_STATUT', statutPrecedent: 'VALIDEE', nouveauStatut: 'A_PAYER', utilisateur: 'Marie Martin' },
    ],
    dateValidation: '2025-01-17',
    validePar: 'Marie Martin'
  },
  // Facture Veolia - échéance proche, à payer
  {
    id: '2',
    typeDocument: 'FACTURE',
    date: '2025-01-10',
    dateEcheance: '2025-01-20',
    fournisseur: 'Veolia Eau',
    reference: 'VEO-2025-012',
    montant: 890.00,
    statut: 'A_PAYER',
    posteBudgetaire: 'eau',
    fichier: '/documents/factures/veolia-janvier-2025.pdf',
    cleRepartitionId: 'cle-generale',
    ventilation: [
      { id: 'v2-1', compteComptable: '606', libelle: 'Eau froide', montantHT: 650.00, tauxTVA: 5.5, montantTVA: 35.75, montantTTC: 685.75, cleRepartitionId: 'cle-generale' },
      { id: 'v2-2', compteComptable: '606', libelle: 'Assainissement', montantHT: 193.46, tauxTVA: 5.5, montantTVA: 10.64, montantTTC: 204.25, cleRepartitionId: 'cle-generale' }
    ],
    historique: [
      { id: 'h2-1', date: '2025-01-10', type: 'CREATION', nouveauStatut: 'BROUILLON', utilisateur: 'Jean Dupont' },
      { id: 'h2-2', date: '2025-01-11', type: 'CHANGEMENT_STATUT', statutPrecedent: 'BROUILLON', nouveauStatut: 'A_VALIDER', utilisateur: 'Jean Dupont' },
      { id: 'h2-3', date: '2025-01-12', type: 'CHANGEMENT_STATUT', statutPrecedent: 'A_VALIDER', nouveauStatut: 'VALIDEE', utilisateur: 'Marie Martin' },
      { id: 'h2-4', date: '2025-01-13', type: 'CHANGEMENT_STATUT', statutPrecedent: 'VALIDEE', nouveauStatut: 'A_PAYER', utilisateur: 'Marie Martin' },
    ]
  },
  // Facture Allianz - entièrement traitée (payée)
  {
    id: '3',
    typeDocument: 'FACTURE',
    date: '2024-12-20',
    dateEcheance: '2024-12-31',
    fournisseur: 'Allianz Assurances',
    reference: 'ALL-2024-456',
    montant: 3200.00,
    statut: 'PAYEE',
    datePaiement: '2024-12-22',
    compteDebite: 'compte-courant',
    typeDepense: 'assurance',
    posteBudgetaire: 'assurance',
    cleRepartitionId: 'cle-generale',
    historique: [
      { id: 'h3-1', date: '2024-12-20', type: 'CREATION', nouveauStatut: 'BROUILLON', utilisateur: 'Jean Dupont' },
      { id: 'h3-2', date: '2024-12-20', type: 'CHANGEMENT_STATUT', statutPrecedent: 'BROUILLON', nouveauStatut: 'A_VALIDER', utilisateur: 'Jean Dupont' },
      { id: 'h3-3', date: '2024-12-21', type: 'CHANGEMENT_STATUT', statutPrecedent: 'A_VALIDER', nouveauStatut: 'VALIDEE', utilisateur: 'Marie Martin' },
      { id: 'h3-4', date: '2024-12-21', type: 'CHANGEMENT_STATUT', statutPrecedent: 'VALIDEE', nouveauStatut: 'A_PAYER', utilisateur: 'Marie Martin' },
      { id: 'h3-5', date: '2024-12-22', type: 'PAIEMENT', statutPrecedent: 'A_PAYER', nouveauStatut: 'PAYEE', utilisateur: 'Jean Dupont', commentaire: 'Virement bancaire effectué' },
    ]
  },
  // Facture Martin BTP - EN RETARD, à payer - avec un avoir lié
  {
    id: '4',
    typeDocument: 'FACTURE',
    date: '2025-01-05',
    dateEcheance: '2025-01-10',
    fournisseur: 'Entreprise Martin BTP',
    reference: 'MAR-2025-789',
    montant: 5600.00,
    statut: 'A_PAYER',
    posteBudgetaire: 'divers',
    fichier: '/documents/factures/martin-devis-2025.pdf',
    cleRepartitionId: 'cle-batiment-a',
    ventilation: [
      { id: 'v4-1', compteComptable: '615', libelle: 'Réparation toiture bât. A', montantHT: 4666.67, tauxTVA: 20, montantTVA: 933.33, montantTTC: 5600.00, cleRepartitionId: 'cle-batiment-a' }
    ],
    historique: [
      { id: 'h4-1', date: '2025-01-05', type: 'CREATION', nouveauStatut: 'BROUILLON', utilisateur: 'Jean Dupont' },
      { id: 'h4-2', date: '2025-01-06', type: 'CHANGEMENT_STATUT', statutPrecedent: 'BROUILLON', nouveauStatut: 'A_VALIDER', utilisateur: 'Jean Dupont' },
      { id: 'h4-3', date: '2025-01-07', type: 'CHANGEMENT_STATUT', statutPrecedent: 'A_VALIDER', nouveauStatut: 'VALIDEE', utilisateur: 'Marie Martin' },
      { id: 'h4-4', date: '2025-01-08', type: 'CHANGEMENT_STATUT', statutPrecedent: 'VALIDEE', nouveauStatut: 'A_PAYER', utilisateur: 'Marie Martin' },
    ]
  },
  // AVOIR Martin BTP - remise suite erreur de facturation (lié à facture 4)
  { id: '7', typeDocument: 'AVOIR', date: '2025-01-08', dateEcheance: '2025-01-31', fournisseur: 'Entreprise Martin BTP', reference: 'AVO-MAR-2025-001', montant: 600.00, statut: 'A_PAYER', posteBudgetaire: 'divers', factureOrigineId: '4', motifAvoir: 'ERREUR_FACTURATION', fichier: '/documents/avoirs/avoir-martin-2025.pdf' },
  // Facture CleanPro - entièrement traitée (payée)
  { id: '5', typeDocument: 'FACTURE', date: '2024-12-28', dateEcheance: '2025-01-31', fournisseur: 'CleanPro Services', reference: 'CLP-2024-321', montant: 450.00, statut: 'PAYEE', posteBudgetaire: 'menage', datePaiement: '2024-12-30', compteDebite: 'compte-courant', typeDepense: 'menage', cleRepartitionId: 'cle-generale' },
  // Facture Otis - validée, à payer
  {
    id: '6',
    typeDocument: 'FACTURE',
    date: '2025-01-12',
    dateEcheance: '2025-02-28',
    fournisseur: 'Otis Ascenseurs',
    reference: 'OTS-2025-654',
    montant: 1890.00,
    statut: 'A_PAYER',
    posteBudgetaire: 'ascenseur',
    fichier: '/documents/factures/otis-maintenance-2025.pdf',
    cleRepartitionId: 'cle-ascenseur',
    ventilation: [
      { id: 'v6-1', compteComptable: '615', libelle: 'Maintenance ascenseur T1', montantHT: 787.50, tauxTVA: 20, montantTVA: 157.50, montantTTC: 945.00, cleRepartitionId: 'cle-ascenseur' },
      { id: 'v6-2', compteComptable: '615', libelle: 'Maintenance ascenseur T2', montantHT: 787.50, tauxTVA: 20, montantTVA: 157.50, montantTTC: 945.00, cleRepartitionId: 'cle-ascenseur' }
    ]
  },
  // Facture nouvelle - brouillon
  { id: '8', typeDocument: 'FACTURE', date: '2025-01-16', dateEcheance: '2025-02-15', fournisseur: 'ENGIE', reference: 'ENG-2025-001', montant: 756.30, statut: 'BROUILLON', fichier: '/documents/factures/engie-janvier-2025.pdf' },
  // Facture nouvelle - à valider
  { id: '9', typeDocument: 'FACTURE', date: '2025-01-14', dateEcheance: '2025-02-14', fournisseur: 'Jardiland Pro', reference: 'JAR-2025-042', montant: 320.00, statut: 'A_VALIDER', fichier: '/documents/factures/jardiland-janvier-2025.pdf', cleRepartitionId: 'cle-generale' },
  // Facture validée - en attente de mise en paiement
  { id: '10', typeDocument: 'FACTURE', date: '2024-11-05', dateEcheance: '2024-12-05', fournisseur: 'Chauffage Expert', reference: 'CHE-2024-089', montant: 520.00, statut: 'VALIDEE', posteBudgetaire: 'plomberie', ordreServiceId: '3', fichier: '/documents/factures/chauffage-expert-novembre-2024.pdf', cleRepartitionId: 'cle-chauffage' },
  // Facture Paysagiste Expert - payée
  { id: '11', typeDocument: 'FACTURE', date: '2024-09-25', dateEcheance: '2024-10-25', fournisseur: 'Paysagiste Expert', reference: 'PAY-2024-156', montant: 380.00, statut: 'PAYEE', posteBudgetaire: 'espaces_verts', ordreServiceId: '4', datePaiement: '2024-10-15', compteDebite: 'compte-courant', fichier: '/documents/factures/paysagiste-expert-septembre-2024.pdf', cleRepartitionId: 'cle-generale' },
];

export const TYPE_DEPENSE_LABELS: Record<TypeDepense, string> = {
  entretien: 'Entretien',
  electricite: 'Électricité',
  eau: 'Eau',
  assurance: 'Assurance',
  travaux: 'Travaux',
  menage: 'Ménage',
  ascenseur: 'Ascenseur',
  divers: 'Divers'
};

export const COMPTES_CHARGE: Record<TypeDepense, string> = {
  entretien: '615 - Entretien et réparations',
  electricite: '606 - Électricité',
  eau: '606 - Eau',
  assurance: '616 - Primes d\'assurance',
  travaux: '605 - Travaux',
  menage: '614 - Charges de personnel extérieur',
  ascenseur: '615 - Entretien ascenseur',
  divers: '618 - Divers'
};
