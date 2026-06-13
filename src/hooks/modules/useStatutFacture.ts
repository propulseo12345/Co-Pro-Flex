'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  StatutFacture,
  TransitionStatut,
  HistoriqueStatut,
} from '@/components/features/finance/Factures/types';
import {
  STATUTS_FACTURE,
  getTransitionsAutorisees,
  estTransitionAutorisee,
  getProgression,
} from '@/components/features/finance/Factures/utils';

interface UseStatutFactureOptions {
  /** ID de la facture */
  factureId: string;
  /** Statut actuel de la facture */
  statutInitial: StatutFacture;
  /** Callback après changement réussi */
  onChangement?: (nouveauStatut: StatutFacture) => void;
  /** Inclure les transitions d'annulation */
  afficherAnnulations?: boolean;
}

interface UseStatutFactureReturn {
  /** Statut actuel */
  statut: StatutFacture;
  /** Configuration du statut actuel */
  config: typeof STATUTS_FACTURE[StatutFacture];
  /** Transitions autorisées depuis le statut actuel */
  transitionsAutorisees: TransitionStatut[];
  /** Historique des changements */
  historique: HistoriqueStatut[];
  /** État de chargement */
  isLoading: boolean;
  /** Erreur éventuelle */
  erreur: string | null;
  /** Progression dans le workflow (0-100) */
  progression: number;
  /** Change le statut */
  changerStatut: (nouveauStatut: StatutFacture, motif?: string) => Promise<boolean>;
  /** Vérifie si une transition est possible */
  peutTransitionnerVers: (vers: StatutFacture) => boolean;
  /** Recharge l'historique */
  rechargerHistorique: () => Promise<void>;
  /** Réinitialise l'erreur */
  clearErreur: () => void;
}

/**
 * Hook de gestion du statut d'une facture
 * Gère les transitions, validations et historique
 */
export function useStatutFacture({
  factureId,
  statutInitial,
  onChangement,
  afficherAnnulations = false,
}: UseStatutFactureOptions): UseStatutFactureReturn {
  const [statut, setStatut] = useState<StatutFacture>(statutInitial);
  const [historique, setHistorique] = useState<HistoriqueStatut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Configuration du statut actuel
  const config = useMemo(() => STATUTS_FACTURE[statut], [statut]);

  // Transitions autorisées
  const transitionsAutorisees = useMemo(
    () => getTransitionsAutorisees(statut, afficherAnnulations),
    [statut, afficherAnnulations]
  );

  // Progression dans le workflow
  const progression = useMemo(() => getProgression(statut), [statut]);

  // Vérifie si une transition est possible
  const peutTransitionnerVers = useCallback(
    (vers: StatutFacture): boolean => {
      return transitionsAutorisees.some((t) => t.vers === vers);
    },
    [transitionsAutorisees]
  );

  // Change le statut
  const changerStatut = useCallback(
    async (nouveauStatut: StatutFacture, motif?: string): Promise<boolean> => {
      // Vérification rapide côté client
      if (!peutTransitionnerVers(nouveauStatut)) {
        setErreur("Cette transition n'est pas autorisée");
        return false;
      }

      setIsLoading(true);
      setErreur(null);

      try {
        // Vérifier que la transition est autorisée
        const { autorisee, transition, raison } = estTransitionAutorisee(statut, nouveauStatut);

        if (!autorisee || !transition) {
          setErreur(raison || 'Transition non autorisée');
          return false;
        }

        // Simuler un délai réseau (à remplacer par l'appel API réel)
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Créer l'entrée d'historique
        const historiqueEntry: HistoriqueStatut = {
          id: `hist-${Date.now()}`,
          factureId,
          statutPrecedent: statut,
          nouveauStatut,
          dateChangement: new Date(),
          utilisateurId: 'user-mock',
          utilisateurNom: 'Utilisateur Test',
          motif,
          estAnnulation: transition.estAnnulation,
        };

        // Mise à jour de l'état local
        setStatut(nouveauStatut);
        setHistorique((prev) => [historiqueEntry, ...prev]);

        // Callback parent
        onChangement?.(nouveauStatut);

        return true;
      } catch {
        const message = 'Une erreur inattendue est survenue';
        setErreur(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [factureId, statut, peutTransitionnerVers, onChangement]
  );

  // Recharge l'historique
  const rechargerHistorique = useCallback(async () => {
    // À implémenter avec Supabase
    // Pour l'instant, l'historique est géré localement
  }, []);

  // Réinitialise l'erreur
  const clearErreur = useCallback(() => {
    setErreur(null);
  }, []);

  return {
    statut,
    config,
    transitionsAutorisees,
    historique,
    isLoading,
    erreur,
    progression,
    changerStatut,
    peutTransitionnerVers,
    rechargerHistorique,
    clearErreur,
  };
}
