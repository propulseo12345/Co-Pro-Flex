'use client';

import { CheckCircle, AlertCircle, Send } from 'lucide-react';
import { DepenseEtendue } from '@/data/mock';
import styles from './DepenseValidationPanel.module.css';

interface ValidationRequirement {
  key: string;
  label: string;
  met: boolean;
}

interface DepenseValidationPanelProps {
  depense: Partial<DepenseEtendue>;
  onSubmitForValidation: () => void;
  disabled?: boolean;
}

export function DepenseValidationPanel({
  depense,
  onSubmitForValidation,
  disabled = false,
}: DepenseValidationPanelProps) {
  const requirements: ValidationRequirement[] = [
    {
      key: 'pieceJointe',
      label: 'Pièce justificative attachée',
      met: !!(depense.pieceJointe || depense.pieceJointeDetails),
    },
    {
      key: 'poste',
      label: 'Poste budgétaire assigné',
      met: !!depense.poste,
    },
    {
      key: 'montant',
      label: 'Montant renseigné',
      met: !!(depense.montant && depense.montant > 0),
    },
    {
      key: 'fournisseur',
      label: 'Fournisseur renseigné',
      met: !!depense.fournisseur,
    },
    {
      key: 'libelle',
      label: 'Libellé renseigné',
      met: !!depense.libelle,
    },
  ];

  const allRequirementsMet = requirements.every(r => r.met);
  const metCount = requirements.filter(r => r.met).length;

  const isAlreadySubmitted = depense.statut === 'EN_ATTENTE_VALIDATION' || depense.statut === 'VALIDEE';

  return (
    <div className={styles.validationPanel}>
      <div className={styles.header}>
        <h4 className={styles.title}>Prérequis pour validation</h4>
        <span className={styles.progress}>
          {metCount}/{requirements.length} complétés
        </span>
      </div>

      <ul className={styles.requirementsList}>
        {requirements.map((req) => (
          <li
            key={req.key}
            className={`${styles.requirementItem} ${req.met ? styles.met : styles.notMet}`}
          >
            {req.met ? (
              <CheckCircle size={16} className={styles.iconMet} aria-hidden="true" />
            ) : (
              <AlertCircle size={16} className={styles.iconNotMet} aria-hidden="true" />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>

      {!allRequirementsMet && (
        <p className={styles.warningText}>
          Tous les prérequis doivent être remplis pour soumettre à validation.
        </p>
      )}

      {depense.statut === 'REJETEE' && depense.commentaireRejet && (
        <div className={styles.rejectionComment}>
          <strong>Motif du rejet :</strong>
          <p>{depense.commentaireRejet}</p>
        </div>
      )}

      <button
        type="button"
        className={`btn btn-primary ${styles.submitButton}`}
        onClick={onSubmitForValidation}
        disabled={disabled || !allRequirementsMet || isAlreadySubmitted}
      >
        <Send size={16} aria-hidden="true" />
        {isAlreadySubmitted ? 'Déjà soumis' : 'Soumettre à validation'}
      </button>
    </div>
  );
}
