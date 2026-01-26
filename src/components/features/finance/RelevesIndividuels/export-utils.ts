import type { ReleveIndividuel } from './types';

const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
};

const formatVariation = (variation: number | undefined): string => {
  if (variation === undefined) return '-';
  const sign = variation > 0 ? '+' : '';
  return `${sign}${variation.toFixed(1)}%`;
};

export function generateReleveHTML(releve: ReleveIndividuel): string {
  const soldeClass = releve.solde < 0 ? 'debiteur' : releve.solde > 0 ? 'crediteur' : 'equilibre';
  const soldeLabel = releve.solde < 0 ? 'À régler' : releve.solde > 0 ? 'Crédit' : 'Soldé';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relevé Individuel - ${releve.coproprietaire.nom} ${releve.coproprietaire.prenom} - ${releve.exercice}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .header-left h1 {
      font-size: 24px;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .header-left p {
      color: #64748b;
      font-size: 14px;
    }
    .header-right {
      text-align: right;
    }
    .header-right .date {
      font-size: 14px;
      color: #64748b;
    }
    .copro-info {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .copro-info h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #334155;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item label {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .info-item span {
      font-weight: 500;
    }
    .synthese {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .synthese-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .synthese-card.highlight {
      background: #eff6ff;
      border: 2px solid #2563eb;
    }
    .synthese-card label {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .synthese-card .value {
      font-size: 24px;
      font-weight: 700;
    }
    .synthese-card .variation {
      font-size: 12px;
      margin-top: 4px;
    }
    .variation.up { color: #dc2626; }
    .variation.down { color: #16a34a; }
    .solde.debiteur { color: #dc2626; }
    .solde.crediteur { color: #16a34a; }
    .solde.equilibre { color: #64748b; }
    .solde-label {
      display: block;
      font-size: 12px;
      margin-top: 4px;
    }
    section {
      margin-bottom: 40px;
    }
    section h3 {
      font-size: 16px;
      color: #334155;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      font-size: 12px;
      text-transform: uppercase;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .cle-section {
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .cle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .cle-header h4 {
      font-size: 14px;
      color: #334155;
    }
    .cle-header .tantiemes {
      font-size: 12px;
      color: #64748b;
    }
    .cle-header .montant {
      font-weight: 600;
      font-size: 16px;
    }
    .statut {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .statut.paye { background: #dcfce7; color: #16a34a; }
    .statut.partiel { background: #fef3c7; color: #d97706; }
    .statut.nonpaye { background: #fee2e2; color: #dc2626; }
    .comparatif {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .comparatif-item {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .comparatif-item label {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .comparatif-item .value {
      font-size: 20px;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Relevé Individuel de Charges</h1>
      <p>Exercice ${releve.exercice}</p>
    </div>
    <div class="header-right">
      <p class="date">Généré le ${new Date(releve.dateGeneration).toLocaleDateString('fr-FR')}</p>
    </div>
  </div>

  <div class="copro-info">
    <h2>${releve.coproprietaire.nom} ${releve.coproprietaire.prenom}</h2>
    <div class="info-grid">
      <div class="info-item">
        <label>Adresse</label>
        <span>${releve.coproprietaire.adresse}</span>
      </div>
      <div class="info-item">
        <label>Email</label>
        <span>${releve.coproprietaire.email || '-'}</span>
      </div>
      <div class="info-item">
        <label>Lots</label>
        <span>${releve.coproprietaire.lots.map(l => `${l.numero} (${l.type})`).join(', ')}</span>
      </div>
      <div class="info-item">
        <label>Tantièmes généraux</label>
        <span>${releve.coproprietaire.totalTantiemes} / 10 000</span>
      </div>
    </div>
  </div>

  <div class="synthese">
    <div class="synthese-card">
      <label>Total Charges ${releve.exercice}</label>
      <div class="value">${formatMontant(releve.totalCharges)}</div>
      ${releve.variationCharges !== undefined ? `<div class="variation ${releve.variationCharges > 0 ? 'up' : 'down'}">${formatVariation(releve.variationCharges)} vs N-1</div>` : ''}
    </div>
    <div class="synthese-card">
      <label>Total Appelé</label>
      <div class="value">${formatMontant(releve.totalAppeles)}</div>
    </div>
    <div class="synthese-card">
      <label>Total Payé</label>
      <div class="value">${formatMontant(releve.totalPaye)}</div>
    </div>
    <div class="synthese-card highlight">
      <label>Solde</label>
      <div class="value solde ${soldeClass}">${formatMontant(Math.abs(releve.solde))}</div>
      <span class="solde-label">${soldeLabel}</span>
    </div>
  </div>

  <section>
    <h3>Détail par Clé de Répartition</h3>
    ${releve.detailParCle.map(cle => `
      <div class="cle-section">
        <div class="cle-header">
          <div>
            <h4>${cle.cleNom}</h4>
            <span class="tantiemes">${cle.tantiemes} / ${cle.totalTantiemesCle} tantièmes (${cle.quotePart.toFixed(2)}%)</span>
          </div>
          <div>
            <span class="montant">${formatMontant(cle.montantN)}</span>
            ${cle.variation !== undefined ? `<span class="variation ${cle.variation > 0 ? 'up' : 'down'}">${formatVariation(cle.variation)}</span>` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Poste</th>
              <th class="text-right">Montant Total</th>
              <th class="text-right">Votre Part</th>
              <th class="text-right">N-1</th>
              <th class="text-right">Variation</th>
            </tr>
          </thead>
          <tbody>
            ${cle.postes.map(poste => `
              <tr>
                <td>${poste.libelle}</td>
                <td class="text-right">${formatMontant(poste.montantTotal)}</td>
                <td class="text-right">${formatMontant(poste.montantIndividuel)}</td>
                <td class="text-right">${poste.montantN1 ? formatMontant(poste.montantN1) : '-'}</td>
                <td class="text-right">
                  ${poste.montantN1 ? `<span class="variation ${poste.montantIndividuel > poste.montantN1 ? 'up' : 'down'}">${formatVariation(((poste.montantIndividuel - poste.montantN1) / poste.montantN1) * 100)}</span>` : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  </section>

  <section>
    <h3>Historique des Appels de Fonds</h3>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Période</th>
          <th>Échéance</th>
          <th class="text-right">Montant Dû</th>
          <th class="text-right">Montant Payé</th>
          <th class="text-center">Statut</th>
        </tr>
      </thead>
      <tbody>
        ${releve.appelsFonds.map(appel => `
          <tr>
            <td>${appel.description}</td>
            <td>${appel.periode}</td>
            <td>${new Date(appel.dateEcheance).toLocaleDateString('fr-FR')}</td>
            <td class="text-right">${formatMontant(appel.montantDu)}</td>
            <td class="text-right">${formatMontant(appel.montantPaye)}</td>
            <td class="text-center">
              <span class="statut ${appel.statut === 'PAYE' ? 'paye' : appel.statut === 'PARTIELLEMENT_PAYE' ? 'partiel' : 'nonpaye'}">
                ${appel.statut === 'PAYE' ? 'Payé' : appel.statut === 'PARTIELLEMENT_PAYE' ? 'Partiel' : 'Non payé'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>

  ${releve.totalChargesN1 ? `
  <section>
    <h3>Comparatif N / N-1</h3>
    <div class="comparatif">
      <div class="comparatif-item">
        <label>Charges ${parseInt(releve.exercice) - 1}</label>
        <div class="value">${formatMontant(releve.totalChargesN1)}</div>
      </div>
      <div class="comparatif-item">
        <label>Charges ${releve.exercice}</label>
        <div class="value">${formatMontant(releve.totalCharges)}</div>
      </div>
      <div class="comparatif-item">
        <label>Variation</label>
        <div class="value variation ${(releve.variationCharges || 0) > 0 ? 'up' : 'down'}">
          ${releve.variationCharges && releve.variationCharges > 0 ? '+' : ''}${formatMontant(releve.totalCharges - releve.totalChargesN1)}
          (${formatVariation(releve.variationCharges)})
        </div>
      </div>
    </div>
  </section>
  ` : ''}

  <div class="footer">
    <p>Document généré automatiquement par CoProFlex - Relevé individuel de charges</p>
    <p>Ce document est fourni à titre informatif. Pour toute question, veuillez contacter le syndic.</p>
  </div>
</body>
</html>
  `.trim();
}

export function downloadReleveHTML(releve: ReleveIndividuel): void {
  const html = generateReleveHTML(releve);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `releve-${releve.coproprietaire.nom}-${releve.coproprietaire.prenom}-${releve.exercice}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printReleve(releve: ReleveIndividuel): void {
  const html = generateReleveHTML(releve);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

export async function downloadMultipleRelevesAsZip(releves: ReleveIndividuel[]): Promise<void> {
  // MVP: Download sequentially as individual files
  // In production, we would use JSZip to create a real zip file
  for (const releve of releves) {
    downloadReleveHTML(releve);
    // Small delay between downloads to avoid browser blocking
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
