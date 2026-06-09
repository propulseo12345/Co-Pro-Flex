/**
 * Utilitaires pour la génération automatique des ordres de service contractuels
 */

import type {
  ContratDetaille,
  OrdreServicePlanifie,
  FrequenceIntervention,
  OrdreService
} from '@/types';

/**
 * Nombre de mois entre chaque intervention selon la fréquence
 */
const FREQUENCE_MOIS: Record<FrequenceIntervention, number> = {
  UNIQUE: 0,
  MENSUELLE: 1,
  BIMESTRIELLE: 2,
  TRIMESTRIELLE: 3,
  SEMESTRIELLE: 6,
  ANNUELLE: 12,
};

/**
 * Calcule les dates des prochaines interventions planifiées pour un contrat
 * @param contrat Le contrat avec sa configuration de planification
 * @param nombreMois Nombre de mois à planifier (défaut: 12)
 * @returns Liste des dates ISO des interventions
 */
export function calculerDatesInterventions(
  contrat: ContratDetaille,
  nombreMois: number = 12
): string[] {
  if (!contrat.planification || contrat.planification.frequence === 'UNIQUE') {
    return [];
  }

  const { frequence, jourPrefere = 15, prochaineIntervention } = contrat.planification;
  const intervalMois = FREQUENCE_MOIS[frequence];

  if (intervalMois === 0) return [];

  const dates: string[] = [];
  const dateDebut = prochaineIntervention
    ? new Date(prochaineIntervention)
    : new Date();

  const dateFin = new Date(contrat.dateFin);
  const dateMax = new Date();
  dateMax.setMonth(dateMax.getMonth() + nombreMois);

  // Prendre la date la plus proche entre dateFin et dateMax
  const limiteDate = dateFin < dateMax ? dateFin : dateMax;

  const currentDate = new Date(dateDebut);

  while (currentDate <= limiteDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setMonth(currentDate.getMonth() + intervalMois);
    // Ajuster le jour si nécessaire
    if (jourPrefere && currentDate.getDate() !== jourPrefere) {
      currentDate.setDate(Math.min(jourPrefere, 28));
    }
  }

  return dates;
}

/**
 * Génère les ordres de service planifiés pour un contrat
 * Ces ordres sont en statut "A_VALIDER" et doivent être validés avant génération
 */
export function genererOrdresPlanifies(
  contrat: ContratDetaille,
  nombreMois: number = 6
): OrdreServicePlanifie[] {
  if (!contrat.planification || !contrat.planification.generationAutomatique) {
    return [];
  }

  const dates = calculerDatesInterventions(contrat, nombreMois);

  return dates.map((date, index) => ({
    id: `osp-${contrat.id}-${date}`,
    contratId: contrat.id,
    contratNom: contrat.nom,
    prestataireNom: contrat.fournisseur,
    titre: `${contrat.nom} - ${formatDateFr(date)}`,
    description: contrat.planification!.descriptionIntervention,
    datePrevisionnelle: date,
    montantEstime: contrat.planification!.montantEstimeIntervention,
    statut: 'A_VALIDER' as const,
  }));
}

/**
 * Génère les ordres de service planifiés pour tous les contrats actifs
 */
export function genererTousOrdresPlanifies(
  contrats: ContratDetaille[],
  nombreMois: number = 6
): OrdreServicePlanifie[] {
  const contratsActifs = contrats.filter(
    c => c.statut === 'ACTIF' && c.planification?.generationAutomatique
  );

  return contratsActifs.flatMap(contrat =>
    genererOrdresPlanifies(contrat, nombreMois)
  );
}

/**
 * Filtre les ordres planifiés qui doivent être générés (J-X avant la date)
 */
export function getOrdresAGenerer(
  ordresPlanifies: OrdreServicePlanifie[],
  contrats: ContratDetaille[]
): OrdreServicePlanifie[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return ordresPlanifies.filter(op => {
    if (op.statut !== 'A_VALIDER' && op.statut !== 'VALIDE') return false;

    const contrat = contrats.find(c => c.id === op.contratId);
    if (!contrat?.planification) return false;

    const datePrevisionnelle = new Date(op.datePrevisionnelle);
    const delaiJours = contrat.planification.delaiGenerationJours;

    // Calculer la date limite de génération
    const dateLimite = new Date(datePrevisionnelle);
    dateLimite.setDate(dateLimite.getDate() - delaiJours);

    return today >= dateLimite;
  });
}

/**
 * Convertit un ordre planifié en ordre de service réel
 */
export function convertirEnOrdreService(
  ordrePlanifie: OrdreServicePlanifie,
  contrat: ContratDetaille
): Omit<OrdreService, 'id'> {
  const now = new Date().toISOString();

  return {
    date: ordrePlanifie.datePrevisionnelle,
    dateCreation: now,
    dateModification: now,
    titre: ordrePlanifie.titre,
    description: ordrePlanifie.description,
    typeOrdre: 'CONTRACTUEL',
    fournisseurId: contrat.prestataireId,
    fournisseurNom: contrat.fournisseur,
    contratId: contrat.id,
    contratNom: contrat.nom,
    statut: 'BROUILLON',
    emailObjet: `Ordre de service contractuel - ${ordrePlanifie.titre}`,
    emailCorps: genererEmailContractuel(ordrePlanifie, contrat),
    piecesJointes: [],
    montantEstime: ordrePlanifie.montantEstime,
    devisRequis: false,
    historique: [{
      id: `h-gen-${Date.now()}`,
      date: now,
      auteur: 'Système',
      action: 'Génération automatique depuis contrat',
    }],
  };
}

/**
 * Génère le contenu de l'email pour un ordre contractuel
 */
function genererEmailContractuel(
  ordrePlanifie: OrdreServicePlanifie,
  contrat: ContratDetaille
): string {
  return `Bonjour,

En qualité de syndic de la copropriété située au 50 Route La Carrière au Loup, 75002 Paris, et conformément au contrat n°${contrat.numeroContrat || 'N/A'} en cours avec votre entreprise, nous vous remercions de bien vouloir intervenir pour la prestation suivante :

Demande :
${ordrePlanifie.description}

Date prévisionnelle : ${formatDateFr(ordrePlanifie.datePrevisionnelle)}
${contrat.planification?.heurePrefere ? `Heure souhaitée : ${contrat.planification.heurePrefere}` : ''}

Lieu d'intervention :
${contrat.equipementConcerne || 'Parties communes'}

Nous vous remercions par avance de nous confirmer la date d'intervention.

Cordialement,
Le syndic de la copropriété`;
}

/**
 * Formate une date ISO en français
 */
function formatDateFr(dateISO: string): string {
  const date = new Date(dateISO);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Calcule les statistiques de planification
 */
export function calculerStatsPlanification(
  contrats: ContratDetaille[]
): {
  totalContratsAvecPlanification: number;
  ordresAPlanifier30Jours: number;
  ordresAPlanifier90Jours: number;
  prochainOrdre: { contratNom: string; date: string } | null;
} {
  const contratsAvecPlanif = contrats.filter(
    c => c.statut === 'ACTIF' && c.planification?.generationAutomatique
  );

  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  const in90Days = new Date(today);
  in90Days.setDate(in90Days.getDate() + 90);

  let ordres30 = 0;
  let ordres90 = 0;
  let prochainOrdre: { contratNom: string; date: string } | null = null;

  for (const contrat of contratsAvecPlanif) {
    const dates = calculerDatesInterventions(contrat, 3);

    for (const dateStr of dates) {
      const date = new Date(dateStr);

      if (date <= in30Days) ordres30++;
      if (date <= in90Days) ordres90++;

      if (!prochainOrdre || date < new Date(prochainOrdre.date)) {
        prochainOrdre = { contratNom: contrat.nom, date: dateStr };
      }
    }
  }

  return {
    totalContratsAvecPlanification: contratsAvecPlanif.length,
    ordresAPlanifier30Jours: ordres30,
    ordresAPlanifier90Jours: ordres90,
    prochainOrdre,
  };
}
