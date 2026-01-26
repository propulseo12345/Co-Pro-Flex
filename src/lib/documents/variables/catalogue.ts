/**
 * Catalogue complet des variables disponibles pour les documents
 */

import type { VariableDefinition, CategorieVariable } from './types';

/**
 * Catalogue complet des variables disponibles
 */
export const CATALOGUE_VARIABLES: VariableDefinition[] = [
  // ========================================
  // COPROPRIÉTÉ
  // ========================================
  {
    nom: 'nom_copropriete',
    cle: '{nom_copropriete}',
    categorie: 'copropriete',
    description: 'Nom de la copropriété',
    exemple: 'Résidence Les Jardins',
    obligatoire: true,
    source: 'copropriete.nom',
  },
  {
    nom: 'adresse_copropriete',
    cle: '{adresse_copropriete}',
    categorie: 'copropriete',
    description: 'Adresse complète de la copropriété',
    exemple: '12 rue des Fleurs, 75001 Paris',
    obligatoire: true,
    source: 'copropriete.adresse + copropriete.codePostal + copropriete.ville',
  },
  {
    nom: 'nombre_lots',
    cle: '{nombre_lots}',
    categorie: 'copropriete',
    description: 'Nombre total de lots',
    exemple: '45',
    obligatoire: false,
    source: 'copropriete.nombreLots',
  },
  {
    nom: 'total_tantiemes',
    cle: '{total_tantiemes}',
    categorie: 'copropriete',
    description: 'Total des tantièmes de la copropriété',
    exemple: '10000',
    obligatoire: false,
    source: 'copropriete.totalTantiemes',
  },

  // ========================================
  // SYNDIC / GESTIONNAIRE
  // ========================================
  {
    nom: 'nom_syndic',
    cle: '{nom_syndic}',
    categorie: 'syndic',
    description: 'Nom complet du syndic (raison sociale pour pro, nom/prénom pour bénévole)',
    exemple: 'Cabinet IMMO GESTION',
    obligatoire: true,
    source: 'syndic.raisonSociale || syndic.prenom + syndic.nom',
  },
  {
    nom: 'nom_gestionnaire',
    cle: '{nom_gestionnaire}',
    categorie: 'syndic',
    description: 'Nom du gestionnaire (personne physique)',
    exemple: 'M. Pierre MARTIN',
    obligatoire: false,
    source: 'syndic.prenom + syndic.nom',
  },
  {
    nom: 'adresse_syndic',
    cle: '{adresse_syndic}',
    categorie: 'syndic',
    description: 'Adresse du syndic',
    exemple: '5 avenue de la République, 75011 Paris',
    obligatoire: true,
    source: 'syndic.adresse + syndic.codePostal + syndic.ville',
  },
  {
    nom: 'telephone_syndic',
    cle: '{telephone_syndic}',
    categorie: 'syndic',
    description: 'Téléphone du syndic',
    exemple: '01 23 45 67 89',
    obligatoire: false,
    source: 'syndic.telephone',
  },
  {
    nom: 'email_syndic',
    cle: '{email_syndic}',
    categorie: 'syndic',
    description: 'Email du syndic',
    exemple: 'contact@immo-gestion.fr',
    obligatoire: false,
    source: 'syndic.email',
  },
  {
    nom: 'carte_professionnelle_syndic',
    cle: '{carte_professionnelle_syndic}',
    categorie: 'syndic',
    description: 'Numéro de carte professionnelle',
    exemple: 'CPI 7501 2023 000 123 456',
    obligatoire: false,
    source: 'syndic.numeroCarteProf',
  },

  // ========================================
  // AG
  // ========================================
  {
    nom: 'type_ag',
    cle: '{type_ag}',
    categorie: 'ag',
    description: "Type d'assemblée générale",
    exemple: 'Assemblée Générale Ordinaire',
    obligatoire: true,
    source: 'ag.type',
  },
  {
    nom: 'date_ag',
    cle: '{date_ag}',
    categorie: 'ag',
    description: "Date de l'AG (format long)",
    exemple: '15 mars 2025',
    obligatoire: true,
    source: 'ag.dateAG',
  },
  {
    nom: 'heure_ag',
    cle: '{heure_ag}',
    categorie: 'ag',
    description: "Heure de l'AG",
    exemple: '18h30',
    obligatoire: true,
    source: 'ag.heureAG',
  },
  {
    nom: 'lieu_ag',
    cle: '{lieu_ag}',
    categorie: 'ag',
    description: "Lieu de l'AG",
    exemple: 'Salle des fêtes, 10 rue de la Mairie',
    obligatoire: true,
    source: 'ag.lieu',
  },
  {
    nom: 'date_convocation',
    cle: '{date_convocation}',
    categorie: 'ag',
    description: "Date d'envoi de la convocation",
    exemple: '20 février 2025',
    obligatoire: true,
    source: 'ag.dateConvocation',
  },
  {
    nom: 'date_limite_correspondance',
    cle: '{date_limite_correspondance}',
    categorie: 'ag',
    description: 'Date limite de réception des votes par correspondance',
    exemple: '12 mars 2025',
    obligatoire: false,
    source: 'ag.dateLimiteCorrespondance',
  },
  {
    nom: 'exercice_debut',
    cle: '{exercice_debut}',
    categorie: 'ag',
    description: "Date de début de l'exercice",
    exemple: '1er janvier 2024',
    obligatoire: true,
    source: 'ag.exercice.dateDebut',
  },
  {
    nom: 'exercice_fin',
    cle: '{exercice_fin}',
    categorie: 'ag',
    description: "Date de fin de l'exercice",
    exemple: '31 décembre 2024',
    obligatoire: true,
    source: 'ag.exercice.dateFin',
  },

  // ========================================
  // COPROPRIÉTAIRE (contexte mail personnalisé)
  // ========================================
  {
    nom: 'civilite_coproprietaire',
    cle: '{civilite_coproprietaire}',
    categorie: 'coproprietaire',
    description: 'Civilité du copropriétaire',
    exemple: 'Mme',
    obligatoire: false,
    source: 'coproprietaire.civilite',
  },
  {
    nom: 'nom_coproprietaire',
    cle: '{nom_coproprietaire}',
    categorie: 'coproprietaire',
    description: 'Nom complet du copropriétaire',
    exemple: 'Mme Marie DUPONT',
    obligatoire: false,
    source: 'coproprietaire.civilite + coproprietaire.prenom + coproprietaire.nom',
  },
  {
    nom: 'lots_coproprietaire',
    cle: '{lots_coproprietaire}',
    categorie: 'coproprietaire',
    description: 'Liste des lots du copropriétaire',
    exemple: 'Lot 12 (appartement), Lot 45 (cave)',
    obligatoire: false,
    source: 'coproprietaire.lots',
  },
  {
    nom: 'tantiemes_coproprietaire',
    cle: '{tantiemes_coproprietaire}',
    categorie: 'coproprietaire',
    description: 'Total des tantièmes du copropriétaire',
    exemple: '250',
    obligatoire: false,
    source: 'coproprietaire.totalTantiemes',
  },

  // ========================================
  // FINANCE
  // ========================================
  {
    nom: 'modalite_paiement_fonds',
    cle: '{modalite_paiement_fonds}',
    categorie: 'finance',
    description: 'Modalité de paiement des charges (mensuel, trimestriel, etc.)',
    exemple: 'Trimestriel',
    obligatoire: false,
    source: 'finance.modalitePaiementFonds',
  },
  {
    nom: 'modalites_paiement_budget',
    cle: '{modalites_paiement_budget}',
    categorie: 'finance',
    description: 'Modalité de paiement du budget prévisionnel',
    exemple: 'Trimestriel',
    obligatoire: false,
    source: 'finance.modalitePaiementFonds',
  },
  {
    nom: 'modalites_paiement_fonds',
    cle: '{modalites_paiement_fonds}',
    categorie: 'finance',
    description: 'Modalité de paiement du fonds travaux',
    exemple: 'Semestriel',
    obligatoire: false,
    source: 'finance.modalitePaiementTravaux',
  },
  {
    nom: 'modalite_paiement_travaux',
    cle: '{modalite_paiement_travaux}',
    categorie: 'finance',
    description: 'Modalité de paiement du fonds travaux',
    exemple: 'Semestriel',
    obligatoire: false,
    source: 'finance.modalitePaiementTravaux',
  },
  {
    nom: 'budget_previsionnel',
    cle: '{budget_previsionnel}',
    categorie: 'finance',
    description: 'Montant du budget prévisionnel',
    exemple: '45 000,00 €',
    obligatoire: false,
    source: 'finance.budgetPrevisionnel',
  },
  {
    nom: 'fonds_travaux_annuel',
    cle: '{fonds_travaux_annuel}',
    categorie: 'finance',
    description: 'Montant annuel du fonds travaux',
    exemple: '5 000,00 €',
    obligatoire: false,
    source: 'finance.fondsTravauxAnnuel',
  },
  {
    nom: 'dates_paiement',
    cle: '{dates_paiement}',
    categorie: 'finance',
    description: "Liste des dates d'échéance de paiement",
    exemple: '1er janvier, 1er avril, 1er juillet, 1er octobre',
    obligatoire: false,
    source: 'finance.datesPaiement',
  },
  {
    nom: 'dates_echeances_budget',
    cle: '{dates_echeances_budget}',
    categorie: 'finance',
    description: "Dates d'échéances du budget",
    exemple: '1er janvier, 1er avril, 1er juillet, 1er octobre',
    obligatoire: false,
    source: 'finance.datesPaiement',
  },
  {
    nom: 'dates_echeances_fonds',
    cle: '{dates_echeances_fonds}',
    categorie: 'finance',
    description: "Dates d'échéances du fonds travaux",
    exemple: '1er janvier, 1er juillet',
    obligatoire: false,
    source: 'finance.datesPaiement',
  },

  // ========================================
  // DATES
  // ========================================
  {
    nom: 'date_du_jour',
    cle: '{date_du_jour}',
    categorie: 'date',
    description: 'Date du jour (format long)',
    exemple: '15 janvier 2025',
    obligatoire: false,
    source: 'new Date()',
  },
  {
    nom: 'annee_en_cours',
    cle: '{annee_en_cours}',
    categorie: 'date',
    description: 'Année en cours',
    exemple: '2025',
    obligatoire: false,
    source: 'new Date().getFullYear()',
  },

  // ========================================
  // RÉSOLUTION (contexte spécifique)
  // ========================================
  {
    nom: 'numero_resolution',
    cle: '{numero_resolution}',
    categorie: 'resolution',
    description: 'Numéro de la résolution',
    exemple: '5',
    obligatoire: false,
    source: 'resolution.numero',
  },
  {
    nom: 'titre_resolution',
    cle: '{titre_resolution}',
    categorie: 'resolution',
    description: 'Titre de la résolution',
    exemple: 'Approbation des comptes',
    obligatoire: false,
    source: 'resolution.titre',
  },
  {
    nom: 'article_resolution',
    cle: '{article_resolution}',
    categorie: 'resolution',
    description: 'Article de majorité de la résolution',
    exemple: 'Article 24',
    obligatoire: false,
    source: 'resolution.article',
  },
];

/**
 * Obtenir une variable par son nom
 */
export function getVariableDefinition(nom: string): VariableDefinition | undefined {
  return CATALOGUE_VARIABLES.find(v => v.nom === nom);
}

/**
 * Obtenir les variables par catégorie
 */
export function getVariablesByCategorie(categorie: CategorieVariable): VariableDefinition[] {
  return CATALOGUE_VARIABLES.filter(v => v.categorie === categorie);
}

/**
 * Obtenir toutes les clés de variables (pour regex)
 */
export function getAllVariableKeys(): string[] {
  return CATALOGUE_VARIABLES.map(v => v.cle);
}

/**
 * Obtenir les catégories disponibles
 */
export function getCategories(): CategorieVariable[] {
  return ['copropriete', 'syndic', 'ag', 'finance', 'coproprietaire', 'date', 'resolution'];
}
