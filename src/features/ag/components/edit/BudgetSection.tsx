'use client';

import { DollarSign, RotateCcw, Plus, Pencil, Trash2, Check, X, AlertCircle } from 'lucide-react';
import type { BudgetPoste } from '../../types';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface BudgetSectionProps {
  enabled: boolean;
  exercice: string;
  postes: BudgetPoste[];
  total: number;
  newPoste: { poste: string; montant: string };
  showCustomPoste: boolean;
  editingPosteId: string | null;
  editingPosteData: { poste: string; montant: string };
  editingError: string | null;
  postesDepenses: string[];
  budgetPrecedent: { exercice: number; postes: { id: string; poste: string; montant: number }[]; total: number };
  accounts?: Array<{ id: string; code: string; name: string }>;
  repartitionKeys?: Array<{ id: string; name: string }>;
  error?: string;
  readOnly?: boolean;
  onToggle: (enabled: boolean) => void;
  onExerciceChange: (value: string) => void;
  onImportPrecedent: () => void;
  onPosteSelect: (value: string) => void;
  onAddPoste: () => void;
  onRemovePoste: (id: string) => void;
  onEditPoste: (poste: BudgetPoste) => void;
  onSavePoste: () => void;
  onCancelEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onNewPosteChange: (value: { poste: string; montant: string }) => void;
  onEditingDataChange: (value: { poste: string; montant: string }) => void;
}

export function BudgetSection({
  enabled,
  exercice,
  postes,
  total,
  newPoste,
  showCustomPoste,
  editingPosteId,
  editingPosteData,
  editingError,
  postesDepenses,
  budgetPrecedent,
  error,
  readOnly = false,
  onToggle,
  onExerciceChange,
  onImportPrecedent,
  onPosteSelect,
  onAddPoste,
  onRemovePoste,
  onEditPoste,
  onSavePoste,
  onCancelEdit,
  onEditKeyDown,
  onNewPosteChange,
  onEditingDataChange,
}: BudgetSectionProps) {
  return (
    <div className={styles.checkboxCard}>
      <label className={styles.checkboxLabel}>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} disabled={readOnly} />
        <div className={styles.checkboxContent}>
          <div className={styles.checkboxTitle}>
            <DollarSign size={20} aria-hidden="true" />
            Inclure la préparation du budget prévisionnel
          </div>
          <div className={styles.checkboxDescription}>
            {readOnly
              ? 'Budget validé — modification impossible après envoi de la convocation'
              : 'Cette AG comprendra le vote du budget pour l\'exercice à venir'}
          </div>
        </div>
      </label>

      {enabled && (
        <div className={styles.nestedFields}>
          <div className={styles.formGroup}>
            <label htmlFor="budgetExercice" className={styles.label}>Exercice</label>
            <input
              type="text"
              id="budgetExercice"
              className={styles.input}
              placeholder="Ex: 2026"
              value={exercice}
              onChange={(e) => onExerciceChange(e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div className={styles.budgetSection}>
            <div className={styles.budgetSectionHeader}>
              <h3 className={styles.budgetSectionTitle}>Détail du budget par postes</h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={onImportPrecedent}
                  className={styles.importBudgetBtn}
                  title="Récupérer le budget de l'exercice précédent"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  Importer budget {budgetPrecedent.exercice}
                </button>
              )}
            </div>

            {!readOnly && (
              <div className={styles.addPosteForm}>
                <div className={styles.addPosteInputs}>
                  {!showCustomPoste ? (
                    <select
                      value={newPoste.poste || ''}
                      onChange={(e) => onPosteSelect(e.target.value)}
                      className={styles.select}
                    >
                      <option value="">Sélectionner un poste...</option>
                      {postesDepenses.map(poste => (
                        <option key={poste} value={poste}>{poste}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nom du poste personnalisé..."
                      value={newPoste.poste}
                      onChange={(e) => onNewPosteChange({ ...newPoste, poste: e.target.value })}
                      className={styles.input}
                      onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddPoste(); } }}
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
                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddPoste(); } }}
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
            )}

            {postes.length > 0 ? (
              <div className={styles.postesList}>
                <div className={styles.postesHeader}>
                  <span>Poste</span>
                  <span>Compte</span>
                  <span>Clé</span>
                  <span>Montant</span>
                  {!readOnly && <span>Actions</span>}
                </div>
                {postes.map((poste) => (
                  <div key={poste.id} className={`${styles.posteItem} ${editingPosteId === poste.id ? styles.posteItemEditing : ''}`}>
                    {editingPosteId === poste.id ? (
                      <>
                        <div className={styles.editInputWrapper}>
                          <input
                            type="text"
                            value={editingPosteData.poste}
                            onChange={(e) => onEditingDataChange({ ...editingPosteData, poste: e.target.value })}
                            onKeyDown={onEditKeyDown}
                            className={`${styles.editInput} ${editingError && !editingPosteData.poste.trim() ? styles.inputError : ''}`}
                            placeholder="Libellé du poste"
                            autoFocus
                          />
                        </div>
                        <div className={styles.editInputWrapper}>
                          <input
                            type="number"
                            value={editingPosteData.montant}
                            onChange={(e) => onEditingDataChange({ ...editingPosteData, montant: e.target.value })}
                            onKeyDown={onEditKeyDown}
                            className={`${styles.editInput} ${styles.editInputMontant} ${editingError && (isNaN(parseFloat(editingPosteData.montant)) || parseFloat(editingPosteData.montant) <= 0) ? styles.inputError : ''}`}
                            placeholder="Montant"
                            min="0"
                            step="0.01"
                          />
                          <span className={styles.editInputSuffix}>€</span>
                        </div>
                        <div className={styles.posteActions}>
                          <button type="button" onClick={onSavePoste} className={styles.savePosteBtn} aria-label="Valider" title="Valider (Entrée)">
                            <Check size={16} aria-hidden="true" />
                          </button>
                          <button type="button" onClick={onCancelEdit} className={styles.cancelPosteBtn} aria-label="Annuler" title="Annuler (Échap)">
                            <X size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={styles.posteName}>{poste.poste}</span>
                        <span className={styles.posteAccount}>
                          {poste.accountCode ? `${poste.accountCode}` : '-'}
                        </span>
                        <span className={styles.posteKey}>
                          {poste.repartitionKeyName || '-'}
                        </span>
                        <span className={styles.posteMontant}>
                          {poste.montant.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
                        </span>
                        {!readOnly && (
                          <div className={styles.posteActions}>
                            <button type="button" onClick={() => onEditPoste(poste)} className={styles.editPosteBtn} aria-label="Modifier" title="Modifier">
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => onRemovePoste(poste.id)} className={styles.removePosteBtn} aria-label="Supprimer" title="Supprimer">
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {editingError && (
                  <div className={styles.editError}>
                    <AlertCircle size={14} aria-hidden="true" />
                    {editingError}
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
                {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })}
              </span>
            </div>

            {error && <span className={styles.error}>{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
