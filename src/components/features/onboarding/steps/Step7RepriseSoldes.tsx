'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { StepHeader } from '../shared/StepHeader';
import { listLotsWithOwners } from '@/lib/lots/api';
import type { SoldeOpeningEntry, SoldeNature } from '@/lib/onboarding/api';
import styles from './Step7RepriseSoldes.module.css';

interface Step7Props {
  coproId: string;
  periodId: string;
  onComplete: (entries: SoldeOpeningEntry[]) => void;
  onBack: () => void;
}

interface LotInfo {
  id: string;
  ref: string;
  type: string | null;
  ownerName: string | null;
}

const NATURES: { key: SoldeNature; label: string }[] = [
  { key: 'current', label: 'Courant' },
  { key: 'works', label: 'Travaux' },
  { key: 'alur', label: 'Fonds ALUR' },
];

export function Step7RepriseSoldes({ coproId, onComplete, onBack }: Step7Props) {
  const [lots, setLots] = useState<LotInfo[]>([]);
  // clé = `${lotId}:${nature}`
  const [soldes, setSoldes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data } = await listLotsWithOwners(coproId);
      if (data) {
        setLots(data.map(l => ({
          id: l.id,
          ref: l.ref,
          type: l.type,
          ownerName: l.owner_display_name || null,
        })));
      }
    }
    load();
  }, [coproId]);

  const totalSolde = useMemo(() => {
    return Object.values(soldes).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }, [soldes]);

  const handleSoldeChange = useCallback((lotId: string, nature: SoldeNature, value: string) => {
    setSoldes(prev => ({ ...prev, [`${lotId}:${nature}`]: value }));
  }, []);

  const handleConfirm = useCallback(() => {
    const entries: SoldeOpeningEntry[] = [];
    for (const lot of lots) {
      for (const n of NATURES) {
        const amount = parseFloat(soldes[`${lot.id}:${n.key}`] || '0') || 0;
        if (amount !== 0) entries.push({ lotId: lot.id, nature: n.key, amount });
      }
    }
    onComplete(entries);
  }, [lots, soldes, onComplete]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Reprise de soldes"
        description="Saisissez le solde de chaque lot à ce jour, par nature. Montant positif = le copropriétaire doit de l'argent. Négatif = il a un avoir."
      />

      <div className={styles.infoBox}>
        Cette étape permet de démarrer avec les bons soldes pour chaque copropriétaire.
        Si vous ne connaissez pas les soldes exacts, vous pouvez passer cette étape et les saisir plus tard.
        Les écritures sont enregistrées à l&apos;étape de finalisation.
      </div>

      {lots.length === 0 ? (
        <div className={styles.emptyState}>Aucun lot trouvé pour cette copropriété.</div>
      ) : (
        <>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.th}>Lot</th>
                <th className={styles.th}>Propriétaire</th>
                {NATURES.map(n => (
                  <th key={n.key} className={styles.thRight}>{n.label} (€)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lots.map(lot => (
                <tr key={lot.id} className={styles.tr}>
                  <td className={styles.tdRef}>{lot.ref}</td>
                  <td className={styles.tdOwner}>{lot.ownerName || '—'}</td>
                  {NATURES.map(n => {
                    const raw = soldes[`${lot.id}:${n.key}`] || '';
                    const val = parseFloat(raw) || 0;
                    return (
                      <td key={n.key} className={styles.tdInput}>
                        <input
                          className={`${styles.soldeInput} ${val > 0 ? styles.soldePositive : val < 0 ? styles.soldeNegative : ''}`}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={raw}
                          onChange={e => handleSoldeChange(lot.id, n.key, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.totalBar}>
            <span className={styles.totalLabel}>Total des soldes</span>
            <span className={`${styles.totalAmount} ${totalSolde > 0 ? styles.totalPositive : totalSolde < 0 ? styles.totalNegative : styles.totalZero}`}>
              {totalSolde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <div className={styles.footerRight}>
          <button className={styles.skipBtn} onClick={() => onComplete([])}>
            Passer
          </button>
          <button className={styles.btnFinish} onClick={handleConfirm}>
            Valider les soldes
          </button>
        </div>
      </div>
    </div>
  );
}
