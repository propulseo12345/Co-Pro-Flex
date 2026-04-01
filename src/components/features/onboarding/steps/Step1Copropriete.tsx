'use client';

import { useState, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { createCopropriete } from '@/lib/onboarding/api';
import styles from './Step1Copropriete.module.css';

interface Step1Props {
  onComplete: (coproId: string, coproName: string) => void;
  existingCoproId: string | null;
}

export function Step1Copropriete({ onComplete, existingCoproId }: Step1Props) {
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [ville, setVille] = useState('');
  const [nombreBatiments, setNombreBatiments] = useState('1');
  const [anneeConstruction, setAnneeConstruction] = useState('');
  const [siretSyndic, setSiretSyndic] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!nom.trim()) errs.nom = 'Le nom est obligatoire';
    if (!adresse.trim()) errs.adresse = "L'adresse est obligatoire";
    if (!codePostal.trim()) errs.codePostal = 'Le code postal est obligatoire';
    if (!ville.trim()) errs.ville = 'La ville est obligatoire';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [nom, adresse, codePostal, ville]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (existingCoproId) {
      onComplete(existingCoproId, nom.trim());
      return;
    }

    setIsSaving(true);
    const { data, error } = await createCopropriete({
      name: nom.trim(),
      address: adresse.trim(),
      city: ville.trim(),
      postal_code: codePostal.trim(),
      nombre_batiments: parseInt(nombreBatiments, 10) || 1,
      annee_construction: anneeConstruction ? parseInt(anneeConstruction, 10) : undefined,
      siret_syndic: siretSyndic || undefined,
    });
    setIsSaving(false);

    if (error) {
      setErrors({ nom: error.message });
      return;
    }
    if (data) {
      onComplete(data.id, data.name);
    }
  }, [validate, existingCoproId, nom, adresse, ville, codePostal, nombreBatiments, anneeConstruction, siretSyndic, onComplete]);

  return (
    <div>
      <StepHeader
        title="Créer la copropriété"
        description="Renseignez les informations de base de la copropriété. Vous pourrez les modifier plus tard."
      />

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Nom de la copropriété <span className={styles.required}>*</span></label>
          <input
            className={styles.input}
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="Résidence Les Lilas"
          />
          {errors.nom && <span className={styles.error}>{errors.nom}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Adresse <span className={styles.required}>*</span></label>
          <input
            className={styles.input}
            value={adresse}
            onChange={e => setAdresse(e.target.value)}
            placeholder="12 rue des Fleurs"
          />
          {errors.adresse && <span className={styles.error}>{errors.adresse}</span>}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Code postal <span className={styles.required}>*</span></label>
            <input
              className={styles.input}
              value={codePostal}
              onChange={e => setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="75001"
            />
            {errors.codePostal && <span className={styles.error}>{errors.codePostal}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ville <span className={styles.required}>*</span></label>
            <input
              className={styles.input}
              value={ville}
              onChange={e => setVille(e.target.value)}
              placeholder="Paris"
            />
            {errors.ville && <span className={styles.error}>{errors.ville}</span>}
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre de bâtiments</label>
            <input
              className={styles.input}
              type="number"
              min="1"
              value={nombreBatiments}
              onChange={e => setNombreBatiments(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Année de construction</label>
            <input
              className={styles.input}
              type="number"
              min="1800"
              max="2026"
              value={anneeConstruction}
              onChange={e => setAnneeConstruction(e.target.value)}
              placeholder="1985"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>SIRET du syndic</label>
          <input
            className={styles.input}
            value={siretSyndic}
            onChange={e => setSiretSyndic(e.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="123 456 789 00012"
          />
        </div>

        <div className={styles.footer}>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Création...' : 'Créer et continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}
