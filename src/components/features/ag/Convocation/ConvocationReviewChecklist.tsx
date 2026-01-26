'use client';

import { useState, useCallback } from 'react';
import {
  ClipboardCheck, CheckCircle, Circle, AlertCircle, User, Calendar, Shield, X,
} from 'lucide-react';
import type { ReviewChecklistItem, ReviewValidation } from '@/hooks/modules/useConvocationPreview';
import styles from './ConvocationReviewChecklist.module.css';

interface ConvocationReviewChecklistProps {
  checklist: ReviewChecklistItem[];
  reviewValidation: ReviewValidation | null;
  currentVersion: number;
  isReviewMode: boolean;
  onToggleItem: (id: string, checked: boolean) => void;
  onValidate: (reluPar: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function ConvocationReviewChecklist({
  checklist,
  reviewValidation,
  currentVersion,
  isReviewMode,
  onToggleItem,
  onValidate,
  onReset,
  onClose,
}: ConvocationReviewChecklistProps) {
  const [reluPar, setReluPar] = useState('');

  const requiredItems = checklist.filter((item) => item.required);
  const optionalItems = checklist.filter((item) => !item.required);
  const requiredChecked = requiredItems.filter((item) => item.checked).length;
  const totalChecked = checklist.filter((item) => item.checked).length;
  const allRequiredChecked = requiredItems.every((item) => item.checked);

  const handleValidate = useCallback(() => {
    if (!reluPar.trim()) {
      alert('Veuillez entrer votre nom pour valider la relecture.');
      return;
    }
    if (!allRequiredChecked) {
      alert('Veuillez cocher tous les éléments obligatoires.');
      return;
    }
    onValidate(reluPar.trim());
  }, [reluPar, allRequiredChecked, onValidate]);

  if (!isReviewMode) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <ClipboardCheck size={24} aria-hidden="true" />
            <div>
              <h2 className={styles.title}>Mode Relecture</h2>
              <p className={styles.subtitle}>Vérifiez la convocation avant envoi</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Validation existante */}
        {reviewValidation && (
          <div className={styles.validatedBanner}>
            <Shield size={20} aria-hidden="true" />
            <div className={styles.validatedInfo}>
              <strong>Convocation validée</strong>
              <span>
                Par {reviewValidation.reluPar} le{' '}
                {new Date(reviewValidation.reluLe || '').toLocaleDateString('fr-FR')} (v{reviewValidation.version})
              </span>
            </div>
            {reviewValidation.version !== currentVersion && (
              <span className={styles.versionWarning}>
                <AlertCircle size={14} aria-hidden="true" />
                Version différente
              </span>
            )}
            <button type="button" onClick={onReset} className={styles.resetBtn}>
              Réinitialiser
            </button>
          </div>
        )}

        {/* Progress */}
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(requiredChecked / requiredItems.length) * 100}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {requiredChecked}/{requiredItems.length} obligatoires • {totalChecked}/{checklist.length} total
          </span>
        </div>

        {/* Checklist */}
        <div className={styles.checklistContent}>
          {/* Required Items */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <AlertCircle size={16} aria-hidden="true" />
              Vérifications obligatoires
            </h3>
            <div className={styles.itemsList}>
              {requiredItems.map((item) => (
                <label key={item.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => onToggleItem(item.id, e.target.checked)}
                    className={styles.checkbox}
                    disabled={!!reviewValidation}
                  />
                  <span className={styles.checkIcon}>
                    {item.checked ? (
                      <CheckCircle size={20} className={styles.checkedIcon} aria-hidden="true" />
                    ) : (
                      <Circle size={20} aria-hidden="true" />
                    )}
                  </span>
                  <div className={styles.checkContent}>
                    <span className={styles.checkLabel}>{item.label}</span>
                    <span className={styles.checkDescription}>{item.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Items */}
          {optionalItems.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Vérifications optionnelles</h3>
              <div className={styles.itemsList}>
                {optionalItems.map((item) => (
                  <label key={item.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => onToggleItem(item.id, e.target.checked)}
                      className={styles.checkbox}
                      disabled={!!reviewValidation}
                    />
                    <span className={styles.checkIcon}>
                      {item.checked ? (
                        <CheckCircle size={20} className={styles.checkedIcon} aria-hidden="true" />
                      ) : (
                        <Circle size={20} aria-hidden="true" />
                      )}
                    </span>
                    <div className={styles.checkContent}>
                      <span className={styles.checkLabel}>{item.label}</span>
                      <span className={styles.checkDescription}>{item.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Validation Form */}
        {!reviewValidation && (
          <div className={styles.validationForm}>
            <div className={styles.inputGroup}>
              <label htmlFor="reluPar" className={styles.inputLabel}>
                <User size={14} aria-hidden="true" />
                Relu par
              </label>
              <input
                id="reluPar"
                type="text"
                value={reluPar}
                onChange={(e) => setReluPar(e.target.value)}
                placeholder="Votre nom"
                className={styles.input}
              />
            </div>

            <button
              type="button"
              onClick={handleValidate}
              disabled={!allRequiredChecked || !reluPar.trim()}
              className={styles.validateBtn}
            >
              <CheckCircle size={16} aria-hidden="true" />
              Valider la relecture
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className={styles.footer}>
          <Calendar size={14} aria-hidden="true" />
          <span>Version actuelle : v{currentVersion}</span>
        </div>
      </div>
    </div>
  );
}
