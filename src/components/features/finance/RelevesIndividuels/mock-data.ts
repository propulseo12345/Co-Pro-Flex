import type {
  CoproprietaireReleve,
  ReleveIndividuel,
  CleRepartition,
  DetailParCle,
  LigneCharge,
  LigneAppelFonds
} from './types';

export const MOCK_CLES_REPARTITION: CleRepartition[] = [
  { id: 'cle-generale', nom: 'Charges Générales', description: 'Toutes parties communes', totalTantiemes: 10000 },
  { id: 'cle-ascenseur', nom: 'Ascenseur', description: 'Bâtiments A et B', totalTantiemes: 6000 },
  { id: 'cle-chauffage', nom: 'Chauffage Collectif', description: 'Selon surface', totalTantiemes: 8500 },
  { id: 'cle-batiment-a', nom: 'Bâtiment A', description: 'Parties communes bât. A', totalTantiemes: 5000 },
  { id: 'cle-batiment-b', nom: 'Bâtiment B', description: 'Parties communes bât. B', totalTantiemes: 5000 },
];

export const MOCK_COPROPRIETAIRES_RELEVE: CoproprietaireReleve[] = [
  {
    id: 'copro-1',
    nom: 'LEBLANC',
    prenom: 'Marie',
    email: 'marie.leblanc@example.fr',
    telephone: '06 12 34 56 78',
    adresse: '12 Rue de la Paix, Apt A1, 75001 Paris',
    lots: [
      { id: 'lot-a1', numero: 'A1', type: 'Appartement', tantiemesGeneraux: 125, tantiemesAscenseur: 80, tantiemesChauffage: 110 }
    ],
    totalTantiemes: 125,
    soldeActuel: 0,
    soldeN1: -150
  },
  {
    id: 'copro-2',
    nom: 'MOREAU',
    prenom: 'Pierre',
    email: 'pierre.moreau@example.fr',
    telephone: '06 23 45 67 89',
    adresse: '12 Rue de la Paix, Apt A2, 75001 Paris',
    lots: [
      { id: 'lot-a2', numero: 'A2', type: 'Appartement', tantiemesGeneraux: 100, tantiemesAscenseur: 65, tantiemesChauffage: 85 }
    ],
    totalTantiemes: 100,
    soldeActuel: -450.00,
    soldeN1: 0
  },
  {
    id: 'copro-3',
    nom: 'LAURENT',
    prenom: 'Sophie',
    email: 'sophie.laurent@example.fr',
    telephone: '06 34 56 78 90',
    adresse: '12 Rue de la Paix, Apt B3, 75001 Paris',
    lots: [
      { id: 'lot-b3', numero: 'B3', type: 'Appartement', tantiemesGeneraux: 150, tantiemesAscenseur: 95, tantiemesChauffage: 130 }
    ],
    totalTantiemes: 150,
    soldeActuel: -1875.00,
    soldeN1: -500
  },
  {
    id: 'copro-4',
    nom: 'MARTIN',
    prenom: 'Jean',
    email: 'jean.martin@example.fr',
    telephone: '06 45 67 89 01',
    adresse: '12 Rue de la Paix, Apt B4, 75001 Paris',
    lots: [
      { id: 'lot-b4', numero: 'B4', type: 'Appartement', tantiemesGeneraux: 125, tantiemesAscenseur: 80, tantiemesChauffage: 110 },
      { id: 'lot-cave-4', numero: 'Cave 4', type: 'Cave', tantiemesGeneraux: 5 }
    ],
    totalTantiemes: 130,
    soldeActuel: 250.00,
    soldeN1: 100
  },
  {
    id: 'copro-5',
    nom: 'DUBOIS',
    prenom: 'Isabelle',
    email: 'isabelle.dubois@example.fr',
    telephone: '06 56 78 90 12',
    adresse: '12 Rue de la Paix, Apt C5, 75001 Paris',
    lots: [
      { id: 'lot-c5', numero: 'C5', type: 'Appartement', tantiemesGeneraux: 100, tantiemesAscenseur: 65, tantiemesChauffage: 85 }
    ],
    totalTantiemes: 100,
    soldeActuel: -1250.00,
    soldeN1: -200
  },
  {
    id: 'copro-6',
    nom: 'BERNARD',
    prenom: 'Claude',
    email: 'claude.bernard@example.fr',
    telephone: '06 67 89 01 23',
    adresse: '12 Rue de la Paix, Apt C6, 75001 Paris',
    lots: [
      { id: 'lot-c6', numero: 'C6', type: 'Appartement', tantiemesGeneraux: 150, tantiemesAscenseur: 95, tantiemesChauffage: 130 }
    ],
    totalTantiemes: 150,
    soldeActuel: 0,
    soldeN1: 0
  },
  {
    id: 'copro-7',
    nom: 'ROUSSEAU',
    prenom: 'Anne',
    email: 'anne.rousseau@example.fr',
    telephone: '06 78 90 12 34',
    adresse: '12 Rue de la Paix, Apt D7, 75001 Paris',
    lots: [
      { id: 'lot-d7', numero: 'D7', type: 'Appartement', tantiemesGeneraux: 125, tantiemesAscenseur: 80, tantiemesChauffage: 110 }
    ],
    totalTantiemes: 125,
    soldeActuel: -1562.50,
    soldeN1: -300
  },
  {
    id: 'copro-8',
    nom: 'PETIT',
    prenom: 'Marc',
    email: 'marc.petit@example.fr',
    telephone: '06 89 01 23 45',
    adresse: '12 Rue de la Paix, Apt D8, 75001 Paris',
    lots: [
      { id: 'lot-d8', numero: 'D8', type: 'Appartement', tantiemesGeneraux: 125, tantiemesAscenseur: 80, tantiemesChauffage: 110 },
      { id: 'lot-parking-8', numero: 'P8', type: 'Parking', tantiemesGeneraux: 10 }
    ],
    totalTantiemes: 135,
    soldeActuel: -1687.50,
    soldeN1: 0
  },
];

function generateLignesCharges(tantiemesGeneraux: number, tantiemesAscenseur?: number, tantiemesChauffage?: number): LigneCharge[] {
  const totalGeneral = 10000;
  const totalAscenseur = 6000;
  const totalChauffage = 8500;

  return [
    {
      id: 'charge-1',
      libelle: 'Entretien parties communes',
      cleRepartition: 'Charges Générales',
      cleRepartitionId: 'cle-generale',
      montantTotal: 15000,
      tantiemesAppliques: tantiemesGeneraux,
      montantIndividuel: (15000 * tantiemesGeneraux) / totalGeneral,
      montantN1: (14200 * tantiemesGeneraux) / totalGeneral
    },
    {
      id: 'charge-2',
      libelle: 'Assurance immeuble',
      cleRepartition: 'Charges Générales',
      cleRepartitionId: 'cle-generale',
      montantTotal: 8500,
      tantiemesAppliques: tantiemesGeneraux,
      montantIndividuel: (8500 * tantiemesGeneraux) / totalGeneral,
      montantN1: (8000 * tantiemesGeneraux) / totalGeneral
    },
    {
      id: 'charge-3',
      libelle: 'Électricité parties communes',
      cleRepartition: 'Charges Générales',
      cleRepartitionId: 'cle-generale',
      montantTotal: 4200,
      tantiemesAppliques: tantiemesGeneraux,
      montantIndividuel: (4200 * tantiemesGeneraux) / totalGeneral,
      montantN1: (3800 * tantiemesGeneraux) / totalGeneral
    },
    {
      id: 'charge-4',
      libelle: 'Gardiennage',
      cleRepartition: 'Charges Générales',
      cleRepartitionId: 'cle-generale',
      montantTotal: 24000,
      tantiemesAppliques: tantiemesGeneraux,
      montantIndividuel: (24000 * tantiemesGeneraux) / totalGeneral,
      montantN1: (23000 * tantiemesGeneraux) / totalGeneral
    },
    ...(tantiemesAscenseur ? [
      {
        id: 'charge-5',
        libelle: 'Contrat maintenance ascenseur',
        cleRepartition: 'Ascenseur',
        cleRepartitionId: 'cle-ascenseur',
        montantTotal: 6000,
        tantiemesAppliques: tantiemesAscenseur,
        montantIndividuel: (6000 * tantiemesAscenseur) / totalAscenseur,
        montantN1: (5800 * tantiemesAscenseur) / totalAscenseur
      },
      {
        id: 'charge-6',
        libelle: 'Électricité ascenseur',
        cleRepartition: 'Ascenseur',
        cleRepartitionId: 'cle-ascenseur',
        montantTotal: 1800,
        tantiemesAppliques: tantiemesAscenseur,
        montantIndividuel: (1800 * tantiemesAscenseur) / totalAscenseur,
        montantN1: (1700 * tantiemesAscenseur) / totalAscenseur
      }
    ] : []),
    ...(tantiemesChauffage ? [
      {
        id: 'charge-7',
        libelle: 'Chauffage collectif - Gaz',
        cleRepartition: 'Chauffage Collectif',
        cleRepartitionId: 'cle-chauffage',
        montantTotal: 18000,
        tantiemesAppliques: tantiemesChauffage,
        montantIndividuel: (18000 * tantiemesChauffage) / totalChauffage,
        montantN1: (16500 * tantiemesChauffage) / totalChauffage
      },
      {
        id: 'charge-8',
        libelle: 'Entretien chaudière',
        cleRepartition: 'Chauffage Collectif',
        cleRepartitionId: 'cle-chauffage',
        montantTotal: 2500,
        tantiemesAppliques: tantiemesChauffage,
        montantIndividuel: (2500 * tantiemesChauffage) / totalChauffage,
        montantN1: (2400 * tantiemesChauffage) / totalChauffage
      }
    ] : [])
  ];
}

function generateDetailParCle(tantiemesGeneraux: number, tantiemesAscenseur?: number, tantiemesChauffage?: number): DetailParCle[] {
  const details: DetailParCle[] = [
    {
      cleId: 'cle-generale',
      cleNom: 'Charges Générales',
      tantiemes: tantiemesGeneraux,
      totalTantiemesCle: 10000,
      quotePart: (tantiemesGeneraux / 10000) * 100,
      montantN: (51700 * tantiemesGeneraux) / 10000,
      montantN1: (49000 * tantiemesGeneraux) / 10000,
      variation: (((51700 - 49000) / 49000) * 100),
      postes: [
        { id: 'p1', libelle: 'Entretien parties communes', montantTotal: 15000, montantIndividuel: (15000 * tantiemesGeneraux) / 10000, montantN1: (14200 * tantiemesGeneraux) / 10000 },
        { id: 'p2', libelle: 'Assurance immeuble', montantTotal: 8500, montantIndividuel: (8500 * tantiemesGeneraux) / 10000, montantN1: (8000 * tantiemesGeneraux) / 10000 },
        { id: 'p3', libelle: 'Électricité parties communes', montantTotal: 4200, montantIndividuel: (4200 * tantiemesGeneraux) / 10000, montantN1: (3800 * tantiemesGeneraux) / 10000 },
        { id: 'p4', libelle: 'Gardiennage', montantTotal: 24000, montantIndividuel: (24000 * tantiemesGeneraux) / 10000, montantN1: (23000 * tantiemesGeneraux) / 10000 },
      ]
    }
  ];

  if (tantiemesAscenseur) {
    details.push({
      cleId: 'cle-ascenseur',
      cleNom: 'Ascenseur',
      tantiemes: tantiemesAscenseur,
      totalTantiemesCle: 6000,
      quotePart: (tantiemesAscenseur / 6000) * 100,
      montantN: (7800 * tantiemesAscenseur) / 6000,
      montantN1: (7500 * tantiemesAscenseur) / 6000,
      variation: 4,
      postes: [
        { id: 'p5', libelle: 'Contrat maintenance ascenseur', montantTotal: 6000, montantIndividuel: (6000 * tantiemesAscenseur) / 6000, montantN1: (5800 * tantiemesAscenseur) / 6000 },
        { id: 'p6', libelle: 'Électricité ascenseur', montantTotal: 1800, montantIndividuel: (1800 * tantiemesAscenseur) / 6000, montantN1: (1700 * tantiemesAscenseur) / 6000 },
      ]
    });
  }

  if (tantiemesChauffage) {
    details.push({
      cleId: 'cle-chauffage',
      cleNom: 'Chauffage Collectif',
      tantiemes: tantiemesChauffage,
      totalTantiemesCle: 8500,
      quotePart: (tantiemesChauffage / 8500) * 100,
      montantN: (20500 * tantiemesChauffage) / 8500,
      montantN1: (18900 * tantiemesChauffage) / 8500,
      variation: 8.47,
      postes: [
        { id: 'p7', libelle: 'Chauffage collectif - Gaz', montantTotal: 18000, montantIndividuel: (18000 * tantiemesChauffage) / 8500, montantN1: (16500 * tantiemesChauffage) / 8500 },
        { id: 'p8', libelle: 'Entretien chaudière', montantTotal: 2500, montantIndividuel: (2500 * tantiemesChauffage) / 8500, montantN1: (2400 * tantiemesChauffage) / 8500 },
      ]
    });
  }

  return details;
}

function generateAppelsFonds(montantBase: number, solde: number): LigneAppelFonds[] {
  const appels: LigneAppelFonds[] = [
    {
      id: 'appel-t1',
      description: 'Appel de fonds T1 2026',
      periode: 'Janvier - Mars 2026',
      dateEcheance: '2026-01-15',
      montantDu: montantBase,
      montantPaye: montantBase,
      datePaiement: '2026-01-10',
      statut: 'PAYE'
    },
    {
      id: 'appel-t2',
      description: 'Appel de fonds T2 2026',
      periode: 'Avril - Juin 2026',
      dateEcheance: '2026-04-15',
      montantDu: montantBase,
      montantPaye: solde <= 0 ? montantBase + solde : montantBase,
      datePaiement: solde >= 0 ? '2026-04-12' : undefined,
      statut: solde >= 0 ? 'PAYE' : (solde > -montantBase ? 'PARTIELLEMENT_PAYE' : 'NON_PAYE')
    }
  ];

  return appels;
}

export function generateReleveIndividuel(coproprietaire: CoproprietaireReleve, exercice: string = '2026'): ReleveIndividuel {
  const lot = coproprietaire.lots[0];
  const lignesCharges = generateLignesCharges(lot.tantiemesGeneraux, lot.tantiemesAscenseur, lot.tantiemesChauffage);
  const detailParCle = generateDetailParCle(lot.tantiemesGeneraux, lot.tantiemesAscenseur, lot.tantiemesChauffage);

  const totalCharges = lignesCharges.reduce((sum, l) => sum + l.montantIndividuel, 0);
  const totalChargesN1 = lignesCharges.reduce((sum, l) => sum + (l.montantN1 || 0), 0);

  const appelsFonds = generateAppelsFonds(totalCharges / 4, coproprietaire.soldeActuel);
  const totalAppeles = appelsFonds.reduce((sum, a) => sum + a.montantDu, 0);
  const totalPaye = appelsFonds.reduce((sum, a) => sum + a.montantPaye, 0);

  return {
    id: `releve-${coproprietaire.id}-${exercice}`,
    coproprietaireId: coproprietaire.id,
    coproprietaire,
    exercice,
    dateGeneration: new Date().toISOString().split('T')[0],
    totalCharges,
    totalAppeles,
    totalPaye,
    solde: coproprietaire.soldeActuel,
    totalChargesN1,
    variationCharges: ((totalCharges - totalChargesN1) / totalChargesN1) * 100,
    detailParCle,
    appelsFonds,
    lignesCharges
  };
}

export const MOCK_RELEVES: ReleveIndividuel[] = MOCK_COPROPRIETAIRES_RELEVE.map(c => generateReleveIndividuel(c, '2026'));
