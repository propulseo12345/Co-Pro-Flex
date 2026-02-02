/**
 * Fonctions utilitaires pures pour Convocation
 */

import type { AGData, DraftMetadata } from '../types';

export const TYPE_MAPPING_FROM_DB: Record<string, AGData['type']> = {
  'ordinary': 'ORDINAIRE',
  'extraordinary': 'EXTRAORDINAIRE',
  'mixed': 'URGENTE',
  'special': 'URGENTE',
};

export function extractDateFromISO(isoString: string | null): string {
  if (!isoString) return '';
  try {
    return isoString.split('T')[0];
  } catch {
    return '';
  }
}

export function extractTimeFromISO(isoString: string | null): string {
  if (!isoString) return '';
  try {
    const timePart = isoString.split('T')[1];
    if (!timePart) return '';
    return timePart.substring(0, 5);
  } catch {
    return '';
  }
}

export function deserializeMetadata(raw: string | null): DraftMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DraftMetadata;
  } catch {
    return {};
  }
}
