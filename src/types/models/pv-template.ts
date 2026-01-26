/**
 * Types pour le système de templates de Procès-Verbal
 *
 * Architecture:
 * - IPVTemplate: Métadonnées du template (nom, organisation, défaut)
 * - IPVTemplateSpec: Spécification JSON du contenu du template
 * - IPVSection: Section activable/désactivable avec contenu HTML
 * - IPVVariable: Variable dynamique avec valeur et formatage
 */

// ═══════════════════════════════════════════════════════════════
// TYPES DE BASE
// ═══════════════════════════════════════════════════════════════

export type PVTemplateStatus = 'draft' | 'active' | 'archived';

export type PVSectionType =
    | 'header'              // En-tête avec logo et titre
    | 'ag_info'             // Informations AG (date, lieu, type)
    | 'presence_sheet'      // Feuille de présence
    | 'quorum'              // Calcul du quorum
    | 'bureau'              // Composition du bureau
    | 'resolutions'         // Liste des résolutions
    | 'resolution_detail'   // Détail d'une résolution (itéré)
    | 'vote_results'        // Résultats de vote
    | 'annexes'             // Annexes
    | 'signatures'          // Zone de signatures
    | 'footer'              // Pied de page
    | 'custom';             // Section personnalisée

export type PVVariableCategory =
    | 'copropriete'         // Infos copropriété
    | 'ag'                  // Infos AG
    | 'stats'               // Statistiques (quorum, présences)
    | 'resolution'          // Contexte résolution (dans boucle)
    | 'vote'                // Résultats de vote
    | 'bureau'              // Membres du bureau
    | 'syndic'              // Infos syndic
    | 'date'                // Dates formatées
    | 'custom';             // Variables personnalisées

export type PVVariableType =
    | 'string'
    | 'number'
    | 'currency'
    | 'date'
    | 'boolean'
    | 'percentage'
    | 'list';

// ═══════════════════════════════════════════════════════════════
// VARIABLE DEFINITION
// ═══════════════════════════════════════════════════════════════

/**
 * Définition d'une variable dans le catalogue
 */
export interface IPVVariableDefinition {
    key: string;                    // Clé unique: {copro.nom}
    label: string;                  // Label affiché: "Nom de la copropriété"
    description: string;            // Description détaillée
    category: PVVariableCategory;   // Catégorie pour le groupement
    type: PVVariableType;           // Type de la valeur
    example: string;                // Exemple de valeur
    required: boolean;              // Variable obligatoire?
    iterationContext?: string;      // Si dans une boucle: "resolution" | "presence"
}

/**
 * Variable résolue avec sa valeur
 */
export interface IPVResolvedVariable {
    key: string;
    value: string | number | boolean | Date | null;
    formattedValue: string;         // Valeur formatée pour affichage
}

// ═══════════════════════════════════════════════════════════════
// SECTION DEFINITION
// ═══════════════════════════════════════════════════════════════

/**
 * Configuration d'une section du template
 */
export interface IPVSection {
    id: string;                     // ID unique de la section
    type: PVSectionType;            // Type de section
    label: string;                  // Label affiché
    enabled: boolean;               // Section activée?
    required: boolean;              // Peut être désactivée?
    order: number;                  // Ordre d'affichage
    content: string;                // Contenu HTML avec variables
    styles?: IPVSectionStyles;      // Styles CSS personnalisés
    iteration?: {                   // Si section itérée
        over: string;               // Collection à itérer: "resolutions" | "presences"
        itemVariable: string;       // Nom de la variable item: "resolution"
    };
}

export interface IPVSectionStyles {
    marginTop?: string;
    marginBottom?: string;
    padding?: string;
    backgroundColor?: string;
    borderTop?: string;
    borderBottom?: string;
    fontSize?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    pageBreakBefore?: boolean;
    pageBreakAfter?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE SPEC
// ═══════════════════════════════════════════════════════════════

/**
 * Spécification complète du template (stockée en JSON)
 */
export interface IPVTemplateSpec {
    version: string;                // Version du format: "1.0"

    // Paramètres globaux
    global: {
        fontFamily: string;         // Police principale
        fontSize: string;           // Taille de base
        lineHeight: string;         // Interligne
        primaryColor: string;       // Couleur principale
        secondaryColor: string;     // Couleur secondaire
        pageMargins: {
            top: string;
            right: string;
            bottom: string;
            left: string;
        };
    };

    // En-tête
    header: {
        logo?: {
            url: string;            // URL ou base64 du logo
            width: string;
            height: string;
            position: 'left' | 'center' | 'right';
        };
        title: string;              // Titre avec variables
        subtitle?: string;          // Sous-titre optionnel
        showDate: boolean;
        showCopropriete: boolean;
    };

    // Pied de page
    footer: {
        content: string;            // Contenu avec variables
        showPageNumbers: boolean;
        pageNumberFormat: string;   // Ex: "Page {page} sur {totalPages}"
    };

    // Sections du document
    sections: IPVSection[];

    // Formulations personnalisées
    formulations: {
        resolutionAdopted: string;      // "Cette résolution est ADOPTÉE"
        resolutionRejected: string;     // "Cette résolution est REJETÉE"
        resolutionPostponed: string;    // "Cette résolution est AJOURNÉE"
        quorumReached: string;          // "Le quorum est atteint"
        quorumNotReached: string;       // "Le quorum n'est pas atteint"
        voteForLabel: string;           // "POUR"
        voteAgainstLabel: string;       // "CONTRE"
        voteAbstainLabel: string;       // "ABSTENTION"
        closingStatement: string;       // Formule de clôture
    };

    // Variables personnalisées définies par l'utilisateur
    customVariables?: Array<{
        key: string;
        label: string;
        defaultValue: string;
    }>;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE ENTITY
// ═══════════════════════════════════════════════════════════════

/**
 * Entité Template stockée en base
 */
export interface IPVTemplate {
    id: string;
    organizationId: string;         // Multi-tenant
    name: string;
    description?: string;
    status: PVTemplateStatus;
    isDefault: boolean;             // Template par défaut pour l'organisation
    isSystemTemplate: boolean;      // Template système (non modifiable)
    spec: IPVTemplateSpec;          // Spécification JSON
    previewImageUrl?: string;       // Aperçu miniature
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;              // User ID
    lastModifiedBy?: string;        // User ID
    usageCount: number;             // Nombre d'utilisations
}

// ═══════════════════════════════════════════════════════════════
// RENDER CONTEXT
// ═══════════════════════════════════════════════════════════════

/**
 * Contexte de rendu pour un PV
 */
export interface IPVRenderContext {
    // Données copropriété
    copropriete: {
        nom: string;
        adresse: string;
        codePostal: string;
        ville: string;
        siret?: string;
        nombreLots: number;
        totalTantiemes: number;
    };

    // Données AG
    ag: {
        id: string;
        type: string;               // 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'MIXTE'
        typeLabel: string;          // "Ordinaire", "Extraordinaire", "Mixte"
        date: Date;
        heureDebut: string;
        heureFin?: string;
        lieu: string;
        exercice?: string;
    };

    // Statistiques
    stats: {
        totalCoproprietaires: number;
        presentsCount: number;
        representesCount: number;
        absentsCount: number;
        tantiemesPresents: number;
        tantiemesRepresentes: number;
        tantiemesTotal: number;
        quorumPercentage: number;
        quorumAtteint: boolean;
    };

    // Bureau
    bureau: {
        president?: { nom: string; qualite?: string };
        secretaire?: { nom: string; qualite?: string };
        scrutateurs?: Array<{ nom: string; qualite?: string }>;
    };

    // Syndic
    syndic?: {
        nom: string;
        adresse?: string;
        representant?: string;
    };

    // Liste de présence
    presences: Array<{
        nom: string;
        prenom?: string;
        lots: string[];
        tantiemes: number;
        statut: 'PRESENT' | 'REPRESENTE' | 'ABSENT';
        mandataire?: string;
        signature?: string;         // Base64 si signé
    }>;

    // Résolutions
    resolutions: Array<{
        numero: number;
        titre: string;
        description?: string;
        majorite: string;           // 'ART_24' | 'ART_25' | etc.
        majoriteLabel: string;      // "Article 24"
        votePour: number;
        voteContre: number;
        voteAbstention: number;
        pourcentagePour: number;
        seuilRequis: number;
        resultat: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE';
        passerelle?: boolean;
        commentaires?: string;
    }>;

    // Métadonnées
    meta: {
        generatedAt: Date;
        generatedBy: string;
        templateId: string;
        templateName: string;
    };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT TYPES
// ═══════════════════════════════════════════════════════════════

export type PVExportFormat = 'html' | 'pdf' | 'docx';

export interface IPVExportOptions {
    format: PVExportFormat;
    fileName?: string;
    includeWatermark?: boolean;
    watermarkText?: string;
    includeMetadata?: boolean;
}

export interface IPVExportResult {
    success: boolean;
    format: PVExportFormat;
    blob?: Blob;
    base64?: string;
    fileName: string;
    error?: string;
}
