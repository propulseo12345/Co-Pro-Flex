'use client';

import { useState, useEffect, useCallback } from 'react';
import * as lotsApi from '@/lib/lots/api';
import styles from './SimulationModal.module.css';

// Simple interface matching the Supabase view data
interface CleForSimulation {
  key_id: string;
  copro_id: string;
  name: string;
  total_weight?: number;
  lots_count?: number;
}

interface SimulationModalProps {
  cle: CleForSimulation;
  initialMontant: string;
  onMontantChange: (value: string) => void;
  onClose: () => void;
}

interface RepartitionLigne {
  lotId: string;
  lotNumero: string;
  lotType: string;
  coproprietaireNom: string;
  tantiemes: number;
  pourcentage: number;
  montant: number;
}

interface RepartitionResult {
  totalTantiemes: number;
  montantTotal: number;
  lignes: RepartitionLigne[];
}

export function SimulationModal({ cle, initialMontant, onMontantChange, onClose }: SimulationModalProps) {
  const [montant, setMontant] = useState(initialMontant);
  const [repartition, setRepartition] = useState<RepartitionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCalculer = useCallback(async () => {
    const montantNum = parseFloat(montant);
    if (isNaN(montantNum) || montantNum <= 0) {
      return;
    }
    setIsLoading(true);

    // Fetch both key lines and lots with owners in parallel
    const [linesResult, lotsResult] = await Promise.all([
      lotsApi.listRepartitionKeyLines(cle.copro_id, cle.key_id),
      lotsApi.listLotsWithOwners(cle.copro_id),
    ]);

    const lines = linesResult.data || [];
    const lots = lotsResult.data || [];

    // Create a map of lot_id -> owner_display_name for quick lookup
    const ownerMap = new Map<string, string>();
    lots.forEach(lot => {
      ownerMap.set(lot.id, lot.owner_display_name || 'Sans propriétaire');
    });

    // Calculate total weight
    const totalWeight = lines.reduce((sum, line) => sum + (line.weight || 0), 0);

    // Calculate répartition for each lot
    const lignes: RepartitionLigne[] = lines.map(line => {
      const weight = line.weight || 0;
      const pourcentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
      const lotMontant = totalWeight > 0 ? (weight / totalWeight) * montantNum : 0;

      return {
        lotId: line.lot_id,
        lotNumero: line.lot_ref || 'N/A',
        lotType: line.lot_type || 'N/A',
        coproprietaireNom: ownerMap.get(line.lot_id) || 'Sans propriétaire',
        tantiemes: weight,
        pourcentage,
        montant: Math.round(lotMontant * 100) / 100, // Round to 2 decimals
      };
    });

    // Sort by tantiemes descending
    lignes.sort((a, b) => b.tantiemes - a.tantiemes);

    setRepartition({
      totalTantiemes: totalWeight,
      montantTotal: montantNum,
      lignes,
    });

    setIsLoading(false);
    onMontantChange(montant);
  }, [montant, cle.copro_id, cle.key_id, onMontantChange]);

  useEffect(() => {
    if (montant) {
      handleCalculer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${styles.simulationModal}`}>
        <div className={styles.modalHeader}>
          <h3>Simulation de répartition</h3>
          <span className={styles.modalSubtitle}>{cle.name}</span>
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
