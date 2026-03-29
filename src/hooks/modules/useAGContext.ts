/**
 * Hook useAGContext - Contexte dynamique pour les Assemblées Générales
 *
 * @description Fournit un contexte intelligent basé sur l'état actuel des AG
 *              et génère des actions recommandées contextuelles.
 *
 * @created 2026-01-19 (Bug #75)
 */

import {
  getProchaineAssemblee,
  getAssembleesPassees,
  type AssembleeGenerale,
} from '@/lib/mock-data';
import type { LucideIcon } from 'lucide-react';
import {
  Plus,
  Send,
  FileText,
  Users,
  ClipboardList,
  Archive,
  Download,
  Eye,
  Edit,
  Play,
  CheckCircle,
  AlertTriangle,
  Vote,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type AGContextState =
  | 'no_ag_planned'    // Aucune AG planifiée
  | 'ag_preparation'   // AG en préparation (> 45j avant)
  | 'ag_convocation'   // Phase de convocation (15-45j avant)
  | 'ag_imminente'     // AG imminente (< 15j)
  | 'ag_jour_j'        // Jour de l'AG
  | 'ag_post'          // Après AG, PV à rédiger (< 30j après)
  | 'ag_archive';      // AG terminée, PV diffusé

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  priority: 'high' | 'medium' | 'low';
  variant?: 'default' | 'primary' | 'warning' | 'success';
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface AGAlert {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
}

export interface AGContextInfo {
  state: AGContextState;
  stateLabel: string;
  prochaineAG: AssembleeGenerale | null;
  derniereAG: AssembleeGenerale | null;
  joursAvantProchaine: number | null;
  joursApresDerniere: number | null;
  alertes: AGAlert[];
  actionsRecommandees: QuickAction[];
}

// ============================================
// HELPERS
// ============================================

function differenceInDays(date1: Date, date2: Date): number {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDateFR(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================
// DETERMINE STATE
// ============================================

function determineAGState(
  prochaineAG: AssembleeGenerale | null,
  derniereAG: AssembleeGenerale | null,
  joursAvant: number | null,
  joursApres: number | null
): AGContextState {
  // Jour J
  if (prochaineAG && joursAvant === 0) {
    return 'ag_jour_j';
  }

  // AG imminente (< 15 jours)
  if (prochaineAG && joursAvant !== null && joursAvant > 0 && joursAvant <= 15) {
    return 'ag_imminente';
  }

  // Phase convocation (15-45 jours)
  if (prochaineAG && joursAvant !== null && joursAvant > 15 && joursAvant <= 45) {
    return 'ag_convocation';
  }

  // AG en préparation (> 45 jours)
  if (prochaineAG && joursAvant !== null && joursAvant > 45) {
    return 'ag_preparation';
  }

  // Post-AG (PV à rédiger)
  if (!prochaineAG && derniereAG && joursApres !== null && joursApres <= 30) {
    const pvDiffuse = derniereAG.statut === 'pv_diffuse';
    if (!pvDiffuse) {
      return 'ag_post';
    }
  }

  // Aucune AG planifiée
  if (!prochaineAG) {
    return 'no_ag_planned';
  }

  return 'ag_archive';
}

function getStateLabel(state: AGContextState, joursAvant: number | null): string {
  switch (state) {
    case 'no_ag_planned':
      return 'Aucune AG planifiée';
    case 'ag_preparation':
      return 'Préparation de l\'AG';
    case 'ag_convocation':
      return 'Phase de convocation';
    case 'ag_imminente':
      return joursAvant === 1 ? 'AG demain' : `AG dans ${joursAvant} jours`;
    case 'ag_jour_j':
      return 'AG aujourd\'hui';
    case 'ag_post':
      return 'PV à rédiger';
    case 'ag_archive':
      return 'Actions rapides';
    default:
      return 'Actions rapides';
  }
}

// ============================================
// GENERATE ALERTS
// ============================================

function generateAlertes(
  state: AGContextState,
  prochaineAG: AssembleeGenerale | null,
  derniereAG: AssembleeGenerale | null,
  joursAvant: number | null,
  joursApres: number | null
): AGAlert[] {
  const alertes: AGAlert[] = [];

  // Alerte AG imminente
  if (state === 'ag_imminente' && joursAvant !== null) {
    alertes.push({
      type: 'warning',
      title: `AG dans ${joursAvant} jour${joursAvant > 1 ? 's' : ''}`,
      message: 'Vérifiez que les convocations ont été envoyées et les pouvoirs collectés.',
      action: {
        label: 'Voir les détails',
        href: `/ag/${prochaineAG?.id}`,
      },
    });
  }

  // Alerte Jour J
  if (state === 'ag_jour_j') {
    alertes.push({
      type: 'info',
      title: 'AG aujourd\'hui',
      message: `L'Assemblée Générale se tient aujourd'hui à ${prochaineAG?.heure_debut || '18h00'}.`,
      action: {
        label: 'Démarrer la session',
        href: `/ag/${prochaineAG?.id}/session`,
      },
    });
  }

  // Alerte PV à rédiger
  if (state === 'ag_post' && joursApres !== null) {
    const joursRestants = 30 - joursApres;
    alertes.push({
      type: joursRestants <= 7 ? 'error' : 'warning',
      title: 'Procès-verbal à rédiger',
      message: `Le PV doit être diffusé sous 30 jours. Il reste ${joursRestants} jour${joursRestants > 1 ? 's' : ''}.`,
      action: {
        label: 'Rédiger le PV',
        href: `/ag/${derniereAG?.id}/pv`,
      },
    });
  }

  // Alerte aucune AG planifiée (si dernière AG > 10 mois)
  if (state === 'no_ag_planned' && derniereAG && joursApres !== null && joursApres > 300) {
    alertes.push({
      type: 'error',
      title: 'AG annuelle en retard',
      message: `La dernière AG date de ${Math.floor(joursApres / 30)} mois. Une AG doit être convoquée.`,
      action: {
        label: 'Planifier une AG',
        href: '/ag/new',
      },
    });
  }

  return alertes;
}

// ============================================
// GENERATE QUICK ACTIONS
// ============================================

function generateQuickActions(
  state: AGContextState,
  prochaineAG: AssembleeGenerale | null,
  derniereAG: AssembleeGenerale | null
): QuickAction[] {
  switch (state) {
    // ═══════════════════════════════════════════
    // AUCUNE AG PLANIFIÉE
    // ═══════════════════════════════════════════
    case 'no_ag_planned':
      return [
        {
          id: 'planifier_ag',
          label: 'Planifier la prochaine AG',
          description: 'Créer une nouvelle Assemblée Générale',
          icon: Plus,
          href: '/ag/new',
          priority: 'high',
          variant: 'primary',
        },
        {
          id: 'consulter_historique',
          label: 'Consulter l\'historique',
          description: 'Voir les AG passées et leurs décisions',
          icon: Archive,
          href: '/ag/historique',
          priority: 'medium',
        },
        {
          id: 'bibliotheque_resolutions',
          label: 'Bibliothèque de résolutions',
          description: 'Modèles de résolutions types',
          icon: FileText,
          href: '/ag/resolutions',
          priority: 'low',
        },
      ];

    // ═══════════════════════════════════════════
    // AG EN PRÉPARATION (> 45 jours)
    // ═══════════════════════════════════════════
    case 'ag_preparation':
      return [
        {
          id: 'ordre_du_jour',
          label: 'Préparer l\'ordre du jour',
          description: `AG du ${formatDateFR(prochaineAG!.date_ag)}`,
          icon: ClipboardList,
          href: `/ag/${prochaineAG!.id}/agenda`,
          priority: 'high',
          variant: 'primary',
        },
        {
          id: 'ajouter_resolution',
          label: 'Ajouter des résolutions',
          description: 'Compléter l\'ordre du jour',
          icon: Plus,
          href: `/ag/${prochaineAG!.id}/resolutions`,
          priority: 'high',
        },
        {
          id: 'gestion_questions',
          label: 'Questions des copropriétaires',
          description: 'Gérer les questions reçues',
          icon: Users,
          href: `/ag/${prochaineAG!.id}/questions`,
          priority: 'medium',
        },
        {
          id: 'bibliotheque',
          label: 'Bibliothèque de résolutions',
          icon: FileText,
          href: '/ag/resolutions',
          priority: 'low',
        },
      ];

    // ═══════════════════════════════════════════
    // PHASE CONVOCATION (15-45 jours)
    // ═══════════════════════════════════════════
    case 'ag_convocation': {
      const convocationEnvoyee = prochaineAG?.statut === 'convoquee';
      return [
        {
          id: 'envoyer_convocations',
          label: convocationEnvoyee ? 'Convocations envoyées' : 'Envoyer les convocations',
          description: convocationEnvoyee ? 'Déjà envoyées' : '21 jours minimum avant l\'AG',
          icon: convocationEnvoyee ? CheckCircle : Send,
          href: `/ag/${prochaineAG!.id}/convocation`,
          priority: 'high',
          variant: convocationEnvoyee ? 'success' : 'warning',
          badge: !convocationEnvoyee ? 'À faire' : undefined,
        },
        {
          id: 'finaliser_ordre_jour',
          label: 'Finaliser l\'ordre du jour',
          icon: ClipboardList,
          href: `/ag/${prochaineAG!.id}/agenda`,
          priority: 'high',
        },
        {
          id: 'gestion_pouvoirs',
          label: 'Gérer les pouvoirs',
          description: 'Procurations et mandats',
          icon: Users,
          href: `/ag/${prochaineAG!.id}/pouvoirs`,
          priority: 'medium',
        },
        {
          id: 'preparer_feuille_presence',
          label: 'Préparer la feuille de présence',
          icon: FileText,
          href: `/ag/${prochaineAG!.id}/presence`,
          priority: 'medium',
        },
      ];
    }

    // ═══════════════════════════════════════════
    // AG IMMINENTE (< 15 jours)
    // ═══════════════════════════════════════════
    case 'ag_imminente':
      return [
        {
          id: 'verifier_pouvoirs',
          label: 'Vérifier les pouvoirs',
          description: 'Valider les procurations reçues',
          icon: Users,
          href: `/ag/${prochaineAG!.id}/pouvoirs`,
          priority: 'high',
          variant: 'primary',
        },
        {
          id: 'feuille_presence',
          label: 'Imprimer feuille de présence',
          icon: FileText,
          href: `/ag/${prochaineAG!.id}/presence`,
          priority: 'high',
        },
        {
          id: 'rappel_convocation',
          label: 'Envoyer un rappel',
          description: 'Rappeler la date aux copropriétaires',
          icon: Send,
          href: `/ag/${prochaineAG!.id}/rappel`,
          priority: 'medium',
        },
        {
          id: 'preparer_vote',
          label: 'Préparer le système de vote',
          icon: Vote,
          href: `/ag/${prochaineAG!.id}/vote`,
          priority: 'medium',
        },
      ];

    // ═══════════════════════════════════════════
    // JOUR J - AG EN COURS
    // ═══════════════════════════════════════════
    case 'ag_jour_j':
      return [
        {
          id: 'demarrer_session',
          label: 'Démarrer la session',
          description: 'Ouvrir l\'AG et enregistrer les présences',
          icon: Play,
          href: `/ag/${prochaineAG!.id}/session`,
          priority: 'high',
          variant: 'primary',
        },
        {
          id: 'enregistrer_presences',
          label: 'Enregistrer les présences',
          icon: Users,
          href: `/ag/${prochaineAG!.id}/presence`,
          priority: 'high',
        },
        {
          id: 'enregistrer_votes',
          label: 'Enregistrer les votes',
          icon: Vote,
          href: `/ag/${prochaineAG!.id}/vote`,
          priority: 'high',
        },
        {
          id: 'consulter_ordre_jour',
          label: 'Consulter l\'ordre du jour',
          icon: ClipboardList,
          href: `/ag/${prochaineAG!.id}/agenda`,
          priority: 'medium',
        },
      ];

    // ═══════════════════════════════════════════
    // POST-AG (PV à rédiger)
    // ═══════════════════════════════════════════
    case 'ag_post':
      return [
        {
          id: 'rediger_pv',
          label: 'Rédiger le procès-verbal',
          description: `AG du ${formatDateFR(derniereAG!.date_ag)}`,
          icon: Edit,
          href: `/ag/${derniereAG!.id}/pv`,
          priority: 'high',
          variant: 'warning',
          badge: 'À faire',
        },
        {
          id: 'saisir_resultats',
          label: 'Saisir les résultats des votes',
          icon: Vote,
          href: `/ag/${derniereAG!.id}/resultats`,
          priority: 'high',
        },
        {
          id: 'diffuser_pv',
          label: 'Diffuser le PV',
          description: 'Envoyer aux copropriétaires',
          icon: Send,
          href: `/ag/${derniereAG!.id}/diffusion`,
          priority: 'medium',
          disabled: true,
          disabledReason: 'Rédigez d\'abord le PV',
        },
        {
          id: 'planifier_prochaine',
          label: 'Planifier la prochaine AG',
          icon: Plus,
          href: '/ag/new',
          priority: 'low',
        },
      ];

    // ═══════════════════════════════════════════
    // ARCHIVE (tout est fait)
    // ═══════════════════════════════════════════
    case 'ag_archive':
    default:
      return [
        {
          id: 'planifier_ag',
          label: 'Planifier la prochaine AG',
          icon: Plus,
          href: '/ag/new',
          priority: 'high',
          variant: 'primary',
        },
        {
          id: 'consulter_historique',
          label: 'Consulter l\'historique',
          icon: Archive,
          href: '/ag/historique',
          priority: 'medium',
        },
        {
          id: 'telecharger_pv',
          label: 'Télécharger les PV',
          icon: Download,
          href: '/ag/export',
          priority: 'low',
        },
      ];
  }
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useAGContext(): AGContextInfo {
  const now = new Date();
  const prochaineAG = getProchaineAssemblee() || null;
  const agPassees = getAssembleesPassees();
  const derniereAG = agPassees[0] || null;

  // Calcul des jours
  const joursAvantProchaine = prochaineAG
    ? differenceInDays(new Date(prochaineAG.date_ag), now)
    : null;

  const joursApresDerniere = derniereAG
    ? differenceInDays(now, new Date(derniereAG.date_ag))
    : null;

  // Déterminer l'état
  const state = determineAGState(
    prochaineAG,
    derniereAG,
    joursAvantProchaine,
    joursApresDerniere
  );

  // Label de l'état
  const stateLabel = getStateLabel(state, joursAvantProchaine);

  // Générer alertes
  const alertes = generateAlertes(
    state,
    prochaineAG,
    derniereAG,
    joursAvantProchaine,
    joursApresDerniere
  );

  // Générer actions recommandées
  const actionsRecommandees = generateQuickActions(state, prochaineAG, derniereAG);

  return {
    state,
    stateLabel,
    prochaineAG,
    derniereAG,
    joursAvantProchaine,
    joursApresDerniere,
    alertes,
    actionsRecommandees,
  };
}
