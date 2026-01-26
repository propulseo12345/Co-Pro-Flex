/**
 * Plan Comptable Copropriété - Référentiel complet
 * Conforme au décret n° 2005-240 du 14 mars 2005
 *
 * Ce référentiel permet d'associer un libellé explicite à chaque numéro de compte
 * utilisé dans la comptabilité de copropriété.
 */

export interface CompteComptable {
  numero: string;
  libelle: string;
  description?: string;
}

/**
 * Référentiel complet du plan comptable copropriété
 * Inclut les comptes principaux et sous-comptes les plus utilisés
 */
export const PLAN_COMPTABLE_COPROPRIETE: Record<string, CompteComptable> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 1 - FONDS PROPRES ET EMPRUNTS
  // ═══════════════════════════════════════════════════════════════════════════
  '10': { numero: '10', libelle: 'Fonds de roulement', description: 'Avances de trésorerie des copropriétaires' },
  '102': { numero: '102', libelle: 'Provisions pour travaux décidés', description: 'Travaux votés en AG' },
  '103': { numero: '103', libelle: 'Avances', description: 'Avances des copropriétaires' },
  '105': { numero: '105', libelle: 'Fonds de travaux ALUR', description: 'Fonds de travaux obligatoire (loi ALUR)' },
  '11': { numero: '11', libelle: 'Solde en attente sur travaux', description: 'Régularisation travaux en cours' },
  '12': { numero: '12', libelle: 'Solde en attente sur opérations courantes', description: 'Régularisation charges courantes' },
  '13': { numero: '13', libelle: 'Avances travaux copropriétaires', description: 'Avances individuelles pour travaux' },
  '16': { numero: '16', libelle: 'Emprunts', description: 'Emprunts collectifs de la copropriété' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 4 - COMPTES DE TIERS
  // ═══════════════════════════════════════════════════════════════════════════

  // 40x - Fournisseurs
  '40': { numero: '40', libelle: 'Fournisseurs', description: 'Dettes envers les fournisseurs' },
  '401': { numero: '401', libelle: 'Fournisseurs - Factures à payer', description: 'Factures reçues non réglées' },
  '408': { numero: '408', libelle: 'Fournisseurs - Factures non parvenues', description: 'Charges à payer' },

  // 42x - Personnel
  '421': { numero: '421', libelle: 'Personnel - Rémunérations dues', description: 'Salaires gardien/employés' },
  '43': { numero: '43', libelle: 'Organismes sociaux', description: 'Charges sociales' },
  '431': { numero: '431', libelle: 'Sécurité sociale', description: 'URSSAF et cotisations' },
  '437': { numero: '437', libelle: 'Autres organismes sociaux', description: 'Retraite, prévoyance' },

  // 44x - État et collectivités
  '442': { numero: '442', libelle: 'État - Impôts et taxes', description: 'TVA, taxes diverses' },

  // 45x - Copropriétaires
  '45': { numero: '45', libelle: 'Copropriétaires', description: 'Comptes individuels copropriétaires' },
  '450': { numero: '450', libelle: 'Copropriétaires - Créances', description: 'Sommes dues par les copropriétaires' },
  '459': { numero: '459', libelle: 'Copropriétaires - Créditeurs', description: 'Trop-perçus à rembourser' },

  // 46x - Débiteurs et créditeurs divers
  '462': { numero: '462', libelle: 'Créances sur cessions', description: 'Cessions d\'éléments d\'actifs' },
  '467': { numero: '467', libelle: 'Autres comptes débiteurs/créditeurs', description: 'Opérations diverses' },
  '471': { numero: '471', libelle: 'Compte d\'attente', description: 'Opérations à régulariser' },
  '472': { numero: '472', libelle: 'Compte de répartition périodique', description: 'Répartition des charges' },

  // 48x - Comptes de régularisation
  '486': { numero: '486', libelle: 'Charges constatées d\'avance', description: 'Charges payées d\'avance' },
  '487': { numero: '487', libelle: 'Produits constatés d\'avance', description: 'Appels reçus d\'avance' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 5 - COMPTES FINANCIERS
  // ═══════════════════════════════════════════════════════════════════════════
  '51': { numero: '51', libelle: 'Banques et établissements financiers', description: 'Comptes bancaires' },
  '512': { numero: '512', libelle: 'Banque', description: 'Compte courant bancaire' },
  '514': { numero: '514', libelle: 'Chèques postaux', description: 'Compte CCP/La Poste' },
  '531': { numero: '531', libelle: 'Caisse', description: 'Espèces en caisse' },
  '532': { numero: '532', libelle: 'Placements', description: 'Placements de trésorerie' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 6 - COMPTES DE CHARGES
  // ═══════════════════════════════════════════════════════════════════════════

  // 60x - Achats
  '60': { numero: '60', libelle: 'Achats', description: 'Achats de fournitures et fluides' },
  '601': { numero: '601', libelle: 'Achats de fournitures', description: 'Fournitures diverses' },
  '602': { numero: '602', libelle: 'Achats stockés - Autres approvisionnements', description: 'Fluides et énergies' },
  '6021': { numero: '6021', libelle: 'Eau', description: 'Consommation d\'eau' },
  '60210': { numero: '60210', libelle: 'Eau', description: 'Consommation d\'eau' },
  '602001': { numero: '602001', libelle: 'Eau', description: 'Consommation d\'eau parties communes' },
  '6022': { numero: '6022', libelle: 'Électricité', description: 'Électricité parties communes' },
  '60220': { numero: '60220', libelle: 'Électricité parties communes', description: 'Éclairage, ascenseur, etc.' },
  '602002': { numero: '602002', libelle: 'Gaz / Énergie', description: 'Gaz et autres énergies' },
  '6023': { numero: '6023', libelle: 'Chauffage collectif', description: 'Combustibles chauffage' },
  '60230': { numero: '60230', libelle: 'Chauffage collectif', description: 'Fioul, gaz chauffage' },
  '602003': { numero: '602003', libelle: 'Chauffage collectif', description: 'Combustibles chauffage' },
  '606': { numero: '606', libelle: 'Eau et électricité', description: 'Fluides et énergies' },

  // 604 - Achats de matériel et travaux
  '604': { numero: '604', libelle: 'Achats de matériel, équipements et travaux', description: 'Petits équipements et travaux' },
  '6041': { numero: '6041', libelle: 'Achats de matériel d\'entretien', description: 'Matériel pour entretien courant' },
  '6042': { numero: '6042', libelle: 'Achats de fournitures de bureau', description: 'Fournitures administratives' },

  // 61x - Services extérieurs
  '61': { numero: '61', libelle: 'Services extérieurs', description: 'Prestations de services' },
  '611': { numero: '611', libelle: 'Contrats de prestations de services', description: 'Entretien et maintenance' },
  '6111': { numero: '6111', libelle: 'Nettoyage parties communes', description: 'Ménage des parties communes' },
  '6112': { numero: '6112', libelle: 'Entretien espaces verts', description: 'Jardinage et espaces extérieurs' },
  '6113': { numero: '6113', libelle: 'Entretien ascenseurs', description: 'Maintenance des ascenseurs' },
  '6114': { numero: '6114', libelle: 'Désinfection / Dératisation', description: 'Traitement sanitaire' },
  '612': { numero: '612', libelle: 'Locations', description: 'Locations de matériel' },

  // 614 - Charges locatives et de copropriété
  '614': { numero: '614', libelle: 'Charges locatives et de copropriété', description: 'Charges récupérables' },
  '6141': { numero: '6141', libelle: 'Charges locatives - Ménage', description: 'Nettoyage récupérable' },
  '614001': { numero: '614001', libelle: 'Ménage / Nettoyage', description: 'Entretien courant des parties communes' },
  '6142': { numero: '6142', libelle: 'Charges locatives - Ordures', description: 'Enlèvement des ordures' },
  '614002': { numero: '614002', libelle: 'Enlèvement ordures ménagères', description: 'Collecte des déchets' },
  '6143': { numero: '6143', libelle: 'Charges locatives - Espaces verts', description: 'Entretien jardins récupérable' },
  '614003': { numero: '614003', libelle: 'Entretien espaces verts', description: 'Jardinage et espaces extérieurs' },
  '6144': { numero: '6144', libelle: 'Charges locatives - Interphone', description: 'Maintenance interphone/digicode' },
  '614004': { numero: '614004', libelle: 'Interphone / Digicode', description: 'Maintenance contrôle d\'accès' },

  // 615 - Entretien et réparations
  '615': { numero: '615', libelle: 'Entretien et réparations', description: 'Travaux d\'entretien courant' },
  '6151': { numero: '6151', libelle: 'Entretien bâtiment', description: 'Réparations parties communes' },
  '615001': { numero: '615001', libelle: 'Maintenance ascenseur', description: 'Entretien et réparations ascenseur' },
  '6152': { numero: '6152', libelle: 'Entretien équipements', description: 'Maintenance équipements collectifs' },
  '615002': { numero: '615002', libelle: 'Maintenance chaufferie', description: 'Entretien chauffage collectif' },
  '6153': { numero: '6153', libelle: 'Entretien toiture', description: 'Réparations toiture' },
  '615003': { numero: '615003', libelle: 'Entretien toiture / Étanchéité', description: 'Réparations couverture' },
  '6154': { numero: '6154', libelle: 'Entretien plomberie', description: 'Réparations plomberie' },
  '615004': { numero: '615004', libelle: 'Plomberie parties communes', description: 'Canalisations collectives' },
  '6155': { numero: '6155', libelle: 'Entretien électricité', description: 'Réparations électriques' },
  '615005': { numero: '615005', libelle: 'Électricité parties communes', description: 'Installation électrique' },

  // 616 - Assurances
  '616': { numero: '616', libelle: 'Primes d\'assurance', description: 'Assurance immeuble' },
  '6161': { numero: '6161', libelle: 'Assurance multirisque immeuble', description: 'MRI copropriété' },
  '6162': { numero: '6162', libelle: 'Assurance responsabilité civile', description: 'RC copropriété' },
  '6163': { numero: '6163', libelle: 'Assurance dommages-ouvrage', description: 'DO travaux' },

  // 617 - Honoraires
  '617': { numero: '617', libelle: 'Honoraires', description: 'Honoraires divers' },

  // 62x - Autres services extérieurs
  '62': { numero: '62', libelle: 'Autres services extérieurs', description: 'Frais de gestion' },
  '622': { numero: '622', libelle: 'Honoraires syndic', description: 'Rémunération du syndic' },
  '6221': { numero: '6221', libelle: 'Honoraires syndic - Forfait', description: 'Honoraires annuels de gestion' },
  '6222': { numero: '6222', libelle: 'Honoraires syndic - Hors forfait', description: 'Prestations particulières' },
  '623': { numero: '623', libelle: 'Publicité, publications', description: 'Annonces légales' },
  '625': { numero: '625', libelle: 'Déplacements, missions', description: 'Frais de déplacement' },
  '626': { numero: '626', libelle: 'Frais postaux et télécommunications', description: 'Courriers, téléphone' },
  '6261': { numero: '6261', libelle: 'Frais postaux', description: 'Timbres, envois' },
  '6262': { numero: '6262', libelle: 'Télécommunications', description: 'Téléphone, internet' },
  '627': { numero: '627', libelle: 'Services bancaires', description: 'Frais de banque' },
  '6271': { numero: '6271', libelle: 'Frais bancaires', description: 'Frais de tenue de compte' },
  '628': { numero: '628', libelle: 'Divers', description: 'Autres services extérieurs' },
  '6281': { numero: '6281', libelle: 'Frais AG', description: 'Salle, convocations AG' },
  '6282': { numero: '6282', libelle: 'Frais de contentieux', description: 'Avocat, huissier' },

  // 63x - Impôts et taxes
  '63': { numero: '63', libelle: 'Impôts et taxes', description: 'Impôts et taxes diverses' },
  '635': { numero: '635', libelle: 'Taxes foncières', description: 'Taxe foncière' },
  '637': { numero: '637', libelle: 'Autres impôts et taxes', description: 'Taxes diverses' },

  // 64x - Charges de personnel
  '64': { numero: '64', libelle: 'Charges de personnel', description: 'Salaires et charges sociales' },
  '641': { numero: '641', libelle: 'Rémunérations du personnel', description: 'Salaires bruts' },
  '6411': { numero: '6411', libelle: 'Salaires gardien/concierge', description: 'Rémunération gardien' },
  '645': { numero: '645', libelle: 'Charges de sécurité sociale', description: 'Cotisations sociales' },
  '647': { numero: '647', libelle: 'Autres charges sociales', description: 'Prévoyance, mutuelle' },

  // 65x - Charges diverses
  '65': { numero: '65', libelle: 'Charges diverses de gestion courante', description: 'Autres charges' },
  '658': { numero: '658', libelle: 'Charges diverses de gestion', description: 'Charges non classées' },

  // 66x - Charges financières
  '66': { numero: '66', libelle: 'Charges financières', description: 'Intérêts et frais financiers' },
  '661': { numero: '661', libelle: 'Intérêts des emprunts', description: 'Intérêts sur emprunts collectifs' },
  '668': { numero: '668', libelle: 'Autres charges financières', description: 'Autres frais financiers' },

  // 67x - Charges exceptionnelles
  '67': { numero: '67', libelle: 'Charges exceptionnelles', description: 'Charges non récurrentes' },
  '671': { numero: '671', libelle: 'Charges exceptionnelles sur opérations de gestion', description: 'Pénalités, créances irrecouvrables' },
  '672': { numero: '672', libelle: 'Charges exceptionnelles travaux', description: 'Travaux exceptionnels imprévus' },

  // 68x - Dotations aux amortissements et provisions
  '68': { numero: '68', libelle: 'Dotations aux amortissements et provisions', description: 'Provisions pour risques' },
  '681': { numero: '681', libelle: 'Dotations aux provisions', description: 'Provisions pour charges' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 7 - COMPTES DE PRODUITS
  // ═══════════════════════════════════════════════════════════════════════════

  // 70x - Appels de fonds
  '70': { numero: '70', libelle: 'Appels de fonds', description: 'Contributions des copropriétaires' },
  '701': { numero: '701', libelle: 'Appels de fonds - Budget prévisionnel', description: 'Charges courantes' },
  '7011': { numero: '7011', libelle: 'Appels trimestriels charges', description: 'Appels réguliers' },
  '702': { numero: '702', libelle: 'Appels de fonds - Travaux votés', description: 'Travaux décidés en AG' },
  '703': { numero: '703', libelle: 'Appels de fonds - Fonds travaux ALUR', description: 'Cotisation fonds ALUR' },
  '704': { numero: '704', libelle: 'Remboursements d\'assurance', description: 'Sinistres remboursés' },

  // 71x - Produits annexes
  '71': { numero: '71', libelle: 'Produits annexes', description: 'Revenus divers' },
  '713': { numero: '713', libelle: 'Appels travaux', description: 'Travaux exceptionnels' },
  '714': { numero: '714', libelle: 'Produits divers de gestion courante', description: 'Recettes diverses' },
  '7141': { numero: '7141', libelle: 'Location parties communes', description: 'Loyers parties communes' },
  '7142': { numero: '7142', libelle: 'Produits de publicité', description: 'Recettes publicitaires' },
  '7143': { numero: '7143', libelle: 'Produits des antennes relais', description: 'Redevances antennes' },
  '7144': { numero: '7144', libelle: 'Indemnités reçues', description: 'Remboursements divers' },

  // 76x - Produits financiers
  '76': { numero: '76', libelle: 'Produits financiers', description: 'Intérêts et revenus financiers' },
  '761': { numero: '761', libelle: 'Produits des placements', description: 'Intérêts des placements' },
  '768': { numero: '768', libelle: 'Autres produits financiers', description: 'Autres revenus financiers' },

  // 77x - Produits exceptionnels
  '77': { numero: '77', libelle: 'Produits exceptionnels', description: 'Produits non récurrents' },
  '771': { numero: '771', libelle: 'Produits exceptionnels sur opérations de gestion', description: 'Encaissements exceptionnels' },

  // 78x - Reprises sur provisions
  '78': { numero: '78', libelle: 'Reprises sur provisions', description: 'Annulation de provisions' },
  '781': { numero: '781', libelle: 'Reprises sur provisions', description: 'Provisions devenues sans objet' },
};

/**
 * Trouve le libellé d'un compte comptable
 * Recherche d'abord une correspondance exacte, puis par préfixe décroissant
 *
 * @param numeroCompte - Le numéro de compte à rechercher
 * @returns Le libellé du compte ou "Compte inconnu" si non trouvé
 */
export const getCompteLibelle = (numeroCompte: string): string => {
  // Correspondance exacte
  if (PLAN_COMPTABLE_COPROPRIETE[numeroCompte]) {
    return PLAN_COMPTABLE_COPROPRIETE[numeroCompte].libelle;
  }

  // Recherche par préfixe (du plus spécifique au plus général)
  for (let i = numeroCompte.length - 1; i >= 1; i--) {
    const prefix = numeroCompte.substring(0, i);
    if (PLAN_COMPTABLE_COPROPRIETE[prefix]) {
      // Retourne le libellé du préfixe avec le numéro complet pour précision
      return PLAN_COMPTABLE_COPROPRIETE[prefix].libelle;
    }
  }

  // Non trouvé - retourne un libellé générique basé sur la classe
  const classe = numeroCompte.charAt(0);
  switch (classe) {
    case '1': return 'Fonds propres';
    case '2': return 'Immobilisations';
    case '3': return 'Stocks';
    case '4': return 'Tiers';
    case '5': return 'Financiers';
    case '6': return 'Charges';
    case '7': return 'Produits';
    default: return 'Compte inconnu';
  }
};

/**
 * Trouve le compte complet (numéro + libellé + description)
 *
 * @param numeroCompte - Le numéro de compte à rechercher
 * @returns L'objet CompteComptable ou undefined si non trouvé
 */
export const getCompteDetails = (numeroCompte: string): CompteComptable | undefined => {
  // Correspondance exacte
  if (PLAN_COMPTABLE_COPROPRIETE[numeroCompte]) {
    return PLAN_COMPTABLE_COPROPRIETE[numeroCompte];
  }

  // Recherche par préfixe
  for (let i = numeroCompte.length - 1; i >= 1; i--) {
    const prefix = numeroCompte.substring(0, i);
    if (PLAN_COMPTABLE_COPROPRIETE[prefix]) {
      return PLAN_COMPTABLE_COPROPRIETE[prefix];
    }
  }

  return undefined;
};

/**
 * Formate un numéro de compte avec son libellé
 *
 * @param numeroCompte - Le numéro de compte
 * @returns Format "numéro - libellé"
 */
export const formatCompteAvecLibelle = (numeroCompte: string): string => {
  const libelle = getCompteLibelle(numeroCompte);
  return `${numeroCompte} - ${libelle}`;
};

/**
 * Labels des classes comptables
 */
export const CLASSES_COMPTABLES: Record<string, string> = {
  '1': 'Classe 1 - Fonds propres et emprunts',
  '2': 'Classe 2 - Immobilisations',
  '3': 'Classe 3 - Stocks',
  '4': 'Classe 4 - Tiers',
  '5': 'Classe 5 - Comptes financiers',
  '6': 'Classe 6 - Charges',
  '7': 'Classe 7 - Produits'
};

/**
 * Obtient la description de la classe d'un compte
 *
 * @param numeroCompte - Le numéro de compte
 * @returns La description de la classe
 */
export const getClasseCompte = (numeroCompte: string): string => {
  const classe = numeroCompte.charAt(0);
  return CLASSES_COMPTABLES[classe] || 'Classe inconnue';
};
