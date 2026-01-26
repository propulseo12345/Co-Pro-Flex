'use client';

import { useState, useMemo } from 'react';
import { MOCK_DEPENSES_BUDGETS, MOCK_EXERCICE_ACTUEL, DepenseEtendue } from '@/data/mock';

export type StatutFilter = 'TOUTES' | 'VALIDEE' | 'EN_ATTENTE_VALIDATION' | 'NON_VALIDEE';

const NB_COPROPRIETAIRES = 28;

export const BUDGET_PAR_POSTE = {
    eau: { label: 'Eau', budget: 12000 },
    electricite: { label: 'Électricité', budget: 8500 },
    assurance: { label: 'Assurance', budget: 18500 },
    menage: { label: 'Ménage', budget: 15000 },
    ascenseur: { label: 'Ascenseur', budget: 12000 },
    espaces_verts: { label: 'Espaces verts', budget: 11000 },
    divers: { label: 'Divers', budget: 10500 },
} as const;

export const BUDGET_TOTAL_VOTE = Object.values(BUDGET_PAR_POSTE).reduce((sum, p) => sum + p.budget, 0);

const DONNEES_N1 = {
    totalCharges: 68500,
    totalProduits: 350,
    totalRecuperable: 42000,
    totalDeductible: 26500,
    nombreEcritures: 38,
};

const getClasseComptable = (compteId: string): number => parseInt(compteId.charAt(0), 10) || 0;

export function useExpenses() {
    const [statutFilter, setStatutFilter] = useState<StatutFilter>('TOUTES');
    const [showCoherenceReport, setShowCoherenceReport] = useState(false);

    const { charges, produits } = useMemo(() => {
        const charges: DepenseEtendue[] = [];
        const produits: DepenseEtendue[] = [];
        MOCK_DEPENSES_BUDGETS.forEach(depense => {
            const classe = getClasseComptable(depense.compteId);
            if (classe === 6) charges.push(depense);
            else if (classe === 7) produits.push(depense);
        });
        return { charges, produits };
    }, []);

    const filteredExpenses = useMemo(() => {
        return charges.filter(depense => {
            if (statutFilter === 'TOUTES') return true;
            if (statutFilter === 'VALIDEE') return depense.statut === 'VALIDEE';
            if (statutFilter === 'EN_ATTENTE_VALIDATION') return depense.statut === 'EN_ATTENTE_VALIDATION';
            if (statutFilter === 'NON_VALIDEE') return !depense.statut || depense.statut === 'BROUILLON' || depense.statut === 'REJETEE';
            return true;
        });
    }, [statutFilter, charges]);

    const filteredProduits = useMemo(() => {
        return produits.filter(depense => {
            if (statutFilter === 'TOUTES') return true;
            if (statutFilter === 'VALIDEE') return depense.statut === 'VALIDEE';
            if (statutFilter === 'EN_ATTENTE_VALIDATION') return depense.statut === 'EN_ATTENTE_VALIDATION';
            if (statutFilter === 'NON_VALIDEE') return !depense.statut || depense.statut === 'BROUILLON' || depense.statut === 'REJETEE';
            return true;
        });
    }, [statutFilter, produits]);

    const coherenceData = useMemo(() => {
        const depensesValidees = charges.filter(d => d.statut === 'VALIDEE' || !d.statut);
        const consommeParPoste = Object.keys(BUDGET_PAR_POSTE).map(posteKey => {
            const poste = posteKey as keyof typeof BUDGET_PAR_POSTE;
            const depensesPoste = depensesValidees.filter(d => d.poste === poste);
            const consomme = depensesPoste.reduce((sum, d) => sum + d.montant, 0);
            const budget = BUDGET_PAR_POSTE[poste].budget;
            const ecart = consomme - budget;
            const pourcentage = budget > 0 ? (consomme / budget) * 100 : 0;
            return { poste, label: BUDGET_PAR_POSTE[poste].label, budget, consomme, ecart, pourcentage, nbFactures: depensesPoste.length };
        });

        const totalConsomme = consommeParPoste.reduce((sum, p) => sum + p.consomme, 0);
        const ecartTotal = totalConsomme - BUDGET_TOTAL_VOTE;
        const pourcentageGlobal = (totalConsomme / BUDGET_TOTAL_VOTE) * 100;
        const depensesSansPoste = depensesValidees.filter(d => !d.poste);
        const totalDepensesValidees = depensesValidees.reduce((sum, d) => sum + d.montant, 0);
        const ecartNonAffecte = totalDepensesValidees - totalConsomme;

        return {
            consommeParPoste, totalConsomme, budgetVote: BUDGET_TOTAL_VOTE, ecartTotal,
            pourcentageGlobal, depensesSansPoste, ecartNonAffecte, totalDepensesValidees,
            isCoherent: Math.abs(ecartNonAffecte) < 1,
        };
    }, [charges]);

    const expensesByAccount = useMemo(() => {
        const grouped: Record<string, DepenseEtendue[]> = {};
        filteredExpenses.forEach(depense => {
            if (!grouped[depense.compteId]) grouped[depense.compteId] = [];
            grouped[depense.compteId].push(depense);
        });
        Object.values(grouped).forEach(expenses => {
            expenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        });
        return grouped;
    }, [filteredExpenses]);

    const produitsByAccount = useMemo(() => {
        const grouped: Record<string, DepenseEtendue[]> = {};
        filteredProduits.forEach(produit => {
            if (!grouped[produit.compteId]) grouped[produit.compteId] = [];
            grouped[produit.compteId].push(produit);
        });
        Object.values(grouped).forEach(items => {
            items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        });
        return grouped;
    }, [filteredProduits]);

    const accountIds = Object.keys(expensesByAccount).sort();
    const produitAccountIds = Object.keys(produitsByAccount).sort();

    const stats = useMemo(() => {
        const totalCharges = filteredExpenses.reduce((sum, e) => sum + e.montant, 0);
        const totalRecuperable = filteredExpenses.reduce((sum, e) => sum + e.recuperable, 0);
        const totalDeductible = filteredExpenses.reduce((sum, e) => sum + e.deductible, 0);
        const nbValidees = charges.filter(d => d.statut === 'VALIDEE').length;
        const nbEnAttente = charges.filter(d => d.statut === 'EN_ATTENTE_VALIDATION').length;
        const nbNonValidees = charges.filter(d => !d.statut || d.statut === 'BROUILLON' || d.statut === 'REJETEE').length;

        const totalHT = filteredExpenses.reduce((sum, e) => sum + (e.montantHT || 0), 0);
        const totalTVA = filteredExpenses.reduce((sum, e) => sum + (e.montantTVA || 0), 0);
        const totalTVADeductible = filteredExpenses.filter(e => e.tvaDeductible).reduce((sum, e) => sum + (e.montantTVA || 0), 0);

        const tvaParTaux = filteredExpenses.reduce((acc, expense) => {
            const taux = expense.tauxTVA ?? 0;
            if (!acc[taux]) acc[taux] = { taux, totalHT: 0, totalTVA: 0, totalTTC: 0, nbEcritures: 0, tvaDeductible: 0 };
            acc[taux].totalHT += expense.montantHT || 0;
            acc[taux].totalTVA += expense.montantTVA || 0;
            acc[taux].totalTTC += expense.montant;
            acc[taux].nbEcritures += 1;
            if (expense.tvaDeductible) acc[taux].tvaDeductible += expense.montantTVA || 0;
            return acc;
        }, {} as Record<number, { taux: number; totalHT: number; totalTVA: number; totalTTC: number; nbEcritures: number; tvaDeductible: number }>);

        const recapTVA = Object.values(tvaParTaux).sort((a, b) => b.taux - a.taux);
        const totalProduits = Math.abs(filteredProduits.reduce((sum, e) => sum + e.montant, 0));
        const resultat = totalProduits - totalCharges;

        const evolutionCharges = DONNEES_N1.totalCharges > 0 ? ((totalCharges - DONNEES_N1.totalCharges) / DONNEES_N1.totalCharges) * 100 : 0;
        const evolutionProduits = DONNEES_N1.totalProduits > 0 ? ((totalProduits - DONNEES_N1.totalProduits) / DONNEES_N1.totalProduits) * 100 : 0;
        const evolutionRecuperable = DONNEES_N1.totalRecuperable > 0 ? ((totalRecuperable - DONNEES_N1.totalRecuperable) / DONNEES_N1.totalRecuperable) * 100 : 0;

        const moyenneParCoproprietaire = totalCharges / NB_COPROPRIETAIRES;
        const moyenneN1 = DONNEES_N1.totalCharges / NB_COPROPRIETAIRES;
        const tauxRecuperable = totalCharges > 0 ? (totalRecuperable / totalCharges) * 100 : 0;
        const tauxDeductible = totalCharges > 0 ? (totalDeductible / totalCharges) * 100 : 0;
        const ecartBudget = totalCharges - BUDGET_TOTAL_VOTE;
        const tauxConsommationBudget = BUDGET_TOTAL_VOTE > 0 ? (totalCharges / BUDGET_TOTAL_VOTE) * 100 : 0;

        const repartitionCharges = Object.entries(BUDGET_PAR_POSTE).map(([posteKey, posteData]) => {
            const poste = posteKey as keyof typeof BUDGET_PAR_POSTE;
            const montant = charges.filter(d => d.poste === poste && (d.statut === 'VALIDEE' || !d.statut)).reduce((sum, d) => sum + d.montant, 0);
            return { poste, label: posteData.label, montant, pourcentage: totalCharges > 0 ? (montant / totalCharges) * 100 : 0, budget: posteData.budget };
        }).sort((a, b) => b.montant - a.montant);

        return {
            nombreLignes: filteredExpenses.length, nombreTotal: charges.length, totalCharges, totalRecuperable, totalDeductible,
            nbValidees, nbEnAttente, nbNonValidees, nombreComptes: accountIds.length,
            nombreProduits: filteredProduits.length, totalProduits, nombreComptesProduits: produitAccountIds.length,
            resultat, evolutionCharges, evolutionProduits, evolutionRecuperable,
            chargesN1: DONNEES_N1.totalCharges, produitsN1: DONNEES_N1.totalProduits,
            moyenneParCoproprietaire, moyenneN1, tauxRecuperable, tauxDeductible, ecartBudget, tauxConsommationBudget,
            repartitionCharges, totalHT, totalTVA, totalTVADeductible, recapTVA,
        };
    }, [filteredExpenses, filteredProduits, accountIds.length, produitAccountIds.length, charges]);

    const hasDataWarning = charges.length < 20;

    return {
        statutFilter, setStatutFilter,
        showCoherenceReport, setShowCoherenceReport,
        charges, filteredExpenses, filteredProduits,
        expensesByAccount, produitsByAccount,
        accountIds, produitAccountIds,
        coherenceData, stats, hasDataWarning,
        exercice: MOCK_EXERCICE_ACTUEL,
    };
}

export const formatCurrency = (value: number) =>
    value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
