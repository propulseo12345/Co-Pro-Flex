'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { StepHeader } from '../shared/StepHeader';
import { listLots, saveRepriseSoldes } from '@/lib/onboarding/api';
import type { SoldeInitialEntry } from '@/lib/onboarding/api';
import styles from './Step7RepriseSoldes.module.css';

interface Step7Props {
  coproId: string;
  periodId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface LotInfo {
  id: string;
  ref: string;
  type: string | null;
  ownerName: string | null;
}

export function Step7RepriseSoldes({ coproId, periodId, onComplete, onBack }: Step7Props) {
  const [lots, setLots] = useState<LotInfo[]>([]);
  const [soldes, setSoldes] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await listLots(coproId);
      if (res.data) setLots(res.data);
    }
    load();
  }, [coproId]);

  const totalSolde = useMemo(() => {
    return Object.values(soldes).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  }, [soldes]);

  const handleSoldeChange = useCallback((lotId: string, value: string) => {
    setSoldes(prev => ({ ...prev, [lotId]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    const entries: SoldeInitialEntry[] = lots
      .map(lot => ({
        lotId: lot.id,
        amount: parseFloat(soldes[lot.id] || '0') || 0,
      }))
      .filter(e => e.amount !== 0);

    if (entries.length === 0) {
      setIsSaving(false);
      onComplete();
      return;
    }

    const res = await saveRepriseSoldes(coproId, periodId, entries);
    setIsSaving(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setSuccess(true);
    }
  }, [coproId, periodId, lots, soldes, onComplete]);

  const handleFinish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Reprise de soldes"
        description="Saisissez le solde de chaque lot à ce jour. Montant positif = le copropriétaire doit de l'argent. Négatif = il a un avoir."
      />

      <div className={styles.infoBox}>
        Cette étape permet de démarrer avec les bons soldes pour chaque copropriétaire.
        Si vous ne connaissez pas les soldes exacts, vous pouvez passer cette étape et les saisir plus tard.
      </div>

      {success ? (
        <div className={styles.successBox}>
          <span className={styles.successText}>Soldes enregistrés avec succès</span>
        </div>
      ) : lots.length === 0 ? (
        <div className={styles.emptyState}>Aucun lot trouvé pour cette copropriété.</div>
      ) : (
        <>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.th}>Lot</th>
                <th className={styles.th}>Propriétaire</th>
                <th className={styles.thRight}>Solde initial (€)</th>
              </tr>
            </thead>
            <tbody>
              {lots.map(lot => {
                const val = parseFloat(soldes[lot.id] || '0') || 0;
                return (
                  <tr key={lot.id} className={styles.tr}>
                    <td className={styles.tdRef}>{lot.ref}</td>
                    <td className={styles.tdOwner}>{lot.ownerName || '—'}</td>
                    <td className={styles.tdInput}>
                      <input
                        className={`${styles.soldeInput} ${val > 0 ? styles.soldePositive : val < 0 ? styles.soldeNegative : ''}`}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={soldes[lot.id] || ''}
                        onChange={e => handleSoldeChange(lot.id, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className={styles.totalBar}>
            <span className={styles.totalLabel}>Total des soldes</span>
            <span className={`${styles.totalAmount} ${totalSolde > 0 ? styles.totalPositive : totalSolde < 0 ? styles.totalNegative : styles.totalZero}`}>
              {totalSolde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}
        </>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <div className={styles.footerRight}>
          {!success && (
            <button className={styles.skipBtn} onClick={handleFinish}>
              Passer
            </button>
          )}
          <button
            className={styles.btnFinish}
            onClick={success ? handleFinish : handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Enregistrement...' : success ? 'Terminer la configuration' : 'Enregistrer et terminer'}
          </button>
        </div>
      </div>
    </div>
  );
}
