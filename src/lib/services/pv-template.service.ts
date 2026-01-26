/**
 * Service de gestion des templates de PV
 *
 * Gère:
 * - CRUD des templates
 * - Templates par défaut du système
 * - Templates par organisation (multi-tenant)
 * - Import/Export de templates
 */

import type {
    IPVTemplate,
    IPVTemplateSpec,
    PVTemplateStatus,
    IPVSection,
    PVSectionType,
} from '@/types/models/pv-template';

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

const TEMPLATES_STORAGE_KEY = 'pv-templates';

function getTemplatesFromStorage(): Record<string, IPVTemplate> {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function saveTemplatesToStorage(templates: Record<string, IPVTemplate>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

function generateTemplateId(): string {
    return `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TEMPLATE
// ═══════════════════════════════════════════════════════════════

/**
 * Template système par défaut
 */
export function getDefaultTemplateSpec(): IPVTemplateSpec {
    return {
        version: '1.0',

        global: {
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.5',
            primaryColor: '#1e40af',
            secondaryColor: '#64748b',
            pageMargins: {
                top: '2cm',
                right: '2cm',
                bottom: '2cm',
                left: '2cm',
            },
        },

        header: {
            title: 'PROCÈS-VERBAL DE L\'ASSEMBLÉE GÉNÉRALE {{ag.type}}',
            subtitle: '{{copro.nom}}',
            showDate: true,
            showCopropriete: true,
        },

        footer: {
            content: '{{copro.nom}} - {{copro.adresse}}',
            showPageNumbers: true,
            pageNumberFormat: 'Page {page} sur {totalPages}',
        },

        sections: [
            // Section informations AG
            {
                id: 'ag-info',
                type: 'ag_info',
                label: 'Informations de l\'Assemblée Générale',
                enabled: true,
                required: true,
                order: 1,
                content: `
<h2>Informations de l'Assemblée Générale</h2>
<p>
    L'an <strong>{{ag.date}}</strong>, à <strong>{{ag.heure_debut}}</strong>,
    les copropriétaires de l'immeuble <strong>{{copro.nom}}</strong> sis <strong>{{copro.adresse}}</strong>
    se sont réunis en Assemblée Générale <strong>{{ag.type}}</strong> à l'adresse suivante :
</p>
<p><strong>{{ag.lieu}}</strong></p>
{{#if ag.exercice}}
<p>Exercice concerné : <strong>{{ag.exercice}}</strong></p>
{{/if}}
                `.trim(),
            },

            // Section bureau
            {
                id: 'bureau',
                type: 'bureau',
                label: 'Composition du Bureau',
                enabled: true,
                required: false,
                order: 2,
                content: `
<h2>Composition du Bureau</h2>
<p>L'assemblée procède à la désignation du bureau :</p>
<ul>
    {{#if bureau.president_nom}}
    <li><strong>Président de séance :</strong> {{bureau.president_nom}}{{#if bureau.president_qualite}} ({{bureau.president_qualite}}){{/if}}</li>
    {{/if}}
    {{#if bureau.secretaire_nom}}
    <li><strong>Secrétaire :</strong> {{bureau.secretaire_nom}}{{#if bureau.secretaire_qualite}} ({{bureau.secretaire_qualite}}){{/if}}</li>
    {{/if}}
    {{#if bureau.scrutateurs}}
    <li><strong>Scrutateur(s) :</strong> {{bureau.scrutateurs}}</li>
    {{/if}}
</ul>
                `.trim(),
            },

            // Section feuille de présence
            {
                id: 'presence-sheet',
                type: 'presence_sheet',
                label: 'Feuille de Présence',
                enabled: true,
                required: true,
                order: 3,
                content: `
<h2>Feuille de Présence</h2>
<p>La feuille de présence est signée par les copropriétaires présents et représentés.</p>
<table>
    <thead>
        <tr>
            <th>Copropriétaire</th>
            <th>Lots</th>
            <th>Tantièmes</th>
            <th>Statut</th>
            <th>Mandataire</th>
        </tr>
    </thead>
    <tbody>
        {{#each presences}}
        <tr>
            <td>{{this.nom}} {{this.prenom}}</td>
            <td>{{this.lots}}</td>
            <td>{{formatNumber this.tantiemes}}</td>
            <td>{{this.statut}}</td>
            <td>{{this.mandataire}}</td>
        </tr>
        {{/each}}
    </tbody>
</table>
                `.trim(),
            },

            // Section quorum
            {
                id: 'quorum',
                type: 'quorum',
                label: 'Calcul du Quorum',
                enabled: true,
                required: true,
                order: 4,
                content: `
<h2>Vérification du Quorum</h2>
<table>
    <tr>
        <td>Copropriétaires présents</td>
        <td><strong>{{stats.presents_count}}</strong></td>
        <td>{{formatNumber stats.tantiemes_presents}} tantièmes</td>
    </tr>
    <tr>
        <td>Copropriétaires représentés</td>
        <td><strong>{{stats.representes_count}}</strong></td>
        <td>{{formatNumber stats.tantiemes_representes}} tantièmes</td>
    </tr>
    <tr>
        <td>Total participants</td>
        <td><strong>{{formatNumber stats.presents_count}} + {{formatNumber stats.representes_count}}</strong></td>
        <td><strong>{{formatNumber stats.tantiemes_total_presents}} tantièmes sur {{formatNumber copro.total_tantiemes}}</strong></td>
    </tr>
    <tr>
        <td colspan="2">Quorum</td>
        <td><strong>{{formatPercent stats.quorum_pourcentage}}</strong></td>
    </tr>
</table>
<p>
    {{#if stats.quorum_atteint}}
    Le quorum étant atteint, l'assemblée peut valablement délibérer.
    {{else}}
    Le quorum n'étant pas atteint, une nouvelle convocation sera nécessaire.
    {{/if}}
</p>
                `.trim(),
            },

            // Section résolutions (itérée)
            {
                id: 'resolutions',
                type: 'resolutions',
                label: 'Résolutions',
                enabled: true,
                required: true,
                order: 5,
                content: `
<h2>Résolutions</h2>
                `.trim(),
            },

            // Détail d'une résolution (itéré sur resolutions)
            {
                id: 'resolution-detail',
                type: 'resolution_detail',
                label: 'Détail d\'une résolution',
                enabled: true,
                required: true,
                order: 6,
                content: `
<h3>Résolution n°{{resolution.numero}} - {{resolution.titre}}</h3>
<p><em>Majorité requise : {{resolution.majorite}}</em></p>

{{#if resolution.description}}
<p>{{resolution.description}}</p>
{{/if}}

<table>
    <tr>
        <td><strong>POUR</strong></td>
        <td>{{formatNumber vote.pour}} tantièmes</td>
        <td>{{formatPercent vote.pourcentage_pour}}</td>
    </tr>
    <tr>
        <td><strong>CONTRE</strong></td>
        <td>{{formatNumber vote.contre}} tantièmes</td>
    </tr>
    <tr>
        <td><strong>ABSTENTION</strong></td>
        <td>{{formatNumber vote.abstention}} tantièmes</td>
    </tr>
</table>

<p>
    <span class="vote-result vote-result-{{lower vote.resultat}}">
        Cette résolution est <strong>{{vote.resultat}}</strong>
    </span>
    {{#if vote.passerelle}}
    <em>(par application de la règle de passerelle)</em>
    {{/if}}
</p>

{{#if vote.commentaires}}
<p><em>Observations : {{vote.commentaires}}</em></p>
{{/if}}
                `.trim(),
                iteration: {
                    over: 'resolutions',
                    itemVariable: 'resolution',
                },
            },

            // Section signatures
            {
                id: 'signatures',
                type: 'signatures',
                label: 'Signatures',
                enabled: true,
                required: true,
                order: 7,
                content: `
<h2>Clôture et Signatures</h2>
<p>
    L'ordre du jour étant épuisé et plus personne ne demandant la parole,
    le Président prononce la clôture de l'assemblée à {{ag.heure_fin}}.
</p>
<p>
    Le présent procès-verbal a été établi le {{date.aujourdhui}}.
</p>

<div class="signature-zone">
    <div class="signature-box">
        <h4>Le Président</h4>
        <p>{{bureau.president_nom}}</p>
    </div>
    <div class="signature-box">
        <h4>Le Secrétaire</h4>
        <p>{{bureau.secretaire_nom}}</p>
    </div>
    <div class="signature-box">
        <h4>Le(s) Scrutateur(s)</h4>
        <p>{{bureau.scrutateurs}}</p>
    </div>
</div>
                `.trim(),
                styles: {
                    pageBreakBefore: true,
                },
            },
        ],

        formulations: {
            resolutionAdopted: 'Cette résolution est ADOPTÉE',
            resolutionRejected: 'Cette résolution est REJETÉE',
            resolutionPostponed: 'Cette résolution est AJOURNÉE',
            quorumReached: 'Le quorum est atteint, l\'assemblée peut valablement délibérer.',
            quorumNotReached: 'Le quorum n\'est pas atteint.',
            voteForLabel: 'POUR',
            voteAgainstLabel: 'CONTRE',
            voteAbstainLabel: 'ABSTENTION',
            closingStatement: 'L\'ordre du jour étant épuisé et plus personne ne demandant la parole, le Président prononce la clôture de l\'assemblée.',
        },
    };
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

class PVTemplateService {
    private systemTemplatesInitialized = false;

    /**
     * Initialise les templates système si nécessaire
     */
    private initializeSystemTemplates(): void {
        if (this.systemTemplatesInitialized) return;

        const templates = getTemplatesFromStorage();

        // Vérifier si le template système existe
        const hasSystemTemplate = Object.values(templates).some(t => t.isSystemTemplate);

        if (!hasSystemTemplate) {
            const systemTemplate: IPVTemplate = {
                id: 'system-default',
                organizationId: 'system',
                name: 'Template Standard',
                description: 'Template par défaut conforme à la réglementation française',
                status: 'active',
                isDefault: false,
                isSystemTemplate: true,
                spec: getDefaultTemplateSpec(),
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
                usageCount: 0,
            };

            templates['system-default'] = systemTemplate;
            saveTemplatesToStorage(templates);
        }

        this.systemTemplatesInitialized = true;
    }

    /**
     * Liste tous les templates pour une organisation
     */
    listTemplates(organizationId: string): IPVTemplate[] {
        this.initializeSystemTemplates();
        const templates = getTemplatesFromStorage();

        return Object.values(templates)
            .filter(t => t.organizationId === organizationId || t.isSystemTemplate)
            .sort((a, b) => {
                // Templates système en premier, puis par date de mise à jour
                if (a.isSystemTemplate && !b.isSystemTemplate) return -1;
                if (!a.isSystemTemplate && b.isSystemTemplate) return 1;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });
    }

    /**
     * Récupère un template par son ID
     */
    getTemplate(templateId: string): IPVTemplate | null {
        this.initializeSystemTemplates();
        const templates = getTemplatesFromStorage();
        return templates[templateId] || null;
    }

    /**
     * Récupère le template par défaut pour une organisation
     */
    getDefaultTemplate(organizationId: string): IPVTemplate | null {
        this.initializeSystemTemplates();
        const templates = getTemplatesFromStorage();

        // Chercher le template par défaut de l'organisation
        const orgDefault = Object.values(templates).find(
            t => t.organizationId === organizationId && t.isDefault
        );
        if (orgDefault) return orgDefault;

        // Sinon retourner le template système
        return Object.values(templates).find(t => t.isSystemTemplate) || null;
    }

    /**
     * Crée un nouveau template
     */
    createTemplate(
        organizationId: string,
        name: string,
        description: string,
        userId: string,
        baseSpec?: Partial<IPVTemplateSpec>
    ): IPVTemplate {
        const templates = getTemplatesFromStorage();

        const defaultSpec = getDefaultTemplateSpec();
        const spec: IPVTemplateSpec = baseSpec
            ? { ...defaultSpec, ...baseSpec }
            : defaultSpec;

        const template: IPVTemplate = {
            id: generateTemplateId(),
            organizationId,
            name,
            description,
            status: 'draft',
            isDefault: false,
            isSystemTemplate: false,
            spec,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: userId,
            usageCount: 0,
        };

        templates[template.id] = template;
        saveTemplatesToStorage(templates);

        return template;
    }

    /**
     * Duplique un template existant
     */
    duplicateTemplate(
        templateId: string,
        organizationId: string,
        userId: string,
        newName?: string
    ): IPVTemplate | null {
        const sourceTemplate = this.getTemplate(templateId);
        if (!sourceTemplate) return null;

        const name = newName || `${sourceTemplate.name} (copie)`;

        return this.createTemplate(
            organizationId,
            name,
            sourceTemplate.description || '',
            userId,
            JSON.parse(JSON.stringify(sourceTemplate.spec)) // Deep clone
        );
    }

    /**
     * Met à jour un template
     */
    updateTemplate(
        templateId: string,
        updates: Partial<Pick<IPVTemplate, 'name' | 'description' | 'status' | 'spec'>>,
        userId: string
    ): IPVTemplate | null {
        const templates = getTemplatesFromStorage();
        const template = templates[templateId];

        if (!template || template.isSystemTemplate) {
            return null;
        }

        const updated: IPVTemplate = {
            ...template,
            ...updates,
            updatedAt: new Date(),
            lastModifiedBy: userId,
        };

        templates[templateId] = updated;
        saveTemplatesToStorage(templates);

        return updated;
    }

    /**
     * Met à jour la spécification d'un template
     */
    updateTemplateSpec(
        templateId: string,
        specUpdates: Partial<IPVTemplateSpec>,
        userId: string
    ): IPVTemplate | null {
        const templates = getTemplatesFromStorage();
        const template = templates[templateId];

        if (!template || template.isSystemTemplate) {
            return null;
        }

        const updated: IPVTemplate = {
            ...template,
            spec: {
                ...template.spec,
                ...specUpdates,
            },
            updatedAt: new Date(),
            lastModifiedBy: userId,
        };

        templates[templateId] = updated;
        saveTemplatesToStorage(templates);

        return updated;
    }

    /**
     * Met à jour une section d'un template
     */
    updateSection(
        templateId: string,
        sectionId: string,
        sectionUpdates: Partial<IPVSection>,
        userId: string
    ): IPVTemplate | null {
        const templates = getTemplatesFromStorage();
        const template = templates[templateId];

        if (!template || template.isSystemTemplate) {
            return null;
        }

        const sectionIndex = template.spec.sections.findIndex(s => s.id === sectionId);
        if (sectionIndex === -1) return null;

        const updatedSections = [...template.spec.sections];
        updatedSections[sectionIndex] = {
            ...updatedSections[sectionIndex],
            ...sectionUpdates,
        };

        return this.updateTemplateSpec(
            templateId,
            { sections: updatedSections },
            userId
        );
    }

    /**
     * Active/désactive une section
     */
    toggleSection(
        templateId: string,
        sectionId: string,
        enabled: boolean,
        userId: string
    ): IPVTemplate | null {
        return this.updateSection(templateId, sectionId, { enabled }, userId);
    }

    /**
     * Réordonne les sections
     */
    reorderSections(
        templateId: string,
        sectionIds: string[],
        userId: string
    ): IPVTemplate | null {
        const templates = getTemplatesFromStorage();
        const template = templates[templateId];

        if (!template || template.isSystemTemplate) {
            return null;
        }

        const sectionsMap = new Map(template.spec.sections.map(s => [s.id, s]));
        const reorderedSections = sectionIds
            .map((id, index) => {
                const section = sectionsMap.get(id);
                if (section) {
                    return { ...section, order: index + 1 };
                }
                return null;
            })
            .filter((s): s is IPVSection => s !== null);

        return this.updateTemplateSpec(
            templateId,
            { sections: reorderedSections },
            userId
        );
    }

    /**
     * Définit un template comme défaut pour l'organisation
     */
    setAsDefault(
        templateId: string,
        organizationId: string
    ): boolean {
        const templates = getTemplatesFromStorage();
        const template = templates[templateId];

        if (!template || template.organizationId !== organizationId) {
            return false;
        }

        // Retirer le flag default des autres templates de l'organisation
        for (const t of Object.values(templates)) {
            if (t.organizationId === organizationId && t.isDefault) {
                t.isDefault = false;
            }
        }

        // Définir ce template comme défaut
        templates[templateId].isDefault = true;
        saveTemplatesToStorage(templates);

        return true;
    }

    /**
     * Supprime un template
     */
    deleteTemplate(templateId: string): boolean {
        const templates = getTemplatesFromStorage();
        const template = templates[templateId];

        if (!template || template.isSystemTemplate) {
            return false;
        }

        delete templates[templateId];
        saveTemplatesToStorage(templates);

        return true;
    }

    /**
     * Incrémente le compteur d'utilisation
     */
    incrementUsageCount(templateId: string): void {
        const templates = getTemplatesFromStorage();
        const template = templates[templateId];

        if (template) {
            template.usageCount = (template.usageCount || 0) + 1;
            saveTemplatesToStorage(templates);
        }
    }

    /**
     * Exporte un template en JSON
     */
    exportTemplate(templateId: string): string | null {
        const template = this.getTemplate(templateId);
        if (!template) return null;

        const exportData = {
            exportVersion: '1.0',
            exportedAt: new Date().toISOString(),
            template: {
                name: template.name,
                description: template.description,
                spec: template.spec,
            },
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Importe un template depuis JSON
     */
    importTemplate(
        jsonString: string,
        organizationId: string,
        userId: string
    ): IPVTemplate | null {
        try {
            const data = JSON.parse(jsonString);

            if (!data.template || !data.template.spec) {
                throw new Error('Format de template invalide');
            }

            return this.createTemplate(
                organizationId,
                data.template.name || 'Template importé',
                data.template.description || '',
                userId,
                data.template.spec
            );
        } catch (error) {
            console.error('[PVTemplateService] Erreur import:', error);
            return null;
        }
    }

    /**
     * Valide un template
     */
    validateTemplate(templateId: string): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const template = this.getTemplate(templateId);
        if (!template) {
            return { valid: false, errors: ['Template non trouvé'], warnings: [] };
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Vérifier les sections requises
        const requiredTypes: PVSectionType[] = ['ag_info', 'quorum', 'resolutions'];
        for (const type of requiredTypes) {
            const section = template.spec.sections.find(s => s.type === type);
            if (!section || !section.enabled) {
                warnings.push(`Section "${type}" manquante ou désactivée`);
            }
        }

        // Vérifier que les sections ont du contenu
        for (const section of template.spec.sections) {
            if (section.enabled && !section.content.trim()) {
                errors.push(`Section "${section.label}" est vide`);
            }
        }

        // Vérifier les formulations
        if (!template.spec.formulations.resolutionAdopted) {
            warnings.push('Formulation "résolution adoptée" manquante');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
}

// Singleton export
export const pvTemplateService = new PVTemplateService();
export default pvTemplateService;
