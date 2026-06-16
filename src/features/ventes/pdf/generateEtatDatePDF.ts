import { jsPDF } from 'jspdf';
import { PDF } from './pdfLayout';
import { fmtDateShort } from './helpers/formatters';
import { renderHeader } from './sections/renderHeader';
import { renderPartie1 } from './sections/renderPartie1';
import { renderPartie2 } from './sections/renderPartie2';
import { renderPartie3 } from './sections/renderPartie3';
import { renderAnnexe } from './sections/renderAnnexe';
import { addSignatureBlock, renderCertificatArt20 } from './sections/renderSignature';
import type { EtatDatePayloadV2 } from '../domain/types';

export interface GeneratedEtatDatePDF {
  doc: jsPDF;
  fileName: string;
}

/**
 * Construit le PDF de l'état daté (V2) et le RETOURNE sans le sauvegarder : l'appelant choisit de
 * `doc.save()` (téléchargement) et/ou `doc.output('blob')` (archivage GED). Contient l'en-tête,
 * les 3 parties, l'annexe quote-part, le bloc signature du syndic et le certificat art. 20-II.
 */
export function generateEtatDatePDF(payload: EtatDatePayloadV2): GeneratedEtatDatePDF {
  const doc = new jsPDF();

  renderHeader(doc, payload);
  renderPartie1(doc, payload.partie_1_sommes_dues_vendeur);
  renderPartie2(doc, payload.partie_2_dues_par_syndicat);
  renderPartie3(doc, payload.partie_3_charge_acquereur);
  let y = renderAnnexe(doc, payload.annexe_quote_part, payload.syndic, payload.effective_date);

  // Bloc signature du syndic, en fin d'annexe.
  y += 4;
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);
  doc.text('SIGNATURE DU SYNDIC', PDF.margin.left, y);
  y += 6;
  addSignatureBlock(doc, y, payload.syndic, payload.effective_date);

  // Certificat art. 20-II (nouvelle page).
  renderCertificatArt20(doc, payload);

  // Pieds de page — calculés APRÈS l'ajout de toutes les pages (pagination correcte).
  const totalPages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Page ' + i + '/' + totalPages, pw - 20, ph - 10, { align: 'right' });
    doc.text('Copro Manager — Document confidentiel', 20, ph - 10);
  }

  const type = payload.snapshot_type === 'pre' ? 'pre-etat-date' : 'etat-date';
  const lotRef = (payload.lot.ref ?? 'lot').replace(/\s+/g, '-');
  const rawDate = new Date(payload.effective_date);
  const datePart = Number.isNaN(rawDate.getTime())
    ? 'date-inconnue'
    : fmtDateShort(payload.effective_date).replace(/\//g, '-');
  const fileName = type + '-' + lotRef + '-' + datePart + '.pdf';

  return { doc, fileName };
}
