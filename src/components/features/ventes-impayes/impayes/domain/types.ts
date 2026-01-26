import type { HistoriqueContenu, ModeEnvoi } from '@/types/models/impaye';

export interface HistoriqueItem {
  id: number;
  date: string;
  type: 'creation' | 'relance_amiable_1' | 'relance_amiable_2' | 'mise_en_demeure' | 'contentieux' | 'paiement_partiel' | 'note' | 'appel_telephonique';
  description: string;
  montant?: number;
  destinataire?: string;
  canal?: 'email' | 'courrier' | 'courrier_recommande' | 'telephone' | 'huissier';
  contenu?: HistoriqueContenu;
}

export interface Coproprietaire {
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
}

export interface Impaye {
  id: number;
  coproprietaire: Coproprietaire;
  lot: string;
  batiment: string;
  montant: number;
  montantInitial: number;
  periode: string;
  type: 'charges' | 'travaux' | 'autre';
  statut: 'en_retard' | 'relance_amiable_1' | 'relance_amiable_2' | 'mise_en_demeure' | 'contentieux' | 'regle';
  dateEcheance: string;
  dateCreation: string;
  historique: HistoriqueItem[];
}

export interface WorkflowStep {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

export interface StatutConfig {
  bg: string;
  color: string;
  label: string;
  darkBg?: string;
  darkColor?: string;
}

export interface ModeEnvoiConfig {
  label: string;
  icon: React.ElementType;
}

export type RelanceGroupeeStep = 'select' | 'preview' | 'success';
