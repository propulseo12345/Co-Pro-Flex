'use client';

import { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import clsx from 'clsx';
import type { AccountingPeriod } from '@/lib/finance/api';
import { useCreateCallWizard } from '../../hooks/useCreateCallWizard';
import { StepType } from './StepType';
import { StepAmount } from './StepAmount';
import { StepSchedule } from './StepSchedule';
import { StepRecap } from './StepRecap';
import styles from './CreateCallWizard.module.css';

interface CreateCallWizardProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPeriod: AccountingPeriod | null;
  onSuccess: () => void;
  budgets: { id: string; label: string; total_amount: number; budget_type: string }[];
}

const STEPS = [
  { num: 1, label: 'Type' },
  { num: 2, label: 'Montant' },
  { num: 3, label: 'Échéancier' },
  { num: 4, label: 'Récap' },
] as const;

export function CreateCallWizard({ isOpen, onClose, selectedPeriod, onSuccess, budgets }: CreateCallWizardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const wizard = useCreateCallWizard({ selectedPeriod, onSuccess, onClose });

  const handleClose = useCallback(() => {
    if (wizard.hasData) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [wizard.hasData, onClose]);

  const confirmClose = useCallback(() => {
    setShowConfirm(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Nouvel appel de fonds</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((s, i) => (
            <div key={s.num} className={styles.stepItem}>
              {i > 0 && (
                <div className={clsx(
                  styles.stepLine,
                  wizard.state.step > s.num && styles.stepLineDone,
                )} />
              )}
              <div className={clsx(
                styles.stepDot,
                wizard.state.step === s.num && styles.stepDotActive,
                wizard.state.step > s.num && styles.stepDotDone,
                wizard.state.step < s.num && styles.stepDotPending,
              )}>
                {wizard.state.step > s.num ? <Check size={14} /> : s.num}
              </div>
              <span className={clsx(
                styles.stepLabel,
                wizard.state.step === s.num && styles.stepLabelActive,
              )}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>
          {wizard.submitError && (
            <div className={styles.errorBar}>{wizard.submitError}</div>
          )}

          {wizard.state.step === 1 && (
            <StepType
              state={wizard.state}
              budgets={budgets}
              setCallType={wizard.setCallType}
              updateField={wizard.updateField}
            />
          )}

          {wizard.state.step === 2 && (
            <StepAmount
              state={wizard.state}
              keys={wizard.keys}
              keysLoading={wizard.keysLoading}
              keyPreview={wizard.keyPreview}
              updateField={wizard.updateField}
            />
          )}

          {wizard.state.step === 3 && (
            <StepSchedule
              state={wizard.state}
              updateField={wizard.updateField}
              setInstallmentCount={wizard.setInstallmentCount}
              updateInstallment={wizard.updateInstallment}
            />
          )}

          {wizard.state.step === 4 && (
            <StepRecap
              state={wizard.state}
              selectedKey={wizard.selectedKey}
              ventilation={wizard.ventilation}
              budgets={budgets}
            />
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div>
            {wizard.state.step > 1 && (
              <button className={styles.btnPrev} onClick={wizard.goPrev}>
                <ChevronLeft size={14} /> Précédent
              </button>
            )}
          </div>
          <div className={styles.footerRight}>
            {wizard.state.step < 4 ? (
              <button
                className={styles.btnNext}
                disabled={!wizard.canNext}
                onClick={wizard.goNext}
              >
                Suivant <ChevronRight size={14} />
              </button>
            ) : (
              <button
                className={styles.btnNext}
                disabled={wizard.isSubmitting}
                onClick={wizard.submit}
              >
                {wizard.isSubmitting ? 'Création...' : 'Créer en brouillon'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm close dialog */}
      {showConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmTitle}>Annuler la création ?</div>
            <div className={styles.confirmText}>Les données saisies seront perdues.</div>
            <div className={styles.confirmActions}>
              <button className={styles.btnPrev} onClick={() => setShowConfirm(false)}>Continuer</button>
              <button className={styles.btnNext} onClick={confirmClose}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
