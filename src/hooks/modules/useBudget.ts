'use client';

import { useState, useMemo, useCallback } from 'react';
import { MOCK_DEPENSES_BUDGETS, DepenseEtendue } from '@/data/mock';
import {
  BudgetTab,
  PosteBudget,
  PosteBudgetData,
  BudgetTravaux,
  FondsALUR,
  CoproprietaireALUR,
  ResolutionAG,
  NouveauBudgetForm,
  AppelFonds,
  PieceJointeDepense,
  getProgressColor,
  getProgressPercentage,
  getProchainAppelPrevu,
  tousAppelsGeneres,
} from '@/components/features/finance/Budget/types';
import type { PosteEditorData } from '@/components/features/finance/Budget/PosteEditor';
import { BudgetStatut, DepenseStatut } from '@/types/enums/statuts';

// Interface pour les données N-1
export interface BudgetN1Data {
  year: number;
  postes: PosteEditorData[];
  total: number;
}

// Données mockées statiques
const MOCK_BUDGETS_TRAVAUX: BudgetTravaux[] = [
  {
    id: '1',
    titre: 'Isolation Thermique',
    description: 'Isolation des combles et murs extérieurs',
    budgetVote: 28000,
    devisAssocie: 27500,
    consomme: 12000,
    statut: 'EN_COURS',
    dateVote: '2024-05-20',
    cleRepartitionId: '1',
    echeancier: {
      mode: 'SEMESTRIEL',
      nombreAppels: 2,
      dateDebutEcheancier: '2024-06-01',
      resolutionAGId: 'res-isolation-2024',
      echeancesPrevues: [
        { numero: 1, montant: 14000, dateEcheance: '2024-06-01', description: '1er appel - 50%' },
        { numero: 2, montant: 14000, dateEcheance: '2024-12-01', description: '2ème appel - 50%' }
      ]
    },
    appelsDeFonds: [
      { id: '1', numero: 1, montant: 14000, date: '2024-06-01', dateEcheance: '2024-06-01', description: '1er appel - 50%', statut: 'PAYE' },
      { id: '2', numero: 2, montant: 14000, date: '2024-12-01', dateEcheance: '2024-12-01', description: '2ème appel - 50%', statut: 'EN_ATTENTE' }
    ],
    prestataires: [
      {
        id: 'prest-1',
        nom: 'IsolPro France',
        siret: '123 456 789 00012',
        contact: 'Jean Durand',
        telephone: '01 45 67 89 10',
        email: 'contact@isolpro.fr',
        metier: 'Isolation thermique'
      },
      {
        id: 'prest-2',
        nom: 'Échafaudages Martin',
        siret: '987 654 321 00034',
        contact: 'Marc Martin',
        telephone: '01 23 45 67 89',
        email: 'contact@echafaudages-martin.fr',
        metier: 'Échafaudages'
      }
    ],
    etapes: [
      {
        id: 'etape-1',
        ordre: 1,
        titre: 'Installation échafaudages',
        description: 'Mise en place des échafaudages sur la façade',
        dateDebutPrevue: '2024-06-15',
        dateFinPrevue: '2024-06-20',
        dateDebutReelle: '2024-06-15',
        dateFinReelle: '2024-06-18',
        statut: 'TERMINE',
        prestataireId: 'prest-2',
        montantPrevu: 2500,
        montantReel: 2500
      },
      {
        id: 'etape-2',
        ordre: 2,
        titre: 'Isolation des combles',
        description: 'Pose de laine de roche dans les combles',
        dateDebutPrevue: '2024-06-21',
        dateFinPrevue: '2024-07-15',
        dateDebutReelle: '2024-06-21',
        dateFinReelle: '2024-07-10',
        statut: 'TERMINE',
        prestataireId: 'prest-1',
        montantPrevu: 8000,
        montantReel: 7500
      },
      {
        id: 'etape-3',
        ordre: 3,
        titre: 'Isolation façade Nord',
        description: "Pose d'isolant et enduit sur façade Nord",
        dateDebutPrevue: '2024-07-16',
        dateFinPrevue: '2024-08-30',
        dateDebutReelle: '2024-07-16',
        statut: 'EN_COURS',
        prestataireId: 'prest-1',
        montantPrevu: 9000
      },
      {
        id: 'etape-4',
        ordre: 4,
        titre: 'Isolation façade Sud',
        description: "Pose d'isolant et enduit sur façade Sud",
        dateDebutPrevue: '2024-09-01',
        dateFinPrevue: '2024-10-15',
        statut: 'A_FAIRE',
        prestataireId: 'prest-1',
        montantPrevu: 8000
      },
      {
        id: 'etape-5',
        ordre: 5,
        titre: 'Démontage échafaudages',
        description: 'Retrait des échafaudages et nettoyage',
        dateDebutPrevue: '2024-10-16',
        dateFinPrevue: '2024-10-20',
        statut: 'A_FAIRE',
        prestataireId: 'prest-2',
        montantPrevu: 0
      }
    ],
    documents: [
      { id: 'doc-1', type: 'DEVIS', nom: 'Devis IsolPro - Isolation thermique.pdf', dateAjout: '2024-04-15', url: '/documents/travaux/devis-isolpro.pdf', taille: '2.4 MB' },
      { id: 'doc-2', type: 'CONTRAT', nom: 'Contrat travaux - IsolPro France.pdf', dateAjout: '2024-05-25', url: '/documents/travaux/contrat-isolpro.pdf', taille: '1.8 MB' },
      { id: 'doc-3', type: 'FACTURE', nom: 'Facture acompte - IsolPro.pdf', dateAjout: '2024-06-01', url: '/documents/travaux/facture-acompte-isolpro.pdf', taille: '450 KB' },
      { id: 'doc-4', type: 'PHOTO', nom: 'Photo avancement - Juillet 2024.jpg', dateAjout: '2024-07-15', url: '/documents/travaux/photo-avancement-juillet.jpg', taille: '3.2 MB' },
      { id: 'doc-5', type: 'FACTURE', nom: 'Facture étape 2 - Combles.pdf', dateAjout: '2024-07-12', url: '/documents/travaux/facture-combles.pdf', taille: '520 KB' }
    ],
    historique: [
      { id: 'hist-1', date: '2024-05-20', type: 'VOTE_AG', titre: 'Vote en AG', description: "Budget voté à l'unanimité lors de l'AG du 20 mai 2024", montant: 28000 },
      { id: 'hist-2', date: '2024-05-25', type: 'DEVIS_ACCEPTE', titre: 'Devis accepté', description: 'Devis IsolPro France accepté pour 27 500 €', montant: 27500, documentId: 'doc-1' },
      { id: 'hist-3', date: '2024-06-01', type: 'PAIEMENT', titre: 'Acompte versé', description: "Versement de l'acompte de 30% au prestataire", montant: 8250, documentId: 'doc-3' },
      { id: 'hist-4', date: '2024-06-15', type: 'DEBUT_TRAVAUX', titre: 'Début des travaux', description: 'Installation des échafaudages et début du chantier' },
      { id: 'hist-5', date: '2024-07-10', type: 'ETAPE_TERMINEE', titre: 'Isolation combles terminée', description: "L'isolation des combles a été achevée avec 5 jours d'avance" },
      { id: 'hist-6', date: '2024-07-12', type: 'FACTURE_RECUE', titre: 'Facture étape 2', description: "Réception de la facture pour l'isolation des combles", montant: 7500, documentId: 'doc-5' },
      { id: 'hist-7', date: '2024-07-16', type: 'AUTRE', titre: 'Début isolation façade Nord', description: "Démarrage de la pose d'isolant sur la façade Nord" }
    ]
  },
  {
    id: '2',
    titre: 'Rénovation Éclairage',
    description: 'Remplacement des éclairages par LED',
    budgetVote: 5500,
    devisAssocie: 5200,
    consomme: 0,
    statut: 'A_VENIR',
    dateVote: '2024-05-20',
    cleRepartitionId: '1',
    echeancier: {
      mode: 'TRIMESTRIEL',
      nombreAppels: 4,
      dateDebutEcheancier: '2025-01-01',
      resolutionAGId: 'res-eclairage-2024',
      echeancesPrevues: [
        { numero: 1, montant: 1375, dateEcheance: '2025-01-01', description: '1er trimestre - 25%' },
        { numero: 2, montant: 1375, dateEcheance: '2025-04-01', description: '2ème trimestre - 25%' },
        { numero: 3, montant: 1375, dateEcheance: '2025-07-01', description: '3ème trimestre - 25%' },
        { numero: 4, montant: 1375, dateEcheance: '2025-10-01', description: '4ème trimestre - 25%' }
      ]
    },
    appelsDeFonds: [],
    prestataires: [
      { id: 'prest-3', nom: 'Électricité Moderne', siret: '456 789 123 00056', contact: 'Sophie Lemaire', telephone: '01 98 76 54 32', email: 'contact@elec-moderne.fr', metier: 'Électricité générale' }
    ],
    etapes: [
      { id: 'etape-6', ordre: 1, titre: 'Audit éclairage existant', description: 'Inventaire et analyse des points lumineux actuels', dateDebutPrevue: '2025-01-15', dateFinPrevue: '2025-01-20', statut: 'A_FAIRE', prestataireId: 'prest-3', montantPrevu: 500 },
      { id: 'etape-7', ordre: 2, titre: 'Remplacement parties communes', description: 'Installation des nouveaux luminaires LED dans les couloirs et halls', dateDebutPrevue: '2025-01-21', dateFinPrevue: '2025-02-15', statut: 'A_FAIRE', prestataireId: 'prest-3', montantPrevu: 3200 },
      { id: 'etape-8', ordre: 3, titre: 'Remplacement parking', description: 'Installation des luminaires LED dans le parking souterrain', dateDebutPrevue: '2025-02-16', dateFinPrevue: '2025-02-28', statut: 'A_FAIRE', prestataireId: 'prest-3', montantPrevu: 1500 }
    ],
    documents: [
      { id: 'doc-6', type: 'DEVIS', nom: 'Devis Électricité Moderne - LED.pdf', dateAjout: '2024-04-10', url: '/documents/travaux/devis-elec-moderne.pdf', taille: '1.1 MB' }
    ],
    historique: [
      { id: 'hist-8', date: '2024-05-20', type: 'VOTE_AG', titre: 'Vote en AG', description: "Budget voté à la majorité (art. 24) lors de l'AG du 20 mai 2024", montant: 5500 },
      { id: 'hist-9', date: '2024-05-28', type: 'DEVIS_ACCEPTE', titre: 'Devis accepté', description: 'Devis Électricité Moderne accepté pour 5 200 €', montant: 5200, documentId: 'doc-6' }
    ]
  }
];

const MOCK_FONDS_ALUR: FondsALUR = {
  soldeActuel: 24500,
  cotisationAnnuelle: 4250,
  pourcentageBudget: 5,
  historiqueTransferts: [
    { id: '1', montant: 14000, date: '2024-06-01', destination: 'BUDGET_TRAVAUX', budgetTravauxId: '1', description: 'Transfert pour Isolation Thermique (1er appel)' }
  ]
};

const MOCK_COPROPRIETAIRES_ALUR: CoproprietaireALUR[] = [
  {
    id: '1', nom: 'Martin Pierre', lot: 'Appartement A1', tantiemes: 150, cotisationAnnuelle: 637.50, totalContributions: 3825.00,
    historiqueContributions: [
      { id: '1', date: '2024-01-15', montant: 159.38, periode: 'T1 2024', statut: 'PAYEE' },
      { id: '2', date: '2024-04-15', montant: 159.38, periode: 'T2 2024', statut: 'PAYEE' },
      { id: '3', date: '2024-07-15', montant: 159.38, periode: 'T3 2024', statut: 'PAYEE' },
      { id: '4', date: '2024-10-15', montant: 159.38, periode: 'T4 2024', statut: 'EN_ATTENTE' }
    ],
    historiqueProprietaires: [{ proprietaire: 'Martin Pierre', dateDebut: '2020-03-01', contributionsCumulees: 3825.00 }]
  },
  {
    id: '2', nom: 'Dupont Marie', lot: 'Appartement A2', tantiemes: 120, cotisationAnnuelle: 510.00, totalContributions: 4080.00,
    historiqueContributions: [
      { id: '5', date: '2024-01-15', montant: 127.50, periode: 'T1 2024', statut: 'PAYEE' },
      { id: '6', date: '2024-04-15', montant: 127.50, periode: 'T2 2024', statut: 'PAYEE' },
      { id: '7', date: '2024-07-15', montant: 127.50, periode: 'T3 2024', statut: 'PAYEE' },
      { id: '8', date: '2024-10-15', montant: 127.50, periode: 'T4 2024', statut: 'EN_ATTENTE' }
    ],
    historiqueProprietaires: [
      { proprietaire: 'Bernard Jean', dateDebut: '2019-01-01', dateFin: '2023-06-15', contributionsCumulees: 2295.00 },
      { proprietaire: 'Dupont Marie', dateDebut: '2023-06-15', contributionsCumulees: 1785.00 }
    ]
  },
  {
    id: '3', nom: 'Lambert Sophie', lot: 'Appartement B1', tantiemes: 200, cotisationAnnuelle: 850.00, totalContributions: 5100.00,
    historiqueContributions: [
      { id: '9', date: '2024-01-15', montant: 212.50, periode: 'T1 2024', statut: 'PAYEE' },
      { id: '10', date: '2024-04-15', montant: 212.50, periode: 'T2 2024', statut: 'PAYEE' },
      { id: '11', date: '2024-07-15', montant: 212.50, periode: 'T3 2024', statut: 'PAYEE' },
      { id: '12', date: '2024-10-15', montant: 212.50, periode: 'T4 2024', statut: 'EN_RETARD' }
    ],
    historiqueProprietaires: [{ proprietaire: 'Lambert Sophie', dateDebut: '2018-09-01', contributionsCumulees: 5100.00 }]
  },
  {
    id: '4', nom: 'SCI Les Ormes', lot: 'Commerce RDC', tantiemes: 300, cotisationAnnuelle: 1275.00, totalContributions: 7650.00,
    historiqueContributions: [
      { id: '13', date: '2024-01-15', montant: 318.75, periode: 'T1 2024', statut: 'PAYEE' },
      { id: '14', date: '2024-04-15', montant: 318.75, periode: 'T2 2024', statut: 'PAYEE' },
      { id: '15', date: '2024-07-15', montant: 318.75, periode: 'T3 2024', statut: 'PAYEE' },
      { id: '16', date: '2024-10-15', montant: 318.75, periode: 'T4 2024', statut: 'PAYEE' }
    ],
    historiqueProprietaires: [{ proprietaire: 'SCI Les Ormes', dateDebut: '2017-01-01', contributionsCumulees: 7650.00 }]
  },
  {
    id: '5', nom: 'Rodriguez Carlos', lot: 'Appartement B2', tantiemes: 130, cotisationAnnuelle: 552.50, totalContributions: 3867.50,
    historiqueContributions: [
      { id: '17', date: '2024-01-15', montant: 138.13, periode: 'T1 2024', statut: 'PAYEE' },
      { id: '18', date: '2024-04-15', montant: 138.13, periode: 'T2 2024', statut: 'PAYEE' },
      { id: '19', date: '2024-07-15', montant: 138.13, periode: 'T3 2024', statut: 'PAYEE' },
      { id: '20', date: '2024-10-15', montant: 138.13, periode: 'T4 2024', statut: 'EN_ATTENTE' }
    ],
    historiqueProprietaires: [
      { proprietaire: 'Moreau Alice', dateDebut: '2018-01-01', dateFin: '2021-03-01', contributionsCumulees: 1657.50 },
      { proprietaire: 'Petit François', dateDebut: '2021-03-01', dateFin: '2024-01-15', contributionsCumulees: 1657.50 },
      { proprietaire: 'Rodriguez Carlos', dateDebut: '2024-01-15', contributionsCumulees: 552.50 }
    ]
  }
];

const MOCK_RESOLUTIONS_AG: ResolutionAG[] = [
  { id: 'res-1', numero: '2024-AG-001', titre: 'Adoption du budget prévisionnel 2025', dateAG: '2024-11-15', type: 'BUDGET_FONCTIONNEMENT', montantVote: 87500, majorite: 'Article 24', statut: 'ADOPTEE' },
  { id: 'res-2', numero: '2024-AG-002', titre: 'Travaux de ravalement de façade', dateAG: '2024-11-15', type: 'BUDGET_TRAVAUX', montantVote: 45000, majorite: 'Article 25', statut: 'ADOPTEE' },
  { id: 'res-3', numero: '2024-AG-003', titre: 'Cotisation Fonds ALUR 2025', dateAG: '2024-11-15', type: 'FONDS_ALUR', montantVote: 4375, majorite: 'Article 24', statut: 'ADOPTEE' },
  { id: 'res-4', numero: '2024-AG-004', titre: 'Réfection des parties communes', dateAG: '2024-11-15', type: 'BUDGET_TRAVAUX', montantVote: 25000, majorite: 'Article 25', statut: 'REPORTEE' },
  { id: 'res-5', numero: '2025-AG-001', titre: 'Budget prévisionnel 2026', dateAG: '2025-11-15', type: 'BUDGET_FONCTIONNEMENT', montantVote: 92000, majorite: 'Article 24', statut: 'EN_ATTENTE' },
  { id: 'res-6', numero: '2025-AG-002', titre: 'Travaux de mise aux normes ascenseur', dateAG: '2025-11-15', type: 'BUDGET_TRAVAUX', montantVote: 35000, majorite: 'Article 25', statut: 'EN_ATTENTE' }
];

// Type pour un budget avec son statut
export interface BudgetWithStatus {
  id: string;
  nom?: string;
  type: 'fonctionnement' | 'travaux';
  annee: number;
  montantTotal: number;
  statut: BudgetStatut;
  resolutionId?: string;
  lignesBudget?: Array<{
    poste: string;
    montantN: number;
    montantN1: number;
    evolution: number;
  }>;
}

export function useBudget() {
  // États UI
  const [activeTab, setActiveTab] = useState<BudgetTab>('fonctionnement');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedBudgetTravaux, setSelectedBudgetTravaux] = useState<string | null>(null);
  const [selectedPoste, setSelectedPoste] = useState<PosteBudget | null>(null);
  const [selectedDepense, setSelectedDepense] = useState<DepenseEtendue | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [showTravauxDetailModal, setShowTravauxDetailModal] = useState(false);
  const [selectedTravauxDetail, setSelectedTravauxDetail] = useState<BudgetTravaux | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'historique' | 'etapes' | 'prestataires' | 'documents'>('historique');
  const [selectedCoproprietaireALUR, setSelectedCoproprietaireALUR] = useState<CoproprietaireALUR | null>(null);
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  const [showTransformBudgetModal, setShowTransformBudgetModal] = useState(false);
  const [showLinkToAGModal, setShowLinkToAGModal] = useState(false);
  const [selectedBudgetForLink, setSelectedBudgetForLink] = useState<BudgetWithStatus | null>(null);
  const [selectedBudgetForTransform, setSelectedBudgetForTransform] = useState<BudgetWithStatus | null>(null);

  // États pour le modal nouvel appel de fonds travaux
  const [showNewAppelFondsModal, setShowNewAppelFondsModal] = useState(false);
  const [selectedTravauxForAppel, setSelectedTravauxForAppel] = useState<BudgetTravaux | null>(null);

  // État pour le filtre par poste dans le graphique interactif
  const [posteActifChart, setPosteActifChart] = useState<PosteBudget | null>(null);

  // État pour les budgets travaux (permet la modification)
  const [budgetsTravaux, setBudgetsTravaux] = useState<BudgetTravaux[]>(MOCK_BUDGETS_TRAVAUX);

  // États pour la gestion des dépenses
  const [depenses, setDepenses] = useState<DepenseEtendue[]>(() => {
    // Initialiser les dépenses mockées avec un statut par défaut si non défini
    return MOCK_DEPENSES_BUDGETS.map(d => ({
      ...d,
      statut: d.statut || 'VALIDEE' // Les dépenses existantes sont considérées comme validées
    }));
  });
  const [showDepenseEditorModal, setShowDepenseEditorModal] = useState(false);
  const [showInvoicePickerModal, setShowInvoicePickerModal] = useState(false);
  const [editingDepense, setEditingDepense] = useState<DepenseEtendue | null>(null);
  const [depenseEditorMode, setDepenseEditorMode] = useState<'create' | 'edit'>('create');

  // Donnees initiales par defaut
  const DEFAULT_BUDGETS: BudgetWithStatus[] = [
    {
      id: 'budget-2025-fonct',
      nom: 'Budget previsionnel 2025',
      type: 'fonctionnement',
      annee: 2025,
      montantTotal: 87500,
      statut: BudgetStatut.APPROUVE,
      resolutionId: 'res-1',
      lignesBudget: [
        { poste: 'Eau', montantN: 12000, montantN1: 11500, evolution: 4.3 },
        { poste: 'Électricité', montantN: 8500, montantN1: 8200, evolution: 3.7 },
        { poste: 'Assurance', montantN: 18500, montantN1: 18000, evolution: 2.8 },
        { poste: 'Ménage', montantN: 15000, montantN1: 14500, evolution: 3.4 },
        { poste: 'Ascenseur', montantN: 12000, montantN1: 11800, evolution: 1.7 },
        { poste: 'Espaces verts', montantN: 11000, montantN1: 10500, evolution: 4.8 },
        { poste: 'Divers', montantN: 10500, montantN1: 10000, evolution: 5.0 }
      ]
    },
    {
      id: 'budget-2025-travaux',
      nom: 'Ravalement facade',
      type: 'travaux',
      annee: 2025,
      montantTotal: 45000,
      statut: BudgetStatut.APPROUVE,
      resolutionId: 'res-2',
      lignesBudget: [
        { poste: 'Echafaudages', montantN: 8000, montantN1: 0, evolution: 0 },
        { poste: 'Nettoyage facade', montantN: 12000, montantN1: 0, evolution: 0 },
        { poste: 'Reparation fissures', montantN: 10000, montantN1: 0, evolution: 0 },
        { poste: 'Peinture', montantN: 15000, montantN1: 0, evolution: 0 }
      ]
    },
    {
      id: 'budget-2026-fonct',
      nom: 'Budget previsionnel 2026',
      type: 'fonctionnement',
      annee: 2026,
      montantTotal: 0,
      statut: BudgetStatut.BROUILLON,
      lignesBudget: []
    }
  ];

  // Liste des budgets crees (charge depuis localStorage)
  const [budgets, setBudgets] = useState<BudgetWithStatus[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_BUDGETS;
    try {
      const saved = localStorage.getItem('coproflex-budgets');
      if (saved) {
        return JSON.parse(saved);
      }
      // Sauvegarder les budgets par defaut dans localStorage pour la page detail
      localStorage.setItem('coproflex-budgets', JSON.stringify(DEFAULT_BUDGETS));
    } catch (e) {
      console.error('Erreur lors du chargement des budgets:', e);
    }
    return DEFAULT_BUDGETS;
  });

  // Budget de fonctionnement de l'année sélectionnée
  // Source unique de vérité : on récupère le montantTotal du budget de fonctionnement
  const budgetFonctionnementAnnee = useMemo(() => {
    return budgets.find(b => b.type === 'fonctionnement' && b.annee === selectedYear);
  }, [budgets, selectedYear]);

  // Le budget annuel voté est le montantTotal du budget de fonctionnement
  // S'il n'existe pas, on calcule à partir des postes budgétaires
  const budgetAnnuelVote = budgetFonctionnementAnnee?.montantTotal || 0;

  // Calcul des consommations par poste (seules les dépenses VALIDEES comptent)
  const calculateConsommeByPoste = useCallback((poste: PosteBudget): number => {
    return depenses
      .filter(d => d.poste === poste && d.statut === 'VALIDEE')
      .reduce((sum, d) => sum + d.montant, 0);
  }, [depenses]);

  // Calcul des montants en attente de validation par poste
  const calculatePendingByPoste = useCallback((poste: PosteBudget): number => {
    return depenses
      .filter(d => d.poste === poste && d.statut !== 'VALIDEE' && d.statut !== 'REJETEE')
      .reduce((sum, d) => sum + d.montant, 0);
  }, [depenses]);

  // Postes budgétaires - montants alignés sur le budget voté (87 500€ total)
  const postesBudget: PosteBudgetData[] = useMemo(() => [
    { poste: 'eau', label: 'Eau', budgetVote: 12000, consomme: calculateConsommeByPoste('eau') },
    { poste: 'electricite', label: 'Électricité', budgetVote: 8500, consomme: calculateConsommeByPoste('electricite') },
    { poste: 'assurance', label: 'Assurance', budgetVote: 18500, consomme: calculateConsommeByPoste('assurance') },
    { poste: 'menage', label: 'Ménage', budgetVote: 15000, consomme: calculateConsommeByPoste('menage') },
    { poste: 'ascenseur', label: 'Ascenseur', budgetVote: 12000, consomme: calculateConsommeByPoste('ascenseur') },
    { poste: 'espaces_verts', label: 'Espaces verts', budgetVote: 11000, consomme: calculateConsommeByPoste('espaces_verts') },
    { poste: 'divers', label: 'Divers', budgetVote: 10500, consomme: calculateConsommeByPoste('divers') }
  ], []);

  // Formulaire de création de budget
  const [newBudgetForm, setNewBudgetForm] = useState<NouveauBudgetForm>({
    annee: 2025,
    type: 'fonctionnement',
    resolutionId: undefined,
    montantTotal: 0,
    statut: BudgetStatut.BROUILLON,
    lignesBudget: postesBudget.map(p => ({
      poste: p.label,
      montantN: p.budgetVote,
      montantN1: Math.round(p.budgetVote * 1.02),
      evolution: 2
    }))
  });

  // Calculs dérivés avec projection intelligente
  const totals = useMemo(() => {
    const totalConsomme = postesBudget.reduce((sum, p) => sum + p.consomme, 0);
    const budgetRestant = budgetAnnuelVote - totalConsomme;
    const totalBudget = postesBudget.reduce((sum, p) => sum + p.budgetVote, 0);

    const currentMonth = new Date().getMonth() + 1;
    const monthsElapsed = currentMonth;
    const monthsRemaining = 12 - monthsElapsed;
    const avgMonthlyConsumption = monthsElapsed > 0 ? totalConsomme / monthsElapsed : 0;

    // Projection brute basée sur l'extrapolation linéaire
    const projectionBrute = totalConsomme + (avgMonthlyConsumption * monthsRemaining);

    // Indice de fiabilité (0 à 1) - augmente avec le nombre de mois de données
    // 1-2 mois : fiabilité faible (0.17-0.33), 3-5 mois : moyenne (0.5-0.83), 6+ mois : haute (1)
    const fiabilite = Math.min(1, monthsElapsed / 6);

    // Projection pondérée : mélange entre extrapolation et budget voté
    // Moins on a de données, plus on se rapproche du budget voté
    const projectedYearEnd = Math.round(
      fiabilite * projectionBrute + (1 - fiabilite) * budgetAnnuelVote
    );

    // Calcul de l'intervalle de confiance (marge d'erreur)
    // Plus on a de données, plus l'intervalle est serré
    const margeErreur = (1 - fiabilite) * 0.3; // 30% d'erreur max à 1 mois, 0% à 6 mois
    const projectionMin = Math.round(projectedYearEnd * (1 - margeErreur));
    const projectionMax = Math.round(projectedYearEnd * (1 + margeErreur));

    const projectedDifference = budgetAnnuelVote - projectedYearEnd;

    // Niveau de fiabilité textuel
    let fiabiliteNiveau: 'faible' | 'moyenne' | 'bonne';
    if (monthsElapsed < 3) {
      fiabiliteNiveau = 'faible';
    } else if (monthsElapsed < 6) {
      fiabiliteNiveau = 'moyenne';
    } else {
      fiabiliteNiveau = 'bonne';
    }

    return {
      totalConsomme,
      budgetRestant,
      totalBudget,
      projectedYearEnd,
      projectedDifference,
      monthsElapsed,
      monthsRemaining,
      avgMonthlyConsumption,
      projectionMin,
      projectionMax,
      fiabilite,
      fiabiliteNiveau
    };
  }, [postesBudget, budgetAnnuelVote]);

  // Postes en alerte
  const postesEnAlerte = useMemo(() =>
    postesBudget.filter(p => (p.consomme / p.budgetVote) * 100 >= 90),
    [postesBudget]
  );

  // Dernières dépenses (utilise l'état des dépenses)
  const dernieresDepenses = useMemo(() =>
    depenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10),
    [depenses]
  );

  // Dépenses filtrées par poste actif (pour le graphique interactif)
  const depensesFiltrees = useMemo(() => {
    if (!posteActifChart) return dernieresDepenses;
    return depenses
      .filter(d => d.poste === posteActifChart)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [depenses, dernieresDepenses, posteActifChart]);

  // Handler pour sélectionner un poste dans le graphique
  const handlePosteChartSelect = useCallback((posteId: PosteBudget | null) => {
    setPosteActifChart(posteId);
  }, []);

  // Handlers
  const handleOpenTravauxDetail = (travaux: BudgetTravaux) => {
    setSelectedTravauxDetail(travaux);
    setActiveDetailTab('historique');
    setShowTravauxDetailModal(true);
  };

  const handleTransferALUR = (montant: number, destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX', _budgetId?: string) => {
    alert(`Transfert de ${montant}€ vers ${destination === 'COMPTE_COURANT' ? 'Compte courant' : 'Budget travaux'}`);
    setShowTransferModal(false);
  };

  const handleCreateBudgetFromResolution = (resolution: ResolutionAG) => {
    setNewBudgetForm(prev => ({
      ...prev,
      type: resolution.type === 'BUDGET_FONCTIONNEMENT' ? 'fonctionnement' : 'travaux',
      resolutionId: resolution.id,
      montantTotal: resolution.montantVote
    }));
    setShowCreateBudgetModal(true);
  };

  const handleTransformToAppele = () => {
    alert('Budget transformé en appels de fonds !\n\nLes appels de fonds trimestriels ont été générés automatiquement.');
    setShowTransformBudgetModal(false);
  };

  // Verifier si un budget existe deja pour une annee et un type donnes
  const checkBudgetExists = useCallback((annee: number, type: 'fonctionnement' | 'travaux', excludeId?: string): BudgetWithStatus | undefined => {
    return budgets.find(b =>
      b.annee === annee &&
      b.type === type &&
      b.id !== excludeId &&
      b.statut !== BudgetStatut.REJETE // Les budgets rejetes ne comptent pas
    );
  }, [budgets]);

  // Creer un nouveau budget (en BROUILLON)
  const handleCreateBudget = useCallback((form: NouveauBudgetForm): boolean => {
    // Cas spécifique pour les budgets travaux
    if (form.type === 'travaux') {
      // Créer un BudgetTravaux complet et l'ajouter à budgetsTravaux
      const newBudgetTravaux: BudgetTravaux = {
        id: `travaux-${Date.now()}`,
        titre: form.nom || `Travaux ${form.annee}`,
        description: form.description || '',
        typeTravaux: form.typeTravaux,
        budgetVote: form.montantTotal,
        devisAssocie: form.devisDocuments?.reduce((sum, d) => sum + d.montant, 0) || 0,
        consomme: 0,
        statut: 'A_VENIR',
        dateVote: new Date().toISOString().split('T')[0],
        cleRepartitionId: '1', // Clé par défaut, à modifier ultérieurement
        appelsDeFonds: [],
        devisDocuments: form.devisDocuments || [],
        prestataires: [],
        etapes: [],
        documents: [],
        historique: [{
          id: `hist-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'AUTRE',
          titre: 'Création du budget',
          description: `Budget travaux créé en brouillon pour ${form.montantTotal.toLocaleString('fr-FR')} €`,
          montant: form.montantTotal,
        }],
      };

      setBudgetsTravaux(prev => {
        const updated = [...prev, newBudgetTravaux];
        // Persistance localStorage pour les budgets travaux
        localStorage.setItem('coproflex-budgets-travaux', JSON.stringify(updated));
        return updated;
      });

      setShowCreateBudgetModal(false);
      return true;
    }

    // Cas des budgets de fonctionnement
    // Verification des doublons
    const existant = checkBudgetExists(form.annee, form.type);
    if (existant) {
      const continuer = window.confirm(
        `Un budget ${form.type} existe deja pour l'annee ${form.annee} ` +
        `(${existant.nom || 'Sans nom'}, statut: ${existant.statut}).\n\n` +
        `Voulez-vous quand meme creer un nouveau budget ?`
      );
      if (!continuer) {
        return false;
      }
    }

    const newBudget: BudgetWithStatus = {
      id: `budget-${Date.now()}`,
      nom: form.nom,
      type: form.type,
      annee: form.annee,
      montantTotal: form.montantTotal,
      statut: BudgetStatut.BROUILLON,
      resolutionId: undefined
    };

    setBudgets(prev => {
      const updated = [...prev, newBudget];
      // Persistance localStorage
      localStorage.setItem('coproflex-budgets', JSON.stringify(updated));
      return updated;
    });

    setShowCreateBudgetModal(false);
    return true;
  }, [checkBudgetExists]);

  // Mettre a jour un budget existant
  const handleUpdateBudget = useCallback((budgetId: string, updates: Partial<BudgetWithStatus>) => {
    setBudgets(prev => {
      const updated = prev.map(b =>
        b.id === budgetId ? { ...b, ...updates } : b
      );
      localStorage.setItem('coproflex-budgets', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Supprimer un budget (seulement les brouillons)
  const handleDeleteBudget = useCallback((budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return;

    if (budget.statut !== BudgetStatut.BROUILLON) {
      alert('Seuls les budgets en brouillon peuvent etre supprimes.');
      return;
    }

    const confirmer = window.confirm(
      `Etes-vous sur de vouloir supprimer le budget "${budget.nom || `Budget ${budget.type} ${budget.annee}`}" ?\n\n` +
      `Cette action est irreversible.`
    );

    if (!confirmer) return;

    setBudgets(prev => {
      const updated = prev.filter(b => b.id !== budgetId);
      localStorage.setItem('coproflex-budgets', JSON.stringify(updated));
      return updated;
    });
  }, [budgets]);

  // Lier un budget a une resolution AG
  const handleLinkToAG = useCallback((budgetId: string, resolutionId: string) => {
    setBudgets(prev => {
      const updated = prev.map(b =>
        b.id === budgetId
          ? { ...b, statut: BudgetStatut.EN_ATTENTE_APPROBATION, resolutionId }
          : b
      );
      localStorage.setItem('coproflex-budgets', JSON.stringify(updated));
      return updated;
    });
    setShowLinkToAGModal(false);
    setSelectedBudgetForLink(null);
  }, []);

  // Ouvrir le modal de liaison AG
  const handleOpenLinkToAG = (budget: BudgetWithStatus) => {
    setSelectedBudgetForLink(budget);
    setShowLinkToAGModal(true);
  };

  // Ouvrir le modal de transformation en appels de fonds
  const handleOpenTransformModal = (budget: BudgetWithStatus) => {
    setSelectedBudgetForTransform(budget);
    setShowTransformBudgetModal(true);
  };

  // Verifier si les appels de fonds peuvent etre generes
  const canGenerateFundCalls = (budget: BudgetWithStatus): boolean => {
    return budget.statut === BudgetStatut.APPROUVE;
  };

  // Ouvrir le modal nouvel appel de fonds travaux
  const handleOpenNewAppelFonds = (travaux: BudgetTravaux) => {
    setSelectedTravauxForAppel(travaux);
    setShowNewAppelFondsModal(true);
  };

  // Générer le prochain appel de fonds selon l'échéancier voté en AG
  const handleGenerateProchainAppel = (travauxId: string) => {
    const travaux = budgetsTravaux.find(bt => bt.id === travauxId);
    if (!travaux) return;

    // Vérifier si tous les appels ont été générés
    if (tousAppelsGeneres(travaux)) {
      alert('Tous les appels de fonds prévus ont déjà été générés.');
      return;
    }

    // Récupérer le prochain appel prévu selon l'échéancier
    const prochainAppel = getProchainAppelPrevu(travaux);
    if (!prochainAppel) {
      alert('Aucun échéancier défini pour ce budget travaux.');
      return;
    }

    const newAppel: AppelFonds = {
      id: `appel-${Date.now()}`,
      numero: prochainAppel.numero,
      montant: prochainAppel.montant,
      date: new Date().toISOString().split('T')[0],
      dateEcheance: prochainAppel.dateEcheance,
      description: prochainAppel.description,
      statut: 'EN_ATTENTE',
    };

    setBudgetsTravaux(prev =>
      prev.map(bt =>
        bt.id === travauxId
          ? { ...bt, appelsDeFonds: [...bt.appelsDeFonds, newAppel] }
          : bt
      )
    );

    setShowNewAppelFondsModal(false);
    setSelectedTravauxForAppel(null);
    alert(`Appel de fonds n°${prochainAppel.numero} de ${prochainAppel.montant.toLocaleString('fr-FR')} € généré avec succès.`);
  };

  // === HANDLERS GESTION DES DÉPENSES ===

  // Créer une nouvelle dépense
  const handleCreateDepense = useCallback(() => {
    setEditingDepense(null);
    setDepenseEditorMode('create');
    setShowDepenseEditorModal(true);
  }, []);

  // Éditer une dépense existante
  const handleEditDepense = useCallback((depense: DepenseEtendue) => {
    if (depense.statut === 'VALIDEE') {
      alert('Les dépenses validées ne peuvent pas être modifiées.');
      return;
    }
    setEditingDepense(depense);
    setDepenseEditorMode('edit');
    setShowDepenseEditorModal(true);
  }, []);

  // Sauvegarder une dépense (création ou mise à jour)
  const handleSaveDepense = useCallback((depense: DepenseEtendue) => {
    if (depenseEditorMode === 'create') {
      const newDepense: DepenseEtendue = {
        ...depense,
        id: `dep-${Date.now()}`,
        statut: 'BROUILLON',
        dateCreation: new Date().toISOString(),
        dateDerniereModification: new Date().toISOString(),
      };
      setDepenses(prev => [...prev, newDepense]);
    } else {
      setDepenses(prev =>
        prev.map(d =>
          d.id === depense.id
            ? { ...depense, dateDerniereModification: new Date().toISOString() }
            : d
        )
      );
    }
    setShowDepenseEditorModal(false);
    setEditingDepense(null);
  }, [depenseEditorMode]);

  // Soumettre une dépense pour validation
  const handleSubmitForValidation = useCallback((depenseId: string) => {
    const depense = depenses.find(d => d.id === depenseId);
    if (!depense) return;

    // Vérifier que la pièce jointe est présente
    if (!depense.pieceJointe && !depense.pieceJointeDetails) {
      alert('Une pièce justificative (facture) est obligatoire pour soumettre à validation.');
      return;
    }

    setDepenses(prev =>
      prev.map(d =>
        d.id === depenseId
          ? { ...d, statut: 'EN_ATTENTE_VALIDATION' as const }
          : d
      )
    );
    alert('Dépense soumise pour validation.');
  }, [depenses]);

  // Valider une dépense
  const handleValidateDepense = useCallback((depenseId: string) => {
    setDepenses(prev =>
      prev.map(d =>
        d.id === depenseId
          ? {
              ...d,
              statut: 'VALIDEE' as const,
              dateValidation: new Date().toISOString(),
            }
          : d
      )
    );
    alert('Dépense validée. Elle impacte maintenant le budget.');
  }, []);

  // Rejeter une dépense
  const handleRejectDepense = useCallback((depenseId: string, commentaire: string) => {
    setDepenses(prev =>
      prev.map(d =>
        d.id === depenseId
          ? {
              ...d,
              statut: 'REJETEE' as const,
              commentaireRejet: commentaire,
            }
          : d
      )
    );
    alert('Dépense rejetée.');
  }, []);

  // Lier une facture à une dépense en cours d'édition
  const handleLinkInvoiceToDepense = useCallback((pieceJointe: PieceJointeDepense) => {
    if (editingDepense) {
      setEditingDepense({
        ...editingDepense,
        pieceJointe: pieceJointe.fichierNom,
        pieceJointeDetails: pieceJointe,
      });
    }
    setShowInvoicePickerModal(false);
  }, [editingDepense]);

  // Vérifier si une dépense peut être soumise pour validation
  const canSubmitForValidation = useCallback((depense: DepenseEtendue): boolean => {
    return !!(
      (depense.pieceJointe || depense.pieceJointeDetails) &&
      depense.poste &&
      depense.montant > 0 &&
      depense.fournisseur &&
      depense.statut === 'BROUILLON'
    );
  }, []);

  // Récupérer les données du budget N-1 pour la reprise
  const getBudgetN1 = useCallback((year: number): BudgetN1Data | undefined => {
    // Simuler les données N-1 pour 2024
    if (year !== 2024) return undefined;

    const postesN1: PosteEditorData[] = postesBudget.map((p, index) => ({
      id: `n1-${p.poste}-${index}`,
      libelle: p.label,
      montant: p.budgetVote,
      posteId: p.poste,
    }));

    return {
      year: 2024,
      postes: postesN1,
      total: postesN1.reduce((sum, p) => sum + p.montant, 0),
    };
  }, [postesBudget]);

  return {
    // État UI
    activeTab,
    setActiveTab,
    selectedYear,
    setSelectedYear,
    showTransferModal,
    setShowTransferModal,
    selectedBudgetTravaux,
    setSelectedBudgetTravaux,
    selectedPoste,
    setSelectedPoste,
    selectedDepense,
    setSelectedDepense,
    viewingDocument,
    setViewingDocument,
    showTravauxDetailModal,
    setShowTravauxDetailModal,
    selectedTravauxDetail,
    setSelectedTravauxDetail,
    activeDetailTab,
    setActiveDetailTab,
    selectedCoproprietaireALUR,
    setSelectedCoproprietaireALUR,
    showCreateBudgetModal,
    setShowCreateBudgetModal,
    showTransformBudgetModal,
    setShowTransformBudgetModal,
    newBudgetForm,
    setNewBudgetForm,

    // Données
    budgetAnnuelVote,
    postesBudget,
    budgetsTravaux,
    setBudgetsTravaux,
    fondsALUR: MOCK_FONDS_ALUR,
    coproprietairesALUR: MOCK_COPROPRIETAIRES_ALUR,
    resolutionsAG: MOCK_RESOLUTIONS_AG,
    dernieresDepenses,

    // Calculs
    totals,
    postesEnAlerte,

    // Utilitaires
    getProgressColor,
    getProgressPercentage,

    // Handlers
    handleOpenTravauxDetail,
    handleTransferALUR,
    handleCreateBudgetFromResolution,
    handleTransformToAppele,
    handleCreateBudget,
    handleLinkToAG,
    handleOpenLinkToAG,
    handleOpenTransformModal,
    canGenerateFundCalls,
    getBudgetN1,

    // Liste des budgets
    budgets,
    setBudgets,
    handleUpdateBudget,
    handleDeleteBudget,
    checkBudgetExists,
    showLinkToAGModal,
    setShowLinkToAGModal,
    selectedBudgetForLink,
    setSelectedBudgetForLink,
    selectedBudgetForTransform,
    setSelectedBudgetForTransform,

    // Nouvel appel de fonds travaux
    showNewAppelFondsModal,
    setShowNewAppelFondsModal,
    selectedTravauxForAppel,
    setSelectedTravauxForAppel,
    handleOpenNewAppelFonds,
    handleGenerateProchainAppel,

    // Gestion des dépenses
    depenses,
    setDepenses,
    showDepenseEditorModal,
    setShowDepenseEditorModal,
    showInvoicePickerModal,
    setShowInvoicePickerModal,
    editingDepense,
    setEditingDepense,
    depenseEditorMode,
    setDepenseEditorMode,
    calculatePendingByPoste,

    // Handlers dépenses
    handleCreateDepense,
    handleEditDepense,
    handleSaveDepense,
    handleSubmitForValidation,
    handleValidateDepense,
    handleRejectDepense,
    handleLinkInvoiceToDepense,
    canSubmitForValidation,

    // Graphique interactif - filtre par poste
    posteActifChart,
    setPosteActifChart,
    depensesFiltrees,
    handlePosteChartSelect,
  };
}
