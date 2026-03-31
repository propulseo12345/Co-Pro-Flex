import { jsPDF } from 'jspdf';
import { PDF } from '../pdfLayout';

interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

export function renderTable(
  doc: jsPDF,
  y: number,
  columns: TableColumn[],
  rows: string[][],
): number {
  if (rows.length === 0) {
    doc.setFontSize(PDF.fonts.small);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
    doc.text('Aucun', PDF.margin.left + 4, y + 4);
    return y + 10;
  }

  const colWidths = columns.map(c => (c.width / 100) * PDF.contentWidth);

  // Header
  doc.setFontSize(PDF.fonts.tiny);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF.colors.textLight[0], PDF.colors.textLight[1], PDF.colors.textLight[2]);
  let x = PDF.margin.left;
  columns.forEach((col, i) => {
    const textX = col.align === 'right' ? x + colWidths[i] - 2 : x + 2;
    doc.text(col.label, textX, y + 4, { align: col.align === 'right' ? 'right' : 'left' });
    x += colWidths[i];
  });
  y += 7;

  doc.setDrawColor(PDF.colors.border[0], PDF.colors.border[1], PDF.colors.border[2]);
  doc.setLineWidth(0.3);
  doc.line(PDF.margin.left, y, PDF.margin.left + PDF.contentWidth, y);
  y += 3;

  // Rows
  doc.setFontSize(PDF.fonts.small);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF.colors.text[0], PDF.colors.text[1], PDF.colors.text[2]);

  for (const row of rows) {
    if (y > 270) {
      doc.addPage();
      y = PDF.margin.top;
    }

    x = PDF.margin.left;
    row.forEach((cell, i) => {
      const textX = columns[i].align === 'right' ? x + colWidths[i] - 2 : x + 2;
      doc.text(cell, textX, y, { align: columns[i].align === 'right' ? 'right' : 'left' });
      x += colWidths[i];
    });
    y += 5;
  }

  return y + 3;
}
