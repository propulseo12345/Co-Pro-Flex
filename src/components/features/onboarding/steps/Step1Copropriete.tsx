'use client';

import { useState, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { useGoogleMapsAutocomplete } from '@/features/ag/new/hooks/useGoogleMapsAutocomplete';
import { StepHeader } from '../shared/StepHeader';
import { createCopropriete } from '@/lib/onboarding/api';
import styles from './Step1Copropriete.module.css';

const PERIODES_CONSTRUCTION = [
  { value: 'avant-1965', label: 'Avant 1965' },
  { value: '1965-1990', label: '1965 – 1990' },
  { value: '1990-2012', label: '1990 – 2012' },
  { value: 'apres-2012', label: 'Après 2012' },
] as const;

type PeriodeConstruction = typeof PERIODES_CONSTRUCTION[number]['value'];

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
  const [periodeConstruction, setPeriodeConstruction] = useState<PeriodeConstruction | ''>('');
  const [siretSyndic, setSiretSyndic] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePlaceSelect = useCallback((place: { rue: string; codePostal: string; ville: string }) => {
    setAdresse(place.rue);
    setCodePostal(place.codePostal);
    setVille(place.ville);
    setErrors(prev => {
      const next = { ...prev };
      delete next.adresse;
      delete next.codePostal;
      delete next.ville;
      return next;
    });
  }, []);

  const {
    searchValue,
    suggestions,
    isSearching,
    setSearchValue,
    selectSuggestion,
  } = useGoogleMapsAutocomplete({ onPlaceSelect: handlePlaceSelect });

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
      buildings_count: parseInt(nombreBatiments, 10) || 1,
      annee_construction: periodeConstruction || undefined,
      siret: siretSyndic || undefined,
    });
    setIsSaving(false);

    if (error) {
      setErrors({ nom: error.message });
      return;
    }
    if (data) {
      onComplete(data.id, data.name);
    }
  }, [validate, existingCoproId, nom, adresse, ville, codePostal, nombreBatiments, periodeConstruction, siretSyndic, onComplete]);

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
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              className={`${styles.input} ${styles.searchInput}`}
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              placeholder="Rechercher une adresse..."
            />
            {isSearching && <Loader2 size={16} className={styles.searchSpinner} />}
          </div>
          {suggestions.length > 0 && (
            <ul className={styles.suggestions}>
              {suggestions.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={styles.suggestionItem}
                    onClick={() => selectSuggestion(s)}
                  >
                    <MapPin size={14} className={styles.suggestionIcon} />
                    <span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            className={styles.input}
            value={adresse}
            onChange={e => setAdresse(e.target.value)}
            placeholder="Numéro et rue (ex. 12 rue des Lilas)"
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
            <label className={styles.label}>Période de construction</label>
            <div className={styles.pills}>
              {PERIODES_CONSTRUCTION.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`${styles.pill} ${periodeConstruction === p.value ? styles.pillActive : ''}`}
                  onClick={() => setPeriodeConstruction(prev => prev === p.value ? '' : p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
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
