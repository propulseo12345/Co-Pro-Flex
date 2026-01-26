'use client';

import { useMemo, useCallback } from 'react';

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

interface RolesSeance {
  president: PersonneRole | null;
  secretaire: PersonneRole | null;
  scrutateurs: PersonneRole[];
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
  typeParticipation: 'present' | 'visioconference' | 'represente' | 'correspondance' | 'absent';
}

interface UseRolesExclusionOptions {
  roles: RolesSeance;
  participants: Participant[];
}

interface UseRolesExclusionReturn {
  /** IDs exclus pour le rôle de président */
  excludedForPresident: string[];
  /** IDs exclus pour le rôle de secrétaire */
  excludedForSecretaire: string[];
  /** IDs exclus pour le rôle de scrutateur */
  excludedForScrutateur: string[];

  /** Vérifie si un copropriétaire peut être président */
  canBePresident: (coproprietaireId: string) => boolean;
  /** Vérifie si un copropriétaire peut être secrétaire */
  canBeSecretaire: (coproprietaireId: string) => boolean;
  /** Vérifie si un copropriétaire peut être scrutateur */
  canBeScrutateur: (coproprietaireId: string) => boolean;

  /** Retourne la raison d'exclusion pour un copropriétaire et un rôle donné */
  getExclusionReason: (coproprietaireId: string, role: 'president' | 'secretaire' | 'scrutateur') => string | null;

  /** Participants filtrés disponibles pour être président */
  availableForPresident: Participant[];
  /** Participants filtrés disponibles pour être secrétaire */
  availableForSecretaire: Participant[];
  /** Participants filtrés disponibles pour être scrutateur */
  availableForScrutateur: Participant[];
}

/**
 * Hook pour gérer l'exclusion mutuelle des rôles de séance en AG
 *
 * Règles d'exclusion :
 * - Président + Secrétaire : NON
 * - Président + Scrutateur : NON
 * - Secrétaire + Scrutateur : NON
 * - Scrutateur 1 + Scrutateur 2 : NON (même personne)
 *
 * Note: Le gestionnaire peut être secrétaire, il n'est pas concerné par les exclusions
 */
export function useRolesExclusion({
  roles,
  participants,
}: UseRolesExclusionOptions): UseRolesExclusionReturn {

  // Extraire les IDs des personnes ayant déjà un rôle
  const presidentId = roles.president?.coproprietaireId || null;
  const secretaireId = roles.secretaire?.coproprietaireId || null;
  const scrutateursIds = useMemo(() =>
    roles.scrutateurs
      .filter(s => s?.coproprietaireId)
      .map(s => s.coproprietaireId!),
    [roles.scrutateurs]
  );

  // ========================================
  // CALCUL DES EXCLUSIONS PAR RÔLE
  // ========================================

  // Pour le PRÉSIDENT : exclure secrétaire et scrutateurs actuels
  const excludedForPresident = useMemo(() => {
    const excluded: string[] = [];
    if (secretaireId) excluded.push(secretaireId);
    excluded.push(...scrutateursIds);
    return excluded;
  }, [secretaireId, scrutateursIds]);

  // Pour le SECRÉTAIRE : exclure président et scrutateurs actuels
  const excludedForSecretaire = useMemo(() => {
    const excluded: string[] = [];
    if (presidentId) excluded.push(presidentId);
    excluded.push(...scrutateursIds);
    return excluded;
  }, [presidentId, scrutateursIds]);

  // Pour les SCRUTATEURS : exclure président, secrétaire et autres scrutateurs
  const excludedForScrutateur = useMemo(() => {
    const excluded: string[] = [];
    if (presidentId) excluded.push(presidentId);
    if (secretaireId) excluded.push(secretaireId);
    excluded.push(...scrutateursIds);
    return excluded;
  }, [presidentId, secretaireId, scrutateursIds]);

  // ========================================
  // FONCTIONS DE VÉRIFICATION
  // ========================================

  const canBePresident = useCallback((coproprietaireId: string): boolean => {
    return !excludedForPresident.includes(coproprietaireId);
  }, [excludedForPresident]);

  const canBeSecretaire = useCallback((coproprietaireId: string): boolean => {
    return !excludedForSecretaire.includes(coproprietaireId);
  }, [excludedForSecretaire]);

  const canBeScrutateur = useCallback((coproprietaireId: string): boolean => {
    return !excludedForScrutateur.includes(coproprietaireId);
  }, [excludedForScrutateur]);

  // ========================================
  // MESSAGES D'EXCLUSION
  // ========================================

  const getExclusionReason = useCallback((
    coproprietaireId: string,
    role: 'president' | 'secretaire' | 'scrutateur'
  ): string | null => {
    // Trouver le nom de la personne pour un message clair
    const participant = participants.find(p => p.coproprietaireId === coproprietaireId);
    const nom = participant
      ? `${participant.coproprietaire.prenom} ${participant.coproprietaire.nom}`
      : 'Cette personne';

    switch (role) {
      case 'president':
        if (coproprietaireId === secretaireId) {
          return `${nom} est déjà secrétaire. Une même personne ne peut pas être président et secrétaire.`;
        }
        if (scrutateursIds.includes(coproprietaireId)) {
          return `${nom} est déjà scrutateur. Une même personne ne peut pas être président et scrutateur.`;
        }
        break;

      case 'secretaire':
        if (coproprietaireId === presidentId) {
          return `${nom} est déjà président. Une même personne ne peut pas être secrétaire et président.`;
        }
        if (scrutateursIds.includes(coproprietaireId)) {
          return `${nom} est déjà scrutateur. Une même personne ne peut pas être secrétaire et scrutateur.`;
        }
        break;

      case 'scrutateur':
        if (coproprietaireId === presidentId) {
          return `${nom} est déjà président. Une même personne ne peut pas être scrutateur et président.`;
        }
        if (coproprietaireId === secretaireId) {
          return `${nom} est déjà secrétaire. Une même personne ne peut pas être scrutateur et secrétaire.`;
        }
        if (scrutateursIds.includes(coproprietaireId)) {
          return `${nom} est déjà scrutateur. Une même personne ne peut pas être scrutateur plusieurs fois.`;
        }
        break;
    }

    return null;
  }, [participants, presidentId, secretaireId, scrutateursIds]);

  // ========================================
  // PARTICIPANTS FILTRÉS
  // ========================================

  // Filtrer les participants éligibles (présents, non absents, non correspondance)
  const eligibleParticipants = useMemo(() => {
    return participants.filter(p =>
      p.typeParticipation === 'present' ||
      p.typeParticipation === 'visioconference' ||
      p.typeParticipation === 'represente'
    );
  }, [participants]);

  const availableForPresident = useMemo(() => {
    return eligibleParticipants.filter(p => !excludedForPresident.includes(p.coproprietaireId));
  }, [eligibleParticipants, excludedForPresident]);

  const availableForSecretaire = useMemo(() => {
    return eligibleParticipants.filter(p => !excludedForSecretaire.includes(p.coproprietaireId));
  }, [eligibleParticipants, excludedForSecretaire]);

  const availableForScrutateur = useMemo(() => {
    return eligibleParticipants.filter(p => !excludedForScrutateur.includes(p.coproprietaireId));
  }, [eligibleParticipants, excludedForScrutateur]);

  return {
    excludedForPresident,
    excludedForSecretaire,
    excludedForScrutateur,
    canBePresident,
    canBeSecretaire,
    canBeScrutateur,
    getExclusionReason,
    availableForPresident,
    availableForSecretaire,
    availableForScrutateur,
  };
}

// Types exportés pour utilisation externe
export type {
  PersonneRole,
  RolesSeance,
  Participant,
  TypePersonneRole,
  UseRolesExclusionReturn
};
