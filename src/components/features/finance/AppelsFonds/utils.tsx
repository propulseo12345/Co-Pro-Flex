import {
  Clock,
  Edit,
  CheckCircle,
  Globe,
  Mail,
  Printer,
  AlertCircle,
  X,
  Package,
  Send
} from 'lucide-react';
import type {
  StatutAppel,
  ModeEnvoi,
  TypeAppel,
  StatutPaiement,
  StatutRecommande,
  RecommandeDetail,
  AppelFonds,
  CalendrierAppel,
  AlerteDelai,
  NiveauAlerte,
  StatsAlertes
} from './types';
import { DELAIS_OPTIMAUX } from './types';
import { peutEmettreAppel, AppelFondsStatut } from '@/types/enums/statuts';
import styles from './appels-fonds.module.css';

/**
 * @deprecated Utiliser StatutAppelBadge à la place
 */
export const getStatutBadgeClass = (statut: StatutAppel | string): string => {
  switch (statut) {
    case 'A_GENERER':
    case 'EN_ATTENTE':
      return styles.statutAGenerer;
    case 'EN_PREPARATION':
    case 'BROUILLON':
      return styles.statutEnPreparation;
    case 'ENVOYE':
    case 'EMIS':
      return styles.statutEnvoye;
    case 'PARTIELLEMENT_PAYE':
      return styles.statutEnvoye;
    case 'SOLDE':
      return styles.statutEnvoye;
    case 'ANNULE':
      return styles.statutEnPreparation;
    default:
      return styles.statutEnPreparation;
  }
};

/**
 * @deprecated Utiliser StatutAppelBadge à la place
 */
export const getStatutIcon = (statut: StatutAppel | string) => {
  switch (statut) {
    case 'A_GENERER':
    case 'EN_ATTENTE':
      return <Clock size={14} aria-hidden="true" />;
    case 'EN_PREPARATION':
    case 'BROUILLON':
      return <Edit size={14} aria-hidden="true" />;
    case 'ENVOYE':
    case 'EMIS':
    case 'SOLDE':
      return <CheckCircle size={14} aria-hidden="true" />;
    default:
      return <Clock size={14} aria-hidden="true" />;
  }
};

/**
 * @deprecated Utiliser StatutAppelBadge à la place
 */
export const getStatutLabel = (statut: StatutAppel | string): string => {
  switch (statut) {
    case 'A_GENERER':
      return 'À générer';
    case 'EN_ATTENTE':
      return 'À émettre';
    case 'EN_PREPARATION':
    case 'BROUILLON':
      return 'Brouillon';
    case 'ENVOYE':
    case 'EMIS':
      return 'Émis';
    case 'PARTIELLEMENT_PAYE':
      return 'Partiel';
    case 'SOLDE':
      return 'Soldé';
    case 'ANNULE':
      return 'Annulé';
    default:
      return String(statut);
  }
};

export const getModeEnvoiIcon = (mode: ModeEnvoi) => {
  switch (mode) {
    case 'electronique':
      return <Globe size={16} aria-hidden="true" />;
    case 'email':
      return <Mail size={16} aria-hidden="true" />;
    case 'courrier':
      return <Printer size={16} aria-hidden="true" />;
  }
};

export const getModeEnvoiLabel = (mode: ModeEnvoi): string => {
  switch (mode) {
    case 'electronique':
      return 'Électronique';
    case 'email':
      return 'Email';
    case 'courrier':
      return 'Courrier';
  }
};

export const getTypeAppelLabel = (type: TypeAppel): string => {
  switch (type) {
    case 'fonctionnement':
      return 'Fonctionnement';
    case 'travaux':
      return 'Travaux';
  }
};

export const getTypeAppelClass = (type: TypeAppel): string => {
  switch (type) {
    case 'fonctionnement':
      return styles.typeFonctionnement;
    case 'travaux':
      return styles.typeTravaux;
  }
};

export const formatDateRecommande = (recommande: RecommandeDetail): string => {
  const parts = [];
  if (recommande.dateEnvoi) {
    parts.push(`Envoyé le ${new Date(recommande.dateEnvoi).toLocaleDateString('fr-FR')}`);
  }
  if (recommande.dateLivraison) {
    parts.push(`Livré le ${new Date(recommande.dateLivraison).toLocaleDateString('fr-FR')}`);
  }
  if (recommande.dateLecture) {
    parts.push(`Lu le ${new Date(recommande.dateLecture).toLocaleDateString('fr-FR')}`);
  }
  return parts.join('\n');
};

export const getStatutPaiementBadge = (statut: StatutPaiement) => {
  switch (statut) {
    case 'PAYE':
      return <span className={styles.badgePayePaye}><CheckCircle size={14} aria-hidden="true" /> Payé</span>;
    case 'PARTIELLEMENT_PAYE':
      return <span className={styles.badgePayePartiel}><AlertCircle size={14} aria-hidden="true" /> Partiel</span>;
    case 'NON_PAYE':
      return <span className={styles.badgePayeNon}><X size={14} aria-hidden="true" /> Non payé</span>;
  }
};

export const getStatutRecommandeBadge = (statut: StatutRecommande) => {
  switch (statut) {
    case 'LU':
      return <span className={styles.badgeRecomLu}><CheckCircle size={14} aria-hidden="true" /> Lu</span>;
    case 'LIVRE':
      return <span className={styles.badgeRecomLivre}><Package size={14} aria-hidden="true" /> Livré</span>;
    case 'ENVOYE':
      return <span className={styles.badgeRecomEnvoye}><Send size={14} aria-hidden="true" /> Envoyé</span>;
    case 'PREPARE':
      return <span className={styles.badgeRecomPrepare}><Clock size={14} aria-hidden="true" /> Préparé</span>;
    case 'NON_ENVOYE':
      return <span className={styles.badgeRecomNon}><AlertCircle size={14} aria-hidden="true" /> Non envoyé</span>;
  }
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('fr-FR');
};

export const getDefaultNewAppelForm = () => ({
  description: '',
  periode: '',
  dateExigibilite: '',
  dateEmission: new Date().toISOString().split('T')[0],
  dateLimiteReglement: '',
  type: 'fonctionnement' as TypeAppel,
  montantTotal: '',
  budgetTravauxId: '',
  projetNom: '',
  cleRepartitionId: ''
});

/**
 * Vérifie si un appel de fonds peut être émis
 * Délègue à la fonction centrale peutEmettreAppel de statuts.ts
 * Supporte aussi les anciens statuts legacy pour compatibilité
 */
export const peutEmettreAppelFonds = (statut: string): boolean => {
  // Mapper les anciens statuts vers EN_ATTENTE
  const statutNormalise = statut === 'A_GENERER' || statut === 'EN_PREPARATION'
    ? AppelFondsStatut.EN_ATTENTE
    : statut;

  return peutEmettreAppel(statutNormalise);
};

// === UTILITAIRES CALENDRIER OPTIMAL ===

/**
 * Calcule le nombre de jours entre deux dates
 */
export const calculerJoursEntre = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calcule une date à J-N d'une date d'échéance
 */
export const calculerDateJMoins = (dateEcheance: string, joursAvant: number): string => {
  const date = new Date(dateEcheance);
  date.setDate(date.getDate() - joursAvant);
  return date.toISOString().split('T')[0];
};

/**
 * Génère le calendrier optimal pour un appel de fonds
 */
export const genererCalendrierOptimal = (appel: AppelFonds): CalendrierAppel => {
  const dateEcheance = appel.dateExigibilite;

  return {
    appelId: appel.id,
    dateEcheance,
    dates: {
      generationOptimale: calculerDateJMoins(dateEcheance, DELAIS_OPTIMAUX.GENERATION),
      envoiOptimal: calculerDateJMoins(dateEcheance, DELAIS_OPTIMAUX.ENVOI),
      relance1: calculerDateJMoins(dateEcheance, DELAIS_OPTIMAUX.RELANCE_1),
      relance2: calculerDateJMoins(dateEcheance, DELAIS_OPTIMAUX.RELANCE_2),
    },
    statuts: {
      generationFaite: appel.statut !== 'A_GENERER',
      dateGeneration: appel.dateEmission,
      envoiFait: appel.statut === 'ENVOYE' || appel.statut === 'EMIS',
      dateEnvoi: appel.statut === 'ENVOYE' || appel.statut === 'EMIS' ? appel.dateEmission : undefined,
      relance1Faite: false,
      relance2Faite: false,
    },
    alertes: [],
  };
};

/**
 * Calcule les alertes pour un appel de fonds
 */
export const calculerAlertesAppel = (appel: AppelFonds): AlerteDelai[] => {
  const alertes: AlerteDelai[] = [];
  const aujourdhui = new Date().toISOString().split('T')[0];
  const joursRestants = calculerJoursEntre(aujourdhui, appel.dateExigibilite);

  // Si l'appel est déjà soldé ou annulé, pas d'alertes
  if (appel.statut === 'SOLDE' || appel.statut === 'ANNULE') {
    return alertes;
  }

  // Alerte : Génération en retard (appel non généré alors qu'on est après J-45)
  if (appel.statut === 'A_GENERER') {
    const dateGenerationOptimale = calculerDateJMoins(appel.dateExigibilite, DELAIS_OPTIMAUX.GENERATION);
    if (aujourdhui > dateGenerationOptimale) {
      const joursRetard = calculerJoursEntre(dateGenerationOptimale, aujourdhui);
      alertes.push({
        id: `${appel.id}-gen-retard`,
        appelId: appel.id,
        appelDescription: appel.description,
        type: 'GENERATION_EN_RETARD',
        niveau: joursRestants < DELAIS_OPTIMAUX.DELAI_MINIMUM ? 'critical' : 'warning',
        message: `Appel non généré - ${joursRetard} jour(s) de retard sur le planning optimal`,
        dateEcheance: appel.dateExigibilite,
        joursRestants,
        action: {
          label: 'Générer maintenant',
          handler: 'handleGenererAppel',
        },
      });
    }
  }

  // Alerte : Délai insuffisant (< 30 jours entre émission et échéance)
  if (appel.dateEmission) {
    const delaiEffectif = calculerJoursEntre(appel.dateEmission, appel.dateExigibilite);
    if (delaiEffectif < DELAIS_OPTIMAUX.DELAI_MINIMUM) {
      alertes.push({
        id: `${appel.id}-delai-insuf`,
        appelId: appel.id,
        appelDescription: appel.description,
        type: 'DELAI_INSUFFISANT',
        niveau: delaiEffectif < DELAIS_OPTIMAUX.DELAI_CRITIQUE ? 'critical' : 'warning',
        message: `Délai de paiement insuffisant : ${delaiEffectif} jours (recommandé : ${DELAIS_OPTIMAUX.DELAI_MINIMUM} jours min.)`,
        dateEcheance: appel.dateExigibilite,
        joursRestants,
      });
    }
  }

  // Alerte : Envoi en retard (généré mais pas encore envoyé)
  if ((appel.statut === 'EN_PREPARATION' || appel.statut === 'BROUILLON') && appel.dateEmission) {
    const dateEnvoiOptimal = calculerDateJMoins(appel.dateExigibilite, DELAIS_OPTIMAUX.ENVOI);
    if (aujourdhui > dateEnvoiOptimal) {
      alertes.push({
        id: `${appel.id}-envoi-retard`,
        appelId: appel.id,
        appelDescription: appel.description,
        type: 'ENVOI_EN_RETARD',
        niveau: joursRestants < DELAIS_OPTIMAUX.DELAI_MINIMUM ? 'critical' : 'warning',
        message: `Appel généré mais non envoyé - Envoi recommandé depuis le ${formatDate(dateEnvoiOptimal)}`,
        dateEcheance: appel.dateExigibilite,
        joursRestants,
        action: {
          label: 'Envoyer maintenant',
          handler: 'handleEnvoyerAppel',
        },
      });
    }
  }

  // Alerte : Relance 1 (J-15)
  if ((appel.statut === 'ENVOYE' || appel.statut === 'EMIS') && joursRestants <= DELAIS_OPTIMAUX.RELANCE_1 && joursRestants > DELAIS_OPTIMAUX.RELANCE_2) {
    const montantRestant = appel.montantTotal - (appel.montantEncaisse || 0);
    if (montantRestant > 0) {
      alertes.push({
        id: `${appel.id}-relance1`,
        appelId: appel.id,
        appelDescription: appel.description,
        type: 'RELANCE_1_DUE',
        niveau: 'warning',
        message: `1ère relance recommandée - ${formatCurrency(montantRestant)} restant à encaisser`,
        dateEcheance: appel.dateExigibilite,
        joursRestants,
        action: {
          label: 'Envoyer relance',
          handler: 'handleRelancerAppel',
        },
      });
    }
  }

  // Alerte : Relance 2 (J-5)
  if ((appel.statut === 'ENVOYE' || appel.statut === 'EMIS') && joursRestants <= DELAIS_OPTIMAUX.RELANCE_2 && joursRestants > 0) {
    const montantRestant = appel.montantTotal - (appel.montantEncaisse || 0);
    if (montantRestant > 0) {
      alertes.push({
        id: `${appel.id}-relance2`,
        appelId: appel.id,
        appelDescription: appel.description,
        type: 'RELANCE_2_DUE',
        niveau: 'critical',
        message: `Relance URGENTE - ${formatCurrency(montantRestant)} restant à ${joursRestants} jour(s) de l'échéance`,
        dateEcheance: appel.dateExigibilite,
        joursRestants,
        action: {
          label: 'Envoyer relance urgente',
          handler: 'handleRelancerAppel',
        },
      });
    }
  }

  // Alerte : Échéance imminente (< 7 jours)
  if (joursRestants <= 7 && joursRestants > 0 && appel.statut !== 'SOLDE') {
    const montantRestant = appel.montantTotal - (appel.montantEncaisse || 0);
    if (montantRestant > 0) {
      alertes.push({
        id: `${appel.id}-echeance-imminente`,
        appelId: appel.id,
        appelDescription: appel.description,
        type: 'ECHEANCE_IMMINENTE',
        niveau: 'critical',
        message: `Échéance dans ${joursRestants} jour(s) - ${formatCurrency(montantRestant)} non encaissé`,
        dateEcheance: appel.dateExigibilite,
        joursRestants,
      });
    }
  }

  return alertes;
};

/**
 * Calcule toutes les alertes pour une liste d'appels
 */
export const calculerToutesAlertes = (appels: AppelFonds[]): AlerteDelai[] => {
  return appels
    .flatMap(appel => calculerAlertesAppel(appel))
    .sort((a, b) => {
      // Trier par niveau (critical > warning > info) puis par jours restants
      const niveauOrder: Record<NiveauAlerte, number> = { critical: 0, warning: 1, info: 2 };
      if (niveauOrder[a.niveau] !== niveauOrder[b.niveau]) {
        return niveauOrder[a.niveau] - niveauOrder[b.niveau];
      }
      return a.joursRestants - b.joursRestants;
    });
};

/**
 * Calcule les statistiques des alertes
 */
export const calculerStatsAlertes = (alertes: AlerteDelai[]): StatsAlertes => {
  return {
    total: alertes.length,
    critiques: alertes.filter(a => a.niveau === 'critical').length,
    warnings: alertes.filter(a => a.niveau === 'warning').length,
    infos: alertes.filter(a => a.niveau === 'info').length,
  };
};

/**
 * Vérifie si un appel nécessite une attention urgente
 */
export const appelNecessiteAttention = (appel: AppelFonds): boolean => {
  const alertes = calculerAlertesAppel(appel);
  return alertes.some(a => a.niveau === 'critical' || a.niveau === 'warning');
};

/**
 * Génère les dates suggérées pour un nouvel appel à partir d'une échéance
 */
export const genererDatesSuggerees = (dateEcheance: string): {
  dateGenerationSuggeree: string;
  dateEnvoiSuggeree: string;
  delaiOptimalRespectable: boolean;
  messageAlerte?: string;
} => {
  const aujourdhui = new Date().toISOString().split('T')[0];
  const dateGenerationOptimale = calculerDateJMoins(dateEcheance, DELAIS_OPTIMAUX.GENERATION);
  const dateEnvoiOptimale = calculerDateJMoins(dateEcheance, DELAIS_OPTIMAUX.ENVOI);
  const joursRestants = calculerJoursEntre(aujourdhui, dateEcheance);

  // Si on a assez de temps, proposer les dates optimales
  if (joursRestants >= DELAIS_OPTIMAUX.GENERATION) {
    return {
      dateGenerationSuggeree: aujourdhui > dateGenerationOptimale ? aujourdhui : dateGenerationOptimale,
      dateEnvoiSuggeree: dateEnvoiOptimale,
      delaiOptimalRespectable: true,
    };
  }

  // Sinon, alerter et proposer aujourd'hui
  return {
    dateGenerationSuggeree: aujourdhui,
    dateEnvoiSuggeree: aujourdhui,
    delaiOptimalRespectable: false,
    messageAlerte: `Attention : avec une échéance au ${formatDate(dateEcheance)}, les copropriétaires n'auront que ${joursRestants} jours pour payer (recommandé : ${DELAIS_OPTIMAUX.DELAI_MINIMUM} jours minimum).`,
  };
};

/**
 * Formate une date relative (ex: "dans 15 jours", "il y a 3 jours")
 */
export const formatDateRelative = (date: string): string => {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const cible = new Date(date);
  cible.setHours(0, 0, 0, 0);

  const diffJours = Math.ceil((cible.getTime() - aujourdhui.getTime()) / (1000 * 60 * 60 * 24));

  if (diffJours === 0) return "Aujourd'hui";
  if (diffJours === 1) return "Demain";
  if (diffJours === -1) return "Hier";
  if (diffJours > 0) return `Dans ${diffJours} jour${diffJours > 1 ? 's' : ''}`;
  return `Il y a ${Math.abs(diffJours)} jour${Math.abs(diffJours) > 1 ? 's' : ''}`;
};

/**
 * Retourne l'icône appropriée selon le niveau d'alerte
 */
export const getIconeNiveauAlerte = (niveau: NiveauAlerte) => {
  switch (niveau) {
    case 'critical':
      return <AlertCircle size={16} className="text-error" aria-hidden="true" />;
    case 'warning':
      return <Clock size={16} className="text-warning" aria-hidden="true" />;
    case 'info':
      return <CheckCircle size={16} className="text-info" aria-hidden="true" />;
  }
};
