// ============================================================================
// Edge Function: ag_generate_document
// Génère les documents PDF pour les AG (Convocation, Feuille de présence, PV)
// CoProFlex - Niveau 4D
// Référentiel légal: Art. 9, 11, 14, 15, 17, 64 décret 67-223
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts";

// ============================================================================
// TYPES
// ============================================================================

type AgDocumentType = "convocation" | "attendance_sheet" | "pv";

interface GenerateDocumentRequest {
  copro_id: string;
  ag_id: string;
  doc_type: AgDocumentType;
}

interface GenerateDocumentResponse {
  success: boolean;
  error?: string;
  document_id?: string;
  storage_path?: string;
  signed_url?: string;
  expires_at?: string;
  version?: number;
}

interface CoproInfo {
  id: string;
  name: string;
  address?: string;
  postal_code?: string;
  city?: string;
  siret?: string;
}

interface AgMeetingInfo {
  id: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  location: string;
  status: string;
  convocation_date?: string;
  president_name?: string;
  secretary_name?: string;
  scrutineer1_name?: string;
  scrutineer2_name?: string;
  session_started_at?: string;
  session_ended_at?: string;
  opening_notes?: string;
  closing_notes?: string;
  incidents?: string;
}

interface ResolutionInfo {
  id: string;
  resolution_number: number;
  title: string;
  description?: string;
  majority_type: string;
  status: string;
  tantiemes_for: number;
  tantiemes_against: number;
  tantiemes_abstention: number;
  voters_for: number;
  voters_against: number;
  voters_abstention: number;
  is_approved?: boolean;
  threshold_tantiemes?: number;
  variables?: Record<string, unknown>;
  rendered_description?: string; // Computed after variable interpolation
}

interface AttendanceInfo {
  id: string;
  coproprietaire_id: string;
  owner_name: string;
  lot_refs: string[];
  tantiemes: number;
  presence_type: string;
  represented_by_name?: string;
  signed: boolean;
}

interface QuorumInfo {
  total_tantiemes: number;
  present_tantiemes: number;
  quorum_ratio: number;
  attendees_count: number;
  present_count: number;
  proxy_count: number;
  correspondence_count: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================================================
// PDF GENERATION HELPERS
// ============================================================================

const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 50;
const LINE_HEIGHT = 16;
const SMALL_LINE_HEIGHT = 14;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)} à ${formatTime(dateStr)}`;
}

function getMajorityLabel(majorityType: string): string {
  const labels: Record<string, string> = {
    art24: "Article 24 (majorité simple)",
    art25: "Article 25 (majorité absolue)",
    art25_1: "Article 25-1 (passerelle)",
    art26: "Article 26 (double majorité)",
    art26_1: "Article 26-1 (passerelle)",
    unanimity: "Unanimité",
  };
  return labels[majorityType] || majorityType;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

// ============================================================================
// VARIABLE INTERPOLATION (same logic as src/lib/ag/rendering/render-resolution-template.ts)
// ============================================================================

function isMontantVariable(varName: string): boolean {
  const lowerName = varName.toLowerCase();
  return (
    lowerName.includes("montant") ||
    lowerName.includes("budget") ||
    lowerName.includes("somme") ||
    lowerName.includes("cout") ||
    lowerName.includes("prix") ||
    lowerName.includes("total") ||
    lowerName.includes("provision")
  );
}

function isDateVariable(varName: string): boolean {
  const lowerName = varName.toLowerCase();
  return (
    lowerName.includes("date") ||
    lowerName.includes("debut") ||
    lowerName.includes("fin") ||
    lowerName.includes("cloture") ||
    lowerName.includes("echeance")
  );
}

function isISODateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(value);
}

function formatDateFRForPdf(value: unknown): string {
  if (!value) return "";
  try {
    const strVal = String(value);
    // Already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(strVal)) {
      return strVal;
    }
    const date = new Date(strVal);
    if (isNaN(date.getTime())) return strVal;
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(value);
  }
}

function formatMontantFRForPdf(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  try {
    let num: number;
    if (typeof value === "number") {
      num = value;
    } else {
      const cleaned = String(value).replace(/[€\s]/g, "").replace(",", ".");
      num = parseFloat(cleaned);
    }
    if (isNaN(num)) return String(value);
    return num.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  } catch {
    return String(value);
  }
}

function formatValueForPdf(varName: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  const strValue = String(value);
  if (strValue === "") return "";

  if (isDateVariable(varName) || (typeof value === "string" && isISODateString(value))) {
    return formatDateFRForPdf(value);
  }
  if (isMontantVariable(varName)) {
    const formatted = formatMontantFRForPdf(value);
    if (formatted !== strValue) return formatted;
  }
  return strValue;
}

/**
 * Renders a resolution template by replacing {variable} placeholders with values
 * CRITICAL: This must match the logic in src/lib/ag/rendering/render-resolution-template.ts
 */
function renderResolutionBody(body: string, variables?: Record<string, unknown> | null): string {
  if (!body) return "";
  if (!variables) return body;

  return body.replace(/\{([^}]+)\}/g, (match, varName: string) => {
    const trimmedName = varName.trim();
    if (!(trimmedName in variables)) {
      // Variable not found - leave empty (not placeholder)
      return "";
    }
    return formatValueForPdf(trimmedName, variables[trimmedName]);
  });
}

// ============================================================================
// PDF GENERATORS
// ============================================================================

async function generateConvocation(
  copro: CoproInfo,
  ag: AgMeetingInfo,
  resolutions: ResolutionInfo[],
  owners: AttendanceInfo[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const maxWidth = width - MARGIN_LEFT - MARGIN_RIGHT;
  let y = height - MARGIN_TOP;

  const drawText = (text: string, options: { font?: PDFFont; size?: number; bold?: boolean; indent?: number } = {}) => {
    const f = options.bold ? fontBold : (options.font || font);
    const size = options.size || 10;
    const x = MARGIN_LEFT + (options.indent || 0);

    const lines = wrapText(text, f, size, maxWidth - (options.indent || 0));
    for (const line of lines) {
      if (y < MARGIN_BOTTOM + 20) {
        page = pdfDoc.addPage([595, 842]);
        y = height - MARGIN_TOP;
      }
      page.drawText(line, { x, y, font: f, size, color: rgb(0, 0, 0) });
      y -= LINE_HEIGHT;
    }
  };

  const drawLine = () => {
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: width - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= LINE_HEIGHT;
  };

  // En-tête
  drawText("CONVOCATION À L'ASSEMBLÉE GÉNÉRALE", { bold: true, size: 14 });
  y -= 5;
  drawText("(Article 9 du décret n°67-223 du 17 mars 1967)", { size: 8 });
  y -= LINE_HEIGHT;

  // Informations copropriété
  drawText("COPROPRIÉTÉ :", { bold: true });
  drawText(copro.name);
  if (copro.address) drawText(copro.address);
  if (copro.postal_code && copro.city) drawText(`${copro.postal_code} ${copro.city}`);
  y -= LINE_HEIGHT / 2;

  // Informations AG
  drawLine();
  y -= 5;

  const meetingTypeLabel = ag.meeting_type === "ordinary" ? "ordinaire" :
                          ag.meeting_type === "extraordinary" ? "extraordinaire" : "mixte";
  drawText(`Assemblée Générale ${meetingTypeLabel}`, { bold: true, size: 12 });
  y -= 5;
  drawText(ag.title, { size: 11 });
  y -= LINE_HEIGHT / 2;

  drawText(`Date : ${formatDateTime(ag.meeting_date)}`, { bold: true });
  drawText(`Lieu : ${ag.location}`);
  y -= LINE_HEIGHT;

  // Délai légal (Art. 64)
  drawText("Conformément à l'article 64 du décret du 17 mars 1967, cette convocation", { size: 9 });
  drawText("vous est adressée au moins 21 jours avant la date de l'assemblée.", { size: 9 });
  y -= LINE_HEIGHT;

  // Ordre du jour
  drawLine();
  y -= 5;
  drawText("ORDRE DU JOUR", { bold: true, size: 12 });
  y -= LINE_HEIGHT / 2;

  for (const resolution of resolutions) {
    drawText(`${resolution.resolution_number}. ${resolution.title}`, { bold: true, size: 10 });
    // Use rendered_description (with variables interpolated) instead of raw description
    const descToShow = resolution.rendered_description || resolution.description;
    if (descToShow) {
      drawText(descToShow, { size: 9, indent: 20 });
    }
    drawText(`Majorité requise : ${getMajorityLabel(resolution.majority_type)}`, { size: 8, indent: 20 });
    y -= 5;
  }

  y -= LINE_HEIGHT;

  // Tantièmes (Art. 11)
  drawLine();
  y -= 5;
  drawText("VOS TANTIÈMES DE COPROPRIÉTÉ (Article 11 du décret)", { bold: true, size: 10 });
  y -= 5;
  drawText("Le détail de vos tantièmes est joint à la présente convocation.", { size: 9 });
  y -= LINE_HEIGHT;

  // Mentions légales
  drawLine();
  y -= 5;
  drawText("MENTIONS IMPORTANTES", { bold: true, size: 10 });
  y -= 5;

  const mentions = [
    "• Vous pouvez vous faire représenter par un mandataire muni d'un pouvoir.",
    "• Un copropriétaire ne peut recevoir plus de 3 délégations de vote (sauf si le total de ses voix n'excède pas 10% du total des voix).",
    "• Vous pouvez voter par correspondance en utilisant le formulaire joint.",
    "• Les documents relatifs à l'ordre du jour sont consultables au siège du syndic.",
  ];

  for (const mention of mentions) {
    drawText(mention, { size: 8 });
  }

  y -= LINE_HEIGHT;
  drawText(`Fait à ${copro.city || "[Ville]"}, le ${formatDate(ag.convocation_date || new Date().toISOString())}`, { size: 9 });
  y -= LINE_HEIGHT;
  drawText("Le Syndic", { bold: true, size: 10 });

  return await pdfDoc.save();
}

async function generateAttendanceSheet(
  copro: CoproInfo,
  ag: AgMeetingInfo,
  attendance: AttendanceInfo[],
  quorum: QuorumInfo
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([842, 595]); // A4 paysage
  const { width, height } = page.getSize();
  let y = height - MARGIN_TOP;

  // En-tête
  page.drawText("FEUILLE DE PRÉSENCE", {
    x: MARGIN_LEFT,
    y,
    font: fontBold,
    size: 16,
    color: rgb(0, 0, 0),
  });
  y -= 10;
  page.drawText("(Articles 14 et 15 du décret n°67-223 du 17 mars 1967)", {
    x: MARGIN_LEFT,
    y,
    font,
    size: 8,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= LINE_HEIGHT * 1.5;

  // Informations AG
  page.drawText(`Copropriété : ${copro.name}`, { x: MARGIN_LEFT, y, font: fontBold, size: 10 });
  y -= LINE_HEIGHT;
  page.drawText(`Assemblée Générale : ${ag.title}`, { x: MARGIN_LEFT, y, font, size: 10 });
  y -= LINE_HEIGHT;
  page.drawText(`Date : ${formatDateTime(ag.meeting_date)}`, { x: MARGIN_LEFT, y, font, size: 10 });
  page.drawText(`Lieu : ${ag.location}`, { x: 400, y, font, size: 10 });
  y -= LINE_HEIGHT * 1.5;

  // Tableau
  const colWidths = [30, 200, 100, 80, 60, 60, 60, 100];
  const headers = ["N°", "Copropriétaire", "Lots", "Tantièmes", "Présent", "Représenté", "Corresp.", "Signature"];

  let x = MARGIN_LEFT;

  // En-têtes du tableau
  page.drawLine({
    start: { x: MARGIN_LEFT, y: y + 5 },
    end: { x: width - MARGIN_RIGHT, y: y + 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], { x: x + 5, y, font: fontBold, size: 8 });
    x += colWidths[i];
  }
  y -= LINE_HEIGHT;

  page.drawLine({
    start: { x: MARGIN_LEFT, y: y + 5 },
    end: { x: width - MARGIN_RIGHT, y: y + 5 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  // Lignes du tableau
  let rowNum = 1;
  for (const att of attendance) {
    if (y < MARGIN_BOTTOM + 80) {
      page = pdfDoc.addPage([842, 595]);
      y = height - MARGIN_TOP;

      // Répéter les en-têtes
      x = MARGIN_LEFT;
      for (let i = 0; i < headers.length; i++) {
        page.drawText(headers[i], { x: x + 5, y, font: fontBold, size: 8 });
        x += colWidths[i];
      }
      y -= LINE_HEIGHT;
    }

    x = MARGIN_LEFT;

    // N°
    page.drawText(String(rowNum), { x: x + 5, y, font, size: 8 });
    x += colWidths[0];

    // Nom
    const name = att.owner_name.length > 30 ? att.owner_name.substring(0, 27) + "..." : att.owner_name;
    page.drawText(name, { x: x + 5, y, font, size: 8 });
    x += colWidths[1];

    // Lots
    const lots = (att.lot_refs || []).join(", ");
    const lotsDisplay = lots.length > 15 ? lots.substring(0, 12) + "..." : lots;
    page.drawText(lotsDisplay, { x: x + 5, y, font, size: 8 });
    x += colWidths[2];

    // Tantièmes
    page.drawText(String(att.tantiemes), { x: x + 5, y, font, size: 8 });
    x += colWidths[3];

    // Présent (checkbox)
    const checkPresent = att.presence_type === "present" ? "X" : "";
    page.drawText(checkPresent, { x: x + 25, y, font: fontBold, size: 10 });
    x += colWidths[4];

    // Représenté
    const checkProxy = att.presence_type === "proxy" ? "X" : "";
    page.drawText(checkProxy, { x: x + 25, y, font: fontBold, size: 10 });
    x += colWidths[5];

    // Correspondance
    const checkCorr = att.presence_type === "correspondence" ? "X" : "";
    page.drawText(checkCorr, { x: x + 25, y, font: fontBold, size: 10 });
    x += colWidths[6];

    // Signature (espace vide)
    if (att.signed) {
      page.drawText("Signé", { x: x + 5, y, font, size: 8, color: rgb(0.3, 0.5, 0.3) });
    }

    y -= SMALL_LINE_HEIGHT;
    rowNum++;
  }

  // Ligne de séparation finale
  page.drawLine({
    start: { x: MARGIN_LEFT, y: y + 5 },
    end: { x: width - MARGIN_RIGHT, y: y + 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= LINE_HEIGHT * 2;

  // Récapitulatif quorum
  page.drawText("RÉCAPITULATIF (Article 15 du décret)", { x: MARGIN_LEFT, y, font: fontBold, size: 10 });
  y -= LINE_HEIGHT;

  page.drawText(`Total tantièmes copropriété : ${quorum.total_tantiemes}`, { x: MARGIN_LEFT, y, font, size: 9 });
  page.drawText(`Tantièmes représentés : ${quorum.present_tantiemes}`, { x: 300, y, font, size: 9 });
  page.drawText(`Quorum : ${quorum.quorum_ratio.toFixed(2)}%`, { x: 550, y, font: fontBold, size: 9 });
  y -= LINE_HEIGHT;

  page.drawText(`Présents : ${quorum.present_count}`, { x: MARGIN_LEFT, y, font, size: 9 });
  page.drawText(`Représentés : ${quorum.proxy_count}`, { x: 200, y, font, size: 9 });
  page.drawText(`Vote correspondance : ${quorum.correspondence_count}`, { x: 400, y, font, size: 9 });
  y -= LINE_HEIGHT * 2;

  // Signatures
  page.drawText("Le Président de séance :", { x: MARGIN_LEFT, y, font: fontBold, size: 9 });
  page.drawText("Le Secrétaire :", { x: 400, y, font: fontBold, size: 9 });
  y -= LINE_HEIGHT * 3;
  page.drawText(ag.president_name || "_________________________", { x: MARGIN_LEFT, y, font, size: 9 });
  page.drawText(ag.secretary_name || "_________________________", { x: 400, y, font, size: 9 });

  return await pdfDoc.save();
}

async function generatePV(
  copro: CoproInfo,
  ag: AgMeetingInfo,
  resolutions: ResolutionInfo[],
  attendance: AttendanceInfo[],
  quorum: QuorumInfo
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const maxWidth = width - MARGIN_LEFT - MARGIN_RIGHT;
  let y = height - MARGIN_TOP;

  const drawText = (text: string, options: { font?: PDFFont; size?: number; bold?: boolean; indent?: number; color?: [number, number, number] } = {}) => {
    const f = options.bold ? fontBold : (options.font || font);
    const size = options.size || 10;
    const x = MARGIN_LEFT + (options.indent || 0);
    const color = options.color ? rgb(...options.color) : rgb(0, 0, 0);

    const lines = wrapText(text, f, size, maxWidth - (options.indent || 0));
    for (const line of lines) {
      if (y < MARGIN_BOTTOM + 20) {
        page = pdfDoc.addPage([595, 842]);
        y = height - MARGIN_TOP;
      }
      page.drawText(line, { x, y, font: f, size, color });
      y -= LINE_HEIGHT;
    }
  };

  const drawLine = () => {
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: width - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= LINE_HEIGHT;
  };

  // En-tête
  drawText("PROCÈS-VERBAL D'ASSEMBLÉE GÉNÉRALE", { bold: true, size: 14 });
  y -= 5;
  drawText("(Article 17 du décret n°67-223 du 17 mars 1967)", { size: 8 });
  y -= LINE_HEIGHT;

  // Informations copropriété
  drawText("COPROPRIÉTÉ :", { bold: true });
  drawText(copro.name);
  if (copro.address) drawText(copro.address);
  if (copro.postal_code && copro.city) drawText(`${copro.postal_code} ${copro.city}`);
  y -= LINE_HEIGHT / 2;

  drawLine();

  // Informations AG
  const meetingTypeLabel = ag.meeting_type === "ordinary" ? "ordinaire" :
                          ag.meeting_type === "extraordinary" ? "extraordinaire" : "mixte";
  drawText(`ASSEMBLÉE GÉNÉRALE ${meetingTypeLabel.toUpperCase()}`, { bold: true, size: 12 });
  drawText(ag.title);
  y -= LINE_HEIGHT / 2;

  drawText(`Date de la réunion : ${formatDateTime(ag.meeting_date)}`);
  drawText(`Lieu : ${ag.location}`);
  if (ag.convocation_date) {
    drawText(`Date des convocations : ${formatDate(ag.convocation_date)}`);
  }
  y -= LINE_HEIGHT / 2;

  // Bureau
  drawText("Bureau de l'Assemblée :", { bold: true });
  if (ag.president_name) drawText(`Président de séance : ${ag.president_name}`, { indent: 20 });
  if (ag.secretary_name) drawText(`Secrétaire : ${ag.secretary_name}`, { indent: 20 });
  if (ag.scrutineer1_name) drawText(`Scrutateur : ${ag.scrutineer1_name}`, { indent: 20 });
  if (ag.scrutineer2_name) drawText(`Scrutateur : ${ag.scrutineer2_name}`, { indent: 20 });
  y -= LINE_HEIGHT / 2;

  // Quorum
  drawLine();
  drawText("QUORUM", { bold: true, size: 11 });
  y -= 5;
  drawText(`Tantièmes totaux de la copropriété : ${quorum.total_tantiemes}`);
  drawText(`Tantièmes représentés : ${quorum.present_tantiemes} (${quorum.quorum_ratio.toFixed(2)}%)`);
  drawText(`Copropriétaires présents : ${quorum.present_count} | Représentés : ${quorum.proxy_count} | Vote par correspondance : ${quorum.correspondence_count}`);
  y -= LINE_HEIGHT;

  // Résolutions
  drawLine();
  drawText("RÉSOLUTIONS ET VOTES", { bold: true, size: 12 });
  y -= LINE_HEIGHT / 2;

  for (const resolution of resolutions) {
    if (y < MARGIN_BOTTOM + 100) {
      page = pdfDoc.addPage([595, 842]);
      y = height - MARGIN_TOP;
    }

    drawText(`Résolution n°${resolution.resolution_number} : ${resolution.title}`, { bold: true, size: 10 });
    // Use rendered_description (with variables interpolated) instead of raw description
    const descToShow = resolution.rendered_description || resolution.description;
    if (descToShow) {
      drawText(descToShow, { size: 9, indent: 10 });
    }
    drawText(`Majorité requise : ${getMajorityLabel(resolution.majority_type)}`, { size: 8, indent: 10 });

    // Résultats du vote
    const totalVotes = resolution.tantiemes_for + resolution.tantiemes_against + resolution.tantiemes_abstention;
    if (totalVotes > 0) {
      y -= 5;
      drawText("Résultat du vote :", { bold: true, size: 9, indent: 10 });
      drawText(`Pour : ${resolution.tantiemes_for} tantièmes (${resolution.voters_for} votants)`, { size: 9, indent: 20 });
      drawText(`Contre : ${resolution.tantiemes_against} tantièmes (${resolution.voters_against} votants)`, { size: 9, indent: 20 });
      drawText(`Abstention : ${resolution.tantiemes_abstention} tantièmes (${resolution.voters_abstention} votants)`, { size: 9, indent: 20 });
      if (resolution.threshold_tantiemes) {
        drawText(`Seuil requis : ${resolution.threshold_tantiemes} tantièmes`, { size: 8, indent: 20 });
      }

      // Décision
      const isApproved = resolution.is_approved === true || resolution.status === "approved";
      const decision = isApproved ? "ADOPTÉE" : "REJETÉE";
      const decisionColor: [number, number, number] = isApproved ? [0.1, 0.5, 0.1] : [0.7, 0.1, 0.1];
      drawText(`Décision : ${decision}`, { bold: true, size: 10, indent: 10, color: decisionColor });
    } else {
      drawText(`Statut : ${resolution.status}`, { size: 9, indent: 10 });
    }

    y -= LINE_HEIGHT;
  }

  // Notes et incidents
  if (ag.incidents) {
    drawLine();
    drawText("INCIDENTS DE SÉANCE", { bold: true, size: 11 });
    drawText(ag.incidents, { size: 9 });
    y -= LINE_HEIGHT;
  }

  // Clôture
  drawLine();
  drawText("CLÔTURE DE LA SÉANCE", { bold: true, size: 11 });
  y -= 5;

  if (ag.session_ended_at) {
    drawText(`La séance est levée à ${formatTime(ag.session_ended_at)}.`);
  }

  if (ag.closing_notes) {
    drawText(ag.closing_notes, { size: 9 });
  }

  y -= LINE_HEIGHT * 2;

  // Signatures
  drawText("Le présent procès-verbal a été lu et approuvé.", { size: 9 });
  y -= LINE_HEIGHT * 2;

  drawText("Le Président de séance :", { bold: true, size: 9 });
  y -= LINE_HEIGHT * 2;
  drawText(ag.president_name || "_________________________", { size: 9 });
  y -= LINE_HEIGHT;

  drawText("Le Secrétaire :", { bold: true, size: 9 });
  y -= LINE_HEIGHT * 2;
  drawText(ag.secretary_name || "_________________________", { size: 9 });

  // Pied de page légal
  y = MARGIN_BOTTOM;
  page.drawText(
    "Document à conserver pendant 10 ans minimum (Article 33 du décret n°67-223)",
    { x: MARGIN_LEFT, y, font, size: 7, color: rgb(0.5, 0.5, 0.5) }
  );

  return await pdfDoc.save();
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchAgData(supabase: SupabaseClient, coproId: string, agId: string) {
  // Fetch copro info
  const { data: copro, error: coproError } = await supabase
    .from("copros")
    .select("id, name, address, postal_code, city, siret")
    .eq("id", coproId)
    .single();

  if (coproError) throw new Error(`Copro not found: ${coproError.message}`);

  // Fetch AG info
  const { data: ag, error: agError } = await supabase
    .from("ag_meetings")
    .select(`
      id, title, meeting_type, meeting_date, location, status,
      convocation_date, president_name, secretary_name,
      scrutineer1_name, scrutineer2_name,
      session_started_at, session_ended_at,
      opening_notes, closing_notes, incidents
    `)
    .eq("id", agId)
    .eq("copro_id", coproId)
    .single();

  if (agError) throw new Error(`AG not found: ${agError.message}`);

  // Fetch resolutions (including variables for interpolation)
  const { data: resolutions, error: resError } = await supabase
    .from("ag_resolutions")
    .select(`
      id, resolution_number, title, description, majority_type, status,
      tantiemes_for, tantiemes_against, tantiemes_abstention,
      voters_for, voters_against, voters_abstention,
      is_approved, threshold_tantiemes, variables
    `)
    .eq("ag_id", agId)
    .order("resolution_number");

  if (resError) throw new Error(`Resolutions error: ${resError.message}`);

  // Apply variable interpolation to resolution descriptions
  const processedResolutions = (resolutions || []).map((r: Record<string, unknown>) => {
    const vars = r.variables as Record<string, unknown> | null;
    const description = r.description as string | undefined;
    const renderedDescription = description ? renderResolutionBody(description, vars) : "";

    // Log warning if there are still unresolved placeholders
    if (renderedDescription && /\{[^}]+\}/.test(renderedDescription)) {
      console.warn(`[ag_generate_document] Unresolved placeholders in resolution ${r.resolution_number}: ${renderedDescription.match(/\{[^}]+\}/g)?.join(", ")}`);
    }

    return {
      ...r,
      rendered_description: renderedDescription,
    };
  });

  // Fetch attendance via view
  const { data: attendance, error: attError } = await supabase
    .from("v_ag_attendance_summary")
    .select("*")
    .eq("ag_id", agId);

  if (attError) throw new Error(`Attendance error: ${attError.message}`);

  // Fetch quorum
  const { data: quorumData, error: quorumError } = await supabase
    .rpc("compute_ag_quorum", { p_ag_id: agId });

  if (quorumError) throw new Error(`Quorum error: ${quorumError.message}`);

  const quorum: QuorumInfo = quorumData?.[0] || {
    total_tantiemes: 0,
    present_tantiemes: 0,
    quorum_ratio: 0,
    attendees_count: 0,
    present_count: 0,
    proxy_count: 0,
    correspondence_count: 0,
  };

  return {
    copro: copro as CoproInfo,
    ag: ag as AgMeetingInfo,
    resolutions: processedResolutions as ResolutionInfo[],
    attendance: (attendance || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      coproprietaire_id: a.coproprietaire_id as string,
      owner_name: a.owner_name as string,
      lot_refs: a.lot_refs as string[] || [],
      tantiemes: a.tantiemes as number,
      presence_type: a.presence_type as string,
      represented_by_name: a.represented_by_name as string | undefined,
      signed: a.signed as boolean,
    })) as AttendanceInfo[],
    quorum,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed. Use POST." } as GenerateDocumentResponse),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params: GenerateDocumentRequest = await req.json();

    // Validation
    if (!params.copro_id || !isValidUUID(params.copro_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or missing copro_id" } as GenerateDocumentResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!params.ag_id || !isValidUUID(params.ag_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or missing ag_id" } as GenerateDocumentResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validDocTypes: AgDocumentType[] = ["convocation", "attendance_sheet", "pv"];
    if (!params.doc_type || !validDocTypes.includes(params.doc_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid doc_type. Must be one of: ${validDocTypes.join(", ")}`
        } as GenerateDocumentResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Authorization header" } as GenerateDocumentResponse),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Client avec auth utilisateur pour les queries
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Client service pour storage
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch data
    const { copro, ag, resolutions, attendance, quorum } = await fetchAgData(
      supabase,
      params.copro_id,
      params.ag_id
    );

    // Generate PDF based on type
    let pdfBytes: Uint8Array;
    const docTypeLabels: Record<AgDocumentType, string> = {
      convocation: "Convocation",
      attendance_sheet: "Feuille_presence",
      pv: "PV",
    };

    switch (params.doc_type) {
      case "convocation":
        pdfBytes = await generateConvocation(copro, ag, resolutions, attendance);
        break;
      case "attendance_sheet":
        pdfBytes = await generateAttendanceSheet(copro, ag, attendance, quorum);
        break;
      case "pv":
        pdfBytes = await generatePV(copro, ag, resolutions, attendance, quorum);
        break;
    }

    // Storage path
    const storagePath = `ged/${params.copro_id}/ag/${params.ag_id}/${params.doc_type}.pdf`;
    const fileName = `${docTypeLabels[params.doc_type]}_${ag.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("ged")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `Storage error: ${uploadError.message}` } as GenerateDocumentResponse),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Register document
    const { data: regResult, error: regError } = await supabase
      .rpc("register_ag_document", {
        p_copro_id: params.copro_id,
        p_ag_id: params.ag_id,
        p_doc_type: params.doc_type,
        p_storage_path: storagePath,
        p_file_name: fileName,
        p_file_size: pdfBytes.length,
        p_metadata: {
          resolutions_count: resolutions.length,
          attendance_count: attendance.length,
          quorum_ratio: quorum.quorum_ratio,
          generated_for_status: ag.status,
        },
      });

    if (regError) {
      console.error("Register error:", regError);
      // Continue anyway - file is uploaded
    }

    // Generate signed URL (15 minutes)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("ged")
      .createSignedUrl(storagePath, 900); // 15 minutes

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return new Response(
        JSON.stringify({
          success: true,
          storage_path: storagePath,
          document_id: regResult?.ag_document_id,
          version: regResult?.version,
          error: "Document generated but signed URL failed"
        } as GenerateDocumentResponse),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expiresAt = new Date(Date.now() + 900 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        document_id: regResult?.ag_document_id,
        storage_path: storagePath,
        signed_url: signedUrlData.signedUrl,
        expires_at: expiresAt,
        version: regResult?.version || 1,
      } as GenerateDocumentResponse),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      } as GenerateDocumentResponse),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
