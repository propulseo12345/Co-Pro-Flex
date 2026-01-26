/**
 * Service pour l'intégration des rapports CS avec les résolutions AG
 *
 * Ce service permet de créer automatiquement la résolution
 * "Compte rendu du Conseil Syndical" à partir d'un rapport validé.
 */

import { RapportActiviteCS } from '@/types/models/conseil-syndical';
import { Resolution } from '@/types/models/ag';
import { rapportCSService } from './rapport-cs.service';

/**
 * Données partielles pour créer une résolution
 */
export interface ResolutionCSData {
  agId: string;
  numero: number;
  titre: string;
  description: string;
  article: string;
  type: string;
  metadata: {
    rapportCSId: string;
    typeResolution: string;
    annexes: Array<{
      id: string;
      nom: string;
      type: string;
    }>;
  };
}

/**
 * Résultat de la vérification de liaison
 */
export interface VerificationLiaison {
  peut: boolean;
  raison?: string;
}

/**
 * Service pour créer la résolution CS automatiquement
 */
export class ResolutionCSService {
  /**
   * Crée les données de résolution depuis un rapport
   */
  creerResolutionDepuisRapport(
    rapport: RapportActiviteCS,
    agId: string,
    numeroResolution: number
  ): ResolutionCSData {
    const periodeDebut = rapport.periodeDebut.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
    const periodeFin = rapport.periodeFin.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });

    return {
      agId,
      numero: numeroResolution,
      titre: `Compte rendu d'activité du Conseil Syndical - Période ${periodeDebut} à ${periodeFin}`,
      description: this.genererDescription(rapport),
      article: 'article_24',  // Vote à la majorité simple (prise d'acte)
      type: 'standard',
      metadata: {
        rapportCSId: rapport.id,
        typeResolution: 'compte_rendu_cs',
        annexes: rapport.annexes.map(a => ({
          id: a.id,
          nom: a.nom,
          type: a.type,
        })),
      },
    };
  }

  /**
   * Génère la description de la résolution
   */
  private genererDescription(rapport: RapportActiviteCS): string {
    let description = `L'assemblée générale prend acte du compte rendu d'activité du Conseil Syndical pour la période concernée.\n\n`;

    // Ajouter l'introduction si présente
    if (rapport.introduction) {
      description += rapport.introduction;
      description += '\n\n';
    }

    // Mention des annexes
    if (rapport.annexes.length > 0) {
      description += `Le rapport complet et ses ${rapport.annexes.length} annexe(s) sont joints au présent procès-verbal.`;
    } else {
      description += 'Le rapport complet est annexé au présent procès-verbal.';
    }

    return description;
  }

  /**
   * Vérifie si un rapport peut être lié à une AG
   */
  peutEtreLie(rapport: RapportActiviteCS): VerificationLiaison {
    if (rapport.statut !== 'valide' && rapport.statut !== 'publie') {
      return {
        peut: false,
        raison: 'Le rapport doit être validé avant de pouvoir être lié à une AG',
      };
    }

    if (rapport.agId) {
      return {
        peut: false,
        raison: 'Ce rapport est déjà lié à une AG',
      };
    }

    return { peut: true };
  }

  /**
   * Liste les rapports disponibles pour une AG
   */
  async listerRapportsDisponibles(coproprieteId: string): Promise<RapportActiviteCS[]> {
    const rapports = await rapportCSService.listerRapports(coproprieteId, {
      statut: 'valide',
    });

    // Filtrer ceux qui ne sont pas déjà liés à une AG
    return rapports.filter(r => !r.agId);
  }

  /**
   * Récupère le rapport lié à une résolution
   * @param resolutionId - ID de la résolution
   * @returns Le rapport ou null si non trouvé
   */
  async getRapportPourResolution(resolutionId: string): Promise<RapportActiviteCS | null> {
    // TODO: Implémenter avec Supabase
    // Rechercher le rapport qui a cette résolution liée
    return null;
  }

  /**
   * Génère le texte formaté pour le PV à partir du rapport
   */
  genererTextePourPV(rapport: RapportActiviteCS): string {
    const periodeDebut = rapport.periodeDebut.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const periodeFin = rapport.periodeFin.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let texte = `
COMPTE RENDU D'ACTIVITÉ DU CONSEIL SYNDICAL
Période du ${periodeDebut} au ${periodeFin}

Le président de séance donne lecture du rapport d'activité du Conseil Syndical.

${rapport.introduction || 'Le Conseil Syndical a exercé sa mission de contrôle et d\'assistance conformément aux dispositions légales.'}
`;

    // Ajouter les sections si présentes
    if (rapport.sections.length > 0) {
      texte += '\n\n--- POINTS DÉTAILLÉS ---\n';
      rapport.sections
        .sort((a, b) => a.ordre - b.ordre)
        .forEach(section => {
          texte += `\n${section.titre.toUpperCase()}\n`;
          texte += section.contenu || '(Aucun détail)';
          texte += '\n';
        });
    }

    // Mention des annexes
    if (rapport.annexes.length > 0) {
      texte += '\n\n--- ANNEXES ---\n';
      rapport.annexes.forEach((annexe, index) => {
        texte += `${index + 1}. ${annexe.nom}\n`;
      });
    }

    texte += `
L'assemblée générale, après en avoir délibéré, PREND ACTE du compte rendu d'activité du Conseil Syndical.

Cette résolution est adoptée à la majorité de l'article 24 de la loi du 10 juillet 1965.
`;

    return texte;
  }

  /**
   * Crée la structure de donnée pour l'annexe du rapport dans la convocation
   */
  getAnnexeConvocation(rapport: RapportActiviteCS): {
    type: string;
    titre: string;
    description: string;
  } {
    const periodeDebut = rapport.periodeDebut.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
    const periodeFin = rapport.periodeFin.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });

    return {
      type: 'rapport_cs',
      titre: `Rapport d'activité du Conseil Syndical - ${periodeDebut} à ${periodeFin}`,
      description: `Le Conseil Syndical présente le bilan de ses activités pour la période concernée. Ce rapport sera soumis à l'approbation de l'assemblée générale.`,
    };
  }
}

// Export singleton
export const resolutionCSService = new ResolutionCSService();
