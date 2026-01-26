import { OperationComptable, Depense, HistoriqueModification, TypeCompte, LigneBalance } from './types';
import { MOCK_OPERATIONS, MOCK_DEPENSES } from './data';

/**
 * Plan Comptable Copropriété - Classification des comptes par type
 * Basé sur le décret n° 2005-240 du 14 mars 2005
 */
export const PLAN_COMPTABLE: Record<string, { libelle: string; type: TypeCompte }> = {
  // Classe 1 - Capitaux (PASSIF)
  '10': { libelle: 'Provisions et avances', type: 'PASSIF' },
  '102': { libelle: 'Provisions pour travaux', type: 'PASSIF' },
  '103': { libelle: 'Avances', type: 'PASSIF' },
  '105': { libelle: 'Fonds de travaux ALUR', type: 'PASSIF' },
  '12': { libelle: 'Solde en attente sur travaux', type: 'PASSIF' },
  '13': { libelle: 'Solde en attente sur opérations courantes', type: 'PASSIF' },

  // Classe 4 - Tiers
  '401': { libelle: 'Fournisseurs', type: 'PASSIF' },
  '408': { libelle: 'Fournisseurs - Factures non parvenues', type: 'PASSIF' },
  '421': { libelle: 'Personnel - Rémunérations dues', type: 'PASSIF' },
  '431': { libelle: 'Sécurité sociale', type: 'PASSIF' },
  '437': { libelle: 'Autres organismes sociaux', type: 'PASSIF' },
  '442': { libelle: 'État - Impôts et taxes', type: 'PASSIF' },
  '450': { libelle: 'Copropriétaires', type: 'ACTIF' }, // Créances sur copropriétaires = ACTIF
  '459': { libelle: 'Copropriétaires - Créditeurs', type: 'PASSIF' },
  '462': { libelle: 'Créances sur cessions d\'éléments d\'actifs', type: 'ACTIF' },
  '467': { libelle: 'Autres comptes débiteurs ou créditeurs', type: 'ACTIF' },
  '471': { libelle: 'Compte d\'attente', type: 'ACTIF' },
  '472': { libelle: 'Compte de répartition périodique', type: 'PASSIF' },
  '486': { libelle: 'Charges constatées d\'avance', type: 'ACTIF' },
  '487': { libelle: 'Produits constatés d\'avance', type: 'PASSIF' },

  // Classe 5 - Financiers (ACTIF)
  '512': { libelle: 'Banque', type: 'ACTIF' },
  '514': { libelle: 'Chèques postaux', type: 'ACTIF' },
  '531': { libelle: 'Caisse', type: 'ACTIF' },
  '532': { libelle: 'Placements', type: 'ACTIF' },

  // Classe 6 - Charges (CHARGE = se comporte comme ACTIF pour débit/crédit)
  '60': { libelle: 'Achats', type: 'CHARGE' },
  '601': { libelle: 'Achats de fournitures', type: 'CHARGE' },
  '602': { libelle: 'Achats non stockés', type: 'CHARGE' },
  '606': { libelle: 'Eau et électricité', type: 'CHARGE' },
  '61': { libelle: 'Services extérieurs', type: 'CHARGE' },
  '611': { libelle: 'Entretien et petites réparations', type: 'CHARGE' },
  '612': { libelle: 'Locations', type: 'CHARGE' },
  '614': { libelle: 'Charges de personnel', type: 'CHARGE' },
  '615': { libelle: 'Entretien et réparations', type: 'CHARGE' },
  '616': { libelle: 'Primes d\'assurance', type: 'CHARGE' },
  '617': { libelle: 'Honoraires', type: 'CHARGE' },
  '62': { libelle: 'Autres services extérieurs', type: 'CHARGE' },
  '622': { libelle: 'Honoraires syndic', type: 'CHARGE' },
  '623': { libelle: 'Publicité, publications', type: 'CHARGE' },
  '625': { libelle: 'Déplacements, missions', type: 'CHARGE' },
  '626': { libelle: 'Frais postaux et télécommunications', type: 'CHARGE' },
  '627': { libelle: 'Services bancaires', type: 'CHARGE' },
  '628': { libelle: 'Divers', type: 'CHARGE' },
  '63': { libelle: 'Impôts et taxes', type: 'CHARGE' },
  '64': { libelle: 'Charges de personnel', type: 'CHARGE' },
  '65': { libelle: 'Charges diverses', type: 'CHARGE' },
  '66': { libelle: 'Charges financières', type: 'CHARGE' },
  '67': { libelle: 'Charges exceptionnelles', type: 'CHARGE' },
  '68': { libelle: 'Dotations aux amortissements et provisions', type: 'CHARGE' },
  '681': { libelle: 'Dotations aux provisions', type: 'CHARGE' },

  // Classe 7 - Produits (PRODUIT)
  '70': { libelle: 'Produits des opérations courantes', type: 'PRODUIT' },
  '701': { libelle: 'Appels de fonds', type: 'PRODUIT' },
  '702': { libelle: 'Provisions travaux', type: 'PRODUIT' },
  '703': { libelle: 'Fonds de travaux ALUR', type: 'PRODUIT' },
  '704': { libelle: 'Remboursements d\'assurance', type: 'PRODUIT' },
  '71': { libelle: 'Produits travaux', type: 'PRODUIT' },
  '713': { libelle: 'Appels travaux', type: 'PRODUIT' },
  '76': { libelle: 'Produits financiers', type: 'PRODUIT' },
  '77': { libelle: 'Produits exceptionnels', type: 'PRODUIT' },
  '78': { libelle: 'Reprises sur provisions', type: 'PRODUIT' },
};

/**
 * Récupère le type de compte à partir du numéro de compte
 * Recherche d'abord une correspondance exacte, puis par préfixe décroissant
 */
export const getTypeCompte = (numeroCompte: string): TypeCompte => {
  // Correspondance exacte
  if (PLAN_COMPTABLE[numeroCompte]) {
    return PLAN_COMPTABLE[numeroCompte].type;
  }

  // Recherche par préfixe (du plus spécifique au plus général)
  for (let i = numeroCompte.length - 1; i >= 1; i--) {
    const prefix = numeroCompte.substring(0, i);
    if (PLAN_COMPTABLE[prefix]) {
      return PLAN_COMPTABLE[prefix].type;
    }
  }

  // Détermination par classe (premier chiffre)
  const classe = numeroCompte.charAt(0);
  switch (classe) {
    case '1': return 'PASSIF';  // Capitaux
    case '2': return 'ACTIF';   // Immobilisations
    case '3': return 'ACTIF';   // Stocks
    case '4': return 'ACTIF';   // Tiers (par défaut créances)
    case '5': return 'ACTIF';   // Financiers
    case '6': return 'CHARGE';  // Charges
    case '7': return 'PRODUIT'; // Produits
    default: return 'ACTIF';    // Par défaut
  }
};

/**
 * Calcule la variation du solde selon les règles comptables françaises
 *
 * Règles:
 * - ACTIF/CHARGE: Débit augmente le solde, Crédit diminue le solde
 * - PASSIF/PRODUIT: Crédit augmente le solde, Débit diminue le solde
 */
export const calculateSoldeVariation = (
  typeCompte: TypeCompte,
  debit: number,
  credit: number
): number => {
  switch (typeCompte) {
    case 'ACTIF':
    case 'CHARGE':
      // Débit = +, Crédit = -
      return debit - credit;
    case 'PASSIF':
    case 'PRODUIT':
      // Crédit = +, Débit = -
      return credit - debit;
  }
};

/**
 * Calcule les soldes running pour une liste d'opérations triées par date
 * Retourne une nouvelle liste avec les soldes calculés correctement
 *
 * IMPORTANT: Les opérations doivent être regroupées par compte pour un solde cohérent
 */
export const calculateRunningBalances = (
  operations: OperationComptable[],
  soldeInitial: number = 0
): OperationComptable[] => {
  // Trier par date chronologique (plus ancien en premier)
  const sorted = [...operations].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let soldeCourant = soldeInitial;

  return sorted.map(op => {
    const variation = calculateSoldeVariation(op.typeCompte, op.debit, op.credit);
    soldeCourant += variation;
    return { ...op, solde: soldeCourant };
  });
};

/**
 * Calcule les soldes par compte (Grand Livre par compte)
 * Chaque compte a son propre solde running
 */
export const calculateBalancesByAccount = (
  operations: OperationComptable[]
): Map<string, OperationComptable[]> => {
  // Grouper par compte
  const byAccount = new Map<string, OperationComptable[]>();

  operations.forEach(op => {
    const ops = byAccount.get(op.compte) || [];
    ops.push(op);
    byAccount.set(op.compte, ops);
  });

  // Calculer les soldes pour chaque compte
  const result = new Map<string, OperationComptable[]>();

  byAccount.forEach((ops, compte) => {
    result.set(compte, calculateRunningBalances(ops, 0));
  });

  return result;
};

/**
 * Calcule les soldes pour un Grand Livre général (tous comptes confondus)
 * En triant par date et en calculant un solde running global
 * Utilisé pour afficher une vue chronologique de toutes les opérations
 */
export const calculateGrandLivreBalances = (
  operations: OperationComptable[],
  soldeInitial: number = 0
): OperationComptable[] => {
  // Trier par date décroissante (plus récent en premier) pour l'affichage
  // mais calculer les soldes en ordre chronologique
  const sortedChronological = [...operations].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculer les soldes en ordre chronologique
  let soldeCourant = soldeInitial;
  const withBalances = sortedChronological.map(op => {
    const variation = calculateSoldeVariation(op.typeCompte, op.debit, op.credit);
    soldeCourant += variation;
    return { ...op, solde: soldeCourant };
  });

  // Retourner en ordre décroissant (plus récent en premier) pour l'affichage
  return withBalances.reverse();
};

export const getActionLabel = (action: HistoriqueModification['action']): string => {
  switch (action) {
    case 'CREATION': return 'Création';
    case 'MODIFICATION': return 'Modification';
    case 'SUPPRESSION': return 'Suppression';
    case 'VALIDATION': return 'Validation';
    case 'CATEGORISATION': return 'Catégorisation';
  }
};

export const getActionColor = (action: HistoriqueModification['action']): string => {
  switch (action) {
    case 'CREATION': return 'var(--success)';
    case 'MODIFICATION': return 'var(--warning)';
    case 'SUPPRESSION': return 'var(--danger)';
    case 'VALIDATION': return 'var(--success)';
    case 'CATEGORISATION': return 'var(--primary)';
  }
};

export interface ComptaFilters {
  searchTerm: string;
  dateDebut: string;
  dateFin: string;
  compteFilter: string;
  typeDepenseFilter: string;
}

export const filterOperations = (
  operations: OperationComptable[],
  filters: ComptaFilters
): OperationComptable[] => {
  return operations.filter(op => {
    const matchesSearch =
      op.libelle.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      op.compte.includes(filters.searchTerm) ||
      op.compteLabel.toLowerCase().includes(filters.searchTerm.toLowerCase());

    const matchesDate =
      (!filters.dateDebut || op.date >= filters.dateDebut) &&
      (!filters.dateFin || op.date <= filters.dateFin);

    const matchesCompte = filters.compteFilter === 'TOUS' || op.compte === filters.compteFilter;

    return matchesSearch && matchesDate && matchesCompte;
  });
};

export const filterDepenses = (
  depenses: Depense[],
  filters: ComptaFilters
): Depense[] => {
  return depenses.filter(dep => {
    const matchesSearch =
      dep.libelle.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      dep.fournisseur.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      dep.montant.toString().includes(filters.searchTerm);

    const matchesDate =
      (!filters.dateDebut || dep.date >= filters.dateDebut) &&
      (!filters.dateFin || dep.date <= filters.dateFin);

    const matchesType = filters.typeDepenseFilter === 'TOUS' || dep.typeDepense === filters.typeDepenseFilter;

    return matchesSearch && matchesDate && matchesType;
  });
};

/**
 * Résultat de la validation de l'équilibre comptable
 */
export interface EquilibreComptable {
  totalDebit: number;
  totalCredit: number;
  solde: number;
  isBalanced: boolean;
  ecart: number;
}

/**
 * Calcule les totaux des opérations selon les règles comptables
 * En partie double : Total Débits DOIT TOUJOURS = Total Crédits
 *
 * @returns Object avec totaux, solde, équilibre et écart éventuel
 */
export const calculateOperationTotals = (operations: OperationComptable[]): EquilibreComptable => {
  const totalDebit = operations.reduce((sum, op) => sum + op.debit, 0);
  const totalCredit = operations.reduce((sum, op) => sum + op.credit, 0);

  // Calculer le solde en respectant les règles comptables pour chaque opération
  const solde = operations.reduce((sum, op) => {
    return sum + calculateSoldeVariation(op.typeCompte, op.debit, op.credit);
  }, 0);

  // Validation partie double : tolérance de 0.01€ pour les arrondis
  const ecart = Math.abs(totalDebit - totalCredit);
  const isBalanced = ecart < 0.01;

  return { totalDebit, totalCredit, solde, isBalanced, ecart };
};

/**
 * Vérifie si une nouvelle écriture respecte la partie double
 * Retourne true si l'écriture est équilibrée (débit = crédit)
 */
export const validatePartieDouble = (debit: number, credit: number): boolean => {
  return Math.abs(debit - credit) < 0.01;
};

export const calculateDepenseTotals = (depenses: Depense[]) => {
  const totalDepenses = depenses.reduce((sum, dep) => sum + dep.montant, 0);
  const totalBudgetPrevu = depenses.reduce((sum, dep) => sum + (dep.budgetPrevu || 0), 0);
  return { totalDepenses, totalBudgetPrevu, ecart: totalBudgetPrevu - totalDepenses };
};

export const getComptesUniques = (): string[] => {
  return Array.from(new Set(MOCK_OPERATIONS.map(op => op.compte)));
};

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR');
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Calcule la balance comptable à partir des opérations
 * Regroupe par compte et calcule soldes d'ouverture, mouvements, et soldes de clôture
 *
 * @param operations - Liste des opérations comptables
 * @param soldesOuverture - Map des soldes d'ouverture par compte (optionnel)
 * @param soldesN1 - Map des soldes N-1 par compte pour comparaison (optionnel)
 * @returns Liste des lignes de balance triées par numéro de compte
 */
export const calculateBalance = (
  operations: OperationComptable[],
  soldesOuverture?: Map<string, { debit: number; credit: number }>,
  soldesN1?: Map<string, { debit: number; credit: number }>
): LigneBalance[] => {
  // Regrouper les opérations par compte
  const comptesMap = new Map<string, {
    compteLabel: string;
    typeCompte: TypeCompte;
    totalDebit: number;
    totalCredit: number;
  }>();

  operations.forEach(op => {
    const existing = comptesMap.get(op.compte);
    if (existing) {
      existing.totalDebit += op.debit;
      existing.totalCredit += op.credit;
    } else {
      comptesMap.set(op.compte, {
        compteLabel: op.compteLabel,
        typeCompte: op.typeCompte,
        totalDebit: op.debit,
        totalCredit: op.credit
      });
    }
  });

  // Construire les lignes de balance
  const lignesBalance: LigneBalance[] = [];

  comptesMap.forEach((data, compte) => {
    // Récupérer le solde d'ouverture (par défaut 0)
    const soldeOuv = soldesOuverture?.get(compte) || { debit: 0, credit: 0 };

    // Calculer le solde de clôture
    // En partie double : solde = (ouverture débit + mouvement débit) - (ouverture crédit + mouvement crédit)
    const totalDebit = soldeOuv.debit + data.totalDebit;
    const totalCredit = soldeOuv.credit + data.totalCredit;

    // Le solde de clôture est exprimé en débit ou crédit selon le sens
    let soldeClotureDebit = 0;
    let soldeClotureCredit = 0;

    if (totalDebit > totalCredit) {
      soldeClotureDebit = totalDebit - totalCredit;
    } else {
      soldeClotureCredit = totalCredit - totalDebit;
    }

    // Comparaison N-1
    const soldeN1Data = soldesN1?.get(compte);
    let variationPourcent: number | undefined;
    if (soldeN1Data) {
      const soldeN1Total = soldeN1Data.debit - soldeN1Data.credit;
      const soldeCourantTotal = soldeClotureDebit - soldeClotureCredit;
      if (soldeN1Total !== 0) {
        variationPourcent = ((soldeCourantTotal - soldeN1Total) / Math.abs(soldeN1Total)) * 100;
      }
    }

    lignesBalance.push({
      compte,
      compteLabel: data.compteLabel,
      typeCompte: data.typeCompte,
      classe: compte.charAt(0),
      soldeOuvertureDebit: soldeOuv.debit,
      soldeOuvertureCredit: soldeOuv.credit,
      mouvementDebit: data.totalDebit,
      mouvementCredit: data.totalCredit,
      soldeClotureDebit,
      soldeClotureCredit,
      soldeN1Debit: soldeN1Data?.debit,
      soldeN1Credit: soldeN1Data?.credit,
      variationPourcent
    });
  });

  // Trier par numéro de compte
  return lignesBalance.sort((a, b) => a.compte.localeCompare(b.compte));
};

/**
 * Filtre les lignes de balance selon les critères
 */
export const filterBalance = (
  lignes: LigneBalance[],
  options: {
    masquerSoldesNuls?: boolean;
    classeFilter?: string;
    searchTerm?: string;
  }
): LigneBalance[] => {
  return lignes.filter(ligne => {
    // Masquer les comptes à solde nul
    if (options.masquerSoldesNuls) {
      const hasSolde = ligne.soldeClotureDebit !== 0 || ligne.soldeClotureCredit !== 0;
      if (!hasSolde) return false;
    }

    // Filtrer par classe
    if (options.classeFilter && options.classeFilter !== 'TOUTES') {
      if (ligne.classe !== options.classeFilter) return false;
    }

    // Recherche textuelle
    if (options.searchTerm) {
      const term = options.searchTerm.toLowerCase();
      const matchesCompte = ligne.compte.includes(term);
      const matchesLabel = ligne.compteLabel.toLowerCase().includes(term);
      if (!matchesCompte && !matchesLabel) return false;
    }

    return true;
  });
};

/**
 * Calcule les totaux de la balance
 */
export const calculateBalanceTotals = (lignes: LigneBalance[]) => {
  return lignes.reduce(
    (acc, ligne) => ({
      totalOuvertureDebit: acc.totalOuvertureDebit + ligne.soldeOuvertureDebit,
      totalOuvertureCredit: acc.totalOuvertureCredit + ligne.soldeOuvertureCredit,
      totalMouvementDebit: acc.totalMouvementDebit + ligne.mouvementDebit,
      totalMouvementCredit: acc.totalMouvementCredit + ligne.mouvementCredit,
      totalClotureDebit: acc.totalClotureDebit + ligne.soldeClotureDebit,
      totalClotureCredit: acc.totalClotureCredit + ligne.soldeClotureCredit,
      nombreComptes: acc.nombreComptes + 1
    }),
    {
      totalOuvertureDebit: 0,
      totalOuvertureCredit: 0,
      totalMouvementDebit: 0,
      totalMouvementCredit: 0,
      totalClotureDebit: 0,
      totalClotureCredit: 0,
      nombreComptes: 0
    }
  );
};

/**
 * Labels des classes comptables
 */
export const CLASSES_COMPTABLES: Record<string, string> = {
  '1': 'Classe 1 - Capitaux',
  '2': 'Classe 2 - Immobilisations',
  '3': 'Classe 3 - Stocks',
  '4': 'Classe 4 - Tiers',
  '5': 'Classe 5 - Financiers',
  '6': 'Classe 6 - Charges',
  '7': 'Classe 7 - Produits'
};
