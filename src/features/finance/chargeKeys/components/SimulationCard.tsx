'use client';

import styles from '@/app/(dashboard)/finance/cles-repartition/[id]/cle-detail.module.css';

interface SimulationResultItem {
  lot: {
    id: string;
    numero: string;
  };
  coproprietaire: {
    nom: string;
  };
  montant: number;
}

interface SimulationCardProps {
  showSimulation: boolean;
  simulationMontant: string;
  simulationResult: SimulationResultItem[] | null;
  onMontantChange: (value: string) => void;
}

export function SimulationCard({
  showSimulation,
  simulationMontant,
  simulationResult,
  onMontantChange,
}: SimulationCardProps) {
  if (!showSimulation) return null;

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Simulation de repartition</h2>
      <div className={styles.simulationInput}>
        <label>Montant a repartir</label>
        <div className={styles.inputGroup}>
          <input
            type="number"
            value={simulationMontant}
            onChange={e => onMontantChange(e.target.value)}
            min={0}
            step={100}
          />
          <span className={styles.inputSuffix}>EUR</span>
        </div>
      </div>
      {simulationResult && simulationResult.length > 0 && (
        <div className={styles.simulationResult}>
          <div className={styles.simulationTable}>
            {simulationResult.slice(0, 10).map(item => (
              <div key={item.lot.id} className={styles.simulationRow}>
                <div className={styles.simulationLot}>
                  <span className={styles.lotNumero}>{item.lot.numero}</span>
                  <span className={styles.simulationCopro}>{item.coproprietaire.nom}</span>
                </div>
                <div className={styles.simulationMontant}>
                  {item.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
            ))}
            {simulationResult.length > 10 && (
              <div className={styles.simulationMore}>+{simulationResult.length - 10} autres lots...</div>
            )}
          </div>
          <div className={styles.simulationTotal}>
            <span>Total</span>
            <strong>{parseFloat(simulationMontant).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
