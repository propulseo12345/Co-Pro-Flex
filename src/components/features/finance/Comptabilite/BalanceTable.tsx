'use client';

import { useState } from 'react';
import { Search, Eye, EyeOff, Download, Filter, Building2, Users } from 'lucide-react';
import { LigneBalance } from './types';
import { formatCurrency, filterBalance, calculateBalanceTotals, CLASSES_COMPTABLES } from './utils';
import { BalanceCoproTable } from './BalanceCoproTable';
import styles from './Comptabilite.module.css';

type ViewMode = 'syndic' | 'copro';

interface BalanceTableProps {
  lignesBalance: LigneBalance[];
  annee: number;
  showComparaisonN1?: boolean;
}

export function BalanceTable({ lignesBalance, annee, showComparaisonN1 = false }: BalanceTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('syndic');
  const [searchTerm, setSearchTerm] = useState('');
  const [masquerSoldesNuls, setMasquerSoldesNuls] = useState(false);
  const [classeFilter, setClasseFilter] = useState('TOUTES');

  // Filtrer les lignes
  const lignesFiltrees = filterBalance(lignesBalance, {
    masquerSoldesNuls,
    classeFilter,
    searchTerm
  });

  // Calculer les totaux
  const totaux = calculateBalanceTotals(lignesFiltrees);

  // Vérifier l'équilibre
  const isEquilibre = Math.abs(totaux.totalClotureDebit - totaux.totalClotureCredit) < 0.01;

  // Grouper par classe pour l'affichage
  const lignesParClasse = lignesFiltrees.reduce((acc, ligne) => {
    if (!acc[ligne.classe]) {
      acc[ligne.classe] = [];
    }
    acc[ligne.classe].push(ligne);
    return acc;
  }, {} as Record<string, LigneBalance[]>);

  return (
    <div className={styles.balanceContainer}>
      {/* Toggle Vue Syndic / Copropriétaire */}
      <div className={styles.balanceFilters}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleButton} ${viewMode === 'syndic' ? styles.viewToggleButtonActive : ''}`}
            onClick={() => setViewMode('syndic')}
          >
            <Building2 size={16} />
            Vue Syndic
          </button>
          <button
            className={`${styles.viewToggleButton} ${viewMode === 'copro' ? styles.viewToggleButtonActive : ''}`}
            onClick={() => setViewMode('copro')}
          >
            <Users size={16} />
            Vue Copropriétaire
          </button>
        </div>
      </div>

      {/* Vue Copropriétaire */}
      {viewMode === 'copro' && (
        <BalanceCoproTable lignesBalance={lignesBalance} annee={annee} />
      )}

      {/* Vue Syndic (existante) */}
      {viewMode === 'syndic' && (
        <>
      {/* Filtres de la balance */}
      <div className={styles.balanceFilters}>
        <div className={styles.searchBox}>
          <Search size={18} color="var(--text-tertiary)" aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher un compte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.balanceFilterGroup}>
          <Filter size={16} aria-hidden="true" />
          <select
            value={classeFilter}
            onChange={(e) => setClasseFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="TOUTES">Toutes les classes</option>
            {Object.entries(CLASSES_COMPTABLES).map(([classe, label]) => (
              <option key={classe} value={classe}>{label}</option>
            ))}
          </select>
        </div>

        <button
          className={`${styles.balanceToggle} ${masquerSoldesNuls ? styles.active : ''}`}
          onClick={() => setMasquerSoldesNuls(!masquerSoldesNuls)}
          title={masquerSoldesNuls ? 'Afficher tous les comptes' : 'Masquer les comptes à solde nul'}
        >
          {masquerSoldesNuls ? <Eye size={16} /> : <EyeOff size={16} />}
          {masquerSoldesNuls ? 'Afficher tous' : 'Masquer soldes nuls'}
        </button>

        <button className={styles.exportButton} title="Exporter la balance">
          <Download size={16} aria-hidden="true" />
          Exporter
        </button>
      </div>

      {/* Info exercice */}
      <div className={styles.balanceInfo}>
        <span>Balance générale - Exercice {annee}</span>
        <span className={styles.balanceInfoCount}>
          {lignesFiltrees.length} compte{lignesFiltrees.length > 1 ? 's' : ''} affiché{lignesFiltrees.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau de la balance */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Compte</th>
              <th>Libellé</th>
              <th colSpan={2} className={styles.textCenter}>Solde d'ouverture</th>
              <th colSpan={2} className={styles.textCenter}>Mouvements période</th>
              <th colSpan={2} className={styles.textCenter}>Solde de clôture</th>
              {showComparaisonN1 && (
                <th className={styles.textCenter}>Var. N-1</th>
              )}
            </tr>
            <tr className={styles.subHeader}>
              <th></th>
              <th></th>
              <th className={styles.textRight}>Débit</th>
              <th className={styles.textRight}>Crédit</th>
              <th className={styles.textRight}>Débit</th>
              <th className={styles.textRight}>Crédit</th>
              <th className={styles.textRight}>Débit</th>
              <th className={styles.textRight}>Crédit</th>
              {showComparaisonN1 && <th></th>}
            </tr>
          </thead>
          <tbody>
            {Object.entries(lignesParClasse).map(([classe, lignes]) => (
              <>
                {/* En-tête de classe */}
                <tr key={`classe-${classe}`} className={styles.classeHeader}>
                  <td colSpan={showComparaisonN1 ? 9 : 8}>
                    {CLASSES_COMPTABLES[classe] || `Classe ${classe}`}
                  </td>
                </tr>
                {/* Lignes de la classe */}
                {lignes.map((ligne) => (
                  <tr key={ligne.compte}>
                    <td className={styles.compteBadge}>{ligne.compte}</td>
                    <td className={styles.libelleCell}>{ligne.compteLabel}</td>
                    <td className={styles.textRight}>
                      {ligne.soldeOuvertureDebit > 0 && (
                        <span className={styles.debit}>{formatCurrency(ligne.soldeOuvertureDebit)}</span>
                      )}
                    </td>
                    <td className={styles.textRight}>
                      {ligne.soldeOuvertureCredit > 0 && (
                        <span className={styles.credit}>{formatCurrency(ligne.soldeOuvertureCredit)}</span>
                      )}
                    </td>
                    <td className={styles.textRight}>
                      {ligne.mouvementDebit > 0 && (
                        <span className={styles.debit}>{formatCurrency(ligne.mouvementDebit)}</span>
                      )}
                    </td>
                    <td className={styles.textRight}>
                      {ligne.mouvementCredit > 0 && (
                        <span className={styles.credit}>{formatCurrency(ligne.mouvementCredit)}</span>
                      )}
                    </td>
                    <td className={styles.textRight}>
                      {ligne.soldeClotureDebit > 0 && (
                        <span className={styles.soldeFinal}>{formatCurrency(ligne.soldeClotureDebit)}</span>
                      )}
                    </td>
                    <td className={styles.textRight}>
                      {ligne.soldeClotureCredit > 0 && (
                        <span className={styles.soldeFinal}>{formatCurrency(ligne.soldeClotureCredit)}</span>
                      )}
                    </td>
                    {showComparaisonN1 && (
                      <td className={styles.textCenter}>
                        {ligne.variationPourcent !== undefined && (
                          <span
                            className={
                              ligne.variationPourcent > 0
                                ? styles.variationPositive
                                : ligne.variationPourcent < 0
                                ? styles.variationNegative
                                : ''
                            }
                          >
                            {ligne.variationPourcent > 0 ? '+' : ''}
                            {ligne.variationPourcent.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={2}><strong>TOTAUX</strong></td>
              <td className={styles.textRight}>
                <strong className={styles.debit}>{formatCurrency(totaux.totalOuvertureDebit)}</strong>
              </td>
              <td className={styles.textRight}>
                <strong className={styles.credit}>{formatCurrency(totaux.totalOuvertureCredit)}</strong>
              </td>
              <td className={styles.textRight}>
                <strong className={styles.debit}>{formatCurrency(totaux.totalMouvementDebit)}</strong>
              </td>
              <td className={styles.textRight}>
                <strong className={styles.credit}>{formatCurrency(totaux.totalMouvementCredit)}</strong>
              </td>
              <td className={styles.textRight}>
                <strong className={styles.debit}>{formatCurrency(totaux.totalClotureDebit)}</strong>
              </td>
              <td className={styles.textRight}>
                <strong className={styles.credit}>{formatCurrency(totaux.totalClotureCredit)}</strong>
              </td>
              {showComparaisonN1 && <td></td>}
            </tr>
            <tr className={styles.equilibreRow}>
              <td colSpan={showComparaisonN1 ? 9 : 8}>
                <div className={styles.equilibreStatus}>
                  {isEquilibre ? (
                    <span className={styles.equilibreOk}>
                      Balance équilibrée
                    </span>
                  ) : (
                    <span className={styles.equilibreError}>
                      Attention : Balance déséquilibrée - Écart : {formatCurrency(Math.abs(totaux.totalClotureDebit - totaux.totalClotureCredit))}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {lignesFiltrees.length === 0 && (
        <div className={styles.emptyState}>
          <p>Aucun compte ne correspond aux critères de recherche.</p>
        </div>
      )}
        </>
      )}
    </div>
  );
}
