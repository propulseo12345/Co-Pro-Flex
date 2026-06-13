'use client';

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './FormField.module.css';

interface BaseFieldProps {
  /** Libellé affiché au-dessus du contrôle. */
  label: string;
  /** Message d'erreur de validation (ex. `errors.amount?.message`). */
  error?: string;
  /** Aide affichée sous le champ quand il n'y a pas d'erreur. */
  hint?: string;
  /** Affiche un astérisque rouge à côté du libellé. */
  required?: boolean;
  /** Classe additionnelle sur le conteneur (`.field`). */
  containerClassName?: string;
}

type FormFieldProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;

/**
 * Champ de formulaire (input) prêt pour React Hook Form : on lui passe
 * directement `{...register('champ')}` (le `ref` est forwardé, name/onChange/onBlur
 * arrivent via les props). Gère l'affichage de l'erreur et l'accessibilité.
 */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, hint, required, containerClassName, id, className, ...inputProps },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;

  return (
    <div className={clsx(styles.field, containerClassName)}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className={clsx(styles.input, error && styles.inputError, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className={styles.errorMsg} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
});

type FormSelectProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode };

/** Variante `<select>` de {@link FormField}, même intégration RHF. */
export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function FormSelect(
  { label, error, hint, required, containerClassName, id, className, children, ...selectProps },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;

  return (
    <div className={clsx(styles.field, containerClassName)}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
        {required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>
      <select
        ref={ref}
        id={fieldId}
        className={clsx(styles.input, error && styles.inputError, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...selectProps}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className={styles.errorMsg} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
});
