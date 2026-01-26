/**
 * Générateur PDF pour les formulaires de pouvoir (mandat)
 *
 * Génère un PDF téléchargeable pour que les copropriétaires
 * puissent remplir et signer un pouvoir.
 */

import { jsPDF } from 'jspdf';

export interface PouvoirFormPDFParams {
    agInfo: {
        date: string;
        heure: string;
        lieu: string;
        type: string;
    };
    copropriete: {
        nom: string;
        adresse: string;
    };
    mandant?: {
        nom: string;
        lot: string;
        tantiemes: number;
    };
    mandataire?: {
        nom: string;
        lot: string;
    };
}

export interface PouvoirFormPDFResult {
    blob: Blob;
    url: string;
    generatedAt: string;
}

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Génère le PDF du formulaire de pouvoir
 */
export function generatePouvoirFormPDF(params: PouvoirFormPDFParams): PouvoirFormPDFResult {
    const { agInfo, copropriete, mandant, mandataire } = params;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    let y = MARGIN;

    // Helpers
    const addText = (
        text: string,
        x: number,
        yPos: number,
        options?: {
            fontSize?: number;
            fontStyle?: 'normal' | 'bold' | 'italic';
            color?: [number, number, number];
            align?: 'left' | 'center' | 'right';
            maxWidth?: number;
        }
    ): number => {
        const { fontSize = 10, fontStyle = 'normal', color = [0, 0, 0], align = 'left', maxWidth } = options || {};

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.setTextColor(color[0], color[1], color[2]);

        if (maxWidth) {
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, yPos, { align });
            return lines.length * (fontSize * 0.4);
        }

        doc.text(text, x, yPos, { align });
        return fontSize * 0.4;
    };

    const addLine = (length: number = CONTENT_WIDTH): void => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, MARGIN + length, y);
    };

    const addUnderlinedField = (label: string, value: string = '', fieldWidth: number = 80): void => {
        addText(label, MARGIN, y, { fontSize: 10 });
        const labelWidth = doc.getTextWidth(label);

        // Ligne pointillée pour remplir
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.2);
        const lineStart = MARGIN + labelWidth + 2;
        const lineEnd = MARGIN + fieldWidth;

        for (let i = lineStart; i < lineEnd; i += 2) {
            doc.line(i, y, i + 1, y);
        }

        if (value) {
            addText(value, lineStart + 2, y - 1, { fontSize: 10, fontStyle: 'bold' });
        }
    };

    // ==================== EN-TÊTE ====================

    // Titre principal
    addText('POUVOIR', PAGE_WIDTH / 2, y, {
        fontSize: 24,
        fontStyle: 'bold',
        align: 'center',
        color: [37, 99, 235]
    });
    y += 8;

    addText('(Formulaire de procuration)', PAGE_WIDTH / 2, y, {
        fontSize: 12,
        align: 'center',
        color: [100, 100, 100]
    });
    y += 15;

    // Informations copropriété
    doc.setFillColor(245, 247, 250);
    doc.rect(MARGIN, y - 4, CONTENT_WIDTH, 24, 'F');

    addText('Copropriété :', MARGIN + 4, y, { fontSize: 10, color: [100, 100, 100] });
    addText(copropriete.nom, MARGIN + 4, y + 5, { fontSize: 12, fontStyle: 'bold' });
    addText(copropriete.adresse, MARGIN + 4, y + 10, { fontSize: 10, color: [80, 80, 80] });
    y += 28;

    // Informations AG
    addText(`Assemblée Générale ${agInfo.type}`, MARGIN, y, { fontSize: 11, fontStyle: 'bold' });
    y += 6;
    addText(`Date : ${agInfo.date} à ${agInfo.heure}`, MARGIN, y, { fontSize: 10 });
    y += 5;
    addText(`Lieu : ${agInfo.lieu}`, MARGIN, y, { fontSize: 10 });
    y += 12;

    addLine();
    y += 10;

    // ==================== MANDANT ====================

    addText('Je soussigné(e) (MANDANT)', MARGIN, y, { fontSize: 12, fontStyle: 'bold' });
    y += 10;

    addUnderlinedField('Nom et prénom : ', mandant?.nom || '', CONTENT_WIDTH);
    y += 8;

    addUnderlinedField('Lot(s) : ', mandant?.lot || '', 100);
    addText('Tantièmes : ', MARGIN + 110, y - 8, { fontSize: 10 });
    doc.setDrawColor(150, 150, 150);
    for (let i = MARGIN + 135; i < MARGIN + CONTENT_WIDTH; i += 2) {
        doc.line(i, y - 8, i + 1, y - 8);
    }
    if (mandant?.tantiemes) {
        addText(String(mandant.tantiemes), MARGIN + 137, y - 9, { fontSize: 10, fontStyle: 'bold' });
    }
    y += 8;

    addUnderlinedField('Adresse : ', '', CONTENT_WIDTH);
    y += 15;

    // ==================== MANDATAIRE ====================

    addText('Donne pouvoir à (MANDATAIRE)', MARGIN, y, { fontSize: 12, fontStyle: 'bold' });
    y += 10;

    addUnderlinedField('Nom et prénom : ', mandataire?.nom || '', CONTENT_WIDTH);
    y += 8;

    addUnderlinedField('Lot(s) : ', mandataire?.lot || '', CONTENT_WIDTH);
    y += 8;

    addUnderlinedField('Adresse : ', '', CONTENT_WIDTH);
    y += 15;

    addLine();
    y += 10;

    // ==================== INSTRUCTIONS ====================

    addText('pour me représenter à l\'Assemblée Générale susvisée et voter en mon nom.', MARGIN, y, {
        fontSize: 10,
        maxWidth: CONTENT_WIDTH
    });
    y += 12;

    // Case à cocher pour instructions de vote
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.rect(MARGIN, y - 3, 5, 5);
    addText('Le mandataire votera selon ses propres choix.', MARGIN + 8, y, { fontSize: 10 });
    y += 8;

    doc.rect(MARGIN, y - 3, 5, 5);
    addText('Le mandataire suivra les instructions de vote ci-dessous :', MARGIN + 8, y, { fontSize: 10 });
    y += 10;

    // Zone d'instructions
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 40);
    addText('Instructions de vote (optionnel) :', MARGIN + 4, y + 5, {
        fontSize: 9,
        color: [150, 150, 150],
        fontStyle: 'italic'
    });
    y += 50;

    // ==================== MENTIONS LÉGALES ====================

    doc.setFillColor(255, 251, 235);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 25, 'F');

    addText('Mentions légales :', MARGIN + 4, y + 5, { fontSize: 9, fontStyle: 'bold', color: [180, 100, 0] });
    const legalText = 'Conformément à l\'article 22 de la loi du 10 juillet 1965, un mandataire ne peut recevoir plus de trois pouvoirs. ' +
        'Le présent pouvoir peut être révoqué à tout moment avant l\'Assemblée Générale.';
    addText(legalText, MARGIN + 4, y + 10, { fontSize: 8, color: [100, 80, 50], maxWidth: CONTENT_WIDTH - 8 });
    y += 32;

    // ==================== SIGNATURE ====================

    addText('Fait à', MARGIN, y, { fontSize: 10 });
    doc.setDrawColor(150, 150, 150);
    for (let i = MARGIN + 15; i < MARGIN + 80; i += 2) {
        doc.line(i, y, i + 1, y);
    }

    addText(', le', MARGIN + 85, y, { fontSize: 10 });
    for (let i = MARGIN + 95; i < MARGIN + CONTENT_WIDTH; i += 2) {
        doc.line(i, y, i + 1, y);
    }
    y += 15;

    addText('Signature du mandant :', MARGIN, y, { fontSize: 10, fontStyle: 'bold' });
    y += 5;

    // Zone de signature
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, 80, 30);
    addText('(signature précédée de "Bon pour pouvoir")', MARGIN + 2, y + 25, {
        fontSize: 7,
        color: [150, 150, 150],
        fontStyle: 'italic'
    });

    // ==================== PIED DE PAGE ====================

    const footerY = 280;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, footerY, MARGIN + CONTENT_WIDTH, footerY);

    addText('Document généré par CoProFlex', PAGE_WIDTH / 2, footerY + 5, {
        fontSize: 8,
        color: [150, 150, 150],
        align: 'center'
    });
    addText(`Le ${new Date().toLocaleDateString('fr-FR')}`, PAGE_WIDTH / 2, footerY + 9, {
        fontSize: 8,
        color: [150, 150, 150],
        align: 'center'
    });

    // Génération du résultat
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);

    return {
        blob,
        url,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Génère et télécharge directement le PDF
 */
export function downloadPouvoirFormPDF(params: PouvoirFormPDFParams, filename?: string): void {
    const result = generatePouvoirFormPDF(params);

    const link = document.createElement('a');
    link.href = result.url;
    link.download = filename || `pouvoir-ag-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(result.url);
}
