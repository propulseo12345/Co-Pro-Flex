/**
 * Service de gestion des templates de PV
 * VERSION SUPABASE - Utilise la table pv_templates (si disponible)
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
import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client to avoid deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// Constante pour cleanup legacy localStorage (one-shot en dev)
const LEGACY_STORAGE_KEY = 'pv-templates';

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
            {
                id: 'resolutions',
                type: 'resolutions',
                label: 'Résolutions',
                enabled: true,
                required: true,
                order: 5,
                content: `<h2>Résolutions</h2>`.trim(),
            },
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

function generateTemplateId(): string {
    return `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

class PVTemplateService {
    private initialized = false;
    private systemTemplate: IPVTemplate | null = null;

    /**
     * Initialise le service et nettoie localStorage legacy
     */
    private async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        // Cleanup legacy localStorage (one-shot)
        if (typeof window !== 'undefined') {
            const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacyData) {
                console.warn('[PVTemplateService] Suppression données localStorage legacy');
                localStorage.removeItem(LEGACY_STORAGE_KEY);
            }
        }

        // Initialiser le template système
        this.systemTemplate = {
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
    }

    /**
     * Liste tous les templates pour une organisation
     */
    async listTemplates(organizationId: string): Promise<IPVTemplate[]> {
        await this.init();

        const templates: IPVTemplate[] = [];

        // Toujours inclure le template système
        if (this.systemTemplate) {
            templates.push(this.systemTemplate);
        }

        try {
            const supabase = createUntypedClient();
            const { data, error } = await supabase
                .from('pv_templates')
                .select('*')
                .or(`organization_id.eq.${organizationId},is_system_template.eq.true`)
                .order('updated_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') {
                    console.info('[PVTemplateService] Table pv_templates non disponible');
                    return templates;
                }
                throw error;
            }

            // Mapper et ajouter les templates de la DB
            if (data) {
                for (const t of data) {
                    if (t.id === 'system-default') continue; // Éviter les doublons
                    templates.push(this.mapFromDb(t));
                }
            }
        } catch (error) {
            console.error('[PVTemplateService] Erreur listTemplates:', error);
        }

        return templates.sort((a, b) => {
            if (a.isSystemTemplate && !b.isSystemTemplate) return -1;
            if (!a.isSystemTemplate && b.isSystemTemplate) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }

    /**
     * Récupère un template par son ID
     */
    async getTemplate(templateId: string): Promise<IPVTemplate | null> {
        await this.init();

        if (templateId === 'system-default') {
            return this.systemTemplate;
        }

        try {
            const supabase = createUntypedClient();
            const { data, error } = await supabase
                .from('pv_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (error) {
                if (error.code === '42P01' || error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }

            return this.mapFromDb(data);
        } catch (error) {
            console.error('[PVTemplateService] Erreur getTemplate:', error);
            return null;
        }
    }

    /**
     * Récupère le template par défaut pour une organisation
     */
    async getDefaultTemplate(organizationId: string): Promise<IPVTemplate | null> {
        await this.init();

        try {
            const supabase = createUntypedClient();
            const { data, error } = await supabase
                .from('pv_templates')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('is_default', true)
                .single();

            if (error) {
                if (error.code === '42P01' || error.code === 'PGRST116') {
                    return this.systemTemplate;
                }
                throw error;
            }

            return this.mapFromDb(data);
        } catch (error) {
            return this.systemTemplate;
        }
    }

    /**
     * Crée un nouveau template
     */
    async createTemplate(
        organizationId: string,
        name: string,
        description: string,
        userId: string,
        baseSpec?: Partial<IPVTemplateSpec>
    ): Promise<IPVTemplate | null> {
        await this.init();

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

        try {
            const supabase = createUntypedClient();
            const { error } = await supabase
                .from('pv_templates')
                .insert(this.mapToDb(template));

            if (error) {
                if (error.code === '42P01') {
                    console.warn('[PVTemplateService] Table pv_templates non disponible');
                }
                throw error;
            }

            return template;
        } catch (error) {
            console.error('[PVTemplateService] Erreur createTemplate:', error);
            return null;
        }
    }

    /**
     * Met à jour un template
     */
    async updateTemplate(
        templateId: string,
        updates: Partial<Pick<IPVTemplate, 'name' | 'description' | 'status' | 'spec'>>,
        userId: string
    ): Promise<IPVTemplate | null> {
        if (templateId === 'system-default') {
            return null; // Ne pas modifier le template système
        }

        try {
            const supabase = createUntypedClient();

            const updateData: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
                last_modified_by: userId,
            };

            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.status !== undefined) updateData.status = updates.status;
            if (updates.spec !== undefined) updateData.spec = updates.spec;

            const { data, error } = await supabase
                .from('pv_templates')
                .update(updateData)
                .eq('id', templateId)
                .select()
                .single();

            if (error) throw error;

            return this.mapFromDb(data);
        } catch (error) {
            console.error('[PVTemplateService] Erreur updateTemplate:', error);
            return null;
        }
    }

    /**
     * Supprime un template
     */
    async deleteTemplate(templateId: string): Promise<boolean> {
        if (templateId === 'system-default') {
            return false;
        }

        try {
            const supabase = createUntypedClient();
            const { error } = await supabase
                .from('pv_templates')
                .delete()
                .eq('id', templateId);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('[PVTemplateService] Erreur deleteTemplate:', error);
            return false;
        }
    }

    /**
     * Incrémente le compteur d'utilisation
     */
    async incrementUsageCount(templateId: string): Promise<void> {
        if (templateId === 'system-default') return;

        try {
            const supabase = createUntypedClient();
            await supabase.rpc('increment_template_usage', { template_id: templateId });
        } catch (error) {
            console.error('[PVTemplateService] Erreur incrementUsageCount:', error);
        }
    }

    /**
     * Valide un template
     */
    async validateTemplate(templateId: string): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const template = await this.getTemplate(templateId);
        if (!template) {
            return { valid: false, errors: ['Template non trouvé'], warnings: [] };
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        const requiredTypes: PVSectionType[] = ['ag_info', 'quorum', 'resolutions'];
        for (const type of requiredTypes) {
            const section = template.spec.sections.find(s => s.type === type);
            if (!section || !section.enabled) {
                warnings.push(`Section "${type}" manquante ou désactivée`);
            }
        }

        for (const section of template.spec.sections) {
            if (section.enabled && !section.content.trim()) {
                errors.push(`Section "${section.label}" est vide`);
            }
        }

        if (!template.spec.formulations.resolutionAdopted) {
            warnings.push('Formulation "résolution adoptée" manquante');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    private mapFromDb(data: Record<string, unknown>): IPVTemplate {
        return {
            id: data.id as string,
            organizationId: data.organization_id as string,
            name: data.name as string,
            description: data.description as string || '',
            status: data.status as PVTemplateStatus,
            isDefault: data.is_default as boolean,
            isSystemTemplate: data.is_system_template as boolean,
            spec: data.spec as IPVTemplateSpec,
            createdAt: new Date(data.created_at as string),
            updatedAt: new Date(data.updated_at as string),
            createdBy: data.created_by as string,
            lastModifiedBy: data.last_modified_by as string | undefined,
            usageCount: data.usage_count as number || 0,
        };
    }

    private mapToDb(template: IPVTemplate): Record<string, unknown> {
        return {
            id: template.id,
            organization_id: template.organizationId,
            name: template.name,
            description: template.description,
            status: template.status,
            is_default: template.isDefault,
            is_system_template: template.isSystemTemplate,
            spec: template.spec,
            created_at: template.createdAt.toISOString(),
            updated_at: template.updatedAt.toISOString(),
            created_by: template.createdBy,
            usage_count: template.usageCount,
        };
    }
}

// Singleton export
export const pvTemplateService = new PVTemplateService();
export default pvTemplateService;
