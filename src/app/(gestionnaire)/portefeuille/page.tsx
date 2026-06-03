'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { usePortefeuille } from '@/hooks/modules/usePortefeuille';
import { PortefeuilleSummary } from '@/components/features/portefeuille/PortefeuilleSummary';
import { PortefeuilleList } from '@/components/features/portefeuille/PortefeuilleList';
import { RepriseAlertCard } from '@/components/features/onboarding/reprise/RepriseAlertCard';
import { RepriseAlertModal } from '@/components/features/onboarding/reprise/RepriseAlertModal';
import { getRepriseResidual, type RepriseAlert } from '@/lib/onboarding/reprise-alert';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import styles from './portefeuille.module.css';

export default function PortefeuillePage() {
  const router = useRouter();
  const { coproprietes, filteredCoproprietes, kpis, recherche, setRecherche } = usePortefeuille();

  const totalLots = coproprietes.reduce((sum, c) => sum + c.nombreLots, 0);

  const [alerts, setAlerts] = useState<Array<RepriseAlert & { name: string }>>([]);
  const [openCoproId, setOpenCoproId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAlerts() {
      const results = await Promise.all(
        coproprietes.map(async c => {
          const { data } = await getRepriseResidual(c.id as string);
          return { coproId: c.id as string, name: c.nom, residual: data ?? 0 };
        })
      );
      if (!cancelled) setAlerts(results.filter(a => Math.abs(a.residual) >= 0.01));
    }
    if (coproprietes.length > 0) loadAlerts();
    return () => { cancelled = true; };
  }, [coproprietes]);

  const handleSelectCopro = (copro: ICoproprietePortefeuille) => {
    setActiveCopro(copro.id as string, copro.nom);
    router.push('/dashboard');
  };

  const handleNewCopro = () => {
    router.push('/onboarding');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Mon Portefeuille</h1>
          <p className={styles.headerSub}>
            Vue consolidee de vos {coproprietes.length} coproprietes &middot; {totalLots} lots
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={handleNewCopro} type="button">
          <Plus size={18} />
          Nouvelle copropriete
        </button>
      </header>

      {/* Summary Hero */}
      <PortefeuilleSummary kpis={kpis} coproprietes={coproprietes} />

      {/* Alertes reprise à terminer (net 471/472 != 0) */}
      {alerts.length > 0 && (
        <div className={styles.repriseAlerts}>
          {alerts.map(a => (
            <RepriseAlertCard
              key={a.coproId}
              coproName={a.name}
              residual={a.residual}
              onOpen={() => setOpenCoproId(a.coproId)}
            />
          ))}
        </div>
      )}

      {openCoproId && (
        <RepriseAlertModal coproId={openCoproId} onClose={() => setOpenCoproId(null)} />
      )}

      {/* Property List */}
      <PortefeuilleList
        coproprietes={filteredCoproprietes}
        recherche={recherche}
        onRecherche={setRecherche}
        onSelectCopro={handleSelectCopro}
      />
    </div>
  );
}
