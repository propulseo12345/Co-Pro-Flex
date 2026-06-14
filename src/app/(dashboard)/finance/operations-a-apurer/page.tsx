'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle2, Loader2, Info } from 'lucide-react';
import { FinanceTopBar } from '@/components/layout/FinanceTopBar/FinanceTopBar';
import { FinanceKpiStrip, type FinanceKpi } from '@/components/layout/FinanceKpiStrip/FinanceKpiStrip';
import { useWorksPendingSettlement, useSettleWorksBalance } from '@/hooks/modules/useFinanceData';
import type { WorksPendingSettlement } from '@/lib/finance/api';
import { OperationsAApurerTable } from './OperationsAApurerTable';
import { ApurerModal } from './ApurerModal';
import styles from './styles.module.css';

const eur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

function ageLabel(days: number): string {
  if (days <= 0) return 'Exercice en cours';
  if (days < 365) return `${Math.round(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 an' : `${years} ans`;
}

export default function OperationsAApurerPage() {
  const { data, isLoading, error, refresh } = useWorksPendingSettlement();
  const settle = useSettleWorksBalance();
  const [selected, setSelected] = useState<WorksPendingSettlement | null>(null);

  const rows = data ?? [];

  const handleConfirm = async () => {
    if (!selected) return;
    const res = await settle.mutate(selected.period_id);
    if (!res.error) {
      setSelected(null);
      await refresh();
    }
  };

  const totalAbs = rows.reduce((s, r) => s + Math.abs(r.works_balance), 0);
  const oldest = rows.reduce((max, r) => Math.max(max, r.age_days), 0);

  const kpis: FinanceKpi[] = [
    { label: 'Opérations à apurer', value: String(rows.length) },
    { label: 'Solde travaux total', value: eur(totalAbs), color: rows.length ? 'var(--warning)' : undefined },
    { label: 'Plus ancien report', value: oldest > 0 ? ageLabel(oldest) : '—' },
  ];

  const actions = (
    <button className={styles.btnIcon} onClick={() => refresh()} disabled={isLoading}>
      <RefreshCw size={15} /> Rafraîchir
    </button>
  );

  return (
    <div className={styles.page}>
      <FinanceTopBar
        title="Opérations à apurer"
        subtitle="Soldes travaux (compte 12) en attente d'affectation aux copropriétaires"
        actions={actions}
      />

      <div className={styles.content}>
        {isLoading && !data ? (
          <div className={styles.state}>
            <Loader2 size={28} className={styles.spin} />
            <div className={styles.stateSub}>Chargement des soldes travaux…</div>
          </div>
        ) : error ? (
          <div className={styles.errorCard}>Erreur : {error}</div>
        ) : rows.length === 0 ? (
          <div className={styles.state}>
            <CheckCircle2 size={40} className={styles.stateIcon} />
            <div className={styles.stateTitle}>Aucune opération à apurer</div>
            <div className={styles.stateSub}>
              Aucun solde travaux (compte 12) n&apos;est en attente d&apos;affectation. Les soldes travaux
              se reportent d&apos;exercice en exercice et apparaissent ici jusqu&apos;à leur affectation à la
              clôture définitive de l&apos;opération.
            </div>
          </div>
        ) : (
          <>
            <FinanceKpiStrip items={kpis} />

            <div className={styles.note}>
              <Info size={18} className={styles.noteIcon} />
              <span>
                Le résultat des <strong>travaux et opérations exceptionnelles</strong> reste sur le compte
                12 et se reporte d&apos;exercice en exercice (conformité). Affectez-le aux copropriétaires
                (450-2) <strong>uniquement à la clôture définitive de l&apos;opération</strong>.
              </span>
            </div>

            <OperationsAApurerTable rows={rows} onApurer={setSelected} />
          </>
        )}
      </div>

      {selected && (
        <ApurerModal
          row={selected}
          isLoading={settle.isLoading}
          error={settle.error}
          onConfirm={handleConfirm}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
