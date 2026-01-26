'use client';

import { Globe, Users, Lock, Shield } from 'lucide-react';
import { NiveauConfidentialite } from '@/types/enums';
import styles from './AccessBadge.module.css';

interface AccessBadgeProps {
  level: NiveauConfidentialite | string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const LEVEL_CONFIG: Record<string, {
  icon: typeof Globe;
  label: string;
  color: string;
}> = {
  [NiveauConfidentialite.PUBLIC]: {
    icon: Globe,
    label: 'Public',
    color: '#10B981',
  },
  [NiveauConfidentialite.CS_ONLY]: {
    icon: Users,
    label: 'Conseil Syndical',
    color: '#F59E0B',
  },
  [NiveauConfidentialite.SYNDIC_ONLY]: {
    icon: Lock,
    label: 'Syndic',
    color: '#EF4444',
  },
  [NiveauConfidentialite.CONFIDENTIEL]: {
    icon: Shield,
    label: 'Confidentiel',
    color: '#8B5CF6',
  },
  // Legacy string values
  'CONSEIL_SYNDICAL': {
    icon: Users,
    label: 'Conseil Syndical',
    color: '#F59E0B',
  },
};

export function AccessBadge({ level, showLabel = false, size = 'sm' }: AccessBadgeProps) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[NiveauConfidentialite.PUBLIC];
  const Icon = config.icon;

  return (
    <span
      className={`${styles.badge} ${styles[size]}`}
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        borderColor: `${config.color}40`,
      }}
      title={config.label}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      {showLabel && <span className={styles.label}>{config.label}</span>}
    </span>
  );
}

/**
 * Obtient le label d'un niveau de confidentialite
 */
export function getAccessLevelLabel(level: NiveauConfidentialite | string): string {
  return LEVEL_CONFIG[level]?.label || 'Public';
}

/**
 * Obtient la couleur d'un niveau de confidentialite
 */
export function getAccessLevelColor(level: NiveauConfidentialite | string): string {
  return LEVEL_CONFIG[level]?.color || '#10B981';
}
