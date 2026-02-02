'use client';

import { Save, X } from 'lucide-react';
import type { Lot, Coproprietaire, CleRepartition, TypeLot } from '../hooks/useInfoCoproPage';
import { TYPES_LOT } from '../hooks/useInfoCoproPage';
import styles from '@/app/(dashboard)/settings/info/info.module.css';

interface LotEditFormProps {
  lotEnEdition: Lot;
  coproprietaires: Coproprietaire[];
  clesRepartition: CleRepartition[];
  onLotChange: (lot: Lot) => void;
  onSave: (lot: Lot) => void;
  onCancel: () => void;
}

export function LotEditForm({
  lotEnEdition,
  coproprietaires,
  clesRepartition,
  onLotChange,
  onSave,
  onCancel,
}: LotEditFormProps) {
  return (
    <div className={styles.editLotForm}>
      <h3>{lotEnEdition.numero ? 'Modifier le lot' : 'Nouveau lot'}</h3>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label>Numero de lot *</label>
          <input
            type="text"
            value={lotEnEdition.numero}
            onChange={(e) => onLotChange({ ...lotEnEdition, numero: e.target.value })}
            placeholder="Ex: A1, 12, Cave 3..."
            className={styles.input}
          />
          <small>Numero exact de l'EDD ou de l'acte de vente</small>
        </div>

        <div className={styles.formGroup}>
          <label>Type de lot *</label>
          <select
            value={lotEnEdition.type}
            onChange={(e) => onLotChange({ ...lotEnEdition, type: e.target.value as TypeLot })}
            className={styles.select}
          >
            {TYPES_LOT.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={lotEnEdition.estPrincipal}
              onChange={(e) => onLotChange({ ...lotEnEdition, estPrincipal: e.target.checked })}
              className={styles.checkbox}
            />
            <span>Lot principal</span>
          </label>
          <small>Pour les lots d'habitation uniquement</small>
        </div>

        <div className={styles.formGroup}>
          <label>Coproprietaire *</label>
          <select
            value={lotEnEdition.coproprietaireId}
            onChange={(e) => onLotChange({ ...lotEnEdition, coproprietaireId: e.target.value })}
            className={styles.select}
          >
            {coproprietaires.map(copro => (
              <option key={copro.id} value={copro.id}>
                {copro.prenom} {copro.nom}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Charges generales (tantiemes) *</label>
          <input
            type="number"
            value={lotEnEdition.tantiemesGeneraux}
            onChange={(e) => onLotChange({ ...lotEnEdition, tantiemesGeneraux: parseFloat(e.target.value) || 0 })}
            className={styles.input}
            min="0"
            step="0.01"
          />
        </div>

        {clesRepartition.filter(c => c.nom !== 'Charges generales').map(cle => (
          <div key={cle.id} className={styles.formGroup}>
            <label>{cle.nom} (tantiemes)</label>
            <input
              type="number"
              value={lotEnEdition.autresCles[cle.nom] || 0}
              onChange={(e) => onLotChange({
                ...lotEnEdition,
                autresCles: {
                  ...lotEnEdition.autresCles,
                  [cle.nom]: parseFloat(e.target.value) || 0
                }
              })}
              className={styles.input}
              min="0"
              step="0.01"
            />
          </div>
        ))}
      </div>

      <div className={styles.formActions}>
        <button
          onClick={() => onSave(lotEnEdition)}
          className="btn btn-primary"
          disabled={!lotEnEdition.numero || !lotEnEdition.coproprietaireId}
        >
          <Save size={16} aria-hidden="true" />
          {lotEnEdition.numero ? 'Enregistrer' : 'Ajouter'}
        </button>
        <button
          onClick={onCancel}
          className="btn btn-secondary"
        >
          <X size={16} aria-hidden="true" />
          Annuler
        </button>
      </div>
    </div>
  );
}
