import { ModeEcheancier, EcheancierAppelsFonds } from '@/types';
import { creerEcheancier } from '@/lib/utils/echeancier';

export interface BudgetData {
    id: string;
    annee: number;
    montantTotal: number;
    dateDebut?: string;
    dateFin?: string;
}

export interface ResolutionBudget {
    id: string;
    titre: string;
    texte: string;
    majorite: string;
    cleRepartition: string;
    custom: boolean;
    estAppelFonds: boolean;
    echeancier?: EcheancierAppelsFonds;
}

/**
 * Génère automatiquement une résolution d'approbation du budget prévisionnel
 * avec un échéancier d'appels de fonds
 */
export function genererResolutionBudget(
    budget: BudgetData,
    modeEcheancier: ModeEcheancier = 'TRIMESTRIEL',
    cleRepartitionId: string = 'CHARGES_GENERALES',
    agId?: string
): ResolutionBudget {
    // Date de début par défaut : 1er janvier de l'année du budget
    const dateDebut = budget.dateDebut || `${budget.annee}-01-01`;
    const dateFin = budget.dateFin || `${budget.annee}-12-31`;

    // Créer le titre de la résolution
    const titre = `Approbation du budget prévisionnel ${budget.annee}`;

    // Créer le texte de la résolution
    const texte = `L'assemblée générale approuve le budget prévisionnel pour l'exercice du ${formatDate(dateDebut)} au ${formatDate(dateFin)}, arrêté à la somme de ${budget.montantTotal.toLocaleString('fr-FR')} euros.

Les appels de fonds seront répartis selon les tantièmes et seront exigibles selon l'échéancier suivant :
- Mode de paiement : ${getLibelleModeEcheancier(modeEcheancier)}
- Montant total : ${budget.montantTotal.toLocaleString('fr-FR')} €

Le syndic est autorisé à procéder aux appels de fonds selon l'échéancier approuvé.`;

    // Créer l'échéancier
    const echeancier = creerEcheancier(
        modeEcheancier,
        budget.montantTotal,
        dateDebut,
        undefined, // resolutionId sera ajouté après
        budget.id,
        cleRepartitionId
    );

    // Créer la résolution
    const resolution: ResolutionBudget = {
        id: 'res-budget-' + Date.now(),
        titre,
        texte,
        majorite: 'ART_24', // Article 24 : majorité simple
        cleRepartition: cleRepartitionId,
        custom: false, // Généré automatiquement
        estAppelFonds: true,
        echeancier
    };

    // Lier l'échéancier à la résolution
    if (resolution.echeancier) {
        resolution.echeancier.resolutionId = resolution.id;
    }

    // Si un agId est fourni, sauvegarder dans localStorage
    if (agId) {
        const savedResolutions = localStorage.getItem(`ag-resolutions-${agId}`);
        const resolutions = savedResolutions ? JSON.parse(savedResolutions) : [];
        resolutions.push(resolution);
        localStorage.setItem(`ag-resolutions-${agId}`, JSON.stringify(resolutions));
    }

    return resolution;
}

/**
 * Formate une date au format français
 */
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Retourne le libellé du mode d'échéancier
 */
function getLibelleModeEcheancier(mode: ModeEcheancier): string {
    const libelles: Record<ModeEcheancier, string> = {
        'UNE_FOIS': 'Paiement en une fois',
        'SEMESTRIEL': 'Paiement semestriel (2 appels de fonds)',
        'TRIMESTRIEL': 'Paiement trimestriel (4 appels de fonds)',
        'PERSONNALISE': 'Échéancier personnalisé'
    };
    return libelles[mode];
}

/**
 * Génère un récapitulatif de l'échéancier au format texte
 */
export function genererRecapitulatifEcheancier(echeancier: EcheancierAppelsFonds): string {
    let recap = `Échéancier des appels de fonds :\n\n`;

    echeancier.echeances.forEach((echeance, index) => {
        const date = new Date(echeance.dateExigibilite);
        const dateFormatee = date.toLocaleDateString('fr-FR');
        recap += `${index + 1}${index === 0 ? 'er' : 'ème'} appel : ${echeance.montantTotal.toLocaleString('fr-FR')} € - Exigible le ${dateFormatee}`;
        if (echeance.description) {
            recap += ` (${echeance.description})`;
        }
        recap += `\n`;
    });

    return recap;
}

/**
 * Valide un budget avant de générer la résolution
 */
export function validerBudgetPourResolution(budget: BudgetData): { valide: boolean; erreurs: string[] } {
    const erreurs: string[] = [];

    if (!budget.id) {
        erreurs.push('Le budget doit avoir un identifiant');
    }

    if (!budget.annee || budget.annee < 2000 || budget.annee > 2100) {
        erreurs.push('L\'année du budget est invalide');
    }

    if (!budget.montantTotal || budget.montantTotal <= 0) {
        erreurs.push('Le montant total du budget doit être supérieur à 0');
    }

    return {
        valide: erreurs.length === 0,
        erreurs
    };
}
