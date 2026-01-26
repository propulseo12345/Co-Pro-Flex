'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Crown,
  FileText,
  Eye,
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  Plus
} from 'lucide-react';
import { RoleSelect } from './RoleSelect';
import { useRolesExclusion } from '@/hooks/useRolesExclusion';
import type { PersonneRole, Participant } from '@/hooks/useRolesExclusion';
import styles from './RolesSeancePanel.module.css';

interface Gestionnaire {
  id: string;
  nom: string;
  prenom: string;
  societe: string;
  fonction: string;
}

interface RolesSeance {
  president: PersonneRole | null;
  secretaire: PersonneRole | null;
  scrutateurs: PersonneRole[];
}

interface RolesSeancePanelProps {
  roles: RolesSeance;
  onRolesChange: (roles: RolesSeance) => void;
  participants: Participant[];
  gestionnaire?: Gestionnaire | null;
  nombreScrutateurs?: number;
}

export function RolesSeancePanel({
  roles,
  onRolesChange,
  participants,
  gestionnaire,
  nombreScrutateurs = 2,
}: RolesSeancePanelProps) {

  // Utiliser le hook d'exclusion
  const {
    excludedForPresident,
    excludedForSecretaire,
    getExclusionReason,
    availableForPresident,
    availableForSecretaire,
    availableForScrutateur,
  } = useRolesExclusion({ roles, participants });

  // Vérifier si tous les rôles obligatoires sont remplis
  const rolesComplets = useMemo(() => {
    return (
      roles.president !== null &&
      roles.secretaire !== null &&
      roles.scrutateurs.filter(Boolean).length >= nombreScrutateurs
    );
  }, [roles, nombreScrutateurs]);

  // Handlers
  const handlePresidentChange = useCallback((value: PersonneRole | null) => {
    onRolesChange({ ...roles, president: value });
  }, [roles, onRolesChange]);

  const handleSecretaireChange = useCallback((value: PersonneRole | null) => {
    onRolesChange({ ...roles, secretaire: value });
  }, [roles, onRolesChange]);

  const handleScrutateurChange = useCallback((index: number, value: PersonneRole | null) => {
    const newScrutateurs = [...roles.scrutateurs];
    if (value) {
      newScrutateurs[index] = value;
    } else {
      // Supprimer le scrutateur à cet index
      newScrutateurs.splice(index, 1);
    }
    onRolesChange({ ...roles, scrutateurs: newScrutateurs.filter(Boolean) });
  }, [roles, onRolesChange]);

  const addScrutateur = useCallback(() => {
    // Ajouter un slot de scrutateur (sera rempli par la sélection)
    // On ne fait rien ici car le RoleSelect gère l'ajout
  }, []);

  // Fonction pour obtenir la raison d'exclusion pour le président
  const getPresidentExclusionReason = useCallback((id: string) => {
    return getExclusionReason(id, 'president');
  }, [getExclusionReason]);

  // Fonction pour obtenir la raison d'exclusion pour le secrétaire
  const getSecretaireExclusionReason = useCallback((id: string) => {
    return getExclusionReason(id, 'secretaire');
  }, [getExclusionReason]);

  // Fonction pour obtenir la raison d'exclusion pour un scrutateur
  const getScrutateurExclusionReason = useCallback((id: string) => {
    return getExclusionReason(id, 'scrutateur');
  }, [getExclusionReason]);

  // Calculer les exclusions spécifiques pour chaque scrutateur
  const getExcludedForScrutateurAt = useCallback((index: number) => {
    // Exclure président, secrétaire, et AUTRES scrutateurs (pas celui à l'index courant)
    const excluded: string[] = [];
    if (roles.president?.coproprietaireId) {
      excluded.push(roles.president.coproprietaireId);
    }
    if (roles.secretaire?.coproprietaireId) {
      excluded.push(roles.secretaire.coproprietaireId);
    }
    roles.scrutateurs.forEach((s, i) => {
      if (i !== index && s?.coproprietaireId) {
        excluded.push(s.coproprietaireId);
      }
    });
    return excluded;
  }, [roles]);

  // Nombre de slots de scrutateurs à afficher
  const scrutateurSlots = Math.max(nombreScrutateurs, roles.scrutateurs.length + 1);

  // Calculer les disponibles restants pour les scrutateurs
  const remainingAvailableForScrutateur = useMemo(() => {
    const assignedScrutateurIds = roles.scrutateurs
      .filter(Boolean)
      .map(s => s.coproprietaireId)
      .filter(Boolean);

    return availableForScrutateur.filter(
      p => !assignedScrutateurIds.includes(p.coproprietaireId)
    );
  }, [availableForScrutateur, roles.scrutateurs]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h3 className={styles.headerTitle}>
          <Users size={20} aria-hidden="true" />
          Désignation des rôles de séance
        </h3>

        {rolesComplets ? (
          <span className={styles.statusOk}>
            <CheckCircle size={16} aria-hidden="true" />
            Rôles complets
          </span>
        ) : (
          <span className={styles.statusWarning}>
            <AlertTriangle size={16} aria-hidden="true" />
            Rôles incomplets
          </span>
        )}
      </header>

      {/* Information sur les règles d'exclusion */}
      <div className={styles.infoBox}>
        <Info size={16} aria-hidden="true" />
        <div>
          <p>
            <strong>Règles :</strong> Une même personne ne peut pas cumuler plusieurs rôles.
          </p>
          <ul className={styles.rulesList}>
            <li>Le <strong>président</strong> doit être un copropriétaire</li>
            <li>Le <strong>secrétaire</strong> peut être un copropriétaire ou le gestionnaire</li>
            <li>Les <strong>scrutateurs</strong> ({nombreScrutateurs} minimum) doivent être des copropriétaires</li>
          </ul>
        </div>
      </div>

      <div className={styles.rolesGrid}>
        {/* Président */}
        <div className={styles.roleCard}>
          <div className={`${styles.roleIcon} ${styles.roleIconPresident}`}>
            <Crown size={24} aria-hidden="true" />
          </div>
          <RoleSelect
            label="Président de séance"
            role="president"
            value={roles.president}
            onChange={handlePresidentChange}
            participants={participants}
            excludedIds={excludedForPresident}
            getExclusionReason={getPresidentExclusionReason}
            required
            allowGestionnaire={false}
          />
          <p className={styles.roleHelp}>
            {availableForPresident.length} copropriétaire{availableForPresident.length > 1 ? 's' : ''} disponible{availableForPresident.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Secrétaire */}
        <div className={styles.roleCard}>
          <div className={`${styles.roleIcon} ${styles.roleIconSecretaire}`}>
            <FileText size={24} aria-hidden="true" />
          </div>
          <RoleSelect
            label="Secrétaire de séance"
            role="secretaire"
            value={roles.secretaire}
            onChange={handleSecretaireChange}
            participants={participants}
            gestionnaire={gestionnaire}
            excludedIds={excludedForSecretaire}
            getExclusionReason={getSecretaireExclusionReason}
            required
            allowGestionnaire={true}
          />
          <p className={styles.roleHelp}>
            {gestionnaire ? '1 gestionnaire + ' : ''}
            {availableForSecretaire.length} copropriétaire{availableForSecretaire.length > 1 ? 's' : ''} disponible{availableForSecretaire.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Scrutateurs */}
        <div className={`${styles.roleCard} ${styles.scrutateursCard}`}>
          <div className={`${styles.roleIcon} ${styles.roleIconScrutateur}`}>
            <Eye size={24} aria-hidden="true" />
          </div>
          <div className={styles.scrutateursList}>
            <label className={styles.roleLabel}>
              Scrutateurs ({roles.scrutateurs.filter(Boolean).length}/{nombreScrutateurs} minimum)
              <span className={styles.required}>*</span>
            </label>

            {/* Slots de scrutateurs */}
            {Array.from({ length: scrutateurSlots }).map((_, index) => {
              // Ne pas afficher de slot vide supplémentaire si pas de disponibles
              if (index >= roles.scrutateurs.length && remainingAvailableForScrutateur.length === 0) {
                return null;
              }

              // Ne pas afficher plus de slots que nécessaire
              if (index > roles.scrutateurs.length) {
                return null;
              }

              return (
                <div key={index} className={styles.scrutateurSlot}>
                  <RoleSelect
                    label={`Scrutateur ${index + 1}`}
                    role="scrutateur"
                    value={roles.scrutateurs[index] || null}
                    onChange={(value) => handleScrutateurChange(index, value)}
                    participants={participants}
                    excludedIds={getExcludedForScrutateurAt(index)}
                    getExclusionReason={getScrutateurExclusionReason}
                    required={index < nombreScrutateurs}
                    allowGestionnaire={false}
                  />
                </div>
              );
            })}

            {/* Bouton ajouter si disponibles */}
            {remainingAvailableForScrutateur.length > 0 &&
             roles.scrutateurs.length >= nombreScrutateurs && (
              <button
                type="button"
                className={styles.addScrutateur}
                onClick={() => {
                  // Ajouter un slot vide qui sera rempli par le prochain RoleSelect
                }}
              >
                <Plus size={16} aria-hidden="true" />
                Ajouter un scrutateur ({remainingAvailableForScrutateur.length} disponible{remainingAvailableForScrutateur.length > 1 ? 's' : ''})
              </button>
            )}

            {/* Message si plus de disponibles */}
            {remainingAvailableForScrutateur.length === 0 && roles.scrutateurs.length < nombreScrutateurs && (
              <div className={styles.warningBox}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>
                  Plus de copropriétaires disponibles pour être scrutateur.
                  Il manque {nombreScrutateurs - roles.scrutateurs.length} scrutateur{nombreScrutateurs - roles.scrutateurs.length > 1 ? 's' : ''}.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Récapitulatif */}
      {rolesComplets && (
        <div className={styles.recap}>
          <h4 className={styles.recapTitle}>
            <CheckCircle size={18} aria-hidden="true" />
            Bureau constitué
          </h4>
          <ul className={styles.recapList}>
            <li>
              <Crown size={14} aria-hidden="true" />
              <strong>Président :</strong> {roles.president?.prenom} {roles.president?.nom}
            </li>
            <li>
              <FileText size={14} aria-hidden="true" />
              <strong>Secrétaire :</strong> {roles.secretaire?.prenom} {roles.secretaire?.nom}
              {roles.secretaire?.type === 'gestionnaire' && (
                <em> (représentant le syndic {roles.secretaire.societe})</em>
              )}
            </li>
            <li>
              <Eye size={14} aria-hidden="true" />
              <strong>Scrutateur{roles.scrutateurs.length > 1 ? 's' : ''} :</strong>{' '}
              {roles.scrutateurs
                .filter(Boolean)
                .map(s => `${s.prenom} ${s.nom}`)
                .join(', ')}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export type { RolesSeance, RolesSeancePanelProps, Gestionnaire };
