'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Receipt,
  Wrench,
  PiggyBank,
  Wallet,
  MoreHorizontal,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { LigneBalance } from './types';
import { formatCurrency } from './utils';
import {
  transformerBalancePourCopro,
  calculerTotauxCopro,
  FamilleBalance
} from './balance-copro-transform';
import styles from './Comptabilite.module.css';

interface BalanceCoproTableProps {
  lignesBalance: LigneBalance[];
  annee: number;
}

const FAMILLE_ICONS: Record<FamilleBalance, React.ReactNode> = {
  'charges-courantes': <Receipt size={20} />,
  'travaux': <Wrench size={20} />,
  'fonds-travaux': <PiggyBank size={20} />,
  'tresorerie': <Wallet size={20} />,
  'autres': <MoreHorizontal size={20} />
};

const FAMILLE_COLORS: Record<FamilleBalance, string> = {
  'charges-courantes': 'var(--primary)',
  'travaux': 'var(--warning)',
  'fonds-travaux': 'var(--success)',
  'tresorerie': 'var(--info)',
  'autres': 'var(--text-tertiary)'
};

export function BalanceCoproTable({ lignesBalance, annee }: BalanceCoproTableProps) {
  const [expandedFamilles, setExpandedFamilles] = useState<Set<FamilleBalance>>(new Set());
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Transformer les données
  const groupes = useMemo(() => transformerBalancePourCopro(lignesBalance), [lignesBalance]);
  const totaux = useMemo(() => calculerTotauxCopro(groupes), [groupes]);

  const toggleFamille = (familleId: FamilleBalance) => {
    setExpandedFamilles(prev => {
      const next = new Set(prev);
      if (next.has(familleId)) {
        next.delete(familleId);
      } else {
        next.add(familleId);
      }
      return next;
    });
  };

  const getSensIcon = (sens: 'positif' | 'negatif' | 'neutre') => {
    switch (sens) {
      case 'positif':
        return <TrendingUp size={14} className={styles.coproSensPositif} />;
      case 'negatif':
        return <TrendingDown size={14} className={styles.coproSensNegatif} />;
      default:
        return <Minus size={14} className={styles.coproSensNeutre} />;
    }
  };

  return (
    <div className={styles.coproContainer}>
      {/* KPIs simplifiés */}
      <div className={styles.coproKpiGrid}>
        <div className={styles.coproKpiCard}>
          <div className={styles.coproKpiIcon} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Receipt size={24} />
          </div>
          <div className={styles.coproKpiContent}>
            <span className={styles.coproKpiLabel}>Charges de l'année</span>
            <span className={styles.coproKpiValue}>{formatCurrency(Math.abs(totaux.totalCharges))}</span>
          </div>
        </div>

        <div className={styles.coproKpiCard}>
          <div className={styles.coproKpiIcon} style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <Wrench size={24} />
          </div>
          <div className={styles.coproKpiContent}>
            <span className={styles.coproKpiLabel}>Travaux en cours</span>
            <span className={styles.coproKpiValue}>{formatCurrency(Math.abs(totaux.totalTravaux))}</span>
          </div>
        </div>

        <div className={styles.coproKpiCard}>
          <div className={styles.coproKpiIcon} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <PiggyBank size={24} />
          </div>
          <div className={styles.coproKpiContent}>
            <span className={styles.coproKpiLabel}>Fonds travaux ALUR</span>
            <span className={styles.coproKpiValue}>{formatCurrency(totaux.fondsTravaux)}</span>
          </div>
        </div>

        <div className={styles.coproKpiCard}>
          <div className={styles.coproKpiIcon} style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
            <Wallet size={24} />
          </div>
          <div className={styles.coproKpiContent}>
            <span className={styles.coproKpiLabel}>Trésorerie disponible</span>
            <span className={`${styles.coproKpiValue} ${totaux.tresorerieDisponible >= 0 ? styles.coproPositif : styles.coproNegatif}`}>
              {formatCurrency(totaux.tresorerieDisponible)}
            </span>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className={styles.coproInfoBanner}>
        <HelpCircle size={16} />
        <span>
          Vue simplifiée des comptes de la copropriété pour l'exercice {annee}.
          Cliquez sur une catégorie pour voir le détail.
        </span>
      </div>

      {/* Liste des familles */}
      <div className={styles.coproFamillesList}>
        {groupes.map(groupe => {
          const isExpanded = expandedFamilles.has(groupe.config.id);
          const familleColor = FAMILLE_COLORS[groupe.config.id];

          return (
            <div key={groupe.config.id} className={styles.coproFamilleCard}>
              {/* Header de la famille */}
              <button
                className={styles.coproFamilleHeader}
                onClick={() => toggleFamille(groupe.config.id)}
                aria-expanded={isExpanded}
              >
                <div className={styles.coproFamilleHeaderLeft}>
                  <span
                    className={styles.coproFamilleIcon}
                    style={{ background: `${familleColor}20`, color: familleColor }}
                  >
                    {FAMILLE_ICONS[groupe.config.id]}
                  </span>
                  <div className={styles.coproFamilleInfo}>
                    <span className={styles.coproFamilleLabel}>{groupe.config.label}</span>
                    <span className={styles.coproFamilleDescription}>{groupe.config.description}</span>
                  </div>
                </div>
                <div className={styles.coproFamilleHeaderRight}>
                  <span className={styles.coproFamilleTotal}>
                    {formatCurrency(Math.abs(groupe.total))}
                  </span>
                  <span className={styles.coproFamilleCount}>
                    {groupe.lignes.length} poste{groupe.lignes.length > 1 ? 's' : ''}
                  </span>
                  <span className={styles.coproFamilleChevron}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </span>
                </div>
              </button>

              {/* Détail des lignes (drill-down) */}
              {isExpanded && (
                <div className={styles.coproFamilleContent}>
                  <table className={styles.coproTable}>
                    <thead>
                      <tr>
                        <th>Poste</th>
                        <th className={styles.textRight}>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupe.lignes.map(ligne => (
                        <tr
                          key={ligne.compte}
                          className={styles.coproTableRow}
                          onMouseEnter={() => setShowTooltip(ligne.compte)}
                          onMouseLeave={() => setShowTooltip(null)}
                        >
                          <td>
                            <div className={styles.coproPosteCell}>
                              <span className={styles.coproPosteLabel}>{ligne.label}</span>
                              {showTooltip === ligne.compte && (
                                <div className={styles.coproTooltip}>
                                  <span className={styles.coproTooltipCompte}>Compte {ligne.compte}</span>
                                  <span className={styles.coproTooltipText}>{ligne.explication}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className={styles.textRight}>
                            <div className={styles.coproMontantCell}>
                              {getSensIcon(ligne.sens)}
                              <span className={`
                                ${styles.coproMontant}
                                ${ligne.sens === 'positif' ? styles.coproPositif : ''}
                                ${ligne.sens === 'negatif' ? styles.coproNegatif : ''}
                              `}>
                                {formatCurrency(Math.abs(ligne.montant))}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={styles.coproTableTotal}>
                        <td><strong>Total {groupe.config.label.toLowerCase()}</strong></td>
                        <td className={styles.textRight}>
                          <strong>{formatCurrency(Math.abs(groupe.total))}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer explicatif */}
      <div className={styles.coproFooter}>
        <p>
          Cette vue présente une synthèse simplifiée des comptes.
          Pour le détail comptable complet, consultez la vue Syndic.
        </p>
      </div>
    </div>
  );
}
