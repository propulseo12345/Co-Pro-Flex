'use client';

import { useState, useMemo, useCallback } from 'react';
import { CheckCircle, Sparkles, ChevronDown } from 'lucide-react';
import type { CategorieComptable } from '../domain/types';
import { PLAN_COMPTABLE_ESSENTIEL } from '../domain/constants';
import type { SuggestionCategorieResult } from '../domain/matching-engine';
import styles from './BatchCategorisation.module.css';

interface BatchCategorisationProps {
  suggestions: SuggestionCategorieResult[];
  onApply: (selections: Map<string, { compte: string; categorie: CategorieComptable }>) => void;
  isMutating: boolean;
}

type FilterMode = 'tous' | 'non_categorises' | 'auto_suggeres';

export function BatchCategorisation({ suggestions, onApply, isMutating }: BatchCategorisationProps) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    suggestions.forEach(s => {
      if (s.preChecked && s.suggestion) initial.add(s.mouvement.id);
    });
    return initial;
  });
  const [manualSelections, setManualSelections] = useState<Map<string, string>>(new Map());
  const [filterMode, setFilterMode] = useState<FilterMode>('tous');

  const filtered = useMemo(() => {
    switch (filterMode) {
      case 'non_categorises':
        return suggestions.filter(s => !s.suggestion);
      case 'auto_suggeres':
        return suggestions.filter(s => s.suggestion);
      default:
        return suggestions;
    }
  }, [suggestions, filterMode]);

  const toggleCheck = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (checked.size === filtered.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(filtered.filter(s => s.suggestion || manualSelections.has(s.mouvement.id)).map(s => s.mouvement.id)));
    }
  }, [checked.size, filtered, manualSelections]);

  const handleManualSelect = useCallback((mouvementId: string, compteCode: string) => {
    setManualSelections(prev => {
      const next = new Map(prev);
      next.set(mouvementId, compteCode);
      return next;
    });
    setChecked(prev => {
      const next = new Set(prev);
      next.add(mouvementId);
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    const selections = new Map<string, { compte: string; categorie: CategorieComptable }>();
    checked.forEach(id => {
      const sugg = suggestions.find(s => s.mouvement.id === id);
      if (!sugg) return;

      if (sugg.suggestion) {
        selections.set(id, { compte: sugg.suggestion.compte, categorie: sugg.suggestion.categorie });
      } else {
        const manualCompte = manualSelections.get(id);
        if (manualCompte) {
          const compteInfo = PLAN_COMPTABLE_ESSENTIEL.find(c => c.code === manualCompte);
          if (compteInfo) {
            selections.set(id, { compte: manualCompte, categorie: compteInfo.categorie });
          }
        }
      }
    });
    onApply(selections);
  }, [checked, suggestions, manualSelections, onApply]);

  const selectedCount = checked.size;
  const formatMontant = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  if (suggestions.length === 0) {
    return (
      <div className={styles.empty}>
        <CheckCircle size={32} className={styles.emptyIcon} />
        <p>Tous les mouvements sont catégorisés</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Filters */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filterMode === 'tous' ? styles.filterActive : ''}`}
          onClick={() => setFilterMode('tous')}
        >
          Tous ({suggestions.length})
        </button>
        <button
          className={`${styles.filterBtn} ${filterMode === 'auto_suggeres' ? styles.filterActive : ''}`}
          onClick={() => setFilterMode('auto_suggeres')}
        >
          Auto-suggérés ({suggestions.filter(s => s.suggestion).length})
        </button>
        <button
          className={`${styles.filterBtn} ${filterMode === 'non_categorises' ? styles.filterActive : ''}`}
          onClick={() => setFilterMode('non_categorises')}
        >
          Sans suggestion ({suggestions.filter(s => !s.suggestion).length})
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkCol}>
                <input
                  type="checkbox"
                  checked={checked.size > 0 && checked.size === filtered.filter(s => s.suggestion || manualSelections.has(s.mouvement.id)).length}
                  onChange={toggleAll}
                />
              </th>
              <th>Date</th>
              <th>Libellé</th>
              <th className={styles.alignRight}>Montant</th>
              <th>Compte suggéré</th>
              <th>Confiance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ mouvement, suggestion }) => (
              <tr key={mouvement.id} className={checked.has(mouvement.id) ? styles.rowChecked : ''}>
                <td className={styles.checkCol}>
                  <input
                    type="checkbox"
                    checked={checked.has(mouvement.id)}
                    onChange={() => toggleCheck(mouvement.id)}
                    disabled={!suggestion && !manualSelections.has(mouvement.id)}
                  />
                </td>
                <td className={styles.dateCell}>
                  {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                </td>
                <td className={styles.libelleCell}>{mouvement.libelle}</td>
                <td className={`${styles.alignRight} ${mouvement.montant >= 0 ? styles.montantPositif : styles.montantNegatif}`}>
                  {formatMontant(mouvement.montant)}
                </td>
                <td>
                  {suggestion ? (
                    <div className={styles.suggestionCell}>
                      <Sparkles size={12} className={styles.sparkle} />
                      <span>{suggestion.compte} - {suggestion.compteLabel}</span>
                    </div>
                  ) : (
                    <div className={styles.manualSelect}>
                      <select
                        value={manualSelections.get(mouvement.id) || ''}
                        onChange={(e) => handleManualSelect(mouvement.id, e.target.value)}
                        className={styles.compteSelect}
                      >
                        <option value="">Sélectionner...</option>
                        {PLAN_COMPTABLE_ESSENTIEL.map(c => (
                          <option key={c.code} value={c.code}>{c.code} - {c.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className={styles.selectIcon} />
                    </div>
                  )}
                </td>
                <td>
                  {suggestion && (
                    <span className={`${styles.confidence} ${styles[`confidence_${suggestion.confiance}`]}`}>
                      {suggestion.confiance}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action bar */}
      {selectedCount > 0 && (
        <div className={styles.actionBar}>
          <span className={styles.actionCount}>{selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}</span>
          <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={isMutating}
          >
            {isMutating ? 'Application...' : `Appliquer ${selectedCount} suggestion${selectedCount > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
