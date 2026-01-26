import {
    ParametresCopropriete,
    UserRole,
    PlanComptable,
    TypeCompte,
    Exercice,
    Depense,
    AppelFonds,
    Budget,
    MouvementBancaire,
    BudgetTravaux,
    Facture,
    Intervention,
    Contrat,
    Fournisseur,
    OrdreService,
    EmailTemplateOS,
    Document,
    Assemblee,
    ForumTopic,
    ForumMessage,
    Event,
    Conversation,
    PrivateMessage,
    Sale,
    Impaye,
    Litige,
    DomaineActivite,
    Prestataire,
    AvisPrestataire,
    TypeContrat,
    ContratDetaille,
    InterventionDetaille,
    ContratAssurance,
    ContratSyndic
} from '@/types';


export interface AdressePostale {
    rue: string;
    codePostal: string;
    ville: string;
}

export interface Coproprietaire {
    id: string;
    nom: string;
    lot: string;
    email: string;
    telephone?: string;
    adressePostale?: AdressePostale;
    tantiemes: number;
    accepteAvisElectronique?: boolean; // Accord écrit pour recevoir les convocations par voie électronique
}

export const MOCK_COPROPRIETAIRES: Coproprietaire[] = [
    {
        id: '1',
        nom: 'Marie LEBLANC',
        lot: 'A1',
        email: 'marie.leblanc@example.fr',
        telephone: '06 12 34 56 78',
        adressePostale: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
        tantiemes: 125,
        accepteAvisElectronique: true
    },
    {
        id: '2',
        nom: 'Pierre MOREAU',
        lot: 'A2',
        email: 'pierre.moreau@example.fr',
        telephone: '06 23 45 67 89',
        adressePostale: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
        tantiemes: 100,
        accepteAvisElectronique: false
    },
    {
        id: '3',
        nom: 'Sophie LAURENT',
        lot: 'B3',
        email: 'sophie.laurent@example.fr',
        adressePostale: { rue: '12 rue de la Paix', codePostal: '75002', ville: 'Paris' },
        tantiemes: 150,
        accepteAvisElectronique: true
    },
    {
        id: '4',
        nom: 'Jean MARTIN',
        lot: 'B4',
        email: '',
        adressePostale: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
        tantiemes: 125,
        accepteAvisElectronique: false
    },
    {
        id: '5',
        nom: 'Isabelle DUBOIS',
        lot: 'C5',
        email: 'isabelle.dubois@example.fr',
        tantiemes: 100,
        accepteAvisElectronique: false
    },
    {
        id: '6',
        nom: 'Claude BERNARD',
        lot: 'C6',
        email: 'claude.bernard@example.fr',
        telephone: '06 45 67 89 01',
        adressePostale: { rue: '8 place Bellecour', codePostal: '69002', ville: 'Lyon' },
        tantiemes: 150,
        accepteAvisElectronique: true
    },
    {
        id: '7',
        nom: 'Anne ROUSSEAU',
        lot: 'D7',
        email: 'anne.rousseau@example.fr',
        adressePostale: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
        tantiemes: 125,
        accepteAvisElectronique: false
    },
    {
        id: '8',
        nom: 'Marc PETIT',
        lot: 'D8',
        email: 'marc.petit@example.fr',
        telephone: '06 78 90 12 34',
        adressePostale: { rue: '25 avenue Victor Hugo', codePostal: '69003', ville: 'Lyon' },
        tantiemes: 125,
        accepteAvisElectronique: true
    }
];

export const MOCK_PARAMETRES: ParametresCopropriete = {
    typesAcces: {
        invitations: [
            { email: 'nouveau.coproprietaire@example.fr', role: 'COPROPRIETAIRE', statut: 'EN_ATTENTE' }
        ],
        niveauxAcces: [
            { role: 'PRESIDENT_CS', permissions: ['ALL'] },
            { role: 'COPROPRIETAIRE', permissions: ['READ_OWN', 'VOTE'] }
        ]
    },
    tableauBord: {
        informationsAffichees: ['solde', 'derniers_messages'],
        widgetsActifs: ['finance', 'travaux']
    },
    visibiliteInfos: {
        proprietesVisibles: ['nom', 'etage'],
        restrictionsParRole: {
            'LOCATAIRE': ['budget'],
            'COPROPRIETAIRE': [],
            'ADMIN': [],
            'PRESIDENT_CS': [],
            'MEMBRE_CS': [],
            'SYNDIC': []
        }
    },
    informationsCopro: {
        nom: "Résidence Les Jardins",
        adresse: "25 avenue Victor Hugo, 69003 Lyon",
        nombreLots: 28,
        anneeConstruction: 1992
    },
    finance: {
        tantiemes: [
            { lotId: 'A1', valeur: 125, type: 'GENERAL' }
        ],
        clesRepartition: [
            { id: '1', nom: 'Charges Générales', type: 'TANTIEME_GENERAL' },
            { id: '2', nom: 'Charges Ascenseur', type: 'TANTIEME_ASCENSEUR' }
        ],
        planComptable: [
            { numero: '103', libelle: 'Provisions pour charges', type: 'PASSIF' },
            { numero: '411', libelle: 'Clients', type: 'ACTIF' },
            { numero: '531', libelle: 'Caisse', type: 'ACTIF' }
        ]
    }
};


// Plan comptable complet pour copropriété - conforme au décret n°2005-240
// Balance équilibrée : ACTIF + CHARGES = PASSIF + PRODUITS
// Avec données comparatives N-1 et mouvements de l'exercice
export const MOCK_PLAN_COMPTABLE: PlanComptable[] = [
    // CLASSE 1 - FONDS PROPRES ET EMPRUNTS (PASSIF)
    {
        id: '1', numero: '1', libelle: 'Fonds propres et emprunts', type: TypeCompte.PASSIF, niveau: 1, solde: 15250.00,
        soldeN1: 14500.00, mouvementDebit: 2500.00, mouvementCredit: 3250.00,
        sousComptes: [
            {
                id: '10', numero: '10', libelle: 'Fonds de roulement', type: TypeCompte.PASSIF, niveau: 2, solde: 5000.00,
                soldeN1: 5000.00, mouvementDebit: 0, mouvementCredit: 0,
            },
            {
                id: '11', numero: '11', libelle: 'Solde en attente sur travaux', type: TypeCompte.PASSIF, niveau: 2, solde: 0,
                soldeN1: 0, mouvementDebit: 0, mouvementCredit: 0,
            },
            {
                id: '12', numero: '12', libelle: 'Solde en attente sur opérations courantes', type: TypeCompte.PASSIF, niveau: 2, solde: 2500.00,
                soldeN1: 2000.00, mouvementDebit: 500.00, mouvementCredit: 1000.00,
            },
            {
                id: '13', numero: '13', libelle: 'Avances travaux copropriétaires', type: TypeCompte.PASSIF, niveau: 2, solde: 7750.00,
                soldeN1: 7500.00, mouvementDebit: 2000.00, mouvementCredit: 2250.00,
                sousComptes: [
                    { id: '13001', numero: '13001', libelle: 'Avances travaux - Marie LEBLANC', type: TypeCompte.PASSIF, niveau: 3, solde: 1250.00, soldeN1: 1200.00, mouvementDebit: 250.00, mouvementCredit: 300.00 },
                    { id: '13002', numero: '13002', libelle: 'Avances travaux - Pierre MOREAU', type: TypeCompte.PASSIF, niveau: 3, solde: 1000.00, soldeN1: 950.00, mouvementDebit: 200.00, mouvementCredit: 250.00 },
                    { id: '13003', numero: '13003', libelle: 'Avances travaux - Sophie LAURENT', type: TypeCompte.PASSIF, niveau: 3, solde: 1500.00, soldeN1: 1450.00, mouvementDebit: 300.00, mouvementCredit: 350.00 },
                    { id: '13004', numero: '13004', libelle: 'Avances travaux - Jean MARTIN', type: TypeCompte.PASSIF, niveau: 3, solde: 1000.00, soldeN1: 1000.00, mouvementDebit: 250.00, mouvementCredit: 250.00 },
                    { id: '13005', numero: '13005', libelle: 'Avances travaux - Isabelle DUBOIS', type: TypeCompte.PASSIF, niveau: 3, solde: 500.00, soldeN1: 500.00, mouvementDebit: 200.00, mouvementCredit: 200.00 },
                    { id: '13006', numero: '13006', libelle: 'Avances travaux - Claude BERNARD', type: TypeCompte.PASSIF, niveau: 3, solde: 1500.00, soldeN1: 1400.00, mouvementDebit: 300.00, mouvementCredit: 400.00 },
                    { id: '13007', numero: '13007', libelle: 'Avances travaux - Anne ROUSSEAU', type: TypeCompte.PASSIF, niveau: 3, solde: 500.00, soldeN1: 500.00, mouvementDebit: 250.00, mouvementCredit: 250.00 },
                    { id: '13008', numero: '13008', libelle: 'Avances travaux - Marc PETIT', type: TypeCompte.PASSIF, niveau: 3, solde: 500.00, soldeN1: 500.00, mouvementDebit: 250.00, mouvementCredit: 250.00 },
                ]
            },
            {
                id: '16', numero: '16', libelle: 'Emprunts', type: TypeCompte.PASSIF, niveau: 2, solde: 0,
                soldeN1: 0, mouvementDebit: 0, mouvementCredit: 0,
            },
        ]
    },
    // CLASSE 4 - COMPTES DE TIERS
    {
        id: '4', numero: '4', libelle: 'Comptes de tiers', type: TypeCompte.PASSIF, niveau: 1, solde: 8450.00,
        soldeN1: 7200.00, mouvementDebit: 38500.00, mouvementCredit: 39750.00,
        sousComptes: [
            // 40x - Fournisseurs (créditeurs = dettes)
            {
                id: '40', numero: '40', libelle: 'Fournisseurs', type: TypeCompte.PASSIF, niveau: 2, solde: 4850.00,
                soldeN1: 4200.00, mouvementDebit: 38500.00, mouvementCredit: 39150.00,
                sousComptes: [
                    { id: '40101', numero: '40101', libelle: 'Fournisseur - Veolia Eau', type: TypeCompte.PASSIF, niveau: 3, solde: 1250.00, soldeN1: 1100.00, mouvementDebit: 9350.00, mouvementCredit: 9500.00 },
                    { id: '40102', numero: '40102', libelle: 'Fournisseur - EDF', type: TypeCompte.PASSIF, niveau: 3, solde: 890.00, soldeN1: 750.00, mouvementDebit: 5900.00, mouvementCredit: 6040.00 },
                    { id: '40103', numero: '40103', libelle: 'Fournisseur - Nettoyage Pro', type: TypeCompte.PASSIF, niveau: 3, solde: 650.00, soldeN1: 600.00, mouvementDebit: 4750.00, mouvementCredit: 4800.00 },
                    { id: '40104', numero: '40104', libelle: 'Fournisseur - ProtectAssur', type: TypeCompte.PASSIF, niveau: 3, solde: 0, soldeN1: 0, mouvementDebit: 8500.00, mouvementCredit: 8500.00 },
                    { id: '40105', numero: '40105', libelle: 'Fournisseur - Ascenseurs Otis', type: TypeCompte.PASSIF, niveau: 3, solde: 1200.00, soldeN1: 1000.00, mouvementDebit: 5800.00, mouvementCredit: 6000.00 },
                    { id: '40106', numero: '40106', libelle: 'Fournisseur - Paysagiste Expert', type: TypeCompte.PASSIF, niveau: 3, solde: 450.00, soldeN1: 400.00, mouvementDebit: 2350.00, mouvementCredit: 2400.00 },
                    { id: '40107', numero: '40107', libelle: 'Fournisseur - Syndic Pro', type: TypeCompte.PASSIF, niveau: 3, solde: 410.00, soldeN1: 350.00, mouvementDebit: 1850.00, mouvementCredit: 1910.00 },
                ]
            },
            // 45x - Copropriétaires (débiteurs = créances sur eux)
            {
                id: '45', numero: '45', libelle: 'Copropriétaires', type: TypeCompte.ACTIF, niveau: 2, solde: 3600.00,
                soldeN1: 3000.00, mouvementDebit: 42850.00, mouvementCredit: 42250.00,
                sousComptes: [
                    { id: '45001', numero: '45001', libelle: 'Copropriétaire - Marie LEBLANC', type: TypeCompte.ACTIF, niveau: 3, solde: 0, soldeN1: 0, mouvementDebit: 5625.00, mouvementCredit: 5625.00 },
                    { id: '45002', numero: '45002', libelle: 'Copropriétaire - Pierre MOREAU', type: TypeCompte.ACTIF, niveau: 3, solde: 850.00, soldeN1: 500.00, mouvementDebit: 4500.00, mouvementCredit: 4150.00 },
                    { id: '45003', numero: '45003', libelle: 'Copropriétaire - Sophie LAURENT', type: TypeCompte.ACTIF, niveau: 3, solde: 0, soldeN1: 200.00, mouvementDebit: 6750.00, mouvementCredit: 6950.00 },
                    { id: '45004', numero: '45004', libelle: 'Copropriétaire - Jean MARTIN', type: TypeCompte.ACTIF, niveau: 3, solde: 1250.00, soldeN1: 1000.00, mouvementDebit: 5625.00, mouvementCredit: 5375.00 },
                    { id: '45005', numero: '45005', libelle: 'Copropriétaire - Isabelle DUBOIS', type: TypeCompte.ACTIF, niveau: 3, solde: 500.00, soldeN1: 300.00, mouvementDebit: 4500.00, mouvementCredit: 4300.00 },
                    { id: '45006', numero: '45006', libelle: 'Copropriétaire - Claude BERNARD', type: TypeCompte.ACTIF, niveau: 3, solde: 0, soldeN1: 0, mouvementDebit: 6750.00, mouvementCredit: 6750.00 },
                    { id: '45007', numero: '45007', libelle: 'Copropriétaire - Anne ROUSSEAU', type: TypeCompte.ACTIF, niveau: 3, solde: 750.00, soldeN1: 600.00, mouvementDebit: 5625.00, mouvementCredit: 5475.00 },
                    { id: '45008', numero: '45008', libelle: 'Copropriétaire - Marc PETIT', type: TypeCompte.ACTIF, niveau: 3, solde: 250.00, soldeN1: 400.00, mouvementDebit: 3475.00, mouvementCredit: 3625.00 },
                ]
            },
        ]
    },
    // CLASSE 5 - COMPTES FINANCIERS (ACTIF)
    {
        id: '5', numero: '5', libelle: 'Comptes financiers', type: TypeCompte.ACTIF, niveau: 1, solde: 20100.00,
        soldeN1: 18700.00, mouvementDebit: 45200.00, mouvementCredit: 43800.00,
        sousComptes: [
            {
                id: '512', numero: '512', libelle: 'Banque', type: TypeCompte.ACTIF, niveau: 2, solde: 19850.00,
                soldeN1: 18500.00, mouvementDebit: 44700.00, mouvementCredit: 43350.00,
                sousComptes: [
                    { id: '51201', numero: '51201', libelle: 'Banque - Compte courant', type: TypeCompte.ACTIF, niveau: 3, solde: 12350.00, soldeN1: 11500.00, mouvementDebit: 44700.00, mouvementCredit: 43850.00 },
                    { id: '51202', numero: '51202', libelle: 'Banque - Livret', type: TypeCompte.ACTIF, niveau: 3, solde: 7500.00, soldeN1: 7000.00, mouvementDebit: 500.00, mouvementCredit: 0 },
                ]
            },
            { id: '531', numero: '531', libelle: 'Caisse', type: TypeCompte.ACTIF, niveau: 2, solde: 250.00, soldeN1: 200.00, mouvementDebit: 500.00, mouvementCredit: 450.00 },
        ]
    },
    // CLASSE 6 - COMPTES DE CHARGES
    {
        id: '6', numero: '6', libelle: 'Comptes de charges', type: TypeCompte.CHARGE, niveau: 1, solde: 42850.00,
        soldeN1: 40200.00, mouvementDebit: 42850.00, mouvementCredit: 0,
        sousComptes: [
            {
                id: '60', numero: '60', libelle: 'Achats', type: TypeCompte.CHARGE, niveau: 2, solde: 18500.00,
                soldeN1: 17200.00, mouvementDebit: 18500.00, mouvementCredit: 0,
                sousComptes: [
                    { id: '60101', numero: '60101', libelle: 'Eau', type: TypeCompte.CHARGE, niveau: 3, solde: 10500.00, soldeN1: 9800.00, mouvementDebit: 10500.00, mouvementCredit: 0 },
                    { id: '60102', numero: '60102', libelle: 'Électricité parties communes', type: TypeCompte.CHARGE, niveau: 3, solde: 6740.00, soldeN1: 6200.00, mouvementDebit: 6740.00, mouvementCredit: 0 },
                    { id: '60103', numero: '60103', libelle: 'Chauffage collectif', type: TypeCompte.CHARGE, niveau: 3, solde: 0, soldeN1: 0, mouvementDebit: 0, mouvementCredit: 0 },
                    { id: '60104', numero: '60104', libelle: 'Fournitures diverses', type: TypeCompte.CHARGE, niveau: 3, solde: 1260.00, soldeN1: 1200.00, mouvementDebit: 1260.00, mouvementCredit: 0 },
                ]
            },
            {
                id: '61', numero: '61', libelle: 'Services extérieurs', type: TypeCompte.CHARGE, niveau: 2, solde: 8750.00,
                soldeN1: 8200.00, mouvementDebit: 8750.00, mouvementCredit: 0,
                sousComptes: [
                    { id: '61101', numero: '61101', libelle: 'Nettoyage parties communes', type: TypeCompte.CHARGE, niveau: 3, solde: 4800.00, soldeN1: 4500.00, mouvementDebit: 4800.00, mouvementCredit: 0 },
                    { id: '61102', numero: '61102', libelle: 'Entretien espaces verts', type: TypeCompte.CHARGE, niveau: 3, solde: 2450.00, soldeN1: 2300.00, mouvementDebit: 2450.00, mouvementCredit: 0 },
                    { id: '61103', numero: '61103', libelle: 'Entretien ascenseurs', type: TypeCompte.CHARGE, niveau: 3, solde: 1500.00, soldeN1: 1400.00, mouvementDebit: 1500.00, mouvementCredit: 0 },
                ]
            },
            {
                id: '62', numero: '62', libelle: 'Autres services extérieurs', type: TypeCompte.CHARGE, niveau: 2, solde: 7100.00,
                soldeN1: 6800.00, mouvementDebit: 7100.00, mouvementCredit: 0,
                sousComptes: [
                    { id: '62201', numero: '62201', libelle: 'Honoraires syndic', type: TypeCompte.CHARGE, niveau: 3, solde: 4200.00, soldeN1: 4000.00, mouvementDebit: 4200.00, mouvementCredit: 0 },
                    { id: '62202', numero: '62202', libelle: 'Frais AG', type: TypeCompte.CHARGE, niveau: 3, solde: 650.00, soldeN1: 600.00, mouvementDebit: 650.00, mouvementCredit: 0 },
                    { id: '62203', numero: '62203', libelle: 'Frais postaux', type: TypeCompte.CHARGE, niveau: 3, solde: 350.00, soldeN1: 400.00, mouvementDebit: 350.00, mouvementCredit: 0 },
                    { id: '62204', numero: '62204', libelle: 'Frais bancaires', type: TypeCompte.CHARGE, niveau: 3, solde: 150.00, soldeN1: 150.00, mouvementDebit: 150.00, mouvementCredit: 0 },
                    { id: '62205', numero: '62205', libelle: 'Honoraires avocat/huissier', type: TypeCompte.CHARGE, niveau: 3, solde: 1750.00, soldeN1: 1650.00, mouvementDebit: 1750.00, mouvementCredit: 0 },
                ]
            },
            {
                id: '63', numero: '63', libelle: 'Impôts et taxes', type: TypeCompte.CHARGE, niveau: 2, solde: 0,
                soldeN1: 0, mouvementDebit: 0, mouvementCredit: 0,
                sousComptes: [
                    { id: '63501', numero: '63501', libelle: 'Taxe foncière', type: TypeCompte.CHARGE, niveau: 3, solde: 0, soldeN1: 0, mouvementDebit: 0, mouvementCredit: 0 },
                ]
            },
            {
                id: '61600', numero: '616', libelle: 'Primes d\'assurance', type: TypeCompte.CHARGE, niveau: 2, solde: 8500.00,
                soldeN1: 8000.00, mouvementDebit: 8500.00, mouvementCredit: 0,
            },
        ]
    },
    // CLASSE 7 - COMPTES DE PRODUITS
    {
        id: '7', numero: '7', libelle: 'Comptes de produits', type: TypeCompte.PRODUIT, niveau: 1, solde: 42850.00,
        soldeN1: 40200.00, mouvementDebit: 0, mouvementCredit: 42850.00,
        sousComptes: [
            {
                id: '70', numero: '70', libelle: 'Appels de fonds', type: TypeCompte.PRODUIT, niveau: 2, solde: 41350.00,
                soldeN1: 38700.00, mouvementDebit: 0, mouvementCredit: 41350.00,
                sousComptes: [
                    { id: '70101', numero: '70101', libelle: 'Appels budget prévisionnel', type: TypeCompte.PRODUIT, niveau: 3, solde: 36000.00, soldeN1: 34000.00, mouvementDebit: 0, mouvementCredit: 36000.00 },
                    { id: '70102', numero: '70102', libelle: 'Appels travaux', type: TypeCompte.PRODUIT, niveau: 3, solde: 5350.00, soldeN1: 4700.00, mouvementDebit: 0, mouvementCredit: 5350.00 },
                ]
            },
            {
                id: '71', numero: '71', libelle: 'Produits annexes', type: TypeCompte.PRODUIT, niveau: 2, solde: 1500.00,
                soldeN1: 1500.00, mouvementDebit: 0, mouvementCredit: 1500.00,
                sousComptes: [
                    { id: '71301', numero: '71301', libelle: 'Location parties communes', type: TypeCompte.PRODUIT, niveau: 3, solde: 1200.00, soldeN1: 1200.00, mouvementDebit: 0, mouvementCredit: 1200.00 },
                    { id: '71302', numero: '71302', libelle: 'Produits divers', type: TypeCompte.PRODUIT, niveau: 3, solde: 300.00, soldeN1: 300.00, mouvementDebit: 0, mouvementCredit: 300.00 },
                ]
            },
        ]
    },
];

export const MOCK_EXERCICE_ACTUEL: Exercice = {
    id: '2024',
    annee: '2024',
    dateDebut: '2024-01-01',
    dateFin: '2024-12-31',
    statut: 'EN_COURS'
};

// Taux de TVA applicables en France
export type TauxTVA = 20 | 10 | 5.5 | 2.1 | 0;

// Étendu avec un champ "poste" pour lier aux postes budgétaires
export interface DepenseEtendue extends Depense {
    poste?: 'eau' | 'electricite' | 'assurance' | 'menage' | 'ascenseur' | 'espaces_verts' | 'divers';
    // Détail TVA
    montantHT?: number;
    tauxTVA?: TauxTVA;
    montantTVA?: number;
    tvaDeductible?: boolean; // Si la TVA est déductible pour la copropriété
    // Pièce justificative (legacy: string pour compatibilité, nouveau: objet structuré)
    pieceJointe?: string;
    pieceJointeDetails?: {
        id: string;
        type: 'FACTURE' | 'AVOIR' | 'NOTE_CREDIT' | 'AUTRE';
        factureId?: string;
        fichierUrl?: string;
        fichierNom: string;
        dateAjout: string;
        reference?: string;
        montant?: number;
    };
    // Champs de validation
    statut?: 'BROUILLON' | 'EN_ATTENTE_VALIDATION' | 'VALIDEE' | 'REJETEE';
    budgetId?: string;
    dateValidation?: string;
    validateurId?: string;
    commentaireRejet?: string;
    dateCreation?: string;
    dateDerniereModification?: string;
}

export const MOCK_DEPENSES: Depense[] = [
    { id: '1', date: '2024-02-14', libelle: 'Facture gaz', fournisseur: 'Engie', montant: 245.50, compteId: '602002', recuperable: 245.50, deductible: 0 },
    { id: '2', date: '2024-05-18', libelle: 'Fournitures nettoyage', fournisseur: 'ProClean', montant: 189.75, compteId: '604', recuperable: 189.75, deductible: 0 },
    { id: '3', date: '2024-04-22', libelle: 'Nettoyage parties communes', fournisseur: 'Nettoyage Pro', montant: 320.00, compteId: '611', recuperable: 320.00, deductible: 0 },
    { id: '4', date: '2024-03-11', libelle: 'Entretien espaces verts', fournisseur: 'Paysagiste Expert', montant: 450.00, compteId: '614003', recuperable: 450.00, deductible: 0 },
    { id: '5', date: '2024-10-08', libelle: 'Prime assurance', fournisseur: 'ProtectAssur', montant: 1850.00, compteId: '616', recuperable: 0, deductible: 1850.00 },
    { id: '6', date: '2024-09-15', libelle: 'Recettes publicité', fournisseur: 'PubCity', montant: -280.00, compteId: '714', recuperable: 0, deductible: 0 }
];

// Dépenses étendues avec liaison aux postes budgétaires et détail TVA
// TVA applicable: Eau/Énergie 5.5%, Assurance 0%, Services 20%, Maintenance immeubles 10%
export const MOCK_DEPENSES_BUDGETS: DepenseEtendue[] = [
    // EAU - TVA 5.5%
    { id: 'd1', date: '2024-01-15', libelle: 'Facture eau T1', fournisseur: 'Veolia Eau', montant: 2800, montantHT: 2654.03, tauxTVA: 5.5, montantTVA: 145.97, tvaDeductible: false, compteId: '602001', recuperable: 2800, deductible: 0, poste: 'eau', pieceJointe: 'facture_eau_t1.pdf', statut: 'VALIDEE', dateValidation: '2024-01-16' },
    { id: 'd2', date: '2024-04-18', libelle: 'Facture eau T2', fournisseur: 'Veolia Eau', montant: 2650, montantHT: 2511.85, tauxTVA: 5.5, montantTVA: 138.15, tvaDeductible: false, compteId: '602001', recuperable: 2650, deductible: 0, poste: 'eau', pieceJointe: 'facture_eau_t2.pdf', statut: 'VALIDEE', dateValidation: '2024-04-19' },
    { id: 'd3', date: '2024-07-20', libelle: 'Facture eau T3', fournisseur: 'Veolia Eau', montant: 2550, montantHT: 2417.06, tauxTVA: 5.5, montantTVA: 132.94, tvaDeductible: false, compteId: '602001', recuperable: 2550, deductible: 0, poste: 'eau', pieceJointe: 'facture_eau_t3.pdf', statut: 'VALIDEE', dateValidation: '2024-07-21' },
    { id: 'd4', date: '2024-10-15', libelle: 'Facture eau T4', fournisseur: 'Veolia Eau', montant: 2500, montantHT: 2369.67, tauxTVA: 5.5, montantTVA: 130.33, tvaDeductible: false, compteId: '602001', recuperable: 2500, deductible: 0, poste: 'eau', pieceJointe: 'facture_eau_t4.pdf', statut: 'EN_ATTENTE_VALIDATION' },

    // ÉLECTRICITÉ - TVA 5.5%
    { id: 'd5', date: '2024-01-28', libelle: 'Facture électricité janvier', fournisseur: 'EDF', montant: 680, montantHT: 644.55, tauxTVA: 5.5, montantTVA: 35.45, tvaDeductible: false, compteId: '602002', recuperable: 680, deductible: 0, poste: 'electricite', pieceJointe: 'facture_edf_jan.pdf' },
    { id: 'd6', date: '2024-02-28', libelle: 'Facture électricité février', fournisseur: 'EDF', montant: 710, montantHT: 672.99, tauxTVA: 5.5, montantTVA: 37.01, tvaDeductible: false, compteId: '602002', recuperable: 710, deductible: 0, poste: 'electricite', pieceJointe: 'facture_edf_fev.pdf' },
    { id: 'd7', date: '2024-03-28', libelle: 'Facture électricité mars', fournisseur: 'EDF', montant: 650, montantHT: 616.11, tauxTVA: 5.5, montantTVA: 33.89, tvaDeductible: false, compteId: '602002', recuperable: 650, deductible: 0, poste: 'electricite', pieceJointe: 'facture_edf_mar.pdf' },
    { id: 'd8', date: '2024-04-28', libelle: 'Facture électricité avril', fournisseur: 'EDF', montant: 620, montantHT: 587.68, tauxTVA: 5.5, montantTVA: 32.32, tvaDeductible: false, compteId: '602002', recuperable: 620, deductible: 0, poste: 'electricite' },
    { id: 'd9', date: '2024-05-28', libelle: 'Facture électricité mai', fournisseur: 'EDF', montant: 580, montantHT: 549.76, tauxTVA: 5.5, montantTVA: 30.24, tvaDeductible: false, compteId: '602002', recuperable: 580, deductible: 0, poste: 'electricite' },
    { id: 'd10', date: '2024-06-28', libelle: 'Facture électricité juin', fournisseur: 'EDF', montant: 550, montantHT: 521.33, tauxTVA: 5.5, montantTVA: 28.67, tvaDeductible: false, compteId: '602002', recuperable: 550, deductible: 0, poste: 'electricite' },
    { id: 'd11', date: '2024-07-28', libelle: 'Facture électricité juillet', fournisseur: 'EDF', montant: 520, montantHT: 492.89, tauxTVA: 5.5, montantTVA: 27.11, tvaDeductible: false, compteId: '602002', recuperable: 520, deductible: 0, poste: 'electricite' },
    { id: 'd12', date: '2024-08-28', libelle: 'Facture électricité août', fournisseur: 'EDF', montant: 530, montantHT: 502.37, tauxTVA: 5.5, montantTVA: 27.63, tvaDeductible: false, compteId: '602002', recuperable: 530, deductible: 0, poste: 'electricite' },
    { id: 'd13', date: '2024-09-28', libelle: 'Facture électricité septembre', fournisseur: 'EDF', montant: 590, montantHT: 559.24, tauxTVA: 5.5, montantTVA: 30.76, tvaDeductible: false, compteId: '602002', recuperable: 590, deductible: 0, poste: 'electricite' },
    { id: 'd14', date: '2024-10-28', libelle: 'Facture électricité octobre', fournisseur: 'EDF', montant: 640, montantHT: 606.64, tauxTVA: 5.5, montantTVA: 33.36, tvaDeductible: false, compteId: '602002', recuperable: 640, deductible: 0, poste: 'electricite' },
    { id: 'd15', date: '2024-11-28', libelle: 'Facture électricité novembre', fournisseur: 'EDF', montant: 670, montantHT: 635.07, tauxTVA: 5.5, montantTVA: 34.93, tvaDeductible: false, compteId: '602002', recuperable: 670, deductible: 0, poste: 'electricite' },

    // ASSURANCE - Exonérée de TVA (0%)
    { id: 'd16', date: '2024-01-05', libelle: 'Prime assurance annuelle', fournisseur: 'ProtectAssur', montant: 18500, montantHT: 18500, tauxTVA: 0, montantTVA: 0, tvaDeductible: false, compteId: '616', recuperable: 0, deductible: 18500, poste: 'assurance', pieceJointe: 'assurance_2024.pdf' },

    // MÉNAGE - TVA 20%
    { id: 'd17', date: '2024-01-30', libelle: 'Ménage janvier', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd18', date: '2024-02-28', libelle: 'Ménage février', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd19', date: '2024-03-30', libelle: 'Ménage mars', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd20', date: '2024-04-30', libelle: 'Ménage avril', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd21', date: '2024-05-30', libelle: 'Ménage mai', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd22', date: '2024-06-30', libelle: 'Ménage juin', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd23', date: '2024-07-30', libelle: 'Ménage juillet', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd24', date: '2024-08-30', libelle: 'Ménage août', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd25', date: '2024-09-30', libelle: 'Ménage septembre', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },
    { id: 'd26', date: '2024-10-30', libelle: 'Ménage octobre', fournisseur: 'Nettoyage Pro', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614001', recuperable: 1200, deductible: 0, poste: 'menage' },

    // ASCENSEUR - TVA 10% (travaux sur immeubles > 2 ans)
    { id: 'd27', date: '2024-01-15', libelle: 'Maintenance ascenseur T1', fournisseur: 'Schindler', montant: 2450, montantHT: 2227.27, tauxTVA: 10, montantTVA: 222.73, tvaDeductible: false, compteId: '615001', recuperable: 2450, deductible: 0, poste: 'ascenseur', pieceJointe: 'maint_ascenseur_t1.pdf' },
    { id: 'd28', date: '2024-04-15', libelle: 'Maintenance ascenseur T2', fournisseur: 'Schindler', montant: 2450, montantHT: 2227.27, tauxTVA: 10, montantTVA: 222.73, tvaDeductible: false, compteId: '615001', recuperable: 2450, deductible: 0, poste: 'ascenseur', pieceJointe: 'maint_ascenseur_t2.pdf' },
    { id: 'd29', date: '2024-07-15', libelle: 'Maintenance ascenseur T3', fournisseur: 'Schindler', montant: 2450, montantHT: 2227.27, tauxTVA: 10, montantTVA: 222.73, tvaDeductible: false, compteId: '615001', recuperable: 2450, deductible: 0, poste: 'ascenseur', pieceJointe: 'maint_ascenseur_t3.pdf' },
    { id: 'd30', date: '2024-10-15', libelle: 'Maintenance ascenseur T4', fournisseur: 'Schindler', montant: 2450, montantHT: 2227.27, tauxTVA: 10, montantTVA: 222.73, tvaDeductible: false, compteId: '615001', recuperable: 2450, deductible: 0, poste: 'ascenseur', pieceJointe: 'maint_ascenseur_t4.pdf' },

    // ESPACES VERTS - TVA 20%
    { id: 'd31', date: '2024-03-11', libelle: 'Entretien espaces verts mars', fournisseur: 'Paysagiste Expert', montant: 1200, montantHT: 1000.00, tauxTVA: 20, montantTVA: 200.00, tvaDeductible: false, compteId: '614003', recuperable: 1200, deductible: 0, poste: 'espaces_verts', pieceJointe: 'paysage_mars.pdf' },
    { id: 'd32', date: '2024-04-15', libelle: 'Entretien espaces verts avril', fournisseur: 'Paysagiste Expert', montant: 1350, montantHT: 1125.00, tauxTVA: 20, montantTVA: 225.00, tvaDeductible: false, compteId: '614003', recuperable: 1350, deductible: 0, poste: 'espaces_verts' },
    { id: 'd33', date: '2024-05-12', libelle: 'Entretien espaces verts mai', fournisseur: 'Paysagiste Expert', montant: 1450, montantHT: 1208.33, tauxTVA: 20, montantTVA: 241.67, tvaDeductible: false, compteId: '614003', recuperable: 1450, deductible: 0, poste: 'espaces_verts' },
    { id: 'd34', date: '2024-06-10', libelle: 'Entretien espaces verts juin', fournisseur: 'Paysagiste Expert', montant: 1500, montantHT: 1250.00, tauxTVA: 20, montantTVA: 250.00, tvaDeductible: false, compteId: '614003', recuperable: 1500, deductible: 0, poste: 'espaces_verts' },
    { id: 'd35', date: '2024-07-08', libelle: 'Entretien espaces verts juillet', fournisseur: 'Paysagiste Expert', montant: 1600, montantHT: 1333.33, tauxTVA: 20, montantTVA: 266.67, tvaDeductible: false, compteId: '614003', recuperable: 1600, deductible: 0, poste: 'espaces_verts' },
    { id: 'd36', date: '2024-08-12', libelle: 'Entretien espaces verts août', fournisseur: 'Paysagiste Expert', montant: 1550, montantHT: 1291.67, tauxTVA: 20, montantTVA: 258.33, tvaDeductible: false, compteId: '614003', recuperable: 1550, deductible: 0, poste: 'espaces_verts' },
    { id: 'd37', date: '2024-09-09', libelle: 'Entretien espaces verts septembre', fournisseur: 'Paysagiste Expert', montant: 1400, montantHT: 1166.67, tauxTVA: 20, montantTVA: 233.33, tvaDeductible: false, compteId: '614003', recuperable: 1400, deductible: 0, poste: 'espaces_verts' },

    // DIVERS - TVA variable
    { id: 'd38', date: '2024-02-20', libelle: 'Réparation portail', fournisseur: 'TechElec Services', montant: 1200, montantHT: 1090.91, tauxTVA: 10, montantTVA: 109.09, tvaDeductible: false, compteId: '615002', recuperable: 1200, deductible: 0, poste: 'divers', pieceJointe: 'reparation_portail.pdf' },
    { id: 'd39', date: '2024-05-15', libelle: 'Achat matériel divers', fournisseur: 'Bricorama', montant: 850, montantHT: 708.33, tauxTVA: 20, montantTVA: 141.67, tvaDeductible: false, compteId: '606', recuperable: 850, deductible: 0, poste: 'divers' },
    { id: 'd40', date: '2024-08-22', libelle: 'Entretien chaufferie', fournisseur: 'Chauffage Expert', montant: 1450, montantHT: 1318.18, tauxTVA: 10, montantTVA: 131.82, tvaDeductible: false, compteId: '615003', recuperable: 1450, deductible: 0, poste: 'divers' },
    { id: 'd41', date: '2024-10-05', libelle: 'Réparation interphone', fournisseur: 'TechElec Services', montant: 750, montantHT: 681.82, tauxTVA: 10, montantTVA: 68.18, tvaDeductible: false, compteId: '615002', recuperable: 750, deductible: 0, poste: 'divers' },
    { id: 'd42', date: '2024-11-10', libelle: 'Fournitures administratives', fournisseur: 'Office Depot', montant: 350, montantHT: 291.67, tauxTVA: 20, montantTVA: 58.33, tvaDeductible: false, compteId: '606', recuperable: 350, deductible: 0, poste: 'divers' },
    { id: 'd43', date: '2024-11-18', libelle: 'Courriers recommandés', fournisseur: 'La Poste', montant: 400, montantHT: 333.33, tauxTVA: 20, montantTVA: 66.67, tvaDeductible: false, compteId: '626', recuperable: 400, deductible: 0, poste: 'divers' }
];

export const MOCK_APPELS_FONDS: AppelFonds[] = [
    { id: '1', dateExigibilite: '2024-01-15', statut: 'ENVOYE', montant: 1850.00, periode: 'T1 2024' },
    { id: '2', dateExigibilite: '2024-04-15', statut: 'ENVOYE', montant: 1850.00, periode: 'T2 2024' },
    { id: '3', dateExigibilite: '2024-07-15', statut: 'ENVOYE', montant: 1850.00, periode: 'T3 2024' },
    { id: '4', dateExigibilite: '2024-10-15', statut: 'ENVOYE', montant: 1850.00, periode: 'T4 2024' }
];

export const MOCK_BUDGETS: Budget[] = [
    { id: '1', annee: 2024, poste: 'Eau', montantN1: 1250, montantN: 1380, montantN1_Prev: 1450 },
    { id: '2', annee: 2024, poste: 'Electricité', montantN1: 680, montantN: 720, montantN1_Prev: 750 },
    { id: '3', annee: 2024, poste: 'Assurance', montantN1: 1850, montantN: 1920, montantN1_Prev: 2000 },
    { id: '4', annee: 2024, poste: 'Entretien', montantN1: 2800, montantN: 2950, montantN1_Prev: 3100 },
    { id: '5', annee: 2024, poste: 'Honoraires Syndic', montantN1: 0, montantN: 0, montantN1_Prev: 0 }
];

export const MOCK_MOUVEMENTS_BANCAIRES: MouvementBancaire[] = [
    { id: '1', date: '2024-10-28', libelle: 'PRLV Engie', montant: -245.50, statut: 'A_CATEGORISER' },
    { id: '2', date: '2024-10-27', libelle: 'CHQ 456789', montant: -189.75, statut: 'A_CATEGORISER' },
    { id: '3', date: '2024-10-22', libelle: 'VIR M LEBLANC CHARGES T4', montant: 520.00, statut: 'A_CATEGORISER' }
];

export const MOCK_BUDGETS_TRAVAUX: BudgetTravaux[] = [
    { id: '1', nom: 'Isolation Thermique', description: 'Isolation des combles et murs extérieurs', montantVote: 28000, montantRealise: 12000, cleRepartitionId: '1', statut: 'EN_COURS' },
    { id: '2', nom: 'Rénovation Éclairage', description: 'Remplacement des éclairages par LED', montantVote: 5500, montantRealise: 0, cleRepartitionId: '1', statut: 'A_VENIR' }
];

export const MOCK_FACTURES: Facture[] = [
    { id: '1', date: '2024-10-22', fournisseur: 'Engie', montant: 245.50, statut: 'A_PAYER', iban: 'FR76 2000 4000 5000 6000 7000 900', bic: 'ENGIFRPP', reference: 'FACT-2024-10-ENGIE' },
    { id: '2', date: '2024-10-18', fournisseur: 'ProClean', montant: 189.75, statut: 'A_PAYER', iban: 'FR76 2345 6789 0123 4567 8901 234', bic: 'PROCFRPP', reference: 'FACT-2024-10-PROCLEAN' },
    { id: '3', date: '2024-10-12', fournisseur: 'Nettoyage Pro', montant: 320.00, statut: 'PAYEE' }
];

export const MOCK_INTERVENTIONS: Intervention[] = [
    { id: '1', date: '2024-10-08', titre: 'Réparation interphone', description: 'Remplacement du système d\'interphone défaillant', intervenant: 'TechElec Services', statut: 'TERMINEE', type: 'REPARATION' },
    { id: '2', date: '2024-11-02', titre: 'Inspection sécurité', description: 'Contrôle annuel des équipements de sécurité', intervenant: 'SecurMax', statut: 'PLANIFIEE', type: 'ENTRETIEN' },
    { id: '3', date: '2024-09-20', titre: 'Réparation chaudière', description: 'Dépannage chaudière collective en panne', intervenant: 'Chauffage Expert', statut: 'TERMINEE', type: 'REPARATION' }
];

export const MOCK_CONTRATS: Contrat[] = [
    { id: '1', nom: 'Assurance Habitation Collective', fournisseur: 'ProtectAssur', type: 'ASSURANCE', dateDebut: '2024-01-01', dateFin: '2024-12-31', coutAnnuel: 3200, statut: 'ACTIF' },
    { id: '2', nom: 'Maintenance Ascenseur', fournisseur: 'Schindler', type: 'MAINTENANCE', dateDebut: '2024-01-01', dateFin: '2024-12-31', coutAnnuel: 2400, statut: 'ACTIF' },
    { id: '3', nom: 'Entretien Espaces Verts', fournisseur: 'Paysagiste Expert', type: 'MAINTENANCE', dateDebut: '2023-01-01', dateFin: '2023-12-31', coutAnnuel: 1800, statut: 'A_RENOUVELER' }
];

export const MOCK_FOURNISSEURS: Fournisseur[] = [
    { id: '1', nom: 'TechElec Services', metier: 'Électricien', telephone: '04 72 11 22 33', email: 'contact@techelec.fr', adresse: '15 boulevard de la République, 69002 Lyon', note: 4.8 },
    { id: '2', nom: 'SecurMax', metier: 'Sécurité Incendie', telephone: '04 78 99 88 77', email: 'info@securmax.fr', adresse: '28 rue de la Sécurité, 69006 Lyon', note: 4.9 },
    { id: '3', nom: 'Chauffage Expert', metier: 'Plombier', telephone: '06 45 67 89 01', email: 'devis@chauffage-expert.fr', adresse: '42 avenue du Chauffage, 69100 Villeurbanne', note: 4.6 },
    { id: '4', nom: 'Schindler', metier: 'Ascensoriste', telephone: '0800 234 567', email: 'service@schindler.fr', adresse: 'Lyon', note: 4.5 },
    { id: '5', nom: 'ProtectAssur', metier: 'Assureur', telephone: '04 26 33 44 55', email: 'sinistre@protectassur.fr', adresse: 'Lyon', note: 4.1 },
    { id: '6', nom: 'Paysagiste Expert', metier: 'Paysagiste', telephone: '04 78 55 66 77', email: 'contact@paysagiste-expert.fr', adresse: '33 chemin des Jardiniers, 69005 Lyon', note: 4.7 }
];

export const MOCK_EMAIL_TEMPLATES_OS: EmailTemplateOS[] = [
    {
        id: 'template-classique',
        type: 'CLASSIQUE',
        nom: 'Template Classique',
        objet: 'Ordre de service - {{titre}}',
        corps: `Bonjour,

En qualité de syndic de la copropriété située au 50 Route La Carrière au Loup, 75002 Paris, nous vous remercions de bien vouloir intervenir pour la demande suivante :

{{description}}

Facturation :
À l'ordre de : SDC – 50 Route La Carrière au Loup
Adresse : 50 Route La Carrière au Loup, 75002 Paris
Taux de TVA applicable : 10 %
Si le montant de la prestation dépasse 300 €, merci d'établir un devis préalable.

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
        variablesDisponibles: ['{{titre}}', '{{description}}', '{{fournisseur}}']
    },
    {
        id: 'template-contractuel',
        type: 'CONTRACTUEL',
        nom: 'Template Contractuel',
        objet: 'Ordre de service contractuel - {{titre}}',
        corps: `Bonjour,

En qualité de syndic de la copropriété située au 50 Route La Carrière au Loup, 75002 Paris, et conformément au contrat en cours avec votre entreprise, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Demande :
{{description}}

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
        variablesDisponibles: ['{{titre}}', '{{description}}', '{{contrat}}']
    }
];

export const MOCK_ORDRES_SERVICE: OrdreService[] = [
    {
        id: '1',
        date: '2024-10-30',
        dateCreation: '2024-10-30T09:15:00',
        dateModification: '2024-10-30T14:22:00',
        titre: 'Réparation portail automatique',
        description: 'Le portail automatique est bloqué en position ouverte depuis hier. Nécessite intervention rapide pour des raisons de sécurité.',
        typeOrdre: 'CLASSIQUE',
        fournisseurId: '1',
        fournisseurNom: 'TechElec Services',
        fournisseurEmail: 'contact@techelec.fr',
        fournisseurTelephone: '04 72 11 22 33',
        statut: 'EN_ATTENTE_PRESTATAIRE',
        dateEnvoi: '2024-10-30T14:22:00',
        emailObjet: 'Ordre de service - Réparation portail automatique',
        emailCorps: `Bonjour,

En qualité de syndic de la copropriété située au 50 Route La Carrière au Loup, 75002 Paris, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Le portail automatique est bloqué en position ouverte depuis hier. Nécessite intervention rapide pour des raisons de sécurité.

Facturation :
À l'ordre de : SDC – 50 Route La Carrière au Loup
Adresse : 50 Route La Carrière au Loup, 75002 Paris
Taux de TVA applicable : 10 %
Si le montant de la prestation dépasse 300 €, merci d'établir un devis préalable.

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
        piecesJointes: [
            {
                id: 'pj1',
                nom: 'photo-portail.jpg',
                type: 'IMAGE',
                taille: '2.4 Mo',
                url: '#',
                dateAjout: '2024-10-30T09:20:00'
            }
        ],
        montantEstime: 280,
        devisRequis: false,
        historique: [
            {
                id: 'h1',
                date: '2024-10-30T09:15:00',
                auteur: 'Syndic Admin',
                action: 'Création de l\'ordre de service'
            },
            {
                id: 'h2',
                date: '2024-10-30T14:22:00',
                auteur: 'Syndic Admin',
                action: 'Envoi de l\'ordre de service',
                champModifie: 'statut',
                ancienneValeur: 'BROUILLON',
                nouvelleValeur: 'EN_ATTENTE_PRESTATAIRE'
            }
        ]
    },
    {
        id: '2',
        date: '2024-10-25',
        dateCreation: '2024-10-25T11:30:00',
        dateModification: '2024-10-25T11:30:00',
        titre: 'Maintenance ascenseur trimestrielle',
        description: 'Maintenance trimestrielle prévue au contrat - Contrôle technique complet et graissage des câbles',
        typeOrdre: 'CONTRACTUEL',
        fournisseurId: '4',
        fournisseurNom: 'Schindler',
        fournisseurEmail: 'service@schindler.fr',
        fournisseurTelephone: '0800 234 567',
        contratId: '2',
        contratNom: 'Maintenance Ascenseur',
        statut: 'BROUILLON',
        emailObjet: 'Ordre de service contractuel - Maintenance ascenseur trimestrielle',
        emailCorps: `Bonjour,

En qualité de syndic de la copropriété située au 50 Route La Carrière au Loup, 75002 Paris, et conformément au contrat en cours avec votre entreprise, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Demande :
Maintenance trimestrielle prévue au contrat - Contrôle technique complet et graissage des câbles

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
        piecesJointes: [],
        historique: [
            {
                id: 'h1',
                date: '2024-10-25T11:30:00',
                auteur: 'Syndic Admin',
                action: 'Création de l\'ordre de service'
            }
        ]
    },
    {
        id: '3',
        date: '2024-11-01',
        dateCreation: '2024-11-01T10:00:00',
        dateModification: '2024-11-05T16:30:00',
        titre: 'Dépannage fuite d\'eau parking',
        description: 'Fuite importante détectée au niveau du parking souterrain. Intervention urgente requise.',
        typeOrdre: 'CLASSIQUE',
        fournisseurId: '3',
        fournisseurNom: 'Chauffage Expert',
        fournisseurEmail: 'devis@chauffage-expert.fr',
        fournisseurTelephone: '06 45 67 89 01',
        statut: 'INTERVENTION_REALISEE',
        dateEnvoi: '2024-11-01T10:30:00',
        dateInterventionProgrammee: '2024-11-02T14:00:00',
        dateInterventionRealisee: '2024-11-02T16:45:00',
        emailObjet: 'Ordre de service urgent - Dépannage fuite d\'eau parking',
        emailCorps: `Bonjour,

En qualité de syndic de la copropriété située au 50 Route La Carrière au Loup, 75002 Paris, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Fuite importante détectée au niveau du parking souterrain. Intervention urgente requise.

Facturation :
À l'ordre de : SDC – 50 Route La Carrière au Loup
Adresse : 50 Route La Carrière au Loup, 75002 Paris
Taux de TVA applicable : 10 %
Si le montant de la prestation dépasse 300 €, merci d'établir un devis préalable.

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
        piecesJointes: [
            {
                id: 'pj2',
                nom: 'photo-fuite-1.jpg',
                type: 'IMAGE',
                taille: '1.8 Mo',
                url: '#',
                dateAjout: '2024-11-01T10:05:00'
            },
            {
                id: 'pj3',
                nom: 'photo-fuite-2.jpg',
                type: 'IMAGE',
                taille: '2.1 Mo',
                url: '#',
                dateAjout: '2024-11-01T10:06:00'
            }
        ],
        montantEstime: 450,
        montantFinal: 520,
        devisRequis: true,
        historique: [
            {
                id: 'h1',
                date: '2024-11-01T10:00:00',
                auteur: 'Syndic Admin',
                action: 'Création de l\'ordre de service'
            },
            {
                id: 'h2',
                date: '2024-11-01T10:30:00',
                auteur: 'Syndic Admin',
                action: 'Envoi de l\'ordre de service'
            },
            {
                id: 'h3',
                date: '2024-11-02T09:00:00',
                auteur: 'Syndic Admin',
                action: 'Programmation de l\'intervention',
                champModifie: 'statut',
                ancienneValeur: 'EN_ATTENTE_PRESTATAIRE',
                nouvelleValeur: 'INTERVENTION_PROGRAMMEE'
            },
            {
                id: 'h4',
                date: '2024-11-02T16:45:00',
                auteur: 'Syndic Admin',
                action: 'Intervention réalisée',
                champModifie: 'statut',
                ancienneValeur: 'INTERVENTION_PROGRAMMEE',
                nouvelleValeur: 'INTERVENTION_REALISEE'
            }
        ]
    },
    {
        id: '4',
        date: '2024-09-15',
        dateCreation: '2024-09-15T14:20:00',
        dateModification: '2024-09-30T10:00:00',
        titre: 'Entretien espaces verts - Automne',
        description: 'Taille des haies, ramassage des feuilles mortes et tonte générale des pelouses',
        typeOrdre: 'CONTRACTUEL',
        fournisseurId: '6',
        fournisseurNom: 'Paysagiste Expert',
        fournisseurEmail: 'contact@paysagiste-expert.fr',
        fournisseurTelephone: '04 78 55 66 77',
        contratId: '3',
        contratNom: 'Entretien Espaces Verts',
        statut: 'CLOTURE',
        dateEnvoi: '2024-09-15T15:00:00',
        dateInterventionProgrammee: '2024-09-20T08:00:00',
        dateInterventionRealisee: '2024-09-20T17:30:00',
        dateCloture: '2024-09-30T10:00:00',
        emailObjet: 'Ordre de service contractuel - Entretien espaces verts Automne',
        emailCorps: `Bonjour,

En qualité de syndic de la copropriété située au 50 Route La Carrière au Loup, 75002 Paris, et conformément au contrat en cours avec votre entreprise, nous vous remercions de bien vouloir intervenir pour la demande suivante :

Demande :
Taille des haies, ramassage des feuilles mortes et tonte générale des pelouses

Nous vous remercions par avance de nous informer de la date d'intervention.
Cordialement,
Le syndic de la copropriété`,
        piecesJointes: [],
        montantFinal: 380,
        historique: [
            {
                id: 'h1',
                date: '2024-09-15T14:20:00',
                auteur: 'Syndic Admin',
                action: 'Création de l\'ordre de service'
            },
            {
                id: 'h2',
                date: '2024-09-15T15:00:00',
                auteur: 'Syndic Admin',
                action: 'Envoi de l\'ordre de service'
            },
            {
                id: 'h3',
                date: '2024-09-18T09:30:00',
                auteur: 'Syndic Admin',
                action: 'Intervention programmée pour le 20/09'
            },
            {
                id: 'h4',
                date: '2024-09-20T17:30:00',
                auteur: 'Syndic Admin',
                action: 'Intervention réalisée avec succès'
            },
            {
                id: 'h5',
                date: '2024-09-30T10:00:00',
                auteur: 'Syndic Admin',
                action: 'Clôture de l\'ordre de service et archivage'
            }
        ],
        archiveGedId: 'ged-os-4-1696064400000',
        archiveGedUrl: '#'
    }
];

export const MOCK_DOCUMENTS: Document[] = [
    { id: '1', nom: 'PV AG 2023.pdf', type: 'PDF', categorie: 'PV_AG', dateAjout: '2023-05-20', taille: '3.2 Mo' },
    { id: '2', nom: 'Règlement intérieur.pdf', type: 'PDF', categorie: 'REGLEMENT', dateAjout: '2019-03-15', taille: '4.8 Mo' },
    { id: '3', nom: 'Facture Engie Oct 2024.pdf', type: 'PDF', categorie: 'FACTURE', dateAjout: '2024-10-22', taille: '0.7 Mo' },
    { id: '4', nom: 'Contrat Assurance 2024.pdf', type: 'PDF', categorie: 'CONTRAT', dateAjout: '2024-01-05', taille: '1.5 Mo' }
];

/**
 * @deprecated Utiliser ASSEMBLEES_MOCK de '@/lib/mock-data' à la place.
 * Ces données sont obsolètes (dates en 2023-2024).
 * Migration en cours - voir Bug #72.
 */
export const MOCK_ASSEMBLEES: Assemblee[] = [
    {
        id: '1',
        date: '2024-05-20',
        type: 'ORDINAIRE',
        statut: 'PLANIFIEE',
        lieu: 'Salle commune',
        ordreDuJour: [
            { id: '1', titre: 'Approbation des comptes', description: 'Approbation des comptes de l\'exercice 2023', typeVote: 'MAJORITE_SIMPLE' },
            { id: '2', titre: 'Quitus au syndic', description: 'Quitus au syndic pour sa gestion', typeVote: 'MAJORITE_SIMPLE' },
            { id: '3', titre: 'Renouvellement syndic', description: 'Renouvellement du mandat du syndic bénévole', typeVote: 'MAJORITE_ABSOLUE' }
        ]
    },
    {
        id: '2',
        date: '2023-05-18',
        type: 'ORDINAIRE',
        statut: 'TERMINEE',
        lieu: 'Salle des fêtes',
        ordreDuJour: [
            { id: '1', titre: 'Approbation des comptes', description: 'Approbation des comptes de l\'exercice 2022', typeVote: 'MAJORITE_SIMPLE', resultat: 'ADOPTEE', pour: 1250, contre: 0, abstention: 0 }
        ]
    }
];

export const MOCK_FORUM_TOPICS: ForumTopic[] = [
    { id: '1', titre: 'Bruit de travaux au 5ème étage', auteur: 'Mme Dubois', dateCreation: '2024-10-28', categorie: 'VOISINAGE', nbReponses: 7, dernierMessage: '2024-10-29', dernierAuteur: 'M. Martin' },
    { id: '2', titre: 'Porte d\'entrée principale défaillante', auteur: 'M. Bernard', dateCreation: '2024-10-23', categorie: 'TRAVAUX', nbReponses: 4, dernierMessage: '2024-10-24', dernierAuteur: 'Syndic' },
    { id: '3', titre: 'Soirée conviviale décembre 2024', auteur: 'Mme Rousseau', dateCreation: '2024-10-18', categorie: 'ANNONCES', nbReponses: 15, dernierMessage: '2024-10-29', dernierAuteur: 'Mme Dubois' }
];

export const MOCK_FORUM_MESSAGES: ForumMessage[] = [
    { id: '1', topicId: '1', auteur: 'Mme Dubois', contenu: 'Bonjour, j\'aimerais signaler des bruits de marteau-piqueur très forts depuis ce matin. C\'est vraiment gênant !', date: '2024-10-28T09:15:00', isMe: true },
    { id: '2', topicId: '1', auteur: 'M. Martin', contenu: 'Désolé, c\'est pour des travaux urgents dans mon appartement. Cela devrait être terminé demain.', date: '2024-10-28T11:45:00', isMe: false },
    { id: '3', topicId: '1', auteur: 'Mme Dubois', contenu: 'Merci pour l\'information. Pourriez-vous éviter les heures de repos svp ?', date: '2024-10-28T14:20:00', isMe: true }
];

export const MOCK_EVENTS: Event[] = [
    { id: '1', titre: 'Soirée de fin d\'année', date: '2024-12-20T19:30:00', lieu: 'Salle commune', description: 'Apéritif dinatoire pour fêter la fin d\'année ensemble !', type: 'FETE', organisateur: 'Mme Rousseau' },
    { id: '2', titre: 'Collecte encombrants', date: '2024-11-15T08:00:00', lieu: 'Parking extérieur', description: 'Merci de déposer vos encombrants la veille au soir.', type: 'AUTRE', organisateur: 'Mairie' },
    { id: '3', titre: 'Réunion Conseil Syndical', date: '2024-11-08T18:00:00', lieu: 'Bureau du président', description: 'Préparation du budget 2025.', type: 'REUNION', organisateur: 'Président CS' }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
    { id: '1', participants: ['M. Martin'], dernierMessage: 'Bonjour, avez-vous bien reçu mon paiement ?', dateDernierMessage: '2024-10-29T15:30:00', nonLu: true },
    { id: '2', participants: ['Mme Dubois'], dernierMessage: 'Merci beaucoup pour votre retour.', dateDernierMessage: '2024-10-28T10:15:00', nonLu: false }
];

export const MOCK_PRIVATE_MESSAGES: PrivateMessage[] = [
    { id: '1', conversationId: '1', auteur: 'M. Martin', contenu: 'Bonjour, avez-vous bien reçu mon virement pour les charges du T4 ?', date: '2024-10-29T15:30:00', isMe: false },
    { id: '2', conversationId: '1', auteur: 'Moi', contenu: 'Bonjour, je vérifie immédiatement et vous confirme.', date: '2024-10-29T15:35:00', isMe: true }
];

export const MOCK_SALES: Sale[] = [
    {
        id: '1',
        lotIds: ['C5', 'Cave 12'],
        lotTypes: ['Appartement', 'Cave'],
        vendeur: 'Isabelle DUBOIS',
        vendeurId: '5',
        acquereur: 'Mme Moreau',
        notaire: 'Me Girard',
        dateCompromis: '2024-09-20',
        dateActeAuthentique: '2024-12-15',
        statut: 'EN_COURS',
        documents: [
            { id: '1', nom: 'Pré-état daté', type: 'PRE_ETAT_DATE', dateUpload: '2024-09-15', statut: 'DISPONIBLE', url: '#' },
            { id: '2', nom: 'État daté définitif', type: 'ETAT_DATE', dateUpload: '2024-10-25', dateSignature: '2024-10-26', statut: 'SIGNE', signePar: 'Syndic', url: '#' },
            { id: '3', nom: 'Certificat article 20-II', type: 'CERTIFICAT_ARTICLE_20', dateUpload: '2024-10-25', statut: 'EN_ATTENTE', url: '#' },
            { id: '4', nom: 'Diagnostic amiante', type: 'DIAGNOSTIC', dateUpload: '2024-09-10', statut: 'DISPONIBLE', url: '#' },
            { id: '5', nom: 'PV AG 2023', type: 'PV_AG', dateUpload: '2024-09-05', statut: 'DISPONIBLE', url: '#' }
        ],
        historique: [
            { id: 'h1', date: '2024-09-15T10:00:00', action: 'Création de la vente', utilisateur: 'Syndic' },
            { id: 'h2', date: '2024-09-15T10:05:00', action: 'Génération du document: Pré-état daté', utilisateur: 'Système' },
            { id: 'h3', date: '2024-10-25T14:30:00', action: 'Génération du document: État daté définitif', utilisateur: 'Système' },
            { id: 'h4', date: '2024-10-26T09:15:00', action: 'Signature du document: État daté définitif', utilisateur: 'Syndic' }
        ],
        dateCreation: '2024-09-15T10:00:00',
        dateModification: '2024-10-26T09:15:00'
    },
    {
        id: '2',
        lotIds: ['A2'],
        lotTypes: ['Appartement'],
        vendeur: 'Pierre MOREAU',
        vendeurId: '2',
        statut: 'EN_COURS',
        documents: [
            { id: '8', nom: 'Pré-état daté', type: 'PRE_ETAT_DATE', dateUpload: '2024-10-20', statut: 'DISPONIBLE', url: '#' }
        ],
        historique: [
            { id: 'h5', date: '2024-10-20T11:00:00', action: 'Création de la vente', utilisateur: 'Syndic' }
        ],
        dateCreation: '2024-10-20T11:00:00',
        dateModification: '2024-10-20T11:00:00'
    }
];

export const MOCK_IMPAYES: Impaye[] = [
    { id: '1', lotId: 'Appartement D7', proprietaire: 'M. Simon', montantDu: 1850, dateEcheance: '2024-08-31', retard: 95, statut: 'RELANCE_2', derniereRelance: '2024-10-20' },
    { id: '2', lotId: 'Appartement B8', proprietaire: 'Mme Garcia', montantDu: 1120, dateEcheance: '2024-09-30', retard: 65, statut: 'RELANCE_1', derniereRelance: '2024-10-25' },
    { id: '3', lotId: 'Appartement E3', proprietaire: 'M. Thomas', montantDu: 2750, dateEcheance: '2024-10-15', retard: 50, statut: 'EN_RETARD' },
    { id: '4', lotId: 'Appartement F1', proprietaire: 'Mme Lopez', montantDu: 4200, dateEcheance: '2024-07-31', retard: 125, statut: 'CONTENTIEUX', derniereRelance: '2024-09-15' }
];

export const MOCK_LITIGES: Litige[] = [
    { id: '1', titre: 'Nuisances sonores récurrentes', type: 'VOISINAGE', dateOuverture: '2024-10-15', statut: 'EN_COURS', parties: ['Appartement C4', 'Appartement C5'], description: 'Plainte pour nuisances sonores répétées en soirée.', priorite: 'MOYENNE' },
    { id: '2', titre: 'Dégâts des eaux en attente', type: 'TRAVAUX', dateOuverture: '2024-09-30', statut: 'OUVERT', parties: ['Appartement A3', 'Syndic'], description: 'Dégâts causés par une fuite non réparée depuis plus d\'un mois.', priorite: 'HAUTE' },
    { id: '3', titre: 'Contestation charges communes', type: 'CHARGES', dateOuverture: '2024-08-20', statut: 'RESOLU', parties: ['Appartement D2'], description: 'Contestation de la répartition des charges d\'entretien.', priorite: 'BASSE' }
];

// ========================================
// PRESTATAIRES & CONTRATS (Système étendu)
// ========================================

// Catalogue des domaines d'activité
export const MOCK_DOMAINES_ACTIVITE: { value: DomaineActivite; label: string }[] = [
    { value: 'PLOMBERIE', label: 'Plomberie' },
    { value: 'ELECTRICITE', label: 'Électricité' },
    { value: 'CHAUFFAGE', label: 'Chauffage' },
    { value: 'ASCENSEUR', label: 'Ascenseur' },
    { value: 'MENAGE', label: 'Ménage et entretien' },
    { value: 'ESPACES_VERTS', label: 'Espaces verts' },
    { value: 'SERRURERIE', label: 'Serrurerie' },
    { value: 'PEINTURE', label: 'Peinture' },
    { value: 'ASSURANCE', label: 'Assurance' },
    { value: 'JURIDIQUE', label: 'Juridique' },
    { value: 'ARCHITECTURE', label: 'Architecture' },
    { value: 'TOITURE', label: 'Toiture et couverture' },
    { value: 'FACADE', label: 'Ravalement façade' },
    { value: 'CLIMATISATION', label: 'Climatisation' },
    { value: 'INTERPHONE', label: 'Interphone / Vidéophone' },
    { value: 'PORTAIL', label: 'Portail automatique' },
    { value: 'AUTRE', label: 'Autre' },
];

// Prestataires du SYNDIC (base interne de confiance)
export const MOCK_PRESTATAIRES_SYNDIC: Prestataire[] = [
    {
        id: 'ps1',
        nom: 'PlombElite Services',
        categorie: 'SYNDIC',
        domaines: ['PLOMBERIE', 'CHAUFFAGE'],
        telephone: '01 45 67 89 12',
        telephoneUrgence: '06 12 34 56 78',
        email: 'contact@plombelite.fr',
        adresse: '25 rue des Artisans',
        codePostal: '69003',
        ville: 'Lyon',
        siren: '123456789',
        dateAjout: '2020-01-15',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Très réactif, tarifs corrects. Intervient souvent en urgence.',
        contactReferent: 'Jean-Pierre Martin',
        fonctionContact: 'Responsable interventions'
    },
    {
        id: 'ps2',
        nom: 'ElecPro Lyon',
        categorie: 'SYNDIC',
        domaines: ['ELECTRICITE', 'INTERPHONE'],
        telephone: '04 72 11 22 33',
        email: 'contact@elecpro-lyon.fr',
        adresse: '12 avenue de la République',
        codePostal: '69002',
        ville: 'Lyon',
        dateAjout: '2019-05-10',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Excellent pour les interphones. Prix un peu élevés mais qualité au rendez-vous.'
    },
    {
        id: 'ps3',
        nom: 'Jardins & Espaces',
        categorie: 'SYNDIC',
        domaines: ['ESPACES_VERTS'],
        telephone: '04 78 45 67 89',
        email: 'contact@jardins-espaces.fr',
        adresse: '8 route de Grenoble',
        codePostal: '69005',
        ville: 'Lyon',
        siren: '987654321',
        dateAjout: '2021-03-20',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Contrats annuels avantageux. Ponctuel.'
    },
    {
        id: 'ps4',
        nom: 'SecurHabitat',
        categorie: 'SYNDIC',
        domaines: ['SERRURERIE', 'PORTAIL'],
        telephone: '04 78 90 12 34',
        telephoneUrgence: '06 12 34 56 78',
        email: 'urgence@securhabitat.fr',
        adresse: '45 boulevard Vivier Merle',
        codePostal: '69003',
        ville: 'Lyon',
        dateAjout: '2022-07-10',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Dépannages d\'urgence 24/7. Fiable.',
        contactReferent: 'Marc Dupont',
        fonctionContact: 'Astreinte 24h/24'
    },
    {
        id: 'ps5',
        nom: 'PeintureXpert',
        categorie: 'SYNDIC',
        domaines: ['PEINTURE', 'FACADE'],
        telephone: '04 78 89 01 23',
        email: 'devis@peinturexpert.fr',
        adresse: '67 rue de la Guillotière',
        codePostal: '69007',
        ville: 'Lyon',
        dateAjout: '2020-11-05',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Bons devis pour grands travaux. Délais respectés.'
    },
    {
        id: 'ps6',
        nom: 'Cabinet Juridique Immobilier Lyon',
        categorie: 'SYNDIC',
        domaines: ['JURIDIQUE'],
        telephone: '04 72 00 11 22',
        email: 'cabinet@cjil.fr',
        adresse: '15 cours Gambetta',
        codePostal: '69003',
        ville: 'Lyon',
        dateAjout: '2018-09-01',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Spécialisé en droit de la copropriété. Honoraires élevés mais expertise reconnue.'
    },
];

// Prestataires COPROFLEX (base nationale marketplace avec infos détaillées)
export const MOCK_PRESTATAIRES_COPROFLEX: Prestataire[] = [
    {
        id: 'pcf1',
        nom: 'AscenseurExpert Pro',
        categorie: 'COPROFLEX',
        domaines: ['ASCENSEUR'],
        telephone: '0800 123 456',
        telephoneUrgence: '06 12 34 56 78',
        email: 'contact@ascenseurexpert.fr',
        adresse: '5 boulevard Industriel',
        codePostal: '69100',
        ville: 'Villeurbanne',
        noteMoyenne: 4.7,
        nombreAvis: 142,
        certifications: ['Qualibat', 'ISO 9001', 'APSAD'],
        dateAjout: '2023-03-20',
        nombreInterventions: 0,
        // Marketplace fields
        rayonIntervention: 50,
        tarifIndicatif: 'Contrat annuel 2 500-4 500€',
        description: 'Spécialiste ascenseurs toutes marques. Maintenance préventive et curative, mise aux normes, modernisation. Intervention rapide en cas de panne.',
        disponibilite: '7j/7 - Astreinte 24h/24',
        labelCoproFlex: true,
        delaiIntervention: '2h (urgence) / 48h (planifié)',
        anneeCreation: 1998,
        nombreSalaries: 45,
        siteWeb: 'www.ascenseurexpert-pro.fr'
    },
    {
        id: 'pcf2',
        nom: 'Toiture & Étanchéité Lyon',
        categorie: 'COPROFLEX',
        domaines: ['TOITURE', 'FACADE'],
        telephone: '04 78 88 99 00',
        email: 'devis@toiture-lyon.fr',
        adresse: '18 rue des Couvreurs',
        codePostal: '69007',
        ville: 'Lyon',
        noteMoyenne: 4.9,
        nombreAvis: 87,
        certifications: ['Qualibat', 'RGE', 'Garantie décennale'],
        dateAjout: '2023-06-15',
        nombreInterventions: 0,
        rayonIntervention: 60,
        tarifIndicatif: '45-75€/m² selon travaux',
        description: 'Entreprise spécialisée dans la réfection de toitures et l\'étanchéité. Couverture, zinguerie, isolation par l\'extérieur. Devis gratuit sous 48h.',
        disponibilite: 'Lun-Ven 7h-18h / Sam 8h-12h',
        labelCoproFlex: true,
        delaiIntervention: '48-72h (devis) / 1 semaine (travaux)',
        anneeCreation: 2005,
        nombreSalaries: 22,
        siteWeb: 'www.toiture-etancheite-lyon.fr'
    },
    {
        id: 'pcf3',
        nom: 'ClimConfort Solutions',
        categorie: 'COPROFLEX',
        domaines: ['CLIMATISATION', 'CHAUFFAGE'],
        telephone: '04 72 55 66 77',
        telephoneUrgence: '06 55 66 77 88',
        email: 'contact@climconfort.fr',
        adresse: '30 avenue Tony Garnier',
        codePostal: '69007',
        ville: 'Lyon',
        noteMoyenne: 4.5,
        nombreAvis: 65,
        certifications: ['RGE', 'QualiPAC', 'Qualibat'],
        dateAjout: '2023-04-10',
        nombreInterventions: 0,
        rayonIntervention: 40,
        tarifIndicatif: '55-85€/h',
        description: 'Installation et maintenance de systèmes de chauffage collectif et climatisation. PAC, chaudières gaz, VMC. Contrats d\'entretien sur mesure.',
        disponibilite: 'Lun-Ven 8h-18h',
        labelCoproFlex: true,
        delaiIntervention: '24-48h',
        anneeCreation: 2010,
        nombreSalaries: 18,
        siteWeb: 'www.climconfort-solutions.fr'
    },
    {
        id: 'pcf4',
        nom: 'Assurances Multirisques Copro',
        categorie: 'COPROFLEX',
        domaines: ['ASSURANCE'],
        telephone: '04 78 11 22 33',
        telephoneUrgence: '0 800 123 456',
        email: 'devis@amc-assur.fr',
        adresse: '100 cours Lafayette',
        codePostal: '69003',
        ville: 'Lyon',
        noteMoyenne: 4.3,
        nombreAvis: 198,
        certifications: ['ORIAS', 'Courtier agréé'],
        dateAjout: '2023-01-05',
        nombreInterventions: 0,
        contactReferent: 'Sophie Leroy',
        fonctionContact: 'Gestionnaire sinistres',
        rayonIntervention: 200,
        tarifIndicatif: 'Devis gratuit personnalisé',
        description: 'Courtier spécialisé copropriétés. MRI, RC syndic, DO, protection juridique. Accompagnement sinistres. Tarifs négociés auprès des meilleures compagnies.',
        disponibilite: 'Lun-Ven 9h-18h',
        labelCoproFlex: false,
        delaiIntervention: 'Devis sous 24h',
        anneeCreation: 1995,
        nombreSalaries: 35,
        siteWeb: 'www.amc-assur.fr'
    },
    {
        id: 'pcf5',
        nom: 'Architectes & Urbanisme',
        categorie: 'COPROFLEX',
        domaines: ['ARCHITECTURE'],
        telephone: '04 72 99 88 77',
        email: 'contact@archi-urba.fr',
        adresse: '45 rue de la Bourse',
        codePostal: '69002',
        ville: 'Lyon',
        noteMoyenne: 4.8,
        nombreAvis: 52,
        certifications: ['Ordre des Architectes', 'DPLG'],
        dateAjout: '2023-02-20',
        nombreInterventions: 0,
        rayonIntervention: 100,
        tarifIndicatif: 'Honoraires 8-12% du montant travaux',
        description: 'Cabinet d\'architecture spécialisé en copropriété. Rénovation énergétique, ravalement, surélévation, mise en accessibilité PMR. Maîtrise d\'œuvre complète.',
        disponibilite: 'Lun-Ven 9h-19h',
        labelCoproFlex: true,
        delaiIntervention: 'RDV sous 1 semaine',
        anneeCreation: 2008,
        nombreSalaries: 8,
        siteWeb: 'www.archi-urbanisme.fr'
    },
    {
        id: 'pcf6',
        nom: 'HydroPlombier Express',
        categorie: 'COPROFLEX',
        domaines: ['PLOMBERIE'],
        telephone: '06 99 88 77 66',
        telephoneUrgence: '06 99 88 77 66',
        email: 'urgence@hydroplombier.fr',
        adresse: '22 rue Paul Bert',
        codePostal: '69003',
        ville: 'Lyon',
        noteMoyenne: 4.6,
        nombreAvis: 210,
        certifications: ['Qualibat', 'RGE'],
        dateAjout: '2023-05-12',
        nombreInterventions: 0,
        rayonIntervention: 30,
        tarifIndicatif: '50-70€/h (HT)',
        description: 'Plomberie générale et dépannage urgent. Fuites, débouchage, remplacement sanitaires, colonnes montantes. Intervention rapide 7j/7.',
        disponibilite: '7j/7 - 6h-22h',
        labelCoproFlex: true,
        delaiIntervention: '1h (urgence) / 24h (planifié)',
        anneeCreation: 2012,
        nombreSalaries: 12,
        siteWeb: 'www.hydroplombier-express.fr'
    },
    {
        id: 'pcf7',
        nom: 'ElectraSmart Technologies',
        categorie: 'COPROFLEX',
        domaines: ['ELECTRICITE', 'INTERPHONE'],
        telephone: '04 78 44 55 66',
        telephoneUrgence: '06 44 55 66 77',
        email: 'info@electrasmart.fr',
        adresse: '88 avenue Lacassagne',
        codePostal: '69003',
        ville: 'Lyon',
        noteMoyenne: 4.7,
        nombreAvis: 134,
        certifications: ['Qualifelec', 'RGE', 'IRVE'],
        dateAjout: '2023-07-08',
        nombreInterventions: 0,
        rayonIntervention: 45,
        tarifIndicatif: '55-80€/h',
        description: 'Électricité générale copropriétés. Mise aux normes, interphones/vidéophones, éclairage LED, bornes de recharge VE, domotique parties communes.',
        disponibilite: 'Lun-Sam 7h-20h',
        labelCoproFlex: true,
        delaiIntervention: '4h (urgence) / 48h (planifié)',
        anneeCreation: 2015,
        nombreSalaries: 25,
        siteWeb: 'www.electrasmart.fr'
    },
    {
        id: 'pcf8',
        nom: 'Nettoyage Pro Services',
        categorie: 'COPROFLEX',
        domaines: ['MENAGE'],
        telephone: '04 72 33 44 55',
        email: 'contact@nettoyagepro-services.fr',
        adresse: '12 rue Garibaldi',
        codePostal: '69006',
        ville: 'Lyon',
        noteMoyenne: 4.4,
        nombreAvis: 176,
        certifications: ['Qualipropre'],
        dateAjout: '2023-03-15',
        nombreInterventions: 0,
        rayonIntervention: 35,
        tarifIndicatif: '150-350€/mois selon surface',
        description: 'Nettoyage parties communes copropriétés. Entretien régulier, vitres, remise en état après travaux. Personnel formé et équipé. Produits éco-responsables.',
        disponibilite: 'Lun-Sam 6h-20h',
        labelCoproFlex: false,
        delaiIntervention: 'Début prestation sous 1 semaine',
        anneeCreation: 2009,
        nombreSalaries: 85,
        siteWeb: 'www.nettoyagepro-services.fr'
    },
    {
        id: 'pcf9',
        nom: 'Portails Automatisés Rhône',
        categorie: 'COPROFLEX',
        domaines: ['PORTAIL', 'SERRURERIE'],
        telephone: '04 78 22 33 44',
        telephoneUrgence: '06 22 33 44 55',
        email: 'contact@portails-rhone.fr',
        adresse: '56 route de Vienne',
        codePostal: '69007',
        ville: 'Lyon',
        noteMoyenne: 4.6,
        nombreAvis: 89,
        certifications: ['Qualibat', 'APSAD P3'],
        dateAjout: '2023-08-22',
        nombreInterventions: 0,
        rayonIntervention: 50,
        tarifIndicatif: '65-90€/h + pièces',
        description: 'Installation et maintenance portails, portes de garage, contrôle d\'accès. Dépannage rapide. Contrats maintenance annuels. Toutes marques.',
        disponibilite: 'Lun-Ven 8h-18h / Astreinte WE',
        labelCoproFlex: true,
        delaiIntervention: '4h (urgence) / 24h (planifié)',
        anneeCreation: 2003,
        nombreSalaries: 15,
        siteWeb: 'www.portails-rhone.fr'
    },
    {
        id: 'pcf10',
        nom: 'Cabinet Avocats Droit Immobilier',
        categorie: 'COPROFLEX',
        domaines: ['JURIDIQUE'],
        telephone: '04 72 77 88 99',
        email: 'cabinet@avocats-immo.fr',
        adresse: '25 place Bellecour',
        codePostal: '69002',
        ville: 'Lyon',
        noteMoyenne: 4.9,
        nombreAvis: 43,
        certifications: ['Barreau de Lyon', 'CNB'],
        dateAjout: '2023-09-10',
        nombreInterventions: 0,
        rayonIntervention: 150,
        tarifIndicatif: 'Consultation 150€/h - Forfait dossier',
        description: 'Cabinet spécialisé en droit de la copropriété. Contentieux, recouvrement impayés, contestation AG, troubles de voisinage. 15 ans d\'expérience.',
        disponibilite: 'Lun-Ven 9h-19h sur RDV',
        labelCoproFlex: true,
        delaiIntervention: 'RDV sous 48h',
        anneeCreation: 2009,
        nombreSalaries: 6,
        siteWeb: 'www.cabinet-avocats-immo.fr'
    },
];

// Prestataires de la COPROPRIÉTÉ (ayant déjà intervenu)
export const MOCK_PRESTATAIRES_COPRO: Prestataire[] = [
    {
        id: 'pc1',
        nom: 'Schindler Ascenseurs',
        categorie: 'COPROPRIETE',
        domaines: ['ASCENSEUR'],
        telephone: '0800 234 567',
        telephoneUrgence: '0 800 987 654',
        email: 'service@schindler.fr',
        adresse: '10 avenue des Ascenseurs',
        codePostal: '69003',
        ville: 'Lyon',
        dateAjout: '2022-01-10',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Contrat maintenance en cours. Très professionnel.',
        contactReferent: 'François Berger',
        fonctionContact: 'Technicien référent secteur'
    },
    {
        id: 'pc2',
        nom: 'Nettoyage Pro',
        categorie: 'COPROPRIETE',
        domaines: ['MENAGE'],
        telephone: '04 72 33 44 55',
        email: 'contact@nettoyagepro.fr',
        adresse: '8 rue du Nettoyage',
        codePostal: '69006',
        ville: 'Lyon',
        dateAjout: '2021-03-15',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Contrat mensuel. Excellent travail, équipe stable.'
    },
    {
        id: 'pc3',
        nom: 'ProtectAssur',
        categorie: 'COPROPRIETE',
        domaines: ['ASSURANCE'],
        telephone: '04 78 99 00 11',
        telephoneUrgence: '01 40 50 60 70',
        email: 'copro@protectassur.fr',
        adresse: '50 cours Charlemagne',
        codePostal: '69002',
        ville: 'Lyon',
        dateAjout: '2020-06-01',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Assureur actuel. Bon rapport qualité/prix.',
        contactReferent: 'Marie Fontaine',
        fonctionContact: 'Chargée de clientèle syndic'
    },
    {
        id: 'pc4',
        nom: 'Paysagiste Expert',
        categorie: 'COPROPRIETE',
        domaines: ['ESPACES_VERTS'],
        telephone: '04 78 55 66 77',
        email: 'contact@paysagiste-expert.fr',
        adresse: '33 chemin des Jardiniers',
        codePostal: '69005',
        ville: 'Lyon',
        dateAjout: '2021-04-20',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Contrat annuel. Travail soigné, ponctuel.'
    },
    {
        id: 'pc5',
        nom: 'Chauffage Expert',
        categorie: 'COPROPRIETE',
        domaines: ['CHAUFFAGE', 'PLOMBERIE'],
        telephone: '04 72 88 99 00',
        email: 'intervention@chauffage-expert.fr',
        adresse: '15 rue du Chauffage',
        codePostal: '69007',
        ville: 'Lyon',
        dateAjout: '2022-09-10',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Intervenu pour la chaudière principale. Compétent.'
    },
    {
        id: 'pc6',
        nom: 'TechElec Services',
        categorie: 'COPROPRIETE',
        domaines: ['ELECTRICITE', 'INTERPHONE'],
        telephone: '04 78 12 34 56',
        email: 'contact@techelec.fr',
        adresse: '28 rue de la Part-Dieu',
        codePostal: '69003',
        ville: 'Lyon',
        dateAjout: '2022-02-14',
        nombreInterventions: 0, // Calculé dynamiquement à partir du carnet d'entretien
        derniereIntervention: undefined,
        notesInternes: 'Réparations interphone et tableau électrique. Réactif.'
    },
];

// Avis sur prestataires CoproFlex
export const MOCK_AVIS_COPROFLEX: AvisPrestataire[] = [
    {
        id: 'av1',
        prestataireId: 'pcf1',
        coproprieteId: 'copro-other-1',
        note: 5,
        commentaire: 'Intervention rapide, devis clair, travail impeccable sur notre ascenseur.',
        dateAvis: '2024-10-12',
        auteur: 'Résidence Les Mimosas'
    },
    {
        id: 'av2',
        prestataireId: 'pcf1',
        coproprieteId: 'copro-other-2',
        note: 4,
        commentaire: 'Bonne prestation, prix correct. Juste un peu long pour obtenir le devis.',
        dateAvis: '2024-09-05',
        auteur: 'Copro Saint-Just'
    },
    {
        id: 'av3',
        prestataireId: 'pcf2',
        coproprieteId: 'copro-other-3',
        note: 5,
        commentaire: 'Réfection de toiture impeccable. Garantie décennale, RGE. Très professionnel.',
        dateAvis: '2024-08-20',
        auteur: 'Syndic Lyon Centre'
    },
    {
        id: 'av4',
        prestataireId: 'pcf2',
        coproprieteId: 'copro-other-4',
        note: 5,
        commentaire: 'Excellent travail sur ravalement façade. Respect des délais et budget.',
        dateAvis: '2024-07-15',
        auteur: 'Résidence Montchat'
    },
    {
        id: 'av5',
        prestataireId: 'pcf3',
        coproprieteId: 'copro-other-5',
        note: 4,
        commentaire: 'Installation climatisation collective. Bon SAV mais installation un peu longue.',
        dateAvis: '2024-06-10',
        auteur: 'Copro Gerland'
    },
    {
        id: 'av6',
        prestataireId: 'pcf4',
        coproprieteId: 'copro-other-6',
        note: 4,
        commentaire: 'Assurance multirisque à bon prix. Gestion sinistres correcte.',
        dateAvis: '2024-11-01',
        auteur: 'Résidence Confluence'
    },
    {
        id: 'av7',
        prestataireId: 'pcf10',
        coproprieteId: 'copro-other-7',
        note: 5,
        commentaire: 'Conseil juridique de qualité pour litige complexe. Expertise reconnue.',
        dateAvis: '2024-09-20',
        auteur: 'Syndic Part-Dieu'
    },
];

// Types de contrat (catalogue pour dropdown)
// Catégories de contrats pour filtrage groupé
export type CategorieContrat = 'ASSURANCE' | 'MAINTENANCE' | 'PRESTATION' | 'AUTRE';

export const MOCK_CATEGORIES_CONTRAT: { value: CategorieContrat; label: string; types: TypeContrat[] }[] = [
    {
        value: 'ASSURANCE',
        label: 'Assurances',
        types: ['ASSURANCE', 'JURIDIQUE']
    },
    {
        value: 'MAINTENANCE',
        label: 'Maintenance technique',
        types: ['ASCENSEUR', 'CHAUFFAGE', 'ELECTRICITE', 'EAU', 'TOITURE', 'FACADE', 'INTERPHONE', 'PORTAIL']
    },
    {
        value: 'PRESTATION',
        label: 'Prestations de service',
        types: ['MENAGE', 'ESPACES_VERTS']
    },
    {
        value: 'AUTRE',
        label: 'Autres',
        types: ['AUTRE']
    }
];

// Helper pour trouver la catégorie d'un type de contrat
export function getCategorieFromType(type: TypeContrat): CategorieContrat {
    const categorie = MOCK_CATEGORIES_CONTRAT.find(cat => cat.types.includes(type));
    return categorie?.value || 'AUTRE';
}

export const MOCK_TYPES_CONTRAT: { value: TypeContrat; label: string; categorie: CategorieContrat }[] = [
    { value: 'ASCENSEUR', label: 'Ascenseur', categorie: 'MAINTENANCE' },
    { value: 'MENAGE', label: 'Ménage et entretien', categorie: 'PRESTATION' },
    { value: 'EAU', label: 'Eau', categorie: 'MAINTENANCE' },
    { value: 'ELECTRICITE', label: 'Électricité', categorie: 'MAINTENANCE' },
    { value: 'ASSURANCE', label: 'Assurance', categorie: 'ASSURANCE' },
    { value: 'ESPACES_VERTS', label: 'Espaces verts', categorie: 'PRESTATION' },
    { value: 'CHAUFFAGE', label: 'Chauffage', categorie: 'MAINTENANCE' },
    { value: 'TOITURE', label: 'Toiture', categorie: 'MAINTENANCE' },
    { value: 'FACADE', label: 'Façade', categorie: 'MAINTENANCE' },
    { value: 'INTERPHONE', label: 'Interphone', categorie: 'MAINTENANCE' },
    { value: 'PORTAIL', label: 'Portail', categorie: 'MAINTENANCE' },
    { value: 'JURIDIQUE', label: 'Services juridiques', categorie: 'ASSURANCE' },
    { value: 'AUTRE', label: 'Autre', categorie: 'AUTRE' },
];

// Contrats détaillés (remplace MOCK_CONTRATS)
export const MOCK_CONTRATS_DETAILLES: ContratDetaille[] = [
    {
        id: 'ct1',
        nom: 'Maintenance Ascenseur - Contrat annuel',
        prestataireId: 'pc1',
        fournisseur: 'Schindler Ascenseurs',
        type: 'ASCENSEUR',
        dateDebut: '2025-01-01',
        dateFin: '2026-03-15',
        coutAnnuel: 9600,
        statut: 'ACTIF',
        description: 'Maintenance préventive mensuelle + dépannages illimités 24/7',
        numeroContrat: 'SCH-2025-001',
        fichierPDF: 'contrat_schindler_2025.pdf',
        dateUploadPDF: '2024-12-15',
        taciteReconduction: true,
        delaiResiliation: 90,
        interventionIds: ['int1', 'int2', 'int3'],
        pieceJointes: [
            {
                id: 'doc1',
                nom: 'Contrat signé 2025',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2024-12-15'
            },
            {
                id: 'doc2',
                nom: 'Attestation assurance',
                type: 'ATTESTATION',
                url: '#',
                dateUpload: '2025-01-05'
            }
        ],
        dateAlerte: '2025-12-15',
        conditionsParticulieres: 'Intervention sous 4h en cas d\'urgence. Pièces détachées incluses.',
        equipementConcerne: 'Ascenseur principal',
        estReglementaire: true,
        planification: {
            frequence: 'MENSUELLE',
            jourPrefere: 15,
            heurePrefere: '09:00',
            delaiGenerationJours: 15,
            descriptionIntervention: 'Maintenance préventive mensuelle : contrôle technique complet, graissage des câbles et vérification des dispositifs de sécurité',
            montantEstimeIntervention: 0,
            generationAutomatique: true,
            prochaineIntervention: '2025-02-15'
        }
    },
    {
        id: 'ct2',
        nom: 'Assurance Multirisque Immeuble',
        prestataireId: 'pc3',
        fournisseur: 'AXA Assurances',
        type: 'ASSURANCE',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        coutAnnuel: 12500,
        statut: 'ACTIF',
        description: 'Assurance multirisque immeuble (incendie, dégâts des eaux, catastrophes naturelles)',
        numeroContrat: 'AXA-MRI-2024-456',
        fichierPDF: 'contrat_assurance_axa_2024.pdf',
        dateUploadPDF: '2023-11-20',
        taciteReconduction: true,
        delaiResiliation: 60,
        interventionIds: [],
        pieceJointes: [
            {
                id: 'doc3',
                nom: 'Contrat d\'assurance 2024',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2023-11-20'
            },
            {
                id: 'doc4',
                nom: 'Attestation d\'assurance',
                type: 'ATTESTATION',
                url: '#',
                dateUpload: '2024-01-02'
            }
        ],
        dateAlerte: '2024-10-01',
        conditionsParticulieres: 'Franchise 500€ par sinistre. Valeur à neuf garantie.',
        equipementConcerne: 'Immeuble complet',
        estReglementaire: true
    },
    {
        id: 'ct2b',
        nom: 'Responsabilité Civile Syndicat',
        prestataireId: 'pc3b',
        fournisseur: 'MAIF',
        type: 'ASSURANCE',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        coutAnnuel: 3200,
        statut: 'ACTIF',
        description: 'Responsabilité civile du syndicat des copropriétaires et du syndic',
        numeroContrat: 'MAIF-RCS-2024-789',
        fichierPDF: 'contrat_rc_maif_2024.pdf',
        dateUploadPDF: '2023-11-15',
        taciteReconduction: true,
        delaiResiliation: 60,
        interventionIds: [],
        pieceJointes: [
            {
                id: 'doc3b',
                nom: 'Contrat RC 2024',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2023-11-15'
            }
        ],
        dateAlerte: '2024-10-01',
        conditionsParticulieres: 'Couverture des mandataires sociaux incluse.',
        equipementConcerne: 'Syndicat des copropriétaires',
        estReglementaire: true
    },
    {
        id: 'ct2c',
        nom: 'Protection Juridique Copropriété',
        prestataireId: 'pc3c',
        fournisseur: 'Juridica',
        type: 'ASSURANCE',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        coutAnnuel: 1800,
        statut: 'ACTIF',
        description: 'Protection juridique pour litiges liés à la copropriété (voisinage, travaux, impayés)',
        numeroContrat: 'JUR-PJ-2024-321',
        fichierPDF: 'contrat_pj_juridica_2024.pdf',
        dateUploadPDF: '2023-11-18',
        taciteReconduction: true,
        delaiResiliation: 60,
        interventionIds: [],
        pieceJointes: [
            {
                id: 'doc3c',
                nom: 'Contrat PJ 2024',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2023-11-18'
            }
        ],
        dateAlerte: '2024-10-01',
        conditionsParticulieres: 'Plafond 50 000€ par litige. Consultation avocat incluse.',
        equipementConcerne: 'Copropriété - aspects juridiques',
        estReglementaire: false
    },
    {
        id: 'ct2d',
        nom: 'Dommages-Ouvrage - Ravalement façade',
        prestataireId: 'pc3d',
        fournisseur: 'SMABTP',
        type: 'ASSURANCE',
        dateDebut: '2023-03-15',
        dateFin: '2033-03-15',
        coutAnnuel: 0,
        statut: 'ACTIF',
        description: 'Assurance dommages-ouvrage couvrant le ravalement des façades nord et sud (Bâtiments A et B). Prime unique de 15 000€ payée à la souscription.',
        numeroContrat: 'DO-2023-12345',
        fichierPDF: 'contrat_do_facade.pdf',
        dateUploadPDF: '2023-03-10',
        taciteReconduction: false,
        delaiResiliation: 0,
        interventionIds: [],
        pieceJointes: [
            {
                id: 'doc3d-1',
                nom: 'Contrat Dommages-Ouvrage Façade',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2023-03-10'
            },
            {
                id: 'doc3d-2',
                nom: 'Attestation DO Façade',
                type: 'ATTESTATION',
                url: '#',
                dateUpload: '2023-03-15'
            },
            {
                id: 'doc3d-3',
                nom: 'PV réception travaux façade',
                type: 'AUTRE',
                url: '#',
                dateUpload: '2023-03-15'
            }
        ],
        dateAlerte: '2032-03-15',
        conditionsParticulieres: 'Garantie décennale. Travaux réalisés par Ravalement Express SARL. Date réception: 15/03/2023.',
        equipementConcerne: 'Façades nord et sud - Bâtiments A et B',
        estReglementaire: true
    },
    {
        id: 'ct2e',
        nom: 'Dommages-Ouvrage - Réfection toiture',
        prestataireId: 'pc3e',
        fournisseur: 'SMABTP',
        type: 'ASSURANCE',
        dateDebut: '2021-09-01',
        dateFin: '2031-09-01',
        coutAnnuel: 0,
        statut: 'ACTIF',
        description: 'Assurance dommages-ouvrage couvrant la réfection complète de la toiture terrasse du Bâtiment C. Prime unique de 22 000€ payée à la souscription.',
        numeroContrat: 'DO-2021-98765',
        fichierPDF: 'contrat_do_toiture.pdf',
        dateUploadPDF: '2021-08-25',
        taciteReconduction: false,
        delaiResiliation: 0,
        interventionIds: [],
        pieceJointes: [
            {
                id: 'doc3e-1',
                nom: 'Contrat Dommages-Ouvrage Toiture',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2021-08-25'
            },
            {
                id: 'doc3e-2',
                nom: 'Attestation DO Toiture',
                type: 'ATTESTATION',
                url: '#',
                dateUpload: '2021-09-01'
            }
        ],
        dateAlerte: '2030-09-01',
        conditionsParticulieres: 'Garantie décennale. Travaux réalisés par Toiture Lyon Métropole. Date réception: 01/09/2021.',
        equipementConcerne: 'Toiture terrasse Bâtiment C',
        estReglementaire: true
    },
    {
        id: 'ct3',
        nom: 'Entretien Espaces Verts',
        prestataireId: 'pc4',
        fournisseur: 'Paysagiste Expert',
        type: 'ESPACES_VERTS',
        dateDebut: '2025-01-01',
        dateFin: '2025-12-31',
        coutAnnuel: 4800,
        statut: 'ACTIF',
        description: 'Entretien mensuel des espaces verts (tonte, taille, désherbage)',
        numeroContrat: 'PE-2025-789',
        fichierPDF: 'contrat_espaces_verts_2025.pdf',
        dateUploadPDF: '2024-12-10',
        taciteReconduction: false,
        delaiResiliation: 30,
        interventionIds: ['int4', 'int5'],
        pieceJointes: [
            {
                id: 'doc5',
                nom: 'Contrat 2025',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2024-12-10'
            }
        ],
        dateAlerte: '2025-11-01',
        conditionsParticulieres: '12 passages par an. Intervention supplémentaire sur devis.',
        equipementConcerne: 'Jardins et espaces extérieurs',
        estReglementaire: false,
        planification: {
            frequence: 'MENSUELLE',
            jourPrefere: 1,
            heurePrefere: '08:00',
            delaiGenerationJours: 15,
            descriptionIntervention: 'Entretien mensuel des espaces verts : tonte pelouses, taille haies, désherbage, ramassage feuilles selon saison',
            montantEstimeIntervention: 400,
            generationAutomatique: true,
            prochaineIntervention: '2025-02-01'
        }
    },
    {
        id: 'ct4',
        nom: 'Nettoyage Parties Communes',
        prestataireId: 'pc2',
        fournisseur: 'Nettoyage Pro',
        type: 'MENAGE',
        dateDebut: '2025-01-01',
        dateFin: '2026-02-10',
        coutAnnuel: 8400,
        statut: 'ACTIF',
        description: 'Nettoyage hebdomadaire des parties communes (hall, escaliers, couloirs)',
        numeroContrat: 'NP-2025-123',
        fichierPDF: 'contrat_nettoyage_2025.pdf',
        dateUploadPDF: '2024-12-01',
        taciteReconduction: true,
        delaiResiliation: 60,
        interventionIds: ['int6', 'int7', 'int8'],
        pieceJointes: [
            {
                id: 'doc6',
                nom: 'Contrat de nettoyage',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2024-12-01'
            }
        ],
        dateAlerte: '2025-12-10',
        conditionsParticulieres: '4 passages par mois. Produits écologiques inclus.',
        equipementConcerne: 'Parties communes (hall, escaliers, couloirs)',
        estReglementaire: false,
        planification: {
            frequence: 'MENSUELLE',
            jourPrefere: 5,
            heurePrefere: '07:30',
            delaiGenerationJours: 7,
            descriptionIntervention: 'Nettoyage mensuel des parties communes : hall d\'entrée, escaliers, couloirs, locaux poubelles. 4 passages dans le mois.',
            montantEstimeIntervention: 700,
            generationAutomatique: true,
            prochaineIntervention: '2025-02-05'
        }
    },
    {
        id: 'ct5',
        nom: 'Entretien Chaudière Collective',
        prestataireId: 'pc5',
        fournisseur: 'Chauffage Expert',
        type: 'CHAUFFAGE',
        dateDebut: '2025-09-01',
        dateFin: '2026-08-31',
        coutAnnuel: 3200,
        statut: 'ACTIF',
        description: 'Contrat d\'entretien chaudière gaz collective (2 visites/an + dépannage)',
        numeroContrat: 'CE-CHAUD-2025-555',
        fichierPDF: 'contrat_chauffage_2025.pdf',
        dateUploadPDF: '2025-08-15',
        taciteReconduction: true,
        delaiResiliation: 90,
        interventionIds: ['int9'],
        pieceJointes: [
            {
                id: 'doc7',
                nom: 'Contrat entretien chaudière',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2025-08-15'
            },
            {
                id: 'doc8',
                nom: 'Certificat de conformité',
                type: 'ATTESTATION',
                url: '#',
                dateUpload: '2025-09-01'
            }
        ],
        dateAlerte: '2026-05-01',
        conditionsParticulieres: 'Ramonage inclus. Pièces détachées en sus.',
        equipementConcerne: 'Chaudière collective gaz',
        estReglementaire: true,
        planification: {
            frequence: 'SEMESTRIELLE',
            jourPrefere: 15,
            heurePrefere: '09:00',
            delaiGenerationJours: 30,
            descriptionIntervention: 'Visite semestrielle d\'entretien chaudière : contrôle combustion, vérification sécurité, nettoyage brûleur, ramonage conduit',
            montantEstimeIntervention: 1600,
            generationAutomatique: true,
            prochaineIntervention: '2025-09-15'
        }
    },
    {
        id: 'ct6',
        nom: 'Maintenance VMC Collective',
        prestataireId: 'pc6',
        fournisseur: 'Ventil\'Air Services',
        type: 'AUTRE',
        dateDebut: '2023-01-01',
        dateFin: '2023-12-31',
        coutAnnuel: 2400,
        statut: 'A_RENOUVELER',
        description: 'Contrat d\'entretien VMC collective avec 2 visites annuelles et nettoyage des bouches',
        numeroContrat: 'VAS-VMC-2023-001',
        fichierPDF: 'contrat_vmc_2023.pdf',
        dateUploadPDF: '2022-12-15',
        taciteReconduction: false,
        delaiResiliation: 60,
        interventionIds: [],
        pieceJointes: [
            {
                id: 'doc9',
                nom: 'Contrat VMC 2023',
                type: 'CONTRAT_PDF',
                url: '#',
                dateUpload: '2022-12-15'
            }
        ],
        dateAlerte: '2023-10-01',
        conditionsParticulieres: 'Remplacement filtres inclus. Intervention sous 48h en cas de panne.',
        equipementConcerne: 'VMC collective - tous bâtiments',
        estReglementaire: true
    },
];

// Interventions détaillées (remplace/étend MOCK_INTERVENTIONS)
export const MOCK_INTERVENTIONS_DETAILLEES: InterventionDetaille[] = [
    {
        id: 'int1',
        date: '2024-11-15',
        titre: 'Maintenance préventive ascenseur',
        description: 'Contrôle mensuel, graissage, vérification sécurité',
        intervenant: 'Schindler Ascenseurs',
        prestataireId: 'pc1',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'ASCENSEUR',
        contratId: 'ct1',
        montant: 0,
        commentaires: 'RAS. Ascenseur en bon état.'
    },
    {
        id: 'int2',
        date: '2024-10-12',
        titre: 'Dépannage ascenseur - Porte bloquée',
        description: 'Intervention urgente pour porte cabine bloquée étage 2',
        intervenant: 'Schindler Ascenseurs',
        prestataireId: 'pc1',
        statut: 'TERMINEE',
        type: 'REPARATION',
        domaine: 'ASCENSEUR',
        contratId: 'ct1',
        montant: 0,
        commentaires: 'Intervention sous 2h. Réglage porte effectué.'
    },
    {
        id: 'int3',
        date: '2024-09-18',
        titre: 'Maintenance préventive ascenseur',
        description: 'Contrôle mensuel, test alarme, nettoyage cabine',
        intervenant: 'Schindler Ascenseurs',
        prestataireId: 'pc1',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'ASCENSEUR',
        contratId: 'ct1',
        montant: 0
    },
    {
        id: 'int4',
        date: '2024-11-25',
        titre: 'Entretien espaces verts - Novembre',
        description: 'Tonte pelouse, taille haies, ramassage feuilles mortes',
        intervenant: 'Paysagiste Expert',
        prestataireId: 'pc4',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'ESPACES_VERTS',
        contratId: 'ct3',
        montant: 400
    },
    {
        id: 'int5',
        date: '2024-10-20',
        titre: 'Entretien espaces verts - Octobre',
        description: 'Tonte pelouse, désherbage allées, plantation bulbes',
        intervenant: 'Paysagiste Expert',
        prestataireId: 'pc4',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'ESPACES_VERTS',
        contratId: 'ct3',
        montant: 400
    },
    {
        id: 'int6',
        date: '2024-12-01',
        titre: 'Nettoyage parties communes - Semaine 48',
        description: 'Nettoyage complet hall, escaliers, couloirs (4 étages)',
        intervenant: 'Nettoyage Pro',
        prestataireId: 'pc2',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'MENAGE',
        contratId: 'ct4',
        montant: 0
    },
    {
        id: 'int7',
        date: '2024-11-24',
        titre: 'Nettoyage parties communes - Semaine 47',
        description: 'Nettoyage complet + lavage vitres entrée',
        intervenant: 'Nettoyage Pro',
        prestataireId: 'pc2',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'MENAGE',
        contratId: 'ct4',
        montant: 0
    },
    {
        id: 'int8',
        date: '2024-11-17',
        titre: 'Nettoyage parties communes - Semaine 46',
        description: 'Nettoyage complet + décapage sol hall d\'entrée',
        intervenant: 'Nettoyage Pro',
        prestataireId: 'pc2',
        statut: 'TERMINEE',
        type: 'AMELIORATION',
        domaine: 'MENAGE',
        contratId: 'ct4',
        montant: 150,
        commentaires: 'Décapage supplémentaire facturé en extra.'
    },
    {
        id: 'int9',
        date: '2024-11-10',
        titre: 'Réparation chaudière - Fuite circuit',
        description: 'Intervention urgente pour fuite sur circuit chauffage principal',
        intervenant: 'Chauffage Expert',
        prestataireId: 'pc5',
        statut: 'TERMINEE',
        type: 'REPARATION',
        domaine: 'CHAUFFAGE',
        contratId: 'ct5',
        montant: 350,
        pieceJointes: ['facture_chauffage_nov24.pdf'],
        commentaires: 'Pièce de rechange facturée (joint défectueux). Garantie 1 an.'
    },
    {
        id: 'int10',
        date: '2024-10-08',
        titre: 'Réparation interphone bâtiment A',
        description: 'Remplacement module défaillant interphone entrée principale',
        intervenant: 'TechElec Services',
        prestataireId: 'pc6',
        statut: 'TERMINEE',
        type: 'REPARATION',
        domaine: 'INTERPHONE',
        montant: 450,
        factureId: 'f123',
        pieceJointes: ['facture_interphone_oct24.pdf'],
        commentaires: 'Module remplacé. Garantie 2 ans.'
    },
    {
        id: 'int11',
        date: '2024-12-10',
        titre: 'Inspection sécurité incendie',
        description: 'Contrôle réglementaire annuel extincteurs et système alarme',
        intervenant: 'SecurMax',
        prestataireId: 'ps2',
        statut: 'PLANIFIEE',
        type: 'ENTRETIEN',
        domaine: 'AUTRE',
        montant: 280
    },
];
// ========================================
// CARNET D'ENTRETIEN - Données étendues
// ========================================

import { InformationsCopropriete, TravauxPrevisionnel, DocumentTechnique, InterventionCarnet } from '@/types';

// Informations générales de la copropriété
export const MOCK_INFORMATIONS_COPROPRIETE: InformationsCopropriete = {
    nom: 'Résidence Les Jardins',
    adresse: '25 avenue Victor Hugo',
    codePostal: '69003',
    ville: 'Lyon',
    anneeConstruction: 1992,
    nombreBatiments: 2,
    nombreLots: 28,
    equipementsPrincipaux: [
        'Ascenseur (1 unité)',
        'Chaudière collective gaz',
        'VMC collective',
        'Toiture terrasse accessible',
        'Espaces verts (450m²)',
        'Portail automatique',
        'Interphone collectif'
    ],

    // Syndic
    syndic: {
        nom: 'Cabinet Syndic Lyon',
        cabinet: 'Syndic Lyon Immobilier',
        telephone: '04 72 00 11 22',
        email: 'contact@syndic-lyon.fr',
        adresse: '15 rue de la République, 69001 Lyon'
    },

    // Gestionnaire de copropriété
    gestionnaire: {
        nom: 'Marie BERNARD',
        telephone: '04 72 00 11 23',
        email: 'm.bernard@syndic-lyon.fr'
    },

    // Conseil Syndical complet
    conseilSyndical: {
        membres: [
            { nom: 'Jean DUPONT', role: 'PRESIDENT', telephone: '06 12 34 56 78', email: 'j.dupont@email.fr' },
            { nom: 'Marie LEBLANC', role: 'VICE_PRESIDENT', telephone: '06 23 45 67 89', email: 'm.leblanc@email.fr' },
            { nom: 'Pierre MOREAU', role: 'TRESORIER', telephone: '06 34 56 78 90', email: 'p.moreau@email.fr' },
            { nom: 'Sophie LAURENT', role: 'SECRETAIRE', telephone: '06 45 67 89 01', email: 's.laurent@email.fr' },
            { nom: 'André MARTIN', role: 'MEMBRE', telephone: '06 56 78 90 12' },
            { nom: 'Claire DURAND', role: 'MEMBRE', telephone: '06 67 89 01 23' }
        ]
    },

    // Gardien / Concierge
    gardien: {
        nom: 'Michel GARCIA',
        telephone: '06 78 90 12 34',
        email: 'gardien.lesjardins@email.fr',
        horaires: 'Lun-Ven: 8h-12h / 14h-18h, Sam: 9h-12h',
        loge: 'Bâtiment A - RDC'
    },

    // Prestataires principaux
    prestataires: [
        {
            type: 'ASCENSEUR',
            nom: 'Schindler France',
            telephone: '04 72 85 85 85',
            telephoneUrgence: '0 825 007 007',
            email: 'lyon@schindler.fr',
            contratId: 'c1'
        },
        {
            type: 'CHAUFFAGE',
            nom: 'Engie Home Services',
            telephone: '04 78 63 63 63',
            telephoneUrgence: '0 969 369 369',
            email: 'chauffage.lyon@engie.fr',
            contratId: 'c2'
        },
        {
            type: 'PLOMBERIE',
            nom: 'Plomberie Express Lyon',
            telephone: '04 78 42 42 42',
            telephoneUrgence: '06 80 42 42 42',
            email: 'urgence@plomberie-lyon.fr'
        },
        {
            type: 'ELECTRICITE',
            nom: 'Électricité Générale du Rhône',
            telephone: '04 72 33 33 33',
            telephoneUrgence: '06 81 33 33 33',
            email: 'contact@egr-lyon.fr'
        },
        {
            type: 'ESPACES_VERTS',
            nom: 'Jardiniers de Lyon',
            telephone: '04 78 25 25 25',
            email: 'contact@jardiniers-lyon.fr',
            contratId: 'c3'
        },
        {
            type: 'NETTOYAGE',
            nom: 'Clean Services',
            telephone: '04 72 41 41 41',
            email: 'lyon@clean-services.fr',
            contratId: 'c4'
        }
    ],

    // Services d'urgence
    servicesUrgence: [
        { type: 'POMPIERS', nom: 'Sapeurs-Pompiers', telephone: '18', disponibilite: '24h/24' },
        { type: 'POLICE', nom: 'Police Secours', telephone: '17', disponibilite: '24h/24' },
        { type: 'SAMU', nom: 'SAMU', telephone: '15', disponibilite: '24h/24' },
        { type: 'URGENCE_GAZ', nom: 'GRDF Urgence Gaz', telephone: '0 800 47 33 33', disponibilite: '24h/24 - Gratuit' },
        { type: 'URGENCE_EAU', nom: 'Eau du Grand Lyon', telephone: '09 69 39 69 99', disponibilite: '24h/24' },
        { type: 'URGENCE_ELECTRICITE', nom: 'Enedis Dépannage', telephone: '09 72 67 50 69', disponibilite: '24h/24' },
        { type: 'CENTRE_ANTIPOISON', nom: 'Centre Antipoison Lyon', telephone: '04 72 11 69 11', disponibilite: '24h/24' }
    ],

    // Assurance immeuble
    assurance: {
        compagnie: 'AXA Assurances',
        numeroContrat: 'MRI-2024-789456',
        numeroSinistre: '0 800 810 812',
        telephone: '04 72 60 60 60',
        telephoneSinistre: '0 800 810 812',
        email: 'sinistres.immeuble@axa.fr'
    }
};

// Travaux prévisionnels / Plan Pluriannuel de Travaux
export const MOCK_TRAVAUX_PREVISIONNELS: TravauxPrevisionnel[] = [
    {
        id: 'tp1',
        titre: 'Ravalement de façade bâtiment A',
        description: 'Ravalement complet façade Est et Ouest avec nettoyage, réparation fissures et peinture',
        type: 'FACADE',
        datePrevisionnelle: '2025-04-01',
        dateVote: '2024-11-20',
        montantEstime: 45000,
        montantVote: 45000,
        statut: 'VOTE',
        priorite: 'HAUTE',
        issuPPT: true,
        observations: 'Devis de 3 entreprises à comparer. Subvention ANAH possible (15%)'
    },
    {
        id: 'tp2',
        titre: 'Remplacement chaudière collective',
        description: 'Remplacement chaudière gaz vieillissante par modèle condensation haute performance',
        type: 'CHAUFFAGE',
        datePrevisionnelle: '2026-09-01',
        montantEstime: 28000,
        statut: 'PREVU',
        priorite: 'HAUTE',
        issuPPT: true,
        observations: 'Chaudière actuelle a 18 ans. Économies énergétiques attendues: 25%'
    },
    {
        id: 'tp3',
        titre: 'Réfection étanchéité toiture terrasse',
        description: 'Reprise complète étanchéité toiture terrasse avec isolation renforcée',
        type: 'ETANCHEITE',
        datePrevisionnelle: '2025-06-01',
        montantEstime: 35000,
        statut: 'PREVU',
        priorite: 'HAUTE',
        issuPPT: true,
        observations: 'Infiltrations constatées. Isolation thermique à renforcer (R=6)'
    },
    {
        id: 'tp4',
        titre: 'Mise aux normes électriques parties communes',
        description: 'Mise en conformité tableau électrique et éclairage parties communes',
        type: 'ELECTRICITE',
        datePrevisionnelle: '2025-03-01',
        dateVote: '2024-11-20',
        montantEstime: 12000,
        montantVote: 12500,
        statut: 'VOTE',
        priorite: 'HAUTE',
        issuPPT: false,
        observations: 'Diagnostic électrique obligatoire réalisé en octobre 2024'
    },
    {
        id: 'tp5',
        titre: 'Modernisation ascenseur',
        description: 'Remplacement armoire de commande et modernisation cabine',
        type: 'ASCENSEUR',
        datePrevisionnelle: '2027-01-01',
        montantEstime: 18000,
        statut: 'PREVU',
        priorite: 'MOYENNE',
        issuPPT: true,
        observations: 'Contrôle technique satisfaisant. Modernisation esthétique et fonctionnelle'
    },
    {
        id: 'tp6',
        titre: 'Aménagement accessibilité PMR',
        description: 'Installation rampe d\'accès et adaptation interphone pour PMR',
        type: 'ACCESSIBILITE',
        datePrevisionnelle: '2026-01-01',
        montantEstime: 8500,
        statut: 'PREVU',
        priorite: 'MOYENNE',
        issuPPT: false,
        observations: 'Obligation réglementaire. Aide financière MDPH possible'
    },
    {
        id: 'tp7',
        titre: 'Installation panneaux solaires toiture',
        description: 'Étude de faisabilité pour installation de panneaux photovoltaïques sur la toiture terrasse',
        type: 'AUTRE',
        datePrevisionnelle: '2027-06-01',
        montantEstime: 35000,
        statut: 'A_L_ETUDE',
        priorite: 'BASSE',
        issuPPT: false,
        observations: 'Étude technique en cours. ROI estimé 8 ans. Subventions possibles jusqu\'à 40%'
    },
    {
        id: 'tp8',
        titre: 'Rénovation hall d\'entrée',
        description: 'Réfection complète du hall : peinture, sol, éclairage LED, boîtes aux lettres normalisées',
        type: 'AUTRE',
        datePrevisionnelle: '2025-09-01',
        montantEstime: 15000,
        statut: 'A_L_ETUDE',
        priorite: 'BASSE',
        issuPPT: false,
        observations: 'Demande du conseil syndical. Plusieurs devis à solliciter'
    },
    {
        id: 'tp9',
        titre: 'Remplacement portes de cave',
        description: 'Remplacement des portes de cave vétustes par des portes coupe-feu',
        type: 'SECURITE',
        datePrevisionnelle: '2025-02-01',
        dateVote: '2024-11-20',
        montantEstime: 6500,
        montantVote: 7200,
        statut: 'EN_COURS',
        priorite: 'HAUTE',
        issuPPT: false,
        observations: 'Travaux commencés le 15/12/2024. Fin prévue mi-janvier 2025'
    },
    {
        id: 'tp10',
        titre: 'Réfection peinture cage d\'escalier',
        description: 'Peinture complète cage d\'escalier bâtiment A (6 étages)',
        type: 'AUTRE',
        datePrevisionnelle: '2024-06-01',
        dateVote: '2023-11-15',
        dateRealisation: '2024-07-15',
        montantEstime: 4500,
        montantVote: 4800,
        montantReel: 4650,
        statut: 'TERMINE',
        priorite: 'BASSE',
        issuPPT: false,
        observations: 'Travaux réalisés par Peintures Lyon. Garantie 2 ans'
    }
];

// Documents techniques
export const MOCK_DOCUMENTS_TECHNIQUES: DocumentTechnique[] = [
    {
        id: 'dt1',
        nom: 'Dossier Technique Amiante (DTA)',
        type: 'DTA',
        dateAjout: '2023-05-15',
        dateValidite: '2026-05-15',
        url: '#',
        observations: 'Présence amiante détectée dans les conduits de vide-ordures (hors d\'usage)'
    },
    {
        id: 'dt2',
        nom: 'Diagnostic Plomb Parties Communes',
        type: 'DIAGNOSTIC_PLOMB',
        dateAjout: '2023-06-10',
        url: '#',
        observations: 'Absence de plomb détectée'
    },
    {
        id: 'dt3',
        nom: 'Diagnostic Électrique Parties Communes',
        type: 'DIAGNOSTIC_ELECTRICITE',
        dateAjout: '2024-10-05',
        dateValidite: '2027-10-05',
        url: '#',
        observations: 'Non-conformités relevées: tableau électrique à moderniser (prévu en travaux)'
    },
    {
        id: 'dt4',
        nom: 'Diagnostic Gaz - Chaudière collective',
        type: 'DIAGNOSTIC_GAZ',
        dateAjout: '2024-08-20',
        dateValidite: '2027-08-20',
        url: '#',
        observations: 'Installation conforme. Contrôle annuel à effectuer'
    },
    {
        id: 'dt5',
        nom: 'DPE Collectif',
        type: 'DPE_COLLECTIF',
        dateAjout: '2023-03-12',
        dateValidite: '2033-03-12',
        url: '#',
        observations: 'Classe énergétique: D. Amélioration possible avec isolation toiture'
    },
    {
        id: 'dt6',
        nom: 'Rapport Contrôle Périodique Ascenseur',
        type: 'CONTROLE_ASCENSEUR',
        dateAjout: '2024-11-15',
        dateValidite: '2025-11-15',
        url: '#',
        observations: 'Contrôle quinquennal satisfaisant. Prochaine visite: novembre 2025'
    },
    {
        id: 'dt7',
        nom: 'Contrôle Extincteurs',
        type: 'CONTROLE_EXTINCTEURS',
        dateAjout: '2024-09-10',
        dateValidite: '2025-09-10',
        url: '#',
        observations: '6 extincteurs vérifiés. Tous conformes. Recharge à prévoir en 2025'
    },
    {
        id: 'dt8',
        nom: 'Contrôle Chaufferie Annuel',
        type: 'CONTROLE_CHAUFFERIE',
        dateAjout: '2024-09-05',
        dateValidite: '2025-09-05',
        url: '#',
        observations: 'Installation conforme. Rendement combustion: 91%. Entretien annuel effectué'
    },
    {
        id: 'dt9',
        nom: 'Garantie Décennale - Toiture (Travaux 2022)',
        type: 'GARANTIE_DECENNALE',
        dateAjout: '2022-07-20',
        dateValidite: '2032-07-20',
        url: '#',
        observations: 'Travaux réfection partielle toiture. Entreprise: Toiture Expert Lyon'
    },
    {
        id: 'dt10',
        nom: 'Garantie Parfait Achèvement - Ravalement Bât. B',
        type: 'GARANTIE_PARFAIT_ACHEVEMENT',
        dateAjout: '2023-06-15',
        dateValidite: '2024-06-15',
        url: '#',
        observations: 'Expirée. Travaux conformes, aucun défaut constaté'
    }
];

// Interventions pour le carnet d'entretien (étendues)
export const MOCK_INTERVENTIONS_CARNET: InterventionCarnet[] = [
    {
        id: 'ic1',
        date: '2024-11-15',
        titre: 'Maintenance préventive ascenseur',
        description: 'Contrôle mensuel, graissage, vérification sécurité',
        intervenant: 'Schindler Ascenseurs',
        prestataireId: 'pc1',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'ASCENSEUR',
        contratId: 'ct1',
        ordreServiceId: '2',
        categorie: 'COURANTE',
        cout: 0,
        equipementConcerne: 'Ascenseur principal',
        documentsAssocies: ['rapport_maintenance_ascenseur_nov24.pdf'],
        posteBudgetaire: 'ascenseur'
    },
    {
        id: 'ic2',
        date: '2024-10-08',
        titre: 'Réparation interphone bâtiment A',
        description: 'Remplacement module défaillant interphone entrée principale',
        intervenant: 'TechElec Services',
        prestataireId: 'pc6',
        statut: 'TERMINEE',
        type: 'REPARATION',
        domaine: 'INTERPHONE',
        categorie: 'COURANTE',
        cout: 450,
        equipementConcerne: 'Interphone principal',
        factureId: 'f123',
        documentsAssocies: ['facture_interphone_oct24.pdf', 'photo_avant.jpg', 'photo_apres.jpg'],
        posteBudgetaire: 'securite'
    },
    {
        id: 'ic3',
        date: '2024-09-20',
        titre: 'Réfection partielle toiture - Fuite bâtiment B',
        description: 'Reprise étanchéité toiture suite à infiltrations constatées appartement D8',
        intervenant: 'Toiture Expert Lyon',
        prestataireId: 'pcf2',
        statut: 'TERMINEE',
        type: 'REPARATION',
        domaine: 'TOITURE',
        categorie: 'TRAVAUX_IMPORTANTS',
        cout: 3200,
        equipementConcerne: 'Toiture bâtiment B',
        documentsAssocies: ['devis_toiture.pdf', 'facture_toiture.pdf', 'photos_travaux.pdf', 'garantie_decennale.pdf'],
        posteBudgetaire: 'toiture'
    },
    {
        id: 'ic4',
        date: '2024-08-15',
        titre: 'Entretien chaudière collective',
        description: 'Entretien annuel obligatoire chaudière gaz avec ramonage',
        intervenant: 'Chauffage Expert',
        prestataireId: 'pc5',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'CHAUFFAGE',
        contratId: 'ct5',
        categorie: 'COURANTE',
        cout: 0,
        equipementConcerne: 'Chaudière collective',
        documentsAssocies: ['attestation_entretien_chaudiere_2024.pdf'],
        posteBudgetaire: 'chauffage'
    },
    {
        id: 'ic5',
        date: '2024-10-31',
        titre: 'Réparation portail automatique',
        description: 'Réparation portail automatique bloqué en position ouverte',
        intervenant: 'TechElec Services',
        prestataireId: 'pc6',
        statut: 'TERMINEE',
        type: 'REPARATION',
        domaine: 'PORTAIL',
        ordreServiceId: '1',
        categorie: 'COURANTE',
        cout: 280,
        equipementConcerne: 'Portail d\'entrée',
        documentsAssocies: ['facture_portail_reparation.pdf', 'photo_portail.jpg'],
        posteBudgetaire: 'securite'
    },
    {
        id: 'ic8',
        date: '2024-11-02',
        titre: 'Dépannage fuite d\'eau parking',
        description: 'Réparation fuite importante au niveau du parking souterrain',
        intervenant: 'Chauffage Expert',
        prestataireId: 'pc5',
        statut: 'TERMINEE',
        type: 'REPARATION',
        domaine: 'PLOMBERIE',
        ordreServiceId: '3',
        categorie: 'COURANTE',
        cout: 520,
        equipementConcerne: 'Parking souterrain',
        documentsAssocies: ['photo_fuite_avant.jpg', 'photo_fuite_apres.jpg', 'facture_fuite.pdf'],
        posteBudgetaire: 'plomberie'
    },
    {
        id: 'ic6',
        date: '2024-12-05',
        titre: 'Nettoyage parties communes',
        description: 'Nettoyage hebdomadaire complet (hall, escaliers, couloirs)',
        intervenant: 'Nettoyage Pro',
        prestataireId: 'pc2',
        statut: 'TERMINEE',
        type: 'ENTRETIEN',
        domaine: 'MENAGE',
        contratId: 'ct4',
        categorie: 'COURANTE',
        cout: 0,
        equipementConcerne: 'Parties communes',
        posteBudgetaire: 'menage'
    },
    {
        id: 'ic7',
        date: '2026-01-10',
        titre: 'Inspection sécurité incendie',
        description: 'Contrôle réglementaire annuel extincteurs et système alarme',
        intervenant: 'SecurMax',
        prestataireId: 'ps2',
        statut: 'PLANIFIEE',
        type: 'ENTRETIEN',
        domaine: 'AUTRE',
        categorie: 'COURANTE',
        cout: 280,
        equipementConcerne: 'Équipements sécurité incendie',
        posteBudgetaire: 'securite'
    },
    {
        id: 'ic8b',
        date: '2026-01-16',
        titre: 'Contrôle étanchéité toiture',
        description: 'Vérification annuelle de l\'étanchéité toiture terrasse',
        intervenant: 'Toiture Expert Lyon',
        prestataireId: 'pcf2',
        statut: 'PLANIFIEE',
        type: 'ENTRETIEN',
        domaine: 'TOITURE',
        categorie: 'COURANTE',
        cout: 350,
        equipementConcerne: 'Toiture terrasse',
        posteBudgetaire: 'toiture'
    },
    {
        id: 'ic9',
        date: '2026-01-20',
        titre: 'Maintenance préventive VMC',
        description: 'Nettoyage et vérification du système de ventilation',
        intervenant: 'Climat Services',
        prestataireId: 'pc7',
        statut: 'PLANIFIEE',
        type: 'ENTRETIEN',
        domaine: 'CLIMATISATION',
        categorie: 'COURANTE',
        cout: 180,
        equipementConcerne: 'VMC collective',
        posteBudgetaire: 'chauffage'
    },
    {
        id: 'ic10',
        date: '2026-01-25',
        titre: 'Révision portes de garage',
        description: 'Contrôle annuel des portes automatiques du parking',
        intervenant: 'TechPortail',
        prestataireId: 'pc8',
        statut: 'PLANIFIEE',
        type: 'ENTRETIEN',
        domaine: 'PORTAIL',
        categorie: 'COURANTE',
        cout: 220,
        equipementConcerne: 'Portes de garage',
        posteBudgetaire: 'parking'
    }
];

// ========================================
// ASSURANCES COPROPRIÉTÉ (Carnet d'entretien)
// ========================================

export const MOCK_ASSURANCES_COPROPRIETE: ContratAssurance[] = [
    {
        id: 'ass1',
        type: 'ASSURANCE',
        sousType: 'MRI',
        nom: 'Assurance Multirisque Immeuble',
        assureur: 'AXA Assurances',
        numeroPolice: 'MRI-2024-78965',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        primeAnnuelle: 8500,
        franchise: 500,
        garanties: ['Incendie', 'Dégâts des eaux', 'Vol', 'Vandalisme', 'Catastrophes naturelles', 'Bris de glace'],
        observations: 'Contrat reconduit tacitement chaque année',
        documents: [
            { id: 'doc-ass1-1', nom: 'Contrat MRI 2024', type: 'CONTRAT', url: 'contrat_mri_2024.pdf', dateUpload: '2024-01-05' },
            { id: 'doc-ass1-2', nom: 'Conditions particulières MRI', type: 'CONDITIONS_PARTICULIERES', url: 'cp_mri_2024.pdf', dateUpload: '2024-01-05' },
            { id: 'doc-ass1-3', nom: 'Attestation assurance 2024', type: 'ATTESTATION', url: 'attestation_mri_2024.pdf', dateUpload: '2024-01-10' }
        ]
    },
    {
        id: 'ass2',
        type: 'ASSURANCE',
        sousType: 'RC_SYNDICAT',
        nom: 'Responsabilité Civile Syndicat',
        assureur: 'MAIF',
        numeroPolice: 'RC-2024-45678',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        primeAnnuelle: 2200,
        garanties: ['RC exploitation', 'RC après travaux', 'Défense et recours', 'Protection juridique'],
        observations: 'Couverture jusqu\'à 3 000 000 € par sinistre',
        documents: [
            { id: 'doc-ass2-1', nom: 'Contrat RC Syndicat 2024', type: 'CONTRAT', url: 'contrat_rc_2024.pdf', dateUpload: '2024-01-03' },
            { id: 'doc-ass2-2', nom: 'Attestation RC 2024', type: 'ATTESTATION', url: 'attestation_rc_2024.pdf', dateUpload: '2024-01-08' }
        ]
    },
    {
        id: 'ass3',
        type: 'ASSURANCE',
        sousType: 'DOMMAGES_OUVRAGE',
        nom: 'Dommages-Ouvrage - Ravalement façade',
        assureur: 'SMABTP',
        numeroPolice: 'DO-2023-12345',
        dateDebut: '2023-03-15',
        dateFin: '2033-03-15',
        primeAnnuelle: 0,
        garanties: ['Garantie décennale', 'Dommages-ouvrage'],
        travauxConcernes: 'Ravalement façade nord et sud - Bâtiments A et B',
        dateReceptionTravaux: '2023-03-15',
        observations: 'Prime unique de 15 000 € payée à la souscription. Entreprise: Ravalement Express SARL',
        documents: [
            { id: 'doc-ass3-1', nom: 'Contrat Dommages-Ouvrage Façade', type: 'CONTRAT', url: 'contrat_do_facade.pdf', dateUpload: '2023-03-10' },
            { id: 'doc-ass3-2', nom: 'Attestation DO Façade', type: 'ATTESTATION', url: 'attestation_do_facade.pdf', dateUpload: '2023-03-15' },
            { id: 'doc-ass3-3', nom: 'PV réception travaux façade', type: 'AUTRE', url: 'pv_reception_facade.pdf', dateUpload: '2023-03-15' }
        ]
    },
    {
        id: 'ass4',
        type: 'ASSURANCE',
        sousType: 'DOMMAGES_OUVRAGE',
        nom: 'Dommages-Ouvrage - Réfection toiture',
        assureur: 'SMABTP',
        numeroPolice: 'DO-2021-98765',
        dateDebut: '2021-09-01',
        dateFin: '2031-09-01',
        primeAnnuelle: 0,
        garanties: ['Garantie décennale', 'Dommages-ouvrage'],
        travauxConcernes: 'Réfection complète toiture terrasse Bâtiment C',
        dateReceptionTravaux: '2021-09-01',
        observations: 'Prime unique de 22 000 € payée à la souscription. Entreprise: Toiture Lyon Métropole',
        documents: [
            { id: 'doc-ass4-1', nom: 'Contrat Dommages-Ouvrage Toiture', type: 'CONTRAT', url: 'contrat_do_toiture.pdf', dateUpload: '2021-08-25' },
            { id: 'doc-ass4-2', nom: 'Attestation DO Toiture', type: 'ATTESTATION', url: 'attestation_do_toiture.pdf', dateUpload: '2021-09-01' }
        ]
    },
    {
        id: 'ass5',
        type: 'ASSURANCE',
        sousType: 'PROTECTION_JURIDIQUE',
        nom: 'Protection Juridique Copropriété',
        assureur: 'Juridica',
        numeroPolice: 'PJ-2024-33221',
        dateDebut: '2024-01-01',
        dateFin: '2024-12-31',
        primeAnnuelle: 850,
        garanties: ['Litiges copropriété', 'Recouvrement charges', 'Conflits prestataires', 'Assistance juridique'],
        observations: 'Plafond de prise en charge: 50 000 € par litige',
        documents: [
            { id: 'doc-ass5-1', nom: 'Contrat Protection Juridique 2024', type: 'CONTRAT', url: 'contrat_pj_2024.pdf', dateUpload: '2024-01-02' }
        ]
    }
];

// ========================================
// CONTRAT DU SYNDIC
// ========================================

export const MOCK_CONTRAT_SYNDIC: ContratSyndic = {
    id: 'syndic-001',
    nomSyndic: 'Cabinet Syndic Lyon',
    cabinetNom: 'Groupe Immo Gestion',
    numeroContrat: 'CSL-2024-001',
    dateDebut: '2024-01-01',
    dateFin: '2026-12-31',
    montantAnnuel: 18500,
    statut: 'ACTIF',
    description: 'Mandat de syndic professionnel - Gestion complète de la copropriété incluant la gestion courante, les assemblées générales, le suivi des travaux et la comptabilité.',
    fichierPDF: 'contrat_syndic_2024-2026.pdf',
    dateUploadPDF: '2023-12-20',
    taciteReconduction: false,
    delaiResiliation: 90,
    telephone: '04 72 00 11 22',
    email: 'contact@syndic-lyon.fr',
    adresse: '15 place Bellecour, 69002 Lyon',
    documents: [
        { id: 'doc-syndic-1', nom: 'Mandat de gestion 2024-2027', type: 'MANDAT', url: 'mandat_2024.pdf', dateUpload: '2024-01-15' },
        { id: 'doc-syndic-2', nom: 'PV AG désignation syndic', type: 'PV_DESIGNATION', url: 'pv_designation.pdf', dateUpload: '2024-01-10' },
        { id: 'doc-syndic-3', nom: 'Avenant tarification 2024', type: 'AVENANT', url: 'avenant_tarif.pdf', dateUpload: '2024-03-20' }
    ]
};

/**
 * Interface Gestionnaire (représentant du syndic)
 */
export interface Gestionnaire {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    syndicId: string;
    syndicNom: string;
}

/**
 * Mock gestionnaires (représentants du syndic)
 */
export const MOCK_GESTIONNAIRES: Gestionnaire[] = [
    {
        id: 'gest-001',
        nom: 'DURAND',
        prenom: 'Claire',
        email: 'c.durand@syndic-lyon.fr',
        telephone: '04 72 00 11 23',
        syndicId: 'syndic-001',
        syndicNom: MOCK_CONTRAT_SYNDIC.nomSyndic
    },
    {
        id: 'gest-002',
        nom: 'MARTIN',
        prenom: 'Philippe',
        email: 'p.martin@syndic-lyon.fr',
        telephone: '04 72 00 11 24',
        syndicId: 'syndic-001',
        syndicNom: MOCK_CONTRAT_SYNDIC.nomSyndic
    }
];

// ========================================
// JOURNAL DE RECOUVREMENT (Notes impayés)
// ========================================

import type { NoteJournal } from '@/types/models/impaye';

/**
 * Mock des notes du journal de recouvrement
 * Triées par date décroissante (plus récent en premier)
 */
export const MOCK_NOTES_JOURNAL: NoteJournal[] = [
    {
        id: 'note-001',
        impayeId: 1,
        categorie: 'appel_telephonique',
        contenu: 'Appel M. Simon à 10h30. Explique des difficultés financières temporaires suite à perte d\'emploi. S\'engage à reprendre les paiements dès janvier. Propose un échéancier sur 6 mois pour apurer la dette.',
        auteurId: 'gest-001',
        auteurNom: 'Claire DURAND',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-12-20T10:45:00',
        piecesJointes: [],
        important: true,
        confidentiel: false
    },
    {
        id: 'note-002',
        impayeId: 1,
        categorie: 'decision_cs',
        contenu: 'Conseil Syndical du 15/12 : Accord pour proposer un échéancier à M. Simon sur 6 mois maximum. En cas de non-respect, passage immédiat en contentieux.',
        auteurId: 'gest-001',
        auteurNom: 'Claire DURAND',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-12-15T16:30:00',
        piecesJointes: [
            {
                id: 'pj-001',
                nom: 'CR_CS_20241215.pdf',
                type: 'application/pdf',
                taille: 245000,
                url: '/documents/cr_cs_20241215.pdf',
                dateUpload: '2024-12-15T17:00:00'
            }
        ],
        important: true,
        confidentiel: false
    },
    {
        id: 'note-003',
        impayeId: 1,
        categorie: 'courrier_recommande',
        contenu: 'Envoi courrier recommandé AR - 2ème relance. Numéro de suivi : 1A 234 567 890 FR',
        auteurId: 'gest-002',
        auteurNom: 'Philippe MARTIN',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-11-25T14:20:00',
        piecesJointes: [
            {
                id: 'pj-002',
                nom: 'AR_Simon_20241125.pdf',
                type: 'application/pdf',
                taille: 156000,
                url: '/documents/ar_simon_20241125.pdf',
                dateUpload: '2024-11-25T14:30:00'
            }
        ],
        important: false,
        confidentiel: false
    },
    {
        id: 'note-004',
        impayeId: 1,
        categorie: 'relance_amiable',
        contenu: 'Première relance envoyée par email. Aucune réponse après 10 jours.',
        auteurId: 'gest-001',
        auteurNom: 'Claire DURAND',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-10-20T09:15:00',
        piecesJointes: [],
        important: false,
        confidentiel: false
    },
    {
        id: 'note-005',
        impayeId: 4,
        categorie: 'echange_avocat',
        contenu: 'Entretien téléphonique avec Me Lefebvre. Recommande de poursuivre la procédure. Assignation à prévoir pour février 2025.',
        auteurId: 'gest-001',
        auteurNom: 'Claire DURAND',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-12-18T11:00:00',
        piecesJointes: [],
        important: true,
        confidentiel: true
    },
    {
        id: 'note-006',
        impayeId: 4,
        categorie: 'mise_en_demeure',
        contenu: 'Mise en demeure envoyée en RAR. Délai de 15 jours accordé avant contentieux.',
        auteurId: 'gest-002',
        auteurNom: 'Philippe MARTIN',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-11-01T10:30:00',
        piecesJointes: [
            {
                id: 'pj-003',
                nom: 'MED_Lopez_20241101.pdf',
                type: 'application/pdf',
                taille: 189000,
                url: '/documents/med_lopez_20241101.pdf',
                dateUpload: '2024-11-01T10:45:00'
            }
        ],
        important: true,
        confidentiel: false
    },
    {
        id: 'note-007',
        impayeId: 4,
        categorie: 'commandement_payer',
        contenu: 'Commandement de payer signifié par huissier SCP Martin & Associés. Mme Lopez absente, acte remis à voisin.',
        auteurId: 'gest-001',
        auteurNom: 'Claire DURAND',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-12-01T15:45:00',
        piecesJointes: [
            {
                id: 'pj-004',
                nom: 'CDP_Lopez_20241201.pdf',
                type: 'application/pdf',
                taille: 312000,
                url: '/documents/cdp_lopez_20241201.pdf',
                dateUpload: '2024-12-02T09:00:00'
            }
        ],
        important: true,
        confidentiel: false
    },
    {
        id: 'note-008',
        impayeId: 2,
        categorie: 'paiement_partiel',
        contenu: 'Réception virement de 500€ de Mme Garcia. Reste dû : 620€.',
        auteurId: 'gest-002',
        auteurNom: 'Philippe MARTIN',
        auteurRole: 'comptable',
        dateCreation: '2024-12-10T14:00:00',
        piecesJointes: [],
        important: false,
        confidentiel: false
    },
    {
        id: 'note-009',
        impayeId: 2,
        categorie: 'echeancier',
        contenu: 'Mise en place échéancier : 3 mensualités de 207€ (janvier à mars 2025). Accord signé.',
        auteurId: 'gest-001',
        auteurNom: 'Claire DURAND',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-12-12T16:30:00',
        piecesJointes: [
            {
                id: 'pj-005',
                nom: 'Echeancier_Garcia.pdf',
                type: 'application/pdf',
                taille: 98000,
                url: '/documents/echeancier_garcia.pdf',
                dateUpload: '2024-12-12T16:45:00'
            }
        ],
        important: true,
        confidentiel: false
    },
    {
        id: 'note-010',
        impayeId: 3,
        categorie: 'autre',
        contenu: 'Dossier à surveiller. M. Thomas généralement bon payeur, premier impayé depuis son arrivée il y a 3 ans.',
        auteurId: 'gest-001',
        auteurNom: 'Claire DURAND',
        auteurRole: 'gestionnaire',
        dateCreation: '2024-10-25T11:00:00',
        piecesJointes: [],
        important: false,
        confidentiel: false
    }
];

/**
 * Récupère les notes du journal pour un impayé donné
 */
export function getNotesJournalByImpayeId(impayeId: number): NoteJournal[] {
    return MOCK_NOTES_JOURNAL
        .filter(note => note.impayeId === impayeId)
        .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
}
