/**
 * Plan Comptable Copropriété - Décret n° 2005-240 du 14 mars 2005
 * Modifié par le décret du 27 décembre 2016 et l'arrêté du 20 août 2020
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
 * Conforme au décret 2005-240 — classes 1, 4, 5, 6, 7
 */
export const PLAN_COMPTABLE_COPROPRIETE: Record<string, CompteComptable> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 1 - PROVISIONS, AVANCES, SUBVENTIONS ET EMPRUNTS
  // ═══════════════════════════════════════════════════════════════════════════
  '10': { numero: '10', libelle: 'Provisions, avances', description: 'Sommes réservées' },
  '102': { numero: '102', libelle: 'Provisions pour travaux décidés', description: 'Travaux votés en AG, en attente de paiement' },
  '103': { numero: '103', libelle: 'Avances', description: 'Avances des copropriétaires' },
  '1031': { numero: '1031', libelle: 'Avance de trésorerie', description: 'Ancien fonds de roulement' },
  '1032': { numero: '1032', libelle: 'Avance travaux (art. 18)', description: 'Avances pour travaux non encore votés' },
  '1033': { numero: '1033', libelle: 'Autres avances', description: 'Toute autre avance décidée en AG' },
  '105': { numero: '105', libelle: 'Fonds de travaux ALUR (art. 14-2 II)', description: 'Cotisations obligatoires loi ALUR (min. 5% budget)' },
  '11': { numero: '11', libelle: 'Solde en attente sur travaux', description: 'Régularisation travaux' },
  '110': { numero: '110', libelle: 'Solde en attente sur travaux et opérations exceptionnelles', description: 'Excédent ou insuffisance non encore affecté' },
  '12': { numero: '12', libelle: 'Solde en attente sur opérations courantes', description: 'Régularisation charges courantes' },
  '120': { numero: '120', libelle: 'Solde en attente sur opérations courantes', description: 'Différence provisions/dépenses réelles après clôture' },
  '13': { numero: '13', libelle: 'Subventions', description: 'Subventions reçues ou en attente' },
  '131': { numero: '131', libelle: 'Subventions accordées, en instance de versement', description: 'Subventions notifiées non reçues' },
  '132': { numero: '132', libelle: 'Subventions encaissées', description: 'Subventions effectivement reçues' },
  '16': { numero: '16', libelle: 'Emprunts', description: 'Emprunts collectifs de la copropriété' },
  '164': { numero: '164', libelle: 'Emprunts collectifs', description: 'Emprunts souscrits par le syndicat' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 4 - COMPTES DE TIERS
  // ═══════════════════════════════════════════════════════════════════════════

  // 40x - Fournisseurs
  '40': { numero: '40', libelle: 'Fournisseurs', description: 'Dettes envers les fournisseurs' },
  '401': { numero: '401', libelle: 'Fournisseurs - Factures parvenues', description: 'Factures reçues et enregistrées' },
  '408': { numero: '408', libelle: 'Fournisseurs - Factures non parvenues', description: 'Charges à payer, facture pas encore reçue (FNP)' },
  '409': { numero: '409', libelle: 'Fournisseurs débiteurs', description: 'Avoirs, trop-perçu fournisseurs' },

  // 41x-43x - Personnel et organismes sociaux
  '411': { numero: '411', libelle: 'Personnel - Rémunérations dues', description: 'Salaires gardien/employés' },
  '420': { numero: '420', libelle: 'Personnel - Avances et acomptes', description: 'Avances sur salaires' },
  '421': { numero: '421', libelle: 'Personnel - Rémunérations dues', description: 'Salaires gardien/employés' },
  '43': { numero: '43', libelle: 'Organismes sociaux', description: 'Charges sociales' },
  '431': { numero: '431', libelle: 'Sécurité sociale', description: 'URSSAF et cotisations' },
  '432': { numero: '432', libelle: 'Autres organismes sociaux', description: 'Caisse retraite, mutuelle, prévoyance' },

  // 44x - État et collectivités
  '442': { numero: '442', libelle: 'État - Impôts et taxes', description: 'TVA, taxes diverses' },

  // 45x - Copropriétaires
  '45': { numero: '45', libelle: 'Copropriétaires', description: 'Comptes individuels copropriétaires' },
  '450': { numero: '450', libelle: 'Copropriétaires - Comptes individualisés', description: 'Compte principal copropriétaires' },
  '450-1': { numero: '450-1', libelle: 'Copropriétaires - Budget prévisionnel', description: 'Part opérations courantes' },
  '450-2': { numero: '450-2', libelle: 'Copropriétaires - Travaux art. 14-2', description: 'Part travaux et opérations exceptionnelles' },
  '450-3': { numero: '450-3', libelle: 'Copropriétaires - Avances', description: 'Part avances' },
  '450-4': { numero: '450-4', libelle: 'Copropriétaires - Emprunts', description: 'Part remboursement emprunts' },
  '450-5': { numero: '450-5', libelle: 'Copropriétaires - Fonds de travaux ALUR', description: 'Part fonds ALUR' },
  '459': { numero: '459', libelle: 'Copropriétaires - Créances douteuses', description: 'Impayés transférés en douteux' },

  // 46x - Débiteurs et créditeurs divers
  '461': { numero: '461', libelle: 'Débiteurs divers', description: 'Locataires, assurances à recevoir' },
  '462': { numero: '462', libelle: 'Créditeurs divers', description: 'Sommes dues à des tiers non-fournisseurs' },

  // 47x - Comptes d'attente
  '471': { numero: '471', libelle: 'Attente d\'imputation débiteur', description: 'Mouvement bancaire non identifié (débit)' },
  '472': { numero: '472', libelle: 'Attente d\'imputation créditeur', description: 'Mouvement bancaire non identifié (crédit)' },

  // 48x - Comptes de régularisation
  '486': { numero: '486', libelle: 'Charges constatées d\'avance', description: 'Charges payées sur N mais concernant N+1' },
  '487': { numero: '487', libelle: 'Produits encaissés d\'avance', description: 'Produits reçus sur N mais concernant N+1' },

  // 49x - Dépréciations
  '491': { numero: '491', libelle: 'Dépréciation - Copropriétaires', description: 'Provision pour impayés copropriétaires' },
  '492': { numero: '492', libelle: 'Dépréciation - Autres tiers', description: 'Provision pour impayés autres' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 5 - COMPTES FINANCIERS (TRÉSORERIE)
  // ═══════════════════════════════════════════════════════════════════════════
  '50': { numero: '50', libelle: 'Fonds placés', description: 'Placements financiers' },
  '501': { numero: '501', libelle: 'Compte à terme', description: 'Placements à terme' },
  '502': { numero: '502', libelle: 'Livret A (fonds travaux)', description: 'Placement obligatoire fonds ALUR' },
  '51': { numero: '51', libelle: 'Banques et établissements financiers', description: 'Comptes bancaires' },
  '512': { numero: '512', libelle: 'Banque', description: 'Compte courant du syndicat' },
  '514': { numero: '514', libelle: 'Chèques postaux', description: 'Compte postal' },
  '53': { numero: '53', libelle: 'Caisse', description: 'Espèces' },
  '531': { numero: '531', libelle: 'Caisse', description: 'Espèces en caisse' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 6 - COMPTES DE CHARGES
  // ═══════════════════════════════════════════════════════════════════════════

  // 60x - Achats
  '60': { numero: '60', libelle: 'Achats', description: 'Achats de fournitures et fluides' },
  '601': { numero: '601', libelle: 'Eau', description: 'Consommation d\'eau' },
  '602': { numero: '602', libelle: 'Électricité', description: 'Électricité parties communes' },
  '603': { numero: '603', libelle: 'Chauffage, énergie et combustibles', description: 'Chauffage collectif' },
  '604': { numero: '604', libelle: 'Achats produits d\'entretien et petits équipements', description: 'Fournitures et petit matériel' },

  // 61x - Services extérieurs
  '61': { numero: '61', libelle: 'Services extérieurs', description: 'Prestations de services' },
  '611': { numero: '611', libelle: 'Nettoyage des locaux', description: 'Contrat ou prestation ménage' },
  '612': { numero: '612', libelle: 'Locations immobilières', description: 'Locaux loués' },
  '613': { numero: '613', libelle: 'Locations mobilières', description: 'Matériel en location' },
  '614': { numero: '614', libelle: 'Contrats de maintenance', description: 'Ascenseur, chaudière, VMC, portail' },
  '615': { numero: '615', libelle: 'Entretien et petites réparations', description: 'Interventions ponctuelles' },
  '616': { numero: '616', libelle: 'Primes d\'assurances', description: 'Assurance MRH immeuble, RC syndic' },
  '617': { numero: '617', libelle: 'Frais de personnel', description: 'Gardien, employé d\'immeuble' },

  // 62x - Frais d'administration et honoraires
  '62': { numero: '62', libelle: 'Frais d\'administration et honoraires', description: 'Frais de gestion' },
  '621': { numero: '621', libelle: 'Rémunération du syndic - gestion copropriété', description: 'Honoraires de gestion' },
  '6211': { numero: '6211', libelle: 'Rémunération forfaitaire du syndic', description: 'Honoraires de base annuels' },
  '6212': { numero: '6212', libelle: 'Débours', description: 'Frais avancés par le syndic' },
  '6213': { numero: '6213', libelle: 'Frais postaux', description: 'Courriers, recommandés' },
  '622': { numero: '622', libelle: 'Autres honoraires du syndic', description: 'Prestations hors forfait' },
  '6221': { numero: '6221', libelle: 'Honoraires travaux', description: 'Suivi de travaux' },
  '6222': { numero: '6222', libelle: 'Prestations particulières', description: 'Prestations hors forfait syndic' },
  '623': { numero: '623', libelle: 'Rémunérations de tiers intervenants', description: 'Avocats, huissiers, experts' },
  '624': { numero: '624', libelle: 'Frais du conseil syndical', description: 'Dépenses du CS' },
  '625': { numero: '625', libelle: 'Honoraires', description: 'Commissaire aux comptes, géomètre' },
  '627': { numero: '627', libelle: 'Frais d\'assemblées générales', description: 'Salle, reprographie, etc.' },
  '628': { numero: '628', libelle: 'Frais divers de gestion', description: 'Autres frais administratifs' },

  // 63x - Impôts et taxes
  '63': { numero: '63', libelle: 'Impôts et taxes', description: 'Impôts et taxes diverses' },
  '632': { numero: '632', libelle: 'Taxe de balayage', description: 'Taxe de balayage' },
  '633': { numero: '633', libelle: 'Taxe foncière', description: 'Taxe foncière sur parties communes' },
  '634': { numero: '634', libelle: 'Autres impôts et taxes', description: 'Taxes diverses' },

  // 66x - Charges financières
  '66': { numero: '66', libelle: 'Charges financières', description: 'Intérêts et frais financiers' },
  '661': { numero: '661', libelle: 'Remboursement annuités d\'emprunt', description: 'Capital + intérêts emprunt collectif' },
  '662': { numero: '662', libelle: 'Autres charges financières et agios', description: 'Frais bancaires' },

  // 67x - Charges pour travaux et opérations exceptionnelles
  '67': { numero: '67', libelle: 'Charges pour travaux et opérations exceptionnelles', description: 'Travaux et opérations hors budget courant' },
  '671': { numero: '671', libelle: 'Travaux décidés par l\'AG', description: 'Gros travaux votés en assemblée' },
  '672': { numero: '672', libelle: 'Travaux urgents (art. 18)', description: 'Travaux urgents sans vote AG' },
  '673': { numero: '673', libelle: 'Études techniques, diagnostics, consultations', description: 'Diagnostics obligatoires, études' },
  '674': { numero: '674', libelle: 'Travaux délégués au conseil syndical', description: 'Art. 21 délégation de pouvoir' },
  '678': { numero: '678', libelle: 'Autres opérations exceptionnelles', description: 'Opérations exceptionnelles diverses' },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSE 7 - COMPTES DE PRODUITS
  // ═══════════════════════════════════════════════════════════════════════════

  // 70x - Appels de fonds
  '70': { numero: '70', libelle: 'Appels de fonds', description: 'Contributions des copropriétaires' },
  '701': { numero: '701', libelle: 'Provisions sur opérations courantes', description: 'Appels trimestriels budget prévisionnel' },
  '702': { numero: '702', libelle: 'Provisions sur travaux et opérations exceptionnelles', description: 'Appels pour travaux votés en AG' },
  '703': { numero: '703', libelle: 'Avances', description: 'Appels pour reconstituer les avances' },
  '704': { numero: '704', libelle: 'Remboursements d\'annuités d\'emprunts', description: 'Quote-part emprunt appelée' },
  '705': { numero: '705', libelle: 'Affectation du fonds de travaux', description: 'Utilisation fonds ALUR pour financer travaux' },
  '706': { numero: '706', libelle: 'Provisions délégation de pouvoirs au CS', description: 'Provisions sur délégation conseil syndical' },

  // 71x - Autres produits
  '71': { numero: '71', libelle: 'Autres produits', description: 'Revenus divers' },
  '711': { numero: '711', libelle: 'Subventions', description: 'Subventions obtenues (ANAH, etc.)' },
  '713': { numero: '713', libelle: 'Indemnités d\'assurances', description: 'Sinistres remboursés' },
  '714': { numero: '714', libelle: 'Produits divers', description: 'Location antennes, parking visiteurs' },
  '716': { numero: '716', libelle: 'Produits financiers', description: 'Intérêts des placements (Livret A, etc.)' },
};

/**
 * Trouve le libellé d'un compte comptable
 * Recherche d'abord une correspondance exacte, puis par préfixe décroissant
 */
export const getCompteLibelle = (numeroCompte: string): string => {
  if (PLAN_COMPTABLE_COPROPRIETE[numeroCompte]) {
    return PLAN_COMPTABLE_COPROPRIETE[numeroCompte].libelle;
  }

  for (let i = numeroCompte.length - 1; i >= 1; i--) {
    const prefix = numeroCompte.substring(0, i);
    if (PLAN_COMPTABLE_COPROPRIETE[prefix]) {
      return PLAN_COMPTABLE_COPROPRIETE[prefix].libelle;
    }
  }

  const classe = numeroCompte.charAt(0);
  switch (classe) {
    case '1': return 'Provisions et avances';
    case '4': return 'Tiers';
    case '5': return 'Financiers';
    case '6': return 'Charges';
    case '7': return 'Produits';
    default: return 'Compte inconnu';
  }
};

/**
 * Trouve le compte complet (numéro + libellé + description)
 */
export const getCompteDetails = (numeroCompte: string): CompteComptable | undefined => {
  if (PLAN_COMPTABLE_COPROPRIETE[numeroCompte]) {
    return PLAN_COMPTABLE_COPROPRIETE[numeroCompte];
  }

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
 */
export const formatCompteAvecLibelle = (numeroCompte: string): string => {
  const libelle = getCompteLibelle(numeroCompte);
  return `${numeroCompte} - ${libelle}`;
};

/**
 * Labels des classes comptables (copropriété = classes 1, 4, 5, 6, 7 uniquement)
 */
export const CLASSES_COMPTABLES: Record<string, string> = {
  '1': 'Classe 1 - Provisions, avances, subventions et emprunts',
  '4': 'Classe 4 - Comptes de tiers',
  '5': 'Classe 5 - Comptes financiers',
  '6': 'Classe 6 - Comptes de charges',
  '7': 'Classe 7 - Comptes de produits',
};

/**
 * Obtient la description de la classe d'un compte
 */
export const getClasseCompte = (numeroCompte: string): string => {
  const classe = numeroCompte.charAt(0);
  return CLASSES_COMPTABLES[classe] || 'Classe inconnue';
};
