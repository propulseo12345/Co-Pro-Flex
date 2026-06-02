/**
 * Tests unitaires pour le moteur de rendu de templates PV
 */

import { PVTemplateRenderer } from '../pv-template-renderer';
import type { IPVRenderContext, IPVTemplateSpec, IPVSection } from '@/types/models/pv-template';
import { extractVariablesFromText, validateTemplateVariables, isValidVariable } from '@/lib/constants/pv-variables';

describe('PVTemplateRenderer', () => {
    let renderer: PVTemplateRenderer;

    const mockContext: IPVRenderContext = {
        copropriete: {
            nom: 'Résidence Test',
            adresse: '123 rue Test',
            codePostal: '75001',
            ville: 'Paris',
            siret: '12345678900012',
            nombreLots: 30,
            totalTantiemes: 10000,
        },
        ag: {
            id: 'ag-001',
            type: 'ORDINAIRE',
            typeLabel: 'Ordinaire',
            date: new Date('2025-03-15'),
            heureDebut: '18h30',
            heureFin: '21h00',
            lieu: 'Salle de réunion',
            exercice: '2024',
        },
        stats: {
            totalCoproprietaires: 25,
            presentsCount: 12,
            representesCount: 5,
            absentsCount: 8,
            tantiemesPresents: 4000,
            tantiemesRepresentes: 2000,
            tantiemesTotal: 10000,
            quorumPercentage: 60,
            quorumAtteint: true,
        },
        bureau: {
            president: { nom: 'M. Dupont', qualite: 'Copropriétaire' },
            secretaire: { nom: 'Mme Martin', qualite: 'Syndic' },
            scrutateurs: [{ nom: 'M. Durand' }],
        },
        syndic: {
            nom: 'Cabinet Test',
            adresse: '456 avenue Test',
            representant: 'Mme Martin',
        },
        presences: [
            { nom: 'DUPONT', prenom: 'Jean', lots: ['A101'], tantiemes: 400, statut: 'PRESENT' },
            { nom: 'MARTIN', prenom: 'Marie', lots: ['B202'], tantiemes: 300, statut: 'REPRESENTE', mandataire: 'M. Dupont' },
        ],
        resolutions: [
            {
                numero: 1,
                titre: 'Approbation des comptes',
                description: 'Approbation des comptes de l\'exercice 2024',
                majorite: 'ART_24',
                majoriteLabel: 'Article 24',
                votePour: 5500,
                voteContre: 400,
                voteAbstention: 100,
                pourcentagePour: 91.67,
                seuilRequis: 3001,
                resultat: 'ADOPTEE',
            },
            {
                numero: 2,
                titre: 'Travaux de ravalement',
                majorite: 'ART_25',
                majoriteLabel: 'Article 25',
                votePour: 4000,
                voteContre: 1500,
                voteAbstention: 500,
                pourcentagePour: 66.67,
                seuilRequis: 5001,
                resultat: 'REJETEE',
            },
        ],
        meta: {
            generatedAt: new Date(),
            generatedBy: 'Test User',
            templateId: 'test-template',
            templateName: 'Test Template',
        },
    };

    beforeEach(() => {
        renderer = new PVTemplateRenderer();
    });

    describe('renderText', () => {
        it('should replace simple variables', () => {
            const text = 'La copropriété {{copro.nom}} est située à {{copro.ville}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('La copropriété Résidence Test est située à Paris');
        });

        it('should handle nested variables', () => {
            const text = 'Président: {{bureau.president_nom}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('Président: M. Dupont');
        });

        it('should handle missing variables with brackets', () => {
            const text = 'Variable inexistante: {{foo.bar}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toContain('[foo.bar]');
        });

        it('should handle numeric variables', () => {
            const text = 'Total tantièmes: {{copro.total_tantiemes}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('Total tantièmes: 10000');
        });
    });

    describe('conditionals', () => {
        it('should render if block when condition is true', () => {
            const text = '{{#if stats.quorum_atteint}}Quorum OK{{/if}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('Quorum OK');
        });

        it('should not render if block when condition is false', () => {
            const modifiedContext = {
                ...mockContext,
                stats: { ...mockContext.stats, quorumAtteint: false },
            };
            const text = '{{#if stats.quorum_atteint}}Quorum OK{{/if}}';
            const result = renderer.renderText(text, modifiedContext);

            expect(result).toBe('');
        });

        it('should render else block when condition is false', () => {
            const modifiedContext = {
                ...mockContext,
                stats: { ...mockContext.stats, quorumAtteint: false },
            };
            const text = '{{#if stats.quorum_atteint}}OK{{else}}PAS OK{{/if}}';
            const result = renderer.renderText(text, modifiedContext);

            expect(result).toBe('PAS OK');
        });

        it('should handle unless block', () => {
            const modifiedContext = {
                ...mockContext,
                stats: { ...mockContext.stats, quorumAtteint: false },
            };
            const text = '{{#unless stats.quorum_atteint}}Pas de quorum{{/unless}}';
            const result = renderer.renderText(text, modifiedContext);

            expect(result).toBe('Pas de quorum');
        });

        it('should handle comparison operators', () => {
            const text = '{{#if stats.quorum_pourcentage > "50"}}Plus de 50%{{/if}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('Plus de 50%');
        });
    });

    describe('formatters', () => {
        it('should format dates with formatDate helper', () => {
            const text = '{{formatDate ag.date}}';
            const result = renderer.renderText(text, mockContext);

            // Should be formatted in French
            expect(result).toContain('mars');
            expect(result).toContain('2025');
        });

        it('should format numbers with formatNumber helper', () => {
            const text = '{{formatNumber copro.total_tantiemes}}';
            const result = renderer.renderText(text, mockContext);

            // French formatting uses space as thousands separator
            expect(result).toBe('10\u202f000'); // Non-breaking space
        });

        it('should format percentages with formatPercent helper', () => {
            const text = '{{formatPercent stats.quorum_pourcentage}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('60.00%');
        });

        it('should format booleans with formatBool helper', () => {
            const text = '{{formatBool stats.quorum_atteint}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('Oui');
        });

        it('should handle upper helper', () => {
            const text = '{{upper ag.type}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('ORDINAIRE');
        });

        it('should handle lower helper', () => {
            const text = '{{lower ag.type}}';
            const result = renderer.renderText(text, mockContext);

            expect(result).toBe('ordinaire');
        });
    });

    describe('renderSection', () => {
        it('should render a simple section', () => {
            const section: IPVSection = {
                id: 'test-section',
                type: 'ag_info',
                label: 'Test Section',
                enabled: true,
                required: false,
                order: 1,
                content: '<p>AG du {{ag.date}} à {{copro.nom}}</p>',
            };

            const result = renderer.renderSection(section, mockContext);

            expect(result.success).toBe(true);
            expect(result.html).toContain('Résidence Test');
            expect(result.html).toContain('mars');
        });

        it('should render an iterated section over resolutions', () => {
            const section: IPVSection = {
                id: 'resolutions',
                type: 'resolution_detail',
                label: 'Résolutions',
                enabled: true,
                required: true,
                order: 1,
                content: '<h3>Résolution {{resolution.numero}} - {{resolution.titre}}</h3>',
                iteration: {
                    over: 'resolutions',
                    itemVariable: 'resolution',
                },
            };

            const result = renderer.renderSection(section, mockContext);

            expect(result.success).toBe(true);
            expect(result.html).toContain('Résolution 1');
            expect(result.html).toContain('Approbation des comptes');
            expect(result.html).toContain('Résolution 2');
            expect(result.html).toContain('Travaux de ravalement');
        });
    });

    describe('security', () => {
        it('should escape HTML in variable values', () => {
            const maliciousContext = {
                ...mockContext,
                copropriete: {
                    ...mockContext.copropriete,
                    nom: '<script>alert("xss")</script>',
                },
            };

            const text = '{{copro.nom}}';
            const result = renderer.renderText(text, maliciousContext);

            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;script&gt;');
        });
    });
});

describe('Variable validation', () => {
    // extractVariablesFromText / validateTemplateVariables / isValidVariable importés en tête de fichier

    it('should extract variables from text', () => {
        const text = 'Hello {{copro.nom}}, your AG is on {{ag.date}}';
        const variables = extractVariablesFromText(text);

        expect(variables).toContain('copro.nom');
        expect(variables).toContain('ag.date');
    });

    it('should validate known variables', () => {
        expect(isValidVariable('copro.nom')).toBe(true);
        expect(isValidVariable('ag.date')).toBe(true);
        expect(isValidVariable('stats.quorum_atteint')).toBe(true);
    });

    it('should reject unknown variables', () => {
        expect(isValidVariable('foo.bar')).toBe(false);
        expect(isValidVariable('invalid.variable')).toBe(false);
    });

    it('should report errors for invalid variables', () => {
        const text = '{{copro.nom}} and {{invalid.var}}';
        const result = validateTemplateVariables(text);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].variable).toBe('invalid.var');
    });
});
