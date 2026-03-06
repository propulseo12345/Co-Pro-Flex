'use client';

import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { isValid, parseISO, format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [manualTime, setManualTime] = useState(heure);

  useEffect(() => {
    setManualTime(heure);
  }, [heure]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsTimeOpen(false);
      }
    };

    if (isTimeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTimeOpen]);

  const quickSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const normalizeTime = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const colonPattern = /^(\d{1,2}):(\d{1,2})$/;
    const compactPattern = /^(\d{2})(\d{2})$/;

    let hoursPart = '';
    let minutesPart = '';

    const colonMatch = trimmed.match(colonPattern);
    const compactMatch = trimmed.match(compactPattern);

    if (colonMatch) {
      hoursPart = colonMatch[1] ?? '';
      minutesPart = colonMatch[2] ?? '';
    } else if (compactMatch) {
      hoursPart = compactMatch[1] ?? '';
      minutesPart = compactMatch[2] ?? '';
    } else {
      return null;
    }

    const hoursNumber = Number(hoursPart);
    const minutesNumber = Number(minutesPart);

    if (Number.isNaN(hoursNumber) || Number.isNaN(minutesNumber)) return null;
    if (hoursNumber < 0 || hoursNumber > 23) return null;
    if (minutesNumber < 0 || minutesNumber > 59) return null;

    return `${hoursNumber.toString().padStart(2, '0')}:${minutesNumber.toString().padStart(2, '0')}`;
  };

  const commitManualTime = () => {
    const normalized = normalizeTime(manualTime);
    if (normalized === null) return;
    setManualTime(normalized);
    onHeureChange(normalized);
  };

  const handleQuickSlotSelect = (slot: string) => {
    setManualTime(slot);
    onHeureChange(slot);
    setIsTimeOpen(false);
  };

  return (
    <div className={`${styles.formGrid} ${styles.dateTimeGrid}`}>
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
          placeholder="DD/MM/YYYY"
          inputClassName={styles.centeredFieldInput}
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

      <div className={`${styles.formGroup} ${styles.timeFieldGroup}`}>
        <label htmlFor="heure" className={styles.label}>
          <Clock size={18} aria-hidden="true" />
          Heure <span className={styles.asterisk}>*</span>
        </label>
        <div ref={pickerRef} className={styles.timePicker}>
          <input
            id="heure"
            className={`${styles.input} ${styles.timeTrigger} ${styles.centeredFieldInput} ${errors.heure ? styles.inputError : ''}`}
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            onFocus={() => setIsTimeOpen(true)}
            onBlur={commitManualTime}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitManualTime();
                setIsTimeOpen(false);
              }
            }}
            placeholder="HH:MM"
            inputMode="numeric"
            aria-label="Choisir une heure"
          />
          <Clock size={18} aria-hidden="true" className={styles.timeTriggerIcon} />

          {isTimeOpen && (
            <div className={styles.timePopover} role="dialog" aria-label="Sélecteur d'heure">
              <div className={styles.timeColumnTitle}>Créneaux rapides (toutes les 30 min)</div>
              <div className={styles.timeQuickList}>
                {quickSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`${styles.timeOption} ${heure === slot ? styles.timeOptionActive : ''}`}
                    onClick={() => handleQuickSlotSelect(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {errors.heure && <span className={styles.error}>{errors.heure}</span>}
      </div>
    </div>
  );
}
