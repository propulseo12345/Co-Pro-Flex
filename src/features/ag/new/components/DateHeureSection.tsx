'use client';

import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { isValid, parseISO, format } from 'date-fns';
import { DELAIS_LEGAUX } from '@/lib/constants/ag-delais-legaux';
import type { ValidationDateAG } from '@/hooks/modules/useAGDelais';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface DateHeureSectionProps {
  date: string;
  heure: string;
  errors: Record<string, string>;
  validationDateAG: ValidationDateAG | null;
  datesMinimales: { minimum: Date };
  onDateChange: (date: string) => void;
  onHeureChange: (heure: string) => void;
}

export function DateHeureSection({
  date,
  heure,
  errors,
  validationDateAG,
  datesMinimales,
  onDateChange,
  onHeureChange,
}: DateHeureSectionProps) {
  return (
    <div className={styles.formGrid}>
      <div className={styles.formGroup}>
        <DatePicker
          label="Date de l'AG"
          value={date ? parseISO(date) : null}
          onChange={(newDate) => {
            if (newDate && isValid(newDate)) {
              onDateChange(format(newDate, 'yyyy-MM-dd'));
            } else {
              onDateChange('');
            }
          }}
          required
          minDate={datesMinimales.minimum}
          error={errors.date}
          hint={`Minimum ${DELAIS_LEGAUX.convocation_min} jours avant l'AG pour les convocations`}
          placeholder="DD/MM/YYYY"
        />
        {validationDateAG && (validationDateAG.niveau === 'warning') && (
          <div className={styles.dateWarning}>
            <AlertTriangle size={16} />
            <span>{validationDateAG.message}</span>
          </div>
        )}
        {validationDateAG && validationDateAG.niveau === 'error' && (
          <div className={styles.dateError}>
            <AlertCircle size={16} />
            <span>{validationDateAG.message}</span>
          </div>
        )}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="heure" className={styles.label}>
          <Clock size={18} aria-hidden="true" />
          Heure <span className={styles.asterisk}>*</span>
        </label>
        <input
          type="time"
          id="heure"
          className={`${styles.input} ${errors.heure ? styles.inputError : ''}`}
          value={heure}
          onChange={(e) => onHeureChange(e.target.value)}
        />
        {errors.heure && <span className={styles.error}>{errors.heure}</span>}
      </div>
    </div>
  );
}
