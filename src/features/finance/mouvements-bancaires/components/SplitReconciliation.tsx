'use client';

import { useState, useCallback } from 'react';
import { CheckCircle, ArrowLeftRight } from 'lucide-react';
import type { SuggestionRapprochementResult } from '../domain/matching-engine';
import styles from './SplitReconciliation.module.css';

interface SplitReconciliationProps {
  suggestions: SuggestionRapprochementResult[];
  onApply: (matches: Map<string, string>) => void;
  isMutating: boolean;
  ecartSoldes: number;
}

export function SplitReconciliation({ suggestions, onApply, isMutating, ecartSoldes }: SplitReconciliationProps) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    suggestions.forEach(s => {
      const autoMatch = s.suggestions.find(sg => sg.preChecked);
      if (autoMatch) initial.add(s.mouvement.id);
    });
    return initial;
  });
  const [manualMatches] = useState<Map<string, string>>(new Map());

  const getSelectedTargetId = useCallback((mouvementId: string): string => {
    const manual = manualMatches.get(mouvementId);
    if (manual) return manual;
    const sugg = suggestions.find(s => s.mouvement.id === mouvementId);
    const autoMatch = sugg?.suggestions.find(sg => sg.preChecked);
    return autoMatch?.targetId || '';
  }, [manualMatches, suggestions]);

  const toggleCheck = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const matches = new Map<string, string>();
    checked.forEach(mouvementId => {
      const targetId = getSelectedTargetId(mouvementId);
      if (targetId) matches.set(mouvementId, targetId);
    });
    onApply(matches);
  }, [checked, getSelectedTargetId, onApply]);

  const formatMontant = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const selectedCount = checked.size;

  if (suggestions.length === 0) {
    return (
      <div className={styles.empty}>
        <CheckCircle size={32} className={styles.emptyIcon} />
        <p>Tous les mouvements sont rapprochés</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.ecartBar}>
        <span className={styles.ecartLabel}>Écart résiduel</span>
        <span className={ecartSoldes === 0 ? styles.ecartZero : styles.ecartNonZero}>
          {formatMontant(ecartSoldes)}
        </span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCol}>
                <input
                  type="checkbox"
                  checked={checked.size > 0 && checked.size === suggestions.length}
                  onChange={() => {
                    if (checked.size === suggestions.length) setChecked(new Set());
                    else setChecked(new Set(suggestions.map(s => s.mouvement.id)));
                  }}
                />
              </th>
              <th>Date</th>
              <th>Mouvement</th>
              <th className={styles.alignRight}>Montant</th>
              <th className={styles.arrowCol}></th>
              <th>Correspondance</th>
              <th className={styles.alignRight}>Écart</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map(({ mouvement, suggestions: suggList }) => {
              const bestMatch = suggList.length > 0 ? suggList[0] : null;

              return (
                <tr key={mouvement.id} className={checked.has(mouvement.id) ? styles.rowChecked : ''}>
                  <td className={styles.checkCol}>
                    <input
                      type="checkbox"
                      checked={checked.has(mouvement.id)}
                      onChange={() => toggleCheck(mouvement.id)}
                      disabled={!bestMatch && !manualMatches.has(mouvement.id)}
                    />
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className={styles.libelleCell}>{mouvement.libelle}</td>
                  <td className={`${styles.alignRight} ${mouvement.montant >= 0 ? styles.montantPositif : styles.montantNegatif}`}>
                    {formatMontant(mouvement.montant)}
                  </td>
                  <td className={styles.arrowCol}>
                    <ArrowLeftRight size={14} className={styles.arrowIcon} />
                  </td>
                  <td>
                    {bestMatch ? (
                      <div className={styles.matchCell}>
                        <span className={styles.matchCompte}>{bestMatch.label}</span>
                        <span className={`${styles.badge} ${bestMatch.confiance === 'haute' ? styles.badgeSuccess : styles.badgeWarning}`}>
                          {bestMatch.confiance}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Aucune correspondance</span>
                    )}
                  </td>
                  <td className={styles.alignRight}>
                    {bestMatch && (
                      <span className={bestMatch.ecart < 0.01 ? styles.ecartOk : styles.ecartWarn}>
                        {bestMatch.ecart < 0.01 ? '0,00 €' : formatMontant(bestMatch.ecart)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCount > 0 && (
        <div className={styles.actionBar}>
          <span className={styles.actionCount}>{selectedCount} rapprochement{selectedCount > 1 ? 's' : ''}</span>
          <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={isMutating}
          >
            {isMutating ? 'Validation...' : `Valider ${selectedCount} rapprochement${selectedCount > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
