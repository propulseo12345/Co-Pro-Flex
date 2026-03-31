import { jsPDF } from 'jspdf';
import { fmtDateShort } from './helpers/formatters';
import { renderHeader } from './sections/renderHeader';
import { renderPartie1 } from './sections/renderPartie1';
import { renderPartie2 } from './sections/renderPartie2';
import { renderPartie3 } from './sections/renderPartie3';
import { renderAnnexe } from './sections/renderAnnexe';
import type { EtatDatePayloadV2 } from '../domain/types';

export function generateEtatDatePDF(payload: EtatDatePayloadV2): void {
  const doc = new jsPDF();

  renderHeader(doc, payload);
  renderPartie1(doc, payload.partie1_vendeur_doit);
  renderPartie2(doc, payload.partie2_syndicat_doit);
  renderPartie3(doc, payload.partie3_acquereur);
  renderAnnexe(doc, payload.annexe, payload.copro, payload.snapshot_date);

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
  const lotRef = payload.lot.ref.replace(/\s+/g, '-');
  const date = fmtDateShort(payload.snapshot_date).replace(/\//g, '-');
  doc.save(type + '-' + lotRef + '-' + date + '.pdf');
}
