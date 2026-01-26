'use client';

import { useCallback, useMemo } from 'react';
import { DatePicker } from './DatePicker';
import { createDateValidator } from '@/lib/utils/date-validation';
import styles from './DateRangePicker.module.css';

interface DateRangePickerProps {
  labelStart: string;
  labelEnd: string;
  valueStart: Date | null;
  valueEnd: Date | null;
  onChangeStart: (date: Date | null) => void;
  onChangeEnd: (date: Date | null) => void;

  // Validation
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;

  // Erreurs externes
  errorStart?: string;
  errorEnd?: string;

  // Hints
  hintStart?: string;
  hintEnd?: string;

  // Type de plage (pour validation spécifique)
  rangeType?: 'exercice' | 'mandat' | 'generic';

  disabled?: boolean;
}

export function DateRangePicker({
  labelStart,
  labelEnd,
  valueStart,
  valueEnd,
  onChangeStart,
  onChangeEnd,
  required = false,
  minDate,
  maxDate,
  errorStart,
  errorEnd,
  hintStart,
  hintEnd,
  rangeType = 'generic',
  disabled = false,
}: DateRangePickerProps) {

  // Validation pour la date de fin
  const validateEndDate = useCallback((date: Date): string | null => {
    if (!valueStart) return null;

    switch (rangeType) {
      case 'exercice':
        return createDateValidator([
          { type: 'exercice', dateDebut: valueStart }
        ])(date);

      case 'mandat':
        return createDateValidator([
          { type: 'mandat', dateDebut: valueStart }
        ])(date);

      default:
        if (date < valueStart) {
          return `La date de fin doit être après le ${valueStart.toLocaleDateString('fr-FR')}`;
        }
        return null;
    }
  }, [valueStart, rangeType]);

  // Date minimum pour la fin = date de début
  const minEndDate = useMemo(() => {
    if (valueStart) return valueStart;
    return minDate;
  }, [valueStart, minDate]);

  // Date maximum pour le début = date de fin
  const maxStartDate = useMemo(() => {
    if (valueEnd) return valueEnd;
    return maxDate;
  }, [valueEnd, maxDate]);

  return (
    <div className={styles.container}>
      <DatePicker
        label={labelStart}
        value={valueStart}
        onChange={onChangeStart}
        required={required}
        minDate={minDate}
        maxDate={maxStartDate}
        error={errorStart}
        hint={hintStart}
        disabled={disabled}
      />

      <span className={styles.separator} aria-hidden="true">→</span>

      <DatePicker
        label={labelEnd}
        value={valueEnd}
        onChange={onChangeEnd}
        required={required}
        minDate={minEndDate}
        maxDate={maxDate}
        error={errorEnd}
        hint={hintEnd}
        disabled={disabled}
        validate={validateEndDate}
      />
    </div>
  );
}
