'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { useAnnexeSummary } from '@/hooks/modules/useAnnexeSummary';
import type { AnnexeKpis } from '@/components/features/finance/Comptabilite/types';
import styles from './FinanceAnnexeStats.module.css';

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

interface FinanceAnnexeStatsProps {
  periodId?: string | null;
}

export function FinanceAnnexeStats({ periodId }: FinanceAnnexeStatsProps) {
  const fallback = useAnnexeSummary();
  const { currentCoproId } = useCopro();
  const [localKpis, setLocalKpis] = useState<AnnexeKpis | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const fetchKpis = useCallback(async (pid: string) => {
    if (!currentCoproId) return;
    setLocalLoading(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.rpc as any)(
      'fn_dashboard_kpis',
      { p_copro_id: currentCoproId, p_period_id: pid }
    );
    if (data) setLocalKpis(data as unknown as AnnexeKpis);
    setLocalLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    if (periodId) {
      fetchKpis(periodId);
    } else {
      setLocalKpis(null);
    }
  }, [periodId, fetchKpis]);

  const kpis = periodId ? localKpis : fallback.kpis;
  const isLoading = periodId ? localLoading : fallback.isLoading;
  const error = periodId ? null : fallback.error;

  if (isLoading || error || !kpis) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.stat}>
        <span className={styles.label}>Tresorerie</span>
        <span className={styles.value}>{formatEuro(kpis.tresorerie)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Creances</span>
        <span className={styles.value}>{formatEuro(kpis.total_impayes)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Provisions</span>
        <span className={styles.value}>{formatEuro(kpis.provisions_travaux)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Dettes</span>
        <span className={styles.value}>{formatEuro(kpis.dettes)}</span>
      </div>
    </div>
  );
}
