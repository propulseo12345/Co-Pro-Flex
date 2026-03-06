'use client';

import { AlertTriangle, MapPin } from 'lucide-react';
import type {
  AdresseAG,
  GoogleMapsAutocompleteStatus,
  AdresseAutocompleteSuggestion,
} from '../domain/types';
import styles from '../../../../app/(dashboard)/ag/new/new-ag.module.css';

interface AdresseSectionProps {
  adresse: AdresseAG;
  adresseComplete: string;
  errors: Record<string, string>;
  addressSearchValue: string;
  addressSuggestions: AdresseAutocompleteSuggestion[];
  isAddressSearching: boolean;
  onAddressSearchChange: (value: string) => void;
  onAddressSuggestionSelect: (suggestion: AdresseAutocompleteSuggestion) => void;
  isGoogleMapsLoaded: boolean;
  googleMapsStatus: GoogleMapsAutocompleteStatus;
  onAdresseChange: (field: keyof AdresseAG, value: string) => void;
}

export function AdresseSection({
  adresse,
  adresseComplete,
  errors,
  addressSearchValue,
  addressSuggestions = [],
  isAddressSearching,
  onAddressSearchChange,
  onAddressSuggestionSelect,
  isGoogleMapsLoaded,
  googleMapsStatus,
  onAdresseChange,
}: AdresseSectionProps) {
  return (
    <div className={styles.addressSection}>
      <h3 className={styles.addressSectionTitle}>
        <MapPin size={18} aria-hidden="true" />
        Lieu physique de l&apos;assemblée générale <span className={styles.asterisk}>*</span>
      </h3>

      <div className={styles.formGroup}>
        <label htmlFor="addressSearch" className={styles.label}>
          Recherche rapide (optionnel)
        </label>
        <div className={styles.addressContainer}>
          <input
            type="text"
            id="addressSearch"
            className={styles.input}
            placeholder="Tapez une adresse pour remplir automatiquement..."
            autoComplete="off"
            value={addressSearchValue}
            onChange={(e) => onAddressSearchChange(e.target.value)}
          />
          {addressSuggestions.length > 0 && (
            <div className={styles.addressSuggestions}>
              {addressSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={styles.addressSuggestionItem}
                  onClick={() => onAddressSuggestionSelect(suggestion)}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          )}
          {isAddressSearching && (
            <div className={styles.addressHint}>
              <MapPin size={14} aria-hidden="true" />
              <span>Recherche d&apos;adresses en cours...</span>
            </div>
          )}
          {isGoogleMapsLoaded && (
            <div className={styles.addressHint}>
              <MapPin size={14} aria-hidden="true" />
              <span>Recherche BAN / IGN activée (gratuite)</span>
            </div>
          )}
          {googleMapsStatus === 'loading_error' && (
            <div className={`${styles.addressHint} ${styles.addressHintError}`}>
              <AlertTriangle size={14} aria-hidden="true" />
              <span>Impossible de charger la recherche BAN / IGN. Réessaie dans quelques instants.</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="nomLieu" className={styles.label}>
            Nom du lieu
          </label>
          <input
            type="text"
            id="nomLieu"
            className={styles.input}
            placeholder="Ex: Salle des fêtes, Gymnase..."
            value={adresse.nomLieu}
            onChange={(e) => onAdresseChange('nomLieu', e.target.value)}
          />
        </div>

        <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="rue" className={styles.label}>
            Numéro et rue <span className={styles.asterisk}>*</span>
          </label>
          <input
            type="text"
            id="rue"
            className={`${styles.input} ${errors['adresse.rue'] ? styles.inputError : ''}`}
            placeholder="Ex: 25 avenue Victor Hugo"
            value={adresse.rue}
            onChange={(e) => onAdresseChange('rue', e.target.value)}
          />
          {errors['adresse.rue'] && <span className={styles.error}>{errors['adresse.rue']}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="codePostal" className={styles.label}>
            Code postal <span className={styles.asterisk}>*</span>
          </label>
          <input
            type="text"
            id="codePostal"
            className={`${styles.input} ${errors['adresse.codePostal'] ? styles.inputError : ''}`}
            placeholder="Ex: 69003"
            value={adresse.codePostal}
            onChange={(e) => onAdresseChange('codePostal', e.target.value)}
            maxLength={5}
          />
          {errors['adresse.codePostal'] && <span className={styles.error}>{errors['adresse.codePostal']}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="ville" className={styles.label}>
            Ville <span className={styles.asterisk}>*</span>
          </label>
          <input
            type="text"
            id="ville"
            className={`${styles.input} ${errors['adresse.ville'] ? styles.inputError : ''}`}
            placeholder="Ex: Lyon"
            value={adresse.ville}
            onChange={(e) => onAdresseChange('ville', e.target.value)}
          />
          {errors['adresse.ville'] && <span className={styles.error}>{errors['adresse.ville']}</span>}
        </div>
      </div>

      {adresseComplete && (
        <div className={styles.addressPreview}>
          <strong>Adresse complète :</strong> {adresseComplete}
        </div>
      )}
    </div>
  );
}
