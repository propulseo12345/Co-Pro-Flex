'use client';

import { useCallback } from 'react';
import {
  CheckCircle, Edit2, Save, X, Package, FileText, Mail, User, Home, Phone,
} from 'lucide-react';
import type { CoproprietaireEditable, SendingChoice, AdressePostale } from '@/hooks/modules/useConvocationData';
import { SENDING_METHODS, SENDING_COSTS, type SendingMethod } from '@/lib/constants/convocation';
import styles from './ConvocationSendingPanel.module.css';

const METHOD_ICONS = {
  Package: <Package size={16} aria-hidden="true" />,
  FileText: <FileText size={16} aria-hidden="true" />,
  Mail: <Mail size={16} aria-hidden="true" />,
  User: <User size={16} aria-hidden="true" />,
};

interface ConvocationSendingPanelProps {
  coproprietaires: CoproprietaireEditable[];
  sendingChoices: SendingChoice[];
  editingCopro: string | null;
  editForm: Partial<CoproprietaireEditable>;
  totalCost: number;
  selectedCount: number;
  onToggleMethod: (coproId: string, method: SendingMethod) => void;
  onSelectAllForMethod: (method: SendingMethod) => void;
  onStartEditing: (copro: CoproprietaireEditable) => void;
  onSaveEditing: (coproId: string) => void;
  onCancelEditing: () => void;
  onEditFormChange: (form: Partial<CoproprietaireEditable>) => void;
}

export function ConvocationSendingPanel({
  coproprietaires,
  sendingChoices,
  editingCopro,
  editForm,
  totalCost,
  selectedCount,
  onToggleMethod,
  onSelectAllForMethod,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onEditFormChange,
}: ConvocationSendingPanelProps) {
  return (
    <div className={styles.mainSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <User size={20} aria-hidden="true" /> Copropriétaires ({coproprietaires.length})
        </h2>
        <div className={styles.selectionInfo}>
          <span className={styles.selectionCount}>{selectedCount}/{coproprietaires.length} sélectionnés</span>
          {totalCost > 0 && <span className={styles.totalCostBadge}>Coût total : {totalCost.toFixed(2)} €</span>}
        </div>
      </div>

      <div className={styles.quickActions}>
        {SENDING_METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onSelectAllForMethod(method.value)}
            className={styles.quickActionBtn}
          >
            {METHOD_ICONS[method.iconName]}
            <span>Tout en {method.label}</span>
            {method.cost > 0 && <span className={styles.methodPrice}>{method.cost.toFixed(2)}€</span>}
          </button>
        ))}
      </div>

      <div className={styles.coproList}>
        {coproprietaires.map((copro) => {
          const choice = sendingChoices.find((c) => c.coproprietaireId === copro.id);
          const coproMethods = choice?.methods || [];
          const isEditing = editingCopro === copro.id;
          const hasEmail = !!copro.email;
          const hasAddress = !!copro.adressePostale?.rue;

          return (
            <div
              key={copro.id}
              className={`${styles.coproCard} ${coproMethods.length > 0 ? styles.coproCardSelected : ''} ${!hasEmail && !hasAddress ? styles.coproCardWarning : ''}`}
            >
              <div className={styles.coproHeader}>
                <div className={styles.coproMainInfo}>
                  <span className={styles.coproName}>{copro.nom}</span>
                  <span className={styles.coproLot}>Lot {copro.lot} • {copro.tantiemes} tantièmes</span>
                </div>
                {!isEditing && (
                  <button onClick={() => onStartEditing(copro)} className={styles.editBtn} title="Modifier les coordonnées">
                    <Edit2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className={styles.editForm}>
                  <div className={styles.editRow}>
                    <label><Mail size={14} aria-hidden="true" /> Email</label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, email: e.target.value })}
                      placeholder="email@example.fr"
                      className={styles.editInput}
                    />
                  </div>
                  <div className={styles.editRow}>
                    <label><Phone size={14} aria-hidden="true" /> Téléphone</label>
                    <input
                      type="tel"
                      value={editForm.telephone || ''}
                      onChange={(e) => onEditFormChange({ ...editForm, telephone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className={styles.editInput}
                    />
                  </div>
                  <div className={styles.editRow}>
                    <label><Home size={14} aria-hidden="true" /> Adresse postale</label>
                    <input
                      type="text"
                      value={editForm.adressePostale?.rue || ''}
                      onChange={(e) => onEditFormChange({
                        ...editForm,
                        adressePostale: { ...editForm.adressePostale as AdressePostale, rue: e.target.value },
                      })}
                      placeholder="Rue"
                      className={styles.editInput}
                    />
                    <div className={styles.editInputRow}>
                      <input
                        type="text"
                        value={editForm.adressePostale?.codePostal || ''}
                        onChange={(e) => onEditFormChange({
                          ...editForm,
                          adressePostale: { ...editForm.adressePostale as AdressePostale, codePostal: e.target.value },
                        })}
                        placeholder="Code postal"
                        className={styles.editInput}
                        maxLength={5}
                      />
                      <input
                        type="text"
                        value={editForm.adressePostale?.ville || ''}
                        onChange={(e) => onEditFormChange({
                          ...editForm,
                          adressePostale: { ...editForm.adressePostale as AdressePostale, ville: e.target.value },
                        })}
                        placeholder="Ville"
                        className={styles.editInput}
                      />
                    </div>
                  </div>
                  <div className={styles.editActions}>
                    <button onClick={onCancelEditing} className={styles.cancelBtn}>
                      <X size={14} aria-hidden="true" /> Annuler
                    </button>
                    <button onClick={() => onSaveEditing(copro.id)} className={styles.saveBtn}>
                      <Save size={14} aria-hidden="true" /> Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.coproCoords}>
                  <div className={`${styles.coordItem} ${!hasEmail ? styles.coordMissing : ''}`}>
                    <Mail size={14} aria-hidden="true" />
                    <span>{copro.email || 'Email non renseigné'}</span>
                  </div>
                  <div className={`${styles.coordItem} ${!hasAddress ? styles.coordMissing : ''}`}>
                    <Home size={14} aria-hidden="true" />
                    <span>
                      {copro.adressePostale
                        ? `${copro.adressePostale.rue}, ${copro.adressePostale.codePostal} ${copro.adressePostale.ville}`
                        : 'Adresse non renseignée'}
                    </span>
                  </div>
                </div>
              )}

              <div className={styles.methodsGrid}>
                {SENDING_METHODS.map((method) => {
                  const isChecked = coproMethods.includes(method.value);
                  const isDisabled = (method.requiresEmail && !hasEmail) || (method.requiresAddress && !hasAddress);
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => !isDisabled && onToggleMethod(copro.id, method.value)}
                      className={`${styles.methodOption} ${isChecked ? styles.methodOptionActive : ''} ${isDisabled ? styles.methodOptionDisabled : ''}`}
                      disabled={isDisabled}
                      title={isDisabled ? `Nécessite ${method.requiresEmail ? 'un email' : 'une adresse postale'}` : method.label}
                    >
                      {METHOD_ICONS[method.iconName]}
                      <span className={styles.methodLabel}>{method.label}</span>
                      <span className={styles.methodCost}>{method.cost === 0 ? 'Gratuit' : `${method.cost.toFixed(2)}€`}</span>
                      {isChecked && <CheckCircle size={16} className={styles.checkIcon} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
