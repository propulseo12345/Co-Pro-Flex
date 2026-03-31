import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';

export function renderSectionTitle(doc: jsPDF, y: number, title: string): number {
  if (y > 260) {
    doc.addPage();
    y = PDF.margin.top;
  }

  doc.setFillColor(PDF.colors.bgSection[0], PDF.colors.bgSection[1], PDF.colors.bgSection[2]);
  doc.rect(PDF.margin.left, y, PDF.contentWidth, 8, 'F');
  doc.setFontSize(PDF.fonts.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.primary[0], PDF.colors.primary[1], PDF.colors.primary[2]);
  doc.text(title, PDF.margin.left + 4, y + 6);

  return y + 14;
}
