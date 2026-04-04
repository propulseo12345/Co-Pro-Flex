'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import styles from './page.module.css';

const LOT_OPTIONS = [
  'Moins de 50',
  '50 à 200',
  '200 à 500',
  '500 à 1 000',
  'Plus de 1 000',
] as const;

const PROFILE_OPTIONS = [
  'Syndic professionnel',
  'Syndic bénévole',
  'Conseil syndical',
  'Copropriétaire',
  'Autre',
] as const;

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!consent) return;
      setIsSubmitted(true);
    },
    [consent],
  );

  if (isSubmitted) {
    return (
      <div className={styles.successMessage}>
        <ShieldCheck size={32} className={styles.successIcon} />
        <p className={styles.successTitle}>Demande envoyée !</p>
        <p className={styles.successDesc}>
          Notre équipe vous recontacte sous 2 heures ouvrées.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="contact-name" className={styles.label}>Nom complet</label>
        <input
          id="contact-name"
          className={styles.input}
          type="text"
          placeholder="Jean Dupont"
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-email" className={styles.label}>Email professionnel</label>
        <input
          id="contact-email"
          className={styles.input}
          type="email"
          placeholder="jean.dupont@cabinet-syndic.fr"
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-phone" className={styles.label}>Téléphone</label>
        <input
          id="contact-phone"
          className={styles.input}
          type="tel"
          placeholder="06 12 34 56 78"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-company" className={styles.label}>
          Nom du cabinet ou de la copropriété
        </label>
        <input
          id="contact-company"
          className={styles.input}
          type="text"
          placeholder="Cabinet Martin & Associés"
        />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="contact-lots" className={styles.label}>Nombre de lots gérés</label>
          <select id="contact-lots" className={styles.select} defaultValue="">
            <option value="" disabled>
              Sélectionnez
            </option>
            {LOT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="contact-profile" className={styles.label}>Votre profil</label>
          <select id="contact-profile" className={styles.select} defaultValue="">
            <option value="" disabled>
              Sélectionnez
            </option>
            {PROFILE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-message" className={styles.label}>Votre message</label>
        <textarea
          id="contact-message"
          className={styles.textarea}
          rows={4}
          placeholder="Décrivez brièvement votre besoin ou vos questions..."
        />
      </div>

      <label htmlFor="contact-consent" className={styles.checkbox}>
        <input
          id="contact-consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span className={styles.checkboxText}>
          J'accepte que mes données soient traitées conformément
          à la politique de confidentialité de CoProFlex.
        </span>
      </label>

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={!consent}
      >
        Envoyer ma demande
      </button>
    </form>
  );
}
