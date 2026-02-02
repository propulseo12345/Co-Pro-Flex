import { Clock, AlertCircle, CheckCircle, Share2 } from 'lucide-react';
import { StatutRapportCS } from '@/types/models/conseil-syndical';

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'president': return 'Président';
    case 'secretaire': return 'Secrétaire';
    case 'tresorier': return 'Trésorier';
    case 'membre': return 'Membre';
    default: return role;
  }
}

export function getStatutLabel(statut: StatutRapportCS): string {
  switch (statut) {
    case 'brouillon': return 'Brouillon';
    case 'en_revision': return 'En révision';
    case 'valide': return 'Validé';
    case 'publie': return 'Publié';
    case 'archive': return 'Archivé';
    default: return statut;
  }
}

export function getStatutIcon(statut: StatutRapportCS) {
  switch (statut) {
    case 'brouillon': return <Clock size={14} />;
    case 'en_revision': return <AlertCircle size={14} />;
    case 'valide': return <CheckCircle size={14} />;
    case 'publie': return <Share2 size={14} />;
    default: return null;
  }
}
