'use client';

import { Calendar, ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { parseISO } from 'date-fns';
import { AGCalendrierJalons } from '@/components/features/ag/AGCalendrierJalons';
import { DELAIS_LEGAUX, type JalonAG } from '@/lib/constants/ag-delais-legaux';
import type { AlerteDelai } from '@/hooks/modules/useAGDelais';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface CalendrierJalonsSectionProps {
  date: string;
  jalons: JalonAG[];
  alertes: AlerteDelai[];
  showCalendrier: boolean;
  onToggleCalendrier: () => void;
}

export function CalendrierJalonsSection({
  date,
  jalons,
  alertes,
  showCalendrier,
  onToggleCalendrier,
}: CalendrierJalonsSectionProps) {
  const warningAlertes = alertes.filter((a) => a.type === 'warning');

  return (
    <div className={styles.calendrierSection}>
      <div className={styles.calendrierHeader}>
        <div className={styles.calendrierTitleGroup}>
          <Calendar size={20} className={styles.calendrierIcon} />
          <h2 className={styles.calendrierTitle}>Calendrier des échéances légales</h2>
          {warningAlertes.length > 0 && (
            <span className={styles.calendrierBadge}>
              <AlertTriangle size={14} />
              {warningAlertes.length}
            </span>
          )}
        </div>
        <button
          type="button"
          className={`${styles.calendrierToggleBtn} ${showCalendrier ? styles.calendrierToggleBtnActive : ''}`}
          onClick={onToggleCalendrier}
        >
          {showCalendrier ? 'Masquer' : 'Afficher'}
          {showCalendrier ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {showCalendrier && (
        <div className={styles.calendrierContent}>
          <AGCalendrierJalons jalons={jalons} dateAG={parseISO(date)} mode="timeline" showLegend={true} />
        </div>
      )}

      <div className={styles.calendrierLegalInfo}>
        <Info size={16} />
        <span>
          Convocations : minimum <strong>{DELAIS_LEGAUX.convocation_min} jours</strong> avant l'AG (Art. 9, décret 17/03/1967)
        </span>
      </div>
    </div>
  );
}
