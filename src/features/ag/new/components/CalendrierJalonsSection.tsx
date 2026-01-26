'use client';

import { Calendar, Info } from 'lucide-react';
import { parseISO } from 'date-fns';
import { AGCalendrierJalons } from '@/components/features/ag/AGCalendrierJalons';
import { AGDelaisAlerts } from '@/components/features/ag/AGDelaisAlerts';
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
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Calendar size={20} />
          Calendrier des échéances légales
        </h2>
        <button type="button" className={styles.toggleCalendarBtn} onClick={onToggleCalendrier}>
          {showCalendrier ? 'Masquer' : 'Afficher'} le calendrier
        </button>
      </div>

      {alertes.length > 0 && (
        <div className={styles.alertesContainer}>
          <AGDelaisAlerts alertes={alertes.filter((a) => a.type === 'warning')} variant="compact" />
        </div>
      )}

      {showCalendrier && (
        <div className={styles.calendrierContainer}>
          <AGCalendrierJalons jalons={jalons} dateAG={parseISO(date)} mode="timeline" showLegend={true} />
        </div>
      )}

      <div className={styles.legalInfo}>
        <Info size={16} />
        <span>
          Les convocations doivent être envoyées au minimum <strong>{DELAIS_LEGAUX.convocation_min} jours</strong> avant
          la date de l'AG (Article 9 du décret du 17 mars 1967).
        </span>
      </div>
    </div>
  );
}
