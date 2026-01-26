'use client';

import { useMemo, useState } from 'react';
import { User, Briefcase, Ban } from 'lucide-react';
import styles from './RoleSelect.module.css';

type TypePersonneRole = 'coproprietaire' | 'gestionnaire' | 'tiers';

interface PersonneRole {
  id: string;
  type: TypePersonneRole;
  nom: string;
  prenom: string;
  coproprietaireId?: string;
  societe?: string;
  fonction?: string;
}

interface Participant {
  id: string;
  coproprietaireId: string;
  coproprietaire: {
    id: string;
    nom: string;
    prenom: string;
    lots: { numero: string }[];
  };
  typeParticipation: string;
}

interface Gestionnaire {
  id: string;
  nom: string;
  prenom: string;
  societe: string;
  fonction: string;
}

interface RoleSelectProps {
  label: string;
  role: 'president' | 'secretaire' | 'scrutateur';
  value: PersonneRole | null;
  onChange: (value: PersonneRole | null) => void;
  participants: Participant[];
  gestionnaire?: Gestionnaire | null;
  excludedIds: string[];
  getExclusionReason?: (id: string) => string | null;
  required?: boolean;
  allowGestionnaire?: boolean;
}

export function RoleSelect({
  label,
  role,
  value,
  onChange,
  participants,
  gestionnaire,
  excludedIds,
  getExclusionReason,
  required = false,
  allowGestionnaire = false,
}: RoleSelectProps) {
  const [showExclusionToast, setShowExclusionToast] = useState<string | null>(null);

  // Séparer participants disponibles et exclus
  const { availableParticipants, excludedParticipants } = useMemo(() => {
    const available: Participant[] = [];
    const excluded: Participant[] = [];

    for (const p of participants) {
      // Vérifier éligibilité de base (présent/représenté)
      if (p.typeParticipation === 'absent' || p.typeParticipation === 'correspondance') {
        continue;
      }

      if (excludedIds.includes(p.coproprietaireId)) {
        excluded.push(p);
      } else {
        available.push(p);
      }
    }

    return { availableParticipants: available, excludedParticipants: excluded };
  }, [participants, excludedIds]);

  // Construire les options
  const options = useMemo(() => {
    const opts: {
      value: string;
      label: string;
      type: TypePersonneRole;
      data: PersonneRole;
      disabled: boolean;
      exclusionReason?: string;
    }[] = [];

    // Option gestionnaire (si autorisé et non exclu)
    if (allowGestionnaire && gestionnaire) {
      opts.push({
        value: `gestionnaire-${gestionnaire.id}`,
        label: `${gestionnaire.prenom} ${gestionnaire.nom} (${gestionnaire.fonction} - ${gestionnaire.societe})`,
        type: 'gestionnaire',
        disabled: false,
        data: {
          id: gestionnaire.id,
          type: 'gestionnaire',
          nom: gestionnaire.nom,
          prenom: gestionnaire.prenom,
          societe: gestionnaire.societe,
          fonction: gestionnaire.fonction,
        },
      });
    }

    // Options copropriétaires disponibles
    for (const p of availableParticipants) {
      const lots = p.coproprietaire.lots.map(l => l.numero).join(', ');
      opts.push({
        value: `copro-${p.coproprietaireId}`,
        label: `${p.coproprietaire.prenom} ${p.coproprietaire.nom} (Lot${p.coproprietaire.lots.length > 1 ? 's' : ''} ${lots})`,
        type: 'coproprietaire',
        disabled: false,
        data: {
          id: p.coproprietaireId,
          type: 'coproprietaire',
          nom: p.coproprietaire.nom,
          prenom: p.coproprietaire.prenom,
          coproprietaireId: p.coproprietaireId,
        },
      });
    }

    // Options copropriétaires exclus (affichés mais désactivés)
    for (const p of excludedParticipants) {
      const lots = p.coproprietaire.lots.map(l => l.numero).join(', ');
      const reason = getExclusionReason?.(p.coproprietaireId);
      opts.push({
        value: `copro-${p.coproprietaireId}`,
        label: `${p.coproprietaire.prenom} ${p.coproprietaire.nom} (Lot${p.coproprietaire.lots.length > 1 ? 's' : ''} ${lots})`,
        type: 'coproprietaire',
        disabled: true,
        exclusionReason: reason || 'Déjà assigné à un autre rôle',
        data: {
          id: p.coproprietaireId,
          type: 'coproprietaire',
          nom: p.coproprietaire.nom,
          prenom: p.coproprietaire.prenom,
          coproprietaireId: p.coproprietaireId,
        },
      });
    }

    return opts;
  }, [availableParticipants, excludedParticipants, gestionnaire, allowGestionnaire, getExclusionReason]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    if (!selectedValue) {
      onChange(null);
      return;
    }

    const option = options.find(o => o.value === selectedValue);
    if (option) {
      if (option.disabled) {
        // Afficher le message d'exclusion
        setShowExclusionToast(option.exclusionReason || 'Cette personne a déjà un rôle');
        setTimeout(() => setShowExclusionToast(null), 4000);
        // Remettre la valeur précédente
        e.target.value = currentValue;
        return;
      }
      onChange(option.data);
    }
  };

  const currentValue = value
    ? (value.type === 'gestionnaire' ? `gestionnaire-${value.id}` : `copro-${value.id}`)
    : '';

  return (
    <div className={styles.container}>
      <label htmlFor={`role-${role}`} className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>

      <div className={styles.selectWrapper}>
        <select
          id={`role-${role}`}
          value={currentValue}
          onChange={handleChange}
          className={styles.select}
          aria-required={required}
          aria-describedby={showExclusionToast ? `${role}-exclusion-msg` : undefined}
        >
          <option value="">-- Sélectionner --</option>

          {/* Groupe Gestionnaire */}
          {allowGestionnaire && gestionnaire && (
            <optgroup label="Gestionnaire / Syndic">
              {options
                .filter(o => o.type === 'gestionnaire')
                .map(o => (
                  <option
                    key={o.value}
                    value={o.value}
                    disabled={o.disabled}
                  >
                    {o.label}
                  </option>
                ))
              }
            </optgroup>
          )}

          {/* Groupe Copropriétaires disponibles */}
          <optgroup label="Copropriétaires disponibles">
            {options
              .filter(o => o.type === 'coproprietaire' && !o.disabled)
              .map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            }
            {options.filter(o => o.type === 'coproprietaire' && !o.disabled).length === 0 && (
              <option disabled>Aucun copropriétaire disponible</option>
            )}
          </optgroup>

          {/* Groupe Copropriétaires exclus (désactivés) */}
          {excludedParticipants.length > 0 && (
            <optgroup label="-- Déjà assignés --">
              {options
                .filter(o => o.type === 'coproprietaire' && o.disabled)
                .map(o => (
                  <option
                    key={o.value}
                    value={o.value}
                    disabled
                    className={styles.optionDisabled}
                  >
                    {o.label}
                  </option>
                ))
              }
            </optgroup>
          )}
        </select>

        {/* Icône indicative */}
        <div className={styles.typeIcon}>
          {value?.type === 'gestionnaire' ? (
            <Briefcase size={16} aria-hidden="true" />
          ) : value?.type === 'coproprietaire' ? (
            <User size={16} aria-hidden="true" />
          ) : null}
        </div>
      </div>

      {/* Toast d'exclusion */}
      {showExclusionToast && (
        <div
          id={`${role}-exclusion-msg`}
          className={styles.exclusionToast}
          role="alert"
        >
          <Ban size={16} aria-hidden="true" />
          <span>{showExclusionToast}</span>
        </div>
      )}

      {/* Indicateur du type sélectionné */}
      {value && (
        <div className={`${styles.typeIndicator} ${styles[value.type]}`}>
          {value.type === 'gestionnaire' && (
            <>
              <Briefcase size={14} aria-hidden="true" />
              <span>Représentant du syndic {value.societe}</span>
            </>
          )}
          {value.type === 'coproprietaire' && (
            <>
              <User size={14} aria-hidden="true" />
              <span>Copropriétaire</span>
            </>
          )}
        </div>
      )}

      {/* Compteur de disponibles */}
      <div className={styles.availableCount}>
        <span>
          {availableParticipants.length} disponible{availableParticipants.length > 1 ? 's' : ''}
          {excludedParticipants.length > 0 && (
            <>, {excludedParticipants.length} exclu{excludedParticipants.length > 1 ? 's' : ''}</>
          )}
        </span>
      </div>
    </div>
  );
}

export type { PersonneRole, Participant, Gestionnaire, RoleSelectProps };
