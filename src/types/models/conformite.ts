import type { TravauxPrevisionnelStatut, TypeTravauxPrevisionnel } from '@/types/enums';

// ─── PPT ────────────────────────────────────────────────────────────────────

export interface ITravauxPPT {
  id: string;
  titre: string;
  type: TypeTravauxPrevisionnel;
  datePrevisionnelle: string;
  dateVote?: string;
  dateRealisation?: string;
  montantEstime: number;
  montantVote?: number;
  montantReel?: number;
  statut: TravauxPrevisionnelStatut;
  priorite: 'FAIBLE' | 'NORMALE' | 'HAUTE' | 'CRITIQUE';
  description?: string;
  etapes: IEtapeTravaux[];
}

export interface IEtapeTravaux {
  id: string;
  label: string;
  date?: string;
  statut: 'FAIT' | 'EN_COURS' | 'A_VENIR';
  montant?: number;
  commentaire?: string;
}

export interface IPPTCopropriete {
  coproprieteId: string;
  nom: string;
  nbLots: number;
  travaux: ITravauxPPT[];
  derniereMAJ: string;
}

// ─── DPE ────────────────────────────────────────────────────────────────────

export type ClasseDPE = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type StatutDPE = 'VALIDE' | 'EXPIRE_BIENTOT' | 'EXPIRE' | 'MANQUANT';

export interface IDPEHistorique {
  id: string;
  dateDiagnostic: string;
  classeEnergie: ClasseDPE;
  diagnostiqueur: string;
  notes?: string;
}

export interface IDPE {
  id: string;
  coproprieteId: string;
  coproprieteNom: string;
  nbLots: number;
  classeEnergie: ClasseDPE;
  classeGES: ClasseDPE;
  dateDiagnostic: string;
  dateExpiration: string;
  diagnostiqueur: string;
  numeroADEME: string;
  consoEnergie: number;
  emissionsGES: number;
  statut: StatutDPE;
  travauxRecommandes: ITravauxPPT[];
  historique: IDPEHistorique[];
}

// ─── FACTUR-X ────────────────────────────────────────────────────────────────

export type StatutFacturX = 'GENERE' | 'EN_ATTENTE' | 'NON_APPLICABLE';

export interface IFactureFacturX {
  id: string;
  numero: string;
  copropriete: string;
  fournisseur: string;
  montantTTC: number;
  date: string;
  statutPaiement: 'PAYEE' | 'EN_ATTENTE' | 'EN_RETARD';
  statutFacturX: StatutFacturX;
  dateGeneration?: string;
  profil: 'MINIMUM' | 'BASIC_WL' | 'EN16931';
}
