/**
 * Map workflow step to human-readable label
 */
export function mapWorkflowStepToLabel(step: string): string {
  switch (step) {
    case 'creation':
    case 'demande':
      return 'Demande créée';
    case 'generation':
    case 'pre_etat_date':
      return 'Pré-état daté';
    case 'etat_date':
      return 'État daté';
    case 'signature':
    case 'envoi_notaire':
      return 'Envoi notaire';
    case 'transmission':
    case 'signature_acte':
      return 'Signature acte';
    case 'notification':
    case 'cloture_compte':
      return 'Terminé';
    default:
      return 'En cours';
  }
}
