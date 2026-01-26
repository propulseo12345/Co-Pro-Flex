import { ModeEcheancier, Echeance, EcheancierAppelsFonds } from '@/types';

/**
 * Génère les échéances en fonction du mode de paiement choisi
 */
export function genererEcheances(
    mode: ModeEcheancier,
    montantTotal: number,
    dateDebut: string,
    nombreEcheances?: number
): Echeance[] {
    const echeances: Echeance[] = [];
    const dateDebutObj = new Date(dateDebut);

    switch (mode) {
        case 'UNE_FOIS':
            echeances.push({
                id: 'ech-' + Date.now(),
                dateExigibilite: dateDebut,
                montantTotal: montantTotal,
                ordre: 1,
                description: 'Paiement en une fois'
            });
            break;

        case 'SEMESTRIEL':
            // 2 échéances à 6 mois d'intervalle
            const montantSemestriel = montantTotal / 2;
            for (let i = 0; i < 2; i++) {
                const dateEch = new Date(dateDebutObj);
                dateEch.setMonth(dateEch.getMonth() + (i * 6));
                echeances.push({
                    id: 'ech-' + Date.now() + '-' + i,
                    dateExigibilite: dateEch.toISOString().split('T')[0],
                    montantTotal: montantSemestriel,
                    ordre: i + 1,
                    description: `${i + 1}${i === 0 ? 'er' : 'ème'} semestre`
                });
            }
            break;

        case 'TRIMESTRIEL':
            // 4 échéances à 3 mois d'intervalle
            const montantTrimestriel = montantTotal / 4;
            for (let i = 0; i < 4; i++) {
                const dateEch = new Date(dateDebutObj);
                dateEch.setMonth(dateEch.getMonth() + (i * 3));
                echeances.push({
                    id: 'ech-' + Date.now() + '-' + i,
                    dateExigibilite: dateEch.toISOString().split('T')[0],
                    montantTotal: montantTrimestriel,
                    ordre: i + 1,
                    description: `${i + 1}${i === 0 ? 'er' : 'ème'} trimestre`
                });
            }
            break;

        case 'PERSONNALISE':
            // Échéances personnalisées - à remplir manuellement
            const nbEch = nombreEcheances || 1;
            const montantParEcheance = montantTotal / nbEch;
            for (let i = 0; i < nbEch; i++) {
                const dateEch = new Date(dateDebutObj);
                dateEch.setMonth(dateEch.getMonth() + i);
                echeances.push({
                    id: 'ech-' + Date.now() + '-' + i,
                    dateExigibilite: dateEch.toISOString().split('T')[0],
                    montantTotal: montantParEcheance,
                    ordre: i + 1,
                    description: `Échéance ${i + 1}/${nbEch}`
                });
            }
            break;
    }

    return echeances;
}

/**
 * Crée un échéancier complet
 */
export function creerEcheancier(
    mode: ModeEcheancier,
    montantTotal: number,
    dateDebut: string,
    resolutionId?: string,
    budgetId?: string,
    cleRepartitionId?: string,
    nombreEcheances?: number
): EcheancierAppelsFonds {
    const echeances = genererEcheances(mode, montantTotal, dateDebut, nombreEcheances);

    return {
        id: 'echeancier-' + Date.now(),
        resolutionId,
        budgetId,
        modeEcheancier: mode,
        montantTotal,
        dateDebut,
        echeances,
        cleRepartitionId
    };
}

/**
 * Obtient le libellé du mode d'échéancier
 */
export function getLibelleMode(mode: ModeEcheancier): string {
    const libelles: Record<ModeEcheancier, string> = {
        'UNE_FOIS': 'Paiement en une fois',
        'SEMESTRIEL': 'Paiement semestriel (2 échéances)',
        'TRIMESTRIEL': 'Paiement trimestriel (4 échéances)',
        'PERSONNALISE': 'Échéancier personnalisé'
    };
    return libelles[mode];
}

/**
 * Valide un échéancier
 */
export function validerEcheancier(echeancier: EcheancierAppelsFonds): { valide: boolean; erreurs: string[] } {
    const erreurs: string[] = [];

    if (!echeancier.montantTotal || echeancier.montantTotal <= 0) {
        erreurs.push('Le montant total doit être supérieur à 0');
    }

    if (!echeancier.echeances || echeancier.echeances.length === 0) {
        erreurs.push('L\'échéancier doit contenir au moins une échéance');
    }

    // Vérifier que la somme des échéances correspond au montant total
    const sommeEcheances = echeancier.echeances.reduce((sum, ech) => sum + ech.montantTotal, 0);
    const diff = Math.abs(sommeEcheances - echeancier.montantTotal);
    if (diff > 0.01) { // Tolérance de 1 centime pour les arrondis
        erreurs.push(`La somme des échéances (${sommeEcheances}€) ne correspond pas au montant total (${echeancier.montantTotal}€)`);
    }

    // Vérifier que toutes les échéances ont une date
    echeancier.echeances.forEach((ech, index) => {
        if (!ech.dateExigibilite) {
            erreurs.push(`L'échéance ${index + 1} n'a pas de date d'exigibilité`);
        }
    });

    return {
        valide: erreurs.length === 0,
        erreurs
    };
}
