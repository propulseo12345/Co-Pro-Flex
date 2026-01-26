'use client';

import { useMemo } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './DateFilterShortcuts.module.css';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export type ShortcutKey =
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'thisFiscalYear'
  | 'lastFiscalYear';

interface DateFilterShortcutsProps {
  selectedRange?: DateRange | null;
  onRangeChange: (range: DateRange) => void;
  fiscalYearStartMonth?: number; // 0-11 (0 = January)
  showLabel?: boolean;
  compact?: boolean;
  shortcuts?: ShortcutKey[];
  className?: string;
}

// Helper to get start of month
const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Helper to get end of month
const endOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

// Helper to get start of quarter
const startOfQuarter = (date: Date): Date => {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
};

// Helper to get end of quarter
const endOfQuarter = (date: Date): Date => {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
};

// Helper to get fiscal year dates
const getFiscalYearDates = (year: number, startMonth: number): { start: Date; end: Date } => {
  const start = new Date(year, startMonth, 1);
  const end = new Date(year + 1, startMonth, 0, 23, 59, 59, 999);
  return { start, end };
};

// Helper to get current fiscal year
const getCurrentFiscalYear = (today: Date, startMonth: number): { start: Date; end: Date } => {
  const year = today.getMonth() >= startMonth ? today.getFullYear() : today.getFullYear() - 1;
  return getFiscalYearDates(year, startMonth);
};

const DEFAULT_SHORTCUTS: ShortcutKey[] = [
  'thisMonth',
  'thisQuarter',
  'thisFiscalYear',
  'lastFiscalYear',
];

const SHORTCUT_LABELS: Record<ShortcutKey, string> = {
  today: "Aujourd'hui",
  thisWeek: 'Cette semaine',
  thisMonth: 'Ce mois',
  lastMonth: 'Mois dernier',
  thisQuarter: 'Ce trimestre',
  lastQuarter: 'Trimestre dernier',
  thisYear: 'Cette année',
  lastYear: 'Année dernière',
  thisFiscalYear: 'Cet exercice',
  lastFiscalYear: 'N-1',
};

export function DateFilterShortcuts({
  selectedRange,
  onRangeChange,
  fiscalYearStartMonth = 0, // Default to January
  showLabel = true,
  compact = false,
  shortcuts = DEFAULT_SHORTCUTS,
  className = '',
}: DateFilterShortcutsProps) {
  const today = useMemo(() => new Date(), []);

  const getShortcutRange = (key: ShortcutKey): DateRange => {
    const now = new Date();

    switch (key) {
      case 'today':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
          label: SHORTCUT_LABELS.today,
        };

      case 'thisWeek': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { startDate: startOfWeek, endDate: endOfWeek, label: SHORTCUT_LABELS.thisWeek };
      }

      case 'thisMonth':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
          label: SHORTCUT_LABELS.thisMonth,
        };

      case 'lastMonth': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth),
          label: SHORTCUT_LABELS.lastMonth,
        };
      }

      case 'thisQuarter':
        return {
          startDate: startOfQuarter(now),
          endDate: endOfQuarter(now),
          label: SHORTCUT_LABELS.thisQuarter,
        };

      case 'lastQuarter': {
        const lastQuarterMonth = now.getMonth() - 3;
        const lastQuarterDate = new Date(now.getFullYear(), lastQuarterMonth, 1);
        return {
          startDate: startOfQuarter(lastQuarterDate),
          endDate: endOfQuarter(lastQuarterDate),
          label: SHORTCUT_LABELS.lastQuarter,
        };
      }

      case 'thisYear':
        return {
          startDate: new Date(now.getFullYear(), 0, 1),
          endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
          label: SHORTCUT_LABELS.thisYear,
        };

      case 'lastYear':
        return {
          startDate: new Date(now.getFullYear() - 1, 0, 1),
          endDate: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
          label: SHORTCUT_LABELS.lastYear,
        };

      case 'thisFiscalYear': {
        const fiscalYear = getCurrentFiscalYear(now, fiscalYearStartMonth);
        return {
          startDate: fiscalYear.start,
          endDate: fiscalYear.end,
          label: SHORTCUT_LABELS.thisFiscalYear,
        };
      }

      case 'lastFiscalYear': {
        const currentFiscal = getCurrentFiscalYear(now, fiscalYearStartMonth);
        const lastFiscalYear = new Date(currentFiscal.start);
        lastFiscalYear.setFullYear(lastFiscalYear.getFullYear() - 1);
        const lastFiscal = getFiscalYearDates(lastFiscalYear.getFullYear(), fiscalYearStartMonth);
        return {
          startDate: lastFiscal.start,
          endDate: lastFiscal.end,
          label: SHORTCUT_LABELS.lastFiscalYear,
        };
      }

      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
          label: SHORTCUT_LABELS.thisMonth,
        };
    }
  };

  const isRangeSelected = (key: ShortcutKey): boolean => {
    if (!selectedRange) return false;
    const shortcutRange = getShortcutRange(key);
    return (
      selectedRange.startDate.getTime() === shortcutRange.startDate.getTime() &&
      selectedRange.endDate.getTime() === shortcutRange.endDate.getTime()
    );
  };

  const handleShortcutClick = (key: ShortcutKey) => {
    onRangeChange(getShortcutRange(key));
  };

  const formatDateRange = (range: DateRange): string => {
    const formatOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    const start = range.startDate.toLocaleDateString('fr-FR', formatOptions);
    const end = range.endDate.toLocaleDateString('fr-FR', formatOptions);
    return `${start} - ${end}`;
  };

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''} ${className}`}>
      {showLabel && (
        <span className={styles.label}>
          <Calendar size={16} aria-hidden="true" />
          Période :
        </span>
      )}
      <div className={styles.shortcuts}>
        {shortcuts.map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.shortcutButton} ${isRangeSelected(key) ? styles.active : ''}`}
            onClick={() => handleShortcutClick(key)}
          >
            {SHORTCUT_LABELS[key]}
          </button>
        ))}
      </div>
      {selectedRange && (
        <span className={styles.selectedRange}>
          {formatDateRange(selectedRange)}
        </span>
      )}
    </div>
  );
}

// Companion component for navigation between periods
interface PeriodNavigatorProps {
  currentRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  periodType: 'month' | 'quarter' | 'year';
  className?: string;
}

export function PeriodNavigator({
  currentRange,
  onRangeChange,
  periodType,
  className = '',
}: PeriodNavigatorProps) {
  const navigatePrevious = () => {
    const start = new Date(currentRange.startDate);
    const end = new Date(currentRange.endDate);

    switch (periodType) {
      case 'month':
        start.setMonth(start.getMonth() - 1);
        end.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        end.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        end.setFullYear(end.getFullYear() - 1);
        break;
    }

    onRangeChange({
      ...currentRange,
      startDate: start,
      endDate: end,
    });
  };

  const navigateNext = () => {
    const start = new Date(currentRange.startDate);
    const end = new Date(currentRange.endDate);

    switch (periodType) {
      case 'month':
        start.setMonth(start.getMonth() + 1);
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() + 3);
        end.setMonth(end.getMonth() + 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() + 1);
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    onRangeChange({
      ...currentRange,
      startDate: start,
      endDate: end,
    });
  };

  const getPeriodLabel = (): string => {
    const start = currentRange.startDate;
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    switch (periodType) {
      case 'month':
        return `${months[start.getMonth()]} ${start.getFullYear()}`;
      case 'quarter': {
        const quarter = Math.floor(start.getMonth() / 3) + 1;
        return `T${quarter} ${start.getFullYear()}`;
      }
      case 'year':
        return `${start.getFullYear()}`;
      default:
        return currentRange.label;
    }
  };

  return (
    <div className={`${styles.navigator} ${className}`}>
      <button
        type="button"
        className={styles.navButton}
        onClick={navigatePrevious}
        aria-label="Période précédente"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <span className={styles.periodLabel}>{getPeriodLabel()}</span>
      <button
        type="button"
        className={styles.navButton}
        onClick={navigateNext}
        aria-label="Période suivante"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
