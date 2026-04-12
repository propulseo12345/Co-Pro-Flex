'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { IDPE, ClasseDPE } from '@/types';
import type { DPEEditData } from '@/hooks/useDPE';
import styles from './DPEEditModal.module.css';

const CLASSES: ClasseDPE[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

interface DPEEditModalProps {
  dpe: IDPE;
  onSave: (data: DPEEditData) => void;
  onClose: () => void;
}

type FormErrors = Partial<Record<keyof DPEEditData, string>>;

export function DPEEditModal({ dpe, onSave, onClose }: DPEEditModalProps) {
  const [form, setForm] = useState<DPEEditData>(() => ({
    classeEnergie: dpe.classeEnergie,
    classeGES: dpe.classeGES,
    dateDiagnostic: dpe.dateDiagnostic,
    dateExpiration: dpe.dateExpiration,
    diagnostiqueur: dpe.diagnostiqueur,
    numeroADEME: dpe.numeroADEME,
    consoEnergie: dpe.consoEnergie,
    emissionsGES: dpe.emissionsGES,
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  function set<K extends keyof DPEEditData>(key: K, value: DPEEditData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.dateDiagnostic) next.dateDiagnostic = 'Requis';
    if (!form.dateExpiration) {
      next.dateExpiration = 'Requis';
    } else if (form.dateDiagnostic && form.dateExpiration <= form.dateDiagnostic) {
      next.dateExpiration = 'Doit être postérieure à la date de diagnostic';
    }
    if (!form.diagnostiqueur.trim()) next.diagnostiqueur = 'Requis';
    if (!form.numeroADEME.trim()) next.numeroADEME = 'Requis';
    if (form.consoEnergie <= 0) next.consoEnergie = 'Doit être > 0';
    if (form.emissionsGES <= 0) next.emissionsGES = 'Doit être > 0';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave(form);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Modifier la fiche DPE</div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Classe énergie + GES */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="dpe-classe-energie" className={styles.label}>Classe énergétique</label>
              <select
                id="dpe-classe-energie"
                className={styles.select}
                value={form.classeEnergie}
                onChange={e => set('classeEnergie', e.target.value as ClasseDPE)}
              >
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="dpe-classe-ges" className={styles.label}>Classe GES</label>
              <select
                id="dpe-classe-ges"
                className={styles.select}
                value={form.classeGES}
                onChange={e => set('classeGES', e.target.value as ClasseDPE)}
              >
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="dpe-date-diagnostic" className={styles.label}>Date diagnostic *</label>
              <input
                id="dpe-date-diagnostic"
                type="date"
                className={clsx(styles.input, errors.dateDiagnostic && styles.error)}
                value={form.dateDiagnostic}
                onChange={e => set('dateDiagnostic', e.target.value)}
              />
              {errors.dateDiagnostic && <span className={styles.errorMsg}>{errors.dateDiagnostic}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="dpe-date-expiration" className={styles.label}>Date expiration *</label>
              <input
                id="dpe-date-expiration"
                type="date"
                className={clsx(styles.input, errors.dateExpiration && styles.error)}
                value={form.dateExpiration}
                onChange={e => set('dateExpiration', e.target.value)}
              />
              {errors.dateExpiration && <span className={styles.errorMsg}>{errors.dateExpiration}</span>}
            </div>
          </div>

          {/* Diagnostiqueur */}
          <div className={styles.field}>
            <label htmlFor="dpe-diagnostiqueur" className={styles.label}>Diagnostiqueur *</label>
            <input
              id="dpe-diagnostiqueur"
              type="text"
              className={clsx(styles.input, errors.diagnostiqueur && styles.error)}
              value={form.diagnostiqueur}
              onChange={e => set('diagnostiqueur', e.target.value)}
              placeholder="Nom du cabinet ou diagnostiqueur"
            />
            {errors.diagnostiqueur && <span className={styles.errorMsg}>{errors.diagnostiqueur}</span>}
          </div>

          {/* N° ADEME */}
          <div className={styles.field}>
            <label htmlFor="dpe-ademe" className={styles.label}>N° ADEME *</label>
            <input
              id="dpe-ademe"
              type="text"
              className={clsx(styles.input, errors.numeroADEME && styles.error)}
              value={form.numeroADEME}
              onChange={e => set('numeroADEME', e.target.value)}
              placeholder="Ex : 2403010088"
              maxLength={20}
            />
            {errors.numeroADEME && <span className={styles.errorMsg}>{errors.numeroADEME}</span>}
          </div>

          {/* Conso + GES */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="dpe-conso" className={styles.label}>Conso. énergie (kWh/m²/an) *</label>
              <input
                id="dpe-conso"
                type="number"
                className={clsx(styles.input, errors.consoEnergie && styles.error)}
                value={form.consoEnergie}
                onChange={e => set('consoEnergie', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                min="1"
                step="1"
              />
              {errors.consoEnergie && <span className={styles.errorMsg}>{errors.consoEnergie}</span>}
            </div>
            <div className={styles.field}>
              <label htmlFor="dpe-ges" className={styles.label}>Émissions GES (kgCO₂/m²/an) *</label>
              <input
                id="dpe-ges"
                type="number"
                className={clsx(styles.input, errors.emissionsGES && styles.error)}
                value={form.emissionsGES}
                onChange={e => set('emissionsGES', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                min="1"
                step="1"
              />
              {errors.emissionsGES && <span className={styles.errorMsg}>{errors.emissionsGES}</span>}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>Annuler</button>
          <button type="button" className={styles.btnSave} onClick={handleSubmit}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
