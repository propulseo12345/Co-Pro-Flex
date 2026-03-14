'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Plus, ChevronDown, Calendar } from 'lucide-react';
import type { AccountingPeriod } from '@/lib/finance/api';
import styles from '../styles/AppelsFondsPage.module.css';

interface AppelsFondsHeaderProps {
  periods: AccountingPeriod[];
  selectedPeriod: AccountingPeriod | null;
  onSelectPeriod: (periodId: string) => void;
  onGenerate: () => void;
  onExport: () => void;
}

function formatPeriodDates(period: AccountingPeriod): string {
  const start = new Date(period.start_date).toLocaleDateString('fr-FR');
  const end = new Date(period.end_date).toLocaleDateString('fr-FR');
  return `${start} — ${end}`;
}

export function AppelsFondsHeader({
  periods,
  selectedPeriod,
  onSelectPeriod,
  onGenerate,
  onExport,
}: AppelsFondsHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown au clic exterieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.headerTitle}>Appels de fonds</h1>
          <p className={styles.headerSubtitle}>
            Budget courant et travaux — suivi par exercice
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnSecondary} onClick={onExport}>
            <Download size={14} /> Export
          </button>
          <button className={styles.btnPrimary} onClick={onGenerate}>
            <Plus size={14} /> Générer les appels
          </button>
        </div>
      </div>

      <div className={styles.periodBar} ref={dropdownRef}>
        <button
          className={styles.periodSelector}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Calendar size={16} />
          <span className={styles.periodLabel}>
            {selectedPeriod?.name ?? 'Sélectionner un exercice'}
          </span>
          {selectedPeriod && (
            <span className={styles.periodMeta}>
              {formatPeriodDates(selectedPeriod)}
            </span>
          )}
          <ChevronDown size={14} className={isOpen ? styles.chevronOpen : styles.chevron} />
        </button>

        {isOpen && (
          <div className={styles.periodDropdown}>
            {periods.map(period => (
              <button
                key={period.id}
                className={`${styles.periodOption} ${period.id === selectedPeriod?.id ? styles.periodOptionActive : ''}`}
                onClick={() => {
                  onSelectPeriod(period.id);
                  setIsOpen(false);
                }}
              >
                <span className={styles.periodOptionName}>{period.name}</span>
                <span className={styles.periodOptionDates}>{formatPeriodDates(period)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
