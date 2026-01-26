/**
 * Constantes pour le module Delivery (modes d'envoi des convocations)
 */

import { DeliveryMode, PostalSendType } from '@/types/enums';

export interface DeliveryModeInfo {
  value: DeliveryMode;
  label: string;
  description: string;
  requiresEmail: boolean;
  requiresAddress: boolean;
  icon: 'Mail' | 'Send' | 'MailCheck';
}

export interface GlobalDeliveryOption {
  value: DeliveryMode | 'PAR_COPROPRIETAIRE';
  label: string;
  description: string;
}

export const DELIVERY_MODES: DeliveryModeInfo[] = [
  {
    value: DeliveryMode.EMAIL,
    label: 'Email uniquement',
    description: 'Envoi par email (gratuit, instantané)',
    requiresEmail: true,
    requiresAddress: false,
    icon: 'Mail',
  },
  {
    value: DeliveryMode.COURRIER,
    label: 'Courrier postal',
    description: 'Envoi par voie postale (lettre simple ou recommandé)',
    requiresEmail: false,
    requiresAddress: true,
    icon: 'Send',
  },
  {
    value: DeliveryMode.EMAIL_ET_COURRIER,
    label: 'Email + Courrier',
    description: 'Double envoi pour garantir la réception',
    requiresEmail: true,
    requiresAddress: true,
    icon: 'MailCheck',
  },
];

export const GLOBAL_DELIVERY_OPTIONS: GlobalDeliveryOption[] = [
  {
    value: DeliveryMode.EMAIL,
    label: 'Email uniquement',
    description: 'Tous les copropriétaires recevront leur convocation par email',
  },
  {
    value: DeliveryMode.COURRIER,
    label: 'Courrier postal uniquement',
    description: 'Tous les copropriétaires recevront leur convocation par courrier',
  },
  {
    value: DeliveryMode.EMAIL_ET_COURRIER,
    label: 'Email + Courrier',
    description: 'Envoi en double (email ET courrier) pour tous',
  },
  {
    value: 'PAR_COPROPRIETAIRE',
    label: 'Par copropriétaire',
    description: 'Configurer le mode d\'envoi individuellement pour chaque copropriétaire',
  },
];

export const POSTAL_COSTS: Record<PostalSendType, number> = {
  [PostalSendType.LETTRE_SIMPLE]: 1.49,
  [PostalSendType.LRAR]: 6.50,
  [PostalSendType.AR_EXTERNE]: 8.90,
};

export const POSTAL_LABELS: Record<PostalSendType, string> = {
  [PostalSendType.LETTRE_SIMPLE]: 'Lettre simple',
  [PostalSendType.LRAR]: 'Lettre recommandée avec AR',
  [PostalSendType.AR_EXTERNE]: 'AR électronique (Docapost)',
};

export function getDeliveryModeInfo(mode: DeliveryMode): DeliveryModeInfo | undefined {
  return DELIVERY_MODES.find((m) => m.value === mode);
}

export function modeRequiresEmail(mode: DeliveryMode): boolean {
  return mode === DeliveryMode.EMAIL || mode === DeliveryMode.EMAIL_ET_COURRIER;
}

export function modeRequiresAddress(mode: DeliveryMode): boolean {
  return mode === DeliveryMode.COURRIER || mode === DeliveryMode.EMAIL_ET_COURRIER;
}
