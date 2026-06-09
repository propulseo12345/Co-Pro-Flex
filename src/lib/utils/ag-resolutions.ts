import {
    getResolutionsObligatoires,
    type MajorityType,
    type ResolutionTemplate,
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
 * @param templates - Snapshot des modèles de résolutions (banque en base)
 * @param typeAG - Le type d'AG ('ORDINAIRE' ou 'EXTRAORDINAIRE')
 * @returns Liste des résolutions obligatoires
 */
export function genererResolutionsObligatoires(templates: ResolutionTemplate[], typeAG: TypeAG): Resolution[] {
    const obligatoires = getResolutionsObligatoires(templates, typeAG);
    const resolutions: Resolution[] = [];
    const baseTimestamp = Date.now();

    obligatoires.forEach((template, index) => {
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
export function genererResolutionsAGOrdinaire(templates: ResolutionTemplate[]): Resolution[] {
    return genererResolutionsObligatoires(templates, 'ORDINAIRE');
}

/**
 * Ajoute les résolutions d'AG Ordinaire à l'ordre du jour existant
 * et les sauvegarde dans le localStorage
 * @returns Les résolutions générées ou null en cas d'erreur
 */
export function ajouterResolutionsAGOrdinaire(
    templates: ResolutionTemplate[],
    agId: string,
    resolutionsExistantes: Resolution[] = []
): Resolution[] | null {
    if (!agId) {
        console.error('ajouterResolutionsAGOrdinaire: agId est requis');
        return null;
    }

    const nouvellesResolutions = genererResolutionsAGOrdinaire(templates);

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
export function estResolutionObligatoire(templates: ResolutionTemplate[], templateId: string, typeAG: TypeAG = 'ORDINAIRE'): boolean {
    const obligatoires = getResolutionsObligatoires(templates, typeAG);
    return obligatoires.some(r => r.id === templateId);
}

/**
 * Vérifie si une résolution est une résolution standard d'AG
 * (Conservé pour rétrocompatibilité)
 */
export function estResolutionStandardAG(templates: ResolutionTemplate[], templateId: string): boolean {
    return estResolutionObligatoire(templates, templateId, 'ORDINAIRE');
}

/**
 * Obtient le nombre de résolutions obligatoires pour un type d'AG
 * @param templates - Snapshot des modèles de résolutions (banque en base)
 * @param typeAG - Le type d'AG (par défaut 'ORDINAIRE')
 */
export function getNombreResolutionsObligatoires(templates: ResolutionTemplate[], typeAG: TypeAG = 'ORDINAIRE'): number {
    return getResolutionsObligatoires(templates, typeAG).length;
}

/**
 * Obtient le nombre de résolutions standard pour une AG Ordinaire
 * (Conservé pour rétrocompatibilité)
 */
export function getNombreResolutionsAGOrdinaire(templates: ResolutionTemplate[]): number {
    return getNombreResolutionsObligatoires(templates, 'ORDINAIRE');
}

/**
 * Obtient la liste des titres des résolutions obligatoires pour un type d'AG
 * @param templates - Snapshot des modèles de résolutions (banque en base)
 * @param typeAG - Le type d'AG (par défaut 'ORDINAIRE')
 */
export function getTitresResolutionsObligatoires(templates: ResolutionTemplate[], typeAG: TypeAG = 'ORDINAIRE'): string[] {
    return getResolutionsObligatoires(templates, typeAG).map(r => r.titre);
}

/**
 * Obtient la liste des titres des résolutions d'AG Ordinaire
 * (Conservé pour rétrocompatibilité)
 */
export function getTitresResolutionsAGOrdinaire(templates: ResolutionTemplate[]): string[] {
    return getTitresResolutionsObligatoires(templates, 'ORDINAIRE');
}
