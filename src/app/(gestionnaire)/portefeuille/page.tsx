'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { usePortefeuille } from '@/hooks/modules/usePortefeuille';
import { PortefeuilleSummary } from '@/components/features/portefeuille/PortefeuilleSummary';
import { PortefeuilleList } from '@/components/features/portefeuille/PortefeuilleList';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import styles from './portefeuille.module.css';

export default function PortefeuillePage() {
  const router = useRouter();
  const { coproprietes, filteredCoproprietes, kpis, recherche, setRecherche } = usePortefeuille();

  const totalLots = coproprietes.reduce((sum, c) => sum + c.nombreLots, 0);

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
