'use client';

import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { DepenseEtendue } from '@/data/mock';
import { PosteBudgetData, PieceJointeDepense } from '../types';
import { InvoiceUploadSection } from '../InvoiceUploadSection';
import { DepenseValidationPanel } from '../DepenseValidationPanel';
import { DepenseStatusBadge } from '../DepenseStatusBadge';
import styles from './DepenseEditorModal.module.css';

interface DepenseEditorModalProps {
  mode: 'create' | 'edit';
  depense?: DepenseEtendue;
  postesBudget: PosteBudgetData[];
  onSave: (depense: DepenseEtendue) => void;
  onClose: () => void;
  onSubmitForValidation: (depenseId: string) => void;
  onOpenInvoicePicker: () => void;
}

const COMPTES_CHARGE: Record<string, string> = {
  eau: '602001 - Eau',
  electricite: '602002 - Électricité',
  assurance: '616 - Assurance',
  menage: '614001 - Ménage',
  ascenseur: '615001 - Ascenseur',
  espaces_verts: '614003 - Espaces verts',
  divers: '606 - Divers',
};

export function DepenseEditorModal({
  mode,
  depense,
  postesBudget,
  onSave,
  onClose,
  onSubmitForValidation,
  onOpenInvoicePicker,
}: DepenseEditorModalProps) {
  const [formData, setFormData] = useState<Partial<DepenseEtendue>>({
    date: new Date().toISOString().split('T')[0],
    libelle: '',
    fournisseur: '',
    montant: 0,
    poste: undefined,
    compteId: '',
    recuperable: 0,
    deductible: 0,
    statut: 'BROUILLON',
    ...depense,
  });

  const [pieceJointe, setPieceJointe] = useState<PieceJointeDepense | undefined>(
    depense?.pieceJointeDetails
  );

  const isEditable = !depense?.statut || depense.statut === 'BROUILLON' || depense.statut === 'REJETEE';

  useEffect(() => {
    if (depense) {
      setFormData({
        ...depense,
      });
      if (depense.pieceJointeDetails) {
        setPieceJointe(depense.pieceJointeDetails);
      }
    }
  }, [depense]);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  }, []);

  const handlePosteChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const poste = e.target.value as DepenseEtendue['poste'];
    setFormData(prev => ({
      ...prev,
      poste,
      compteId: poste ? COMPTES_CHARGE[poste].split(' - ')[0] : '',
    }));
  }, []);

  const handlePieceJointeUpload = useCallback((pj: PieceJointeDepense) => {
    setPieceJointe(pj);
    setFormData(prev => ({
      ...prev,
      pieceJointe: pj.fichierNom,
      pieceJointeDetails: pj,
    }));
  }, []);

  const handlePieceJointeRemove = useCallback(() => {
    setPieceJointe(undefined);
    setFormData(prev => ({
      ...prev,
      pieceJointe: undefined,
      pieceJointeDetails: undefined,
    }));
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.libelle || !formData.fournisseur || !formData.montant) {
      alert('Veuillez remplir tous les champs obligatoires (libellé, fournisseur, montant)');
      return;
    }

    const depenseToSave: DepenseEtendue = {
      id: depense?.id || `dep-${Date.now()}`,
      date: formData.date || new Date().toISOString().split('T')[0],
      libelle: formData.libelle || '',
      fournisseur: formData.fournisseur || '',
      montant: formData.montant || 0,
      compteId: formData.compteId || '',
      recuperable: formData.recuperable || 0,
      deductible: formData.deductible || 0,
      poste: formData.poste,
      pieceJointe: pieceJointe?.fichierNom,
      pieceJointeDetails: pieceJointe,
      statut: formData.statut || 'BROUILLON',
      budgetId: formData.budgetId,
      dateCreation: depense?.dateCreation || new Date().toISOString(),
      dateDerniereModification: new Date().toISOString(),
    };

    onSave(depenseToSave);
  }, [formData, pieceJointe, depense, onSave]);

  const handleSubmitForValidation = useCallback(() => {
    if (depense?.id) {
      // Save first, then submit
      handleSave();
      onSubmitForValidation(depense.id);
    }
  }, [depense, handleSave, onSubmitForValidation]);

  return (
    <div className={styles.modalOverlay} onClick={onClose} aria-hidden="true">
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <h2 id="modal-title" className={styles.modalTitle}>
              {mode === 'create' ? 'Nouvelle dépense' : 'Modifier la dépense'}
            </h2>
            {formData.statut && (
              <DepenseStatusBadge statut={formData.statut} size="sm" />
            )}
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fermer"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGrid}>
            {/* Left column - Form fields */}
            <div className={styles.formColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="date" className={styles.label}>Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={styles.input}
                  disabled={!isEditable}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="libelle" className={styles.label}>Libellé *</label>
                <input
                  type="text"
                  id="libelle"
                  name="libelle"
                  value={formData.libelle}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ex: Facture eau T1"
                  disabled={!isEditable}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="fournisseur" className={styles.label}>Fournisseur *</label>
                <input
                  type="text"
                  id="fournisseur"
                  name="fournisseur"
                  value={formData.fournisseur}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ex: Veolia Eau"
                  disabled={!isEditable}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="montant" className={styles.label}>Montant (€) *</label>
                  <input
                    type="number"
                    id="montant"
                    name="montant"
                    value={formData.montant}
                    onChange={handleInputChange}
                    className={styles.input}
                    min="0"
                    step="0.01"
                    disabled={!isEditable}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="poste" className={styles.label}>Poste budgétaire</label>
                  <select
                    id="poste"
                    name="poste"
                    value={formData.poste || ''}
                    onChange={handlePosteChange}
                    className={styles.select}
                    disabled={!isEditable}
                  >
                    <option value="">-- Sélectionner --</option>
                    {postesBudget.map(p => (
                      <option key={p.poste} value={p.poste}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="compteId" className={styles.label}>Compte de charge</label>
                <input
                  type="text"
                  id="compteId"
                  name="compteId"
                  value={formData.poste ? COMPTES_CHARGE[formData.poste] : formData.compteId}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ex: 602001"
                  disabled={!isEditable || !!formData.poste}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="recuperable" className={styles.label}>Récupérable (€)</label>
                  <input
                    type="number"
                    id="recuperable"
                    name="recuperable"
                    value={formData.recuperable}
                    onChange={handleInputChange}
                    className={styles.input}
                    min="0"
                    step="0.01"
                    disabled={!isEditable}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="deductible" className={styles.label}>Déductible (€)</label>
                  <input
                    type="number"
                    id="deductible"
                    name="deductible"
                    value={formData.deductible}
                    onChange={handleInputChange}
                    className={styles.input}
                    min="0"
                    step="0.01"
                    disabled={!isEditable}
                  />
                </div>
              </div>
            </div>

            {/* Right column - Invoice & Validation */}
            <div className={styles.sideColumn}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Pièce justificative</h3>
                <InvoiceUploadSection
                  pieceJointe={pieceJointe}
                  onUpload={handlePieceJointeUpload}
                  onRemove={handlePieceJointeRemove}
                  onLinkExisting={onOpenInvoicePicker}
                  required={true}
                  disabled={!isEditable}
                />
              </div>

              {mode === 'edit' && (
                <DepenseValidationPanel
                  depense={{ ...formData, pieceJointeDetails: pieceJointe }}
                  onSubmitForValidation={handleSubmitForValidation}
                  disabled={!isEditable}
                />
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!isEditable}
          >
            {mode === 'create' ? 'Créer la dépense' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
