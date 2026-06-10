import { LigneBalance } from './types';

/**
 * Familles simplifiées pour la vue copropriétaire
 */
export type FamilleBalance = 'charges-courantes' | 'travaux' | 'fonds-travaux' | 'tresorerie' | 'autres';

export interface FamilleConfig {
  id: FamilleBalance;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: 'blue' | 'orange' | 'green' | 'purple' | 'gray';
}

export const FAMILLES_CONFIG: Record<FamilleBalance, FamilleConfig> = {
  'charges-courantes': {
    id: 'charges-courantes',
    label: 'Charges courantes',
    description: 'Dépenses régulières pour le fonctionnement de l\'immeuble',
    icon: 'Receipt',
    color: 'blue'
  },
  'travaux': {
    id: 'travaux',
    label: 'Travaux',
    description: 'Travaux d\'entretien, rénovation et amélioration',
    icon: 'Wrench',
    color: 'orange'
  },
  'fonds-travaux': {
    id: 'fonds-travaux',
    label: 'Fonds travaux (ALUR)',
    description: 'Épargne obligatoire pour les futurs travaux',
    icon: 'PiggyBank',
    color: 'green'
  },
  'tresorerie': {
    id: 'tresorerie',
    label: 'Trésorerie',
    description: 'Argent disponible sur les comptes',
    icon: 'Wallet',
    color: 'purple'
  },
  'autres': {
    id: 'autres',
    label: 'Autres',
    description: 'Autres éléments comptables',
    icon: 'MoreHorizontal',
    color: 'gray'
  }
};

/**
 * Sous-catégories avec labels simplifiés pour le drill-down
 */
export interface SousCategorie {
  id: string;
  label: string;
  explication: string;
}

export const SOUS_CATEGORIES: Record<string, SousCategorie> = {
  // Charges courantes
  '606': { id: '606', label: 'Eau et électricité', explication: 'Consommations des parties communes' },
  '611': { id: '611', label: 'Petites réparations', explication: 'Réparations courantes de l\'immeuble' },
  '614': { id: '614', label: 'Gardien / Personnel', explication: 'Salaires et charges du personnel' },
  '615': { id: '615', label: 'Entretien', explication: 'Contrats d\'entretien (ascenseur, chaudière...)' },
  '616': { id: '616', label: 'Assurance', explication: 'Assurance multirisque immeuble' },
  '617': { id: '617', label: 'Honoraires syndic', explication: 'Gestion de la copropriété' },
  '622': { id: '622', label: 'Honoraires syndic', explication: 'Honoraires de gestion courante' },
  '626': { id: '626', label: 'Frais administratifs', explication: 'Courriers, envois, téléphone' },
  '627': { id: '627', label: 'Frais bancaires', explication: 'Frais de tenue de compte' },
  '628': { id: '628', label: 'Divers', explication: 'Autres frais de fonctionnement' },
  // Travaux
  '102': { id: '102', label: 'Provisions travaux', explication: 'Argent mis de côté pour les travaux votés' },
  '713': { id: '713', label: 'Appels travaux', explication: 'Sommes appelées pour financer les travaux' },
  '71': { id: '71', label: 'Produits travaux', explication: 'Financements des travaux' },
  '67': { id: '67', label: 'Dépenses exceptionnelles', explication: 'Travaux et charges exceptionnels' },
  // Fonds travaux ALUR
  '105': { id: '105', label: 'Fonds travaux ALUR', explication: 'Épargne obligatoire (min. 5% du budget)' },
  '703': { id: '703', label: 'Cotisation fonds travaux', explication: 'Versements au fonds ALUR' },
  // Trésorerie
  '512': { id: '512', label: 'Compte bancaire', explication: 'Argent disponible en banque' },
  '514': { id: '514', label: 'Compte postal', explication: 'Argent sur CCP' },
  '531': { id: '531', label: 'Caisse', explication: 'Espèces disponibles' },
  '532': { id: '532', label: 'Placements', explication: 'Épargne placée' },
  // Copropriétaires
  '450': { id: '450', label: 'Créances copropriétaires', explication: 'Ce que les copropriétaires doivent' },
  '459': { id: '459', label: 'Avances copropriétaires', explication: 'Trop-perçu des copropriétaires' },
  // Fournisseurs
  '401': { id: '401', label: 'Dettes fournisseurs', explication: 'Factures à payer' },
  // Appels de fonds
  '701': { id: '701', label: 'Appels de provisions', explication: 'Provisions trimestrielles appelées' },
};

/**
 * Ligne de balance transformée pour la vue copropriétaire
 */
export interface LigneBalanceCopro {
  compte: string;
  label: string;
  explication: string;
  famille: FamilleBalance;
  montant: number; // Solde net (débit - crédit ou crédit - débit selon contexte)
  sens: 'positif' | 'negatif' | 'neutre';
  ligneOriginale: LigneBalance;
}

/**
 * Groupe de famille avec ses lignes et totaux
 */
export interface GroupeFamille {
  config: FamilleConfig;
  lignes: LigneBalanceCopro[];
  total: number;
  expanded: boolean;
}

/**
 * Détermine la famille d'un compte
 */
export function getFamille(compte: string): FamilleBalance {
  const prefix = compte.substring(0, 3);
  const prefix2 = compte.substring(0, 2);
  const classe = compte.charAt(0);

  // Fonds travaux ALUR
  if (prefix === '105' || prefix === '703') {
    return 'fonds-travaux';
  }

  // Travaux
  if (prefix === '102' || prefix2 === '71' || prefix === '713' || prefix2 === '67') {
    return 'travaux';
  }

  // Trésorerie
  if (classe === '5') {
    return 'tresorerie';
  }

  // Charges courantes (classe 6 sauf exceptionnelles)
  if (classe === '6' && prefix2 !== '67') {
    return 'charges-courantes';
  }

  // Produits courants (classe 7 hors travaux)
  if (prefix === '701' || prefix === '704') {
    return 'charges-courantes';
  }

  return 'autres';
}

/**
 * Récupère le label simplifié pour un compte
 */
export function getLabelSimplifie(compte: string, labelOriginal: string): { label: string; explication: string } {
  // Chercher correspondance exacte
  if (SOUS_CATEGORIES[compte]) {
    return {
      label: SOUS_CATEGORIES[compte].label,
      explication: SOUS_CATEGORIES[compte].explication
    };
  }

  // Chercher par préfixe décroissant
  for (let i = compte.length - 1; i >= 2; i--) {
    const prefix = compte.substring(0, i);
    if (SOUS_CATEGORIES[prefix]) {
      return {
        label: SOUS_CATEGORIES[prefix].label,
        explication: SOUS_CATEGORIES[prefix].explication
      };
    }
  }

  // Fallback : simplifier le label original
  return {
    label: simplifierLabel(labelOriginal),
    explication: labelOriginal
  };
}

/**
 * Simplifie un libellé comptable pour le rendre plus lisible
 */
function simplifierLabel(label: string): string {
  // Retirer les préfixes techniques courants
  const simplified = label
    .replace(/^Compte\s+/i, '')
    .replace(/^Cpte\s+/i, '')
    .replace(/copropriétaires?/gi, 'copros')
    .replace(/provisions?\s+pour/gi, 'provision')
    .replace(/\s+de\s+la\s+copropriété/gi, '')
    .replace(/\s+des\s+parties\s+communes/gi, '');

  // Première lettre en majuscule
  return simplified.charAt(0).toUpperCase() + simplified.slice(1);
}

/**
 * Calcule le montant net d'une ligne pour l'affichage simplifié
 * Positif = favorable, Négatif = défavorable du point de vue copropriétaire
 */
export function calculerMontantNet(ligne: LigneBalance): { montant: number; sens: 'positif' | 'negatif' | 'neutre' } {
  const famille = getFamille(ligne.compte);
  let montant = 0;
  let sens: 'positif' | 'negatif' | 'neutre' = 'neutre';

  switch (famille) {
    case 'tresorerie':
      // Trésorerie : débit = positif (argent disponible)
      montant = ligne.soldeClotureDebit - ligne.soldeClotureCredit;
      sens = montant > 0 ? 'positif' : montant < 0 ? 'negatif' : 'neutre';
      break;

    case 'fonds-travaux':
      // Fonds travaux : crédit = positif (épargne accumulée)
      montant = ligne.soldeClotureCredit - ligne.soldeClotureDebit;
      sens = montant > 0 ? 'positif' : montant < 0 ? 'negatif' : 'neutre';
      break;

    case 'charges-courantes':
      // Charges : débit = dépenses (neutre, c'est normal)
      montant = ligne.soldeClotureDebit - ligne.soldeClotureCredit;
      sens = 'neutre';
      break;

    case 'travaux':
      // Travaux : montant absolu, neutre
      montant = Math.abs(ligne.soldeClotureDebit - ligne.soldeClotureCredit);
      sens = 'neutre';
      break;

    default:
      // Autres : montant net, sens selon signe
      montant = ligne.soldeClotureDebit - ligne.soldeClotureCredit;
      sens = montant > 0 ? 'positif' : montant < 0 ? 'negatif' : 'neutre';
  }

  return { montant, sens };
}

/**
 * Transforme les lignes de balance en vue copropriétaire
 */
export function transformerBalancePourCopro(lignesBalance: LigneBalance[]): GroupeFamille[] {
  // Transformer chaque ligne
  const lignesCopro: LigneBalanceCopro[] = lignesBalance
    .filter(ligne => {
      // Exclure les comptes à solde nul
      const hasSolde = ligne.soldeClotureDebit !== 0 || ligne.soldeClotureCredit !== 0;
      return hasSolde;
    })
    .map(ligne => {
      const { label, explication } = getLabelSimplifie(ligne.compte, ligne.compteLabel);
      const { montant, sens } = calculerMontantNet(ligne);

      return {
        compte: ligne.compte,
        label,
        explication,
        famille: getFamille(ligne.compte),
        montant,
        sens,
        ligneOriginale: ligne
      };
    });

  // Grouper par famille
  const groupes: Record<FamilleBalance, LigneBalanceCopro[]> = {
    'charges-courantes': [],
    'travaux': [],
    'fonds-travaux': [],
    'tresorerie': [],
    'autres': []
  };

  lignesCopro.forEach(ligne => {
    groupes[ligne.famille].push(ligne);
  });

  // Construire les GroupeFamille avec totaux
  const ordreAffichage: FamilleBalance[] = ['charges-courantes', 'travaux', 'fonds-travaux', 'tresorerie', 'autres'];

  return ordreAffichage
    .map(familleId => {
      const lignes = groupes[familleId];
      const total = lignes.reduce((sum, l) => sum + l.montant, 0);

      return {
        config: FAMILLES_CONFIG[familleId],
        lignes: lignes.sort((a, b) => Math.abs(b.montant) - Math.abs(a.montant)), // Plus gros montants en premier
        total,
        expanded: false
      };
    })
    .filter(groupe => groupe.lignes.length > 0); // Exclure les familles vides
}

/**
 * Calcule les totaux globaux pour l'affichage simplifié
 */
export interface TotauxCopro {
  totalCharges: number;
  totalTravaux: number;
  fondsTravaux: number;
  tresorerieDisponible: number;
}

export function calculerTotauxCopro(groupes: GroupeFamille[]): TotauxCopro {
  const totaux: TotauxCopro = {
    totalCharges: 0,
    totalTravaux: 0,
    fondsTravaux: 0,
    tresorerieDisponible: 0
  };

  groupes.forEach(groupe => {
    switch (groupe.config.id) {
      case 'charges-courantes':
        totaux.totalCharges = groupe.total;
        break;
      case 'travaux':
        totaux.totalTravaux = groupe.total;
        break;
      case 'fonds-travaux':
        totaux.fondsTravaux = groupe.total;
        break;
      case 'tresorerie':
        totaux.tresorerieDisponible = groupe.total;
        break;
    }
  });

  return totaux;
}
