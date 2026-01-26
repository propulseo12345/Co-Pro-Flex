import { StatutOrdreService } from '@/types';
import { getStatutLabel, getStatutClass } from '@/lib/utils/service-order';
import {
  FileText,
  Send,
  Clock,
  Calendar,
  CheckCircle2,
  Check,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  Receipt,
  CreditCard,
  Archive
} from 'lucide-react';
import styles from './StatusBadge.module.css';
import clsx from 'clsx';

interface StatusBadgeProps {
  statut: StatutOrdreService;
  size?: 'small' | 'medium' | 'large';
}

const getStatutIcon = (statut: StatutOrdreService) => {
  const iconSize = 14;
  switch (statut) {
    case 'BROUILLON':
      return <FileText size={iconSize} aria-hidden="true" />;
    case 'A_ENVOYER':
      return <Clock size={iconSize} aria-hidden="true" />;
    case 'ENVOYE':
    case 'EN_ATTENTE_PRESTATAIRE':
      return <Send size={iconSize} aria-hidden="true" />;
    case 'ACCEPTE':
      return <ThumbsUp size={iconSize} aria-hidden="true" />;
    case 'REFUSE':
      return <ThumbsDown size={iconSize} aria-hidden="true" />;
    case 'PLANIFIE':
    case 'INTERVENTION_PROGRAMMEE':
      return <Calendar size={iconSize} aria-hidden="true" />;
    case 'EN_COURS':
      return <Wrench size={iconSize} aria-hidden="true" />;
    case 'REALISE':
    case 'INTERVENTION_REALISEE':
      return <CheckCircle2 size={iconSize} aria-hidden="true" />;
    case 'FACTURE':
      return <Receipt size={iconSize} aria-hidden="true" />;
    case 'PAYE':
      return <CreditCard size={iconSize} aria-hidden="true" />;
    case 'CLOTURE':
      return <Archive size={iconSize} aria-hidden="true" />;
    case 'ANNULE':
      return <XCircle size={iconSize} aria-hidden="true" />;
    default:
      return null;
  }
};

export default function StatusBadge({ statut, size = 'medium' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        styles.badge,
        styles[getStatutClass(statut)],
        styles[size]
      )}
    >
      {getStatutIcon(statut)}
      <span>{getStatutLabel(statut)}</span>
    </span>
  );
}
