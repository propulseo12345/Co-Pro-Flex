import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro, fmtDateShort } from '../helpers/formatters';
import { renderSectionTitle } from '../helpers/renderSectionTitle';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie3(doc: jsPDF, p3: EtatDatePayloadV2['partie3_acquereur']): number {
  doc.addPage();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text("PARTIE 3 — Sommes incombant à l'acquéreur", PDF.margin.left, y);
  y += 10;

  y = renderSectionTitle(doc, y, 'Reconstitution des avances');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 60 }, { label: 'Montant', width: 40, align: 'right' }],
    p3.reconstitution_avances.detail.map(d => [d.label, fmtEuro(d.amount)])
  );

  y = renderSectionTitle(doc, y, 'Provisions non encore exigibles');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('Montant : ' + fmtEuro(p3.provisions_non_exigibles.amount), PDF.margin.left + 4, y);
  y += 5;
  if (p3.provisions_non_exigibles.note) {
    doc.setFontSize(PDF.fonts.small);
    doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
    doc.text(p3.provisions_non_exigibles.note, PDF.margin.left + 4, y);
    y += 6;
  }

  y = renderSectionTitle(doc, y, 'Travaux votés non encore appelés');
  y = renderTable(doc, y,
    [{ label: 'Travaux', width: 30 }, { label: 'Date AG', width: 20 }, { label: 'Total voté', width: 20, align: 'right' }, { label: 'Part lot', width: 30, align: 'right' }],
    p3.travaux_votes_non_appeles.detail.map(d => [d.label, fmtDateShort(d.ag_date), fmtEuro(d.total_vote), fmtEuro(d.lot_share)])
  );

  y = renderSectionTitle(doc, y, 'Fonds travaux ALUR (Art. 14-2 II)');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('Solde : ' + fmtEuro(p3.fonds_travaux_alur.balance), PDF.margin.left + 4, y);
  y += 5;
  doc.setFontSize(PDF.fonts.small);
  doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
  doc.text(p3.fonds_travaux_alur.note || 'Non rattaché au lot — attaché au copropriétaire', PDF.margin.left + 4, y);
  y += 8;

  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('TOTAL Partie 3 :', PDF.margin.left + 4, y);
  doc.text(fmtEuro(p3.total), PDF.margin.left + PDF.contentWidth - 2, y, { align: 'right' });

  return y + 8;
}
