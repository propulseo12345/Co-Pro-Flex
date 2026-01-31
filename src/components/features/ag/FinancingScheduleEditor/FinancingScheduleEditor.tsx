'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Trash2, Calendar, Euro, AlertCircle, Check, RotateCcw } from 'lucide-react';
import styles from './FinancingScheduleEditor.module.css';

export type FrequencyType = 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel' | 'personnalise';

export interface ScheduleEntry {
  id: string;
  date: string; // ISO date string
  amount: number;
  label?: string;
}

export interface FinancingSchedule {
  frequency: FrequencyType;
  totalAmount: number;
  entries: ScheduleEntry[];
  exerciceYear: number;
}

interface FinancingScheduleEditorProps {
  value: FinancingSchedule | null;
  onChange: (schedule: FinancingSchedule) => void;
  totalBudget?: number;
  exerciceYear?: number;
  minEntries?: number;
  maxEntries?: number;
}

const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  mensuel: 'Mensuel (12 échéances)',
  trimestriel: 'Trimestriel (4 échéances)',
  semestriel: 'Semestriel (2 échéances)',
  annuel: 'Annuel (1 échéance)',
  personnalise: 'Personnalisé',
};

const FREQUENCY_MONTHS: Record<Exclude<FrequencyType, 'personnalise'>, number[]> = {
  mensuel: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  trimestriel: [1, 4, 7, 10],
  semestriel: [1, 7],
  annuel: [1],
};

function generateId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateDefaultEntries(
  frequency: FrequencyType,
  totalAmount: number,
  year: number
): ScheduleEntry[] {
  if (frequency === 'personnalise') {
    // Start with one entry
    return [
      {
        id: generateId(),
        date: `${year}-01-01`,
        amount: totalAmount,
        label: 'Échéance 1',
      },
    ];
  }

  const months = FREQUENCY_MONTHS[frequency];
  const amountPerEntry = Math.round((totalAmount / months.length) * 100) / 100;
  let remainder = totalAmount - amountPerEntry * months.length;

  return months.map((month, index) => {
    // Add remainder to first entry
    const amount = index === 0 ? amountPerEntry + remainder : amountPerEntry;
    const monthStr = month.toString().padStart(2, '0');
    return {
      id: generateId(),
      date: `${year}-${monthStr}-01`,
      amount: Math.round(amount * 100) / 100,
      label: `Échéance ${index + 1}`,
    };
  });
}

export function FinancingScheduleEditor({
  value,
  onChange,
  totalBudget = 0,
  exerciceYear = new Date().getFullYear() + 1,
  minEntries = 1,
  maxEntries = 12,
}: FinancingScheduleEditorProps) {
  const [frequency, setFrequency] = useState<FrequencyType>(value?.frequency || 'trimestriel');
  const [entries, setEntries] = useState<ScheduleEntry[]>(
    value?.entries || generateDefaultEntries('trimestriel', totalBudget, exerciceYear)
  );

  // Sync with external value changes
  useEffect(() => {
    if (value) {
      setFrequency(value.frequency);
      setEntries(value.entries);
    }
  }, [value]);

  // Calculate totals
  const { totalScheduled, difference, isBalanced } = useMemo(() => {
    const total = entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const diff = totalBudget - total;
    return {
      totalScheduled: total,
      difference: diff,
      isBalanced: Math.abs(diff) < 0.01,
    };
  }, [entries, totalBudget]);

  // Notify parent of changes
  const notifyChange = useCallback(
    (newFrequency: FrequencyType, newEntries: ScheduleEntry[]) => {
      onChange({
        frequency: newFrequency,
        totalAmount: newEntries.reduce((sum, e) => sum + (e.amount || 0), 0),
        entries: newEntries,
        exerciceYear,
      });
    },
    [onChange, exerciceYear]
  );

  // Handle frequency change
  const handleFrequencyChange = useCallback(
    (newFrequency: FrequencyType) => {
      setFrequency(newFrequency);
      const newEntries = generateDefaultEntries(newFrequency, totalBudget, exerciceYear);
      setEntries(newEntries);
      notifyChange(newFrequency, newEntries);
    },
    [totalBudget, exerciceYear, notifyChange]
  );

  // Handle entry date change
  const handleDateChange = useCallback(
    (id: string, date: string) => {
      const newEntries = entries.map((entry) =>
        entry.id === id ? { ...entry, date } : entry
      );
      setEntries(newEntries);
      notifyChange(frequency, newEntries);
    },
    [entries, frequency, notifyChange]
  );

  // Handle entry amount change
  const handleAmountChange = useCallback(
    (id: string, amountStr: string) => {
      const amount = parseFloat(amountStr) || 0;
      const newEntries = entries.map((entry) =>
        entry.id === id ? { ...entry, amount } : entry
      );
      setEntries(newEntries);
      notifyChange(frequency, newEntries);
    },
    [entries, frequency, notifyChange]
  );

  // Handle entry label change
  const handleLabelChange = useCallback(
    (id: string, label: string) => {
      const newEntries = entries.map((entry) =>
        entry.id === id ? { ...entry, label } : entry
      );
      setEntries(newEntries);
      notifyChange(frequency, newEntries);
    },
    [entries, frequency, notifyChange]
  );

  // Add new entry (only for personnalise)
  const handleAddEntry = useCallback(() => {
    if (entries.length >= maxEntries) return;

    const lastEntry = entries[entries.length - 1];
    const lastDate = lastEntry ? new Date(lastEntry.date) : new Date(exerciceYear, 0, 1);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + 1);

    const newEntry: ScheduleEntry = {
      id: generateId(),
      date: nextDate.toISOString().split('T')[0],
      amount: 0,
      label: `Échéance ${entries.length + 1}`,
    };

    const newEntries = [...entries, newEntry];
    setEntries(newEntries);
    notifyChange('personnalise', newEntries);
  }, [entries, exerciceYear, maxEntries, notifyChange]);

  // Remove entry (only for personnalise)
  const handleRemoveEntry = useCallback(
    (id: string) => {
      if (entries.length <= minEntries) return;

      const newEntries = entries.filter((entry) => entry.id !== id);
      setEntries(newEntries);
      notifyChange('personnalise', newEntries);
    },
    [entries, minEntries, notifyChange]
  );

  // Distribute equally
  const handleDistributeEqually = useCallback(() => {
    const amountPerEntry = Math.round((totalBudget / entries.length) * 100) / 100;
    let remainder = totalBudget - amountPerEntry * entries.length;

    const newEntries = entries.map((entry, index) => ({
      ...entry,
      amount: index === 0 ? amountPerEntry + remainder : amountPerEntry,
    }));

    setEntries(newEntries);
    notifyChange(frequency, newEntries);
  }, [entries, totalBudget, frequency, notifyChange]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Échéancier de financement</h4>
        {totalBudget > 0 && (
          <div className={styles.budgetInfo}>
            Budget total: <strong>{totalBudget.toLocaleString('fr-FR')} €</strong>
          </div>
        )}
      </div>

      <div className={styles.frequencySelector}>
        <label htmlFor="frequency" className={styles.label}>
          Fréquence des appels
        </label>
        <select
          id="frequency"
          value={frequency}
          onChange={(e) => handleFrequencyChange(e.target.value as FrequencyType)}
          className={styles.select}
        >
          {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.entriesList}>
        <div className={styles.entriesHeader}>
          <span className={styles.headerLabel}>Libellé</span>
          <span className={styles.headerDate}>Date d'exigibilité</span>
          <span className={styles.headerAmount}>Montant</span>
          {frequency === 'personnalise' && <span className={styles.headerActions}></span>}
        </div>

        {entries.map((entry, index) => (
          <div key={entry.id} className={styles.entryRow}>
            <input
              type="text"
              value={entry.label || ''}
              onChange={(e) => handleLabelChange(entry.id, e.target.value)}
              className={styles.labelInput}
              placeholder={`Échéance ${index + 1}`}
            />
            <div className={styles.dateInput}>
              <Calendar size={14} className={styles.inputIcon} />
              <input
                type="date"
                value={entry.date}
                onChange={(e) => handleDateChange(entry.id, e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.amountInput}>
              <Euro size={14} className={styles.inputIcon} />
              <input
                type="number"
                value={entry.amount || ''}
                onChange={(e) => handleAmountChange(entry.id, e.target.value)}
                className={styles.input}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
            {frequency === 'personnalise' && (
              <button
                type="button"
                onClick={() => handleRemoveEntry(entry.id)}
                className={styles.removeBtn}
                disabled={entries.length <= minEntries}
                title="Supprimer cette échéance"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {frequency === 'personnalise' && entries.length < maxEntries && (
        <button type="button" onClick={handleAddEntry} className={styles.addBtn}>
          <Plus size={14} /> Ajouter une échéance
        </button>
      )}

      <div className={styles.footer}>
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Total planifié:</span>
            <span className={styles.summaryValue}>
              {totalScheduled.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </span>
          </div>
          {totalBudget > 0 && (
            <div
              className={`${styles.summaryRow} ${
                isBalanced ? styles.balanced : styles.unbalanced
              }`}
            >
              {isBalanced ? (
                <>
                  <Check size={14} />
                  <span>Équilibré</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} />
                  <span>
                    Différence: {difference > 0 ? '+' : ''}
                    {difference.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {!isBalanced && totalBudget > 0 && (
          <button
            type="button"
            onClick={handleDistributeEqually}
            className={styles.distributeBtn}
            title="Répartir le budget équitablement"
          >
            <RotateCcw size={14} /> Répartir équitablement
          </button>
        )}
      </div>
    </div>
  );
}
