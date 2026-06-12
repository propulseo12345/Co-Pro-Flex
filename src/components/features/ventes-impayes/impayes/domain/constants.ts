import {
  Clock,
  Mail,
  Send,
  FileText,
  Gavel,
  AlertCircle,
  Euro,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import type { ModeEnvoi } from '@/types/models/impaye';
import type { WorkflowStep, StatutConfig, ModeEnvoiConfig } from './types';

export const MODE_ENVOI_CONFIG: Record<ModeEnvoi, ModeEnvoiConfig> = {
  email: { label: 'Email', icon: Mail },
  courrier: { label: 'Courrier simple', icon: Send },
  lrar: { label: 'Recommandé AR', icon: FileText },
};

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'en_retard', label: 'En retard', icon: Clock, color: '#f59e0b' },
  { id: 'relance_amiable_1', label: 'Relance amiable 1', icon: Mail, color: '#f97316' },
  { id: 'relance_amiable_2', label: 'Relance amiable 2', icon: Send, color: '#ef4444' },
  { id: 'mise_en_demeure', label: 'Mise en demeure', icon: FileText, color: '#dc2626' },
  { id: 'contentieux', label: 'Contentieux', icon: Gavel, color: '#991b1b' },
];

export const STATUT_CONFIG: Record<string, StatutConfig> = {
  en_retard: { bg: '#fef3c7', color: '#92400e', label: 'En retard', darkBg: 'rgba(251, 191, 36, 0.2)', darkColor: '#fbbf24' },
  relance_amiable_1: { bg: '#fed7aa', color: '#9a3412', label: 'Relance amiable 1', darkBg: 'rgba(251, 146, 60, 0.2)', darkColor: '#fb923c' },
  relance_amiable_2: { bg: '#fecaca', color: '#991b1b', label: 'Relance amiable 2', darkBg: 'rgba(248, 113, 113, 0.2)', darkColor: '#f87171' },
  mise_en_demeure: { bg: '#fee2e2', color: '#7f1d1d', label: 'Mise en demeure', darkBg: 'rgba(239, 68, 68, 0.2)', darkColor: '#ef4444' },
  contentieux: { bg: '#fce7f3', color: '#9d174d', label: 'Contentieux', darkBg: 'rgba(236, 72, 153, 0.2)', darkColor: '#ec4899' },
  regle: { bg: '#d1fae5', color: '#065f46', label: 'Réglé', darkBg: 'rgba(52, 211, 153, 0.2)', darkColor: '#34d399' },
};

export const HISTORIQUE_ICONS: Record<string, React.ElementType> = {
  creation: AlertCircle,
  relance_amiable_1: Mail,
  relance_amiable_2: Send,
  mise_en_demeure: FileText,
  contentieux: Gavel,
  paiement_partiel: Euro,
  paiement_total: CheckCircle2,
  note: FileText,
  appel_telephonique: Phone,
};

