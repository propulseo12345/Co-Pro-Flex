/**
 * Moteur de rendu de templates PV
 *
 * Syntaxe supportée (style Mustache simplifié):
 * - Variables: {{variable.key}}
 * - Boucles: {{#each collection}}...{{/each}}
 * - Conditionnels: {{#if condition}}...{{else}}...{{/if}}
 * - Helpers: {{formatDate date}} {{formatNumber number}} {{formatCurrency amount}}
 *
 * Sécurité:
 * - Pas d'évaluation de code arbitraire (pas de eval/Function)
 * - Échappement HTML automatique
 * - Validation des variables contre le catalogue
 */

import type { IPVRenderContext, IPVTemplateSpec, IPVSection } from '@/types/models/pv-template';
import { isValidVariable, extractVariablesFromText } from '@/lib/constants/pv-variables';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RenderResult {
    success: boolean;
    html: string;
    errors: RenderError[];
    warnings: string[];
}

export interface RenderError {
    type: 'variable_not_found' | 'invalid_syntax' | 'iteration_error' | 'condition_error';
    message: string;
    location?: string;
}

interface RenderScope {
    global: Record<string, unknown>;
    local: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS DE FORMATAGE
// ═══════════════════════════════════════════════════════════════

const FORMATTERS: Record<string, (value: unknown, ...args: string[]) => string> = {
    /**
     * Formate une date
     * Usage: {{formatDate ag.date "long"}} ou {{formatDate ag.date "short"}}
     */
    formatDate: (value: unknown, format?: string): string => {
        if (!value) return '';
        const date = value instanceof Date ? value : new Date(value as string);
        if (isNaN(date.getTime())) return String(value);

        const options: Intl.DateTimeFormatOptions =
            format === 'short'
                ? { day: '2-digit', month: '2-digit', year: 'numeric' }
                : { day: 'numeric', month: 'long', year: 'numeric' };

        return date.toLocaleDateString('fr-FR', options);
    },

    /**
     * Formate un nombre
     * Usage: {{formatNumber stats.tantiemes_presents}}
     */
    formatNumber: (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(num)) return String(value);
        return num.toLocaleString('fr-FR');
    },

    /**
     * Formate un montant en euros
     * Usage: {{formatCurrency montant}}
     */
    formatCurrency: (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(num)) return String(value);
        return num.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    },

    /**
     * Formate un pourcentage
     * Usage: {{formatPercent stats.quorum_pourcentage}}
     */
    formatPercent: (value: unknown, decimals?: string): string => {
        if (value === null || value === undefined) return '';
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(num)) return String(value);
        const dec = decimals ? parseInt(decimals, 10) : 2;
        return `${num.toFixed(dec)}%`;
    },

    /**
     * Convertit un booléen en Oui/Non
     * Usage: {{formatBool stats.quorum_atteint}}
     */
    formatBool: (value: unknown, trueText?: string, falseText?: string): string => {
        const truthy = trueText || 'Oui';
        const falsy = falseText || 'Non';
        return value ? truthy : falsy;
    },

    /**
     * Met en majuscules
     * Usage: {{upper resolution.resultat}}
     */
    upper: (value: unknown): string => {
        return String(value ?? '').toUpperCase();
    },

    /**
     * Met en minuscules
     * Usage: {{lower resolution.titre}}
     */
    lower: (value: unknown): string => {
        return String(value ?? '').toLowerCase();
    },

    /**
     * Capitalise la première lettre
     * Usage: {{capitalize ag.type}}
     */
    capitalize: (value: unknown): string => {
        const str = String(value ?? '');
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
};

// ═══════════════════════════════════════════════════════════════
// CLASSE RENDERER
// ═══════════════════════════════════════════════════════════════

export class PVTemplateRenderer {
    private errors: RenderError[] = [];
    private warnings: string[] = [];

    /**
     * Rend un template complet en HTML
     */
    render(spec: IPVTemplateSpec, context: IPVRenderContext): RenderResult {
        this.errors = [];
        this.warnings = [];

        try {
            const scope = this.buildScope(context);
            let html = this.renderDocument(spec, scope);

            // Appliquer les styles globaux
            html = this.wrapWithStyles(html, spec);

            return {
                success: this.errors.length === 0,
                html,
                errors: this.errors,
                warnings: this.warnings,
            };
        } catch (error) {
            this.errors.push({
                type: 'invalid_syntax',
                message: error instanceof Error ? error.message : 'Erreur de rendu inconnue',
            });
            return {
                success: false,
                html: '',
                errors: this.errors,
                warnings: this.warnings,
            };
        }
    }

    /**
     * Rend uniquement une section (pour le preview)
     */
    renderSection(section: IPVSection, context: IPVRenderContext): RenderResult {
        this.errors = [];
        this.warnings = [];

        try {
            const scope = this.buildScope(context);
            let html = '';

            if (section.iteration) {
                html = this.renderIteratedSection(section, scope);
            } else {
                html = this.renderTemplate(section.content, scope);
            }

            return {
                success: this.errors.length === 0,
                html,
                errors: this.errors,
                warnings: this.warnings,
            };
        } catch (error) {
            this.errors.push({
                type: 'invalid_syntax',
                message: error instanceof Error ? error.message : 'Erreur de rendu',
            });
            return {
                success: false,
                html: '',
                errors: this.errors,
                warnings: this.warnings,
            };
        }
    }

    /**
     * Rend un texte simple avec substitution de variables (pour preview rapide)
     */
    renderText(text: string, context: IPVRenderContext): string {
        const scope = this.buildScope(context);
        return this.renderTemplate(text, scope);
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Construit le scope de rendu à partir du contexte
     */
    private buildScope(context: IPVRenderContext): RenderScope {
        // Formater les dates
        const formatDateLong = (date: Date | string): string => {
            const d = date instanceof Date ? date : new Date(date);
            return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        };

        const formatDateShort = (date: Date | string): string => {
            const d = date instanceof Date ? date : new Date(date);
            return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        return {
            global: {
                // Copropriété
                'copro.nom': context.copropriete.nom,
                'copro.adresse': `${context.copropriete.adresse}, ${context.copropriete.codePostal} ${context.copropriete.ville}`,
                'copro.adresse_rue': context.copropriete.adresse,
                'copro.code_postal': context.copropriete.codePostal,
                'copro.ville': context.copropriete.ville,
                'copro.siret': context.copropriete.siret || '',
                'copro.nombre_lots': context.copropriete.nombreLots,
                'copro.total_tantiemes': context.copropriete.totalTantiemes,

                // AG
                'ag.type': context.ag.typeLabel,
                'ag.date': formatDateLong(context.ag.date),
                'ag.date_courte': formatDateShort(context.ag.date),
                'ag.heure_debut': context.ag.heureDebut,
                'ag.heure_fin': context.ag.heureFin || '',
                'ag.lieu': context.ag.lieu,
                'ag.exercice': context.ag.exercice || '',

                // Stats
                'stats.total_coproprietaires': context.stats.totalCoproprietaires,
                'stats.presents_count': context.stats.presentsCount,
                'stats.representes_count': context.stats.representesCount,
                'stats.absents_count': context.stats.absentsCount,
                'stats.tantiemes_presents': context.stats.tantiemesPresents,
                'stats.tantiemes_representes': context.stats.tantiemesRepresentes,
                'stats.tantiemes_total_presents': context.stats.tantiemesPresents + context.stats.tantiemesRepresentes,
                'stats.quorum_pourcentage': context.stats.quorumPercentage,
                'stats.quorum_atteint': context.stats.quorumAtteint,

                // Bureau
                'bureau.president_nom': context.bureau.president?.nom || '',
                'bureau.president_qualite': context.bureau.president?.qualite || '',
                'bureau.secretaire_nom': context.bureau.secretaire?.nom || '',
                'bureau.secretaire_qualite': context.bureau.secretaire?.qualite || '',
                'bureau.scrutateurs': context.bureau.scrutateurs?.map(s => s.nom).join(', ') || '',

                // Syndic
                'syndic.nom': context.syndic?.nom || '',
                'syndic.adresse': context.syndic?.adresse || '',
                'syndic.representant': context.syndic?.representant || '',

                // Dates
                'date.aujourdhui': formatDateLong(new Date()),
                'date.aujourdhui_courte': formatDateShort(new Date()),

                // Collections pour itération
                resolutions: context.resolutions,
                presences: context.presences,
            },
            local: {},
        };
    }

    /**
     * Rend le document complet
     */
    private renderDocument(spec: IPVTemplateSpec, scope: RenderScope): string {
        const parts: string[] = [];

        // Render header
        if (spec.header) {
            parts.push(this.renderHeader(spec.header, scope));
        }

        // Render sections
        for (const section of spec.sections) {
            if (!section.enabled) continue;

            if (section.iteration) {
                parts.push(this.renderIteratedSection(section, scope));
            } else {
                parts.push(this.renderSectionWithStyles(section, scope));
            }
        }

        // Render footer
        if (spec.footer) {
            parts.push(this.renderFooter(spec.footer, scope));
        }

        return parts.join('\n');
    }

    /**
     * Rend l'en-tête
     */
    private renderHeader(
        header: IPVTemplateSpec['header'],
        scope: RenderScope
    ): string {
        const parts: string[] = [];

        parts.push('<header class="pv-header">');

        // Logo
        if (header.logo?.url) {
            const logoStyle = `width: ${header.logo.width}; height: ${header.logo.height}; text-align: ${header.logo.position};`;
            parts.push(`<div class="pv-logo" style="${logoStyle}">`);
            parts.push(`<img src="${this.escapeHtml(header.logo.url)}" alt="Logo" />`);
            parts.push('</div>');
        }

        // Titre
        if (header.title) {
            const renderedTitle = this.renderTemplate(header.title, scope);
            parts.push(`<h1 class="pv-title">${renderedTitle}</h1>`);
        }

        // Sous-titre
        if (header.subtitle) {
            const renderedSubtitle = this.renderTemplate(header.subtitle, scope);
            parts.push(`<h2 class="pv-subtitle">${renderedSubtitle}</h2>`);
        }

        // Date et copropriété
        if (header.showDate || header.showCopropriete) {
            parts.push('<div class="pv-header-info">');
            if (header.showCopropriete) {
                parts.push(`<p class="pv-copropriete">${this.resolveVariable('copro.nom', scope)}</p>`);
            }
            if (header.showDate) {
                parts.push(`<p class="pv-date">${this.resolveVariable('ag.date', scope)}</p>`);
            }
            parts.push('</div>');
        }

        parts.push('</header>');

        return parts.join('\n');
    }

    /**
     * Rend le pied de page
     */
    private renderFooter(
        footer: IPVTemplateSpec['footer'],
        scope: RenderScope
    ): string {
        const parts: string[] = [];

        parts.push('<footer class="pv-footer">');

        if (footer.content) {
            const renderedContent = this.renderTemplate(footer.content, scope);
            parts.push(`<div class="pv-footer-content">${renderedContent}</div>`);
        }

        if (footer.showPageNumbers) {
            // Les numéros de page seront gérés par le CSS ou lors de l'export PDF
            parts.push('<div class="pv-page-number">');
            parts.push(footer.pageNumberFormat || 'Page {page}');
            parts.push('</div>');
        }

        parts.push('</footer>');

        return parts.join('\n');
    }

    /**
     * Rend une section avec ses styles
     */
    private renderSectionWithStyles(section: IPVSection, scope: RenderScope): string {
        const styles = this.buildSectionStyles(section.styles);
        const content = this.renderTemplate(section.content, scope);

        return `<section class="pv-section pv-section-${section.type}" id="${section.id}" style="${styles}">${content}</section>`;
    }

    /**
     * Rend une section itérée (boucle sur résolutions ou présences)
     */
    private renderIteratedSection(section: IPVSection, scope: RenderScope): string {
        if (!section.iteration) return '';

        const collection = scope.global[section.iteration.over] as unknown[];
        if (!Array.isArray(collection)) {
            this.errors.push({
                type: 'iteration_error',
                message: `Collection "${section.iteration.over}" non trouvée ou invalide`,
                location: section.id,
            });
            return '';
        }

        const parts: string[] = [];
        const itemVar = section.iteration.itemVariable;

        for (let i = 0; i < collection.length; i++) {
            const item = collection[i] as Record<string, unknown>;

            // Créer un scope local avec les variables de l'item
            const localScope: RenderScope = {
                global: scope.global,
                local: {
                    ...scope.local,
                    [`${itemVar}.index`]: i,
                    [`${itemVar}.first`]: i === 0,
                    [`${itemVar}.last`]: i === collection.length - 1,
                    ...this.flattenObject(item, itemVar),
                },
            };

            // Mapper les noms de variables du contexte vers le format attendu
            if (section.iteration.over === 'resolutions') {
                localScope.local['resolution.numero'] = item.numero;
                localScope.local['resolution.titre'] = item.titre;
                localScope.local['resolution.description'] = item.description || '';
                localScope.local['resolution.majorite'] = item.majoriteLabel;
                localScope.local['resolution.seuil_requis'] = item.seuilRequis;
                localScope.local['vote.pour'] = item.votePour;
                localScope.local['vote.contre'] = item.voteContre;
                localScope.local['vote.abstention'] = item.voteAbstention;
                localScope.local['vote.pourcentage_pour'] = item.pourcentagePour;
                localScope.local['vote.resultat'] = item.resultat;
                localScope.local['vote.passerelle'] = item.passerelle || false;
                localScope.local['vote.commentaires'] = item.commentaires || '';
            }

            const renderedContent = this.renderTemplate(section.content, localScope);
            const styles = this.buildSectionStyles(section.styles);

            parts.push(
                `<div class="pv-section pv-section-${section.type} pv-iteration-item" style="${styles}">${renderedContent}</div>`
            );
        }

        return parts.join('\n');
    }

    /**
     * Rend un template avec substitution de variables
     */
    private renderTemplate(template: string, scope: RenderScope): string {
        let result = template;

        // 1. Traiter les boucles {{#each collection}}...{{/each}}
        result = this.processLoops(result, scope);

        // 2. Traiter les conditionnels {{#if condition}}...{{/if}}
        result = this.processConditionals(result, scope);

        // 3. Traiter les helpers {{helper arg1 arg2}}
        result = this.processHelpers(result, scope);

        // 4. Traiter les variables simples {{variable.key}}
        result = this.processVariables(result, scope);

        return result;
    }

    /**
     * Traite les boucles dans le template
     */
    private processLoops(template: string, scope: RenderScope): string {
        const loopRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

        return template.replace(loopRegex, (_, collectionName: string, content: string) => {
            const collection = scope.global[collectionName] as unknown[];
            if (!Array.isArray(collection)) {
                this.warnings.push(`Collection "${collectionName}" non trouvée`);
                return '';
            }

            return collection
                .map((item, index) => {
                    const localScope: RenderScope = {
                        global: scope.global,
                        local: {
                            ...scope.local,
                            '@index': index,
                            '@first': index === 0,
                            '@last': index === collection.length - 1,
                            ...this.flattenObject(item as Record<string, unknown>, 'this'),
                        },
                    };
                    return this.renderTemplate(content, localScope);
                })
                .join('');
        });
    }

    /**
     * Traite les conditionnels dans le template
     */
    private processConditionals(template: string, scope: RenderScope): string {
        // {{#if condition}}...{{else}}...{{/if}}
        const ifElseRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
        let result = template.replace(ifElseRegex, (_, condition: string, ifContent: string, elseContent: string) => {
            const value = this.evaluateCondition(condition.trim(), scope);
            return value ? this.renderTemplate(ifContent, scope) : this.renderTemplate(elseContent, scope);
        });

        // {{#if condition}}...{{/if}} (sans else)
        const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
        result = result.replace(ifRegex, (_, condition: string, content: string) => {
            const value = this.evaluateCondition(condition.trim(), scope);
            return value ? this.renderTemplate(content, scope) : '';
        });

        // {{#unless condition}}...{{/unless}}
        const unlessRegex = /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
        result = result.replace(unlessRegex, (_, condition: string, content: string) => {
            const value = this.evaluateCondition(condition.trim(), scope);
            return !value ? this.renderTemplate(content, scope) : '';
        });

        return result;
    }

    /**
     * Évalue une condition simple
     */
    private evaluateCondition(condition: string, scope: RenderScope): boolean {
        // Comparaisons: variable == "value" ou variable != "value"
        const comparisonMatch = condition.match(/^([^\s=!]+)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
        if (comparisonMatch) {
            const [, varName, operator, rawValue] = comparisonMatch;
            const leftValue = this.resolveVariable(varName.trim(), scope);
            let rightValue = rawValue.trim();

            // Enlever les quotes si présentes
            if ((rightValue.startsWith('"') && rightValue.endsWith('"')) ||
                (rightValue.startsWith("'") && rightValue.endsWith("'"))) {
                rightValue = rightValue.slice(1, -1);
            }

            switch (operator) {
                case '==':
                    return String(leftValue) === rightValue;
                case '!=':
                    return String(leftValue) !== rightValue;
                case '>':
                    return Number(leftValue) > Number(rightValue);
                case '<':
                    return Number(leftValue) < Number(rightValue);
                case '>=':
                    return Number(leftValue) >= Number(rightValue);
                case '<=':
                    return Number(leftValue) <= Number(rightValue);
            }
        }

        // Variable simple (truthy check)
        const value = this.resolveVariable(condition, scope);
        return Boolean(value);
    }

    /**
     * Traite les helpers
     */
    private processHelpers(template: string, scope: RenderScope): string {
        // {{helperName arg1 arg2 ...}}
        const helperRegex = /\{\{(formatDate|formatNumber|formatCurrency|formatPercent|formatBool|upper|lower|capitalize)\s+([^}]+)\}\}/g;

        return template.replace(helperRegex, (_, helperName: string, argsStr: string) => {
            const formatter = FORMATTERS[helperName];
            if (!formatter) return '';

            const args = argsStr.split(/\s+/).map(arg => {
                // Si c'est une variable
                if (!arg.startsWith('"') && !arg.startsWith("'")) {
                    return this.resolveVariable(arg, scope);
                }
                // Si c'est une string littérale
                return arg.slice(1, -1);
            });

            return formatter(args[0], ...args.slice(1).map(String));
        });
    }

    /**
     * Traite les variables simples
     */
    private processVariables(template: string, scope: RenderScope): string {
        // {{variable.key}}
        const varRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g;

        return template.replace(varRegex, (match, varName: string) => {
            const value = this.resolveVariable(varName, scope);

            if (value === undefined) {
                // Variable non trouvée - la garder entre crochets
                this.warnings.push(`Variable non résolue: ${varName}`);
                return `[${varName}]`;
            }

            return this.escapeHtml(String(value));
        });
    }

    /**
     * Résout une variable dans le scope
     */
    private resolveVariable(name: string, scope: RenderScope): unknown {
        // Chercher d'abord dans le scope local
        if (name in scope.local) {
            return scope.local[name];
        }

        // Puis dans le scope global
        if (name in scope.global) {
            return scope.global[name];
        }

        // Essayer de résoudre un chemin (ex: "resolution.titre")
        const parts = name.split('.');
        let current: unknown = scope.local;

        for (const part of parts) {
            if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
                current = (current as Record<string, unknown>)[part];
            } else {
                current = undefined;
                break;
            }
        }

        if (current !== undefined) return current;

        // Essayer dans le global
        current = scope.global;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
                current = (current as Record<string, unknown>)[part];
            } else {
                current = undefined;
                break;
            }
        }

        return current;
    }

    /**
     * Aplatit un objet pour le scope
     */
    private flattenObject(obj: Record<string, unknown>, prefix: string): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(obj)) {
            const fullKey = `${prefix}.${key}`;
            result[fullKey] = value;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                Object.assign(result, this.flattenObject(value as Record<string, unknown>, fullKey));
            }
        }

        return result;
    }

    /**
     * Construit les styles CSS d'une section
     */
    private buildSectionStyles(styles?: IPVSection['styles']): string {
        if (!styles) return '';

        const cssProps: string[] = [];

        if (styles.marginTop) cssProps.push(`margin-top: ${styles.marginTop}`);
        if (styles.marginBottom) cssProps.push(`margin-bottom: ${styles.marginBottom}`);
        if (styles.padding) cssProps.push(`padding: ${styles.padding}`);
        if (styles.backgroundColor) cssProps.push(`background-color: ${styles.backgroundColor}`);
        if (styles.borderTop) cssProps.push(`border-top: ${styles.borderTop}`);
        if (styles.borderBottom) cssProps.push(`border-bottom: ${styles.borderBottom}`);
        if (styles.fontSize) cssProps.push(`font-size: ${styles.fontSize}`);
        if (styles.textAlign) cssProps.push(`text-align: ${styles.textAlign}`);
        if (styles.pageBreakBefore) cssProps.push('page-break-before: always');
        if (styles.pageBreakAfter) cssProps.push('page-break-after: always');

        return cssProps.join('; ');
    }

    /**
     * Enveloppe le HTML avec les styles globaux
     */
    private wrapWithStyles(html: string, spec: IPVTemplateSpec): string {
        const { global: g } = spec;

        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Procès-Verbal</title>
    <style>
        @page {
            margin: ${g.pageMargins.top} ${g.pageMargins.right} ${g.pageMargins.bottom} ${g.pageMargins.left};
        }
        body {
            font-family: ${g.fontFamily};
            font-size: ${g.fontSize};
            line-height: ${g.lineHeight};
            color: #1a1a1a;
            margin: 0;
            padding: 20px;
        }
        .pv-header {
            text-align: center;
            margin-bottom: 2em;
            padding-bottom: 1em;
            border-bottom: 2px solid ${g.primaryColor};
        }
        .pv-logo img {
            max-height: 80px;
            object-fit: contain;
        }
        .pv-title {
            font-size: 1.5em;
            color: ${g.primaryColor};
            margin: 0.5em 0;
        }
        .pv-subtitle {
            font-size: 1.2em;
            color: ${g.secondaryColor};
            font-weight: normal;
            margin: 0.25em 0;
        }
        .pv-section {
            margin: 1.5em 0;
        }
        .pv-section h2 {
            font-size: 1.2em;
            color: ${g.primaryColor};
            border-bottom: 1px solid ${g.secondaryColor};
            padding-bottom: 0.25em;
            margin-bottom: 0.75em;
        }
        .pv-section h3 {
            font-size: 1.1em;
            color: ${g.secondaryColor};
            margin: 1em 0 0.5em;
        }
        .pv-footer {
            margin-top: 2em;
            padding-top: 1em;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 0.9em;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: ${g.primaryColor}15;
            font-weight: 600;
        }
        .vote-result {
            font-weight: bold;
            text-transform: uppercase;
            padding: 0.25em 0.5em;
            border-radius: 4px;
        }
        .vote-result-adoptee {
            background-color: #dcfce7;
            color: #166534;
        }
        .vote-result-rejetee {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .vote-result-ajournee {
            background-color: #fef3c7;
            color: #92400e;
        }
        .signature-zone {
            display: flex;
            justify-content: space-between;
            margin-top: 3em;
            gap: 2em;
        }
        .signature-box {
            flex: 1;
            border: 1px solid #ccc;
            padding: 1em;
            min-height: 100px;
        }
        .signature-box h4 {
            margin: 0 0 0.5em;
            font-size: 0.9em;
            color: ${g.secondaryColor};
        }
        @media print {
            body { padding: 0; }
            .pv-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
${html}
</body>
</html>`;
    }

    /**
     * Échappe les caractères HTML
     */
    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Singleton export
export const pvTemplateRenderer = new PVTemplateRenderer();
export default pvTemplateRenderer;
