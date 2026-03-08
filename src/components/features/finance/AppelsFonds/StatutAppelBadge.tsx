'use client';

import {
  Clock,
  Send,
  CheckCircle,
  CircleDot,
  XCircle,
  FileEdit,
  Edit,
} from 'lucide-react';
import { AppelFondsStatut, STATUTS_APPEL_FONDS } from '@/types/enums/statuts';
import styles from './StatutAppelBadge.module.css';

interface StatutAppelBadgeProps {
  statut: AppelFondsStatut | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  /** Override the default label text */
  label?: string;
}

type IconComponent = typeof Clock;

const ICONES: Record<string, IconComponent> = {
  BROUILLON: FileEdit,
  EN_ATTENTE: Clock,
  EMIS: Send,
  PARTIELLEMENT_PAYE: CircleDot,
  SOLDE: CheckCircle,
  ANNULE: XCircle,
  // Statuts legacy pour compatibilité
  A_GENERER: Clock,
  EN_PREPARATION: Edit,
  ENVOYE: Send,
  PAYE: CheckCircle,
};

const LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_ATTENTE: 'À émettre',
  EMIS: 'Émis',
  PARTIELLEMENT_PAYE: 'Partiel',
  SOLDE: 'Soldé',
  ANNULE: 'Annulé',
  // Statuts legacy pour compatibilité
  A_GENERER: 'À générer',
  EN_PREPARATION: 'En préparation',
  ENVOYE: 'Envoyé',
  PAYE: 'Payé',
};

export function StatutAppelBadge({
  statut,
  size = 'md',
  showLabel = true,
  label: labelOverride,
}: StatutAppelBadgeProps) {
  // Récupérer la config depuis les métadonnées unifiées si disponible
  const config = STATUTS_APPEL_FONDS[statut as AppelFondsStatut];

  // Icône (utilise le mapping local ou les métadonnées)
  const Icone = ICONES[statut] || Clock;

  // Label (utilise l'override, le mapping local ou les métadonnées)
  const label = labelOverride || config?.labelCourt || LABELS[statut] || statut;

  // Description pour le tooltip
  const description = config?.description || '';

  // Classe CSS basée sur le statut (en minuscules)
  const statutClass = styles[statut.toLowerCase()] || styles.unknown;

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${statutClass}`}
      title={description}
    >
      <Icone size={iconSize} aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
