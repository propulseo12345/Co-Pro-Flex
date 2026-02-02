'use client';

import { CheckCircle, Calendar, DollarSign, FileText } from 'lucide-react';
import { ModeEcheancier } from '@/types';
import type { BudgetData, ResolutionBudget } from '@/lib/utils/budget';
import styles from '@/app/(dashboard)/finance/budgets/validation/validation.module.css';

interface SuccessStepProps {
  budget: BudgetData;
  modeEcheancier: ModeEcheancier;
  resolutionGeneree: ResolutionBudget | null;
  onGoToBudgets: () => void;
  onGoToNewAG: () => void;
}

export function SuccessStep({
  budget,
  modeEcheancier,
  resolutionGeneree,
  onGoToBudgets,
  onGoToNewAG,
}: SuccessStepProps) {
  return (
    <div className={styles.content}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>
          <CheckCircle size={64} aria-hidden="true" />
        </div>
        <h2 className={styles.successTitle}>Budget créé avec succès !</h2>
        <p className={styles.successText}>
          Le budget prévisionnel {budget.annee} a été créé et enregistré. Pour finaliser
          l&apos;approbation, vous devez lier ce budget à une Assemblée Générale et créer la
          résolution correspondante.
        </p>

        <div className={styles.successDetails}>
          <div className={styles.successDetail}>
            <FileText size={24} aria-hidden="true" />
            <div>
              <strong>Résolution à créer</strong>
              <p>{resolutionGeneree?.titre}</p>
            </div>
          </div>
          <div className={styles.successDetail}>
            <Calendar size={24} aria-hidden="true" />
            <div>
              <strong>Échéancier prévu</strong>
              <p>
                {resolutionGeneree?.echeancier?.echeances.length} appel(s) de fonds (
                {modeEcheancier.toLowerCase()})
              </p>
            </div>
          </div>
          <div className={styles.successDetail}>
            <DollarSign size={24} aria-hidden="true" />
            <div>
              <strong>Montant total</strong>
              <p>{budget.montantTotal.toLocaleString('fr-FR')} EUR</p>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={onGoToBudgets} className="btn btn-secondary">
            Retour aux budgets
          </button>
          <button onClick={onGoToNewAG} className="btn btn-primary">
            Créer une AG pour ce budget
          </button>
        </div>
      </div>
    </div>
  );
}
