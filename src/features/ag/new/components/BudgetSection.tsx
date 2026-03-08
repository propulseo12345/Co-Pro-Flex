'use client';

import { DollarSign, RotateCcw, Plus, Pencil, Trash2, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import type { BudgetPoste, EditingPosteState } from '../domain/types';
import { POSTES_DEPENSES } from '../domain/constants';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface RepartitionKeyOption {
  id: string;
  name: string;
}

interface BudgetSectionProps {
  budget: boolean;
  budgetExercice: string;
  budgetPostes: BudgetPoste[];
  budgetTotal: number;
  errors: Record<string, string>;
  newPoste: { poste: string; montant: string };
  showCustomPoste: boolean;
  editing: EditingPosteState;
  isImporting?: boolean;
  importError?: string | null;
  availableBudgetYears: number[];
  repartitionKeys?: RepartitionKeyOption[];
  onBudgetChange: (value: boolean) => void;
  onExerciceChange: (value: string) => void;
  onNewPosteChange: (value: { poste: string; montant: string }) => void;
  onPosteSelect: (value: string) => void;
  onAddPoste: () => void;
  onRemovePoste: (id: string) => void;
  onEditPoste: (poste: BudgetPoste) => void;
  onSavePoste: () => void;
  onCancelEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onImportBudget: (params: { source: 'current_priority'; budgetId?: null }) => void;
  onUpdateEditingData: (field: 'poste' | 'montant', value: string) => void;
  onUpdatePosteKey?: (posteId: string, keyId: string, keyName: string) => void;
}

export function BudgetSection({
  budget,
  budgetExercice,
  budgetPostes,
  budgetTotal,
  errors,
  newPoste,
  showCustomPoste,
  editing,
  isImporting = false,
  importError = null,
  availableBudgetYears,
  onBudgetChange,
  onExerciceChange,
  onNewPosteChange,
  onPosteSelect,
  onAddPoste,
  onRemovePoste,
  onEditPoste,
  onSavePoste,
  onCancelEdit,
  onEditKeyDown,
  onImportBudget,
  onUpdateEditingData,
  repartitionKeys = [],
  onUpdatePosteKey,
}: BudgetSectionProps) {
  const handleImportClick = () => {
    onImportBudget({
      source: 'current_priority',
      budgetId: null,
    });
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Informations facultatives</h2>

      <div className={styles.checkboxCard}>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" checked={budget} onChange={(e) => onBudgetChange(e.target.checked)} />
          <div className={styles.checkboxContent}>
            <div className={styles.checkboxTitle}>
              <DollarSign size={20} aria-hidden="true" />
              Inclure la préparation du budget prévisionnel
            </div>
            <div className={styles.checkboxDescription}>Cette AG comprendra le vote du budget pour l&apos;exercice à venir</div>
          </div>
        </label>

        {budget && (
          <div className={styles.nestedFields}>
            <div className={styles.formGroup}>
              <label htmlFor="budgetExercice" className={styles.label}>
                Exercice
              </label>
              <select
                id="budgetExercice"
                className={styles.select}
                value={budgetExercice}
                onChange={(e) => onExerciceChange(e.target.value)}
              >
                {budgetExercice && !availableBudgetYears.includes(Number.parseInt(budgetExercice, 10)) && (
                  <option value={budgetExercice}>{budgetExercice}</option>
                )}
                {availableBudgetYears.length === 0 && (
                  <option value={budgetExercice || ''}>{budgetExercice || 'Aucun exercice disponible'}</option>
                )}
                {availableBudgetYears.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.budgetSection}>
              <div className={styles.budgetSectionHeader}>
                <h3 className={styles.budgetSectionTitle}>Détail du budget par postes</h3>
                <button
                  type="button"
                  onClick={handleImportClick}
                  className={styles.importBudgetBtn}
                  title="Récupérer le budget depuis Finance > Budgets"
                  disabled={isImporting || !budgetExercice.trim()}
                >
                  {isImporting ? (
                    <Loader2 size={16} className={styles.spinnerIcon} aria-hidden="true" />
                  ) : (
                    <RotateCcw size={16} aria-hidden="true" />
                  )}
                  {isImporting ? 'Import en cours...' : `Importer budget ${budgetExercice}`}
                </button>
              </div>

              {importError && (
                <div className={styles.importError}>
                  <AlertCircle size={16} />
                  <span>{importError}</span>
                </div>
              )}

              <div className={styles.addPosteForm}>
                <div className={styles.addPosteInputs}>
                  {!showCustomPoste ? (
                    <select value={newPoste.poste || ''} onChange={(e) => onPosteSelect(e.target.value)} className={styles.select}>
                      <option value="">Sélectionner un poste...</option>
                      {POSTES_DEPENSES.map((poste) => (
                        <option key={poste} value={poste}>
                          {poste}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nom du poste personnalisé..."
                      value={newPoste.poste}
                      onChange={(e) => onNewPosteChange({ ...newPoste, poste: e.target.value })}
                      className={styles.input}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onAddPoste();
                        }
                      }}
                    />
                  )}
                  <input
                    type="number"
                    placeholder="Montant (€)"
                    value={newPoste.montant}
                    onChange={(e) => onNewPosteChange({ ...newPoste, montant: e.target.value })}
                    className={styles.input}
                    min="0"
                    step="0.01"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onAddPoste();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={onAddPoste}
                    className="btn btn-primary"
                    disabled={!newPoste.poste.trim() || !newPoste.montant}
                  >
                    <Plus size={16} aria-hidden="true" />
                    Ajouter
                  </button>
                </div>
              </div>

              {budgetPostes.length > 0 ? (
                <div className={styles.postesList}>
                  <div className={styles.postesHeader}>
                    <span>Poste</span>
                    <span>Montant</span>
                    {repartitionKeys.length > 0 && <span>Clé de répartition</span>}
                    <span>Actions</span>
                  </div>
                  {budgetPostes.map((poste) => (
                    <div
                      key={poste.id}
                      className={`${styles.posteItem} ${editing.id === poste.id ? styles.posteItemEditing : ''}`}
                    >
                      {editing.id === poste.id ? (
                        <>
                          <div className={styles.editInputWrapper}>
                            <input
                              type="text"
                              value={editing.data.poste}
                              onChange={(e) => onUpdateEditingData('poste', e.target.value)}
                              onKeyDown={onEditKeyDown}
                              className={`${styles.editInput} ${editing.error && !editing.data.poste.trim() ? styles.inputError : ''}`}
                              placeholder="Libellé du poste"
                              autoFocus
                            />
                          </div>
                          <div className={styles.editInputWrapper}>
                            <input
                              type="number"
                              value={editing.data.montant}
                              onChange={(e) => onUpdateEditingData('montant', e.target.value)}
                              onKeyDown={onEditKeyDown}
                              className={`${styles.editInput} ${styles.editInputMontant} ${
                                editing.error &&
                                (isNaN(parseFloat(editing.data.montant)) || parseFloat(editing.data.montant) <= 0)
                                  ? styles.inputError
                                  : ''
                              }`}
                              placeholder="Montant"
                              min="0"
                              step="0.01"
                            />
                            <span className={styles.editInputSuffix}>€</span>
                          </div>
                          <div className={styles.posteActions}>
                            <button
                              type="button"
                              onClick={onSavePoste}
                              className={styles.savePosteBtn}
                              aria-label="Valider les modifications"
                              title="Valider (Entrée)"
                            >
                              <Check size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEdit}
                              className={styles.cancelPosteBtn}
                              aria-label="Annuler les modifications"
                              title="Annuler (Échap)"
                            >
                              <X size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className={styles.posteName}>{poste.poste}</span>
                          <span className={styles.posteMontant}>
                            {poste.montant.toLocaleString('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          {repartitionKeys.length > 0 && (
                            <select
                              className={styles.select}
                              value={poste.repartitionKeyId || ''}
                              onChange={(e) => {
                                const key = repartitionKeys.find(k => k.id === e.target.value);
                                onUpdatePosteKey?.(poste.id, e.target.value, key?.name || '');
                              }}
                              style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
                            >
                              <option value="">— Aucune —</option>
                              {repartitionKeys.map(k => (
                                <option key={k.id} value={k.id}>{k.name}</option>
                              ))}
                            </select>
                          )}
                          <div className={styles.posteActions}>
                            <button
                              type="button"
                              onClick={() => onEditPoste(poste)}
                              className={styles.editPosteBtn}
                              aria-label="Modifier ce poste"
                              title="Modifier"
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemovePoste(poste.id)}
                              className={styles.removePosteBtn}
                              aria-label="Supprimer ce poste"
                              title="Supprimer"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editing.error && (
                    <div className={styles.editError}>
                      <AlertCircle size={14} aria-hidden="true" />
                      {editing.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.emptyPostes}>
                  <p>Aucun poste ajouté. Ajoutez des postes pour détailler le budget.</p>
                </div>
              )}

              <div className={styles.budgetTotal}>
                <span className={styles.budgetTotalLabel}>Budget total prévisionnel :</span>
                <span className={styles.budgetTotalAmount}>
                  {budgetTotal.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {errors.budgetMontant && <span className={styles.error}>{errors.budgetMontant}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
