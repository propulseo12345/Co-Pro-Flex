'use client';

import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import {
  format,
  parse,
  isValid,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  id?: string;
  name?: string;
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;

  // Validation
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];

  // Erreur externe
  error?: string;

  // Options
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  inputClassName?: string;

  // Aide
  hint?: string;

  // Callback de validation personnalisée
  validate?: (date: Date) => string | null;
}

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const FORMAT_AFFICHAGE = 'dd/MM/yyyy';
const FORMAT_INPUT = 'dd/MM/yyyy';

export function DatePicker({
  id: providedId,
  name,
  label,
  value,
  onChange,
  required = false,
  minDate,
  maxDate,
  disabledDates = [],
  error: externalError,
  placeholder = 'JJ/MM/AAAA',
  disabled = false,
  clearable = true,
  inputClassName,
  hint,
  validate,
}: DatePickerProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [viewDate, setViewDate] = useState(value || new Date());
  const [internalError, setInternalError] = useState<string | null>(null);

  // Synchroniser l'input avec la valeur
  useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, FORMAT_AFFICHAGE, { locale: fr }));
    } else {
      setInputValue('');
    }
  }, [value]);

  // Fermer le calendrier si clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Validation de la date
  const validateDate = useCallback((date: Date): string | null => {
    if (!isValid(date)) {
      return 'Date invalide';
    }

    if (minDate && isBefore(date, minDate)) {
      return `La date doit être après le ${format(minDate, FORMAT_AFFICHAGE, { locale: fr })}`;
    }

    if (maxDate && isAfter(date, maxDate)) {
      return `La date doit être avant le ${format(maxDate, FORMAT_AFFICHAGE, { locale: fr })}`;
    }

    if (disabledDates.some(d => isSameDay(d, date))) {
      return 'Cette date n\'est pas disponible';
    }

    // Validation personnalisée
    if (validate) {
      return validate(date);
    }

    return null;
  }, [minDate, maxDate, disabledDates, validate]);

  // Parser et valider l'input texte
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    setInternalError(null);

    // Permettre la saisie en cours
    if (text.length < 10) {
      return;
    }

    // Essayer de parser la date
    const parsed = parse(text, FORMAT_INPUT, new Date(), { locale: fr });

    if (!isValid(parsed)) {
      setInternalError('Format attendu : JJ/MM/AAAA');
      return;
    }

    const validationError = validateDate(parsed);
    if (validationError) {
      setInternalError(validationError);
      return;
    }

    onChange(parsed);
    setViewDate(parsed);
  };

  // Gérer le blur pour valider
  const handleInputBlur = () => {
    if (!inputValue) {
      if (required) {
        setInternalError('Ce champ est obligatoire');
      }
      onChange(null);
      return;
    }

    const parsed = parse(inputValue, FORMAT_INPUT, new Date(), { locale: fr });

    if (!isValid(parsed)) {
      setInternalError('Format attendu : JJ/MM/AAAA');
      return;
    }

    const validationError = validateDate(parsed);
    if (validationError) {
      setInternalError(validationError);
      return;
    }

    // Tout est OK
    setInternalError(null);
    onChange(parsed);
  };

  // Sélection depuis le calendrier
  const handleDayClick = (day: Date) => {
    const validationError = validateDate(day);
    if (validationError) {
      setInternalError(validationError);
      return;
    }

    setInternalError(null);
    onChange(day);
    setInputValue(format(day, FORMAT_AFFICHAGE, { locale: fr }));
    setIsOpen(false);
  };

  // Effacer la valeur
  const handleClear = () => {
    setInputValue('');
    setInternalError(null);
    onChange(null);
    inputRef.current?.focus();
  };

  // Navigation du calendrier
  const goToPreviousMonth = () => setViewDate(subMonths(viewDate, 1));
  const goToNextMonth = () => setViewDate(addMonths(viewDate, 1));

  // Générer les jours du mois
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Vérifier si un jour est désactivé
  const isDayDisabled = (day: Date): boolean => {
    if (minDate && isBefore(day, minDate)) return true;
    if (maxDate && isAfter(day, maxDate)) return true;
    if (disabledDates.some(d => isSameDay(d, day))) return true;
    return false;
  };

  const error = externalError || internalError;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.container}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span className={styles.required} aria-hidden="true">*</span>}
      </label>

      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${styles.input} ${error ? styles.inputError : ''} ${inputClassName || ''}`.trim()}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          autoComplete="off"
        />

        <div className={styles.inputIcons}>
          {clearable && value && !disabled && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClear}
              aria-label="Effacer la date"
              tabIndex={-1}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className={styles.calendarBtn}
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
            aria-label="Ouvrir le calendrier"
            aria-expanded={isOpen}
            tabIndex={-1}
          >
            <Calendar size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Calendrier */}
        {isOpen && !disabled && (
          <div
            ref={calendarRef}
            className={styles.calendar}
            role="dialog"
            aria-modal="true"
            aria-label="Sélecteur de date"
          >
            {/* Header du calendrier */}
            <div className={styles.calendarHeader}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={goToPreviousMonth}
                aria-label="Mois précédent"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>

              <span className={styles.monthYear}>
                {format(viewDate, 'MMMM yyyy', { locale: fr })}
              </span>

              <button
                type="button"
                className={styles.navBtn}
                onClick={goToNextMonth}
                aria-label="Mois suivant"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Jours de la semaine */}
            <div className={styles.weekDays}>
              {JOURS_SEMAINE.map(jour => (
                <span key={jour} className={styles.weekDay}>{jour}</span>
              ))}
            </div>

            {/* Grille des jours */}
            <div className={styles.daysGrid} role="grid">
              {days.map(day => {
                const isCurrentMonth = isSameMonth(day, viewDate);
                const isSelected = value && isSameDay(day, value);
                const isToday = isSameDay(day, new Date());
                const isDisabled = isDayDisabled(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={`
                      ${styles.dayBtn}
                      ${!isCurrentMonth ? styles.otherMonth : ''}
                      ${isSelected ? styles.selected : ''}
                      ${isToday ? styles.today : ''}
                      ${isDisabled ? styles.disabled : ''}
                    `}
                    onClick={() => !isDisabled && handleDayClick(day)}
                    disabled={isDisabled}
                    aria-selected={isSelected || undefined}
                    aria-disabled={isDisabled}
                    tabIndex={isSelected ? 0 : -1}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Bouton Aujourd'hui */}
            <div className={styles.calendarFooter}>
              <button
                type="button"
                className={styles.todayBtn}
                onClick={() => {
                  const today = new Date();
                  if (!isDayDisabled(today)) {
                    handleDayClick(today);
                  } else {
                    setViewDate(today);
                  }
                }}
              >
                Aujourd&apos;hui
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}

      {/* Erreur */}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
