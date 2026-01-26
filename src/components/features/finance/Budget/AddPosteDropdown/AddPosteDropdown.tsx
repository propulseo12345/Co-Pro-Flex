'use client';

import { Plus, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { POSTES_BUDGET_PREDEFINIS, type PosteBudgetPredefini } from '@/lib/constants/budget-postes';
import styles from './AddPosteDropdown.module.css';

interface AddPosteDropdownProps {
  onAddPoste: (libelle: string, posteId?: string) => void;
  existingPosteIds?: string[];
}

export function AddPosteDropdown({ onAddPoste, existingPosteIds = [] }: AddPosteDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availablePostes = POSTES_BUDGET_PREDEFINIS.filter(
    (p) => !existingPosteIds.includes(p.id)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
        setCustomLabel('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  const handleSelectPoste = useCallback(
    (poste: PosteBudgetPredefini) => {
      onAddPoste(poste.label, poste.id);
      setIsOpen(false);
    },
    [onAddPoste]
  );

  const handleAddCustom = useCallback(() => {
    if (customLabel.trim()) {
      onAddPoste(customLabel.trim());
      setCustomLabel('');
      setShowCustomInput(false);
      setIsOpen(false);
    }
  }, [customLabel, onAddPoste]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAddCustom();
      } else if (e.key === 'Escape') {
        setShowCustomInput(false);
        setCustomLabel('');
      }
    },
    [handleAddCustom]
  );

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={styles.addButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Plus size={14} aria-hidden="true" />
        <span>Ajouter un poste</span>
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox" aria-label="Liste des postes">
          {availablePostes.length > 0 && (
            <>
              <div className={styles.dropdownSection}>
                <span className={styles.sectionLabel}>Postes prédéfinis</span>
              </div>
              {availablePostes.map((poste) => (
                <button
                  key={poste.id}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleSelectPoste(poste)}
                  role="option"
                >
                  <span
                    className={styles.posteColor}
                    style={{ backgroundColor: poste.color }}
                    aria-hidden="true"
                  />
                  <span>{poste.label}</span>
                </button>
              ))}
              <div className={styles.divider} />
            </>
          )}

          {showCustomInput ? (
            <div className={styles.customInputWrapper}>
              <input
                ref={inputRef}
                type="text"
                className={styles.customInput}
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nom du poste..."
                aria-label="Nom du poste personnalisé"
              />
              <button
                type="button"
                className={styles.confirmButton}
                onClick={handleAddCustom}
                disabled={!customLabel.trim()}
                aria-label="Confirmer"
              >
                <Plus size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomLabel('');
                }}
                aria-label="Annuler"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`${styles.dropdownItem} ${styles.customItem}`}
              onClick={() => setShowCustomInput(true)}
            >
              <Plus size={14} aria-hidden="true" />
              <span>Créer un poste personnalisé</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
