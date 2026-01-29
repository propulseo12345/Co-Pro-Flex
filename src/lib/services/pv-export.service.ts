/**
 * Service d'export des Procès-Verbaux
 *
 * Formats supportés:
 * - HTML: Export direct du rendu
 * - PDF: Via jsPDF avec mise en page
 * - DOCX: Via structure XML OpenDocument
 */

import jsPDF from 'jspdf';
import type {
    IPVTemplate,
    IPVRenderContext,
    IPVExportOptions,
    IPVExportResult,
    PVExportFormat,
} from '@/types/models/pv-template';
import { pvTemplateRenderer } from './pv-template-renderer';
import { pvTemplateService } from './pv-template.service';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ExportProgress {
    stage: string;
    percentage: number;
}

type ProgressCallback = (progress: ExportProgress) => void;

// ═══════════════════════════════════════════════════════════════
// HTML EXPORT
// ═══════════════════════════════════════════════════════════════

function exportToHtml(
    template: IPVTemplate,
    context: IPVRenderContext,
    _options: IPVExportOptions
): IPVExportResult {
    const result = pvTemplateRenderer.render(template.spec, context);

    if (!result.success) {
        return {
            success: false,
            format: 'html',
            fileName: '',
            error: result.errors.map(e => e.message).join(', '),
        };
    }

    const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
    const fileName = generateFileName(context, 'html');

    return {
        success: true,
        format: 'html',
        blob,
        fileName,
    };
}

// ═══════════════════════════════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════════════════════════════

async function exportToPdf(
    template: IPVTemplate,
    context: IPVRenderContext,
    options: IPVExportOptions,
    onProgress?: ProgressCallback
): Promise<IPVExportResult> {
    onProgress?.({ stage: 'Rendu du template...', percentage: 10 });

    const result = pvTemplateRenderer.render(template.spec, context);

    if (!result.success) {
        return {
            success: false,
            format: 'pdf',
            fileName: '',
            error: result.errors.map(e => e.message).join(', '),
        };
    }

    onProgress?.({ stage: 'Génération du PDF...', percentage: 30 });

    try {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margins = {
            top: 20,
            right: 15,
            bottom: 20,
            left: 15,
        };
        const contentWidth = pageWidth - margins.left - margins.right;

        // Parser le HTML pour extraire le contenu
        const parser = new DOMParser();
        const doc = parser.parseFromString(result.html, 'text/html');

        let currentY = margins.top;
        const lineHeight = 6;
        const paragraphSpacing = 4;
        const sectionSpacing = 10;

        // Fonction pour ajouter une nouvelle page si nécessaire
        const checkPageBreak = (requiredSpace: number): void => {
            if (currentY + requiredSpace > pageHeight - margins.bottom) {
                pdf.addPage();
                currentY = margins.top;

                // Ajouter le pied de page avec numéro de page
                if (template.spec.footer.showPageNumbers) {
                    const pageNum = pdf.internal.pages.length - 1;
                    pdf.setFontSize(9);
                    pdf.setTextColor(128);
                    pdf.text(
                        `Page ${pageNum}`,
                        pageWidth / 2,
                        pageHeight - 10,
                        { align: 'center' }
                    );
                }
            }
        };

        // Fonction pour écrire du texte avec retour à la ligne automatique
        const writeText = (text: string, options: {
            fontSize?: number;
            fontStyle?: 'normal' | 'bold' | 'italic';
            color?: [number, number, number];
            align?: 'left' | 'center' | 'right';
        } = {}): void => {
            const {
                fontSize = 11,
                fontStyle = 'normal',
                color = [0, 0, 0],
                align = 'left',
            } = options;

            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', fontStyle);
            pdf.setTextColor(color[0], color[1], color[2]);

            const lines = pdf.splitTextToSize(text.trim(), contentWidth);
            const textHeight = lines.length * lineHeight;

            checkPageBreak(textHeight);

            let x = margins.left;
            if (align === 'center') x = pageWidth / 2;
            if (align === 'right') x = pageWidth - margins.right;

            pdf.text(lines, x, currentY, { align });
            currentY += textHeight;
        };

        // Fonction pour écrire un titre
        const writeTitle = (text: string, level: number): void => {
            const sizes = [18, 14, 12];
            const fontSize = sizes[Math.min(level - 1, 2)];

            currentY += sectionSpacing / 2;
            checkPageBreak(fontSize + sectionSpacing);

            writeText(text, {
                fontSize,
                fontStyle: 'bold',
                color: hexToRgb(template.spec.global.primaryColor),
            });

            currentY += paragraphSpacing;
        };

        // Fonction pour dessiner un tableau
        const drawTable = (tableEl: Element): void => {
            const rows = tableEl.querySelectorAll('tr');
            if (rows.length === 0) return;

            const rowHeight = 8;
            const cellPadding = 2;

            // Calculer la largeur des colonnes
            const firstRow = rows[0];
            const cells = firstRow.querySelectorAll('th, td');
            const colCount = cells.length;
            const colWidth = contentWidth / colCount;

            checkPageBreak(rows.length * rowHeight + 10);

            let tableY = currentY;

            rows.forEach((row, rowIndex) => {
                const cells = row.querySelectorAll('th, td');
                const isHeader = row.querySelector('th') !== null;

                // Fond pour l'en-tête
                if (isHeader) {
                    pdf.setFillColor(240, 240, 250);
                    pdf.rect(margins.left, tableY, contentWidth, rowHeight, 'F');
                }

                cells.forEach((cell, cellIndex) => {
                    const x = margins.left + cellIndex * colWidth;
                    const text = cell.textContent?.trim() || '';

                    // Bordure de cellule
                    pdf.setDrawColor(200);
                    pdf.rect(x, tableY, colWidth, rowHeight);

                    // Texte
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
                    pdf.setTextColor(0);

                    const lines = pdf.splitTextToSize(text, colWidth - cellPadding * 2);
                    pdf.text(lines[0] || '', x + cellPadding, tableY + rowHeight / 2 + 1);
                });

                tableY += rowHeight;
            });

            currentY = tableY + paragraphSpacing;
        };

        onProgress?.({ stage: 'Mise en page...', percentage: 50 });

        // Traiter le contenu du body
        const body = doc.body;

        // En-tête
        if (template.spec.header.logo?.url) {
            // TODO: Ajouter le logo si c'est une image base64
        }

        if (template.spec.header.title) {
            const title = pvTemplateRenderer.renderText(template.spec.header.title, context);
            writeTitle(title, 1);
        }

        if (template.spec.header.subtitle) {
            const subtitle = pvTemplateRenderer.renderText(template.spec.header.subtitle, context);
            writeText(subtitle, { fontSize: 12, align: 'center', color: [100, 100, 100] });
            currentY += paragraphSpacing;
        }

        // Ligne de séparation
        pdf.setDrawColor(hexToRgb(template.spec.global.primaryColor)[0], hexToRgb(template.spec.global.primaryColor)[1], hexToRgb(template.spec.global.primaryColor)[2]);
        pdf.line(margins.left, currentY, pageWidth - margins.right, currentY);
        currentY += sectionSpacing;

        onProgress?.({ stage: 'Génération des sections...', percentage: 70 });

        // Parcourir les éléments
        const processElement = (el: Element): void => {
            const tagName = el.tagName.toLowerCase();

            switch (tagName) {
                case 'h1':
                    writeTitle(el.textContent || '', 1);
                    break;
                case 'h2':
                    writeTitle(el.textContent || '', 2);
                    break;
                case 'h3':
                    writeTitle(el.textContent || '', 3);
                    break;
                case 'p':
                    writeText(el.textContent || '');
                    currentY += paragraphSpacing;
                    break;
                case 'table':
                    drawTable(el);
                    break;
                case 'ul':
                case 'ol':
                    el.querySelectorAll('li').forEach((li, index) => {
                        const bullet = tagName === 'ol' ? `${index + 1}. ` : '• ';
                        writeText(bullet + (li.textContent || ''));
                    });
                    currentY += paragraphSpacing;
                    break;
                case 'div':
                case 'section':
                case 'header':
                case 'footer':
                    el.childNodes.forEach(child => {
                        if (child.nodeType === Node.ELEMENT_NODE) {
                            processElement(child as Element);
                        }
                    });
                    break;
                default:
                    if (el.textContent?.trim()) {
                        writeText(el.textContent);
                    }
            }
        };

        body.childNodes.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                processElement(child as Element);
            }
        });

        // Watermark si demandé
        if (options.includeWatermark && options.watermarkText) {
            const pageCount = pdf.internal.pages.length - 1;
            for (let i = 1; i <= pageCount; i++) {
                pdf.setPage(i);
                pdf.setFontSize(40);
                pdf.setTextColor(200, 200, 200);
                pdf.text(
                    options.watermarkText,
                    pageWidth / 2,
                    pageHeight / 2,
                    { align: 'center', angle: 45 }
                );
            }
        }

        onProgress?.({ stage: 'Finalisation...', percentage: 90 });

        // Générer le blob
        const pdfBlob = pdf.output('blob');
        const fileName = options.fileName || generateFileName(context, 'pdf');

        onProgress?.({ stage: 'Terminé', percentage: 100 });

        return {
            success: true,
            format: 'pdf',
            blob: pdfBlob,
            fileName,
        };
    } catch (error) {
        return {
            success: false,
            format: 'pdf',
            fileName: '',
            error: error instanceof Error ? error.message : 'Erreur lors de la génération PDF',
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// DOCX EXPORT
// ═══════════════════════════════════════════════════════════════

async function exportToDocx(
    template: IPVTemplate,
    context: IPVRenderContext,
    options: IPVExportOptions,
    onProgress?: ProgressCallback
): Promise<IPVExportResult> {
    onProgress?.({ stage: 'Rendu du template...', percentage: 10 });

    const result = pvTemplateRenderer.render(template.spec, context);

    if (!result.success) {
        return {
            success: false,
            format: 'docx',
            fileName: '',
            error: result.errors.map(e => e.message).join(', '),
        };
    }

    onProgress?.({ stage: 'Conversion en DOCX...', percentage: 30 });

    try {
        // Convertir le HTML en structure DOCX simplifiée
        // Note: Pour une vraie implémentation, utiliser une lib comme docx ou docxtemplater
        const docxContent = htmlToSimpleDocx(result.html, template);

        onProgress?.({ stage: 'Création du fichier...', percentage: 70 });

        const blob = new Blob([docxContent], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const fileName = options.fileName || generateFileName(context, 'docx');

        onProgress?.({ stage: 'Terminé', percentage: 100 });

        return {
            success: true,
            format: 'docx',
            blob,
            fileName,
        };
    } catch (error) {
        return {
            success: false,
            format: 'docx',
            fileName: '',
            error: error instanceof Error ? error.message : 'Erreur lors de la génération DOCX',
        };
    }
}

/**
 * Convertit le HTML en DOCX simplifié (structure XML Office Open)
 * Note: Ceci est une implémentation basique. Pour la production,
 * utiliser une bibliothèque comme docx ou docxtemplater
 */
function htmlToSimpleDocx(html: string, template: IPVTemplate): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extraire le texte brut avec formatage minimal
    const paragraphs: Array<{ text: string; style: string }> = [];

    const processNode = (node: Node, style = 'Normal'): void => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
                paragraphs.push({ text, style });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            const tagName = el.tagName.toLowerCase();

            let newStyle = style;
            switch (tagName) {
                case 'h1':
                    newStyle = 'Heading1';
                    break;
                case 'h2':
                    newStyle = 'Heading2';
                    break;
                case 'h3':
                    newStyle = 'Heading3';
                    break;
                case 'strong':
                case 'b':
                    newStyle = 'Bold';
                    break;
            }

            if (['p', 'h1', 'h2', 'h3', 'li', 'td', 'th'].includes(tagName)) {
                const text = el.textContent?.trim();
                if (text) {
                    paragraphs.push({ text, style: newStyle });
                }
            } else {
                el.childNodes.forEach(child => processNode(child, newStyle));
            }
        }
    };

    doc.body.childNodes.forEach(child => processNode(child));

    // Générer le XML DOCX minimal
    // Note: Ceci est très simplifié - un vrai DOCX nécessite plusieurs fichiers XML zippés
    const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        ${paragraphs
            .map(
                p => `
        <w:p>
            <w:pPr>
                <w:pStyle w:val="${p.style}"/>
            </w:pPr>
            <w:r>
                <w:t>${escapeXml(p.text)}</w:t>
            </w:r>
        </w:p>`
            )
            .join('\n')}
    </w:body>
</w:document>`;

    return xmlContent;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateFileName(context: IPVRenderContext, format: PVExportFormat): string {
    const dateStr = context.ag.date instanceof Date
        ? context.ag.date.toISOString().split('T')[0]
        : new Date(context.ag.date).toISOString().split('T')[0];

    const safeCoproName = context.copropriete.nom
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30);

    return `PV_AG_${context.ag.type}_${safeCoproName}_${dateStr}.${format}`;
}

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
        ];
    }
    return [0, 0, 0];
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ═══════════════════════════════════════════════════════════════
// SERVICE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

class PVExportService {
    /**
     * Exporte un PV dans le format demandé
     */
    async export(
        templateId: string,
        context: IPVRenderContext,
        options: IPVExportOptions,
        onProgress?: ProgressCallback
    ): Promise<IPVExportResult> {
        const template = await pvTemplateService.getTemplate(templateId);

        if (!template) {
            return {
                success: false,
                format: options.format,
                fileName: '',
                error: 'Template non trouvé',
            };
        }

        // Incrémenter le compteur d'utilisation
        pvTemplateService.incrementUsageCount(templateId);

        switch (options.format) {
            case 'html':
                return exportToHtml(template, context, options);
            case 'pdf':
                return exportToPdf(template, context, options, onProgress);
            case 'docx':
                return exportToDocx(template, context, options, onProgress);
            default:
                return {
                    success: false,
                    format: options.format,
                    fileName: '',
                    error: `Format non supporté: ${options.format}`,
                };
        }
    }

    /**
     * Télécharge le résultat d'export
     */
    download(result: IPVExportResult): void {
        if (!result.success || !result.blob) {
            console.error('[PVExport] Impossible de télécharger:', result.error);
            return;
        }

        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Génère un aperçu HTML (pour preview dans un iframe)
     */
    async generatePreview(
        templateId: string,
        context: IPVRenderContext
    ): Promise<{ success: boolean; html: string; errors: string[] }> {
        const template = await pvTemplateService.getTemplate(templateId);

        if (!template) {
            return { success: false, html: '', errors: ['Template non trouvé'] };
        }

        const result = pvTemplateRenderer.render(template.spec, context);

        return {
            success: result.success,
            html: result.html,
            errors: result.errors.map(e => e.message),
        };
    }

    /**
     * Génère un aperçu avec données de test
     */
    async generatePreviewWithMockData(templateId: string): Promise<{ success: boolean; html: string; errors: string[] }> {
        const mockContext = this.getMockContext();
        return await this.generatePreview(templateId, mockContext);
    }

    /**
     * Retourne un contexte de rendu avec des données de test
     */
    getMockContext(): IPVRenderContext {
        return {
            copropriete: {
                nom: 'Résidence Les Jardins de Provence',
                adresse: '12 rue des Lilas',
                codePostal: '75020',
                ville: 'Paris',
                siret: '123 456 789 00012',
                nombreLots: 42,
                totalTantiemes: 10000,
            },
            ag: {
                id: 'ag-test-001',
                type: 'ORDINAIRE',
                typeLabel: 'Ordinaire',
                date: new Date('2025-03-15'),
                heureDebut: '18h30',
                heureFin: '21h15',
                lieu: 'Salle des fêtes, 5 avenue du Général de Gaulle',
                exercice: '2024',
            },
            stats: {
                totalCoproprietaires: 28,
                presentsCount: 15,
                representesCount: 8,
                absentsCount: 5,
                tantiemesPresents: 4500,
                tantiemesRepresentes: 2800,
                tantiemesTotal: 10000,
                quorumPercentage: 73,
                quorumAtteint: true,
            },
            bureau: {
                president: { nom: 'M. Jean DUPONT', qualite: 'Copropriétaire' },
                secretaire: { nom: 'Mme Marie MARTIN', qualite: 'Représentant du syndic' },
                scrutateurs: [
                    { nom: 'M. Pierre DURAND' },
                    { nom: 'Mme Sophie LEFEBVRE' },
                ],
            },
            syndic: {
                nom: 'Cabinet Immobilier Parisien',
                adresse: '25 boulevard Haussmann, 75009 Paris',
                representant: 'M. François BERNARD',
            },
            presences: [
                { nom: 'DUPONT', prenom: 'Jean', lots: ['A101'], tantiemes: 450, statut: 'PRESENT' },
                { nom: 'MARTIN', prenom: 'Marie', lots: ['B203'], tantiemes: 380, statut: 'PRESENT' },
                { nom: 'DURAND', prenom: 'Pierre', lots: ['C105', 'C106'], tantiemes: 620, statut: 'REPRESENTE', mandataire: 'M. DUPONT' },
            ],
            resolutions: [
                {
                    numero: 1,
                    titre: 'Approbation des comptes de l\'exercice 2024',
                    description: 'L\'assemblée générale est appelée à approuver les comptes de l\'exercice clos.',
                    majorite: 'ART_24',
                    majoriteLabel: 'Article 24',
                    votePour: 6200,
                    voteContre: 800,
                    voteAbstention: 300,
                    pourcentagePour: 84.93,
                    seuilRequis: 3651,
                    resultat: 'ADOPTEE',
                },
                {
                    numero: 2,
                    titre: 'Quitus au syndic',
                    majorite: 'ART_24',
                    majoriteLabel: 'Article 24',
                    votePour: 5800,
                    voteContre: 1200,
                    voteAbstention: 300,
                    pourcentagePour: 79.45,
                    seuilRequis: 3651,
                    resultat: 'ADOPTEE',
                },
                {
                    numero: 3,
                    titre: 'Travaux de ravalement de façade',
                    description: 'Réalisation de travaux de ravalement conformément aux devis présentés.',
                    majorite: 'ART_25',
                    majoriteLabel: 'Article 25',
                    votePour: 4200,
                    voteContre: 2500,
                    voteAbstention: 600,
                    pourcentagePour: 57.53,
                    seuilRequis: 5001,
                    resultat: 'REJETEE',
                },
            ],
            meta: {
                generatedAt: new Date(),
                generatedBy: 'Test User',
                templateId: 'test-template',
                templateName: 'Template Test',
            },
        };
    }
}

// Singleton export
export const pvExportService = new PVExportService();
export default pvExportService;
