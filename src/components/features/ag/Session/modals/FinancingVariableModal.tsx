'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { FinancingScheduleEditor, type FinancingSchedule, type FrequencyType } from '@/components/features/ag/FinancingScheduleEditor/FinancingScheduleEditor';
import { MODALITES_PAIEMENT_OPTIONS, generateEcheancesDates } from '@/lib/constants/resolutions';
import modalsStyles from '../styles/modals.module.css';
import styles from './FinancingVariableModal.module.css';

interface FinancingVariableModalProps {
  currentModalite: string;
  currentSchedule: FinancingSchedule | null;
  totalBudget: number;
  exerciceYear: number;
  onClose: () => void;
  onSave: (modalite: string, datesEcheances: string, schedule: FinancingSchedule) => void;
}

const FREQUENCY_TO_MODALITE: Record<string, FrequencyType> = {
  mensuel: 'mensuel',
  trimestriel: 'trimestriel',
  semestriel: 'semestriel',
  annuel: 'annuel',
};

export function FinancingVariableModal({
  currentModalite,
  currentSchedule,
  totalBudget,
  exerciceYear,
  onClose,
  onSave,
}: FinancingVariableModalProps) {
  const [modalite, setModalite] = useState(currentModalite || '');
  const [schedule, setSchedule] = useState<FinancingSchedule | null>(currentSchedule);

  const handleModaliteChange = (value: string) => {
    setModalite(value);
    // Reset schedule when modalité changes to let FinancingScheduleEditor recalculate
    setSchedule(null);
  };

  const handleSave = () => {
    if (!modalite) return;
    const datesEcheances = schedule
      ? schedule.entries
          .map(e => new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))
          .join(', ')
      : generateEcheancesDates(modalite, exerciceYear);

    const finalSchedule = schedule || {
      frequency: (FREQUENCY_TO_MODALITE[modalite] || 'trimestriel') as FrequencyType,
      totalAmount: totalBudget,
      entries: [],
      exerciceYear,
    };
    onSave(modalite, datesEcheances, finalSchedule);
  };

  return (
    <div className={modalsStyles.modalOverlay} onClick={onClose}>
      <div
        className={`${modalsStyles.modalContent} ${styles.wideModal}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="financing-modal-title"
      >
        <h2 className={modalsStyles.modalTitle} id="financing-modal-title">
          <Calendar size={24} aria-hidden="true" />
          Calendrier de financement
        </h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="modalite-select">
            Modalités de paiement <span className={styles.required}>*</span>
          </label>
          <select
            id="modalite-select"
            value={modalite}
            onChange={(e) => handleModaliteChange(e.target.value)}
            className={styles.select}
          >
            <option value="">Sélectionner une modalité...</option>
            {MODALITES_PAIEMENT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {modalite && modalite !== 'au_choix_syndic' && (
          <div className={styles.scheduleWrapper}>
            <FinancingScheduleEditor
              value={schedule}
              onChange={setSchedule}
              totalBudget={totalBudget}
              exerciceYear={exerciceYear}
            />
          </div>
        )}

        <div className={modalsStyles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            ✕ Annuler
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!modalite}
          >
            ✓ Valider
          </button>
        </div>
      </div>
    </div>
  );
}
