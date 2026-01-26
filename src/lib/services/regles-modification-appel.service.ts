import type {
  AppelFonds,
  AppelFondsAvecGeneration,
  StatutGeneration,
  ReglesModification,
  ActionAppel,
} from '@/components/features/finance/AppelsFonds/types';

/**
 * Service de gestion des règles de modification des appels de fonds
 *
 * Règle métier : Un appel généré (émis aux copropriétaires) ne peut plus être modifié
 * pour garantir la cohérence avec les documents envoyés.
 */
export const reglesModificationAppelService = {
  /**
   * Détermine le statut de génération d'un appel
   * Basé sur le statut existant ou la présence d'une date d'émission
   */
  getStatutGeneration(appel: AppelFonds): StatutGeneration {
    // Un appel est considéré comme "généré" s'il a été émis
    const statutsGeneres = ['EMIS', 'ENVOYE', 'PARTIELLEMENT_PAYE', 'SOLDE'];

    if (typeof appel.statut === 'string' && statutsGeneres.includes(appel.statut.toUpperCase())) {
      return 'genere';
    }

    // Si dateEmission est définie et passée, l'appel est considéré généré
    if (appel.dateEmission) {
      const dateEmission = new Date(appel.dateEmission);
      if (dateEmission <= new Date()) {
        return 'genere';
      }
    }

    return 'brouillon';
  },

  /**
   * Détermine les règles de modification selon le statut
   */
  getRegles(appel: AppelFonds | AppelFondsAvecGeneration): ReglesModification {
    const statutGeneration = 'statutGeneration' in appel
      ? appel.statutGeneration
      : this.getStatutGeneration(appel);

    if (statutGeneration === 'brouillon') {
      return {
        estModifiable: true,
        champsEditables: [
          'description',
          'dateExigibilite',
          'dateEmission',
          'montantTotal',
          'periode',
          'type',
          'budgetTravauxId',
          'projetNom',
        ],
        actionsAutorisees: ['modifier', 'supprimer', 'generer'],
      };
    }

    // Appel généré = figé
    return {
      estModifiable: false,
      raison:
        'Cet appel a été généré et envoyé aux copropriétaires. ' +
        'Il ne peut plus être modifié pour garantir la cohérence avec les documents envoyés.',
      champsEditables: [],
      actionsAutorisees: ['suivre', 'relancer', 'annuler'],
    };
  },

  /**
   * Vérifie si une action est autorisée
   */
  peutEffectuer(appel: AppelFonds | AppelFondsAvecGeneration, action: ActionAppel): boolean {
    const regles = this.getRegles(appel);
    return regles.actionsAutorisees.includes(action);
  },

  /**
   * Vérifie si un champ spécifique est éditable
   */
  champEstEditable(appel: AppelFonds | AppelFondsAvecGeneration, nomChamp: string): boolean {
    const regles = this.getRegles(appel);
    return regles.champsEditables.includes(nomChamp);
  },

  /**
   * Message explicatif pour l'UI
   */
  getMessageVerrouillage(appel: AppelFonds | AppelFondsAvecGeneration): string | null {
    const statutGeneration = 'statutGeneration' in appel
      ? appel.statutGeneration
      : this.getStatutGeneration(appel);

    if (statutGeneration === 'genere') {
      const dateGeneration = 'dateGeneration' in appel && appel.dateGeneration
        ? new Date(appel.dateGeneration).toLocaleDateString('fr-FR')
        : appel.dateEmission
          ? new Date(appel.dateEmission).toLocaleDateString('fr-FR')
          : null;

      if (dateGeneration) {
        return `Appel émis le ${dateGeneration}. Modification impossible.`;
      }
      return 'Appel émis. Modification impossible.';
    }
    return null;
  },

  /**
   * Vérifie si l'appel est en mode lecture seule
   */
  estEnLectureSeule(appel: AppelFonds | AppelFondsAvecGeneration): boolean {
    return !this.getRegles(appel).estModifiable;
  },
};
