/**
 * Service d'export des avis d'appel de fonds
 * MVP: génération HTML imprimable + téléchargement .html
 * PDF placeholder si pas de lib dédiée
 */

import type { CallForFundsOverview, CallLineDetailed } from '@/lib/finance/api';

export interface AvisAppelMeta {
  coproprieteNom: string;
  coproprieteAdresse: string;
  syndicNom: string;
  syndicAdresse: string;
}

interface AvisAppelData {
  call: CallForFundsOverview;
  line: CallLineDetailed;
  meta: AvisAppelMeta;
}

/**
 * Génère le contenu HTML d'un avis d'appel de fonds
 */
export function generateAvisAppelHTML(data: AvisAppelData): string {
  const { call, line, meta } = data;
  const { coproprieteNom, coproprieteAdresse, syndicNom, syndicAdresse } = meta;

  const dateEmission = call.issued_at
    ? new Date(call.issued_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const dateLimite = new Date(call.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avis d'appel de fonds - ${line.owner_name ?? line.lot_ref}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563eb;
    }
    .syndic-info {
      text-align: left;
    }
    .syndic-info h1 {
      font-size: 14pt;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .syndic-info p {
      font-size: 10pt;
      color: #666;
    }
    .date-emission {
      text-align: right;
      font-size: 10pt;
      color: #666;
    }
    .destinataire {
      margin: 30px 0;
      padding: 20px;
      background: #f8fafc;
      border-left: 4px solid #2563eb;
    }
    .destinataire h2 {
      font-size: 11pt;
      color: #666;
      margin-bottom: 8px;
    }
    .destinataire p {
      font-size: 12pt;
      font-weight: 600;
    }
    .titre-document {
      text-align: center;
      margin: 40px 0;
    }
    .titre-document h1 {
      font-size: 18pt;
      color: #1e3a5f;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .titre-document p {
      font-size: 11pt;
      color: #666;
      margin-top: 8px;
    }
    .info-copropriete {
      background: #f1f5f9;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .info-copropriete h3 {
      font-size: 11pt;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .info-copropriete p {
      font-size: 10pt;
    }
    .details-appel {
      margin: 30px 0;
    }
    .details-appel table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-appel th,
    .details-appel td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-appel th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      font-size: 10pt;
    }
    .details-appel td {
      font-size: 11pt;
    }
    .montant-total {
      background: #2563eb;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .montant-total .label {
      font-size: 12pt;
    }
    .montant-total .value {
      font-size: 24pt;
      font-weight: 700;
    }
    .date-limite {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 30px 0;
      text-align: center;
    }
    .date-limite .label {
      font-size: 10pt;
      color: #92400e;
      margin-bottom: 4px;
    }
    .date-limite .date {
      font-size: 14pt;
      font-weight: 700;
      color: #b45309;
    }
    .instructions {
      margin: 30px 0;
      padding: 20px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
    }
    .instructions h3 {
      font-size: 11pt;
      color: #166534;
      margin-bottom: 12px;
    }
    .instructions ul {
      margin-left: 20px;
      font-size: 10pt;
      color: #166534;
    }
    .instructions li {
      margin-bottom: 6px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 9pt;
      color: #94a3b8;
      text-align: center;
    }
    .signature-zone {
      margin-top: 50px;
      text-align: right;
    }
    .signature-zone p {
      font-size: 10pt;
      margin-bottom: 60px;
    }
    .signature-zone .nom-syndic {
      font-weight: 600;
    }
    @media print {
      body {
        padding: 20px;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="syndic-info">
      <h1>${syndicNom}</h1>
      <p>${syndicAdresse}</p>
    </div>
    <div class="date-emission">
      <p>Émis le ${dateEmission}</p>
      <p>Réf: AF-${call.id}-${line.lot_id}</p>
    </div>
  </div>

  <div class="destinataire">
    <h2>Destinataire</h2>
    <p>${line.owner_name ?? 'Copropriétaire'}</p>
    <p>Lot ${line.lot_ref}</p>
  </div>

  <div class="titre-document">
    <h1>Avis d'appel de fonds</h1>
    <p>${call.label}</p>
  </div>

  <div class="info-copropriete">
    <h3>Copropriété</h3>
    <p><strong>${coproprieteNom}</strong></p>
    <p>${coproprieteAdresse}</p>
  </div>

  <div class="details-appel">
    <table>
      <tr>
        <th>Clé de répartition</th>
        <td>${call.repartition_key_name}</td>
      </tr>
      <tr>
        <th>Statut appel</th>
        <td>${call.status === 'issued' ? 'Émis' : call.status === 'paid' ? 'Payé' : call.status === 'partially_paid' ? 'Partiellement payé' : call.status === 'cancelled' ? 'Annulé' : 'Brouillon'}</td>
      </tr>
      <tr>
        <th>Lot</th>
        <td>${line.lot_ref}</td>
      </tr>
      <tr>
        <th>Tantièmes</th>
        <td>${line.lot_weight} / ${line.key_total_weight}</td>
      </tr>
      <tr>
        <th>Déjà réglé</th>
        <td>${line.amount_paid.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
      </tr>
    </table>
  </div>

  <div class="montant-total">
    <span class="label">Montant à régler</span>
    <span class="value">${line.amount_remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
  </div>

  <div class="date-limite">
    <p class="label">Date limite de règlement</p>
    <p class="date">${dateLimite}</p>
  </div>

  <div class="instructions">
    <h3>Modalités de paiement</h3>
    <ul>
      <li>Par virement bancaire (RIB disponible sur demande)</li>
      <li>Par chèque à l'ordre de "${syndicNom}"</li>
      <li>Par prélèvement automatique si vous y êtes inscrit</li>
    </ul>
  </div>

  <div class="signature-zone">
    <p>Le Syndic,</p>
    <p class="nom-syndic">${syndicNom}</p>
  </div>

  <div class="footer">
    <p>Ce document est généré automatiquement. Conservez-le précieusement pour votre comptabilité.</p>
    <p>Pour toute question, contactez votre syndic.</p>
  </div>

  <button class="no-print" onclick="window.print()" style="
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
  ">
    Imprimer
  </button>
</body>
</html>
`;
}

/**
 * Télécharge l'avis d'appel au format HTML
 */
export function downloadAvisAppelHTML(data: AvisAppelData): void {
  const html = generateAvisAppelHTML(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `avis-appel-${data.call.id}-${(data.line.owner_name ?? data.line.lot_ref).replace(/\s+/g, '_')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Ouvre l'avis d'appel dans une nouvelle fenêtre (pour impression)
 */
export function openAvisAppelPrint(data: AvisAppelData): void {
  const html = generateAvisAppelHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Export PDF placeholder (nécessite une lib comme jsPDF ou html2pdf)
 * Pour le MVP, on utilise l'impression navigateur
 */
export function exportAvisAppelPDF(data: AvisAppelData): void {
  // MVP: utiliser l'impression navigateur comme fallback
  // TODO: Intégrer jsPDF ou html2pdf pour génération PDF native
  openAvisAppelPrint(data);
}

/**
 * Génère tous les avis d'appel pour un appel donné (export groupé)
 */
export function downloadAllAvisAppels(
  call: CallForFundsOverview,
  lines: CallLineDetailed[],
  meta: AvisAppelMeta
): void {
  lines.forEach((line, index) => {
    setTimeout(() => {
      downloadAvisAppelHTML({ call, line, meta });
    }, index * 500); // Délai pour éviter blocage navigateur
  });
}
