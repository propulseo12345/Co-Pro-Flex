/**
 * Utilitaire pour rendre des documents uploadés (PDF, images) en pages
 * exploitables par jsPDF.
 *
 * - PDF : rendu via pdfjs-dist (chaque page → canvas → dataURL)
 * - Images (PNG, JPG, WEBP) : chargement direct → canvas → dataURL
 *
 * Le résultat est un tableau de pages prêtes à être insérées dans un jsPDF.
 */

import type { jsPDF } from 'jspdf';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface RenderedPage {
  dataUrl: string;
  width: number;
  height: number;
  docName: string;
  pageIndex: number;
  totalPages: number;
}

export interface UploadedDocFile {
  name: string;
  mimeType: string;
  blob: Blob;
}

// A4 dimensions en points (jsPDF)
const A4_W = 210;
const A4_H = 297;
// Résolution de rendu pour les PDF (pixels par point)
const PDF_SCALE = 2;

// ═══════════════════════════════════════════════════════════
// RENDU PDF → PAGES
// ═══════════════════════════════════════════════════════════

async function renderPdfPages(file: UploadedDocFile): Promise<RenderedPage[]> {
  const pdfjsLib = await import('pdfjs-dist');

  // Worker setup — utiliser le worker bundlé
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.blob.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdfDoc.numPages;
  const pages: RenderedPage[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: PDF_SCALE });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    await page.render({ canvasContext: ctx, canvas, viewport }).promise;

    pages.push({
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: viewport.width / PDF_SCALE,
      height: viewport.height / PDF_SCALE,
      docName: file.name,
      pageIndex: i - 1,
      totalPages,
    });

    canvas.width = 0;
    canvas.height = 0;
  }

  return pages;
}

// ═══════════════════════════════════════════════════════════
// RENDU IMAGE → PAGE
// ═══════════════════════════════════════════════════════════

async function renderImagePage(file: UploadedDocFile): Promise<RenderedPage[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file.blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve([{
        dataUrl: url, // on va recréer ci-dessous
        width: img.naturalWidth,
        height: img.naturalHeight,
        docName: file.name,
        pageIndex: 0,
        totalPages: 1,
      }]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Impossible de charger l'image: ${file.name}`));
    };
    img.src = url;
  }).then(async (pages) => {
    // Convertir en dataURL via canvas pour uniformité
    const page = (pages as RenderedPage[])[0];
    const img = new Image();
    const url = URL.createObjectURL(file.blob);

    return new Promise<RenderedPage[]>((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.drawImage(img, 0, 0);
        page.dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        canvas.width = 0;
        canvas.height = 0;
        resolve([page]);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Image load failed: ${file.name}`));
      };
      img.src = url;
    });
  });
}

// ═══════════════════════════════════════════════════════════
// API PUBLIQUE
// ═══════════════════════════════════════════════════════════

/**
 * Rend un fichier uploadé en pages image exploitables par jsPDF.
 */
export async function renderDocumentToPages(file: UploadedDocFile): Promise<RenderedPage[]> {
  const mime = file.mimeType.toLowerCase();

  if (mime === 'application/pdf') {
    return renderPdfPages(file);
  }

  if (mime.startsWith('image/')) {
    return renderImagePage(file);
  }

  console.warn(`[pdf-document-renderer] Type non supporté: ${mime} (${file.name})`);
  return [];
}

/**
 * Rend plusieurs fichiers uploadés en pages.
 */
export async function renderAllDocumentsToPages(files: UploadedDocFile[]): Promise<RenderedPage[]> {
  const results: RenderedPage[] = [];

  for (const file of files) {
    try {
      const pages = await renderDocumentToPages(file);
      results.push(...pages);
    } catch (err) {
      console.error(`[pdf-document-renderer] Erreur rendu ${file.name}:`, err);
    }
  }

  return results;
}

/**
 * Insère des pages rendues dans un document jsPDF existant.
 * Ajoute un en-tête avec le nom du document sur chaque page.
 */
export function insertRenderedPages(doc: jsPDF, pages: RenderedPage[]): void {
  const MARGIN = 15;
  const HEADER_H = 12;

  for (const page of pages) {
    doc.addPage();

    // En-tête avec nom du document
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const pageLabel = page.totalPages > 1
      ? `${page.docName} — page ${page.pageIndex + 1}/${page.totalPages}`
      : page.docName;
    doc.text(pageLabel, MARGIN, MARGIN);

    // Calculer dimensions pour fit dans la page (A4 avec marges)
    const maxW = A4_W - MARGIN * 2;
    const maxH = A4_H - MARGIN * 2 - HEADER_H;
    const ratio = Math.min(maxW / page.width, maxH / page.height, 1);
    const imgW = page.width * ratio;
    const imgH = page.height * ratio;

    // Centrer horizontalement
    const x = MARGIN + (maxW - imgW) / 2;
    const y = MARGIN + HEADER_H;

    doc.addImage(page.dataUrl, 'JPEG', x, y, imgW, imgH);
  }
}
