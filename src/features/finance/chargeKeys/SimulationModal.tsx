'use client';

import { useState, useEffect } from 'react';
import { clesRepartitionApi } from '@/shared/services';
import type { MockCleRepartition } from '@/shared/mock/finance';
import styles from './SimulationModal.module.css';

interface SimulationModalProps {
  cle: MockCleRepartition;
  initialMontant: string;
  onMontantChange: (value: string) => void;
  onClose: () => void;
}

type RepartitionResult = Awaited<ReturnType<typeof clesRepartitionApi.calculerRepartition>>['data'];

export function SimulationModal({ cle, initialMontant, onMontantChange, onClose }: SimulationModalProps) {
  const [montant, setMontant] = useState(initialMontant);
  const [repartition, setRepartition] = useState<RepartitionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculer = async () => {
    const montantNum = parseFloat(montant);
    if (isNaN(montantNum) || montantNum <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }
    setIsLoading(true);
    const result = await clesRepartitionApi.calculerRepartition(cle.id, montantNum);
    if (result.success && result.data) {
      setRepartition(result.data);
    }
    setIsLoading(false);
    onMontantChange(montant);
  };

  useEffect(() => {
    handleCalculer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${styles.simulationModal}`}>
        <div className={styles.modalHeader}>
          <h3>Simulation de répartition</h3>
          <span className={styles.modalSubtitle}>{cle.nom}</span>
        </div>

        <div className={styles.simulationInput}>
          <label>Montant à répartir</label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="10000"
              min="0"
              step="100"
            />
            <span className={styles.inputSuffix}>EUR</span>
            <button className="btn btn-primary" onClick={handleCalculer} disabled={isLoading}>
              {isLoading ? 'Calcul...' : 'Calculer'}
            </button>
          </div>
        </div>

        {repartition && (
          <div className={styles.repartitionResult}>
            <div className={styles.repartitionSummary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total tantièmes</span>
                <span className={styles.summaryValue}>{repartition.totalTantiemes.toLocaleString('fr-FR')}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Nombre de lots</span>
                <span className={styles.summaryValue}>{repartition.lignes.length}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Montant réparti</span>
                <span className={styles.summaryValue}>{repartition.montantTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>

            <div className={styles.repartitionTable}>
              <table>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Copropriétaire</th>
                    <th className={styles.textRight}>Tantièmes</th>
                    <th className={styles.textRight}>%</th>
                    <th className={styles.textRight}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {repartition.lignes.map((ligne) => (
                    <tr key={ligne.lotId}>
                      <td>
                        <span className={styles.lotNumero}>{ligne.lotNumero}</span>
                        <span className={styles.lotType}>{ligne.lotType}</span>
                      </td>
                      <td>{ligne.coproprietaireNom}</td>
                      <td className={styles.textRight}>{ligne.tantiemes.toLocaleString('fr-FR')}</td>
                      <td className={styles.textRight}>{ligne.pourcentage.toFixed(2)}%</td>
                      <td className={styles.textRight}>
                        {ligne.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>Total</strong></td>
                    <td className={styles.textRight}><strong>{repartition.totalTantiemes.toLocaleString('fr-FR')}</strong></td>
                    <td className={styles.textRight}><strong>100%</strong></td>
                    <td className={styles.textRight}>
                      <strong>{repartition.montantTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
