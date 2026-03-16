import {
    getResolutionById,
    getResolutionsObligatoires,
    getResolutionsForAGType,
    type MajorityType,
    type TypeAG
} from '@/lib/constants/resolutions';

export interface Resolution {
    id: string;
    templateId?: string;
    titre: string;
    texte: string;
    majorite: MajorityType;
    variables?: Record<string, string>;
    custom: boolean;
    cleRepartition?: string;
}

/**
 * Génère automatiquement les résolutions obligatoires pour un type d'AG donné
 * @param typeAG - Le type d'AG ('ORDINAIRE' ou 'EXTRAORDINAIRE')
 * @returns Liste des résolutions obligatoires
 */
export function genererResolutionsObligatoires(typeAG: TypeAG): Resolution[] {
    const templates = getResolutionsObligatoires(typeAG);
    const resolutions: Resolution[] = [];
    const baseTimestamp = Date.now();

    templates.forEach((template, index) => {
        const resolution: Resolution = {
            id: `res-${baseTimestamp}-${index}-${template.id}`,
            templateId: template.id,
            titre: template.titre,
            texte: template.texte,
            majorite: template.majorite,
            variables: template.variables?.reduce((acc, v) => ({ ...acc, [v]: '' }), {}),
            custom: false
        };

        resolutions.push(resolution);
    });

    return resolutions;
}

/**
 * Génère automatiquement les résolutions pour une Assemblée Générale Ordinaire
 * (Conservé pour rétrocompatibilité)
 */
export function genererResolutionsAGOrdinaire(): Resolution[] {
    return genererResolutionsObligatoires('ORDINAIRE');
}

/**
 * Ajoute les résolutions d'AG Ordinaire à l'ordre du jour existant
 * et les sauvegarde dans le localStorage
 * @returns Les résolutions générées ou null en cas d'erreur
 */
export function ajouterResolutionsAGOrdinaire(
    agId: string,
    resolutionsExistantes: Resolution[] = []
): Resolution[] | null {
    if (!agId) {
        console.error('ajouterResolutionsAGOrdinaire: agId est requis');
        return null;
    }

    const nouvellesResolutions = genererResolutionsAGOrdinaire();

    if (nouvellesResolutions.length === 0) {
        console.error('ajouterResolutionsAGOrdinaire: Aucune résolution générée');
        return null;
    }

    const toutesResolutions = [...nouvellesResolutions, ...resolutionsExistantes];

    // Sauvegarder dans le localStorage
    try {
        const key = `ag-resolutions-${agId}`;
        localStorage.setItem(key, JSON.stringify(toutesResolutions));

        // Vérifier que la sauvegarde a réussi
        const saved = localStorage.getItem(key);
        if (!saved) {
            console.error('ajouterResolutionsAGOrdinaire: Échec de la sauvegarde localStorage');
            return null;
        }

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length !== toutesResolutions.length) {
            console.error('ajouterResolutionsAGOrdinaire: Données sauvegardées incorrectes');
            return null;
        }

        // Résolutions sauvegardées
    } catch (error) {
        console.error('ajouterResolutionsAGOrdinaire: Erreur localStorage', error);
        return null;
    }

    return toutesResolutions;
}

/**
 * Obtient le libellé du type d'AG
 */
export function getLibelleTypeAG(type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE'): string {
    switch (type) {
        case 'ORDINAIRE':
            return 'Assemblée Générale Ordinaire';
        case 'EXTRAORDINAIRE':
            return 'Assemblée Générale Extraordinaire';
        case 'URGENTE':
            return 'Assemblée Générale Urgente';
        default:
            return 'Assemblée Générale';
    }
}

/**
 * Vérifie si une résolution est une résolution obligatoire pour un type d'AG
 * @param templateId - L'ID du template de résolution
 * @param typeAG - Le type d'AG (par défaut 'ORDINAIRE')
 */
export function estResolutionObligatoire(templateId: string, typeAG: TypeAG = 'ORDINAIRE'): boolean {
    const obligatoires = getResolutionsObligatoires(typeAG);
    return obligatoires.some(r => r.id === templateId);
}

/**
 * Vérifie si une résolution est une résolution standard d'AG
 * (Conservé pour rétrocompatibilité)
 */
export function estResolutionStandardAG(templateId: string): boolean {
    return estResolutionObligatoire(templateId, 'ORDINAIRE');
}

/**
 * Obtient le nombre de résolutions obligatoires pour un type d'AG
 * @param typeAG - Le type d'AG (par défaut 'ORDINAIRE')
 */
export function getNombreResolutionsObligatoires(typeAG: TypeAG = 'ORDINAIRE'): number {
    return getResolutionsObligatoires(typeAG).length;
}

/**
 * Obtient le nombre de résolutions standard pour une AG Ordinaire
 * (Conservé pour rétrocompatibilité)
 */
export function getNombreResolutionsAGOrdinaire(): number {
    return getNombreResolutionsObligatoires('ORDINAIRE');
}

/**
 * Obtient la liste des titres des résolutions obligatoires pour un type d'AG
 * @param typeAG - Le type d'AG (par défaut 'ORDINAIRE')
 */
export function getTitresResolutionsObligatoires(typeAG: TypeAG = 'ORDINAIRE'): string[] {
    return getResolutionsObligatoires(typeAG).map(r => r.titre);
}

/**
 * Obtient la liste des titres des résolutions d'AG Ordinaire
 * (Conservé pour rétrocompatibilité)
 */
export function getTitresResolutionsAGOrdinaire(): string[] {
    return getTitresResolutionsObligatoires('ORDINAIRE');
}
