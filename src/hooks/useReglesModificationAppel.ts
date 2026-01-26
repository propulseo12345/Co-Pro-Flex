import { useMemo } from 'react';
import type {
  AppelFonds,
  AppelFondsAvecGeneration,
  ReglesModification,
} from '@/components/features/finance/AppelsFonds/types';
import { reglesModificationAppelService } from '@/lib/services/regles-modification-appel.service';

interface UseReglesModificationAppelReturn {
  /** Règles complètes de modification */
  regles: ReglesModification;
  /** L'appel peut-il être modifié ? */
  estModifiable: boolean;
  /** L'appel est-il généré (émis) ? */
  estGenere: boolean;
  /** Message explicatif si verrouillé */
  messageVerrouillage: string | null;
  /** Peut-on modifier l'appel ? */
  peutModifier: boolean;
  /** Peut-on supprimer l'appel ? */
  peutSupprimer: boolean;
  /** Peut-on générer/émettre l'appel ? */
  peutGenerer: boolean;
  /** Peut-on suivre les envois ? */
  peutSuivre: boolean;
  /** Peut-on envoyer des relances ? */
  peutRelancer: boolean;
  /** Peut-on annuler l'appel ? */
  peutAnnuler: boolean;
  /** Vérifie si un champ spécifique est éditable */
  champEditable: (nomChamp: string) => boolean;
}

/**
 * Hook pour gérer les règles de modification d'un appel de fonds
 *
 * @param appel - L'appel de fonds à vérifier (peut être null)
 * @returns Les règles et permissions de modification
 *
 * @example
 * ```tsx
 * const { estModifiable, peutModifier, messageVerrouillage } = useReglesModificationAppel(appel);
 *
 * if (!estModifiable) {
 *   return <BandeauVerrouillage message={messageVerrouillage} />;
 * }
 * ```
 */
export function useReglesModificationAppel(
  appel: AppelFonds | AppelFondsAvecGeneration | null
): UseReglesModificationAppelReturn {
  return useMemo(() => {
    // État par défaut si pas d'appel
    if (!appel) {
      return {
        regles: {
          estModifiable: false,
          champsEditables: [],
          actionsAutorisees: [],
        },
        estModifiable: false,
        estGenere: false,
        messageVerrouillage: null,
        peutModifier: false,
        peutSupprimer: false,
        peutGenerer: false,
        peutSuivre: false,
        peutRelancer: false,
        peutAnnuler: false,
        champEditable: () => false,
      };
    }

    const regles = reglesModificationAppelService.getRegles(appel);
    const statutGeneration = reglesModificationAppelService.getStatutGeneration(appel);

    return {
      regles,
      estModifiable: regles.estModifiable,
      estGenere: statutGeneration === 'genere',
      messageVerrouillage: reglesModificationAppelService.getMessageVerrouillage(appel),
      peutModifier: regles.actionsAutorisees.includes('modifier'),
      peutSupprimer: regles.actionsAutorisees.includes('supprimer'),
      peutGenerer: regles.actionsAutorisees.includes('generer'),
      peutSuivre: regles.actionsAutorisees.includes('suivre'),
      peutRelancer: regles.actionsAutorisees.includes('relancer'),
      peutAnnuler: regles.actionsAutorisees.includes('annuler'),
      champEditable: (nomChamp: string) => regles.champsEditables.includes(nomChamp),
    };
  }, [appel]);
}
