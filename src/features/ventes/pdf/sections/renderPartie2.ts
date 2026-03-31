import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';
import { fmtEuro } from '../helpers/formatters';
import { renderSectionTitle } from '../helpers/renderSectionTitle';
import { renderTable } from '../helpers/renderTable';
import type { EtatDatePayloadV2 } from '../../domain/types';

export function renderPartie2(doc: jsPDF, p2: EtatDatePayloadV2['partie2_syndicat_doit']): number {
  doc.addPage();
  let y = PDF.margin.top;

  doc.setFontSize(PDF.fonts.subtitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('PARTIE 2 — Sommes dues par le syndicat au vendeur', PDF.margin.left, y);
  y += 10;

  y = renderSectionTitle(doc, y, 'Avances versées restituables');
  y = renderTable(doc, y,
    [{ label: 'Libellé', width: 40 }, { label: 'Type', width: 30 }, { label: 'Montant', width: 30, align: 'right' }],
    p2.avances_versees.detail.map(d => [d.label, d.type, fmtEuro(d.amount)])
  );

  y = renderSectionTitle(doc, y, 'Provisions post-mutation (trop-versé)');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('Montant : ' + fmtEuro(p2.provisions_post_mutation.amount), PDF.margin.left + 4, y);
  y += 5;
  if (p2.provisions_post_mutation.note) {
    doc.setFontSize(PDF.fonts.small);
    doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
    doc.text(p2.provisions_post_mutation.note, PDF.margin.left + 4, y);
    y += 6;
  }

  y = renderSectionTitle(doc, y, 'Trop-perçus (régularisation)');
  doc.setFontSize(PDF.fonts.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('Montant : ' + fmtEuro(p2.trop_percus.amount), PDF.margin.left + 4, y);
  y += 8;

  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('TOTAL Partie 2 :', PDF.margin.left + 4, y);
  doc.setTextColor(PDF.colors.success[0], PDF.colors.success[1], PDF.colors.success[2]);
  doc.text(fmtEuro(p2.total), PDF.margin.left + PDF.contentWidth - 2, y, { align: 'right' });

  return y + 8;
}
