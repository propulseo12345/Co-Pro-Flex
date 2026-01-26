import { ID } from '../common';

export type TypeEtatDate = 'PRE_ETAT_DATE' | 'ETAT_DATE';

export interface IEtatDateRequest {
  type: TypeEtatDate;
  lotId: ID;
  coproprietaireId: ID;
  dateReference: string;
  dateVente?: string;
  notaireEmail?: string;
  notaireNom?: string;
}

export interface ISituationFinanciere {
  soldeCompteProprietaire: number;
  chargesAppelees: number;
  chargesPayees: number;
  chargesRestantes: number;
  avanceTresorerie: number;
  fondsTravauxVerse: number;
  fondsTravauxAppele: number;
  fondsTravauxRestant: number;
}

export interface ITravauxEnCours {
  id: ID;
  designation: string;
  montantVote: number;
  montantAppele: number;
  montantRestant: number;
  quotePartLot: number;
  dateAG: string;
}

export interface IProcedureEnCours {
  id: ID;
  type: 'CONTENTIEUX' | 'IMPAYE' | 'LITIGE';
  description: string;
  montant?: number;
  dateDebut: string;
}

export interface IEtatDate {
  id: ID;
  type: TypeEtatDate;
  dateGeneration: string;
  dateReference: string;
  // Informations lot
  lot: {
    id: ID;
    numero: string;
    type: string;
    etage?: number;
    surface?: number;
    tantiemesGeneraux: number;
  };
  // Informations copropriétaire
  coproprietaire: {
    id: ID;
    nom: string;
    prenom: string;
    adresse?: string;
  };
  // Informations copropriété
  copropriete: {
    nom: string;
    adresse: string;
    syndic: string;
    dateCreation: string;
    nombreLots: number;
  };
  // Situation financière
  situationFinanciere: ISituationFinanciere;
  // Budget en cours
  budgetCourant: {
    annee: number;
    montantTotal: number;
    quotePartLot: number;
  };
  // Travaux votés/en cours
  travauxEnCours: ITravauxEnCours[];
  // Procédures en cours
  proceduresEnCours: IProcedureEnCours[];
  // Observations
  observations?: string;
}
