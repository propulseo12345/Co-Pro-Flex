'use client';

import { FileText, TrendingUp, TrendingDown, Printer, Download, AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { LigneAnnexe1, LigneAnnexe2, LigneAnnexe3, LigneAnnexe4, LigneAnnexe5 } from './types';
import styles from './Comptabilite.module.css';

// Utility function for formatting currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

// Utility function for formatting dates
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Export HTML utility
function exportToHTML(title: string, content: string, filename: string) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin: 1.5rem 0 1rem; color: #374151; }
    .subtitle { color: #6b7280; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th, td { padding: 0.75rem; text-align: left; border: 1px solid #e5e7eb; font-size: 0.875rem; }
    th { background: #f9fafb; font-weight: 600; }
    .text-right { text-align: right; }
    .total-row { background: #f3f4f6; font-weight: 700; }
    .positive { color: #16a34a; }
    .negative { color: #dc2626; }
    .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; padding: 1rem; background: #f9fafb; border-radius: 0.5rem; margin-top: 1rem; }
    .total-item { display: flex; flex-direction: column; gap: 0.25rem; }
    .total-label { font-size: 0.875rem; color: #6b7280; }
    .total-value { font-size: 1.25rem; font-weight: 700; font-family: monospace; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: #dcfce7; color: #16a34a; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-info { background: #dbeafe; color: #1d4ed8; }
    @media print { body { padding: 1rem; } }
  </style>
</head>
<body>
  ${content}
  <footer style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #9ca3af;">
    Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
  </footer>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface AnnexeHeaderProps {
  title: string;
  subtitle: string;
  onPrint: () => void;
  onExport: () => void;
}

function AnnexeHeader({ title, subtitle, onPrint, onExport }: AnnexeHeaderProps) {
  return (
    <div className={styles.annexeHeader}>
      <div className={styles.annexeHeaderInfo}>
        <h2 className={styles.annexeTitle}>{title}</h2>
        <p className={styles.annexeSubtitle}>{subtitle}</p>
      </div>
      <div className={styles.annexeHeaderActions}>
        <button className={styles.printButton} onClick={onPrint}>
          <Printer size={16} aria-hidden="true" />
          Imprimer
        </button>
        <button className={styles.downloadButton} onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          Télécharger HTML
        </button>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 1 - État financier après répartition
// ============================================

interface Annexe1TableProps {
  data: LigneAnnexe1[];
  exercice: string;
}

export function Annexe1Table({ data, exercice }: Annexe1TableProps) {
  const actif = data.filter(d => d.type === 'actif');
  const passif = data.filter(d => d.type === 'passif');

  const totalActif = actif.reduce((sum, d) => sum + d.montant, 0);
  const totalActifN1 = actif.reduce((sum, d) => sum + (d.montantN1 || 0), 0);
  const totalPassif = passif.reduce((sum, d) => sum + d.montant, 0);
  const totalPassifN1 = passif.reduce((sum, d) => sum + (d.montantN1 || 0), 0);

  const handlePrint = () => window.print();

  const handleExport = () => {
    const content = `
      <h1>Annexe 1 - État financier après répartition</h1>
      <p class="subtitle">Exercice ${exercice}</p>

      <h2>ACTIF</h2>
      <table>
        <thead>
          <tr>
            <th>Rubrique</th>
            <th class="text-right">Exercice N</th>
            <th class="text-right">Exercice N-1</th>
          </tr>
        </thead>
        <tbody>
          ${actif.map(row => `
            <tr>
              <td>${row.rubrique}</td>
              <td class="text-right">${formatCurrency(row.montant)}</td>
              <td class="text-right">${row.montantN1 ? formatCurrency(row.montantN1) : '-'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>TOTAL ACTIF</td>
            <td class="text-right">${formatCurrency(totalActif)}</td>
            <td class="text-right">${formatCurrency(totalActifN1)}</td>
          </tr>
        </tbody>
      </table>

      <h2>PASSIF</h2>
      <table>
        <thead>
          <tr>
            <th>Rubrique</th>
            <th class="text-right">Exercice N</th>
            <th class="text-right">Exercice N-1</th>
          </tr>
        </thead>
        <tbody>
          ${passif.map(row => `
            <tr>
              <td>${row.rubrique}</td>
              <td class="text-right">${formatCurrency(row.montant)}</td>
              <td class="text-right">${row.montantN1 ? formatCurrency(row.montantN1) : '-'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>TOTAL PASSIF</td>
            <td class="text-right">${formatCurrency(totalPassif)}</td>
            <td class="text-right">${formatCurrency(totalPassifN1)}</td>
          </tr>
        </tbody>
      </table>
    `;
    exportToHTML(`Annexe 1 - État financier - ${exercice}`, content, `annexe-1-etat-financier-${exercice}.html`);
  };

  return (
    <div>
      <AnnexeHeader
        title="Annexe 1 - État financier après répartition"
        subtitle={`Exercice ${exercice}`}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      <div className={styles.annexeSection}>
        <h3 className={styles.annexeSectionTitle}>
          <TrendingUp size={20} aria-hidden="true" />
          ACTIF
        </h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rubrique</th>
                <th className={styles.textRight}>Exercice N</th>
                <th className={styles.textRight}>Exercice N-1</th>
              </tr>
            </thead>
            <tbody>
              {actif.map(row => (
                <tr key={row.id}>
                  <td>{row.rubrique}</td>
                  <td className={`${styles.textRight} ${styles.credit}`}>{formatCurrency(row.montant)}</td>
                  <td className={styles.textRight}>{row.montantN1 ? formatCurrency(row.montantN1) : '-'}</td>
                </tr>
              ))}
              <tr className={styles.rowTotal}>
                <td>TOTAL ACTIF</td>
                <td className={`${styles.textRight} ${styles.credit}`}>{formatCurrency(totalActif)}</td>
                <td className={styles.textRight}>{formatCurrency(totalActifN1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.annexeSection}>
        <h3 className={styles.annexeSectionTitle}>
          <TrendingDown size={20} aria-hidden="true" />
          PASSIF
        </h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rubrique</th>
                <th className={styles.textRight}>Exercice N</th>
                <th className={styles.textRight}>Exercice N-1</th>
              </tr>
            </thead>
            <tbody>
              {passif.map(row => (
                <tr key={row.id}>
                  <td>{row.rubrique}</td>
                  <td className={`${styles.textRight} ${styles.debit}`}>{formatCurrency(row.montant)}</td>
                  <td className={styles.textRight}>{row.montantN1 ? formatCurrency(row.montantN1) : '-'}</td>
                </tr>
              ))}
              <tr className={styles.rowTotal}>
                <td>TOTAL PASSIF</td>
                <td className={`${styles.textRight} ${styles.debit}`}>{formatCurrency(totalPassif)}</td>
                <td className={styles.textRight}>{formatCurrency(totalPassifN1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.annexeTotals}>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Total Actif</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValuePositive}`}>{formatCurrency(totalActif)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Total Passif</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValueNegative}`}>{formatCurrency(totalPassif)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Solde</span>
          <span className={`${styles.annexeTotalValue} ${totalActif - totalPassif >= 0 ? styles.annexeTotalValuePositive : styles.annexeTotalValueNegative}`}>
            {formatCurrency(totalActif - totalPassif)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 2 - Compte de gestion général
// ============================================

interface Annexe2TableProps {
  data: LigneAnnexe2[];
  exercice: string;
}

export function Annexe2Table({ data, exercice }: Annexe2TableProps) {
  const chargesCourantes = data.filter(d => d.categorie === 'charges-courantes');
  const chargesTravaux = data.filter(d => d.categorie === 'charges-travaux');
  const produits = data.filter(d => d.categorie === 'produits');

  const totalChargesCourantes = chargesCourantes.reduce((sum, d) => sum + d.depensesReelles, 0);
  const totalChargesTravaux = chargesTravaux.reduce((sum, d) => sum + d.depensesReelles, 0);
  const totalCharges = totalChargesCourantes + totalChargesTravaux;
  const totalProduits = produits.reduce((sum, d) => sum + d.depensesReelles, 0);
  const resultat = totalProduits - totalCharges;

  const handlePrint = () => window.print();

  const handleExport = () => {
    const content = `
      <h1>Annexe 2 - Compte de gestion général</h1>
      <p class="subtitle">Exercice ${exercice}</p>

      <table>
        <thead>
          <tr>
            <th>Compte</th>
            <th>Libellé</th>
            <th class="text-right">Budget voté</th>
            <th class="text-right">Réalisé</th>
            <th class="text-right">Écart</th>
            <th class="text-right">% Réal.</th>
          </tr>
        </thead>
        <tbody>
          <tr class="total-row"><td colspan="6"><strong>CHARGES COURANTES</strong></td></tr>
          ${chargesCourantes.map(row => `
            <tr>
              <td>${row.compte}</td>
              <td>${row.libelle}</td>
              <td class="text-right">${formatCurrency(row.budgetVote)}</td>
              <td class="text-right">${formatCurrency(row.depensesReelles)}</td>
              <td class="text-right ${row.ecart >= 0 ? 'positive' : 'negative'}">${formatCurrency(row.ecart)}</td>
              <td class="text-right">${row.pourcentageRealisation.toFixed(1)}%</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3">Total charges courantes</td>
            <td class="text-right">${formatCurrency(totalChargesCourantes)}</td>
            <td colspan="2"></td>
          </tr>
          <tr class="total-row"><td colspan="6"><strong>CHARGES TRAVAUX ET PROVISIONS</strong></td></tr>
          ${chargesTravaux.map(row => `
            <tr>
              <td>${row.compte}</td>
              <td>${row.libelle}</td>
              <td class="text-right">${formatCurrency(row.budgetVote)}</td>
              <td class="text-right">${formatCurrency(row.depensesReelles)}</td>
              <td class="text-right ${row.ecart >= 0 ? 'positive' : 'negative'}">${formatCurrency(row.ecart)}</td>
              <td class="text-right">${row.pourcentageRealisation.toFixed(1)}%</td>
            </tr>
          `).join('')}
          <tr class="total-row"><td colspan="6"><strong>PRODUITS</strong></td></tr>
          ${produits.map(row => `
            <tr>
              <td>${row.compte}</td>
              <td>${row.libelle}</td>
              <td class="text-right">${formatCurrency(row.budgetVote)}</td>
              <td class="text-right">${formatCurrency(row.depensesReelles)}</td>
              <td class="text-right ${row.ecart >= 0 ? 'positive' : 'negative'}">${formatCurrency(row.ecart)}</td>
              <td class="text-right">${row.pourcentageRealisation.toFixed(1)}%</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3">Total produits</td>
            <td class="text-right">${formatCurrency(totalProduits)}</td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="total-item">
          <span class="total-label">Total Charges</span>
          <span class="total-value negative">${formatCurrency(totalCharges)}</span>
        </div>
        <div class="total-item">
          <span class="total-label">Total Produits</span>
          <span class="total-value positive">${formatCurrency(totalProduits)}</span>
        </div>
        <div class="total-item">
          <span class="total-label">Résultat</span>
          <span class="total-value ${resultat >= 0 ? 'positive' : 'negative'}">${formatCurrency(resultat)}</span>
        </div>
      </div>
    `;
    exportToHTML(`Annexe 2 - Compte de gestion général - ${exercice}`, content, `annexe-2-compte-gestion-${exercice}.html`);
  };

  const renderCategory = (items: LigneAnnexe2[], title: string, badgeClass: string) => (
    <>
      <tr className={styles.rowSubtotal}>
        <td colSpan={6}>
          <span className={`${styles.categoryBadge} ${badgeClass}`}>{title}</span>
        </td>
      </tr>
      {items.map(row => (
        <tr key={row.id}>
          <td><span className={styles.compteBadge}>{row.compte}</span></td>
          <td>{row.libelle}</td>
          <td className={styles.textRight}>{formatCurrency(row.budgetVote)}</td>
          <td className={styles.textRight}>{formatCurrency(row.depensesReelles)}</td>
          <td className={styles.textRight}>
            <div className={styles.ecartCell}>
              <span className={`${styles.ecartMontant} ${row.ecart >= 0 ? styles.ecartPositif : styles.ecartNegatif}`}>
                {row.ecart >= 0 ? '+' : ''}{formatCurrency(row.ecart)}
              </span>
            </div>
          </td>
          <td className={styles.textRight}>
            <span className={row.pourcentageRealisation > 100 ? styles.debit : styles.credit}>
              {row.pourcentageRealisation.toFixed(1)}%
            </span>
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div>
      <AnnexeHeader
        title="Annexe 2 - Compte de gestion général"
        subtitle={`Exercice ${exercice}`}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Compte</th>
              <th>Libellé</th>
              <th className={styles.textRight}>Budget voté</th>
              <th className={styles.textRight}>Réalisé</th>
              <th className={styles.textRight}>Écart</th>
              <th className={styles.textRight}>% Réal.</th>
            </tr>
          </thead>
          <tbody>
            {renderCategory(chargesCourantes, 'CHARGES COURANTES', styles.categoryCharges)}
            <tr className={styles.rowTotal}>
              <td colSpan={3}>Total charges courantes</td>
              <td className={`${styles.textRight} ${styles.debit}`}>{formatCurrency(totalChargesCourantes)}</td>
              <td colSpan={2}></td>
            </tr>
            {renderCategory(chargesTravaux, 'CHARGES TRAVAUX ET PROVISIONS', styles.categoryTravaux)}
            <tr className={styles.rowTotal}>
              <td colSpan={3}>Total charges travaux</td>
              <td className={`${styles.textRight} ${styles.debit}`}>{formatCurrency(totalChargesTravaux)}</td>
              <td colSpan={2}></td>
            </tr>
            {renderCategory(produits, 'PRODUITS', styles.categoryProduits)}
            <tr className={styles.rowTotal}>
              <td colSpan={3}>Total produits</td>
              <td className={`${styles.textRight} ${styles.credit}`}>{formatCurrency(totalProduits)}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.annexeTotals}>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Total Charges</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValueNegative}`}>{formatCurrency(totalCharges)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Total Produits</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValuePositive}`}>{formatCurrency(totalProduits)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Résultat de l'exercice</span>
          <span className={`${styles.annexeTotalValue} ${resultat >= 0 ? styles.annexeTotalValuePositive : styles.annexeTotalValueNegative}`}>
            {formatCurrency(resultat)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 3 - Opérations courantes par clé
// ============================================

interface Annexe3TableProps {
  data: LigneAnnexe3[];
  exercice: string;
}

export function Annexe3Table({ data, exercice }: Annexe3TableProps) {
  const total = data.reduce((sum, d) => sum + d.montantTotal, 0);
  const totalN1 = data.reduce((sum, d) => sum + (d.montantN1 || 0), 0);

  const handlePrint = () => window.print();

  const handleExport = () => {
    const content = `
      <h1>Annexe 3 - Compte de gestion pour opérations courantes</h1>
      <p class="subtitle">Exercice ${exercice} - Détail par clé de répartition</p>

      <table>
        <thead>
          <tr>
            <th>Compte</th>
            <th>Libellé</th>
            <th>Clé de répartition</th>
            <th class="text-right">Montant N</th>
            <th class="text-right">Montant N-1</th>
            <th class="text-right">Variation</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => {
            const variation = row.montantN1 ? ((row.montantTotal - row.montantN1) / row.montantN1 * 100) : 0;
            return `
              <tr>
                <td>${row.compte}</td>
                <td>${row.libelle}</td>
                <td>${row.cleRepartition}</td>
                <td class="text-right">${formatCurrency(row.montantTotal)}</td>
                <td class="text-right">${row.montantN1 ? formatCurrency(row.montantN1) : '-'}</td>
                <td class="text-right ${variation >= 0 ? 'negative' : 'positive'}">${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td class="text-right">${formatCurrency(total)}</td>
            <td class="text-right">${formatCurrency(totalN1)}</td>
            <td class="text-right">${((total - totalN1) / totalN1 * 100).toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>
    `;
    exportToHTML(`Annexe 3 - Opérations courantes - ${exercice}`, content, `annexe-3-operations-courantes-${exercice}.html`);
  };

  return (
    <div>
      <AnnexeHeader
        title="Annexe 3 - Compte de gestion pour opérations courantes"
        subtitle={`Exercice ${exercice} - Détail par clé de répartition`}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Compte</th>
              <th>Libellé</th>
              <th>Clé de répartition</th>
              <th className={styles.textRight}>Montant N</th>
              <th className={styles.textRight}>Montant N-1</th>
              <th className={styles.textRight}>Variation</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const variation = row.montantN1 ? ((row.montantTotal - row.montantN1) / row.montantN1 * 100) : 0;
              return (
                <tr key={row.id}>
                  <td><span className={styles.compteBadge}>{row.compte}</span></td>
                  <td>{row.libelle}</td>
                  <td>{row.cleRepartition}</td>
                  <td className={`${styles.textRight} ${styles.debit}`}>{formatCurrency(row.montantTotal)}</td>
                  <td className={styles.textRight}>{row.montantN1 ? formatCurrency(row.montantN1) : '-'}</td>
                  <td className={styles.textRight}>
                    <span className={variation > 0 ? styles.variationNegative : styles.variationPositive}>
                      {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
            <tr className={styles.rowTotal}>
              <td colSpan={3}>TOTAL</td>
              <td className={`${styles.textRight} ${styles.debit}`}>{formatCurrency(total)}</td>
              <td className={styles.textRight}>{formatCurrency(totalN1)}</td>
              <td className={styles.textRight}>
                <span className={total > totalN1 ? styles.variationNegative : styles.variationPositive}>
                  {((total - totalN1) / totalN1 * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.annexeTotals}>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Total exercice N</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValueNegative}`}>{formatCurrency(total)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Total exercice N-1</span>
          <span className={styles.annexeTotalValue}>{formatCurrency(totalN1)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Variation</span>
          <span className={`${styles.annexeTotalValue} ${total > totalN1 ? styles.annexeTotalValueNegative : styles.annexeTotalValuePositive}`}>
            {((total - totalN1) / totalN1 * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 4 - Travaux et opérations exceptionnelles
// ============================================

interface Annexe4TableProps {
  data: LigneAnnexe4[];
  exercice: string;
}

export function Annexe4Table({ data, exercice }: Annexe4TableProps) {
  const totalBudget = data.reduce((sum, d) => sum + d.budgetVote, 0);
  const totalEngagees = data.reduce((sum, d) => sum + d.depensesEngagees, 0);
  const totalReglees = data.reduce((sum, d) => sum + d.depensesReglees, 0);
  const totalAFinancer = data.reduce((sum, d) => sum + d.soldeAFinancer, 0);

  const getStatusBadge = (statut: LigneAnnexe4['statut']) => {
    switch (statut) {
      case 'en-cours':
        return { class: styles.statusEnCours, icon: <Clock size={12} aria-hidden="true" />, label: 'En cours' };
      case 'terminee':
        return { class: styles.statusTerminee, icon: <CheckCircle size={12} aria-hidden="true" />, label: 'Terminée' };
      case 'a-venir':
        return { class: styles.statusAVenir, icon: <Calendar size={12} aria-hidden="true" />, label: 'À venir' };
    }
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const content = `
      <h1>Annexe 4 - Compte de gestion pour travaux et opérations exceptionnelles</h1>
      <p class="subtitle">Exercice ${exercice}</p>

      <table>
        <thead>
          <tr>
            <th>Opération</th>
            <th>Période</th>
            <th>Statut</th>
            <th class="text-right">Budget voté</th>
            <th class="text-right">Engagées</th>
            <th class="text-right">Réglées</th>
            <th class="text-right">Reste à financer</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.libelle}</td>
              <td>${formatDate(row.dateDebut)} ${row.dateFin ? '- ' + formatDate(row.dateFin) : ''}</td>
              <td><span class="badge badge-${row.statut === 'terminee' ? 'success' : row.statut === 'en-cours' ? 'info' : 'warning'}">${row.statut === 'terminee' ? 'Terminée' : row.statut === 'en-cours' ? 'En cours' : 'À venir'}</span></td>
              <td class="text-right">${formatCurrency(row.budgetVote)}</td>
              <td class="text-right">${formatCurrency(row.depensesEngagees)}</td>
              <td class="text-right">${formatCurrency(row.depensesReglees)}</td>
              <td class="text-right">${formatCurrency(row.soldeAFinancer)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td class="text-right">${formatCurrency(totalBudget)}</td>
            <td class="text-right">${formatCurrency(totalEngagees)}</td>
            <td class="text-right">${formatCurrency(totalReglees)}</td>
            <td class="text-right">${formatCurrency(totalAFinancer)}</td>
          </tr>
        </tbody>
      </table>
    `;
    exportToHTML(`Annexe 4 - Travaux - ${exercice}`, content, `annexe-4-travaux-${exercice}.html`);
  };

  return (
    <div>
      <AnnexeHeader
        title="Annexe 4 - Compte de gestion pour travaux et opérations exceptionnelles"
        subtitle={`Exercice ${exercice}`}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Opération</th>
              <th>Période</th>
              <th>Statut</th>
              <th className={styles.textRight}>Budget voté</th>
              <th className={styles.textRight}>Engagées</th>
              <th className={styles.textRight}>Réglées</th>
              <th className={styles.textRight}>Reste à financer</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const status = getStatusBadge(row.statut);
              return (
                <tr key={row.id}>
                  <td className={styles.libelleCell}>{row.libelle}</td>
                  <td>
                    {formatDate(row.dateDebut)}
                    {row.dateFin && ` - ${formatDate(row.dateFin)}`}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${status.class}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </td>
                  <td className={styles.textRight}>{formatCurrency(row.budgetVote)}</td>
                  <td className={styles.textRight}>{formatCurrency(row.depensesEngagees)}</td>
                  <td className={`${styles.textRight} ${styles.credit}`}>{formatCurrency(row.depensesReglees)}</td>
                  <td className={`${styles.textRight} ${row.soldeAFinancer > 0 ? styles.debit : ''}`}>
                    {formatCurrency(row.soldeAFinancer)}
                  </td>
                </tr>
              );
            })}
            <tr className={styles.rowTotal}>
              <td colSpan={3}>TOTAL</td>
              <td className={styles.textRight}>{formatCurrency(totalBudget)}</td>
              <td className={styles.textRight}>{formatCurrency(totalEngagees)}</td>
              <td className={`${styles.textRight} ${styles.credit}`}>{formatCurrency(totalReglees)}</td>
              <td className={`${styles.textRight} ${styles.debit}`}>{formatCurrency(totalAFinancer)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={styles.annexeTotals}>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Budget total voté</span>
          <span className={styles.annexeTotalValue}>{formatCurrency(totalBudget)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Dépenses engagées</span>
          <span className={styles.annexeTotalValue}>{formatCurrency(totalEngagees)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Dépenses réglées</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValuePositive}`}>{formatCurrency(totalReglees)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Reste à financer</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValueNegative}`}>{formatCurrency(totalAFinancer)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ANNEXE 5 - État des dettes et créances
// ============================================

interface Annexe5TableProps {
  data: LigneAnnexe5[];
  exercice: string;
}

export function Annexe5Table({ data, exercice }: Annexe5TableProps) {
  const creances = data.filter(d => d.type === 'creance');
  const dettes = data.filter(d => d.type === 'dette');

  const totalCreances = creances.reduce((sum, d) => sum + d.montantRestant, 0);
  const totalDettes = dettes.reduce((sum, d) => sum + d.montantRestant, 0);

  const getAncienneteClass = (anciennete: number) => {
    if (anciennete > 180) return styles.ancienneteDanger;
    if (anciennete > 90) return styles.ancienneteWarning;
    return styles.anciennete;
  };

  const handlePrint = () => window.print();

  const handleExport = () => {
    const content = `
      <h1>Annexe 5 - État des dettes et créances</h1>
      <p class="subtitle">Exercice ${exercice}</p>

      <h2>CRÉANCES</h2>
      <table>
        <thead>
          <tr>
            <th>Tiers</th>
            <th>Nature</th>
            <th>Date origine</th>
            <th>Échéance</th>
            <th class="text-right">Montant initial</th>
            <th class="text-right">Montant restant</th>
            <th class="text-right">Ancienneté</th>
          </tr>
        </thead>
        <tbody>
          ${creances.map(row => `
            <tr>
              <td>${row.tiers}</td>
              <td>${row.nature}</td>
              <td>${formatDate(row.dateOrigine)}</td>
              <td>${row.dateEcheance ? formatDate(row.dateEcheance) : '-'}</td>
              <td class="text-right">${formatCurrency(row.montantInitial)}</td>
              <td class="text-right positive">${formatCurrency(row.montantRestant)}</td>
              <td class="text-right">${row.anciennete}j</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5">Total créances</td>
            <td class="text-right positive">${formatCurrency(totalCreances)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <h2>DETTES</h2>
      <table>
        <thead>
          <tr>
            <th>Tiers</th>
            <th>Nature</th>
            <th>Date origine</th>
            <th>Échéance</th>
            <th class="text-right">Montant initial</th>
            <th class="text-right">Montant restant</th>
            <th class="text-right">Ancienneté</th>
          </tr>
        </thead>
        <tbody>
          ${dettes.map(row => `
            <tr>
              <td>${row.tiers}</td>
              <td>${row.nature}</td>
              <td>${formatDate(row.dateOrigine)}</td>
              <td>${row.dateEcheance ? formatDate(row.dateEcheance) : '-'}</td>
              <td class="text-right">${formatCurrency(row.montantInitial)}</td>
              <td class="text-right negative">${formatCurrency(row.montantRestant)}</td>
              <td class="text-right">${row.anciennete}j</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="5">Total dettes</td>
            <td class="text-right negative">${formatCurrency(totalDettes)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="total-item">
          <span class="total-label">Total Créances</span>
          <span class="total-value positive">${formatCurrency(totalCreances)}</span>
        </div>
        <div class="total-item">
          <span class="total-label">Total Dettes</span>
          <span class="total-value negative">${formatCurrency(totalDettes)}</span>
        </div>
        <div class="total-item">
          <span class="total-label">Solde net</span>
          <span class="total-value ${totalCreances - totalDettes >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalCreances - totalDettes)}</span>
        </div>
      </div>
    `;
    exportToHTML(`Annexe 5 - Dettes et créances - ${exercice}`, content, `annexe-5-dettes-creances-${exercice}.html`);
  };

  const renderSection = (items: LigneAnnexe5[], title: string, isCreance: boolean) => (
    <div className={styles.annexeSection}>
      <h3 className={styles.annexeSectionTitle}>
        {isCreance ? <TrendingUp size={20} aria-hidden="true" /> : <TrendingDown size={20} aria-hidden="true" />}
        {title}
      </h3>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tiers</th>
              <th>Nature</th>
              <th>Date origine</th>
              <th>Échéance</th>
              <th className={styles.textRight}>Montant initial</th>
              <th className={styles.textRight}>Montant restant</th>
              <th className={styles.textRight}>Ancienneté</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id}>
                <td className={styles.libelleCell}>{row.tiers}</td>
                <td>{row.nature}</td>
                <td className={styles.dateCell}>{formatDate(row.dateOrigine)}</td>
                <td className={styles.dateCell}>{row.dateEcheance ? formatDate(row.dateEcheance) : '-'}</td>
                <td className={styles.textRight}>{formatCurrency(row.montantInitial)}</td>
                <td className={`${styles.textRight} ${isCreance ? styles.credit : styles.debit}`}>
                  {formatCurrency(row.montantRestant)}
                </td>
                <td className={`${styles.textRight} ${getAncienneteClass(row.anciennete)}`}>
                  {row.anciennete}j
                  {row.anciennete > 90 && <AlertTriangle size={12} style={{ marginLeft: '0.25rem' }} aria-hidden="true" />}
                </td>
              </tr>
            ))}
            <tr className={styles.rowTotal}>
              <td colSpan={5}>Total {isCreance ? 'créances' : 'dettes'}</td>
              <td className={`${styles.textRight} ${isCreance ? styles.credit : styles.debit}`}>
                {formatCurrency(isCreance ? totalCreances : totalDettes)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <AnnexeHeader
        title="Annexe 5 - État des dettes et créances"
        subtitle={`Exercice ${exercice}`}
        onPrint={handlePrint}
        onExport={handleExport}
      />

      {renderSection(creances, 'CRÉANCES', true)}
      {renderSection(dettes, 'DETTES', false)}

      <div className={styles.annexeTotals}>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Total Créances</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValuePositive}`}>{formatCurrency(totalCreances)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Total Dettes</span>
          <span className={`${styles.annexeTotalValue} ${styles.annexeTotalValueNegative}`}>{formatCurrency(totalDettes)}</span>
        </div>
        <div className={styles.annexeTotalItem}>
          <span className={styles.annexeTotalLabel}>Solde net</span>
          <span className={`${styles.annexeTotalValue} ${totalCreances - totalDettes >= 0 ? styles.annexeTotalValuePositive : styles.annexeTotalValueNegative}`}>
            {formatCurrency(totalCreances - totalDettes)}
          </span>
        </div>
      </div>
    </div>
  );
}
