'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { usePortefeuille } from '@/hooks/modules/usePortefeuille';
import { PortefeuilleKpis, PortefeuilleGrid } from '@/components/features/portefeuille';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import styles from './portefeuille.module.css';

export default function PortefeuillePage() {
  const router = useRouter();
  const { filteredCoproprietes, kpis, recherche, setRecherche } = usePortefeuille();

  const totalLots = filteredCoproprietes.reduce((sum, c) => sum + c.nombreLots, 0);

  const handleSelectCopro = (copro: ICoproprietePortefeuille) => {
    setActiveCopro(copro.id as string, copro.nom);
    router.push('/dashboard');
  };

  const handleNewCopro = () => {
    router.push('/onboarding');
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <h1>Mon Portefeuille</h1>
          <p>Vue consolidée de vos {filteredCoproprietes.length} copropriétés · {totalLots} lots</p>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.btnPrimary} onClick={handleNewCopro} type="button">
            <Plus size={18} />
            Nouvelle copropriété
          </button>
        </div>
      </div>

      <PortefeuilleKpis kpis={kpis} />

      <PortefeuilleGrid
        coproprietes={filteredCoproprietes}
        recherche={recherche}
        onRecherche={setRecherche}
        onSelectCopro={handleSelectCopro}
      />
    </div>
  );
}
