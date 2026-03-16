'use client';

import { useState, useMemo, useCallback } from 'react';
import { CheckCircle, ArrowLeftRight, ChevronDown } from 'lucide-react';
import type { EcritureComptable } from '../domain/types';
import type { SuggestionRapprochementResult } from '../domain/matching-engine';
import styles from './SplitReconciliation.module.css';

interface SplitReconciliationProps {
  suggestions: SuggestionRapprochementResult[];
  ecritures: EcritureComptable[];
  onApply: (matches: Map<string, string>) => void;
  isMutating: boolean;
  ecartSoldes: number;
}

export function SplitReconciliation({ suggestions, ecritures, onApply, isMutating, ecartSoldes }: SplitReconciliationProps) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    suggestions.forEach(s => {
      const autoMatch = s.suggestions.find(sg => sg.preChecked);
      if (autoMatch) initial.add(s.mouvement.id);
    });
    return initial;
  });
  const [manualMatches, setManualMatches] = useState<Map<string, string>>(new Map());

  const ecrituresNonRapprochees = useMemo(() => {
    return ecritures.filter(ec => !ec.rapproche);
  }, [ecritures]);

  const getSelectedEcritureId = useCallback((mouvementId: string): string => {
    const manual = manualMatches.get(mouvementId);
    if (manual) return manual;
    const sugg = suggestions.find(s => s.mouvement.id === mouvementId);
    const autoMatch = sugg?.suggestions.find(sg => sg.preChecked);
    return autoMatch?.ecritureId || '';
  }, [manualMatches, suggestions]);

  const toggleCheck = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleManualMatch = useCallback((mouvementId: string, ecritureId: string) => {
    setManualMatches(prev => {
      const next = new Map(prev);
      next.set(mouvementId, ecritureId);
      return next;
    });
    setChecked(prev => {
      const next = new Set(prev);
      next.add(mouvementId);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const matches = new Map<string, string>();
    checked.forEach(mouvementId => {
      const ecritureId = getSelectedEcritureId(mouvementId);
      if (ecritureId) matches.set(mouvementId, ecritureId);
    });
    onApply(matches);
  }, [checked, getSelectedEcritureId, onApply]);

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
      {/* Écart résiduel */}
      <div className={styles.ecartBar}>
        <span className={styles.ecartLabel}>Écart résiduel</span>
        <span className={ecartSoldes === 0 ? styles.ecartZero : styles.ecartNonZero}>
          {formatMontant(ecartSoldes)}
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCol}>
                <input
                  type="checkbox"
                  checked={checked.size > 0 && checked.size === suggestions.filter(s => s.suggestions.length > 0 || manualMatches.has(s.mouvement.id)).length}
                  onChange={() => {
                    if (checked.size === suggestions.length) setChecked(new Set());
                    else setChecked(new Set(suggestions.filter(s => s.suggestions.length > 0 || manualMatches.has(s.mouvement.id)).map(s => s.mouvement.id)));
                  }}
                />
              </th>
              <th>Date</th>
              <th>Mouvement</th>
              <th className={styles.alignRight}>Montant</th>
              <th className={styles.arrowCol}></th>
              <th>Écriture comptable</th>
              <th className={styles.alignRight}>Écart</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map(({ mouvement, suggestions: suggList }) => {
              const autoMatch = suggList.find(sg => sg.preChecked);
              const selectedEcritureId = getSelectedEcritureId(mouvement.id);
              const selectedEcriture = ecritures.find(ec => ec.id === selectedEcritureId);

              return (
                <tr key={mouvement.id} className={checked.has(mouvement.id) ? styles.rowChecked : ''}>
                  <td className={styles.checkCol}>
                    <input
                      type="checkbox"
                      checked={checked.has(mouvement.id)}
                      onChange={() => toggleCheck(mouvement.id)}
                      disabled={!autoMatch && !manualMatches.has(mouvement.id)}
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
                    {autoMatch && selectedEcriture ? (
                      <div className={styles.matchCell}>
                        <span className={styles.matchCompte}>{selectedEcriture.compte}</span>
                        <span className={styles.matchPiece}>{selectedEcriture.piece}</span>
                      </div>
                    ) : (
                      <div className={styles.manualSelect}>
                        <select
                          value={manualMatches.get(mouvement.id) || ''}
                          onChange={(e) => handleManualMatch(mouvement.id, e.target.value)}
                          className={styles.ecritureSelect}
                        >
                          <option value="">Sélectionner une écriture...</option>
                          {ecrituresNonRapprochees.map(ec => (
                            <option key={ec.id} value={ec.id}>
                              {ec.compte} — {ec.libelle} ({formatMontant(ec.debit > 0 ? ec.debit : ec.credit)})
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={12} className={styles.selectIcon} />
                      </div>
                    )}
                  </td>
                  <td className={styles.alignRight}>
                    {autoMatch && (
                      <span className={autoMatch.ecart < 0.01 ? styles.ecartOk : styles.ecartWarn}>
                        {autoMatch.ecart < 0.01 ? '0,00 €' : formatMontant(autoMatch.ecart)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action bar */}
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
