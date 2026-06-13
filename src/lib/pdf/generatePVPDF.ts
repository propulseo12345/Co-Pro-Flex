/**
 * Generateur PDF pour les Proces-Verbaux d'AG
 *
 * Design: Institutional Elegance (meme systeme que la convocation)
 * - Palette navy + or chaud
 * - Times pour les titres formels, Helvetica pour le corps
 * - Filets decoratifs fins, cartes avec fond subtil
 * - Badges de resultat colores, mise en page aeree
 */

import { jsPDF } from 'jspdf';
import type {
  AGDataForPV,
  ResolutionForPV,
  ParticipantForPV,
  SignataireForPV,
} from '@/lib/services/pv-generation.service';

// ════════════════════════════════════════════════════════════
// INTERFACES
// ════════════════════════════════════════════════════════════

export interface GeneratePVPDFParams {
  agData: AGDataForPV;
  resolutions: ResolutionForPV[];
  participants: ParticipantForPV[];
  signataires: SignataireForPV[];
  variables?: Record<string, string>;
}

// ════════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ════════════════════════════════════════════════════════════

const MARGIN = 22;
const PW = 210;
const PH = 297;
const CW = PW - MARGIN * 2;

type RGB = [number, number, number];

const NAVY: RGB = [26, 42, 74];
const NAVY_MID: RGB = [55, 78, 120];
const GOLD: RGB = [178, 136, 54];
const GOLD_MUTED: RGB = [208, 186, 140];
const TEXT: RGB = [33, 37, 41];
const TEXT_SEC: RGB = [100, 116, 139];
const TEXT_MUTED: RGB = [156, 163, 175];
const BG_CARD: RGB = [247, 248, 250];
const BG_SUB: RGB = [241, 244, 248];
const BORDER: RGB = [209, 213, 219];
const BORDER_LT: RGB = [229, 231, 235];
const WHITE: RGB = [255, 255, 255];
const SUCCESS: RGB = [22, 163, 74];
const ERROR: RGB = [220, 38, 38];
const WARNING: RGB = [217, 119, 6];

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function hr(doc: jsPDF, y: number, color: RGB = BORDER, w = 0.2) {
  doc.setDrawColor(...color);
  doc.setLineWidth(w);
  doc.line(MARGIN, y, MARGIN + CW, y);
}

function txt(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  opts: {
    f?: 'helvetica' | 'times';
    s?: 'normal' | 'bold' | 'italic';
    sz?: number;
    c?: RGB;
    a?: 'left' | 'center' | 'right';
    mw?: number;
  } = {}
): number {
  const { f = 'helvetica', s = 'normal', sz = 10, c = TEXT, a = 'left', mw } = opts;
  const safe = text.replace(/\u202F/g, ' ');
  doc.setFont(f, s);
  doc.setFontSize(sz);
  doc.setTextColor(...c);
  if (mw) {
    const lines = doc.splitTextToSize(safe, mw);
    doc.text(lines, x, y, { align: a });
    return lines.length * sz * 0.4;
  }
  doc.text(safe, x, y, { align: a });
  return sz * 0.4;
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, y, 1.5, 6, 'F');

  txt(doc, title.toUpperCase(), MARGIN + 5.5, y + 4.2, {
    s: 'bold',
    sz: 9.5,
    c: NAVY,
  });

  hr(doc, y + 8, BORDER_LT, 0.15);

  return y + 14;
}

function checkPage(doc: jsPDF, y: number, need: number): number {
  if (y + need > PH - 28) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function resultBadge(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
  color: RGB
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const bw = doc.getTextWidth(label) + 10;
  const bh = 6;

  doc.setFillColor(...color);
  doc.roundedRect(x, y - 4, bw, bh, 1.5, 1.5, 'F');

  txt(doc, label, x + 5, y - 0.5, {
    sz: 8,
    s: 'bold',
    c: WHITE,
  });

  return bw;
}

function statCard(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  accent: RGB = NAVY
): void {
  doc.setFillColor(...BG_CARD);
  doc.roundedRect(x, y, w, 18, 2, 2, 'F');
  doc.setDrawColor(...BORDER_LT);
  doc.setLineWidth(0.15);
  doc.roundedRect(x, y, w, 18, 2, 2, 'S');

  // Top accent line
  doc.setFillColor(...accent);
  doc.rect(x, y, w, 0.8, 'F');

  txt(doc, value, x + w / 2, y + 8, {
    sz: 14,
    s: 'bold',
    c: accent,
    a: 'center',
  });

  txt(doc, label, x + w / 2, y + 14.5, {
    sz: 7,
    c: TEXT_SEC,
    a: 'center',
  });
}

// ════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ════════════════════════════════════════════════════════════

export function generatePVPDF(params: GeneratePVPDFParams): jsPDF {
  const { agData, resolutions, participants, signataires, variables = {} } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const copro = agData.copropriete;
  const coproNom = copro?.nom || 'Copropriete';
  const coproAdresse = copro?.adresse || '';

  const typeLabel =
    agData.type === 'ORDINAIRE'
      ? 'ORDINAIRE'
      : agData.type === 'URGENTE'
        ? 'URGENTE'
        : 'EXTRAORDINAIRE';

  const replaceVars = (text: string): string => {
    if (!text) return '';
    return text.replace(/\{([^}]+)\}/g, (_, varName) => {
      return variables[varName] || `[${varName}]`;
    });
  };

  // ── EN-TETE ─────────────────────────────────────────────

  // Decorative gold line
  hr(doc, y, GOLD, 0.5);
  y += 8;

  // Copropriete name
  txt(doc, coproNom.toUpperCase(), PW / 2, y, {
    f: 'times',
    s: 'bold',
    sz: 15,
    c: NAVY,
    a: 'center',
  });
  y += 6;

  // Address
  if (coproAdresse) {
    txt(doc, coproAdresse, PW / 2, y, {
      sz: 8.5,
      c: TEXT_SEC,
      a: 'center',
    });
    y += 5;
  }

  // Decorative gold line
  hr(doc, y, GOLD, 0.5);
  y += 12;

  // Main title
  txt(doc, 'PROCES-VERBAL', PW / 2, y, {
    f: 'times',
    s: 'bold',
    sz: 18,
    c: NAVY,
    a: 'center',
  });
  y += 7;
  txt(doc, `ASSEMBLEE GENERALE ${typeLabel}`, PW / 2, y, {
    f: 'times',
    s: 'bold',
    sz: 13,
    c: NAVY_MID,
    a: 'center',
  });
  y += 8;

  // Generation date
  const generatedAt = new Date();
  const dateStr = generatedAt.toLocaleDateString('fr-FR');
  const timeStr = generatedAt.toLocaleTimeString('fr-FR');
  txt(doc, `Document genere le ${dateStr} a ${timeStr}`, PW / 2, y, {
    sz: 7.5,
    c: TEXT_MUTED,
    a: 'center',
  });
  y += 14;

  // ── INFORMATIONS DE L'ASSEMBLEE ─────────────────────────

  y = sectionHeader(doc, 'Informations de l\'assemblee', y);

  const dateFormatted = new Date(agData.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const infoFields: [string, string][] = [
    ['Date', dateFormatted],
    ['Heure', agData.heure || 'Non precisee'],
    ['Lieu', agData.lieu || 'Non precise'],
  ];
  if (agData.adresse) {
    infoFields.push(['Adresse', agData.adresse]);
  }

  // Card background
  const cardH = infoFields.length * 7 + 10;
  doc.setFillColor(...BG_CARD);
  doc.roundedRect(MARGIN, y, CW, cardH, 2, 2, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.15);
  doc.roundedRect(MARGIN, y, CW, cardH, 2, 2, 'S');

  // Left accent stripe
  doc.setFillColor(...GOLD_MUTED);
  doc.rect(MARGIN, y, 0.8, cardH, 'F');

  let cy = y + 7;
  const labelX = MARGIN + 6;
  const valueX = MARGIN + 34;

  infoFields.forEach(([label, value]) => {
    txt(doc, label, labelX, cy, { sz: 8.5, s: 'bold', c: NAVY_MID });
    txt(doc, value, valueX, cy, { sz: 9, c: TEXT });
    cy += 7;
  });

  y += cardH + 10;

  // ── STATISTIQUES DE PRESENCE ──────────────────────────────

  y = checkPage(doc, y, 40);
  y = sectionHeader(doc, 'Quorum et presences', y);

  const totalTantiemes = participants.reduce((sum, p) => sum + p.tantiemes, 0);
  const participantsPresents = participants.filter(p => p.mode === 'present');
  const participantsRepresentes = participants.filter(p => p.mode === 'represente');
  const participantsCorrespondance = participants.filter(p => p.mode === 'correspondance');
  const participantsAbsents = participants.filter(p => p.mode === 'absent');

  const tantiemesPresents = participantsPresents.reduce((s, p) => s + p.tantiemes, 0);
  const tantiemesRepresentes = participantsRepresentes.reduce((s, p) => s + p.tantiemes, 0);
  const tantiemesCorrespondance = participantsCorrespondance.reduce((s, p) => s + p.tantiemes, 0);
  const tantiemesRepresentesTotal = tantiemesPresents + tantiemesRepresentes + tantiemesCorrespondance;
  const quorumPct = totalTantiemes > 0
    ? ((tantiemesRepresentesTotal / totalTantiemes) * 100).toFixed(1)
    : '0';

  // Stats cards row
  const cardW = (CW - 9) / 4;
  statCard(doc, 'Presents', String(participantsPresents.length), MARGIN, y, cardW, NAVY);
  statCard(doc, 'Representes', String(participantsRepresentes.length), MARGIN + cardW + 3, y, cardW, NAVY_MID);
  statCard(doc, 'Correspondance', String(participantsCorrespondance.length), MARGIN + (cardW + 3) * 2, y, cardW, GOLD);
  statCard(doc, 'Absents', String(participantsAbsents.length), MARGIN + (cardW + 3) * 3, y, cardW, TEXT_SEC);
  y += 24;

  // Quorum summary card
  const quorumH = 14;
  doc.setFillColor(...BG_SUB);
  doc.roundedRect(MARGIN, y, CW, quorumH, 2, 2, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CW, 0.5, 'F');

  txt(doc, 'Tantiemes representes :', MARGIN + 6, y + 6, {
    sz: 9,
    s: 'bold',
    c: NAVY,
  });
  txt(doc, `${tantiemesRepresentesTotal} / ${totalTantiemes}  (${quorumPct} %)`, MARGIN + 55, y + 6, {
    sz: 9,
    c: TEXT,
  });

  const quorumAtteint = tantiemesRepresentesTotal > totalTantiemes / 4;
  const quorumLabel = quorumAtteint ? 'QUORUM ATTEINT' : 'QUORUM NON ATTEINT';
  const quorumColor = quorumAtteint ? SUCCESS : ERROR;
  resultBadge(doc, quorumLabel, MARGIN + CW - 45, y + 8.5, quorumColor);

  y += quorumH + 10;

  // ── FEUILLE DE PRESENCE ───────────────────────────────────

  y = checkPage(doc, y, 40);
  y = sectionHeader(doc, 'Feuille de presence', y);

  // Table header
  const colX = [MARGIN, MARGIN + 55, MARGIN + 77, MARGIN + 105];

  // Header row
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CW, 7, 'F');

  const headers = ['Coproprietaire', 'Lot', 'Tantiemes', 'Statut'];
  headers.forEach((h, i) => {
    txt(doc, h, colX[i] + 3, y + 5, {
      sz: 7.5,
      s: 'bold',
      c: WHITE,
    });
  });
  y += 7;

  // Table rows
  const sortedParticipants = [...participants].sort((a, b) => {
    const order = { present: 0, represente: 1, correspondance: 2, absent: 3 };
    return (order[a.mode] || 4) - (order[b.mode] || 4);
  });

  sortedParticipants.forEach((p, index) => {
    y = checkPage(doc, y, 8);

    // Alternating background
    if (index % 2 === 0) {
      doc.setFillColor(...BG_CARD);
      doc.rect(MARGIN, y, CW, 7, 'F');
    }

    // Left accent based on mode
    const modeColor: RGB =
      p.mode === 'present' ? SUCCESS
        : p.mode === 'represente' ? NAVY_MID
          : p.mode === 'correspondance' ? GOLD
            : TEXT_MUTED;
    doc.setFillColor(...modeColor);
    doc.rect(MARGIN, y, 0.6, 7, 'F');

    txt(doc, p.nom, colX[0] + 3, y + 5, { sz: 8, c: TEXT });
    txt(doc, p.lot || '-', colX[1] + 3, y + 5, { sz: 8, c: TEXT_SEC });
    txt(doc, String(p.tantiemes), colX[2] + 3, y + 5, { sz: 8, s: 'bold', c: TEXT });

    let statut = 'Present';
    if (p.mode === 'represente') statut = `Repr. par ${p.mandataire || 'N/A'}`;
    if (p.mode === 'correspondance') statut = 'Vote par correspondance';
    if (p.mode === 'absent') statut = 'Absent';

    txt(doc, statut, colX[3] + 3, y + 5, { sz: 7.5, c: TEXT_SEC });

    y += 7;
  });

  // Table bottom border
  hr(doc, y, BORDER, 0.2);
  y += 10;

  // ── RESOLUTIONS VOTEES ────────────────────────────────────

  y = checkPage(doc, y, 30);
  y = sectionHeader(doc, 'Resolutions votees', y);

  // Summary mini-stats
  const adoptedCount = resolutions.filter(r => r.resultat === 'ADOPTEE').length;
  const rejectedCount = resolutions.filter(r => r.resultat === 'REJETEE').length;
  const postponedCount = resolutions.filter(r => r.resultat === 'AJOURNEE').length;

  doc.setFillColor(...BG_CARD);
  doc.roundedRect(MARGIN, y, CW, 8, 1.5, 1.5, 'F');

  txt(doc, `${resolutions.length} resolutions`, MARGIN + 6, y + 5.5, {
    sz: 8,
    s: 'bold',
    c: NAVY,
  });

  let sx = MARGIN + 50;
  if (adoptedCount > 0) {
    resultBadge(doc, `${adoptedCount} ADOPTEE${adoptedCount > 1 ? 'S' : ''}`, sx, y + 6, SUCCESS);
    sx += doc.getTextWidth(`${adoptedCount} ADOPTEE${adoptedCount > 1 ? 'S' : ''}`) + 16;
  }
  if (rejectedCount > 0) {
    resultBadge(doc, `${rejectedCount} REJETEE${rejectedCount > 1 ? 'S' : ''}`, sx, y + 6, ERROR);
    sx += doc.getTextWidth(`${rejectedCount} REJETEE${rejectedCount > 1 ? 'S' : ''}`) + 16;
  }
  if (postponedCount > 0) {
    resultBadge(doc, `${postponedCount} AJOURNEE${postponedCount > 1 ? 'S' : ''}`, sx, y + 6, WARNING);
  }

  y += 14;

  // Individual resolutions
  for (const resolution of resolutions) {
    y = checkPage(doc, y, 45);

    // Number in navy circle
    const num = String(resolution.numero);
    doc.setFillColor(...NAVY);
    doc.circle(MARGIN + 3, y + 0.5, 3.5, 'F');
    txt(doc, num, MARGIN + 3, y + 1.8, {
      sz: 8,
      s: 'bold',
      c: WHITE,
      a: 'center',
    });

    // Title
    const titleH = txt(doc, resolution.titre, MARGIN + 10, y + 1, {
      sz: 10.5,
      s: 'bold',
      c: TEXT,
      mw: CW - 14,
    });
    y += Math.max(titleH, 4) + 3;

    // Majority badge (outlined pill)
    const badgeLabel = resolution.majorite;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const bw = doc.getTextWidth(badgeLabel) + 6;
    doc.setDrawColor(...NAVY_MID);
    doc.setLineWidth(0.25);
    doc.roundedRect(MARGIN + 10, y - 2.5, bw, 5, 1.2, 1.2, 'S');
    txt(doc, badgeLabel, MARGIN + 13, y + 0.5, {
      sz: 7,
      s: 'bold',
      c: NAVY_MID,
    });
    y += 6;

    // Resolution text
    const resolvedText = replaceVars(resolution.texte);
    if (resolvedText) {
      const textH = txt(doc, resolvedText, MARGIN + 10, y, {
        sz: 8.5,
        c: TEXT_SEC,
        mw: CW - 14,
      });
      y += textH + 4;
    }

    // Passerelle handling
    if (resolution.passerelle) {
      y = checkPage(doc, y, 25);

      // Passerelle sub-card
      doc.setFillColor(...BG_SUB);
      doc.roundedRect(MARGIN + 10, y - 2, CW - 14, 20, 1.5, 1.5, 'F');
      doc.setFillColor(...WARNING);
      doc.rect(MARGIN + 10, y - 2, 0.6, 20, 'F');

      txt(doc, 'PASSERELLE', MARGIN + 14, y + 2, {
        sz: 7,
        s: 'bold',
        c: WARNING,
      });

      const vi = resolution.passerelle.voteInitial;
      txt(doc, `Vote initial : Pour ${vi.pour} t. | Contre ${vi.contre} t. | Abstention ${vi.abstention} t.`, MARGIN + 14, y + 7, {
        sz: 7.5,
        c: TEXT_SEC,
      });

      if (resolution.passerelle.secondVote) {
        const sv = resolution.passerelle.secondVote;
        txt(doc, `Second vote : Pour ${sv.pour} t. | Contre ${sv.contre} t. | Abstention ${sv.abstention} t.`, MARGIN + 14, y + 12, {
          sz: 7.5,
          c: TEXT,
        });
      }

      y += 22;

      if (resolution.passerelle.mentionPV) {
        const mentionH = txt(doc, resolution.passerelle.mentionPV, MARGIN + 14, y, {
          sz: 7.5,
          s: 'italic',
          c: TEXT_SEC,
          mw: CW - 22,
        });
        y += mentionH + 4;
      }
    } else {
      // Normal vote results
      y = checkPage(doc, y, 12);

      // Vote results in a compact row
      doc.setFillColor(...BG_SUB);
      doc.roundedRect(MARGIN + 10, y - 2, CW - 14, 9, 1.5, 1.5, 'F');

      const vx = MARGIN + 14;
      txt(doc, 'Pour', vx, y + 3.5, { sz: 7, c: TEXT_SEC });
      txt(doc, `${resolution.votes.pour} t.`, vx + 12, y + 3.5, { sz: 8, s: 'bold', c: SUCCESS });

      txt(doc, 'Contre', vx + 38, y + 3.5, { sz: 7, c: TEXT_SEC });
      txt(doc, `${resolution.votes.contre} t.`, vx + 52, y + 3.5, { sz: 8, s: 'bold', c: ERROR });

      txt(doc, 'Abstention', vx + 78, y + 3.5, { sz: 7, c: TEXT_SEC });
      txt(doc, `${resolution.votes.abstention} t.`, vx + 98, y + 3.5, { sz: 8, s: 'bold', c: TEXT_SEC });

      y += 12;
    }

    // Result badge
    const resultat = resolution.resultat || 'REJETEE';
    const resultLabel =
      resultat === 'ADOPTEE' ? 'ADOPTEE'
        : resultat === 'AJOURNEE' ? 'AJOURNEE'
          : 'REJETEE';
    const resultColor: RGB =
      resultat === 'ADOPTEE' ? SUCCESS
        : resultat === 'AJOURNEE' ? WARNING
          : ERROR;

    resultBadge(doc, `RESOLUTION ${resultLabel}`, MARGIN + 10, y + 1, resultColor);

    y += 10;

    // Light separator between resolutions
    hr(doc, y, BORDER_LT, 0.1);
    y += 8;
  }

  // ── CLOTURE DE LA SEANCE ──────────────────────────────────

  y = checkPage(doc, y, 30);
  y = sectionHeader(doc, 'Cloture de la seance', y);

  doc.setFillColor(...BG_CARD);
  doc.roundedRect(MARGIN, y, CW, 16, 2, 2, 'F');
  doc.setFillColor(...GOLD_MUTED);
  doc.rect(MARGIN, y, 0.8, 16, 'F');

  txt(doc, 'L\'ordre du jour etant epuise et plus personne ne demandant la parole,', MARGIN + 6, y + 6, {
    sz: 9,
    c: TEXT,
  });
  txt(doc, `le President declare la seance levee a ${agData.heure || '___'}.`, MARGIN + 6, y + 12, {
    sz: 9,
    c: TEXT,
  });

  y += 22;

  // ── SIGNATURES ────────────────────────────────────────────

  y = checkPage(doc, y, 60);
  y = sectionHeader(doc, 'Signatures', y);

  txt(doc, 'Le present proces-verbal a ete signe par les membres du bureau :', MARGIN, y, {
    sz: 9,
    c: TEXT,
  });
  y += 10;

  // Signature grid (2 columns for space efficiency)
  const sigColW = (CW - 6) / 2;

  signataires.forEach((sig, index) => {
    const col = index % 2;
    if (col === 0 && index > 0) {
      y += 38;
    }
    if (col === 0) {
      y = checkPage(doc, y, 40);
    }

    const sx = MARGIN + col * (sigColW + 6);

    // Signature card
    doc.setFillColor(...BG_CARD);
    doc.roundedRect(sx, y, sigColW, 34, 2, 2, 'F');
    doc.setDrawColor(...BORDER_LT);
    doc.setLineWidth(0.15);
    doc.roundedRect(sx, y, sigColW, 34, 2, 2, 'S');

    // Role label badge
    doc.setFillColor(...NAVY);
    doc.roundedRect(sx + 4, y + 3, 30, 5, 1, 1, 'F');
    txt(doc, sig.roleLabel.toUpperCase(), sx + 19, y + 6.5, {
      sz: 6.5,
      s: 'bold',
      c: WHITE,
      a: 'center',
    });

    // Name
    const nomComplet = sig.prenom && sig.nom ? `${sig.prenom} ${sig.nom}` : '[A completer]';
    txt(doc, nomComplet, sx + 4, y + 14, {
      sz: 9.5,
      s: 'bold',
      c: TEXT,
    });

    // Signature or line
    if (sig.signature) {
      try {
        doc.addImage(sig.signature, 'PNG', sx + 4, y + 17, 50, 14);
      } catch {
        // Fallback: signature line
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(sx + 4, y + 28, sx + sigColW - 4, y + 28);
      }
    } else {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.line(sx + 4, y + 28, sx + sigColW - 4, y + 28);
      txt(doc, 'Signature', sx + sigColW / 2, y + 31, {
        sz: 7,
        c: TEXT_MUTED,
        a: 'center',
      });
    }
  });

  // Adjust y after last row of signatures
  const sigRows = Math.ceil(signataires.length / 2);
  y += sigRows * 38 + (signataires.length <= 2 ? 0 : -38 + 38);

  // ── MENTIONS LEGALES ──────────────────────────────────────

  y = checkPage(doc, y, 30);
  y += 6;

  doc.setFillColor(...BG_CARD);
  doc.roundedRect(MARGIN, y, CW, 18, 1.5, 1.5, 'F');

  txt(doc, 'Le present proces-verbal a ete etabli conformement aux dispositions de la loi', MARGIN + 4, y + 5, {
    sz: 7.5,
    c: TEXT_SEC,
  });
  txt(doc, 'n\u00B065-557 du 10 juillet 1965 et du decret n\u00B067-223 du 17 mars 1967.', MARGIN + 4, y + 10, {
    sz: 7.5,
    c: TEXT_SEC,
  });
  txt(doc, 'Il est transmis a chaque coproprietaire dans le delai d\'un mois suivant la tenue de l\'assemblee.', MARGIN + 4, y + 15, {
    sz: 7.5,
    c: TEXT_SEC,
  });

  // ── PIED DE PAGE ──────────────────────────────────────────

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Thin rule
    doc.setDrawColor(...BORDER_LT);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, PH - 16, MARGIN + CW, PH - 16);

    // Left: copro + document type
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${coproNom}  \u00B7  Proces-Verbal AG ${typeLabel}`, MARGIN, PH - 11);

    // Right: page number
    doc.text(`${i} / ${totalPages}`, MARGIN + CW, PH - 11, { align: 'right' });

    // Gold micro-accent in footer
    doc.setFillColor(...GOLD);
    doc.rect(PW / 2 - 5, PH - 12, 10, 0.3, 'F');
  }

  return doc;
}
